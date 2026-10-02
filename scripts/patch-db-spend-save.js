const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../db.js');
let content = fs.readFileSync(filePath, 'utf8');

const target = `  async function savePlayerState(username, state, forceCloud = false) {
    if (!username || !state) return;
    const u = username.trim();
    state.username = u;
    const nowTs = getTrustedNow();
    state.lastSeen = nowTs;
    state.lastActiveTimestamp = nowTs;

    // Cache locally INSTANTLY (0 lag, 100% responsive)
    setEncryptedLocalState(\`rasalmal_state_\${u}\`, state);

    // Boot safety: Never push to cloud if this state wasn't successfully verified/loaded from the authoritative cloud first
    if (!state._loadedFromCloud && !forceCloud) {
      console.warn(\`[Sync] Skipping background cloud push for \${u}: session has not completed initial authoritative cloud pull.\`);
      return;
    }

    if (forceCloud) {
      if (_cloudSyncDebounceTimer) {
        clearTimeout(_cloudSyncDebounceTimer);
        _cloudSyncDebounceTimer = null;
      }
      await _pushStateToCloud(u, state);
      return;
    }`;

const replacement = `  let _lastKnownCash = null;
  let _lastKnownBank = null;
  let _lastKnownGold = null;

  async function savePlayerState(username, state, forceCloud = false) {
    if (!username || !state) return;
    const u = username.trim();
    state.username = u;
    const nowTs = getTrustedNow();
    state.lastSeen = nowTs;
    state.lastActiveTimestamp = nowTs;

    // Cache locally INSTANTLY (0 lag, 100% responsive)
    setEncryptedLocalState(\`rasalmal_state_\${u}\`, state);

    // Boot safety: Never push to cloud if this state wasn't successfully verified/loaded from the authoritative cloud first
    if (!state._loadedFromCloud && !forceCloud) {
      console.warn(\`[Sync] Skipping background cloud push for \${u}: session has not completed initial authoritative cloud pull.\`);
      return;
    }

    // Auto-detect any financial spend or explicit transaction (Immediate 0s Cloud Save on Any Spend)
    const curCash = Number(state.cash || 0);
    const curBank = Number(state.bank || 0);
    const curGold = Number(state.gold || 0);
    const isFinancialSpend = (_lastKnownCash !== null && curCash < _lastKnownCash) ||
                             (_lastKnownBank !== null && curBank < _lastKnownBank) ||
                             (_lastKnownGold !== null && curGold < _lastKnownGold);

    _lastKnownCash = curCash;
    _lastKnownBank = curBank;
    _lastKnownGold = curGold;

    if (forceCloud || isFinancialSpend) {
      if (_cloudSyncDebounceTimer) {
        clearTimeout(_cloudSyncDebounceTimer);
        _cloudSyncDebounceTimer = null;
      }
      await _pushStateToCloud(u, state);
      return;
    }`;

const normalized = content.replace(/\r\n/g, '\n');
if (normalized.includes(target)) {
  const updated = normalized.replace(target, replacement);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully patched db.js with immediate spend save rule!');
} else {
  console.error('Target not found in db.js');
}
