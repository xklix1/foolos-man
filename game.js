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
    kiosk: {
      id: 'kiosk',
      name: 'كشك حلوى وجرائد ومشروبات 🍬',
      cost: 1500,
      baseDemand: 15,
      optimumPrice: 15,
      costOfGoods: 9,
      maxWorkers: 5,
      workerMultiplier: 1.04,
      workerWage: 12
    },
    coffee: {
      id: 'coffee',
      name: 'عربة قهوة ومأكولات خفيفة ☕',
      cost: 6800,
      baseDemand: 22,
      optimumPrice: 28,
      costOfGoods: 16,
      maxWorkers: 8,
      workerMultiplier: 1.04,
      workerWage: 25
    },
    tech: {
      id: 'tech',
      name: 'شركة برمجيات وتطبيقات 💻',
      cost: 140000,
      baseDemand: 25,
      optimumPrice: 160,
      costOfGoods: 85,
      maxWorkers: 20,
      workerMultiplier: 1.04,
      workerWage: 120
    },
    logistics: {
      id: 'logistics',
      name: 'مجمع خدمات لوجستية وشحن 🚚',
      cost: 780000,
      baseDemand: 28,
      optimumPrice: 420,
      costOfGoods: 220,
      maxWorkers: 35,
      workerMultiplier: 1.04,
      workerWage: 340
    },
    supermarket: {
      id: 'supermarket',
      name: 'سلسلة سوبرماركت وتجزئة 🛒',
      cost: 3200000,
      baseDemand: 32,
      optimumPrice: 780,
      costOfGoods: 410,
      maxWorkers: 50,
      workerMultiplier: 1.04,
      workerWage: 750
    },
    solar_factory: {
      id: 'solar_factory',
      name: 'مصنع ألواح الطاقة الشمسية ☀️',
      cost: 14000000,
      baseDemand: 30,
      optimumPrice: 1800,
      costOfGoods: 950,
      maxWorkers: 65,
      workerMultiplier: 1.04,
      workerWage: 1800
    },
    private_hospital: {
      id: 'private_hospital',
      name: 'مستشفى ومجمع طبي تخصصي 🏥',
      cost: 55000000,
      baseDemand: 26,
      optimumPrice: 4500,
      costOfGoods: 2400,
      maxWorkers: 75,
      workerMultiplier: 1.04,
      workerWage: 4200
    },
    media_studio: {
      id: 'media_studio',
      name: 'مؤسسة إنتاج إعلامي وسينمائي 🎬',
      cost: 160000000,
      baseDemand: 24,
      optimumPrice: 11000,
      costOfGoods: 5800,
      maxWorkers: 80,
      workerMultiplier: 1.04,
      workerWage: 9500
    },
    private_bank: {
      id: 'private_bank',
      name: 'بنك استثماري وشركة وساطة مالية 🏛️',
      cost: 520000000,
      baseDemand: 22,
      optimumPrice: 28000,
      costOfGoods: 14500,
      maxWorkers: 90,
      workerMultiplier: 1.04,
      workerWage: 24000
    },
    oil_refinery: {
      id: 'oil_refinery',
      name: 'مجمع مصافي البترول والطاقة 🛢️',
      cost: 1600000000,
      baseDemand: 20,
      optimumPrice: 65000,
      costOfGoods: 34000,
      maxWorkers: 100,
      workerMultiplier: 1.04,
      workerWage: 60000
    },
    space_tech: {
      id: 'space_tech',
      name: 'مؤسسة استكشاف الفضاء والأقمار الصناعية 🚀',
      cost: 4800000000,
      baseDemand: 16,
      optimumPrice: 180000,
      costOfGoods: 92000,
      maxWorkers: 120,
      workerMultiplier: 1.04,
      workerWage: 150000
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
      cost: 20000,
      desc: 'يزيد خبرتك الوظيفية XP بنسبة +8% لتسريع الترقيات. ينتهي مفعوله بعد 3 دقائق.',
      effect: 'xp_boost',
      value: 0.08,
      durationTicks: 180, // 3 minutes
      cooldownSec: 600,   // 10 minutes cooldown
      maxDailyUses: 4     // max 4 times per 24 hours
    },
    premium_lawyer: {
      id: 'premium_lawyer',
      name: 'توكيل محامٍ دولي قدير',
      cost: 100000,
      desc: 'يخفض خطورة القبض في صفقات السوق المحظورة بنسبة -6% لمدة 5 دقائق.',
      effect: 'legal_protection',
      value: 0.06,
      durationTicks: 300,  // 5 minutes
      cooldownSec: 900,    // 15 minutes cooldown
      maxDailyUses: 3     // max 3 times per 24 hours
    },
    energy_drink: {
      id: 'energy_drink',
      name: 'مشروب الطاقة والتركيز الفائق',
      cost: 25000,
      desc: 'يمنحك نشاطاً ويزيد راتب نوبات العمل بنسبة +12.5% لمدة 90 ثانية.',
      effect: 'salary_multiplier',
      value: 1.125,
      durationTicks: 90,  // 90 seconds
      cooldownSec: 480,   // 8 minutes cooldown
      maxDailyUses: 5     // max 5 times per 24 hours
    },
    tax_shield: {
      id: 'tax_shield',
      name: 'درع الإعفاء والملاذ الضريبي',
      cost: 600000,
      desc: 'يمنحك خصماً قدره 4% على ترقيات الشركات ويخفض ضريبة الثروة بنسبة 12.5% لمدة 6 ساعات.',
      effect: 'upgrade_discount',
      value: 0.04,
      durationTicks: 7200,  // 6 hours (in ticks)
      cooldownSec: 86400,   // 24 hours cooldown
      maxDailyUses: 1      // max 1 time per 24 hours
    },
    market_scanner: {
      id: 'market_scanner',
      name: 'ماسح البورصة والتداول الذكي',
      cost: 200000,
      desc: 'يخفف أثر الهبوط والتصحيحات العكسية لأسهمك بنسبة 10% لمدة 4 دقائق.',
      effect: 'stock_shield',
      value: 0.10,
      durationTicks: 240,  // 4 minutes
      cooldownSec: 1200,   // 20 minutes cooldown
      maxDailyUses: 3     // max 3 times per 24 hours
    },
    vip_casino_pass: {
      id: 'vip_casino_pass',
      name: 'بطاقة VIP لكازينو الحظ',
      cost: 80000,
      desc: 'تمنحك بونص مالي إضافي بنسبة +20% على أرباح الكازينو وعجلة الحظ، مع استرداد تعادل البلاك جاك. صالحة لمدة 5 دقائق.',
      effect: 'casino_luck_boost',
      value: 0.20,
      durationTicks: 100,  // ~5 minutes
      cooldownSec: 900,    // 15 minutes cooldown
      maxDailyUses: 3     // max 3 times per 24 hours
    },
    quantum_cpu: {
      id: 'quantum_cpu',
      name: 'معالج الحوسبة الكمومية (Quantum Core)',
      cost: 500000,
      desc: 'يرفع أرباح وتدفقات كافة مشاريعك بنسبة +12.5% لمدة 4 دقائق.',
      effect: 'biz_multiplier',
      value: 1.125,
      durationTicks: 240,  // 4 minutes
      cooldownSec: 1800,   // 30 minutes cooldown
      maxDailyUses: 3     // max 3 times per 24 hours
    },
    diamond_card: {
      id: 'diamond_card',
      name: 'عضوية النادي الماسي للبنوك الدولية',
      cost: 1200000,
      desc: 'ترفع فوائد الودائع البنكية بنسبة 10% وتخفض ضرائب الثروة بنسبة 12.5% لمدة 8 دقائق.',
      effect: 'bank_perk',
      value: 0.10,
      durationTicks: 480,  // 8 minutes
      cooldownSec: 7200,   // 2 hours cooldown
      maxDailyUses: 2     // max 2 times per 24 hours
    },
    cronos_gear: {
      id: 'cronos_gear',
      name: 'ساعة الكرونوس لتسريع العمليات',
      cost: 350000,
      desc: 'تقلل وقت التبريد (Cooldown) للعمليات وفترات نوبات العمل بنسبة 15% لمدة 5 دقائق.',
      effect: 'cooldown_reduction',
      value: 0.15,
      durationTicks: 300,  // 5 minutes
      cooldownSec: 1200,   // 20 minutes cooldown
      maxDailyUses: 3     // max 3 times per 24 hours
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
      payout: 1500000,
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
      payout: 5000000,
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
      payout: 25000000,
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
      payout: 180000000,
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
      payout: 100000000,
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
      payout: 1000000000,
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
      payout: 500000000,
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
      payout: 3000000000,
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
      desc: 'يقلل احتمالية المداهمة الأمنية في صفقات السوق السوداء بنسبة 6% لمدة 4 دقائق.',
      cost: 80000,
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
      desc: 'يخفض ضريبة غسيل وتبييض الأموال إلى 40% بدلاً من 45%.',
      cost: 200000,
      icon: 'fa-shield-virus',
      durationTicks: 200
    },
    diplomatic_bag: {
      id: 'diplomatic_bag',
      name: 'حقيبة التشفير الدبلوماسية المصفحة',
      desc: 'تحمي 18% من الأموال المشبوهة من المصادرة في حال المداهمة.',
      cost: 800000,
      icon: 'fa-briefcase',
      durationTicks: 240
    },
    commissioner_wire: {
      id: 'commissioner_wire',
      name: 'شريحة اتصال كبار المسؤولين (VIP Wire)',
      desc: 'تخفض تكلفة الرشوة وإسقاط الملاحقات الأمنية بنسبة 18%.',
      cost: 1000000,
      icon: 'fa-mobile-retro',
      durationTicks: 300
    }
  };

  // --- شركة الاستيراد والتصدير الدولية (Import & Export Global Fleet) ---
  const TRADE_COMMODITIES = {
    fashion_brands: {
      id: 'fashion_brands',
      name: 'أزياء وملابس ماركات عالمية',
      tier: 'air_cargo',
      tierName: 'شحن جوي سريع (Express Air Cargo)',
      unitCost: 5000,
      importDurationSec: 2700, // 45 minutes
      exportDurationSec: 2700, // 45 minutes
      baseSellMin: 5900,       // +18%
      baseSellMax: 6250,       // +25%
      icon: 'fa-shirt',
      color: 'sky'
    },
    espresso_coffee: {
      id: 'espresso_coffee',
      name: 'بن إسبريسو كولومبي فاخر',
      tier: 'air_cargo',
      tierName: 'شحن جوي سريع (Express Air Cargo)',
      unitCost: 8000,
      importDurationSec: 4500, // 75 minutes
      exportDurationSec: 4500, // 75 minutes
      baseSellMin: 9500,       // +18.75%
      baseSellMax: 10200,      // +27.5%
      icon: 'fa-mug-hot',
      color: 'amber'
    },
    auto_spare_parts: {
      id: 'auto_spare_parts',
      name: 'قطع غيار سيارات أوروبية أصلية',
      tier: 'regional_freight',
      tierName: 'شحن إقليمي بحري/بري (Regional Freight)',
      unitCost: 25000,
      importDurationSec: 10800, // 3 hours
      exportDurationSec: 10800, // 3 hours
      baseSellMin: 29500,      // +18%
      baseSellMax: 32000,      // +28%
      icon: 'fa-gears',
      color: 'indigo'
    },
    solar_panels: {
      id: 'solar_panels',
      name: 'ألواح وخلايا طاقة شمسية ألمانية',
      tier: 'regional_freight',
      tierName: 'شحن إقليمي بحري/بري (Regional Freight)',
      unitCost: 50000,
      importDurationSec: 18000, // 5 hours
      exportDurationSec: 18000, // 5 hours
      baseSellMin: 60000,      // +20%
      baseSellMax: 65000,      // +30%
      icon: 'fa-solar-panel',
      color: 'emerald'
    },
    luxury_cars: {
      id: 'luxury_cars',
      name: 'سيارات فارهة ومدرعة مستوردة',
      tier: 'ocean_shipping',
      tierName: 'شحن بحري عالمي بالحاويات (Global Ocean Shipping)',
      unitCost: 120000,
      importDurationSec: 28800, // 8 hours
      exportDurationSec: 28800, // 8 hours
      baseSellMin: 145000,     // +20.8%
      baseSellMax: 156000,     // +30%
      icon: 'fa-car-side',
      color: 'violet'
    },
    industrial_turbines: {
      id: 'industrial_turbines',
      name: 'توربينات وخطوط إنتاج صناعية ثقيلة',
      tier: 'ocean_shipping',
      tierName: 'شحن بحري عالمي بالحاويات (Global Ocean Shipping)',
      unitCost: 250000,
      importDurationSec: 43200, // 12 hours
      exportDurationSec: 43200, // 12 hours
      baseSellMin: 305000,     // +22%
      baseSellMax: 335000,     // +34%
      icon: 'fa-industry',
      color: 'rose'
    },
    ai_quantum_chips: {
      id: 'ai_quantum_chips',
      name: 'رقائق ومعالجات ذكاء اصطناعي سيليكونية',
      tier: 'mega_oceanic',
      tierName: 'سفن عابرة للمحيطات ضخمة (Mega Trans-Oceanic)',
      unitCost: 500000,
      importDurationSec: 64800, // 18 hours
      exportDurationSec: 64800, // 18 hours
      baseSellMin: 610000,     // +22%
      baseSellMax: 670000,     // +34%
      icon: 'fa-microchip',
      color: 'cyan'
    },
    gold_bullion_bars: {
      id: 'gold_bullion_bars',
      name: 'سبائك ذهب ومعادن نادرة نقية',
      tier: 'mega_oceanic',
      tierName: 'سفن عابرة للمحيطات ضخمة (Mega Trans-Oceanic)',
      unitCost: 1000000,
      importDurationSec: 86400, // 24 hours
      exportDurationSec: 86400, // 24 hours
      baseSellMin: 1220000,    // +22%
      baseSellMax: 1350000,    // +35%
      icon: 'fa-cubes-stacked',
      color: 'yellow'
    }
  };

  const TRADE_BUYERS = [
    { id: 'dubai_retail_group', name: 'مجموعة تجزئة دبي القابضة', flag: '🇦🇪', region: 'الخليج العربي', demands: ['fashion_brands', 'espresso_coffee'], priceMult: 1.05 },
    { id: 'berlin_energy_consortium', name: 'كونسورتيوم برلين للطاقة المتجددة', flag: '🇩🇪', region: 'الاتحاد الأوروبي', demands: ['solar_panels', 'industrial_turbines'], priceMult: 1.08 },
    { id: 'tokyo_tech_giants', name: 'تكتل شركات التكنولوجيا بطوكيو', flag: '🇯🇵', region: 'شرق آسيا', demands: ['ai_quantum_chips', 'auto_spare_parts'], priceMult: 1.08 },
    { id: 'london_bullion_vault', name: 'خزائن وبنك لندن للمعادن', flag: '🇬🇧', region: 'المملكة المتحدة', demands: ['gold_bullion_bars', 'luxury_cars'], priceMult: 1.07 },
    { id: 'singapore_logistics_hub', name: 'مؤسسة التجارة الحرة بسنغافورة', flag: '🇸🇬', region: 'جنوب شرق آسيا', demands: ['auto_spare_parts', 'fashion_brands', 'espresso_coffee'], priceMult: 1.06 },
    { id: 'cairo_sovereign_procurement', name: 'الهيئة العامة للتوريدات والمشروعات', flag: '🇪🇬', region: 'شمال أفريقيا', demands: ['solar_panels', 'luxury_cars', 'industrial_turbines'], priceMult: 1.05 },
    { id: 'zurich_private_clients', name: 'نخبة عملاء المصارف الخاصة بزيورخ', flag: '🇨🇭', region: 'سويسرا', demands: ['gold_bullion_bars', 'ai_quantum_chips'], priceMult: 1.09 }
  ];

  // --- مجمع الصناعات وسلاسل الإمداد (Industrial Supply Chain Empire) ---
  const INDUSTRIAL_SECTORS = {
    food: {
      id: 'food',
      shortName: 'الصناعات الغذائية',
      name: 'الصناعات الغذائية وسلاسل الإمداد الزراعي 🌾',
      desc: 'سلسلة تبدأ من استصلاح المزارع والبساتين ثم وحدات المعالجة والمطاحن وصولاً للتعبئة وأسطول النقل المبرد.',
      icon: 'fa-solid fa-wheat-awn',
      color: 'emerald',
      unlockCost: 1500000,
      unlockNetWorth: 3000000,
      stages: {
        stage1: { id: 'stage1', name: 'المزارع والبساتين (المادة الخام)', baseCost: 120000, icon: 'fa-solid fa-wheat-awn', desc: 'إنتاج القمح والفاكهة والبن الخام' },
        stage2: { id: 'stage2', name: 'المطاحن ووحدات التجفيف والمعالجة', baseCost: 350000, icon: 'fa-solid fa-mortar-pestle', desc: 'طحن ومعالجة وتنقية المحاصيل' },
        stage3: { id: 'stage3', name: 'مجمع التعبئة والصناعات الغذائية', baseCost: 950000, icon: 'fa-solid fa-boxes-packing', desc: 'خطوط إنتاج وتعليب السلع الجاهزة' },
        logistics: { id: 'logistics', name: 'أسطول شاحنات التوزيع المبردة', baseCost: 450000, icon: 'fa-solid fa-truck-fast', desc: 'تسريع دورة التوزيع وتوسيع صوامع التخزين' }
      },
      product: { name: 'سلع تموينية وغذائية فاخرة', baseValue: 35, icon: 'fa-solid fa-box', tradeCommodityId: 'espresso_coffee', unitsPerContainer: 20 }
    },
    auto: {
      id: 'auto',
      shortName: 'صناعة السيارات',
      name: 'تجميع وتصنيع السيارات والمركبات 🚗',
      desc: 'سلسلة تعدين الحديد واستخراج المطاط الطبيعي وصولاً لمصانع المحركات والتجميع الآلي وناقلات السيارات.',
      icon: 'fa-solid fa-car-side',
      color: 'amber',
      unlockCost: 15000000,
      unlockNetWorth: 30000000,
      stages: {
        stage1: { id: 'stage1', name: 'مناجم الحديد ومزارع المطاط الطبيعي', baseCost: 1200000, icon: 'fa-solid fa-cubes', desc: 'توفير خامات الصلب والبوليمرات' },
        stage2: { id: 'stage2', name: 'مسابك المحركات ومكابس الهياكل', baseCost: 3500000, icon: 'fa-solid fa-gears', desc: 'سباكة الشاسيهات وتصنيع المحركات' },
        stage3: { id: 'stage3', name: 'خط التجميع الروبوتي الذكي للسيارات', baseCost: 9500000, icon: 'fa-solid fa-robot', desc: 'تركيب الأنظمة الإلكترونية والتشطيب' },
        logistics: { id: 'logistics', name: 'أسطول ناقلات السيارات العملاقة', baseCost: 4200000, icon: 'fa-solid fa-truck-moving', desc: 'شحن أساطيل السيارات وتوسيع ساحات التخزين' }
      },
      product: { name: 'سيارات سيدان وتجارية حديثة', baseValue: 220, icon: 'fa-solid fa-car', tradeCommodityId: 'auto_spare_parts', unitsPerContainer: 8 }
    },
    semiconductor: {
      id: 'semiconductor',
      shortName: 'أشباه الموصلات',
      name: 'الرقائق وأشباه الموصلات وسيرفرات AI 💻',
      desc: 'استخلاص رمال السيليكون فائق النقاوة وتصنيع الدوائر الليزرية وطباعة معالجات ومسارعات الذكاء الاصطناعي.',
      icon: 'fa-solid fa-microchip',
      color: 'cyan',
      unlockCost: 80000000,
      unlockNetWorth: 150000000,
      stages: {
        stage1: { id: 'stage1', name: 'مناجم السيليكون النقي والمعادن النادرة', baseCost: 8500000, icon: 'fa-solid fa-gem', desc: 'تنقية رمال السيليكون إلى نقاوة 99.999%' },
        stage2: { id: 'stage2', name: 'غرف الطباعة الليزرية الفائقة (Cleanrooms)', baseCost: 24000000, icon: 'fa-solid fa-atom', desc: 'طباعة الدوائر والنانوميتر بدقة فائقة' },
        stage3: { id: 'stage3', name: 'مجمع تصنيع معالجات وسيرفرات AI', baseCost: 65000000, icon: 'fa-solid fa-server', desc: 'تجميع وتغليف وحدات المعالجة الفائقة' },
        logistics: { id: 'logistics', name: 'طيران الشحن الدبلوماسي فائق الأمان', baseCost: 28000000, icon: 'fa-solid fa-plane-departure', desc: 'نقل سريع ومؤمن وتوسيع مستودعات الكوانتم' }
      },
      product: { name: 'معالجات كوانتم وسيرفرات ذكاء اصطناعي', baseValue: 950, icon: 'fa-solid fa-microchip', tradeCommodityId: 'ai_quantum_chips', unitsPerContainer: 18 }
    },
    petrochemical: {
      id: 'petrochemical',
      shortName: 'البتروكيماويات',
      name: 'الطاقة ومجمعات البتروكيماويات والبلمرة 🛢️',
      desc: 'حفر آبار النفط والغاز، التكرير المتطور، مجمعات البلمرة لإنتاج البوليمرات الاستراتيجية ووقود الطائرات النفاثة.',
      icon: 'fa-solid fa-oil-well',
      color: 'orange',
      unlockCost: 350000000,
      unlockNetWorth: 600000000,
      stages: {
        stage1: { id: 'stage1', name: 'منصات الحفر وحقول استخراج الخام', baseCost: 45000000, icon: 'fa-solid fa-oil-well', desc: 'ضخ النفط والغاز الطبيعي من الأعماق' },
        stage2: { id: 'stage2', name: 'مصافي التقطير والتكسير الحراري', baseCost: 120000000, icon: 'fa-solid fa-fire-burner', desc: 'فصل المشتقات البترولية عالية الجودة' },
        stage3: { id: 'stage3', name: 'مجمع صناعات البلمرة والبوليمرات', baseCost: 320000000, icon: 'fa-solid fa-flask-vial', desc: 'تحويل المشتقات إلى بوليمرات ووقود نفاث' },
        logistics: { id: 'logistics', name: 'خطوط الأنابيب وشبكات الناقلات البترولية', baseCost: 140000000, icon: 'fa-solid fa-ship', desc: 'ضخ المنتجات وتوسيع صهاريج التخزين الاستراتيجي' }
      },
      product: { name: 'بوليمرات ووقود طائرات عالي النقاوة', baseValue: 2800, icon: 'fa-solid fa-gas-pump', tradeCommodityId: 'industrial_turbines', unitsPerContainer: 3 }
    },
    aerospace: {
      id: 'aerospace',
      shortName: 'صناعات الفضاء',
      name: 'الصناعات الفضائية والملاحة الجوية 🚀',
      desc: 'سبائك التيتانيوم والكربون، مصانع المحركات النفاثة والهيدروجينية، أحواض تجميع الصواريخ والمكوك والأقمار.',
      icon: 'fa-solid fa-rocket',
      color: 'purple',
      unlockCost: 1500000000,
      unlockNetWorth: 3000000000,
      stages: {
        stage1: { id: 'stage1', name: 'معامل سبائك التيتانيوم وألياف الكربون', baseCost: 200000000, icon: 'fa-solid fa-shield-halved', desc: 'تجهيز مواد متقدمة تتحمل الضغط والحرارة' },
        stage2: { id: 'stage2', name: 'مصانع محركات الدفع النفاث والهيدروجين', baseCost: 550000000, icon: 'fa-solid fa-jet-fighter', desc: 'تصنيع توربينات الاحتراق والدفع الصاروخي' },
        stage3: { id: 'stage3', name: 'حوض تجميع الصواريخ والمكوك والأقمار', baseCost: 1400000000, icon: 'fa-solid fa-satellite', desc: 'تجميع المركبات الفضائية وأنظمة التوجيه' },
        logistics: { id: 'logistics', name: 'منصات الإطلاق وشبكة التوجيه المداري', baseCost: 650000000, icon: 'fa-solid fa-satellite-dish', desc: 'إطلاق وتوجيه وتوسيع هناجر الصواريخ' }
      },
      product: { name: 'مركبات فضائية ومحطات مدارية سيادية', baseValue: 8500, icon: 'fa-solid fa-rocket', tradeCommodityId: 'gold_bullion_bars', unitsPerContainer: 1 }
    }
  };

  // --- Initial Default Player State ---
  const INITIAL_STATE = {
    cash: 300,
    bank: 100,
    dirtyCash: 0,
    dailyCasinoNetProfit: 0,
    dailyCasinoResetAt: 0,
    xp: 0,
    underworldRep: 0,
    heatLevel: 0,
    jobId: 'worker',
    businesses: {
      kiosk: { level: 0, price: 15, workers: 0, suppliesTicks: 0 },
      coffee: { level: 0, price: 22, workers: 0, suppliesTicks: 0 },
      tech: { level: 0, price: 160, workers: 0, suppliesTicks: 0 },
      logistics: { level: 0, price: 1100, workers: 0, suppliesTicks: 0 },
      supermarket: { level: 0, price: 450, workers: 0, suppliesTicks: 0 },
      solar_factory: { level: 0, price: 3200, workers: 0, suppliesTicks: 0 },
      private_hospital: { level: 0, price: 11500, workers: 0, suppliesTicks: 0 },
      media_studio: { level: 0, price: 28000, workers: 0, suppliesTicks: 0 },
      private_bank: { level: 0, price: 95000, workers: 0, suppliesTicks: 0 },
      oil_refinery: { level: 0, price: 310000, workers: 0, suppliesTicks: 0 },
      space_tech: { level: 0, price: 1250000, workers: 0, suppliesTicks: 0 }
    },
    investments: [], // Array of { id, investedAmount, ticksRemaining, rate, name }
    activeLoan: null, // Stores { amount, totalDue, ticksRemaining, initialTicks, isDefaulted, latePenaltyTicks, latePenaltyCount }
    dailyLoans: { date: '', count: 0 }, // Max 2 loans per 24 hours (calendar day)
    dailyToolUses: { date: '', uses: {} }, // Max daily uses per tool (calendar day)
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
    itemCooldowns: {}, // Stores { itemId: expiresAtTimestamp } — prevents re-purchase during cooldown
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
    stockCooldowns: {}, // Stores { SYMBOL: lockUntilTimestamp }
    dailyQuests: null, // Stores { date: 'YYYY-MM-DD', quests: [...], grandBonusClaimed: boolean }
    tradeCompany: {
      warehouseCapacity: 10,
      warehouse: {},
      activeImports: [],
      activeExports: [],
      totalProfitEarned: 0,
      totalShipmentsCompleted: 0
    },
    industry: {
      food: { unlocked: false, stage1: 0, stage2: 0, stage3: 0, logistics: 0, readyStock: 0, totalEarned: 0, totalExported: 0 },
      auto: { unlocked: false, stage1: 0, stage2: 0, stage3: 0, logistics: 0, readyStock: 0, totalEarned: 0, totalExported: 0 },
      semiconductor: { unlocked: false, stage1: 0, stage2: 0, stage3: 0, logistics: 0, readyStock: 0, totalEarned: 0, totalExported: 0 },
      petrochemical: { unlocked: false, stage1: 0, stage2: 0, stage3: 0, logistics: 0, readyStock: 0, totalEarned: 0, totalExported: 0 },
      aerospace: { unlocked: false, stage1: 0, stage2: 0, stage3: 0, logistics: 0, readyStock: 0, totalEarned: 0, totalExported: 0 }
    },
    workCooldownUntil: 0,
    overtimeCooldownUntil: 0,
    casinoCooldownUntil: 0,
    loanCooldownUntil: 0,
    stockTradeCooldownUntil: 0
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
      category: category // 'work' | 'business' | 'stock' | 'investment' | 'banking' | 'casino' | 'blackmarket' | 'store' | 'trade'
    });
    if (state.activityLog.length > 60) {
      state.activityLog.length = 60; // Keep last 60 entries
    }
  }

  // ─────────────────────────────────────────────────────────
  // 🎯 DAILY QUESTS SYSTEM (نظام المهام اليومية المتجددة)
  // ─────────────────────────────────────────────────────────
  const DAILY_QUEST_TEMPLATES = [
    {
      id: 'work_shifts',
      title: 'العمل الجاد والمثابرة',
      desc: 'أكمل 5 ورديات عمل (دوام عادي أو دوام إضافي)',
      target: 5,
      icon: 'fa-briefcase',
      category: 'work'
    },
    {
      id: 'bank_deposit',
      title: 'تأمين رأس المال',
      desc: 'قم بإيداع أي مبلغ مالي في حسابك البنكي لتأمينه',
      target: 1,
      icon: 'fa-building-columns',
      category: 'banking'
    },
    {
      id: 'stock_trade',
      title: 'مضارب البورصة',
      desc: 'نفذ عملية تداول واحدة (شراء أو بيع أي سهم)',
      target: 1,
      icon: 'fa-chart-line',
      category: 'stock'
    },
    {
      id: 'biz_upgrade',
      title: 'التوسع الاستثماري',
      desc: 'طوّر مشروعاً قائماً، اشترِ مشروعاً جديداً، أو عيّن موظفاً',
      target: 1,
      icon: 'fa-arrow-up-right-dots',
      category: 'business'
    },
    {
      id: 'casino_play',
      title: 'المغامر الذكي',
      desc: 'جرّب حظك في جولة واحدة داخل ألعاب الكازينو',
      target: 1,
      icon: 'fa-dice',
      category: 'casino'
    }
  ];

  function getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getDailyResetRemainingSeconds() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
  }

  function ensureDailyQuests() {
    if (!state) return;
    const today = getTodayDateString();
    if (!state.dailyQuests || state.dailyQuests.date !== today || !Array.isArray(state.dailyQuests.quests)) {
      const netWorth = (typeof calculateNetWorth === 'function') ? calculateNetWorth() : (state.netWorth || 400);
      const baseCash = Math.max(500, Math.round(Math.min(50000000, netWorth * 0.02 + 500)));
      const baseXP = Math.max(25, Math.round(Math.min(500, 20 + Math.log10(Math.max(10, netWorth)) * 15)));

      state.dailyQuests = {
        date: today,
        grandBonusClaimed: false,
        quests: DAILY_QUEST_TEMPLATES.map(t => ({
          id: t.id,
          title: t.title,
          desc: t.desc,
          target: t.target,
          progress: 0,
          completed: false,
          claimed: false,
          cashReward: baseCash,
          xpReward: baseXP,
          icon: t.icon,
          category: t.category
        }))
      };
    }
  }

  function trackDailyQuestProgress(questId, amount = 1) {
    if (!state) return;
    ensureDailyQuests();
    if (!state.dailyQuests || !Array.isArray(state.dailyQuests.quests)) return;
    const q = state.dailyQuests.quests.find(item => item.id === questId);
    if (q && !q.completed) {
      q.progress = Math.min(q.target, (q.progress || 0) + amount);
      if (q.progress >= q.target) {
        q.completed = true;
      }
    }
  }

  function claimDailyQuestReward(questId) {
    ensureDailyQuests();
    if (!state.dailyQuests || !Array.isArray(state.dailyQuests.quests)) {
      throw new Error("بيانات المهام اليومية غير متوفرة.");
    }
    const q = state.dailyQuests.quests.find(item => item.id === questId);
    if (!q) throw new Error("المهمة المطلوبة غير موجودة.");
    if (!q.completed) throw new Error("لم تكتمل أهداف هذه المهمة بعد.");
    if (q.claimed) throw new Error("تم استلام مكافأة هذه المهمة بالفعل لهذا اليوم.");

    q.claimed = true;
    state.cash = (state.cash || 0) + q.cashReward;
    state.xp = (state.xp || 0) + q.xpReward;

    recordPlayerActivity('استلام مكافأة مهمة يومية', `استلام مكافأة: "${q.title}" (+${q.cashReward.toLocaleString('ar-EG')} EGP, +${q.xpReward} XP)`, 'reward');
    state.netWorth = calculateNetWorth();
    state.title = getAppropriateTitle(state.netWorth, state.xp);
    if (activeUsername) {
      forceSaveState(true);
    }

    return {
      cash: q.cashReward,
      xp: q.xpReward,
      quest: q
    };
  }

  function claimGrandDailyBonus() {
    ensureDailyQuests();
    if (!state.dailyQuests || !Array.isArray(state.dailyQuests.quests)) {
      throw new Error("بيانات المهام اليومية غير متوفرة.");
    }
    if (state.dailyQuests.grandBonusClaimed) {
      throw new Error("تم فتح واستلام صندوق المكافأة الكبرى لهذا اليوم بالفعل.");
    }

    const allClaimed = state.dailyQuests.quests.every(q => q.claimed);
    if (!allClaimed) {
      throw new Error("يجب إكمال واستلام مكافآت جميع المهام الخمس أولاً لفتح الصندوق الأكبر!");
    }

    const sampleQ = state.dailyQuests.quests[0];
    const grandCash = (sampleQ ? sampleQ.cashReward : 1000) * 3;
    const grandXP = (sampleQ ? sampleQ.xpReward : 25) * 3;

    state.dailyQuests.grandBonusClaimed = true;
    state.cash = (state.cash || 0) + grandCash;
    state.xp = (state.xp || 0) + grandXP;

    recordPlayerActivity('فتح صندوق المكافأة الكبرى اليومي', `فتح صندوق المكافأة الكبرى! (+${grandCash.toLocaleString('ar-EG')} EGP, +${grandXP} XP)`, 'reward');
    state.netWorth = calculateNetWorth();
    state.title = getAppropriateTitle(state.netWorth, state.xp);
    if (activeUsername) {
      forceSaveState(true);
    }

    return {
      cash: grandCash,
      xp: grandXP
    };
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

  const STOCK_TICK_INTERVAL_MS = 15 * 60 * 1000; // 15-minute global synchronized candlestick

  function getUnifiedStockTick() {
    return Math.floor(Date.now() / STOCK_TICK_INTERVAL_MS);
  }

  function getStockSessionTimeRemaining() {
    const now = Date.now();
    return Math.max(0, STOCK_TICK_INTERVAL_MS - (now % STOCK_TICK_INTERVAL_MS));
  }

  function getCurrentMarketEvent() {
    if (globalMarketEvent && (!globalMarketEvent.expiresAt || Date.now() < globalMarketEvent.expiresAt)) {
      return globalMarketEvent;
    }
    // Synchronized 15-minute global cycle (1 event per 15-minute trading candle)
    const cycleIndex = Math.floor(Date.now() / STOCK_TICK_INTERVAL_MS) % UNIFIED_SCHEDULED_EVENTS.length;
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

  // Calculate the EXACT identical price of stock `sym` at any given 15-minute tick number
  function calculateUnifiedPriceAtTick(sym, tick) {
    const stock = STOCKS[sym];
    if (!stock) return 10;
    const seed = stock.seed || 101;

    // 1. Long-term Macro Cycle (48 ticks = 12 hours)
    const wave1 = Math.sin((tick + seed * 13) * (2 * Math.PI / 48));
    // 2. Medium-term Sector Momentum (16 ticks = 4 hours)
    const wave2 = Math.sin((tick + seed * 29) * (2 * Math.PI / 16));
    // 3. Short-term Intraday Swing (4 ticks = 1 hour)
    const wave3 = Math.sin((tick + seed * 47) * (2 * Math.PI / 4));
    // 4. Intraday Brownian Noise for this 15-minute period
    const noise = getDeterministicNoise(seed, tick);

    // Weighted Cycle Factor
    const cycleFactor = 1 + (wave1 * 0.22) + (wave2 * 0.12) + (wave3 * 0.06) + (noise * stock.volatility * 1.8);
    let price = Math.round(stock.basePrice * cycleFactor);

    // Apply Active Market Event Multiplier (Admin or Synchronized 15-min Cycle)
    const activeEv = getCurrentMarketEvent();
    if (activeEv && activeEv.targets && activeEv.targets[sym]) {
      price = Math.round(price * activeEv.targets[sym]);
    }

    // Safety Bounds (Floor & Ceiling prevent runaway pricing or infinite pumps)
    const ceiling = stock.ceiling || Math.round(stock.basePrice * 3.5);
    price = Math.max(stock.floor, Math.min(ceiling, price));

    return price;
  }

  // Initialize Stock Price Histories (100% Unified across all players)
  function initStocks() {
    const currentTick = getUnifiedStockTick();
    Object.keys(STOCKS).forEach(sym => {
      const history = [];
      // Generate past 24 synchronized points (6 hours of trading history at 15-min intervals)
      for (let i = 23; i >= 0; i--) {
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
        if (stockPrices[sym].length > 25) stockPrices[sym].shift();
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

    // Add industrial supply chain infrastructure & inventory value
    if (state.industry && typeof INDUSTRIAL_SECTORS !== 'undefined') {
      Object.keys(INDUSTRIAL_SECTORS).forEach(secKey => {
        const secDef = INDUSTRIAL_SECTORS[secKey];
        const sec = state.industry[secKey];
        if (sec && sec.unlocked) {
          worth += secDef.unlockCost;
          ['stage1', 'stage2', 'stage3', 'logistics'].forEach(stKey => {
            const lvl = Number(sec[stKey] || 0);
            if (lvl > 0 && secDef.stages[stKey]) {
              worth += Math.floor(secDef.stages[stKey].baseCost * lvl * 1.15);
            }
          });
          if (sec.readyStock > 0) {
            worth += Math.floor(sec.readyStock * secDef.product.baseValue);
          }
        }
      });
    }

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
    const lvl = Math.max(1, bizState.level || 1);
    const levelMultiplier = 1 + (lvl - 1) * 0.05; // Linear +5% pricing power per level
    const franchiseOptMultiplier = bizState.isFranchise ? 1.20 : 1.0;
    const opt = Math.round(bizConfig.optimumPrice * levelMultiplier * franchiseOptMultiplier);
    const price = bizState.price || opt;

    let elasticity = 1.0;
    if (price > opt) {
      elasticity = Math.max(0.1, 1 - ((price - opt) / opt));
    } else if (price < opt) {
      elasticity = 1 + ((opt - price) / opt) * 0.25;
    }

    const marketingActive = Boolean(bizState.marketingTicks && bizState.marketingTicks > 0);
    const marketingBoost = marketingActive ? 1.25 : 1.0;
    const actualCostOfGoods = Math.floor(bizConfig.costOfGoods * (1 + (lvl - 1) * 0.03));
    
    // Balanced linear upgrade scaling: +25% base demand per level (3.25x at level 10)
    const upgradeFactor = 1 + (lvl - 1) * 0.25;
    
    // Cap effective workers to maxWorkers defined for this business
    const maxW = bizConfig.maxWorkers || 20;
    const effectiveWorkers = Math.min(maxW, Math.max(0, bizState.workers || 0));
    const workerEff = (bizConfig.workerMultiplier || 1.04) - 1.0;
    const workerFactor = 1 + (effectiveWorkers * workerEff);

    const demand = Math.max(1, Math.floor(bizConfig.baseDemand * upgradeFactor * elasticity * workerFactor * marketingBoost));
    const margin = Math.max(1, price - actualCostOfGoods);
    const hasSupplies = Boolean(bizState.suppliesTicks && bizState.suppliesTicks > 0);
    // When supplies are available: 115% peak capacity bonus.
    // When supplies run out: 0% production (project halts completely until goods are re-stocked).
    const suppliesMultiplier = hasSupplies ? 1.15 : 0.0;
    const quantumMultiplier = (s && ((s.inventory && s.inventory.quantum_cpu > 0) || (s.itemDurations && s.itemDurations.quantum_cpu > 0))) ? (STORE_ITEMS.quantum_cpu ? STORE_ITEMS.quantum_cpu.value : 1.125) : 1.0;
    const boost = 1.0;
    const grossProfit = hasSupplies ? Math.max(0, Math.floor(demand * margin * 0.85 * quantumMultiplier * boost * suppliesMultiplier)) : 0;

    const workerPayroll = hasSupplies ? (effectiveWorkers * (bizConfig.workerWage || 0)) : 0;
    const cappedPayroll = Math.min(workerPayroll, Math.floor(grossProfit * 0.35));
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
    const franchiseMultiplier = bizState.isFranchise ? 1.20 : 1.0;

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
          employeeBoost += 0.20;
          employeePayrollDeduction += (empData.salary || 0);
        }
      });
    }

    // V2: Corporation Level Booster (+2% per level above Level 1, max +20%)
    let corpBooster = 1.0;
    if (typeof window !== 'undefined' && window.activeCorporationState && s) {
      const corp = window.activeCorporationState;
      if (corp.members && corp.members.includes(s.username)) {
        const corpLevel = corp.level || 1;
        corpBooster = 1 + Math.min(10, (corpLevel - 1)) * 0.02;
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
      partnerDividends,
      hasSupplies,
      suppliesTicks: bizState.suppliesTicks || 0
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

  function ensureDailyEconomyReset(s = state) {
    if (!s) return;
    const now = Date.now();
    if (!s.dailyBankInterestResetAt || now > s.dailyBankInterestResetAt) {
      s.dailyBankInterest = 0;
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 0);
      s.dailyBankInterestResetAt = nextMidnight.getTime();
    }
  }

  // Calculate compound bank interest hourly (0.015% per hour with tiered brackets and 250k daily cap)
  function calculateBankInterestHourly(playerState = state) {
    const s = playerState || state;
    if (!s || !s.bank || s.bank <= 0) return 0;

    ensureDailyEconomyReset(s);
    const dailyCap = 250000;
    const todayEarned = s.dailyBankInterest || 0;
    if (todayEarned >= dailyCap) return 0;

    const bal = s.bank;
    let baseRate = 0.00015; // 0.015% per hour (~0.36% per day = ~13% APY)
    if (s.activeCar === 'rolls') {
      baseRate *= 1.05; // Rolls-Royce Phantom +5% boost
    }
    if (s.inventory && s.inventory.diamond_card > 0) {
      baseRate *= (1 + (STORE_ITEMS.diamond_card ? STORE_ITEMS.diamond_card.value : 0.10));
    }

    // Tiered brackets for deposit balance:
    // Bracket 1: First 5M EGP -> 100% rate
    // Bracket 2: 5M to 25M EGP -> 40% rate
    // Bracket 3: 25M to 100M EGP -> 15% rate
    // Above 100M EGP -> 0% rate (no passive billions generation)
    let effBalance = Math.min(bal, 5000000);
    if (bal > 5000000) {
      effBalance += Math.min(bal - 5000000, 20000000) * 0.40;
    }
    if (bal > 25000000) {
      effBalance += Math.min(bal - 25000000, 75000000) * 0.15;
    }

    const hourlyEst = Math.floor(effBalance * baseRate);
    const remainingToday = Math.max(0, dailyCap - todayEarned);
    return Math.min(hourlyEst, remainingToday);
  }

  function calculateBankInterestPerTick(playerState = state) {
    const hourly = calculateBankInterestHourly(playerState);
    if (hourly <= 0) return 0;
    return Math.floor(hourly / 1200);
  }

  // Calculate total passive cashflow per hour from all businesses, real estate, bank interest, corp, and peer employment
  function calculatePassiveIncomePerHour(excludeTax = false) {
    let income = 0;
    if (!state) return 0;

    // 1. Businesses income (Net owner profit per hour)
    if (state.businesses) {
      Object.keys(state.businesses).forEach(key => {
        const bizState = state.businesses[key];
        if (bizState && bizState.level > 0) {
          const breakdown = calculateSingleBusinessProfit(key, bizState, state);
          income += breakdown.ownerProfit;
        }
      });
    }

    // 2. Joint Corporation Projects Profit Share (Hourly)
    income += calculateCorpTickProfit(state);

    // 3. Hired Peer Job Salary (Hourly)
    if (state.hiredJob && state.lastPuzzleSolved && (Date.now() - state.lastPuzzleSolved < 86400000)) {
      income += (state.hiredJob.salary || 0);
    }

    // 4. Real estate rental income (Hourly)
    if (state.assets) {
      Object.keys(state.assets).forEach(key => {
        const owned = state.assets[key] || 0;
        if (owned > 0 && ASSETS[key]) {
          income += owned * Math.floor(ASSETS[key].rent * 0.1);
        }
      });
    }

    // 5. Cars rental income and maintenance (Hourly)
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

    // 6. Bank interest (Hourly)
    income += calculateBankInterestHourly(state);

    // 7. Wealth Tax deduction for ultra-high net worth (5M+ EGP, with liquid safety buffer > 100k)
    if (state.netWorth > 5000000 && !excludeTax) {
      const liquidFunds = (state.bank || 0) + (state.cash || 0);
      if (liquidFunds > 100000) {
        const taxReport = calculateTaxReport();
        income = Math.max(0, income - taxReport.taxPerSecond);
      }
    }

    return Math.max(0, income);
  }

  function calculatePassiveIncomePerTick(excludeTax = false) {
    return calculatePassiveIncomePerHour(excludeTax) / 3600;
  }

  function calculatePassiveIncomePerSecond(excludeTax = false) {
    return calculatePassiveIncomePerTick(excludeTax);
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
        rate: 0.00015,
        dailyCap: 250000,
        dailyEarned: Math.round(s.dailyBankInterest || 0),
        hasRollsBonus: (s.activeCar === 'rolls'),
        profitPerHour: calculateBankInterestHourly(s),
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

    breakdown.totalGrossPerHour = grossIncome;
    breakdown.totalNetPerHour = netIncome;
    breakdown.totalGrossPerSec = grossIncome / 3600;
    breakdown.totalNetPerSec = netIncome / 3600;
    breakdown.totalNetPerMinute = Math.round(netIncome / 60);
    breakdown.totalNetPerDay = netIncome * 24;

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

    const effectiveRate = taxShieldActive ? (baseRate * 0.70) : baseRate; // Tax shield gives 30% discount (rebalanced 50%)
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
        // Bribe cost: 20% of cash + 10% of dirty cash, minimum 10,000 (reduced 18% if commissioner_wire active)
        let baseBribe = Math.max(10000, Math.floor((state.cash || 0) * 0.2) + Math.floor((state.dirtyCash || 0) * 0.1));
        if (state.inventory && state.inventory.commissioner_wire > 0) {
          baseBribe = Math.floor(baseBribe * 0.82); // 18% discount from Commissioner Wire (rebalanced 50%)
        }
        state.raidBribeCost = baseBribe;
        // Escape chance: 40% + Underworld Rep / 5, max 90%
        state.raidEscapeChance = Math.min(90, 40 + Math.floor((state.underworldRep || 0) / 5));
        
        state.netWorth = calculateNetWorth();
        AppDB.savePlayerState(activeUsername, state);
        return updates; // Stop further processing to let player resolve raid
      }
    }

    // 2. Bank compound interest accrual (Hourly rate distributed per tick)
    ensureDailyEconomyReset(state);
    const interestGained = calculateBankInterestPerTick(state);
    if (interestGained > 0) {
      state.bank += interestGained;
      state.dailyBankInterest = (state.dailyBankInterest || 0) + interestGained;
      updates.bankInterestGained = interestGained;
    }

    // 3. Peer-to-Peer Hired Job Salary (Hourly salary distributed per tick)
    if (state.hiredJob && state.lastPuzzleSolved && (Date.now() - state.lastPuzzleSolved < 86400000)) {
      const hiredSalary = (state.hiredJob.salary || 0) / 3600;
      if (hiredSalary > 0) {
        state.bank += hiredSalary;
        updates.businessProfitGained += hiredSalary;
      }
    }

    // 4. Businesses passive income ticking (Hourly owner profit distributed per tick)
    Object.keys(state.businesses).forEach(key => {
      const bizState = state.businesses[key];
      if (!bizState || bizState.level <= 0) return;

      const breakdown = calculateSingleBusinessProfit(key, bizState, state);

      // Decrement marketing campaign timer if active
      if (bizState.marketingTicks && bizState.marketingTicks > 0) {
        bizState.marketingTicks--;
        if (bizState.marketingTicks === 0) {
          bizState.marketingCooldownUntil = Date.now() + 60000; // 60s cooldown after campaign ends
        }
      }

      const tickProfit = (breakdown.ownerProfit || 0) / 3600;
      if (tickProfit > 0) {
        state.bank += tickProfit;
        updates.businessProfitGained += tickProfit;
      }

      // Record partner dividends for claim distribution
      if (typeof window !== 'undefined' && breakdown.partnerDividends) {
        if (!window.pendingDividends) window.pendingDividends = {};
        if (!window.pendingDividends[key]) window.pendingDividends[key] = {};
        Object.entries(breakdown.partnerDividends).forEach(([partner, amt]) => {
          if (amt > 0) {
            window.pendingDividends[key][partner] = (window.pendingDividends[key][partner] || 0) + (amt / 3600);
          }
        });
      }
    });

    // V2: Joint Corporation Passive Profit Ticks (Hourly profit distributed per tick)
    const corpProfitGained = calculateCorpTickProfit(state) / 3600;
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
          bizFrontCapacity += (b.level * 250) / 3600; // Scaled per tick
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

    // Progressive Wealth Tax on Ultra-High Net Worth (Hourly tax distributed per tick)
    if (state.netWorth > 5000000) {
      const liquidFunds = (state.bank || 0) + (state.cash || 0);
      const safetyBuffer = 100000; // Never deduct taxes if liquid funds are under 100,000 EGP

      if (liquidFunds > safetyBuffer) {
        const taxReport = calculateTaxReport();
        const tax = (taxReport.taxPerSecond || 0) / 3600;
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

    // 5. Assets / Real Estate passive rental income ticking (Hourly rent distributed per tick)
    Object.keys(state.assets).forEach(key => {
      const ownedCount = state.assets[key] || 0;
      if (ownedCount > 0) {
        const asset = ASSETS[key];
        const rent = (ownedCount * Math.floor(asset.rent * 0.1)) / 3600; // Rent distributed per tick
        state.bank += rent;
        updates.rentGained += rent;
      }
    });

    // 5.5 Cars rental income and maintenance ticking (Hourly net profit distributed per tick)
    if (state.ownedCars && state.ownedCars.length > 0) {
      state.ownedCars.forEach(carRef => {
        const car = CAR_TEMPLATES[carRef.id];
        if (car && carRef.rentStatus === 'rented') {
          const netProfit = (car.rentalIncomePerTick - car.maintenanceCostPerTick) / 3600;
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

    // 6.6 Decrement operating supplies ticks for owned businesses
    if (state.businesses) {
      Object.keys(state.businesses).forEach(bk => {
        const b = state.businesses[bk];
        if (b && b.level > 0 && typeof b.suppliesTicks === 'number' && b.suppliesTicks > 0) {
          b.suppliesTicks--;
          if (b.suppliesTicks <= 0) {
            b.suppliesTicks = 0;
            if (!updates.suppliesExhausted) updates.suppliesExhausted = [];
            const bizCfg = BUSINESSES[bk];
            updates.suppliesExhausted.push(bizCfg ? bizCfg.name : bk);
            recordPlayerActivity('نفاد بضاعة ⚠️', `نفدت بضاعة ومستلزمات تشغيل مشروع "${bizCfg ? bizCfg.name : bk}" وتوقف الإنتاج تماماً! يلزم توريد شحنة جديدة فوراً.`, 'business');
          }
        }
      });
    }

    // 6.7 Active Bank Loan countdown, default status & late penalty enforcement
    if (state.activeLoan && state.activeLoan.amount > 0) {
      if (typeof state.activeLoan.ticksRemaining !== 'number') {
        state.activeLoan.ticksRemaining = 300;
      }
      if (state.activeLoan.ticksRemaining > 0) {
        state.activeLoan.ticksRemaining--;
        if (state.activeLoan.ticksRemaining <= 0) {
          state.activeLoan.isDefaulted = true;
          updates.loanDefaulted = true;
          recordPlayerActivity('تعثر سداد قرض ⚠️', `انتهت مهلة سداد القرض البنكي (${(state.activeLoan.totalDue || 0).toLocaleString()} EGP). تم تجميد حسابك البنكي وتطبيق غرامة تأخير دورية 3%!`, 'banking');
        }
      } else if (state.activeLoan.isDefaulted) {
        // Late penalty: 3% compound fee every 60 ticks (60 seconds)
        state.activeLoan.latePenaltyTicks = (state.activeLoan.latePenaltyTicks || 0) + 1;
        if (state.activeLoan.latePenaltyTicks >= 60) {
          state.activeLoan.latePenaltyTicks = 0;
          state.activeLoan.latePenaltyCount = (state.activeLoan.latePenaltyCount || 0) + 1;
          const penalty = Math.max(500, Math.floor(state.activeLoan.totalDue * 0.03));
          state.activeLoan.totalDue += penalty;
          updates.loanPenaltyApplied = { penalty, totalDue: state.activeLoan.totalDue };
          recordPlayerActivity('غرامة تأخير قرض ⚠️', `تطبيق غرامة تأخير +${penalty.toLocaleString()} EGP على القرض المتعثر. إجمالي المستحق: ${state.activeLoan.totalDue.toLocaleString()} EGP`, 'banking');
        }
      }
    }

    // 6.8 Trade Company (الاستيراد والتصدير): Arrival of imports and delivery of exports
    if (state.tradeCompany) {
      const nowMs = Date.now();
      if (state.tradeCompany.activeImports && state.tradeCompany.activeImports.length > 0) {
        state.tradeCompany.activeImports.forEach(imp => {
          if (!imp.arrived && nowMs >= imp.arrivalTime) {
            imp.arrived = true;
            if (!state.tradeCompany.warehouse) state.tradeCompany.warehouse = {};
            state.tradeCompany.warehouse[imp.commodityId] = (state.tradeCompany.warehouse[imp.commodityId] || 0) + imp.quantity;
            if (!updates.tradeImportsArrived) updates.tradeImportsArrived = [];
            const comm = TRADE_COMMODITIES[imp.commodityId];
            updates.tradeImportsArrived.push({ commodityName: comm ? comm.name : imp.commodityId, quantity: imp.quantity });
            recordPlayerActivity('وصول شحنة استيراد 🚢', `وصلت شحنة "${comm ? comm.name : imp.commodityId}" (${imp.quantity} وحدة) لمستودع الشركة بنجاح وجاهزة للبيع والتصدير.`, 'trade');
          }
        });
      }
      if (state.tradeCompany.activeExports && state.tradeCompany.activeExports.length > 0) {
        state.tradeCompany.activeExports.forEach(exp => {
          if (!exp.delivered && nowMs >= exp.deliveryTime) {
            exp.delivered = true;
            if (!updates.tradeExportsDelivered) updates.tradeExportsDelivered = [];
            updates.tradeExportsDelivered.push({ id: exp.id, buyerName: exp.buyerName, payout: exp.totalPayout });
            recordPlayerActivity('تسليم شحنة تصدير 📦', `وصلت شحنة التصدير إلى العميل "${exp.buyerName}". أرباحك جاهزة للتحصيل فوراً (${exp.totalPayout.toLocaleString()} EGP).`, 'trade');
          }
        });
      }
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

    // 6.9 Industrial Supply Chain Empire (مجمع الصناعات وسلاسل الإمداد): Balanced manufacturing & storage
    if (state.industry && typeof INDUSTRIAL_SECTORS !== 'undefined') {
      Object.keys(INDUSTRIAL_SECTORS).forEach(secKey => {
        const secDef = INDUSTRIAL_SECTORS[secKey];
        const sec = state.industry[secKey];
        if (sec && sec.unlocked) {
          const s1 = Number(sec.stage1 || 0);
          const s2 = Number(sec.stage2 || 0);
          const s3 = Number(sec.stage3 || 0);
          const log = Number(sec.logistics || 0);

          if (s1 > 0 && s2 > 0 && s3 > 0) {
            const bottleneck = Math.min(s1, s2, s3);
            const maxStage = Math.max(s1, s2, s3);
            // Imbalance penalty: if stages are far apart, efficiency drops by up to 35%
            const balanceFactor = maxStage > 0 ? Math.max(0.65, bottleneck / maxStage) : 1;
            const logisticsBonus = 1 + (log * 0.15);

            // Silo capacity scales with logistics stage level
            const siloCapacity = 400 + (log * 80);
            const currentStock = Number(sec.readyStock || 0);

            if (currentStock < siloCapacity) {
              const producedPerTick = Math.max(0.02, bottleneck * 0.04 * logisticsBonus * balanceFactor);
              
              // Operational & raw materials maintenance cost (6% of manufactured value)
              const opCost = Math.floor(producedPerTick * secDef.product.baseValue * 0.06);
              let funded = true;
              if (opCost > 0) {
                if ((state.cash || 0) >= opCost) {
                  state.cash -= opCost;
                } else if ((state.bank || 0) >= opCost) {
                  state.bank -= opCost;
                } else {
                  funded = false; // Production pauses if working capital is empty
                }
              }

              if (funded) {
                sec.readyStock = Math.min(siloCapacity, currentStock + producedPerTick);
              }
            }
          }
        }
      });
    }

    // 7. Unified Stock Market Synchronization (Deterministic & Global for all players)
    if (syncUnifiedStocks()) {
      updates.stockMovement = true;
      const currentEv = getCurrentMarketEvent();
      if (currentEv && currentEv.title) {
        updates.marketTicker = currentEv.title;
      }
    }

    // 9. Random Life & Career Opportunities (Cooldown: 60 seconds, Balanced micro-rewards <= 1,000 EGP)
    const TIP_COOLDOWN_MS = 60 * 1000;
    const now = Date.now();
    if (!lastTipEventTimestamp) lastTipEventTimestamp = now;

    if (!updates.tipEvent && (now - lastTipEventTimestamp >= TIP_COOLDOWN_MS) && Math.random() < 0.30) {
      lastTipEventTimestamp = now;
      const eventChance = Math.random();
      let tipTitle = "";
      let tipText = "";
      let amountGained = 0;
      let xpBonus = 0;

      if (eventChance < 0.35) {
        // Customer Tip (50 - 200 EGP)
        amountGained = Math.floor(50 + Math.random() * 150);
        xpBonus = 5;
        tipTitle = "💵 إكرامية عميل";
        tipText = `حصلت على إكرامية لقاء حسن تعاملك بقيمة +${amountGained.toLocaleString()} EGP!`;
      } else if (eventChance < 0.65) {
        // Fast Minor Gig (200 - 450 EGP)
        amountGained = Math.floor(200 + Math.random() * 250);
        xpBonus = 10;
        tipTitle = "🤝 خدمة تجارية سريعة";
        tipText = `أنجزت وساطة بسيطة وحصدت عمولة كاش بقيمة +${amountGained.toLocaleString()} EGP!`;
      } else if (eventChance < 0.85) {
        // Performance Incentive (450 - 750 EGP)
        amountGained = Math.floor(450 + Math.random() * 300);
        xpBonus = 20;
        tipTitle = "⭐ حافز إنجاز وتميز";
        tipText = `حصلت على حافز تميز تقديراً لجهودك بقيمة +${amountGained.toLocaleString()} EGP!`;
      } else {
        // Special Opportunity (750 - 1,000 EGP MAX)
        amountGained = Math.floor(750 + Math.random() * 250);
        xpBonus = 35;
        tipTitle = "💎 فرصة استثمارية جانبية";
        tipText = `أثمرت فرصة جانبية غير متوقعة عن أرباح إضافية بقيمة +${amountGained.toLocaleString()} EGP!`;
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

      // ── Fix: clamp workers to 5 × level for any player with excess workers ──
      let workersClamped = false;
      Object.keys(mergedBusinesses).forEach(k => {
        const biz = mergedBusinesses[k];
        const maxAllowed = (biz.level || 0) * 5;
        if ((biz.workers || 0) > maxAllowed) {
          biz.workers = maxAllowed;
          workersClamped = true;
        }
      });
      if (workersClamped) {
        console.log('[GameEngine] Worker counts clamped to 5×level limit for player:', username);
      }


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
        customItems: Array.isArray(dbState.customItems) ? dbState.customItems : [],
        _loadedFromCloud: true
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

          // 1. Calculate business offline profits based strictly on supplies remaining
          let offlineBizEarnings = 0;
          if (state.businesses) {
            Object.keys(state.businesses).forEach(bk => {
              const b = state.businesses[bk];
              if (b && b.level > 0 && typeof b.suppliesTicks === 'number' && b.suppliesTicks > 0) {
                // Business produced profit ONLY while supplies lasted!
                const activeSuppliesSec = Math.min(b.suppliesTicks, cappedSeconds);
                const tempState = { ...b, suppliesTicks: activeSuppliesSec };
                const bCalc = calculateSingleBusinessProfit(bk, tempState, state);
                const bizSecProfit = (bCalc.ownerProfit || 0) / 3600;
                offlineBizEarnings += Math.floor(bizSecProfit * activeSuppliesSec);

                // Deplete supplies by elapsed offline time
                b.suppliesTicks = Math.max(0, b.suppliesTicks - elapsedSinceLastActive);
              }
            });
          }

          // 2. Non-business passive income (Real estate, cars, bank interest, job) for full capped time
          let nonBizHourly = 0;
          if (state.assets) {
            Object.keys(state.assets).forEach(ak => {
              const owned = state.assets[ak] || 0;
              if (owned > 0 && ASSETS[ak]) nonBizHourly += owned * Math.floor(ASSETS[ak].rent * 0.1);
            });
          }
          if (state.ownedCars && state.ownedCars.length > 0) {
            state.ownedCars.forEach(carRef => {
              const car = CAR_TEMPLATES[carRef.id];
              if (car && carRef.rentStatus === 'rented') {
                const netP = car.rentalIncomePerTick - car.maintenanceCostPerTick;
                if (netP > 0) nonBizHourly += netP;
              }
            });
          }
          nonBizHourly += calculateBankInterestPerTick(state);
          if (state.hiredJob && state.lastPuzzleSolved && (Date.now() - state.lastPuzzleSolved < 86400000)) {
            nonBizHourly += (state.hiredJob.salary || 0);
          }
          const nonBizOfflineEarnings = Math.floor((nonBizHourly / 3600) * cappedSeconds);

          const totalOffline = offlineBizEarnings + nonBizOfflineEarnings;
          if (totalOffline > 0 || offlineCorpEarnings > 0) {
            state.bank += totalOffline;
            state.offlineReport = {
              seconds: cappedSeconds,
              earnings: (totalOffline || 0) + (offlineCorpEarnings || 0),
              corpEarnings: offlineCorpEarnings,
              wasManagerActive: true,
              expiredDuringAbsence: now > managerExpiry
            };
          }
        } else if (elapsedSinceLastActive > 0 && state.businesses) {
          Object.keys(state.businesses).forEach(bk => {
            const b = state.businesses[bk];
            if (b && b.level > 0 && typeof b.suppliesTicks === 'number' && b.suppliesTicks > 0) {
              b.suppliesTicks = Math.max(0, b.suppliesTicks - elapsedSinceLastActive);
            }
          });
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
      // Ensure tradeCompany state integrity & resolve offline shipments
      if (!state.tradeCompany) {
        state.tradeCompany = {
          warehouseCapacity: 10,
          warehouse: {},
          activeImports: [],
          activeExports: [],
          totalProfitEarned: 0,
          totalShipmentsCompleted: 0
        };
      }
      if (!state.tradeCompany.warehouse) state.tradeCompany.warehouse = {};
      if (!state.tradeCompany.activeImports) state.tradeCompany.activeImports = [];
      if (!state.tradeCompany.activeExports) state.tradeCompany.activeExports = [];

      const nowSessionMs = Date.now();
      state.tradeCompany.activeImports.forEach(imp => {
        if (!imp.arrived && nowSessionMs >= imp.arrivalTime) {
          imp.arrived = true;
          state.tradeCompany.warehouse[imp.commodityId] = (state.tradeCompany.warehouse[imp.commodityId] || 0) + imp.quantity;
        }
      });
      state.tradeCompany.activeExports.forEach(exp => {
        if (!exp.delivered && nowSessionMs >= exp.deliveryTime) {
          exp.delivered = true;
        }
      });

      // Ensure industry state integrity
      if (!state.industry) state.industry = {};
      ['food', 'auto', 'semiconductor', 'petrochemical', 'aerospace'].forEach(sec => {
        if (!state.industry[sec]) {
          state.industry[sec] = { unlocked: false, stage1: 0, stage2: 0, stage3: 0, logistics: 0, readyStock: 0, totalEarned: 0, totalExported: 0 };
        }
      });

      state.lastActiveTimestamp = Date.now();
      state.netWorth = calculateNetWorth();
      await AppDB.savePlayerState(username, state);
    } else {
      // Local fallback only if no dbState is found; DO NOT overwrite cloud state!
      console.warn('[GameEngine] No cloud dbState found for user:', username);
      state = JSON.parse(JSON.stringify(INITIAL_STATE));
      state.username = username;
      state.afkManagerExpiresAt = Date.now() + (12 * 60 * 60 * 1000);
      state.lastActiveTimestamp = Date.now();
    }
    ensureDailyQuests();
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

    // Enforce 1.5s shift cooldown (reduced 15% if cronos_gear active)
    if (state.workCooldownUntil && Date.now() < state.workCooldownUntil) {
      const remSec = ((state.workCooldownUntil - Date.now()) / 1000).toFixed(1);
      throw new Error(`أنت مرهق من نوبة العمل السابقة! يرجى أخذ استراحة (${remSec} ثانية).`);
    }
    const hasCronos = Boolean(state.inventory && state.inventory.cronos_gear > 0);
    const workCdMs = Math.floor(1500 * (hasCronos ? 0.85 : 1.0));
    state.workCooldownUntil = Date.now() + workCdMs;

    // Calculate XP boosters & energy drink salary multipliers
    const isPenActive = (state.inventory && state.inventory.gold_pen > 0);
    const isEnergyActive = (state.inventory && state.inventory.energy_drink > 0);

    const xpBoost = isPenActive ? (1 + (STORE_ITEMS.gold_pen ? STORE_ITEMS.gold_pen.value : 0.08)) : 1.0;
    const salaryMultiplier = isEnergyActive ? (STORE_ITEMS.energy_drink ? STORE_ITEMS.energy_drink.value : 1.125) : 1.0;

    const boost = window.serverBoostMultiplier || 1.0;
    const finalXpReward = Math.ceil(job.xpReward * xpBoost * boost);
    const finalSalary = Math.floor(job.salary * salaryMultiplier * boost);

    // Add XP and bank
    state.xp += finalXpReward;
    state.bank += finalSalary;

    // Recalculate and Save
    state.netWorth = calculateNetWorth();
    state.title = getAppropriateTitle(state.netWorth, state.xp);
    recordPlayerActivity('نوبة عمل 💼', `إتمام وردية عمل كـ "${job.name}" (+${finalSalary.toLocaleString()} ج.م للبنك و +${finalXpReward} XP)`, 'work');
    trackDailyQuestProgress('work_shifts', 1);
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
    recordPlayerActivity('ترقية وظيفية 🎖️', `ترقية إلى مرتبة "${targetJob.name}" براتب أساسي ${targetJob.salary.toLocaleString()} ج.م/دورة`, 'work');
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
    bizState.suppliesTicks = 600; // 10 minutes initial operating supplies included with purchase

    recordPlayerActivity('شراء مشروع', `شراء وتأسيس مشروع "${biz.name}" بسعر ${biz.cost.toLocaleString()} ج.م (يشمل مخزون تشغيل أولي لـ 10 دقائق)`, 'business');
    state.netWorth = calculateNetWorth();
    trackDailyQuestProgress('biz_upgrade', 1);
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
    const upgradeCost = hasTaxShield ? Math.floor(baseCost * 0.875) : baseCost;

    if (state.cash < upgradeCost) {
      throw new Error(`رصيدك غير كافٍ للترقية. تحتاج: ${upgradeCost.toLocaleString()} EGP — لديك: ${state.cash.toLocaleString()} EGP`);
    }

    state.cash -= upgradeCost;
    bizState.level++;

    recordPlayerActivity('ترقية مشروع', `ترقية مشروع "${biz.name}" إلى المستوى ${bizState.level}`, 'business');
    state.netWorth = calculateNetWorth();
    trackDailyQuestProgress('biz_upgrade', 1);
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

    const maxAllowed = biz.maxWorkers || 20;
    const maxWorkersForLvl = Math.min(maxAllowed, Math.max(1, Math.ceil((bizState.level / 10) * maxAllowed)));
    if (bizState.workers >= maxWorkersForLvl) {
      if (bizState.workers >= maxAllowed) {
        throw new Error(`وصل المشروع للحد الأقصى المطلق للعمالة المسموح بها (${maxAllowed} عامل).`);
      }
      throw new Error(`الحد الأقصى للعمال في المستوى ${bizState.level} هو ${maxWorkersForLvl} عمال. رقّ المشروع لإتاحة شواغر جديدة.`);
    }

    // Worker hiring fee scales with number of existing workers
    const hireCost = Math.floor(biz.cost * 0.15 * (1 + bizState.workers));
    if (state.cash < hireCost) {
      throw new Error(`تكلفة توظيف عامل إضافي هي ${hireCost.toLocaleString()} جنيه. الرصيد غير كافٍ.`);
    }

    state.cash -= hireCost;
    bizState.workers++;

    state.netWorth = calculateNetWorth();
    trackDailyQuestProgress('biz_upgrade', 1);
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

  // Launch Marketing Campaign (+40% demand boost for 30 ticks = 90 seconds, followed by 60s cooldown)
  function launchMarketingCampaign(key) {
    const biz = BUSINESSES[key];
    const bizState = state.businesses[key];
    if (!bizState || bizState.level === 0) throw new Error("المشروع مغلق حالياً.");

    if (bizState.marketingTicks && bizState.marketingTicks > 0) {
      throw new Error("توجد حملة تسويقية نشطة بالفعل لهذا المشروع!");
    }
    if (bizState.marketingCooldownUntil && Date.now() < bizState.marketingCooldownUntil) {
      const remSec = Math.ceil((bizState.marketingCooldownUntil - Date.now()) / 1000);
      throw new Error(`قسم التسويق: انتظر ${remSec} ثانية حتى ينتهي تأثير الحملة السابقة قبل إطلاق حملة جديدة.`);
    }

    const campaignCost = Math.floor(biz.cost * 0.25);
    if (state.cash < campaignCost) {
      throw new Error(`تكلفة إطلاق الحملة الإعلانية المكثفة هي ${campaignCost.toLocaleString()} EGP. رصيدك غير كافٍ.`);
    }

    state.cash -= campaignCost;
    bizState.marketingTicks = 30; // 30 ticks = 90 seconds

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

    // Automatic debt recovery if loan is defaulted
    if (state.activeLoan && state.activeLoan.isDefaulted) {
      if (amount >= state.activeLoan.totalDue) {
        const excess = amount - state.activeLoan.totalDue;
        const paid = state.activeLoan.totalDue;
        state.activeLoan = null;
        state.bank += excess;
        recordPlayerActivity('سداد كامل لقرض متعثر 🏛️', `تم استقطاع كامل الدين (${paid.toLocaleString()} ج.م) من الإيداع وفك تجميد الحساب البنكي بنجاح!`, 'banking');
      } else {
        state.activeLoan.totalDue -= amount;
        recordPlayerActivity('سداد جزئي لقرض متعثر 🏛️', `تم توجيه مبلغ ${amount.toLocaleString()} ج.م من الإيداع لسداد جزء من القرض المتعثر. المتبقي: ${state.activeLoan.totalDue.toLocaleString()} ج.م`, 'banking');
      }
    } else {
      state.bank += amount;
      recordPlayerActivity('إيداع بنكي 🏛️', `إيداع نقدي بقيمة ${amount.toLocaleString()} ج.م في الحساب المصرفي`, 'banking');
    }

    state.netWorth = calculateNetWorth();
    trackDailyQuestProgress('bank_deposit', 1);
    forceSaveState(true);
  }

  // Withdraw Cash from Bank
  function withdrawFromBank(amount) {
    if (amount <= 0) throw new Error("مبلغ السحب يجب أن يكون أكبر من صفر.");
    if (state.activeLoan && state.activeLoan.isDefaulted) {
      throw new Error(`حسابك البنكي مجمد بموجب أمر قضائي مصرفي لتعثرك في سداد القرض المستحق (${state.activeLoan.totalDue.toLocaleString()} EGP). يرجى سداد القرض أولاً لفك تجميد حسابك!`);
    }
    if (state.bank < amount) throw new Error("رصيدك في حساب البنك لا يكفي لإتمام هذا السحب.");

    state.bank -= amount;
    state.cash += amount;
    recordPlayerActivity('سحب بنكي 💵', `سحب نقدي بقيمة ${amount.toLocaleString()} ج.م من الحساب المصرفي`, 'banking');
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
    recordPlayerActivity('شراء عقار/أصل 🏠', `شراء "${asset.name}" بقيمة ${asset.cost.toLocaleString()} ج.م (+${asset.income.toLocaleString()} ج.م/دورة)`, 'investment');

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
    recordPlayerActivity('تصفية عقار/أصل 💰', `بيع "${asset.name}" بسعر تصفية ${sellValue.toLocaleString()} ج.م`, 'investment');

    state.netWorth = calculateNetWorth();
    forceSaveState(true);
    return sellValue;
  }

  // Buy Stocks (with 3.0% Brokerage Commission, 45s Holding Period, & Max Shares Cap)
  function buyStock(sym, shares) {
    const stock = STOCKS[sym];
    if (!stock) throw new Error("رمز الشركة غير صالح.");
    if (shares <= 0 || !Number.isInteger(shares)) throw new Error("عدد الأسهم يجب أن يكون عدداً صحيحاً موجباً.");

    // Anti-Spam Trade Cooldown (3 seconds)
    if (state.stockTradeCooldownUntil && Date.now() < state.stockTradeCooldownUntil) {
      const remSec = Math.ceil((state.stockTradeCooldownUntil - Date.now()) / 1000);
      throw new Error(`البورصة: نظام منع التداول فائق السرعة نشط. انتظر ${remSec} ثانية بين كل أمر تداول.`);
    }

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

    // Set 45-second holding cooldown on this stock and 3s global trade cooldown
    state.stockCooldowns = state.stockCooldowns || {};
    state.stockCooldowns[sym] = Date.now() + 45000;
    state.stockTradeCooldownUntil = Date.now() + 3000;

    recordPlayerActivity('شراء أسهم', `شراء ${shares} سهم (${sym}) بإجمالي ${grossCost.toLocaleString()} ج.م + عمولة ${fee.toLocaleString()} ج.م`, 'stock');
    trackDailyQuestProgress('stock_trade', 1);
    forceSaveState(true);
    return { shares, price: currentPrice, grossCost, fee, totalCost };
  }

  // Sell Stocks (with 3.0% Brokerage Commission, 10% Capital Gains Tax, & 45s Cooldown Check)
  function sellStock(sym, shares) {
    const stock = STOCKS[sym];
    if (!stock) throw new Error("الشركة غير موجودة.");
    if (shares <= 0 || !Number.isInteger(shares)) throw new Error("عدد الأسهم غير صالح.");

    // Anti-Spam Trade Cooldown (3 seconds)
    if (state.stockTradeCooldownUntil && Date.now() < state.stockTradeCooldownUntil) {
      const remSec = Math.ceil((state.stockTradeCooldownUntil - Date.now()) / 1000);
      throw new Error(`البورصة: نظام منع التداول فائق السرعة نشط. انتظر ${remSec} ثانية بين كل أمر تداول.`);
    }

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

    let netReturn = Math.max(0, grossReturn - fee - capitalGainsTax);

    // 3. Market Scanner Loss Shield (10% loss protection if trade was at a loss)
    let scannerCompensation = 0;
    if (grossReturn < costBasis && state.inventory && state.inventory.market_scanner > 0) {
      const tradeLoss = costBasis - grossReturn;
      const shieldPct = STORE_ITEMS.market_scanner ? STORE_ITEMS.market_scanner.value : 0.10;
      scannerCompensation = Math.floor(tradeLoss * shieldPct);
      netReturn += scannerCompensation;
    }

    state.stocks[sym].shares -= shares;
    if (state.stocks[sym].shares === 0) {
      state.stocks[sym].avgPrice = 0;
    }
    state.cash += netReturn;
    state.stockTradeCooldownUntil = Date.now() + 3000;

    let logDetails = `بيع ${shares} سهم (${sym}) بصافي ${netReturn.toLocaleString()} ج.م (عمولة سمسرة: ${fee.toLocaleString()} ج.م)`;
    if (capitalGainsTax > 0) {
      logDetails += ` [ضريبة أرباح: ${capitalGainsTax.toLocaleString()} ج.م]`;
    }
    if (scannerCompensation > 0) {
      logDetails += ` [حماية الماسح الذكي عوّضت: +${scannerCompensation.toLocaleString()} ج.م]`;
    }

    recordPlayerActivity('بيع أسهم', logDetails, 'stock');
    trackDailyQuestProgress('stock_trade', 1);
    forceSaveState(true);
    return { shares, price: currentPrice, grossReturn, fee, capitalGainsTax, scannerCompensation, totalReturn: netReturn };
  }

  // Helper: Ensure daily tool tracking (limits abuse and spam per 24 hours)
  function ensureDailyToolTracking() {
    if (!state) return;
    const today = getTodayDateString();
    if (!state.dailyToolUses || state.dailyToolUses.date !== today) {
      state.dailyToolUses = {
        date: today,
        uses: {}
      };
    }
    if (!state.dailyToolUses.uses) {
      state.dailyToolUses.uses = {};
    }
  }

  // Store: Buy Item (Refreshes duration, prevents exploit stacking, enforces daily limits & cooldown)
  function buyStoreItem(itemId) {
    const item = STORE_ITEMS[itemId];
    if (!item) throw new Error("المنتج المطلوب غير متوفر بالمتجر.");

    // 1. Guard against re-buying an already active tool
    if (state.inventory && state.inventory[itemId] > 0 && state.itemDurations && state.itemDurations[itemId] > 0) {
      const remSec = (state.itemDurations[itemId] || 0) * 3;
      throw new Error(`أداة "${item.name}" نشطة وتعمل في حقيبتك حالياً (${remSec} ثانية متبقية). لا يمكنك شراء نسخة جديدة حتى ينتهي مفعول الحالية.`);
    }

    // 2. Guard against excessive concurrent active tools (max 3 simultaneously)
    const activeCount = Object.keys(state.inventory || {}).filter(k => (state.inventory[k] > 0) && (state.itemDurations && state.itemDurations[k] > 0)).length;
    if (activeCount >= 3) {
      throw new Error("وصلت للحد الأقصى لتشغيل الأدوات المتزامنة (3 أدوات تعمل معاً في نفس اللحظة). انتظر انتهاء إحداها.");
    }

    // 3. Guard against daily overuse (maxDailyUses per 24 hours)
    ensureDailyToolTracking();
    const usedToday = (state.dailyToolUses.uses && state.dailyToolUses.uses[itemId]) || 0;
    const maxUses = item.maxDailyUses || 3;
    if (usedToday >= maxUses) {
      const remSec = getDailyResetRemainingSeconds();
      const remHours = Math.floor(remSec / 3600);
      const remMins = Math.floor((remSec % 3600) / 60);
      throw new Error(`لقد استنفدت الحد الأقصى اليومي لاستخدام "${item.name}" (${maxUses} مرات كل 24 ساعة)! يتجدد الاستخدام بعد ${remHours} ساعة و ${remMins} دقيقة.`);
    }

    // 4. Check item cooldown
    if (!state.itemCooldowns) state.itemCooldowns = {};
    const cooldownExpiry = state.itemCooldowns[itemId] || 0;
    if (Date.now() < cooldownExpiry) {
      const remainingSec = Math.ceil((cooldownExpiry - Date.now()) / 1000);
      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;
      const timeStr = mins > 0 ? `${mins} دقيقة و${secs} ثانية` : `${secs} ثانية`;
      throw new Error(`هذه الأداة في فترة التبريد (كول داون). يمكنك استخدامها مجدداً بعد ${timeStr}.`);
    }

    if (state.cash < item.cost) {
      throw new Error(`سعر المنتج ${item.cost.toLocaleString()} جنيه. رصيدك لا يكفي.`);
    }

    state.cash -= item.cost;
    if (!state.inventory) state.inventory = {};
    state.inventory[itemId] = 1;

    // Initialize/Reset item self-destruction timer
    if (!state.itemDurations) state.itemDurations = {};
    state.itemDurations[itemId] = item.durationTicks;

    // Increment daily usage count
    state.dailyToolUses.uses[itemId] = usedToday + 1;

    // Set cooldown so player cannot immediately re-purchase after effect expires
    if (item.cooldownSec) {
      state.itemCooldowns[itemId] = Date.now() + (item.cooldownSec * 1000);
    }

    recordPlayerActivity('شراء متجر', `شراء وتفعيل أداة "${item.name}" (الاستخدام ${usedToday + 1}/${maxUses} لليوم)`, 'store');
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

    // Calculate risk & success modifiers (rebalanced by 50%)
    let successBonus = 0;
    const hasLawyer = Boolean(state.inventory && state.inventory.premium_lawyer > 0);
    const hasJammer = Boolean(state.inventory && state.inventory.radar_jammer > 0);

    if (hasLawyer) {
      successBonus += 0.11; // +11% direct success boost from Lawyer (rebalanced 50%)
    }
    if (hasJammer) {
      successBonus += 0.075; // +7.5% direct success boost from Jammer (rebalanced 50%)
    }

    const finalSuccessChance = Math.min(0.92, deal.successChance + successBonus);

    // Prepare Cooldown Timers (Full cooldown for success, Half cooldown for failure)
    const hasCronos = Boolean(state.inventory && state.inventory.cronos_gear > 0);
    const cdMultiplier = hasCronos ? 0.75 : 1.0; // 25% faster with Cronos (rebalanced 50%)
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

      // 1. Lawyer Acquittal: 25% chance the lawyer dismisses charges immediately (rebalanced 50%)
      if (hasLawyer && Math.random() < 0.25) {
        recordPlayerActivity('براءة قضائية', `تدخل المحامي وأثبت براءة اللاعب في صفقة "${deal.name}" دون عقوبة (كول داون مخفض)`, 'blackmarket');
        state.netWorth = calculateNetWorth();
        AppDB.savePlayerState(activeUsername, state);
        return {
          success: false,
          escaped: true,
          acquittedByLawyer: true,
          confiscation: 0,
          jailDuration: 0,
          cooldownSec: Math.floor((deal.cooldownSec || 120) / 2 * cdMultiplier),
          message: 'تدخل المحامي الدولي وأسقط القضية وأثبت براءتك دون سجن أو غرامات!'
        };
      }

      // 2. Diplomatic Fake Passport Emergency Escape
      if (state.inventory && state.inventory.fake_passport > 0) {
        state.inventory.fake_passport--;
        if (state.itemDurations) delete state.itemDurations.fake_passport;
        recordPlayerActivity('هروب دبلوماسي', `استخدام جواز السفر المزور للهروب من المداهمة في صفقة "${deal.name}" (كول داون مخفض)`, 'blackmarket');
        state.netWorth = calculateNetWorth();
        AppDB.savePlayerState(activeUsername, state);
        return {
          success: false,
          escaped: true,
          confiscation: 0,
          jailDuration: 0,
          cooldownSec: Math.floor((deal.cooldownSec || 120) / 2 * cdMultiplier),
          message: 'تمكنت من الهروب الفوري باستخدام جواز السفر الدبلوماسي المزور!'
        };
      }

      // 3. Arrest & Confiscation (Diplomatic bag protects 18% of dirty cash, rebalanced 50%)
      const hasDiplomaticBag = Boolean(state.inventory && state.inventory.diplomatic_bag > 0);
      const confiscatedDirty = hasDiplomaticBag ? Math.floor((state.dirtyCash || 0) * 0.82) : (state.dirtyCash || 0);
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

    // Money laundering tax rate: base 45%, drops to 40% with crypto_cleaner (Never less than 40%, rebalanced 50%)
    const hasCryptoCleaner = Boolean(state.inventory && state.inventory.crypto_cleaner > 0);
    const feeRate = hasCryptoCleaner ? 0.40 : 0.45;
    const fee = Math.floor(amount * feeRate);
    const cleanedAmount = amount - fee;

    state.dirtyCash = Math.max(0, state.dirtyCash - amount);
    state.bank = (state.bank || 0) + cleanedAmount;
    state.totalTaxesPaid = (state.totalTaxesPaid || 0) + fee;
    recordPlayerActivity('غسيل أموال', `غسيل ${amount.toLocaleString()} ج.م (ضريبة/عمولة ${Math.round(feeRate * 100)}% = ${fee.toLocaleString()} ج.م) وتحويل صافي ${cleanedAmount.toLocaleString()} ج.م إلى رصيد البنك النظيف`, 'blackmarket');
    state.netWorth = calculateNetWorth();
    forceSaveState(true);
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

  // --- Secure Anti-Exploit Casino System Constants & Core Safeguards ---
  const MAX_CASINO_DAILY_PROFIT = 15000000; // 15,000,000 EGP / 24h net profit cap
  const CASINO_COOLDOWN_MS = 6000;          // 6 seconds cooldown across all games
  const CASINO_HOUSE_RAKE = 0.03;           // 3% house rake on winning net profits

  // Unified Casino Gatekeeper: Validates cooldown, daily net profit cap, 5% dynamic bet limit, instant deduction & save
  function checkCasinoAllowedAndDeduct(betAmount, skipCooldown = false) {
    const isEn = (typeof window !== 'undefined' && window.currentLang === 'en');
    const currency = isEn ? 'EGP' : 'ج.م';

    // 1. Anti-Spam Cooldown (6 seconds)
    if (!skipCooldown && state.casinoCooldownUntil && Date.now() < state.casinoCooldownUntil) {
      const remSec = Math.ceil((state.casinoCooldownUntil - Date.now()) / 1000);
      throw new Error(isEn
        ? `Casino Cooldown: Please wait ${remSec}s before placing another bet.`
        : `الكازينو: يرجى التمهل! انتظر ${remSec} ثانية قبل وضع رهان جديد.`);
    }

    // 2. Daily Net Profit Cap Enforcement (Rolling 24-hour cycle)
    const now = Date.now();
    if (!state.dailyCasinoResetAt || now >= state.dailyCasinoResetAt) {
      state.dailyCasinoNetProfit = 0;
      state.dailyCasinoResetAt = now + (24 * 60 * 60 * 1000);
    }
    if ((state.dailyCasinoNetProfit || 0) >= MAX_CASINO_DAILY_PROFIT) {
      const remHours = Math.ceil((state.dailyCasinoResetAt - now) / 3600000);
      throw new Error(isEn
        ? `Daily Profit Limit: You reached the casino net profit cap (${MAX_CASINO_DAILY_PROFIT.toLocaleString()} ${currency} / 24h). Resets in ~${remHours}h.`
        : `بلغت الحد الأقصى اليومي لصافي أرباح الكازينو (${MAX_CASINO_DAILY_PROFIT.toLocaleString()} ${currency} / 24 ساعة). يرجى العودة بعد ~${remHours} ساعة.`);
    }

    // 3. Dynamic Bet Limit: min 100, max 2.5M, capped at 5% of player's cash to defeat Martingale exploit
    if (typeof betAmount !== 'number' || isNaN(betAmount) || betAmount <= 0) {
      throw new Error(isEn ? "Please enter a valid bet amount." : "مبلغ الرهان غير صالح.");
    }
    if (betAmount < 100) {
      throw new Error(isEn ? `Minimum bet is 100 ${currency}.` : `الحد الأدنى للرهان هو 100 ${currency}.`);
    }

    const dynamicCap = Math.max(500, Math.floor(state.cash * 0.05));
    const effectiveMaxBet = state.cash < 500 ? state.cash : Math.min(2500000, dynamicCap);

    if (betAmount > effectiveMaxBet) {
      throw new Error(isEn
        ? `Bet exceeds limit! Maximum allowed bet right now is ${effectiveMaxBet.toLocaleString()} ${currency} (capped at 5% of cash or 2,500,000 ${currency}).`
        : `الرهان يتجاوز الحد المسموح به! الحد الأقصى المسموح لرهانك الآن هو ${effectiveMaxBet.toLocaleString()} ${currency} (بحد أقصى 5% من رصيدك الكاش أو 2,500,000 ${currency}).`);
    }

    if (state.cash < betAmount) {
      throw new Error(isEn ? "Insufficient cash balance for this bet." : "رصيدك النقدي لا يكفي لهذا الرهان.");
    }

    // 4. Set Cooldown & Deduct Immediately
    if (!skipCooldown) {
      state.casinoCooldownUntil = Date.now() + CASINO_COOLDOWN_MS;
    }
    state.cash -= betAmount;

    // 5. Anti Save-Scumming: Immediately persist deduction so reload/close forfeits bet
    forceSaveState(true);

    return { allowed: true, betAmount, effectiveMaxBet };
  }

  // Unified Casino Settlement: Applies House Rake (3%), VIP Bonus (+20% on net profit), net profit tracking & immediate persistence
  function settleCasinoRound(betAmount, grossPayout, gameName = 'الكازينو') {
    const isEn = (typeof window !== 'undefined' && window.currentLang === 'en');
    const currency = isEn ? 'EGP' : 'ج.م';
    const hasVIP = Boolean(state.inventory && state.inventory.vip_casino_pass > 0);
    const grossProfit = grossPayout - betAmount;

    let finalPayout = 0;
    let netProfit = 0;
    let rakeAmount = 0;
    let vipBonusAmount = 0;

    if (grossProfit > 0) {
      // Won round!
      // VIP Pass Perk: +20% bonus on net winnings
      if (hasVIP) {
        vipBonusAmount = Math.floor(grossProfit * 0.20);
      }
      // House Rake: 3% commission on net profit
      rakeAmount = Math.floor(grossProfit * CASINO_HOUSE_RAKE);

      netProfit = grossProfit - rakeAmount + vipBonusAmount;
      finalPayout = betAmount + netProfit;

      state.cash += finalPayout;
      state.dailyCasinoNetProfit = Math.min(MAX_CASINO_DAILY_PROFIT, Math.max(0, (state.dailyCasinoNetProfit || 0) + netProfit));

      recordPlayerActivity(gameName, isEn
        ? `Won ${finalPayout.toLocaleString()} ${currency} (Net: +${netProfit.toLocaleString()} ${currency})`
        : `فوز في ${gameName}: +${finalPayout.toLocaleString()} ${currency} (صافي ربح +${netProfit.toLocaleString()} ${currency})`, 'casino');
    } else if (grossPayout === betAmount) {
      // Push / Tie: Return original bet
      finalPayout = betAmount;
      netProfit = 0;
      state.cash += finalPayout;
      recordPlayerActivity(gameName, isEn
        ? `Tie/Push in ${gameName}: bet refunded (${betAmount.toLocaleString()} ${currency})`
        : `تعادل في ${gameName}: استرداد الرهان (${betAmount.toLocaleString()} ${currency})`, 'casino');
    } else {
      // Loss
      finalPayout = 0;
      netProfit = -betAmount;
      state.dailyCasinoNetProfit = Math.max(0, (state.dailyCasinoNetProfit || 0) - betAmount);
      recordPlayerActivity(gameName, isEn
        ? `Lost bet of ${betAmount.toLocaleString()} ${currency}`
        : `خسارة رهان في ${gameName}: -${betAmount.toLocaleString()} ${currency}`, 'casino');
    }

    state.netWorth = calculateNetWorth();
    trackDailyQuestProgress('casino_play', 1);
    forceSaveState(true);

    return {
      payout: finalPayout,
      profit: netProfit,
      rake: rakeAmount,
      vipBonus: vipBonusAmount,
      won: grossProfit > 0,
      isPush: grossPayout === betAmount
    };
  }

  // Casino Flip Game with Streak Bonus & Anti-Exploit
  function playCoinFlip(betAmount, choice, currentStreak = 0) {
    checkCasinoAllowedAndDeduct(betAmount);

    // 49.0% fair win probability
    const winChance = 0.49;
    const roll = Math.random();
    const won = roll < winChance;

    let outcomeSide = choice;
    if (!won) {
      outcomeSide = choice === 'heads' ? 'tails' : 'heads';
    }

    let grossPayout = 0;
    let mult = 0;

    if (won) {
      // Streak bonus multiplier: 2.0x base, +0.25x per streak level up to 3.5x max
      const streakBonus = Math.min(1.5, currentStreak * 0.25);
      mult = 2.0 + streakBonus;
      grossPayout = Math.floor(betAmount * mult);
    }

    const settlement = settleCasinoRound(betAmount, grossPayout, 'رمي العملة (Coin Flip)');

    return {
      won: settlement.won,
      side: outcomeSide,
      multiplier: mult,
      streakMultiplier: mult,
      payout: settlement.payout,
      profit: settlement.profit,
      loss: betAmount,
      rake: settlement.rake,
      vipBonus: settlement.vipBonus
    };
  }

  // Casino Slots Game with 5 Balanced Tier Symbols & Anti-Exploit
  function playSlots(betAmount) {
    checkCasinoAllowedAndDeduct(betAmount);

    // Fair balanced distribution
    function getRandomSymbol() {
      const r = Math.random();
      if (r < 0.08) return 'CROWN';
      if (r < 0.24) return 'DIAMOND';
      if (r < 0.50) return 'GOLD';
      if (r < 0.77) return 'SACK';
      return 'KEY';
    }

    const r1 = getRandomSymbol();
    const r2 = getRandomSymbol();
    const r3 = getRandomSymbol();

    let multiplier = 0;
    let winMessage = (typeof window !== 'undefined' && window.currentLang === 'en') ? "Better luck next time!" : "حظ أوفر المرة القادمة!";
    let isJackpot = false;

    if (r1 === r2 && r2 === r3) {
      if (r1 === 'CROWN') { multiplier = 25; winMessage = "الجاكبوت الملكي الذهبي الأكبر!"; isJackpot = true; }
      else if (r1 === 'DIAMOND') { multiplier = 18; winMessage = "ألماس ثلاثي أسطوري!"; isJackpot = true; }
      else if (r1 === 'GOLD') { multiplier = 12; winMessage = "ثلاث سبائك ذهبية متطابقة!"; }
      else if (r1 === 'SACK') { multiplier = 8; winMessage = "ثلاث حقائب أموال ضخمة!"; }
      else { multiplier = 5; winMessage = "ثلاثة مفاتيح ذهبية نادرة!"; }
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
      multiplier = 1.5;
      winMessage = (typeof window !== 'undefined' && window.currentLang === 'en') ? "Two matching symbols consolation!" : "رمزان متطابقان، جائزة ترضية!";
    }

    const grossPayout = Math.floor(betAmount * multiplier);
    const settlement = settleCasinoRound(betAmount, grossPayout, 'ماكينة الحظ (Slots)');

    return {
      reels: [r1, r2, r3],
      won: settlement.won,
      isJackpot,
      multiplier,
      payout: settlement.payout,
      profit: settlement.profit,
      loss: betAmount,
      rake: settlement.rake,
      vipBonus: settlement.vipBonus,
      message: winMessage
    };
  }

  // Lucky Royale Dice (رمي النرد الملكي)
  function playDice(betAmount, choice) {
    checkCasinoAllowedAndDeduct(betAmount);

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

    const grossPayout = won ? Math.floor(betAmount * multiplier) : 0;
    const settlement = settleCasinoRound(betAmount, grossPayout, 'رمي النرد الملكي');

    const isEn = (typeof window !== 'undefined' && window.currentLang === 'en');
    const msg = settlement.won
      ? (isEn ? `You rolled ${sum}!` : `مجموع النرد ${sum}!`)
      : (isEn ? `Rolled ${sum}.` : `مجموع النرد ${sum}.`);

    return {
      d1,
      d2,
      die1: d1,
      die2: d2,
      sum,
      isDouble,
      won: settlement.won,
      multiplier,
      payout: settlement.payout,
      profit: settlement.profit,
      loss: betAmount,
      rake: settlement.rake,
      vipBonus: settlement.vipBonus,
      message: msg
    };
  }

  // Wheel of Fortune (عجلة الحظ)
  function playWheelOfFortune(betAmount) {
    checkCasinoAllowedAndDeduct(betAmount);

    const multipliers = [0, 0.5, 1.2, 1.5, 2.0, 3.0, 5.0, 10.0];
    const weights = [18, 25, 25, 14, 10, 5, 2, 1]; // Balanced house edge ~9%

    let rand = Math.floor(Math.random() * 100);
    let cumulative = 0;
    let selectedMult = 0;

    for (let i = 0; i < multipliers.length; i++) {
      cumulative += weights[i];
      if (rand < cumulative) {
        selectedMult = multipliers[i];
        break;
      }
    }

    const grossPayout = Math.floor(betAmount * selectedMult);
    const settlement = settleCasinoRound(betAmount, grossPayout, 'عجلة الحظ (Wheel of Fortune)');

    return {
      multiplier: selectedMult,
      payout: settlement.payout,
      profit: settlement.profit,
      loss: betAmount,
      rake: settlement.rake,
      vipBonus: settlement.vipBonus,
      won: selectedMult > 1.0,
      isPush: selectedMult === 1.0
    };
  }

  // Perform Overtime Double Shift
  function performOvertimeShift() {
    const job = JOBS[state.jobId] || JOBS.worker;

    // Enforce 20s overtime cooldown (reduced 15% if cronos_gear active)
    if (state.overtimeCooldownUntil && Date.now() < state.overtimeCooldownUntil) {
      const remSec = Math.ceil((state.overtimeCooldownUntil - Date.now()) / 1000);
      throw new Error(`أنت مجهد للغاية من العمل الإضافي! يرجى الانتظار ${remSec} ثانية قبل نوبة إضافية جديدة.`);
    }
    const hasCronos = Boolean(state.inventory && state.inventory.cronos_gear > 0);
    const overtimeCdMs = Math.floor(20000 * (hasCronos ? 0.85 : 1.0));
    state.overtimeCooldownUntil = Date.now() + overtimeCdMs;

    const isEnergyActive = (state.inventory && state.inventory.energy_drink > 0);
    const isPenActive = (state.inventory && state.inventory.gold_pen > 0);

    const xpBonus = isPenActive ? (1 + (STORE_ITEMS.gold_pen ? STORE_ITEMS.gold_pen.value : 0.08)) : 1.0;
    const energyMult = isEnergyActive ? (STORE_ITEMS.energy_drink ? STORE_ITEMS.energy_drink.value : 1.125) : 1.0;

    // Overtime gives 2.5x base salary and 3x XP
    const boost = window.serverBoostMultiplier || 1.0;
    const earnedSalary = Math.floor(job.salary * 2.5 * energyMult * boost);
    const earnedXp = Math.ceil(job.xpReward * 3 * xpBonus * boost);

    state.bank += earnedSalary;
    state.xp += earnedXp;
    state.netWorth = calculateNetWorth();
    state.title = getAppropriateTitle(state.netWorth, state.xp);
    recordPlayerActivity('عمل إضافي مضاعف ⚡', `إنجاز وردية إضافية كـ "${job.name}" (+${earnedSalary.toLocaleString()} ج.م و +${earnedXp} XP)`, 'work');
    trackDailyQuestProgress('work_shifts', 1);
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

  // Helper: Ensure daily loan tracking (max 2 loans per 24 hours)
  function ensureDailyLoanTracking() {
    if (!state) return;
    const today = getTodayDateString();
    if (!state.dailyLoans || state.dailyLoans.date !== today) {
      state.dailyLoans = {
        date: today,
        count: 0
      };
    }
  }

  // Bank Loan: Take instant liquidity loan (up to 35% of Net Worth, max 2 loans per 24 hours)
  function takeBankLoan(amount) {
    if (state.activeLoan && state.activeLoan.amount > 0) {
      throw new Error(`لديك قرض قائم بالفعل بقيمة ${state.activeLoan.totalDue.toLocaleString()} EGP يجب سداده أولاً!`);
    }

    ensureDailyLoanTracking();
    if (state.dailyLoans.count >= 2) {
      const remSec = getDailyResetRemainingSeconds();
      const remHours = Math.floor(remSec / 3600);
      const remMins = Math.floor((remSec % 3600) / 60);
      throw new Error(`لقد استنفدت الحد الأقصى للقروض اليومية (مرتان فقط كل 24 ساعة)! يتجدد الائتمان بعد ${remHours} ساعة و ${remMins} دقيقة.`);
    }

    if (state.loanCooldownUntil && Date.now() < state.loanCooldownUntil) {
      const remSec = Math.ceil((state.loanCooldownUntil - Date.now()) / 1000);
      throw new Error(`البنك: فترة التقييم الائتماني نشطة. لا يمكنك طلب قرض جديد إلا بعد مرور ${remSec} ثانية من سداد القرض السابق.`);
    }
    const maxLoan = Math.max(50000, Math.floor(state.netWorth * 0.35));
    if (amount <= 0 || amount > maxLoan) {
      throw new Error(`الحد الأقصى للقرض المسموح لك هو ${maxLoan.toLocaleString()} جنيه.`);
    }
    const totalDue = Math.floor(amount * 1.15); // 15% interest fee
    state.activeLoan = {
      amount,
      totalDue,
      ticksRemaining: 300, // 300 seconds (5 minutes) to repay before penalty
      initialTicks: 300,
      isDefaulted: false,
      latePenaltyTicks: 0,
      latePenaltyCount: 0
    };
    state.dailyLoans.count = (state.dailyLoans.count || 0) + 1;
    state.cash += amount;
    state.netWorth = calculateNetWorth();
    recordPlayerActivity('طلب قرض بنكي 🏛️', `اقتراض ${amount.toLocaleString()} ج.م من البنك (القرض ${state.dailyLoans.count}/2 لليوم، مطلوب سداد ${totalDue.toLocaleString()} ج.م خلال 5 دقائق)`, 'banking');
    forceSaveState(true);
    return { amount, totalDue, ticksRemaining: 300, dailyCount: state.dailyLoans.count };
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
    recordPlayerActivity('سداد قرض بنكي 🏛️', `تم سداد القرض البنكي بالكامل بقيمة ${due.toLocaleString()} ج.م وفك أي حظر مصرفي`, 'banking');
    state.activeLoan = null;
    state.loanCooldownUntil = Date.now() + 180000; // 3 minutes credit cooldown before next loan
    state.netWorth = calculateNetWorth();
    forceSaveState(true);
    return { repaid: due };
  }

  // Business: Supply stock and inventory materials (gives 20 mins of peak 125% productivity)
  function supplyBusiness(key) {
    const biz = BUSINESSES[key];
    if (!biz) throw new Error("المشروع غير متوفر.");
    if (!state.businesses[key] || state.businesses[key].level <= 0) {
      throw new Error("يجب تأسيس وشراء المشروع أولاً لتوريد البضاعة له.");
    }
    const bizState = state.businesses[key];
    const supplyCost = Math.max(80, Math.floor(biz.cost * 0.04 * Math.pow(1.15, (bizState.level || 1) - 1)));
    if (state.cash < supplyCost) {
      throw new Error(`رصيدك الكاش لا يكفي لتوريد البضاعة. تحتاج: ${supplyCost.toLocaleString()} EGP — لديك: ${state.cash.toLocaleString()} EGP`);
    }

    state.cash -= supplyCost;
    bizState.suppliesTicks = Math.min(3600, (bizState.suppliesTicks || 0) + 1200);

    recordPlayerActivity('توريد بضاعة ومستلزمات 📦', `توريد شحنة بضاعة لمشروع "${biz.name}" بتكلفة ${supplyCost.toLocaleString()} ج.م (+20 دقيقة كفاءة إنتاجية قصوى 125%)`, 'business');
    state.netWorth = calculateNetWorth();
    forceSaveState(true);
    return {
      cost: supplyCost,
      suppliesTicks: bizState.suppliesTicks
    };
  }

  // European Roulette Wheel Game with Anti-Exploit & House Rake
  function playRoulette(betAmount, betTypeOrChoice, betValue) {
    checkCasinoAllowedAndDeduct(betAmount);

    let betType = betTypeOrChoice;
    let val = betValue;

    // Support single choice argument from UI (e.g., 'red', 'black', 'green', 'even', 'odd')
    if (val === undefined || val === null) {
      if (betTypeOrChoice === 'red' || betTypeOrChoice === 'black') {
        betType = 'color';
        val = betTypeOrChoice;
      } else if (betTypeOrChoice === 'green') {
        betType = 'number';
        val = 0;
      } else if (betTypeOrChoice === 'even' || betTypeOrChoice === 'odd') {
        betType = 'parity';
        val = betTypeOrChoice;
      } else if (!isNaN(Number(betTypeOrChoice))) {
        betType = 'number';
        val = Number(betTypeOrChoice);
      }
    }

    // Roulette wheel number: 0 to 36
    const rolledNumber = Math.floor(Math.random() * 37);
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const isRed = redNumbers.includes(rolledNumber);
    const isBlack = rolledNumber > 0 && !isRed;
    const isGreen = (rolledNumber === 0);

    let won = false;
    let multiplier = 0;

    if (betType === 'number') {
      if (Number(val) === rolledNumber) {
        won = true;
        multiplier = 36; // Straight up 36x
      }
    } else if (betType === 'color') {
      if (val === 'red' && isRed) {
        won = true;
        multiplier = 2.0;
      } else if (val === 'black' && isBlack) {
        won = true;
        multiplier = 2.0;
      }
    } else if (betType === 'parity') {
      if (val === 'even' && rolledNumber > 0 && rolledNumber % 2 === 0) {
        won = true;
        multiplier = 2.0;
      } else if (val === 'odd' && rolledNumber % 2 !== 0) {
        won = true;
        multiplier = 2.0;
      }
    } else if (betType === 'dozen') {
      if (val === '1' && rolledNumber >= 1 && rolledNumber <= 12) {
        won = true;
        multiplier = 3.0;
      } else if (val === '2' && rolledNumber >= 13 && rolledNumber <= 24) {
        won = true;
        multiplier = 3.0;
      } else if (val === '3' && rolledNumber >= 25 && rolledNumber <= 36) {
        won = true;
        multiplier = 3.0;
      }
    }

    const grossPayout = won ? Math.floor(betAmount * multiplier) : 0;
    const settlement = settleCasinoRound(betAmount, grossPayout, 'عجلة الروليت (Roulette)');

    return {
      rolledNumber,
      color: isGreen ? 'green' : (isRed ? 'red' : 'black'),
      won: settlement.won,
      multiplier,
      payout: settlement.payout,
      profit: settlement.profit,
      loss: betAmount,
      rake: settlement.rake,
      vipBonus: settlement.vipBonus
    };
  }

  // --- شركة الاستيراد والتصدير الدولية (Import & Export Global Company) ---

  function ensureDailyTradeReset() {
    if (!state.tradeCompany) {
      state.tradeCompany = {
        warehouseCapacity: 10,
        warehouse: {},
        activeImports: [],
        activeExports: [],
        totalProfitEarned: 0,
        totalShipmentsCompleted: 0
      };
    }
    const now = Date.now();
    if (!state.tradeCompany.dailyTradeResetAt || now > state.tradeCompany.dailyTradeResetAt) {
      state.tradeCompany.dailyTradeProfit = 0;
      state.tradeCompany.dailyExportsCount = {};
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 0);
      state.tradeCompany.dailyTradeResetAt = nextMidnight.getTime();
    }
    if (!state.tradeCompany.dailyExportsCount) state.tradeCompany.dailyExportsCount = {};
    if (typeof state.tradeCompany.dailyTradeProfit !== 'number') state.tradeCompany.dailyTradeProfit = 0;
  }

  function getTradeCompanyState() {
    ensureDailyTradeReset();

    if (!state.tradeCompany.warehouse) state.tradeCompany.warehouse = {};
    if (!state.tradeCompany.activeImports) state.tradeCompany.activeImports = [];
    if (!state.tradeCompany.activeExports) state.tradeCompany.activeExports = [];

    // Calculate current storage utilization
    let storedUnits = 0;
    Object.values(state.tradeCompany.warehouse).forEach(qty => {
      storedUnits += (qty || 0);
    });

    let incomingUnits = 0;
    state.tradeCompany.activeImports.forEach(imp => {
      if (!imp.arrived) incomingUnits += (imp.quantity || 0);
    });

    const capacity = state.tradeCompany.warehouseCapacity || 10;
    const upgradeCost = Math.floor(50000 * Math.pow(1.8, Math.max(0, (capacity - 10) / 10)));

    return {
      warehouseCapacity: capacity,
      storedUnits,
      incomingUnits,
      availableSlots: Math.max(0, capacity - storedUnits - incomingUnits),
      warehouse: state.tradeCompany.warehouse,
      activeImports: state.tradeCompany.activeImports,
      activeExports: state.tradeCompany.activeExports,
      totalProfitEarned: state.tradeCompany.totalProfitEarned || 0,
      totalShipmentsCompleted: state.tradeCompany.totalShipmentsCompleted || 0,
      dailyTradeProfit: state.tradeCompany.dailyTradeProfit || 0,
      dailyTradeMaxProfit: 500000,
      dailyExportsCount: state.tradeCompany.dailyExportsCount || {},
      dailyTradeResetAt: state.tradeCompany.dailyTradeResetAt,
      upgradeCost,
      commodities: TRADE_COMMODITIES,
      buyers: TRADE_BUYERS
    };
  }

  function buyImportCargo(commodityId, quantity) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يمكنك إدارة عمليات الاستيراد والتصدير.");
    ensureDailyTradeReset();

    const activeImportsCount = (state.tradeCompany.activeImports || []).filter(imp => !imp.arrived).length;
    if (activeImportsCount >= 2) {
      throw new Error("أسطول الاستيراد البحري يعمل بكامل طاقته (شحنتان قيد الإبحار)! انتظر وصول وتسليم إحدى الشحنات أولاً لتفريغ رصيف الميناء.");
    }

    const item = TRADE_COMMODITIES[commodityId];
    if (!item) throw new Error("نوع البضاعة غير معروف في سجل التجارة الدولية.");
    quantity = parseInt(quantity, 10);
    if (!quantity || quantity <= 0) throw new Error("يرجى تحديد كمية صالحة (عدد صحيح موجب).");

    const tradeInfo = getTradeCompanyState();
    if (tradeInfo.availableSlots < quantity) {
      throw new Error(`سعة المستودع لا تكفي! المتاح للاستيراد: ${tradeInfo.availableSlots} وحدة (تشمل البضاعة المخزنة والشحنات في الطريق).`);
    }

    const baseCost = item.unitCost * quantity;
    const customsAndFreightFee = Math.floor(baseCost * 0.05); // 5% Port customs & freight handling fee
    const totalCost = baseCost + customsAndFreightFee;

    const totalLiquid = (state.cash || 0) + (state.bank || 0);
    if (totalLiquid < totalCost) {
      throw new Error(`سيولتك غير كافية لتمويل استيراد هذه الشحنة ورسوم الشحن والجمارك (5%). التكلفة الكلية: ${totalCost.toLocaleString()} EGP — المتاح لديك: ${totalLiquid.toLocaleString()} EGP.`);
    }

    // Deduct cost: try cash first, then bank
    if ((state.cash || 0) >= totalCost) {
      state.cash -= totalCost;
    } else {
      const rem = totalCost - (state.cash || 0);
      state.cash = 0;
      state.bank -= rem;
    }

    const orderId = 'imp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const importOrder = {
      id: orderId,
      commodityId,
      quantity,
      unitCost: item.unitCost,
      baseCost,
      customsAndFreightFee,
      totalCost,
      startTime: Date.now(),
      arrivalTime: Date.now() + (item.importDurationSec * 1000),
      durationSec: item.importDurationSec,
      arrived: false
    };

    state.tradeCompany.activeImports.push(importOrder);
    recordPlayerActivity('استيراد بضاعة 🚢', `بدء استيراد ${quantity} وحدة من "${item.name}" بتكلفة ${baseCost.toLocaleString()} EGP + ${customsAndFreightFee.toLocaleString()} EGP رسوم جمركية وشحن دولي (تصل خلال ${Math.round(item.importDurationSec / 60)} دقيقة).`, 'trade');
    forceSaveState(true);

    return importOrder;
  }

  function sellExportCargo(commodityId, buyerId, quantity) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يمكنك إبرام عقود التصدير.");
    ensureDailyTradeReset();

    const DAILY_TRADE_MAX_PROFIT = 500000;
    const currentDailyProfit = Number(state.tradeCompany.dailyTradeProfit || 0);
    if (currentDailyProfit >= DAILY_TRADE_MAX_PROFIT) {
      throw new Error(`وصلت شركتك إلى سقف الأرباح اليومية للتصدير (500,000 EGP) المحدد من هيئة الرقابة الجمركية 🛑. تتجدد الحصص الليلة الساعة 12:00 منتصف الليل.`);
    }

    const item = TRADE_COMMODITIES[commodityId];
    if (!item) throw new Error("نوع البضاعة غير صالح.");
    const buyer = TRADE_BUYERS.find(b => b.id === buyerId);
    if (!buyer) throw new Error("الجهة المستوردة غير موجودة في الدليل التجاري.");
    quantity = parseInt(quantity, 10);
    if (!quantity || quantity <= 0) throw new Error("يرجى تحديد كمية صالحة للتصدير.");

    const activeExportsCount = (state.tradeCompany.activeExports || []).filter(e => !e.claimed).length;
    if (activeExportsCount >= 2) {
      throw new Error("أسطول التصدير البحري يعمل بكامل طاقته (سفينتان نشطتان قيد الإبحار)! انتظر تسليم إحدى الشحنات أولاً لتحرير سفينة شحن.");
    }

    const activeWithBuyer = (state.tradeCompany.activeExports || []).filter(e => e.buyerId === buyer.id && !e.claimed).length;
    if (activeWithBuyer >= 1) {
      throw new Error(`العميل الدولي "${buyer.name}" لديه بالفعل شحنة جاري تسليمها له! تعاقد مع مشتري دولي آخر لتوزيع البضائع.`);
    }

    const currentStock = (state.tradeCompany && state.tradeCompany.warehouse && state.tradeCompany.warehouse[commodityId]) || 0;
    if (currentStock < quantity) {
      throw new Error(`المخزون المتوفر في مستودعك (${currentStock} وحدة) أقل من الكمية المطلوبة للتعاقد (${quantity} وحدة).`);
    }

    // Determine unit selling price based on buyer demand & market saturation
    const isDemanded = buyer.demands.includes(commodityId);
    let basePrice = item.baseSellMin + Math.floor(Math.random() * (item.baseSellMax - item.baseSellMin));
    if (isDemanded) {
      basePrice = Math.floor(basePrice * buyer.priceMult);
    } else {
      // Non-demanded goods sold at wholesale discount (-15%)
      basePrice = Math.floor(item.baseSellMin * 0.85);
    }

    // Market saturation penalty (-5% per 3 shipments today, max -25%)
    const todayExported = Number(state.tradeCompany.dailyExportsCount[commodityId] || 0);
    let saturationDiscount = 0;
    if (todayExported >= 3) {
      const tiers = Math.floor((todayExported - 3) / 3) + 1;
      saturationDiscount = Math.min(0.25, tiers * 0.05);
      basePrice = Math.floor(basePrice * (1 - saturationDiscount));
    }

    const totalPayout = basePrice * quantity;
    const estProfit = totalPayout - (item.unitCost * quantity);

    // Deduct from warehouse
    state.tradeCompany.warehouse[commodityId] -= quantity;
    if (state.tradeCompany.warehouse[commodityId] <= 0) {
      delete state.tradeCompany.warehouse[commodityId];
    }

    const exportOrderId = 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const exportOrder = {
      id: exportOrderId,
      commodityId,
      commodityName: item.name,
      buyerId: buyer.id,
      buyerName: buyer.name,
      region: buyer.region,
      quantity,
      unitPrice: basePrice,
      totalPayout,
      estProfit,
      saturationDiscountPct: Math.round(saturationDiscount * 100),
      startTime: Date.now(),
      deliveryTime: Date.now() + (item.exportDurationSec * 1000),
      durationSec: item.exportDurationSec,
      delivered: false,
      claimed: false
    };

    state.tradeCompany.activeExports.push(exportOrder);
    recordPlayerActivity('تصدير بضاعة 📦', `شحن وتصدير ${quantity} وحدة من "${item.name}" إلى ${buyer.name} بقيمة تعاقد ${totalPayout.toLocaleString()} ج.م (ربح تقديري: +${estProfit.toLocaleString()} ج.م)${saturationDiscount > 0 ? ` [تشبع سوق: -${Math.round(saturationDiscount * 100)}%]` : ''}.`, 'trade');
    forceSaveState(true);

    return exportOrder;
  }

  function claimExportProfit(exportId) {
    if (!state.tradeCompany || !state.tradeCompany.activeExports) {
      throw new Error("لا توجد شحنات تصدير مسجلة.");
    }
    const index = state.tradeCompany.activeExports.findIndex(e => e.id === exportId);
    if (index === -1) throw new Error("عقد التصدير المحدد غير موجود.");
    const order = state.tradeCompany.activeExports[index];

    if (Date.now() < order.deliveryTime && !order.delivered) {
      const remSec = Math.ceil((order.deliveryTime - Date.now()) / 1000);
      throw new Error(`الشحنة ما زالت في طريقها للعميل! متبقي على الوصول والتسليم: ${remSec} ثانية.`);
    }

    if (order.claimed) {
      throw new Error("تم تحصيل أرباح هذه الشحنة مسبقاً.");
    }

    // Pay out to bank
    state.bank = (state.bank || 0) + order.totalPayout;
    state.tradeCompany.totalProfitEarned = (state.tradeCompany.totalProfitEarned || 0) + (order.estProfit || 0);
    state.tradeCompany.totalShipmentsCompleted = (state.tradeCompany.totalShipmentsCompleted || 0) + 1;

    ensureDailyTradeReset();
    state.tradeCompany.dailyTradeProfit = (state.tradeCompany.dailyTradeProfit || 0) + Math.max(0, order.estProfit || 0);
    state.tradeCompany.dailyExportsCount[order.commodityId] = (state.tradeCompany.dailyExportsCount[order.commodityId] || 0) + (order.quantity || 1);

    // Remove from activeExports
    state.tradeCompany.activeExports.splice(index, 1);

    recordPlayerActivity('تحصيل أرباح تصدير 💰', `تم تحصيل عائد تصدير شحنة "${order.commodityName}" من ${order.buyerName} بمبلغ +${order.totalPayout.toLocaleString()} EGP (صافي ربح: +${order.estProfit.toLocaleString()} EGP).`, 'trade');
    forceSaveState(true);

    return {
      payout: order.totalPayout,
      profit: order.estProfit,
      buyerName: order.buyerName,
      commodityName: order.commodityName
    };
  }

  function upgradeWarehouse() {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك توسعة المستودعات.");
    const tradeInfo = getTradeCompanyState();
    const cost = tradeInfo.upgradeCost;
    const totalLiquid = (state.cash || 0) + (state.bank || 0);
    if (totalLiquid < cost) {
      throw new Error(`تكلفة توسعة المستودع (+10 حاويات) هي ${cost.toLocaleString()} EGP. رصيدك غير كافٍ.`);
    }

    if ((state.cash || 0) >= cost) {
      state.cash -= cost;
    } else {
      const rem = cost - (state.cash || 0);
      state.cash = 0;
      state.bank -= rem;
    }

    state.tradeCompany.warehouseCapacity = (state.tradeCompany.warehouseCapacity || 10) + 10;
    recordPlayerActivity('توسعة مستودع الاستيراد 🏢', `توسعة المستودع الرئيسي (+10 حاويات) لتصبح السعة الإجمالية ${state.tradeCompany.warehouseCapacity} وحدة.`, 'trade');
    forceSaveState(true);

    return {
      newCapacity: state.tradeCompany.warehouseCapacity,
      cost
    };
  }

  // ─────────────────────────────────────────────────────────
  // 🏭 مجمع الصناعات وسلاسل الإمداد (INDUSTRIAL SUPPLY CHAIN EMPIRE)
  // ─────────────────────────────────────────────────────────
  function ensureIndustryState() {
    if (!state.industry) state.industry = {};
    Object.keys(INDUSTRIAL_SECTORS).forEach(secKey => {
      if (!state.industry[secKey]) {
        state.industry[secKey] = {
          unlocked: false,
          stage1: 0,
          stage2: 0,
          stage3: 0,
          logistics: 0,
          readyStock: 0,
          totalEarned: 0,
          totalExported: 0
        };
      }
    });
  }

  function getIndustrySectorState(sectorId) {
    ensureIndustryState();
    const secDef = INDUSTRIAL_SECTORS[sectorId];
    if (!secDef) throw new Error("القطاع الصناعي المحدد غير صالح.");
    const secState = state.industry[sectorId];

    const s1 = Number(secState.stage1 || 0);
    const s2 = Number(secState.stage2 || 0);
    const s3 = Number(secState.stage3 || 0);
    const log = Number(secState.logistics || 0);

    const bottleneck = (s1 > 0 && s2 > 0 && s3 > 0) ? Math.min(s1, s2, s3) : 0;
    const maxStage = Math.max(s1, s2, s3);
    const balanceFactor = maxStage > 0 ? Math.max(0.65, bottleneck / maxStage) : 1;
    const logisticsMult = 1 + (log * 0.15);
    const siloCapacity = 400 + (log * 80);
    const currentStock = Number(secState.readyStock || 0);
    const isStorageFull = currentStock >= siloCapacity;
    const efficiencyPct = Math.round(balanceFactor * 100);

    const outputRatePerSec = bottleneck > 0 ? (bottleneck * 0.012 * logisticsMult * balanceFactor) : 0;
    const revenueRatePerHour = Math.floor(outputRatePerSec * secDef.product.baseValue * 3600);

    const stageCosts = {};
    Object.keys(secDef.stages).forEach(stKey => {
      const curLvl = Number(secState[stKey] || 0);
      stageCosts[stKey] = Math.floor(secDef.stages[stKey].baseCost * Math.pow(1.65, curLvl));
    });

    let bottleneckStage = null;
    if (secState.unlocked && (s1 > 0 || s2 > 0 || s3 > 0)) {
      if (s1 === 0) bottleneckStage = 'stage1';
      else if (s2 === 0 || s2 < s1) bottleneckStage = 'stage2';
      else if (s3 === 0 || s3 < s2) bottleneckStage = 'stage3';
      else if (log === 0 || log < s3) bottleneckStage = 'logistics';
    }

    return {
      id: sectorId,
      definition: secDef,
      state: secState,
      bottleneck,
      bottleneckStage,
      outputRatePerSec,
      revenueRatePerHour,
      stageCosts,
      siloCapacity,
      isStorageFull,
      efficiencyPct,
      unitsPerContainer: secDef.product.unitsPerContainer || 10,
      canUnlock: (state.netWorth >= secDef.unlockNetWorth) && (((state.cash || 0) + (state.bank || 0)) >= secDef.unlockCost)
    };
  }

  function unlockIndustrySector(sectorId) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك إدارة التراخيص الصناعية.");
    const info = getIndustrySectorState(sectorId);
    if (info.state.unlocked) throw new Error("هذا القطاع الصناعي مرخص ومفعل بالفعل.");

    if (state.netWorth < info.definition.unlockNetWorth) {
      throw new Error(`يتطلب ترخيص هذا القطاع صافي ثروة لا يقل عن ${info.definition.unlockNetWorth.toLocaleString()} EGP.`);
    }

    const cost = info.definition.unlockCost;
    const totalFunds = (state.cash || 0) + (state.bank || 0);
    if (totalFunds < cost) {
      throw new Error(`تكلفة ترخيص هذا القطاع هي ${cost.toLocaleString()} EGP. رصيدك غير كافٍ.`);
    }

    if ((state.cash || 0) >= cost) {
      state.cash -= cost;
    } else {
      const rem = cost - (state.cash || 0);
      state.cash = 0;
      state.bank -= rem;
    }

    info.state.unlocked = true;
    info.state.stage1 = 1;
    info.state.stage2 = 1;
    info.state.stage3 = 1;
    info.state.logistics = 1;

    recordPlayerActivity('ترخيص قطاع صناعي 🏭', `الحصول على رخصة وتأسيس "${info.definition.name}" بتكلفة ${cost.toLocaleString()} EGP`, 'business');
    state.netWorth = calculateNetWorth();
    forceSaveState(false);

    return {
      sectorId,
      name: info.definition.name,
      cost
    };
  }

  function calculateStageMultiUpgrade(sectorId, stageKey, multiplier = 1) {
    const info = getIndustrySectorState(sectorId);
    if (!info || !info.state || !info.state.unlocked) return { count: 0, cost: 0, targetLevel: 0, canAfford: false };

    const stDef = info.definition.stages[stageKey];
    if (!stDef) return { count: 0, cost: 0, targetLevel: 0, canAfford: false };

    const curLvl = Number(info.state[stageKey] || 0);
    if (curLvl >= 50) return { count: 0, cost: 0, targetLevel: 50, canAfford: false };

    const totalFunds = (state.cash || 0) + (state.bank || 0);
    const maxPossible = 50 - curLvl;

    let targetCount = 1;
    if (multiplier === 'max') {
      targetCount = maxPossible;
    } else {
      targetCount = Math.min(parseInt(multiplier) || 1, maxPossible);
    }

    let totalCost = 0;
    let actualCount = 0;

    for (let i = 0; i < targetCount; i++) {
      const lvlToBuy = curLvl + i;
      const stepCost = Math.floor(stDef.baseCost * Math.pow(1.65, lvlToBuy));
      if (multiplier === 'max') {
        if (actualCount > 0 && (totalCost + stepCost > totalFunds)) {
          break;
        }
      }
      totalCost += stepCost;
      actualCount++;
      if (multiplier === 'max' && totalCost > totalFunds) {
        break;
      }
    }

    if (actualCount === 0) {
      actualCount = 1;
      totalCost = Math.floor(stDef.baseCost * Math.pow(1.65, curLvl));
    }

    return {
      count: actualCount,
      cost: totalCost,
      targetLevel: curLvl + actualCount,
      canAfford: totalFunds >= totalCost
    };
  }

  function upgradeIndustryStage(sectorId, stageKey, multiplier = 1) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك ترقية خطوط الإنتاج.");
    const info = getIndustrySectorState(sectorId);
    if (!info.state.unlocked) throw new Error("يجب ترخيص هذا القطاع الصناعي أولاً قبل ترقية خطوطه.");

    const stDef = info.definition.stages[stageKey];
    if (!stDef) throw new Error("المرحلة الصناعية المحددة غير صالحة.");

    const curLvl = Number(info.state[stageKey] || 0);
    if (curLvl >= 50) throw new Error("وصلت هذه المرحلة إلى الحد الأقصى من التوسعة (المستوى 50).");

    const multi = calculateStageMultiUpgrade(sectorId, stageKey, multiplier);
    if (multi.count <= 0) throw new Error("وصلت المرحلة للحد الأقصى أو لا يمكن الترقية.");

    const cost = multi.cost;
    const totalFunds = (state.cash || 0) + (state.bank || 0);
    if (totalFunds < cost) {
      throw new Error(`تكلفة ترقية "${stDef.name}" (+${multi.count} مستويات) هي ${cost.toLocaleString()} EGP. رصيدك لا يكفي.`);
    }

    if ((state.cash || 0) >= cost) {
      state.cash -= cost;
    } else {
      const rem = cost - (state.cash || 0);
      state.cash = 0;
      state.bank -= rem;
    }

    info.state[stageKey] = curLvl + multi.count;
    recordPlayerActivity('تطوير خط إنتاج صناعي ⚙️', `ترقية "${stDef.name}" في ${info.definition.name} بمقدار +${multi.count} (إلى المستوى ${info.state[stageKey]}) بتكلفة ${cost.toLocaleString()} EGP`, 'business');
    state.netWorth = calculateNetWorth();
    forceSaveState(false);

    return {
      sectorId,
      stageKey,
      upgradedLevels: multi.count,
      newLevel: info.state[stageKey],
      cost
    };
  }

  function collectIndustryRevenue(sectorId) {
    const info = getIndustrySectorState(sectorId);
    if (!info.state.unlocked) throw new Error("هذا القطاع غير مرخص.");

    const units = Math.floor(info.state.readyStock || 0);
    if (units <= 0) throw new Error("لا يوجد إنتاج جاهز للبيع في مستودع هذا المصنع حالياً.");

    const unitPrice = info.definition.product.baseValue;
    const grossPayout = units * unitPrice;
    const overheadRate = 0.35; // 35% operational, energy & maintenance expenses
    const overheadCost = Math.floor(grossPayout * overheadRate);
    const netPayout = grossPayout - overheadCost;

    info.state.readyStock -= units;
    state.cash = (state.cash || 0) + netPayout;
    info.state.totalEarned = (info.state.totalEarned || 0) + netPayout;

    recordPlayerActivity('بيع إنتاج صناعي 💰', `بيع ${units.toLocaleString()} وحدة من "${info.definition.product.name}" بإجمالي ${grossPayout.toLocaleString()} EGP (مصاريف تشغيل 35%: -${overheadCost.toLocaleString()} EGP | صافي مودع: +${netPayout.toLocaleString()} EGP)`, 'business');
    state.netWorth = calculateNetWorth();
    forceSaveState(false);

    return {
      units,
      unitPrice,
      grossPayout,
      overheadCost,
      netPayout,
      totalPayout: netPayout
    };
  }

  function transferIndustryGoodsToTradeExport(sectorId) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك إدارة شحنات التصدير.");
    const info = getIndustrySectorState(sectorId);
    if (!info.state.unlocked) throw new Error("هذا القطاع غير مرخص.");

    const units = Math.floor(info.state.readyStock || 0);
    if (units <= 0) throw new Error("لا يوجد مخزون جاهز للتحويل إلى مستودع التصدير الجمركي.");

    const unitsPerContainer = info.unitsPerContainer || 10;
    const maxContainers = Math.floor(units / unitsPerContainer);
    if (maxContainers <= 0) {
      throw new Error(`المخزون المتوفر (${units} وحدة) لا يكفي لتجهيز حاوية تصدير كاملة! يلزم ${unitsPerContainer} وحدة لكل حاوية.`);
    }

    if (!state.tradeCompany) {
      state.tradeCompany = { warehouseCapacity: 10, warehouse: {}, activeImports: [], activeExports: [], totalProfitEarned: 0, totalShipmentsCompleted: 0 };
    }
    if (!state.tradeCompany.warehouse) state.tradeCompany.warehouse = {};

    let currentWarehouseTotal = 0;
    Object.keys(state.tradeCompany.warehouse).forEach(k => {
      currentWarehouseTotal += Number(state.tradeCompany.warehouse[k] || 0);
    });

    const cap = state.tradeCompany.warehouseCapacity || 10;
    const availableSpace = Math.max(0, cap - currentWarehouseTotal);

    if (availableSpace <= 0) {
      throw new Error(`مستودع شركة الاستيراد والتصدير ممتلئ بالكامل (${currentWarehouseTotal}/${cap} حاوية)! قم بتوسيعه أولاً أو بيع البضائع المخزنة.`);
    }

    const containersToTransfer = Math.min(maxContainers, availableSpace);
    const unitsDeducted = containersToTransfer * unitsPerContainer;
    const tradeCommId = info.definition.product.tradeCommodityId || 'espresso_coffee';

    info.state.readyStock -= unitsDeducted;
    state.tradeCompany.warehouse[tradeCommId] = (state.tradeCompany.warehouse[tradeCommId] || 0) + containersToTransfer;
    info.state.totalExported = (info.state.totalExported || 0) + containersToTransfer;

    const commDef = TRADE_COMMODITIES[tradeCommId];
    const commName = commDef ? commDef.name : tradeCommId;

    recordPlayerActivity('شحن لمستودع التصدير 🚢', `تعبئة وشحن ${containersToTransfer} حاوية من "${info.definition.product.name}" (${unitsDeducted} وحدة منتجة) إلى مستودع التصدير كبضاعة "${commName}"!`, 'trade');
    state.netWorth = calculateNetWorth();
    forceSaveState(false);

    return {
      transferred: containersToTransfer,
      unitsDeducted,
      unitsPerContainer,
      tradeCommodityId: tradeCommId,
      commodityName: commName,
      remainingFactoryStock: info.state.readyStock
    };
  }

  function sanitizeGameState() {
    if (!state) return;
    const numFields = ['cash', 'bank', 'dirtyCash', 'netWorth', 'xp', 'dailyCasinoNetProfit', 'dailyCasinoResetAt'];
    numFields.forEach(k => {
      if (typeof state[k] !== 'number' || isNaN(state[k]) || !isFinite(state[k]) || state[k] < 0) {
        state[k] = 0;
      }
      if (state[k] > Number.MAX_SAFE_INTEGER) {
        state[k] = Number.MAX_SAFE_INTEGER;
      }
    });
  }

  function forceSaveState(immediate = false) {
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
    MAX_CASINO_DAILY_PROFIT,
    CASINO_COOLDOWN_MS,
    CASINO_HOUSE_RAKE,
    checkCasinoAllowedAndDeduct,
    settleCasinoRound,
    playCoinFlip,
    playSlots,
    playDice,
    playRoulette,
    playWheelOfFortune,
    calculateTaxReport,
    setTaxConfig,
    getTaxConfig: () => taxConfig,
    fileTaxDeclaration,
    calculatePassiveIncomePerHour,
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
    syncUnifiedStocks,
    getStockSessionTimeRemaining,
    STOCK_TICK_INTERVAL_MS,

    // Daily Quests Exports
    DAILY_QUEST_TEMPLATES,
    ensureDailyQuests,
    getTodayDateString,
    getDailyResetRemainingSeconds,
    ensureDailyLoanTracking,
    ensureDailyToolTracking,
    trackDailyQuestProgress,
    claimDailyQuestReward,
    claimGrandDailyBonus,

    // Business Supply Method
    supplyBusiness,
    recordPlayerActivity,

    // Import & Export Company Exports
    TRADE_COMMODITIES,
    TRADE_BUYERS,
    getTradeCompanyState,
    buyImportCargo,
    sellExportCargo,
    claimExportProfit,
    upgradeWarehouse,

    // Industrial Supply Chain Empire Exports
    INDUSTRIAL_SECTORS,
    ensureIndustryState,
    getIndustrySectorState,
    unlockIndustrySector,
    calculateStageMultiUpgrade,
    upgradeIndustryStage,
    collectIndustryRevenue,
    transferIndustryGoodsToTradeExport
  };
})();

// Export globally
if (typeof window !== "undefined") {
  window.GameEngine = GameEngine;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = GameEngine;
}
