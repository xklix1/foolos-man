/**
 * Ras ALmal Tycoon — Authoritative Moderator & Staff API Routes
 * Dedicated endpoints for Staff Assistants to inspect players, monitor wealth, and take controlled moderation actions.
 */

const crypto = require('crypto');
const config = require('../config/env');
const { BUSINESSES, ASSETS, CAR_TEMPLATES } = require('../engine/definitions');
const { calculateSingleBusinessProfit } = require('../engine/business-engine');

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
      return reply.status(401).send({ error: 'Unauthorized', message: 'يرجى تسجيل الدخول بمفتاح المحقق أولاً.' });
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

    return reply.status(401).send({ error: 'Unauthorized', message: 'جلسة المحقق غير صالحة أو منتهية الصلاحية.' });
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
      return reply.status(400).send({ error: 'Bad Request', message: 'يرجى إدخال مفتاح المحقق (Moderator Key).' });
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
        id: matched.id || 'investigator',
        name: matched.name || 'محقق معتمد',
        role: matched.role || 'moderator',
        isSuperAdmin: false,
        loginAt: Date.now(),
        lastSeen: Date.now()
      };
      activeModSessions.set(token, modInfo);

      // Log login event
      logStaffAudit(modInfo, 'SYSTEM', 'staff_login', 'تسجيل دخول إلى لوحة الرقابة والتحقيق');

      return reply.send({ success: true, token, modInfo });
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

      // Sort full master feed descending by time
      masterFeed.sort((a, b) => b.timestamp - a.timestamp);

      // 6. Format complete detailed profile
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

        // Aviation & Airport
        airport: state.airport || null,

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
        staffFlag: state.staffFlag || null,
        flagReason: state.flagReason || '',
        moderatorNotes: Array.isArray(state.moderatorNotes) ? state.moderatorNotes : [],
        staffNotes: Array.isArray(state.staffNotes) ? state.staffNotes : [],

        // Recent Activity & Transfers (Extensive historical retention)
        transfers: playerTransfers || [],
        mailbox: playerMailbox || [],
        activityFeed: masterFeed.slice(0, 500),
        activityLog: rawLogs.slice(-300)
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
      if (pState.activityLog.length > 300) pState.activityLog = pState.activityLog.slice(0, 300);

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
          if (session.state.activityLog.length > 300) session.state.activityLog = session.state.activityLog.slice(0, 300);
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
          pState.underSuspicion = false;
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
        admin_modified_timestamp: ts
      };
      if (action === 'ban') {
        patchBody.is_banned = true;
      } else if (action === 'unban') {
        patchBody.is_banned = false;
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
          session.state.mutedUntil = pState.mutedUntil;
          session.state.muteReason = pState.muteReason;
          session.state.staffFlag = pState.staffFlag;
          session.state.jailTimer = updatedJailTimer;
          session.state.isBanned = pState.isBanned;
          session.state.banReason = pState.banReason;
          if (action === 'ban') {
            session.isBanned = true;
          } else if (action === 'unban') {
            session.isBanned = false;
          }
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

  // =========================================================================
  // INVESTIGATION & STAFF-PLAYER LIVE CHAT SYSTEM (نظام محادثات التحقيق المباشر)
  // =========================================================================

  /**
   * GET /api/mod/chat/threads
   * Lists all players who have active investigation chats
   */
  fastify.get('/chat/threads', {
    preHandler: [requireModAuth]
  }, async (request, reply) => {
    try {
      const sKey = serviceKey();
      const qUrl = `${config.SUPABASE_URL}/rest/v1/mailbox?type=eq.investigation_chat&select=*&order=created_at.desc&limit=100`;
      const res = await fetch(qUrl, {
        headers: { 'apikey': sKey, 'Authorization': `Bearer ${sKey}` }
      });
      if (!res.ok) throw new Error('Failed to fetch chat threads');
      const rows = await res.json();
      
      const threadsMap = new Map();
      (Array.isArray(rows) ? rows : []).forEach(r => {
        const player = (r.recipient === 'MOD_STAFF_CHANNEL' || r.recipient?.startsWith('MOD-') || r.recipient?.startsWith('المحقق'))
          ? r.sender
          : r.recipient;
        if (!player || player === 'MOD_STAFF_CHANNEL') return;

        const pKey = player.toLowerCase();
        if (!threadsMap.has(pKey)) {
          threadsMap.set(pKey, {
            username: player,
            lastMessage: (r.payload && r.payload.message) || '',
            lastSender: r.sender,
            timestamp: r.created_at || (r.payload && r.payload.timestamp) || Date.now(),
            unread: r.status === 'unread' && r.recipient === 'MOD_STAFF_CHANNEL'
          });
        }
      });

      return reply.send({
        success: true,
        threads: Array.from(threadsMap.values())
      });
    } catch (err) {
      fastify.log.error(err, '[Chat Threads Error]');
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
   * POST /api/mod/chat/send
   * Moderator sends a message to the player
   */
  fastify.post('/chat/send', {
    preHandler: [requireModAuth]
  }, async (request, reply) => {
    const { targetUser, targetUsername, message } = request.body || {};
    const recipient = (targetUser || targetUsername || '').trim();
    if (!recipient || !message || !message.trim()) {
      return reply.status(400).send({ error: 'targetUser and message are required' });
    }

    try {
      const sKey = serviceKey();
      const ts = Date.now();
      const cleanMsg = message.trim().substring(0, 500);

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
   * Player sends message to the investigation channel
   */
  fastify.post('/chat/player-send', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const { username, message } = request.body || {};
    if (!username || !message || !message.trim()) {
      return reply.status(400).send({ error: 'username and message are required' });
    }

    try {
      const sKey = serviceKey();
      const ts = Date.now();
      const cleanMsg = message.trim().substring(0, 500);

      const res = await fetch(`${config.SUPABASE_URL}/rest/v1/mailbox`, {
        method: 'POST',
        headers: {
          'apikey': sKey,
          'Authorization': `Bearer ${sKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          sender: username.trim(),
          recipient: 'MOD_STAFF_CHANNEL',
          type: 'investigation_chat',
          payload: {
            message: cleanMsg,
            senderName: username.trim(),
            isMod: false,
            timestamp: ts
          },
          status: 'unread',
          created_at: ts
        })
      });

      if (!res.ok) throw new Error('Failed to submit message');
      const data = await res.json();

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
   * GET /api/mod/chat/player-history/:username
   * Player retrieves their own investigation messages
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
}

module.exports = moderatorRoutes;
