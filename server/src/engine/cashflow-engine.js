/**
 * Ras ALmal Tycoon — Authoritative Server Cashflow Engine
 * Calculates synchronized passive income per second from businesses, properties,
 * luxury cars, bank interest, and careers, and accrues it continuously into player bank.
 */

const { BUSINESSES, ASSETS, CAR_TEMPLATES } = require('./definitions');
const { calculateSingleBusinessProfit } = require('./business-engine');
const { calculateNetWorth, getAppropriateTitle } = require('./net-worth-engine');

/**
 * Calculates the exact hourly passive cashflow for a player state
 * @param {Object} playerState
 * @returns {number} Integer EGP per hour
 */
function calculateAuthoritativeHourlyCashflow(playerState) {
  if (!playerState || typeof playerState !== 'object') return 0;

  let hourlyIncome = 0;

  // 1. Businesses
  if (playerState.businesses && typeof playerState.businesses === 'object') {
    Object.keys(playerState.businesses).forEach(bk => {
      const b = playerState.businesses[bk];
      if (b && b.level > 0) {
        const bCalc = calculateSingleBusinessProfit(bk, b, playerState);
        hourlyIncome += Math.max(0, Number(bCalc.ownerProfit || 0));
      }
    });
  }

  // 2. Real Estate Assets (Rent)
  if (playerState.assets && typeof playerState.assets === 'object') {
    Object.keys(playerState.assets).forEach(ak => {
      const count = Number(playerState.assets[ak] || 0);
      if (count > 0 && ASSETS[ak]) {
        hourlyIncome += count * Math.floor(ASSETS[ak].rent * 0.1);
      }
    });
  }

  // 3. Luxury Cars (Rental Net Profit)
  if (Array.isArray(playerState.ownedCars)) {
    playerState.ownedCars.forEach(c => {
      if (c && (c.rentStatus === 'rented' || c.isRented === true)) {
        const tpl = CAR_TEMPLATES[c.id];
        if (tpl) {
          const netCarRent = Number(tpl.rentalIncomePerTick || 0) - Number(tpl.maintenanceCostPerTick || 0);
          if (netCarRent > 0) hourlyIncome += netCarRent;
        }
      }
    });
  }

  // 4. Bank Compound Interest: Handled via explicit daily claim endpoint /api/action/bank/claim-interest
  // (Disabled continuous automatic compounding to eliminate balance fluctuation and race conditions)

  // 5. Hired Peer Job Salary
  if (playerState.hiredJob && playerState.hiredJob.salary) {
    hourlyIncome += Math.max(0, Number(playerState.hiredJob.salary || 0));
  }

  return Math.max(0, Math.floor(hourlyIncome));
}

/**
 * Accrues verified passive cashflow into player bank based on elapsed Delta-Time
 * @param {Object} playerState
 * @param {number} serverNow
 * @returns {Object} { elapsedSeconds, hourlyRate, perSecond, accrued, bank }
 */
function accrueAuthoritativeCashflow(playerState, serverNow = Date.now()) {
  if (!playerState || typeof playerState !== 'object') {
    return { elapsedSeconds: 0, hourlyRate: 0, perSecond: 0, accrued: 0, bank: 0 };
  }

  const lastTime = Number(playerState.lastCashflowAccrualAt || playerState.lastActiveTimestamp || serverNow);
  const rawElapsed = Math.max(0, Math.floor((serverNow - lastTime) / 1000));
  const elapsedSeconds = Math.min(43200, rawElapsed); // Max 12 hours online delta

  if (elapsedSeconds > 0 && rawElapsed <= 43200) {
    playerState.lastCashflowAccrualAt = lastTime + (elapsedSeconds * 1000);
  } else if (!playerState.lastCashflowAccrualAt || rawElapsed > 43200) {
    playerState.lastCashflowAccrualAt = serverNow;
  }

  // Mature any locked bank investments & certificates that completed while online
  let maturedPayout = 0;
  if (Array.isArray(playerState.investments) && playerState.investments.length > 0) {
    const remainingInvestments = [];
    playerState.investments.forEach(inv => {
      if (!inv || inv.claimed === true || inv.matured === true) return;
      const maturesAt = Number(inv.maturesAt || 0);
      const isMatured = (maturesAt > 0 && serverNow >= maturesAt) ||
                        (maturesAt <= 0 && typeof inv.ticksRemaining === 'number' && inv.ticksRemaining <= Math.max(1, elapsedSeconds));
      if (isMatured) {
        inv.claimed = true;
        inv.matured = true;
        const rate = Number(inv.rate || 0);
        const amt = Number(inv.investedAmount || 0);
        const payout = amt + Math.round(amt * rate);
        maturedPayout += payout;
        playerState.bank = (Number(playerState.bank) || 0) + payout;
      } else {
        if (maturesAt > 0) {
          inv.ticksRemaining = Math.max(0, Math.ceil((maturesAt - serverNow) / 1000));
        } else if (typeof inv.ticksRemaining === 'number' && elapsedSeconds > 0) {
          inv.ticksRemaining = Math.max(0, inv.ticksRemaining - elapsedSeconds);
        }
        remainingInvestments.push(inv);
      }
    });
    playerState.investments = remainingInvestments;
    if (maturedPayout > 0) {
      playerState.netWorth = calculateNetWorth(playerState);
      playerState.title = getAppropriateTitle(playerState.netWorth, playerState.xp || 0);
    }
  }

  const hourlyRate = calculateAuthoritativeHourlyCashflow(playerState);
  const perSecond = hourlyRate / 3600;

  if (elapsedSeconds <= 0 || perSecond <= 0) {
    return {
      elapsedSeconds: 0,
      hourlyRate,
      perSecond,
      accrued: maturedPayout,
      bank: playerState.bank
    };
  }

  const exactEarned = (Number(playerState._cashflowRemainder) || 0) + (perSecond * elapsedSeconds);
  const accrued = Math.floor(exactEarned);
  playerState._cashflowRemainder = Math.max(0, exactEarned - accrued);

  if (accrued > 0) {
    playerState.bank = (Number(playerState.bank) || 0) + accrued;
    if (playerState.businesses && typeof playerState.businesses === 'object') {
      Object.keys(playerState.businesses).forEach(bk => {
        const b = playerState.businesses[bk];
        if (b && typeof b.suppliesTicks === 'number' && b.suppliesTicks > 0) {
          b.suppliesTicks = Math.max(0, b.suppliesTicks - elapsedSeconds);
        }
      });
    }
    playerState.netWorth = calculateNetWorth(playerState);
    playerState.title = getAppropriateTitle(playerState.netWorth, playerState.xp || 0);
  }

  return {
    elapsedSeconds,
    hourlyRate,
    perSecond,
    accrued: accrued + maturedPayout,
    bank: playerState.bank
  };
}

module.exports = {
  calculateAuthoritativeHourlyCashflow,
  accrueAuthoritativeCashflow
};
