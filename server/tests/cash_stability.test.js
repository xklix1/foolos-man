const assert = require('assert');
const test = require('node:test');

const sessionManager = require('../src/services/session-manager');

test('Cash Stability & Wealth-Proportional Clamps Verification', async (t) => {
  const username = 'cash_stability_hero';
  const uKey = username.toLowerCase();

  // 1. Initialize session with 10M cash and 50M bank
  sessionManager.sessions.set(uKey, {
    username,
    pin: '1234',
    sessionToken: 'tok_cash_stability',
    state: {
      username,
      cash: 10000000,
      bank: 50000000,
      netWorth: 60000000,
      adminModifiedTimestamp: 0
    },
    dirty: false,
    lastSyncTime: Date.now() - 3500 // 3.5 seconds ago
  });

  await t.test('Test 1: Smart Bank Withdrawal absorbs passive cashflow drift without 500k clamp', async () => {
    // Player withdraws 20M from bank to cash.
    // Meanwhile, server cashflow accrued +50,000 in bank.
    // cashDiff = +20M, bankDiff = -19,950,000 (drift = 50,000 > 100)
    const incomingClientState = {
      username,
      cash: 30000000, // +20M
      bank: 30050000, // -19.95M (accrued 50k passive income)
      netWorth: 60100000
    };

    await sessionManager.updateSessionState(username, incomingClientState);
    const state = sessionManager.getSession(username).state;
    assert.strictEqual(state.cash, 30000000, 'Withdrawal must NOT be clamped to 500k; cash should be 30,000,000');
    assert.strictEqual(state.bank, 30050000, 'Bank should be updated to 30,050,000');
  });

  await t.test('Test 2: Legitimate 150M farm/export cash jump is accepted under 500M ceiling', async () => {
    // Player sells farm harvest for 150M EGP directly into cash
    const incomingClientState = {
      username,
      cash: 180000000, // 30M + 150M = 180M (jump of 150M)
      bank: 30050000,
      netWorth: 210050000
    };

    await sessionManager.updateSessionState(username, incomingClientState);
    const state = sessionManager.getSession(username).state;
    assert.strictEqual(state.cash, 180000000, '150M jump must be accepted fully without being clamped to 500k!');
  });

  await t.test('Test 3: Anti-Cheat velocity clamp still stops impossible 100 Billion injection on early-game account', async () => {
    // Player injects 100 Billion from console F12
    const incomingClientState = {
      username,
      cash: 100000000000, // 100 Billion
      bank: 30050000,
      netWorth: 100030050000
    };

    await sessionManager.updateSessionState(username, incomingClientState);
    const state = sessionManager.getSession(username).state;
    assert.ok(state.cash < 1000000000, 'Impossible 100 Billion must be clamped to safe velocity limit (< 1 Billion)');
    assert.strictEqual(state.cash, 180000000 + 500000000, 'Cash must be clamped to previous cash + 500M ceiling');
  });

  await t.test('Test 4: Normal cash spend is always accepted immediately', async () => {
    // Player spends 50M cash on land / business upgrades
    const incomingClientState = {
      username,
      cash: 130000000, // down from 180M
      bank: 30050000,
      netWorth: 160050000
    };

    await sessionManager.updateSessionState(username, incomingClientState);
    const state = sessionManager.getSession(username).state;
    assert.strictEqual(state.cash, 130000000, 'Cash deduction must be accepted immediately');
  });

  await t.test('Test 5: Billionaire Tycoon with 10 Billion net worth can jump 8 Billion legitimately', async () => {
    const tycoonUser = 'billionaire_whale';
    const tKey = tycoonUser.toLowerCase();
    sessionManager.sessions.set(tKey, {
      username: tycoonUser,
      pin: '0000',
      state: {
        username: tycoonUser,
        cash: 1000000000,    // 1 Billion cash
        bank: 9000000000,    // 9 Billion bank
        netWorth: 10000000000 // 10 Billion Net Worth
      },
      dirty: false,
      lastSyncTime: Date.now() - 3500
    });

    // Tycoon sells a mega asset / luxury yacht / corporate portfolio and receives 8 Billion cash
    const tycoonIncoming = {
      username: tycoonUser,
      cash: 9000000000,     // 1B + 8B = 9 Billion cash
      bank: 9000000000,
      netWorth: 18000000000
    };

    await sessionManager.updateSessionState(tycoonUser, tycoonIncoming);
    const tState = sessionManager.getSession(tycoonUser).state;
    assert.strictEqual(tState.cash, 9000000000, 'Tycoon with 10B net worth must be allowed to receive 8B cash jump without clamping!');

    sessionManager.sessions.delete(tKey);
  });

  await t.test('Test 6: Zero-wealth or beginner account does NOT get deadlocked (Baseline Floor 500M)', async () => {
    const brokeUser = 'broke_beginner';
    const bKey = brokeUser.toLowerCase();
    sessionManager.sessions.set(bKey, {
      username: brokeUser,
      pin: '1111',
      state: {
        username: brokeUser,
        cash: 0,
        bank: 0,
        netWorth: 0 // Complete zero wealth
      },
      dirty: false,
      lastSyncTime: Date.now() - 3500
    });

    // Broke player claims major welcome bonus / grand quest reward of 200 Million EGP
    const brokeIncoming = {
      username: brokeUser,
      cash: 200000000, // 200M EGP
      bank: 0,
      netWorth: 200000000
    };

    await sessionManager.updateSessionState(brokeUser, brokeIncoming);
    const bState = sessionManager.getSession(brokeUser).state;
    assert.strictEqual(bState.cash, 200000000, 'Zero-wealth player must accept 200M reward via 500M baseline floor without deadlock!');

    sessionManager.sessions.delete(bKey);
  });

  // Cleanup
  sessionManager.sessions.delete(uKey);
});
