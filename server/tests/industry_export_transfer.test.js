/**
 * Automated Test Suite: Industrial Goods Transfer to Trade Export
 * Verifies authoritative server transfer, capacity bounds, readyStock deduction,
 * and sync preservation without rollbacks.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const fastify = require('fastify');

const industryEngine = require('../src/engine/industry-engine');
const sessionManager = require('../src/services/session-manager');
const actionRoutes = require('../src/routes/action-routes');
const sessionRoutes = require('../src/routes/session-routes');

describe('Industrial Goods Transfer to Trade Export Suite', () => {
  let app;
  const TEST_USER = 'test_exporter_' + Date.now();
  let userSession;

  before(async () => {
    app = fastify({ logger: false });
    await app.register(actionRoutes);
    await app.register(sessionRoutes);
    await app.ready();

    // Create session directly in sessionManager
    userSession = {
      username: TEST_USER,
      sessionToken: 'token_' + TEST_USER,
      state: {
        username: TEST_USER,
        cash: 10000000,
        bank: 5000000,
        netWorth: 15000000,
        jailTimer: 0,
        industry: {
          food: {
            unlocked: true,
            stage1: 5,
            stage2: 5,
            stage3: 5,
            logistics: 5,
            readyStock: 100,
            totalEarned: 0,
            totalExported: 0
          },
          auto: {
            unlocked: true,
            stage1: 5,
            stage2: 5,
            stage3: 5,
            logistics: 5,
            readyStock: 80,
            totalEarned: 0,
            totalExported: 0
          }
        },
        tradeCompany: {
          warehouseCapacity: 10,
          warehouse: {},
          activeImports: [],
          activeExports: [],
          totalProfitEarned: 0,
          totalShipmentsCompleted: 0
        }
      },
      dirty: false,
      lastActivity: Date.now()
    };
    sessionManager.sessions.set(TEST_USER.toLowerCase(), userSession);
  });

  after(async () => {
    if (app) await app.close();
  });

  test('1. Direct Engine: Transfers 5 food containers (100 units / 20) into empty warehouse', () => {
    const res = industryEngine.transferIndustryGoodsToTradeExport(userSession.state, 'food');
    
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.transferred, 5, '5 containers transferred');
    assert.strictEqual(res.unitsDeducted, 100, '100 factory units deducted');
    assert.strictEqual(res.remainingReadyStock, 0, 'Factory readyStock is 0');
    assert.strictEqual(res.tradeCommodityId, 'espresso_coffee');
    assert.strictEqual(userSession.state.tradeCompany.warehouse.espresso_coffee, 5, 'Warehouse has 5 containers');
    assert.strictEqual(res.warehouseTotal, 5);
    assert.strictEqual(res.warehouseCapacity, 10);
  });

  test('2. Direct Engine: Handles warehouse capacity limit and keeps surplus in factory silos', () => {
    // Current warehouse: 5 / 10 (5 slots available)
    // Add 200 units to food (200 / 20 = 10 containers ready)
    userSession.state.industry.food.readyStock = 200;

    const res = industryEngine.transferIndustryGoodsToTradeExport(userSession.state, 'food');

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.transferred, 5, 'Only 5 containers fit in available space');
    assert.strictEqual(res.unitsDeducted, 100, 'Deducted only 100 units (5 * 20)');
    assert.strictEqual(res.remainingReadyStock, 100, 'Surplus 100 units remain safely in factory silos');
    assert.strictEqual(userSession.state.tradeCompany.warehouse.espresso_coffee, 10, 'Warehouse is now 10/10 full');
    assert.strictEqual(res.warehouseTotal, 10);
  });

  test('3. Direct Engine: Throws clear error when warehouse is 100% full without deducting stock', () => {
    assert.throws(
      () => industryEngine.transferIndustryGoodsToTradeExport(userSession.state, 'food'),
      /مستودع شركة الاستيراد والتصدير ممتلئ بالكامل/
    );
    assert.strictEqual(userSession.state.industry.food.readyStock, 100, 'Factory stock preserved intact');
  });

  test('4. Direct Engine: Upgraded warehouse transfers large batch without arbitrary 10-cap', () => {
    // Upgrade warehouse capacity to 30 and empty it
    userSession.state.tradeCompany.warehouseCapacity = 30;
    userSession.state.tradeCompany.warehouse = {};

    // auto: 8 units per container, 160 units ready = 20 containers
    userSession.state.industry.auto.readyStock = 160;

    const res = industryEngine.transferIndustryGoodsToTradeExport(userSession.state, 'auto');

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.transferred, 20, 'Transferred all 20 containers in one click without being restricted by old 10-cap!');
    assert.strictEqual(res.unitsDeducted, 160);
    assert.strictEqual(res.remainingReadyStock, 0);
    assert.strictEqual(userSession.state.tradeCompany.warehouse.auto_spare_parts, 20);
    assert.strictEqual(res.warehouseTotal, 20);
  });

  test('5. Fastify API Route: POST /api/action/industry/transfer-export works authoritatively', async () => {
    // Empty warehouse and set readyStock
    userSession.state.tradeCompany.warehouse = {};
    userSession.state.industry.food.readyStock = 60; // 3 containers

    const response = await app.inject({
      method: 'POST',
      url: '/api/action/industry/transfer-export',
      headers: {
        'authorization': `Bearer ${userSession.sessionToken}`
      },
      payload: {
        username: TEST_USER,
        sectorId: 'food',
        clientIndustry: { readyStock: 60 }
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.transferred, 3);
    assert.strictEqual(body.unitsDeducted, 60);
    assert.strictEqual(body.remainingReadyStock, 0);
    assert.strictEqual(userSession.state.tradeCompany.warehouse.espresso_coffee, 3);
  });

  test('6. Session Sync: Background sync-state does not roll back transferred containers', async () => {
    // Ensure warehouse has 3 coffee containers
    assert.strictEqual(userSession.state.tradeCompany.warehouse.espresso_coffee, 3);

    // Call sync-state endpoint
    const response = await app.inject({
      method: 'POST',
      url: '/api/session/sync-state',
      headers: {
        'authorization': `Bearer ${userSession.sessionToken}`
      },
      payload: {
        username: TEST_USER,
        state: userSession.state
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(
      body.authoritativeState.tradeCompany.warehouse.espresso_coffee,
      3,
      'Authoritative server state strictly preserved the 3 transferred containers!'
    );
  });
});
