/**
 * Test Server-Authoritative Collection Flows:
 * 1. Trade Export Profit Claim -> Credited to Liquid Cash
 * 2. Airport Flight Arrival Claim -> Credited to Liquid Cash
 * 3. Immediate reconciliation and protection against premature/duplicate claims
 */

const assert = require('assert');
const test = require('node:test');

const TEST_PORT = 3999;
global.window = {
  location: { hostname: 'localhost' },
  SERVER_API_URL: `http://127.0.0.1:${TEST_PORT}`,
  addEventListener: () => {}
};

const app = require('../src/server');
const sessionManager = require('../src/services/session-manager');
const ServerBridge = require('../../server-client-bridge');

test('Authoritative Collection Flows (Trade & Airport to Cash)', async () => {
  await app.listen({ port: TEST_PORT, host: '127.0.0.1' });

  try {
    const testUser = 'collector_tester';
    const initialCash = 1000000;
    const initialBank = 500000;

    sessionManager.sessions.set(testUser.toLowerCase(), {
      username: testUser,
      pin: '1234',
      state: {
        username: testUser,
        cash: initialCash,
        bank: initialBank,
        xp: 100,
        netWorth: initialCash + initialBank,
        title: 'تاجر صاعد',
        tradeCompany: {
          warehouseCapacity: 20,
          warehouse: {},
          activeImports: [],
          activeExports: [],
          totalProfitEarned: 0,
          totalShipmentsCompleted: 0
        },
        airport: {
          unlocked: true,
          code: 'CAI',
          name: 'مطار القاهرة الدولي',
          fleet: [],
          facilities: { runway: 2, terminals: 1, hangar: 1, duty_free: 0 },
          claimedFlightIds: [],
          stats: { totalFlights: 0, totalRevenue: 0, totalNetProfit: 0 }
        }
      },
      dirty: false,
      lastActivity: Date.now()
    });

    // 1. Authenticate session
    const sess = await ServerBridge.startSession(testUser, '1234');
    assert.ok(sess, 'Session started');
    assert.strictEqual(ServerBridge.isServerOnline(), true);

    const userSession = sessionManager.sessions.get(testUser.toLowerCase());

    // ─────────────────────────────────────────────
    // 2. TRADE EXPORT CLAIM TEST
    // ─────────────────────────────────────────────
    const exportOrder = {
      id: 'exp_test_999',
      buyerId: 'buyer_1',
      buyerName: 'شركة النيل للشحن',
      commodityId: 'electronics',
      commodityName: 'إلكترونيات',
      quantity: 5,
      totalPayout: 250000,
      estProfit: 50000,
      startTime: Date.now() - 60000,
      deliveryTime: Date.now() - 1000, // already arrived
      delivered: true,
      claimed: false
    };
    userSession.state.tradeCompany.activeExports.push(exportOrder);

    // Call claimExportProfit via ServerBridge
    const claimRes = await ServerBridge.claimExportProfit('exp_test_999');
    assert.ok(claimRes, 'Claim response received');
    assert.strictEqual(claimRes.success, true);
    assert.strictEqual(claimRes.payout, 250000);
    assert.strictEqual(claimRes.profit, 50000);

    // Verify cash credited, bank untouched
    assert.strictEqual(userSession.state.cash, initialCash + 250000, 'Cash must increase by total payout');
    assert.strictEqual(userSession.state.bank, initialBank, 'Bank must remain unchanged');
    assert.strictEqual(userSession.state.tradeCompany.activeExports.length, 0, 'Export removed from active list');
    assert.strictEqual(userSession.state.tradeCompany.totalShipmentsCompleted, 1);
    assert.strictEqual(userSession.state.tradeCompany.totalProfitEarned, 50000);

    // Duplicate claim must be rejected
    let dupBlocked = false;
    try {
      await ServerBridge.claimExportProfit('exp_test_999');
    } catch (e) {
      dupBlocked = true;
    }
    assert.strictEqual(dupBlocked, true, 'Duplicate trade claim must throw error');

    // ─────────────────────────────────────────────
    // 3. AIRPORT FLIGHT CLAIM TEST
    // ─────────────────────────────────────────────
    const flightData = {
      flightId: 'flight_test_888',
      destinationId: 'dubai',
      destinationName: 'دبي DXB',
      grossRevenue: 80000,
      expectedProfit: 60000,
      netProfit: 60000,
      expectedNetProfit: 60000,
      totalOperatingCost: 20000,
      expectedXp: 50,
      takeoffTime: Date.now() - 60000,
      landingTime: Date.now() - 1000 // landed
    };
    const plane = {
      id: 'plane_test_1',
      modelId: 'cessna_vip',
      customName: 'سيسنا VIP #1',
      status: 'in_flight',
      tier: 1,
      totalFlights: 0,
      totalRevenue: 0,
      activeFlight: flightData,
      currentFlight: flightData
    };
    userSession.state.airport.fleet.push(plane);

    const airportClaimRes = await ServerBridge.claimAirportFlight('plane_test_1');
    assert.ok(airportClaimRes, 'Airport flight claim response received');
    assert.strictEqual(airportClaimRes.success, true);

    // Verify cash credited (gross revenue added to cash, operating costs were deducted on launch)
    const expectedCashAfterAirport = initialCash + 250000 + 80000;
    assert.strictEqual(userSession.state.cash, expectedCashAfterAirport, 'Cash must increase by flight profit');
    assert.strictEqual(userSession.state.bank, initialBank, 'Bank must still remain unchanged');
    assert.strictEqual(plane.status, 'idle', 'Plane must return to idle status');
    assert.strictEqual(plane.currentFlight, null, 'Current flight cleared');

    // Duplicate airport claim must be rejected
    let airportDupBlocked = false;
    try {
      await ServerBridge.claimAirportFlight('plane_test_1');
    } catch (e) {
      airportDupBlocked = true;
    }
    assert.strictEqual(airportDupBlocked, true, 'Duplicate airport flight claim must throw error');

  } finally {
    ServerBridge.clearSession();
    await app.close();
  }
});
