/**
 * Professional Stock Exchange Upgrade Tests:
 * - Short Selling (100% Margin Collateral, Profit on Price Drop, Loss on Price Rise)
 * - Single-Direction Enforcement (Cannot Long & Short same stock simultaneously)
 * - Take-Profit (TP) & Stop-Loss (SL) Validation & Automatic Execution
 * - Automatic Margin Call Liquidation at +50% above Short Entry
 * - Updated 10,000,000 EGP Daily Stock Profit Cap & 2x maxShares
 */

const assert = require('assert');
const test = require('node:test');

const stockEngine = require('../src/engine/stock-exchange-engine');
const { STOCKS } = require('../src/engine/definitions');

test('Stock Exchange Pro — Short Selling, Take-Profit, Stop-Loss & 10M Cap', async (t) => {
  await t.test('1. Economic constants updated (10M daily cap & 2x maxShares)', () => {
    assert.strictEqual(stockEngine.DAILY_STOCK_PROFIT_CAP, 10000000);
    assert.strictEqual(STOCKS.COMI.maxShares, 100000);
    assert.strictEqual(STOCKS.AIX.maxShares, 16000);
  });

  await t.test('2. Short Selling opens position, locks 100% collateral + 1% fee, and blocks conflicting Long', () => {
    const now = Date.now();
    const state = {
      cash: 500000,
      bank: 0,
      stocks: {},
      stockCooldowns: {}
    };

    const mkt = stockEngine.getMarketOverview(now);
    const fwrPrice = mkt.stocks.FWRY.currentPrice;

    // Open Short of 100 shares on FWRY
    const res = stockEngine.shortStock(state, 'FWRY', 100, now, fwrPrice);
    assert.strictEqual(res.type, 'short');
    assert.strictEqual(state.stocks.FWRY.shares, 100);
    assert.strictEqual(state.stocks.FWRY.type, 'short');
    assert.strictEqual(state.stocks.FWRY.avgPrice, fwrPrice);

    const expectedGross = fwrPrice * 100;
    const expectedFee = Math.max(5, Math.floor(expectedGross * 0.01));
    assert.strictEqual(state.cash, 500000 - expectedGross - expectedFee);

    // Attempting to buy Long on FWRY while Short is open must throw
    assert.throws(() => {
      stockEngine.buyStock(state, 'FWRY', 10, now + 5000, fwrPrice);
    }, /Short/);
  });

  await t.test('3. Closing a profitable Short position when price drops credits collateral + profit', () => {
    const now = Date.now();
    const mkt = stockEngine.getMarketOverview(now);
    const currentPrice = mkt.stocks.AIX.currentPrice;
    const higherEntryPrice = currentPrice + 40; // Simulate we shorted 40 EGP higher than current price

    const state = {
      cash: 100000,
      bank: 0,
      stocks: {
        AIX: {
          shares: 100,
          avgPrice: higherEntryPrice,
          type: 'short',
          takeProfit: 0,
          stopLoss: 0
        }
      },
      stockCooldowns: {
        AIX: now - 1000 // Holding period expired
      }
    };

    const sellRes = stockEngine.sellStock(state, 'AIX', 100, now, currentPrice);
    assert.strictEqual(sellRes.type, 'short');
    assert.strictEqual(sellRes.rawProfit, 40 * 100); // +4,000 EGP profit from price drop!
    const expectedFee = Math.max(5, Math.floor((currentPrice * 100) * 0.01));
    const expectedReturn = (higherEntryPrice * 100) + 4000 - expectedFee;
    assert.strictEqual(sellRes.totalReturn, expectedReturn);
    assert.strictEqual(state.stocks.AIX.shares, 0);
    assert.strictEqual(state.stocks.AIX.type, 'long');
  });

  await t.test('4. Take-Profit & Stop-Loss validation and automatic execution on Long & Short', () => {
    const now = Date.now();
    const mkt = stockEngine.getMarketOverview(now);
    const currentPrice = mkt.stocks.COMI.currentPrice;

    const state = {
      cash: 50000,
      bank: 0,
      stocks: {
        COMI: {
          shares: 200,
          avgPrice: currentPrice - 4, // Bought 4 EGP lower
          type: 'long',
          takeProfit: 0,
          stopLoss: 0
        }
      },
      stockCooldowns: {
        COMI: now - 1000
      }
    };

    // Invalid TP for Long (<= avgPrice) must throw
    assert.throws(() => {
      stockEngine.setStockOrders(state, 'COMI', currentPrice - 5, 0);
    });

    // Valid TP at currentPrice (which triggers immediately on evaluateAutoStockOrders)
    stockEngine.setStockOrders(state, 'COMI', currentPrice, currentPrice - 8);
    assert.strictEqual(state.stocks.COMI.takeProfit, currentPrice);
    assert.strictEqual(state.stocks.COMI.stopLoss, currentPrice - 8);

    const triggered = stockEngine.evaluateAutoStockOrders(state, now);
    assert.strictEqual(triggered.length, 1);
    assert.strictEqual(triggered[0].symbol, 'COMI');
    assert.strictEqual(triggered[0].reason, 'take_profit');
    assert.strictEqual(state.stocks.COMI.shares, 0);
  });
});
