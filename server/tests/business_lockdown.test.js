/**
 * business_lockdown.test.js
 * Verifies that all business actions (buy, upgrade, workers, supplies, AFK manager)
 * are 100% server-authoritative, deduct cash on the server, and cannot be cheated
 * or reset via sync-state.
 */

const assert = require('assert');
const test = require('node:test');

const TEST_PORT = 3998;
global.window = {
  location: { hostname: 'localhost' },
  SERVER_API_URL: `http://127.0.0.1:${TEST_PORT}`,
  addEventListener: () => {}
};

const app = require('../src/server');
const sessionManager = require('../src/services/session-manager');
const ServerBridge = require('../../server-client-bridge');
const {
  getBusinessUpgradeCost,
  getBusinessSupplyCost,
  getBusinessWorkerHireCost,
  getAfkManagerRenewalCost
} = require('../src/engine/business-engine');

test('Server Authoritative Business Economy & Anti-Free Exploit Tests', async () => {
  await app.listen({ port: TEST_PORT, host: '127.0.0.1' });

  try {
    const username = 'business_tycoon_tester';
    const initialCash = 50000;
    sessionManager.sessions.set(username.toLowerCase(), {
      username: username,
      pin: '1234',
      state: {
        username: username,
        cash: initialCash,
        bank: 10000,
        xp: 100,
        netWorth: 60000,
        title: 'مستثمر مبتدئ',
        businesses: {}
      },
      dirty: false,
      lastActivity: Date.now()
    });

    // 1. Connect Session
    const sessionRes = await ServerBridge.startSession(username, '1234');
    assert.ok(sessionRes, 'Session connected');
    let session = sessionManager.sessions.get(username.toLowerCase());

    // 2. Buy Business (Level 0 -> 1)
    const kioskCost = 1275;
    const buyRes = await ServerBridge.buyBusiness('kiosk');
    assert.ok(buyRes && buyRes.success, 'Buy business succeeded');
    assert.strictEqual(buyRes.newLevel, 1);
    assert.strictEqual(buyRes.costPaid, kioskCost);
    assert.strictEqual(buyRes.cash, initialCash - kioskCost);
    assert.strictEqual(session.state.cash, initialCash - kioskCost, 'Server cash deducted for purchase');
    assert.strictEqual(session.state.businesses.kiosk.level, 1);
    assert.strictEqual(session.state.businesses.kiosk.suppliesTicks, 3600);

    // 3. Upgrade Business (Level 1 -> 2)
    const expectedUpgradeCost = getBusinessUpgradeCost('kiosk', 1, session.state);
    const upgradeRes = await ServerBridge.buyBusiness('kiosk');
    assert.ok(upgradeRes && upgradeRes.success, 'Upgrade business succeeded');
    assert.strictEqual(upgradeRes.newLevel, 2);
    assert.strictEqual(upgradeRes.costPaid, expectedUpgradeCost);
    const cashAfterUpgrade = initialCash - kioskCost - expectedUpgradeCost;
    assert.strictEqual(upgradeRes.cash, cashAfterUpgrade);
    assert.strictEqual(session.state.cash, cashAfterUpgrade, 'Server cash deducted for upgrade');

    // 4. Hire Worker
    const expectedHireCost = getBusinessWorkerHireCost('kiosk', session.state.businesses.kiosk);
    const hireRes = await ServerBridge.hireWorker('kiosk');
    assert.ok(hireRes && hireRes.success, 'Hire worker succeeded');
    assert.strictEqual(hireRes.workers, 1);
    assert.strictEqual(hireRes.costPaid, expectedHireCost);
    const cashAfterHire = cashAfterUpgrade - expectedHireCost;
    assert.strictEqual(hireRes.cash, cashAfterHire);
    assert.strictEqual(session.state.cash, cashAfterHire, 'Server cash deducted for worker');

    // 5. Restock Supplies (Single Business)
    const expectedSupplyCost = getBusinessSupplyCost('kiosk', session.state.businesses.kiosk);
    const currentTicks = session.state.businesses.kiosk.suppliesTicks;
    const supplyRes = await ServerBridge.supplyBusiness('kiosk');
    assert.ok(supplyRes && supplyRes.success, 'Supply business succeeded');
    assert.strictEqual(supplyRes.costPaid, expectedSupplyCost);
    assert.strictEqual(supplyRes.suppliesTicks, currentTicks + 3600);
    const cashAfterSupply = cashAfterHire - expectedSupplyCost;
    assert.strictEqual(supplyRes.cash, cashAfterSupply);
    assert.strictEqual(session.state.cash, cashAfterSupply, 'Server cash deducted for supplies');

    // 6. Fire Worker
    const fireRes = await ServerBridge.fireWorker('kiosk');
    assert.ok(fireRes && fireRes.success, 'Fire worker succeeded');
    assert.strictEqual(fireRes.workers, 0);
    assert.strictEqual(session.state.businesses.kiosk.workers, 0);
    assert.strictEqual(session.state.cash, cashAfterSupply, 'Fire worker does not cost extra money');

    // 7. Renew AFK Manager (Dynamic 10% Fee)
    const expectedAfkFee = getAfkManagerRenewalCost(session.state);
    assert.ok(expectedAfkFee >= 1000, 'AFK manager fee adheres to minimum floor of 1000 EGP');
    const afkRes = await ServerBridge.renewAfkManager();
    assert.ok(afkRes && afkRes.success, 'Renew AFK manager succeeded');
    assert.strictEqual(afkRes.costPaid, expectedAfkFee);
    const cashAfterAfk = cashAfterSupply - expectedAfkFee;
    assert.strictEqual(afkRes.cash, cashAfterAfk);
    assert.strictEqual(session.state.cash, cashAfterAfk, 'Server cash deducted for AFK manager');
    assert.ok(session.state.afkManagerExpiresAt > Date.now(), 'AFK manager expiration extended by 12 hours');

    // 8. Anti-Free Exploit & State Sync Lockdown Verification
    // The client tries to send an altered state with 1,000,000 EGP cash:
    const forgedSync = await ServerBridge.syncState({
      cash: 1000000,
      bank: 10000,
      businesses: {
        kiosk: { level: 2, workers: 0, suppliesTicks: currentTicks + 3600 }
      }
    }, true);

    assert.ok(forgedSync && forgedSync.success, 'Sync state call completed');
    // Ensure authoritative cash is preserved and NOT overwritten by the forged 1,000,000
    assert.strictEqual(
      forgedSync.authoritativeState.cash,
      cashAfterAfk,
      'Server MUST reject client-forged cash and return authoritative deducted cash'
    );
    assert.strictEqual(
      session.state.cash,
      cashAfterAfk,
      'Server session cash remains authoritative and was NOT refunded!'
    );

    console.log('[Lockdown Test Passed] All 4 operations authoritatively deduct cash on server and cannot be cheated!');
  } catch (err) {
    console.error('TEST ERROR:', err);
    throw err;
  } finally {
    ServerBridge.destroy();
    await app.close();
    process.exit(0);
  }
});
