/**
 * Ras ALmal Tycoon — Core Economic Definitions
 * Extracted from game.js for Headless Server Validation
 */

const BUSINESSES = {
  kiosk: {
    id: 'kiosk',
    name: 'كشك حلوى وجرائد ومشروبات',
    cost: 1275,
    baseDemand: 29,
    optimumPrice: 20,
    costOfGoods: 10,
    maxWorkers: 50,
    workerMultiplier: 1.08,
    workerWage: 4,
    allowFranchise: true
  },
  coffee: {
    id: 'coffee',
    name: 'عربة قهوة ومأكولات خفيفة',
    cost: 5780,
    baseDemand: 40,
    optimumPrice: 32,
    costOfGoods: 16,
    maxWorkers: 50,
    workerMultiplier: 1.08,
    workerWage: 10,
    allowFranchise: true
  },
  tech: {
    id: 'tech',
    name: 'شركة برمجيات وتطبيقات',
    cost: 119000,
    baseDemand: 52,
    optimumPrice: 120,
    costOfGoods: 45,
    maxWorkers: 50,
    workerMultiplier: 1.08,
    workerWage: 60,
    allowFranchise: true
  },
  logistics: {
    id: 'logistics',
    name: 'مجمع خدمات لوجستية وشحن',
    cost: 663000,
    baseDemand: 92,
    optimumPrice: 260,
    costOfGoods: 100,
    maxWorkers: 50,
    workerMultiplier: 1.08,
    workerWage: 200,
    allowFranchise: true
  },
  supermarket: {
    id: 'supermarket',
    name: 'سلسلة سوبرماركت وتجزئة',
    cost: 2720000,
    baseDemand: 161,
    optimumPrice: 500,
    costOfGoods: 200,
    maxWorkers: 50,
    workerMultiplier: 1.08,
    workerWage: 500,
    allowFranchise: true
  },
  solar_factory: {
    id: 'solar_factory',
    name: 'مصنع ألواح الطاقة الشمسية ',
    cost: 11900000,
    baseDemand: 253,
    optimumPrice: 1100,
    costOfGoods: 450,
    maxWorkers: 50,
    workerMultiplier: 1.08,
    workerWage: 1500,
    allowFranchise: false
  },
  private_hospital: {
    id: 'private_hospital',
    name: 'مستشفى ومجمع طبي تخصصي',
    cost: 46750000,
    baseDemand: 402,
    optimumPrice: 2400,
    costOfGoods: 1000,
    maxWorkers: 50,
    workerMultiplier: 1.08,
    workerWage: 4000,
    allowFranchise: false
  },
  media_studio: {
    id: 'media_studio',
    name: 'مؤسسة إنتاج إعلامي وسينمائي',
    cost: 136000000,
    baseDemand: 575,
    optimumPrice: 4500,
    costOfGoods: 1900,
    maxWorkers: 50,
    workerMultiplier: 1.08,
    workerWage: 10000,
    allowFranchise: false
  },
  private_bank: {
    id: 'private_bank',
    name: 'بنك استثماري وشركة وساطة مالية ',
    cost: 442000000,
    baseDemand: 805,
    optimumPrice: 8800,
    costOfGoods: 3600,
    maxWorkers: 50,
    workerMultiplier: 1.08,
    workerWage: 25000,
    allowFranchise: false
  },
  oil_refinery: {
    id: 'oil_refinery',
    name: 'مجمع مصافي البترول والطاقة ',
    cost: 1360000000,
    baseDemand: 862,
    optimumPrice: 16000,
    costOfGoods: 7000,
    maxWorkers: 50,
    workerMultiplier: 1.08,
    workerWage: 45000,
    allowFranchise: false
  },
  space_tech: {
    id: 'space_tech',
    name: 'مؤسسة استكشاف الفضاء والأقمار الصناعية',
    cost: 4080000000,
    baseDemand: 920,
    optimumPrice: 28000,
    costOfGoods: 12000,
    maxWorkers: 50,
    workerMultiplier: 1.08,
    workerWage: 90000,
    allowFranchise: false
  }
};

const ASSETS = {
  apartment: { id: 'apartment', name: 'شقة سكنية مؤجرة', cost: 212500, rent: 98, appreciation: 0.0004 },
  office: { id: 'office', name: 'مبنى مكاتب تجارية', cost: 1360000, rent: 598, appreciation: 0.0006 },
  commercial_center: { id: 'commercial_center', name: 'مركز تجاري وسوق متكامل', cost: 6800000, rent: 2880, appreciation: 0.0007 },
  mansion: { id: 'mansion', name: 'قصر ريفي فاخر', cost: 6120000, rent: 2760, appreciation: 0.0008 },
  skyline_tower: { id: 'skyline_tower', name: 'برج ناطحة سحاب تجاري', cost: 29750000, rent: 13225, appreciation: 0.0010 },
  hotel: { id: 'hotel', name: 'منتجع وفندق 5 نجوم', cost: 38250000, rent: 15400, appreciation: 0.0008 },
  luxury_resort: { id: 'luxury_resort', name: 'منتجع وفندق سياحي 5 نجوم', cost: 136000000, rent: 59800, appreciation: 0.0012 },
  private_island: { id: 'private_island', name: 'جزيرة خاصة سياحية', cost: 191250000, rent: 74000, appreciation: 0.0009 },
  mega_yacht: { id: 'mega_yacht', name: 'يخت عملاق فاره', cost: 680000000, rent: 240000, appreciation: 0.001 },
  orbital_station: { id: 'orbital_station', name: 'محطة أبحاث مدارية خاصة', cost: 2550000000, rent: 850000, appreciation: 0.0012 }
};

const STOCKS = {
  COMI: { name: 'البنك التجاري الدولي', symbol: 'COMI', basePrice: 38, volatility: 0.018, reversion: 0.015, floor: 32, ceiling: 46, dividend: 0.00015, maxShares: 50000, seed: 101 },
  EAST: { name: 'الشرقية للدخان', symbol: 'EAST', basePrice: 85, volatility: 0.020, reversion: 0.015, floor: 70, ceiling: 102, dividend: 0.00025, maxShares: 30000, seed: 202 },
  ETEL: { name: 'المصرية للاتصالات', symbol: 'ETEL', basePrice: 48, volatility: 0.018, reversion: 0.015, floor: 40, ceiling: 58, dividend: 0.00018, maxShares: 40000, seed: 303 },
  FWRY: { name: 'فوري للمدفوعات الإلكترونية', symbol: 'FWRY', basePrice: 92, volatility: 0.035, reversion: 0.018, floor: 68, ceiling: 135, dividend: 0.00015, maxShares: 25000, seed: 457 },
  CASH: { name: 'صندوق الاستثمار التقني البديل', symbol: 'CASH', basePrice: 125, volatility: 0.025, reversion: 0.022, floor: 105, ceiling: 150, dividend: 0.00035, maxShares: 20000, seed: 505 },
  BITC: { name: 'مؤشر البيتكوين والأصول الرقمية', symbol: 'BITC', basePrice: 310, volatility: 0.040, reversion: 0.025, floor: 230, ceiling: 410, dividend: 0, maxShares: 5000, seed: 606 },
  GOLD: { name: 'صندوق سبائك الذهب الخالص', symbol: 'GOLD', basePrice: 220, volatility: 0.012, reversion: 0.01, floor: 195, ceiling: 250, dividend: 0.0003, maxShares: 10000, seed: 707 },
  AIX: { name: 'صندوق الذكاء الاصطناعي العالمي', symbol: 'AIX', basePrice: 380, volatility: 0.030, reversion: 0.02, floor: 300, ceiling: 470, dividend: 0.00025, maxShares: 8000, seed: 808 }
};

const TITLES = [
  { minWorth: 1000000000, minXp: 50000, title: 'سلطان الاقتصاد العالمي' },
  { minWorth: 500000000, minXp: 30000, title: 'إمبراطور المال والفلوس' },
  { minWorth: 150000000, minXp: 15000, title: 'حوت المال الدولي' },
  { minWorth: 50000000, minXp: 7500, title: 'ملياردير عصامي' },
  { minWorth: 15000000, minXp: 3500, title: 'مليونير فخم' },
  { minWorth: 4000000, minXp: 1500, title: 'سيد الأعمال' },
  { minWorth: 1000000, minXp: 600, title: 'مستثمر طموح' },
  { minWorth: 200000, minXp: 200, title: 'تاجر صاعد' },
  { minWorth: 0, minXp: 80, title: 'موظف متميز' },
  { minWorth: 0, minXp: 25, title: 'عامل ماهر ' },
  { minWorth: 0, minXp: 0, title: 'عامل مبتدئ' }
];

const CAR_TEMPLATES = {
  lambo: {
    id: 'lambo',
    name: 'Lamborghini Aventador',
    cost: 15000000,
    rentalIncomePerTick: 2200,
    maintenanceCostPerTick: 800
  },
  rolls: {
    id: 'rolls',
    name: 'Rolls-Royce Phantom',
    cost: 40000000,
    rentalIncomePerTick: 5000,
    maintenanceCostPerTick: 1800
  },
  shelby: {
    id: 'shelby',
    name: 'Shelby Cobra 1965',
    cost: 120000000,
    rentalIncomePerTick: 12000,
    maintenanceCostPerTick: 4000
  }
};

const INDUSTRIAL_SECTORS = {
  food: {
    id: 'food',
    name: 'الصناعات الغذائية وسلاسل الإمداد الزراعي',
    unlockCost: 1500000,
    stages: {
      stage1: { baseCost: 120000 },
      stage2: { baseCost: 350000 },
      stage3: { baseCost: 950000 },
      logistics: { baseCost: 450000 }
    },
    product: { baseValue: 500 }
  },
  auto: {
    id: 'auto',
    name: 'تجميع وتصنيع السيارات والمركبات',
    unlockCost: 15000000,
    stages: {
      stage1: { baseCost: 1200000 },
      stage2: { baseCost: 3500000 },
      stage3: { baseCost: 9500000 },
      logistics: { baseCost: 4200000 }
    },
    product: { baseValue: 3200 }
  },
  semiconductor: {
    id: 'semiconductor',
    name: 'الرقائق وأشباه الموصلات وسيرفرات AI',
    unlockCost: 80000000,
    stages: {
      stage1: { baseCost: 8500000 },
      stage2: { baseCost: 24000000 },
      stage3: { baseCost: 65000000 },
      logistics: { baseCost: 28000000 }
    },
    product: { baseValue: 12500 }
  },
  petrochemical: {
    id: 'petrochemical',
    name: 'الطاقة ومجمعات البتروكيماويات والبلمرة',
    unlockCost: 350000000,
    stages: {
      stage1: { baseCost: 45000000 },
      stage2: { baseCost: 120000000 },
      stage3: { baseCost: 320000000 },
      logistics: { baseCost: 140000000 }
    },
    product: { baseValue: 38000 }
  }
};

const TRADE_COMMODITIES = {
  fashion_brands: {
    id: 'fashion_brands',
    name: 'أزياء وملابس ماركات عالمية',
    tier: 'air_cargo',
    unitCost: 5000,
    importDurationSec: 2700,
    exportDurationSec: 2700,
    baseSellMin: 5900,
    baseSellMax: 6250
  },
  espresso_coffee: {
    id: 'espresso_coffee',
    name: 'بن إسبريسو كولومبي فاخر',
    tier: 'air_cargo',
    unitCost: 8000,
    importDurationSec: 4500,
    exportDurationSec: 4500,
    baseSellMin: 9500,
    baseSellMax: 10200
  },
  auto_spare_parts: {
    id: 'auto_spare_parts',
    name: 'قطع غيار سيارات أوروبية أصلية',
    tier: 'regional_freight',
    unitCost: 25000,
    importDurationSec: 10800,
    exportDurationSec: 10800,
    baseSellMin: 29500,
    baseSellMax: 32000,
    dailyExportQuota: 15
  },
  solar_panels: {
    id: 'solar_panels',
    name: 'ألواح وخلايا طاقة شمسية ألمانية',
    tier: 'regional_freight',
    unitCost: 50000,
    importDurationSec: 18000,
    exportDurationSec: 18000,
    baseSellMin: 60000,
    baseSellMax: 65000,
    dailyExportQuota: 10
  },
  luxury_cars: {
    id: 'luxury_cars',
    name: 'سيارات فارهة ومدرعة مستوردة',
    tier: 'ocean_shipping',
    unitCost: 120000,
    importDurationSec: 28800,
    exportDurationSec: 28800,
    baseSellMin: 145000,
    baseSellMax: 156000,
    dailyExportQuota: 6
  },
  industrial_turbines: {
    id: 'industrial_turbines',
    name: 'توربينات وخطوط إنتاج صناعية ثقيلة',
    tier: 'ocean_shipping',
    unitCost: 250000,
    importDurationSec: 43200,
    exportDurationSec: 43200,
    baseSellMin: 305000,
    baseSellMax: 335000,
    dailyExportQuota: 4
  },
  ai_quantum_chips: {
    id: 'ai_quantum_chips',
    name: 'رقائق ومعالجات ذكاء اصطناعي سيليكونية',
    tier: 'mega_oceanic',
    unitCost: 500000,
    importDurationSec: 64800,
    exportDurationSec: 64800,
    baseSellMin: 610000,
    baseSellMax: 670000,
    dailyExportQuota: 3
  },
  gold_bullion_bars: {
    id: 'gold_bullion_bars',
    name: 'سبائك ذهب ومعادن نادرة نقية',
    tier: 'mega_oceanic',
    unitCost: 1000000,
    importDurationSec: 86400,
    exportDurationSec: 86400,
    baseSellMin: 1220000,
    baseSellMax: 1350000,
    dailyExportQuota: 2
  }
};


const INVESTMENTS = {
  short: {
    id: 'short',
    name: 'وديعة بنكية سريعة',
    durationTicks: 3600,
    rate: 0.015,
    minAmount: 5000,
    maxAmount: 100000
  },
  medium: {
    id: 'medium',
    name: 'صندوق استثمار عقاري وسندات',
    durationTicks: 10800,
    rate: 0.035,
    minAmount: 25000,
    maxAmount: 350000
  },
  long: {
    id: 'long',
    name: 'صندوق أسهم وتحوط دولي خاص',
    durationTicks: 28800,
    rate: 0.07,
    minAmount: 100000,
    maxAmount: 1200000
  },
  venture: {
    id: 'venture',
    name: 'صندوق الاكتتابات والشركات المليارية',
    durationTicks: 64800,
    rate: 0.12,
    minAmount: 500000,
    maxAmount: 4000000
  },
  imperial: {
    id: 'imperial',
    name: 'صندوق الثروة الإمبراطوري الماسي',
    durationTicks: 129600,
    rate: 0.18,
    minAmount: 2000000,
    maxAmount: 10000000
  }
};

const STORE_ITEMS = {
  gold_pen: { id: 'gold_pen', name: 'القلم الذهبي للمدراء', cost: 20000, durationTicks: 180, cooldownSec: 600, maxDailyUses: 4 },
  premium_lawyer: { id: 'premium_lawyer', name: 'توكيل محامٍ دولي قدير', cost: 100000, durationTicks: 300, cooldownSec: 900, maxDailyUses: 3 },
  energy_drink: { id: 'energy_drink', name: 'مشروب الطاقة والتركيز الفائق', cost: 25000, durationTicks: 90, cooldownSec: 480, maxDailyUses: 5 },
  tax_shield: { id: 'tax_shield', name: 'درع الإعفاء والملاذ الضريبي', cost: 600000, durationTicks: 7200, cooldownSec: 86400, maxDailyUses: 1 },
  market_scanner: { id: 'market_scanner', name: 'ماسح البورصة والتداول الذكي', cost: 200000, durationTicks: 240, cooldownSec: 1200, maxDailyUses: 3 }
};

const BLACK_MARKET = {
  contraband_cigars: {
    id: 'contraband_cigars',
    name: 'تهريب بضائع وسيجار جمركي فاخر',
    cost: 6000,
    payout: 8500,
    successChance: 0.70,
    jailDuration: 15,
    repGain: 5,
    repLoss: 10,
    repNeeded: 0,
    cooldownSec: 90
  },
  electronics: {
    id: 'electronics',
    name: 'تهريب حاوية أجهزة إلكترونية حديثة',
    cost: 35000,
    payout: 48000,
    successChance: 0.60,
    jailDuration: 30,
    repGain: 10,
    repLoss: 20,
    repNeeded: 0,
    cooldownSec: 180
  },
  arms_intel: {
    id: 'arms_intel',
    name: 'صفقة تسريب سيرفرات وبيانات استخباراتية',
    cost: 120000,
    payout: 165000,
    successChance: 0.50,
    jailDuration: 50,
    repGain: 25,
    repLoss: 50,
    repNeeded: 0,
    cooldownSec: 360
  },
  swiss_laundry: {
    id: 'swiss_laundry',
    name: 'مركز غسيل الأموال السويسري',
    cost: 1000000,
    payout: 880000,
    successChance: 1.0,
    jailDuration: 0,
    repGain: 0,
    repLoss: 0,
    repNeeded: 250,
    cooldownSec: 900,
    cleanPayout: true,
    requireDirtyCost: true
  },
  crypto: {
    id: 'crypto',
    name: 'اختراق منصات رقمية وغسيل عملات مشفرة',
    cost: 400000,
    payout: 540000,
    successChance: 0.42,
    jailDuration: 80,
    repGain: 50,
    repLoss: 100,
    repNeeded: 120,
    cooldownSec: 600
  },
  artifacts: {
    id: 'artifacts',
    name: 'تهريب آثار ومخطوطات نادرة لمزادات سرية',
    cost: 1500000,
    payout: 2050000,
    successChance: 0.35,
    jailDuration: 110,
    repGain: 100,
    repLoss: 200,
    repNeeded: 500,
    cooldownSec: 1200
  },
  diamond_heist: {
    id: 'diamond_heist',
    name: 'عملية السطو الكبرى على خزائن الماس الدولية',
    cost: 5000000,
    payout: 6750000,
    successChance: 0.30,
    jailDuration: 150,
    repGain: 250,
    repLoss: 500,
    repNeeded: 1500,
    cooldownSec: 1800
  },
  defense_tech: {
    id: 'defense_tech',
    name: 'صفقة تكنولوجيا دفاعية وشفرات رادار مسربة',
    cost: 18000000,
    payout: 24000000,
    successChance: 0.25,
    jailDuration: 200,
    repGain: 500,
    repLoss: 1000,
    repNeeded: 4500,
    cooldownSec: 3000
  },
  uranium_smuggling: {
    id: 'uranium_smuggling',
    name: 'تهريب اليورانيوم المخصب الدولي',
    cost: 35000000,
    payout: 46000000,
    successChance: 0.22,
    jailDuration: 220,
    repGain: 800,
    repLoss: 1600,
    repNeeded: 3200,
    cooldownSec: 4500
  },
  satellite_hack: {
    id: 'satellite_hack',
    name: 'السيطرة على شبكة أقمار صناعية وتشفيرها',
    cost: 60000000,
    payout: 78000000,
    successChance: 0.20,
    jailDuration: 260,
    repGain: 1000,
    repLoss: 2000,
    repNeeded: 4500,
    cooldownSec: 7200
  },
  central_bank_hack: {
    id: 'central_bank_hack',
    name: 'قرصنة واختراق البنوك المركزية',
    cost: 80000000,
    payout: 104000000,
    successChance: 0.18,
    jailDuration: 300,
    repGain: 1500,
    repLoss: 3000,
    repNeeded: 6500,
    cooldownSec: 10800
  },
  godfather: {
    id: 'godfather',
    name: 'عملية العراب: السيطرة على كارتيل التجارة العالمي',
    cost: 100000000,
    payout: 130000000,
    successChance: 0.16,
    jailDuration: 360,
    repGain: 2500,
    repLoss: 5000,
    repNeeded: 10000,
    cooldownSec: 14400
  }
};

const BLACK_MARKET_GEAR = {
  radar_jammer: { id: 'radar_jammer', name: 'جهاز تشويش رادارات الشرطة', cost: 80000, durationTicks: 240 },
  fake_passport: { id: 'fake_passport', name: 'جواز سفر دبلوماسي مزور', cost: 600000, durationTicks: 300 },
  crypto_cleaner: { id: 'crypto_cleaner', name: 'بروتوكول تشفير مالي (Zero-Trace)', cost: 200000, durationTicks: 200 },
  diplomatic_bag: { id: 'diplomatic_bag', name: 'حقيبة التشفير الدبلوماسية المصفحة', cost: 800000, durationTicks: 360 }
};

const SMUGGLING_VEHICLES = {
  speedboat: { id: 'speedboat', name: 'قارب سريع مضاد للرادار', cost: 2000000, capacity: 50 },
  plane: { id: 'plane', name: 'طائرة شحن جوي خفيفة', cost: 15000000, capacity: 200 },
  ship: { id: 'ship', name: 'سفينة حاويات عملاقة', cost: 60000000, capacity: 1000 }
};

module.exports = {
  BUSINESSES,
  ASSETS,
  STOCKS,
  TITLES,
  CAR_TEMPLATES,
  INDUSTRIAL_SECTORS,
  TRADE_COMMODITIES,
  INVESTMENTS,
  STORE_ITEMS,
  BLACK_MARKET,
  BLACK_MARKET_GEAR,
  SMUGGLING_VEHICLES
};

