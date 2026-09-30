const fs = require('fs');
const path = require('path');

const adminJsPath = path.join(__dirname, '..', 'admin-panel.js');
let adminJs = fs.readFileSync(adminJsPath, 'utf8');

const searchStr = '    // Business Moderation Event Listeners';

if (!adminJs.includes('btn-admin-instant-add-gold')) {
  const instantGoldCode = `    // Instant Gold Addition Action (Direct Real-time Sync to player)
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
    }

`;

  adminJs = adminJs.replace(searchStr, instantGoldCode + searchStr);
  fs.writeFileSync(adminJsPath, adminJs, 'utf8');
  console.log('Successfully inserted btn-admin-instant-add-gold event listener into admin-panel.js!');
} else {
  console.log('btn-admin-instant-add-gold already present in admin-panel.js');
}
