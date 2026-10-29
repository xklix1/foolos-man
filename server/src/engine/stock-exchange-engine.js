/**
 * Ras ALmal Tycoon — Global Shared Stock Exchange Engine
 * 100% Server-Authoritative Global Stock Market
 * Generates identical, synchronized market prices across all players and strictly validates trades.
 */

const { STOCKS } = require('./definitions');
const { calculateNetWorth, getAppropriateTitle } = require('./net-worth-engine');

const STOCK_TICK_INTERVAL_MS = 30 * 1000; // 30-second synchronized candlesticks
const DAILY_STOCK_PROFIT_CAP = 10000000; // 10M EGP cap per calendar day

const UNIFIED_SCHEDULED_EVENTS = [
  {
    title: 'السوق مستقر وتداولات اعتيادية متزنة بين المتعاملين في البورصة المصرية...',
    targets: {}
  },
  {
    title: 'موجة شراء مؤسسية تقفز بسهم فوري FWRY وصندوق الذكاء الاصطناعي AIX!',
    targets: { FWRY: 1.12, AIX: 1.10 }
  },
  {
    title: 'إقبال قياسي على الذهب كملاذ آمن: صعود ملحوظ لسهم GOLD وصندوق CASH!',
    targets: { GOLD: 1.12, CASH: 1.08 }
  },
  {
    title: 'البنك المركزي يحرك الفائدة: انتعاش سهم البنك التجاري COMI وتصحيح طفيف!',
    targets: { COMI: 1.12, CASH: 1.06, EAST: 0.95 }
  },
  {
    title: 'المصرية للاتصالات ETEL تفوز بتراخيص الجيل الخامس: نشاط إيجابي للسهم!',
    targets: { ETEL: 1.12 }
  },
  {
    title: 'جني أرباح وتصحيح فني هادئ في سوق العملات الرقمية والبيتكوين BITC!',
    targets: { BITC: 0.90, AIX: 0.95 }
  },
  {
    title: 'انتظام سلاسل التوريد ووصول شحنات المواد الخام يدعم الشرقية للدخان EAST!',
    targets: { EAST: 1.10 }
  },
  {
    title: 'تفاؤل استثماري وصعود جماعي لمؤشرات الأسهم بقيادة CIB والمدفوعات!',
    targets: { COMI: 1.08, FWRY: 1.08, ETEL: 1.06, EAST: 1.06, AIX: 1.07 }
  },
  {
    title: 'ضغوط بيعية مؤقتة في قطاع التكنولوجيا تتيح فرص دخول جاذبة للمستثمرين!',
    targets: { FWRY: 0.92, CASH: 0.93 }
  }
];

let globalCustomMarketEvent = null;

function setCustomMarketEvent(event) {
  globalCustomMarketEvent = event;
}

function getUnifiedStockTick(serverNow = Date.now()) {
  return Math.floor(serverNow / STOCK_TICK_INTERVAL_MS);
}

function getStockSessionTimeRemaining(serverNow = Date.now()) {
  return Math.max(0, STOCK_TICK_INTERVAL_MS - (serverNow % STOCK_TICK_INTERVAL_MS));
}

function getCurrentMarketEvent(serverNow = Date.now()) {
  if (globalCustomMarketEvent && (!globalCustomMarketEvent.expiresAt || serverNow < globalCustomMarketEvent.expiresAt)) {
    return globalCustomMarketEvent;
  }
  const EVENT_CYCLE_MS = 4 * 60 * 1000;
  const cycleIndex = Math.floor(serverNow / EVENT_CYCLE_MS) % UNIFIED_SCHEDULED_EVENTS.length;
  return UNIFIED_SCHEDULED_EVENTS[cycleIndex];
}

function getDeterministicNoise(seed, tick) {
  let x = (Math.imul((tick ^ (seed * 37)), 0x5deece66d) + 0xb) | 0;
  x = (Math.imul(x ^ (x >>> 15), 0x27d4eb2d)) | 0;
  x = (x ^ (x >>> 16)) | 0;
  return ((x >>> 0) / 4294967296) * 2 - 1;
}

function calculateUnifiedPriceAtTick(sym, tick, serverNow = Date.now()) {
  const stock = STOCKS[sym];
  if (!stock) return 10;
  const seed = stock.seed || 101;

  const wave1 = Math.sin((tick + seed * 13) * (2 * Math.PI / 48));
  const wave2 = Math.sin((tick + seed * 29) * (2 * Math.PI / 16));
  const wave3 = Math.sin((tick + seed * 47) * (2 * Math.PI / 4));
  const noise = getDeterministicNoise(seed, tick);

  const cycleFactor = 1 + (wave1 * 0.08) + (wave2 * 0.04) + (wave3 * 0.02) + (noise * stock.volatility * 1.8);
  let price = Math.round(stock.basePrice * cycleFactor);

  const activeEv = getCurrentMarketEvent(serverNow);
  if (activeEv && activeEv.targets && activeEv.targets[sym]) {
    price = Math.round(price * activeEv.targets[sym]);
  }

  const ceiling = stock.ceiling || Math.round(stock.basePrice * 3.5);
  price = Math.max(stock.floor, Math.min(ceiling, price));
  return price;
}

function getMarketOverview(serverNow = Date.now()) {
  const currentTick = getUnifiedStockTick(serverNow);
  const timeRemainingMs = getStockSessionTimeRemaining(serverNow);
  const event = getCurrentMarketEvent(serverNow);

  const stocks = {};
  Object.keys(STOCKS).forEach(sym => {
    const history = [];
    for (let i = 23; i >= 0; i--) {
      history.push(calculateUnifiedPriceAtTick(sym, currentTick - i, serverNow));
    }
    const currentPrice = history[history.length - 1];
    stocks[sym] = {
      symbol: sym,
      name: STOCKS[sym].name,
      basePrice: STOCKS[sym].basePrice,
      currentPrice,
      maxShares: STOCKS[sym].maxShares,
      floor: STOCKS[sym].floor,
      ceiling: STOCKS[sym].ceiling,
      history
    };
  });

  return {
    currentTick,
    timeRemainingMs,
    eventTitle: event ? event.title : 'السوق مستقر',
    event,
    stocks
  };
}

function getCairoTodayString(serverNow = Date.now()) {
  return new Date(serverNow + (3 * 3600 * 1000)).toISOString().slice(0, 10);
}

function ensureDailyStockTracking(state, serverNow = Date.now()) {
  const today = getCairoTodayString(serverNow);
  if (!state.dailyStockProfit || state.dailyStockProfit.date !== today) {
    state.dailyStockProfit = {
      date: today,
      realizedProfit: 0
    };
  }
}

function buyStock(state, sym, shares, serverNow = Date.now(), clientPrice = null) {
  const stock = STOCKS[sym];
  if (!stock) throw new Error('رمز السهم غير صالح.');
  shares = parseInt(shares, 10);
  if (!shares || shares <= 0 || !Number.isInteger(shares)) {
    throw new Error('عدد الأسهم يجب أن يكون عدداً صحيحاً موجباً.');
  }

  // 3-second anti-spam cooldown
  if (state.stockTradeCooldownUntil && serverNow < state.stockTradeCooldownUntil) {
    const remSec = Math.ceil((state.stockTradeCooldownUntil - serverNow) / 1000);
    throw new Error(`البورصة: نظام منع التداول فائق السرعة نشط. انتظر ${remSec} ثانية.`);
  }

  if (!state.stocks) state.stocks = {};
  if (!state.stocks[sym]) state.stocks[sym] = { shares: 0, avgPrice: 0, type: 'long', takeProfit: 0, stopLoss: 0 };

  const currentShares = state.stocks[sym].shares || 0;
  if (currentShares > 0 && state.stocks[sym].type === 'short') {
    throw new Error('لديك صفقة بيع مكشوف (Short) مفتوحة على هذا السهم. يجب إغلاقها أولاً قبل فتح صفقة شراء صاعد (Long).');
  }
  const maxShares = stock.maxShares || 100000;
  if (currentShares + shares > maxShares) {
    const rem = Math.max(0, maxShares - currentShares);
    throw new Error(`تجاوزت الحد الأقصى للملكية في ${stock.name} (${maxShares.toLocaleString()} سهم). المتاح: ${rem.toLocaleString()} سهم.`);
  }

  const currentTick = getUnifiedStockTick(serverNow);
  const serverCalculatedPrice = calculateUnifiedPriceAtTick(sym, currentTick, serverNow);

  // Authoritative price resolution: honor client quoted price if within safe bounds
  let currentPrice = serverCalculatedPrice;
  if (clientPrice !== null && clientPrice !== undefined && !isNaN(clientPrice) && Number(clientPrice) > 0) {
    const cPrice = Number(clientPrice);
    const minSafe = stock.floor;
    const maxSafe = stock.ceiling || Math.round(stock.basePrice * 3.5);
    if (cPrice >= minSafe && cPrice <= maxSafe && Math.abs(cPrice - serverCalculatedPrice) / serverCalculatedPrice <= 0.25) {
      currentPrice = cPrice;
    }
  }

  const grossCost = currentPrice * shares;
  const fee = Math.max(5, Math.floor(grossCost * 0.01)); // 1% brokerage fee
  const totalCost = grossCost + fee;

  if ((Number(state.cash) || 0) < totalCost) {
    throw new Error(`رصيدك غير كافٍ. تحتاج: ${totalCost.toLocaleString()} ج.م (شامل عمولة السمسرة ${fee.toLocaleString()} ج.م).`);
  }

  state.cash -= totalCost;

  const currentAvg = state.stocks[sym].avgPrice || 0;
  const newShares = currentShares + shares;
  const newAvg = Math.floor(((currentShares * currentAvg) + grossCost) / newShares);

  state.stocks[sym].shares = newShares;
  state.stocks[sym].avgPrice = newAvg;
  state.stocks[sym].type = 'long';
  if (state.stocks[sym].takeProfit === undefined) state.stocks[sym].takeProfit = 0;
  if (state.stocks[sym].stopLoss === undefined) state.stocks[sym].stopLoss = 0;

  // 45-second holding cooldown
  if (!state.stockCooldowns) state.stockCooldowns = {};
  state.stockCooldowns[sym] = serverNow + 45000;
  state.stockTradeCooldownUntil = serverNow + 3000;

  state.netWorth = calculateNetWorth(state);
  state.title = getAppropriateTitle(state.netWorth, state.xp || 0);

  return {
    symbol: sym,
    type: 'long',
    shares,
    price: currentPrice,
    grossCost,
    fee,
    totalCost,
    holdingCooldownUntil: state.stockCooldowns[sym],
    portfolio: state.stocks[sym],
    cash: state.cash,
    netWorth: state.netWorth
  };
}

function shortStock(state, sym, shares, serverNow = Date.now(), clientPrice = null) {
  const stock = STOCKS[sym];
  if (!stock) throw new Error('رمز السهم غير صالح.');
  shares = parseInt(shares, 10);
  if (!shares || shares <= 0 || !Number.isInteger(shares)) {
    throw new Error('عدد الأسهم يجب أن يكون عدداً صحيحاً موجباً.');
  }

  // 3-second anti-spam cooldown
  if (state.stockTradeCooldownUntil && serverNow < state.stockTradeCooldownUntil) {
    const remSec = Math.ceil((state.stockTradeCooldownUntil - serverNow) / 1000);
    throw new Error(`البورصة: نظام منع التداول فائق السرعة نشط. انتظر ${remSec} ثانية.`);
  }

  if (!state.stocks) state.stocks = {};
  if (!state.stocks[sym]) state.stocks[sym] = { shares: 0, avgPrice: 0, type: 'long', takeProfit: 0, stopLoss: 0 };

  const currentShares = state.stocks[sym].shares || 0;
  if (currentShares > 0 && (state.stocks[sym].type || 'long') !== 'short') {
    throw new Error('لديك أسهم مملوكة (Long) في هذه الشركة. يجب بيعها أولاً قبل فتح صفقة بيع على المكشوف (Short).');
  }

  const maxShares = stock.maxShares || 100000;
  if (currentShares + shares > maxShares) {
    const rem = Math.max(0, maxShares - currentShares);
    throw new Error(`تجاوزت الحد الأقصى لصفقات البيع المكشوف في ${stock.name} (${maxShares.toLocaleString()} سهم). المتاح: ${rem.toLocaleString()} سهم.`);
  }

  const currentTick = getUnifiedStockTick(serverNow);
  const serverCalculatedPrice = calculateUnifiedPriceAtTick(sym, currentTick, serverNow);

  let currentPrice = serverCalculatedPrice;
  if (clientPrice !== null && clientPrice !== undefined && !isNaN(clientPrice) && Number(clientPrice) > 0) {
    const cPrice = Number(clientPrice);
    const minSafe = stock.floor;
    const maxSafe = stock.ceiling || Math.round(stock.basePrice * 3.5);
    if (cPrice >= minSafe && cPrice <= maxSafe && Math.abs(cPrice - serverCalculatedPrice) / serverCalculatedPrice <= 0.25) {
      currentPrice = cPrice;
    }
  }

  // 100% Margin Collateral + 1% Brokerage Fee
  const grossCollateral = currentPrice * shares;
  const fee = Math.max(5, Math.floor(grossCollateral * 0.01));
  const totalCost = grossCollateral + fee;

  if ((Number(state.cash) || 0) < totalCost) {
    throw new Error(`رصيدك غير كافٍ لحجز ضمان البيع المكشوف (100% Margin). تحتاج: ${totalCost.toLocaleString()} ج.م (شامل عمولة السمسرة ${fee.toLocaleString()} ج.م).`);
  }

  state.cash -= totalCost;

  const currentAvg = state.stocks[sym].avgPrice || 0;
  const newShares = currentShares + shares;
  const newAvg = Math.floor(((currentShares * currentAvg) + grossCollateral) / newShares);

  state.stocks[sym].shares = newShares;
  state.stocks[sym].avgPrice = newAvg;
  state.stocks[sym].type = 'short';
  if (state.stocks[sym].takeProfit === undefined) state.stocks[sym].takeProfit = 0;
  if (state.stocks[sym].stopLoss === undefined) state.stocks[sym].stopLoss = 0;

  if (!state.stockCooldowns) state.stockCooldowns = {};
  state.stockCooldowns[sym] = serverNow + 45000;
  state.stockTradeCooldownUntil = serverNow + 3000;

  state.netWorth = calculateNetWorth(state);
  state.title = getAppropriateTitle(state.netWorth, state.xp || 0);

  return {
    symbol: sym,
    type: 'short',
    shares,
    price: currentPrice,
    grossCost: grossCollateral,
    fee,
    totalCost,
    marginCallPrice: Math.ceil(newAvg * 1.50),
    holdingCooldownUntil: state.stockCooldowns[sym],
    portfolio: state.stocks[sym],
    cash: state.cash,
    netWorth: state.netWorth
  };
}

function sellStock(state, sym, shares, serverNow = Date.now(), clientPrice = null, bypassCooldown = false) {
  const stock = STOCKS[sym];
  if (!stock) throw new Error('رمز السهم غير صالح.');
  shares = parseInt(shares, 10);
  if (!shares || shares <= 0 || !Number.isInteger(shares)) {
    throw new Error('عدد الأسهم غير صالح.');
  }

  // 3-second anti-spam cooldown (skipped for automatic TP/SL/MarginCall triggers)
  if (!bypassCooldown && state.stockTradeCooldownUntil && serverNow < state.stockTradeCooldownUntil) {
    const remSec = Math.ceil((state.stockTradeCooldownUntil - serverNow) / 1000);
    throw new Error(`البورصة: نظام منع التداول فائق السرعة نشط. انتظر ${remSec} ثانية.`);
  }

  if (!state.stocks || !state.stocks[sym]) {
    throw new Error('لا تمتلك أي مركز مفتوح في هذه الشركة.');
  }

  const ownedShares = state.stocks[sym].shares || 0;
  if (ownedShares < shares) {
    throw new Error(`لا تمتلك عدد أسهم كافٍ. المتاح في محفظتك: ${ownedShares} سهم.`);
  }

  // 45-second holding cooldown check
  if (state.stockCooldowns && state.stockCooldowns[sym] && serverNow < state.stockCooldowns[sym]) {
    const remSec = Math.ceil((state.stockCooldowns[sym] - serverNow) / 1000);
    throw new Error(`لوائح البورصة: يجب الاحتفاظ بالمركز لمدة 45 ثانية بعد الفتح قبل الإغلاق. متبقي: ${remSec} ثانية.`);
  }

  const currentTick = getUnifiedStockTick(serverNow);
  const serverCalculatedPrice = calculateUnifiedPriceAtTick(sym, currentTick, serverNow);

  let currentPrice = serverCalculatedPrice;
  if (clientPrice !== null && clientPrice !== undefined && !isNaN(clientPrice) && Number(clientPrice) > 0) {
    const cPrice = Number(clientPrice);
    const minSafe = stock.floor;
    const maxSafe = stock.ceiling || Math.round(stock.basePrice * 3.5);
    if (cPrice >= minSafe && cPrice <= maxSafe && Math.abs(cPrice - serverCalculatedPrice) / serverCalculatedPrice <= 0.25) {
      currentPrice = cPrice;
    }
  }

  const posType = state.stocks[sym].type === 'short' ? 'short' : 'long';
  const avgPrice = state.stocks[sym].avgPrice || 0;
  const costBasis = avgPrice * shares;
  const marketNotional = currentPrice * shares;
  const fee = Math.max(5, Math.floor(marketNotional * 0.01)); // 1% brokerage fee

  ensureDailyStockTracking(state, serverNow);
  const todayProfits = Number(state.dailyStockProfit.realizedProfit || 0);
  const remainingDailyCap = Math.max(0, DAILY_STOCK_PROFIT_CAP - todayProfits);

  let allowedProfit = 0;
  let rawProfit = 0;
  let capHit = false;
  let netReturn = 0;

  if (posType === 'short') {
    // Short Selling PnL: profit when currentPrice < avgPrice, loss when currentPrice > avgPrice
    const priceDiff = avgPrice - currentPrice;
    if (priceDiff > 0) {
      rawProfit = priceDiff * shares;
      if (rawProfit > remainingDailyCap) {
        allowedProfit = remainingDailyCap;
        capHit = true;
      } else {
        allowedProfit = rawProfit;
      }
      state.dailyStockProfit.realizedProfit += allowedProfit;
      netReturn = Math.max(0, costBasis + allowedProfit - fee);
    } else {
      const rawLoss = (currentPrice - avgPrice) * shares;
      rawProfit = -rawLoss;
      netReturn = Math.max(0, costBasis - rawLoss - fee);
    }
  } else {
    // Long Position PnL: profit when currentPrice > avgPrice
    if (marketNotional > costBasis) {
      rawProfit = marketNotional - costBasis;
      if (rawProfit > remainingDailyCap) {
        allowedProfit = remainingDailyCap;
        capHit = true;
      } else {
        allowedProfit = rawProfit;
      }
      state.dailyStockProfit.realizedProfit += allowedProfit;
      netReturn = Math.max(0, costBasis + allowedProfit - fee);
    } else {
      rawProfit = marketNotional - costBasis;
      netReturn = Math.max(0, marketNotional - fee);
    }
  }

  state.stocks[sym].shares = ownedShares - shares;
  if (state.stocks[sym].shares === 0) {
    state.stocks[sym].avgPrice = 0;
    state.stocks[sym].type = 'long';
    state.stocks[sym].takeProfit = 0;
    state.stocks[sym].stopLoss = 0;
  }

  state.cash = (Number(state.cash) || 0) + netReturn;
  if (!bypassCooldown) {
    state.stockTradeCooldownUntil = serverNow + 3000;
  }

  state.netWorth = calculateNetWorth(state);
  state.title = getAppropriateTitle(state.netWorth, state.xp || 0);

  return {
    symbol: sym,
    type: posType,
    shares,
    price: currentPrice,
    costBasis,
    grossReturn: posType === 'short' ? Math.max(0, costBasis + rawProfit) : marketNotional,
    fee,
    totalReturn: netReturn,
    rawProfit,
    allowedProfit,
    capHit,
    portfolio: state.stocks[sym],
    dailyRealizedProfit: state.dailyStockProfit.realizedProfit,
    dailyProfitCap: DAILY_STOCK_PROFIT_CAP,
    cash: state.cash,
    netWorth: state.netWorth
  };
}

function setStockOrders(state, sym, takeProfit = 0, stopLoss = 0) {
  const stock = STOCKS[sym];
  if (!stock) throw new Error('رمز السهم غير صالح.');
  if (!state.stocks || !state.stocks[sym] || !(state.stocks[sym].shares > 0)) {
    throw new Error('يجب أن تمتلك مركزاً مفتوحاً في هذا السهم أولاً لضبط أوامر جني الربح أو وقف الخسارة.');
  }

  const pos = state.stocks[sym];
  const posType = pos.type === 'short' ? 'short' : 'long';
  const avgPrice = Number(pos.avgPrice || stock.basePrice);
  const tp = Math.max(0, Math.round(Number(takeProfit) || 0));
  const sl = Math.max(0, Math.round(Number(stopLoss) || 0));

  if (posType === 'long') {
    if (tp > 0 && tp <= avgPrice) {
      throw new Error(`سعر جني الربح (TP) لصفقة الشراء يجب أن يكون أعلى من متوسط سعر الدخول (${avgPrice} ج.م).`);
    }
    if (sl > 0 && sl >= avgPrice) {
      throw new Error(`سعر وقف الخسارة (SL) لصفقة الشراء يجب أن يكون أقل من متوسط سعر الدخول (${avgPrice} ج.م).`);
    }
  } else {
    const marginCallPrice = Math.ceil(avgPrice * 1.50);
    if (tp > 0 && tp >= avgPrice) {
      throw new Error(`سعر جني الربح (TP) للبيع المكشوف يجب أن يكون أقل من سعر الدخول (${avgPrice} ج.م).`);
    }
    if (sl > 0 && sl <= avgPrice) {
      throw new Error(`سعر وقف الخسارة (SL) للبيع المكشوف يجب أن يكون أعلى من سعر الدخول (${avgPrice} ج.م).`);
    }
    if (sl > marginCallPrice) {
      throw new Error(`سعر وقف الخسارة لا يمكن أن يتجاوز سعر التصفية الإجبارية Margin Call (${marginCallPrice} ج.م = +50%).`);
    }
  }

  pos.takeProfit = tp;
  pos.stopLoss = sl;

  return {
    symbol: sym,
    type: posType,
    takeProfit: pos.takeProfit,
    stopLoss: pos.stopLoss,
    portfolio: pos
  };
}

function evaluateAutoStockOrders(state, serverNow = Date.now()) {
  if (!state || !state.stocks || typeof state.stocks !== 'object') return [];
  const currentTick = getUnifiedStockTick(serverNow);
  const triggered = [];

  Object.keys(STOCKS).forEach(sym => {
    const pos = state.stocks[sym];
    if (!pos || !(Number(pos.shares) > 0)) return;

    const holdingUntil = Number((state.stockCooldowns && state.stockCooldowns[sym]) || 0);
    if (serverNow < holdingUntil) return; // Respect 45s mandatory holding period

    const currentPrice = calculateUnifiedPriceAtTick(sym, currentTick, serverNow);
    const posType = pos.type === 'short' ? 'short' : 'long';
    const avgPrice = Number(pos.avgPrice || STOCKS[sym].basePrice);
    const tp = Number(pos.takeProfit || 0);
    const sl = Number(pos.stopLoss || 0);

    let triggerReason = null;
    if (posType === 'short') {
      const marginCallPrice = Math.ceil(avgPrice * 1.50);
      if (currentPrice >= marginCallPrice) {
        triggerReason = 'margin_call';
      } else if (tp > 0 && currentPrice <= tp) {
        triggerReason = 'take_profit';
      } else if (sl > 0 && currentPrice >= sl) {
        triggerReason = 'stop_loss';
      }
    } else {
      if (tp > 0 && currentPrice >= tp) {
        triggerReason = 'take_profit';
      } else if (sl > 0 && currentPrice <= sl) {
        triggerReason = 'stop_loss';
      }
    }

    if (triggerReason) {
      try {
        const res = sellStock(state, sym, Number(pos.shares), serverNow, currentPrice, true);
        triggered.push({
          ...res,
          reason: triggerReason
        });
      } catch (_) {}
    }
  });

  return triggered;
}

module.exports = {
  DAILY_STOCK_PROFIT_CAP,
  STOCK_TICK_INTERVAL_MS,
  getUnifiedStockTick,
  getStockSessionTimeRemaining,
  getCurrentMarketEvent,
  calculateUnifiedPriceAtTick,
  getMarketOverview,
  setCustomMarketEvent,
  buyStock,
  shortStock,
  sellStock,
  setStockOrders,
  evaluateAutoStockOrders
};
