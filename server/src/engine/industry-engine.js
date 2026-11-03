/**
 * industry-engine.js
 * Authoritative Server Logic for Industrial Supply Chain Empire
 */

const { INDUSTRIAL_SECTORS, TRADE_COMMODITIES } = require('./definitions');
const { calculateNetWorth } = require('./net-worth-engine');

function ensureIndustryState(state) {
  if (!state.industry || typeof state.industry !== 'object') {
    state.industry = {};
  }
  return state.industry;
}

function unlockIndustrySector(state, sectorId) {
  if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك إدارة التراخيص الصناعية.");
  const def = INDUSTRIAL_SECTORS[sectorId];
  if (!def) throw new Error("القطاع الصناعي المحدد غير متوفر.");

  const industry = ensureIndustryState(state);
  industry[sectorId] = industry[sectorId] || { unlocked: false, stage1: 0, stage2: 0, stage3: 0, logistics: 0 };
  const secState = industry[sectorId];

  if (secState.unlocked) throw new Error("هذا القطاع الصناعي مرخص ومفعل بالفعل.");

  const cost = def.unlockCost;
  const totalFunds = (Number(state.cash) || 0) + (Number(state.bank) || 0);
  if (totalFunds < cost) {
    throw new Error(`تكلفة ترخيص هذا القطاع هي ${cost.toLocaleString()} EGP. رصيدك غير كافٍ.`);
  }

  if ((Number(state.cash) || 0) >= cost) {
    state.cash -= cost;
  } else {
    const rem = cost - (Number(state.cash) || 0);
    state.cash = 0;
    state.bank -= rem;
  }

  secState.unlocked = true;
  secState.stage1 = 1;
  secState.stage2 = 1;
  secState.stage3 = 1;
  secState.logistics = 1;

  state.netWorth = calculateNetWorth(state);

  return {
    sectorId,
    name: def.name,
    cost,
    cash: state.cash,
    bank: state.bank,
    netWorth: state.netWorth,
    industry: state.industry
  };
}

function calculateStageMultiUpgrade(secState, stDef, multiplier = 1, totalFunds = Infinity) {
  const curLvl = Number(secState || 0);
  if (curLvl >= 50) return { count: 0, cost: 0, targetLevel: 50 };

  const maxPossible = 50 - curLvl;
  let targetCount = multiplier === 'max' ? maxPossible : Math.min(parseInt(multiplier, 10) || 1, maxPossible);

  let totalCost = 0;
  let actualCount = 0;

  for (let i = 0; i < targetCount; i++) {
    const lvlToBuy = curLvl + i;
    const stepCost = Math.floor(stDef.baseCost * Math.pow(1.65, lvlToBuy));
    if (multiplier === 'max') {
      if (actualCount > 0 && (totalCost + stepCost > totalFunds)) break;
    }
    totalCost += stepCost;
    actualCount++;
    if (multiplier === 'max' && totalCost > totalFunds) break;
  }

  if (actualCount === 0) {
    actualCount = 1;
    totalCost = Math.floor(stDef.baseCost * Math.pow(1.65, curLvl));
  }

  return {
    count: actualCount,
    cost: totalCost,
    targetLevel: curLvl + actualCount
  };
}

function upgradeIndustryStage(state, sectorId, stageKey, multiplier = 1) {
  if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك ترقية خطوط الإنتاج.");
  const def = INDUSTRIAL_SECTORS[sectorId];
  if (!def) throw new Error("القطاع الصناعي المحدد غير متوفر.");

  const industry = ensureIndustryState(state);
  const secState = industry[sectorId];
  if (!secState || !secState.unlocked) throw new Error("يجب ترخيص هذا القطاع الصناعي أولاً قبل ترقية خطوطه.");

  const stDef = def.stages[stageKey];
  if (!stDef) throw new Error("المرحلة الصناعية المحددة غير صالحة.");

  const curLvl = Number(secState[stageKey] || 0);
  if (curLvl >= 50) throw new Error("وصلت هذه المرحلة إلى الحد الأقصى من التوسعة (المستوى 50).");

  const totalFunds = (Number(state.cash) || 0) + (Number(state.bank) || 0);
  const multi = calculateStageMultiUpgrade(curLvl, stDef, multiplier, totalFunds);
  if (multi.count <= 0) throw new Error("وصلت المرحلة للحد الأقصى أو لا يمكن الترقية.");

  const cost = multi.cost;
  if (totalFunds < cost) {
    throw new Error(`تكلفة ترقية "${stageKey}" (+${multi.count} مستويات) هي ${cost.toLocaleString()} EGP. رصيدك لا يكفي.`);
  }

  if ((Number(state.cash) || 0) >= cost) {
    state.cash -= cost;
  } else {
    const rem = cost - (Number(state.cash) || 0);
    state.cash = 0;
    state.bank -= rem;
  }

  secState[stageKey] = curLvl + multi.count;
  state.netWorth = calculateNetWorth(state);

  return {
    sectorId,
    stageKey,
    upgradedLevels: multi.count,
    newLevel: secState[stageKey],
    cost,
    cash: state.cash,
    bank: state.bank,
    netWorth: state.netWorth,
    industry: state.industry
  };
}

function collectIndustryRevenue(state, sectorId, requestedUnits = null) {
  if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك بيع الإنتاج الصناعي.");
  const def = INDUSTRIAL_SECTORS[sectorId];
  if (!def) throw new Error("القطاع الصناعي المحدد غير متوفر.");

  const industry = ensureIndustryState(state);
  const secState = industry[sectorId];
  if (!secState || !secState.unlocked) throw new Error("هذا القطاع الصناعي غير مرخص.");

  const availableUnits = Math.floor(Number(secState.readyStock) || 0);
  if (availableUnits <= 0) {
    throw new Error("لا يوجد إنتاج جاهز للبيع في مستودع هذا المصنع حالياً.");
  }

  const units = (requestedUnits && requestedUnits > 0) ? Math.min(availableUnits, Math.floor(Number(requestedUnits))) : availableUnits;
  const unitPrice = def.product.baseValue;
  const grossPayout = units * unitPrice;
  const overheadRate = 0.15; // 15% operational, energy & maintenance expenses
  const overheadCost = Math.floor(grossPayout * overheadRate);
  const netPayout = grossPayout - overheadCost;

  secState.readyStock = Math.max(0, availableUnits - units);
  secState.totalEarned = (Number(secState.totalEarned) || 0) + netPayout;

  state.cash = (Number(state.cash) || 0) + netPayout;
  state.netWorth = calculateNetWorth(state);

  return {
    sectorId,
    units,
    unitPrice,
    grossPayout,
    overheadCost,
    netPayout,
    totalPayout: netPayout,
    readyStock: secState.readyStock,
    cash: state.cash,
    netWorth: state.netWorth,
    industry: state.industry
  };
}

function transferIndustryGoodsToTradeExport(state, sectorId) {
  if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك إدارة شحنات التصدير.");
  const def = INDUSTRIAL_SECTORS[sectorId];
  if (!def) throw new Error("القطاع الصناعي المحدد غير صالح.");

  const industry = ensureIndustryState(state);
  const secState = industry[sectorId];
  if (!secState || !secState.unlocked) throw new Error("هذا القطاع الصناعي غير مرخص.");

  const units = Math.floor(Number(secState.readyStock) || 0);
  if (units <= 0) throw new Error("لا يوجد مخزون جاهز للتحويل إلى مستودع التصدير الجمركي.");

  const unitsPerContainer = def.product.unitsPerContainer || 10;
  const maxContainers = Math.floor(units / unitsPerContainer);
  if (maxContainers <= 0) {
    throw new Error(`المخزون المتوفر (${units} وحدة) لا يكفي لتجهيز حاوية تصدير كاملة! يلزم ${unitsPerContainer} وحدة لكل حاوية.`);
  }

  // Ensure tradeCompany state integrity
  if (!state.tradeCompany || typeof state.tradeCompany !== 'object') {
    state.tradeCompany = {
      warehouseCapacity: 10,
      warehouse: {},
      activeImports: [],
      activeExports: [],
      totalProfitEarned: 0,
      totalShipmentsCompleted: 0
    };
  }
  const tc = state.tradeCompany;
  tc.warehouseCapacity = Math.min(50, Math.max(10, Number(tc.warehouseCapacity) || 10));
  if (!tc.warehouse || typeof tc.warehouse !== 'object') tc.warehouse = {};

  let currentWarehouseTotal = 0;
  Object.keys(tc.warehouse).forEach(k => {
    currentWarehouseTotal += Number(tc.warehouse[k] || 0);
  });

  const cap = tc.warehouseCapacity;
  const availableSpace = Math.max(0, cap - currentWarehouseTotal);
  if (availableSpace <= 0) {
    throw new Error(`مستودع شركة الاستيراد والتصدير ممتلئ بالكامل (${currentWarehouseTotal}/${cap} حاوية)! قم ببيع البضائع المخزنة أولاً.`);
  }

  // NO arbitrary 10-cap! Transfer up to available warehouse capacity
  const containersToTransfer = Math.min(maxContainers, availableSpace);
  const unitsDeducted = containersToTransfer * unitsPerContainer;
  const tradeCommId = def.product.tradeCommodityId || 'espresso_coffee';

  secState.readyStock = Math.max(0, units - unitsDeducted);
  tc.warehouse[tradeCommId] = (Number(tc.warehouse[tradeCommId]) || 0) + containersToTransfer;
  secState.totalExported = (Number(secState.totalExported) || 0) + containersToTransfer;

  const commDef = TRADE_COMMODITIES[tradeCommId];
  const commodityName = commDef ? commDef.name : tradeCommId;

  state.netWorth = calculateNetWorth(state);

  return {
    success: true,
    sectorId,
    transferred: containersToTransfer,
    unitsDeducted,
    unitsPerContainer,
    tradeCommodityId: tradeCommId,
    commodityName,
    remainingReadyStock: secState.readyStock,
    warehouseTotal: currentWarehouseTotal + containersToTransfer,
    warehouseCapacity: cap,
    industry: state.industry,
    tradeCompany: tc
  };
}

module.exports = {
  ensureIndustryState,
  unlockIndustrySector,
  upgradeIndustryStage,
  collectIndustryRevenue,
  transferIndustryGoodsToTradeExport
};

