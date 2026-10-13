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
  } else {
    // Failure must have resulted in dirtyCash being reduced
    assert.ok(state.dirtyCash < 50000, 'Dirty cash was deducted on failure');
  }
});
