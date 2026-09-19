/**
 * Ras ALmal Tycoon — Authoritative Net Worth & Rank Engine
 */

const { ASSETS, STOCKS, TITLES, CAR_TEMPLATES } = require('./definitions');

/**
 * Calculates accurate total net worth of a player (Assets - Liabilities)
 * Simple & Transparent Model: Liquid Wealth + Fixed Assets + Invested Stocks - Loans
 * @param {Object} playerState - Sanitized player state
 * @returns {number} Integer net worth
 */
function calculateNetWorth(playerState) {
  if (!playerState) return 0;

  const cash = Math.max(0, Number(playerState.cash || 0));
  const bank = Math.max(0, Number(playerState.bank || 0));
  const dirtyCash = Math.max(0, Number(playerState.dirtyCash || 0));
  let worth = cash + bank + dirtyCash;

  // 1. Locked bank investments & certificates
  if (Array.isArray(playerState.investments)) {
    playerState.investments.forEach(inv => {
      worth += Number((inv && inv.investedAmount) || 0);
    });
  }

  // 2. Real estate assets valuation
  if (playerState.assets && typeof playerState.assets === 'object') {
    Object.keys(playerState.assets).forEach(key => {
      const count = Number(playerState.assets[key] || 0);
      if (count > 0 && ASSETS[key]) {
        worth += count * (ASSETS[key].cost || 0);
      }
    });
  }

  // 3. Owned Luxury Cars
  if (Array.isArray(playerState.ownedCars) && CAR_TEMPLATES) {
    playerState.ownedCars.forEach(c => {
      const carId = (c && typeof c === 'object') ? c.id : c;
      if (carId && CAR_TEMPLATES[carId]) {
        worth += Number(CAR_TEMPLATES[carId].cost || 0);
      }
    });
  }

  // 4. Stock shares at Cost Basis (Invested Capital = shares * avgPrice)
  // Keeps net worth rock-solid and stable against second-by-second market volatility
  if (playerState.stocks && typeof playerState.stocks === 'object') {
    Object.keys(playerState.stocks).forEach(sym => {
      const stockObj = playerState.stocks[sym];
      const shares = Number((stockObj && stockObj.shares) || 0);
      if (shares > 0) {
        const avgPrice = Number((stockObj && stockObj.avgPrice) || (STOCKS[sym] ? STOCKS[sym].basePrice : 50));
        worth += shares * avgPrice;
      }
    });
  }

  // 5. Deduct active bank loan liabilities (True Net Worth = Assets - Liabilities)
  if (playerState.activeLoan) {
    const loanDebt = Number(playerState.activeLoan.totalDue || playerState.activeLoan.amount || 0);
    if (loanDebt > 0) {
      worth -= loanDebt;
    }
  }

  return Math.max(0, Math.floor(worth));
}

/**
 * Derives the appropriate player rank/title from net worth and XP
 */
function getAppropriateTitle(worth, xp) {
  const w = Number(worth || 0);
  const x = Number(xp || 0);

  for (const t of TITLES) {
    if (w >= t.minWorth && x >= t.minXp) {
      return t.title;
    }
  }
  return 'عامل مبتدئ';
}

module.exports = {
  calculateNetWorth,
  getAppropriateTitle
};
