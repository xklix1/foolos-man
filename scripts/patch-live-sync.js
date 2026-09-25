const fs = require('fs');

console.log('=== Patching admin-panel.js and ui.js ===');

// 1. Update admin-panel.js
let adminJs = fs.readFileSync('admin-panel.js', 'utf8');

const oldSuspicionRender = `        const suspicionBtn = document.getElementById('btn-admin-toggle-suspicion-lock');
        const suspicionText = document.getElementById('admin-toggle-suspicion-text');
        if (suspicionBtn && suspicionText) {
          if (isUnderSuspicion) {
            suspicionText.textContent = 'إلغاء تثبيت شاشة الشبهة (فك التجميد) 🔓';
            suspicionBtn.className = 'w-full py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer';
          } else {
            suspicionText.textContent = 'تثبيت شاشة (حسابك تحت الشبهة) ⚠️';
            suspicionBtn.className = 'w-full py-2 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20 cursor-pointer';
          }
        }`;

const newSuspicionRender = `        const suspicionBtn = document.getElementById('btn-admin-toggle-suspicion-lock');
        if (suspicionBtn) {
          if (isUnderSuspicion) {
            suspicionBtn.innerHTML = '<i class="fa-solid fa-lock-open text-xs"></i> <span id="admin-toggle-suspicion-text">إلغاء تثبيت شاشة الشبهة (فك التجميد) 🔓</span>';
            suspicionBtn.className = 'w-full py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer';
          } else {
            suspicionBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-xs animate-bounce"></i> <span id="admin-toggle-suspicion-text">تثبيت شاشة (حسابك تحت الشبهة) ⚠️</span>';
            suspicionBtn.className = 'w-full py-2 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20 cursor-pointer';
          }
        }`;

if (adminJs.includes(oldSuspicionRender)) {
  adminJs = adminJs.replace(oldSuspicionRender, newSuspicionRender);
  console.log('[admin-panel.js] Replaced oldSuspicionRender');
}

fs.writeFileSync('admin-panel.js', adminJs, 'utf8');


// 2. Update ui.js: Add reliable Supabase Real-Time User & Security Listener
let uiJs = fs.readFileSync('ui.js', 'utf8');

const targetRealtime = `    // 3. User document listener for ban & external edits (Live Real-Time Sync)`;
const supabaseRealtimeSnippet = `    // 3. Supabase REST Real-Time User Doc & Security Watchdog (Live Real-Time Sync)
    let _lastLiveAdminActionTs = null;
    const checkLiveUserStatus = async () => {
      if (typeof AppDB !== 'undefined' && typeof AppDB.isNetworkActive === 'function' && !AppDB.isNetworkActive()) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const fresh = await AppDB.getPlayerState(username);
        if (!fresh) return;

        // Ban check
        if (fresh.isBanned || fresh.is_banned) {
          if (typeof handleBannedUser === 'function') {
            handleBannedUser('تم حظر هذا الحساب نهائياً من اللعبة لمخالفة قواعد النزاهة.');
          }
          return;
        }

        // Suspicion lock check
        const isSusp = Boolean(fresh.underSuspicion || (fresh.state && fresh.state.underSuspicion));
        if (GameEngine.state) GameEngine.state.underSuspicion = isSusp;
        if (typeof enforceSuspicionStatus === 'function') {
          enforceSuspicionStatus(isSusp);
        }

        // Jail check
        if (typeof fresh.jailTimer === 'number' && GameEngine.state && fresh.jailTimer !== GameEngine.state.jailTimer) {
          GameEngine.state.jailTimer = fresh.jailTimer;
          if (fresh.jailTimer > 0 && typeof handleJailedUser === 'function') {
            handleJailedUser(fresh.jailTimer);
          }
        }
      } catch (e) {
        console.warn('[Realtime] checkLiveUserStatus error:', e);
      }
    };

    checkLiveUserStatus();
    const liveUserPollTimer = setInterval(checkLiveUserStatus, 4000);
    window._triggerPlayerDocCheck = checkLiveUserStatus;
    activeListeners.push(() => {
      clearInterval(liveUserPollTimer);
      if (window._triggerPlayerDocCheck === checkLiveUserStatus) delete window._triggerPlayerDocCheck;
    });

`;

if (!uiJs.includes('checkLiveUserStatus') && uiJs.includes(targetRealtime)) {
  uiJs = uiJs.replace(targetRealtime, supabaseRealtimeSnippet + targetRealtime);
  console.log('[ui.js] Added checkLiveUserStatus Supabase Real-Time Watchdog.');
}

fs.writeFileSync('ui.js', uiJs, 'utf8');
console.log('=== Done patching ===');
