/**
 * Ras ALmal Tycoon — Core Economy & Offline Engine Unit Tests
 */

const assert = require('assert');
const test = require('node:test');

const { BUSINESSES, ASSETS } = require('../src/engine/definitions');
const { calculateSingleBusinessProfit, getBusinessUpgradeCost } = require('../src/engine/business-engine');
const { calculateNetWorth, getAppropriateTitle } = require('../src/engine/net-worth-engine');
const { calculateAuthoritativeOfflineProgress, MAX_OFFLINE_SECONDS } = require('../src/engine/offline-engine');
const { sanitizePlayerState } = require('../src/engine/state-sanitizer');

test('Economy Definitions Integrity', () => {
  assert.ok(BUSINESSES.kiosk, 'kiosk business exists');
  assert.strictEqual(BUSINESSES.kiosk.cost, 1275, 'kiosk cost matches game.js');
  assert.ok(ASSETS.apartment, 'apartment asset exists');
  assert.strictEqual(ASSETS.apartment.cost, 212500, 'apartment cost matches game.js');
});

test('Business Profit Calculations with Supplies vs No Supplies', () => {
  const dummyState = {
    inventory: { suppliesHours: 12 },
    businesses: {}
  };

  const bizWithSupplies = {
    level: 1,
    workers: 2,
    suppliesTicks: 3600
  };

  const resultWithSupplies = calculateSingleBusinessProfit('kiosk', bizWithSupplies, dummyState);
  assert.ok(resultWithSupplies.ownerProfit > 0, 'Business generates positive profit with supplies');
  assert.strictEqual(resultWithSupplies.hasSupplies, true);

  const bizWithoutSupplies = {
    level: 1,
    workers: 2,
    suppliesTicks: 0
  };

  const resultWithoutSupplies = calculateSingleBusinessProfit('kiosk', bizWithoutSupplies, dummyState);
  assert.strictEqual(resultWithoutSupplies.ownerProfit, 0, 'Business generates $0 when supplies are 0');
  assert.strictEqual(resultWithoutSupplies.hasSupplies, false);
});

test('Net Worth Calculation & Rank Progression', () => {
  const player = {
    cash: 50000,
    bank: 100000,
    dirtyCash: 10000,
    assets: {
      apartment: 2 // 2 * 212500 = 425000
    },
    stocks: {
      ARAMCO: { shares: 100 } // 100 * 32 = 3200
    },
    investments: []
  };

  const netWorth = calculateNetWorth(player);
  const expected = 50000 + 100000 + 10000 + (2 * 212500) + (100 * 32);
  assert.strictEqual(netWorth, expected, 'Net worth accurately tallies cash, bank, assets and stocks');

  assert.strictEqual(getAppropriateTitle(1500000, 700), 'مستثمر طموح');
  assert.strictEqual(getAppropriateTitle(100, 0), 'عامل مبتدئ');
});

test('Authoritative Offline Progress — Full AFK Manager Coverage (2 Hours)', () => {
  const now = Date.now();
  const twoHoursAgo = now - (2 * 3600 * 1000);

  const playerState = {
    cash: 1000,
    bank: 5000,
    netWorth: 6000,
    xp: 50,
    lastActiveTimestamp: twoHoursAgo,
    afkManagerExpiresAt: now + (10 * 3600 * 1000), // Manager active for next 10h
    jailTimer: 3600, // 1 hour jail
    businesses: {
      kiosk: { level: 2, workers: 3, suppliesTicks: 14400 } // 4 hours supplies
    }
  };

  const report = calculateAuthoritativeOfflineProgress(playerState, now);

  assert.strictEqual(report.applied, true);
  assert.strictEqual(report.elapsedSeconds, 7200, 'Elapsed time is exactly 7,200 seconds');
  assert.strictEqual(report.profitableSeconds, 7200, 'All 7,200 seconds were profitable');
  assert.ok(report.totalEarnings > 0, 'Player earned positive offline profits');
  assert.strictEqual(playerState.bank, 5000 + report.totalEarnings, 'Bank credited accurately');
  assert.strictEqual(playerState.jailTimer, 0, 'Jail timer expired during 2 hours absence');
  assert.strictEqual(playerState.businesses.kiosk.suppliesTicks, 14400 - 7200, 'Supplies depleted by exactly 7,200s');
});

test('Authoritative Offline Progress — Strict 12-Hour Cap Enforcement (24 Hours absence)', () => {
  const now = Date.now();
  const oneDayAgo = now - (24 * 3600 * 1000); // 24 hours ago

  const playerState = {
    cash: 1000,
    bank: 0,
    lastActiveTimestamp: oneDayAgo,
    afkManagerExpiresAt: now + (48 * 3600 * 1000), // Manager active
    businesses: {
      coffee: { level: 1, workers: 2, suppliesTicks: 86400 }
    }
  };

  const report = calculateAuthoritativeOfflineProgress(playerState, now);

  assert.strictEqual(report.applied, true);
  assert.strictEqual(report.elapsedSeconds, MAX_OFFLINE_SECONDS, 'Capped at exactly 43,200 seconds (12 hours)');
  assert.strictEqual(report.profitableSeconds, MAX_OFFLINE_SECONDS);
  assert.strictEqual(report.elapsedHours, 12.0);
});

test('Authoritative Offline Progress — Expired AFK Manager (0 Profit, Supplies Depleted)', () => {
  const now = Date.now();
  const threeHoursAgo = now - (3 * 3600 * 1000);

  const playerState = {
    cash: 1000,
    bank: 0,
    lastActiveTimestamp: threeHoursAgo,
    afkManagerExpiresAt: threeHoursAgo - 1000, // Expired before exit
    businesses: {
      kiosk: { level: 1, workers: 1, suppliesTicks: 10800 } // 3 hours supplies
    }
  };

  const report = calculateAuthoritativeOfflineProgress(playerState, now);

  assert.strictEqual(report.applied, true);
  assert.strictEqual(report.profitableSeconds, 0, '0 profitable seconds due to expired AFK manager');
  assert.strictEqual(report.totalEarnings, 0, '$0 earned without active manager');
  assert.strictEqual(playerState.businesses.kiosk.suppliesTicks, 0, 'Supplies still depleted by 3 hours');
});

test('Authoritative Offline Progress — AFK Manager Expires Mid-Absence', () => {
  const now = Date.now();
  const fourHoursAgo = now - (4 * 3600 * 1000);

  const playerState = {
    cash: 1000,
    bank: 0,
    lastActiveTimestamp: fourHoursAgo,
    afkManagerExpiresAt: fourHoursAgo + (1 * 3600 * 1000), // Only 1 hour remaining
    businesses: {
      kiosk: { level: 1, workers: 1, suppliesTicks: 14400 }
    }
  };

  const report = calculateAuthoritativeOfflineProgress(playerState, now);

  assert.strictEqual(report.applied, true);
  assert.strictEqual(report.elapsedSeconds, 14400, '4 hours total elapsed');
  assert.strictEqual(report.profitableSeconds, 3600, 'Profitable for exactly 1 hour (3600s)');
  assert.strictEqual(report.managerExpiredDuringAbsence, true, 'Flagged that manager expired during absence');
  assert.strictEqual(playerState.businesses.kiosk.suppliesTicks, 14400 - 14400, 'Supplies depleted for full 4 hours');
});

test('State Sanitizer Guarantees Zero Runtime Null Crashes', () => {
  const legacyRecord = {
    username: 'LegacyPlayer_199',
    cash: 2500,
    bank: 10000,
    state: {
      // Intentionally missing afkManagerExpiresAt, stocks, inventory
      businesses: {
        kiosk: { level: 1 }
      }
    }
  };

  const sanitized = sanitizePlayerState(legacyRecord);
  assert.strictEqual(sanitized.username, 'LegacyPlayer_199');
  assert.strictEqual(sanitized.cash, 2500);
  assert.strictEqual(sanitized.bank, 10000);
  assert.strictEqual(sanitized.afkManagerExpiresAt, 0, 'Missing afkManagerExpiresAt gracefully defaulted to 0');
  assert.ok(sanitized.inventory, 'Missing inventory safely defaulted');
  assert.ok(sanitized.stocks, 'Missing stocks safely defaulted');
  assert.ok(sanitized.assets, 'Missing assets safely defaulted');
});
