const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// ==========================================
// 1. PATCH hq-vault-982-x3k8m7q.html
// ==========================================
const hqPath = path.join(rootDir, 'hq-vault-982-x3k8m7q.html');
let hqHtml = fs.readFileSync(hqPath, 'utf8');

if (!hqHtml.includes('id="admin-p-gold"')) {
  const targetBadge = `<span id="admin-p-bank" class="text-sky-400 numbers-font font-black text-xs">0</span> <span class="text-[9px] text-sky-500/70">EGP</span>
                </div>`;
  const replacementBadge = `<span id="admin-p-bank" class="text-sky-400 numbers-font font-black text-xs">0</span> <span class="text-[9px] text-sky-500/70">EGP</span>
                </div>
                <div class="p-1.5 px-2.5 rounded-lg bg-amber-950/30 border border-amber-500/20 text-right">
                  <span class="text-[10px] text-slate-400 block font-bold">🪙 رصيد الذهب:</span>
                  <span id="admin-p-gold" class="text-amber-400 numbers-font font-black text-xs">0</span> <span class="text-[9px] text-amber-500/70">ذهب</span>
                </div>`;
  hqHtml = hqHtml.replace(targetBadge, replacementBadge);
}

if (!hqHtml.includes('id="admin-input-gold"')) {
  const targetInput = `<input type="number" id="admin-input-xp" class="glass-input w-full p-2.5 text-xs text-center font-bold font-mono text-purple-300 border-purple-500/40 focus:border-purple-400 rounded-lg">
                </div>`;
  const replacementInput = `<input type="number" id="admin-input-xp" class="glass-input w-full p-2.5 text-xs text-center font-bold font-mono text-purple-300 border-purple-500/40 focus:border-purple-400 rounded-lg">
                </div>
                <div>
                  <label class="block text-[10px] text-amber-400 mb-1 font-bold">الذهب (Player Gold 🪙)</label>
                  <input type="number" id="admin-input-gold" class="glass-input w-full p-2.5 text-xs text-center font-bold font-mono text-amber-400 border-amber-500/40 focus:border-amber-400 rounded-lg">
                </div>`;
  hqHtml = hqHtml.replace(targetInput, replacementInput);
}

fs.writeFileSync(hqPath, hqHtml, 'utf8');
console.log('1. Patched hq-vault-982-x3k8m7q.html successfully');

// ==========================================
// 2. PATCH admin-panel.js
// ==========================================
const adminJsPath = path.join(rootDir, 'admin-panel.js');
let adminJs = fs.readFileSync(adminJsPath, 'utf8');

// A. In selectPlayerForModeration, populate gold
if (!adminJs.includes("const goldEl = document.getElementById('admin-p-gold');")) {
  const targetSelect = `document.getElementById('admin-input-cash').value = state.cash || 0;`;
  const replacementSelect = `const goldEl = document.getElementById('admin-p-gold');
        if (goldEl) goldEl.textContent = Number(state.gold || (state.state && state.state.gold) || 0).toLocaleString();
        const goldInp = document.getElementById('admin-input-gold');
        if (goldInp) goldInp.value = Number(state.gold || (state.state && state.state.gold) || 0);

        document.getElementById('admin-input-cash').value = state.cash || 0;`;
  adminJs = adminJs.replace(targetSelect, replacementSelect);
}

// B. In updateMoneyBtn, define newGold and update gold in UI
if (!adminJs.includes("const newGold = goldInp ? Number(goldInp.value)")) {
  const targetUpdateMoney = `const newCash = Number(document.getElementById('admin-input-cash').value);
        const newBank = Number(document.getElementById('admin-input-bank').value);
        const xpInp = document.getElementById('admin-input-xp');
        const newXp = xpInp ? Number(xpInp.value) : (selectedPlayerState.xp || 0);`;
  
  const replacementUpdateMoney = `const newCash = Number(document.getElementById('admin-input-cash').value);
        const newBank = Number(document.getElementById('admin-input-bank').value);
        const xpInp = document.getElementById('admin-input-xp');
        const newXp = xpInp ? Number(xpInp.value) : (selectedPlayerState.xp || 0);
        const goldInp = document.getElementById('admin-input-gold');
        const newGold = goldInp ? Number(goldInp.value) : Number(selectedPlayerState.gold || (selectedPlayerState.state && selectedPlayerState.state.gold) || 0);`;
  adminJs = adminJs.replace(targetUpdateMoney, replacementUpdateMoney);
}

// C. In updateMoneyBtn, ensure gold badge is updated
if (!adminJs.includes("const goldBadgeEl = document.getElementById('admin-p-gold');")) {
  const targetBadges = `document.getElementById('admin-p-cash').textContent = newCash.toLocaleString();
          document.getElementById('admin-p-bank').textContent = newBank.toLocaleString();`;
  const replacementBadges = `document.getElementById('admin-p-cash').textContent = newCash.toLocaleString();
          document.getElementById('admin-p-bank').textContent = newBank.toLocaleString();
          const goldBadgeEl = document.getElementById('admin-p-gold');
          if (goldBadgeEl) goldBadgeEl.textContent = newGold.toLocaleString();`;
  adminJs = adminJs.replace(targetBadges, replacementBadges);
}

// D. Add btn-admin-instant-add-gold event listener
if (!adminJs.includes("const instantAddGoldBtn = document.getElementById('btn-admin-instant-add-gold');")) {
  const targetEndInstant = `instantAddBtn.disabled = false;
          instantAddBtn.innerHTML = '<i class="fa-solid fa-plus-circle text-sm"></i> <span>إضافة المبلغ فوراً</span>';
        }
      });
    }`;

  const instantGoldCode = `instantAddBtn.disabled = false;
          instantAddBtn.innerHTML = '<i class="fa-solid fa-plus-circle text-sm"></i> <span>إضافة المبلغ فوراً</span>';
        }
      });
    }

    // Instant Gold Addition Action (Direct Real-time Sync to player)
    const instantAddGoldBtn = document.getElementById('btn-admin-instant-add-gold');
    if (instantAddGoldBtn) {
      instantAddGoldBtn.addEventListener('click', async () => {
        if (!selectedPlayer) {
          showToast('إضافة ذهب', 'يرجى اختيار لاعب أولاً من القائمة.', 'error');
          return;
        }

        const amountInp = document.getElementById('admin-instant-add-gold-amount');
        const amount = Number(amountInp ? amountInp.value : 0);

        if (isNaN(amount) || amount <= 0) {
          showToast('كمية غير صالحة', 'يرجى إدخال كمية ذهب صحيحة وموجبة أكبر من صفر.', 'error');
          if (amountInp) amountInp.focus();
          return;
        }

        const confirmMsg = \`🪙 تأكيد إضافة الذهب الفوري:\n\nهل أنت متأكد من إضافة \${amount.toLocaleString()} ذهبة للاعب "\${selectedPlayer}"؟\n\nسيتم زيادة الذهب وحفظه في السحابة فوراً مع إشعار اللاعب.\`;
        if (!confirm(confirmMsg)) return;

        try {
          instantAddGoldBtn.disabled = true;
          instantAddGoldBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>جاري إضافة الذهب وتحديث حساب اللاعب...</span>';

          // 1. Fetch freshest state from database
          const freshPlayer = await AppDB.adminGetPlayer(selectedPlayer) || selectedPlayerState || {};
          const currentGold = Number(freshPlayer.gold ?? (freshPlayer.state && freshPlayer.state.gold) ?? 0);
          const newGold = currentGold + amount;
          const now = Date.now();

          freshPlayer.gold = newGold;
          freshPlayer.adminModifiedTimestamp = now;
          freshPlayer.isReset = false;
          delete freshPlayer.resetTimestamp;
          if (freshPlayer.state && typeof freshPlayer.state === 'object') {
            freshPlayer.state.gold = newGold;
            freshPlayer.state.isReset = false;
            delete freshPlayer.state.resetTimestamp;
          }

          if (selectedPlayerState) {
            selectedPlayerState.gold = newGold;
            selectedPlayerState.adminModifiedTimestamp = now;
            selectedPlayerState.isReset = false;
            delete selectedPlayerState.resetTimestamp;
            if (selectedPlayerState.state && typeof selectedPlayerState.state === 'object') {
              selectedPlayerState.state.gold = newGold;
              selectedPlayerState.state.isReset = false;
              delete selectedPlayerState.state.resetTimestamp;
            }
          }

          const canonicalUsername = freshPlayer.username || selectedPlayer;

          // 2. Save directly to Supabase with latest adminModifiedTimestamp
          await AppDB.adminSavePlayer(canonicalUsername, freshPlayer);

          // 3. Dispatch high-priority real-time gold grant mail to player's client
          const grantPayload = {
            addedGold: amount,
            newGold: newGold,
            isPreApplied: true,
            timestamp: now
          };

          await AppDB.sendMail('إدارة اللعبة (Admin)', canonicalUsername, 'admin_gold_grant', grantPayload);

          // 4. Ensure pendingAdminPopup is null
          if (freshPlayer.pendingAdminPopup) delete freshPlayer.pendingAdminPopup;

          // 5. If this admin is the active player locally, immediately update in-memory GameEngine
          if (selectedPlayer === GameEngine.activeUsername) {
            GameEngine.state.gold = newGold;
            GameEngine.state.adminModifiedTimestamp = now;
            try {
              if (typeof AppDB !== 'undefined' && typeof AppDB.setEncryptedLocalState === 'function') {
                AppDB.setEncryptedLocalState(\`rasalmal_state_\${selectedPlayer}\`, GameEngine.state);
              }
            } catch (e) {}
            if (typeof renderAll === 'function') renderAll();
          }

          // 6. Update UI in Admin Dashboard
          const goldEl = document.getElementById('admin-p-gold');
          if (goldEl) goldEl.textContent = newGold.toLocaleString();

          const goldInp = document.getElementById('admin-input-gold');
          if (goldInp) goldInp.value = newGold;

          if (amountInp) amountInp.value = '';

          // 7. Update in cachedPlayers table
          if (Array.isArray(cachedPlayers)) {
            const pIdx = cachedPlayers.findIndex(p => p.username === selectedPlayer);
            if (pIdx !== -1) {
              cachedPlayers[pIdx].gold = newGold;
              if (cachedPlayers[pIdx].state) cachedPlayers[pIdx].state.gold = newGold;
            }
            renderPlayersTable();
          }

          showToast('تمت إضافة الذهب بنجاح 🪙', \`تمت إضافة \${amount.toLocaleString()} ذهبة لحساب اللاعب [\${selectedPlayer}] فوراً! الرصيد الجديد: \${newGold.toLocaleString()} ذهبة.\`, 'success');
          logAdminAction(\`إضافة ذهب فوري بقيمة \${amount.toLocaleString()} ذهبة للاعب \${selectedPlayer}\`);

        } catch (err) {
          console.error('[Instant Add Gold Error]', err);
          showToast('فشل إضافة الذهب', err.message || 'حدث خطأ أثناء الاتصال بقاعدة البيانات', 'error');
        } finally {
          instantAddGoldBtn.disabled = false;
          instantAddGoldBtn.innerHTML = '<i class="fa-solid fa-plus-circle text-sm"></i> <span>إضافة الذهب فوراً</span>';
        }
      });
    }`;

  adminJs = adminJs.replace(targetEndInstant, instantGoldCode);
}

fs.writeFileSync(adminJsPath, adminJs, 'utf8');
console.log('2. Patched admin-panel.js successfully');

// ==========================================
// 3. PATCH ui.js (Live Gold Grant Sync)
// ==========================================
const uiJsPath = path.join(rootDir, 'ui.js');
let uiJs = fs.readFileSync(uiJsPath, 'utf8');

if (!uiJs.includes("m.type === 'admin_gold_grant'")) {
  const targetMailBlock = `    // 0. Process incoming Direct Admin Popup Messages`;
  const replacementMailBlock = `    // 0.06. Process incoming Instant Admin Gold Grants (Live in-game gold injection)
    const goldMails = mails.filter(m => m.type === 'admin_gold_grant' && (m.status === 'unread' || m.status === 'pending'));
    for (const gm of goldMails) {
      if (!window._processedGoldGrantIds) window._processedGoldGrantIds = new Set();
      if (window._processedGoldGrantIds.has(gm.id)) continue;
      window._processedGoldGrantIds.add(gm.id);

      const p = gm.payload || {};
      const addGold = Number(p.addedGold) || 0;

      if (GameEngine.state && addGold > 0) {
        if (p.isPreApplied && p.newGold !== undefined) {
          GameEngine.state.gold = Number(p.newGold);
        } else {
          GameEngine.state.gold = (Number(GameEngine.state.gold) || 0) + addGold;
        }

        const grantTs = Number(p.timestamp || gm.created_at || Date.now());
        GameEngine.state.adminModifiedTimestamp = Math.max(Number(GameEngine.state.adminModifiedTimestamp || 0), grantTs);
        GameEngine.state._legitimateTransactionBypass = true;

        try {
          if (typeof AppDB !== 'undefined' && typeof AppDB.setEncryptedLocalState === 'function') {
            AppDB.setEncryptedLocalState(\`rasalmal_state_\${GameEngine.activeUsername}\`, GameEngine.state);
          }
        } catch (_) {}

        await AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state, true);
        await AppDB.updateMailStatus(gm.id, 'read');

        if (typeof playMenuSound === 'function') playMenuSound('level-up');
        if (typeof renderAll === 'function') renderAll();

        showToast(
          '🪙 إيداع ذهب إداري فوري!',
          \`تمت إضافة +\${addGold.toLocaleString()} ذهبة إلى حسابك فوراً من قبل الإدارة. الرصيد الإجمالي: \${Number(GameEngine.state.gold).toLocaleString()} ذهبة.\`,
          'success'
        );
        break;
      }
    }

    // 0. Process incoming Direct Admin Popup Messages`;
  uiJs = uiJs.replace(targetMailBlock, replacementMailBlock);
  fs.writeFileSync(uiJsPath, uiJs, 'utf8');
  console.log('3. Patched ui.js for live gold mail reception successfully');
}

// ==========================================
// 4. UPDATE sync-all-versions.js
// ==========================================
const syncScriptPath = path.join(rootDir, 'scripts', 'sync-all-versions.js');
let syncScript = fs.readFileSync(syncScriptPath, 'utf8');

if (!syncScript.includes('hq-vault-982-x3k8m7q.html')) {
  const hqSyncCode = `
// 1.1 Update hq-vault-982-x3k8m7q.html
const hqHtmlPath = path.join(rootDir, 'hq-vault-982-x3k8m7q.html');
if (fs.existsSync(hqHtmlPath)) {
  let hqHtml = fs.readFileSync(hqHtmlPath, 'utf8');
  hqHtml = hqHtml.replace(/href="app\\.css\\?v=[^"]+"/g, \`href="app.css?v=\${currentVersion}"\`);
  hqHtml = hqHtml.replace(/src="game\\.js\\?v=[^"]+"/g, \`src="game.js?v=\${currentVersion}"\`);
  hqHtml = hqHtml.replace(/src="db\\.js\\?v=[^"]+"/g, \`src="db.js?v=\${currentVersion}"\`);
  hqHtml = hqHtml.replace(/src="admin-panel\\.js\\?v=[^"]+"/g, \`src="admin-panel.js?v=\${currentVersion}"\`);
  fs.writeFileSync(hqHtmlPath, hqHtml, 'utf8');
  console.log(\`Updated hq-vault-982-x3k8m7q.html to \${currentVersion} (all scripts/css tags)\`);
}
`;
  syncScript = syncScript.replace("// 2. Update sw.js", hqSyncCode + "\n// 2. Update sw.js");
  fs.writeFileSync(syncScriptPath, syncScript, 'utf8');
  console.log('4. Updated scripts/sync-all-versions.js successfully');
}
