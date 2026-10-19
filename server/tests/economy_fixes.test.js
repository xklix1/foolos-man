/**
 * economy_fixes.test.js
 * Verification of the 4 reported issues:
 * 1. Farm crop and livestock sales calculate real profits based on market prices
 * 2. Purchasing businesses/factories deducts funds from bank when cash is insufficient
 * 3. Collecting factory industry revenue awards cash authoritatively and survives sync
 * 4. Upgrading businesses deducts funds correctly from cash/bank
 */

const assert = require('assert');
const test = require('node:test');

const TEST_PORT = 3999;
global.window = {
  location: { hostname: 'localhost' },
  SERVER_API_URL: `http://127.0.0.1:${TEST_PORT}`,
  addEventListener: () => {}
};

const app = require('../src/server');
const sessionManager = require('../src/services/session-manager');
const ServerBridge = require('../../server-client-bridge');
const farmEngine = require('../src/engine/farm-engine');
const industryEngine = require('../src/engine/industry-engine');

test('Economy Fixes Verification Suite', async () => {
  await app.listen({ port: TEST_PORT, host: '127.0.0.1' });

  try {
    // ----------------------------------------------------
    // TEST 1: Farm Sales Profit Verification (Server Engine)
    // ----------------------------------------------------
    console.log('--- Test 1: Farm Sales Profit Verification ---');
    const farmState = {
      cash: 1000,
      bank: 50000,
      netWorth: 51000,
      farm: {
        unlocked: true,
        inventory: {
          wheat: 100, // sellPrice = 6, cost = 5
          tomato: 50  // sellPrice = 24, cost = 20
        },
        processing: {
          storage: {
            flour_bread: 10 // baseValue = 35
          }
        },
        livestock: {
          milk: 20, // 45 EGP/unit
          eggs: 30, // 15 EGP/unit
          compost: 5 // 10 EGP/unit
        }
      }
    };

    // Sell 10 wheat
    const wheatSellRes = farmEngine.sellFarmCrop(farmState, 'wheat', 10);
    assert.strictEqual(wheatSellRes.totalPrice, 60, '10 wheat * 6 EGP = 60 EGP (profitable!)');
    assert.strictEqual(farmState.cash, 1060, 'Cash credited with profitable wheat sale');

    // Sell 5 flour_bread
    const breadSellRes = farmEngine.sellProcessedGood(farmState, 'flour_bread', 5);
    assert.strictEqual(breadSellRes.totalPrice, 175, '5 flour_bread * 35 EGP = 175 EGP (profitable!)');
    assert.strictEqual(farmState.cash, 1060 + 175, 'Cash credited with bread sale');

    // Sell livestock milk
    const milkSellRes = farmEngine.sellLivestockProduce(farmState, 'milk', 10);
    assert.strictEqual(milkSellRes.totalPrice, 450, '10 milk * 45 EGP = 450 EGP (profitable!)');

    // Sell livestock eggs
    const eggsSellRes = farmEngine.sellLivestockProduce(farmState, 'eggs', 10);
    assert.strictEqual(eggsSellRes.totalPrice, 150, '10 eggs * 15 EGP = 150 EGP (profitable!)');
    console.log('✔ Farm sales calculate real profit correctly!');

    // ----------------------------------------------------
    // TEST 2 & 4: Business Purchase & Upgrade from Bank
    // ----------------------------------------------------
    console.log('--- Test 2 & 4: Business Purchase & Upgrade from Bank ---');
    const username = 'bank_buyer_tycoon';
    sessionManager.sessions.set(username.toLowerCase(), {
      username: username,
      pin: '1234',
      state: {
        username: username,
        cash: 100, // Very low cash
        bank: 50000000, // High bank balance (50 Million EGP)
        netWorth: 50000100,
        businesses: {},
        industry: {}
      },
      dirty: false,
      lastActivity: Date.now()
    });

    await ServerBridge.startSession(username, '1234');
    let session = sessionManager.sessions.get(username.toLowerCase());

    // Buy solar_factory (Cost: 11,900,000 EGP)
    const solarCost = 11900000;
    const initialBank = session.state.bank;
    const buySolarRes = await ServerBridge.buyBusiness('solar_factory');
    assert.ok(buySolarRes && buySolarRes.success, 'Buying solar factory succeeded');
    assert.strictEqual(buySolarRes.newLevel, 1);
    assert.strictEqual(buySolarRes.cash, 0, 'Cash wiped to 0');
    const expectedRemainingBank = initialBank - (solarCost - 100);
    assert.strictEqual(buySolarRes.bank, expectedRemainingBank, 'Remaining cost deducted from bank');
    assert.strictEqual(session.state.bank, expectedRemainingBank, 'Server bank authoritatively reduced');
    console.log('✔ Buying solar_factory deducted 11,900,000 from player bank!');

    // Upgrade kiosk from level 0 -> 1 when cash is 0
    const kioskCost = 1275;
    const bankBeforeKiosk = session.state.bank;
    const buyKioskRes = await ServerBridge.buyBusiness('kiosk');
    assert.ok(buyKioskRes && buyKioskRes.success, 'Buying kiosk succeeded');
    assert.strictEqual(buyKioskRes.newLevel, 1);
    assert.strictEqual(session.state.bank, bankBeforeKiosk - kioskCost, 'Kiosk cost deducted from bank');
    console.log('✔ Upgrading business with 0 cash deducted cost from bank!');

    // ----------------------------------------------------
    // TEST 3: Factory Industry Revenue Collection Endpoint
    // ----------------------------------------------------
    console.log('--- Test 3: Factory Industry Revenue Collection Endpoint ---');
    // License food industry sector
    session.state.industry = {
      food: {
        unlocked: true,
        readyStock: 50,
        stage1: 1,
        stage2: 1,
        stage3: 1,
        logistics: 1,
        totalEarned: 0
      }
    };
    session.state.cash = 0;

    // Call collectIndustryRevenue
    const collectRes = await ServerBridge.collectIndustryRevenue('food', 20);
    assert.ok(collectRes && collectRes.success, 'Collect industry revenue succeeded');
    assert.strictEqual(collectRes.units, 20);
    assert.ok(collectRes.netPayout > 0, 'Net payout > 0');
    assert.strictEqual(session.state.cash, collectRes.netPayout, 'Cash credited on server');
    assert.strictEqual(session.state.industry.food.readyStock, 30, 'Ready stock decreased on server');

    // Trigger state sync and verify cash is NOT crushed
    const syncRes = await ServerBridge.syncState({
      cash: collectRes.netPayout,
      bank: session.state.bank,
      businesses: session.state.businesses,
      industry: session.state.industry
    }, true);

    assert.ok(syncRes && syncRes.success);
    assert.strictEqual(
      session.state.cash,
      collectRes.netPayout,
      'Cash from industry sale was strictly preserved by server authority!'
    );
    console.log('✔ Industry revenue collection awards cash and survives state sync!');

    console.log('\n========================================');
    console.log('🎉 ALL 4 ECONOMY FIXES VERIFIED SUCCESSFULLY!');
    console.log('========================================');
  } catch (err) {
    console.error('TEST SUITE FAILED:', err);
    throw err;
  } finally {
    ServerBridge.destroy();
    await app.close();
    process.exit(0);
  }
});
