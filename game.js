/**
 * Ras ALmal Tycoon (رأس المال)
 * Simulation Engine (game.js)
 * Manages game state, ticks, algorithms, and business logic
 */

// Admin identity is determined at runtime from Firestore (isAdmin flag) — no hardcoded credentials.

const GameEngine = (() => {
  console.log('[GAME] Simulation Engine Loaded (v=107)');
  // --- Game Configurations & Data Tables ---

  const JOBS = {
    worker: { id: 'worker', name: 'عامل باليومية', salary: 6, xpReward: 2, xpNeeded: 0 },
    cashier: { id: 'cashier', name: 'محاسب صندوق', salary: 14, xpReward: 4, xpNeeded: 180 },
    accountant: { id: 'accountant', name: 'محاسب مالي قانوني', salary: 45, xpReward: 8, xpNeeded: 600 },
    manager: { id: 'manager', name: 'مدير فرع وتطوير', salary: 130, xpReward: 14, xpNeeded: 2200 },
    director: { id: 'director', name: 'مدير تنفيذي للمجموعة', salary: 350, xpReward: 24, xpNeeded: 6500 },
    ceo: { id: 'ceo', name: 'رئيس مجلس الإدارة', salary: 980, xpReward: 38, xpNeeded: 18000 },
    consultant: { id: 'consultant', name: 'مستشار اقتصادي ووزير سابق', salary: 2600, xpReward: 60, xpNeeded: 45000 },
    bank_governor: { id: 'bank_governor', name: 'محافظ البنك المركزي', salary: 6800, xpReward: 95, xpNeeded: 120000 },
    sovereign_head: { id: 'sovereign_head', name: 'رئيس صندوق الاستثمار السيادي', salary: 16500, xpReward: 140, xpNeeded: 280000 },
    oligarch: { id: 'oligarch', name: 'إمبراطور كبار المستثمرين', salary: 42000, xpReward: 220, xpNeeded: 650000 }
  };

  const BUSINESSES = {
    coffee: {
      id: 'coffee',
      name: 'عربة قهوة ومأكولات خفيفة',
      cost: 6800,
      baseDemand: 8,
      optimumPrice: 24,
      costOfGoods: 14,
      upgradeMultiplier: 1.45,
      workerMultiplier: 1.10,
      workerWage: 12
    },
    tech: {
      id: 'tech',
      name: 'شركة برمجيات وتطبيقات',
      cost: 140000,
      baseDemand: 5,
      optimumPrice: 180,
      costOfGoods: 95,
      upgradeMultiplier: 1.55,
      workerMultiplier: 1.15,
      workerWage: 65
    },
    logistics: {
      id: 'logistics',
      name: 'مجمع خدمات لوجستية وشحن',
      cost: 780000,
      baseDemand: 5,
      optimumPrice: 850,
      costOfGoods: 450,
      upgradeMultiplier: 1.65,
      workerMultiplier: 1.18,
      workerWage: 280
    },
    supermarket: {
      id: 'supermarket',
      name: 'سلسلة سوبرماركت وتجزئة',
      cost: 3200000,
      baseDemand: 8,
      optimumPrice: 1200,
      costOfGoods: 680,
      upgradeMultiplier: 1.72,
      workerMultiplier: 1.20,
      workerWage: 850
    },
    solar_factory: {
      id: 'solar_factory',
      name: 'مصنع ألواح الطاقة الشمسية',
      cost: 14000000,
      baseDemand: 5,
      optimumPrice: 3500,
      costOfGoods: 2100,
      upgradeMultiplier: 1.78,
      workerMultiplier: 1.22,
      workerWage: 2400
    },
    private_hospital: {
      id: 'private_hospital',
      name: 'مستشفى ومجمع طبي تخصصي',
      cost: 55000000,
      baseDemand: 4,
      optimumPrice: 11000,
      costOfGoods: 6800,
      upgradeMultiplier: 1.82,
      workerMultiplier: 1.25,
      workerWage: 6500
    },
    media_studio: {
      id: 'media_studio',
      name: 'مؤسسة إنتاج إعلامي وسينمائي',
      cost: 160000000,
      baseDemand: 5,
      optimumPrice: 26000,
      costOfGoods: 15500,
      upgradeMultiplier: 1.85,
      workerMultiplier: 1.28,
      workerWage: 16000
    },
    private_bank: {
      id: 'private_bank',
      name: 'بنك استثماري وشركة وساطة مالية',
      cost: 520000000,
      baseDemand: 4,
      optimumPrice: 78000,
      costOfGoods: 46000,
      upgradeMultiplier: 1.88,
      workerMultiplier: 1.30,
      workerWage: 45000
    },
    oil_refinery: {
      id: 'oil_refinery',
      name: 'مجمع مصافي البترول والطاقة',
      cost: 1600000000,
      baseDemand: 3,
      optimumPrice: 220000,
      costOfGoods: 135000,
      upgradeMultiplier: 1.92,
      workerMultiplier: 1.32,
      workerWage: 130000
    },
    space_tech: {
      id: 'space_tech',
      name: 'مؤسسة استكشاف الفضاء والأقمار الصناعية',
      cost: 4800000000,
      baseDemand: 2,
      optimumPrice: 680000,
      costOfGoods: 420000,
      upgradeMultiplier: 1.95,
      workerMultiplier: 1.35,
      workerWage: 420000
    }
  };

  const ASSETS = {
    apartment: { id: 'apartment', name: 'شقة سكنية مؤجرة', cost: 250000, rent: 85, appreciation: 0.0004 },
    office: { id: 'office', name: 'مبنى مكاتب تجارية', cost: 1600000, rent: 520, appreciation: 0.0006 },
    mansion: { id: 'mansion', name: 'قصر ريفي فاخر', cost: 7200000, rent: 2400, appreciation: 0.0008 },
    skyline_tower: { id: 'skyline_tower', name: 'برج ناطحة سحاب تجاري', cost: 35000000, rent: 11500, appreciation: 0.0010 },
    luxury_resort: { id: 'luxury_resort', name: 'منتجع وفندق سياحي 5 نجوم', cost: 160000000, rent: 52000, appreciation: 0.0012 },
    mega_yacht: { id: 'mega_yacht', name: 'يخت ملكي فاخر خاص', cost: 650000000, rent: 210000, appreciation: 0.0014 },
    private_island: { id: 'private_island', name: 'جزيرة استوائية خاصة', cost: 2400000000, rent: 750000, appreciation: 0.0016 },
    orbital_station: { id: 'orbital_station', name: 'محطة مدارية فضائية خاصة', cost: 9200000000, rent: 3000000, appreciation: 0.0020 }
  };

  const STOCKS = {
    COMI: { name: 'البنك التجاري الدولي', symbol: 'COMI', basePrice: 38, volatility: 0.015, reversion: 0.01, floor: 18, ceiling: 85, dividend: 0.00015, maxShares: 50000, seed: 101 },
    EAST: { name: 'الشرقية للدخان', symbol: 'EAST', basePrice: 85, volatility: 0.02, reversion: 0.015, floor: 35, ceiling: 190, dividend: 0.00025, maxShares: 30000, seed: 202 },
    ETEL: { name: 'المصرية للاتصالات', symbol: 'ETEL', basePrice: 48, volatility: 0.018, reversion: 0.012, floor: 22, ceiling: 110, dividend: 0.00018, maxShares: 40000, seed: 303 },
    FWRY: { name: 'فوري للمدفوعات الإلكترونية', symbol: 'FWRY', basePrice: 92, volatility: 0.025, reversion: 0.02, floor: 42, ceiling: 215, dividend: 0.00015, maxShares: 25000, seed: 404 },
    CASH: { name: 'صندوق الاستثمار التقني البديل', symbol: 'CASH', basePrice: 125, volatility: 0.03, reversion: 0.025, floor: 45, ceiling: 290, dividend: 0.00035, maxShares: 20000, seed: 505 },
    BITC: { name: 'مؤشر البيتكوين والأصول الرقمية', symbol: 'BITC', basePrice: 310, volatility: 0.05, reversion: 0.03, floor: 90, ceiling: 780, dividend: 0, maxShares: 5000, seed: 606 },
    GOLD: { name: 'صندوق سبائك الذهب الخالص', symbol: 'GOLD', basePrice: 220, volatility: 0.01, reversion: 0.008, floor: 130, ceiling: 480, dividend: 0.0003, maxShares: 10000, seed: 707 },
    AIX: { name: 'صندوق الذكاء الاصطناعي العالمي', symbol: 'AIX', basePrice: 380, volatility: 0.035, reversion: 0.022, floor: 120, ceiling: 890, dividend: 0.00025, maxShares: 8000, seed: 808 }
  };

  const CORP_PROJECTS = {
    gigafactory: { id: 'gigafactory', name: 'مجمع أشباه الموصلات والرقائق', cost: 12000000000, profitPerTick: 25000000, minMembers: 1 },
    zohr_field: { id: 'zohr_field', name: 'حق امتياز حقل غاز ظهر الطبيعي', cost: 38000000000, profitPerTick: 95000000, minMembers: 1 },
    asteroid_mining: { id: 'asteroid_mining', name: 'وكالة تعدين الكويكبات الفضائية', cost: 95000000000, profitPerTick: 280000000, minMembers: 1 },
    submarine_cables: { id: 'submarine_cables', name: 'شبكة الألياف البحرية العالمية', cost: 220000000000, profitPerTick: 750000000, minMembers: 2 },
    medical_city: { id: 'medical_city', name: 'المدينة الطبية العالمية المتكاملة', cost: 500000000000, profitPerTick: 1850000000, minMembers: 3 },
    nuclear_reactor: { id: 'nuclear_reactor', name: 'المفاعل النووي القومي لإنتاج الطاقة', cost: 1200000000000, profitPerTick: 4600000000, minMembers: 8 },
    mars_colony: { id: 'mars_colony', name: 'مستعمرة التعدين المريخية المستقلة', cost: 3500000000000, profitPerTick: 15000000000, minMembers: 15 }
  };

  const CAR_TEMPLATES = {
    lambo: {
      id: 'lambo',
      name: 'Lamborghini Aventador 🏎️',
      cost: 15000000,
      rentalIncomePerTick: 15000,
      maintenanceCostPerTick: 5000,
      prestigeBonus: 5,
      cooldownReduction: 0.15,
      desc: 'سيارة رياضية خارقة. تمنحك خصم 15% على فترة انتظار نوبات العمل عند تفعيلها كسيارة شخصية.'
    },
    rolls: {
      id: 'rolls',
      name: 'Rolls-Royce Phantom 👑',
      cost: 40000000,
      rentalIncomePerTick: 50000,
      maintenanceCostPerTick: 12000,
      prestigeBonus: 15,
      interestBonus: 0.05,
      desc: 'عنوان الفخامة المفرطة. تزيد أرباح فوائد إيداعات البنك بنسبة +5% عند تفعيلها كسيارة شخصية.'
    },
    shelby: {
      id: 'shelby',
      name: 'Shelby Cobra 1965 🌟',
      cost: 120000000,
      rentalIncomePerTick: 180000,
      maintenanceCostPerTick: 35000,
      prestigeBonus: 40,
      desc: 'أسطورة كلاسيكية نادرة. تدر دخلاً خيالياً عند تأجيرها وقيمتها قابلة للزيادة بمرور الوقت.'
    }
  };

  const SMUGGLING_VEHICLES = {
    speedboat: {
      id: 'speedboat',
      name: 'قارب سريع مضاد للرادار 🚤',
      cost: 200000000,
      capacity: 50,
      desc: 'قارب تهريب سريع وخفيف الحركة. مثالي للممرات المائية القصيرة والذهب.'
    },
    plane: {
      id: 'plane',
      name: 'طائرة شحن جوي خفيفة ✈️',
      cost: 2000000000,
      capacity: 200,
      desc: 'طائرة شحن سريعة تتجاوز الحدود البرية لنقل المجوهرات والتحف الثمينة.'
    },
    ship: {
      id: 'ship',
      name: 'سفينة حاويات عملاقة 🚢',
      cost: 20000000000,
      capacity: 1000,
      desc: 'سفينة شحن تجارية عملاقة قادرة على نقل أطنان من البضائع وغسيل الأموال.'
    }
  };

  const SMUGGLING_ROUTES = {
    dubai: {
      id: 'dubai',
      name: 'تهريب مجوهرات وذهب لـ دبي 🇦🇪',
      requiredVehicles: ['speedboat', 'plane'],
      durationTicks: 60,
      yieldCash: 500000000,
      riskPct: 20,
      desc: 'طريق مائي وجوي سريع لنقل المعادن النفيسة لخزائن دبي.'
    },
    switzerland: {
      id: 'switzerland',
      name: 'تهريب تحف وسندات لـ سويسرا 🇨🇭',
      requiredVehicles: ['plane', 'ship'],
      durationTicks: 180,
      yieldCash: 6000000000,
      riskPct: 12,
      desc: 'طريق التفافي معقد لنقل السندات المصرفية والأصول الذهبية للبنوك السويسرية.'
    },
    cayman: {
      id: 'cayman',
      name: 'غسيل ونقل أموال لـ جزر الكايمان 🇰🇾',
      requiredVehicles: ['ship'],
      durationTicks: 400,
      yieldCash: 80000000000,
      riskPct: 6,
      desc: 'عملية نقل أموال عملاقة لغسل أرباح الكارتيل عبر البنوك الخارجية المجهولة.'
    }
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
      desc: 'يمنحك خصماً قدره 15% على ترقيات الشركات ويخفض ضريبة الثروة بنسبة 50% لمدة 12 ساعة.',
      effect: 'upgrade_discount',
      value: 0.15,
      durationTicks: 14400
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
    },
    cronos_gear: {
      id: 'cronos_gear',
      name: 'ساعة الكرونوس لتسريع العمليات',
      cost: 400000,
      desc: 'تقلل وقت التبريد (Cooldown) للعمليات المشبوهة وفترات نوبات العمل بنسبة 50% لمدة 5 دقائق.',
      effect: 'cooldown_reduction',
      value: 0.50,
      durationTicks: 300
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
      repGain: 5,
      repLoss: 10,
      repNeeded: 0,
      cooldownSec: 60,
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
      repGain: 10,
      repLoss: 20,
      repNeeded: 0,
      cooldownSec: 180,
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
      repGain: 25,
      repLoss: 50,
      repNeeded: 0,
      cooldownSec: 360,
      icon: 'fa-user-secret',
      tier: 'متقدم'
    },
    swiss_laundry: {
      id: 'swiss_laundry',
      name: 'مركز غسيل الأموال السويسري',
      desc: 'قنوات بنكية سويسرية سرية لغسيل الأموال المشبوهة بأمان تام ونسبة عمولة منخفضة جداً (15% فاقد).',
      cost: 1000000,
      payout: 850000,
      successChance: 1.0,
      jailDuration: 0,
      repGain: 0,
      repLoss: 0,
      repNeeded: 250,
      cooldownSec: 900, // 15 mins
      icon: 'fa-building-columns',
      tier: 'عملية خاصة',
      cleanPayout: true,
      requireDirtyCost: true
    },
    crypto: {
      id: 'crypto',
      name: 'اختراق منصات رقمية وغسيل عملات مشفرة',
      desc: 'هجوم سيبراني معقد على محافظ العملات المشفرة مع تحويل الأصول لخوادم خارجية.',
      cost: 380000,
      payout: 1100000,
      successChance: 0.45,
      jailDuration: 90,
      repGain: 50,
      repLoss: 100,
      repNeeded: 120,
      cooldownSec: 720, // 12 mins
      icon: 'fa-network-wired',
      tier: 'محترف'
    },
    artifacts: {
      id: 'artifacts',
      name: 'تهريب آثار ومخطوطات نادرة لمزادات سرية',
      desc: 'صفقة كبرى لبيع قطع أثرية نادرة لكبار هواة الجمع في السوق السوداء الدولية.',
      cost: 1200000,
      payout: 3800000,
      successChance: 0.36,
      jailDuration: 130,
      repGain: 100,
      repLoss: 200,
      repNeeded: 500,
      cooldownSec: 1500, // 25 mins
      icon: 'fa-gem',
      tier: 'خطر جداً'
    },
    diamond_heist: {
      id: 'diamond_heist',
      name: 'عملية السطو الكبرى على خزائن الماس الدولية',
      desc: 'أضخم عملية سرقة منظمة في التاريخ لخزينة الماس والسبائك البنكية.',
      cost: 4000000,
      payout: 16000000,
      successChance: 0.24,
      jailDuration: 180,
      repGain: 250,
      repLoss: 500,
      repNeeded: 1500,
      cooldownSec: 2700, // 45 mins
      icon: 'fa-shield-halved',
      tier: 'أسطوري'
    },
    uranium_smuggling: {
      id: 'uranium_smuggling',
      name: 'تهريب اليورانيوم المخصب الدولي',
      desc: 'صفقة تهريب وتوريد شحنة يورانيوم مخصب لتشغيل مفاعلات طاقة خاصة تابعة لمنظمات دولية سرية.',
      cost: 30000000,
      payout: 120000000,
      successChance: 0.22,
      jailDuration: 200,
      repGain: 800,
      repLoss: 2000,
      repNeeded: 3200,
      cooldownSec: 3600, // 60 mins
      icon: 'fa-radiation',
      tier: 'عملية خاصة'
    },
    defense_tech: {
      id: 'defense_tech',
      name: 'صفقة تكنولوجيا دفاعية وشفرات رادار مسربة',
      desc: 'بيع شفرات منظومات دفاع جوي فائقة التطور لجهات أجنبية خاصة.',
      cost: 15000000,
      payout: 60000000,
      successChance: 0.20,
      jailDuration: 240,
      repGain: 500,
      repLoss: 1000,
      repNeeded: 4500,
      cooldownSec: 4200, // 70 mins
      icon: 'fa-jet-fighter',
      tier: 'أسطوري'
    },
    central_bank_hack: {
      id: 'central_bank_hack',
      name: 'قرصنة واختراق البنوك المركزية',
      desc: 'فرض السيطرة والقرصنة السيبرانية على خوادم بنوك مركزية كبرى وسحب احتياطيات رقمية.',
      cost: 120000000,
      payout: 650000000,
      successChance: 0.16,
      jailDuration: 300,
      repGain: 2000,
      repLoss: 6000,
      repNeeded: 6500,
      cooldownSec: 7200, // 2 hours
      icon: 'fa-terminal',
      tier: 'عملية خاصة'
    },
    satellite_hack: {
      id: 'satellite_hack',
      name: 'السيطرة على شبكة أقمار صناعية وتشفيرها',
      desc: 'اختراق منظومة البث الفضائي العالمية وطلب فدية بمليارات الدولارات.',
      cost: 60000000,
      payout: 320000000,
      successChance: 0.16,
      jailDuration: 300,
      repGain: 1000,
      repLoss: 2000,
      repNeeded: 4500,
      cooldownSec: 7200,
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
      repGain: 3000,
      repLoss: 6000,
      repNeeded: 10000,
      cooldownSec: 14400,
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
      desc: 'يخفض ضريبة غسيل وتبييض الأموال إلى الحد الأدنى القانوني 25% بدلاً من 35%.',
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
    cash: 300,
    bank: 100,
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
      AIX: { shares: 0, avgPrice: 0 }
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
      diamond_card: 0,
      cronos_gear: 0
    },
    itemDurations: {}, // Stores { itemId: ticksRemaining } for self-destruction timer
    customItems: [], // Array of { auctionId, name, description, price, timestamp }
    blackMarketCooldowns: {}, // Stores { dealId: expiresAtTimestamp } for operation cooldowns
    jailTimer: 0,
    afkManagerExpiresAt: 0, // 12-hour active manager timestamp
    activityLog: [], // Rolling audit log of player actions
    totalTaxesPaid: 0, // Cumulative taxes paid to public treasury
    netWorth: 400,
    title: 'عامل مبتدئ',
    ownedCars: [],
    activeCar: null,
    smugglingFleet: { speedboat: 0, plane: 0, ship: 0 },
    activeSmugglingJobs: [],
    stockCooldowns: {} // Stores { SYMBOL: lockUntilTimestamp }
  };

  let state = { ...INITIAL_STATE };
  let stockPrices = {}; // Stores { SYMBOL: [priceHistory...] }
  let stockRegimes = {}; // Stores { SYMBOL: { direction: 'bullish'|'bearish'|'sideways', duration: 15, floatingBase: price } }
  let stockTickCounter = 0;
  const STOCK_PULSE_INTERVAL = 6; // Update stock prices every 6 seconds instead of every 1 second
  let activeUsername = "";
  let lastTipEventTimestamp = 0;
  let lastMarketEventTimestamp = 0;

  let taxConfig = {
    rateMultiplier: 1.0,
    silverRate: 0.000005,
    majorRate: 0.000010,
    whaleRate: 0.000018
  };

  function setTaxConfig(cfg) {
    if (cfg) {
      if (cfg.rateMultiplier !== undefined) taxConfig.rateMultiplier = Number(cfg.rateMultiplier);
      if (cfg.silverRate !== undefined) taxConfig.silverRate = Number(cfg.silverRate);
      if (cfg.majorRate !== undefined) taxConfig.majorRate = Number(cfg.majorRate);
      if (cfg.whaleRate !== undefined) taxConfig.whaleRate = Number(cfg.whaleRate);
      console.log('[GAME] Tax configuration updated dynamically:', taxConfig);
    }
  }

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

  // ─────────────────────────────────────────────────────────
  // 🏛️ UNIFIED GLOBAL STOCK MARKET (بورصة مركزية موحدة لجميع اللاعبين)
  // ─────────────────────────────────────────────────────────
  let globalMarketEvent = null; // { targets: { BITC: 1.1 }, title: "...", expiresAt: 123456 }

  const UNIFIED_SCHEDULED_EVENTS = [
    {
      title: 'السوق مستقر وتداولات اعتيادية متزنة بين المتعاملين في البورصة المصرية...',
      targets: {}
    },
    {
      title: '🚀 موجة شراء مؤسسية تقفز بسهم فوري FWRY وصندوق الذكاء الاصطناعي AIX!',
      targets: { FWRY: 1.12, AIX: 1.10 }
    },
    {
      title: '👑 إقبال قياسي على الذهب كملاذ آمن: صعود ملحوظ لسهم GOLD وصندوق CASH!',
      targets: { GOLD: 1.12, CASH: 1.08 }
    },
    {
      title: '🏛️ البنك المركزي يحرك الفائدة: انتعاش سهم البنك التجاري COMI وتصحيح طفيف!',
      targets: { COMI: 1.12, CASH: 1.06, EAST: 0.95 }
    },
    {
      title: '📡 المصرية للاتصالات ETEL تفوز بتراخيص الجيل الخامس: نشاط إيجابي للسهم!',
      targets: { ETEL: 1.12 }
    },
    {
      title: '⚡ جني أرباح وتصحيح فني هادئ في سوق العملات الرقمية والبيتكوين BITC!',
      targets: { BITC: 0.90, AIX: 0.95 }
    },
    {
      title: '🚢 انتظام سلاسل التوريد ووصول شحنات المواد الخام يدعم الشرقية للدخان EAST!',
      targets: { EAST: 1.10 }
    },
    {
      title: '🌐 تفاؤل استثماري وصعود جماعي لمؤشرات الأسهم بقيادة CIB والمدفوعات!',
      targets: { COMI: 1.08, FWRY: 1.08, ETEL: 1.06, EAST: 1.06, AIX: 1.07 }
    },
    {
      title: '📉 ضغوط بيعية مؤقتة في قطاع التكنولوجيا تتيح فرص دخول جاذبة للمستثمرين!',
      targets: { FWRY: 0.92, CASH: 0.93 }
    }
  ];

  function setGlobalMarketEvent(event) {
    globalMarketEvent = event;
  }

  function getCurrentMarketEvent() {
    if (globalMarketEvent && (!globalMarketEvent.expiresAt || Date.now() < globalMarketEvent.expiresAt)) {
      return globalMarketEvent;
    }
    // Synchronized 15-minute global cycle (900,000 ms)
    const cycleIndex = Math.floor(Date.now() / (15 * 60 * 1000)) % UNIFIED_SCHEDULED_EVENTS.length;
    return UNIFIED_SCHEDULED_EVENTS[cycleIndex];
  }

  function getCurrentMarketTicker() {
    const ev = getCurrentMarketEvent();
    return (ev && ev.title) ? ev.title : 'السوق مستقر وتداولات اعتيادية بين المتعاملين...';
  }

  // Deterministic 32-bit integer PRNG noise in [-1, 1]
  function getDeterministicNoise(seed, tick) {
    let x = (Math.imul((tick ^ (seed * 37)), 0x5deece66d) + 0xb) | 0;
    x = (Math.imul(x ^ (x >>> 15), 0x27d4eb2d)) | 0;
    x = (x ^ (x >>> 16)) | 0;
    return ((x >>> 0) / 4294967296) * 2 - 1;
  }

  // Calculate the EXACT identical price of stock `sym` at any given tick number
  function calculateUnifiedPriceAtTick(sym, tick) {
    const stock = STOCKS[sym];
    if (!stock) return 10;
    const seed = stock.seed || 101;

    // 1. Long-term Macro Cycle (~45 mins = 337.5 ticks at 8s per tick)
    const wave1 = Math.sin((tick + seed * 13) * (2 * Math.PI / 337.5));
    // 2. Medium-term Sector Momentum (~12 mins = 90 ticks)
    const wave2 = Math.sin((tick + seed * 29) * (2 * Math.PI / 91.3));
    // 3. Short-term Intraday Swing (~2.5 mins = 19 ticks)
    const wave3 = Math.sin((tick + seed * 47) * (2 * Math.PI / 19.1));
    // 4. Intraday Brownian Noise
    const noise = getDeterministicNoise(seed, tick);

    // Weighted Cycle Factor
    const cycleFactor = 1 + (wave1 * 0.22) + (wave2 * 0.12) + (wave3 * 0.06) + (noise * stock.volatility * 1.8);
    let price = Math.round(stock.basePrice * cycleFactor);

    // Apply Active Market Event Multiplier (Admin or Synchronized Cycle)
    const activeEv = getCurrentMarketEvent();
    if (activeEv && activeEv.targets && activeEv.targets[sym]) {
      price = Math.round(price * activeEv.targets[sym]);
    }

    // Safety Bounds (Floor & Ceiling prevent runaway pricing or infinite pumps)
    const ceiling = stock.ceiling || Math.round(stock.basePrice * 3.5);
    price = Math.max(stock.floor, Math.min(ceiling, price));

    return price;
  }

  function getUnifiedStockTick() {
    // 8-second global synchronized pulse
    return Math.floor(Date.now() / 8000);
  }

  // Initialize Stock Price Histories (100% Unified across all players)
  function initStocks() {
    const currentTick = getUnifiedStockTick();
    Object.keys(STOCKS).forEach(sym => {
      const history = [];
      // Generate past 25 synchronized points
      for (let i = 24; i >= 0; i--) {
        history.push(calculateUnifiedPriceAtTick(sym, currentTick - i));
      }
      stockPrices[sym] = history;
    });
    try {
      localStorage.removeItem('rasalmal_stock_prices');
      localStorage.removeItem('rasalmal_stock_regimes');
    } catch (e) {}
  }

  // Immediately initialize unified stocks so prices are available on boot
  initStocks();

  function syncUnifiedStocks() {
    const currentTick = getUnifiedStockTick();
    let changed = false;
    Object.keys(STOCKS).forEach(sym => {
      if (!stockPrices[sym] || stockPrices[sym].length === 0) {
        stockPrices[sym] = [STOCKS[sym].basePrice];
      }
      const newPrice = calculateUnifiedPriceAtTick(sym, currentTick);
      const lastPrice = stockPrices[sym][stockPrices[sym].length - 1];
      if (newPrice !== lastPrice) {
        stockPrices[sym].push(newPrice);
        if (stockPrices[sym].length > 30) stockPrices[sym].shift();
        changed = true;
      }
    });
    return changed;
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
    if (worth >= 1000000000 && xp >= 50000) return 'سلطان الاقتصاد العالمي 👑';
    if (worth >= 500000000 && xp >= 30000) return 'إمبراطور المال والفلوس 🏆';
    if (worth >= 150000000 && xp >= 15000) return 'حوت المال الدولي 🐋';
    if (worth >= 50000000 && xp >= 7500) return 'ملياردير عصامي 💎';
    if (worth >= 15000000 && xp >= 3500) return 'مليونير فخم 🎩';
    if (worth >= 4000000 && xp >= 1500) return 'سيد الأعمال 🏢';
    if (worth >= 1000000 && xp >= 600) return 'مستثمر طموح 📈';
    if (worth >= 200000 && xp >= 200) return 'تاجر صاعد 💼';
    if (xp >= 80) return 'موظف متميز 👔';
    if (xp >= 25) return 'عامل ماهر 🛠️';
    return 'عامل مبتدئ';
  }

  // --- Unified Engine Mathematical Helpers for Instant & Continuous Cashflow ---

  // Calculate detailed financial breakdown and owner profit for a single business
  function calculateSingleBusinessProfit(key, bizState, playerState = state) {
    const bizConfig = BUSINESSES[key];
    if (!bizConfig || !bizState || bizState.level <= 0) {
      return {
        opt: 0,
        price: 0,
        elasticity: 1,
        marketingActive: false,
        actualCostOfGoods: 0,
        demand: 0,
        margin: 0,
        grossProfit: 0,
        workerPayroll: 0,
        cappedPayroll: 0,
        netProfit: 0,
        synergyMultiplier: 1,
        franchiseMultiplier: 1,
        employeeBoost: 1,
        corpBooster: 1,
        employeePayrollDeduction: 0,
        finalNetProfit: 0,
        ownerProfit: 0,
        partnerDividends: {}
      };
    }

    const s = playerState || state;
    const levelMultiplier = Math.pow(1.12, Math.max(0, (bizState.level || 1) - 1));
    const franchiseOptMultiplier = bizState.isFranchise ? 1.30 : 1.0;
    const opt = Math.round(bizConfig.optimumPrice * levelMultiplier * franchiseOptMultiplier);
    const price = bizState.price || opt;

    let elasticity = 1.0;
    if (price > opt) {
      elasticity = Math.max(0, 1 - (price - opt) / opt);
    } else if (price < opt) {
      elasticity = 1 + (opt - price) / opt * 0.3;
    }

    const marketingActive = Boolean(bizState.marketingTicks && bizState.marketingTicks > 0);
    const marketingBoost = marketingActive ? 1.4 : 1.0;
    const costOfGoodsLevelMultiplier = Math.pow(1.06, Math.max(0, (bizState.level || 1) - 1));
    const actualCostOfGoods = Math.floor(bizConfig.costOfGoods * costOfGoodsLevelMultiplier * 1.05);
    const upgradeFactor = Math.pow(bizConfig.upgradeMultiplier, bizState.level - 1);
    const workerFactor = 1 + ((bizState.workers || 0) * ((bizConfig.workerMultiplier || 1.2) - 1));
    const demand = Math.floor(bizConfig.baseDemand * upgradeFactor * elasticity * workerFactor * marketingBoost);
    const margin = price - actualCostOfGoods;

    const hasQuantum = Boolean(s && s.inventory && s.inventory.quantum_cpu > 0);
    const quantumMultiplier = hasQuantum ? 1.5 : 1.0;
    const boost = (typeof window !== 'undefined' && window.serverBoostMultiplier) || 1.0;
    const grossProfit = Math.max(0, Math.floor(demand * margin * 0.85 * quantumMultiplier * boost));

    const workerPayroll = (bizState.workers || 0) * (bizConfig.workerWage || 0);
    const cappedPayroll = Math.min(workerPayroll, Math.floor(grossProfit * 0.40));
    const netProfit = Math.max(0, grossProfit - cappedPayroll);

    // V2: Supply Chain Synergies Multiplier
    let synergyMultiplier = 1.0;
    if (s && s.assets && s.businesses) {
      if (key === 'logistics' && ((s.assets.mega_yacht || 0) > 0 || (s.assets.private_island || 0) > 0)) {
        synergyMultiplier = 1.15;
      } else if (key === 'coffee' && (s.businesses.supermarket && s.businesses.supermarket.level > 0)) {
        synergyMultiplier = 1.10;
      } else if (key === 'tech' && (s.businesses.private_bank && s.businesses.private_bank.level > 0)) {
        synergyMultiplier = 1.20;
      } else if (key === 'space_tech' && ((s.assets.orbital_station || 0) > 0)) {
        synergyMultiplier = 1.30;
      }
    }

    // V2: Franchise Multiplier
    const franchiseMultiplier = bizState.isFranchise ? 1.25 : 1.0;

    // V2: Employee Boost & Salary Deductions
    let employeeBoost = 1.0;
    let employeePayrollDeduction = 0;
    if (bizState.employees) {
      Object.keys(bizState.employees).forEach(empUser => {
        const empData = bizState.employees[empUser];
        let solved = false;
        if (typeof window !== 'undefined' && window.employeesCache && window.employeesCache[empUser]) {
          const empState = window.employeesCache[empUser];
          if (empState.lastPuzzleSolved && (Date.now() - empState.lastPuzzleSolved < 86400000)) {
            solved = true;
          }
        }
        if (solved) {
          employeeBoost += 0.30;
          employeePayrollDeduction += (empData.salary || 0);
        }
      });
    }

    // V2: Corporation Level Booster (+5% per level above Level 1)
    let corpBooster = 1.0;
    if (typeof window !== 'undefined' && window.activeCorporationState && s) {
      const corp = window.activeCorporationState;
      if (corp.members && corp.members.includes(s.username)) {
        const corpLevel = corp.level || 1;
        corpBooster = 1 + (corpLevel - 1) * 0.05;
      }
    }

    const finalNetProfit = Math.max(0, Math.floor(netProfit * synergyMultiplier * franchiseMultiplier * employeeBoost * corpBooster) - employeePayrollDeduction);

    let ownerProfit = finalNetProfit;
    const partnerDividends = {};

    // V2: Partner Profit Sharing Deductions
    if (bizState.partners && s) {
      const ownerShare = bizState.partners[s.username] !== undefined ? bizState.partners[s.username] : 1.0;
      ownerProfit = Math.floor(finalNetProfit * ownerShare);

      Object.keys(bizState.partners).forEach(partner => {
        if (partner !== s.username) {
          const partnerShare = bizState.partners[partner] || 0;
          const partnerAmt = Math.floor(finalNetProfit * partnerShare);
          if (partnerAmt > 0) {
            partnerDividends[partner] = partnerAmt;
          }
        }
      });
    }

    return {
      opt,
      price,
      elasticity,
      marketingActive,
      actualCostOfGoods,
      demand,
      margin,
      grossProfit,
      workerPayroll,
      cappedPayroll,
      netProfit,
      synergyMultiplier,
      franchiseMultiplier,
      employeeBoost,
      corpBooster,
      employeePayrollDeduction,
      finalNetProfit,
      ownerProfit,
      partnerDividends
    };
  }

  // Calculate live tick profit from joint corporation projects
  function calculateCorpTickProfit(playerState = state) {
    const s = playerState || state;
    if (!s || typeof window === 'undefined' || !window.activeCorporationState) return 0;
    const corp = window.activeCorporationState;
    const username = s.username;
    if (!corp.members || !corp.members.includes(username) || !corp.projects) return 0;

    let totalCont = corp.totalContributions || 0;
    let myCont = corp.contributions ? (corp.contributions[username] || 0) : 0;
    let sharePct = 0;
    if (totalCont > 0) {
      sharePct = myCont / totalCont;
    } else if (username === corp.founder) {
      sharePct = 1.0;
    }

    let totalCorpTickProfit = 0;
    if (Array.isArray(corp.projects)) {
      corp.projects.forEach(projId => {
        if (CORP_PROJECTS[projId]) {
          totalCorpTickProfit += CORP_PROJECTS[projId].profitPerTick;
        }
      });
    } else if (corp.projects && typeof corp.projects === 'object') {
      Object.keys(corp.projects).forEach(projId => {
        if (corp.projects[projId] && CORP_PROJECTS[projId]) {
          totalCorpTickProfit += CORP_PROJECTS[projId].profitPerTick;
        }
      });
    }

    return Math.floor(totalCorpTickProfit * sharePct);
  }

  // Calculate compound bank interest per tick (0.0005% per second, boosted +5% if Rolls-Royce active)
  function calculateBankInterestPerTick(playerState = state) {
    const s = playerState || state;
    if (!s || !s.bank || s.bank <= 0) return 0;
    let rate = 0.000005;
    if (s.activeCar === 'rolls') {
      rate *= 1.05; // Rolls-Royce Phantom +5% bank interest boost
    }
    return Math.floor(s.bank * rate);
  }

  // Calculate total passive cashflow per tick from all businesses, real estate, bank interest, corp, and peer employment
  function calculatePassiveIncomePerTick(excludeTax = false) {
    let income = 0;
    if (!state) return 0;

    // 1. Businesses income (Net owner profit after workers, synergies, franchises, employees, and partner splits)
    if (state.businesses) {
      Object.keys(state.businesses).forEach(key => {
        const bizState = state.businesses[key];
        if (bizState && bizState.level > 0) {
          const breakdown = calculateSingleBusinessProfit(key, bizState, state);
          income += breakdown.ownerProfit;
        }
      });
    }

    // 2. Joint Corporation Projects Profit Share
    income += calculateCorpTickProfit(state);

    // 3. Hired Peer Job Salary (active verified daily contract)
    if (state.hiredJob && state.lastPuzzleSolved && (Date.now() - state.lastPuzzleSolved < 86400000)) {
      income += (state.hiredJob.salary || 0);
    }

    // 4. Real estate rental income
    if (state.assets) {
      Object.keys(state.assets).forEach(key => {
        const owned = state.assets[key] || 0;
        if (owned > 0 && ASSETS[key]) {
          income += owned * Math.floor(ASSETS[key].rent * 0.1);
        }
      });
    }

    // 5. Cars rental income and maintenance
    if (state.ownedCars && state.ownedCars.length > 0) {
      state.ownedCars.forEach(carRef => {
        const car = CAR_TEMPLATES[carRef.id];
        if (car && carRef.rentStatus === 'rented') {
          const netProfit = car.rentalIncomePerTick - car.maintenanceCostPerTick;
          if (netProfit > 0) {
            income += netProfit;
          }
        }
      });
    }

    // 6. Bank interest (0.0005% per tick + Rolls-Royce bonus)
    income += calculateBankInterestPerTick(state);

    // 7. Wealth Tax deduction for ultra-high net worth (5M+ EGP, with liquid safety buffer > 100k)
    if (state.netWorth > 5000000 && !excludeTax) {
      const liquidFunds = (state.bank || 0) + (state.cash || 0);
      if (liquidFunds > 100000) {
        const taxReport = calculateTaxReport();
        income = Math.max(0, income - taxReport.taxPerSecond);
      }
    }

    return income;
  }

  // Comprehensive Financial Audit: Returns exact breakdown of all cashflow streams
  function getDetailedCashflowBreakdown(playerState = state) {
    const s = playerState || state;
    if (!s) return null;

    const breakdown = {
      businesses: [],
      assets: [],
      cars: [],
      bank: {
        balance: s.bank || 0,
        rate: 0.000005,
        hasRollsBonus: (s.activeCar === 'rolls'),
        effectiveRate: (s.activeCar === 'rolls') ? 0.000005 * 1.05 : 0.000005,
        profitPerSec: calculateBankInterestPerTick(s)
      },
      corp: {
        active: false,
        name: '',
        level: 1,
        sharePct: 0,
        profitPerSec: 0,
        projects: []
      },
      hiredJob: {
        active: false,
        name: '',
        salaryPerSec: 0
      },
      tax: {
        active: false,
        taxPerSec: 0,
        exemptReason: ''
      },
      totalGrossPerSec: 0,
      totalNetPerSec: 0,
      totalNetPerMinute: 0,
      totalNetPerHour: 0,
      totalNetPerDay: 0
    };

    let grossIncome = 0;

    // 1. Businesses
    if (s.businesses) {
      Object.keys(s.businesses).forEach(key => {
        const b = s.businesses[key];
        const cfg = BUSINESSES[key];
        if (b && b.level > 0 && cfg) {
          const res = calculateSingleBusinessProfit(key, b, s);
          breakdown.businesses.push({
            id: key,
            name: cfg.name,
            level: b.level,
            workers: b.workers || 0,
            price: b.price || res.opt,
            optPrice: res.opt,
            actualCostOfGoods: res.actualCostOfGoods,
            demand: res.demand,
            margin: res.margin,
            isFranchise: Boolean(b.isFranchise),
            marketingActive: res.marketingActive,
            synergyMultiplier: res.synergyMultiplier,
            employeeBoost: res.employeeBoost,
            profitPerSec: res.ownerProfit
          });
          grossIncome += res.ownerProfit;
        }
      });
    }

    // 2. Assets
    if (s.assets) {
      Object.keys(s.assets).forEach(key => {
        const count = s.assets[key] || 0;
        const cfg = ASSETS[key];
        if (count > 0 && cfg) {
          const rentPerSec = count * Math.floor(cfg.rent * 0.1);
          breakdown.assets.push({
            id: key,
            name: cfg.name,
            count: count,
            rentPerUnit: Math.floor(cfg.rent * 0.1),
            rentPerSec: rentPerSec
          });
          grossIncome += rentPerSec;
        }
      });
    }

    // 3. Cars
    if (s.ownedCars && s.ownedCars.length > 0) {
      s.ownedCars.forEach(carRef => {
        const carCfg = CAR_TEMPLATES[carRef.id];
        if (carCfg && carRef.rentStatus === 'rented') {
          const netProfit = carCfg.rentalIncomePerTick - carCfg.maintenanceCostPerTick;
          if (netProfit > 0) {
            breakdown.cars.push({
              id: carRef.id,
              name: carCfg.name,
              grossRent: carCfg.rentalIncomePerTick,
              maintenance: carCfg.maintenanceCostPerTick,
              netProfitPerSec: netProfit
            });
            grossIncome += netProfit;
          }
        }
      });
    }

    // 4. Bank Interest
    grossIncome += breakdown.bank.profitPerSec;

    // 5. Joint Corp
    if (typeof window !== 'undefined' && window.activeCorporationState) {
      const corp = window.activeCorporationState;
      const username = s.username;
      if (corp.members && corp.members.includes(username)) {
        let totalCont = corp.totalContributions || 0;
        let myCont = corp.contributions ? (corp.contributions[username] || 0) : 0;
        let sharePct = (totalCont > 0) ? (myCont / totalCont) : (username === corp.founder ? 1.0 : 0);
        const corpTickProfit = calculateCorpTickProfit(s);
        breakdown.corp.active = true;
        breakdown.corp.name = corp.name || 'تحالف مشترك';
        breakdown.corp.level = corp.level || 1;
        breakdown.corp.sharePct = Math.round(sharePct * 100);
        breakdown.corp.profitPerSec = corpTickProfit;
        grossIncome += corpTickProfit;
      }
    }

    // 6. Hired Job
    if (s.hiredJob) {
      const solved = Boolean(s.lastPuzzleSolved && (Date.now() - s.lastPuzzleSolved < 86400000));
      breakdown.hiredJob.name = s.hiredJob.title || 'موظف تعاقدي';
      breakdown.hiredJob.salaryPerSec = s.hiredJob.salary || 0;
      breakdown.hiredJob.active = solved;
      if (solved && (s.hiredJob.salary || 0) > 0) {
        grossIncome += s.hiredJob.salary;
      }
    }

    // 7. Wealth Tax
    let taxDeduction = 0;
    if (s.netWorth > 5000000) {
      const liquidFunds = (s.bank || 0) + (s.cash || 0);
      if (liquidFunds > 100000) {
        const taxReport = calculateTaxReport();
        taxDeduction = taxReport.taxPerSecond || 0;
        breakdown.tax.active = true;
        breakdown.tax.taxPerSec = taxDeduction;
      } else {
        breakdown.tax.active = false;
        breakdown.tax.exemptReason = 'محمي بحاجز السيولة (أقل من 100 ألف كاش/بنك)';
      }
    } else {
      breakdown.tax.active = false;
      breakdown.tax.exemptReason = 'معفي (صافي الثروة أقل من 5 مليون EGP)';
    }

    const netIncome = Math.max(0, grossIncome - taxDeduction);

    breakdown.totalGrossPerSec = grossIncome;
    breakdown.totalNetPerSec = netIncome;
    breakdown.totalNetPerMinute = netIncome * 60;
    breakdown.totalNetPerHour = netIncome * 3600;
    breakdown.totalNetPerDay = netIncome * 86400;

    return breakdown;
  }

  // Tax Report & Bracket Engine (Rebalanced to prevent cash-drain while rewarding tax planning)
  function calculateTaxReport() {
    const netWorth = calculateNetWorth();
    const taxShieldActive = Boolean(state.inventory && state.inventory.tax_shield > 0);
    const shieldDurationTicks = (state.itemDurations && state.itemDurations.tax_shield) || 0;
    const EXEMPTION_THRESHOLD = 5000000; // Raised from 3M to 5M EGP

    if (netWorth <= EXEMPTION_THRESHOLD) {
      return {
        taxableNetWorth: 0,
        bracketName: 'الشريحة الأولى (معفى تماماً حتى 5 مليون ج.م)',
        bracketId: 1,
        bracketColor: 'text-emerald-400',
        baseRatePct: '0.0000%',
        effectiveRatePct: '0.0000%',
        taxPerSecond: 0,
        taxShieldActive,
        shieldDurationTicks,
        totalTaxesPaid: state.totalTaxesPaid || 0
      };
    }

    const taxable = netWorth - EXEMPTION_THRESHOLD;
    let baseRate = (taxConfig.silverRate || 0.000003) * (taxConfig.rateMultiplier || 1.0);
    let bracketName = 'الشريحة الفضية (5M - 20M ج.م)';
    let bracketId = 2;
    let bracketColor = 'text-sky-400';

    if (netWorth > 60000000) {
      baseRate = (taxConfig.whaleRate || 0.000010) * (taxConfig.rateMultiplier || 1.0);
      bracketName = 'شريحة كبار المستثمرين والمليارديرات (+60M ج.م)';
      bracketId = 4;
      bracketColor = 'text-rose-400';
    } else if (netWorth > 20000000) {
      baseRate = (taxConfig.majorRate || 0.000006) * (taxConfig.rateMultiplier || 1.0);
      bracketName = 'شريحة الممولين المتقدمين (20M - 60M ج.م)';
      bracketId = 3;
      bracketColor = 'text-amber-400';
    }

    const effectiveRate = taxShieldActive ? (baseRate * 0.40) : baseRate; // Tax shield gives 60% discount
    // Max cap: Never drain more than 450 EGP/sec even for extreme billionaires
    const calculatedTax = Math.floor(taxable * effectiveRate);
    const taxPerSecond = Math.min(450, Math.max(0, calculatedTax));

    return {
      taxableNetWorth: taxable,
      bracketName,
      bracketId,
      bracketColor,
      baseRatePct: (baseRate * 100).toFixed(4) + '%',
      effectiveRatePct: (effectiveRate * 100).toFixed(4) + '%',
      taxPerSecond,
      taxShieldActive,
      shieldDurationTicks,
      totalTaxesPaid: state.totalTaxesPaid || 0
    };
  }

  function fileTaxDeclaration() {
    const cost = 100000;
    if ((state.cash || 0) < cost) {
      throw new Error(`تحتاج إلى ${cost.toLocaleString()} ج.م كاش لتقديم الإقرار والتسوية الضريبية.`);
    }
    state.cash -= cost;
    state.totalTaxesPaid = (state.totalTaxesPaid || 0) + cost;
    state.xp = (state.xp || 0) + 250;
    recordPlayerActivity('إقرار ضريبي', `تقديم إقرار ضريبي طوعي وتسوية ${cost.toLocaleString()} ج.م (+250 XP)`, 'banking');
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return { cost, xpGain: 250 };
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

  function safeGetState() {
    if (!state) return;
    if (!state.ownedCars) state.ownedCars = [];
    if (!state.activeCar) state.activeCar = null;
    if (!state.smugglingFleet) state.smugglingFleet = { speedboat: 0, plane: 0, ship: 0 };
    if (!state.activeSmugglingJobs) state.activeSmugglingJobs = [];
  }

  // --- Central Simulation Tick ---
  function processTick() {
    if (!activeUsername) return null;
    safeGetState();

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

    // 0.5. Active Police Raid check (pauses passive income during active raid)
    if (state.raidActive) {
      state.netWorth = calculateNetWorth();
      AppDB.savePlayerState(activeUsername, state);
      return updates;
    }

    // 1. Jail timer decrement (Player is isolated ONLY from Black Market activities; all legitimate businesses, rents, car revenues, investments, and passive income continue normally!)
    if (state.jailTimer > 0) {
      state.jailTimer = Math.max(0, state.jailTimer - 1);
      if (state.jailTimer === 0) {
        updates.jailFree = true;
      }
    }

    // 1.5. Police Raid Trigger check (triggered if dirtyCash > 100K)
    if (!state.raidActive && state.jailTimer <= 0 && (state.dirtyCash || 0) > 100000) {
      const baseChance = 0.015; // 1.5% base chance per tick
      const heatFactor = (state.heatLevel || 0) * 0.025; // +2.5% per heat level
      const cashFactor = Math.min(0.1, (state.dirtyCash || 0) / 20000000); // up to +10% for large dirty cash
      const finalChance = baseChance + heatFactor + cashFactor;

      if (Math.random() < finalChance) {
        state.raidActive = true;
        // Bribe cost: 20% of cash + 10% of dirty cash, minimum 10,000
        state.raidBribeCost = Math.max(10000, Math.floor((state.cash || 0) * 0.2) + Math.floor((state.dirtyCash || 0) * 0.1));
        // Escape chance: 40% + Underworld Rep / 5, max 90%
        state.raidEscapeChance = Math.min(90, 40 + Math.floor((state.underworldRep || 0) / 5));
        
        state.netWorth = calculateNetWorth();
        AppDB.savePlayerState(activeUsername, state);
        return updates; // Stop further processing to let player resolve raid
      }
    }

    // 2. Bank compound interest accrual (0.0005% per tick + Rolls-Royce bonus)
    const interestGained = calculateBankInterestPerTick(state);
    if (interestGained > 0) {
      state.bank += interestGained;
      updates.bankInterestGained = interestGained;
    }

    // 3. Peer-to-Peer Hired Job Salary (earned when hired by another player's business)
    if (state.hiredJob && state.lastPuzzleSolved && (Date.now() - state.lastPuzzleSolved < 86400000)) {
      const hiredSalary = state.hiredJob.salary || 0;
      if (hiredSalary > 0) {
        state.bank += hiredSalary;
        updates.businessProfitGained += hiredSalary;
      }
    }

    // 4. Businesses passive income ticking (uses unified calculateSingleBusinessProfit engine)
    Object.keys(state.businesses).forEach(key => {
      const bizState = state.businesses[key];
      if (!bizState || bizState.level <= 0) return;

      const breakdown = calculateSingleBusinessProfit(key, bizState, state);

      // Decrement marketing campaign timer if active
      if (bizState.marketingTicks && bizState.marketingTicks > 0) {
        bizState.marketingTicks--;
      }

      if (breakdown.ownerProfit > 0) {
        state.bank += breakdown.ownerProfit;
        updates.businessProfitGained += breakdown.ownerProfit;
      }

      // Record partner dividends for claim distribution
      if (typeof window !== 'undefined' && breakdown.partnerDividends) {
        if (!window.pendingDividends) window.pendingDividends = {};
        if (!window.pendingDividends[key]) window.pendingDividends[key] = {};
        Object.entries(breakdown.partnerDividends).forEach(([partner, amt]) => {
          if (amt > 0) {
            window.pendingDividends[key][partner] = (window.pendingDividends[key][partner] || 0) + amt;
          }
        });
      }
    });

    // V2: Joint Corporation Passive Profit Ticks (uses unified calculateCorpTickProfit engine)
    const corpProfitGained = calculateCorpTickProfit(state);
    if (corpProfitGained > 0) {
      state.bank += corpProfitGained;
      updates.businessProfitGained += corpProfitGained;
    }

    // 4.5 Passive Business Front Laundering (واجهات الشركات لغسيل الأموال بضريبة 25% كحد أدنى)
    if ((state.dirtyCash || 0) > 0 && state.businesses) {
      let bizFrontCapacity = 0;
      Object.keys(state.businesses).forEach(k => {
        const b = state.businesses[k];
        if (b && b.level > 0) {
          bizFrontCapacity += b.level * 250; // Each business level provides laundering capacity per tick
        }
      });
      if (bizFrontCapacity > 0) {
        const autoAmount = Math.min(state.dirtyCash, bizFrontCapacity);
        const autoFeeRate = 0.25; // Never less than 25% laundering tax
        const autoFee = Math.floor(autoAmount * autoFeeRate);
        const autoCleaned = autoAmount - autoFee;
        state.dirtyCash -= autoAmount;
        state.cash += autoCleaned; // Added as clean legitimate cash
        state.totalTaxesPaid = (state.totalTaxesPaid || 0) + autoFee;
      }
    }

    // Progressive Wealth Tax on Ultra-High Net Worth (5M+ EGP, with strong liquidity protection)
    if (state.netWorth > 5000000) {
      const liquidFunds = (state.bank || 0) + (state.cash || 0);
      const safetyBuffer = 100000; // Never deduct taxes if liquid funds are under 100,000 EGP

      if (liquidFunds > safetyBuffer) {
        const taxReport = calculateTaxReport();
        const tax = taxReport.taxPerSecond;
        if (tax > 0) {
          let remainingTax = tax;
          
          // 1. Try to deduct from bank first
          if (state.bank > 0) {
            const bankDeducted = Math.min(state.bank, remainingTax);
            state.bank -= bankDeducted;
            remainingTax -= bankDeducted;
            state.totalTaxesPaid = (state.totalTaxesPaid || 0) + bankDeducted;
          }
          
          // 2. If there's still tax remaining, deduct from cash (keeping a 100k safety buffer)
          if (remainingTax > 0) {
            const taxableCash = Math.max(0, (state.cash || 0) - safetyBuffer);
            const cashDeducted = Math.min(taxableCash, remainingTax);
            state.cash -= cashDeducted;
            state.totalTaxesPaid = (state.totalTaxesPaid || 0) + cashDeducted;
          }
        }
      }
    }

    // 5. Assets / Real Estate passive rental income ticking
    Object.keys(state.assets).forEach(key => {
      const ownedCount = state.assets[key] || 0;
      if (ownedCount > 0) {
        const asset = ASSETS[key];
        const rent = ownedCount * Math.floor(asset.rent * 0.1); // Rent scaling per tick
        state.bank += rent;
        updates.rentGained += rent;
      }
    });

    // 5.5 Cars rental income and maintenance ticking
    if (state.ownedCars && state.ownedCars.length > 0) {
      state.ownedCars.forEach(carRef => {
        const car = CAR_TEMPLATES[carRef.id];
        if (car && carRef.rentStatus === 'rented') {
          const netProfit = car.rentalIncomePerTick - car.maintenanceCostPerTick;
          if (netProfit > 0) {
            state.bank += netProfit;
            updates.rentGained += netProfit;
          }
        }
      });
    }

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

    // 6.5 Smuggling jobs counter & completion
    if (state.activeSmugglingJobs && state.activeSmugglingJobs.length > 0) {
      const remainingJobs = [];
      const nowMs = Date.now();
      state.activeSmugglingJobs.forEach(job => {
        if (nowMs >= job.endTime) {
          const route = SMUGGLING_ROUTES[job.routeId];
          if (route) {
            const isCaptured = (Math.random() * 100) < route.riskPct;
            if (isCaptured) {
              if (state.smugglingFleet && state.smugglingFleet[job.vehicleType] > 0) {
                state.smugglingFleet[job.vehicleType]--;
              }
              state.jailTimer = 600; // 10 minutes
              recordPlayerActivity('تهريب فشل 🚔', `مداهمة أمنية لشحنة "${route.name}". تم اعتقالك ومصادرة الـ ${SMUGGLING_VEHICLES[job.vehicleType].name}.`, 'dark');
              if (!updates.tipEvent) {
                updates.tipEvent = {
                  title: '🚨 مداهمة أمنية وسجن!',
                  message: `تم اعتراض شحنتك المهربة إلى "${route.name}". تم اعتقالك وحبسك لمدة 10 دقائق ومصادرة مركبة الشحن!`,
                  gain: 0
                };
              }
            } else {
              state.cash += route.yieldCash;
              state.xp += 800;
              recordPlayerActivity('تهريب ناجح 🚢✈️', `وصول شحنة "${route.name}" بسلام! عائد: ${route.yieldCash.toLocaleString()} EGP (+800 XP)`, 'dark');
              if (!updates.tipEvent) {
                updates.tipEvent = {
                  title: '🚢 شحنة تهريب ناجحة!',
                  message: `وصلت شحنتك بسلام إلى وجهتها! تم إيداع الأرباح الكاش: +${route.yieldCash.toLocaleString()} EGP (+800 XP)`,
                  gain: route.yieldCash
                };
              }
            }
          }
        } else {
          remainingJobs.push(job);
        }
      });
      state.activeSmugglingJobs = remainingJobs;
    }

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

    // 7. Unified Stock Market Synchronization (Deterministic & Global for all players)
    if (syncUnifiedStocks()) {
      updates.stockMovement = true;
      const currentEv = getCurrentMarketEvent();
      if (currentEv && currentEv.title) {
        updates.marketTicker = currentEv.title;
      }
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
  async function syncItemsConfig() {
    try {
      const itemsConfig = await AppDB.getItemsConfig();
      if (itemsConfig) {
        Object.keys(itemsConfig).forEach(itemId => {
          if (STORE_ITEMS[itemId]) {
            if (itemsConfig[itemId].cost != null) {
              STORE_ITEMS[itemId].cost = itemsConfig[itemId].cost;
            }
            if (itemsConfig[itemId].durationTicks != null) {
              STORE_ITEMS[itemId].durationTicks = itemsConfig[itemId].durationTicks;
            }
          }
        });
      }
    } catch (e) {
      console.warn('[GameEngine] Failed to sync store items config:', e);
    }
  }

  async function loadUserSession(username, preloadedData = null) {
    activeUsername = username;
    syncItemsConfig().catch(() => {}); // Non-blocking background sync
    const dbState = preloadedData || (await AppDB.getPlayerState(username));
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
        investments: Array.isArray(dbState.investments) ? dbState.investments : [],
        customItems: Array.isArray(dbState.customItems) ? dbState.customItems : []
      };

      // Calculate offline idle earnings if returning after being away (Requires active 12-hour AFK Manager)
      if (dbState.lastActiveTimestamp && dbState.lastActiveTimestamp > 0) {
        const now = Date.now();
        const managerExpiry = dbState.afkManagerExpiresAt || 0;

        // Effective offline time is capped by when the 12-hour manager expired
        const effectiveEnd = Math.min(now, managerExpiry);
        const elapsedSinceLastActive = Math.max(0, Math.floor((effectiveEnd - dbState.lastActiveTimestamp) / 1000));

        let offlineCorpEarnings = 0;
        if (typeof firebase !== 'undefined' && AppDB.isFirebaseReady) {
          try {
            const db = firebase.firestore();
            const snapshot = await db.collection('corporations').where('members', 'array-contains', username).get();
            if (!snapshot.empty) {
              const corp = snapshot.docs[0].data();
              
              let totalCont = corp.totalContributions || 0;
              let myCont = corp.contributions ? (corp.contributions[username] || 0) : 0;
              let sharePct = 0;
              if (totalCont > 0) {
                sharePct = myCont / totalCont;
              } else if (username === corp.founder) {
                sharePct = 1.0;
              }
              
              let totalCorpTickProfit = 0;
              if (corp.projects) {
                if (Array.isArray(corp.projects)) {
                  corp.projects.forEach(projId => {
                    if (CORP_PROJECTS[projId]) {
                      totalCorpTickProfit += CORP_PROJECTS[projId].profitPerTick;
                    }
                  });
                } else if (typeof corp.projects === 'object') {
                  Object.keys(corp.projects).forEach(projId => {
                    if (corp.projects[projId] && CORP_PROJECTS[projId]) {
                      totalCorpTickProfit += CORP_PROJECTS[projId].profitPerTick;
                    }
                  });
                }
              }
              
              const corpProfitPerSecond = totalCorpTickProfit / 3;
              const elapsedSeconds = Math.max(0, Math.floor((now - dbState.lastActiveTimestamp) / 1000));
              const cappedSecondsCorp = Math.min(elapsedSeconds, 43200);
              
              offlineCorpEarnings = Math.floor(cappedSecondsCorp * corpProfitPerSecond * sharePct);
              if (offlineCorpEarnings > 0) {
                state.bank += offlineCorpEarnings;
                window.offlineCorpIncomeGained = offlineCorpEarnings;
              }
            }
          } catch (e) {
            console.warn('[Offline Corp] Failed to calculate:', e);
          }
        }

        // Decrement jail timer while player was offline
        if (state.jailTimer && state.jailTimer > 0) {
          state.jailTimer = Math.max(0, state.jailTimer - elapsedSinceLastActive);
        }

        if (elapsedSinceLastActive >= 10) {
          // Cap at 12 hours (43,200 seconds)
          const cappedSeconds = Math.min(43200, elapsedSinceLastActive);
          const incomePerSec = calculatePassiveIncomePerSecond();
          const offlineEarnings = Math.floor(incomePerSec * cappedSeconds);
          if (offlineEarnings > 0 || offlineCorpEarnings > 0) {
            state.bank += offlineEarnings;
            state.offlineReport = {
              seconds: cappedSeconds,
              earnings: (offlineEarnings || 0) + (offlineCorpEarnings || 0),
              corpEarnings: offlineCorpEarnings,
              wasManagerActive: true,
              expiredDuringAbsence: now > managerExpiry
            };
          }
        } else if (offlineCorpEarnings > 0) {
          state.offlineReport = {
            seconds: 0,
            earnings: offlineCorpEarnings,
            corpEarnings: offlineCorpEarnings,
            wasManagerActive: true,
            expiredDuringAbsence: false
          };
        } else if (now > managerExpiry && managerExpiry > 0) {
          state.offlineReport = {
            seconds: 0,
            earnings: 0,
            wasManagerActive: false,
            expiredDuringAbsence: true
          };
        }
      }
      if (!state.afkManagerExpiresAt || state.afkManagerExpiresAt <= 0) {
        state.afkManagerExpiresAt = Date.now() + (12 * 60 * 60 * 1000);
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
    const job = JOBS[state.jobId] || JOBS.worker;
    if (!job) throw new Error("الوظيفة غير صالحة.");

    // Calculate XP boosters & energy drink salary multipliers
    const isPenActive = (state.inventory && state.inventory.gold_pen > 0);
    const isEnergyActive = (state.inventory && state.inventory.energy_drink > 0);

    const xpBoost = isPenActive ? (1 + (STORE_ITEMS.gold_pen ? STORE_ITEMS.gold_pen.value : 0.5)) : 1.0;
    const salaryMultiplier = isEnergyActive ? (STORE_ITEMS.energy_drink ? STORE_ITEMS.energy_drink.value : 2.0) : 1.0;

    const boost = window.serverBoostMultiplier || 1.0;
    const finalXpReward = Math.ceil(job.xpReward * xpBoost * boost);
    const finalSalary = Math.floor(job.salary * salaryMultiplier * boost);

    // Add XP and bank
    state.xp += finalXpReward;
    state.bank += finalSalary;

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
    forceSaveState(true);
    return biz;
  }

  // Upgrade Business Tier Level
  function upgradeBusiness(key) {
    const biz = BUSINESSES[key];
    const bizState = state.businesses[key];
    if (bizState.level >= 10) {
      throw new Error("لقد وصل المشروع للحد الأقصى من المستويات (المستوى 10). يرجى تحويله لعلامة تجارية (Franchise) للترقية للمستوى الأعلى.");
    }

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
    forceSaveState(true);
    return {
      level: bizState.level,
      cost: upgradeCost,
      savedDiscount: hasTaxShield ? (baseCost - upgradeCost) : 0
    };
  }

  function convertToFranchise(key) {
    const biz = BUSINESSES[key];
    const bizState = state.businesses[key];
    if (!bizState || bizState.level < 10) throw new Error("يجب ترقية المشروع للمستوى 10 أولاً.");
    if (bizState.isFranchise) throw new Error("هذا المشروع علامة تجارية مسجلة بالفعل.");

    const franchiseCost = Math.floor(biz.cost * 15);
    if (state.cash < franchiseCost) {
      throw new Error(`رصيدك غير كافٍ لتسجيل العلامة التجارية. تحتاج: ${franchiseCost.toLocaleString()} EGP`);
    }

    state.cash -= franchiseCost;
    bizState.isFranchise = true;

    recordPlayerActivity('تسجيل علامة تجارية', `تحويل مشروع "${biz.name}" إلى علامة تجارية مسجلة (Franchise)`, 'business');
    state.netWorth = calculateNetWorth();
    forceSaveState(true);
    return true;
  }

  function sellFranchise(key) {
    const biz = BUSINESSES[key];
    const bizState = state.businesses[key];
    if (!bizState || !bizState.isFranchise) throw new Error("المشروع ليس علامة تجارية مسجلة للبيع.");

    const sellPayout = Math.floor(biz.cost * 45);
    state.cash += sellPayout;

    // Reset business to level 0 (not owned)
    bizState.level = 0;
    bizState.workers = 0;
    bizState.isFranchise = false;

    recordPlayerActivity('بيع علامة تجارية', `بيع العلامة التجارية "${biz.name}" (استراتيجية خروج) بمبلغ ${sellPayout.toLocaleString()} EGP`, 'business');
    state.netWorth = calculateNetWorth();
    forceSaveState(true);
    return { payout: sellPayout };
  }

  // Hire Workers for Business
  function hireWorker(key) {
    const biz = BUSINESSES[key];
    const bizState = state.businesses[key];
    if (!bizState || bizState.level === 0) throw new Error("يجب شراء المشروع أولاً.");

    // Max workers = 5 per business level
    const maxWorkers = bizState.level * 5;
    if (bizState.workers >= maxWorkers) {
      throw new Error(`الحد الأقصى للعمال هو ${maxWorkers} عامل (5 لكل مستوى). رقّ المشروع لزيادة العدد.`);
    }

    // Worker hiring fee scales with number of existing workers
    const hireCost = Math.floor(biz.cost * 0.15 * (1 + bizState.workers));
    if (state.cash < hireCost) {
      throw new Error(`تكلفة توظيف عامل إضافي هي ${hireCost.toLocaleString()} جنيه. الرصيد غير كافٍ.`);
    }

    state.cash -= hireCost;
    bizState.workers++;

    state.netWorth = calculateNetWorth();
    forceSaveState(true);
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

    // Price capping: Max 10x effective optimum price to keep numbers sensible
    const levelMultiplier = Math.pow(1.12, Math.max(0, (bizState.level || 1) - 1));
    const franchiseOptMultiplier = bizState.isFranchise ? 1.30 : 1.0;
    const effectiveOpt = Math.round(BUSINESSES[key].optimumPrice * levelMultiplier * franchiseOptMultiplier);
    const maxPrice = effectiveOpt * 10;
    if (price > maxPrice) throw new Error(`الحد الأقصى المسموح به للسعر هو ${maxPrice.toLocaleString()} جنيه.`);

    bizState.price = price;
    AppDB.savePlayerState(activeUsername, state);
  }

  // Launch Marketing Campaign (+40% demand boost for 30 ticks = 90 seconds)
  function launchMarketingCampaign(key) {
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
    forceSaveState(true);
    return {
      cost: campaignCost,
      durationSec: 90
    };
  }

  // Deposit Cash to Bank
  function depositToBank(amount) {
    if (amount <= 0) throw new Error("مبلغ الإيداع يجب أن يكون أكبر من صفر.");
    if (state.cash < amount) throw new Error("رصيدك النقدي (الكاش) لا يكفي لإتمام هذا الإيداع.");

    state.cash -= amount;
    state.bank += amount;
    state.netWorth = calculateNetWorth();
    forceSaveState(true);
  }

  // Withdraw Cash from Bank
  function withdrawFromBank(amount) {
    if (amount <= 0) throw new Error("مبلغ السحب يجب أن يكون أكبر من صفر.");
    if (state.bank < amount) throw new Error("رصيدك في حساب البنك لا يكفي لإتمام هذا السحب.");

    state.bank -= amount;
    state.cash += amount;
    state.netWorth = calculateNetWorth();
    forceSaveState(true);
  }

  // Purchase Real Estate/Asset
  function buyAsset(key) {
    const asset = ASSETS[key];
    if (!asset) throw new Error("العقار غير متوفر.");

    if (state.cash < asset.cost) {
      throw new Error(`رصيدك غير كافٍ. تحتاج: ${asset.cost.toLocaleString()} EGP — لديك: ${state.cash.toLocaleString()} EGP`);
    }

    state.cash -= asset.cost;
    state.assets[key] = (state.assets[key] || 0) + 1;

    state.netWorth = calculateNetWorth();
    forceSaveState(true);
    return asset;
  }

  // Sell Real Estate/Asset (Liquidation at 85% of market value)
  function sellAsset(key) {
    const count = state.assets[key] || 0;
    if (count <= 0) throw new Error("لا تمتلك أي عقار من هذا النوع للبيع.");

    const asset = ASSETS[key];
    const sellValue = Math.floor(asset.cost * 0.85); // 15% liquidation loss

    state.assets[key]--;
    state.cash += sellValue;

    state.netWorth = calculateNetWorth();
    forceSaveState(true);
    return sellValue;
  }

  // Buy Stocks (with 3.0% Brokerage Commission, 45s Holding Period, & Max Shares Cap)
  function buyStock(sym, shares) {
    const stock = STOCKS[sym];
    if (!stock) throw new Error("رمز الشركة غير صالح.");
    if (shares <= 0 || !Number.isInteger(shares)) throw new Error("عدد الأسهم يجب أن يكون عدداً صحيحاً موجباً.");

    // Guard: initialize stock slot if missing
    if (!state.stocks[sym]) {
      state.stocks[sym] = { shares: 0, avgPrice: 0 };
    }

    // 1. Max Shares Cap Check
    const currentShares = state.stocks[sym].shares || 0;
    const maxShares = stock.maxShares || 50000;
    if (currentShares + shares > maxShares) {
      const remainingCanBuy = Math.max(0, maxShares - currentShares);
      throw new Error(`تجاوزت الحد الأقصى للملكية في ${stock.name} (${maxShares.toLocaleString()} سهم). المتاح لك شراؤه: ${remainingCanBuy.toLocaleString()} سهم.`);
    }

    const history = stockPrices[sym];
    if (!history || history.length === 0) throw new Error("بيانات السوق غير متوفرة بعد. حاول مجدداً.");
    const currentPrice = history[history.length - 1];
    const grossCost = currentPrice * shares;
    const fee = Math.max(10, Math.floor(grossCost * 0.03)); // 3.0% عمولة سمسرة
    const totalCost = grossCost + fee;

    if (state.cash < totalCost) {
      throw new Error(`رصيدك غير كافٍ. تحتاج: ${totalCost.toLocaleString()} EGP (شامل عمولة السمسرة ${fee.toLocaleString()} EGP) — لديك: ${state.cash.toLocaleString()} EGP`);
    }

    state.cash -= totalCost;

    // Calculate new average purchase price based on gross purchase
    const currentAvg = state.stocks[sym].avgPrice || 0;
    const newShares = currentShares + shares;
    const newAvg = Math.floor(((currentShares * currentAvg) + grossCost) / newShares);

    state.stocks[sym].shares = newShares;
    state.stocks[sym].avgPrice = newAvg;

    // 2. Set 45-second holding cooldown on this stock
    state.stockCooldowns = state.stockCooldowns || {};
    state.stockCooldowns[sym] = Date.now() + 45000;

    recordPlayerActivity('شراء أسهم', `شراء ${shares} سهم (${sym}) بإجمالي ${grossCost.toLocaleString()} ج.م + عمولة ${fee.toLocaleString()} ج.م`, 'stock');
    forceSaveState(true);
    return { shares, price: currentPrice, grossCost, fee, totalCost };
  }

  // Sell Stocks (with 3.0% Brokerage Commission, 10% Capital Gains Tax, & 45s Cooldown Check)
  function sellStock(sym, shares) {
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

    // 1. Enforce 45s holding cooldown
    if (state.stockCooldowns && state.stockCooldowns[sym] && Date.now() < state.stockCooldowns[sym]) {
      const remainingSec = Math.ceil((state.stockCooldowns[sym] - Date.now()) / 1000);
      throw new Error(`لوائح البورصة: يجب الاحتفاظ بالسهم لمدة 45 ثانية بعد الشراء قبل بيعه. متبقي: ${remainingSec} ثانية.`);
    }

    const history = stockPrices[sym];
    if (!history || history.length === 0) throw new Error("بيانات السوق غير متوفرة.");
    const currentPrice = history[history.length - 1];
    const grossReturn = currentPrice * shares;
    const fee = Math.max(10, Math.floor(grossReturn * 0.03)); // 3.0% عمولة سمسرة

    // 2. 10% Capital Gains Tax on net profit
    const avgPrice = state.stocks[sym].avgPrice || 0;
    const costBasis = avgPrice * shares;
    let capitalGainsTax = 0;
    if (grossReturn > costBasis) {
      const profit = grossReturn - costBasis;
      capitalGainsTax = Math.floor(profit * 0.10); // 10% ضريبة أرباح رأسمالية
      state.totalTaxesPaid = (state.totalTaxesPaid || 0) + capitalGainsTax;
    }

    const netReturn = Math.max(0, grossReturn - fee - capitalGainsTax);

    state.stocks[sym].shares -= shares;
    if (state.stocks[sym].shares === 0) {
      state.stocks[sym].avgPrice = 0;
    }
    state.cash += netReturn;

    const logDetails = capitalGainsTax > 0
      ? `بيع ${shares} سهم (${sym}) بصافي ${netReturn.toLocaleString()} ج.م (عمولة سمسرة: ${fee.toLocaleString()} + ضريبة أرباح: ${capitalGainsTax.toLocaleString()} ج.م)`
      : `بيع ${shares} سهم (${sym}) بصافي ${netReturn.toLocaleString()} ج.م (عمولة سمسرة: ${fee.toLocaleString()} ج.م)`;

    recordPlayerActivity('بيع أسهم', logDetails, 'stock');
    forceSaveState(true);
    return { shares, price: currentPrice, grossReturn, fee, capitalGainsTax, totalReturn: netReturn };
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

    // 0. Check reputation requirement
    const repNeeded = deal.repNeeded || 0;
    if ((state.underworldRep || 0) < repNeeded) {
      throw new Error(`تحتاج إلى سمعة لا تقل عن ${repNeeded} نقطة في العالم السفلي للقيام بهذه الصفقة.`);
    }

    // 1. Check Cooldown
    if (state.blackMarketCooldowns && state.blackMarketCooldowns[dealId] > Date.now()) {
      const remainingSec = Math.ceil((state.blackMarketCooldowns[dealId] - Date.now()) / 1000);
      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;
      const timeStr = mins > 0 ? `${mins} دقيقة و ${secs} ثانية` : `${secs} ثانية`;
      throw new Error(`العملية في فترة تهدئة أمنية (كول داون)! يرجى الانتظار ${timeStr}.`);
    }

    // 2. Check Dirty Cash requirement if requireDirtyCost is true
    if (deal.requireDirtyCost && (state.dirtyCash || 0) < deal.cost) {
      throw new Error(`تحتاج لـ ${deal.cost.toLocaleString()} EGP من الأموال المشبوهة (الكاش المتسخ) تحديداً لغسيلها.`);
    }

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

    // Calculate risk & success modifiers
    let successBonus = 0;
    const hasLawyer = Boolean(state.inventory && state.inventory.premium_lawyer > 0);
    const hasJammer = Boolean(state.inventory && state.inventory.radar_jammer > 0);

    if (hasLawyer) {
      successBonus += 0.22; // +22% direct success boost from Lawyer
    }
    if (hasJammer) {
      successBonus += 0.15; // +15% direct success boost from Jammer
    }

    const finalSuccessChance = Math.min(0.92, deal.successChance + successBonus);

    // Prepare Cooldown Timers (Full cooldown for success, Half cooldown for failure)
    const hasCronos = Boolean(state.inventory && state.inventory.cronos_gear > 0);
    const cdMultiplier = hasCronos ? 0.5 : 1.0;
    const fullCdMs = Math.floor((deal.cooldownSec || 120) * cdMultiplier * 1000);
    const halfCdMs = Math.floor(((deal.cooldownSec || 120) / 2) * cdMultiplier * 1000);
    if (!state.blackMarketCooldowns) state.blackMarketCooldowns = {};

    const roll = Math.random();
    if (roll < finalSuccessChance) {
      // SUCCESS: High ROI Payout into DIRTY or CLEAN CASH + Full Cooldown
      if (deal.cleanPayout) {
        state.cash = (state.cash || 0) + deal.payout;
      } else {
        state.dirtyCash = (state.dirtyCash || 0) + deal.payout;
      }
      state.underworldRep = (state.underworldRep || 0) + (deal.repGain || 0);
      state.blackMarketCooldowns[dealId] = Date.now() + fullCdMs;

      const payoutTypeStr = deal.cleanPayout ? 'كاش نظيف' : 'كاش مشبوه';
      recordPlayerActivity('سوق سوداء', `نجاح صفقة "${deal.name}" (+${deal.payout.toLocaleString()} ج.م ${payoutTypeStr})`, 'blackmarket');
      state.netWorth = calculateNetWorth();
      AppDB.savePlayerState(activeUsername, state);
      return {
        success: true,
        payout: deal.payout,
        profit: deal.payout - deal.cost,
        repGain: deal.repGain || 0,
        lawyerAssisted: hasLawyer,
        cooldownSec: Math.floor((deal.cooldownSec || 120) * cdMultiplier),
        finalChancePct: Math.round(finalSuccessChance * 100)
      };
    } else {
      // CAUGHT BY POLICE! Apply Half Cooldown on Failure
      state.blackMarketCooldowns[dealId] = Date.now() + halfCdMs;

      // 1. Lawyer Acquittal: 50% chance the lawyer dismisses charges immediately!
      if (hasLawyer && Math.random() < 0.50) {
        recordPlayerActivity('براءة قضائية', `تدخل المحامي وأثبت براءة اللاعب في صفقة "${deal.name}" دون عقوبة (كول داون مخفض 50%)`, 'blackmarket');
        state.netWorth = calculateNetWorth();
        AppDB.savePlayerState(activeUsername, state);
        return {
          success: false,
          escaped: true,
          acquittedByLawyer: true,
          confiscation: 0,
          jailDuration: 0,
          cooldownSec: Math.floor((deal.cooldownSec || 120) / 2 * cdMultiplier),
          message: 'تدخل المحامي الدولي وأسقط القضية وأثبت براءتك دون سجن أو غرامات! (فترة تهدئة مخفضة للنصف)'
        };
      }

      // 2. Diplomatic Fake Passport Emergency Escape
      if (state.inventory && state.inventory.fake_passport > 0) {
        state.inventory.fake_passport--;
        if (state.itemDurations) delete state.itemDurations.fake_passport;
        recordPlayerActivity('هروب دبلوماسي', `استخدام جواز السفر المزور للهروب من المداهمة في صفقة "${deal.name}" (كول داون مخفض 50%)`, 'blackmarket');
        state.netWorth = calculateNetWorth();
        AppDB.savePlayerState(activeUsername, state);
        return {
          success: false,
          escaped: true,
          confiscation: 0,
          jailDuration: 0,
          cooldownSec: Math.floor((deal.cooldownSec || 120) / 2 * cdMultiplier),
          message: 'تمكنت من الهروب الفوري باستخدام جواز السفر الدبلوماسي المزور! (فترة تهدئة مخفضة للنصف)'
        };
      }

      // 3. Arrest & Confiscation (Diplomatic bag protects 50% of dirty cash)
      const hasDiplomaticBag = Boolean(state.inventory && state.inventory.diplomatic_bag > 0);
      const confiscatedDirty = hasDiplomaticBag ? Math.floor((state.dirtyCash || 0) * 0.5) : (state.dirtyCash || 0);
      const confiscatedClean = Math.floor((state.cash || 0) * 0.15);
      const totalConfiscation = confiscatedDirty + confiscatedClean;

      state.dirtyCash = Math.max(0, (state.dirtyCash || 0) - confiscatedDirty);
      state.cash = Math.max(0, (state.cash || 0) - confiscatedClean);
      state.jailTimer = deal.jailDuration;
      state.heatLevel = Math.min(5, (state.heatLevel || 0) + 1);

      // Apply reputation loss on arrest
      const repLoss = deal.repLoss || Math.floor((deal.repGain || 20) * 1.2);
      state.underworldRep = Math.max(0, (state.underworldRep || 0) - repLoss);

      recordPlayerActivity('مداهمة وسجن', `فشل صفقة "${deal.name}" ومصادرة ${totalConfiscation.toLocaleString()} ج.م وسجن ${deal.jailDuration}ث وفقدان -${repLoss} سمعة (كول داون مخفض 50%)`, 'blackmarket');
      state.netWorth = calculateNetWorth();
      AppDB.savePlayerState(activeUsername, state);
      return {
        success: false,
        escaped: false,
        confiscation: totalConfiscation,
        confiscatedDirty,
        confiscatedClean,
        jailDuration: deal.jailDuration,
        repLoss: repLoss,
        cooldownSec: Math.floor((deal.cooldownSec || 120) / 2 * cdMultiplier)
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

    // Money laundering tax rate: base 35%, drops to 25% with crypto_cleaner (Never less than 25%)
    const hasCryptoCleaner = Boolean(state.inventory && state.inventory.crypto_cleaner > 0);
    const feeRate = hasCryptoCleaner ? 0.25 : 0.35;
    const fee = Math.floor(amount * feeRate);
    const cleanedAmount = amount - fee;

    state.dirtyCash = Math.max(0, state.dirtyCash - amount);
    state.bank = (state.bank || 0) + cleanedAmount;
    state.totalTaxesPaid = (state.totalTaxesPaid || 0) + fee;
    recordPlayerActivity('غسيل أموال', `غسيل ${amount.toLocaleString()} ج.م (ضريبة/عمولة ${Math.round(feeRate * 100)}% = ${fee.toLocaleString()} ج.م) وتحويل صافي ${cleanedAmount.toLocaleString()} ج.م إلى رصيد البنك النظيف`, 'blackmarket');
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return {
      amount,
      fee,
      feeRate: Math.round(feeRate * 100),
      cleanedAmount
    };
  }

  // Resolve active police raid via bribe
  function resolveRaidBribe() {
    if (!state.raidActive) throw new Error("لا توجد مداهمة نشطة حالياً لحلها.");
    const cost = state.raidBribeCost;
    const totalAvailable = (state.cash || 0) + (state.dirtyCash || 0);
    if (totalAvailable < cost) {
      throw new Error(`تكلفة الرشوة والوساطة ${cost.toLocaleString()} ج.م. رصيدك لا يكفي!`);
    }

    // Deduct from dirty cash first, then regular cash
    if ((state.dirtyCash || 0) >= cost) {
      state.dirtyCash -= cost;
    } else {
      const rem = cost - (state.dirtyCash || 0);
      state.dirtyCash = 0;
      state.cash -= rem;
    }

    state.raidActive = false;
    state.heatLevel = 0;
    state.netWorth = calculateNetWorth();
    recordPlayerActivity('دفع رشوة مداهمة', `تم دفع رشوة بقيمة ${cost.toLocaleString()} ج.م لإنهاء المداهمة الأمنية وتصفير الملاحقة.`, 'blackmarket');
    AppDB.savePlayerState(activeUsername, state);
    return { bribeCost: cost };
  }

  // Resolve active police raid via resisting
  function resolveRaidResist() {
    if (!state.raidActive) throw new Error("لا توجد مداهمة نشطة حالياً لحلها.");
    const chance = state.raidEscapeChance / 100;
    const roll = Math.random();
    const success = roll < chance;

    state.raidActive = false;

    if (success) {
      state.heatLevel = Math.max(0, (state.heatLevel || 0) - 1);
      state.netWorth = calculateNetWorth();
      recordPlayerActivity('مقاومة المداهمة', 'نجحت في إخفاء الأدلة والإنكار بنجاح وتفادي المداهمة دون خسائر.', 'blackmarket');
      AppDB.savePlayerState(activeUsername, state);
      return { success: true };
    } else {
      const loss = Math.floor((state.dirtyCash || 0) * 0.5);
      state.dirtyCash = Math.max(0, state.dirtyCash - loss);
      state.jailTimer = 600; // 10 minutes
      state.heatLevel = Math.min(5, (state.heatLevel || 0) + 2);
      state.netWorth = calculateNetWorth();
      recordPlayerActivity('فشل المقاومة (سجن ومصادرة)', `فشلت في المقاومة؛ تم مصادرة ${loss.toLocaleString()} ج.م من الكاش القذر وسجنك لمدة 10 دقائق.`, 'blackmarket');
      AppDB.savePlayerState(activeUsername, state);
      return { success: false, loss };
    }
  }

  // Start Locked Term Investment (With offline timestamp support)
  function startInvestment(planId, amount) {
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
    forceSaveState(true);
    return { plan, amount };
  }

  // Casino Flip Game with Streak Bonus
  function playCoinFlip(betAmount, choice, currentStreak = 0) {
    const MAX_CASINO_BET = 2500000;
    if (betAmount <= 0) throw new Error("مبلغ الرهان يجب أن يكون أكبر من صفر جنيه.");
    if (betAmount > MAX_CASINO_BET) throw new Error(`الحد الأقصى المسموح به للرهان الواحد هو ${MAX_CASINO_BET.toLocaleString()} ج.م.`);
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
      forceSaveState(true);
      return { won: true, side: outcomeSide, multiplier: mult, payout: payout, profit: payout - betAmount };
    } else {
      recordPlayerActivity('رمي العملة', `خسارة رهان الكازينو ${betAmount.toLocaleString()} ج.م`, 'casino');
      state.netWorth = calculateNetWorth();
      forceSaveState(true);
      return { won: false, side: outcomeSide, loss: betAmount };
    }
  }

  // Casino Slots Game with 5 Premium Tier Symbols
  function playSlots(betAmount) {
    const MAX_CASINO_BET = 2500000;
    if (betAmount <= 0) throw new Error("مبلغ الرهان غير صالح.");
    if (betAmount > MAX_CASINO_BET) throw new Error(`الحد الأقصى المسموح به للرهان هو ${MAX_CASINO_BET.toLocaleString()} ج.م.`);
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
    forceSaveState(true);

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
    const MAX_CASINO_BET = 2500000;
    if (betAmount <= 0) throw new Error("مبلغ الرهان غير صالح.");
    if (betAmount > MAX_CASINO_BET) throw new Error(`الحد الأقصى المسموح به لرهان النرد هو ${MAX_CASINO_BET.toLocaleString()} ج.م.`);
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
    forceSaveState(true);

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
    const job = JOBS[state.jobId] || JOBS.worker;
    const isEnergyActive = (state.inventory && state.inventory.energy_drink > 0);
    const isPenActive = (state.inventory && state.inventory.gold_pen > 0);

    const xpBonus = isPenActive ? (1 + (STORE_ITEMS.gold_pen ? STORE_ITEMS.gold_pen.value : 0.5)) : 1.0;
    const energyMult = isEnergyActive ? (STORE_ITEMS.energy_drink ? STORE_ITEMS.energy_drink.value : 2.0) : 1.0;

    // Overtime gives 2.5x base salary and 3x XP
    const boost = window.serverBoostMultiplier || 1.0;
    const earnedSalary = Math.floor(job.salary * 2.5 * energyMult * boost);
    const earnedXp = Math.ceil(job.xpReward * 3 * xpBonus * boost);

    state.bank += earnedSalary;
    state.xp += earnedXp;
    state.netWorth = calculateNetWorth();
    state.title = getAppropriateTitle(state.netWorth, state.xp);
    forceSaveState(true);

    return {
      earnedSalary,
      earnedXp,
      jobTitle: job.name,
      newTitle: state.title,
      isEnergyBoosted: isEnergyActive,
      isPenBoosted: isPenActive
    };
  }

  // --- Cars Actions (New V2) ---
  function buyCar(carId) {
    const car = CAR_TEMPLATES[carId];
    if (!car) throw new Error("طراز السيارة المحدد غير متوفر.");
    if (state.cash < car.cost && state.bank < car.cost) {
      throw new Error("لا تملك سيولة كافية لشراء هذه السيارة الفاخرة.");
    }

    if (state.cash >= car.cost) {
      state.cash -= car.cost;
    } else {
      state.bank -= car.cost;
    }

    if (!state.ownedCars) state.ownedCars = [];
    state.ownedCars.push({ id: carId, rentStatus: 'idle' });

    recordPlayerActivity('شراء سيارة 🏎️', `شراء سيارة ${car.name} بقيمة ${car.cost.toLocaleString()} ج.م.`, 'assets');
    state.netWorth = calculateNetWorth();
    forceSaveState(true);
  }

  function setActiveCar(carId) {
    if (carId === null) {
      state.activeCar = null;
      recordPlayerActivity('تفعيل سيارة', 'تم إلغاء تفعيل السيارة الشخصية النشطة.', 'assets');
    } else {
      const idx = state.ownedCars.findIndex(c => c.id === carId);
      if (idx === -1) throw new Error("لا تملك هذه السيارة لتفعيلها.");
      
      if (state.ownedCars[idx].rentStatus === 'rented') {
        throw new Error("السيارة مؤجرة حالياً! لا يمكنك قيادتها.");
      }

      state.activeCar = carId;
      recordPlayerActivity('تفعيل سيارة 🏎️', `تم تفعيل ${CAR_TEMPLATES[carId].name} كسيارة شخصية نشطة.`, 'assets');
    }
    state.netWorth = calculateNetWorth();
    forceSaveState(true);
  }

  function rentCar(carId, rentStatus, carIndex = -1) {
    let idx = carIndex;
    if (idx === -1) {
      idx = state.ownedCars.findIndex(c => c.id === carId);
    }
    if (idx === -1 || idx >= state.ownedCars.length) throw new Error("لا تملك هذه السيارة لتأجيرها.");

    if (rentStatus === 'rented') {
      if (state.activeCar === carId) {
        state.activeCar = null;
      }
      state.ownedCars[idx].rentStatus = 'rented';
      recordPlayerActivity('تأجير سيارة 📈', `بدء تأجير سيارة ${CAR_TEMPLATES[carId].name} لتحقيق دخل سلبي.`, 'assets');
    } else {
      state.ownedCars[idx].rentStatus = 'idle';
      recordPlayerActivity('إلغاء تأجير سيارة 📉', `إيقاف تأجير سيارة ${CAR_TEMPLATES[carId].name} وإرجاعها للمرأب.`, 'assets');
    }
    state.netWorth = calculateNetWorth();
    forceSaveState(true);
  }

  function sellCar(carId, carIndex = -1) {
    let idx = carIndex;
    if (idx === -1) {
      idx = state.ownedCars.findIndex(c => c.id === carId);
    }
    if (idx === -1 || idx >= state.ownedCars.length) throw new Error("لا تملك هذه السيارة لبيعها.");

    const car = CAR_TEMPLATES[carId];
    if (state.ownedCars[idx].rentStatus === 'rented') {
      throw new Error("السيارة مؤجرة! يجب إلغاء تأجيرها أولاً قبل البيع.");
    }

    if (state.activeCar === carId) {
      state.activeCar = null;
    }

    const sellPrice = Math.floor(car.cost * 0.75);
    state.ownedCars.splice(idx, 1);
    state.bank += sellPrice;

    recordPlayerActivity('بيع سيارة 💰', `بيع سيارة ${car.name} واسترداد ${sellPrice.toLocaleString()} EGP.`, 'assets');
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
  }

  // --- Smuggling Actions (New V2) ---
  function buySmugglingVehicle(vehicleId) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون!");
    const v = SMUGGLING_VEHICLES[vehicleId];
    if (!v) throw new Error("مركبة غير صالحة.");
    
    if (state.cash < v.cost && state.bank < v.cost) {
      throw new Error("لا تملك أموالاً كافية لشراء مركبة التهريب هذه.");
    }

    if (state.cash >= v.cost) {
      state.cash -= v.cost;
    } else {
      state.bank -= v.cost;
    }

    if (!state.smugglingFleet) state.smugglingFleet = { speedboat: 0, plane: 0, ship: 0 };
    state.smugglingFleet[vehicleId] = (state.smugglingFleet[vehicleId] || 0) + 1;

    recordPlayerActivity('شراء مركبة تهريب 🚤', `شراء ${v.name} وتضمينها للأسطول بقيمة ${v.cost.toLocaleString()} ج.م.`, 'dark');
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
  }

  function startSmugglingJob(routeId, vehicleType) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يمكنك تهريب الشحنات.");
    const route = SMUGGLING_ROUTES[routeId];
    if (!route) throw new Error("طريق تهريب غير معروف.");
    if (!route.requiredVehicles.includes(vehicleType)) {
      throw new Error("هذه المركبة غير صالحة لهذا الطريق الجمركي.");
    }

    if (!state.smugglingFleet || !state.smugglingFleet[vehicleType] || state.smugglingFleet[vehicleType] <= 0) {
      throw new Error(`لا تملك أي ${SMUGGLING_VEHICLES[vehicleType].name} جاهزة للاستخدام في أسطولك.`);
    }

    let busyVehicles = 0;
    if (state.activeSmugglingJobs) {
      state.activeSmugglingJobs.forEach(job => {
        if (job.vehicleType === vehicleType) busyVehicles++;
      });
    }

    if (busyVehicles >= state.smugglingFleet[vehicleType]) {
      throw new Error(`جميع الـ ${SMUGGLING_VEHICLES[vehicleType].name} في أسطولك مشغولة حالياً بشحنات أخرى.`);
    }

    const job = {
      id: 'smug_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      routeId: routeId,
      vehicleType: vehicleType,
      endTime: Date.now() + (route.durationTicks * 1000)
    };

    if (!state.activeSmugglingJobs) state.activeSmugglingJobs = [];
    state.activeSmugglingJobs.push(job);

    recordPlayerActivity('بدء تهريب 🚢', `شحن شحنة تهريب إلى "${route.name}" عبر ${SMUGGLING_VEHICLES[vehicleType].name}.`, 'dark');
    AppDB.savePlayerState(activeUsername, state);
  }

  // Bank Loan: Take instant liquidity loan (up to 35% of Net Worth)
  function takeBankLoan(amount) {
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
    const MAX_ROULETTE_BET = 2500000;
    if (betAmount <= 0) throw new Error("مبلغ الرهان يجب أن يكون أكبر من صفر.");
    if (betAmount > MAX_ROULETTE_BET) throw new Error(`الحد الأقصى المسموح به للرهان في الروليت هو ${MAX_ROULETTE_BET.toLocaleString()} ج.م.`);
    if (state.cash < betAmount) throw new Error("رصيدك النقدي لا يكفي لهذا الرهان.");

    state.cash -= betAmount;

    // Roulette wheel number: 0 to 36
    const rolledNumber = Math.floor(Math.random() * 37);
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
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
    forceSaveState(true);

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
      if (state[k] > Number.MAX_SAFE_INTEGER) {
        state[k] = Number.MAX_SAFE_INTEGER;
      }
    });
  }

  function forceSaveState(immediate = true) {
    sanitizeGameState();
    state.lastActiveTimestamp = Date.now();
    state.netWorth = calculateNetWorth();
    state.title = getAppropriateTitle(state.netWorth, state.xp);
    return AppDB.savePlayerState(activeUsername, state, immediate);
  }

  return {
    get state() { return state; },
    set state(val) { state = val; },
    get stockPrices() { return stockPrices; },
    get activeUsername() { return activeUsername; },

    JOBS,
    BUSINESSES,
    ASSETS,
    STOCKS,
    CORP_PROJECTS,
    INVESTMENTS,
    STORE_ITEMS,
    BLACK_MARKET,
    BLACK_MARKET_GEAR,

    loadUserSession,
    syncItemsConfig,
    logoutUser,
    processTick,
    performJobShift,
    performOvertimeShift,
    promoteJob,
    purchaseBusiness,
    upgradeBusiness,
    convertToFranchise,
    sellFranchise,
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
    resolveRaidBribe,
    resolveRaidResist,
    playCoinFlip,
    playSlots,
    playDice,
    playRoulette,
    calculateTaxReport,
    setTaxConfig,
    getTaxConfig: () => taxConfig,
    fileTaxDeclaration,
    calculatePassiveIncomePerTick,
    calculatePassiveIncomePerSecond,
    calculateSingleBusinessProfit,
    calculateCorpTickProfit,
    calculateBankInterestPerTick,
    getDetailedCashflowBreakdown,
    calculateNetWorth,
    renewAfkManager,
    forceSaveState,
    
    // New V2: Cars and Smuggling Exports
    CAR_TEMPLATES,
    SMUGGLING_VEHICLES,
    SMUGGLING_ROUTES,
    buyCar,
    setActiveCar,
    rentCar,
    sellCar,
    buySmugglingVehicle,
    startSmugglingJob,

    // Unified Stock Market Methods
    setGlobalMarketEvent,
    getCurrentMarketTicker,
    getCurrentMarketEvent,
    syncUnifiedStocks
  };
})();

// Export globally
window.GameEngine = GameEngine;
