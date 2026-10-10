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
const { AIRCRAFT_MODELS, FLIGHT_DESTINATIONS, calculateFlightEconomics } = require('./airport-engine');

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

  // 6. Cashflow Tax Deductions (Tax Amnesty Season: 100% Exempt)
  let totalTaxDeducted = 0;
  // موسم العفو الضريبي: كافة الضرائب معفاة تماماً بنسبة 100%
  let taxRate = 0;

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

  // 7. Trade Company (الاستيراد والتصدير): Resolve arriving imports and delivering exports offline
  if (playerState.tradeCompany && typeof playerState.tradeCompany === 'object') {
    if (!playerState.tradeCompany.warehouse || typeof playerState.tradeCompany.warehouse !== 'object') {
      playerState.tradeCompany.warehouse = {};
    }
    if (Array.isArray(playerState.tradeCompany.activeImports)) {
      playerState.tradeCompany.activeImports.forEach(imp => {
        if (!imp.arrived && serverNow >= imp.arrivalTime) {
          imp.arrived = true;
          playerState.tradeCompany.warehouse[imp.commodityId] = (playerState.tradeCompany.warehouse[imp.commodityId] || 0) + imp.quantity;
        }
      });
    }
    if (Array.isArray(playerState.tradeCompany.activeExports)) {
      playerState.tradeCompany.activeExports.forEach(exp => {
        if (!exp.delivered && serverNow >= exp.deliveryTime) {
          exp.delivered = true;
        }
      });
    }
  }

  // 8. Locked Bank Investments & Funds (الصناديق الاستثمارية المصرفية): Auto-credit matured funds with profits to bank
  let totalInvestmentsPayout = 0;
  if (Array.isArray(playerState.investments) && playerState.investments.length > 0) {
    const remainingInvestments = [];
    playerState.investments.forEach(inv => {
      if (!inv || inv.claimed === true || inv.matured === true) return;
      const maturesAt = Number(inv.maturesAt || 0);
      const isMatured = (maturesAt > 0 && serverNow >= maturesAt) || (maturesAt <= 0 && typeof inv.ticksRemaining === 'number' && inv.ticksRemaining <= totalElapsedSeconds);
      if (isMatured) {
        inv.claimed = true;
        inv.matured = true;
        const rate = Number(inv.rate || 0);
        const amt = Number(inv.investedAmount || 0);
        const payout = Math.floor(amt * (1 + rate));
        totalInvestmentsPayout += payout;
        playerState.bank = (Number(playerState.bank) || 0) + payout;
        if (!playerState.activityLog) playerState.activityLog = [];
        playerState.activityLog.unshift({
          action: 'استحقاق أرباح صندوق استثماري 🏛️',
          details: `اكتملت مدة الاستثمار في "${inv.name || 'الصندوق الاستثماري'}". تم إيداع رأس المال والأرباح بالكامل في حسابك البنكي (+${payout.toLocaleString()} EGP).`,
          category: 'banking',
          timestamp: serverNow,
          cash: Math.max(0, Math.round(Number(playerState.cash || 0))),
          bank: Math.max(0, Math.round(Number(playerState.bank || 0)))
        });
        if (playerState.activityLog.length > 3500) playerState.activityLog.length = 3500;
      } else {
        if (maturesAt > 0) {
          inv.ticksRemaining = Math.max(0, Math.ceil((maturesAt - serverNow) / 1000));
        } else if (typeof inv.ticksRemaining === 'number') {
          inv.ticksRemaining = Math.max(0, inv.ticksRemaining - totalElapsedSeconds);
        }
        remainingInvestments.push(inv);
      }
    });
    playerState.investments = remainingInvestments;
  }

  // 9. Airport & Aviation Hub (المطار والأسطول الجوي): Resolve completed flights, Auto-Pilot simulation, and accumulate duty-free
  let airportAutoReport = null;
  if (playerState.airport && playerState.airport.unlocked) {
    const ap = playerState.airport;
    const isTier3Manager = ap.manager && Number(ap.manager.tier) >= 3 && ap.manager.autoPilot !== false;

    // Real elapsed time for Airport Tier 3 Auto-Pilot can be up to 72 hours (259,200 seconds)
    const airportOfflineSeconds = isTier3Manager ? Math.min(72 * 3600, rawElapsed) : totalElapsedSeconds;

    let autoFlightsCount = 0;
    let autoTotalProfit = 0;
    let autoTotalXP = 0;

    if (Array.isArray(ap.fleet)) {
      ap.fleet.forEach(plane => {
        if (!plane) return;

        let planeRemainingSeconds = airportOfflineSeconds;

        // A. If plane was in-flight when session closed, resolve it first
        if (plane.status === 'in_flight' && plane.activeFlight) {
          const arrTime = Number(plane.activeFlight.arrivalTime || 0);
          if (arrTime > 0 && serverNow >= arrTime) {
            plane.status = 'idle';
            const profit = Number(plane.activeFlight.economics?.netProfit || plane.activeFlight.netProfit || 0);
            const xp = Number(plane.activeFlight.xpReward || 0);
            if (profit > 0) {
              playerState.bank = (Number(playerState.bank) || 0) + profit;
              if (!ap.stats) ap.stats = {};
              ap.stats.totalFlights = (Number(ap.stats.totalFlights) || 0) + 1;
              ap.stats.totalNetProfit = (Number(ap.stats.totalNetProfit) || 0) + profit;
              plane.flightsCompleted = (Number(plane.flightsCompleted) || 0) + 1;
              plane.totalProfitEarned = (Number(plane.totalProfitEarned) || 0) + profit;
              playerState.xp = (Number(playerState.xp) || 0) + xp;
            }
            const flightElapsedSec = Math.max(0, Math.floor((arrTime - lastActive) / 1000));
            planeRemainingSeconds = Math.max(0, airportOfflineSeconds - flightElapsedSec);
            plane.activeFlight = null;
          } else {
            // Still in flight
            planeRemainingSeconds = 0;
          }
        }

        // B. Smart Auto-Pilot for Tier 3 Manager: continuously dispatch plane to highest profitable destination
        if (isTier3Manager && plane.status === 'idle' && planeRemainingSeconds > 60) {
          const model = AIRCRAFT_MODELS[plane.modelId] || AIRCRAFT_MODELS.cessna_sky;
          const runwayLvl = Math.max(1, Math.min(4, Number(ap.facilities?.runway || 1)));

          // Find highest destination this plane and runway can fly to
          const validDests = Object.values(FLIGHT_DESTINATIONS).filter(d => (d.requiredTier || 1) <= model.tier && (d.requiredTier || 1) <= runwayLvl);
          const bestDest = validDests.sort((a, b) => (b.distanceMultiplier || 1) - (a.distanceMultiplier || 1))[0] || FLIGHT_DESTINATIONS.cairo_dubai;

          const econ = calculateFlightEconomics(model, bestDest, ap);
          const flightDuration = Math.max(60, Number(econ.durationSec || 5400));
          const cycles = Math.floor(planeRemainingSeconds / flightDuration);

          if (cycles > 0) {
            const batchProfit = econ.netProfit * cycles;
            const batchXP = econ.xpReward * cycles;

            playerState.bank = (Number(playerState.bank) || 0) + batchProfit;
            playerState.xp = (Number(playerState.xp) || 0) + batchXP;

            if (!ap.stats) ap.stats = {};
            ap.stats.totalFlights = (Number(ap.stats.totalFlights) || 0) + cycles;
            ap.stats.totalNetProfit = (Number(ap.stats.totalNetProfit) || 0) + batchProfit;
            plane.flightsCompleted = (Number(plane.flightsCompleted) || 0) + cycles;
            plane.totalProfitEarned = (Number(plane.totalProfitEarned) || 0) + batchProfit;

            autoFlightsCount += cycles;
            autoTotalProfit += batchProfit;
            autoTotalXP += batchXP;

            const remainderSec = planeRemainingSeconds % flightDuration;
            if (remainderSec > 0 && remainderSec < flightDuration) {
              plane.status = 'in_flight';
              plane.activeFlight = {
                flightId: 'flight_auto_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                destinationId: bestDest.id,
                destinationName: bestDest.name,
                distanceMultiplier: bestDest.distanceMultiplier,
                departureTime: serverNow - (remainderSec * 1000),
                arrivalTime: serverNow + ((flightDuration - remainderSec) * 1000),
                durationSec: flightDuration,
                economics: econ,
                netProfit: econ.netProfit,
                xpReward: econ.xpReward,
                isAutoPilot: true
              };
            }
          }
        }
      });
    }

    if (autoFlightsCount > 0) {
      airportAutoReport = {
        active: true,
        managerName: ap.manager?.name || 'الرئيس التنفيذي ألكسندر',
        flightsCount: autoFlightsCount,
        totalProfit: autoTotalProfit,
        totalXP: autoTotalXP,
        durationHours: Number((airportOfflineSeconds / 3600).toFixed(1))
      };
    }

    // C. Duty Free Passive Income accumulation
    const dutyFreeLvl = Number(ap.facilities?.duty_free || 0);
    if (dutyFreeLvl > 0) {
      const passivePerMin = dutyFreeLvl === 1 ? 100 : dutyFreeLvl === 2 ? 300 : dutyFreeLvl === 3 ? 750 : 1500;
      const lastDutyCollect = Number(ap.lastDutyFreeCollectionAt || lastActive);
      const dutyElapsedMin = Math.min(8 * 60, Math.max(0, Math.floor((serverNow - lastDutyCollect) / 60000)));
      if (dutyElapsedMin > 0) {
        const dutyCap = passivePerMin * 60 * 8;
        ap.dutyFreeAccumulated = Math.min(dutyCap, (Number(ap.dutyFreeAccumulated) || 0) + (dutyElapsedMin * passivePerMin));
      }
    }
  }

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
    airportAutoReport,
    
    // Detailed items breakdown
    earnings: {
      businesses: { title: 'أرباح المشاريع والشركات', amount: offlineBizEarnings, items: bizBreakdown },
      assets: { title: 'إيجارات العقارات والأصول', amount: totalAssetEarnings, items: assetBreakdown },
      cars: { title: 'إيجارات أسطول السيارات', amount: totalCarGross, items: carBreakdown },
      bank: { title: 'فوائد الودائع البنكية', amount: bankInterestEarned },
      airport: airportAutoReport ? { title: 'أرباح الطيار الآلي لمدير المطار ✈️', amount: airportAutoReport.totalProfit } : undefined
    },
    deductions: {
      payroll: { title: 'أجور ورواتب العمال والموظفين', amount: totalBizPayroll },
      carMaintenance: { title: 'صيانة وتشغيل أسطول السيارات', amount: totalCarMaintenance },
      tax: { title: 'موسم العفو الضريبي (معفى)', amount: totalTaxDeducted },
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
