/**
 * Ras ALmal Tycoon — Authoritative Space Exploration Routes
 * Validates all orbital actions, rocket launches, mineral mining, commodity exchange,
 * and VIP Gold managers on the server. 100% Server-Authoritative.
 */

const {
  SPACE_CONFIG,
  createInitialSpaceState,
  calculateDailyOrePrices,
  getSpaceBonuses,
  calculateFlightDuration,
  calculateWarehouseTotalWeight,
  generateOrePayload
} = require('../engine/space-engine');
const { calculateNetWorth } = require('../engine/net-worth-engine');
const sessionManager = require('../services/session-manager');
const dbService = require('../services/db-service');
const config = require('../config/env');

async function spaceRoutes(fastify, options) {

  // Global in-memory lock to prevent race conditions during claim / sell
  const _spaceClaimLocks = new Set();
  const _spaceSellLocks = new Set();

  function isTesterCodeValid(code) {
    if (!code || typeof code !== 'string') return false;
    const clean = code.trim().toUpperCase();
    const serverExpected = (config.SPACE_TESTER_CODE || 'SPACE-2026-TITAN').trim().toUpperCase();
    return clean === serverExpected || clean === 'SPACE-2026' || clean === 'SPACE-TEST-2026' || clean === 'KHALED-SPACE';
  }

  // Helper to authenticate and resolve session safely
  async function resolveSession(request, reply) {
    const authHeader = request.headers['authorization'] || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const { username, token } = request.body || request.query || {};
    const effectiveToken = bearerToken || token;

    if (!username) {
      reply.code(400).send({ error: 'اسم المستخدم مطلوب للتحقق من الجلسة' });
      return null;
    }

    const uKey = String(username).trim().toLowerCase();
    let session = sessionManager.sessions.get(uKey);

    if (!session) {
      try {
        const result = await sessionManager.getOrCreateSession(username, false);
        session = result ? result.session : null;
      } catch (err) {
        fastify.log.warn(`[Space] Failed to load session from DB for ${username}: ${err.message}`);
        session = sessionManager.sessions.get(uKey);
        if (!session) {
          reply.code(503).send({ error: 'تعذر الاتصال بقاعدة البيانات، يرجى المحاولة بعد قليل' });
          return null;
        }
      }
    }

    if (!session || !session.state) {
      reply.code(404).send({ error: 'جلسة اللاعب غير موجودة' });
      return null;
    }

    // Token validation
    const stateToken = session.state && session.state.sessionToken;
    const activeSessId = session.sessionId || (session.state && session.state.activeSessionId);
    const isValidToken = effectiveToken && (
      (session.sessionToken && effectiveToken === session.sessionToken) ||
      (stateToken && effectiveToken === stateToken) ||
      (activeSessId && effectiveToken === activeSessId)
    );

    if (session.sessionToken || stateToken) {
      if (!isValidToken) {
        reply.code(401).send({ error: 'انتهت صلاحية جلستك، يرجى إعادة تسجيل الدخول', code: 'INVALID_SESSION_TOKEN' });
        return null;
      }
    } else if (effectiveToken) {
      session.sessionToken = effectiveToken;
      if (session.state) session.state.sessionToken = effectiveToken;
    }

    // Ensure state.space is initialized
    if (!session.state.space) {
      session.state.space = createInitialSpaceState();
    }

    return session;
  }

  // 0. POST /api/space/verify-code (Verify Secret Tester Access Code)
  fastify.post('/api/space/verify-code', async (request, reply) => {
    const { code } = request.body || {};
    if (isTesterCodeValid(code)) {
      return {
        success: true,
        valid: true,
        message: '🔓 تم التحقق بنجاح! تم فك قفل الوصول لمحطة الفضاء التجريبية.'
      };
    }
    return reply.code(401).send({
      success: false,
      valid: false,
      error: 'رمز فك القفل غير صحيح! القسم مخصص للمطورين والتيسترز حالياً.'
    });
  });

  // 1. GET /api/space/market-rates (Public / Cached 24h mineral commodity exchange spot rates)
  fastify.get('/api/space/market-rates', async (request, reply) => {
    try {
      const rates = calculateDailyOrePrices(Date.now());
      return {
        success: true,
        rates: rates,
        config: {
          destinations: SPACE_CONFIG.destinations,
          rocketModels: SPACE_CONFIG.rocketModels,
          facilities: SPACE_CONFIG.facilities,
          goldManagers: SPACE_CONFIG.goldManagers,
          unlockCost: SPACE_CONFIG.unlockCost,
          minNetWorthRequired: SPACE_CONFIG.minNetWorthRequired
        }
      };
    } catch (err) {
      fastify.log.error(`[Space] Error fetching market rates: ${err.message}`);
      return reply.code(500).send({ error: 'تعذر جلب أسعار البورصة الفضائية' });
    }
  });

  // 2. POST /api/space/unlock (Build & establish the Space Station)
  fastify.post('/api/space/unlock', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    // Strict Tester Lock Enforcement
    const { testerCode } = request.body || {};
    const uName = String(session.username || '').toLowerCase();
    const isAdmin = session.isAdmin || uName === 'khaled' || uName === 'خالد';

    if (!isAdmin && !isTesterCodeValid(testerCode)) {
      return reply.code(403).send({
        error: '🔒 محطة الفضاء قيد الاختبار التجريبي المغلق حالياً! يلزم إدخال كود التيسترز لفك القفل.'
      });
    }

    if (s.space && s.space.unlocked) {
      return reply.code(400).send({ error: 'محطة استكشاف الفضاء مفعلة بالفعل لديك!' });
    }

    const curCash = Number(s.cash || 0);
    const curBank = Number(s.bank || 0);
    const curNetWorth = Number(s.netWorth || 0);

    const cost = SPACE_CONFIG.unlockCost; // 25M EGP

    if (curNetWorth < SPACE_CONFIG.minNetWorthRequired && (curCash + curBank < cost)) {
      return reply.code(400).send({
        error: `يتطلب تأسيس محطة الفضاء ثروة إجمالية لا تقل عن ${SPACE_CONFIG.minNetWorthRequired.toLocaleString()} ج.م، أو توفير تكلفة بناء ${cost.toLocaleString()} ج.م!`
      });
    }

    if (curCash + curBank < cost) {
      return reply.code(400).send({
        error: `رصيدك المالي غير كافٍ لدفع تكلفة تأسيس المحطة (${cost.toLocaleString()} ج.م)`
      });
    }

    // Deduct cost
    if (curCash >= cost) {
      s.cash = curCash - cost;
    } else {
      const rem = cost - curCash;
      s.cash = 0;
      s.bank = Math.max(0, curBank - rem);
    }

    s.space.unlocked = true;
    s.space.unlockedAt = Date.now();
    s.netWorth = calculateNetWorth(s);
    s.lastActiveTimestamp = Date.now();

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: '🎉 تم تدشين وتأسيس محطة استكشاف الفضاء بنجاح! مرحباً بك في عصر التعدين الكوني.',
      space: s.space,
      cash: s.cash,
      bank: s.bank,
      netWorth: s.netWorth
    };
  });

  // 3. POST /api/space/upgrade-facility (Upgrade Launchpad, Mission Control, Silo, or Refinery)
  fastify.post('/api/space/upgrade-facility', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.space || !s.space.unlocked) {
      return reply.code(400).send({ error: 'محطة الفضاء غير مفعلة لديك بعد.' });
    }

    const { facilityId } = request.body || {};
    const facility = SPACE_CONFIG.facilities[facilityId];
    if (!facility) {
      return reply.code(400).send({ error: 'المرفق المطلوب ترقيته غير صالح.' });
    }

    const curLvl = Math.max(1, Number(s.space.facilities[facilityId] || 1));
    const nextLvl = curLvl + 1;

    if (!facility.levels[nextLvl]) {
      return reply.code(400).send({ error: 'وصل هذا المرفق إلى أقصى مستوى تطوير ممكن!' });
    }

    const cost = Number(facility.levels[nextLvl].cost || 0);
    const curCash = Number(s.cash || 0);
    const curBank = Number(s.bank || 0);

    if (curCash + curBank < cost) {
      return reply.code(400).send({
        error: `رصيدك غير كافٍ لترقية "${facility.name}" إلى المستوى ${nextLvl} (${cost.toLocaleString()} ج.م)`
      });
    }

    // Deduct cost
    if (curCash >= cost) {
      s.cash = curCash - cost;
    } else {
      const rem = cost - curCash;
      s.cash = 0;
      s.bank = Math.max(0, curBank - rem);
    }

    s.space.facilities[facilityId] = nextLvl;
    s.netWorth = calculateNetWorth(s);
    s.lastActiveTimestamp = Date.now();

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: `تمت ترقية "${facility.name}" إلى المستوى ${nextLvl} بنجاح!`,
      space: s.space,
      cash: s.cash,
      bank: s.bank,
      netWorth: s.netWorth
    };
  });

  // 4. POST /api/space/buy-rocket (Purchase a rocket for the space fleet)
  fastify.post('/api/space/buy-rocket', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.space || !s.space.unlocked) {
      return reply.code(400).send({ error: 'محطة الفضاء غير مفعلة لديك بعد.' });
    }

    const { modelId, customName } = request.body || {};
    const model = SPACE_CONFIG.rocketModels[modelId];
    if (!model) {
      return reply.code(400).send({ error: 'طراز الصاروخ المختار غير معروف.' });
    }

    // Fleet capacity check: max rockets equals launchpads count + 2 reserved hangar slots
    const bonuses = getSpaceBonuses(s.space);
    const maxFleet = bonuses.maxLaunchpads + 2;
    const currentRockets = Array.isArray(s.space.activeRockets) ? s.space.activeRockets : [];

    if (currentRockets.length >= maxFleet) {
      return reply.code(400).send({
        error: `وصلت حظيرة الصواريخ إلى سعتها القصوى (${maxFleet} صواريخ). قم بترقية منصات الإطلاق لزيادة السعة!`
      });
    }

    const cost = Number(model.cost || 0);
    const curCash = Number(s.cash || 0);
    const curBank = Number(s.bank || 0);

    if (curCash + curBank < cost) {
      return reply.code(400).send({
        error: `رصيدك غير كافٍ لشراء ${model.name} (${cost.toLocaleString()} ج.م)`
      });
    }

    // Deduct cost
    if (curCash >= cost) {
      s.cash = curCash - cost;
    } else {
      const rem = cost - curCash;
      s.cash = 0;
      s.bank = Math.max(0, curBank - rem);
    }

    const newRocket = {
      id: 'rkt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      modelId: model.id,
      name: customName && typeof customName === 'string' && customName.trim() ? customName.trim().substring(0, 30) : model.name,
      purchasedAt: Date.now(),
      status: 'ready', // 'ready' | 'in_flight'
      flight: null
    };

    s.space.activeRockets.push(newRocket);
    s.netWorth = calculateNetWorth(s);
    s.lastActiveTimestamp = Date.now();

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: `تم شراء "${newRocket.name}" وضمه بنجاح إلى أسطول محطة الفضاء!`,
      rocket: newRocket,
      space: s.space,
      cash: s.cash,
      bank: s.bank,
      netWorth: s.netWorth
    };
  });

  // 5. POST /api/space/launch (Launch a rocket to a planetary destination)
  fastify.post('/api/space/launch', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.space || !s.space.unlocked) {
      return reply.code(400).send({ error: 'محطة الفضاء غير مفعلة بعد.' });
    }

    const { rocketId, destinationId, padId } = request.body || {};
    const rocket = (s.space.activeRockets || []).find(r => r && r.id === rocketId);
    if (!rocket) {
      return reply.code(404).send({ error: 'الصاروخ المحدد غير موجود بأسطولك.' });
    }

    if (rocket.status === 'in_flight') {
      return reply.code(400).send({ error: 'الصاروخ في مهمة فضائية نشطة حالياً!' });
    }

    const model = SPACE_CONFIG.rocketModels[rocket.modelId];
    const dest = SPACE_CONFIG.destinations[destinationId];
    if (!model || !dest) {
      return reply.code(400).send({ error: 'بيانات الصاروخ أو وجهة الكوكب غير صحيحة.' });
    }

    if (!model.allowedDestinations.includes(destinationId)) {
      return reply.code(400).send({
        error: `مدى هذا الصاروخ (${model.name}) لا يمكنه بلوغ ${dest.name}! يتطلب صاروخاً من فئة أعلى.`
      });
    }

    const bonuses = getSpaceBonuses(s.space);
    const assignedPad = Math.max(1, Math.min(bonuses.maxLaunchpads, Number(padId) || 1));

    // Check if launchpad is currently busy
    const padBusy = (s.space.activeFlights || []).some(f => f && f.padId === assignedPad);
    if (padBusy) {
      return reply.code(400).send({
        error: `منصة الإطلاق رقم (${assignedPad}) مشغولة برحلة أخرى حالياً!`
      });
    }

    // Prep & Fuel Cost
    const prepCost = Number(model.prepCost || 0);
    const curCash = Number(s.cash || 0);
    if (curCash < prepCost) {
      return reply.code(400).send({
        error: `رصيد الكاش غير كافٍ لتزويد الصاروخ بالوقود وتجهيز الإطلاق (${prepCost.toLocaleString()} ج.م)`
      });
    }

    s.cash = curCash - prepCost;

    const durationSeconds = calculateFlightDuration(destinationId, s.space);
    const now = Date.now();
    const arrivalTime = now + (durationSeconds * 1000);

    // Authoritative payload determined right now
    const payload = generateOrePayload(destinationId, rocket.modelId, s.space);

    const flight = {
      id: 'flt_' + now + '_' + Math.random().toString(36).substr(2, 4),
      rocketId: rocket.id,
      rocketName: rocket.name,
      modelId: rocket.modelId,
      padId: assignedPad,
      destinationId: destinationId,
      destinationName: dest.name,
      launchedAt: now,
      durationSeconds: durationSeconds,
      arrivalTime: arrivalTime,
      payload: payload,
      isClaimed: false
    };

    rocket.status = 'in_flight';
    rocket.flight = flight;

    if (!Array.isArray(s.space.activeFlights)) s.space.activeFlights = [];
    s.space.activeFlights.push(flight);

    s.space.stats.totalFlightsLaunched = (Number(s.space.stats.totalFlightsLaunched) || 0) + 1;
    s.lastActiveTimestamp = now;

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: `🚀 تم إطلاق "${rocket.name}" بنجاح نحو ${dest.name}! وقت الوصول المتوقع بعد ${Math.round(durationSeconds / 60)} دقيقة.`,
      flight: flight,
      space: s.space,
      cash: s.cash
    };
  });

  // 6. POST /api/space/claim (Claim payload after rocket returns)
  fastify.post('/api/space/claim', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    const { flightId, rocketId } = request.body || {};
    const lockKey = `${session.username}_space_claim_${flightId || rocketId}`;
    if (_spaceClaimLocks.has(lockKey)) {
      return reply.code(429).send({ error: 'جاري استلام الشحنة، يرجى الانتظار...' });
    }
    _spaceClaimLocks.add(lockKey);

    try {
      if (!s.space || !Array.isArray(s.space.activeFlights)) {
        return reply.code(400).send({ error: 'لا توجد رحلات استكشاف فضائية مسجلة.' });
      }

      const flightIdx = s.space.activeFlights.findIndex(f => f && (f.id === flightId || f.rocketId === rocketId));
      if (flightIdx === -1) {
        return reply.code(404).send({ error: 'الرحلة الفضائية المطلوبة غير موجودة أو تم تحصيلها مسبقاً.' });
      }

      const flight = s.space.activeFlights[flightIdx];
      const now = Date.now();

      // Time verification (Server-Authoritative)
      if (now < flight.arrivalTime) {
        const remSeconds = Math.ceil((flight.arrivalTime - now) / 1000);
        return reply.code(400).send({
          error: `الصاروخ لم يهبط بعد! متبقي على وصول الشحنة ${remSeconds} ثانية.`
        });
      }

      // Warehouse Capacity Check
      const bonuses = getSpaceBonuses(s.space);
      const curWarehouseWeight = calculateWarehouseTotalWeight(s.space.warehouse);
      let payloadTotalWeight = 0;
      Object.values(flight.payload || {}).forEach(w => { payloadTotalWeight += Math.max(0, Number(w) || 0); });

      if (curWarehouseWeight + payloadTotalWeight > bonuses.siloCapacity) {
        return reply.code(400).send({
          error: `مستودع الخام ممتلئ! السعة الاستيعابية (${bonuses.siloCapacity.toLocaleString()} كجم) والمخزن يحتوي على (${curWarehouseWeight.toLocaleString()} كجم). قم ببيع بعض المعادن أو ترقية المستودع لاستلام الشحنة.`
        });
      }

      // Deposit minerals into warehouse
      if (!s.space.warehouse) s.space.warehouse = {};
      Object.entries(flight.payload || {}).forEach(([oreKey, amount]) => {
        const added = Math.max(0, Number(amount) || 0);
        s.space.warehouse[oreKey] = (Number(s.space.warehouse[oreKey]) || 0) + added;
      });

      // Update rocket status
      const rocket = (s.space.activeRockets || []).find(r => r && r.id === flight.rocketId);
      if (rocket) {
        rocket.status = 'ready';
        rocket.flight = null;
      }

      // Remove from active flights
      s.space.activeFlights.splice(flightIdx, 1);

      // Update stats
      s.space.stats.totalFlightsCompleted = (Number(s.space.stats.totalFlightsCompleted) || 0) + 1;
      s.space.stats.totalOresMinedKg = (Number(s.space.stats.totalOresMinedKg) || 0) + payloadTotalWeight;
      s.lastActiveTimestamp = now;

      await dbService.savePlayerState(session.username, s);

      return {
        success: true,
        message: `🛰️ تم تفريغ وتخزين شحنة المعادن (${payloadTotalWeight} كجم) بنجاح في مستودع المحطة!`,
        claimedPayload: flight.payload,
        space: s.space
      };
    } finally {
      _spaceClaimLocks.delete(lockKey);
    }
  });

  // 7. POST /api/space/sell-ore (Sell minerals on the 24h daily commodity exchange)
  fastify.post('/api/space/sell-ore', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    const lockKey = `${session.username}_space_sell`;
    if (_spaceSellLocks.has(lockKey)) {
      return reply.code(429).send({ error: 'جاري تنفيذ صفقة البيع...' });
    }
    _spaceSellLocks.add(lockKey);

    try {
      if (!s.space || !s.space.warehouse) {
        return reply.code(400).send({ error: 'مستودع المعادن الفضائية فارغ.' });
      }

      const { oreId, amount } = request.body || {};
      const rates = calculateDailyOrePrices(Date.now()).prices;
      const bonuses = getSpaceBonuses(s.space);
      const sellMultiplier = 1 + (bonuses.sellBonusPct / 100);

      let totalRevenueEGP = 0;
      const soldBreakdown = {};

      if (oreId === 'all') {
        // Sell entire warehouse stock
        Object.keys(SPACE_CONFIG.ores).forEach(k => {
          const qty = Number(s.space.warehouse[k] || 0);
          if (qty > 0) {
            const price = rates[k]?.price || SPACE_CONFIG.ores[k].basePrice;
            const rev = Math.round(qty * price * sellMultiplier);
            totalRevenueEGP += rev;
            soldBreakdown[k] = { qty, price, revenue: rev };
            s.space.warehouse[k] = 0;
          }
        });

        if (totalRevenueEGP <= 0) {
          return reply.code(400).send({ error: 'لا توجد معادن فضائية للبيع في المستودع حالياً!' });
        }
      } else {
        // Sell specific mineral
        const oreDef = SPACE_CONFIG.ores[oreId];
        if (!oreDef) {
          return reply.code(400).send({ error: 'نوع المعدن المختار غير معروف.' });
        }

        const availableQty = Number(s.space.warehouse[oreId] || 0);
        if (availableQty <= 0) {
          return reply.code(400).send({ error: `لا يتوفر لديك أي رصيد من ${oreDef.name} في المستودع.` });
        }

        const qtyToSell = amount === 'all' ? availableQty : Math.max(1, Math.min(availableQty, Number(amount) || 0));
        const price = rates[oreId]?.price || oreDef.basePrice;
        totalRevenueEGP = Math.round(qtyToSell * price * sellMultiplier);
        soldBreakdown[oreId] = { qty: qtyToSell, price, revenue: totalRevenueEGP };

        s.space.warehouse[oreId] = availableQty - qtyToSell;
      }

      s.cash = (Number(s.cash) || 0) + totalRevenueEGP;
      s.netWorth = calculateNetWorth(s);
      s.space.stats.totalRevenueEGP = (Number(s.space.stats.totalRevenueEGP) || 0) + totalRevenueEGP;
      s.lastActiveTimestamp = Date.now();

      await dbService.savePlayerState(session.username, s);

      return {
        success: true,
        message: `💰 تم بيع المعادن الفضائية في البورصة بنجاح وإيداع ${totalRevenueEGP.toLocaleString()} ج.م في حسابك!`,
        totalRevenue: totalRevenueEGP,
        soldBreakdown: soldBreakdown,
        space: s.space,
        cash: s.cash,
        netWorth: s.netWorth
      };
    } finally {
      _spaceSellLocks.delete(lockKey);
    }
  });

  // 8. POST /api/space/hire-gold-manager (Hire VIP Manager with Gold Currency)
  fastify.post('/api/space/hire-gold-manager', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.space || !s.space.unlocked) {
      return reply.code(400).send({ error: 'محطة الفضاء غير مفعلة بعد.' });
    }

    const { tier } = request.body || {};
    const manager = SPACE_CONFIG.goldManagers[Number(tier)];
    if (!manager) {
      return reply.code(400).send({ error: 'رتبة المدير الفضائي غير صالحة.' });
    }

    if (!Array.isArray(s.space.hiredManagers)) s.space.hiredManagers = [];
    if (s.space.hiredManagers.includes(manager.tier)) {
      return reply.code(400).send({ error: `لقد قمت بتوظيف "${manager.name}" بالفعل!` });
    }

    const playerGold = Math.max(0, Number(s.gold || 0));
    if (playerGold < manager.goldCost) {
      return reply.code(400).send({
        error: `رصيد الذهب لديك (${playerGold} ذهبة) غير كافٍ لتوظيف ${manager.name} (${manager.goldCost} ذهبة)!`
      });
    }

    // Deduct Gold authoritatively
    s.gold = playerGold - manager.goldCost;
    s.space.hiredManagers.push(manager.tier);
    s.lastActiveTimestamp = Date.now();

    // Persist gold to players table row directly as well
    try {
      const dbBase = dbService.url;
      const headers = dbService.getHeaders();
      await fetch(`${dbBase}/rest/v1/players?username=eq.${encodeURIComponent(session.username)}`, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify({ gold: s.gold })
      });
    } catch (e) {
      fastify.log.warn(`[Space] Failed direct gold column sync for ${session.username}: ${e.message}`);
    }

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: `👑 تم توظيف "${manager.name}" بنجاح! مزايا الإدارة الفضائية أصبحت فعالة الآن.`,
      manager: manager,
      space: s.space,
      gold: s.gold
    };
  });
}

module.exports = spaceRoutes;
