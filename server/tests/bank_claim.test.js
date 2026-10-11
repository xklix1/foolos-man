const assert = require('assert');
const test = require('node:test');
const app = require('../src/server');
const sessionManager = require('../src/services/session-manager');

test('Daily Bank Interest Claim Endpoint', async (t) => {
  const PORT = 4005;
  await app.listen({ port: PORT, host: '127.0.0.1' });
  const baseUrl = `http://127.0.0.1:${PORT}`;

  const username = 'test_bank_claim_' + Date.now();
  const uKey = username.toLowerCase();

  // Create session
  sessionManager.sessions.set(uKey, {
    username,
    pin: '1234',
    sessionId: 'sess_claim_test',
    state: {
      username,
      cash: 100000,
      bank: 10000000, // 10M EGP in bank
      netWorth: 10100000,
      dailyBankInterestClaim: { date: '', amount: 0 }
    },
    dirty: false,
    lastActivity: Date.now()
  });

  await t.test('Successfully claims daily interest with bracketed calculation', async () => {
    const res = await fetch(`${baseUrl}/api/action/bank/claim-interest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.interestClaimed > 0, 'Interest claimed must be positive');
    assert.strictEqual(data.bank, 10000000 + data.interestClaimed);
    assert.strictEqual(data.dailyBankInterestClaim.date, new Date().toISOString().slice(0, 10));
  });

  await t.test('Rejects duplicate claim on the same calendar day', async () => {
    const res = await fetch(`${baseUrl}/api/action/bank/claim-interest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.alreadyClaimed, true);
  });

  await t.test('Rejects claim if bank balance is 0', async () => {
    const zeroUser = 'test_zero_bank_' + Date.now();
    sessionManager.sessions.set(zeroUser.toLowerCase(), {
      username: zeroUser,
      pin: '1234',
      sessionId: 'sess_zero',
      state: {
        username: zeroUser,
        cash: 50000,
        bank: 0,
        netWorth: 50000
      },
      dirty: false,
      lastActivity: Date.now()
    });

    const res = await fetch(`${baseUrl}/api/action/bank/claim-interest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: zeroUser })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.ok(data.error.includes('لا يوجد رصيد إيداع'));

    sessionManager.sessions.delete(zeroUser.toLowerCase());
  });

  // Clean up
  sessionManager.sessions.delete(uKey);
  await app.close();
});
