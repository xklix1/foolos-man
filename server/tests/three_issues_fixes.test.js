const assert = require('assert');
const test = require('node:test');

const sessionManager = require('../src/services/session-manager');
const stockEngine = require('../src/engine/stock-exchange-engine');

test('Verification of Three Issues Fixes', async (t) => {
  const username = 'fix_verification_user';
  const uKey = username.toLowerCase();

  const cairoToday = (() => {
    const d = new Date(Date.now() + (3 * 3600 * 1000));
    return d.toISOString().split('T')[0];
  })();

  // Setup session
  sessionManager.sessions.set(uKey, {
    username,
    pin: '1234',
    sessionToken: 'tok_fix_verification',
    state: {
      username,
      cash: 5000000,
      bank: 10000000,
      netWorth: 15000000,
      stocks: {},
      stockTradeCooldownUntil: 0,
      dailyStockProfit: { date: cairoToday, realizedProfit: 250000 },
      farm: {
        dailyLiquidation: { date: cairoToday, totalLiquidated: 1500000 }
      },
      businesses: {
        kiosk: { level: 2, workers: 2, suppliesTicks: 7200 }
      },
      adminModifiedTimestamp: 0
    },
    dirty: false,
    lastSyncTime: Date.now() - 2000
  });

  const session = sessionManager.getSession(username);

  await t.test('Fix 1: Limits reset is consumed on first sync and does not loop or wipe counters', async () => {
    // Admin triggers a reset timestamp
    session.state.limitsResetAt = Date.now();

    // First sync should consume it and reset
    await sessionManager.updateSessionState(username, {
      username,
      cash: 5000000,
      bank: 10000000,
      lastLimitsResetAck: 0
    });

    assert.strictEqual(session.state.dailyStockProfit.realizedProfit, 0, 'Realized profit reset on first sync');
    assert.strictEqual(session.state.limitsResetAt, 0, 'limitsResetAt must be consumed and cleared to 0');
    assert.ok(session.state.lastLimitsResetAck > 0, 'lastLimitsResetAck must be recorded');

    // Simulate subsequent profit earned in stock market
    session.state.dailyStockProfit.realizedProfit = 100000;
    session.state.farm.dailyLiquidation.totalLiquidated = 500000;

    // Subsequent sync without ack should NOT reset again because limitsResetAt is 0!
    await sessionManager.updateSessionState(username, {
      username,
      cash: 5000000,
      bank: 10000000,
      dailyStockProfit: { date: cairoToday, realizedProfit: 100000 },
      farm: { dailyLiquidation: { date: cairoToday, totalLiquidated: 500000 } }
    });

    assert.strictEqual(session.state.dailyStockProfit.realizedProfit, 100000, 'Subsequent sync must NOT wipe dailyStockProfit!');
    assert.strictEqual(session.state.farm.dailyLiquidation.totalLiquidated, 500000, 'Subsequent sync must NOT wipe farm dailyLiquidation!');
  });

  await t.test('Fix 2: Stock purchase deducts cash and stale client sync cannot roll it back', async () => {
    session.state.cash = 2000000; // 2M
    const initialCash = session.state.cash;

    // Simulate stock purchase on server
    const buyRes = stockEngine.buyStock(session.state, 'COMI', 10, Date.now(), 80);
    assert.ok(session.state.cash < initialCash, 'Cash must be deducted on stock buy');
    const cashAfterBuy = session.state.cash;

    // Set spend timestamps like route does
    session.lastServerBankActionAt = Date.now();
    session.lastServerCashSpendAt = Date.now();

    // Now simulate in-flight stale client sync arriving with old pre-purchase cash (2,000,000)
    await sessionManager.updateSessionState(username, {
      username,
      cash: 2000000, // Stale higher cash
      bank: 10000000
    });

    // Authoritative server cash must NOT be overwritten!
    assert.strictEqual(session.state.cash, cashAfterBuy, 'Authoritative server cash must NOT roll back to stale client cash!');
  });

  await t.test('Fix 3: Business suppliesTicks are safely preserved and not wiped on sync', async () => {
    session.state.businesses.kiosk.suppliesTicks = 1800; // Server had 30 mins

    // Client supplied +1 hour (3600 + 1800 = 5400)
    await sessionManager.updateSessionState(username, {
      username,
      cash: session.state.cash,
      bank: session.state.bank,
      businesses: {
        kiosk: { level: 2, workers: 2, suppliesTicks: 5400 }
      }
    });

    assert.strictEqual(session.state.businesses.kiosk.suppliesTicks, 5400, 'Client supplied ticks must be merged and preserved');
  });

  await t.test('Fix 4: Khaled account farm liquidation counter works with unlimited cap', async () => {
    const khaledUser = 'khaled';
    const khaledKey = khaledUser.toLowerCase();

    sessionManager.sessions.set(khaledKey, {
      username: khaledUser,
      pin: '1234',
      sessionToken: 'tok_khaled',
      state: {
        username: khaledUser,
        cash: 100000000,
        bank: 500000000,
        netWorth: 600000000,
        farm: {
          dailyLiquidation: { date: cairoToday, totalLiquidated: 50000000 } // 50M (above normal 20M cap)
        }
      },
      dirty: false,
      lastSyncTime: Date.now()
    });

    await sessionManager.updateSessionState(khaledUser, {
      username: khaledUser,
      cash: 100000000,
      bank: 500000000,
      farm: {
        dailyLiquidation: { date: cairoToday, totalLiquidated: 50000000 }
      }
    });

    const khaledState = sessionManager.getSession(khaledUser).state;
    assert.strictEqual(khaledState.farm.dailyLiquidation.totalLiquidated, 50000000, 'Khaled farm liquidation must preserve actual high amount');
  });
});
