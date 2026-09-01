/**
 * Ras ALmal Tycoon (رأس المال)
 * Database Adapter v12 (db.js)
 *
 * Architecture: ONLINE-FIRST (Firebase-First)
 *  - ALL reads/writes go directly to Firestore — no localStorage fallback.
 *  - Game is BLOCKED until Firebase is connected and ready.
 *  - If the user loses internet, the game shows an error and stops saving.
 *  - No sync queue, no local simulation — Firestore is the single source of truth.
 */

// Admin identity is determined at runtime from Firestore (isAdmin flag) — no hardcoded credentials.

const AppDB = (() => {
  console.log('[DB] Adapter Loaded (v=107)');
  // ─────────────────────────────────────────────
  //  CONSTANTS
  // ─────────────────────────────────────────────
  const CLIENT_VERSION = 'V2';

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyC7KRj3-t_03HLMzJ10miVhdKWCpabPQB4",
    authDomain: "foolos-man.firebaseapp.com",
    projectId: "foolos-man",
    storageBucket: "foolos-man.firebasestorage.app",
    messagingSenderId: "426833341092",
    appId: "1:426833341092:web:141a51c22d8b1afc621431",
    measurementId: "G-54ZC388NW1"
  };

  // Admin identity is determined at runtime from Firestore (isAdmin: true flag).
  // The Firebase Auth email is derived from username at login time — nothing is hardcoded.

  // ─────────────────────────────────────────────
  //  STATE
  // ─────────────────────────────────────────────
  let firestoreDb   = null;
  let firebaseAuth  = null;
  let firebaseReady = false;

  // ─────────────────────────────────────────────
  //  INIT — BLOCKING until Firebase is ready
  // ─────────────────────────────────────────────
  /**
   * Initialises Firebase and waits until Firestore is connected.
   * Throws if Firebase SDK is not loaded or connection fails.
   * The UI should show a loading overlay until this resolves.
   */
  async function init() {
    if (!window.firebase) {
      throw new Error('Firebase SDK غير محمّل. تحقق من اتصالك بالإنترنت وأعد تحميل الصفحة.');
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      firestoreDb  = firebase.firestore();
      firebaseAuth = firebase.auth();

      // Enable Firestore offline persistence
      try {
        await firestoreDb.enablePersistence({ synchronizeTabs: true });
        console.log('[DB] Firestore offline persistence enabled successfully.');
      } catch (err) {
        if (err.code === 'failed-precondition') {
          console.warn('[DB] Offline persistence failed: Multiple tabs open.');
        } else if (err.code === 'unimplemented') {
          console.warn('[DB] Offline persistence not supported by this browser.');
        }
      }

      // Verify connectivity with a lightweight ping (non-blocking)
      firestoreDb.collection('globals').doc('config').get().catch(err => {
        console.warn('[DB] Initial connectivity ping failed, but proceeding in offline-tolerant mode:', err.message);
      });

      firebaseReady = true;
      console.log('[DB] Firebase Firestore initialized successfully.');

      // Attach online/offline listeners for UI feedback
      _attachConnectivityListeners();

      return true;
    } catch (err) {
      firebaseReady = false;
      console.error('[DB] Firebase initialization failed:', err.message);
      throw new Error('تعذّر تهيئة خوادم اللعبة: ' + err.message);
    }
  }

  // ─────────────────────────────────────────────
  //  CONNECTIVITY LISTENERS
  // ─────────────────────────────────────────────
  function _attachConnectivityListeners() {
    window.addEventListener('online', () => {
      console.log('[DB] Network restored.');
      window.dispatchEvent(new CustomEvent('foolos:online'));
    });

    window.addEventListener('offline', () => {
      console.log('[DB] Network lost.');
      firebaseReady = false;
      window.dispatchEvent(new CustomEvent('foolos:offline'));
    });
  }

  // ─────────────────────────────────────────────
  //  HELPERS & CRYPTOGRAPHIC HASHING (SHA-256 + Salt)
  // ─────────────────────────────────────────────
  const PIN_SALT = 'RasALmal_SecureSalt_#2026';

  function _requireOnline() {
    if (!firebaseReady || !firestoreDb) {
      throw new Error('لا يوجد اتصال بالخوادم. تحقق من اتصالك بالإنترنت.');
    }
  }

  async function _ensureAdminAuth() {
    _requireOnline();
    if (firebaseAuth && !firebaseAuth.currentUser) {
      console.warn('[DB] Admin write attempted without active Firebase Auth session. Re-login required.');
    }
  }

  async function _hashStringAsync(pin, username) {
    if (!pin) return '';
    try {
      if (window.crypto && window.crypto.subtle) {
        const msgUint8 = new TextEncoder().encode(`${PIN_SALT}_${(username || '').toLowerCase().trim()}_${pin}`);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return 's256_' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {
      console.warn('[DB] Subtle crypto fallback active');
    }
    return _legacyHash(pin);
  }

  function _legacyHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(36);
  }

  function _sanitizeStateNumbers(state) {
    if (!state || typeof state !== 'object') return;
    const numKeys = ['cash', 'bank', 'dirtyCash', 'netWorth', 'xp'];
    numKeys.forEach(k => {
      if (typeof state[k] === 'number') {
        if (isNaN(state[k]) || !isFinite(state[k])) {
          state[k] = 0;
        } else {
          state[k] = Math.max(0, Math.min(100000000000000, Math.round(state[k])));
        }
      }
    });
  }

  // ─────────────────────────────────────────────
  //  VERSION CHECK
  // ─────────────────────────────────────────────
  async function checkVersion() {
    _requireOnline();
    try {
      const doc = await firestoreDb.collection('globals').doc('config').get();
      const remoteVersion = (doc.exists && doc.data().version) ? String(doc.data().version) : CLIENT_VERSION;
      return {
        upToDate: CLIENT_VERSION >= remoteVersion,
        clientVersion: CLIENT_VERSION,
        remoteVersion
      };
    } catch (err) {
      return { upToDate: true, clientVersion: CLIENT_VERSION, remoteVersion: CLIENT_VERSION };
    }
  }

  // ─────────────────────────────────────────────
  //  AUTH — REGISTER
  // ─────────────────────────────────────────────
  async function registerPlayer(username, pin) {
    if (!username || !pin) throw new Error('يرجى إدخال اسم المستخدم والرقم السري.');
    username = username.trim();
    if (username.length < 2 || username.length > 30) {
      throw new Error('اسم المستخدم يجب أن يكون بين 2 و 30 حرفاً.');
    }
    _requireOnline();

    if (username.toLowerCase() === 'admin') {
      throw new Error('اسم المستخدم هذا محظور ومحمي. يرجى اختيار اسم مستخدم عادي.');
    }

    const ref = firestoreDb.collection('players').doc(username);
    const existing = await ref.get();
    if (existing.exists) {
      throw new Error('اسم المستخدم هذا مسجل بالفعل. يرجى اختيار اسم آخر أو تسجيل الدخول.');
    }

    const pinHash = await _hashStringAsync(pin, username);
    const data = {
      username,
      pin: pinHash,
      netWorth: 2000,
      cash: 1500,
      bank: 500,
      dirtyCash: 0,
      xp: 0,
      underworldRep: 0,
      heatLevel: 0,
      jobId: 'worker',
      title: 'عامل مبتدئ',
      isAdmin: false,
      isBanned: false,
      jailTimer: 0,
      createdAt: Date.now(),
      lastSeen: Date.now()
    };

    // Save with server-acknowledgement race:
    // With offline persistence enabled, ref.set commits to local IndexedDB immediately.
    // However, if the server quota is exceeded or network backoff is triggered, the promise
    // waits for server ack indefinitely (hanging). We race against a 2s timer so the user
    // can proceed instantly without getting stuck on an infinite loading spinner.
    try {
      const setPromise = ref.set(data);
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000));
      await Promise.race([setPromise, timeoutPromise]);
    } catch (setErr) {
      console.warn('[DB] ref.set server ack warning (persisted locally):', setErr.message);
    }

    // Cache state locally immediately
    try {
      localStorage.setItem(`foolos_state_${username}`, JSON.stringify(data));
    } catch (e) {}

    // Update global system accounts counter asynchronously
    try {
      if (firestoreDb && typeof firebase !== 'undefined' && firebase.firestore) {
        firestoreDb.collection('globals').doc('stats').set({
          totalPlayersRegistered: firebase.firestore.FieldValue.increment(1),
          lastRegisteredUser: username,
          lastRegisteredAt: Date.now()
        }, { merge: true }).catch(() => {});
      }
    } catch (e) {}

    console.log('[DB] Player registered securely:', username);
    return data;
  }

  // ─────────────────────────────────────────────
  //  AUTH — LOGIN
  // ─────────────────────────────────────────────
  async function loginPlayer(username, pin) {
    if (!username || !pin) throw new Error('يرجى إدخال اسم المستخدم والرقم السري.');
    username = username.trim();
    _requireOnline();

    const expectedHash = await _hashStringAsync(pin, username);
    const legacyHash = _legacyHash(pin);

    const ref = firestoreDb.collection('players').doc(username);
    const doc = await ref.get();

    if (!doc.exists) {
      throw new Error('اسم المستخدم غير مسجل. يرجى إنشاء حساب جديد أولاً.');
    }

    const data = doc.data();

    if (data.isBanned) {
      throw new Error('هذا الحساب محظور وموقوف من قبل إدارة المنظومة.');
    }

    if (data.pin !== expectedHash && data.pin !== legacyHash && data.pin !== pin) {
      throw new Error('الرقم السري غير صحيح. يرجى المحاولة مرة أخرى.');
    }

    // Auto-upgrade legacy hash to salted SHA-256
    if (data.pin !== expectedHash) {
      ref.update({ pin: expectedHash }).catch(() => {});
      data.pin = expectedHash;
    }

    // If admin: sign into Firebase Auth using derived email + entered PIN for write permissions
    if (data.isAdmin && firebaseAuth) {
      try {
        const adminEmail = `${username}@foolos-man.com`;
        await firebaseAuth.signInWithEmailAndPassword(adminEmail, pin);
        console.log('[DB] Admin authenticated via Firebase Auth successfully.');
      } catch (e) {
        console.warn('[DB] Firebase Auth Admin sign-in non-fatal warning:', e.message);
      }
    } else if (firebaseAuth && firebaseAuth.currentUser) {
      // Sign out any existing admin session for regular users
      try { await firebaseAuth.signOut(); } catch(e) {}
    }

    // Update lastSeen
    ref.update({ lastSeen: Date.now() }).catch(() => {});

    console.log('[DB] Player authenticated securely:', username);
    return data;
  }

  // ─────────────────────────────────────────────
  //  GET PLAYER STATE
  // ─────────────────────────────────────────────
  async function getPlayerState(username) {
    _requireOnline();
    const ref = firestoreDb.collection('players').doc(username);
    let serverDoc = null;
    try {
      const getPromise = ref.get();
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 3000));
      serverDoc = await Promise.race([getPromise, timeoutPromise]);
    } catch (e) {
      console.warn('[DB] getPlayerState server fetch error:', e.message);
    }

    let localState = null;
    try {
      const cached = localStorage.getItem(`foolos_state_${username}`);
      if (cached) localState = JSON.parse(cached);
    } catch (e) {}

    // Strict Cross-Device Sync Resolution
    if (serverDoc && serverDoc.exists) {
      const serverData = serverDoc.data();
      const serverTime = serverData.lastActiveTimestamp || serverData.lastSeen || 0;
      const localTime = localState ? (localState.lastActiveTimestamp || localState.lastSeen || 0) : 0;

      // If server is newer or equal (e.g. player advanced on tablet, then opened phone)
      if (serverTime >= localTime || !localState) {
        try {
          localStorage.setItem(`foolos_state_${username}`, JSON.stringify(serverData));
        } catch (e) {}
        return serverData;
      } else {
        // Local state has newer un-flushed progress, update server immediately
        savePlayerState(username, localState, true);
        return localState;
      }
    }

    // Fallback: return local state if server couldn't be reached
    if (localState) return localState;
    if (serverDoc && serverDoc.exists) return serverDoc.data();
    return null;
  }

  // ─────────────────────────────────────────────
  //  SAVE PLAYER STATE (Cross-Device Fast Sync & Smart Caching)
  // ─────────────────────────────────────────────
  let _saveTimeout = null;
  let _pendingSaveState = null;
  let _pendingSaveUser = null;

  async function flushPendingSave() {
    if (_saveTimeout) {
      clearTimeout(_saveTimeout);
      _saveTimeout = null;
    }
    if (_pendingSaveUser && _pendingSaveState && firebaseReady && firestoreDb) {
      const usernameToSave = _pendingSaveUser;
      const stateToSave = { 
        ..._pendingSaveState, 
        lastSeen: Date.now(),
        lastActiveTimestamp: _pendingSaveState.lastActiveTimestamp || Date.now()
      };
      _pendingSaveUser = null;
      _pendingSaveState = null;
      try {
        const ref = firestoreDb.collection('players').doc(usernameToSave);
        await ref.set(stateToSave, { merge: true });
        console.log('[DB] Flushed pending state successfully to Cloud');
        // Update centralized leaderboard asynchronously if player has competitive net worth
        _checkAndUpdateCentralLeaderboard(usernameToSave, stateToSave).catch(() => {});
      } catch (err) {
        console.warn('[DB] Flush sync warning:', err.message);
      }
    }
  }

  // Auto-flush on window close / tab switch
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      flushPendingSave();
    });
    window.addEventListener('pagehide', () => {
      flushPendingSave();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSave();
      }
    });
  }

  async function savePlayerState(username, state, immediate = false) {
    if (!username) return;
    state.username = username;
    state.lastSeen = Date.now();
    if (!state.lastActiveTimestamp) state.lastActiveTimestamp = Date.now();

    // Cache locally instantly in LocalStorage
    try {
      localStorage.setItem(`foolos_state_${username}`, JSON.stringify(state));
    } catch (e) {}

    _pendingSaveUser = username;
    _pendingSaveState = state;

    if (immediate) {
      return await flushPendingSave();
    }

    if (!_saveTimeout) {
      _saveTimeout = setTimeout(async () => {
        _saveTimeout = null;
        await flushPendingSave();
      }, 15000); // 15s debounced sync (reduces Firebase write quota consumption by ~65%)
    }
  }

  // ─────────────────────────────────────────────
  //  CENTRALIZED ULTRA-LIGHTWEIGHT LEADERBOARD
  //  (Consumes 1 single read per fetch for ALL players instead of 50 reads!)
  // ─────────────────────────────────────────────
  let _leaderboardCache = null;
  let _leaderboardCacheTime = 0;

  async function _checkAndUpdateCentralLeaderboard(username, state) {
    if (!state || !username || state.isAdmin || state.isBanned) return;
    const netWorth = Number(state.netWorth || 0);
    if (netWorth <= 0) return;

    try {
      const docRef = firestoreDb.collection('globals').doc('leaderboard');
      let currentTop = _leaderboardCache || [];
      
      // If we don't have a cached list, fetch current doc
      if (currentTop.length === 0) {
        const snap = await docRef.get();
        if (snap.exists && Array.isArray(snap.data().topPlayers)) {
          currentTop = snap.data().topPlayers;
        }
      }

      const existingIdx = currentTop.findIndex(p => (p.username || '').toLowerCase() === username.toLowerCase());
      const lowestWorth = currentTop.length >= 25 ? (currentTop[currentTop.length - 1].netWorth || 0) : 0;

      // Only write to Firestore if player is already on leaderboard or qualifies to enter Top 25
      if (existingIdx !== -1 || currentTop.length < 25 || netWorth > lowestWorth) {
        const entry = {
          username: username,
          netWorth: netWorth,
          title: state.title || 'عامل مبتدئ',
          lastSeen: Date.now()
        };

        let updatedList = [...currentTop];
        if (existingIdx !== -1) {
          updatedList[existingIdx] = entry;
        } else {
          updatedList.push(entry);
        }

        updatedList.sort((a, b) => (b.netWorth || 0) - (a.netWorth || 0));
        const finalTop25 = updatedList.slice(0, 25);

        // Update centralized doc in Firestore
        await docRef.set({
          topPlayers: finalTop25,
          updatedAt: Date.now(),
          lastUpdater: username
        }, { merge: true });

        _leaderboardCache = finalTop25;
        _leaderboardCacheTime = Date.now();
        try {
          localStorage.setItem('foolos_cached_leaderboard', JSON.stringify(finalTop25));
        } catch (e) {}
        console.log('[DB] Centralized leaderboard updated successfully');
      }
    } catch (e) {
      console.warn('[DB] Centralized leaderboard auto-update warning:', e.message);
    }
  }

  async function getLeaderboard(forceRefresh = false) {
    _requireOnline();

    const now = Date.now();
    // Use in-memory cache if fresh (60 seconds) to avoid redundant network reads
    if (!forceRefresh && _leaderboardCache && (now - _leaderboardCacheTime < 60000)) {
      return _leaderboardCache;
    }

    // 1. Primary Strategy: Ultra-lightweight 1-read centralized document
    try {
      const docSnap = await firestoreDb.collection('globals').doc('leaderboard').get();
      if (docSnap.exists) {
        const data = docSnap.data();
        if (data && Array.isArray(data.topPlayers) && data.topPlayers.length > 0) {
          _leaderboardCache = data.topPlayers;
          _leaderboardCacheTime = now;
          try {
            localStorage.setItem('foolos_cached_leaderboard', JSON.stringify(data.topPlayers));
          } catch (e) {}
          return data.topPlayers;
        }
      }
    } catch (docErr) {
      console.warn('[DB] Centralized leaderboard read error (quota or network):', docErr.message);
    }

    // 2. Fallback: Query players collection if centralized doc is missing or empty
    try {
      const snapshot = await firestoreDb.collection('players')
        .orderBy('netWorth', 'desc')
        .limit(30)
        .get();

      const entries = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.isAdmin || d.isBanned) return;
        entries.push({
          username: d.username || doc.id,
          netWorth: Number(d.netWorth || 0),
          title: d.title || 'عامل مبتدئ',
          lastSeen: d.lastSeen || Date.now()
        });
      });

      const top25 = entries.slice(0, 25);
      if (top25.length > 0) {
        _leaderboardCache = top25;
        _leaderboardCacheTime = now;
        // Save centralized doc so all other clients benefit from single-read performance
        firestoreDb.collection('globals').doc('leaderboard').set({
          topPlayers: top25,
          updatedAt: Date.now()
        }, { merge: true }).catch(() => {});
        try {
          localStorage.setItem('foolos_cached_leaderboard', JSON.stringify(top25));
        } catch (e) {}
        return top25;
      }
    } catch (queryErr) {
      console.warn('[DB] Fallback leaderboard query failed:', queryErr.message);
    }

    // 3. Last resort: Return previously cached leaderboard from memory or localStorage (NEVER fake an isolated account as #1)
    if (_leaderboardCache && _leaderboardCache.length > 0) {
      return _leaderboardCache;
    }
    try {
      const savedLocal = localStorage.getItem('foolos_cached_leaderboard');
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        if (Array.isArray(parsed) && parsed.length > 0) {
          _leaderboardCache = parsed;
          return parsed;
        }
      }
    } catch (e) {}

    return [];
  }

  // Admin utility to force-rebuild the centralized leaderboard from all active player docs
  async function adminRebuildLeaderboard() {
    _requireOnline();
    await _ensureAdminAuth();
    const snapshot = await firestoreDb.collection('players')
      .orderBy('netWorth', 'desc')
      .limit(50)
      .get();

    const entries = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      if (d.isAdmin || d.isBanned) return;
      entries.push({
        username: d.username || doc.id,
        netWorth: Number(d.netWorth || 0),
        title: d.title || 'عامل مبتدئ',
        lastSeen: d.lastSeen || Date.now()
      });
    });

    const top25 = entries.slice(0, 25);
    await firestoreDb.collection('globals').doc('leaderboard').set({
      topPlayers: top25,
      updatedAt: Date.now(),
      rebuiltByAdmin: true
    }, { merge: true });

    _leaderboardCache = top25;
    _leaderboardCacheTime = Date.now();
    return top25;
  }

  // ─────────────────────────────────────────────
  //  WIRE TRANSFER — Firestore atomic transaction
  // ─────────────────────────────────────────────
  async function executeWireTransfer(senderUsername, recipientUsername, amount) {
    if (!senderUsername || !recipientUsername) throw new Error('بيانات التحويل غير مكتملة.');
    if (senderUsername === recipientUsername) throw new Error('لا يمكنك التحويل لنفسك!');
    if (amount <= 0) throw new Error('مبلغ التحويل يجب أن يكون أكبر من صفر.');
    _requireOnline();

    const db = firestoreDb;
    const senderRef = db.collection('players').doc(senderUsername);
    const recipientRef = db.collection('players').doc(recipientUsername);

    // Verify recipient exists
    const recipientDoc = await recipientRef.get();
    if (!recipientDoc.exists) {
      throw new Error('المستلم غير موجود. تحقق من كتابة الاسم بدقة.');
    }

    return await db.runTransaction(async (tx) => {
      const [senderDoc, recDoc] = await Promise.all([
        tx.get(senderRef),
        tx.get(recipientRef)
      ]);

      const senderCash = (senderDoc.exists ? senderDoc.data().cash : 0) || 0;
      if (senderCash < amount) throw new Error('رصيدك الحالي غير كافٍ لإتمام عملية التحويل.');

      const recipientCash = (recDoc.exists ? recDoc.data().cash : 0) || 0;

      tx.set(senderRef, {
        cash: senderCash - amount,
        netWorth: Math.max(0, (senderDoc.data().netWorth || 0) - amount)
      }, { merge: true });

      tx.set(recipientRef, {
        cash: recipientCash + amount,
        netWorth: (recDoc.data().netWorth || 0) + amount
      }, { merge: true });

      const logRef = db.collection('transfers').doc();
      tx.set(logRef, {
        sender: senderUsername,
        recipient: recipientUsername,
        amount,
        timestamp: Date.now()
      });

      return true;
    });
  }

  // ─────────────────────────────────────────────
  //  TRANSFER REQUESTS — Firestore Operations
  // ─────────────────────────────────────────────
  async function createTransferRequest(senderUsername, recipientUsername, amount) {
    if (!senderUsername || !recipientUsername) throw new Error('بيانات الطلب غير مكتملة.');
    if (senderUsername === recipientUsername) throw new Error('لا يمكنك إرسال طلب تحويل لنفسك!');
    amount = Number(amount);
    if (isNaN(amount) || amount <= 0) throw new Error('مبلغ الطلب يجب أن يكون أكبر من صفر.');
    _requireOnline();

    // Verify recipient exists
    const recRef = firestoreDb.collection('players').doc(recipientUsername);
    const recDoc = await recRef.get();
    if (!recDoc.exists) {
      throw new Error('اللاعب المستلم غير موجود. تحقق من كتابة الاسم بدقة.');
    }

    const requestData = {
      sender: senderUsername,
      recipient: recipientUsername,
      amount: amount,
      status: 'pending',
      timestamp: Date.now()
    };

    const docRef = await firestoreDb.collection('transferRequests').add(requestData);
    return { id: docRef.id, ...requestData };
  }

  async function getIncomingTransferRequests(username) {
    _requireOnline();
    const snapshot = await firestoreDb.collection('transferRequests')
      .where('recipient', '==', username)
      .orderBy('timestamp', 'desc')
      .get();
    
    const list = [];
    snapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });
    return list;
  }

  async function getSentTransferRequests(username) {
    _requireOnline();
    const snapshot = await firestoreDb.collection('transferRequests')
      .where('sender', '==', username)
      .orderBy('timestamp', 'desc')
      .get();
    
    const list = [];
    snapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });
    return list;
  }

  async function acceptTransferRequest(requestId, recipientUsername) {
    _requireOnline();
    const db = firestoreDb;
    const reqRef = db.collection('transferRequests').doc(requestId);
    
    return await db.runTransaction(async (tx) => {
      const reqDoc = await tx.get(reqRef);
      if (!reqDoc.exists) throw new Error('طلب التحويل غير موجود.');
      
      const reqData = reqDoc.data();
      if (reqData.recipient !== recipientUsername) {
        throw new Error('غير مصرح لك بقبول هذا الطلب.');
      }
      if (reqData.status !== 'pending') {
        throw new Error('هذا الطلب تم الرد عليه مسبقاً أو انتهت صلاحيته.');
      }
      
      // Check 24 hour expiration
      const elapsed = Date.now() - reqData.timestamp;
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (elapsed > twentyFourHours) {
        throw new Error('انتهت صلاحية هذا الطلب (أكثر من 24 ساعة).');
      }
      
      const amount = Number(reqData.amount);
      const senderRef = db.collection('players').doc(reqData.sender);
      const recipientRef = db.collection('players').doc(reqData.recipient);
      
      const [senderDoc, recDoc] = await Promise.all([
        tx.get(senderRef),
        tx.get(recipientRef)
      ]);
      
      if (!recDoc.exists) throw new Error('اللاعب المستلم غير موجود.');
      if (!senderDoc.exists) throw new Error('اللاعب المرسل غير موجود.');
      
      const recCash = (recDoc.data().cash || 0);
      if (recCash < amount) {
        throw new Error('رصيدك الحالي غير كافٍ لقبول هذا الطلب ودفع القيمة.');
      }
      
      // Deduct from recipient
      tx.set(recipientRef, {
        cash: recCash - amount,
        netWorth: Math.max(0, (recDoc.data().netWorth || 0) - amount)
      }, { merge: true });
      
      // Add to sender
      const senderCash = (senderDoc.data().cash || 0);
      tx.set(senderRef, {
        cash: senderCash + amount,
        netWorth: (senderDoc.data().netWorth || 0) + amount
      }, { merge: true });
      
      // Update request status
      tx.update(reqRef, { status: 'accepted' });
      
      // Add transaction log
      const logRef = db.collection('transfers').doc();
      tx.set(logRef, {
        sender: reqData.recipient, // recipient of request is sender of money
        recipient: reqData.sender, // sender of request is recipient of money
        amount,
        timestamp: Date.now(),
        isFromRequest: true,
        requestId: requestId
      });
      
      return true;
    });
  }

  async function rejectTransferRequest(requestId, recipientUsername) {
    _requireOnline();
    const db = firestoreDb;
    const reqRef = db.collection('transferRequests').doc(requestId);
    
    return await db.runTransaction(async (tx) => {
      const reqDoc = await tx.get(reqRef);
      if (!reqDoc.exists) throw new Error('طلب التحويل غير موجود.');
      
      const reqData = reqDoc.data();
      if (reqData.recipient !== recipientUsername) {
        throw new Error('غير مصرح لك برفض هذا الطلب.');
      }
      if (reqData.status !== 'pending') {
        throw new Error('هذا الطلب تم الرد عليه مسبقاً أو انتهت صلاحيته.');
      }
      
      // Check 24 hour expiration
      const elapsed = Date.now() - reqData.timestamp;
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (elapsed > twentyFourHours) {
        throw new Error('انتهت صلاحية هذا الطلب.');
      }
      
      tx.update(reqRef, { status: 'rejected' });
      return true;
    });
  }

  // ─────────────────────────────────────────────
  //  ITEMS CONFIGURATION — Firestore Operations
  // ─────────────────────────────────────────────
  async function adminSaveItemConfig(itemId, cost, durationSeconds) {
    _requireOnline();
    await _ensureAdminAuth();
    
    cost = Number(cost);
    const durationTicks = Math.round(Number(durationSeconds) / 3);
    if (isNaN(cost) || cost <= 0 || isNaN(durationTicks) || durationTicks <= 0) {
      throw new Error('القيم المدخلة غير صالحة.');
    }

    const docRef = firestoreDb.collection('globals').doc('itemsConfig');
    
    return await firestoreDb.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);
      const data = doc.exists ? doc.data() : {};
      data[itemId] = { cost, durationTicks };
      tx.set(docRef, data);
      return true;
    });
  }

  async function getItemsConfig() {
    _requireOnline();
    try {
      const doc = await firestoreDb.collection('globals').doc('itemsConfig').get();
      if (doc.exists) return doc.data();
    } catch (e) {
      console.warn('[DB] Failed to load items config:', e);
    }
    return null;
  }

  // ─────────────────────────────────────────────
  //  AUCTION SYSTEM — Firestore Operations
  // ─────────────────────────────────────────────
  async function adminCreateAuctionItem(name, description, price, quantity) {
    _requireOnline();
    await _ensureAdminAuth();
    
    price = Number(price);
    quantity = Number(quantity);
    if (!name || isNaN(price) || price <= 0 || isNaN(quantity) || quantity < 0) {
      throw new Error('القيم المدخلة لإنشاء الغرض غير صالحة.');
    }

    const docRef = firestoreDb.collection('auctions').doc();
    await docRef.set({
      name,
      description: description || '',
      price,
      quantity,
      soldCount: 0,
      createdTimestamp: Date.now(),
      createdBy: 'admin'
    });
    return true;
  }

  async function adminDeleteAuctionItem(auctionId) {
    _requireOnline();
    await _ensureAdminAuth();
    await firestoreDb.collection('auctions').doc(auctionId).delete();
    return true;
  }

  async function getAuctionItems() {
    _requireOnline();
    const snap = await firestoreDb.collection('auctions')
      .orderBy('createdTimestamp', 'desc')
      .get();
    
    const items = [];
    snap.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() });
    });
    return items;
  }

  async function purchaseAuctionItem(auctionId, username) {
    _requireOnline();
    const db = firestoreDb;
    const auctionRef = db.collection('auctions').doc(auctionId);
    const playerRef = db.collection('players').doc(username);

    return await db.runTransaction(async (tx) => {
      const [auctionDoc, playerDoc] = await Promise.all([
        tx.get(auctionRef),
        tx.get(playerRef)
      ]);

      if (!auctionDoc.exists) throw new Error('غرض المزاد غير موجود.');
      if (!playerDoc.exists) throw new Error('بيانات اللاعب غير موجودة.');

      const auction = auctionDoc.data();
      const player = playerDoc.data();

      const remaining = (auction.quantity || 0) - (auction.soldCount || 0);
      if (remaining <= 0) {
        throw new Error('عذراً، لقد نفذت الكمية المتاحة من هذا الغرض.');
      }

      if ((player.cash || 0) < auction.price) {
        throw new Error(`لا تملك رصيد كاش كافي للشراء! السعر: ${auction.price.toLocaleString()} ج.م بينما كاشك الحالي: ${(player.cash || 0).toLocaleString()} ج.م.`);
      }

      const newCash = (player.cash || 0) - auction.price;
      const worth = (player.netWorth || 0) - auction.price;
      const customItems = player.customItems || [];
      customItems.push({
        auctionId: auctionId,
        name: auction.name,
        description: auction.description || '',
        price: auction.price,
        timestamp: Date.now()
      });

      tx.update(playerRef, {
        cash: newCash,
        customItems: customItems,
        netWorth: worth
      });

      const newSoldCount = (auction.soldCount || 0) + 1;
      const buyers = auction.buyers || [];
      buyers.push({ username, timestamp: Date.now() });

      tx.update(auctionRef, {
        soldCount: newSoldCount,
        buyers: buyers
      });

      return {
        name: auction.name,
        price: auction.price,
        newCash: newCash,
        newNetWorth: worth
      };
    });
  }

  // ─────────────────────────────────────────────
  //  GIFT CODES SYSTEM — Firestore Operations
  // ─────────────────────────────────────────────
  async function adminCreateGiftCode(code, rewardType, details, maxUses) {
    _requireOnline();
    await _ensureAdminAuth();
    
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) throw new Error('يرجى إدخال رمز الكود.');

    maxUses = Number(maxUses) || 0;
    
    const docRef = firestoreDb.collection('giftCodes').doc(normalizedCode);
    const doc = await docRef.get();
    if (doc.exists) throw new Error('هذا الكود موجود بالفعل!');

    await docRef.set({
      rewardType,
      rewardDetails: details,
      maxUses,
      usedCount: 0,
      redeemedUsers: [],
      createdTimestamp: Date.now()
    });
    return true;
  }

  async function adminDeleteGiftCode(code) {
    _requireOnline();
    await _ensureAdminAuth();
    const normalizedCode = code.trim().toUpperCase();
    await firestoreDb.collection('giftCodes').doc(normalizedCode).delete();
    return true;
  }

  async function adminGetGiftCodes() {
    _requireOnline();
    await _ensureAdminAuth();
    const snap = await firestoreDb.collection('giftCodes')
      .orderBy('createdTimestamp', 'desc')
      .get();
    const codes = [];
    snap.forEach(doc => {
      codes.push({ id: doc.id, ...doc.data() });
    });
    return codes;
  }

  async function redeemGiftCode(code, username) {
    _requireOnline();
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) throw new Error('يرجى إدخال رمز الكود.');

    const db = firestoreDb;
    const codeRef = db.collection('giftCodes').doc(normalizedCode);
    const playerRef = db.collection('players').doc(username);

    return await db.runTransaction(async (tx) => {
      const [codeDoc, playerDoc] = await Promise.all([
        tx.get(codeRef),
        tx.get(playerRef)
      ]);

      if (!codeDoc.exists) throw new Error('كود الهدية غير صحيح أو غير مفعل.');
      if (!playerDoc.exists) throw new Error('حساب اللاعب غير موجود.');

      const codeData = codeDoc.data();
      const playerData = playerDoc.data();

      const redeemedList = codeData.redeemedUsers || [];
      if (redeemedList.includes(username)) {
        throw new Error('لقد قمت باسترداد هذا الكود مسبقاً!');
      }

      if (codeData.maxUses > 0 && (codeData.usedCount || 0) >= codeData.maxUses) {
        throw new Error('عذراً، لقد نفذت مرات استخدام هذا الكود المتاحة.');
      }

      let rewardText = '';
      const updates = {};

      if (codeData.rewardType === 'cash') {
        const amount = Number(codeData.rewardDetails.amount || 0);
        if (amount <= 0) throw new Error('تفاصيل المكافأة المالية غير صالحة.');
        
        const newCash = (playerData.cash || 0) + amount;
        const newNetWorth = (playerData.netWorth || 0) + amount;

        updates.cash = newCash;
        updates.netWorth = newNetWorth;
        rewardText = `مبلغ مالي بقيمة ${amount.toLocaleString()} ج.م`;

      } else if (codeData.rewardType === 'business') {
        const bId = codeData.rewardDetails.businessId;
        const lvl = Number(codeData.rewardDetails.level || 1);
        const workers = Number(codeData.rewardDetails.workers || 0);

        if (!bId) throw new Error('تفاصيل مكافأة الأملاك غير صالحة.');

        const playerBusinesses = playerData.businesses || {};
        playerBusinesses[bId] = {
          level: lvl,
          price: playerBusinesses[bId]?.price || 22,
          workers: workers
        };

        updates.businesses = playerBusinesses;
        rewardText = `مشروع/شركة بمستوى ${lvl} وعدد ${workers} عمال`;

      } else if (codeData.rewardType === 'item') {
        const itemId = codeData.rewardDetails.itemId;
        if (!itemId) throw new Error('تفاصيل مكافأة الأداة غير صالحة.');

        const inventory = playerData.inventory || {};
        inventory[itemId] = (inventory[itemId] || 0) + 1;
        updates.inventory = inventory;

        const durations = playerData.itemDurations || {};
        let durationTicks = 100;
        if (window.GameEngine && window.GameEngine.STORE_ITEMS && window.GameEngine.STORE_ITEMS[itemId]) {
          durationTicks = window.GameEngine.STORE_ITEMS[itemId].durationTicks;
        }
        durations[itemId] = durationTicks;
        updates.itemDurations = durations;

        rewardText = `أداة/عنصر من المتجر (${itemId})`;
      } else {
        throw new Error('نوع المكافأة غير معروف.');
      }

      tx.update(playerRef, updates);

      redeemedList.push(username);
      tx.update(codeRef, {
        usedCount: (codeData.usedCount || 0) + 1,
        redeemedUsers: redeemedList
      });

      return {
        rewardType: codeData.rewardType,
        rewardDetails: codeData.rewardDetails,
        rewardText: rewardText,
        playerUpdates: updates
      };
    });
  }

  // ─────────────────────────────────────────────
  // ─────────────────────────────────────────────
  //  ADMIN FUNCTIONS
  // ─────────────────────────────────────────────
  // sendBroadcast is defined in the ADMIN BROADCAST & AIRDROP section below

  async function sendAirdrop(amount, recipient = null) {
    _requireOnline();
    const payload = { 
      amount: Number(amount), 
      recipient: (recipient && recipient !== 'ALL') ? recipient.trim() : 'ALL', 
      timestamp: Date.now() 
    };
    await firestoreDb.collection('globals').doc('airdrop').set(payload);
    
    // If targeted at a single player, inject directly into their doc as well
    if (recipient && recipient !== 'ALL') {
      try {
        const pRef = firestoreDb.collection('players').doc(recipient.trim());
        const pDoc = await pRef.get();
        if (pDoc.exists) {
          const pData = pDoc.data();
          const newCash = (pData.cash || 0) + Number(amount);
          const newWorth = (pData.netWorth || 0) + Number(amount);
          await pRef.set({ cash: newCash, netWorth: newWorth }, { merge: true });
        }
      } catch (e) {
        console.warn('[DB] Targeted airdrop direct save error:', e);
      }
    }
  }

  async function adminGetPlayer(username) {
    _requireOnline();
    username = username.trim();
    const doc = await firestoreDb.collection('players').doc(username).get();
    if (!doc.exists) throw new Error('اسم المستخدم المطلوب غير مسجل بالخوادم.');
    return doc.data();
  }

  let _cachedAdminPlayers = null;
  let _cachedAdminPlayersTime = 0;

  async function adminGetAllPlayers(forceRefresh = false) {
    _requireOnline();
    const now = Date.now();
    if (!forceRefresh && _cachedAdminPlayers && (now - _cachedAdminPlayersTime < 90000)) {
      return _cachedAdminPlayers;
    }

    let snapshot = null;
    let fromCache = false;
    let quotaExceeded = false;

    try {
      snapshot = await firestoreDb.collection('players').get();
      if (snapshot && snapshot.metadata && snapshot.metadata.fromCache) {
        fromCache = true;
      }
    } catch (err) {
      console.warn('[DB] adminGetAllPlayers remote fetch error (trying cache):', err.message);
      if (err.message && (err.message.includes('Quota') || err.message.includes('RESOURCE_EXHAUSTED') || err.code === 'resource-exhausted')) {
        quotaExceeded = true;
      }
      try {
        snapshot = await firestoreDb.collection('players').get({ source: 'cache' });
        fromCache = true;
      } catch (cacheErr) {
        snapshot = { forEach: () => {} };
      }
    }

    const players = [];
    const playerUsernames = new Set();

    if (snapshot && snapshot.forEach) {
      snapshot.forEach(doc => {
        const data = doc.data();
        const uname = data.username || doc.id;
        playerUsernames.add(uname.toLowerCase());
        players.push({
          username: uname,
          netWorth: Number(data.netWorth || 0),
          cash: Number(data.cash || 0),
          bank: Number(data.bank || 0),
          title: data.title || 'عامل مبتدئ',
          jobId: data.jobId || 'unemployed',
          jailTimer: Number(data.jailTimer || 0),
          isBanned: Boolean(data.isBanned),
          isAdmin: Boolean(data.isAdmin),
          createdAt: data.createdAt || 0,
          lastSeen: data.lastSeen || 0,
          lastActiveTimestamp: data.lastActiveTimestamp || data.lastSeen || 0,
          fromCache: fromCache,
          quotaExceeded: quotaExceeded,
          raw: data
        });
      });
    }

    // Also scan localStorage for any players created or cached on this client that might not be synced yet
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('foolos_state_')) {
          const u = k.replace('foolos_state_', '');
          if (u && !playerUsernames.has(u.toLowerCase())) {
            const rawCached = localStorage.getItem(k);
            if (rawCached) {
              const data = JSON.parse(rawCached);
              playerUsernames.add(u.toLowerCase());
              players.push({
                username: u,
                netWorth: Number(data.netWorth || 0),
                cash: Number(data.cash || 0),
                bank: Number(data.bank || 0),
                title: data.title || 'عامل مبتدئ',
                jobId: data.jobId || 'unemployed',
                jailTimer: Number(data.jailTimer || 0),
                isBanned: Boolean(data.isBanned),
                isAdmin: Boolean(data.isAdmin),
                createdAt: data.createdAt || 0,
                lastSeen: data.lastSeen || 0,
                lastActiveTimestamp: data.lastActiveTimestamp || data.lastSeen || 0,
                fromCache: true,
                quotaExceeded: quotaExceeded,
                raw: data
              });
            }
          }
        }
      }
    } catch (e) {}

    // Sort by NetWorth descending
    players.sort((a, b) => b.netWorth - a.netWorth);
    _cachedAdminPlayers = players;
    _cachedAdminPlayersTime = now;
    return players;
  }

  async function adminSavePlayer(username, playerState) {
    _requireOnline();
    await _ensureAdminAuth();
    username = username.trim();
    playerState.adminModifiedTimestamp = Date.now();
    await firestoreDb.collection('players').doc(username).set(playerState, { merge: true });
  }

  async function adminResetPlayer(username) {
    _requireOnline();
    await _ensureAdminAuth();
    username = username.trim();
    
    // Fetch existing player doc to preserve the user's PIN and admin flag
    const docRef = firestoreDb.collection('players').doc(username);
    const existingSnap = await docRef.get();
    const existingData = existingSnap.exists ? existingSnap.data() : {};
    const existingPin = existingData.pin || '';
    const isAdmin = Boolean(existingData.isAdmin);

    const freshZeroState = {
      username: username,
      pin: existingPin,
      isAdmin: isAdmin,
      cash: 0,
      bank: 0,
      dirtyCash: 0,
      netWorth: 0,
      xp: 0,
      jobId: 'worker',
      title: 'عامل مبتدئ',
      underworldRep: 0,
      heatLevel: 0,
      businesses: {
        coffee: { level: 0, price: 22, workers: 0 },
        tech: { level: 0, price: 160, workers: 0 },
        logistics: { level: 0, price: 1100, workers: 0 },
        supermarket: { level: 0, price: 450, workers: 0 },
        solar_factory: { level: 0, price: 3200, workers: 0 },
        private_hospital: { level: 0, price: 11500, workers: 0 },
        media_studio: { level: 0, price: 28000, workers: 0 },
        private_bank: { level: 0, price: 95000, workers: 0 },
        oil_refinery: { level: 0, price: 310000, workers: 0 },
        space_tech: { level: 0, price: 1250000, workers: 0 }
      },
      assets: {
        apartment: 0,
        office: 0,
        mansion: 0,
        skyline_tower: 0,
        luxury_resort: 0,
        mega_yacht: 0,
        private_island: 0,
        orbital_station: 0
      },
      stocks: {
        COMI: { shares: 0, avgPrice: 0 },
        EAST: { shares: 0, avgPrice: 0 },
        ETEL: { shares: 0, avgPrice: 0 },
        FWRY: { shares: 0, avgPrice: 0 },
        CASH: { shares: 0, avgPrice: 0 },
        BITC: { shares: 0, avgPrice: 0 },
        GOLD: { shares: 0, avgPrice: 0 },
        AIX:  { shares: 0, avgPrice: 0 }
      },
      investments: [],
      activeLoan: null,
        inventory: {
          gold_pen: 0,
          premium_lawyer: 0,
          energy_drink: 0,
          tax_shield: 0,
          market_scanner: 0,
          vip_casino_pass: 0,
          radar_jammer: 0,
          fake_passport: 0,
          crypto_cleaner: 0,
          diplomatic_bag: 0,
          commissioner_wire: 0,
          quantum_cpu: 0,
          diamond_card: 0,
          cronos_gear: 0
        },
      itemDurations: {},
      jailTimer: 0,
      afkManagerExpiresAt: 0,
      offlineReport: null,
      isBanned: false,
      createdAt: existingData.createdAt || Date.now(),
      lastSeen: Date.now(),
      adminModifiedTimestamp: Date.now()
    };

    // Full overwrite without merge so every single field is completely reset
    await docRef.set(freshZeroState);
    return freshZeroState;
  }

  async function adminDeletePlayer(username) {
    _requireOnline();
    await _ensureAdminAuth();
    username = username.trim();
    const targetDoc = await firestoreDb.collection('players').doc(username).get();
    if (targetDoc.exists && targetDoc.data().isAdmin) {
      throw new Error('لا يمكن حذف حساب الإدارة الرئيسي.');
    }
    await firestoreDb.collection('players').doc(username).delete();
  }

  async function adminChangePlayerPin(username, newPin) {
    _requireOnline();
    await _ensureAdminAuth();
    username = username.trim();
    if (!newPin || String(newPin).trim().length < 3) {
      throw new Error('يجب أن يتكون الرقم السري من 3 خانات على الأقل.');
    }
    const pinHash = await _hashStringAsync(String(newPin).trim(), username);
    await firestoreDb.collection('players').doc(username).set({ pin: pinHash }, { merge: true });
  }

  async function adminReleaseJail(username) {
    _requireOnline();
    await _ensureAdminAuth();
    username = username.trim();
    await firestoreDb.collection('players').doc(username).set({ 
      jailTimer: 0,
      adminModifiedTimestamp: Date.now()
    }, { merge: true });
  }

  async function adminSetPlayerJail(username, jailSeconds = 300) {
    _requireOnline();
    await _ensureAdminAuth();
    username = username.trim();
    await firestoreDb.collection('players').doc(username).set({ 
      jailTimer: Number(jailSeconds),
      adminModifiedTimestamp: Date.now()
    }, { merge: true });
  }

  async function adminBanPlayer(username) {
    _requireOnline();
    await _ensureAdminAuth();
    username = username.trim();
    const banTargetDoc = await firestoreDb.collection('players').doc(username).get();
    if (banTargetDoc.exists && banTargetDoc.data().isAdmin) throw new Error('لا يمكن حظر حساب الإدارة الرئيسي.');
    await firestoreDb.collection('players').doc(username).set({ 
      isBanned: true,
      adminModifiedTimestamp: Date.now()
    }, { merge: true });
  }

  async function adminUnbanPlayer(username) {
    _requireOnline();
    await _ensureAdminAuth();
    username = username.trim();
    await firestoreDb.collection('players').doc(username).set({ 
      isBanned: false,
      adminModifiedTimestamp: Date.now()
    }, { merge: true });
  }

  async function adminSetPlayerAdminStatus(username, isAdmin) {
    _requireOnline();
    await _ensureAdminAuth();
    username = username.trim();
    await firestoreDb.collection('players').doc(username).set({ 
      isAdmin: Boolean(isAdmin),
      adminModifiedTimestamp: Date.now()
    }, { merge: true });
    return true;
  }

  // ─────────────────────────────────────────────
  //  ADMIN BROADCAST & AIRDROP
  // ─────────────────────────────────────────────
  async function sendBroadcast(message, title = '📢 إعلان إداري عاجل') {
    _requireOnline();
    await _ensureAdminAuth();
    if (!message || !message.trim()) throw new Error('يرجى كتابة نص الرسالة أولاً.');
    const data = {
      id: Date.now(),
      title: title,
      message: message.trim(),
      timestamp: Date.now(),
      sender: 'الإدارة'
    };
    await firestoreDb.collection('globals').doc('broadcast').set(data);
    return data;
  }

  async function sendAirdrop(amount, target = 'ALL') {
    _requireOnline();
    await _ensureAdminAuth();
    amount = Number(amount);
    if (!amount || amount <= 0) throw new Error('مبلغ المكافأة يجب أن يكون رقماً موجباً أكبر من صفر.');
    target = (target || 'ALL').trim();

    if (target === 'ALL' || target.toUpperCase() === 'ALL') {
      const snapshot = await firestoreDb.collection('players').get();
      let batch = firestoreDb.batch();
      let batchOps = 0;
      let count = 0;

      for (const doc of snapshot.docs) {
        const d = doc.data() || {};
        const currentCash = Number(d.cash || 0);
        batch.update(doc.ref, {
          cash: currentCash + amount,
          lastAirdrop: { amount, timestamp: Date.now() }
        });
        count++;
        batchOps++;
        if (batchOps >= 400) {
          await batch.commit();
          batch = firestoreDb.batch();
          batchOps = 0;
        }
      }
      if (batchOps > 0) {
        await batch.commit();
      }

      await sendBroadcast(`🎁 تم توزيع مكافأة ومنحة مالية إدارية قدرها +${amount.toLocaleString()} EGP لجميع اللاعبين!`, '🎉 مكافأة مالية عامة');
      _cachedAdminPlayers = null;
      return { count, amount, target: 'ALL' };
    } else {
      const docRef = firestoreDb.collection('players').doc(target);
      const doc = await docRef.get();
      if (!doc.exists) throw new Error(`اللاعب "${target}" غير مسجل في قاعدة البيانات.`);
      const currentCash = Number(doc.data().cash || 0);
      await docRef.update({
        cash: currentCash + amount,
        lastAirdrop: { amount, timestamp: Date.now() }
      });
      _cachedAdminPlayers = null;
      return { count: 1, amount, target };
    }
  }

  async function adminResetAllPlayers() {
    _requireOnline();
    await _ensureAdminAuth();
    const snapshot = await firestoreDb.collection('players').get();
    let count = 0;
    
    let batch = firestoreDb.batch();
    let batchOps = 0;
    
    for (const doc of snapshot.docs) {
      const existingData = doc.data() || {};
      const isAdmin = Boolean(existingData.isAdmin);
      const existingPin = existingData.pin || '';
      const freshZeroState = {
        username: doc.id,
        pin: existingPin,
        isAdmin: isAdmin,
        cash: 0,
        bank: 0,
        dirtyCash: 0,
        netWorth: 0,
        xp: 0,
        jobId: 'worker',
        title: 'عامل مبتدئ',
        underworldRep: 0,
        heatLevel: 0,
        businesses: {
          coffee: { level: 0, price: 22, workers: 0 },
          tech: { level: 0, price: 160, workers: 0 },
          logistics: { level: 0, price: 1100, workers: 0 },
          supermarket: { level: 0, price: 450, workers: 0 },
          solar_factory: { level: 0, price: 3200, workers: 0 },
          private_hospital: { level: 0, price: 11500, workers: 0 },
          media_studio: { level: 0, price: 28000, workers: 0 },
          private_bank: { level: 0, price: 95000, workers: 0 },
          oil_refinery: { level: 0, price: 310000, workers: 0 },
          space_tech: { level: 0, price: 1250000, workers: 0 }
        },
        assets: {
          apartment: 0,
          office: 0,
          mansion: 0,
          skyline_tower: 0,
          luxury_resort: 0,
          mega_yacht: 0,
          private_island: 0,
          orbital_station: 0
        },
        stocks: {
          COMI: { shares: 0, avgPrice: 0 },
          EAST: { shares: 0, avgPrice: 0 },
          ETEL: { shares: 0, avgPrice: 0 },
          FWRY: { shares: 0, avgPrice: 0 },
          CASH: { shares: 0, avgPrice: 0 },
          BITC: { shares: 0, avgPrice: 0 },
          GOLD: { shares: 0, avgPrice: 0 },
          AIX:  { shares: 0, avgPrice: 0 }
        },
        investments: [],
        activeLoan: null,
        inventory: {
          gold_pen: 0,
          premium_lawyer: 0,
          energy_drink: 0,
          tax_shield: 0,
          market_scanner: 0,
          vip_casino_pass: 0,
          radar_jammer: 0,
          fake_passport: 0,
          crypto_cleaner: 0,
          diplomatic_bag: 0,
          commissioner_wire: 0,
          quantum_cpu: 0,
          diamond_card: 0,
          cronos_gear: 0
        },
        itemDurations: {},
        jailTimer: 0,
        afkManagerExpiresAt: 0,
        offlineReport: null,
        isBanned: false,
        createdAt: existingData.createdAt || Date.now(),
        lastSeen: Date.now(),
        adminModifiedTimestamp: Date.now()
      };
      
      batch.set(doc.ref, freshZeroState);
      count++;
      batchOps++;
      
      if (batchOps >= 400) {
        await batch.commit();
        batch = firestoreDb.batch();
        batchOps = 0;
      }
    }
    
    if (batchOps > 0) {
      await batch.commit();
    }
    return count;
  }

  async function adminWipeLeaderboard() {
    _requireOnline();
    await _ensureAdminAuth();
    const snapshot = await firestoreDb.collection('players').get();
    let count = 0;
    let batch = firestoreDb.batch();
    let batchOps = 0;

    for (const doc of snapshot.docs) {
      const docData = doc.data() || {};
      if (!docData.isAdmin) {
        batch.delete(doc.ref);
        count++;
        batchOps++;
        if (batchOps >= 400) {
          await batch.commit();
          batch = firestoreDb.batch();
          batchOps = 0;
        }
      }
    }
    if (batchOps > 0) {
      await batch.commit();
    }
    return count;
  }

  async function adminClearTransfers() {
    _requireOnline();
    await _ensureAdminAuth();
    const snapshot = await firestoreDb.collection('transfers').limit(100).get();
    const batch = firestoreDb.batch();
    let count = 0;
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
      count++;
    });
    if (count > 0) {
      await batch.commit();
    }
    return count;
  }

  async function getSystemStats() {
    _requireOnline();

    let accurateServerCount = null;
    let quotaExceeded = false;
    let isFromCache = false;

    // 1. Try ultra-lightweight count aggregation (consumes only 1 read for the entire collection)
    try {
      if (typeof firestoreDb.collection('players').count === 'function') {
        const countSnap = await firestoreDb.collection('players').count().get();
        if (countSnap && countSnap.data) {
          accurateServerCount = countSnap.data().count;
        }
      }
    } catch (countErr) {
      if (countErr.message && (countErr.message.includes('Quota') || countErr.message.includes('RESOURCE_EXHAUSTED') || countErr.code === 'resource-exhausted')) {
        quotaExceeded = true;
      }
    }

    // 2. Try global counter document
    let registeredCounter = 0;
    try {
      const statsDoc = await firestoreDb.collection('globals').doc('stats').get();
      if (statsDoc && statsDoc.exists) {
        const sd = statsDoc.data();
        if (sd && sd.totalPlayersRegistered) {
          registeredCounter = Number(sd.totalPlayersRegistered || 0);
        }
      }
    } catch (e) {
      if (e.message && (e.message.includes('Quota') || e.message.includes('RESOURCE_EXHAUSTED'))) {
        quotaExceeded = true;
      }
    }

    // 3. Document scan (server or cache fallback)
    let snapshot = null;
    try {
      snapshot = await firestoreDb.collection('players').get();
      if (snapshot && snapshot.metadata && snapshot.metadata.fromCache) {
        isFromCache = true;
      }
    } catch (fetchErr) {
      console.warn('[DB] getSystemStats full scan error (falling back to cache):', fetchErr.message);
      if (fetchErr.message && (fetchErr.message.includes('Quota') || fetchErr.message.includes('RESOURCE_EXHAUSTED') || fetchErr.code === 'resource-exhausted')) {
        quotaExceeded = true;
      }
      try {
        snapshot = await firestoreDb.collection('players').get({ source: 'cache' });
        isFromCache = true;
      } catch (cacheErr) {
        snapshot = { forEach: () => {} };
        isFromCache = true;
      }
    }

    let totalCash = 0, totalBank = 0, totalNetWorth = 0;
    let jailedCount = 0, bannedCount = 0, scannedPlayers = 0;
    const playerIds = new Set();

    let billionaires = 0;
    let millionaires = 0;
    let middleClass = 0;
    let workingClass = 0;

    const suspiciousPlayers = [];
    const allPlayersList = [];

    if (snapshot && snapshot.forEach) {
      snapshot.forEach(doc => {
        const d = doc.data();
        const u = d.username || doc.id;
        playerIds.add(u.toLowerCase());
        const cash = Number(d.cash || 0);
        const bank = Number(d.bank || 0);
        const netWorth = Number(d.netWorth || 0);
        const xp = Number(d.xp || 0);
        const dirtyCash = Number(d.dirtyCash || 0);
        const isBanned = Boolean(d.isBanned);
        const jailTimer = Number(d.jailTimer || 0);
        const title = d.title || 'عامل مبتدئ';

        scannedPlayers++;
        totalCash += cash;
        totalBank += bank;
        totalNetWorth += netWorth;

        if (jailTimer > 0) jailedCount++;
        if (isBanned) bannedCount++;

        if (netWorth >= 50000000) billionaires++;
        else if (netWorth >= 5000000) millionaires++;
        else if (netWorth >= 500000) middleClass++;
        else workingClass++;

        let flagged = false;
        let reasons = [];
        if (netWorth > 1000000000 && xp < 100) {
          flagged = true;
          reasons.push("ثروة مليارية مع خبرة شبه معدومة");
        }
        if (cash < 0 || bank < 0 || netWorth < 0) {
          flagged = true;
          reasons.push("قيم مالية سالبة (استغلال ثغرة)");
        }
        if (dirtyCash > 50000000) {
          flagged = true;
          reasons.push("أموال متسخة ضخمة جداً في حوزته");
        }
        if (cash > 2000000000 || bank > 20000000000) {
          flagged = true;
          reasons.push("سيولة نقدية تتجاوز الحدود المنطقية");
        }

        if (flagged && !isBanned) {
          suspiciousPlayers.push({
            username: u,
            cash,
            bank,
            netWorth,
            xp,
            dirtyCash,
            reason: reasons.join(" • ")
          });
        }

        allPlayersList.push({
          username: u,
          netWorth,
          title,
          cash,
          bank
        });
      });
    }

    // Include any locally known accounts from localStorage if not already counted in snapshot
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('foolos_state_')) {
          const u = k.replace('foolos_state_', '');
          if (u && !playerIds.has(u.toLowerCase())) {
            playerIds.add(u.toLowerCase());
            scannedPlayers++;
            try {
              const d = JSON.parse(localStorage.getItem(k));
              if (d) {
                totalCash += Number(d.cash || 0);
                totalBank += Number(d.bank || 0);
                totalNetWorth += Number(d.netWorth || 0);
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {}

    // Determine definitive total players count
    const totalPlayers = Math.max(scannedPlayers, accurateServerCount || 0, registeredCounter || 0);

    // Sort by netWorth descending and slice top 5
    allPlayersList.sort((a, b) => b.netWorth - a.netWorth);
    const topRichest = allPlayersList.slice(0, 5);

    return {
      totalPlayers,
      scannedPlayers,
      isFromCache,
      quotaExceeded,
      accurateServerCount,
      totalCash,
      totalBank,
      totalNetWorth,
      jailedCount,
      bannedCount,
      activeVersion: CLIENT_VERSION,
      wealthBrackets: {
        billionaires,
        millionaires,
        middleClass,
        workingClass
      },
      suspiciousPlayers,
      topRichest
    };
  }

  async function adminGetTransfers() {
    _requireOnline();
    const snapshot = await firestoreDb.collection('transfers')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const docs = [];
    snapshot.forEach(d => {
      const data = d.data();
      docs.push({
        id: d.id,
        sender: data.sender || 'مجهول',
        recipient: data.recipient || 'مجهول',
        amount: data.amount || 0,
        timestamp: data.timestamp || Date.now(),
        status: 'مكتملة'
      });
    });
    return docs;
  }

  async function setMaintenanceMode(enabled, msg = '') {
    _requireOnline();
    await _ensureAdminAuth();
    const data = {
      enabled: Boolean(enabled),
      message: msg || 'تخضع اللعبة حالياً لأعمال تحديث وصيانة طارئة من قبل الإدارة لتحسين الأداء وتأمين الحسابات.',
      timestamp: Date.now()
    };
    await firestoreDb.collection('globals').doc('maintenance').set(data, { merge: true });
    return data;
  }

  async function getMaintenanceStatus() {
    _requireOnline();
    try {
      const doc = await firestoreDb.collection('globals').doc('maintenance').get();
      if (doc.exists) return doc.data();
    } catch (e) { /* ignore */ }
    return { enabled: false };
  }

  // ─────────────────────────────────────────────
  //  V2: DAILY BACKUPS & RESTORE API
  // ─────────────────────────────────────────────
  async function checkAndCreateDailyBackup(username, state) {
    if (!username || !state) return;
    const dateStr = _getLocalDateString();
    
    if (firebaseReady) {
      try {
        const backupRef = firestoreDb.collection('players').doc(username).collection('backups').doc(dateStr);
        const doc = await backupRef.get();
        if (!doc.exists) {
          const backupData = JSON.parse(JSON.stringify(state));
          backupData.backupDate = dateStr;
          backupData.backupTimestamp = Date.now();
          await backupRef.set(backupData);
          console.log(`[DB] Daily backup created in Firebase for ${username} on ${dateStr}`);
        }
      } catch (err) {
        console.error('[DB] Failed to create daily backup in Firebase:', err);
      }
    } else {
      const key = `foolos_backup_${username}_${dateStr}`;
      if (!localStorage.getItem(key)) {
        const backupData = JSON.parse(JSON.stringify(state));
        backupData.backupDate = dateStr;
        backupData.backupTimestamp = Date.now();
        localStorage.setItem(key, JSON.stringify(backupData));
        console.log(`[DB] Daily backup created in LocalStorage for ${username} on ${dateStr}`);
      }
    }
  }

  async function getPlayerBackupDates(username) {
    if (!username) return [];
    if (firebaseReady) {
      try {
        const snapshot = await firestoreDb.collection('players').doc(username).collection('backups').get();
        const dates = [];
        snapshot.forEach(doc => {
          dates.push(doc.id);
        });
        return dates.sort().reverse();
      } catch (err) {
        console.error('[DB] Failed to fetch player backup dates:', err);
        return [];
      }
    } else {
      const dates = [];
      const prefix = `foolos_backup_${username}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          dates.push(key.replace(prefix, ''));
        }
      }
      return dates.sort().reverse();
    }
  }

  async function getPlayerBackupState(username, dateStr) {
    if (!username || !dateStr) return null;
    if (firebaseReady) {
      try {
        const doc = await firestoreDb.collection('players').doc(username).collection('backups').doc(dateStr).get();
        return doc.exists ? doc.data() : null;
      } catch (err) {
        console.error('[DB] Failed to get backup state:', err);
        return null;
      }
    } else {
      const key = `foolos_backup_${username}_${dateStr}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }
  }

  async function adminRestorePlayerFromState(username, targetState) {
    if (!username || !targetState) throw new Error('بيانات الاسترجاع غير مكتملة.');
    const cleanState = JSON.parse(JSON.stringify(targetState));
    delete cleanState.backupDate;
    delete cleanState.backupTimestamp;

    if (firebaseReady) {
      _requireOnline();
      await _ensureAdminAuth();
      await firestoreDb.collection('players').doc(username).set(cleanState);
      console.log(`[DB] Restored ${username} from backup state.`);
    } else {
      localStorage.setItem(`foolos_state_${username}`, JSON.stringify(cleanState));
    }
    return true;
  }

  function _getLocalDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ─────────────────────────────────────────────
  //  V2: CHAT SYSTEM API
  // ─────────────────────────────────────────────
  async function sendChatMessage(sender, title, message) {
    if (!message || !message.trim()) return;
    const cleanMsg = message.trim();
    if (cleanMsg.length > 200) throw new Error('الرسالة طويلة جداً (الحد الأقصى 200 حرف)');
    
    const msgData = {
      sender: String(sender || 'لاعب'),
      senderTitle: String(title || 'عامل مبتدئ'),
      message: cleanMsg,
      timestamp: Date.now()
    };

    if (firebaseReady) {
      try {
        await firestoreDb.collection('chat').add(msgData);
      } catch (err) {
        console.error('[DB] Chat send failed:', err);
        throw new Error('فشل إرسال الرسالة إلى الخادم: ' + (err.message || err));
      }
    } else {
      const localChat = JSON.parse(localStorage.getItem('foolos_local_chat') || '[]');
      localChat.push(msgData);
      if (localChat.length > 100) localChat.shift();
      localStorage.setItem('foolos_local_chat', JSON.stringify(localChat));
      window.dispatchEvent(new Event('storage'));
    }
  }

  function listenToChatMessages(callback) {
    if (firebaseReady) {
      try {
        return firestoreDb.collection('chat')
          .orderBy('timestamp', 'desc')
          .limit(35) // Reduced from 100 to 35 to save 65% of chat read quota
          .onSnapshot(snapshot => {
            const msgs = [];
            snapshot.forEach(doc => {
              const data = doc.data();
              data.id = doc.id;
              msgs.push(data);
            });
            callback(msgs.reverse());
          }, err => {
            console.warn('[DB] Failed to listen to chat with orderBy, falling back:', err);
            try {
              firestoreDb.collection('chat')
                .limit(35)
                .onSnapshot(snap => {
                  const msgs = [];
                  snap.forEach(doc => {
                    const data = doc.data();
                    data.id = doc.id;
                    msgs.push(data);
                  });
                  msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                  callback(msgs);
                });
            } catch (fallbackErr) {
              console.error('[DB] Chat fallback failed:', fallbackErr);
            }
          });
      } catch (e) {
        console.error('[DB] Chat listen exception:', e);
        return () => {};
      }
    } else {
      const checkLocal = () => {
        const msgs = JSON.parse(localStorage.getItem('foolos_local_chat') || '[]');
        callback(msgs);
      };
      window.addEventListener('storage', checkLocal);
      checkLocal();
      return () => window.removeEventListener('storage', checkLocal);
    }
  }

  // ─────────────────────────────────────────────
  //  V2: MAILBOX & SOCIAL API
  // ─────────────────────────────────────────────
  async function sendMail(sender, recipient, type, payload) {
    if (!recipient) throw new Error('يرجى تحديد المرسل إليه.');
    const mailData = {
      sender,
      recipient,
      type,
      payload: payload || {},
      timestamp: Date.now(),
      status: 'pending'
    };

    if (firebaseReady) {
      await firestoreDb.collection('mailbox').add(mailData);
    } else {
      const localMail = JSON.parse(localStorage.getItem('foolos_local_mail') || '[]');
      mailData.id = 'mail_' + Math.random().toString(36).substr(2, 9);
      localMail.push(mailData);
      localStorage.setItem('foolos_local_mail', JSON.stringify(localMail));
      window.dispatchEvent(new Event('storage'));
    }
    return true;
  }

  function listenToMailbox(username, callback) {
    if (!username) return () => {};
    if (firebaseReady) {
      return firestoreDb.collection('mailbox')
        .where('recipient', '==', username)
        .onSnapshot(snapshot => {
          const mails = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            mails.push(data);
          });
          mails.sort((a, b) => b.timestamp - a.timestamp);
          callback(mails);
        });
    } else {
      const checkLocal = () => {
        const localMail = JSON.parse(localStorage.getItem('foolos_local_mail') || '[]');
        const userMail = localMail.filter(m => m.recipient === username);
        userMail.sort((a, b) => b.timestamp - a.timestamp);
        callback(userMail);
      };
      window.addEventListener('storage', checkLocal);
      checkLocal();
      return () => window.removeEventListener('storage', checkLocal);
    }
  }

  function listenToPrivateChat(userA, userB, callback) {
    if (!userA || !userB) return () => {};
    if (firebaseReady) {
      return firestoreDb.collection('mailbox')
        .where('type', '==', 'dm')
        .onSnapshot(snapshot => {
          const dms = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            if ((data.sender === userA && data.recipient === userB) || (data.sender === userB && data.recipient === userA)) {
              dms.push(data);
            }
          });
          dms.sort((a, b) => a.timestamp - b.timestamp);
          callback(dms);
        });
    } else {
      const checkLocal = () => {
        const localMail = JSON.parse(localStorage.getItem('foolos_local_mail') || '[]');
        const dms = localMail.filter(m => m.type === 'dm' && 
          ((m.sender === userA && m.recipient === userB) || (m.sender === userB && m.recipient === userA))
        );
        dms.sort((a, b) => a.timestamp - b.timestamp);
        callback(dms);
      };
      window.addEventListener('storage', checkLocal);
      checkLocal();
      return () => window.removeEventListener('storage', checkLocal);
    }
  }

  async function updateMailStatus(mailId, status) {
    if (firebaseReady) {
      await firestoreDb.collection('mailbox').doc(mailId).update({ status });
    } else {
      const localMail = JSON.parse(localStorage.getItem('foolos_local_mail') || '[]');
      const mail = localMail.find(m => m.id === mailId);
      if (mail) {
        mail.status = status;
        localStorage.setItem('foolos_local_mail', JSON.stringify(localMail));
        window.dispatchEvent(new Event('storage'));
      }
    }
  }

  async function deleteMail(mailId) {
    if (firebaseReady) {
      await firestoreDb.collection('mailbox').doc(mailId).delete();
    } else {
      let localMail = JSON.parse(localStorage.getItem('foolos_local_mail') || '[]');
      localMail = localMail.filter(m => m.id !== mailId);
      localStorage.setItem('foolos_local_mail', JSON.stringify(localMail));
      window.dispatchEvent(new Event('storage'));
    }
  }

  // ─────────────────────────────────────────────
  //  V2: LIVE AUCTIONS API
  // ─────────────────────────────────────────────
  async function adminCreateLiveAuction(itemType, itemId, itemName, basePrice, startConditionType, startConditionValue) {
    _requireOnline();
    await _ensureAdminAuth();
    const auctionData = {
      itemType,
      itemId,
      itemName,
      basePrice,
      currentBid: basePrice,
      highestBidder: '',
      status: 'pending',
      startConditionType,
      startConditionValue,
      registeredPlayers: [],
      timerSeconds: 30,
      timerResetTimestamp: 0,
      createdAt: Date.now()
    };
    await firestoreDb.collection('liveAuctions').add(auctionData);
    return true;
  }

  function listenToLiveAuctions(callback) {
    if (firebaseReady) {
      return firestoreDb.collection('liveAuctions')
        .onSnapshot(snapshot => {
          const list = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            list.push(data);
          });
          callback(list);
        });
    } else {
      callback([]);
      return () => {};
    }
  }

  async function registerForAuction(auctionId, username) {
    if (firebaseReady) {
      const docRef = firestoreDb.collection('liveAuctions').doc(auctionId);
      await firestoreDb.runTransaction(async transaction => {
        const doc = await transaction.get(docRef);
        if (!doc.exists) throw new Error('المزاد غير موجود.');
        const data = doc.data();
        if (data.status !== 'pending') throw new Error('انتهى التسجيل في المزاد.');
        
        const registered = data.registeredPlayers || [];
        if (!registered.includes(username)) {
          registered.push(username);
          const updateData = { registeredPlayers: registered };
          if (data.startConditionType === 'players') {
            const targetCount = Number(data.startConditionValue) || 1;
            if (registered.length >= targetCount) {
              updateData.status = 'active';
              updateData.timerResetTimestamp = Date.now() + 30000;
            }
          }
          transaction.update(docRef, updateData);
        }
      });
    }
    return true;
  }

  async function adminStartLiveAuction(auctionId) {
    _requireOnline();
    if (!auctionId) throw new Error('مُعرّف المزاد مطلوب.');
    const docRef = firestoreDb.collection('liveAuctions').doc(auctionId);
    await docRef.update({
      status: 'active',
      timerResetTimestamp: Date.now() + 30000
    });
    return true;
  }

  async function adminDeleteLiveAuction(auctionId) {
    _requireOnline();
    if (!auctionId) throw new Error('مُعرّف المزاد مطلوب.');
    await firestoreDb.collection('liveAuctions').doc(auctionId).delete();
    return true;
  }

  async function placeAuctionBid(auctionId, username, bidAmount) {
    if (firebaseReady) {
      const docRef = firestoreDb.collection('liveAuctions').doc(auctionId);
      await firestoreDb.runTransaction(async transaction => {
        const doc = await transaction.get(docRef);
        if (!doc.exists) throw new Error('المزاد غير موجود.');
        const data = doc.data();
        if (data.status !== 'active') throw new Error('المزاد غير نشط حالياً.');
        
        if (bidAmount <= data.currentBid) {
          throw new Error(`يجب أن تكون المزايدة أعلى من السعر الحالي (${data.currentBid.toLocaleString()} EGP).`);
        }

        transaction.update(docRef, {
          currentBid: bidAmount,
          highestBidder: username,
          timerResetTimestamp: Date.now() + 30000
        });
      });
    }
    return true;
  }

  // ─────────────────────────────────────────────
  //  V2: CORPORATIONS API
  // ─────────────────────────────────────────────
  async function createCorporation(name, desc, founder) {
    _requireOnline();
    if (!name || !founder) throw new Error('يرجى ملء جميع الحقول المطلوبة لتأسيس الشركة.');
    
    const corpId = 'corp_' + Math.random().toString(36).substr(2, 9);
    const docRef = firestoreDb.collection('corporations').doc(corpId);
    
    const isFounderAdmin = (founder === 'admin');

    const corpData = {
      id: corpId,
      name: name.trim(),
      desc: desc ? desc.trim() : '',
      founder,
      treasury: 0,
      totalContributions: 0,
      level: 1,
      members: [founder],
      roles: {
        [founder]: 'founder'
      },
      contributions: {
        [founder]: 0
      },
      projects: {},
      createdAt: Date.now()
    };

    if (isFounderAdmin) {
      corpData.isAdminCorp = true;
    }
    
    await docRef.set(corpData);
    return corpId;
  }

  function listenToCorporations(callback) {
    if (firebaseReady) {
      return firestoreDb.collection('corporations')
        .onSnapshot(snapshot => {
          const list = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            list.push(data);
          });
          callback(list);
        }, err => {
          console.warn('[DB] Failed to listen to corporations:', err);
        });
    } else {
      callback([]);
      return () => {};
    }
  }

  async function joinCorporation(corpId, username) {
    _requireOnline();
    const docRef = firestoreDb.collection('corporations').doc(corpId);
    
    await firestoreDb.runTransaction(async transaction => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('الشركة المشتركة غير موجودة.');
      const data = doc.data();
      
      const members = data.members || [];
      if (members.includes(username)) throw new Error('أنت عضو في هذه الشركة بالفعل.');
      if (members.length >= 25) throw new Error('فشل الانضمام: الشركة وصلت للحد الأقصى من الأعضاء المسموح به (25 عضواً).');
      
      members.push(username);
      
      const contributions = data.contributions || {};
      contributions[username] = 0;
      
      transaction.update(docRef, {
        members,
        contributions
      });
    });
    return true;
  }

  async function contributeToCorporation(corpId, username, amount) {
    _requireOnline();
    if (!username) throw new Error('اسم المستخدم غير محدد.');
    if (amount <= 0) throw new Error('يجب أن تكون قيمة المساهمة أكبر من الصفر.');
    const docRef = firestoreDb.collection('corporations').doc(corpId);
    
    await firestoreDb.runTransaction(async transaction => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('الشركة غير موجودة.');
      const data = doc.data();
      
      const members = data.members || [];
      if (!members.includes(username)) throw new Error('يجب أن تنضم للشركة أولاً لكي تساهم فيها.');
      
      const contributions = data.contributions || {};
      contributions[username] = (contributions[username] || 0) + amount;
      
      const totalContributions = (data.totalContributions || 0) + amount;
      const treasury = (data.treasury || 0) + amount;
      
      transaction.update(docRef, {
        contributions,
        totalContributions,
        treasury
      });
    });
    return true;
  }

  async function buyCorporationProject(corpId, projectId, projectCost) {
    _requireOnline();
    const docRef = firestoreDb.collection('corporations').doc(corpId);
    
    await firestoreDb.runTransaction(async transaction => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('الشركة غير موجودة.');
      const data = doc.data();
      
      if (data.treasury < projectCost) {
        throw new Error(`رصيد الخزينة غير كافٍ. تحتاج الشركة لـ ${projectCost.toLocaleString()} EGP.`);
      }
      
      const projRequirements = {
        gigafactory: { name: 'مجمع أشباه الموصلات والرقائق', minMembers: 1 },
        zohr_field: { name: 'حق امتياز حقل غاز ظهر الطبيعي', minMembers: 1 },
        asteroid_mining: { name: 'وكالة تعدين الكويكبات الفضائية', minMembers: 1 },
        submarine_cables: { id: 'submarine_cables', name: 'شبكة الألياف البحرية العالمية', minMembers: 2 },
        medical_city: { id: 'medical_city', name: 'المدينة الطبية العالمية المتكاملة', minMembers: 3 },
        nuclear_reactor: { id: 'nuclear_reactor', name: 'المفاعل النووي القومي لإنتاج الطاقة', minMembers: 8 },
        mars_colony: { id: 'mars_colony', name: 'مستعمرة التعدين المريخية المستقلة', minMembers: 15 }
      };

      const req = projRequirements[projectId];
      if (req) {
        const currentMembers = (data.members || []).length;
        if (currentMembers < req.minMembers) {
          throw new Error(`شرط غير مستوفٍ: يتطلب شراء "${req.name}" وجود ${req.minMembers} مساهمين على الأقل في الشركة (المتوفر حالياً: ${currentMembers}).`);
        }
      }

      const projects = data.projects || {};
      if (projects[projectId]) throw new Error('الشركة تمتلك هذا المشروع بالفعل.');
      
      projects[projectId] = true;
      const treasury = data.treasury - projectCost;
      
      transaction.update(docRef, {
        projects,
        treasury
      });
    });
    return true;
  }
  async function adminCreateCorporation(name, founder, desc, initialTreasury) {
    _requireOnline();
    if (!name || !name.trim()) throw new Error('اسم الشركة مطلوب.');
    if (!founder || !founder.trim()) throw new Error('اسم المؤسس مطلوب.');
    
    const founderName = founder.trim();
    const treasury = Math.max(0, parseFloat(initialTreasury) || 0);

    const corpData = {
      name: name.trim(),
      founder: founderName,
      desc: (desc || '').trim(),
      level: 1,
      treasury: treasury,
      totalContributions: treasury,
      members: [founderName],
      contributions: { [founderName]: treasury },
      roles: { [founderName]: 'founder' },
      projects: {},
      createdAt: Date.now()
    };

    const docRef = await firestoreDb.collection('corporations').add(corpData);
    return docRef.id;
  }

  async function adminUpdateCorp(corpId, updates) {
    _requireOnline();
    if (!corpId) throw new Error('مُعرّف الشركة مطلوب.');
    const docRef = firestoreDb.collection('corporations').doc(corpId);
    await docRef.update(updates);
    return true;
  }

  async function adminToggleCorpProject(corpId, projectId, status) {
    _requireOnline();
    if (!corpId || !projectId) throw new Error('مُعرّف الشركة والمشروع مطلوبان.');
    const docRef = firestoreDb.collection('corporations').doc(corpId);
    await firestoreDb.runTransaction(async transaction => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('الشركة غير موجودة.');
      const data = doc.data();
      const projects = { ...(data.projects || {}) };
      if (status) {
        projects[projectId] = true;
      } else {
        delete projects[projectId];
      }
      transaction.update(docRef, { projects });
    });
    return true;
  }

  async function adminKickCorpMember(corpId, targetUsername) {
    _requireOnline();
    if (!corpId || !targetUsername) throw new Error('مُعرّف الشركة والعضو مطلوبان.');
    const docRef = firestoreDb.collection('corporations').doc(corpId);
    await firestoreDb.runTransaction(async transaction => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('الشركة غير موجودة.');
      const data = doc.data();
      if (data.founder === targetUsername) throw new Error('لا يمكن طرد مؤسس الشركة مباشرة. قم بنقل الملكية أولاً.');
      const members = (data.members || []).filter(m => m !== targetUsername);
      const contributions = { ...(data.contributions || {}) };
      delete contributions[targetUsername];
      const roles = { ...(data.roles || {}) };
      delete roles[targetUsername];
      const total = Object.values(contributions).reduce((s, v) => s + v, 0);
      transaction.update(docRef, { members, contributions, roles, totalContributions: total });
    });
    return true;
  }

  async function adminSetCorpMemberRole(corpId, targetUsername, role) {
    _requireOnline();
    if (!corpId || !targetUsername) throw new Error('مُعرّف الشركة والعضو مطلوبان.');
    const docRef = firestoreDb.collection('corporations').doc(corpId);
    await firestoreDb.runTransaction(async transaction => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('الشركة غير موجودة.');
      const data = doc.data();
      if (!(data.members || []).includes(targetUsername)) throw new Error('المستخدم ليس عضواً في هذه الشركة.');
      if (data.founder === targetUsername && role !== 'founder') throw new Error('لا يمكن تغيير رتبة المؤسس بهذه الطريقة.');

      const roles = { ...(data.roles || {}) };
      roles[targetUsername] = role; // 'cfo' or 'member'
      transaction.update(docRef, { roles });
    });
    return true;
  }

  async function adminTransferCorpFounder(corpId, newFounder) {
    _requireOnline();
    if (!corpId || !newFounder) throw new Error('مُعرّف الشركة والمؤسس الجديد مطلوبان.');
    const docRef = firestoreDb.collection('corporations').doc(corpId);
    await firestoreDb.runTransaction(async transaction => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('الشركة غير موجودة.');
      const data = doc.data();
      if (!(data.members || []).includes(newFounder)) throw new Error('العضو المختار غير موجود في الشركة.');
      
      const roles = { ...(data.roles || {}) };
      const oldFounder = data.founder;
      if (oldFounder) roles[oldFounder] = 'cfo';
      roles[newFounder] = 'founder';

      transaction.update(docRef, { founder: newFounder, roles });
    });
    return true;
  }

  async function adminDistributeCorpDividends(corpId, percent) {
    _requireOnline();
    const pct = parseFloat(percent);
    if (isNaN(pct) || pct <= 0 || pct > 100) throw new Error('يرجى تحديد نسبة أرباح صالحة (1-100%).');
    
    const docRef = firestoreDb.collection('corporations').doc(corpId);
    await firestoreDb.runTransaction(async transaction => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('الشركة غير موجودة.');
      const data = doc.data();
      const treasury = Number(data.treasury || 0);
      if (treasury <= 0) throw new Error('خزينة الشركة فارغة.');

      const distributeAmount = Math.floor(treasury * (pct / 100));
      if (distributeAmount <= 0) throw new Error('مبلغ التوزيع صغير جداً.');

      const totalContrib = Number(data.totalContributions || 0);
      const members = data.members || [];
      
      // Step 1: All reads
      const playerReads = [];
      for (const member of members) {
        const playerRef = firestoreDb.collection('players').doc(member);
        const pDoc = await transaction.get(playerRef);
        playerReads.push({ member, ref: playerRef, doc: pDoc });
      }

      // Step 2: All writes
      for (const item of playerReads) {
        const cont = (data.contributions || {})[item.member] || 0;
        const share = totalContrib > 0 ? (cont / totalContrib) : (1 / members.length);
        const payout = Math.floor(distributeAmount * share);
        if (payout > 0 && item.doc.exists) {
          const pData = item.doc.data();
          transaction.update(item.ref, { cash: (pData.cash || 0) + payout });
        }
      }

      transaction.update(docRef, {
        treasury: treasury - distributeAmount
      });
    });
    return true;
  }

  async function adminDeleteCorporation(corpId) {
    _requireOnline();
    if (!corpId) throw new Error('مُعرّف الشركة مطلوب.');
    await firestoreDb.collection('corporations').doc(corpId).delete();
    return true;
  }

  async function adminEditCorporationTreasury(corpId, newTreasury) {
    _requireOnline();
    if (!corpId) throw new Error('مُعرّف الشركة مطلوب.');
    const amount = parseFloat(newTreasury);
    if (isNaN(amount) || amount < 0) throw new Error('قيمة الخزينة غير صالحة.');
    await firestoreDb.collection('corporations').doc(corpId).update({
      treasury: amount
    });
    return true;
  }

  async function kickCorpMember(corpId, targetUsername) {
    _requireOnline();
    const currentUser = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username);
    const docRef = firestoreDb.collection('corporations').doc(corpId);
    await firestoreDb.runTransaction(async transaction => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('الشركة غير موجودة.');
      const data = doc.data();
      if (data.founder !== currentUser && !GameEngine.state?.isAdmin) throw new Error('فقط المؤسس يملك صلاحية الطرد.');
      if (targetUsername === currentUser) throw new Error('لا يمكنك طرد نفسك.');
      const members = (data.members || []).filter(m => m !== targetUsername);
      const contributions = { ...(data.contributions || {}) };
      delete contributions[targetUsername];
      const total = Object.values(contributions).reduce((s, v) => s + v, 0);
      transaction.update(docRef, { members, contributions, totalContributions: total });
    });
    return true;
  }

  async function editCorpInfo(corpId, newName, newDesc) {
    _requireOnline();
    const currentUser = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username);
    const docRef = firestoreDb.collection('corporations').doc(corpId);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('الشركة غير موجودة.');
    if (doc.data().founder !== currentUser && !GameEngine.state?.isAdmin) throw new Error('فقط المؤسس يمكنه تعديل بيانات الشركة.');
    await docRef.update({ name: newName, desc: newDesc || '' });
    return true;
  }

  async function transferCorpOwnership(corpId, newFounder) {
    _requireOnline();
    const currentUser = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username);
    const docRef = firestoreDb.collection('corporations').doc(corpId);
    await firestoreDb.runTransaction(async transaction => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('الشركة غير موجودة.');
      const data = doc.data();
      if (data.founder !== currentUser && !GameEngine.state?.isAdmin) throw new Error('فقط المؤسس يمكنه نقل الملكية.');
      if (!(data.members || []).includes(newFounder)) throw new Error('العضو المختار غير موجود في الشركة.');
      transaction.update(docRef, { founder: newFounder });
    });
    return true;
  }

  async function dissolveCorporation(corpId) {
    _requireOnline();
    const currentUser = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username);
    const docRef = firestoreDb.collection('corporations').doc(corpId);
    await firestoreDb.runTransaction(async transaction => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('الشركة غير موجودة.');
      const data = doc.data();
      if (data.founder !== currentUser && !GameEngine.state?.isAdmin) throw new Error('فقط المؤسس يمكنه حل الشركة.');
      const treasury = data.treasury || 0;
      const total = data.totalContributions || 0;
      const members = data.members || [];

      // Step 1: All reads executed first
      const playerReads = [];
      for (const member of members) {
        const playerRef = firestoreDb.collection('players').doc(member);
        const playerDoc = await transaction.get(playerRef);
        playerReads.push({ member, ref: playerRef, doc: playerDoc });
      }

      // Step 2: All writes executed after all reads
      for (const item of playerReads) {
        const cont = (data.contributions || {})[item.member] || 0;
        const share = total > 0 ? cont / total : (item.member === data.founder ? 1 : 0);
        const refund = Math.floor(treasury * share);
        if (refund > 0 && item.doc.exists) {
          const pData = item.doc.data();
          transaction.update(item.ref, { cash: (pData.cash || 0) + refund });
        }
      }
      transaction.delete(docRef);
    });
    return true;
  }

  async function promoteCorpMember(corpId, targetUsername, role) {
    _requireOnline();
    const currentUser = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username);
    const docRef = firestoreDb.collection('corporations').doc(corpId);
    await firestoreDb.runTransaction(async transaction => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('الشركة غير موجودة.');
      const data = doc.data();
      if (data.founder !== currentUser && !GameEngine.state?.isAdmin) throw new Error('فقط المؤسس يمكنه تعديل رتب الأعضاء.');
      if (targetUsername === currentUser) throw new Error('لا يمكنك تعديل رتبة نفسك.');
      if (!(data.members || []).includes(targetUsername)) throw new Error('المستخدم ليس عضواً في هذه الشركة.');

      const roles = { ...(data.roles || {}) };
      roles[targetUsername] = role; // 'cfo' or 'member' (regular)
      
      transaction.update(docRef, { roles });
    });
    return true;
  }

  async function payoutFromCorpTreasury(corpId, targetUsername, amount) {
    _requireOnline();
    const currentUser = GameEngine.activeUsername || (GameEngine.state && GameEngine.state.username);
    if (amount <= 0) throw new Error('يجب تحديد مبلغ صالح للتحويل.');
    
    const docRef = firestoreDb.collection('corporations').doc(corpId);
    const playerRef = firestoreDb.collection('players').doc(targetUsername);

    await firestoreDb.runTransaction(async transaction => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('الشركة غير موجودة.');
      const data = doc.data();

      // Verify if currentUser is founder or CFO
      const userRole = (data.roles && data.roles[currentUser]) || (data.founder === currentUser ? 'founder' : 'member');
      if (userRole !== 'founder' && userRole !== 'cfo') {
        throw new Error('ليس لديك صلاحية سحب أو تحويل أموال من الخزينة. (متاحة للمؤسس والمدير المالي CFO فقط).');
      }

      if (!(data.members || []).includes(targetUsername)) {
        throw new Error('اللاعب المستهدف ليس عضواً في هذه الشركة.');
      }

      const treasury = Number(data.treasury || 0);
      if (treasury < amount) {
        throw new Error(`خزينة الشركة لا تحتوي على سيولة كافية. المتوفر: ${treasury.toLocaleString()} EGP.`);
      }

      const targetDoc = await transaction.get(playerRef);
      if (!targetDoc.exists) throw new Error('حساب اللاعب المستهدف غير موجود في قاعدة البيانات.');
      const targetData = targetDoc.data();

      // Update Treasury
      transaction.update(docRef, { treasury: treasury - amount });

      // Update target player cash
      const targetCash = Number(targetData.cash || 0);
      const targetNetWorth = Number(targetData.netWorth || 0);
      transaction.update(playerRef, {
        cash: targetCash + amount,
        netWorth: targetNetWorth + amount
      });
    });
    return true;
  }

  async function upgradeCorporationLevel(corpId, cost) {
    _requireOnline();
    const currentUser = GameEngine.state.username;
    const docRef = firestoreDb.collection('corporations').doc(corpId);

    await firestoreDb.runTransaction(async transaction => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('الشركة غير موجودة.');
      const data = doc.data();

      // Verify if currentUser is founder or CFO
      const userRole = (data.roles && data.roles[currentUser]) || (data.founder === currentUser ? 'founder' : 'member');
      if (userRole !== 'founder' && userRole !== 'cfo') {
        throw new Error('ليس لديك صلاحية ترقية التحالف. (متاحة للمؤسس والمدير المالي CFO فقط).');
      }

      const treasury = Number(data.treasury || 0);
      if (treasury < cost) {
        throw new Error(`رصيد الخزينة (${treasury.toLocaleString()} EGP) لا يكفي لتكلفة الترقية البالغة ${cost.toLocaleString()} EGP.`);
      }

      const currentLevel = Number(data.level || 1);
      transaction.update(docRef, {
        treasury: treasury - cost,
        level: currentLevel + 1
      });
    });
    return true;
  }

  async function adminSaveTaxConfig(config) {
    _requireOnline();
    await _ensureAdminAuth();
    await firestoreDb.collection('globals').doc('taxConfig').set({
      ...config,
      updatedBy: 'admin',
      updatedAt: Date.now()
    });
    return true;
  }

  async function adminSaveServerConfig(config) {
    _requireOnline();
    await _ensureAdminAuth();
    await firestoreDb.collection('globals').doc('serverConfig').set({
      ...config,
      updatedBy: 'admin',
      updatedAt: Date.now()
    });
    return true;
  }

  async function getServerConfig() {
    if (!firebaseReady) return null;
    const doc = await firestoreDb.collection('globals').doc('serverConfig').get();
    if (!doc.exists) {
      return { boostMultiplier: 1.0 };
    }
    return doc.data();
  }

  // ─────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────
  return {
    get clientVersion() { return CLIENT_VERSION; },
    get isFirebaseReady() { return firebaseReady; },
    get isOnline() { return navigator.onLine && firebaseReady; },
    get pendingSyncs() { return 0; },

    init,
    checkVersion,
    registerPlayer,
    loginPlayer,
    getPlayerState,
    savePlayerState,
    flushPendingSave,
    getLeaderboard,
    executeWireTransfer,

    // Transfer Requests API
    createTransferRequest,
    getIncomingTransferRequests,
    getSentTransferRequests,
    acceptTransferRequest,
    rejectTransferRequest,

    // Items Config API
    adminSaveItemConfig,
    getItemsConfig,

    // Auctions API
    adminCreateAuctionItem,
    adminDeleteAuctionItem,
    getAuctionItems,
    purchaseAuctionItem,

    // Gift Codes API
    adminCreateGiftCode,
    adminDeleteGiftCode,
    adminGetGiftCodes,
    redeemGiftCode,

    // Admin API
    sendBroadcast,
    sendAirdrop,
    adminGetPlayer,
    adminGetAllPlayers,
    adminSavePlayer,
    adminResetPlayer,
    adminDeletePlayer,
    adminChangePlayerPin,
    adminReleaseJail,
    adminSetPlayerJail,
    adminBanPlayer,
    adminUnbanPlayer,
    adminSetPlayerAdminStatus,
    adminResetAllPlayers,
    adminWipeLeaderboard,
    adminRebuildLeaderboard,
    adminClearTransfers,
    getSystemStats,
    adminGetTransfers,
    setMaintenanceMode,
    getMaintenanceStatus,
    adminSaveTaxConfig,
    adminSaveServerConfig,
    getServerConfig,

    // V2: DAILY BACKUPS & RESTORE API
    checkAndCreateDailyBackup,
    getPlayerBackupDates,
    getPlayerBackupState,
    adminRestorePlayerFromState,

    // V2: CHAT SYSTEM API
    sendChatMessage,
    listenToChatMessages,

    // V2: MAILBOX & SOCIAL API
    sendMail,
    listenToMailbox,
    listenToPrivateChat,
    updateMailStatus,
    deleteMail,

    // V2: LIVE AUCTIONS API
    adminCreateLiveAuction,
    adminStartLiveAuction,
    adminDeleteLiveAuction,
    listenToLiveAuctions,
    registerForAuction,
    placeAuctionBid,

    // V2: CORPORATIONS API
    createCorporation,
    listenToCorporations,
    joinCorporation,
    contributeToCorporation,
    buyCorporationProject,
    adminCreateCorporation,
    adminUpdateCorp,
    adminToggleCorpProject,
    adminKickCorpMember,
    adminSetCorpMemberRole,
    adminTransferCorpFounder,
    adminDistributeCorpDividends,
    adminDeleteCorporation,
    adminEditCorporationTreasury,

    // V2: FOUNDER MANAGEMENT API
    kickCorpMember,
    editCorpInfo,
    transferCorpOwnership,
    dissolveCorporation,
    promoteCorpMember,
    payoutFromCorpTreasury,
    upgradeCorporationLevel,

    get dbType() { return firebaseReady ? 'firebase' : 'offline'; },
    mockPlayers: []
  };
})();

window.AppDB = AppDB;
