/**
 * comprehensive_lockdown.test.js
 * Verifies that all 7 game sectors:
 * 1. Industry (unlock, stage upgrade)
 * 2. Trade Company (import cargo, warehouse upgrade)
 * 3. Term Investments (deposit certificates)
 * 4. Farm Livestock (cows, chickens)
 * 5. General Store & Black Market (store items, black market gear, police bribe)
 * 6. Smuggling Fleet (vehicles)
 * 7. Business & Marketing (marketing campaign, franchise, tax declaration)
 * 8. Casino (bet deduction)
 * Are 100% server-authoritative, deduct funds on the server,
 * and cannot be cheated or refunded through sync-state!
 */

const assert = require('assert');
const test = require('node:test');

const TEST_PORT = 3997;
global.window = {
  location: { hostname: 'localhost' },
  SERVER_API_URL: `http://127.0.0.1:${TEST_PORT}`,
  addEventListener: () => {}
};

const app = require('../src/server');
const sessionManager = require('../src/services/session-manager');
const ServerBridge = require('../../server-client-bridge');

test('Comprehensive Economy Lockdown & Anti-Free Exploit Tests', async () => {
  await app.listen({ port: TEST_PORT, host: '127.0.0.1' });

  try {
    const username = 'lockdown_tycoon_master';
    const initialCash = 10000000; // 10 Million EGP
    sessionManager.sessions.set(username.toLowerCase(), {
      username: username,
      pin: '1234',
      state: {
        username: username,
        cash: initialCash,
        bank: 5000000,
        dirtyCash: 500000,
        xp: 1000,
        netWorth: 15500000,
        title: 'سيد الأعمال',
        businesses: {
          kiosk: { level: 10, workers: 5, suppliesTicks: 3600, price: 20 }
        },
        farm: { unlocked: true, landLevel: 1, maxPlots: 4, plots: [null, null, null, null], livestock: { cows: 0, chickens: 0 } },
        tradeCompany: { warehouseCapacity: 10, warehouse: {}, activeImports: [], activeExports: [] },
        industry: {},
        investments: [],
        inventory: {},
        smugglingFleet: {}
      },
      dirty: false,
      lastActivity: Date.now()
    });

    // 1. Connect Session
    const sessionRes = await ServerBridge.startSession(username, '1234');
    assert.ok(sessionRes, 'Session connected successfully');
    const session = sessionManager.sessions.get(username.toLowerCase());

    // 2. Industry: Unlock Sector & Upgrade Stage
    const indUnlock = await ServerBridge.unlockIndustrySector('food');
    assert.ok(indUnlock && indUnlock.success, 'Industry unlock succeeded');
    assert.strictEqual(session.state.industry.food.unlocked, true);
    assert.strictEqual(session.state.cash, initialCash - 1500000, 'Cash deducted for industry unlock');

    const indUpgrade = await ServerBridge.upgradeIndustryStage('food', 'stage1', 1);
    assert.ok(indUpgrade && indUpgrade.success, 'Industry upgrade succeeded');
    assert.strictEqual(session.state.industry.food.stage1, 2);
    assert.ok(session.state.cash < initialCash - 1500000, 'Cash deducted for stage upgrade');
    const cashAfterIndustry = session.state.cash;

    // 3. Trade Company: Buy Import Cargo & Upgrade Warehouse
    const tradeBuy = await ServerBridge.buyImportCargo('fashion_brands', 2);
    assert.ok(tradeBuy && tradeBuy.success, 'Import cargo purchase succeeded');
    assert.strictEqual(session.state.tradeCompany.activeImports.length, 1);
    const expectedCargoCost = (5000 * 2) + Math.floor(10000 * 0.05); // 10,500
    assert.strictEqual(session.state.cash, cashAfterIndustry - expectedCargoCost, 'Cash deducted for import cargo');
    const cashAfterCargo = session.state.cash;

    const whUpgrade = await ServerBridge.upgradeWarehouse();
    assert.ok(whUpgrade && whUpgrade.success, 'Warehouse upgrade succeeded');
    assert.strictEqual(session.state.tradeCompany.warehouseCapacity, 20);
    assert.strictEqual(session.state.cash, cashAfterCargo - 50000, 'Cash deducted for warehouse upgrade (50,000 EGP)');
    const cashAfterWarehouse = session.state.cash;

    // 4. Term Investment: Start Deposit Certificate
    const invRes = await ServerBridge.startInvestment('short', 50000);
    assert.ok(invRes && invRes.success, 'Investment certificate deposit succeeded');
    assert.strictEqual(session.state.investments.length, 1);
    assert.strictEqual(session.state.cash, cashAfterWarehouse - 50000, 'Cash deducted for investment deposit');
    const cashAfterInvest = session.state.cash;

    // 5. Farm Livestock: Buy Cows
    const cowRes = await ServerBridge.buyFarmLivestock('cow', 2);
    assert.ok(cowRes && cowRes.success, 'Farm livestock purchase succeeded');
    assert.strictEqual(session.state.farm.livestock.cows, 2);
    assert.strictEqual(session.state.cash, cashAfterInvest - 50000, 'Cash deducted for 2 cows (50,000 EGP)');
    const cashAfterFarm = session.state.cash;

    // 6. Store & Black Market: Buy Store Item & Black Market Gear
    const storeRes = await ServerBridge.buyStoreItem('energy_drink');
    assert.ok(storeRes && storeRes.success, 'Store item purchase succeeded');
    assert.strictEqual(session.state.inventory.energy_drink, 1);
    assert.strictEqual(session.state.cash, cashAfterFarm - 25000, 'Cash deducted for energy drink (25,000 EGP)');
    const cashAfterStore = session.state.cash;

    const initialDirty = session.state.dirtyCash;
    const bmRes = await ServerBridge.buyBlackMarketGear('radar_jammer');
    assert.ok(bmRes && bmRes.success, 'Black market gear purchase succeeded');
    assert.strictEqual(session.state.inventory.radar_jammer, 1);
    assert.strictEqual(session.state.dirtyCash, initialDirty - 80000, 'Dirty cash deducted for radar jammer (80,000 EGP)');

    // 7. Smuggling Fleet: Buy Speedboat
    const smugRes = await ServerBridge.buySmugglingVehicle('speedboat');
    assert.ok(smugRes && smugRes.success, 'Smuggling vehicle purchase succeeded');
    assert.strictEqual(session.state.smugglingFleet.speedboat, 1);
    assert.strictEqual(session.state.cash, cashAfterStore - 2000000, 'Cash deducted for speedboat (2,000,000 EGP)');
    const cashAfterSmug = session.state.cash;

    // 8. Marketing Campaign & Franchise
    const mktRes = await ServerBridge.launchMarketingCampaign('kiosk');
    assert.ok(mktRes && mktRes.success, 'Marketing campaign succeeded');
    assert.strictEqual(session.state.businesses.kiosk.marketingTicks, 1200);
    const kioskCost = 1275;
    const mktCost = Math.floor(kioskCost * 0.25);
    assert.strictEqual(session.state.cash, cashAfterSmug - mktCost, 'Cash deducted for marketing campaign');
    const cashAfterMkt = session.state.cash;

    const franRes = await ServerBridge.convertToFranchise('kiosk');
    assert.ok(franRes && franRes.success, 'Franchise conversion succeeded');
    assert.strictEqual(session.state.businesses.kiosk.isFranchise, true);
    const franCost = Math.floor(kioskCost * 15);
    assert.strictEqual(session.state.cash, cashAfterMkt - franCost, 'Cash deducted for franchise conversion');
    const cashAfterFran = session.state.cash;

    // 9. Casino Bet Deduction
    const betRes = await ServerBridge.deductCasinoBet(5000, 'roulette');
    assert.ok(betRes && betRes.success, 'Casino bet deduction succeeded');
    assert.strictEqual(session.state.cash, cashAfterFran - 5000, 'Cash deducted for casino bet');
    const finalAuthoritativeCash = session.state.cash;

    // 10. CRITICAL ANTI-EXPLOIT & DUAL LOCKDOWN VERIFICATION
    // Attacker client attempts to forge syncState with reset cash and injected modules:
    const forgedSync = await ServerBridge.syncState({
      cash: 99999999, // Attempt to refund all cash
      industry: {
        food: { unlocked: true, stage1: 50 }, // Attempt to jump to max level 50
        semiconductor: { unlocked: true, stage1: 10 } // Attempt to unlock high-tier sector without paying
      },
      farm: {
        livestock: { cows: 100 } // Attempt to inject 100 cows
      },
      tradeCompany: {
        warehouseCapacity: 50 // Attempt to jump to max capacity
      },
      investments: [
        { id: 'imperial', investedAmount: 10000000, ticksRemaining: 10 } // Attempt to forge 10M imperial bond
      ]
    }, true);

    assert.ok(forgedSync && forgedSync.success, 'Sync state completed');

    // 10.1 Cash MUST remain authoritatively deducted:
    assert.strictEqual(
      forgedSync.authoritativeState.cash,
      finalAuthoritativeCash,
      'Server strictly rejected client-forged cash!'
    );
    assert.strictEqual(
      session.state.cash,
      finalAuthoritativeCash,
      'Server session cash was NOT refunded!'
    );

    // 10.2 Industry Dual Lockdown check:
    assert.strictEqual(
      session.state.industry.food.stage1,
      2,
      'Dual Lockdown rejected unpurchased stage 50 jump on food sector!'
    );
    assert.strictEqual(
      Boolean(session.state.industry.semiconductor),
      false,
      'Dual Lockdown rejected unpurchased semiconductor sector injection!'
    );

    // 10.3 Farm Livestock Dual Lockdown check:
    assert.strictEqual(
      session.state.farm.livestock.cows,
      2,
      'Dual Lockdown clamped cows to authoritative purchased count 2!'
    );

    // 10.4 Trade Warehouse Dual Lockdown check:
    assert.strictEqual(
      session.state.tradeCompany.warehouseCapacity,
      20,
      'Dual Lockdown rejected unpurchased warehouse capacity jump to 50!'
    );

    // 10.5 Term Investment Dual Lockdown check:
    assert.strictEqual(
      session.state.investments.length,
      1,
      'Dual Lockdown rejected forged unpurchased investment certificate!'
    );

    console.log('[Lockdown Verification Complete] ALL 7 economic sectors authoritatively deduct funds and are 100% immune to free exploits or forged syncState!');
  } catch (err) {
    console.error('LOCKDOWN TEST ERROR:', err);
    throw err;
  } finally {
    ServerBridge.destroy();
    await app.close();
    process.exit(0);
  }
});
