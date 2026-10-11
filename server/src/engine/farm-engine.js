/**
 * Ras ALmal Tycoon — Authoritative Farm Engine
 * 100% Server-Authoritative Logic for Agricultural Land, Crops, Livestock, and B2B Contracts.
 * Immune to client-side clock tampering / time travel exploits.
 */

const DAILY_FARM_LIQUIDATION_CAP = 20000000; // 20M EGP per calendar day (Cairo time)
const { calculateNetWorth, getAppropriateTitle } = require('./net-worth-engine');

const FARM_CONFIG = {
  unlockCost: 1000000,
  basePlots: 4,
  landExpansions: {
    2: { plots: 8, cost: 500000, name: 'استصلاح القطعة الشرقية (8 أحواض)' },
    3: { plots: 12, cost: 3000000, name: 'ضم بساتين الواحة (12 حوضاً)' },
    4: { plots: 16, cost: 10000000, name: 'المجمع الزراعي العملاق (16 حوضاً)' }
  },
  irrigation: {
    1: { name: 'ري تقليدي يدوي', cost: 0, speedBonus: 0, icon: 'fa-solid fa-bucket' },
    2: { name: 'شبكة رشاشات مائية', cost: 50000, speedBonus: 0.15, icon: 'fa-solid fa-shower' },
    3: { name: 'ري بالتنقيط المحوسب', cost: 250000, speedBonus: 0.35, icon: 'fa-solid fa-faucet-drip' },
    4: { name: 'محطة هيدروبونيك رقمية فائقة', cost: 1000000, speedBonus: 0.55, icon: 'fa-solid fa-water' }
  },
  fertilizers: {
    1: { name: 'تربة اعتيادية', cost: 0, yieldBonus: 0, icon: 'fa-solid fa-mound' },
    2: { name: 'سماد عضوي نباتي', cost: 40000, yieldBonus: 0.10, icon: 'fa-solid fa-leaf' },
    3: { name: 'سماد نيتروجيني فائق NPK', cost: 200000, yieldBonus: 0.20, icon: 'fa-solid fa-flask-vial' },
    4: { name: 'مخصبات نانو بيوتكنولوجي', cost: 800000, yieldBonus: 0.35, icon: 'fa-solid fa-dna' }
  },
  workerCost: 30000,
  maxWorkers: 4,
  siloLevels: {
    1: { capacity: 500, cost: 0, name: 'مستودع وصومعة ريفية تقليدية (500 وحدة)' },
    2: { capacity: 1500, cost: 250000, name: 'صوامع غلال خرسانية حديثة (1,500 وحدة)' },
    3: { capacity: 4000, cost: 1000000, name: 'مستودعات تبريد لوجستية (4,000 وحدة)' },
    4: { capacity: 10000, cost: 3500000, name: 'المجمع اللوجستي الزراعي العملاق (10,000 وحدة)' }
  }
};

const FARM_CROPS = {
  wheat: {
    id: 'wheat',
    name: 'القمح الذهبي',
    icon: 'fa-solid fa-wheat-awn',
    color: 'amber',
    seedCost: 50,
    growSeconds: 60,
    baseYield: 10,
    sellPrice: 6
  },
  tomato: {
    id: 'tomato',
    name: 'طماطم وخضار طازجة',
    icon: 'fa-solid fa-carrot',
    color: 'rose',
    seedCost: 200,
    growSeconds: 180,
    baseYield: 10,
    sellPrice: 24
  },
  strawberry: {
    id: 'strawberry',
    name: 'فراولة عضوية فاخرة',
    icon: 'fa-solid fa-apple-whole',
    color: 'red',
    seedCost: 1000,
    growSeconds: 480,
    baseYield: 10,
    sellPrice: 118
  },
  coffee: {
    id: 'coffee',
    name: 'حبوب البن العربي',
    icon: 'fa-solid fa-mug-hot',
    color: 'yellow',
    seedCost: 5000,
    growSeconds: 1200,
    baseYield: 12,
    sellPrice: 490
  },
  dates: {
    id: 'dates',
    name: 'نخيل تمور المجدول',
    icon: 'fa-solid fa-tree',
    color: 'emerald',
    seedCost: 25000,
    growSeconds: 3600,
    baseYield: 12,
    sellPrice: 2450
  },
  saffron: {
    id: 'saffron',
    name: 'الزعفران الإمبراطوري',
    icon: 'fa-solid fa-spa',
    color: 'purple',
    seedCost: 100000,
    growSeconds: 10800,
    baseYield: 12,
    sellPrice: 9800
  }
};

const FARM_RECIPES = {
  flour_bread: {
    id: 'flour_bread',
    name: 'سلة مخبوزات ودقيق فاخر',
    inputCrop: 'wheat',
    inputQty: 5,
    outputQty: 1,
    baseValue: 35
  },
  tomato_paste: {
    id: 'tomato_paste',
    name: 'صلصة معلبة وكاتشب تصدير',
    inputCrop: 'tomato',
    inputQty: 5,
    outputQty: 1,
    baseValue: 142
  },
  strawberry_jam: {
    id: 'strawberry_jam',
    name: 'مربى فراولة طبيعية فاخرة',
    inputCrop: 'strawberry',
    inputQty: 4,
    outputQty: 1,
    baseValue: 555
  },
  premium_coffee: {
    id: 'premium_coffee',
    name: 'عبوة بن مختص Specialty Coffee',
    inputCrop: 'coffee',
    inputQty: 4,
    outputQty: 1,
    baseValue: 2300
  },
  stuffed_dates: {
    id: 'stuffed_dates',
    name: 'صندوق تمور ملكية بالمكسرات',
    inputCrop: 'dates',
    inputQty: 4,
    outputQty: 1,
    baseValue: 11500
  },
  saffron_essence: {
    id: 'saffron_essence',
    name: 'مستخلص الزعفران الصافي (قطرات الذهب)',
    inputCrop: 'saffron',
    inputQty: 3,
    outputQty: 1,
    baseValue: 34500
  }
};

const FARM_LIVESTOCK_CONFIG = {
  cow: {
    id: 'cow',
    name: 'أبقار هولشتاين الحلوب',
    cost: 25000,
    maxCount: 8,
    produceIntervalSeconds: 90,
    compostIntervalSeconds: 240,
    milkYield: 2,
    compostYield: 1,
    maxCompost: 25,
    sellPrice: 45
  },
  chicken: {
    id: 'chicken',
    name: 'عنابر الدجاج البياض',
    cost: 8000,
    maxCount: 10,
    produceIntervalSeconds: 120,
    eggYield: 1,
    sellPrice: 15
  }
};

function getCairoTodayStr(serverNow = Date.now()) {
  const d = new Date(serverNow + (3 * 3600 * 1000));
  return d.toISOString().split('T')[0];
}

function ensureFarmState(state) {
  if (!state.farm || typeof state.farm !== 'object') {
    state.farm = {
      unlocked: false,
      landLevel: 1,
      maxPlots: FARM_CONFIG.basePlots,
      plots: Array(FARM_CONFIG.basePlots).fill(null),
      waterLevel: 1,
      fertilizerLevel: 1,
      siloLevel: 1,
      workers: 0,
      inventory: {},
      processedGoods: {},
      livestock: {
        cows: 0,
        chickens: 0,
        milk: 0,
        eggs: 0,
        compost: 0,
        lastCowTick: Date.now(),
        lastChickenTick: Date.now()
      },
      contracts: [],
      dailyLiquidation: {
        date: getCairoTodayStr(),
        totalLiquidated: 0
      },
      stats: { totalHarvested: 0, totalRevenue: 0 }
    };
  }
  const f = state.farm;
  if (!f.plots || !Array.isArray(f.plots)) {
    f.plots = Array(f.maxPlots || 4).fill(null);
  }
  if (!f.inventory || typeof f.inventory !== 'object') f.inventory = {};
  if (!f.processedGoods || typeof f.processedGoods !== 'object') f.processedGoods = {};
  if (!f.livestock || typeof f.livestock !== 'object') {
    f.livestock = { cows: 0, chickens: 0, milk: 0, eggs: 0, compost: 0, lastCowTick: Date.now(), lastChickenTick: Date.now() };
  }
  const today = getCairoTodayStr();
  if (!f.dailyLiquidation || f.dailyLiquidation.date !== today) {
    f.dailyLiquidation = { date: today, totalLiquidated: 0 };
  }
  return f;
}

function getFarmStorageCapacity(farm) {
  const lvl = farm.siloLevel || 1;
  const def = FARM_CONFIG.siloLevels[lvl] || FARM_CONFIG.siloLevels[1];
  return def.capacity || 500;
}

function getFarmStoredUnits(farm) {
  let total = 0;
  if (farm.inventory) {
    Object.values(farm.inventory).forEach(v => { total += Math.max(0, Number(v) || 0); });
  }
  if (farm.processedGoods) {
    Object.values(farm.processedGoods).forEach(v => { total += Math.max(0, Number(v) || 0); });
  }
  if (farm.livestock) {
    total += Math.max(0, Number(farm.livestock.milk) || 0);
    total += Math.max(0, Number(farm.livestock.eggs) || 0);
  }
  return total;
}

function calculateCropGrowDuration(cropId, farm) {
  const crop = FARM_CROPS[cropId];
  if (!crop) return 60000;
  const irrigationDef = FARM_CONFIG.irrigation[farm.waterLevel] || FARM_CONFIG.irrigation[1];
  const speedBonus = irrigationDef ? (irrigationDef.speedBonus || 0) : 0;
  return Math.max(5000, Math.round(crop.growSeconds * (1 - speedBonus) * 1000));
}
function deductFunds(state, cost) {
  const totalFunds = (Number(state.cash) || 0) + (Number(state.bank) || 0);
  if (totalFunds < cost) return false;
  if ((Number(state.cash) || 0) >= cost) {
    state.cash -= cost;
  } else {
    const rem = cost - (Number(state.cash) || 0);
    state.cash = 0;
    state.bank = Math.max(0, (Number(state.bank) || 0) - rem);
  }
  return true;
}

function unlockFarm(state) {
  const f = ensureFarmState(state);
  if (f.unlocked) throw new Error('المزرعة مفتوحة ومرخصة بالفعل.');
  const cost = FARM_CONFIG.unlockCost;
  if (!deductFunds(state, cost)) {
    throw new Error(`كلفة استصلاح وتملك المزرعة الأولى هي ${cost.toLocaleString()} ج.م. رصيدك لا يكفي.`);
  }
  f.unlocked = true;
  return {
    unlocked: true,
    cash: state.cash,
    bank: state.bank,
    plots: f.plots
  };
}

function upgradeFarmLand(state) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('يجب فتح وتملك المزرعة أولاً.');
  const nextLvl = (f.landLevel || 1) + 1;
  const expansion = FARM_CONFIG.landExpansions[nextLvl];
  if (!expansion) throw new Error('وصلت المزرعة إلى الحد الأقصى من التوسعة (16 حوضاً).');
  if (!deductFunds(state, expansion.cost)) {
    throw new Error(`كلفة ${expansion.name} هي ${expansion.cost.toLocaleString()} ج.م. رصيدك لا يكفي.`);
  }
  f.landLevel = nextLvl;
  f.maxPlots = expansion.plots;
  while (f.plots.length < f.maxPlots) f.plots.push(null);
  return {
    landLevel: f.landLevel,
    maxPlots: f.maxPlots,
    name: expansion.name,
    cash: state.cash,
    bank: state.bank
  };
}

function upgradeFarmIrrigation(state) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('يجب فتح وتملك المزرعة أولاً.');
  const nextLvl = (f.waterLevel || 1) + 1;
  const irDef = FARM_CONFIG.irrigation[nextLvl];
  if (!irDef) throw new Error('وصلت شبكة الري لأعلى مستوى تكنولوجي متاح.');
  if (!deductFunds(state, irDef.cost)) {
    throw new Error(`كلفة ترقية شبكة الري إلى "${irDef.name}" هي ${irDef.cost.toLocaleString()} ج.م. رصيدك لا يكفي.`);
  }
  f.waterLevel = nextLvl;
  f.irrigationLevel = nextLvl;
  return {
    waterLevel: f.waterLevel,
    name: irDef.name,
    speedBonus: irDef.speedBonus,
    cash: state.cash,
    bank: state.bank
  };
}

function upgradeFarmFertilizer(state) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('يجب فتح وتملك المزرعة أولاً.');
  const nextLvl = (f.fertilizerLevel || 1) + 1;
  const fertDef = FARM_CONFIG.fertilizers[nextLvl];
  if (!fertDef) throw new Error('وصلت تربة ومخصبات المزرعة لأعلى مستوى.');
  if (!deductFunds(state, fertDef.cost)) {
    throw new Error(`كلفة استخدام "${fertDef.name}" هي ${fertDef.cost.toLocaleString()} ج.م. رصيدك لا يكفي.`);
  }
  f.fertilizerLevel = nextLvl;
  return {
    fertilizerLevel: f.fertilizerLevel,
    name: fertDef.name,
    yieldBonus: fertDef.yieldBonus,
    cash: state.cash,
    bank: state.bank
  };
}

function upgradeFarmSilo(state) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('يجب فتح وتملك المزرعة أولاً.');
  const nextLvl = (f.siloLevel || 1) + 1;
  const siloDef = FARM_CONFIG.siloLevels[nextLvl];
  if (!siloDef) throw new Error('وصلت صوامع المزرعة لأعلى سعة تخزينية.');
  if (!deductFunds(state, siloDef.cost)) {
    throw new Error(`كلفة ترقية الصومعة إلى "${siloDef.name}" هي ${siloDef.cost.toLocaleString()} ج.م. رصيدك لا يكفي.`);
  }
  f.siloLevel = nextLvl;
  return {
    siloLevel: f.siloLevel,
    name: siloDef.name,
    capacity: siloDef.capacity,
    cash: state.cash,
    bank: state.bank
  };
}

function hireFarmWorker(state) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('يجب فتح وتملك المزرعة أولاً.');
  if (f.workers >= FARM_CONFIG.maxWorkers) {
    throw new Error(`وصلت للحد الأقصى من عمال المزرعة (${FARM_CONFIG.maxWorkers} عمال).`);
  }
  const cost = FARM_CONFIG.workerCost;
  if (!deductFunds(state, cost)) {
    throw new Error(`كلفة توظيف عامل مزرعة هي ${cost.toLocaleString()} ج.م. رصيدك لا يكفي.`);
  }
  f.workers++;
  return {
    workers: f.workers,
    cash: state.cash,
    bank: state.bank
  };
}

function plantFarmCrop(state, plotIndex, cropId, serverNow = Date.now()) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('يجب فتح وتملك المزرعة أولاً.');
  if (plotIndex < 0 || plotIndex >= f.maxPlots) throw new Error('رقم الحوض الزراعي غير صالح.');
  if (f.plots[plotIndex] !== null) throw new Error('الحوض الزراعي مشغول بمحصول آخر.');

  const crop = FARM_CROPS[cropId];
  if (!crop) throw new Error('نوع المحصول أو البذرة غير صالح.');

  const totalFunds = (Number(state.cash) || 0) + (Number(state.bank) || 0);
  if (totalFunds < crop.seedCost) {
    throw new Error(`رصيدك المالي غير كافٍ لشراء بذور "${crop.name}" (${crop.seedCost.toLocaleString()} ج.م).`);
  }

  // Deduct seed cost
  if ((Number(state.cash) || 0) >= crop.seedCost) {
    state.cash -= crop.seedCost;
  } else {
    const rem = crop.seedCost - (Number(state.cash) || 0);
    state.cash = 0;
    state.bank = Math.max(0, (Number(state.bank) || 0) - rem);
  }

  const durationMs = calculateCropGrowDuration(cropId, f);
  f.plots[plotIndex] = {
    cropId,
    plantedAt: serverNow,
    readyAt: serverNow + durationMs,
    durationMs,
    ready: false
  };

  return {
    plotIndex,
    crop,
    plantedAt: serverNow,
    readyAt: f.plots[plotIndex].readyAt,
    durationMs,
    cash: state.cash,
    bank: state.bank
  };
}

function plantAllFarmPlots(state, cropId, serverNow = Date.now()) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('يجب فتح وتملك المزرعة أولاً.');
  const crop = FARM_CROPS[cropId];
  if (!crop) throw new Error('نوع المحصول أو البذرة غير صالح.');

  const emptyIndices = [];
  for (let i = 0; i < f.maxPlots; i++) {
    if (f.plots[i] === null) emptyIndices.push(i);
  }
  if (emptyIndices.length === 0) throw new Error('لا توجد أحواض فارغة حالياً للزراعة.');

  const durationMs = calculateCropGrowDuration(cropId, f);
  let plantedCount = 0;
  let totalCost = 0;

  for (const idx of emptyIndices) {
    const totalFunds = (Number(state.cash) || 0) + (Number(state.bank) || 0);
    if (totalFunds < crop.seedCost) break;

    if ((Number(state.cash) || 0) >= crop.seedCost) {
      state.cash -= crop.seedCost;
    } else {
      const rem = crop.seedCost - (Number(state.cash) || 0);
      state.cash = 0;
      state.bank = Math.max(0, (Number(state.bank) || 0) - rem);
    }

    f.plots[idx] = {
      cropId,
      plantedAt: serverNow,
      readyAt: serverNow + durationMs,
      durationMs,
      ready: false
    };
    totalCost += crop.seedCost;
    plantedCount++;
  }

  if (plantedCount === 0) {
    throw new Error(`رصيدك المالي غير كافٍ لشراء بذور "${crop.name}".`);
  }

  return {
    plantedCount,
    crop,
    totalCost,
    durationMs,
    cash: state.cash,
    bank: state.bank
  };
}

function harvestFarmCrop(state, plotIndex, serverNow = Date.now()) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('المزرعة غير مفعلة.');
  if (plotIndex < 0 || plotIndex >= f.maxPlots) throw new Error('رقم الحوض غير صالح.');
  const plot = f.plots[plotIndex];
  if (!plot) throw new Error('الحوض الزراعي فارغ.');

  // Strict Server-Authoritative Timing Enforcement: Immune to phone clock tampering!
  if (serverNow < (plot.readyAt || 0)) {
    const remainingSec = Math.ceil(((plot.readyAt || 0) - serverNow) / 1000);
    throw new Error(`المحصول لا يزال قيد النمو على الخادم! متبقي ${remainingSec} ثانية على اكتمال النضج.`);
  }

  const crop = FARM_CROPS[plot.cropId];
  if (!crop) {
    f.plots[plotIndex] = null;
    throw new Error('بيانات المحصول غير صالحة، تم تفريغ الحوض.');
  }

  const fertDef = FARM_CONFIG.fertilizers[f.fertilizerLevel] || FARM_CONFIG.fertilizers[1];
  const yieldBonus = fertDef ? (fertDef.yieldBonus || 0) : 0;
  const finalYield = Math.round(crop.baseYield * (1 + yieldBonus));

  const currentStored = getFarmStoredUnits(f);
  const maxCap = getFarmStorageCapacity(f);
  if (currentStored + finalYield > maxCap) {
    throw new Error(`صوامع ومستودعات المزرعة ممتلئة (${currentStored.toLocaleString()}/${maxCap.toLocaleString()} وحدة)! لا يوجد متسع لتخزين ${finalYield} وحدة.`);
  }

  f.inventory[crop.id] = (f.inventory[crop.id] || 0) + finalYield;
  f.stats = f.stats || { totalHarvested: 0, totalRevenue: 0 };
  f.stats.totalHarvested = (f.stats.totalHarvested || 0) + finalYield;
  f.plots[plotIndex] = null;

  return {
    plotIndex,
    crop,
    yield: finalYield,
    inventoryTotal: f.inventory[crop.id]
  };
}

function harvestAllFarmPlots(state, serverNow = Date.now()) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('المزرعة غير مفعلة.');

  let totalHarvested = 0;
  let totalYield = 0;
  const summary = {};
  let currentStored = getFarmStoredUnits(f);
  const maxCap = getFarmStorageCapacity(f);

  if (currentStored >= maxCap) {
    throw new Error(`صوامع المزرعة ممتلئة بالكامل (${currentStored.toLocaleString()}/${maxCap.toLocaleString()} وحدة).`);
  }

  for (let i = 0; i < f.maxPlots; i++) {
    const plot = f.plots[i];
    // Strict Server-Authoritative Timing Check
    if (plot && serverNow >= (plot.readyAt || 0)) {
      const crop = FARM_CROPS[plot.cropId];
      if (crop) {
        const fertDef = FARM_CONFIG.fertilizers[f.fertilizerLevel] || FARM_CONFIG.fertilizers[1];
        const yieldBonus = fertDef ? (fertDef.yieldBonus || 0) : 0;
        const finalYield = Math.round(crop.baseYield * (1 + yieldBonus));

        if (currentStored + finalYield > maxCap) break;

        f.inventory[crop.id] = (f.inventory[crop.id] || 0) + finalYield;
        f.stats = f.stats || { totalHarvested: 0, totalRevenue: 0 };
        f.stats.totalHarvested = (f.stats.totalHarvested || 0) + finalYield;
        summary[crop.name] = (summary[crop.name] || 0) + finalYield;
        currentStored += finalYield;
        totalYield += finalYield;
        totalHarvested++;
      }
      f.plots[i] = null;
    }
  }

  if (totalHarvested === 0) {
    throw new Error('لا توجد أي محاصيل جاهزة ومكتملة النضج للحصاد حالياً على الخادم.');
  }

  return {
    harvestedCount: totalHarvested,
    totalYield,
    summary,
    currentStored
  };
}

function sellFarmCrop(state, cropId, requestedQty = null, serverNow = Date.now(), clientInventory = null) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('المزرعة غير مفعلة.');
  const crop = FARM_CROPS[cropId];
  if (!crop) throw new Error('نوع المحصول غير صالح.');

  // Adopt client inventory if valid and higher (avoids client-server harvest desync)
  if (clientInventory && typeof clientInventory === 'object' && clientInventory[cropId] !== undefined) {
    const cQty = Math.max(0, Number(clientInventory[cropId]) || 0);
    const sQty = Number((f.inventory && f.inventory[cropId]) || 0);
    if (cQty > sQty) {
      f.inventory = f.inventory || {};
      f.inventory[cropId] = Math.min(getFarmStorageCapacity(f), cQty);
    }
  }

  const available = Number((f.inventory && f.inventory[cropId]) || 0);
  if (available <= 0) throw new Error(`المستودع لا يحتوي على مخزون من "${crop.name}".`);

  const today = getCairoTodayStr(serverNow);
  if (!f.dailyLiquidation || f.dailyLiquidation.date !== today) {
    f.dailyLiquidation = { date: today, totalLiquidated: 0 };
  }

  const currentLiq = Number(f.dailyLiquidation.totalLiquidated || 0);
  const remainingCap = Math.max(0, DAILY_FARM_LIQUIDATION_CAP - currentLiq);
  if (remainingCap <= 0) {
    throw new Error(`لقد استنفدت كامل سقف التسييل اليومي للمزرعة (${DAILY_FARM_LIQUIDATION_CAP.toLocaleString()} ج.م).`);
  }

  // Contract-Only Economy: Direct emergency clearance recovers capital cost (seedCost / baseYield)
  const unitCropCost = Math.max(1, Math.floor((crop.seedCost || 10) / (crop.baseYield || 10)));
  let qtyToSell = requestedQty ? Math.min(available, Math.max(1, Number(requestedQty))) : available;
  let totalPrice = qtyToSell * unitCropCost;

  if (totalPrice > remainingCap) {
    qtyToSell = Math.floor(remainingCap / unitCropCost);
    if (qtyToSell <= 0) {
      throw new Error(`سقف التسييل المتبقي اليوم (${remainingCap.toLocaleString()} ج.م) لا يكفي لتسييل المحصول.`);
    }
    totalPrice = qtyToSell * unitCropCost;
  }

  f.inventory[cropId] = Math.max(0, available - qtyToSell);
  f.dailyLiquidation.totalLiquidated = currentLiq + totalPrice;
  state.cash = (Number(state.cash) || 0) + totalPrice;
  f.stats = f.stats || { totalHarvested: 0, totalRevenue: 0 };
  f.stats.totalRevenue = (f.stats.totalRevenue || 0) + totalPrice;

  state.netWorth = calculateNetWorth(state);
  state.title = getAppropriateTitle(state.netWorth, state.xp || 0);

  return {
    crop,
    soldQty: qtyToSell,
    qty: qtyToSell,
    totalPrice,
    remainingInventory: f.inventory[cropId],
    totalLiquidatedToday: f.dailyLiquidation.totalLiquidated,
    cash: state.cash,
    netWorth: state.netWorth
  };
}

function sellAllFarmCrops(state, serverNow = Date.now(), clientInventory = null) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('المزرعة غير مفعلة.');

  // Adopt client inventory if provided
  if (clientInventory && typeof clientInventory === 'object') {
    f.inventory = f.inventory || {};
    Object.keys(clientInventory).forEach(cId => {
      const cQty = Math.max(0, Number(clientInventory[cId]) || 0);
      const sQty = Number(f.inventory[cId] || 0);
      if (cQty > sQty) f.inventory[cId] = cQty;
    });
  }

  const today = getCairoTodayStr(serverNow);
  if (!f.dailyLiquidation || f.dailyLiquidation.date !== today) {
    f.dailyLiquidation = { date: today, totalLiquidated: 0 };
  }

  let remainingCap = Math.max(0, DAILY_FARM_LIQUIDATION_CAP - Number(f.dailyLiquidation.totalLiquidated || 0));
  if (remainingCap <= 0) {
    throw new Error('استنفدت كامل سقف التسييل اليومي للمزرعة (20,000,000 ج.م).');
  }

  let grandTotal = 0;
  let soldItemsCount = 0;
  const breakdown = {};

  Object.keys(f.inventory || {}).forEach(cId => {
    const avail = Number(f.inventory[cId] || 0);
    const crop = FARM_CROPS[cId];
    if (avail > 0 && crop && remainingCap > 0) {
      const unitCropCost = Math.max(1, Math.floor((crop.seedCost || 10) / (crop.baseYield || 10)));
      let qty = avail;
      let cost = qty * unitCropCost;
      if (cost > remainingCap) {
        qty = Math.floor(remainingCap / unitCropCost);
        cost = qty * unitCropCost;
      }
      if (qty > 0) {
        f.inventory[cId] = Math.max(0, avail - qty);
        grandTotal += cost;
        remainingCap -= cost;
        soldItemsCount += qty;
        breakdown[crop.name] = { qty, total: cost };
      }
    }
  });

  if (grandTotal === 0) {
    throw new Error('لا توجد أي محاصيل صالحة للبيع أو تم الوصول لسقف التسييل اليومي.');
  }

  f.dailyLiquidation.totalLiquidated += grandTotal;
  state.cash = (Number(state.cash) || 0) + grandTotal;
  f.stats = f.stats || { totalHarvested: 0, totalRevenue: 0 };
  f.stats.totalRevenue = (f.stats.totalRevenue || 0) + grandTotal;

  state.netWorth = calculateNetWorth(state);
  state.title = getAppropriateTitle(state.netWorth, state.xp || 0);

  return {
    grandTotal,
    totalPrice: grandTotal,
    soldItemsCount,
    breakdown,
    totalLiquidatedToday: f.dailyLiquidation.totalLiquidated,
    cash: state.cash,
    netWorth: state.netWorth
  };
}

function sellProcessedGood(state, recipeId, requestedQty = null, serverNow = Date.now(), clientStorage = null) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('المزرعة غير مفعلة.');
  const recipe = FARM_RECIPES[recipeId];
  if (!recipe) throw new Error('المنتج المصنع غير صالح.');

  f.processing = f.processing || { storage: {} };
  f.processing.storage = f.processing.storage || {};

  // Adopt client processing storage if valid and higher
  if (clientStorage && typeof clientStorage === 'object' && clientStorage[recipeId] !== undefined) {
    const cQty = Math.max(0, Number(clientStorage[recipeId]) || 0);
    const sQty = Number(f.processing.storage[recipeId] || 0);
    if (cQty > sQty) {
      f.processing.storage[recipeId] = cQty;
    }
  }

  const available = Number(f.processing.storage[recipeId] || 0);
  if (available <= 0) {
    throw new Error(`مستودع التصنيع لا يحتوي على أي كميات جاهزة من "${recipe.name}".`);
  }

  const today = getCairoTodayStr(serverNow);
  if (!f.dailyLiquidation || f.dailyLiquidation.date !== today) {
    f.dailyLiquidation = { date: today, totalLiquidated: 0 };
  }

  const currentLiq = Number(f.dailyLiquidation.totalLiquidated || 0);
  const remainingCap = Math.max(0, DAILY_FARM_LIQUIDATION_CAP - currentLiq);
  if (remainingCap <= 0) {
    throw new Error(`لقد استنفدت كامل سقف التسييل اليومي للمصنع (${DAILY_FARM_LIQUIDATION_CAP.toLocaleString()} ج.م).`);
  }

  // Contract-Only Economy: Emergency dump recovers raw material cost
  const rawCrop = FARM_CROPS[recipe.inputCrop];
  const unitCropCost = rawCrop ? Math.max(1, Math.floor((rawCrop.seedCost || 10) / (rawCrop.baseYield || 10))) : 5;
  const rawCostPerUnit = unitCropCost * (recipe.inputQty || 1);

  let sellQty = (requestedQty === null || requestedQty <= 0 || requestedQty > available) ? available : Math.floor(Number(requestedQty));
  let totalPrice = sellQty * rawCostPerUnit;

  if (totalPrice > remainingCap) {
    sellQty = Math.floor(remainingCap / rawCostPerUnit);
    if (sellQty <= 0) {
      throw new Error(`سقف التسييل المتبقي اليوم (${remainingCap.toLocaleString()} ج.م) لا يكفي لتسييل حتى عبوة واحدة من "${recipe.name}".`);
    }
    totalPrice = sellQty * rawCostPerUnit;
  }

  f.processing.storage[recipeId] = Math.max(0, available - sellQty);
  f.dailyLiquidation.totalLiquidated = currentLiq + totalPrice;
  state.cash = (Number(state.cash) || 0) + totalPrice;

  if (!f.processing.stats) f.processing.stats = { totalProcessed: 0, totalRevenue: 0 };
  f.processing.stats.totalRevenue = (f.processing.stats.totalRevenue || 0) + totalPrice;

  state.netWorth = calculateNetWorth(state);
  state.title = getAppropriateTitle(state.netWorth, state.xp || 0);

  return {
    recipe,
    recipeId,
    soldQty: sellQty,
    qty: sellQty,
    totalPrice,
    remainingStorage: f.processing.storage[recipeId],
    totalLiquidatedToday: f.dailyLiquidation.totalLiquidated,
    cash: state.cash,
    netWorth: state.netWorth
  };
}

function sellLivestockProduce(state, produceKey, requestedQty = null, serverNow = Date.now(), clientProduce = null) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('المزرعة غير مفعلة.');
  if (!['milk', 'eggs', 'compost'].includes(produceKey)) {
    throw new Error('نوع الإنتاج الحيواني غير صالح.');
  }

  f.livestock = f.livestock || { milk: 0, eggs: 0, compost: 0 };

  // Adopt client produce if valid and higher
  if (clientProduce && typeof clientProduce === 'object' && clientProduce[produceKey] !== undefined) {
    const cQty = Math.max(0, Number(clientProduce[produceKey]) || 0);
    const sQty = Number(f.livestock[produceKey] || 0);
    if (cQty > sQty) {
      f.livestock[produceKey] = cQty;
    }
  }

  const available = Number(f.livestock[produceKey] || 0);
  if (available <= 0) {
    const label = produceKey === 'milk' ? 'الحليب الطازج' : (produceKey === 'eggs' ? 'البيض' : 'السماد العضوي');
    throw new Error(`لا يوجد مخزون متوفر من "${label}" لبيعه حالياً.`);
  }

  const today = getCairoTodayStr(serverNow);
  if (!f.dailyLiquidation || f.dailyLiquidation.date !== today) {
    f.dailyLiquidation = { date: today, totalLiquidated: 0 };
  }

  const currentLiq = Number(f.dailyLiquidation.totalLiquidated || 0);
  const remainingCap = Math.max(0, DAILY_FARM_LIQUIDATION_CAP - currentLiq);
  if (remainingCap <= 0) {
    throw new Error(`لقد استنفدت كامل سقف التسييل اليومي للمزرعة (${DAILY_FARM_LIQUIDATION_CAP.toLocaleString()} ج.م).`);
  }

  const pricePerUnit = produceKey === 'compost' ? 10 : 5;
  let sellQty = (requestedQty === null || requestedQty <= 0 || requestedQty > available) ? available : Math.floor(Number(requestedQty));
  let totalPrice = sellQty * pricePerUnit;

  if (totalPrice > remainingCap) {
    sellQty = Math.floor(remainingCap / pricePerUnit);
    if (sellQty <= 0) {
      throw new Error(`سقف التسييل المتبقي اليوم (${remainingCap.toLocaleString()} ج.م) لا يكفي لتسييل الإنتاج.`);
    }
    totalPrice = sellQty * pricePerUnit;
  }

  f.livestock[produceKey] = Math.max(0, available - sellQty);
  f.dailyLiquidation.totalLiquidated = currentLiq + totalPrice;
  state.cash = (Number(state.cash) || 0) + totalPrice;

  if (!f.livestock.stats) f.livestock.stats = { totalMilk: 0, totalEggs: 0, totalRevenue: 0 };
  f.livestock.stats.totalRevenue = (f.livestock.stats.totalRevenue || 0) + totalPrice;

  state.netWorth = calculateNetWorth(state);
  state.title = getAppropriateTitle(state.netWorth, state.xp || 0);

  return {
    produceKey,
    soldQty: sellQty,
    qty: sellQty,
    totalPrice,
    remainingProduce: f.livestock[produceKey],
    totalLiquidatedToday: f.dailyLiquidation.totalLiquidated,
    cash: state.cash,
    netWorth: state.netWorth
  };
}

function sellAllProcessedGoods(state, serverNow = Date.now(), clientStorage = null) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('المزرعة غير مفعلة.');

  f.processing = f.processing || { storage: {} };
  f.processing.storage = f.processing.storage || {};

  if (clientStorage && typeof clientStorage === 'object') {
    Object.keys(clientStorage).forEach(rId => {
      const cQty = Math.max(0, Number(clientStorage[rId]) || 0);
      const sQty = Number(f.processing.storage[rId] || 0);
      if (cQty > sQty) f.processing.storage[rId] = cQty;
    });
  }

  const today = getCairoTodayStr(serverNow);
  if (!f.dailyLiquidation || f.dailyLiquidation.date !== today) {
    f.dailyLiquidation = { date: today, totalLiquidated: 0 };
  }

  let remainingCap = Math.max(0, DAILY_FARM_LIQUIDATION_CAP - Number(f.dailyLiquidation.totalLiquidated || 0));
  if (remainingCap <= 0) {
    throw new Error('استنفدت كامل سقف التسييل اليومي للمصنع (20,000,000 ج.م).');
  }

  let grandTotal = 0;
  let itemsSold = 0;
  const breakdown = {};

  Object.keys(f.processing.storage).forEach(rId => {
    const avail = Number(f.processing.storage[rId] || 0);
    const recipe = FARM_RECIPES[rId];
    if (avail > 0 && recipe && remainingCap > 0) {
      const rawCrop = FARM_CROPS[recipe.inputCrop];
      const unitCropCost = rawCrop ? Math.max(1, Math.floor((rawCrop.seedCost || 10) / (rawCrop.baseYield || 10))) : 5;
      const rawCostPerUnit = unitCropCost * (recipe.inputQty || 1);

      let qty = avail;
      let cost = qty * rawCostPerUnit;
      if (cost > remainingCap) {
        qty = Math.floor(remainingCap / rawCostPerUnit);
        cost = qty * rawCostPerUnit;
      }
      if (qty > 0) {
        f.processing.storage[rId] = Math.max(0, avail - qty);
        grandTotal += cost;
        remainingCap -= cost;
        itemsSold += qty;
        breakdown[rId] = { qty, total: cost };
      }
    }
  });

  if (grandTotal === 0) {
    throw new Error('لا توجد أي منتجات مصنعة للبيع أو تم الوصول لسقف التسييل اليومي.');
  }

  f.dailyLiquidation.totalLiquidated += grandTotal;
  state.cash = (Number(state.cash) || 0) + grandTotal;
  if (!f.processing.stats) f.processing.stats = { totalProcessed: 0, totalRevenue: 0 };
  f.processing.stats.totalRevenue = (f.processing.stats.totalRevenue || 0) + grandTotal;

  state.netWorth = calculateNetWorth(state);
  state.title = getAppropriateTitle(state.netWorth, state.xp || 0);

  return {
    grandTotal,
    totalPrice: grandTotal,
    itemsSold,
    breakdown,
    totalLiquidatedToday: f.dailyLiquidation.totalLiquidated,
    cash: state.cash,
    netWorth: state.netWorth
  };
}

function sellAllLivestockProduce(state, serverNow = Date.now(), clientProduce = null) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('المزرعة غير مفعلة.');

  f.livestock = f.livestock || { milk: 0, eggs: 0, compost: 0 };

  if (clientProduce && typeof clientProduce === 'object') {
    ['milk', 'eggs', 'compost'].forEach(key => {
      if (clientProduce[key] !== undefined) {
        const cQty = Math.max(0, Number(clientProduce[key]) || 0);
        const sQty = Number(f.livestock[key] || 0);
        if (cQty > sQty) f.livestock[key] = cQty;
      }
    });
  }

  const today = getCairoTodayStr(serverNow);
  if (!f.dailyLiquidation || f.dailyLiquidation.date !== today) {
    f.dailyLiquidation = { date: today, totalLiquidated: 0 };
  }

  let remainingCap = Math.max(0, DAILY_FARM_LIQUIDATION_CAP - Number(f.dailyLiquidation.totalLiquidated || 0));
  if (remainingCap <= 0) {
    throw new Error('استنفدت كامل سقف التسييل اليومي للإنتاج الحيواني (20,000,000 ج.م).');
  }

  const milk = Number(f.livestock.milk || 0);
  const eggs = Number(f.livestock.eggs || 0);
  const compost = Number(f.livestock.compost || 0);

  let soldMilk = milk;
  let soldEggs = eggs;
  let soldCompost = compost;

  const mCost = 5, eCost = 5, cCost = 10;
  const mFunds = Math.min(remainingCap, milk * mCost);
  soldMilk = Math.floor(mFunds / mCost);
  remainingCap -= soldMilk * mCost;

  const eFunds = Math.min(remainingCap, eggs * eCost);
  soldEggs = Math.floor(eFunds / eCost);
  remainingCap -= soldEggs * eCost;

  const cFunds = Math.min(remainingCap, compost * cCost);
  soldCompost = Math.floor(cFunds / cCost);
  remainingCap -= soldCompost * cCost;

  const finalTotal = (soldMilk * mCost) + (soldEggs * eCost) + (soldCompost * cCost);
  if (finalTotal <= 0) {
    throw new Error('لا يوجد إنتاج حيواني جاهز للبيع أو تم استنفاد السقف اليومي.');
  }

  f.livestock.milk = Math.max(0, milk - soldMilk);
  f.livestock.eggs = Math.max(0, eggs - soldEggs);
  f.livestock.compost = Math.max(0, compost - soldCompost);

  f.dailyLiquidation.totalLiquidated += finalTotal;
  state.cash = (Number(state.cash) || 0) + finalTotal;
  if (!f.livestock.stats) f.livestock.stats = { totalMilk: 0, totalEggs: 0, totalRevenue: 0 };
  f.livestock.stats.totalRevenue = (f.livestock.stats.totalRevenue || 0) + finalTotal;

  state.netWorth = calculateNetWorth(state);
  state.title = getAppropriateTitle(state.netWorth, state.xp || 0);

  return {
    grandTotal: finalTotal,
    totalPrice: finalTotal,
    milk: soldMilk,
    eggs: soldEggs,
    compost: soldCompost,
    totalLiquidatedToday: f.dailyLiquidation.totalLiquidated,
    cash: state.cash,
    netWorth: state.netWorth
  };
}

/**
 * Fulfills a B2B supply farm contract authoritatively on the server.
 * Credits payout into state.cash, advances reputation and liquidation limits.
 */
function fulfillFarmContract(state, contractId, contractData = null) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('المزرعة غير مفعلة.');

  f.contracts = f.contracts || {};
  if (!Array.isArray(f.contracts.active)) {
    f.contracts.active = [];
  }

  let contract = f.contracts.active.find(c => c && c.id === contractId);

  // If contract not yet in server list but valid contractData provided by client, adopt it
  if (!contract && contractData && typeof contractData === 'object' && contractData.id === contractId) {
    contract = contractData;
    f.contracts.active.push(contract);
  }

  if (!contract) {
    throw new Error('العقد غير موجود أو غير صالح.');
  }

  if (contract.fulfilled) {
    throw new Error('تم تسليم هذا العقد واستلام أرباحه بالفعل!');
  }

  const payout = Math.max(0, Number(contract.payout || 0));
  const repReward = Math.max(0, Number(contract.repReward || 0));

  // Verify daily liquidation cap
  const cairoToday = getCairoTodayStr();
  if (!f.dailyLiquidation || f.dailyLiquidation.date !== cairoToday) {
    f.dailyLiquidation = { date: cairoToday, totalLiquidated: 0 };
  }

  if (f.dailyLiquidation.totalLiquidated + payout > DAILY_FARM_LIQUIDATION_CAP) {
    const remaining = Math.max(0, DAILY_FARM_LIQUIDATION_CAP - f.dailyLiquidation.totalLiquidated);
    throw new Error(`مكافأة العقد (${payout.toLocaleString()} EGP) تتجاوز سقف التسييل اليومي المتبقي (${remaining.toLocaleString()} EGP).`);
  }

  // Deduct inventory items if present
  const reqs = Array.isArray(contract.requirements) && contract.requirements.length > 0
    ? contract.requirements
    : [{
        itemType: contract.itemType || 'crop',
        itemId: contract.itemId,
        quantityNeeded: Number(contract.quantityNeeded || 0)
      }];

  f.inventory = f.inventory || {};
  f.processing = f.processing || { storage: {} };
  f.processing.storage = f.processing.storage || {};
  f.livestock = f.livestock || {};

  for (const req of reqs) {
    const qty = Number(req.quantityNeeded || 0);
    if (qty > 0 && req.itemId) {
      if (req.itemType === 'crop' && f.inventory[req.itemId] !== undefined) {
        f.inventory[req.itemId] = Math.max(0, Number(f.inventory[req.itemId] || 0) - qty);
      } else if (req.itemType === 'processed' && f.processing.storage[req.itemId] !== undefined) {
        f.processing.storage[req.itemId] = Math.max(0, Number(f.processing.storage[req.itemId] || 0) - qty);
      } else if (req.itemType === 'livestock' && f.livestock[req.itemId] !== undefined) {
        f.livestock[req.itemId] = Math.max(0, Number(f.livestock[req.itemId] || 0) - qty);
      }
    }
  }

  // Fulfill contract and add cash authoritatively
  contract.fulfilled = true;
  contract.fulfilledAt = Date.now();

  f.dailyLiquidation.totalLiquidated += payout;
  state.cash = (Number(state.cash) || 0) + payout;

  f.contracts.reputation = (Number(f.contracts.reputation) || 0) + repReward;
  f.contracts.completedCount = (Number(f.contracts.completedCount) || 0) + 1;
  f.contracts.revenueToday = (Number(f.contracts.revenueToday) || 0) + payout;
  f.contracts.totalBonusEarned = (Number(f.contracts.totalBonusEarned) || 0) + payout;

  f.stats = f.stats || { totalHarvested: 0, totalRevenue: 0 };
  f.stats.totalRevenue = (Number(f.stats.totalRevenue) || 0) + payout;

  state.netWorth = calculateNetWorth(state);
  state.title = getAppropriateTitle(state.netWorth, state.xp || 0);

  return {
    contract,
    payout,
    repReward,
    newReputation: f.contracts.reputation,
    cash: state.cash,
    netWorth: state.netWorth,
    farm: f
  };
}

function buyFarmLivestock(state, type, count = 1) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error("يجب تملك المزرعة أولاً.");
  const def = FARM_LIVESTOCK_CONFIG[type];
  if (!def) throw new Error("نوع المواشي المحدد غير صالح.");

  const current = type === 'cow' ? (Number(f.livestock.cows) || 0) : (Number(f.livestock.chickens) || 0);
  const qty = Math.max(1, parseInt(count, 10) || 1);
  if (current + qty > def.maxCount) {
    throw new Error(`وصلت للحد الأقصى المسموح من ${def.name} (${def.maxCount}).`);
  }

  const totalCost = def.cost * qty;
  const totalFunds = (Number(state.cash) || 0) + (Number(state.bank) || 0);
  if (totalFunds < totalCost) {
    throw new Error(`كلفة شراء ${qty} من "${def.name}" هي ${totalCost.toLocaleString()} EGP. رصيدك لا يكفي.`);
  }

  if ((Number(state.cash) || 0) >= totalCost) {
    state.cash -= totalCost;
  } else {
    const rem = totalCost - (Number(state.cash) || 0);
    state.cash = 0;
    state.bank -= rem;
  }

  if (type === 'cow') {
    f.livestock.cows = current + qty;
  } else {
    f.livestock.chickens = current + qty;
  }

  return {
    type,
    purchasedCount: qty,
    totalCost,
    newTotal: current + qty,
    livestock: f.livestock,
    cash: state.cash,
    bank: state.bank,
    farm: f
  };
}

module.exports = {
  DAILY_FARM_LIQUIDATION_CAP,
  FARM_CONFIG,
  FARM_CROPS,
  FARM_RECIPES,
  FARM_LIVESTOCK_CONFIG,
  getCairoTodayStr,
  ensureFarmState,
  getFarmStorageCapacity,
  getFarmStoredUnits,
  calculateCropGrowDuration,
  unlockFarm,
  upgradeFarmLand,
  upgradeFarmIrrigation,
  upgradeFarmFertilizer,
  upgradeFarmSilo,
  hireFarmWorker,
  buyFarmLivestock,
  plantFarmCrop,
  plantAllFarmPlots,
  harvestFarmCrop,
  harvestAllFarmPlots,
  sellFarmCrop,
  sellAllFarmCrops,
  sellProcessedGood,
  sellAllProcessedGoods,
  sellLivestockProduce,
  sellAllLivestockProduce,
  fulfillFarmContract
};
