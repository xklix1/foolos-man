/**
 * Ras ALmal Tycoon — Authoritative Airport & Aviation Engine
 * 100% Server-Authoritative Logic for the International Airport Hub
 * Balanced 7-Day ROI Economy with Realistic Operating Costs (Fuel, Crew, Landing Fees)
 */

const AIRPORT_FACILITIES = {
  runway: {
    id: 'runway',
    name: 'مدرج الطائرات الرئيسي 🛫',
    icon: 'fa-road',
    desc: 'يحدد سعة وحجم الطائرات المسموح بهبوطها وإقلاعها',
    levels: {
      1: { name: 'مدرج إقليمي معبد', cost: 0, maxPlaneTier: 1, desc: 'يستوعب طائرات الفئة 1 (Cessna VIP)' },
      2: { name: 'مدرج دولي عريض', cost: 12000000, maxPlaneTier: 2, desc: 'يستوعب طائرات الفئة 2 (Airbus A320)' },
      3: { name: 'مدرج عابر للقارات متطور', cost: 40000000, maxPlaneTier: 3, desc: 'يستوعب طائرات الفئة 3 (B777 / A380)' },
      4: { name: 'مجمع مدارج ذكي CAT III', cost: 95000000, maxPlaneTier: 4, desc: 'يستوعب طائرات الفئة 4 (Gulfstream VIP / Beluga Cargo)' }
    }
  },
  terminals: {
    id: 'terminals',
    name: 'صالات الركاب الدولية 🏢',
    icon: 'fa-building-columns',
    desc: 'ترفع من سعة المسافرين وعوائد تذاكر الرحلات',
    levels: {
      1: { name: 'صالة ركاب أساسية', cost: 0, ticketBonus: 1.0, desc: 'رسوم تذاكر قياسية' },
      2: { name: 'مبنى صالات دولي حديث', cost: 10000000, ticketBonus: 1.30, desc: '+30% أرباح تذاكر الرحلات' },
      3: { name: 'صالة كبار الشخصيات VIP والدرجة الأولى', cost: 35000000, ticketBonus: 1.70, desc: '+70% أرباح تذاكر + بونص XP' },
      4: { name: 'مدينة مطار عالمية متكاملة', cost: 85000000, ticketBonus: 2.20, desc: '+120% أرباح تذاكر مضاعفة' }
    }
  },
  hangar: {
    id: 'hangar',
    name: 'حوض الصيانة وخزانات الوقود 🛠️⛽',
    icon: 'fa-wrench',
    desc: 'يقلل زمن الرحلات ويمنح خصماً استراتيجياً على أسعار وقود الطائرات',
    levels: {
      1: { name: 'مرآب صيانة يدوي', cost: 0, timeReduction: 0, fuelDiscount: 0, desc: 'زمن رحلات وتكلفة وقود قياسية' },
      2: { name: 'حوض فحص سريع ومضخات نفاثة', cost: 10000000, timeReduction: 0.15, fuelDiscount: 0.10, desc: '-15% زمن الرحلات و -10% تكلفة الوقود' },
      3: { name: 'مركز نفاثات ومستودع وقود توربيني', cost: 30000000, timeReduction: 0.30, fuelDiscount: 0.20, desc: '-30% زمن الرحلات و -20% تكلفة الوقود' },
      4: { name: 'روبوتات صيانة ومستودع وقود استراتيجي', cost: 75000000, timeReduction: 0.45, fuelDiscount: 0.30, desc: '-45% زمن الرحلات و -30% تكلفة الوقود' }
    }
  },
  duty_free: {
    id: 'duty_free',
    name: 'السوق الحرة ومتاجر الترانزيت 🛍️',
    icon: 'fa-store',
    desc: 'تدر دخلاً سلبياً مستمراً ومتزناً على مدار الساعة',
    levels: {
      1: { name: 'أكشاك هدايا وتذكارات', cost: 5000000, passivePerMin: 500, desc: 'دخل سلبي: 500 ج.م/دقيقة (30,000 ج.م/ساعة)' },
      2: { name: 'مجمع عطور وساعات سويسرية', cost: 18000000, passivePerMin: 2000, desc: 'دخل سلبي: 2,000 ج.م/دقيقة (120,000 ج.م/ساعة)' },
      3: { name: 'مول ماركات عالمية وأزياء راقية', cost: 50000000, passivePerMin: 6000, desc: 'دخل سلبي: 6,000 ج.م/دقيقة (360,000 ج.م/ساعة)' },
      4: { name: 'صالة مزادات مجوهرات وسيارات VIP', cost: 120000000, passivePerMin: 15000, desc: 'دخل سلبي: 15,000 ج.م/دقيقة (900,000 ج.م/ساعة)' }
    }
  }
};

const AIRCRAFT_MODELS = {
  cessna_sky: {
    id: 'cessna_sky',
    name: 'Cessna Sky Courier 🛩️',
    tier: 1,
    cost: 3000000,
    goldCost: 0,
    capacity: '8 ركاب VIP',
    baseFlightTimeSec: 7200, // 2 hours
    baseRevenue: 300000,
    fuelCost: 45000,
    crewCost: 30000,
    landingFee: 25000,
    baseNetProfit: 200000,
    baseXp: 75,
    speedupGold: 2,
    icon: 'fa-plane',
    desc: 'طائرة خفيفة للمسافات الإقليمية ورجال الأعمال (رحلة ساعتان)'
  },
  airbus_a320: {
    id: 'airbus_a320',
    name: 'Airbus A320neo ✈️',
    tier: 2,
    cost: 15000000,
    goldCost: 0,
    capacity: '180 مسافر',
    baseFlightTimeSec: 14400, // 4 hours
    baseRevenue: 1350000,
    fuelCost: 240000,
    crewCost: 140000,
    landingFee: 120000,
    baseNetProfit: 850000,
    baseXp: 220,
    speedupGold: 5,
    icon: 'fa-plane-departure',
    desc: 'طائرة ركاب دولية عالية الكفاءة للمسافات المتوسطة (رحلة 4 ساعات)'
  },
  boeing_777: {
    id: 'boeing_777',
    name: 'Boeing 777-300ER 🌐',
    tier: 3,
    cost: 55000000,
    goldCost: 0,
    capacity: '390 مسافر',
    baseFlightTimeSec: 21600, // 6 hours
    baseRevenue: 4800000,
    fuelCost: 750000,
    crewCost: 500000,
    landingFee: 350000,
    baseNetProfit: 3200000,
    baseXp: 800,
    speedupGold: 10,
    icon: 'fa-plane',
    desc: 'طائر عملاق عابر للقارات للرحلات الدولية الطويلة (رحلة 6 ساعات)'
  },
  gulfstream_g650: {
    id: 'gulfstream_g650',
    name: 'Gulfstream G650 VIP Jet 👑🛩️',
    tier: 4,
    cost: 85000000,
    goldCost: 0,
    capacity: 'نخبة رجال الأعمال والأمراء VIP',
    baseFlightTimeSec: 28800, // 8 hours
    baseRevenue: 7000000,
    fuelCost: 950000,
    crewCost: 600000,
    landingFee: 450000,
    baseNetProfit: 5000000,
    baseXp: 650,
    speedupGold: 10,
    icon: 'fa-crown',
    desc: 'طائرة نفاثة فاخرة لنقل كبار الشخصيات بعوائد قياسية (رحلة 8 ساعات)'
  },
  cargo_beluga: {
    id: 'cargo_beluga',
    name: 'Airbus BelugaXL Heavy Cargo 📦✈️',
    tier: 4,
    cost: 125000000,
    goldCost: 0,
    capacity: '50 طن بضائع ومعدات ثقيلة',
    baseFlightTimeSec: 36000, // 10 hours
    baseRevenue: 11000000,
    fuelCost: 1800000,
    crewCost: 950000,
    landingFee: 750000,
    baseNetProfit: 7500000,
    baseXp: 1200,
    speedupGold: 14,
    icon: 'fa-box-open',
    desc: 'وحش الشحن الجوي العملاق لنقل الشحنات الفاخرة حول العالم (رحلة 10 ساعات)'
  },
  airbus_a380: {
    id: 'airbus_a380',
    name: 'Airbus A380 Superjumbo 🏰✈️',
    tier: 3,
    cost: 220000000,
    goldCost: 0,
    capacity: '615 مسافر (طابقين)',
    baseFlightTimeSec: 50400, // 14 hours
    baseRevenue: 23000000,
    fuelCost: 3400000,
    crewCost: 2100000,
    landingFee: 1500000,
    baseNetProfit: 16000000,
    baseXp: 2000,
    speedupGold: 18,
    icon: 'fa-jet-fighter-up',
    desc: 'القلعة الطائرة ذات الطابقين.. أضخم طائرة ركاب في العالم (رحلة 14 ساعة)'
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
    distanceMultiplier: 1.25,
    requiredTier: 1,
    city: 'Dubai'
  },
  cairo_istanbul: {
    id: 'cairo_istanbul',
    name: 'إسطنبول 🇹🇷',
    distanceMultiplier: 1.5,
    requiredTier: 2,
    city: 'Istanbul'
  },
  cairo_london: {
    id: 'cairo_london',
    name: 'لندن 🇬🇧',
    distanceMultiplier: 2.0,
    requiredTier: 2,
    city: 'London'
  },
  cairo_paris: {
    id: 'cairo_paris',
    name: 'باريس 🇫🇷',
    distanceMultiplier: 2.2,
    requiredTier: 2,
    city: 'Paris'
  },
  cairo_newyork: {
    id: 'cairo_newyork',
    name: 'نيويورك 🇺🇸',
    distanceMultiplier: 3.0,
    requiredTier: 3,
    city: 'New York'
  },
  cairo_tokyo: {
    id: 'cairo_tokyo',
    name: 'طوكيو 🇯🇵',
    distanceMultiplier: 3.5,
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
      totalOperatingCost: 0,
      totalNetProfit: 0,
      totalDutyFreeCollected: 0,
      transitPermitsAccepted: 0
    },
    lastDutyFreeCollectionAt: Date.now(),
    transitPermit: null
  };
}

/**
 * Calculates current airport facility multipliers
 */
function getAirportBonuses(airportState) {
  if (!airportState || !airportState.unlocked) {
    return { ticketBonus: 1.0, timeReduction: 0, fuelDiscount: 0, maxPlaneTier: 1, passivePerMin: 0 };
  }
  const f = airportState.facilities || {};
  const runwayLvl = f.runway || 1;
  const terminalLvl = f.terminals || 1;
  const hangarLvl = f.hangar || 1;
  const dutyFreeLvl = f.duty_free || 0;

  const maxPlaneTier = AIRPORT_FACILITIES.runway.levels[runwayLvl]?.maxPlaneTier || 1;
  const ticketBonus = AIRPORT_FACILITIES.terminals.levels[terminalLvl]?.ticketBonus || 1.0;
  const timeReduction = AIRPORT_FACILITIES.hangar.levels[hangarLvl]?.timeReduction || 0;
  const fuelDiscount = AIRPORT_FACILITIES.hangar.levels[hangarLvl]?.fuelDiscount || 0;
  const passivePerMin = dutyFreeLvl > 0 ? (AIRPORT_FACILITIES.duty_free.levels[dutyFreeLvl]?.passivePerMin || 0) : 0;

  return { ticketBonus, timeReduction, fuelDiscount, maxPlaneTier, passivePerMin };
}

/**
 * Calculates itemized flight economics (Revenue, Fuel, Crew, Landing Fee, Net Profit)
 */
function calculateFlightEconomics(model, dest, airportState) {
  const bonuses = getAirportBonuses(airportState);
  const distMult = dest.distanceMultiplier || 1.0;

  // 1. Gross Revenue (scaled by destination & terminal level)
  const grossRevenue = Math.floor(model.baseRevenue * distMult * bonuses.ticketBonus);

  // 2. Operating Costs (Fuel with hangar discount, Crew, Landing Fee)
  const rawFuel = model.fuelCost * distMult;
  const discountedFuel = Math.floor(rawFuel * (1 - bonuses.fuelDiscount));
  const crewCost = Math.floor(model.crewCost * distMult);
  const landingFee = Math.floor(model.landingFee * distMult);

  const totalOperatingCost = discountedFuel + crewCost + landingFee;
  const netProfit = Math.max(0, grossRevenue - totalOperatingCost);

  // 3. Flight Duration & XP
  const durationSec = Math.max(60, Math.floor(model.baseFlightTimeSec * distMult * (1 - bonuses.timeReduction)));
  const xpReward = Math.floor(model.baseXp * distMult);

  return {
    grossRevenue,
    fuelCost: discountedFuel,
    fuelDiscountPct: Math.round(bonuses.fuelDiscount * 100),
    crewCost,
    landingFee,
    totalOperatingCost,
    netProfit,
    durationSec,
    xpReward
  };
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
  calculateFlightEconomics,
  calculateDutyFreeAccumulated
};
