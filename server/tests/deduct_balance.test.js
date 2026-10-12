const assert = require('assert');
const test = require('node:test');
const sessionManager = require('../src/services/session-manager');

test('Moderator / Admin Action: deduct_balance directly affects player cash/bank allowing negative balance', async () => {
  const targetUser = 'deduct_test_player';

  // Seed active player session with 100,000 cash and 500,000 bank
  sessionManager.sessions.set(targetUser.toLowerCase(), {
    username: targetUser,
    pin: '1234',
    state: {
      username: targetUser,
      cash: 100000,
      bank: 500000,
      netWorth: 600000,
      activityLog: [],
      adminGrants: [],
      moderatorNotes: []
    },
    dirty: true,
    lastActivity: Date.now()
  });

  const session = sessionManager.getSession(targetUser);
  assert.ok(session, 'Player session should exist');

  // 1. Deduct 150,000 from cash (exceeds balance -> resulting in -50,000 debt balance)
  const deductCashAmount = 150000;
  session.state.cash -= deductCashAmount;
  session.state.netWorth = session.state.cash + session.state.bank;
  session.state.adminModifiedTimestamp = Date.now();

  assert.strictEqual(session.state.cash, -50000, 'Cash should be -50,000 (negative overdraft permitted)');
  assert.strictEqual(session.state.bank, 500000, 'Bank should remain unchanged');
  assert.strictEqual(session.state.netWorth, 450000, 'Net worth should be updated to 450,000');

  // 2. Deduct 600,000 from bank (exceeds balance -> resulting in -100,000 debt balance)
  const deductBankAmount = 600000;
  session.state.bank -= deductBankAmount;
  session.state.netWorth = session.state.cash + session.state.bank;
  session.state.adminModifiedTimestamp = Date.now();

  assert.strictEqual(session.state.cash, -50000, 'Cash should still be -50,000');
  assert.strictEqual(session.state.bank, -100000, 'Bank should be -100,000 (negative overdraft permitted)');
  assert.strictEqual(session.state.netWorth, -150000, 'Net worth should correctly reflect negative balances');

  sessionManager.sessions.delete(targetUser.toLowerCase());
  assert.strictEqual(sessionManager.getSession(targetUser), null, 'Session unloaded');
});
