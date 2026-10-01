/**
 * Ras ALmal Tycoon — Authoritative Airport & Aviation Engine
 * 100% Server-Authoritative Logic for the International Airport Hub
 */

const AIRPORT_FACILITIES = {
  runway: {
    id: 'runway',
    name: 'مدرج الطائرات الرئيسي 🛫',
    icon: 'fa-road',
    desc: 'يحدد سعة وحجم الطائرات المسموح بهبوطها وإقلاعها',
    levels: {
      1: { name: 'مدرج إقليمي معبد', cost: 0, maxPlaneTier: 1, desc: 'يستوعب طائرات خفيفة' },
      2: { name: 'مدرج دولي عريض', cost: 35000000, maxPlaneTier: 2, desc: 'يستوعب طائرات ركاب إقليمية (A320)' },
      3: { name: 'مدرج عابر للقارات متطور', cost: 120000000, maxPlaneTier: 3, desc: 'يستوعب طائرات عابرة للقارات (B777/A380)' },
      4: { name: 'مجمع مدارج ذكي مع أنظمة ملاحة CAT III', cost: 450000000, maxPlaneTier: 4, desc: 'يستوعب طائرات VIP وشحن عملاقة' }
    }
  },
  terminals: {
    id: 'terminals',
    name: 'صالات الركاب الدولية 🏢',
    icon: 'fa-building-columns',
    desc: 'ترفع من سعة المسافرين وعوائد التذاكر ورسوم السفر',
    levels: {
      1: { name: 'صالة ركاب أساسية', cost: 0, ticketBonus: 1.0, desc: 'رسوم تذاكر قياسية' },
      2: { name: 'مبنى صالات دولي حديث', cost: 25000000, ticketBonus: 1.35, desc: '+35% أرباح تذاكر الرحلات' },
      3: { name: 'صالة كبار الشخصيات والدرجة الأولى VIP', cost: 95000000, ticketBonus: 1.75, desc: '+75% أرباح تذاكر + بونص XP' },
      4: { name: 'مدينة مطار عالمية متكاملة', cost: 350000000, ticketBonus: 2.30, desc: '+130% أرباح تذاكر مضاعفة' }
    }
  },
  hangar: {
    id: 'hangar',
    name: 'حوض الصيانة والتزود بالوقود 🛠️',
    icon: 'fa-wrench',
    desc: 'يقلل زمن الرحلات ويسرع من جاهزية الطائرات',
    levels: {
      1: { name: 'مرآب صيانة يدوي', cost: 0, timeReduction: 0, desc: 'زمن رحلات قياسي' },
      2: { name: 'حوض فحص وصيانة دورية سريع', cost: 20000000, timeReduction: 0.15, desc: 'تقليص زمن الرحلات بنسبة 15%' },
      3: { name: 'مركز نفاثات وتزويد وقود توربيني فائق', cost: 80000000, timeReduction: 0.30, desc: 'تقليص زمن الرحلات بنسبة 30%' },
      4: { name: 'روبوتات صيانة ومستودع وقود طيران استراتيجي', cost: 280000000, timeReduction: 0.45, desc: 'تقليص زمن الرحلات بنسبة 45%' }
    }
  },
  duty_free: {
    id: 'duty_free',
    name: 'السوق الحرة ومتاجر الترانزيت 🛍️',
    icon: 'fa-store',
    desc: 'تدر دخلاً سلبياً مستمراً يتزايد مع كل رحلة تطلقها',
    levels: {
      1: { name: 'أكشاك هدايا وتذكارات', cost: 15000000, passivePerMin: 2500, desc: 'دخل سلبي: 2,500 ج.م/دقيقة' },
      2: { name: 'مجمع عطور وساعات سويسرية', cost: 55000000, passivePerMin: 12000, desc: 'دخل سلبي: 12,000 ج.م/دقيقة' },
      3: { name: 'مول ماركات عالمية وأزياء راقية', cost: 160000000, passivePerMin: 45000, desc: 'دخل سلبي: 45,000 ج.م/دقيقة' },
      4: { name: 'صالة مزادات مجوهرات وسيارات فاخرة VIP', cost: 500000000, passivePerMin: 150000, desc: 'دخل سلبي: 150,000 ج.م/دقيقة' }
    }
  }
};

const AIRCRAFT_MODELS = {
  cessna_sky: {
    id: 'cessna_sky',
    name: 'Cessna Sky Courier 🛩️',
    tier: 1,
    cost: 5000000,
    goldCost: 0,
    capacity: 'ركاب VIP (8 ركاب)',
    baseFlightTimeSec: 60, // 1 min
    baseProfit: 450000,
    baseXp: 40,
    speedupGold: 2,
    icon: 'fa-plane'
  },
  airbus_a320: {
    id: 'airbus_a320',
    name: 'Airbus A320neo ✈️',
    tier: 2,
    cost: 28000000,
    goldCost: 0,
    capacity: '180 راكب',
    baseFlightTimeSec: 180, // 3 mins
    baseProfit: 2200000,
    baseXp: 180,
    speedupGold: 5,
    icon: 'fa-plane-departure'
  },
  boeing_777: {
    id: 'boeing_777',
    name: 'Boeing 777-300ER 🌐',
    tier: 3,
    cost: 85000000,
    goldCost: 0,
    capacity: '390 راكب',
    baseFlightTimeSec: 360, // 6 mins
    baseProfit: 6800000,
    baseXp: 550,
    speedupGold: 10,
    icon: 'fa-plane'
  },
  airbus_a380: {
    id: 'airbus_a380',
    name: 'Airbus A380 Superjumbo 🏰✈️',
    tier: 3,
    cost: 220000000,
    goldCost: 0,
    capacity: '615 راكب (طابقين)',
    baseFlightTimeSec: 600, // 10 mins
    baseProfit: 18500000,
    baseXp: 1500,
    speedupGold: 18,
    icon: 'fa-jet-fighter-up'
  },
  gulfstream_g650: {
    id: 'gulfstream_g650',
    name: 'Gulfstream G650 VIP Jet 👑🛩️',
    tier: 4,
    cost: 140000000,
    goldCost: 0,
    capacity: 'مليونيرات ورجال أعمال VIP',
    baseFlightTimeSec: 240, // 4 mins
    baseProfit: 12000000,
    baseXp: 1100,
    speedupGold: 12,
    icon: 'fa-crown'
  },
  cargo_beluga: {
    id: 'cargo_beluga',
    name: 'Airbus BelugaXL Heavy Cargo 📦✈️',
    tier: 4,
    cost: 180000000,
    goldCost: 0,
    capacity: '50 طن بضائع ومعدات فائقة',
    baseFlightTimeSec: 300, // 5 mins
    baseProfit: 15000000,
    baseXp: 1300,
    speedupGold: 15,
    icon: 'fa-box-open'
  }
};

const FLIGHT_DESTINATIONS = {
  cairo_riyadh: {
    id: 'cairo_riyadh',
    name: 'الرياض 🇸🇦',
    distanceMultiplier: 1.0,
    requiredTier: 1,
    city: 'Riyadh'
  },
  cairo_dubai: {
    id: 'cairo_dubai',
    name: 'دبي 🇦🇪',
    distanceMultiplier: 1.2,
    requiredTier: 1,
    city: 'Dubai'
  },
  cairo_istanbul: {
    id: 'cairo_istanbul',
    name: 'إسطنبول 🇹🇷',
    distanceMultiplier: 1.4,
    requiredTier: 2,
    city: 'Istanbul'
  },
  cairo_london: {
    id: 'cairo_london',
    name: 'لندن 🇬🇧',
    distanceMultiplier: 1.8,
    requiredTier: 2,
    city: 'London'
  },
  cairo_paris: {
    id: 'cairo_paris',
    name: 'باريس 🇫🇷',
    distanceMultiplier: 2.0,
    requiredTier: 2,
    city: 'Paris'
  },
  cairo_newyork: {
    id: 'cairo_newyork',
    name: 'نيويورك 🇺🇸',
    distanceMultiplier: 2.8,
    requiredTier: 3,
    city: 'New York'
  },
  cairo_tokyo: {
    id: 'cairo_tokyo',
    name: 'طوكيو 🇯🇵',
    distanceMultiplier: 3.2,
    requiredTier: 3,
    city: 'Tokyo'
  }
};

/**
 * Initializes a new airport state for a player
 */
function createInitialAirportState(customName = '') {
  return {
    unlocked: true,
    unlockedAt: Date.now(),
    name: (customName || '').trim() || 'مطار رأس المال الدولي',
    facilities: {
      runway: 1,
      terminals: 1,
      hangar: 1,
      duty_free: 0
    },
    fleet: [
      {
        id: 'plane_' + Date.now() + '_1',
        modelId: 'cessna_sky',
        customName: 'نسر 1',
        status: 'idle', // 'idle' | 'in_flight'
        activeFlight: null
      }
    ],
    stats: {
      totalFlights: 0,
      totalRevenue: 0,
      totalDutyFreeCollected: 0,
      transitPermitsAccepted: 0
    },
    lastDutyFreeCollectionAt: Date.now(),
    transitPermit: null // Active transient flight offer if any
  };
}

/**
 * Calculates current airport facility multipliers
 */
function getAirportBonuses(airportState) {
  if (!airportState || !airportState.unlocked) {
    return { ticketBonus: 1.0, timeReduction: 0, maxPlaneTier: 1, passivePerMin: 0 };
  }
  const f = airportState.facilities || {};
  const runwayLvl = f.runway || 1;
  const terminalLvl = f.terminals || 1;
  const hangarLvl = f.hangar || 1;
  const dutyFreeLvl = f.duty_free || 0;

  const maxPlaneTier = AIRPORT_FACILITIES.runway.levels[runwayLvl]?.maxPlaneTier || 1;
  const ticketBonus = AIRPORT_FACILITIES.terminals.levels[terminalLvl]?.ticketBonus || 1.0;
  const timeReduction = AIRPORT_FACILITIES.hangar.levels[hangarLvl]?.timeReduction || 0;
  const passivePerMin = dutyFreeLvl > 0 ? (AIRPORT_FACILITIES.duty_free.levels[dutyFreeLvl]?.passivePerMin || 0) : 0;

  return { ticketBonus, timeReduction, maxPlaneTier, passivePerMin };
}

/**
 * Calculates accumulated duty-free income
 */
function calculateDutyFreeAccumulated(airportState, nowMs = Date.now()) {
  if (!airportState || !airportState.unlocked || !airportState.facilities?.duty_free) return 0;
  const lvl = airportState.facilities.duty_free;
  const ratePerMin = AIRPORT_FACILITIES.duty_free.levels[lvl]?.passivePerMin || 0;
  if (ratePerMin <= 0) return 0;

  const lastTime = Number(airportState.lastDutyFreeCollectionAt || airportState.unlockedAt || nowMs);
  const elapsedMinutes = Math.max(0, (nowMs - lastTime) / (60 * 1000));
  // Cap at 8 hours max accumulation
  const cappedMinutes = Math.min(8 * 60, elapsedMinutes);
  return Math.floor(cappedMinutes * ratePerMin);
}

module.exports = {
  AIRPORT_FACILITIES,
  AIRCRAFT_MODELS,
  FLIGHT_DESTINATIONS,
  createInitialAirportState,
  getAirportBonuses,
  calculateDutyFreeAccumulated
};
