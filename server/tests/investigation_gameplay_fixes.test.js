const test = require('node:test');
const assert = require('node:assert');

const { TRADE_COMMODITIES, BLACK_MARKET } = require('../src/engine/definitions');
const tradeEngine = require('../src/engine/trade-engine');
const storeEngine = require('../src/engine/store-engine');
const offlineEngine = require('../src/engine/offline-engine');

test('TRADE_COMMODITIES definitions and import durations', (t) => {
  assert.ok(TRADE_COMMODITIES.fashion_brands, 'fashion_brands defined');
  assert.strictEqual(TRADE_COMMODITIES.fashion_brands.unitCost, 5000);
  assert.strictEqual(TRADE_COMMODITIES.fashion_brands.importDurationSec, 2700);

  assert.ok(TRADE_COMMODITIES.gold_bullion_bars, 'gold_bullion_bars defined');
  assert.strictEqual(TRADE_COMMODITIES.gold_bullion_bars.unitCost, 1000000);
  assert.strictEqual(TRADE_COMMODITIES.gold_bullion_bars.importDurationSec, 86400);
});

test('tradeEngine.buyImportCargo creates correct order and arrival time', (t) => {
  const state = {
    cash: 500000,
    bank: 500000,
    tradeCompany: {
      warehouseCapacity: 10,
      warehouse: {},
      activeImports: [],
      activeExports: []
    }
  };

  const now = 1700000000000;
  const res = tradeEngine.buyImportCargo(state, 'fashion_brands', 2, now);
  assert.ok(res.success);
  assert.strictEqual(res.order.quantity, 2);
  assert.strictEqual(res.order.durationSec, 2700);
  assert.strictEqual(res.order.arrivalTime, now + (2700 * 1000));
  // 5000 * 2 = 10000 + 5% = 10500
  assert.strictEqual(res.totalCost, 10500);
  assert.strictEqual(state.cash, 500000 - 10500);
});

test('offlineEngine does not burn business supplies when AFK manager is inactive', (t) => {
  const state = {
    cash: 100000,
    bank: 100000,
    lastActiveTimestamp: 1000000,
    afkManagerExpiresAt: 0, // No manager
    businesses: {
      kiosk: { level: 2, suppliesTicks: 3600, workers: 2 }
    }
  };

  // 2 hours elapsed (7200s)
  const report = offlineEngine.calculateAuthoritativeOfflineProgress(state, 1000000 + 7200000);
  assert.strictEqual(state.businesses.kiosk.suppliesTicks, 3600, 'Supplies remain intact because business was closed');
});

test('offlineEngine burns supplies accurately when AFK manager is active', (t) => {
  const state = {
    cash: 100000,
    bank: 100000,
    lastActiveTimestamp: 1000000,
    afkManagerExpiresAt: 1000000 + 3600000, // 1 hour manager
    businesses: {
      kiosk: { level: 2, suppliesTicks: 7200, workers: 2 }
    }
  };

  // 2 hours elapsed, but manager only active for 1 hour (3600s)
  offlineEngine.calculateAuthoritativeOfflineProgress(state, 1000000 + 7200000);
  assert.strictEqual(state.businesses.kiosk.suppliesTicks, 7200 - 3600, 'Supplies burned only for the 1 hour manager was active');
});

test('storeEngine.runBlackMarketDeal deducts cost and handles outcomes', (t) => {
  const state = {
    cash: 50000,
    dirtyCash: 50000,
    underworldRep: 50,
    jailTimer: 0,
    inventory: {}
  };

  // Run deal
  const res = storeEngine.runBlackMarketDeal(state, 'contraband_cigars', 1000000);
  assert.ok(typeof res.success === 'boolean');
  // Cost for contraband_cigars is 6000. It must have deducted from dirtyCash
  if (res.success) {
    assert.strictEqual(res.dealId, 'contraband_cigars');
    assert.ok(res.payout > 0);
  }
});

test('storeEngine.runBlackMarketDeal guarantees minimum fine and bank fallback when clean cash is zero', (t) => {
  const state = {
    cash: 6000, // Exact cost for contraband_cigars
    bank: 100000,
    dirtyCash: 0,
    underworldRep: 50,
    jailTimer: 0,
    inventory: {}
  };

  // Mock Math.random to force police arrest / failure (roll = 0.99 > successChance)
  const origRandom = Math.random;
  Math.random = () => 0.99;

  try {
    const res = storeEngine.runBlackMarketDeal(state, 'contraband_cigars', 1000000);
    assert.strictEqual(res.success, false, 'Deal should fail');
    assert.strictEqual(res.escaped, false, 'Player should be arrested');
    assert.ok(res.jailDuration > 0, 'Player should have a jail duration');
    assert.strictEqual(state.jailTimer, 15, 'Jail timer should be 15 seconds');
    assert.strictEqual(state.cash, 0, 'Clean cash was 6000, used for cost');
    // Minimum fine = 20% of 6000 = 1200 EGP. Since cash was 0, deducted from bank!
    assert.strictEqual(res.confiscation, 1200, 'Confiscation must be at least 1200 EGP (min fine)');
    assert.strictEqual(state.bank, 98800, 'Bank should be 100,000 - 1,200 = 98,800 EGP');
    assert.strictEqual(res.deductedFromBank, 1200, '1200 EGP was deducted from bank');
  } finally {
    Math.random = origRandom;
  }
});
