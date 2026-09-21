const fs = require('fs');
const file = 'hq-vault-982-x3k8m7q.html';
let content = fs.readFileSync(file, 'utf8');

const standbyJsHook = `// Direct Standby Mode Toggle Hook
      const standbyToggleBtn = document.getElementById('btn-admin-toggle-standby');
      const standbyBadge = document.getElementById('admin-standby-badge');
      const standbyBtnText = document.getElementById('admin-standby-btn-text');
      const standbyFbUrlInput = document.getElementById('admin-standby-fb-url');

      function syncStandbyUI(isStandby, fbUrl) {
        if (standbyBadge) {
          if (isStandby) {
            standbyBadge.textContent = 'وضع الاستعداد نشط ⏳';
            standbyBadge.className = 'text-[10px] px-2.5 py-0.5 bg-purple-500/20 text-purple-300 rounded border border-purple-500/40 font-bold animate-pulse';
          } else {
            standbyBadge.textContent = 'متوقف';
            standbyBadge.className = 'text-[10px] px-2.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700 font-bold';
          }
        }
        if (standbyFbUrlInput && fbUrl) {
          standbyFbUrlInput.value = fbUrl;
        }
        if (standbyToggleBtn) {
          const text = isStandby
            ? 'إنهاء وضع الاستعداد وإعادة فتح اللعبة للجميع'
            : 'تفعيل وضع الاستعداد وعرض الشاشة للجميع';
          const icon = isStandby ? 'fa-solid fa-play' : 'fa-solid fa-hourglass-start';
          standbyToggleBtn.innerHTML = \`<i class="\${icon}"></i> <span id="admin-standby-btn-text">\${text}</span>\`;
          if (isStandby) {
            standbyToggleBtn.className = 'w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer';
          } else {
            standbyToggleBtn.className = 'w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs transition shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer';
          }
        }
      }

      // Initial check for Standby Status from Supabase via AppDB
      if (typeof AppDB !== 'undefined' && typeof AppDB.getStandbyStatus === 'function') {
        AppDB.getStandbyStatus().then(st => {
          if (st) syncStandbyUI(Boolean(st.active || st.enabled), st.facebook_url);
        }).catch(() => {});
      }

      if (standbyToggleBtn && !standbyToggleBtn.dataset.boundDirect) {
        standbyToggleBtn.dataset.boundDirect = 'true';
        standbyToggleBtn.onclick = async () => {
          let currentActive = false;
          try {
            standbyToggleBtn.disabled = true;
            try {
              if (typeof AppDB !== 'undefined' && typeof AppDB.getStandbyStatus === 'function') {
                const status = await AppDB.getStandbyStatus();
                if (status) currentActive = Boolean(status.active || status.enabled);
              }
            } catch (e) {}

            const nextState = !currentActive;
            const confirmMsg = nextState
              ? "⏳ تنبيه إداري عاجل:\\n\\nهل أنت متأكد من تفعيل وضع الاستعداد لجميع اللاعبين؟\\n\\nستظهر شاشة منبثقة للاعبين تحتوي على زر إعادة التحميل وزر متابعة صفحة الفيسبوك."
              : "✅ هل تريد إنهاء وضع الاستعداد والعودة للتشغيل الطبيعي للجميع؟";

            if (!confirm(confirmMsg)) {
              standbyToggleBtn.disabled = false;
              return;
            }

            standbyToggleBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> <span>جاري تطبيق التعديل...</span>';

            const fbUrl = (standbyFbUrlInput && standbyFbUrlInput.value.trim()) || 'https://www.facebook.com';

            if (typeof AppDB !== 'undefined' && typeof AppDB.setStandbyStatus === 'function') {
              await AppDB.setStandbyStatus(nextState, nextState ? 'الخوادم رهن وضع الاستعداد والتجهيز للموسم الثاني.' : '', fbUrl);
            }

            syncStandbyUI(nextState, fbUrl);

            if (nextState) {
              showToast('وضع الاستعداد نشط ⏳', 'تم تفعيل وضع الاستعداد وعرض الشاشة لجميع اللاعبين بنجاح!', 'warning');
            } else {
              showToast('الخوادم مفتوحة ✅', 'تم إنهاء وضع الاستعداد وإعادة فتح الخوادم بنجاح!', 'success');
            }
          } catch (err) {
            syncStandbyUI(currentActive);
            showToast('خطأ', 'فشل تغيير حالة الاستعداد: ' + (err.message || err), 'error');
          } finally {
            standbyToggleBtn.disabled = false;
          }
        };
      }

      `;

const idx = content.indexOf('Direct Staging Sandbox Toggle Hook');
if (idx !== -1 && !content.includes('Direct Standby Mode Toggle Hook')) {
  // Find the start of the comment line
  const lastLineStart = content.lastIndexOf('//', idx);
  content = content.slice(0, lastLineStart) + standbyJsHook + content.slice(lastLineStart);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully added JS hook to ' + file);
} else {
  console.log('JS hook already present or anchor not found');
}
