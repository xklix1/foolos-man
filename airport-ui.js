/**
 * Ras ALmal Tycoon — International Airport Hub Frontend Engine
 * 100% Server-Authoritative UI & Real-Time Flight Visualizer
 */

window.AirportUI = (() => {
  let _activeSubtab = 'flights'; // 'flights' | 'fleet' | 'facilities' | 'transit'
  let _flightTickerTimer = null;

  const FACILITY_META = {
    runway: {
      name: 'مدرج الطائرات الرئيسي 🛫',
      icon: 'fa-road text-sky-400',
      levels: {
        1: { name: 'مدرج إقليمي معبد', cost: 0, desc: 'يستوعب طائرات الفئة 1 (Cessna)' },
        2: { name: 'مدرج دولي عريض', cost: 35000000, desc: 'يستوعب طائرات الفئة 2 (Airbus A320)' },
        3: { name: 'مدرج عابر للقارات متطور', cost: 120000000, desc: 'يستوعب طائرات الفئة 3 (Boeing 777 / A380)' },
        4: { name: 'مجمع مدارج ذكي CAT III', cost: 450000000, desc: 'يستوعب طائرات الفئة 4 (Gulfstream VIP / Beluga Cargo)' }
      }
    },
    terminals: {
      name: 'صالات الركاب الدولية 🏢',
      icon: 'fa-building-columns text-amber-400',
      levels: {
        1: { name: 'صالة ركاب أساسية', cost: 0, desc: 'رسوم تذاكر قياسية' },
        2: { name: 'مبنى صالات دولي حديث', cost: 25000000, desc: '+35% أرباح تذاكر الرحلات' },
        3: { name: 'صالة كبار الشخصيات والدرجة الأولى VIP', cost: 95000000, desc: '+75% أرباح تذاكر + بونص XP' },
        4: { name: 'مدينة مطار عالمية متكاملة', cost: 350000000, desc: '+130% أرباح تذاكر مضاعفة' }
      }
    },
    hangar: {
      name: 'حوض الصيانة والتزود بالوقود 🛠️',
      icon: 'fa-wrench text-emerald-400',
      levels: {
        1: { name: 'مرآب صيانة يدوي', cost: 0, desc: 'زمن رحلات قياسي' },
        2: { name: 'حوض فحص وصيانة دورية سريع', cost: 20000000, desc: 'تقليص زمن الرحلات بنسبة 15%' },
        3: { name: 'مركز نفاثات وتزويد وقود توربيني', cost: 80000000, desc: 'تقليص زمن الرحلات بنسبة 30%' },
        4: { name: 'روبوتات صيانة ومستودع وقود استراتيجي', cost: 280000000, desc: 'تقليص زمن الرحلات بنسبة 45%' }
      }
    },
    duty_free: {
      name: 'السوق الحرة ومتاجر الترانزيت 🛍️',
      icon: 'fa-store text-fuchsia-400',
      levels: {
        1: { name: 'أكشاك هدايا وتذكارات', cost: 15000000, desc: 'دخل سلبي: 2,500 ج.م/دقيقة' },
        2: { name: 'مجمع عطور وساعات سويسرية', cost: 55000000, desc: 'دخل سلبي: 12,000 ج.م/دقيقة' },
        3: { name: 'مول ماركات عالمية وأزياء راقية', cost: 160000000, desc: 'دخل سلبي: 45,000 ج.م/دقيقة' },
        4: { name: 'صالة مزادات مجوهرات وسيارات VIP', cost: 500000000, desc: 'دخل سلبي: 150,000 ج.م/دقيقة' }
      }
    }
  };

  const AIRCRAFT_META = {
    cessna_sky: {
      id: 'cessna_sky',
      name: 'Cessna Sky Courier 🛩️',
      tier: 1,
      cost: 5000000,
      capacity: 'VIP (8 مقاعد)',
      flightTimeSec: 60,
      profit: 450000,
      xp: 40,
      speedupGold: 2,
      desc: 'طائرة خفيفة للمسافات الإقليمية السريعة والرحلات السريعة'
    },
    airbus_a320: {
      id: 'airbus_a320',
      name: 'Airbus A320neo ✈️',
      tier: 2,
      cost: 28000000,
      capacity: '180 مسافر',
      flightTimeSec: 180,
      profit: 2200000,
      xp: 180,
      speedupGold: 5,
      desc: 'طائرة ركاب دولية عالية الكفاءة للمسافات المتوسطة'
    },
    boeing_777: {
      id: 'boeing_777',
      name: 'Boeing 777-300ER 🌐',
      tier: 3,
      cost: 85000000,
      capacity: '390 مسافر',
      flightTimeSec: 360,
      profit: 6800000,
      xp: 550,
      speedupGold: 10,
      desc: 'طائر عملاق عابر للقارات للرحلات الدولية الطويلة'
    },
    airbus_a380: {
      id: 'airbus_a380',
      name: 'Airbus A380 Superjumbo 🏰✈️',
      tier: 3,
      cost: 220000000,
      capacity: '615 مسافر (طابقين)',
      flightTimeSec: 600,
      profit: 18500000,
      xp: 1500,
      speedupGold: 18,
      desc: 'أضخم طائرة ركاب في العالم.. قلعة طائرة تدر أرباحاً قياسية'
    },
    gulfstream_g650: {
      id: 'gulfstream_g650',
      name: 'Gulfstream G650 VIP 👑🛩️',
      tier: 4,
      cost: 140000000,
      capacity: 'مليونيرات ونخبة VIP',
      flightTimeSec: 240,
      profit: 12000000,
      xp: 1100,
      speedupGold: 12,
      desc: 'طائرة نفاثة فاخرة خاصة برجال الأعمال والأمراء'
    },
    cargo_beluga: {
      id: 'cargo_beluga',
      name: 'Airbus BelugaXL Cargo 📦✈️',
      tier: 4,
      cost: 180000000,
      capacity: '50 طن شحن ثقيل',
      flightTimeSec: 300,
      profit: 15000000,
      xp: 1300,
      speedupGold: 15,
      desc: 'وحش الشحن الجوي العملاق لنقل البضائع والمعدات فائقة الحجم'
    }
  };

  const DESTINATIONS_META = [
    { id: 'cairo_riyadh', name: 'الرياض 🇸🇦', mult: 1.0, tier: 1 },
    { id: 'cairo_dubai', name: 'دبي 🇦🇪', mult: 1.2, tier: 1 },
    { id: 'cairo_istanbul', name: 'إسطنبول 🇹🇷', mult: 1.4, tier: 2 },
    { id: 'cairo_london', name: 'لندن 🇬🇧', mult: 1.8, tier: 2 },
    { id: 'cairo_paris', name: 'باريس 🇫🇷', mult: 2.0, tier: 2 },
    { id: 'cairo_newyork', name: 'نيويورك 🇺🇸', mult: 2.8, tier: 3 },
    { id: 'cairo_tokyo', name: 'طوكيو 🇯🇵', mult: 3.2, tier: 3 }
  ];

  function init() {
    // Start continuous ticker for flight countdowns
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
    const cost = 50000000;
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

        <!-- License Form Inputs (Dynamic Key & Airport Custom Name) -->
        <div class="max-w-md mx-auto space-y-4 p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-slate-800 relative z-10 text-right">
          <div class="space-y-1.5">
            <label class="block text-xs font-black text-sky-400 flex items-center gap-1.5">
              <i class="fa-solid fa-key text-[11px]"></i>
              <span>كود تصريح الطيران الأمني (Security License Code):</span>
            </label>
            <input type="text" id="airport-unlock-code-input" placeholder="اكتب كود تصريح الطيران هنا..."
              class="w-full px-4 py-3 bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl text-center text-sm font-bold text-white uppercase tracking-widest placeholder:normal-case placeholder:text-slate-600 outline-none transition shadow-inner">
            <p class="text-[10px] text-slate-400 leading-tight">
              * يتم الحصول على كود التصريح من إدارة اللعبة أو الفعاليات الخاصة.
            </p>
          </div>

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
            <i class="fa-solid fa-passport"></i>
            <span>تفعيل رخصة المطار وتدشين الأسطول الجوي 🛫</span>
          </button>
        </div>
      </div>
    `;

    // Bind unlock button
    const btnUnlock = document.getElementById('btn-airport-submit-unlock');
    if (btnUnlock) {
      btnUnlock.addEventListener('click', async () => {
        const codeInput = document.getElementById('airport-unlock-code-input');
        const nameInput = document.getElementById('airport-custom-name-input');
        const code = (codeInput?.value || '').trim();
        const airportName = (nameInput?.value || '').trim();

        if (!code) {
          if (window.UI && window.UI.showToast) window.UI.showToast('يرجى كتابة كود تصريح الطيران أولاً!', 'error');
          return;
        }

        btnUnlock.disabled = true;
        btnUnlock.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق من السيرفر وإصدار الرخصة...';

        try {
          const res = await window.ServerBridge.unlockAirport(code, airportName);
          if (res && res.success) {
            if (window.UI && window.UI.showToast) window.UI.showToast(res.message || 'تم تدشين المطار بنجاح!', 'success');
            if (window.GameEngine && window.GameEngine.state) {
              window.GameEngine.state.airport = res.airport;
              window.GameEngine.state.cash = res.cash;
              window.GameEngine.state.bank = res.bank;
              window.GameEngine.state.netWorth = res.netWorth;
              if (window.renderHeader) window.renderHeader();
            }
            renderAirportPanel();
          }
        } catch (err) {
          if (window.UI && window.UI.showToast) window.UI.showToast(err.message || 'فشل تفعيل المطار', 'error');
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
    const facilities = airport.facilities || {};
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
              الأسطول الجوي: <strong class="text-sky-400 numbers-font font-bold">${fleet.length} طائرات</strong> | 
              إجمالي الرحلات: <strong class="text-amber-400 numbers-font font-bold">${(stats.totalFlights || 0).toLocaleString()}</strong> | 
              أرباح الطيران: <strong class="text-emerald-400 numbers-font font-bold">${(stats.totalRevenue || 0).toLocaleString()} ج.م</strong>
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
          <p class="text-xs text-slate-400 max-w-sm mx-auto">توجه إلى قسم "متجر وحظيرة الطائرات" لشراء أول طائرة وتدشين رحلاتك الدولية.</p>
          <button onclick="window.AirportUI.setSubtab('fleet')" class="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer">
            شراء طائرة جديدة 🛒
          </button>
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        ${fleet.map(plane => renderPlaneCard(plane, airport, state)).join('')}
      </div>
    `;
  }

  function renderPlaneCard(plane, airport, state) {
    const model = AIRCRAFT_META[plane.modelId] || AIRCRAFT_META.cessna_sky;
    const isFlight = plane.status === 'in_flight' && plane.activeFlight;
    const flight = plane.activeFlight || {};
    const now = Date.now();
    const landingTime = Number(flight.landingTime || 0);
    const isLanded = isFlight && (now >= landingTime);
    const remSec = Math.max(0, Math.ceil((landingTime - now) / 1000));

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
              <span class="text-slate-400">الوجهة: <strong class="text-white">${flight.destinationName}</strong></span>
              <span class="text-slate-400">العائد: <strong class="text-emerald-400 numbers-font font-bold">+${(flight.expectedProfit || 0).toLocaleString()} ج.م</strong></span>
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
                  <span>تحصيل أرباح الرحلة (${(flight.expectedProfit || 0).toLocaleString()} ج.م)</span>
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
          <!-- Idle Schedule State -->
          <div class="space-y-3 pt-2">
            <div class="space-y-1">
              <label class="block text-[11px] font-bold text-slate-400">اختر مسار ووجهة السفر:</label>
              <select id="select-dest-${plane.id}"
                class="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-sky-500 transition">
                ${DESTINATIONS_META.filter(d => model.tier >= d.tier).map(d => {
                  const estProfit = Math.round(model.profit * d.mult);
                  return `<option value="${d.id}">${d.name} • (أرباح متوقعة: +${estProfit.toLocaleString()} ج.م)</option>`;
                }).join('')}
              </select>
            </div>

            <button onclick="window.AirportUI.launchFlight('${plane.id}')"
              class="w-full py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-sky-500/20 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2">
              <i class="fa-solid fa-plane-departure"></i>
              <span>إقلاع الرحلة 🛫</span>
            </button>
          </div>
        `}
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

    return `
      <div class="space-y-4">
        <div class="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/20 text-xs text-slate-300 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-circle-info text-sky-400 text-base"></i>
            <span>المدرج الحالي يستوعب طائرات حتى <strong>الفئة ${maxTier}</strong>. لفتح طائرات أضخم قم بترقية المدرج.</span>
          </div>
          <button onclick="window.AirportUI.setSubtab('facilities')" class="px-3 py-1 bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 rounded-lg font-bold transition">
            ترقية المدرج 🏗️
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          ${Object.keys(AIRCRAFT_META).map(k => {
            const m = AIRCRAFT_META[k];
            const isUnlockedTier = maxTier >= m.tier;
            const canAfford = totalFunds >= m.cost;

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
                      <span>الربح الأساسي:</span>
                      <strong class="text-emerald-400 numbers-font font-bold">+${m.profit.toLocaleString()} ج.م</strong>
                    </div>
                    <div class="flex justify-between text-slate-400">
                      <span>زمن الرحلة:</span>
                      <strong class="text-sky-400 numbers-font font-bold">${m.flightTimeSec} ثانية</strong>
                    </div>
                  </div>
                </div>

                <div class="pt-3 space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="text-[11px] text-slate-400 font-bold">السعر:</span>
                    <span class="text-sm font-black text-amber-400 numbers-font">${m.cost.toLocaleString()} ج.م</span>
                  </div>

                  ${!isUnlockedTier ? `
                    <button disabled class="w-full py-2.5 bg-slate-800 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed">
                      <i class="fa-solid fa-lock text-[10px]"></i> يتطلب مدرج فئة ${m.tier}
                    </button>
                  ` : `
                    <button onclick="window.AirportUI.buyPlane('${m.id}')" ${!canAfford ? 'disabled' : ''}
                      class="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-1.5">
                      <i class="fa-solid fa-cart-shopping"></i>
                      <span>شراء وإضافة للأسطول 🛒</span>
                    </button>
                  `}
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
    const rates = { 1: 2500, 2: 12000, 3: 45000, 4: 150000 };
    const rate = rates[lvl] || 0;
    if (rate <= 0) return 0;
    const lastTime = Number(airport.lastDutyFreeCollectionAt || airport.unlockedAt || Date.now());
    const elapsedMinutes = Math.max(0, (Date.now() - lastTime) / (60 * 1000));
    return Math.floor(Math.min(8 * 60, elapsedMinutes) * rate);
  }

  function formatSeconds(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function updateFlightTimers() {
    const timerEls = document.querySelectorAll('[id^="timer-plane_"]');
    const now = Date.now();
    timerEls.forEach(el => {
      const landingTime = Number(el.getAttribute('data-landing') || 0);
      const planeId = el.id.replace('timer-', '');
      const remSec = Math.max(0, Math.ceil((landingTime - now) / 1000));
      if (remSec <= 0) {
        el.textContent = '🛬 وصلت الوجهة!';
        el.classList.add('text-emerald-400');
        el.classList.remove('text-sky-400');
        const btnClaim = document.getElementById(`btn-claim-${planeId}`);
        if (btnClaim) btnClaim.style.display = 'flex';
      } else {
        el.textContent = `متبقي: ${formatSeconds(remSec)}`;
      }
    });

    // Update duty free display live
    const state = (window.GameEngine && window.GameEngine.state) || {};
    const dutyFreeEl = document.getElementById('airport-duty-free-amount');
    const btnClaimDutyFree = document.getElementById('btn-claim-duty-free');
    if (dutyFreeEl && state.airport) {
      const amt = calculateDutyFreeClient(state.airport);
      dutyFreeEl.textContent = `+${amt.toLocaleString()} ج.م`;
      if (btnClaimDutyFree) btnClaimDutyFree.disabled = amt <= 0;
    }
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
        const curName = airport.name || 'مطار رأس المال الدولي';
        const newName = prompt('اكتب الاسم الجديد لمطارك:', curName);
        if (newName && newName.trim() && newName.trim() !== curName) {
          try {
            const res = await window.ServerBridge.renameAirport(newName.trim());
            if (res && res.success) {
              airport.name = res.name;
              if (window.UI && window.UI.showToast) window.UI.showToast('تم تعديل اسم المطار بنجاح!', 'success');
              renderAirportPanel();
            }
          } catch (e) {
            if (window.UI && window.UI.showToast) window.UI.showToast(e.message, 'error');
          }
        }
      });
    }

    // Duty Free Claim Button
    const btnDutyFree = document.getElementById('btn-claim-duty-free');
    if (btnDutyFree) {
      btnDutyFree.addEventListener('click', async () => {
        btnDutyFree.disabled = true;
        try {
          const res = await window.ServerBridge.claimDutyFree();
          if (res && res.success) {
            if (window.UI && window.UI.showToast) window.UI.showToast(res.message, 'success');
            if (window.GameEngine && window.GameEngine.state) {
              window.GameEngine.state.cash = res.cash;
              window.GameEngine.state.airport = res.airport;
              window.GameEngine.state.netWorth = res.netWorth;
              if (window.renderHeader) window.renderHeader();
            }
            renderAirportPanel();
          }
        } catch (e) {
          if (window.UI && window.UI.showToast) window.UI.showToast(e.message, 'error');
          btnDutyFree.disabled = false;
        }
      });
    }
  }

  // Action methods
  async function launchFlight(planeId) {
    const select = document.getElementById(`select-dest-${planeId}`);
    const destId = select ? select.value : 'cairo_riyadh';
    try {
      const res = await window.ServerBridge.launchAirportFlight(planeId, destId);
      if (res && res.success) {
        if (window.UI && window.UI.showToast) window.UI.showToast(res.message, 'success');
        if (window.GameEngine && window.GameEngine.state) {
          window.GameEngine.state.airport = res.airport;
        }
        renderAirportPanel();
      }
    } catch (e) {
      if (window.UI && window.UI.showToast) window.UI.showToast(e.message, 'error');
    }
  }

  async function speedupFlight(planeId) {
    try {
      const res = await window.ServerBridge.speedupAirportFlight(planeId);
      if (res && res.success) {
        if (window.UI && window.UI.showToast) window.UI.showToast(res.message, 'success');
        if (window.GameEngine && window.GameEngine.state) {
          window.GameEngine.state.gold = res.gold;
          window.GameEngine.state.airport = res.airport;
          if (window.renderHeader) window.renderHeader();
        }
        renderAirportPanel();
      }
    } catch (e) {
      if (window.UI && window.UI.showToast) window.UI.showToast(e.message, 'error');
    }
  }

  async function claimFlight(planeId) {
    try {
      const res = await window.ServerBridge.claimAirportFlight(planeId);
      if (res && res.success) {
        if (window.UI && window.UI.showToast) window.UI.showToast(res.message, 'success');
        if (window.GameEngine && window.GameEngine.state) {
          window.GameEngine.state.cash = res.cash;
          window.GameEngine.state.xp = res.xp;
          window.GameEngine.state.airport = res.airport;
          window.GameEngine.state.netWorth = res.netWorth;
          if (window.renderHeader) window.renderHeader();
        }
        renderAirportPanel();
      }
    } catch (e) {
      if (window.UI && window.UI.showToast) window.UI.showToast(e.message, 'error');
    }
  }

  async function buyPlane(modelId) {
    try {
      const res = await window.ServerBridge.buyAirportPlane(modelId);
      if (res && res.success) {
        if (window.UI && window.UI.showToast) window.UI.showToast(res.message, 'success');
        if (window.GameEngine && window.GameEngine.state) {
          window.GameEngine.state.cash = res.cash;
          window.GameEngine.state.bank = res.bank;
          window.GameEngine.state.airport = res.airport;
          window.GameEngine.state.netWorth = res.netWorth;
          if (window.renderHeader) window.renderHeader();
        }
        _activeSubtab = 'flights';
        renderAirportPanel();
      }
    } catch (e) {
      if (window.UI && window.UI.showToast) window.UI.showToast(e.message, 'error');
    }
  }

  async function upgradeFacility(facilityId) {
    try {
      const res = await window.ServerBridge.upgradeAirportFacility(facilityId);
      if (res && res.success) {
        if (window.UI && window.UI.showToast) window.UI.showToast(res.message, 'success');
        if (window.GameEngine && window.GameEngine.state) {
          window.GameEngine.state.cash = res.cash;
          window.GameEngine.state.bank = res.bank;
          window.GameEngine.state.airport = res.airport;
          window.GameEngine.state.netWorth = res.netWorth;
          if (window.renderHeader) window.renderHeader();
        }
        renderAirportPanel();
      }
    } catch (e) {
      if (window.UI && window.UI.showToast) window.UI.showToast(e.message, 'error');
    }
  }

  async function acceptTransit() {
    try {
      const res = await window.ServerBridge.acceptAirportTransit();
      if (res && res.success) {
        if (window.UI && window.UI.showToast) window.UI.showToast(res.message, 'success');
        if (window.GameEngine && window.GameEngine.state) {
          window.GameEngine.state.cash = res.cash;
          window.GameEngine.state.xp = res.xp;
          window.GameEngine.state.airport = res.airport;
          window.GameEngine.state.netWorth = res.netWorth;
          if (window.renderHeader) window.renderHeader();
        }
        renderAirportPanel();
      }
    } catch (e) {
      if (window.UI && window.UI.showToast) window.UI.showToast(e.message, 'error');
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
    upgradeFacility,
    acceptTransit
  };
})();

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.AirportUI.init();
  });
}
