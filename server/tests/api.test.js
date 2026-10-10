/**
 * Ras ALmal Tycoon — Authoritative Action API Integration Tests
 */

const assert = require('assert');
const test = require('node:test');

const app = require('../src/server');
const sessionManager = require('../src/services/session-manager');

test('API Integration — Health & Status Endpoints', async () => {
  const healthRes = await app.inject({
    method: 'GET',
    url: '/health'
  });
  assert.strictEqual(healthRes.statusCode, 200);
  const healthData = JSON.parse(healthRes.payload);
  assert.strictEqual(healthData.status, 'ok');
  assert.ok(healthData.memory.heapUsedMB > 0);

  const statusRes = await app.inject({
    method: 'GET',
    url: '/api/status'
  });
  assert.strictEqual(statusRes.statusCode, 200);
  const statusData = JSON.parse(statusRes.payload);
  assert.strictEqual(statusData.architecture, 'Server-Authoritative');
  assert.strictEqual(statusData.maxCpsLimit, 15);
});

test('API Integration — Click Action & Anti-Autoclicker Guard', async () => {
  // Pre-seed a test session in memory
  const testUsername = 'test_player_api';
  sessionManager.sessions.set(testUsername.toLowerCase(), {
    username: testUsername,
    pin: '1234',
    state: {
      username: testUsername,
      cash: 1000,
      bank: 500,
      xp: 10,
      netWorth: 1500,
      title: 'عامل مبتدئ',
      businesses: {}
    },
    dirty: false,
    lastActivity: Date.now()
  });

  // 1. Legitimate human click burst (5 clicks in 1000ms)
  const validClickRes = await app.inject({
    method: 'POST',
    url: '/api/action/click',
    payload: {
      username: testUsername,
      count: 5,
      durationMs: 1000
    }
  });

  assert.strictEqual(validClickRes.statusCode, 200);
  const validData = JSON.parse(validClickRes.payload);
  assert.strictEqual(validData.success, true);
  assert.strictEqual(validData.earnedCash, 5);
  assert.strictEqual(validData.cash, 1005);
  assert.strictEqual(validData.xp, 15);

  // 2. Autoclicker violation (60 clicks in 500ms)
  const cheatClickRes = await app.inject({
    method: 'POST',
    url: '/api/action/click',
    payload: {
      username: testUsername,
      count: 60,
      durationMs: 500
    }
  });

  assert.strictEqual(cheatClickRes.statusCode, 429, 'Rejected by anti-autoclicker rate limiter');
  const cheatData = JSON.parse(cheatClickRes.payload);
  assert.ok(cheatData.error.includes('Anti-Autoclicker'));
});

test('API Integration — Business Purchase & Insufficient Funds Guard', async () => {
  const testUsername = 'test_biz_player';
  sessionManager.sessions.set(testUsername.toLowerCase(), {
    username: testUsername,
    state: {
      username: testUsername,
      cash: 2000, // Enough for kiosk (1275), not enough for coffee (5780)
      bank: 0,
      xp: 0,
      netWorth: 2000,
      title: 'عامل مبتدئ',
      businesses: {}
    },
    dirty: false,
    lastActivity: Date.now()
  });

  // 1. Buy kiosk (cost: 1275)
  const buyKioskRes = await app.inject({
    method: 'POST',
    url: '/api/action/buy-business',
    payload: {
      username: testUsername,
      businessId: 'kiosk'
    }
  });

  assert.strictEqual(buyKioskRes.statusCode, 200);
  const kioskData = JSON.parse(buyKioskRes.payload);
  assert.strictEqual(kioskData.newLevel, 1);
  assert.strictEqual(kioskData.cash, 2000 - 1275);

  // 2. Attempt to buy coffee with remaining 725 cash (cost: 5780)
  const buyCoffeeRes = await app.inject({
    method: 'POST',
    url: '/api/action/buy-business',
    payload: {
      username: testUsername,
      businessId: 'coffee'
    }
  });

  assert.strictEqual(buyCoffeeRes.statusCode, 400, 'Rejected due to insufficient funds');
  const coffeeData = JSON.parse(buyCoffeeRes.payload);
  assert.strictEqual(coffeeData.requiredCash, 5780);
});

test('API Integration — Bank Deposit & Withdrawal', async () => {
  const testUsername = 'test_bank_player';
  sessionManager.sessions.set(testUsername.toLowerCase(), {
    username: testUsername,
    state: {
      username: testUsername,
      cash: 1000,
      bank: 500,
      netWorth: 1500,
      businesses: {}
    },
    dirty: false,
    lastActivity: Date.now()
  });

  // 1. Deposit 300
  const depositRes = await app.inject({
    method: 'POST',
    url: '/api/action/bank',
    payload: {
      username: testUsername,
      type: 'deposit',
      amount: 300
    }
  });

  assert.strictEqual(depositRes.statusCode, 200);
  const depData = JSON.parse(depositRes.payload);
  assert.strictEqual(depData.cash, 700);
  assert.strictEqual(depData.bank, 800);

  // 2. Withdraw 200
  const withdrawRes = await app.inject({
    method: 'POST',
    url: '/api/action/bank',
    payload: {
      username: testUsername,
      type: 'withdraw',
      amount: 200
    }
  });

  assert.strictEqual(withdrawRes.statusCode, 200);
  const withData = JSON.parse(withdrawRes.payload);
  assert.strictEqual(withData.cash, 900);
  assert.strictEqual(withData.bank, 600);

  // 3. Attempt over-withdrawal
  const overWithdrawRes = await app.inject({
    method: 'POST',
    url: '/api/action/bank',
    payload: {
      username: testUsername,
      type: 'withdraw',
      amount: 50000
    }
  });
  assert.strictEqual(overWithdrawRes.statusCode, 400);
});

test('API Integration — Executive Gear Unlock & Upgrade', async () => {
  const testUsername = 'test_gear_player';
  sessionManager.sessions.set(testUsername.toLowerCase(), {
    username: testUsername,
    state: {
      username: testUsername,
      cash: 5000000,
      bank: 0,
      gold: 500,
      netWorth: 10000000,
      executiveGear: {}
    },
    dirty: false,
    lastActivity: Date.now()
  });

  // 1. Unlock ledger (requires 500k net worth & 25 gold)
  const unlockRes = await app.inject({
    method: 'POST',
    url: '/api/action/gear/unlock',
    payload: { username: testUsername, gearId: 'ledger' }
  });
  assert.strictEqual(unlockRes.statusCode, 200);
  const unlockData = JSON.parse(unlockRes.payload);
  assert.strictEqual(unlockData.success, true);
  assert.strictEqual(unlockData.gold, 475); // 500 - 25
  assert.strictEqual(unlockData.gear.ledger.level, 1);

  // 2. Upgrade ledger to lvl 2 (requires 20 gold)
  const upgradeRes = await app.inject({
    method: 'POST',
    url: '/api/action/gear/upgrade',
    payload: { username: testUsername, gearId: 'ledger' }
  });
  assert.strictEqual(upgradeRes.statusCode, 200);
  const upData = JSON.parse(upgradeRes.payload);
  assert.strictEqual(upData.success, true);
  assert.strictEqual(upData.newLevel, 2);
  assert.strictEqual(upData.gold, 455); // 475 - 20
});

test('API Integration — AFK Renewal & Session Heartbeat', async () => {
  const testUsername = 'test_afk_player';
  sessionManager.sessions.set(testUsername.toLowerCase(), {
    username: testUsername,
    state: {
      username: testUsername,
      afkManagerExpiresAt: 0,
      businesses: {}
    },
    dirty: false,
    lastActivity: Date.now()
  });

  const renewRes = await app.inject({
    method: 'POST',
    url: '/api/action/renew-afk',
    payload: { username: testUsername }
  });

  assert.strictEqual(renewRes.statusCode, 200);
  const renewData = JSON.parse(renewRes.payload);
  assert.strictEqual(renewData.success, true);
  assert.ok(renewData.afkManagerExpiresAt > Date.now());

  const heartbeatRes = await app.inject({
    method: 'POST',
    url: '/api/session/heartbeat',
    payload: { username: testUsername }
  });

  assert.strictEqual(heartbeatRes.statusCode, 200);
  const hbData = JSON.parse(heartbeatRes.payload);
  assert.strictEqual(hbData.success, true);
});

test('API Integration — Rate Limiter Enforces HTTP 429 on Rapid Click Bursts', async () => {
  const testUsername = 'test_spam_player';
  sessionManager.sessions.set(testUsername.toLowerCase(), {
    username: testUsername,
    state: { username: testUsername, cash: 100, xp: 0, netWorth: 100, title: 'عامل مبتدئ' },
    dirty: false,
    lastActivity: Date.now()
  });

  const spamIp = '192.168.1.99';
  const responses = [];

  // Fire 15 rapid POST requests in parallel from same IP
  for (let i = 0; i < 15; i++) {
    responses.push(app.inject({
      method: 'POST',
      url: '/api/action/click',
      remoteAddress: spamIp,
      payload: { username: testUsername, count: 1 }
    }));
  }

  const results = await Promise.all(responses);
  const statusCodes = results.map(r => r.statusCode);
  const rateLimited = statusCodes.filter(c => c === 429);

  // At least some requests should hit the 10 req/sec limit and return 429
  assert.ok(rateLimited.length > 0, 'Rate limiter must enforce HTTP 429 on rapid request bursts');
});

test('API Integration — /api/session/register Validations', async () => {
  // 1. Missing username
  const missingRes = await app.inject({
    method: 'POST',
    url: '/api/session/register',
    payload: { playerRow: {} }
  });
  assert.strictEqual(missingRes.statusCode, 400);

  // 2. Short username (< 3 chars)
  const shortRes = await app.inject({
    method: 'POST',
    url: '/api/session/register',
    payload: { playerRow: { username: 'ab' } }
  });
  assert.strictEqual(shortRes.statusCode, 400);
});

test('API Integration — Airport Hire Manager 100M Deduction & State Sync', async () => {
  const testUsername = 'test_airport_manager_player';
  sessionManager.sessions.set(testUsername.toLowerCase(), {
    username: testUsername,
    state: {
      username: testUsername,
      cash: 200000000,
      bank: 0,
      netWorth: 200000000,
      airport: {
        unlocked: true,
        manager: { tier: 0, autopilot: false }
      }
    },
    dirty: false,
    lastActivity: Date.now()
  });

  const hireRes = await app.inject({
    method: 'POST',
    url: '/api/airport/hire-manager',
    payload: { username: testUsername, tier: 1 }
  });

  assert.strictEqual(hireRes.statusCode, 200);
  const hireData = JSON.parse(hireRes.payload);
  assert.strictEqual(hireData.success, true);
  assert.strictEqual(hireData.airport.manager.tier, 1);
  assert.strictEqual(hireData.cash, 100000000);

  const session = sessionManager.sessions.get(testUsername.toLowerCase());
  assert.strictEqual(session.state.cash, 100000000);
  assert.strictEqual(session.state.airport.manager.tier, 1);

  // Client sync with 100M: must remain 100M and not restore 200M
  sessionManager.updateSessionState(testUsername, {
    cash: 100000000,
    bank: 0,
    airport: session.state.airport
  });
  assert.strictEqual(session.state.cash, 100000000);

  // Deposit 50M to bank -> Cash 50M, Bank 50M
  const depRes = await app.inject({
    method: 'POST',
    url: '/api/action/bank',
    payload: {
      username: testUsername,
      type: 'deposit',
      amount: 50000000
    }
  });
  assert.strictEqual(depRes.statusCode, 200);
  const depData = JSON.parse(depRes.payload);
  assert.strictEqual(depData.cash, 50000000);
  assert.strictEqual(depData.bank, 50000000);

  // Client sync with Cash 50M, Bank 50M: should stay 50M / 50M (no doubling!)
  sessionManager.updateSessionState(testUsername, {
    cash: 50000000,
    bank: 50000000
  });
  assert.strictEqual(session.state.cash, 50000000);
  assert.strictEqual(session.state.bank, 50000000);

  // Clean exit for node test runner
  process.exit(0);
});

