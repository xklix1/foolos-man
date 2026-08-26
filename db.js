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

var activeAdminUsername = 'FoolosAdmin_X99';
if (typeof window !== 'undefined') window.activeAdminUsername = 'FoolosAdmin_X99';

const AppDB = (() => {
  console.log('[DB] Adapter Loaded (v=107)');
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

  // Secret Admin Credentials (Protected)
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
      console.log('[DB] Firebase Firestore connected securely.');

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
    if (firebaseAuth && (!firebaseAuth.currentUser || firebaseAuth.currentUser.email !== ADMIN_AUTH_EMAIL)) {
      console.log('[DB] Authenticating admin credentials on-demand...');
      await firebaseAuth.signInWithEmailAndPassword(ADMIN_AUTH_EMAIL, ADMIN_AUTH_PASSWORD);
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

    if (username.toLowerCase().includes('admin') || username === SECRET_ADMIN_USERNAME) {
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

    await ref.set(data);
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

    // Secret Admin login check
    if (username === SECRET_ADMIN_USERNAME && pin === SECRET_ADMIN_PIN) {
      if (firebaseAuth) {
        try {
          await firebaseAuth.signInWithEmailAndPassword(ADMIN_AUTH_EMAIL, ADMIN_AUTH_PASSWORD);
          console.log('[DB] Admin authenticated via Firebase Auth successfully.');
        } catch (e) {
          console.error('[DB] Firebase Auth Admin sign-in failed:', e.message);
          throw new Error('فشل التحقق الإداري في الخوادم: ' + e.message);
        }
      }
      const adminRef = firestoreDb.collection('players').doc(SECRET_ADMIN_USERNAME);
      const adminDoc = await adminRef.get();
      if (adminDoc.exists) {
        return adminDoc.data();
      }
    }

    // Sign out any existing Firebase Auth session for non-admin users
    if (firebaseAuth && firebaseAuth.currentUser) {
      try { await firebaseAuth.signOut(); } catch(e) {}
    }

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
    if (username === SECRET_ADMIN_USERNAME) {
      try {
        await _ensureAdminAuth();
        console.log('[DB] Admin auto-authenticated via getPlayerState.');
      } catch (e) {
        console.error('[DB] Admin auto-auth failed:', e.message);
      }
    }
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
      createdBy: SECRET_ADMIN_USERNAME || 'FoolosAdmin_X99'
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
    const existingPin = existingData.pin || (username === SECRET_ADMIN_USERNAME ? _hashString(SECRET_ADMIN_PIN) : '');
    const isAdmin = Boolean(existingData.isAdmin || username === SECRET_ADMIN_USERNAME);

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
    if (username === SECRET_ADMIN_USERNAME) {
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
    const pinHash = _hashString(String(newPin).trim());
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
    if (username === SECRET_ADMIN_USERNAME) throw new Error('لا يمكن حظر حساب الإدارة الرئيسي.');
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

      // Also publish to global broadcast
      await sendBroadcast(`🎁 تم توزيع مكافأة ومنحة مالية إدارية قدرها +${amount.toLocaleString()} EGP لجميع اللاعبين!`, '🎉 مكافأة مالية عامة');
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
      const isAdmin = Boolean(existingData.isAdmin || doc.id === SECRET_ADMIN_USERNAME);
      const existingPin = existingData.pin || (doc.id === SECRET_ADMIN_USERNAME ? _hashString(SECRET_ADMIN_PIN) : '');
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
