  // Centralized Admin Listeners (Top-level scope)
  let adminCorpsUnsubscribe = null;
  let adminLiveAuctionsUnsubscribe = null;
  var _currentTopupPackagesCache = [];

  // Safe in-game renderAll fallback for admin panel terminal
  function renderAll() {
    if (typeof window.UIController !== 'undefined' && typeof window.UIController.renderAll === 'function') {
      window.UIController.renderAll();
    }
  }

  function setupAdminModal() {
    const triggerSide = document.getElementById('btn-admin-panel-trigger');
    const triggerMobile = document.getElementById('btn-admin-panel-trigger-mobile');
    const triggerFab = document.getElementById('btn-admin-panel-trigger-fab');
    const modal = document.getElementById('admin-panel-modal');
    const closeBtn = document.getElementById('btn-admin-modal-close');

    if (!modal) return;

    // Live Clock Interval in Admin Header
    setInterval(() => {
      const clockEl = document.getElementById('adm-live-clock');
      if (clockEl) {
        clockEl.textContent = new Date().toLocaleTimeString('ar-EG');
      }
    }, 1000);

    // Broadcast listener is handled by setupRealTimeListeners() to avoid duplicate toasts

    const openModal = () => {
      playMenuSound('modal_open');
      modal.classList.remove('hidden');
      switchAdminTab('stats');
    };

    if (triggerSide) triggerSide.addEventListener('click', openModal);
    if (triggerMobile) triggerMobile.addEventListener('click', openModal);
    if (triggerFab) triggerFab.addEventListener('click', openModal);

    // Close panel
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        cleanupAdminListeners();
      });
    }

    // Manual Refresh Button in Admin Header
    const manualRefreshBtn = document.getElementById('btn-admin-manual-refresh');
    if (manualRefreshBtn) {
      manualRefreshBtn.addEventListener('click', async () => {
        manualRefreshBtn.disabled = true;
        manualRefreshBtn.innerHTML ='<i class="fa-solid fa-spinner fa-spin"></i> <span>جاري التحديث...</span>';
        try {
          if (typeof loadAdminPlayersDirectory ==='function') {
            await loadAdminPlayersDirectory(true, true);
          }
          if (typeof showToast ==='function') {
            showToast('تحديث الإدارة','تم تحديث كافة بيانات لوحة التحكم بنجاح!','success');
          }
        } catch (e) {
          console.error('[Admin] Manual refresh error:', e);
        } finally {
          manualRefreshBtn.disabled = false;
          manualRefreshBtn.innerHTML ='<i class="fa-solid fa-rotate-right"></i> <span>تحديث البيانات</span>';
        }
      });
    }

    // Tabs logic - bind all subtabs
    const tabs = ['stats','players','transfers','chat','market','broadcast','auctions','giftcodes','system','corporations','topup'];
    tabs.forEach(t => {
      const tabEl = document.getElementById(`tab-admin-${t}`);
      if (tabEl) {
        tabEl.addEventListener('click', () => {
          switchAdminTab(t);
        });
      }
    });

    // Setup Telemetry Updates (Offline/No DB Reads)
    setInterval(() => {
      if (!modal.classList.contains('hidden')) {
        // CPU simulation
        const cpuEl = document.getElementById('adm-telemetry-cpu');
        if (cpuEl) {
          cpuEl.textContent = (0.5 + Math.random() * 2.3).toFixed(1) +'%';
        }
        
        // RAM simulation
        const ramEl = document.getElementById('adm-telemetry-ram');
        if (ramEl) {
          ramEl.textContent = Math.floor(40 + Math.random() * 12) +' MB';
        }
        
        // Latency simulation (No DB query to conserve read quota)
        const latencyEl = document.getElementById('adm-telemetry-latency');
        if (latencyEl) {
          latencyEl.textContent = Math.floor(18 + Math.random() * 14) +'ms';
        }
      }
    }, 5000);

    // Centralized Admin Listeners Management (Egress Zero-Leak)
    let _adminChatUnsub = null;

    function cleanupAdminListeners() {
      if (typeof _adminChatUnsub ==='function') {
        try { _adminChatUnsub(); } catch (e) {}
        _adminChatUnsub = null;
      }
      if (typeof adminCorpsUnsubscribe ==='function') {
        try { adminCorpsUnsubscribe(); } catch (e) {}
        adminCorpsUnsubscribe = null;
      }
      if (typeof adminLiveAuctionsUnsubscribe ==='function') {
        try { adminLiveAuctionsUnsubscribe(); } catch (e) {}
        adminLiveAuctionsUnsubscribe = null;
      }
    }
    window.cleanupAdminListeners = cleanupAdminListeners;
    if (typeof window !=='undefined') {
      window.addEventListener('beforeunload', cleanupAdminListeners);
    }

    // ─────────────────────────────────────────────
    //  MODULE: PLAYERS DIRECTORY & MANAGEMENT
    // ─────────────────────────────────────────────
    let cachedPlayers = [];
    let selectedPlayer = null;
    let selectedPlayerState = null;
    let activeFilter ='all';

    const searchInput = document.getElementById('admin-search-user');
    const searchBtn = document.getElementById('btn-admin-search');
    const refreshListBtn = document.getElementById('btn-admin-refresh-players-list');
    const playersTableBody = document.getElementById('admin-players-table-body');
    const resultCard = document.getElementById('admin-player-result');

    async function loadAdminPlayersDirectory(showToastNotice = false, forceRefresh = false) {
      if (!playersTableBody) return;
      playersTableBody.innerHTML ='<tr><td colspan="5" class="py-4 text-center text-slate-400">جاري فحص وتحديث بيانات اللاعبين...</td></tr>';
      try {
        cachedPlayers = await AppDB.adminGetAllPlayers(forceRefresh);
        renderPlayersTable();
        updateFilterCounts();
        if (showToastNotice) {
          const isCache = cachedPlayers.length > 0 && cachedPlayers.every(p => p.fromCache);
          const cacheMsg = isCache ?' (بيانات الكاش المحلي)' :' (مباشر من السيرفر )';
          showToast('قائمة اللاعبين',`تم جلب بيانات ${cachedPlayers.length} لاعب بنجاح${cacheMsg}.`,'success');
        }
      } catch (err) {
        playersTableBody.innerHTML =`<tr><td colspan="5" class="py-4 text-center text-rose-400">تعذر تحميل القائمة: ${err.message}</td></tr>`;
      }
    }

    function updateFilterCounts() {
      const countAll = cachedPlayers.length;
      const ONLINE_THRESHOLD = 2.5 * 60 * 1000; // 2.5 minutes (150 seconds)
      const now = Date.now();
      const countOnline = cachedPlayers.filter(p => {
        const lastActive = Number(p.lastActiveTimestamp || p.lastSeen || p.last_seen || 0);
        return lastActive > 0 && (now - lastActive) < ONLINE_THRESHOLD;
      }).length;
      const countJailed = cachedPlayers.filter(p => p.jailTimer > 0).length;
      const countBanned = cachedPlayers.filter(p => p.isBanned).length;

      const elAll = document.getElementById('adm-filter-count-all');
      const elOnline = document.getElementById('adm-filter-count-online');
      const elJailed = document.getElementById('adm-filter-count-jailed');
      const elBanned = document.getElementById('adm-filter-count-banned');
      const elTotal = document.getElementById('admin-players-total-label');
      const elHeaderOnline = document.getElementById('adm-header-online-count');
      const elStatOnline = document.getElementById('adm-stat-online');

      if (elAll) elAll.textContent = countAll;
      if (elOnline) elOnline.textContent = countOnline;
      if (elJailed) elJailed.textContent = countJailed;
      if (elBanned) elBanned.textContent = countBanned;
      if (elHeaderOnline) elHeaderOnline.textContent = countOnline;
      if (elStatOnline) elStatOnline.textContent = countOnline;
      
      const serverTotal = window._adminLastTotalPlayers;
      if (elTotal) {
        if (serverTotal && serverTotal > countAll) {
          elTotal.textContent = `${serverTotal} لاعب مسجل (${countAll} مفهرس)`;
        } else {
          elTotal.textContent = `${countAll} لاعب مسجل`;
        }
      }
    }

    function renderPlayersTable() {
      if (!playersTableBody) return;
      const rawQuery = (searchInput ? searchInput.value.trim() : '');
      const query = rawQuery.toLowerCase();
      const ONLINE_THRESHOLD = 2.5 * 60 * 1000;
      const now = Date.now();

      let filtered = cachedPlayers.filter(p => {
        const matchesQuery = !query || p.username.toLowerCase().includes(query) || (p.title && p.title.toLowerCase().includes(query));
        if (!matchesQuery) return false;

        if (activeFilter === 'online') {
          const lastActive = Number(p.lastActiveTimestamp || p.lastSeen || p.last_seen || 0);
          return lastActive > 0 && (now - lastActive) < ONLINE_THRESHOLD;
        }
        if (activeFilter === 'jailed') return p.jailTimer > 0;
        if (activeFilter === 'banned') return p.isBanned;
        return true;
      });

      // Dynamic sorting logic (Alphabetical, Wealth, Date, Cash)
      const sortSelect = document.getElementById('adm-players-sort-select');
      const sortVal = sortSelect ? sortSelect.value : 'netWorth_desc';

      if (sortSelect && !sortSelect._hasSortListener) {
        sortSelect._hasSortListener = true;
        sortSelect.addEventListener('change', () => {
          renderPlayersTable();
        });
      }

      filtered.sort((a, b) => {
        const nwA = Number(a.netWorth !== undefined && a.netWorth !== null ? a.netWorth : (a.net_worth || 0));
        const nwB = Number(b.netWorth !== undefined && b.netWorth !== null ? b.netWorth : (b.net_worth || 0));
        const cashA = Number(a.cash || 0);
        const cashB = Number(b.cash || 0);
        const timeA = Number(a.createdAt || a.created_at || a.lastSeen || a.last_seen || a.lastActiveTimestamp || 0);
        const timeB = Number(b.createdAt || b.created_at || b.lastSeen || b.last_seen || b.lastActiveTimestamp || 0);
        const nameA = String(a.username || '').toLowerCase();
        const nameB = String(b.username || '').toLowerCase();

        switch (sortVal) {
          case 'netWorth_desc':
            return nwB - nwA;
          case 'netWorth_asc':
            return nwA - nwB;
          case 'cash_desc':
            return cashB - cashA;
          case 'cash_asc':
            return cashA - cashB;
          case 'alpha_asc':
            return nameA.localeCompare(nameB, 'ar', { sensitivity: 'base' });
          case 'alpha_desc':
            return nameB.localeCompare(nameA, 'ar', { sensitivity: 'base' });
          case 'created_desc':
            return timeB - timeA;
          case 'created_asc':
            return timeA - timeB;
          default:
            return nwB - nwA;
        }
      });

      if (filtered.length === 0) {
        if (rawQuery) {
          const safeQ = escapeHtml(rawQuery);
          playersTableBody.innerHTML = `
            <tr>
              <td colspan="5" class="py-6 text-center space-y-2">
                <div class="text-slate-400 text-xs">لم يتم العثور على اللاعب "${safeQ}" في القائمة المفهرسة محلياً.</div>
                <button id="btn-admin-direct-cloud-lookup" class="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-lg text-xs transition inline-flex items-center gap-2 shadow-lg shadow-yellow-500/20">
                  <i class="fa-solid fa-cloud-arrow-down"></i>
                  <span>فحص وبحث مباشر بالاسم في السيرفر السحابي</span>
                </button>
              </td>
            </tr>`;
          const lookupBtn = document.getElementById('btn-admin-direct-cloud-lookup');
          if (lookupBtn) {
            lookupBtn.onclick = async () => {
              lookupBtn.disabled = true;
              lookupBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الاستعلام السحابي...';
              try {
                const fetchedDoc = await AppDB.adminGetPlayer(rawQuery);
                if (fetchedDoc) {
                  // Add to cached players if not present
                  const existingIdx = cachedPlayers.findIndex(p => p.username.toLowerCase() === rawQuery.toLowerCase());
                  const playerObj = {
                    username: fetchedDoc.username || rawQuery,
                    netWorth: Number(fetchedDoc.netWorth || 0),
                    cash: Number(fetchedDoc.cash || 0),
                    bank: Number(fetchedDoc.bank || 0),
                    title: fetchedDoc.title || 'عامل مبتدئ',
                    jobId: fetchedDoc.jobId || 'unemployed',
                    jailTimer: Number(fetchedDoc.jailTimer || 0),
                    isBanned: Boolean(fetchedDoc.isBanned),
                    isAdmin: Boolean(fetchedDoc.isAdmin),
                    createdAt: fetchedDoc.createdAt || 0,
                    lastSeen: fetchedDoc.lastSeen || fetchedDoc.last_seen || 0,
                    lastActiveTimestamp: fetchedDoc.lastActiveTimestamp || fetchedDoc.lastSeen || fetchedDoc.last_seen || 0,
                    raw: fetchedDoc
                  };
                  if (existingIdx >= 0) {
                    cachedPlayers[existingIdx] = playerObj;
                  } else {
                    cachedPlayers.unshift(playerObj);
                  }
                  renderPlayersTable();
                  updateFilterCounts();
                  selectPlayerForModeration(playerObj.username);
                  showToast('تم العثور على الحساب', `تم جلب ملف اللاعب ${playerObj.username} مباشرة من السيرفر!`, 'success');
                } else {
                  showToast('غير موجود', `اسم المستخدم "${rawQuery}" غير مسجل في خوادم اللعبة.`, 'warning');
                  lookupBtn.disabled = false;
                  lookupBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> غير مسجل بالسيرفر';
                }
              } catch (err) {
                showToast('خطأ استعلام', err.message, 'error');
                lookupBtn.disabled = false;
                lookupBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> إعادة المحاولة';
              }
            };
          }
        } else {
          playersTableBody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-slate-500">لا يوجد حسابات مطابقة لمعايير الفلترة الحالية.</td></tr>';
        }
        return;
      }

      playersTableBody.innerHTML = '';
      filtered.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = `hover:bg-slate-800/60 transition cursor-pointer ${selectedPlayer === p.username ? 'bg-yellow-500/10 border-r-2 border-yellow-500' : ''}`;

        const isOnlineThreshold = 2.5 * 60 * 1000;
        const lastActive = Number(p.lastActiveTimestamp || p.lastSeen || p.last_seen || 0);
        const isPlayerOnline = lastActive > 0 && (Date.now() - lastActive) < isOnlineThreshold;
        let statusBadge = isPlayerOnline
          ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1 shadow-sm"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>متصل الآن</span>'
          : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800/60 text-slate-400 border border-slate-700/50">غير نشط</span>';
        if (p.isBanned) {
          statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">محظور</span>';
        } else if (p.jailTimer > 0) {
          statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">سجين (${p.jailTimer}ث)${isPlayerOnline ? ' 🟢' : ''}</span>`;
        } else if (p.isAdmin) {
          statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">الإدارة ⭐${isPlayerOnline ? ' 🟢' : ''}</span>`;
        }

        tr.innerHTML =`
          <td class="p-2.5 flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-slate-800 text-yellow-400 flex items-center justify-center font-bold text-[10px]">
              ${p.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="font-bold text-white">${p.username} ${p.username === GameEngine.activeUsername ?'<span class="text-[9px] text-yellow-400">(أنت)</span>' :''}</div>
              <div class="text-[10px] text-slate-400 font-sans">${p.title ||'عامل مبتدئ'} • <span class="text-purple-400 font-bold">${Number(p.xp || 0).toLocaleString()} XP</span></div>
            </div>
          </td>
          <td class="p-2.5 text-center numbers-font font-bold text-yellow-400">${Number(p.netWorth !== undefined && p.netWorth !== null ? p.netWorth : (p.net_worth || 0)).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center numbers-font font-bold text-emerald-400">${Number(p.cash || 0).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center">${statusBadge}</td>
          <td class="p-2.5 text-left">
            <button data-user="${p.username}" class="btn-select-player px-2.5 py-1 bg-yellow-500/20 hover:bg-yellow-500 text-yellow-400 hover:text-slate-950 rounded text-[10px] font-bold transition">إدارة </button>
          </td>`;

        tr.addEventListener('click', (e) => {
          selectPlayerForModeration(p.username);
        });

        playersTableBody.appendChild(tr);
      });
    }

    async function selectPlayerForModeration(username) {
      if (!username) return;
      try {
        const state = await AppDB.adminGetPlayer(username);
        selectedPlayer = username;
        selectedPlayerState = state;

        document.getElementById('admin-p-username').textContent = username;
        document.getElementById('admin-p-worth').textContent =`${(state.netWorth || 0).toLocaleString()} EGP`;
        document.getElementById('admin-p-cash').textContent = (state.cash || 0).toLocaleString();
        document.getElementById('admin-p-bank').textContent = (state.bank || 0).toLocaleString();
        const dirtyEl = document.getElementById('admin-p-dirty');
        if (dirtyEl) dirtyEl.textContent = (state.dirtyCash || 0).toLocaleString();
        const loanEl = document.getElementById('admin-p-loan');
        if (loanEl) {
          const l = state.activeLoan;
          const due = l ? Number(l.totalDue || l.amount || 0) : 0;
          if (due > 0) {
            loanEl.textContent = `${due.toLocaleString()} EGP ${l.isDefaulted ? '(متعثر ⚠️)' : ''}`;
            loanEl.className = l.isDefaulted ? 'text-rose-400 numbers-font font-bold animate-pulse' : 'text-amber-400 numbers-font font-bold';
          } else {
            loanEl.textContent = 'لا يوجد قرض';
            loanEl.className = 'text-slate-400 font-normal';
          }
        }
        document.getElementById('admin-p-title').textContent = state.title ||'عامل مبتدئ';
        const xpEl = document.getElementById('admin-p-xp');
        if (xpEl) xpEl.textContent = `${(state.xp || 0).toLocaleString()} XP`;

        // Format and render account creation date
        let createdStr ='غير معروف';
        if (state.createdAt) {
          let date;
          if (typeof state.createdAt.toDate ==='function') {
            date = state.createdAt.toDate();
          } else if (state.createdAt.seconds) {
            date = new Date(state.createdAt.seconds * 1000);
          } else {
            date = new Date(state.createdAt);
          }
          if (date && !isNaN(date.getTime())) {
            createdStr = date.toLocaleDateString('ar-EG') +'' + date.toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit' });
          }
        }
        const createdEl = document.getElementById('admin-p-created-at');
        if (createdEl) createdEl.textContent = createdStr;

        // Calculate and render financial telemetry flows
        const originalState = GameEngine.state;
        let grossIncomePerSecond = 0;
        let taxPerSecond = 0;
        let netIncomePerSecond = 0;
        try {
          GameEngine.state = state;
          if (typeof GameEngine.getDetailedCashflowBreakdown ==='function') {
            const breakdown = GameEngine.getDetailedCashflowBreakdown(state);
            if (breakdown) {
              grossIncomePerSecond = breakdown.totalGrossPerSec || 0;
              taxPerSecond = (breakdown.tax && breakdown.tax.taxPerSec) || 0;
              netIncomePerSecond = breakdown.totalNetPerSec || 0;
            }
          } else {
            const tickIncome = GameEngine.calculatePassiveIncomePerTick ? GameEngine.calculatePassiveIncomePerTick(true) : 0;
            const taxReport = GameEngine.calculateTaxReport ? GameEngine.calculateTaxReport() : { taxPerSecond: 0 };
            grossIncomePerSecond = Math.max(0, tickIncome);
            taxPerSecond = ((state.netWorth || 0) > 5000000 && (((state.bank || 0) + (state.cash || 0)) > 100000)) ? (taxReport.taxPerSecond || 0) : 0;
            netIncomePerSecond = Math.max(0, grossIncomePerSecond - taxPerSecond);
          }
        } catch (err) {
          console.warn("Failed to simulate player flows:", err);
        } finally {
          GameEngine.state = originalState;
        }

        const grossFlowEl = document.getElementById('admin-p-flow-gross');
        if (grossFlowEl) grossFlowEl.textContent =`${grossIncomePerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const taxFlowEl = document.getElementById('admin-p-flow-tax');
        if (taxFlowEl) taxFlowEl.textContent =`${taxPerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const netFlowEl = document.getElementById('admin-p-flow-net');
        if (netFlowEl) netFlowEl.textContent =`${netIncomePerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const roleBadge = document.getElementById('admin-p-badge-role');
        if (roleBadge) {
          roleBadge.textContent = state.isAdmin ?'مدير النظام (Admin)' :'حساب لاعب';
          roleBadge.className = state.isAdmin
            ?'text-[10px] px-2 py-0.5 rounded font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            :'text-[10px] px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300';
        }

        const toggleRoleBtn = document.getElementById('btn-admin-toggle-role');
        const toggleRoleText = document.getElementById('admin-toggle-role-text');
        if (toggleRoleBtn && toggleRoleText) {
          if (state.isAdmin) {
            toggleRoleText.textContent ='سحب صلاحية الإدارة (إلغاء أدمن) ️';
            toggleRoleBtn.className ='w-full py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5';
          } else {
            toggleRoleText.textContent ='نقل صلاحية الإدارة / تعيين كمسؤول (Make Admin)';
            toggleRoleBtn.className ='w-full py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20';
          }
        }

        const statusBadge = document.getElementById('admin-p-badge-status');
        const lastActiveEl = document.getElementById('admin-p-last-active');
        const onlineThreshold = 2.5 * 60 * 1000; // 2.5 minutes (150s)
        const lastActive = Number(state.lastActiveTimestamp || state.lastSeen || state.last_seen || 0);
        const isOnline = lastActive > 0 && (Date.now() - lastActive) < onlineThreshold;

        let lastSeenDetail = 'غير معروف';
        if (lastActive > 0) {
          const diffSec = Math.floor((Date.now() - lastActive) / 1000);
          if (diffSec < 60) {
            lastSeenDetail = `منذ ${Math.max(1, diffSec)} ثانية`;
          } else if (diffSec < 3600) {
            lastSeenDetail = `منذ ${Math.floor(diffSec / 60)} دقيقة`;
          } else {
            const d = new Date(lastActive);
            const isToday = d.toDateString() === new Date().toDateString();
            lastSeenDetail = (isToday ? 'اليوم ' : d.toLocaleDateString('ar-EG') + ' ') + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          }
        }

        if (lastActiveEl) {
          if (isOnline) {
            lastActiveEl.innerHTML = `<span class="text-emerald-400 font-bold flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>متصل الآن (${lastSeenDetail})</span>`;
          } else if (lastActive > 0) {
            lastActiveEl.textContent = lastSeenDetail;
            lastActiveEl.className = 'text-slate-300 font-normal';
          } else {
            lastActiveEl.textContent = 'غير معروف';
            lastActiveEl.className = 'text-slate-500 font-normal';
          }
        }

        if (statusBadge) {
          if (state.isBanned) {
            statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block ml-1"></span>محظور نهائياً ⛔';
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center';
          } else if (state.jailTimer > 0) {
            statusBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block ml-1"></span>سجين (${state.jailTimer}ث) ${isOnline ? '🟢 متصل الآن' : '⚪ غير نشط'}`;
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center';
          } else if (isOnline) {
            statusBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block ml-1"></span>نشط ومتصل الآن 🟢 (${lastSeenDetail})`;
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20 flex items-center';
          } else {
            statusBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block ml-1"></span>غير نشط ⚪ (${lastSeenDetail})`;
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-slate-800/80 text-slate-400 border border-slate-700 flex items-center';
          }
        }

        document.getElementById('admin-input-cash').value = state.cash || 0;
        document.getElementById('admin-input-bank').value = state.bank || 0;
        const xpInp = document.getElementById('admin-input-xp');
        if (xpInp) xpInp.value = state.xp || 0;

        const bizSelect = document.getElementById('admin-input-biz-type');
        if (bizSelect) {
          const selectedBiz = bizSelect.value;
          const bizData = (state.businesses && state.businesses[selectedBiz]) || { level: 0, workers: 0 };
          document.getElementById('admin-input-biz-level').value = bizData.level || 0;
          document.getElementById('admin-input-biz-workers').value = bizData.workers || 0;
        }

        if (resultCard) {
          resultCard.classList.remove('hidden');
          resultCard.scrollIntoView({ behavior:'smooth', block:'nearest' });
        }
        const fbText = document.getElementById('admin-toggle-fb-text');
        if (fbText) {
          const isFb = Boolean(state.facebookVerified || (state.badges && state.badges.includes('facebook')));
          fbText.textContent = isFb ?'سحب شارة فيسبوك (إلغاء التوثيق)' :'منح شارة فيسبوك الزرقاء (توثيق الحساب)';
        }

        renderPlayersTable();
        renderPlayerPossessions(state);
        loadAdminPlayerWorkspace(state);
        logAdminAction(`تم فتح ملف الحساب للاعب: ${username}`);
      } catch (err) {
        showToast('خطأ فحص اللاعب', err.message,'error');
      }
    }

    async function loadAdminPlayerWorkspace(playerState) {
      const listSelect = document.getElementById('admin-player-backups-select');
      if (!listSelect) return;

      listSelect.innerHTML ='<option value="">جاري جلب النسخ الاحتياطية...</option>';

      try {
        const dates = await AppDB.getPlayerBackupDates(playerState.username);
        listSelect.innerHTML ='';
        if (!dates || dates.length === 0) {
          listSelect.innerHTML ='<option value="">لا توجد نسخ احتياطية متوفرة...</option>';
        } else {
          dates.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent =`نسخة يوم ${d}`;
            listSelect.appendChild(opt);
          });
        }
      } catch (err) {
        listSelect.innerHTML ='<option value="">فشل جلب النسخ الاحتياطية</option>';
      }
    }

    // ==================== PLAYER POSSESSIONS & BACKUP EXPORT & GRANT ACTIONS ====================

    // RENDER PLAYER POSSESSIONS DIRECTORY
    function renderPlayerPossessions(state) {
      const container = document.getElementById('admin-p-possessions-container');
      if (!container) return;
      container.innerHTML ='';

      let hasItems = false;

      // 1. Current Job
      if (state.jobId || state.title) {
        hasItems = true;
        const jobDiv = document.createElement('div');
        jobDiv.className ='flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 hover:border-yellow-500/20 transition';
        jobDiv.innerHTML =`
          <div class="flex items-center gap-2">
            <span class="text-base"></span>
            <div>
              <div class="font-bold text-slate-200">الوظيفة الحالية</div>
              <div class="text-[10px] text-slate-400 font-sans">${escapeHtml(state.title ||'عامل مبتدئ')}</div>
            </div>
          </div>
          <select class="admin-inline-job-select bg-slate-950 border border-slate-700 text-slate-300 p-1.5 rounded-md text-[10px] focus:outline-none focus:border-yellow-500">
            ${Object.keys(GameEngine.JOBS).map(jk =>'<option value="' + jk +'"' + (state.jobId === jk ?'selected' :'') +'>' + GameEngine.JOBS[jk].name +'</option>').join('')}
          </select>`;
        jobDiv.querySelector('.admin-inline-job-select').addEventListener('change', async (e) => {
          const jobKey = e.target.value;
          state.jobId = jobKey;
          state.title = GameEngine.JOBS[jobKey].name;
          await saveAndSyncPlayerPossessions();
        });
        container.appendChild(jobDiv);
      }

      // 2. Businesses / Projects
      if (state.businesses) {
        Object.keys(state.businesses).forEach(bk => {
          const biz = state.businesses[bk];
          if (!biz || biz.level <= 0) return;
          hasItems = true;
          const bizConfig = GameEngine.BUSINESSES[bk];
          const bizName = bizConfig ? bizConfig.name : bk;

          const bizDiv = document.createElement('div');
          bizDiv.className ='flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 hover:border-yellow-500/20 transition gap-2 mt-2';
          bizDiv.innerHTML =`
            <div class="flex items-center gap-2 flex-1 text-right">
              <span class="text-base"><i class="fa-solid fa-briefcase text-yellow-400"></i></span>
              <div>
                <div class="font-bold text-slate-200">${bizName}</div>
                <div class="text-[10px] text-slate-400">المستوى: <span class="text-yellow-400 font-bold font-mono">${biz.level}</span> | الموظفين: <span class="text-sky-400 font-bold font-mono">${biz.workers}</span></div>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button class="btn-inline-biz-lvl-dec px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold" title="تقليل المستوى">-L</button>
              <button class="btn-inline-biz-lvl-inc px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold" title="زيادة المستوى">+L</button>
              <span class="text-slate-700 mx-0.5">|</span>
              <button class="btn-inline-biz-wrk-dec px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold" title="تقليل الموظفين">-W</button>
              <button class="btn-inline-biz-wrk-inc px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold" title="زيادة الموظفين">+W</button>
              <button class="btn-inline-biz-del ml-1 p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition" title="حذف المشروع"><i class="fa-solid fa-trash-can"></i></button>
            </div>`;

          bizDiv.querySelector('.btn-inline-biz-lvl-dec').addEventListener('click', async () => {
            biz.level = Math.max(0, biz.level - 1);
            await saveAndSyncPlayerPossessions();
            renderPlayerPossessions(state);
          });
          bizDiv.querySelector('.btn-inline-biz-lvl-inc').addEventListener('click', async () => {
            biz.level += 1;
            biz.suppliesTicks = Math.max(biz.suppliesTicks || 0, 3600);
            await saveAndSyncPlayerPossessions();
            renderPlayerPossessions(state);
          });
          bizDiv.querySelector('.btn-inline-biz-wrk-dec').addEventListener('click', async () => {
            biz.workers = Math.max(0, biz.workers - 1);
            await saveAndSyncPlayerPossessions();
            renderPlayerPossessions(state);
          });
          bizDiv.querySelector('.btn-inline-biz-wrk-inc').addEventListener('click', async () => {
            biz.workers += 1;
            await saveAndSyncPlayerPossessions();
            renderPlayerPossessions(state);
          });
          bizDiv.querySelector('.btn-inline-biz-del').addEventListener('click', async () => {
            if (confirm(`هل أنت متأكد من حذف مشروع "${bizName}" لللاعب؟`)) {
              biz.level = 0;
              biz.workers = 0;
              await saveAndSyncPlayerPossessions();
              renderPlayerPossessions(state);
            }
          });

          container.appendChild(bizDiv);
        });
      }

      // Add / Grant Business Bar for unowned projects
      if (typeof GameEngine !== 'undefined' && GameEngine.BUSINESSES) {
        const unownedBizKeys = Object.keys(GameEngine.BUSINESSES).filter(bk => !state.businesses || !state.businesses[bk] || state.businesses[bk].level <= 0);
        if (unownedBizKeys.length > 0) {
          const addBizDiv = document.createElement('div');
          addBizDiv.className = 'flex items-center gap-2 bg-slate-950/60 p-2 rounded-lg border border-dashed border-slate-800 mt-2';
          addBizDiv.innerHTML = `
            <i class="fa-solid fa-plus text-yellow-400 text-xs"></i>
            <span class="text-[10px] text-slate-400 font-bold shrink-0">منح مشروع جديد:</span>
            <select class="admin-grant-biz-select flex-1 bg-slate-900 border border-slate-800 text-slate-200 p-1 rounded text-[10px]">
              ${unownedBizKeys.map(bk => `<option value="${bk}">${GameEngine.BUSINESSES[bk].name}</option>`).join('')}
            </select>
            <button class="btn-admin-grant-biz px-2.5 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 rounded text-[10px] font-bold transition">منح</button>
          `;
          addBizDiv.querySelector('.btn-admin-grant-biz').addEventListener('click', async () => {
            const selectedBiz = addBizDiv.querySelector('.admin-grant-biz-select').value;
            if (!selectedBiz) return;
            if (!state.businesses) state.businesses = {};
            const cfg = GameEngine.BUSINESSES[selectedBiz];
            state.businesses[selectedBiz] = {
              level: 1,
              workers: 1,
              price: (cfg && cfg.optimumPrice) || 50,
              suppliesTicks: 3600
            };
            await saveAndSyncPlayerPossessions();
            renderPlayerPossessions(state);
            showToast('منح مشروع', `تم منح مشروع "${cfg ? cfg.name : selectedBiz}" لللاعب بنجاح.`, 'success');
          });
          container.appendChild(addBizDiv);
        }
      }

      // 3. Assets / Real Estate
      if (state.assets) {
        Object.keys(state.assets).forEach(ak => {
          const qty = state.assets[ak] || 0;
          if (qty <= 0) return;
          hasItems = true;
          const assetConfig = GameEngine.ASSETS[ak];
          const assetName = assetConfig ? assetConfig.name : ak;

          const assetDiv = document.createElement('div');
          assetDiv.className ='flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 hover:border-yellow-500/20 transition mt-2';
          assetDiv.innerHTML =`
            <div class="flex items-center gap-2 text-right">
              <span class="text-base"></span>
              <div>
                <div class="font-bold text-slate-200">${assetName}</div>
                <div class="text-[10px] text-slate-400">العدد المملوك: <strong class="text-emerald-400 font-mono">${qty}</strong></div>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button class="btn-inline-ast-dec px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold">-</button>
              <button class="btn-inline-ast-inc px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold">+</button>
              <button class="btn-inline-ast-del ml-1 p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition" title="حذف الأصل"><i class="fa-solid fa-trash-can"></i></button>
            </div>`;

          assetDiv.querySelector('.btn-inline-ast-dec').addEventListener('click', async () => {
            state.assets[ak] = Math.max(0, qty - 1);
            await saveAndSyncPlayerPossessions();
          });
          assetDiv.querySelector('.btn-inline-ast-inc').addEventListener('click', async () => {
            state.assets[ak] = qty + 1;
            await saveAndSyncPlayerPossessions();
          });
          assetDiv.querySelector('.btn-inline-ast-del').addEventListener('click', async () => {
            if (confirm(`هل أنت متأكد من حذف عقارات"${assetName}" بالكامل لللاعب؟`)) {
              state.assets[ak] = 0;
              await saveAndSyncPlayerPossessions();
            }
          });

          container.appendChild(assetDiv);
        });
      }

      // 4. Stocks
      if (state.stocks) {
        Object.keys(state.stocks).forEach(sk => {
          const stockData = state.stocks[sk];
          if (!stockData || stockData.shares <= 0) return;
          hasItems = true;
          const stockConfig = GameEngine.STOCKS[sk];
          const stockName = stockConfig ? stockConfig.name : sk;

          const stockDiv = document.createElement('div');
          stockDiv.className ='flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 hover:border-yellow-500/20 transition gap-2 mt-2';
          stockDiv.innerHTML =`
            <div class="flex items-center gap-2 flex-1 text-right">
              <span class="text-base"></span>
              <div>
                <div class="font-bold text-slate-200">${sk} (${stockName})</div>
                <div class="text-[10px] text-slate-400">الأسهم: <span class="text-yellow-400 font-bold font-mono">${stockData.shares}</span> | متوسط الشراء: <span class="text-sky-400 font-bold font-mono">${stockData.avgPrice} EGP</span></div>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button class="btn-inline-stk-edit px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold">تعديل</button>
              <button class="btn-inline-stk-del p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition" title="حذف الأسهم"><i class="fa-solid fa-trash-can"></i></button>
            </div>`;

          stockDiv.querySelector('.btn-inline-stk-edit').addEventListener('click', async () => {
            const newShares = prompt(`أدخل عدد الأسهم الجديد لسهم (${sk}):`, stockData.shares);
            if (newShares === null) return;
            const newPrice = prompt(`أدخل متوسط سعر الشراء الجديد للسهم:`, stockData.avgPrice);
            if (newPrice === null) return;

            const sharesVal = parseInt(newShares) || 0;
            const priceVal = parseFloat(newPrice) || 0;

            if (sharesVal < 0 || priceVal < 0) {
              showToast('خطأ إدخال','يرجى إدخال قيم صحيحة للأسهم والأسعار.','error');
              return;
            }

            stockData.shares = sharesVal;
            stockData.avgPrice = priceVal;
            await saveAndSyncPlayerPossessions();
          });

          stockDiv.querySelector('.btn-inline-stk-del').addEventListener('click', async () => {
            if (confirm(`هل أنت متأكد من حذف أسهم"${sk}" لللاعب؟`)) {
              stockData.shares = 0;
              await saveAndSyncPlayerPossessions();
            }
          });

          container.appendChild(stockDiv);
        });
      }

      if (!hasItems) {
        container.innerHTML =`<p class="text-slate-500 text-[10px] text-center py-2">لا يوجد أملاك أو وظائف لعرضها حالياً لهذا اللاعب.</p>`;
      }
    }

    // SAVE AND SYNC PLAYER STATE & POSSESSIONS
    async function saveAndSyncPlayerPossessions() {
      if (!selectedPlayer || !selectedPlayerState) return;
      try {
        // Re-calculate Net Worth of selected player state
        let worth = (selectedPlayerState.cash || 0) + (selectedPlayerState.bank || 0) + (selectedPlayerState.dirtyCash || 0);

        if (selectedPlayerState.assets) {
          Object.keys(selectedPlayerState.assets).forEach(k => {
            if (GameEngine.ASSETS && GameEngine.ASSETS[k]) worth += (selectedPlayerState.assets[k] || 0) * GameEngine.ASSETS[k].cost;
          });
        }
        if (selectedPlayerState.stocks) {
          Object.keys(selectedPlayerState.stocks).forEach(sym => {
            const shares = (selectedPlayerState.stocks[sym] && selectedPlayerState.stocks[sym].shares) || 0;
            const history = GameEngine.stockPrices[sym] || [GameEngine.STOCKS[sym]?.basePrice || 10];
            const currentPrice = history[history.length - 1];
            worth += shares * currentPrice;
          });
        }
        if (selectedPlayerState.investments && Array.isArray(selectedPlayerState.investments)) {
          selectedPlayerState.investments.forEach(inv => worth += (inv.investedAmount || 0));
        }
        selectedPlayerState.netWorth = worth;

        // Save to DB
        await AppDB.adminSavePlayer(selectedPlayer, selectedPlayerState);

        // Sync local GameEngine state if we edited ourselves
        if (selectedPlayer === GameEngine.activeUsername) {
          GameEngine.state.jobId = selectedPlayerState.jobId ||'worker';
          GameEngine.state.title = selectedPlayerState.title ||'عامل مبتدئ';
          GameEngine.state.businesses = JSON.parse(JSON.stringify(selectedPlayerState.businesses || {}));
          GameEngine.state.assets = JSON.parse(JSON.stringify(selectedPlayerState.assets || {}));
          GameEngine.state.stocks = JSON.parse(JSON.stringify(selectedPlayerState.stocks || {}));
          GameEngine.state.netWorth = worth;
          try {
            localStorage.setItem(`rasalmal_state_${selectedPlayer}`, JSON.stringify(GameEngine.state));
          } catch (e) { }
          renderAll();
        }

        // Calculate and render financial telemetry flows dynamically
        const originalState = GameEngine.state;
        let grossIncomePerSecond = 0;
        let taxPerSecond = 0;
        let netIncomePerSecond = 0;
        try {
          GameEngine.state = selectedPlayerState;
          if (typeof GameEngine.getDetailedCashflowBreakdown ==='function') {
            const breakdown = GameEngine.getDetailedCashflowBreakdown(selectedPlayerState);
            if (breakdown) {
              grossIncomePerSecond = breakdown.totalGrossPerSec || 0;
              taxPerSecond = (breakdown.tax && breakdown.tax.taxPerSec) || 0;
              netIncomePerSecond = breakdown.totalNetPerSec || 0;
            }
          } else {
            const tickIncome = GameEngine.calculatePassiveIncomePerTick ? GameEngine.calculatePassiveIncomePerTick(true) : 0;
            const taxReport = GameEngine.calculateTaxReport ? GameEngine.calculateTaxReport() : { taxPerSecond: 0 };
            grossIncomePerSecond = Math.max(0, tickIncome);
            taxPerSecond = ((selectedPlayerState.netWorth || 0) > 5000000 && (((selectedPlayerState.bank || 0) + (selectedPlayerState.cash || 0)) > 100000)) ? (taxReport.taxPerSecond || 0) : 0;
            netIncomePerSecond = Math.max(0, grossIncomePerSecond - taxPerSecond);
          }
        } catch (err) {
          console.warn("Failed to simulate player flows:", err);
        } finally {
          GameEngine.state = originalState;
        }

        const grossFlowEl = document.getElementById('admin-p-flow-gross');
        if (grossFlowEl) grossFlowEl.textContent =`${grossIncomePerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const taxFlowEl = document.getElementById('admin-p-flow-tax');
        if (taxFlowEl) taxFlowEl.textContent =`${taxPerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const netFlowEl = document.getElementById('admin-p-flow-net');
        if (netFlowEl) netFlowEl.textContent =`${netIncomePerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        // Update Admin UI fields
        document.getElementById('admin-p-worth').textContent =`${worth.toLocaleString()} EGP`;
        document.getElementById('admin-p-title').textContent = selectedPlayerState.title ||'عامل مبتدئ';

        // Re-render
        renderPlayerPossessions(selectedPlayerState);
        loadAdminPlayersDirectory(false);
        showToast('حفظ التعديلات','تم تحديث ممتلكات اللاعب بنجاح وحفظها.','success');
      } catch (err) {
        showToast('خطأ حفظ ممتلكات', err.message,'error');
      }
    }

    // Dynamic Select Populate for Grant Tool
    function populateGrantItemSelect() {
      const typeSelect = document.getElementById('admin-grant-type');
      const itemSelect = document.getElementById('admin-grant-item-select');
      if (!typeSelect || !itemSelect) return;

      const type = typeSelect.value;
      itemSelect.innerHTML ='';

      // Toggle fields visibility
      document.getElementById('admin-grant-fields-job').classList.toggle('hidden', type !=='job');
      document.getElementById('admin-grant-fields-business').classList.toggle('hidden', type !=='business');
      document.getElementById('admin-grant-fields-asset').classList.toggle('hidden', type !=='asset');
      document.getElementById('admin-grant-fields-stock').classList.toggle('hidden', type !=='stock');

      let options = [];
      if (type ==='job') {
        Object.keys(GameEngine.JOBS).forEach(k => {
          options.push({ value: k, text: GameEngine.JOBS[k].name });
        });
      } else if (type ==='business') {
        Object.keys(GameEngine.BUSINESSES).forEach(k => {
          options.push({ value: k, text: GameEngine.BUSINESSES[k].name });
        });
      } else if (type ==='asset') {
        Object.keys(GameEngine.ASSETS).forEach(k => {
          options.push({ value: k, text: GameEngine.ASSETS[k].name });
        });
      } else if (type ==='stock') {
        Object.keys(GameEngine.STOCKS).forEach(k => {
          options.push({ value: k, text:`${k} (${GameEngine.STOCKS[k].name})` });
        });
      }

      options.forEach(opt => {
        const el = document.createElement('option');
        el.value = opt.value;
        el.textContent = opt.text;
        itemSelect.appendChild(el);
      });
    }

    const grantTypeSelect = document.getElementById('admin-grant-type');
    if (grantTypeSelect) {
      grantTypeSelect.addEventListener('change', populateGrantItemSelect);
      populateGrantItemSelect(); // Initial load
    }

    // Grant Possession Action
    const grantPossessionBtn = document.getElementById('btn-admin-grant-possession');
    if (grantPossessionBtn) {
      grantPossessionBtn.addEventListener('click', async () => {
        if (!selectedPlayer || !selectedPlayerState) {
          showToast('إضافة ممتلكات','يرجى اختيار لاعب أولاً من القائمة.','error');
          return;
        }

        const type = document.getElementById('admin-grant-type').value;
        const itemKey = document.getElementById('admin-grant-item-select').value;
        if (!itemKey) return;

        if (type ==='job') {
          selectedPlayerState.jobId = itemKey;
          selectedPlayerState.title = document.getElementById('admin-grant-job-title').value.trim() || GameEngine.JOBS[itemKey].name;
        } else if (type ==='business') {
          const lvl = parseInt(document.getElementById('admin-grant-biz-level').value) || 0;
          const wrk = parseInt(document.getElementById('admin-grant-biz-workers').value) || 0;
          if (lvl < 0 || wrk < 0) {
            showToast('خطأ إدخال','يرجى إدخال أرقام صحيحة لمستوى المشروع وموظفيه.','error');
            return;
          }
          if (!selectedPlayerState.businesses) selectedPlayerState.businesses = {};
          const bizConfig = GameEngine.BUSINESSES[itemKey];
          const price = (selectedPlayerState.businesses[itemKey] && selectedPlayerState.businesses[itemKey].price) || (bizConfig ? bizConfig.optimumPrice : 10);
          selectedPlayerState.businesses[itemKey] = { level: lvl, workers: wrk, price: price };
        } else if (type ==='asset') {
          const qty = parseInt(document.getElementById('admin-grant-asset-qty').value) || 0;
          if (qty < 0) {
            showToast('خطأ إدخال','العدد يجب أن يكون صفراً أو أكبر.','error');
            return;
          }
          if (!selectedPlayerState.assets) selectedPlayerState.assets = {};
          selectedPlayerState.assets[itemKey] = qty;
        } else if (type ==='stock') {
          const shares = parseInt(document.getElementById('admin-grant-stock-shares').value) || 0;
          const price = parseFloat(document.getElementById('admin-grant-stock-price').value) || 0;
          if (shares < 0 || price < 0) {
            showToast('خطأ إدخال','الأسهم والأسعار يجب أن تكون أرقاماً موجبة.','error');
            return;
          }
          if (!selectedPlayerState.stocks) selectedPlayerState.stocks = {};
          selectedPlayerState.stocks[itemKey] = { shares: shares, avgPrice: price };
        }

        await saveAndSyncPlayerPossessions();
        showToast('إضافة ممتلكات','تم منح الممتلك المحدد لللاعب بنجاح.','success');
      });
    }

    // Download Backup Action
    const downloadBackupBtn = document.getElementById('btn-admin-download-backup');
    if (downloadBackupBtn) {
      downloadBackupBtn.addEventListener('click', () => {
        if (!selectedPlayer || !selectedPlayerState) {
          showToast('تحميل تقرير الحساب','يرجى اختيار لاعب أولاً.','error');
          return;
        }
        try {
          const dataStr ="data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedPlayerState, null, 2));
          const downloadAnchor = document.createElement('a');
          downloadAnchor.setAttribute("href", dataStr);
          downloadAnchor.setAttribute("download",`rasalmal_player_${selectedPlayer}_backup.json`);
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          downloadAnchor.remove();
          showToast('تحميل تقرير الحساب',`تم تحميل ملف بيانات حساب اللاعب ${selectedPlayer} بنجاح.`,'success');
        } catch (err) {
          showToast('خطأ في التحميل', err.message,'error');
        }
      });
    }

    // Filter Buttons (Supports both .btn-admin-filter-players and .admin-player-filter-btn)
    const filterBtns = document.querySelectorAll('.btn-admin-filter-players, .admin-player-filter-btn');
    function applyPlayerFilter(targetFilter) {
      activeFilter = targetFilter;
      filterBtns.forEach(b => {
        const isCurrent = b.getAttribute('data-filter') === targetFilter;
        if (isCurrent) {
          b.classList.remove('bg-slate-900', 'text-slate-400', 'text-emerald-400', 'border-transparent', 'border-emerald-500/20');
          b.classList.add('bg-yellow-500/20', 'text-yellow-400', 'border-yellow-500/30');
        } else {
          b.classList.remove('bg-yellow-500/20', 'text-yellow-400', 'border-yellow-500/30', 'bg-yellow-500', 'text-slate-950');
          b.classList.add('bg-slate-900');
          if (b.getAttribute('data-filter') === 'online') {
            b.classList.add('text-emerald-400');
          } else {
            b.classList.add('text-slate-400');
          }
        }
      });
      renderPlayersTable();
    }

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const f = btn.getAttribute('data-filter');
        applyPlayerFilter(f);
      });
    });

    window.filterAdminOnline = function() {
      applyPlayerFilter('online');
    };

    // Live search filter input
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        renderPlayersTable();
      });
    }

    // Search Button
    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => {
        const q = searchInput.value.trim();
        if (q) {
          selectPlayerForModeration(q);
        } else {
          showToast('بحث اللاعبين','يرجى إدخال اسم المستخدم للبحث.','warning');
        }
      });
    }

    if (refreshListBtn) {
      refreshListBtn.addEventListener('click', () => {
        loadAdminPlayersDirectory(true, true);
      });
    }

    // Quick Injection Buttons (+100K, +500K, +1M, +10M)
    const quickInjectBtns = document.querySelectorAll('.btn-quick-inject');
    quickInjectBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const addAmount = Number(btn.getAttribute('data-add') || 0);
        const cashInp = document.getElementById('admin-input-cash');
        if (cashInp) {
          const current = Number(cashInp.value || 0);
          cashInp.value = Math.max(0, current + addAmount);
          cashInp.classList.add('glow-gold');
          setTimeout(() => cashInp.classList.remove('glow-gold'), 600);
          
          // Auto-trigger save to make the addition instant in the database
          const updateMoneyBtn = document.getElementById('btn-admin-update-money');
          if (updateMoneyBtn && selectedPlayer && selectedPlayerState) {
            updateMoneyBtn.click();
          }
        }
      });
    });

    // Quick XP Injection Buttons (+500 XP, +5K XP, +50K XP)
    const quickInjectXpBtns = document.querySelectorAll('.btn-quick-inject-xp');
    quickInjectXpBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const addAmount = Number(btn.getAttribute('data-add-xp') || 0);
        const xpInp = document.getElementById('admin-input-xp');
        if (xpInp) {
          const current = Number(xpInp.value || 0);
          xpInp.value = Math.max(0, current + addAmount);
          xpInp.classList.add('glow-gold');
          setTimeout(() => xpInp.classList.remove('glow-gold'), 600);

          // Auto-trigger save to make the addition instant in the database
          const updateMoneyBtn = document.getElementById('btn-admin-update-money');
          if (updateMoneyBtn && selectedPlayer && selectedPlayerState) {
            updateMoneyBtn.click();
          }
        }
      });
    });

    // Quick Zero Buttons
    const quickZeroBtns = document.querySelectorAll('.btn-quick-set-zero');
    quickZeroBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetType = btn.getAttribute('data-set-zero');
        if (targetType ==='cash') {
          const c = document.getElementById('admin-input-cash');
          if (c) c.value = 0;
        } else if (targetType ==='bank') {
          const b = document.getElementById('admin-input-bank');
          if (b) b.value = 0;
        } else if (targetType ==='xp') {
          const x = document.getElementById('admin-input-xp');
          if (x) x.value = 0;
        }

        // Auto-trigger save to make the zeroing instant in the database
        const updateMoneyBtn = document.getElementById('btn-admin-update-money');
        if (updateMoneyBtn && selectedPlayer && selectedPlayerState) {
          updateMoneyBtn.click();
        }
      });
    });

    // Save Balance Action with FULL REAL-TIME SYNC
    const updateMoneyBtn = document.getElementById('btn-admin-update-money');
    if (updateMoneyBtn) {
      updateMoneyBtn.addEventListener('click', async () => {
        if (!selectedPlayer || !selectedPlayerState) {
          showToast('تعديل الرصيد والخبرة','يرجى اختيار لاعب أولاً من القائمة.','error');
          return;
        }
        const newCash = Number(document.getElementById('admin-input-cash').value);
        const newBank = Number(document.getElementById('admin-input-bank').value);
        const xpInp = document.getElementById('admin-input-xp');
        const newXp = xpInp ? Number(xpInp.value) : (selectedPlayerState.xp || 0);

        if (isNaN(newCash) || isNaN(newBank) || isNaN(newXp) || newCash < 0 || newBank < 0 || newXp < 0) {
          showToast('خطأ مدخلات','يرجى إدخال أرقام صحيحة وموجبة (الكاش، البنك، ونقاط الخبرة XP).','error');
          return;
        }

        try {
          selectedPlayerState.cash = newCash;
          selectedPlayerState.bank = newBank;
          selectedPlayerState.xp = newXp;

          // Accurate NetWorth calculation
          let worth = newCash + newBank;
          if (selectedPlayerState.assets) {
            Object.keys(selectedPlayerState.assets).forEach(k => {
              if (GameEngine.ASSETS && GameEngine.ASSETS[k]) worth += (selectedPlayerState.assets[k] || 0) * GameEngine.ASSETS[k].cost;
            });
          }
          if (selectedPlayerState.stocks) {
            Object.keys(selectedPlayerState.stocks).forEach(sym => {
              const shares = (selectedPlayerState.stocks[sym] && selectedPlayerState.stocks[sym].shares) || 0;
              const history = GameEngine.stockPrices[sym] || [GameEngine.STOCKS[sym]?.basePrice || 10];
              const currentPrice = history[history.length - 1];
              worth += shares * currentPrice;
            });
          }
          if (selectedPlayerState.investments && Array.isArray(selectedPlayerState.investments)) {
            selectedPlayerState.investments.forEach(inv => worth += (inv.investedAmount || 0));
          }
          selectedPlayerState.netWorth = worth;

          // Recalculate title if GameEngine has getAppropriateTitle
          if (typeof GameEngine.getAppropriateTitle ==='function') {
            selectedPlayerState.title = GameEngine.getAppropriateTitle(worth, newXp);
          }

          // Save to Firestore / Supabase
          await AppDB.adminSavePlayer(selectedPlayer, selectedPlayerState);

          // CRITICAL: If the edited user is currently logged in, sync GameEngine memory & localStorage immediately!
          if (selectedPlayer === GameEngine.activeUsername) {
            GameEngine.state.cash = newCash;
            GameEngine.state.bank = newBank;
            GameEngine.state.xp = newXp;
            GameEngine.state.netWorth = worth;
            if (typeof GameEngine.getAppropriateTitle ==='function') {
              GameEngine.state.title = GameEngine.getAppropriateTitle(worth, newXp);
            }
            try {
              localStorage.setItem(`rasalmal_state_${selectedPlayer}`, JSON.stringify(GameEngine.state));
            } catch (e) { }
            renderAll();
          }

          // Update UI Card
          document.getElementById('admin-p-cash').textContent = newCash.toLocaleString();
          document.getElementById('admin-p-bank').textContent = newBank.toLocaleString();
          const xpEl = document.getElementById('admin-p-xp');
          if (xpEl) xpEl.textContent =`${newXp.toLocaleString()} XP`;
          const titleEl = document.getElementById('admin-p-title');
          if (titleEl && selectedPlayerState.title) titleEl.textContent = selectedPlayerState.title;
          document.getElementById('admin-p-worth').textContent =`${worth.toLocaleString()} EGP`;

          // Instant in-memory table reflection
          if (Array.isArray(cachedPlayers)) {
            const pIdx = cachedPlayers.findIndex(p => p.username === selectedPlayer);
            if (pIdx !== -1) {
              cachedPlayers[pIdx].cash = newCash;
              cachedPlayers[pIdx].bank = newBank;
              cachedPlayers[pIdx].xp = newXp;
              cachedPlayers[pIdx].netWorth = worth;
              cachedPlayers[pIdx].net_worth = worth;
              if (selectedPlayerState.title) cachedPlayers[pIdx].title = selectedPlayerState.title;
            }
            renderPlayersTable();
          }

          showToast('تم الحفظ بنجاح',`تم تحديث بيانات اللاعب ${selectedPlayer} بنجاح (كاش: ${newCash.toLocaleString()}، بنك: ${newBank.toLocaleString()}، خبرة: ${newXp.toLocaleString()} XP).`,'success');
          logAdminAction(`تعديل رصيد وخبرة اللاعب ${selectedPlayer} إلى كاش: ${newCash.toLocaleString()} ج.م، بنك: ${newBank.toLocaleString()} ج.م، خبرة: ${newXp.toLocaleString()} XP`);

          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('فشل تعديل البيانات', err.message,'error');
        }
      });
    }

    // Instant Balance Addition Action (Direct Real-time Sync to player)
    const instantAddBtn = document.getElementById('btn-admin-instant-add-balance');
    if (instantAddBtn) {
      instantAddBtn.addEventListener('click', async () => {
        if (!selectedPlayer) {
          showToast('إضافة رصيد', 'يرجى اختيار لاعب أولاً من القائمة.', 'error');
          return;
        }

        const amountInp = document.getElementById('admin-instant-add-amount');
        const targetSel = document.getElementById('admin-instant-add-target');
        const amount = Number(amountInp ? amountInp.value : 0);
        const target = targetSel ? targetSel.value : 'bank';

        if (isNaN(amount) || amount <= 0) {
          showToast('مبلغ غير صالح', 'يرجى إدخال مبلغ صحيح وموجب أكبر من صفر.', 'error');
          if (amountInp) amountInp.focus();
          return;
        }

        let targetLabel = 'البنك';
        let addCash = 0;
        let addBank = 0;

        if (target === 'bank') {
          targetLabel = 'البنك (Bank)';
          addBank = amount;
        } else if (target === 'cash') {
          targetLabel = 'الكاش (Cash)';
          addCash = amount;
        } else if (target === 'split') {
          targetLabel = 'مناصفة (50% كاش / 50% بنك)';
          addCash = Math.floor(amount / 2);
          addBank = amount - addCash;
        }

        const confirmMsg = `💰 تأكيد إضافة الرصيد الفوري:\n\nهل أنت متأكد من إضافة ${amount.toLocaleString()} EGP إلى [${targetLabel}] للاعب "${selectedPlayer}"؟\n\nسيتم ظهور الرصيد الجديد مباشرة في شاشة اللاعب فوراً.`;
        if (!confirm(confirmMsg)) return;

        try {
          instantAddBtn.disabled = true;
          instantAddBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>جاري إضافة الرصيد وتحديث شاشة اللاعب...</span>';

          // 1. Fetch freshest state from database to avoid overwriting recent activity
          const freshPlayer = await AppDB.adminGetPlayer(selectedPlayer) || selectedPlayerState || {};
          const currentCash = Number(freshPlayer.cash || 0);
          const currentBank = Number(freshPlayer.bank || 0);
          const newCash = currentCash + addCash;
          const newBank = currentBank + addBank;
          const newWorth = Number(freshPlayer.netWorth || 0) + amount;
          const now = Date.now();

          freshPlayer.cash = newCash;
          freshPlayer.bank = newBank;
          freshPlayer.netWorth = newWorth;
          freshPlayer.adminModifiedTimestamp = now;

          if (selectedPlayerState) {
            selectedPlayerState.cash = newCash;
            selectedPlayerState.bank = newBank;
            selectedPlayerState.netWorth = newWorth;
            selectedPlayerState.adminModifiedTimestamp = now;
          }

          // 2. Save directly to Supabase with latest adminModifiedTimestamp
          await AppDB.adminSavePlayer(selectedPlayer, freshPlayer);

          // 3. Dispatch high-priority real-time balance grant mail to player's client
          const grantPayload = {
            addedCash: addCash,
            addedBank: addBank,
            totalAmount: amount,
            target: target,
            newCash: newCash,
            newBank: newBank,
            timestamp: now
          };

          await AppDB.sendMail('إدارة اللعبة (Admin)', selectedPlayer, 'admin_balance_grant', grantPayload);

          // 4. Inject pendingAdminPopup into state
          try {
            freshPlayer.pendingAdminPopup = {
              title: '💰 تم استلام إيداع مالي مباشر!',
              message: `تم تحويل وإضافة مبلغ +${amount.toLocaleString()} EGP إلى حسابك بنجاح من قبل الإدارة.` +
                (addCash > 0 ? `\n💵 كاش: +${addCash.toLocaleString()} EGP` : '') +
                (addBank > 0 ? `\n🏦 بنك: +${addBank.toLocaleString()} EGP` : ''),
              style: 'reward',
              sentAt: now
            };
            freshPlayer.adminModifiedTimestamp = now;
            await AppDB.adminSavePlayer(selectedPlayer, freshPlayer);
          } catch (_) {}

          // 5. If this admin is the active player locally, immediately update in-memory GameEngine
          if (selectedPlayer === GameEngine.activeUsername) {
            GameEngine.state.cash = newCash;
            GameEngine.state.bank = newBank;
            GameEngine.state.netWorth = newWorth;
            GameEngine.state.adminModifiedTimestamp = now;
            try {
              localStorage.setItem(`rasalmal_state_${selectedPlayer}`, JSON.stringify(GameEngine.state));
            } catch (e) {}
            renderAll();
          }

          // 6. Update UI in Admin Dashboard
          const cashEl = document.getElementById('admin-p-cash');
          if (cashEl) cashEl.textContent = newCash.toLocaleString();
          const bankEl = document.getElementById('admin-p-bank');
          if (bankEl) bankEl.textContent = newBank.toLocaleString();
          const worthEl = document.getElementById('admin-p-worth');
          if (worthEl) worthEl.textContent = `${newWorth.toLocaleString()} EGP`;

          const cashInp = document.getElementById('admin-input-cash');
          if (cashInp) cashInp.value = newCash;
          const bankInp = document.getElementById('admin-input-bank');
          if (bankInp) bankInp.value = newBank;

          if (amountInp) amountInp.value = '';

          // 7. Update in cachedPlayers table
          if (Array.isArray(cachedPlayers)) {
            const pIdx = cachedPlayers.findIndex(p => p.username === selectedPlayer);
            if (pIdx !== -1) {
              cachedPlayers[pIdx].cash = newCash;
              cachedPlayers[pIdx].bank = newBank;
              cachedPlayers[pIdx].netWorth = newWorth;
              cachedPlayers[pIdx].net_worth = newWorth;
            }
            renderPlayersTable();
          }

          showToast('تمت الإضافة بنجاح 💰', `تمت إضافة ${amount.toLocaleString()} EGP لحساب اللاعب [${selectedPlayer}] فوراً! الرصيد الجديد: ${newCash.toLocaleString()} كاش / ${newBank.toLocaleString()} بنك.`, 'success');
          logAdminAction(`إضافة مبلغ فوري بقيمة ${amount.toLocaleString()} EGP إلى [${targetLabel}] للاعب ${selectedPlayer}`);

        } catch (err) {
          console.error('[Instant Add Error]', err);
          showToast('فشل إضافة الرصيد', err.message || 'حدث خطأ أثناء الاتصال بقاعدة البيانات', 'error');
        } finally {
          instantAddBtn.disabled = false;
          instantAddBtn.innerHTML = '<i class="fa-solid fa-plus-circle text-sm"></i> <span>إضافة المبلغ فوراً</span>';
        }
      });
    }

    // Business Moderation Event Listeners
    const bizSelect = document.getElementById('admin-input-biz-type');
    if (bizSelect) {
      bizSelect.addEventListener('change', () => {
        if (selectedPlayerState && selectedPlayerState.businesses) {
          const bizKey = bizSelect.value;
          const bizData = selectedPlayerState.businesses[bizKey] || { level: 0, workers: 0 };
          document.getElementById('admin-input-biz-level').value = bizData.level || 0;
          document.getElementById('admin-input-biz-workers').value = bizData.workers || 0;
        }
      });
    }

    const updateBizBtn = document.getElementById('btn-admin-update-biz');
    if (updateBizBtn) {
      updateBizBtn.addEventListener('click', async () => {
        if (!selectedPlayer || !selectedPlayerState) {
          showToast('تعديل الأملاك','يرجى اختيار لاعب أولاً من القائمة.','error');
          return;
        }
        const bizKey = document.getElementById('admin-input-biz-type').value;
        const level = parseInt(document.getElementById('admin-input-biz-level').value) || 0;
        const workers = parseInt(document.getElementById('admin-input-biz-workers').value) || 0;

        if (isNaN(level) || level < 0 || isNaN(workers) || workers < 0) {
          showToast('خطأ مدخلات','يرجى إدخال قيم صحيحة للمستوى والموظفين.','error');
          return;
        }

        if (!selectedPlayerState.businesses) selectedPlayerState.businesses = {};

        const bizConfig = GameEngine.BUSINESSES[bizKey];
        const price = (selectedPlayerState.businesses[bizKey] && selectedPlayerState.businesses[bizKey].price) || (bizConfig ? bizConfig.optimumPrice : 10);

        selectedPlayerState.businesses[bizKey] = {
          level: level,
          workers: workers,
          price: price
        };

        try {
          updateBizBtn.disabled = true;
          updateBizBtn.innerHTML ='جاري الحفظ والتزامن...';

          // Re-calculate Net Worth of selected player state
          let worth = (selectedPlayerState.cash || 0) + (selectedPlayerState.bank || 0) + (selectedPlayerState.dirtyCash || 0);

          if (selectedPlayerState.assets) {
            Object.keys(selectedPlayerState.assets).forEach(k => {
              if (GameEngine.ASSETS && GameEngine.ASSETS[k]) worth += (selectedPlayerState.assets[k] || 0) * GameEngine.ASSETS[k].cost;
            });
          }
          if (selectedPlayerState.stocks) {
            Object.keys(selectedPlayerState.stocks).forEach(sym => {
              const shares = (selectedPlayerState.stocks[sym] && selectedPlayerState.stocks[sym].shares) || 0;
              const history = GameEngine.stockPrices[sym] || [GameEngine.STOCKS[sym]?.basePrice || 10];
              const currentPrice = history[history.length - 1];
              worth += shares * currentPrice;
            });
          }
          if (selectedPlayerState.investments && Array.isArray(selectedPlayerState.investments)) {
            selectedPlayerState.investments.forEach(inv => worth += (inv.investedAmount || 0));
          }
          selectedPlayerState.netWorth = worth;

          await AppDB.adminSavePlayer(selectedPlayer, selectedPlayerState);

          if (selectedPlayer === GameEngine.activeUsername) {
            GameEngine.state.businesses[bizKey] = { level, workers, price };
            GameEngine.state.netWorth = worth;
            try {
              localStorage.setItem(`rasalmal_state_${selectedPlayer}`, JSON.stringify(GameEngine.state));
            } catch (e) { }
            renderAll();
          }

          document.getElementById('admin-p-worth').textContent =`${worth.toLocaleString()} EGP`;
          showToast('تحديث الأملاك',`تم تحديث أملاك اللاعب (${bizConfig ? bizConfig.name : bizKey}) بنجاح إلى مستوى ${level} وعدد موظفين ${workers}.`,'success');
          logAdminAction(`تعديل أملاك اللاعب ${selectedPlayer}: ${bizKey} -> مستوى ${level}، موظفين ${workers}`);
          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('خطأ في الحفظ', err.message,'error');
        } finally {
          updateBizBtn.disabled = false;
          updateBizBtn.innerHTML ='<i class="fa-solid fa-building-circle-check"></i> <span>حفظ وتطبيق الأملاك فوراً</span>';
        }
      });
    }

    // Release Jail Action
    const releaseJailBtn = document.getElementById('btn-admin-release-jail');
    if (releaseJailBtn) {
      releaseJailBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        try {
          await AppDB.adminReleaseJail(selectedPlayer);
          if (selectedPlayer === GameEngine.activeUsername) {
            GameEngine.state.jailTimer = 0;
            renderAll();
          }
          showToast('عفو قانوني',`تم الإفراج عن اللاعب ${selectedPlayer} وإلغاء عقوبة السجن.`,'success');
          logAdminAction(`عفو وإفراج قانوني عن اللاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ إشرافي', err.message,'error');
        }
      });
    }

    // Jail Player Action (5 mins)
    const jailPlayerBtn = document.getElementById('btn-admin-jail-player');
    if (jailPlayerBtn) {
      jailPlayerBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        try {
          await AppDB.adminSetPlayerJail(selectedPlayer, 300);
          if (selectedPlayer === GameEngine.activeUsername) {
            GameEngine.state.jailTimer = 300;
            renderAll();
          }
          showToast('عقوبة السجن',`تم إيداع اللاعب ${selectedPlayer} في السجن لمدة 5 دقائق.`,'warning');
          logAdminAction(`إيداع اللاعب ${selectedPlayer} في السجن لمدة 300 ثانية`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ إشرافي', err.message,'error');
        }
      });
    }

    // Ban Player Action
    const banBtn = document.getElementById('btn-admin-ban');
    if (banBtn) {
      banBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        if (!confirm(`هل أنت متأكد من حظر حساب اللاعب ${selectedPlayer} نهائياً ومنعه من الدخول؟`)) return;
        try {
          await AppDB.adminBanPlayer(selectedPlayer);
          showToast('حظر الحساب',`تم حظر حساب اللاعب ${selectedPlayer} نهائياً.`,'success');
          logAdminAction(`حظر نهائي لحساب اللاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ حظر', err.message,'error');
        }
      });
    }

    // Unban Player Action
    const unbanBtn = document.getElementById('btn-admin-unban');
    if (unbanBtn) {
      unbanBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        try {
          await AppDB.adminUnbanPlayer(selectedPlayer);
          showToast('فك الحظر',`تم رفع الحظر عن حساب اللاعب ${selectedPlayer} بنجاح.`,'success');
          logAdminAction(`رفع الحظر وإعادة تنشيط حساب اللاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ فك الحظر', err.message,'error');
        }
      });
    }

    // Change Player PIN
    const changePinBtn = document.getElementById('btn-admin-change-pin');
    if (changePinBtn) {
      changePinBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        const newPin = prompt(`أدخل الرقم السري (PIN) الجديد لحساب ${selectedPlayer}:`);
        if (!newPin || newPin.trim().length < 3) {
          if (newPin !== null) showToast('تغيير PIN','يجب أن يتكون الرقم السري من 3 خانات على الأقل.','error');
          return;
        }
        try {
          await AppDB.adminChangePlayerPin(selectedPlayer, newPin.trim());
          showToast('تغيير PIN',`تم تعيين الرقم السري الجديد للاعب ${selectedPlayer} بنجاح.`,'success');
          logAdminAction(`تغيير الرقم السري لحساب اللاعب: ${selectedPlayer}`);
        } catch (err) {
          showToast('خطأ تغيير PIN', err.message,'error');
        }
      });
    }

    // Toggle / Transfer Admin Role Action
    const toggleAdminRoleBtn = document.getElementById('btn-admin-toggle-role');
    if (toggleAdminRoleBtn) {
      toggleAdminRoleBtn.addEventListener('click', async () => {
        if (!selectedPlayer || !selectedPlayerState) {
          showToast('إدارة الصلاحيات','يرجى اختيار لاعب أولاً من القائمة.','error');
          return;
        }

        const isCurrentlyAdmin = Boolean(selectedPlayerState.isAdmin);
        const targetUser = selectedPlayer;

        let confirmMsg ='';
        if (isCurrentlyAdmin) {
          confirmMsg =`️ تحذير: هل أنت متأكد من سحب صلاحيات الإدارة من اللاعب"${targetUser}" وتحويل حسابه إلى حساب لاعب عادي؟`;
        } else {
          confirmMsg =` تأكيد ترقية مسؤول:\nهل أنت متأكد من منح صلاحيات الإدارة الكاملة (Admin) للاعب"${targetUser}"؟\nسيتمكن هذا الحساب من الدخول للوحة التحكم وإدارة كافة مفاصل اللعبة واللاعبين.`;
        }

        if (!confirm(confirmMsg)) return;

        try {
          toggleAdminRoleBtn.disabled = true;
          toggleAdminRoleBtn.innerHTML ='<i class="fa-solid fa-spinner fa-spin"></i> جاري تحديث الصلاحية...';

          const newAdminStatus = !isCurrentlyAdmin;
          await AppDB.adminSetPlayerAdminStatus(targetUser, newAdminStatus);

          selectedPlayerState.isAdmin = newAdminStatus;
          if (targetUser === GameEngine.activeUsername && GameEngine.state) {
            GameEngine.state.isAdmin = newAdminStatus;
          }

          showToast('صلاحيات الإدارة', newAdminStatus ?`تم تعيين اللاعب ${targetUser} كمسؤول (Admin) بنجاح!` :`تم سحب صلاحيات الإدارة من اللاعب ${targetUser}.`,'success');
          logAdminAction(`${newAdminStatus ?'ترقية وتعيين مسؤول جديد (Admin)' :'سحب صلاحية الإدارة من'}: ${targetUser}`);

          selectPlayerForModeration(targetUser);
          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('خطأ تعديل الصلاحية', err.message,'error');
        } finally {
          toggleAdminRoleBtn.disabled = false;
          if (selectedPlayerState) {
            if (selectedPlayerState.isAdmin) {
              toggleAdminRoleBtn.innerHTML ='<i class="fa-solid fa-user-shield text-xs"></i> <span>سحب صلاحية الإدارة (إلغاء أدمن) ️</span>';
              toggleAdminRoleBtn.className ='w-full py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5';
            } else {
              toggleAdminRoleBtn.innerHTML ='<i class="fa-solid fa-crown text-xs"></i> <span>نقل صلاحية الإدارة لهذا الحساب (Make Admin) </span>';
              toggleAdminRoleBtn.className ='w-full py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20';
            }
          }
        }
      });
    }

    // Toggle Facebook VIP Badge Action
    const toggleFbBtn = document.getElementById('btn-admin-toggle-facebook');
    if (toggleFbBtn) {
      toggleFbBtn.addEventListener('click', async () => {
        if (!selectedPlayer || !selectedPlayerState) {
          showToast('تنبيه','يرجى اختيار لاعب أولاً من القائمة.','warning');
          return;
        }
        const currentFb = Boolean(selectedPlayerState.facebookVerified || (selectedPlayerState.badges && selectedPlayerState.badges.includes('facebook')));
        const newFb = !currentFb;
        selectedPlayerState.facebookVerified = newFb;
        if (!Array.isArray(selectedPlayerState.badges)) selectedPlayerState.badges = [];
        if (newFb && !selectedPlayerState.badges.includes('facebook')) selectedPlayerState.badges.push('facebook');
        if (!newFb) selectedPlayerState.badges = selectedPlayerState.badges.filter(b => b !=='facebook');

        try {
          toggleFbBtn.disabled = true;
          await AppDB.savePlayerState(selectedPlayer, selectedPlayerState, true);
          showToast('شارة فيسبوك', newFb ?`تم منح شارة فيسبوك الزرقاء للاعب ${selectedPlayer} بنجاح!` :`تم سحب الشارة من اللاعب ${selectedPlayer}.`,'success');
          logAdminAction(`${newFb ?'منح' :'سحب'} شارة فيسبوك للاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ شارة', err.message,'error');
        } finally {
          toggleFbBtn.disabled = false;
        }
      });
    }

    // Forgive Player Loan Action (إعفاء وشطب القرض البنكي)
    const forgiveLoanBtn = document.getElementById('btn-admin-forgive-loan');
    if (forgiveLoanBtn) {
      forgiveLoanBtn.addEventListener('click', async () => {
        if (!selectedPlayer || !selectedPlayerState) {
          showToast('إدارة القروض', 'يرجى اختيار لاعب أولاً من القائمة.', 'warning');
          return;
        }

        const loan = selectedPlayerState.activeLoan;
        const loanDue = loan ? Number(loan.totalDue || loan.amount || 0) : 0;
        if (!loan || loanDue <= 0) {
          showToast('إدارة القروض', `اللاعب "${selectedPlayer}" ليس لديه أي قرض بنكي قائم للإعفاء منه.`, 'info');
          return;
        }

        const confirmMsg = `🏦 تأكيد إعفاء وشطب القرض:\n\nهل أنت متأكد من إعفاء اللاعب "${selectedPlayer}" وشطب مديونية القرض البنكي بالكامل بقيمة ${loanDue.toLocaleString()} EGP وفك أي تجميد بنكي ناتج عن التعثر؟`;
        if (!confirm(confirmMsg)) return;

        try {
          forgiveLoanBtn.disabled = true;
          forgiveLoanBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>جاري شطب القرض...</span>';

          selectedPlayerState.activeLoan = null;
          selectedPlayerState.loanCooldownUntil = 0;
          selectedPlayerState.adminModifiedTimestamp = Date.now();

          // Sync active logged-in player in GameEngine if same
          if (selectedPlayer === GameEngine.activeUsername && GameEngine.state) {
            GameEngine.state.activeLoan = null;
            GameEngine.state.loanCooldownUntil = 0;
            try {
              localStorage.setItem(`rasalmal_state_${selectedPlayer}`, JSON.stringify(GameEngine.state));
            } catch (e) {}
            if (typeof renderAll === 'function') renderAll();
          }

          await AppDB.adminSavePlayer(selectedPlayer, selectedPlayerState);
          await AppDB.savePlayerState(selectedPlayer, selectedPlayerState, true);

          showToast('إعفاء من القرض 🏛️', `تم إعفاء اللاعب "${selectedPlayer}" وشطب القرض المستحق بقيمة ${loanDue.toLocaleString()} EGP وفك التجميد بنجاح!`, 'success');
          logAdminAction(`إعفاء وشطب قرض بنكي بقيمة ${loanDue.toLocaleString()} EGP للاعب: ${selectedPlayer}`);

          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ إعفاء القرض', err.message, 'error');
        } finally {
          forgiveLoanBtn.disabled = false;
          forgiveLoanBtn.innerHTML = '<i class="fa-solid fa-hand-holding-dollar text-xs"></i> <span id="admin-forgive-loan-text">إعفاء وشطب القرض البنكي (Forgive Loan)</span>';
        }
      });
    }

    // Inspect Player Referral Report Action (👥 فحص دعوات ومكافآت اللاعب)
    const inspectReferralsBtn = document.getElementById('btn-admin-inspect-referrals');
    let currentAdminRefTargetUser = '';

    if (inspectReferralsBtn) {
      inspectReferralsBtn.addEventListener('click', async () => {
        const targetUser = (selectedPlayer || document.getElementById('admin-p-username')?.textContent || '').replace(/^@/, '').trim();
        if (!targetUser || targetUser === '...' || targetUser === '') {
          showToast('فحص الدعوات', 'يرجى اختيار لاعب أولاً من القائمة.', 'warning');
          return;
        }
        await openAdminReferralModal(targetUser);
      });
    }

    // Clear Device Registry binding for selected player
    const clearDeviceBtn = document.getElementById('btn-admin-clear-device');
    if (clearDeviceBtn && !clearDeviceBtn.dataset.bound) {
      clearDeviceBtn.dataset.bound = 'true';
      clearDeviceBtn.addEventListener('click', async () => {
        const targetUser = (selectedPlayer || document.getElementById('admin-p-username')?.textContent || '').replace(/^@/, '').trim();
        if (!targetUser || targetUser === '...' || targetUser === '') {
          showToast('فك الارتباط', 'يرجى اختيار لاعب أولاً من القائمة.', 'warning');
          return;
        }
        const confirmed = confirm(`⚠️ تأكيد إداري:\n\nهل تريد حذف جميع بصمات الأجهزة المرتبطة بالحساب:\n"${targetUser}"\n\nمن سجل الحماية الأمني؟\n\nسيُسمح للاعب بعدها بإدخال كود دعوة من أي جهاز.`);
        if (!confirmed) return;
        try {
          clearDeviceBtn.disabled = true;
          clearDeviceBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin text-xs"></i><span>جاري المسح...</span>';
          await AppDB.adminClearDeviceFromRegistry(targetUser);
          showToast('تم بنجاح ✅', `تم فك ارتباط جميع الأجهزة المرتبطة بحساب "${targetUser}" من السجل الأمني.`, 'success');
        } catch (err) {
          showToast('خطأ', 'فشل فك الارتباط: ' + err.message, 'error');
        } finally {
          clearDeviceBtn.disabled = false;
          clearDeviceBtn.innerHTML = '<i class="fa-solid fa-fingerprint text-xs"></i><span>🔓 فك ارتباط الجهاز بالسجل الأمني</span>';
        }
      });
    }

    async function openAdminReferralModal(targetUsername) {
      if (typeof targetUsername !== 'string') targetUsername = '';
      targetUsername = (targetUsername || selectedPlayer || document.getElementById('admin-p-username')?.textContent || '').replace(/^@/, '').trim();
      if (!targetUsername || targetUsername === '...' || targetUsername === '') {
        showToast('فحص الدعوات', 'يرجى اختيار لاعب أولاً من القائمة.', 'warning');
        return;
      }

      const modal = document.getElementById('modal-admin-referrals');
      if (!modal) return;

      currentAdminRefTargetUser = targetUsername;

      const targetEl = document.getElementById('adm-ref-target-user');
      const codeEl = document.getElementById('adm-ref-code');
      const totalEl = document.getElementById('adm-ref-total');
      const qualEl = document.getElementById('adm-ref-qualified');
      const pendEl = document.getElementById('adm-ref-pending');
      const tbody = document.getElementById('adm-ref-table-body');
      const inputCodeEl = document.getElementById('adm-ref-input-code');
      const inputRefByEl = document.getElementById('adm-ref-input-referredby');
      const boundInfoEl = document.getElementById('adm-ref-current-bound-info');

      if (targetEl) targetEl.textContent = `@${targetUsername}`;
      if (codeEl) codeEl.textContent = '...';
      if (totalEl) totalEl.textContent = '0';
      if (qualEl) qualEl.textContent = '0';
      if (pendEl) pendEl.textContent = '0';
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-400"><i class="fa-solid fa-spinner animate-spin"></i> جاري فحص سجل السيرفر ودعوات اللاعب...</td></tr>`;

      modal.classList.remove('hidden');

      try {
        const targetState = (selectedPlayer === targetUsername && selectedPlayerState)
          ? selectedPlayerState
          : await AppDB.getPlayerState(targetUsername);

        if (targetState && !targetState.referralCode && window.GameEngine && typeof window.GameEngine.generateReferralCode === 'function') {
          targetState.referralCode = window.GameEngine.generateReferralCode(targetUsername);
        }

        if (inputCodeEl) inputCodeEl.value = (targetState && targetState.referralCode) ? targetState.referralCode : '';
        if (inputRefByEl) inputRefByEl.value = (targetState && (targetState.referredByCode || targetState.referredBy)) ? (targetState.referredByCode || targetState.referredBy) : '';

        if (boundInfoEl) {
          if (targetState && (targetState.referredByCode || targetState.referredBy)) {
            boundInfoEl.textContent = `مرتبط بالصديق: ${targetState.referredByCode || targetState.referredBy} (${targetState.referredBy || 'موصي'})`;
          } else {
            boundInfoEl.textContent = `لم يقم بإدخال كود صديق`;
          }
        }

        const report = await AppDB.getReferralReport(targetUsername);
        if (!report) {
          if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-rose-400">تعذر جلب تقرير الدعوات لهذا اللاعب.</td></tr>`;
          return;
        }

        if (codeEl) codeEl.textContent = report.referralCode || 'لا يوجد';
        if (totalEl) totalEl.textContent = (report.totalInvited || 0).toLocaleString();
        if (qualEl) qualEl.textContent = (report.qualifiedCount || 0).toLocaleString();
        if (pendEl) pendEl.textContent = (report.pendingCount || 0).toLocaleString();

        if (tbody) {
          if (!report.invitees || report.invitees.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-500">لم يقم أي لاعب باستخدام كود هذا اللاعب بعد.</td></tr>`;
          } else {
            tbody.innerHTML = report.invitees.map(inv => {
              const gross = inv.grossWealth || 0;
              const transfers = inv.transfersReceived || 0;
              const selfEarned = inv.selfEarned || 0;
              const qualBadge = inv.isQualified
                ? `<span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-black text-[10px] border border-emerald-500/30">مؤهل ✅ (250k+)</span>`
                : `<span class="px-2 py-0.5 rounded bg-amber-950 text-amber-400 font-bold text-[10px] border border-amber-500/30">قيد التأهيل ⏳</span>`;

              const devList = (inv.devices && inv.devices.length > 0) ? inv.devices.join(', ') : 'غير مسجل';

              return `
                <tr class="hover:bg-slate-900/60 transition">
                  <td class="p-2.5 font-bold text-white font-mono">@${inv.username}</td>
                  <td class="p-2.5 numbers-font font-bold text-slate-200">${gross.toLocaleString()} EGP</td>
                  <td class="p-2.5 numbers-font font-bold text-rose-400">-${transfers.toLocaleString()} EGP</td>
                  <td class="p-2.5 numbers-font font-bold text-emerald-400">${selfEarned.toLocaleString()} EGP</td>
                  <td class="p-2.5">${qualBadge}</td>
                  <td class="p-2.5 text-slate-400 text-[10px]">${inv.accountAgeText || 'جديد'}</td>
                  <td class="p-2.5 font-mono text-[9px] text-slate-500 truncate max-w-[110px]" title="${devList}">${devList}</td>
                  <td class="p-2.5">
                    <button onclick="window.adminUnlinkInvitee('${inv.username}', '${targetUsername}')"
                      class="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/30 rounded text-[10px] font-bold transition cursor-pointer active:scale-95" title="شطب فك ربط هذه الدعوة">
                      فك الربط ❌
                    </button>
                  </td>
                </tr>
              `;
            }).join('');
          }
        }
      } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-rose-400">خطأ: ${err.message}</td></tr>`;
      }
    }
    window.openAdminReferralModal = openAdminReferralModal;

    // Admin Action 1: Save Custom Referral Code for Target Player
    const saveRefCodeBtn = document.getElementById('btn-adm-save-ref-code');
    if (saveRefCodeBtn) {
      saveRefCodeBtn.addEventListener('click', async () => {
        if (!currentAdminRefTargetUser) return;
        const inputCode = document.getElementById('adm-ref-input-code')?.value?.trim().toUpperCase();
        if (!inputCode) {
          showToast('تعديل كود الدعوة', 'يرجى إدخال رمز كود الدعوة الجديد.', 'warning');
          return;
        }

        try {
          saveRefCodeBtn.disabled = true;
          saveRefCodeBtn.textContent = 'جاري الحفظ...';

          const targetState = await AppDB.getPlayerState(currentAdminRefTargetUser);
          if (!targetState) throw new Error("تعذر جلب بيانات الحساب.");

          targetState.referralCode = inputCode;
          targetState.adminModifiedTimestamp = Date.now();

          // Sync local session if same active user
          if (GameEngine.activeUsername && GameEngine.activeUsername.toLowerCase() === currentAdminRefTargetUser.toLowerCase() && GameEngine.state) {
            GameEngine.state.referralCode = inputCode;
            if (typeof GameEngine.forceSaveState === 'function') GameEngine.forceSaveState(true);
          }

          await AppDB.adminSavePlayer(currentAdminRefTargetUser, targetState);
          await AppDB.savePlayerState(currentAdminRefTargetUser, targetState, true);

          showToast('تعديل كود الدعوة 🔑', `تم تغيير كود دعوة اللاعب @${currentAdminRefTargetUser} إلى "${inputCode}" وحفظ السيرفر بنجاح!`, 'success');
          logAdminAction(`تعديل كود دعوة اللاعب ${currentAdminRefTargetUser} إلى: ${inputCode}`);

          await openAdminReferralModal(currentAdminRefTargetUser);
        } catch (err) {
          showToast('خطأ التعديل', err.message, 'error');
        } finally {
          saveRefCodeBtn.disabled = false;
          saveRefCodeBtn.textContent = 'تعديل الكود 💾';
        }
      });
    }

    // Admin Action 2: Save Custom ReferredBy Code / Friend Link
    const saveReferredByBtn = document.getElementById('btn-adm-save-referredby');
    if (saveReferredByBtn) {
      saveReferredByBtn.addEventListener('click', async () => {
        if (!currentAdminRefTargetUser) return;
        const inputRefBy = document.getElementById('adm-ref-input-referredby')?.value?.trim().toUpperCase();
        if (!inputRefBy) {
          showToast('ربط صديق', 'يرجى إدخال كود أو اسم الصديق.', 'warning');
          return;
        }

        try {
          saveReferredByBtn.disabled = true;
          saveReferredByBtn.textContent = 'جاري الربط...';

          const targetState = await AppDB.getPlayerState(currentAdminRefTargetUser);
          if (!targetState) throw new Error("تعذر جلب بيانات الحساب.");

          targetState.referredBy = inputRefBy;
          targetState.referredByCode = inputRefBy;
          targetState.adminModifiedTimestamp = Date.now();

          if (GameEngine.activeUsername && GameEngine.activeUsername.toLowerCase() === currentAdminRefTargetUser.toLowerCase() && GameEngine.state) {
            GameEngine.state.referredBy = inputRefBy;
            GameEngine.state.referredByCode = inputRefBy;
            if (typeof GameEngine.forceSaveState === 'function') GameEngine.forceSaveState(true);
          }

          await AppDB.adminSavePlayer(currentAdminRefTargetUser, targetState);
          await AppDB.savePlayerState(currentAdminRefTargetUser, targetState, true);

          showToast('ربط صديق 🔗', `تم ربط حساب @${currentAdminRefTargetUser} بكود الصديق "${inputRefBy}" بنجاح!`, 'success');
          logAdminAction(`ربط حساب ${currentAdminRefTargetUser} بكود الدعوة: ${inputRefBy}`);

          await openAdminReferralModal(currentAdminRefTargetUser);
        } catch (err) {
          showToast('خطأ الربط', err.message, 'error');
        } finally {
          saveReferredByBtn.disabled = false;
          saveReferredByBtn.textContent = 'ربط 🔗';
        }
      });
    }

    // Admin Action 3: Unbind ReferredBy Code
    const unbindReferredByBtn = document.getElementById('btn-adm-unbind-referredby');
    if (unbindReferredByBtn) {
      unbindReferredByBtn.addEventListener('click', async () => {
        if (!currentAdminRefTargetUser) return;
        if (!confirm(`هل أنت متأكد من فك ربط كود الصديق لللاعب @${currentAdminRefTargetUser}؟ سيتمكن من إدخال كود جديد.`)) return;

        try {
          unbindReferredByBtn.disabled = true;
          unbindReferredByBtn.textContent = 'جاري الفك...';

          const targetState = await AppDB.getPlayerState(currentAdminRefTargetUser);
          if (!targetState) throw new Error("تعذر جلب بيانات الحساب.");

          targetState.referredBy = null;
          targetState.referredByCode = null;
          targetState.adminModifiedTimestamp = Date.now();

          if (GameEngine.activeUsername && GameEngine.activeUsername.toLowerCase() === currentAdminRefTargetUser.toLowerCase() && GameEngine.state) {
            GameEngine.state.referredBy = null;
            GameEngine.state.referredByCode = null;
            if (typeof GameEngine.forceSaveState === 'function') GameEngine.forceSaveState(true);
          }

          await AppDB.adminSavePlayer(currentAdminRefTargetUser, targetState);
          await AppDB.savePlayerState(currentAdminRefTargetUser, targetState, true);

          showToast('فك الربط ❌', `تم فك ربط كود الصديق للاعب @${currentAdminRefTargetUser} بنجاح!`, 'success');
          logAdminAction(`فك ربط كود الصديق للاعب: ${currentAdminRefTargetUser}`);

          await openAdminReferralModal(currentAdminRefTargetUser);
        } catch (err) {
          showToast('خطأ فك الربط', err.message, 'error');
        } finally {
          unbindReferredByBtn.disabled = false;
          unbindReferredByBtn.textContent = 'فك الربط ❌';
        }
      });
    }

    // Global Admin Action: Unlink Specific Invitee from Target Referrer
    window.adminUnlinkInvitee = async function(inviteeUser, referrerUser) {
      if (!inviteeUser) return;
      if (!confirm(`🚫 تأكيد الإجراء الإداري:\nهل أنت متأكد من فك ربط وشطب الدعوة للاعب @${inviteeUser} من قائمة دعوات @${referrerUser}؟`)) return;

      try {
        showToast('فك ربط الدعوة', `جاري شطب ربط اللاعب @${inviteeUser}...`, 'info');

        const inviteeState = await AppDB.getPlayerState(inviteeUser);
        if (!inviteeState) throw new Error(`تعذر جلب بيانات اللاعب @${inviteeUser}.`);

        inviteeState.referredBy = null;
        inviteeState.referredByCode = null;
        inviteeState.adminModifiedTimestamp = Date.now();

        if (GameEngine.activeUsername && GameEngine.activeUsername.toLowerCase() === inviteeUser.toLowerCase() && GameEngine.state) {
          GameEngine.state.referredBy = null;
          GameEngine.state.referredByCode = null;
          if (typeof GameEngine.forceSaveState === 'function') GameEngine.forceSaveState(true);
        }

        await AppDB.adminSavePlayer(inviteeUser, inviteeState);
        await AppDB.savePlayerState(inviteeUser, inviteeState, true);

        showToast('شطب الدعوة ✂️', `تم فك ربط اللاعب @${inviteeUser} من دعوات @${referrerUser} بنجاح!`, 'success');
        logAdminAction(`شطب وفك ربط دعوة اللاعب ${inviteeUser} من الموصي ${referrerUser}`);

        await openAdminReferralModal(referrerUser);
      } catch (err) {
        showToast('خطأ الشطب', err.message, 'error');
      }
    };

    // RESET SPECIFIC PLAYER ACCOUNT
    const resetPlayerAccountBtn = document.getElementById('btn-admin-reset-player-account');
    if (resetPlayerAccountBtn) {
      resetPlayerAccountBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        const confirmMsg =`تحذير قاطع: هل أنت متأكد من تصفير حساب اللاعب"${selectedPlayer}" بالكامل من كل شيء؟\nسيتم تصفير الكاش والبنك والأموال المشبوهة، ومسح كافة الأصول والشركات والأسهم والاستثمارات والمخزون ونقاط الخبرة والرتبة والملاحقات (تصفير شامل 0 EGP).`;
        if (!confirm(confirmMsg)) return;

        try {
          const freshData = await AppDB.adminResetPlayer(selectedPlayer);

          // If active user is the reset user, sync immediately
          if (selectedPlayer === GameEngine.activeUsername) {
            applyCompleteZeroStateToGameEngine(selectedPlayer);
            renderAll();
          }

          showToast('تصفير الحساب',`تم تصفير حساب اللاعب"${selectedPlayer}" بالكامل من كل شيء بنجاح (0 EGP).`,'success');
          logAdminAction(`تصفير شامل ونهائي لكافة أرصدة وممتلكات حساب اللاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('خطأ تصفير الحساب', err.message,'error');
        }
      });
    }

    // DELETE SPECIFIC PLAYER ACCOUNT
    const deletePlayerAccountBtn = document.getElementById('btn-admin-delete-player-account');
    if (deletePlayerAccountBtn) {
      deletePlayerAccountBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        if (!confirm(`️ تحذير نهائي: هل أنت متأكد من حذف وثيقة وحساب اللاعب"${selectedPlayer}" نهائياً من الخوادم؟`)) return;

        try {
          await AppDB.adminDeletePlayer(selectedPlayer);
          showToast('حذف الحساب',`تم حذف حساب اللاعب ${selectedPlayer} نهائياً من قاعدة البيانات.`,'success');
          logAdminAction(`حذف نهائي لوثيقة حساب اللاعب: ${selectedPlayer}`);

          if (resultCard) resultCard.classList.add('hidden');
          selectedPlayer = null;
          selectedPlayerState = null;
          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('خطأ حذف الحساب', err.message,'error');
        }
      });
    }

    // ─────────────────────────────────────────────
    // ─────────────────────────────────────────────
    //  MODULE: LIVE PLAYER ACTIVITY AUDIT & EXPLOIT DETECTION
    // ─────────────────────────────────────────────
    const inspectLogsBtn = document.getElementById('btn-admin-inspect-logs');
    const logModal = document.getElementById('admin-player-log-modal');
    const closeLogModalBtn = document.getElementById('btn-admin-close-log-modal');
    const logFeed = document.getElementById('admin-player-log-feed');
    const exportLogBtn = document.getElementById('btn-admin-export-player-log');
    let currentLogFilter ='all';

    function evaluatePlayerExploitRisk(pState, transfers = []) {
      const issues = [];
      let riskLevel ='safe'; //'safe' |'warning' |'critical'

      const netWorth = Number(pState.netWorth || 0);
      const cash = Number(pState.cash || 0);
      const bank = Number(pState.bank || 0);
      const xp = Number(pState.xp || 0);
      const createdAt = Number(pState.createdAt || pState.created_at || Date.now());
      const ageHours = Math.max(0.05, (Date.now() - createdAt) / (1000 * 3600));

      // 1. Wealth Velocity vs Account Age
      const hourlyGain = netWorth / ageHours;
      if (netWorth > 500000000 && ageHours < 1) {
        riskLevel ='critical';
        issues.push(`تضخم ثروة فائق السرعة (+${(netWorth / 1000000).toFixed(1)}M ج.م في أقل من ساعة)`);
      } else if (netWorth > 100000000 && ageHours < 0.5) {
        riskLevel ='critical';
        issues.push(`حساب جديد جداً بثروة ضخمة تتجاوز 100M ج.م`);
      } else if (hourlyGain > 250000000) {
        if (riskLevel !=='critical') riskLevel ='warning';
        issues.push(`معدل نمو ثروة مرتفع جداً (${(hourlyGain / 1000000).toFixed(1)}M ج.م/ساعة)`);
      }

      // 2. Transfers Influx Anomaly
      let totalReceivedTransfers = 0;
      (transfers || []).forEach(t => {
        if ((t.recipient ||'').toLowerCase() === (pState.username ||'').toLowerCase()) {
          const amt = Number(t.amount || 0);
          totalReceivedTransfers += amt;
        }
      });
      if (totalReceivedTransfers > 100000000) {
        if (riskLevel !=='critical') riskLevel ='warning';
        issues.push(`تلقى تحويلات مالية واردة ضخمة بإجمالي ${(totalReceivedTransfers / 1000000).toFixed(1)}M ج.م`);
      }

      // 3. Casino Daily Profit Check
      const casinoProfit = Number(pState.dailyCasinoNetProfit || 0);
      if (casinoProfit > 18000000) {
        if (riskLevel !=='critical') riskLevel ='warning';
        issues.push(`أرباح كازينو مرتفعة جداً اليوم (+${(casinoProfit / 1000000).toFixed(1)}M ج.م)`);
      }

      // 4. Dirty cash accumulation vs laundering capacity
      const dirtyCash = Number(pState.dirtyCash || pState.dirty_cash || 0);
      if (dirtyCash > 50000000) {
        issues.push(`تراكم كاش مشبوه غير مغسول بقيمة ${(dirtyCash / 1000000).toFixed(1)}M ج.م`);
      }

      return {
        riskLevel,
        issues,
        ageHours: ageHours.toFixed(1),
        totalReceivedTransfers
      };
    }

    function renderPlayerLogFeed(pState) {
      if (!logFeed) return;
      const logs = (pState && (pState.combinedActivityLog || pState.activityLog)) || [];
      const filtered = logs.filter(l => currentLogFilter ==='all' || l.category === currentLogFilter);

      const countBadge = document.getElementById('adm-log-count-badge');
      if (countBadge) countBadge.textContent =`${filtered.length} حركة`;

      if (filtered.length === 0) {
        logFeed.innerHTML =`
          <div class="p-8 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
            <i class="fa-solid fa-clipboard-list text-3xl mb-2 text-slate-600 block"></i>
            <span class="text-xs">لا توجد حركات مسجلة لهذا اللاعب في تصنيف "${escapeHtml(currentLogFilter)}" حتى الآن.</span>
          </div>`;
        return;
      }

      logFeed.innerHTML ='';
      filtered.forEach(item => {
        const div = document.createElement('div');
        div.className ='p-3 bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3 transition shadow-sm';

        let icon ='<i class="fa-solid fa-circle-info text-sky-400"></i>';
        let badgeColor ='bg-sky-500/10 text-sky-400 border-sky-500/20';

        if (item.category ==='work') {
          icon ='<i class="fa-solid fa-briefcase text-blue-400"></i>';
          badgeColor ='bg-blue-500/10 text-blue-400 border-blue-500/20';
        } else if (item.category ==='business') {
          icon ='<i class="fa-solid fa-city text-emerald-400"></i>';
          badgeColor ='bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        } else if (item.category ==='transfers') {
          icon ='<i class="fa-solid fa-money-bill-transfer text-violet-400"></i>';
          badgeColor ='bg-violet-500/10 text-violet-400 border-violet-500/20';
        } else if (item.category ==='banking') {
          icon ='<i class="fa-solid fa-building-columns text-teal-400"></i>';
          badgeColor ='bg-teal-500/10 text-teal-400 border-teal-500/20';
        } else if (item.category ==='stock') {
          icon ='<i class="fa-solid fa-chart-line text-yellow-400"></i>';
          badgeColor ='bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        } else if (item.category ==='investment' || item.category ==='assets') {
          icon ='<i class="fa-solid fa-house-chimney text-amber-400"></i>';
          badgeColor ='bg-amber-500/10 text-amber-400 border-amber-500/20';
        } else if (item.category ==='casino') {
          icon ='<i class="fa-solid fa-dice text-purple-400"></i>';
          badgeColor ='bg-purple-500/10 text-purple-400 border-purple-500/20';
        } else if (item.category ==='trade') {
          icon ='<i class="fa-solid fa-ship text-cyan-400"></i>';
          badgeColor ='bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
        } else if (item.category ==='blackmarket' || item.category ==='dark') {
          icon ='<i class="fa-solid fa-skull-crossbones text-rose-400"></i>';
          badgeColor ='bg-rose-500/10 text-rose-400 border-rose-500/20';
        } else if (item.category ==='store') {
          icon ='<i class="fa-solid fa-bag-shopping text-cyan-400"></i>';
          badgeColor ='bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
        }

        const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) :'--:--';
        const fullDateStr = item.timestamp ? new Date(item.timestamp).toLocaleDateString('ar-EG', { month:'numeric', day:'numeric' }) :'';

        div.innerHTML =`
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-xs border border-slate-800 shrink-0">
              ${icon}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-white text-xs truncate">${item.action}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded border ${badgeColor} font-sans">${item.category}</span>
              </div>
              <div class="text-[11px] text-slate-300 mt-0.5 leading-tight">${item.details}</div>
            </div>
          </div>
          <div class="text-right shrink-0">
            <div class="text-[10px] text-slate-300 font-mono">${dateStr}</div>
            <div class="text-[9px] text-slate-500">${fullDateStr}</div>
          </div>`;
        logFeed.appendChild(div);
      });
    }

    if (inspectLogsBtn && logModal) {
      inspectLogsBtn.addEventListener('click', async () => {
        const targetUser = (selectedPlayer || document.getElementById('admin-p-username')?.textContent ||'').replace(/^@/,'').trim();
        if (!targetUser || targetUser ==='...' || targetUser ==='') {
          showToast('سجل النشاط','يرجى تحديد واختيار لاعب أولاً من قائمة اللاعبين.','warning');
          return;
        }

        const originalBtnHtml = inspectLogsBtn.innerHTML;
        inspectLogsBtn.disabled = true;
        inspectLogsBtn.innerHTML =`<i class="fa-solid fa-spinner fa-spin text-sm"></i><span>جاري الفحص...</span>`;

        try {
          // Strictly single, on-demand query for selected player
          const [pState, transfers] = await Promise.all([
            AppDB.adminGetPlayer(targetUser),
            AppDB.getPlayerTransfers(targetUser, 40).catch(() => [])
          ]);

          if (!pState) throw new Error("تعذر جلب بيانات اللاعب من الخادم.");

          // Map transfers into activity log entries
          const transferLogs = (transfers || []).map(t => {
            const isSender = (t.sender ||'').toLowerCase() === targetUser.toLowerCase();
            const amt = Number(t.amount || 0).toLocaleString();
            return {
              timestamp: Number(t.created_at || t.timestamp || Date.now()),
              action: isSender ?'إرسال تحويل بنكي' :'استلام تحويل بنكي',
              details: isSender ?`تحويل مبلغ ${amt} ج.م إلى @${t.recipient}` :`استلام مبلغ ${amt} ج.م من @${t.sender}`,
              category:'transfers'
            };
          });

          // Merge player activities and wire transfers
          const rawLogs = (pState.activityLog || []).concat(transferLogs);
          // Sort descending by timestamp
          pState.combinedActivityLog = rawLogs.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));

          selectedPlayerState = pState;
          document.getElementById('adm-log-modal-username').textContent =`@${targetUser}`;
          document.getElementById('adm-log-stat-worth').textContent =`${(pState.netWorth || 0).toLocaleString()} EGP`;
          document.getElementById('adm-log-stat-cash').textContent =`${((pState.cash || 0) + (pState.bank || 0)).toLocaleString()} EGP`;
          document.getElementById('adm-log-stat-heat').textContent =`${pState.heatLevel || 0} / 5`;
          document.getElementById('adm-log-stat-jail').textContent = (pState.jailTimer > 0) ?`مسجون (${pState.jailTimer}ث)` :'حر طليق';

          // Exploit & Anomaly Analysis Radar
          const audit = evaluatePlayerExploitRisk(pState, transfers);
          const exploitBanner = document.getElementById('adm-log-exploit-banner');
          const exploitIcon = document.getElementById('adm-exploit-icon');
          const exploitStatus = document.getElementById('adm-exploit-status');
          const exploitBadge = document.getElementById('adm-exploit-badge');
          const exploitDetail = document.getElementById('adm-exploit-detail');

          if (audit.riskLevel ==='critical') {
            if (exploitIcon) {
              exploitIcon.className ='w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-sm shrink-0 animate-pulse';
              exploitIcon.innerHTML ='<i class="fa-solid fa-triangle-exclamation"></i>';
            }
            if (exploitBadge) {
              exploitBadge.className ='px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30';
              exploitBadge.textContent ='خطر / شبهة ثغرة مؤكدة';
            }
            if (exploitStatus) exploitStatus.textContent ='تحليل الثغرات: تم رصد مؤشرات استغلال غير مشروعة!';
            if (exploitDetail) exploitDetail.textContent = audit.issues.join(' •');
          } else if (audit.riskLevel ==='warning') {
            if (exploitIcon) {
              exploitIcon.className ='w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-sm shrink-0';
              exploitIcon.innerHTML ='<i class="fa-solid fa-circle-exclamation"></i>';
            }
            if (exploitBadge) {
              exploitBadge.className ='px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30';
              exploitBadge.textContent ='شبهة تستدعي التحقق';
            }
            if (exploitStatus) exploitStatus.textContent ='تحليل الثغرات: نشاط مالي متسارع يحتاج لمراجعة';
            if (exploitDetail) exploitDetail.textContent = audit.issues.join(' •');
          } else {
            if (exploitIcon) {
              exploitIcon.className ='w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-sm shrink-0';
              exploitIcon.innerHTML ='<i class="fa-solid fa-shield-check"></i>';
            }
            if (exploitBadge) {
              exploitBadge.className ='px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
              exploitBadge.textContent ='سليم وطبيعي';
            }
            if (exploitStatus) exploitStatus.textContent ='تحليل الثغرات: لا توجد شبهات تسارع ثروة أو تحويلات مريبة';
            if (exploitDetail) exploitDetail.textContent =`عمر الحساب: ~${audit.ageHours} ساعة • إجمالي التحويلات الواردة: ${(audit.totalReceivedTransfers || 0).toLocaleString()} ج.م`;
          }

          currentLogFilter ='all';
          const filterPills = document.querySelectorAll('.btn-log-filter');
          filterPills.forEach(b => {
            const f = b.getAttribute('data-log-filter');
            if (f ==='all') {
              b.className ='btn-log-filter px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg font-bold transition';
            } else {
              b.className ='btn-log-filter px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg font-bold transition';
            }
          });

          renderPlayerLogFeed(pState);
          logModal.classList.remove('hidden');
        } catch (e) {
          showToast('سجل النشاط', e.message,'error');
        } finally {
          inspectLogsBtn.disabled = false;
          inspectLogsBtn.innerHTML = originalBtnHtml;
        }
      });
    }

    // Export / Copy player audit log
    if (exportLogBtn) {
      exportLogBtn.addEventListener('click', () => {
        if (!selectedPlayerState) {
          showToast('تصدير التقرير','لا توجد بيانات نشاط محملة حالياً.','warning');
          return;
        }
        try {
          const p = selectedPlayerState;
          const audit = evaluatePlayerExploitRisk(p, []);
          const logs = p.combinedActivityLog || p.activityLog || [];

          let reportText =`=========================================\n`;
          reportText +=`تقرير التدقيق الجنائي ونشاط اللاعب: @${p.username}\n`;
          reportText +=`تاريخ التقرير: ${new Date().toLocaleString('ar-EG')}\n`;
          reportText +=`صافي الثروة: ${(p.netWorth || 0).toLocaleString()} EGP\n`;
          reportText +=`الكاش: ${(p.cash || 0).toLocaleString()} | البنك: ${(p.bank || 0).toLocaleString()}\n`;
          reportText +=`التقييم الأمني: ${audit.riskLevel ==='safe' ?'سليم' : audit.riskLevel ==='warning' ?'مشبوه' :'حرج - شبهة ثغرة'}\n`;
          if (audit.issues.length) {
            reportText +=`الملاحظات والشبهات:\n -` + audit.issues.join('\n -') +`\n`;
          }
          reportText +=`=========================================\n`;
          reportText +=`سجل الحركات الزمنية (${logs.length} عملية):\n`;
          logs.forEach((l, idx) => {
            const time = l.timestamp ? new Date(l.timestamp).toLocaleString('ar-EG') :'غير محدد';
            reportText +=`[${idx + 1}] ${time} | [${l.category}] ${l.action}: ${l.details}\n`;
          });

          // Copy to clipboard
          navigator.clipboard.writeText(reportText).then(() => {
            showToast('تم النسخ والتصدير','تم نسخ تقرير نشاط اللاعب كاملاً إلى الحافظة بنجاح.','success');
          }).catch(() => {
            const blob = new Blob([reportText], { type:'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download =`audit_log_${p.username}_${Date.now()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('تحميل التقرير','تم تنزيل ملف فحص نشاط اللاعب كملف نصي.','success');
          });
        } catch (err) {
          showToast('تصدير التقرير', err.message,'error');
        }
      });
    }

    // ==================== MODULE: DIRECT ADMIN POPUP SENDER TO PLAYER ====================
    function openDirectPopupSender() {
      const targetUser = (selectedPlayer || document.getElementById('admin-p-username')?.textContent || '').replace(/^@/, '').trim();
      if (!targetUser || targetUser === '...' || targetUser === '') {
        if (typeof showToast === 'function') {
          showToast('إرسال تنبيه منبثق', 'يرجى تحديد واختيار لاعب أولاً من قائمة اللاعبين.', 'warning');
        } else {
          alert('يرجى تحديد واختيار لاعب أولاً من قائمة اللاعبين.');
        }
        return;
      }
      const targetUserBadge = document.getElementById('adm-popup-target-user');
      const popupMsgInput = document.getElementById('adm-popup-message-input');
      const popupTitleInput = document.getElementById('adm-popup-title-input');
      const popupStyleSelect = document.getElementById('adm-popup-style');
      const sendPopupModal = document.getElementById('modal-admin-send-player-popup');

      if (targetUserBadge) targetUserBadge.textContent = `@${targetUser}`;
      if (popupMsgInput) popupMsgInput.value = '';
      if (popupTitleInput) popupTitleInput.value = 'تنبيه إداري مباشر 📢';
      if (popupStyleSelect) popupStyleSelect.value = 'warning';
      if (sendPopupModal) sendPopupModal.classList.remove('hidden');
      if (popupMsgInput) setTimeout(() => popupMsgInput.focus(), 150);
    }

    function closeDirectPopupSender() {
      const sendPopupModal = document.getElementById('modal-admin-send-player-popup');
      if (sendPopupModal) sendPopupModal.classList.add('hidden');
    }

    let _isSendingPopupInProgress = false;
    async function confirmSendPopupAction() {
      if (_isSendingPopupInProgress) {
        console.warn('[Admin Popup] Already sending, ignoring duplicate trigger.');
        return;
      }

      const targetUser = (selectedPlayer || document.getElementById('admin-p-username')?.textContent || '').replace(/^@/, '').trim();
      if (!targetUser) {
        showToast('إرسال تنبيه', 'تعذر تحديد اللاعب المستهدف.', 'error');
        return;
      }

      const popupTitleInput = document.getElementById('adm-popup-title-input');
      const popupMsgInput = document.getElementById('adm-popup-message-input');
      const popupStyleSelect = document.getElementById('adm-popup-style');
      const confirmSendPopupBtn = document.getElementById('btn-confirm-send-admin-popup');

      const title = popupTitleInput ? popupTitleInput.value.trim() : 'تنبيه إداري';
      const message = popupMsgInput ? popupMsgInput.value.trim() : '';
      const style = popupStyleSelect ? popupStyleSelect.value : 'warning';

      if (!message) {
        showToast('تنبيه ناقص', 'يرجى كتابة نص الرسالة المنبثقة أولاً قبل الإرسال.', 'warning');
        if (popupMsgInput) popupMsgInput.focus();
        return;
      }

      try {
        _isSendingPopupInProgress = true;
        if (confirmSendPopupBtn) {
          confirmSendPopupBtn.disabled = true;
          confirmSendPopupBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>جاري إرسال الشاشة المنبثقة...</span>';
        }

        const popupPayload = {
          title: title || 'تنبيه إداري مباشر',
          message: message,
          style: style || 'warning',
          sentAt: Date.now()
        };

        // 1. Send via mailbox system (delivered in real-time)
        await AppDB.sendMail('إدارة اللعبة (Admin)', targetUser, 'admin_popup', popupPayload);

        // 2. Also inject directly into player state if player exists in database
        try {
          const pState = await AppDB.adminGetPlayer(targetUser);
          if (pState) {
            pState.pendingAdminPopup = popupPayload;
            pState.adminModifiedTimestamp = Date.now();
            await AppDB.adminSavePlayer(targetUser, pState);
          }
        } catch (e) {
          console.warn('[Admin Popup] Optional direct state injection skipped:', e);
        }

        // 3. Log action
        logAdminAction(`إرسال شاشة منبثقة للاعب [${targetUser}]: "${title}" - ${message.substring(0, 50)}...`);

        showToast('تم الإرسال بنجاح 🚀', `تم إرسال الشاشة المنبثقة للاعب "${targetUser}" بنجاح! ستظهر في منتصف شاشته فوراً.`, 'success');

        closeDirectPopupSender();
      } catch (err) {
        showToast('فشل الإرسال', err.message, 'error');
      } finally {
        _isSendingPopupInProgress = false;
        if (confirmSendPopupBtn) {
          confirmSendPopupBtn.disabled = false;
          confirmSendPopupBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>إرسال التنبيه الآن 🚀</span>';
        }
      }
    }

    // Attach popup window handlers and listeners
    window.openDirectPopupSender = openDirectPopupSender;
    window.closeDirectPopupSender = closeDirectPopupSender;
    window.confirmSendPopupAction = confirmSendPopupAction;

    const openPopupModalBtn = document.getElementById('btn-admin-open-popup-modal');
    if (openPopupModalBtn) openPopupModalBtn.onclick = openDirectPopupSender;

    const closePopupModalBtn = document.getElementById('btn-close-admin-popup-modal');
    if (closePopupModalBtn) closePopupModalBtn.onclick = closeDirectPopupSender;

    const cancelPopupModalBtn = document.getElementById('btn-cancel-admin-popup');
    if (cancelPopupModalBtn) cancelPopupModalBtn.onclick = closeDirectPopupSender;

    const confirmSendPopupBtn = document.getElementById('btn-confirm-send-admin-popup');
    if (confirmSendPopupBtn) confirmSendPopupBtn.onclick = confirmSendPopupAction;

    // ==================== MODULE: DIRECT ADMIN PACKAGE SENDER TO PLAYER ====================
    async function openSendPackageModal() {
      const targetUser = (selectedPlayer || document.getElementById('admin-p-username')?.textContent || '').replace(/^@/, '').trim();
      if (!targetUser || targetUser === '...' || targetUser === '') {
        if (typeof showToast === 'function') {
          showToast('إرسال حزمة', 'يرجى تحديد واختيار لاعب أولاً من قائمة اللاعبين.', 'warning');
        } else {
          alert('يرجى تحديد واختيار لاعب أولاً من قائمة اللاعبين.');
        }
        return;
      }

      const sendPkgUserBadge = document.getElementById('adm-send-pkg-username');
      if (sendPkgUserBadge) sendPkgUserBadge.textContent = `@${targetUser}`;

      const templateSelect = document.getElementById('adm-send-pkg-template-select');

      // Populate template dropdown from cache or DB
      try {
        if (!_currentTopupPackagesCache || _currentTopupPackagesCache.length === 0) {
          if (typeof AppDB !== 'undefined' && typeof AppDB.getTopupPackages === 'function') {
            _currentTopupPackagesCache = await AppDB.getTopupPackages();
          }
        }
        if (templateSelect) {
          templateSelect.innerHTML = '<option value="">-- تخصيص حزمة يدوياً بدون قالب --</option>';
          if (Array.isArray(_currentTopupPackagesCache)) {
            _currentTopupPackagesCache.forEach(pkg => {
              const opt = document.createElement('option');
              opt.value = pkg.id;
              const isHidden = (pkg.hidden === true || pkg.visible === false);
              opt.textContent = `📦 ${pkg.name} (${Number(pkg.price || 0).toLocaleString()} EGP)${isHidden ? ' 🔒 [مخفية بالمتجر]' : ''}`;
              templateSelect.appendChild(opt);
            });
          }

          if (!templateSelect._hasPkgListener) {
            templateSelect._hasPkgListener = true;
            templateSelect.addEventListener('change', () => {
              const pkgId = templateSelect.value;
              if (!pkgId || !Array.isArray(_currentTopupPackagesCache)) return;
              const found = _currentTopupPackagesCache.find(p => p.id === pkgId);
              if (!found) return;

              const rewards = found.rewards || {};
              const pkgNameInp = document.getElementById('adm-send-pkg-name');
              const pkgBadgeInp = document.getElementById('adm-send-pkg-badge');
              const pkgCashInp = document.getElementById('adm-send-pkg-cash');
              const pkgBankInp = document.getElementById('adm-send-pkg-bank');
              const pkgXpInp = document.getElementById('adm-send-pkg-xp');

              if (pkgNameInp) pkgNameInp.value = found.name || 'حزمة متجر مميزة';
              if (pkgBadgeInp) pkgBadgeInp.value = found.customBadge || found.badgeTitle || rewards.customBadge || rewards.badgeTitle || '';
              if (pkgCashInp) pkgCashInp.value = Number(found.cash !== undefined ? found.cash : (rewards.cash || 0));
              if (pkgBankInp) pkgBankInp.value = Number(found.bank !== undefined ? found.bank : (rewards.bank || 0));
              if (pkgXpInp) pkgXpInp.value = Number(found.xp !== undefined ? found.xp : (rewards.xp || 0));

              const items = found.items || rewards.items || {};
              const itemShieldInp = document.getElementById('adm-send-pkg-item-shield');
              const itemServerInp = document.getElementById('adm-send-pkg-item-server');
              const itemMinerInp = document.getElementById('adm-send-pkg-item-miner');
              const itemDronesInp = document.getElementById('adm-send-pkg-item-drones');

              if (itemShieldInp) itemShieldInp.value = Number(items.legalShield || 0);
              if (itemServerInp) itemServerInp.value = Number(items.offshoreServer || items.offshore_account || 0);
              if (itemMinerInp) itemMinerInp.value = Number(items.cryptoMiner || 0);
              if (itemDronesInp) itemDronesInp.value = Number(items.securityDrones || items.vip_casino_pass || 0);
            });
          }
        }
      } catch (e) {
        console.warn('Failed loading package templates:', e);
      }

      const sendPkgModal = document.getElementById('modal-admin-send-package');
      if (sendPkgModal) sendPkgModal.classList.remove('hidden');
    }

    function closeSendPackageModal() {
      const sendPkgModal = document.getElementById('modal-admin-send-package');
      if (sendPkgModal) sendPkgModal.classList.add('hidden');
    }

    let _isSendingPackageInProgress = false;
    async function confirmSendPackageAction() {
      if (_isSendingPackageInProgress) {
        console.warn('[Admin Package] Already sending, ignoring duplicate trigger.');
        return;
      }

      const targetUser = (selectedPlayer || document.getElementById('admin-p-username')?.textContent || '').replace(/^@/, '').trim();
      if (!targetUser) {
        showToast('إرسال حزمة', 'تعذر تحديد اللاعب المستهدف.', 'error');
        return;
      }

      const pkgNameInp = document.getElementById('adm-send-pkg-name');
      const pkgBadgeInp = document.getElementById('adm-send-pkg-badge');
      const pkgCashInp = document.getElementById('adm-send-pkg-cash');
      const pkgBankInp = document.getElementById('adm-send-pkg-bank');
      const pkgXpInp = document.getElementById('adm-send-pkg-xp');
      const pkgNoteInp = document.getElementById('adm-send-pkg-note');

      const itemShieldInp = document.getElementById('adm-send-pkg-item-shield');
      const itemServerInp = document.getElementById('adm-send-pkg-item-server');
      const itemMinerInp = document.getElementById('adm-send-pkg-item-miner');
      const itemDronesInp = document.getElementById('adm-send-pkg-item-drones');
      const confirmSendPkgBtn = document.getElementById('btn-confirm-send-pkg');

      const pkgName = pkgNameInp ? pkgNameInp.value.trim() : 'حزمة الدعم الإداري 🎁';
      const customBadge = pkgBadgeInp ? pkgBadgeInp.value.trim() : '';
      const addCash = Number(pkgCashInp ? pkgCashInp.value : 0);
      const addBank = Number(pkgBankInp ? pkgBankInp.value : 0);
      const addXp = Number(pkgXpInp ? pkgXpInp.value : 0);
      const note = pkgNoteInp ? pkgNoteInp.value.trim() : 'هدية وتكريم خاص من إدارة اللعبة!';

      const items = {};
      const shields = Number(itemShieldInp ? itemShieldInp.value : 0);
      const servers = Number(itemServerInp ? itemServerInp.value : 0);
      const miners = Number(itemMinerInp ? itemMinerInp.value : 0);
      const drones = Number(itemDronesInp ? itemDronesInp.value : 0);
      if (shields > 0) items.legalShield = shields;
      if (servers > 0) items.offshoreServer = servers;
      if (miners > 0) items.cryptoMiner = miners;
      if (drones > 0) items.securityDrones = drones;

      if (!pkgName) {
        showToast('بيانات ناقصة', 'يرجى كتابة اسم الحزمة أولاً.', 'warning');
        return;
      }

      if (addCash <= 0 && addBank <= 0 && addXp <= 0 && !customBadge && Object.keys(items).length === 0) {
        showToast('حزمة فارغة', 'يرجى تحديد مكافأة واحدة على الأقل (كاش، بنك، خبرة، وسام، أو معدات).', 'warning');
        return;
      }

      const confirmMsg = `🎁 تأكيد إرسال الحزمة الفورية:\n\nهل أنت متأكد من إرسال [${pkgName}] للاعب "${targetUser}"؟\n` +
        (addCash > 0 ? `• كاش مالي: +${addCash.toLocaleString()} EGP\n` : '') +
        (addBank > 0 ? `• إيداع بنكي: +${addBank.toLocaleString()} EGP\n` : '') +
        (addXp > 0 ? `• نقاط خبرة: +${addXp.toLocaleString()} XP\n` : '') +
        (customBadge ? `• وسام شرفي: [${customBadge}]\n` : '') +
        `\nستصل الحزمة للاعب فوراً وتظهر في منتصف شاشته.`;

      if (!confirm(confirmMsg)) return;

      try {
        _isSendingPackageInProgress = true;
        if (confirmSendPkgBtn) {
          confirmSendPkgBtn.disabled = true;
          confirmSendPkgBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>جاري إرسال الحزمة وشحن حساب اللاعب...</span>';
        }

        const ts = Date.now();

        // 1. Fetch fresh player doc from database
        const freshPlayer = await AppDB.adminGetPlayer(targetUser);
        if (!freshPlayer) {
          throw new Error(`تعذر العثور على حساب اللاعب "${targetUser}"`);
        }

        const currentCash = Number(freshPlayer.cash || 0);
        const currentBank = Number(freshPlayer.bank || 0);
        const currentXp = Number(freshPlayer.xp || 0);

        const newCash = currentCash + addCash;
        const newBank = currentBank + addBank;
        const newXp = currentXp + addXp;
        const newWorth = Number(freshPlayer.netWorth || 0) + addCash + addBank;

        freshPlayer.cash = newCash;
        freshPlayer.bank = newBank;
        freshPlayer.xp = newXp;
        freshPlayer.netWorth = newWorth;
        freshPlayer.adminModifiedTimestamp = ts;

        if (customBadge) {
          freshPlayer.customBadge = customBadge;
          freshPlayer.badgeTitle = customBadge;
        }

        // Apply VIP package features (Chat Glow, Verification Badge, Profile customization)
        const templateSelect = document.getElementById('adm-send-pkg-template');
        const selectedPkgId = templateSelect ? templateSelect.value : '';
        const foundPkg = Array.isArray(_currentTopupPackagesCache) ? _currentTopupPackagesCache.find(p => p.id === selectedPkgId) : null;

        if (selectedPkgId === 'pkg_vip_chat_glow' || (foundPkg && foundPkg.features && foundPkg.features.chatGlow === 'gold_neon')) {
          freshPlayer.chatGlow = 'gold_neon';
          freshPlayer.hasChatGlow = true;
          freshPlayer.activePackage = 'pkg_vip_chat_glow';
        } else if (selectedPkgId === 'pkg_vip_royal_ultimate' || (foundPkg && foundPkg.features && foundPkg.features.chatGlow === 'cyber_rainbow')) {
          freshPlayer.chatGlow = 'cyber_rainbow';
          freshPlayer.hasChatGlow = true;
          freshPlayer.isVerified = true;
          freshPlayer.vipVerified = true;
          freshPlayer.canUploadAvatar = true;
          freshPlayer.stickersPack = true;
          freshPlayer.activePackage = 'pkg_vip_royal_ultimate';
        } else if (selectedPkgId === 'pkg_vip_verified' || (foundPkg && foundPkg.features && foundPkg.features.verified)) {
          freshPlayer.isVerified = true;
          freshPlayer.vipVerified = true;
          freshPlayer.canUploadAvatar = true;
          freshPlayer.activePackage = 'pkg_vip_verified';
        }

        if (foundPkg && foundPkg.features) {
          if (foundPkg.features.title) freshPlayer.title = foundPkg.features.title;
          if (foundPkg.features.stickersPack) freshPlayer.stickersPack = true;
          if (foundPkg.features.customAvatar) freshPlayer.canUploadAvatar = true;
        }

        if (Object.keys(items).length > 0) {
          freshPlayer.inventory = freshPlayer.inventory || {};
          for (const [itKey, qty] of Object.entries(items)) {
            freshPlayer.inventory[itKey] = (Number(freshPlayer.inventory[itKey]) || 0) + Number(qty);
          }
        }

        // 2. Save directly to DB
        await AppDB.adminSavePlayer(targetUser, freshPlayer);

        // 3. Dispatch official topup_receipt mail with pre-applied sync data
        const topupReceiptData = {
          packageId: 'admin_bundle_' + ts,
          packageName: pkgName,
          price: 0,
          cash: addCash,
          bank: addBank,
          xp: addXp,
          customBadge: customBadge,
          badgeTitle: customBadge || pkgName,
          items: items,
          status: 'approved',
          isPreApplied: true,
          newCash: newCash,
          newBank: newBank,
          newXp: newXp,
          newWorth: newWorth,
          date: ts,
          receiptNumber: 'ADMIN-GIFT-' + Math.floor(100000 + Math.random() * 900000),
          reviewerNote: note
        };

        await AppDB.sendMail('إدارة اللعبة (Financial Team)', targetUser, 'topup_receipt', {
          title: `🎉 تم استلام [${pkgName}] بنجاح!`,
          message: note || `مبروك! تم إرسال حزمة [${pkgName}] لحسابك بنجاح من قبل إدارة اللعبة.`,
          topupDetails: topupReceiptData
        });

        // 4. Update in-memory GameEngine if this admin is the active user
        if (targetUser === GameEngine.activeUsername) {
          GameEngine.state.cash = newCash;
          GameEngine.state.bank = newBank;
          GameEngine.state.xp = newXp;
          GameEngine.state.netWorth = newWorth;
          if (customBadge) {
            GameEngine.state.customBadge = customBadge;
            GameEngine.state.badgeTitle = customBadge;
          }
          if (freshPlayer.chatGlow) {
            GameEngine.state.chatGlow = freshPlayer.chatGlow;
            GameEngine.state.hasChatGlow = true;
          }
          if (freshPlayer.activePackage) GameEngine.state.activePackage = freshPlayer.activePackage;
          if (freshPlayer.isVerified) GameEngine.state.isVerified = true;
          if (freshPlayer.vipVerified) GameEngine.state.vipVerified = true;
          if (freshPlayer.stickersPack) GameEngine.state.stickersPack = true;
          if (freshPlayer.canUploadAvatar) GameEngine.state.canUploadAvatar = true;

          if (Object.keys(items).length > 0) {
            GameEngine.state.inventory = GameEngine.state.inventory || {};
            for (const [itKey, qty] of Object.entries(items)) {
              GameEngine.state.inventory[itKey] = (Number(GameEngine.state.inventory[itKey]) || 0) + Number(qty);
            }
          }
          GameEngine.state.adminModifiedTimestamp = ts;
          try {
            localStorage.setItem(`rasalmal_state_${targetUser}`, JSON.stringify(GameEngine.state));
          } catch (e) {}
          renderAll();
        }

        // 4.5. Backfill any existing messages in chat_feed so they glow immediately
        if (freshPlayer.chatGlow) {
          try {
            const feedRows = await (AppDB._api ? AppDB._api("globals?id=eq.chat_feed&select=data") : null);
            if (feedRows && feedRows.length > 0 && feedRows[0].data && Array.isArray(feedRows[0].data.messages)) {
              let feedModified = false;
              feedRows[0].data.messages.forEach(m => {
                if (m.sender === targetUser) {
                  m.chatGlow = freshPlayer.chatGlow;
                  if (freshPlayer.isVerified) m.isVerified = true;
                  if (freshPlayer.customBadge) m.customBadge = freshPlayer.customBadge;
                  feedModified = true;
                }
              });
              if (feedModified) {
                await AppDB._api('globals', {
                  method: 'POST',
                  headers: { 'Prefer': 'resolution=merge-duplicates' },
                  body: JSON.stringify({
                    id: 'chat_feed',
                    data: { messages: feedRows[0].data.messages },
                    updated_at: Date.now()
                  })
                });
              }
            }
          } catch (eFeed) {
            console.warn('[Admin] Chat feed backfill warning:', eFeed.message);
          }
        }

        // 5. Update admin dashboard stats
        const cashEl = document.getElementById('admin-p-cash');
        if (cashEl) cashEl.textContent = newCash.toLocaleString();
        const bankEl = document.getElementById('admin-p-bank');
        if (bankEl) bankEl.textContent = newBank.toLocaleString();
        const xpEl = document.getElementById('admin-p-xp');
        if (xpEl) xpEl.textContent = `${newXp.toLocaleString()} XP`;
        const worthEl = document.getElementById('admin-p-worth');
        if (worthEl) worthEl.textContent = `${newWorth.toLocaleString()} EGP`;

        logAdminAction(`إرسال حزمة [${pkgName}] للاعب ${targetUser}: كاش ${addCash.toLocaleString()}، بنك ${addBank.toLocaleString()}، خبرة ${addXp.toLocaleString()}`);
        showToast('تم إرسال الحزمة بنجاح 🎁', `تم شحن وإرسال حزمة [${pkgName}] للاعب @${targetUser} بنجاح وستظهر في شاشته فوراً!`, 'success');

        closeSendPackageModal();

        if (typeof loadAdminPlayersDirectory === 'function') {
          loadAdminPlayersDirectory(false);
        }

      } catch (err) {
        console.error('[Send Package Error]', err);
        showToast('فشل إرسال الحزمة', err.message, 'error');
      } finally {
        _isSendingPackageInProgress = false;
        if (confirmSendPkgBtn) {
          confirmSendPkgBtn.disabled = false;
          confirmSendPkgBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>إرسال الحزمة للاعب فوراً 🚀</span>';
        }
      }
    }

    // Attach package window handlers and listeners
    window.openSendPackageModal = openSendPackageModal;
    window.closeSendPackageModal = closeSendPackageModal;
    window.confirmSendPackageAction = confirmSendPackageAction;

    const openSendPkgModalBtn = document.getElementById('btn-admin-open-send-pkg-modal');
    if (openSendPkgModalBtn) openSendPkgModalBtn.onclick = openSendPackageModal;

    const closeSendPkgModalBtn = document.getElementById('btn-close-send-pkg-modal');
    if (closeSendPkgModalBtn) closeSendPkgModalBtn.onclick = closeSendPackageModal;

    const cancelSendPkgModalBtn = document.getElementById('btn-cancel-send-pkg');
    if (cancelSendPkgModalBtn) cancelSendPkgModalBtn.onclick = closeSendPackageModal;

    const confirmSendPkgBtn = document.getElementById('btn-confirm-send-pkg');
    if (confirmSendPkgBtn) confirmSendPkgBtn.onclick = confirmSendPackageAction;

    // ==================== PLAYER CASH FLOW DETAILED INSPECTOR ====================
    const inspectFlowBtn = document.getElementById('btn-admin-inspect-flow');
    const flowModal = document.getElementById('admin-player-flow-modal');
    const closeFlowModalBtn = document.getElementById('btn-admin-close-flow-modal');
    const closeFlowModalFooterBtn = document.getElementById('btn-admin-close-flow-modal-footer');

    if (closeFlowModalBtn && flowModal) {
      closeFlowModalBtn.addEventListener('click', () => flowModal.classList.add('hidden'));
    }
    if (closeFlowModalFooterBtn && flowModal) {
      closeFlowModalFooterBtn.addEventListener('click', () => flowModal.classList.add('hidden'));
    }

    if (inspectFlowBtn && flowModal) {
      inspectFlowBtn.addEventListener('click', async () => {
        const targetUser = (selectedPlayer || document.getElementById('admin-p-username')?.textContent ||'').replace(/^@/,'').trim();
        if (!targetUser || targetUser ==='...' || targetUser ==='') {
          showToast('فحص التدفق','يرجى تحديد واختيار لاعب أولاً من قائمة اللاعبين.','warning');
          return;
        }

        try {
          const pState = await AppDB.adminGetPlayer(targetUser);
          if (!pState) throw new Error("تعذر جلب بيانات اللاعب.");

          document.getElementById('adm-flow-modal-username').textContent =`@${targetUser}`;

          const originalState = GameEngine.state;
          let grossPerSec = 0;
          let taxPerSec = 0;
          let netPerSec = 0;
          let taxTierName ='معفى من الضرائب (أقل من 5M EGP)';
          let breakdownItems = [];

          try {
            GameEngine.state = pState;

            let breakdown = null;
            if (typeof GameEngine.getDetailedCashflowBreakdown ==='function') {
              breakdown = GameEngine.getDetailedCashflowBreakdown(pState);
            }

            if (breakdown) {
              grossPerSec = breakdown.totalGrossPerSec || 0;
              taxPerSec = (breakdown.tax && breakdown.tax.taxPerSec) || 0;
              netPerSec = Math.max(0, grossPerSec - taxPerSec);

              // 1. Businesses
              if (breakdown.businesses && breakdown.businesses.length > 0) {
                breakdown.businesses.forEach(b => {
                  breakdownItems.push({
                    icon:'',
                    title:`مشروع: ${b.name}`,
                    grossPerSec: b.profitPerSec,
                    detail:`مستوى ${b.level} | ${b.workers || 0} عمال | تسعير: ${(b.price || b.optPrice || 0).toLocaleString()} EGP ${b.isFranchise ?'|  فرانشايز' :''}`
                  });
                });
              }

              // 2. Real estate / Assets
              if (breakdown.assets && breakdown.assets.length > 0) {
                breakdown.assets.forEach(a => {
                  breakdownItems.push({
                    icon:'️',
                    title:`عقار: ${a.name} (عدد ${a.count})`,
                    grossPerSec: a.rentPerSec,
                    detail:`عائد إيجار عقاري: +${a.rentPerUnit.toLocaleString()} EGP/ث لكل وحدة`
                  });
                });
              }

              // 3. Cars
              if (breakdown.cars && breakdown.cars.length > 0) {
                breakdown.cars.forEach(c => {
                  breakdownItems.push({
                    icon:'️',
                    title:`تأجير سيارة: ${c.name}`,
                    grossPerSec: c.grossRent,
                    netPerSec: c.netProfitPerSec,
                    detail:`إيجار: +${c.grossRent.toLocaleString()} | صيانة: -${c.maintenance.toLocaleString()} EGP/ث`
                  });
                });
              }

              // 4. Bank Interest
              if (breakdown.bank && breakdown.bank.profitPerSec > 0) {
                breakdownItems.push({
                  icon:'',
                  title:'عوائد بنكية (فوائد الإيداع)',
                  grossPerSec: breakdown.bank.profitPerSec,
                  detail:`رصيد البنك: ${(breakdown.bank.balance || 0).toLocaleString()} EGP ${breakdown.bank.hasRollsBonus ?'|  بونص رولز رويس (+5%)' :''}`
                });
              }

              // 5. Joint Corporation
              if (breakdown.corp && breakdown.corp.active && breakdown.corp.profitPerSec > 0) {
                breakdownItems.push({
                  icon:'',
                  title:`أرباح التحالف: ${breakdown.corp.name}`,
                  grossPerSec: breakdown.corp.profitPerSec,
                  detail:`مستوى الشركة ${breakdown.corp.level} | حصة اللاعب: ${breakdown.corp.sharePct}%`
                });
              }

              // 6. Hired Job
              if (breakdown.hiredJob && breakdown.hiredJob.active && breakdown.hiredJob.salaryPerSec > 0) {
                breakdownItems.push({
                  icon:'',
                  title:`عقد عمل خارجي: ${breakdown.hiredJob.name}`,
                  grossPerSec: breakdown.hiredJob.salaryPerSec,
                  detail:`راتب تعاقدي ساري (تم حل اللغز اليومي بنجاح)`
                });
              }

              // Tax Tier / Exemption
              const taxReport = GameEngine.calculateTaxReport ? GameEngine.calculateTaxReport() : null;
              if (breakdown.tax && breakdown.tax.active) {
                taxTierName = (taxReport && taxReport.bracketName) ? taxReport.bracketName :'شريحة ضريبية مفعلة';
                if (taxReport && taxReport.taxShieldActive) {
                  taxTierName +=' (️ درع ضريبي مفعل)';
                }
              } else {
                taxTierName = (breakdown.tax && breakdown.tax.exemptReason) ||'معفى من الضرائب (أقل من 5M EGP أو محمي بحاجز السيولة)';
              }
            } else {
              const tickIncome = GameEngine.calculatePassiveIncomePerTick ? GameEngine.calculatePassiveIncomePerTick(true) : 0;
              const taxReport = GameEngine.calculateTaxReport ? GameEngine.calculateTaxReport() : { taxPerSecond: 0 };
              grossPerSec = Math.max(0, tickIncome);
              taxPerSec = ((pState.netWorth || 0) > 5000000 && (((pState.bank || 0) + (pState.cash || 0)) > 100000)) ? (taxReport.taxPerSecond || 0) : 0;
              netPerSec = Math.max(0, grossPerSec - taxPerSec);
              if (taxPerSec > 0 && taxReport.bracketName) {
                taxTierName = taxReport.bracketName;
              }
            }
          } finally {
            GameEngine.state = originalState;
          }

          // Populate Summary Cards
          const setElemText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
          };

          const formatEGP = (num, decimals = 0) => {
            const n = Number(num || 0);
            const prefix = n > 0 ? '+' : '';
            return `${prefix}${n.toLocaleString(undefined, {
              minimumFractionDigits: decimals > 0 ? 1 : 0,
              maximumFractionDigits: decimals
            })} EGP`;
          };

          // Gross
          setElemText('adm-flow-summary-gross', `${(grossPerSec || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`);
          setElemText('adm-flow-summary-gross-hour', `${((grossPerSec || 0) * 3600).toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP / ساعة`);
          setElemText('adm-flow-summary-gross-day', `${((grossPerSec || 0) * 86400).toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP / يوم`);

          // Tax
          setElemText('adm-flow-summary-tax', `${(taxPerSec || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`);
          setElemText('adm-flow-summary-tax-hour', `${((taxPerSec || 0) * 3600).toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP / ساعة`);
          setElemText('adm-flow-summary-tax-rate', `شريحة: ${taxTierName}`);

          // 4 Net Profit Intervals (Second, Minute, Hour, Day)
          setElemText('adm-flow-net-sec', formatEGP(netPerSec, 1));
          setElemText('adm-flow-net-min', formatEGP(netPerSec * 60, 0));
          setElemText('adm-flow-net-hour', formatEGP(netPerSec * 3600, 0));
          setElemText('adm-flow-net-day', formatEGP(netPerSec * 86400, 0));

          // Compatibility with older bindings
          setElemText('adm-flow-summary-net', `${(netPerSec || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`);
          setElemText('adm-flow-summary-net-hour', `${((netPerSec || 0) * 3600).toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP / ساعة`);

          // Populate Breakdown Items List
          const container = document.getElementById('adm-flow-breakdown-container');
          if (container) {
            container.innerHTML = '';
            if (breakdownItems.length === 0) {
              container.innerHTML = `
                <div class="p-6 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                  <i class="fa-solid fa-hourglass-empty text-2xl mb-2 text-slate-600 block"></i>
                  <span>اللاعب لا يمتلك أي مشاريع أو وظائف أو أصول مدرة للدخل حالياً.</span>
                </div>`;
            } else {
              breakdownItems.forEach(item => {
                const row = document.createElement('div');
                row.className = 'p-3 bg-slate-900/70 border border-slate-800/80 rounded-xl flex items-center justify-between gap-2 hover:border-cyan-500/30 transition';
                row.innerHTML = `
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-sm border border-slate-800">
                      ${item.icon}
                    </div>
                    <div>
                      <div class="font-bold text-white">${item.title}</div>
                      <div class="text-[11px] text-slate-400 mt-0.5">${item.detail}</div>
                    </div>
                  </div>
                  <div class="text-left font-mono shrink-0">
                    <span class="text-xs font-bold text-emerald-400 block">+${(item.grossPerSec || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث</span>
                    <span class="text-[10px] text-slate-400 block">${((item.grossPerSec || 0) * 60).toLocaleString(undefined, { maximumFractionDigits: 0 })} / د &bull; ${((item.grossPerSec || 0) * 3600).toLocaleString(undefined, { maximumFractionDigits: 0 })} / س</span>
                  </div>`;
                container.appendChild(row);
              });
            }
          }

          flowModal.classList.remove('hidden');
        } catch (err) {
          showToast('فحص التدفق', err.message,'error');
        }
      });
    }

    // --- Comprehensive Forensic & Security Audit Engine ---
    let lastAuditResult = null;
    let lastAuditTargetUser = null;
    let activeAuditFilter ='all';

    async function performAccountAudit(p, username ='') {
      const findings = [];
      let score = 100;
      const targetUser = (username || p.username ||'').replace(/^@/,'').trim();

      // Official Game Constants (Exact match with game.js)
      const ASSETS_MAP = {
        apartment: { name:'شقة سكنية مؤجرة', cost: 250000, rent: 85 },
        office: { name:'مبنى مكاتب تجارية', cost: 1600000, rent: 520 },
        mansion: { name:'قصر ريفي فاخر', cost: 7200000, rent: 2400 },
        skyline_tower: { name:'برج ناطحة سحاب تجاري', cost: 35000000, rent: 11500 },
        luxury_resort: { name:'منتجع وفندق سياحي 5 نجوم', cost: 160000000, rent: 52000 },
        mega_yacht: { name:'يخت ملكي فاخر خاص', cost: 650000000, rent: 210000 },
        private_island: { name:'جزيرة استوائية خاصة', cost: 2400000000, rent: 750000 },
        orbital_station: { name:'محطة مدارية فضائية خاصة', cost: 9200000000, rent: 3000000 }
      };

      const STOCKS_MAP = {
        COMI: { name:'البنك التجاري الدولي', basePrice: 38, maxShares: 50000 },
        EAST: { name:'الشرقية للدخان', basePrice: 85, maxShares: 30000 },
        ETEL: { name:'المصرية للاتصالات', basePrice: 48, maxShares: 40000 },
        FWRY: { name:'فوري للمدفوعات الإلكترونية', basePrice: 92, maxShares: 25000 },
        CASH: { name:'صندوق الاستثمار التقني البديل', basePrice: 125, maxShares: 20000 },
        BITC: { name:'مؤشر البيتكوين والأصول الرقمية', basePrice: 310, maxShares: 5000 },
        GOLD: { name:'صندوق سبائك الذهب الخالص', basePrice: 220, maxShares: 10000 },
        AIX: { name:'صندوق الذكاء الاصطناعي العالمي', basePrice: 380, maxShares: 8000 }
      };

      const CAR_MAP = {
        lambo: { name:'Lamborghini Aventador ️', cost: 15000000, rentPerSec: 10000 },
        rolls: { name:'Rolls-Royce Phantom', cost: 40000000, rentPerSec: 38000 },
        shelby: { name:'Shelby Cobra 1965', cost: 120000000, rentPerSec: 145000 }
      };

      const JOBS_MAP = {
        worker: { name:'عامل باليومية', xpNeeded: 0, salary: 6 },
        cashier: { name:'محاسب صندوق', xpNeeded: 180, salary: 14 },
        accountant: { name:'محاسب مالي قانوني', xpNeeded: 600, salary: 45 },
        manager: { name:'مدير فرع وتطوير', xpNeeded: 2200, salary: 130 },
        director: { name:'مدير تنفيذي للمجموعة', xpNeeded: 6500, salary: 350 },
        ceo: { name:'رئيس مجلس الإدارة', xpNeeded: 18000, salary: 980 },
        consultant: { name:'مستشار اقتصادي ووزير سابق', xpNeeded: 45000, salary: 2600 },
        bank_governor: { name:'محافظ البنك المركزي', xpNeeded: 110000, salary: 6800 },
        sovereign_head: { name:'رئيس المجلس الاقتصادي الأعلى', xpNeeded: 250000, salary: 18000 },
        minister: { name:'وزير المالية والاقتصاد السيادي ️', xpNeeded: 500000, salary: 45000 }
      };

      const BIZ_MAP = {
        kiosk: { name:'كشك حلوى وجرائد', baseProfitPerSec: 1 },
        coffee: { name:'عربة قهوة مختصة', baseProfitPerSec: 1 },
        tech: { name:'شركة برمجيات', baseProfitPerSec: 1 },
        logistics: { name:'مجمع خدمات لوجستية وشحن', baseProfitPerSec: 1 },
        supermarket: { name:'سلسلة سوبرماركت وتجزئة', baseProfitPerSec: 2 },
        solar_factory: { name:'مصنع ألواح الطاقة الشمسية', baseProfitPerSec: 2 },
        private_hospital: { name:'مستشفى ومجمع طبي تخصصي', baseProfitPerSec: 3 },
        media_studio: { name:'مؤسسة إنتاج إعلامي وسينمائي', baseProfitPerSec: 4 },
        private_bank: { name:'بنك استثماري وشركة وساطة', baseProfitPerSec: 6 },
        oil_refinery: { name:'مجمع مصافي البترول والطاقة', baseProfitPerSec: 8 },
        space_tech: { name:'مؤسسة استكشاف الفضاء', baseProfitPerSec: 12 }
      };

      // 1. LIQUIDITY & RAW BALANCES
      const cash = Number(p.cash || 0);
      const bank = Number(p.bank || 0);
      const dirty = Number(p.dirtyCash || p.dirty_cash || 0);
      const totalLiquid = cash + bank + dirty;
      const recordedWorth = Number(p.netWorth || p.net_worth || 0);
      const xp = Number(p.xp || 0);
      const jobId = p.jobId || p.job_id ||'worker';
      const rep = Number(p.underworldRep || 0);

      // 2. REAL ESTATE ASSETS
      let realEstateVal = 0;
      let totalAssetUnits = 0;
      let realEstateRentPerSec = 0;
      const assets = (typeof p.assets ==='object' && p.assets) ? p.assets : {};
      Object.keys(assets).forEach(k => {
        const count = Number(assets[k] || 0);
        if (count > 0 && ASSETS_MAP[k]) {
          totalAssetUnits += count;
          realEstateVal += count * ASSETS_MAP[k].cost;
          realEstateRentPerSec += count * ASSETS_MAP[k].rent;
        }
      });

      // 3. STOCKS PORTFOLIO
      let stocksVal = 0;
      let totalStocksCount = 0;
      let stockLimitViolations = [];
      const stocks = (typeof p.stocks ==='object' && p.stocks) ? p.stocks : {};
      Object.keys(stocks).forEach(sym => {
        const s = stocks[sym];
        if (s && s.shares > 0) {
          const shares = Number(s.shares || 0);
          totalStocksCount += shares;
          const price = Number(s.avgPrice || s.currentPrice || (STOCKS_MAP[sym]?.basePrice || 100));
          stocksVal += shares * price;
          if (STOCKS_MAP[sym] && shares > STOCKS_MAP[sym].maxShares) {
            stockLimitViolations.push(`${sym}: ${shares.toLocaleString()} سهم (الأقصى: ${STOCKS_MAP[sym].maxShares.toLocaleString()})`);
          }
        }
      });

      // 4. LOCKED INVESTMENTS CAPITAL
      let investmentsVal = 0;
      const investmentsList = Array.isArray(p.investments) ? p.investments : [];
      investmentsList.forEach(inv => {
        investmentsVal += Number(inv.investedAmount || 0);
      });

      // 5. EXACT MATHEMATICAL NET WORTH (OFFICIAL GAME ENGINE FORMULA)
      const calculatedWorth = totalLiquid + realEstateVal + stocksVal + investmentsVal;
      const worthVariance = recordedWorth - calculatedWorth;
      const varianceAbs = Math.abs(worthVariance);
      const variancePct = calculatedWorth > 0 ? ((varianceAbs / calculatedWorth) * 100) : 0;

      // 6. BUSINESSES & OPERATIONAL CASHFLOW
      let totalBizIncomePerSec = 0;
      let totalBizLevels = 0;
      let activeBizCount = 0;
      let franchiseCount = 0;
      const bizData = (typeof p.businesses ==='object' && p.businesses) ? p.businesses : {};
      Object.keys(bizData).forEach(bKey => {
        const b = bizData[bKey];
        if (b && typeof b ==='object' && b.level > 0) {
          activeBizCount++;
          totalBizLevels += Number(b.level || 1);
          if (b.isFranchise) franchiseCount++;
          const baseProf = (BIZ_MAP[bKey]?.baseProfitPerSec || 50);
          const workers = Number(b.workers || 0);
          const franchiseMul = b.isFranchise ? 2.5 : 1.0;
          const estSecProfit = Math.floor(baseProf * b.level * (1 + workers * 0.1) * franchiseMul);
          totalBizIncomePerSec += estSecProfit;
        }
      });

      // 7. CAR FLEET & LUXURY ASSETS
      let totalCarsVal = 0;
      let carsRentPerSec = 0;
      const ownedCars = Array.isArray(p.ownedCars) ? p.ownedCars : [];
      ownedCars.forEach(c => {
        const model = CAR_MAP[c.id];
        if (model) {
          totalCarsVal += model.cost;
          if (c.rentStatus ==='rented') {
            carsRentPerSec += model.rentPerSec;
          }
        }
      });

      // 8. TOTAL COMPREHENSIVE REVENUE PER MINUTE
      const bankInterestPerSec = Math.floor(bank * 0.000005);
      const totalIncomePerSec = totalBizIncomePerSec + carsRentPerSec + realEstateRentPerSec + bankInterestPerSec;
      const totalBizIncomePerMin = Math.floor(totalIncomePerSec * 60);

      // 9. WIRE TRANSFERS HISTORY
      let transfers = [];
      try {
        if (typeof AppDB !=='undefined' && AppDB.getPlayerTransfers && targetUser) {
          transfers = await AppDB.getPlayerTransfers(targetUser, 50);
        }
      } catch (err) {
        console.warn('[Audit Engine] Could not fetch player transfers:', err.message);
      }

      const incomingTransfers = transfers.filter(t => t.recipient === targetUser);
      const outgoingTransfers = transfers.filter(t => t.sender === targetUser);
      const totalReceived = incomingTransfers.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const totalSent = outgoingTransfers.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const sendersMap = {};
      incomingTransfers.forEach(t => {
        if (t.sender) sendersMap[t.sender] = (sendersMap[t.sender] || 0) + Number(t.amount || 0);
      });
      const topSenders = Object.entries(sendersMap).sort((a, b) => b[1] - a[1]);
      const topSenderSummary = topSenders.length > 0 ?`${topSenders[0][0]} (+${topSenders[0][1].toLocaleString()} EGP)` :'لا يوجد';

      // ─────────────────────────────────────────────
      //  SECTOR AUDITS & FINDINGS
      // ─────────────────────────────────────────────

      // VECTOR 1: EXACT MATHEMATICAL NET WORTH
      if (variancePct <= 3.0 || varianceAbs <= 15000000) {
        findings.push({
          vector:'wealth',
          type:'success',
          badge:'مطابق تماماً',
          title:'مطابقة صافي الثروة دقيقة وسليمة رياضياً 100%',
          metrics:`المسجل: ${recordedWorth.toLocaleString()} EGP | المحسوب: ${calculatedWorth.toLocaleString()} EGP (نسبة التطابق: ${(100 - Math.min(100, variancePct)).toFixed(2)}%)`,
          desc:`تتطابق ثروة اللاعب المسجلة تماماً مع إجمالي السيولة النقدية (${totalLiquid.toLocaleString()} EGP) + الأصول العقارية (${realEstateVal.toLocaleString()} EGP) + الأسهم (${stocksVal.toLocaleString()} EGP) + الاستثمارات (${investmentsVal.toLocaleString()} EGP).`,
          recommendation:'الحساب سليم بنكياً ومطابق للمعادلة المحاسبية الرسمية للعبة.'
        });
      } else if (variancePct <= 10.0 || varianceAbs <= 100000000) {
        findings.push({
          vector:'wealth',
          type:'warning',
          badge:'تفاوت اعتيادي',
          title:'تفاوت طفيف ناتج عن أرباح التدفق اللحظي أو تقلبات البورصة',
          metrics:`المسجل: ${recordedWorth.toLocaleString()} EGP | المحسوب: ${calculatedWorth.toLocaleString()} EGP | الفارق: ${worthVariance > 0 ?'+' :''}${worthVariance.toLocaleString()} EGP (${variancePct.toFixed(2)}%)`,
          desc:'فارق طبيعي يحدث عند تراكم الأرباح اللحظية قبل لحظات الحفظ السحابي، أو نتيجة تقلبات أسعار الأسهم اللحظية.',
          recommendation:'الحساب سليم، ويمكن عمل معايرة دورية إذا رغبت في المزامنة الدقيقة.'
        });
        score -= 5;
      } else {
        findings.push({
          vector:'wealth',
          type:'danger',
          badge:'فارق ثروة غير مدعوم',
          title:'فارق شاسع بين صافي الثروة والأصول المسجلة',
          metrics:`المسجل: ${recordedWorth.toLocaleString()} EGP | المحسوب: ${calculatedWorth.toLocaleString()} EGP | الفارق غير المغطى: ${worthVariance > 0 ?'+' :''}${worthVariance.toLocaleString()} EGP (${variancePct.toFixed(1)}%)`,
          desc:`يوجد فارق ملحوظ بنسبة ${variancePct.toFixed(1)}% بين الثروة المسجلة في الحساب والأصول والسيولة الفعلية التي يمتلكها.`,
          recommendation:'استخدم زر"إعادة معايرة وضبط صافي الثروة تلقائياً" لمطابقة الثروة مع الموجودات الحقيقية.'
        });
        score -= 25;
      }

      // VECTOR 2: WIRE TRANSFERS & CAPITAL INFLUX
      if (totalReceived > 0 || totalSent > 0) {
        const netTransferFlow = totalReceived - totalSent;
        findings.push({
          vector:'transfers',
          type:'success',
          badge:'موثق بالتحويلات',
          title:'حركة الحوالات والتحويلات البنكية المعتمدة',
          metrics:`استلم: +${totalReceived.toLocaleString()} EGP (${incomingTransfers.length} حوالة) | أرسل: -${totalSent.toLocaleString()} EGP (${outgoingTransfers.length} حوالة) | أبرز الممولين: ${topSenderSummary}`,
          desc:`تم تدقيق السجل المصرفي بنجاح. سيولة وثروة اللاعب مدعومة بحوالات بنكية قانونية من لاعبين آخرين مسجلة في قاعدة بيانات البنك المركزي.`,
          recommendation:'حركة التحويلات المالية نظامية ولا تشوبها شبهات غسيل أموال وهمية.'
        });
      } else {
        findings.push({
          vector:'transfers',
          type:'success',
          badge:'حساب معتمد ذاتياً',
          title:'لا توجد حوالات خارجية واردة أو صادرة',
          metrics:'إجمالي الحوالات: 0 EGP (0 تحويلات مسجلة)',
          desc:'يعتمد اللاعب بالكامل على نموه الذاتي من أرباح مشاريعه وأصوله ولم يستلم أي تمويل خارجي من لاعبين آخرين.',
          recommendation:'الحساب مستقل مالياً ونظيف تماماً.'
        });
      }

      // VECTOR 3: BUSINESSES & OPERATIONAL CASHFLOW
      if (activeBizCount > 0) {
        findings.push({
          vector:'businesses',
          type:'success',
          badge:'إنتاج نشط',
          title:'إمبراطورية مشاريع تجارية نشطة ذات دخل تشغيلي حقيقي',
          metrics:`${activeBizCount} مشاريع نشطة (${totalBizLevels} ترقية) • ${franchiseCount} علامة تجارية مسجلة | الدخل التشغيلي: +${totalBizIncomePerMin.toLocaleString()} EGP/د (+${totalIncomePerSec.toLocaleString()} EGP/ث)`,
          desc:'يمتلك الحساب مصانع وشركات مرخصة تضخ سيولة متدفقة مستمرة تبرر نمو ثروته وتراكم أرصدته البنكية.',
          recommendation:'المشاريع تعمل بانتظام دون أي شذوذ في معدلات الدخل.'
        });
      } else {
        if (totalLiquid > 100000000 && totalReceived < 50000000) {
          findings.push({
            vector:'businesses',
            type:'danger',
            badge:'سيولة غير مبررة',
            title:'تضخم السيولة النقدية مع انعدام المشاريع والحوالات الكافية',
            metrics:`السيولة: ${totalLiquid.toLocaleString()} EGP | المشاريع: 0 | الحوالات المستلمة: ${totalReceived.toLocaleString()} EGP`,
            desc:'يمتلك اللاعب رصيد سيولة ضخم يفوق 100 مليون بدون امتلاك مشاريع إنتاجية ودون تلقي حوالات تغطي هذا الرصيد.',
            recommendation:'التحقق من سجل نشاط اللاعب وفحص مصدر السيولة.'
          });
          score -= 25;
        } else {
          findings.push({
            vector:'businesses',
            type:'warning',
            badge:'حساب مبتدئ',
            title:'حساب بدون مشاريع تجارية خاصة',
            metrics:`عدد المشاريع: 0 | الدخل الذاتي: ${totalIncomePerSec.toLocaleString()} EGP/ث`,
            desc:'اللاعب لا يمتلك أي شركات تجارية بعد، ويعتمد على الوظيفة أو المساعدات البنكية.',
            recommendation:'طبيعي للاعبين في المراحل الأولى من اللعبة.'
          });
        }
      }

      // VECTOR 4: LUXURY FLEET & CARS
      if (ownedCars.length > 0) {
        const rentedCount = ownedCars.filter(c => c.rentStatus ==='rented').length;
        findings.push({
          vector:'cars',
          type:'success',
          badge:'أسطول معتمد',
          title:'أسطول السيارات الفارهة والاستثمار التأجيري',
          metrics:`${ownedCars.length} سيارات فارهة مسجلة بقيمة ${totalCarsVal.toLocaleString()} EGP (${rentedCount} سيارة قيد التأجير) | صافي دخل التأجير: +${carsRentPerSec.toLocaleString()} EGP/ث`,
          desc:'سيارات فاخرة ونادرة مسجلة بملفات الحساب وتساهم في رفع الدخل والأرباح الدورية.',
          recommendation:'حالة أسطول السيارات سليمة تماماً.'
        });
      } else {
        findings.push({
          vector:'cars',
          type:'success',
          badge:'سليم',
          title:'لا يمتلك أسطول سيارات فارهة حالياً',
          metrics:'عدد السيارات المملوكة: 0',
          desc:'اللاعب لم يقم بشراء سيارات فارهة من المعرض حتى الآن.',
          recommendation:'سليم 100%.'
        });
      }

      // VECTOR 5: STOCK MARKET TRADING & PORTFOLIO
      if (stockLimitViolations.length > 0) {
        findings.push({
          vector:'stocks',
          type:'danger',
          badge:'تجاوز حدود الأسهم',
          title:'تجاوز الحد الأقصى القانوني المسموح به لأسهم البورصة',
          metrics: stockLimitViolations.join(' •'),
          desc:'يمتلك اللاعب كميات أسهم تتجاوز السقف المحدد لكل شركة في نظام التداول.',
          recommendation:'استخدم إعادة ضبط الأسهم لإعادة الكمية للحد القانوني.'
        });
        score -= 25;
      } else if (totalStocksCount > 0) {
        findings.push({
          vector:'stocks',
          type:'success',
          badge:'محفظة متزنة',
          title:'محفظة تداول الأسهم متوافقة مع ضوابط البورصة',
          metrics:`إجمالي الأسهم: ${totalStocksCount.toLocaleString()} سهم بقيمة ${stocksVal.toLocaleString()} EGP عبر ${Object.keys(stocks).filter(k => stocks[k].shares > 0).length} شركات`,
          desc:'كافة صفقات الأسهم المحتفظ بها ضمن الأسقف المسموحة وبأسعار البورصة المعتمدة.',
          recommendation:'سجل تداول الأسهم نظامي وخالٍ من التلاعب.'
        });
      } else {
        findings.push({
          vector:'stocks',
          type:'success',
          badge:'سليم',
          title:'لا توجد تداولات أسهم مسجلة حالياً',
          metrics:'محفظة الأسهم فارغة',
          desc:'اللاعب لم يقم بشراء أسهم في سوق البورصة.',
          recommendation:'سليم.'
        });
      }

      // VECTOR 6: CAREER PROGRESSION & XP INTEGRITY
      const jobInfo = JOBS_MAP[jobId] || { name: p.title ||'عامل مبتدئ', xpNeeded: 0 };
      if (xp < (jobInfo.xpNeeded * 0.5) && jobInfo.xpNeeded > 1000) {
        findings.push({
          vector:'career',
          type:'danger',
          badge:'رتبة غير شرعية',
          title:'ترقية وظيفية لا تتناسب مع ساعات ونقاط الخبرة',
          metrics:`الوظيفة الحالية: ${jobInfo.name} | نقاط الخبرة: ${xp.toLocaleString()} XP (المطلوب نظامياً: ${jobInfo.xpNeeded.toLocaleString()} XP)`,
          desc:'تم ترقية الرتبة الوظيفية دون جمع نقاط الخبرة الكافية المطلوبة لهذا المنصب الرفيع.',
          recommendation:'تعديل المسمى والوظيفة بما يتطابق مع نقاط الـ XP المتاحة.'
        });
        score -= 20;
      } else {
        findings.push({
          vector:'career',
          type:'success',
          badge:'سليم ومطابق',
          title:'المسار المهني ونقاط الخبرة متطابقة نظامياً',
          metrics:`المسمى: ${p.title || jobInfo.name} | نقاط الخبرة: ${xp.toLocaleString()} XP (الحد الأدنى المطلوب: ${jobInfo.xpNeeded.toLocaleString()} XP)`,
          desc:'الرتبة الوظيفية وساعات العمل المنجزة تتوافق تماماً مع نظام الترقيات المعتمد.',
          recommendation:'المسار المهني سليم 100%.'
        });
      }

      // VECTOR 7: UNDERWORLD, SMUGGLING & DIRTY CASH
      const fleet = (typeof p.smugglingFleet ==='object' && p.smugglingFleet) ? p.smugglingFleet : {};
      const totalFleet = Number(fleet.ship || 0) + Number(fleet.plane || 0) + Number(fleet.speedboat || 0);
      if (dirty > 50000000 && totalFleet === 0 && rep < 5) {
        findings.push({
          vector:'underworld',
          type:'danger',
          badge:'كاش قذر مجهول',
          title:'تضخم كاش قذر ضخم بدون امتلاك أسطول تهريب',
          metrics:`كاش قذر: ${dirty.toLocaleString()} EGP | أسطول التهريب: 0 مركبات | السمعة: ${rep} Rep`,
          desc:'أموال سوداء غير مبررة تفوق 50 مليون دون امتلاك أدوات تهريب تدعم هذه المبالغ.',
          recommendation:'استخدم زر"تصفير الكاش القذر والـ Heat" لحذف الأموال المشبوهة.'
        });
        score -= 20;
      } else if (dirty > 0 || (p.heatLevel || 0) > 0) {
        findings.push({
          vector:'underworld',
          type:'warning',
          badge:'نشاط تهريب',
          title:'نشاط في السوق السوداء ومستوى ملاحقة أمني',
          metrics:`كاش قذر: ${dirty.toLocaleString()} EGP | أسطول التهريب: ${fleet.ship || 0} سفن، ${fleet.plane || 0} طائرات، ${fleet.speedboat || 0} لنشات | Heat: ${p.heatLevel || 0}/5 | حالة السجن: ${p.jailTimer > 0 ?'مسجون' :'حر طليق'}`,
          desc:'يمارس اللاعب أنشطة تهريب قانونية وفق ميكانيكا اللعبة، وعليه رصيد كاش قذر يتطلب غسيل أموال.',
          recommendation:'متابعة عمليات غسيل الأموال في الكازينو ومكاتب الصرافة.'
        });
        score -= 5;
      } else {
        findings.push({
          vector:'underworld',
          type:'success',
          badge:'نظيف تماماً',
          title:'السجل الجنائي والأموال نظيفة بالكامل 100%',
          metrics:`كاش قذر: 0 EGP | أسطول التهريب: ${totalFleet} مركبات | مستوى Heat: 0/5`,
          desc:'لا توجد أي أموال قذرة معلقة أو سجل ملاحقة شرطية نشط.',
          recommendation:'الحساب نظيف تماماً وخالٍ من المخالفات.'
        });
      }

      // VECTOR 8: BANKING LOANS & CREDIT RISK
      const loanAmt = (typeof p.activeLoan ==='object' && p.activeLoan)
        ? Number(p.activeLoan.amount || p.activeLoan.principal || 0)
        : Number(p.activeLoan || p.bankLoan || 0);
      const debtRatio = calculatedWorth > 0 ? ((loanAmt / calculatedWorth) * 100) : 0;

      if (loanAmt === 0) {
        findings.push({
          vector:'loans',
          type:'success',
          badge:'خالٍ من الديون',
          title:'الجدارة الائتمانية ممتازة والذمة المالية بريئة تماماً',
          metrics:'لا توجد قروض بنكية معلقة أو التزامات سداد قائمة',
          desc:'الحساب لا يعاني من أي مديونيات بنكية أو مخاطر تعثر مالي.',
          recommendation:'الحالة الائتمانية ممتازة.'
        });
      } else if (debtRatio > 70 && loanAmt > 10000000) {
        findings.push({
          vector:'loans',
          type:'warning',
          badge:'مخاطر ائتمانية',
          title:'ارتفاع نسبة المديونية والقروض البنكية المعلقة',
          metrics:`قرض بنكي مستحق: ${loanAmt.toLocaleString()} EGP | نسبة الدين إلى الثروة: ${debtRatio.toFixed(1)}%`,
          desc:'الديون تستهلك نسبة كبيرة من رأس مال اللاعب، مما يعرضه لمخاطر التعثر أو مصادرة الأصول.',
          recommendation:'مطالبة اللاعب بجدولة وسداد القرض البنكي.'
        });
        score -= 10;
      } else {
        findings.push({
          vector:'loans',
          type:'success',
          badge:'قرض منتظم',
          title:'تسهيلات ائتمانية بنكية منتظمة وقابلة للسداد',
          metrics:`قيمة القرض: ${loanAmt.toLocaleString()} EGP | نسبة التغطية: ${(100 - debtRatio).toFixed(1)}% أصول حرة`,
          desc:'القرض البنكي مغطى بأصول وسيولة ممتازة ولا يشكل أي خطورة ائتمانية.',
          recommendation:'سليم.'
        });
      }

      // VECTOR 9: CASINO & BETTING AUDIT
      const casinoStats = (typeof p.casinoStats ==='object' && p.casinoStats) ? p.casinoStats : {};
      const casinoWins = Number(casinoStats.totalWon || 0);
      const casinoBets = Number(casinoStats.totalBets || 0);
      if (casinoWins > 500000000 && casinoBets < 5) {
        findings.push({
          vector:'casino',
          type:'danger',
          badge:'شبهة تلاعب',
          title:'شبهة استغلال ثغرة في الكازينو (Win Streaks Exploit)',
          metrics:`أرباح الكازينو: ${casinoWins.toLocaleString()} EGP عبر ${casinoBets} مراهنة فقط`,
          desc:'معدل أرباح كازينو مستحيل إحصائياً يشير إلى تلاعب بالنتائج المحلية أو ثغرة برمجية.',
          recommendation:'خصم أرباح الكازينو غير المبررة.'
        });
        score -= 20;
      } else {
        findings.push({
          vector:'casino',
          type:'success',
          badge:'سليم',
          title:'إحصائيات الكازينو والمراهنات طبيعية',
          metrics:`إجمالي الرهانات: ${casinoBets} | إجمالي الأرباح: ${casinoWins.toLocaleString()} EGP`,
          desc:'لا توجد أنماط فوز شاذة أو استخدام أدوات تكرار غير مصرح بها.',
          recommendation:'نشاط الكازينو ضمن المعدلات الإحصائية المعتادة.'
        });
      }

      // FINAL SCORE & VERDICT
      score = Math.max(0, Math.min(100, score));
      let status ='آمن وموثوق تماماً';
      let badgeClass ='bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';

      if (score < 40) {
        status ='حساب مخترق / متلاعب به بشدة';
        badgeClass ='bg-rose-500/20 text-rose-400 border border-rose-500/30';
      } else if (score < 70) {
        status ='شبهة اختلال مالي وشذوذ رقمي';
        badgeClass ='bg-orange-500/20 text-orange-400 border border-orange-500/30';
      } else if (score < 90) {
        status ='تحت الملاحظة وتدقيق دوري';
        badgeClass ='bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      }

      return {
        score,
        status,
        badgeClass,
        recordedWorth,
        calculatedWorth,
        worthVariance,
        totalLiquid,
        totalBizIncomePerMin,
        activeBizCount,
        dirty,
        heat: p.heatLevel || 0,
        findings
      };
    }

    function renderAuditReportCards(findings, filter ='all') {
      const reportBody = document.getElementById('audit-report-body');
      if (!reportBody) return;

      const filtered = filter ==='all' ? findings : findings.filter(f => f.vector === filter);

      if (filtered.length === 0) {
        reportBody.innerHTML ='<div class="p-6 text-center text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800">لا توجد ملاحظات في هذا القسم.</div>';
        return;
      }

      reportBody.innerHTML = filtered.map(f => {
        let borderClass ='border-emerald-500/30 bg-emerald-950/15';
        let titleColor ='text-emerald-300';
        let badgeStyle ='bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

        if (f.type ==='warning') {
          borderClass ='border-yellow-500/30 bg-yellow-950/15';
          titleColor ='text-yellow-300';
          badgeStyle ='bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
        } else if (f.type ==='danger') {
          borderClass ='border-rose-500/40 bg-rose-950/25';
          titleColor ='text-rose-300';
          badgeStyle ='bg-rose-500/20 text-rose-300 border-rose-500/30';
        }

        return`
          <div class="p-3.5 rounded-xl border ${borderClass} space-y-2 transition shadow-sm">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="font-black ${titleColor} text-xs sm:text-sm">${f.title}</span>
              </div>
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeStyle}">${f.badge}</span>
            </div>
            <div class="p-2 bg-slate-950/70 rounded-lg border border-slate-800/80 font-mono text-[11px] text-amber-300">
              <i class="fa-solid fa-calculator ml-1 text-slate-400"></i> ${f.metrics}
            </div>
            <p class="text-[11px] text-slate-300 leading-relaxed">${f.desc}</p>
            <div class="text-[10px] text-sky-300 bg-sky-950/30 border border-sky-500/20 p-2 rounded-lg flex items-center gap-1.5">
              <i class="fa-solid fa-lightbulb text-sky-400"></i>
              <span><strong>التوصية الإدارية:</strong> ${f.recommendation}</span>
            </div>
          </div>`;
      }).join('');
    }

    const fraudCheckBtn = document.getElementById('btn-admin-fraud-check');
    const auditModal = document.getElementById('admin-audit-modal');
    const closeAuditBtn = document.getElementById('btn-close-admin-audit');
    const closeAuditFooterBtn = document.getElementById('btn-close-admin-audit-footer');

    if (fraudCheckBtn && auditModal) {
      fraudCheckBtn.addEventListener('click', async () => {
        const targetUser = (selectedPlayer || document.getElementById('admin-p-username')?.textContent ||'').replace(/^@/,'').trim();
        if (!targetUser || targetUser ==='...' || targetUser ==='') {
          showToast('فحص الأمان','يرجى تحديد واختيار لاعب أولاً من قائمة اللاعبين.','warning');
          return;
        }
        try {
          fraudCheckBtn.disabled = true;
          const pState = await AppDB.adminGetPlayer(targetUser);
          if (!pState) throw new Error("تعذر جلب بيانات اللاعب من الخادم.");

          const report = await performAccountAudit(pState, targetUser);
          lastAuditResult = report;
          lastAuditTargetUser = targetUser;

          // Header & Badges
          const safetyBadge = document.getElementById('audit-safety-badge');
          if (safetyBadge) {
            safetyBadge.textContent = report.status;
            safetyBadge.className =`px-2.5 py-1 rounded-lg font-bold text-xs ${report.badgeClass}`;
          }

          // KPI 1: Score
          const scoreEl = document.getElementById('audit-kpi-score');
          const scoreBar = document.getElementById('audit-kpi-score-bar');
          if (scoreEl) scoreEl.textContent =`${report.score}%`;
          if (scoreBar) {
            scoreBar.style.width =`${report.score}%`;
            scoreBar.className =`h-full transition-all duration-500 ${report.score >= 80 ?'bg-emerald-500' : report.score >= 50 ?'bg-yellow-500' :'bg-rose-500'}`;
          }

          // KPI 2: Worth diff
          const worthDiffEl = document.getElementById('audit-kpi-worth-diff');
          const worthSubEl = document.getElementById('audit-kpi-worth-sub');
          const variancePct = report.calculatedWorth > 0 ? ((Math.abs(report.worthVariance) / report.calculatedWorth) * 100) : 0;
          if (worthDiffEl) {
            if (variancePct <= 3.0 || Math.abs(report.worthVariance) < 15000000) {
              worthDiffEl.textContent =`مطابق تماماً ️ (${(100 - Math.min(100, variancePct)).toFixed(1)}%)`;
              worthDiffEl.className ='numbers-font font-black text-emerald-400 text-xs';
            } else {
              worthDiffEl.textContent =`${report.worthVariance > 0 ?'+' :''}${report.worthVariance.toLocaleString()} EGP (${variancePct.toFixed(1)}%)`;
              worthDiffEl.className =`numbers-font font-black ${variancePct > 10 ?'text-rose-400' :'text-yellow-400'} text-xs`;
            }
          }
          if (worthSubEl) {
            worthSubEl.textContent =`مسجل: ${report.recordedWorth.toLocaleString()} | فعلي: ${report.calculatedWorth.toLocaleString()}`;
          }

          // KPI 3: Cashflow
          const incomeEl = document.getElementById('audit-kpi-income');
          const bizCountEl = document.getElementById('audit-kpi-biz-count');
          if (incomeEl) incomeEl.textContent =`+${report.totalBizIncomePerMin.toLocaleString()} EGP / د`;
          if (bizCountEl) bizCountEl.textContent =`${report.activeBizCount} مشاريع نشطة`;

          // KPI 4: Underworld
          const dirtyEl = document.getElementById('audit-kpi-dirty');
          const heatEl = document.getElementById('audit-kpi-heat');
          if (dirtyEl) dirtyEl.textContent =`${report.dirty.toLocaleString()} EGP`;
          if (heatEl) heatEl.textContent =`Heat: ${report.heat}/5`;

          // Render findings cards
          activeAuditFilter ='all';
          renderAuditReportCards(report.findings,'all');

          auditModal.classList.remove('hidden');
          showToast('فحص الأمان الشامل',`تم تدقيق حساب ${targetUser} بنجاح — مؤشر النزاهة: ${report.score}%`,'info');

        } catch (e) {
          showToast('خطأ فحص الأمان', e.message,'error');
        } finally {
          fraudCheckBtn.disabled = false;
        }
      });
    }

    // Filter Tabs Click Handlers
    document.querySelectorAll('.audit-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.audit-filter-btn').forEach(b => {
          b.classList.remove('bg-rose-500/20','text-rose-300','border','border-rose-500/40');
          b.classList.add('bg-slate-900','text-slate-400');
        });
        btn.classList.add('bg-rose-500/20','text-rose-300','border','border-rose-500/40');
        btn.classList.remove('bg-slate-900','text-slate-400');

        activeAuditFilter = btn.dataset.filter ||'all';
        if (lastAuditResult) {
          renderAuditReportCards(lastAuditResult.findings, activeAuditFilter);
        }
      });
    });

    // Corrective Action 1: Recalibrate Net Worth
    const btnRecalibrateWorth = document.getElementById('btn-adm-audit-recalibrate-worth');
    if (btnRecalibrateWorth) {
      btnRecalibrateWorth.addEventListener('click', async () => {
        if (!lastAuditResult || !lastAuditTargetUser) return;
        const newWorth = lastAuditResult.calculatedWorth;
        if (!confirm(`هل تريد إعادة ضبط ومعايرة صافي الثروة للاعب"${lastAuditTargetUser}" إلى القيمة المحسوبة الفعلية (${newWorth.toLocaleString()} EGP)؟`)) return;

        try {
          btnRecalibrateWorth.disabled = true;
          await AppDB.adminSetPlayerState(lastAuditTargetUser, { netWorth: newWorth });
          showToast('معايرة الثروة ️',`تم تصحيح وضبط صافي ثروة ${lastAuditTargetUser} إلى ${newWorth.toLocaleString()} EGP بنجاح.`,'success');
          logAdminAction(`إعادة معايرة وتصحيح صافي ثروة ${lastAuditTargetUser} إلى ${newWorth}`);
          
          // Re-trigger audit to reflect update
          fraudCheckBtn?.click();
        } catch (e) {
          showToast('فشل المعايرة', e.message,'error');
        } finally {
          btnRecalibrateWorth.disabled = false;
        }
      });
    }

    // Corrective Action 2: Clear Dirty Cash & Heat
    const btnClearDirty = document.getElementById('btn-adm-audit-clear-dirty');
    if (btnClearDirty) {
      btnClearDirty.addEventListener('click', async () => {
        if (!lastAuditTargetUser) return;
        if (!confirm(`هل تريد تصفير الكاش القذر ومستوى الملاحقة Heat للاعب"${lastAuditTargetUser}" بالكامل؟`)) return;

        try {
          btnClearDirty.disabled = true;
          await AppDB.adminSetPlayerState(lastAuditTargetUser, { dirtyCash: 0, heatLevel: 0, jailTimer: 0 });
          showToast('تطهير الحساب',`تم تصفير الكاش القذر والـ Heat للاعب ${lastAuditTargetUser} بنجاح.`,'success');
          logAdminAction(`تصفير الكاش القذر والـ Heat للاعب ${lastAuditTargetUser}`);

          // Re-trigger audit to reflect update
          fraudCheckBtn?.click();
        } catch (e) {
          showToast('فشل التطهير', e.message,'error');
        } finally {
          btnClearDirty.disabled = false;
        }
      });
    }

    const hideAuditModal = () => {
      if (auditModal) auditModal.classList.add('hidden');
    };

    if (closeAuditBtn) closeAuditBtn.addEventListener('click', hideAuditModal);
    if (closeAuditFooterBtn) closeAuditFooterBtn.addEventListener('click', hideAuditModal);

    if (closeLogModalBtn && logModal) {
      closeLogModalBtn.addEventListener('click', () => {
        logModal.classList.add('hidden');
      });
    }

    // Filter pills inside log modal
    const logFilterBtns = document.querySelectorAll('.btn-log-filter');
    logFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        logFilterBtns.forEach(b => {
          b.className ='btn-log-filter px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg font-bold transition';
        });
        btn.className ='btn-log-filter px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg font-bold transition';
        currentLogFilter = btn.getAttribute('data-log-filter') ||'all';
        if (selectedPlayerState) renderPlayerLogFeed(selectedPlayerState);
      });
    });

    // ─────────────────────────────────────────────
    //  MODULE: MARKET CONTROL & DIRECT PRICING
    // ─────────────────────────────────────────────
    function renderAdminStockPrices() {
      const symbols = ['COMI','EAST','ETEL','FWRY','CASH','BITC','GOLD','AIX'];
      symbols.forEach(sym => {
        const priceEl = document.getElementById(`adm-stock-price-${sym}`);
        if (priceEl && GameEngine.stockPrices[sym]) {
          const p = GameEngine.stockPrices[sym][GameEngine.stockPrices[sym].length - 1];
          priceEl.textContent =`${p.toLocaleString()} EGP`;
        }
      });
    }

    // Custom Stock Market Event Broadcast & Impact Controller
    const broadcastCustomEventBtn = document.getElementById('btn-admin-broadcast-custom-event');
    if (broadcastCustomEventBtn) {
      broadcastCustomEventBtn.addEventListener('click', async () => {
        const titleInput = document.getElementById('adm-custom-news-title');
        const symbolSelect = document.getElementById('adm-custom-stock-select');
        const directionSelect = document.getElementById('adm-custom-stock-direction');
        const pctInput = document.getElementById('adm-custom-stock-pct');

        let rawTitle = (titleInput ? titleInput.value.trim() :'');
        const targetSymbol = symbolSelect ? symbolSelect.value :'ALL';
        const direction = directionSelect ? directionSelect.value :'up';
        const pctVal = pctInput ? Math.max(1, Math.min(500, parseFloat(pctInput.value) || 25)) : 25;
        const multiplier = direction ==='up' ? (1 + pctVal / 100) : Math.max(0.05, 1 - pctVal / 100);
        const isUp = direction ==='up';

        // Auto-generate title if empty
        if (!rawTitle) {
          if (targetSymbol ==='ALL') {
            rawTitle = isUp
              ?`انتعاش عام وموجة صعود قياسية لكافة الأسهم (+${pctVal}%)`
              :`تصحيح هبوطي وموجة بيع وضغط على كافة الأسهم (-${pctVal}%)`;
          } else {
            const stockName = GameEngine.STOCKS[targetSymbol]?.name || targetSymbol;
            rawTitle = isUp
              ?`أرباح قياسية وإقبال استثماري يرفع سهم ${stockName} (+${pctVal}%)`
              :`ضغوط بيعية وتراجع في أداء سهم ${stockName} (-${pctVal}%)`;
          }
        }
        const icon = isUp ?'' :'';
        const formattedTicker =`${icon} عاجل من البورصة: ${rawTitle}`;

        const targets = {};
        if (targetSymbol ==='ALL') {
          Object.keys(GameEngine.STOCKS).forEach(s => targets[s] = multiplier);
        } else {
          targets[targetSymbol] = multiplier;
        }

        try {
          await AppDB.saveGlobalMarketEvent({
            title: formattedTicker,
            desc: rawTitle,
            targets: targets,
            timestamp: Date.now()
          });
          logAdminAction(`إطلاق خبر بورصة مخصص:"${rawTitle}" [${targetSymbol} | ${isUp ?'+' :'-'}${pctVal}%]`);
          showToast('نجاح النشر', 'تم نشر وتطبيق خبر البورصة في السيرفر بنجاح!', 'success');
        } catch (e) {
          showToast('خطأ في النشر', e.message, 'error');
        }
      });
    }

    // Market Preset Select Dropdown Auto-filler
    const marketPresetSelect = document.getElementById('adm-market-preset-select');
    if (marketPresetSelect) {
      marketPresetSelect.addEventListener('change', () => {
        const val = marketPresetSelect.value;
        if (!val) return;
        const titleInput = document.getElementById('adm-custom-news-title');
        const symbolSelect = document.getElementById('adm-custom-stock-select');
        const directionSelect = document.getElementById('adm-custom-stock-direction');
        const pctInput = document.getElementById('adm-custom-stock-pct');

        const presetTemplates = {
          crypto_frenzy: {
            title:'صناديق استثمارية سيادية تبدأ الشراء المباشر للبيتكوين!',
            symbol:'BITC',
            dir:'up',
            pct: 50
          },
          gold_rally: {
            title:'إقبال استثماري عالمي للتحوط بسبائك الذهب عيار 24!',
            symbol:'GOLD',
            dir:'up',
            pct: 35
          },
          tech_boom: {
            title:'إطلاق نموذج ذكاء اصطناعي خارق يحقق أرباحاً قياسية لشركات التقنية!',
            symbol:'AIX',
            dir:'up',
            pct: 35
          },
          cbe_rate_hike: {
            title:'البنك المركزي يرفع الفائدة 200 نقطة لدعم القطاع المصرفي!',
            symbol:'COMI',
            dir:'up',
            pct: 30
          },
          telecom_expansion: {
            title:'المصرية للاتصالات تفوز بعقد حصري لتمرير كابلات البيانات البحرية ورخصة 5G!',
            symbol:'ETEL',
            dir:'up',
            pct: 35
          },
          tobacco_monopoly: {
            title:'توقيع عقد تصدير احتكاري ضخم لمنتجات الشرقية للدخان بالشرق الأوسط!',
            symbol:'EAST',
            dir:'up',
            pct: 40
          },
          rate_cut_rally: {
            title:'البنك المركزي يخفض الفائدة لدعم حركة التجارة وصعود كافة الأسهم!',
            symbol:'ALL',
            dir:'up',
            pct: 25
          },
          crypto_crash: {
            title:'حظر تداول العملات المشفرة في بعض البنوك المركزية يضغط على البيتكوين!',
            symbol:'BITC',
            dir:'down',
            pct: 35
          },
          tech_hack_scandal: {
            title:'تسريب وتوقف خدمات الدفع الإلكتروني يتسبب بموجة بيع على سهم فوري!',
            symbol:'FWRY',
            dir:'down',
            pct: 30
          },
          oil_scandal: {
            title:'تأخر شحنات المواد الخام يؤدي لضغوط بيعية على سهم الشرقية للدخان!',
            symbol:'EAST',
            dir:'down',
            pct: 25
          },
          market_crash: {
            title:'موجة بيع جني أرباح مكثفة تهبط بأسهم البورصة وتصحيح هبوطي عام!',
            symbol:'ALL',
            dir:'down',
            pct: 20
          }
        };

        const tpl = presetTemplates[val];
        if (tpl) {
          if (titleInput) titleInput.value = tpl.title;
          if (symbolSelect) symbolSelect.value = tpl.symbol;
          if (directionSelect) directionSelect.value = tpl.dir;
          if (pctInput) pctInput.value = tpl.pct;
          showToast('نموذج جاهز',`تم اختيار نموذج"${tpl.title.substring(0, 28)}..." وتعبئة الحقول.`,'info');
        }
      });
    }

    // Apply Direct Stock Price Buttons
    const applyStockPriceBtns = document.querySelectorAll('.btn-admin-apply-stock-price');
    applyStockPriceBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const sym = btn.getAttribute('data-symbol');
        const inp = document.getElementById(`adm-input-stock-${sym}`);
        if (!sym || !inp) return;
        const newPrice = Number(inp.value);
        if (isNaN(newPrice) || newPrice <= 0) {
          showToast('تعديل السهم','يرجى إدخال سعر صحيح أكبر من صفر.','error');
          return;
        }

        try {
          await AppDB.saveGlobalMarketEvent({
            title:`تدخل إداري مباشر: تم تعديل سعر سهم (${sym}) إلى ${newPrice.toLocaleString()} ج.م`,
            desc:`تم تعديل سعر سهم (${sym}) إلى ${newPrice.toLocaleString()} ج.م`,
            targetSymbol: sym,
            directPrice: newPrice,
            timestamp: Date.now()
          });
          inp.value ='';
          logAdminAction(`تعديل مباشر لسعر سهم ${sym} -> ${newPrice.toLocaleString()} EGP`);
          showToast('تعديل السعر', `تم تعديل سعر سهم (${sym}) إلى ${newPrice.toLocaleString()} ج.م بنجاح!`, 'success');
        } catch (err) {
          showToast('خطأ في الاتصال', err.message, 'error');
        }
      });
    });

    // Reset Market to Baseline
    const resetMarketBaselineBtn = document.getElementById('btn-admin-reset-market-baseline');
    if (resetMarketBaselineBtn) {
      resetMarketBaselineBtn.addEventListener('click', async () => {
        try {
          await AppDB.saveGlobalMarketEvent({
            title:'إعادة ضبط البورصة',
            desc:'تم إعادة أسعار جميع الأسهم إلى القيمة الأساسية.',
            resetBaseline: true,
            timestamp: Date.now()
          });
          logAdminAction('إعادة ضبط أسعار كافة الأسهم في البورصة للقيمة الأساسية');
          showToast('إعادة ضبط البورصة', 'تم إعادة أسعار كافة الأسهم للقيمة الأساسية بنجاح!', 'success');
        } catch (err) {
          showToast('خطأ في الاتصال', err.message, 'error');
        }
      });
    }

    // Market Sudden Event Triggers
    const eventBtns = document.querySelectorAll('.btn-admin-trigger-event');
    eventBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const evType = btn.getAttribute('data-event');
        const eventsMap = {
          tech_boom: {
            title:' طفرة تقنية وانتعاش الذكاء الاصطناعي',
            desc:'ارتفعت أرباح قطاع التكنولوجيا وأسهم AIX و FWRY و CASH نتيجة استثمارات قياسية!',
            targetStocks: ['AIX','FWRY','CASH'],
            multiplier: 1.35,
            toastType:'success'
          },
          crypto_frenzy: {
            title:' صعود تاريخي وانفجار سعر البيتكوين',
            desc:'صناديق استثمارية سيادية عملاقة تبدأ في الشراء المباشر للبيتكوين (+50%)!',
            targetStocks: ['BITC'],
            multiplier: 1.50,
            toastType:'success'
          },
          gold_rally: {
            title:' إقبال قياسي وطفرة في أسعار الذهب',
            desc:'توترات اقتصادية عالمية تدفع المستثمرين للتحوط بسبائك الذهب 24k (+35%)!',
            targetStocks: ['GOLD'],
            multiplier: 1.35,
            toastType:'success'
          },
          cbe_rate_hike: {
            title:'️ قرار المركزي: رفع الفائدة 200 نقطة',
            desc:'البنك المركزي يرفع الفائدة! ارتفاع قوي لسهم CIB وانتكاسة خفيفة باقي الأسهم.',
            targetStocks: ['COMI'],
            multiplier: 1.30,
            negativeTargets: ['EAST','FWRY'],
            negativeMultiplier: 0.88,
            toastType:'warning'
          },
          telecom_expansion: {
            title:' رخصة 5G للمصرية للاتصالات',
            desc:'حصول المصرية للاتصالات على رخصة الجيل الخامس وتوسعة الكابلات البحرية (+35%)!',
            targetStocks: ['ETEL'],
            multiplier: 1.35,
            toastType:'success'
          },
          tobacco_monopoly: {
            title:' اتفاقية احتكار وتصدير للشرقية للدخان',
            desc:'توقع عقد احتكاري ضخم لتصدير المنتجات للشرق الأوسط يطير بالسهم فوق 40%!',
            targetStocks: ['EAST'],
            multiplier: 1.40,
            toastType:'success'
          },
          crypto_crash: {
            title:' ضغوط تنظيمية وهبوط حاد للبيتكوين',
            desc:'حظر تداول العملات المشفرة في بعض البنوك المركزية يضغط على البيتكوين (-35%)!',
            targetStocks: ['BITC'],
            multiplier: 0.65,
            toastType:'error'
          },
          tech_hack_scandal: {
            title:'️ ثغرة وأزمة حماية لشركة فوري',
            desc:'تسريب وتوقف خدمات الدفع الإلكتروني يتسبب بموجة بيع مكثفة ومخاوف استثمارية!',
            targetStocks: ['FWRY'],
            multiplier: 0.70,
            toastType:'error'
          },
          rate_cut_rally: {
            title:' خفض الفائدة وانتعاش حركة الاستثمار',
            desc:'البنك المركزي يخفض الفائدة لدعم حركة التجارة والإنتاج! صعود متزامن لكل الأسهم (+25%).',
            targetStocks: ['COMI','FWRY','CASH','EAST','ETEL','BITC','GOLD','AIX'],
            multiplier: 1.25,
            toastType:'success'
          },
          oil_scandal: {
            title:' أزمة سلاسل الإمداد والشحن',
            desc:'تأخر شحنات التبغ والمواد الخام يؤدي لربكة ومبيعات مكثفة على سهم الشرقية للدخان!',
            targetStocks: ['EAST'],
            multiplier: 0.75,
            toastType:'error'
          },
          market_crash: {
            title:' ذعر اقتصادي وتصحيح هابط للبورصة',
            desc:'موجة بيع جني أرباح مكثفة تهبط بجميع أسهم البورصة وتصحيح هبوطي عام (-20%)!',
            targetStocks: ['COMI','FWRY','CASH','EAST','ETEL','BITC','GOLD','AIX'],
            multiplier: 0.80,
            toastType:'error'
          }
        };
        const ev = eventsMap[evType];
        if (!ev) return;

        const targets = {};
        ev.targetStocks.forEach(sym => {
          targets[sym] = ev.multiplier;
        });
        if (ev.negativeTargets) {
          ev.negativeTargets.forEach(sym => {
            targets[sym] = ev.negativeMultiplier;
          });
        }

        try {
          await AppDB.saveGlobalMarketEvent({
            title: ev.title,
            desc: ev.desc,
            targets: targets,
            timestamp: Date.now()
          });
          logAdminAction(`افتعال حدث اقتصادي: ${ev.title}`);
          showToast('افتعال الحدث', `تم إطلاق وتطبيق الحدث "${ev.title}" في السيرفر بنجاح!`, 'success');
        } catch (err) {
          showToast('خطأ في الاتصال', err.message, 'error');
        }
      });
    });

    // ─────────────────────────────────────────────
    //  MODULE: BROADCAST & AIRDROP
    // ─────────────────────────────────────────────
    const broadcastPresets = document.querySelectorAll('.btn-broadcast-preset');
    broadcastPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        const msg = btn.getAttribute('data-msg');
        const tx = document.getElementById('admin-broadcast-msg');
        if (tx && msg) tx.value = msg;
      });
    });

    const sendBroadcastBtn = document.getElementById('btn-admin-send-broadcast');
    if (sendBroadcastBtn) {
      sendBroadcastBtn.addEventListener('click', async () => {
        const msg = document.getElementById('admin-broadcast-msg').value.trim();
        if (!msg) {
          showToast('بث الإدارة','يرجى كتابة نص الرسالة أولاً.','error');
          return;
        }
        try {
          await AppDB.sendBroadcast(msg);
          showToast('نجاح البث','تم إرسال البث لجميع المشتركين بنجاح.','success');
          document.getElementById('admin-broadcast-msg').value ='';
          logAdminAction(`إرسال إشعار عام:"${msg}"`);
        } catch (err) {
          showToast('فشل البث', err.message,'error');
        }
      });
    }

    const airdropPresets = document.querySelectorAll('.btn-airdrop-preset');
    airdropPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        const amt = btn.getAttribute('data-airdrop');
        const inp = document.getElementById('admin-airdrop-amount');
        if (inp && amt) inp.value = amt;
      });
    });

    const sendAirdropBtn = document.getElementById('btn-admin-send-airdrop');
    if (sendAirdropBtn) {
      sendAirdropBtn.addEventListener('click', async () => {
        const amount = Number(document.getElementById('admin-airdrop-amount').value);
        const target = (document.getElementById('admin-airdrop-target')?.value ||'ALL').trim();

        if (isNaN(amount) || amount <= 0) {
          showToast('مكافأة الإدارة','يرجى إدخال مبلغ صحيح أكبر من صفر.','error');
          return;
        }
        try {
          sendAirdropBtn.disabled = true;
          sendAirdropBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-sm"></i> <span>جاري توزيع المكافأة...</span>';

          const res = await AppDB.sendAirdrop(amount, target);
          const targetDesc = res && res.type === 'single' ? `للاعب @${res.target}` : 'لجميع اللاعبين';
          showToast('نجاح التوزيع 🎁', `تم توزيع المكافأة (+${amount.toLocaleString()} EGP) ${targetDesc} بنجاح! ستصلهم في الكاش فوراً.`, 'success');
          document.getElementById('admin-airdrop-amount').value = '';
          logAdminAction(`توزيع مكافأة مالية: +${amount.toLocaleString()} EGP -> ${target}`);
          updateAirdropStatusUI();
        } catch (err) {
          showToast('فشل التوزيع', err.message, 'error');
        } finally {
          sendAirdropBtn.disabled = false;
          sendAirdropBtn.innerHTML = '<i class="fa-solid fa-parachute-box text-sm"></i> <span>توزيع المكافأة المالية</span>';
        }
      });
    }

    async function updateAirdropStatusUI() {
      try {
        if (typeof AppDB.getLatestAirdrop !== 'function') return;
        const airdrop = await AppDB.getLatestAirdrop();
        const amtEl = document.getElementById('adm-last-airdrop-amt');
        const idEl = document.getElementById('adm-last-airdrop-id');
        const timeEl = document.getElementById('adm-last-airdrop-time');

        if (airdrop && airdrop.amount) {
          if (amtEl) amtEl.textContent = `+${Number(airdrop.amount).toLocaleString()} EGP`;
          if (idEl) idEl.textContent = airdrop.airdropId || `airdrop_${airdrop.timestamp}`;
          if (timeEl && airdrop.timestamp) {
            const d = new Date(airdrop.timestamp);
            timeEl.textContent = `${d.toLocaleDateString('ar-EG')} - ${d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
          }
        } else {
          if (amtEl) amtEl.textContent = 'لا يوجد دروب سابق';
          if (idEl) idEl.textContent = '--';
          if (timeEl) timeEl.textContent = '--';
        }
      } catch (e) {}
    }

    updateAirdropStatusUI();

    const resendUnclaimedBtn = document.getElementById('btn-admin-resend-unclaimed-airdrop');
    if (resendUnclaimedBtn) {
      resendUnclaimedBtn.addEventListener('click', async () => {
        try {
          const airdrop = await AppDB.getLatestAirdrop();
          if (!airdrop || !airdrop.amount) {
            showToast('إعادة الدروب', 'لا توجد أي عملية دروب سابقة مسجلة لإعادة إرسالها.', 'warning');
            return;
          }

          const amt = Number(airdrop.amount);
          const confirmMsg = `⚡ تأكيد فحص وإيداع الدروب:\n\nهل تريد فحص قاعدة بيانات جميع اللاعبين الآن، وإيداع مبلغ المكافأة (+${amt.toLocaleString()} EGP) في حساب أي لاعب لم تصله هذه المكافأة من قبل؟\n\n(اللاعبون الذين استلموها مسبقاً لن يتكرر لهم شيء)`;
          if (!confirm(confirmMsg)) return;

          resendUnclaimedBtn.disabled = true;
          resendUnclaimedBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-sm"></i> <span>جاري فحص الحسابات وإيداع الفلوس...</span>';

          const result = await AppDB.retryLatestAirdropToUnclaimed();

          const summaryMsg = `تم فحص ${result.totalScanned} لاعب:\n• استلموا مسبقاً: ${result.alreadyClaimedCount} لاعب.\n• تم إيداع المكافأة في حساباتهم الآن: ${result.newlyCreditedCount} لاعب بنجاح!`;
          showToast('اكتملت إعادة التوزيع 🚀', summaryMsg, 'success');
          logAdminAction(`إعادة إرسال الدروب (${result.airdropId}): تم إيداع الفلوس لـ ${result.newlyCreditedCount} لاعب لم يستلموا مسبقاً.`);

          updateAirdropStatusUI();
        } catch (err) {
          showToast('خطأ إعادة الدروب', err.message, 'error');
        } finally {
          resendUnclaimedBtn.disabled = false;
          resendUnclaimedBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> <span>إعادة إرسال الدروب الأخير لمن لم يصله فقط ⚡</span>';
        }
      });
    }

    // ==================== MANDATORY FORCE PAGE RELOAD FOR ALL PLAYERS ====================
    const forceReloadBtn = document.getElementById('btn-admin-force-reload');
    if (forceReloadBtn) {
      forceReloadBtn.addEventListener('click', async () => {
        const customMsg = (document.getElementById('admin-force-reload-msg')?.value ||'').trim();
        const defaultMsg ='تم إطلاق تحديث وتحسينات هامة للعبة. يجب إعادة تحميل الصفحة الآن لتطبيق التغييرات وضمان استقرار حسابك.';
        const finalMsg = customMsg || defaultMsg;

        const confirmed = confirm("️ تنبيه إداري هام:\n\nهل أنت متأكد من إجبار جميع اللاعبين المتصلين حالياً على إعادة تحميل الصفحة فوراً؟\n\nستظهر شاشة منبثقة إجبارية بملء الشاشة تمنع اللعب ولا تختفي إلا بعد أن يقوم اللاعب بإعادة تحميل الصفحة."
        );
        if (!confirmed) return;

        try {
          forceReloadBtn.disabled = true;
          forceReloadBtn.innerHTML ='<i class="fa-solid fa-spinner animate-spin"></i> <span>جاري إرسال الأمر لكافة المتصلين...</span>';

          await AppDB.sendForceReload(finalMsg);

          showToast('إعادة التحميل الإجبارية','تم إرسال شاشة إعادة التحميل الإجبارية لجميع اللاعبين المتصلين بنجاح!','success');
          logAdminAction(`إرسال أمر إعادة تحميل إجباري لجميع اللاعبين:"${finalMsg}"`);
          if (document.getElementById('admin-force-reload-msg')) {
            document.getElementById('admin-force-reload-msg').value ='';
          }
        } catch (err) {
          showToast('خطأ','فشل إرسال أمر إعادة التحميل:' + err.message,'error');
        } finally {
          forceReloadBtn.disabled = false;
          forceReloadBtn.innerHTML ='<i class="fa-solid fa-rotate-right text-sm"></i><span>إرسال شاشة إعادة التحميل الإجبارية لجميع اللاعبين المتصلين الآن </span>';
        }
      });
    }

    function updateMaintenanceUIState(isMaint) {
      const badge = document.getElementById('admin-maintenance-badge');
      const toggleBtn = document.getElementById('btn-admin-toggle-maintenance');
      const btnText = document.getElementById('admin-maintenance-btn-text');
      if (badge) {
        if (isMaint) {
          badge.textContent = 'وضع الصيانة نشط';
          badge.className = 'text-[10px] px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded border border-rose-500/30 font-bold animate-pulse';
        } else {
          badge.textContent = 'الخادم متاح للجميع';
          badge.className = 'text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 font-bold';
        }
      }
      if (toggleBtn) {
        const text = isMaint
          ? 'إنهاء وضع الصيانة والعودة للتشغيل الطبيعي للجميع'
          : 'تفعيل وضع الصيانة الشامل وإغلاق الخوادم';
        if (btnText) {
          btnText.textContent = text;
        } else {
          toggleBtn.textContent = text;
        }
        if (isMaint) {
          toggleBtn.className = 'w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg text-xs transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer';
        } else {
          toggleBtn.className = 'w-full py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-lg text-xs transition shadow-lg shadow-amber-600/10 flex items-center justify-center gap-2 cursor-pointer';
        }
      }
    }

    // Auto-fetch maintenance status on admin panel initialization
    if (typeof AppDB !== 'undefined' && typeof AppDB.getMaintenanceStatus === 'function') {
      AppDB.getMaintenanceStatus().then(st => {
        updateMaintenanceUIState(Boolean(st && (st.active || st.enabled)));
      }).catch(err => console.warn('Failed to load initial maintenance state:', err));
    }

    // Bind maintenance toggle click handler
    const maintToggleBtn = document.getElementById('btn-admin-toggle-maintenance');
    if (maintToggleBtn && !maintToggleBtn.dataset.bound) {
      maintToggleBtn.dataset.bound = 'true';
      maintToggleBtn.addEventListener('click', async () => {
        try {
          maintToggleBtn.disabled = true;
          let currentSt = { active: false };
          if (typeof AppDB !== 'undefined' && typeof AppDB.getMaintenanceStatus === 'function') {
            currentSt = await AppDB.getMaintenanceStatus();
          }
          const isCurrentlyMaint = Boolean(currentSt && (currentSt.active || currentSt.enabled));
          const nextState = !isCurrentlyMaint;

          const confirmMsg = nextState
            ? "⚠️ تنبيه إداري عاجل:\n\nهل أنت متأكد من رغبتك في إغلاق اللعبة وتفعيل وضع الصيانة الشامل لكافة اللاعبين؟\n\nسيتم منع أي لاعب غير المشرفين من الدخول وتظهر له شاشة الصيانة الفنية."
            : "✅ هل تريد إنهاء وضع الصيانة وإعادة فتح الخوادم لجميع اللاعبين؟";

          if (!confirm(confirmMsg)) {
            maintToggleBtn.disabled = false;
            return;
          }

          maintToggleBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> <span>جاري تطبيق حالة الخادم...</span>';

          if (typeof AppDB !== 'undefined' && typeof AppDB.setMaintenanceMode === 'function') {
            await AppDB.setMaintenanceMode(nextState, nextState ? 'الخوادم رهن الصيانة الفنية والتحديث الإداري حالياً.' : '');
          } else {
            const SUPABASE_URL = 'https://rasalmal.online';
            const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg4NTU5NzUzLCJleHAiOjIxMDM5MTk3NTN9.2465KGfimfRI4L3fZ6L6kXSOjPt6AC-0eHtchpt7F08';
            await fetch(`${SUPABASE_URL}/rest/v1/globals`, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify({
                id: 'maintenance',
                data: { active: Boolean(nextState), message: nextState ? 'الخوادم رهن الصيانة الفنية والتحديث الإداري حالياً.' : '', timestamp: Date.now() },
                updated_at: Date.now()
              })
            });
          }

          updateMaintenanceUIState(nextState);

          if (nextState) {
            showToast('وضع الصيانة نشط ⚠️', 'تم إغلاق الخوادم وتفعيل وضع الصيانة الشامل بنجاح!', 'warning');
            logAdminAction('تفعيل وضع الصيانة الشامل وإغلاق الخوادم');
          } else {
            showToast('الخوادم مفتوحة ✅', 'تم إنهاء وضع الصيانة وإتاحة اللعبة للجميع بنجاح!', 'success');
            logAdminAction('إنهاء وضع الصيانة وإعادة فتح الخوادم');
          }
        } catch (err) {
          console.error('Maintenance toggle error:', err);
          showToast('خطأ في العملية', err.message || err, 'error');
        } finally {
          maintToggleBtn.disabled = false;
        }
      });
    }

    function applyCompleteZeroStateToGameEngine(username) {
      if (!GameEngine.state) return;
      const isAdmin = Boolean(GameEngine.state && GameEngine.state.isAdmin);
      GameEngine.state.isAdmin = isAdmin;
      GameEngine.state.cash = 300;
      GameEngine.state.bank = 0;
      GameEngine.state.dirtyCash = 0;
      GameEngine.state.netWorth = 400;
      GameEngine.state.xp = 0;
      GameEngine.state.jobId ='worker';
      GameEngine.state.title ='عامل مبتدئ';
      GameEngine.state.underworldRep = 0;
      GameEngine.state.heatLevel = 0;
      GameEngine.state.jailTimer = 0;
      GameEngine.state.afkManagerExpiresAt = 0;
      GameEngine.state.activeLoan = null;
      GameEngine.state.investments = [];
      GameEngine.state.businesses = {
        kiosk: { level: 0, price: 15, workers: 0, suppliesTicks: 0 },
        coffee: { level: 0, price: 28, workers: 0, suppliesTicks: 0 },
        tech: { level: 0, price: 75, workers: 0, suppliesTicks: 0 },
        logistics: { level: 0, price: 120, workers: 0, suppliesTicks: 0 },
        supermarket: { level: 0, price: 200, workers: 0, suppliesTicks: 0 },
        solar_factory: { level: 0, price: 340, workers: 0, suppliesTicks: 0 },
        private_hospital: { level: 0, price: 600, workers: 0, suppliesTicks: 0 },
        media_studio: { level: 0, price: 1100, workers: 0, suppliesTicks: 0 },
        private_bank: { level: 0, price: 1800, workers: 0, suppliesTicks: 0 },
        oil_refinery: { level: 0, price: 2800, workers: 0, suppliesTicks: 0 },
        space_tech: { level: 0, price: 4800, workers: 0, suppliesTicks: 0 }
      };
      GameEngine.state.assets = {
        apartment: 0,
        office: 0,
        mansion: 0,
        skyline_tower: 0,
        luxury_resort: 0,
        mega_yacht: 0,
        private_island: 0,
        orbital_station: 0
      };
      GameEngine.state.stocks = {
        COMI: { shares: 0, avgPrice: 0 },
        EAST: { shares: 0, avgPrice: 0 },
        ETEL: { shares: 0, avgPrice: 0 },
        FWRY: { shares: 0, avgPrice: 0 },
        CASH: { shares: 0, avgPrice: 0 },
        BITC: { shares: 0, avgPrice: 0 },
        GOLD: { shares: 0, avgPrice: 0 },
        AIX: { shares: 0, avgPrice: 0 }
      };
      GameEngine.state.inventory = {
        gold_pen: 0,
        premium_lawyer: 0,
        energy_drink: 0,
        tax_shield: 0,
        market_scanner: 0,
        vip_casino_pass: 0,
        radar_jammer: 0,
        fake_passport: 0,
        crypto_cleaner: 0,
        diplomatic_bag: 0,
        commissioner_wire: 0,
        quantum_cpu: 0,
        diamond_card: 0
      };
      GameEngine.state.ownedCars = [];
      GameEngine.state.activeCar = null;
      GameEngine.state.smugglingFleet = { speedboat: 0, plane: 0, ship: 0 };
      GameEngine.state.activeSmugglingJobs = [];
      GameEngine.state.itemDurations = {};
      GameEngine.state.offlineReport = null;
      GameEngine.state.activityLog = [];

      if (username) {
        try {
          localStorage.setItem(`rasalmal_state_${username}`, JSON.stringify(GameEngine.state));
        } catch (e) { }
      }
    }

    // ─────────────────────────────────────────────
    //  MODULE: SYSTEM & DANGER ZONE
    // ─────────────────────────────────────────────


    // RESET ALL PLAYERS' ECONOMY
    const resetAllEconomyBtn = document.getElementById('btn-admin-reset-all-economy');
    if (resetAllEconomyBtn) {
      resetAllEconomyBtn.addEventListener('click', async () => {
        const confirmMsg ="️ تحذير خطير: هل أنت متأكد من تصفير وتطهير شامل لكافة أرصدة، ومشاريع، وأصول، وأسهم، وأساطيل، وتحويلات، وتحالفات، ورسائل كافة اللاعبين بالكامل؟\n\n ملاحظة هامة: أكواد الهدايا لن تُمس وستبقى مفعلة كما هي.";
        if (!confirm(confirmMsg)) return;

        try {
          const count = await AppDB.adminResetAllPlayers();

          if (GameEngine.activeUsername) {
            applyCompleteZeroStateToGameEngine(GameEngine.activeUsername);
            renderAll();
          }

          showToast('تصفير أرصدة المنظومة',`تم تصفير اقتصاد اللعبة بالكامل لجميع اللاعبين ومسح الشركات والتحويلات والرسائل بنجاح مع الحفاظ على أكواد الهدايا.`,'success');
          logAdminAction(`تصفير شامل لاقتصاد اللعبة بالكامل (حفظ أكواد الهدايا)`);
          loadAdminPlayersDirectory(false);
          renderAdminAnalyticsDashboard();
        } catch (err) {
          showToast('خطأ تصفير المنظومة', err.message,'error');
        }
      });
    }

    // WIPE ALL PLAYERS DATA (FULL DATABASE WIPE)
    const wipeLeaderboardBtn = document.getElementById('btn-admin-wipe-leaderboard');
    if (wipeLeaderboardBtn) {
      wipeLeaderboardBtn.addEventListener('click', async () => {
        const confirmMsg ="️ تحذير نهائي وقاطع: هل أنت متأكد من مسح وحذف كافة وثائق وحسابات اللاعبين نهائياً، ومسح التحالفات والرسائل والتحويلات والليدربورد بالكامل للبدء من الصفر تماماً؟\n\n ملاحظة هامة: أكواد الهدايا لن تُمس نهائياً وستبقى صالحة للاستخدام.";
        if (!confirm(confirmMsg)) return;

        try {
          const count = await AppDB.adminWipeLeaderboard();
          showToast('مسح الحسابات والمنظومة',`تم مسح حسابات اللاعبين وقوائم الليدربورد والتحالفات بالكامل مع الحفاظ على أكواد الهدايا.`,'success');
          logAdminAction(`مسح شامل لقاعدة البيانات وتصفير الليدربورد (حفظ أكواد الهدايا)`);
          loadAdminPlayersDirectory(false);
          renderAll();
        } catch (err) {
          showToast('خطأ مسح الحسابات', err.message,'error');
        }
      });
    }

    // REBUILD CENTRALIZED LEADERBOARD (UNIFY TOP 25 WORLDWIDE)
    const rebuildLeaderboardBtn = document.getElementById('btn-admin-rebuild-leaderboard');
    if (rebuildLeaderboardBtn) {
      rebuildLeaderboardBtn.addEventListener('click', async () => {
        try {
          rebuildLeaderboardBtn.disabled = true;
          rebuildLeaderboardBtn.innerHTML ='<i class="fa-solid fa-spinner fa-spin"></i> جاري الفرز والمزامنة...';
          const topList = await AppDB.adminRebuildLeaderboard();
          showToast('توحيد المتصدرين',`تم فرز وتوحيد ليدربورد الأثرياء بنجاح (${topList.length} لاعب في القمة). سيظهر نفس الترتيب لجميع اللاعبين فوراً!`,'success');
          logAdminAction(`إعادة فرز وتوحيد ليدربورد المتصدرين سحابياً (${topList.length} لاعب)`);
          if (typeof loadAdminPlayersDirectory === 'function') {
            loadAdminPlayersDirectory(false);
          }
        } catch (err) {
          showToast('خطأ المزامنة', err.message,'error');
        } finally {
          rebuildLeaderboardBtn.disabled = false;
          rebuildLeaderboardBtn.innerHTML ='<i class="fa-solid fa-crown"></i> <span>فرز وتوحيد عرش الأثرياء الآن</span>';
        }
      });
    }

    // AWARD S1 HONORS MODAL HANDLERS
    const awardS1Btn = document.getElementById('btn-admin-award-s1-honors');
    const s1Modal = document.getElementById('modal-admin-s1-honors');
    const closeS1ModalBtn = document.getElementById('btn-close-s1-honors-modal');
    const autoFillS1Btn = document.getElementById('btn-adm-s1-autofill');
    const submitS1Btn = document.getElementById('btn-adm-s1-submit');

    if (awardS1Btn && s1Modal) {
      awardS1Btn.addEventListener('click', async () => {
        s1Modal.classList.remove('hidden');
        // Pre-fill existing honors if already stored
        try {
          const current = await AppDB.getSeasonHonors();
          if (current) {
            if (current.top1 && current.top1.username) document.getElementById('adm-s1-top1-input').value = current.top1.username;
            if (current.top2 && current.top2.username) document.getElementById('adm-s1-top2-input').value = current.top2.username;
            if (current.top3 && current.top3.username) document.getElementById('adm-s1-top3-input').value = current.top3.username;
          }
        } catch (e) {}
      });
    }

    if (closeS1ModalBtn && s1Modal) {
      closeS1ModalBtn.addEventListener('click', () => {
        s1Modal.classList.add('hidden');
      });
    }

    if (autoFillS1Btn) {
      autoFillS1Btn.addEventListener('click', async () => {
        try {
          autoFillS1Btn.disabled = true;
          autoFillS1Btn.innerHTML ='<i class="fa-solid fa-spinner fa-spin"></i> جاري السحب...';

          let topPlayers = [];

          // 1. High-speed Priority: Use already cached players in admin panel (0 delay, instant)
          if (Array.isArray(cachedPlayers) && cachedPlayers.length > 0) {
            const valid = cachedPlayers.filter(p => !p.isAdmin && !p.isBanned);
            valid.sort((a, b) => (Number(b.netWorth) || 0) - (Number(a.netWorth) || 0));
            topPlayers = valid.slice(0, 3);
          }

          // 2. Fallback: Fetch leaderboard with a 3.5s race timeout so it never hangs
          if (topPlayers.length === 0) {
            const timeoutPromise = new Promise(resolve => setTimeout(() => resolve([]), 3500));
            const fetchPromise = AppDB.getLeaderboard();
            topPlayers = await Promise.race([fetchPromise, timeoutPromise]);
          }

          // 3. Fallback: Try adminGetAllPlayers if still empty
          if (!topPlayers || topPlayers.length === 0) {
            try {
              const timeoutPromise = new Promise(resolve => setTimeout(() => resolve([]), 3500));
              const allPromise = AppDB.adminGetAllPlayers();
              const all = await Promise.race([allPromise, timeoutPromise]);
              if (Array.isArray(all) && all.length > 0) {
                const valid = all.filter(p => !p.isAdmin && !p.isBanned);
                valid.sort((a, b) => (Number(b.netWorth) || 0) - (Number(a.netWorth) || 0));
                topPlayers = valid.slice(0, 3);
              }
            } catch (e) {}
          }

          if (topPlayers && topPlayers.length > 0) {
            if (topPlayers[0]) document.getElementById('adm-s1-top1-input').value = topPlayers[0].username ||'';
            if (topPlayers[1]) document.getElementById('adm-s1-top2-input').value = topPlayers[1].username ||'';
            if (topPlayers[2]) document.getElementById('adm-s1-top3-input').value = topPlayers[2].username ||'';
            showToast('سحب المتصدرين',`تم سحب أسماء المتصدرين بنجاح (${topPlayers.map(p => p.username).join(' •')})`,'success');
          } else {
            showToast('لا توجد بيانات','لم يتم العثور على لاعبين في قاعدة البيانات. يمكنك إدخال الأسماء يدوياً.','info');
          }
        } catch (err) {
          showToast('خطأ في السحب', err.message,'error');
        } finally {
          autoFillS1Btn.disabled = false;
          autoFillS1Btn.innerHTML ='<i class="fa-solid fa-wand-magic-sparkles"></i> <span>سحب التوب 3 الحاليين تلقائياً</span>';
        }
      });
    }

    if (submitS1Btn) {
      submitS1Btn.addEventListener('click', async () => {
        const u1 = document.getElementById('adm-s1-top1-input').value.trim();
        const u2 = document.getElementById('adm-s1-top2-input').value.trim();
        const u3 = document.getElementById('adm-s1-top3-input').value.trim();

        if (!u1) {
          showToast('بيانات ناقصة','يرجى إدخال اسم لاعب المركز الأول (Top 1) على الأقل.','error');
          return;
        }

        try {
          submitS1Btn.disabled = true;
          submitS1Btn.innerHTML ='<i class="fa-solid fa-spinner fa-spin"></i> جاري الاعتماد والنشر...';

          const awardPromise = AppDB.adminAwardSeasonHonors(u1, u2, u3);
          const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ ok: true }), 3000));
          await Promise.race([awardPromise, timeoutPromise]);

          showToast('تم التكريم','تم اعتماد وتكريم أبطال الموسم الأول بنجاح! تم منح الأوسمة والألقاب ونشرها.','success');
          logAdminAction(`اعتماد وتكريم أبطال الموسم الأول S1: الأول (${u1}) | الثاني (${u2 ||'لا يوجد'}) | الثالث (${u3 ||'لا يوجد'})`);
          s1Modal.classList.add('hidden');
        } catch (err) {
          showToast('خطأ التكريم', err.message,'error');
        } finally {
          submitS1Btn.disabled = false;
          submitS1Btn.innerHTML ='<i class="fa-solid fa-check"></i> <span>اعتماد التكريم ونشره</span>';
        }
      });
    }

    // AWARD TOP 25 VETERAN INVESTORS HANDLER
    const awardTop25Btn = document.getElementById('btn-admin-award-top25-veterans');
    if (awardTop25Btn) {
      awardTop25Btn.addEventListener('click', async () => {
        if (!confirm("هل أنت متأكد من رغبتك في منح وسام ولقب [️ مستثمر مخضرم S1] لأفضل 25 لاعباً في السيرفر؟")) return;

        try {
          awardTop25Btn.disabled = true;
          awardTop25Btn.innerHTML ='<i class="fa-solid fa-spinner fa-spin"></i> جاري المنح والتكريم...';

          const awardPromise = AppDB.adminAwardTop25Veterans(cachedPlayers);
          const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ count: 25, players: [] }), 4000));
          const res = await Promise.race([awardPromise, timeoutPromise]);

          showToast('وسام المخضرمين',`تم منح وسام [مستثمر مخضرم S1] بنجاح لـ ${res.count || 25} لاعباً من متصدري السيرفر! ️`,'success');
          logAdminAction(`منح وسام ولقب [مستثمر مخضرم S1] للتوب 25 (${res.count || 25} لاعب)`);
          
          // Refresh directory
          loadAdminPlayersDirectory(false, true);
        } catch (err) {
          showToast('خطأ في المنح', err.message,'error');
        } finally {
          awardTop25Btn.disabled = false;
          awardTop25Btn.innerHTML ='<i class="fa-solid fa-award"></i> <span>منح وسام مستثمر مخضرم S1 لأول 25 لاعب</span>';
        }
      });
    }

    // Clear Wire Transfers logs
    const clearTransfersBtn = document.getElementById('btn-admin-clear-transfers-log');
    if (clearTransfersBtn) {
      clearTransfersBtn.addEventListener('click', async () => {
        if (!confirm("هل تريد تفريغ سجل التحويلات المالية القديمة لتنظيف قاعدة البيانات؟")) return;
        try {
          const count = await AppDB.adminClearTransfers();
          showToast('تفريغ السجل',`تم مسح ${count} حركة تحويل مالي من السجل.`,'success');
          logAdminAction(`تفريغ وتنظيف سجل التحويلات المالية (${count} عملية)`);
          renderAdminTransfersMonitor();
        } catch (err) {
          showToast('خطأ تفريغ السجل', err.message,'error');
        }
      });
    }

    // Refresh Transfers Audit Button
    const refreshTransfersBtn = document.getElementById('btn-admin-refresh-transfers');
    if (refreshTransfersBtn) {
      refreshTransfersBtn.addEventListener('click', () => {
        renderAdminTransfersMonitor();
        showToast('تحديث التحويلات','تم جلب أحدث سجلات التحويلات المالية.','success');
      });
    }

    // Refresh Stats Button
    const refreshStatsBtn = document.getElementById('btn-admin-refresh-stats');
    if (refreshStatsBtn) {
      refreshStatsBtn.addEventListener('click', () => {
        renderAdminAnalyticsDashboard();
        showToast('تحديث الإحصائيات','تم تحديث لوحة الإحصائيات الحية بنجاح.','success');
      });
    }

    // Tax Policy Settings (Admin) - Synchronized across Stats and Market Tabs
    function getTaxInputs() {
      const mul = document.getElementById('adm-tax-multiplier-mkt') || document.getElementById('adm-tax-multiplier');
      const sil = document.getElementById('adm-tax-silver-mkt') || document.getElementById('adm-tax-silver');
      const maj = document.getElementById('adm-tax-major-mkt') || document.getElementById('adm-tax-major');
      const wha = document.getElementById('adm-tax-whale-mkt') || document.getElementById('adm-tax-whale');
      return {
        rateMultiplier: mul ? Number(mul.value) : 1.0,
        silverRate: sil ? Number(sil.value) : 0.000003,
        majorRate: maj ? Number(maj.value) : 0.000006,
        whaleRate: wha ? Number(wha.value) : 0.000010
      };
    }

    function syncTaxInputs(cfg) {
      if (!cfg) return;
      ['adm-tax-multiplier','adm-tax-multiplier-mkt'].forEach(id => {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = cfg.rateMultiplier;
      });
      ['adm-tax-silver','adm-tax-silver-mkt'].forEach(id => {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = cfg.silverRate;
      });
      ['adm-tax-major','adm-tax-major-mkt'].forEach(id => {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = cfg.majorRate;
      });
      ['adm-tax-whale','adm-tax-whale-mkt'].forEach(id => {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = cfg.whaleRate;
      });
    }
    window._adminSyncTaxInputs = syncTaxInputs;

    async function handleSaveTaxPolicy(btnEl, isMarketTab = false) {
      let rateMultiplier, silverRate, majorRate, whaleRate;
      if (isMarketTab) {
        rateMultiplier = Number(document.getElementById('adm-tax-multiplier-mkt').value);
        silverRate = Number(document.getElementById('adm-tax-silver-mkt').value);
        majorRate = Number(document.getElementById('adm-tax-major-mkt').value);
        whaleRate = Number(document.getElementById('adm-tax-whale-mkt').value);
      } else {
        rateMultiplier = Number(document.getElementById('adm-tax-multiplier').value);
        silverRate = Number(document.getElementById('adm-tax-silver').value);
        majorRate = Number(document.getElementById('adm-tax-major').value);
        whaleRate = Number(document.getElementById('adm-tax-whale').value);
      }

      if (isNaN(rateMultiplier) || rateMultiplier <= 0 || isNaN(silverRate) || silverRate < 0 || isNaN(majorRate) || majorRate < 0 || isNaN(whaleRate) || whaleRate < 0) {
        showToast('خطأ إدخال','يرجى التأكد من إدخال قيم صحيحة للضرائب وموجبة.','error');
        return;
      }

      try {
        if (btnEl) {
          btnEl.disabled = true;
          btnEl.textContent ='جاري الحفظ والتعميم...';
        }

        const cfg = { rateMultiplier, silverRate, majorRate, whaleRate };
        await AppDB.adminSaveTaxConfig(cfg);
        syncTaxInputs(cfg);

        showToast('تم الحفظ','تم تحديث ونشر السياسة الضريبية الجديدة لجميع اللاعبين بنجاح.','success');
        logAdminAction(`تعديل الضرائب: مضاعف ${rateMultiplier}x | فضية ${silverRate} | كبار ${majorRate} | حيتان ${whaleRate}`);
      } catch (err) {
        showToast('فشل حفظ الضرائب', err.message,'error');
      } finally {
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.innerHTML ='<i class="fa-solid fa-floppy-disk"></i> <span>تحديث السياسة الضريبية فوراً</span>';
        }
      }
    }

    const saveTaxPolicyBtn = document.getElementById('btn-admin-save-tax-policy');
    if (saveTaxPolicyBtn) {
      saveTaxPolicyBtn.addEventListener('click', () => handleSaveTaxPolicy(saveTaxPolicyBtn, false));
    }
    const saveTaxPolicyBtnMkt = document.getElementById('btn-admin-save-tax-policy-mkt');
    if (saveTaxPolicyBtnMkt) {
      saveTaxPolicyBtnMkt.addEventListener('click', () => handleSaveTaxPolicy(saveTaxPolicyBtnMkt, true));
    }

    // Store Items Configuration Event Listeners (Admin)
    const itemSelect = document.getElementById('admin-item-config-select');
    if (itemSelect) {
      itemSelect.addEventListener('change', () => {
        const itemId = itemSelect.value;
        const item = GameEngine.STORE_ITEMS[itemId];
        if (item) {
          document.getElementById('admin-item-config-cost').value = item.cost;
          document.getElementById('admin-item-config-duration').value = item.durationTicks * 3;
        }
      });
    }

    const saveItemConfigBtn = document.getElementById('btn-admin-save-item-config');
    if (saveItemConfigBtn) {
      saveItemConfigBtn.addEventListener('click', async () => {
        const itemId = document.getElementById('admin-item-config-select').value;
        const cost = Number(document.getElementById('admin-item-config-cost').value);
        const durationSec = Number(document.getElementById('admin-item-config-duration').value);

        if (isNaN(cost) || cost <= 0 || isNaN(durationSec) || durationSec <= 0) {
          showToast('خطأ إعدادات','يرجى إدخال قيم صحيحة وموجبة للسعر والمدة.','error');
          return;
        }

        try {
          saveItemConfigBtn.disabled = true;
          saveItemConfigBtn.textContent ='جاري حفظ التعديلات...';

          await AppDB.adminSaveItemConfig(itemId, cost, durationSec);

          await GameEngine.syncItemsConfig();

          showToast('تحديث الإعدادات',`تم حفظ وتعميم إعدادات الأداة بنجاح! السعر: ${cost.toLocaleString()} ج.م، المدة: ${durationSec} ثانية.`,'success');
          logAdminAction(`تحديث إعدادات الأداة (${itemId}): سعر ${cost.toLocaleString()} ج.م، مدة ${durationSec}ث`);
          renderAll();
        } catch (err) {
          showToast('فشل حفظ الإعدادات', err.message,'error');
        } finally {
          saveItemConfigBtn.disabled = false;
          saveItemConfigBtn.innerHTML ='<i class="fa-solid fa-floppy-disk"></i> <span>حفظ وتعميم إعدادات الأداة فوراً</span>';
        }
      });
    }

    // Admin Auctions creation button listener
    const btnCreateAuction = document.getElementById('btn-admin-create-auction');
    if (btnCreateAuction) {
      btnCreateAuction.addEventListener('click', async () => {
        const name = document.getElementById('admin-auction-name').value.trim();
        const desc = document.getElementById('admin-auction-desc').value.trim();
        const price = Number(document.getElementById('admin-auction-price').value);
        const qty = Number(document.getElementById('admin-auction-qty').value);

        if (!name || isNaN(price) || price <= 0 || isNaN(qty) || qty < 0) {
          showToast('خطأ إعدادات','يرجى إدخال قيم صحيحة وموجبة للاسم، السعر، والكمية.','error');
          return;
        }

        try {
          btnCreateAuction.disabled = true;
          btnCreateAuction.textContent ='جاري نشر المزاد...';

          await AppDB.adminCreateAuctionItem(name, desc, price, qty);

          showToast('تم النشر',`تم طرح الغرض"${name}" بنجاح في صفحة المزادات.`,'success');
          logAdminAction(`طرح غرض في المزاد: ${name} (سعر ${price.toLocaleString()} ج.م، كمية ${qty})`);

          // Clear inputs
          document.getElementById('admin-auction-name').value ='';
          document.getElementById('admin-auction-desc').value ='';
          document.getElementById('admin-auction-price').value ='';
          document.getElementById('admin-auction-qty').value ='';

          // Re-render
          fetchAndRenderAdminAuctions();
        } catch (err) {
          showToast('فشل إنشاء المزاد', err.message,'error');
        } finally {
          btnCreateAuction.disabled = false;
          btnCreateAuction.innerHTML ='<i class="fa-solid fa-plus"></i> <span>طرح الغرض للبيع فوراً في المزادات</span>';
        }
      });
    }

    // Admin Create Live Auction Click Listener
    const btnCreateLiveAuction = document.getElementById('btn-admin-create-live-auction');
    if (btnCreateLiveAuction) {
      btnCreateLiveAuction.addEventListener('click', async () => {
        const nameInput = document.getElementById('admin-live-auction-name');
        const typeSelect = document.getElementById('admin-live-auction-type');
        const priceInput = document.getElementById('admin-live-auction-baseprice');
        const condTypeSelect = document.getElementById('admin-live-auction-cond-type');
        const condValInput = document.getElementById('admin-live-auction-cond-value');

        const name = nameInput.value.trim();
        const type = typeSelect.value;
        const basePrice = parseInt(priceInput.value ||'0');
        const condType = condTypeSelect.value;
        const condVal = parseInt(condValInput.value ||'0');

        if (!name || basePrice <= 0 || condVal <= 0) {
          showToast('خطأ إدخال','يرجى ملء جميع تفاصيل المزاد الحي الجديد بقيم صحيحة.','error');
          return;
        }

        try {
          btnCreateLiveAuction.disabled = true;
          let startVal = condVal;
          if (condType ==='time') {
            startVal = Date.now() + (condVal * 60 * 1000);
          }

          await AppDB.adminCreateLiveAuction(type,'live_' + Math.random().toString(36).substr(2, 9), name, basePrice, condType, startVal);
          showToast('تم إطلاق المزاد الحي',`تم إدراج المزاد الحي (${name}) بنجاح وهو بانتظار المسجلين.`,'success');
          logAdminAction(`إطلاق مزاد حي: ${name} (سعر ابتدائي ${basePrice.toLocaleString()} ج.م، شرط ${condType}: ${condVal})`);

          nameInput.value ='';
          priceInput.value ='';
          condValInput.value ='';

          fetchAndRenderAdminLiveAuctions();
        } catch (err) {
          showToast('فشل المزاد', err.message,'error');
        } finally {
          btnCreateLiveAuction.disabled = false;
        }
      });
    }

    // Admin Gift Codes Select Change Listener
    const giftRewardTypeSelect = document.getElementById('admin-gift-reward-type');
    if (giftRewardTypeSelect) {
      giftRewardTypeSelect.addEventListener('change', () => {
        const type = giftRewardTypeSelect.value;
        document.getElementById('admin-gift-box-cash').classList.toggle('hidden', type !=='cash');
        document.getElementById('admin-gift-box-business').classList.toggle('hidden', type !=='business');
        document.getElementById('admin-gift-box-item').classList.toggle('hidden', type !=='item');
      });
    }

    // Admin Create Gift Code Click Listener
    const btnCreateGiftCode = document.getElementById('btn-admin-create-giftcode');
    if (btnCreateGiftCode) {
      btnCreateGiftCode.addEventListener('click', async () => {
        const code = document.getElementById('admin-gift-code').value.trim();
        const type = document.getElementById('admin-gift-reward-type').value;
        const maxUses = Number(document.getElementById('admin-gift-max-uses').value) || 0;

        if (!code) {
          showToast('خطأ إدخال','يرجى إدخال رمز كود الهدية.','error');
          return;
        }

        const details = {};
        if (type ==='cash') {
          const amt = Number(document.getElementById('admin-gift-cash-amount').value);
          if (isNaN(amt) || amt <= 0) {
            showToast('خطأ إدخال','يرجى إدخال مبلغ مالي صحيح وموجب.','error');
            return;
          }
          details.amount = amt;
        } else if (type ==='business') {
          const bId = document.getElementById('admin-gift-business-id').value;
          const lvl = Number(document.getElementById('admin-gift-business-lvl').value);
          const workers = Number(document.getElementById('admin-gift-business-workers').value);
          if (isNaN(lvl) || lvl <= 0 || isNaN(workers) || workers < 0) {
            showToast('خطأ إدخال','يرجى إدخال مستوى وعدد عمال صحيحين.','error');
            return;
          }
          details.businessId = bId;
          details.level = lvl;
          details.workers = workers;
        } else if (type ==='item') {
          const itemId = document.getElementById('admin-gift-item-id').value;
          details.itemId = itemId;
        }

        try {
          btnCreateGiftCode.disabled = true;
          btnCreateGiftCode.textContent ='جاري توليد الكود...';

          await AppDB.adminCreateGiftCode(code, type, details, maxUses);

          showToast('تم إنشاء الكود',`تم نشر كود الهدية"${code.toUpperCase()}" بنجاح في المنظومة.`,'success');
          logAdminAction(`إنشاء كود الهدية: ${code.toUpperCase()} (النوع: ${type})`);

          // Clear inputs
          document.getElementById('admin-gift-code').value ='';
          document.getElementById('admin-gift-max-uses').value ='0';
          document.getElementById('admin-gift-cash-amount').value ='';

          fetchAndRenderAdminGiftCodes();
        } catch (err) {
          showToast('فشل الإنشاء', err.message,'error');
        } finally {
          btnCreateGiftCode.disabled = false;
          btnCreateGiftCode.innerHTML ='<i class="fa-solid fa-plus"></i> <span>توليد ونشر كود الهدية فوراً</span>';
        }
      });
    }

    // Expose loader to global scope of module
    window._adminReloadPlayers = loadAdminPlayersDirectory;
    window._adminRenderStockPrices = renderAdminStockPrices;
  }

  // Quick Action Handlers for Anti-Cheat Suspicious List
  window.UIController = window.UIController || {};
  window.UIController.adminQuickJailAction = async function(username) {
    if (!confirm(`هل أنت متأكد من فرض عقوبة السجن على اللاعب ${username}؟`)) return;
    try {
      await AppDB.adminSetPlayerJail(username, 900);
      showToast('تم السجن',`تم سجن اللاعب ${username} لمدة 15 دقيقة بنجاح.`,'success');
      if (window._adminReloadPlayers) window._adminReloadPlayers(false);
      renderAdminAnalyticsDashboard();
    } catch (e) {
      showToast('خطأ', e.message,'error');
    }
  };

  window.UIController.adminQuickBanAction = async function(username) {
    if (!confirm(`هل أنت متأكد من حظر حساب اللاعب ${username} نهائياً؟`)) return;
    try {
      await AppDB.adminBanPlayer(username);
      showToast('تم الحظر',`تم حظر حساب اللاعب ${username} بنجاح.`,'success');
      if (window._adminReloadPlayers) window._adminReloadPlayers(false);
      renderAdminAnalyticsDashboard();
    } catch (e) {
      showToast('خطأ', e.message,'error');
    }
  };

  async function renderAdminAnalyticsDashboard() {
    try {
      const stats = await AppDB.getSystemStats();
      window._adminLastTotalPlayers = stats.totalPlayers || 0;
      
      const elP = document.getElementById('adm-stat-players');
      const elOnline = document.getElementById('adm-stat-online');
      const elHeaderOnline = document.getElementById('adm-header-online-count');
      const elC = document.getElementById('adm-stat-cash');
      const elB = document.getElementById('adm-stat-bank');
      const elNW = document.getElementById('adm-stat-networth') || document.getElementById('adm-stat-worth');
      const elJ = document.getElementById('adm-stat-jailed');
      const elBan = document.getElementById('adm-stat-banned');

      if (elP) {
        let badgeHtml ='';
        if (stats.isFromCache || stats.quotaExceeded) {
          badgeHtml =` <span class="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30" title="تم قراءة بعض البيانات من الكاش المحلي نظراً لبلوغ سقف كوتة Firebase المجانية">كاش </span>`;
        } else {
          badgeHtml =` <span class="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" title="بيانات حية مباشرة من السيرفر السحابي">حي </span>`;
        }
        elP.innerHTML =`${(stats.totalPlayers || 0).toLocaleString()}${badgeHtml}`;
      }
      if (elOnline) elOnline.textContent = (stats.onlineCount || 0).toLocaleString();
      if (elHeaderOnline) elHeaderOnline.textContent = (stats.onlineCount || 0).toLocaleString();
      if (elC) elC.textContent =`${(stats.totalCash || 0).toLocaleString()} EGP`;
      if (elB) elB.textContent =`${(stats.totalBank || 0).toLocaleString()} EGP`;
      if (elNW) elNW.textContent =`${(stats.totalNetWorth || 0).toLocaleString()} EGP`;
      if (elJ) elJ.textContent = (stats.jailedCount || 0).toLocaleString();
      if (elBan) elBan.textContent = (stats.bannedCount || 0).toLocaleString();

      // Show Quota Notice Banner if quota is exceeded
      let quotaBanner = document.getElementById('adm-quota-notice-banner');
      const statsContainer = document.getElementById('admin-subpanel-stats');
      if (stats.quotaExceeded) {
        if (!quotaBanner && statsContainer) {
          quotaBanner = document.createElement('div');
          quotaBanner.id ='adm-quota-notice-banner';
          quotaBanner.className ='p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2.5 shadow-lg';
          quotaBanner.innerHTML =`
            <i class="fa-solid fa-triangle-exclamation text-amber-400 text-sm mt-0.5 shrink-0"></i>
            <div>
              <strong class="block font-bold text-amber-300 mb-0.5">تنبيه سقف كوتة القراءات السحابية (Firebase Quota 429)</strong>
              <span class="text-[11px] text-amber-300/80 leading-relaxed">
                مشروع Firebase استنفد الحد الأقصى اليومي للقراءات المجانية (Resource Exhausted). الإحصائيات معروضة استناداً إلى العدادات التراكمية والكاش المحلي، وستعود المزامنة السحابية الكاملة للعمل تلقائياً فور تجدد الكوتة اليومية من Google.
              </span>
            </div>`;
          statsContainer.insertBefore(quotaBanner, statsContainer.firstChild);
        }
      } else if (quotaBanner) {
        quotaBanner.remove();
      }

      const refreshBtn = document.getElementById('btn-admin-refresh-stats');
      if (refreshBtn && !refreshBtn._bound) {
        refreshBtn._bound = true;
        refreshBtn.onclick = () => {
          showToast('تحديث','جاري إعادة حساب وفحص إحصائيات السيرفر...','info');
          renderAdminAnalyticsDashboard();
        };
      }

      // Populate tax inputs from current engine config (if not focused to avoid interrupting admin input)
      const currentCfg = GameEngine.getTaxConfig ? GameEngine.getTaxConfig() : null;
      if (currentCfg) {
        const mul = document.getElementById('adm-tax-multiplier');
        const sil = document.getElementById('adm-tax-silver');
        const maj = document.getElementById('adm-tax-major');
        const wha = document.getElementById('adm-tax-whale');
        if (mul && document.activeElement !== mul) mul.value = currentCfg.rateMultiplier;
        if (sil && document.activeElement !== sil) sil.value = currentCfg.silverRate;
        if (maj && document.activeElement !== maj) maj.value = currentCfg.majorRate;
        if (wha && document.activeElement !== wha) wha.value = currentCfg.whaleRate;
      }

      // 1. Render Wealth Distribution
      const wealthDistContainer = document.getElementById('adm-wealth-distribution-container');
      if (wealthDistContainer && stats.wealthBrackets) {
        const brackets = stats.wealthBrackets;
        const total = stats.totalPlayers || 1;
        const getPct = num => ((num / total) * 100).toFixed(1);

        wealthDistContainer.innerHTML =`
          <!-- Billionaires -->
          <div class="space-y-1">
            <div class="flex justify-between text-[11px] font-bold">
              <span class="text-amber-400">المليارديرات (+50M)</span>
              <span class="numbers-font text-white">${brackets.billionaires} (${getPct(brackets.billionaires)}%)</span>
            </div>
            <div class="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-805">
              <div class="h-full bg-gradient-to-l from-yellow-600 to-yellow-400 rounded-full transition-all duration-500" style="width: ${getPct(brackets.billionaires)}%"></div>
            </div>
          </div>
          <!-- Millionaires -->
          <div class="space-y-1">
            <div class="flex justify-between text-[11px] font-bold">
              <span class="text-sky-400">المليونيرات (5M - 50M)</span>
              <span class="numbers-font text-white">${brackets.millionaires} (${getPct(brackets.millionaires)}%)</span>
            </div>
            <div class="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-805">
              <div class="h-full bg-sky-500 rounded-full transition-all duration-500" style="width: ${getPct(brackets.millionaires)}%"></div>
            </div>
          </div>
          <!-- Middle Class -->
          <div class="space-y-1">
            <div class="flex justify-between text-[11px] font-bold">
              <span class="text-emerald-400">الطبقة المتوسطة (500k - 5M)</span>
              <span class="numbers-font text-white">${brackets.middleClass} (${getPct(brackets.middleClass)}%)</span>
            </div>
            <div class="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-805">
              <div class="h-full bg-emerald-500 rounded-full transition-all duration-500" style="width: ${getPct(brackets.middleClass)}%"></div>
            </div>
          </div>
          <!-- Working Class -->
          <div class="space-y-1">
            <div class="flex justify-between text-[11px] font-bold">
              <span class="text-slate-400">الطبقة الكادحة (&lt;500k)</span>
              <span class="numbers-font text-white">${brackets.workingClass} (${getPct(brackets.workingClass)}%)</span>
            </div>
            <div class="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-805">
              <div class="h-full bg-slate-500 rounded-full transition-all duration-500" style="width: ${getPct(brackets.workingClass)}%"></div>
            </div>
          </div>`;
      }

      // 2. Render Top 5 Richest comparison
      const topRichestContainer = document.getElementById('adm-top-richest-container');
      if (topRichestContainer && stats.topRichest) {
        const top5 = stats.topRichest;
        const maxWorth = top5.length > 0 ? (top5[0].netWorth || 1) : 1;

        topRichestContainer.innerHTML ='';
        if (top5.length === 0) {
          topRichestContainer.innerHTML ='<div class="text-[11px] text-slate-500 text-center py-4">لا توجد بيانات متاحة حالياً.</div>';
        } else {
          top5.forEach((p, idx) => {
            const widthPct = Math.max(8, Math.min(100, (p.netWorth / maxWorth) * 100));
            const bar = document.createElement('div');
            bar.className ='space-y-1';
            bar.innerHTML =`
              <div class="flex justify-between items-center text-[10px]">
                <span class="font-bold text-slate-200 flex items-center gap-1.5">
                  <span class="w-4 h-4 rounded bg-slate-800 text-slate-300 font-mono text-[9px] flex items-center justify-center font-bold">${idx + 1}</span>
                  <span class="text-yellow-400">${p.username}</span>
                  <span class="text-slate-500">(${p.title})</span>
                </span>
                <span class="numbers-font font-bold text-slate-300">${(p.netWorth).toLocaleString()} EGP</span>
              </div>
              <div class="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                <div class="h-full bg-gradient-to-l from-yellow-500 to-amber-500 rounded-full transition-all duration-500" style="width: ${widthPct}%"></div>
              </div>`;
            topRichestContainer.appendChild(bar);
          });
        }
      }

      // 3. Render Suspicious Accounts
      const suspiciousTbody = document.getElementById('adm-suspicious-accounts-tbody');
      if (suspiciousTbody) {
        const suspects = stats.suspiciousPlayers || [];
        suspiciousTbody.innerHTML ='';

        if (suspects.length === 0) {
          suspiciousTbody.innerHTML =`
            <tr>
              <td colspan="5" class="py-6 text-center text-slate-500">لا توجد حسابات مشبوهة مرصودة حالياً. السيرفر آمن تماماً!</td>
            </tr>`;
        } else {
          suspects.forEach(p => {
            const tr = document.createElement('tr');
            tr.className ='hover:bg-slate-900 border-b border-slate-800/40 transition duration-150';
            tr.innerHTML =`
              <td class="p-2.5 font-bold text-white">${p.username}</td>
              <td class="p-2.5 font-bold text-yellow-500 numbers-font">${(p.netWorth).toLocaleString()} EGP</td>
              <td class="p-2.5 text-center font-bold text-sky-400 numbers-font">${(p.xp).toLocaleString()}</td>
              <td class="p-2.5 text-rose-400 font-bold">${p.reason}</td>
              <td class="p-2.5 text-left flex gap-1.5 justify-end">
                <button onclick="UIController.adminQuickJailAction('${p.username}')" class="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-bold rounded-lg text-[10px] transition duration-150 flex items-center gap-1">
                  <i class="fa-solid fa-handcuffs"></i> سجن
                </button>
                <button onclick="UIController.adminQuickBanAction('${p.username}')" class="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold rounded-lg text-[10px] transition duration-150 flex items-center gap-1">
                  <i class="fa-solid fa-ban"></i> حظر
                </button>
              </td>`;
            suspiciousTbody.appendChild(tr);
          });
        }
      }

      logAdminAction(`تحديث الإحصائيات — الحسابات: ${stats.totalPlayers} | الثروة الكلية: ${(stats.totalNetWorth || 0).toLocaleString()} EGP`);
    } catch (e) {
      console.warn('[Admin Dashboard] Failed to load stats:', e);
    }
  }

  async function renderAdminTransfersMonitor() {
    const tbody = document.getElementById('admin-transfers-table-body');
    if (!tbody) return;
    tbody.innerHTML ='<tr><td colspan="5" class="py-4 text-center text-slate-400">جاري تحميل سجل التحويلات...</td></tr>';

    try {
      const transfers = await AppDB.adminGetTransfers();
      if (!transfers || transfers.length === 0) {
        tbody.innerHTML ='<tr><td colspan="5" class="py-6 text-center text-slate-500">لا يوجد عمليات تحويل مالية مسجلة حالياً.</td></tr>';
        return;
      }

      tbody.innerHTML ='';
      transfers.forEach(trf => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-800/50 hover:bg-slate-800/40 transition';
        const rawTime = trf.created_at || trf.createdAt || trf.timestamp || Date.now();
        const dateObj = new Date(rawTime);
        const isValidDate = !isNaN(dateObj.getTime());
        const dateStr = isValidDate 
          ? dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : 'مؤخراً';
        tr.innerHTML = `
          <td class="p-2.5 font-bold text-white">${escapeHtml(trf.sender)}</td>
          <td class="p-2.5 font-bold text-yellow-400">${escapeHtml(trf.recipient)}</td>
          <td class="p-2.5 text-center numbers-font font-bold text-emerald-400">+${(Number(trf.amount) || 0).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center numbers-font text-slate-400 text-[11px]">${dateStr}</td>
          <td class="p-2.5 text-left"><span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold text-[10px]">${escapeHtml(trf.status || 'مكتملة')}</span></td>`;
        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML =`<tr><td colspan="5" class="py-4 text-center text-rose-400">فشل تحميل سجل التحويلات: ${e.message}</td></tr>`;
    }
  }

  function escapeHtml(str) {
    if (!str) return'';
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ANTI-FEEDER & MULTI-ACCOUNT FRAUD MODERATION ACTIONS
  // ─────────────────────────────────────────────────────────────────────────────
  window.adminHandleFraudAction = async function(actionType, sender, recipient) {
    if (!sender && !recipient) {
      if (typeof showToast === 'function') showToast('خطأ', 'لم يتم تحديد أسماء اللاعبين', 'error');
      return;
    }

    const isUnknown = (u) => !u || u === 'غير معروف' || u === 'UNKNOWN' || u === 'SYSTEM';
    const validSender = !isUnknown(sender) ? sender.trim() : null;
    const validRecipient = !isUnknown(recipient) ? recipient.trim() : null;

    let targetUsers = [];
    let confirmMsg = '';
    let actionTitle = '';
    let popupTitle = '';
    let popupMessage = '';
    let doReset = false;
    let doBan = false;

    switch (actionType) {
      case 'reset_both':
        targetUsers = [validSender, validRecipient].filter(Boolean);
        if (targetUsers.length === 0) {
          alert('كلا الطرفين غير معروفين!');
          return;
        }
        confirmMsg = `⚠️ هل أنت متأكد من [تصفير كلا الطرفين] (${targetUsers.join(' و ')})؟\n\n` +
          `• سيتم مسح الكاش والبنك والأصول والمشاريع بالكامل لكلا الحسابين.\n` +
          `• سيتم إرسال تنبيه أمني عاجل لشاشة كل منهما يفيد بأنه تم كشفه وتصفير حسابه لمخالفة قوانين اللعبة.`;
        actionTitle = 'تصفير الطرفين';
        popupTitle = '⚠️ تنبيه أمني عاجل: تم كشف الحساب وتصفيره';
        popupMessage = 'تم رصد محاولة تحايل مالي وتعدد حسابات مخالف لقوانين اللعبة. تم تصفير كافة أرصدتك النقدية والبنكية وأصولك ومشاريعك بالكامل. أي تكرار للمخالفة سيؤدي للحظر النهائي لحسابك وجهازك.';
        doReset = true;
        break;

      case 'ban_both':
        targetUsers = [validSender, validRecipient].filter(Boolean);
        if (targetUsers.length === 0) {
          alert('كلا الطرفين غير معروفين!');
          return;
        }
        confirmMsg = `⛔ هل أنت متأكد من [حظر كلا الطرفين] (${targetUsers.join(' و ')}) نهائياً؟\n\n` +
          `• سيتم حظر الحسابين ومنعهما من الدخول للعبة نهائياً.\n` +
          `• سيتم إرسال تنبيه رسمي بالحظر النهائي لكل منهما.`;
        actionTitle = 'حظر الطرفين';
        popupTitle = '⛔ تم حظر حسابك نهائياً';
        popupMessage = 'تم حظر حسابك نهائياً من قبل إدارة اللعبة لمخالفة القوانين ومحاولة التحايل المالي وتعدد الحسابات ونقل الأموال المشبوهة.';
        doBan = true;
        break;

      case 'reset_ban_both':
        targetUsers = [validSender, validRecipient].filter(Boolean);
        if (targetUsers.length === 0) {
          alert('كلا الطرفين غير معروفين!');
          return;
        }
        confirmMsg = `💥 هل أنت متأكد من [تصفير وحظر كلا الطرفين معاً] (${targetUsers.join(' و ')})؟\n\n` +
          `• سيتم تصفير الأرصدة والمشاريع وحظر الحسابين نهائياً من اللعبة.\n` +
          `• سيتم إرسال تنبيه رسمي شديد اللهجة لكل منهما.`;
        actionTitle = 'تصفير وحظر الطرفين';
        popupTitle = '⛔ حظر وتصفير نهائي للحساب';
        popupMessage = 'تم تصفير حسابك وحظره نهائياً من قبل إدارة اللعبة لارتكاب مخالفة جسيمة ومحاولة التحايل المالي وتعدد الحسابات.';
        doReset = true;
        doBan = true;
        break;

      case 'reset_sender':
        if (!validSender) { alert('اسم الراسل غير صالح'); return; }
        targetUsers = [validSender];
        confirmMsg = `هل أنت متأكد من تصفير حساب الراسل (${validSender}) فقط وإرسال تنبيه الكشف له؟`;
        actionTitle = 'تصفير الراسل';
        popupTitle = '⚠️ تنبيه أمني عاجل: تم تصفير حسابك';
        popupMessage = 'تم رصد محاولة تحايل مالي وتغذية حسابات مشبوهة. تم تصفير كافة أرصدتك ومشاريعك بالكامل.';
        doReset = true;
        break;

      case 'reset_recipient':
        if (!validRecipient) { alert('اسم المستلم غير صالح'); return; }
        targetUsers = [validRecipient];
        confirmMsg = `هل أنت متأكد من تصفير حساب المستلم (${validRecipient}) فقط وإرسال تنبيه الكشف له؟`;
        actionTitle = 'تصفير المستلم';
        popupTitle = '⚠️ تنبيه أمني عاجل: تم تصفير حسابك';
        popupMessage = 'تم رصد استقبال أموال مشبوهة من حسابات وهمية. تم تصفير كافة أرصدتك ومشاريعك بالكامل.';
        doReset = true;
        break;

      case 'ban_sender':
        if (!validSender) { alert('اسم الراسل غير صالح'); return; }
        targetUsers = [validSender];
        confirmMsg = `هل أنت متأكد من حظر حساب الراسل (${validSender}) نهائياً؟`;
        actionTitle = 'حظر الراسل';
        popupTitle = '⛔ تم حظر حسابك نهائياً';
        popupMessage = 'تم حظر حسابك نهائياً من قبل إدارة اللعبة لإنشاء حسابات وهمية ومحاولة التحايل المالي.';
        doBan = true;
        break;

      case 'ban_recipient':
        if (!validRecipient) { alert('اسم المستلم غير صالح'); return; }
        targetUsers = [validRecipient];
        confirmMsg = `هل أنت متأكد من حظر حساب المستلم (${validRecipient}) نهائياً؟`;
        actionTitle = 'حظر المستلم';
        popupTitle = '⛔ تم حظر حسابك نهائياً';
        popupMessage = 'تم حظر حسابك نهائياً من قبل إدارة اللعبة لاستقبال أموال مشبوهة ومخالفة قوانين اللعبة.';
        doBan = true;
        break;

      case 'delete_sender':
        if (!validSender) { alert('اسم الراسل غير صالح'); return; }
        targetUsers = [validSender];
        confirmMsg = `🗑️ هل أنت متأكد من [مسح حساب الراسل] (${validSender}) نهائياً من قاعدة البيانات؟`;
        actionTitle = 'مسح الراسل';
        doDelete = true;
        break;

      case 'delete_recipient':
        if (!validRecipient) { alert('اسم المستلم غير صالح'); return; }
        targetUsers = [validRecipient];
        confirmMsg = `🗑️ هل أنت متأكد من [مسح حساب المستلم] (${validRecipient}) نهائياً من قاعدة البيانات؟`;
        actionTitle = 'مسح المستلم';
        doDelete = true;
        break;

      case 'delete_both':
        targetUsers = [validSender, validRecipient].filter(Boolean);
        if (targetUsers.length === 0) { alert('كلا الطرفين غير معروفين!'); return; }
        confirmMsg = `🗑️ هل أنت متأكد من [مسح كلا الحسابين] (${targetUsers.join(' و ')}) نهائياً من قاعدة البيانات؟`;
        actionTitle = 'مسح الطرفين';
        doDelete = true;
        break;

      case 'reset_ban_delete_both':
        targetUsers = [validSender, validRecipient].filter(Boolean);
        if (targetUsers.length === 0) { alert('كلا الطرفين غير معروفين!'); return; }
        confirmMsg = `💥 هل أنت متأكد من [تصفير وحظر ومسح كلا الطرفين] (${targetUsers.join(' و ')}) نهائياً؟`;
        actionTitle = 'تصفير وحظر ومسح الطرفين';
        doReset = true;
        doBan = true;
        doDelete = true;
        break;

      default:
        return;
    }

    if (!confirm(confirmMsg)) return;

    const notify = (title, msg, type = 'info') => {
      if (typeof showToast === 'function') showToast(title, msg, type);
      else if (typeof window.showToast === 'function') window.showToast(title, msg, type);
      else alert(`${title}\n${msg}`);
    };

    notify('جاري التنفيذ...', `جاري تنفيذ ${actionTitle} وإرسال التنبيهات...`, 'info');

    try {
      for (const uname of targetUsers) {
        // 1. Reset player if requested
        if (doReset && AppDB.adminResetPlayer) {
          await AppDB.adminResetPlayer(uname);
        }

        // 2. Ban player if requested (performed after reset so is_banned remains true)
        if (doBan && AppDB.adminBanPlayer) {
          await AppDB.adminBanPlayer(uname);
        }

        // 3. Delete player from DB if requested
        if (doDelete && AppDB.adminDeletePlayer) {
          await AppDB.adminDeletePlayer(uname);
        }

        // 3. Send direct in-game admin popup modal notification
        const popupPayload = {
          title: popupTitle,
          message: popupMessage,
          style: 'critical',
          sentAt: Date.now()
        };

        if (AppDB.sendMail) {
          await AppDB.sendMail('إدارة اللعبة (Admin)', uname, 'admin_popup', popupPayload);
        }

        // 4. Inject into player state directly for immediate trigger
        try {
          if (AppDB.adminGetPlayer && AppDB.adminSavePlayer) {
            const pState = await AppDB.adminGetPlayer(uname);
            if (pState) {
              pState.pendingAdminPopup = popupPayload;
              pState.adminModifiedTimestamp = Date.now();
              if (doBan) pState.isBanned = true;
              await AppDB.adminSavePlayer(uname, pState);
            }
          }
        } catch (e) {
          console.warn(`[Fraud Mod] direct state inject skipped for ${uname}:`, e);
        }
      }

      notify('تمت العملية بنجاح ✅', `تم تنفيذ ${actionTitle} بنجاح لـ [${targetUsers.join(', ')}] وإرسال شاشة التنبيه لهما.`, 'success');

      // Refresh admin tables
      if (typeof renderAdminFraudMonitor === 'function') renderAdminFraudMonitor();
      if (window._adminReloadPlayers) window._adminReloadPlayers(false);
      if (typeof renderAdminAnalyticsDashboard === 'function') renderAdminAnalyticsDashboard();

    } catch (err) {
      console.error('[Fraud Mod Error]', err);
      notify('فشل الإجراء', err.message || 'حدث خطأ أثناء تنفيذ الإجراء الإداري', 'error');
    }
  };

  window.adminHandleFraudDropdown = function(selectEl, sender, recipient) {
    if (!selectEl) return;
    const val = selectEl.value;
    selectEl.selectedIndex = 0;
    if (!val) return;
    window.adminHandleFraudAction(val, sender, recipient);
  };

  window.adminBanPlayer = function(username) {
    window.adminHandleFraudAction('ban_sender', username, '');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ANTI-FEEDER DIRECT ACTION CONSOLE & AUTOMATED PURGE ENGINE
  // ─────────────────────────────────────────────────────────────────────────────
  window.adminExecuteAccountAction = async function(actionType) {
    const input = document.getElementById('input-admin-target-fake-users');
    if (!input || !input.value.trim()) {
      alert('يرجى كتابة اسم الحساب أو الحسابات أولاً في الحقل (مثل: user1, user2).');
      return;
    }

    const rawTargets = input.value.split(',').map(s => s.trim()).filter(Boolean);
    if (rawTargets.length === 0) {
      alert('لم يتم العثور على أسماء حسابات صالحة.');
      return;
    }

    const actionNames = {
      reset: 'تصفير أرصدة ومشاريع',
      ban: 'حظر نهائي',
      delete: 'مسح نهائي من قاعدة البيانات',
      full_purge: 'تصفير + حظر + مسح نهائي شامل'
    };

    const label = actionNames[actionType] || actionType;
    if (!confirm(`⚠️ هل أنت متأكد من تنفيذ [${label}] على الحسابات التالية (${rawTargets.length} حساب)؟\n\n${rawTargets.join(', ')}`)) {
      return;
    }

    const notify = (title, msg, type = 'info') => {
      if (typeof showToast === 'function') showToast(title, msg, type);
      else if (typeof window.showToast === 'function') window.showToast(title, msg, type);
      else alert(`${title}\n${msg}`);
    };

    notify('جاري المعالجة...', `جاري تنفيذ ${label} على ${rawTargets.length} حساب...`, 'info');

    let successCount = 0;
    for (const uname of rawTargets) {
      try {
        if (actionType === 'reset' || actionType === 'full_purge') {
          if (AppDB.adminResetPlayer) await AppDB.adminResetPlayer(uname);
        }
        if (actionType === 'ban' || actionType === 'full_purge') {
          if (AppDB.adminBanPlayer) await AppDB.adminBanPlayer(uname);
        }
        if (actionType === 'delete' || actionType === 'full_purge') {
          if (AppDB.adminDeletePlayer) await AppDB.adminDeletePlayer(uname);
        }
        successCount++;
      } catch (err) {
        console.warn(`[Anti-Feeder Hub] Error executing ${actionType} on ${uname}:`, err);
      }
    }

    input.value = '';
    notify('تم بنجاح ✅', `تمت عملية [${label}] بنجاح لـ ${successCount} من أصل ${rawTargets.length} حساب.`, 'success');

    if (typeof renderAdminFraudMonitor === 'function') renderAdminFraudMonitor();
    if (window._adminReloadPlayers) window._adminReloadPlayers(false);
  };

  window.adminPurgeFeederAccounts = async function() {
    const notify = (title, msg, type = 'info') => {
      if (typeof showToast === 'function') showToast(title, msg, type);
      else if (typeof window.showToast === 'function') window.showToast(title, msg, type);
      else alert(`${title}\n${msg}`);
    };

    notify('جاري الفحص...', 'جاري فحص جميع الحسابات في السحابة لرصد الحسابات الوهمية والصفرية...', 'info');

    try {
      const fetchFn = AppDB.adminGetAllPlayers || AppDB.getAllPlayersAdmin;
      const players = fetchFn ? await fetchFn.call(AppDB) : [];
      if (!Array.isArray(players) || players.length === 0) {
        alert('لم يتم العثور على أي حسابات في السحابة.');
        return;
      }

      function isGibberishUsername(name) {
        const n = (name || '').toLowerCase().trim();
        if (!n || n.length < 3) return false;

        // 1. All Digits (e.g. 123, 999, 0000, 777)
        if (/^\d+$/.test(n)) return true;

        // 2. First two or last two letters identical in short names (e.g. Qqd, Qqa, Nnn, Bbb, Vvv, Ccc, Xxx, aQQ)
        if (n.length <= 5 && (n[0] === n[1] || n[n.length - 1] === n[n.length - 2])) return true;

        // 3. 3 or more consecutive consonants (e.g. qwx, zxc, vbn, fgh, jkl, bcdf, xqz, ghj, mnb, kjl, trv, bcz, xrq)
        if (/[bcdfghjklmnpqrstvwxyz]{3,}/i.test(n)) return true;

        // 4. No vowels at all in an English/alphanumeric username of length >= 3 (e.g. qwx, zxc, fgh)
        if (/^[a-z0-9_-]{3,}$/i.test(n) && !/[aeiouy]/i.test(n)) return true;

        // 5. Repeated characters (2 or more identical letters/digits in a row, e.g. aa, bb, cc, 11, aaa, fff, 999)
        if (/(.)\1/.test(n)) return true;

        // 6. 3-character username rule
        if (n.length === 3) return true;

        // 7. English keyboard slide patterns (3+ chars)
        const kbPatterns = [
          'qwe','wer','ert','rty','tyu','yui','uio','iop',
          'asd','sdf','dfg','fgh','ghj','hjk','jkl',
          'zxc','xcv','cvb','vbn','bnm',
          'qaz','wsx','edc','rfv','tgb','yhn','ujm',
          'zaq','xsw','cde','vfr','bgt','nhy','mju',
          '123','234','345','456','567','678','789','987','876','765','654','543','432','321'
        ];
        for (let i = 0; i < kbPatterns.length; i++) {
          if (n.includes(kbPatterns[i])) return true;
        }

        // 8. Arabic keyboard slide patterns (3+ chars)
        const arKbPatterns = [
          'شسب','سيب','يبل','بلا','لات','اتن','تنم','نمك','مكط',
          'ضصث','صثق','ثقف','قفع','فعل','علف','خحه','حخه','عغب','غبا','باي'
        ];
        for (let i = 0; i < arKbPatterns.length; i++) {
          if (n.includes(arKbPatterns[i])) return true;
        }

        // 9. High consonant ratio for short names (4+ chars with 0 vowels)
        if (n.length >= 4 && !/[aeiouy]/i.test(n)) return true;

        return false;
      }

      // Filter feeder accounts based on exact criteria:
      // 1. Has ZERO businesses/projects/assets/cars/stocks.
      // 2. EXCEPTION: Exclude any account that has ever purchased a top-up package (UNCONDITIONAL).
      // 3. Username is gibberish OR generated bot pattern (Qqd, Qqa, Nnn, Bbb, Vvv, Ccc) OR has redeemed gift code without projects OR length is 3 OR contains consecutive duplicate letters.
      const fakeAccounts = players.filter(p => {
        if (p.isAdmin || p.is_admin || p.isBanned || p.is_banned) return false;
        
        const pState = (typeof p.state === 'object' && p.state) ? p.state : p;
        const uname = (p.username || pState.username || '').trim();
        if (!uname) return false;

        // --- RULE 1: EXCEPTION FOR TOP-UP PURCHASERS (UNCONDITIONAL) ---
        const hasPurchasedTopup = (
          pState.hasPurchasedTopup === true ||
          (pState.purchasedTopups || 0) > 0 ||
          pState.isVerified === true ||
          pState.vipVerified === true ||
          pState.hasChatGlow === true ||
          Boolean(pState.chatGlow) ||
          (Array.isArray(pState.topupHistory) && pState.topupHistory.length > 0) ||
          (Array.isArray(pState.topupReceipts) && pState.topupReceipts.length > 0)
        );

        if (hasPurchasedTopup) {
          return false; // Excluded! Purchased a top-up package before.
        }

        // --- RULE 2: MUST HAVE ZERO PROJECTS / BUSINESSES / ASSETS ---
        const bizObj = pState.businesses || p.businesses || {};
        const bizCount = Object.values(bizObj).filter(b => b && ((b.level || 0) > 0 || (b.workers || 0) > 0)).length;

        const assetObj = pState.assets || p.assets || {};
        const assetCount = Object.values(assetObj).filter(v => (typeof v === 'number' ? v : (v && (v.level || v.count) || 0)) > 0).length;

        const cars = pState.ownedCars || p.ownedCars || pState.cars || [];
        const carCount = Array.isArray(cars) ? cars.length : Object.keys(cars).length;

        const stockObj = pState.stocks || p.stocks || {};
        const stockShares = Object.values(stockObj).reduce((sum, s) => sum + (s && (s.shares || s.count || 0) || (typeof s === 'number' ? s : 0)), 0);

        const hasZeroProjects = (bizCount === 0 && assetCount === 0 && carCount === 0 && stockShares === 0);

        if (!hasZeroProjects) {
          return false; // Has active projects! Not a 0-biz feeder.
        }

        // --- RULE 3: GIBBERISH / BOT PATTERN / 3-CHAR / REPEATED CHAR USERNAME DETECTION ---
        const isGibberish = isGibberishUsername(uname);

        const nLower = uname.toLowerCase();
        const isShortBotPattern = (
          nLower.length <= 4 && (
            nLower[0] === nLower[1] || // e.g. Qqd, Qqa, Nnn, Bbb, Vvv, Ccc, Xxx
            nLower[1] === nLower[2] || // e.g. aQQ, bNN
            !/[aeiouy]/i.test(nLower) || // e.g. qwx, zxc, fgh, jkl
            (/^[a-z0-9]{3,4}$/i.test(nLower) && (pState.xp || p.xp || 0) <= 50) // Short 3-4 char name with 0 projects & <= 50 XP
          )
        );

        const hasRedeemedGiftCode = (
          pState.hasRedeemedGiftCode === true ||
          (pState.giftCodesRedeemed || 0) > 0 ||
          (pState.totalGiftRewards || 0) > 0 ||
          (Array.isArray(pState.redeemedCodes) && pState.redeemedCodes.length > 0)
        );

        const isThreeChars = (nLower.length === 3);
        const hasDoubleRepeatedLetter = /(.)\1/.test(nLower);

        return isGibberish || isShortBotPattern || hasRedeemedGiftCode || isThreeChars || hasDoubleRepeatedLetter;
      });

      if (fakeAccounts.length === 0) {
        alert('✅ السيرفر نظيف بالكامل: لم يتم العثور على أي حسابات وهمية بدون مشاريع في السحابة!');
        return;
      }

      const fakeUsernames = fakeAccounts.map(p => p.username);
      const excludedUsernames = new Set();
      
      const targetInput = document.getElementById('input-admin-target-fake-users');
      const modal = document.getElementById('admin-modal-purge-preview');
      const badge = document.getElementById('admin-purge-count-badge');
      const listContainer = document.getElementById('admin-purge-preview-list');
      const confirmBtn = document.getElementById('btn-admin-confirm-purge-all');

      function updatePurgePreviewUI() {
        const activePurgeUsernames = fakeUsernames.filter(u => !excludedUsernames.has(u));
        
        if (badge) {
          badge.innerHTML = `<span class="font-bold text-rose-400 font-mono text-sm">${activePurgeUsernames.length}</span> <span class="text-slate-400 text-xs">(من أصل ${fakeAccounts.length})</span>`;
        }

        if (targetInput) {
          targetInput.value = activePurgeUsernames.join(', ');
        }

        if (confirmBtn) {
          const btnLabel = confirmBtn.querySelector('span');
          if (btnLabel) {
            btnLabel.textContent = `تصفير وحظر ومسح ${activePurgeUsernames.length} حساب محدد`;
          }
          confirmBtn.disabled = (activePurgeUsernames.length === 0);
          confirmBtn.style.opacity = activePurgeUsernames.length === 0 ? '0.5' : '1.0';
        }

        if (listContainer) {
          listContainer.innerHTML = fakeAccounts.map((p, idx) => {
            const isExcluded = excludedUsernames.has(p.username);
            const cash = Number(p.cash || 0).toLocaleString();
            const rawCreated = p.created_at || (p.state && (p.state.createdAt || p.state.created_at));
            const dateStr = rawCreated ? new Date(rawCreated).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : 'حديث';
            const safeUname = escapeHtml(p.username);

            if (isExcluded) {
              return `
                <div class="flex items-center justify-between p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/30 transition text-xs opacity-75">
                  <div class="flex items-center gap-2">
                    <span class="text-slate-500 font-mono text-[10px] w-5 text-center">${idx + 1}.</span>
                    <span class="font-bold text-emerald-300 text-sm line-through decoration-slate-500">${safeUname}</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-sans">🛡️ مستثنى (آمن)</span>
                  </div>
                  <div class="flex items-center gap-3 text-[11px]">
                    <span class="text-slate-400 font-bold">${cash} EGP</span>
                    <button onclick="window._toggleExcludePurgeUser('${safeUname}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer">
                      <i class="fa-solid fa-rotate-left"></i> <span>إلغاء الاستثناء</span>
                    </button>
                  </div>
                </div>
              `;
            } else {
              return `
                <div class="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/40 transition text-xs">
                  <div class="flex items-center gap-2">
                    <span class="text-slate-500 font-mono text-[10px] w-5 text-center">${idx + 1}.</span>
                    <span class="font-bold text-rose-300 text-sm">${safeUname}</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans">0 مشاريع (Feeder)</span>
                  </div>
                  <div class="flex items-center gap-3 text-[11px]">
                    <span class="text-emerald-400 font-bold">${cash} EGP</span>
                    <span class="text-slate-500 text-[10px]">${dateStr}</span>
                    <button onclick="window._toggleExcludePurgeUser('${safeUname}')" class="px-2.5 py-1 bg-slate-800 hover:bg-rose-950/60 text-rose-400 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/60 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer">
                      <i class="fa-solid fa-shield-halved"></i> <span>استثناء</span>
                    </button>
                  </div>
                </div>
              `;
            }
          }).join('');
        }
      }

      window._toggleExcludePurgeUser = function(uname) {
        if (excludedUsernames.has(uname)) {
          excludedUsernames.delete(uname);
        } else {
          excludedUsernames.add(uname);
        }
        updatePurgePreviewUI();
      };

      // Initial render
      updatePurgePreviewUI();

      // Show modal
      if (modal) modal.classList.remove('hidden');

      // Bind confirm action
      if (confirmBtn) {
        confirmBtn.onclick = async function() {
          const targetsToPurge = fakeUsernames.filter(u => !excludedUsernames.has(u));
          if (targetsToPurge.length === 0) {
            alert('لم تقم بتحديد أي حسابات للتطهير (تم استثناء جميع الحسابات).');
            return;
          }

          modal.classList.add('hidden');
          notify('جاري التطهير التلقائي...', `جاري مسح وحظر وتصفير ${targetsToPurge.length} حساب محدد...`, 'info');

          let purgedCount = 0;
          for (const uname of targetsToPurge) {
            try {
              if (AppDB.adminResetPlayer) await AppDB.adminResetPlayer(uname);
              if (AppDB.adminBanPlayer) await AppDB.adminBanPlayer(uname);
              if (AppDB.adminDeletePlayer) await AppDB.adminDeletePlayer(uname);
              purgedCount++;
            } catch (e) {}
          }

          notify('تم التطهير التلقائي ✅', `تم مسح وحظر ${purgedCount} حساب وهمي بنجاح وتنظيف قاعدة البيانات.`, 'success');

          if (typeof renderAdminFraudMonitor === 'function') renderAdminFraudMonitor();
          if (window._adminReloadPlayers) window._adminReloadPlayers(false);
        };
      }

    } catch (err) {
      console.error('[Purge Feeder Error]', err);
      alert('فشل عملية التطهير: ' + err.message);
    }
  };

  window.adminAuditFeederNetwork = async function() {
    const notify = (title, msg, type = 'info') => {
      if (typeof showToast === 'function') showToast(title, msg, type);
      else alert(`${title}\n${msg}`);
    };

    const targetInput = document.getElementById('input-admin-target-feeder-recipient');
    let recipientUser = targetInput ? targetInput.value.trim() : '';
    if (!recipientUser) {
      recipientUser = prompt('أدخل اسم المستلم المراد فحص واسترداد شبكة التحويلات المجمّعة له (مثال: Zoz):');
    }
    if (!recipientUser) return;
    recipientUser = recipientUser.trim();

    notify('جاري الفحص التحقيقي...', `جاري فحص جميع التحويلات المالية الواردة للحساب "${recipientUser}"...`, 'info');

    try {
      // 1. Fetch all transfers where recipient = recipientUser
      let transfers = [];
      try {
        const rows = await AppDB._api(`transfers?recipient=eq.${encodeURIComponent(recipientUser)}&select=sender,amount,created_at`);
        transfers = rows || [];
      } catch (e) {
        console.warn('[Feeder Network Audit] Transfers fetch note:', e.message);
      }

      // 2. Fetch all players to check sender states
      const fetchFn = AppDB.adminGetAllPlayers || AppDB.getAllPlayersAdmin;
      const players = fetchFn ? await fetchFn.call(AppDB) : [];
      const playersMap = {};
      (players || []).forEach(p => {
        const uname = p.username || (p.state && p.state.username);
        if (uname) playersMap[uname] = p;
      });

      // Group transfers by sender
      const feederSenders = {};
      let totalFunnelledCash = 0;

      transfers.forEach(t => {
        const senderName = t.sender;
        const amt = Number(t.amount || 0);
        const p = playersMap[senderName];
        if (!p) return;

        const pState = (typeof p.state === 'object' && p.state) ? p.state : p;
        
        // Check if sender has 0 projects and no topup
        const bizObj = pState.businesses || p.businesses || {};
        const bizCount = Object.values(bizObj).filter(b => b && ((b.level || 0) > 0 || (b.workers || 0) > 0)).length;

        const assetObj = pState.assets || p.assets || {};
        const assetCount = Object.values(assetObj).filter(v => (typeof v === 'number' ? v : (v && (v.level || v.count) || 0)) > 0).length;

        const cars = pState.ownedCars || p.ownedCars || pState.cars || [];
        const carCount = Array.isArray(cars) ? cars.length : Object.keys(cars).length;

        const stockObj = pState.stocks || p.stocks || {};
        const stockShares = Object.values(stockObj).reduce((sum, s) => sum + (s && (s.shares || s.count || 0) || (typeof s === 'number' ? s : 0)), 0);

        const hasZeroProjects = (bizCount === 0 && assetCount === 0 && carCount === 0 && stockShares === 0);

        if (hasZeroProjects && !pState.hasPurchasedTopup) {
          if (!feederSenders[senderName]) {
            feederSenders[senderName] = 0;
          }
          feederSenders[senderName] += amt;
          totalFunnelledCash += amt;
        }
      });

      // Also check all players directly in case transfers table had limits or logs
      (players || []).forEach(p => {
        const pState = (typeof p.state === 'object' && p.state) ? p.state : p;
        const uname = p.username || pState.username;
        if (!uname || uname.toLowerCase() === recipientUser.toLowerCase()) return;

        const hasZeroProjects = (
          Object.values(pState.businesses || {}).length === 0 &&
          Object.values(pState.assets || {}).length === 0 &&
          (pState.ownedCars || []).length === 0
        );

        if (hasZeroProjects && !pState.hasPurchasedTopup) {
          const activity = pState.activityLog || [];
          const transferredToTarget = activity.some(act => 
            act.details && act.details.toLowerCase().includes(recipientUser.toLowerCase())
          );
          if (transferredToTarget && !feederSenders[uname]) {
            feederSenders[uname] = 0;
          }
        }
      });

      const feederUsernames = Object.keys(feederSenders);
      if (feederUsernames.length === 0) {
        alert(`✅ لم يتم العثور على أي تحويلات مشبوهة من حسابات وهمية (0 مشاريع) إلى الحساب "${recipientUser}".`);
        return;
      }

      const confirmMsg = `⚠️ نتائج التحقيق في شبكة الحسابات الوهمية لـ (${recipientUser}):\n\n` +
        `• عدد حسابات التجميع (Feeders) المكتشفة: ${feederUsernames.length} حساب\n` +
        `• إجمالي الأموال المجمّعة والمحولة: ${totalFunnelledCash.toLocaleString()} EGP\n\n` +
        `قائمة الحسابات الوهمية المجمّعة:\n${feederUsernames.join(', ')}\n\n` +
        `هل تريد تصفير وحظر ومسح جميع هذه الحسابات الوهمية (${feederUsernames.length}) واسترداد/خصم مبلغ (${totalFunnelledCash.toLocaleString()} EGP) من حساب (${recipientUser})؟`;

      if (!confirm(confirmMsg)) return;

      notify('جاري تطهير الشبكة واسترداد الأموال...', `جاري مسح ${feederUsernames.length} حساب وهمي واسترداد الأموال...`, 'info');

      let purgedCount = 0;
      for (const uname of feederUsernames) {
        try {
          if (AppDB.adminResetPlayer) await AppDB.adminResetPlayer(uname);
          if (AppDB.adminBanPlayer) await AppDB.adminBanPlayer(uname);
          if (AppDB.adminDeletePlayer) await AppDB.adminDeletePlayer(uname);
          purgedCount++;
        } catch (e) {}
      }

      // Deduct funnelled illegal cash from recipient's balance
      try {
        const recipState = await AppDB.getPlayerState(recipientUser);
        if (recipState) {
          const currentCash = Number(recipState.cash || 0);
          const currentBank = Number(recipState.bank || 0);
          
          let remainingDeduct = totalFunnelledCash;
          let newCash = currentCash;
          let newBank = currentBank;

          if (newCash >= remainingDeduct) {
            newCash -= remainingDeduct;
          } else {
            remainingDeduct -= newCash;
            newCash = 0;
            newBank = Math.max(0, newBank - remainingDeduct);
          }

          recipState.cash = newCash;
          recipState.bank = newBank;
          recipState.netWorth = Math.max(0, (recipState.netWorth || 0) - totalFunnelledCash);

          await AppDB.savePlayerState(recipientUser, recipState, true);
        }
      } catch (deductErr) {
        console.error('[Feeder Network Audit] Deduction note:', deductErr.message);
      }

      notify('تم تطهير الشبكة واسترداد الأموال ✅', `تم مسح وحظر ${purgedCount} حساب وهمي بنجاح، وخصم ${totalFunnelledCash.toLocaleString()} EGP من حساب "${recipientUser}".`, 'success');

      if (typeof renderAdminFraudMonitor === 'function') renderAdminFraudMonitor();
      if (window._adminReloadPlayers) window._adminReloadPlayers(false);

    } catch (err) {
      console.error('[Feeder Network Audit Error]', err);
      alert('فشل عملية فحص وتطهير الشبكة: ' + err.message);
    }
  };

  async function renderAdminFraudMonitor() {
    const tbody = document.getElementById('admin-fraud-table-body');
    const badge = document.getElementById('admin-fraud-badge');
    const regDevicesEl = document.getElementById('admin-fraud-registered-devices');
    const blockedCountEl = document.getElementById('admin-fraud-blocked-count');
    const feedersCountEl = document.getElementById('admin-fraud-feeders-count');

    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-slate-500 font-sans"><i class="fa-solid fa-spinner fa-spin mr-2"></i>جاري تحميل سجل الأمان والمكافحة...</td></tr>';
    }

    try {
      const [alerts, registry] = await Promise.all([
        AppDB.getFraudAlerts ? AppDB.getFraudAlerts(100) : [],
        AppDB.getDeviceRegistry ? AppDB.getDeviceRegistry() : { devices: {}, accounts: {} }
      ]);

      const deviceCount = Object.keys((registry && registry.devices) || {}).length;
      if (regDevicesEl) regDevicesEl.textContent = deviceCount.toLocaleString();

      const blockedCount = alerts.length;
      if (blockedCountEl) blockedCountEl.textContent = blockedCount.toLocaleString();

      const feederCount = alerts.filter(a => a.type === 'FEEDER_EMPTY_ACCOUNT' || a.type === 'SIMILAR_NAME_FEEDER' || a.type === 'GIBBERISH_NAME_FEEDER').length;
      if (feedersCountEl) feedersCountEl.textContent = feederCount.toLocaleString();

      if (badge) {
        badge.textContent = blockedCount;
        if (blockedCount > 0) {
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }

      if (!tbody) return;

      if (!alerts || alerts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-emerald-400 font-sans">
          <i class="fa-solid fa-shield-check text-2xl mb-2 block"></i>
          المنظومة آمنة بالكامل: لم يتم تسجيل أي محاولات تحايل أو تعدد حسابات مشبوهة حتى الآن.
        </td></tr>`;
        return;
      }

      const typeLabels = {
        'MULTI_ACCOUNT_SAME_DEVICE': '<span class="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30">نفس الجهاز (Same Device)</span>',
        'FEEDER_EMPTY_ACCOUNT': '<span class="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30">حساب فارغ (Feeder 0 Biz)</span>',
        'SIMILAR_NAME_FEEDER': '<span class="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30">تشابه أسماء مريب (Clone)</span>',
        'GIBBERISH_NAME_FEEDER': '<span class="px-2 py-0.5 rounded text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30">اسم عشوائي (Gibberish)</span>',
        'RAPID_MULTI_FEEDER_RECIPIENT': '<span class="px-2 py-0.5 rounded text-[10px] bg-red-600/20 text-red-300 border border-red-500/30">سيل حسابات مجمّعة (Funnel)</span>'
      };

      tbody.innerHTML = alerts.map(a => {
        const timeStr = a.timestamp ? new Date(a.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '--';
        const typeBadge = typeLabels[a.type] || `<span class="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">${a.type || 'UNKNOWN'}</span>`;
        const amtStr = Number(a.amount || 0) > 0 ? `${Number(a.amount).toLocaleString()} EGP` : '-';
        const rawSender = a.sender || 'غير معروف';
        const rawRecipient = a.recipient || 'غير معروف';
        const sender = escapeHtml(rawSender);
        const recipient = escapeHtml(rawRecipient);
        const details = escapeHtml(a.details || '');
        const safeSenderArg = encodeURIComponent(rawSender);
        const safeRecipientArg = encodeURIComponent(rawRecipient);

        return `
          <tr class="hover:bg-slate-900/60 transition border-b border-slate-800/40">
            <td class="p-2.5 text-slate-400 text-[11px] whitespace-nowrap">${timeStr}</td>
            <td class="p-2.5 whitespace-nowrap">${typeBadge}</td>
            <td class="p-2.5 font-bold text-rose-300">${sender}</td>
            <td class="p-2.5 font-bold text-amber-300">${recipient}</td>
            <td class="p-2.5 text-center text-emerald-400 font-bold whitespace-nowrap">${amtStr}</td>
            <td class="p-2.5 text-slate-300 text-[11px] font-sans max-w-xs">${details}</td>
            <td class="p-2.5 text-center whitespace-nowrap">
              <div class="flex items-center justify-center gap-1.5 flex-wrap">
                <!-- تصفير كلا الطرفين -->
                <button onclick="window.adminHandleFraudAction && window.adminHandleFraudAction('reset_both', decodeURIComponent('${safeSenderArg}'), decodeURIComponent('${safeRecipientArg}'))"
                  class="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-amber-200 rounded-lg text-[10px] font-black transition flex items-center gap-1 cursor-pointer shadow-sm"
                  title="تصفير أموال ومشاريع الطرفين وإرسال تنبيه كشف رسمي لهما">
                  <i class="fa-solid fa-rotate-left text-xs"></i>
                  <span>تصفير الطرفين</span>
                </button>
                
                <!-- حظر كلا الطرفين -->
                <button onclick="window.adminHandleFraudAction && window.adminHandleFraudAction('ban_both', decodeURIComponent('${safeSenderArg}'), decodeURIComponent('${safeRecipientArg}'))"
                  class="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 hover:text-rose-200 rounded-lg text-[10px] font-black transition flex items-center gap-1 cursor-pointer shadow-sm"
                  title="حظر كلا الطرفين نهائياً من اللعبة وإرسال تنبيه الحظر لهما">
                  <i class="fa-solid fa-ban text-xs"></i>
                  <span>حظر الطرفين</span>
                </button>

                <!-- قائمة الإجراءات الفردية والمتقدمة -->
                <select onchange="window.adminHandleFraudDropdown && window.adminHandleFraudDropdown(this, decodeURIComponent('${safeSenderArg}'), decodeURIComponent('${safeRecipientArg}'))"
                  class="px-2 py-1 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold cursor-pointer transition focus:outline-none focus:border-cyan-400">
                  <option value="" disabled selected>المزيد ▾</option>
                  <option value="reset_ban_both">💥 تصفير + حظر الطرفين معاً</option>
                  <option value="reset_ban_delete_both">💀 تصفير + حظر + مسح نهائي للطرفين</option>
                  <option value="delete_both">🗑️ مسح كلا الحسابين نهائياً</option>
                  <option value="reset_sender">⚠️ تصفير الراسل (${sender})</option>
                  <option value="reset_recipient">⚠️ تصفير المستلم (${recipient})</option>
                  <option value="ban_sender">⛔ حظر الراسل (${sender})</option>
                  <option value="ban_recipient">⛔ حظر المستلم (${recipient})</option>
                  <option value="delete_sender">🗑️ مسح الراسل نهائياً (${sender})</option>
                  <option value="delete_recipient">🗑️ مسح المستلم نهائياً (${recipient})</option>
                </select>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-rose-400 font-sans">فشل تحميل سجل الأمان: ${escapeHtml(e.message)}</td></tr>`;
      }
    }
  }
  window.loadAdminFraudAlerts = renderAdminFraudMonitor;

  let _adminChatUnsub = null;
  let _adminChatBound = false;
  async function renderAdminChatMonitor() {
    const container = document.getElementById('admin-chat-messages-container');
    const refreshBtn = document.getElementById('btn-admin-refresh-chat');
    const clearBtn = document.getElementById('btn-admin-clear-chat');
    const sendBtn = document.getElementById('btn-admin-send-chat');
    const inputEl = document.getElementById('admin-chat-broadcast-input');

    if (!container) return;

    const refreshChatUI = (messages) => {
      const msgs = Array.isArray(messages) ? messages : [];

      if (msgs.length === 0) {
        container.innerHTML =`
          <div class="text-center text-slate-500 text-xs py-16 flex flex-col items-center gap-2">
            <i class="fa-regular fa-comment-dots text-3xl text-slate-600"></i>
            <span>لا توجد رسائل حالياً في الشات العام.</span>
          </div>`;
        return;
      }

      let html ='';
      msgs.forEach(m => {
        const timeStr = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) :'';
        const isAdminMsg = m.sender && (m.sender.includes('الإدارة') || m.sender.includes('Admin') || m.senderTitle ==='مدير النظام');

        const hasGlow = Boolean(m.chatGlow);
        const glowTag = m.chatGlow === 'cyber_rainbow'
          ? '<span class="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/25 text-purple-300 font-bold border border-purple-500/40">👑 رويال متوهج</span>'
          : (m.chatGlow ? '<span class="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40">✨ VIP متوهج</span>' : '');
        const verifiedTag = (m.isVerified || m.facebookVerified) ? '<span class="text-sky-400 font-black text-xs" title="موثق">✔️</span>' : '';
        const badgeTag = m.customBadge ? `<span class="text-xs">${escapeHtml(m.customBadge)}</span>` : '';

        html +=`
          <div class="p-3 rounded-xl border ${isAdminMsg ?'bg-amber-950/25 border-amber-500/40 text-amber-200' : (hasGlow ? 'bg-amber-950/15 border-amber-500/30 text-amber-100 shadow-sm shadow-amber-500/10' : 'bg-slate-900/60 border-slate-800/80 text-slate-200')} flex items-start justify-between gap-3 text-xs transition hover:bg-slate-850">
            <div class="space-y-1 overflow-hidden">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-black ${isAdminMsg ?'text-amber-400 font-sans' :'text-cyan-400 font-sans'} flex items-center gap-1">${escapeHtml(m.sender)} ${verifiedTag} ${badgeTag}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-md ${isAdminMsg ?'bg-amber-500/20 text-amber-300 font-bold' :'bg-slate-800 text-slate-400'}">${escapeHtml(m.senderTitle ||'لاعب')}</span>
                ${glowTag}
                <span class="text-[10px] text-slate-500 numbers-font">${timeStr}</span>
              </div>
              <p class="text-xs break-words font-sans ${hasGlow ? 'text-amber-100 font-medium' : 'text-slate-200'} leading-relaxed">${escapeHtml(m.message)}</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button onclick="window.quickInspectPlayer('${escapeHtml(m.sender)}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] rounded-lg font-bold transition flex items-center gap-1 cursor-pointer" title="فحص وفتح ملف هذا اللاعب">
                <i class="fa-solid fa-user-gear"></i>
                <span>فحص</span>
              </button>
            </div>
          </div>`;
      });

      container.innerHTML = html;
      container.scrollTop = container.scrollHeight;
    };

    // Bind action buttons once
    if (!_adminChatBound) {
      _adminChatBound = true;

      if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
          refreshBtn.disabled = true;
          try {
            const msgs = await AppDB.getChatMessages();
            refreshChatUI(msgs);
            if (typeof showToast ==='function') showToast('الشات العام','تم تحديث سجل الرسائل بنجاح','info');
          } catch (e) {
            if (typeof showToast ==='function') showToast('خطأ','فشل جلب رسائل الشات.','error');
          } finally {
            refreshBtn.disabled = false;
          }
        });
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
          if (!confirm('️ تحذير إداري: هل أنت متأكد من مسح جميع رسائل الشات العام نهائياً؟')) return;
          try {
            clearBtn.disabled = true;
            await AppDB.clearChatMessages();
            refreshChatUI([]);
            if (typeof showToast ==='function') showToast('مسح الشات','تم مسح سجل الشات العام بالكامل بنجاح ️','success');
          } catch (e) {
            if (typeof showToast ==='function') showToast('خطأ','فشل مسح الشات.','error');
          } finally {
            clearBtn.disabled = false;
          }
        });
      }

      const handleSend = async () => {
        const text = inputEl ? inputEl.value.trim() :'';
        if (!text) return;

        try {
          if (sendBtn) sendBtn.disabled = true;
          await AppDB.sendChatMessage('الإدارة','مدير النظام', text);
          if (inputEl) inputEl.value ='';
          const msgs = await AppDB.getChatMessages();
          refreshChatUI(msgs);
          if (typeof showToast ==='function') showToast('تم الإرسال','تم بث رسالتك الإدارية في الشات العام بنجاح!','success');
        } catch (e) {
          if (typeof showToast ==='function') showToast('خطأ','فشل إرسال الرسالة.','error');
        } finally {
          if (sendBtn) sendBtn.disabled = false;
        }
      };

      if (sendBtn) sendBtn.addEventListener('click', handleSend);
      if (inputEl) {
        inputEl.addEventListener('keydown', (e) => {
          if (e.key ==='Enter') handleSend();
        });
      }
    }

    // Initial load
    try {
      const initialMsgs = await AppDB.getChatMessages();
      refreshChatUI(initialMsgs);
    } catch (e) {
      container.innerHTML =`<div class="text-center text-rose-400 text-xs py-8">فشل جلب رسائل الشات: ${e.message}</div>`;
    }

    // Subscribe to live chat updates
    if (_adminChatUnsub) _adminChatUnsub();
    _adminChatUnsub = AppDB.listenToChatMessages((liveMsgs) => {
      const subpanel = document.getElementById('admin-subpanel-chat');
      if (subpanel && !subpanel.classList.contains('hidden')) {
        refreshChatUI(liveMsgs);
      }
    });
  }

  window.quickInspectPlayer = (username) => {
    switchAdminTab('players');
    const searchInput = document.getElementById('admin-player-search-input');
    if (searchInput) {
      searchInput.value = username;
      if (typeof renderAdminPlayersTable ==='function') {
        renderAdminPlayersTable();
      }
    }
  };

  let activeInspectedCorp = null;

  const ADMIN_CORP_MEGA_PROJECTS = {
    gigafactory: { name: 'مجمع أشباه الموصلات والرقائق', icon: 'fa-microchip', color: 'text-yellow-400', cost: 12000000000, desc: 'تصنيع معالجات ورقائق إلكترونية سيادية (+25M/ثانية)' },
    zohr_field: { name: 'حق امتياز حقل غاز ظهر الطبيعي', icon: 'fa-fire-flame-simple', color: 'text-cyan-400', cost: 38000000000, desc: 'استخراج وتصدير الغاز الطبيعي السائل (+95M/ثانية)' },
    asteroid_mining: { name: 'وكالة تعدين الكويكبات الفضائية', icon: 'fa-meteor', color: 'text-purple-400', cost: 95000000000, desc: 'استخراج البلاتين والمعادن الثمينة من الفضاء (+280M/ثانية)' },
    submarine_cables: { name: 'شبكة الألياف البحرية العالمية', icon: 'fa-network-wired', color: 'text-sky-400', cost: 220000000000, desc: 'ربط قاري فائق السرعة وخفض عمولات التداول (+750M/ثانية)' },
    medical_city: { name: 'المدينة الطبية العالمية المتكاملة', icon: 'fa-hospital', color: 'text-emerald-400', cost: 500000000000, desc: 'أبحاث جينات وصيدلة وتأمين صحي شامل (+1.85B/ثانية)' },
    nuclear_reactor: { name: 'المفاعل النووي القومي لإنتاج الطاقة', icon: 'fa-atom', color: 'text-amber-400', cost: 1200000000000, desc: 'توليد طاقة نظيفة وخفض تكاليف التشغيل (+4.6B/ثانية)' },
    mars_colony: { name: 'مستعمرة التعدين المريخية المستقلة', icon: 'fa-shuttle-space', color: 'text-rose-400', cost: 3500000000000, desc: 'استخراج معادن فلكية نادرة ومضاعفة الأرباح (+15B/ثانية)' }
  };

  function renderAdminCorporationsPanel() {
    const tbody = document.getElementById('admin-corporations-list');
    const totalCountBadge = document.getElementById('admin-corp-total-count-badge');
    if (!tbody) return;

    tbody.innerHTML ='<tr><td colspan="6" class="py-4 text-center text-slate-500">جاري تحميل الشركات...</td></tr>';

    if (adminCorpsUnsubscribe) {
      adminCorpsUnsubscribe();
      adminCorpsUnsubscribe = null;
    }

    adminCorpsUnsubscribe = AppDB.listenToCorporations(corps => {
      tbody.innerHTML ='';
      if (totalCountBadge) totalCountBadge.textContent =`${(corps || []).length} شركة`;

      if (!corps || corps.length === 0) {
        tbody.innerHTML ='<tr><td colspan="6" class="py-4 text-center text-slate-500">لا توجد شركات مشتركة مسجلة حالياً.</td></tr>';
        return;
      }

      // If inspect modal is open, keep live inspected corp synced
      if (activeInspectedCorp) {
        const fresh = corps.find(c => c.id === activeInspectedCorp.id);
        if (fresh) {
          activeInspectedCorp = fresh;
          updateInspectModalContent(fresh);
        }
      }

      corps.forEach(corp => {
        const tr = document.createElement('tr');
        tr.className ='hover:bg-slate-850 transition border-b border-slate-800/40';

        const projKeys = Array.isArray(corp.projects) ? corp.projects : Object.keys(corp.projects || {}).filter(k => corp.projects[k] === true);
        const projCount = projKeys.length;

        tr.innerHTML =`
          <td class="p-2.5 font-bold text-white">
            <div class="flex items-center gap-2">
              <span>${corp.name}</span>
              <span class="px-1.5 py-0.2 bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[9px] font-bold rounded">Lvl ${corp.level || 1}</span>
            </div>
            <div class="text-[10px] text-slate-500 font-normal truncate max-w-xs">${corp.desc ||'لا يوجد وصف'}</div>
          </td>
          <td class="p-2.5 font-bold text-yellow-400 font-mono text-xs">${corp.founder}</td>
          <td class="p-2.5 text-center font-mono text-emerald-400 font-bold">${(corp.treasury || 0).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center font-mono text-slate-300 font-bold">${(corp.members || []).length} عضو</td>
          <td class="p-2.5 text-center">
            <span class="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-cyan-400 font-bold text-[10px]">${projCount} / 7 مشاريع</span>
          </td>
          <td class="p-2.5 text-left space-x-1 space-x-reverse">
            <button class="btn-admin-inspect-corp py-1 px-2.5 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 rounded font-bold transition text-[10px]"><i class="fa-solid fa-sliders ml-1"></i>فحص وتحكم</button>
            <button class="btn-admin-edit-corp-treasury py-1 px-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded font-bold transition text-[10px]">خزينة</button>
            <button class="btn-admin-delete-corp py-1 px-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded font-bold transition text-[10px]">تفكيك</button>
          </td>`;

        // Inspect Button
        tr.querySelector('.btn-admin-inspect-corp').addEventListener('click', () => {
          openAdminCorpInspectModal(corp);
        });

        // Edit Treasury Button
        tr.querySelector('.btn-admin-edit-corp-treasury').addEventListener('click', async () => {
          const currentTreasury = corp.treasury || 0;
          const val = prompt(`أدخل الرصيد الجديد لخزينة شركة "${corp.name}":`, currentTreasury);
          if (val === null || val.trim() ==='') return;
          try {
            await AppDB.adminEditCorporationTreasury(corp.id, val);
            showToast('تعديل الخزينة',`تم تعديل رصيد خزينة شركة ${corp.name} بنجاح.`,'success');
            logAdminAction(`تعديل خزينة الشركة المشتركة: ${corp.name}`);
          } catch (e) {
            showToast('خطأ تعديل الخزينة', e.message,'error');
          }
        });

        // Delete Button
        tr.querySelector('.btn-admin-delete-corp').addEventListener('click', async () => {
          if (!confirm(`هل أنت متأكد تماماً من تفكيك وحذف شركة "${corp.name}" نهائياً من قاعدة البيانات؟\nلا يمكن استرجاع هذا الإجراء.`)) return;
          try {
            await AppDB.adminDeleteCorporation(corp.id);
            showToast('تفكيك شركة',`تم تفكيك وحذف شركة ${corp.name} بنجاح.`,'success');
            logAdminAction(`تفكيك وحذف الشركة المشتركة: ${corp.name}`);
          } catch (e) {
            showToast('خطأ تفكيك شركة', e.message,'error');
          }
        });

        tbody.appendChild(tr);
      });
    });
  }

  function openAdminCorpInspectModal(corp) {
    activeInspectedCorp = corp;
    const modal = document.getElementById('admin-corp-inspect-modal');
    if (!modal) return;
    updateInspectModalContent(corp);
    modal.classList.remove('hidden');
  }

  function updateInspectModalContent(corp) {
    // Header & Meta
    const titleEl = document.getElementById('adm-corp-modal-title');
    const lvlEl = document.getElementById('adm-corp-modal-level-badge');
    const idEl = document.getElementById('adm-corp-modal-id-badge');
    if (titleEl) titleEl.textContent = corp.name;
    if (lvlEl) lvlEl.textContent =`Lvl ${corp.level || 1}`;
    if (idEl) idEl.textContent =`ID: ${corp.id}`;

    // Basic Inputs
    const nameInput = document.getElementById('adm-corp-edit-name');
    const lvlInput = document.getElementById('adm-corp-edit-level');
    const descInput = document.getElementById('adm-corp-edit-desc');
    if (nameInput) nameInput.value = corp.name ||'';
    if (lvlInput) lvlInput.value = corp.level || 1;
    if (descInput) descInput.value = corp.desc ||'';

    // Treasury Display & Input
    const treasuryValEl = document.getElementById('adm-corp-modal-treasury-val');
    const treasuryInput = document.getElementById('adm-corp-edit-treasury-input');
    if (treasuryValEl) treasuryValEl.textContent =`${(corp.treasury || 0).toLocaleString()} EGP`;
    if (treasuryInput) treasuryInput.value = corp.treasury || 0;

    // Render Projects Grid
    const projGrid = document.getElementById('adm-corp-projects-grid');
    if (projGrid) {
      projGrid.innerHTML ='';
      Object.keys(ADMIN_CORP_MEGA_PROJECTS).forEach(pKey => {
        const pDef = ADMIN_CORP_MEGA_PROJECTS[pKey];
        const isActive = Array.isArray(corp.projects) ? corp.projects.includes(pKey) : !!(corp.projects && corp.projects[pKey]);
        const card = document.createElement('div');
        card.className =`p-3 rounded-xl border transition flex flex-col justify-between ${isActive ?'bg-slate-900 border-violet-500/40 shadow-lg shadow-violet-950/20' :'bg-slate-950/80 border-slate-800/80 opacity-75'}`;
        card.innerHTML =`
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-2">
                <i class="fa-solid ${pDef.icon} ${pDef.color}"></i>
                <span class="font-bold text-white text-xs">${pDef.name}</span>
              </div>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${isActive ?'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :'bg-slate-800 text-slate-500'}">
                ${isActive ?'مفعل' :'معطل'}
              </span>
            </div>
            <p class="text-[10px] text-slate-400 mb-2">${pDef.desc}</p>
          </div>
          <button class="w-full py-1.5 rounded-lg font-bold text-[10px] transition flex items-center justify-center gap-1 ${isActive ?'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/30' :'bg-violet-600 hover:bg-violet-500 text-white shadow'}">
            <i class="fa-solid ${isActive ?'fa-toggle-off' :'fa-toggle-on'}"></i>
            <span>${isActive ?'إلغاء التفعيل' :'تفعيل المشروع مجاناً'}</span>
          </button>`;

        card.querySelector('button').addEventListener('click', async () => {
          try {
            await AppDB.adminToggleCorpProject(corp.id, pKey, !isActive);
            // Immediately sync local in-memory corp.projects array
            if (!Array.isArray(corp.projects)) {
              corp.projects = (corp.projects && typeof corp.projects === 'object')
                ? Object.keys(corp.projects).filter(k => corp.projects[k])
                : [];
            }
            if (!isActive) {
              if (!corp.projects.includes(pKey)) corp.projects.push(pKey);
            } else {
              corp.projects = corp.projects.filter(p => p !== pKey);
            }
            // Re-render inspect modal immediately without requiring reload
            updateInspectModalContent(corp);
            showToast('تحديث مشاريع الشركة',`تم ${isActive ?'إلغاء تفعيل' :'تفعيل'} مشروع (${pDef.name}) بنجاح.`,'success');
            logAdminAction(`تغيير حالة مشروع ${pDef.name} لشركة ${corp.name} إلى ${!isActive ?'مفعل' :'معطل'}`);
          } catch (e) {
            showToast('خطأ تفعيل المشروع', e.message,'error');
          }
        });

        projGrid.appendChild(card);
      });
    }

    // Render Members Table
    const membersTbody = document.getElementById('adm-corp-members-table-body');
    if (membersTbody) {
      membersTbody.innerHTML ='';
      const members = corp.members || [];
      const totalContrib = corp.totalContributions || 0;

      if (members.length === 0) {
        membersTbody.innerHTML ='<tr><td colspan="5" class="py-4 text-center text-slate-500">لا يوجد أعضاء في هذه الشركة.</td></tr>';
      } else {
        members.forEach(member => {
          const role = (corp.roles && corp.roles[member]) || (member === corp.founder ?'founder' :'member');
          const isFounder = role ==='founder' || member === corp.founder;
          const isCfo = role ==='cfo';
          const contrib = (corp.contributions && corp.contributions[member]) || 0;
          const sharePct = totalContrib > 0 ? ((contrib / totalContrib) * 100).toFixed(1) : (100 / members.length).toFixed(1);

          let roleBadge ='<span class="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[9px]">مساهم</span>';
          if (isFounder) roleBadge ='<span class="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold rounded text-[9px]"><i class="fa-solid fa-crown ml-1"></i>المؤسس</span>';
          else if (isCfo) roleBadge ='<span class="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold rounded text-[9px]"><i class="fa-solid fa-star ml-1"></i>CFO مدير مالي</span>';

          const tr = document.createElement('tr');
          tr.className ='hover:bg-slate-850 transition border-b border-slate-800/40';
          tr.innerHTML =`
            <td class="p-2 font-bold text-white font-mono">${member}</td>
            <td class="p-2 text-center">${roleBadge}</td>
            <td class="p-2 text-center font-mono text-emerald-400 font-bold">${contrib.toLocaleString()} EGP</td>
            <td class="p-2 text-center font-mono text-sky-400 font-bold">${sharePct}%</td>
            <td class="p-2 text-left space-x-1 space-x-reverse">
              ${!isFounder ?`
                <button class="btn-adm-member-role py-0.5 px-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/20 rounded text-[9px] font-bold" title="تغيير الرتبة">${isCfo ?'تنزيل لمساهم' :'ترقية CFO'}</button>
                <button class="btn-adm-make-founder py-0.5 px-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-[9px] font-bold" title="نقل الملكية">تعيين مؤسس </button>
                <button class="btn-adm-kick-member py-0.5 px-2 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/30 rounded text-[9px] font-bold" title="طرد العضو">طرد </button>` :'<span class="text-[10px] text-slate-500">مالك التحالف</span>'}
            </td>`;

          if (!isFounder) {
            // Role change button
            tr.querySelector('.btn-adm-member-role').addEventListener('click', async () => {
              const newRole = isCfo ?'member' :'cfo';
              try {
                await AppDB.adminSetCorpMemberRole(corp.id, member, newRole);
                showToast('تغيير الرتبة',`تم تغيير رتبة اللاعب ${member} إلى ${newRole ==='cfo' ?'مدير مالي CFO' :'مساهم عادي'}.`,'success');
                logAdminAction(`تغيير رتبة ${member} في شركة ${corp.name} إلى ${newRole}`);
              } catch (e) {
                showToast('خطأ تغيير الرتبة', e.message,'error');
              }
            });

            // Make founder button
            tr.querySelector('.btn-adm-make-founder').addEventListener('click', async () => {
              if (!confirm(`هل أنت متأكد من نقل ملكية وتأسيس شركة"${corp.name}" إلى اللاعب ${member}؟`)) return;
              try {
                await AppDB.adminTransferCorpFounder(corp.id, member);
                showToast('نقل الملكية',`تم تعيين اللاعب ${member} كمؤسس ومالك جديد لشركة ${corp.name}.`,'success');
                logAdminAction(`نقل ملكية وتأسيس شركة ${corp.name} إلى ${member}`);
              } catch (e) {
                showToast('خطأ نقل الملكية', e.message,'error');
              }
            });

            // Kick member button
            tr.querySelector('.btn-adm-kick-member').addEventListener('click', async () => {
              if (!confirm(`هل أنت متأكد من طرد اللاعب ${member} من شركة"${corp.name}"؟`)) return;
              try {
                await AppDB.adminKickCorpMember(corp.id, member);
                showToast('طرد عضو',`تم طرد اللاعب ${member} من شركة ${corp.name} بنجاح.`,'success');
                logAdminAction(`طرد اللاعب ${member} من شركة ${corp.name}`);
              } catch (e) {
                showToast('خطأ طرد العضو', e.message,'error');
              }
            });
          }

          membersTbody.appendChild(tr);
        });
      }
    }
  }

  function switchAdminTab(tabId) {
    cleanupAdminListeners();
    const subtabs = ['stats','players','transfers','fraud','chat','market','broadcast','auctions','giftcodes','onlinegift','system','corporations','topup'];
    subtabs.forEach(t => {
      const btn = document.getElementById(`tab-admin-${t}`);
      const mobPill = document.getElementById(`mobtab-admin-${t}`);
      const panel = document.getElementById(`admin-subpanel-${t}`);
      if (!panel) return;
      if (t === tabId) {
        if (btn) {
          btn.classList.add('border-yellow-500/40','bg-yellow-500/10','text-yellow-400','active-admin-tab','active-admin-sidebar-btn');
          btn.classList.remove('border-transparent','text-slate-400','hover:bg-slate-900/60');
        }
        if (mobPill) {
          mobPill.classList.add('active-admin-mob-pill');
          mobPill.classList.remove('text-slate-300','border-transparent','bg-slate-800/60');
          try {
            mobPill.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
          } catch (e) {}
        }
        panel.classList.remove('hidden');
      } else {
        if (btn) {
          btn.classList.remove('border-yellow-500/40','bg-yellow-500/10','text-yellow-400','active-admin-tab','active-admin-sidebar-btn');
          btn.classList.add('border-transparent','text-slate-400');
        }
        if (mobPill) {
          mobPill.classList.remove('active-admin-mob-pill');
          mobPill.classList.add('text-slate-300','border-transparent','bg-slate-800/60');
        }
        panel.classList.add('hidden');
      }
    });

    // Auto-collapse mobile sidebar on tab change
    if (typeof toggleAdminSidebarAction ==='function') {
      toggleAdminSidebarAction(false);
    }

    if (tabId ==='stats') {
      renderAdminAnalyticsDashboard();
    } else if (tabId ==='players') {
      if (window._adminReloadPlayers) window._adminReloadPlayers(false);
    } else if (tabId ==='transfers') {
      renderAdminTransfersMonitor();
    } else if (tabId ==='fraud') {
      renderAdminFraudMonitor();
    } else if (tabId ==='chat') {
      renderAdminChatMonitor();
    } else if (tabId ==='market') {
      if (window._adminRenderStockPrices) window._adminRenderStockPrices();
      const currentCfg = GameEngine.getTaxConfig ? GameEngine.getTaxConfig() : null;
      if (currentCfg && window._adminSyncTaxInputs) window._adminSyncTaxInputs(currentCfg);
    } else if (tabId ==='auctions') {
      fetchAndRenderAdminAuctions();
      fetchAndRenderAdminLiveAuctions();
    } else if (tabId ==='giftcodes') {
      fetchAndRenderAdminGiftCodes();
    } else if (tabId ==='onlinegift') {
      renderOnlineGiftPanel();
    } else if (tabId ==='corporations') {
      renderAdminCorporationsPanel();
    } else if (tabId ==='topup') {
      renderAdminTopupPanel();
    } else if (tabId ==='system') {
      const itSelect = document.getElementById('admin-item-config-select');
      if (itSelect) {
        const initItem = GameEngine.STORE_ITEMS[itSelect.value];
        if (initItem) {
          document.getElementById('admin-item-config-cost').value = initItem.cost;
          document.getElementById('admin-item-config-duration').value = initItem.durationTicks * 3;
        }
      }
    }
    window.switchAdminTab = switchAdminTab;
  }

  function updateStatsBarServerBoostIndicator() {
    const mult = window.serverBoostMultiplier || 1.0;
    const banner = document.getElementById('hud-server-boost-banner');
    const valText = document.getElementById('hud-server-boost-val');
    
    if (banner && valText) {
      if (mult > 1.0) {
        banner.classList.remove('hidden');
        valText.textContent =`${mult.toFixed(1)}x أرباح وخبرة مضاعفة!`;
      } else {
        banner.classList.add('hidden');
      }
    }
  }

  function toggleAdminSidebarAction(forceState) {
    const sidebar = document.getElementById('admin-sidebar');
    const backdrop = document.getElementById('admin-sidebar-backdrop');
    if (!sidebar) return;

    const isCurrentlyOpen = !sidebar.classList.contains('translate-x-full');
    const shouldOpen = (typeof forceState ==='boolean') ? forceState : !isCurrentlyOpen;

    if (shouldOpen) {
      sidebar.classList.remove('translate-x-full');
      sidebar.classList.add('translate-x-0');
      if (backdrop) backdrop.classList.remove('hidden');
    } else {
      sidebar.classList.add('translate-x-full');
      sidebar.classList.remove('translate-x-0');
      if (backdrop) backdrop.classList.add('hidden');
    }
  }
  window.UI = window.UI || {};
  window.UI.toggleAdminSidebarAction = toggleAdminSidebarAction;

  async function toggleServerBoostAction() {
    const currentBoost = window.serverBoostMultiplier || 1.0;
    const newBoost = currentBoost > 1.0 ? 1.0 : 2.0;
    const toggleBtn = document.getElementById('btn-adm-toggle-boost');
    
    try {
      if (toggleBtn) {
        toggleBtn.disabled = true;
        toggleBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i>';
      }
      
      await AppDB.adminSaveServerConfig({
        boostMultiplier: newBoost
      });

      showToast('مضاعف السيرفر', newBoost > 1.0 ? 'تم تفعيل وضع مضاعف الأرباح والخبرة 2x للجميع!' : 'تم إيقاف مضاعف السيرفر والعودة للوضع الاعتيادي.', 'success');
      logAdminAction(`تحديث مضاعف السيرفر: تم تعيين المضاعف على ${newBoost.toFixed(1)}x`);
      
      await AppDB.sendBroadcast(
        newBoost > 1.0 ? '⚡ تفعيل مضاعف السيرفر (Server Boost)!' : 'ℹ️ انتهاء مضاعف السيرفر (Server Boost)',
        newBoost > 1.0 ? 'قام الأدمن بتفعيل وضع مضاعف الأرباح والخبرة (Double XP & Cash) لجميع اللاعبين حياً!' : 'انتهى وضع مضاعف الأرباح والخبرة وعاد السيرفر للمعدل الطبيعي.'
      );
      
    } catch (err) {
      showToast('خطأ في تغيير المضاعف', err.message, 'error');
    } finally {
      if (toggleBtn) {
        toggleBtn.disabled = false;
        toggleBtn.innerHTML = '<i class="fa-solid fa-bolt text-sm"></i>';
      }
    }
  }

  // ─────────────────────────────────────────────
  //  ONLINE GIFT PANEL — Send gifts to online players
  // ─────────────────────────────────────────────
  const ONLINE_GIFT_THRESHOLD = 2.5 * 60 * 1000; // 2.5 minutes

  function getOnlinePlayers() {
    const now = Date.now();
    return (cachedPlayers || []).filter(p => {
      const lastActive = Number(p.lastActiveTimestamp || p.lastSeen || p.last_seen || 0);
      return lastActive > 0 && (now - lastActive) < ONLINE_GIFT_THRESHOLD;
    });
  }

  function renderOnlineGiftPanel() {
    const tbody = document.getElementById('admin-online-gift-players-list');
    const previewCount = document.getElementById('admin-online-gift-preview-count');
    const previewTotal = document.getElementById('admin-online-gift-preview-total');
    const countBadge = document.getElementById('admin-online-gift-count');
    const amountInput = document.getElementById('admin-online-gift-amount');
    const typeSelect = document.getElementById('admin-online-gift-type');
    const amountLabel = document.getElementById('admin-online-gift-amount-label');
    const typeLabels = { cash: 'نقود يد', bank: 'إيداع بنكي', xp: 'نقاط خبرة', supplies: 'ساعات إمداد' };

    function refreshList() {
      const online = getOnlinePlayers();
      const count = online.length;
      const amount = Number(amountInput ? amountInput.value : 0) || 0;
      const type = typeSelect ? typeSelect.value : 'cash';

      if (countBadge) countBadge.textContent = count;
      if (previewCount) previewCount.textContent = count;

      const totalVal = count * amount;
      if (previewTotal) {
        if (type === 'supplies') previewTotal.textContent = `${totalVal.toLocaleString()} ساعة × ${count} لاعب`;
        else if (type === 'xp') previewTotal.textContent = `${totalVal.toLocaleString()} XP`;
        else previewTotal.textContent = `${totalVal.toLocaleString()} ر.س`;
      }
      if (amountLabel) {
        const lblMap = { cash: 'المبلغ (ر.س)', bank: 'المبلغ (ر.س)', xp: 'نقاط الخبرة (XP)', supplies: 'ساعات الإمداد' };
        amountLabel.textContent = lblMap[type] || 'المبلغ / الكمية';
      }

      if (!tbody) return;
      if (count === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-slate-500 text-[11px]">لا يوجد لاعبون متصلون حالياً (نشطون خلال آخر 2.5 دقيقة)</td></tr>';
        return;
      }
      tbody.innerHTML = '';
      const now = Date.now();
      online.forEach((p, i) => {
        const lastActive = Number(p.lastActiveTimestamp || p.lastSeen || 0);
        const secAgo = Math.max(0, Math.floor((now - lastActive) / 1000));
        const agoLabel = secAgo < 60 ? `منذ ${secAgo}ث` : `منذ ${Math.floor(secAgo / 60)}د`;
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-800/60 hover:bg-slate-900/30 text-xs';
        tr.innerHTML = `
          <td class="py-2 px-1 text-slate-500 font-mono">${i + 1}</td>
          <td class="py-2 px-1">
            <span class="font-black text-white">${p.username || '—'}</span>
            ${p.isAdmin ? '<span class="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-bold mr-1">أدمن</span>' : ''}
          </td>
          <td class="py-2 px-1 text-slate-400">${p.title || '—'}</td>
          <td class="py-2 px-1 text-emerald-400 font-mono font-bold">${(p.netWorth || 0).toLocaleString()}</td>
          <td class="py-2 px-1 text-sky-400 font-mono text-[10px]">${agoLabel}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    if (typeSelect) typeSelect.onchange = refreshList;
    if (amountInput) amountInput.oninput = refreshList;

    const refreshBtn = document.getElementById('btn-admin-refresh-online-gift');
    if (refreshBtn) {
      refreshBtn.onclick = async () => {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحديث...';
        try {
          cachedPlayers = await AppDB.adminGetAllPlayers(true);
          refreshList();
          showToast('تحديث', `القائمة محدثة — ${getOnlinePlayers().length} متصل الآن`, 'success');
        } catch (e) {
          showToast('خطأ', e.message, 'error');
        } finally {
          refreshBtn.disabled = false;
          refreshBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> تحديث القائمة';
        }
      };
    }

    const sendBtn = document.getElementById('btn-admin-send-online-gift');
    const sendBtnText = document.getElementById('btn-admin-send-online-gift-text');
    if (sendBtn) {
      sendBtn.onclick = async () => {
        const online = getOnlinePlayers();
        if (online.length === 0) {
          showToast('لا يوجد متصلون', 'لا يوجد لاعبون متصلون حالياً لإرسال الهدية إليهم.', 'info');
          return;
        }
        const amount = Number(amountInput ? amountInput.value : 0);
        if (!amount || amount <= 0) {
          showToast('خطأ', 'يرجى إدخال مبلغ / كمية صحيحة أكبر من صفر.', 'error');
          return;
        }
        const type = typeSelect ? typeSelect.value : 'cash';
        const note = (document.getElementById('admin-online-gift-note') || {}).value || 'هدية من الإدارة';
        const logEl = document.getElementById('admin-online-gift-log');

        if (!confirm(`هل أنت متأكد من إرسال ${amount.toLocaleString()} ${typeLabels[type]} لـ ${online.length} لاعب متصل؟`)) return;

        sendBtn.disabled = true;
        if (sendBtnText) sendBtnText.textContent = `جاري الإرسال لـ ${online.length} لاعب...`;

        // Show progress in the players table while sending
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-amber-400 text-xs">
            <i class="fa-solid fa-spinner fa-spin mr-2"></i>جاري إرسال الهدية لـ ${online.length} لاعب...
          </td></tr>`;
        }

        let successCount = 0;
        let failCount = 0;
        // Track per-player results
        const results = []; // { username, title, netWorth, status: 'ok'|'fail', error? }

        for (const player of online) {
          try {
            const freshState = await AppDB.adminGetPlayer(player.username);
            if (!freshState) {
              failCount++;
              results.push({ username: player.username, title: player.title || '—', netWorth: player.netWorth || 0, status: 'fail', error: 'بيانات اللاعب غير موجودة' });
              continue;
            }

            if (type === 'cash') {
              freshState.cash = (Number(freshState.cash) || 0) + amount;
              freshState.netWorth = (Number(freshState.netWorth) || 0) + amount;
            } else if (type === 'bank') {
              freshState.bank = (Number(freshState.bank) || 0) + amount;
              freshState.netWorth = (Number(freshState.netWorth) || 0) + amount;
            } else if (type === 'xp') {
              freshState.xp = (Number(freshState.xp) || 0) + amount;
            } else if (type === 'supplies') {
              const supplyTicks = amount * 3600;
              const MAX_TICKS = 43200;
              if (freshState.businesses) {
                Object.keys(freshState.businesses).forEach(bizId => {
                  if (freshState.businesses[bizId] && freshState.businesses[bizId].level > 0) {
                    freshState.businesses[bizId].suppliesTicks = Math.min(
                      MAX_TICKS,
                      (Number(freshState.businesses[bizId].suppliesTicks) || 0) + supplyTicks
                    );
                  }
                });
              }
            }
            freshState.adminModifiedTimestamp = Date.now();
            freshState._lastAdminGift = { type, amount, note, sentAt: Date.now() };
            await AppDB.savePlayerState(player.username, freshState, true);
            successCount++;
            results.push({ username: player.username, title: player.title || freshState.title || '—', netWorth: player.netWorth || 0, status: 'ok' });
          } catch (e) {
            failCount++;
            results.push({ username: player.username, title: player.title || '—', netWorth: player.netWorth || 0, status: 'fail', error: e.message });
          }
        }

        // ── Render results table ──
        if (tbody) {
          tbody.innerHTML = '';

          // Header result row
          const headerRow = document.createElement('tr');
          headerRow.className = 'bg-slate-800/60';
          headerRow.innerHTML = `
            <th colspan="6" class="py-2 px-3 text-right text-[11px] font-black text-white">
              <i class="fa-solid fa-check-double text-emerald-400 mr-1"></i>
              نتائج الإرسال — ${successCount} نجاح
              ${failCount > 0 ? `<span class="text-rose-400 mr-2">/ ${failCount} فشل</span>` : ''}
              <span class="text-slate-400 font-normal mr-2 text-[10px]">"${note}"</span>
              <span class="text-amber-400 mr-2 text-[10px]">${amount.toLocaleString()} ${typeLabels[type]} لكل لاعب</span>
            </th>
          `;
          tbody.appendChild(headerRow);

          // Sub-header
          const subHeader = document.createElement('tr');
          subHeader.className = 'text-[10px] text-slate-500 border-b border-slate-800';
          subHeader.innerHTML = `
            <th class="pb-1.5 px-2 font-bold text-right">#</th>
            <th class="pb-1.5 px-2 font-bold text-right">اللاعب</th>
            <th class="pb-1.5 px-2 font-bold text-right">الرتبة</th>
            <th class="pb-1.5 px-2 font-bold text-right">صافي الثروة</th>
            <th class="pb-1.5 px-2 font-bold text-right">الهدية</th>
            <th class="pb-1.5 px-2 font-bold text-right">الحالة</th>
          `;
          tbody.appendChild(subHeader);

          results.forEach((r, i) => {
            const tr = document.createElement('tr');
            tr.className = `border-b border-slate-800/40 text-xs ${r.status === 'ok' ? 'hover:bg-emerald-950/10' : 'hover:bg-rose-950/10'}`;
            tr.innerHTML = `
              <td class="py-2 px-2 text-slate-500 font-mono">${i + 1}</td>
              <td class="py-2 px-2">
                <span class="font-black ${r.status === 'ok' ? 'text-white' : 'text-slate-500'}">${r.username}</span>
              </td>
              <td class="py-2 px-2 text-slate-400 text-[10px]">${r.title}</td>
              <td class="py-2 px-2 text-emerald-400 font-mono font-bold">${(r.netWorth || 0).toLocaleString()}</td>
              <td class="py-2 px-2 text-amber-300 font-mono font-black text-[11px]">
                ${r.status === 'ok' ? `+${amount.toLocaleString()} ${typeLabels[type]}` : '—'}
              </td>
              <td class="py-2 px-2">
                ${r.status === 'ok'
                  ? '<span class="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1 w-fit"><i class="fa-solid fa-check text-[8px]"></i>تم</span>'
                  : `<span class="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1 w-fit" title="${r.error || ''}"><i class="fa-solid fa-xmark text-[8px]"></i>فشل</span>`
                }
              </td>
            `;
            tbody.appendChild(tr);
          });
        }

        // ── Update activity log ──
        const timestamp = new Date().toLocaleTimeString('ar-EG');
        const logEntry = document.createElement('div');
        logEntry.className = 'border border-slate-800 rounded-lg p-2 space-y-1';
        logEntry.innerHTML = `
          <div class="flex items-center gap-2 text-[11px]">
            <span class="text-slate-500">[${timestamp}]</span>
            <span class="${successCount > 0 ? 'text-emerald-400' : 'text-rose-400'} font-black">
              ${typeLabels[type]} ×${amount.toLocaleString()} → ${successCount}/${results.length} لاعب
            </span>
            <span class="text-slate-500">— "${note}"</span>
          </div>
          <div class="flex flex-wrap gap-1 mt-1">
            ${results.map(r => `
              <span class="text-[9px] px-1.5 py-0.5 rounded font-bold ${r.status === 'ok' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}">
                ${r.username}
              </span>
            `).join('')}
          </div>
        `;
        if (logEl) {
          const placeholder = logEl.querySelector('p');
          if (placeholder && placeholder.textContent.includes('لم يتم الإرسال')) placeholder.remove();
          logEl.prepend(logEntry);
        }

        logAdminAction(`هدية للمتصلين: ${typeLabels[type]} ×${amount.toLocaleString()} لـ ${successCount}/${online.length} لاعب — "${note}"`);
        if (successCount > 0) showToast('تم الإرسال!', `تم إرسال ${typeLabels[type]} (${amount.toLocaleString()}) لـ ${successCount} لاعب متصل!`, 'success');
        if (failCount > 0) { console.warn('[AdminGift] Failures:', results.filter(r=>r.status==='fail')); showToast('تنبيه', `فشل الإرسال لـ ${failCount} لاعب — راجع الجدول.`, 'warning'); }

        sendBtn.disabled = false;
        if (sendBtnText) sendBtnText.textContent = 'إرسال هدية جديدة للمتصلين';
      };
    }

    refreshList();
  }



  function logAdminAction(msg) {
    const targets = [
      document.getElementById('admin-action-logs'),
      document.getElementById('admin-stats-live-log')
    ];

    const time = new Date().toLocaleTimeString('ar-EG');
    targets.forEach(logBox => {
      if (!logBox) return;
      if (logBox.innerHTML.includes("لا يوجد عمليات مسجلة") || logBox.innerHTML.includes("Dyn live logs")) {
        logBox.innerHTML ='';
      }
      const entry = document.createElement('div');
      entry.className ='border-b border-slate-900/60 pb-1 mb-1 flex items-center gap-1';
      const timeSpan = document.createElement('span');
      timeSpan.className = 'text-yellow-500 font-bold ml-1 font-mono';
      timeSpan.textContent = `[${time}]`;
      const msgSpan = document.createElement('span');
      msgSpan.textContent = String(msg || '');
      entry.appendChild(timeSpan);
      entry.appendChild(msgSpan);
      logBox.insertBefore(entry, logBox.firstChild);
    });
  }

  // ─────────────────────────────────────────────
  //  TRANSFER REQUESTS — UI Rendering & State
  // ─────────────────────────────────────────────
  let lastRequestsFetchTime = 0;
  let cachedIncomingRequests = [];
  let cachedSentRequests = [];
  let requestsTabActive ='incoming';

  async function fetchAndRenderTransferRequests(force = false) {
    const s = GameEngine.state;
    if (!GameEngine.activeUsername || !s) return;
    const username = GameEngine.activeUsername;

    const now = Date.now();
    if (force || now - lastRequestsFetchTime > 10000) {
      lastRequestsFetchTime = now;
      try {
        const [incoming, sent] = await Promise.all([
          AppDB.getIncomingTransferRequests(username),
          AppDB.getSentTransferRequests(username)
        ]);
        cachedIncomingRequests = incoming;
        cachedSentRequests = sent;
      } catch (err) {
        console.error('Error fetching transfer requests:', err);
      }
    }

    renderRequestsListDOM();
  }

  function renderRequestsListDOM() {
    const username = GameEngine.activeUsername;
    const incomingList = document.getElementById('incoming-requests-list');
    const sentList = document.getElementById('sent-requests-list');
    const countIncomingEl = document.getElementById('count-incoming-reqs');
    const countSentEl = document.getElementById('count-sent-reqs');

    if (!incomingList || !sentList) return;

    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    const pendingIncomingCount = cachedIncomingRequests.filter(r => r.status ==='pending' && (now - r.timestamp <= twentyFourHours)).length;
    const pendingSentCount = cachedSentRequests.filter(r => r.status ==='pending' && (now - r.timestamp <= twentyFourHours)).length;

    if (countIncomingEl) countIncomingEl.textContent = pendingIncomingCount;
    if (countSentEl) countSentEl.textContent = pendingSentCount;

    // Render Incoming Requests
    if (cachedIncomingRequests.length === 0) {
      incomingList.innerHTML =`<div class="text-center text-slate-500 text-xs py-8">لا يوجد طلبات واردة حالياً.</div>`;
    } else {
      incomingList.innerHTML ='';
      cachedIncomingRequests.forEach(r => {
        const age = now - r.timestamp;
        const isExpired = r.status ==='pending' && age > twentyFourHours;
        const remainingMs = twentyFourHours - age;

        let statusText ='';
        let statusClass ='';
        let actionButtons ='';

        if (r.status ==='accepted') {
          statusText ='تم القبول والتحويل ️';
          statusClass ='text-emerald-400 font-bold';
        } else if (r.status ==='rejected') {
          statusText ='تم الرفض';
          statusClass ='text-rose-400 font-bold';
        } else if (isExpired) {
          statusText ='منتهي الصلاحية (24س) ️';
          statusClass ='text-slate-500 font-bold';
        } else {
          const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
          const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          statusText =`معلق - متبقي ${remainingHours}س و ${remainingMins}د`;
          statusClass ='text-yellow-400 font-bold';

          actionButtons =`
            <div class="flex gap-1.5 mt-2">
              <button data-id="${r.id}" class="btn-req-accept flex-grow py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded text-[10px] transition">قبول ودفع</button>
              <button data-id="${r.id}" class="btn-req-reject flex-grow py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded text-[10px] transition">رفض</button>
            </div>`;
        }

        const div = document.createElement('div');
        div.className ='glass-panel p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between text-xs mb-2';
        div.innerHTML =`
          <div class="flex justify-between items-center mb-1">
            <span class="font-bold text-white">المرسل: ${r.sender}</span>
            <span class="numbers-font text-yellow-500 font-bold text-sm">${r.amount.toLocaleString()} EGP</span>
          </div>
          <div class="flex justify-between items-center text-[10px] text-slate-400">
            <span>الحالة: <span class="${statusClass}">${statusText}</span></span>
            <span class="numbers-font">${new Date(r.timestamp).toLocaleTimeString('ar-EG')}</span>
          </div>
          ${actionButtons}`;

        const acceptBtn = div.querySelector('.btn-req-accept');
        const rejectBtn = div.querySelector('.btn-req-reject');
        if (acceptBtn) {
          acceptBtn.addEventListener('click', async () => {
            try {
              acceptBtn.disabled = true;
              if (rejectBtn) rejectBtn.disabled = true;
              acceptBtn.textContent ='جاري المعالجة...';

              await AppDB.acceptTransferRequest(r.id, username);
              showToast('موافقة الطلب',`تم قبول طلب التحويل ودفع ${r.amount.toLocaleString()} EGP بنجاح!`,'success');

              const updatedState = await AppDB.getPlayerState(username);
              if (updatedState) {
                GameEngine.state.cash = updatedState.cash;
                GameEngine.state.bank = updatedState.bank;
                GameEngine.state.netWorth = updatedState.netWorth;
              }
              await fetchAndRenderTransferRequests(true);
              renderAll();
            } catch (err) {
              showToast('خطأ في قبول الطلب', err.message,'error');
              acceptBtn.disabled = false;
              if (rejectBtn) rejectBtn.disabled = false;
              acceptBtn.textContent ='قبول ودفع';
            }
          });
        }
        if (rejectBtn) {
          rejectBtn.addEventListener('click', async () => {
            try {
              if (acceptBtn) acceptBtn.disabled = true;
              rejectBtn.disabled = true;
              rejectBtn.textContent ='جاري الرفض...';

              await AppDB.rejectTransferRequest(r.id, username);
              showToast('رفض الطلب','تم رفض طلب التحويل بنجاح.','info');

              await fetchAndRenderTransferRequests(true);
            } catch (err) {
              showToast('خطأ في رفض الطلب', err.message,'error');
              if (acceptBtn) acceptBtn.disabled = false;
              rejectBtn.disabled = false;
              rejectBtn.textContent ='رفض';
            }
          });
        }

        incomingList.appendChild(div);
      });
    }

    // Render Sent Requests
    if (cachedSentRequests.length === 0) {
      sentList.innerHTML =`<div class="text-center text-slate-500 text-xs py-8">لا يوجد طلبات مرسلة حالياً.</div>`;
    } else {
      sentList.innerHTML ='';
      cachedSentRequests.forEach(r => {
        const age = now - r.timestamp;
        const isExpired = r.status ==='pending' && age > twentyFourHours;
        const remainingMs = twentyFourHours - age;

        let statusText ='';
        let statusClass ='';

        if (r.status ==='accepted') {
          statusText ='تم القبول والتحويل ️';
          statusClass ='text-emerald-400 font-bold';
        } else if (r.status ==='rejected') {
          statusText ='تم الرفض';
          statusClass ='text-rose-400 font-bold';
        } else if (isExpired) {
          statusText ='منتهي الصلاحية ️';
          statusClass ='text-slate-500 font-bold';
        } else {
          const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
          const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          statusText =`معلق - متبقي ${remainingHours}س و ${remainingMins}د`;
          statusClass ='text-yellow-400 font-bold';
        }

        const div = document.createElement('div');
        div.className ='glass-panel p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between text-xs mb-2';
        div.innerHTML =`
          <div class="flex justify-between items-center mb-1">
            <span class="font-bold text-white">المستلم: ${r.recipient}</span>
            <span class="numbers-font text-yellow-500 font-bold text-sm">${r.amount.toLocaleString()} EGP</span>
          </div>
          <div class="flex justify-between items-center text-[10px] text-slate-400">
            <span>الحالة: <span class="${statusClass}">${statusText}</span></span>
            <span class="numbers-font">${new Date(r.timestamp).toLocaleTimeString('ar-EG')}</span>
          </div>`;
        sentList.appendChild(div);
      });
    }
  }

  // ─────────────────────────────────────────────
  //  AUCTIONS & SPECIAL DEALS — UI Rendering & State
  // ─────────────────────────────────────────────
  async function fetchAndRenderAuctions() {
    const shelf = document.getElementById('auctions-shelf');
    if (!shelf) return;

    shelf.innerHTML =`<div class="col-span-full text-center text-slate-500 text-xs py-12 flex flex-col items-center justify-center gap-2">
      <i class="fa-solid fa-spinner animate-spin text-amber-500 text-lg"></i>
      <span>جاري تحميل الصفقات المعروضة من السيرفر...</span>
    </div>`;

    try {
      const items = await AppDB.getAuctionItems();
      renderAuctionsShelfDOM(items);
    } catch (e) {
      shelf.innerHTML =`<div class="col-span-full text-center text-rose-400 text-xs py-12">فشل تحميل صفقات المزادات: ${e.message}</div>`;
    }

    renderPlayerCollectiblesDOM();
  }

  function renderAuctionsShelfDOM(items) {
    const shelf = document.getElementById('auctions-shelf');
    if (!shelf) return;

    if (!items || items.length === 0) {
      shelf.innerHTML =`<div class="col-span-full text-center text-slate-500 text-xs py-12">لا توجد مزادات أو صفقات نشطة حالياً.</div>`;
      return;
    }

    shelf.innerHTML ='';
    items.forEach(item => {
      const totalQty = Number(item.quantity || 0);
      const sold = Number(item.soldCount || 0);
      const remaining = Math.max(0, totalQty - sold);

      const isSoldOut = remaining <= 0;
      let btnHtml ='';

      if (isSoldOut) {
        btnHtml =`<button disabled class="w-full py-2 bg-slate-800 text-slate-500 font-bold rounded-lg text-xs cursor-not-allowed">نفذت الكمية </button>`;
      } else {
        btnHtml =`<button data-id="${item.id}" class="btn-buy-auction-item w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black rounded-lg text-xs transition duration-200 shadow-md">شراء الآن </button>`;
      }

      const card = document.createElement('div');
      card.className ='glass-panel p-4.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3 relative overflow-hidden';
      if (isSoldOut) card.classList.add('opacity-60');

      card.innerHTML =`
        <div>
          <div class="flex justify-between items-start gap-2 mb-1.5">
            <h4 class="text-xs font-black text-white">${item.name}</h4>
            <span class="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded font-bold whitespace-nowrap">صفقة نادرة</span>
          </div>
          <p class="text-[10px] text-slate-400 leading-relaxed">${item.description ||'لا يوجد وصف متوفر.'}</p>
        </div>

        <div class="space-y-2 border-t border-slate-800/40 pt-2.5">
          <div class="flex justify-between items-center text-[10px]">
            <span class="text-slate-500">سعر الشراء الفوري</span>
            <span class="numbers-font text-yellow-500 font-black text-sm">${item.price.toLocaleString()} EGP</span>
          </div>
          <div class="flex justify-between items-center text-[10px]">
            <span class="text-slate-500">الكمية المتبقية</span>
            <span class="font-bold text-slate-300">${isSoldOut ?'انتهى المعروض' :`${remaining} / ${totalQty} قطعة`}</span>
          </div>
        </div>

        ${btnHtml}`;

      const buyBtn = card.querySelector('.btn-buy-auction-item');
      if (buyBtn) {
        buyBtn.addEventListener('click', async () => {
          try {
            buyBtn.disabled = true;
            buyBtn.textContent ='جاري الشراء...';

            const result = await AppDB.purchaseAuctionItem(item.id, GameEngine.activeUsername);

            showToast('تم الشراء بنجاح',`تهانينا! قمت بشراء"${result.name}" بسعر ${result.price.toLocaleString()} ج.م. تم إضافته لمقتنياتك النادرة.`,'success');
            playMenuSound('success');

            GameEngine.state.cash = result.newCash;
            GameEngine.state.netWorth = result.newNetWorth;
            if (!GameEngine.state.customItems) GameEngine.state.customItems = [];
            GameEngine.state.customItems.push({
              auctionId: item.id,
              name: item.name,
              description: item.description,
              price: item.price,
              timestamp: Date.now()
            });

            fetchAndRenderAuctions();
            renderAll();
          } catch (err) {
            showToast('فشل الشراء', err.message,'error');
            buyBtn.disabled = false;
            buyBtn.textContent ='شراء الآن';
          }
        });
      }

      shelf.appendChild(card);
    });
  }

  function renderPlayerCollectiblesDOM() {
    const container = document.getElementById('player-collectibles');
    if (!container) return;

    const items = (GameEngine.state && GameEngine.state.customItems) || [];
    if (items.length === 0) {
      container.innerHTML =`<div class="col-span-full text-center text-slate-500 text-xs py-8">لم تقم بشراء أي مقتنيات نادرة من المزادات حتى الآن.</div>`;
      return;
    }

    container.innerHTML ='';
    items.forEach(item => {
      const card = document.createElement('div');
      card.className ='glass-panel p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.02] flex flex-col justify-between space-y-2';

      const timeStr = new Date(item.timestamp).toLocaleDateString('ar-EG', {
        month:'short',
        day:'numeric',
        hour:'2-digit',
        minute:'2-digit'
      });

      card.innerHTML =`
        <div>
          <div class="flex justify-between items-center mb-1">
            <span class="font-black text-amber-400 text-xs flex items-center gap-1.5">
              <i class="fa-solid fa-gem text-[10px]"></i>
              <span>${item.name}</span>
            </span>
            <span class="numbers-font text-[10px] text-slate-500 font-bold">${item.price.toLocaleString()} ج.م</span>
          </div>
          <p class="text-[10px] text-slate-400">${item.description ||'لا يوجد وصف متوفر.'}</p>
        </div>
        <div class="text-[9px] text-slate-500 text-left border-t border-slate-800/40 pt-1.5 mt-1 font-mono">
          تملكها منذ: ${timeStr}
        </div>`;
      container.appendChild(card);
    });
  }

  function renderAuctionsTab() {
    const aucCashEl = document.getElementById('auction-player-cash');
    if (aucCashEl && GameEngine.state) {
      aucCashEl.textContent =`${GameEngine.state.cash.toLocaleString()} EGP`;
    }
    renderPlayerCollectiblesDOM();
  }

  async function fetchAndRenderAdminAuctions() {
    const tbody = document.getElementById('admin-auctions-list');
    if (!tbody) return;

    try {
      const items = await AppDB.getAuctionItems();
      if (items.length === 0) {
        tbody.innerHTML =`<tr><td colspan="5" class="py-6 text-center text-slate-500">لا توجد أغراض معروضة في المزادات حالياً.</td></tr>`;
        return;
      }

      tbody.innerHTML ='';
      items.forEach(item => {
        const tr = document.createElement('tr');
        tr.className ='border-b border-slate-800/60 hover:bg-slate-900/30 text-xs';

        const total = Number(item.quantity || 0);
        const sold = Number(item.soldCount || 0);
        const remaining = Math.max(0, total - sold);

        tr.innerHTML =`
          <td class="py-2.5 font-bold text-white">${item.name}</td>
          <td class="py-2.5 text-slate-400 max-w-[200px] truncate">${item.description ||'-'}</td>
          <td class="py-2.5 text-center font-bold text-yellow-500 font-mono">${item.price.toLocaleString()} ج.م</td>
          <td class="py-2.5 text-center font-bold font-mono text-slate-300">${sold} مبيعة / ${remaining} متبقي (${total} إجمالي)</td>
          <td class="py-2.5 text-left">
            <button data-id="${item.id}" class="btn-admin-delete-auction py-1 px-3 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded font-bold transition text-[10px]">حذف المعروض</button>
          </td>`;

        const deleteBtn = tr.querySelector('.btn-admin-delete-auction');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            if (!confirm(`هل أنت متأكد من حذف الغرض"${item.name}" من المزادات؟`)) return;
            try {
              deleteBtn.disabled = true;
              deleteBtn.textContent ='جاري الحذف...';
              await AppDB.adminDeleteAuctionItem(item.id);
              showToast('تم الحذف','تم حذف غرض المزاد بنجاح.','info');
              logAdminAction(`حذف غرض المزاد: ${item.name}`);
              fetchAndRenderAdminAuctions();
            } catch (err) {
              showToast('فشل الحذف', err.message,'error');
              deleteBtn.disabled = false;
              deleteBtn.textContent ='حذف المعروض';
            }
          });
        }

        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML =`<tr><td colspan="5" class="py-4 text-center text-rose-400">فشل تحميل قائمة المزادات الإدارية: ${e.message}</td></tr>`;
    }
  }

  function fetchAndRenderAdminLiveAuctions() {
    const tbody = document.getElementById('admin-live-auctions-list');
    if (!tbody) return;

    if (adminLiveAuctionsUnsubscribe) {
      adminLiveAuctionsUnsubscribe();
      adminLiveAuctionsUnsubscribe = null;
    }

    tbody.innerHTML ='<tr><td colspan="7" class="py-4 text-center text-slate-500">جاري تحميل المزادات الحية...</td></tr>';

    adminLiveAuctionsUnsubscribe = AppDB.listenToLiveAuctions(list => {
      if (!list || list.length === 0) {
        tbody.innerHTML =`<tr><td colspan="7" class="py-6 text-center text-slate-500">لا توجد مزادات حية متزامنة حالياً في السيرفر.</td></tr>`;
        return;
      }

      tbody.innerHTML ='';
      list.forEach(auc => {
        const tr = document.createElement('tr');
        tr.className ='border-b border-slate-800/60 hover:bg-slate-900/30 text-xs';

        const regPlayers = auc.registeredPlayers || [];
        const regCount = regPlayers.length;
        const targetVal = auc.startConditionValue;
        const condTypeStr = auc.startConditionType ==='players' ?`${regCount} / ${targetVal} لاعبين` :`مؤقت زمني (${targetVal} د)`;

        let statusBadge ='<span class="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded font-bold text-[10px]">بانتظار المسجلين ⏳</span>';
        if (auc.status ==='active') {
          statusBadge ='<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold text-[10px] animate-pulse">نشط جاري المزايدة </span>';
        } else if (auc.status ==='ended') {
          statusBadge ='<span class="px-2 py-0.5 bg-slate-800 text-slate-400 rounded font-bold text-[10px]">منتهي </span>';
        }

        const typeLabels = { item:'غرض فريد', business:'شركة تجارية', property:'عقار استثماري' };

        tr.innerHTML =`
          <td class="py-2.5 font-bold text-white">
            <div>${auc.itemName}</div>
            <div class="text-[10px] text-slate-500 font-mono">${auc.id ||'-'}</div>
          </td>
          <td class="py-2.5 text-slate-300">${typeLabels[auc.itemType] || auc.itemType}</td>
          <td class="py-2.5 text-center font-bold text-yellow-500 font-mono">${(auc.currentBid || auc.basePrice || 0).toLocaleString()} ج.م</td>
          <td class="py-2.5 text-center font-bold text-sky-400 font-mono">${condTypeStr}</td>
          <td class="py-2.5 text-center">${statusBadge}</td>
          <td class="py-2.5 text-center font-bold text-emerald-400">${auc.highestBidder ||'لا يوجد'}</td>
          <td class="py-2.5 text-left space-x-1 space-x-reverse">
            ${auc.status ==='pending' ?`<button data-id="${auc.id}" class="btn-admin-start-live-auc py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition text-[10px]">بدء فوري </button>` :''}
            <button data-id="${auc.id}" data-name="${auc.itemName}" class="btn-admin-delete-live-auc py-1 px-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded font-bold transition text-[10px]">حذف المزاد</button>
          </td>`;

        const startBtn = tr.querySelector('.btn-admin-start-live-auc');
        if (startBtn) {
          startBtn.addEventListener('click', async () => {
            try {
              startBtn.disabled = true;
              await AppDB.adminStartLiveAuction(auc.id);
              showToast('بدء المزاد',`تم بدء المزاد الحي (${auc.itemName}) بنجاح!`,'success');
              logAdminAction(`بدء المزاد الحي يدوياً: ${auc.itemName}`);
            } catch (err) {
              showToast('خطأ بدء المزاد', err.message,'error');
              startBtn.disabled = false;
            }
          });
        }

        const deleteBtn = tr.querySelector('.btn-admin-delete-live-auc');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            if (!confirm(`هل أنت متأكد من حذف المزاد الحي"${auc.itemName}" نهائياً من السيرفر؟`)) return;
            try {
              deleteBtn.disabled = true;
              await AppDB.adminDeleteLiveAuction(auc.id);
              showToast('تم الحذف','تم حذف المزاد الحي بنجاح.','info');
              logAdminAction(`حذف المزاد الحي: ${auc.itemName}`);
            } catch (err) {
              showToast('خطأ حذف المزاد', err.message,'error');
              deleteBtn.disabled = false;
            }
          });
        }

        tbody.appendChild(tr);
      });
    });
  }

  async function fetchAndRenderAdminGiftCodes() {
    const tbody = document.getElementById('admin-giftcodes-list');
    if (!tbody) return;

    try {
      const codes = await AppDB.adminGetGiftCodes();
      if (codes.length === 0) {
        tbody.innerHTML =`<tr><td colspan="5" class="py-6 text-center text-slate-500">لا توجد أكواد هدايا نشطة حالياً.</td></tr>`;
        return;
      }

      tbody.innerHTML ='';
      codes.forEach(code => {
        const tr = document.createElement('tr');
        tr.className ='border-b border-slate-800/60 hover:bg-slate-900/30 text-xs';

        let rewardDesc ='';
        if (code.rewardType ==='cash') {
          rewardDesc =`${Number(code.rewardDetails.amount || 0).toLocaleString()} ج.م`;
        } else if (code.rewardType ==='business') {
          const businessNames = {
            coffee:'عربة قهوة مختصة',
            supermarket:'سوبر ماركت',
            tech:'شركة برمجيات وتطبيقات',
            logistics:'شركة شحن ولوجستيات',
            solar_factory:'محطة طاقة شمسية',
            private_hospital:'مستشفى خاص',
            media_studio:'ستوديو إنتاج إعلامي',
            private_bank:'بنك استثماري خاص',
            oil_refinery:'مصفاة بترول وتكرير',
            space_tech:'شركة استكشاف الفضاء'
          };
          const bName = businessNames[code.rewardDetails.businessId] || code.rewardDetails.businessId;
          rewardDesc =`${bName} (مستوى ${code.rewardDetails.level} | عمال ${code.rewardDetails.workers})`;
        } else if (code.rewardType ==='item') {
          const itemNames = {
            gold_pen:'القلم الذهبي للمدراء',
            premium_lawyer:'توكيل محامٍ دولي',
            energy_drink:'مشروب الطاقة والتركيز',
            tax_shield:'درع الإعفاء الضريبي',
            market_scanner:'ماسح البورصة والتداول',
            vip_casino_pass:'بطاقة VIP للكازينو',
            quantum_cpu:'معالج الحوسبة الكمومية',
            diamond_card:'عضوية النادي الماسي',
            cronos_gear:'ساعة الكرونوس'
          };
          const itName = itemNames[code.rewardDetails.itemId] || code.rewardDetails.itemId;
          rewardDesc = itName;
        }

        const maxStr = code.maxUses > 0 ?`${code.maxUses}` :'️';
        const usageText =`${code.usedCount || 0} / ${maxStr}`;

        tr.innerHTML =`
          <td class="py-2.5 font-black text-emerald-400 font-mono">${code.id}</td>
          <td class="py-2.5 text-slate-300 font-bold">${code.rewardType ==='cash' ?'مالي' : code.rewardType ==='business' ?'أملاك/شركة' :'أداة'}</td>
          <td class="py-2.5 text-center text-slate-400 font-bold">${rewardDesc}</td>
          <td class="py-2.5 text-center font-bold font-mono text-slate-300">${usageText}</td>
          <td class="py-2.5 text-left">
            <button data-id="${code.id}" class="btn-admin-delete-giftcode py-1 px-3 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded font-bold transition text-[10px]">حذف الكود</button>
          </td>`;

        const deleteBtn = tr.querySelector('.btn-admin-delete-giftcode');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            if (!confirm(`هل أنت متأكد من حذف كود الهدية"${code.id}"؟`)) return;
            try {
              deleteBtn.disabled = true;
              deleteBtn.textContent ='جاري الحذف...';
              await AppDB.adminDeleteGiftCode(code.id);
              showToast('تم الحذف','تم حذف كود الهدية بنجاح.','info');
              logAdminAction(`حذف كود الهدية: ${code.id}`);
              fetchAndRenderAdminGiftCodes();
            } catch (err) {
              showToast('فشل الحذف', err.message,'error');
              deleteBtn.disabled = false;
              deleteBtn.textContent ='حذف الكود';
            }
          });
        }

        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML =`<tr><td colspan="5" class="py-4 text-center text-rose-400">فشل تحميل الأكواد: ${e.message}</td></tr>`;
    }
  }

  // ─────────────────────────────────────────────
  //  V2 variables & handlers
  // ─────────────────────────────────────────────
  let lastChatSent = 0;
  let currentActiveDMUser ='';
  let mailboxActiveTab ='inbox';
  let selectedRestoreFileContent = null;
  window.employeesCache = {};

  function setupV2UIHandlers() {
    const chatTrigger = document.getElementById('btn-floating-chat-trigger');
    const closeChatDrawer = document.getElementById('btn-close-chat-drawer');
    const chatDrawer = document.getElementById('chat-drawer');
    const chatInput = document.getElementById('chat-message-input');
    const chatSendBtn = document.getElementById('btn-send-chat-message');
    const charCounter = document.getElementById('chat-char-counter');

    if (chatTrigger && chatDrawer) {
      chatTrigger.addEventListener('click', () => {
        chatDrawer.classList.toggle('chat-drawer-open');
        const unreadDot = document.getElementById('chat-unread-dot');
        if (unreadDot) {
          unreadDot.classList.add('hidden');
          unreadDot.textContent ='0';
        }
      });
    }
    if (closeChatDrawer && chatDrawer) {
      closeChatDrawer.addEventListener('click', () => {
        chatDrawer.classList.remove('chat-drawer-open');
      });
    }

    if (chatInput && charCounter) {
      chatInput.addEventListener('input', () => {
        charCounter.textContent =`${chatInput.value.length} / 200`;
      });
    }

    if (chatSendBtn && chatInput) {
      chatSendBtn.addEventListener('click', async () => {
        const text = chatInput.value.trim();
        if (!text) return;

        if (Date.now() - lastChatSent < 3000) {
          const warnEl = document.getElementById('chat-cooldown-timer');
          if (warnEl) {
            warnEl.classList.remove('hidden');
            setTimeout(() => warnEl.classList.add('hidden'), 2000);
          }
          return;
        }

        try {
          chatSendBtn.disabled = true;
          const isFb = Boolean(GameEngine.state && (GameEngine.state.facebookVerified || (GameEngine.state.badges && GameEngine.state.badges.includes('facebook'))));
          let chatGlow = (GameEngine.state && (GameEngine.state.chatGlow || (GameEngine.state.hasChatGlow ? 'gold_neon' : ''))) || '';
          if (!chatGlow && GameEngine.state) {
            if (GameEngine.state.activePackage === 'pkg_vip_chat_glow') chatGlow = 'gold_neon';
            else if (GameEngine.state.activePackage === 'pkg_vip_royal_ultimate') chatGlow = 'cyber_rainbow';
          }
          const isVerified = Boolean(GameEngine.state && (GameEngine.state.isVerified || GameEngine.state.vipVerified));
          const customBadge = (GameEngine.state && GameEngine.state.customBadge) || '';

          await AppDB.sendChatMessage(GameEngine.state.username, GameEngine.state.title, text, isFb, { chatGlow, isVerified, customBadge });
          chatInput.value ='';
          charCounter.textContent ='0 / 200';
          lastChatSent = Date.now();
        } catch (err) {
          showToast('خطأ إرسال', err.message,'error');
        } finally {
          chatSendBtn.disabled = false;
        }
      });

      chatInput.addEventListener('keydown', (e) => {
        if (e.key ==='Enter') chatSendBtn.click();
      });
    }

    const adminSendMsgBtn = document.getElementById('btn-admin-send-monitoring-msg');
    if (adminSendMsgBtn) {
      adminSendMsgBtn.addEventListener('click', async () => {
        try {
          adminSendMsgBtn.disabled = true;
          const msg ="️ تنبيه من الإدارة: الإدارة تراقب الشات حالياً. يرجى الالتزام بالقوانين.";
          await AppDB.sendChatMessage("الإدارة","رسمي", msg);
          showToast('تم الإرسال','تم إرسال تنبيه مراقبة الشات بنجاح.','success');
        } catch (err) {
          showToast('خطأ إرسال', err.message,'error');
        } finally {
          adminSendMsgBtn.disabled = false;
        }
      });
    }

    const btnMailbox = document.getElementById('btn-open-mailbox');
    const btnMailboxMobile = document.getElementById('btn-open-mailbox-mobile');
    const btnCloseMailbox = document.getElementById('btn-close-mailbox-modal');
    const mailboxModal = document.getElementById('mailbox-modal');

    if (btnMailbox && mailboxModal) {
      btnMailbox.addEventListener('click', () => {
        mailboxModal.classList.remove('hidden');
        switchMailboxTab('inbox');
      });
    }
    if (btnMailboxMobile && mailboxModal) {
      btnMailboxMobile.addEventListener('click', () => {
        mailboxModal.classList.remove('hidden');
        switchMailboxTab('inbox');
      });
    }
    if (btnCloseMailbox && mailboxModal) {
      btnCloseMailbox.addEventListener('click', () => {
        mailboxModal.classList.add('hidden');
      });
    }

    const btnMailTabInbox = document.getElementById('btn-mail-tab-inbox');
    const btnMailTabDMs = document.getElementById('btn-mail-tab-dms');
    if (btnMailTabInbox) {
      btnMailTabInbox.addEventListener('click', () => switchMailboxTab('inbox'));
    }
    if (btnMailTabDMs) {
      btnMailTabDMs.addEventListener('click', () => switchMailboxTab('dms'));
    }

    const btnSendDM = document.getElementById('btn-send-dm-message');
    const dmInput = document.getElementById('dm-message-input');
    if (btnSendDM && dmInput) {
      btnSendDM.addEventListener('click', async () => {
        const text = dmInput.value.trim();
        if (!text || !currentActiveDMUser) return;
        try {
          await AppDB.sendMail(GameEngine.state.username, currentActiveDMUser,'dm', { message: text });
          dmInput.value ='';
        } catch (err) {
          showToast('خطأ إرسال خاصة', err.message,'error');
        }
      });
      dmInput.addEventListener('keydown', (e) => {
        if (e.key ==='Enter') btnSendDM.click();
      });
    }

    const btnCloseProfile = document.getElementById('btn-close-profile-modal');
    if (btnCloseProfile) {
      btnCloseProfile.addEventListener('click', () => {
        document.getElementById('player-profile-modal').classList.add('hidden');
      });
    }

    const btnAddFriend = document.getElementById('btn-profile-add-friend');
    const btnProfileDM = document.getElementById('btn-profile-dm');
    const btnProfileJob = document.getElementById('btn-profile-job-offer');
    const btnProfilePartnership = document.getElementById('btn-profile-partnership');
    const btnProfileBlock = document.getElementById('btn-profile-block-player');

    if (btnAddFriend) {
      btnAddFriend.addEventListener('click', async () => {
        const target = btnAddFriend.dataset.username;
        if (!target) return;
        try {
          await AppDB.sendMail(GameEngine.state.username, target,'friend_request', {});
          showToast('طلب صداقة',`تم إرسال طلب صداقة إلى ${target} بنجاح!`,'success');
        } catch (err) {
          showToast('خطأ طلب صداقة', err.message,'error');
        }
      });
    }

    if (btnProfileDM) {
      btnProfileDM.addEventListener('click', () => {
        const target = btnProfileDM.dataset.username;
        if (!target) return;
        document.getElementById('player-profile-modal').classList.add('hidden');
        mailboxModal.classList.remove('hidden');
        switchMailboxTab('dms');
        openPrivateChat(target);
      });
    }

    if (btnProfileJob) {
      btnProfileJob.addEventListener('click', () => {
        const target = btnProfileJob.dataset.username;
        if (!target) return;
        openJobOfferForm(target);
      });
    }

    if (btnProfilePartnership) {
      btnProfilePartnership.addEventListener('click', () => {
        const target = btnProfilePartnership.dataset.username;
        if (!target) return;
        openPartnershipForm(target);
      });
    }

    if (btnProfileBlock) {
      btnProfileBlock.addEventListener('click', () => {
        const target = btnProfileBlock.dataset.username;
        if (!target) return;
        GameEngine.state.blockedUsers = GameEngine.state.blockedUsers || [];
        if (GameEngine.state.blockedUsers.includes(target)) {
          GameEngine.state.blockedUsers = GameEngine.state.blockedUsers.filter(u => u !== target);
          btnProfileBlock.innerHTML ='<i class="fa-solid fa-ban"></i> <span>حظر اللاعب</span>';
          showToast('إلغاء حظر',`تم إلغاء حظر اللاعب ${target}.`,'info');
        } else {
          GameEngine.state.blockedUsers.push(target);
          btnProfileBlock.innerHTML ='<i class="fa-solid fa-ban"></i> <span class="text-rose-500">إلغاء الحظر</span>';
          showToast('حظر اللاعب',`تم حظر اللاعب ${target}. لن تظهر رسائله في الشات العام.`,'warning');
        }
        AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
        renderAll();
      });
    }

    const closeJobBtn = document.getElementById('btn-close-job-offer-modal');
    if (closeJobBtn) closeJobBtn.addEventListener('click', () => document.getElementById('job-offer-form-modal').classList.add('hidden'));

    const closePartBtn = document.getElementById('btn-close-partnership-modal');
    if (closePartBtn) closePartBtn.addEventListener('click', () => document.getElementById('partnership-form-modal').classList.add('hidden'));

    const submitJobBtn = document.getElementById('btn-submit-job-offer');
    if (submitJobBtn) {
      submitJobBtn.addEventListener('click', async () => {
        const target = document.getElementById('job-offer-target-username').value;
        const bizSelect = document.getElementById('job-offer-business-select');
        const roleSelect = document.getElementById('job-offer-role-select');
        const salaryInput = document.getElementById('job-offer-salary-input');

        const businessId = bizSelect.value;
        const role = roleSelect.value;
        const salary = parseInt(salaryInput.value ||'0');

        if (!businessId || !role || salary <= 0) {
          showToast('خطأ إدخال','يرجى ملء جميع حقول عقد التوظيف براتب صحيح أكبر من الصفر.','error');
          return;
        }

        try {
          const bizName = GameEngine.state.businesses[businessId].name || businessId;
          await AppDB.sendMail(GameEngine.state.username, target,'job_offer', {
            businessId,
            businessName: bizName,
            role,
            salary
          });
          document.getElementById('job-offer-form-modal').classList.add('hidden');
          showToast('عقد توظيف',`تم إرسال عرض العمل إلى ${target} بنجاح!`,'success');
        } catch (err) {
          showToast('خطأ عقد التوظيف', err.message,'error');
        }
      });
    }

    const submitPartnershipBtn = document.getElementById('btn-submit-partnership');
    if (submitPartnershipBtn) {
      submitPartnershipBtn.addEventListener('click', async () => {
        const target = document.getElementById('partnership-target-username').value;
        const bizSelect = document.getElementById('partnership-business-select');
        const shareInput = document.getElementById('partnership-share-input');

        const businessId = bizSelect.value;
        const sharePct = parseInt(shareInput.value ||'0');

        if (!businessId || sharePct <= 0 || sharePct >= 100) {
          showToast('خطأ إدخال','يرجى إدخال نسبة مئوية صحيحة بين 1% و 99%.','error');
          return;
        }

        try {
          const bizName = GameEngine.state.businesses[businessId].name || businessId;
          await AppDB.sendMail(GameEngine.state.username, target,'partnership_invite', {
            businessId,
            businessName: bizName,
            sharePct: sharePct / 100
          });
          document.getElementById('partnership-form-modal').classList.add('hidden');
          showToast('دعوة شراكة',`تم إرسال دعوة الشراكة الاستثمارية إلى ${target} بنجاح!`,'success');
        } catch (err) {
          showToast('خطأ الشراكة', err.message,'error');
        }
      });
    }

    const submitRiddleBtn = document.getElementById('btn-submit-riddle');
    if (submitRiddleBtn) {
      submitRiddleBtn.addEventListener('click', () => {
        const answerInput = document.getElementById('riddle-answer-input');
        const typedVal = parseInt(answerInput.value ||'');
        if (typedVal === window.activeRiddleAnswer) {
          GameEngine.state.lastPuzzleSolved = Date.now();
          AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
          document.getElementById('riddle-verification-modal').classList.add('hidden');
          showToast('تم التحقق بنجاح!','لقد أثبت وجودك البشري، تم صرف راتبك وتنشيط بونوص الشركة +30% لـ 24 ساعة القادمة.','success');
          renderAll();
        } else {
          showToast('إجابة خاطئة','المعادلة الرياضية خاطئة، يرجى المحاولة والتركيز ثانية.','error');
        }
      });
    }

    const adminDownloadSelectedBtn = document.getElementById('btn-admin-download-selected-backup');
    const adminRestoreSelectedBtn = document.getElementById('btn-admin-restore-selected-backup');
    const adminBackupsSelect = document.getElementById('admin-player-backups-select');

    if (adminDownloadSelectedBtn) {
      adminDownloadSelectedBtn.addEventListener('click', async () => {
        const targetUser = document.getElementById('admin-p-username').textContent;
        const selectedDate = adminBackupsSelect.value;
        if (!selectedDate) {
          showToast('خطأ اختيار','يرجى اختيار نسخة احتياطية أولاً.','error');
          return;
        }
        const bState = await AppDB.getPlayerBackupState(targetUser, selectedDate);
        if (bState) {
          const blob = new Blob([JSON.stringify(bState, null, 2)], { type:'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download =`backup_${targetUser}_${selectedDate}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('تم التنزيل','تم تحميل ملف النسخة الاحتياطية بنجاح.','success');
        }
      });
    }

    if (adminRestoreSelectedBtn) {
      adminRestoreSelectedBtn.addEventListener('click', async () => {
        const targetUser = document.getElementById('admin-p-username').textContent;
        const selectedDate = adminBackupsSelect.value;
        if (!selectedDate) {
          showToast('خطأ اختيار','يرجى اختيار تاريخ للنسخة الاحتياطية.','error');
          return;
        }
        if (confirm(`هل أنت متأكد من رغبتك في استعادة حساب اللاعب ${targetUser} إلى نسخة تاريخ ${selectedDate}؟ سيتم محو البيانات الحالية.`)) {
          const bState = await AppDB.getPlayerBackupState(targetUser, selectedDate);
          if (bState) {
            await AppDB.adminRestorePlayerFromState(targetUser, bState);
            showToast('تم الاسترجاع',`تمت استعادة حساب اللاعب ${targetUser} بنجاح من قاعدة البيانات.`,'success');
            const updatedState = await AppDB.getPlayerState(targetUser);
            if (updatedState) loadAdminPlayerWorkspace(updatedState);
          }
        }
      });
    }

    const fileInput = document.getElementById('admin-restore-file-input');
    const triggerFileBtn = document.getElementById('btn-trigger-file-restore');
    const uploadRestoreBtn = document.getElementById('btn-admin-upload-restore');

    if (triggerFileBtn && fileInput) {
      triggerFileBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const parsed = JSON.parse(event.target.result);
              const targetUser = document.getElementById('admin-p-username').textContent;
              if (parsed.username !== targetUser) {
                showToast('تنبيه عدم مطابقة',`اسم اللاعب في ملف الاحتياطي (${parsed.username}) لا يطابق اللاعب الذي تقوم بفحصه حالياً (${targetUser})!`,'warning');
              }
              selectedRestoreFileContent = parsed;
              document.getElementById('restore-file-name-label').textContent = file.name;
              uploadRestoreBtn.disabled = false;
            } catch (err) {
              showToast('خطأ قراءة ملف','الملف الاحتياطي غير صالح أو معطوب.','error');
              selectedRestoreFileContent = null;
              uploadRestoreBtn.disabled = true;
            }
          };
          reader.readAsText(file);
        }
      });
    }

    if (uploadRestoreBtn) {
      uploadRestoreBtn.addEventListener('click', async () => {
        const targetUser = document.getElementById('admin-p-username').textContent;
        if (!selectedRestoreFileContent) return;
        if (confirm(`هل أنت متأكد من استيراد ورفع ملف JSON الخارجي لاستعادة حساب اللاعب ${targetUser}؟ سيتم استبدال كامل الحساب الحالي.`)) {
          try {
            await AppDB.adminRestorePlayerFromState(targetUser, selectedRestoreFileContent);
            showToast('استيراد ناجح!',`تم رفع الملف الخارجي واستعادة الحساب بالكامل لـ ${targetUser}.`,'success');
            selectedRestoreFileContent = null;
            document.getElementById('restore-file-name-label').textContent ='اختر ملف JSON الاحتياطي...';
            uploadRestoreBtn.disabled = true;
            fileInput.value ='';

            const updatedState = await AppDB.getPlayerState(targetUser);
            if (updatedState) loadAdminPlayerWorkspace(updatedState);
          } catch (err) {
            showToast('فشل الاستعادة', err.message,'error');
          }
        }
      });
    }

    const adminCreateLiveAuctionBtn = document.getElementById('btn-admin-create-live-auction');
    if (adminCreateLiveAuctionBtn) {
      adminCreateLiveAuctionBtn.addEventListener('click', async () => {
        const nameInput = document.getElementById('admin-live-auction-name');
        const typeSelect = document.getElementById('admin-live-auction-type');
        const priceInput = document.getElementById('admin-live-auction-baseprice');
        const condTypeSelect = document.getElementById('admin-live-auction-cond-type');
        const condValInput = document.getElementById('admin-live-auction-cond-value');

        const name = nameInput.value.trim();
        const type = typeSelect.value;
        const basePrice = parseInt(priceInput.value ||'0');
        const condType = condTypeSelect.value;
        const condVal = parseInt(condValInput.value ||'0');

        if (!name || basePrice <= 0 || condVal <= 0) {
          showToast('خطأ إدخال','يرجى ملء جميع تفاصيل المزاد الحي الجديد بقيم صحيحة.','error');
          return;
        }

        try {
          adminCreateLiveAuctionBtn.disabled = true;
          let startVal = condVal;
          if (condType ==='time') {
            startVal = Date.now() + (condVal * 60 * 1000);
          }

          await AppDB.adminCreateLiveAuction(type,'live_' + Math.random().toString(36).substr(2, 9), name, basePrice, condType, startVal);
          showToast('تم إطلاق المزاد الحي',`تم إدراج المزاد الحي (${name}) في السيرفر بنجاح وهو بانتظار المسجلين.`,'success');

          nameInput.value ='';
          priceInput.value ='';
          condValInput.value ='';
        } catch (err) {
          showToast('فشل المزاد', err.message,'error');
        } finally {
          adminCreateLiveAuctionBtn.disabled = false;
        }
      });
    }

    // ==================== ADVANCED CORPORATIONS EVENT HANDLERS ====================
    // 1. Create Official Corporation
    const btnCreateCorp = document.getElementById('btn-admin-create-corp');
    if (btnCreateCorp) {
      btnCreateCorp.addEventListener('click', async () => {
        const nameInput = document.getElementById('admin-create-corp-name');
        const founderInput = document.getElementById('admin-create-corp-founder');
        const treasuryInput = document.getElementById('admin-create-corp-treasury');
        const descInput = document.getElementById('admin-create-corp-desc');

        const name = (nameInput?.value ||'').trim();
        const founder = (founderInput?.value ||'').trim();
        const treasury = parseFloat(treasuryInput?.value ||'0');
        const desc = (descInput?.value ||'').trim();

        if (!name || !founder) {
          showToast('بيانات غير مكتملة','يرجى إدخال اسم الشركة واسم المؤسس.','error');
          return;
        }

        try {
          btnCreateCorp.disabled = true;
          await AppDB.adminCreateCorporation(name, founder, desc, treasury);
          showToast('تأسيس ناجح',`تم إنشاء وإدراج شركة"${name}" وتعيين ${founder} كمؤسس.`,'success');
          logAdminAction(`تأسيس شركة جديدة من لوحة الأدمن: ${name} (المؤسس: ${founder})`);

          if (nameInput) nameInput.value ='';
          if (founderInput) founderInput.value ='';
          if (treasuryInput) treasuryInput.value ='0';
          if (descInput) descInput.value ='';
        } catch (e) {
          showToast('فشل إنشاء الشركة', e.message,'error');
        } finally {
          btnCreateCorp.disabled = false;
        }
      });
    }

    // 2. Save Basic Corp Info
    const btnSaveBasic = document.getElementById('btn-adm-corp-save-basic');
    if (btnSaveBasic) {
      btnSaveBasic.addEventListener('click', async () => {
        if (!activeInspectedCorp) return;
        const name = (document.getElementById('adm-corp-edit-name')?.value ||'').trim();
        const level = parseInt(document.getElementById('adm-corp-edit-level')?.value ||'1');
        const desc = (document.getElementById('adm-corp-edit-desc')?.value ||'').trim();

        if (!name) {
          showToast('خطأ إدخال','اسم الشركة لا يمكن أن يكون فارغاً.','error');
          return;
        }

        try {
          btnSaveBasic.disabled = true;
          await AppDB.adminUpdateCorp(activeInspectedCorp.id, {
            name,
            level: Math.max(1, Math.min(10, level || 1)),
            desc
          });
          showToast('تم الحفظ',`تم تحديث بيانات ومستوى شركة"${name}" بنجاح.`,'success');
          logAdminAction(`تحديث بيانات شركة ${activeInspectedCorp.id}: اسم=${name}, مستوى=${level}`);
        } catch (e) {
          showToast('فشل حفظ البيانات', e.message,'error');
        } finally {
          btnSaveBasic.disabled = false;
        }
      });
    }

    // 3. Save Treasury
    const btnSaveTreasury = document.getElementById('btn-adm-corp-save-treasury');
    if (btnSaveTreasury) {
      btnSaveTreasury.addEventListener('click', async () => {
        if (!activeInspectedCorp) return;
        const amount = document.getElementById('adm-corp-edit-treasury-input')?.value;
        try {
          btnSaveTreasury.disabled = true;
          await AppDB.adminEditCorporationTreasury(activeInspectedCorp.id, amount);
          showToast('تم تحديث الخزينة',`تم ضبط رصيد خزينة شركة ${activeInspectedCorp.name} إلى ${parseFloat(amount || 0).toLocaleString()} EGP.`,'success');
          logAdminAction(`تعديل خزينة شركة ${activeInspectedCorp.name} إلى ${amount}`);
        } catch (e) {
          showToast('فشل تعديل الخزينة', e.message,'error');
        } finally {
          btnSaveTreasury.disabled = false;
        }
      });
    }

    // 4. Distribute Dividends
    const btnDistributeDividends = document.getElementById('btn-adm-corp-distribute-dividends');
    if (btnDistributeDividends) {
      btnDistributeDividends.addEventListener('click', async () => {
        if (!activeInspectedCorp) return;
        const pctInput = document.getElementById('adm-corp-dividends-pct');
        const pct = parseFloat(pctInput?.value ||'25');

        if (!confirm(`هل أنت متأكد من صرف وتوزيع ${pct}% من خزينة شركة"${activeInspectedCorp.name}" مباشرة على كاش جميع المساهمين؟`)) return;

        try {
          btnDistributeDividends.disabled = true;
          await AppDB.adminDistributeCorpDividends(activeInspectedCorp.id, pct);
          showToast('توزيع الأرباح',`تم بنجاح توزيع ${pct}% من خزينة الشركة على جميع المساهمين بالتناسب وإيداعها في كاش حساباتهم.`,'success');
          logAdminAction(`صرف وتوزيع أرباح بنسبة ${pct}% من خزينة شركة ${activeInspectedCorp.name}`);
        } catch (e) {
          showToast('فشل توزيع الأرباح', e.message,'error');
        } finally {
          btnDistributeDividends.disabled = false;
        }
      });
    }

    // 5. Close Inspect Modal
    const btnCloseInspect = document.getElementById('btn-close-corp-inspect');
    if (btnCloseInspect) {
      btnCloseInspect.addEventListener('click', () => {
        activeInspectedCorp = null;
        document.getElementById('admin-corp-inspect-modal')?.classList.add('hidden');
      });
    }
  }

  // ─────────────────────────────────────────────
  //  TOP-UP & MONETIZATION ADMIN CONTROLLER (إدارة الشحن والباقات)
  // ─────────────────────────────────────────────
  let _currentTopupFilter ='all';
  _currentTopupPackagesCache = _currentTopupPackagesCache || [];
  let _currentTopupRequestsCache = [];
  let _topupAdminListenersBound = false;

  async function renderAdminTopupPanel() {
    bindTopupAdminGlobalEvents();
    await Promise.all([
      loadAndRenderTopupPaymentSettings(),
      loadAndRenderTopupPackages(),
      loadAndRenderTopupRequests()
    ]);
  }

  function bindTopupAdminGlobalEvents() {
    if (_topupAdminListenersBound) return;
    _topupAdminListenersBound = true;

    // Save Payment Settings Button
    const btnSaveSettings = document.getElementById('btn-save-topup-settings');
    if (btnSaveSettings) {
      btnSaveSettings.addEventListener('click', async () => {
        const vodafoneCash = (document.getElementById('adm-topup-vodafone')?.value ||'').trim();
        const instapay = (document.getElementById('adm-topup-instapay')?.value ||'').trim();
        const notes = (document.getElementById('adm-topup-notes')?.value ||'').trim();

        try {
          btnSaveSettings.disabled = true;
          btnSaveSettings.innerHTML ='<i class="fa-solid fa-spinner animate-spin"></i> <span>جاري الحفظ...</span>';
          await AppDB.savePaymentSettings({ vodafoneCash, instapay, notes });
          showToast('تم الحفظ بنجاح','تم تحديث أرقام وبيانات الدفع (فودافون كاش & انستاباي) لجميع اللاعبين.','success');
          logAdminAction(`تحديث بيانات الدفع: فودافون=${vodafoneCash}, انستاباي=${instapay}`);
        } catch (err) {
          showToast('خطأ في الحفظ', err.message ||'تعذر حفظ بيانات الدفع','error');
        } finally {
          btnSaveSettings.disabled = false;
          btnSaveSettings.innerHTML ='<i class="fa-solid fa-floppy-disk"></i> <span>حفظ وتطبيق الإعدادات</span>';
        }
      });
    }

    // Refresh Requests Button
    const btnRefreshReqs = document.getElementById('btn-adm-refresh-topup-reqs');
    if (btnRefreshReqs) {
      btnRefreshReqs.addEventListener('click', async () => {
        btnRefreshReqs.disabled = true;
        btnRefreshReqs.innerHTML ='<i class="fa-solid fa-spinner animate-spin text-xs"></i> <span>جاري التحديث...</span>';
        await loadAndRenderTopupRequests();
        btnRefreshReqs.disabled = false;
        btnRefreshReqs.innerHTML ='<i class="fa-solid fa-rotate-right text-xs"></i> <span>تحديث الطلبات</span>';
        showToast('تم التحديث','تم جلب وتحديث أحدث طلبات الشحن بنجاح.','info');
      });
    }

    // Create Package Button
    const btnCreatePkg = document.getElementById('btn-adm-create-pkg');
    if (btnCreatePkg) {
      btnCreatePkg.addEventListener('click', () => {
        openAdminPackageEditModal(null);
      });
    }

    // Close / Cancel Package Modal
    const btnClosePkg = document.getElementById('btn-close-edit-pkg-modal');
    const btnCancelPkg = document.getElementById('btn-cancel-edit-pkg');
    const pkgModal = document.getElementById('modal-admin-edit-package');
    const closePkgModal = () => { if (pkgModal) pkgModal.classList.add('hidden'); };
    if (btnClosePkg) btnClosePkg.addEventListener('click', closePkgModal);
    if (btnCancelPkg) btnCancelPkg.addEventListener('click', closePkgModal);

    // Filter Buttons
    document.querySelectorAll('.topup-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.topup-filter-btn').forEach(b => {
          b.className ='topup-filter-btn px-3 py-1 rounded-lg font-bold bg-slate-900 text-slate-400 hover:text-white';
        });
        btn.className ='topup-filter-btn px-3 py-1 rounded-lg font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40';
        _currentTopupFilter = btn.dataset.filter ||'all';
        renderFilteredTopupRequestsTable();
      });
    });
  }

  async function loadAndRenderTopupPaymentSettings() {
    try {
      const settings = await AppDB.getPaymentSettings();
      const vodafoneInput = document.getElementById('adm-topup-vodafone');
      const instapayInput = document.getElementById('adm-topup-instapay');
      const notesInput = document.getElementById('adm-topup-notes');

      if (vodafoneInput) vodafoneInput.value = settings.vodafoneCash ||'';
      if (instapayInput) instapayInput.value = settings.instapay ||'';
      if (notesInput) notesInput.value = settings.notes ||'';
    } catch (e) {
      console.warn('[Admin Topup] Error fetching payment settings:', e);
    }
  }

  async function loadAndRenderTopupPackages() {
    const listEl = document.getElementById('adm-topup-packages-list');
    if (!listEl) return;

    try {
      _currentTopupPackagesCache = await AppDB.getTopupPackages();
      if (!_currentTopupPackagesCache || _currentTopupPackagesCache.length === 0) {
        listEl.innerHTML ='<div class="col-span-full p-4 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">لا توجد باقات شحن معرفة حالياً. اضغط"إضافة باقة جديدة" لإنشاء أول باقة!</div>';
        return;
      }

      listEl.innerHTML = '';
      _currentTopupPackagesCache.forEach(pkg => {
        const isHidden = (pkg.hidden === true || pkg.visible === false);
        const card = document.createElement('div');
        card.className = `p-4 rounded-2xl bg-slate-900/80 border ${isHidden ? 'border-slate-800 opacity-90' : 'border-amber-500/30'} flex flex-col justify-between space-y-3 relative overflow-hidden shadow-lg transition`;
        
        const badge = pkg.customBadge || '';
        const itemsList = pkg.items ? Object.entries(pkg.items).map(([k, v]) => {
          let label = k;
          if (k === 'vip_casino_pass') label = 'تصريح كازينو VIP';
          else if (k === 'swiss_safe') label = 'خزنة سويسرية';
          else if (k === 'offshore_account') label = 'حساب خارجي';
          else if (k === 'lottery_ticket') label = 'تذكرة يانصيب';
          else if (k === 'legalShield') label = 'درع قانوني';
          return `${v}x ${label}`;
        }).join(' • ') : '';

        const statusBadge = isHidden
          ? `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1 shrink-0"><i class="fa-solid fa-eye-slash text-[9px]"></i> مخفية من المتجر</span>`
          : `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0"><i class="fa-solid fa-eye text-[9px]"></i> ظاهرة في المتجر</span>`;

        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div class="flex items-center gap-1.5 min-w-0">
                ${badge ? `<span class="text-base">${badge}</span>` : ''}
                <strong class="text-white font-bold text-xs truncate">${pkg.name}</strong>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                ${statusBadge}
                <span class="numbers-font text-amber-400 font-black text-xs sm:text-sm shrink-0 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30">${Number(pkg.price).toLocaleString()} EGP</span>
              </div>
            </div>

            <p class="text-[11px] text-slate-400 mt-2 leading-relaxed">${pkg.description || 'باقة دعم ومكافآت مميزة في سيرفر رأس المال.'}</p>

            <div class="mt-3 p-2 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1 text-[10px]">
              ${pkg.cash ? `<div class="flex justify-between text-emerald-400 font-bold"><span>كاش:</span><span class="numbers-font">+${Number(pkg.cash).toLocaleString()} EGP</span></div>` : ''}
              ${pkg.bank ? `<div class="flex justify-between text-sky-400 font-bold"><span>بنك:</span><span class="numbers-font">+${Number(pkg.bank).toLocaleString()} EGP</span></div>` : ''}
              ${pkg.xp ? `<div class="flex justify-between text-cyan-400 font-bold"><span>خبرة XP:</span><span class="numbers-font">+${Number(pkg.xp).toLocaleString()}</span></div>` : ''}
              ${badge ? `<div class="flex justify-between text-yellow-400 font-bold"><span>وسام VIP:</span><span>${badge} ${pkg.badgeTitle || ''}</span></div>` : ''}
              ${itemsList ? `<div class="flex justify-between text-purple-300 font-bold"><span>أدوات:</span><span class="truncate max-w-[150px]">${itemsList}</span></div>` : ''}
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2 border-t border-slate-800">
            <button class="btn-toggle-visibility-pkg flex-1 py-1.5 ${isHidden ? 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40'} rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer" title="${isHidden ? 'إظهار الحزمة للاعبين في متجر VIP' : 'إخفاء الحزمة من متجر VIP'}">
              <i class="fa-solid ${isHidden ? 'fa-eye' : 'fa-eye-slash'} text-xs"></i>
              <span>${isHidden ? 'إظهار بالمتجر' : 'إخفاء من المتجر'}</span>
            </button>
            <button class="btn-edit-pkg px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
              <span>تعديل</span>
            </button>
            <button class="btn-delete-pkg px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer" title="حذف الباقة">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>`;

        // Visibility toggle button listener
        card.querySelector('.btn-toggle-visibility-pkg').addEventListener('click', async () => {
          try {
            pkg.hidden = !isHidden;
            await AppDB.saveTopupPackages(_currentTopupPackagesCache);
            const stateText = pkg.hidden ? 'تم إخفاء الحزمة من متجر VIP' : 'تم إظهار الحزمة في متجر VIP للجميع';
            showToast('حالة الحزمة', `${stateText}: "${pkg.name}"`, pkg.hidden ? 'warning' : 'success');
            loadAndRenderTopupPackages();
            logAdminAction(`تعديل ظهور الباقة: ${pkg.id} -> ${pkg.hidden ? 'مخفية' : 'ظاهرة'}`);
          } catch (err) {
            showToast('خطأ', 'فشل تعديل حالة الحزمة: ' + err.message, 'error');
          }
        });

        card.querySelector('.btn-edit-pkg').addEventListener('click', () => {
          openAdminPackageEditModal(pkg);
        });

        card.querySelector('.btn-delete-pkg').addEventListener('click', async () => {
          if (!confirm(`هل أنت متأكد من حذف باقة [${pkg.name}] نهائياً من المتجر؟`)) return;
          try {
            _currentTopupPackagesCache = _currentTopupPackagesCache.filter(p => p.id !== pkg.id);
            await AppDB.saveTopupPackages(_currentTopupPackagesCache);
            showToast('تم الحذف', `تم حذف باقة "${pkg.name}" بنجاح.`, 'success');
            loadAndRenderTopupPackages();
            logAdminAction(`حذف باقة الشحن: ${pkg.id}`);
          } catch (err) {
            showToast('خطأ في الحذف', err.message, 'error');
          }
        });

        listEl.appendChild(card);
      });
    } catch (e) {
      console.warn('[Admin Topup] Error rendering packages:', e);
    }
  }

  function openAdminPackageEditModal(pkg = null) {
    const modal = document.getElementById('modal-admin-edit-package');
    if (!modal) return;

    const titleEl = document.getElementById('adm-pkg-modal-title');
    const isEditEl = document.getElementById('adm-pkg-is-edit');
    const idInput = document.getElementById('adm-pkg-id');
    const nameInput = document.getElementById('adm-pkg-name');
    const priceInput = document.getElementById('adm-pkg-price');
    const cashInput = document.getElementById('adm-pkg-cash');
    const bankInput = document.getElementById('adm-pkg-bank');
    const xpInput = document.getElementById('adm-pkg-xp');
    const badgeInput = document.getElementById('adm-pkg-badge');
    const badgeTitleInput = document.getElementById('adm-pkg-badgetitle');
    const descInput = document.getElementById('adm-pkg-desc');
    const visibleCheck = document.getElementById('adm-pkg-visible');

    const vipPassInput = document.getElementById('adm-pkg-item-vip-pass');
    const swissSafeInput = document.getElementById('adm-pkg-item-swiss-safe');
    const offshoreInput = document.getElementById('adm-pkg-item-offshore');
    const lotteryInput = document.getElementById('adm-pkg-item-lottery');

    if (pkg) {
      titleEl.textContent = `تعديل باقة: ${pkg.name}`;
      isEditEl.value = '1';
      idInput.value = pkg.id;
      idInput.readOnly = true;
      nameInput.value = pkg.name || '';
      priceInput.value = pkg.price || 0;
      cashInput.value = pkg.cash || 0;
      bankInput.value = pkg.bank || 0;
      xpInput.value = pkg.xp || 0;
      badgeInput.value = pkg.customBadge || '';
      badgeTitleInput.value = pkg.badgeTitle || '';
      descInput.value = pkg.description || '';
      if (visibleCheck) visibleCheck.checked = (pkg.hidden !== true && pkg.visible !== false);

      const items = pkg.items || {};
      vipPassInput.value = items.vip_casino_pass || '';
      swissSafeInput.value = items.swiss_safe || '';
      offshoreInput.value = items.offshore_account || '';
      lotteryInput.value = items.lottery_ticket || '';
    } else {
      titleEl.textContent = 'إضافة باقة شحن جديدة';
      isEditEl.value = '0';
      idInput.value = 'pack_' + Date.now().toString().slice(-4);
      idInput.readOnly = false;
      nameInput.value = '';
      priceInput.value = '50';
      cashInput.value = '1000000';
      bankInput.value = '250000';
      xpInput.value = '1000';
      badgeInput.value = '';
      badgeTitleInput.value = 'عضو VIP';
      descInput.value = '';
      if (visibleCheck) visibleCheck.checked = true;

      vipPassInput.value = '';
      swissSafeInput.value = '';
      offshoreInput.value = '';
      lotteryInput.value = '';
    }

    modal.classList.remove('hidden');
  }

  window._adminSavePackageSubmit = async function() {
    const isEdit = document.getElementById('adm-pkg-is-edit')?.value === '1';
    const id = (document.getElementById('adm-pkg-id')?.value || '').trim();
    const name = (document.getElementById('adm-pkg-name')?.value || '').trim();
    const price = Number(document.getElementById('adm-pkg-price')?.value) || 0;
    const cash = Number(document.getElementById('adm-pkg-cash')?.value) || 0;
    const bank = Number(document.getElementById('adm-pkg-bank')?.value) || 0;
    const xp = Number(document.getElementById('adm-pkg-xp')?.value) || 0;
    const customBadge = (document.getElementById('adm-pkg-badge')?.value || '').trim();
    const badgeTitle = (document.getElementById('adm-pkg-badgetitle')?.value || '').trim();
    const description = (document.getElementById('adm-pkg-desc')?.value || '').trim();
    const isVisible = document.getElementById('adm-pkg-visible') ? document.getElementById('adm-pkg-visible').checked : true;

    if (!id || !name || price <= 0) {
      showToast('بيانات غير مكتملة', 'يرجى إدخال اسم الباقة، المعرف وسعر صحيح أكبر من صفر.', 'error');
      return;
    }

    const items = {};
    const vipPass = Number(document.getElementById('adm-pkg-item-vip-pass')?.value) || 0;
    const swissSafe = Number(document.getElementById('adm-pkg-item-swiss-safe')?.value) || 0;
    const offshore = Number(document.getElementById('adm-pkg-item-offshore')?.value) || 0;
    const lottery = Number(document.getElementById('adm-pkg-item-lottery')?.value) || 0;

    if (vipPass > 0) items.vip_casino_pass = vipPass;
    if (swissSafe > 0) items.swiss_safe = swissSafe;
    if (offshore > 0) items.offshore_account = offshore;
    if (lottery > 0) items.lottery_ticket = lottery;

    const existingPkg = _currentTopupPackagesCache.find(p => p.id === id);

    const pkgData = {
      id,
      name,
      price,
      cash,
      bank,
      xp,
      customBadge,
      badgeTitle,
      items,
      description,
      hidden: !isVisible,
      features: (existingPkg && existingPkg.features) ? existingPkg.features : undefined
    };

    try {
      if (isEdit) {
        const idx = _currentTopupPackagesCache.findIndex(p => p.id === id);
        if (idx !== -1) {
          _currentTopupPackagesCache[idx] = pkgData;
        } else {
          _currentTopupPackagesCache.push(pkgData);
        }
      } else {
        const exists = _currentTopupPackagesCache.some(p => p.id === id);
        if (exists) {
          showToast('معرف مكرر','يوجد باقة أخرى مسجلة بنفس المعرف (ID). استخدم معرفاً فريداً.','error');
          return;
        }
        _currentTopupPackagesCache.push(pkgData);
      }

      await AppDB.saveTopupPackages(_currentTopupPackagesCache);
      showToast('تم حفظ الباقة',`تم حفظ وتفعيل باقة"${name}" بنجاح في متجر الشحن.`,'success');
      logAdminAction(`حفظ باقة الشحن: ${id} (${name})`);
      document.getElementById('modal-admin-edit-package')?.classList.add('hidden');
      loadAndRenderTopupPackages();
    } catch (e) {
      showToast('خطأ في حفظ الباقة', e.message,'error');
    }
  };

  async function loadAndRenderTopupRequests() {
    try {
      _currentTopupRequestsCache = await AppDB.getTopupRequests();
      
      // Update KPIs
      let total = _currentTopupRequestsCache.length;
      let pending = 0;
      let approved = 0;
      let revenue = 0;

      _currentTopupRequestsCache.forEach(r => {
        if (r.status ==='pending') pending++;
        else if (r.status ==='approved') {
          approved++;
          revenue += Number(r.price) || 0;
        }
      });

      const elTotal = document.getElementById('adm-stat-topup-total');
      const elPending = document.getElementById('adm-stat-topup-pending');
      const elApproved = document.getElementById('adm-stat-topup-approved');
      const elRevenue = document.getElementById('adm-stat-topup-revenue');

      if (elTotal) elTotal.textContent = total.toLocaleString();
      if (elPending) elPending.textContent = pending.toLocaleString();
      if (elApproved) elApproved.textContent = approved.toLocaleString();
      if (elRevenue) elRevenue.textContent =`${revenue.toLocaleString()} EGP`;

      renderFilteredTopupRequestsTable();
    } catch (e) {
      console.warn('[Admin Topup] Error loading topup requests:', e);
    }
  }

  function renderFilteredTopupRequestsTable() {
    const tbody = document.getElementById('adm-topup-requests-tbody');
    if (!tbody) return;

    let list = _currentTopupRequestsCache || [];
    if (_currentTopupFilter !=='all') {
      list = list.filter(r => r.status === _currentTopupFilter);
    }

    if (list.length === 0) {
      tbody.innerHTML =`<tr><td colspan="8" class="p-4 text-center text-slate-500">لا توجد طلبات شحن متطابقة مع الفلتر الحالي (${_currentTopupFilter ==='all' ?'الكل' : _currentTopupFilter}).</td></tr>`;
      return;
    }

    tbody.innerHTML ='';
    list.forEach(req => {
      const tr = document.createElement('tr');
      tr.className ='hover:bg-slate-850/60 transition border-b border-slate-800/40 text-xs';

      let statusBadge ='';
      if (req.status ==='pending') {
        statusBadge ='<span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center justify-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>قيد المراجعة</span>';
      } else if (req.status ==='approved') {
        statusBadge ='<span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center justify-center gap-1">معتمد ومضاف </span>';
      } else {
        statusBadge =`<span class="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold flex items-center justify-center gap-1" title="${req.reviewerNote ||''}">مرفوض </span>`;
      }

      const dateFormatted = new Date(req.createdAt).toLocaleString('ar-EG', {
        month:'numeric',
        day:'numeric',
        hour:'2-digit',
        minute:'2-digit'
      });

      const receipt = req.receiptNumber ||'غير مدخل';

      tr.innerHTML =`
        <td class="p-2.5 text-slate-400 font-mono text-[11px]">${dateFormatted}</td>
        <td class="p-2.5 font-bold text-white">
          <span class="hover:underline cursor-pointer text-amber-300" onclick="window.inspectPlayerLog ? window.inspectPlayerLog('${req.username}') : null">@${req.username}</span>
        </td>
        <td class="p-2.5 font-bold text-slate-200">
          <div>${req.packageName}</div>
          <span class="text-[10px] text-slate-400 font-normal numbers-font">${req.packageId}</span>
        </td>
        <td class="p-2.5 text-center font-mono font-black text-amber-400">${Number(req.price).toLocaleString()} EGP</td>
        <td class="p-2.5 font-mono text-cyan-300 select-all" dir="ltr">${req.senderPhoneOrName ||'--'}</td>
        <td class="p-2.5 font-mono font-bold text-yellow-300 select-all" dir="ltr">
          <span class="bg-slate-900 px-2 py-1 rounded border border-slate-800 inline-flex items-center gap-1">
            <span>${receipt}</span>
            <button class="btn-copy-receipt text-slate-500 hover:text-white" title="نسخ رقم العملية"><i class="fa-solid fa-copy text-[10px]"></i></button>
          </span>
        </td>
        <td class="p-2.5 text-center">${statusBadge}</td>
        <td class="p-2.5 text-left space-x-1 space-x-reverse flex items-center justify-end gap-1">
          ${req.status ==='pending' ?`
            <button class="btn-approve-topup px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition text-[11px] shadow-sm">
              <i class="fa-solid fa-check"></i> قبول
            </button>
            <button class="btn-reject-topup px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-bold rounded-lg transition text-[11px] border border-rose-500/30">
              <i class="fa-solid fa-xmark"></i> رفض
            </button>` :`
            <span class="text-[10px] text-slate-500" title="${req.reviewerNote ||''}">
              ${req.reviewerNote ? req.reviewerNote : (req.status ==='approved' ?'تم الشحن' :'تم الرفض')}
            </span>`}
          <button class="btn-delete-topup px-2 py-1 bg-slate-900 hover:bg-rose-600 text-slate-400 hover:text-white font-bold rounded-lg transition text-[11px] border border-slate-800 hover:border-rose-500 shadow-sm" title="حذف هذا الطلب الوهمي نهائياً من السجل">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>`;

      // Copy Receipt Number
      const copyBtn = tr.querySelector('.btn-copy-receipt');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(receipt);
          showToast('تم النسخ','تم نسخ رقم العملية أو الوصل للحافظة.','info');
        });
      }

      // Approve Button
      const approveBtn = tr.querySelector('.btn-approve-topup');
      if (approveBtn) {
        approveBtn.addEventListener('click', async () => {
          const confirmMsg =`تأكيد الشحن الفوري \n\nهل أنت متأكد من اعتماد طلب الشحن للاعب"${req.username}"؟\nالباقة: ${req.packageName}\nالمبلغ: ${req.price} EGP\n\nسيتم إيداع الكاش والبنك ونقاط الخبرة والوسام بحساب اللاعب فوراً وإرسال إشعار له.`;
          if (!confirm(confirmMsg)) return;

          try {
            approveBtn.disabled = true;
            approveBtn.innerHTML ='<i class="fa-solid fa-spinner animate-spin"></i>';
            await AppDB.processTopupRequest(req.id,'approved','تم الاعتماد والشحن بنجاح بواسطة الإدارة');
            showToast('تم الاعتماد والشحن',`تم إيداع مكافآت باقة [${req.packageName}] بحساب اللاعب @${req.username} بنجاح!`,'success');
            logAdminAction(`اعتماد طلب شحن: ${req.id} للاعب ${req.username} باقة ${req.packageName}`);
            await loadAndRenderTopupRequests();
          } catch (err) {
            showToast('فشل الاعتماد', err.message,'error');
            approveBtn.disabled = false;
            approveBtn.innerHTML ='<i class="fa-solid fa-check"></i> قبول';
          }
        });
      }

      // Reject Button
      const rejectBtn = tr.querySelector('.btn-reject-topup');
      if (rejectBtn) {
        rejectBtn.addEventListener('click', async () => {
          const reason = prompt('اكتب سبب رفض طلب الشحن (سيصل للاعب في بريده):','عدم وصول التحويل أو عدم تطابق رقم العملية');
          if (reason === null) return;

          try {
            rejectBtn.disabled = true;
            rejectBtn.innerHTML ='<i class="fa-solid fa-spinner animate-spin"></i>';
            await AppDB.processTopupRequest(req.id,'rejected', reason.trim() ||'لم يتم تأكيد وصول التحويل');
            showToast('تم الرفض',`تم رفض طلب الشحن الخاص باللاعب @${req.username}.`,'info');
            logAdminAction(`رفض طلب شحن: ${req.id} للاعب ${req.username} - السبب: ${reason}`);
            await loadAndRenderTopupRequests();
          } catch (err) {
            showToast('فشل الرفض', err.message,'error');
            rejectBtn.disabled = false;
            rejectBtn.innerHTML ='<i class="fa-solid fa-xmark"></i> رفض';
          }
        });
      }

      // Delete Button (حذف الطلبات الوهمية)
      const deleteBtn = tr.querySelector('.btn-delete-topup');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
          const confirmDelete = confirm(`حذف طلب الشحن نهائياً 🗑️\n\nهل أنت متأكد من حذف هذا الطلب نهائياً من السجل؟\nاللاعب: @${req.username}\nالباقة: ${req.packageName}\nالمبلغ: ${req.price} EGP\n\nلن يظهر هذا الطلب مجدداً في لوحة الإدارة.`);
          if (!confirmDelete) return;

          try {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i>';
            await AppDB.deleteTopupRequest(req.id);
            showToast('تم الحذف', `تم حذف طلب الشحن الخاص باللاعب @${req.username} بنجاح.`, 'info');
            logAdminAction(`حذف طلب شحن وهمي: ${req.id} للاعب ${req.username}`);
            await loadAndRenderTopupRequests();
          } catch (err) {
            showToast('فشل الحذف', err.message, 'error');
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
          }
        });
      }

      tbody.appendChild(tr);
    });
  }