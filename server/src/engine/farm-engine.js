/**
 * Ras ALmal Tycoon — Authoritative Farm Engine
 * 100% Server-Authoritative Logic for Agricultural Land, Crops, Livestock, and B2B Contracts.
 * Immune to client-side clock tampering / time travel exploits.
 */

const DAILY_FARM_LIQUIDATION_CAP = 20000000; // 20M EGP per calendar day (Cairo time)

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

function sellFarmCrop(state, cropId, requestedQty = null, serverNow = Date.now()) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('المزرعة غير مفعلة.');
  const crop = FARM_CROPS[cropId];
  if (!crop) throw new Error('نوع المحصول غير صالح.');

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

  const unitPrice = crop.sellPrice;
  let qtyToSell = requestedQty ? Math.min(available, Math.max(1, Number(requestedQty))) : available;
  let totalPrice = qtyToSell * unitPrice;

  if (totalPrice > remainingCap) {
    qtyToSell = Math.floor(remainingCap / unitPrice);
    if (qtyToSell <= 0) {
      throw new Error(`سقف التسييل المتبقي اليوم (${remainingCap.toLocaleString()} ج.م) لا يكفي لتسييل المحصول.`);
    }
    totalPrice = qtyToSell * unitPrice;
  }

  f.inventory[cropId] = Math.max(0, available - qtyToSell);
  f.dailyLiquidation.totalLiquidated = currentLiq + totalPrice;
  state.cash = (Number(state.cash) || 0) + totalPrice;
  f.stats = f.stats || { totalHarvested: 0, totalRevenue: 0 };
  f.stats.totalRevenue = (f.stats.totalRevenue || 0) + totalPrice;

  return {
    crop,
    soldQty: qtyToSell,
    totalPrice,
    remainingInventory: f.inventory[cropId],
    totalLiquidatedToday: f.dailyLiquidation.totalLiquidated,
    cash: state.cash
  };
}

function sellAllFarmCrops(state, serverNow = Date.now()) {
  const f = ensureFarmState(state);
  if (!f.unlocked) throw new Error('المزرعة غير مفعلة.');
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

  Object.keys(f.inventory).forEach(cId => {
    const avail = Number(f.inventory[cId] || 0);
    const crop = FARM_CROPS[cId];
    if (avail > 0 && crop && remainingCap > 0) {
      const pricePerUnit = crop.sellPrice;
      let qty = avail;
      let cost = qty * pricePerUnit;
      if (cost > remainingCap) {
        qty = Math.floor(remainingCap / pricePerUnit);
        cost = qty * pricePerUnit;
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

  return {
    grandTotal,
    soldItemsCount,
    breakdown,
    totalLiquidatedToday: f.dailyLiquidation.totalLiquidated,
    cash: state.cash
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
  plantFarmCrop,
  plantAllFarmPlots,
  harvestFarmCrop,
  harvestAllFarmPlots,
  sellFarmCrop,
  sellAllFarmCrops
};
