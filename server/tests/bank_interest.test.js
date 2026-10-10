/**
 * Bank Interest & Continuous Cashflow Accrual Test Suite
 * Verifies that bank balance accrues smoothly via Delta-Time on server
 * from businesses, properties, cars, and interest, and NEVER fluctuates down like a swing.
 */

const assert = require('assert');
const test = require('node:test');

const sessionManager = require('../src/services/session-manager');

test('Server-Authoritative Cashflow & Bank Accrual (No Swing)', async (t) => {
  const username = 'test_bank_swing_' + Date.now();
  const uKey = username.toLowerCase();
  const initialBank = 1000000; // 1,000,000 EGP deposit

  sessionManager.sessions.set(uKey, {
    username: username,
    pin: '1234',
    sessionId: 'sess_bank_test',
    state: {
      username: username,
      cash: 50000,
      bank: initialBank,
      netWorth: 1050000,
      businesses: {
        kiosk: { level: 2, workers: 10, price: 20 }
      },
      lastCashflowAccrualAt: Date.now() - 3600 * 1000 // 1 hour ago
    },
    dirty: false,
    lastActivity: Date.now() - 3600 * 1000
  });

  await t.test('Server credits continuous cashflow (businesses + interest) on sync based on elapsed time', async () => {
    // Client sends sync
    const clientPayload = {
      username: username,
      bank: initialBank // Client sends initial balance
    };

    await sessionManager.updateSessionState(uKey, clientPayload, false);

    const session = sessionManager.sessions.get(uKey);
    // 1 hour on 1M EGP at 0.015% = 150 EGP + kiosk profit
    assert.ok(session.state.bank > initialBank, `Bank balance must increase (Current: ${session.state.bank})`);
    assert.ok(session.state.bank >= initialBank + 150, 'Bank should earn interest + kiosk profit');
  });

  await t.test('Client sending stale or modified bank balance NEVER causes a downward swing', async () => {
    const session = sessionManager.sessions.get(uKey);
    const balanceBefore = session.state.bank;

    // Attacker or stale client sends lower balance
    const stalePayload = {
      username: username,
      bank: initialBank // 1,000,000 (lower than current earned balance)
    };

    await sessionManager.updateSessionState(uKey, stalePayload, false);

    // Assert bank NEVER dropped back down to 1,000,000
    assert.ok(session.state.bank >= balanceBefore, 'Bank balance must never swing downwards');
  });

  // Clean up
  sessionManager.sessions.delete(uKey);
});
