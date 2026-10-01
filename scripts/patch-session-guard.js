const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../db.js');
let content = fs.readFileSync(dbPath, 'utf8');

const targetStr = `  let _lastSessionCheckTime = 0;
  async function _checkSessionImmediate(u) {
    if (_isSessionInvalidated || !u) return;
    const curActive = ((typeof window !== 'undefined' && window.GameEngine && window.GameEngine.activeUsername) || (typeof localStorage !== 'undefined' && localStorage.getItem('rasalmal_active_session_user')) || '').trim();
    if (curActive && u.toLowerCase() !== curActive.toLowerCase()) return;
    const now = Date.now();
    if (now - _lastSessionCheckTime < 800) return; // Throttle to max once per 800ms
    _lastSessionCheckTime = now;
    try {
      const rows = await _api(\`players?select=username,state&username=ilike.\${encodeURIComponent(u)}&limit=1\`);
      if (rows && rows.length > 0 && rows[0].state) {
        const srvSession = rows[0].state.activeSessionId;
        if (srvSession && srvSession !== _currentSessionToken) {
          console.warn(\`[Sync] Concurrent login detected for \${u}: active="\${srvSession}", current="\${_currentSessionToken}"\`);
          invalidateCurrentSession('تم فتح حسابك في جلسة جديدة من جهاز أو متصفح آخر. تم إيقاف هذا الجهاز لحماية أموالك من التضارب.');
        }
      }
    } catch (err) {}
  }

  function _startConcurrentSessionGuard(username) {
    if (!username) return;
    const u = username.trim();
    const curActive = ((typeof window !== 'undefined' && window.GameEngine && window.GameEngine.activeUsername) || (typeof localStorage !== 'undefined' && localStorage.getItem('rasalmal_active_session_user')) || '').trim();
    if (curActive && u.toLowerCase() !== curActive.toLowerCase()) return;
    if (_sessionGuardTimer) clearInterval(_sessionGuardTimer);

    // Ultra-responsive 1.5 second background pulse
    _sessionGuardTimer = setInterval(() => {
      _checkSessionImmediate(u);
    }, 1500);

    if (_sessionGuardTimer && typeof _sessionGuardTimer.unref === 'function') {
      _sessionGuardTimer.unref();
    }

    // Instant check triggers on user interaction and tab switching
    if (typeof window !== 'undefined' && !window._sessionGuardListenersBound) {
      window._sessionGuardListenersBound = true;
      const triggerCheck = () => {
        const activeU = (window.GameEngine && window.GameEngine.activeUsername) || (typeof localStorage !== 'undefined' && localStorage.getItem('rasalmal_active_session_user')) || u;
        if (activeU) _checkSessionImmediate(activeU);
      };

      window.addEventListener('focus', triggerCheck, { passive: true });
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) triggerCheck();
        }, { passive: true });
      }
      window.addEventListener('pointerdown', triggerCheck, { passive: true });
      window.addEventListener('touchstart', triggerCheck, { passive: true });
    }
  }`;

const replacementStr = `  let _lastSessionCheckTime = 0;
  let _sessionClaimedTimestamp = Date.now();

  async function _checkSessionImmediate(u) {
    if (_isSessionInvalidated || !u) return;
    // Allow 8-second grace period after session claiming to prevent initial login race conditions
    if (Date.now() - _sessionClaimedTimestamp < 8000) return;

    const curActive = ((typeof window !== 'undefined' && window.GameEngine && window.GameEngine.activeUsername) || (typeof localStorage !== 'undefined' && localStorage.getItem('rasalmal_active_session_user')) || '').trim();
    if (curActive && u.toLowerCase() !== curActive.toLowerCase()) return;
    const now = Date.now();
    if (now - _lastSessionCheckTime < 3000) return; // Throttle to max once per 3s
    _lastSessionCheckTime = now;
    try {
      const rows = await _api(\`players?select=username,state&username=ilike.\${encodeURIComponent(u)}&limit=1\`);
      if (rows && rows.length > 0 && rows[0].state) {
        const srvSession = rows[0].state.activeSessionId;
        if (srvSession && srvSession !== _currentSessionToken) {
          console.warn(\`[Sync] Concurrent login detected for \${u}: active="\${srvSession}", current="\${_currentSessionToken}"\`);
          invalidateCurrentSession('تم فتح حسابك في جلسة جديدة من جهاز أو متصفح آخر. تم إيقاف هذا الجهاز لحماية أموالك من التضارب.');
        }
      }
    } catch (err) {}
  }

  function _startConcurrentSessionGuard(username) {
    if (!username) return;
    const u = username.trim();
    _sessionClaimedTimestamp = Date.now();
    const curActive = ((typeof window !== 'undefined' && window.GameEngine && window.GameEngine.activeUsername) || (typeof localStorage !== 'undefined' && localStorage.getItem('rasalmal_active_session_user')) || '').trim();
    if (curActive && u.toLowerCase() !== curActive.toLowerCase()) return;
    if (_sessionGuardTimer) clearInterval(_sessionGuardTimer);

    // Steady 10-second background pulse
    _sessionGuardTimer = setInterval(() => {
      _checkSessionImmediate(u);
    }, 10000);

    if (_sessionGuardTimer && typeof _sessionGuardTimer.unref === 'function') {
      _sessionGuardTimer.unref();
    }

    // Check triggers on tab switching and focus
    if (typeof window !== 'undefined' && !window._sessionGuardListenersBound) {
      window._sessionGuardListenersBound = true;
      const triggerCheck = () => {
        const activeU = (window.GameEngine && window.GameEngine.activeUsername) || (typeof localStorage !== 'undefined' && localStorage.getItem('rasalmal_active_session_user')) || u;
        if (activeU) _checkSessionImmediate(activeU);
      };

      window.addEventListener('focus', triggerCheck, { passive: true });
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) triggerCheck();
        }, { passive: true });
      }
    }
  }`;

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = targetStr.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
  const newContent = normalizedContent.replace(normalizedTarget, replacementStr);
  fs.writeFileSync(dbPath, newContent, 'utf8');
  console.log('✅ db.js session guard successfully patched with grace period!');
} else {
  console.log('❌ Target not found in db.js');
}
