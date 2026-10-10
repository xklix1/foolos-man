/**
 * Test Server-Authoritative Farm Engine & Anti-Cheat Time Verification
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
const farmEngine = require('../src/engine/farm-engine');

test('Server-Authoritative Farm Engine & Anti-Cheat Tests', async () => {
  await app.listen({ port: TEST_PORT, host: '127.0.0.1' });

  try {
    const testUser = 'farm_tycoon_tester';
    sessionManager.sessions.set(testUser.toLowerCase(), {
      username: testUser,
      pin: '1234',
      state: {
        username: testUser,
        cash: 10000000, // 10M cash
        bank: 5000000,
        xp: 500,
        netWorth: 15000000,
        title: 'تاجر صاعد'
      },
      dirty: false,
      lastActivity: Date.now()
    });

    // 1. Authenticate session
    const sess = await ServerBridge.startSession(testUser, '1234');
    assert.ok(sess, 'Session started');
    assert.strictEqual(ServerBridge.isServerOnline(), true);

    // 2. Unlock Farm
    const unlockRes = await ServerBridge.unlockFarm();
    assert.strictEqual(unlockRes.success, true);
    assert.strictEqual(unlockRes.farm.unlocked, true);
    assert.strictEqual(unlockRes.farm.plots.length, 4);

    // 3. Plant wheat in plot 0
    const plantRes = await ServerBridge.plantFarmCrop(0, 'wheat');
    assert.strictEqual(plantRes.success, true);
    assert.strictEqual(plantRes.result.crop.id, 'wheat');
    assert.strictEqual(plantRes.farm.plots[0].cropId, 'wheat');
    assert.ok(plantRes.farm.plots[0].readyAt > Date.now(), 'readyAt must be in future');

    // 4. Anti-Cheat Test: Immediate harvest attempt MUST be rejected by server
    let harvestBlocked = false;
    try {
      await ServerBridge.harvestFarmCrop(0);
    } catch (err) {
      harvestBlocked = true;
      assert.ok(err.message.includes('لا يزال قيد النمو'), 'Error message must reflect growth time-lock: ' + err.message);
    }
    assert.strictEqual(harvestBlocked, true, 'Immediate harvest without waiting duration MUST be blocked');

    // 5. Simulate natural server time passing (set plot readyAt to past)
    const activeSess = sessionManager.sessions.get(testUser.toLowerCase());
    activeSess.state.farm.plots[0].readyAt = Date.now() - 1000;

    // 6. Harvest plot 0 now that time elapsed
    const harvestRes = await ServerBridge.harvestFarmCrop(0);
    assert.strictEqual(harvestRes.success, true);
    assert.strictEqual(harvestRes.result.yield, 10);
    assert.strictEqual(harvestRes.farm.plots[0], null, 'Plot 0 emptied after harvest');
    assert.strictEqual(harvestRes.farm.inventory.wheat, 10, 'Wheat added to silo');

    // 7. Sell Wheat
    const sellRes = await ServerBridge.sellFarmCrop('wheat');
    assert.strictEqual(sellRes.success, true);
    assert.strictEqual(sellRes.result.crop.id, 'wheat');
    assert.strictEqual(sellRes.farm.inventory.wheat || 0, 0, 'Wheat sold from inventory');

    // 8. Plant all plots with wheat
    const plantAllRes = await ServerBridge.plantAllFarmPlots('wheat');
    assert.strictEqual(plantAllRes.success, true);
    assert.strictEqual(plantAllRes.result.plantedCount, 4, 'All 4 plots planted');

    // 9. Upgrades: Land, Irrigation, Fertilizer, Silo, Worker
    const landRes = await ServerBridge.upgradeFarmLand();
    assert.strictEqual(landRes.success, true);
    assert.strictEqual(landRes.farm.landLevel, 2);
    assert.strictEqual(landRes.farm.maxPlots, 8);

    const waterRes = await ServerBridge.upgradeFarmIrrigation();
    assert.strictEqual(waterRes.success, true);
    assert.strictEqual(waterRes.farm.waterLevel, 2);

    const fertRes = await ServerBridge.upgradeFarmFertilizer();
    assert.strictEqual(fertRes.success, true);
    assert.strictEqual(fertRes.farm.fertilizerLevel, 2);

    const siloRes = await ServerBridge.upgradeFarmSilo();
    assert.strictEqual(siloRes.success, true);
    assert.strictEqual(siloRes.farm.siloLevel, 2);

    const workerRes = await ServerBridge.hireFarmWorker();
    assert.strictEqual(workerRes.success, true);
    assert.strictEqual(workerRes.farm.workers, 1);

    console.log('[Test] All Farm Server-Authoritative & Anti-Cheat tests PASSED!');
  } finally {
    sessionManager.sessions.delete('farm_tycoon_tester');
    if (sessionManager.flushIntervalTimer) clearInterval(sessionManager.flushIntervalTimer);
    ServerBridge.destroy();
    await app.close();
    process.exit(0);
  }
});
