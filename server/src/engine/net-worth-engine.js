/**
 * Ras ALmal Tycoon — Authoritative Net Worth & Rank Engine
 */

const { ASSETS, STOCKS, TITLES, CAR_TEMPLATES, INDUSTRIAL_SECTORS, TRADE_COMMODITIES } = require('./definitions');

/**
 * Calculates accurate total net worth of a player (Assets - Liabilities)
 * Full Complete Model: Liquid Wealth + Fixed Assets + Cars + Stocks + Investments + Industry + Trade + Farm - Loans
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

  // 5. Industrial supply chain infrastructure & inventory
  if (playerState.industry && INDUSTRIAL_SECTORS && typeof INDUSTRIAL_SECTORS === 'object') {
    Object.keys(INDUSTRIAL_SECTORS).forEach(secKey => {
      const secDef = INDUSTRIAL_SECTORS[secKey];
      const sec = playerState.industry[secKey];
      if (sec && sec.unlocked) {
        worth += Number(secDef.unlockCost || 0);
        ['stage1', 'stage2', 'stage3', 'logistics'].forEach(stKey => {
          const lvl = Number(sec[stKey] || 0);
          if (lvl > 1 && secDef.stages && secDef.stages[stKey]) {
            const baseCost = Number(secDef.stages[stKey].baseCost || 0);
            for (let i = 1; i < lvl; i++) {
              worth += Math.floor(baseCost * Math.pow(1.65, i));
            }
          }
        });
        if (sec.readyStock > 0 && secDef.product) {
          worth += Math.floor(Number(sec.readyStock || 0) * (secDef.product.baseValue || 0));
        }
      }
    });
  }

  // 6. Trade & customs warehouse inventory + active shipments
  if (playerState.tradeCompany && typeof playerState.tradeCompany === 'object') {
    const commodities = (typeof TRADE_COMMODITIES === 'object' && TRADE_COMMODITIES) ? TRADE_COMMODITIES : {};
    const COMMODITY_FALLBACK_COSTS = {
      fashion_brands: 5000,
      espresso_coffee: 8000,
      auto_spare_parts: 25000,
      solar_panels: 50000,
      luxury_cars: 120000,
      industrial_turbines: 250000,
      ai_quantum_chips: 500000,
      luxury_perfumes: 12000,
      medical_devices: 22000,
      smart_electronics: 45000,
      ev_cars: 85000
    };

    const getUnitCost = (cId) => {
      if (commodities[cId] && typeof commodities[cId].unitCost === 'number') {
        return commodities[cId].unitCost;
      }
      return COMMODITY_FALLBACK_COSTS[cId] || 5000;
    };

    if (playerState.tradeCompany.warehouse && typeof playerState.tradeCompany.warehouse === 'object') {
      Object.keys(playerState.tradeCompany.warehouse).forEach(commId => {
        const qty = Number(playerState.tradeCompany.warehouse[commId] || 0);
        if (qty > 0) {
          worth += qty * getUnitCost(commId);
        }
      });
    }
    if (Array.isArray(playerState.tradeCompany.activeImports)) {
      playerState.tradeCompany.activeImports.forEach(imp => {
        worth += Number(imp.totalCost || ((imp.quantity || 0) * getUnitCost(imp.commodityId)) || 0);
      });
    }
    if (Array.isArray(playerState.tradeCompany.activeExports)) {
      playerState.tradeCompany.activeExports.forEach(exp => {
        if (!exp.claimed) {
          worth += Number(exp.quantity || 0) * getUnitCost(exp.commodityId);
        }
      });
    }
  }

  // 7. Agro Farm Tycoon (Lands, upgrades, silos, livestock, crops)
  if (playerState.farm && playerState.farm.unlocked) {
    const landLevelValues = { 1: 1000000, 2: 1500000, 3: 4500000, 4: 14500000 };
    worth += (landLevelValues[playerState.farm.landLevel] || ((playerState.farm.maxPlots || 4) * 250000));
    worth += (playerState.farm.waterLevel || 1) * 40000;
    worth += (playerState.farm.fertilizerLevel || 1) * 35000;
    worth += (playerState.farm.workers || 0) * 30000;
    const siloValues = { 1: 0, 2: 250000, 3: 1250000, 4: 4750000 };
    worth += (siloValues[playerState.farm.siloLevel || 1] || 0);

    if (playerState.farm.livestock) {
      worth += (Number(playerState.farm.livestock.cows || 0)) * 25000;
      worth += (Number(playerState.farm.livestock.chickens || 0)) * 8000;
      worth += (Number(playerState.farm.livestock.milk || 0)) * 45;
      worth += (Number(playerState.farm.livestock.eggs || 0)) * 15;
      worth += (Number(playerState.farm.livestock.compost || 0)) * 10;
    }
    if (playerState.farm.processing && playerState.farm.processing.unlocked) {
      worth += 500000;
    }
    if (playerState.farm.inventory) {
      const cropPrices = { wheat: 6, tomato: 24, strawberry: 118, coffee: 490, dates: 2450, saffron: 9800 };
      Object.keys(playerState.farm.inventory).forEach(cId => {
        const qty = Number(playerState.farm.inventory[cId] || 0);
        if (qty > 0 && cropPrices[cId]) {
          worth += qty * cropPrices[cId];
        }
      });
    }
    if (playerState.farm.processing && playerState.farm.processing.storage) {
      const recipeValues = { flour_bread: 56, tomato_paste: 196, strawberry_jam: 555, premium_coffee: 2300, stuffed_dates: 11500, saffron_essence: 34500 };
      Object.keys(playerState.farm.processing.storage).forEach(rId => {
        const qty = Number(playerState.farm.processing.storage[rId] || 0);
        if (qty > 0 && recipeValues[rId]) {
          worth += qty * recipeValues[rId];
        }
      });
    }
  }

  // 8. Deduct active bank loan liabilities (True Net Worth = Assets - Liabilities)
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
