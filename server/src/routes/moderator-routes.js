/**
 * Ras ALmal Tycoon — Authoritative Moderator & Staff API Routes
 * Dedicated endpoints for Staff Assistants to inspect players, monitor wealth, and take controlled moderation actions.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/env');
const { BUSINESSES, ASSETS, CAR_TEMPLATES } = require('../engine/definitions');
const { calculateSingleBusinessProfit } = require('../engine/business-engine');
const { sanitizePlayerState } = require('../engine/state-sanitizer');
const { calculateAuthoritativeOfflineProgress } = require('../engine/offline-engine');
const { AIRCRAFT_MODELS, AIRPORT_FACILITIES, CONTROL_TOWER_CONFIG, calculateDutyFreeAccumulated, calculateTransitAccumulated } = require('../engine/airport-engine');

const CHAT_IMAGES_DIR = path.resolve(__dirname, '../../../uploads/chat_images');
try {
  if (!fs.existsSync(CHAT_IMAGES_DIR)) {
    fs.mkdirSync(CHAT_IMAGES_DIR, { recursive: true });
  }
} catch (_) {}

/**
 * Strict Raster Image Validator
 * Strictly enforces PNG, JPEG, WebP, and GIF binaries via Magic Bytes.
 * Strictly forbids SVG (to prevent XSS and script injection attacks).
 */
function validateRasterImage(imageBuffer) {
  if (!imageBuffer || imageBuffer.length < 50 || imageBuffer.length > 3.5 * 1024 * 1024) {
    return { valid: false, error: 'حجم الصورة غير صالح (يجب أن يكون بين 50 بايت و 3.5 ميجابايت).' };
  }

  let ext = '';
  let mimeType = '';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (imageBuffer.length >= 8 &&
      imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47 &&
      imageBuffer[4] === 0x0D && imageBuffer[5] === 0x0A && imageBuffer[6] === 0x1A && imageBuffer[7] === 0x0A) {
    ext = '.png';
    mimeType = 'image/png';
  }
  // JPEG: FF D8 FF
  else if (imageBuffer.length >= 3 &&
           imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8 && imageBuffer[2] === 0xFF) {
    ext = '.jpg';
    mimeType = 'image/jpeg';
  }
  // WebP: RIFF .... WEBP
  else if (imageBuffer.length >= 12 &&
           imageBuffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
           imageBuffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    ext = '.webp';
    mimeType = 'image/webp';
  }
  // GIF: GIF87a or GIF89a
  else if (imageBuffer.length >= 6 &&
           imageBuffer.subarray(0, 3).toString('ascii') === 'GIF' &&
           (imageBuffer.subarray(3, 6).toString('ascii') === '87a' || imageBuffer.subarray(3, 6).toString('ascii') === '89a')) {
    ext = '.gif';
    mimeType = 'image/gif';
  }

  if (!ext || !mimeType) {
    return { valid: false, error: 'صيغة الملف غير مدعومة لأسباب أمنية. يُسمح فقط بصور (PNG, JPEG, WebP, GIF) الحقيقية. ممنوع رفع ملفات SVG!' };
  }

  // Deep inspection to reject embedded SVG, XML, HTML, or JavaScript strings
  const checkSample = imageBuffer.subarray(0, Math.min(imageBuffer.length, 32768)).toString('ascii');
  const lowerSample = checkSample.toLowerCase();
  if (/<svg[\s>/]/i.test(checkSample) ||
      /<script[\s>/]/i.test(checkSample) ||
      lowerSample.includes('http://www.w3.org/2000/svg') ||
      lowerSample.includes('<!doctype svg') ||
      lowerSample.includes('javascript:') ||
      lowerSample.includes('<?xml-stylesheet') ||
      lowerSample.includes('<?php')) {
    return { valid: false, error: 'تم رفض الملف لاحتوائه على وسوم SVG أو سكربتات غير آمنة.' };
  }

  return { valid: true, ext, mimeType };
}

// Default Moderator Key configuration (Individual access keys)
const DEFAULT_MODERATOR_KEYS = {
  'MOD-ALPHA-9821-X1': {
    id: 'mod_assistant_1',
    name: 'المحقق 1 (Alpha)',
    role: 'moderator',
    active: true
  },
  'MOD-BRAVO-4412-X2': {
    id: 'mod_assistant_2',
    name: 'المحقق 2 (Bravo)',
    role: 'moderator',
    active: true
  }
};

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function sanitizePayload(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);
  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    clean[key] = (val && typeof val === 'object') ? sanitizePayload(val) : val;
  }
  return clean;
}

// Active moderator sessions: token -> { id, name, role, loginAt, lastSeen, rememberDevice, expiresAt }
const activeModSessions = new Map();
const revokedModTokens = new Set();
const MOD_TOKEN_PREFIX = 'mod_30d_';
const MOD_SIGNING_SECRET = crypto.createHash('sha256').update((config.ADMIN_KEY_SHA256 || 'rasalmal_mod_secret_2026') + '_device_30d_auth_v1').digest();

function generate30DayModToken(modInfo, modKeyHash = '') {
  const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 Days in ms
  const payload = {
    id: modInfo.id,
    name: modInfo.name,
    role: modInfo.role,
    isSuperAdmin: Boolean(modInfo.isSuperAdmin),
    modKeyHash: modKeyHash || '',
    rememberDevice: true,
    iat: Date.now(),
    exp: expiresAt,
    salt: crypto.randomBytes(12).toString('hex')
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', MOD_SIGNING_SECRET).update(payloadB64).digest('base64url');
  return {
    token: `${MOD_TOKEN_PREFIX}${payloadB64}.${signature}`,
    expiresAt
  };
}

function generateStandardModToken(modInfo) {
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 Hours in ms
  const token = 'mod_sess_' + crypto.randomBytes(24).toString('hex');
  return { token, expiresAt };
}

async function moderatorRoutes(fastify, options) {
  const sessionManager = options.sessionManager;

  const serviceKey = () => config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY;

  /**
   * Helper to retrieve configured moderator keys (from globals table or fallback to default)
   */
  async function getDynamicModKeys() {
    try {
      const gUrl = `${config.SUPABASE_URL}/rest/v1/globals?id=eq.moderator_keys&select=*`;
      const res = await fetch(gUrl, {
        headers: { 'apikey': serviceKey(), 'Authorization': `Bearer ${serviceKey()}` }
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0].data && rows[0].data.keys) {
          return { ...DEFAULT_MODERATOR_KEYS, ...rows[0].data.keys };
        }
      }
    } catch (_) {}
    return DEFAULT_MODERATOR_KEYS;
  }

  /**
   * Helper to record staff audit actions into globals.staff_audit_logs
   */
  async function logStaffAudit(modInfo, targetUser, action, reason, details = {}) {
    const ts = Date.now();
    const logEntry = {
      id: 'log_' + ts + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: ts,
      modId: modInfo.id || 'unknown',
      modName: modInfo.name || 'مساعد',
      targetUser: String(targetUser || '').trim(),
      action: String(action || ''),
      reason: String(reason || ''),
      details: sanitizePayload(details)
    };

    try {
      // 1. Fetch current audit logs
      const gUrl = `${config.SUPABASE_URL}/rest/v1/globals?id=eq.staff_audit_logs&select=*`;
      const res = await fetch(gUrl, {
        headers: { 'apikey': serviceKey(), 'Authorization': `Bearer ${serviceKey()}` }
      });
      
      let logs = [];
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.logs)) {
          logs = rows[0].data.logs;
        }
      }

      // Prepend newest log and cap to 500 entries
      logs.unshift(logEntry);
      if (logs.length > 500) logs = logs.slice(0, 500);

      // Save back
      await fetch(`${config.SUPABASE_URL}/rest/v1/globals`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey(),
          'Authorization': `Bearer ${serviceKey()}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates, return=minimal'
        },
        body: JSON.stringify({
          id: 'staff_audit_logs',
          data: { logs, lastUpdated: ts },
          updated_at: ts
        })
      });
    } catch (err) {
      fastify.log.warn(err, '[Moderator Audit Log] Failed to persist audit log');
    }
    return logEntry;
  }

  /**
   * Auth Middleware: Verify Moderator Token from Header (supports standard & 30-day remembered devices)
   */
  const requireModAuth = async (request, reply) => {
    const authHeader = request.headers['authorization'] || request.headers['x-mod-token'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();

    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'يرجى تسجيل الدخول بمفتاح المحقق أولاً.' });
    }

    // 0. Check revoked tokens blacklist
    if (revokedModTokens.has(token)) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'تم إنهاء هذه الجلسة مسبقاً بعد تسجيل الخروج.' });
    }

    // 1. Check if token matches active in-memory session
    const session = activeModSessions.get(token);
    if (session) {
      if (session.expiresAt && Date.now() > session.expiresAt) {
        activeModSessions.delete(token);
        return reply.status(401).send({ error: 'Unauthorized', message: 'انتهت صلاحية جلسة المحقق (30 يوماً). يرجى تسجيل الدخول مجدداً.' });
      }
      session.lastSeen = Date.now();
      request.modSession = session;
      return;
    }

    // 2. Check if token matches Master Admin Key SHA256 directly
    if (safeCompare(token, config.ADMIN_KEY_SHA256)) {
      request.modSession = {
        id: 'super_admin_root',
        name: 'المدير العام (Khaled)',
        role: 'super_admin',
        isSuperAdmin: true,
        rememberDevice: true
      };
      return;
    }

    // 3. Cryptographic verification for 30-day remembered device tokens (survives PM2 server restarts)
    if (token.startsWith(MOD_TOKEN_PREFIX)) {
      const parts = token.slice(MOD_TOKEN_PREFIX.length).split('.');
      if (parts.length === 2) {
        const [payloadB64, sig] = parts;
        const expectedSig = crypto.createHmac('sha256', MOD_SIGNING_SECRET).update(payloadB64).digest('base64url');
        if (safeCompare(sig, expectedSig)) {
          try {
            const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
            if (!payload || !payload.exp || Date.now() > payload.exp) {
              return reply.status(401).send({ error: 'Unauthorized', message: 'انتهت صلاحية تذكر هذا الجهاز (30 يوماً). يرجى تسجيل الدخول مجدداً.' });
            }

            // Verify moderator account is still active if not super_admin
            if (!payload.isSuperAdmin) {
              const availableKeys = await getDynamicModKeys();
              const hasActiveKey = Object.values(availableKeys).some(k => 
                (k.id === payload.id || (payload.modKeyHash && crypto.createHash('sha256').update(k.id || '').digest('hex') === payload.modKeyHash)) && 
                k.active !== false
              );
              const hasActiveDefault = Object.entries(DEFAULT_MODERATOR_KEYS).some(([rawK, k]) => {
                const h = crypto.createHash('sha256').update(rawK).digest('hex');
                return (h === payload.modKeyHash || k.id === payload.id) && k.active !== false;
              });

              if (!hasActiveKey && !hasActiveDefault) {
                return reply.status(401).send({ error: 'Unauthorized', message: 'مفتاح المحقق المرتبط بهذا الجهاز لم يعد فعالاً أو تم تعطيله.' });
              }
            }

            const modSession = {
              id: payload.id,
              name: payload.name,
              role: payload.role,
              isSuperAdmin: Boolean(payload.isSuperAdmin),
              rememberDevice: true,
              expiresAt: payload.exp,
              loginAt: payload.iat,
              lastSeen: Date.now()
            };
            // Cache in memory for fast subsequent requests
            activeModSessions.set(token, modSession);
            request.modSession = modSession;
            return;
          } catch (e) {
            fastify.log.warn('[ModeratorAuth] Failed to parse 30d token payload: ' + e.message);
          }
        }
      }
    }

    return reply.status(401).send({ error: 'Unauthorized', message: 'جلسة المحقق غير صالحة أو منتهية الصلاحية.' });
  };

  /**
   * POST /api/mod/auth/login
   * Authenticates Moderator Key and issues secure session token (supports 30-day device remember)
   */
  fastify.post('/auth/login', {
    config: { rateLimit: { max: 20, timeWindow: 60000 } }
  }, async (request, reply) => {
    const { modKey, rememberDevice } = request.body || {};
    if (!modKey || typeof modKey !== 'string') {
      return reply.status(400).send({ error: 'Bad Request', message: 'يرجى إدخال مفتاح المحقق (Moderator Key).' });
    }

    const trimmedKey = modKey.trim();
    const isRemember = Boolean(rememberDevice);

    // 1. Check Master Admin Key SHA256
    const hashedInput = crypto.createHash('sha256').update(trimmedKey).digest('hex');
    if (safeCompare(trimmedKey, config.ADMIN_KEY_SHA256) || safeCompare(hashedInput, config.ADMIN_KEY_SHA256)) {
      const modInfo = {
        id: 'super_admin_root',
        name: 'المدير العام (Khaled)',
        role: 'super_admin',
        isSuperAdmin: true,
        loginAt: Date.now(),
        lastSeen: Date.now(),
        rememberDevice: isRemember
      };

      const tokenObj = isRemember 
        ? generate30DayModToken(modInfo, hashedInput) 
        : generateStandardModToken(modInfo);

      modInfo.expiresAt = tokenObj.expiresAt;
      activeModSessions.set(tokenObj.token, modInfo);

      logStaffAudit(modInfo, 'SYSTEM', 'staff_login', isRemember 
        ? 'تسجيل دخول كمدير عام مع تفعيل تذكر الجهاز (30 يوماً)' 
        : 'تسجيل دخول كمدير عام (جلسة مؤقتة)');

      return reply.send({
        success: true,
        token: tokenObj.token,
        modInfo,
        rememberDevice: isRemember,
        expiresAt: tokenObj.expiresAt
      });
    }

    // 2. Check dynamic or default moderator keys
    const availableKeys = await getDynamicModKeys();
    const matched = availableKeys[trimmedKey];

    if (matched && matched.active !== false) {
      const modInfo = {
        id: matched.id || 'investigator',
        name: matched.name || 'محقق معتمد',
        role: matched.role || 'moderator',
        isSuperAdmin: false,
        loginAt: Date.now(),
        lastSeen: Date.now(),
        rememberDevice: isRemember
      };

      const tokenObj = isRemember
        ? generate30DayModToken(modInfo, hashedInput)
        : generateStandardModToken(modInfo);

      modInfo.expiresAt = tokenObj.expiresAt;
      activeModSessions.set(tokenObj.token, modInfo);

      // Log login event
      logStaffAudit(modInfo, 'SYSTEM', 'staff_login', isRemember
        ? 'تسجيل دخول إلى لوحة الرقابة مع تفعيل تذكر الجهاز (30 يوماً)'
        : 'تسجيل دخول إلى لوحة الرقابة (جلسة مؤقتة)');

      return reply.send({
        success: true,
        token: tokenObj.token,
        modInfo,
        rememberDevice: isRemember,
        expiresAt: tokenObj.expiresAt
      });
    }

    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'مفتاح المحقق غير صحيح أو تم إيقافه.'
    });
  });

  /**
   * GET /api/mod/auth/verify
   * Validates active session
   */
  fastify.get('/auth/verify', {
    preHandler: [requireModAuth]
  }, async (request, reply) => {
    return reply.send({
      success: true,
      modInfo: request.modSession,
      rememberDevice: Boolean(request.modSession.rememberDevice),
      expiresAt: request.modSession.expiresAt || null,
      timestamp: Date.now()
    });
  });

  /**
   * POST /api/mod/auth/logout
   * Gracefully invalidates the active session token
   */
  fastify.post('/auth/logout', {
    preHandler: [requireModAuth]
  }, async (request, reply) => {
    const authHeader = request.headers['authorization'] || request.headers['x-mod-token'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    if (token) {
      activeModSessions.delete(token);
      revokedModTokens.add(token);
      if (revokedModTokens.size > 2000) {
        const oldest = revokedModTokens.values().next().value;
        revokedModTokens.delete(oldest);
      }
    }
    if (request.modSession) {
      logStaffAudit(request.modSession, 'SYSTEM', 'staff_logout', 'تسجيل خروج يدوي من لوحة الرقابة والتحقيق');
    }
    return reply.send({ success: true, message: 'تم تسجيل الخروج بنجاح.' });
  });

  /**
   * GET /api/mod/overview
   * Returns system stats, online counts, flagged players, and high-risk alerts
   */
  fastify.get('/overview', {
    preHandler: [requireModAuth]
  }, async (request, reply) => {
    try {
      const sKey = serviceKey();
      const now = Date.now();

      // 1. Fetch exact count of total players
      const countRes = await fetch(`${config.SUPABASE_URL}/rest/v1/players?select=username`, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}`, 'Range': '0-0', 'Prefer': 'count=exact' }
      });
      const totalPlayersCount = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '0', 10);

      // 1B. Fetch players to compute exact counts of Flagged, Frozen, and Muted players across the whole database
      const allPlayersRes = await fetch(`${config.SUPABASE_URL}/rest/v1/players?select=username,title,net_worth,jail_timer,state,last_seen&limit=1000`, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      const allPlayersRows = allPlayersRes.ok ? await allPlayersRes.json() : [];

      let flaggedCount = 0;
      let frozenCount = 0;
      let mutedCount = 0;
      const flaggedList = [];
      const frozenList = [];

      allPlayersRows.forEach(p => {
        const uLower = String(p.username || '').toLowerCase();
        const inMem = (sessionManager && sessionManager.sessions.has(uLower)) ? sessionManager.sessions.get(uLower) : null;
        const rawState = (typeof p.state === 'object' && p.state) ? p.state : {};
        const state = (inMem && inMem.state) ? inMem.state : rawState;

        const isFrozen = Boolean(
          (Number(state.freezeUntil || 0) > now) ||
          (state.freezeReason && Number(p.jail_timer || state.jailTimer || 0) > 0) ||
          state.isFrozen === true
        );
        const isFlagged = Boolean(
          state.staffFlag ||
          state.underSuspicion === true ||
          state.flagReason ||
          isFrozen
        );
        const isMuted = Boolean(Number(state.mutedUntil || 0) > now || state.isMuted === true);

        if (isFrozen) {
          frozenCount++;
          frozenList.push({ p, state });
        }
        if (isFlagged) {
          flaggedCount++;
          flaggedList.push({ p, state });
        }
        if (isMuted) {
          mutedCount++;
        }
      });

      // 2. Fetch top 30 wealthiest players for wealth analysis
      const topWealthRes = await fetch(`${config.SUPABASE_URL}/rest/v1/players?select=username,cash,bank,net_worth,gold,title,is_banned,jail_timer,last_seen,state&order=net_worth.desc&limit=30`, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      const topRows = topWealthRes.ok ? await topWealthRes.json() : [];

      // 3. Count in-memory active sessions
      let activeOnlineCount = 0;
      if (sessionManager && sessionManager.sessions) {
        for (const [_, sess] of sessionManager.sessions.entries()) {
          if (sess && sess.lastActivity && (now - sess.lastActivity < 10 * 60 * 1000)) {
            activeOnlineCount++;
          }
        }
      }

      // 4. Identify suspicious flags / alerts
      const suspiciousAlerts = [];

      // A. Frozen accounts in Risk Feed
      frozenList.slice(0, 10).forEach(({ p, state }) => {
        const remainingMins = Math.max(1, Math.round(((Number(state.freezeUntil || 0) - now) / 60000) || (Number(p.jail_timer || 0) / 60)));
        suspiciousAlerts.push({
          type: 'frozen',
          severity: 'high',
          username: p.username,
          title: p.title || 'لاعب',
          netWorth: Number(p.net_worth || state.netWorth || 0),
          message: `الحساب مجمد حالياً (متبقي ${remainingMins} دقيقة) — ${state.freezeReason || 'أمر إداري'}`
        });
      });

      // B. Flagged / Under Surveillance accounts in Risk Feed
      flaggedList.slice(0, 10).forEach(({ p, state }) => {
        if (!state.freezeUntil || Number(state.freezeUntil) <= now) {
          suspiciousAlerts.push({
            type: 'flagged',
            severity: 'medium',
            username: p.username,
            title: p.title || 'لاعب',
            netWorth: Number(p.net_worth || state.netWorth || 0),
            message: `الحساب موضوع تحت المراقبة — ${state.flagReason || 'قيد المتابعة والتدقيق الإداري'}`
          });
        }
      });

      // C. High wealth anomalies
      for (const p of topRows) {
        const netWorth = Number(p.net_worth || 0);
        if (netWorth > 5000000000 && !p.username.toLowerCase().includes('khaled')) {
          suspiciousAlerts.push({
            type: 'wealth_high',
            severity: 'high',
            username: p.username,
            title: p.title || 'لاعب',
            netWorth: netWorth,
            message: `ثروة ضخمة تتجاوز ${Math.round(netWorth / 1000000).toLocaleString('en-US')} مليون`
          });
        }
      }

      // 5. Fetch recent 15 transfers for rapid movement monitoring
      const transfersRes = await fetch(`${config.SUPABASE_URL}/rest/v1/transfers?order=created_at.desc&limit=15`, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      const recentTransfers = transfersRes.ok ? await transfersRes.json() : [];

      return reply.send({
        success: true,
        stats: {
          totalPlayers: totalPlayersCount || allPlayersRows.length,
          onlinePlayers: Math.max(activeOnlineCount, 1),
          flaggedPlayers: flaggedCount,
          frozenPlayers: frozenCount,
          mutedPlayers: mutedCount
        },
        suspiciousAlerts: suspiciousAlerts.slice(0, 20),
        recentTransfers: recentTransfers || []
      });
    } catch (err) {
      fastify.log.error(err, '[Moderator Overview Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * GET /api/mod/search
   * Fast multi-filter search for players with authoritative live calculation
   */
  fastify.get('/search', {
    preHandler: [requireModAuth]
  }, async (request, reply) => {
    const { q = '', filter = 'all', limit = 100 } = request.query || {};
    const cleanQ = String(q).trim();
    const sKey = serviceKey();
    const now = Date.now();

    try {
      let rows = [];

      if (filter === 'flagged' || filter === 'frozen' || filter === 'muted') {
        // Retrieve full dataset to ensure zero false-negatives across complex JSON subkeys
        const res = await fetch(`${config.SUPABASE_URL}/rest/v1/players?select=username,cash,bank,net_worth,gold,title,job_id,is_banned,jail_timer,last_seen,state&limit=1000`, {
          headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
        });
        if (res.ok) {
          rows = await res.json();
        }
      } else {
        // Standard search / All filter
        let queryParams = `select=username,cash,bank,net_worth,gold,title,job_id,is_banned,jail_timer,last_seen,state&limit=${Math.min(200, Number(limit) || 100)}`;
        if (cleanQ) {
          queryParams += `&username=ilike.*${encodeURIComponent(cleanQ)}*`;
        } else {
          queryParams += `&order=net_worth.desc`;
        }

        const res = await fetch(`${config.SUPABASE_URL}/rest/v1/players?${queryParams}`, {
          headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
        });
        if (res.ok) {
          rows = await res.json();
        }
      }

      if (!Array.isArray(rows)) rows = [];

      // Transform rows into clean player summary cards, authoritatively recalculating offline progress
      let results = rows.map(r => {
        const uLower = String(r.username || '').toLowerCase();
        const inMem = (sessionManager && sessionManager.sessions.has(uLower))
          ? sessionManager.sessions.get(uLower)
          : null;

        const isOnline = inMem
          ? (now - (inMem.lastActivity || 0) < 10 * 60 * 1000)
          : false;

        const rawState = (typeof r.state === 'object' && r.state) ? r.state : {};
        let state = (inMem && inMem.state) ? inMem.state : rawState;

        // If player is offline, calculate authoritative offline progress on the server
        // so the moderator panel displays 100% current, up-to-the-second wealth without waiting for player login
        if (!inMem) {
          state = sanitizePlayerState({ ...r, state: rawState });
          calculateAuthoritativeOfflineProgress(state, now);
        }

        const isFrozen = Boolean(
          (Number(state.freezeUntil || 0) > now) ||
          (state.freezeReason && Number(r.jail_timer || state.jailTimer || 0) > 0) ||
          state.isFrozen === true
        );
        const isMuted = Boolean(Number(state.mutedUntil || 0) > now || state.isMuted === true);
        const isFlagged = Boolean(
          state.staffFlag ||
          state.underSuspicion === true ||
          state.flagReason ||
          isFrozen
        );

        return {
          username: r.username,
          title: state.title || r.title || 'عامل مبتدئ',
          jobId: state.jobId || r.job_id || 'worker',
          cash: Number(state.cash !== undefined ? state.cash : (r.cash || 0)),
          bank: Number(state.bank !== undefined ? state.bank : (r.bank || 0)),
          netWorth: Number(state.netWorth !== undefined ? state.netWorth : (r.net_worth || 0)),
          gold: Number(state.gold !== undefined ? state.gold : (r.gold || 0)),
          lastSeen: Number(state.lastSeen || r.last_seen || 0),
          isOnline,
          isBanned: Boolean(r.is_banned || state.isBanned),
          isFrozen,
          isMuted,
          isFlagged,
          underSuspicion: Boolean(state.underSuspicion),
          freezeUntil: Number(state.freezeUntil || 0),
          freezeReason: state.freezeReason || '',
          mutedUntil: Number(state.mutedUntil || 0),
          muteReason: state.muteReason || '',
          staffFlag: state.staffFlag || (state.underSuspicion ? 'under_investigation' : (isFrozen ? 'frozen' : null))
        };
      });

      // Filter by category
      if (filter === 'flagged') {
        results = results.filter(p => p.isFlagged);
      } else if (filter === 'frozen') {
        results = results.filter(p => p.isFrozen);
      } else if (filter === 'muted') {
        results = results.filter(p => p.isMuted);
      }

      // If user provided search text, filter matching usernames
      if (cleanQ) {
        const qLower = cleanQ.toLowerCase();
        results = results.filter(p => p.username.toLowerCase().includes(qLower));
      }

      // Default sorting: if category filtered, sort by most recent activity/modification
      if (filter === 'flagged' || filter === 'frozen' || filter === 'muted') {
        results.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
      }

      return reply.send({ success: true, count: results.length, players: results });
    } catch (err) {
      fastify.log.error(err, '[Moderator Search Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * GET /api/mod/player/:username
   * Comprehensive 360-degree deep inspection of a player's account
   */
  fastify.get('/player/:username', {
    preHandler: [requireModAuth]
  }, async (request, reply) => {
    const { username } = request.params || {};
    if (!username) return reply.status(400).send({ error: 'Username is required' });

    const u = decodeURIComponent(username).trim();
    const sKey = serviceKey();

    try {
      // 1. Fetch player record
      const pRes = await fetch(`${config.SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(u)}&select=*`, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });

      if (!pRes.ok) {
        return reply.status(500).send({ error: 'Failed to fetch player' });
      }

      const rows = await pRes.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return reply.status(404).send({ error: 'Player Not Found', message: `لم يتم العثور على اللاعب "${u}".` });
      }

      const pDoc = rows[0];
      const now = Date.now();

      // Check if player is online in memory
      const uKey = u.toLowerCase();
      const inMemSession = sessionManager ? sessionManager.getSession(uKey) : null;
      const isOnline = inMemSession ? (now - (inMemSession.lastActivity || 0) < 10 * 60 * 1000) : false;

      // 1B. Synchronize live state: if player has active in-memory session, use live memory state!
      // If player is offline, calculate authoritative offline progress immediately on the server!
      let liveState = null;
      if (inMemSession && inMemSession.state) {
        liveState = inMemSession.state;
      } else {
        const rawState = (typeof pDoc.state === 'object' && pDoc.state) ? pDoc.state : {};
        liveState = sanitizePlayerState({ ...pDoc, state: rawState });
        // Calculate authoritative offline progress on the server right now so inspector shows real current values
        calculateAuthoritativeOfflineProgress(liveState, now);

        // Immediately update Supabase with fresh authoritative numbers so the database remains 100% current
        fetch(`${config.SUPABASE_URL}/rest/v1/players?username=eq.${encodeURIComponent(pDoc.username)}`, {
          method: 'PATCH',
          headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            cash: Number(liveState.cash || 0),
            bank: Number(liveState.bank || 0),
            net_worth: Number(liveState.netWorth || 0),
            title: liveState.title || pDoc.title,
            jail_timer: Number(liveState.jailTimer || 0),
            state: liveState
          })
        }).catch(err => console.warn('[Inspect Offline Catchup Save]:', err.message));
      }

      // Sync computed values back to pDoc for consistent financial reports
      pDoc.cash = Number(liveState.cash !== undefined ? liveState.cash : (pDoc.cash || 0));
      pDoc.bank = Number(liveState.bank !== undefined ? liveState.bank : (pDoc.bank || 0));
      pDoc.net_worth = Number(liveState.netWorth !== undefined ? liveState.netWorth : (pDoc.net_worth || 0));
      pDoc.gold = Number(liveState.gold !== undefined ? liveState.gold : (pDoc.gold || 0));
      pDoc.title = liveState.title || pDoc.title;
      const state = liveState;

      // 2. Fetch P2P transfers related to this player (sent & received)
      const cleanU = encodeURIComponent(u);
      const transfersRes = await fetch(`${config.SUPABASE_URL}/rest/v1/transfers?or=(sender.ilike.${cleanU},recipient.ilike.${cleanU})&order=created_at.desc&limit=250`, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      const playerTransfers = transfersRes.ok ? await transfersRes.json() : [];

      // 3. Fetch recent Mailbox & DM interactions
      let playerMailbox = [];
      try {
        const mbRes = await fetch(`${config.SUPABASE_URL}/rest/v1/mailbox?or=(sender.ilike.${cleanU},recipient.ilike.${cleanU})&order=created_at.desc&limit=250`, {
          headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
        });
        if (mbRes.ok) playerMailbox = await mbRes.json();
      } catch (_) {}

      // 3B. Fetch Official Top-Up Requests & Admin Injections for this Player
      let playerTopups = [];
      try {
        const topupRes = await fetch(`${config.SUPABASE_URL}/rest/v1/globals?id=eq.topup_requests&select=data`, {
          headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
        });
        if (topupRes.ok) {
          const tRows = await topupRes.json();
          if (tRows && tRows.length > 0 && tRows[0].data && Array.isArray(tRows[0].data.requests)) {
            playerTopups = tRows[0].data.requests.filter(r => 
              r && r.username && r.username.toLowerCase() === u.toLowerCase()
            );
          }
        }
      } catch (_) {}

      // 4. Calculate comprehensive real-time Cashflow Report & Financial Audit
      const cashflowReport = (() => {
        const bank = Number(pDoc.bank || state.bank || 0);
        
        // A. Businesses Net Profit & Payroll
        let totalBizGross = 0;
        let totalBizPayroll = 0;
        let totalBizNet = 0;
        const bizList = [];

        if (state.businesses && typeof state.businesses === 'object') {
          for (const [key, bData] of Object.entries(state.businesses)) {
            if (bData && typeof bData === 'object' && Number(bData.level || 0) > 0) {
              const cfg = BUSINESSES[key] || { name: key, baseDemand: 30, optimumPrice: 20, costOfGoods: 10, workerWage: 5 };
              const bRes = calculateSingleBusinessProfit(key, bData, state);
              const gross = bRes.grossProfit || 0;
              const payroll = bRes.payroll || 0;
              const ownerNet = bRes.ownerProfit || Math.max(0, gross - payroll);

              totalBizGross += gross;
              totalBizPayroll += payroll;
              totalBizNet += ownerNet;

              bizList.push({
                id: key,
                name: cfg.name || key,
                level: Number(bData.level || 1),
                workers: Number(bData.workers || 0),
                grossProfitPerHour: gross,
                payrollPerHour: payroll,
                netPerHour: ownerNet,
                isFranchise: Boolean(bData.isFranchise),
                hasSupplies: bRes.hasSupplies !== false,
                marketingActive: Boolean(bData.marketingTicks && bData.marketingTicks > 0)
              });
            }
          }
        }

        // B. Real Estate Rental Yields
        let totalAssetRent = 0;
        const assetsList = [];
        if (state.assets && typeof state.assets === 'object') {
          for (const [key, countVal] of Object.entries(state.assets)) {
            const count = Number(countVal || 0);
            const cfg = ASSETS[key];
            if (count > 0 && cfg) {
              const rentPerUnit = Math.floor((cfg.rent || 0) * 0.1);
              const hourlyRent = count * rentPerUnit;
              totalAssetRent += hourlyRent;
              assetsList.push({
                id: key,
                name: cfg.name || key,
                count,
                rentPerUnit,
                rentPerHour: hourlyRent
              });
            }
          }
        }

        // C. Rented Cars Fleet
        let totalCarGross = 0;
        let totalCarMaintenance = 0;
        let totalCarNet = 0;
        const carsList = [];
        const ownedCars = Array.isArray(state.ownedCars) ? state.ownedCars : (typeof state.ownedCars === 'object' ? Object.values(state.ownedCars) : []);
        ownedCars.forEach(carRef => {
          if (carRef && carRef.rentStatus === 'rented' && CAR_TEMPLATES[carRef.id]) {
            const cCfg = CAR_TEMPLATES[carRef.id];
            const cGross = cCfg.rentalIncomePerTick || 0;
            const cMaint = cCfg.maintenanceCostPerTick || 0;
            const cNet = Math.max(0, cGross - cMaint);
            totalCarGross += cGross;
            totalCarMaintenance += cMaint;
            totalCarNet += cNet;
            carsList.push({
              id: carRef.id,
              name: cCfg.name || carRef.id,
              grossRentPerHour: cGross,
              maintenancePerHour: cMaint,
              netPerHour: cNet
            });
          }
        });

        // D. Bank Deposit Interest (0.015% per hour with rolls bonus & daily cap)
        const hourlyBankRate = 0.00015;
        const rollsBonus = (state.activeCar === 'rolls') ? 1.05 : 1.0;
        const bankProfitPerHour = Math.min(250000 / 24, Math.floor((bank * hourlyBankRate) * rollsBonus));

        // E. Airport & Aviation Hub
        let airportProfitPerHour = 0;
        let airportData = null;
        if (state.airport && (state.airport.unlocked || Number(state.airport.level || 0) > 0)) {
          const fleetCount = Array.isArray(state.airport.fleet) ? state.airport.fleet.length : Object.keys(state.airport.fleet || {}).length;
          const routesCount = Array.isArray(state.airport.routes) ? state.airport.routes.length : 0;
          airportProfitPerHour = Math.round((routesCount * 45000) + (fleetCount * 30000));
          airportData = {
            level: Number(state.airport.level || 1),
            fleetCount,
            routesCount,
            profitPerHour: airportProfitPerHour
          };
        }

        // F. Agro Farm Tycoon (المزرعة الاستثمارية)
        let farmProfitPerHour = 0;
        let farmData = null;
        if (state.farm && state.farm.unlocked) {
          const ls = state.farm.livestock || {};
          const cows = Number(ls.cows || 0);
          const chickens = Number(ls.chickens || 0);
          const workers = Number(state.farm.workers || 0);
          const proc = state.farm.processing || {};
          const isProc = Boolean(proc.unlocked);
          // Estimated hourly continuous agricultural yield
          farmProfitPerHour = Math.round((cows * 1200) + (chickens * 350) + (workers * 2000) + (isProc ? 5000 : 0));
          farmData = {
            landLevel: Number(state.farm.landLevel || 1),
            cows,
            chickens,
            workers,
            isProcessing: isProc,
            profitPerHour: farmProfitPerHour
          };
        }

        // G. Tax Exemption (Tax Amnesty: 0% tax)
        const taxPerHour = 0;

        // H. Financial Statement Totals
        const grossPerHour = totalBizGross + totalAssetRent + totalCarGross + bankProfitPerHour + airportProfitPerHour + farmProfitPerHour;
        const deductionsPerHour = totalBizPayroll + totalCarMaintenance + taxPerHour;
        const netPerHour = Math.max(0, grossPerHour - deductionsPerHour);

        return {
          summary: {
            grossPerHour,
            deductionsPerHour,
            netPerHour,
            netPerMinute: Math.round(netPerHour / 60),
            netPerDay: Math.round(netPerHour * 24),
            netPerSecond: Number((netPerHour / 3600).toFixed(2))
          },
          businesses: {
            totalGrossPerHour: totalBizGross,
            totalPayrollPerHour: totalBizPayroll,
            totalNetPerHour: totalBizNet,
            list: bizList
          },
          assets: {
            totalRentPerHour: totalAssetRent,
            list: assetsList
          },
          cars: {
            totalGrossPerHour: totalCarGross,
            totalMaintenancePerHour: totalCarMaintenance,
            totalNetPerHour: totalCarNet,
            list: carsList
          },
          bank: {
            balance: bank,
            hourlyRatePct: '0.015%',
            dailyCap: 250000,
            profitPerHour: bankProfitPerHour,
            hasRollsBonus: (state.activeCar === 'rolls')
          },
          airport: airportData,
          farm: farmData,
          tax: {
            isTaxAmnesty: true,
            ratePct: '0%',
            deductionPerHour: taxPerHour,
            exemptReason: 'موسم العفو الضريبي - إعفاء شامل بنسبة 100%'
          }
        };
      })();

      const incomePerMinute = cashflowReport.summary.netPerMinute;

      // 5. Synthesize Unified Master Activity Feed (Merged & Sorted Chronologically)
      const masterFeed = [];

      // A. Explicit Activity Log from player state
      const rawLogs = Array.isArray(state.activityLog) ? state.activityLog : 
                      Array.isArray(state.logs) ? state.logs : 
                      Array.isArray(state.history) ? state.history : [];
      rawLogs.forEach(l => {
        if (!l) return;
        const ts = Number(l.timestamp || l.time || l.date || l.created_at || now);
        masterFeed.push({
          id: l.id || `act_${ts}_${Math.random()}`,
          category: l.category || l.type || 'gameplay',
          title: l.title || l.action || 'نشاط داخل اللعبة',
          desc: l.desc || l.description || l.message || l.details || '',
          amount: l.amount || l.delta || l.value || null,
          isPositive: Boolean(l.isPositive || (l.amount && l.amount > 0)),
          timestamp: ts,
          source: 'state_log',
          cash: l.cash !== undefined && l.cash !== null ? Number(l.cash) : null,
          bank: l.bank !== undefined && l.bank !== null ? Number(l.bank) : null
        });
      });

      // B. Transfers injected into feed
      playerTransfers.forEach(t => {
        const isSender = (t.sender && t.sender.toLowerCase() === u.toLowerCase());
        const otherParty = isSender ? (t.recipient || 'مجهول') : (t.sender || 'مجهول');
        const ts = Number(t.created_at ? new Date(t.created_at).getTime() : now);
        masterFeed.push({
          id: `tr_${t.id || ts}`,
          category: 'transfer',
          title: isSender ? `حوالة مالية صادرة إلى ${otherParty}` : `حوالة مالية واردة من ${otherParty}`,
          desc: t.message ? `ملاحظة الحوالة: "${t.message}"` : `تحويل بنكي مباشر عبر تطبيق البنك`,
          amount: Number(t.amount || 0),
          isPositive: !isSender,
          counterparty: otherParty,
          timestamp: ts,
          source: 'p2p_transfer',
          cash: isSender ? (t.sender_cash != null ? Number(t.sender_cash) : null) : (t.recipient_cash != null ? Number(t.recipient_cash) : null),
          bank: isSender ? (t.sender_bank != null ? Number(t.sender_bank) : null) : (t.recipient_bank != null ? Number(t.recipient_bank) : null)
        });
      });

      // C. Stock trades from state
      if (Array.isArray(state.tradeHistory) || Array.isArray(state.stockHistory)) {
        const stockHist = state.tradeHistory || state.stockHistory;
        stockHist.forEach(st => {
          const ts = Number(st.timestamp || st.time || now);
          masterFeed.push({
            id: `stk_${ts}_${Math.random()}`,
            category: 'stocks',
            title: `صفقة بورصة: ${st.type === 'buy' ? 'شراء' : 'بيع'} أسهم ${st.symbol || st.name || ''}`,
            desc: `الكمية: ${st.shares || st.amount || 0} | السعر: $${Number(st.price || 0).toLocaleString()}`,
            amount: Number(st.total || (st.shares * st.price) || 0),
            isPositive: st.type === 'sell',
            timestamp: ts,
            source: 'stock_market',
            cash: st.cash !== undefined && st.cash !== null ? Number(st.cash) : null,
            bank: st.bank !== undefined && st.bank !== null ? Number(st.bank) : null
          });
        });
      }

      // D. Secret Staff Dossier Notes injected into masterFeed
      const staffNotesList = Array.isArray(state.staffNotes) ? state.staffNotes : [];
      staffNotesList.forEach(sn => {
        if (!sn) return;
        const ts = Number(sn.timestamp || now);
        masterFeed.push({
          id: sn.id || `sn_${ts}_${Math.random().toString(36).substring(2, 6)}`,
          category: 'notes',
          title: `ملاحظة سرية في الدفتر (${sn.modName || 'محقق'})`,
          desc: sn.note || '',
          amount: null,
          isPositive: false,
          timestamp: ts,
          source: 'staff_notebook',
          cash: sn.cash !== undefined && sn.cash !== null ? Number(sn.cash) : null,
          bank: sn.bank !== undefined && sn.bank !== null ? Number(sn.bank) : null
        });
      });

      // E. Official Top-Up Packages & Recharges injected into masterFeed
      const adminGrantsAndTopupsList = [];
      playerTopups.forEach(tp => {
        const isApproved = tp.status === 'approved';
        const ts = Number(tp.reviewedAt || tp.timestamp || (tp.created_at ? new Date(tp.created_at).getTime() : now));
        const cashReward = tp.rewards?.cash || 0;
        const bankReward = tp.rewards?.bank || 0;
        const goldReward = tp.rewards?.gold || 0;
        const totalCash = cashReward + bankReward;

        let rewardsSummary = [];
        if (totalCash > 0) rewardsSummary.push(`+${totalCash.toLocaleString()} ج.م`);
        if (goldReward > 0) rewardsSummary.push(`+${goldReward.toLocaleString()} 🪙 ذهب`);
        if (tp.rewards?.xp) rewardsSummary.push(`+${tp.rewards.xp} XP`);
        if (tp.rewards?.customBadge) rewardsSummary.push(`وسام [${tp.rewards.customBadge}]`);

        const topupFeedItem = {
          id: `topup_${tp.id || ts}`,
          category: 'admin_grant',
          title: isApproved ? `شحنة معتمدة من الإدارة 👑 (${tp.packageName || 'باقة متجر'})` : `طلب شحن (${tp.status === 'pending' ? 'قيد المراجعة' : 'مرفوض'}): ${tp.packageName || 'متجر'}`,
          desc: `المبلغ: ${Number(tp.price || 0).toLocaleString()} ج.م • الحالة: ${isApproved ? 'تم الشحن والاعتماد ✅' : tp.status}` +
                (rewardsSummary.length ? ` • المكافآت: ${rewardsSummary.join(' | ')}` : '') +
                (tp.reviewerNote ? ` • بيان الإدارة: "${tp.reviewerNote}"` : ''),
          amount: totalCash > 0 ? totalCash : null,
          gold: goldReward > 0 ? goldReward : null,
          isPositive: isApproved,
          counterparty: 'إدارة اللعبة (Admin)',
          timestamp: ts,
          source: 'admin_topup'
        };
        masterFeed.push(topupFeedItem);
        adminGrantsAndTopupsList.push({
          id: tp.id || `topup_${ts}`,
          type: 'topup',
          title: tp.packageName || 'باقة شحن متجر',
          price: tp.price || 0,
          cash: totalCash,
          gold: goldReward,
          status: tp.status,
          note: tp.reviewerNote || '',
          timestamp: ts
        });
      });

      // F. Admin Direct Balance Grants & Gold Grants from Mailbox
      playerMailbox.forEach(mb => {
        const isFromAdmin = (mb.sender && (mb.sender.includes('Admin') || mb.sender.includes('الإدارة') || mb.sender.includes('admin')));
        const isAdminGrantType = mb.type === 'admin_balance_grant' || mb.type === 'admin_gold_grant';
        if (isFromAdmin || isAdminGrantType) {
          const ts = Number(mb.created_at ? new Date(mb.created_at).getTime() : (mb.timestamp || now));
          const pld = mb.payload || {};
          const isGold = mb.type === 'admin_gold_grant' || pld.addedGold != null;
          const goldAmt = Number(pld.addedGold || 0);
          const cashAmt = Number(pld.totalAmount || pld.addedCash || pld.addedBank || mb.amount || 0);

          const mailGrantItem = {
            id: `adm_mail_${mb.id || ts}`,
            category: 'admin_grant',
            title: isGold ? `منحة ذهب مباشرة من الإدارة 🪙 (+${goldAmt.toLocaleString()} ذهبة)` : `منحة مالية مباشرة من الإدارة 💰 (+${cashAmt.toLocaleString()} ج.م)`,
            desc: `إيداع فوري بحساب اللاعب من قبل الإدارة` + (pld.target ? ` في [${pld.target}]` : '') + (mb.message ? ` • الملاحظة: "${mb.message}"` : ''),
            amount: cashAmt > 0 ? cashAmt : null,
            gold: goldAmt > 0 ? goldAmt : null,
            isPositive: true,
            counterparty: mb.sender || 'إدارة اللعبة (Admin)',
            timestamp: ts,
            source: 'admin_grant',
            cash: pld.newCash != null ? Number(pld.newCash) : null,
            bank: pld.newBank != null ? Number(pld.newBank) : null
          };
          masterFeed.push(mailGrantItem);
          adminGrantsAndTopupsList.push({
            id: mb.id || `grant_${ts}`,
            type: isGold ? 'gold_grant' : 'balance_grant',
            title: isGold ? `منح ${goldAmt.toLocaleString()} ذهبة` : `إيداع ${cashAmt.toLocaleString()} ج.م`,
            cash: cashAmt,
            gold: goldAmt,
            status: 'approved',
            note: mb.message || pld.target || 'إيداع إداري مباشر',
            timestamp: ts
          });
        }
      });

      // G. Admin Grants from Player State (if recorded in state.adminGrants)
      if (Array.isArray(state.adminGrants)) {
        state.adminGrants.forEach(ag => {
          if (!ag) return;
          const ts = Number(ag.timestamp || now);
          masterFeed.push({
            id: ag.id || `ag_${ts}`,
            category: 'admin_grant',
            title: ag.gold ? `منحة ذهب من الإدارة 🪙 (+${ag.gold} ذهبة)` : `منحة رصيد من الإدارة 💰 (+${Number(ag.amount || ag.cash || 0).toLocaleString()} ج.م)`,
            desc: ag.details || ag.note || 'منحة إدارية مسجلة في ملف اللاعب',
            amount: Number(ag.amount || ag.cash || 0) || null,
            gold: Number(ag.gold || 0) || null,
            isPositive: true,
            counterparty: 'إدارة اللعبة (Admin)',
            timestamp: ts,
            source: 'admin_grant'
          });
          adminGrantsAndTopupsList.push({
            id: ag.id || `ag_${ts}`,
            type: ag.gold ? 'gold_grant' : 'balance_grant',
            title: ag.title || (ag.gold ? `منح ${ag.gold} ذهبة` : `إيداع ${ag.amount || ag.cash} ج.م`),
            cash: Number(ag.amount || ag.cash || 0),
            gold: Number(ag.gold || 0),
            status: 'approved',
            note: ag.details || ag.note || '',
            timestamp: ts
          });
        });
      }

      // Sort full master feed descending by time
      masterFeed.sort((a, b) => b.timestamp - a.timestamp);
      adminGrantsAndTopupsList.sort((a, b) => b.timestamp - a.timestamp);

      // 6. Format complete detailed profile
      const isFrozen = Boolean((state.freezeUntil && state.freezeUntil > now) || Number(pDoc.jail_timer || 0) > 0);
      const isMuted = Boolean(state.mutedUntil && state.mutedUntil > now);

      // Enrich airport information with complete facility, fleet, economics, and valuation details
      const enrichedAirport = (() => {
        if (!state.airport || !state.airport.unlocked) return null;
        const ap = state.airport;
        const f = ap.facilities || {};
        const runwayLvl = Math.max(1, Math.min(4, Number(f.runway || 1)));
        const terminalLvl = Math.max(1, Math.min(4, Number(f.terminals || 1)));
        const hangarLvl = Math.max(1, Math.min(4, Number(f.hangar || 1)));
        const dutyFreeLvl = Math.max(0, Math.min(4, Number(f.duty_free || 0)));

        const runwayCfg = (AIRPORT_FACILITIES.runway && AIRPORT_FACILITIES.runway.levels[runwayLvl]) || {};
        const terminalCfg = (AIRPORT_FACILITIES.terminals && AIRPORT_FACILITIES.terminals.levels[terminalLvl]) || {};
        const hangarCfg = (AIRPORT_FACILITIES.hangar && AIRPORT_FACILITIES.hangar.levels[hangarLvl]) || {};
        const dutyFreeCfg = (AIRPORT_FACILITIES.duty_free && AIRPORT_FACILITIES.duty_free.levels[dutyFreeLvl]) || {};

        let totalFacilitiesCost = 0;
        for (let l = 2; l <= runwayLvl; l++) totalFacilitiesCost += (AIRPORT_FACILITIES.runway.levels[l]?.cost || 0);
        for (let l = 2; l <= terminalLvl; l++) totalFacilitiesCost += (AIRPORT_FACILITIES.terminals.levels[l]?.cost || 0);
        for (let l = 2; l <= hangarLvl; l++) totalFacilitiesCost += (AIRPORT_FACILITIES.hangar.levels[l]?.cost || 0);
        for (let l = 1; l <= dutyFreeLvl; l++) totalFacilitiesCost += (AIRPORT_FACILITIES.duty_free.levels[l]?.cost || 0);

        let totalFleetCost = 0;
        const fleetList = (Array.isArray(ap.fleet) ? ap.fleet : []).map(p => {
          const mCfg = AIRCRAFT_MODELS[p.modelId] || {};
          const planeCost = Number(mCfg.cost || 0);
          totalFleetCost += planeCost;

          const flightObj = p.activeFlight || (p.flight ? p.flight : null);
          const activeFlight = flightObj ? {
            destinationId: flightObj.destinationId,
            destinationName: flightObj.destinationName || 'وجهة دولية',
            departureTime: Number(flightObj.departureTime || 0),
            arrivalTime: Number(flightObj.arrivalTime || 0),
            durationSec: Number(flightObj.durationSec || 0),
            timeRemainingSec: Math.max(0, Math.ceil((Number(flightObj.arrivalTime || 0) - now) / 1000)),
            isArrived: now >= Number(flightObj.arrivalTime || 0),
            progressPercent: (() => {
              const dep = Number(flightObj.departureTime || 0);
              const arr = Number(flightObj.arrivalTime || 0);
              if (arr <= dep) return 100;
              return Math.min(100, Math.max(0, Math.round(((now - dep) / (arr - dep)) * 100)));
            })(),
            expectedNetProfit: Number(flightObj.economics?.netProfit || flightObj.netProfit || 0),
            expectedXp: Number(flightObj.xpReward || 0)
          } : null;

          return {
            id: p.id,
            modelId: p.modelId,
            modelName: mCfg.name || p.modelId,
            tier: mCfg.tier || 1,
            capacity: mCfg.capacity || 'ركاب',
            icon: mCfg.icon || 'fa-plane',
            customName: p.customName || mCfg.name || 'طائرة خاصة',
            status: p.status || (activeFlight ? 'in_flight' : 'idle'),
            cost: planeCost,
            flightsCompleted: Number(p.flightsCompleted || 0),
            totalProfitEarned: Number(p.totalProfitEarned || 0),
            activeFlight
          };
        });

        const dutyFreeAccumulated = calculateDutyFreeAccumulated(ap, now);
        const passivePerMin = dutyFreeLvl > 0 ? (dutyFreeCfg.passivePerMin || 0) : 0;
        const maxCapacity8h = passivePerMin * 60 * 8;

        const transitAccumulated = calculateTransitAccumulated(ap, now);
        const towerCfg = (CONTROL_TOWER_CONFIG && CONTROL_TOWER_CONFIG.levels && CONTROL_TOWER_CONFIG.levels[runwayLvl]) || { perHour: 3000 };
        const lastTransitAt = Number(ap.lastTransitCollectionAt || ap.lastTransitPermitAt || ap.unlockedAt || now);
        const transitCooldownSec = 60;
        const transitElapsedSec = Math.floor((now - lastTransitAt) / 1000);
        const isTransitReady = transitAccumulated >= 500 && (transitElapsedSec >= transitCooldownSec);
        const transitRemainingSec = isTransitReady ? 0 : Math.max(0, transitCooldownSec - transitElapsedSec);

        return {
          unlocked: true,
          unlockedAt: Number(ap.unlockedAt || 0),
          name: ap.name || 'مطار رأس المال الدولي',
          valuation: {
            fleetValue: totalFleetCost,
            facilitiesValue: totalFacilitiesCost,
            totalAirportCapital: totalFleetCost + totalFacilitiesCost
          },
          facilities: {
            runway: { level: runwayLvl, name: runwayCfg.name || 'مدرج إقليمي', maxPlaneTier: runwayCfg.maxPlaneTier || 1 },
            terminals: { level: terminalLvl, name: terminalCfg.name || 'صالات ركاب', ticketBonus: terminalCfg.ticketBonus || 1.0 },
            hangar: { level: hangarLvl, name: hangarCfg.name || 'حوض صيانة', timeReduction: hangarCfg.timeReduction || 0, fuelDiscount: hangarCfg.fuelDiscount || 0 },
            duty_free: { level: dutyFreeLvl, name: dutyFreeCfg.name || 'غير مشيدة', passivePerMin, accumulated: dutyFreeAccumulated, maxCapacity8h, lastCollectedAt: Number(ap.lastDutyFreeCollectionAt || 0) }
          },
          transitRadar: {
            lastTransitAt,
            isReady: isTransitReady,
            remainingSec: transitRemainingSec,
            accumulated: transitAccumulated,
            perHour: towerCfg.perHour || 3000,
            maxCapacity8h: (towerCfg.perHour || 3000) * 8,
            transitPermitsAccepted: Number(ap.stats?.transitPermitsAccepted || 0)
          },
          stats: {
            totalFlights: Number(ap.stats?.totalFlights || 0),
            totalRevenue: Number(ap.stats?.totalRevenue || 0),
            totalOperatingCost: Number(ap.stats?.totalOperatingCost || 0),
            totalNetProfit: Number(ap.stats?.totalNetProfit || 0),
            totalDutyFreeCollected: Number(ap.stats?.totalDutyFreeCollected || 0),
            transitPermitsAccepted: Number(ap.stats?.transitPermitsAccepted || 0)
          },
          fleet: fleetList
        };
      })();

      const inspectionProfile = {
        // Core Identity
        username: pDoc.username,
        title: pDoc.title || state.title || 'عامل مبتدئ',
        jobId: pDoc.job_id || state.jobId || 'worker',
        avatarUrl: state.avatarUrl || '',
        createdAt: Number(pDoc.created_at || 0),
        lastSeen: Number(pDoc.last_seen || 0),
        isOnline,

        // Financial & Wealth
        cash: Number(pDoc.cash || 0),
        bank: Number(pDoc.bank || 0),
        dirtyCash: Number(pDoc.dirty_cash || state.dirtyCash || 0),
        netWorth: Number(pDoc.net_worth || 0),
        gold: Number(pDoc.gold || state.gold || 0),
        xp: Number(pDoc.xp || 0),
        totalTaxesPaid: Number(pDoc.total_taxes_paid || state.totalTaxesPaid || 0),
        incomePerMinute: Math.round(incomePerMinute),
        cashflowReport: cashflowReport,

        // Real Estate, Businesses & Assets
        businesses: state.businesses || {},
        industry: state.industry || {},
        ownedCars: state.ownedCars || {},
        activeCar: state.activeCar || null,
        assets: state.assets || {},

        // Museum & Rare Collectibles
        museum: state.museum || state.rareItems || state.artifacts || [],

        // Stocks & Investments
        stocks: state.stocks || {},
        crypto: state.crypto || {},
        investments: state.investments || [],
        dailyStockProfit: state.dailyStockProfit || null,
        dailyWork: state.dailyWork || null,
        limitsResetAt: state.limitsResetAt || null,

        // Aviation & Airport
        airport: enrichedAirport,

        // Farm & Agriculture
        farm: state.farm || null,

        // Casino & Gambling Stats
        casinoStats: state.casinoStats || { totalWins: 0, totalLosses: 0, totalSpins: 0 },

        // Gang / Social
        gang: state.gang || state.gangName || pDoc.gang || null,

        // Moderation & Security Status
        isBanned: Boolean(pDoc.is_banned),
        isFrozen,
        freezeUntil: Number(state.freezeUntil || 0),
        freezeReason: state.freezeReason || '',
        frozenBy: state.frozenBy || '',
        jailTimer: Number(pDoc.jail_timer || state.jailTimer || 0),
        isMuted,
        mutedUntil: Number(state.mutedUntil || 0),
        muteReason: state.muteReason || '',
        mutedBy: state.mutedBy || '',
        isFlagged: Boolean(
          state.staffFlag ||
          state.underSuspicion === true ||
          state.flagReason ||
          isFrozen
        ),
        underSuspicion: Boolean(state.underSuspicion),
        staffFlag: state.staffFlag || (state.underSuspicion ? 'under_investigation' : (isFrozen ? 'frozen' : null)),
        flagReason: state.flagReason || '',
        flaggedBy: state.flaggedBy || '',
        moderatorNotes: Array.isArray(state.moderatorNotes) ? state.moderatorNotes : [],
        staffNotes: Array.isArray(state.staffNotes) ? state.staffNotes : [],

        // Recent Activity & Transfers (Extensive historical retention)
        transfers: playerTransfers || [],
        mailbox: playerMailbox || [],
        adminGrantsAndTopups: adminGrantsAndTopupsList || [],
        activityFeed: masterFeed.slice(0, 3500),
        activityLog: rawLogs.slice(-3500),

        // Device & IP Login Telemetry History
        lastLoginIp: state.lastLoginIp || pDoc.last_ip || null,
        lastLoginDevice: state.lastLoginDevice || pDoc.last_device || null,
        lastLoginTime: Number(state.lastLoginTime || 0),
        loginHistory: Array.isArray(state.loginHistory) ? state.loginHistory : []
      };

      // Record inspector view in staff audit
      logStaffAudit(request.modSession, u, 'inspect_player', `فحص ملف اللاعب بالتفصيل وسجل الأنشطة`);

      return reply.send({ success: true, profile: inspectionProfile });
    } catch (err) {
      fastify.log.error(err, '[Moderator Inspect Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * POST /api/mod/player/note
   * Adds an internal staff note to player's private dossier
   */
  fastify.post('/player/note', {
    preHandler: [requireModAuth]
  }, async (request, reply) => {
    const { targetUser, note } = request.body || {};
    if (!targetUser || !note || typeof note !== 'string' || !note.trim()) {
      return reply.status(400).send({ error: 'Bad Request', message: 'اسم اللاعب والملاحظة مطلوبان.' });
    }

    const cleanNote = note.trim().substring(0, 1000);
    const target = targetUser.trim();
    const sKey = serviceKey();
    const ts = Date.now();

    try {
      const pRes = await fetch(`${config.SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(target)}&select=*`, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      const rows = await pRes.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: `اللاعب "${target}" غير موجود.` });
      }

      const pDoc = rows[0];
      const pState = (typeof pDoc.state === 'object' && pDoc.state) ? pDoc.state : {};
      if (!Array.isArray(pState.staffNotes)) pState.staffNotes = [];

      const noteEntry = {
        id: 'snote_' + ts + '_' + crypto.randomBytes(3).toString('hex'),
        timestamp: ts,
        modId: request.modSession.id,
        modName: request.modSession.name,
        note: cleanNote
      };

      pState.staffNotes.unshift(noteEntry);
      if (pState.staffNotes.length > 100) pState.staffNotes = pState.staffNotes.slice(0, 100);

      // Also persist to activityLog so it is mirrored across activity feeds and history
      if (!Array.isArray(pState.activityLog)) pState.activityLog = [];
      pState.activityLog.unshift({
        timestamp: ts,
        action: `ملاحظة في الدفتر السري (${request.modSession.name})`,
        details: cleanNote,
        category: 'notes',
        cash: Math.max(0, Math.round(Number(pState.cash || 0))),
        bank: Math.max(0, Math.round(Number(pState.bank || 0)))
      });
      if (pState.activityLog.length > 3500) pState.activityLog = pState.activityLog.slice(0, 3500);

      // Persist to Database
      const patchUrl = `${config.SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(target)}`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'apikey': sKey,
          'Authorization': `Bearer ${sKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          state: pState,
          admin_modified_timestamp: ts
        })
      });

      // Sync in-memory session if active
      if (sessionManager) {
        const session = sessionManager.getSession(target.toLowerCase());
        if (session) {
          session.state.staffNotes = pState.staffNotes;
          if (!Array.isArray(session.state.activityLog)) session.state.activityLog = [];
          session.state.activityLog.unshift({
            timestamp: ts,
            action: `ملاحظة في الدفتر السري (${request.modSession.name})`,
            details: cleanNote,
            category: 'notes',
            cash: Math.max(0, Math.round(Number(session.state.cash || pState.cash || 0))),
            bank: Math.max(0, Math.round(Number(session.state.bank || pState.bank || 0)))
          });
          if (session.state.activityLog.length > 3500) session.state.activityLog = session.state.activityLog.slice(0, 3500);
        }
      }

      // Record in audit logs
      await logStaffAudit(request.modSession, target, 'add_staff_note', `إضافة ملاحظة سرية في دفتر اللاعب: "${cleanNote.substring(0, 60)}..."`, { noteLength: cleanNote.length });

      return reply.send({
        success: true,
        message: 'تم حفظ الملاحظة في دفتر التحقيق بنجاح.',
        note: noteEntry,
        staffNotes: pState.staffNotes
      });
    } catch (err) {
      fastify.log.error(err, '[Staff Note Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * GET /api/mod/standby/status
   * Retrieves current Standby Mode status
   */
  fastify.get('/standby/status', {
    preHandler: [requireModAuth]
  }, async (request, reply) => {
    try {
      const sKey = serviceKey();
      const res = await fetch(`${config.SUPABASE_URL}/rest/v1/globals?id=eq.standby_mode&select=*`, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0].data) {
          return reply.send({ success: true, standby: rows[0].data });
        }
      }
      return reply.send({
        success: true,
        standby: { active: false, enabled: false, message: '', facebook_url: '' }
      });
    } catch (err) {
      fastify.log.error(err, '[Standby Status Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * POST /api/mod/standby/toggle
   * Toggles game-wide Standby Mode
   */
  fastify.post('/standby/toggle', {
    preHandler: [requireModAuth]
  }, async (request, reply) => {
    const { active, message = '', facebookUrl = '' } = request.body || {};
    const isActive = Boolean(active);
    const cleanMsg = String(message || '').trim() || 'الخوادم رهن وضع الاستعداد والتجهيز.';
    const cleanFb = String(facebookUrl || '').trim() || 'https://www.facebook.com';
    const sKey = serviceKey();
    const ts = Date.now();

    try {
      const standbyData = {
        active: isActive,
        enabled: isActive,
        message: cleanMsg,
        facebook_url: cleanFb,
        timestamp: ts,
        updated_by: request.modSession.name
      };

      const res = await fetch(`${config.SUPABASE_URL}/rest/v1/globals`, {
        method: 'POST',
        headers: {
          'apikey': sKey,
          'Authorization': `Bearer ${sKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates, return=minimal'
        },
        body: JSON.stringify({
          id: 'standby_mode',
          data: standbyData,
          updated_at: ts
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update standby_mode in globals table');
      }

      // Record to audit logs
      await logStaffAudit(
        request.modSession,
        'SYSTEM',
        isActive ? 'enable_standby' : 'disable_standby',
        isActive ? `تفعيل وضع الستاند باي (Standby Mode) - رسالة: ${cleanMsg}` : 'تعطيل وضع الستاند باي وإعادة فتح اللعبة للجميع',
        { message: cleanMsg, facebookUrl: cleanFb }
      );

      return reply.send({
        success: true,
        message: isActive ? 'تم تفعيل وضع الاستعداد (Standby) بنجاح.' : 'تم إلغاء وضع الاستعداد وفتح اللعبة.',
        standby: standbyData
      });
    } catch (err) {
      fastify.log.error(err, '[Standby Toggle Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * POST /api/mod/action
   * Executes a controlled moderation action with mandatory audit logging and reason
   */
  fastify.post('/action', {
    preHandler: [requireModAuth]
  }, async (request, reply) => {
    const { targetUser, action, durationMinutes = 60, reason = '', note = '' } = request.body || {};

    if (!targetUser || typeof targetUser !== 'string') {
      return reply.status(400).send({ error: 'Bad Request', message: 'اسم اللاعب المستهدف مطلوب.' });
    }
    if (!action || typeof action !== 'string') {
      return reply.status(400).send({ error: 'Bad Request', message: 'نوع الإجراء مطلوب.' });
    }

    const cleanReason = String(reason || note).trim();
    if (cleanReason.length < 3) {
      return reply.status(400).send({ error: 'Bad Request', message: 'يجب كتابة سبب واضح ومفصل للإجراء (3 أحرف على الأقل).' });
    }

    const target = targetUser.trim();
    const targetLower = target.toLowerCase();

    // Absolute Admin Immunity
    if (targetLower === 'khaled' || targetLower.includes('khaled') || targetLower === 'خالد') {
      return reply.status(403).send({ error: 'Forbidden', message: 'حساب المشرف العام محمي تماماً من أي إجراء إداري.' });
    }

    const sKey = serviceKey();
    const ts = Date.now();
    const durationMs = Math.max(5, Number(durationMinutes) || 60) * 60 * 1000;

    try {
      // 1. Fetch player
      const pRes = await fetch(`${config.SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(target)}&select=*`, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      const rows = await pRes.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: `اللاعب "${target}" غير موجود.` });
      }

      const pDoc = rows[0];
      const pState = (typeof pDoc.state === 'object' && pDoc.state) ? pDoc.state : {};
      if (!Array.isArray(pState.moderatorNotes)) pState.moderatorNotes = [];

      let actionDesc = '';
      let updatedJailTimer = Number(pDoc.jail_timer || 0);

      switch (action) {
        case 'freeze': {
          pState.underSuspicion = true;
          pState.freezeUntil = ts + durationMs;
          pState.freezeReason = cleanReason;
          pState.frozenBy = request.modSession.name;
          pState.staffFlag = 'frozen';
          updatedJailTimer = Math.ceil(durationMs / 1000);
          actionDesc = `تجميد الحساب لمدة ${durationMinutes} دقيقة (${cleanReason})`;

          // Add to player mod notes
          pState.moderatorNotes.unshift({
            timestamp: ts,
            action: 'freeze',
            durationMinutes: Number(durationMinutes),
            reason: cleanReason,
            modName: request.modSession.name
          });

          // Send notification mail to player
          await fetch(`${config.SUPABASE_URL}/rest/v1/mailbox`, {
            method: 'POST',
            headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              sender: 'إدارة الرقابة والأمان',
              recipient: pDoc.username,
              type: 'system_warning',
              payload: {
                title: '🔒 تم تجميد حسابك مؤقتاً',
                message: `تم إيقاف حسابك مؤقتاً لمدة ${durationMinutes} دقيقة للتحقيق والمراجعة.\nالسبب: ${cleanReason}`,
                timestamp: ts
              },
              status: 'unread',
              created_at: ts
            })
          });
          break;
        }

        case 'unfreeze': {
          pState.freezeUntil = 0;
          pState.freezeReason = '';
          pState.frozenBy = '';
          if (pState.staffFlag === 'frozen') {
            pState.staffFlag = null;
            pState.underSuspicion = false;
          }
          updatedJailTimer = 0;
          actionDesc = `فك تجميد الحساب (${cleanReason})`;

          pState.moderatorNotes.unshift({
            timestamp: ts,
            action: 'unfreeze',
            reason: cleanReason,
            modName: request.modSession.name
          });

          // Send notification mail to player
          await fetch(`${config.SUPABASE_URL}/rest/v1/mailbox`, {
            method: 'POST',
            headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              sender: 'إدارة الرقابة والأمان',
              recipient: pDoc.username,
              type: 'system_announcement',
              payload: {
                title: '🔓 تم فك تجميد ورفع القيد عن حسابك',
                message: `تمت مراجعة وتدقيق حسابك بنجاح ورفع القيد والتجميد.\nالبيان: ${cleanReason}`,
                timestamp: ts
              },
              status: 'unread',
              created_at: ts
            })
          });
          break;
        }

        case 'mute': {
          pState.mutedUntil = ts + durationMs;
          pState.muteReason = cleanReason;
          pState.mutedBy = request.modSession.name;
          actionDesc = `كتم في الشات لمدة ${durationMinutes} دقيقة (${cleanReason})`;

          pState.moderatorNotes.unshift({
            timestamp: ts,
            action: 'mute',
            durationMinutes: Number(durationMinutes),
            reason: cleanReason,
            modName: request.modSession.name
          });

          // Send warning mail
          await fetch(`${config.SUPABASE_URL}/rest/v1/mailbox`, {
            method: 'POST',
            headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              sender: 'إدارة الشات والرقابة',
              recipient: pDoc.username,
              type: 'system_warning',
              payload: {
                title: '🔇 تم كتمك في الشات العام',
                message: `تم حظر إرسالك للرسائل في الشات لمدة ${durationMinutes} دقيقة.\nالسبب: ${cleanReason}`,
                timestamp: ts
              },
              status: 'unread',
              created_at: ts
            })
          });
          break;
        }

        case 'unmute': {
          pState.mutedUntil = 0;
          pState.muteReason = '';
          pState.mutedBy = '';
          actionDesc = `رفع كتم الشات (${cleanReason})`;

          pState.moderatorNotes.unshift({
            timestamp: ts,
            action: 'unmute',
            reason: cleanReason,
            modName: request.modSession.name
          });
          break;
        }

        case 'flag': {
          pState.staffFlag = 'under_investigation';
          pState.underSuspicion = true;
          pState.flagReason = cleanReason;
          pState.flaggedBy = request.modSession.name;
          actionDesc = `وضع علامة "تحت المراقبة" (${cleanReason})`;

          pState.moderatorNotes.unshift({
            timestamp: ts,
            action: 'flag',
            reason: cleanReason,
            modName: request.modSession.name
          });
          break;
        }

        case 'unflag': {
          pState.staffFlag = null;
          pState.underSuspicion = false;
          pState.flagReason = '';
          pState.flaggedBy = '';
          actionDesc = `إزالة علامة المراقبة (${cleanReason})`;

          pState.moderatorNotes.unshift({
            timestamp: ts,
            action: 'unflag',
            reason: cleanReason,
            modName: request.modSession.name
          });
          break;
        }

        case 'warn': {
          actionDesc = `إرسال تحذير رسمي للاعب (${cleanReason})`;

          pState.moderatorNotes.unshift({
            timestamp: ts,
            action: 'warn',
            reason: cleanReason,
            modName: request.modSession.name
          });

          // Send official warning mail
          await fetch(`${config.SUPABASE_URL}/rest/v1/mailbox`, {
            method: 'POST',
            headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              sender: 'إدارة رأس المال الرسمية',
              recipient: pDoc.username,
              type: 'system_warning',
              payload: {
                title: '⚠️ تحذير رسمي من إدارة اللعبة',
                message: cleanReason,
                timestamp: ts
              },
              status: 'unread',
              created_at: ts
            })
          });
          break;
        }

        case 'ban': {
          pState.isBanned = true;
          pState.banReason = cleanReason;
          pState.bannedBy = request.modSession.name;
          pState.bannedAt = ts;
          actionDesc = `حظر الحساب نهائياً (${cleanReason})`;

          pState.moderatorNotes.unshift({
            timestamp: ts,
            action: 'ban',
            reason: cleanReason,
            modName: request.modSession.name
          });

          // Send official mailbox notification
          await fetch(`${config.SUPABASE_URL}/rest/v1/mailbox`, {
            method: 'POST',
            headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              sender: 'إدارة الرقابة والأمان',
              recipient: pDoc.username,
              type: 'system_warning',
              payload: {
                title: '⛔ تم حظر حسابك نهائياً',
                message: `تم إصدار قرار حظر نهائي لحسابك بسبب مخالفة القواعد.\nالسبب: ${cleanReason}`,
                timestamp: ts
              },
              status: 'unread',
              created_at: ts
            })
          });
          break;
        }

        case 'unban': {
          pState.isBanned = false;
          pState.banReason = '';
          pState.bannedBy = '';
          actionDesc = `فك الحظر عن الحساب (${cleanReason})`;

          pState.moderatorNotes.unshift({
            timestamp: ts,
            action: 'unban',
            reason: cleanReason,
            modName: request.modSession.name
          });

          // Send official mailbox notification
          await fetch(`${config.SUPABASE_URL}/rest/v1/mailbox`, {
            method: 'POST',
            headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              sender: 'إدارة الرقابة والأمان',
              recipient: pDoc.username,
              type: 'system_announcement',
              payload: {
                title: '🟢 تم فك الحظر عن حسابك',
                message: `تمت مراجعة حسابك ورفع قرار الحظر بنجاح.\nالبيان: ${cleanReason}`,
                timestamp: ts
              },
              status: 'unread',
              created_at: ts
            })
          });
          break;
        }

        case 'reset_limits': {
          const cairoDate = new Date(ts + (3 * 3600 * 1000));
          const todayStr = cairoDate.toISOString().split('T')[0];

          pState.dailyWork = { date: todayStr, shifts: 0, overtimeShifts: 0 };
          pState.dailyStockProfit = { date: todayStr, realizedProfit: 0 };
          pState.dailyBlackMarket = { date: todayStr, count: 0 };
          pState.dailyInvestments = { date: todayStr, count: 0 };
          pState.dailyLoans = { date: todayStr, count: 0 };
          pState.dailyCasinoNetProfit = 0;
          if (!pState.farm) pState.farm = {};
          pState.farm.dailyLiquidation = { date: todayStr, totalLiquidated: 0 };
          pState.workCooldownUntil = 0;
          pState.overtimeCooldownUntil = 0;
          pState.stockTradeCooldownUntil = 0;
          pState.limitsResetAt = ts;
          pState.adminModifiedTimestamp = ts + 600000;

          // Age outgoing wire transfers so rolling 24h limit is completely cleared (reset to 0)
          const twentyFiveHoursAgo = ts - (25 * 3600 * 1000);
          await fetch(`${config.SUPABASE_URL}/rest/v1/transfers?sender=ilike.${encodeURIComponent(target)}&created_at=gt.${ts - 86400000}`, {
            method: 'PATCH',
            headers: {
              'apikey': sKey,
              'Authorization': `Bearer ${sKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              created_at: twentyFiveHoursAgo
            })
          }).catch(err => {
            console.warn('[reset_limits] Failed to age outgoing transfers:', err.message);
          });

          actionDesc = `تصفير اللمت اليومي بالكامل (دورات العمل + البورصة + التحويلات) (${cleanReason})`;

          pState.moderatorNotes.unshift({
            timestamp: ts,
            action: 'reset_limits',
            reason: cleanReason,
            modName: request.modSession.name
          });

          // Send notification mailbox message
          await fetch(`${config.SUPABASE_URL}/rest/v1/mailbox`, {
            method: 'POST',
            headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              sender: 'إدارة الرقابة والأمان',
              recipient: pDoc.username,
              type: 'system_announcement',
              payload: {
                title: '🔄 تم تصفير حدودك اليومية',
                message: `تم تصفير عداد دورات العمل والبورصة وسقف التحويلات البنكية لحسابك بنجاح بواسطة الإدارة.\nالبيان: ${cleanReason}`,
                timestamp: ts
              },
              status: 'unread',
              created_at: ts
            })
          });
          break;
        }

        case 'add_bank': {
          const addAmount = Math.max(0, Math.floor(Number(request.body.amount || request.body.addBank || 0)));
          if (!addAmount || isNaN(addAmount) || addAmount <= 0) {
            return reply.status(400).send({ error: 'Bad Request', message: 'يرجى إدخال مبلغ صحيح لإيداعه في بنك اللاعب (أكبر من صفر).' });
          }

          const currentBank = Number(pDoc.bank !== undefined ? pDoc.bank : (pState.bank || 0));
          const updatedBank = currentBank + addAmount;
          const currentCash = Number(pDoc.cash !== undefined ? pDoc.cash : (pState.cash || 0));
          const updatedNetworth = currentCash + updatedBank;

          pDoc.bank = updatedBank;
          pState.bank = updatedBank;
          pState.netWorth = updatedNetworth;
          pState.adminModifiedTimestamp = ts;

          actionDesc = `إيداع مبلغ $${addAmount.toLocaleString('en-US')} في بنك اللاعب (${cleanReason})`;

          pState.moderatorNotes.unshift({
            timestamp: ts,
            action: 'add_bank',
            amount: addAmount,
            reason: cleanReason,
            modName: request.modSession.name
          });

          // Record in admin grants & topups history if available
          if (!Array.isArray(pState.adminGrants)) pState.adminGrants = [];
          pState.adminGrants.unshift({
            timestamp: ts,
            cash: 0,
            bank: addAmount,
            gold: 0,
            title: 'إيداع بنكي معتمد من الرقابة',
            note: cleanReason,
            status: 'معتمد',
            grantedBy: request.modSession.name
          });
          if (pState.adminGrants.length > 30) pState.adminGrants = pState.adminGrants.slice(0, 30);

          // Send notification mailbox message
          await fetch(`${config.SUPABASE_URL}/rest/v1/mailbox`, {
            method: 'POST',
            headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              sender: 'إدارة الرقابة والأمان',
              recipient: pDoc.username,
              type: 'system_announcement',
              payload: {
                title: '🏦 إيداع بنكي معتمد من الرقابة',
                message: `تم إيداع مبلغ $${addAmount.toLocaleString('en-US')} في حسابك البنكي بنجاح بواسطة إدارة الرقابة.\nالبيان: ${cleanReason}`,
                amount: addAmount,
                addedBank: addAmount,
                newBank: updatedBank,
                timestamp: ts
              },
              status: 'unread',
              created_at: ts
            })
          }).catch(err => {
            console.warn('[add_bank] Failed to send mailbox notification:', err.message);
          });
          break;
        }

        default:
          return reply.status(400).send({ error: 'Bad Request', message: `إجراء غير مدعوم: ${action}` });
      }

      // Cap moderator notes to 20
      if (pState.moderatorNotes.length > 20) {
        pState.moderatorNotes = pState.moderatorNotes.slice(0, 20);
      }

      // 2. Persist to Database
      const patchUrl = `${config.SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(target)}`;
      const patchBody = {
        jail_timer: updatedJailTimer,
        state: pState,
        admin_modified_timestamp: (action === 'reset_limits' ? ts + 600000 : ts)
      };
      if (action === 'ban') {
        patchBody.is_banned = true;
      } else if (action === 'unban') {
        patchBody.is_banned = false;
      } else if (action === 'add_bank') {
        patchBody.bank = pState.bank;
        patchBody.net_worth = pState.netWorth;
      }

      await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'apikey': sKey,
          'Authorization': `Bearer ${sKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(patchBody)
      });

      // 3. Sync with in-memory session if active
      if (sessionManager) {
        const session = sessionManager.getSession(targetLower);
        if (session) {
          session.state.underSuspicion = pState.underSuspicion;
          session.state.freezeUntil = pState.freezeUntil;
          session.state.freezeReason = pState.freezeReason;
          session.state.frozenBy = pState.frozenBy;
          session.state.mutedUntil = pState.mutedUntil;
          session.state.muteReason = pState.muteReason;
          session.state.mutedBy = pState.mutedBy;
          session.state.staffFlag = pState.staffFlag;
          session.state.flagReason = pState.flagReason;
          session.state.flaggedBy = pState.flaggedBy;
          session.state.jailTimer = updatedJailTimer;
          session.state.isBanned = pState.isBanned;
          session.state.banReason = pState.banReason;
          session.dirty = true;
          if (action === 'ban') {
            session.isBanned = true;
          } else if (action === 'unban') {
            session.isBanned = false;
          } else if (action === 'reset_limits') {
            session.state.dailyWork = { ...pState.dailyWork };
            session.state.dailyStockProfit = { ...pState.dailyStockProfit };
            session.state.dailyBlackMarket = { ...pState.dailyBlackMarket };
            session.state.dailyInvestments = { ...pState.dailyInvestments };
            session.state.dailyLoans = { ...pState.dailyLoans };
            session.state.dailyCasinoNetProfit = 0;
            if (!session.state.farm) session.state.farm = {};
            session.state.farm.dailyLiquidation = { ...pState.farm.dailyLiquidation };
            session.state.workCooldownUntil = 0;
            session.state.overtimeCooldownUntil = 0;
            session.state.stockTradeCooldownUntil = 0;
            session.state.limitsResetAt = ts;
          } else if (action === 'add_bank') {
            session.state.bank = pState.bank;
            session.state.netWorth = pState.netWorth;
            session.state.adminGrants = pState.adminGrants;
          }
          session.state.adminModifiedTimestamp = (action === 'reset_limits' ? ts + 600000 : ts);
          session.dirty = false;
        }
      }

      // 4. Record to staff audit logs
      await logStaffAudit(request.modSession, target, action, cleanReason, { durationMinutes, amount: request.body.amount || request.body.addBank });

      return reply.send({
        success: true,
        message: `تم تنفيذ الإجراء بنجاح: ${actionDesc}`,
        target: pDoc.username,
        action,
        newBank: pState.bank,
        timestamp: ts
      });
    } catch (err) {
      fastify.log.error(err, '[Moderator Action Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * GET /api/mod/audit-logs
   * Retrieves recent staff audit logs
   */
  fastify.get('/audit-logs', {
    preHandler: [requireModAuth]
  }, async (request, reply) => {
    try {
      const sKey = serviceKey();
      const gUrl = `${config.SUPABASE_URL}/rest/v1/globals?id=eq.staff_audit_logs&select=*`;
      const res = await fetch(gUrl, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });

      let logs = [];
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.logs)) {
          logs = rows[0].data.logs;
        }
      }

      return reply.send({ success: true, logs });
    } catch (err) {
      fastify.log.error(err, '[Moderator Audit Logs Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // =========================================================================
  // INVESTIGATION & STAFF-PLAYER LIVE CHAT SYSTEM (نظام محادثات التحقيق المباشر)
  // =========================================================================

  // ================= INVESTIGATION CHAT RESOLVED STATUS =================
  async function getResolvedChatThreads() {
    try {
      const sKey = serviceKey();
      const gUrl = `${config.SUPABASE_URL}/rest/v1/globals?id=eq.resolved_chat_threads&select=*`;
      const res = await fetch(gUrl, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0].data && typeof rows[0].data.threads === 'object') {
          return rows[0].data.threads || {};
        }
      }
    } catch (e) {
      fastify.log.warn('[Resolved Threads Fetch Warning]: ' + e.message);
    }
    return {};
  }

  async function saveResolvedChatThreads(threadsMapObj) {
    const sKey = serviceKey();
    const ts = Date.now();
    const saveRes = await fetch(`${config.SUPABASE_URL}/rest/v1/globals`, {
      method: 'POST',
      headers: {
        'apikey': sKey,
        'Authorization': `Bearer ${sKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: 'resolved_chat_threads',
        data: { threads: threadsMapObj, lastUpdated: ts },
        updated_at: ts
      })
    });
    if (!saveRes.ok) {
      const errTxt = await saveRes.text();
      fastify.log.warn('[Resolved Threads Save Error]: ' + errTxt);
    }
  }

  /**
   * GET /api/mod/chat/threads
   * Lists all players who have active investigation chats with resolution status
   */
  fastify.get('/chat/threads', {
    preHandler: [requireModAuth]
  }, async (request, reply) => {
    try {
      const sKey = serviceKey();
      const qUrl = `${config.SUPABASE_URL}/rest/v1/mailbox?type=eq.investigation_chat&select=*&order=created_at.desc&limit=150`;
      const res = await fetch(qUrl, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      if (!res.ok) throw new Error('Failed to fetch chat threads');
      const rows = await res.json();
      
      const resolvedMap = await getResolvedChatThreads();

      const threadsMap = new Map();
      (Array.isArray(rows) ? rows : []).forEach(r => {
        const player = (r.recipient === 'MOD_STAFF_CHANNEL' || r.recipient?.startsWith('MOD-') || r.recipient?.startsWith('المحقق'))
          ? r.sender
          : r.recipient;
        if (!player || player === 'MOD_STAFF_CHANNEL') return;

        const pKey = player.toLowerCase();
        if (!threadsMap.has(pKey)) {
          const msgTimestamp = Number(r.created_at || (r.payload && r.payload.timestamp) || Date.now());
          const resolvedInfo = resolvedMap[pKey];
          // Thread is resolved ONLY IF marked as resolved AND resolvedAt >= msgTimestamp
          // If the player sent a newer message (msgTimestamp > resolvedAt), it automatically becomes active!
          const isResolved = !!(resolvedInfo && resolvedInfo.resolvedAt && (resolvedInfo.resolvedAt >= msgTimestamp));

          threadsMap.set(pKey, {
            username: player,
            lastMessage: (r.payload && r.payload.message) || (r.payload && r.payload.imageUrl ? '📷 صورة مرفقة' : ''),
            lastSender: r.sender,
            lastTimestamp: msgTimestamp,
            unread: r.status === 'unread' && r.recipient === 'MOD_STAFF_CHANNEL',
            isResolved: isResolved,
            resolvedAt: resolvedInfo?.resolvedAt || null,
            resolvedBy: resolvedInfo?.resolvedBy || null
          });
        }
      });

      const allThreads = Array.from(threadsMap.values());
      const activeCount = allThreads.filter(t => !t.isResolved).length;
      const archivedCount = allThreads.filter(t => t.isResolved).length;

      return reply.send({
        success: true,
        threads: allThreads,
        activeCount,
        archivedCount
      });
    } catch (err) {
      fastify.log.error(err, '[Chat Threads Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * PATCH /api/mod/chat/threads/:username/toggle-resolved
   * Toggles whether an investigation thread is marked as solved (archived) or reopened
   */
  fastify.patch('/chat/threads/:username/toggle-resolved', {
    preHandler: [requireModAuth]
  }, async (request, reply) => {
    const { username } = request.params || {};
    const { resolved } = request.body || {};
    if (!username) return reply.status(400).send({ error: 'Username is required' });

    try {
      const cleanU = username.trim().toLowerCase();
      const resolvedMap = await getResolvedChatThreads();

      const shouldResolve = (resolved !== undefined) ? Boolean(resolved) : !resolvedMap[cleanU];

      if (shouldResolve) {
        resolvedMap[cleanU] = {
          resolvedAt: Date.now(),
          resolvedBy: request.modSession?.name || 'مراقب معتمد'
        };
      } else {
        delete resolvedMap[cleanU];
      }

      await saveResolvedChatThreads(resolvedMap);

      await logStaffAudit(
        request.modSession || { id: 'mod', name: 'مراقب' },
        username,
        shouldResolve ? 'resolve_chat_thread' : 'reopen_chat_thread',
        shouldResolve ? `تعليم محادثة اللاعب كـ (تم الحل) ونقلها للأرشيف` : `إعادة فتح محادثة اللاعب ونقلها للمحادثات النشطة`
      );

      return reply.send({
        success: true,
        username,
        isResolved: shouldResolve,
        message: shouldResolve ? 'تم تعليم المشكلة كمحلولة ونقل المحادثة للأرشيف بنجاح' : 'تمت إعادة فتح المحادثة بنجاح'
      });
    } catch (err) {
      fastify.log.error(err, '[Toggle Thread Resolved Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * GET /api/mod/chat/messages/:username
   * Retrieves full conversation between staff and a player
   */
  fastify.get('/chat/messages/:username', {
    preHandler: [requireModAuth]
  }, async (request, reply) => {
    const { username } = request.params || {};
    if (!username) return reply.status(400).send({ error: 'Username is required' });

    try {
      const sKey = serviceKey();
      const cleanU = encodeURIComponent(username.trim());
      const qUrl = `${config.SUPABASE_URL}/rest/v1/mailbox?type=eq.investigation_chat&or=(sender.ilike.${cleanU},recipient.ilike.${cleanU})&order=created_at.asc&limit=150`;
      const res = await fetch(qUrl, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      if (!res.ok) throw new Error('Failed to fetch messages');
      const rows = await res.json();

      return reply.send({
        success: true,
        username,
        messages: Array.isArray(rows) ? rows : []
      });
    } catch (err) {
      fastify.log.error(err, '[Chat Messages Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * POST /api/mod/chat/upload-image
   * Secure upload endpoint for Moderator and Player private chat images.
   * Strictly enforces raster image formats (PNG, JPEG, WebP, GIF) via Magic Bytes.
   * STRICTLY REJECTS SVG to prevent XSS and script injection attacks.
   */
  fastify.post('/chat/upload-image', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    // 1. Authenticate either Moderator or Player
    let uploaderName = '';
    let isMod = false;

    const authHeader = request.headers['authorization'] || request.headers['x-mod-token'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();

    if (token) {
      if (activeModSessions.has(token) || safeCompare(token, config.ADMIN_KEY_SHA256) || token.startsWith(MOD_TOKEN_PREFIX)) {
        const session = activeModSessions.get(token);
        uploaderName = session ? session.name : 'المحقق';
        isMod = true;
      }
    }

    if (!isMod) {
      const { username, playerToken } = request.body || {};
      const effToken = token || playerToken;
      const cleanUser = String(username || '').trim();
      if (!cleanUser) {
        return reply.status(401).send({ error: 'يجب تسجيل الدخول أو إثبات الهوية لرفع الصور.' });
      }
      uploaderName = cleanUser;
    }

    const { imageBase64 } = request.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return reply.code(400).send({ error: 'لم يتم إرسال أي صورة (Base64 image is required).' });
    }

    // Guard against oversized raw payloads (Max ~3.5MB base64)
    if (imageBase64.length > 4500000) {
      return reply.code(413).send({ error: 'حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 3 ميجابايت.' });
    }

    // Immediate check: strictly disallow SVG in Data URL header
    const lowerRaw = imageBase64.substring(0, 120).toLowerCase();
    if (lowerRaw.includes('image/svg') || lowerRaw.includes('svg+xml') || lowerRaw.includes('.svg')) {
      return reply.code(400).send({ error: '❌ غير مسموح برفع ملفات SVG لمنع الاختراق وحماية النظام! يُسمح فقط بصور (PNG, JPEG, WebP, GIF).' });
    }

    // Strip Data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '');
    let imageBuffer;
    try {
      imageBuffer = Buffer.from(cleanBase64, 'base64');
    } catch (e) {
      return reply.code(400).send({ error: 'تنسيق ترميز الصورة غير صالح (Invalid Base64).' });
    }

    // Validate binary magic bytes and deep content safety
    const validation = validateRasterImage(imageBuffer);
    if (!validation.valid) {
      return reply.code(400).send({ error: validation.error });
    }

    // Generate cryptographic unguessable filename
    const safeHash = crypto.createHash('sha256')
      .update(uploaderName + '_' + Date.now() + '_' + crypto.randomBytes(8).toString('hex'))
      .digest('hex')
      .substring(0, 16);
    const safeUName = encodeURIComponent(uploaderName).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `chat_${isMod ? 'mod' : 'usr'}_${safeUName}_${safeHash}${validation.ext}`;
    const targetPath = path.join(CHAT_IMAGES_DIR, filename);

    fs.writeFileSync(targetPath, imageBuffer);

    const imageUrl = `/api/mod/chat/image/${filename}`;

    return reply.send({
      success: true,
      imageUrl,
      filename,
      mimeType: validation.mimeType,
      message: 'تم فحص الصورة واعتمادها بنجاح 📸'
    });
  });

  /**
   * GET /api/mod/chat/image/:filename
   * Stream stored chat images safely with strict security headers
   */
  fastify.get('/chat/image/:filename', async (request, reply) => {
    const { filename } = request.params || {};
    if (!filename || typeof filename !== 'string') {
      return reply.code(400).send({ error: 'اسم الملف غير صالح' });
    }

    const cleanFilename = path.basename(filename);
    const filePath = path.join(CHAT_IMAGES_DIR, cleanFilename);

    if (!fs.existsSync(filePath)) {
      return reply.code(404).send({ error: 'الصورة غير موجودة' });
    }

    const ext = path.extname(cleanFilename).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.gif') mimeType = 'image/gif';
    else {
      return reply.code(403).send({ error: 'نوع الملف غير مصرح به' });
    }

    reply.header('Content-Type', mimeType);
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');

    const stream = fs.createReadStream(filePath);
    return reply.send(stream);
  });

  /**
   * POST /api/mod/chat/send
   * Moderator sends a message (or image) to the player
   */
  fastify.post('/chat/send', {
    preHandler: [requireModAuth]
  }, async (request, reply) => {
    const { targetUser, targetUsername, message, imageUrl } = request.body || {};
    const recipient = (targetUser || targetUsername || '').trim();
    const cleanMsg = (message || '').trim().substring(0, 500);
    const cleanImg = (typeof imageUrl === 'string') ? imageUrl.trim() : null;

    if (!recipient || (!cleanMsg && !cleanImg)) {
      return reply.status(400).send({ error: 'targetUser and message or imageUrl are required' });
    }

    // Strict validation: Reject any SVG image URLs
    if (cleanImg && (cleanImg.toLowerCase().includes('.svg') || cleanImg.toLowerCase().includes('image/svg'))) {
      return reply.status(400).send({ error: 'غير مسموح بإرسال صور بصيغة SVG لأسباب أمنية.' });
    }

    try {
      const sKey = serviceKey();
      const ts = Date.now();

      const res = await fetch(`${config.SUPABASE_URL}/rest/v1/mailbox`, {
        method: 'POST',
        headers: {
          'apikey': sKey,
          'Authorization': `Bearer ${sKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          sender: request.modSession.name,
          recipient: recipient,
          type: 'investigation_chat',
          payload: {
            message: cleanMsg,
            imageUrl: cleanImg || null,
            senderName: request.modSession.name,
            isMod: true,
            timestamp: ts
          },
          status: 'unread',
          created_at: ts
        })
      });

      if (!res.ok) throw new Error('Failed to send message');
      const data = await res.json();

      return reply.send({
        success: true,
        message: 'تم إرسال الرسالة للاعب بنجاح',
        chatMessage: Array.isArray(data) ? data[0] : data
      });
    } catch (err) {
      fastify.log.error(err, '[Send Chat Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * POST /api/mod/chat/player-send
   * Player sends message (or image) to the investigation channel
   */
  fastify.post('/chat/player-send', {
    config: {
      rateLimit: {
        max: 25,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const { username, message, imageUrl } = request.body || {};
    const cleanU = String(username || '').trim();
    const cleanMsg = (message || '').trim().substring(0, 500);
    const cleanImg = (typeof imageUrl === 'string') ? imageUrl.trim() : null;

    if (!cleanU || (!cleanMsg && !cleanImg)) {
      return reply.status(400).send({ error: 'username and message or imageUrl are required' });
    }

    // Strict validation: Reject any SVG image URLs
    if (cleanImg && (cleanImg.toLowerCase().includes('.svg') || cleanImg.toLowerCase().includes('image/svg'))) {
      return reply.status(400).send({ error: 'غير مسموح بإرسال صور بصيغة SVG لأسباب أمنية.' });
    }

    try {
      const sKey = serviceKey();
      const ts = Date.now();

      const res = await fetch(`${config.SUPABASE_URL}/rest/v1/mailbox`, {
        method: 'POST',
        headers: {
          'apikey': sKey,
          'Authorization': `Bearer ${sKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          sender: cleanU,
          recipient: 'MOD_STAFF_CHANNEL',
          type: 'investigation_chat',
          payload: {
            message: cleanMsg,
            imageUrl: cleanImg || null,
            senderName: cleanU,
            isMod: false,
            timestamp: ts
          },
          status: 'unread',
          created_at: ts
        })
      });

      if (!res.ok) throw new Error('Failed to submit message');
      const data = await res.json();

      // Auto-unarchive: Clean up any resolved status for this player on new message
      try {
        const resolvedMap = await getResolvedChatThreads();
        const pKey = cleanU.toLowerCase();
        if (resolvedMap[pKey]) {
          delete resolvedMap[pKey];
          await saveResolvedChatThreads(resolvedMap);
        }
      } catch (err) {
        fastify.log.warn('[Auto-unarchive Error]: ' + err.message);
      }

      return reply.send({
        success: true,
        message: 'تم إرسال ردك للمحقق بنجاح',
        chatMessage: Array.isArray(data) ? data[0] : data
      });
    } catch (err) {
      fastify.log.error(err, '[Player Send Chat Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * GET /api/mod/chat/player-unread/:username
   * Check unread moderator messages for the player
   */
  fastify.get('/chat/player-unread/:username', async (request, reply) => {
    const { username } = request.params || {};
    if (!username) return reply.status(400).send({ error: 'Username is required' });

    try {
      const sKey = serviceKey();
      const cleanU = encodeURIComponent(username.trim());
      const qUrl = `${config.SUPABASE_URL}/rest/v1/mailbox?type=eq.investigation_chat&recipient=ilike.${cleanU}&status=eq.unread&select=id,sender,payload,created_at&order=created_at.desc&limit=5`;
      const res = await fetch(qUrl, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      if (!res.ok) throw new Error('Failed to fetch unread messages');
      const rows = await res.json();
      const unreadCount = Array.isArray(rows) ? rows.length : 0;
      return reply.send({
        success: true,
        unreadCount,
        latestMessage: unreadCount > 0 ? rows[0] : null
      });
    } catch (err) {
      return reply.status(500).send({ error: err.message, unreadCount: 0 });
    }
  });

  /**
   * GET /api/mod/chat/player-history/:username
   * Player retrieves their own investigation messages (and marks unread moderator messages as read)
   */
  fastify.get('/chat/player-history/:username', async (request, reply) => {
    const { username } = request.params || {};
    if (!username) return reply.status(400).send({ error: 'Username is required' });

    try {
      const sKey = serviceKey();
      const cleanU = encodeURIComponent(username.trim());
      const qUrl = `${config.SUPABASE_URL}/rest/v1/mailbox?type=eq.investigation_chat&or=(sender.ilike.${cleanU},recipient.ilike.${cleanU})&order=created_at.asc&limit=100`;
      const res = await fetch(qUrl, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      if (!res.ok) throw new Error('Failed to fetch player messages');
      const rows = await res.json();

      // Mark unread messages sent to this player as read
      try {
        await fetch(`${config.SUPABASE_URL}/rest/v1/mailbox?type=eq.investigation_chat&recipient=ilike.${cleanU}&status=eq.unread`, {
          method: 'PATCH',
          headers: {
            'apikey': sKey,
            'Authorization': `Bearer ${sKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ status: 'read' })
        });
      } catch (_) {}

      return reply.send({
        success: true,
        username,
        messages: Array.isArray(rows) ? rows : []
      });
    } catch (err) {
      fastify.log.error(err, '[Player Chat History Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * GET /api/moderator/global-chat
   * Fetches recent 100 global public chat messages so staff can monitor inquiries and problems
   */
  fastify.get('/global-chat', { preHandler: [requireModAuth] }, async (request, reply) => {
    try {
      const sKey = serviceKey();
      const res = await fetch(`${config.SUPABASE_URL}/rest/v1/globals?id=eq.chat_feed&select=data,updated_at`, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      let messages = [];
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.messages)) {
          messages = rows[0].data.messages;
        }
      }
      return reply.send({
        success: true,
        messages: messages.slice(-100)
      });
    } catch (err) {
      fastify.log.error(err, '[Moderator Global Chat Fetch Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * POST /api/moderator/global-chat/send
   * Allows authenticated investigators to broadcast verified official replies & answers in global chat
   */
  fastify.post('/global-chat/send', { preHandler: [requireModAuth] }, async (request, reply) => {
    const { message, replyTo } = request.body || {};
    if (!message || !message.trim()) {
      return reply.status(400).send({ error: 'Bad Request', message: 'نص الرسالة مطلوب.' });
    }

    const cleanMsg = message.trim().substring(0, 500);
    const ts = Date.now();
    const sKey = serviceKey();

    try {
      // 1. Fetch current chat_feed
      const res = await fetch(`${config.SUPABASE_URL}/rest/v1/globals?id=eq.chat_feed&select=data,updated_at`, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      let currentFeed = [];
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.messages)) {
          currentFeed = rows[0].data.messages;
        }
      }

      // 2. Build verified staff message
      const modMsg = {
        id: 'msg_mod_' + ts + '_' + Math.random().toString(36).substring(2, 6),
        sender: request.modSession.name || 'المحقق',
        senderTitle: 'مراقب معتمد 🛡️',
        message: cleanMsg,
        facebookVerified: true,
        isVerified: true,
        customBadge: '🛡️ مراقب',
        chatGlow: 'cyber_rainbow',
        seasonBadge: 'badge_official_staff',
        timestamp: ts
      };

      currentFeed.push(modMsg);
      currentFeed.sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0));
      const finalFeed = currentFeed.length > 100 ? currentFeed.slice(currentFeed.length - 100) : currentFeed;

      // 3. Upsert into globals table
      const saveRes = await fetch(`${config.SUPABASE_URL}/rest/v1/globals`, {
        method: 'POST',
        headers: {
          'apikey': sKey,
          'Authorization': `Bearer ${sKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: 'chat_feed',
          data: { messages: finalFeed },
          updated_at: ts
        })
      });

      if (!saveRes.ok) {
        const errText = await saveRes.text();
        throw new Error(`Failed to save chat message: ${errText}`);
      }

      // 4. Record in audit logs
      await logStaffAudit(
        request.modSession,
        replyTo || 'global_chat',
        'send_global_chat_message',
        `إرسال رد رسمي في الشات العام: "${cleanMsg.substring(0, 60)}..."`,
        { messageLength: cleanMsg.length, replyTo: replyTo || null }
      );

      return reply.send({
        success: true,
        message: 'تم إرسال رسالتك الرسمية في الشات العام بنجاح.',
        chatMessage: modMsg,
        messages: finalFeed
      });
    } catch (err) {
      fastify.log.error(err, '[Moderator Global Chat Send Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });
  // ================= SHARED STAFF TASKS (لوحة المهام المشتركة) =================

  /**
   * Helper to retrieve current shared staff tasks
   */
  async function getSharedStaffTasks() {
    const sKey = serviceKey();
    const gUrl = `${config.SUPABASE_URL}/rest/v1/globals?id=eq.staff_shared_tasks&select=*`;
    const res = await fetch(gUrl, {
      headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
    });
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.tasks)) {
        return rows[0].data.tasks;
      }
    }
    return [];
  }

  /**
   * Helper to persist shared staff tasks
   */
  async function saveSharedStaffTasks(tasks) {
    const sKey = serviceKey();
    const ts = Date.now();
    const saveRes = await fetch(`${config.SUPABASE_URL}/rest/v1/globals`, {
      method: 'POST',
      headers: {
        'apikey': sKey,
        'Authorization': `Bearer ${sKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: 'staff_shared_tasks',
        data: { tasks, lastUpdated: ts },
        updated_at: ts
      })
    });
    if (!saveRes.ok) {
      const errTxt = await saveRes.text();
      throw new Error(`Failed to save staff tasks: ${errTxt}`);
    }
    return tasks;
  }

  /**
   * GET /api/mod/tasks
   * Retrieves all shared investigation tasks for moderators
   */
  fastify.get('/tasks', { preHandler: requireModAuth }, async (request, reply) => {
    try {
      const tasks = await getSharedStaffTasks();
      const pendingCount = tasks.filter(t => !t.completed).length;
      const completedCount = tasks.filter(t => t.completed).length;

      return reply.send({
        success: true,
        tasks,
        pendingCount,
        completedCount,
        totalCount: tasks.length
      });
    } catch (err) {
      fastify.log.error(err, '[Get Staff Tasks Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * POST /api/mod/tasks
   * Adds a new shared investigation task
   */
  fastify.post('/tasks', { preHandler: requireModAuth }, async (request, reply) => {
    try {
      const { text, priority, targetPlayer } = request.body || {};
      const cleanText = String(text || '').trim();
      if (!cleanText) {
        return reply.status(400).send({ error: 'Bad Request', message: 'يرجى كتابة نص أو تفاصيل المهمة.' });
      }

      const tasks = await getSharedStaffTasks();
      const ts = Date.now();
      const newTask = {
        id: 'task_' + ts + '_' + crypto.randomBytes(3).toString('hex'),
        text: cleanText,
        priority: ['urgent', 'high', 'normal', 'low'].includes(priority) ? priority : 'normal',
        targetPlayer: targetPlayer ? String(targetPlayer).trim() : null,
        createdBy: request.modSession.name || 'محقق',
        createdAt: ts,
        completed: false,
        completedBy: null,
        completedAt: null
      };

      tasks.unshift(newTask);
      // Cap at 200 tasks
      const capped = tasks.slice(0, 200);
      await saveSharedStaffTasks(capped);

      await logStaffAudit(
        request.modSession,
        newTask.targetPlayer || 'staff_tasks',
        'create_staff_task',
        `إضافة مهمة تحقيق مشتركة: "${cleanText.substring(0, 50)}..."`,
        { taskId: newTask.id, priority: newTask.priority }
      );

      const pendingCount = capped.filter(t => !t.completed).length;
      const completedCount = capped.filter(t => t.completed).length;

      return reply.send({
        success: true,
        message: 'تمت إضافة المهمة للوحة المشتركة بنجاح.',
        task: newTask,
        tasks: capped,
        pendingCount,
        completedCount
      });
    } catch (err) {
      fastify.log.error(err, '[Create Staff Task Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * PATCH /api/mod/tasks/:taskId/toggle
   * Toggles task completion status (Mark as Done / Reopen)
   */
  fastify.patch('/tasks/:taskId/toggle', { preHandler: requireModAuth }, async (request, reply) => {
    try {
      const { taskId } = request.params;
      const tasks = await getSharedStaffTasks();
      const taskIndex = tasks.findIndex(t => t.id === taskId);

      if (taskIndex === -1) {
        return reply.status(404).send({ error: 'Not Found', message: 'المهمة غير موجودة.' });
      }

      const task = tasks[taskIndex];
      const newStatus = !task.completed;
      task.completed = newStatus;

      if (newStatus) {
        task.completedBy = request.modSession.name || 'محقق';
        task.completedAt = Date.now();
      } else {
        task.completedBy = null;
        task.completedAt = null;
      }

      await saveSharedStaffTasks(tasks);

      await logStaffAudit(
        request.modSession,
        task.targetPlayer || 'staff_tasks',
        'toggle_staff_task',
        newStatus ? `إنجاز مهمة تحقيق (Mark as Done): "${task.text.substring(0, 50)}..."` : `إعادة فتح مهمة تحقيق: "${task.text.substring(0, 50)}..."`,
        { taskId: task.id, completed: newStatus }
      );

      const pendingCount = tasks.filter(t => !t.completed).length;
      const completedCount = tasks.filter(t => t.completed).length;

      return reply.send({
        success: true,
        message: newStatus ? 'تم تعليم المهمة كمنجزة بنجاح ✅' : 'تمت إعادة فتح المهمة 🔄',
        task,
        tasks,
        pendingCount,
        completedCount
      });
    } catch (err) {
      fastify.log.error(err, '[Toggle Staff Task Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * DELETE /api/mod/tasks/:taskId
   * Deletes a specific task or clears all completed tasks
   */
  fastify.delete('/tasks/:taskId', { preHandler: requireModAuth }, async (request, reply) => {
    try {
      const { taskId } = request.params;
      let tasks = await getSharedStaffTasks();

      if (taskId === 'clear-completed') {
        tasks = tasks.filter(t => !t.completed);
      } else {
        tasks = tasks.filter(t => t.id !== taskId);
      }

      await saveSharedStaffTasks(tasks);

      const pendingCount = tasks.filter(t => !t.completed).length;
      const completedCount = tasks.filter(t => t.completed).length;

      return reply.send({
        success: true,
        message: 'تم حذف المهمة بنجاح.',
        tasks,
        pendingCount,
        completedCount
      });
    } catch (err) {
      fastify.log.error(err, '[Delete Staff Task Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });
}

module.exports = moderatorRoutes;

