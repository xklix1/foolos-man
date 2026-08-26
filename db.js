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
  //  SAVE PLAYER STATE (High Performance Debounced Sync)
  // ─────────────────────────────────────────────
  let _saveTimeout = null;
  let _pendingSaveState = null;
  let _pendingSaveUser = null;

  async function savePlayerState(username, state, immediate = false) {
    if (!username) return;
    state.username = username;
    state.lastSeen = Date.now();

    // Cache locally instantly
    try {
      localStorage.setItem(`foolos_state_${username}`, JSON.stringify(state));
    } catch (e) {}

    _pendingSaveUser = username;
    _pendingSaveState = state;

    if (immediate) {
      if (_saveTimeout) {
        clearTimeout(_saveTimeout);
        _saveTimeout = null;
      }
      if (firebaseReady && firestoreDb) {
        const ref = firestoreDb.collection('players').doc(username);
        await ref.set(state, { merge: true });
      }
      return;
    }

    if (!_saveTimeout) {
      _saveTimeout = setTimeout(async () => {
        _saveTimeout = null;
        if (_pendingSaveUser && _pendingSaveState && firebaseReady && firestoreDb) {
          try {
            const ref = firestoreDb.collection('players').doc(_pendingSaveUser);
            await ref.set(_pendingSaveState, { merge: true });
          } catch (err) {
            console.warn('[DB] Debounced sync warning:', err.message);
          }
        }
      }, 2000);
    }
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
  // ─────────────────────────────────────────────
  //  ADMIN FUNCTIONS
  // ─────────────────────────────────────────────
  async function sendBroadcast(message) {
    _requireOnline();
    await firestoreDb.collection('globals').doc('broadcast').set({ message, timestamp: Date.now() });
  }

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

  async function adminGetAllPlayers() {
    _requireOnline();
    const snapshot = await firestoreDb.collection('players').get();
    const players = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      players.push({
        username: data.username || doc.id,
        netWorth: Number(data.netWorth || 0),
        cash: Number(data.cash || 0),
        bank: Number(data.bank || 0),
        title: data.title || 'عامل مبتدئ',
        jobId: data.jobId || 'unemployed',
        jailTimer: Number(data.jailTimer || 0),
        isBanned: Boolean(data.isBanned),
        isAdmin: Boolean(data.isAdmin || doc.id === SECRET_ADMIN_USERNAME),
        createdAt: data.createdAt || 0,
        lastSeen: data.lastSeen || 0,
        raw: data
      });
    });
    // Sort by NetWorth descending
    players.sort((a, b) => b.netWorth - a.netWorth);
    return players;
  }

  async function adminSavePlayer(username, playerState) {
    _requireOnline();
    username = username.trim();
    playerState.adminModifiedTimestamp = Date.now();
    await firestoreDb.collection('players').doc(username).set(playerState, { merge: true });
  }

  async function adminResetPlayer(username) {
    _requireOnline();
    username = username.trim();
    if (username === SECRET_ADMIN_USERNAME) {
      throw new Error('لا يمكن تصفير حساب الإدارة الرئيسي.');
    }
    
    // Fetch existing player doc to preserve the user's PIN
    const docRef = firestoreDb.collection('players').doc(username);
    const existingSnap = await docRef.get();
    const existingData = existingSnap.exists ? existingSnap.data() : {};
    const existingPin = existingData.pin || '';

    const freshZeroState = {
      username: username,
      pin: existingPin,
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
        diamond_card: 0
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
    username = username.trim();
    if (username === SECRET_ADMIN_USERNAME) {
      throw new Error('لا يمكن حذف حساب الإدارة الرئيسي.');
    }
    await firestoreDb.collection('players').doc(username).delete();
  }

  async function adminChangePlayerPin(username, newPin) {
    _requireOnline();
    username = username.trim();
    if (!newPin || String(newPin).trim().length < 3) {
      throw new Error('يجب أن يتكون الرقم السري من 3 خانات على الأقل.');
    }
    const pinHash = _hashString(String(newPin).trim());
    await firestoreDb.collection('players').doc(username).set({ pin: pinHash }, { merge: true });
  }

  async function adminReleaseJail(username) {
    username = username.trim();
    await firestoreDb.collection('players').doc(username).set({ jailTimer: 0 }, { merge: true });
  }

  async function adminSetPlayerJail(username, jailSeconds = 300) {
    username = username.trim();
    await firestoreDb.collection('players').doc(username).set({ jailTimer: Number(jailSeconds) }, { merge: true });
  }

  async function adminBanPlayer(username) {
    username = username.trim();
    if (username === SECRET_ADMIN_USERNAME) throw new Error('لا يمكن حظر حساب الإدارة الرئيسي.');
    await firestoreDb.collection('players').doc(username).set({ isBanned: true }, { merge: true });
  }

  async function adminUnbanPlayer(username) {
    username = username.trim();
    await firestoreDb.collection('players').doc(username).set({ isBanned: false }, { merge: true });
  }

  async function adminResetAllPlayers() {
    _requireOnline();
    const snapshot = await firestoreDb.collection('players').get();
    let count = 0;
    
    let batch = firestoreDb.batch();
    let batchOps = 0;
    
    for (const doc of snapshot.docs) {
      if (doc.id !== SECRET_ADMIN_USERNAME) {
        const existingData = doc.data() || {};
        const freshZeroState = {
          username: doc.id,
          pin: existingData.pin || '',
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
            diamond_card: 0
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
    }
    
    if (batchOps > 0) {
      await batch.commit();
    }
    return count;
  }

  async function adminWipeLeaderboard() {
    _requireOnline();
    const snapshot = await firestoreDb.collection('players').get();
    let count = 0;
    let batch = firestoreDb.batch();
    let batchOps = 0;

    for (const doc of snapshot.docs) {
      if (doc.id !== SECRET_ADMIN_USERNAME) {
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
    adminResetAllPlayers,
    adminWipeLeaderboard,
    adminClearTransfers,
    getSystemStats,
    adminGetTransfers,
    setMaintenanceMode,
    getMaintenanceStatus,

    get dbType() { return firebaseReady ? 'firebase' : 'offline'; },
    mockPlayers: []
  };
})();

window.AppDB = AppDB;
