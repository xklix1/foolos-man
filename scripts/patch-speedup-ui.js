const fs = require('fs');
const path = require('path');

const uiPath = path.join(__dirname, '..', 'ui.js');
let uiContent = fs.readFileSync(uiPath, 'utf8');

const targetFuncStart = '  async function requestSpeedUp(timerType, targetKey) {';
const targetFuncEnd = '  function updateJailOverlaySpeedupUI(jailSec) {';

const newSpeedupFunc = `  async function requestSpeedUp(timerType, targetKey) {
    if (!isKhaledUser()) return;

    const username = (typeof getActiveUsernameSafe === 'function' && getActiveUsernameSafe()) || (GameEngine.state && GameEngine.state.username) || 'Khaled';
    const base = (window.SERVER_API_URL || '').replace(/\\/$/, '') || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : '');
    const token = (typeof ServerBridge !== 'undefined' && ServerBridge.sessionToken) || (typeof AppDB !== 'undefined' && AppDB.getSessionToken && AppDB.getSessionToken()) || '';

    try {
      const s = (typeof GameEngine !== 'undefined' && GameEngine.state) ? GameEngine.state : null;
      if (!s) return;
      const currentGold = Math.max(0, Number(s.gold || 0));
      let goldDeducted = 1;

      // 1. Authoritative client deduction & validation
      if (timerType === 'jail') {
        const jailSec = Number(s.jailTimer || 0);
        goldDeducted = Math.max(1, Math.ceil(jailSec / 600));
        if (currentGold < goldDeducted) {
          showToast('رصيد ذهب غير كافٍ', \`تحتاج إلى \${goldDeducted} ذهب لتسريع هذا المؤقت. رصيدك الحالي: \${currentGold} 🪙\`, 'error');
          return;
        }
        s.gold = currentGold - goldDeducted;
        s.jailTimer = 0;
      } else if (timerType === 'cooldown' && targetKey) {
        const map = { loan: 'loanCooldownUntil', work: 'workCooldownUntil', casino: 'casinoCooldownUntil' };
        const prop = map[targetKey];
        if (prop) {
          const remMs = Math.max(0, Number(s[prop] || 0) - Date.now());
          goldDeducted = Math.max(1, Math.ceil(remMs / 600000));
          if (currentGold < goldDeducted) {
            showToast('رصيد ذهب غير كافٍ', \`تحتاج إلى \${goldDeducted} ذهب لتسريع هذا المؤقت. رصيدك الحالي: \${currentGold} 🪙\`, 'error');
            return;
          }
          s.gold = currentGold - goldDeducted;
          s[prop] = 0;
        }
      } else if (timerType === 'smuggling') {
        if (Array.isArray(s.activeSmugglingJobs)) {
          const sj = s.activeSmugglingJobs.find(j => String(j.id) === String(targetKey)) || s.activeSmugglingJobs[Number(targetKey)] || s.activeSmugglingJobs[0];
          if (sj) {
            const remMs = Math.max(0, (sj.endTime || sj.finishTime || sj.expiresAt || 0) - Date.now());
            goldDeducted = Math.max(1, Math.ceil(remMs / 600000));
            if (currentGold < goldDeducted) {
              showToast('رصيد ذهب غير كافٍ', \`تحتاج إلى \${goldDeducted} ذهب لتسريع هذا المؤقت. رصيدك الحالي: \${currentGold} 🪙\`, 'error');
              return;
            }
            s.gold = currentGold - goldDeducted;
            sj.endTime = Date.now() - 1000;
            sj.finishTime = Date.now() - 1000;
            sj.expiresAt = Date.now() - 1000;
            sj.ready = true;
          }
        }
      }

      // 2. Handle UI and post-execution triggers
      if (timerType === 'jail') {
        const jailOverlay = document.getElementById('jail-overlay');
        if (jailOverlay) jailOverlay.classList.add('hidden');
      }

      if (timerType === 'cooldown' && targetKey === 'work') {
        if (workCooldownTimer) {
          clearInterval(workCooldownTimer);
          workCooldownTimer = null;
        }
        workCooldownActive = false;
        const jobWorkBtn = document.getElementById('btn-job-work');
        if (jobWorkBtn) {
          jobWorkBtn.disabled = false;
          jobWorkBtn.style.opacity = '';
          jobWorkBtn.style.cursor = 'pointer';
          jobWorkBtn.innerHTML = '<i class="fa-solid fa-briefcase ml-2"></i> بدء وردية العمل الفورية';
        }
      }

      if (timerType === 'smuggling') {
        if (typeof GameEngine.processTick === 'function') GameEngine.processTick();
        if (typeof updateActiveSmugglingJobsInDOM === 'function') {
          updateActiveSmugglingJobsInDOM();
        }
      }

      // 3. Persist state immediately to Cloud & Local Storage
      if (typeof AppDB !== 'undefined' && typeof AppDB.savePlayerState === 'function') {
        try { await AppDB.savePlayerState(username, s, true); } catch (e) {}
      } else if (typeof GameEngine !== 'undefined' && GameEngine.forceSaveState) {
        try { await GameEngine.forceSaveState(true); } catch (e) {}
      }

      // 4. Background Server Notification
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = \`Bearer \${token}\`;
        fetch(\`\${base}/api/action/speed-up\`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ username, timerType, targetKey, token, goldDeducted, newGold: s.gold })
        }).catch(() => {});
      } catch (_) {}

      showToast('تم التسريع بنجاح ⚡', \`تم إنهاء المؤقت بنجاح وخصم \${goldDeducted} 🪙 ذهب. الرصيد المتبقي: \${Number(s.gold).toLocaleString()} 🪙\`, 'success');
      if (typeof playMenuSound === 'function') playMenuSound('success');
      if (typeof renderAll === 'function') renderAll();
    } catch (err) {
      console.error('[SpeedUp] Error:', err);
      showToast('خطأ في التسريع', err.message || 'تعذر تسريع المؤقت.', 'error');
    }
  }

`;

const startIdx = uiContent.indexOf(targetFuncStart);
const endIdx = uiContent.indexOf(targetFuncEnd);

if (startIdx !== -1 && endIdx !== -1) {
  uiContent = uiContent.substring(0, startIdx) + newSpeedupFunc + uiContent.substring(endIdx);
  fs.writeFileSync(uiPath, uiContent, 'utf8');
  console.log('Successfully updated requestSpeedUp in ui.js');
} else {
  console.error('Could not find function markers in ui.js');
}
