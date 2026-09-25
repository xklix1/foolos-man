const fs = require('fs');

console.log('=== Starting Full Suspicion Feature Repair ===');

// =========================================================================
// 1. Update db.js
// =========================================================================
let dbJs = fs.readFileSync('db.js', 'utf8');

// 1.1 In getPlayerState: update suspicion handling
const oldKhaledBlock = `      if (isKhaledAccount) {
        stateObj.isBanned = false;
        stateObj.isAdmin = true;
        row.is_banned = false;
        row.is_admin = true;
      } else {
        stateObj.isBanned = row.is_banned === true;
      }
      if (stateObj.isBanned && isCurrentPlayer) {
        if (typeof window !== 'undefined' && typeof window.handleBannedUser === 'function') {
          window.handleBannedUser('تم حظر هذا الحساب نهائياً من اللعبة لمخالفة قواعد النزاهة.');
        }
      }`;

const newKhaledBlock = `      if (isKhaledAccount) {
        stateObj.isBanned = false;
        stateObj.isAdmin = true;
        stateObj.underSuspicion = false;
        row.is_banned = false;
        row.is_admin = true;
      } else {
        stateObj.isBanned = row.is_banned === true;
        stateObj.underSuspicion = Boolean((row.state && row.state.underSuspicion) || row.under_suspicion || row.is_under_suspicion || stateObj.underSuspicion);
      }
      if (stateObj.isBanned && isCurrentPlayer) {
        if (typeof window !== 'undefined' && typeof window.handleBannedUser === 'function') {
          window.handleBannedUser('تم حظر هذا الحساب نهائياً من اللعبة لمخالفة قواعد النزاهة.');
        }
      }
      if (stateObj.underSuspicion && isCurrentPlayer) {
        if (typeof window !== 'undefined' && typeof window.enforceSuspicionStatus === 'function') {
          window.enforceSuspicionStatus(true);
        }
      }`;

if (dbJs.includes(oldKhaledBlock)) {
  dbJs = dbJs.replace(oldKhaledBlock, newKhaledBlock);
  console.log('[db.js] Updated getPlayerState suspicion handling.');
} else {
  console.log('[db.js] getPlayerState pattern check passed or already updated.');
}

// 1.2 In adminSetPlayerSuspicion: make sure it sets under_suspicion and sends admin_sync mail
const oldAdminSusp = `  async function adminSetPlayerSuspicion(username, underSuspicion = true) {
    if (!username) throw new Error('اسم المستخدم مطلوب');
    const u = String(username).trim();
    const now = Date.now();
    const rows = await _api(\`players?username=ilike.\${encodeURIComponent(u)}\`);
    if (!rows || rows.length === 0) throw new Error('اللاعب غير موجود');
    const row = rows[0];
    const curState = (typeof row.state === 'string') ? JSON.parse(row.state) : (row.state || {});
    curState.underSuspicion = Boolean(underSuspicion);
    curState.adminModifiedTimestamp = now;
    await _api(\`players?username=ilike.\${encodeURIComponent(u)}\`, {
      method: 'PATCH',
      body: JSON.stringify({
        state: curState,
        admin_modified_timestamp: now
      })
    });
    return true;
  }`;

const newAdminSusp = `  async function adminSetPlayerSuspicion(username, underSuspicion = true) {
    if (!username) throw new Error('اسم المستخدم مطلوب');
    const u = String(username).replace(/^@/, '').trim();
    if (['khaled', 'خالد'].includes(u.toLowerCase())) {
      console.warn('[SECURITY] Master Admin Khaled is immune to suspicion locks.');
      return false;
    }
    const now = Date.now();
    const rows = await _api(\`players?username=ilike.\${encodeURIComponent(u)}\`);
    if (!rows || rows.length === 0) throw new Error('اللاعب غير موجود');
    const row = rows[0];
    const curState = (typeof row.state === 'string') ? JSON.parse(row.state) : (row.state || {});
    curState.underSuspicion = Boolean(underSuspicion);
    curState.adminModifiedTimestamp = now;
    await _api(\`players?username=ilike.\${encodeURIComponent(u)}\`, {
      method: 'PATCH',
      body: JSON.stringify({
        state: curState,
        under_suspicion: Boolean(underSuspicion),
        admin_modified_timestamp: now
      })
    });
    try {
      await sendMail('إدارة اللعبة (Admin)', u, 'admin_sync', {
        timestamp: now,
        reason: underSuspicion ? 'admin_suspicion_locked' : 'admin_suspicion_unlocked',
        underSuspicion: Boolean(underSuspicion)
      });
    } catch (_) {}
    return true;
  }`;

if (dbJs.includes(oldAdminSusp)) {
  dbJs = dbJs.replace(oldAdminSusp, newAdminSusp);
  console.log('[db.js] Updated adminSetPlayerSuspicion function.');
}

// 1.3 In _pushStateToCloud recovery block
const oldPushRecovery = `                window.GameEngine.state.netWorth = Number(fresh.netWorth !== undefined ? fresh.netWorth : window.GameEngine.state.netWorth);
                window.GameEngine.state.adminModifiedTimestamp = Number(fresh.adminModifiedTimestamp || 0);
                if (fresh.seasonBadge !== undefined || (fresh.state && fresh.state.seasonBadge !== undefined)) {`;

const newPushRecovery = `                window.GameEngine.state.netWorth = Number(fresh.netWorth !== undefined ? fresh.netWorth : window.GameEngine.state.netWorth);
                window.GameEngine.state.adminModifiedTimestamp = Number(fresh.adminModifiedTimestamp || 0);
                const isSuspFresh = Boolean(fresh.underSuspicion || (fresh.state && fresh.state.underSuspicion));
                window.GameEngine.state.underSuspicion = isSuspFresh;
                if (typeof window.enforceSuspicionStatus === 'function') {
                  window.enforceSuspicionStatus(isSuspFresh);
                }
                if (fresh.seasonBadge !== undefined || (fresh.state && fresh.state.seasonBadge !== undefined)) {`;

if (dbJs.includes(oldPushRecovery)) {
  dbJs = dbJs.replace(oldPushRecovery, newPushRecovery);
  console.log('[db.js] Updated _pushStateToCloud recovery block.');
}

// 1.4 In checkPlayer & forceCheckPlayer inside listenToPlayerDoc fallback
const oldCheckPlayerItem = `d.isReset = Boolean(r.state && (r.state.isReset === true || r.state.isReset === 'true'));`;
const newCheckPlayerItem = `d.underSuspicion = Boolean(r.under_suspicion || (r.state && (r.state.underSuspicion === true || r.state.underSuspicion === 'true')));
                  d.isReset = Boolean(r.state && (r.state.isReset === true || r.state.isReset === 'true'));`;

if (dbJs.includes(oldCheckPlayerItem)) {
  dbJs = dbJs.replaceAll(oldCheckPlayerItem, newCheckPlayerItem);
  console.log('[db.js] Updated checkPlayer & forceCheckPlayer suspicion fields.');
}

fs.writeFileSync('db.js', dbJs, 'utf8');


// =========================================================================
// 2. Update game.js
// =========================================================================
let gameJs = fs.readFileSync('game.js', 'utf8');

// 2.1 In INITIAL_STATE: add underSuspicion: false
if (!gameJs.includes('underSuspicion: false')) {
  gameJs = gameJs.replace('jailTimer: 0,', 'jailTimer: 0,\n    underSuspicion: false,');
  console.log('[game.js] Added underSuspicion: false to INITIAL_STATE.');
}

// 2.2 In loadUserSession: include underSuspicion in wrapStateWithShield
const oldWrapState = `        dirtyCash: Number(dbState.dirtyCash || 0),`;
const newWrapState = `        dirtyCash: Number(dbState.dirtyCash || 0),
        underSuspicion: Boolean(dbState.underSuspicion || (dbState.state && dbState.state.underSuspicion)),`;

if (gameJs.includes(oldWrapState) && !gameJs.includes('underSuspicion: Boolean(dbState.underSuspicion')) {
  gameJs = gameJs.replace(oldWrapState, newWrapState);
  console.log('[game.js] Added underSuspicion to loadUserSession state wrapping.');
}

fs.writeFileSync('game.js', gameJs, 'utf8');


// =========================================================================
// 3. Update ui.js
// =========================================================================
let uiJs = fs.readFileSync('ui.js', 'utf8');

// 3.1 Expose enforceSuspicionStatus globally
const oldEnforceFn = `  function enforceSuspicionStatus(isUnderSuspicion) {
    const modal = document.getElementById('modal-account-under-suspicion');
    if (!modal) return;
    if (isUnderSuspicion === true) {
      modal.classList.remove('hidden');
    } else {
      modal.classList.add('hidden');
    }
  }`;

const newEnforceFn = `  function enforceSuspicionStatus(isUnderSuspicion) {
    const modal = document.getElementById('modal-account-under-suspicion');
    if (!modal) return;
    if (isUnderSuspicion === true) {
      modal.classList.remove('hidden');
      if (typeof window !== 'undefined') window._isUnderSuspicionLocked = true;
    } else {
      modal.classList.add('hidden');
      if (typeof window !== 'undefined') window._isUnderSuspicionLocked = false;
    }
  }
  if (typeof window !== 'undefined') window.enforceSuspicionStatus = enforceSuspicionStatus;`;

if (uiJs.includes(oldEnforceFn)) {
  uiJs = uiJs.replace(oldEnforceFn, newEnforceFn);
  console.log('[ui.js] Updated enforceSuspicionStatus & exposed globally.');
}

// 3.2 In loginPlayer form handler: add enforceSuspicionStatus check
const oldLoginSuccess = `            playerState = await GameEngine.loadUserSession(canonicalUser, loggedUser, pinInput);
            localStorage.setItem('rasalmal_active_session_user', canonicalUser);`;

const newLoginSuccess = `            playerState = await GameEngine.loadUserSession(canonicalUser, loggedUser, pinInput);
            localStorage.setItem('rasalmal_active_session_user', canonicalUser);
            if (playerState && (playerState.underSuspicion === true || (playerState.state && playerState.state.underSuspicion === true))) {
              enforceSuspicionStatus(true);
            }`;

if (uiJs.includes(oldLoginSuccess) && !uiJs.includes('if (playerState && (playerState.underSuspicion === true')) {
  uiJs = uiJs.replace(oldLoginSuccess, newLoginSuccess);
  console.log('[ui.js] Added suspicion check to login form handler.');
}

// 3.3 In setupRealTimeListeners initial snapshot & snapshot updates
const oldSnapInit = `            // Initial snapshot: record the current timestamp
            if (lastAdminActionTimestamp === null) {
              lastAdminActionTimestamp = Number(data.adminModifiedTimestamp || 0);
              if (data.isBanned) {
                unsubUser();
                handleBannedUser();
              }
              return;
            }`;

const newSnapInit = `            // Initial snapshot: record the current timestamp
            if (lastAdminActionTimestamp === null) {
              lastAdminActionTimestamp = Number(data.adminModifiedTimestamp || 0);
              if (data.isBanned) {
                unsubUser();
                handleBannedUser();
              }
              const isInitialSusp = Boolean(data.underSuspicion || (data.state && data.state.underSuspicion) || data.is_under_suspicion || data.isUnderSuspicion);
              if (GameEngine.state) GameEngine.state.underSuspicion = isInitialSusp;
              enforceSuspicionStatus(isInitialSusp);
              return;
            }`;

if (uiJs.includes(oldSnapInit)) {
  uiJs = uiJs.replace(oldSnapInit, newSnapInit);
  console.log('[ui.js] Added suspicion check to setupRealTimeListeners initial snapshot.');
}

// In realtime admin modifications:
const oldSnapLive = `              // Deep merge all possessions, businesses, assets, cars, items and perks from state`;
const newSnapLive = `              const isLiveSusp = Boolean(data.underSuspicion || (data.state && data.state.underSuspicion) || data.is_under_suspicion || data.isUnderSuspicion);
              GameEngine.state.underSuspicion = isLiveSusp;
              enforceSuspicionStatus(isLiveSusp);

              // Deep merge all possessions, businesses, assets, cars, items and perks from state`;

if (uiJs.includes(oldSnapLive) && !uiJs.includes('const isLiveSusp = Boolean(data.underSuspicion')) {
  uiJs = uiJs.replace(oldSnapLive, newSnapLive);
  console.log('[ui.js] Added suspicion real-time sync to setupRealTimeListeners.');
}

fs.writeFileSync('ui.js', uiJs, 'utf8');


// =========================================================================
// 4. Update admin-panel.js
// =========================================================================
let adminJs = fs.readFileSync('admin-panel.js', 'utf8');

// Fix duplicate badge overwrite
const oldBadgeDup = `          } else if (isUnderSuspicion) {
            statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce inline-block ml-1"></span>تحت الشبهة ⚠️ (الشاشة مثبتة)';
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20 flex items-center';
            statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block ml-1"></span>محظور نهائياً ⛔';
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center';
          }`;

const newBadgeDup = `          } else if (isUnderSuspicion) {
            statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce inline-block ml-1"></span>تحت الشبهة ⚠️ (الشاشة مثبتة)';
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20 flex items-center';
          }`;

if (adminJs.includes(oldBadgeDup)) {
  adminJs = adminJs.replace(oldBadgeDup, newBadgeDup);
  console.log('[admin-panel.js] Fixed duplicate status badge overwrite.');
}

fs.writeFileSync('admin-panel.js', adminJs, 'utf8');

console.log('=== Full Suspicion Feature Repair Completed Successfully ===');
