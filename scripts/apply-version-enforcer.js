const fs = require('fs');

// 1. Update index.html
let index = fs.readFileSync('index.html', 'utf8');

const headScriptTarget = `  <script>
    if (window.location.hostname.endsWith('vercel.app')) {
      window.location.replace('https://rasalmal.online' + window.location.pathname + window.location.search + window.location.hash);
    }
    // Hard Build Version Enforcement & Cache Purge
    (function() {
      const CURRENT_APP_BUILD = 'v7.7.0';
      try {
        const SEASON_TAG = 'season_2_clean_epoch_v1';
        if (localStorage.getItem('rasalmal_season_epoch') !== SEASON_TAG) {
          localStorage.setItem('rasalmal_season_epoch', SEASON_TAG);
        localStorage.removeItem('rasalmal_banned_device');
          // Purge all old player states from localStorage to prevent Season 1 ghost resurrection
          Object.keys(localStorage).forEach(function(k) {
            if (k.startsWith('rasalmal_state_') || k.startsWith('rasalmal_backup_') || k.startsWith('rasalmal_auth_token_') || k === 'rasalmal_active_session_user' || k === 'rasalmal_registered_account') {
              localStorage.removeItem(k);
            }
          });
          sessionStorage.clear();
        }
      } catch (e) {}
    })();
  </script>`;

const headScriptReplacement = `  <script>
    if (window.location.hostname.endsWith('vercel.app')) {
      window.location.replace('https://rasalmal.online' + window.location.pathname + window.location.search + window.location.hash);
    }
    // Hard Build Version Enforcement & Automatic Cache Purge
    window._CLIENT_VERSION = 'v7.7.0';
    (async function() {
      const CURRENT_APP_BUILD = 'v7.7.0';
      try {
        localStorage.removeItem('rasalmal_banned_device');
        // Unregister any stale Service Workers
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for (let r of registrations) r.unregister();
          }).catch(function() {});
        }
        // Check server version manifest directly with no-store
        const res = await fetch('/version.json?_t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const s = await res.json();
          if (s && s.version && s.version !== CURRENT_APP_BUILD) {
            console.warn('[Version Sync] New game version available:', s.version, 'Current:', CURRENT_APP_BUILD);
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            }
            sessionStorage.clear();
            const url = new URL(window.location.href);
            url.searchParams.set('_build', s.version);
            window.location.replace(url.toString());
            return;
          }
        }
      } catch (e) {}
    })();
  </script>`;

if (index.includes(headScriptTarget)) {
  index = index.replace(headScriptTarget, headScriptReplacement);
} else {
  index = index.replace(/<script>[\s\S]*?CURRENT_APP_BUILD[\s\S]*?<\/script>/, headScriptReplacement);
}

fs.writeFileSync('index.html', index, 'utf8');
console.log('index.html updated successfully');

// 2. Update db.js checkVersion
let db = fs.readFileSync('db.js', 'utf8');

const dbCheckVersionDef = `  async function checkVersion() {
    try {
      const res = await fetch('/version.json?_t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const s = await res.json();
        const client = (typeof window !== 'undefined' && window._CLIENT_VERSION) || 'v7.7.0';
        const isLatest = s.version === client;
        return {
          upToDate: isLatest,
          clientVersion: client,
          remoteVersion: s.version || client
        };
      }
    } catch (_) {}
    return { upToDate: true, clientVersion: 'v7.7.0', remoteVersion: 'v7.7.0' };
  }`;

if (!db.includes('async function checkVersion()')) {
  db = db.replace('async function checkDeviceBan()', dbCheckVersionDef + '\n\n  async function checkDeviceBan()');
}

db = db.replace(/checkVersion:\s*async\s*\(\)\s*=>\s*\([^)]+\),/, 'checkVersion,');
fs.writeFileSync('db.js', db, 'utf8');
console.log('db.js updated successfully');

// 3. Update ui.js watchdog
let ui = fs.readFileSync('ui.js', 'utf8');
const uiWatchdogTarget = `  const checkForceReloadWatchdog = async () => {
    if (typeof AppDB !=='undefined' && typeof AppDB.isNetworkActive ==='function' && !AppDB.isNetworkActive()) return;
    if (typeof document !=='undefined' && document.hidden) return;
    try {
      if (typeof AppDB !=='undefined' && typeof AppDB.getForceReloadStatus ==='function') {
        const reloadData = await AppDB.getForceReloadStatus();
        if (reloadData && reloadData.timestamp) {
          if (window.UIController && typeof window.UIController.handleIncomingForceReload ==='function') {
            window.UIController.handleIncomingForceReload(reloadData);
          }
        }
      }
    } catch (e) {}
  };`;

const uiWatchdogReplacement = `  let _lastVersionCheckWatchdog = 0;
  const checkForceReloadWatchdog = async () => {
    if (typeof AppDB !=='undefined' && typeof AppDB.isNetworkActive ==='function' && !AppDB.isNetworkActive()) return;
    if (typeof document !=='undefined' && document.hidden) return;
    try {
      // 1. Check Admin Force Reload broadcast
      if (typeof AppDB !=='undefined' && typeof AppDB.getForceReloadStatus ==='function') {
        const reloadData = await AppDB.getForceReloadStatus();
        if (reloadData && reloadData.timestamp) {
          if (window.UIController && typeof window.UIController.handleIncomingForceReload ==='function') {
            window.UIController.handleIncomingForceReload(reloadData);
          }
        }
      }

      // 2. Check Version Manifest every 10 seconds
      const now = Date.now();
      if (now - _lastVersionCheckWatchdog >= 10000) {
        _lastVersionCheckWatchdog = now;
        const res = await fetch('/version.json?_t=' + now, { cache: 'no-store' });
        if (res.ok) {
          const s = await res.json();
          const curVer = (window._CLIENT_VERSION || 'v7.7.0');
          if (s && s.version && s.version !== curVer) {
            console.warn('[Auto-Updater] Game update detected:', s.version, 'Current:', curVer);
            if (window.UIController && typeof window.UIController.triggerMandatoryReloadModal === 'function') {
              window.UIController.triggerMandatoryReloadModal('تم إطلاق تحديث جديد للعبة على السيرفر (' + s.version + '). جاري تحديث اللعبة ومسح الكاش تلقائياً...');
            } else {
              if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
              }
              window.location.reload(true);
            }
          }
        }
      }
    } catch (e) {}
  };`;

if (ui.includes(uiWatchdogTarget)) {
  ui = ui.replace(uiWatchdogTarget, uiWatchdogReplacement);
} else {
  console.log('Watchdog pattern not found directly, replacing regex');
  ui = ui.replace(/const checkForceReloadWatchdog = async \(\) => {[\s\S]*?catch \(e\) {}\s*};/, uiWatchdogReplacement);
}

fs.writeFileSync('ui.js', ui, 'utf8');
console.log('ui.js updated successfully');
