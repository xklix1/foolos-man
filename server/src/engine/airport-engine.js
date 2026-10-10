/**
 * Ras ALmal Tycoon — Authoritative Airport & Aviation Engine
 * 100% Server-Authoritative Logic for the International Airport Hub
 * Balanced 7-Day ROI Economy with Realistic Operating Costs (Fuel, Crew, Landing Fees)
 */

const AIRPORT_FACILITIES = {
  runway: {
    id: 'runway',
    name: 'مدرج الطائرات الرئيسي ',
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
    name: 'صالات الركاب الدولية ',
    icon: 'fa-building-columns',
    desc: 'ترفع من سعة المسافرين وعوائد تذاكر الرحلات',
    levels: {
      1: { name: 'صالة ركاب أساسية', cost: 0, ticketBonus: 1.0, desc: 'رسوم تذاكر قياسية' },
      2: { name: 'مبنى صالات دولي حديث', cost: 10000000, ticketBonus: 1.10, desc: '+10% أرباح تذاكر الرحلات' },
      3: { name: 'صالة كبار الشخصيات VIP والدرجة الأولى', cost: 35000000, ticketBonus: 1.20, desc: '+20% أرباح تذاكر + بونص XP' },
      4: { name: 'مدينة مطار عالمية متكاملة', cost: 85000000, ticketBonus: 1.35, desc: '+35% أرباح تذاكر الرحلات' }
    }
  },
  hangar: {
    id: 'hangar',
    name: 'حوض الصيانة وخزانات الوقود ',
    icon: 'fa-wrench',
    desc: 'يقلل زمن الرحلات ويمنح خصماً استراتيجياً على أسعار وقود الطائرات',
    levels: {
      1: { name: 'مرآب صيانة يدوي', cost: 0, timeReduction: 0, fuelDiscount: 0, desc: 'زمن رحلات وتكلفة وقود قياسية' },
      2: { name: 'حوض فحص سريع ومضخات نفاثة', cost: 10000000, timeReduction: 0.05, fuelDiscount: 0.05, desc: '-5% زمن الرحلات و -5% تكلفة الوقود' },
      3: { name: 'مركز نفاثات ومستودع وقود توربيني', cost: 30000000, timeReduction: 0.10, fuelDiscount: 0.10, desc: '-10% زمن الرحلات و -10% تكلفة الوقود' },
      4: { name: 'روبوتات صيانة ومستودع وقود استراتيجي', cost: 75000000, timeReduction: 0.15, fuelDiscount: 0.15, desc: '-15% زمن الرحلات و -15% تكلفة الوقود' }
    }
  },
    duty_free: {
    id: 'duty_free',
    name: 'السوق الحرة ومتاجر الترانزيت ',
    icon: 'fa-store',
    desc: 'تدر دخلاً سلبياً مستمراً ومتزناً على مدار الساعة',
    levels: {
      1: { name: 'أكشاك هدايا وتذكارات', cost: 5000000, passivePerMin: 100, desc: 'دخل سلبي: 100 ج.م/دقيقة (6,000 ج.م/ساعة)' },
      2: { name: 'مجمع عطور وساعات سويسرية', cost: 18000000, passivePerMin: 300, desc: 'دخل سلبي: 300 ج.م/دقيقة (18,000 ج.م/ساعة)' },
      3: { name: 'مول ماركات عالمية وأزياء راقية', cost: 50000000, passivePerMin: 750, desc: 'دخل سلبي: 750 ج.م/دقيقة (45,000 ج.م/ساعة)' },
      4: { name: 'صالة مزادات مجوهرات وسيارات VIP', cost: 120000000, passivePerMin: 1500, desc: 'دخل سلبي: 1,500 ج.م/دقيقة (90,000 ج.م/ساعة)' }
    }
  }
};

const AIRCRAFT_MODELS = {
  cessna_sky: {
    id: 'cessna_sky',
    name: 'Cessna Sky Courier ',
    tier: 1,
    cost: 3000000,
    goldCost: 0,
    capacity: '8 ركاب VIP',
    baseFlightTimeSec: 5400, // 1.5 hours
    baseRevenue: 400000,
    fuelCost: 50000,
    crewCost: 30000,
    landingFee: 20000,
    baseNetProfit: 300000,
    baseXp: 150,
    speedupGold: 9, // 1 Gold per 10 minutes (5400s = 90 min -> 9 Gold)
    icon: 'fa-plane',
    desc: 'طائرة خفيفة للمسافات الإقليمية ورجال الأعمال (رحلة ساعة ونصف)'
  },
  airbus_a320: {
    id: 'airbus_a320',
    name: 'Airbus A320neo ',
    tier: 2,
    cost: 15000000,
    goldCost: 0,
    capacity: '180 مسافر',
    baseFlightTimeSec: 10800, // 3 hours
    baseRevenue: 1350000,
    fuelCost: 175000,
    crewCost: 105000,
    landingFee: 70000,
    baseNetProfit: 1000000,
    baseXp: 450,
    speedupGold: 18, // 1 Gold per 10 minutes (10800s = 180 min -> 18 Gold)
    icon: 'fa-plane-departure',
    desc: 'طائرة ركاب دولية عالية الكفاءة للمسافات المتوسطة (رحلة 3 ساعات)'
  },
  boeing_777: {
    id: 'boeing_777',
    name: 'Boeing 777-300ER ',
    tier: 3,
    cost: 55000000,
    goldCost: 0,
    capacity: '390 مسافر',
    baseFlightTimeSec: 16200, // 4.5 hours
    baseRevenue: 3700000,
    fuelCost: 500000,
    crewCost: 320000,
    landingFee: 180000,
    baseNetProfit: 2700000,
    baseXp: 1200,
    speedupGold: 27, // 1 Gold per 10 minutes (16200s = 270 min -> 27 Gold)
    icon: 'fa-plane',
    desc: 'طائر عملاق عابر للقارات للرحلات الدولية الطويلة (رحلة 4.5 ساعات)'
  },
  gulfstream_g650: {
    id: 'gulfstream_g650',
    name: 'Gulfstream G650 VIP Jet ',
    tier: 4,
    cost: 85000000,
    goldCost: 0,
    capacity: 'نخبة رجال الأعمال والأمراء VIP',
    baseFlightTimeSec: 21600, // 6 hours
    baseRevenue: 6000000,
    fuelCost: 750000,
    crewCost: 450000,
    landingFee: 300000,
    baseNetProfit: 4500000,
    baseXp: 1500,
    speedupGold: 36, // 1 Gold per 10 minutes (21600s = 360 min -> 36 Gold)
    icon: 'fa-crown',
    desc: 'طائرة نفاثة فاخرة لنقل كبار الشخصيات بعوائد قياسية (رحلة 6 ساعات)'
  },
  cargo_beluga: {
    id: 'cargo_beluga',
    name: 'Airbus BelugaXL Heavy Cargo ',
    tier: 4,
    cost: 125000000,
    goldCost: 0,
    capacity: '50 طن بضائع ومعدات ثقيلة',
    baseFlightTimeSec: 27000, // 7.5 hours
    baseRevenue: 9000000,
    fuelCost: 1000000,
    crewCost: 600000,
    landingFee: 400000,
    baseNetProfit: 7000000,
    baseXp: 2200,
    speedupGold: 45, // 1 Gold per 10 minutes (27000s = 450 min -> 45 Gold)
    icon: 'fa-box-open',
    desc: 'وحش الشحن الجوي العملاق لنقل الشحنات الفاخرة حول العالم (رحلة 7.5 ساعات)'
  },
  airbus_a380: {
    id: 'airbus_a380',
    name: 'Airbus A380 Superjumbo ',
    tier: 3,
    cost: 220000000,
    goldCost: 0,
    capacity: '615 مسافر (طابقين)',
    baseFlightTimeSec: 36000, // 10 hours
    baseRevenue: 19500000,
    fuelCost: 2200000,
    crewCost: 1300000,
    landingFee: 1000000,
    baseNetProfit: 15000000,
    baseXp: 4500,
    speedupGold: 60, // 1 Gold per 10 minutes (36000s = 600 min -> 60 Gold)
    icon: 'fa-jet-fighter-up',
    desc: 'القلعة الطائرة ذات الطابقين.. أضخم طائرة ركاب في العالم (رحلة 10 ساعات)'
  }
};

const FLIGHT_DESTINATIONS = {
  cairo_riyadh: {
    id: 'cairo_riyadh',
    name: 'الرياض ',
    distanceMultiplier: 1.0,
    requiredTier: 1,
    city: 'Riyadh'
  },
  cairo_dubai: {
    id: 'cairo_dubai',
    name: 'دبي ',
    distanceMultiplier: 1.25,
    requiredTier: 1,
    city: 'Dubai'
  },
  cairo_istanbul: {
    id: 'cairo_istanbul',
    name: 'إسطنبول ',
    distanceMultiplier: 1.5,
    requiredTier: 2,
    city: 'Istanbul'
  },
  cairo_london: {
    id: 'cairo_london',
    name: 'لندن ',
    distanceMultiplier: 2.0,
    requiredTier: 2,
    city: 'London'
  },
  cairo_paris: {
    id: 'cairo_paris',
    name: 'باريس ',
    distanceMultiplier: 2.2,
    requiredTier: 2,
    city: 'Paris'
  },
  cairo_newyork: {
    id: 'cairo_newyork',
    name: 'نيويورك ',
    distanceMultiplier: 3.0,
    requiredTier: 3,
    city: 'New York'
  },
  cairo_tokyo: {
    id: 'cairo_tokyo',
    name: 'طوكيو ',
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

const AIRPORT_MANAGERS = {
  1: {
    tier: 1,
    name: 'كابتن ليام - مساعد مدير العمليات ',
    title: 'مساعد مدير العمليات الجوية',
    cost: 100000000, // 100 Million cash
    currency: 'cash',
    profitBonusPct: 5,
    costDiscountPct: 0,
    autoPilot: false,
    avatar: 'assets/airport_manager_tier1.jpg',
    desc: 'مساعد عمليات طيران محترف، يرفع أرباح كافة الرحلات الجوية بنسبة +5% فورياً.'
  },
  2: {
    tier: 2,
    name: 'كابتن ألفا - مدير عمليات الطيران ',
    title: 'مدير عمليات الطيران الدولي',
    packageId: 'pkg_airport_manager_tier2',
    profitBonusPct: 10,
    costDiscountPct: 5,
    autoPilot: false,
    avatar: 'assets/airport_manager_tier2.jpg',
    desc: 'مدير طيران دولي مخضرم، يرفع أرباح الرحلات بنسبة +10% ويخفض تكاليف التشغيل بنسبة -5%.'
  },
  3: {
    tier: 3,
    name: 'الرئيس التنفيذي ألكسندر - إمبراطور الطيران ',
    title: 'المدير التنفيذي العام لشبكة الطيران العالمية',
    packageId: 'pkg_airport_manager_tier3',
    profitBonusPct: 15,
    costDiscountPct: 10,
    autoPilot: true,
    maxOfflineHours: 72,
    avatar: 'assets/airport_manager_tier3.jpg',
    desc: 'تشغيل المطار أوتوماتيكياً بالكامل (Smart Auto-Pilot) أونلاين وأوفلاين حتى 72 ساعة، مع بونص +15% أرباح و -10% تكاليف.'
  }
};

/**
 * Calculates itemized flight economics (Revenue, Fuel, Crew, Landing Fee, Net Profit)
 */
function calculateFlightEconomics(model, dest, airportState) {
  const bonuses = getAirportBonuses(airportState);
  const manager = airportState && airportState.manager;
  const managerTier = manager && manager.tier ? Number(manager.tier) : 0;

  let managerProfitMult = 1.0;
  let managerCostDiscount = 0;
  if (managerTier === 1) {
    managerProfitMult = 1.05;
  } else if (managerTier === 2) {
    managerProfitMult = 1.10;
    managerCostDiscount = 0.05;
  } else if (managerTier >= 3) {
    managerProfitMult = 1.15;
    managerCostDiscount = 0.10;
  }

  const distMult = dest.distanceMultiplier || 1.0;

  // 1. Gross Revenue (scaled by destination, terminal level, and manager bonus)
  const grossRevenue = Math.floor(model.baseRevenue * distMult * bonuses.ticketBonus * managerProfitMult);

  // 2. Operating Costs (Fuel with hangar discount + manager discount, Crew, Landing Fee)
  const effectiveCostDiscount = Math.min(0.50, bonuses.fuelDiscount + managerCostDiscount);
  const rawFuel = model.fuelCost * distMult;
  const discountedFuel = Math.floor(rawFuel * (1 - effectiveCostDiscount));
  const crewCost = Math.floor(model.crewCost * distMult * (1 - managerCostDiscount));
  const landingFee = Math.floor(model.landingFee * distMult * (1 - managerCostDiscount));

  const totalOperatingCost = discountedFuel + crewCost + landingFee;
  const netProfit = Math.max(0, grossRevenue - totalOperatingCost);

  // 3. Flight Duration & XP
  const durationSec = Math.max(60, Math.floor(model.baseFlightTimeSec * distMult * (1 - bonuses.timeReduction)));
  const xpReward = Math.floor(model.baseXp * distMult * (managerTier >= 2 ? 1.1 : 1.0));
  const speedupGold = Math.max(1, Math.ceil(durationSec / 600)); // 1 Gold per 10 minutes (600s)

  return {
    grossRevenue,
    fuelCost: discountedFuel,
    fuelDiscountPct: Math.round(bonuses.fuelDiscount * 100),
    crewCost,
    landingFee,
    totalOperatingCost,
    netProfit,
    durationSec,
    xpReward,
    speedupGold,
    managerTier,
    managerProfitBonusPct: Math.round((managerProfitMult - 1) * 100),
    managerCostDiscountPct: Math.round(managerCostDiscount * 100)
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

/**
 * Control Tower Transit Hourly Rates by Runway Level (8h Max Accumulation):
 * Level 1: 3,000 EGP / hr (max 8h: 24,000 EGP)
 * Level 2: 7,500 EGP / hr (max 8h: 60,000 EGP)
 * Level 3: 15,000 EGP / hr (max 8h: 120,000 EGP)
 * Level 4: 25,000 EGP / hr (max 8h: 200,000 EGP)
 */
const CONTROL_TOWER_CONFIG = {
  maxAccumulationHours: 8,
  minCollectionEgp: 500,
  minCooldownMs: 60 * 1000,
  levels: {
    1: { name: 'مدرج إقليمي', perHour: 3000, perMin: 50, desc: 'دخل ترانزيت: 3,000 ج.م/ساعة (أقصى تراكم 24 ألف ج.م)' },
    2: { name: 'مدرج دولي', perHour: 7500, perMin: 125, desc: 'دخل ترانزيت: 7,500 ج.م/ساعة (أقصى تراكم 60 ألف ج.م)' },
    3: { name: 'مدرج عابر للقارات', perHour: 15000, perMin: 250, desc: 'دخل ترانزيت: 15,000 ج.م/ساعة (أقصى تراكم 120 ألف ج.م)' },
    4: { name: 'مجمع مدارج ذكي CAT III', perHour: 25000, perMin: 416.67, desc: 'دخل ترانزيت: 25,000 ج.م/ساعة (أقصى تراكم 200 ألف ج.م)' }
  }
};

/**
 * Calculates accumulated Control Tower transit fees (capped at 8 hours)
 */
function calculateTransitAccumulated(airportState, nowMs = Date.now()) {
  if (!airportState || !airportState.unlocked) return 0;
  const runwayLvl = Math.max(1, Math.min(4, Number(airportState.facilities?.runway || 1)));
  const rateConfig = CONTROL_TOWER_CONFIG.levels[runwayLvl] || CONTROL_TOWER_CONFIG.levels[1];
  if (!rateConfig || rateConfig.perMin <= 0) return 0;

  const lastTime = Number(airportState.lastTransitCollectionAt || airportState.lastTransitPermitAt || airportState.unlockedAt || nowMs);
  const elapsedMinutes = Math.max(0, (nowMs - lastTime) / (60 * 1000));
  // Cap at 8 hours max accumulation
  const cappedMinutes = Math.min(8 * 60, elapsedMinutes);
  return Math.floor(cappedMinutes * rateConfig.perMin);
}

module.exports = {
  AIRPORT_FACILITIES,
  AIRCRAFT_MODELS,
  FLIGHT_DESTINATIONS,
  CONTROL_TOWER_CONFIG,
  AIRPORT_MANAGERS,
  createInitialAirportState,
  getAirportBonuses,
  calculateFlightEconomics,
  calculateDutyFreeAccumulated,
  calculateTransitAccumulated
};
