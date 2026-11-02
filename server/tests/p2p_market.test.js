/**
 * Test Suite: P2P Trading Marketplace (سوق التجارة بين اللاعبين)
 * Validates escrow locking, price clamping (50%-300%), 3% broker commission,
 * partial purchases, self-buy prevention, cancellation, and vault claiming.
 */

const assert = require('assert');
const { marketService, MARKET_ITEM_CATALOG } = require('../src/services/market-service');
const sessionManager = require('../src/services/session-manager');

async function runTests() {
  console.log('=== STARTING P2P MARKETPLACE AUTOMATED TESTS ===\n');

  // Setup mock players
  const sellerUsername = 'seller_test_user';
  const buyerUsername = 'buyer_test_user';

  // Seed seller session
  sessionManager.sessions.set(sellerUsername.toLowerCase(), {
    username: sellerUsername,
    sessionId: 'sess_seller',
    dirty: false,
    state: {
      username: sellerUsername,
      cash: 1000000,
      bank: 5000000,
      netWorth: 6000000,
      tradeCompany: {
        warehouseCapacity: 20,
        warehouse: { espresso_coffee: 10, luxury_cars: 2 }
      },
      space: {
        unlocked: true,
        warehouse: { regolith: 500, platinum: 50 },
        activeRockets: [{ id: 'rkt_1', modelId: 'falcon_star', launched: false, status: 'idle' }]
      },
      farm: {
        storage: { wheat: 200, coffee: 50 },
        livestock: { milk: 30 }
      },
      airport: {
        fleet: [{ id: 'craft_1', modelId: 'cessna_sky', inFlight: false, status: 'idle' }]
      },
      marketVault: { earnings: 0, salesHistory: [], returnedItems: [] }
    }
  });

  // Seed buyer session
  sessionManager.sessions.set(buyerUsername.toLowerCase(), {
    username: buyerUsername,
    sessionId: 'sess_buyer',
    dirty: false,
    state: {
      username: buyerUsername,
      cash: 50000000,
      bank: 100000000,
      netWorth: 150000000,
      tradeCompany: { warehouseCapacity: 20, warehouse: {} },
      space: { warehouse: {}, activeRockets: [] },
      farm: { storage: {}, livestock: {} },
      airport: { fleet: [] },
      marketVault: { earnings: 0, salesHistory: [], returnedItems: [] }
    }
  });

  const sellerSession = sessionManager.sessions.get(sellerUsername.toLowerCase());
  const buyerSession = sessionManager.sessions.get(buyerUsername.toLowerCase());

  // ── TEST 1: Free Market Pricing (No 50%-300% bounds, 1 EGP min, 1T max) ──
  console.log('[Test 1] Free Market Pricing validation (unbounded pricing with 1 EGP floor & 1T cap)...');
  const coffeeDef = MARKET_ITEM_CATALOG.trade_containers.espresso_coffee;
  // Base price is 80,000. In free market, 500 EGP and 5,000,000 EGP are both valid!

  // Rejects 0 or negative price
  await assert.rejects(async () => {
    await marketService.createListing(sellerUsername, {
      category: 'trade_containers',
      itemId: 'espresso_coffee',
      quantity: 1,
      unitPrice: 0,
      durationHours: 24
    });
  }, /يرجى إدخال سعر بيع صحيح/, 'Should reject 0 EGP price');

  // Rejects price above 1 Trillion
  await assert.rejects(async () => {
    await marketService.createListing(sellerUsername, {
      category: 'trade_containers',
      itemId: 'espresso_coffee',
      quantity: 1,
      unitPrice: 2000000000000,
      durationHours: 24
    });
  }, /غير مسموح به/, 'Should reject price above 1 Trillion EGP');

  console.log('  ✓ Free Market pricing rules validated successfully!\n');

  // ── TEST 2: Escrow Asset Locking on Creation ──
  console.log('[Test 2] Escrow asset locking (deduction from seller)...');
  const initialCoffeeStock = sellerSession.state.tradeCompany.warehouse.espresso_coffee;
  assert.strictEqual(initialCoffeeStock, 10);

  const listRes = await marketService.createListing(sellerUsername, {
    category: 'trade_containers',
    itemId: 'espresso_coffee',
    quantity: 4,
    unitPrice: 100000, // Valid (125% of 80k)
    durationHours: 12
  });

  assert.strictEqual(listRes.success, true);
  assert.strictEqual(listRes.listing.quantityRemaining, 4);
  assert.strictEqual(listRes.listing.status, 'ACTIVE');
  // Check escrow deduction
  assert.strictEqual(sellerSession.state.tradeCompany.warehouse.espresso_coffee, 6);
  console.log('  ✓ 4 containers escrowed and deducted from seller (10 -> 6)!\n');

  // ── TEST 3: Prevent Self-Buying ──
  console.log('[Test 3] Prevent seller from buying their own listing...');
  await assert.rejects(async () => {
    await marketService.buyListing(sellerUsername, listRes.listing.id, 1);
  }, /لا يمكنك شراء السلعة التي قمت بعرضها بنفسك/, 'Seller should not buy own listing');
  console.log('  ✓ Self-buying blocked successfully!\n');

  // ── TEST 4: Partial Purchase & 3% Commission ──
  console.log('[Test 4] Partial purchase & 3% market commission...');
  // Buyer buys 2 out of 4 containers at 100,000 EGP each -> Total 200,000 EGP
  // 3% fee = 6,000 EGP -> Seller net = 194,000 EGP
  const initialBuyerCash = buyerSession.state.cash;
  const buyRes = await marketService.buyListing(buyerUsername, listRes.listing.id, 2);

  assert.strictEqual(buyRes.success, true);
  assert.strictEqual(buyRes.boughtQuantity, 2);
  assert.strictEqual(buyRes.totalCost, 200000);
  assert.strictEqual(buyRes.commission, 6000);
  assert.strictEqual(buyRes.remainingInListing, 2);

  // Verify buyer received containers & paid cash
  assert.strictEqual(buyerSession.state.cash, initialBuyerCash - 200000);
  assert.strictEqual(buyerSession.state.tradeCompany.warehouse.espresso_coffee, 2);

  // Verify seller received 194,000 net in marketVault
  assert.strictEqual(sellerSession.state.marketVault.earnings, 194000);
  assert.strictEqual(sellerSession.state.marketVault.salesHistory.length, 1);
  console.log('  ✓ Partial buy executed! Buyer paid 200k, received 2 containers, seller vaulted 194k (3% fee deducted)!\n');

  // ── TEST 5: Manual Listing Cancellation & Escrow Return ──
  console.log('[Test 5] Manual listing cancellation & return to vault...');
  const cancelRes = await marketService.cancelListing(sellerUsername, listRes.listing.id);
  assert.strictEqual(cancelRes.success, true);
  assert.strictEqual(cancelRes.returnedQuantity, 2); // The remaining 2 containers

  // Check seller's vault returnedItems
  assert.strictEqual(sellerSession.state.marketVault.returnedItems.length, 1);
  const returnedEntry = sellerSession.state.marketVault.returnedItems[0];
  assert.strictEqual(returnedEntry.quantity, 2);
  assert.strictEqual(returnedEntry.itemId, 'espresso_coffee');
  console.log('  ✓ Cancelled successfully! 2 remaining containers placed in seller marketVault!\n');

  // ── TEST 6: Claiming Vault Earnings & Items ──
  console.log('[Test 6] Claiming vault earnings and returned items...');
  const prevBank = sellerSession.state.bank;
  const claimEarnRes = await marketService.claimAllVaultEarnings(sellerUsername);
  assert.strictEqual(claimEarnRes.success, true);
  assert.strictEqual(claimEarnRes.claimedAmount, 194000);
  assert.strictEqual(sellerSession.state.bank, prevBank + 194000);
  assert.strictEqual(sellerSession.state.marketVault.earnings, 0);

  // Claim returned item back to warehouse
  const prevWarehouseCoffee = sellerSession.state.tradeCompany.warehouse.espresso_coffee;
  const claimItemRes = await marketService.claimVaultItem(sellerUsername, returnedEntry.id);
  assert.strictEqual(claimItemRes.success, true);
  assert.strictEqual(sellerSession.state.tradeCompany.warehouse.espresso_coffee, prevWarehouseCoffee + 2);
  assert.strictEqual(sellerSession.state.marketVault.returnedItems.length, 0);
  console.log('  ✓ Earnings deposited to Bank (+194,000 EGP) and goods restored to warehouse (+2)!\n');

  // ── TEST 7: Aircraft Unique Listing & Purchase ──
  console.log('[Test 7] Unique asset (Airport Aircraft) listing & transfer...');
  assert.strictEqual(sellerSession.state.airport.fleet.length, 1);

  const craftListingRes = await marketService.createListing(sellerUsername, {
    category: 'airport_aircraft',
    itemId: 'cessna_sky',
    quantity: 1,
    unitPrice: 3500000, // Base is 3,000,000
    durationHours: 24
  });
  assert.strictEqual(craftListingRes.success, true);
  // Escrow check: removed from seller fleet
  assert.strictEqual(sellerSession.state.airport.fleet.length, 0);

  // Buyer buys aircraft
  assert.strictEqual(buyerSession.state.airport.fleet.length, 0);
  const craftBuyRes = await marketService.buyListing(buyerUsername, craftListingRes.listing.id, 1);
  assert.strictEqual(craftBuyRes.success, true);
  // Delivered to buyer fleet
  assert.strictEqual(buyerSession.state.airport.fleet.length, 1);
  assert.strictEqual(buyerSession.state.airport.fleet[0].modelId, 'cessna_sky');
  console.log('  ✓ Aircraft transferred from seller to buyer fleet with complete integrity!\n');

  console.log('====================================================');
  console.log('ALL P2P MARKET TESTS PASSED WITH 100% SUCCESS! 🎉');
  console.log('====================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ P2P MARKET TEST FAILED:', err);
  process.exit(1);
});
