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

  // 4. Bank Compound Interest
  const bankBal = Number(playerState.bank || 0);
  if (bankBal > 0) {
    let baseRate = 0.00015; // 0.015% per hour (~13% APY)
    if (playerState.activeCar === 'rolls') baseRate *= 1.05;
    if (playerState.inventory && playerState.inventory.diamond_card > 0) baseRate *= 1.10;

    let effBalance = Math.min(bankBal, 5000000);
    if (bankBal > 5000000) effBalance += Math.min(bankBal - 5000000, 20000000) * 0.40;
    if (bankBal > 25000000) effBalance += Math.min(bankBal - 25000000, 75000000) * 0.15;

    hourlyIncome += Math.floor(effBalance * baseRate);
  }

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

  playerState.lastCashflowAccrualAt = serverNow;

  const hourlyRate = calculateAuthoritativeHourlyCashflow(playerState);
  const perSecond = hourlyRate / 3600;

  if (elapsedSeconds <= 0 || perSecond <= 0) {
    return {
      elapsedSeconds: 0,
      hourlyRate,
      perSecond,
      accrued: 0,
      bank: playerState.bank
    };
  }

  const accrued = Math.floor(perSecond * elapsedSeconds);

  if (accrued > 0) {
    playerState.bank = (Number(playerState.bank) || 0) + accrued;
    playerState.netWorth = calculateNetWorth(playerState);
    playerState.title = getAppropriateTitle(playerState.netWorth, playerState.xp || 0);
  }

  return {
    elapsedSeconds,
    hourlyRate,
    perSecond,
    accrued,
    bank: playerState.bank
  };
}

module.exports = {
  calculateAuthoritativeHourlyCashflow,
  accrueAuthoritativeCashflow
};
