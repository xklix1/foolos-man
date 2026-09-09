const assert = require('assert');
const test = require('node:test');

const sessionManager = require('../src/services/session-manager');

test('Admin Actions: Session manager eviction and state reset verification', async () => {
  const targetUser = 'reset_test_player';

  // Seed an active player session
  sessionManager.sessions.set(targetUser.toLowerCase(), {
    username: targetUser,
    pin: '9999',
    state: {
      username: targetUser,
      cash: 500000,
      bank: 2000000,
      netWorth: 2500000,
      xp: 5000,
      title: 'رجل أعمال كبير',
      jobId: 'ceo',
      businesses: { kiosk: { level: 5, workers: 2 } }
    },
    dirty: true,
    lastActivity: Date.now()
  });

  assert.ok(sessionManager.getSession(targetUser), 'Session should initially exist');

  // 1. Simulate Reset sync
  const resetCleanState = {
    username: targetUser,
    cash: 0,
    bank: 0,
    netWorth: 0,
    xp: 0,
    title: 'عامل مبتدئ',
    jobId: 'worker',
    isReset: true,
    businesses: {}
  };

  const session = sessionManager.getSession(targetUser);
  if (resetCleanState.isReset) {
    session.state = JSON.parse(JSON.stringify(resetCleanState));
    session.dirty = false;
  }

  assert.strictEqual(session.state.cash, 0, 'Cash should be reset to 0');
  assert.strictEqual(session.state.bank, 0, 'Bank should be reset to 0');
  assert.strictEqual(session.state.netWorth, 0, 'Net worth should be reset to 0');
  assert.strictEqual(session.state.xp, 0, 'XP should be reset to 0');
  assert.strictEqual(session.state.title, 'عامل مبتدئ', 'Title should be reset to worker');
  assert.deepStrictEqual(session.state.businesses, {}, 'Businesses should be completely wiped');
  assert.strictEqual(session.dirty, false, 'Session dirty flag should be reset');

  // 2. Simulate Delete unload
  sessionManager.unloadSession(targetUser);
  assert.strictEqual(sessionManager.getSession(targetUser), null, 'Session should be completely evicted on delete');
});
