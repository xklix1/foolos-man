const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// ==========================================
// 1. PATCH server/src/engine/state-sanitizer.js
// ==========================================
const sanitizerPath = path.join(rootDir, 'server', 'src', 'engine', 'state-sanitizer.js');
let sanitizerContent = fs.readFileSync(sanitizerPath, 'utf8');

// Replace the old isLiteralKhaled gold gating with universal gold persistence
const oldGoldBlockSanitizer = `  // Gold currency (strictly gated to developer account 'Khaled' / 'خالد' only)
  const isLiteralKhaled = cleanState.username &&
    typeof cleanState.username === 'string' &&
    ['khaled', 'خالد', 'rasalmal', 'rasalmal1', 'rasalmal2'].includes(cleanState.username.trim().toLowerCase());

  if (isLiteralKhaled) {
    if (dbRow && dbRow.gold !== undefined && dbRow.gold !== null) {
      cleanState.gold = Math.max(0, Number(dbRow.gold));
    } else if (rawState && rawState.gold !== undefined && rawState.gold !== null) {
      cleanState.gold = Math.max(0, Number(rawState.gold));
    } else {
      cleanState.gold = 0;
    }
  } else {
    delete cleanState.gold;
  }`;

const newGoldBlockSanitizer = `  // Gold currency: Authoritative persistence from PostgreSQL row or state JSON
  if (dbRow && dbRow.gold !== undefined && dbRow.gold !== null) {
    cleanState.gold = Math.max(0, Number(dbRow.gold));
  } else if (rawState && rawState.gold !== undefined && rawState.gold !== null) {
    cleanState.gold = Math.max(0, Number(rawState.gold));
  } else {
    cleanState.gold = 0;
  }`;

if (sanitizerContent.includes(oldGoldBlockSanitizer)) {
  sanitizerContent = sanitizerContent.replace(oldGoldBlockSanitizer, newGoldBlockSanitizer);
} else {
  // Regex fallback
  sanitizerContent = sanitizerContent.replace(
    /\/\/ Gold currency[\s\S]*?delete cleanState\.gold;\s*\}/,
    newGoldBlockSanitizer
  );
}
fs.writeFileSync(sanitizerPath, sanitizerContent, 'utf8');
console.log('1. Patched state-sanitizer.js successfully');

// ==========================================
// 2. PATCH server/src/services/session-manager.js
// ==========================================
const sessionMgrPath = path.join(rootDir, 'server', 'src', 'services', 'session-manager.js');
let sessionMgrContent = fs.readFileSync(sessionMgrPath, 'utf8');

const oldGoldBlockSession = `    if (isLiteralKhaled) {
      if (clientState.gold !== undefined && clientState.gold !== null) {
        s.gold = Math.max(0, Number(clientState.gold));
      } else {
        s.gold = Math.max(0, Number(s.gold || 0));
      }
    } else {
      delete s.gold;
    }`;

const newGoldBlockSession = `    // Synchronize Gold currency authoritatively
    if (clientState.gold !== undefined && clientState.gold !== null) {
      s.gold = Math.max(0, Number(clientState.gold));
    } else {
      s.gold = Math.max(0, Number(s.gold || 0));
    }`;

if (sessionMgrContent.includes(oldGoldBlockSession)) {
  sessionMgrContent = sessionMgrContent.replace(oldGoldBlockSession, newGoldBlockSession);
} else {
  sessionMgrContent = sessionMgrContent.replace(
    /if \(isLiteralKhaled\) \{\s*if \(clientState\.gold[\s\S]*?delete s\.gold;\s*\}/,
    newGoldBlockSession
  );
}
fs.writeFileSync(sessionMgrPath, sessionMgrContent, 'utf8');
console.log('2. Patched session-manager.js successfully');

// ==========================================
// 3. PATCH server/src/services/db-service.js
// ==========================================
const dbServicePath = path.join(rootDir, 'server', 'src', 'services', 'db-service.js');
let dbServiceContent = fs.readFileSync(dbServicePath, 'utf8');

const oldGoldDbService = `gold: (typeof u === 'string' && ['khaled', 'خالد', 'rasalmal', 'rasalmal1', 'rasalmal2'].includes(u.trim().toLowerCase())) ? Number(state.gold || 0) : 0,`;
const newGoldDbService = `gold: Math.max(0, Number(state.gold || 0)),`;

if (dbServiceContent.includes(oldGoldDbService)) {
  dbServiceContent = dbServiceContent.replace(oldGoldDbService, newGoldDbService);
  fs.writeFileSync(dbServicePath, dbServiceContent, 'utf8');
  console.log('3. Patched db-service.js successfully');
} else {
  console.log('3. db-service.js already updated or pattern not found');
}

// ==========================================
// 4. PATCH server/src/routes/admin-routes.js
// ==========================================
const adminRoutesPath = path.join(rootDir, 'server', 'src', 'routes', 'admin-routes.js');
let adminRoutesContent = fs.readFileSync(adminRoutesPath, 'utf8');

const oldGatingAdminRoutes = `    // Strict beta gating: developer accounts ('Khaled' / 'خالد') can receive gold
    if (!['khaled', 'خالد', 'rasalmal', 'rasalmal1', 'rasalmal2'].includes(username.trim().toLowerCase())) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Gold currency is in closed beta and can only be granted to developer accounts.'
      });
    }`;

if (adminRoutesContent.includes(oldGatingAdminRoutes)) {
  adminRoutesContent = adminRoutesContent.replace(oldGatingAdminRoutes, '// Allow granting gold to any player via admin');
  fs.writeFileSync(adminRoutesPath, adminRoutesContent, 'utf8');
  console.log('4. Patched admin-routes.js successfully');
}

// ==========================================
// 5. PATCH game.js (loadUserSession gold extraction)
// ==========================================
const gameJsPath = path.join(rootDir, 'game.js');
let gameJs = fs.readFileSync(gameJsPath, 'utf8');

const targetBadgeTitleGame = `badgeTitle: dbState.badgeTitle || (dbState.state && dbState.state.badgeTitle) || '',`;
const replacementBadgeTitleGame = `badgeTitle: dbState.badgeTitle || (dbState.state && dbState.state.badgeTitle) || '',
        gold: Math.max(0, Number(dbState.gold !== undefined && dbState.gold !== null ? dbState.gold : ((dbState.state && dbState.state.gold !== undefined && dbState.state.gold !== null) ? dbState.state.gold : 0))),`;

if (gameJs.includes(targetBadgeTitleGame) && !gameJs.includes('gold: Math.max(0, Number(dbState.gold')) {
  gameJs = gameJs.replace(targetBadgeTitleGame, replacementBadgeTitleGame);
  fs.writeFileSync(gameJsPath, gameJs, 'utf8');
  console.log('5. Patched game.js successfully');
}

// ==========================================
// 6. PATCH db.js (pull fresh gold on stale push)
// ==========================================
const dbJsPath = path.join(rootDir, 'db.js');
let dbJs = fs.readFileSync(dbJsPath, 'utf8');

const targetFreshPush = `window.GameEngine.state.adminModifiedTimestamp = Number(fresh.adminModifiedTimestamp || 0);`;
const replacementFreshPush = `window.GameEngine.state.adminModifiedTimestamp = Number(fresh.adminModifiedTimestamp || 0);
                if (fresh.gold !== undefined || (fresh.state && fresh.state.gold !== undefined)) {
                  window.GameEngine.state.gold = Number(fresh.gold !== undefined ? fresh.gold : fresh.state.gold);
                }`;

if (dbJs.includes(targetFreshPush) && !dbJs.includes('window.GameEngine.state.gold = Number(fresh.gold')) {
  dbJs = dbJs.replace(targetFreshPush, replacementFreshPush);
  fs.writeFileSync(dbJsPath, dbJs, 'utf8');
  console.log('6. Patched db.js successfully');
}

console.log('=== All gold persistence patches applied successfully ===');
