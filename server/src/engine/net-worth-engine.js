/**
 * Ras ALmal Tycoon — Authoritative Net Worth & Rank Engine
 */

const { ASSETS, STOCKS, TITLES, INDUSTRIAL_SECTORS } = require('./definitions');

/**
 * Calculates accurate total net worth of a player (Assets - Liabilities)
 * @param {Object} playerState - Sanitized player state
 * @param {Object} stockPrices - Current live/market stock price map (optional)
 * @returns {number} Integer net worth
 */
function calculateNetWorth(playerState, stockPrices = {}) {
  if (!playerState) return 0;

  let worth = Number(playerState.cash || 0) + Number(playerState.bank || 0) + Number(playerState.dirtyCash || 0);

  // Add real estate assets valuation
  if (playerState.assets && typeof playerState.assets === 'object') {
    Object.keys(playerState.assets).forEach(key => {
      const count = Number(playerState.assets[key] || 0);
      if (count > 0 && ASSETS[key]) {
        worth += count * ASSETS[key].cost;
      }
    });
  }

  // Add stock share value
  if (playerState.stocks && typeof playerState.stocks === 'object') {
    Object.keys(playerState.stocks).forEach(sym => {
      const stockObj = playerState.stocks[sym];
      const shares = Number((stockObj && stockObj.shares) || 0);
      if (shares > 0) {
        const livePrice = Number(stockPrices[sym] || (STOCKS[sym] ? STOCKS[sym].basePrice : 50));
        worth += shares * livePrice;
      }
    });
  }

  // Add locked investments
  if (Array.isArray(playerState.investments)) {
    playerState.investments.forEach(inv => {
      worth += Number((inv && inv.investedAmount) || 0);
    });
  }

  // Add industrial supply chain infrastructure & inventory value
  if (playerState.industry && INDUSTRIAL_SECTORS && typeof INDUSTRIAL_SECTORS === 'object') {
    Object.keys(INDUSTRIAL_SECTORS).forEach(secKey => {
      const secDef = INDUSTRIAL_SECTORS[secKey];
      const sec = playerState.industry[secKey];
      if (sec && sec.unlocked) {
        worth += Number(secDef.unlockCost || 0);
        ['stage1', 'stage2', 'stage3', 'logistics'].forEach(stKey => {
          const lvl = Number(sec[stKey] || 0);
          if (lvl > 0 && secDef.stages && secDef.stages[stKey]) {
            worth += Math.floor((secDef.stages[stKey].baseCost || 0) * lvl * 1.15);
          }
        });
        if (sec.readyStock > 0 && secDef.product) {
          worth += Math.floor(Number(sec.readyStock || 0) * (secDef.product.baseValue || 0));
        }
      }
    });
  }

  // Deduct active bank loan liabilities (True Net Worth = Assets - Liabilities)
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
