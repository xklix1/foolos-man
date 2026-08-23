/**
 * Foolos Man Tycoon (فلوس مان تايكون)
 * Database Adapter v10 (db.js)
 *
 * Architecture: ONLINE-FIRST (Firebase-First)
 *  - ALL reads/writes go directly to Firestore — no localStorage fallback.
 *  - Game is BLOCKED until Firebase is connected and ready.
 *  - If the user loses internet, the game shows an error and stops saving.
 *  - No sync queue, no local simulation — Firestore is the single source of truth.
 */

const AppDB = (() => {
  // ─────────────────────────────────────────────
  //  CONSTANTS
  // ─────────────────────────────────────────────
  const CLIENT_VERSION = '10';

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyC7KRj3-t_03HLMzJ10miVhdKWCpabPQB4",
    authDomain: "foolos-man.firebaseapp.com",
    projectId: "foolos-man",
    storageBucket: "foolos-man.firebasestorage.app",
    messagingSenderId: "426833341092",
    appId: "1:426833341092:web:141a51c22d8b1afc621431",
    measurementId: "G-54ZC388NW1"
  };

  // Secret Admin Credentials
  const SECRET_ADMIN_USERNAME = 'FoolosAdmin_X99';
  const SECRET_ADMIN_PIN = '987654';

  // Firebase Auth credentials for admin (grants Firestore write access to globals)
  const ADMIN_AUTH_EMAIL    = 'khalid.newstart@gmail.com';
  const ADMIN_AUTH_PASSWORD = 'khalid911';

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

      // Verify connectivity with a lightweight ping
      await firestoreDb.collection('globals').doc('config').get();

      firebaseReady = true;
      console.log('[DB] Firebase Firestore connected and ready.');

      // Attach online/offline listeners for UI feedback
      _attachConnectivityListeners();

      return true;
    } catch (err) {
      firebaseReady = false;
      console.error('[DB] Firebase connection failed:', err.message);
      throw new Error('تعذّر الاتصال بخوادم اللعبة. تحقق من اتصالك بالإنترنت وأعد المحاولة.');
    }
  }

  // ─────────────────────────────────────────────
  //  ADMIN SEED
  // ─────────────────────────────────────────────
  async function _seedAdminIfMissing() {
    try {
      const ref = firestoreDb.collection('players').doc(SECRET_ADMIN_USERNAME);
      const doc = await ref.get();
      if (!doc.exists) {
        // Sign in to Firebase Auth first so Firestore rules (isAdmin check) allow the write
        await firebaseAuth.signInWithEmailAndPassword(ADMIN_AUTH_EMAIL, ADMIN_AUTH_PASSWORD);

        const pinHash = _hashString(SECRET_ADMIN_PIN);
        await ref.set({
          username: SECRET_ADMIN_USERNAME,
          pin: pinHash,
          netWorth: 100000000,
          isAdmin: true,
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
          title: 'إمبراطور المال والفلوس',
          createdAt: Date.now(),
          lastSeen: Date.now()
        });
        console.log('[DB] Admin account seeded in Firestore.');
        // Sign out after seeding so normal users start unauthenticated
        await firebaseAuth.signOut();
      }
    } catch (err) {
      console.warn('[DB] Could not seed admin account:', err.message);
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
  //  HELPERS
  // ─────────────────────────────────────────────
  function _requireOnline() {
    if (!firebaseReady || !firestoreDb) {
      throw new Error('لا يوجد اتصال بالخوادم. تحقق من اتصالك بالإنترنت.');
    }
  }

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
    _requireOnline();

    if (username.toLowerCase().includes('admin') || username === SECRET_ADMIN_USERNAME) {
      throw new Error('اسم المستخدم هذا محظور ومحمي. يرجى اختيار اسم مستخدم عادي.');
    }

    const ref = firestoreDb.collection('players').doc(username);
    const existing = await ref.get();
    if (existing.exists) {
      throw new Error('اسم المستخدم هذا مسجل بالفعل. يرجى اختيار اسم آخر.');
    }

    const pinHash = _hashString(pin);
    const data = {
      username,
      pin: pinHash,
      netWorth: 5000,
      isAdmin: false,
      createdAt: Date.now(),
      lastSeen: Date.now()
    };

    await ref.set(data);
    console.log('[DB] Player registered:', username);
    return data;
  }

  // ─────────────────────────────────────────────
  //  AUTH — LOGIN
  // ─────────────────────────────────────────────
  async function loginPlayer(username, pin) {
    if (!username || !pin) throw new Error('يرجى إدخال اسم المستخدم والرقم السري.');
    username = username.trim();
    _requireOnline();

    const pinHash = _hashString(pin);

    // Secret Admin bypass — sign in to Firebase Auth for globals access
    if (username === SECRET_ADMIN_USERNAME && pin === SECRET_ADMIN_PIN) {
      try {
        await firebaseAuth.signInWithEmailAndPassword(ADMIN_AUTH_EMAIL, ADMIN_AUTH_PASSWORD);
        console.log('[DB] Admin signed in to Firebase Auth.');
      } catch (authErr) {
        console.warn('[DB] Firebase Auth sign-in failed:', authErr.message);
      }

      // Create admin doc in Firestore if it doesn't exist yet (first time only)
      const adminRef = firestoreDb.collection('players').doc(SECRET_ADMIN_USERNAME);
      const adminDoc = await adminRef.get();
      if (!adminDoc.exists) {
        const pinHash = _hashString(SECRET_ADMIN_PIN);
        await adminRef.set({
          username: SECRET_ADMIN_USERNAME,
          pin: pinHash,
          netWorth: 100000000,
          isAdmin: true,
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
          title: 'إمبراطور المال والفلوس',
          createdAt: Date.now(),
          lastSeen: Date.now()
        });
        console.log('[DB] Admin doc created in Firestore.');
        return await adminRef.get().then(d => d.data());
      }
      return adminDoc.data();
    }

    // Sign out any existing Firebase Auth session for non-admin users
    if (firebaseAuth.currentUser) {
      await firebaseAuth.signOut();
    }

    const ref = firestoreDb.collection('players').doc(username);
    const doc = await ref.get();

    if (!doc.exists) throw new Error('اسم المستخدم غير موجود. يرجى التسجيل أولاً.');

    const data = doc.data();
    if (data.pin !== pinHash && data.pin !== pin) {
      throw new Error('الرقم السري غير صحيح. يرجى المحاولة مرة أخرى.');
    }

    // Update lastSeen
    await ref.update({ lastSeen: Date.now() });

    return data;
  }

  // ─────────────────────────────────────────────
  //  GET PLAYER STATE
  // ─────────────────────────────────────────────
  async function getPlayerState(username) {
    _requireOnline();
    const ref = firestoreDb.collection('players').doc(username);
    const doc = await ref.get();
    if (!doc.exists) return null;
    return doc.data();
  }

  // ─────────────────────────────────────────────
  //  SAVE PLAYER STATE
  // ─────────────────────────────────────────────
  async function savePlayerState(username, state) {
    if (!username) return;
    _requireOnline();

    state.username = username;
    state.lastSeen = Date.now();

    const ref = firestoreDb.collection('players').doc(username);
    await ref.set(state, { merge: true });
  }

  // ─────────────────────────────────────────────
  //  LEADERBOARD — directly from Firestore
  // ─────────────────────────────────────────────
  async function getLeaderboard() {
    _requireOnline();

    const snapshot = await firestoreDb.collection('players')
      .orderBy('netWorth', 'desc')
      .limit(50) // fetch more to account for filtered entries
      .get();

    const entries = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      // Hide admin accounts and banned players from leaderboard
      if (d.isAdmin || d.isBanned) return;
      entries.push({
        username: d.username || doc.id,
        netWorth: d.netWorth || 0,
        title: d.title || 'عامل مبتدئ',
        lastSeen: d.lastSeen || Date.now()
      });
    });

    return entries.slice(0, 25); // return top 25 after filtering
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
  //  ADMIN FUNCTIONS
  // ─────────────────────────────────────────────
  async function sendBroadcast(message) {
    _requireOnline();
    await firestoreDb.collection('globals').doc('broadcast').set({ message, timestamp: Date.now() });
  }

  async function sendAirdrop(amount) {
    _requireOnline();
    await firestoreDb.collection('globals').doc('airdrop').set({ amount: Number(amount), timestamp: Date.now() });
  }

  async function adminGetPlayer(username) {
    _requireOnline();
    username = username.trim();
    const doc = await firestoreDb.collection('players').doc(username).get();
    if (!doc.exists) throw new Error('اسم المستخدم المطلوب غير مسجل بالخوادم.');
    return doc.data();
  }

  async function adminSavePlayer(username, playerState) {
    _requireOnline();
    await firestoreDb.collection('players').doc(username).set(playerState, { merge: true });
  }

  async function adminReleaseJail(username) {
    const playerState = await adminGetPlayer(username);
    playerState.jailTimer = 0;
    await adminSavePlayer(username, playerState);
  }

  async function adminBanPlayer(username) {
    if (username === SECRET_ADMIN_USERNAME) throw new Error('لا يمكن حظر حساب الإدارة الرئيسي.');
    const playerState = await adminGetPlayer(username);
    playerState.isBanned = true;
    await adminSavePlayer(username, playerState);
  }

  async function getSystemStats() {
    _requireOnline();
    const snapshot = await firestoreDb.collection('players').get();

    let totalCash = 0, totalBank = 0, totalNetWorth = 0;
    let jailedCount = 0, bannedCount = 0, totalPlayers = 0;

    snapshot.forEach(doc => {
      const d = doc.data();
      totalPlayers++;
      totalCash += Number(d.cash || 0);
      totalBank += Number(d.bank || 0);
      totalNetWorth += Number(d.netWorth || 0);
      if (d.jailTimer > 0) jailedCount++;
      if (d.isBanned) bannedCount++;
    });

    return { totalPlayers, totalCash, totalBank, totalNetWorth, jailedCount, bannedCount, activeVersion: CLIENT_VERSION };
  }

  async function adminWipeLeaderboard() {
    _requireOnline();
    const activeUser = window.GameEngine ? GameEngine.activeUsername : '';
    const snapshot = await firestoreDb.collection('players').get();
    const batch = firestoreDb.batch();
    snapshot.forEach(doc => {
      if (doc.id !== SECRET_ADMIN_USERNAME && doc.id !== activeUser) {
        batch.delete(doc.ref);
      }
    });
    await batch.commit();
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
  //  PUBLIC API
  // ─────────────────────────────────────────────
  return {
    get clientVersion() { return CLIENT_VERSION; },
    get isFirebaseReady() { return firebaseReady; },
    get isOnline() { return navigator.onLine && firebaseReady; },
    get pendingSyncs() { return 0; }, // No queue in online-first mode

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

    get dbType() { return firebaseReady ? 'firebase' : 'offline'; },
    mockPlayers: []
  };
})();

window.AppDB = AppDB;
