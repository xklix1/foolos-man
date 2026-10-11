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
const { calculateNetWorth, getAppropriateTitle } = require('../engine/net-worth-engine');
const { AIRCRAFT_MODELS } = require('../engine/airport-engine');
const { accrueAuthoritativeCashflow } = require('../engine/cashflow-engine');

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
        lastDbCheck: Date.now(),
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
      
      // Highly-optimized: Only re-verify against database on explicit login/reconnect or after 60s idle
      const now = Date.now();
      const needsDbCheck = triggerOfflineCatchup || (now - (session.lastDbCheck || 0) > 60000 && !session.dirty);
      if (needsDbCheck) {
        session.lastDbCheck = now;
        try {
          const dbRow = await dbService.getPlayerByUsername(username);
          if (dbRow) {
            const rawState = (typeof dbRow.state === 'object' && dbRow.state) ? dbRow.state : {};
            const isDbReset = Boolean(dbRow.is_reset === true || dbRow.isReset === true || rawState.isReset === true);
            const dbAdminTs = Number(dbRow.admin_modified_timestamp || rawState.adminModifiedTimestamp || 0);
            const sessionAdminTs = Number(session.state.adminModifiedTimestamp || 0);

            if (isDbReset || dbAdminTs > sessionAdminTs) {
              session.state = sanitizePlayerState(dbRow);
              if (dbRow.pin) session.pin = dbRow.pin;
              session.dirty = false;
            }
          }
        } catch (_) {}
      }

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
  async updateSessionState(username, clientState, immediate = false, isServerAdminContext = false) {
    if (!username || !clientState || typeof clientState !== 'object') return false;

    // Security & Anti-Duplication Guard: Block any sync attempt if clientState claims to be a different user
    if (clientState.username && clientState.username.trim().toLowerCase() !== username.trim().toLowerCase()) {
      console.warn(`[SessionManager] Blocked cross-user state sync attempt: target="${username}", state.username="${clientState.username}"`);
      return false;
    }

    const { session } = await this.getOrCreateSession(username, false);
    if (!session) return false;

    // Seamlessly adopt incoming client session ID if provided
    if (clientState.activeSessionId) {
      session.sessionId = clientState.activeSessionId;
      if (session.state) session.state.activeSessionId = clientState.activeSessionId;
    }

    const s = session.state;

    // Monetary Stale Client Protection: If server session was modified by an admin (or top-up)
    // with a timestamp newer than incoming client state, DO NOT allow stale client balances to overwrite!
    const sessionAdminTs = Number(s.adminModifiedTimestamp || 0);
    const clientAdminTs = Number(clientState.adminModifiedTimestamp || 0);
    const isClientStale = sessionAdminTs > 0 && clientAdminTs < sessionAdminTs;
    // CRITICAL SECURITY ENFORCEMENT:
    // Client sync payloads CANNOT grant themselves admin authority via timestamps or spoofed flags.
    // isAdminGrant is ONLY valid when explicitly invoked from an authenticated server admin context.
    const isAdminGrant = isServerAdminContext === true;

    // Beta Features (Gold currency - strictly gated to literal developer account 'Khaled' / 'خالد' only)
    const isLiteralKhaled = typeof username === 'string' &&
      ['khaled', 'خالد', 'rasalmal', 'rasalmal1', 'rasalmal2'].includes(username.trim().toLowerCase());

    // Synchronize monetary balances
    let incomingCash = Number(clientState.cash);
    if (isNaN(incomingCash) || incomingCash < 0) incomingCash = Number(s.cash || 0);
    let incomingBank = Number(clientState.bank);
    if (isNaN(incomingBank) || incomingBank < 0) incomingBank = Number(s.bank || 0);

    // Zero-Sum Internal Asset Transfer: Cash <-> Bank transfers are completely exempt from velocity clamps
    const prevLiquidTotal = (Number(s.cash) || 0) + (Number(s.bank) || 0);
    const newLiquidTotal = incomingCash + incomingBank;
    const liquidJump = newLiquidTotal - prevLiquidTotal;

    // PHASE 3 PURE THIN-CLIENT LOCKDOWN:
    // Core wealth balances (cash, bank, dirtyCash, assets, ownedCars, stocks, gold, incomeVault)
    // are strictly Server-Authoritative.
    // Untrusted client syncState calls cannot directly inject or overwrite these values.
    // Only verified Admin grants (isAdminGrant) or server action endpoints can alter balances.
    if (isAdminGrant) {
      s.cash = incomingCash;
      s.bank = incomingBank;
      if (clientState.dirtyCash !== undefined) s.dirtyCash = Number(clientState.dirtyCash) || 0;
      if (clientState.assets && typeof clientState.assets === 'object') s.assets = clientState.assets;
      if (clientState.ownedCars && typeof clientState.ownedCars === 'object') s.ownedCars = clientState.ownedCars;
      if (clientState.stocks && typeof clientState.stocks === 'object') s.stocks = clientState.stocks;
      if (clientState.gold !== undefined && clientState.gold !== null) s.gold = Math.max(0, Number(clientState.gold));
      const highestTs = Math.max(sessionAdminTs, clientAdminTs, Date.now());
      session._lastProcessedAdminTs = highestTs;
      s.adminModifiedTimestamp = highestTs;
    } else if (clientAdminTs >= sessionAdminTs) {
      s.adminModifiedTimestamp = clientAdminTs;
      session._lastProcessedAdminTs = clientAdminTs;
    }

    // Accrue Server-Authoritative Net Cashflow into Bank (Businesses + Real Estate + Cars + Bank Interest + Careers)
    accrueAuthoritativeCashflow(s, Date.now());

    if (clientState.xp !== undefined) {
      s.xp = (isClientStale && !isAdminGrant) ? Math.max(Number(s.xp || 0), Number(clientState.xp) || 0) : (Number(clientState.xp) || 0);
    }
    if (clientState.title) s.title = String(clientState.title);
    if (clientState.jobId) s.jobId = String(clientState.jobId);
    if (clientState.jailTimer !== undefined) s.jailTimer = Number(clientState.jailTimer) || 0;
    if (clientState.totalTaxesPaid !== undefined) s.totalTaxesPaid = Number(clientState.totalTaxesPaid) || 0;

    // Ensure security fields are never stored in state
    delete s.pin;
    delete s.password;



    // Agro Farm Tycoon (Officially open to all players)
    if (clientState.farm && typeof clientState.farm === 'object') {
      const sFarmLiq = (s.farm && s.farm.dailyLiquidation && typeof s.farm.dailyLiquidation === 'object') ? s.farm.dailyLiquidation : null;
      const cFarmLiq = (clientState.farm.dailyLiquidation && typeof clientState.farm.dailyLiquidation === 'object') ? clientState.farm.dailyLiquidation : null;
      if (s.farm && s.farm.livestock && clientState.farm.livestock && !isAdminGrant) {
        clientState.farm.livestock.cows = Math.min(Number(clientState.farm.livestock.cows || 0), Number(s.farm.livestock.cows || 0));
        clientState.farm.livestock.chickens = Math.min(Number(clientState.farm.livestock.chickens || 0), Number(s.farm.livestock.chickens || 0));
      }
      s.farm = clientState.farm;
      if (sFarmLiq && cFarmLiq && sFarmLiq.date === cFarmLiq.date) {
        s.farm.dailyLiquidation = {
          date: sFarmLiq.date,
          totalLiquidated: Math.max(Number(sFarmLiq.totalLiquidated || 0), Number(cFarmLiq.totalLiquidated || 0))
        };
      } else if (cFarmLiq) {
        s.farm.dailyLiquidation = { ...cFarmLiq };
      } else if (sFarmLiq) {
        s.farm.dailyLiquidation = { ...sFarmLiq };
      }
      const landLvl = Math.max(1, Number(s.farm.landLevel || 1));
      const expectedPlots = landLvl === 1 ? 4 : (landLvl === 2 ? 8 : (landLvl === 3 ? 12 : (landLvl >= 4 ? 16 : 4)));
      s.farm.maxPlots = Math.max(Number(s.farm.maxPlots) || 4, expectedPlots);
      if (!Array.isArray(s.farm.plots)) s.farm.plots = [];
      while (s.farm.plots.length < s.farm.maxPlots) s.farm.plots.push(null);
      if (s.farm.plots.length > s.farm.maxPlots) s.farm.plots = s.farm.plots.slice(0, s.farm.maxPlots);
    }

    // International Airport Hub & Fleet Synchronization
    if (clientState.airport && typeof clientState.airport === 'object') {
      if (!s.airport || typeof s.airport !== 'object' || !s.airport.unlocked) {
        if (clientState.airport.unlocked) {
          s.airport = JSON.parse(JSON.stringify(clientState.airport));
        }
      } else {
        if (clientState.airport.name) s.airport.name = clientState.airport.name;
        if (clientState.airport.facilities) {
          s.airport.facilities = s.airport.facilities || { runway: 1, terminals: 1, hangar: 1, duty_free: 0 };
          ['runway', 'terminals', 'hangar', 'duty_free'].forEach(k => {
            const cLvl = Number(clientState.airport.facilities[k]) || 0;
            const sLvl = Number(s.airport.facilities[k]) || 0;
            if (cLvl > sLvl) s.airport.facilities[k] = cLvl;
          });
        }
        if (Array.isArray(clientState.airport.fleet)) {
          if (!Array.isArray(s.airport.fleet) || s.airport.fleet.length === 0) {
            s.airport.fleet = JSON.parse(JSON.stringify(clientState.airport.fleet));
          } else {
            const srvMap = new Map();
            s.airport.fleet.forEach(p => srvMap.set(p.id, p));

            clientState.airport.fleet.forEach(cPlane => {
              const sPlane = srvMap.get(cPlane.id);
              if (sPlane) {
                const cFlight = cPlane.activeFlight || cPlane.currentFlight;
                const sFlight = sPlane.activeFlight || sPlane.currentFlight;
                const cFlightId = cFlight && (cFlight.flightId || ('flt_' + cPlane.id + '_' + cFlight.launchTime));
                const claimedIds = Array.isArray(s.airport.claimedFlightIds) ? s.airport.claimedFlightIds : [];

                if (cPlane.status === 'in_flight' && cFlight && cFlight.launchTime) {
                  // Strict Check 1: If flight was already claimed, NEVER resurrect it!
                  if (cFlightId && (claimedIds.includes(cFlightId) || sPlane.lastClaimedFlightId === cFlightId)) {
                    sPlane.status = 'idle';
                    sPlane.activeFlight = null;
                    sPlane.currentFlight = null;
                    return;
                  }

                  const now = Date.now();
                  const isLanded = Number(cFlight.landingTime || 0) <= now;

                  // Strict Check 2: If server plane is idle and flight has already landed, do NOT resurrect!
                  if (sPlane.status === 'idle' && isLanded) {
                    return;
                  }

                  const sLaunch = sFlight ? Number(sFlight.launchTime || 0) : 0;
                  if (Number(cFlight.launchTime) > sLaunch || (sPlane.status === 'idle' && !isLanded)) {
                    sPlane.status = 'in_flight';
                    sPlane.activeFlight = JSON.parse(JSON.stringify(cFlight));
                    sPlane.currentFlight = JSON.parse(JSON.stringify(cFlight));
                  }
                } else if (cPlane.status === 'idle') {
                  if (sPlane.status === 'in_flight') {
                    sPlane.status = 'idle';
                    sPlane.activeFlight = null;
                    sPlane.currentFlight = null;
                  }
                }
                sPlane.totalFlights = Math.max(Number(sPlane.totalFlights) || 0, Number(cPlane.totalFlights) || 0);
                sPlane.totalRevenue = Math.max(Number(sPlane.totalRevenue) || 0, Number(cPlane.totalRevenue) || 0);
              } else {
                // Preserve newly bought plane from client (up to max fleet limit 12)
                if (s.airport.fleet.length < 12 && cPlane && cPlane.modelId && (!AIRCRAFT_MODELS || AIRCRAFT_MODELS[cPlane.modelId])) {
                  s.airport.fleet.push(JSON.parse(JSON.stringify(cPlane)));
                  srvMap.set(cPlane.id, cPlane);
                }
              }
            });
          }
        }
        if (Array.isArray(clientState.airport.claimedFlightIds)) {
          const existingClaims = Array.isArray(s.airport.claimedFlightIds) ? s.airport.claimedFlightIds : [];
          s.airport.claimedFlightIds = Array.from(new Set([...existingClaims, ...clientState.airport.claimedFlightIds])).slice(-100);
        }
        if (clientState.airport.stats) {
          s.airport.stats = s.airport.stats || {};
          ['totalFlights', 'totalRevenue', 'totalOperatingCost', 'totalNetProfit', 'totalDutyFreeCollected', 'transitPermitsAccepted'].forEach(statK => {
            s.airport.stats[statK] = Math.max(Number(s.airport.stats[statK]) || 0, Number(clientState.airport.stats[statK]) || 0);
          });
        }
        if (clientState.airport.lastDutyFreeCollectionAt) {
          const cDuty = Number(clientState.airport.lastDutyFreeCollectionAt);
          const sDuty = Number(s.airport.lastDutyFreeCollectionAt || 0);
          if (cDuty > sDuty) s.airport.lastDutyFreeCollectionAt = cDuty;
        }
        if (clientState.airport.lastTransitPermitAt) {
          const cTransit = Number(clientState.airport.lastTransitPermitAt);
          const sTransit = Number(s.airport.lastTransitPermitAt || 0);
          if (cTransit > sTransit) s.airport.lastTransitPermitAt = cTransit;
        }
        if (clientState.airport.lastTransitCollectionAt) {
          const cColl = Number(clientState.airport.lastTransitCollectionAt);
          const sColl = Number(s.airport.lastTransitCollectionAt || 0);
          if (cColl > sColl) s.airport.lastTransitCollectionAt = cColl;
        }
        if (clientState.airport.manager && typeof clientState.airport.manager === 'object') {
          const cTier = Number(clientState.airport.manager.tier || 0);
          const sTier = Number(s.airport.manager?.tier || 0);
          if (cTier > sTier || (cTier === sTier && !s.airport.manager)) {
            s.airport.manager = JSON.parse(JSON.stringify(clientState.airport.manager));
          } else if (s.airport.manager && clientState.airport.manager.autoPilot !== undefined) {
            s.airport.manager.autoPilot = clientState.airport.manager.autoPilot;
          }
        }
      }
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
      if (isAdminGrant) {
        s.industry = clientState.industry;
      } else {
        // Dual Lockdown: Stages & unlocks are strictly Server-Authoritative.
        // Sync merges operational fields (readyStock, lastCollectedAt) while preserving server levels.
        Object.keys(s.industry).forEach(secKey => {
          const sSec = s.industry[secKey];
          const cSec = clientState.industry[secKey];
          if (sSec && sSec.unlocked && cSec && typeof cSec === 'object') {
            sSec.readyStock = Number(cSec.readyStock) || sSec.readyStock || 0;
            if (cSec.lastCollectedAt) sSec.lastCollectedAt = cSec.lastCollectedAt;
          }
        });
      }
    }
    if (clientState.activeCar !== undefined && !isClientStale) {
      s.activeCar = clientState.activeCar;
    }
    if (clientState.crypto && typeof clientState.crypto === 'object') {
      s.crypto = clientState.crypto;
    }
    if (Array.isArray(clientState.investments)) {
      if (isAdminGrant) {
        s.investments = clientState.investments;
      } else {
        // Dual Lockdown: Term investments must be purchased via /api/action/investment/start.
        // Sync can only advance ticksRemaining on valid server certificates.
        const srvMap = new Map((s.investments || []).map(inv => [inv.id, inv]));
        clientState.investments.forEach(cInv => {
          const sInv = srvMap.get(cInv.id);
          if (sInv && cInv.ticksRemaining !== undefined) {
            sInv.ticksRemaining = Math.min(Number(sInv.ticksRemaining), Number(cInv.ticksRemaining));
          }
        });
      }
    }
    if (clientState.tradeCompany && typeof clientState.tradeCompany === 'object') {
      if (!s.tradeCompany || typeof s.tradeCompany !== 'object') {
        s.tradeCompany = { warehouseCapacity: 10, warehouse: {}, activeImports: [], activeExports: [] };
      }
      if (isAdminGrant) {
        s.tradeCompany = clientState.tradeCompany;
      } else {
        // Dual Lockdown: warehouseCapacity is server-authoritative.
        if (clientState.tradeCompany.warehouse && typeof clientState.tradeCompany.warehouse === 'object') {
          s.tradeCompany.warehouse = clientState.tradeCompany.warehouse;
        }
        if (Array.isArray(clientState.tradeCompany.activeExports)) {
          s.tradeCompany.activeExports = clientState.tradeCompany.activeExports;
        }
        if (Array.isArray(clientState.tradeCompany.activeImports)) {
          const srvMap = new Map((s.tradeCompany.activeImports || []).map(o => [o.id, o]));
          clientState.tradeCompany.activeImports.forEach(cOrder => {
            const sOrder = srvMap.get(cOrder.id);
            if (sOrder && cOrder.arrived !== undefined) {
              sOrder.arrived = Boolean(cOrder.arrived);
            }
          });
        }
      }
    }
    if (clientState.inventory && typeof clientState.inventory === 'object') {
      if (isAdminGrant) {
        s.inventory = clientState.inventory;
      } else {
        // Dual Lockdown: Inventory items must be purchased via server endpoints.
        s.inventory = s.inventory || {};
        Object.keys(s.inventory).forEach(k => {
          if (clientState.inventory[k] === 0 || clientState.inventory[k] === undefined) {
            s.inventory[k] = 0;
          }
        });
      }
    }
    if (clientState.smugglingFleet && typeof clientState.smugglingFleet === 'object') {
      if (isAdminGrant) {
        s.smugglingFleet = clientState.smugglingFleet;
      } else {
        // Server-authoritative smuggling fleet
        s.smugglingFleet = s.smugglingFleet || {};
      }
    }
    if (clientState.executiveGear && typeof clientState.executiveGear === 'object') {
      s.executiveGear = s.executiveGear || {
        ledger: { unlocked: false, level: 1, stars: 1 },
        laptop: { unlocked: false, level: 1, stars: 1 },
        pen: { unlocked: false, level: 1, stars: 1 },
        terminal: { unlocked: false, level: 1, stars: 1 }
      };
      ['ledger', 'laptop', 'pen', 'terminal'].forEach(gKey => {
        const cG = clientState.executiveGear[gKey];
        if (cG && typeof cG === 'object') {
          const sG = s.executiveGear[gKey] || { unlocked: false, level: 1, stars: 1 };
          sG.unlocked = sG.unlocked || Boolean(cG.unlocked);
          sG.level = Math.max(Number(sG.level || 1), Number(cG.level || 1));
          sG.stars = Math.max(Number(sG.stars || 1), Number(cG.stars || 1));
          s.executiveGear[gKey] = sG;
        }
      });
    }
    if (clientState.activityLog && Array.isArray(clientState.activityLog)) {
      s.activityLog = clientState.activityLog.slice(0, 3500);
    }
    // Never allow client to overwrite secret staff notes; preserve server-authoritative notes
    if (!Array.isArray(s.staffNotes)) {
      s.staffNotes = [];
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
    // Anchor daily tracking to official Cairo timezone (UTC+3)
    const serverToday = (() => {
      const d = new Date(Date.now() + (3 * 3600 * 1000));
      return d.toISOString().split('T')[0];
    })();

    // Check if server has an active authoritative reset for daily limits (exclusive to explicit limits reset)
    const sLimitsResetAt = Number(s.limitsResetAt || 0);
    const cLimitsResetAck = Number(clientState.lastLimitsResetAck || 0);
    const isAuthoritativeLimitsReset = (sLimitsResetAt > 0 && sLimitsResetAt > cLimitsResetAck);

    if (clientState.dailyLoans && typeof clientState.dailyLoans === 'object') {
      s.dailyLoans = {
        date: serverToday,
        count: isAuthoritativeLimitsReset ? 0 : Math.min(10, Math.max(0, Number(clientState.dailyLoans.count || 0)))
      };
    }

    // Synchronize daily activities & cooldowns (Anchored strictly to trusted Cairo date)
    if (clientState.dailyInvestments && typeof clientState.dailyInvestments === 'object') {
      s.dailyInvestments = {
        date: serverToday,
        count: isAuthoritativeLimitsReset ? 0 : Math.min(20, Math.max(0, Number(clientState.dailyInvestments.count || 0)))
      };
    }

    // Synchronize Daily Stock Profit, Work & Farm Liquidation (Prevent cap reset via device timezone manipulation & respect admin resets)
    if (isAuthoritativeLimitsReset) {
      s.dailyStockProfit = { date: serverToday, realizedProfit: 0 };
      s.dailyWork = { date: serverToday, shifts: 0, overtimeShifts: 0 };
      s.dailyBlackMarket = { date: serverToday, count: 0 };
      if (!s.farm) s.farm = {};
      s.farm.dailyLiquidation = { date: serverToday, totalLiquidated: 0 };
      s.dailyLoans = { date: serverToday, count: 0 };
      s.dailyInvestments = { date: serverToday, count: 0 };
      s.dailyCasinoNetProfit = 0;
      s.workCooldownUntil = 0;
      s.overtimeCooldownUntil = 0;
      s.stockTradeCooldownUntil = 0;
    } else {
      if (clientState.dailyStockProfit && typeof clientState.dailyStockProfit === 'object') {
        const sDate = s.dailyStockProfit ? String(s.dailyStockProfit.date || '') : '';
        const cDate = String(clientState.dailyStockProfit.date || '');
        if (sDate === serverToday && cDate === serverToday) {
          s.dailyStockProfit = {
            date: serverToday,
            realizedProfit: Math.min(3000000, Math.max(Number(s.dailyStockProfit.realizedProfit || 0), Number(clientState.dailyStockProfit.realizedProfit || 0)))
          };
        } else if (cDate === serverToday) {
          s.dailyStockProfit = {
            date: serverToday,
            realizedProfit: Math.min(3000000, Math.max(0, Number(clientState.dailyStockProfit.realizedProfit || 0)))
          };
        } else if (sDate === serverToday) {
          s.dailyStockProfit = {
            date: serverToday,
            realizedProfit: Math.min(3000000, Math.max(0, Number(s.dailyStockProfit.realizedProfit || 0)))
          };
        } else {
          s.dailyStockProfit = {
            date: serverToday,
            realizedProfit: 0
          };
        }
      } else if (s.dailyStockProfit && s.dailyStockProfit.date !== serverToday) {
        s.dailyStockProfit = { date: serverToday, realizedProfit: 0 };
      }

      if (clientState.dailyWork && typeof clientState.dailyWork === 'object') {
        const sDate = s.dailyWork ? String(s.dailyWork.date || '') : '';
        const cDate = String(clientState.dailyWork.date || '');
        if (sDate === serverToday && cDate === serverToday) {
          s.dailyWork = {
            date: serverToday,
            shifts: Math.min(100, Math.max(Number(s.dailyWork.shifts || 0), Number(clientState.dailyWork.shifts || 0))),
            overtimeShifts: Math.min(15, Math.max(Number(s.dailyWork.overtimeShifts || 0), Number(clientState.dailyWork.overtimeShifts || 0)))
          };
        } else if (cDate === serverToday) {
          s.dailyWork = {
            date: serverToday,
            shifts: Math.min(100, Math.max(0, Number(clientState.dailyWork.shifts || 0))),
            overtimeShifts: Math.min(15, Math.max(0, Number(clientState.dailyWork.overtimeShifts || 0)))
          };
        } else if (sDate === serverToday) {
          s.dailyWork = {
            date: serverToday,
            shifts: Math.min(100, Math.max(0, Number(s.dailyWork.shifts || 0))),
            overtimeShifts: Math.min(15, Math.max(0, Number(s.dailyWork.overtimeShifts || 0)))
          };
        } else {
          s.dailyWork = {
            date: serverToday,
            shifts: 0,
            overtimeShifts: 0
          };
        }
      } else if (s.dailyWork && s.dailyWork.date !== serverToday) {
        s.dailyWork = { date: serverToday, shifts: 0, overtimeShifts: 0 };
      }

      // Synchronize Daily Farm Liquidation Cap (20,000,000 EGP per day)
      if (!s.farm) s.farm = {};
      const sFarmLiq = (s.farm && s.farm.dailyLiquidation && typeof s.farm.dailyLiquidation === 'object') ? s.farm.dailyLiquidation : null;
      const cFarmLiq = (clientState.farm && clientState.farm.dailyLiquidation && typeof clientState.farm.dailyLiquidation === 'object') ? clientState.farm.dailyLiquidation : null;
      const sFarmDate = sFarmLiq ? String(sFarmLiq.date || '') : '';
      const cFarmDate = cFarmLiq ? String(cFarmLiq.date || '') : '';

      if (sFarmDate === serverToday && cFarmDate === serverToday) {
        s.farm.dailyLiquidation = {
          date: serverToday,
          totalLiquidated: Math.min(20000000, Math.max(Number(sFarmLiq.totalLiquidated || 0), Number(cFarmLiq.totalLiquidated || 0)))
        };
      } else if (cFarmDate === serverToday) {
        s.farm.dailyLiquidation = {
          date: serverToday,
          totalLiquidated: Math.min(20000000, Math.max(0, Number(cFarmLiq.totalLiquidated || 0)))
        };
      } else if (sFarmDate === serverToday) {
        s.farm.dailyLiquidation = {
          date: serverToday,
          totalLiquidated: Math.min(20000000, Math.max(0, Number(sFarmLiq.totalLiquidated || 0)))
        };
      } else {
        s.farm.dailyLiquidation = {
          date: serverToday,
          totalLiquidated: 0
        };
      }
    }

    // Enforce 5M server-authoritative casino daily net profit cap
    if (clientState.dailyCasinoNetProfit !== undefined) {
      s.dailyCasinoNetProfit = isAuthoritativeLimitsReset ? 0 : Math.min(5000000, Math.max(0, Number(clientState.dailyCasinoNetProfit) || 0));
    }
    if (clientState.dailyBlackMarket && typeof clientState.dailyBlackMarket === 'object') {
      const cDate = String(clientState.dailyBlackMarket.date || '');
      const sDate = s.dailyBlackMarket ? String(s.dailyBlackMarket.date || '') : '';
      if (isAuthoritativeLimitsReset) {
        s.dailyBlackMarket = { date: serverToday, count: 0 };
      } else if (cDate === serverToday && sDate === serverToday) {
        s.dailyBlackMarket = {
          date: serverToday,
          count: Math.min(15, Math.max(Number(s.dailyBlackMarket.count || 0), Number(clientState.dailyBlackMarket.count || 0)))
        };
      } else if (cDate === serverToday) {
        s.dailyBlackMarket = {
          date: serverToday,
          count: Math.min(15, Math.max(0, Number(clientState.dailyBlackMarket.count || 0)))
        };
      } else if (sDate === serverToday) {
        s.dailyBlackMarket = {
          date: serverToday,
          count: Math.min(15, Math.max(0, Number(s.dailyBlackMarket.count || 0)))
        };
      } else {
        s.dailyBlackMarket = {
          date: serverToday,
          count: 0
        };
      }
    } else if (s.dailyBlackMarket && s.dailyBlackMarket.date !== serverToday) {
      s.dailyBlackMarket = { date: serverToday, count: 0 };
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

    // Telegram Reward Claim Integrity Shield (Once true, NEVER reverts to false)
    if (s.telegramClaimed || s.telegramRewardClaimed) {
      s.telegramClaimed = true;
      s.telegramRewardClaimed = true;
    } else if (clientState.telegramClaimed || clientState.telegramRewardClaimed) {
      s.telegramClaimed = true;
      s.telegramRewardClaimed = true;
      s.telegramClaimedAt = Number(clientState.telegramClaimedAt) || Date.now();
    }
    if (!Array.isArray(s.badges)) s.badges = [];
    if (Array.isArray(clientState.badges)) {
      clientState.badges.forEach(b => {
        if (b && !s.badges.includes(b)) s.badges.push(b);
      });
    }

    s.netWorth = calculateNetWorth(s);
    s.title = getAppropriateTitle(s.netWorth, s.xp || 0);
    s.lastActiveTimestamp = Number(clientState.lastActiveTimestamp || Date.now());
    s.lastSeen = Date.now();
    session.lastActivity = Date.now();

    if (immediate) {
      await this.forceSaveSession(username);
    } else {
      this.markDirty(username);
    }
    return true;
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
