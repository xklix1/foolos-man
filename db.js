/**
 * Foolos Man Tycoon (فلوس مان تايكون)
 * Database Adapter v8 (db.js)
 *
 * Architecture:
 *  - LOCAL-FIRST: All reads/writes go to localStorage immediately — never blocks on network.
 *  - BACKGROUND SYNC: When online, silently push local state to Firestore.
 *  - OFFLINE RESILIENT: Firebase errors are swallowed; game always continues from local data.
 *  - VERSION CHECK: Exposes checkVersion() for the UI to enforce force-updates.
 */

const AppDB = (() => {
  // ─────────────────────────────────────────────
  //  CONSTANTS
  // ─────────────────────────────────────────────
  const CLIENT_VERSION = '9';           // Must match the latest deployed version
  const REMOTE_VERSION_KEY = 'foolos_remote_version'; // localStorage mirror of remote version

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyC7KRj3-t_03HLMzJ10miVhdKWCpabPQB4",
    authDomain: "foolos-man.firebaseapp.com",
    projectId: "foolos-man",
    storageBucket: "foolos-man.firebasestorage.app",
    messagingSenderId: "426833341092",
    appId: "1:426833341092:web:141a51c22d8b1afc621431",
    measurementId: "G-54ZC388NW1"
  };

  // Mock leaderboard players disabled (empty array)
  const DEFAULT_MOCK_PLAYERS = [];

  // ─────────────────────────────────────────────
  //  STATE
  // ─────────────────────────────────────────────
  let firestoreDb = null;     // Firestore instance — null until Firebase loads
  let firebaseReady = false;  // True once Firestore is connected and ready
  let syncQueue = [];         // Pending sync ops queued while offline: [{type, username, data}]
  let syncInProgress = false;
  let onlineListenersAttached = false;

  // Secret Admin Credentials Configuration
  const SECRET_ADMIN_USERNAME = 'FoolosAdmin_X99';
  const SECRET_ADMIN_PIN = '987654';

  // ─────────────────────────────────────────────
  //  INIT — non-blocking, never throws
  // ─────────────────────────────────────────────
  async function init() {
    // Seed pre-created secure Admin Account automatically if missing
    const registered = JSON.parse(localStorage.getItem('foolos_registered_sim') || '{}');
    if (!registered[SECRET_ADMIN_USERNAME]) {
      registered[SECRET_ADMIN_USERNAME] = {
        username: SECRET_ADMIN_USERNAME,
        pin: SECRET_ADMIN_PIN,
        netWorth: 100000000, // 100M EGP initial admin wealth
        isAdmin: true,
        createdAt: Date.now(),
        lastSeen: Date.now()
      };
      localStorage.setItem('foolos_registered_sim', JSON.stringify(registered));

      // Seed initial admin game state if missing
      if (!localStorage.getItem(`foolos_player_${SECRET_ADMIN_USERNAME}`)) {
        const adminInitialState = {
          cash: 50000000,
          bank: 50000000,
          xp: 10000,
          jobId: 'ceo',
          businesses: { coffee: { level: 5, price: 18, workers: 10 }, tech: { level: 5, price: 140, workers: 10 }, logistics: { level: 5, price: 950, workers: 10 } },
          investments: [],
          assets: { apartment: 5, office: 3, mansion: 2 },
          stocks: { COMI: { shares: 1000, avgPrice: 30 }, EAST: { shares: 1000, avgPrice: 70 }, ETEL: { shares: 1000, avgPrice: 40 }, FWRY: { shares: 1000, avgPrice: 80 }, CASH: { shares: 1000, avgPrice: 100 } },
          inventory: { gold_pen: 5, premium_lawyer: 5 },
          jailTimer: 0,
          netWorth: 100000000,
          title: 'إمبراطور المال والفلوس'
        };
        localStorage.setItem(`foolos_player_${SECRET_ADMIN_USERNAME}`, JSON.stringify(adminInitialState));
      }
    }

    // Try to connect Firebase in the background — game is already playable regardless
    _tryConnectFirebase();

    // Attach connectivity listeners once
    _attachConnectivityListeners();

    console.log('[DB] Local-first database initialized. Game is ready.');
    return true;
  }

  // ─────────────────────────────────────────────
  //  FIREBASE CONNECTION (background, non-blocking)
  // ─────────────────────────────────────────────
  async function _tryConnectFirebase() {
    if (!navigator.onLine || !window.firebase) return;

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      firestoreDb = firebase.firestore();

      // Try to enable offline persistence (best-effort)
      try {
        await firestoreDb.enablePersistence({ synchronizeTabs: true });
      } catch (e) {
        // Persistence may fail in certain environments — not critical
      }

      firebaseReady = true;
      console.log('[DB] Firebase Firestore connected.');

      // Immediately flush any queued sync ops
      _flushSyncQueue();
    } catch (err) {
      console.warn('[DB] Firebase connection failed. Continuing in local-only mode.', err.message);
      firebaseReady = false;
    }
  }

  // ─────────────────────────────────────────────
  //  CONNECTIVITY LISTENERS
  // ─────────────────────────────────────────────
  function _attachConnectivityListeners() {
    if (onlineListenersAttached) return;
    onlineListenersAttached = true;

    window.addEventListener('online', async () => {
      console.log('[DB] Network restored. Attempting background sync...');
      if (!firebaseReady) {
        await _tryConnectFirebase();
      } else {
        _flushSyncQueue();
      }

      // Notify the UI layer that we're back online
      window.dispatchEvent(new CustomEvent('foolos:online'));
    });

    window.addEventListener('offline', () => {
      console.log('[DB] Network lost. Switching to local-only mode.');
      firebaseReady = false;
      window.dispatchEvent(new CustomEvent('foolos:offline'));
    });
  }

  // ─────────────────────────────────────────────
  //  SYNC QUEUE — flush when back online
  // ─────────────────────────────────────────────
  function _queueSync(type, username, data) {
    // Deduplicate: replace existing entry for same user+type
    syncQueue = syncQueue.filter(op => !(op.type === type && op.username === username));
    syncQueue.push({ type, username, data, queuedAt: Date.now() });
  }

  async function _flushSyncQueue() {
    if (syncInProgress || !firebaseReady || syncQueue.length === 0) return;
    syncInProgress = true;

    const batch = [...syncQueue];
    syncQueue = [];

    for (const op of batch) {
      try {
        if (op.type === 'savePlayerState') {
          await _firebaseSaveState(op.username, op.data);
        } else if (op.type === 'updateLeaderboard') {
          await _firebaseUpdateLeaderboard(op.username, op.data);
        }
      } catch (err) {
        // Re-queue failed ops
        console.warn('[DB] Sync op failed, re-queuing:', op.type, err.message);
        syncQueue.push(op);
      }
    }

    syncInProgress = false;
    if (syncQueue.length > 0) {
      console.log(`[DB] ${syncQueue.length} sync op(s) still pending.`);
    }
  }

  // ─────────────────────────────────────────────
  //  FIREBASE WRITE HELPERS (internal)
  // ─────────────────────────────────────────────
  async function _firebaseSaveState(username, state) {
    if (!firestoreDb) return;
    const ref = firestoreDb.collection('players').doc(username);
    await ref.set(state, { merge: true });
  }

  async function _firebaseUpdateLeaderboard(username, data) {
    if (!firestoreDb) return;
    const ref = firestoreDb.collection('players').doc(username);
    await ref.set({
      username,
      netWorth: data.netWorth,
      title: data.title,
      lastSeen: Date.now()
    }, { merge: true });
  }

  // ─────────────────────────────────────────────
  //  VERSION CHECK
  // ─────────────────────────────────────────────
  /**
   * Checks whether the running client is up-to-date.
   * Strategy:
   *   1. If online, fetch version from Firestore globals/config (best-effort).
   *   2. Fall back to a locally cached remote version.
   *   3. Compare against CLIENT_VERSION.
   * Returns: { upToDate: boolean, clientVersion, remoteVersion }
   */
  async function checkVersion() {
    let remoteVersion = CLIENT_VERSION; // Assume up-to-date if we can't fetch

    if (firebaseReady && firestoreDb) {
      try {
        const doc = await firestoreDb.collection('globals').doc('config').get();
        if (doc.exists && doc.data().version) {
          remoteVersion = String(doc.data().version);
          // Cache the fetched version locally
          localStorage.setItem(REMOTE_VERSION_KEY, remoteVersion);
        }
      } catch (err) {
        // Couldn't fetch remote version; fall back to cached
        const cached = localStorage.getItem(REMOTE_VERSION_KEY);
        if (cached) remoteVersion = cached;
      }
    } else {
      // Offline: use cached remote version if available
      const cached = localStorage.getItem(REMOTE_VERSION_KEY);
      if (cached) remoteVersion = cached;
    }

    return {
      upToDate: CLIENT_VERSION >= remoteVersion,
      clientVersion: CLIENT_VERSION,
      remoteVersion
    };
  }

  // Helper: Secure hash string for PIN and Integrity Validation
  function _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(36);
  }

  // ─────────────────────────────────────────────
  //  AUTH — REGISTER
  // ─────────────────────────────────────────────
  async function registerPlayer(username, pin) {
    if (!username || !pin) throw new Error("يرجى إدخال اسم المستخدم والرقم السري.");
    username = username.trim();

    // Prevent public creation of admin accounts or reserved keywords
    if (username.toLowerCase().includes('admin') || username === SECRET_ADMIN_USERNAME) {
      throw new Error("اسم المستخدم هذا محظور ومحمي. يرجى اختيار اسم مستخدم عادي.");
    }

    const isAdmin = false; // Public users can never register as admin

    // LOCAL WRITE FIRST — never blocks
    const registered = JSON.parse(localStorage.getItem('foolos_registered_sim') || '{}');
    if (registered[username]) {
      throw new Error("اسم المستخدم هذا مسجل بالفعل. يرجى اختيار اسم آخر.");
    }

    const pinHash = _hashString(pin);
    const data = {
      username,
      pin: pinHash,
      netWorth: 5000,
      isAdmin,
      createdAt: Date.now(),
      lastSeen: Date.now()
    };

    registered[username] = data;
    localStorage.setItem('foolos_registered_sim', JSON.stringify(registered));

    // BACKGROUND SYNC to Firestore
    if (firebaseReady) {
      try {
        const ref = firestoreDb.collection('players').doc(username);
        const doc = await ref.get();
        if (!doc.exists) {
          await ref.set(data);
        }
      } catch (err) {
        _queueSync('savePlayerState', username, data);
      }
    } else {
      _queueSync('savePlayerState', username, data);
    }

    return data;
  }

  // ─────────────────────────────────────────────
  //  AUTH — LOGIN
  // ─────────────────────────────────────────────
  async function loginPlayer(username, pin) {
    if (!username || !pin) throw new Error("يرجى إدخال اسم المستخدم والرقم السري.");
    username = username.trim();

    const pinHash = _hashString(pin);
    const registered = JSON.parse(localStorage.getItem('foolos_registered_sim') || '{}');

    // Secret Admin Bypass check
    if (username === SECRET_ADMIN_USERNAME && (pin === SECRET_ADMIN_PIN || pinHash === registered[SECRET_ADMIN_USERNAME]?.pin)) {
      return registered[SECRET_ADMIN_USERNAME];
    }

    if (registered[username]) {
      // Found locally — validate pin hash
      if (registered[username].pin !== pinHash && registered[username].pin !== pin) {
        throw new Error("الرقم السري غير صحيح. يرجى المحاولة مرة أخرى.");
      }
      return registered[username];
    }

    // Not found locally — try Firestore if online
    if (firebaseReady && firestoreDb) {
      try {
        const ref = firestoreDb.collection('players').doc(username);
        const doc = await ref.get();
        if (!doc.exists) throw new Error("اسم المستخدم غير موجود. يرجى التسجيل أولاً.");
        const data = doc.data();
        if (data.pin !== pinHash && data.pin !== pin) throw new Error("الرقم السري غير صحيح. يرجى المحاولة مرة أخرى.");

        // Cache the user locally for future offline logins
        registered[username] = { username, pin: pinHash, netWorth: data.netWorth || 5000, isAdmin: data.isAdmin || false };
        localStorage.setItem('foolos_registered_sim', JSON.stringify(registered));

        return data;
      } catch (err) {
        if (err.message.includes('غير موجود') || err.message.includes('غير صحيح')) throw err;
        throw new Error("خطأ في الاتصال. تحقق من اتصالك بالإنترنت وحاول مجدداً.");
      }
    }

    throw new Error("اسم المستخدم غير موجود. يرجى التسجيل أولاً.");
  }

  // ─────────────────────────────────────────────
  //  GET PLAYER STATE
  // ─────────────────────────────────────────────
  async function getPlayerState(username) {
    // LOCAL FIRST — always return local data immediately
    const localKey = `foolos_state_${username}`;
    const localData = localStorage.getItem(localKey);
    const localState = localData ? JSON.parse(localData) : null;

    // Background: attempt to pull a fresher copy from Firestore if online
    // (Only used if no local data exists, e.g. first login on a new device)
    if (!localState && firebaseReady && firestoreDb) {
      try {
        const ref = firestoreDb.collection('players').doc(username);
        const doc = await ref.get();
        if (doc.exists) {
          const remoteState = doc.data();
          localStorage.setItem(localKey, JSON.stringify(remoteState));
          return remoteState;
        }
      } catch (err) {
        // Firebase read failed — return null and let game create fresh state
      }
    }

    return localState;
  }

  // ─────────────────────────────────────────────
  //  SAVE PLAYER STATE — LOCAL FIRST, THEN SYNC
  // ─────────────────────────────────────────────
  async function savePlayerState(username, state) {
    if (!username) return;

    state.username = username;
    state.lastSeen = Date.now();

    // 1. WRITE TO LOCAL STORAGE IMMEDIATELY (synchronous, never fails)
    localStorage.setItem(`foolos_state_${username}`, JSON.stringify(state));

    // 2. UPDATE LOCAL LEADERBOARD
    _updateLocalLeaderboard(username, state.netWorth, state.title || 'عامل مبتدئ');

    // 3. BACKGROUND SYNC TO FIREBASE
    if (firebaseReady && firestoreDb) {
      try {
        await _firebaseSaveState(username, state);
      } catch (err) {
        // Queue for later retry on reconnect
        _queueSync('savePlayerState', username, state);
      }
    } else {
      // Not online — queue for sync when back online
      _queueSync('savePlayerState', username, state);
    }
  }

  // ─────────────────────────────────────────────
  //  LOCAL LEADERBOARD
  // ─────────────────────────────────────────────
  function _updateLocalLeaderboard(username, netWorth, title) {
    let board = JSON.parse(localStorage.getItem('foolos_simulated_leaderboard') || '[]');
    const idx = board.findIndex(p => p.username === username);
    if (idx !== -1) {
      board[idx].netWorth = netWorth;
      board[idx].title = title;
      board[idx].lastSeen = Date.now();
    } else {
      board.push({ username, netWorth, title, lastSeen: Date.now() });
    }
    board.sort((a, b) => b.netWorth - a.netWorth);
    localStorage.setItem('foolos_simulated_leaderboard', JSON.stringify(board));
  }

  // ─────────────────────────────────────────────
  //  LEADERBOARD — LOCAL + REMOTE MERGE
  // ─────────────────────────────────────────────
  async function getLeaderboard() {
    // Return local board instantly
    const localBoard = _getLocalLeaderboard();

    // If online, try to merge fresh Firestore data (best-effort, non-blocking)
    if (firebaseReady && firestoreDb) {
      try {
        const snapshot = await firestoreDb.collection('players')
          .orderBy('netWorth', 'desc')
          .limit(25)
          .get();

        const remoteEntries = [];
        snapshot.forEach(doc => {
          const d = doc.data();
          remoteEntries.push({
            username: d.username || doc.id,
            netWorth: d.netWorth || 0,
            title: d.title || 'عامل مبتدئ',
            lastSeen: d.lastSeen || Date.now()
          });
        });

        if (remoteEntries.length > 0) {
          // Merge: prefer remote data for existing users, keep local-only users
          const merged = [...remoteEntries];
          localBoard.forEach(local => {
            const inRemote = merged.some(r => r.username === local.username);
            if (!inRemote) merged.push(local);
          });
          merged.sort((a, b) => b.netWorth - a.netWorth);
          return merged;
        }
      } catch (err) {
        // Firebase read failed — fall through to local data
      }
    }

    return localBoard;
  }

  function _getLocalLeaderboard() {
    // Collect all real registered players from local storage
    const registered = JSON.parse(localStorage.getItem('foolos_registered_sim') || '{}');
    const board = [];

    Object.keys(registered).forEach(uname => {
      const pData = registered[uname];
      const pState = JSON.parse(localStorage.getItem(`foolos_player_${uname}`) || '{}');
      board.push({
        username: uname,
        netWorth: pState.netWorth || pData.netWorth || 5000,
        title: pState.title || 'عامل مبتدئ',
        lastSeen: pData.lastSeen || Date.now()
      });
    });

    board.sort((a, b) => b.netWorth - a.netWorth);
    return board;
  }

  // ─────────────────────────────────────────────
  //  WIRE TRANSFER
  // ─────────────────────────────────────────────
  async function executeWireTransfer(senderUsername, recipientUsername, amount) {
    if (!senderUsername || !recipientUsername) throw new Error("بيانات التحويل غير مكتملة.");
    if (senderUsername === recipientUsername) throw new Error("لا يمكنك التحويل لنفسك!");
    if (amount <= 0) throw new Error("مبلغ التحويل يجب أن يكون أكبر من صفر.");

    // Check if recipient is known (local or mock)
    const registered = JSON.parse(localStorage.getItem('foolos_registered_sim') || '{}');
    const isMockRecipient = DEFAULT_MOCK_PLAYERS.some(m => m.username === recipientUsername);
    const isLocalRecipient = registered[recipientUsername] !== undefined;
    let isFirebaseRecipient = false;

    if (!isMockRecipient && !isLocalRecipient && firebaseReady && firestoreDb) {
      try {
        const doc = await firestoreDb.collection('players').doc(recipientUsername).get();
        isFirebaseRecipient = doc.exists;
      } catch (e) { /* ignore */ }
    }

    if (!isMockRecipient && !isLocalRecipient && !isFirebaseRecipient) {
      throw new Error("المستلم غير موجود. تحقق من كتابة الاسم بدقة.");
    }

    // If online, prefer atomic Firestore transaction
    if (firebaseReady && firestoreDb && (isLocalRecipient || isFirebaseRecipient)) {
      try {
        const db = firestoreDb;
        const senderRef = db.collection('players').doc(senderUsername);
        const recipientRef = db.collection('players').doc(recipientUsername);

        return await db.runTransaction(async (tx) => {
          const [senderDoc, recipientDoc] = await Promise.all([
            tx.get(senderRef),
            tx.get(recipientRef)
          ]);

          const senderCash = (senderDoc.exists ? senderDoc.data().cash : 0) || 0;
          if (senderCash < amount) throw new Error("رصيدك الحالي غير كافٍ لإتمام عملية التحويل.");

          const recipientCash = (recipientDoc.exists ? recipientDoc.data().cash : 0) || 0;
          tx.set(senderRef, { cash: senderCash - amount, netWorth: (senderDoc.data().netWorth || 0) - amount }, { merge: true });
          tx.set(recipientRef, { cash: recipientCash + amount, netWorth: (recipientDoc.data().netWorth || 0) + amount }, { merge: true });

          const logRef = db.collection('transfers').doc();
          tx.set(logRef, { sender: senderUsername, recipient: recipientUsername, amount, timestamp: Date.now() });
          return true;
        });
      } catch (err) {
        if (err.message.includes('غير كافٍ')) throw err;
        // Fall through to local transfer
      }
    }

    // LOCAL TRANSFER FALLBACK
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const senderKey = `foolos_state_${senderUsername}`;
        const senderState = JSON.parse(localStorage.getItem(senderKey));
        if (!senderState || senderState.cash < amount) {
          reject(new Error("رصيدك النقدي (الكاش) غير كافٍ للتحويل."));
          return;
        }
        senderState.cash -= amount;
        senderState.netWorth = Math.max(0, (senderState.netWorth || 0) - amount);
        localStorage.setItem(senderKey, JSON.stringify(senderState));
        _updateLocalLeaderboard(senderUsername, senderState.netWorth, senderState.title);

        if (isLocalRecipient) {
          const recKey = `foolos_state_${recipientUsername}`;
          const recState = JSON.parse(localStorage.getItem(recKey) || '{"cash":0,"netWorth":0}');
          recState.cash = (recState.cash || 0) + amount;
          recState.netWorth = (recState.netWorth || 0) + amount;
          localStorage.setItem(recKey, JSON.stringify(recState));
          _updateLocalLeaderboard(recipientUsername, recState.netWorth, recState.title);
        } else if (isMockRecipient) {
          let board = JSON.parse(localStorage.getItem('foolos_simulated_leaderboard') || '[]');
          const idx = board.findIndex(p => p.username === recipientUsername);
          if (idx !== -1) { board[idx].netWorth += amount; }
          localStorage.setItem('foolos_simulated_leaderboard', JSON.stringify(board));
        }

        // Save to global audit wire transfers log
        const transferLog = JSON.parse(localStorage.getItem('foolos_wire_transfers_log') || '[]');
        transferLog.unshift({
          id: `TRF_${Date.now()}_${Math.floor(Math.random()*1000)}`,
          sender: senderUsername,
          recipient: recipientUsername,
          amount: amount,
          timestamp: Date.now(),
          status: 'مكتملة'
        });
        // Limit log size to 100 entries
        if (transferLog.length > 100) transferLog.length = 100;
        localStorage.setItem('foolos_wire_transfers_log', JSON.stringify(transferLog));

        resolve(true);
      }, 600);
    });
  }

  // ─────────────────────────────────────────────
  //  ADMIN FUNCTIONS
  // ─────────────────────────────────────────────
  async function sendBroadcast(message) {
    if (firebaseReady && firestoreDb) {
      await firestoreDb.collection('globals').doc('broadcast').set({ message, timestamp: Date.now() });
    }
  }

  async function sendAirdrop(amount) {
    if (firebaseReady && firestoreDb) {
      await firestoreDb.collection('globals').doc('airdrop').set({ amount: Number(amount), timestamp: Date.now() });
    }
  }

  async function adminGetPlayer(username) {
    username = username.trim();

    if (firebaseReady && firestoreDb) {
      const doc = await firestoreDb.collection('players').doc(username).get();
      if (!doc.exists) throw new Error("اسم المستخدم المطلوب غير مسجل بالخوادم.");
      return doc.data();
    }

    const stateKey = `foolos_state_${username}`;
    const data = localStorage.getItem(stateKey);
    if (!data) throw new Error("اسم المستخدم المطلوب غير مسجل محلياً.");
    return JSON.parse(data);
  }

  async function adminSavePlayer(username, playerState) {
    localStorage.setItem(`foolos_state_${username}`, JSON.stringify(playerState));
    _updateLocalLeaderboard(username, playerState.netWorth, playerState.title);

    if (firebaseReady && firestoreDb) {
      await firestoreDb.collection('players').doc(username).set(playerState, { merge: true });
    }
  }

  async function adminReleaseJail(username) {
    const playerState = await adminGetPlayer(username);
    playerState.jailTimer = 0;
    await adminSavePlayer(username, playerState);
  }

  async function adminBanPlayer(username) {
    if (username === 'admin') throw new Error("لا يمكن حظر حساب الإدارة الرئيسي.");
    const playerState = await adminGetPlayer(username);
    playerState.isBanned = true;
    await adminSavePlayer(username, playerState);
  }

  async function getSystemStats() {
    const registered = JSON.parse(localStorage.getItem('foolos_registered_sim') || '{}');
    const playerUsernames = new Set(Object.keys(registered));

    // Also scan localStorage for any active state keys (foolos_state_*, foolos_player_*)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('foolos_state_')) {
        playerUsernames.add(key.replace('foolos_state_', ''));
      } else if (key.startsWith('foolos_player_')) {
        playerUsernames.add(key.replace('foolos_player_', ''));
      }
    }

    let totalCashInCirculation = 0;
    let totalBankInCirculation = 0;
    let totalNetWorthInCirculation = 0;
    let jailedPlayersCount = 0;
    let bannedPlayersCount = 0;

    playerUsernames.forEach(uname => {
      let pState = null;
      const s1 = localStorage.getItem(`foolos_state_${uname}`);
      const s2 = localStorage.getItem(`foolos_player_${uname}`);
      if (s1) pState = JSON.parse(s1);
      else if (s2) pState = JSON.parse(s2);

      if (pState) {
        totalCashInCirculation += Number(pState.cash || 0);
        totalBankInCirculation += Number(pState.bank || 0);
        totalNetWorthInCirculation += Number(pState.netWorth || 0);
        if (pState.jailTimer > 0) jailedPlayersCount++;
        if (pState.isBanned) bannedPlayersCount++;
      } else if (registered[uname]) {
        totalNetWorthInCirculation += Number(registered[uname].netWorth || 5000);
      }
    });

    return {
      totalPlayers: playerUsernames.size,
      totalCash: totalCashInCirculation,
      totalBank: totalBankInCirculation,
      totalNetWorth: totalNetWorthInCirculation,
      jailedCount: jailedPlayersCount,
      bannedCount: bannedPlayersCount,
      activeVersion: CLIENT_VERSION
    };
  }

  async function adminWipeLeaderboard() {
    const registered = JSON.parse(localStorage.getItem('foolos_registered_sim') || '{}');
    const activeUser = window.GameEngine ? GameEngine.activeUsername : '';
    const newRegistered = {};
    if (activeUser && registered[activeUser]) {
      newRegistered[activeUser] = registered[activeUser];
    }
    if (registered[SECRET_ADMIN_USERNAME]) {
      newRegistered[SECRET_ADMIN_USERNAME] = registered[SECRET_ADMIN_USERNAME];
    }
    localStorage.setItem('foolos_registered_sim', JSON.stringify(newRegistered));

    if (firebaseReady && firestoreDb) {
      const snapshot = await firestoreDb.collection('players').get();
      const batch = firestoreDb.batch();
      snapshot.forEach(doc => {
        if (doc.id !== 'admin' && doc.id !== SECRET_ADMIN_USERNAME) batch.delete(doc.ref);
      });
      await batch.commit();
    }
  }

  async function adminGetTransfers() {
    if (firebaseReady && firestoreDb) {
      try {
        const snapshot = await firestoreDb.collection('transfers').orderBy('timestamp', 'desc').limit(50).get();
        const docs = [];
        snapshot.forEach(d => {
          const data = d.data();
          docs.push({
            id: d.id,
            sender: data.sender || 'مجهول',
            recipient: data.recipient || 'مجهول',
            amount: data.amount || 0,
            timestamp: data.timestamp || Date.now(),
            status: 'مكتملة سحابياً'
          });
        });
        if (docs.length > 0) return docs;
      } catch (e) { /* fall through to local */ }
    }

    return JSON.parse(localStorage.getItem('foolos_wire_transfers_log') || '[]');
  }

  async function setMaintenanceMode(enabled, msg = '') {
    const data = {
      enabled: Boolean(enabled),
      message: msg || 'تخضع اللعبة حالياً لأعمال تحديث وصيانة طارئة من قبل الإدارة لتحسين الأداء وتأمين الحسابات.',
      timestamp: Date.now()
    };
    localStorage.setItem('foolos_maintenance_mode', JSON.stringify(data));

    if (firebaseReady && firestoreDb) {
      await firestoreDb.collection('globals').doc('maintenance').set(data, { merge: true });
    }
    return data;
  }

  async function getMaintenanceStatus() {
    let localData = JSON.parse(localStorage.getItem('foolos_maintenance_mode') || '{"enabled": false}');
    if (firebaseReady && firestoreDb) {
      try {
        const doc = await firestoreDb.collection('globals').doc('maintenance').get();
        if (doc.exists) {
          const remoteData = doc.data();
          localData = remoteData;
          localStorage.setItem('foolos_maintenance_mode', JSON.stringify(remoteData));
        }
      } catch (e) { /* fallback local */ }
    }
    return localData;
  }

  // ─────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────
  return {
    get clientVersion() { return CLIENT_VERSION; },
    get isFirebaseReady() { return firebaseReady; },
    get isOnline() { return navigator.onLine && firebaseReady; },
    get pendingSyncs() { return syncQueue.length; },

    init,
    checkVersion,
    registerPlayer,
    loginPlayer,
    getPlayerState,
    savePlayerState,
    getLeaderboard,
    executeWireTransfer,

    // Admin
    sendBroadcast,
    sendAirdrop,
    adminGetPlayer,
    adminSavePlayer,
    adminReleaseJail,
    adminBanPlayer,
    adminWipeLeaderboard,
    getSystemStats,
    adminGetTransfers,
    setMaintenanceMode,
    getMaintenanceStatus,

    // Legacy compat
    get dbType() { return firebaseReady ? 'firebase' : 'simulated'; },
    mockPlayers: DEFAULT_MOCK_PLAYERS
  };
})();

window.AppDB = AppDB;
