/**
 * Ras ALmal Tycoon — In-Memory Session Manager with Write-Behind Sync
 * 
 * Features:
 * - Ultra-fast in-memory state mutations (0ms database lag)
 * - Automatic background write-behind debouncing (every 30s)
 * - Immediate force-save on critical financial transactions
 * - Offline catch-up engine on session initialization
 */

const crypto = require('crypto');
const config = require('../config/env');
const dbService = require('./db-service');
const { sanitizePlayerState } = require('../engine/state-sanitizer');
const { calculateAuthoritativeOfflineProgress } = require('../engine/offline-engine');
const { calculateNetWorth } = require('../engine/net-worth-engine');

class SessionManager {
  constructor() {
    this.sessions = new Map(); // username.toLowerCase() -> SessionObject
    this.flushIntervalTimer = null;
    this.startBackgroundFlush();
  }

  startBackgroundFlush() {
    if (this.flushIntervalTimer) clearInterval(this.flushIntervalTimer);
    this.flushIntervalTimer = setInterval(() => {
      this.flushDirtySessions();
      this.pruneIdleSessions().catch(() => {});
    }, config.AUTOSAVE_INTERVAL_MS);
    // Unref so timer does not block process exit during tests
    if (this.flushIntervalTimer.unref) {
      this.flushIntervalTimer.unref();
    }
  }

  /**
   * Retrieves or loads an authoritative player session
   * @param {string} username 
   * @param {boolean} triggerOfflineCatchup - Whether to run offline simulation on load
   * @param {string|null} clientSessionId - Optional unique client session token
   * @returns {Promise<{ session: Object, offlineReport: Object|null }>}
   */
  async getOrCreateSession(username, triggerOfflineCatchup = false, clientSessionId = null) {
    if (!username) throw new Error('Username is required');
    const uKey = username.trim().toLowerCase();

    let session = this.sessions.get(uKey);
    let offlineReport = null;

    if (!session) {
      // Load from database
      const dbRow = await dbService.getPlayerByUsername(username);
      if (!dbRow) {
        return { session: null, offlineReport: null };
      }

      const state = sanitizePlayerState(dbRow);

      // Execute authoritative offline calculation if requested
      if (triggerOfflineCatchup) {
        offlineReport = calculateAuthoritativeOfflineProgress(state, Date.now());
      }

      const effectiveSessionId = clientSessionId || state.activeSessionId || ('sess_' + Date.now() + '_' + crypto.randomBytes(12).toString('hex'));
      state.activeSessionId = effectiveSessionId;

      session = {
        username: state.username,
        pin: dbRow.pin,
        sessionId: effectiveSessionId,
        sessionToken: state.sessionToken || null,
        state: state,
        dirty: Boolean(offlineReport && offlineReport.applied),
        lastActivity: Date.now(),
        lastClickAt: 0,
        clickBurstCounter: 0
      };

      this.sessions.set(uKey, session);
    } else {
      if (clientSessionId && session.sessionId !== clientSessionId) {
        session.sessionId = clientSessionId;
        session.state.activeSessionId = clientSessionId;
        session.dirty = true;
      }
      // Re-verify against database in case admin reset or modified player state externally
      try {
        const dbRow = await dbService.getPlayerByUsername(username);
        if (dbRow) {
          const rawState = (typeof dbRow.state === 'object' && dbRow.state) ? dbRow.state : {};
          const isDbReset = Boolean(dbRow.is_reset === true || dbRow.isReset === true || rawState.isReset === true);
          const dbAdminTs = Number(dbRow.admin_modified_timestamp || rawState.adminModifiedTimestamp || 0);
          const sessionAdminTs = Number(session.state.adminModifiedTimestamp || 0);
          const dbBank = Number(dbRow.bank !== undefined && dbRow.bank !== null ? dbRow.bank : (rawState.bank || 0));
          const sessionBank = Number(session.state.bank || 0);
          const dbCash = Number(dbRow.cash !== undefined && dbRow.cash !== null ? dbRow.cash : (rawState.cash || 0));
          const sessionCash = Number(session.state.cash || 0);
          const dbNetWorth = Number(dbRow.net_worth !== undefined && dbRow.net_worth !== null ? dbRow.net_worth : (rawState.netWorth || 0));
          const sessionNetWorth = Number(session.state.netWorth || 0);
          const dbLastSeen = Number(dbRow.last_seen || rawState.lastSeen || 0);
          const sessionLastSeen = Number(session.state.lastSeen || session.state.lastActiveTimestamp || 0);

          if (
            isDbReset || 
            dbAdminTs > sessionAdminTs || 
            Math.abs(dbBank - sessionBank) > 1 ||
            Math.abs(dbCash - sessionCash) > 1 ||
            Math.abs(dbNetWorth - sessionNetWorth) > 1 ||
            dbLastSeen > sessionLastSeen + 5000
          ) {
            session.state = sanitizePlayerState(dbRow);
            if (dbRow.pin) session.pin = dbRow.pin;
            session.dirty = false;
          }
        }
      } catch (_) {}

      session.lastActivity = Date.now();
      // Execute authoritative offline calculation if requested, even if session was cached in RAM!
      if (triggerOfflineCatchup && (!session.state || !session.state.isReset)) {
        offlineReport = calculateAuthoritativeOfflineProgress(session.state, Date.now());
        if (offlineReport && offlineReport.applied) {
          session.dirty = true;
        }
      }
    }

    return { session, offlineReport };
  }

  /**
   * Triggers authoritative offline calculation on an authenticated session
   * @param {Object} session 
   * @returns {Object|null}
   */
  applyOfflineCatchup(session) {
    if (!session || !session.state || session.state.isReset) return null;
    const report = calculateAuthoritativeOfflineProgress(session.state, Date.now());
    if (report && report.applied) {
      session.dirty = true;
    }
    return report;
  }

  /**
   * Unloads a session on explicit client exit, ensuring dirty state is flushed to DB
   * and next session start performs a clean offline catch-up.
   */
  async unloadSession(username) {
    if (!username) return false;
    const uKey = username.trim().toLowerCase();
    const session = this.sessions.get(uKey);
    if (session) {
      if (session.dirty && (!session.state || !session.state.isReset)) {
        await dbService.savePlayerState(session.username, session.state);
      }
      this.sessions.delete(uKey);
      return true;
    }
    return false;
  }

  /**
   * Marks a session as dirty (modified) to be picked up by the next write-behind cycle
   * @param {string} username 
   */
  markDirty(username) {
    const uKey = username.trim().toLowerCase();
    const session = this.sessions.get(uKey);
    if (session) {
      session.dirty = true;
      session.lastActivity = Date.now();
      // IMPORTANT: Only update lastSeen (server write time).
      // Do NOT touch lastActiveTimestamp — that must reflect the player's real
      // last-activity moment so the offline engine can compute correct elapsed time.
      session.state.lastSeen = Date.now();
    }
  }

  /**
   * Immediately saves a specific player session to database
   * @param {string} username 
   */
  async forceSaveSession(username) {
    const uKey = username.trim().toLowerCase();
    const session = this.sessions.get(uKey);
    if (!session) return false;

    // IMPORTANT: Only update lastSeen (server write time).
    // Do NOT overwrite lastActiveTimestamp — it was set by the client to the actual
    // exit moment and must stay intact for the offline earnings engine.
    session.state.lastSeen = Date.now();
    const success = await dbService.savePlayerState(session.username, session.state);
    if (success) {
      session.dirty = false;
    }
    return success;
  }

  /**
   * Synchronizes full player state from client, updating memory and persisting if requested
   */
  async updateSessionState(username, clientState, immediate = false) {
    if (!username || !clientState || typeof clientState !== 'object') return false;

    // Security & Anti-Duplication Guard: Block any sync attempt if clientState claims to be a different user
    if (clientState.username && clientState.username.trim().toLowerCase() !== username.trim().toLowerCase()) {
      console.warn(`[SessionManager] Blocked cross-user state sync attempt: target="${username}", state.username="${clientState.username}"`);
      return false;
    }

    const { session } = await this.getOrCreateSession(username, false);
    if (!session) return false;

    // Strict Concurrent Session Guard: Reject sync if client session token does not match active session
    if (clientState.activeSessionId && session.sessionId && clientState.activeSessionId !== session.sessionId) {
      console.warn(`[SessionManager] Blocked stale session sync: target="${username}", active="${session.sessionId}", incoming="${clientState.activeSessionId}"`);
      return false;
    }

    const s = session.state;

    // Monetary Stale Client Protection: If server session was modified by an admin (or top-up)
    // with a timestamp newer than incoming client state, DO NOT allow stale client balances to overwrite!
    const sessionAdminTs = Number(s.adminModifiedTimestamp || 0);
    const clientAdminTs = Number(clientState.adminModifiedTimestamp || 0);
    const isClientStale = sessionAdminTs > 0 && clientAdminTs < sessionAdminTs;

    // Synchronize monetary balances (safeguarded against stale downgrades and impossible wealth jumps)
    const currentGross = (Number(s.cash) || 0) + (Number(s.bank) || 0);
    let incomingCash = Number(clientState.cash) || 0;
    let incomingBank = Number(clientState.bank) || 0;
    const incomingGross = incomingCash + incomingBank;
    const grossDelta = incomingGross - currentGross;

    // Anti-Tamper Velocity Shield: Detect impossible monetary leaps from console tampering
    // Base 35M + 3.0x of current gross + 5M buffer (for unflagged micro-increments; bypassed for legitimate transactions)
    const maxAllowableJump = Math.max(35000000, currentGross * 3.0) + 5000000;
    const isLegitBypass = Boolean(clientState._legitimateTransactionBypass || clientAdminTs > 0 || sessionAdminTs > 0);

    if (grossDelta > maxAllowableJump && !isLegitBypass && !isClientStale) {
      console.warn(`[AntiTamper] Flagged impossible wealth jump for "${username}": delta=${grossDelta.toLocaleString()}, maxAllowed=${maxAllowableJump.toLocaleString()}`);
      const excess = grossDelta - maxAllowableJump;
      if (incomingCash >= excess) {
        incomingCash -= excess;
      } else {
        incomingBank = Math.max(0, incomingBank - (excess - incomingCash));
        incomingCash = 0;
      }
    }

    if (clientState.cash !== undefined) {
      s.cash = isClientStale ? Math.max(Number(s.cash || 0), incomingCash) : incomingCash;
    }
    if (clientState.bank !== undefined) {
      s.bank = isClientStale ? Math.max(Number(s.bank || 0), incomingBank) : incomingBank;
    }
    if (clientState.dirtyCash !== undefined) s.dirtyCash = Number(clientState.dirtyCash) || 0;
    if (clientState.xp !== undefined) {
      s.xp = isClientStale ? Math.max(Number(s.xp || 0), Number(clientState.xp) || 0) : (Number(clientState.xp) || 0);
    }
    if (clientState.title && !isClientStale) s.title = String(clientState.title);
    if (clientState.jobId && !isClientStale) s.jobId = String(clientState.jobId);
    if (clientState.jailTimer !== undefined) s.jailTimer = Number(clientState.jailTimer) || 0;
    if (clientState.totalTaxesPaid !== undefined) s.totalTaxesPaid = Number(clientState.totalTaxesPaid) || 0;

    // Ensure security fields are never stored in state
    delete s.pin;
    delete s.password;

    // Beta Features (Gold currency & Farm - strictly gated to literal developer account 'Khaled' only)
    const isLiteralKhaled = typeof username === 'string' &&
      username.trim().toLowerCase() === 'khaled' &&
      username.trim().length === 6;

    if (isLiteralKhaled) {
      s.gold = Math.max(0, Number(s.gold || 0));
    } else {
      delete s.gold;
    }

    // Agro Farm Tycoon (Officially open to all players)
    if (clientState.farm && typeof clientState.farm === 'object') {
      s.farm = clientState.farm;
    }

    // Synchronize modules (safeguarded against stale downgrades)
    if (clientState.businesses && typeof clientState.businesses === 'object' && !isClientStale) {
      // Don't overwrite existing non-empty businesses with an empty object
      if (Object.keys(clientState.businesses).length > 0 || !s.businesses || Object.keys(s.businesses).length === 0) {
        s.businesses = clientState.businesses;
      }
    }
    if (clientState.industry && typeof clientState.industry === 'object') {
      if (!s.industry || typeof s.industry !== 'object') s.industry = {};
      if (!isClientStale) {
        s.industry = clientState.industry;
      } else {
        // Anti-rollback: preserve client unlocks and higher levels even if client timestamp is slightly older
        Object.keys(clientState.industry).forEach(secKey => {
          const cSec = clientState.industry[secKey];
          if (cSec && typeof cSec === 'object' && cSec.unlocked) {
            if (!s.industry[secKey]) {
              s.industry[secKey] = cSec;
            } else {
              s.industry[secKey].unlocked = true;
              s.industry[secKey].stage1 = Math.max(Number(s.industry[secKey].stage1 || 0), Number(cSec.stage1 || 0));
              s.industry[secKey].stage2 = Math.max(Number(s.industry[secKey].stage2 || 0), Number(cSec.stage2 || 0));
              s.industry[secKey].stage3 = Math.max(Number(s.industry[secKey].stage3 || 0), Number(cSec.stage3 || 0));
              s.industry[secKey].logistics = Math.max(Number(s.industry[secKey].logistics || 0), Number(cSec.logistics || 0));
            }
          }
        });
      }
    }
    if (clientState.ownedCars && typeof clientState.ownedCars === 'object' && !isClientStale) {
      s.ownedCars = clientState.ownedCars;
    }
    if (clientState.activeCar !== undefined && !isClientStale) {
      s.activeCar = clientState.activeCar;
    }
    if (clientState.assets && typeof clientState.assets === 'object' && !isClientStale) {
      s.assets = clientState.assets;
    }
    if (clientState.stocks && typeof clientState.stocks === 'object' && !isClientStale) {
      s.stocks = clientState.stocks;
    }
    if (clientState.crypto && typeof clientState.crypto === 'object' && !isClientStale) {
      s.crypto = clientState.crypto;
    }
    if (Array.isArray(clientState.investments) && !isClientStale) {
      s.investments = clientState.investments;
    }
    if (clientState.tradeCompany && typeof clientState.tradeCompany === 'object' && !isClientStale) {
      s.tradeCompany = clientState.tradeCompany;
    }
    if (clientState.inventory && typeof clientState.inventory === 'object') {
      s.inventory = clientState.inventory;
    }
    if (clientState.activityLog && Array.isArray(clientState.activityLog)) {
      s.activityLog = clientState.activityLog.slice(0, 50);
    }
    if (clientState.customItems && typeof clientState.customItems === 'object') {
      s.customItems = clientState.customItems;
    }
    if (clientState.itemDurations && typeof clientState.itemDurations === 'object') {
      s.itemDurations = clientState.itemDurations;
    }
    if (clientState.smugglingFleet && typeof clientState.smugglingFleet === 'object') {
      s.smugglingFleet = clientState.smugglingFleet;
    }
    if (clientState.activeSmugglingJobs && typeof clientState.activeSmugglingJobs === 'object') {
      s.activeSmugglingJobs = clientState.activeSmugglingJobs;
    }

    // Synchronize Banking Loans & Credit
    if (clientState.activeLoan !== undefined) {
      if (clientState.activeLoan && typeof clientState.activeLoan === 'object') {
        s.activeLoan = {
          amount: Math.max(0, Number(clientState.activeLoan.amount) || 0),
          totalDue: Math.max(0, Number(clientState.activeLoan.totalDue) || 0),
          ticksRemaining: Math.max(0, Number(clientState.activeLoan.ticksRemaining) || 0),
          initialTicks: Math.max(0, Number(clientState.activeLoan.initialTicks) || 3600),
          isDefaulted: Boolean(clientState.activeLoan.isDefaulted),
          latePenaltyTicks: Math.max(0, Number(clientState.activeLoan.latePenaltyTicks) || 0),
          latePenaltyCount: Math.max(0, Number(clientState.activeLoan.latePenaltyCount) || 0)
        };
      } else {
        s.activeLoan = null;
      }
    }
    if (clientState.loanCooldownUntil !== undefined) {
      s.loanCooldownUntil = Number(clientState.loanCooldownUntil) || 0;
    }
    const serverToday = new Date().toISOString().split('T')[0];

    if (clientState.dailyLoans && typeof clientState.dailyLoans === 'object') {
      s.dailyLoans = {
        date: serverToday,
        count: Math.min(10, Math.max(0, Number(clientState.dailyLoans.count || 0)))
      };
    }

    // Synchronize daily activities & cooldowns (Anchored strictly to trusted server UTC date)
    if (clientState.dailyInvestments && typeof clientState.dailyInvestments === 'object') {
      s.dailyInvestments = {
        date: serverToday,
        count: Math.min(20, Math.max(0, Number(clientState.dailyInvestments.count || 0)))
      };
    }

    // Synchronize Daily Stock Profit (Prevent cap reset via device timezone manipulation)
    if (clientState.dailyStockProfit && typeof clientState.dailyStockProfit === 'object') {
      const sDate = s.dailyStockProfit ? String(s.dailyStockProfit.date || '') : '';
      if (sDate === serverToday) {
        s.dailyStockProfit = {
          date: serverToday,
          realizedProfit: Math.max(Number(s.dailyStockProfit.realizedProfit || 0), Number(clientState.dailyStockProfit.realizedProfit || 0))
        };
      } else {
        s.dailyStockProfit = {
          date: serverToday,
          realizedProfit: Math.max(0, Number(clientState.dailyStockProfit.realizedProfit || 0))
        };
      }
    }

    if (clientState.dailyWork && typeof clientState.dailyWork === 'object') {
      const sDate = s.dailyWork ? String(s.dailyWork.date || '') : '';
      if (sDate === serverToday) {
        s.dailyWork = {
          date: serverToday,
          shifts: Math.min(100, Math.max(Number(s.dailyWork.shifts || 0), Number(clientState.dailyWork.shifts || 0))),
          overtimeShifts: Math.min(15, Math.max(Number(s.dailyWork.overtimeShifts || 0), Number(clientState.dailyWork.overtimeShifts || 0)))
        };
      } else {
        s.dailyWork = {
          date: serverToday,
          shifts: Math.min(100, Math.max(0, Number(clientState.dailyWork.shifts || 0))),
          overtimeShifts: Math.min(15, Math.max(0, Number(clientState.dailyWork.overtimeShifts || 0)))
        };
      }
    }

    // Enforce 5M server-authoritative casino daily net profit cap
    if (clientState.dailyCasinoNetProfit !== undefined) {
      s.dailyCasinoNetProfit = Math.min(5000000, Math.max(0, Number(clientState.dailyCasinoNetProfit) || 0));
    }
    if (clientState.dailyBlackMarket && typeof clientState.dailyBlackMarket === 'object') {
      const cDate = String(clientState.dailyBlackMarket.date || '');
      const sDate = s.dailyBlackMarket ? String(s.dailyBlackMarket.date || '') : '';
      if (cDate && cDate === sDate) {
        s.dailyBlackMarket = {
          date: cDate,
          count: Math.min(15, Math.max(Number(s.dailyBlackMarket.count || 0), Number(clientState.dailyBlackMarket.count || 0)))
        };
      } else {
        s.dailyBlackMarket = {
          date: cDate,
          count: Math.min(15, Math.max(0, Number(clientState.dailyBlackMarket.count || 0)))
        };
      }
    }
    if (clientState.dailyToolUses && typeof clientState.dailyToolUses === 'object') {
      s.dailyToolUses = clientState.dailyToolUses;
    }
    // Synchronize Daily Quests (Prevent quest resets & rollbacks on reconnect / logout)
    if (clientState.dailyQuests && typeof clientState.dailyQuests === 'object') {
      const cDate = String(clientState.dailyQuests.date || '');
      const sDate = s.dailyQuests ? String(s.dailyQuests.date || '') : '';
      if (cDate && cDate === sDate && Array.isArray(clientState.dailyQuests.quests) && Array.isArray(s.dailyQuests.quests)) {
        if (clientState.dailyQuests.grandBonusClaimed) {
          s.dailyQuests.grandBonusClaimed = true;
        }
        clientState.dailyQuests.quests.forEach(cq => {
          if (!cq || !cq.id) return;
          const sq = s.dailyQuests.quests.find(q => q && q.id === cq.id);
          if (sq) {
            if (cq.claimed) sq.claimed = true;
            if (cq.completed) sq.completed = true;
            sq.progress = Math.max(Number(sq.progress || 0), Number(cq.progress || 0));
          } else {
            s.dailyQuests.quests.push(cq);
          }
        });
      } else {
        s.dailyQuests = clientState.dailyQuests;
      }
    }
    if (clientState.dailyCasinoNetProfit !== undefined) {
      s.dailyCasinoNetProfit = Number(clientState.dailyCasinoNetProfit) || 0;
    }
    if (clientState.dailyCasinoResetAt !== undefined) {
      s.dailyCasinoResetAt = Number(clientState.dailyCasinoResetAt) || 0;
    }
    if (clientState.workCooldownUntil !== undefined) {
      s.workCooldownUntil = Number(clientState.workCooldownUntil) || 0;
    }
    if (clientState.overtimeCooldownUntil !== undefined) {
      s.overtimeCooldownUntil = Number(clientState.overtimeCooldownUntil) || 0;
    }
    if (clientState.casinoCooldownUntil !== undefined) {
      s.casinoCooldownUntil = Number(clientState.casinoCooldownUntil) || 0;
    }
    if (clientState.stockTradeCooldownUntil !== undefined) {
      s.stockTradeCooldownUntil = Number(clientState.stockTradeCooldownUntil) || 0;
    }
    if (clientState.itemCooldowns && typeof clientState.itemCooldowns === 'object') {
      s.itemCooldowns = clientState.itemCooldowns;
    }
    if (clientState.blackMarketCooldowns && typeof clientState.blackMarketCooldowns === 'object') {
      s.blackMarketCooldowns = clientState.blackMarketCooldowns;
    }
    if (clientState.underworldRep !== undefined) {
      s.underworldRep = Number(clientState.underworldRep) || 0;
    }
    if (clientState.heatLevel !== undefined) {
      s.heatLevel = Number(clientState.heatLevel) || 0;
    }
    if (clientState.afkManagerExpiresAt !== undefined) {
      s.afkManagerExpiresAt = Number(clientState.afkManagerExpiresAt) || 0;
    }

    s.netWorth = isClientStale ? Math.max(Number(s.netWorth || 0), Number(clientState.netWorth) || calculateNetWorth(s)) : (Number(clientState.netWorth) || calculateNetWorth(s));
    s.lastActiveTimestamp = Number(clientState.lastActiveTimestamp || Date.now());
    s.lastSeen = Date.now();
    session.lastActivity = Date.now();

    if (immediate) {
      return await this.forceSaveSession(username);
    } else {
      this.markDirty(username);
      return true;
    }
  }

  /**
   * Background task: flushes all dirty sessions to PostgreSQL
   */
  async flushDirtySessions() {
    const dirtyList = [];
    for (const [uKey, session] of this.sessions.entries()) {
      if (session.dirty) {
        dirtyList.push(session);
      }
    }

    if (dirtyList.length === 0) return;

    console.log(`[SessionManager] Write-Behind: Flushing ${dirtyList.length} dirty sessions to database...`);
    for (const session of dirtyList) {
      try {
        // IMPORTANT: Only update lastSeen (server write time).
        // Do NOT touch lastActiveTimestamp — it must stay as the player's real
        // last-activity anchor so offline earnings are computed correctly.
        session.state.lastSeen = Date.now();
        const ok = await dbService.savePlayerState(session.username, session.state);
        if (ok) {
          session.dirty = false;
        }
      } catch (err) {
        console.warn('[SessionManager] Write-Behind warning:', err.message);
      }
    }
  }

  /**
   * Unloads inactive sessions from RAM to conserve memory
   */
  async pruneIdleSessions() {
    const now = Date.now();
    for (const [uKey, session] of this.sessions.entries()) {
      if (now - session.lastActivity > config.SESSION_IDLE_TIMEOUT_MS) {
        if (session.dirty) {
          await dbService.savePlayerState(session.username, session.state);
        }
        this.sessions.delete(uKey);
      }
    }
  }

  /**
   * Retrieves active session from memory if present
   */
  getSession(username) {
    if (!username) return null;
    return this.sessions.get(username.trim().toLowerCase()) || null;
  }

  /**
   * Immediately unloads/evicts a session from memory
   */
  evictSession(username) {
    if (!username) return false;
    return this.sessions.delete(username.trim().toLowerCase());
  }

  /**
   * Authoritatively updates recipient in-memory session when a wire transfer completes
   */
  creditRecipientWireTransfer(recipientUsername, amount, transferTs = Date.now()) {
    if (!recipientUsername || !amount) return false;
    const uKey = recipientUsername.trim().toLowerCase();
    const session = this.sessions.get(uKey);
    if (session && session.state) {
      session.state.bank = (Number(session.state.bank) || 0) + Number(amount);
      session.state.netWorth = (Number(session.state.netWorth) || 0) + Number(amount);
      session.state.adminModifiedTimestamp = Math.max(Number(session.state.adminModifiedTimestamp || 0), transferTs);
      session.dirty = true;
      console.log(`[SessionManager] Credited incoming wire transfer for active session "${recipientUsername}": +${amount.toLocaleString()} EGP (New Bank: ${session.state.bank.toLocaleString()})`);
      return true;
    }
    return false;
  }

  /**
   * Authoritatively updates sender in-memory session when a wire transfer completes
   */
  deductSenderWireTransfer(senderUsername, amount, transferTs = Date.now()) {
    if (!senderUsername || !amount) return false;
    const uKey = senderUsername.trim().toLowerCase();
    const session = this.sessions.get(uKey);
    if (session && session.state) {
      const amt = Number(amount);
      const sCash = Math.max(0, Number(session.state.cash) || 0);
      const sBank = Math.max(0, Number(session.state.bank) || 0);

      let deductCash = 0;
      let deductBank = 0;
      if (sCash >= amt) {
        deductCash = amt;
        deductBank = 0;
      } else {
        deductCash = sCash;
        deductBank = amt - sCash;
      }

      session.state.cash = Math.max(0, sCash - deductCash);
      session.state.bank = Math.max(0, sBank - deductBank);
      session.state.netWorth = Math.max(0, (Number(session.state.netWorth) || 0) - amt);
      session.state.adminModifiedTimestamp = Math.max(Number(session.state.adminModifiedTimestamp || 0), transferTs);
      session.dirty = true;
      console.log(`[SessionManager] Deducted outgoing wire transfer for active session "${senderUsername}": -${amt.toLocaleString()} EGP (New Cash: ${session.state.cash.toLocaleString()}, New Bank: ${session.state.bank.toLocaleString()})`);
      return true;
    }
    return false;
  }
}

module.exports = new SessionManager();
