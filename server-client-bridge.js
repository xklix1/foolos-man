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

  async function _post(endpoint, body = {}) {
    const base = getApiBase();
    const url = `${base}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (_sessionToken) {
      headers['Authorization'] = `Bearer ${_sessionToken}`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errMsg = errJson.error || errMsg;
      } catch (e) {}
      throw new Error(errMsg);
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

      let effectiveToken = token;
      if (!effectiveToken && typeof localStorage !== 'undefined') {
        effectiveToken = localStorage.getItem('rasalmal_auth_token_' + _activeUsername);
      }

      const data = await _post('/api/session/start', {
        username: _activeUsername,
        pin: pin,
        token: effectiveToken,
        sessionId: clientSessionToken
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

  /**
   * Purchases or upgrades a business authoritatively on the server
   */
  async function buyBusiness(businessId) {
    if (!_isServerOnline || !_activeUsername) return null;
    return await _post('/api/action/buy-business', {
      username: _activeUsername,
      businessId
    });
  }

  /**
   * Authoritatively renews the 12-hour AFK Manager
   */
  async function renewAfkManager() {
    if (!_isServerOnline || !_activeUsername) return null;
    return await _post('/api/action/renew-afk', {
      username: _activeUsername
    });
  }

  /**
   * Authoritatively purchases business supplies
   */
  async function buySupplies(hours = 12) {
    if (!_isServerOnline || !_activeUsername) return null;
    return await _post('/api/action/buy-supplies', {
      username: _activeUsername,
      hours
    });
  }

  /**
   * Bank deposit or withdrawal
   */
  async function bankAction(type, amount) {
    if (!_isServerOnline || !_activeUsername) return null;
    return await _post('/api/action/bank', {
      username: _activeUsername,
      type,
      amount
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
      return await _post('/api/session/sync-state', {
        username: user,
        state,
        immediate
      });
    } catch (e) {
      if (e.message && (e.message.includes('Session invalidated') || e.message.includes('409') || e.message.includes('SESSION_TERMINATED'))) {
        if (typeof window !== 'undefined' && typeof window.handleDuplicateSession === 'function') {
          window.handleDuplicateSession('تم تسجيل الدخول إلى هذا الحساب من جهاز آخر.');
        }
      }
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

  return {
    startSession,
    dispatchClick,
    buyBusiness,
    renewAfkManager,
    buySupplies,
    bankAction,
    changePin,
    notifyWireTransfer,
    sendTransferRequest,
    syncState,
    sendHeartbeat,
    sendExit,
    clearSession,
    logout: clearSession,
    destroy: clearSession,
    isServerOnline: () => _isServerOnline,
    getActiveUsername: () => _activeUsername,
    getSessionToken: () => _sessionToken
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ServerBridge;
}
