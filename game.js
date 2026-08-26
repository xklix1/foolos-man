/**
 * Ras ALmal Tycoon (رأس المال)
 * Simulation Engine (game.js)
 * Manages game state, ticks, algorithms, and business logic
 */

const GameEngine = (() => {
  // --- Game Configurations & Data Tables ---

  const JOBS = {
    worker:        { id: 'worker',        name: 'عامل باليومية',              salary: 12,    xpReward: 4,   xpNeeded: 0 },
    cashier:       { id: 'cashier',       name: 'محاسب صندوق',                salary: 32,    xpReward: 7,   xpNeeded: 80 },
    accountant:    { id: 'accountant',    name: 'محاسب مالي قانوني',          salary: 85,    xpReward: 12,  xpNeeded: 280 },
    manager:       { id: 'manager',       name: 'مدير فرع',                   salary: 210,   xpReward: 18,  xpNeeded: 850 },
    director:      { id: 'director',      name: 'مدير تنفيذي للمجموعة',       salary: 540,   xpReward: 26,  xpNeeded: 2400 },
    ceo:           { id: 'ceo',           name: 'رئيس مجلس الإدارة',           salary: 1400,  xpReward: 40,  xpNeeded: 6500 },
    consultant:    { id: 'consultant',    name: 'مستشار اقتصادي ووزير سابق',  salary: 3800,  xpReward: 65,  xpNeeded: 16000 },
    bank_governor: { id: 'bank_governor', name: 'محافظ البنك المركزي',        salary: 9500,  xpReward: 100, xpNeeded: 40000 },
    sovereign_head:{ id: 'sovereign_head',name: 'رئيس صندوق الاستثمار السيادي',salary: 24000, xpReward: 160, xpNeeded: 95000 },
    oligarch:      { id: 'oligarch',      name: 'إمبراطور كبار المستثمرين',  salary: 65000, xpReward: 280, xpNeeded: 220000 }
  };

  const BUSINESSES = {
    coffee: {
      id: 'coffee',
      name: 'عربة قهوة مختصة',
      cost: 15000,
      baseDemand: 22,
      optimumPrice: 22,
      costOfGoods: 9,
      upgradeMultiplier: 1.45,
      workerMultiplier: 1.15,
      workerWage: 6
    },
    tech: {
      id: 'tech',
      name: 'شركة برمجيات وتطبيقات',
      cost: 110000,
      baseDemand: 8,
      optimumPrice: 160,
      costOfGoods: 55,
      upgradeMultiplier: 1.55,
      workerMultiplier: 1.20,
      workerWage: 25
    },
    logistics: {
      id: 'logistics',
      name: 'مجمع خدمات لوجستية وشحن',
      cost: 650000,
      baseDemand: 5,
      optimumPrice: 1100,
      costOfGoods: 360,
      upgradeMultiplier: 1.65,
      workerMultiplier: 1.25,
      workerWage: 110
    },
    supermarket: {
      id: 'supermarket',
      name: 'سلسلة سوبرماركت وتجزئة',
      cost: 2400000,
      baseDemand: 16,
      optimumPrice: 450,
      costOfGoods: 180,
      upgradeMultiplier: 1.70,
      workerMultiplier: 1.28,
      workerWage: 320
    },
    solar_factory: {
      id: 'solar_factory',
      name: 'مصنع ألواح الطاقة الشمسية',
      cost: 8500000,
      baseDemand: 7,
      optimumPrice: 3200,
      costOfGoods: 1250,
      upgradeMultiplier: 1.75,
      workerMultiplier: 1.30,
      workerWage: 950
    },
    private_hospital: {
      id: 'private_hospital',
      name: 'مستشفى ومجمع طبي تخصصي',
      cost: 32000000,
      baseDemand: 4,
      optimumPrice: 11500,
      costOfGoods: 3800,
      upgradeMultiplier: 1.80,
      workerMultiplier: 1.35,
      workerWage: 2800
    },
    media_studio: {
      id: 'media_studio',
      name: 'مؤسسة إنتاج إعلامي وسينمائي',
      cost: 85000000,
      baseDemand: 5,
      optimumPrice: 28000,
      costOfGoods: 8500,
      upgradeMultiplier: 1.82,
      workerMultiplier: 1.38,
      workerWage: 6500
    },
    private_bank: {
      id: 'private_bank',
      name: 'بنك استثماري وشركة وساطة مالية',
      cost: 250000000,
      baseDemand: 3,
      optimumPrice: 95000,
      costOfGoods: 26000,
      upgradeMultiplier: 1.85,
      workerMultiplier: 1.40,
      workerWage: 18000
    },
    oil_refinery: {
      id: 'oil_refinery',
      name: 'مجمع مصافي البترول والطاقة',
      cost: 750000000,
      baseDemand: 4,
      optimumPrice: 310000,
      costOfGoods: 80000,
      upgradeMultiplier: 1.88,
      workerMultiplier: 1.45,
      workerWage: 52000
    },
    space_tech: {
      id: 'space_tech',
      name: 'مؤسسة استكشاف الفضاء والأقمار الصناعية',
      cost: 2500000000,
      baseDemand: 2,
      optimumPrice: 1250000,
      costOfGoods: 320000,
      upgradeMultiplier: 1.92,
      workerMultiplier: 1.50,
      workerWage: 180000
    }
  };

  const ASSETS = {
    apartment: { id: 'apartment', name: 'شقة سكنية مؤجرة', cost: 180000, rent: 140, appreciation: 0.0008 },
    office: { id: 'office', name: 'مبنى مكاتب تجارية', cost: 1200000, rent: 1100, appreciation: 0.0012 },
    mansion: { id: 'mansion', name: 'قصر ريفي فاخر', cost: 5500000, rent: 5800, appreciation: 0.0015 },
    skyline_tower: { id: 'skyline_tower', name: 'برج ناطحة سحاب تجاري', cost: 25000000, rent: 28000, appreciation: 0.0018 },
    luxury_resort: { id: 'luxury_resort', name: 'منتجع وفندق سياحي 5 نجوم', cost: 120000000, rent: 145000, appreciation: 0.0020 },
    mega_yacht: { id: 'mega_yacht', name: 'يخت ملكي فاخر خاص', cost: 450000000, rent: 560000, appreciation: 0.0022 },
    private_island: { id: 'private_island', name: 'جزيرة استوائية خاصة', cost: 1800000000, rent: 2400000, appreciation: 0.0025 },
    orbital_station: { id: 'orbital_station', name: 'محطة مدارية فضائية خاصة', cost: 8000000000, rent: 12000000, appreciation: 0.0030 }
  };

  const STOCKS = {
    COMI: { name: 'البنك التجاري الدولي', symbol: 'COMI', basePrice: 32, volatility: 0.03, reversion: 0.01, floor: 15, dividend: 0.0001 },
    EAST: { name: 'الشرقية للدخان', symbol: 'EAST', basePrice: 78, volatility: 0.05, reversion: 0.015, floor: 30, dividend: 0.0002 },
    ETEL: { name: 'المصرية للاتصالات', symbol: 'ETEL', basePrice: 42, volatility: 0.04, reversion: 0.012, floor: 20, dividend: 0.00015 },
    FWRY: { name: 'فوري للمدفوعات الإلكترونية', symbol: 'FWRY', basePrice: 85, volatility: 0.06, reversion: 0.02, floor: 40, dividend: 0.0001 },
    CASH: { name: 'صندوق الاستثمار التقني البديل', symbol: 'CASH', basePrice: 110, volatility: 0.08, reversion: 0.025, floor: 25, dividend: 0.0003 },
    BITC: { name: 'مؤشر البيتكوين والأصول الرقمية', symbol: 'BITC', basePrice: 280, volatility: 0.12, reversion: 0.03, floor: 50, dividend: 0 },
    GOLD: { name: 'صندوق سبائك الذهب الخالص', symbol: 'GOLD', basePrice: 190, volatility: 0.025, reversion: 0.008, floor: 90, dividend: 0.00025 },
    AIX:  { name: 'صندوق الذكاء الاصطناعي العالمي', symbol: 'AIX', basePrice: 340, volatility: 0.09, reversion: 0.022, floor: 80, dividend: 0.0002 }
  };

  const STORE_ITEMS = {
    gold_pen: { 
      id: 'gold_pen', 
      name: 'القلم الذهبي للمدراء', 
      cost: 25000, 
      desc: 'يزيد خبرتك الوظيفية XP بنسبة +35% لتسريع الترقيات. ينتهي مفعوله بعد دقيقتين.',
      effect: 'xp_boost', 
      value: 0.35,
      durationTicks: 120 // 2 minutes
    },
    premium_lawyer: { 
      id: 'premium_lawyer', 
      name: 'توكيل محامٍ دولي قدير', 
      cost: 150000, 
      desc: 'يخفض خطورة القبض في صفقات السوق المحظورة بنسبة -18% لمدة 4 دقائق.',
      effect: 'legal_protection', 
      value: 0.18,
      durationTicks: 240
    },
    energy_drink: { 
      id: 'energy_drink', 
      name: 'مشروب الطاقة والتركيز الفائق', 
      cost: 18000, 
      desc: 'يمنحك نشاطاً فائقاً ويزيد راتب نوبات العمل بنسبة +60% لمدة 90 ثانية.',
      effect: 'salary_multiplier', 
      value: 1.60,
      durationTicks: 90
    },
    tax_shield: { 
      id: 'tax_shield', 
      name: 'درع الإعفاء والملاذ الضريبي', 
      cost: 180000, 
      desc: 'يمنحك خصماً قدره 15% على ترقيات الشركات ويخفض ضريبة الثروة بنسبة 50% لمدة 3 دقائق.',
      effect: 'upgrade_discount', 
      value: 0.15,
      durationTicks: 180
    },
    market_scanner: { 
      id: 'market_scanner', 
      name: 'ماسح البورصة والتداول الذكي', 
      cost: 250000, 
      desc: 'يخفف أثر الهبوط والتصحيحات العكسية لأسهمك بنسبة 40% لمدة 3 دقائق.',
      effect: 'stock_shield', 
      value: 0.40,
      durationTicks: 180
    },
    vip_casino_pass: { 
      id: 'vip_casino_pass', 
      name: 'بطاقة VIP لكازينو الحظ', 
      cost: 250000, 
      desc: 'ترفع نسبة الفوز في الكازينو وعجلة الحظ بنسبة +15%. تنتهي وتدمر صلاحيتها بعد 300 ثانية.',
      effect: 'casino_luck_boost', 
      value: 0.15,
      durationTicks: 100 // 100 ticks = 300 seconds (5 minutes)
    },
    quantum_cpu: {
      id: 'quantum_cpu',
      name: 'معالج الحوسبة الكمومية (Quantum Core)',
      cost: 650000,
      desc: 'يضاعف أرباح وتدفقات كافة مشاريعك وشركاتك بنسبة +50% لمدة 6 دقائق.',
      effect: 'biz_multiplier',
      value: 1.5,
      durationTicks: 120
    },
    diamond_card: {
      id: 'diamond_card',
      name: 'عضوية النادي الماسي للبنوك الدولية',
      cost: 2000000,
      desc: 'ترفع فوائد الودائع البنكية وتخفض ضرائب الثروة بنسبة 50% لمدة 10 دقائق.',
      effect: 'bank_perk',
      value: 0.5,
      durationTicks: 200
    }
  };

  const INVESTMENTS = {
    short: {
      id: 'short',
      name: 'وديعة بنكية قصيرة الأجل',
      durationTicks: 600, // 10 minutes
      rate: 0.08,
      minAmount: 10000,
      maxAmount: 100000,
      desc: 'تجميد السيولة لمدة 10 دقائق لتوفير التمويل المصرفي مقابل عائد أرباح إضافي (+8%).'
    },
    medium: {
      id: 'medium',
      name: 'صندوق استثمار عقاري وسندات',
      durationTicks: 1800, // 30 minutes
      rate: 0.25,
      minAmount: 50000,
      maxAmount: 500000,
      desc: 'استثمار مضمون في أصول إنشائية وتجارية مدرة للدخل لمدة 30 دقيقة (+25%).'
    },
    long: {
      id: 'long',
      name: 'صندوق أسهم وتحوط دولي خاص',
      durationTicks: 7200, // 2 hours
      rate: 0.65,
      minAmount: 250000,
      maxAmount: 3000000,
      desc: 'محفظة استثمارية مغلقة في أسواق المال العالمية لمدة ساعتين بعوائد استثنائية (+65%).'
    },
    venture: {
      id: 'venture',
      name: 'صندوق الاكتتابات والشركات المليارية',
      durationTicks: 21600, // 6 hours
      rate: 1.50,
      minAmount: 1500000,
      maxAmount: 20000000,
      desc: 'استثمار استراتيجي مغلق في شركات التكنولوجيا الصاعدة لمدة 6 ساعات بعوائد فائقة (+150%).'
    },
    imperial: {
      id: 'imperial',
      name: 'صندوق الثروة الإمبراطوري الماسي',
      durationTicks: 43200, // 12 hours (43,200 seconds)
      rate: 3.00,
      minAmount: 10000000,
      maxAmount: 100000000,
      desc: 'خزينة مقفلة لكبار أثرياء العالم لمدة 12 ساعة تمنح عائداً أسطورياً أربعة أضعاف (+300%).'
    }
  };

  const BLACK_MARKET = {
    contraband_cigars: {
      id: 'contraband_cigars',
      name: 'تهريب بضائع وسيجار جمركي فاخر',
      desc: 'إدخال شحنة بضائع حصرية عبر الميناء بدون دفع رسوم جمركية.',
      cost: 6000,
      payout: 15000,
      successChance: 0.82,
      jailDuration: 18,
      repGain: 15,
      icon: 'fa-box-open',
      tier: 'سهل'
    },
    electronics: {
      id: 'electronics',
      name: 'تهريب حاوية أجهزة إلكترونية حديثة',
      desc: 'استيراد غير رسمي لأجهزة هواتف ومعدات حاسوبية من وراء الجمارك.',
      cost: 35000,
      payout: 88000,
      successChance: 0.72,
      jailDuration: 35,
      repGain: 35,
      icon: 'fa-laptop-code',
      tier: 'متوسط'
    },
    arms_intel: {
      id: 'arms_intel',
      name: 'صفقة تسريب سيرفرات وبيانات استخباراتية',
      desc: 'بيع وثائق حساسة وشفرات سرية لجهات استثمارية عالمية.',
      cost: 110000,
      payout: 320000,
      successChance: 0.58,
      jailDuration: 60,
      repGain: 80,
      icon: 'fa-user-secret',
      tier: 'متقدم'
    },
    crypto: {
      id: 'crypto',
      name: 'اختراق منصات رقمية وغسيل عملات مشفرة',
      desc: 'هجوم سيبراني معقد على محافظ العملات المشفرة مع تحويل الأصول لخوادم خارجية.',
      cost: 380000,
      payout: 1250000,
      successChance: 0.46,
      jailDuration: 90,
      repGain: 160,
      icon: 'fa-network-wired',
      tier: 'محترف'
    },
    artifacts: {
      id: 'artifacts',
      name: 'تهريب آثار ومخطوطات نادرة لمزادات سرية',
      desc: 'صفقة كبرى لبيع قطع أثرية نادرة لكبار هواة الجمع في السوق السوداء الدولية.',
      cost: 1200000,
      payout: 4600000,
      successChance: 0.36,
      jailDuration: 130,
      repGain: 320,
      icon: 'fa-gem',
      tier: 'خطر جداً'
    },
    diamond_heist: {
      id: 'diamond_heist',
      name: 'عملية السطو الكبرى على خزائن الماس الدولية',
      desc: 'أضخم عملية سرقة منظمة في التاريخ لخزينة الماس والسبائك البنكية.',
      cost: 4000000,
      payout: 20000000,
      successChance: 0.24,
      jailDuration: 180,
      repGain: 800,
      icon: 'fa-shield-halved',
      tier: 'أسطوري'
    },
    defense_tech: {
      id: 'defense_tech',
      name: 'صفقة تكنولوجيا دفاعية وشفرات رادار مسربة',
      desc: 'بيع شفرات منظومات دفاع جوي فائقة التطور لجهات أجنبية خاصة.',
      cost: 15000000,
      payout: 75000000,
      successChance: 0.20,
      jailDuration: 240,
      repGain: 1500,
      icon: 'fa-jet-fighter',
      tier: 'أسطوري'
    },
    satellite_hack: {
      id: 'satellite_hack',
      name: 'السيطرة على شبكة أقمار صناعية وتشفيرها',
      desc: 'اختراق منظومة البث الفضائي العالمية وطلب فدية بمليارات الدولارات.',
      cost: 60000000,
      payout: 320000000,
      successChance: 0.16,
      jailDuration: 300,
      repGain: 3500,
      icon: 'fa-satellite',
      tier: 'خطر مطلق'
    },
    godfather: {
      id: 'godfather',
      name: 'عملية العراب: السيطرة على كارتيل التجارة العالمي',
      desc: 'الانقلاب الشامل والسيطرة على مقاليد إمبراطورية السوق السوداء العالمية.',
      cost: 250000000,
      payout: 1500000000,
      successChance: 0.12,
      jailDuration: 400,
      repGain: 10000,
      icon: 'fa-crown',
      tier: 'سيد الظلال'
    }
  };

  const BLACK_MARKET_GEAR = {
    radar_jammer: {
      id: 'radar_jammer',
      name: 'جهاز تشويش رادارات الشرطة',
      desc: 'يقلل احتمالية المداهمة الأمنية في صفقات السوق السوداء بنسبة 12% لمدة 4 دقائق.',
      cost: 150000,
      icon: 'fa-satellite-dish',
      durationTicks: 240
    },
    fake_passport: {
      id: 'fake_passport',
      name: 'جواز سفر دبلوماسي مزور',
      desc: 'حماية طوارئ لمرة واحدة — يضمن لك الهروب وتفادي السجن عند أول مداهمة.',
      cost: 600000,
      icon: 'fa-passport',
      durationTicks: 300
    },
    crypto_cleaner: {
      id: 'crypto_cleaner',
      name: 'بروتوكول تشفير مالي (Zero-Trace)',
      desc: 'يخفض عمولة غسيل الأموال إلى 6% بدلاً من 12% لتعظيم تحويل الكاش.',
      cost: 450000,
      icon: 'fa-shield-virus',
      durationTicks: 200
    },
    diplomatic_bag: {
      id: 'diplomatic_bag',
      name: 'حقيبة التشفير الدبلوماسية المصفحة',
      desc: 'تحمي 35% من الأموال المشبوهة من المصادرة التامة في حال المداهمة.',
      cost: 800000,
      icon: 'fa-briefcase',
      durationTicks: 240
    },
    commissioner_wire: {
      id: 'commissioner_wire',
      name: 'شريحة اتصال كبار المسؤولين (VIP Wire)',
      desc: 'تخفض تكلفة الرشوة وإسقاط الملاحقات الأمنية بنسبة 35%.',
      cost: 1800000,
      icon: 'fa-mobile-retro',
      durationTicks: 300
    }
  };

  // --- Initial Default Player State ---
  const INITIAL_STATE = {
    cash: 1500,
    bank: 500,
    dirtyCash: 0,
    xp: 0,
    underworldRep: 0,
    heatLevel: 0,
    jobId: 'worker',
    businesses: {
      coffee: { level: 0, price: 22, workers: 0 },
      tech: { level: 0, price: 160, workers: 0 },
      logistics: { level: 0, price: 1100, workers: 0 },
      supermarket: { level: 0, price: 450, workers: 0 },
      solar_factory: { level: 0, price: 3200, workers: 0 },
      private_hospital: { level: 0, price: 11500, workers: 0 },
      media_studio: { level: 0, price: 28000, workers: 0 },
      private_bank: { level: 0, price: 95000, workers: 0 },
      oil_refinery: { level: 0, price: 310000, workers: 0 },
      space_tech: { level: 0, price: 1250000, workers: 0 }
    },
    investments: [], // Array of { id, investedAmount, ticksRemaining, rate, name }
    activeLoan: null, // Stores { amount, totalDue, ticksRemaining }
    assets: {
      apartment: 0,
      office: 0,
      mansion: 0,
      skyline_tower: 0,
      luxury_resort: 0,
      mega_yacht: 0,
      private_island: 0,
      orbital_station: 0
    },
    stocks: {
      COMI: { shares: 0, avgPrice: 0 },
      EAST: { shares: 0, avgPrice: 0 },
      ETEL: { shares: 0, avgPrice: 0 },
      FWRY: { shares: 0, avgPrice: 0 },
      CASH: { shares: 0, avgPrice: 0 },
      BITC: { shares: 0, avgPrice: 0 },
      GOLD: { shares: 0, avgPrice: 0 },
      AIX:  { shares: 0, avgPrice: 0 }
    },
    inventory: {
      gold_pen: 0,
      premium_lawyer: 0,
      energy_drink: 0,
      tax_shield: 0,
      market_scanner: 0,
      vip_casino_pass: 0,
      radar_jammer: 0,
      fake_passport: 0,
      crypto_cleaner: 0,
      diplomatic_bag: 0,
      commissioner_wire: 0,
      quantum_cpu: 0,
      diamond_card: 0
    },
    itemDurations: {}, // Stores { itemId: ticksRemaining } for self-destruction timer
    jailTimer: 0,
    afkManagerExpiresAt: 0, // 12-hour active manager timestamp
    activityLog: [], // Rolling audit log of player actions
    netWorth: 2000,
    title: 'عامل مبتدئ'
  };

  let state = { ...INITIAL_STATE };
  let stockPrices = {}; // Stores { SYMBOL: [priceHistory...] }
  let activeUsername = "";
  let lastTipEventTimestamp = 0;

  // Record player action in rolling audit log
  function recordPlayerActivity(action, details, category = 'info') {
    if (!state.activityLog) state.activityLog = [];
    state.activityLog.unshift({
      timestamp: Date.now(),
      action: action,
      details: details,
      category: category // 'work' | 'business' | 'stock' | 'investment' | 'banking' | 'casino' | 'blackmarket' | 'store'
    });
    if (state.activityLog.length > 40) {
      state.activityLog.length = 40; // Keep last 40 entries
    }
  }

  // Initialize Stock Price Histories
  function initStocks() {
    Object.keys(STOCKS).forEach(sym => {
      const stock = STOCKS[sym];
      // Generate 25 points of initial history to make charts look great right away
      const history = [];
      let current = stock.basePrice;
      for (let i = 0; i < 25; i++) {
        const change = (Math.random() - 0.5) * 2 * stock.volatility;
        current = Math.max(stock.floor, Math.floor(current * (1 + change)));
        history.push(current);
      }
      stockPrices[sym] = history;
    });
  }

  // Calculate Net Worth: Cash + Bank + DirtyCash + (Real Estate * Cost) + (Stocks * currentPrice) + Locked Investments
  function calculateNetWorth() {
    let worth = (state.cash || 0) + (state.bank || 0) + (state.dirtyCash || 0);
    
    // Add real estate assets value
    Object.keys(state.assets).forEach(key => {
      worth += state.assets[key] * ASSETS[key].cost;
    });

    // Add stock shares value
    Object.keys(state.stocks).forEach(sym => {
      const shares = state.stocks[sym].shares || 0;
      const history = stockPrices[sym];
      const currentPrice = history ? history[history.length - 1] : STOCKS[sym].basePrice;
      worth += shares * currentPrice;
    });

    // Add locked investments capital
    state.investments.forEach(inv => {
      worth += inv.investedAmount;
    });

    return worth;
  }

  // Update Player Title based on Net Worth and XP
  function getAppropriateTitle(worth, xp) {
    if (worth >= 50000000 && xp >= 10000) return 'إمبراطور المال والفلوس';
    if (worth >= 25000000 && xp >= 5000) return 'ملياردير عصامي';
    if (worth >= 5000000 && xp >= 2000) return 'مليونير فخم';
    if (worth >= 1500000 && xp >= 800) return 'سيد الأعمال';
    if (worth >= 400000 && xp >= 350) return 'مستثمر طموح';
    if (worth >= 100000 && xp >= 120) return 'تاجر صاعد';
    if (xp >= 60) return 'موظف متميز';
    if (xp >= 20) return 'عامل ماهر';
    return 'عامل مبتدئ';
  }

  // Calculate total passive cashflow per tick from all businesses, real estate, and bank interest
  function calculatePassiveIncomePerTick() {
    let income = 0;
    if (!state) return 0;

    // 1. Businesses income (Gross Revenue minus Worker Wages Payroll)
    if (state.businesses) {
      Object.keys(state.businesses).forEach(key => {
        const bizState = state.businesses[key];
        const bizConfig = BUSINESSES[key];
        if (bizState && bizState.level > 0 && bizConfig) {
          const price = bizState.price || bizConfig.optimumPrice;
          const opt = bizConfig.optimumPrice;
          let elasticity = 1.0;
          if (price > opt) elasticity = Math.max(0, 1 - (price - opt) / opt);
          else if (price < opt) elasticity = 1 + (opt - price) / opt * 0.3;

          const marketingBoost = (bizState.marketingTicks && bizState.marketingTicks > 0) ? 1.4 : 1.0;
          const actualCostOfGoods = Math.floor(bizConfig.costOfGoods * 1.05);
          const upgradeFactor = Math.pow(bizConfig.upgradeMultiplier, bizState.level - 1);
          const workerFactor = 1 + ((bizState.workers || 0) * (bizConfig.workerMultiplier - 1));
          const demand = Math.floor(bizConfig.baseDemand * upgradeFactor * elasticity * workerFactor * marketingBoost);
          const margin = price - actualCostOfGoods;
          const hasQuantum = (state.inventory && state.inventory.quantum_cpu > 0);
          const quantumMultiplier = hasQuantum ? 1.5 : 1.0;
          const grossProfit = Math.max(0, Math.floor(demand * margin * 0.12 * quantumMultiplier));
          const workerPayroll = (bizState.workers || 0) * (bizConfig.workerWage || 0);
          const netProfit = Math.max(0, grossProfit - workerPayroll);
          income += netProfit;
        }
      });
    }

    // 2. Real estate rental income
    if (state.assets) {
      Object.keys(state.assets).forEach(key => {
        const owned = state.assets[key] || 0;
        if (owned > 0 && ASSETS[key]) {
          income += owned * Math.floor(ASSETS[key].rent * 0.1);
        }
      });
    }

    // 3. Bank interest (0.003% per tick = ~3.5% APY)
    if (state.bank && state.bank > 0) {
      income += Math.floor(state.bank * 0.00003);
    }

    // 4. Wealth Tax deduction for ultra-high net worth
    if (state.netWorth > 3000000) {
      const taxShieldActive = state.inventory && state.inventory.tax_shield > 0;
      const taxRate = taxShieldActive ? 0.000005 : 0.00002;
      const tax = Math.floor((state.netWorth - 3000000) * taxRate);
      income = Math.max(0, income - tax);
    }

    return income;
  }

  function calculatePassiveIncomePerSecond() {
    return calculatePassiveIncomePerTick();
  }

  // Apply appreciation or depreciation to Assets Cost (Simulated over time)
  function adjustAssetAppreciation() {
    // Modify asset base costs slightly in local config
    Object.keys(ASSETS).forEach(key => {
      const asset = ASSETS[key];
      const appreciationChance = Math.random();
      if (appreciationChance < 0.3) {
        // Appreciate by 0.1% to 0.4%
        const rate = asset.appreciation * (0.5 + Math.random());
        asset.cost = Math.floor(asset.cost * (1 + rate));
      }
    });
  }

  // --- Central Simulation Tick ---
  function processTick() {
    if (!activeUsername) return null;

    let updates = {
      bankInterestGained: 0,
      businessProfitGained: 0,
      rentGained: 0,
      stockMovement: false,
      investmentsMatured: [],
      tipEvent: null,
      healthDecay: 0,
      jailFree: false
    };

    // 1. Jail lockout processing
    if (state.jailTimer > 0) {
      state.jailTimer = Math.max(0, state.jailTimer - 1);
      if (state.jailTimer === 0) {
        updates.jailFree = true;
      }
      // Save state and skip income updates while jailed
      state.netWorth = calculateNetWorth();
      AppDB.savePlayerState(activeUsername, state);
      return updates;
    }

    // 2. Bank compound interest accrual (0.003% per tick = ~3.5% APY)
    if (state.bank > 0) {
      const rate = 0.00003;
      const interest = Math.floor(state.bank * rate);
      if (interest > 0) {
        state.bank += interest;
        updates.bankInterestGained = interest;
      }
    }

    // 3. Careers Auto Salary (earned automatically every 4 ticks)
    // To represent work contracts, the player receives a baseline salary passively
    const currentJob = JOBS[state.jobId];
    if (currentJob && Math.random() < 0.25) { // 25% chance per tick (= average 1 tick per 12 seconds)
      state.cash += currentJob.salary;
      updates.businessProfitGained += currentJob.salary;
    }

    // 4. Businesses passive income ticking (Gross revenue minus Worker Wages Payroll)
    Object.keys(state.businesses).forEach(key => {
      const bizState = state.businesses[key];
      const bizConfig = BUSINESSES[key];
      if (!bizState) return;

      if (bizState.level > 0) {
        // Price elasticity calculation: Demand falls if price is higher than optimum
        const price = bizState.price || bizConfig.optimumPrice;
        const opt = bizConfig.optimumPrice;
        let elasticityFactor = 1.0;
        
        if (price > opt) {
          elasticityFactor = Math.max(0, 1 - (price - opt) / opt);
        } else if (price < opt) {
          // Selling cheaper increases demand, up to +30%
          elasticityFactor = 1 + (opt - price) / opt * 0.3;
        }

        // Active Marketing Campaign boost (+40% demand boost if active)
        const marketingBoost = (bizState.marketingTicks && bizState.marketingTicks > 0) ? 1.4 : 1.0;
        if (bizState.marketingTicks && bizState.marketingTicks > 0) {
          bizState.marketingTicks--;
        }

        // Dynamic inflation / raw material cost fluctuation factor (0.9 to 1.15)
        const costFactor = 1.0 + ((Math.sin(Date.now() / 20000) * 0.1) + 0.05);
        const actualCostOfGoods = Math.floor(bizConfig.costOfGoods * costFactor);

        // Scale demand based on upgrades (level) and workers hired
        const upgradeFactor = Math.pow(bizConfig.upgradeMultiplier, bizState.level - 1);
        const workerFactor = 1 + ((bizState.workers || 0) * (bizConfig.workerMultiplier - 1));
        const demand = Math.floor(bizConfig.baseDemand * upgradeFactor * elasticityFactor * workerFactor * marketingBoost);
        
        // Margin per unit = Price - Dynamic Cost of Goods
        const margin = price - actualCostOfGoods;
        
        // Final profit per tick = gross margin (boosted by Quantum CPU +50%) minus worker wages
        const hasQuantum = (state.inventory && state.inventory.quantum_cpu > 0);
        const quantumMultiplier = hasQuantum ? 1.5 : 1.0;
        const grossProfit = Math.max(0, Math.floor(demand * margin * 0.12 * quantumMultiplier));
        const workerPayroll = (bizState.workers || 0) * (bizConfig.workerWage || 0);
        const profit = Math.max(0, grossProfit - workerPayroll);
        
        if (profit > 0) {
          state.cash += profit;
          updates.businessProfitGained += profit;
        }
      }
    });

    // 4.5 Passive Business Front Laundering (واجهات الشركات لغسيل الأموال تلقائياً بدون عمولة)
    if ((state.dirtyCash || 0) > 0 && state.businesses) {
      let bizFrontCapacity = 0;
      Object.keys(state.businesses).forEach(k => {
        const b = state.businesses[k];
        if (b && b.level > 0) {
          bizFrontCapacity += b.level * 250; // Each business level launders 250 EGP per tick automatically
        }
      });
      if (bizFrontCapacity > 0) {
        const autoCleaned = Math.min(state.dirtyCash, bizFrontCapacity);
        state.dirtyCash -= autoCleaned;
        state.cash += autoCleaned; // Added as clean legitimate cash
      }
    }

    // Progressive Wealth Tax on Ultra-High Net Worth
    if (state.netWorth > 3000000) {
      const taxShieldActive = state.inventory && state.inventory.tax_shield > 0;
      const taxRate = taxShieldActive ? 0.000005 : 0.00002;
      const tax = Math.floor((state.netWorth - 3000000) * taxRate);
      if (tax > 0) {
        state.cash = Math.max(0, state.cash - tax);
      }
    }

    // 5. Assets / Real Estate passive rental income ticking
    Object.keys(state.assets).forEach(key => {
      const ownedCount = state.assets[key] || 0;
      if (ownedCount > 0) {
        const asset = ASSETS[key];
        const rent = ownedCount * Math.floor(asset.rent * 0.1); // Rent scaling per tick
        state.cash += rent;
        updates.rentGained += rent;
      }
    });

    // 6. Investments duration counters (Real-time and offline timestamp accurate)
    const nowTimestamp = Date.now();
    const remainingInvestments = [];
    state.investments.forEach(inv => {
      if (inv.maturesAt) {
        if (nowTimestamp >= inv.maturesAt) {
          inv.ticksRemaining = 0;
        } else {
          inv.ticksRemaining = Math.max(0, Math.ceil((inv.maturesAt - nowTimestamp) / 1000));
        }
      } else {
        inv.ticksRemaining--;
      }

      if (inv.ticksRemaining <= 0) {
        // Investment matures!
        const payout = Math.floor(inv.investedAmount * (1 + inv.rate));
        state.cash += payout;
        updates.investmentsMatured.push({
          name: inv.name,
          payout: payout,
          profit: payout - inv.investedAmount
        });
      } else {
        remainingInvestments.push(inv);
      }
    });
    state.investments = remainingInvestments;

    // 7. Store Items Durability & Self-Destruction Timers
    if (!state.itemDurations) state.itemDurations = {};
    updates.expiredItems = [];

    Object.keys(state.itemDurations).forEach(itemId => {
      if (state.itemDurations[itemId] > 0) {
        state.itemDurations[itemId]--;
        if (state.itemDurations[itemId] <= 0) {
          // Self-destruct item!
          if (state.inventory[itemId] > 0) {
            state.inventory[itemId]--;
          }
          delete state.itemDurations[itemId];
          const itemDef = STORE_ITEMS[itemId];
          if (itemDef) {
            updates.expiredItems.push(itemDef.name);
          }
        }
      }
    });

    // 7. Stock Market fluctuations (Gaussian random walk with mean reversion)
    Object.keys(STOCKS).forEach(sym => {
      const stock = STOCKS[sym];
      const history = stockPrices[sym];
      const lastPrice = history[history.length - 1];

      // Mean reversion pull: force price towards basePrice
      const pull = (stock.basePrice - lastPrice) * stock.reversion;

      // Random shock
      const shock = (Math.random() - 0.5) * 2 * stock.volatility * lastPrice;

      let newPrice = Math.floor(lastPrice + pull + shock);
      newPrice = Math.max(stock.floor, newPrice); // Price floor protection

      history.push(newPrice);
      if (history.length > 30) history.shift(); // Cap history length for rendering
      updates.stockMovement = true;
    });

    // 8. Dynamic Market Events (All 8 Assets: COMI, EAST, ETEL, FWRY, CASH, BITC, GOLD, AIX)
    if (!updates.tipEvent && Math.random() < 0.12) { // 12% chance per tick (~every 20-30s)
      const eventTypes = [
        {
          type: 'crypto_bull_run',
          title: '🚀 انفجار سعر البيتكوين والأصول الرقمية',
          desc: 'موجة سيولة دولية قياسية تقفز بسهم BITC وصندوق الذكاء الاصطناعي AIX لقمم جديدة!',
          targetStocks: ['BITC', 'AIX'],
          multiplier: 1.32,
          toastType: 'success'
        },
        {
          type: 'gold_surge',
          title: '👑 ارتفاع تاريخي لسبائك الذهب 24k',
          desc: 'إقبال هائل من البنوك المركزية على شراء الذهب كملاذ آمن يرفع سهم GOLD بقوة!',
          targetStocks: ['GOLD', 'CASH'],
          multiplier: 1.28,
          toastType: 'success'
        },
        {
          type: 'ai_breakthrough',
          title: '🤖 طفرة تكنولوجية في أبحاث الذكاء الاصطناعي',
          desc: 'إطلاق نماذج ذكاء اصطناعي فائقة يرفع أسهم AIX وفوري FWRY إلى مستويات غير مسبوقة!',
          targetStocks: ['AIX', 'FWRY'],
          multiplier: 1.30,
          toastType: 'success'
        },
        {
          type: 'cbe_rate_hike',
          title: '🏛️ قرار المركزي: رفع الفائدة المصرفية',
          desc: 'البنك المركزي يرفع الفائدة! ارتفاع قوي لسهم CIB وانتكاسة تصحيحية لأسهم التجزئة.',
          targetStocks: ['COMI', 'CASH'],
          multiplier: 1.25,
          negativeTargets: ['EAST', 'FWRY'],
          negativeMultiplier: 0.88,
          toastType: 'warning'
        },
        {
          type: '5g_telecom_license',
          title: '📡 المصرية للاتصالات تطلق خدمات 5G رسمياً',
          desc: 'توسعات كبرى في شبكات الاتصالات والألياف تطلق موجة شراء قياسية على سهم ETEL!',
          targetStocks: ['ETEL'],
          multiplier: 1.35,
          toastType: 'success'
        },
        {
          type: 'fintech_boom',
          title: '💳 طفرة المدفوعات الرقمية والشمول المالي',
          desc: 'حوافز حكومية وتوسع هائل في المعاملات الإلكترونية يقفز بسهم فوري FWRY للأعلى!',
          targetStocks: ['FWRY'],
          multiplier: 1.28,
          toastType: 'success'
        },
        {
          type: 'supply_chain_relief',
          title: '🚢 انفراج سلاسل التوريد والشحن الدولي',
          desc: 'وصول شحنات التبغ والمواد الخام للموانئ يؤدي لقفزة في أرباح الشرقية للدخان EAST!',
          targetStocks: ['EAST'],
          multiplier: 1.26,
          toastType: 'success'
        },
        {
          type: 'crypto_flash_correction',
          title: '📉 تصحيح هابط مفاجئ في أسواق العملات المشفرة',
          desc: 'جني أرباح سريع يضغط على البيتكوين BITC مؤقتاً قبل استعادة مسار الصعود!',
          targetStocks: ['BITC'],
          multiplier: 0.82,
          toastType: 'error'
        },
        {
          type: 'global_market_correction',
          title: '⚡ تصحيح هابط عام في أسواق الأسهم',
          desc: 'موجة بيع لجني الأرباح تهبط بأسهم البورصة بنسب طفيفة تتيح فرص شراء ذهبية في القاع!',
          targetStocks: ['COMI', 'FWRY', 'EAST', 'ETEL', 'AIX'],
          multiplier: 0.88,
          toastType: 'warning'
        }
      ];

      const selectedEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      // Apply market shock to target stocks
      selectedEvent.targetStocks.forEach(sym => {
        if (stockPrices[sym]) {
          const lastP = stockPrices[sym][stockPrices[sym].length - 1];
          const newP = Math.max(STOCKS[sym].floor, Math.floor(lastP * selectedEvent.multiplier));
          stockPrices[sym][stockPrices[sym].length - 1] = newP;
        }
      });

      if (selectedEvent.negativeTargets) {
        selectedEvent.negativeTargets.forEach(sym => {
          if (stockPrices[sym]) {
            const lastP = stockPrices[sym][stockPrices[sym].length - 1];
            const newP = Math.max(STOCKS[sym].floor, Math.floor(lastP * selectedEvent.negativeMultiplier));
            stockPrices[sym][stockPrices[sym].length - 1] = newP;
          }
        });
      }

      updates.marketEvent = selectedEvent;
    }

    // 9. Random Life & Career Opportunities (Cooldown: 45 seconds)
    const TIP_COOLDOWN_MS = 45 * 1000; // 45 seconds for rich gameplay
    const now = Date.now();
    if (!lastTipEventTimestamp) lastTipEventTimestamp = now;

    if (!updates.tipEvent && (now - lastTipEventTimestamp >= TIP_COOLDOWN_MS) && Math.random() < 0.40) {
      lastTipEventTimestamp = now;
      const eventChance = Math.random();
      let tipTitle = "";
      let tipText = "";
      let amountGained = 0;
      let xpBonus = 0;

      if (eventChance < 0.35) {
        // Customer VIP Tip
        amountGained = Math.floor(500 + Math.random() * 1500);
        xpBonus = 15;
        tipTitle = "💵 إكرامية من عميل VIP";
        tipText = `حصلت على إكرامية سخية لقاء كفاءتك الاستثنائية بقيمة +${amountGained.toLocaleString()} EGP!`;
      } else if (eventChance < 0.65) {
        // Fast Commercial Deal
        amountGained = Math.floor(3000 + Math.random() * 12000);
        xpBonus = 35;
        tipTitle = "🤝 صفقة وساطة سريعة";
        tipText = `أتممت صفقة وساطة تجارية ناجحة وحصدت عمولة كاش بقيمة +${amountGained.toLocaleString()} EGP!`;
      } else if (eventChance < 0.85) {
        // Performance Bonus
        amountGained = Math.floor(15000 + Math.random() * 45000);
        xpBonus = 80;
        tipTitle = "⭐ مكافأة تميز وإدارة";
        tipText = `منحك مجلس الإدارة مكافأة تميز مفاجئة تقديراً لنمو استثماراتك بقيمة +${amountGained.toLocaleString()} EGP!`;
      } else {
        // Angel Investor Dividend
        amountGained = Math.floor(50000 + Math.random() * 150000);
        xpBonus = 150;
        tipTitle = "💎 منحة شريك استثماري";
        tipText = `قام مستثمر ملاكي بضخ أرباح إضافية في محفظتك بقيمة +${amountGained.toLocaleString()} EGP!`;
      }

      state.cash += amountGained;
      state.xp += xpBonus;
      updates.tipEvent = {
        title: tipTitle,
        message: tipText,
        gain: amountGained
      };
    }

    // Adjust assets market rates
    adjustAssetAppreciation();

    // Set last active timestamp for continuous profit tracking
    state.lastActiveTimestamp = Date.now();

    // Recalculate net worth and title
    state.netWorth = calculateNetWorth();
    state.title = getAppropriateTitle(state.netWorth, state.xp);

    // Save synced data to Database
    AppDB.savePlayerState(activeUsername, state);

    return updates;
  }

  // --- Active Session Setters ---
  async function loadUserSession(username) {
    activeUsername = username;
    const dbState = await AppDB.getPlayerState(username);
    if (dbState) {
      // Deep-merge with defaults so new keys added later are always present
      const mergedBusinesses = {};
      Object.keys(INITIAL_STATE.businesses).forEach(k => {
        mergedBusinesses[k] = {
          ...INITIAL_STATE.businesses[k],
          ...(dbState.businesses && dbState.businesses[k] ? dbState.businesses[k] : {})
        };
      });

      const mergedStocks = {};
      Object.keys(INITIAL_STATE.stocks).forEach(sym => {
        const saved = dbState.stocks && dbState.stocks[sym];
        mergedStocks[sym] = {
          shares: (saved && saved.shares != null) ? saved.shares : 0,
          avgPrice: (saved && saved.avgPrice != null) ? saved.avgPrice : 0
        };
      });

      const mergedAssets = {};
      Object.keys(INITIAL_STATE.assets).forEach(k => {
        mergedAssets[k] = (dbState.assets && dbState.assets[k] != null) ? dbState.assets[k] : 0;
      });

      const mergedInventory = {};
      Object.keys(INITIAL_STATE.inventory).forEach(k => {
        mergedInventory[k] = (dbState.inventory && dbState.inventory[k] != null) ? dbState.inventory[k] : 0;
      });

      state = {
        ...INITIAL_STATE,
        ...dbState,
        username: dbState.username || username,
        pin: dbState.pin || '',
        isAdmin: dbState.isAdmin === true,
        dirtyCash: Number(dbState.dirtyCash || 0),
        businesses: mergedBusinesses,
        assets: mergedAssets,
        stocks: mergedStocks,
        inventory: mergedInventory,
        investments: Array.isArray(dbState.investments) ? dbState.investments : []
      };

      // Calculate offline idle earnings if returning after being away (Requires active 12-hour AFK Manager)
      if (dbState.lastActiveTimestamp && dbState.lastActiveTimestamp > 0) {
        const now = Date.now();
        const managerExpiry = dbState.afkManagerExpiresAt || 0;
        
        // Effective offline time is capped by when the 12-hour manager expired
        const effectiveEnd = Math.min(now, managerExpiry);
        const elapsedSinceLastActive = Math.max(0, Math.floor((effectiveEnd - dbState.lastActiveTimestamp) / 1000));
        
        if (elapsedSinceLastActive >= 10 && (state.jailTimer || 0) <= 0) {
          // Cap at 12 hours (43,200 seconds)
          const cappedSeconds = Math.min(43200, elapsedSinceLastActive);
          const incomePerSec = calculatePassiveIncomePerSecond();
          const offlineEarnings = Math.floor(incomePerSec * cappedSeconds);
          if (offlineEarnings > 0) {
            state.cash += offlineEarnings;
            state.offlineReport = {
              seconds: cappedSeconds,
              earnings: offlineEarnings,
              wasManagerActive: true,
              expiredDuringAbsence: now > managerExpiry
            };
          }
        } else if (now > managerExpiry && managerExpiry > 0) {
          state.offlineReport = {
            seconds: 0,
            earnings: 0,
            wasManagerActive: false,
            expiredDuringAbsence: true
          };
        }
      }
      state.lastActiveTimestamp = Date.now();
      state.netWorth = calculateNetWorth();
      await AppDB.savePlayerState(username, state);
    } else {
      // Create new clean state — give new players their initial 12-hour manager permit
      state = JSON.parse(JSON.stringify(INITIAL_STATE));
      state.afkManagerExpiresAt = Date.now() + (12 * 60 * 60 * 1000);
      state.lastActiveTimestamp = Date.now();
      await AppDB.savePlayerState(username, state);
    }
    initStocks();
    return state;
  }

  function renewAfkManager() {
    if (!activeUsername) throw new Error("لا توجد جلسة لاعب نشطة.");
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    state.afkManagerExpiresAt = Date.now() + TWELVE_HOURS_MS;
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return {
      expiresAt: state.afkManagerExpiresAt,
      remainingMs: TWELVE_HOURS_MS
    };
  }

  function logoutUser() {
    activeUsername = "";
    state = { ...INITIAL_STATE };
  }

  // --- Interaction Actions (Strict Financial Logic Validation) ---

  // Shift Work click
  function performJobShift() {
    if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يمكنك العمل.");
    const job = JOBS[state.jobId] || JOBS.worker;
    if (!job) throw new Error("الوظيفة غير صالحة.");

    // Calculate XP boosters & energy drink salary multipliers
    const isPenActive = (state.inventory && state.inventory.gold_pen > 0);
    const isEnergyActive = (state.inventory && state.inventory.energy_drink > 0);

    const xpBoost = isPenActive ? (1 + (STORE_ITEMS.gold_pen ? STORE_ITEMS.gold_pen.value : 0.5)) : 1.0;
    const salaryMultiplier = isEnergyActive ? (STORE_ITEMS.energy_drink ? STORE_ITEMS.energy_drink.value : 2.0) : 1.0;

    const finalXpReward = Math.ceil(job.xpReward * xpBoost);
    const finalSalary = Math.floor(job.salary * salaryMultiplier);

    // Add XP and cash
    state.xp += finalXpReward;
    state.cash += finalSalary;

    // Recalculate and Save
    state.netWorth = calculateNetWorth();
    state.title = getAppropriateTitle(state.netWorth, state.xp);
    AppDB.savePlayerState(activeUsername, state);

    return {
      salary: finalSalary,
      xp: finalXpReward,
      isEnergyBoosted: isEnergyActive,
      isPenBoosted: isPenActive
    };
  }

  // Unlock Career Promotions
  function promoteJob(jobId) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يمكنك طلب ترقية.");
    const targetJob = JOBS[jobId];
    if (!targetJob) throw new Error("هذه الوظيفة غير موجودة.");

    if (state.xp < targetJob.xpNeeded) {
      throw new Error(`تحتاج إلى خبرة لا تقل عن ${targetJob.xpNeeded} XP لفتح هذه الترقية.`);
    }

    state.jobId = jobId;
    AppDB.savePlayerState(activeUsername, state);
    return targetJob;
  }

  // Buy Startup Business
  function purchaseBusiness(key) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك إدارة الاستثمارات.");
    const biz = BUSINESSES[key];
    if (!biz) throw new Error("المشروع غير متوفر.");

    // Guard: initialize bizState if missing (forward-compatibility with saved states)
    if (!state.businesses[key]) {
      state.businesses[key] = { level: 0, price: biz.optimumPrice, workers: 0 };
    }
    const bizState = state.businesses[key];

    if (bizState.level > 0) {
      throw new Error("تم شراء هذا المشروع بالفعل! يمكنك ترقيته لزيادة الأرباح.");
    }

    if (state.cash < biz.cost) {
      throw new Error(`رصيدك غير كافٍ. تحتاج: ${biz.cost.toLocaleString()} EGP — لديك: ${state.cash.toLocaleString()} EGP`);
    }

    state.cash -= biz.cost;
    bizState.level = 1;

    recordPlayerActivity('شراء مشروع', `شراء مشروع "${biz.name}" بسعر ${biz.cost.toLocaleString()} ج.م`, 'business');
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return biz;
  }

  // Upgrade Business Tier Level
  function upgradeBusiness(key) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك إجراء ترقيات.");
    const biz = BUSINESSES[key];
    const bizState = state.businesses[key];
    if (!bizState || bizState.level === 0) throw new Error("يجب شراء هذا المشروع أولاً قبل ترقيته.");

    // Upgrade cost scales exponentially based on current level (1.75x scaling)
    const baseCost = Math.floor(biz.cost * Math.pow(1.75, bizState.level));
    const hasTaxShield = (state.inventory && state.inventory.tax_shield > 0);
    const upgradeCost = hasTaxShield ? Math.floor(baseCost * 0.75) : baseCost;

    if (state.cash < upgradeCost) {
      throw new Error(`رصيدك غير كافٍ للترقية. تحتاج: ${upgradeCost.toLocaleString()} EGP — لديك: ${state.cash.toLocaleString()} EGP`);
    }

    state.cash -= upgradeCost;
    bizState.level++;

    recordPlayerActivity('ترقية مشروع', `ترقية مشروع "${biz.name}" إلى المستوى ${bizState.level}`, 'business');
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return {
      level: bizState.level,
      cost: upgradeCost,
      savedDiscount: hasTaxShield ? (baseCost - upgradeCost) : 0
    };
  }

  // Hire Workers for Business
  function hireWorker(key) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك توظيف عمالة.");
    const biz = BUSINESSES[key];
    const bizState = state.businesses[key];
    if (!bizState || bizState.level === 0) throw new Error("يجب شراء المشروع أولاً.");

    // Worker hiring fee scales with number of existing workers
    const hireCost = Math.floor(biz.cost * 0.15 * (1 + bizState.workers));
    if (state.cash < hireCost) {
      throw new Error(`تكلفة توظيف عامل إضافي هي ${hireCost.toLocaleString()} جنيه. الرصيد غير كافٍ.`);
    }

    state.cash -= hireCost;
    bizState.workers++;

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return {
      workers: bizState.workers,
      cost: hireCost
    };
  }

  // Fire Workers (reduces costs/demand but free)
  function fireWorker(key) {
    const bizState = state.businesses[key];
    if (!bizState || bizState.workers === 0) throw new Error("لا يوجد عمالة لتسريحهم.");

    bizState.workers--;
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return bizState.workers;
  }

  // Set Product Sale Price
  function setBusinessPrice(key, price) {
    const bizState = state.businesses[key];
    if (!bizState || bizState.level === 0) throw new Error("المشروع مغلق حالياً.");
    if (price <= 0) throw new Error("سعر البيع يجب أن يكون أعلى من صفر جنيه.");
    
    // Price capping: Max 10x optimum price to keep numbers sensible
    const maxPrice = BUSINESSES[key].optimumPrice * 10;
    if (price > maxPrice) throw new Error(`الحد الأقصى المسموح به للسعر هو ${maxPrice} جنيه.`);

    bizState.price = price;
    AppDB.savePlayerState(activeUsername, state);
  }

  // Launch Marketing Campaign (+40% demand boost for 30 ticks = 90 seconds)
  function launchMarketingCampaign(key) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك إطلاق حملات تسويقية.");
    const biz = BUSINESSES[key];
    const bizState = state.businesses[key];
    if (!bizState || bizState.level === 0) throw new Error("المشروع مغلق حالياً.");

    const campaignCost = Math.floor(biz.cost * 0.25);
    if (state.cash < campaignCost) {
      throw new Error(`تكلفة إطلاق الحملة الإعلانية المكثفة هي ${campaignCost.toLocaleString()} EGP. رصيدك غير كافٍ.`);
    }

    state.cash -= campaignCost;
    bizState.marketingTicks = (bizState.marketingTicks || 0) + 30; // 30 ticks = 90 seconds

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return {
      cost: campaignCost,
      durationSec: 90
    };
  }

  // Deposit Cash to Bank
  function depositToBank(amount) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! الخدمات البنكية معطلة مؤقتاً.");
    if (amount <= 0) throw new Error("مبلغ الإيداع يجب أن يكون أكبر من صفر.");
    if (state.cash < amount) throw new Error("رصيدك النقدي (الكاش) لا يكفي لإتمام هذا الإيداع.");

    state.cash -= amount;
    state.bank += amount;
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
  }

  // Withdraw Cash from Bank
  function withdrawFromBank(amount) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! الخدمات البنكية معطلة مؤقتاً.");
    if (amount <= 0) throw new Error("مبلغ السحب يجب أن يكون أكبر من صفر.");
    if (state.bank < amount) throw new Error("رصيدك في حساب البنك لا يكفي لإتمام هذا السحب.");

    state.bank -= amount;
    state.cash += amount;
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
  }

  // Purchase Real Estate/Asset
  function buyAsset(key) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك توقيع عقود عقارية.");
    const asset = ASSETS[key];
    if (!asset) throw new Error("العقار غير متوفر.");

    if (state.cash < asset.cost) {
      throw new Error(`رصيدك غير كافٍ. تحتاج: ${asset.cost.toLocaleString()} EGP — لديك: ${state.cash.toLocaleString()} EGP`);
    }

    state.cash -= asset.cost;
    state.assets[key] = (state.assets[key] || 0) + 1;

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return asset;
  }

  // Sell Real Estate/Asset (Liquidation at 85% of market value)
  function sellAsset(key) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك تسييل العقارات.");
    const count = state.assets[key] || 0;
    if (count <= 0) throw new Error("لا تمتلك أي عقار من هذا النوع للبيع.");

    const asset = ASSETS[key];
    const sellValue = Math.floor(asset.cost * 0.85); // 15% liquidation loss

    state.assets[key]--;
    state.cash += sellValue;

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return sellValue;
  }

  // Buy Stocks
  function buyStock(sym, shares) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! سوق الأسهم معطل لك.");
    const stock = STOCKS[sym];
    if (!stock) throw new Error("رمز الشركة غير صالح.");
    if (shares <= 0 || !Number.isInteger(shares)) throw new Error("عدد الأسهم يجب أن يكون عدداً صحيحاً موجباً.");

    const history = stockPrices[sym];
    if (!history || history.length === 0) throw new Error("بيانات السوق غير متوفرة بعد. حاول مجدداً.");
    const currentPrice = history[history.length - 1];
    const totalCost = currentPrice * shares;

    if (state.cash < totalCost) {
      throw new Error(`رصيدك غير كافٍ. تحتاج: ${totalCost.toLocaleString()} EGP — لديك: ${state.cash.toLocaleString()} EGP`);
    }

    state.cash -= totalCost;

    // Guard: initialize stock slot if missing (forward-compatibility)
    if (!state.stocks[sym]) {
      state.stocks[sym] = { shares: 0, avgPrice: 0 };
    }

    // Calculate new average purchase price
    const currentShares = state.stocks[sym].shares || 0;
    const currentAvg = state.stocks[sym].avgPrice || 0;
    const newShares = currentShares + shares;
    const newAvg = Math.floor(((currentShares * currentAvg) + totalCost) / newShares);

    state.stocks[sym].shares = newShares;
    state.stocks[sym].avgPrice = newAvg;

    recordPlayerActivity('شراء أسهم', `شراء ${shares} سهم (${sym}) بإجمالي ${totalCost.toLocaleString()} ج.م`, 'stock');
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return { shares, price: currentPrice, totalCost };
  }

  // Sell Stocks
  function sellStock(sym, shares) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك بيع الأسهم.");
    const stock = STOCKS[sym];
    if (!stock) throw new Error("الشركة غير موجودة.");
    if (shares <= 0 || !Number.isInteger(shares)) throw new Error("عدد الأسهم غير صالح.");

    // Guard: initialize if missing
    if (!state.stocks[sym]) {
      state.stocks[sym] = { shares: 0, avgPrice: 0 };
    }

    const ownedShares = state.stocks[sym].shares || 0;
    if (ownedShares < shares) {
      throw new Error(`لا تمتلك عدد أسهم كافٍ في محفظتك. المتاح: ${ownedShares} سهم.`);
    }

    const history = stockPrices[sym];
    if (!history || history.length === 0) throw new Error("بيانات السوق غير متوفرة.");
    const currentPrice = history[history.length - 1];
    const totalReturn = currentPrice * shares;

    state.stocks[sym].shares -= shares;
    if (state.stocks[sym].shares === 0) {
      state.stocks[sym].avgPrice = 0;
    }
    state.cash += totalReturn;

    recordPlayerActivity('بيع أسهم', `بيع ${shares} سهم (${sym}) بعائد ${totalReturn.toLocaleString()} ج.م`, 'stock');
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return { shares, price: currentPrice, totalReturn };
  }

  // Store: Buy Item (Refreshes duration, prevents exploit stacking)
  function buyStoreItem(itemId) {
    const item = STORE_ITEMS[itemId];
    if (!item) throw new Error("المنتج المطلوب غير متوفر بالمتجر.");

    if (state.cash < item.cost) {
      throw new Error(`سعر المنتج ${item.cost.toLocaleString()} جنيه. رصيدك لا يكفي.`);
    }

    state.cash -= item.cost;
    if (!state.inventory) state.inventory = {};
    state.inventory[itemId] = 1;

    // Initialize/Reset item self-destruction timer
    if (!state.itemDurations) state.itemDurations = {};
    state.itemDurations[itemId] = item.durationTicks;

    recordPlayerActivity('شراء متجر', `شراء أداة "${item.name}" من المتجر`, 'store');
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return item;
  }

  // Store: Use Item
  function useStoreItem(itemId) {
    throw new Error("هذا العنصر يعطي مفعولاً تلقائياً مستمراً بمجرد الاحتفاظ به بمحفظتك ولا يمكن استهلاكه يدوياً.");
  }

  // Black Market Trade Deals (Illegal High Risk Deals)
  function runBlackMarketDeal(dealId) {
    if (state.jailTimer > 0) throw new Error("أنت خلف القضبان! لا يمكنك ارتكاب جرائم جديدة.");
    const deal = BLACK_MARKET[dealId];
    if (!deal) throw new Error("الصفقة غير متوفرة.");

    const totalCashAvailable = (state.cash || 0) + (state.dirtyCash || 0);
    if (totalCashAvailable < deal.cost) {
      throw new Error(`تحتاج لرأسمال ${deal.cost.toLocaleString()} جنيه للقيام بهذه الصفقة المشبوهة.`);
    }

    // Deduct cost: first from dirtyCash if available, then remaining from clean cash
    if ((state.dirtyCash || 0) >= deal.cost) {
      state.dirtyCash -= deal.cost;
    } else {
      const remainingCost = deal.cost - (state.dirtyCash || 0);
      state.dirtyCash = 0;
      state.cash -= remainingCost;
    }

    // Calculate risk modifiers
    let riskReduction = 0;
    if (state.inventory && state.inventory.premium_lawyer > 0) {
      riskReduction += (STORE_ITEMS.premium_lawyer.value || 0.35); // 35% lawyer protection
    }
    if (state.inventory && state.inventory.radar_jammer > 0) {
      riskReduction += 0.20; // 20% radar jammer protection
    }

    const baseFailChance = 1 - deal.successChance;
    const finalFailChance = Math.max(0.05, baseFailChance * (1 - riskReduction));
    const finalSuccessChance = 1 - finalFailChance;

    const roll = Math.random();
    if (roll < finalSuccessChance) {
      // SUCCESS: High ROI Payout into DIRTY CASH (أرباح السوق السوداء غير مشروعة ويجب غسيلها)
      state.dirtyCash = (state.dirtyCash || 0) + deal.payout;
      state.underworldRep = (state.underworldRep || 0) + (deal.repGain || 20);
      recordPlayerActivity('سوق سوداء', `نجاح صفقة "${deal.name}" (+${deal.payout.toLocaleString()} ج.م كاش مشبوه)`, 'blackmarket');
      state.netWorth = calculateNetWorth();
      AppDB.savePlayerState(activeUsername, state);
      return {
        success: true,
        payout: deal.payout,
        profit: deal.payout - deal.cost,
        repGain: deal.repGain || 20
      };
    } else {
      // CAUGHT BY POLICE!
      // Check if player has diplomatic fake passport to escape jail!
      if (state.inventory && state.inventory.fake_passport > 0) {
        state.inventory.fake_passport--;
        if (state.itemDurations) delete state.itemDurations.fake_passport;
        state.netWorth = calculateNetWorth();
        AppDB.savePlayerState(activeUsername, state);
        return {
          success: false,
          escaped: true,
          confiscation: 0,
          jailDuration: 0
        };
      }

      // Confiscate 100% of illegal dirty cash + 20% fine on remaining clean cash
      const confiscatedDirty = state.dirtyCash || 0;
      const confiscatedClean = Math.floor((state.cash || 0) * 0.20);
      const totalConfiscation = confiscatedDirty + confiscatedClean;
      
      state.dirtyCash = 0;
      state.cash -= confiscatedClean;
      state.jailTimer = deal.jailDuration;
      state.heatLevel = Math.min(5, (state.heatLevel || 0) + 1);

      recordPlayerActivity('مداهمة وسجن', `فشل صفقة "${deal.name}" ومصادرة ${totalConfiscation.toLocaleString()} ج.م وسجن ${deal.jailDuration}ث`, 'blackmarket');
      state.netWorth = calculateNetWorth();
      AppDB.savePlayerState(activeUsername, state);
      return {
        success: false,
        escaped: false,
        confiscation: totalConfiscation,
        confiscatedDirty,
        confiscatedClean,
        jailDuration: deal.jailDuration
      };
    }
  }

  // Buy Black Market Gear
  function buyBlackMarketGear(gearId) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يمكنك شراء معدات السوق السوداء.");
    const item = BLACK_MARKET_GEAR[gearId];
    if (!item) throw new Error("المعدة غير متوفرة.");

    const totalCash = (state.cash || 0) + (state.dirtyCash || 0);
    if (totalCash < item.cost) {
      throw new Error(`سعر المعدة ${item.cost.toLocaleString()} جنيه. رصيدك لا يكفي.`);
    }

    if ((state.dirtyCash || 0) >= item.cost) {
      state.dirtyCash -= item.cost;
    } else {
      const rem = item.cost - (state.dirtyCash || 0);
      state.dirtyCash = 0;
      state.cash -= rem;
    }

    if (!state.inventory) state.inventory = {};
    state.inventory[gearId] = (state.inventory[gearId] || 0) + 1;

    if (!state.itemDurations) state.itemDurations = {};
    state.itemDurations[gearId] = item.durationTicks;

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return item;
  }

  // Bribe Police to clear Jail & Heat
  function bribePolice() {
    if (state.jailTimer <= 0 && (!state.heatLevel || state.heatLevel <= 0)) {
      throw new Error("سجلك نظيف حالياً ولا توجد ملاحقات أمنية أو أحكام سجن عليك!");
    }
    const bribeCost = Math.max(15000, Math.floor((state.cash || 0) * 0.15) + ((state.jailTimer || 0) * 1000));
    const totalCash = (state.cash || 0) + (state.dirtyCash || 0);
    if (totalCash < bribeCost) {
      throw new Error(`تكلفة الرشوة والوساطة ${bribeCost.toLocaleString()} جنيه. رصيدك لا يكفي.`);
    }
    if ((state.dirtyCash || 0) >= bribeCost) {
      state.dirtyCash -= bribeCost;
    } else {
      const rem = bribeCost - (state.dirtyCash || 0);
      state.dirtyCash = 0;
      state.cash -= rem;
    }
    state.jailTimer = 0;
    state.heatLevel = 0;
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return { bribeCost };
  }

  // Instant Money Laundering (غسيل الأموال غير المشروعة وتحويلها لرصيد بنكي نظيف)
  function launderMoney(amount) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك إدارة عمليات غسيل الأموال.");
    if (!amount || isNaN(amount) || amount <= 0) throw new Error("يرجى إدخال مبلغ صحيح للغسيل.");
    
    const availableDirty = state.dirtyCash || 0;
    if (availableDirty <= 0) {
      throw new Error("لا توجد أموال مشبوهة أو أرباح غير مشروعة في حوزتك لغسيلها حالياً.");
    }
    if (availableDirty < amount) {
      throw new Error(`المبلغ المطلوب (${amount.toLocaleString()} ج.م) أكبر من رصيد الأموال غير المشروعة المتاحة (${availableDirty.toLocaleString()} ج.م).`);
    }
    
    const feeRate = (state.inventory && state.inventory.crypto_cleaner > 0) ? 0.05 : 0.12;
    const fee = Math.floor(amount * feeRate);
    const cleanedAmount = amount - fee;
    
    state.dirtyCash = Math.max(0, state.dirtyCash - amount);
    state.bank = (state.bank || 0) + cleanedAmount;
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return {
      amount,
      fee,
      feeRate: Math.round(feeRate * 100),
      cleanedAmount
    };
  }

  // Start Locked Term Investment (With offline timestamp support)
  function startInvestment(planId, amount) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك إدارة استثمارات بنكية.");
    const plan = INVESTMENTS[planId];
    if (!plan) throw new Error("خطة الاستثمار غير موجودة.");
    if (!amount || isNaN(amount) || amount < plan.minAmount) {
      throw new Error(`الحد الأدنى للاستثمار في "${plan.name}" هو ${plan.minAmount.toLocaleString()} جنيه.`);
    }
    if (plan.maxAmount && amount > plan.maxAmount) {
      throw new Error(`الحد الأقصى للإيداع في "${plan.name}" هو ${plan.maxAmount.toLocaleString()} جنيه.`);
    }
    if (state.cash < amount) {
      throw new Error(`رصيدك النقدي ${state.cash.toLocaleString()} جنيه لا يكفي لاستثمار ${amount.toLocaleString()} جنيه.`);
    }

    state.cash -= amount;
    if (!state.investments) state.investments = [];
    const nowTime = Date.now();
    state.investments.push({
      id: plan.id,
      name: plan.name,
      investedAmount: amount,
      ticksRemaining: plan.durationTicks,
      totalDuration: plan.durationTicks,
      createdAt: nowTime,
      maturesAt: nowTime + (plan.durationTicks * 1000),
      rate: plan.rate
    });

    recordPlayerActivity('استثمار مالي', `إيداع ${amount.toLocaleString()} ج.م في "${plan.name}"`, 'investment');
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return { plan, amount };
  }

  // Casino Flip Game with Streak Bonus
  function playCoinFlip(betAmount, choice, currentStreak = 0) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يسمح لك بالدخول للكازينو.");
    if (betAmount <= 0) throw new Error("مبلغ الرهان يجب أن يكون أكبر من صفر جنيه.");
    if (state.cash < betAmount) throw new Error("رصيدك النقدي لا يكفي لهذا الرهان.");

    state.cash -= betAmount;

    // 49.0% base win probability (+15% if VIP casino pass active)
    let winChance = 0.49;
    if (state.inventory.vip_casino_pass > 0) {
      winChance += STORE_ITEMS.vip_casino_pass.value;
    }
    const roll = Math.random();
    const won = roll < winChance;

    // Determine flipped side
    let outcomeSide = choice;
    if (!won) {
      outcomeSide = choice === 'heads' ? 'tails' : 'heads';
    }

    if (won) {
      // Streak bonus multiplier: 2.0x base, +0.25x per streak level up to 3.5x max
      const streakBonus = Math.min(1.5, currentStreak * 0.25);
      const mult = 2.0 + streakBonus;
      const payout = Math.floor(betAmount * mult);
      state.cash += payout;
      recordPlayerActivity('رمي العملة', `فوز برهان الكازينو +${payout.toLocaleString()} ج.م (مضاعف x${mult.toFixed(2)})`, 'casino');
      state.netWorth = calculateNetWorth();
      AppDB.savePlayerState(activeUsername, state);
      return { won: true, side: outcomeSide, multiplier: mult, payout: payout, profit: payout - betAmount };
    } else {
      recordPlayerActivity('رمي العملة', `خسارة رهان الكازينو ${betAmount.toLocaleString()} ج.م`, 'casino');
      state.netWorth = calculateNetWorth();
      AppDB.savePlayerState(activeUsername, state);
      return { won: false, side: outcomeSide, loss: betAmount };
    }
  }

  // Casino Slots Game with 5 Premium Tier Symbols
  function playSlots(betAmount) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يمكنك اللعب.");
    if (betAmount <= 0) throw new Error("مبلغ الرهان غير صالح.");
    if (state.cash < betAmount) throw new Error("رصيدك الكاش لا يكفي لتشغيل آلة الحظ.");

    state.cash -= betAmount;

    // Reels Symbols (CROWN, DIAMOND, GOLD, SACK, KEY)
    const symbols = ['CROWN', 'DIAMOND', 'GOLD', 'SACK', 'KEY'];
    
    // Weight distribution: VIP pass gives higher chance of high tier symbols
    let hasVip = state.inventory.vip_casino_pass > 0;
    
    function getRandomSymbol() {
      const r = Math.random();
      if (hasVip) {
        if (r < 0.15) return 'CROWN';
        if (r < 0.35) return 'DIAMOND';
        if (r < 0.60) return 'GOLD';
        if (r < 0.82) return 'SACK';
        return 'KEY';
      } else {
        if (r < 0.08) return 'CROWN';
        if (r < 0.24) return 'DIAMOND';
        if (r < 0.50) return 'GOLD';
        if (r < 0.77) return 'SACK';
        return 'KEY';
      }
    }

    const r1 = getRandomSymbol();
    const r2 = getRandomSymbol();
    const r3 = getRandomSymbol();

    let multiplier = 0;
    let winMessage = "حظ أوفر المرة القادمة!";
    let isJackpot = false;

    if (r1 === r2 && r2 === r3) {
      // 3 Matching
      if (r1 === 'CROWN') { multiplier = 25; winMessage = "الجاكبوت الملكي الذهبي الأكبر!"; isJackpot = true; }
      else if (r1 === 'DIAMOND') { multiplier = 18; winMessage = "ألماس ثلاثي أسطوري!"; isJackpot = true; }
      else if (r1 === 'GOLD') { multiplier = 12; winMessage = "ثلاث سبائك ذهبية متطابقة!"; }
      else if (r1 === 'SACK') { multiplier = 8; winMessage = "ثلاث حقائب أموال ضخمة!"; }
      else { multiplier = 5; winMessage = "ثلاثة مفاتيح ذهبية نادرة!"; }
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
      // 2 Matching
      multiplier = 1.5;
      winMessage = "رمزان متطابقان، جائزة ترضية!";
    } else {
      multiplier = 0;
    }

    const payout = Math.floor(betAmount * multiplier);
    state.cash += payout;

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);

    return {
      reels: [r1, r2, r3],
      won: payout > 0,
      isJackpot: isJackpot,
      multiplier: multiplier,
      payout: payout,
      profit: payout - betAmount,
      message: winMessage
    };
  }

  // NEW Casino Game: Lucky Royale Dice (رمي النرد الملكي)
  function playDice(betAmount, choice) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يمكنك اللعب.");
    if (betAmount <= 0) throw new Error("مبلغ الرهان غير صالح.");
    if (state.cash < betAmount) throw new Error("رصيدك الكاش لا يكفي لرهان النرد.");

    state.cash -= betAmount;

    // Roll 2 dice (1 to 6)
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const sum = d1 + d2;
    const isDouble = (d1 === d2);

    let won = false;
    let multiplier = 0;

    if (choice === 'under' && sum < 7) {
      won = true;
      multiplier = 2.0;
    } else if (choice === 'over' && sum > 7) {
      won = true;
      multiplier = 2.0;
    } else if (choice === 'exact7' && sum === 7) {
      won = true;
      multiplier = 5.8;
    } else if (choice === 'double' && isDouble) {
      won = true;
      multiplier = 3.5;
    }

    const payout = won ? Math.floor(betAmount * multiplier) : 0;
    state.cash += payout;

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);

    return {
      d1,
      d2,
      sum,
      isDouble,
      won,
      multiplier,
      payout,
      profit: payout - betAmount
    };
  }

  // Perform Overtime Double Shift
  function performOvertimeShift() {
    if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يمكنك العمل.");
    const job = JOBS[state.jobId] || JOBS.worker;
    const isEnergyActive = (state.inventory && state.inventory.energy_drink > 0);
    const isPenActive = (state.inventory && state.inventory.gold_pen > 0);
    
    const xpBonus = isPenActive ? (1 + (STORE_ITEMS.gold_pen ? STORE_ITEMS.gold_pen.value : 0.5)) : 1.0;
    const energyMult = isEnergyActive ? (STORE_ITEMS.energy_drink ? STORE_ITEMS.energy_drink.value : 2.0) : 1.0;
    
    // Overtime gives 2.5x base salary and 3x XP
    const salaryMultiplier = energyMult * 2.5;
    const earnedSalary = Math.floor(job.salary * salaryMultiplier);
    const earnedXp = Math.ceil(job.xpReward * 3 * xpBonus);

    state.cash += earnedSalary;
    state.xp += earnedXp;
    state.netWorth = calculateNetWorth();
    state.title = getAppropriateTitle(state.netWorth, state.xp);
    AppDB.savePlayerState(activeUsername, state);

    return {
      earnedSalary,
      earnedXp,
      jobTitle: job.name,
      newTitle: state.title,
      isEnergyBoosted: isEnergyActive,
      isPenBoosted: isPenActive
    };
  }

  // Bank Loan: Take instant liquidity loan (up to 35% of Net Worth)
  function takeBankLoan(amount) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك طلب قروض بنكية.");
    if (state.activeLoan && state.activeLoan.amount > 0) {
      throw new Error(`لديك قرض قائم بالفعل بقيمة ${state.activeLoan.totalDue.toLocaleString()} EGP يجب سداده أولاً!`);
    }
    const maxLoan = Math.max(50000, Math.floor(state.netWorth * 0.35));
    if (amount <= 0 || amount > maxLoan) {
      throw new Error(`الحد الأقصى للقرض المسموح لك هو ${maxLoan.toLocaleString()} جنيه.`);
    }
    const totalDue = Math.floor(amount * 1.15); // 15% interest fee
    state.activeLoan = {
      amount,
      totalDue,
      ticksRemaining: 150 // 450 seconds (7.5 minutes) to repay
    };
    state.cash += amount;
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return { amount, totalDue, ticksRemaining: 150 };
  }

  // Bank Loan: Repay
  function repayBankLoan() {
    if (!state.activeLoan || state.activeLoan.totalDue <= 0) {
      throw new Error("لا توجد قروض مستحقة السداد عليك حالياً!");
    }
    const due = state.activeLoan.totalDue;
    const totalFunds = (state.cash || 0) + (state.bank || 0);
    if (totalFunds < due) {
      throw new Error(`إجمالي رصيدك بالكاش والبنك (${totalFunds.toLocaleString()} EGP) لا يكفي لسداد القرض (${due.toLocaleString()} EGP).`);
    }
    if (state.cash >= due) {
      state.cash -= due;
    } else {
      const rem = due - state.cash;
      state.cash = 0;
      state.bank -= rem;
    }
    state.activeLoan = null;
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return { repaid: due };
  }

  // European Roulette Wheel Game
  function playRoulette(betAmount, betType, betValue) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يسمح لك بالدخول للكازينو.");
    if (betAmount <= 0) throw new Error("مبلغ الرهان يجب أن يكون أكبر من صفر.");
    if (state.cash < betAmount) throw new Error("رصيدك النقدي لا يكفي لهذا الرهان.");

    state.cash -= betAmount;

    // Roulette wheel number: 0 to 36
    const rolledNumber = Math.floor(Math.random() * 37);
    const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    const isRed = redNumbers.includes(rolledNumber);
    const isBlack = rolledNumber > 0 && !isRed;
    const isGreen = (rolledNumber === 0);

    let won = false;
    let multiplier = 0;

    if (betType === 'number') {
      if (Number(betValue) === rolledNumber) {
        won = true;
        multiplier = 36; // Straight up 36x
      }
    } else if (betType === 'color') {
      if (betValue === 'red' && isRed) {
        won = true;
        multiplier = 2.0;
      } else if (betValue === 'black' && isBlack) {
        won = true;
        multiplier = 2.0;
      }
    } else if (betType === 'parity') {
      if (betValue === 'even' && rolledNumber > 0 && rolledNumber % 2 === 0) {
        won = true;
        multiplier = 2.0;
      } else if (betValue === 'odd' && rolledNumber % 2 !== 0) {
        won = true;
        multiplier = 2.0;
      }
    } else if (betType === 'dozen') {
      if (betValue === '1' && rolledNumber >= 1 && rolledNumber <= 12) {
        won = true;
        multiplier = 3.0;
      } else if (betValue === '2' && rolledNumber >= 13 && rolledNumber <= 24) {
        won = true;
        multiplier = 3.0;
      } else if (betValue === '3' && rolledNumber >= 25 && rolledNumber <= 36) {
        won = true;
        multiplier = 3.0;
      }
    }

    // VIP casino pass perk (+15% payout boost if won)
    if (won && state.inventory && state.inventory.vip_casino_pass > 0) {
      multiplier *= 1.15;
    }

    const payout = won ? Math.floor(betAmount * multiplier) : 0;
    state.cash += payout;
    sanitizeGameState();
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);

    return {
      rolledNumber,
      color: isGreen ? 'green' : (isRed ? 'red' : 'black'),
      won,
      multiplier,
      payout,
      profit: payout - betAmount
    };
  }

  function sanitizeGameState() {
    if (!state) return;
    const numFields = ['cash', 'bank', 'dirtyCash', 'netWorth', 'xp'];
    numFields.forEach(k => {
      if (typeof state[k] !== 'number' || isNaN(state[k]) || !isFinite(state[k]) || state[k] < 0) {
        state[k] = 0;
      }
      if (state[k] > 100000000000000) {
        state[k] = 100000000000000;
      }
    });
  }

  function forceSaveState() {
    sanitizeGameState();
    state.netWorth = calculateNetWorth();
    state.title = getAppropriateTitle(state.netWorth, state.xp);
    AppDB.savePlayerState(activeUsername, state);
  }

  return {
    get state() { return state; },
    get stockPrices() { return stockPrices; },
    get activeUsername() { return activeUsername; },
    
    JOBS,
    BUSINESSES,
    ASSETS,
    STOCKS,
    INVESTMENTS,
    STORE_ITEMS,
    BLACK_MARKET,
    BLACK_MARKET_GEAR,

    loadUserSession,
    logoutUser,
    processTick,
    performJobShift,
    performOvertimeShift,
    promoteJob,
    purchaseBusiness,
    upgradeBusiness,
    hireWorker,
    fireWorker,
    setBusinessPrice,
    launchMarketingCampaign,
    depositToBank,
    withdrawFromBank,
    takeBankLoan,
    repayBankLoan,
    buyAsset,
    sellAsset,
    buyStock,
    sellStock,
    startInvestment,
    buyStoreItem,
    useStoreItem,
    runBlackMarketDeal,
    buyBlackMarketGear,
    bribePolice,
    launderMoney,
    playCoinFlip,
    playSlots,
    playDice,
    playRoulette,
    calculatePassiveIncomePerTick,
    calculatePassiveIncomePerSecond,
    calculateNetWorth,
    renewAfkManager,
    forceSaveState
  };
})();

// Export globally
window.GameEngine = GameEngine;
