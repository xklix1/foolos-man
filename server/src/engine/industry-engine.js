/**
 * industry-engine.js
 * Authoritative Server Logic for Industrial Supply Chain Empire
 */

const { INDUSTRIAL_SECTORS } = require('./definitions');
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

module.exports = {
  ensureIndustryState,
  unlockIndustrySector,
  upgradeIndustryStage
};
