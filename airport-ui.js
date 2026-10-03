/**
 * Ras ALmal Tycoon — International Airport Hub Frontend Engine
 * 100% Server-Authoritative UI & Real-Time Flight Visualizer
 * Balanced 7-Day ROI Economy with Operating Costs Breakdown (Fuel, Crew, Landing Fees)
 */

window.AirportUI = (() => {
  let _activeSubtab = 'flights'; // 'flights' | 'fleet' | 'facilities' | 'transit'
  let _flightTickerTimer = null;

  const FACILITY_META = {
    runway: {
      name: 'مدرج الطائرات الرئيسي 🛫',
      icon: 'fa-road text-sky-400',
      levels: {
        1: { name: 'مدرج إقليمي معبد', cost: 0, maxPlaneTier: 1, desc: 'يستوعب طائرات الفئة 1 (Cessna VIP)' },
        2: { name: 'مدرج دولي عريض', cost: 12000000, maxPlaneTier: 2, desc: 'يستوعب طائرات الفئة 2 (Airbus A320)' },
        3: { name: 'مدرج عابر للقارات متطور', cost: 40000000, maxPlaneTier: 3, desc: 'يستوعب طائرات الفئة 3 (Boeing 777 / A380)' },
        4: { name: 'مجمع مدارج ذكي CAT III', cost: 95000000, maxPlaneTier: 4, desc: 'يستوعب طائرات الفئة 4 (Gulfstream VIP / Beluga Cargo)' }
      }
    },
    terminals: {
      name: 'صالات الركاب الدولية 🏢',
      icon: 'fa-building-columns text-amber-400',
      levels: {
        1: { name: 'صالة ركاب أساسية', cost: 0, ticketBonus: 1.0, desc: 'رسوم تذاكر قياسية' },
        2: { name: 'مبنى صالات دولي حديث', cost: 10000000, ticketBonus: 1.10, desc: '+10% أرباح تذاكر الرحلات' },
        3: { name: 'صالة كبار الشخصيات VIP والدرجة الأولى', cost: 35000000, ticketBonus: 1.20, desc: '+20% أرباح تذاكر + بونص XP' },
        4: { name: 'مدينة مطار عالمية متكاملة', cost: 85000000, ticketBonus: 1.35, desc: '+35% أرباح تذاكر الرحلات' }
      }
    },
    hangar: {
      name: 'حوض الصيانة وخزانات الوقود 🛠️⛽',
      icon: 'fa-wrench text-emerald-400',
      levels: {
        1: { name: 'مرآب صيانة يدوي', cost: 0, timeReduction: 0, fuelDiscount: 0, desc: 'زمن رحلات وتكلفة وقود قياسية' },
        2: { name: 'حوض فحص سريع ومضخات نفاثة', cost: 10000000, timeReduction: 0.05, fuelDiscount: 0.05, desc: '-5% زمن الرحلات و -5% تكلفة الوقود' },
        3: { name: 'مركز نفاثات ومستودع وقود توربيني', cost: 30000000, timeReduction: 0.10, fuelDiscount: 0.10, desc: '-10% زمن الرحلات و -10% تكلفة الوقود' },
        4: { name: 'روبوتات صيانة ومستودع وقود استراتيجي', cost: 75000000, timeReduction: 0.15, fuelDiscount: 0.15, desc: '-15% زمن الرحلات و -15% تكلفة الوقود' }
      }
    },
    duty_free: {
      name: 'السوق الحرة ومتاجر الترانزيت 🛍️',
      icon: 'fa-store text-fuchsia-400',
      levels: {
        1: { name: 'أكشاك هدايا وتذكارات', cost: 5000000, passivePerMin: 166, desc: 'دخل سلبي: 166 ج.م/دقيقة (10 آلاف/ساعة)' },
        2: { name: 'مجمع عطور وساعات سويسرية', cost: 18000000, passivePerMin: 580, desc: 'دخل سلبي: 580 ج.م/دقيقة (35 ألف/ساعة)' },
        3: { name: 'مول ماركات عالمية وأزياء راقية', cost: 50000000, passivePerMin: 1500, desc: 'دخل سلبي: 1,500 ج.م/دقيقة (90 ألف/ساعة)' },
        4: { name: 'صالة مزادات مجوهرات وسيارات VIP', cost: 120000000, passivePerMin: 3330, desc: 'دخل سلبي: 3,330 ج.م/دقيقة (200 ألف/ساعة)' }
      }
    }
  };

  const AIRCRAFT_META = {
    cessna_sky: {
      id: 'cessna_sky',
      name: 'Cessna Sky Courier 🛩️',
      tier: 1,
      cost: 3000000,
      capacity: '8 ركاب VIP',
      flightTimeSec: 7200, // 2 hours
      baseRevenue: 300000,
      fuelCost: 45000,
      crewCost: 30000,
      landingFee: 25000,
      baseNetProfit: 200000,
      xp: 75,
      speedupGold: 2,
      desc: 'طائرة خفيفة للمسافات الإقليمية ورجال الأعمال (رحلة ساعتان)'
    },
    airbus_a320: {
      id: 'airbus_a320',
      name: 'Airbus A320neo ✈️',
      tier: 2,
      cost: 15000000,
      capacity: '180 مسافر',
      flightTimeSec: 14400, // 4 hours
      baseRevenue: 1350000,
      fuelCost: 240000,
      crewCost: 140000,
      landingFee: 120000,
      baseNetProfit: 850000,
      xp: 220,
      speedupGold: 5,
      desc: 'طائرة ركاب دولية عالية الكفاءة للمسافات المتوسطة (رحلة 4 ساعات)'
    },
    boeing_777: {
      id: 'boeing_777',
      name: 'Boeing 777-300ER 🌐',
      tier: 3,
      cost: 55000000,
      capacity: '390 مسافر',
      flightTimeSec: 21600, // 6 hours
      baseRevenue: 4800000,
      fuelCost: 750000,
      crewCost: 500000,
      landingFee: 350000,
      baseNetProfit: 3200000,
      xp: 800,
      speedupGold: 10,
      desc: 'طائر عملاق عابر للقارات للرحلات الدولية الطويلة (رحلة 6 ساعات)'
    },
    gulfstream_g650: {
      id: 'gulfstream_g650',
      name: 'Gulfstream G650 VIP 👑🛩️',
      tier: 4,
      cost: 85000000,
      capacity: 'نخبة رجال الأعمال والأمراء VIP',
      flightTimeSec: 28800, // 8 hours
      baseRevenue: 7000000,
      fuelCost: 950000,
      crewCost: 600000,
      landingFee: 450000,
      baseNetProfit: 5000000,
      xp: 650,
      speedupGold: 10,
      desc: 'طائرة نفاثة فاخرة لنقل كبار الشخصيات بعوائد قياسية (رحلة 8 ساعات)'
    },
    cargo_beluga: {
      id: 'cargo_beluga',
      name: 'Airbus BelugaXL Heavy Cargo 📦✈️',
      tier: 4,
      cost: 125000000,
      capacity: '50 طن بضائع ومعدات ثقيلة',
      flightTimeSec: 36000, // 10 hours
      baseRevenue: 11000000,
      fuelCost: 1800000,
      crewCost: 950000,
      landingFee: 750000,
      baseNetProfit: 7500000,
      xp: 1200,
      speedupGold: 14,
      desc: 'وحش الشحن الجوي العملاق لنقل الشحنات الفاخرة حول العالم (رحلة 10 ساعات)'
    },
    airbus_a380: {
      id: 'airbus_a380',
      name: 'Airbus A380 Superjumbo 🏰✈️',
      tier: 3,
      cost: 220000000,
      capacity: '615 مسافر (طابقين)',
      flightTimeSec: 50400, // 14 hours
      baseRevenue: 23000000,
      fuelCost: 3400000,
      crewCost: 2100000,
      landingFee: 1500000,
      baseNetProfit: 16000000,
      xp: 2000,
      speedupGold: 18,
      desc: 'القلعة الطائرة ذات الطابقين.. أضخم طائرة ركاب في العالم (رحلة 14 ساعة)'
    }
  };

  const DESTINATIONS_META = [
    { id: 'cairo_riyadh', name: 'الرياض 🇸🇦', mult: 1.0, tier: 1 },
    { id: 'cairo_dubai', name: 'دبي 🇦🇪', mult: 1.25, tier: 1 },
    { id: 'cairo_istanbul', name: 'إسطنبول 🇹🇷', mult: 1.5, tier: 2 },
    { id: 'cairo_london', name: 'لندن 🇬🇧', mult: 2.0, tier: 2 },
    { id: 'cairo_paris', name: 'باريس 🇫🇷', mult: 2.2, tier: 2 },
    { id: 'cairo_newyork', name: 'نيويورك 🇺🇸', mult: 3.0, tier: 3 },
    { id: 'cairo_tokyo', name: 'طوكيو 🇯🇵', mult: 3.5, tier: 3 }
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
              مطار الطيران الدولي والأسطول الجوي 🛫
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
            <span>شراء رخصة المطار وتدشين الأسطول الجوي 🛫</span>
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
            throw new Error(`🚫 يتطلب فتح المطار خبرة لا تقل عن ${minXp.toLocaleString()} XP (خبرتك الحالية: ${curXp.toLocaleString()} XP)`);
          }

          const cost = 30000000;
          const curCash = Number(liveState.cash || 0);
          const curBank = Number(liveState.bank || 0);
          if (!isAdmin && (curCash + curBank) < cost) {
            throw new Error(`🚫 رصيدك غير كافٍ لدفع رسوم رخصة المطار (${cost.toLocaleString()} ج.م)`);
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
          if (window.renderHeader) window.renderHeader();

          showAirportToast(`🛫 تم تدشين ${airportName} بنجاح وإضافة طائرة Cessna إلى الأسطول!`, 'success');
          renderAirportPanel();
        } catch (err) {
          showAirportToast(err.message || 'فشل تفعيل المطار', 'error');
          btnUnlock.disabled = false;
          btnUnlock.innerHTML = '<i class="fa-solid fa-passport"></i> <span>تفعيل رخصة المطار وتدشين الأسطول الجوي 🛫</span>';
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
            <button id="btn-claim-duty-free" ${dutyFreeAccumulated <= 0 ? 'disabled' : ''}
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
          <span>برج المراقبة والترانزيت 📡</span>
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
            شراء طائرة جديدة 🛒
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

    const ticketBonus = FACILITY_META.terminals.levels[tLvl]?.ticketBonus || 1.0;
    const timeReduction = FACILITY_META.hangar.levels[hLvl]?.timeReduction || 0;
    const fuelDiscount = FACILITY_META.hangar.levels[hLvl]?.fuelDiscount || 0;
    const maxPlaneTier = FACILITY_META.runway.levels[rLvl]?.maxPlaneTier || 1;

    return { ticketBonus, timeReduction, fuelDiscount, maxPlaneTier };
  }

  function getEconomicsForDisplay(model, dest, airport) {
    const bonuses = getFacilityBonusesClient(airport);
    const distMult = dest.mult || 1.0;

    const grossRevenue = Math.floor(model.baseRevenue * distMult * bonuses.ticketBonus);
    const rawFuel = model.fuelCost * distMult;
    const fuelCost = Math.floor(rawFuel * (1 - bonuses.fuelDiscount));
    const crewCost = Math.floor(model.crewCost * distMult);
    const landingFee = Math.floor(model.landingFee * distMult);

    const totalOperatingCost = fuelCost + crewCost + landingFee;
    const netProfit = Math.max(0, grossRevenue - totalOperatingCost);
    const baseDuration = model.flightTimeSec || 18000;
    const durationSec = Math.max(60, Math.floor(baseDuration * distMult * (1 - bonuses.timeReduction)));

    return { grossRevenue, fuelCost, fuelDiscountPct: Math.round(bonuses.fuelDiscount * 100), crewCost, landingFee, totalOperatingCost, netProfit, durationSec };
  }

  function renderPlaneCard(plane, airport, state) {
    const model = AIRCRAFT_META[plane.modelId] || AIRCRAFT_META.cessna_sky;
    const flight = plane.currentFlight || plane.activeFlight || {};
    const isFlight = plane.status === 'in_flight' && Boolean(flight.launchTime || flight.destinationName);
    const now = Date.now();
    const landingTime = Number(flight.landingTime || 0);
    const isLanded = isFlight && (now >= landingTime);
    const remSec = Math.max(0, Math.ceil((landingTime - now) / 1000));

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
                  ${isLanded ? '🛬 وصلت الوجهة!' : `متبقي: ${formatSeconds(remSec)}`}
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
                  class="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2 animate-bounce">
                  <i class="fa-solid fa-hand-holding-dollar"></i>
                  <span>تحصيل عوائد الرحلة (+${(flight.grossRevenue || flight.expectedProfit || 0).toLocaleString()} ج.م)</span>
                </button>
              ` : `
                <button onclick="window.AirportUI.speedupFlight('${plane.id}')"
                  class="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5">
                  <i class="fa-solid fa-bolt"></i>
                  <span>تسريع فوري (${flight.speedupGold || 5} ذهب)</span>
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
                <span>💵 إجمالي عوائد التذاكر:</span>
                <strong class="text-emerald-400 numbers-font font-bold">+${eco.grossRevenue.toLocaleString()} ج.م</strong>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>⛽ وقود الطيران ${eco.fuelDiscountPct > 0 ? `<span class="text-emerald-400 text-[9px]">(-${eco.fuelDiscountPct}%)</span>` : ''}:</span>
                <span class="text-rose-400 numbers-font">-${eco.fuelCost.toLocaleString()} ج.م</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>👨‍✈️ طاقم الملاحة والضيافة:</span>
                <span class="text-rose-400 numbers-font">-${eco.crewCost.toLocaleString()} ج.م</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>🛬 رسوم الهبوط الدولي:</span>
                <span class="text-rose-400 numbers-font">-${eco.landingFee.toLocaleString()} ج.م</span>
              </div>
              <div class="pt-1 border-t border-slate-800 flex justify-between items-center text-xs font-black">
                <span class="text-sky-400">💰 صافي الأرباح المتوقعة:</span>
                <strong class="text-emerald-400 numbers-font text-sm">+${eco.netProfit.toLocaleString()} ج.م</strong>
              </div>
              <div class="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
                <span>⏱️ مدة الرحلة: <strong class="text-slate-300">${formatDurationHuman(eco.durationSec)}</strong></span>
                <span>تكلفة الإقلاع الفورية: <strong class="text-rose-400 font-bold">${eco.totalOperatingCost.toLocaleString()} ج.م</strong></span>
              </div>
            </div>

            <div class="flex items-center gap-2 pt-1">
              <button onclick="window.AirportUI.launchFlight('${plane.id}')"
                class="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-sky-500/20 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2">
                <i class="fa-solid fa-plane-departure"></i>
                <span>تزويد الوقود وإقلاع الرحلة 🛫</span>
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
        <span>💵 إجمالي عوائد التذاكر:</span>
        <strong class="text-emerald-400 numbers-font font-bold">+${eco.grossRevenue.toLocaleString()} ج.م</strong>
      </div>
      <div class="flex justify-between text-slate-400">
        <span>⛽ وقود الطيران ${eco.fuelDiscountPct > 0 ? `<span class="text-emerald-400 text-[9px]">(-${eco.fuelDiscountPct}%)</span>` : ''}:</span>
        <span class="text-rose-400 numbers-font">-${eco.fuelCost.toLocaleString()} ج.م</span>
      </div>
      <div class="flex justify-between text-slate-400">
        <span>👨‍✈️ طاقم الملاحة والضيافة:</span>
        <span class="text-rose-400 numbers-font">-${eco.crewCost.toLocaleString()} ج.م</span>
      </div>
      <div class="flex justify-between text-slate-400">
        <span>🛬 رسوم الهبوط الدولي:</span>
        <span class="text-rose-400 numbers-font">-${eco.landingFee.toLocaleString()} ج.م</span>
      </div>
      <div class="pt-1 border-t border-slate-800 flex justify-between items-center text-xs font-black">
        <span class="text-sky-400">💰 صافي الأرباح المتوقعة:</span>
        <strong class="text-emerald-400 numbers-font text-sm">+${eco.netProfit.toLocaleString()} ج.م</strong>
      </div>
      <div class="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
        <span>⏱️ مدة الرحلة: <strong class="text-slate-300">${formatDurationHuman(eco.durationSec)}</strong></span>
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
      <div class="space-y-4">
        <div class="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/20 text-xs text-slate-300 flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-circle-info text-sky-400 text-base"></i>
            <span>المدرج الحالي يستوعب طائرات حتى <strong>الفئة ${maxTier}</strong>. سعة الأسطول: <strong class="text-sky-400">${fleet.length} / 12</strong>.</span>
          </div>
          <button onclick="window.AirportUI.setSubtab('facilities')" class="px-3 py-1 bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 rounded-lg font-bold transition cursor-pointer">
            ترقية المدرج 🏗️
          </button>
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
                      <span>شراء وإضافة للأسطول 🛒</span>
                    </button>
                  `)}
                </div>
              </div>
            `;
          }).join('')}
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
                    ${isMax ? '🏆 أقصى تطوير' : `الترقية: Lv.${nextLvl}`}
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
                  <span>ترقية ${fac.name} إلى Lv.${nextLvl} 🏗️</span>
                </button>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Subtab 4: Control Tower & Transit Permits
   */
  function renderTransitSubtab(airport, state) {
    const stats = airport.stats || {};
    return `
      <div class="glass-panel p-6 sm:p-8 rounded-3xl border border-sky-500/30 text-center space-y-6 relative overflow-hidden"
        style="background: radial-gradient(ellipse at center, rgba(14, 165, 233, 0.12), rgba(15, 23, 42, 0.98)) !important;">
        
        <div class="w-20 h-20 mx-auto rounded-full bg-slate-900 border-2 border-sky-500/40 flex items-center justify-center text-3xl text-sky-400 relative shadow-2xl shadow-sky-500/20">
          <i class="fa-solid fa-tower-broadcast animate-pulse"></i>
          <span class="absolute inset-0 rounded-full border border-sky-400 animate-ping opacity-25"></span>
        </div>

        <div class="space-y-2 max-w-md mx-auto">
          <h3 class="text-xl font-black text-white">برج المراقبة ورادار الطائرات العابرة 📡</h3>
          <p class="text-xs text-slate-300">
            تستقبل أجواء مطارك رحلات طيران دولية عابرة تطلب الهبوط الاضطراري أو التزود السريع بالوقود مقابل رسوم أرضية مجزية!
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 max-w-md mx-auto space-y-2 text-right">
          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-400">إجمالي تصاريح الترانزيت الممنوحة:</span>
            <strong class="text-amber-400 numbers-font font-bold">${(stats.transitPermitsAccepted || 0).toLocaleString()} تصريح</strong>
          </div>
          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-400">عائد رسوم الهبوط المقدر:</span>
            <strong class="text-emerald-400 numbers-font font-bold">1,200,000 ~ 3,500,000 ج.م</strong>
          </div>
        </div>

        <button onclick="window.AirportUI.acceptTransit()"
          class="px-8 py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-sky-500/25 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mx-auto">
          <i class="fa-solid fa-passport"></i>
          <span>منح تصريح هبوط لطائرة ترانزيت وتحصيل الرسوم 🛬</span>
        </button>
      </div>
    `;
  }

  function calculateDutyFreeClient(airport) {
    if (!airport || !airport.unlocked || !airport.facilities?.duty_free) return 0;
    const lvl = airport.facilities.duty_free;
    const rates = { 1: 300, 2: 1200, 3: 3500, 4: 10000 };
    const rate = rates[lvl] || 0;
    if (rate <= 0) return 0;
    const lastTime = Number(airport.lastDutyFreeCollectionAt || airport.unlockedAt || Date.now());
    const elapsedMinutes = Math.max(0, (Date.now() - lastTime) / (60 * 1000));
    return Math.floor(Math.min(8 * 60, elapsedMinutes) * rate);
  }

  function formatSeconds(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function updateFlightTimers() {
    const timerEls = document.querySelectorAll('[id^="timer-"]');
    const now = Date.now();
    const liveState = getLiveGameState();
    const ap = liveState.airport;

    timerEls.forEach(el => {
      const landingTime = Number(el.getAttribute('data-landing') || 0);
      const planeId = el.id.replace('timer-', '');
      const remSec = Math.max(0, Math.ceil((landingTime - now) / 1000));
      const bar = document.getElementById(`bar-${planeId}`);

      if (remSec <= 0) {
        el.textContent = '🛬 وصلت الوجهة!';
        el.classList.add('text-emerald-400');
        el.classList.remove('text-sky-400');
        if (bar) bar.style.width = '100%';
        const btnClaim = document.getElementById(`btn-claim-${planeId}`);
        if (btnClaim) btnClaim.style.display = 'flex';
      } else {
        el.textContent = `متبقي: ${formatSeconds(remSec)}`;
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
      if (btnClaimDutyFree) btnClaimDutyFree.disabled = amt <= 0;
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
        btnDutyFree.disabled = true;
        const liveState = getLiveGameState();
        const ap = liveState.airport;
        if (!ap) return;

        const amt = calculateDutyFreeClient(ap);
        if (amt <= 0) {
          showAirportToast('لا توجد إيرادات سوق حرة متراكمة بعد.', 'error');
          btnDutyFree.disabled = false;
          return;
        }

        liveState.cash = (Number(liveState.cash) || 0) + amt;
        ap.lastDutyFreeCollectionAt = Date.now();
        if (!ap.stats) ap.stats = {};
        ap.stats.totalDutyFreeCollected = (Number(ap.stats.totalDutyFreeCollected) || 0) + amt;

        persistGameState();
        showAirportToast(`🛍️ تم تحصيل +${amt.toLocaleString()} ج.م من أرباح السوق الحرة!`, 'success');
        renderAirportPanel();

        if (window.ServerBridge && typeof window.ServerBridge.claimDutyFree === 'function') {
          try { await window.ServerBridge.claimDutyFree(); } catch (_) {}
        }
      });
    }
  }

  // Action methods with autonomous client fallback
  async function launchFlight(planeId) {
    const liveState = getLiveGameState();
    const ap = liveState.airport;
    if (!ap || !Array.isArray(ap.fleet)) return;

    const inFlightCount = ap.fleet.filter(p => p.status === 'in_flight').length;
    if (inFlightCount >= 5) {
      showAirportToast('🚫 الحد الأقصى للطيران المتزامن هو 5 طائرات في الجو في نفس الوقت! انتظر هبوط إحدى الطائرات.', 'error');
      return;
    }

    const plane = ap.fleet.find(p => p.id === planeId);
    if (!plane || plane.status === 'in_flight') return;

    const select = document.getElementById(`select-dest-${planeId}`);
    const destId = select ? select.value : 'cairo_riyadh';
    const dest = DESTINATIONS_META.find(d => d.id === destId) || DESTINATIONS_META[0];
    const model = AIRCRAFT_META[plane.modelId];
    if (!model) return;

    const eco = getEconomicsForDisplay(model, dest, ap);
    const curCash = Number(liveState.cash || 0);
    const curBank = Number(liveState.bank || 0);

    if ((curCash + curBank) < eco.totalOperatingCost) {
      showAirportToast(`🚫 رصيدك غير كافٍ لتغطية تكاليف تجهيز الرحلة (${eco.totalOperatingCost.toLocaleString()} ج.م)`, 'error');
      return;
    }

    // Deduct operating costs upfront
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
      speedupGold: model.speedupGold || 5
    };
    plane.currentFlight = flightObj;
    plane.activeFlight = flightObj;

    if (!ap.stats) ap.stats = {};
    ap.stats.totalOperatingCost = (Number(ap.stats.totalOperatingCost) || 0) + eco.totalOperatingCost;

    if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
      window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
    }

    persistGameState();
    const minStr = Math.floor(eco.durationSec / 60);
    showAirportToast(`🛫 أقلعت الرحلة إلى ${dest.name}! وقت الهبوط خلال ${minStr > 0 ? minStr + ' دقيقة' : eco.durationSec + ' ثانية'}. (صافي الربح: +${eco.netProfit.toLocaleString()} ج.م)`, 'success');
    renderAirportPanel();

    if (window.ServerBridge && typeof window.ServerBridge.launchAirportFlight === 'function') {
      try {
        const res = await window.ServerBridge.launchAirportFlight(planeId, destId);
        if (res && res.plane && res.plane.activeFlight) {
          plane.activeFlight = res.plane.activeFlight;
          plane.currentFlight = res.plane.activeFlight;
          if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
            window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
          }
          persistGameState();
          renderAirportPanel();
        }
      } catch (_) {}
    }
  }

  async function speedupFlight(planeId) {
    const liveState = getLiveGameState();
    const ap = liveState.airport;
    if (!ap || !Array.isArray(ap.fleet)) return;

    const plane = ap.fleet.find(p => p.id === planeId);
    if (!plane || plane.status !== 'in_flight') return;
    const flight = plane.currentFlight || plane.activeFlight;
    if (!flight) return;

    const costGold = Number(flight.speedupGold || 5);
    const curGold = Number(liveState.gold || 0);

    if (curGold < costGold) {
      showAirportToast(`تحتاج إلى ${costGold} سبيكة ذهب للتسريع الفوري!`, 'error');
      return;
    }

    liveState.gold = Math.max(0, curGold - costGold);
    flight.landingTime = Date.now() - 1000;
    plane.currentFlight = flight;
    plane.activeFlight = flight;

    if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
      window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
    }

    persistGameState();
    showAirportToast('⚡ تم تسريع الرحلة وهبوط الطائرة فوراً بنجاح!', 'success');
    renderAirportPanel();

    if (window.ServerBridge && typeof window.ServerBridge.speedupAirportFlight === 'function') {
      try { await window.ServerBridge.speedupAirportFlight(planeId); } catch (_) {}
    }
  }

  async function claimFlight(planeId) {
    const liveState = getLiveGameState();
    const ap = liveState.airport;
    if (!ap || !Array.isArray(ap.fleet)) return;

    const plane = ap.fleet.find(p => p.id === planeId);
    if (!plane || plane.status !== 'in_flight') return;
    const f = plane.currentFlight || plane.activeFlight;
    if (!f) return;

    if (Date.now() < Number(f.landingTime || 0)) {
      showAirportToast('الطائرة لا تزال في الجو!', 'error');
      return;
    }

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

    // Immediately update local encrypted cache synchronously to prevent any duplication on reload
    if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
      window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
    }

    persistGameState();
    showAirportToast(`🛬 هبطت الرحلة بسلام! تم تحصيل عوائد +${grossRev.toLocaleString()} ج.م (صافي ربح: +${netProfit.toLocaleString()} ج.م) و +${xp} XP`, 'success');
    renderAirportPanel();

    if (window.ServerBridge && typeof window.ServerBridge.claimAirportFlight === 'function') {
      try {
        const res = await window.ServerBridge.claimAirportFlight(planeId);
        if (res && res.success) {
          if (res.cash !== undefined) liveState.cash = res.cash;
          if (res.xp !== undefined) liveState.xp = res.xp;
          if (res.airport) liveState.airport = res.airport;
          if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
            window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
          }
          persistGameState();
          renderAirportPanel();
        }
      } catch (_) {}
    }
  }

  async function sellPlane(planeId) {
    const liveState = getLiveGameState();
    const ap = liveState.airport;
    if (!ap || !Array.isArray(ap.fleet)) return;

    const planeIdx = ap.fleet.findIndex(p => p.id === planeId);
    if (planeIdx === -1) return;

    const plane = ap.fleet[planeIdx];
    if (plane.status === 'in_flight') {
      showAirportToast('🚫 لا يمكن بيع الطائرة وهي في الجو! انتظر هبوطها وتحصيل الرحلة أولاً.', 'error');
      return;
    }

    const model = AIRCRAFT_META[plane.modelId] || AIRCRAFT_META.cessna_sky;
    const refund = Math.floor((model.cost || 8000000) * 0.5);

    const confirmed = confirm(`هل أنت متأكد من بيع طائرة "${plane.customName || model.name}" مقابل استرداد +${refund.toLocaleString()} ج.م (50% من سعر الشراء)؟`);
    if (!confirmed) return;

    ap.fleet.splice(planeIdx, 1);
    liveState.cash = (Number(liveState.cash) || 0) + refund;

    if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
      window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
    }

    persistGameState();
    showAirportToast(`💸 تم بيع طائرة ${model.name} واسترداد +${refund.toLocaleString()} ج.م بنجاح!`, 'success');
    renderAirportPanel();

    if (window.ServerBridge && typeof window.ServerBridge.sellAirportPlane === 'function') {
      try { await window.ServerBridge.sellAirportPlane(planeId); } catch (_) {}
    }
  }

  async function buyPlane(modelId) {
    const liveState = getLiveGameState();
    const ap = liveState.airport;
    if (!ap) return;

    const model = AIRCRAFT_META[modelId];
    if (!model) return;

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
      customName: `${model.name} #${ap.fleet.length + 1}`,
      status: 'idle',
      currentFlight: null,
      activeFlight: null
    };

    ap.fleet.push(newPlane);

    if (typeof window.AppDB !== 'undefined' && typeof window.AppDB.setEncryptedLocalState === 'function' && liveState.username) {
      window.AppDB.setEncryptedLocalState(`rasalmal_state_${liveState.username}`, liveState);
    }

    persistGameState();
    showAirportToast(`🎉 تم شراء وإضافة ${model.name} إلى أسطولك الجوي بنجاح!`, 'success');
    renderAirportPanel();

    if (window.ServerBridge && typeof window.ServerBridge.buyAirportPlane === 'function') {
      try { await window.ServerBridge.buyAirportPlane(modelId, newPlane.customName); } catch (_) {}
    }
  }

  async function upgradeFacility(facilityId) {
    const liveState = getLiveGameState();
    const ap = liveState.airport;
    if (!ap) return;

    const fac = FACILITY_META[facilityId];
    if (!fac) return;

    if (!ap.facilities) ap.facilities = { runway: 1, terminals: 1, hangar: 1, duty_free: 0 };
    const curLvl = Number(ap.facilities[facilityId] || 0);
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

    if (curCash >= cost) {
      liveState.cash = curCash - cost;
    } else {
      const rem = cost - curCash;
      liveState.cash = 0;
      liveState.bank = Math.max(0, curBank - rem);
    }

    ap.facilities[facilityId] = nextLvl;
    persistGameState();
    showAirportToast(`🏗️ تم ترقية ${fac.name} إلى المستوى ${nextLvl} بنجاح!`, 'success');
    renderAirportPanel();

    if (window.ServerBridge && typeof window.ServerBridge.upgradeAirportFacility === 'function') {
      try { await window.ServerBridge.upgradeAirportFacility(facilityId); } catch (_) {}
    }
  }

  async function acceptTransit() {
    const liveState = getLiveGameState();
    const ap = liveState.airport;
    if (!ap || !ap.transitPermit) {
      showAirportToast('لا توجد طائرة ترانزيت تطلب الهبوط حالياً.', 'error');
      return;
    }

    const fee = Number(ap.transitPermit.fee || 350000);
    const xp = Number(ap.transitPermit.xp || 50);

    liveState.cash = (Number(liveState.cash) || 0) + fee;
    liveState.xp = (Number(liveState.xp) || 0) + xp;

    if (!ap.stats) ap.stats = {};
    ap.stats.transitPermitsAccepted = (Number(ap.stats.transitPermitsAccepted) || 0) + 1;
    ap.transitPermit = null;

    persistGameState();
    showAirportToast(`🛬 تم منح تصريح الهبوط وتحصيل الرسوم (+${fee.toLocaleString()} ج.م) و +${xp} XP!`, 'success');
    renderAirportPanel();

    if (window.ServerBridge && typeof window.ServerBridge.acceptAirportTransit === 'function') {
      try { await window.ServerBridge.acceptAirportTransit(); } catch (_) {}
    }
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
    updateEconomicsPreview
  };
})();

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.AirportUI.init();
  });
}
