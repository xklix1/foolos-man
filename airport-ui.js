/**
 * Ras ALmal Tycoon — International Airport Hub Frontend Engine
 * 100% Server-Authoritative UI & Real-Time Flight Visualizer
 * Balanced 7-Day ROI Economy with Operating Costs Breakdown (Fuel, Crew, Landing Fees)
 */

window.AirportUI = (() => {
  let _activeSubtab = 'flights'; // 'flights' | 'fleet' | 'facilities' | 'transit'
  let _flightTickerTimer = null;
  const _claimingPlanes = new Set();

  function getTrustedNow() {
    if (typeof window !== 'undefined' && window.AppDB && typeof window.AppDB.getTrustedNow === 'function') {
      return window.AppDB.getTrustedNow();
    }
    return Date.now();
  }

  const FACILITY_META = {
    runway: {
      name: 'مدرج الطائرات الرئيسي ',
      icon: 'fa-road text-sky-400',
      levels: {
        1: { name: 'مدرج إقليمي معبد', cost: 0, maxPlaneTier: 1, desc: 'يستوعب طائرات الفئة 1 (Cessna VIP)' },
        2: { name: 'مدرج دولي عريض', cost: 12000000, maxPlaneTier: 2, desc: 'يستوعب طائرات الفئة 2 (Airbus A320)' },
        3: { name: 'مدرج عابر للقارات متطور', cost: 40000000, maxPlaneTier: 3, desc: 'يستوعب طائرات الفئة 3 (Boeing 777 / A380)' },
        4: { name: 'مجمع مدارج ذكي CAT III', cost: 95000000, maxPlaneTier: 4, desc: 'يستوعب طائرات الفئة 4 (Gulfstream VIP / Beluga Cargo)' }
      }
    },
    terminals: {
      name: 'صالات الركاب الدولية ',
      icon: 'fa-building-columns text-amber-400',
      levels: {
        1: { name: 'صالة ركاب أساسية', cost: 0, ticketBonus: 1.0, desc: 'رسوم تذاكر قياسية' },
        2: { name: 'مبنى صالات دولي حديث', cost: 10000000, ticketBonus: 1.10, desc: '+10% أرباح تذاكر الرحلات' },
        3: { name: 'صالة كبار الشخصيات VIP والدرجة الأولى', cost: 35000000, ticketBonus: 1.20, desc: '+20% أرباح تذاكر + بونص XP' },
        4: { name: 'مدينة مطار عالمية متكاملة', cost: 85000000, ticketBonus: 1.35, desc: '+35% أرباح تذاكر الرحلات' }
      }
    },
    hangar: {
      name: 'حوض الصيانة وخزانات الوقود ',
      icon: 'fa-wrench text-emerald-400',
      levels: {
        1: { name: 'مرآب صيانة يدوي', cost: 0, timeReduction: 0, fuelDiscount: 0, desc: 'زمن رحلات وتكلفة وقود قياسية' },
        2: { name: 'حوض فحص سريع ومضخات نفاثة', cost: 10000000, timeReduction: 0.05, fuelDiscount: 0.05, desc: '-5% زمن الرحلات و -5% تكلفة الوقود' },
        3: { name: 'مركز نفاثات ومستودع وقود توربيني', cost: 30000000, timeReduction: 0.10, fuelDiscount: 0.10, desc: '-10% زمن الرحلات و -10% تكلفة الوقود' },
        4: { name: 'روبوتات صيانة ومستودع وقود استراتيجي', cost: 75000000, timeReduction: 0.15, fuelDiscount: 0.15, desc: '-15% زمن الرحلات و -15% تكلفة الوقود' }
      }
    },
    duty_free: {
      name: 'السوق الحرة ومتاجر الترانزيت ',
      icon: 'fa-store text-fuchsia-400',
      levels: {
        1: { name: 'أكشاك هدايا وتذكارات', cost: 5000000, passivePerMin: 100, desc: 'دخل سلبي: 100 ج.م/دقيقة (6 آلاف/ساعة)' },
        2: { name: 'مجمع عطور وساعات سويسرية', cost: 18000000, passivePerMin: 300, desc: 'دخل سلبي: 300 ج.م/دقيقة (18 ألف/ساعة)' },
        3: { name: 'مول ماركات عالمية وأزياء راقية', cost: 50000000, passivePerMin: 750, desc: 'دخل سلبي: 750 ج.م/دقيقة (45 ألف/ساعة)' },
        4: { name: 'صالة مزادات مجوهرات وسيارات VIP', cost: 120000000, passivePerMin: 1500, desc: 'دخل سلبي: 1,500 ج.م/دقيقة (90 ألف/ساعة)' }
      }
    }
  };

  const AIRPORT_MANAGERS_META = {
    1: {
      tier: 1,
      name: 'كابتن ليام - مساعد مدير العمليات ',
      title: 'مساعد مدير العمليات الجوية',
      hireCost: 100000000,
      profitBonusPct: 5,
      costDiscountPct: 0,
      xpBonusPct: 0,
      autoPilot: false,
      avatar: 'assets/airport_manager_tier1.jpg',
      badge: 'مساعد عمليات',
      color: 'from-blue-600 to-sky-600',
      borderColor: 'border-sky-500/40',
      desc: 'مساعد عمليات طيران محترف، يشرف على جداول الإقلاع ويرفع أرباح كافة الرحلات الجوية بنسبة +5% فورياً.'
    },
    2: {
      tier: 2,
      name: 'كابتن ألفا - مدير عمليات الطيران ',
      title: 'مدير عمليات الطيران الدولي',
      packageId: 'pkg_airport_manager_tier2',
      profitBonusPct: 10,
      costDiscountPct: 5,
      xpBonusPct: 10,
      autoPilot: false,
      avatar: 'assets/airport_manager_tier2.jpg',
      badge: 'مدير دولي VIP',
      color: 'from-amber-600 to-yellow-500',
      borderColor: 'border-amber-500/40',
      desc: 'مدير طيران دولي مخضرم، يرفع أرباح الرحلات بنسبة +10% ويخفض تكاليف التشغيل بنسبة -5% مع بونص +10% XP.'
    },
    3: {
      tier: 3,
      name: 'الرئيس التنفيذي ألكسندر - إمبراطور الطيران ',
      title: 'المدير التنفيذي العام لشبكة الطيران العالمية',
      packageId: 'pkg_airport_manager_tier3',
      profitBonusPct: 15,
      costDiscountPct: 10,
      xpBonusPct: 15,
      autoPilot: true,
      maxOfflineHours: 72,
      avatar: 'assets/airport_manager_tier3.jpg',
      badge: 'إمبراطور الطيران VIP',
      color: 'from-purple-600 to-pink-600',
      borderColor: 'border-purple-500/40',
      desc: 'تشغيل المطار أوتوماتيكياً بالكامل (Smart Auto-Pilot) وتسيير وتحصيل الرحلات أونلاين وأوفلاين حتى 72 ساعة، مع بونص +15% أرباح و -10% تكاليف.'
    }
  };

  const AIRCRAFT_META = {
    cessna_sky: {
      id: 'cessna_sky',
      name: 'Cessna Sky Courier ',
      tier: 1,
      cost: 3000000,
      capacity: '8 ركاب VIP',
      flightTimeSec: 5400, // 1.5 hours
      baseRevenue: 400000,
      fuelCost: 50000,
      crewCost: 30000,
      landingFee: 20000,
      baseNetProfit: 300000,
      xp: 150,
      speedupGold: 9, // 1 Gold per 10 minutes (90 min -> 9 Gold)
      desc: 'طائرة خفيفة للمسافات الإقليمية ورجال الأعمال (رحلة ساعة ونصف)'
    },
    airbus_a320: {
      id: 'airbus_a320',
      name: 'Airbus A320neo ',
      tier: 2,
      cost: 15000000,
      capacity: '180 مسافر',
      flightTimeSec: 10800, // 3 hours
      baseRevenue: 1350000,
      fuelCost: 175000,
      crewCost: 105000,
      landingFee: 70000,
      baseNetProfit: 1000000,
      xp: 450,
      speedupGold: 18, // 1 Gold per 10 minutes (180 min -> 18 Gold)
      desc: 'طائرة ركاب دولية عالية الكفاءة للمسافات المتوسطة (رحلة 3 ساعات)'
    },
    boeing_777: {
      id: 'boeing_777',
      name: 'Boeing 777-300ER ',
      tier: 3,
      cost: 55000000,
      capacity: '390 مسافر',
      flightTimeSec: 16200, // 4.5 hours
      baseRevenue: 3700000,
      fuelCost: 500000,
      crewCost: 320000,
      landingFee: 180000,
      baseNetProfit: 2700000,
      xp: 1200,
      speedupGold: 27, // 1 Gold per 10 minutes (270 min -> 27 Gold)
      desc: 'طائر عملاق عابر للقارات للرحلات الدولية الطويلة (رحلة 4.5 ساعات)'
    },
    gulfstream_g650: {
      id: 'gulfstream_g650',
      name: 'Gulfstream G650 VIP ',
      tier: 4,
      cost: 85000000,
      capacity: 'نخبة رجال الأعمال والأمراء VIP',
      flightTimeSec: 21600, // 6 hours
      baseRevenue: 6000000,
      fuelCost: 750000,
      crewCost: 450000,
      landingFee: 300000,
      baseNetProfit: 4500000,
      xp: 1500,
      speedupGold: 36, // 1 Gold per 10 minutes (360 min -> 36 Gold)
      desc: 'طائرة نفاثة فاخرة لنقل كبار الشخصيات بعوائد قياسية (رحلة 6 ساعات)'
    },
    cargo_beluga: {
      id: 'cargo_beluga',
      name: 'Airbus BelugaXL Heavy Cargo ',
      tier: 4,
      cost: 125000000,
      capacity: '50 طن بضائع ومعدات ثقيلة',
      flightTimeSec: 27000, // 7.5 hours
      baseRevenue: 9000000,
      fuelCost: 1000000,
      crewCost: 600000,
      landingFee: 400000,
      baseNetProfit: 7000000,
      xp: 2200,
      speedupGold: 45, // 1 Gold per 10 minutes (450 min -> 45 Gold)
      desc: 'وحش الشحن الجوي العملاق لنقل الشحنات الفاخرة حول العالم (رحلة 7.5 ساعات)'
    },
    airbus_a380: {
      id: 'airbus_a380',
      name: 'Airbus A380 Superjumbo ',
      tier: 3,
      cost: 220000000,
      capacity: '615 مسافر (طابقين)',
      flightTimeSec: 36000, // 10 hours
      baseRevenue: 19500000,
      fuelCost: 2200000,
      crewCost: 1300000,
      landingFee: 1000000,
      baseNetProfit: 15000000,
      xp: 4500,
      speedupGold: 60, // 1 Gold per 10 minutes (600 min -> 60 Gold)
      desc: 'القلعة الطائرة ذات الطابقين.. أضخم طائرة ركاب في العالم (رحلة 10 ساعات)'
    }
  };

  const DESTINATIONS_META = [
    { id: 'cairo_riyadh', name: 'الرياض ', mult: 1.0, tier: 1 },
    { id: 'cairo_dubai', name: 'دبي ', mult: 1.25, tier: 1 },
    { id: 'cairo_istanbul', name: 'إسطنبول ', mult: 1.5, tier: 2 },
    { id: 'cairo_london', name: 'لندن ', mult: 2.0, tier: 2 },
    { id: 'cairo_paris', name: 'باريس ', mult: 2.2, tier: 2 },
    { id: 'cairo_newyork', name: 'نيويورك ', mult: 3.0, tier: 3 },
    { id: 'cairo_tokyo', name: 'طوكيو ', mult: 3.5, tier: 3 }
  ];

  function init() {
    if (_flightTickerTimer) clearInterval(_flightTickerTimer);
    _flightTickerTimer = setInterval(() => {
      updateFlightTimers();
    }, 1000);
  }

  function renderAirportPanel() {
    const container = document.getElementById('airport-main-container');
    if (!container) return;

    const state = (window.GameEngine && window.GameEngine.state) || {};
    const airport = state.airport;

    if (!airport || !airport.unlocked) {
      renderUnlockGateway(container, state);
    } else {
      renderActiveAirport(container, state);
    }
  }

  /**
   * Renders the Airport Unlock Licensing Gateway (Requires dynamic security code)
   */
  function renderUnlockGateway(container, state) {
    const minXp = 2500;
    const cost = 30000000;
    const curCash = Number(state.cash || 0);
    const curBank = Number(state.bank || 0);
    const totalLiquid = curCash + curBank;
    const curXp = Number(state.xp || 0);

    const hasFunds = totalLiquid >= cost;
    const hasXp = curXp >= minXp;

    container.innerHTML = `
      <div class="glass-panel p-6 sm:p-10 rounded-3xl border border-sky-500/30 relative overflow-hidden shadow-2xl text-center space-y-8"
        style="background: radial-gradient(ellipse at top, rgba(14, 165, 233, 0.15), rgba(15, 23, 42, 0.98)) !important;">
        
        <div class="absolute -top-24 -right-24 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Aviation Badge & Icon -->
        <div class="relative z-10 flex flex-col items-center justify-center space-y-4">
          <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-sky-600 via-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-2xl shadow-sky-500/30 border border-sky-300/30 animate-pulse">
            <i class="fa-solid fa-plane-departure text-4xl sm:text-5xl"></i>
          </div>
          <div class="space-y-2 max-w-xl">
            <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold">
              <i class="fa-solid fa-shield-halved"></i>
              <span>مشروع استراتيجي عملاق • Aviation Authority</span>
            </div>
            <h2 class="text-2xl sm:text-4xl font-black text-white tracking-wide">
              مطار الطيران الدولي والأسطول الجوي 
            </h2>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              امتلك مطارك الخاص، وشيّد المدارج الدولية، وأسس أسطول طائرات يربط بين عواصم العالم لجلب تدفقات أرباح بالملايين وخبرة استثنائية!
            </p>
          </div>
        </div>

        <!-- Requirements Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-right relative z-10">
          <div class="p-4 rounded-2xl bg-slate-900/80 border ${hasFunds ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800'} flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
                <i class="fa-solid fa-money-bill-wave"></i>
              </div>
              <div>
                <div class="text-[11px] text-slate-400 font-bold">رسوم رخصة الطيران</div>
                <div class="text-sm font-black text-emerald-400 numbers-font">${cost.toLocaleString()} ج.م</div>
              </div>
            </div>
            <div>
              ${hasFunds 
                ? '<span class="text-xs font-bold text-emerald-400 flex items-center gap-1"><i class="fa-solid fa-check"></i> جاهز</span>' 
                : '<span class="text-xs font-bold text-rose-400 flex items-center gap-1"><i class="fa-solid fa-xmark"></i> غير كافٍ</span>'}
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-slate-900/80 border ${hasXp ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800'} flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg">
                <i class="fa-solid fa-star"></i>
              </div>
              <div>
                <div class="text-[11px] text-slate-400 font-bold">الخبرة المطلوبة (XP)</div>
                <div class="text-sm font-black text-amber-400 numbers-font">${minXp.toLocaleString()} XP</div>
              </div>
            </div>
            <div>
              ${hasXp 
                ? '<span class="text-xs font-bold text-emerald-400 flex items-center gap-1"><i class="fa-solid fa-check"></i> مكتمل</span>' 
                : `<span class="text-xs font-bold text-rose-400">${curXp.toLocaleString()} / ${minXp.toLocaleString()}</span>`}
            </div>
          </div>
        </div>

        <!-- License Form Inputs -->
        <div class="max-w-md mx-auto space-y-4 p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-slate-800 relative z-10 text-right">
          <div class="space-y-1.5">
            <label class="block text-xs font-black text-slate-300 flex items-center gap-1.5">
              <i class="fa-solid fa-signature text-[11px] text-amber-400"></i>
              <span>اسم المطار المخصص لك:</span>
            </label>
            <input type="text" id="airport-custom-name-input" value="مطار رأس المال الدولي" maxlength="35"
              class="w-full px-4 py-3 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl text-right text-xs font-bold text-white placeholder:text-slate-600 outline-none transition">
          </div>

          <button id="btn-airport-submit-unlock"
            class="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-sky-500/25 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
            <i class="fa-solid fa-plane-departure"></i>
            <span>شراء رخصة المطار وتدشين الأسطول الجوي </span>
          </button>
        </div>
      </div>
    `;

    function showAirportToast(msg, type = 'info') {
      try {
        if (typeof window.showToast === 'function') {
          window.showToast(msg, '', type);
          return;
        }
        if (window.UI && typeof window.UI.showToast === 'function') {
          window.UI.showToast(msg, type);
          return;
        }
      } catch (_) {}

      // Standalone Floating Toast Notification
      let container = document.getElementById('airport-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'airport-toast-container';
        container.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      const isSuccess = type === 'success';
      const isError = type === 'error';
      toast.className = `p-4 rounded-2xl border shadow-2xl text-white text-xs font-bold text-center pointer-events-auto transition-all transform duration-300 translate-y-2 opacity-0 flex items-center justify-center gap-2 ${
        isSuccess ? 'bg-emerald-950/95 border-emerald-500/60 shadow-emerald-900/50' :
        isError ? 'bg-rose-950/95 border-rose-500/60 shadow-rose-900/50' :
        'bg-slate-900/95 border-sky-500/60 shadow-sky-900/50'
      }`;
      const icon = document.createElement('i');
      icon.className = `fa-solid ${isSuccess ? 'fa-circle-check text-emerald-400' : isError ? 'fa-triangle-exclamation text-rose-400' : 'fa-circle-info text-sky-400'} text-base`;
      const msgSpan = document.createElement('span');
      msgSpan.textContent = String(msg || '');
      toast.appendChild(icon);
      toast.appendChild(msgSpan);
      container.appendChild(toast);
      requestAnimationFrame(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
      });
      setTimeout(() => {
        toast.classList.add('opacity-0', '-translate-y-2');
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }

    const btnUnlock = document.getElementById('btn-airport-submit-unlock');
    if (btnUnlock) {
      btnUnlock.addEventListener('click', async () => {
        const nameInput = document.getElementById('airport-custom-name-input');
        const airportName = (nameInput?.value || '').trim() || 'مطار رأس المال الدولي';

        btnUnlock.disabled = true;
        btnUnlock.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الشراء وتدشين المطار...';

        // 1. Try Server-Authoritative Bridge if active
        let serverSuccess = false;
        if (window.ServerBridge && typeof window.ServerBridge.unlockAirport === 'function') {
          try {
            const res = await window.ServerBridge.unlockAirport('', airportName);
            if (res && res.success) {
              serverSuccess = true;
              showAirportToast(res.message || 'تم تدشين المطار بنجاح!', 'success');
              const liveState = (typeof window.GameEngine?.getState === 'function') ? window.GameEngine.getState() : (window.GameEngine?.state || {});
              if (liveState) {
                liveState.airport = res.airport;
                if (res.cash !== undefined) liveState.cash = res.cash;
                if (res.bank !== undefined) liveState.bank = res.bank;
                if (res.netWorth !== undefined) liveState.netWorth = res.netWorth;
                if (window.renderHeader) window.renderHeader();
              }
              if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
                window.GameEngine.recordPlayerActivity('افتتاح المطار الدولي ', `دفع رسوم ترخيص وتدشين "${airportName}" بنجاح`, 'business');
              }
              renderAirportPanel();
              return;
            }
          } catch (serverErr) {
            console.warn('[AirportUI] Server bridge unlock attempt failed, trying local fallback:', serverErr.message);
          }
        }

        // 2. Resilient Client-Side Authoritative Fallback
        try {
          const liveState = (typeof window.GameEngine?.getState === 'function') ? window.GameEngine.getState() : (window.GameEngine?.state || {});
          const uName = (liveState.username || '').toLowerCase();
          const isAdmin = uName === 'khaled' || uName === 'خالد' || liveState.isAdmin === true;

          const minXp = 2500;
          const curXp = Number(liveState.xp || 0);
          if (!isAdmin && curXp < minXp) {
            throw new Error(` يتطلب فتح المطار خبرة لا تقل عن ${minXp.toLocaleString()} XP (خبرتك الحالية: ${curXp.toLocaleString()} XP)`);
          }

          const cost = 30000000;
          const curCash = Number(liveState.cash || 0);
          const curBank = Number(liveState.bank || 0);
          if (!isAdmin && (curCash + curBank) < cost) {
            throw new Error(` رصيدك غير كافٍ لدفع رسوم رخصة المطار (${cost.toLocaleString()} ج.م)`);
          }

          // Deduct cost if not admin free bypass
          if (!isAdmin) {
            if (curCash >= cost) {
              liveState.cash = curCash - cost;
            } else {
              const rem = cost - curCash;
              liveState.cash = 0;
              liveState.bank = Math.max(0, curBank - rem);
            }
          }

          // Initialize Airport State
          liveState.airport = {
            unlocked: true,
            unlockedAt: Date.now(),
            name: airportName,
            facilities: {
              runway: 1,
              terminals: 1,
              hangar: 1,
              duty_free: 0
            },
            fleet: [
              {
                id: 'plane_' + Date.now() + '_starter',
                modelId: 'cessna_sky',
                status: 'idle',
                totalFlights: 0,
                totalRevenue: 0,
                currentFlight: null
              }
            ],
            stats: {
              totalFlights: 0,
              totalRevenue: 0,
              totalOperatingCost: 0,
              totalNetProfit: 0,
              totalDutyFreeCollected: 0,
              transitPermitsAccepted: 0
            },
            lastDutyFreeCollectionAt: Date.now(),
            transitPermit: null
          };

          if (typeof window.GameEngine?.saveState === 'function') {
            window.GameEngine.saveState();
          }
          if (typeof window.GameEngine?.recordPlayerActivity === 'function') {
            window.GameEngine.recordPlayerActivity('افتتاح المطار الدولي ', `دفع رسوم ترخيص وتدشين "${airportName}" بمبلغ ${(cost || 30000000).toLocaleString()} ج.م`, 'business');
          }
          if (window.renderHeader) window.renderHeader();

          showAirportToast(` تم تدشين ${airportName} بنجاح وإضافة طائرة Cessna إلى الأسطول!`, 'success');
          renderAirportPanel();
        } catch (err) {
          showAirportToast(err.message || 'فشل تفعيل المطار', 'error');
          btnUnlock.disabled = false;
          btnUnlock.innerHTML = '<i class="fa-solid fa-passport"></i> <span>تفعيل رخصة المطار وتدشين الأسطول الجوي </span>';
        }
      });
    }
  }

  /**
   * Renders the Active Airport Hub with Tabs and Controls
   */
  function renderActiveAirport(container, state) {
    const airport = state.airport || {};
    const fleet = Array.isArray(airport.fleet) ? airport.fleet : [];
    const stats = airport.stats || {};
    const dutyFreeAccumulated = calculateDutyFreeClient(airport);

    container.innerHTML = `
      <!-- 1. Airport Hero Header Bar -->
      <div class="glass-panel p-6 rounded-3xl border border-sky-500/30 relative overflow-hidden shadow-2xl"
        style="background: radial-gradient(ellipse at top right, rgba(14, 165, 233, 0.2), rgba(15, 23, 42, 0.95)) !important;">
        
        <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 relative z-10">
          <div class="space-y-2">
            <div class="flex items-center gap-3 flex-wrap">
              <h2 id="airport-hero-name" class="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <i class="fa-solid fa-plane-departure text-sky-400"></i>
                <span>${airport.name || 'مطار رأس المال الدولي'}</span>
              </h2>
              <button id="btn-airport-rename" title="تعديل اسم المطار"
                class="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-amber-400 border border-slate-700 flex items-center justify-center transition cursor-pointer text-xs">
                <i class="fa-solid fa-pen"></i>
              </button>
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>المطار يعمل بكامل طاقته</span>
              </span>
            </div>
            <p class="text-xs text-slate-300">
              الأسطول الجوي: <strong class="text-sky-400 numbers-font font-bold">${fleet.length} / 12 طائرة</strong> | 
              إجمالي الرحلات: <strong class="text-amber-400 numbers-font font-bold">${(stats.totalFlights || 0).toLocaleString()}</strong> | 
              صافي الأرباح: <strong class="text-emerald-400 numbers-font font-bold">${(stats.totalNetProfit || stats.totalRevenue || 0).toLocaleString()} ج.م</strong>
            </p>
          </div>

          <!-- Duty Free Passive Cash Widget -->
          <div class="w-full lg:w-auto p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-fuchsia-500/30 flex items-center justify-between lg:justify-start gap-4 shadow-lg shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center text-lg">
                <i class="fa-solid fa-bag-shopping"></i>
              </div>
              <div class="text-right">
                <div class="text-[10px] text-slate-400 font-bold">أرباح السوق الحرة المتراكمة</div>
                <div id="airport-duty-free-amount" class="text-sm font-black text-fuchsia-400 numbers-font">
                  +${dutyFreeAccumulated.toLocaleString()} ج.م
                </div>
              </div>
            </div>
            <button id="btn-claim-duty-free" ${(dutyFreeAccumulated < 1000 || (Number(airport.lastDutyFreeCollectionAt || 0) > 0 && (getTrustedNow() - Number(airport.lastDutyFreeCollectionAt || 0)) < 60000)) ? 'disabled' : ''}
              class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-black text-xs transition shadow-md disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1.5 shrink-0">
              <i class="fa-solid fa-hand-holding-dollar"></i>
              <span>تحصيل</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Airport Navigation Subtabs -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-800">
        <button data-subtab="flights" class="airport-nav-subtab px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${_activeSubtab === 'flights' ? 'bg-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/20' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'}">
          <i class="fa-solid fa-plane-up"></i>
          <span>لوحة الرحلات (${fleet.length})</span>
        </button>
        <button data-subtab="fleet" class="airport-nav-subtab px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${_activeSubtab === 'fleet' ? 'bg-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/20' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'}">
          <i class="fa-solid fa-plane"></i>
          <span>متجر وحظيرة الطائرات</span>
        </button>
        <button data-subtab="facilities" class="airport-nav-subtab px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${_activeSubtab === 'facilities' ? 'bg-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/20' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'}">
          <i class="fa-solid fa-city"></i>
          <span>تطوير مرافق المطار</span>
        </button>
        <button data-subtab="transit" class="airport-nav-subtab px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${_activeSubtab === 'transit' ? 'bg-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/20' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'}">
          <i class="fa-solid fa-tower-broadcast"></i>
          <span>برج المراقبة والترانزيت </span>
        </button>
        <button data-subtab="managers" class="airport-nav-subtab px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${_activeSubtab === 'managers' ? 'bg-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/20' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'}">
          <i class="fa-solid fa-user-tie"></i>
          <span>مدراء المطار </span>
          ${airport.manager?.tier ? `<span class="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[9px]">T${airport.manager.tier}</span>` : ''}
        </button>
      </div>

      <!-- 3. Dynamic Subtab Content -->
      <div id="airport-subtab-container" class="space-y-6">
        ${renderSubtabContent(airport, state)}
      </div>
    `;

    bindAirportEvents(airport, state);
  }

  function renderSubtabContent(airport, state) {
    if (_activeSubtab === 'flights') {
      return renderFlightsSubtab(airport, state);
    } else if (_activeSubtab === 'fleet') {
      return renderFleetStoreSubtab(airport, state);
    } else if (_activeSubtab === 'facilities') {
      return renderFacilitiesSubtab(airport, state);
    } else if (_activeSubtab === 'transit') {
      return renderTransitSubtab(airport, state);
    } else if (_activeSubtab === 'managers') {
      return renderManagersSubtab(airport, state);
    }
    return '';
  }

  /**
   * Subtab 1: Flight Schedules & Active Fleet Cards
   */
  function renderFlightsSubtab(airport, state) {
    const fleet = Array.isArray(airport.fleet) ? airport.fleet : [];
    if (fleet.length === 0) {
      return `
        <div class="glass-panel p-8 text-center rounded-3xl border border-slate-800 space-y-4">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center text-2xl">
            <i class="fa-solid fa-plane-slash"></i>
          </div>
          <h3 class="text-base font-black text-white">لا توجد طائرات في حظيرتك حالياً!</h3>
          <p class="text-xs text-slate-400 max-w-sm mx-auto">توجه إلى قسم "متجر وحظيرة الطائرات" لشراء طائرات وتسيير رحلاتك الدولية.</p>
          <button onclick="window.AirportUI.setSubtab('fleet')" class="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer">
            شراء طائرة جديدة 
          </button>
        </div>
      `;
    }

    const inFlightCount = fleet.filter(p => p.status === 'in_flight').length;

    return `
      <div class="space-y-4">
        <!-- Max 5 Active Flights Status Bar -->
        <div class="p-3.5 rounded-2xl bg-slate-900/90 border ${inFlightCount >= 5 ? 'border-rose-500/40 bg-rose-950/20' : 'border-sky-500/20'} flex items-center justify-between flex-wrap gap-2 text-xs shadow-lg">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full ${inFlightCount >= 5 ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}"></span>
            <span class="text-slate-200 font-bold">الرحلات المحلقة في الجو:</span>
            <span class="px-2.5 py-0.5 rounded-lg ${inFlightCount >= 5 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'} font-black numbers-font text-xs">
              ${inFlightCount} / 5 طائرات (الحد الأقصى)
            </span>
          </div>
          <div class="text-[11px]">
            ${inFlightCount >= 5 
              ? '<span class="text-rose-400 font-bold flex items-center gap-1"><i class="fa-solid fa-triangle-exclamation"></i> تم بلوغ الحد الأقصى (5 طائرات محلقة). انتظر هبوط إحداها.</span>' 
              : `<span class="text-slate-400">يمكنك إطلاق <strong class="text-emerald-400">${5 - inFlightCount}</strong> رحلات إضافية في نفس الوقت</span>`}
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          ${fleet.map(plane => renderPlaneCard(plane, airport, state)).join('')}
        </div>
      </div>
    `;
  }

  function getFacilityBonusesClient(airport) {
    const f = airport?.facilities || {};
    const tLvl = f.terminals || 1;
    const hLvl = f.hangar || 1;
    const rLvl = f.runway || 1;
    const manager = airport?.manager || {};
    const mTier = Number(manager.tier || 0);

    let managerProfitMult = 1.0;
    let managerCostDiscount = 0;
    if (mTier === 1) {
      managerProfitMult = 1.05;
    } else if (mTier === 2) {
      managerProfitMult = 1.10;
      managerCostDiscount = 0.05;
    } else if (mTier >= 3) {
      managerProfitMult = 1.15;
      managerCostDiscount = 0.10;
    }

    const baseTicketBonus = FACILITY_META.terminals.levels[tLvl]?.ticketBonus || 1.0;
    const ticketBonus = baseTicketBonus * managerProfitMult;
    const timeReduction = FACILITY_META.hangar.levels[hLvl]?.timeReduction || 0;
    const baseFuelDiscount = FACILITY_META.hangar.levels[hLvl]?.fuelDiscount || 0;
    const fuelDiscount = Math.min(0.50, baseFuelDiscount + managerCostDiscount);
    const maxPlaneTier = FACILITY_META.runway.levels[rLvl]?.maxPlaneTier || 1;

    return { ticketBonus, timeReduction, fuelDiscount, maxPlaneTier, managerCostDiscount, managerProfitMult, managerTier: mTier };
  }

  function getEconomicsForDisplay(model, dest, airport) {
    const bonuses = getFacilityBonusesClient(airport);
    const distMult = dest.mult || 1.0;
    const managerCostDiscount = bonuses.managerCostDiscount || 0;

    const grossRevenue = Math.floor(model.baseRevenue * distMult * bonuses.ticketBonus);
    const rawFuel = model.fuelCost * distMult;
    const fuelCost = Math.floor(rawFuel * (1 - bonuses.fuelDiscount));
    const crewCost = Math.floor(model.crewCost * distMult * (1 - managerCostDiscount));
    const landingFee = Math.floor(model.landingFee * distMult * (1 - managerCostDiscount));

    const totalOperatingCost = fuelCost + crewCost + landingFee;
    const netProfit = Math.max(0, grossRevenue - totalOperatingCost);
    const baseDuration = model.flightTimeSec || 18000;
    const durationSec = Math.max(60, Math.floor(baseDuration * distMult * (1 - bonuses.timeReduction)));
    const speedupGold = Math.max(1, Math.ceil(durationSec / 600)); // 1 Gold per 10 minutes (600s)

    return {
      grossRevenue,
      fuelCost,
      fuelDiscountPct: Math.round(bonuses.fuelDiscount * 100),
      crewCost,
      landingFee,
      totalOperatingCost,
      netProfit,
      durationSec,
      speedupGold,
      managerTier: bonuses.managerTier,
      managerProfitBonusPct: Math.round((bonuses.managerProfitMult - 1) * 100),
      managerCostDiscountPct: Math.round(managerCostDiscount * 100)
    };
  }

  function renderPlaneCard(plane, airport, state) {
    const model = AIRCRAFT_META[plane.modelId] || AIRCRAFT_META.cessna_sky;
    const flight = plane.currentFlight || plane.activeFlight || {};
    const isFlight = plane.status === 'in_flight' && Boolean(flight.launchTime || flight.destinationName);
    const now = getTrustedNow();
    const landingTime = Number(flight.landingTime || 0);
    const isLanded = isFlight && (now >= landingTime);
    const remSec = Math.max(0, Math.ceil((landingTime - now) / 1000));
    const currentSpeedupCost = Math.max(1, Math.ceil(remSec / 600));

    // Calculate initial preview economics for the default destination
    const availableDests = DESTINATIONS_META.filter(d => model.tier >= d.tier);
    const defaultDest = availableDests[0] || DESTINATIONS_META[0];
    const eco = getEconomicsForDisplay(model, defaultDest, airport);

    return `
      <div class="glass-panel p-5 rounded-3xl border ${isFlight ? 'border-sky-500/40 bg-slate-900/90' : 'border-slate-800 bg-slate-950/80'} relative overflow-hidden shadow-xl space-y-4" id="card-plane-${plane.id}">
        
        <!-- Plane Header -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center text-xl shrink-0">
              <i class="fa-solid ${model.id.includes('cargo') ? 'fa-box-open' : (model.id.includes('gulfstream') ? 'fa-crown text-amber-400' : 'fa-plane')}"></i>
            </div>
            <div>
              <div class="text-sm font-black text-white flex items-center gap-2">
                <span>${plane.customName || model.name}</span>
                <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">فئة ${model.tier}</span>
              </div>
              <div class="text-[11px] text-slate-400">${model.name} • ${model.capacity}</div>
            </div>
          </div>
          <div>
            ${isFlight 
              ? (isLanded 
                  ? '<span class="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30 animate-pulse flex items-center gap-1"><i class="fa-solid fa-plane-arrival"></i> هبطت وجاهزة للتحصيل</span>'
                  : '<span class="px-2.5 py-1 rounded-xl bg-sky-500/20 text-sky-400 text-[10px] font-black border border-sky-500/30 flex items-center gap-1"><i class="fa-solid fa-plane-up animate-bounce"></i> في الجو</span>')
              : '<span class="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700 flex items-center gap-1"><i class="fa-solid fa-circle text-[7px] text-emerald-400"></i> جاهزة للإقلاع</span>'}
          </div>
        </div>

        <!-- Flight In Progress State -->
        ${isFlight ? `
          <div class="space-y-3 p-4 rounded-2xl bg-slate-900/80 border border-sky-500/20">
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-400">الوجهة: <strong class="text-white">${flight.destinationName || (DESTINATIONS_META.find(d => d.id === flight.destinationId)?.name) || 'طيران دولي'}</strong></span>
              <span class="text-slate-400">صافي الربح: <strong class="text-emerald-400 numbers-font font-bold">+${(flight.expectedNetProfit !== undefined ? flight.expectedNetProfit : Math.max(0, Number(flight.grossRevenue || flight.expectedProfit || 0) - Number(flight.totalOperatingCost || 0))).toLocaleString()} ج.م</strong></span>
            </div>

            <!-- Operating Costs Summary -->
            <div class="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] space-y-1 text-slate-400">
              <div class="flex justify-between">
                <span>إجمالي التذاكر: <strong class="text-white numbers-font">+${(flight.grossRevenue || flight.expectedProfit || 0).toLocaleString()} ج.م</strong></span>
                <span>تكاليف التشغيل المدفوعة: <strong class="text-rose-400 numbers-font">-${(flight.totalOperatingCost || 0).toLocaleString()} ج.م</strong></span>
              </div>
            </div>

            <!-- Progress & Timer -->
            <div class="space-y-1.5">
              <div class="flex justify-between text-[11px] font-bold">
                <span class="text-slate-400">حالة الرحلة:</span>
                <span id="timer-${plane.id}" class="text-sky-400 font-black numbers-font" data-landing="${landingTime}">
                  ${isLanded ? ' وصلت الوجهة!' : `متبقي: ${formatSeconds(remSec)}`}
                </span>
              </div>
              <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div id="bar-${plane.id}" class="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-1000"
                  style="width: ${isLanded ? '100%' : Math.min(100, Math.max(5, Math.round(((Date.now() - flight.launchTime) / (flight.durationSec * 1000)) * 100)))}%;"></div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2 pt-1">
              ${isLanded ? `
                <button onclick="window.AirportUI.claimFlight('${plane.id}')"
                  ${_claimingPlanes.has(plane.id) ? 'disabled' : ''}
                  class="w-full py-2.5 bg-gradient-to-r ${_claimingPlanes.has(plane.id) ? 'from-slate-700 to-slate-800 text-slate-400 cursor-not-allowed' : 'from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 cursor-pointer animate-bounce'} font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                  <i class="fa-solid ${_claimingPlanes.has(plane.id) ? 'fa-spinner fa-spin' : 'fa-hand-holding-dollar'}"></i>
                  <span>${_claimingPlanes.has(plane.id) ? 'جاري التحصيل والتحقق...' : `تحصيل عوائد الرحلة (+${(flight.grossRevenue || flight.expectedProfit || 0).toLocaleString()} ج.م)`}</span>
                </button>
              ` : `
                <button onclick="window.AirportUI.speedupFlight('${plane.id}')" id="btn-speedup-${plane.id}"
                  class="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5">
                  <i class="fa-solid fa-bolt"></i>
                  <span id="speedup-cost-${plane.id}">تسريع فوري (${currentSpeedupCost} ذهب)</span>
                </button>
                <button onclick="window.AirportUI.claimFlight('${plane.id}')" id="btn-claim-${plane.id}" style="display: none;"
                  class="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                  <i class="fa-solid fa-hand-holding-dollar"></i>
                  <span>تحصيل</span>
                </button>
              `}
            </div>
          </div>
        ` : `
          <!-- Idle Schedule State with Operating Costs Breakdown -->
          <div class="space-y-3 pt-1">
            <div class="space-y-1">
              <label class="block text-[11px] font-bold text-slate-400">اختر مسار ووجهة السفر:</label>
              <select id="select-dest-${plane.id}" onchange="window.AirportUI.updateEconomicsPreview('${plane.id}', '${plane.modelId}')"
                class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-sky-500 transition">
                ${availableDests.map(d => {
                  return `<option value="${d.id}">${d.name}</option>`;
                }).join('')}
              </select>
            </div>

            <!-- Operating Costs Breakdown Card -->
            <div id="eco-preview-${plane.id}" class="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-[11px]">
              <div class="flex justify-between text-slate-300">
                <span> إجمالي عوائد التذاكر:</span>
                <strong class="text-emerald-400 numbers-font font-bold">+${eco.grossRevenue.toLocaleString()} ج.م</strong>
              </div>
              <div class="flex justify-between text-slate-400">
                <span> وقود الطيران ${eco.fuelDiscountPct > 0 ? `<span class="text-emerald-400 text-[9px]">(-${eco.fuelDiscountPct}%)</span>` : ''}:</span>
                <span class="text-rose-400 numbers-font">-${eco.fuelCost.toLocaleString()} ج.م</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span> طاقم الملاحة والضيافة:</span>
                <span class="text-rose-400 numbers-font">-${eco.crewCost.toLocaleString()} ج.م</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span> رسوم الهبوط الدولي:</span>
                <span class="text-rose-400 numbers-font">-${eco.landingFee.toLocaleString()} ج.م</span>
              </div>
              <div class="pt-1 border-t border-slate-800 flex justify-between items-center text-xs font-black">
                <span class="text-sky-400"> صافي الأرباح المتوقعة:</span>
                <strong class="text-emerald-400 numbers-font text-sm">+${eco.netProfit.toLocaleString()} ج.م</strong>
              </div>
              <div class="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
                <span> مدة الرحلة: <strong class="text-slate-300">${formatDurationHuman(eco.durationSec)}</strong></span>
                <span>تكلفة الإقلاع الفورية: <strong class="text-rose-400 font-bold">${eco.totalOperatingCost.toLocaleString()} ج.م</strong></span>
              </div>
            </div>

            <div class="flex items-center gap-2 pt-1">
              <button onclick="window.AirportUI.launchFlight('${plane.id}')"
                class="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-sky-500/20 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2">
                <i class="fa-solid fa-plane-departure"></i>
                <span>تزويد الوقود وإقلاع الرحلة </span>
              </button>
              <button onclick="window.AirportUI.sellPlane('${plane.id}')"
                title="بيع الطائرة بنصف سعر الشراء (+${Math.floor(model.cost * 0.5).toLocaleString()} ج.م)"
                class="px-3.5 py-2.5 bg-slate-900 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 font-black text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-md">
                <i class="fa-solid fa-hand-holding-dollar text-amber-400"></i>
                <span>بيع (+${Math.floor(model.cost * 0.5).toLocaleString()} ج.م)</span>
              </button>
            </div>
          </div>
        `}
      </div>
    `;
  }

  function formatDurationHuman(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0 && m > 0) return `${h} ساعة و ${m} د`;
    if (h > 0) return `${h} ساعة`;
    return `${m} دقيقة`;
  }

  function updateEconomicsPreview(planeId, modelId) {
    const select = document.getElementById(`select-dest-${planeId}`);
    const previewContainer = document.getElementById(`eco-preview-${planeId}`);
    if (!select || !previewContainer) return;

    const destId = select.value;
    const dest = DESTINATIONS_META.find(d => d.id === destId) || DESTINATIONS_META[0];
    const model = AIRCRAFT_META[modelId] || AIRCRAFT_META.cessna_sky;
    const state = (window.GameEngine && window.GameEngine.state) || {};
    const eco = getEconomicsForDisplay(model, dest, state.airport);

    previewContainer.innerHTML = `
      <div class="flex justify-between text-slate-300">
        <span> إجمالي عوائد التذاكر:</span>
        <strong class="text-emerald-400 numbers-font font-bold">+${eco.grossRevenue.toLocaleString()} ج.م</strong>
      </div>
      <div class="flex justify-between text-slate-400">
        <span> وقود الطيران ${eco.fuelDiscountPct > 0 ? `<span class="text-emerald-400 text-[9px]">(-${eco.fuelDiscountPct}%)</span>` : ''}:</span>
        <span class="text-rose-400 numbers-font">-${eco.fuelCost.toLocaleString()} ج.م</span>
      </div>
      <div class="flex justify-between text-slate-400">
        <span> طاقم الملاحة والضيافة:</span>
        <span class="text-rose-400 numbers-font">-${eco.crewCost.toLocaleString()} ج.م</span>
      </div>
      <div class="flex justify-between text-slate-400">
        <span> رسوم الهبوط الدولي:</span>
        <span class="text-rose-400 numbers-font">-${eco.landingFee.toLocaleString()} ج.م</span>
      </div>
      <div class="pt-1 border-t border-slate-800 flex justify-between items-center text-xs font-black">
        <span class="text-sky-400"> صافي الأرباح المتوقعة:</span>
        <strong class="text-emerald-400 numbers-font text-sm">+${eco.netProfit.toLocaleString()} ج.م</strong>
      </div>
      <div class="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
        <span> مدة الرحلة: <strong class="text-slate-300">${formatDurationHuman(eco.durationSec)}</strong></span>
        <span>تكلفة الإقلاع الفورية: <strong class="text-rose-400 font-bold">${eco.totalOperatingCost.toLocaleString()} ج.م</strong></span>
      </div>
    `;
  }

  /**
   * Subtab 2: Aircraft Hangar & Store
   */
  function renderFleetStoreSubtab(airport, state) {
    const facilities = airport.facilities || {};
    const runwayLvl = Number(facilities.runway || 1);
    const maxTier = FACILITY_META.runway.levels[runwayLvl]?.maxPlaneTier || 1;
    const curCash = Number(state.cash || 0);
    const curBank = Number(state.bank || 0);
    const totalFunds = curCash + curBank;
    const fleet = Array.isArray(airport.fleet) ? airport.fleet : [];

    return `
      <div class="space-y-6">
        <!-- 1. Fleet & Runway Status Bar -->
        <div class="p-4 rounded-2xl bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 border border-sky-500/20 text-xs text-slate-300 flex items-center justify-between flex-wrap gap-2 shadow-lg">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-base font-bold border border-sky-500/30">
              <i class="fa-solid fa-plane"></i>
            </div>
            <div>
              <div class="text-white font-black text-sm">مواصفات الأسطول الجوي والمدرج</div>
              <span class="text-[11px] text-slate-400">المدرج يستوعب طائرات حتى <strong class="text-sky-400">الفئة ${maxTier}</strong> • سعة الحظيرة: <strong class="text-sky-400 numbers-font font-bold">${fleet.length} / 12</strong> طائرة</span>
            </div>
          </div>
          <button onclick="window.AirportUI.setSubtab('facilities')" class="px-3.5 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 rounded-xl font-bold transition cursor-pointer text-xs flex items-center gap-1.5 border border-sky-500/30">
            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
            <span>ترقية المدرج </span>
          </button>
        </div>

        <!-- 2. Hangar Section: Currently Owned Planes (حظيرة الطائرات المملوكة) -->
        <div class="space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <h3 class="text-sm font-black text-white flex items-center gap-2">
              <i class="fa-solid fa-warehouse text-sky-400"></i>
              <span>حظيرة الطائرات المملوكة في مطارك (${fleet.length} طائرة)</span>
            </h3>
            ${fleet.length > 0 ? `
              <button onclick="window.AirportUI.setSubtab('flights')" class="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1.5 transition cursor-pointer bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
                <i class="fa-solid fa-plane-departure text-[10px]"></i>
                <span>لوحة جدولة الرحلات الدولية</span>
                <i class="fa-solid fa-arrow-left text-[10px]"></i>
              </button>
            ` : ''}
          </div>

          ${fleet.length === 0 ? `
            <div class="p-6 rounded-2xl bg-slate-900/60 border border-dashed border-slate-700 text-center space-y-2">
              <div class="text-3xl text-slate-500"><i class="fa-solid fa-plane-slash"></i></div>
              <div class="text-xs text-slate-300 font-bold">حظيرة الطائرات فارغة حالياً</div>
              <p class="text-[11px] text-slate-400 max-w-md mx-auto">اختر إحدى الطائرات المتاحة من متجر الطائرات بالأسفل لشرائها وإضافتها إلى أسطولك الجوي فوراً!</p>
            </div>
          ` : `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              ${fleet.map(plane => {
                const model = AIRCRAFT_META[plane.modelId] || AIRCRAFT_META.cessna_sky;
                const flight = plane.currentFlight || plane.activeFlight || {};
                const isFlight = plane.status === 'in_flight' && Boolean(flight.launchTime || flight.destinationName);
                const refundAmt = Math.floor((model.cost || 3000000) * 0.5);

                return `
                  <div class="p-4 rounded-2xl ${isFlight ? 'bg-sky-950/30 border-sky-500/30' : 'bg-slate-900/90 border-slate-800'} border flex flex-col justify-between space-y-3 shadow-md hover:border-sky-500/40 transition">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-center gap-2.5">
                        <div class="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-lg border border-sky-500/30 shrink-0">
                          <i class="fa-solid ${model.id.includes('cargo') ? 'fa-box-open' : (model.id.includes('gulfstream') ? 'fa-crown text-amber-400' : 'fa-plane')}"></i>
                        </div>
                        <div>
                          <div class="text-xs font-black text-white leading-tight">${plane.customName || model.name}</div>
                          <div class="text-[10px] text-slate-400">${model.name} • فئة ${model.tier}</div>
                        </div>
                      </div>
                      <span class="px-2 py-0.5 rounded-md text-[9px] font-black shrink-0 ${isFlight ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}">
                        ${isFlight ? ' في الجو' : ' جاهزة للإقلاع'}
                      </span>
                    </div>

                    <div class="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                      <button onclick="window.AirportUI.setSubtab('flights')" class="flex-1 py-1.5 px-2.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">
                        <i class="fa-solid fa-plane-departure text-[10px]"></i>
                        <span>لوحة الرحلات</span>
                      </button>
                      ${!isFlight ? `
                        <button onclick="window.AirportUI.sellPlane('${plane.id}')" title="بيع واسترداد 50%" class="py-1.5 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl text-[10px] font-bold transition flex items-center gap-1 border border-rose-500/20 cursor-pointer">
                          <i class="fa-solid fa-trash-can text-[9px]"></i>
                          <span>بيع (+${(refundAmt >= 1000000 ? (refundAmt / 1000000).toFixed(1) + 'M' : refundAmt.toLocaleString())} ج.م)</span>
                        </button>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- 3. Aircraft Purchase Store (متجر شراء الطائرات) -->
        <div class="space-y-3 pt-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-black text-white flex items-center gap-2">
              <i class="fa-solid fa-cart-shopping text-emerald-400"></i>
              <span>متجر شراء الطائرات الدولية المتاحة </span>
            </h3>
            <span class="text-xs text-slate-400">اختر طراز الطائرة لشرائها وضمها لأسطولك</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            ${Object.keys(AIRCRAFT_META).map(k => {
              const m = AIRCRAFT_META[k];
              const isUnlockedTier = maxTier >= m.tier;
              const canAfford = totalFunds >= m.cost;
              const isFullFleet = fleet.length >= 12;

              return `
                <div class="glass-panel p-5 rounded-3xl border ${isUnlockedTier ? 'border-slate-800 bg-slate-900/80' : 'border-slate-800/40 opacity-70 bg-slate-950/90'} space-y-4 flex flex-col justify-between shadow-xl">
                  <div class="space-y-3">
                    <div class="flex items-start justify-between">
                      <div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${isUnlockedTier ? 'from-sky-500/20 to-indigo-500/20 text-sky-400' : 'from-slate-800 to-slate-900 text-slate-500'} flex items-center justify-center text-2xl border border-slate-700">
                        <i class="fa-solid ${m.id.includes('cargo') ? 'fa-box-open' : (m.id.includes('gulfstream') ? 'fa-crown text-amber-400' : 'fa-plane')}"></i>
                      </div>
                      <span class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-black border border-slate-700">فئة ${m.tier}</span>
                    </div>

                    <div>
                      <h4 class="text-sm font-black text-white">${m.name}</h4>
                      <p class="text-[11px] text-slate-400 leading-snug pt-1">${m.desc}</p>
                    </div>

                    <div class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1 text-[11px]">
                      <div class="flex justify-between text-slate-400">
                        <span>السعة:</span>
                        <strong class="text-white">${m.capacity}</strong>
                      </div>
                      <div class="flex justify-between text-slate-400">
                        <span>صافي الربح الأساسي:</span>
                        <strong class="text-emerald-400 numbers-font font-bold">+${m.baseNetProfit.toLocaleString()} ج.م</strong>
                      </div>
                      <div class="flex justify-between text-slate-400">
                        <span>زمن الرحلة الأساسي:</span>
                        <strong class="text-sky-400 numbers-font font-bold">${formatDurationHuman(m.flightTimeSec)}</strong>
                      </div>
                    </div>
                  </div>

                  <div class="pt-3 space-y-2">
                    <div class="flex justify-between items-center">
                      <span class="text-[11px] text-slate-400 font-bold">سعر الشراء:</span>
                      <span class="text-sm font-black text-amber-400 numbers-font">${m.cost.toLocaleString()} ج.م</span>
                    </div>

                    ${!isUnlockedTier ? `
                      <button disabled class="w-full py-2.5 bg-slate-800 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed">
                        <i class="fa-solid fa-lock text-[10px]"></i> يتطلب مدرج فئة ${m.tier}
                      </button>
                    ` : (isFullFleet ? `
                      <button disabled class="w-full py-2.5 bg-slate-800 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed">
                        الأسطول ممتلئ (12/12)
                      </button>
                    ` : `
                      <button onclick="window.AirportUI.buyPlane('${m.id}')" ${!canAfford ? 'disabled' : ''}
                        class="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-cart-shopping"></i>
                        <span>شراء وإضافة للأسطول </span>
                      </button>
                    `)}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Subtab 3: Airport Infrastructure & Facilities
   */
  function renderFacilitiesSubtab(airport, state) {
    const facilities = airport.facilities || {};
    const curCash = Number(state.cash || 0);
    const curBank = Number(state.bank || 0);
    const totalFunds = curCash + curBank;

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        ${Object.keys(FACILITY_META).map(k => {
          const fac = FACILITY_META[k];
          const curLvl = Number(facilities[k] || (k === 'duty_free' ? 0 : 1));
          const nextLvl = curLvl + 1;
          const isMax = !fac.levels[nextLvl];
          const nextInfo = fac.levels[nextLvl] || {};
          const canAfford = !isMax && (totalFunds >= (nextInfo.cost || 0));

          return `
            <div class="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4 shadow-xl">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                    <i class="fa-solid ${fac.icon}"></i>
                  </div>
                  <div>
                    <h4 class="text-sm font-black text-white">${fac.name}</h4>
                    <div class="text-[11px] text-slate-400">
                      المستوى الحالي: <strong class="text-amber-400 font-black">Lv.${curLvl} / 4</strong>
                    </div>
                  </div>
                </div>
                <div>
                  <span class="px-2.5 py-1 rounded-xl ${isMax ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400'} text-[10px] font-black">
                    ${isMax ? ' أقصى تطوير' : `الترقية: Lv.${nextLvl}`}
                  </span>
                </div>
              </div>

              <!-- Level Progress Bar -->
              <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-amber-500 to-yellow-400" style="width: ${(curLvl / 4) * 100}%;"></div>
              </div>

              <!-- Next Upgrade Details -->
              <div class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                ${isMax ? `
                  <div class="text-xs text-amber-400 font-bold flex items-center gap-1.5">
                    <i class="fa-solid fa-crown"></i>
                    <span>تم فتح أقصى طاقة استيعابية لهذه المنشأة!</span>
                  </div>
                ` : `
                  <div class="flex justify-between items-center text-xs">
                    <span class="text-slate-400 font-bold">المستوى التالي:</span>
                    <strong class="text-white">${nextInfo.name}</strong>
                  </div>
                  <div class="text-[11px] text-slate-400">${nextInfo.desc}</div>
                  <div class="flex justify-between items-center pt-1 border-t border-slate-800/80">
                    <span class="text-[11px] text-slate-400 font-bold">تكلفة الترقية:</span>
                    <span class="text-xs font-black text-emerald-400 numbers-font">${(nextInfo.cost || 0).toLocaleString()} ج.م</span>
                  </div>
                `}
              </div>

              <!-- Upgrade Action Button -->
              ${!isMax ? `
                <button onclick="window.AirportUI.upgradeFacility('${k}')" ${!canAfford ? 'disabled' : ''}
                  class="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-lg transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2">
                  <i class="fa-solid fa-arrow-up-from-bracket"></i>
                  <span>ترقية ${fac.name} إلى Lv.${nextLvl} </span>
                </button>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  const TOWER_TRANSIT_RATES = {
    1: { perHour: 3000, perMin: 50, label: '3,000 ج.م/ساعة (أقصى تراكم 24 ألف ج.م)' },
    2: { perHour: 7500, perMin: 125, label: '7,500 ج.م/ساعة (أقصى تراكم 60 ألف ج.م)' },
    3: { perHour: 15000, perMin: 250, label: '15,000 ج.م/ساعة (أقصى تراكم 120 ألف ج.م)' },
    4: { perHour: 25000, perMin: 416.67, label: '25,000 ج.م/ساعة (أقصى تراكم 200 ألف ج.م)' }
  };

  function calculateTransitClient(airport) {
    if (!airport || !airport.unlocked) return 0;
    const runwayLvl = Math.max(1, Math.min(4, Number(airport.facilities?.runway || 1)));
    const rate = TOWER_TRANSIT_RATES[runwayLvl]?.perMin || 50;
    const lastTime = Number(airport.lastTransitCollectionAt || airport.lastTransitPermitAt || airport.unlockedAt || getTrustedNow());
    const elapsedMinutes = Math.max(0, (getTrustedNow() - lastTime) / (60 * 1000));
    return Math.floor(Math.min(8 * 60, elapsedMinutes) * rate);
  }

  /**
   * Subtab 4: Control Tower & Transit Permits (Hourly Accumulation, 8h Max)
   */
  function renderTransitSubtab(airport, state) {
    const stats = airport.stats || {};
    const runwayLvl = Math.max(1, Math.min(4, Number(airport.facilities?.runway || 1)));
    const rateCfg = TOWER_TRANSIT_RATES[runwayLvl] || TOWER_TRANSIT_RATES[1];

    const accumulatedFee = calculateTransitClient(airport);
    const lastCollect = Number(airport.lastTransitCollectionAt || airport.lastTransitPermitAt || airport.unlockedAt || getTrustedNow());
    const elapsedMin = Math.max(0, (getTrustedNow() - lastCollect) / (60 * 1000));
    const cappedMin = Math.min(8 * 60, elapsedMin);
    const percentFilled = Math.min(100, Math.round((cappedMin / (8 * 60)) * 100));
    const hoursAccumulated = (cappedMin / 60).toFixed(1);

    const elapsedMs = getTrustedNow() - Number(airport.lastTransitCollectionAt || 0);
    const onCooldown = Number(airport.lastTransitCollectionAt || 0) > 0 && elapsedMs < 60000;
    const remSec = onCooldown ? Math.ceil((60000 - elapsedMs) / 1000) : 0;
    const canCollect = accumulatedFee >= 500 && !onCooldown;

    return `
      <div class="glass-panel p-6 sm:p-8 rounded-3xl border border-sky-500/30 text-center space-y-6 relative overflow-hidden"
        style="background: radial-gradient(ellipse at center, rgba(14, 165, 233, 0.12), rgba(15, 23, 42, 0.98)) !important;">
        
        <div class="w-20 h-20 mx-auto rounded-full bg-slate-900 border-2 border-sky-500/40 flex items-center justify-center text-3xl text-sky-400 relative shadow-2xl shadow-sky-500/20">
          <i class="fa-solid fa-tower-broadcast animate-pulse"></i>
          <span class="absolute inset-0 rounded-full border border-sky-400 animate-ping opacity-25"></span>
        </div>

        <div class="space-y-2 max-w-md mx-auto">
          <h3 class="text-xl font-black text-white">برج المراقبة ورادار الطائرات العابرة </h3>
          <p class="text-xs text-slate-300">
            تستقبل أجواء مطارك رحلات طيران دولية عابرة تطلب الهبوط والتزود بالوقود. تتراكم رسوم الترانزيت بالساعة تلقائياً بحد أقصى 8 ساعات!
          </p>
        </div>

        <!-- Accumulated Display Card -->
        <div class="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 max-w-md mx-auto space-y-4 text-right">
          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-400">معدل العائد (مدرج لفل ${runwayLvl}):</span>
            <strong class="text-sky-400 numbers-font font-bold">${rateCfg.perHour.toLocaleString()} ج.م / ساعة</strong>
          </div>

          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-400">فترة التراكم الحالية:</span>
            <span id="airport-transit-accumulated-time" class="text-slate-300 font-bold numbers-font">${hoursAccumulated} / 8 ساعات (${percentFilled}%)</span>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div id="airport-transit-progress-bar" class="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 transition-all duration-500" style="width: ${percentFilled}%;"></div>
          </div>

          <div class="pt-2 border-t border-slate-800/80 flex justify-between items-center">
            <span class="text-xs font-bold text-slate-300">الرصيد المتراكم للتحصيل:</span>
            <span id="airport-transit-accumulated-amount" class="text-2xl font-black text-emerald-400 numbers-font drop-shadow-sm">+${accumulatedFee.toLocaleString()} ج.م</span>
          </div>

          <div class="flex justify-between items-center text-[11px] text-slate-500 pt-1">
            <span>إجمالي تحصيلات الترانزيت:</span>
            <span class="text-amber-400 font-bold numbers-font">${(stats.transitPermitsAccepted || 0).toLocaleString()} عملية</span>
          </div>
        </div>

        <button id="btn-airport-transit" onclick="window.AirportUI.acceptTransit()" ${canCollect ? '' : 'disabled'}
          class="px-8 py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-sky-500/25 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mx-auto disabled:opacity-40 disabled:pointer-events-none">
          <i class="fa-solid fa-passport"></i>
          <span>${onCooldown ? `يرجى الانتظار (${remSec}ث)` : (accumulatedFee < 500 ? 'جاري تتبع الرحلات (الحد الأدنى 500 ج.م)' : `تحصيل رسوم الترانزيت المتراكمة (+${accumulatedFee.toLocaleString()} ج.م) `)}</span>
        </button>

        <p class="text-[10px] text-slate-400 max-w-sm mx-auto">
           تتراكم الأرباح تلقائياً في السيرفر وتتوقف عند بلوغ 8 ساعات حتى تقوم بالتحصيل. ترقية مدرج المطار ترفع العائد بالساعة.
        </p>
      </div>
    `;
  }

  /**
   * Subtab 5: Airport Operations Management & Aviation Executives
   */
  function renderManagersSubtab(airport, state) {
    const curManager = airport.manager || {};
    const curTier = Number(curManager.tier || 0);
    const isAutopilot = curTier >= 3 && curManager.autoPilot !== false;

    return `
      <div class="space-y-6">
        <!-- Subtab Hero Banner -->
        <div class="glass-panel p-6 sm:p-7 rounded-3xl border border-sky-500/30 text-right relative overflow-hidden shadow-2xl"
          style="background: radial-gradient(ellipse at top right, rgba(56, 189, 248, 0.15), rgba(15, 23, 42, 0.98)) !important;">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div class="space-y-2 max-w-xl">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span class="text-xs font-black text-amber-400">إدارة العمليات الجوية والملاحة الدولية</span>
              </div>
              <h3 class="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
                <i class="fa-solid fa-user-tie text-sky-400"></i>
                <span>فريق مدراء المطار التنفيذي </span>
              </h3>
              <p class="text-xs text-slate-300 leading-relaxed">
                عين نخبة مدراء الطيران لزيادة أرباح الرحلات بنسبة تصل إلى <strong class="text-emerald-400">+15%</strong> وخفض تكاليف التشغيل بنسبة <strong class="text-sky-400">-10%</strong>، بالإضافة لتشغيل المطار تلقائياً بالكامل عبر <strong class="text-purple-400 font-bold">الطيار الآلي الذكي (Smart Auto-Pilot)</strong> حتى 72 ساعة أوفلاين.
              </p>
            </div>

            <!-- Current Status Widget -->
            <div class="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-right min-w-[220px] shrink-0 shadow-lg">
              <div class="text-[10px] text-slate-400 font-bold">المدير الحالي للمطار:</div>
              <div class="text-sm font-black text-white flex items-center gap-1.5 mt-0.5">
                ${curTier > 0 
                  ? `<span class="text-amber-400">${curManager.name || 'مدير معين'}</span>` 
                  : '<span class="text-slate-500">لا يوجد مدير معين حالياً</span>'}
              </div>
              <div class="text-[11px] text-emerald-400 font-bold mt-1">
                ${curTier > 0 
                  ? `بونص أرباح: +${curManager.profitBonusPct || (curTier === 1 ? 5 : curTier === 2 ? 10 : 15)}% • تكاليف: -${curManager.costDiscountPct || (curTier === 2 ? 5 : curTier >= 3 ? 10 : 0)}%` 
                  : 'يمكنك توظيف كابتن ليام بالكاش الآن'}
              </div>
            </div>
          </div>
        </div>

        <!-- Manager Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${[1, 2, 3].map(t => {
            const meta = AIRPORT_MANAGERS_META[t];
            const isCurrent = curTier === t;
            const isHigherActive = curTier > t;

            return `
              <div class="glass-panel rounded-3xl border ${isCurrent ? 'border-amber-500/80 shadow-2xl shadow-amber-500/20 bg-slate-900/95' : 'border-slate-800 bg-slate-950/80'} p-5 flex flex-col justify-between space-y-4 relative overflow-hidden transition-all duration-300 hover:border-slate-700">
                ${isCurrent ? `
                  <div class="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-[10px] shadow-lg flex items-center gap-1">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>معين حالياً</span>
                  </div>
                ` : ''}

                <!-- Avatar & Header -->
                <div class="space-y-3.5">
                  <div class="w-full h-48 rounded-2xl overflow-hidden relative border border-slate-700/60 bg-slate-900">
                    <img src="${meta.avatar}" alt="${meta.name}" class="w-full h-full object-cover object-top transition duration-500 hover:scale-105"
                      onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' viewBox=\\'0 0 100 100\\'><rect fill=\\'%231e293b\\' width=\\'100\\' height=\\'100\\'/><text fill=\\'%2394a3b8\\' font-size=\\'30\\' font-family=\\'sans-serif\\' x=\\'50%\\' y=\\'50%\\' dominant-baseline=\\'central\\' text-anchor=\\'middle\\'></text></svg>';">
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                    <div class="absolute bottom-2.5 right-3 left-3 flex justify-between items-end">
                      <span class="px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200 text-[10px] font-black">
                        ${meta.badge}
                      </span>
                      <span class="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-black">
                        Tier ${meta.tier}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 class="text-sm font-black text-white text-right">${meta.name}</h4>
                    <p class="text-[11px] text-slate-400 text-right mt-0.5">${meta.title}</p>
                  </div>

                  <!-- Features List -->
                  <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-right text-xs">
                    <div class="flex items-center justify-between">
                      <span class="text-slate-400">بونص أرباح الرحلات:</span>
                      <strong class="text-emerald-400 font-bold numbers-font">+${meta.profitBonusPct}%</strong>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-slate-400">تخفيض تكاليف التشغيل:</span>
                      <strong class="text-sky-400 font-bold numbers-font">${meta.costDiscountPct > 0 ? `-${meta.costDiscountPct}%` : 'قياسي'}</strong>
                    </div>
                    ${meta.xpBonusPct > 0 ? `
                      <div class="flex items-center justify-between">
                        <span class="text-slate-400">بونص خبرة الملاحة (XP):</span>
                        <strong class="text-amber-400 font-bold numbers-font">+${meta.xpBonusPct}%</strong>
                      </div>
                    ` : ''}
                    ${meta.autoPilot ? `
                      <div class="flex items-center justify-between pt-1 border-t border-slate-800">
                        <span class="text-purple-400 font-bold">الطيار الآلي الذكي:</span>
                        <strong class="text-purple-300 font-black flex items-center gap-1">
                          <i class="fa-solid fa-bolt"></i> 72 ساعة أوفلاين
                        </strong>
                      </div>
                    ` : ''}
                  </div>

                  <p class="text-[11px] text-slate-300 leading-relaxed text-right">
                    ${meta.desc}
                  </p>
                </div>

                <!-- Action Section -->
                <div class="pt-2 border-t border-slate-800/80">
                  ${t === 1 ? `
                    ${curTier >= 1 ? `
                      <div class="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-check text-emerald-400"></i>
                        <span>${isCurrent ? 'معين كمساعد لمدير العمليات' : 'تمت الترقية لمستوى أعلى'}</span>
                      </div>
                    ` : `
                      <button onclick="window.AirportUI.hireManager(1)" id="btn-hire-airport-manager-1"
                        class="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs rounded-xl shadow-lg shadow-sky-500/20 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2">
                        <i class="fa-solid fa-user-plus"></i>
                        <span>توظيف بالكاش (${meta.hireCost.toLocaleString()} ج.م)</span>
                      </button>
                    `}
                  ` : t === 2 ? `
                    ${curTier === 2 ? `
                      <div class="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-center text-xs font-black text-amber-300 flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-award text-amber-400"></i>
                        <span>مدير العمليات الدولية معين</span>
                      </div>
                    ` : curTier > 2 ? `
                      <div class="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-check text-emerald-400"></i>
                        <span>تمت الترقية لمستوى أعلى</span>
                      </div>
                    ` : `
                      <button onclick="if(window.UI && typeof window.UI.openTopupModal === 'function') { window.UI.openTopupModal('pkg_airport_manager_tier2'); } else if(window.UI) { window.UI.switchTab('store'); }"
                        class="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2">
                        <i class="fa-solid fa-crown"></i>
                        <span>ترقية كابتن ألفا (باقة VIP - 750 جنيه)</span>
                      </button>
                    `}
                  ` : `
                    ${curTier === 3 ? `
                      <div class="space-y-2">
                        <div class="w-full py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-center text-xs font-black text-purple-300 flex items-center justify-center gap-1.5">
                          <i class="fa-solid fa-crown text-amber-400"></i>
                          <span>الرئيس التنفيذي للمطار معين</span>
                        </div>
                        <button onclick="window.AirportUI.toggleAutopilot()" id="btn-toggle-airport-autopilot"
                          class="w-full py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer ${isAutopilot ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'}">
                          <i class="fa-solid ${isAutopilot ? 'fa-toggle-on text-base' : 'fa-toggle-off text-base text-slate-500'}"></i>
                          <span>${isAutopilot ? 'الطيار الآلي الذكي: مفعل' : 'الطيار الآلي الذكي: معطل ⏸'}</span>
                        </button>
                      </div>
                    ` : `
                      <button onclick="if(window.UI && typeof window.UI.openTopupModal === 'function') { window.UI.openTopupModal('pkg_airport_manager_tier3'); } else if(window.UI) { window.UI.switchTab('store'); }"
                        class="w-full py-3 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-500/20 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2">
                        <i class="fa-solid fa-gem"></i>
                        <span>تعيين إمبراطور الطيران (باقة VIP - 1500 جنيه)</span>
                      </button>
                    `}
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function calculateDutyFreeClient(airport) {
    if (!airport || !airport.unlocked || !airport.facilities?.duty_free) return 0;
    const lvl = airport.facilities.duty_free;
    const rates = { 1: 100, 2: 300, 3: 750, 4: 1500 };
    const rate = rates[lvl] || 0;
    if (rate <= 0) return 0;
    const lastTime = Number(airport.lastDutyFreeCollectionAt || airport.unlockedAt || getTrustedNow());
    const elapsedMinutes = Math.max(0, (getTrustedNow() - lastTime) / (60 * 1000));
    return Math.floor(Math.min(8 * 60, elapsedMinutes) * rate);
  }

  function formatSeconds(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  let _lastAutopilotCheck = 0;
  function runAutopilotCycle(ap, liveState, now) {
    if (!ap || !ap.manager || Number(ap.manager.tier) < 3 || ap.manager.autoPilot === false) return;
    if (now - _lastAutopilotCheck < 3000) return; // check every 3s
    _lastAutopilotCheck = now;

    if (!Array.isArray(ap.fleet) || ap.fleet.length === 0) return;

    // 1. Auto-Claim landed flights
    ap.fleet.forEach(plane => {
      if (plane.status === 'in_flight' && !_claimingPlanes.has(plane.id)) {
        const f = plane.currentFlight || plane.activeFlight;
        if (f && Number(f.landingTime || 0) <= now) {
          claimFlight(plane.id);
        }
      }
    });

    // 2. Auto-Launch idle planes (up to max 5 in flight)
    const inFlightCount = ap.fleet.filter(p => p.status === 'in_flight').length;
    if (inFlightCount >= 5) return;

    const idlePlanes = ap.fleet.filter(p => p.status === 'idle' || !p.status);
    for (const plane of idlePlanes) {
      const curInFlight = ap.fleet.filter(p => p.status === 'in_flight').length;
      if (curInFlight >= 5) break;

      const model = AIRCRAFT_META[plane.modelId] || AIRCRAFT_META.cessna_sky;
      const validDests = DESTINATIONS_META.filter(d => model.tier >= d.tier);
      if (validDests.length > 0) {
        const bestDest = validDests.reduce((prev, curr) => (curr.mult > prev.mult ? curr : prev), validDests[0]);
        launchFlight(plane.id, bestDest.id);
      }
    }
  }

  function updateFlightTimers() {
    const timerEls = document.querySelectorAll('[id^="timer-"]');
    const now = getTrustedNow();
    const liveState = getLiveGameState();
    const ap = liveState.airport;

    // Trigger Smart Auto-Pilot for Tier 3 Managers
    if (ap) {
      runAutopilotCycle(ap, liveState, now);
    }

    timerEls.forEach(el => {
      const landingTime = Number(el.getAttribute('data-landing') || 0);
      const planeId = el.id.replace('timer-', '');
      const remSec = Math.max(0, Math.ceil((landingTime - now) / 1000));
      const bar = document.getElementById(`bar-${planeId}`);

      if (remSec <= 0) {
        el.textContent = ' وصلت الوجهة!';
        el.classList.add('text-emerald-400');
        el.classList.remove('text-sky-400');
        if (bar) bar.style.width = '100%';
        const btnClaim = document.getElementById(`btn-claim-${planeId}`);
        if (btnClaim && !_claimingPlanes.has(planeId)) btnClaim.style.display = 'flex';
        const btnSpeedup = document.getElementById(`btn-speedup-${planeId}`);
        if (btnSpeedup) btnSpeedup.style.display = 'none';
      } else {
        el.textContent = `متبقي: ${formatSeconds(remSec)}`;
        const dynamicCost = Math.max(1, Math.ceil(remSec / 600));
        const speedupCostEl = document.getElementById(`speedup-cost-${planeId}`);
        if (speedupCostEl) speedupCostEl.textContent = `تسريع فوري (${dynamicCost} ذهب)`;

        if (bar && ap && Array.isArray(ap.fleet)) {
          const pl = ap.fleet.find(p => p.id === planeId);
          const f = pl && (pl.currentFlight || pl.activeFlight);
          if (f && f.launchTime && f.durationSec) {
            const pct = Math.min(99, Math.max(5, Math.round(((now - f.launchTime) / (f.durationSec * 1000)) * 100)));
            bar.style.width = `${pct}%`;
          }
        }
      }
    });

    // Update duty free display live
    const dutyFreeEl = document.getElementById('airport-duty-free-amount');
    const btnClaimDutyFree = document.getElementById('btn-claim-duty-free');
    if (dutyFreeEl && ap) {
      const amt = calculateDutyFreeClient(ap);
      dutyFreeEl.textContent = `+${amt.toLocaleString()} ج.م`;
      const lastClaim = Number(ap.lastDutyFreeCollectionAt || 0);
      const elapsedMs = getTrustedNow() - lastClaim;
      const onCooldown = lastClaim > 0 && elapsedMs < 60000;

      if (btnClaimDutyFree) {
        if (amt < 1000 || onCooldown) {
          btnClaimDutyFree.disabled = true;
          if (onCooldown) {
            const remSec = Math.ceil((60000 - elapsedMs) / 1000);
            btnClaimDutyFree.innerHTML = `<i class="fa-solid fa-hourglass-half text-[10px]"></i> <span>انتظر (${remSec}ث)</span>`;
          } else {
            btnClaimDutyFree.innerHTML = '<i class="fa-solid fa-hand-holding-dollar"></i> <span>تحصيل (1,000+)</span>';
          }
        } else {
          btnClaimDutyFree.disabled = false;
          btnClaimDutyFree.innerHTML = '<i class="fa-solid fa-hand-holding-dollar"></i> <span>تحصيل</span>';
        }
      }
    }

    // Update transit accumulation live
    const transitEl = document.getElementById('airport-transit-accumulated-amount');
    const transitTimeEl = document.getElementById('airport-transit-accumulated-time');
    const transitBarEl = document.getElementById('airport-transit-progress-bar');
    const btnTransit = document.getElementById('btn-airport-transit');
    if (ap) {
      const amt = calculateTransitClient(ap);
      if (transitEl) transitEl.textContent = `+${amt.toLocaleString()} ج.م`;

      const lastCollect = Number(ap.lastTransitCollectionAt || ap.lastTransitPermitAt || ap.unlockedAt || getTrustedNow());
      const elapsedMin = Math.max(0, (getTrustedNow() - lastCollect) / (60 * 1000));
      const cappedMin = Math.min(8 * 60, elapsedMin);
      const pct = Math.min(100, Math.round((cappedMin / (8 * 60)) * 100));

      if (transitTimeEl) transitTimeEl.textContent = `${(cappedMin / 60).toFixed(1)} / 8 ساعات (${pct}%)`;
      if (transitBarEl) transitBarEl.style.width = `${pct}%`;

      if (btnTransit) {
        const lastClaim = Number(ap.lastTransitCollectionAt || 0);
        const elapsedMs = getTrustedNow() - lastClaim;
        const onCooldown = lastClaim > 0 && elapsedMs < 60000;
        if (amt < 500 || onCooldown) {
          btnTransit.disabled = true;
          if (onCooldown) {
            const remSec = Math.ceil((60000 - elapsedMs) / 1000);
            btnTransit.innerHTML = `<i class="fa-solid fa-hourglass-half text-xs"></i> <span>يرجى الانتظار (${remSec}ث)</span>`;
          } else {
            btnTransit.innerHTML = `<i class="fa-solid fa-tower-broadcast animate-pulse"></i> <span>جاري تتبع الرحلات (الحد الأدنى 500 ج.م)</span>`;
          }
        } else {
          btnTransit.disabled = false;
          btnTransit.innerHTML = `<i class="fa-solid fa-passport"></i> <span>تحصيل رسوم الترانزيت المتراكمة (+${amt.toLocaleString()} ج.م) </span>`;
        }
      }
    }
  }

  function getLiveGameState() {
    if (typeof window.GameEngine !== 'undefined' && typeof window.GameEngine.getState === 'function') {
      return window.GameEngine.getState();
    }
    return (window.GameEngine && window.GameEngine.state) || {};
  }

  function persistGameState() {
    try {
      if (window.GameEngine && typeof window.GameEngine.forceSaveState === 'function') {
        window.GameEngine.forceSaveState(true);
      } else if (window.GameEngine && typeof window.GameEngine.saveState === 'function') {
        window.GameEngine.saveState();
      }
      if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.savePlayerState === 'function' && window.GameEngine && window.GameEngine.activeUsername) {
        window.AppDB.savePlayerState(window.GameEngine.activeUsername, window.GameEngine.state, true).catch(() => {});
      }
    } catch (_) {}
    if (typeof window.renderHeader === 'function') {
      window.renderHeader();
    }
    if (typeof window.renderAll === 'function') {
      window.renderAll();
    }
  }

  function showAirportToast(msg, type = 'info') {
    try {
      if (typeof window.showToast === 'function') {
        window.showToast(msg, '', type);
        return;
      }
      if (window.UI && typeof window.UI.showToast === 'function') {
        window.UI.showToast(msg, type);
        return;
      }
    } catch (_) {}

    let container = document.getElementById('airport-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'airport-toast-container';
      container.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    const isError = type === 'error';
    toast.className = `p-4 rounded-2xl border shadow-2xl text-white text-xs font-bold text-center pointer-events-auto transition-all transform duration-300 translate-y-2 opacity-0 flex items-center justify-center gap-2 ${
      isSuccess ? 'bg-emerald-950/95 border-emerald-500/60 shadow-emerald-900/50' :
      isError ? 'bg-rose-950/95 border-rose-500/60 shadow-rose-900/50' :
      'bg-slate-900/95 border-sky-500/60 shadow-sky-900/50'
    }`;
    toast.innerHTML = `
      <i class="fa-solid ${isSuccess ? 'fa-circle-check text-emerald-400' : isError ? 'fa-triangle-exclamation text-rose-400' : 'fa-circle-info text-sky-400'} text-base"></i>
      <span>${msg}</span>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });
    setTimeout(() => {
      toast.classList.add('opacity-0', '-translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function bindAirportEvents(airport, state) {
    // Subtab navigation
    const subtabButtons = document.querySelectorAll('.airport-nav-subtab');
    subtabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        _activeSubtab = btn.getAttribute('data-subtab');
        renderAirportPanel();
      });
    });

    // Rename Button
    const btnRename = document.getElementById('btn-airport-rename');
    if (btnRename) {
      btnRename.addEventListener('click', async () => {
        const liveState = getLiveGameState();
        const curAirport = liveState.airport || {};
        const curName = curAirport.name || 'مطار رأس المال الدولي';
        const newName = prompt('اكتب الاسم الجديد لمطارك:', curName);
        if (newName && newName.trim() && newName.trim() !== curName) {
          curAirport.name = newName.trim();
          persistGameState();
          showAirportToast('تم تعديل اسم المطار بنجاح!', 'success');
          renderAirportPanel();
          if (window.ServerBridge && typeof window.ServerBridge.renameAirport === 'function') {
            try { await window.ServerBridge.renameAirport(newName.trim()); } catch (_) {}
          }
        }
      });
    }

    // Duty Free Claim Button
    const btnDutyFree = document.getElementById('btn-claim-duty-free');
    if (btnDutyFree) {
      btnDutyFree.addEventListener('click', async () => {
        const liveState = getLiveGameState();
        const ap = liveState.airport;
        if (!ap) return;

        const amt = calculateDutyFreeClient(ap);
        const lastClaim = Number(ap.lastDutyFreeCollectionAt || 0);
        const elapsedMs = getTrustedNow() - lastClaim;

        if (lastClaim > 0 && elapsedMs < 60000) {
          const remSec = Math.ceil((60000 - elapsedMs) / 1000);
          showAirportToast(` يرجى الانتظار ${remSec} ثانية قبل تحصيل أرباح السوق الحرة التالية.`, 'warning');
          return;
        }

        if (amt < 1000) {
          showAirportToast(` الحد الأدنى لتحصيل أرباح السوق الحرة هو 1,000 ج.م (المتراكم حالياً: ${amt.toLocaleString()} ج.م).`, 'error');
          return;
        }

        btnDutyFree.disabled = true;
        btnDutyFree.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-[10px]"></i> <span>جاري التحصيل...</span>';

        // Authoritative Server Claim
        if (window.ServerBridge && typeof window.ServerBridge.claimDutyFree === 'function') {
          try {
            const res = await window.ServerBridge.claimDutyFree();
            if (res && res.success) {
              if (res.airport) liveState.airport = res.airport;
              if (res.cash !== undefined) liveState.cash = res.cash;
              if (res.netWorth !== undefined) liveState.netWorth = res.netWorth;

              if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
                window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
              }
              persistGameState();
              if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
                window.GameEngine.recordPlayerActivity('تحصيل أرباح السوق الحرة بالمطار ', `تحصيل إيرادات السوق الحرة بالمطار بقيمة (+${(res.earnings || amt).toLocaleString()} ج.م)`, 'business');
              }
              showAirportToast(res.message || ` تم تحصيل +${(res.earnings || amt).toLocaleString()} ج.م من أرباح السوق الحرة!`, 'success');
              renderAirportPanel();
              return;
            } else {
              showAirportToast(res?.error || 'تعذر تحصيل أرباح السوق الحرة', 'error');
              renderAirportPanel();
              return;
            }
          } catch (err) {
            // CRITICAL: Block offline fallback on server business rejection!
            const errMsg = err?.message || '';
            if (err.status === 400 || err.status === 403 || errMsg.includes('الحد الأدنى') || errMsg.includes('الانتظار') || errMsg.includes('تتراكم') || errMsg.includes('تفعيل') || errMsg.includes('متراكمة')) {
              showAirportToast(errMsg || 'تعذر تحصيل أرباح السوق الحرة', 'error');
              renderAirportPanel();
              return;
            }
            console.warn('[AirportUI] claimDutyFree network failed, evaluating offline fallback:', err);
          }
        }

        // Offline fallback (STRICT: only if server completely unreachable AND amt >= 1000 AND elapsed >= 60s)
        if (amt >= 1000 && (!lastClaim || elapsedMs >= 60000)) {
          liveState.cash = (Number(liveState.cash) || 0) + amt;
          ap.lastDutyFreeCollectionAt = Date.now();
          if (!ap.stats) ap.stats = {};
          ap.stats.totalDutyFreeCollected = (Number(ap.stats.totalDutyFreeCollected) || 0) + amt;

          if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
            window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
          }

          persistGameState();
          if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
            window.GameEngine.recordPlayerActivity('تحصيل أرباح السوق الحرة بالمطار ', `تحصيل إيرادات السوق الحرة بالمطار بقيمة (+${amt.toLocaleString()} ج.م)`, 'business');
          }
          showAirportToast(` تم تحصيل +${amt.toLocaleString()} ج.م من أرباح السوق الحرة!`, 'success');
        }
        renderAirportPanel();
      });
    }
  }

  // Action methods with authoritative server-first pattern and resilient client fallback
  async function launchFlight(planeId, targetDestId = null) {
    const liveState = getLiveGameState();
    const ap = liveState.airport;
    if (!ap || !Array.isArray(ap.fleet)) return;

    const inFlightCount = ap.fleet.filter(p => p.status === 'in_flight').length;
    if (inFlightCount >= 5) {
      if (!targetDestId) {
        showAirportToast(' الحد الأقصى للطيران المتزامن هو 5 طائرات في الجو في نفس الوقت! انتظر هبوط إحدى الطائرات.', 'error');
      }
      return;
    }

    const plane = ap.fleet.find(p => p.id === planeId);
    if (!plane || plane.status === 'in_flight') return;

    const select = document.getElementById(`select-dest-${planeId}`);
    const destId = targetDestId || (select ? select.value : 'cairo_riyadh');
    const dest = DESTINATIONS_META.find(d => d.id === destId) || DESTINATIONS_META[0];
    const model = AIRCRAFT_META[plane.modelId];
    if (!model) return;

    if (dest.requiredTier > model.tier) {
      showAirportToast(` هذه الوجهة تتطلب طائرة من الفئة ${dest.requiredTier} أو أعلى للوصول إليها!`, 'error');
      return;
    }

    const eco = getEconomicsForDisplay(model, dest, ap);
    const curCash = Number(liveState.cash || 0);
    const curBank = Number(liveState.bank || 0);

    if ((curCash + curBank) < eco.totalOperatingCost) {
      showAirportToast(` رصيدك غير كافٍ لتغطية تكاليف تجهيز الرحلة (${eco.totalOperatingCost.toLocaleString()} ج.م)`, 'error');
      return;
    }

    // 1. Authoritative Server Dispatch
    if (window.ServerBridge && typeof window.ServerBridge.launchAirportFlight === 'function') {
      try {
        const res = await window.ServerBridge.launchAirportFlight(planeId, destId);
        if (res && res.success) {
          if (res.airport) liveState.airport = res.airport;
          if (res.cash !== undefined) liveState.cash = res.cash;
          if (res.bank !== undefined) liveState.bank = res.bank;
          if (res.netWorth !== undefined) liveState.netWorth = res.netWorth;

          const updatedPlane = liveState.airport?.fleet?.find(p => p.id === planeId);
          if (updatedPlane && res.plane) {
            updatedPlane.status = res.plane.status;
            updatedPlane.activeFlight = res.plane.activeFlight;
            updatedPlane.currentFlight = res.plane.activeFlight;
          }

          if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
            window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
          }
          persistGameState();
          if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
            window.GameEngine.recordPlayerActivity('إقلاع رحلة طيران ', `تسيير رحلة طائرة (${plane.customName || model.name}) إلى وجهة ${dest.name} بتكاليف تجهيز ${eco.totalOperatingCost.toLocaleString()} ج.م`, 'business');
          }
          const minStr = Math.floor(eco.durationSec / 60);
          showAirportToast(res.message || ` أقلعت الرحلة إلى ${dest.name}! وقت الهبوط خلال ${minStr > 0 ? minStr + ' دقيقة' : eco.durationSec + ' ثانية'}.`, 'success');
          renderAirportPanel();
          return;
        } else {
          showAirportToast(res?.error || 'تعذر إقلاع الرحلة من السيرفر', 'error');
          return;
        }
      } catch (err) {
        const errMsg = err?.message || '';
        if (err.status === 400 || errMsg.includes('رصيدك غير كافٍ') || errMsg.includes('الحد الأقصى') || errMsg.includes('بالفعل')) {
          showAirportToast(errMsg || 'تعذر إقلاع الرحلة', 'error');
          return;
        }
        console.warn('[AirportUI] launchAirportFlight server bridge failed, using offline fallback:', err);
      }
    }

    // 2. Offline Fallback
    if (curCash >= eco.totalOperatingCost) {
      liveState.cash = curCash - eco.totalOperatingCost;
    } else {
      const rem = eco.totalOperatingCost - curCash;
      liveState.cash = 0;
      liveState.bank = Math.max(0, curBank - rem);
    }

    const now = Date.now();
    const durationMs = eco.durationSec * 1000;
    plane.status = 'in_flight';
    const flightObj = {
      flightId: 'flt_' + now + '_' + Math.random().toString(36).slice(2, 7),
      destinationId: dest.id,
      destinationName: dest.name,
      launchTime: now,
      landingTime: now + durationMs,
      durationSec: eco.durationSec,
      grossRevenue: eco.grossRevenue,
      fuelCost: eco.fuelCost,
      crewCost: eco.crewCost,
      landingFee: eco.landingFee,
      totalOperatingCost: eco.totalOperatingCost,
      expectedProfit: eco.grossRevenue,
      expectedNetProfit: eco.netProfit,
      expectedXp: eco.xpReward,
      speedupGold: eco.speedupGold || Math.max(1, Math.ceil(eco.durationSec / 600))
    };
    plane.currentFlight = flightObj;
    plane.activeFlight = flightObj;

    if (!ap.stats) ap.stats = {};
    ap.stats.totalOperatingCost = (Number(ap.stats.totalOperatingCost) || 0) + eco.totalOperatingCost;

    if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
      window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
    }

    persistGameState();
    if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
      window.GameEngine.recordPlayerActivity('إقلاع رحلة طيران ', `تسيير رحلة طائرة (${plane.customName || model.name}) إلى وجهة ${dest.name} بتكاليف تجهيز ${eco.totalOperatingCost.toLocaleString()} ج.م`, 'business');
    }
    const minStr = Math.floor(eco.durationSec / 60);
    showAirportToast(` أقلعت الرحلة إلى ${dest.name}! وقت الهبوط خلال ${minStr > 0 ? minStr + ' دقيقة' : eco.durationSec + ' ثانية'}. (صافي الربح: +${eco.netProfit.toLocaleString()} ج.م)`, 'success');
    renderAirportPanel();
  }

  async function speedupFlight(planeId) {
    const liveState = getLiveGameState();
    const ap = liveState.airport;
    if (!ap || !Array.isArray(ap.fleet)) return;

    const plane = ap.fleet.find(p => p.id === planeId);
    if (!plane || plane.status !== 'in_flight') return;
    const flight = plane.currentFlight || plane.activeFlight;
    if (!flight) return;

    const now = getTrustedNow();
    const landingTime = Number(flight.landingTime || 0);
    const remSec = Math.max(0, Math.ceil((landingTime - now) / 1000));
    if (remSec <= 0) return;

    // 1 Gold per 10 minutes (600 seconds)
    const costGold = Math.max(1, Math.ceil(remSec / 600));
    const curGold = Number(liveState.gold || 0);

    if (curGold < costGold) {
      showAirportToast(`تحتاج إلى ${costGold} سبيكة ذهب للتسريع الفوري! (المتبقي: ${Math.ceil(remSec / 60)} دقيقة | رصيدك: ${curGold} )`, 'error');
      return;
    }

    // 1. Authoritative Server Speedup
    if (window.ServerBridge && typeof window.ServerBridge.speedupAirportFlight === 'function') {
      try {
        const res = await window.ServerBridge.speedupAirportFlight(planeId);
        if (res && res.success) {
          if (res.gold !== undefined) liveState.gold = res.gold;
          if (res.airport) liveState.airport = res.airport;
          const updatedPlane = liveState.airport?.fleet?.find(p => p.id === planeId);
          if (updatedPlane && res.plane) {
            updatedPlane.activeFlight = res.plane.activeFlight;
            updatedPlane.currentFlight = res.plane.activeFlight;
          }

          if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
            window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
          }
          persistGameState();
          if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
            window.GameEngine.recordPlayerActivity('تسريع رحلة طائرة ', `تسريع فوري لهبوط طائرة (${plane.customName || planeId}) بالمطار مقابل ${costGold} سبيكة ذهب`, 'business');
          }
          showAirportToast(res.message || ' تم تسريع الرحلة وهبوط الطائرة فوراً بنجاح!', 'success');
          renderAirportPanel();
          return;
        } else {
          showAirportToast(res?.error || 'تعذر تسريع الرحلة', 'error');
          return;
        }
      } catch (err) {
        const errMsg = err?.message || '';
        if (err.status === 400 || errMsg.includes('ذهب') || errMsg.includes('بالفعل')) {
          showAirportToast(errMsg || 'تعذر تسريع الرحلة', 'error');
          return;
        }
        console.warn('[AirportUI] speedupAirportFlight server bridge failed, using offline fallback:', err);
      }
    }

    // 2. Offline Fallback
    liveState.gold = Math.max(0, curGold - costGold);
    flight.landingTime = Date.now() - 1000;
    plane.currentFlight = flight;
    plane.activeFlight = flight;

    if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
      window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
    }

    persistGameState();
    if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
      window.GameEngine.recordPlayerActivity('تسريع رحلة طائرة ', `تسريع فوري لهبوط طائرة (${plane.customName || planeId}) بالمطار مقابل ${costGold} سبيكة ذهب`, 'business');
    }
    showAirportToast(' تم تسريع الرحلة وهبوط الطائرة فوراً بنجاح!', 'success');
    renderAirportPanel();
  }

  async function claimFlight(planeId) {
    if (_claimingPlanes.has(planeId)) {
      console.warn('[AirportUI] Claim already in progress for plane:', planeId);
      return;
    }

    const liveState = getLiveGameState();
    const ap = liveState.airport;
    if (!ap || !Array.isArray(ap.fleet)) return;

    const plane = ap.fleet.find(p => p.id === planeId);
    if (!plane || plane.status !== 'in_flight') return;
    const f = plane.currentFlight || plane.activeFlight;
    if (!f) return;

    const flightId = f.flightId || ('flt_' + plane.id + '_' + f.launchTime);
    if (!Array.isArray(ap.claimedFlightIds)) ap.claimedFlightIds = [];

    // Deduplication Guard: If this flight was already collected, clean up and exit!
    if (ap.claimedFlightIds.includes(flightId) || (plane.lastClaimedFlightId && plane.lastClaimedFlightId === flightId)) {
      plane.status = 'idle';
      plane.currentFlight = null;
      plane.activeFlight = null;
      persistGameState();
      showAirportToast(' عوائد هذه الرحلة تم تحصيلها مسبقاً!', 'info');
      renderAirportPanel();
      return;
    }

    _claimingPlanes.add(planeId);

    // UI Loading state on button
    const claimBtns = document.querySelectorAll(`#card-plane-${planeId} button`);
    claimBtns.forEach(b => {
      b.disabled = true;
      b.classList.add('opacity-60', 'cursor-not-allowed');
    });

    // 1. Authoritative Server Claim (Primary Path)
    if (window.ServerBridge && typeof window.ServerBridge.claimAirportFlight === 'function') {
      try {
        const res = await window.ServerBridge.claimAirportFlight(planeId);
        if (res && res.success) {
          if (res.cash !== undefined) liveState.cash = res.cash;
          if (res.xp !== undefined) liveState.xp = res.xp;
          if (res.netWorth !== undefined) liveState.netWorth = res.netWorth;
          if (res.airport) liveState.airport = res.airport;

          // Record in local claimed ledger
          if (!Array.isArray(liveState.airport.claimedFlightIds)) liveState.airport.claimedFlightIds = [];
          if (!liveState.airport.claimedFlightIds.includes(flightId)) {
            liveState.airport.claimedFlightIds.push(flightId);
            if (liveState.airport.claimedFlightIds.length > 100) {
              liveState.airport.claimedFlightIds = liveState.airport.claimedFlightIds.slice(-100);
            }
          }

          // Mark local plane idle immediately
          plane.lastClaimedFlightId = flightId;
          plane.status = 'idle';
          plane.currentFlight = null;
          plane.activeFlight = null;

          if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
            window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
          }
          persistGameState();
          if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
            window.GameEngine.recordPlayerActivity('تحصيل رحلة طيران ', `تحصيل أرباح رحلة طائرة (${plane.customName || plane.modelId || 'طائرة'}) (${res.message || 'عوائد الرحلة'})`, 'business');
          }
          showAirportToast(res.message || ' تم تحصيل عوائد الرحلة بنجاح!', 'success');
          _claimingPlanes.delete(planeId);
          renderAirportPanel();
          return;
        } else {
          throw new Error((res && res.error) || 'فشل التحقق من السيرفر');
        }
      } catch (err) {
        _claimingPlanes.delete(planeId);
        const errMsg = err?.message || String(err || '');

        // If the server rejected because it was already claimed, clean up state immediately!
        if (errMsg.includes('مسبقاً') || errMsg.includes('بالفعل') || err.alreadyClaimed || errMsg.includes('لا توجد رحلة جاهزة')) {
          if (!ap.claimedFlightIds.includes(flightId)) ap.claimedFlightIds.push(flightId);
          plane.lastClaimedFlightId = flightId;
          plane.status = 'idle';
          plane.currentFlight = null;
          plane.activeFlight = null;
          persistGameState();
          showAirportToast(' عوائد هذه الرحلة تم تحصيلها وتحديث رصيدك بالفعل.', 'info');
          renderAirportPanel();
          return;
        }

        const isAuthError = err.status === 401 || err.isAuthError || errMsg.includes('session token') || errMsg.includes('Unauthorized');
        if (isAuthError) {
          console.warn('[AirportUI] Session token error on claimAirportFlight, evaluating local landing status...');
          const trustedNow = getTrustedNow();
          if (trustedNow >= Number(f.landingTime || 0)) {
            // Guard against duplicate local credit
            if (ap.claimedFlightIds.includes(flightId)) {
              plane.status = 'idle';
              plane.currentFlight = null;
              plane.activeFlight = null;
              renderAirportPanel();
              return;
            }

            ap.claimedFlightIds.push(flightId);
            plane.lastClaimedFlightId = flightId;

            const grossRev = Number(f.grossRevenue || f.expectedProfit || 0);
            const netProfit = Number(f.expectedNetProfit || (grossRev - (f.totalOperatingCost || 0)));
            const xp = Number(f.expectedXp || 50);

            liveState.cash = (Number(liveState.cash) || 0) + grossRev;
            liveState.xp = (Number(liveState.xp) || 0) + xp;

            plane.status = 'idle';
            plane.totalFlights = (Number(plane.totalFlights) || 0) + 1;
            plane.totalRevenue = (Number(plane.totalRevenue) || 0) + grossRev;
            plane.currentFlight = null;
            plane.activeFlight = null;

            if (!ap.stats) ap.stats = {};
            ap.stats.totalFlights = (Number(ap.stats.totalFlights) || 0) + 1;
            ap.stats.totalRevenue = (Number(ap.stats.totalRevenue) || 0) + grossRev;
            ap.stats.totalNetProfit = (Number(ap.stats.totalNetProfit) || 0) + netProfit;

            if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
              window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
            }

            persistGameState();
            if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
              window.GameEngine.recordPlayerActivity('تحصيل رحلة طيران ', `تحصيل أرباح رحلة طائرة (${plane.customName || plane.modelId || 'طائرة'}) بقيمة (+${grossRev.toLocaleString()} ج.م) و +${xp} XP`, 'business');
            }
            showAirportToast(` هبطت الرحلة بسلام! تم تحصيل عوائد +${grossRev.toLocaleString()} ج.م (يرجى إعادة تأكيد كلمة السر لتحديث الحفظ السحابي)`, 'warning');
            renderAirportPanel();

            setTimeout(() => {
              if (typeof window.showAuthModal === 'function') {
                const u = liveState.username || (window.ServerBridge && window.ServerBridge.getActiveUsername && window.ServerBridge.getActiveUsername());
                const authUserEl = document.getElementById('auth-username');
                if (authUserEl && u) authUserEl.value = u;
                window.showAuthModal('login');
              }
            }, 1800);
            return;
          }
        }
        showAirportToast(errMsg || 'فشل تحصيل الرحلة: السيرفر يرفض الهبوط المبكر!', 'error');
        renderAirportPanel();
        return;
      }
    }

    // 2. Resilient Offline Fallback (Only if ServerBridge is completely unreachable)
    const trustedNow = getTrustedNow();
    if (trustedNow < Number(f.landingTime || 0)) {
      _claimingPlanes.delete(planeId);
      const remSec = Math.ceil((Number(f.landingTime) - trustedNow) / 1000);
      showAirportToast(` الطائرة لا تزال في الجو! متبقي: ${remSec} ثانية.`, 'error');
      renderAirportPanel();
      return;
    }

    if (ap.claimedFlightIds.includes(flightId)) {
      _claimingPlanes.delete(planeId);
      plane.status = 'idle';
      plane.currentFlight = null;
      plane.activeFlight = null;
      renderAirportPanel();
      return;
    }

    ap.claimedFlightIds.push(flightId);
    plane.lastClaimedFlightId = flightId;

    const grossRev = Number(f.grossRevenue || f.expectedProfit || 0);
    const netProfit = Number(f.expectedNetProfit || (grossRev - (f.totalOperatingCost || 0)));
    const xp = Number(f.expectedXp || 50);

    liveState.cash = (Number(liveState.cash) || 0) + grossRev;
    liveState.xp = (Number(liveState.xp) || 0) + xp;

    plane.status = 'idle';
    plane.totalFlights = (Number(plane.totalFlights) || 0) + 1;
    plane.totalRevenue = (Number(plane.totalRevenue) || 0) + grossRev;
    plane.currentFlight = null;
    plane.activeFlight = null;

    if (!ap.stats) ap.stats = {};
    ap.stats.totalFlights = (Number(ap.stats.totalFlights) || 0) + 1;
    ap.stats.totalRevenue = (Number(ap.stats.totalRevenue) || 0) + grossRev;
    ap.stats.totalNetProfit = (Number(ap.stats.totalNetProfit) || 0) + netProfit;

    if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
      window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
    }

    persistGameState();
    if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
      window.GameEngine.recordPlayerActivity('تحصيل رحلة طيران ', `تحصيل أرباح رحلة طائرة (${plane.customName || plane.modelId || 'طائرة'}) بقيمة (+${grossRev.toLocaleString()} ج.م) و +${xp} XP`, 'business');
    }
    showAirportToast(` هبطت الرحلة بسلام! تم تحصيل عوائد +${grossRev.toLocaleString()} ج.م (صافي ربح: +${netProfit.toLocaleString()} ج.م) و +${xp} XP`, 'success');
    _claimingPlanes.delete(planeId);
    renderAirportPanel();
  }

  async function sellPlane(planeId) {
    const liveState = getLiveGameState();
    const ap = liveState.airport;
    if (!ap || !Array.isArray(ap.fleet)) return;

    const planeIdx = ap.fleet.findIndex(p => p.id === planeId);
    if (planeIdx === -1) return;

    const plane = ap.fleet[planeIdx];
    if (plane.status === 'in_flight') {
      showAirportToast(' لا يمكن بيع الطائرة وهي في الجو! انتظر هبوطها وتحصيل الرحلة أولاً.', 'error');
      return;
    }

    const model = AIRCRAFT_META[plane.modelId] || AIRCRAFT_META.cessna_sky;
    const refund = Math.floor((model.cost || 8000000) * 0.5);

    const confirmed = confirm(`هل أنت متأكد من بيع طائرة "${plane.customName || model.name}" مقابل استرداد +${refund.toLocaleString()} ج.م (50% من سعر الشراء)؟`);
    if (!confirmed) return;

    // 1. Authoritative Server Sale
    if (window.ServerBridge && typeof window.ServerBridge.sellAirportPlane === 'function') {
      try {
        const res = await window.ServerBridge.sellAirportPlane(planeId);
        if (res && res.success) {
          if (res.airport) liveState.airport = res.airport;
          if (res.cash !== undefined) liveState.cash = res.cash;
          if (res.netWorth !== undefined) liveState.netWorth = res.netWorth;

          // Double check plane removed from local fleet
          if (Array.isArray(liveState.airport?.fleet)) {
            const idx = liveState.airport.fleet.findIndex(p => p.id === planeId);
            if (idx !== -1) liveState.airport.fleet.splice(idx, 1);
          }

          if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
            window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
          }
          persistGameState();
          if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
            window.GameEngine.recordPlayerActivity('بيع طائرة ', `بيع طائرة (${plane.customName || model.name}) واسترداد (+${refund.toLocaleString()} ج.م) (50% من سعر الشراء)`, 'assets');
          }
          showAirportToast(res.message || ` تم بيع طائرة ${model.name} واسترداد +${refund.toLocaleString()} ج.م بنجاح!`, 'success');
          renderAirportPanel();
          return;
        } else {
          showAirportToast(res?.error || 'تعذر بيع الطائرة من السيرفر', 'error');
          return;
        }
      } catch (err) {
        const errMsg = err?.message || '';
        if (err.status === 400 || errMsg.includes('الجو') || errMsg.includes('غير موجودة')) {
          showAirportToast(errMsg || 'تعذر بيع الطائرة', 'error');
          return;
        }
        console.warn('[AirportUI] sellAirportPlane server bridge failed, using offline fallback:', err);
      }
    }

    // 2. Offline Fallback
    ap.fleet.splice(planeIdx, 1);
    liveState.cash = (Number(liveState.cash) || 0) + refund;

    if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
      window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
    }

    persistGameState();
    if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
      window.GameEngine.recordPlayerActivity('بيع طائرة ', `بيع طائرة (${plane.customName || model.name}) واسترداد (+${refund.toLocaleString()} ج.م) (50% من سعر الشراء)`, 'assets');
    }
    showAirportToast(` تم بيع طائرة ${model.name} واسترداد +${refund.toLocaleString()} ج.م بنجاح!`, 'success');
    renderAirportPanel();
  }

  async function buyPlane(modelId) {
    const liveState = getLiveGameState();
    const ap = liveState.airport;
    if (!ap) return;

    const model = AIRCRAFT_META[modelId];
    if (!model) return;

    const facilities = ap.facilities || {};
    const maxTier = Number(facilities.runway || 1);
    if (model.tier > maxTier) {
      showAirportToast(` يتطلب شراء هذه الطائرة ترقية المدرج أولاً لاستيعاب الفئة ${model.tier}!`, 'error');
      return;
    }

    if (!Array.isArray(ap.fleet)) ap.fleet = [];
    if (ap.fleet.length >= 12) {
      showAirportToast('الأسطول ممتلئ بالكامل (الحد الأقصى 12 طائرة)!', 'error');
      return;
    }

    const curCash = Number(liveState.cash || 0);
    const curBank = Number(liveState.bank || 0);
    const totalLiquid = curCash + curBank;

    if (totalLiquid < model.cost) {
      showAirportToast(`رصيدك غير كافٍ لشراء ${model.name} (${model.cost.toLocaleString()} ج.م)!`, 'error');
      return;
    }

    const customName = `${model.name} #${ap.fleet.length + 1}`;

    // 1. Authoritative Server Purchase (Primary Path: server checks funds, deducts once, adds plane)
    if (window.ServerBridge && typeof window.ServerBridge.buyAirportPlane === 'function') {
      try {
        const res = await window.ServerBridge.buyAirportPlane(modelId, customName);
        if (res && res.success) {
          if (res.airport) liveState.airport = res.airport;
          if (res.cash !== undefined) liveState.cash = res.cash;
          if (res.bank !== undefined) liveState.bank = res.bank;
          if (res.netWorth !== undefined) liveState.netWorth = res.netWorth;

          if (!Array.isArray(liveState.airport.fleet)) liveState.airport.fleet = [];
          if (res.plane && !liveState.airport.fleet.some(p => p.id === res.plane.id)) {
            liveState.airport.fleet.push(res.plane);
          }

          if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
            window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
          }

          persistGameState();
          if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
            window.GameEngine.recordPlayerActivity('شراء طائرة ', `شراء طائرة ${model.name} وإضافتها للأسطول الجوي بقيمة ${model.cost.toLocaleString()} ج.م`, 'assets');
          }
          showAirportToast(res.message || ` تم شراء وإضافة ${model.name} إلى أسطولك الجوي بنجاح!`, 'success');
          renderAirportPanel();
          return;
        } else {
          showAirportToast(res?.error || 'تعذر إتمام عملية شراء الطائرة', 'error');
          return;
        }
      } catch (err) {
        const errMsg = err?.message || '';
        if (err.status === 400 || errMsg.includes('رصيدك غير كافٍ') || errMsg.includes('ترقية المدرج') || errMsg.includes('الحد الأقصى')) {
          showAirportToast(errMsg || 'تعذر إتمام شراء الطائرة', 'error');
          return;
        }
        console.warn('[AirportUI] buyAirportPlane server bridge failed, using offline fallback:', err);
      }
    }

    // 2. Offline Fallback (Only if server is unreachable)
    if (curCash >= model.cost) {
      liveState.cash = curCash - model.cost;
    } else {
      const rem = model.cost - curCash;
      liveState.cash = 0;
      liveState.bank = Math.max(0, curBank - rem);
    }

    const newPlane = {
      id: 'plane_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      modelId: model.id,
      customName,
      status: 'idle',
      totalFlights: 0,
      totalRevenue: 0,
      currentFlight: null,
      activeFlight: null
    };

    ap.fleet.push(newPlane);

    if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
      window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
    }

    persistGameState();
    if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
      window.GameEngine.recordPlayerActivity('شراء طائرة ', `شراء طائرة ${model.name} وإضافتها للأسطول الجوي بقيمة ${model.cost.toLocaleString()} ج.م`, 'assets');
    }
    showAirportToast(` تم شراء وإضافة ${model.name} إلى أسطولك الجوي بنجاح!`, 'success');
    renderAirportPanel();
  }

  async function upgradeFacility(facilityId) {
    const liveState = getLiveGameState();
    const ap = liveState.airport;
    if (!ap) return;

    const fac = FACILITY_META[facilityId];
    if (!fac) return;

    if (!ap.facilities) ap.facilities = { runway: 1, terminals: 1, hangar: 1, duty_free: 0 };
    const curLvl = Number(ap.facilities[facilityId] || (facilityId === 'duty_free' ? 0 : 1));
    const nextLvl = curLvl + 1;
    const nextDef = fac.levels[nextLvl];

    if (!nextDef) {
      showAirportToast('هذا المرفق في أقصى مستوى تطوير بالفعل!', 'error');
      return;
    }

    const cost = Number(nextDef.cost || 0);
    const curCash = Number(liveState.cash || 0);
    const curBank = Number(liveState.bank || 0);
    const totalLiquid = curCash + curBank;

    if (totalLiquid < cost) {
      showAirportToast(`رصيدك لا يكفي للترقية (${cost.toLocaleString()} ج.م)!`, 'error');
      return;
    }

    // 1. Authoritative Server Upgrade
    if (window.ServerBridge && typeof window.ServerBridge.upgradeAirportFacility === 'function') {
      try {
        const res = await window.ServerBridge.upgradeAirportFacility(facilityId);
        if (res && res.success) {
          if (res.airport) liveState.airport = res.airport;
          if (res.cash !== undefined) liveState.cash = res.cash;
          if (res.bank !== undefined) liveState.bank = res.bank;
          if (res.netWorth !== undefined) liveState.netWorth = res.netWorth;

          if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
            window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
          }
          persistGameState();
          if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
            window.GameEngine.recordPlayerActivity('تطوير مرفق بالمطار ', `ترقية مرفق (${fac.name}) بالمطار إلى المستوى ${nextLvl} بتكلفة ${cost.toLocaleString()} ج.م`, 'business');
          }
          showAirportToast(res.message || ` تم ترقية ${fac.name} إلى المستوى ${nextLvl} بنجاح!`, 'success');
          renderAirportPanel();
          return;
        } else {
          showAirportToast(res?.error || 'تعذر ترقية المنشأة', 'error');
          return;
        }
      } catch (err) {
        const errMsg = err?.message || '';
        if (err.status === 400 || errMsg.includes('رصيدك غير كافٍ') || errMsg.includes('أقصى مستوى')) {
          showAirportToast(errMsg || 'تعذر ترقية المنشأة', 'error');
          return;
        }
        console.warn('[AirportUI] upgradeAirportFacility server bridge failed, using offline fallback:', err);
      }
    }

    // 2. Offline Fallback
    if (curCash >= cost) {
      liveState.cash = curCash - cost;
    } else {
      const rem = cost - curCash;
      liveState.cash = 0;
      liveState.bank = Math.max(0, curBank - rem);
    }

    ap.facilities[facilityId] = nextLvl;
    if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
      window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
    }

    persistGameState();
    if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
      window.GameEngine.recordPlayerActivity('تطوير مرفق بالمطار ', `ترقية مرفق (${fac.name}) بالمطار إلى المستوى ${nextLvl} بتكلفة ${cost.toLocaleString()} ج.م`, 'business');
    }
    showAirportToast(` تم ترقية ${fac.name} إلى المستوى ${nextLvl} بنجاح!`, 'success');
    renderAirportPanel();
  }

  async function acceptTransit() {
    const liveState = getLiveGameState();
    const ap = liveState.airport;
    if (!ap) return;

    const amt = calculateTransitClient(ap);
    const lastCollect = Number(ap.lastTransitCollectionAt || 0);
    const elapsed = getTrustedNow() - lastCollect;
    const cooldownMs = 60 * 1000; // 60s minimum interval
    if (lastCollect > 0 && elapsed < cooldownMs) {
      const remSec = Math.ceil((cooldownMs - elapsed) / 1000);
      showAirportToast(` يرجى الانتظار ${remSec} ثانية قبل تحصيل رسوم الترانزيت التالية.`, 'warning');
      return;
    }

    if (amt < 500) {
      showAirportToast(` الحد الأدنى لتحصيل رسوم الترانزيت هو 500 ج.م (المتراكم حالياً: ${amt.toLocaleString()} ج.م).`, 'warning');
      return;
    }

    // 1. Authoritative Server Transit
    if (window.ServerBridge && typeof window.ServerBridge.acceptAirportTransit === 'function') {
      try {
        const res = await window.ServerBridge.acceptAirportTransit();
        if (res && res.success) {
          if (res.airport) liveState.airport = res.airport;
          if (res.cash !== undefined) liveState.cash = res.cash;
          if (res.xp !== undefined) liveState.xp = res.xp;
          if (res.netWorth !== undefined) liveState.netWorth = res.netWorth;

          if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
            window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
          }
          persistGameState();
          if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
            window.GameEngine.recordPlayerActivity('تحصيل رسوم ترانزيت ', `تحصيل رسوم هبوط الترانزيت المتراكمة بالساعة (+${(res.fee || amt).toLocaleString()} ج.م)`, 'business');
          }
          showAirportToast(res.message || ` تم تحصيل رسوم الترانزيت المتراكمة بنجاح (+${(res.fee || amt).toLocaleString()} ج.م)!`, 'success');
          renderAirportPanel();
          return;
        } else {
          showAirportToast(res?.error || 'تعذر تحصيل رسوم الترانزيت', 'error');
          renderAirportPanel();
          return;
        }
      } catch (err) {
        const errMsg = err?.message || '';
        // CRITICAL: Block offline fallback on server business rejection!
        if (err?.status === 400 || err?.status === 403 || errMsg.includes('رادار') || errMsg.includes('انتظار') || errMsg.includes('دقيقة') || errMsg.includes('ثانية') || errMsg.includes('أدنى') || errMsg.includes('ترانزيت')) {
          showAirportToast(errMsg || ' لا توجد رسوم ترانزيت قابلة للتحصيل حالياً', 'warning');
          renderAirportPanel();
          return;
        }
        console.warn('[AirportUI] acceptAirportTransit server bridge failed, checking offline fallback:', err);
      }
    }

    // 2. Offline Fallback (STRICT: only if server completely unreachable)
    if (lastCollect > 0 && elapsed < cooldownMs) {
      return;
    }

    const fee = amt;
    const xp = 50;

    liveState.cash = (Number(liveState.cash) || 0) + fee;
    liveState.xp = (Number(liveState.xp) || 0) + xp;
    ap.lastTransitCollectionAt = Date.now();
    ap.lastTransitPermitAt = Date.now();

    if (!ap.stats) ap.stats = {};
    ap.stats.transitPermitsAccepted = (Number(ap.stats.transitPermitsAccepted) || 0) + 1;
    ap.stats.totalTransitFeesCollected = (Number(ap.stats.totalTransitFeesCollected) || 0) + fee;

    if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
      window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
    }

    persistGameState();
    if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
      window.GameEngine.recordPlayerActivity('تحصيل رسوم ترانزيت ', `تحصيل رسوم هبوط الترانزيت المتراكمة بالساعة (+${fee.toLocaleString()} ج.م) و +${xp} XP`, 'business');
    }
    showAirportToast(` تم تحصيل رسوم الترانزيت المتراكمة (+${fee.toLocaleString()} ج.م) و +${xp} XP!`, 'success');
    renderAirportPanel();
  }

  async function hireManager(tier = 1) {
    const liveState = getLiveGameState();
    const ap = liveState.airport;
    if (!ap || !ap.unlocked) return;

    const curTier = Number(ap.manager?.tier || 0);
    if (curTier >= 1 && tier === 1) {
      showAirportToast(' لديك مدير مطار معين بالفعل! يمكنك الترقية لمستويات أعلى عبر باقات VIP المتجر.', 'info');
      return;
    }

    const HIRE_COST = 100000000; // 100M Cash
    const curCash = Number(liveState.cash || 0);
    if (curCash < HIRE_COST) {
      showAirportToast(` رصيدك الكاش غير كافٍ! تكلفة توظيف مساعد مدير المطار هي ${HIRE_COST.toLocaleString()} ج.م`, 'error');
      return;
    }

    const btnHire = document.getElementById('btn-hire-airport-manager-1');
    if (btnHire) {
      btnHire.disabled = true;
      btnHire.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التوظيف والاعتماد...';
    }

    // 1. Authoritative Server Hire
    if (window.ServerBridge && typeof window.ServerBridge.hireAirportManager === 'function') {
      try {
        const res = await window.ServerBridge.hireAirportManager(tier);
        if (res && res.success) {
          if (res.airport) liveState.airport = res.airport;
          if (res.cash !== undefined) liveState.cash = res.cash;
          if (res.netWorth !== undefined) liveState.netWorth = res.netWorth;

          if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
            window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
          }
          persistGameState();
          if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
            window.GameEngine.recordPlayerActivity('توظيف مساعد مدير المطار ', `تعيين كابتن ليام كمساعد لمدير العمليات الجوية (+5% أرباح على كافة الرحلات)`, 'business');
          }
          showAirportToast(res.message || ' تهانينا! تم تعيين كابتن ليام بنجاح وبونص +5% أرباح!', 'success');
          renderAirportPanel();
          return;
        } else {
          showAirportToast(res?.error || 'تعذر توظيف مدير المطار', 'error');
          if (btnHire) {
            btnHire.disabled = false;
            btnHire.innerHTML = `<i class="fa-solid fa-user-plus"></i> <span>توظيف بالكاش (${HIRE_COST.toLocaleString()} ج.م)</span>`;
          }
          return;
        }
      } catch (err) {
        const errMsg = err?.message || '';
        if (err.status === 400 || errMsg.includes('رصيدك') || errMsg.includes('بالفعل')) {
          showAirportToast(errMsg || 'تعذر توظيف مدير المطار', 'error');
          if (btnHire) {
            btnHire.disabled = false;
            btnHire.innerHTML = `<i class="fa-solid fa-user-plus"></i> <span>توظيف بالكاش (${HIRE_COST.toLocaleString()} ج.م)</span>`;
          }
          return;
        }
        console.warn('[AirportUI] hireAirportManager server bridge failed, using offline fallback:', err);
      }
    }

    // 2. Offline Fallback
    liveState.cash = curCash - HIRE_COST;
    ap.manager = {
      tier: 1,
      name: 'كابتن ليام - مساعد مدير العمليات ',
      title: 'مساعد مدير العمليات الجوية',
      profitBonusPct: 5,
      costDiscountPct: 0,
      autoPilot: false,
      hiredAt: Date.now()
    };

    if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
      window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
    }
    persistGameState();
    if (window.GameEngine && typeof window.GameEngine.recordPlayerActivity === 'function') {
      window.GameEngine.recordPlayerActivity('توظيف مساعد مدير المطار ', `تعيين كابتن ليام كمساعد لمدير العمليات الجوية (+5% أرباح على كافة الرحلات)`, 'business');
    }
    showAirportToast(' تهانينا! تم تعيين كابتن ليام بنجاح وبونص +5% أرباح على كافة الرحلات!', 'success');
    renderAirportPanel();
  }

  async function toggleAutopilot(enabled = null) {
    const liveState = getLiveGameState();
    const ap = liveState.airport;
    if (!ap || !ap.unlocked || !ap.manager || Number(ap.manager.tier) < 3) {
      showAirportToast(' خاصية الطيار الآلي الذكي تتطلب تعيين المدير التنفيذي العام (Tier 3)', 'error');
      return;
    }

    const currentStatus = ap.manager.autoPilot !== false;
    const targetStatus = typeof enabled === 'boolean' ? enabled : !currentStatus;

    if (window.ServerBridge && typeof window.ServerBridge.toggleAirportAutopilot === 'function') {
      try {
        const res = await window.ServerBridge.toggleAirportAutopilot(targetStatus);
        if (res && res.success) {
          if (res.airport) liveState.airport = res.airport;
          else ap.manager.autoPilot = targetStatus;

          if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
            window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
          }
          persistGameState();
          showAirportToast(res.message || (targetStatus ? ' تم تفعيل الطيار الآلي الذكي للمطار بنجاح!' : '⏸ تم إيقاف الطيار الآلي مؤقتاً.'), 'info');
          renderAirportPanel();
          return;
        }
      } catch (err) {
        console.warn('[AirportUI] toggleAirportAutopilot server bridge failed, using offline fallback:', err);
      }
    }

    ap.manager.autoPilot = targetStatus;
    if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
      window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
    }
    persistGameState();
    showAirportToast(targetStatus ? ' تم تفعيل الطيار الآلي الذكي للمطار بنجاح!' : '⏸ تم إيقاف الطيار الآلي مؤقتاً.', 'info');
    renderAirportPanel();
  }

  function setSubtab(tab) {
    _activeSubtab = tab;
    renderAirportPanel();
  }

  return {
    init,
    renderAirportPanel,
    setSubtab,
    launchFlight,
    speedupFlight,
    claimFlight,
    buyPlane,
    sellPlane,
    upgradeFacility,
    acceptTransit,
    hireManager,
    toggleAutopilot,
    updateEconomicsPreview,
    AIRCRAFT_META,
    FACILITY_META,
    AIRPORT_MANAGERS_META,
    DESTINATIONS_META
  };
})();

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.AirportUI.init();
  });
}
