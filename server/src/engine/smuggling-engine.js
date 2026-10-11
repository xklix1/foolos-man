/**
 * smuggling-engine.js
 * Authoritative Server Logic for Smuggling Fleet Purchase
 */

const { SMUGGLING_VEHICLES } = require('./definitions');
const { calculateNetWorth } = require('./net-worth-engine');

function buySmugglingVehicle(state, vehicleId) {
  const v = SMUGGLING_VEHICLES[vehicleId];
  if (!v) throw new Error("مركبة التهريب غير موجودة.");

  if (!state.smugglingFleet || typeof state.smugglingFleet !== 'object') {
    state.smugglingFleet = {};
  }

  if (state.smugglingFleet[vehicleId]) {
    throw new Error("أنت تمتلك هذه المركبة بالفعل في أسطولك.");
  }

  const cash = Number(state.cash) || 0;
  const bank = Number(state.bank) || 0;
  const total = cash + bank;
  if (total < v.cost) {
    throw new Error("لا تملك أموالاً كافية لشراء مركبة التهريب هذه.");
  }

  if (cash >= v.cost) {
    state.cash -= v.cost;
  } else {
    const rem = v.cost - cash;
    state.cash = 0;
    state.bank -= rem;
  }

  state.smugglingFleet[vehicleId] = 1;
  state.netWorth = calculateNetWorth(state);

  return {
    success: true,
    vehicleId,
    cost: v.cost,
    smugglingFleet: state.smugglingFleet,
    cash: state.cash,
    bank: state.bank,
    netWorth: state.netWorth
  };
}

module.exports = {
  buySmugglingVehicle
};
