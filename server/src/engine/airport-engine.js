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
      2: { name: 'مدرج دولي عريض', cost: 35000000, maxPlaneTier: 2, desc: 'يستوعب طائرات الفئة 2 (Airbus A320)' },
      3: { name: 'مدرج عابر للقارات متطور', cost: 120000000, maxPlaneTier: 3, desc: 'يستوعب طائرات الفئة 3 (B777 / A380)' },
      4: { name: 'مجمع مدارج ذكي CAT III', cost: 450000000, maxPlaneTier: 4, desc: 'يستوعب طائرات الفئة 4 (Gulfstream VIP / Beluga Cargo)' }
    }
  },
  terminals: {
    id: 'terminals',
    name: 'صالات الركاب الدولية 🏢',
    icon: 'fa-building-columns',
    desc: 'ترفع من سعة المسافرين وعوائد تذاكر الرحلات',
    levels: {
      1: { name: 'صالة ركاب أساسية', cost: 0, ticketBonus: 1.0, desc: 'رسوم تذاكر قياسية' },
      2: { name: 'مبنى صالات دولي حديث', cost: 25000000, ticketBonus: 1.25, desc: '+25% أرباح تذاكر الرحلات' },
      3: { name: 'صالة كبار الشخصيات VIP والدرجة الأولى', cost: 95000000, ticketBonus: 1.60, desc: '+60% أرباح تذاكر + بونص XP' },
      4: { name: 'مدينة مطار عالمية متكاملة', cost: 350000000, ticketBonus: 2.10, desc: '+110% أرباح تذاكر مضاعفة' }
    }
  },
  hangar: {
    id: 'hangar',
    name: 'حوض الصيانة وخزانات الوقود 🛠️⛽',
    icon: 'fa-wrench',
    desc: 'يقلل زمن الرحلات ويمنح خصماً استراتيجياً على أسعار وقود الطائرات',
    levels: {
      1: { name: 'مرآب صيانة يدوي', cost: 0, timeReduction: 0, fuelDiscount: 0, desc: 'زمن رحلات وتكلفة وقود قياسية' },
      2: { name: 'حوض فحص سريع ومضخات نفاثة', cost: 25000000, timeReduction: 0.15, fuelDiscount: 0.10, desc: '-15% زمن الرحلات و -10% تكلفة الوقود' },
      3: { name: 'مركز نفاثات ومستودع وقود توربيني', cost: 85000000, timeReduction: 0.30, fuelDiscount: 0.20, desc: '-30% زمن الرحلات و -20% تكلفة الوقود' },
      4: { name: 'روبوتات صيانة ومستودع وقود استراتيجي', cost: 280000000, timeReduction: 0.45, fuelDiscount: 0.30, desc: '-45% زمن الرحلات و -30% تكلفة الوقود' }
    }
  },
  duty_free: {
    id: 'duty_free',
    name: 'السوق الحرة ومتاجر الترانزيت 🛍️',
    icon: 'fa-store',
    desc: 'تدر دخلاً سلبياً مستمراً ومتزناً على مدار الساعة',
    levels: {
      1: { name: 'أكشاك هدايا وتذكارات', cost: 12000000, passivePerMin: 300, desc: 'دخل سلبي: 300 ج.م/دقيقة (18,000 ج.م/ساعة)' },
      2: { name: 'مجمع عطور وساعات سويسرية', cost: 45000000, passivePerMin: 1200, desc: 'دخل سلبي: 1,200 ج.م/دقيقة (72,000 ج.م/ساعة)' },
      3: { name: 'مول ماركات عالمية وأزياء راقية', cost: 140000000, passivePerMin: 3500, desc: 'دخل سلبي: 3,500 ج.م/دقيقة (210,000 ج.م/ساعة)' },
      4: { name: 'صالة مزادات مجوهرات وسيارات VIP', cost: 420000000, passivePerMin: 10000, desc: 'دخل سلبي: 10,000 ج.م/دقيقة (600,000 ج.م/ساعة)' }
    }
  }
};

const AIRCRAFT_MODELS = {
  cessna_sky: {
    id: 'cessna_sky',
    name: 'Cessna Sky Courier 🛩️',
    tier: 1,
    cost: 8000000,
    goldCost: 0,
    capacity: '8 ركاب VIP',
    baseFlightTimeSec: 2700, // 45 mins
    baseRevenue: 280000,
    fuelCost: 60000,
    crewCost: 35000,
    landingFee: 25000,
    baseNetProfit: 160000,
    baseXp: 75,
    speedupGold: 2,
    icon: 'fa-plane',
    desc: 'طائرة خفيفة للمسافات الإقليمية ورجال الأعمال'
  },
  airbus_a320: {
    id: 'airbus_a320',
    name: 'Airbus A320neo ✈️',
    tier: 2,
    cost: 35000000,
    goldCost: 0,
    capacity: '180 مسافر',
    baseFlightTimeSec: 7200, // 2 hours
    baseRevenue: 1350000,
    fuelCost: 320000,
    crewCost: 160000,
    landingFee: 120000,
    baseNetProfit: 750000,
    baseXp: 220,
    speedupGold: 5,
    icon: 'fa-plane-departure',
    desc: 'طائرة ركاب دولية عالية الكفاءة للمسافات المتوسطة'
  },
  boeing_777: {
    id: 'boeing_777',
    name: 'Boeing 777-300ER 🌐',
    tier: 3,
    cost: 120000000,
    goldCost: 0,
    capacity: '390 مسافر',
    baseFlightTimeSec: 14400, // 4 hours
    baseRevenue: 4600000,
    fuelCost: 1100000,
    crewCost: 480000,
    landingFee: 320000,
    baseNetProfit: 2700000,
    baseXp: 800,
    speedupGold: 12,
    icon: 'fa-plane',
    desc: 'طائر عملاق عابر للقارات للرحلات الدولية الطويلة'
  },
  gulfstream_g650: {
    id: 'gulfstream_g650',
    name: 'Gulfstream G650 VIP Jet 👑🛩️',
    tier: 4,
    cost: 160000000,
    goldCost: 0,
    capacity: 'نخبة رجال الأعمال والأمراء VIP',
    baseFlightTimeSec: 12600, // 3.5 hours
    baseRevenue: 5600000,
    fuelCost: 1100000,
    crewCost: 550000,
    landingFee: 350000,
    baseNetProfit: 360000,
    baseXp: 650,
    speedupGold: 10,
    icon: 'fa-crown',
    desc: 'طائرة نفاثة فاخرة لنقل كبار الشخصيات بعوائد قياسية'
  },
  cargo_beluga: {
    id: 'cargo_beluga',
    name: 'Airbus BelugaXL Heavy Cargo 📦✈️',
    tier: 4,
    cost: 220000000,
    goldCost: 0,
    capacity: '50 طن بضائع ومعدات ثقيلة',
    baseFlightTimeSec: 21600, // 6 hours
    baseRevenue: 9000000,
    fuelCost: 2100000,
    crewCost: 850000,
    landingFee: 550000,
    baseNetProfit: 5500000,
    baseXp: 1200,
    speedupGold: 16,
    icon: 'fa-box-open',
    desc: 'وحش الشحن الجوي العملاق لنقل الشحنات الفاخرة حول العالم'
  },
  airbus_a380: {
    id: 'airbus_a380',
    name: 'Airbus A380 Superjumbo 🏰✈️',
    tier: 3,
    cost: 400000000,
    goldCost: 0,
    capacity: '615 مسافر (طابقين)',
    baseFlightTimeSec: 28800, // 8 hours
    baseRevenue: 17500000,
    fuelCost: 3800000,
    crewCost: 1600000,
    landingFee: 1100000,
    baseNetProfit: 11000000,
    baseXp: 2000,
    speedupGold: 22,
    icon: 'fa-jet-fighter-up',
    desc: 'القلعة الطائرة ذات الطابقين.. أضخم طائرة ركاب في العالم'
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
  const durationSec = Math.max(60, Math.floor(model.baseFlightTimeSec * (1 - bonuses.timeReduction)));
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
