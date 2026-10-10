/**
 * Ras ALmal Tycoon — Server-Authoritative Real Estate & Luxury Cars Engine
 */

const { ASSETS, CAR_TEMPLATES } = require('./definitions');
const { calculateNetWorth, getAppropriateTitle } = require('./net-worth-engine');

function buyProperty(state, assetId) {
  const asset = ASSETS[assetId];
  if (!asset) throw new Error('العقار غير متوفر في السوق.');
  const cost = Number(asset.cost || 0);
  if ((Number(state.cash) || 0) < cost) {
    throw new Error(`رصيدك غير كافٍ. تحتاج: ${cost.toLocaleString()} ج.م.`);
  }

  state.cash -= cost;
  if (!state.assets) state.assets = {};
  state.assets[assetId] = (Number(state.assets[assetId]) || 0) + 1;

  state.netWorth = calculateNetWorth(state);
  state.title = getAppropriateTitle(state.netWorth, state.xp || 0);

  return {
    asset,
    newCount: state.assets[assetId],
    cost,
    cash: state.cash,
    netWorth: state.netWorth
  };
}

function sellProperty(state, assetId) {
  const asset = ASSETS[assetId];
  if (!asset) throw new Error('العقار غير متوفر.');
  if (!state.assets) state.assets = {};
  const count = Number(state.assets[assetId] || 0);
  if (count <= 0) throw new Error('لا تمتلك أي عقار من هذا النوع لبيعه.');

  const sellValue = Math.floor(asset.cost * 0.85); // 15% liquidation loss
  state.assets[assetId] = count - 1;
  state.cash = (Number(state.cash) || 0) + sellValue;

  state.netWorth = calculateNetWorth(state);
  state.title = getAppropriateTitle(state.netWorth, state.xp || 0);

  return {
    asset,
    remainingCount: state.assets[assetId],
    sellValue,
    cash: state.cash,
    netWorth: state.netWorth
  };
}

function buyCar(state, carId) {
  const car = CAR_TEMPLATES[carId];
  if (!car) throw new Error('طراز السيارة غير متوفر.');
  const cost = Number(car.cost || 0);
  const totalFunds = (Number(state.cash) || 0) + (Number(state.bank) || 0);
  if (totalFunds < cost) {
    throw new Error('لا تملك سيولة كافية لشراء هذه السيارة الفاخرة.');
  }

  if ((Number(state.cash) || 0) >= cost) {
    state.cash -= cost;
  } else {
    const rem = cost - (Number(state.cash) || 0);
    state.cash = 0;
    state.bank = Math.max(0, (Number(state.bank) || 0) - rem);
  }

  if (!Array.isArray(state.ownedCars)) state.ownedCars = [];
  state.ownedCars.push({ id: carId, rentStatus: 'idle' });

  state.netWorth = calculateNetWorth(state);
  state.title = getAppropriateTitle(state.netWorth, state.xp || 0);

  return {
    car,
    ownedCars: state.ownedCars,
    cost,
    cash: state.cash,
    bank: state.bank,
    netWorth: state.netWorth
  };
}

function sellCar(state, carId, carIndex = -1) {
  const car = CAR_TEMPLATES[carId];
  if (!car) throw new Error('طراز السيارة غير صالح.');
  if (!Array.isArray(state.ownedCars)) state.ownedCars = [];

  let idx = carIndex;
  if (idx === -1) {
    idx = state.ownedCars.findIndex(c => c.id === carId);
  }
  if (idx === -1 || idx >= state.ownedCars.length) {
    throw new Error('لا تملك هذه السيارة لبيعها.');
  }

  if (state.ownedCars[idx].rentStatus === 'rented') {
    throw new Error('السيارة مؤجرة! يجب إلغاء تأجيرها أولاً قبل البيع.');
  }

  if (state.activeCar === carId) {
    state.activeCar = null;
  }

  const sellPrice = Math.floor(car.cost * 0.75); // 75% resale value
  state.ownedCars.splice(idx, 1);
  state.bank = (Number(state.bank) || 0) + sellPrice;

  state.netWorth = calculateNetWorth(state);
  state.title = getAppropriateTitle(state.netWorth, state.xp || 0);

  return {
    car,
    sellPrice,
    ownedCars: state.ownedCars,
    bank: state.bank,
    netWorth: state.netWorth
  };
}

function setActiveCar(state, carId) {
  if (carId === null) {
    state.activeCar = null;
  } else {
    if (!Array.isArray(state.ownedCars)) state.ownedCars = [];
    const idx = state.ownedCars.findIndex(c => c.id === carId);
    if (idx === -1) throw new Error('لا تملك هذه السيارة لتفعيلها.');
    if (state.ownedCars[idx].rentStatus === 'rented') {
      throw new Error('السيارة مؤجرة حالياً! لا يمكنك قيادتها.');
    }
    state.activeCar = carId;
  }

  state.netWorth = calculateNetWorth(state);
  return {
    activeCar: state.activeCar,
    netWorth: state.netWorth
  };
}

function rentCar(state, carId, rentStatus, carIndex = -1) {
  if (!Array.isArray(state.ownedCars)) state.ownedCars = [];
  let idx = carIndex;
  if (idx === -1) {
    idx = state.ownedCars.findIndex(c => c.id === carId);
  }
  if (idx === -1 || idx >= state.ownedCars.length) {
    throw new Error('لا تملك هذه السيارة لتأجيرها.');
  }

  if (rentStatus === 'rented') {
    if (state.activeCar === carId) {
      state.activeCar = null;
    }
    state.ownedCars[idx].rentStatus = 'rented';
  } else {
    state.ownedCars[idx].rentStatus = 'idle';
  }

  state.netWorth = calculateNetWorth(state);
  return {
    ownedCars: state.ownedCars,
    rentStatus: state.ownedCars[idx].rentStatus,
    netWorth: state.netWorth
  };
}

module.exports = {
  buyProperty,
  sellProperty,
  buyCar,
  sellCar,
  setActiveCar,
  rentCar
};
