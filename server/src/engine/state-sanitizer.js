/**
 * Player State Hydrator & Sanitizer
 * Guarantees zero runtime crashes by ensuring any state loaded from DB
 * conforms to the authoritative schema with all required keys.
 */

const DEFAULT_STATE = {
  cash: 1000,
  bank: 0,
  dirtyCash: 0,
  netWorth: 1000,
  xp: 0,
  title: 'عامل مبتدئ',
  jobId: 'worker',
  businesses: {},
  industry: {},
  inventory: { suppliesHours: 12 },
  ownedCars: {},
  activeCar: null,
  assets: {},
  stocks: {},
  crypto: {},
  investments: [],
  dailyInvestments: { date: '', count: 0 },
  dailyStockProfit: { date: '', realizedProfit: 0 },
  dailyQuests: null,
  tradeCompany: null,
  activeLoan: null,
  loanCooldownUntil: 0,
  workCooldownUntil: 0,
  casinoCooldownUntil: 0,
  jailTimer: 0,
  heatLevel: 0,
  underworldRep: 0,
  afkManagerExpiresAt: 0,
  totalTaxesPaid: 0,
  activityLog: [],
  customItems: {},
  itemDurations: {},
  smugglingFleet: {},
  activeSmugglingJobs: {},
  gold: 0,
  farm: {
    unlocked: false,
    landLevel: 1,
    maxPlots: 4,
    waterLevel: 1,
    fertilizerLevel: 1,
    workers: 0,
    siloLevel: 1,
    plots: [null, null, null, null],
    inventory: {},
    stats: { totalHarvested: 0, totalRevenue: 0 },
    processing: {
      storage: { flour_bread: 0, tomato_paste: 0, strawberry_jam: 0, premium_coffee: 0, stuffed_dates: 0, saffron_essence: 0 },
      stats: { totalProcessed: 0, totalRevenue: 0 }
    },
    livestock: {
      cows: 0,
      chickens: 0,
      milk: 0,
      eggs: 0,
      compost: 0,
      lastProduceAt: 0,
      stats: { totalMilk: 0, totalEggs: 0, totalRevenue: 0 }
    },
    contracts: {
      reputation: 0,
      completedCount: 0,
      totalBonusEarned: 0,
      active: []
    }
  },
  lastActiveTimestamp: 0,
  lastSeen: 0
};

/**
 * Normalizes and sanitizes a raw database record into a valid in-memory Player Session
 * @param {Object} dbRow - Raw record from Supabase 'players' table
 * @returns {Object} Guaranteed valid, complete player state object
 */
function sanitizePlayerState(dbRow) {
  if (!dbRow || typeof dbRow !== 'object') {
    return { ...DEFAULT_STATE, username: 'unknown' };
  }

  const rawState = (typeof dbRow.state === 'object' && dbRow.state) ? dbRow.state : {};
  
  // Merge defaults -> rawState -> authoritative columns from row
  const cleanState = Object.assign({}, DEFAULT_STATE, rawState);

  const isAccountReset = Boolean(dbRow.is_reset === true || dbRow.isReset === true || rawState.isReset === true);

  // Authoritative SQL columns reconciled with state keys to prevent accidental zeroing
  cleanState.username = String(dbRow.username || cleanState.username || '').trim();
  cleanState.adminModifiedTimestamp = Math.max(
    Number(dbRow.admin_modified_timestamp || 0),
    Number(rawState.adminModifiedTimestamp || 0)
  );
  if (isAccountReset) {
    cleanState.cash = 0;
    cleanState.bank = 0;
    cleanState.dirtyCash = 0;
    cleanState.netWorth = 0;
    cleanState.xp = 0;
    cleanState.businesses = {};
    cleanState.assets = {};
    cleanState.stocks = {};
    cleanState.crypto = {};
    cleanState.investments = [];
    cleanState.isReset = true;
  } else {
    cleanState.cash = (dbRow.cash !== null && dbRow.cash !== undefined) ? Number(dbRow.cash) : Number(rawState.cash || 0);
    cleanState.bank = (dbRow.bank !== null && dbRow.bank !== undefined) ? Number(dbRow.bank) : Number(rawState.bank || 0);
    cleanState.dirtyCash = (dbRow.dirty_cash !== null && dbRow.dirty_cash !== undefined) ? Number(dbRow.dirty_cash) : Number(rawState.dirtyCash || 0);
    cleanState.netWorth = (dbRow.net_worth !== null && dbRow.net_worth !== undefined) ? Number(dbRow.net_worth) : Number(rawState.netWorth || 0);
    cleanState.xp = (dbRow.xp !== null && dbRow.xp !== undefined) ? Number(dbRow.xp) : Number(rawState.xp || 0);
  }
  cleanState.title = String(dbRow.title || cleanState.title || 'عامل مبتدئ');
  cleanState.jobId = String(dbRow.job_id || cleanState.jobId || 'worker');
  cleanState.jailTimer = Number(dbRow.jail_timer !== undefined ? dbRow.jail_timer : cleanState.jailTimer) || 0;
  cleanState.afkManagerExpiresAt = Number(dbRow.afk_manager_expires_at !== undefined ? dbRow.afk_manager_expires_at : cleanState.afkManagerExpiresAt) || 0;
  cleanState.totalTaxesPaid = Number(dbRow.total_taxes_paid !== undefined ? dbRow.total_taxes_paid : cleanState.totalTaxesPaid) || 0;
  
  cleanState.lastSeen = Number(dbRow.last_seen || cleanState.lastSeen || Date.now());
  // CRITICAL: Preserve lastActiveTimestamp from the state JSON blob (where the client
  // stores the real exit moment). Only fall back to lastSeen if not found in state.
  // Overwriting with lastSeen here would corrupt the offline earnings calculation.
  const embeddedLastActive = Number(rawState.lastActiveTimestamp || 0);
  cleanState.lastActiveTimestamp = embeddedLastActive > 0 ? embeddedLastActive : cleanState.lastSeen;

  // Ensure sub-objects are never null or primitive
  if (!cleanState.businesses || typeof cleanState.businesses !== 'object') cleanState.businesses = {};
  if (!cleanState.industry || typeof cleanState.industry !== 'object') cleanState.industry = {};
  if (!cleanState.inventory || typeof cleanState.inventory !== 'object') cleanState.inventory = { suppliesHours: 12 };
  if (!cleanState.stocks || typeof cleanState.stocks !== 'object') cleanState.stocks = {};
  if (!cleanState.crypto || typeof cleanState.crypto !== 'object') cleanState.crypto = {};
  if (!cleanState.assets || typeof cleanState.assets !== 'object') cleanState.assets = {};
  if (!Array.isArray(cleanState.investments)) cleanState.investments = [];
  if (rawState.dailyQuests && typeof rawState.dailyQuests === 'object') {
    cleanState.dailyQuests = rawState.dailyQuests;
  } else {
    cleanState.dailyQuests = null;
  }
  if (rawState.dailyStockProfit && typeof rawState.dailyStockProfit === 'object') {
    cleanState.dailyStockProfit = {
      date: String(rawState.dailyStockProfit.date || ''),
      realizedProfit: Math.max(0, Number(rawState.dailyStockProfit.realizedProfit || 0))
    };
  } else {
    cleanState.dailyStockProfit = { date: '', realizedProfit: 0 };
  }

  // Security Hardening: Never leak PIN hash in client-facing state payloads
  delete cleanState.pin;

  // Gold currency (strictly gated to developer account 'Khaled' only)
  const isLiteralKhaled = cleanState.username &&
    typeof cleanState.username === 'string' &&
    cleanState.username.trim().toLowerCase() === 'khaled' &&
    cleanState.username.trim().length === 6;

  if (isLiteralKhaled) {
    cleanState.gold = Math.max(0, Number(dbRow.gold !== undefined ? dbRow.gold : (rawState.gold || 0)));
  } else {
    delete cleanState.gold;
  }

  // Agro Farm Tycoon (Officially open to all players)
  if (rawState.farm && typeof rawState.farm === 'object') {
    cleanState.farm = rawState.farm;
  }

  // Strip sensitive security fields from state blob to prevent leaks in JSON column
  delete cleanState.pin;
  delete cleanState.password;

  return cleanState;
}

module.exports = {
  DEFAULT_STATE,
  sanitizePlayerState
};
