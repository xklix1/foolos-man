/**
 * Ras ALmal Tycoon — Authoritative Space Exploration Engine
 * 100% Server-Authoritative Logic for Orbital Station, Rocket Launchpads,
 * Deep Space Mining Expeditions, 24h Daily Commodity Exchange & VIP Gold Managers.
 */

const { calculateNetWorth, getAppropriateTitle } = require('./net-worth-engine');

const SPACE_CONFIG = {
  unlockCost: 2500000000, // 2.5 Billion EGP construction cost
  minNetWorthRequired: 5000000000, // 5 Billion Net Worth milestone to unlock

  facilities: {
    launchpads: {
      id: 'launchpads',
      name: 'منصات الإطلاق الفضائية',
      icon: 'fa-solid fa-rocket text-sky-400',
      levels: {
        1: { name: 'منصة مدارية مفردة (منصة 1)', cost: 0, maxPads: 1, desc: 'تتيح تشغيل وإطلاق صاروخ واحد في نفس الوقت' },
        2: { name: 'مجمع إطلاق ثنائي متطور (منصتان)', cost: 1500000000, maxPads: 2, desc: 'تتيح إطلاق صاروخين في مهام استكشافية متزامنة' },
        3: { name: 'مرفأ إطلاق كوكبي ثلاثي CAT-III (3 منصات)', cost: 15000000000, maxPads: 3, desc: 'إنجاز أسطوري فائق؛ يتيح إطلاق 3 صواريخ متزامنة لكافة أرجاء المجموعة الشمسية' }
      }
    },
    mission_control: {
      id: 'mission_control',
      name: 'مركز القيادة والتحكم المداري',
      icon: 'fa-solid fa-satellite-dish text-indigo-400',
      levels: {
        1: { name: 'هوائي تتبع راديوي أساسي', cost: 0, timeReduction: 0, desc: 'توجيه وقياسات قياسية للرحلات' },
        2: { name: 'شبكة أقمار اصطناعية تزامنية', cost: 500000000, timeReduction: 0.05, desc: '-5% زمن استغراق رحلات التنقيب الفضائية' },
        3: { name: 'حاسوب ملاحة كمومي فائق', cost: 2000000000, timeReduction: 0.10, desc: '-10% زمن استغراق رحلات التنقيب الفضائية' },
        4: { name: 'نواة ذكاء اصطناعي للقفز الفضائي', cost: 6000000000, timeReduction: 0.15, desc: '-15% زمن استغراق رحلات التنقيب الفضائية' }
      }
    },
    ore_silo: {
      id: 'ore_silo',
      name: 'مستودع وخزانات الخام الفضائي',
      icon: 'fa-solid fa-warehouse text-amber-400',
      levels: {
        1: { name: 'صوامع شحن مدارية (1,000 كجم)', cost: 0, capacity: 1000, desc: 'سعة استيعابية تصل إلى 1,000 كجم من المعادن' },
        2: { name: 'مستودعات تخزين فراغي مبردة (5,000 كجم)', cost: 300000000, capacity: 5000, desc: 'سعة استيعابية تصل إلى 5,000 كجم من المعادن' },
        3: { name: 'مجمع لوجستي كوكبي عملاق (20,000 كجم)', cost: 1200000000, capacity: 20000, desc: 'سعة استيعابية تصل إلى 20,000 كجم من المعادن' },
        4: { name: 'مخازن كمومية متعددة الأبعاد (100,000 كجم)', cost: 4000000000, capacity: 100000, desc: 'سعة تخزينية أسطورية تصل إلى 100,000 كجم من المعادن' }
      }
    },
    ore_refinery: {
      id: 'ore_refinery',
      name: 'معمل تكرير وتنقية الخام الفضائي',
      icon: 'fa-solid fa-atom text-emerald-400',
      levels: {
        1: { name: 'وحدات تفتيت ومغنطة أولية', cost: 0, yieldMultiplier: 1.0, desc: 'تنقية قياسية للمعادن المستخرجة' },
        2: { name: 'أفران صهر بلازمية حرارية', cost: 500000000, yieldMultiplier: 1.04, desc: '+4% نقاء وقيمة المعادن المستخرجة في كل رحلة' },
        3: { name: 'مفاعلات فصل كهرومغناطيسي نانوية', cost: 2500000000, yieldMultiplier: 1.08, desc: '+8% نقاء وقيمة المعادن المستخرجة في كل رحلة' },
        4: { name: 'محطة تنقية كمومية متطورة للأصول النادرة', cost: 8000000000, yieldMultiplier: 1.12, desc: '+12% نقاء وقيمة المعادن المستخرجة في كل رحلة' }
      }
    }
  },

  rocketModels: {
    orion_probe: {
      id: 'orion_probe',
      name: 'مسبار أوريون-1 الاستكشافي',
      tier: 1,
      cost: 100000000, // 100M EGP
      cargoCapacity: 800, // 800 kg
      allowedDestinations: ['moon'],
      prepCost: 5000000, // 5M EGP
      prepSeconds: 120,
      icon: 'fa-solid fa-shuttle-space text-sky-400',
      color: 'sky',
      desc: 'مركبة استكشاف خفيفة ذاتية القيادة، مثالية لمسح سطح القمر وجلب عينات الريجوليث والحديد النيزكي.'
    },
    falcon_star: {
      id: 'falcon_star',
      name: 'صاروخ فالكون ستار التكتيكي',
      tier: 2,
      cost: 500000000, // 500M EGP
      cargoCapacity: 1500, // 1,500 kg
      allowedDestinations: ['moon', 'mars'],
      prepCost: 30000000, // 30M EGP
      prepSeconds: 240,
      icon: 'fa-solid fa-rocket text-indigo-400',
      color: 'indigo',
      desc: 'صاروخ دفع هجين قابل للهبوط الذاتي، مجهز للوصول إلى كوكب المريخ وجلب خامات البلاتين والليثيوم الفضائي.'
    },
    heavy_starship: {
      id: 'heavy_starship',
      name: 'سفينة التعدين الكوكبية Heavy Starship',
      tier: 3,
      cost: 2000000000, // 2 Billion EGP
      cargoCapacity: 3500, // 3,500 kg
      allowedDestinations: ['moon', 'mars', 'asteroid_belt'],
      prepCost: 100000000, // 100M EGP
      prepSeconds: 480,
      icon: 'fa-solid fa-meteor text-amber-400',
      color: 'amber',
      desc: 'عملاق التعدين في أعماق الفضاء، مجهز بدروع مغناطيسية لاختراق حزام الكويكبات واستخراج أثمن المعادن النادرة.'
    },
    quantum_dreadnought: {
      id: 'quantum_dreadnought',
      name: 'مدمرة التعدين الكمومية Quantum Dreadnought',
      tier: 4,
      cost: 10000000000, // 10 Billion EGP
      cargoCapacity: 7000, // 7,000 kg
      allowedDestinations: ['moon', 'mars', 'asteroid_belt', 'jupiter_europa'],
      prepCost: 400000000, // 400M EGP
      prepSeconds: 900,
      icon: 'fa-solid fa-jet-fighter-up text-fuchsia-400',
      color: 'fuchsia',
      desc: 'درة التاج الفضائي بمحركات إيونية عملاقة، قادرة على بلوغ أقمار المشتري السحيقة واقتناص بلورات المادة المظلمة والهيليوم-3.'
    }
  },

  destinations: {
    moon: {
      id: 'moon',
      name: 'القمر (Moon - Mare Tranquillitatis)',
      distanceKm: '384,400 كم',
      baseSeconds: 43200, // 12 hours
      fuelCost: 5000000, // 5M EGP
      minTier: 1,
      icon: 'fa-solid fa-circle text-slate-300',
      color: 'slate',
      ores: {
        regolith: { weight: 0.60, minPct: 0.50, maxPct: 0.70 },
        iron: { weight: 0.30, minPct: 0.20, maxPct: 0.35 },
        helium3: { weight: 0.10, minPct: 0.05, maxPct: 0.15 }
      },
      desc: 'أقرب الأجرام السماوية؛ رحلة تستغرق 12 ساعة ذات عائد مضمون في استخراج الريجوليث والحديد والغازات القمرية.'
    },
    mars: {
      id: 'mars',
      name: 'كوكب المريخ (Mars - Olympus Mons)',
      distanceKm: '225,000,000 كم',
      baseSeconds: 86400, // 24 hours (1 full day)
      fuelCost: 30000000, // 30M EGP
      minTier: 2,
      icon: 'fa-solid fa-globe text-rose-500',
      color: 'rose',
      ores: {
        iron: { weight: 0.35, minPct: 0.25, maxPct: 0.45 },
        regolith: { weight: 0.20, minPct: 0.15, maxPct: 0.25 },
        platinum: { weight: 0.25, minPct: 0.15, maxPct: 0.35 },
        lithium: { weight: 0.20, minPct: 0.10, maxPct: 0.25 }
      },
      desc: 'الكوكب الأحمر؛ رحلة تستغرق 24 ساعة للغوص في العروق المعدنية النادرة والبلاتين الفضائي والليثيوم عالي الكثافة.'
    },
    asteroid_belt: {
      id: 'asteroid_belt',
      name: 'حزام الكويكبات (Asteroid Belt - Psyche 16)',
      distanceKm: '480,000,000 كم',
      baseSeconds: 172800, // 48 hours (2 days)
      fuelCost: 100000000, // 100M EGP
      minTier: 3,
      icon: 'fa-solid fa-ring text-amber-500',
      color: 'amber',
      ores: {
        platinum: { weight: 0.40, minPct: 0.30, maxPct: 0.50 },
        lithium: { weight: 0.30, minPct: 0.20, maxPct: 0.40 },
        helium3: { weight: 0.20, minPct: 0.10, maxPct: 0.25 },
        iron: { weight: 0.10, minPct: 0.05, maxPct: 0.15 }
      },
      desc: 'كنز المجموعة الشمسية العائم؛ رحلة تستغرق 48 ساعة لجلب أثمن كويكبات البلاتين النقي وعناصر الاندماج النووي.'
    },
    jupiter_europa: {
      id: 'jupiter_europa',
      name: 'أقمار المشتري السحيقة (Jupiter / Europa Deep Abyss)',
      distanceKm: '778,000,000 كم',
      baseSeconds: 259200, // 72 hours (3 days)
      fuelCost: 400000000, // 400M EGP
      minTier: 4,
      icon: 'fa-solid fa-burst text-purple-400',
      color: 'purple',
      ores: {
        dark_matter: { weight: 0.35, minPct: 0.25, maxPct: 0.45 },
        helium3: { weight: 0.30, minPct: 0.20, maxPct: 0.35 },
        lithium: { weight: 0.20, minPct: 0.15, maxPct: 0.30 },
        platinum: { weight: 0.15, minPct: 0.10, maxPct: 0.20 }
      },
      desc: 'أعماق الفضاء السحيق؛ ملحمة استكشافية تدوم 3 أيام لاقتناص بلورات المادة المظلمة التي تدر أرباحاً بالمليارات.'
    }
  },

  ores: {
    regolith: {
      id: 'regolith',
      name: 'خام الريجوليث القمري',
      rarity: 'شائع',
      rarityRank: 1,
      color: 'slate',
      basePrice: 8000,
      minPrice: 6000,
      maxPrice: 11000,
      icon: 'fa-solid fa-cubes text-slate-300',
      desc: 'تربة قمرية غنية بالسيليكون والأكاسيد، تستخدم في بناء المستعمرات الفضائية والمفاعلات.'
    },
    iron: {
      id: 'iron',
      name: 'الحديد النيزكي الصلب',
      rarity: 'شائع',
      rarityRank: 2,
      color: 'blue',
      basePrice: 24000,
      minPrice: 18000,
      maxPrice: 32000,
      icon: 'fa-solid fa-shield-halved text-blue-400',
      desc: 'سبيكة حديدية كونية بالغة الصلابة ومقاومة للإشعاعات الكونية والحرارة الفائقة.'
    },
    platinum: {
      id: 'platinum',
      name: 'بلاتين الكويكبات الفضائي',
      rarity: 'نادر',
      rarityRank: 3,
      color: 'cyan',
      basePrice: 55000,
      minPrice: 40000,
      maxPrice: 75000,
      icon: 'fa-solid fa-gem text-cyan-300',
      desc: 'معدن نبيل فائق القيمة مطلوب بشدة من كبرى مصانع الأقمار الصناعية ومجمعات الشرائح الذكية.'
    },
    helium3: {
      id: 'helium3',
      name: 'هيليوم-3 الكوني النقي',
      rarity: 'نادر',
      rarityRank: 4,
      color: 'amber',
      basePrice: 150000,
      minPrice: 110000,
      maxPrice: 210000,
      icon: 'fa-solid fa-atom text-amber-400',
      desc: 'نظير نظيف ووقود نووي اندماجي لا يقدر بثمن، يشغل محطات الطاقة العالمية والسفن المدارية.'
    },
    lithium: {
      id: 'lithium',
      name: 'الليثيوم الفضائي المشع',
      rarity: 'أسطوري',
      rarityRank: 5,
      color: 'yellow',
      basePrice: 240000,
      minPrice: 170000,
      maxPrice: 340000,
      icon: 'fa-solid fa-bolt text-yellow-300',
      desc: 'بلورات طاقة مشحونة فائقة التوصيل، تتيح شحن محركات الدفع الضوئي والمركبات العابرة للكواكب.'
    },
    dark_matter: {
      id: 'dark_matter',
      name: 'بلورات المادة المظلمة',
      rarity: 'فائق الندرة',
      rarityRank: 6,
      color: 'fuchsia',
      basePrice: 450000,
      minPrice: 320000,
      maxPrice: 650000,
      icon: 'fa-solid fa-wand-magic-sparkles text-fuchsia-400',
      desc: 'أندر وأثمن مادة في الكون، لغز فيزيائي تشتريه مراكز أبحاث الفضاء والمليارديرات بأسعار فلكية.'
    }
  },

  goldManagers: {
    1: {
      tier: 1,
      id: 'ops_director',
      name: 'د. ليام - مدير العمليات الفضائية',
      title: 'مدير الرحلات والملاحة المدارية',
      goldCost: 1000,
      timeDiscountPct: 20,
      yieldBonusPct: 0,
      sellBonusPct: 0,
      autoPilot: false,
      avatar: 'assets/space_manager_ops.jpg',
      badge: 'مدير العمليات',
      color: 'from-blue-600 to-sky-600',
      borderColor: 'border-sky-500/50',
      desc: 'يضبط مسارات الطيران ويقلص زمن كافة رحلات الاستكشاف الفضائي بنسبة 20% فورياً.'
    },
    2: {
      tier: 2,
      id: 'geology_expert',
      name: 'د. سارة - خبيرة الجيولوجيا الكونية',
      title: 'رئيسة مسح وتعدين الأجرام الفضائية',
      goldCost: 2500,
      timeDiscountPct: 0,
      yieldBonusPct: 25,
      sellBonusPct: 0,
      autoPilot: false,
      avatar: 'assets/space_manager_geo.jpg',
      badge: 'خبير جيولوجيا VIP',
      color: 'from-amber-600 to-yellow-500',
      borderColor: 'border-amber-500/50',
      desc: 'تحدد مواقع الرواسب النادرة وترفع حصيلة ونقاء المعادن المستخرجة في كل رحلة بنسبة +25%.'
    },
    3: {
      tier: 3,
      id: 'fleet_admiral',
      name: 'الآدميرال فالكون - القائد العام للأسطول',
      title: 'القائد الأعلى لمنظومة استكشاف الفضاء',
      goldCost: 5000,
      timeDiscountPct: 15,
      yieldBonusPct: 15,
      sellBonusPct: 15,
      autoPilot: true,
      avatar: 'assets/space_manager_admiral.jpg',
      badge: 'قائد الأسطول المداري',
      color: 'from-purple-600 to-fuchsia-600',
      borderColor: 'border-fuchsia-500/50',
      desc: 'تحصيل وإعادة إطلاق الرحلات تلقائياً (Auto-Pilot) + 15% بونص أرباح بيع المعادن بالبورصة و -15% زمن الرحلات.'
    }
  }
};

/**
 * Creates the initial, default space state for a player
 */
function createInitialSpaceState() {
  return {
    unlocked: false,
    unlockedAt: 0,
    facilities: {
      launchpads: 1,
      mission_control: 1,
      ore_silo: 1,
      ore_refinery: 1
    },
    activeRockets: [], // Array of { id, modelId, name, purchasedAt, status: 'ready'|'in_flight'|'landed', flight: null }
    activeFlights: [], // Array of { id, rocketId, padId, destinationId, launchedAt, arrivalTime, payload: null, isClaimed: false }
    warehouse: {
      regolith: 0,
      iron: 0,
      platinum: 0,
      helium3: 0,
      lithium: 0,
      dark_matter: 0
    },
    hiredManagers: [], // Array of manager tiers [1, 2, 3]
    stats: {
      totalFlightsLaunched: 0,
      totalFlightsCompleted: 0,
      totalOresMinedKg: 0,
      totalRevenueEGP: 0
    }
  };
}

/**
 * Deterministic pseudo-random generator seeded with Cairo calendar day (YYYY-MM-DD)
 * Ensures 100% fair, identical 24h market commodity rates for all players without client tampering.
 */
function getCairoDateString(timestamp = Date.now()) {
  const d = new Date(timestamp);
  // UTC+3 (Cairo Time / EEST/EET shift)
  const cairoTime = new Date(d.getTime() + (3 * 3600 * 1000));
  const year = cairoTime.getUTCFullYear();
  const month = String(cairoTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(cairoTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayCairoDateString(timestamp = Date.now()) {
  const prevTime = timestamp - (24 * 3600 * 1000);
  return getCairoDateString(prevTime);
}

function stringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Calculates authoritative 24h daily mineral spot prices with realistic fluctuations (-25% to +35%)
 * and computes daily trend percentage compared to yesterday's price.
 */
function calculateDailyOrePrices(timestamp = Date.now()) {
  const todayStr = getCairoDateString(timestamp);
  const yesterdayStr = getYesterdayCairoDateString(timestamp);

  const todaySeed = stringToSeed(todayStr);
  const yesterdaySeed = stringToSeed(yesterdayStr);

  const prices = {};

  Object.entries(SPACE_CONFIG.ores).forEach(([oreKey, oreDef], idx) => {
    // Today price
    const s1 = todaySeed + (idx * 7919);
    const randToday = seededRandom(s1);
    // Variation between -25% to +35%
    const factorToday = 0.75 + (randToday * 0.60);
    const currentPrice = Math.round(oreDef.basePrice * factorToday);
    const clampedToday = Math.max(oreDef.minPrice, Math.min(oreDef.maxPrice, currentPrice));

    // Yesterday price
    const s2 = yesterdaySeed + (idx * 7919);
    const randYesterday = seededRandom(s2);
    const factorYesterday = 0.75 + (randYesterday * 0.60);
    const prevPrice = Math.round(oreDef.basePrice * factorYesterday);
    const clampedYesterday = Math.max(oreDef.minPrice, Math.min(oreDef.maxPrice, prevPrice));

    // Change %
    const changePct = Number((((clampedToday - clampedYesterday) / clampedYesterday) * 100).toFixed(1));

    prices[oreKey] = {
      id: oreKey,
      name: oreDef.name,
      rarity: oreDef.rarity,
      rarityRank: oreDef.rarityRank,
      color: oreDef.color,
      icon: oreDef.icon,
      basePrice: oreDef.basePrice,
      price: clampedToday,
      yesterdayPrice: clampedYesterday,
      changePct: changePct,
      isUp: changePct >= 0,
      date: todayStr
    };
  });

  return {
    date: todayStr,
    nextResetAt: getNextMidnightCairoTimestamp(timestamp),
    prices: prices
  };
}

function getNextMidnightCairoTimestamp(timestamp = Date.now()) {
  const d = new Date(timestamp + (3 * 3600 * 1000));
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime() - (3 * 3600 * 1000);
}

/**
 * Calculates player bonuses from facilities and VIP Gold Managers
 */
function getSpaceBonuses(spaceState) {
  const bonuses = {
    maxLaunchpads: 1,
    timeReductionPct: 0,
    siloCapacity: 1000,
    yieldMultiplier: 1.0,
    sellBonusPct: 0,
    autoPilot: false
  };

  if (!spaceState || typeof spaceState !== 'object') return bonuses;

  const fac = spaceState.facilities || {};
  const padLvl = Math.max(1, Math.min(3, Number(fac.launchpads) || 1));
  const mcLvl = Math.max(1, Math.min(4, Number(fac.mission_control) || 1));
  const siloLvl = Math.max(1, Math.min(4, Number(fac.ore_silo) || 1));
  const refLvl = Math.max(1, Math.min(4, Number(fac.ore_refinery) || 1));

  bonuses.maxLaunchpads = SPACE_CONFIG.facilities.launchpads.levels[padLvl]?.maxPads || 1;
  bonuses.timeReductionPct += (SPACE_CONFIG.facilities.mission_control.levels[mcLvl]?.timeReduction || 0) * 100;
  bonuses.siloCapacity = SPACE_CONFIG.facilities.ore_silo.levels[siloLvl]?.capacity || 1000;
  bonuses.yieldMultiplier = SPACE_CONFIG.facilities.ore_refinery.levels[refLvl]?.yieldMultiplier || 1.0;

  // Gold Managers
  const hired = Array.isArray(spaceState.hiredManagers) ? spaceState.hiredManagers : [];
  hired.forEach(tier => {
    const mgr = SPACE_CONFIG.goldManagers[tier];
    if (mgr) {
      if (mgr.timeDiscountPct) bonuses.timeReductionPct += mgr.timeDiscountPct;
      if (mgr.yieldBonusPct) bonuses.yieldMultiplier += (mgr.yieldBonusPct / 100);
      if (mgr.sellBonusPct) bonuses.sellBonusPct += mgr.sellBonusPct;
      if (mgr.autoPilot) bonuses.autoPilot = true;
    }
  });

  // Cap time reduction at 75% for economic integrity
  bonuses.timeReductionPct = Math.min(75, bonuses.timeReductionPct);

  return bonuses;
}

/**
 * Calculates authoritative flight duration in seconds
 */
function calculateFlightDuration(destinationId, spaceState) {
  const dest = SPACE_CONFIG.destinations[destinationId];
  if (!dest) return 3600;

  const bonuses = getSpaceBonuses(spaceState);
  const factor = 1 - (bonuses.timeReductionPct / 100);
  return Math.max(60, Math.round(dest.baseSeconds * factor));
}

/**
 * Calculates current total warehouse payload in KG
 */
function calculateWarehouseTotalWeight(warehouse = {}) {
  let total = 0;
  Object.values(warehouse).forEach(v => {
    total += Math.max(0, Number(v) || 0);
  });
  return total;
}

/**
 * Generates mineral loot payload when rocket returns from destination
 */
function generateOrePayload(destinationId, rocketModelId, spaceState) {
  const dest = SPACE_CONFIG.destinations[destinationId];
  const model = SPACE_CONFIG.rocketModels[rocketModelId];
  if (!dest || !model) return {};

  const bonuses = getSpaceBonuses(spaceState);
  const totalCapacityKg = Math.round(model.cargoCapacity * bonuses.yieldMultiplier);

  const payload = {};
  let distributedKg = 0;

  const oreEntries = Object.entries(dest.ores);
  oreEntries.forEach(([oreKey, oreRule], idx) => {
    if (idx === oreEntries.length - 1) {
      // Last ore gets remainder
      const rem = Math.max(1, totalCapacityKg - distributedKg);
      payload[oreKey] = rem;
      distributedKg += rem;
    } else {
      const minWeight = Math.round(totalCapacityKg * oreRule.minPct);
      const maxWeight = Math.round(totalCapacityKg * oreRule.maxPct);
      const allocated = Math.max(1, Math.min(totalCapacityKg - distributedKg, Math.round(minWeight + Math.random() * (maxWeight - minWeight))));
      payload[oreKey] = allocated;
      distributedKg += allocated;
    }
  });

  return payload;
}

module.exports = {
  SPACE_CONFIG,
  createInitialSpaceState,
  getCairoDateString,
  calculateDailyOrePrices,
  getSpaceBonuses,
  calculateFlightDuration,
  calculateWarehouseTotalWeight,
  generateOrePayload
};
