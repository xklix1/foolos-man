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
  calculateDutyFreeAccumulated
} = require('../engine/airport-engine');
const { calculateNetWorth, getAppropriateTitle } = require('../engine/net-worth-engine');
const sessionManager = require('../services/session-manager');
const dbService = require('../services/db-service');

async function airportRoutes(fastify, options) {

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

    if (session.sessionToken && (!effectiveToken || effectiveToken !== session.sessionToken)) {
      reply.code(401).send({ error: 'Unauthorized: Invalid session token' });
      return null;
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
      unlock_cost: 50000000,
      min_xp: 2500,
      is_active: true
    };
  }

  // 1. POST /api/airport/unlock (Unlock with Dynamic Access Code)
  fastify.post('/api/airport/unlock', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (s.airport && s.airport.unlocked) {
      return reply.code(400).send({ error: 'المطار مفعل بالفعل في حسابك!' });
    }

    const { code, airportName } = request.body || {};
    const inputCode = (code || '').toString().trim().toUpperCase();

    const settings = await getDynamicAirportSettings();
    if (!settings.is_active) {
      return reply.code(403).send({ error: 'مشروع المطار غير مفعل حالياً من إدارة اللعبة.' });
    }

    const expectedCode = (settings.unlock_code || 'SKY-ROYAL-2026').trim().toUpperCase();
    if (!inputCode || inputCode !== expectedCode) {
      return reply.code(403).send({
        error: '🚫 كود تصريح الطيران غير صحيح! يرجى الحصول على كود تفعيل المطار المعتمد.'
      });
    }

    const minXp = Number(settings.min_xp || 2500);
    if (Number(s.xp || 0) < minXp) {
      return reply.code(400).send({
        error: `🚫 يتطلب فتح المطار خبرة لا تقل عن ${minXp.toLocaleString()} XP (خبرتك الحالية: ${Number(s.xp || 0).toLocaleString()} XP)`
      });
    }

    const cost = Number(settings.unlock_cost || 50000000);
    const curCash = Number(s.cash || 0);
    const curBank = Number(s.bank || 0);

    if (curCash + curBank < cost) {
      return reply.code(400).send({
        error: `🚫 رصيدك غير كافٍ لدفع رسوم رخصة المطار (${cost.toLocaleString()} ج.م)`
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
    s.adminModifiedTimestamp = Date.now() + 120000;

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: `🎉 تهانينا! تم تدشين "${s.airport.name}" ودخول عالم الطيران الدولي بنجاح!`,
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
    s.adminModifiedTimestamp = Date.now() + 60000;
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
        error: `🚫 رصيدك غير كافٍ للترقية إلى مستوى ${nextLvl} (${cost.toLocaleString()} ج.م)`
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
    s.adminModifiedTimestamp = Date.now() + 60000;

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
        error: `🚫 يتطلب شراء هذه الطائرة ترقية المدرج لاستيعاب الفئة ${model.tier}!`
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
        error: `🚫 رصيدك غير كافٍ لشراء ${model.name} (${cost.toLocaleString()} ج.م)`
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
      activeFlight: null
    };

    s.airport.fleet.push(newPlane);
    s.netWorth = calculateNetWorth(s);
    s.adminModifiedTimestamp = Date.now() + 60000;

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: `تم شراء وإضافة "${newPlane.customName}" إلى أسطولك الجوي بنجاح! 🛩️`,
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
        error: `🚫 هذه الوجهة تتطلب طائرة من الفئة ${dest.requiredTier} أو أعلى للوصول إليها!`
      });
    }

    const bonuses = getAirportBonuses(s.airport);
    const rawTimeSec = model.baseFlightTimeSec * dest.distanceMultiplier;
    const durationSec = Math.max(20, Math.round(rawTimeSec * (1 - bonuses.timeReduction)));
    const durationMs = durationSec * 1000;

    const expectedProfit = Math.round(model.baseProfit * dest.distanceMultiplier * bonuses.ticketBonus);
    const expectedXp = Math.round(model.baseXp * dest.distanceMultiplier);

    const now = Date.now();
    plane.status = 'in_flight';
    plane.activeFlight = {
      flightId: 'flt_' + now + '_' + Math.random().toString(36).slice(2, 7),
      destinationId: dest.id,
      destinationName: dest.name,
      launchTime: now,
      landingTime: now + durationMs,
      durationSec,
      expectedProfit,
      expectedXp,
      speedupGold: model.speedupGold || 5
    };

    s.adminModifiedTimestamp = Date.now() + 60000;
    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: `🛫 أقلعت الرحلة المتجهة إلى ${dest.name}! وقت الهبوط المتوقع خلال ${durationSec} ثانية.`,
      plane,
      airport: s.airport
    };
  });

  // 6. POST /api/airport/speedup-flight (Speedup with Gold)
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

    const goldCost = Number(plane.activeFlight.speedupGold || 5);
    const curGold = Number(s.gold || 0);

    if (curGold < goldCost) {
      return reply.code(400).send({
        error: `🚫 رصيدك من الذهب غير كافٍ (${goldCost} سبيكة ذهب مطلوبة)`
      });
    }

    s.gold = curGold - goldCost;
    // Set landing time to past so it can be claimed immediately
    plane.activeFlight.landingTime = Date.now() - 1000;
    s.adminModifiedTimestamp = Date.now() + 60000;

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: `⚡ تم استخدام التوربين النفاث السريع بـ ${goldCost} ذهب! هبطت الطائرة فورياً وجاهزة للتحصيل.`,
      gold: s.gold,
      plane,
      airport: s.airport
    };
  });

  // 7. POST /api/airport/claim-flight (Collect Flight Revenue)
  fastify.post('/api/airport/claim-flight', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.airport || !s.airport.unlocked) {
      return reply.code(400).send({ error: 'المطار غير مفعل.' });
    }

    const { planeId } = request.body || {};
    const plane = (s.airport.fleet || []).find(p => p.id === planeId);
    if (!plane || plane.status !== 'in_flight' || !plane.activeFlight) {
      return reply.code(400).send({ error: 'لا توجد رحلة جاهزة للهبوط والتحصيل.' });
    }

    const flight = plane.activeFlight;
    const now = Date.now();

    // Server-authoritative time check
    if (now < Number(flight.landingTime || 0)) {
      const remSec = Math.ceil((Number(flight.landingTime) - now) / 1000);
      return reply.code(400).send({
        error: `⏳ الطائرة لا تزال في الجو! متبقي على الهبوط: ${remSec} ثانية.`
      });
    }

    const profit = Number(flight.expectedProfit || 0);
    const xpGain = Number(flight.expectedXp || 0);

    s.cash = Math.max(0, Number(s.cash || 0)) + profit;
    s.xp = Math.max(0, Number(s.xp || 0)) + xpGain;

    if (!s.airport.stats) s.airport.stats = { totalFlights: 0, totalRevenue: 0 };
    s.airport.stats.totalFlights = (Number(s.airport.stats.totalFlights) || 0) + 1;
    s.airport.stats.totalRevenue = (Number(s.airport.stats.totalRevenue) || 0) + profit;

    // Reset plane to idle
    plane.status = 'idle';
    plane.activeFlight = null;

    s.netWorth = calculateNetWorth(s);
    s.title = getAppropriateTitle(s.netWorth, s.xp);
    s.adminModifiedTimestamp = Date.now() + 60000;

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: `🛬 هبطت الرحلة بنجاح! تم تحصيل ${profit.toLocaleString()} ج.م و +${xpGain} XP`,
      profit,
      xpGain,
      cash: s.cash,
      xp: s.xp,
      plane,
      airport: s.airport,
      netWorth: s.netWorth
    };
  });

  // 8. POST /api/airport/claim-duty-free (Collect Duty Free Passive Income)
  fastify.post('/api/airport/claim-duty-free', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.airport || !s.airport.unlocked) {
      return reply.code(400).send({ error: 'المطار غير مفعل.' });
    }

    const now = Date.now();
    const dutyFreeEarnings = calculateDutyFreeAccumulated(s.airport, now);

    if (dutyFreeEarnings <= 0) {
      return reply.code(400).send({ error: 'لا توجد أرباح سوق حرة متراكمة حالياً للتحصيل.' });
    }

    s.cash = Math.max(0, Number(s.cash || 0)) + dutyFreeEarnings;
    s.airport.lastDutyFreeCollectionAt = now;
    if (!s.airport.stats) s.airport.stats = {};
    s.airport.stats.totalDutyFreeCollected = (Number(s.airport.stats.totalDutyFreeCollected) || 0) + dutyFreeEarnings;

    s.netWorth = calculateNetWorth(s);
    s.adminModifiedTimestamp = Date.now() + 60000;

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: `🛍️ تم تحصيل أرباح مبيعات السوق الحرة: +${dutyFreeEarnings.toLocaleString()} ج.م!`,
      earnings: dutyFreeEarnings,
      cash: s.cash,
      airport: s.airport,
      netWorth: s.netWorth
    };
  });

  // 9. POST /api/airport/transit (Accept Transit Flight Permit)
  fastify.post('/api/airport/transit', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    if (!s.airport || !s.airport.unlocked) {
      return reply.code(400).send({ error: 'المطار غير مفعل.' });
    }

    // Transit fee between 1,200,000 and 3,500,000
    const fee = Math.floor(1200000 + Math.random() * 2300000);
    s.cash = Math.max(0, Number(s.cash || 0)) + fee;
    s.xp = Math.max(0, Number(s.xp || 0)) + 75;

    if (!s.airport.stats) s.airport.stats = {};
    s.airport.stats.transitPermitsAccepted = (Number(s.airport.stats.transitPermitsAccepted) || 0) + 1;

    s.netWorth = calculateNetWorth(s);
    s.adminModifiedTimestamp = Date.now() + 60000;

    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      message: `✈️ تم منح تصريح الهبوط والتزود بالوقود للطائرة الدولية! تم تحصيل رسوم ترانزيت: +${fee.toLocaleString()} ج.م`,
      fee,
      cash: s.cash,
      xp: s.xp,
      airport: s.airport,
      netWorth: s.netWorth
    };
  });
}

module.exports = airportRoutes;
