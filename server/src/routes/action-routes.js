/**
 * Ras ALmal Tycoon — Server-Authoritative Gameplay Action Endpoints
 * All player actions are validated and calculated strictly on the server.
 */

const config = require('../config/env');
const sessionManager = require('../services/session-manager');
const { BUSINESSES } = require('../engine/definitions');
const { getBusinessUpgradeCost } = require('../engine/business-engine');
const { calculateNetWorth, getAppropriateTitle } = require('../engine/net-worth-engine');
const eventService = require('../services/event-service');

async function actionRoutes(fastify, options) {

  // Middleware helper to resolve active session
  async function resolveSession(request, reply) {
    const authHeader = request.headers['authorization'] || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const { username, token } = request.body || {};
    const effectiveToken = bearerToken || token;

    if (!username) {
      reply.code(400).send({ error: 'Username is required' });
      return null;
    }
    const { session } = await sessionManager.getOrCreateSession(username, false);
    if (!session) {
      reply.code(404).send({ error: 'Player session not found' });
      return null;
    }

    // Strict Anti-IDOR Authentication Guard
    if (session.sessionToken && effectiveToken !== session.sessionToken) {
      reply.code(401).send({ error: 'Unauthorized: Invalid or expired session token' });
      return null;
    }

    return session;
  }

  // 1. POST /api/action/click (Clicker / Tap Action — 10 requests/sec limit)
  fastify.post('/api/action/click', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: 1000
      }
    }
  }, async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    const { count = 1, durationMs = 1000 } = request.body || {};
    const clickCount = Math.max(1, Math.min(100, parseInt(count, 10) || 1));
    const durationSec = Math.max(0.1, (parseInt(durationMs, 10) || 1000) / 1000);

    // Strict Anti-Autoclicker Validation: Cap at MAX_CPS (15 clicks/sec)
    const maxAllowedClicks = Math.ceil(durationSec * config.MAX_CPS) + 5; // +5 tolerance for burst latency
    if (clickCount > maxAllowedClicks) {
      return reply.code(429).send({
        error: 'Click rate limit exceeded (Anti-Autoclicker)',
        allowed: maxAllowedClicks,
        requested: clickCount
      });
    }

    const s = session.state;
    // Calculate click power based on rank / car
    let clickPower = 1;
    if (s.activeCar && s.activeCar.clickBonus) {
      clickPower += Number(s.activeCar.clickBonus || 0);
    }
    if (s.title === 'موظف متميز') clickPower += 2;
    if (s.title === 'تاجر صاعد') clickPower += 5;
    if (s.title === 'سيد الأعمال') clickPower += 15;

    const totalCashEarned = clickCount * clickPower;
    const totalXpEarned = clickCount;

    s.cash = (Number(s.cash) || 0) + totalCashEarned;
    s.xp = (Number(s.xp) || 0) + totalXpEarned;
    s.netWorth = calculateNetWorth(s);
    s.title = getAppropriateTitle(s.netWorth, s.xp);

    sessionManager.markDirty(session.username);

    return {
      success: true,
      earnedCash: totalCashEarned,
      earnedXp: totalXpEarned,
      cash: s.cash,
      xp: s.xp,
      netWorth: s.netWorth,
      title: s.title
    };
  });

const ALLOWED_BUSINESS_KEYS = new Set(Object.keys(BUSINESSES));

  // 2. POST /api/action/buy-business (Business Purchase / Upgrade)
  fastify.post('/api/action/buy-business', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    const { businessId } = request.body || {};
    if (
      !businessId ||
      typeof businessId !== 'string' ||
      !ALLOWED_BUSINESS_KEYS.has(businessId) ||
      businessId === '__proto__' ||
      businessId === 'constructor' ||
      businessId === 'prototype'
    ) {
      return reply.code(400).send({ error: 'Invalid business identifier' });
    }

    const s = session.state;
    if (!s.businesses || typeof s.businesses !== 'object') s.businesses = {};
    if (!Object.prototype.hasOwnProperty.call(s.businesses, businessId) || !s.businesses[businessId]) {
      s.businesses[businessId] = {
        level: 0,
        workers: 0,
        price: BUSINESSES[businessId].optimumPrice,
        suppliesTicks: 12 * 3600 // 12 hours initial supplies
      };
    }

    const b = s.businesses[businessId];
    if (!b || typeof b !== 'object') {
      return reply.code(400).send({ error: 'Invalid business state' });
    }
    const currentLevel = b.level || 0;
    const upgradeCost = getBusinessUpgradeCost(businessId, currentLevel);

    // Validate sufficient funds
    if (s.cash < upgradeCost) {
      return reply.code(400).send({
        error: 'Insufficient funds for business upgrade',
        requiredCash: upgradeCost,
        currentCash: s.cash
      });
    }

    // Authoritatively deduct and upgrade
    s.cash -= upgradeCost;
    b.level = currentLevel + 1;
    if (!b.suppliesTicks || b.suppliesTicks <= 0) {
      b.suppliesTicks = 12 * 3600; // Refill 12 hours upon initial purchase
    }

    s.netWorth = calculateNetWorth(s);
    s.title = getAppropriateTitle(s.netWorth, s.xp);

    sessionManager.markDirty(session.username);

    return {
      success: true,
      businessId,
      newLevel: b.level,
      costPaid: upgradeCost,
      cash: s.cash,
      netWorth: s.netWorth,
      title: s.title
    };
  });

  // 3. POST /api/action/renew-afk (12-Hour AFK Manager Extension — 10 requests/min limit)
  fastify.post('/api/action/renew-afk', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    const s = session.state;
    const now = Date.now();

    // Reset expiry to 12 hours from current trusted server now
    s.afkManagerExpiresAt = now + TWELVE_HOURS_MS;
    s.netWorth = calculateNetWorth(s);

    // Critical action: Immediately force-save to Supabase
    await sessionManager.forceSaveSession(session.username);

    return {
      success: true,
      afkManagerExpiresAt: s.afkManagerExpiresAt,
      remainingMs: TWELVE_HOURS_MS,
      serverTime: now
    };
  });

  // 4. POST /api/action/buy-supplies (Restock Business Supplies)
  fastify.post('/api/action/buy-supplies', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    const { hours = 12 } = request.body || {};
    const refillHours = Math.max(1, Math.min(24, parseInt(hours, 10) || 12));
    const refillSeconds = refillHours * 3600;

    const s = session.state;
    // Flat supplies cost: 250 cash per hour of supplies
    const totalCost = refillHours * 250;
    if (s.cash < totalCost) {
      return reply.code(400).send({
        error: 'Insufficient cash for supplies',
        requiredCash: totalCost,
        currentCash: s.cash
      });
    }

    s.cash -= totalCost;
    if (s.businesses) {
      Object.keys(s.businesses).forEach(bk => {
        const b = s.businesses[bk];
        if (b && b.level > 0) {
          b.suppliesTicks = (b.suppliesTicks || 0) + refillSeconds;
        }
      });
    }

    s.netWorth = calculateNetWorth(s);
    sessionManager.markDirty(session.username);

    return {
      success: true,
      refilledHours: refillHours,
      costPaid: totalCost,
      cash: s.cash,
      netWorth: s.netWorth
    };
  });

  // 5. POST /api/action/bank (Bank Deposit / Withdrawal)
  fastify.post('/api/action/bank', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    const { type, amount } = request.body || {};
    const val = Math.floor(Math.max(1, Number(amount) || 0));
    const s = session.state;

    if (type === 'deposit') {
      if (s.cash < val) {
        return reply.code(400).send({ error: 'Insufficient cash to deposit' });
      }
      s.cash -= val;
      s.bank = (Number(s.bank) || 0) + val;
    } else if (type === 'withdraw') {
      if ((Number(s.bank) || 0) < val) {
        return reply.code(400).send({ error: 'Insufficient bank balance to withdraw' });
      }
      s.bank -= val;
      s.cash += val;
    } else {
      return reply.code(400).send({ error: "Invalid operation type, must be 'deposit' or 'withdraw'" });
    }

    s.netWorth = calculateNetWorth(s);
    sessionManager.markDirty(session.username);

    return {
      success: true,
      type,
      amount: val,
      cash: s.cash,
      bank: s.bank,
      netWorth: s.netWorth
    };
  });

  // 6. POST /api/action/change-pin (Player Account Password / PIN Change)
  fastify.post('/api/action/change-pin', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    const { currentPin, newPin } = request.body || {};
    if (!currentPin || !newPin) {
      return reply.code(400).send({ error: 'يرجى إدخال كلمة السر الحالية والجديدة' });
    }

    const curP = String(currentPin).trim();
    const newP = String(newPin).trim();

    if (newP.length < 4) {
      return reply.code(400).send({ error: 'كلمة السر الجديدة يجب ألا تقل عن 4 خانات' });
    }

    if (curP === newP) {
      return reply.code(400).send({ error: 'كلمة السر الجديدة مطابقة للكلمة الحالية' });
    }

    const crypto = require('crypto');
    const hashedCurrent = crypto.createHash('sha256').update(curP).digest('hex');
    const storedPin = String(session.pin || (session.state && session.state.pin) || '').trim();

    if (storedPin !== curP && storedPin !== hashedCurrent) {
      return reply.code(401).send({ error: 'كلمة السر الحالية غير صحيحة' });
    }

    const hashedNew = crypto.createHash('sha256').update(newP).digest('hex');
    session.pin = hashedNew;
    if (session.state) session.state.pin = hashedNew;

    const dbService = require('../services/db-service');
    await dbService.savePlayerState(session.username, session.state);

    // Also persist directly to players.pin column
    try {
      const endpoint = `${config.SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(session.username)}`;
      await fetch(endpoint, {
        method: 'PATCH',
        headers: dbService.getHeaders(),
        body: JSON.stringify({ pin: hashedNew })
      });
    } catch (err) {
      fastify.log.warn(`Direct pin column patch warning: ${err.message}`);
    }

    return {
      success: true,
      message: 'تم تغيير كلمة السر بنجاح'
    };
  });

  // 7. POST /api/action/recover-account (Forgot PIN via Security Code)
  fastify.post('/api/action/recover-account', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const { username, securityCode, newPin } = request.body || {};
    if (!username || !securityCode || !newPin) {
      return reply.code(400).send({ error: 'اسم المستخدم ورمز الأمان وكلمة السر الجديدة مطلوبة' });
    }

    const u = String(username).trim();
    const cleanCode = String(securityCode).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const newP = String(newPin).trim();

    if (newP.length < 4) {
      return reply.code(400).send({ error: 'كلمة السر الجديدة يجب ألا تقل عن 4 خانات' });
    }

    const dbService = require('../services/db-service');
    const activeSession = sessionManager.sessions.get(u.toLowerCase());
    let playerRow = activeSession ? { username: activeSession.username, pin: activeSession.pin, state: activeSession.state } : await dbService.getPlayerByUsername(u);
    if (!playerRow) {
      return reply.code(404).send({ error: 'اسم المستخدم غير مسجل في اللعبة' });
    }

    const s = (playerRow.state && typeof playerRow.state === 'object') ? { ...playerRow.state } : {};
    let codes = Array.isArray(s.securityCodes) ? s.securityCodes : [];
    codes = codes.map(c => typeof c === 'string' ? { code: c, used: false, usedAt: null } : c);

    if (codes.length === 0) {
      return reply.code(400).send({ error: 'لم يتم تفعيل رموز الأمان لهذا الحساب سابقاً. يرجى التواصل مع الإدارة.' });
    }

    const matchIdx = codes.findIndex(c => {
      if (c.used) return false;
      const norm = String(c.code).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      return norm === cleanCode;
    });

    if (matchIdx === -1) {
      return reply.code(401).send({ error: 'رمز الأمان المدخل غير صحيح أو تم استخدامه مسبقاً' });
    }

    const crypto = require('crypto');
    const hashedNew = crypto.createHash('sha256').update(newP).digest('hex');

    codes[matchIdx].used = true;
    codes[matchIdx].usedAt = Date.now();
    s.securityCodes = codes;
    s.pin = hashedNew;

    // If active session exists in memory, update it
    if (activeSession) {
      activeSession.pin = hashedNew;
      activeSession.state.pin = hashedNew;
      activeSession.state.securityCodes = codes;
    }

    await dbService.savePlayerState(playerRow.username, s);

    try {
      const endpoint = `${config.SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(playerRow.username)}`;
      await fetch(endpoint, {
        method: 'PATCH',
        headers: dbService.getHeaders(),
        body: JSON.stringify({ pin: hashedNew, state: s })
      });
    } catch (err) {
      fastify.log.warn(`Direct recovery patch warning: ${err.message}`);
    }

    return {
      success: true,
      message: 'تم استعادة الحساب وتعيين كلمة السر الجديدة بنجاح!'
    };
  });

  // 12. POST /api/action/speed-up (Authoritative Speed-Up — Closed Beta for Khaled)
  fastify.post('/api/action/speed-up', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    // Strict Beta Access Control: Restricted exclusively to developer account 'Khaled'
    if (!session.username || session.username.trim().toLowerCase() !== 'khaled') {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Speed-up system is in closed beta and restricted exclusively to developer account Khaled.'
      });
    }

    const { timerType, targetKey } = request.body || {};
    if (!timerType) {
      return reply.code(400).send({ error: 'Missing timerType' });
    }

    const s = session.state;
    const currentGold = Math.max(0, Number(s.gold || 0));
    let remainingMs = 0;
    let cost = 0;

    switch (timerType) {
      case 'jail': {
        const jailSec = Number(s.jailTimer || 0);
        if (jailSec <= 0) {
          return reply.code(400).send({ error: 'NO_ACTIVE_TIMER', message: 'Player is not currently in jail.' });
        }
        remainingMs = jailSec * 1000;
        // 1 Gold per minute
        cost = Math.max(1, Math.ceil(jailSec / 60));
        if (currentGold < cost) {
          return reply.code(400).send({
            error: 'INSUFFICIENT_GOLD',
            message: `Insufficient gold balance. Required: ${cost}, Available: ${currentGold}`,
            required: cost,
            current: currentGold
          });
        }

        s.gold = currentGold - cost;
        s.jailTimer = 0;
        break;
      }

      case 'cooldown': {
        const validCooldowns = {
          loan: 'loanCooldownUntil',
          work: 'workCooldownUntil',
          casino: 'casinoCooldownUntil'
        };
        const propName = validCooldowns[targetKey];
        if (!propName) {
          return reply.code(400).send({
            error: 'INVALID_TARGET_KEY',
            message: `Unsupported cooldown targetKey. Allowed: ${Object.keys(validCooldowns).join(', ')}`
          });
        }

        const targetTs = Number(s[propName] || 0);
        const now = Date.now();
        remainingMs = targetTs - now;
        if (remainingMs <= 0) {
          return reply.code(400).send({ error: 'TIMER_EXPIRED', message: 'Cooldown has already expired.' });
        }

        // 1 Gold per minute
        cost = Math.max(1, Math.ceil(remainingMs / 60000));
        if (currentGold < cost) {
          return reply.code(400).send({
            error: 'INSUFFICIENT_GOLD',
            message: `Insufficient gold balance. Required: ${cost}, Available: ${currentGold}`,
            required: cost,
            current: currentGold
          });
        }

        s.gold = currentGold - cost;
        s[propName] = now;
        break;
      }

      case 'smuggling': {
        if (!targetKey) {
          return reply.code(400).send({ error: 'MISSING_TARGET_KEY', message: 'targetKey (job ID) is required for smuggling.' });
        }
        const safeKey = String(targetKey).trim();
        if (safeKey === '__proto__' || safeKey === 'constructor' || safeKey === 'prototype') {
          return reply.code(400).send({ error: 'INVALID_TARGET_KEY', message: 'Invalid targetKey property.' });
        }

        const jobs = s.activeSmugglingJobs;
        let job = null;
        if (Array.isArray(jobs)) {
          job = jobs.find(j => j && typeof j === 'object' && String(j.id) === safeKey) ||
                (Number.isInteger(Number(safeKey)) && jobs[Number(safeKey)]) ||
                (jobs.length === 1 ? jobs[0] : null);
        } else if (jobs && typeof jobs === 'object' && Object.prototype.hasOwnProperty.call(jobs, safeKey)) {
          job = jobs[safeKey];
        }

        if (!job || typeof job !== 'object' || Array.isArray(job) || job === Object.prototype) {
          return reply.code(404).send({ error: 'JOB_NOT_FOUND', message: `No active smuggling job found with ID: ${safeKey}` });
        }

        const finishTs = Number(job.endTime || job.finishTime || job.expiresAt || 0);
        const now = Date.now();
        remainingMs = finishTs - now;
        if (remainingMs <= 0) {
          return reply.code(400).send({ error: 'TIMER_EXPIRED', message: 'Smuggling job is already finished.' });
        }

        // 1 Gold per minute
        cost = Math.max(1, Math.ceil(remainingMs / 60000));
        if (currentGold < cost) {
          return reply.code(400).send({
            error: 'INSUFFICIENT_GOLD',
            message: `Insufficient gold balance. Required: ${cost}, Available: ${currentGold}`,
            required: cost,
            current: currentGold
          });
        }

        s.gold = currentGold - cost;
        job.endTime = now;
        job.finishTime = now;
        job.expiresAt = now;
        job.ready = true;
        break;
      }

      default:
        return reply.code(400).send({
          error: 'UNSUPPORTED_TIMER_TYPE',
          message: `Supported timer types: jail, cooldown, smuggling`
        });
    }

    // Persist authoritative mutation
    sessionManager.markDirty(session.username);

    return {
      success: true,
      timerType,
      targetKey: targetKey || null,
      goldDeducted: cost,
      currentGold: s.gold,
      state: s
    };
  });

  // 13. GET /api/events/active (Active Competitive Events — Beta for Khaled)
  fastify.get('/api/events/active', async (request, reply) => {
    const { username } = request.query || {};
    const events = await eventService.getActiveEventsForUser(username);
    return {
      success: true,
      events
    };
  });

  // 14. POST /api/action/transfer-notify (Wire Transfer Notification to in-memory active session)
  fastify.post('/api/action/transfer-notify', async (request, reply) => {
    const { sender, recipient, amount, netAmount } = request.body || {};
    if (!recipient || !amount) {
      return reply.code(400).send({ error: 'recipient and amount are required' });
    }

    const amt = Number(amount);
    if (amt <= 0) {
      return reply.code(400).send({ error: 'amount must be positive' });
    }

    // Tax is 5% — recipient gets 95% (matches execute_wire_transfer SQL)
    const TAX_RATE = 0.05;
    const taxAmt = Math.floor(amt * TAX_RATE);
    // Use explicit netAmount if provided by caller, otherwise compute from tax rate
    const finalNet = (netAmount !== undefined && !isNaN(Number(netAmount)))
      ? Number(netAmount)
      : (amt - taxAmt);

    const now = Date.now();
    // SQL sets sender lock 120 seconds into the future to block stale flushes from overwriting;
    // mirror that here so the server session's adminModifiedTimestamp matches the DB value
    // and our lte filter allows the next flush to succeed.
    const senderLockTs = now + 120000;

    let senderDeducted = false;
    if (sender) {
      senderDeducted = sessionManager.deductSenderWireTransfer(sender, amt, senderLockTs);
    }

    const credited = sessionManager.creditRecipientWireTransfer(recipient, finalNet, now);

    // Immediately persist recipient's updated balance to DB so a concurrent stale flush
    // cannot overwrite the incoming transfer before the next background write-behind cycle.
    if (credited) {
      sessionManager.forceSaveSession(recipient).catch(err => {
        console.warn('[transfer-notify] forceSave for recipient failed:', err.message);
      });
    }

    return {
      success: true,
      sender: sender || null,
      senderDeducted,
      recipient,
      grossAmount: amt,
      taxAmount: taxAmt,
      amount: finalNet,
      inMemorySessionCredited: credited
    };
  });

  // 15. POST /api/action/transfer-request (Authoritative proxy for peer-to-peer transfer requests)
  fastify.post('/api/action/transfer-request', async (request, reply) => {
    const { sender, recipient, amount } = request.body || {};
    if (!sender || !recipient || !amount) {
      return reply.code(400).send({ error: 'sender, recipient and amount are required' });
    }

    const amt = Number(amount);
    if (amt <= 0) {
      return reply.code(400).send({ error: 'amount must be positive' });
    }

    const sKey = config.SUPABASE_SERVICE_ROLE_KEY;
    const sUrl = config.SUPABASE_URL;

    try {
      const now = Date.now();
      const insertRes = await fetch(`${sUrl}/rest/v1/transfer_requests`, {
        method: 'POST',
        headers: {
          'apikey': sKey,
          'Authorization': `Bearer ${sKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          sender: String(sender).trim(),
          recipient: String(recipient).trim(),
          amount: amt,
          status: 'pending',
          created_at: now
        })
      });

      if (!insertRes.ok) {
        throw new Error(`Failed to create transfer request: ${await insertRes.text()}`);
      }

      const rows = await insertRes.json();
      const createdReq = rows && rows[0];

      // Send interactive mail notification to recipient
      await fetch(`${sUrl}/rest/v1/mailbox`, {
        method: 'POST',
        headers: {
          'apikey': sKey,
          'Authorization': `Bearer ${sKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: String(sender).trim(),
          recipient: String(recipient).trim(),
          type: 'transfer_request',
          payload: {
            requestId: createdReq ? createdReq.id : null,
            amount: amt,
            title: 'طلب تحويل أموال',
            message: `يطلب منك اللاعب "${String(sender).trim()}" تحويل مبلغ ${amt.toLocaleString()} EGP.`
          },
          status: 'unread',
          created_at: now
        })
      }).catch(() => {});

      return {
        success: true,
        request: createdReq
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to create transfer request: ' + err.message });
    }
  });

  // 12. POST /api/action/submit-topup (Authoritative Topup Submission)
  fastify.post('/api/action/submit-topup', async (request, reply) => {
    const { username, packageId, packageName, price, rewards, senderPhoneOrName, receiptNumber } = request.body || {};
    if (!username || !packageId || price === undefined) {
      return reply.code(400).send({ error: 'Missing required topup parameters' });
    }

    const sKey = config.SUPABASE_SERVICE_ROLE_KEY;
    const sUrl = config.SUPABASE_URL;
    const ts = Date.now();

    const newRequest = {
      id: 'req_' + ts + '_' + Math.random().toString(36).substring(2, 7),
      username: String(username).trim(),
      packageId: String(packageId).trim(),
      packageName: String(packageName || '').trim(),
      price: Number(price) || 0,
      rewards: rewards || {},
      senderPhoneOrName: String(senderPhoneOrName || '').trim(),
      receiptNumber: String(receiptNumber || '').trim(),
      status: 'pending',
      createdAt: ts,
      reviewedAt: null,
      reviewerNote: ''
    };

    try {
      // 1. Fetch current topup requests via service_role
      const getRes = await fetch(`${sUrl}/rest/v1/globals?id=eq.topup_requests`, {
        headers: {
          'apikey': sKey,
          'Authorization': `Bearer ${sKey}`
        }
      });
      let currentRequests = [];
      if (getRes.ok) {
        const rows = await getRes.json();
        if (rows && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.requests)) {
          currentRequests = rows[0].data.requests;
        }
      }

      currentRequests.unshift(newRequest);
      if (currentRequests.length > 300) {
        currentRequests = currentRequests.slice(0, 300);
      }

      const saveRes = await fetch(`${sUrl}/rest/v1/globals`, {
        method: 'POST',
        headers: {
          'apikey': sKey,
          'Authorization': `Bearer ${sKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: 'topup_requests',
          data: { requests: currentRequests, updatedAt: ts },
          updated_at: ts
        })
      });

      if (!saveRes.ok) {
        throw new Error(`Failed to save topup request: ${await saveRes.text()}`);
      }

      return { success: true, request: newRequest };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to submit topup request: ' + err.message });
    }
  });
}

module.exports = actionRoutes;
