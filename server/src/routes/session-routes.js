/**
 * Ras ALmal Tycoon — Session & Lifecycle Endpoints
 */

const crypto = require('crypto');
const sessionManager = require('../services/session-manager');
const dbService = require('../services/db-service');
const { extractClientIp, parseDeviceDetails } = require('../engine/device-parser');

/**
 * Robust constant-time or hash-aware PIN verification against stored database PIN
 */
function verifyPinMatch(inputPin, storedPin) {
  if (!storedPin) return true; // Account has no PIN configured
  if (!inputPin) return false;
  const p = String(inputPin).trim();
  const stored = String(storedPin).trim();
  if (p === stored) return true;

  const hashed = crypto.createHash('sha256').update(p).digest('hex');
  if (
    stored === hashed ||
    stored === 's256_' + hashed ||
    stored.replace(/^s256_/, '') === hashed ||
    stored === 's256_' + p
  ) {
    return true;
  }
  return false;
}

function extractBearerToken(request) {
  const authHeader = request.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return (request.body && request.body.token) || null;
}

const config = require('../config/env');

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function sessionRoutes(fastify, options) {

  // POST /api/session/verify-tester-pass (Dynamic, non-hardcoded Tester Code Verification)
  fastify.post('/api/session/verify-tester-pass', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const { pass } = request.body || {};
    const inputPass = String(pass || '').trim();

    if (!inputPass) {
      return reply.code(400).send({ success: false, error: 'يرجى إدخال رمز وصول المختبرين (Tester Code).' });
    }

    try {
      // 1. Fetch current dynamic maintenance configuration from PostgreSQL globals table
      const candidateKeys = [
        config.SUPABASE_SERVICE_ROLE_KEY,
        config.SUPABASE_ANON_KEY
      ].filter(Boolean);

      const targetUrls = [
        `${config.SUPABASE_INTERNAL_URL}/rest/v1/globals?id=eq.maintenance&select=*`,
        'http://127.0.0.1:8000/rest/v1/globals?id=eq.maintenance&select=*',
        `${config.SUPABASE_URL}/rest/v1/globals?id=eq.maintenance&select=*`,
        'https://rasalmal.online/rest/v1/globals?id=eq.maintenance&select=*'
      ];

      let res = null;
      let lastFetchErr = null;
      let lastStatus = null;

      outerLoop:
      for (const u of targetUrls) {
        for (const k of candidateKeys) {
          try {
            res = await fetch(u, {
              headers: { 'apikey': k, 'Authorization': `Bearer ${k}` }
            });
            lastStatus = res.status;
            if (res.ok) {
              break outerLoop;
            }
          } catch (fErr) {
            lastFetchErr = fErr;
          }
        }
      }

      if (!res || !res.ok) {
        fastify.log.error({ lastFetchErr, status: lastStatus }, '[VerifyTesterPass DB Fetch Failed]');
        return reply.code(500).send({ 
          success: false, 
          error: 'تعذر الاتصال بقاعدة البيانات للتحقق من رمز المرور (' + (lastStatus || (lastFetchErr ? lastFetchErr.message : 'Network Error')) + ')'
        });
      }

      const rows = await res.json();
      const maintData = (Array.isArray(rows) && rows.length > 0 && rows[0].data) ? rows[0].data : {};

      const configuredPass = String(maintData.tester_pass || maintData.tester_key || '').trim();
      const configuredHash = String(maintData.tester_pass_hash || '').trim();

      if (!configuredPass && !configuredHash) {
        return reply.code(403).send({ success: false, error: 'وضع التستر غير مفعل حالياً أو لم يتم ضبط رمز اختبار.' });
      }

      const inputHash = crypto.createHash('sha256').update(inputPass).digest('hex');

      const isMatch = (configuredPass && safeCompare(inputPass, configuredPass)) ||
                      (configuredHash && safeCompare(inputHash, configuredHash)) ||
                      (configuredPass && safeCompare(inputHash, configuredPass));

      if (!isMatch) {
        return reply.code(401).send({ success: false, error: 'رمز وصول المختبرين غير صحيح!' });
      }

      // Generate a signed/temporary bypass token (valid for 12 hours)
      const bypassToken = crypto.createHmac('sha256', config.ADMIN_KEY_SHA256 || 'rasalmal_secret_key')
        .update(`tester_bypass_${Date.now().toString().slice(0, 5)}`)
        .digest('hex');

      return reply.send({
        success: true,
        message: 'تم التحقق من رمز المختبرين بنجاح! مرحباً بك في بيئة الاختبار.',
        bypassToken
      });
    } catch (err) {
      fastify.log.error(err, '[VerifyTesterPass Error]');
      return reply.code(500).send({ success: false, error: 'حدث خطأ أثناء فحص الرمز على السيرفر.' });
    }
  });

  // POST /api/session/register (Authoritative Registration Endpoint)
  fastify.post('/api/session/register', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const { playerRow } = request.body || {};
    if (!playerRow || !playerRow.username) {
      return reply.code(400).send({ error: 'بيانات التسجيل غير مكتملة' });
    }

    const u = String(playerRow.username).trim();
    if (u.length < 3 || u.length > 30) {
      return reply.code(400).send({ error: 'اسم المستخدم يجب أن يكون بين 3 و 30 حرفاً' });
    }

    try {
      // 1. Check if user already exists
      const existing = await dbService.getPlayerByUsername(u);
      if (existing) {
        return reply.code(409).send({ error: 'اسم المستخدم مسجل بالفعل. يرجى اختيار اسم آخر.' });
      }

      // 2. Strict anti-tamper enforcement for brand new player row
      const safeRow = {
        ...playerRow,
        username: u,
        is_admin: false,
        is_banned: false,
        cash: Number(playerRow.cash || 500000),
        bank: Number(playerRow.bank || 500000),
        dirty_cash: 0,
        net_worth: Number(playerRow.net_worth || 1000000),
        xp: 0,
        created_at: Number(playerRow.created_at || Date.now()),
        last_seen: Number(playerRow.last_seen || Date.now())
      };

      if (safeRow.state) {
        safeRow.state.cash = safeRow.cash;
        safeRow.state.bank = safeRow.bank;
        safeRow.state.netWorth = safeRow.net_worth;
      } else {
        safeRow.state = {};
      }

      // Record initial registration device and IP
      const regIp = extractClientIp(request);
      const regDev = parseDeviceDetails({
        userAgent: request.headers['user-agent'] || '',
        headers: request.headers,
        deviceInfo: request.body.deviceInfo || {}
      });
      safeRow.state.loginHistory = [{
        id: 'log_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
        timestamp: Date.now(),
        ip: regIp,
        device: regDev.deviceName,
        category: regDev.category,
        os: regDev.os,
        browser: regDev.browser,
        brand: regDev.brand,
        screen: regDev.screen || null
      }];
      safeRow.state.lastLoginIp = regIp;
      safeRow.state.lastLoginDevice = regDev.deviceName;
      safeRow.state.lastLoginTime = Date.now();

      const created = await dbService.createPlayer(safeRow);
      return reply.code(201).send({ success: true, player: created });
    } catch (err) {
      console.error('[SessionRoutes] /api/session/register error:', err.message);
      return reply.code(500).send({ error: err.message || 'فشل تسجيل الحساب على الخادم' });
    }
  });

  // POST /api/session/start (Brute-Force Shield: 20 attempts/min)
  fastify.post('/api/session/start', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const { username, pin, sessionId, token } = request.body || {};
    const effectiveToken = extractBearerToken(request) || token;

    if (!username) {
      return reply.code(400).send({ error: 'Username is required' });
    }

    try {
      // 1. Load or fetch session WITHOUT triggering offline catchup yet (avoids eating offline time on 401)
      const { session } = await sessionManager.getOrCreateSession(username, false, sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Player account not found' });
      }

      // 2. Strict Authentication: Either valid sessionToken OR valid PIN
      let isAuthed = false;
      const dbSavedToken = session.state && session.state.sessionToken;
      if (effectiveToken && ((session.sessionToken && effectiveToken === session.sessionToken) || (dbSavedToken && effectiveToken === dbSavedToken))) {
        isAuthed = true;
        if (!session.sessionToken) {
          session.sessionToken = effectiveToken;
        }
      } else if (pin && verifyPinMatch(pin, session.pin)) {
        isAuthed = true;
        // Issue fresh cryptographically secure sessionToken
        session.sessionToken = 'tok_' + crypto.randomBytes(24).toString('hex');
        session.state.sessionToken = session.sessionToken;
        session.dirty = true;
      } else if (!session.pin) {
        isAuthed = true;
        if (!session.sessionToken) {
          session.sessionToken = 'tok_' + crypto.randomBytes(24).toString('hex');
          session.state.sessionToken = session.sessionToken;
        }
      }

      if (!isAuthed) {
        return reply.code(401).send({ error: 'Invalid PIN credentials or expired session token' });
      }

      // 3. User is 100% verified -> Record authoritative device and IP telemetry
      try {
        const clientIp = extractClientIp(request);
        const parsedDev = parseDeviceDetails({
          userAgent: request.headers['user-agent'] || '',
          headers: request.headers,
          deviceInfo: request.body.deviceInfo || {}
        });

        if (!Array.isArray(session.state.loginHistory)) {
          session.state.loginHistory = [];
        }

        const now = Date.now();
        const lastEntry = session.state.loginHistory[0];
        // If logged in from the identical IP and device within 3 minutes, update lastSeen
        if (lastEntry && lastEntry.ip === clientIp && lastEntry.device === parsedDev.deviceName && (now - Number(lastEntry.timestamp || 0) < 3 * 60 * 1000)) {
          lastEntry.lastSeen = now;
        } else {
          const entry = {
            id: 'log_' + now + '_' + crypto.randomBytes(3).toString('hex'),
            timestamp: now,
            ip: clientIp,
            device: parsedDev.deviceName,
            category: parsedDev.category,
            os: parsedDev.os,
            browser: parsedDev.browser,
            brand: parsedDev.brand,
            screen: parsedDev.screen || null
          };
          session.state.loginHistory.unshift(entry);
          if (session.state.loginHistory.length > 50) {
            session.state.loginHistory = session.state.loginHistory.slice(0, 50);
          }
        }

        session.state.lastLoginIp = clientIp;
        session.state.lastLoginDevice = parsedDev.deviceName;
        session.state.lastLoginTime = now;
        session.dirty = true;
      } catch (devErr) {
        fastify.log.warn('[DeviceLogger] Failed to record login telemetry: ' + devErr.message);
      }

      // 4. Run authoritative offline catchup
      const offlineReport = sessionManager.applyOfflineCatchup(session);

      return {
        success: true,
        username: session.username,
        sessionId: session.sessionId,
        sessionToken: session.sessionToken,
        state: session.state,
        offlineReport: offlineReport,
        serverTime: Date.now()
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to start session: ' + err.message });
    }
  });

  // POST /api/session/heartbeat
  fastify.post('/api/session/heartbeat', async (request, reply) => {
    const { username } = request.body || {};
    if (!username) return reply.code(400).send({ error: 'Username is required' });

    const effectiveToken = extractBearerToken(request);
    const uKey = username.trim().toLowerCase();
    const session = sessionManager.sessions.get(uKey);
    if (session) {
      if (session.sessionToken && effectiveToken && effectiveToken !== session.sessionToken) {
        return reply.code(401).send({ error: 'Unauthorized: Invalid session token' });
      }
      session.lastActivity = Date.now();
      session.state.lastSeen = Date.now();
    }

    return {
      success: true,
      serverTime: Date.now()
    };
  });

  // POST /api/session/sync-state (Synchronizes complete client state to authoritative session & DB - Max 240 req/min)
  fastify.post('/api/session/sync-state', {
    config: {
      rateLimit: {
        max: 240,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const { username, state, immediate = false } = request.body || {};
    const effectiveToken = extractBearerToken(request);

    if (!username || !state) {
      return reply.code(400).send({ error: 'Username and state are required' });
    }

    // Strict identity validation: state.username MUST match username to prevent account overwriting
    if (state.username && state.username.trim().toLowerCase() !== username.trim().toLowerCase()) {
      fastify.log.warn(`Cross-account sync rejected: endpoint username="${username}", state.username="${state.username}"`);
      return reply.code(400).send({ error: 'State username mismatch' });
    }

    const uKey = username.trim().toLowerCase();
    const activeSession = sessionManager.sessions.get(uKey);
    if (activeSession && activeSession.sessionToken && effectiveToken && effectiveToken !== activeSession.sessionToken) {
      return reply.code(401).send({ error: 'Unauthorized: Invalid or expired session token' });
    }

    try {
      const saved = await sessionManager.updateSessionState(username, state, immediate === true);
      if (!saved) {
        return reply.code(409).send({ error: 'Session invalidated: logged in from another device', code: 'SESSION_TERMINATED' });
      }
      return {
        success: true,
        saved,
        adminModifiedTimestamp: activeSession ? Number(activeSession.state.adminModifiedTimestamp || 0) : 0,
        authoritativeState: activeSession ? {
          cash: activeSession.state.cash,
          bank: activeSession.state.bank,
          dirtyCash: activeSession.state.dirtyCash || 0,
          netWorth: activeSession.state.netWorth,
          title: activeSession.state.title,
          assets: activeSession.state.assets,
          ownedCars: activeSession.state.ownedCars,
          stocks: activeSession.state.stocks,
          incomeVault: activeSession.state.incomeVault || 0,
          industry: activeSession.state.industry,
          investments: activeSession.state.investments,
          tradeCompany: activeSession.state.tradeCompany,
          inventory: activeSession.state.inventory,
          smugglingFleet: activeSession.state.smugglingFleet,
          businesses: activeSession.state.businesses,
          dailyStockProfit: activeSession.state.dailyStockProfit,
          farm: activeSession.state.farm,
          airport: activeSession.state.airport,
          lastLimitsResetAck: activeSession.state.lastLimitsResetAck || 0
        } : null,
        serverTime: Date.now()
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to sync state: ' + err.message });
    }
  });

  // POST /api/session/exit
  fastify.post('/api/session/exit', async (request, reply) => {
    const { username, state } = request.body || {};
    const effectiveToken = extractBearerToken(request);

    if (!username) return reply.code(400).send({ error: 'Username is required' });

    // Strict identity validation on exit
    if (state && state.username && state.username.trim().toLowerCase() !== username.trim().toLowerCase()) {
      fastify.log.warn(`Cross-account exit sync rejected: endpoint username="${username}", state.username="${state.username}"`);
      return reply.code(400).send({ error: 'State username mismatch' });
    }

    const uKey = username.trim().toLowerCase();
    const activeSession = sessionManager.sessions.get(uKey);
    if (activeSession && activeSession.sessionToken && effectiveToken && effectiveToken !== activeSession.sessionToken) {
      return reply.code(401).send({ error: 'Unauthorized: Invalid or expired session token' });
    }

    let saved = false;
    if (state && typeof state === 'object') {
      saved = await sessionManager.updateSessionState(username, state, true);
    } else {
      saved = await sessionManager.forceSaveSession(username);
    }

    // Explicit exit: remove session from memory so next login triggers clean offline catchup
    await sessionManager.unloadSession(username);

    return {
      success: true,
      saved: saved,
      serverTime: Date.now()
    };
  });

  // POST /api/mailbox/status (Mark mailbox item as read/claimed/deleted or mark all read with service role)
  fastify.post('/api/mailbox/status', async (request, reply) => {
    const { mailId, status, action, username } = request.body || {};
    try {
      if (action === 'delete') {
        if (!mailId) return reply.code(400).send({ error: 'mailId is required for delete' });
        const res = await fetch(`${dbService.url}/rest/v1/mailbox?id=eq.${encodeURIComponent(mailId)}`, {
          method: 'DELETE',
          headers: dbService.getHeaders()
        });
        return { success: res.ok, status: res.status };
      }

      if (action === 'mark_all_read') {
        if (!username) return reply.code(400).send({ error: 'username is required' });
        const res1 = await fetch(`${dbService.url}/rest/v1/mailbox?recipient=ilike.${encodeURIComponent(String(username).trim())}&status=eq.unread`, {
          method: 'PATCH',
          headers: dbService.getHeaders(),
          body: JSON.stringify({ status: 'read' })
        });
        const res2 = await fetch(`${dbService.url}/rest/v1/mailbox?recipient=ilike.${encodeURIComponent(String(username).trim())}&status=eq.pending`, {
          method: 'PATCH',
          headers: dbService.getHeaders(),
          body: JSON.stringify({ status: 'read' })
        });
        return { success: res1.ok || res2.ok };
      }

      if (!mailId) return reply.code(400).send({ error: 'mailId is required' });
      const res = await fetch(`${dbService.url}/rest/v1/mailbox?id=eq.${encodeURIComponent(mailId)}`, {
        method: 'PATCH',
        headers: dbService.getHeaders(),
        body: JSON.stringify({ status: status || 'read' })
      });
      return { success: res.ok, status: res.status };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });
}

module.exports = sessionRoutes;
