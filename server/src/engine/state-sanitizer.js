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

  // Authoritative SQL columns take precedence over stale state keys
  cleanState.username = String(dbRow.username || cleanState.username || '').trim();
  cleanState.cash = Number(dbRow.cash !== undefined ? dbRow.cash : cleanState.cash) || 0;
  cleanState.bank = Number(dbRow.bank !== undefined ? dbRow.bank : cleanState.bank) || 0;
  cleanState.dirtyCash = Number(dbRow.dirty_cash !== undefined ? dbRow.dirty_cash : cleanState.dirtyCash) || 0;
  cleanState.netWorth = Number(dbRow.net_worth !== undefined ? dbRow.net_worth : cleanState.netWorth) || 0;
  cleanState.xp = Number(dbRow.xp !== undefined ? dbRow.xp : cleanState.xp) || 0;
  cleanState.title = String(dbRow.title || cleanState.title || 'عامل مبتدئ');
  cleanState.jobId = String(dbRow.job_id || cleanState.jobId || 'worker');
  cleanState.jailTimer = Number(dbRow.jail_timer !== undefined ? dbRow.jail_timer : cleanState.jailTimer) || 0;
  cleanState.afkManagerExpiresAt = Number(dbRow.afk_manager_expires_at !== undefined ? dbRow.afk_manager_expires_at : cleanState.afkManagerExpiresAt) || 0;
  cleanState.totalTaxesPaid = Number(dbRow.total_taxes_paid !== undefined ? dbRow.total_taxes_paid : cleanState.totalTaxesPaid) || 0;
  
  cleanState.lastSeen = Number(dbRow.last_seen || cleanState.lastSeen || Date.now());
  cleanState.lastActiveTimestamp = cleanState.lastSeen;

  // Ensure sub-objects are never null or primitive
  if (!cleanState.businesses || typeof cleanState.businesses !== 'object') cleanState.businesses = {};
  if (!cleanState.industry || typeof cleanState.industry !== 'object') cleanState.industry = {};
  if (!cleanState.inventory || typeof cleanState.inventory !== 'object') cleanState.inventory = { suppliesHours: 12 };
  if (!cleanState.stocks || typeof cleanState.stocks !== 'object') cleanState.stocks = {};
  if (!cleanState.crypto || typeof cleanState.crypto !== 'object') cleanState.crypto = {};
  if (!cleanState.assets || typeof cleanState.assets !== 'object') cleanState.assets = {};
  if (!Array.isArray(cleanState.investments)) cleanState.investments = [];

  // Security Hardening: Never leak PIN hash in client-facing state payloads
  delete cleanState.pin;

  return cleanState;
}

module.exports = {
  DEFAULT_STATE,
  sanitizePlayerState
};
