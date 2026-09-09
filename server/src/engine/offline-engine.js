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

const { BUSINESSES, ASSETS } = require('./definitions');
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

  let offlineBizEarnings = 0;
  let nonBizOfflineEarnings = 0;
  const bizBreakdown = [];

  // 1. Calculate Business Earnings (gated by AFK Manager & Supplies)
  if (profitableSeconds >= 10 && playerState.businesses) {
    Object.keys(playerState.businesses).forEach(bk => {
      const b = playerState.businesses[bk];
      if (b && b.level > 0 && typeof b.suppliesTicks === 'number' && b.suppliesTicks > 0) {
        // Business produces only while both manager is active AND supplies are stocked
        const activeSeconds = Math.min(b.suppliesTicks, profitableSeconds);
        const bCalc = calculateSingleBusinessProfit(bk, { ...b, suppliesTicks: activeSeconds }, playerState);
        const earned = Math.floor(((bCalc.ownerProfit || 0) / 3600) * activeSeconds);

        offlineBizEarnings += earned;
        bizBreakdown.push({
          id: bk,
          name: BUSINESSES[bk] ? BUSINESSES[bk].name : bk,
          activeHours: Number((activeSeconds / 3600).toFixed(2)),
          profit: earned
        });
      }
    });
  }

  // 2. Real Estate Passive Rent (gated by Manager)
  if (profitableSeconds >= 10 && playerState.assets) {
    let passiveHourly = 0;
    Object.keys(playerState.assets).forEach(ak => {
      const count = Number(playerState.assets[ak] || 0);
      if (count > 0 && ASSETS[ak]) {
        passiveHourly += count * Math.floor(ASSETS[ak].rent * 0.1);
      }
    });
    nonBizOfflineEarnings = Math.floor((passiveHourly / 3600) * profitableSeconds);
  }

  // 3. Always Deplete Supplies by Total Elapsed Time
  if (playerState.businesses) {
    Object.keys(playerState.businesses).forEach(bk => {
      const b = playerState.businesses[bk];
      if (b && typeof b.suppliesTicks === 'number' && b.suppliesTicks > 0) {
        b.suppliesTicks = Math.max(0, b.suppliesTicks - totalElapsedSeconds);
      }
    });
  }

  const totalEarned = offlineBizEarnings + nonBizOfflineEarnings;

  // Credit earnings to bank
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
    totalEarnings: totalEarned,
    bizEarnings: offlineBizEarnings,
    passiveEarnings: nonBizOfflineEarnings,
    wasManagerActive: isManagerActiveAtExit,
    managerExpiredDuringAbsence: managerExpiry > 0 && serverNow > managerExpiry,
    breakdown: bizBreakdown
  };

  playerState.lastOfflineReport = report;
  return report;
}

module.exports = {
  MAX_OFFLINE_SECONDS,
  calculateAuthoritativeOfflineProgress
};
