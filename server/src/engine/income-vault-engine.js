/**
 * Ras ALmal Tycoon — Server-Authoritative Income Vault Engine
 * Computes business, property, and vehicle rental revenue.
 * If AFK Manager is active, automatically collects into cash on action/claim.
 * If not, accumulates into vault until claimed.
 */

const { BUSINESSES, ASSETS, CAR_TEMPLATES } = require('./definitions');
const { calculateSingleBusinessProfit } = require('./business-engine');
const { calculateNetWorth, getAppropriateTitle } = require('./net-worth-engine');

function processIncomeVault(state, serverNow = Date.now(), isExplicitClaim = false) {
  if (!state || typeof state !== 'object') return { accrued: 0, claimed: 0 };

  const lastTime = Number(state.lastIncomeAccrualAt || state.lastActiveTimestamp || serverNow);
  const rawElapsed = Math.max(0, Math.floor((serverNow - lastTime) / 1000));
  const elapsedSeconds = Math.min(43200, rawElapsed); // Max 12 hours

  state.lastIncomeAccrualAt = serverNow;
  if (typeof state.incomeVault !== 'number') state.incomeVault = 0;

  if (elapsedSeconds <= 0 && !isExplicitClaim) {
    return { accrued: 0, claimed: 0, vault: state.incomeVault, cash: state.cash };
  }

  const managerExpiry = Number(state.afkManagerExpiresAt || 0);
  const isManagerActive = managerExpiry > serverNow;

  let accruedNet = 0;

  if (elapsedSeconds > 0) {
    // 1. Business Earnings (respecting supplies ticks)
    if (state.businesses) {
      Object.keys(state.businesses).forEach(bk => {
        const b = state.businesses[bk];
        if (b && b.level > 0 && typeof b.suppliesTicks === 'number' && b.suppliesTicks > 0) {
          const activeSec = Math.min(b.suppliesTicks, elapsedSeconds);
          const bCalc = calculateSingleBusinessProfit(bk, { ...b, suppliesTicks: activeSec }, state);
          const earned = Math.floor(((bCalc.ownerProfit || 0) / 3600) * activeSec);
          if (earned > 0) {
            accruedNet += earned;
            b.suppliesTicks = Math.max(0, b.suppliesTicks - activeSec);
          }
        }
      });
    }

    // 2. Real Estate Rental Earnings
    if (state.assets) {
      Object.keys(state.assets).forEach(ak => {
        const count = Number(state.assets[ak] || 0);
        if (count > 0 && ASSETS[ak]) {
          const hourlyRent = count * Math.floor(ASSETS[ak].rent * 0.1);
          const earned = Math.floor((hourlyRent / 3600) * elapsedSeconds);
          accruedNet += earned;
        }
      });
    }

    // 3. Rented Cars Earnings
    if (state.ownedCars) {
      const cars = Array.isArray(state.ownedCars) ? state.ownedCars : Object.values(state.ownedCars);
      cars.forEach(carRef => {
        if (carRef && carRef.rentStatus === 'rented' && CAR_TEMPLATES[carRef.id]) {
          const cCfg = CAR_TEMPLATES[carRef.id];
          const carGross = Math.floor(((cCfg.rentalIncomePerTick || 0) / 3600) * elapsedSeconds);
          const carMaint = Math.floor(((cCfg.maintenanceCostPerTick || 0) / 3600) * elapsedSeconds);
          const carNet = Math.max(0, carGross - carMaint);
          accruedNet += carNet;
        }
      });
    }
  }

  let claimedAmount = 0;

  if (isManagerActive) {
    // Manager automatically claims directly to cash
    claimedAmount = accruedNet + Number(state.incomeVault || 0);
    state.incomeVault = 0;
    state.cash = (Number(state.cash) || 0) + claimedAmount;
  } else if (isExplicitClaim) {
    // Player explicitly clicked "Claim Income"
    claimedAmount = accruedNet + Number(state.incomeVault || 0);
    state.incomeVault = 0;
    state.cash = (Number(state.cash) || 0) + claimedAmount;
  } else {
    // No manager, regular action/tick: accumulate into vault
    state.incomeVault = (Number(state.incomeVault) || 0) + accruedNet;
  }

  state.netWorth = calculateNetWorth(state);
  state.title = getAppropriateTitle(state.netWorth, state.xp || 0);

  return {
    elapsedSeconds,
    accrued: accruedNet,
    claimed: claimedAmount,
    vault: state.incomeVault,
    cash: state.cash,
    isManagerActive
  };
}

module.exports = {
  processIncomeVault
};
