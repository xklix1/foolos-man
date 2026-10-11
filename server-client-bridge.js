/**
 * Ras ALmal Tycoon — Authoritative Server Client Bridge
 * Seamlessly routes player actions from the UI to the Server-Authoritative Engine.
 * 
 * Features:
 * - Optimistic UI rendering with automatic rollback on server rejection
 * - Anti-cheat click batching & rate limiting
 * - Authoritative offline profit synchronization
 * - Resilient fallback to local DB adapter if server is unreachable
 */

var ServerBridge = (() => {
  console.log('[ServerBridge] Initializing Authoritative Client Bridge...');

  function getApiBase() {
    if (typeof window !== 'undefined' && window.SERVER_API_URL) {
      return window.SERVER_API_URL.replace(/\/$/, '');
    }
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'http://localhost:3001';
    }
    return '';
  }

  let _activeUsername = null;
  let _sessionToken = null;
  let _isServerOnline = false;
  let _heartbeatTimer = null;
  let _clickBatchQueue = 0;
  let _clickBatchTimer = null;
  let _batchStartTime = 0;

  function resolveEffectiveToken(targetUser = null) {
    if (_sessionToken) return _sessionToken;
    const user = targetUser || _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (user && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('rasalmal_auth_token_' + String(user).trim());
        if (stored) {
          _sessionToken = stored;
          return stored;
        }
      } catch (_) {}
    }
    if (typeof window !== 'undefined' && window.AppDB && typeof window.AppDB.getActiveSessionToken === 'function') {
      try {
        const dbTok = window.AppDB.getActiveSessionToken();
        if (dbTok) return dbTok;
      } catch (_) {}
    }
    return null;
  }

  async function _get(endpoint) {
    const base = getApiBase();
    const url = `${base}${endpoint}`;
    const headers = {};
    if (_sessionToken) {
      headers['Authorization'] = `Bearer ${_sessionToken}`;
    }
    const res = await fetch(url, {
      method: 'GET',
      headers
    });
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errMsg = errJson.error || errJson.message || errMsg;
      } catch (e) {}
      throw new Error(errMsg);
    }
    return await res.json();
  }

  async function _post(endpoint, body = {}) {
    const base = getApiBase();
    const url = `${base}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    const token = resolveEffectiveToken(body && body.username);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      if (body && typeof body === 'object' && !body.token && endpoint !== '/api/session/start') {
        body.token = token;
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      let errCode = null;
      try {
        const errJson = await res.json();
        errMsg = errJson.error || errJson.message || errMsg;
        errCode = errJson.code || null;
      } catch (e) {}

      // Handle 401 Unauthorized / Expired session
      if (res.status === 401 || errCode === 'INVALID_SESSION_TOKEN' || (typeof errMsg === 'string' && (errMsg.includes('Invalid session token') || errMsg.includes('expired session token')))) {
        console.warn('[ServerBridge] 401 Session Token Unauthorized on:', endpoint, errMsg);
        const user = _activeUsername || (body && body.username);
        if (user && typeof localStorage !== 'undefined') {
          try {
            localStorage.removeItem('rasalmal_auth_token_' + String(user).trim());
          } catch (_) {}
        }
        _sessionToken = null;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('rasalmal:session-expired', {
            detail: { username: user, endpoint, error: errMsg }
          }));
        }
      }

      const errorObj = new Error(errMsg);
      errorObj.status = res.status;
      errorObj.code = errCode;
      errorObj.isAuthError = (res.status === 401);
      throw errorObj;
    }

    return await res.json();
  }

  /**
   * Initializes player session on server, running authoritative offline calculations
   */
  async function startSession(username, pin = null, token = null) {
    if (!username) return null;
    _activeUsername = username.trim();

    try {
      const clientSessionToken = (typeof window !== 'undefined' && window.AppDB && typeof window.AppDB.getActiveSessionToken === 'function')
        ? window.AppDB.getActiveSessionToken()
        : null;

      let effectiveToken = token || resolveEffectiveToken(_activeUsername);
      if (effectiveToken) {
        _sessionToken = effectiveToken;
      }

      // Collect client device telemetry hints
      let deviceInfo = {
        screen: (typeof window !== 'undefined' && window.screen) ? `${window.screen.width}x${window.screen.height}` : null,
        pixelRatio: (typeof window !== 'undefined') ? (window.devicePixelRatio || 1) : 1,
        platform: (typeof navigator !== 'undefined') ? (navigator.platform || '') : '',
        language: (typeof navigator !== 'undefined') ? (navigator.language || '') : ''
      };

      if (typeof navigator !== 'undefined' && navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
        try {
          const hints = await Promise.race([
            navigator.userAgentData.getHighEntropyValues(['model', 'platform', 'platformVersion']),
            new Promise(r => setTimeout(() => r(null), 120))
          ]);
          if (hints && hints.model) {
            deviceInfo.model = hints.model;
          }
        } catch (_) {}
      }

      const data = await _post('/api/session/start', {
        username: _activeUsername,
        pin: pin,
        token: effectiveToken,
        sessionId: clientSessionToken,
        deviceInfo: deviceInfo
      });

      if (data && data.sessionToken) {
        _sessionToken = data.sessionToken;
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem('rasalmal_auth_token_' + _activeUsername, _sessionToken);
          } catch (storageErr) {}
        }
      }

      _isServerOnline = true;
      console.log('[ServerBridge] Connected to Authoritative Server. Offline report:', data.offlineReport);

      // Start automatic heartbeat every 30 seconds
      if (_heartbeatTimer) clearInterval(_heartbeatTimer);
      _heartbeatTimer = setInterval(sendHeartbeat, 30000);
      if (_heartbeatTimer && typeof _heartbeatTimer.unref === 'function') {
        _heartbeatTimer.unref();
      }

      return data;
    } catch (err) {
      console.warn('[ServerBridge] Server session start failed, falling back to local adapter:', err.message);
      if (err.status === 401 || (err.message && (err.message.includes('Invalid') || err.message.includes('expired')))) {
        if (_activeUsername && typeof localStorage !== 'undefined') {
          try { localStorage.removeItem('rasalmal_auth_token_' + _activeUsername); } catch (_) {}
        }
        _sessionToken = null;
      }
      _isServerOnline = false;
      return null;
    }
  }

  /**
   * Dispatches batched clicker actions to the server
   */
  function dispatchClick(clickPower = 1) {
    _clickBatchQueue++;
    if (!_batchStartTime) _batchStartTime = Date.now();

    if (!_clickBatchTimer) {
      _clickBatchTimer = setTimeout(async () => {
        const count = _clickBatchQueue;
        const durationMs = Math.max(100, Date.now() - _batchStartTime);
        _clickBatchQueue = 0;
        _clickBatchTimer = null;
        _batchStartTime = 0;

        if (_isServerOnline && _activeUsername) {
          try {
            const res = await _post('/api/action/click', {
              username: _activeUsername,
              count,
              durationMs
            });
            // Synchronize state if needed
            if (typeof GameEngine !== 'undefined' && res.cash !== undefined) {
              const s = GameEngine.getState ? GameEngine.getState() : null;
              if (s) {
                s.cash = res.cash;
                s.xp = res.xp;
                s.netWorth = res.netWorth;
                s.title = res.title;
              }
            }
          } catch (e) {
            console.warn('[ServerBridge] Click action failed:', e.message);
          }
        }
      }, 500); // 500ms micro-batching window
    }
  }

  function _reconcileBusinessResponse(res) {
    if (!res || !res.success) return res;
    if (typeof GameEngine !== 'undefined') {
      const s = GameEngine.getState ? GameEngine.getState() : (GameEngine.state || null);
      if (s) {
        if (res.cash !== undefined) s.cash = res.cash;
        if (res.netWorth !== undefined) s.netWorth = res.netWorth;
        if (res.title !== undefined) s.title = res.title;
        if (res.afkManagerExpiresAt !== undefined) s.afkManagerExpiresAt = res.afkManagerExpiresAt;
        if (res.businesses && typeof res.businesses === 'object') {
          s.businesses = s.businesses || {};
          Object.assign(s.businesses, res.businesses);
        }
      }
      if (typeof UI !== 'undefined') {
        if (UI.renderBusinesses) { try { UI.renderBusinesses(true); } catch (_) {} }
        if (UI.renderStatsBar) { try { UI.renderStatsBar(); } catch (_) {} }
      }
    }
    return res;
  }

  /**
   * Purchases or upgrades a business authoritatively on the server
   */
  async function buyBusiness(businessId) {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/buy-business', {
      username: _activeUsername,
      businessId
    });
    return _reconcileBusinessResponse(res);
  }

  /**
   * Authoritatively renews the 12-hour AFK Manager
   */
  async function renewAfkManager() {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/renew-afk', {
      username: _activeUsername
    });
    return _reconcileBusinessResponse(res);
  }

  /**
   * Authoritatively supplies goods to a specific business
   */
  async function supplyBusiness(businessId) {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/business/supply', {
      username: _activeUsername,
      businessId
    });
    return _reconcileBusinessResponse(res);
  }

  /**
   * Authoritatively purchases business supplies
   */
  async function buySupplies(hours = 12) {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/buy-supplies', {
      username: _activeUsername,
      hours
    });
    return _reconcileBusinessResponse(res);
  }

  /**
   * Authoritatively hires a worker for a business
   */
  async function hireWorker(businessId) {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/business/hire-worker', {
      username: _activeUsername,
      businessId
    });
    return _reconcileBusinessResponse(res);
  }

  /**
   * Authoritatively fires a worker from a business
   */
  async function fireWorker(businessId) {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/business/fire-worker', {
      username: _activeUsername,
      businessId
    });
    return _reconcileBusinessResponse(res);
  }

  function _reconcileGenericActionResponse(res, updateFn) {
    if (!res || !res.success) return res;
    if (typeof GameEngine !== 'undefined') {
      const s = GameEngine.getState ? GameEngine.getState() : (GameEngine.state || null);
      if (s) {
        if (res.cash !== undefined) s.cash = res.cash;
        if (res.bank !== undefined) s.bank = res.bank;
        if (res.dirtyCash !== undefined) s.dirtyCash = res.dirtyCash;
        if (res.netWorth !== undefined) s.netWorth = res.netWorth;
        if (res.title !== undefined) s.title = res.title;
        if (res.xp !== undefined) s.xp = res.xp;
        if (typeof updateFn === 'function') updateFn(s, res);
      }
      if (typeof UI !== 'undefined' && UI.renderStatsBar) {
        try { UI.renderStatsBar(); } catch (_) {}
      }
    }
    return res;
  }

  async function unlockIndustrySector(sectorId) {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/industry/unlock', { username: _activeUsername, sectorId });
    return _reconcileGenericActionResponse(res, (s, r) => {
      if (r.industry) s.industry = r.industry;
      if (typeof UI !== 'undefined' && UI.renderIndustryEmpirePanel) { try { UI.renderIndustryEmpirePanel(); } catch (_) {} }
    });
  }

  async function upgradeIndustryStage(sectorId, stageKey, multiplier = 1) {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/industry/upgrade', { username: _activeUsername, sectorId, stageKey, multiplier });
    return _reconcileGenericActionResponse(res, (s, r) => {
      if (r.industry) s.industry = r.industry;
      if (typeof UI !== 'undefined' && UI.renderIndustryEmpirePanel) { try { UI.renderIndustryEmpirePanel(); } catch (_) {} }
    });
  }

  async function buyImportCargo(commodityId, quantity = 1) {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/trade/buy-cargo', { username: _activeUsername, commodityId, quantity });
    return _reconcileGenericActionResponse(res, (s, r) => {
      if (r.tradeCompany) s.tradeCompany = r.tradeCompany;
      if (typeof UI !== 'undefined' && UI.renderTradeCompanyPanel) { try { UI.renderTradeCompanyPanel(); } catch (_) {} }
    });
  }

  async function upgradeWarehouse() {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/trade/upgrade-warehouse', { username: _activeUsername });
    return _reconcileGenericActionResponse(res, (s, r) => {
      if (r.tradeCompany) s.tradeCompany = r.tradeCompany;
      if (typeof UI !== 'undefined' && UI.renderTradeCompanyPanel) { try { UI.renderTradeCompanyPanel(); } catch (_) {} }
    });
  }

  async function startInvestment(planId, amount) {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/investment/start', { username: _activeUsername, planId, amount });
    return _reconcileGenericActionResponse(res, (s, r) => {
      if (r.investments) s.investments = r.investments;
      if (typeof UI !== 'undefined' && UI.renderInvestmentsPanel) { try { UI.renderInvestmentsPanel(); } catch (_) {} }
    });
  }

  async function buyFarmLivestock(type, count = 1) {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/farm/buy-livestock', { username: _activeUsername, type, count });
    return _reconcileGenericActionResponse(res, (s, r) => {
      if (r.farm) s.farm = r.farm;
      if (typeof UI !== 'undefined' && UI.renderFarmPanel) { try { UI.renderFarmPanel(); } catch (_) {} }
    });
  }

  async function buyStoreItem(itemId) {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/store/buy-item', { username: _activeUsername, itemId });
    return _reconcileGenericActionResponse(res, (s, r) => {
      if (r.inventory) s.inventory = r.inventory;
      if (r.itemDurations) s.itemDurations = r.itemDurations;
      if (typeof UI !== 'undefined' && UI.renderStorePanel) { try { UI.renderStorePanel(); } catch (_) {} }
    });
  }

  async function buyBlackMarketGear(gearId) {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/black-market/buy-gear', { username: _activeUsername, gearId });
    return _reconcileGenericActionResponse(res, (s, r) => {
      if (r.inventory) s.inventory = r.inventory;
      if (typeof UI !== 'undefined' && UI.renderBlackMarketPanel) { try { UI.renderBlackMarketPanel(); } catch (_) {} }
    });
  }

  async function bribePolice() {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/black-market/bribe', { username: _activeUsername });
    return _reconcileGenericActionResponse(res, (s, r) => {
      s.jailTimer = 0;
      s.heatLevel = 0;
      s.raidActive = false;
      if (typeof UI !== 'undefined' && UI.renderBlackMarketPanel) { try { UI.renderBlackMarketPanel(); } catch (_) {} }
    });
  }

  async function buySmugglingVehicle(vehicleId) {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/smuggling/buy-vehicle', { username: _activeUsername, vehicleId });
    return _reconcileGenericActionResponse(res, (s, r) => {
      if (r.smugglingFleet) s.smugglingFleet = r.smugglingFleet;
      if (typeof UI !== 'undefined' && UI.renderSmugglingPanel) { try { UI.renderSmugglingPanel(); } catch (_) {} }
    });
  }

  async function launchMarketingCampaign(businessId) {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/business/marketing', { username: _activeUsername, businessId });
    return _reconcileGenericActionResponse(res, (s, r) => {
      if (s.businesses && s.businesses[businessId] && r.marketingTicks !== undefined) {
        s.businesses[businessId].marketingTicks = r.marketingTicks;
      }
      if (typeof UI !== 'undefined' && UI.renderBusinesses) { try { UI.renderBusinesses(true); } catch (_) {} }
    });
  }

  async function convertToFranchise(businessId) {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/business/franchise', { username: _activeUsername, businessId });
    return _reconcileGenericActionResponse(res, (s, r) => {
      if (s.businesses && s.businesses[businessId]) {
        s.businesses[businessId].isFranchise = true;
      }
      if (typeof UI !== 'undefined' && UI.renderBusinesses) { try { UI.renderBusinesses(true); } catch (_) {} }
    });
  }

  async function fileTaxDeclaration() {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/tax/file-declaration', { username: _activeUsername });
    return _reconcileGenericActionResponse(res, (s, r) => {
      if (r.totalTaxesPaid !== undefined) s.totalTaxesPaid = r.totalTaxesPaid;
    });
  }

  async function deductCasinoBet(betAmount, gameName = 'الكازينو') {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/casino/bet', { username: _activeUsername, betAmount, gameName });
    return _reconcileGenericActionResponse(res);
  }

  async function settleCasinoPayout(betAmount, grossPayout, gameName = 'الكازينو') {
    if (!_isServerOnline || !_activeUsername) return null;
    const res = await _post('/api/action/casino/settle', { username: _activeUsername, betAmount, grossPayout, gameName });
    return _reconcileGenericActionResponse(res);
  }

  /**
   * Bank deposit or withdrawal
   */
  async function bankAction(type, amount, isAll = false) {
    if (!_isServerOnline || !_activeUsername) return null;
    return await _post('/api/action/bank', {
      username: _activeUsername,
      type,
      amount,
      isAll: isAll || amount === 'all'
    });
  }

  /**
   * Sends 30-second heartbeat to maintain active session
   */
  async function sendHeartbeat() {
    if (!_isServerOnline || !_activeUsername) return;
    try {
      await _post('/api/session/heartbeat', { username: _activeUsername });
    } catch (e) {}
  }

  /**
   * Synchronizes full player state to the authoritative server
   */
  async function syncState(state, immediate = false, targetUsername = null) {
    const user = targetUsername || (state && state.username) || _activeUsername;
    if (!_isServerOnline || !user || !state) return null;

    // Identity integrity guard: NEVER sync if state belongs to a different username
    if (state.username && user && state.username.trim().toLowerCase() !== user.trim().toLowerCase()) {
      console.warn('[ServerBridge] syncState blocked: state.username mismatch with target user:', state.username, 'vs', user);
      return null;
    }

    try {
      const res = await _post('/api/session/sync-state', {
        username: user,
        state,
        immediate
      });
      if (res && res.adminModifiedTimestamp && typeof GameEngine !== 'undefined' && GameEngine.state) {
        GameEngine.state.adminModifiedTimestamp = Math.max(
          Number(GameEngine.state.adminModifiedTimestamp || 0),
          Number(res.adminModifiedTimestamp)
        );
      }
      if (res && res.authoritativeState && typeof GameEngine !== 'undefined') {
        const s = GameEngine.getState ? GameEngine.getState() : (GameEngine.state || null);
        if (s) {
          if (res.authoritativeState.cash !== undefined) s.cash = res.authoritativeState.cash;
          if (res.authoritativeState.bank !== undefined) s.bank = res.authoritativeState.bank;
          if (res.authoritativeState.dirtyCash !== undefined) s.dirtyCash = res.authoritativeState.dirtyCash;
          if (res.authoritativeState.netWorth !== undefined) s.netWorth = res.authoritativeState.netWorth;
          if (res.authoritativeState.title !== undefined) s.title = res.authoritativeState.title;
          if (res.authoritativeState.assets !== undefined) s.assets = res.authoritativeState.assets;
          if (res.authoritativeState.ownedCars !== undefined) s.ownedCars = res.authoritativeState.ownedCars;
          if (res.authoritativeState.stocks !== undefined) s.stocks = res.authoritativeState.stocks;
          if (res.authoritativeState.incomeVault !== undefined) s.incomeVault = res.authoritativeState.incomeVault;
        }
      }
      return res;
    } catch (e) {
      // Safe sync warning log without prematurely killing active UI
      console.warn('[ServerBridge] syncState warning:', e.message);
      return null;
    }
  }

  /**
   * Sends exit notification on page unload with latest state
   */
  function sendExit(customState = null) {
    const st = customState || (typeof window !== 'undefined' && window.GameEngine && window.GameEngine.state ? window.GameEngine.state : null);
    const user = (st && st.username) || _activeUsername;
    if (!_isServerOnline || !user) return;

    if (st && st.username && _activeUsername && st.username.trim().toLowerCase() !== _activeUsername.trim().toLowerCase()) {
      return; // Skip exit sync if state does not match active session user
    }

    const url = `${getApiBase()}/api/session/exit`;
    if (st) {
      const exitTs = (typeof window !== 'undefined' && window.AppDB && typeof window.AppDB.getTrustedNow === 'function')
        ? window.AppDB.getTrustedNow()
        : Date.now();
      st.lastActiveTimestamp = exitTs;
      st.lastSeen = exitTs;
    }
    const payload = JSON.stringify({
      username: user,
      state: st,
      token: _sessionToken
    });

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(_sessionToken ? { 'Authorization': `Bearer ${_sessionToken}` } : {})
        },
        body: payload,
        keepalive: true
      }).catch(() => {});
    }
  }

  /**
   * Clears the current session and stops all background timers on user logout
   */
  function clearSession() {
    if (_heartbeatTimer) clearInterval(_heartbeatTimer);
    if (_clickBatchTimer) clearTimeout(_clickBatchTimer);
    _heartbeatTimer = null;
    _clickBatchTimer = null;
    _clickBatchQueue = 0;
    if (_activeUsername && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('rasalmal_auth_token_' + _activeUsername);
      } catch (_) {}
    }
    _activeUsername = null;
    _sessionToken = null;
    _isServerOnline = false;
    console.log('[ServerBridge] Session completely cleared.');
  }

  // Attach exit and app-hide listeners (Desktop & Mobile)
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => sendExit());
    window.addEventListener('pagehide', () => sendExit());
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          sendExit();
        }
      });
    }
  }

  /**
   * Authoritatively changes player PIN
   */
  async function changePin(currentPin, newPin) {
    if (!_isServerOnline || !_activeUsername) return null;
    return await _post('/api/action/change-pin', {
      username: _activeUsername,
      currentPin,
      newPin
    });
  }

  /**
   * Notifies the server of a completed atomic wire transfer so recipient session in RAM is updated immediately
   */
  async function notifyWireTransfer(sender, recipient, amount) {
    if (!_isServerOnline || !sender || !recipient || !amount) return null;
    try {
      return await _post('/api/action/transfer-notify', {
        sender,
        recipient,
        amount: Number(amount)
      });
    } catch (e) {
      console.warn('[ServerBridge] notifyWireTransfer notice:', e.message);
      return null;
    }
  }

  /**
   * Authoritatively sends a peer-to-peer transfer request via server proxy
   */
  async function sendTransferRequest(sender, recipient, amount) {
    if (!_isServerOnline || !sender || !recipient || !amount) return null;
    try {
      return await _post('/api/action/transfer-request', {
        sender,
        recipient,
        amount: Number(amount)
      });
    } catch (e) {
      console.warn('[ServerBridge] sendTransferRequest error:', e.message);
      return null;
    }
  }

  async function submitTopupRequest(requestData) {
    if (!_isServerOnline) return null;
    try {
      const res = await _post('/api/action/submit-topup', requestData);
      return (res && res.request) || null;
    } catch (e) {
      console.warn('[ServerBridge] submitTopupRequest error:', e.message);
      return null;
    }
  }

  async function registerAccount(playerRow) {
    let deviceInfo = {
      screen: (typeof window !== 'undefined' && window.screen) ? `${window.screen.width}x${window.screen.height}` : null,
      pixelRatio: (typeof window !== 'undefined') ? (window.devicePixelRatio || 1) : 1,
      platform: (typeof navigator !== 'undefined') ? (navigator.platform || '') : ''
    };
    return await _post('/api/session/register', { playerRow, deviceInfo });
  }

  function formatAvatarUrl(url) {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const base = getApiBase();
    if (url.startsWith('/')) {
      return base ? `${base}${url}` : url;
    }
    return base ? `${base}/${url}` : `/${url}`;
  }

  async function uploadAvatar(imageBase64) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const res = await _post('/api/action/upload-avatar', {
      username: user,
      imageBase64
    });
    return res;
  }

  async function removeAvatar() {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const res = await _post('/api/action/remove-avatar', {
      username: user
    });
    return res;
  }

  // ─────────────────────────────────────────────
  //  AIRPORT HUB AUTHORITATIVE ACTIONS
  // ─────────────────────────────────────────────
  async function unlockAirport(code, airportName) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    return await _post('/api/airport/unlock', {
      username: user,
      token,
      code,
      airportName
    });
  }

  async function renameAirport(name) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    return await _post('/api/airport/rename', {
      username: user,
      token,
      name
    });
  }

  async function upgradeAirportFacility(facilityId) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    return await _post('/api/airport/upgrade', {
      username: user,
      token,
      facilityId
    });
  }

  async function buyAirportPlane(modelId, customName) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    return await _post('/api/airport/buy-plane', {
      username: user,
      token,
      modelId,
      customName
    });
  }

  async function launchAirportFlight(planeId, destinationId) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    return await _post('/api/airport/launch-flight', {
      username: user,
      token,
      planeId,
      destinationId
    });
  }

  async function speedupAirportFlight(planeId) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    return await _post('/api/airport/speedup-flight', {
      username: user,
      token,
      planeId
    });
  }

  async function claimAirportFlight(planeId) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    return await _post('/api/airport/claim-flight', {
      username: user,
      token,
      planeId
    });
  }

  async function claimDutyFree() {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    return await _post('/api/airport/claim-duty-free', {
      username: user,
      token
    });
  }

  async function acceptAirportTransit() {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    return await _post('/api/airport/transit', {
      username: user,
      token
    });
  }

  async function sellAirportPlane(planeId) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    return await _post('/api/airport/sell-plane', {
      username: user,
      token,
      planeId
    });
  }

  async function hireAirportManager(tier = 1) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    return await _post('/api/airport/hire-manager', {
      username: user,
      token,
      tier
    });
  }

  async function toggleAirportAutopilot(enabled) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    return await _post('/api/airport/toggle-autopilot', {
      username: user,
      token,
      enabled
    });
  }

  async function unlockGear(gearId) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    return await _post('/api/action/gear/unlock', {
      username: user,
      token,
      gearId
    });
  }

  async function upgradeGear(gearId) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    return await _post('/api/action/gear/upgrade', {
      username: user,
      token,
      gearId
    });
  }

  // ── Authoritative Farm Bridge Actions ──
  function _reconcileFarmResponse(res) {
    if (!res || !res.success) return res;
    if (typeof GameEngine !== 'undefined') {
      const s = GameEngine.getState ? GameEngine.getState() : (GameEngine.state || null);
      if (s) {
        if (res.cash !== undefined) s.cash = res.cash;
        if (res.bank !== undefined) s.bank = res.bank;
        if (res.netWorth !== undefined) s.netWorth = res.netWorth;
        if (res.farm && typeof res.farm === 'object') {
          s.farm = res.farm;
        }
      }
      if (typeof UI !== 'undefined') {
        if (UI.renderFarmPanel) { try { UI.renderFarmPanel(); } catch (_) {} }
        if (UI.renderStatsBar) { try { UI.renderStatsBar(); } catch (_) {} }
      }
    }
    return res;
  }

  async function unlockFarm() {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/farm/unlock', { username: user, token });
    return _reconcileFarmResponse(res);
  }

  async function upgradeFarmLand() {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/farm/upgrade-land', { username: user, token });
    return _reconcileFarmResponse(res);
  }

  async function upgradeFarmIrrigation() {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/farm/upgrade-irrigation', { username: user, token });
    return _reconcileFarmResponse(res);
  }

  async function upgradeFarmFertilizer() {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/farm/upgrade-fertilizer', { username: user, token });
    return _reconcileFarmResponse(res);
  }

  async function upgradeFarmSilo() {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/farm/upgrade-silo', { username: user, token });
    return _reconcileFarmResponse(res);
  }

  async function hireFarmWorker() {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/farm/hire-worker', { username: user, token });
    return _reconcileFarmResponse(res);
  }

  async function plantFarmCrop(plotIndex, cropId) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/farm/plant', { username: user, token, plotIndex, cropId });
    return _reconcileFarmResponse(res);
  }

  async function plantAllFarmPlots(cropId) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/farm/plant-all', { username: user, token, cropId });
    return _reconcileFarmResponse(res);
  }

  async function harvestFarmCrop(plotIndex) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/farm/harvest', { username: user, token, plotIndex });
    return _reconcileFarmResponse(res);
  }

  async function harvestAllFarmPlots() {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/farm/harvest-all', { username: user, token });
    return _reconcileFarmResponse(res);
  }

  async function sellFarmCrop(cropId, qty, clientInventory = null) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/farm/sell', { username: user, token, cropId, qty, clientInventory });
    return _reconcileFarmResponse(res);
  }

  async function sellAllFarmCrops(clientInventory = null) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/farm/sell-all', { username: user, token, clientInventory });
    return _reconcileFarmResponse(res);
  }

  async function sellProcessedGood(recipeId, qty = null, clientStorage = null) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/farm/sell-processed', { username: user, token, recipeId, qty, clientStorage });
    return _reconcileFarmResponse(res);
  }

  async function sellLivestockProduce(produceKey, qty = null, clientProduce = null) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/farm/sell-livestock', { username: user, token, produceKey, qty, clientProduce });
    return _reconcileFarmResponse(res);
  }

  async function sellAllProcessedGoods(clientStorage = null) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/farm/sell-all-processed', { username: user, token, clientStorage });
    return _reconcileFarmResponse(res);
  }

  async function sellAllLivestockProduce(clientProduce = null) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/farm/sell-all-livestock', { username: user, token, clientProduce });
    return _reconcileFarmResponse(res);
  }

  async function fulfillFarmContract(contractId, contractData = null) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/farm/fulfill-contract', { username: user, token, contractId, contractData });
    return _reconcileFarmResponse(res);
  }

  // ── Authoritative Income Vault & Real Estate / Vehicles (Phase 1) ──
  async function claimIncome() {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/claim-income', { username: user, token });
    if (res && res.success && typeof GameEngine !== 'undefined') {
      const s = GameEngine.getState ? GameEngine.getState() : (GameEngine.state || null);
      if (s) {
        if (res.cash !== undefined) s.cash = res.cash;
        if (res.netWorth !== undefined) s.netWorth = res.netWorth;
        s.incomeVault = res.vault || 0;
      }
      if (typeof UI !== 'undefined' && UI.renderStatsBar) { try { UI.renderStatsBar(); } catch (_) {} }
    }
    return res;
  }

  async function buyProperty(assetId) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/property/buy', { username: user, token, assetId });
    if (res && res.success && typeof GameEngine !== 'undefined') {
      const s = GameEngine.getState ? GameEngine.getState() : (GameEngine.state || null);
      if (s) {
        if (res.cash !== undefined) s.cash = res.cash;
        if (res.netWorth !== undefined) s.netWorth = res.netWorth;
        if (res.assets) s.assets = res.assets;
      }
      if (typeof UI !== 'undefined') {
        if (UI.renderAssetsPanel) { try { UI.renderAssetsPanel(); } catch (_) {} }
        if (UI.renderStatsBar) { try { UI.renderStatsBar(); } catch (_) {} }
      }
    }
    return res;
  }

  async function sellProperty(assetId) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/property/sell', { username: user, token, assetId });
    if (res && res.success && typeof GameEngine !== 'undefined') {
      const s = GameEngine.getState ? GameEngine.getState() : (GameEngine.state || null);
      if (s) {
        if (res.cash !== undefined) s.cash = res.cash;
        if (res.netWorth !== undefined) s.netWorth = res.netWorth;
        if (res.assets) s.assets = res.assets;
      }
      if (typeof UI !== 'undefined') {
        if (UI.renderAssetsPanel) { try { UI.renderAssetsPanel(); } catch (_) {} }
        if (UI.renderStatsBar) { try { UI.renderStatsBar(); } catch (_) {} }
      }
    }
    return res;
  }

  async function buyCar(carId) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/car/buy', { username: user, token, carId });
    if (res && res.success && typeof GameEngine !== 'undefined') {
      const s = GameEngine.getState ? GameEngine.getState() : (GameEngine.state || null);
      if (s) {
        if (res.cash !== undefined) s.cash = res.cash;
        if (res.bank !== undefined) s.bank = res.bank;
        if (res.netWorth !== undefined) s.netWorth = res.netWorth;
        if (res.ownedCars) s.ownedCars = res.ownedCars;
      }
      if (typeof UI !== 'undefined') {
        if (UI.renderCarsPanel) { try { UI.renderCarsPanel(); } catch (_) {} }
        if (UI.renderStatsBar) { try { UI.renderStatsBar(); } catch (_) {} }
      }
    }
    return res;
  }

  async function sellCar(carId, carIndex = -1) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/car/sell', { username: user, token, carId, carIndex });
    if (res && res.success && typeof GameEngine !== 'undefined') {
      const s = GameEngine.getState ? GameEngine.getState() : (GameEngine.state || null);
      if (s) {
        if (res.bank !== undefined) s.bank = res.bank;
        if (res.netWorth !== undefined) s.netWorth = res.netWorth;
        if (res.ownedCars) s.ownedCars = res.ownedCars;
      }
      if (typeof UI !== 'undefined') {
        if (UI.renderCarsPanel) { try { UI.renderCarsPanel(); } catch (_) {} }
        if (UI.renderStatsBar) { try { UI.renderStatsBar(); } catch (_) {} }
      }
    }
    return res;
  }

  async function setActiveCar(carId) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/car/assign', { username: user, token, carId });
    if (res && res.success && typeof GameEngine !== 'undefined') {
      const s = GameEngine.getState ? GameEngine.getState() : (GameEngine.state || null);
      if (s) {
        s.activeCar = res.activeCar;
        if (res.netWorth !== undefined) s.netWorth = res.netWorth;
      }
      if (typeof UI !== 'undefined' && UI.renderCarsPanel) { try { UI.renderCarsPanel(); } catch (_) {} }
    }
    return res;
  }

  async function rentCar(carId, rentStatus, carIndex = -1) {
    const user = _activeUsername || (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username);
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/car/rent', { username: user, token, carId, rentStatus, carIndex });
    if (res && res.success && typeof GameEngine !== 'undefined') {
      const s = GameEngine.getState ? GameEngine.getState() : (GameEngine.state || null);
      if (s) {
        if (res.ownedCars) s.ownedCars = res.ownedCars;
        if (res.netWorth !== undefined) s.netWorth = res.netWorth;
      }
      if (typeof UI !== 'undefined' && UI.renderCarsPanel) { try { UI.renderCarsPanel(); } catch (_) {} }
    }
    return res;
  }

  async function fetchMarketStocks() {
    return await _get('/api/market/stocks');
  }

  async function buyStock(symbol, shares) {
    const user = _activeUsername;
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/stock/buy', { username: user, token, symbol, shares });
    if (res && res.success && typeof GameEngine !== 'undefined') {
      const s = GameEngine.getState ? GameEngine.getState() : (GameEngine.state || null);
      if (s) {
        if (res.stocks) s.stocks = res.stocks;
        if (res.cash !== undefined) s.cash = res.cash;
        if (res.netWorth !== undefined) s.netWorth = res.netWorth;
      }
    }
    return res;
  }

  async function sellStock(symbol, shares) {
    const user = _activeUsername;
    if (!user) throw new Error('يرجى تسجيل الدخول أولاً');
    const token = resolveEffectiveToken(user);
    const res = await _post('/api/action/stock/sell', { username: user, token, symbol, shares });
    if (res && res.success && typeof GameEngine !== 'undefined') {
      const s = GameEngine.getState ? GameEngine.getState() : (GameEngine.state || null);
      if (s) {
        if (res.stocks) s.stocks = res.stocks;
        if (res.cash !== undefined) s.cash = res.cash;
        if (res.netWorth !== undefined) s.netWorth = res.netWorth;
      }
    }
    return res;
  }

  return {
    getApiBase,
    formatAvatarUrl,
    uploadAvatar,
    removeAvatar,
    unlockAirport,
    renameAirport,
    upgradeAirportFacility,
    buyAirportPlane,
    sellAirportPlane,
    launchAirportFlight,
    speedupAirportFlight,
    claimAirportFlight,
    claimDutyFree,
    acceptAirportTransit,
    hireAirportManager,
    toggleAirportAutopilot,
    unlockGear,
    upgradeGear,
    unlockFarm,
    upgradeFarmLand,
    upgradeFarmIrrigation,
    upgradeFarmFertilizer,
    upgradeFarmSilo,
    hireFarmWorker,
    plantFarmCrop,
    plantAllFarmPlots,
    harvestFarmCrop,
    harvestAllFarmPlots,
    sellFarmCrop,
    sellAllFarmCrops,
    sellProcessedGood,
    sellAllProcessedGoods,
    sellLivestockProduce,
    sellAllLivestockProduce,
    fulfillFarmContract,
    claimIncome,
    buyProperty,
    sellProperty,
    buyCar,
    sellCar,
    setActiveCar,
    rentCar,
    fetchMarketStocks,
    buyStock,
    sellStock,
    registerAccount,
    startSession,
    dispatchClick,
    buyBusiness,
    renewAfkManager,
    buySupplies,
    supplyBusiness,
    hireWorker,
    fireWorker,
    unlockIndustrySector,
    upgradeIndustryStage,
    buyImportCargo,
    upgradeWarehouse,
    startInvestment,
    buyFarmLivestock,
    buyStoreItem,
    buyBlackMarketGear,
    bribePolice,
    buySmugglingVehicle,
    launchMarketingCampaign,
    convertToFranchise,
    fileTaxDeclaration,
    deductCasinoBet,
    settleCasinoPayout,
    bankAction,
    changePin,
    notifyWireTransfer,
    sendTransferRequest,
    submitTopupRequest,
    syncState,
    sendHeartbeat,
    sendExit,
    clearSession,
    logout: clearSession,
    destroy: clearSession,
    isServerOnline: () => _isServerOnline,
    getActiveUsername: () => _activeUsername,
    getSessionToken: () => _sessionToken,
    resolveEffectiveToken
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ServerBridge;
}
