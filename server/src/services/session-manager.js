/**
 * Ras ALmal Tycoon — In-Memory Session Manager with Write-Behind Sync
 * 
 * Features:
 * - Ultra-fast in-memory state mutations (0ms database lag)
 * - Automatic background write-behind debouncing (every 30s)
 * - Immediate force-save on critical financial transactions
 * - Offline catch-up engine on session initialization
 */

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
   * @returns {Promise<{ session: Object, offlineReport: Object|null }>}
   */
  async getOrCreateSession(username, triggerOfflineCatchup = false) {
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

      session = {
        username: state.username,
        pin: dbRow.pin,
        state: state,
        dirty: triggerOfflineCatchup, // Dirty if offline earnings were added
        lastActivity: Date.now(),
        lastClickAt: 0,
        clickBurstCounter: 0
      };

      this.sessions.set(uKey, session);
    } else {
      session.lastActivity = Date.now();
    }

    return { session, offlineReport };
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
      session.state.lastSeen = Date.now();
      session.state.lastActiveTimestamp = Date.now();
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

    session.state.lastSeen = Date.now();
    session.state.lastActiveTimestamp = Date.now();
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
    const { session } = await this.getOrCreateSession(username, false);
    if (!session) return false;

    const s = session.state;

    // Synchronize monetary balances
    if (clientState.cash !== undefined) s.cash = Number(clientState.cash) || 0;
    if (clientState.bank !== undefined) s.bank = Number(clientState.bank) || 0;
    if (clientState.dirtyCash !== undefined) s.dirtyCash = Number(clientState.dirtyCash) || 0;
    if (clientState.xp !== undefined) s.xp = Number(clientState.xp) || 0;
    if (clientState.title) s.title = String(clientState.title);
    if (clientState.jobId) s.jobId = String(clientState.jobId);
    if (clientState.jailTimer !== undefined) s.jailTimer = Number(clientState.jailTimer) || 0;
    if (clientState.totalTaxesPaid !== undefined) s.totalTaxesPaid = Number(clientState.totalTaxesPaid) || 0;

    // Synchronize modules
    if (clientState.businesses && typeof clientState.businesses === 'object') {
      s.businesses = clientState.businesses;
    }
    if (clientState.industry && typeof clientState.industry === 'object') {
      s.industry = clientState.industry;
    }
    if (clientState.ownedCars && typeof clientState.ownedCars === 'object') {
      s.ownedCars = clientState.ownedCars;
    }
    if (clientState.activeCar !== undefined) {
      s.activeCar = clientState.activeCar;
    }
    if (clientState.assets && typeof clientState.assets === 'object') {
      s.assets = clientState.assets;
    }
    if (clientState.stocks && typeof clientState.stocks === 'object') {
      s.stocks = clientState.stocks;
    }
    if (clientState.crypto && typeof clientState.crypto === 'object') {
      s.crypto = clientState.crypto;
    }
    if (Array.isArray(clientState.investments)) {
      s.investments = clientState.investments;
    }
    if (clientState.tradeCompany !== undefined) {
      s.tradeCompany = clientState.tradeCompany;
    }
    if (clientState.inventory && typeof clientState.inventory === 'object') {
      s.inventory = clientState.inventory;
    }
    if (clientState.activityLog && Array.isArray(clientState.activityLog)) {
      s.activityLog = clientState.activityLog.slice(-50);
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

    s.netWorth = Number(clientState.netWorth) || calculateNetWorth(s);
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
        session.state.lastSeen = Date.now();
        session.state.lastActiveTimestamp = Date.now();
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
}

module.exports = new SessionManager();
