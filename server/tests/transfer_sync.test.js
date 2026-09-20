const test = require('node:test');
const assert = require('node:assert/strict');
const sessionManager = require('../src/services/session-manager');

test('Wire Transfer In-Memory Credit & Anti-Overwrite Protection', async (t) => {
  const username = 'test_wire_recipient_' + Date.now();
  const uKey = username.toLowerCase();

  // Create mock active session in memory
  const initialBank = 100000;
  const initialCash = 50000;
  const initialNetWorth = 150000;

  sessionManager.sessions.set(uKey, {
    username: username,
    pin: '1234',
    sessionId: 'sess_test_wire_1',
    sessionToken: 'tok_test_wire_1',
    state: {
      username: username,
      cash: initialCash,
      bank: initialBank,
      netWorth: initialNetWorth,
      adminModifiedTimestamp: 1000
    },
    dirty: false,
    lastActivity: Date.now()
  });

  // 1. Simulate sender notifying server of 5,000,000 EGP transfer
  const transferAmount = 5000000;
  const transferTs = 2000;
  const credited = sessionManager.creditRecipientWireTransfer(username, transferAmount, transferTs);

  assert.equal(credited, true, 'Recipient active session should be credited');
  const session = sessionManager.sessions.get(uKey);
  assert.equal(session.state.bank, initialBank + transferAmount, 'Bank should be 5,100,000');
  assert.equal(session.state.adminModifiedTimestamp, transferTs, 'adminModifiedTimestamp should advance');
  assert.equal(session.dirty, true, 'Session should be marked dirty for write-behind');

  // 2. Simulate stale client sync-state (client sent old balance before receiving mail)
  const staleClientState = {
    username: username,
    activeSessionId: 'sess_test_wire_1',
    cash: initialCash,
    bank: initialBank, // Stale 100,000
    netWorth: initialNetWorth,
    adminModifiedTimestamp: 1000 // Stale timestamp < sessionAdminTs (2000)
  };

  await sessionManager.updateSessionState(username, staleClientState, false);

  // Assert that stale client state DID NOT overwrite the transfer!
  assert.equal(session.state.bank, initialBank + transferAmount, 'Stale client sync MUST NOT overwrite bank balance');
  assert.equal(session.state.adminModifiedTimestamp, transferTs, 'adminModifiedTimestamp MUST remain at 2000');

  // Clean up
  sessionManager.sessions.delete(uKey);
});

test('Wire Transfer In-Memory Sender Deduction & Anti-Restoration Protection', async (t) => {
  const senderUser = 'test_wire_sender_' + Date.now();
  const sKey = senderUser.toLowerCase();

  const initialBank = 6000000;
  const initialCash = 500000;
  const initialNetWorth = 6500000;

  sessionManager.sessions.set(sKey, {
    username: senderUser,
    pin: '1234',
    sessionId: 'sess_test_sender_1',
    sessionToken: 'tok_test_sender_1',
    state: {
      username: senderUser,
      cash: initialCash,
      bank: initialBank,
      netWorth: initialNetWorth,
      adminModifiedTimestamp: 1000
    },
    dirty: false,
    lastActivity: Date.now()
  });

  // 1. Deduct sender 5,000,000 EGP
  const transferAmount = 5000000;
  const transferTs = 3000;
  const deducted = sessionManager.deductSenderWireTransfer(senderUser, transferAmount, transferTs);

  assert.equal(deducted, true, 'Sender active session should be deducted');
  const session = sessionManager.sessions.get(sKey);
  // Cash was 500k, so 500k deducted from cash (cash -> 0), remaining 4.5M deducted from bank (bank -> 1.5M)
  assert.equal(session.state.cash, 0, 'Sender cash should be 0');
  assert.equal(session.state.bank, 1500000, 'Sender bank should be 1,500,000');
  assert.equal(session.state.netWorth, initialNetWorth - transferAmount, 'Net worth should decrease by transfer amount');
  assert.equal(session.state.adminModifiedTimestamp, transferTs, 'adminModifiedTimestamp should advance');
  assert.equal(session.dirty, true, 'Session should be marked dirty for write-behind');

  // Clean up
  sessionManager.sessions.delete(sKey);
});
