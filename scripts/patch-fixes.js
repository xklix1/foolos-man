const fs = require('fs');
const path = require('path');

const uiPath = path.join(__dirname, '../ui.js');
let ui = fs.readFileSync(uiPath, 'utf8');

// Normalize to LF for clean regex / replace
ui = ui.replace(/\r\n/g, '\n');

// 1. Remove accidental code in forgot pin handler
const forgotPattern = /closeForgotPinModal\(\);\s+const username = u;[\s\S]*?localStorage\.setItem\('rasalmal_active_session_user', canonicalUser\);/g;
ui = ui.replace(forgotPattern, 'closeForgotPinModal();');

// 2. Fix launchGameSession
const launchPattern = /const playerState = await GameEngine\.loadUserSession\(username\);\s+if \(!playerState \|\| playerState\.isBanned \|\| playerState\.is_banned\) \{[\s\S]*?handleBannedUser\('تم حظر هذا الحساب نهائياً من اللعبة لمخالفة قواعد النزاهة\.'\);[\s\S]*?return;[\s\S]*?\}/g;
const launchReplacement = `const playerState = await GameEngine.loadUserSession(username);
      if (!playerState) {
        showToast('تعذر تحميل الحساب ⚠️', 'تعذر جلب بيانات الحساب من الخادم السحابي، يرجى المحاولة مرة أخرى أو تسجيل الدخول.', 'error');
        showStartMenu();
        return;
      }
      if (playerState.isBanned === true || playerState.is_banned === true) {
        handleBannedUser('تم حظر هذا الحساب نهائياً من اللعبة لمخالفة قواعد النزاهة.');
        return;
      }`;

ui = ui.replace(launchPattern, launchReplacement);

// 3. Fix handleBannedUser
const banPurgePattern = /try \{\s+localStorage\.clear\(\);\s+sessionStorage\.clear\(\);\s+\} catch \(e\) \{\}/g;
const banPurgeReplacement = `try {
      localStorage.removeItem('rasalmal_active_session_user');
      if (typeof GameEngine !== 'undefined' && GameEngine.activeUsername) {
        localStorage.removeItem('rasalmal_auth_token_' + GameEngine.activeUsername);
      }
    } catch (e) {}`;

ui = ui.replace(banPurgePattern, banPurgeReplacement);

// Convert back to CRLF
ui = ui.replace(/\n/g, '\r\n');
fs.writeFileSync(uiPath, ui, 'utf8');
console.log('ui.js successfully patched with normalized line endings');
