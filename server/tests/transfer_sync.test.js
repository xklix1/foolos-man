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

test('Wire Transfer API Route — 50M Ceiling, Self-Transfer, and Auth Validation', async (t) => {
  const app = require('../src/server');

  // 1. Mock a valid session
  const testUser = 'user_wire_val_' + Date.now();
  const testToken = 'tok_wire_val_' + Date.now();
  sessionManager.sessions.set(testUser.toLowerCase(), {
    username: testUser,
    pin: '1234',
    sessionId: 'sess_' + testUser,
    sessionToken: testToken,
    state: { username: testUser, cash: 100000000, bank: 100000000, netWorth: 200000000 },
    dirty: false,
    lastActivity: Date.now()
  });

  // 2. Missing / Invalid session token
  const resNoAuth = await app.inject({
    method: 'POST',
    url: '/api/action/wire-transfer',
    headers: {
      'authorization': 'Bearer bad_token_xyz'
    },
    payload: {
      sender: testUser,
      recipient: 'ahmed',
      amount: 1000,
      pin: '1234'
    }
  });
  assert.equal(resNoAuth.statusCode, 401, 'Should reject invalid session token');

  // 3. Amount exceeding 50M limit
  const resExceed = await app.inject({
    method: 'POST',
    url: '/api/action/wire-transfer',
    headers: {
      'authorization': `Bearer ${testToken}`
    },
    payload: {
      sender: testUser,
      recipient: 'ahmed',
      amount: 50000001,
      pin: '1234'
    }
  });
  assert.equal(resExceed.statusCode, 400, 'Should reject amount > 50,000,000');
  const exceedData = JSON.parse(resExceed.payload);
  assert.match(exceedData.error, /50,000,000/, 'Error should mention 50M ceiling');

  // 4. Amount <= 0
  const resZero = await app.inject({
    method: 'POST',
    url: '/api/action/wire-transfer',
    headers: {
      'authorization': `Bearer ${testToken}`
    },
    payload: {
      sender: testUser,
      recipient: 'ahmed',
      amount: 0,
      pin: '1234'
    }
  });
  assert.equal(resZero.statusCode, 400, 'Should reject amount <= 0');

  // 5. Transfer to self
  const resSelf = await app.inject({
    method: 'POST',
    url: '/api/action/wire-transfer',
    headers: {
      'authorization': `Bearer ${testToken}`
    },
    payload: {
      sender: testUser,
      recipient: testUser,
      amount: 100000,
      pin: '1234'
    }
  });
  assert.equal(resSelf.statusCode, 400, 'Should reject self transfer');

  // 6. Missing PIN
  const resNoPin = await app.inject({
    method: 'POST',
    url: '/api/action/wire-transfer',
    headers: {
      'authorization': `Bearer ${testToken}`
    },
    payload: {
      sender: testUser,
      recipient: 'ahmed',
      amount: 100000,
      pin: ''
    }
  });
  assert.equal(resNoPin.statusCode, 400, 'Should reject empty PIN');

  // Clean up
  sessionManager.sessions.delete(testUser.toLowerCase());
});

test('Spend Deduction Anti-Rollback: Stale client spending cash is accepted', async (t) => {
  const username = 'test_spend_stale_' + Date.now();
  const uKey = username.toLowerCase();

  const initialCash = 1000000;
  const initialBank = 500000;

  sessionManager.sessions.set(uKey, {
    username: username,
    pin: '1234',
    sessionId: 'sess_test_spend_1',
    sessionToken: 'tok_test_spend_1',
    state: {
      username: username,
      cash: initialCash,
      bank: initialBank,
      adminModifiedTimestamp: 5000
    },
    dirty: false,
    lastActivity: Date.now()
  });

  // Client spent 250,000 cash on cargo/flight (cash: 750,000) but has older adminModifiedTimestamp (stale)
  const clientSpendState = {
    username: username,
    activeSessionId: 'sess_test_spend_1',
    cash: 750000,
    bank: initialBank,
    adminModifiedTimestamp: 2000 // < 5000 (marks isClientStale = true)
  };

  await sessionManager.updateSessionState(username, clientSpendState, false);

  const session = sessionManager.sessions.get(uKey);
  assert.equal(session.state.cash, 750000, 'Server session MUST accept lower cash spend even when isClientStale is true');
  assert.equal(session.dirty, true, 'Session MUST be marked dirty when cash spend is accepted');

  // Clean up
  sessionManager.sessions.delete(uKey);
});
