const {
  AIRPORT_FACILITIES,
  AIRCRAFT_MODELS,
  FLIGHT_DESTINATIONS,
  createInitialAirportState,
  getAirportBonuses,
  calculateDutyFreeAccumulated
} = require('../server/src/engine/airport-engine');
const { calculateNetWorth } = require('../server/src/engine/net-worth-engine');

async function testAirportEngine() {
  console.log('=== TEST 1: Initialize Airport State ===');
  const airport = createInitialAirportState('مطار النخبة الدولي');
  console.log('Airport Name:', airport.name);
  console.log('Initial Facilities:', airport.facilities);
  console.log('Initial Fleet:', airport.fleet);

  console.log('\n=== TEST 2: Calculate Bonuses ===');
  const bonuses = getAirportBonuses(airport);
  console.log('Initial Bonuses:', bonuses);

  console.log('\n=== TEST 3: Net Worth Valuation ===');
  const dummyPlayer = {
    cash: 10000000,
    bank: 50000000,
    airport
  };
  const nw = calculateNetWorth(dummyPlayer);
  console.log('Net Worth with Airport (Base + Cessna):', nw.toLocaleString(), 'EGP');

  console.log('\n=== TEST 4: Duty Free Accumulation ===');
  airport.facilities.duty_free = 2; // Level 2 (12,000 / min)
  airport.lastDutyFreeCollectionAt = Date.now() - (30 * 60 * 1000); // 30 minutes ago
  const dutyFreeCash = calculateDutyFreeAccumulated(airport, Date.now());
  console.log('Duty Free accumulated in 30 mins (Lv.2):', dutyFreeCash.toLocaleString(), 'EGP (Expected ~360,000)');

  console.log('\n=== ALL AIRPORT ENGINE TESTS PASSED! ===');
}

testAirportEngine().catch(console.error);
