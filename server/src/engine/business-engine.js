/**
 * Ras ALmal Tycoon — Business Production & Economy Engine
 * Pure headless mathematical model matching game.js calculation
 */

const { BUSINESSES } = require('./definitions');

/**
 * Calculates financial metrics and net profit for a single business entity
 * @param {string} key - Business identifier (e.g. 'kiosk', 'coffee')
 * @param {Object} bizState - Current player's business state ({ level, workers, price, suppliesTicks, ... })
 * @param {Object} playerState - Full player state context for synergies and items
 * @returns {Object} Comprehensive calculation result including ownerProfit
 */
function calculateSingleBusinessProfit(key, bizState, playerState = {}) {
  const bizConfig = BUSINESSES[key];
  if (!bizConfig || !bizState || bizState.level <= 0) {
    return {
      grossProfit: 0,
      netProfit: 0,
      ownerProfit: 0,
      demand: 0,
      hasSupplies: false
    };
  }

  const lvl = Math.max(1, bizState.level || 1);
  const levelMultiplier = 1 + (lvl - 1) * 0.05; // Linear +5% pricing power per level
  const franchiseOptMultiplier = bizState.isFranchise ? 1.20 : 1.0;
  const opt = Math.round(bizConfig.optimumPrice * levelMultiplier * franchiseOptMultiplier);
  let price = bizState.price || opt;

  // Auto-normalize uncalibrated prices
  if (price > opt * 3 || price < opt * 0.2) {
    price = opt;
  }

  let elasticity = 1.0;
  if (price > opt) {
    elasticity = Math.max(0.1, 1 - ((price - opt) / opt));
  } else if (price < opt) {
    elasticity = 1 + ((opt - price) / opt) * 0.25;
  }

  const marketingActive = Boolean(bizState.marketingTicks && bizState.marketingTicks > 0);
  const marketingBoost = marketingActive ? 1.25 : 1.0;
  const actualCostOfGoods = Math.floor(bizConfig.costOfGoods * (1 + (lvl - 1) * 0.03));

  // Balanced linear upgrade scaling: +25% base demand per level
  const upgradeFactor = 1 + (lvl - 1) * 0.25;

  // Cap effective workers to maxWorkers defined for this business
  const maxW = bizConfig.maxWorkers || 20;
  const effectiveWorkers = Math.min(maxW, Math.max(0, bizState.workers || 0));
  const workerEff = (bizConfig.workerMultiplier || 1.08) - 1.0;
  const workerFactor = 1 + (effectiveWorkers * workerEff);

  const demand = Math.max(1, Math.floor(bizConfig.baseDemand * upgradeFactor * elasticity * workerFactor * marketingBoost));
  const margin = Math.max(1, price - actualCostOfGoods);
  const hasSupplies = Boolean(bizState.suppliesTicks && bizState.suppliesTicks > 0);

  // When supplies are available: 115% peak capacity bonus. When run out: 0% production.
  const suppliesMultiplier = hasSupplies ? 1.15 : 0.0;
  const quantumMultiplier = (playerState.inventory && playerState.inventory.quantum_cpu > 0) ? 1.125 : 1.0;
  const grossProfit = hasSupplies ? Math.max(0, Math.floor(demand * margin * 0.85 * quantumMultiplier * suppliesMultiplier)) : 0;

  const workerPayroll = hasSupplies ? (effectiveWorkers * (bizConfig.workerWage || 0)) : 0;
  const cappedPayroll = Math.min(workerPayroll, Math.floor(grossProfit * 0.35));
  const netProfit = Math.max(0, grossProfit - cappedPayroll);

  // Supply Chain Synergies Multiplier
  let synergyMultiplier = 1.0;
  if (playerState.assets && playerState.businesses) {
    if (key === 'logistics' && ((playerState.assets.mega_yacht || 0) > 0 || (playerState.assets.private_island || 0) > 0)) {
      synergyMultiplier = 1.15;
    } else if (key === 'coffee' && (playerState.businesses.supermarket && playerState.businesses.supermarket.level > 0)) {
      synergyMultiplier = 1.10;
    } else if (key === 'tech' && (playerState.businesses.private_bank && playerState.businesses.private_bank.level > 0)) {
      synergyMultiplier = 1.20;
    } else if (key === 'space_tech' && ((playerState.assets.orbital_station || 0) > 0)) {
      synergyMultiplier = 1.30;
    }
  }

  const franchiseMultiplier = bizState.isFranchise ? 1.20 : 1.0;
  const finalNetProfit = Math.max(0, Math.floor(netProfit * synergyMultiplier * franchiseMultiplier));

  return {
    grossProfit,
    payroll: cappedPayroll,
    netProfit,
    ownerProfit: finalNetProfit,
    demand,
    effectiveWorkers,
    hasSupplies
  };
}

/**
 * Calculates the total hourly profit across all owned businesses
 */
function calculateAllBusinessesHourly(playerState) {
  if (!playerState || !playerState.businesses) return 0;
  let totalHourly = 0;
  Object.keys(playerState.businesses).forEach(key => {
    const b = playerState.businesses[key];
    if (b && b.level > 0) {
      const res = calculateSingleBusinessProfit(key, b, playerState);
      totalHourly += (res.ownerProfit || 0);
    }
  });
  return totalHourly;
}

/**
 * Calculates the purchase / upgrade cost for a business level
 */
function getBusinessUpgradeCost(key, currentLevel) {
  const bizConfig = BUSINESSES[key];
  if (!bizConfig) return 0;
  if (currentLevel <= 0) return bizConfig.cost;
  // Upgrade scaling formula: baseCost * (1.15 ^ level)
  return Math.floor(bizConfig.cost * Math.pow(1.15, currentLevel));
}

module.exports = {
  calculateSingleBusinessProfit,
  calculateAllBusinessesHourly,
  getBusinessUpgradeCost
};
