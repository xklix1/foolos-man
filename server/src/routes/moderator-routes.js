/**
 * Ras ALmal Tycoon — Authoritative Moderator & Staff API Routes
 * Dedicated endpoints for Staff Assistants to inspect players, monitor wealth, and take controlled moderation actions.
 */

const crypto = require('crypto');
const config = require('../config/env');

// Default Moderator Key configuration (Individual access keys)
const DEFAULT_MODERATOR_KEYS = {
  'MOD-ALPHA-9821-X1': {
    id: 'mod_assistant_1',
    name: 'المساعد 1 (Alpha)',
    role: 'moderator',
    active: true
  },
  'MOD-BRAVO-4412-X2': {
    id: 'mod_assistant_2',
    name: 'المساعد 2 (Bravo)',
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

// Active moderator sessions: token -> { id, name, role, loginAt, lastSeen }
const activeModSessions = new Map();

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
   * Auth Middleware: Verify Moderator Token from Header
   */
  const requireModAuth = async (request, reply) => {
    const authHeader = request.headers['authorization'] || request.headers['x-mod-token'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();

    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'يرجى تسجيل الدخول بمفتاح المساعد أولاً.' });
    }

    // Check if token matches active session
    const session = activeModSessions.get(token);
    if (session) {
      session.lastSeen = Date.now();
      request.modSession = session;
      return;
    }

    // Check if token matches Master Admin Key SHA256 directly
    if (safeCompare(token, config.ADMIN_KEY_SHA256)) {
      request.modSession = {
        id: 'super_admin_root',
        name: 'المدير العام (Khaled)',
        role: 'super_admin',
        isSuperAdmin: true
      };
      return;
    }

    return reply.status(401).send({ error: 'Unauthorized', message: 'جلسة المساعد غير صالحة أو منتهية الصلاحية.' });
  };

  /**
   * POST /api/mod/auth/login
   * Authenticates Moderator Key and issues secure session token
   */
  fastify.post('/auth/login', {
    config: { rateLimit: { max: 15, timeWindow: 60000 } }
  }, async (request, reply) => {
    const { modKey } = request.body || {};
    if (!modKey || typeof modKey !== 'string') {
      return reply.status(400).send({ error: 'Bad Request', message: 'يرجى إدخال مفتاح المساعد (Moderator Key).' });
    }

    const trimmedKey = modKey.trim();

    // 1. Check Master Admin Key SHA256
    const hashedInput = crypto.createHash('sha256').update(trimmedKey).digest('hex');
    if (safeCompare(trimmedKey, config.ADMIN_KEY_SHA256) || safeCompare(hashedInput, config.ADMIN_KEY_SHA256)) {
      const token = 'mod_sess_' + crypto.randomBytes(24).toString('hex');
      const modInfo = {
        id: 'super_admin_root',
        name: 'المدير العام (Khaled)',
        role: 'super_admin',
        isSuperAdmin: true,
        loginAt: Date.now(),
        lastSeen: Date.now()
      };
      activeModSessions.set(token, modInfo);
      return reply.send({ success: true, token, modInfo });
    }

    // 2. Check dynamic or default moderator keys
    const availableKeys = await getDynamicModKeys();
    const matched = availableKeys[trimmedKey];

    if (matched && matched.active !== false) {
      const token = 'mod_sess_' + crypto.randomBytes(24).toString('hex');
      const modInfo = {
        id: matched.id || 'assistant',
        name: matched.name || 'مساعد معتمد',
        role: matched.role || 'moderator',
        isSuperAdmin: false,
        loginAt: Date.now(),
        lastSeen: Date.now()
      };
      activeModSessions.set(token, modInfo);

      // Log login event
      logStaffAudit(modInfo, 'SYSTEM', 'staff_login', 'تسجيل دخول إلى لوحة الرقابة والتفتيش');

      return reply.send({ success: true, token, modInfo });
    }

    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'مفتاح المساعد غير صحيح أو تم إيقافه.'
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
      timestamp: Date.now()
    });
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

      // 1. Fetch count of total players
      const countRes = await fetch(`${config.SUPABASE_URL}/rest/v1/players?select=username`, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}`, 'Range': '0-0', 'Prefer': 'count=exact' }
      });
      const totalPlayersCount = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '0', 10);

      // 2. Fetch top 30 wealthiest players for wealth analysis
      const topWealthRes = await fetch(`${config.SUPABASE_URL}/rest/v1/players?select=username,cash,bank,net_worth,gold,title,is_banned,jail_timer,last_seen,state&order=net_worth.desc&limit=30`, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      const topRows = topWealthRes.ok ? await topWealthRes.json() : [];

      // 3. Count in-memory active sessions
      let activeOnlineCount = 0;
      const now = Date.now();
      if (sessionManager && sessionManager.sessions) {
        for (const [_, sess] of sessionManager.sessions.entries()) {
          if (sess && sess.lastActivity && (now - sess.lastActivity < 10 * 60 * 1000)) {
            activeOnlineCount++;
          }
        }
      }

      // 4. Identify suspicious flags / alerts
      const suspiciousAlerts = [];
      let flaggedCount = 0;
      let frozenCount = 0;
      let mutedCount = 0;

      for (const p of topRows) {
        const state = (typeof p.state === 'object' && p.state) ? p.state : {};
        const isFrozen = (state.freezeUntil && state.freezeUntil > now) || Number(p.jail_timer || 0) > 0;
        const isMuted = state.mutedUntil && state.mutedUntil > now;
        const staffFlag = state.staffFlag;

        if (staffFlag) flaggedCount++;
        if (isFrozen) frozenCount++;
        if (isMuted) mutedCount++;

        // Auto wealth threshold alert (> 5 Billion)
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

        if (isFrozen) {
          suspiciousAlerts.push({
            type: 'frozen',
            severity: 'medium',
            username: p.username,
            title: p.title || 'لاعب',
            netWorth: netWorth,
            message: `الحساب مجمد حالياً (متبقي ${Math.max(1, Math.round((Number(state.freezeUntil || 0) - now) / 60000))} دقيقة)`
          });
        }
      }

      // 5. Fetch recent 10 transfers for rapid movement monitoring
      const transfersRes = await fetch(`${config.SUPABASE_URL}/rest/v1/transfers?order=created_at.desc&limit=15`, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      const recentTransfers = transfersRes.ok ? await transfersRes.json() : [];

      return reply.send({
        success: true,
        stats: {
          totalPlayers: totalPlayersCount || topRows.length,
          onlinePlayers: Math.max(activeOnlineCount, 1),
          flaggedPlayers: flaggedCount,
          frozenPlayers: frozenCount,
          mutedPlayers: mutedCount
        },
        suspiciousAlerts: suspiciousAlerts.slice(0, 10),
        recentTransfers: recentTransfers || []
      });
    } catch (err) {
      fastify.log.error(err, '[Moderator Overview Error]');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * GET /api/mod/search
   * Fast multi-filter search for players
   */
  fastify.get('/search', {
    preHandler: [requireModAuth]
  }, async (request, reply) => {
    const { q = '', filter = 'all', limit = 25 } = request.query || {};
    const cleanQ = String(q).trim();
    const sKey = serviceKey();

    try {
      let queryParams = `select=username,cash,bank,net_worth,gold,title,job_id,is_banned,jail_timer,last_seen,state&limit=${Math.min(50, Number(limit) || 25)}`;

      if (cleanQ) {
        queryParams += `&username=ilike.*${encodeURIComponent(cleanQ)}*`;
      } else {
        queryParams += `&order=net_worth.desc`;
      }

      const res = await fetch(`${config.SUPABASE_URL}/rest/v1/players?${queryParams}`, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });

      if (!res.ok) {
        return reply.status(500).send({ error: 'Failed to query players', details: await res.text() });
      }

      let rows = await res.json();
      if (!Array.isArray(rows)) rows = [];

      const now = Date.now();

      // Transform rows into clean player summary cards
      let results = rows.map(r => {
        const state = (typeof r.state === 'object' && r.state) ? r.state : {};
        const isOnline = sessionManager && sessionManager.sessions.has(String(r.username).toLowerCase())
          ? (now - (sessionManager.sessions.get(String(r.username).toLowerCase()).lastActivity || 0) < 10 * 60 * 1000)
          : false;

        const isFrozen = Boolean((state.freezeUntil && state.freezeUntil > now) || Number(r.jail_timer || 0) > 0);
        const isMuted = Boolean(state.mutedUntil && state.mutedUntil > now);

        return {
          username: r.username,
          title: r.title || 'عامل مبتدئ',
          jobId: r.job_id || 'worker',
          cash: Number(r.cash || 0),
          bank: Number(r.bank || 0),
          netWorth: Number(r.net_worth || 0),
          gold: Number(r.gold || 0),
          lastSeen: Number(r.last_seen || 0),
          isOnline,
          isBanned: Boolean(r.is_banned),
          isFrozen,
          isMuted,
          freezeUntil: Number(state.freezeUntil || 0),
          mutedUntil: Number(state.mutedUntil || 0),
          staffFlag: state.staffFlag || null
        };
      });

      // Apply filter
      if (filter === 'flagged') {
        results = results.filter(p => Boolean(p.staffFlag));
      } else if (filter === 'frozen') {
        results = results.filter(p => p.isFrozen);
      } else if (filter === 'muted') {
        results = results.filter(p => p.isMuted);
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
      const state = (typeof pDoc.state === 'object' && pDoc.state) ? pDoc.state : {};
      const now = Date.now();

      // Check if player is online in memory
      const uKey = u.toLowerCase();
      const inMemSession = sessionManager ? sessionManager.getSession(uKey) : null;
      const isOnline = inMemSession ? (now - inMemSession.lastActivity < 10 * 60 * 1000) : false;

      // 2. Fetch P2P transfers related to this player (sent & received)
      const transfersRes = await fetch(`${config.SUPABASE_URL}/rest/v1/transfers?or=(sender.ilike.${encodeURIComponent(u)},recipient.ilike.${encodeURIComponent(u)})&order=created_at.desc&limit=25`, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      const playerTransfers = transfersRes.ok ? await transfersRes.json() : [];

      // 3. Format complete detailed profile
      const isFrozen = Boolean((state.freezeUntil && state.freezeUntil > now) || Number(pDoc.jail_timer || 0) > 0);
      const isMuted = Boolean(state.mutedUntil && state.mutedUntil > now);

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

        // Real Estate, Businesses & Assets
        businesses: state.businesses || {},
        industry: state.industry || {},
        ownedCars: state.ownedCars || {},
        activeCar: state.activeCar || null,
        assets: state.assets || {},

        // Stocks & Investments
        stocks: state.stocks || {},
        crypto: state.crypto || {},
        investments: state.investments || [],
        dailyStockProfit: state.dailyStockProfit || null,

        // Aviation & Airport
        airport: state.airport || null,

        // Farm
        farm: state.farm || null,

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
        staffFlag: state.staffFlag || null,
        flagReason: state.flagReason || '',
        moderatorNotes: Array.isArray(state.moderatorNotes) ? state.moderatorNotes : [],

        // Recent Activity & Transfers
        transfers: playerTransfers || [],
        activityLog: Array.isArray(state.activityLog) ? state.activityLog.slice(-15) : []
      };

      // Record inspector view in staff audit
      logStaffAudit(request.modSession, u, 'inspect_player', `فحص ملف اللاعب بالكامل`);

      return reply.send({ success: true, profile: inspectionProfile });
    } catch (err) {
      fastify.log.error(err, '[Moderator Inspect Error]');
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
          pState.freezeUntil = ts + durationMs;
          pState.freezeReason = cleanReason;
          pState.frozenBy = request.modSession.name;
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
          updatedJailTimer = 0;
          actionDesc = `فك تجميد الحساب (${cleanReason})`;

          pState.moderatorNotes.unshift({
            timestamp: ts,
            action: 'unfreeze',
            reason: cleanReason,
            modName: request.modSession.name
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
          pState.flagReason = '';
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

        default:
          return reply.status(400).send({ error: 'Bad Request', message: `إجراء غير مدعوم: ${action}` });
      }

      // Cap moderator notes to 20
      if (pState.moderatorNotes.length > 20) {
        pState.moderatorNotes = pState.moderatorNotes.slice(0, 20);
      }

      // 2. Persist to Database
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
          jail_timer: updatedJailTimer,
          state: pState,
          admin_modified_timestamp: ts
        })
      });

      // 3. Sync with in-memory session if active
      if (sessionManager) {
        const session = sessionManager.getSession(targetLower);
        if (session) {
          session.state.freezeUntil = pState.freezeUntil;
          session.state.freezeReason = pState.freezeReason;
          session.state.mutedUntil = pState.mutedUntil;
          session.state.muteReason = pState.muteReason;
          session.state.staffFlag = pState.staffFlag;
          session.state.jailTimer = updatedJailTimer;
          session.state.adminModifiedTimestamp = ts;
          session.dirty = false;
        }
      }

      // 4. Record to staff audit logs
      await logStaffAudit(request.modSession, target, action, cleanReason, { durationMinutes });

      return reply.send({
        success: true,
        message: `تم تنفيذ الإجراء بنجاح: ${actionDesc}`,
        target: pDoc.username,
        action,
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
}

module.exports = moderatorRoutes;
