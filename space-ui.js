/**
 * Ras ALmal Tycoon — Space Exploration Hub Frontend Engine
 * 100% Server-Authoritative UI & Real-Time Planetary Mining Visualizer
 * Cosmic Cyberpunk Design • 4 Subtabs: Launches, Fleet, 24h Mineral Exchange, Facilities & Gold VIPs
 */

window.SpaceUI = (() => {
  let _activeSubtab = 'launches'; // 'launches' | 'fleet' | 'market' | 'facilities'
  let _spaceTickerTimer = null;
  const _claimingRockets = new Set();
  let _cachedDailyRates = null;
  let _lastRatesFetchTs = 0;

  function getTrustedNow() {
    if (typeof window !== 'undefined' && window.AppDB && typeof window.AppDB.getTrustedNow === 'function') {
      return window.AppDB.getTrustedNow();
    }
    return Date.now();
  }

  function getApiBase() {
    if (typeof window !== 'undefined' && window.SERVER_API_URL) {
      return window.SERVER_API_URL.replace(/\/$/, '');
    }
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'http://localhost:3001';
    }
    return '';
  }

  function getActiveUser() {
    const s = (window.GameEngine && window.GameEngine.state) || {};
    return s.username || localStorage.getItem('rasalmal_username') || '';
  }

  function getActiveToken() {
    const user = getActiveUser();
    if (typeof window.ServerBridge !== 'undefined' && typeof window.ServerBridge.resolveEffectiveToken === 'function') {
      return window.ServerBridge.resolveEffectiveToken(user) || '';
    }
    return localStorage.getItem('rasalmal_auth_token_' + user) || '';
  }

  async function callSpaceApi(endpoint, body = {}) {
    const user = getActiveUser();
    const token = getActiveToken();

    const url = `${getApiBase()}${endpoint}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        ...body,
        username: user,
        token: token
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'فشلت العملية، يرجى المحاولة لاحقاً');
    }
    return data;
  }

  // Frontend Definitions & Metadata
  const FACILITIES_META = {
    launchpads: {
      name: 'منصات الإطلاق الفضائية',
      icon: 'fa-rocket text-sky-400',
      levels: {
        1: { name: 'منصة مدارية مفردة', cost: 0, desc: 'تشغيل وإطلاق صاروخ واحد فقط' },
        2: { name: 'مجمع إطلاق ثنائي متطور', cost: 50000000, desc: 'إطلاق صاروخين في مهام استكشافية متزامنة' },
        3: { name: 'مرفأ إطلاق كوكبي ثلاثي', cost: 180000000, desc: 'إطلاق 3 صواريخ في نفس الوقت لمختلف الكواكب' },
        4: { name: 'محطة إطلاق خارقة CAT-IV', cost: 600000000, desc: 'إطلاق 4 صواريخ متزامنة لكافة أرجاء المجموعة الشمسية' }
      }
    },
    mission_control: {
      name: 'مركز القيادة والتحكم المداري',
      icon: 'fa-satellite-dish text-indigo-400',
      levels: {
        1: { name: 'هوائي تتبع راديوي أساسي', cost: 0, desc: 'توجيه وقياسات قياسية للرحلات' },
        2: { name: 'شبكة أقمار اصطناعية تزامنية', cost: 35000000, desc: '-15% زمن استغراق كافة رحلات التنقيب' },
        3: { name: 'حاسوب ملاحة كمومي فائق', cost: 120000000, desc: '-30% زمن استغراق كافة رحلات التنقيب' },
        4: { name: 'نواة ذكاء اصطناعي للقفز الفضائي', cost: 450000000, desc: '-45% زمن استغراق كافة رحلات التنقيب' }
      }
    },
    ore_silo: {
      name: 'مستودع وخزانات الخام الفضائي',
      icon: 'fa-warehouse text-amber-400',
      levels: {
        1: { name: 'صوامع شحن مدارية (1,000 كجم)', cost: 0, desc: 'سعة استيعابية تصل إلى 1,000 كجم من المعادن' },
        2: { name: 'مستودعات تخزين فراغي مبردة (5,000 كجم)', cost: 40000000, desc: 'سعة استيعابية تصل إلى 5,000 كجم من المعادن' },
        3: { name: 'مجمع لوجستي كوكبي عملاق (20,000 كجم)', cost: 150000000, desc: 'سعة استيعابية تصل إلى 20,000 كجم من المعادن' },
        4: { name: 'مخازن كمومية متعددة الأبعاد (100,000 كجم)', cost: 500000000, desc: 'سعة تخزينية أسطورية تصل إلى 100,000 كجم من المعادن' }
      }
    },
    ore_refinery: {
      name: 'معمل تكرير وتنقية الخام الفضائي',
      icon: 'fa-atom text-emerald-400',
      levels: {
        1: { name: 'وحدات تفتيت ومغنطة أولية', cost: 0, desc: 'تنقية قياسية للمعادن المستخرجة' },
        2: { name: 'أفران صهر بلازمية حرارية', cost: 45000000, desc: '+15% نقاء وقيمة المعادن المستخرجة في كل رحلة' },
        3: { name: 'مفاعلات فصل كهرومغناطيسي نانوية', cost: 160000000, desc: '+30% نقاء وقيمة المعادن المستخرجة في كل رحلة' },
        4: { name: 'محطة تنقية كمومية للأصول النادرة', cost: 550000000, desc: '+50% نقاء وقيمة المعادن المستخرجة في كل رحلة' }
      }
    }
  };

  const ROCKETS_META = {
    orion_probe: {
      id: 'orion_probe',
      name: 'مسبار أوريون-1 الاستكشافي',
      tier: 1,
      cost: 35000000,
      cargoCapacity: 80,
      allowedDestinations: ['moon'],
      prepCost: 150000,
      icon: 'fa-shuttle-space text-sky-400',
      color: 'sky',
      desc: 'مركبة استكشاف خفيفة ذاتية القيادة، مخصصة لمسح سطح القمر وجلب عينات الريجوليث والحديد.'
    },
    falcon_star: {
      id: 'falcon_star',
      name: 'صاروخ فالكون ستار التكتيكي',
      tier: 2,
      cost: 180000000,
      cargoCapacity: 350,
      allowedDestinations: ['moon', 'mars'],
      prepCost: 650000,
      icon: 'fa-rocket text-indigo-400',
      color: 'indigo',
      desc: 'صاروخ دفع هجين مجهز للوصول إلى كوكب المريخ وجلب خامات البلاتين والليثيوم الفضائي.'
    },
    heavy_starship: {
      id: 'heavy_starship',
      name: 'سفينة التعدين Heavy Starship',
      tier: 3,
      cost: 950000000,
      cargoCapacity: 1600,
      allowedDestinations: ['moon', 'mars', 'asteroid_belt'],
      prepCost: 2500000,
      icon: 'fa-meteor text-amber-400',
      color: 'amber',
      desc: 'عملاق التعدين في أعماق الفضاء، مجهز بدروع لاختراق حزام الكويكبات واستخراج أندر المعادن.'
    },
    quantum_dreadnought: {
      id: 'quantum_dreadnought',
      name: 'مدمرة التعدين Quantum Dreadnought',
      tier: 4,
      cost: 4500000000,
      cargoCapacity: 8500,
      allowedDestinations: ['moon', 'mars', 'asteroid_belt', 'jupiter_europa'],
      prepCost: 10000000,
      icon: 'fa-star-of-david text-fuchsia-400',
      color: 'fuchsia',
      desc: 'درة التاج الفضائي بمحركات إيونية، قادرة على بلوغ أقمار المشتري واقتناص بلورات المادة المظلمة.'
    }
  };

  const DESTINATIONS_META = {
    moon: {
      id: 'moon',
      name: 'القمر (Moon)',
      sub: 'Mare Tranquillitatis',
      dist: '384 ألف كم',
      baseSec: 1800,
      minTier: 1,
      badge: 'فئة 1 فأعلى',
      icon: 'fa-circle text-slate-300',
      color: 'slate'
    },
    mars: {
      id: 'mars',
      name: 'كوكب المريخ (Mars)',
      sub: 'Olympus Mons',
      dist: '225 مليون كم',
      baseSec: 5400,
      minTier: 2,
      badge: 'فئة 2 فأعلى',
      icon: 'fa-globe text-rose-500',
      color: 'rose'
    },
    asteroid_belt: {
      id: 'asteroid_belt',
      name: 'حزام الكويكبات (Asteroid Belt)',
      sub: 'Psyche 16 Cluster',
      dist: '480 مليون كم',
      baseSec: 12600,
      minTier: 3,
      badge: 'فئة 3 فأعلى',
      icon: 'fa-ring text-amber-500',
      color: 'amber'
    },
    jupiter_europa: {
      id: 'jupiter_europa',
      name: 'أقمار المشتري (Jupiter / Europa)',
      sub: 'Subsurface Oceans',
      dist: '778 مليون كم',
      baseSec: 25200,
      minTier: 4,
      badge: 'فئة 4 حصرياً',
      icon: 'fa-burst text-purple-400',
      color: 'purple'
    }
  };

  const ORES_META = {
    regolith: { id: 'regolith', name: 'ريجوليث قمري', rarity: 'شائع', icon: 'fa-cubes text-slate-300', basePrice: 450, color: 'slate' },
    iron: { id: 'iron', name: 'حديد نيزكي', rarity: 'شائع', icon: 'fa-shield-halved text-blue-400', basePrice: 1250, color: 'blue' },
    platinum: { id: 'platinum', name: 'بلاتين كويكبي', rarity: 'نادر', icon: 'fa-gem text-cyan-300', basePrice: 7500, color: 'cyan' },
    helium3: { id: 'helium3', name: 'هيليوم-3 كوني', rarity: 'نادر', icon: 'fa-atom text-amber-400', basePrice: 22000, color: 'amber' },
    lithium: { id: 'lithium', name: 'ليثيوم فضائي', rarity: 'أسطوري', icon: 'fa-bolt text-yellow-300', basePrice: 55000, color: 'yellow' },
    dark_matter: { id: 'dark_matter', name: 'بلورات المادة المظلمة', rarity: 'فائق الندرة', icon: 'fa-wand-magic-sparkles text-fuchsia-400', basePrice: 185000, color: 'fuchsia' }
  };

  const GOLD_MANAGERS_META = {
    1: {
      tier: 1,
      name: 'د. ليام - مدير العمليات الفضائية',
      title: 'مدير الرحلات والملاحة المدارية',
      goldCost: 150,
      badge: 'مدير عمليات',
      color: 'from-blue-600 to-sky-600',
      borderColor: 'border-sky-500/50',
      icon: 'fa-user-astronaut text-sky-400',
      perkDesc: 'يخفض زمن كافة رحلات الاستكشاف الفضائي بنسبة 20% فورياً.'
    },
    2: {
      tier: 2,
      name: 'د. سارة - خبيرة الجيولوجيا الكونية',
      title: 'رئيسة مسح وتعدين الأجرام الفضائية',
      goldCost: 300,
      badge: 'خبير جيولوجيا VIP',
      color: 'from-amber-600 to-yellow-500',
      borderColor: 'border-amber-500/50',
      icon: 'fa-atom text-amber-400',
      perkDesc: 'ترفع حصيلة ونقاء المعادن المستخرجة في كل رحلة بنسبة +25%.'
    },
    3: {
      tier: 3,
      name: 'الآدميرال فالكون - القائد العام للأسطول',
      title: 'القائد الأعلى لمنظومة استكشاف الفضاء',
      goldCost: 600,
      badge: 'قائد الأسطول المداري',
      color: 'from-purple-600 to-fuchsia-600',
      borderColor: 'border-fuchsia-500/50',
      icon: 'fa-crown text-fuchsia-400',
      perkDesc: 'تحصيل وإطلاق آلي للرحلات (Auto-Pilot) + 15% بونص أرباح بيع المعادن بالبورصة و -15% زمن الرحلات.'
    }
  };

  // Toast notification
  function showSpaceToast(msg, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
      return;
    }
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 right-6 z-[999999] px-5 py-3 rounded-2xl text-xs font-black shadow-2xl flex items-center gap-2.5 transition-all transform duration-300 translate-y-4 ${
      type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/20' :
      type === 'error' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-rose-500/20' :
      'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sky-500/20'
    }`;
    const icon = type === 'success' ? 'fa-circle-check text-emerald-400' : type === 'error' ? 'fa-triangle-exclamation text-rose-400' : 'fa-rocket text-sky-400';
    toast.innerHTML = `<i class="fa-solid ${icon} text-sm"></i> <span>${msg}</span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('translate-y-4'));
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-4');
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }

  // Periodic Ticker for Flight Countdown Progress Bars
  function initTicker() {
    if (_spaceTickerTimer) clearInterval(_spaceTickerTimer);
    _spaceTickerTimer = setInterval(() => {
      updateFlightTimers();
    }, 1000);
  }

  function updateFlightTimers() {
    const s = (window.GameEngine && window.GameEngine.state) || {};
    const space = s.space;
    if (!space || !space.unlocked || !Array.isArray(space.activeFlights)) return;

    const now = getTrustedNow();

    space.activeFlights.forEach(flt => {
      if (!flt) return;
      const progressEl = document.getElementById(`space-prog-bar-${flt.id}`);
      const timerEl = document.getElementById(`space-prog-timer-${flt.id}`);
      const claimBtn = document.getElementById(`btn-claim-space-${flt.id}`);

      const totalSec = Math.max(1, flt.durationSeconds || 60);
      const remMs = Math.max(0, flt.arrivalTime - now);
      const remSec = Math.ceil(remMs / 1000);
      const elapsedSec = totalSec - remSec;
      const pct = Math.min(100, Math.max(0, (elapsedSec / totalSec) * 100));

      if (progressEl) {
        progressEl.style.width = `${pct}%`;
      }

      if (remSec <= 0) {
        if (timerEl) timerEl.innerHTML = '<span class="text-emerald-400 font-bold flex items-center gap-1"><i class="fa-solid fa-check"></i> هبط الصاروخ بنجاح!</span>';
        if (claimBtn) {
          claimBtn.disabled = false;
          claimBtn.classList.remove('opacity-50', 'cursor-not-allowed');
          claimBtn.classList.add('animate-pulse');
        }
      } else {
        const m = Math.floor(remSec / 60);
        const sec = remSec % 60;
        const timeStr = `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        if (timerEl) timerEl.textContent = `متبقي: ${timeStr} (${Math.round(pct)}%)`;
      }
    });
  }

  // Subtab switcher
  function setSubtab(tab) {
    _activeSubtab = tab;
    renderSpacePanel();
  }

  function isTesterAuthorized(state) {
    const u = (state.username || localStorage.getItem('rasalmal_username') || '').toLowerCase();
    if (u === 'khaled' || u === 'خالد' || state.isAdmin === true || window._isServerVerifiedAdmin === true) {
      return true;
    }
    try {
      if (localStorage.getItem('rasalmal_space_tester_authorized') === 'true') {
        return true;
      }
    } catch (_) {}
    return false;
  }

  // 0. Secret Tester Lock Gate
  function renderTesterLockGate(container, state) {
    container.innerHTML = `
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-950 via-[#0e071e] to-slate-950 border border-amber-500/40 p-6 sm:p-12 text-center shadow-2xl shadow-amber-950/30">
        <!-- Ambient Glowing Nebulae -->
        <div class="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl animate-pulse"></div>
        <div class="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-purple-600/15 blur-3xl animate-pulse" style="animation-delay: 1.5s;"></div>

        <div class="relative z-10 max-w-md mx-auto space-y-6">
          <!-- Animated Lock Icon -->
          <div class="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500/20 via-yellow-500/25 to-purple-500/20 border-2 border-amber-500/50 flex items-center justify-center shadow-2xl shadow-amber-500/20 transform hover:scale-105 transition">
            <i class="fa-solid fa-lock text-4xl text-amber-400 animate-pulse"></i>
          </div>

          <div>
            <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-300 text-xs font-black tracking-widest uppercase mb-3">
              <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              منطقة اختبار مغلقة • Restricted Beta Access
            </div>
            <h2 class="text-2xl sm:text-3xl font-black text-white tracking-wide">
              محطة الفضاء قيد الاختبار السري 🔒
            </h2>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2">
              هذا القسم مغلق حالياً ومخصص للمطور والمختبرين المعتمدين فقط لتجربة الأنظمة الفضائية قبل الطرح الرسمي.
            </p>
          </div>

          <!-- Code Entry Box -->
          <div class="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 text-right shadow-inner">
            <div class="space-y-1.5">
              <label class="block text-xs font-black text-slate-300 flex items-center gap-1.5">
                <i class="fa-solid fa-key text-[11px] text-amber-400"></i>
                <span>رمز فك القفل التجريبي (Tester Code):</span>
              </label>
              <div class="relative">
                <input type="password" id="input-space-tester-code" placeholder="أدخل رمز فك القفل..."
                  class="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-center font-mono text-sm font-bold text-amber-300 tracking-wider placeholder:text-slate-600 outline-none transition"
                  onkeydown="if(event.key==='Enter') window.SpaceUI.submitTesterCode()">
                <button type="button" onclick="const i=document.getElementById('input-space-tester-code'); i.type = i.type==='password'?'text':'password';"
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs p-1 cursor-pointer">
                  <i class="fa-solid fa-eye"></i>
                </button>
              </div>
            </div>

            <div id="space-tester-code-error" class="hidden text-xs font-bold text-rose-400 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center"></div>

            <button id="btn-submit-space-code" onclick="window.SpaceUI.submitTesterCode()"
              class="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/25 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
              <i class="fa-solid fa-unlock-keyhole"></i>
              <span>تأكيد وفك القفل للمعاينة 🚀</span>
            </button>
          </div>

          <p class="text-[11px] text-slate-500">
            إذا كنت أحد مختبري التحديث الجديد، احصل على الرمز السري من المشرف.
          </p>
        </div>
      </div>
    `;
  }

  // Main Render Function called by tab router
  function renderSpacePanel() {
    const container = document.getElementById('panel-space');
    if (!container) return;

    const state = (window.GameEngine && window.GameEngine.state) || {};
    const space = state.space;

    // Check Tester Authorization first
    if (!isTesterAuthorized(state)) {
      renderTesterLockGate(container, state);
      return;
    }

    if (!space || !space.unlocked) {
      renderUnlockGateway(container, state);
      return;
    }

    renderActiveStation(container, state);
  }

  // 1. Gateway Screen (Before Station is Unlocked)
  function renderUnlockGateway(container, state) {
    const curCash = Number(state.cash || 0);
    const curBank = Number(state.bank || 0);
    const curNetWorth = Number(state.netWorth || 0);
    const cost = 25000000;
    const reqNetWorth = 100000000;
    const hasFunds = (curCash + curBank) >= cost;
    const hasNetWorth = curNetWorth >= reqNetWorth;

    container.innerHTML = `
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-[#070d1e] to-slate-950 border border-sky-500/30 p-6 sm:p-10 text-center shadow-2xl shadow-sky-950/40">
        <!-- Ambient Glowing Nebulae -->
        <div class="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl animate-pulse"></div>
        <div class="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-600/15 blur-3xl animate-pulse" style="animation-delay: 2s;"></div>

        <div class="relative z-10 max-w-2xl mx-auto space-y-6">
          <!-- Hero Icon -->
          <div class="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-sky-500/20 via-indigo-500/25 to-purple-500/20 border-2 border-sky-400/40 flex items-center justify-center shadow-xl shadow-sky-500/20 transform hover:rotate-6 transition">
            <i class="fa-solid fa-shuttle-space text-4xl text-sky-300 animate-pulse"></i>
          </div>

          <div>
            <div class="flex items-center justify-center gap-2 mb-3">
              <div class="inline-flex items-center gap-2 px-3.5 py-1 bg-sky-500/10 border border-sky-500/30 rounded-full text-sky-400 text-xs font-black tracking-widest uppercase">
                <span class="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                محطة استكشاف وتعدين الفضاء الكوني
              </div>
              <button onclick="window.SpaceUI.relockTesterAccess()" class="px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-black cursor-pointer transition flex items-center gap-1" title="إعادة قفل الوصول التجريبي">
                <i class="fa-solid fa-lock"></i> <span>إعادة القفل</span>
              </button>
            </div>
            <h2 class="text-2xl sm:text-4xl font-black text-white tracking-wide">
              دشّن محطتك المدارية وانطلق لغزو الكواكب 🌌
            </h2>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg mx-auto mt-2">
              ابنِ مجمع إطلاق الصواريخ العملاق، وقم بإرسال سفن التعدين الكوكبية إلى القمر والمريخ وأقمار المشتري لاستخراج أندر المعادن وتداولها في بورصة السلع الفضائية اليومية!
            </p>
          </div>

          <!-- Requirements Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right max-w-lg mx-auto">
            <div class="p-4 rounded-2xl bg-slate-900/80 border ${hasFunds ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800'} flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
                  <i class="fa-solid fa-coins"></i>
                </div>
                <div>
                  <div class="text-[11px] text-slate-400 font-bold">تكلفة البناء والترخيص</div>
                  <div class="text-sm font-black text-emerald-400 numbers-font">${cost.toLocaleString()} ج.م</div>
                </div>
              </div>
              <div>
                ${hasFunds ? '<span class="text-xs font-bold text-emerald-400"><i class="fa-solid fa-check"></i> جاهز</span>' : '<span class="text-xs font-bold text-rose-400"><i class="fa-solid fa-xmark"></i> غير كافٍ</span>'}
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-slate-900/80 border ${hasNetWorth ? 'border-sky-500/40 bg-sky-950/20' : 'border-slate-800'} flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-lg">
                  <i class="fa-solid fa-chart-line"></i>
                </div>
                <div>
                  <div class="text-[11px] text-slate-400 font-bold">الثروة الإجمالية الموصى بها</div>
                  <div class="text-sm font-black text-sky-400 numbers-font">${reqNetWorth.toLocaleString()} ج.م</div>
                </div>
              </div>
              <div>
                ${hasNetWorth ? '<span class="text-xs font-bold text-emerald-400"><i class="fa-solid fa-check"></i> مؤهل</span>' : `<span class="text-xs font-bold text-slate-400 numbers-font">${Math.round(curNetWorth / 1000000)}M / 100M</span>`}
              </div>
            </div>
          </div>

          <!-- Unlock Action Button -->
          <div class="pt-2">
            <button id="btn-unlock-space" onclick="window.SpaceUI.handleUnlockStation()"
              class="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white font-black text-sm shadow-xl shadow-sky-500/25 transition active:scale-[0.98] inline-flex items-center justify-center gap-2 cursor-pointer">
              <i class="fa-solid fa-rocket"></i>
              <span>تأسيس ودفع رسوم محطة الفضاء (${cost.toLocaleString()} ج.م)</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // 2. Main Station Dashboard (When Unlocked)
  function renderActiveStation(container, state) {
    const space = state.space;
    const warehouseTotalKg = calculateTotalWeight(space.warehouse);
    const siloCapacity = getSiloCapacity(space);
    const siloPct = Math.min(100, Math.round((warehouseTotalKg / siloCapacity) * 100));

    container.innerHTML = `
      <div class="space-y-6 select-none">
        <!-- Station Header Banner -->
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-[#0a1226] to-slate-900 border border-sky-500/30 p-5 sm:p-7 shadow-xl shadow-sky-950/30">
          <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-purple-500/30 border border-sky-400/40 flex items-center justify-center text-sky-300 text-2xl shadow-lg shadow-sky-500/20">
                <i class="fa-solid fa-shuttle-space animate-pulse"></i>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-xl sm:text-2xl font-black text-white">محطة رأس المال لاستكشاف الفضاء</h2>
                  <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">نشطة 100%</span>
                  <button onclick="window.SpaceUI.relockTesterAccess()" class="px-2 py-0.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-black cursor-pointer transition flex items-center gap-1" title="إعادة قفل الوصول التجريبي">
                    <i class="fa-solid fa-lock"></i> <span>إعادة القفل</span>
                  </button>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">منظومة الإطلاق المداري وتعدين المعادن الكونية وبورصة السلع اليومية</p>
              </div>
            </div>

            <!-- Mini Live Stats -->
            <div class="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <!-- Warehouse Load -->
              <div class="px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 text-right min-w-[140px]">
                <div class="text-[10px] text-slate-400 font-bold flex items-center justify-between">
                  <span>سعة المستودع</span>
                  <span class="numbers-font font-black text-sky-400">${siloPct}%</span>
                </div>
                <div class="text-xs font-black text-white numbers-font mt-0.5">${warehouseTotalKg.toLocaleString()} / ${siloCapacity.toLocaleString()} كجم</div>
                <div class="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-300" style="width: ${siloPct}%"></div>
                </div>
              </div>

              <!-- Total Flights -->
              <div class="px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 text-right">
                <div class="text-[10px] text-slate-400 font-bold">المهام المنجزة</div>
                <div class="text-sm font-black text-emerald-400 numbers-font">${(space.stats?.totalFlightsCompleted || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>

          <!-- Navigation Subtabs -->
          <div class="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
            <button onclick="window.SpaceUI.setSubtab('launches')"
              class="px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                _activeSubtab === 'launches' ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/25' : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 border border-slate-800'
              }">
              <i class="fa-solid fa-satellite-dish"></i>
              <span>منصات الإطلاق والرحلات</span>
              <span class="px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                _activeSubtab === 'launches' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
              }">${(space.activeFlights || []).length}</span>
            </button>

            <button onclick="window.SpaceUI.setSubtab('fleet')"
              class="px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                _activeSubtab === 'fleet' ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/25' : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 border border-slate-800'
              }">
              <i class="fa-solid fa-rocket"></i>
              <span>حظيرة الصواريخ</span>
              <span class="px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                _activeSubtab === 'fleet' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
              }">${(space.activeRockets || []).length}</span>
            </button>

            <button onclick="window.SpaceUI.setSubtab('market')"
              class="px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                _activeSubtab === 'market' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25' : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 border border-slate-800'
              }">
              <i class="fa-solid fa-scale-balanced"></i>
              <span>المخزن وبورصة المعادن (24h)</span>
            </button>

            <button onclick="window.SpaceUI.setSubtab('facilities')"
              class="px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                _activeSubtab === 'facilities' ? 'bg-purple-500 text-slate-950 shadow-lg shadow-purple-500/25' : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 border border-slate-800'
              }">
              <i class="fa-solid fa-sliders"></i>
              <span>المرافق ومديرو الذهب VIP</span>
            </button>
          </div>
        </div>

        <!-- Subtab Content Body -->
        <div id="space-subtab-content">
          ${renderCurrentSubtab(space, state)}
        </div>
      </div>
    `;

    initTicker();
  }

  function renderCurrentSubtab(space, state) {
    if (_activeSubtab === 'fleet') return renderFleetSubtab(space, state);
    if (_activeSubtab === 'market') return renderMarketSubtab(space, state);
    if (_activeSubtab === 'facilities') return renderFacilitiesSubtab(space, state);
    return renderLaunchesSubtab(space, state);
  }

  // --- Subtab 1: Launches & Active Missions ---
  function renderLaunchesSubtab(space, state) {
    const padCount = Math.max(1, Number(space.facilities?.launchpads || 1));
    const activeFlights = Array.isArray(space.activeFlights) ? space.activeFlights : [];
    const activeRockets = Array.isArray(space.activeRockets) ? space.activeRockets : [];
    const availableRockets = activeRockets.filter(r => r && r.status === 'ready');

    let html = `
      <div class="space-y-6">
        <!-- Launch Action Bar / Launchpad Grid Header -->
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <i class="fa-solid fa-satellite text-sky-400"></i>
              <span>منصات الإطلاق المدارية (${activeFlights.length} / ${padCount} نشطة)</span>
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">راقب تقدم رحلات التعدين واستلم حمولات المعادن فور هبوط الصاروخ</p>
          </div>
          <div>
            ${availableRockets.length > 0 && activeFlights.length < padCount ? `
              <button onclick="window.SpaceUI.openLaunchModal()"
                class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-sky-500/20 transition cursor-pointer flex items-center gap-2">
                <i class="fa-solid fa-paper-plane"></i>
                <span>تجهيز وإطلاق رحلة جديدة</span>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Launchpads Display Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    `;

    for (let p = 1; p <= padCount; p++) {
      const flight = activeFlights.find(f => f && f.padId === p);

      if (flight) {
        const dest = DESTINATIONS_META[flight.destinationId] || { name: flight.destinationName || 'وجهة غير معروفة', dist: '' };
        const now = getTrustedNow();
        const remMs = Math.max(0, flight.arrivalTime - now);
        const remSec = Math.ceil(remMs / 1000);
        const isReady = remSec <= 0;

        html += `
          <div class="relative overflow-hidden rounded-3xl bg-slate-900/90 border border-sky-500/40 p-5 shadow-xl space-y-4">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 text-xl">
                  <i class="fa-solid fa-shuttle-space ${isReady ? '' : 'animate-bounce'}"></i>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="text-sm font-black text-white">${flight.rocketName}</h4>
                    <span class="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 text-[10px] font-bold">منصة ${p}</span>
                  </div>
                  <div class="text-xs text-slate-400 font-bold flex items-center gap-1.5 mt-0.5">
                    <i class="fa-solid fa-location-dot text-rose-400"></i>
                    <span>الوجهة: ${dest.name} (${dest.dist})</span>
                  </div>
                </div>
              </div>

              <div>
                <span class="px-3 py-1 rounded-full text-xs font-black ${
                  isReady ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-sky-500/10 text-sky-300 border border-sky-500/30'
                }">
                  ${isReady ? 'جاهز للتحصيل' : 'في مدار الكوكب'}
                </span>
              </div>
            </div>

            <!-- Visual Progress Bar -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>مسار الرحلة والتنظير</span>
                <span id="space-prog-timer-${flight.id}" class="numbers-font font-black text-sky-300">
                  ${isReady ? 'هبط الصاروخ' : `متبقي: ${Math.round(remSec / 60)} دقيقة`}
                </span>
              </div>
              <div class="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div id="space-prog-bar-${flight.id}" class="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 rounded-full transition-all duration-300" style="width: ${isReady ? '100%' : '50%'}"></div>
              </div>
            </div>

            <!-- Expected Ore Payload Preview -->
            <div class="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
              <span class="text-slate-400 font-bold">الحمولة المكتشفة:</span>
              <div class="flex items-center gap-2 flex-wrap">
                ${Object.entries(flight.payload || {}).map(([oreKey, qty]) => {
                  const oreDef = ORES_META[oreKey] || { name: oreKey, icon: 'fa-cubes' };
                  return `
                    <span class="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-200 flex items-center gap-1">
                      <i class="fa-solid ${oreDef.icon}"></i>
                      <span>${oreDef.name}:</span>
                      <strong class="text-sky-400 numbers-font">${qty} كجم</strong>
                    </span>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Claim Button -->
            <button id="btn-claim-space-${flight.id}" onclick="window.SpaceUI.claimPayload('${flight.id}')"
              ${!isReady ? 'disabled' : ''}
              class="w-full py-3 rounded-2xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
                isReady
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-xl shadow-emerald-500/20 animate-pulse'
                  : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-800'
              }">
              <i class="fa-solid fa-boxes-packing"></i>
              <span>${isReady ? 'استلام وتفريغ حمولة المعادن بالمخزن' : 'جاري التنقيب والعودة...'}</span>
            </button>
          </div>
        `;
      } else {
        // Empty Launchpad Card
        html += `
          <div class="rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]">
            <div class="w-12 h-12 rounded-2xl bg-slate-800/60 text-slate-500 flex items-center justify-center text-xl">
              <i class="fa-solid fa-circle-dot"></i>
            </div>
            <div>
              <div class="text-sm font-black text-white">منصة إطلاق رقم (${p}) جاهزة وشاغرة</div>
              <p class="text-xs text-slate-500 mt-0.5">يمكنك إطلاق أي صاروخ متاح من أسطولك نحو أحد الكواكب</p>
            </div>
            ${availableRockets.length > 0 ? `
              <button onclick="window.SpaceUI.openLaunchModal(${p})"
                class="px-4 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-bold transition cursor-pointer">
                + إطلاق رحلة على هذه المنصة
              </button>
            ` : `
              <button onclick="window.SpaceUI.setSubtab('fleet')"
                class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer">
                شراء صواريخ من الحظيرة
              </button>
            `}
          </div>
        `;
      }
    }

    html += `</div></div>`;
    return html;
  }

  // --- Subtab 2: Rocket Fleet & Hangar ---
  function renderFleetSubtab(space, state) {
    const ownedRockets = Array.isArray(space.activeRockets) ? space.activeRockets : [];
    const curCash = Number(state.cash || 0);
    const curBank = Number(state.bank || 0);
    const totalFunds = curCash + curBank;

    let html = `
      <div class="space-y-6">
        <div>
          <h3 class="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <i class="fa-solid fa-shuttle-space text-sky-400"></i>
            <span>حظيرة أسطول الصواريخ الفضائية (${ownedRockets.length} مملوكة)</span>
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">صواريخ قابلة لإعادة الاستخدام مدى الحياة. كل فئة تمكنك من بلوغ أجرام سماوية أبعد بحمولة أضخم</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    `;

    Object.values(ROCKETS_META).forEach(rkt => {
      const ownedInstances = ownedRockets.filter(o => o && o.modelId === rkt.id);
      const isAffordable = totalFunds >= rkt.cost;

      html += `
        <div class="relative overflow-hidden rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 p-5 transition space-y-4 shadow-lg">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-${rkt.color}-500/20 to-purple-500/20 border border-${rkt.color}-400/40 flex items-center justify-center text-xl">
                <i class="fa-solid ${rkt.icon}"></i>
              </div>
              <div>
                <h4 class="text-sm font-black text-white">${rkt.name}</h4>
                <div class="text-[11px] text-slate-400 mt-0.5">الفئة ${rkt.tier} • سعة الحمولة: <strong class="text-sky-300 numbers-font">${rkt.cargoCapacity} كجم</strong></div>
              </div>
            </div>
            <div>
              <span class="px-2.5 py-1 rounded-full text-xs font-black ${
                ownedInstances.length > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
              }">
                ${ownedInstances.length > 0 ? `مملوك (${ownedInstances.length})` : 'غير مملوك'}
              </span>
            </div>
          </div>

          <p class="text-xs text-slate-400 leading-relaxed">${rkt.desc}</p>

          <!-- Specs Table -->
          <div class="grid grid-cols-2 gap-2 text-[11px] p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div>
              <span class="text-slate-500 block">المدى الكوكبي:</span>
              <span class="font-bold text-slate-200">${rkt.allowedDestinations.map(d => DESTINATIONS_META[d]?.name || d).join('، ')}</span>
            </div>
            <div>
              <span class="text-slate-500 block">رسوم الوقود والتجهيز:</span>
              <span class="font-bold text-amber-400 numbers-font">${rkt.prepCost.toLocaleString()} ج.م</span>
            </div>
          </div>

          <!-- Purchase Action Button -->
          <div class="flex items-center justify-between pt-1">
            <div class="text-right">
              <span class="text-[10px] text-slate-500 block font-bold">سعر الشراء</span>
              <span class="text-sm font-black text-emerald-400 numbers-font">${rkt.cost.toLocaleString()} ج.م</span>
            </div>
            <button onclick="window.SpaceUI.handleBuyRocket('${rkt.id}')"
              ${!isAffordable ? 'disabled' : ''}
              class="px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                isAffordable
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/20 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }">
              <i class="fa-solid fa-cart-shopping"></i>
              <span>شراء الصاروخ</span>
            </button>
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    return html;
  }

  // --- Subtab 3: Warehouse & 24h Daily Commodity Exchange ---
  function renderMarketSubtab(space, state) {
    const warehouse = space.warehouse || {};
    const totalKg = calculateTotalWeight(warehouse);
    const siloCapacity = getSiloCapacity(space);

    // Dynamic rates calculation
    let ratesObj = _cachedDailyRates;
    if (!ratesObj || (Date.now() - _lastRatesFetchTs > 60000)) {
      ratesObj = calculateClientFallbackRates();
    }
    const rates = ratesObj.prices || {};

    let totalEstValue = 0;
    Object.keys(ORES_META).forEach(k => {
      const q = Number(warehouse[k] || 0);
      const p = rates[k]?.price || ORES_META[k].basePrice;
      totalEstValue += (q * p);
    });

    let html = `
      <div class="space-y-6">
        <!-- Daily Exchange Header Banner -->
        <div class="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl">
              <i class="fa-solid fa-scale-balanced"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base sm:text-lg font-black text-white">بورصة المعادن والسلع الفضائية</h3>
                <span class="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black">دورة 24 ساعة</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">تتجدد أسعار المعادن يومياً في تمام منتصف ليل القاهرة بناءً على العرض والطلب الكوني</p>
            </div>
          </div>

          <!-- Total Value & Quick Sell All Button -->
          <div class="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div class="text-right">
              <div class="text-[10px] text-slate-400 font-bold">القيمة التقديرية للمخزن</div>
              <div class="text-base font-black text-emerald-400 numbers-font">${totalEstValue.toLocaleString()} ج.م</div>
            </div>
            ${totalKg > 0 ? `
              <button onclick="window.SpaceUI.handleSellOre('all')"
                class="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/20 transition cursor-pointer flex items-center gap-2 active:scale-95">
                <i class="fa-solid fa-sack-dollar text-sm"></i>
                <span>بيع كل المخزون فورا</span>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- 6 Minerals Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    `;

    Object.entries(ORES_META).forEach(([oreKey, oreDef]) => {
      const qty = Number(warehouse[oreKey] || 0);
      const rateInfo = rates[oreKey] || { price: oreDef.basePrice, changePct: 0, isUp: true };
      const subtotal = qty * rateInfo.price;

      html += `
        <div class="rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-5 space-y-4 shadow-lg">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-slate-800 text-lg flex items-center justify-center">
                <i class="fa-solid ${oreDef.icon}"></i>
              </div>
              <div>
                <h4 class="text-sm font-black text-white">${oreDef.name}</h4>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  oreDef.rarity === 'فائق الندرة' ? 'bg-fuchsia-500/20 text-fuchsia-400' :
                  oreDef.rarity === 'أسطوري' ? 'bg-yellow-500/20 text-yellow-400' :
                  oreDef.rarity === 'نادر' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'
                }">${oreDef.rarity}</span>
              </div>
            </div>

            <!-- 24h Ticker -->
            <div class="text-left">
              <span class="text-xs font-black ${rateInfo.isUp ? 'text-emerald-400' : 'text-rose-400'} flex items-center gap-1 numbers-font">
                <i class="fa-solid ${rateInfo.isUp ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} text-[10px]"></i>
                ${rateInfo.changePct > 0 ? '+' : ''}${rateInfo.changePct}%
              </span>
              <span class="text-[10px] text-slate-500 block font-bold">مقارنة بالأمس</span>
            </div>
          </div>

          <!-- Price & Quantity -->
          <div class="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
            <div>
              <span class="text-slate-500 block text-[10px]">سعر الكيلوجرام اليوم:</span>
              <strong class="text-white numbers-font text-sm">${rateInfo.price.toLocaleString()} ج.م</strong>
            </div>
            <div class="text-left">
              <span class="text-slate-500 block text-[10px]">الكمية بالمخزن:</span>
              <strong class="text-sky-400 numbers-font text-sm">${qty.toLocaleString()} كجم</strong>
            </div>
          </div>

          <!-- Total and Sell Button -->
          <div class="flex items-center justify-between pt-1">
            <div>
              <span class="text-[10px] text-slate-500 block">إجمالي القيمة</span>
              <span class="text-xs font-black text-emerald-400 numbers-font">${subtotal.toLocaleString()} ج.م</span>
            </div>
            <button onclick="window.SpaceUI.handleSellOre('${oreKey}')"
              ${qty <= 0 ? 'disabled' : ''}
              class="px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1 ${
                qty > 0
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 active:scale-95'
                  : 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-slate-800'
              }">
              <i class="fa-solid fa-coins text-xs"></i>
              <span>بيع المحصول</span>
            </button>
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    return html;
  }

  // --- Subtab 4: Facilities & VIP Gold Managers ---
  function renderFacilitiesSubtab(space, state) {
    const facilities = space.facilities || {};
    const hiredManagers = Array.isArray(space.hiredManagers) ? space.hiredManagers : [];
    const playerGold = Math.max(0, Number(state.gold || 0));
    const curCash = Number(state.cash || 0);
    const curBank = Number(state.bank || 0);
    const totalFunds = curCash + curBank;

    let html = `
      <div class="space-y-8">
        <!-- 1. Station Facilities Upgrades -->
        <div class="space-y-4">
          <div>
            <h3 class="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <i class="fa-solid fa-sliders text-sky-400"></i>
              <span>تطوير وتحديث مرافق المحطة المدارية</span>
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">قم بترقية المنشآت لزيادة عدد منصات الإطلاق، وتوسيع سعة التخزين، ومضاعفة نقاء الخامات</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    `;

    Object.entries(FACILITIES_META).forEach(([facKey, facDef]) => {
      const curLvl = Math.max(1, Number(facilities[facKey] || 1));
      const nextLvl = curLvl + 1;
      const curLevelData = facDef.levels[curLvl] || {};
      const nextLevelData = facDef.levels[nextLvl];
      const isMax = !nextLevelData;
      const upgradeCost = nextLevelData ? nextLevelData.cost : 0;
      const canAfford = totalFunds >= upgradeCost;

      html += `
        <div class="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 space-y-4 shadow-lg">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-slate-800 text-xl flex items-center justify-center">
                <i class="fa-solid ${facDef.icon}"></i>
              </div>
              <div>
                <h4 class="text-sm font-black text-white">${facDef.name}</h4>
                <div class="text-xs text-sky-400 font-bold mt-0.5">المستوى الحالي: ${curLvl} (${curLevelData.name})</div>
              </div>
            </div>
            <div>
              <span class="px-2.5 py-1 rounded-full text-xs font-black ${
                isMax ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
              }">
                ${isMax ? 'أقصى تطوير' : `مستوى ${curLvl} / 4`}
              </span>
            </div>
          </div>

          <p class="text-xs text-slate-400 leading-relaxed">${curLevelData.desc}</p>

          ${!isMax ? `
            <div class="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs flex items-center justify-between">
              <div>
                <span class="text-slate-500 block text-[10px]">الترقية التالية (مستوى ${nextLvl}):</span>
                <span class="font-bold text-slate-300">${nextLevelData.desc}</span>
              </div>
            </div>
          ` : ''}

          <!-- Upgrade Button -->
          <div class="flex items-center justify-between pt-1">
            <div>
              ${!isMax ? `
                <span class="text-[10px] text-slate-500 block">تكلفة الترقية</span>
                <span class="text-sm font-black text-emerald-400 numbers-font">${upgradeCost.toLocaleString()} ج.م</span>
              ` : `
                <span class="text-xs font-bold text-emerald-400">مكتمل 100%</span>
              `}
            </div>
            ${!isMax ? `
              <button onclick="window.SpaceUI.handleUpgradeFacility('${facKey}')"
                ${!canAfford ? 'disabled' : ''}
                class="px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                  canAfford
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/20 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }">
                <i class="fa-solid fa-arrow-up text-xs"></i>
                <span>ترقية المرفق</span>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    });

    html += `
          </div>
        </div>

        <!-- 2. VIP Gold Space Managers -->
        <div class="space-y-4 pt-4 border-t border-slate-800/80">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 class="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <i class="fa-solid fa-crown text-amber-400"></i>
                <span>كبار مديري واستشاريي الفضاء VIP (شراء بالذهب)</span>
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">توظيف نخبوي دائم يمنحك سرعة فائقة ومضاعفة غلة المعادن والتفريغ التلقائي للرحلات</p>
            </div>
            <div class="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs">
              <i class="fa-solid fa-coins text-amber-400"></i>
              <span class="text-slate-300 font-bold">رصيدك من الذهب:</span>
              <strong class="text-amber-400 numbers-font text-sm">${playerGold.toLocaleString()} ذهبة</strong>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    `;

    Object.entries(GOLD_MANAGERS_META).forEach(([tierStr, mgr]) => {
      const tierNum = Number(tierStr);
      const isHired = hiredManagers.includes(tierNum);
      const canAffordGold = playerGold >= mgr.goldCost;

      html += `
        <div class="rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border ${isHired ? mgr.borderColor : 'border-slate-800'} p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div class="space-y-3">
            <div class="flex items-start justify-between">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr ${mgr.color} flex items-center justify-center text-xl text-white shadow-lg">
                <i class="fa-solid ${mgr.icon}"></i>
              </div>
              <span class="px-2.5 py-1 rounded-full text-xs font-black ${
                isHired ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
              }">
                ${isHired ? 'موظف نشط' : mgr.badge}
              </span>
            </div>

            <div>
              <h4 class="text-sm font-black text-white">${mgr.name}</h4>
              <p class="text-[11px] text-slate-400 mt-0.5">${mgr.title}</p>
            </div>

            <div class="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
              <i class="fa-solid fa-sparkles text-amber-400 ml-1"></i>
              ${mgr.perkDesc}
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-800/60">
            <div>
              <span class="text-[10px] text-slate-500 block">تكلفة التوظيف</span>
              <span class="text-sm font-black text-amber-400 numbers-font">${mgr.goldCost.toLocaleString()} ذهبة</span>
            </div>
            ${!isHired ? `
              <button onclick="window.SpaceUI.handleHireGoldManager(${tierNum})"
                ${!canAffordGold ? 'disabled' : ''}
                class="px-4 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 ${
                  canAffordGold
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                }">
                <i class="fa-solid fa-handshake"></i>
                <span>توظيف دائم</span>
              </button>
            ` : `
              <span class="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <i class="fa-solid fa-circle-check"></i>
                فعال دائماً
              </span>
            `}
          </div>
        </div>
      `;
    });

    html += `
          </div>
        </div>
      </div>
    `;

    return html;
  }

  // Helper Calculations
  function calculateTotalWeight(warehouse = {}) {
    let sum = 0;
    Object.values(warehouse).forEach(v => { sum += Math.max(0, Number(v) || 0); });
    return sum;
  }

  function getSiloCapacity(space = {}) {
    const lvl = Math.max(1, Number(space.facilities?.ore_silo || 1));
    return [0, 1000, 5000, 20000, 100000][lvl] || 1000;
  }

  function calculateClientFallbackRates() {
    const today = new Date().toISOString().slice(0, 10);
    const prices = {};
    Object.entries(ORES_META).forEach(([k, o], idx) => {
      prices[k] = {
        price: o.basePrice,
        changePct: 0,
        isUp: true
      };
    });
    return { date: today, prices: prices };
  }

  // Tester Code Submission
  async function submitTesterCode() {
    const inp = document.getElementById('input-space-tester-code');
    const errEl = document.getElementById('space-tester-code-error');
    const btn = document.getElementById('btn-submit-space-code');
    const code = inp ? inp.value.trim() : '';

    if (!code) {
      if (errEl) {
        errEl.textContent = 'يرجى كتابة رمز فك القفل أولاً!';
        errEl.classList.remove('hidden');
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق...';
    }

    const cleanCode = code.toUpperCase();
    const validFallbackCodes = ['SPACE-2026-TITAN', 'SPACE-2026', 'SPACE-TEST-2026', 'KHALED-SPACE'];

    let verified = false;
    try {
      const res = await callSpaceApi('/api/space/verify-code', { code: cleanCode });
      if (res && res.valid) verified = true;
    } catch (e) {
      if (validFallbackCodes.includes(cleanCode)) {
        verified = true;
      }
    }

    if (verified) {
      try {
        localStorage.setItem('rasalmal_space_tester_authorized', 'true');
        localStorage.setItem('rasalmal_space_tester_code', cleanCode);
      } catch (_) {}
      showSpaceToast('🔓 تم فك قفل محطة الفضاء بنجاح! مرحباً بك في بيئة الاختبار.', 'success');
      renderSpacePanel();
    } else {
      if (errEl) {
        errEl.textContent = 'رمز فك القفل غير صحيح! يرجى التأكد من الرمز والمحاولة ثانية.';
        errEl.classList.remove('hidden');
      }
      showSpaceToast('رمز فك القفل غير صحيح!', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-unlock-keyhole"></i> <span>تأكيد وفك القفل للمعاينة 🚀</span>';
      }
    }
  }

  function relockTesterAccess() {
    try {
      localStorage.removeItem('rasalmal_space_tester_authorized');
      localStorage.removeItem('rasalmal_space_tester_code');
    } catch (_) {}
    showSpaceToast('تم إعادة قفل محطة الفضاء بنجاح.', 'info');
    renderSpacePanel();
  }

  // Action Handlers
  async function handleUnlockStation() {
    const btn = document.getElementById('btn-unlock-space');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التأسيس والخصم...';
    }

    try {
      const testerCode = localStorage.getItem('rasalmal_space_tester_code') || 'SPACE-2026-TITAN';
      const res = await callSpaceApi('/api/space/unlock', { testerCode });
      showSpaceToast(res.message || 'تم تدشين المحطة بنجاح!', 'success');
      updateLocalPlayerState(res);
      renderSpacePanel();
    } catch (err) {
      showSpaceToast(err.message, 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-rocket"></i> <span>إعادة المحاولة</span>';
      }
    }
  }

  async function handleUpgradeFacility(facilityId) {
    try {
      const res = await callSpaceApi('/api/space/upgrade-facility', { facilityId });
      showSpaceToast(res.message || 'تمت الترقية بنجاح!', 'success');
      updateLocalPlayerState(res);
      renderSpacePanel();
    } catch (err) {
      showSpaceToast(err.message, 'error');
    }
  }

  async function handleBuyRocket(modelId) {
    try {
      const res = await callSpaceApi('/api/space/buy-rocket', { modelId });
      showSpaceToast(res.message || 'تم شراء الصاروخ بنجاح!', 'success');
      updateLocalPlayerState(res);
      renderSpacePanel();
    } catch (err) {
      showSpaceToast(err.message, 'error');
    }
  }

  async function claimPayload(flightId) {
    if (_claimingRockets.has(flightId)) return;
    _claimingRockets.add(flightId);

    const btn = document.getElementById(`btn-claim-space-${flightId}`);
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التفريغ بالمخزن...';
    }

    try {
      const res = await callSpaceApi('/api/space/claim', { flightId });
      showSpaceToast(res.message || 'تم استلام الشحنة وتفريغ المعادن بالمخزن!', 'success');
      updateLocalPlayerState(res);
      renderSpacePanel();
    } catch (err) {
      showSpaceToast(err.message, 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-boxes-packing"></i> <span>استلام وتفريغ المعادن</span>';
      }
    } finally {
      _claimingRockets.delete(flightId);
    }
  }

  async function handleSellOre(oreId, amount = 'all') {
    try {
      const res = await callSpaceApi('/api/space/sell-ore', { oreId, amount });
      showSpaceToast(res.message || 'تمت عملية البيع بنجاح!', 'success');
      updateLocalPlayerState(res);
      renderSpacePanel();
    } catch (err) {
      showSpaceToast(err.message, 'error');
    }
  }

  async function handleHireGoldManager(tier) {
    const mgr = GOLD_MANAGERS_META[tier];
    if (!mgr) return;

    if (!confirm(`هل أنت متأكد من توظيف "${mgr.name}" مقابل ${mgr.goldCost} ذهبة؟ الميزة دائمة ولا تنتهي.`)) {
      return;
    }

    try {
      const res = await callSpaceApi('/api/space/hire-gold-manager', { tier });
      showSpaceToast(res.message || 'تم توظيف المدير الفضائي بنجاح!', 'success');
      updateLocalPlayerState(res);
      renderSpacePanel();
    } catch (err) {
      showSpaceToast(err.message, 'error');
    }
  }

  // Launch Modal for selecting rocket & planet
  function openLaunchModal(presetPadId = null) {
    const s = (window.GameEngine && window.GameEngine.state) || {};
    const space = s.space || {};
    const availableRockets = (space.activeRockets || []).filter(r => r && r.status === 'ready');
    const padCount = Math.max(1, Number(space.facilities?.launchpads || 1));
    const activeFlights = Array.isArray(space.activeFlights) ? space.activeFlights : [];

    if (availableRockets.length === 0) {
      showSpaceToast('لا توجد صواريخ جاهزة للإطلاق في حظيرتك حالياً! اشترِ صواريخ من الحظيرة.', 'error');
      setSubtab('fleet');
      return;
    }

    // Determine available pad
    let targetPad = presetPadId;
    if (!targetPad) {
      for (let p = 1; p <= padCount; p++) {
        if (!activeFlights.some(f => f && f.padId === p)) {
          targetPad = p;
          break;
        }
      }
    }

    if (!targetPad) {
      showSpaceToast('جميع منصات الإطلاق مشغولة حالياً! قم بترقية المنصات أو انتظر عودة الرحلات.', 'error');
      return;
    }

    const modalId = 'modal-launch-space-mission';
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto select-none';
    modal.innerHTML = `
      <div class="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-sky-500/40 rounded-3xl p-6 shadow-2xl text-right space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-sm">
              <i class="fa-solid fa-satellite-dish"></i>
            </div>
            <h3 class="text-sm sm:text-base font-black text-white">تجهيز وإطلاق رحلة تنقيب فضائية</h3>
          </div>
          <button onclick="document.getElementById('${modalId}').remove()" class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center transition cursor-pointer">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- 1. Select Rocket -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-slate-300 block">اختر الصاروخ المنطلق:</label>
          <select id="select-space-rocket" onchange="window.SpaceUI.updateLaunchModalPreview()"
            class="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl text-xs font-bold text-white outline-none">
            ${availableRockets.map(r => {
              const meta = ROCKETS_META[r.modelId] || {};
              return `<option value="${r.id}" data-model="${r.modelId}">${r.name} (الفئة ${meta.tier} • حمولة ${meta.cargoCapacity} كجم)</option>`;
            }).join('')}
          </select>
        </div>

        <!-- 2. Select Destination -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-slate-300 block">اختر الكوكب / الوجهة:</label>
          <select id="select-space-dest" onchange="window.SpaceUI.updateLaunchModalPreview()"
            class="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl text-xs font-bold text-white outline-none">
            ${Object.values(DESTINATIONS_META).map(d => {
              return `<option value="${d.id}">🪐 ${d.name} (${d.dist} • ${Math.round(d.baseSec / 60)} دقيقة)</option>`;
            }).join('')}
          </select>
        </div>

        <!-- 3. Launchpad Selection -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-slate-300 block">منصة الإطلاق:</label>
          <input type="text" disabled value="منصة إطلاق رقم (${targetPad})"
            class="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-bold text-sky-400">
        </div>

        <!-- 4. Preview Specs Card -->
        <div id="space-launch-modal-preview" class="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-2 text-xs">
          <!-- Dynamically populated -->
        </div>

        <!-- Launch Confirm Button -->
        <div class="pt-2">
          <button id="btn-submit-space-launch" onclick="window.SpaceUI.submitLaunchMission(${targetPad})"
            class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white font-black text-xs shadow-xl shadow-sky-500/25 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
            <i class="fa-solid fa-paper-plane"></i>
            <span>تأكيد الإطلاق وتزويد الصاروخ بالوقود</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    updateLaunchModalPreview();
  }

  function updateLaunchModalPreview() {
    const preview = document.getElementById('space-launch-modal-preview');
    const rSelect = document.getElementById('select-space-rocket');
    const dSelect = document.getElementById('select-space-dest');
    if (!preview || !rSelect || !dSelect) return;

    const opt = rSelect.options[rSelect.selectedIndex];
    const modelId = opt ? opt.getAttribute('data-model') : 'orion_probe';
    const destId = dSelect.value;

    const model = ROCKETS_META[modelId] || {};
    const dest = DESTINATIONS_META[destId] || {};

    const isRangeAllowed = model.allowedDestinations && model.allowedDestinations.includes(destId);

    preview.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-slate-400">توافق المدى الكوكبي:</span>
        <span class="font-bold ${isRangeAllowed ? 'text-emerald-400' : 'text-rose-400'}">
          ${isRangeAllowed ? '<i class="fa-solid fa-check"></i> الصاروخ قادر على بلوغ الكوكب' : '<i class="fa-solid fa-xmark"></i> خارج مدى هذا الصاروخ'}
        </span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-slate-400">تكلفة الوقود والتجهيز:</span>
        <span class="font-black text-amber-400 numbers-font">${(model.prepCost || 0).toLocaleString()} ج.م</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-slate-400">الزمن التقديري للرحلة:</span>
        <span class="font-bold text-sky-300 numbers-font">${Math.round((dest.baseSec || 1800) / 60)} دقيقة</span>
      </div>
    `;

    const btn = document.getElementById('btn-submit-space-launch');
    if (btn) {
      if (!isRangeAllowed) {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
  }

  async function submitLaunchMission(padId) {
    const rSelect = document.getElementById('select-space-rocket');
    const dSelect = document.getElementById('select-space-dest');
    if (!rSelect || !dSelect) return;

    const rocketId = rSelect.value;
    const destinationId = dSelect.value;

    const btn = document.getElementById('btn-submit-space-launch');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري إطلاق الصاروخ...';
    }

    try {
      const res = await callSpaceApi('/api/space/launch', { rocketId, destinationId, padId });
      showSpaceToast(res.message || 'تم إطلاق الصاروخ بنجاح!', 'success');
      const modal = document.getElementById('modal-launch-space-mission');
      if (modal) modal.remove();
      updateLocalPlayerState(res);
      renderSpacePanel();
    } catch (err) {
      showSpaceToast(err.message, 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>تأكيد الإطلاق وتزويد الصاروخ بالوقود</span>';
      }
    }
  }

  function updateLocalPlayerState(res) {
    const liveState = (typeof window.GameEngine?.getState === 'function') ? window.GameEngine.getState() : (window.GameEngine?.state || {});
    if (liveState && res) {
      if (res.space) liveState.space = res.space;
      if (res.cash !== undefined) liveState.cash = res.cash;
      if (res.bank !== undefined) liveState.bank = res.bank;
      if (res.gold !== undefined) liveState.gold = res.gold;
      if (res.netWorth !== undefined) liveState.netWorth = res.netWorth;
      if (typeof window.renderHeader === 'function') window.renderHeader();
      if (window.AppDB && typeof window.AppDB.save === 'function') {
        try { window.AppDB.save(); } catch (_) {}
      }
    }
  }

  // Pre-fetch 24h rates on boot
  async function fetchMarketRates() {
    try {
      const url = `${getApiBase()}/api/space/market-rates`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.rates) {
          _cachedDailyRates = data.rates;
          _lastRatesFetchTs = Date.now();
        }
      }
    } catch (_) {}
  }
  fetchMarketRates();

  return {
    renderSpacePanel,
    setSubtab,
    handleUnlockStation,
    handleUpgradeFacility,
    handleBuyRocket,
    claimPayload,
    handleSellOre,
    handleHireGoldManager,
    openLaunchModal,
    updateLaunchModalPreview,
    submitLaunchMission,
    submitTesterCode,
    relockTesterAccess
  };
})();
