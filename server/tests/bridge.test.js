/**
 * Test ServerBridge client with real local Fastify server
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

test('Client ServerBridge End-to-End Test', async () => {
  await app.listen({ port: TEST_PORT, host: '127.0.0.1' });

  try {
    const testUsername = 'bridge_player_1';
    sessionManager.sessions.set(testUsername.toLowerCase(), {
      username: testUsername,
      pin: '1234',
      state: {
        username: testUsername,
        cash: 10000,
        bank: 5000,
        xp: 100,
        netWorth: 15000,
        title: 'عامل مبتدئ',
        businesses: {}
      },
      dirty: false,
      lastActivity: Date.now()
    });

    // 1. Start Session
    const sessionRes = await ServerBridge.startSession(testUsername, '1234');
    assert.ok(sessionRes, 'Session started successfully');
    assert.strictEqual(sessionRes.username, testUsername);
    assert.strictEqual(ServerBridge.isServerOnline(), true);

    // 2. Buy Business
    const buyRes = await ServerBridge.buyBusiness('kiosk');
    assert.ok(buyRes, 'Business purchase succeeded');
    assert.strictEqual(buyRes.newLevel, 1);
    assert.strictEqual(buyRes.cash, 10000 - 1275);

    // 3. Renew AFK Manager
    const afkRes = await ServerBridge.renewAfkManager();
    assert.ok(afkRes, 'AFK Manager renewed successfully');
    assert.ok(afkRes.afkManagerExpiresAt > Date.now());

    // 4. Bank Action
    const bankRes = await ServerBridge.bankAction('deposit', 1000);
    assert.ok(bankRes, 'Bank deposit succeeded');
    assert.strictEqual(bankRes.bank, 6000);

    // 5. Sync State (e.g. industry and client progress)
    const syncRes = await ServerBridge.syncState({
      cash: 7000,
      bank: 6000,
      industry: {
        food: { unlocked: true, stage1: 2, stage2: 1, stage3: 1, logistics: 1 }
      }
    }, false);
    assert.ok(syncRes, 'State sync succeeded');
    assert.strictEqual(syncRes.success, true);
    const updatedSession = sessionManager.sessions.get(testUsername.toLowerCase());
    assert.strictEqual(updatedSession.state.industry.food.unlocked, true);
    assert.strictEqual(updatedSession.state.industry.food.stage1, 2);
  } finally {
    ServerBridge.destroy();
    await app.close();
  }
});
