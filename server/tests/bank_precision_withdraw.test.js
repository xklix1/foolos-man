const assert = require('assert');
const test = require('node:test');
const app = require('../src/server');
const sessionManager = require('../src/services/session-manager');

test('Bank Precision Withdrawal & Anti-Ghost Cash Accrual', async (t) => {
  const PORT = 4018;
  await app.listen({ port: PORT, host: '127.0.0.1' });
  const baseUrl = `http://127.0.0.1:${PORT}`;

  const username = 'precision_tester_' + Date.now();
  const uKey = username.toLowerCase();

  // Create session with 0 cash, 50,000 in bank, active AFK manager, and active businesses
  sessionManager.sessions.set(uKey, {
    username,
    pin: '1234',
    sessionId: 'sess_precision',
    sessionToken: 'tok_precision_test',
    state: {
      username,
      cash: 0,
      bank: 50000,
      netWorth: 50000,
      sessionToken: 'tok_precision_test',
      afkManagerExpiresAt: Date.now() + 86400000, // Active AFK Manager
      lastIncomeAccrualAt: Date.now() - 3600000,   // 1 hour ago
      lastCashflowAccrualAt: Date.now() - 3600000, // 1 hour ago
      businesses: {
        kiosk: { level: 5, suppliesTicks: 10000 }
      },
      assets: {
        studio: 3
      }
    },
    dirty: false,
    lastActivity: Date.now()
  });

  await t.test('Withdraw 10 EGP delivers EXACTLY 10 EGP to cash without phantom profits', async () => {
    const res = await fetch(`${baseUrl}/api/action/bank`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer tok_precision_test'
      },
      body: JSON.stringify({
        username,
        type: 'withdraw',
        amount: 10,
        isAll: false
      })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.amount, 10, 'Withdrawn amount must be exactly 10');
    assert.strictEqual(data.cash, 10, 'Cash balance must be exactly 10 (not 130 or any phantom amount)');
    assert.strictEqual(data.bank, 49990, 'Bank balance must decrease by exactly 10');
  });

  await t.test('Manual numeric input equal to bank does NOT trigger full sweep if isAll is false', async () => {
    const session = sessionManager.sessions.get(uKey);
    session.state.bank = 100;
    session.state.cash = 0;

    const res = await fetch(`${baseUrl}/api/action/bank`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer tok_precision_test'
      },
      body: JSON.stringify({
        username,
        type: 'withdraw',
        amount: 50,
        isAll: false
      })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.amount, 50);
    assert.strictEqual(data.cash, 50);
    assert.strictEqual(data.bank, 50, 'Bank should retain remaining 50 EGP');
  });

  // Clean up
  sessionManager.sessions.delete(uKey);
  if (sessionManager.flushIntervalTimer) clearInterval(sessionManager.flushIntervalTimer);
  await app.close();
});
