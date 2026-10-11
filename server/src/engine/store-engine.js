/**
 * store-engine.js
 * Authoritative Server Logic for General Store, Black Market Gear & Police Bribes
 */

const { STORE_ITEMS, BLACK_MARKET_GEAR } = require('./definitions');
const { calculateNetWorth } = require('./net-worth-engine');

function getCairoTodayStr(serverNow = Date.now()) {
  const d = new Date(serverNow + (3 * 3600 * 1000));
  return d.toISOString().split('T')[0];
}

function ensureInventoryState(state, serverNow = Date.now()) {
  if (!state.inventory || typeof state.inventory !== 'object') state.inventory = {};
  if (!state.itemDurations || typeof state.itemDurations !== 'object') state.itemDurations = {};
  if (!state.itemCooldowns || typeof state.itemCooldowns !== 'object') state.itemCooldowns = {};

  const today = getCairoTodayStr(serverNow);
  if (!state.dailyToolUses || typeof state.dailyToolUses !== 'object' || state.dailyToolUses.date !== today) {
    state.dailyToolUses = { date: today, uses: {} };
  }
}

function buyStoreItem(state, itemId, serverNow = Date.now()) {
  const item = STORE_ITEMS[itemId];
  if (!item) throw new Error("الأداة المطلوبة غير متوفرة في المتجر.");

  ensureInventoryState(state, serverNow);

  const usedToday = state.dailyToolUses.uses[itemId] || 0;
  if (item.maxDailyUses && usedToday >= item.maxDailyUses) {
    throw new Error(`وصلت للحد الأقصى لاستخدام "${item.name}" اليوم (${item.maxDailyUses}/${item.maxDailyUses}).`);
  }

  const cooldownExpiry = Number(state.itemCooldowns[itemId]) || 0;
  if (serverNow < cooldownExpiry) {
    const remSec = Math.ceil((cooldownExpiry - serverNow) / 1000);
    throw new Error(`الأداة في فترة التبريد (كول داون). يمكنك شراؤها بعد ${remSec} ثانية.`);
  }

  const cash = Number(state.cash) || 0;
  if (cash < item.cost) {
    throw new Error(`سعر الأداة ${item.cost.toLocaleString()} EGP. رصيدك لا يكفي.`);
  }

  state.cash -= item.cost;
  state.inventory[itemId] = 1;
  state.itemDurations[itemId] = item.durationTicks;
  state.dailyToolUses.uses[itemId] = usedToday + 1;
  if (item.cooldownSec) {
    state.itemCooldowns[itemId] = serverNow + (item.cooldownSec * 1000);
  }

  state.netWorth = calculateNetWorth(state);

  return {
    success: true,
    itemId,
    cost: item.cost,
    inventory: state.inventory,
    itemDurations: state.itemDurations,
    cash: state.cash,
    netWorth: state.netWorth
  };
}

function buyBlackMarketGear(state, gearId, serverNow = Date.now()) {
  if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يمكنك شراء معدات السوق السوداء.");
  const item = BLACK_MARKET_GEAR[gearId];
  if (!item) throw new Error("المعدة غير متوفرة في السوق السوداء.");

  ensureInventoryState(state, serverNow);

  const dirty = Number(state.dirtyCash) || 0;
  const cash = Number(state.cash) || 0;
  const total = dirty + cash;
  if (total < item.cost) {
    throw new Error(`سعر المعدة ${item.cost.toLocaleString()} جنيه. رصيدك لا يكفي.`);
  }

  if (dirty >= item.cost) {
    state.dirtyCash -= item.cost;
  } else {
    const rem = item.cost - dirty;
    state.dirtyCash = 0;
    state.cash -= rem;
  }

  state.inventory[gearId] = (state.inventory[gearId] || 0) + 1;
  state.itemDurations[gearId] = item.durationTicks;

  state.netWorth = calculateNetWorth(state);

  return {
    success: true,
    gearId,
    cost: item.cost,
    inventory: state.inventory,
    dirtyCash: state.dirtyCash,
    cash: state.cash,
    netWorth: state.netWorth
  };
}

function bribePolice(state) {
  const jail = Number(state.jailTimer) || 0;
  const heat = Number(state.heatLevel) || 0;
  if (jail <= 0 && heat <= 0) {
    throw new Error("سجلك نظيف حالياً ولا توجد ملاحقات أمنية أو أحكام سجن عليك!");
  }

  const cash = Number(state.cash) || 0;
  const dirty = Number(state.dirtyCash) || 0;
  const bribeCost = Math.max(15000, Math.floor(cash * 0.15) + (jail * 1000));

  const total = dirty + cash;
  if (total < bribeCost) {
    throw new Error(`تكلفة الرشوة والوساطة ${bribeCost.toLocaleString()} EGP. رصيدك لا يكفي!`);
  }

  if (dirty >= bribeCost) {
    state.dirtyCash -= bribeCost;
  } else {
    const rem = bribeCost - dirty;
    state.dirtyCash = 0;
    state.cash -= rem;
  }

  state.jailTimer = 0;
  state.heatLevel = 0;
  state.raidActive = false;

  state.netWorth = calculateNetWorth(state);

  return {
    success: true,
    bribeCost,
    jailTimer: 0,
    heatLevel: 0,
    dirtyCash: state.dirtyCash,
    cash: state.cash,
    netWorth: state.netWorth
  };
}

module.exports = {
  buyStoreItem,
  buyBlackMarketGear,
  bribePolice
};
