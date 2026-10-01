const fs = require('fs');
const path = require('path');

// 1. Fix server/src/services/session-manager.js
const smPath = path.join(__dirname, '../server/src/services/session-manager.js');
if (fs.existsSync(smPath)) {
  let sm = fs.readFileSync(smPath, 'utf8');
  const targetRegex = /\/\/ Strict Concurrent Session Guard: Reject sync if client session token does not match active session[\s\S]*?return false;\s*\}/;
  if (targetRegex.test(sm)) {
    sm = sm.replace(targetRegex, `// Seamlessly adopt incoming client session ID if provided\n    if (clientState.activeSessionId) {\n      session.sessionId = clientState.activeSessionId;\n      if (session.state) session.state.activeSessionId = clientState.activeSessionId;\n    }`);
    fs.writeFileSync(smPath, sm, 'utf8');
    console.log('✅ [1/4] Fixed server/src/services/session-manager.js: Adopt incoming client session');
  } else {
    console.log('ℹ️ [1/4] session-manager.js already updated');
  }
}

// 2. Fix server-client-bridge.js
const bridgePath = path.join(__dirname, '../server-client-bridge.js');
if (fs.existsSync(bridgePath)) {
  let bridge = fs.readFileSync(bridgePath, 'utf8');
  const bridgeCatchRegex = /if \(e\.message && \(e\.message\.includes\('Session invalidated'\)[\s\S]*?window\.handleDuplicateSession\('تم تسجيل الدخول إلى هذا الحساب من جهاز آخر\.'\);\s*\}\s*\}/;
  if (bridgeCatchRegex.test(bridge)) {
    bridge = bridge.replace(bridgeCatchRegex, `// Safe sync warning log without prematurely killing active UI`);
    fs.writeFileSync(bridgePath, bridge, 'utf8');
    console.log('✅ [2/4] Fixed server-client-bridge.js: Prevent premature session termination');
  } else {
    console.log('ℹ️ [2/4] server-client-bridge.js already updated');
  }
}

// 3. Fix db.js
const dbPath = path.join(__dirname, '../db.js');
if (fs.existsSync(dbPath)) {
  let db = fs.readFileSync(dbPath, 'utf8');
  
  // Replace un-throttled visibility check in setupBeforeUnload
  const visCheckRegex = /\} else if \(!_isSessionInvalidated\) \{\s*const activeUser = \(window\.GameEngine && window\.GameEngine\.activeUsername\);\s*if \(activeUser\) \{\s*_api\(`players\?select=username,state&username=ilike\.\$\{encodeURIComponent\(activeUser\)\}&limit=1`\)[\s\S]*?invalidateCurrentSession\('تم فتح حسابك في جلسة جديدة من جهاز آخر\. تم إيقاف هذا الجهاز لحماية أموالك من التضارب\.'\);\s*\}\s*\}\s*\}\)\.catch\(\(\) => \{\}\);\s*\}\s*\}/;
  if (visCheckRegex.test(db)) {
    db = db.replace(visCheckRegex, `} else if (!_isSessionInvalidated) {\n          const activeUser = (window.GameEngine && window.GameEngine.activeUsername);\n          if (activeUser) {\n            _checkSessionImmediate(activeUser);\n          }\n        }`);
    console.log('✅ [3/4] Replaced un-throttled visibilitychange in db.js with graceful _checkSessionImmediate');
  }

  // Grace period on pushStateToCloud representation check
  const pushCheckRegex = /if \(Array\.isArray\(res\) && res\.length > 0 && res\[0\]\.state\) \{\s*const srvSession = res\[0\]\.state\.activeSessionId;\s*if \(srvSession && srvSession !== _currentSessionToken\) \{/;
  if (pushCheckRegex.test(db)) {
    db = db.replace(pushCheckRegex, `if (Array.isArray(res) && res.length > 0 && res[0].state && (Date.now() - _sessionClaimedTimestamp > 15000)) {\n          const srvSession = res[0].state.activeSessionId;\n          if (srvSession && srvSession !== _currentSessionToken) {`);
    console.log('✅ [4/4] Added 15-second grace period to pushStateToCloud verification');
  }

  fs.writeFileSync(dbPath, db, 'utf8');
}

console.log('🎉 All session lockout fixes applied successfully!');
