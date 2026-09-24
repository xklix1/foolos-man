const fs = require('fs');

// ==========================================
// 1. Update index.html
// ==========================================
let indexHtml = fs.readFileSync('index.html', 'utf8');
const modalSuspicionHtml = `  <!-- ==================== ACCOUNT UNDER SUSPICION LOCKED MODAL (شاشة حسابك تحت الشبهة) ==================== -->
  <div id="modal-account-under-suspicion" dir="rtl"
    class="hidden fixed inset-0 z-[999999] flex items-center justify-center bg-black/92 backdrop-blur-lg p-4 animate-fade-in text-right">
    <div class="glass-panel w-full max-w-md rounded-3xl border-2 border-amber-500/60 p-6 sm:p-7 shadow-2xl bg-gradient-to-b from-slate-900/98 via-slate-950 to-black text-right relative overflow-hidden space-y-5">
      
      <!-- Top Ambient Glow -->
      <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-36 bg-amber-500/25 blur-3xl rounded-full pointer-events-none"></div>

      <!-- Icon & Warning Header -->
      <div class="flex flex-col items-center text-center space-y-3 pt-2 relative z-10">
        <div class="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-slate-950 flex items-center justify-center text-2xl font-black shadow-xl shadow-orange-500/30 animate-pulse">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <div>
          <span class="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs inline-block mb-1.5">
            تنبيه أمني إداري ⚠️
          </span>
          <h3 class="text-xl font-black text-white">حسابك تحت الشبهة</h3>
        </div>
      </div>

      <!-- Body Message -->
      <div class="space-y-3 text-xs sm:text-sm text-slate-300 text-center leading-relaxed relative z-10 bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
        <p class="font-bold text-amber-200">
          تم تعليق نشاط حسابك مؤقتاً لوجود شبهة نشاط غير اعتيادي يتطلب التحقق.
        </p>
        <p class="text-slate-400 text-xs">
          يرجى التواصل الفوري مع صفحة الفيسبوك الرسمية لتأكيد بيانات الحساب ورفع التعليق من قبل إدارة اللعبة.
        </p>
      </div>

      <!-- Action Button (Facebook Link) -->
      <div class="space-y-2 relative z-10">
        <a href="https://www.facebook.com/profile.php?id=61578368735393" target="_blank" rel="noopener noreferrer"
          class="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-blue-600/30 transition transform active:scale-95 no-underline">
          <i class="fa-brands fa-facebook text-base"></i>
          <span>مراسلة صفحة الفيسبوك الرسمية 💬</span>
        </a>
        
        <p class="text-[11px] text-center text-slate-500 font-medium">
          🔒 هذه الشاشة مثبتة إدارياً ولن يتم إغلاقها حتى مراجعة الحساب.
        </p>
      </div>

    </div>
  </div>\n\n`;

if (!indexHtml.includes('modal-account-under-suspicion')) {
  const insertTarget = '<!-- ==================== DIRECT ADMIN POPUP MODAL';
  if (indexHtml.includes(insertTarget)) {
    indexHtml = indexHtml.replace(insertTarget, modalSuspicionHtml + insertTarget);
    fs.writeFileSync('index.html', indexHtml, 'utf8');
    console.log('1. Added modal-account-under-suspicion to index.html');
  }
}

// ==========================================
// 2. Update db.js
// ==========================================
let dbJs = fs.readFileSync('db.js', 'utf8');
const adminSuspicionFn = `
  async function adminSetPlayerSuspicion(username, underSuspicion = true) {
    if (!username) throw new Error('اسم المستخدم مطلوب');
    const u = String(username).trim();
    const now = Date.now();
    const rows = await _api(\`players?username=ilike.\${encodeURIComponent(u)}\`);
    if (!rows || rows.length === 0) throw new Error('اللاعب غير موجود');
    const row = rows[0];
    const curState = (typeof row.state === 'string') ? JSON.parse(row.state) : (row.state || {});
    curState.underSuspicion = Boolean(underSuspicion);
    curState.adminModifiedTimestamp = now;
    await _api(\`players?username=ilike.\${encodeURIComponent(u)}\`, {
      method: 'PATCH',
      body: JSON.stringify({
        state: curState,
        admin_modified_timestamp: now
      })
    });
    return true;
  }
`;

if (!dbJs.includes('adminSetPlayerSuspicion')) {
  dbJs = dbJs.replace('async function adminBanPlayer', adminSuspicionFn + '\n  async function adminBanPlayer');
  dbJs = dbJs.replace('adminBanPlayer,', 'adminBanPlayer,\n    adminSetPlayerSuspicion,');
  fs.writeFileSync('db.js', dbJs, 'utf8');
  console.log('2. Added adminSetPlayerSuspicion to db.js');
}

// ==========================================
// 3. Update admin-panel.js
// ==========================================
let adminJs = fs.readFileSync('admin-panel.js', 'utf8');

// In selectPlayerForModeration, update suspicion status badge & button text
const suspicionSelectSnippet = `
        const suspicionBtn = document.getElementById('btn-admin-toggle-suspicion-lock');
        const suspicionText = document.getElementById('admin-toggle-suspicion-text');
        const isUnderSuspicion = Boolean(state.underSuspicion || (state.state && state.state.underSuspicion));
        if (suspicionBtn && suspicionText) {
          if (isUnderSuspicion) {
            suspicionText.textContent = 'إلغاء تثبيت شاشة الشبهة (فك التجميد) 🔓';
            suspicionBtn.className = 'w-full py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer';
          } else {
            suspicionText.textContent = 'تثبيت شاشة (حسابك تحت الشبهة) ⚠️';
            suspicionBtn.className = 'w-full py-2 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20 cursor-pointer';
          }
        }
`;

if (!adminJs.includes('btn-admin-toggle-suspicion-lock')) {
  adminJs = adminJs.replace("const fbText = document.getElementById('admin-toggle-fb-text');", suspicionSelectSnippet + "\n        const fbText = document.getElementById('admin-toggle-fb-text');");

  // In status badge logic:
  const badgeTarget = "if (state.isBanned) {";
  const badgeReplacement = `if (state.isBanned) {
            statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block ml-1"></span>محظور نهائياً ⛔';
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center';
          } else if (isUnderSuspicion) {
            statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce inline-block ml-1"></span>تحت الشبهة ⚠️ (الشاشة مثبتة)';
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20 flex items-center';`;
  adminJs = adminJs.replace(badgeTarget, badgeReplacement);

  // In click handler setup:
  const clickHandler = `
    // Toggle Account Suspicion Lock Action
    const toggleSuspicionBtn = document.getElementById('btn-admin-toggle-suspicion-lock');
    if (toggleSuspicionBtn) {
      toggleSuspicionBtn.addEventListener('click', async () => {
        if (!selectedPlayer || !selectedPlayerState) {
          showToast('إدارة اللاعب', 'يرجى اختيار لاعب أولاً من القائمة.', 'error');
          return;
        }
        const currentSuspicion = Boolean(selectedPlayerState.underSuspicion || (selectedPlayerState.state && selectedPlayerState.state.underSuspicion));
        const newSuspicion = !currentSuspicion;
        const targetUser = selectedPlayer;
        const confirmMsg = newSuspicion
          ? \`⚠️ تأكيد تثبيت شاشة الشبهة:\\nهل أنت متأكد من تثبيت شاشة [حسابك تحت الشبهة يرجى التواصل مع صفحة الفيسبوك] على حساب اللاعب "\${targetUser}"؟\\nستظهر الشاشة فوراً أمامه وتمنعه من اللعب حتى تقوم بإلغائها.\`
          : \`تأكيد رفع التجميد:\\nهل أنت متأكد من إلغاء تثبيت شاشة الشبهة عن حساب اللاعب "\${targetUser}"؟\`;

        if (!confirm(confirmMsg)) return;

        try {
          toggleSuspicionBtn.disabled = true;
          toggleSuspicionBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري تحديث الحالة...';

          await AppDB.adminSetPlayerSuspicion(targetUser, newSuspicion);
          selectedPlayerState.underSuspicion = newSuspicion;
          if (selectedPlayerState.state) selectedPlayerState.state.underSuspicion = newSuspicion;

          showToast(
            newSuspicion ? 'تم التثبيت ⚠️' : 'تم رفع التجميد 🔓',
            newSuspicion ? \`تم تثبيت شاشة الشبهة على حساب \${targetUser} بنجاح.\` : \`تم إلغاء تثبيت شاشة الشبهة عن حساب \${targetUser}.\`,
            'success'
          );
          logAdminAction(\`\${newSuspicion ? 'تثبيت' : 'إلغاء'} شاشة (حسابك تحت الشبهة) على حساب اللاعب: \${targetUser}\`);
          selectPlayerForModeration(targetUser);
        } catch (err) {
          showToast('خطأ في العملية', err.message, 'error');
        } finally {
          toggleSuspicionBtn.disabled = false;
        }
      });
    }
`;

  adminJs = adminJs.replace('// Change Player PIN', clickHandler + '\n    // Change Player PIN');
  fs.writeFileSync('admin-panel.js', adminJs, 'utf8');
  console.log('3. Added suspicion lock handlers to admin-panel.js');
}

// ==========================================
// 4. Update ui.js
// ==========================================
let uiJs = fs.readFileSync('ui.js', 'utf8');
const enforceSuspicionCode = `
  function enforceSuspicionStatus(isUnderSuspicion) {
    const modal = document.getElementById('modal-account-under-suspicion');
    if (!modal) return;
    if (isUnderSuspicion === true) {
      modal.classList.remove('hidden');
    } else {
      modal.classList.add('hidden');
    }
  }
`;

if (!uiJs.includes('enforceSuspicionStatus')) {
  uiJs = uiJs.replace('function showDirectAdminPopupModal', enforceSuspicionCode + '\n  function showDirectAdminPopupModal');
  
  // In loadUserSession callback:
  uiJs = uiJs.replace(
    'const canonicalUser = (playerState && playerState.username) ? playerState.username : username;',
    `const canonicalUser = (playerState && playerState.username) ? playerState.username : username;
      if (playerState && (playerState.underSuspicion === true || (playerState.state && playerState.state.underSuspicion === true))) {
        enforceSuspicionStatus(true);
      }`
  );

  // In periodic watchdog check:
  const watchdogTarget = "if (typeof checkMaintenanceMode === 'function') {";
  const watchdogSuspicion = `if (GameEngine.state) {
        const isSusp = Boolean(GameEngine.state.underSuspicion || (GameEngine.state.state && GameEngine.state.state.underSuspicion));
        enforceSuspicionStatus(isSusp);
      }
      if (typeof checkMaintenanceMode === 'function') {`;
  uiJs = uiJs.replace(watchdogTarget, watchdogSuspicion);

  fs.writeFileSync('ui.js', uiJs, 'utf8');
  console.log('4. Added enforceSuspicionStatus to ui.js');
}
