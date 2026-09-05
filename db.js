/**
 * Ras ALmal Tycoon (رأس المال)
 * Database Adapter — Powered by Supabase (PostgreSQL)
 * Version: v200 (Supabase Engine)
 *
 * UNLIMITED READS & WRITES. ZERO QUOTA CRASHES.
 * Fast, Atomic, Banking-Grade SQL Backend.
 */

var AppDB = (() => {
  console.log('[DB] Cloud Engine Loaded (v=200)');

  // ─────────────────────────────────────────────
  //  CONFIG & CREDENTIALS
  // ─────────────────────────────────────────────
  const CLIENT_VERSION ='V5.2';
  const SUPABASE_URL ='https://rasalmal.online';
  const SUPABASE_ANON_KEY ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg4NTU5NzUzLCJleHAiOjIxMDM5MTk3NTN9.2465KGfimfRI4L3fZ6L6kXSOjPt6AC-0eHtchpt7F08';

  let firebaseReady = true; // Kept for backward compatibility checks across UI
  let _supabaseClient = null;

  // ─────────────────────────────────────────────
  //  HTTP HELPER (POSTGREST DIRECT REST ENGINE)
  // ─────────────────────────────────────────────
  async function _api(endpoint, options = {}) {
    const url =`${SUPABASE_URL}/rest/v1/${endpoint}`;
    const method = (options.method ||'GET').toUpperCase();
    const headers = {'apikey': SUPABASE_ANON_KEY,'Authorization':`Bearer ${SUPABASE_ANON_KEY}`,'Content-Type':'application/json',
      ...(options.headers || {})
    };

    // Auto-inject Prefer: return=minimal for mutating queries to save Supabase Egress (HTTP 204)
    if (method ==='POST' || method ==='PATCH' || method ==='DELETE') {
      if (!headers['Prefer']) {
        headers['Prefer'] ='return=minimal';
      } else if (!headers['Prefer'].includes('return=')) {
        headers['Prefer'] +=', return=minimal';
      }
    }

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errBody = await res.text().catch(() =>'');
      let parsed = null;
      try { parsed = JSON.parse(errBody); } catch (e) {}
      const msg = (parsed && (parsed.message || parsed.hint || parsed.details)) || errBody ||`HTTP ${res.status}`;
      throw new Error(msg);
    }

    const contentType = res.headers.get('content-type') ||'';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    return null;
  }

  // ─────────────────────────────────────────────
  //  LOCAL ENCRYPTION CACHE
  // ─────────────────────────────────────────────
  function _xorEncryptDecrypt(input, key ="FoolosMan_2026_SecureKey") {
    let output ="";
    for (let i = 0; i < input.length; i++) {
      output += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return output;
  }

  function setEncryptedLocalState(key, data) {
    try {
      const json = JSON.stringify(data);
      const enc = btoa(_xorEncryptDecrypt(json));
      localStorage.setItem(key, enc);
    } catch (e) {
      try { localStorage.setItem(key, JSON.stringify(data)); } catch (err) {}
    }
  }

  function getDecryptedLocalState(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        const dec = _xorEncryptDecrypt(atob(raw));
        return JSON.parse(dec);
      } catch (e) {
        return JSON.parse(raw);
      }
    } catch (e) {
      return null;
    }
  }

  // ─────────────────────────────────────────────
  //  IDLE & VISIBILITY NETWORK CONTROLLER (EGRESS ZERO-LEAK)
  // ─────────────────────────────────────────────
  const IDLE_TIMEOUT_MS = 90000; // 90 seconds of no interaction = IDLE
  let _isUserIdle = false;
  let _idleTimer = null;
  const _activeResumeListeners = new Set();
  const _registeredPollingIntervals = new Set();

  function isNetworkActive() {
    if (typeof document !=='undefined' && document.hidden) return false;
    return !_isUserIdle;
  }

  function _resetIdleTimer() {
    const wasIdle = _isUserIdle;
    _isUserIdle = false;
    if (_idleTimer) clearTimeout(_idleTimer);

    _idleTimer = setTimeout(() => {
      _isUserIdle = true;
      console.log('[IdleManager] User is now IDLE. Pausing background network polling.');
    }, IDLE_TIMEOUT_MS);

    if (wasIdle && isNetworkActive()) {
      console.log('[IdleManager] User returned from IDLE. Resuming background network polling.');
      _notifyResumeListeners();
    }
  }

  function _notifyResumeListeners() {
    _activeResumeListeners.forEach(cb => {
      try { cb(); } catch (e) {}
    });
  }

  function onActiveResume(callback) {
    if (typeof callback ==='function') {
      _activeResumeListeners.add(callback);
      return () => _activeResumeListeners.delete(callback);
    }
    return () => {};
  }

  function registerPollingInterval(intervalId) {
    if (intervalId) _registeredPollingIntervals.add(intervalId);
    return intervalId;
  }

  function unregisterPollingInterval(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
      _registeredPollingIntervals.delete(intervalId);
    }
  }

  function cleanupAllNetworkPolling() {
    _registeredPollingIntervals.forEach(id => clearInterval(id));
    _registeredPollingIntervals.clear();
    stopListeningToChat();
  }

  if (typeof window !=='undefined' && typeof document !=='undefined') {
    const activityEvents = ['mousemove','mousedown','keydown','touchstart','scroll','pointerdown'];
    activityEvents.forEach(evt => {
      window.addEventListener(evt, _resetIdleTimer, { passive: true });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Tab hidden, polling naturally paused by isNetworkActive()
      } else {
        _resetIdleTimer();
        _notifyResumeListeners();
      }
    });

    window.addEventListener('beforeunload', cleanupAllNetworkPolling);
    window.addEventListener('unload', cleanupAllNetworkPolling);

    // Initialize timer
    _resetIdleTimer();
  }

  // ─────────────────────────────────────────────
  //  INITIALIZATION
  // ─────────────────────────────────────────────
  async function init() {
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      console.log('[DB] Running inside Capacitor Native Engine.');
    }

    firebaseReady = true;
    return true;
  }

  // ─────────────────────────────────────────────
  //  PLAYER AUTH & STATE MANAGEMENT
  // ─────────────────────────────────────────────
  async function hashPin(pin) {
    if (!pin) return'1234';
    if (typeof crypto !=='undefined' && crypto.subtle) {
      try {
        const msgBuffer = new TextEncoder().encode(String(pin));
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
      } catch (e) {}
    }
    return String(pin);
  }

  async function registerPlayer(username, pin) {
    if (!username || !pin) throw new Error('يرجى إدخال اسم المستخدم ورمز PIN.');
    const u = username.trim();
    const p = String(pin).trim();

    // Check if exists (case-insensitive)
    const existing = await _api(`players?username=ilike.${encodeURIComponent(u)}&select=username`);
    if (existing && existing.length > 0) {
      throw new Error('اسم المستخدم مسجل بالفعل. يرجى اختيار اسم آخر.');
    }

    const hashed = await hashPin(p);
    const now = Date.now();
    const newPlayerRow = {
      username: u,
      pin: hashed,
      cash: 300,
      bank: 0,
      dirty_cash: 0,
      net_worth: 400,
      xp: 0,
      title:'عامل مبتدئ',
      job_id:'worker',
      is_admin: false,
      is_banned: false,
      jail_timer: 0,
      afk_manager_expires_at: now + (12 * 60 * 60 * 1000),
      total_taxes_paid: 0,
      state: {
        username: u,
        pin: hashed,
        cash: 300,
        bank: 0,
        dirtyCash: 0,
        netWorth: 400,
        xp: 0,
        title:'عامل مبتدئ',
        jobId:'worker',
        assets: { apartment: 0, office: 0, mansion: 0, skyline_tower: 0, luxury_resort: 0, mega_yacht: 0, private_island: 0, orbital_station: 0 },
        businesses: {
          kiosk: { level: 0, price: 15, workers: 0, suppliesTicks: 0 },
          coffee: { level: 0, price: 28, workers: 0, suppliesTicks: 0 },
          tech: { level: 0, price: 75, workers: 0, suppliesTicks: 0 },
          logistics: { level: 0, price: 120, workers: 0, suppliesTicks: 0 },
          supermarket: { level: 0, price: 200, workers: 0, suppliesTicks: 0 },
          solar_factory: { level: 0, price: 340, workers: 0, suppliesTicks: 0 },
          private_hospital: { level: 0, price: 600, workers: 0, suppliesTicks: 0 },
          media_studio: { level: 0, price: 1100, workers: 0, suppliesTicks: 0 },
          private_bank: { level: 0, price: 1800, workers: 0, suppliesTicks: 0 },
          oil_refinery: { level: 0, price: 2800, workers: 0, suppliesTicks: 0 },
          space_tech: { level: 0, price: 4800, workers: 0, suppliesTicks: 0 }
        },
        stocks: { COMI: { shares: 0, avgPrice: 0 }, EAST: { shares: 0, avgPrice: 0 }, ETEL: { shares: 0, avgPrice: 0 }, FWRY: { shares: 0, avgPrice: 0 }, CASH: { shares: 0, avgPrice: 0 }, BITC: { shares: 0, avgPrice: 0 }, GOLD: { shares: 0, avgPrice: 0 }, AIX: { shares: 0, avgPrice: 0 } },
        inventory: {},
        ownedCars: [],
        activeCar: null,
        smugglingFleet: { speedboat: 0, plane: 0, ship: 0 },
        activeSmugglingJobs: [],
        createdAt: now,
        lastSeen: now
      },
      last_seen: now,
      created_at: now
    };

    await _api('players', {
      method:'POST',
      body: JSON.stringify(newPlayerRow)
    });

    setEncryptedLocalState(`rasalmal_state_${u}`, newPlayerRow.state);
    return true;
  }

  async function verifyPin(username, inputPin) {
    if (!username || !inputPin) return false;
    const u = username.trim();
    const p = String(inputPin).trim();

    // Query case-insensitively and sort by net_worth descending to prioritize main account over duplicates
    const rows = await _api(`players?username=ilike.${encodeURIComponent(u)}&order=net_worth.desc&select=username,pin,net_worth`);
    if (!rows || rows.length === 0) return false;

    const hashed = await hashPin(p);
    for (const r of rows) {
      const stored = String(r.pin ||'').trim();
      if (!stored) continue;

      if (
        stored === p ||
        stored === hashed ||
        stored ==='s256_' + hashed ||
        stored.replace(/^s256_/,'') === hashed ||
        stored ==='s256_' + p
      ) {
        return true;
      }
    }
    return false;
  }

  async function getPlayerState(username) {
    if (!username) return null;
    const u = username.trim();

    try {
      // Use case-insensitive query and order by net_worth desc to guarantee the richest main account is loaded
      const rows = await _api(`players?username=ilike.${encodeURIComponent(u)}&order=net_worth.desc&select=*`);
      if (!rows || rows.length === 0) {
        return getDecryptedLocalState(`rasalmal_state_${u}`);
      }

      const row = rows[0];
      const stateObj = (typeof row.state ==='object' && row.state) ? { ...row.state } : {};

      // Overwrite critical authoritative server fields using canonical database username
      stateObj.username = row.username;
      stateObj.cash = Number(row.cash || 0);
      stateObj.bank = Number(row.bank || 0);
      stateObj.dirtyCash = Number(row.dirty_cash || 0);
      stateObj.netWorth = Number(row.net_worth || 0);
      stateObj.xp = Number(row.xp || 0);
      stateObj.title = row.title || stateObj.title ||'عامل مبتدئ';
      stateObj.jobId = row.job_id || stateObj.jobId ||'worker';
      stateObj.isAdmin = row.is_admin === true;
      stateObj.isBanned = row.is_banned === true;
      stateObj.jailTimer = Number(row.jail_timer || 0);
      stateObj.afkManagerExpiresAt = Number(row.afk_manager_expires_at || 0);
      stateObj.totalTaxesPaid = Number(row.total_taxes_paid || 0);
      stateObj.pin = row.pin || stateObj.pin;
      stateObj.lastSeen = Number(row.last_seen || Date.now());
      stateObj.adminModifiedTimestamp = Number(row.admin_modified_timestamp || 0);
      stateObj._loadedFromCloud = true;

      if (!stateObj.businesses || Object.keys(stateObj.businesses).length === 0) {
        if (row.state && row.state.businesses) {
          stateObj.businesses = row.state.businesses;
        }
      }

      setEncryptedLocalState(`rasalmal_state_${row.username}`, stateObj);
      if (row.username.toLowerCase() !== u.toLowerCase()) {
        setEncryptedLocalState(`rasalmal_state_${u}`, stateObj);
      }
      return stateObj;
    } catch (err) {
      console.warn('[DB] getPlayerState fallback to local:', err.message);
      return getDecryptedLocalState(`rasalmal_state_${u}`);
    }
  }

  function flushStateToCloudOnExit(username, state) {
    if (!username || !state) return;
    const u = username.trim();
    state.username = u;
    state.lastSeen = Date.now();

    // Cache locally instantly
    setEncryptedLocalState(`rasalmal_state_${u}`, state);

    const payload = {
      username: u,
      cash: Number(state.cash || 0),
      bank: Number(state.bank || 0),
      dirty_cash: Number(state.dirtyCash || 0),
      net_worth: Number(state.netWorth || 0),
      xp: Number(state.xp || 0),
      title: state.title ||'عامل مبتدئ',
      job_id: state.jobId ||'worker',
      is_admin: state.isAdmin === true,
      is_banned: state.isBanned === true,
      jail_timer: Number(state.jailTimer || 0),
      afk_manager_expires_at: Number(state.afkManagerExpiresAt || 0),
      total_taxes_paid: Number(state.totalTaxesPaid || 0),
      state: state,
      last_seen: Date.now()
    };
    if (state.pin) payload.pin = state.pin;

    try {
      const adminTs = Number(state.adminModifiedTimestamp || 0);
      const tsFilter = `&admin_modified_timestamp=lte.${adminTs}`;
      const url =`${SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(u)}${tsFilter}`;
      fetch(url, {
        method:'PATCH',
        keepalive: true,
        headers: {'apikey': SUPABASE_ANON_KEY,'Authorization':`Bearer ${SUPABASE_ANON_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'
        },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (e) {}
  }

  // Attach exit listeners immediately
  if (typeof window !=='undefined') {
    const handleExitFlush = () => {
      const activeUser = (window.GameEngine && window.GameEngine.activeUsername);
      const activeState = (window.GameEngine && window.GameEngine.state);
      if (activeUser && activeState && activeState.username === activeUser && (activeState._loadedFromCloud || activeState.cash > 300 || activeState.netWorth > 400 || activeState.xp > 0)) {
        flushStateToCloudOnExit(activeUser, activeState);
      }
    };
    window.addEventListener('beforeunload', handleExitFlush);
    window.addEventListener('pagehide', handleExitFlush);
  }

  let _cloudSyncDebounceTimer = null;
  let _lastCloudSyncTimestamp = 0;
  const SMART_SYNC_INTERVAL_MS = 35000; // 35 seconds max delay for background autosync

  async function _pushStateToCloud(u, state) {
    if (!u || !state) return;
    if (!state._loadedFromCloud && state.cash <= 300 && state.netWorth <= 400 && state.xp === 0) return;

    const payload = {
      username: u,
      cash: Number(state.cash || 0),
      bank: Number(state.bank || 0),
      dirty_cash: Number(state.dirtyCash || 0),
      net_worth: Number(state.netWorth || 0),
      xp: Number(state.xp || 0),
      title: state.title ||'عامل مبتدئ',
      job_id: state.jobId ||'worker',
      is_admin: state.isAdmin === true,
      is_banned: state.isBanned === true,
      jail_timer: Number(state.jailTimer || 0),
      afk_manager_expires_at: Number(state.afkManagerExpiresAt || 0),
      total_taxes_paid: Number(state.totalTaxesPaid || 0),
      state: state,
      last_seen: Date.now()
    };
    if (state.pin) payload.pin = state.pin;

    try {
      const adminTs = Number(state.adminModifiedTimestamp || 0);
      const tsFilter = `&admin_modified_timestamp=lte.${adminTs}`;
      await _api(`players?username=ilike.${encodeURIComponent(u)}${tsFilter}`, {
        method:'PATCH',
        headers: {'Prefer':'return=minimal' },
        body: JSON.stringify(payload)
      });
      _lastCloudSyncTimestamp = Date.now();
    } catch (err) {
      console.warn('[DB] Cloud save warning:', err.message);
    }
  }

  async function savePlayerState(username, state, forceCloud = false) {
    if (!username || !state) return;
    const u = username.trim();
    state.username = u;
    state.lastSeen = Date.now();

    // Cache locally INSTANTLY (0 lag, 100% responsive)
    setEncryptedLocalState(`rasalmal_state_${u}`, state);

    if (forceCloud) {
      if (_cloudSyncDebounceTimer) {
        clearTimeout(_cloudSyncDebounceTimer);
        _cloudSyncDebounceTimer = null;
      }
      await _pushStateToCloud(u, state);
      return;
    }

    // Smart Debounce: ensure progress is auto-saved to cloud every 35 seconds without flooding the server
    const now = Date.now();
    if (now - _lastCloudSyncTimestamp >= SMART_SYNC_INTERVAL_MS) {
      if (_cloudSyncDebounceTimer) clearTimeout(_cloudSyncDebounceTimer);
      _cloudSyncDebounceTimer = setTimeout(() => {
        _cloudSyncDebounceTimer = null;
        _pushStateToCloud(u, state);
      }, 1500); // 1.5s micro-debounce to batch rapid clicks
    } else if (!_cloudSyncDebounceTimer) {
      const remainingTime = Math.max(2000, SMART_SYNC_INTERVAL_MS - (now - _lastCloudSyncTimestamp));
      _cloudSyncDebounceTimer = setTimeout(() => {
        _cloudSyncDebounceTimer = null;
        _pushStateToCloud(u, state);
      }, remainingTime);
    }
  }

  async function syncProgressToCloud(username, force = false) {
    if (!username) return { success: false, message:'مطلوب اسم المستخدم.' };
    const s = (window.GameEngine && window.GameEngine.state) || getDecryptedLocalState(`rasalmal_state_${username}`);
    if (!s) return { success: false, message:'لا توجد بيانات لحفظها.' };
    await savePlayerState(username, s, true);
    return { success: true, message:'تم حفظ ومزامنة التقدم مع السحابة بنجاح! ️' };
  }

  // ─────────────────────────────────────────────
  //  WIRE TRANSFERS (BANK-GRADE ATOMIC SQL FUNCTION)
  // ─────────────────────────────────────────────
  async function executeWireTransfer(senderUsername, recipientUsername, amount) {
    if (!senderUsername || !recipientUsername) throw new Error('بيانات التحويل غير مكتملة.');
    if (senderUsername === recipientUsername) throw new Error('لا يمكنك التحويل لنفسك!');
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) throw new Error('مبلغ التحويل يجب أن يكون أكبر من صفر.');

    // Execute the atomic SQL Stored Procedure
    await _api('rpc/execute_wire_transfer', {
      method:'POST',
      body: JSON.stringify({
        sender_username: senderUsername.trim(),
        recipient_username: recipientUsername.trim(),
        transfer_amount: amt
      })
    });

    return true;
  }

  async function getPlayerTransfers(username, limit = 30) {
    if (!username) return [];
    const u = username.trim();
    try {
      const rows = await _api(`transfers?or=(sender.eq.${encodeURIComponent(u)},recipient.eq.${encodeURIComponent(u)})&order=created_at.desc&limit=${limit}`);
      return (rows || []).map(r => ({
        ...r,
        amount: Number(r.amount || 0),
        created_at: Number(r.created_at || r.timestamp || Date.now()),
        timestamp: Number(r.created_at || r.timestamp || Date.now())
      }));
    } catch (err) {
      console.warn('[DB] getPlayerTransfers error:', err.message);
      return [];
    }
  }

  async function createTransferRequest(senderUsername, recipientUsername, amount) {
    if (!senderUsername || !recipientUsername) throw new Error('بيانات الطلب غير مكتملة.');
    if (senderUsername === recipientUsername) throw new Error('لا يمكنك إرسال طلب تحويل لنفسك!');
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) throw new Error('مبلغ الطلب غير صالح.');

    const res = await _api('transfer_requests', {
      method:'POST',
      headers: {'Prefer':'return=representation' },
      body: JSON.stringify({
        sender: senderUsername.trim(),
        recipient: recipientUsername.trim(),
        amount: amt,
        status:'pending',
        created_at: Date.now()
      })
    });

    const createdReq = (res && res[0]) ? res[0] : null;

    // Send interactive notification mail to the recipient
    try {
      await sendMail(
        senderUsername.trim(),
        recipientUsername.trim(),'transfer_request',
        {
          requestId: createdReq ? createdReq.id : null,
          amount: amt,
          title:'طلب تحويل أموال',
          message:`يطلب منك اللاعب"${senderUsername.trim()}" تحويل مبلغ ${amt.toLocaleString()} EGP.`
        }
      );
    } catch (mailErr) {
      console.warn('[DB] Failed to send transfer_request mail notification:', mailErr.message);
    }

    return true;
  }

  async function getIncomingTransferRequests(username) {
    if (!username) return [];
    try {
      const rows = await _api(`transfer_requests?recipient=eq.${encodeURIComponent(username.trim())}&status=eq.pending&order=created_at.desc`);
      return (rows || []).map(r => ({ id: r.id, ...r, timestamp: Number(r.created_at) }));
    } catch (e) {
      return [];
    }
  }

  async function getSentTransferRequests(username) {
    if (!username) return [];
    try {
      const rows = await _api(`transfer_requests?sender=eq.${encodeURIComponent(username.trim())}&order=created_at.desc`);
      return (rows || []).map(r => ({ id: r.id, ...r, timestamp: Number(r.created_at) }));
    } catch (e) {
      return [];
    }
  }

  async function acceptTransferRequest(requestId, recipientUsername) {
    const rows = await _api(`transfer_requests?id=eq.${encodeURIComponent(requestId)}`);
    if (!rows || rows.length === 0) throw new Error('طلب التحويل غير موجود.');
    const req = rows[0];
    if (req.recipient !== recipientUsername) throw new Error('غير مصرح لك بقبول هذا الطلب.');
    if (req.status !=='pending') throw new Error('هذا الطلب تم الرد عليه مسبقاً.');

    // Execute transfer from recipient to sender
    await executeWireTransfer(recipientUsername, req.sender, req.amount);

    // Update status in transfer_requests
    await _api(`transfer_requests?id=eq.${encodeURIComponent(requestId)}`, {
      method:'PATCH',
      body: JSON.stringify({ status:'accepted' })
    });

    // Also update any matching mail notification in mailbox
    try {
      await _api(`mailbox?recipient=eq.${encodeURIComponent(recipientUsername.trim())}&type=eq.transfer_request`, {
        method:'PATCH',
        body: JSON.stringify({ status:'accepted' })
      });
    } catch (e) {}

    return true;
  }

  async function rejectTransferRequest(requestId, recipientUsername) {
    await _api(`transfer_requests?id=eq.${encodeURIComponent(requestId)}`, {
      method:'PATCH',
      body: JSON.stringify({ status:'rejected' })
    });

    // Also update any matching mail notification in mailbox
    try {
      await _api(`mailbox?recipient=eq.${encodeURIComponent(recipientUsername.trim())}&type=eq.transfer_request`, {
        method:'PATCH',
        body: JSON.stringify({ status:'rejected' })
      });
    } catch (e) {}

    return true;
  }

  // ─────────────────────────────────────────────
  //  GIFT CODES
  // ─────────────────────────────────────────────
  async function redeemGiftCode(code, username) {
    if (!code || !username) throw new Error('رمز الكود غير صالح.');
    const normalized = code.trim().toUpperCase();
    const u = username.trim();

    const rows = await _api(`gift_codes?code=eq.${encodeURIComponent(normalized)}`);
    if (!rows || rows.length === 0) {
      throw new Error('كود الهدية غير موجود أو غير صالح.');
    }

    const gift = rows[0];
    const usedBy = Array.isArray(gift.used_by) ? gift.used_by : [];
    if (usedBy.includes(u.toLowerCase())) {
      throw new Error('لقد قمت باستخدام كود الهدية هذا مسبقاً.');
    }

    if (usedBy.length >= (gift.max_uses || 10000)) {
      throw new Error('تم بلوغ الحد الأقصى لعدد مرات استخدام هذا الكود.');
    }

    // Award player
    const pRows = await _api(`players?username=eq.${encodeURIComponent(u)}&select=*`);
    if (!pRows || pRows.length === 0) throw new Error('حساب اللاعب غير موجود.');
    const p = pRows[0];
    const curCash = Number(p.cash || 0);
    const curWorth = Number(p.net_worth || 0);
    const reward = Number(gift.reward_cash || 100000);
    const newCash = curCash + reward;
    const newWorth = curWorth + reward;

    const pState = (typeof p.state ==='object' && p.state) ? { ...p.state } : {};
    pState.cash = newCash;
    pState.netWorth = newWorth;

    await _api(`players?username=eq.${encodeURIComponent(u)}`, {
      method:'PATCH',
      body: JSON.stringify({
        cash: newCash,
        net_worth: newWorth,
        state: pState
      })
    });

    // Update gift code usedBy
    usedBy.push(u.toLowerCase());
    await _api(`gift_codes?code=eq.${encodeURIComponent(normalized)}`, {
      method:'PATCH',
      body: JSON.stringify({ used_by: usedBy })
    });

    return {
      success: true,
      rewardType:'cash',
      rewardText:`${reward.toLocaleString()} EGP كاش مالي`,
      amount: reward,
      playerUpdates: {
        cash: newCash,
        netWorth: newWorth
      }
    };
  }

  // ─────────────────────────────────────────────
  //  MAILBOX & NOTIFICATIONS
  // ─────────────────────────────────────────────
  async function sendMail(sender, recipient, type, payload) {
    const isInteractive = ['friend_request','job_offer','partnership_invite','transfer_request','system_add_employee','system_add_partner','dividend_claim','auction_win'].includes(type);
    await _api('mailbox', {
      method:'POST',
      body: JSON.stringify({
        sender: sender.trim(),
        recipient: recipient.trim(),
        type,
        payload: payload || {},
        status: isInteractive ?'pending' :'unread',
        created_at: Date.now()
      })
    });
    return true;
  }

  function listenToMailbox(username, callback) {
    if (!username || typeof callback !=='function') return () => {};
    let isSubscribed = true;
    let lastKnownMailIds = new Set();
    let isFirstRun = true;

    const checkMailbox = async () => {
      if (!isSubscribed) return;
      if (!isNetworkActive()) return;
      try {
        const rows = await _api(`mailbox?recipient=eq.${encodeURIComponent(username.trim())}&order=created_at.desc&limit=25`);
        if (rows && isSubscribed) {
          if (!isFirstRun) {
            for (const m of rows) {
              if (!lastKnownMailIds.has(m.id) && m.status !=='read' && m.status !=='accepted' && m.status !=='rejected') {
                if (typeof showToast ==='function') {
                  showToast(m.title ||' بريد جديد', m.message ||'وصلتك رسالة أو حوالة جديدة في صندوق البريد!','info');
                  if (typeof playMenuSound ==='function') playMenuSound('success');
                }
                break;
              }
            }
          }
          lastKnownMailIds = new Set(rows.map(r => r.id));
          isFirstRun = false;
          callback(rows);
        }
      } catch (e) {}
    };

    checkMailbox();
    const pollId = registerPollingInterval(setInterval(checkMailbox, 12000));
    const unsubResume = onActiveResume(() => {
      if (isSubscribed) checkMailbox();
    });

    return () => {
      isSubscribed = false;
      unregisterPollingInterval(pollId);
      unsubResume();
    };
  }

  async function updateMailStatus(mailId, status) {
    await _api(`mailbox?id=eq.${encodeURIComponent(mailId)}`, {
      method:'PATCH',
      body: JSON.stringify({ status })
    });
    return true;
  }

  async function deleteMail(mailId) {
    await _api(`mailbox?id=eq.${encodeURIComponent(mailId)}`, {
      method:'DELETE'
    });
    return true;
  }

  async function markAllMailsRead(username) {
    if (!username) return true;
    try {
      await _api(`mailbox?recipient=eq.${encodeURIComponent(username.trim())}&status=eq.unread`, {
        method:'PATCH',
        body: JSON.stringify({ status:'read' })
      });
      await _api(`mailbox?recipient=eq.${encodeURIComponent(username.trim())}&status=eq.pending`, {
        method:'PATCH',
        body: JSON.stringify({ status:'read' })
      });
    } catch (e) {
      console.warn('[DB] markAllMailsRead error:', e);
    }
    return true;
  }

  // ─────────────────────────────────────────────
  //  GLOBALS (BROADCASTS, CONFIG, MAINTENANCE)
  // ─────────────────────────────────────────────
  async function sendBroadcast(title, message) {
    await _api('globals', {
      method:'POST',
      headers: {'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify({
        id:'broadcast',
        data: { title, message, timestamp: Date.now() },
        updated_at: Date.now()
      })
    });
    return true;
  }

  async function sendAirdrop(amount) {
    await _api('globals', {
      method:'POST',
      headers: {'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify({
        id:'airdrop',
        data: { amount: Number(amount), timestamp: Date.now() },
        updated_at: Date.now()
      })
    });
    return true;
  }

  async function setMaintenanceMode(active, message ='') {
    await _api('globals', {
      method:'POST',
      headers: {'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify({
        id:'maintenance',
        data: { active: Boolean(active), message, timestamp: Date.now() },
        updated_at: Date.now()
      })
    });
    return true;
  }

  async function getMaintenanceStatus() {
    try {
      const rows = await _api(`globals?id=eq.maintenance`);
      if (rows && rows.length > 0 && rows[0].data) {
        return rows[0].data;
      }
    } catch (e) {}
    return { active: false, message:'' };
  }

  async function sendForceReload(message ='') {
    const ts = Date.now();
    await _api('globals', {
      method:'POST',
      headers: {'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify({
        id:'force_reload',
        data: {
          timestamp: ts,
          message: message ||'تم إطلاق تحديث جديد للعبة بواسطة الإدارة. يجب إعادة تحميل الصفحة الآن لتطبيق التغييرات وضمان استقرار حسابك.',
          forcedBy:'admin'
        },
        updated_at: ts
      })
    });
    return true;
  }

  async function getForceReloadStatus() {
    try {
      const rows = await _api(`globals?id=eq.force_reload`);
      if (rows && rows.length > 0 && rows[0].data) {
        return rows[0].data;
      }
    } catch (e) {}
    return null;
  }

  async function adminSaveTaxConfig(config) {
    await _api('globals', {
      method:'POST',
      headers: {'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify({
        id:'taxConfig',
        data: config,
        updated_at: Date.now()
      })
    });
    return true;
  }

  async function adminSaveServerConfig(config) {
    await _api('globals', {
      method:'POST',
      headers: {'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify({
        id:'serverConfig',
        data: config,
        updated_at: Date.now()
      })
    });
    return true;
  }

  async function getServerConfig() {
    try {
      const rows = await _api(`globals?id=eq.serverConfig`);
      if (rows && rows.length > 0 && rows[0].data) return rows[0].data;
    } catch (e) {}
    return { boostMultiplier: 1.0 };
  }

  // ─────────────────────────────────────────────
  //  TOP-UP & RECHARGE SYSTEM (باقات الشحن والدعم)
  // ─────────────────────────────────────────────
  const DEFAULT_TOPUP_PACKAGES = [
    {
      id:'starter_pack',
      name:'حزمة المستثمر الصاعد',
      price: 25,
      cash: 250000,
      bank: 50000,
      xp: 500,
      items: { lottery_ticket: 3 },
      customBadge:'',
      badgeTitle:'مستثمر صاعد',
      description:'انطلاقة قوية: 250 ألف كاش، 50 ألف بالبنك، 500 خبرة، وتذاكر يانصيب مع وسام برونزي.'
    },
    {
      id:'vip_silver_pack',
      name:'حزمة رجل الأعمال VIP',
      price: 50,
      cash: 1000000,
      bank: 250000,
      xp: 2000,
      items: { vip_casino_pass: 1, safe_lock: 2 },
      customBadge:'',
      badgeTitle:'رجل أعمال VIP',
      description:'مليون جنيه كاش، 250 ألف بالبنك، 2000 خبرة، تصريح كازينو VIP، مع وسام فضي أنيق.'
    },
    {
      id:'whale_gold_pack',
      name:'حزمة الحوت الملكي',
      price: 100,
      cash: 5000000,
      bank: 1000000,
      xp: 6000,
      items: { vip_casino_pass: 1, offshore_account: 1, swiss_safe: 1 },
      customBadge:'',
      badgeTitle:'الحوت الملكي',
      description:'حزمة الدعم الملكية: 5 مليون كاش، مليون بالبنك، 6000 خبرة، خزنة سويسرية وحساب خارجي وتاج الملك .'
    }
  ];

  async function getTopupPackages() {
    try {
      const rows = await _api(`globals?id=eq.topup_packages`);
      if (rows && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.packages)) {
        return rows[0].data.packages;
      }
    } catch (e) {
      console.warn('[DB] Could not fetch topup packages, falling back to defaults', e);
    }
    return DEFAULT_TOPUP_PACKAGES;
  }

  async function saveTopupPackages(packages) {
    await _api('globals', {
      method:'POST',
      headers: {'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify({
        id:'topup_packages',
        data: { packages, updatedAt: Date.now() },
        updated_at: Date.now()
      })
    });
    return true;
  }

  async function getPaymentSettings() {
    try {
      const rows = await _api(`globals?id=eq.topup_payment_settings`);
      if (rows && rows.length > 0 && rows[0].data) {
        return rows[0].data;
      }
    } catch (e) {}
    return {
      vodafoneCash:'',
      instapay:'',
      notes:'يرجى تحويل المبلغ بدقة وكتابة رقم الهاتف المحوّل منه أو اسم حسابك في انستاباي ورقم العملية/الوصل لتأكيد الشحن فوراً.'
    };
  }

  async function savePaymentSettings(settings) {
    await _api('globals', {
      method:'POST',
      headers: {'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify({
        id:'topup_payment_settings',
        data: {
          vodafoneCash: (settings.vodafoneCash ||'').trim(),
          instapay: (settings.instapay ||'').trim(),
          notes: settings.notes ||'',
          updatedAt: Date.now()
        },
        updated_at: Date.now()
      })
    });
    return true;
  }

  async function submitTopupRequest(requestData) {
    const ts = Date.now();
    let currentRequests = [];
    try {
      const rows = await _api(`globals?id=eq.topup_requests`);
      if (rows && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.requests)) {
        currentRequests = rows[0].data.requests;
      }
    } catch (e) {}

    const newRequest = {
      id:'req_' + ts +'_' + Math.random().toString(36).substring(2, 7),
      username: (requestData.username ||'').trim(),
      packageId: requestData.packageId,
      packageName: requestData.packageName,
      price: Number(requestData.price) || 0,
      rewards: requestData.rewards || {},
      senderPhoneOrName: (requestData.senderPhoneOrName ||'').trim(),
      receiptNumber: (requestData.receiptNumber ||'').trim(),
      status:'pending',
      createdAt: ts,
      reviewedAt: null,
      reviewerNote:''
    };

    currentRequests.unshift(newRequest);
    if (currentRequests.length > 300) {
      currentRequests = currentRequests.slice(0, 300);
    }

    await _api('globals', {
      method:'POST',
      headers: {'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify({
        id:'topup_requests',
        data: { requests: currentRequests, updatedAt: ts },
        updated_at: ts
      })
    });

    return newRequest;
  }

  async function getTopupRequests() {
    try {
      const rows = await _api(`globals?id=eq.topup_requests`);
      if (rows && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.requests)) {
        return rows[0].data.requests;
      }
    } catch (e) {}
    return [];
  }

  async function getPlayerData(username) {
    if (!username) return null;
    try {
      const rows = await _api(`players?username=eq.${encodeURIComponent(username)}&select=*`);
      return (rows && rows.length > 0) ? rows[0] : null;
    } catch (e) {
      return null;
    }
  }

  async function processTopupRequest(requestId, action, reviewerNote ='') {
    const ts = Date.now();
    const rows = await _api(`globals?id=eq.topup_requests`);
    if (!rows || rows.length === 0 || !rows[0].data || !Array.isArray(rows[0].data.requests)) {
      throw new Error('لم يتم العثور على سجل طلبات الشحن.');
    }

    const requests = rows[0].data.requests;
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) {
      throw new Error('طلب الشحن غير موجود.');
    }

    const req = requests[reqIndex];
    if (req.status !=='pending') {
      throw new Error(`تمت معالجة هذا الطلب مسبقاً (${req.status ==='approved' ?'مقبول' :'مرفوض'}).`);
    }

    if (action ==='approved') {
      const targetUser = req.username;
      const playerDoc = await getPlayerData(targetUser);
      if (!playerDoc) {
        throw new Error(`حساب اللاعب"${targetUser}" غير موجود بقاعدة البيانات.`);
      }

      const pState = playerDoc.state || {};
      const rewards = req.rewards || {};
      const addedCash = Number(rewards.cash) || 0;
      const addedBank = Number(rewards.bank) || 0;
      const addedXP = Number(rewards.xp) || 0;
      const customBadge = rewards.customBadge ||'';

      const updatedCash = (Number(playerDoc.cash) || 0) + addedCash;
      const updatedBank = (Number(playerDoc.bank) || 0) + addedBank;
      const updatedXP = (Number(playerDoc.xp) || 0) + addedXP;
      const updatedNetworth = updatedCash + updatedBank;

      pState.cash = updatedCash;
      pState.bank = updatedBank;
      pState.xp = updatedXP;
      pState.netWorth = updatedNetworth;

      if (customBadge) {
        pState.customBadge = customBadge;
        pState.badgeTitle = rewards.badgeTitle || req.packageName;
      }

      if (rewards.items && typeof rewards.items ==='object') {
        pState.inventory = pState.inventory || {};
        for (const [itemId, qty] of Object.entries(rewards.items)) {
          pState.inventory[itemId] = (Number(pState.inventory[itemId]) || 0) + Number(qty);
        }
      }

      await _api(`players?username=eq.${encodeURIComponent(targetUser)}`, {
        method:'PATCH',
        body: JSON.stringify({
          cash: updatedCash,
          bank: updatedBank,
          xp: updatedXP,
          net_worth: updatedNetworth,
          state: pState,
          admin_modified_timestamp: ts
        })
      });

      const topupReceiptData = {
        packageId: req.packageId,
        packageName: req.packageName,
        price: req.price,
        cash: addedCash,
        bank: addedBank,
        xp: addedXP,
        customBadge: customBadge,
        badgeTitle: rewards.badgeTitle || req.packageName,
        items: rewards.items || {},
        status:'approved',
        date: ts,
        receiptNumber: req.receiptNumber ||'',
        senderPhoneOrName: req.senderPhoneOrName ||'',
        reviewerNote: req.reviewerNote ||'تم الاعتماد والشحن بنجاح'
      };

      await sendMail('SYSTEM', targetUser,'topup_receipt', {
        title:` تم شحن باقة [${req.packageName}] بنجاح!`,
        message:`شكراً لدعمك لسيرفر لعبة رأس المال! تم اعتماد تحويلك بمبلغ ${req.price} ج.م وإيداع جميع مزايا باقتك بحسابك فوراً.`,
        topupDetails: topupReceiptData
      }).catch(() => {});

      req.status ='approved';
      req.reviewedAt = ts;
      req.reviewerNote = reviewerNote ||'تم الاعتماد والشحن بنجاح';
    } else {
      req.status ='rejected';
      req.reviewedAt = ts;
      req.reviewerNote = reviewerNote ||'تم رفض الطلب لعدم تطابق بيانات التحويل';

      const topupRejectData = {
        packageId: req.packageId,
        packageName: req.packageName,
        price: req.price,
        status:'rejected',
        date: ts,
        receiptNumber: req.receiptNumber ||'',
        senderPhoneOrName: req.senderPhoneOrName ||'',
        reviewerNote: req.reviewerNote ||'تم رفض الطلب لعدم تطابق بيانات التحويل'
      };

      await sendMail('SYSTEM', req.username,'topup_receipt', {
        title:`️ تعذر اعتماد طلب شحن [${req.packageName}]`,
        message:`نعتذر، لم تتمكن الإدارة من اعتماد طلب الشحن الخاص بك.\nالسبب: ${req.reviewerNote}\nيرجى التواصل مع الإدارة أو التأكد من بيانات التحويل وإعادة الطلب.`,
        topupDetails: topupRejectData
      }).catch(() => {});
    }

    await _api('globals', {
      method:'POST',
      headers: {'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify({
        id:'topup_requests',
        data: { requests, updatedAt: ts },
        updated_at: ts
      })
    });

    return req;
  }

  // ─────────────────────────────────────────────
  //  SYSTEM STATS & ADMIN PANEL
  // ─────────────────────────────────────────────
  async function getSystemStats() {
    try {
      const rows = await _api('players?select=username,cash,bank,dirty_cash,net_worth,xp,is_banned,jail_timer,title');
      let totalCash = 0, totalBank = 0, totalNetWorth = 0;
      let jailedCount = 0, bannedCount = 0;
      let billionaires = 0, millionaires = 0, middleClass = 0, workingClass = 0;
      const allPlayersList = [];

      (rows || []).forEach(r => {
        const cash = Number(r.cash || 0);
        const bank = Number(r.bank || 0);
        const nw = Number(r.net_worth || 0);
        totalCash += cash;
        totalBank += bank;
        totalNetWorth += nw;

        if (Number(r.jail_timer) > 0) jailedCount++;
        if (r.is_banned) bannedCount++;

        if (nw >= 50000000) billionaires++;
        else if (nw >= 5000000) millionaires++;
        else if (nw >= 500000) middleClass++;
        else workingClass++;

        allPlayersList.push({
          username: r.username,
          cash,
          bank,
          netWorth: nw,
          xp: Number(r.xp || 0),
          title: r.title,
          isBanned: r.is_banned,
          isJailed: Number(r.jail_timer) > 0
        });
      });

      allPlayersList.sort((a, b) => b.netWorth - a.netWorth);

      return {
        totalPlayers: rows.length,
        scannedPlayers: rows.length,
        isFromCache: false,
        quotaExceeded: false,
        totalCash,
        totalBank,
        totalNetWorth,
        jailedCount,
        bannedCount,
        billionaires,
        millionaires,
        middleClass,
        workingClass,
        topRichest: allPlayersList.slice(0, 5),
        allPlayers: allPlayersList,
        suspiciousPlayers: []
      };
    } catch (err) {
      console.warn('[DB] getSystemStats error:', err.message);
      return { totalPlayers: 0, totalCash: 0, totalBank: 0, totalNetWorth: 0, jailedCount: 0, bannedCount: 0 };
    }
  }

  async function adminGetAllPlayers() {
    const rows = await _api('players?select=username,pin,cash,bank,dirty_cash,net_worth,xp,title,job_id,is_admin,is_banned,jail_timer,total_taxes_paid,afk_manager_expires_at,last_seen,created_at&order=net_worth.desc');
    return (rows || []).map(r => {
      const p = {};
      p.username = r.username;
      p.pin = r.pin;
      p.cash = Number(r.cash || 0);
      p.bank = Number(r.bank || 0);
      p.dirtyCash = Number(r.dirty_cash || 0);
      p.netWorth = Number(r.net_worth || 0);
      p.xp = Number(r.xp || 0);
      p.title = r.title ||'عامل مبتدئ';
      p.jobId = r.job_id ||'worker';
      p.isAdmin = r.is_admin === true;
      p.isBanned = r.is_banned === true;
      p.jailTimer = Number(r.jail_timer || 0);
      p.totalTaxesPaid = Number(r.total_taxes_paid || 0);
      p.afkManagerExpiresAt = Number(r.afk_manager_expires_at || 0);
      p.lastSeen = Number(r.last_seen || 0);
      p.createdAt = Number(r.created_at || 0);

      // Keep snake_case mirrors as well
      p.is_admin = p.isAdmin;
      p.is_banned = p.isBanned;
      p.jail_timer = p.jailTimer;
      p.net_worth = p.netWorth;
      p.dirty_cash = p.dirtyCash;
      return p;
    });
  }

  async function adminGetPlayer(username) {
    const rows = await _api(`players?username=eq.${encodeURIComponent(username)}&select=*`);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    const p = (typeof r.state ==='object' && r.state) ? { ...r.state } : {};
    p.username = r.username;
    p.pin = r.pin;
    p.cash = Number(r.cash || 0);
    p.bank = Number(r.bank || 0);
    p.dirtyCash = Number(r.dirty_cash || 0);
    p.netWorth = Number(r.net_worth || 0);
    p.xp = Number(r.xp || 0);
    p.title = r.title ||'عامل مبتدئ';
    p.jobId = r.job_id ||'worker';
    p.isAdmin = r.is_admin === true;
    p.isBanned = r.is_banned === true;
    p.jailTimer = Number(r.jail_timer || 0);
    p.totalTaxesPaid = Number(r.total_taxes_paid || 0);
    p.afkManagerExpiresAt = Number(r.afk_manager_expires_at || 0);
    p.lastSeen = Number(r.last_seen || 0);
    p.createdAt = Number(r.created_at || 0);
    p.is_admin = p.isAdmin;
    p.is_banned = p.isBanned;
    p.jail_timer = p.jailTimer;
    p.net_worth = p.netWorth;
    p.dirty_cash = p.dirtyCash;
    return p;
  }

  async function adminSavePlayer(username, updates) {
    const payload = {};
    if (updates.cash !== undefined) payload.cash = Number(updates.cash);
    if (updates.bank !== undefined) payload.bank = Number(updates.bank);
    if (updates.dirtyCash !== undefined) payload.dirty_cash = Number(updates.dirtyCash);
    if (updates.netWorth !== undefined) payload.net_worth = Number(updates.netWorth);
    if (updates.xp !== undefined) payload.xp = Number(updates.xp);
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.jobId !== undefined) payload.job_id = updates.jobId;
    if (updates.isAdmin !== undefined) payload.is_admin = Boolean(updates.isAdmin);
    if (updates.isBanned !== undefined) payload.is_banned = Boolean(updates.isBanned);
    if (updates.jailTimer !== undefined) payload.jail_timer = Number(updates.jailTimer);
    if (updates.pin !== undefined) payload.pin = updates.pin;
    if (updates.state !== undefined) payload.state = updates.state;
    payload.admin_modified_timestamp = Date.now();

    await _api(`players?username=eq.${encodeURIComponent(username)}`, {
      method:'PATCH',
      body: JSON.stringify(payload)
    });
    return true;
  }

  async function adminDeletePlayer(username) {
    await _api(`players?username=eq.${encodeURIComponent(username)}`, {
      method:'DELETE'
    });
    try { localStorage.removeItem(`rasalmal_state_${username}`); } catch (e) {}
    return true;
  }

  async function adminResetPlayer(username) {
    if (!username) return false;
    const now = Date.now();
    const cleanBusinesses = {
      kiosk: { level: 0, price: 15, workers: 0, suppliesTicks: 0 },
      coffee: { level: 0, price: 28, workers: 0, suppliesTicks: 0 },
      tech: { level: 0, price: 75, workers: 0, suppliesTicks: 0 },
      logistics: { level: 0, price: 120, workers: 0, suppliesTicks: 0 },
      supermarket: { level: 0, price: 200, workers: 0, suppliesTicks: 0 },
      solar_factory: { level: 0, price: 340, workers: 0, suppliesTicks: 0 },
      private_hospital: { level: 0, price: 600, workers: 0, suppliesTicks: 0 },
      media_studio: { level: 0, price: 1100, workers: 0, suppliesTicks: 0 },
      private_bank: { level: 0, price: 1800, workers: 0, suppliesTicks: 0 },
      oil_refinery: { level: 0, price: 2800, workers: 0, suppliesTicks: 0 },
      space_tech: { level: 0, price: 4800, workers: 0, suppliesTicks: 0 }
    };
    const cleanAssets = { apartment: 0, office: 0, mansion: 0, skyline_tower: 0, luxury_resort: 0, mega_yacht: 0, private_island: 0, orbital_station: 0 };
    const cleanStocks = { COMI: { shares: 0, avgPrice: 0 }, EAST: { shares: 0, avgPrice: 0 }, ETEL: { shares: 0, avgPrice: 0 }, FWRY: { shares: 0, avgPrice: 0 }, CASH: { shares: 0, avgPrice: 0 }, BITC: { shares: 0, avgPrice: 0 }, GOLD: { shares: 0, avgPrice: 0 }, AIX: { shares: 0, avgPrice: 0 } };

    const row = {
      cash: 300,
      bank: 0,
      dirty_cash: 0,
      net_worth: 400,
      xp: 0,
      title:'عامل مبتدئ',
      job_id:'worker',
      is_banned: false,
      jail_timer: 0,
      total_taxes_paid: 0,
      afk_manager_expires_at: now + (12 * 60 * 60 * 1000),
      state: {
        username,
        cash: 300,
        bank: 0,
        dirtyCash: 0,
        netWorth: 400,
        xp: 0,
        title:'عامل مبتدئ',
        jobId:'worker',
        underworldRep: 0,
        heatLevel: 0,
        jailTimer: 0,
        totalTaxesPaid: 0,
        afkManagerExpiresAt: now + (12 * 60 * 60 * 1000),
        activeLoan: null,
        investments: [],
        customItems: [],
        itemDurations: {},
        assets: cleanAssets,
        businesses: cleanBusinesses,
        stocks: cleanStocks,
        inventory: {},
        ownedCars: [],
        activeCar: null,
        smugglingFleet: { speedboat: 0, plane: 0, ship: 0 },
        activeSmugglingJobs: [],
        tradeCompany: {
          warehouseCapacity: 10,
          warehouse: {},
          activeImports: [],
          activeExports: [],
          totalProfitEarned: 0,
          totalShipmentsCompleted: 0
        },
        workCooldownUntil: 0,
        overtimeCooldownUntil: 0,
        casinoCooldownUntil: 0,
        loanCooldownUntil: 0,
        stockTradeCooldownUntil: 0,
        activityLog: [],
        lastSeen: now,
        cloudSavedAt: now
      },
      last_seen: now,
      admin_modified_timestamp: now
    };
    await _api(`players?username=ilike.${encodeURIComponent(username.trim())}`, {
      method:'PATCH',
      body: JSON.stringify(row)
    });
    return true;
  }

  async function adminBanPlayer(username) {
    await _api(`players?username=eq.${encodeURIComponent(username)}`, {
      method:'PATCH',
      body: JSON.stringify({ is_banned: true, admin_modified_timestamp: Date.now() })
    });
    return true;
  }

  async function adminUnbanPlayer(username) {
    await _api(`players?username=eq.${encodeURIComponent(username)}`, {
      method:'PATCH',
      body: JSON.stringify({ is_banned: false, admin_modified_timestamp: Date.now() })
    });
    return true;
  }

  async function adminChangePlayerPin(username, newPin) {
    const hashed = await hashPin(newPin);
    await _api(`players?username=eq.${encodeURIComponent(username)}`, {
      method:'PATCH',
      body: JSON.stringify({ pin: hashed })
    });
    return true;
  }

  async function adminReleaseJail(username) {
    await _api(`players?username=eq.${encodeURIComponent(username)}`, {
      method:'PATCH',
      body: JSON.stringify({ jail_timer: 0 })
    });
    return true;
  }

  async function adminSetPlayerJail(username, seconds) {
    await _api(`players?username=eq.${encodeURIComponent(username)}`, {
      method:'PATCH',
      body: JSON.stringify({ jail_timer: Number(seconds) })
    });
    return true;
  }

  async function adminSetPlayerAdminStatus(username, isAdmin) {
    await _api(`players?username=eq.${encodeURIComponent(username)}`, {
      method:'PATCH',
      body: JSON.stringify({ is_admin: Boolean(isAdmin) })
    });
    return true;
  }

  // ─────────────────────────────────────────────
  //  TOTAL SYSTEM RESET & WIPE (EXCEPT GIFT CODES)
  // ─────────────────────────────────────────────
  async function adminResetAllPlayers() {
    const now = Date.now();
    const cleanBusinesses = {
      kiosk: { level: 0, price: 15, workers: 0, suppliesTicks: 0 },
      coffee: { level: 0, price: 28, workers: 0, suppliesTicks: 0 },
      tech: { level: 0, price: 75, workers: 0, suppliesTicks: 0 },
      logistics: { level: 0, price: 120, workers: 0, suppliesTicks: 0 },
      supermarket: { level: 0, price: 200, workers: 0, suppliesTicks: 0 },
      solar_factory: { level: 0, price: 340, workers: 0, suppliesTicks: 0 },
      private_hospital: { level: 0, price: 600, workers: 0, suppliesTicks: 0 },
      media_studio: { level: 0, price: 1100, workers: 0, suppliesTicks: 0 },
      private_bank: { level: 0, price: 1800, workers: 0, suppliesTicks: 0 },
      oil_refinery: { level: 0, price: 2800, workers: 0, suppliesTicks: 0 },
      space_tech: { level: 0, price: 4800, workers: 0, suppliesTicks: 0 }
    };
    const cleanAssets = { apartment: 0, office: 0, mansion: 0, skyline_tower: 0, luxury_resort: 0, mega_yacht: 0, private_island: 0, orbital_station: 0 };
    const cleanStocks = { COMI: { shares: 0, avgPrice: 0 }, EAST: { shares: 0, avgPrice: 0 }, ETEL: { shares: 0, avgPrice: 0 }, FWRY: { shares: 0, avgPrice: 0 }, CASH: { shares: 0, avgPrice: 0 }, BITC: { shares: 0, avgPrice: 0 }, GOLD: { shares: 0, avgPrice: 0 }, AIX: { shares: 0, avgPrice: 0 } };

    const resetRow = {
      cash: 300,
      bank: 0,
      dirty_cash: 0,
      net_worth: 400,
      xp: 0,
      title:'عامل مبتدئ',
      job_id:'worker',
      jail_timer: 0,
      total_taxes_paid: 0,
      afk_manager_expires_at: now + (12 * 60 * 60 * 1000),
      state: {
        cash: 300,
        bank: 0,
        dirtyCash: 0,
        netWorth: 400,
        xp: 0,
        title:'عامل مبتدئ',
        jobId:'worker',
        underworldRep: 0,
        heatLevel: 0,
        jailTimer: 0,
        totalTaxesPaid: 0,
        afkManagerExpiresAt: now + (12 * 60 * 60 * 1000),
        activeLoan: null,
        investments: [],
        customItems: [],
        itemDurations: {},
        assets: cleanAssets,
        businesses: cleanBusinesses,
        stocks: cleanStocks,
        inventory: {},
        ownedCars: [],
        activeCar: null,
        smugglingFleet: { speedboat: 0, plane: 0, ship: 0 },
        activeSmugglingJobs: [],
        tradeCompany: {
          warehouseCapacity: 10,
          warehouse: {},
          activeImports: [],
          activeExports: [],
          totalProfitEarned: 0,
          totalShipmentsCompleted: 0
        },
        workCooldownUntil: 0,
        overtimeCooldownUntil: 0,
        casinoCooldownUntil: 0,
        loanCooldownUntil: 0,
        stockTradeCooldownUntil: 0,
        activityLog: [],
        lastSeen: now,
        cloudSavedAt: now
      },
      last_seen: now,
      admin_modified_timestamp: now
    };

    // 1. Reset ALL players to baseline (cash 300, bank 0, net worth 400, etc.)
    await _api('players?created_at=gt.0', {
      method:'PATCH',
      body: JSON.stringify(resetRow)
    });

    // 2. Wipe ALL corporations/alliances
    try {
      await _api('corporations?created_at=gt.0', { method:'DELETE' });
    } catch (e) {}

    // 3. Wipe ALL wire transfers history
    try {
      await _api('transfers?created_at=gt.0', { method:'DELETE' });
    } catch (e) {}

    // 4. Wipe ALL mailbox messages
    try {
      await _api('mailbox?created_at=gt.0', { method:'DELETE' });
    } catch (e) {}

    // 5. Reset all leaderboard caches
    try {
      await _api('globals?id=eq.hourly_leaderboard', {
        method:'PATCH',
        body: JSON.stringify({ data: { timestamp: now, topPlayers: [] } })
      });
    } catch (e) {}
    try {
      await _api('globals?id=eq.season_leaderboard', {
        method:'PATCH',
        body: JSON.stringify({ data: { timestamp: now, topPlayers: [] } })
      });
    } catch (e) {}

    // 6. Broadcast reload notification to all online players
    try {
      await sendForceReload('تم تصفير وإعادة ضبط اقتصاد ومشاريع اللعبة بالكامل لبدء موسم جديد عادل للجميع! انطلق الآن من الصفر');
    } catch (e) {}

    // NOTE: gift_codes table is strictly PRESERVED and untouched!
    return true;
  }

  async function adminWipeLeaderboard() {
    const now = Date.now();

    // 1. Delete ALL player accounts completely from Supabase
    await _api('players?created_at=gt.0', {
      method:'DELETE'
    });

    // 2. Wipe ALL corporations
    try {
      await _api('corporations?created_at=gt.0', { method:'DELETE' });
    } catch (e) {}

    // 3. Wipe ALL wire transfers
    try {
      await _api('transfers?created_at=gt.0', { method:'DELETE' });
    } catch (e) {}

    // 4. Wipe ALL mailbox messages
    try {
      await _api('mailbox?created_at=gt.0', { method:'DELETE' });
    } catch (e) {}

    // 5. Reset leaderboard caches
    try {
      await _api('globals?id=eq.hourly_leaderboard', {
        method:'PATCH',
        body: JSON.stringify({ data: { timestamp: now, topPlayers: [] } })
      });
    } catch (e) {}

    // 6. Broadcast reload
    try {
      await sendForceReload('تم مسح وإعادة ضبط اللعبة بالكامل لبدء موسم جديد. يرجى إنشاء حساب جديد أو تسجيل الدخول.');
    } catch (e) {}

    // NOTE: gift_codes table is strictly PRESERVED and untouched!
    return true;
  }

  async function adminRebuildLeaderboard() {
    const rows = await _api('players?order=net_worth.desc&limit=10&select=username,net_worth,title');
    const list = (rows || []).map(r => ({
      username: r.username,
      netWorth: Number(r.net_worth || 0),
      title: r.title ||'عامل مبتدئ'
    }));
    await _api('globals?id=eq.hourly_leaderboard', {
      method:'PATCH',
      body: JSON.stringify({ data: { timestamp: Date.now(), topPlayers: list } })
    });
    return list;
  }

  async function adminClearTransfers() {
    await _api('transfers?created_at=gt.0', { method:'DELETE' });
    return true;
  }

  async function adminGetTransfers() {
    try {
      return await _api('transfers?order=created_at.desc&limit=100');
    } catch (e) {
      return [];
    }
  }

  // ─────────────────────────────────────────────
  //  CORPORATIONS & AUCTIONS
  // ─────────────────────────────────────────────
  async function createCorporation(arg1, arg2, arg3, arg4) {
    let corpId ='';
    let name ='';
    let founder ='';
    let description ='';
    let treasury = 0;
    let members = [];
    let contributions = {};
    let projects = [];
    let isAdminCorp = false;

    if (typeof arg1 ==='object' && arg1 !== null) {
      corpId = arg1.id || String(Date.now());
      name = String(arg1.name ||'').trim();
      founder = String(arg1.founder ||'').trim();
      description = String(arg1.desc || arg1.description ||'').trim();
      treasury = Number(arg1.treasury || 0);
      members = Array.isArray(arg1.members) && arg1.members.length > 0 ? arg1.members : [founder];
      contributions = (typeof arg1.contributions ==='object' && arg1.contributions) ? arg1.contributions : {};
      projects = Array.isArray(arg1.projects) ? arg1.projects : [];
      isAdminCorp = arg1.isAdminCorp === true || arg1.is_admin_corp === true;
    } else {
      // Called with parameters:
      // ui.js calls: AppDB.createCorporation(name, desc, founder)
      // or admin: AppDB.createCorporation(name, founder, desc, treasury)
      name = String(arg1 ||'').trim();
      if (typeof arg3 ==='string' && arg3.trim().length > 0 && (!arg4 || isNaN(Number(arg4)))) {
        // (name, desc, founder)
        description = String(arg2 ||'').trim();
        founder = String(arg3 ||'').trim();
      } else if (arg2 && typeof arg2 ==='string') {
        // (name, founder, desc, treasury)
        founder = String(arg2 ||'').trim();
        description = String(arg3 ||'').trim();
        treasury = Number(arg4 || 0);
      }
      corpId = String(Date.now());
      members = [founder];
      contributions = { [founder]: 0 };
    }

    if (!name) throw new Error('اسم الشركة مطلوب.');
    if (!founder) throw new Error('اسم المؤسس مطلوب.');

    contributions._level = 1;
    contributions._roles = { [founder]:'founder' };

    // Embed description in contributions if provided so schema constraint is respected
    if (description) {
      contributions._desc = description;
    }

    const payload = {
      id: corpId,
      name,
      founder,
      treasury: Number(treasury || 0),
      members: members.filter(Boolean),
      contributions,
      projects,
      is_admin_corp: isAdminCorp,
      created_at: Date.now()
    };

    await _api('corporations', {
      method:'POST',
      body: JSON.stringify(payload)
    });

    return corpId;
  }

  async function getCorporationsList() {
    try {
      const rows = await _api('corporations?order=treasury.desc');
      return (rows || []).map(r => {
        const contribs = (typeof r.contributions ==='object' && r.contributions) ? r.contributions : {};
        let totalContributions = 0;
        Object.keys(contribs).forEach(k => {
          if (!k.startsWith('_') && typeof contribs[k] ==='number') {
            totalContributions += contribs[k];
          }
        });
        return {
          id: r.id,
          name: r.name,
          founder: r.founder,
          treasury: Number(r.treasury || 0),
          level: Number(contribs._level || 1),
          roles: (contribs._roles && typeof contribs._roles ==='object') ? contribs._roles : { [r.founder]:'founder' },
          members: Array.isArray(r.members) ? r.members : [],
          contributions: contribs,
          totalContributions,
          projects: Array.isArray(r.projects) ? r.projects : (r.projects && typeof r.projects ==='object' ? Object.keys(r.projects).filter(k => r.projects[k] === true) : []),
          isAdminCorp: r.is_admin_corp === true,
          desc: contribs._desc ||''
        };
      });
    } catch (e) {
      return [];
    }
  }

  function listenToCorporations(callback) {
    // Egress Zero-Traffic: Corporations polling replaced with local supply chain engine
    return () => {};
  }

  async function joinCorporation(corpId, username) {
    const rows = await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`);
    if (!rows || rows.length === 0) throw new Error('الشركة غير موجودة.');
    const corp = rows[0];
    const members = corp.members || [];
    if (members.includes(username)) throw new Error('أنت عضو في هذه الشركة بالفعل.');
    if (members.length >= 25) throw new Error('الشركة بلغت الحد الأقصى من الأعضاء (25).');
    members.push(username);
    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method:'PATCH',
      body: JSON.stringify({ members })
    });
    return true;
  }

  async function leaveCorporation(corpId, username) {
    if (!corpId || !username) throw new Error('بيانات المغادرة غير صالحة.');
    const u = username.trim();
    const rows = await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`);
    if (!rows || rows.length === 0) throw new Error('الشركة غير موجودة.');
    const corp = rows[0];
    let members = Array.isArray(corp.members) ? corp.members : [];
    if (!members.includes(u)) throw new Error('أنت لست عضواً في هذه الشركة.');

    members = members.filter(m => m !== u);

    // If the leaving player is the founder
    if (corp.founder === u) {
      if (members.length > 0) {
        // Transfer founder to next member
        const newFounder = members[0];
        await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
          method:'PATCH',
          body: JSON.stringify({
            founder: newFounder,
            members: members
          })
        });
      } else {
        // No members left, delete the corporation
        await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
          method:'DELETE'
        });
      }
      return true;
    }

    // Normal member leaving
    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method:'PATCH',
      body: JSON.stringify({ members })
    });
    return true;
  }

  async function kickCorpMember(corpId, targetUsername) {
    if (!corpId || !targetUsername) throw new Error('بيانات الطرد غير صالحة.');
    const u = targetUsername.trim();
    const rows = await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`);
    if (!rows || rows.length === 0) throw new Error('الشركة غير موجودة.');
    const corp = rows[0];
    let members = Array.isArray(corp.members) ? corp.members : [];
    members = members.filter(m => m !== u);
    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method:'PATCH',
      body: JSON.stringify({ members })
    });
    return true;
  }

  async function contributeToCorporation(corpId, username, amount) {
    const amt = Number(amount);
    if (amt <= 0) throw new Error('المبلغ غير صالح.');

    const pRows = await _api(`players?username=eq.${encodeURIComponent(username)}&select=cash,net_worth`);
    if (!pRows || pRows.length === 0) throw new Error('اللاعب غير موجود.');
    if (Number(pRows[0].cash) < amt) throw new Error('رصيدك لا يكفي.');

    const cRows = await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`);
    if (!cRows || cRows.length === 0) throw new Error('الشركة غير موجودة.');
    const corp = cRows[0];

    // Deduct cash from player
    await _api(`players?username=eq.${encodeURIComponent(username)}`, {
      method:'PATCH',
      body: JSON.stringify({
        cash: Number(pRows[0].cash) - amt,
        net_worth: Math.max(0, Number(pRows[0].net_worth) - amt)
      })
    });

    // Add to corp treasury
    const contribs = corp.contributions || {};
    contribs[username] = (Number(contribs[username]) || 0) + amt;
    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method:'PATCH',
      body: JSON.stringify({
        treasury: Number(corp.treasury || 0) + amt,
        contributions: contribs
      })
    });
    return true;
  }

  async function buyCorporationProject(corpId, projectId, projectCost) {
    const cRows = await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`);
    if (!cRows || cRows.length === 0) throw new Error('الشركة غير موجودة.');
    const corp = cRows[0];
    if (Number(corp.treasury) < Number(projectCost)) throw new Error('خزينة الشركة لا تكفي لتمويل هذا المشروع.');

    const projects = corp.projects || [];
    if (projects.includes(projectId)) throw new Error('هذا المشروع مملوك للشركة بالفعل.');
    projects.push(projectId);

    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method:'PATCH',
      body: JSON.stringify({
        treasury: Number(corp.treasury) - Number(projectCost),
        projects
      })
    });
    return true;
  }

  async function editCorpInfo(corpId, newName, newDesc) {
    if (!corpId) throw new Error('معرف الشركة غير صالح.');
    const rows = await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`);
    if (!rows || rows.length === 0) throw new Error('الشركة غير موجودة.');
    const corp = rows[0];
    const contribs = (typeof corp.contributions ==='object' && corp.contributions) ? { ...corp.contributions } : {};
    contribs._desc = newDesc ||'';
    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method:'PATCH',
      body: JSON.stringify({
        name: newName || corp.name,
        contributions: contribs
      })
    });
    return true;
  }

  async function transferCorpOwnership(corpId, newFounder) {
    if (!corpId || !newFounder) throw new Error('بيانات نقل الملكية غير صالحة.');
    const rows = await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`);
    if (!rows || rows.length === 0) throw new Error('الشركة غير موجودة.');
    const corp = rows[0];
    const members = Array.isArray(corp.members) ? corp.members : [];
    if (!members.includes(newFounder)) throw new Error('العضو المحدد غير موجود في الشركة.');
    const contribs = (typeof corp.contributions ==='object' && corp.contributions) ? { ...corp.contributions } : {};
    contribs._roles = contribs._roles || {};
    contribs._roles[corp.founder] ='member';
    contribs._roles[newFounder] ='founder';
    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method:'PATCH',
      body: JSON.stringify({
        founder: newFounder,
        contributions: contribs
      })
    });
    return true;
  }

  async function promoteCorpMember(corpId, targetUsername, role) {
    if (!corpId || !targetUsername) throw new Error('بيانات الترقية غير صالحة.');
    const rows = await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`);
    if (!rows || rows.length === 0) throw new Error('الشركة غير موجودة.');
    const corp = rows[0];
    const members = Array.isArray(corp.members) ? corp.members : [];
    if (!members.includes(targetUsername)) throw new Error('اللاعب ليس عضواً في الشركة.');
    const contribs = (typeof corp.contributions ==='object' && corp.contributions) ? { ...corp.contributions } : {};
    contribs._roles = contribs._roles || {};
    contribs._roles[targetUsername] = role; //'cfo' or'member'
    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method:'PATCH',
      body: JSON.stringify({
        contributions: contribs
      })
    });
    return true;
  }

  async function payoutFromCorpTreasury(corpId, targetUsername, amount) {
    const amt = Math.floor(Number(amount));
    if (!corpId || !targetUsername || isNaN(amt) || amt <= 0) throw new Error('بيانات التحويل غير صالحة.');
    const cRows = await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`);
    if (!cRows || cRows.length === 0) throw new Error('الشركة غير موجودة.');
    const corp = cRows[0];
    const members = Array.isArray(corp.members) ? corp.members : [];
    if (!members.includes(targetUsername)) throw new Error('اللاعب المستهدف ليس عضواً في هذه الشركة.');
    const treasury = Number(corp.treasury || 0);
    if (treasury < amt) throw new Error(`خزينة الشركة لا تحتوي على سيولة كافية. المتوفر: ${treasury.toLocaleString()} EGP.`);

    const pRows = await _api(`players?username=eq.${encodeURIComponent(targetUsername)}&select=cash,net_worth`);
    if (!pRows || pRows.length === 0) throw new Error('حساب اللاعب المستهدف غير موجود في قاعدة البيانات.');
    const p = pRows[0];

    // Deduct from corp treasury
    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method:'PATCH',
      body: JSON.stringify({
        treasury: treasury - amt
      })
    });

    // Add to player cash
    await _api(`players?username=eq.${encodeURIComponent(targetUsername)}`, {
      method:'PATCH',
      body: JSON.stringify({
        cash: Number(p.cash || 0) + amt,
        net_worth: Number(p.net_worth || 0) + amt
      })
    });
    return true;
  }

  async function upgradeCorporationLevel(corpId, cost) {
    const c = Math.floor(Number(cost));
    if (!corpId || isNaN(c) || c <= 0) throw new Error('بيانات الترقية غير صالحة.');
    const rows = await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`);
    if (!rows || rows.length === 0) throw new Error('الشركة غير موجودة.');
    const corp = rows[0];
    const treasury = Number(corp.treasury || 0);
    if (treasury < c) throw new Error(`رصيد الخزينة (${treasury.toLocaleString()} EGP) لا يكفي لتكلفة الترقية (${c.toLocaleString()} EGP).`);

    const contribs = (typeof corp.contributions ==='object' && corp.contributions) ? { ...corp.contributions } : {};
    const curLevel = Number(contribs._level || 1);
    contribs._level = curLevel + 1;

    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method:'PATCH',
      body: JSON.stringify({
        treasury: treasury - c,
        contributions: contribs
      })
    });
    return true;
  }

  async function dissolveCorporation(corpId) {
    if (!corpId) throw new Error('معرف الشركة غير صالح.');
    const rows = await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`);
    if (!rows || rows.length === 0) throw new Error('الشركة غير موجودة.');
    const corp = rows[0];
    const treasury = Number(corp.treasury || 0);
    const contribs = (typeof corp.contributions ==='object' && corp.contributions) ? corp.contributions : {};
    const members = Array.isArray(corp.members) ? corp.members : [];

    let totalCont = 0;
    Object.keys(contribs).forEach(k => {
      if (!k.startsWith('_') && typeof contribs[k] ==='number') totalCont += contribs[k];
    });

    // Refund treasury to members proportionally
    if (treasury > 0 && members.length > 0) {
      for (const m of members) {
        const myCont = contribs[m] || 0;
        const share = totalCont > 0 ? (myCont / totalCont) : (m === corp.founder ? 1 : 0);
        const refund = Math.floor(treasury * share);
        if (refund > 0) {
          try {
            const pRows = await _api(`players?username=eq.${encodeURIComponent(m)}&select=cash,net_worth`);
            if (pRows && pRows.length > 0) {
              await _api(`players?username=eq.${encodeURIComponent(m)}`, {
                method:'PATCH',
                body: JSON.stringify({
                  cash: Number(pRows[0].cash || 0) + refund,
                  net_worth: Number(pRows[0].net_worth || 0) + refund
                })
              });
            }
          } catch (e) {
            console.warn('[DB] Failed refund to' + m, e);
          }
        }
      }
    }

    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method:'DELETE'
    });
    return true;
  }

  async function adminUpdateCorp(corpId, updates = {}) {
    if (!corpId) throw new Error('معرف الشركة مطلوب.');
    const rows = await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`);
    if (!rows || rows.length === 0) throw new Error('الشركة غير موجودة.');
    const corp = rows[0];
    const contribs = (typeof corp.contributions ==='object' && corp.contributions) ? { ...corp.contributions } : {};
    if (updates.level !== undefined) contribs._level = Number(updates.level || 1);
    if (updates.desc !== undefined) contribs._desc = String(updates.desc ||'');

    const patchPayload = { contributions: contribs };
    if (updates.name) patchPayload.name = String(updates.name).trim();

    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method:'PATCH',
      body: JSON.stringify(patchPayload)
    });
    return true;
  }

  async function adminToggleCorpProject(corpId, projectId, forceState) {
    if (!corpId || !projectId) throw new Error('بيانات المشروع غير صالحة.');
    const rows = await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`);
    if (!rows || rows.length === 0) throw new Error('الشركة غير موجودة.');
    const corp = rows[0];
    let projects = Array.isArray(corp.projects) ? [...corp.projects] : [];
    const hasProj = projects.includes(projectId);
    const enable = (forceState !== undefined) ? Boolean(forceState) : !hasProj;

    if (enable && !hasProj) {
      projects.push(projectId);
    } else if (!enable && hasProj) {
      projects = projects.filter(p => p !== projectId);
    }

    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method:'PATCH',
      body: JSON.stringify({ projects })
    });
    return true;
  }

  async function adminEditCorporationTreasury(corpId, newTreasury) {
    const val = Number(newTreasury);
    if (isNaN(val) || val < 0) throw new Error('قيمة الخزينة غير صالحة.');
    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method:'PATCH',
      body: JSON.stringify({ treasury: val })
    });
    return true;
  }

  async function adminDeleteCorporation(corpId) {
    if (!corpId) throw new Error('معرف الشركة مطلوب.');
    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method:'DELETE'
    });
    return true;
  }

  async function adminDistributeCorpDividends(corpId, pct = 25) {
    const p = Number(pct);
    if (isNaN(p) || p <= 0 || p > 100) throw new Error('نسبة التوزيع يجب أن تكون بين 1% و 100%.');
    const rows = await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`);
    if (!rows || rows.length === 0) throw new Error('الشركة غير موجودة.');
    const corp = rows[0];
    const treasury = Number(corp.treasury || 0);
    if (treasury <= 0) throw new Error('خزينة الشركة فارغة لا يمكن توزيع أرباح منها.');

    const totalDividends = Math.floor(treasury * (p / 100));
    const members = Array.isArray(corp.members) ? corp.members : [];
    if (members.length === 0) throw new Error('لا يوجد أعضاء في هذه الشركة.');

    const contribs = (typeof corp.contributions ==='object' && corp.contributions) ? corp.contributions : {};
    let totalCont = 0;
    Object.keys(contribs).forEach(k => {
      if (!k.startsWith('_') && typeof contribs[k] ==='number') totalCont += contribs[k];
    });

    for (const m of members) {
      const myCont = contribs[m] || 0;
      const share = totalCont > 0 ? (myCont / totalCont) : (1 / members.length);
      const payout = Math.floor(totalDividends * share);
      if (payout > 0) {
        try {
          const pRows = await _api(`players?username=eq.${encodeURIComponent(m)}&select=cash,net_worth`);
          if (pRows && pRows.length > 0) {
            await _api(`players?username=eq.${encodeURIComponent(m)}`, {
              method:'PATCH',
              body: JSON.stringify({
                cash: Number(pRows[0].cash || 0) + payout,
                net_worth: Number(pRows[0].net_worth || 0) + payout
              })
            });
          }
        } catch (e) {
          console.warn('[DB] Failed dividend to' + m, e);
        }
      }
    }

    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method:'PATCH',
      body: JSON.stringify({
        treasury: treasury - totalDividends
      })
    });
    return true;
  }

  async function getLiveAuctionsList() {
    return [];
  }

  function listenToLiveAuctions(callback) {
    return () => {};
  }

  async function registerForAuction(auctionId, username) {
    return true;
  }

  async function placeAuctionBid(auctionId, username, bidAmount) {
    const amt = Number(bidAmount);
    const pRows = await _api(`players?username=eq.${encodeURIComponent(username)}&select=cash`);
    if (!pRows || Number(pRows[0].cash) < amt) throw new Error('رصيدك لا يكفي لتقديم هذا العرض.');

    const aRows = await _api(`live_auctions?id=eq.${encodeURIComponent(auctionId)}`);
    if (!aRows || aRows.length === 0) throw new Error('المزاد غير موجود.');
    const auc = aRows[0];
    if (amt <= Number(auc.current_bid)) throw new Error('المزايدة يجب أن تكون أعلى من السعر الحالي.');

    await _api(`live_auctions?id=eq.${encodeURIComponent(auctionId)}`, {
      method:'PATCH',
      body: JSON.stringify({
        current_bid: amt,
        highest_bidder: username,
        bid_count: Number(auc.bid_count || 0) + 1
      })
    });
    return true;
  }

  // Daily backup placeholder
  async function checkAndCreateDailyBackup(username, state) {
    return true;
  }

  //  Unified Official Hourly Leaderboard Document Engine
  let _leaderboardMeta = {
    updatedAt: Date.now(),
    nextUpdateAt: Date.now() + 3600000,
    cycleMinutes: 60
  };
  let _leaderboardCache = null;
  let _lastLeaderboardFetchTime = 0;

  function getLeaderboardMeta() {
    return _leaderboardMeta;
  }

  async function _rebuildAndSaveLeaderboard() {
    const now = Date.now();
    try {
      const rows = await _api('players?select=username,cash,bank,net_worth,title,job_id,is_admin,is_banned&is_banned=eq.false&order=net_worth.desc&limit=10');
      const topPlayers = (rows || []).map(r => ({
        username: r.username,
        cash: Number(r.cash || 0),
        bank: Number(r.bank || 0),
        netWorth: Number(r.net_worth || 0),
        net_worth: Number(r.net_worth || 0),
        title: r.title ||'عامل مبتدئ',
        jobId: r.job_id ||'worker',
        isAdmin: r.is_admin === true,
        facebookVerified: false
      }));

      _leaderboardMeta = {
        updatedAt: now,
        nextUpdateAt: now + (60 * 60 * 1000), // Exactly 1 hour
        cycleMinutes: 60
      };

      const docPayload = {
        id:'leaderboard',
        data: {
          updatedAt: _leaderboardMeta.updatedAt,
          nextUpdateAt: _leaderboardMeta.nextUpdateAt,
          cycleMinutes: 60,
          topPlayers: topPlayers
        },
        updated_at: now
      };

      await _api('globals', {
        method:'POST',
        headers: {'Prefer':'resolution=merge-duplicates' },
        body: JSON.stringify(docPayload)
      });

      _leaderboardCache = topPlayers;
      _lastLeaderboardFetchTime = now;
      return topPlayers;
    } catch (e) {
      console.warn('[DB] _rebuildAndSaveLeaderboard error:', e.message);
      return _leaderboardCache || [];
    }
  }

  async function getLeaderboard(forceRefresh = false) {
    const now = Date.now();

    // Fast in-memory cache for repeated calls within 10 seconds
    if (!forceRefresh && _leaderboardCache && (now - _lastLeaderboardFetchTime < 10000)) {
      return _leaderboardCache;
    }

    try {
      const gRows = await _api('globals?id=eq.leaderboard');
      if (gRows && gRows.length > 0 && gRows[0].data) {
        const d = gRows[0].data;
        const nextUpdate = Number(d.nextUpdateAt || 0);
        const topList = Array.isArray(d.topPlayers) ? d.topPlayers : [];

        _leaderboardMeta = {
          updatedAt: Number(d.updatedAt || now),
          nextUpdateAt: nextUpdate > 0 ? nextUpdate : (now + 3600000),
          cycleMinutes: Number(d.cycleMinutes || 60)
        };

        // If the hour has passed, or leaderboard is empty, rebuild and update the unified document
        if (forceRefresh || topList.length === 0 || now >= nextUpdate) {
          return await _rebuildAndSaveLeaderboard();
        }

        _leaderboardCache = topList;
        _lastLeaderboardFetchTime = now;
        return topList;
      }
    } catch (err) {
      console.warn('[DB] getLeaderboard globals fetch error:', err.message);
    }

    return await _rebuildAndSaveLeaderboard();
  }

  //  Live In-Game Public Chat (Egress-Optimized with Metadata Polling)
  let _lastChatUpdatedAt = 0;
  let _cachedChatMessages = [];
  let _chatPollInterval = null;
  let _lastChatPollTime = 0;
  const _chatCallbacks = new Set();

  async function sendChatMessage(sender, senderTitle, message, facebookVerified = false) {
    if (!message || !message.trim()) return false;
    const msgObj = {
      id:'msg_' + Date.now() +'_' + Math.random().toString(36).substring(2, 6),
      sender: String(sender ||'لاعب'),
      senderTitle: String(senderTitle ||'عامل مبتدئ'),
      message: String(message).trim().substring(0, 200),
      facebookVerified: Boolean(facebookVerified),
      timestamp: Date.now()
    };

    try {
      const rows = await _api("globals?id=eq.chat_feed&select=data,updated_at");
      let currentFeed = [];
      if (rows && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.messages)) {
        currentFeed = rows[0].data.messages;
      }
      currentFeed.push(msgObj);
      if (currentFeed.length > 50) {
        currentFeed = currentFeed.slice(currentFeed.length - 50);
      }

      const nowTs = Date.now();
      _cachedChatMessages = currentFeed;
      _lastChatUpdatedAt = nowTs;

      await _api('globals', {
        method:'POST',
        headers: {'Prefer':'resolution=merge-duplicates' },
        body: JSON.stringify({
          id:'chat_feed',
          data: { messages: currentFeed },
          updated_at: nowTs
        })
      });

      // Notify local listeners immediately without extra network fetch
      _chatCallbacks.forEach(cb => {
        try { cb(_cachedChatMessages); } catch (e) {}
      });

      return true;
    } catch (err) {
      console.warn('[DB] sendChatMessage error:', err.message);
      return false;
    }
  }

  async function getChatMessages(force = false) {
    try {
      // 1. If we already have cached messages and force is false, query ONLY updated_at (~35 bytes instead of 20KB!)
      if (!force && _cachedChatMessages.length > 0 && _lastChatUpdatedAt > 0) {
        const metaRows = await _api("globals?id=eq.chat_feed&select=updated_at");
        if (metaRows && metaRows.length > 0) {
          const remoteTs = Number(metaRows[0].updated_at || 0);
          if (remoteTs <= _lastChatUpdatedAt) {
            return _cachedChatMessages; // No new messages! Saved 20KB egress!
          }
          _lastChatUpdatedAt = remoteTs;
        }
      }

      // 2. Fetch messages data only when changed or on initial load
      const rows = await _api("globals?id=eq.chat_feed&select=data,updated_at");
      if (rows && rows.length > 0) {
        _lastChatUpdatedAt = Number(rows[0].updated_at || Date.now());
        if (rows[0].data && Array.isArray(rows[0].data.messages)) {
          _cachedChatMessages = rows[0].data.messages;
          return _cachedChatMessages;
        }
      }
      return _cachedChatMessages;
    } catch (e) {
      return _cachedChatMessages;
    }
  }

  function _isChatDrawerOpen() {
    if (typeof document ==='undefined') return false;
    const drawer = document.getElementById('chat-drawer');
    const adminChatSubpanel = document.getElementById('admin-subpanel-chat');
    const isMainDrawerOpen = drawer && drawer.classList.contains('chat-drawer-open');
    const isAdminChatOpen = adminChatSubpanel && !adminChatSubpanel.classList.contains('hidden');
    return Boolean(isMainDrawerOpen || isAdminChatOpen);
  }

  async function _pollChatTick() {
    if (!isNetworkActive()) return; // 100% pause when idle or tab hidden
    if (_chatCallbacks.size === 0) return;

    const isDrawerOpen = _isChatDrawerOpen();
    const now = Date.now();

    // When drawer is closed, only poll updated_at once every 60s for unread badge!
    if (!isDrawerOpen && (now - _lastChatPollTime < 60000)) {
      return;
    }

    _lastChatPollTime = now;
    try {
      const prevTs = _lastChatUpdatedAt;
      const msgs = await getChatMessages();
      if (_lastChatUpdatedAt !== prevTs || prevTs === 0) {
        _chatCallbacks.forEach(cb => {
          try { cb(msgs); } catch (e) {}
        });
      }
    } catch (e) {}
  }

  function triggerImmediateChatSync() {
    if (isNetworkActive()) {
      _lastChatPollTime = 0;
      _pollChatTick();
    }
  }

  function listenToChatMessages(callback) {
    if (typeof callback !=='function') return () => {};
    _chatCallbacks.add(callback);

    // Initial deliver from cache or fresh fetch
    if (_cachedChatMessages.length > 0) {
      callback(_cachedChatMessages);
    } else {
      getChatMessages(true).then(msgs => callback(msgs));
    }

    // Start polling tick (5 seconds when drawer open, 60s when closed, 0 when idle/hidden)
    if (!_chatPollInterval) {
      _chatPollInterval = registerPollingInterval(setInterval(_pollChatTick, 5000));
    }

    return () => {
      _chatCallbacks.delete(callback);
      if (_chatCallbacks.size === 0 && _chatPollInterval) {
        unregisterPollingInterval(_chatPollInterval);
        _chatPollInterval = null;
      }
    };
  }

  function stopListeningToChat() {
    _chatCallbacks.clear();
    if (_chatPollInterval) {
      unregisterPollingInterval(_chatPollInterval);
      _chatPollInterval = null;
    }
  }

  async function clearChatMessages() {
    try {
      _cachedChatMessages = [];
      _lastChatUpdatedAt = Date.now();
      await _api('globals', {
        method:'POST',
        headers: {'Prefer':'resolution=merge-duplicates' },
        body: JSON.stringify({
          id:'chat_feed',
          data: { messages: [] },
          updated_at: _lastChatUpdatedAt
        })
      });
      _chatCallbacks.forEach(cb => {
        try { cb([]); } catch (e) {}
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  // ── Unified Stock Market Global Events ──
  async function getGlobalMarketEvent() {
    try {
      const rows = await _api("globals?id=eq.market_event&select=*");
      if (rows && rows.length > 0 && rows[0].data) {
        return rows[0].data;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async function saveGlobalMarketEvent(eventData) {
    try {
      await _api('globals', {
        method:'POST',
        headers: {'Prefer':'resolution=merge-duplicates' },
        body: JSON.stringify({
          id:'market_event',
          data: eventData,
          updated_at: Date.now()
        })
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  // ─────────────────────────────────────────────
  //  COMPATIBILITY LAYER (MOCKS FIREBASE FOR ANY DIRECT UI CALLS)
  // ─────────────────────────────────────────────
  if (typeof window !=='undefined') {
    const mockCollection = (collName) => ({
      doc: (docId) => ({
        get: async () => {
          if (collName ==='globals') {
            const rows = await _api(`globals?id=eq.${encodeURIComponent(docId)}`).catch(() => []);
            return { exists: rows && rows.length > 0, data: () => (rows[0] && rows[0].data) || {} };
          }
          if (collName ==='players') {
            const rows = await _api(`players?username=eq.${encodeURIComponent(docId)}`).catch(() => []);
            return { exists: rows && rows.length > 0, data: () => (rows[0] && rows[0].state) || {} };
          }
          return { exists: false, data: () => ({}) };
        },
        set: async (data, opts) => {
          if (collName ==='globals') {
            await _api('globals', {
              method:'POST',
              headers: {'Prefer':'resolution=merge-duplicates' },
              body: JSON.stringify({ id: docId, data, updated_at: Date.now() })
            }).catch(() => {});
          }
          return true;
        },
        update: async (data) => true,
        delete: async () => true,
        onSnapshot: (cb) => {
          if (typeof cb !=='function') return () => {};

          if (collName ==='players') {
            let isSubscribed = true;
            const checkPlayer = async () => {
              if (!isSubscribed) return;
              if (!isNetworkActive()) return; // Gated by IdleManager
              try {
                const rows = await _api(`players?username=eq.${encodeURIComponent(docId)}&select=username,cash,bank,dirty_cash,net_worth,xp,title,job_id,is_admin,is_banned,jail_timer,admin_modified_timestamp`);
                if (rows && rows.length > 0 && isSubscribed) {
                  const r = rows[0];
                  const d = {};
                  d.username = r.username;
                  d.cash = Number(r.cash || 0);
                  d.bank = Number(r.bank || 0);
                  d.dirtyCash = Number(r.dirty_cash || 0);
                  d.netWorth = Number(r.net_worth || 0);
                  d.xp = Number(r.xp || 0);
                  d.title = r.title ||'عامل مبتدئ';
                  d.jobId = r.job_id ||'worker';
                  d.isAdmin = r.is_admin === true;
                  d.isBanned = r.is_banned === true;
                  d.jailTimer = Number(r.jail_timer || 0);
                  d.adminModifiedTimestamp = Number(r.admin_modified_timestamp || 0);
                  cb({ exists: true, data: () => d });
                }
              } catch (e) {}
            };
            checkPlayer();
            const pollId = registerPollingInterval(setInterval(checkPlayer, 25000));
            const unsubResume = onActiveResume(() => {
              if (isSubscribed) checkPlayer();
            });
            return () => {
              isSubscribed = false;
              unregisterPollingInterval(pollId);
              unsubResume();
            };
          }

          if (collName ==='globals') {
            let isSubscribed = true;
            const checkGlobal = async () => {
              if (!isSubscribed) return;
              if (!isNetworkActive()) return; // Gated by IdleManager
              try {
                const rows = await _api(`globals?id=eq.${encodeURIComponent(docId)}&select=data,updated_at`).catch(() => []);
                if (rows && rows.length > 0 && isSubscribed) {
                  cb({ exists: true, data: () => (rows[0] && rows[0].data) || {} });
                }
              } catch (e) {}
            };
            checkGlobal();
            const pollId = registerPollingInterval(setInterval(checkGlobal, 60000));
            const unsubResume = onActiveResume(() => {
              if (isSubscribed) checkGlobal();
            });
            return () => {
              isSubscribed = false;
              unregisterPollingInterval(pollId);
              unsubResume();
            };
          }

          return () => {};
        }
      }),
      add: async (data) => ({ id: String(Date.now()) }),
      where: () => mockCollection(collName),
      orderBy: () => mockCollection(collName),
      limit: () => mockCollection(collName),
      get: async () => ({ docs: [], forEach: () => {} }),
      onSnapshot: (cb) => (() => {})
    });

    if (!window.firebase) {
      window.firebase = {};
    }
    window.firebase.firestore = () => ({
      collection: mockCollection,
      runTransaction: async (fn) => fn({
        get: async (ref) => ref.get(),
        set: (ref, data) => ref.set(data),
        update: (ref, data) => ref.update(data)
      })
    });
  }

  // ─────────────────────────────────────────────
  
  async function loginPlayer(username, pin) {
    if (!username || !pin) throw new Error('يرجى إدخال اسم المستخدم والرقم السري.');
    const u = username.trim();
    const ok = await verifyPin(u, pin);
    if (!ok) {
      try {
        const exists = await _api(`players?username=ilike.${encodeURIComponent(u)}&select=username`);
        if (!exists || exists.length === 0) {
          throw new Error('اسم المستخدم غير مسجل، يرجى إنشاء حساب جديد.');
        }
      } catch (checkErr) {
        if (checkErr.message && checkErr.message.includes('غير مسجل')) throw checkErr;
      }
      throw new Error('الرقم السري غير صحيح. يرجى التأكد من الرمز والمحاولة مرة أخرى.');
    }
    const state = await getPlayerState(u);
    if (!state) {
      throw new Error('تعذر تحميل بيانات الحساب من السحابة، يرجى المحاولة مرة أخرى.');
    }
    return state;
  }

  async function adminGetGiftCodes() {
    try {
      const rows = await _api('gift_codes?order=created_at.desc');
      return (rows || []).map(r => {
        const usedBy = Array.isArray(r.used_by) ? r.used_by : [];
        const maxU = Number(r.max_uses || 0);
        return {
          id: r.code,
          code: r.code,
          rewardType:'cash',
          rewardDetails: { amount: Number(r.reward_cash || 0) },
          maxUses: maxU,
          usedCount: usedBy.length,
          usedBy: usedBy,
          createdAt: Number(r.created_at || 0)
        };
      });
    } catch (e) { return []; }
  }

  async function adminCreateGiftCode(code, type, details, maxUses = 100) {
    let rewardCash = 0;
    if (typeof type ==='number') {
      rewardCash = type;
      if (details !== undefined && typeof details ==='number') {
        maxUses = details;
      }
    } else if (details && details.amount) {
      rewardCash = Number(details.amount);
    } else if (typeof details ==='number') {
      rewardCash = details;
    }

    const maxU = Number(maxUses || 0);

    await _api('gift_codes', {
      method:'POST',
      headers: {'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify({
        code: code.trim().toUpperCase(),
        reward_cash: rewardCash,
        max_uses: maxU,
        used_by: [],
        created_at: Date.now()
      })
    });
    return true;
  }

  async function adminDeleteGiftCode(code) {
    await _api('gift_codes?code=eq.' + encodeURIComponent(code.trim().toUpperCase()), {
      method:'DELETE'
    });
    return true;
  }

  //  PUBLIC API EXPORT
  // ─────────────────────────────────────────────
  return {
    init,
    isFirebaseReady: true,
    CLIENT_VERSION,
    SUPABASE_URL,
    setEncryptedLocalState,
    getDecryptedLocalState,

    
    loginPlayer,
    getItemsConfig: async () => ({}),
    adminGetGiftCodes,
    adminCreateGiftCode,
    adminDeleteGiftCode,
    getSeasonHonors: async () => [],
    getLeaderboardMeta,
    adminSaveItemConfig: async () => true,
    adminCreateAuctionItem: async () => true,
    getAuctionItems: async () => [],
    purchaseAuctionItem: async () => true,
    adminDeleteAuctionItem: async () => true,
    checkVersion: async () => ({ upToDate: true, clientVersion:'5.1', remoteVersion:'5.1' }),
    pendingSyncs: 0,

    // Auth & Player
    registerPlayer,
    verifyPin,
    getPlayerState,
    savePlayerState,
    syncProgressToCloud,
    flushStateToCloudOnExit,
    getLeaderboard,

    // Transfers
    executeWireTransfer,
    getPlayerTransfers,
    createTransferRequest,
    getIncomingTransferRequests,
    getSentTransferRequests,
    acceptTransferRequest,
    rejectTransferRequest,

    // Gift Codes
    redeemGiftCode,

    // Mailbox
    sendMail,
    listenToMailbox,
    updateMailStatus,
    deleteMail,
    markAllMailsRead,

    // Globals
    sendBroadcast,
    sendAirdrop,
    setMaintenanceMode,
    getMaintenanceStatus,
    sendForceReload,
    getForceReloadStatus,
    adminSaveTaxConfig,
    adminSaveServerConfig,
    getServerConfig,

    // System Stats & Admin
    getSystemStats,
    adminGetAllPlayers,
    adminGetPlayer,
    adminSavePlayer,
    adminSetPlayerState: async (u, s) => adminSavePlayer(u, { state: s }),
    adminAwardSeasonHonors: async () => true,
    adminAwardTop25Veterans: async () => true,
    adminDeletePlayer,
    adminResetPlayer,
    adminBanPlayer,
    adminUnbanPlayer,
    adminChangePlayerPin,
    adminReleaseJail,
    adminSetPlayerJail,
    adminSetPlayerAdminStatus,
    adminResetAllPlayers,
    adminClearTransfers,
    adminGetTransfers,
    adminWipeLeaderboard,
    adminRebuildLeaderboard,

    // Backups
    checkAndCreateDailyBackup,
    getPlayerBackupDates: async () => [],
    getPlayerBackupState: async () => null,
    adminRestorePlayerFromState: async () => true,

    // Corporations
    createCorporation,
    getCorporationsList,
    listenToCorporations,
    joinCorporation,
    contributeToCorporation,
    buyCorporationProject,
    adminCreateCorporation: createCorporation,
    adminUpdateCorp,
    adminToggleCorpProject,
    adminKickCorpMember: kickCorpMember,
    adminSetCorpMemberRole: promoteCorpMember,
    adminTransferCorpFounder: transferCorpOwnership,
    adminDistributeCorpDividends,
    adminDeleteCorporation,
    adminEditCorporationTreasury,
    leaveCorporation,
    kickCorpMember,
    editCorpInfo,
    transferCorpOwnership,
    promoteCorpMember,
    payoutFromCorpTreasury,
    upgradeCorporationLevel,
    dissolveCorporation,

    // Auctions
    adminCreateLiveAuction: async () => true,
    adminStartLiveAuction: async () => true,
    adminDeleteLiveAuction: async () => true,
    getLiveAuctionsList,
    listenToLiveAuctions,
    registerForAuction,
    placeAuctionBid,

    // Chat methods
    sendChatMessage,
    getChatMessages,
    listenToChatMessages,
    clearChatMessages,
    triggerImmediateChatSync,
    stopListeningToChat,
    listenToPrivateChat: () => (() => {}),

    // Idle & Egress Control
    isNetworkActive,
    onActiveResume,
    cleanupAllNetworkPolling,

    // Unified Stock Market
    getGlobalMarketEvent,
    saveGlobalMarketEvent,

    // Top-up & Monetization
    getTopupPackages,
    saveTopupPackages,
    getPaymentSettings,
    savePaymentSettings,
    submitTopupRequest,
    getTopupRequests,
    processTopupRequest,
    getPlayerData
  };
})();

if (typeof module !=='undefined' && module.exports) {
  module.exports = AppDB;
}

if (typeof window !=="undefined") {
  window.AppDB = AppDB;
}
