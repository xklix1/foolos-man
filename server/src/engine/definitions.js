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
    maxWorkers: 5,
    workerMultiplier: 1.08,
    workerWage: 4
  },
  coffee: {
    id: 'coffee',
    name: 'عربة قهوة ومأكولات خفيفة',
    cost: 5780,
    baseDemand: 40,
    optimumPrice: 32,
    costOfGoods: 16,
    maxWorkers: 8,
    workerMultiplier: 1.08,
    workerWage: 10
  },
  tech: {
    id: 'tech',
    name: 'شركة برمجيات وتطبيقات',
    cost: 119000,
    baseDemand: 52,
    optimumPrice: 120,
    costOfGoods: 45,
    maxWorkers: 10,
    workerMultiplier: 1.08,
    workerWage: 60
  },
  logistics: {
    id: 'logistics',
    name: 'مجمع خدمات لوجستية وشحن',
    cost: 663000,
    baseDemand: 92,
    optimumPrice: 260,
    costOfGoods: 100,
    maxWorkers: 12,
    workerMultiplier: 1.08,
    workerWage: 200
  },
  supermarket: {
    id: 'supermarket',
    name: 'سلسلة سوبرماركت وتجزئة',
    cost: 2720000,
    baseDemand: 161,
    optimumPrice: 500,
    costOfGoods: 200,
    maxWorkers: 15,
    workerMultiplier: 1.08,
    workerWage: 500
  },
  solar_factory: {
    id: 'solar_factory',
    name: 'مصنع ألواح الطاقة الشمسية ☀️',
    cost: 11900000,
    baseDemand: 253,
    optimumPrice: 1100,
    costOfGoods: 450,
    maxWorkers: 18,
    workerMultiplier: 1.08,
    workerWage: 1500
  },
  private_hospital: {
    id: 'private_hospital',
    name: 'مستشفى ومجمع طبي تخصصي',
    cost: 46750000,
    baseDemand: 402,
    optimumPrice: 2400,
    costOfGoods: 1000,
    maxWorkers: 20,
    workerMultiplier: 1.08,
    workerWage: 4000
  },
  media_studio: {
    id: 'media_studio',
    name: 'مؤسسة إنتاج إعلامي وسينمائي',
    cost: 136000000,
    baseDemand: 575,
    optimumPrice: 4500,
    costOfGoods: 1900,
    maxWorkers: 22,
    workerMultiplier: 1.08,
    workerWage: 10000
  },
  private_bank: {
    id: 'private_bank',
    name: 'بنك استثماري وشركة وساطة مالية 🏛️',
    cost: 442000000,
    baseDemand: 805,
    optimumPrice: 8800,
    costOfGoods: 3600,
    maxWorkers: 25,
    workerMultiplier: 1.08,
    workerWage: 25000
  },
  oil_refinery: {
    id: 'oil_refinery',
    name: 'مجمع مصافي البترول والطاقة 🛢️',
    cost: 1360000000,
    baseDemand: 862,
    optimumPrice: 16000,
    costOfGoods: 7000,
    maxWorkers: 28,
    workerMultiplier: 1.08,
    workerWage: 45000
  },
  space_tech: {
    id: 'space_tech',
    name: 'مؤسسة استكشاف الفضاء والأقمار الصناعية',
    cost: 4080000000,
    baseDemand: 920,
    optimumPrice: 28000,
    costOfGoods: 12000,
    maxWorkers: 30,
    workerMultiplier: 1.08,
    workerWage: 90000
  }
};

const ASSETS = {
  apartment: { id: 'apartment', name: 'شقة سكنية مؤجرة', cost: 212500, rent: 98, appreciation: 0.0004 },
  office: { id: 'office', name: 'مبنى مكاتب تجارية', cost: 1360000, rent: 598, appreciation: 0.0006 },
  commercial_center: { id: 'commercial_center', name: 'مركز تجاري وسوق متكامل', cost: 6800000, rent: 2880, appreciation: 0.0007 },
  hotel: { id: 'hotel', name: 'منتجع وفندق 5 نجوم', cost: 38250000, rent: 15400, appreciation: 0.0008 },
  private_island: { id: 'private_island', name: 'جزيرة خاصة سياحية', cost: 191250000, rent: 74000, appreciation: 0.0009 },
  mega_yacht: { id: 'mega_yacht', name: 'يخت عملاق فاره', cost: 680000000, rent: 240000, appreciation: 0.001 },
  orbital_station: { id: 'orbital_station', name: 'محطة أبحاث مدارية خاصة', cost: 2550000000, rent: 850000, appreciation: 0.0012 }
};

const STOCKS = {
  ARAMCO: { symbol: 'ARAMCO', name: 'أرامكو للنفط', basePrice: 32 },
  ALRAJHI: { symbol: 'ALRAJHI', name: 'مصرف الراجحي', basePrice: 85 },
  STC: { symbol: 'STC', name: 'إس تي سي اتصالات', basePrice: 40 },
  SABIC: { symbol: 'SABIC', name: 'سابك للصناعات', basePrice: 78 }
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
  { minWorth: 0, minXp: 25, title: 'عامل ماهر 🛠️' },
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

module.exports = {
  BUSINESSES,
  ASSETS,
  STOCKS,
  TITLES,
  CAR_TEMPLATES
};

