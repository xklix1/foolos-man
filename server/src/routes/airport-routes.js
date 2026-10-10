/**
 * Ras ALmal Tycoon — Server-Authoritative Airport Routes
 * Strictly validates all aviation actions, flight schedules, upgrades, and dynamic unlock codes on the server.
 */

const {
  AIRPORT_FACILITIES,
  AIRCRAFT_MODELS,
  FLIGHT_DESTINATIONS,
  createInitialAirportState,
  getAirportBonuses,
  calculateFlightEconomics,
  calculateDutyFreeAccumulated,
  calculateTransitAccumulated
} = require('../engine/airport-engine');
const { calculateNetWorth, getAppropriateTitle } = require('../engine/net-worth-engine');
const sessionManager = require('../services/session-manager');
const dbService = require('../services/db-service');

async function airportRoutes(fastify, options) {

  // Global in-memory lock to prevent double claim / concurrent flight collection race conditions
  const _flightClaimLocks = new Set();

  // Helper to authenticate and resolve session
  async function resolveSession(request, reply) {
    const authHeader = request.headers['authorization'] || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const { username, token } = request.body || {};
    const effectiveToken = bearerToken || token;

    if (!username) {
      reply.code(400).send({ error: 'Username is required' });
      return null;
    }
    const { session } = await sessionManager.getOrCreateSession(username, true);
    if (!session) {
      reply.code(404).send({ error: 'Player session not found' });
      return null;
    }

    // Comprehensive session validation:
    // Accept if matches session.sessionToken, session.state.sessionToken, session.sessionId, or session.state.activeSessionId
    const stateToken = session.state && session.state.sessionToken;
    const activeSessId = session.sessionId || (session.state && session.state.activeSessionId);

    const isValidToken = effectiveToken && (
      (session.sessionToken && effectiveToken === session.sessionToken) ||
      (stateToken && effectiveToken === stateToken) ||
      (activeSessId && effectiveToken === activeSessId)
    );

    if (session.sessionToken || stateToken) {
      if (!isValidToken) {
        reply.code(401).send({ error: 'Unauthorized: Invalid session token', code: 'INVALID_SESSION_TOKEN' });
        return null;
      }
      if (!session.sessionToken && stateToken) {
        session.sessionToken = stateToken;
      }
    } else if (effectiveToken) {
      session.sessionToken = effectiveToken;
      if (session.state) session.state.sessionToken = effectiveToken;
    }

    return session;
  }

  // Helper to fetch dynamic airport settings from globals table
  let _cachedAirportSettings = null;
  let _lastSettingsFetch = 0;
  async function getDynamicAirportSettings() {
    const now = Date.now();
    if (_cachedAirportSettings && (now - _lastSettingsFetch < 30000)) {
      return _cachedAirportSettings;
    }
    try {
      const endpoint = `${dbService.url}/rest/v1/globals?id=eq.airport_settings&select=*`;
      const res = await fetch(endpoint, { headers: dbService.getHeaders() });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0].data) {
          _cachedAirportSettings = rows[0].data;
          _lastSettingsFetch = now;
          return _cachedAirportSettings;
        }
      }
    } catch (e) {
      console.warn('[AirportRoutes] Failed to fetch dynamic airport_settings:', e.message);
    }
    // Fallback if not configured
    return _cachedAirportSettings || {
      unlock_code: 'SKY-ROYAL-2026',
      unlock_cost: 30000000,
      min_xp: 2500,
      is_active: true
    };
  }

  // 1. POST /api/airport/unlock (Direct purchase of airport license)
  fastify.post('/api/airport/unlock', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (s.airport && s.airport.unlocked) {
      return reply.code(400).send({ error: 'المطار مفعل بالفعل في حسابك!' });
    }

    const { airportName } = request.body || {};

    const settings = await getDynamicAirportSettings();
    if (settings.is_active === false) {
      return reply.code(403).send({ error: 'مشروع المطار غير مفعل حالياً من إدارة اللعبة.' });
    }

    const minXp = Number(settings.min_xp || 2500);
    if (Number(s.xp || 0) < minXp) {
      return reply.code(400).send({
        error: ` يتطلب فتح المطار خبرة لا تقل عن ${minXp.toLocaleString()} XP (خبرتك الحالية: ${Number(s.xp || 0).toLocaleString()} XP)`
      });
    }

    const cost = Number(settings.unlock_cost || 30000000);
    const curCash = Number(s.cash || 0);
    const curBank = Number(s.bank || 0);

    if (curCash + curBank < cost) {
      return reply.code(400).send({
        error: ` رصيدك غير كافٍ لدفع رسوم رخصة المطار (${cost.toLocaleString()} ج.م)`
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

    // Initialize Airport
    s.airport = createInitialAirportState(airportName);
    s.netWorth = calculateNetWorth(s);
    s.title = getAppropriateTitle(s.netWorth, s.xp);
    s.lastActiveTimestamp = Date.now();
    s.lastSeen = Date.now();

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: ` تهانينا! تم تدشين "${s.airport.name}" ودخول عالم الطيران الدولي بنجاح!`,
      airport: s.airport,
      cash: s.cash,
      bank: s.bank,
      netWorth: s.netWorth
    };
  });

  // 2. POST /api/airport/rename (Customize Airport Name)
  fastify.post('/api/airport/rename', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.airport || !s.airport.unlocked) {
      return reply.code(400).send({ error: 'يجب فتح المطار أولاً لتعديل اسمه.' });
    }

    const { name } = request.body || {};
    const cleanName = (name || '').toString().trim();
    if (cleanName.length < 3 || cleanName.length > 40) {
      return reply.code(400).send({ error: 'اسم المطار يجب أن يكون بين 3 و 40 حرفاً.' });
    }

    s.airport.name = cleanName;
    s.lastActiveTimestamp = Date.now();
    s.lastSeen = Date.now();
    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: 'تم تحديث اسم المطار بنجاح!',
      name: s.airport.name
    };
  });

  // 3. POST /api/airport/upgrade (Upgrade Facility)
  fastify.post('/api/airport/upgrade', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.airport || !s.airport.unlocked) {
      return reply.code(400).send({ error: 'المطار غير مفعل.' });
    }

    const { facilityId } = request.body || {};
    const facility = AIRPORT_FACILITIES[facilityId];
    if (!facility) {
      return reply.code(400).send({ error: 'المنشأة غير صالحة.' });
    }

    const curLvl = Number(s.airport.facilities[facilityId] || (facilityId === 'duty_free' ? 0 : 1));
    const nextLvl = curLvl + 1;

    if (!facility.levels[nextLvl]) {
      return reply.code(400).send({ error: 'وصلت المنشأة إلى أقصى مستوى تطوير!' });
    }

    const cost = Number(facility.levels[nextLvl].cost || 0);
    const curCash = Number(s.cash || 0);
    const curBank = Number(s.bank || 0);

    if (curCash + curBank < cost) {
      return reply.code(400).send({
        error: ` رصيدك غير كافٍ للترقية إلى مستوى ${nextLvl} (${cost.toLocaleString()} ج.م)`
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

    s.airport.facilities[facilityId] = nextLvl;
    s.netWorth = calculateNetWorth(s);
    s.lastActiveTimestamp = Date.now();
    s.lastSeen = Date.now();

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: `تمت ترقية "${facility.name}" إلى المستوى ${nextLvl} بنجاح!`,
      airport: s.airport,
      cash: s.cash,
      bank: s.bank,
      netWorth: s.netWorth
    };
  });

  // 4. POST /api/airport/buy-plane (Purchase Aircraft)
  fastify.post('/api/airport/buy-plane', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.airport || !s.airport.unlocked) {
      return reply.code(400).send({ error: 'المطار غير مفعل.' });
    }

    const { modelId, customName } = request.body || {};
    const model = AIRCRAFT_MODELS[modelId];
    if (!model) {
      return reply.code(400).send({ error: 'طراز الطائرة غير معروف.' });
    }

    const bonuses = getAirportBonuses(s.airport);
    if (model.tier > bonuses.maxPlaneTier) {
      return reply.code(400).send({
        error: ` يتطلب شراء هذه الطائرة ترقية المدرج لاستيعاب الفئة ${model.tier}!`
      });
    }

    const fleet = Array.isArray(s.airport.fleet) ? s.airport.fleet : [];
    if (fleet.length >= 12) {
      return reply.code(400).send({ error: 'وصلت إلى الحد الأقصى لسعة الأسطول (12 طائرة).' });
    }

    const cost = Number(model.cost || 0);
    const curCash = Number(s.cash || 0);
    const curBank = Number(s.bank || 0);

    if (curCash + curBank < cost) {
      return reply.code(400).send({
        error: ` رصيدك غير كافٍ لشراء ${model.name} (${cost.toLocaleString()} ج.م)`
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

    const newPlane = {
      id: 'plane_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      modelId: model.id,
      customName: (customName || '').trim() || `${model.name} #${fleet.length + 1}`,
      status: 'idle',
      totalFlights: 0,
      totalRevenue: 0,
      currentFlight: null,
      activeFlight: null
    };

    s.airport.fleet = fleet;
    s.airport.fleet.push(newPlane);
    s.netWorth = calculateNetWorth(s);
    s.lastActiveTimestamp = Date.now();
    s.lastSeen = Date.now();

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: `تم شراء وإضافة "${newPlane.customName}" إلى أسطولك الجوي بنجاح! `,
      plane: newPlane,
      airport: s.airport,
      cash: s.cash,
      bank: s.bank,
      netWorth: s.netWorth
    };
  });

  // 5. POST /api/airport/launch-flight (Schedule and Takeoff Flight)
  fastify.post('/api/airport/launch-flight', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.airport || !s.airport.unlocked) {
      return reply.code(400).send({ error: 'المطار غير مفعل.' });
    }

    const { planeId, destinationId } = request.body || {};
    const plane = (s.airport.fleet || []).find(p => p.id === planeId);
    if (!plane) {
      return reply.code(404).send({ error: 'الطائرة غير موجودة في أسطولك.' });
    }

    const activeFlightsCount = (s.airport.fleet || []).filter(p => p.status === 'in_flight').length;
    if (activeFlightsCount >= 5) {
      return reply.code(400).send({
        error: ' الحد الأقصى للطيران المتزامن هو 5 طائرات في الجو في نفس الوقت! انتظر هبوط إحدى الطائرات في أسطولك أولاً.'
      });
    }

    if (plane.status === 'in_flight') {
      return reply.code(400).send({ error: 'هذه الطائرة تحلق في رحلة جوية بالفعل!' });
    }

    const dest = FLIGHT_DESTINATIONS[destinationId];
    if (!dest) {
      return reply.code(400).send({ error: 'وجهة السفر غير صالحة.' });
    }

    const model = AIRCRAFT_MODELS[plane.modelId];
    if (!model) {
      return reply.code(400).send({ error: 'بيانات طراز الطائرة غير متطابقة.' });
    }

    if (dest.requiredTier > model.tier) {
      return reply.code(400).send({
        error: ` هذه الوجهة تتطلب طائرة من الفئة ${dest.requiredTier} أو أعلى للوصول إليها!`
      });
    }

    const eco = calculateFlightEconomics(model, dest, s.airport);
    const durationMs = eco.durationSec * 1000;

    const curCash = Number(s.cash || 0);
    const curBank = Number(s.bank || 0);
    const totalLiquid = curCash + curBank;

    if (totalLiquid < eco.totalOperatingCost) {
      return reply.code(400).send({
        error: ` رصيدك غير كافٍ لتغطية تكاليف تجهيز الرحلة (وقود + طاقم + رسوم هبوط: ${eco.totalOperatingCost.toLocaleString()} ج.م)`
      });
    }

    // Deduct operating costs upfront upon flight dispatch
    if (curCash >= eco.totalOperatingCost) {
      s.cash = curCash - eco.totalOperatingCost;
    } else {
      const rem = eco.totalOperatingCost - curCash;
      s.cash = 0;
      s.bank = Math.max(0, curBank - rem);
    }

    const now = Date.now();
    plane.status = 'in_flight';
    plane.activeFlight = {
      flightId: 'flt_' + now + '_' + Math.random().toString(36).slice(2, 7),
      destinationId: dest.id,
      destinationName: dest.name,
      launchTime: now,
      landingTime: now + durationMs,
      durationSec: eco.durationSec,
      grossRevenue: eco.grossRevenue,
      fuelCost: eco.fuelCost,
      fuelDiscountPct: eco.fuelDiscountPct,
      crewCost: eco.crewCost,
      landingFee: eco.landingFee,
      totalOperatingCost: eco.totalOperatingCost,
      expectedProfit: eco.grossRevenue, // gross revenue added to cash on claim
      expectedNetProfit: eco.netProfit,
      expectedXp: eco.xpReward,
      speedupGold: eco.speedupGold || Math.max(1, Math.ceil(eco.durationSec / 600))
    };

    if (!s.airport.stats) s.airport.stats = {};
    s.airport.stats.totalOperatingCost = (Number(s.airport.stats.totalOperatingCost) || 0) + eco.totalOperatingCost;

    s.netWorth = calculateNetWorth(s);
    s.lastActiveTimestamp = Date.now();
    s.lastSeen = Date.now();
    await dbService.savePlayerState(session.username, s);

    const minStr = Math.floor(eco.durationSec / 60);
    return {
      success: true,
      message: ` تم تزويد الطائرة بالوقود وإقلاع الرحلة إلى ${dest.name}! وقت الهبوط المتوقع خلال ${minStr > 0 ? minStr + ' دقيقة' : eco.durationSec + ' ثانية'}. (صافي الربح: +${eco.netProfit.toLocaleString()} ج.م)`,
      plane,
      economics: eco,
      cash: s.cash,
      bank: s.bank,
      airport: s.airport
    };
  });

  // 6. POST /api/airport/speedup-flight (Speedup with Gold - 1 Gold per 10 Minutes)
  fastify.post('/api/airport/speedup-flight', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.airport || !s.airport.unlocked) {
      return reply.code(400).send({ error: 'المطار غير مفعل.' });
    }

    const { planeId } = request.body || {};
    const plane = (s.airport.fleet || []).find(p => p.id === planeId);
    if (!plane || plane.status !== 'in_flight' || !plane.activeFlight) {
      return reply.code(400).send({ error: 'لا توجد رحلة نشطة لهذه الطائرة لتسريعها.' });
    }

    const now = Date.now();
    const landingTime = Number(plane.activeFlight.landingTime || 0);
    const remSec = Math.max(0, Math.ceil((landingTime - now) / 1000));
    if (remSec <= 0) {
      return reply.code(400).send({ error: 'الرحلة انتهت بالفعل وهبطت الطائرة وجاهزة للتحصيل.' });
    }

    // Universal Game Rule: 1 Gold per 10 minutes (600 seconds)
    const goldCost = Math.max(1, Math.ceil(remSec / 600));
    const curGold = Number(s.gold || 0);

    if (curGold < goldCost) {
      return reply.code(400).send({
        error: ` رصيدك من الذهب غير كافٍ (${goldCost} سبيكة ذهب مطلوبة لتسريع الوقت المتبقي: ${Math.ceil(remSec / 60)} دقيقة)`
      });
    }

    s.gold = curGold - goldCost;
    // Set landing time to past so it can be claimed immediately
    plane.activeFlight.landingTime = Date.now() - 1000;
    plane.activeFlight.speedupGold = goldCost;
    s.lastActiveTimestamp = Date.now();
    s.lastSeen = Date.now();

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: ` تم استخدام التوربين النفاث السريع بـ ${goldCost} ذهب! هبطت الطائرة فورياً وجاهزة للتحصيل.`,
      gold: s.gold,
      goldCost,
      plane,
      airport: s.airport
    };
  });

  // 7. POST /api/airport/claim-flight (Collect Flight Revenue - Strictly Deduplicated)
  fastify.post('/api/airport/claim-flight', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.airport || !s.airport.unlocked) {
      return reply.code(400).send({ error: 'المطار غير مفعل.' });
    }

    const { planeId } = request.body || {};
    if (!planeId) {
      return reply.code(400).send({ error: 'معرف الطائرة مطلوب.' });
    }

    // In-memory lock per user & plane to prevent concurrent lag/spam double claims
    const lockKey = `${session.username}_${planeId}`;
    if (_flightClaimLocks.has(lockKey)) {
      return reply.code(429).send({ error: 'جاري معالجة تحصيل هذه الرحلة بالفعل، يرجى الانتظار...' });
    }
    _flightClaimLocks.add(lockKey);

    try {
      const plane = (s.airport.fleet || []).find(p => p.id === planeId);
      if (!plane || plane.status !== 'in_flight' || !plane.activeFlight) {
        return reply.code(400).send({ error: 'لا توجد رحلة جاهزة للهبوط والتحصيل.' });
      }

      const flight = plane.activeFlight;
      const flightId = flight.flightId || ('flt_' + plane.id + '_' + flight.launchTime);
      const now = Date.now();

      // Deduplication check: Has this specific flight already been collected?
      s.airport.claimedFlightIds = Array.isArray(s.airport.claimedFlightIds) ? s.airport.claimedFlightIds : [];
      if (s.airport.claimedFlightIds.includes(flightId) || (plane.lastClaimedFlightId && plane.lastClaimedFlightId === flightId)) {
        plane.status = 'idle';
        plane.activeFlight = null;
        plane.currentFlight = null;
        session.dirty = true;
        await dbService.savePlayerState(session.username, s);
        return reply.code(400).send({
          error: 'تم تحصيل أرباح هذه الرحلة مسبقاً!',
          alreadyClaimed: true,
          airport: s.airport
        });
      }

      // Server-authoritative time check
      if (now < Number(flight.landingTime || 0)) {
        const remSec = Math.ceil((Number(flight.landingTime) - now) / 1000);
        return reply.code(400).send({
          error: ` الطائرة لا تزال في الجو! متبقي على الهبوط: ${remSec} ثانية.`
        });
      }

      const profit = Number(flight.expectedProfit || 0);
      const xpGain = Number(flight.expectedXp || 0);

      s.cash = Math.max(0, Number(s.cash || 0)) + profit;
      s.xp = Math.max(0, Number(s.xp || 0)) + xpGain;

      if (!s.airport.stats) s.airport.stats = { totalFlights: 0, totalRevenue: 0 };
      s.airport.stats.totalFlights = (Number(s.airport.stats.totalFlights) || 0) + 1;
      s.airport.stats.totalRevenue = (Number(s.airport.stats.totalRevenue) || 0) + profit;

      // Mark this flightId as claimed in ledger (keep last 100 flights)
      s.airport.claimedFlightIds.push(flightId);
      if (s.airport.claimedFlightIds.length > 100) {
        s.airport.claimedFlightIds = s.airport.claimedFlightIds.slice(-100);
      }

      // Reset plane to idle with memory of last claimed flight
      plane.lastClaimedFlightId = flightId;
      plane.status = 'idle';
      plane.activeFlight = null;
      plane.currentFlight = null;
      session.dirty = true;

      s.netWorth = calculateNetWorth(s);
      s.title = getAppropriateTitle(s.netWorth, s.xp);
      s.lastActiveTimestamp = Date.now();
      s.lastSeen = Date.now();

      await dbService.savePlayerState(session.username, s);

      return {
        success: true,
        message: ` هبطت الرحلة بنجاح! تم تحصيل ${profit.toLocaleString()} ج.م و +${xpGain} XP`,
        profit,
        xpGain,
        cash: s.cash,
        xp: s.xp,
        plane,
        airport: s.airport,
        netWorth: s.netWorth
      };
    } finally {
      _flightClaimLocks.delete(lockKey);
    }
  });

  // 8. POST /api/airport/claim-duty-free (Collect Duty Free Passive Income)
  fastify.post('/api/airport/claim-duty-free', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.airport || !s.airport.unlocked) {
      return reply.code(400).send({ error: 'المطار غير مفعل.' });
    }

    const lvl = Number(s.airport.facilities?.duty_free || 0);
    if (lvl <= 0) {
      return reply.code(400).send({ error: 'لم يتم تفعيل أو بناء السوق الحرة بمطارك بعد!' });
    }

    const now = Date.now();
    const lastClaim = Number(s.airport.lastDutyFreeCollectionAt || s.airport.unlockedAt || now);
    const elapsedMs = Math.max(0, now - lastClaim);
    const minCooldownMs = 60 * 1000; // 60 seconds minimum interval between collections

    if (s.airport.lastDutyFreeCollectionAt && elapsedMs < minCooldownMs) {
      const remSec = Math.ceil((minCooldownMs - elapsedMs) / 1000);
      return reply.code(400).send({
        error: ` يرجى الانتظار ${remSec} ثانية قبل تحصيل أرباح السوق الحرة التالية.`
      });
    }

    const dutyFreeEarnings = calculateDutyFreeAccumulated(s.airport, now);

    // Strict minimum collection threshold: at least 1,000 EGP to prevent rapid spamming
    if (dutyFreeEarnings < 1000) {
      return reply.code(400).send({
        error: ` الحد الأدنى لتحصيل أرباح السوق الحرة هو 1,000 ج.م (المتراكم حالياً: ${dutyFreeEarnings.toLocaleString()} ج.م).`
      });
    }

    s.cash = Math.max(0, Number(s.cash || 0)) + dutyFreeEarnings;
    s.airport.lastDutyFreeCollectionAt = now;
    if (!s.airport.stats) s.airport.stats = {};
    s.airport.stats.totalDutyFreeCollected = (Number(s.airport.stats.totalDutyFreeCollected) || 0) + dutyFreeEarnings;

    s.netWorth = calculateNetWorth(s);
    s.lastActiveTimestamp = Date.now();
    s.lastSeen = Date.now();

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: ` تم تحصيل أرباح مبيعات السوق الحرة: +${dutyFreeEarnings.toLocaleString()} ج.م!`,
      earnings: dutyFreeEarnings,
      cash: s.cash,
      airport: s.airport,
      netWorth: s.netWorth
    };
  });

  // 9. POST /api/airport/transit (Claim Accumulated Control Tower Transit Fees - 8h Max)
  fastify.post('/api/airport/transit', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.airport || !s.airport.unlocked) {
      return reply.code(400).send({ error: 'المطار غير مفعل.' });
    }

    const now = Date.now();
    const lastCollect = Number(s.airport.lastTransitCollectionAt || s.airport.lastTransitPermitAt || s.airport.unlockedAt || now);
    const elapsedMs = Math.max(0, now - lastCollect);
    const minCooldownMs = 60 * 1000; // 60 seconds minimum interval between collections

    if (s.airport.lastTransitCollectionAt && elapsedMs < minCooldownMs) {
      const remSec = Math.ceil((minCooldownMs - elapsedMs) / 1000);
      return reply.code(400).send({
        error: ` يرجى الانتظار ${remSec} ثانية قبل تحصيل رسوم الترانزيت التالية.`
      });
    }

    const accumulatedFee = calculateTransitAccumulated(s.airport, now);

    // Minimum collection threshold: 500 EGP
    if (accumulatedFee < 500) {
      return reply.code(400).send({
        error: ` الحد الأدنى لتحصيل رسوم الترانزيت هو 500 ج.م (المتراكم حالياً: ${accumulatedFee.toLocaleString()} ج.م).`
      });
    }

    s.cash = Math.max(0, Number(s.cash || 0)) + accumulatedFee;
    s.xp = Math.max(0, Number(s.xp || 0)) + 50;
    s.airport.lastTransitCollectionAt = now;
    s.airport.lastTransitPermitAt = now;

    if (!s.airport.stats) s.airport.stats = {};
    s.airport.stats.transitPermitsAccepted = (Number(s.airport.stats.transitPermitsAccepted) || 0) + 1;
    s.airport.stats.totalTransitFeesCollected = (Number(s.airport.stats.totalTransitFeesCollected) || 0) + accumulatedFee;

    s.netWorth = calculateNetWorth(s);
    s.lastActiveTimestamp = Date.now();
    s.lastSeen = Date.now();

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: ` تم تحصيل رسوم هبوط الترانزيت المتراكمة: +${accumulatedFee.toLocaleString()} ج.م!`,
      fee: accumulatedFee,
      earnings: accumulatedFee,
      cash: s.cash,
      xp: s.xp,
      airport: s.airport,
      netWorth: s.netWorth
    };
  });

  // 10. POST /api/airport/sell-plane (Sell plane for 50% refund)
  fastify.post('/api/airport/sell-plane', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.airport || !s.airport.unlocked) {
      return reply.code(400).send({ error: 'المطار غير مفعل.' });
    }

    const { planeId } = request.body || {};
    const fleet = Array.isArray(s.airport.fleet) ? s.airport.fleet : [];
    const planeIdx = fleet.findIndex(p => p.id === planeId);

    if (planeIdx === -1) {
      return reply.code(404).send({ error: 'الطائرة غير موجودة في أسطولك.' });
    }

    const plane = fleet[planeIdx];
    if (plane.status === 'in_flight') {
      return reply.code(400).send({ error: 'لا يمكن بيع الطائرة وهي في الجو! انتظر هبوطها أولاً.' });
    }

    const model = AIRCRAFT_MODELS[plane.modelId] || AIRCRAFT_MODELS.cessna_sky;
    const refund = Math.floor((model.cost || 8000000) * 0.5);

    // Remove plane from fleet
    fleet.splice(planeIdx, 1);
    s.airport.fleet = fleet;

    // Add refund to cash
    s.cash = Math.max(0, Number(s.cash || 0)) + refund;
    s.netWorth = calculateNetWorth(s);
    s.lastActiveTimestamp = Date.now();
    s.lastSeen = Date.now();

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: ` تم بيع طائرة ${model.name} بنجاح واسترداد +${refund.toLocaleString()} ج.م (50% من سعر الشراء)!`,
      refund,
      cash: s.cash,
      airport: s.airport,
      netWorth: s.netWorth
    };
  });

  // 11. POST /api/airport/hire-manager (Hire Tier 1 Airport Manager for 100M Cash)
  fastify.post('/api/airport/hire-manager', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.airport || !s.airport.unlocked) {
      return reply.code(400).send({ error: 'المطار غير مفعل لديك.' });
    }

    const currentTier = Number(s.airport.manager?.tier || 0);
    if (currentTier >= 1) {
      return reply.code(400).send({ error: 'لديك مدير مطار معين بالفعل! يمكنك الترقية لمستويات أعلى عبر باقات VIP المتجر.' });
    }

    const HIRE_COST = 100000000; // 100,000,000 EGP (100 Million)
    const currentCash = Number(s.cash || 0);
    if (currentCash < HIRE_COST) {
      return reply.code(400).send({
        error: `رصيدك الكاش غير كافٍ! تكلفة توظيف مساعد مدير المطار (Tier 1) هي ${HIRE_COST.toLocaleString()} ج.م.`
      });
    }

    // Deduct cash and assign manager
    s.cash = currentCash - HIRE_COST;
    s.airport.manager = {
      tier: 1,
      name: 'كابتن ليام - مساعد مدير العمليات ',
      title: 'مساعد مدير العمليات الجوية',
      profitBonusPct: 5,
      costDiscountPct: 0,
      autoPilot: false,
      hiredAt: Date.now()
    };

    s.netWorth = calculateNetWorth(s);
    s.lastActiveTimestamp = Date.now();
    s.lastSeen = Date.now();

    // Log in activity
    if (!Array.isArray(s.activityLog)) s.activityLog = [];
    s.activityLog.unshift({
      action: 'توظيف مساعد مدير المطار ',
      details: 'تم تعيين كابتن ليام كمساعد لمدير العمليات الجوية (Tier 1) بنجاح (+5% أرباح على كافة الرحلات).',
      category: 'airport',
      timestamp: Date.now(),
      amount: -HIRE_COST,
      cash: s.cash,
      bank: s.bank
    });
    if (s.activityLog.length > 3500) s.activityLog.length = 3500;

    sessionManager.markDirty(session.username);
    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: ' تهانينا! تم تعيين مساعد مدير المطار (كابتن ليام) بنجاح! تم تفعيل بونص +5% أرباح على كافة الرحلات الجوية.',
      airport: s.airport,
      cash: s.cash,
      netWorth: s.netWorth
    };
  });

  // 12. POST /api/airport/toggle-autopilot (Toggle Smart Auto-Pilot for Tier 3 Manager)
  fastify.post('/api/airport/toggle-autopilot', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.airport || !s.airport.unlocked) {
      return reply.code(400).send({ error: 'المطار غير مفعل لديك.' });
    }

    const tier = Number(s.airport.manager?.tier || 0);
    if (tier < 3) {
      return reply.code(403).send({
        error: 'خاصية التشغيل التلقائي الذكي (Smart Auto-Pilot) تتطلب المدير التنفيذي العام للمطار (Tier 3).'
      });
    }

    const { enabled } = request.body || {};
    const newStatus = typeof enabled === 'boolean' ? enabled : !(s.airport.manager.autoPilot !== false);
    s.airport.manager.autoPilot = newStatus;

    s.lastActiveTimestamp = Date.now();
    s.lastSeen = Date.now();

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: newStatus ? ' تم تفعيل الطيار الآلي الذكي للمطار بنجاح!' : '⏸ تم إيقاف الطيار الآلي مؤقتاً.',
      autoPilot: newStatus,
      airport: s.airport
    };
  });
}

module.exports = airportRoutes;
