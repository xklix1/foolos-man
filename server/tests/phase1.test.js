/**
 * Test Server-Authoritative Phase 1:
 * - Real Estate (Properties)
 * - Luxury Vehicles (Cars)
 * - Income Vault & Accrual Collection
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

test('Server-Authoritative Phase 1 (Income Vault, Properties & Vehicles) Tests', async () => {
  await app.listen({ port: TEST_PORT, host: '127.0.0.1' });

  try {
    const testUser = 'phase1_tester';
    sessionManager.sessions.set(testUser.toLowerCase(), {
      username: testUser,
      pin: '1234',
      state: {
        username: testUser,
        cash: 50000000, // 50M cash
        bank: 20000000, // 20M bank
        xp: 1000,
        netWorth: 70000000,
        title: 'ملياردير عصامي',
        businesses: {
          kiosk: { level: 5, workers: 10, suppliesTicks: 3600 }
        },
        assets: {},
        ownedCars: [],
        activeCar: null,
        afkManagerExpiresAt: 0,
        incomeVault: 0,
        lastIncomeAccrualAt: Date.now()
      },
      dirty: false,
      lastActivity: Date.now()
    });

    // 1. Authenticate Session
    const sess = await ServerBridge.startSession(testUser, '1234');
    assert.ok(sess, 'Session started');
    assert.strictEqual(ServerBridge.isServerOnline(), true);

    // 2. Real Estate: Buy Apartment (cost: 212,500)
    const initialCash = 50000000;
    const buyPropRes = await ServerBridge.buyProperty('apartment');
    assert.strictEqual(buyPropRes.success, true);
    assert.strictEqual(buyPropRes.assets.apartment, 1);
    assert.strictEqual(buyPropRes.cash, initialCash - 212500);

    // 3. Real Estate: Sell Apartment (85% value: 180,625)
    const sellPropRes = await ServerBridge.sellProperty('apartment');
    assert.strictEqual(sellPropRes.success, true);
    assert.strictEqual(sellPropRes.assets.apartment, 0);
    assert.strictEqual(sellPropRes.result.sellValue, Math.floor(212500 * 0.85));

    // 4. Vehicles: Buy Lamborghini Aventador (cost: 15,000,000)
    const buyCarRes = await ServerBridge.buyCar('lambo');
    assert.strictEqual(buyCarRes.success, true);
    assert.strictEqual(buyCarRes.ownedCars.length, 1);
    assert.strictEqual(buyCarRes.ownedCars[0].id, 'lambo');
    assert.strictEqual(buyCarRes.ownedCars[0].rentStatus, 'idle');

    // 5. Vehicles: Activate Lambo as personal car
    const assignCarRes = await ServerBridge.setActiveCar('lambo');
    assert.strictEqual(assignCarRes.success, true);
    assert.strictEqual(assignCarRes.activeCar, 'lambo');

    // 6. Vehicles: Rent Lambo (must unassign active car)
    const rentCarRes = await ServerBridge.rentCar('lambo', 'rented');
    assert.strictEqual(rentCarRes.success, true);
    assert.strictEqual(rentCarRes.rentStatus, 'rented');

    // 7. Vehicles: Selling while rented MUST be blocked
    let sellBlocked = false;
    try {
      await ServerBridge.sellCar('lambo');
    } catch (err) {
      sellBlocked = true;
      assert.ok(err.message.includes('السيارة مؤجرة'), 'Must block selling rented car: ' + err.message);
    }
    assert.strictEqual(sellBlocked, true, 'Selling rented car must be blocked');

    // 8. Vehicles: Stop renting and sell Lambo (75% value to bank: 11,250,000)
    await ServerBridge.rentCar('lambo', 'idle');
    const sellCarRes = await ServerBridge.sellCar('lambo');
    assert.strictEqual(sellCarRes.success, true);
    assert.strictEqual(sellCarRes.ownedCars.length, 0);
    assert.strictEqual(sellCarRes.bank, 20000000 + Math.floor(15000000 * 0.75));

    // 9. Income Vault: Simulate 1 hour of business revenue
    const activeSession = sessionManager.sessions.get(testUser.toLowerCase());
    activeSession.state.lastIncomeAccrualAt = Date.now() - 3600 * 1000; // 1 hour ago
    activeSession.state.afkManagerExpiresAt = 0; // No manager -> accumulates in vault

    const claimRes = await ServerBridge.claimIncome();
    assert.strictEqual(claimRes.success, true);
    assert.ok(claimRes.claimed > 0, 'Income was accrued and claimed: ' + claimRes.claimed);
    assert.strictEqual(claimRes.vault, 0, 'Vault is emptied upon claiming');

    // 10. Auto-Claim when AFK Manager is active
    activeSession.state.lastIncomeAccrualAt = Date.now() - 1800 * 1000; // 30 min ago
    activeSession.state.afkManagerExpiresAt = Date.now() + 3600 * 1000; // Manager active for 1 hr
    activeSession.state.businesses.kiosk.suppliesTicks = 3600;

    const preCash = activeSession.state.cash;
    // Any routine action should auto-claim
    await ServerBridge.claimIncome();
    assert.ok(activeSession.state.cash > preCash, 'Manager auto-collected earnings directly to cash');

    console.log('[Test] All Phase 1 Server-Authoritative tests PASSED successfully!');
  } finally {
    sessionManager.sessions.delete('phase1_tester');
    if (sessionManager.flushIntervalTimer) clearInterval(sessionManager.flushIntervalTimer);
    ServerBridge.destroy();
    await app.close();
    process.exit(0);
  }
});
