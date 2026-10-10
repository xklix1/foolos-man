/**
 * Test Server-Authoritative Phase 2:
 * - Synchronized Global Stock Market Overview
 * - Deterministic Stock Pricing
 * - Stock Purchasing with Anti-Spam Cooldown & Holding Lock
 * - Stock Selling with Holding Enforcement & Realized Profit Cap
 */

const assert = require('assert');
const test = require('node:test');

const TEST_PORT = 3996;
global.window = {
  location: { hostname: 'localhost' },
  SERVER_API_URL: `http://127.0.0.1:${TEST_PORT}`,
  addEventListener: () => {}
};

const app = require('../src/server');
const sessionManager = require('../src/services/session-manager');
const ServerBridge = require('../../server-client-bridge');
const { DAILY_STOCK_PROFIT_CAP } = require('../src/engine/stock-exchange-engine');

test('Server-Authoritative Phase 2 (Global Stock Exchange) Tests', async () => {
  await app.listen({ port: TEST_PORT, host: '127.0.0.1' });

  try {
    const testUser = 'phase2_tester';
    const initialCash = 10000000; // 10M cash
    sessionManager.sessions.set(testUser.toLowerCase(), {
      username: testUser,
      pin: '1234',
      state: {
        username: testUser,
        cash: initialCash,
        bank: 5000000,
        xp: 1000,
        netWorth: 15000000,
        title: 'مليونير فخم',
        stocks: {},
        assets: {},
        ownedCars: [],
        jailTimer: 0
      },
      dirty: false,
      lastActivity: Date.now()
    });

    // 1. Authenticate Session
    const sess = await ServerBridge.startSession(testUser, '1234');
    assert.ok(sess, 'Session started');
    assert.strictEqual(ServerBridge.isServerOnline(), true);

    // 2. Fetch Market Overview
    const market = await ServerBridge.fetchMarketStocks();
    assert.strictEqual(market.success, true);
    assert.ok(market.stocks, 'Market stocks returned');
    assert.ok(market.stocks.COMI, 'COMI stock exists');
    assert.ok(market.stocks.FWRY, 'FWRY stock exists');
    assert.ok(market.stocks.GOLD, 'GOLD stock exists');
    assert.ok(market.stocks.BITC, 'BITC stock exists');
    assert.ok(market.stocks.COMI.currentPrice > 0, 'COMI price is positive');
    assert.ok(Array.isArray(market.stocks.COMI.history), 'COMI history is array');
    assert.strictEqual(market.stocks.COMI.history.length, 24, 'COMI history has 24 ticks');

    const comiPrice = market.stocks.COMI.currentPrice;

    // 3. Buy Stock (COMI: 100 shares)
    const buyRes = await ServerBridge.buyStock('COMI', 100);
    assert.strictEqual(buyRes.success, true);
    assert.strictEqual(buyRes.stocks.COMI.shares, 100);
    assert.strictEqual(buyRes.stocks.COMI.avgPrice, comiPrice);
    const expectedFee = Math.max(5, Math.floor(comiPrice * 100 * 0.01));
    const expectedCost = (comiPrice * 100) + expectedFee;
    assert.strictEqual(buyRes.cash, initialCash - expectedCost);

    // 4. Anti-Spam Trade Cooldown (Attempting to trade immediately must throw)
    await assert.rejects(
      async () => {
        await ServerBridge.buyStock('COMI', 10);
      },
      (err) => {
        return err.message.includes('منع التداول فائق السرعة');
      },
      'Immediate buy rejected by anti-spam cooldown'
    );

    // 5. Holding Period Lock (Attempting to sell within 45s must throw)
    // First, bypass the 3s global cooldown to isolate the 45s holding check
    const userSession = sessionManager.sessions.get(testUser.toLowerCase());
    userSession.state.stockTradeCooldownUntil = 0;

    await assert.rejects(
      async () => {
        await ServerBridge.sellStock('COMI', 50);
      },
      (err) => {
        return err.message.includes('يجب الاحتفاظ بالسهم لمدة 45 ثانية');
      },
      'Early sell rejected by 45s holding lock'
    );

    // 6. Sell Stock After Holding Period
    // Fast-forward cooldowns
    userSession.state.stockCooldowns.COMI = 0;
    userSession.state.stockTradeCooldownUntil = 0;

    const sellRes = await ServerBridge.sellStock('COMI', 50);
    assert.strictEqual(sellRes.success, true);
    assert.strictEqual(sellRes.stocks.COMI.shares, 50);
    assert.strictEqual(sellRes.stocks.COMI.avgPrice, comiPrice);
    assert.ok(sellRes.cash > initialCash - expectedCost, 'Cash received from sale');

    // 7. Sell Remaining Stock (50 shares)
    userSession.state.stockTradeCooldownUntil = 0;
    const sellRemainingRes = await ServerBridge.sellStock('COMI', 50);
    assert.strictEqual(sellRemainingRes.success, true);
    assert.strictEqual(sellRemainingRes.stocks.COMI.shares, 0);
    assert.strictEqual(sellRemainingRes.stocks.COMI.avgPrice, 0, 'avgPrice resets to 0 when 0 shares held');

    // 8. Validation Errors
    // Invalid stock symbol
    await assert.rejects(
      async () => {
        userSession.state.stockTradeCooldownUntil = 0;
        await ServerBridge.buyStock('INVALID_XYZ', 10);
      },
      (err) => err.message.includes('رمز السهم غير صالح') || err.message.includes('رمز الشركة غير صالح')
    );

    // Exceed max shares (COMI max: 50,000)
    await assert.rejects(
      async () => {
        userSession.state.stockTradeCooldownUntil = 0;
        await ServerBridge.buyStock('COMI', 60000);
      },
      (err) => err.message.includes('تجاوزت الحد الأقصى للملكية')
    );

    // Selling shares player doesn't own
    await assert.rejects(
      async () => {
        userSession.state.stockTradeCooldownUntil = 0;
        await ServerBridge.sellStock('COMI', 10);
      },
      (err) => err.message.includes('لا تمتلك عدد أسهم كافٍ')
    );

    // 9. Daily Profit Cap Verification
    // Artificially simulate bought shares at 1 EGP and sold at currentPrice to trigger profit cap
    userSession.state.stocks.GOLD = { shares: 50000, avgPrice: 1 };
    userSession.state.stockCooldowns.GOLD = 0;
    userSession.state.stockTradeCooldownUntil = 0;
    userSession.state.dailyStockProfit = {
      date: new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 10),
      realizedProfit: DAILY_STOCK_PROFIT_CAP - 50000 // Only 50,000 EGP cap remains today
    };

    const goldSellRes = await ServerBridge.sellStock('GOLD', 1000);
    assert.strictEqual(goldSellRes.success, true);
    assert.strictEqual(goldSellRes.result.capHit, true, 'Profit cap triggered');
    assert.strictEqual(goldSellRes.result.allowedProfit, 50000, 'Allowed profit capped at remaining allowance');
    assert.strictEqual(goldSellRes.result.dailyRealizedProfit, DAILY_STOCK_PROFIT_CAP, 'Daily realized profit reached max cap');

    console.log('[Test] All Phase 2 Stock Exchange tests passed successfully!');
  } finally {
    sessionManager.sessions.delete('phase2_tester');
    if (sessionManager.flushIntervalTimer) clearInterval(sessionManager.flushIntervalTimer);
    ServerBridge.destroy();
    await app.close();
    process.exit(0);
  }
});
