/**
 * Ras ALmal Tycoon — Global Shared Stock Exchange Engine
 * 100% Server-Authoritative Global Stock Market
 * Generates identical, synchronized market prices across all players and strictly validates trades.
 */

const { STOCKS } = require('./definitions');
const { calculateNetWorth, getAppropriateTitle } = require('./net-worth-engine');

const STOCK_TICK_INTERVAL_MS = 30 * 1000; // 30-second synchronized candlesticks
const DAILY_STOCK_PROFIT_CAP = 3000000; // 3M EGP cap per calendar day

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
  return new Date(serverNow + (2 * 3600 * 1000)).toISOString().slice(0, 10);
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

function buyStock(state, sym, shares, serverNow = Date.now()) {
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
  if (!state.stocks[sym]) state.stocks[sym] = { shares: 0, avgPrice: 0 };

  const currentShares = state.stocks[sym].shares || 0;
  const maxShares = stock.maxShares || 50000;
  if (currentShares + shares > maxShares) {
    const rem = Math.max(0, maxShares - currentShares);
    throw new Error(`تجاوزت الحد الأقصى للملكية في ${stock.name} (${maxShares.toLocaleString()} سهم). المتاح: ${rem.toLocaleString()} سهم.`);
  }

  const currentTick = getUnifiedStockTick(serverNow);
  const currentPrice = calculateUnifiedPriceAtTick(sym, currentTick, serverNow);
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

  // 45-second holding cooldown
  if (!state.stockCooldowns) state.stockCooldowns = {};
  state.stockCooldowns[sym] = serverNow + 45000;
  state.stockTradeCooldownUntil = serverNow + 3000;

  state.netWorth = calculateNetWorth(state);
  state.title = getAppropriateTitle(state.netWorth, state.xp || 0);

  return {
    symbol: sym,
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

function sellStock(state, sym, shares, serverNow = Date.now()) {
  const stock = STOCKS[sym];
  if (!stock) throw new Error('رمز السهم غير صالح.');
  shares = parseInt(shares, 10);
  if (!shares || shares <= 0 || !Number.isInteger(shares)) {
    throw new Error('عدد الأسهم غير صالح.');
  }

  // 3-second anti-spam cooldown
  if (state.stockTradeCooldownUntil && serverNow < state.stockTradeCooldownUntil) {
    const remSec = Math.ceil((state.stockTradeCooldownUntil - serverNow) / 1000);
    throw new Error(`البورصة: نظام منع التداول فائق السرعة نشط. انتظر ${remSec} ثانية.`);
  }

  if (!state.stocks || !state.stocks[sym]) {
    throw new Error('لا تمتلك أي أسهم في هذه الشركة.');
  }

  const ownedShares = state.stocks[sym].shares || 0;
  if (ownedShares < shares) {
    throw new Error(`لا تمتلك عدد أسهم كافٍ. المتاح في محفظتك: ${ownedShares} سهم.`);
  }

  // 45-second holding cooldown check
  if (state.stockCooldowns && state.stockCooldowns[sym] && serverNow < state.stockCooldowns[sym]) {
    const remSec = Math.ceil((state.stockCooldowns[sym] - serverNow) / 1000);
    throw new Error(`لوائح البورصة: يجب الاحتفاظ بالسهم لمدة 45 ثانية بعد الشراء قبل بيعه. متبقي: ${remSec} ثانية.`);
  }

  const currentTick = getUnifiedStockTick(serverNow);
  const currentPrice = calculateUnifiedPriceAtTick(sym, currentTick, serverNow);
  const grossReturn = currentPrice * shares;
  const fee = Math.max(5, Math.floor(grossReturn * 0.01)); // 1% brokerage fee

  const avgPrice = state.stocks[sym].avgPrice || 0;
  const costBasis = avgPrice * shares;

  ensureDailyStockTracking(state, serverNow);
  const todayProfits = Number(state.dailyStockProfit.realizedProfit || 0);
  const remainingDailyCap = Math.max(0, DAILY_STOCK_PROFIT_CAP - todayProfits);

  let allowedProfit = 0;
  let rawProfit = 0;
  let capHit = false;

  if (grossReturn > costBasis) {
    rawProfit = grossReturn - costBasis;
    if (rawProfit > remainingDailyCap) {
      allowedProfit = remainingDailyCap;
      capHit = true;
    } else {
      allowedProfit = rawProfit;
    }
    state.dailyStockProfit.realizedProfit += allowedProfit;
  }

  let netReturn = 0;
  if (grossReturn > costBasis) {
    netReturn = Math.max(0, costBasis + allowedProfit - fee);
  } else {
    netReturn = Math.max(0, grossReturn - fee);
  }

  state.stocks[sym].shares = ownedShares - shares;
  if (state.stocks[sym].shares === 0) {
    state.stocks[sym].avgPrice = 0;
  }

  state.cash = (Number(state.cash) || 0) + netReturn;
  state.stockTradeCooldownUntil = serverNow + 3000;

  state.netWorth = calculateNetWorth(state);
  state.title = getAppropriateTitle(state.netWorth, state.xp || 0);

  return {
    symbol: sym,
    shares,
    price: currentPrice,
    grossReturn,
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
  sellStock
};
