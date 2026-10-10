/**
 * Test Server-Authoritative Phase 3:
 * - Pure Thin-Client State Sync Lockdown
 * - Complete Rejection of Client Wealth Manipulation (Cash, Bank, NetWorth, Assets, Cars, Stocks)
 * - Automatic State Reconciliation via Bridge
 * - Admin Panel Grant Exemption Preservation
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

test('Server-Authoritative Phase 3 (Thin Client Sync Lockdown) Tests', async () => {
  await app.listen({ port: TEST_PORT, host: '127.0.0.1' });

  try {
    const testUser = 'phase3_tester';
    const initialCash = 50000;
    const initialBank = 100000;
    const initialNetWorth = 150000;

    sessionManager.sessions.set(testUser.toLowerCase(), {
      username: testUser,
      pin: '1234',
      state: {
        username: testUser,
        cash: initialCash,
        bank: initialBank,
        dirtyCash: 0,
        xp: 100,
        netWorth: initialNetWorth,
        title: 'عامل مبتدئ',
        stocks: {},
        assets: {},
        ownedCars: [],
        activeCar: null,
        jailTimer: 0,
        adminModifiedTimestamp: 1000
      },
      dirty: false,
      lastActivity: Date.now()
    });

    // 1. Authenticate Session
    const sess = await ServerBridge.startSession(testUser, '1234');
    assert.ok(sess, 'Session started successfully');
    assert.strictEqual(ServerBridge.isServerOnline(), true);

    const serverSession = sessionManager.sessions.get(testUser.toLowerCase());

    // 2. Exploit Attempt: Inject Falsified Billions via Client syncState
    const hackedPayload = {
      username: testUser,
      cash: 99999999999, // 100 Billion
      bank: 88888888888, // 88 Billion
      netWorth: 188888888887,
      assets: { mega_yacht: 5, private_island: 2 },
      ownedCars: [{ id: 'rolls', rentStatus: 'idle' }],
      stocks: { BITC: { shares: 50000, avgPrice: 100 } },
      gold: 5000
    };

    const syncRes = await ServerBridge.syncState(hackedPayload, true);
    assert.strictEqual(syncRes.success, true);
    assert.ok(syncRes.authoritativeState, 'Server returned authoritativeState reconciliation payload');

    // 3. Verify Server State was 100% IMMUNE to Client Injection
    assert.strictEqual(serverSession.state.cash, initialCash, 'Cash MUST NOT be overwritten by client sync');
    assert.strictEqual(serverSession.state.bank, initialBank, 'Bank MUST NOT be overwritten by client sync');
    assert.deepStrictEqual(serverSession.state.assets, {}, 'Assets MUST NOT be injected by client sync');
    assert.deepStrictEqual(serverSession.state.ownedCars, [], 'Owned cars MUST NOT be injected by client sync');
    assert.deepStrictEqual(serverSession.state.stocks, {}, 'Stocks MUST NOT be injected by client sync');
    assert.strictEqual(serverSession.state.netWorth, initialNetWorth, 'Net worth MUST be calculated authoritatively');

    // 4. Verify Authoritative State Payload Matches Server Reality
    assert.strictEqual(syncRes.authoritativeState.cash, initialCash);
    assert.strictEqual(syncRes.authoritativeState.bank, initialBank);
    assert.strictEqual(syncRes.authoritativeState.netWorth, initialNetWorth);

    // 5. Verify Legitimate Server Action Updates State Authoritatively
    // Legitimate deposit of 20,000 to bank via /api/action/bank
    const bankRes = await ServerBridge.bankAction('deposit', 20000);
    assert.strictEqual(bankRes.success, true);
    assert.strictEqual(serverSession.state.cash, 30000, 'Server cash decremented legitimately');
    assert.strictEqual(serverSession.state.bank, 120000, 'Server bank incremented legitimately');

    // 6. Another sync attempt with outdated cash must NOT regress the balance
    const staleSyncRes = await ServerBridge.syncState({ username: testUser, cash: initialCash, bank: initialBank });
    assert.strictEqual(staleSyncRes.success, true);
    assert.strictEqual(serverSession.state.cash, 30000, 'Server cash remains authoritative');
    assert.strictEqual(serverSession.state.bank, 120000, 'Server bank remains authoritative');

    // 7. Verify Admin Grant Exemption (Admin Panel top-up / edit)
    const adminGrantPayload = {
      username: testUser,
      cash: 500000,
      bank: 200000,
      adminModifiedTimestamp: 5000, // Newer than session timestamp (1000)
      _adminGrantBypass: true
    };
    const adminSyncRes = await ServerBridge.syncState(adminGrantPayload, true);
    assert.strictEqual(adminSyncRes.success, true);
    assert.strictEqual(serverSession.state.cash, 500000, 'Admin grant cash correctly applied');
    assert.strictEqual(serverSession.state.bank, 200000, 'Admin grant bank correctly applied');

    console.log('[Test] All Phase 3 Thin-Client Lockdown tests passed successfully!');
  } finally {
    sessionManager.sessions.delete('phase3_tester');
    if (sessionManager.flushIntervalTimer) clearInterval(sessionManager.flushIntervalTimer);
    ServerBridge.destroy();
    await app.close();
    process.exit(0);
  }
});
