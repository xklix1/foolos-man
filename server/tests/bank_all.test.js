/**
 * Test Authoritative 100% Deposit All & Withdraw All
 */

const assert = require('assert');
const test = require('node:test');

const TEST_PORT = 3995;
global.window = {
  location: { hostname: 'localhost' },
  SERVER_API_URL: `http://127.0.0.1:${TEST_PORT}`,
  addEventListener: () => {}
};

const app = require('../src/server');
const sessionManager = require('../src/services/session-manager');
const ServerBridge = require('../../server-client-bridge');

test('Bank 100% Deposit All and Withdraw All Tests', async () => {
  await app.listen({ port: TEST_PORT, host: '127.0.0.1' });

  try {
    const testUser = 'bank_all_tester';
    sessionManager.sessions.set(testUser.toLowerCase(), {
      username: testUser,
      pin: '1234',
      state: {
        username: testUser,
        cash: 15432.78, // Has decimal fractions
        bank: 50000.22,
        xp: 500,
        netWorth: 65433,
        title: 'تاجر صاعد'
      },
      dirty: false,
      lastActivity: Date.now()
    });

    // 1. Authenticate session
    const sess = await ServerBridge.startSession(testUser, '1234');
    assert.ok(sess, 'Session started');
    assert.strictEqual(ServerBridge.isServerOnline(), true);

    const activeSess = sessionManager.sessions.get(testUser.toLowerCase());

    // 2. Test Deposit All with decimal fractions
    const depositRes = await ServerBridge.bankAction('deposit', 'all', true);
    assert.strictEqual(depositRes.success, true);
    assert.strictEqual(depositRes.cash, 0, 'Cash MUST be exactly 0 after depositing all');
    assert.strictEqual(depositRes.bank, 65433, 'Bank must receive all funds including decimals');
    assert.strictEqual(activeSess.state.cash, 0, 'Server session cash must be 0');

    // 3. Test Withdraw All
    const withdrawRes = await ServerBridge.bankAction('withdraw', 'all', true);
    assert.strictEqual(withdrawRes.success, true);
    assert.strictEqual(withdrawRes.bank, 0, 'Bank MUST be exactly 0 after withdrawing all');
    assert.strictEqual(withdrawRes.cash, 65433, 'Cash must receive full bank balance');
    assert.strictEqual(activeSess.state.bank, 0, 'Server session bank must be 0');

    // 4. Test numeric input >= balance also triggers 100% clean sweep
    activeSess.state.cash = 1000.45;
    activeSess.state.bank = 2000;
    const sweepRes = await ServerBridge.bankAction('deposit', 1000); // User typed floor balance
    assert.strictEqual(sweepRes.success, true);
    assert.strictEqual(sweepRes.cash, 0, 'Even floor balance deposit must cleanly sweep all cash without leaving decimals');
    assert.strictEqual(sweepRes.bank, 3000.45);

    console.log('[Test] All Bank 100% Deposit All and Withdraw All tests PASSED!');
  } finally {
    sessionManager.sessions.delete('bank_all_tester');
    if (sessionManager.flushIntervalTimer) clearInterval(sessionManager.flushIntervalTimer);
    ServerBridge.destroy();
    await app.close();
    process.exit(0);
  }
});
