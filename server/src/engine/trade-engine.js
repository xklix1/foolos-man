/**
 * trade-engine.js
 * Authoritative Server Logic for Import & Export Company
 */

const { TRADE_COMMODITIES } = require('./definitions');
const { calculateNetWorth } = require('./net-worth-engine');

function ensureTradeState(state) {
  if (!state.tradeCompany || typeof state.tradeCompany !== 'object') {
    state.tradeCompany = {
      warehouseCapacity: 10,
      warehouse: {},
      activeImports: [],
      activeExports: [],
      totalProfitEarned: 0,
      totalShipmentsCompleted: 0
    };
  }
  const tc = state.tradeCompany;
  tc.warehouseCapacity = Math.min(50, Math.max(10, Number(tc.warehouseCapacity) || 10));
  if (!tc.warehouse || typeof tc.warehouse !== 'object') tc.warehouse = {};
  if (!Array.isArray(tc.activeImports)) tc.activeImports = [];
  if (!Array.isArray(tc.activeExports)) tc.activeExports = [];
  return tc;
}

function getTradeWarehouseOccupancy(tc, nowMs = Date.now()) {
  let stored = 0;
  Object.values(tc.warehouse).forEach(q => { stored += (Number(q) || 0); });
  let incoming = 0;
  tc.activeImports.forEach(imp => {
    if (!imp.arrived && nowMs < Number(imp.arrivalTime || 0)) {
      incoming += (Number(imp.quantity) || 0);
    }
  });
  return { stored, incoming, total: stored + incoming };
}

function buyImportCargo(state, commodityId, quantity = 1, serverNow = Date.now()) {
  if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك إدارة شحنات الاستيراد والتصدير.");
  const tc = ensureTradeState(state);
  const item = TRADE_COMMODITIES[commodityId];
  if (!item) throw new Error("البضاعة المطلوبة غير متوفرة في قائمة الاستيراد الدولي.");

  const qty = Math.max(1, Math.min(10, parseInt(quantity, 10) || 1));
  const occupancy = getTradeWarehouseOccupancy(tc, serverNow);
  const availableSlots = Math.max(0, tc.warehouseCapacity - occupancy.total);

  if (availableSlots < qty) {
    throw new Error(`سعة المستودع المتاحة حالياً (${availableSlots} حاوية) لا تكفي لاستيعاب ${qty} حاوية.`);
  }

  const baseCost = item.unitCost * qty;
  const customsFee = Math.floor(baseCost * 0.05);
  const totalCost = baseCost + customsFee;

  const totalFunds = (Number(state.cash) || 0) + (Number(state.bank) || 0);
  if (totalFunds < totalCost) {
    throw new Error(`سيولتك غير كافية لتمويل استيراد هذه الشحنة ورسوم الجمارك (5%). التكلفة: ${totalCost.toLocaleString()} EGP.`);
  }

  if ((Number(state.cash) || 0) >= totalCost) {
    state.cash -= totalCost;
  } else {
    const rem = totalCost - (Number(state.cash) || 0);
    state.cash = 0;
    state.bank -= rem;
  }

  const orderId = 'imp_' + serverNow + '_' + Math.random().toString(36).substring(2, 6);
  // Default duration 120s if not set
  const durationSec = item.importDurationSec || 120;
  const order = {
    id: orderId,
    commodityId,
    quantity: qty,
    unitCost: item.unitCost,
    baseCost,
    customsAndFreightFee: customsFee,
    totalCost,
    startTime: serverNow,
    arrivalTime: serverNow + (durationSec * 1000),
    durationSec,
    arrived: false
  };

  tc.activeImports.push(order);
  state.netWorth = calculateNetWorth(state);

  return {
    success: true,
    order,
    totalCost,
    cash: state.cash,
    bank: state.bank,
    netWorth: state.netWorth,
    tradeCompany: tc
  };
}

function upgradeWarehouse(state) {
  if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك توسعة المستودعات.");
  const tc = ensureTradeState(state);
  const capacity = tc.warehouseCapacity || 10;
  if (capacity >= 50) {
    throw new Error("وصل مستودع الشركة إلى أقصى طاقة استيعابية ممكنة (50 حاوية)!");
  }

  const cost = Math.floor(50000 * Math.pow(1.8, Math.max(0, (capacity - 10) / 10)));
  const totalFunds = (Number(state.cash) || 0) + (Number(state.bank) || 0);
  if (totalFunds < cost) {
    throw new Error(`تكلفة توسعة المستودع (+10 حاويات) هي ${cost.toLocaleString()} EGP. رصيدك غير كافٍ.`);
  }

  if ((Number(state.cash) || 0) >= cost) {
    state.cash -= cost;
  } else {
    const rem = cost - (Number(state.cash) || 0);
    state.cash = 0;
    state.bank -= rem;
  }

  tc.warehouseCapacity = Math.min(50, capacity + 10);
  state.netWorth = calculateNetWorth(state);

  return {
    success: true,
    newCapacity: tc.warehouseCapacity,
    cost,
    cash: state.cash,
    bank: state.bank,
    netWorth: state.netWorth,
    tradeCompany: tc
  };
}

module.exports = {
  ensureTradeState,
  buyImportCargo,
  upgradeWarehouse
};
