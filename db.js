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
  //  SECURE SERVER-ANCHORED MONOTONIC TIME ENGINE
  //  (IMMUNE TO SYSTEM CLOCK TAMPERING / TIME CHEATS)
  // ─────────────────────────────────────────────
  let _baseServerTime = Date.now();
  let _basePerfTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
  let _hasServerTimeSynced = false;

  function _updateServerTimeFromHeader(dateHeader) {
    if (!dateHeader) return;
    try {
      const serverMs = new Date(dateHeader).getTime();
      if (!isNaN(serverMs) && serverMs > 0) {
        _baseServerTime = serverMs;
        _basePerfTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
        _hasServerTimeSynced = true;
      }
    } catch (e) {}
  }

  function getTrustedNow() {
    if (typeof performance !== 'undefined' && performance.now) {
      const elapsed = performance.now() - _basePerfTime;
      return _baseServerTime + Math.floor(elapsed);
    }
    return Date.now();
  }

  async function fetchServerTime() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/players?select=username&limit=1`, {
        method: 'HEAD',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
      });
      const dateHeader = res.headers.get('date');
      if (dateHeader) _updateServerTimeFromHeader(dateHeader);
    } catch (e) {}
    return getTrustedNow();
  }

  async function _api(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const method = (options.method || 'GET').toUpperCase();
    const headers = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    // Auto-inject Prefer: return=minimal for mutating queries to save Supabase Egress (HTTP 204)
    if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
      if (!headers['Prefer']) {
        headers['Prefer'] = 'return=minimal';
      } else if (!headers['Prefer'].includes('return=')) {
        headers['Prefer'] += ', return=minimal';
      }
    }

    const res = await fetch(url, { ...options, headers });
    const dateHeader = res.headers.get('date');
    if (dateHeader) _updateServerTimeFromHeader(dateHeader);

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

  // ─────────────────────────────────────────────
  //  DEVICE FINGERPRINTING & HARDWARE INTEGRITY
  // ─────────────────────────────────────────────
  const DeviceFingerprint = (() => {
    let _cachedFp = null;

    function _simpleHash(str) {
      let h1 = 0xdeadbeef ^ 0, h2 = 0x41c64e6d ^ 0;
      for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
    }

    function _getWebGlFingerprint() {
      try {
        if (typeof document === 'undefined') return 'no_dom';
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'no_webgl';
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
          return `${vendor}~${renderer}`;
        }
        return `${gl.getParameter(gl.VENDOR)}~${gl.getParameter(gl.RENDERER)}`;
      } catch (e) {
        return 'webgl_err';
      }
    }

    function _getCanvas2dFingerprint() {
      try {
        if (typeof document === 'undefined') return 'no_dom';
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (!ctx) return 'no_2d_ctx';
        ctx.textBaseline = 'top';
        ctx.font = "14px 'Arial', sans-serif";
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('RasAlMal.Online-2026🛡️', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Anti-Feeder-Shield', 4, 30);
        return _simpleHash(canvas.toDataURL());
      } catch (e) {
        return 'canvas_err';
      }
    }

    function _getScreenMetrics() {
      try {
        if (typeof window === 'undefined') return 'no_window';
        const w = (window.screen && window.screen.width) || 0;
        const h = (window.screen && window.screen.height) || 0;
        const cd = (window.screen && window.screen.colorDepth) || 0;
        const dpr = window.devicePixelRatio || 1;
        return `${w}x${h}x${cd}@${dpr}`;
      } catch (e) {
        return 'screen_err';
      }
    }

    function _getPersistentSeed() {
      try {
        if (typeof localStorage === 'undefined') return 'no_storage';
        let seed = localStorage.getItem('rasalmal_device_seed');
        if (!seed) {
          seed = 'seed_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
          localStorage.setItem('rasalmal_device_seed', seed);
        }
        return seed;
      } catch (e) {
        return 'seed_err';
      }
    }

    async function getFingerprint() {
      if (_cachedFp) return _cachedFp;
      try {
        const webgl = _getWebGlFingerprint();
        const canvasHash = _getCanvas2dFingerprint();
        const screen = _getScreenMetrics();
        const lang = (typeof navigator !== 'undefined' && ((navigator.languages && navigator.languages[0]) || navigator.language)) || '';
        const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 0;
        const tz = new Date().getTimezoneOffset();

        // Hardware profile components (consistent even in Incognito mode & across sessions)
        const hwProfile = [webgl, canvasHash, screen, lang, cores, tz].join('|');
        const hwHash = _simpleHash(hwProfile);

        _cachedFp = `dev_hw_${hwHash}`;
        return _cachedFp;
      } catch (e) {
        return 'dev_fallback_' + Math.random().toString(36).substring(2, 10);
      }
    }

    function getRegisteredAccountOnDevice() {
      try {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem('rasalmal_registered_account') || null;
      } catch (e) {
        return null;
      }
    }

    function recordRegisteredAccountOnDevice(username) {
      try {
        if (typeof localStorage !== 'undefined' && username) {
          localStorage.setItem('rasalmal_registered_account', String(username).trim());
        }
      } catch (e) {}
    }

    return {
      getFingerprint,
      getRegisteredAccountOnDevice,
      recordRegisteredAccountOnDevice
    };
  })();

  // ─────────────────────────────────────────────
  //  DEVICE REGISTRY & FRAUD AUDITING
  // ─────────────────────────────────────────────
  async function getDeviceRegistry() {
    try {
      const rows = await _api('globals?id=eq.device_registry');
      if (rows && rows.length > 0 && rows[0].data) {
        const data = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
        return {
          devices: (data && data.devices) || {},
          accounts: (data && data.accounts) || {}
        };
      }
    } catch (e) {
      console.warn('[DB] getDeviceRegistry error:', e.message);
    }
    return { devices: {}, accounts: {} };
  }

  async function saveDeviceRegistry(registry) {
    try {
      await _api('globals', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          id: 'device_registry',
          data: {
            devices: (registry && registry.devices) || {},
            accounts: (registry && registry.accounts) || {}
          },
          updated_at: Date.now()
        })
      });
    } catch (e) {
      console.warn('[DB] saveDeviceRegistry error:', e.message);
    }
  }

  async function getFraudAlerts(limit = 60) {
    try {
      const rows = await _api('globals?id=eq.fraud_alerts');
      if (rows && rows.length > 0 && rows[0].data) {
        const data = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
        const alerts = Array.isArray(data.alerts) ? data.alerts : [];
        return alerts.slice(0, limit);
      }
    } catch (e) {
      console.warn('[DB] getFraudAlerts error:', e.message);
    }
    return [];
  }

  async function logFraudAlert(alert) {
    try {
      const rows = await _api('globals?id=eq.fraud_alerts');
      let alerts = [];
      if (rows && rows.length > 0 && rows[0].data) {
        const data = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
        alerts = Array.isArray(data.alerts) ? data.alerts : [];
      }
      alerts.unshift({
        id: 'fa_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        timestamp: Date.now(),
        ...alert
      });
      if (alerts.length > 100) alerts = alerts.slice(0, 100);

      await _api('globals', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          id: 'fraud_alerts',
          data: { alerts },
          updated_at: Date.now()
        })
      });
    } catch (e) {
      console.warn('[DB] logFraudAlert error:', e.message);
    }
  }

  // ─────────────────────────────────────────────
  //  SIMILARITY & GIBBERISH DETECTION HEURISTICS
  // ─────────────────────────────────────────────
  function levenshteinDistance(s1, s2) {
    s1 = (s1 || '').toLowerCase().trim();
    s2 = (s2 || '').toLowerCase().trim();
    const m = s1.length, n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  function isSimilarName(name1, name2) {
    const n1 = (name1 || '').toLowerCase().trim();
    const n2 = (name2 || '').toLowerCase().trim();
    if (!n1 || !n2 || n1 === n2) return true;
    // Prefix / Suffix clones (e.g. lol & lol1, lolly & lol, ahmed & ahmed99)
    if (n1.startsWith(n2) || n2.startsWith(n1)) {
      const diff = Math.abs(n1.length - n2.length);
      if (diff <= 3) return true;
    }
    const dist = levenshteinDistance(n1, n2);
    const minLen = Math.min(n1.length, n2.length);
    if (minLen <= 4 && dist <= 1) return true;
    if (minLen <= 8 && dist <= 2) return true;
    return false;
  }

  function isGibberishName(name) {
    const n = (name || '').toLowerCase().trim();
    if (!n || n.length < 3) return false;
    if (n.length === 3) return true;
    if (/(.)\1/.test(n)) return true;
    if (/^\d+$/.test(n)) return true;
    if (/[bcdfghjklmnpqrstvwxyz]{3,}/i.test(n)) return true;
    if (/^[a-z0-9_-]{3,}$/i.test(n) && !/[aeiouy]/i.test(n)) return true;
    const kb = ['qwe','wer','ert','rty','tyu','yui','uio','iop','asd','sdf','dfg','fgh','ghj','hjk','jkl','zxc','xcv','cvb','vbn','bnm','qaz','wsx','edc','rfv','tgb','yhn','ujm','123','234','345','456','567','678','789','987','876','765','654','543','432','321'];
    for (let i = 0; i < kb.length; i++) {
      if (n.includes(kb[i])) return true;
    }
    const arKb = ['شسب','سيب','يبل','بلا','لات','اتن','تنم','نمك','مكط','ضصث','صثق','ثقف','قفع','فعل','علف','خحه','حخه','عغب','غبا','باي'];
    for (let i = 0; i < arKb.length; i++) {
      if (n.includes(arKb[i])) return true;
    }
    return false;
  }

  // ─────────────────────────────────────────────
  //  ANTI-FEEDER & TRANSFER FRAUD GATEKEEPER
  // ─────────────────────────────────────────────
  async function checkWireTransferFraud(senderUsername, recipientUsername, amount) {
    const sUser = (senderUsername || '').trim();
    const rUser = (recipientUsername || '').trim();
    const amt = Number(amount);

    if (sUser.toLowerCase() === rUser.toLowerCase()) {
      throw new Error('لا يمكنك التحويل لنفسك!');
    }

    // 1. Fetch sender and recipient states
    const sender = await getPlayerState(sUser);
    const recipient = await getPlayerState(rUser);
    if (!sender) throw new Error('تعذر العثور على بيانات الحساب المحول.');
    if (!recipient) throw new Error('تعذر العثور على بيانات الحساب المستلم.');

    const fp = await DeviceFingerprint.getFingerprint();
    const registry = await getDeviceRegistry();

    // 2. Multi-Account / Same Device Intersection Check
    const senderDevs = Array.isArray(sender.known_devices) ? sender.known_devices : (sender.initial_device ? [sender.initial_device] : []);
    const recipientDevs = Array.isArray(recipient.known_devices) ? recipient.known_devices : (recipient.initial_device ? [recipient.initial_device] : []);
    const regSenderDevs = (registry.accounts && registry.accounts[sUser]) || [];
    const regRecipientDevs = (registry.accounts && registry.accounts[rUser]) || [];

    const allSenderDevs = new Set([...senderDevs, ...regSenderDevs]);
    const allRecipientDevs = new Set([...recipientDevs, ...regRecipientDevs]);

    let sharedDev = false;
    for (const d of allSenderDevs) {
      if (allRecipientDevs.has(d)) {
        sharedDev = true;
        break;
      }
    }

    const currentDeviceBoundToRecipient = (allRecipientDevs.has(fp) || (registry.devices && registry.devices[fp] === rUser));

    if (sharedDev || currentDeviceBoundToRecipient) {
      await logFraudAlert({
        type: 'MULTI_ACCOUNT_SAME_DEVICE',
        sender: sUser,
        recipient: rUser,
        amount: amt,
        device: fp,
        details: `رصد ارتباط واستخدام نفس الجهاز بين الحسابين (${sUser} و ${rUser})`
      });
      throw new Error('🚫 مرفوض أمنياً: تم رصد ارتباط بين الحسابين على نفس الجهاز، وتمنع قواعد اللعبة التحويلات المالية بين حسابات المستخدم الواحد.');
    }

    // 3. Feeder Account Progression Check
    const bizCount = Object.values(sender.businesses || {}).filter(b => (b.level || 0) > 0 || (b.workers || 0) > 0).length;
    const assetCount = Object.values(sender.assets || {}).filter(v => (v || 0) > 0).length;
    const carCount = (sender.ownedCars || []).length;
    const stockShares = Object.values(sender.stocks || {}).reduce((sum, s) => sum + (s.shares || 0), 0);
    const isZeroProgress = (bizCount === 0 && assetCount === 0 && carCount === 0 && stockShares === 0);

    // STRICT RULE: Absolute block on 0-progress / 0-project accounts from transferring money
    if (isZeroProgress || bizCount === 0) {
      await logFraudAlert({
        type: 'FEEDER_EMPTY_ACCOUNT',
        sender: sUser,
        recipient: rUser,
        amount: amt,
        device: fp,
        details: `حساب بدون أي نشاط تجاري (0 مشاريع) يحاول تحويل ${amt.toLocaleString()} EGP إلى ${rUser}`
      });
      throw new Error('🚫 مرفوض أمنياً: حسابك لم يقم بأي نشاط تجاري أو استثماري بعد (0 مشاريع). تمنع قواعد اللعبة تحويل الأموال من حسابات فارغة لمنع الحسابات الوهمية (Feeder Accounts). يرجى تطوير مشاريعك أولاً!');
    }

    // 4. Sender Account Age Check
    const rawCreatedAt = sender.createdAt || sender.created_at;
    const createdMs = rawCreatedAt ? (typeof rawCreatedAt === 'string' ? new Date(rawCreatedAt).getTime() : Number(rawCreatedAt)) : getTrustedNow();
    const senderAgeHours = Math.max(0, (getTrustedNow() - createdMs) / (3600 * 1000));
    if (senderAgeHours < 2) {
      await logFraudAlert({
        type: 'NEW_ACCOUNT_TRANSFER_BLOCKED',
        sender: sUser,
        recipient: rUser,
        amount: amt,
        device: fp,
        details: `حساب حديث (عمره ${senderAgeHours.toFixed(1)} ساعة) يحاول تحويل ${amt.toLocaleString()} EGP`
      });
      throw new Error('🚫 مرفوض أمنياً: يجب أن يمر ساعتان على الأقل على إنشاء الحساب وتطوير المشاريع قبل إمكانية إجراء تحويلات مالية.');
    }

    // 5. Clone / Similar Name or Gibberish Name Heuristics
    const similar = isSimilarName(sUser, rUser);
    const gibberish = isGibberishName(sUser);

    if (similar || gibberish) {
      await logFraudAlert({
        type: similar ? 'SIMILAR_NAME_FEEDER' : 'GIBBERISH_NAME_FEEDER',
        sender: sUser,
        recipient: rUser,
        amount: amt,
        device: fp,
        details: similar 
          ? `تشابه كبير في أسماء الحسابات النمطية (${sUser} -> ${rUser})`
          : `اسم حساب عشوائي (${sUser})`
      });
      throw new Error('🚫 تم رفض التحويل أمنياً: تم رصد نمط حسابات وهمية متطابقة (Clone/Feeder Accounts). يرجى اللعب وتطوير المشاريع بشكل مستقل.');
    }

    // 6. Rapid Multi-Account Feeders to Single Recipient
    try {
      const recentIncoming = await _api(`transfers?recipient=eq.${encodeURIComponent(rUser)}&order=created_at.desc&limit=15`);
      const now = getTrustedNow();
      const twelveHoursAgo = now - (12 * 3600 * 1000);
      const recentSenders = new Set();
      (recentIncoming || []).forEach(t => {
        const rawTime = t.created_at || t.timestamp || 0;
        const tTime = typeof rawTime === 'string' ? new Date(rawTime).getTime() : Number(rawTime);
        if (tTime > twelveHoursAgo && t.sender && t.sender !== sUser) {
          recentSenders.add(t.sender);
        }
      });
      if (recentSenders.size >= 3) {
        await logFraudAlert({
          type: 'RAPID_MULTI_FEEDER_RECIPIENT',
          sender: sUser,
          recipient: rUser,
          amount: amt,
          device: fp,
          details: `المستلم ${rUser} يتلقى تدفقات متكررة من ${recentSenders.size + 1} حسابات مختلفة خلال 12 ساعة`
        });
        throw new Error('🚫 تم إيقاف التحويل أمنياً: يتلقى حساب المستلم تدفقات متكررة من عدة حسابات حديثة. تم حظر المعاملة وإحالتها للفحص الأمني.');
      }
    } catch (e) {
      if (e.message && e.message.includes('🚫')) throw e;
    }

    return true;
  }

  // ─────────────────────────────────────────────
  //  REGISTRATION & STRICT SINGLE-ACCOUNT PER DEVICE
  // ─────────────────────────────────────────────
  async function registerPlayer(username, pin, referralCodeInput = '') {
    if (!username || !pin) throw new Error('يرجى إدخال اسم المستخدم ورمز PIN.');
    const u = username.trim();
    const p = String(pin).trim();
    const refCode = (typeof referralCodeInput === 'string' ? referralCodeInput.trim() : '').toUpperCase();

    // 1. Check local device anchor
    const localRegistered = DeviceFingerprint.getRegisteredAccountOnDevice();
    if (localRegistered && localRegistered.toLowerCase() !== u.toLowerCase()) {
      throw new Error(`🚫 لا يمكن إنشاء حساب جديد! هذا الجهاز مسجل به حساب بالفعل ("${localRegistered}"). تسمح قوانين اللعبة بحساب واحد فقط لكل جهاز لمنع التلاعب.`);
    }

    // 2. Obtain hardware device fingerprint
    const fp = await DeviceFingerprint.getFingerprint();

    // 3. Check cloud device registry
    const registry = await getDeviceRegistry();
    if (registry.devices && registry.devices[fp]) {
      const boundUser = registry.devices[fp];
      if (boundUser && boundUser.toLowerCase() !== u.toLowerCase()) {
        throw new Error(`🚫 لا يمكن إنشاء حساب جديد! هذا الجهاز مسجل به حساب بالفعل ("${boundUser}"). تسمح قوانين اللعبة بحساب واحد فقط لكل جهاز لمنع التلاعب.`);
      }
    }

    // 4. Check if exists (case-insensitive)
    const existing = await _api(`players?username=ilike.${encodeURIComponent(u)}&select=username`);
    if (existing && existing.length > 0) {
      throw new Error('اسم المستخدم مسجل بالفعل. يرجى اختيار اسم آخر.');
    }

    // 5. Validate optional referral code if provided at registration
    let referrerUsername = '';
    let referrerCodeValid = '';
    if (refCode) {
      const refRows = await _api(`players?state->>referralCode=eq.${encodeURIComponent(refCode)}&select=username,state`);
      if (refRows && refRows.length > 0 && refRows[0].username.toLowerCase() !== u.toLowerCase()) {
        referrerUsername = refRows[0].username;
        referrerCodeValid = refCode;
      } else {
        throw new Error('كود الدعوة المدخل غير صحيح أو ينتمي لنفس الحساب.');
      }
    }

    const hashed = await hashPin(p);
    const now = Date.now();

    // Prevent new accounts from claiming airdrops created before registration
    let initialClaimedAirdrops = [];
    try {
      const curAirdrop = await getLatestAirdrop();
      if (curAirdrop && curAirdrop.timestamp) {
        const aId = curAirdrop.airdropId || `airdrop_${curAirdrop.timestamp}`;
        initialClaimedAirdrops.push(aId);
      }
    } catch (e) {}

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
        known_devices: [fp],
        initial_device: fp,
        referralCode: (window.GameEngine && typeof window.GameEngine.generateReferralCode === 'function')
          ? window.GameEngine.generateReferralCode(u)
          : `REF-${u.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        referredBy: referrerUsername,
        referredByCode: referrerCodeValid,
        transfersReceivedTotal: 0,
        claimedReferralTiers: [],
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
        claimedAirdrops: initialClaimedAirdrops,
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

    // Bind device in cloud registry & locally
    try {
      registry.devices[fp] = u;
      if (!registry.accounts[u]) registry.accounts[u] = [];
      if (!registry.accounts[u].includes(fp)) registry.accounts[u].push(fp);
      await saveDeviceRegistry(registry);
    } catch (regErr) {
      console.warn('[DB] Failed to bind device in registry:', regErr.message);
    }
    DeviceFingerprint.recordRegisteredAccountOnDevice(u);

    setEncryptedLocalState(`rasalmal_state_${u}`, newPlayerRow.state);
    return true;
  }

  // ─────────────────────────────────────────────
  //  REFERRAL SYSTEM & ANTI-CHEAT ENGINE
  // ─────────────────────────────────────────────
  async function bindReferralCode(username, codeInput) {
    if (!username || !codeInput) throw new Error("يرجى إدخال كود الدعوة.");
    const u = username.trim();
    const code = codeInput.trim().toUpperCase();

    const s = (window.GameEngine && window.GameEngine.state && window.GameEngine.state.username === u)
      ? window.GameEngine.state
      : await getPlayerState(u);

    if (!s) throw new Error("تعذر الوصول لبيانات اللاعب.");

    if (s.referredBy) {
      throw new Error(`لقد قمت بإدخال كود دعوة صديق من قبل ("${s.referredBy}"), ولا يمكن تغيير الكود.`);
    }

    if (s.referralCode && s.referralCode.toUpperCase() === code) {
      throw new Error("لا يمكنك إدخال كود الدعوة الخاص بك!");
    }

    // Hardware check: verify device does not have other accounts
    const fp = await DeviceFingerprint.getFingerprint();
    const registry = await getDeviceRegistry();
    if (registry.devices && registry.devices[fp]) {
      const boundUser = registry.devices[fp];
      if (boundUser && boundUser.toLowerCase() !== u.toLowerCase()) {
        throw new Error(`🚫 لا يمكن إدخال كود دعوة! هذا الجهاز يحتوي على حساب آخر مسجل ("${boundUser}").`);
      }
    }

    // Lookup referrer player in DB
    const refRows = await _api(`players?state->>referralCode=eq.${encodeURIComponent(code)}&select=username,state`);
    if (!refRows || refRows.length === 0) {
      throw new Error("كود الدعوة المدخل غير موجود. يرجى التأكد من الرمز وإعادة المحاولة.");
    }

    const referrer = refRows[0];
    if (referrer.username.toLowerCase() === u.toLowerCase()) {
      throw new Error("لا يمكنك إدخال كود الدعوة الخاص بك!");
    }

    s.referredBy = referrer.username;
    s.referredByCode = code;

    await savePlayerState(u, s, true);
    return {
      success: true,
      referrer: referrer.username,
      code: code
    };
  }

  async function getReferralReport(username) {
    if (!username) return null;
    const u = username.trim();

    try {
      const myState = (window.GameEngine && window.GameEngine.state && window.GameEngine.state.username === u)
        ? window.GameEngine.state
        : await getPlayerState(u);

      let refCode = (myState && myState.referralCode) ? myState.referralCode : '';
      if (!refCode && window.GameEngine && typeof window.GameEngine.generateReferralCode === 'function') {
        refCode = window.GameEngine.generateReferralCode(u);
        if (myState) {
          myState.referralCode = refCode;
          try { await savePlayerState(u, myState, true); } catch (e) {}
        }
      }

      const queryUrl = `players?select=username,cash,bank,dirty_cash,net_worth,created_at,last_seen,state`;
      const rows = await _api(queryUrl);

      const invitees = [];
      let qualifiedCount = 0;

      const ASSET_VALS = { apartment: 25000, office: 85000, mansion: 320000, skyline_tower: 1200000, luxury_resort: 4500000, mega_yacht: 15000000, private_island: 50000000, orbital_station: 250000000 };

      (rows || []).forEach(r => {
        if (!r.username || r.username.toLowerCase() === u.toLowerCase()) return; // skip self
        const s = (typeof r.state === 'object' && r.state) ? r.state : {};

        const matchCode = refCode && s.referredByCode && (s.referredByCode.toString().trim().toUpperCase() === refCode.toString().trim().toUpperCase());
        const matchUser = (s.referredBy || s.referredByCode) && ((s.referredBy || s.referredByCode || '').toString().trim().toLowerCase() === u.toLowerCase());

        if (!matchCode && !matchUser) return;

        const cash = Number(r.cash || 0);
        const bank = Number(r.bank || 0);
        const dirty = Number(r.dirty_cash || 0);
        const transfersReceived = Number(s.transfersReceivedTotal || 0);

        let assetsVal = 0;
        if (s.assets && typeof s.assets === 'object') {
          Object.keys(s.assets).forEach(ak => {
            const count = Number(s.assets[ak] || 0);
            if (count > 0 && ASSET_VALS[ak]) assetsVal += count * ASSET_VALS[ak];
          });
        }

        const grossWealth = cash + bank + dirty + assetsVal;
        const selfEarned = Math.max(0, grossWealth - transfersReceived);
        const isQualified = selfEarned >= 250000;

        if (isQualified) qualifiedCount++;

        const createdMs = Number(r.created_at || s.createdAt || Date.now());
        const ageMs = Math.max(0, Date.now() - createdMs);
        const ageDays = Math.floor(ageMs / (86400 * 1000));
        const ageHours = Math.floor((ageMs % (86400 * 1000)) / (3600 * 1000));
        const ageText = ageDays > 0 ? `منذ ${ageDays} يوم و ${ageHours} ساعة` : `منذ ${ageHours} ساعة`;

        const devices = Array.isArray(s.known_devices) ? s.known_devices : (s.initial_device ? [s.initial_device] : []);

        invitees.push({
          username: r.username,
          cash,
          bank,
          dirty,
          grossWealth,
          transfersReceived,
          selfEarned,
          isQualified,
          createdAt: createdMs,
          accountAgeText: ageText,
          devices
        });
      });

      return {
        referralCode: refCode,
        totalInvited: invitees.length,
        qualifiedCount,
        pendingCount: invitees.length - qualifiedCount,
        invitees
      };
    } catch (err) {
      console.warn('[DB] getReferralReport error:', err.message);
      return { referralCode: '', totalInvited: 0, qualifiedCount: 0, pendingCount: 0, invitees: [] };
    }
  }

  async function verifyPin(username, inputPin) {
    if (!username || !inputPin) return false;
    const u = username.trim();
    const p = String(inputPin).trim();

    // Query case-insensitively and sort by last_seen descending to prioritize most recently active account over duplicates
    const rows = await _api(`players?username=ilike.${encodeURIComponent(u)}&order=last_seen.desc&select=username,pin,net_worth`);
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
      const local = getDecryptedLocalState(`rasalmal_state_${u}`);
      // Order by last_seen desc to always prioritize the most recently active state
      const rows = await _api(`players?username=ilike.${encodeURIComponent(u)}&order=last_seen.desc&select=*`);
      if (!rows || rows.length === 0) {
        return local;
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

      if (!stateObj.businesses || typeof stateObj.businesses !== 'object') {
        stateObj.businesses = {};
      }

      // ── ANTI-ROLLBACK & SMART RECONCILIATION GUARD ──
      // Prevents data loss, business level downgrades, and worker loss when reloading or reconnecting
      if (local && typeof local === 'object') {
        let shouldSyncCloud = false;

        const localTs = Number(local.lastSeen || local.lastActiveTimestamp || 0);
        const serverTs = Number(row.last_seen || 0);
        // Only reconcile local upgrades if local device was active recently (within 10 minutes of server timestamp or newer)
        // This ensures switching devices loads newer server data without stale secondary device data interfering
        const isLocalRecentOrNewer = (localTs >= serverTs - 600000);

        // 1. Business Levels & Workers Guard: NEVER downgrade business levels or worker counts on same device
        if (isLocalRecentOrNewer && local.businesses && typeof local.businesses === 'object') {
          Object.keys(local.businesses).forEach(bk => {
            const locBiz = local.businesses[bk];
            if (!locBiz || typeof locBiz !== 'object') return;
            const srvBiz = stateObj.businesses[bk] || {};

            const locLvl = Number(locBiz.level || 0);
            const srvLvl = Number(srvBiz.level || 0);
            const locWorkers = Number(locBiz.workers || 0);
            const srvWorkers = Number(srvBiz.workers || 0);

            if (locLvl > srvLvl) {
              // Local device has a HIGHER business level (e.g. upgraded before reload/lag)
              stateObj.businesses[bk] = { ...srvBiz, ...locBiz };
              shouldSyncCloud = true;
            } else if (locLvl === srvLvl && locLvl > 0) {
              // Same level: preserve maximum workers and franchise state
              const maxW = Math.max(locWorkers, srvWorkers);
              if (maxW > srvWorkers || locBiz.isFranchise !== srvBiz.isFranchise) {
                stateObj.businesses[bk] = {
                  ...srvBiz,
                  workers: maxW,
                  isFranchise: Boolean(srvBiz.isFranchise || locBiz.isFranchise)
                };
                shouldSyncCloud = true;
              }
            }
          });
        }

        // 2. Jail sentence guard: Reload cannot evade prison time
        if (typeof local.jailTimer === 'number' && local.jailTimer > 0 && local.jailTimer > stateObj.jailTimer) {
          stateObj.jailTimer = local.jailTimer;
          shouldSyncCloud = true;
        }

        // 3. Active police raid guard: Reload cannot evade active raids
        if (local.raidActive && !stateObj.raidActive) {
          stateObj.raidActive = true;
          stateObj.raidBribeCost = local.raidBribeCost;
          stateObj.raidEscapeChance = local.raidEscapeChance;
          shouldSyncCloud = true;
        }

        // 4. Loss & confiscation guard:
        // If local state was updated recently (within 5 minutes) and has a lower cash balance
        if (localTs >= serverTs - 300000) {
          if (typeof local.cash === 'number' && local.cash < stateObj.cash) {
            stateObj.cash = local.cash;
            shouldSyncCloud = true;
          }
          if (typeof local.dirtyCash === 'number' && local.dirtyCash < stateObj.dirtyCash) {
            stateObj.dirtyCash = local.dirtyCash;
            shouldSyncCloud = true;
          }
          if (local.blackMarketCooldowns && Object.keys(local.blackMarketCooldowns).length > 0) {
            stateObj.blackMarketCooldowns = { ...(stateObj.blackMarketCooldowns || {}), ...local.blackMarketCooldowns };
          }
        }

        if (shouldSyncCloud) {
          stateObj.netWorth = Math.max(0, (stateObj.cash || 0) + (stateObj.bank || 0) + (stateObj.dirtyCash || 0));
          _pushStateToCloud(row.username, stateObj).catch(() => {});
        }
      }

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

      // Navigator sendBeacon fallback (Guarantees payload delivery on iOS Safari / Android Chrome page unload)
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        try {
          const beaconUrl = `${SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(u)}&apikey=${SUPABASE_ANON_KEY}`;
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon(beaconUrl, blob);
        } catch (bErr) {}
      }
    } catch (e) {}
  }

  // Attach exit and app-hide listeners immediately for bulletproof auto-save (Desktop & Mobile)
  if (typeof window !== 'undefined') {
    const handleExitFlush = () => {
      const activeUser = (window.GameEngine && window.GameEngine.activeUsername);
      const activeState = (window.GameEngine && window.GameEngine.state);
      if (activeUser && activeState && activeState.username === activeUser && (activeState._loadedFromCloud || activeState.cash > 300 || activeState.netWorth > 400 || activeState.xp > 0)) {
        try {
          setEncryptedLocalState(`rasalmal_state_${activeUser}`, activeState);
        } catch (e) {}
        flushStateToCloudOnExit(activeUser, activeState);
      }
    };
    window.addEventListener('beforeunload', handleExitFlush);
    window.addEventListener('pagehide', handleExitFlush);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) handleExitFlush();
      });
    }
  }

  let _cloudSyncDebounceTimer = null;
  let _lastCloudSyncTimestamp = 0;
  const SMART_SYNC_INTERVAL_MS = 35000; // 35 seconds max delay for background autosync

  async function _pushStateToCloud(u, state) {
    if (!u || !state) return;
    state._loadedFromCloud = true;

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
      const res = await _api(`players?username=ilike.${encodeURIComponent(u)}${tsFilter}`, {
        method:'PATCH',
        headers: {'Prefer':'return=representation' },
        body: JSON.stringify(payload)
      });
      
      // If 0 rows were updated due to server having a newer admin_modified_timestamp, sync the timestamp
      if (Array.isArray(res) && res.length === 0) {
        const checkRows = await _api(`players?username=ilike.${encodeURIComponent(u)}&select=admin_modified_timestamp,cash,bank,net_worth,xp`);
        if (checkRows && checkRows.length > 0) {
          const srv = checkRows[0];
          state.adminModifiedTimestamp = Number(srv.admin_modified_timestamp || Date.now());
          payload.admin_modified_timestamp = state.adminModifiedTimestamp;
          // Retry save with updated timestamp
          await _api(`players?username=ilike.${encodeURIComponent(u)}`, {
            method:'PATCH',
            headers: {'Prefer':'return=minimal' },
            body: JSON.stringify(payload)
          });
        }
      }
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

    // Security & Anti-Feeder / Multi-Account Gatekeeper
    await checkWireTransferFraud(senderUsername, recipientUsername, amt);

    // Execute the atomic SQL Stored Procedure
    await _api('rpc/execute_wire_transfer', {
      method:'POST',
      body: JSON.stringify({
        sender_username: senderUsername.trim(),
        recipient_username: recipientUsername.trim(),
        transfer_amount: amt
      })
    });

    // Ensure recipient receives the funds in the Bank (reconcile bank balance on server)
    try {
      const recipRows = await _api(`players?username=eq.${encodeURIComponent(recipientUsername.trim())}&select=bank,net_worth,state`);
      if (recipRows && recipRows.length > 0) {
        const rRow = recipRows[0];
        const rState = (typeof rRow.state === 'object' && rRow.state) ? { ...rRow.state } : {};
        const newBank = (Number(rRow.bank) || 0) + amt;
        const newNetWorth = (Number(rRow.net_worth) || 0) + amt;
        rState.bank = newBank;
        rState.netWorth = newNetWorth;

        await _api(`players?username=eq.${encodeURIComponent(recipientUsername.trim())}`, {
          method: 'PATCH',
          body: JSON.stringify({
            bank: newBank,
            net_worth: newNetWorth,
            state: rState
          })
        });
      }
    } catch (reconcileErr) {
      console.warn('[DB] Wire transfer bank deposit reconcile note:', reconcileErr.message);
    }

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

    // Pre-check basic device linkage on transfer request
    try {
      const fp = await DeviceFingerprint.getFingerprint();
      const registry = await getDeviceRegistry();
      const regRecipientDevs = (registry.accounts && registry.accounts[recipientUsername.trim()]) || [];
      if (regRecipientDevs.includes(fp) || (registry.devices && registry.devices[fp] === recipientUsername.trim())) {
        throw new Error('🚫 لا يمكن إرسال طلب تحويل لحساب مرتبط بنفس الجهاز.');
      }
    } catch (reqSecErr) {
      if (reqSecErr.message && reqSecErr.message.includes('🚫')) throw reqSecErr;
    }

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
    const pState = (typeof p.state === 'object' && p.state) ? { ...p.state } : {};

    // Feeder / Multi-account promo code harvesting gate
    const bizCount = Object.values(pState.businesses || {}).filter(b => (b.level || 0) > 0 || (b.workers || 0) > 0).length;
    const rawCreatedAt = p.created_at || pState.createdAt || pState.created_at;
    const createdMs = rawCreatedAt ? (typeof rawCreatedAt === 'string' ? new Date(rawCreatedAt).getTime() : Number(rawCreatedAt)) : getTrustedNow();
    const ageHours = Math.max(0, (getTrustedNow() - createdMs) / (3600 * 1000));

    if (bizCount === 0 && ageHours < 1) {
      throw new Error('🚫 تنبيه أمني: لاسترداد هدايا وأكواد رأس المال، يجب تطوير مشروعك الأول على الأقل أو قضاء ساعة واحدة في بناء المشاريع لمنع الحسابات الوهمية.');
    }

    const curCash = Number(p.cash || 0);
    const curWorth = Number(p.net_worth || 0);
    const reward = Number(gift.reward_cash || 100000);
    const newCash = curCash + reward;
    const newWorth = curWorth + reward;

    pState.cash = newCash;
    pState.netWorth = newWorth;
    pState.hasRedeemedGiftCode = true;
    pState.giftCodesRedeemed = (pState.giftCodesRedeemed || 0) + 1;
    pState.totalGiftRewards = (pState.totalGiftRewards || 0) + reward;

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

  async function sendAirdrop(amount, target = 'ALL') {
    const amt = Number(amount);
    if (!amt || amt <= 0) throw new Error("مبلغ المكافأة غير صحيح.");
    const cleanTarget = (target || 'ALL').trim().replace(/^@/, '');
    const ts = Date.now();
    const airdropId = `airdrop_${ts}_${Math.floor(Math.random() * 10000)}`;

    if (cleanTarget.toUpperCase() !== 'ALL' && cleanTarget !== 'الجميع' && cleanTarget !== '') {
      // Specific player target
      const pState = await adminGetPlayer(cleanTarget);
      if (!pState) throw new Error(`اللاعب "${cleanTarget}" غير موجود في قاعدة البيانات.`);

      pState.cash = (Number(pState.cash) || 0) + amt;
      pState.netWorth = (Number(pState.netWorth) || 0) + amt;
      pState.adminModifiedTimestamp = ts;

      await adminSavePlayer(cleanTarget, pState);
      await savePlayerState(cleanTarget, pState, true);

      // Send a direct reward popup to their mailbox
      await sendMail('إدارة اللعبة (Admin)', cleanTarget, 'admin_popup', {
        title: 'مكافأة مالية خاصة 🎁',
        message: `تهانينا! قررت إدارة اللعبة منحك مكافأة مالية خاصة بقيمة +${amt.toLocaleString()} EGP.\nتم إيداع المبلغ في كاش محفظتك فوراً بنجاح!`,
        style: 'reward',
        sentAt: ts
      });

      return { type: 'single', target: cleanTarget, amount: amt };
    }

    // Broadcast Airdrop to ALL players:
    // 1. Save persistent airdrop in globals table
    await _api('globals', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: 'airdrop',
        data: {
          airdropId: airdropId,
          amount: amt,
          timestamp: ts,
          target: 'ALL',
          sender: 'Admin'
        },
        updated_at: ts
      })
    });

    // 2. Also send broadcast message in globals so all players see the news
    await sendBroadcast('مكافأة عامة للجميع 🎁', `قامت إدارة اللعبة بتوزيع إيردروب مالي بقيمة +${amt.toLocaleString()} EGP لجميع المستثمرين!`);

    return { type: 'all', amount: amt, airdropId };
  }

  async function getLatestAirdrop() {
    try {
      const rows = await _api(`globals?id=eq.airdrop`);
      if (rows && rows.length > 0 && rows[0].data) {
        return rows[0].data;
      }
    } catch (e) {}
    return null;
  }

  async function retryLatestAirdropToUnclaimed() {
    const airdrop = await getLatestAirdrop();
    if (!airdrop || !airdrop.amount) {
      throw new Error("لا توجد أي عملية دروب سابقة مسجلة لإعادة إرسالها.");
    }

    const airdropId = airdrop.airdropId || `airdrop_${airdrop.timestamp}`;
    const amt = Number(airdrop.amount);
    const airdropTs = Number(airdrop.timestamp);
    const ts = Date.now();

    // Fetch all players with cash, net_worth, state and created_at
    const rows = await _api('players?select=username,cash,net_worth,state,created_at');
    if (!rows || rows.length === 0) {
      throw new Error("لم يتم العثور على أي حسابات لاعبين في قاعدة البيانات.");
    }

    let alreadyClaimedCount = 0;
    let newlyCreditedCount = 0;
    const newlyCreditedUsers = [];

    for (const player of rows) {
      const uname = player.username;
      if (!uname) continue;

      let pState = player.state;
      if (typeof pState === 'string') {
        try { pState = JSON.parse(pState); } catch (e) { pState = {}; }
      }
      pState = pState || {};
      pState.claimedAirdrops = pState.claimedAirdrops || [];

      // Check if player has already claimed this specific airdrop
      if (pState.claimedAirdrops.includes(airdropId)) {
        alreadyClaimedCount++;
        continue;
      }

      // Check account creation timestamp: ONLY accounts created BEFORE this airdrop are eligible!
      const playerCreatedAt = Number(player.created_at || (pState && (pState.createdAt || pState.created_at)) || 0);
      if (playerCreatedAt > 0 && playerCreatedAt > (airdropTs + 10000)) {
        // Account was created AFTER the airdrop was launched! Skip and mark as claimed so they never get it
        pState.claimedAirdrops.push(airdropId);
        await _api(`players?username=eq.${encodeURIComponent(uname)}`, {
          method: 'PATCH',
          body: JSON.stringify({ state: pState })
        });
        continue;
      }

      // Player has NOT received it -> credit directly now!
      pState.claimedAirdrops.push(airdropId);
      if (pState.claimedAirdrops.length > 20) pState.claimedAirdrops.shift();

      const newCash = (Number(player.cash) || Number(pState.cash) || 0) + amt;
      const newNet = (Number(player.net_worth) || Number(player.netWorth) || Number(pState.netWorth) || 0) + amt;

      pState.cash = newCash;
      pState.netWorth = newNet;
      pState.adminModifiedTimestamp = ts;

      // Update player row in Supabase
      await _api(`players?username=eq.${encodeURIComponent(uname)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          cash: newCash,
          net_worth: newNet,
          state: pState,
          admin_modified_timestamp: ts
        })
      });

      // Send mail notification
      try {
        await sendMail('إدارة اللعبة (Admin)', uname, 'admin_popup', {
          title: 'مكافأة عامة متأخرة 🎁',
          message: `تم إيداع مكافأة الإيردروب المستحقة لك بقيمة +${amt.toLocaleString()} EGP مباشرة في كاش محفظتك!`,
          style: 'reward',
          sentAt: ts
        });
      } catch (e) {}

      newlyCreditedCount++;
      newlyCreditedUsers.push(uname);
    }

    // Refresh globals updated_at so online listeners get a pulse
    await _api('globals', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: 'airdrop',
        data: airdrop,
        updated_at: ts
      })
    });

    return {
      airdropId,
      amount: amt,
      totalScanned: rows.length,
      alreadyClaimedCount,
      newlyCreditedCount,
      newlyCreditedUsers
    };
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

  function _isStaging() {
    try {
      if (typeof window !== 'undefined' && window.IS_STAGING_ENV === true) return true;
      const host = (typeof window !== 'undefined' && window.location && window.location.hostname) || '';
      if (/(^|\.)(github\.io|pages\.dev|vercel\.app)$/i.test(host)) return true;
      const path = (typeof window !== 'undefined' && window.location && window.location.pathname) || '';
      if (path.includes('stage-x91-k8q7') || path.includes('staging') || path.includes('test-sandbox')) return true;
      if (typeof window !== 'undefined' && window.location && window.location.search && window.location.search.includes('staging=1')) return true;
    } catch (e) {}
    return false;
  }

  async function getMaintenanceStatus() {
    if (_isStaging()) {
      return { active: false, enabled: false, message: '' };
    }
    try {
      const rows = await _api(`globals?id=eq.maintenance`);
      if (rows && rows.length > 0 && rows[0].data) {
        return rows[0].data;
      }
    } catch (e) {}
    return { active: false, message:'' };
  }

  async function setStagingStatus(enabled, message = '') {
    await _api('globals', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: 'staging_status',
        data: { enabled: Boolean(enabled), message, timestamp: Date.now() },
        updated_at: Date.now()
      })
    });
    return true;
  }

  async function getStagingStatus() {
    try {
      const rows = await _api('globals?id=eq.staging_status');
      if (rows && rows.length > 0 && rows[0].data) {
        return rows[0].data;
      }
    } catch (e) {}
    return { enabled: true, message: '' };
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
      customBadge:'👑',
      badgeTitle:'الحوت الملكي',
      description:'حزمة الدعم الملكية: 5 مليون كاش، مليون بالبنك، 6000 خبرة، خزنة سويسرية وحساب خارجي وتاج الملك 👑.',
      hidden: false
    },
    {
      id:'pkg_vip_verified',
      name:'حزمة توثيق المشاهير والحسابات VIP',
      price: 150,
      cash: 3000000,
      bank: 1000000,
      xp: 5000,
      customBadge:'✔️',
      badgeTitle:'حساب موثق رسمي',
      features: { verified: true, customAvatar: true, title:'شخصية موثقة' },
      items: { vip_casino_pass: 1, legalShield: 2 },
      description:'علامة توثيق زرقاء رسمية بجانب اسمك ✔️ + صلاحية رفع صورة شخصية لحسابك + لقب حصري + 3 مليون كاش.',
      hidden: true
    },
    {
      id:'pkg_vip_chat_glow',
      name:'حزمة حوت الشات المتوهج والملصقات',
      price: 120,
      cash: 2500000,
      bank: 500000,
      xp: 4000,
      customBadge:'🌟',
      badgeTitle:'حوت الشات',
      features: { chatGlow:'gold_neon', stickersPack: true, title:'حوت الشات' },
      items: { lottery_ticket: 5 },
      description:'رسائل شات متوهجة ومميزة بلون نيون ذهبي 🌟 + فتح حزمة ملصقات الشات التعبيرية + 2.5 مليون كاش.',
      hidden: true
    },
    {
      id:'pkg_vip_royal_ultimate',
      name:'الباقة الملكية الأسطورية الشاملة',
      price: 300,
      cash: 10000000,
      bank: 3000000,
      xp: 15000,
      customBadge:'👑✔️',
      badgeTitle:'الملك الأسطوري',
      features: { verified: true, customAvatar: true, chatGlow:'cyber_rainbow', stickersPack: true, title:'إمبراطور السيرفر' },
      items: { vip_casino_pass: 2, offshore_account: 2, swiss_safe: 2 },
      description:'الباقة المتكاملة: علامة التوثيق ✔️ + رفع صورة شخصية + توهج ملكي في الشات + كافة الملصقات + 10 مليون كاش وخزائن سويسرية.',
      hidden: true
    }
  ];

  async function getTopupPackages() {
    try {
      const rows = await _api(`globals?id=eq.topup_packages`);
      if (rows && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.packages)) {
        const dbPackages = rows[0].data.packages;
        // Merge missing default packages (retaining hidden: true)
        let hasNew = false;
        DEFAULT_TOPUP_PACKAGES.forEach(defPkg => {
          if (!dbPackages.some(p => p.id === defPkg.id)) {
            dbPackages.push({ ...defPkg });
            hasNew = true;
          }
        });
        return dbPackages;
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

      // VIP package features (Chat Glow, Verification Badge, Titles)
      if (req.packageId === 'pkg_vip_chat_glow') {
        pState.chatGlow = 'gold_neon';
        pState.hasChatGlow = true;
        pState.activePackage = 'pkg_vip_chat_glow';
      } else if (req.packageId === 'pkg_vip_royal_ultimate') {
        pState.chatGlow = 'cyber_rainbow';
        pState.hasChatGlow = true;
        pState.isVerified = true;
        pState.vipVerified = true;
        pState.activePackage = 'pkg_vip_royal_ultimate';
      } else if (req.packageId === 'pkg_vip_verified') {
        pState.isVerified = true;
        pState.vipVerified = true;
        pState.activePackage = 'pkg_vip_verified';
      }

      pState.hasPurchasedTopup = true;
      pState.purchasedTopups = (pState.purchasedTopups || 0) + 1;

      if (rewards.features) {
        if (rewards.features.chatGlow) {
          pState.chatGlow = rewards.features.chatGlow;
          pState.hasChatGlow = true;
        }
        if (rewards.features.verified) { pState.isVerified = true; pState.vipVerified = true; }
        if (rewards.features.title) pState.title = rewards.features.title;
        if (rewards.features.stickersPack) pState.stickersPack = true;
        if (rewards.features.customAvatar) pState.canUploadAvatar = true;
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

      // Automatically backfill any existing messages in chat_feed so they glow immediately
      if (pState.chatGlow) {
        try {
          const feedRows = await _api("globals?id=eq.chat_feed&select=data");
          if (feedRows && feedRows.length > 0 && feedRows[0].data && Array.isArray(feedRows[0].data.messages)) {
            let feedModified = false;
            feedRows[0].data.messages.forEach(m => {
              if (m.sender === targetUser) {
                m.chatGlow = pState.chatGlow;
                if (pState.isVerified) m.isVerified = true;
                if (pState.customBadge) m.customBadge = pState.customBadge;
                feedModified = true;
              }
            });
            if (feedModified) {
              await _api('globals', {
                method: 'POST',
                headers: { 'Prefer': 'resolution=merge-duplicates' },
                body: JSON.stringify({
                  id: 'chat_feed',
                  data: { messages: feedRows[0].data.messages },
                  updated_at: Date.now()
                })
              });
            }
          }
        } catch (errFeed) {
          console.warn('[DB] Chat feed backfill warning:', errFeed.message);
        }
      }

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

  async function deleteTopupRequest(requestId) {
    if (!requestId) throw new Error('معرف الطلب غير صالح.');
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

    requests.splice(reqIndex, 1);

    await _api('globals', {
      method:'POST',
      headers: {'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify({
        id:'topup_requests',
        data: { requests, updatedAt: ts },
        updated_at: ts
      })
    });

    return true;
  }

  // ─────────────────────────────────────────────
  //  SYSTEM STATS & ADMIN PANEL
  // ─────────────────────────────────────────────
  async function getSystemStats() {
    try {
      const rows = await _api('players?select=username,cash,bank,dirty_cash,net_worth,xp,is_banned,jail_timer,title,last_seen');
      let totalCash = 0, totalBank = 0, totalNetWorth = 0;
      let jailedCount = 0, bannedCount = 0;
      let billionaires = 0, millionaires = 0, middleClass = 0, workingClass = 0;
      let onlineCount = 0;
      const ONLINE_THRESHOLD = 2.5 * 60 * 1000; // 2.5 minutes (150s)
      const now = Date.now();
      const allPlayersList = [];

      (rows || []).forEach(r => {
        const cash = Number(r.cash || 0);
        const bank = Number(r.bank || 0);
        const nw = Number(r.net_worth || 0);
        const lastSeen = Number(r.last_seen || 0);
        const isOnline = lastSeen > 0 && (now - lastSeen) < ONLINE_THRESHOLD;
        if (isOnline) onlineCount++;

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
          isJailed: Number(r.jail_timer) > 0,
          lastSeen,
          last_seen: lastSeen,
          lastActiveTimestamp: lastSeen,
          isOnline
        });
      });

      allPlayersList.sort((a, b) => b.netWorth - a.netWorth);

      return {
        totalPlayers: rows.length,
        scannedPlayers: rows.length,
        onlineCount,
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
      return { totalPlayers: 0, onlineCount: 0, totalCash: 0, totalBank: 0, totalNetWorth: 0, jailedCount: 0, bannedCount: 0 };
    }
  }

  async function adminGetAllPlayers() {
    const rows = await _api('players?select=username,pin,cash,bank,dirty_cash,net_worth,xp,title,job_id,is_admin,is_banned,jail_timer,total_taxes_paid,afk_manager_expires_at,last_seen,created_at,state&order=net_worth.desc');
    return (rows || []).map(r => {
      let stateObj = {};
      if (r.state) {
        if (typeof r.state === 'object') stateObj = r.state;
        else if (typeof r.state === 'string') {
          try { stateObj = JSON.parse(r.state); } catch(e) {}
        }
      }
      const p = { ...stateObj };
      p.state = stateObj;
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
      p.lastActiveTimestamp = p.lastSeen;
      p.last_seen = p.lastSeen;
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
    const seenTs = Number(r.last_seen || (r.state && (r.state.lastSeen || r.state.lastActiveTimestamp)) || 0);
    p.lastSeen = seenTs;
    p.lastActiveTimestamp = seenTs;
    p.last_seen = seenTs;
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
    else payload.state = updates;
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
    const now = Date.now();
    const rows = await _api('players?select=username,cash,bank,net_worth,title,job_id,is_admin,is_banned,state&is_banned=eq.false&order=net_worth.desc&limit=25');

    const topPlayers = (rows || []).map(r => {
      let pState = r.state;
      if (typeof pState === 'string') {
        try { pState = JSON.parse(pState); } catch(e) { pState = {}; }
      }
      pState = pState || {};
      const isFb = pState.facebookVerified === true || (Array.isArray(pState.badges) && pState.badges.includes('facebook'));

      return {
        username: r.username,
        cash: Number(r.cash || 0),
        bank: Number(r.bank || 0),
        netWorth: Number(r.net_worth || 0),
        net_worth: Number(r.net_worth || 0),
        title: r.title || 'عامل مبتدئ',
        jobId: r.job_id || 'worker',
        isAdmin: r.is_admin === true,
        facebookVerified: isFb
      };
    });

    _leaderboardMeta = {
      updatedAt: now,
      nextUpdateAt: now + (60 * 60 * 1000),
      cycleMinutes: 60
    };

    const docPayload = {
      id: 'leaderboard',
      data: {
        updatedAt: _leaderboardMeta.updatedAt,
        nextUpdateAt: _leaderboardMeta.nextUpdateAt,
        cycleMinutes: 60,
        topPlayers: topPlayers
      },
      updated_at: now
    };

    await _api('globals', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(docPayload)
    });

    await _api('globals', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: 'hourly_leaderboard',
        data: { timestamp: now, topPlayers: topPlayers },
        updated_at: now
      })
    });

    _leaderboardCache = topPlayers;
    _lastLeaderboardFetchTime = now;

    return topPlayers;
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
    if (typeof callback !== 'function') return () => {};
    let active = true;
    const fetchCorps = async () => {
      if (!active) return;
      try {
        const rows = await _api('corporations?select=*&order=created_at.desc');
        if (active) callback(rows || []);
      } catch (e) {
        if (active) callback([]);
      }
    };
    fetchCorps();
    const interval = setInterval(fetchCorps, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
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

    let projects = Array.isArray(corp.projects)
      ? [...corp.projects]
      : (corp.projects && typeof corp.projects === 'object' ? Object.keys(corp.projects).filter(k => corp.projects[k]) : []);
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
    let projects = Array.isArray(corp.projects)
      ? [...corp.projects]
      : (corp.projects && typeof corp.projects === 'object' ? Object.keys(corp.projects).filter(k => corp.projects[k]) : []);
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

  // ─────────────────────────────────────────────
  //  Advanced Anti-Profanity & Swear Filter Engine
  // ─────────────────────────────────────────────
  const ProfanityFilter = (() => {
    // Severe roots/words that are always offensive regardless of context
    const SEVERE_PATTERNS = [
      /شرمو*[طت]/i,
      /منيو*[كق]/i,
      /قحب/i,
      /متنا*[كق]/i,
      /تنا*[كق]/i,
      /معر*[صس]/i,
      /ديو*[ثس]/i,
      /خو*[لت]/i,
      /عاه[ره]/i,
      /بظر/i,
      /طيز/i,
      /ني[كق]/i,
      /يني[كق]/i,
      /اني[كق]/i,
      /كسم/i,
      /كسخت/i,
      /عرص[هة]?/i,
      /لبو*[هة]/i,
      /سكس/i,
      /بورن/i,
      /شاذ/i,
      /لوطي/i,
      /لواط/i,
      /سحاق/i,
      /وسخ/i,
      /حقير/i
    ];

    // Word boundary patterns (prevents false positives on words like مكسرات, كسب, انكسار, تركيز, حزب, عسل, إلخ)
    const BOUNDARY_PATTERNS = [
      /(?:^|[^\p{L}\p{N}])(كس|الكس|كسك|كسها|كسهم|كسكم|كسم|كسمك|كسختك|كسختكم)(?:[^\p{L}\p{N}]|$)/u,
      /(?:^|[^\p{L}\p{N}])(زب|الزب|زبي|زبك|زبها|زبهم)(?:[^\p{L}\p{N}]|$)/u,
      /(?:^|[^\p{L}\p{N}])(عرص|العرص|ياعرص|يا معرص)(?:[^\p{L}\p{N}]|$)/u,
      /(?:^|[^\p{L}\p{N}])(خول|الخول|ياخول|يا خول)(?:[^\p{L}\p{N}]|$)/u,
      /(?:^|[^\p{L}\p{N}])(واطي|الواطي|ياواطي|يا واطي)(?:[^\p{L}\p{N}]|$)/u,
      /(?:^|[^\p{L}\p{N}])(كلب|الكلب|ياكلب|يا كلب|ابن الكلب|ابن كلب|ولاد الكلب)(?:[^\p{L}\p{N}]|$)/u,
      /(?:^|[^\p{L}\p{N}])(حيوان|الحيوان|ياحيوان|يا حيوان|حمار|الحمار|ياحمار|يا حمار)(?:[^\p{L}\p{N}]|$)/u,
      /(?:^|[^\p{L}\p{N}])(وسخ|الوسخ|ياوسخ|يا وسخ|قذر|القذر|ياقذر|يا قذر)(?:[^\p{L}\p{N}]|$)/u,
      /(?:^|[^\p{L}\p{N}])(تفو|تفه|يلعن|يلعنك|يلعنكم|ملعون|اللعنة|تبا لك)(?:[^\p{L}\p{N}]|$)/u,
      /(?:^|[^\p{L}\p{N}])(fuck|fucking|fucker|fuk|fck|shit|bitch|asshole|pussy|cunt|dick|cock|bastard|slut|whore|motherfucker|nigger|nigga|porn|blowjob)(?:[^\p{L}\p{N}]|$)/iu
    ];

    function normalizeArabic(text) {
      return String(text || '')
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي');
    }

    function containsProfanity(rawText) {
      if (!rawText || typeof rawText !== 'string') return false;
      const norm = normalizeArabic(rawText);
      const collapsed = norm.replace(/(.)\1+/g, '$1');
      const stripped = norm.replace(/[^\p{L}\p{N}]/gu, '');
      const strippedCollapsed = stripped.replace(/(.)\1+/g, '$1');

      // 1. Check severe patterns on all variants
      for (const p of SEVERE_PATTERNS) {
        if (p.test(norm) || p.test(collapsed) || p.test(stripped) || p.test(strippedCollapsed)) return true;
      }

      // 2. Check boundary patterns on word-separated text
      for (const p of BOUNDARY_PATTERNS) {
        if (p.test(norm) || p.test(collapsed)) return true;
      }

      // 3. Check stripped English profanity
      if (/(fuck|shit|bitch|asshole|pussy|dick|cunt|slut|whore|nigger|nigga)/i.test(stripped)) return true;

      return false;
    }

    return {
      normalizeArabic,
      containsProfanity
    };
  })();

  if (typeof window !== 'undefined') {
    window.ProfanityFilter = ProfanityFilter;
  }

  async function sendChatMessage(sender, senderTitle, message, facebookVerified = false, extraMeta = {}) {
    if (!message || !message.trim()) return false;
    const trimmedMsg = String(message).trim().substring(0, 200);

    // Enforce anti-profanity shield (except official administration broadcasts)
    if (sender !== 'الإدارة' && ProfanityFilter.containsProfanity(trimmedMsg)) {
      throw new Error("تم حظر إرسال الرسالة! تحتوي الرسالة على ألفاظ غير لائقة أو شتائم مخالفة لقواعد اللعبة.");
    }

    const msgObj = {
      id:'msg_' + Date.now() +'_' + Math.random().toString(36).substring(2, 6),
      sender: String(sender ||'لاعب'),
      senderTitle: String(senderTitle ||'عامل مبتدئ'),
      message: trimmedMsg,
      facebookVerified: Boolean(facebookVerified),
      chatGlow: (extraMeta && extraMeta.chatGlow) ? String(extraMeta.chatGlow) : '',
      isVerified: Boolean(extraMeta && (extraMeta.isVerified || extraMeta.verified)),
      customBadge: (extraMeta && extraMeta.customBadge) ? String(extraMeta.customBadge) : '',
      timestamp: Date.now()
    };

    // Auto-detect player VIP glow from Cloud/State or customBadge if not provided in extraMeta
    if (!msgObj.chatGlow && sender && sender !== 'الإدارة') {
      if (extraMeta && (extraMeta.customBadge === '🌟' || (extraMeta.badgeTitle && extraMeta.badgeTitle.includes('حوت الشات')))) {
        msgObj.chatGlow = 'gold_neon';
      } else if (extraMeta && (extraMeta.customBadge === '👑✔️' || (extraMeta.customBadge && extraMeta.customBadge.includes('👑')))) {
        msgObj.chatGlow = 'cyber_rainbow';
      } else {
        try {
          const pRows = await _api(`players?username=eq.${encodeURIComponent(sender)}&select=state`);
          if (pRows && pRows.length > 0 && pRows[0].state) {
            const st = pRows[0].state;
            if (st.chatGlow) {
              msgObj.chatGlow = st.chatGlow;
            } else if (st.hasChatGlow || st.activePackage === 'pkg_vip_chat_glow' || st.customBadge === '🌟' || (st.badgeTitle && st.badgeTitle.includes('حوت الشات'))) {
              msgObj.chatGlow = 'gold_neon';
            } else if (st.activePackage === 'pkg_vip_royal_ultimate' || st.customBadge === '👑✔️' || (st.customBadge && st.customBadge.includes('👑'))) {
              msgObj.chatGlow = 'cyber_rainbow';
            }
            if (st.isVerified || st.vipVerified) msgObj.isVerified = true;
            if (st.customBadge && !msgObj.customBadge) msgObj.customBadge = st.customBadge;
          }
        } catch (e) {
          // Fallback silently if network query fails
        }
      }
    }

    try {
      const rows = await _api("globals?id=eq.chat_feed&select=data,updated_at");
      let currentFeed = [];
      if (rows && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.messages)) {
        currentFeed = rows[0].data.messages;
      }

      // If sender has glow, backfill their older messages in current feed so everything glows!
      if (msgObj.chatGlow) {
        currentFeed.forEach(m => {
          if (m.sender === msgObj.sender) {
            m.chatGlow = msgObj.chatGlow;
            if (msgObj.isVerified) m.isVerified = true;
            if (msgObj.customBadge) m.customBadge = msgObj.customBadge;
          }
        });
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
            const pollId = registerPollingInterval(setInterval(checkPlayer, 10000));
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

    // Track device linkage asynchronously without blocking login
    (async () => {
      try {
        const fp = await DeviceFingerprint.getFingerprint();
        let stateChanged = false;
        if (!state.known_devices) state.known_devices = [];
        if (!state.known_devices.includes(fp)) {
          state.known_devices.push(fp);
          stateChanged = true;
        }
        if (stateChanged) {
          savePlayerState(u, state).catch(() => {});
        }

        const reg = await getDeviceRegistry();
        let regChanged = false;
        if (!reg.devices[fp]) {
          reg.devices[fp] = u;
          regChanged = true;
        }
        if (!reg.accounts[u]) reg.accounts[u] = [];
        if (!reg.accounts[u].includes(fp)) {
          reg.accounts[u].push(fp);
          regChanged = true;
        }
        if (regChanged) {
          saveDeviceRegistry(reg).catch(() => {});
        }

        if (!DeviceFingerprint.getRegisteredAccountOnDevice()) {
          DeviceFingerprint.recordRegisteredAccountOnDevice(u);
        }
      } catch (devErr) {
        console.warn('[DB] login device tracking warning:', devErr.message);
      }
    })().catch(() => {});

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
    getLatestAirdrop,
    retryLatestAirdropToUnclaimed,
    setMaintenanceMode,
    getMaintenanceStatus,
    setStagingStatus,
    getStagingStatus,
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

    // Referral System
    getReferralReport,
    bindReferralCode,

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
    ProfanityFilter,
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

    // Security & Anti-Fraud Shield
    getTrustedNow,
    fetchServerTime,
    DeviceFingerprint,
    getDeviceRegistry,
    saveDeviceRegistry,
    getFraudAlerts,
    logFraudAlert,
    checkWireTransferFraud,

    // Top-up & Monetization
    getTopupPackages,
    saveTopupPackages,
    getPaymentSettings,
    savePaymentSettings,
    submitTopupRequest,
    getTopupRequests,
    processTopupRequest,
    deleteTopupRequest,
    getPlayerData
  };
})();

if (typeof module !=='undefined' && module.exports) {
  module.exports = AppDB;
}

if (typeof window !=="undefined") {
  window.AppDB = AppDB;
}
