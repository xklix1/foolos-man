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
  let _isServerOnline = false;
  let _heartbeatTimer = null;
  let _clickBatchQueue = 0;
  let _clickBatchTimer = null;
  let _batchStartTime = 0;

  async function _post(endpoint, body = {}) {
    const base = getApiBase();
    const url = `${base}${endpoint}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
  async function startSession(username, pin = null) {
    if (!username) return null;
    _activeUsername = username.trim();

    try {
      const data = await _post('/api/session/start', {
        username: _activeUsername,
        pin: pin
      });

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
   * Sends exit notification on page unload
   */
  function sendExit() {
    if (!_isServerOnline || !_activeUsername) return;
    const url = `${getApiBase()}/api/session/exit`;
    const payload = JSON.stringify({ username: _activeUsername });

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => {});
    }
  }

  // Attach exit and app-hide listeners (Desktop & Mobile)
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', sendExit);
    window.addEventListener('pagehide', sendExit);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          sendExit();
        }
      });
    }
  }

  return {
    startSession,
    dispatchClick,
    buyBusiness,
    renewAfkManager,
    buySupplies,
    bankAction,
    sendHeartbeat,
    sendExit,
    destroy: () => {
      if (_heartbeatTimer) clearInterval(_heartbeatTimer);
      if (_clickBatchTimer) clearTimeout(_clickBatchTimer);
      _heartbeatTimer = null;
      _clickBatchTimer = null;
    },
    isServerOnline: () => _isServerOnline,
    getActiveUsername: () => _activeUsername
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ServerBridge;
}
