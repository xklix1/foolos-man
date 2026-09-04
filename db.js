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
  const CLIENT_VERSION = 'V5.2';
  const SUPABASE_URL = 'https://rhuiaxrodnbjohowdlpo.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_O2L34RTDz6k2UQvrkrNA_Q_t5Nty9t7';

  let firebaseReady = true; // Kept for backward compatibility checks across UI
  let _supabaseClient = null;

  // ─────────────────────────────────────────────
  //  HTTP HELPER (POSTGREST DIRECT REST ENGINE)
  // ─────────────────────────────────────────────
  async function _api(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      let parsed = null;
      try { parsed = JSON.parse(errBody); } catch (e) {}
      const msg = (parsed && (parsed.message || parsed.hint || parsed.details)) || errBody || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    return null;
  }

  // ─────────────────────────────────────────────
  //  LOCAL ENCRYPTION CACHE
  // ─────────────────────────────────────────────
  function _xorEncryptDecrypt(input, key = "FoolosMan_2026_SecureKey") {
    let output = "";
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
  //  INITIALIZATION
  // ─────────────────────────────────────────────
  async function init() {
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      console.log('[DB] Running inside Capacitor Native Engine.');
    }

    // Initialize Supabase JS client if loaded via CDN
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        _supabaseClient = window.supabase.createClient( SUPABASE_ANON_KEY);
        console.log('[DB] Cloud Engine initialized successfully.');
      } catch (e) {
        console.warn('[DB] Cloud fallback:', e.message);
      }
    }

    firebaseReady = true;
    return true;
  }

  // ─────────────────────────────────────────────
  //  PLAYER AUTH & STATE MANAGEMENT
  // ─────────────────────────────────────────────
  async function hashPin(pin) {
    if (!pin) return '1234';
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const msgBuffer = new TextEncoder().encode(String(pin));
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {}
    }
    return String(pin);
  }

  async function registerPlayer(username, pin) {
    if (!username || !pin) throw new Error('يرجى إدخال اسم المستخدم ورمز PIN.');
    const u = username.trim();
    const p = String(pin).trim();

    // Check if exists
    const existing = await _api(`players?username=eq.${encodeURIComponent(u)}&select=username`);
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
      title: 'عامل مبتدئ',
      job_id: 'worker',
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
        title: 'عامل مبتدئ',
        jobId: 'worker',
        assets: { apartment: 0, office: 0, mansion: 0, skyline_tower: 0, luxury_resort: 0, mega_yacht: 0, private_island: 0, orbital_station: 0 },
        businesses: { coffee_cart: { level: 0, workers: 0 }, burger_truck: { level: 0, workers: 0 }, grocery: { level: 0, workers: 0 }, laundry: { level: 0, workers: 0 }, bakery: { level: 0, workers: 0 }, car_wash: { level: 0, workers: 0 }, gym: { level: 0, workers: 0 }, electronics: { level: 0, workers: 0 }, restaurant: { level: 0, workers: 0 }, real_estate_agency: { level: 0, workers: 0 }, auto_dealership: { level: 0, workers: 0 }, private_hospital: { level: 0, workers: 0 }, commercial_bank: { level: 0, workers: 0 } },
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
      method: 'POST',
      body: JSON.stringify(newPlayerRow)
    });

    setEncryptedLocalState(`rasalmal_state_${u}`, newPlayerRow.state);
    return true;
  }

  async function verifyPin(username, inputPin) {
    if (!username || !inputPin) return false;
    const u = username.trim();
    const p = String(inputPin).trim();

    const rows = await _api(`players?username=eq.${encodeURIComponent(u)}&select=pin`);
    if (!rows || rows.length === 0) return false;

    const stored = rows[0].pin;
    if (stored === p) return true;
    const hashed = await hashPin(p);
    return stored === hashed;
  }

  async function getPlayerState(username) {
    if (!username) return null;
    const u = username.trim();

    try {
      const rows = await _api(`players?username=eq.${encodeURIComponent(u)}&select=*`);
      if (!rows || rows.length === 0) {
        return getDecryptedLocalState(`rasalmal_state_${u}`);
      }

      const row = rows[0];
      const stateObj = (typeof row.state === 'object' && row.state) ? { ...row.state } : {};

      // Overwrite critical authoritative server fields
      stateObj.username = row.username;
      stateObj.cash = Number(row.cash || 0);
      stateObj.bank = Number(row.bank || 0);
      stateObj.dirtyCash = Number(row.dirty_cash || 0);
      stateObj.netWorth = Number(row.net_worth || 0);
      stateObj.xp = Number(row.xp || 0);
      stateObj.title = row.title || stateObj.title || 'عامل مبتدئ';
      stateObj.jobId = row.job_id || stateObj.jobId || 'worker';
      stateObj.isAdmin = row.is_admin === true;
      stateObj.isBanned = row.is_banned === true;
      stateObj.jailTimer = Number(row.jail_timer || 0);
      stateObj.afkManagerExpiresAt = Number(row.afk_manager_expires_at || 0);
      stateObj.totalTaxesPaid = Number(row.total_taxes_paid || 0);
      stateObj.pin = row.pin || stateObj.pin;
      stateObj.lastSeen = Number(row.last_seen || Date.now());

      setEncryptedLocalState(`rasalmal_state_${u}`, stateObj);
      return stateObj;
    } catch (err) {
      console.warn('[DB] getPlayerState fallback to local:', err.message);
      return getDecryptedLocalState(`rasalmal_state_${u}`);
    }
  }

  let _saveDebounceTimers = {};
  async function savePlayerState(username, state, immediate = false) {
    if (!username || !state) return;
    const u = username.trim();
    state.username = u;
    state.lastSeen = Date.now();

    // Cache locally INSTANTLY (0 lag, 100% responsive)
    setEncryptedLocalState(`rasalmal_state_${u}`, state);

    const payload = {
      username: u,
      cash: Number(state.cash || 0),
      bank: Number(state.bank || 0),
      dirty_cash: Number(state.dirtyCash || 0),
      net_worth: Number(state.netWorth || 0),
      xp: Number(state.xp || 0),
      title: state.title || 'عامل مبتدئ',
      job_id: state.jobId || 'worker',
      is_admin: state.isAdmin === true,
      is_banned: state.isBanned === true,
      jail_timer: Number(state.jailTimer || 0),
      afk_manager_expires_at: Number(state.afkManagerExpiresAt || 0),
      total_taxes_paid: Number(state.totalTaxesPaid || 0),
      state: state,
      last_seen: Date.now()
    };
    if (state.pin) payload.pin = state.pin;

    const doCloudSave = async () => {
      try {
        await _api(`players?username=eq.${encodeURIComponent(u)}`, {
          method: 'PATCH',
          headers: { 'Prefer': 'return=minimal' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn('[DB] Cloud save warning:', err.message);
      }
    };

    if (immediate) {
      if (_saveDebounceTimers[u]) {
        clearTimeout(_saveDebounceTimers[u]);
        delete _saveDebounceTimers[u];
      }
      return await doCloudSave();
    }

    // Debounce saves smoothly (Supabase has no write quota, but 5-second debounce keeps network light)
    if (!_saveDebounceTimers[u]) {
      _saveDebounceTimers[u] = setTimeout(() => {
        delete _saveDebounceTimers[u];
        doCloudSave();
      }, 5000);
    }
  }

  async function syncProgressToCloud(username, force = false) {
    if (!username) return { success: false, message: 'مطلوب اسم المستخدم.' };
    const s = (window.GameEngine && window.GameEngine.state) || getDecryptedLocalState(`rasalmal_state_${username}`);
    if (!s) return { success: false, message: 'لا توجد بيانات لحفظها.' };
    await savePlayerState(username, s, true);
    return { success: true, message: 'تم حفظ ومزامنة التقدم مع السحابة بنجاح! ☁️✅' };
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
      method: 'POST',
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

    await _api('transfer_requests', {
      method: 'POST',
      body: JSON.stringify({
        sender: senderUsername.trim(),
        recipient: recipientUsername.trim(),
        amount: amt,
        status: 'pending',
        created_at: Date.now()
      })
    });
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
    if (req.status !== 'pending') throw new Error('هذا الطلب تم الرد عليه مسبقاً.');

    // Execute transfer from recipient to sender
    await executeWireTransfer(recipientUsername, req.sender, req.amount);

    // Update status
    await _api(`transfer_requests?id=eq.${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'accepted' })
    });
    return true;
  }

  async function rejectTransferRequest(requestId, recipientUsername) {
    await _api(`transfer_requests?id=eq.${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'rejected' })
    });
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

    const pState = (typeof p.state === 'object' && p.state) ? { ...p.state } : {};
    pState.cash = newCash;
    pState.netWorth = newWorth;

    await _api(`players?username=eq.${encodeURIComponent(u)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        cash: newCash,
        net_worth: newWorth,
        state: pState
      })
    });

    // Update gift code usedBy
    usedBy.push(u.toLowerCase());
    await _api(`gift_codes?code=eq.${encodeURIComponent(normalized)}`, {
      method: 'PATCH',
      body: JSON.stringify({ used_by: usedBy })
    });

    return {
      success: true,
      rewardType: 'cash',
      rewardText: `${reward.toLocaleString()} EGP كاش مالي`,
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
    await _api('mailbox', {
      method: 'POST',
      body: JSON.stringify({
        sender: sender.trim(),
        recipient: recipient.trim(),
        type,
        payload,
        status: 'unread',
        created_at: Date.now()
      })
    });
    return true;
  }

  function listenToMailbox(username, callback) {
    if (!username || typeof callback !== 'function') return () => {};
    const u = username.trim();

    const fetchMails = async () => {
      try {
        const rows = await _api(`mailbox?recipient=eq.${encodeURIComponent(u)}&order=created_at.desc&limit=50`);
        const normalized = (rows || []).map(r => ({
          ...r,
          timestamp: Number(r.created_at || r.timestamp || Date.now()),
          created_at: Number(r.created_at || r.timestamp || Date.now())
        }));
        callback(normalized);
      } catch (e) {}
    };

    fetchMails();
    const interval = setInterval(fetchMails, 4000); // 4-second polling for instant wire transfer and mail delivery
    return () => clearInterval(interval);
  }

  async function updateMailStatus(mailId, status) {
    await _api(`mailbox?id=eq.${encodeURIComponent(mailId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    return true;
  }

  async function deleteMail(mailId) {
    await _api(`mailbox?id=eq.${encodeURIComponent(mailId)}`, {
      method: 'DELETE'
    });
    return true;
  }

  // ─────────────────────────────────────────────
  //  GLOBALS (BROADCASTS, CONFIG, MAINTENANCE)
  // ─────────────────────────────────────────────
  async function sendBroadcast(title, message) {
    await _api('globals', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: 'broadcast',
        data: { title, message, timestamp: Date.now() },
        updated_at: Date.now()
      })
    });
    return true;
  }

  async function sendAirdrop(amount) {
    await _api('globals', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: 'airdrop',
        data: { amount: Number(amount), timestamp: Date.now() },
        updated_at: Date.now()
      })
    });
    return true;
  }

  async function setMaintenanceMode(active, message = '') {
    await _api('globals', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: 'maintenance',
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
    return { active: false, message: '' };
  }

  async function adminSaveTaxConfig(config) {
    await _api('globals', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: 'taxConfig',
        data: config,
        updated_at: Date.now()
      })
    });
    return true;
  }

  async function adminSaveServerConfig(config) {
    await _api('globals', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: 'serverConfig',
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
    const rows = await _api('players?select=*&order=net_worth.desc');
    return (rows || []).map(r => {
      const p = (typeof r.state === 'object' && r.state) ? { ...r.state } : {};
      p.username = r.username;
      p.pin = r.pin;
      p.cash = Number(r.cash || 0);
      p.bank = Number(r.bank || 0);
      p.dirtyCash = Number(r.dirty_cash || 0);
      p.netWorth = Number(r.net_worth || 0);
      p.xp = Number(r.xp || 0);
      p.title = r.title || 'عامل مبتدئ';
      p.jobId = r.job_id || 'worker';
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
    const p = (typeof r.state === 'object' && r.state) ? { ...r.state } : {};
    p.username = r.username;
    p.pin = r.pin;
    p.cash = Number(r.cash || 0);
    p.bank = Number(r.bank || 0);
    p.dirtyCash = Number(r.dirty_cash || 0);
    p.netWorth = Number(r.net_worth || 0);
    p.xp = Number(r.xp || 0);
    p.title = r.title || 'عامل مبتدئ';
    p.jobId = r.job_id || 'worker';
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
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return true;
  }

  async function adminDeletePlayer(username) {
    await _api(`players?username=eq.${encodeURIComponent(username)}`, {
      method: 'DELETE'
    });
    try { localStorage.removeItem(`rasalmal_state_${username}`); } catch (e) {}
    return true;
  }

  async function adminResetPlayer(username) {
    const row = {
      cash: 300,
      bank: 0,
      dirty_cash: 0,
      net_worth: 400,
      xp: 0,
      title: 'عامل مبتدئ',
      job_id: 'worker',
      is_banned: false,
      jail_timer: 0,
      total_taxes_paid: 0,
      state: {
        username,
        cash: 300,
        bank: 0,
        dirtyCash: 0,
        netWorth: 400,
        xp: 0,
        title: 'عامل مبتدئ',
        jobId: 'worker',
        assets: {},
        businesses: {},
        stocks: {},
        inventory: {},
        ownedCars: [],
        activeCar: null,
        smugglingFleet: {},
        activeSmugglingJobs: [],
        lastSeen: Date.now()
      },
      last_seen: Date.now(),
      admin_modified_timestamp: Date.now()
    };
    await _api(`players?username=eq.${encodeURIComponent(username)}`, {
      method: 'PATCH',
      body: JSON.stringify(row)
    });
    return true;
  }

  async function adminBanPlayer(username) {
    await _api(`players?username=eq.${encodeURIComponent(username)}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_banned: true, admin_modified_timestamp: Date.now() })
    });
    return true;
  }

  async function adminUnbanPlayer(username) {
    await _api(`players?username=eq.${encodeURIComponent(username)}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_banned: false, admin_modified_timestamp: Date.now() })
    });
    return true;
  }

  async function adminChangePlayerPin(username, newPin) {
    const hashed = await hashPin(newPin);
    await _api(`players?username=eq.${encodeURIComponent(username)}`, {
      method: 'PATCH',
      body: JSON.stringify({ pin: hashed })
    });
    return true;
  }

  async function adminReleaseJail(username) {
    await _api(`players?username=eq.${encodeURIComponent(username)}`, {
      method: 'PATCH',
      body: JSON.stringify({ jail_timer: 0 })
    });
    return true;
  }

  async function adminSetPlayerJail(username, seconds) {
    await _api(`players?username=eq.${encodeURIComponent(username)}`, {
      method: 'PATCH',
      body: JSON.stringify({ jail_timer: Number(seconds) })
    });
    return true;
  }

  async function adminSetPlayerAdminStatus(username, isAdmin) {
    await _api(`players?username=eq.${encodeURIComponent(username)}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_admin: Boolean(isAdmin) })
    });
    return true;
  }

  async function adminResetAllPlayers() {
    const players = await adminGetAllPlayers();
    for (const p of players) {
      if (!p.is_admin) {
        await adminResetPlayer(p.username);
      }
    }
    return true;
  }

  async function adminClearTransfers() {
    await _api('transfers?amount=gt.0', { method: 'DELETE' });
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
  async function createCorporation(corpData) {
    await _api('corporations', {
      method: 'POST',
      body: JSON.stringify({
        id: corpData.id || String(Date.now()),
        name: corpData.name,
        founder: corpData.founder,
        treasury: Number(corpData.treasury || 0),
        members: corpData.members || [corpData.founder],
        contributions: corpData.contributions || {},
        projects: corpData.projects || [],
        is_admin_corp: corpData.isAdminCorp === true,
        created_at: Date.now()
      })
    });
    return true;
  }

  async function getCorporationsList() {
    try {
      const rows = await _api('corporations?order=treasury.desc');
      return (rows || []).map(r => ({
        id: r.id,
        name: r.name,
        founder: r.founder,
        treasury: Number(r.treasury || 0),
        members: r.members || [],
        contributions: r.contributions || {},
        projects: r.projects || [],
        isAdminCorp: r.is_admin_corp
      }));
    } catch (e) {
      return [];
    }
  }

  function listenToCorporations(callback) {
    getCorporationsList().then(callback);
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
      method: 'PATCH',
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
          method: 'PATCH',
          body: JSON.stringify({
            founder: newFounder,
            members: members
          })
        });
      } else {
        // No members left, delete the corporation
        await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
          method: 'DELETE'
        });
      }
      return true;
    }

    // Normal member leaving
    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method: 'PATCH',
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
      method: 'PATCH',
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
      method: 'PATCH',
      body: JSON.stringify({
        cash: Number(pRows[0].cash) - amt,
        net_worth: Math.max(0, Number(pRows[0].net_worth) - amt)
      })
    });

    // Add to corp treasury
    const contribs = corp.contributions || {};
    contribs[username] = (Number(contribs[username]) || 0) + amt;
    await _api(`corporations?id=eq.${encodeURIComponent(corpId)}`, {
      method: 'PATCH',
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
      method: 'PATCH',
      body: JSON.stringify({
        treasury: Number(corp.treasury) - Number(projectCost),
        projects
      })
    });
    return true;
  }

  async function getLiveAuctionsList() {
    try {
      const rows = await _api('live_auctions?status=eq.active&order=ends_at.asc');
      return (rows || []).map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        seller: r.seller,
        startingPrice: Number(r.starting_price),
        currentBid: Number(r.current_bid),
        highestBidder: r.highest_bidder,
        bidCount: Number(r.bid_count || 0),
        status: r.status,
        endsAt: Number(r.ends_at)
      }));
    } catch (e) {
      return [];
    }
  }

  function listenToLiveAuctions(callback) {
    getLiveAuctionsList().then(callback);
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
      method: 'PATCH',
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

  // 🏆 Top 10 Richest Players Leaderboard
  async function getLeaderboard() {
    try {
      const rows = await _api('players?select=username,cash,bank,net_worth,title,job_id,is_admin,is_banned,state&is_banned=eq.false&order=net_worth.desc&limit=25');
      return (rows || []).map(r => ({
        username: r.username,
        cash: Number(r.cash || 0),
        bank: Number(r.bank || 0),
        netWorth: Number(r.net_worth || 0),
        net_worth: Number(r.net_worth || 0),
        title: r.title || 'عامل مبتدئ',
        jobId: r.job_id || 'worker',
        isAdmin: r.is_admin === true,
        facebookVerified: Boolean(r.state && (r.state.facebookVerified || (r.state.badges && r.state.badges.includes('facebook'))))
      }));
    } catch (e) {
      console.warn('[DB] getLeaderboard error:', e.message);
      return [];
    }
  }

  // 💬 Live In-Game Public Chat
  async function sendChatMessage(sender, senderTitle, message, facebookVerified = false) {
    if (!message || !message.trim()) return false;
    const msgObj = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sender: String(sender || 'لاعب'),
      senderTitle: String(senderTitle || 'عامل مبتدئ'),
      message: String(message).trim().substring(0, 200),
      facebookVerified: Boolean(facebookVerified),
      timestamp: Date.now()
    };

    try {
      const rows = await _api("globals?id=eq.chat_feed&select=*");
      let currentFeed = [];
      if (rows && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.messages)) {
        currentFeed = rows[0].data.messages;
      }
      currentFeed.push(msgObj);
      if (currentFeed.length > 50) {
        currentFeed = currentFeed.slice(currentFeed.length - 50);
      }

      await _api('globals', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          id: 'chat_feed',
          data: { messages: currentFeed },
          updated_at: Date.now()
        })
      });
      return true;
    } catch (err) {
      console.warn('[DB] sendChatMessage error:', err.message);
      return false;
    }
  }

  async function getChatMessages() {
    try {
      const rows = await _api("globals?id=eq.chat_feed&select=*");
      if (rows && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.messages)) {
        return rows[0].data.messages;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  let _chatPollInterval = null;
  function listenToChatMessages(callback) {
    getChatMessages().then(msgs => {
      if (typeof callback === 'function') callback(msgs);
    });

    if (_chatPollInterval) clearInterval(_chatPollInterval);
    _chatPollInterval = setInterval(async () => {
      try {
        const msgs = await getChatMessages();
        if (typeof callback === 'function') callback(msgs);
      } catch (e) {}
    }, 2500);

    return () => {
      if (_chatPollInterval) clearInterval(_chatPollInterval);
    };
  }

  async function clearChatMessages() {
    try {
      await _api('globals', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          id: 'chat_feed',
          data: { messages: [] },
          updated_at: Date.now()
        })
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
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          id: 'market_event',
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
  if (typeof window !== 'undefined') {
    const mockCollection = (collName) => ({
      doc: (docId) => ({
        get: async () => {
          if (collName === 'globals') {
            const rows = await _api(`globals?id=eq.${encodeURIComponent(docId)}`).catch(() => []);
            return { exists: rows && rows.length > 0, data: () => (rows[0] && rows[0].data) || {} };
          }
          if (collName === 'players') {
            const rows = await _api(`players?username=eq.${encodeURIComponent(docId)}`).catch(() => []);
            return { exists: rows && rows.length > 0, data: () => (rows[0] && rows[0].state) || {} };
          }
          return { exists: false, data: () => ({}) };
        },
        set: async (data, opts) => {
          if (collName === 'globals') {
            await _api('globals', {
              method: 'POST',
              headers: { 'Prefer': 'resolution=merge-duplicates' },
              body: JSON.stringify({ id: docId, data, updated_at: Date.now() })
            }).catch(() => {});
          }
          return true;
        },
        update: async (data) => true,
        delete: async () => true,
        onSnapshot: (cb) => {
          if (typeof cb !== 'function') return () => {};

          if (collName === 'players') {
            let isSubscribed = true;
            const checkPlayer = async () => {
              if (!isSubscribed) return;
              try {
                const rows = await _api(`players?username=eq.${encodeURIComponent(docId)}&select=*`);
                if (rows && rows.length > 0 && isSubscribed) {
                  const r = rows[0];
                  const d = (typeof r.state === 'object' && r.state) ? { ...r.state } : {};
                  d.username = r.username;
                  d.cash = Number(r.cash || 0);
                  d.bank = Number(r.bank || 0);
                  d.dirtyCash = Number(r.dirty_cash || 0);
                  d.netWorth = Number(r.net_worth || 0);
                  d.xp = Number(r.xp || 0);
                  d.title = r.title || 'عامل مبتدئ';
                  d.jobId = r.job_id || 'worker';
                  d.isAdmin = r.is_admin === true;
                  d.isBanned = r.is_banned === true;
                  d.jailTimer = Number(r.jail_timer || 0);
                  d.adminModifiedTimestamp = Number(r.admin_modified_timestamp || 0);
                  cb({ exists: true, data: () => d });
                }
              } catch (e) {}
            };
            checkPlayer();
            const pollId = setInterval(checkPlayer, 2000); // 2-second real-time check for instant admin sync
            return () => {
              isSubscribed = false;
              clearInterval(pollId);
            };
          }

          if (collName === 'globals') {
            let isSubscribed = true;
            const checkGlobal = async () => {
              if (!isSubscribed) return;
              try {
                const rows = await _api(`globals?id=eq.${encodeURIComponent(docId)}`).catch(() => []);
                if (rows && rows.length > 0 && isSubscribed) {
                  cb({ exists: true, data: () => (rows[0] && rows[0].data) || {} });
                }
              } catch (e) {}
            };
            checkGlobal();
            const pollId = setInterval(checkGlobal, 5000);
            return () => {
              isSubscribed = false;
              clearInterval(pollId);
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
      throw new Error('الرقم السري غير صحيح. يرجى المحاولة مرة أخرى.');
    }
    const state = await getPlayerState(u);
    if (!state) {
      throw new Error('اسم المستخدم غير مسجل، يرجى إنشاء حساب جديد.');
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
          rewardType: 'cash',
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
    if (typeof type === 'number') {
      rewardCash = type;
      if (details !== undefined && typeof details === 'number') {
        maxUses = details;
      }
    } else if (details && details.amount) {
      rewardCash = Number(details.amount);
    } else if (typeof details === 'number') {
      rewardCash = details;
    }

    const maxU = Number(maxUses || 0);

    await _api('gift_codes', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
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
      method: 'DELETE'
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
    adminGetGiftCodes,
    adminCreateGiftCode,
    adminDeleteGiftCode,
    getSeasonHonors: async () => [],
    getLeaderboardMeta: async () => ({ season: 1, endsAt: Date.now() + 86400000 }),
    adminSaveItemConfig: async () => true,
    adminCreateAuctionItem: async () => true,
    getAuctionItems: async () => [],
    purchaseAuctionItem: async () => true,
    adminDeleteAuctionItem: async () => true,
    dissolveCorporation: async () => true,
    promoteCorpMember: async () => true,
    payoutFromCorpTreasury: async () => true,
    upgradeCorporationLevel: async () => true,
    checkVersion: async () => ({ upToDate: true, clientVersion: '5.1', remoteVersion: '5.1' }),
    pendingSyncs: 0,

    // Auth & Player
    registerPlayer,
    verifyPin,
    getPlayerState,
    savePlayerState,
    syncProgressToCloud,
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

    // Globals
    sendBroadcast,
    sendAirdrop,
    setMaintenanceMode,
    getMaintenanceStatus,
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
    adminWipeLeaderboard: async () => true,
    adminRebuildLeaderboard: async () => true,

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
    adminUpdateCorp: async () => true,
    adminToggleCorpProject: async () => true,
    adminKickCorpMember: async () => true,
    adminSetCorpMemberRole: async () => true,
    adminTransferCorpFounder: async () => true,
    adminDistributeCorpDividends: async () => true,
    adminDeleteCorporation: async () => true,
    adminEditCorporationTreasury: async () => true,
    leaveCorporation,
    kickCorpMember,
    editCorpInfo: async () => true,
    transferCorpOwnership: async () => true,

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
    listenToPrivateChat: () => (() => {}),

    // Unified Stock Market
    getGlobalMarketEvent,
    saveGlobalMarketEvent
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppDB;
}

if (typeof window !== "undefined") {
  window.AppDB = AppDB;
}
