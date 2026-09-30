const fs = require('fs');
const path = require('path');

// 1. Update index.html
const indexPath = path.join(__dirname, '..', 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

// Replace the modal header and view-packages container
const oldModalSnippet = `      <!-- Modal Body (Scrollable) -->
      <div class="flex-1 overflow-y-auto py-3 space-y-4 custom-scrollbar text-xs">

        <!-- VIEW 1: PACKAGES SHOWCASE -->
        <div id="topup-view-packages" class="space-y-4">
          <!-- Guarantee Banner -->
          <div class="p-3 sm:p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-slate-950 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-[11px]">
            <div class="flex items-center gap-2.5">
              <i class="fa-solid fa-shield-check text-amber-400 text-lg shrink-0"></i>
              <span class="text-slate-300">تحويل مباشر وسريع وآمن عبر <strong>فودافون كاش</strong> أو <strong>InstaPay</strong> أو <strong>PayPal</strong> مع إيداع المكافآت بحسابك فوراً.</span>
            </div>
            <span class="text-[10px] px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-xl font-black shrink-0 hidden sm:inline-block">فوري ومعتمد</span>
          </div>

          <!-- Packages Grid -->
          <div id="topup-packages-container" class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <!-- Dynamically populated from AppDB.getTopupPackages() -->
          </div>`;

const newModalSnippet = `      <!-- Modal Body (Scrollable) -->
      <div class="flex-1 overflow-y-auto py-3 space-y-4 custom-scrollbar text-xs">

        <!-- VIEW 1: PACKAGES SHOWCASE -->
        <div id="topup-view-packages" class="space-y-4">
          
          <!-- Player Balance Strip & Guarantee -->
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div class="sm:col-span-7 p-3 bg-gradient-to-r from-amber-950/40 via-slate-900/70 to-slate-950 border border-amber-500/30 rounded-2xl flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-base shrink-0">
                <i class="fa-solid fa-shield-halved"></i>
              </div>
              <div class="min-w-0">
                <span class="text-[11px] text-white font-bold block">شحن فوري ومعتمد 100%</span>
                <span class="text-[10px] text-slate-400 block truncate">فودافون كاش • انستاباي • باي بال مع إيداع فوري بحسابك</span>
              </div>
            </div>

            <div class="sm:col-span-5 p-2.5 bg-slate-950/90 border border-slate-800 rounded-2xl flex items-center justify-between gap-2">
              <span class="text-[11px] text-slate-400 font-bold">رصيدك الحالي:</span>
              <div class="flex items-center gap-2">
                <span class="px-2 py-1 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-300 font-black text-xs flex items-center gap-1 font-mono">
                  <span id="topup-modal-player-gold">0</span> 🪙
                </span>
                <span class="px-2 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-400 font-black text-xs flex items-center gap-1 font-mono">
                  <span id="topup-modal-player-cash">0</span> ج
                </span>
              </div>
            </div>
          </div>

          <!-- Category Filter Tabs -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            <button type="button" id="topup-tab-all" class="topup-filter-tab px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95" data-category="all">
              <i class="fa-solid fa-sparkles"></i>
              <span>جميع الباقات</span>
            </button>
            <button type="button" id="topup-tab-gold" class="topup-filter-tab px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-slate-900/90 text-slate-300 hover:text-amber-300 hover:bg-slate-800 border border-slate-800 active:scale-95" data-category="gold">
              <i class="fa-solid fa-coins text-amber-400"></i>
              <span>باقات الذهب والتسريع</span>
              <span class="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-black">جديد 🔥</span>
            </button>
            <button type="button" id="topup-tab-vip" class="topup-filter-tab px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-slate-900/90 text-slate-300 hover:text-amber-300 hover:bg-slate-800 border border-slate-800 active:scale-95" data-category="vip">
              <i class="fa-solid fa-gem text-cyan-400"></i>
              <span>كاش وأوسمة كبار المستثمرين VIP</span>
            </button>
          </div>

          <!-- Packages Grid -->
          <div id="topup-packages-container" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <!-- Dynamically populated from AppDB.getTopupPackages() -->
          </div>`;

// Update modal container width
indexHtml = indexHtml.replace(
  'class="glass-panel w-full max-w-3xl max-h-[92vh]',
  'class="glass-panel w-full max-w-4xl max-h-[94vh]'
);

// Normalize line endings and replace
const normIndex = indexHtml.replace(/\r\n/g, '\n');
const normOldSnippet = oldModalSnippet.replace(/\r\n/g, '\n');
const normNewSnippet = newModalSnippet.replace(/\r\n/g, '\n');

if (normIndex.includes(normOldSnippet)) {
  indexHtml = normIndex.replace(normOldSnippet, normNewSnippet);
  console.log('✅ index.html topup modal markup updated');
} else {
  console.warn('⚠️ oldModalSnippet not exact in index.html, using fallback replacement');
  indexHtml = indexHtml.replace(
    /<div id="topup-packages-container" class="grid grid-cols-1 md:grid-cols-3 gap-3">/,
    `<div class="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
      <button type="button" class="topup-filter-tab px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20" data-category="all">
        <i class="fa-solid fa-sparkles"></i>
        <span>جميع الباقات</span>
      </button>
      <button type="button" class="topup-filter-tab px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-slate-900/90 text-slate-300 hover:text-amber-300 hover:bg-slate-800 border border-slate-800" data-category="gold">
        <i class="fa-solid fa-coins text-amber-400"></i>
        <span>باقات الذهب والتسريع 🔥</span>
      </button>
      <button type="button" class="topup-filter-tab px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-slate-900/90 text-slate-300 hover:text-amber-300 hover:bg-slate-800 border border-slate-800" data-category="vip">
        <i class="fa-solid fa-gem text-cyan-400"></i>
        <span>كاش وVIP</span>
      </button>
    </div>
    <div id="topup-packages-container" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">`
  );
}

fs.writeFileSync(indexPath, indexHtml, 'utf8');

// 2. Update ui.js
const uiPath = path.join(__dirname, '..', 'ui.js');
let ui = fs.readFileSync(uiPath, 'utf8');

// Replace renderTopupPackagesList and openTopupModal logic
const newTopupLogic = `  let _cachedTopupPackagesList = [];
  let _activeTopupCategoryFilter = 'all';

  async function openTopupModal() {
    playMenuSound('modal_open');
    bindTopupModalEvents();

    const modal = document.getElementById('topup-store-modal');
    if (!modal) return;

    // Update real-time balance in modal
    const s = (typeof GameEngine !== 'undefined' && GameEngine.state) ? GameEngine.state : {};
    const pGoldEl = document.getElementById('topup-modal-player-gold');
    const pCashEl = document.getElementById('topup-modal-player-cash');
    if (pGoldEl) pGoldEl.textContent = Math.max(0, Number(s.gold || 0)).toLocaleString();
    if (pCashEl) pCashEl.textContent = formatCompactNumber(Math.max(0, Number(s.cash || 0)));

    // Reset views
    document.getElementById('topup-view-packages')?.classList.remove('hidden');
    document.getElementById('topup-view-confirmation')?.classList.add('hidden');
    document.getElementById('topup-success-notice')?.classList.add('hidden');
    document.getElementById('player-topup-form')?.classList.remove('hidden');

    modal.classList.remove('hidden');

    const container = document.getElementById('topup-packages-container');
    if (container) {
      container.innerHTML = '<div class="col-span-full p-8 text-center text-slate-400"><i class="fa-solid fa-spinner animate-spin text-xl text-amber-400 block mb-2"></i><span>جاري جلب باقات الشحن المعتمدة...</span></div>';
    }

    try {
      const [packages, settings] = await Promise.all([
        AppDB.getTopupPackages(),
        AppDB.getPaymentSettings()
      ]);

      _currentTopupPaymentSettings = settings;
      _cachedTopupPackagesList = packages || [];

      // Populate Payment Info in view 2
      const vodafoneNumEl = document.getElementById('player-topup-vodafone-num');
      const instapayNumEl = document.getElementById('player-topup-instapay-num');
      const instructionsEl = document.getElementById('player-topup-instructions');

      if (vodafoneNumEl) vodafoneNumEl.textContent = settings.vodafoneCash || 'غير محدد حالياً';
      if (instapayNumEl) instapayNumEl.textContent = settings.instapay || 'غير محدد حالياً';
      if (instructionsEl) instructionsEl.textContent = settings.notes || 'يرجى تحويل المبلغ بدقة وكتابة رقم الهاتف المحوّل منه ورقم العملية أو الوصل لتأكيد الشحن فوراً.';

      // Render packages
      renderTopupPackagesList(_cachedTopupPackagesList);
    } catch (err) {
      if (container) {
        container.innerHTML = \`<div class="col-span-full p-4 text-center text-rose-400 bg-rose-950/40 rounded-2xl border border-rose-500/30">تعذر جلب باقات الشحن: \${err.message}</div>\`;
      }
    }
  }

  function renderTopupPackagesList(packages) {
    const container = document.getElementById('topup-packages-container');
    if (!container) return;

    // Filter out packages hidden by admin
    let visiblePackages = (packages || []).filter(pkg => pkg.hidden !== true && pkg.visible !== false && pkg.active !== false);

    // Apply category filter
    if (_activeTopupCategoryFilter === 'gold') {
      visiblePackages = visiblePackages.filter(pkg => Boolean(pkg.gold && Number(pkg.gold) > 0));
    } else if (_activeTopupCategoryFilter === 'vip') {
      visiblePackages = visiblePackages.filter(pkg => !pkg.gold || Number(pkg.gold) <= 0 || Boolean(pkg.customBadge || pkg.cash));
    }

    if (visiblePackages.length === 0) {
      container.innerHTML = '<div class="col-span-full p-8 text-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800"><i class="fa-solid fa-box-open text-2xl text-slate-600 block mb-2"></i><span>لا توجد باقات متاحة في هذا التصنيف حالياً.</span></div>';
      return;
    }

    container.innerHTML = '';
    visiblePackages.forEach(pkg => {
      const card = document.createElement('div');
      const isGoldPkg = Boolean(pkg.gold && Number(pkg.gold) > 0);
      const goldAmt = Number(pkg.gold || 0);
      const speedupHours = Math.floor((goldAmt * 10) / 60);

      const badge = pkg.customBadge || '';
      const itemsList = pkg.items ? Object.entries(pkg.items).map(([k, v]) => {
        let label = k;
        if (k === 'vip_casino_pass') label = 'تصريح كازينو VIP';
        else if (k === 'swiss_safe') label = 'خزنة سويسرية';
        else if (k === 'offshore_account') label = 'حساب خارجي';
        else if (k === 'lottery_ticket') label = 'تذكرة يانصيب';
        return \`\${v}x \${label}\`;
      }).join(' • ') : '';

      // High-end styling
      const cardBorder = isGoldPkg ? 'border-amber-500/40 hover:border-amber-300 hover:shadow-amber-500/20' : 'border-cyan-500/30 hover:border-cyan-300 hover:shadow-cyan-500/20';
      const cardBg = isGoldPkg ? 'bg-gradient-to-b from-amber-950/20 via-slate-900/95 to-slate-950' : 'bg-gradient-to-b from-slate-900/90 via-slate-950 to-black';

      card.className = \`p-4 rounded-3xl \${cardBg} border-2 \${cardBorder} flex flex-col justify-between space-y-3.5 transition-all duration-300 shadow-xl relative overflow-hidden group hover:scale-[1.02] cursor-default\`;

      // Header Tag/Pill
      let topPill = '';
      if (isGoldPkg) {
        if (goldAmt >= 800) topPill = '<span class="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-black">🔥 عرش الأباطرة</span>';
        else if (goldAmt >= 300) topPill = '<span class="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black">⭐ الأكثر طلباً</span>';
        else topPill = '<span class="text-[9px] px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 font-black">⚡ تسريع فوري</span>';
      } else if (badge) {
        topPill = \`<span class="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-black">💎 VIP وسام مميز</span>\`;
      }

      card.innerHTML = \`
        <!-- Card Top Glow Accent -->
        <div class="absolute -top-12 -right-12 w-28 h-28 \${isGoldPkg ? 'bg-amber-500/10' : 'bg-cyan-500/10'} rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500"></div>

        <!-- Card Content -->
        <div class="space-y-3 relative z-10">
          
          <!-- Top Row: Category Tag & Price -->
          <div class="flex items-center justify-between gap-2">
            <div>\${topPill}</div>
            <div class="numbers-font text-amber-300 font-black text-xs sm:text-sm px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/40 shadow-inner flex items-center gap-1 font-mono">
              <span>\${Number(pkg.price).toLocaleString()}</span>
              <span class="text-[10px] font-sans">EGP</span>
            </div>
          </div>

          <!-- Title & Icon -->
          <div class="flex items-center gap-2.5 pb-2 border-b border-slate-800/80">
            <div class="w-10 h-10 rounded-2xl \${isGoldPkg ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950' : 'bg-gradient-to-br from-cyan-400 to-blue-600 text-white'} flex items-center justify-center text-lg font-black shrink-0 shadow-md group-hover:rotate-6 transition-transform">
              \${isGoldPkg ? '🪙' : (badge ? formatCustomBadgeHtml(badge, 'text-xl') : '💎')}
            </div>
            <div class="min-w-0">
              <h3 class="font-black text-white text-xs sm:text-sm truncate group-hover:text-amber-300 transition-colors">\${pkg.name}</h3>
              <p class="text-[10px] text-slate-400 truncate mt-0.5">\${(pkg.description || 'باقة مميزة لدعم السيرفر واكتساب موارد حصرية.')}</p>
            </div>
          </div>

          <!-- Highlight Rewards Box -->
          <div class="p-3 bg-slate-950/90 rounded-2xl border border-slate-850 space-y-2 text-[11px]">
            \${isGoldPkg ? \`
              <div class="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/30">
                <div class="flex items-center gap-1.5 font-black text-amber-300">
                  <span class="text-sm">🪙</span>
                  <span>رصيد الذهب:</span>
                </div>
                <span class="numbers-font font-black text-amber-400 text-sm font-mono">+\${goldAmt.toLocaleString()} ذهبة</span>
              </div>
              <div class="text-[10px] text-slate-300 flex items-center gap-1.5 px-1">
                <i class="fa-solid fa-bolt-lightning text-amber-400"></i>
                <span>تعادل تسريع <strong>\${speedupHours > 0 ? speedupHours + ' ساعة' : (goldAmt * 10) + ' دقيقة'}</strong> عمل/تهريب/سجن</span>
              </div>
            \` : ''}

            \${pkg.cash ? \`
              <div class="flex justify-between items-center text-emerald-400 font-black">
                <span class="flex items-center gap-1.5"><i class="fa-solid fa-money-bill-wave text-xs"></i> كاش فوري:</span>
                <span class="numbers-font font-mono text-xs text-emerald-300 font-black">+\${Number(pkg.cash).toLocaleString()} EGP</span>
              </div>
            \` : ''}

            \${pkg.bank ? \`
              <div class="flex justify-between items-center text-sky-400 font-bold">
                <span class="flex items-center gap-1.5"><i class="fa-solid fa-building-columns text-xs"></i> وديعة بالبنك:</span>
                <span class="numbers-font font-mono text-xs text-sky-300">+\${Number(pkg.bank).toLocaleString()} EGP</span>
              </div>
            \` : ''}

            \${pkg.xp ? \`
              <div class="flex justify-between items-center text-cyan-400 font-bold">
                <span class="flex items-center gap-1.5"><i class="fa-solid fa-star text-xs"></i> نقاط خبرة:</span>
                <span class="numbers-font font-mono text-xs text-cyan-300">+\${Number(pkg.xp).toLocaleString()} XP</span>
              </div>
            \` : ''}

            \${badge ? \`
              <div class="flex justify-between items-center text-yellow-400 font-bold">
                <span class="flex items-center gap-1.5"><i class="fa-solid fa-crown text-xs"></i> وسام VIP:</span>
                <span class="flex items-center gap-1.5">\${formatCustomBadgeHtml(badge, 'text-sm')} \${pkg.badgeTitle || 'وسام حصري'}</span>
              </div>
            \` : ''}

            \${itemsList ? \`
              <div class="flex justify-between items-center text-purple-300 font-bold pt-1 border-t border-slate-850">
                <span class="flex items-center gap-1.5"><i class="fa-solid fa-box text-xs"></i> معدات إضافية:</span>
                <span class="text-[10px] text-purple-200 truncate max-w-[130px]">\${itemsList}</span>
              </div>
            \` : ''}
          </div>
        </div>

        <!-- Action Button -->
        <button class="btn-select-topup-pkg w-full py-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-2xl text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 cursor-pointer relative z-10 group-hover:shadow-amber-500/40">
          <i class="fa-solid fa-bolt text-slate-950"></i>
          <span>طلب وشحن الباقة الآن</span>
        </button>\`;

      card.querySelector('.btn-select-topup-pkg').onclick = () => {
        selectPackageForTopup(pkg);
      };

      container.appendChild(card);
    });
  }`;

// Find start and end of topup functions in ui.js
const targetStart = `  // ─────────────────────────────────────────────
  //  TOP-UP & SUPPORT STORE CONTROLLER (متجر الشحن والدعم)
  // ─────────────────────────────────────────────`;

const targetEnd = `  function selectPackageForTopup(pkg) {`;

const startIdx = ui.indexOf(targetStart);
const endIdx = ui.indexOf(targetEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `${targetStart}
${newTopupLogic}

  `;
  ui = ui.substring(0, startIdx) + replacement + ui.substring(endIdx);
  console.log('✅ ui.js topup controller upgraded');
} else {
  console.warn('⚠️ topup controller anchors not found in ui.js');
}

// Add tab switching event binding to bindTopupModalEvents
const oldBindSnippet = `  function bindTopupModalEvents() {
    if (_topupModalEventsBound) return;
    _topupModalEventsBound = true;`;

const newBindSnippet = `  function bindTopupModalEvents() {
    if (_topupModalEventsBound) return;
    _topupModalEventsBound = true;

    // Filter tab buttons
    const filterTabs = document.querySelectorAll('.topup-filter-tab');
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        playMenuSound('click');
        const cat = tab.dataset.category || 'all';
        _activeTopupCategoryFilter = cat;

        filterTabs.forEach(t => {
          t.classList.remove('bg-gradient-to-r', 'from-amber-500', 'to-yellow-500', 'text-slate-950', 'shadow-md', 'shadow-amber-500/20');
          t.classList.add('bg-slate-900/90', 'text-slate-300', 'border', 'border-slate-800');
        });

        tab.classList.add('bg-gradient-to-r', 'from-amber-500', 'to-yellow-500', 'text-slate-950', 'shadow-md', 'shadow-amber-500/20');
        tab.classList.remove('bg-slate-900/90', 'text-slate-300', 'border', 'border-slate-800');

        renderTopupPackagesList(_cachedTopupPackagesList);
      });
    });`;

if (ui.includes(oldBindSnippet)) {
  ui = ui.replace(oldBindSnippet, newBindSnippet);
  console.log('✅ ui.js bindTopupModalEvents filter tabs added');
}

fs.writeFileSync(uiPath, ui, 'utf8');
console.log('🎉 Store UI aesthetic enhancements applied successfully!');
