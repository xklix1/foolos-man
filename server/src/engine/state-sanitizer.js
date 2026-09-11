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

  // Authoritative SQL columns reconciled with state keys to prevent accidental zeroing
  cleanState.username = String(dbRow.username || cleanState.username || '').trim();
  cleanState.cash = Math.max(Number(dbRow.cash || 0), Number(rawState.cash || 0));
  cleanState.bank = Math.max(Number(dbRow.bank || 0), Number(rawState.bank || 0));
  cleanState.dirtyCash = Math.max(Number(dbRow.dirty_cash || 0), Number(rawState.dirtyCash || 0));
  cleanState.netWorth = Math.max(Number(dbRow.net_worth || 0), Number(rawState.netWorth || 0));
  cleanState.xp = Math.max(Number(dbRow.xp || 0), Number(rawState.xp || 0));
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

  // Security Hardening: Never leak PIN hash in client-facing state payloads
  delete cleanState.pin;

  return cleanState;
}

module.exports = {
  DEFAULT_STATE,
  sanitizePlayerState
};
