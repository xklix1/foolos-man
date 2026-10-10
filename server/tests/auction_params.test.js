const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const auctionService = require('../src/services/auction-service');

describe('Live Auction Engine — Configuration & Numeric Parameter Robustness', () => {

  test('Creates auction with comma-formatted numbers ("50,000,000", "15,000,000")', () => {
    const res = auctionService.createAuction({
      item: {
        name: 'إطار تجريبي ملكي ',
        type: 'chat_frame'
      },
      config: {
        startingBid: '15,000,000',
        minNetWorth: '50,000,000',
        minBidStep: '2,000,000'
      },
      startDelayMinutes: 5
    });

    assert.equal(res.success, true);
    assert.equal(res.state.config.startingBid, 15000000);
    assert.equal(res.state.config.minNetWorth, 50000000);
    assert.equal(res.state.config.minBidStep, 2000000);
    assert.equal(res.state.live.currentBid, 15000000);
  });

  test('Creates auction with shorthand suffixes ("50M", "10M", "500k")', () => {
    const res = auctionService.createAuction({
      item: { name: 'شحنة ذهب ', type: 'gold' },
      config: {
        startingBid: '10M',
        minNetWorth: '50M',
        minBidStep: '500k'
      }
    });

    assert.equal(res.success, true);
    assert.equal(res.state.config.startingBid, 10000000);
    assert.equal(res.state.config.minNetWorth, 50000000);
    assert.equal(res.state.config.minBidStep, 500000);
  });

  test('Creates auction with Arabic digits (٥٠٠٠٠٠٠٠)', () => {
    const res = auctionService.createAuction({
      item: { name: 'تحفة أثرية ', type: 'museum_item' },
      config: {
        startingBid: '١٥٠٠٠٠٠٠',
        minNetWorth: '٥٠٠٠٠٠٠٠',
        minBidStep: '١٠٠٠٠٠٠'
      }
    });

    assert.equal(res.success, true);
    assert.equal(res.state.config.startingBid, 15000000);
    assert.equal(res.state.config.minNetWorth, 50000000);
    assert.equal(res.state.config.minBidStep, 1000000);
  });

  test('Creates auction with 0 minNetWorth (open for everyone)', () => {
    const res = auctionService.createAuction({
      item: { name: 'مزاد شعبي مفتوح', type: 'gold' },
      config: {
        startingBid: 1000000,
        minNetWorth: 0
      }
    });

    assert.equal(res.success, true);
    assert.equal(res.state.config.minNetWorth, 0);
    assert.equal(res.state.config.startingBid, 1000000);
  });

  test('Handles top-level parameter fallback (startPrice / startingBid outside config)', () => {
    const res = auctionService.createAuction({
      item: { name: 'طائرة نادرة', type: 'aircraft' },
      startPrice: 25000000,
      minNetWorth: 100000000,
      minStep: 2500000
    });

    assert.equal(res.success, true);
    assert.equal(res.state.config.startingBid, 25000000);
    assert.equal(res.state.config.minNetWorth, 100000000);
    assert.equal(res.state.config.minBidStep, 2500000);
  });
});
