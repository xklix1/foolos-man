/**
 * Ras ALmal Tycoon — Server-Authoritative 12-Hour Offline Engine
 * 
 * Rules:
 * 1. Time Source: Server Monotonic / Linux NTP Clock only (Immune to client clock spoofing).
 * 2. Hard Cap: Strict Math.min(43200, elapsedSeconds) — 12 hours maximum.
 * 3. AFK Manager Validation: Profits are generated strictly during the interval when
 *    afkManagerExpiresAt was active. If it expired during absence, only the active
 *    seconds yield profit; the remaining hours yield $0.
 * 4. Supplies Depletion: Supplies are consumed by real elapsed time. If a business
 *    runs out of supplies, production halts for that business.
 * 5. Jail Sentence: Decrements by real elapsed time.
 */

const { BUSINESSES, ASSETS, CAR_TEMPLATES } = require('./definitions');
const { calculateSingleBusinessProfit } = require('./business-engine');
const { calculateNetWorth, getAppropriateTitle } = require('./net-worth-engine');

const MAX_OFFLINE_SECONDS = 12 * 3600; // 43,200 seconds

/**
 * Executes the authoritative offline catch-up calculation on a player state
 * @param {Object} playerState - Mutable in-memory player state
 * @param {number} serverNow - Trusted server timestamp in milliseconds (Date.now())
 * @returns {Object} Detailed report for the client UI modal
 */
function calculateAuthoritativeOfflineProgress(playerState, serverNow = Date.now()) {
  if (!playerState || typeof playerState !== 'object') {
    return { applied: false, reason: 'invalid_state' };
  }

  const lastActive = Number(playerState.lastActiveTimestamp || playerState.lastSeen || serverNow);
  const rawElapsed = Math.max(0, Math.floor((serverNow - lastActive) / 1000));
  const totalElapsedSeconds = Math.min(MAX_OFFLINE_SECONDS, rawElapsed);

  // If less than 10 seconds elapsed, skip offline calculation
  if (totalElapsedSeconds < 10) {
    playerState.lastActiveTimestamp = serverNow;
    playerState.lastSeen = serverNow;
    return { applied: false, reason: 'insufficient_elapsed_time', elapsedSeconds: totalElapsedSeconds };
  }

  // Evaluate AFK Manager coverage
  const managerExpiry = Number(playerState.afkManagerExpiresAt || 0);
  const isManagerActiveAtExit = managerExpiry > lastActive;
  
  let profitableSeconds = 0;
  if (isManagerActiveAtExit) {
    const managerCoverageEnd = Math.min(serverNow, managerExpiry);
    profitableSeconds = Math.max(0, Math.min(totalElapsedSeconds, Math.floor((managerCoverageEnd - lastActive) / 1000)));
  }

  // Decrement jail sentence by real elapsed time
  if (playerState.jailTimer > 0) {
    playerState.jailTimer = Math.max(0, playerState.jailTimer - totalElapsedSeconds);
  }

  let totalBizGross = 0;
  let totalBizPayroll = 0;
  let offlineBizEarnings = 0;
  let totalSuppliesConsumedSec = 0;
  const bizBreakdown = [];

  // 1. Calculate Business Earnings & Worker Payroll (gated by AFK Manager & Supplies)
  if (profitableSeconds >= 10 && playerState.businesses) {
    Object.keys(playerState.businesses).forEach(bk => {
      const b = playerState.businesses[bk];
      if (b && b.level > 0 && typeof b.suppliesTicks === 'number' && b.suppliesTicks > 0) {
        // Business produces only while both manager is active AND supplies are stocked
        const activeSeconds = Math.min(b.suppliesTicks, profitableSeconds);
        const bCalc = calculateSingleBusinessProfit(bk, { ...b, suppliesTicks: activeSeconds }, playerState);
        const earned = Math.floor(((bCalc.ownerProfit || 0) / 3600) * activeSeconds);
        const gross = Math.floor(((bCalc.grossProfit || 0) / 3600) * activeSeconds);
        const payroll = Math.floor(((bCalc.payroll || 0) / 3600) * activeSeconds);

        totalBizGross += gross;
        totalBizPayroll += payroll;
        offlineBizEarnings += earned;
        totalSuppliesConsumedSec += activeSeconds;

        bizBreakdown.push({
          id: bk,
          name: BUSINESSES[bk] ? BUSINESSES[bk].name : bk,
          activeHours: Number((activeSeconds / 3600).toFixed(2)),
          consumedHours: Number((activeSeconds / 3600).toFixed(1)),
          grossProfit: gross,
          payroll: payroll,
          profit: earned
        });
      }
    });
  }

  // 2. Real Estate Passive Rent (gated by Manager)
  let totalAssetEarnings = 0;
  const assetBreakdown = [];
  if (profitableSeconds >= 10 && playerState.assets) {
    Object.keys(playerState.assets).forEach(ak => {
      const count = Number(playerState.assets[ak] || 0);
      if (count > 0 && ASSETS[ak]) {
        const hourlyRent = count * Math.floor(ASSETS[ak].rent * 0.1);
        const earned = Math.floor((hourlyRent / 3600) * profitableSeconds);
        totalAssetEarnings += earned;
        assetBreakdown.push({
          id: ak,
          name: ASSETS[ak].name,
          count,
          profit: earned
        });
      }
    });
  }

  // 3. Rented Cars Revenue & Maintenance Costs (gated by Manager)
  let totalCarGross = 0;
  let totalCarMaintenance = 0;
  let totalCarNet = 0;
  const carBreakdown = [];
  if (profitableSeconds >= 10 && playerState.ownedCars) {
    const cars = Array.isArray(playerState.ownedCars) ? playerState.ownedCars : Object.values(playerState.ownedCars);
    cars.forEach(carRef => {
      if (carRef && carRef.rentStatus === 'rented' && CAR_TEMPLATES[carRef.id]) {
        const cCfg = CAR_TEMPLATES[carRef.id];
        const carGross = Math.floor(((cCfg.rentalIncomePerTick || 0) / 3600) * profitableSeconds);
        const carMaint = Math.floor(((cCfg.maintenanceCostPerTick || 0) / 3600) * profitableSeconds);
        const carNet = Math.max(0, carGross - carMaint);

        totalCarGross += carGross;
        totalCarMaintenance += carMaint;
        totalCarNet += carNet;

        carBreakdown.push({
          id: carRef.id,
          name: cCfg.name,
          grossRent: carGross,
          maintenance: carMaint,
          profit: carNet
        });
      }
    });
  }

  // 4. Bank Compound Interest (0.015% per hour, 250k daily cap)
  let bankInterestEarned = 0;
  if (profitableSeconds >= 10 && playerState.bank > 0) {
    const hourlyRate = 0.00015;
    const rollsBonus = (playerState.activeCar === 'rolls') ? 1.05 : 1.0;
    const hourlyInterest = Math.floor((playerState.bank * hourlyRate) * rollsBonus);
    bankInterestEarned = Math.min(250000, Math.floor((hourlyInterest / 3600) * profitableSeconds));
  }

  // 5. Always Deplete Supplies by Total Elapsed Time
  if (playerState.businesses) {
    Object.keys(playerState.businesses).forEach(bk => {
      const b = playerState.businesses[bk];
      if (b && typeof b.suppliesTicks === 'number' && b.suppliesTicks > 0) {
        b.suppliesTicks = Math.max(0, b.suppliesTicks - totalElapsedSeconds);
      }
    });
  }

  // 6. Cashflow Tax Deductions based on Net Worth Brackets (1% / 5% / 15%)
  let totalTaxDeducted = 0;
  const currentNetWorth = calculateNetWorth(playerState);
  const taxShieldActive = Boolean(playerState.inventory && playerState.inventory.tax_shield > 0);
  
  let taxRate = 0.01; // < 1M: 1%
  if (currentNetWorth > 5000000) {
    taxRate = 0.15; // > 5M: 15%
  } else if (currentNetWorth >= 1000000) {
    taxRate = 0.05; // 1M - 5M: 5%
  }
  if (taxShieldActive) taxRate *= 0.50; // 50% discount

  // Total Gross and Net Calculations
  const nonBizProfits = totalAssetEarnings + totalCarNet + bankInterestEarned;

  // Total gross offline cashflow earned before taxes
  const grossOfflineCashflow = offlineBizEarnings + nonBizProfits;
  if (grossOfflineCashflow > 0) {
    const fullTax = Math.floor(grossOfflineCashflow * taxRate);
    totalTaxDeducted = Math.min(fullTax, grossOfflineCashflow);
    playerState.totalTaxesPaid = (Number(playerState.totalTaxesPaid) || 0) + totalTaxDeducted;
  }

  const totalEarned = Math.max(0, offlineBizEarnings + nonBizProfits - totalTaxDeducted);
  const totalGross = totalBizGross + totalAssetEarnings + totalCarGross + bankInterestEarned;
  const totalDeductions = totalBizPayroll + totalCarMaintenance + totalTaxDeducted;

  // Credit net earnings to bank
  playerState.bank = (Number(playerState.bank) || 0) + totalEarned;

  // Re-evaluate net worth and title
  playerState.netWorth = calculateNetWorth(playerState);
  playerState.title = getAppropriateTitle(playerState.netWorth, playerState.xp);

  // Update timestamps
  playerState.lastActiveTimestamp = serverNow;
  playerState.lastSeen = serverNow;

  const report = {
    applied: true,
    elapsedSeconds: totalElapsedSeconds,
    elapsedHours: Number((totalElapsedSeconds / 3600).toFixed(2)),
    profitableSeconds,
    totalEarnings: totalEarned, // Net amount credited to bank
    grossEarnings: totalGross,
    totalDeductions: totalDeductions,
    bizEarnings: offlineBizEarnings,
    passiveEarnings: nonBizProfits,
    suppliesHours: Number((totalSuppliesConsumedSec / 3600).toFixed(1)),
    wasManagerActive: isManagerActiveAtExit,
    managerExpiredDuringAbsence: managerExpiry > 0 && serverNow > managerExpiry,
    
    // Detailed items breakdown
    earnings: {
      businesses: { title: 'أرباح المشاريع والشركات', amount: offlineBizEarnings, items: bizBreakdown },
      assets: { title: 'إيجارات العقارات والأصول', amount: totalAssetEarnings, items: assetBreakdown },
      cars: { title: 'إيجارات أسطول السيارات', amount: totalCarGross, items: carBreakdown },
      bank: { title: 'فوائد الودائع البنكية', amount: bankInterestEarned }
    },
    deductions: {
      payroll: { title: 'أجور ورواتب العمال والموظفين', amount: totalBizPayroll },
      carMaintenance: { title: 'صيانة وتشغيل أسطول السيارات', amount: totalCarMaintenance },
      tax: { title: 'ضريبة التدفق الساعي', amount: totalTaxDeducted },
      suppliesConsumedHours: Number((totalSuppliesConsumedSec / 3600).toFixed(1))
    },
    breakdown: bizBreakdown
  };

  playerState.lastOfflineReport = report;
  return report;
}

module.exports = {
  MAX_OFFLINE_SECONDS,
  calculateAuthoritativeOfflineProgress
};
