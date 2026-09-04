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
      });
    }

    // Manual Refresh Button in Admin Header
    const manualRefreshBtn = document.getElementById('btn-admin-manual-refresh');
    if (manualRefreshBtn) {
      manualRefreshBtn.addEventListener('click', async () => {
        manualRefreshBtn.disabled = true;
        manualRefreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>جاري التحديث...</span>';
        try {
          if (typeof loadAdminPlayersDirectory === 'function') {
            await loadAdminPlayersDirectory(true, true);
          }
          if (typeof showToast === 'function') {
            showToast('تحديث الإدارة', 'تم تحديث كافة بيانات لوحة التحكم بنجاح! 🔄', 'success');
          }
        } catch (e) {
          console.error('[Admin] Manual refresh error:', e);
        } finally {
          manualRefreshBtn.disabled = false;
          manualRefreshBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> <span>تحديث البيانات</span>';
        }
      });
    }

    // Tabs logic - bind all 10 subtabs
    const tabs = ['stats', 'players', 'transfers', 'chat', 'market', 'broadcast', 'auctions', 'giftcodes', 'system', 'corporations'];
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
          cpuEl.textContent = (0.5 + Math.random() * 2.3).toFixed(1) + '%';
        }
        
        // RAM simulation
        const ramEl = document.getElementById('adm-telemetry-ram');
        if (ramEl) {
          ramEl.textContent = Math.floor(40 + Math.random() * 12) + ' MB';
        }
        
        // Latency simulation (No DB query to conserve read quota)
        const latencyEl = document.getElementById('adm-telemetry-latency');
        if (latencyEl) {
          latencyEl.textContent = Math.floor(18 + Math.random() * 14) + 'ms';
        }
      }
    }, 5000);

    // ─────────────────────────────────────────────
    //  MODULE: PLAYERS DIRECTORY & MANAGEMENT
    // ─────────────────────────────────────────────
    let cachedPlayers = [];
    let selectedPlayer = null;
    let selectedPlayerState = null;
    let activeFilter = 'all';

    const searchInput = document.getElementById('admin-search-user');
    const searchBtn = document.getElementById('btn-admin-search');
    const refreshListBtn = document.getElementById('btn-admin-refresh-players-list');
    const playersTableBody = document.getElementById('admin-players-table-body');
    const resultCard = document.getElementById('admin-player-result');

    async function loadAdminPlayersDirectory(showToastNotice = false, forceRefresh = false) {
      if (!playersTableBody) return;
      playersTableBody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-slate-400">جاري فحص وتحديث بيانات اللاعبين...</td></tr>';
      try {
        cachedPlayers = await AppDB.adminGetAllPlayers(forceRefresh);
        renderPlayersTable();
        updateFilterCounts();
        if (showToastNotice) {
          const isCache = cachedPlayers.length > 0 && cachedPlayers.every(p => p.fromCache);
          const cacheMsg = isCache ? ' (بيانات الكاش المحلي)' : ' (مباشر من السيرفر 🟢)';
          showToast('قائمة اللاعبين', `تم جلب بيانات ${cachedPlayers.length} لاعب بنجاح${cacheMsg}.`, 'success');
        }
      } catch (err) {
        playersTableBody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-rose-400">تعذر تحميل القائمة: ${err.message}</td></tr>`;
      }
    }

    function updateFilterCounts() {
      const countAll = cachedPlayers.length;
      const countJailed = cachedPlayers.filter(p => p.jailTimer > 0).length;
      const countBanned = cachedPlayers.filter(p => p.isBanned).length;

      const elAll = document.getElementById('adm-filter-count-all');
      const elJailed = document.getElementById('adm-filter-count-jailed');
      const elBanned = document.getElementById('adm-filter-count-banned');
      const elTotal = document.getElementById('admin-players-total-label');

      if (elAll) elAll.textContent = countAll;
      if (elJailed) elJailed.textContent = countJailed;
      if (elBanned) elBanned.textContent = countBanned;
      
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

      let filtered = cachedPlayers.filter(p => {
        const matchesQuery = !query || p.username.toLowerCase().includes(query) || (p.title && p.title.toLowerCase().includes(query));
        if (!matchesQuery) return false;

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
        const timeA = Number(a.createdAt || a.created_at || a.lastSeen || a.last_seen || 0);
        const timeB = Number(b.createdAt || b.created_at || b.lastSeen || b.last_seen || 0);
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
          playersTableBody.innerHTML = `
            <tr>
              <td colspan="5" class="py-6 text-center space-y-2">
                <div class="text-slate-400 text-xs">لم يتم العثور على اللاعب "${rawQuery}" في القائمة المفهرسة محلياً.</div>
                <button id="btn-admin-direct-cloud-lookup" class="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-lg text-xs transition inline-flex items-center gap-2 shadow-lg shadow-yellow-500/20">
                  <i class="fa-solid fa-cloud-arrow-down"></i>
                  <span>فحص وبحث مباشر بالاسم في السيرفر السحابي</span>
                </button>
              </td>
            </tr>
          `;
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
                    lastSeen: fetchedDoc.lastSeen || 0,
                    lastActiveTimestamp: fetchedDoc.lastActiveTimestamp || 0,
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

        const isOnlineThreshold = 2 * 60 * 1000; // 2 minutes
        const isPlayerOnline = p.lastActiveTimestamp && (Date.now() - p.lastActiveTimestamp) < isOnlineThreshold;
        let statusBadge = isPlayerOnline
          ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">متصل 🟢</span>'
          : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">غير نشط ⚫</span>';
        if (p.isBanned) {
          statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">محظور 🚫</span>';
        } else if (p.jailTimer > 0) {
          statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">سجين (${p.jailTimer}ث)${isPlayerOnline ? ' 🟢' : ''}</span>`;
        } else if (p.isAdmin) {
          statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">الإدارة ⭐${isPlayerOnline ? ' 🟢' : ' ⚫'}</span>`;
        }

        tr.innerHTML = `
          <td class="p-2.5 flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-slate-800 text-yellow-400 flex items-center justify-center font-bold text-[10px]">
              ${p.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="font-bold text-white">${p.username} ${p.username === GameEngine.activeUsername ? '<span class="text-[9px] text-yellow-400">(أنت)</span>' : ''}</div>
              <div class="text-[10px] text-slate-400 font-sans">${p.title || 'عامل مبتدئ'}</div>
            </div>
          </td>
          <td class="p-2.5 text-center numbers-font font-bold text-yellow-400">${Number(p.netWorth !== undefined && p.netWorth !== null ? p.netWorth : (p.net_worth || 0)).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center numbers-font font-bold text-emerald-400">${Number(p.cash || 0).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center">${statusBadge}</td>
          <td class="p-2.5 text-left">
            <button data-user="${p.username}" class="btn-select-player px-2.5 py-1 bg-yellow-500/20 hover:bg-yellow-500 text-yellow-400 hover:text-slate-950 rounded text-[10px] font-bold transition">إدارة ⚡</button>
          </td>
        `;

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
        document.getElementById('admin-p-worth').textContent = `${(state.netWorth || 0).toLocaleString()} EGP`;
        document.getElementById('admin-p-cash').textContent = (state.cash || 0).toLocaleString();
        document.getElementById('admin-p-bank').textContent = (state.bank || 0).toLocaleString();
        const dirtyEl = document.getElementById('admin-p-dirty');
        if (dirtyEl) dirtyEl.textContent = (state.dirtyCash || 0).toLocaleString();
        document.getElementById('admin-p-title').textContent = state.title || 'عامل مبتدئ';

        // Format and render account creation date
        let createdStr = 'غير معروف';
        if (state.createdAt) {
          let date;
          if (typeof state.createdAt.toDate === 'function') {
            date = state.createdAt.toDate();
          } else if (state.createdAt.seconds) {
            date = new Date(state.createdAt.seconds * 1000);
          } else {
            date = new Date(state.createdAt);
          }
          if (date && !isNaN(date.getTime())) {
            createdStr = date.toLocaleDateString('ar-EG') + ' ' + date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
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
          if (typeof GameEngine.getDetailedCashflowBreakdown === 'function') {
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
        if (grossFlowEl) grossFlowEl.textContent = `${grossIncomePerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const taxFlowEl = document.getElementById('admin-p-flow-tax');
        if (taxFlowEl) taxFlowEl.textContent = `${taxPerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const netFlowEl = document.getElementById('admin-p-flow-net');
        if (netFlowEl) netFlowEl.textContent = `${netIncomePerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const roleBadge = document.getElementById('admin-p-badge-role');
        if (roleBadge) {
          roleBadge.textContent = state.isAdmin ? 'مدير النظام (Admin)' : 'حساب لاعب';
          roleBadge.className = state.isAdmin
            ? 'text-[10px] px-2 py-0.5 rounded font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            : 'text-[10px] px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300';
        }

        const toggleRoleBtn = document.getElementById('btn-admin-toggle-role');
        const toggleRoleText = document.getElementById('admin-toggle-role-text');
        if (toggleRoleBtn && toggleRoleText) {
          if (state.isAdmin) {
            toggleRoleText.textContent = 'سحب صلاحية الإدارة (إلغاء أدمن) ⚠️';
            toggleRoleBtn.className = 'w-full py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5';
          } else {
            toggleRoleText.textContent = 'نقل صلاحية الإدارة / تعيين كمسؤول (Make Admin) 👑';
            toggleRoleBtn.className = 'w-full py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20';
          }
        }

        const statusBadge = document.getElementById('admin-p-badge-status');
        if (statusBadge) {
          const onlineThreshold = 2 * 60 * 1000; // 2 minutes
          const isOnline = state.lastActiveTimestamp && (Date.now() - state.lastActiveTimestamp) < onlineThreshold;
          const lastSeenText = state.lastActiveTimestamp ? new Date(state.lastActiveTimestamp).toLocaleTimeString('ar-EG') : 'غير معروف';
          if (state.isBanned) {
            statusBadge.textContent = 'محظور نهائياً 🚫';
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30';
          } else if (state.jailTimer > 0) {
            statusBadge.textContent = `مسجون (${state.jailTimer} ثانية) ${isOnline ? '🟢 متصل' : '⚫ غير نشط'}`;
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30';
          } else if (isOnline) {
            statusBadge.textContent = `متصل الآن 🟢 (آخر نشاط: ${lastSeenText})`;
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
          } else {
            statusBadge.textContent = `غير نشط ⚫ (آخر ظهور: ${lastSeenText})`;
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-slate-600/20 text-slate-400 border border-slate-500/30';
          }
        }

        document.getElementById('admin-input-cash').value = state.cash || 0;
        document.getElementById('admin-input-bank').value = state.bank || 0;

        const bizSelect = document.getElementById('admin-input-biz-type');
        if (bizSelect) {
          const selectedBiz = bizSelect.value;
          const bizData = (state.businesses && state.businesses[selectedBiz]) || { level: 0, workers: 0 };
          document.getElementById('admin-input-biz-level').value = bizData.level || 0;
          document.getElementById('admin-input-biz-workers').value = bizData.workers || 0;
        }

        if (resultCard) {
          resultCard.classList.remove('hidden');
          resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        const fbText = document.getElementById('admin-toggle-fb-text');
        if (fbText) {
          const isFb = Boolean(state.facebookVerified || (state.badges && state.badges.includes('facebook')));
          fbText.textContent = isFb ? 'سحب شارة فيسبوك (إلغاء التوثيق) ❌' : 'منح شارة فيسبوك الزرقاء (توثيق الحساب) 💎';
        }

        renderPlayersTable();
        renderPlayerPossessions(state);
        loadAdminPlayerWorkspace(state);
        logAdminAction(`تم فتح ملف الحساب للاعب: ${username}`);
      } catch (err) {
        showToast('خطأ فحص اللاعب', err.message, 'error');
      }
    }

    async function loadAdminPlayerWorkspace(playerState) {
      const listSelect = document.getElementById('admin-player-backups-select');
      if (!listSelect) return;

      listSelect.innerHTML = '<option value="">جاري جلب النسخ الاحتياطية...</option>';

      try {
        const dates = await AppDB.getPlayerBackupDates(playerState.username);
        listSelect.innerHTML = '';
        if (!dates || dates.length === 0) {
          listSelect.innerHTML = '<option value="">لا توجد نسخ احتياطية متوفرة...</option>';
        } else {
          dates.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = `نسخة يوم ${d}`;
            listSelect.appendChild(opt);
          });
        }
      } catch (err) {
        listSelect.innerHTML = '<option value="">فشل جلب النسخ الاحتياطية</option>';
      }
    }

    // ==================== PLAYER POSSESSIONS & BACKUP EXPORT & GRANT ACTIONS ====================

    // RENDER PLAYER POSSESSIONS DIRECTORY
    function renderPlayerPossessions(state) {
      const container = document.getElementById('admin-p-possessions-container');
      if (!container) return;
      container.innerHTML = '';

      let hasItems = false;

      // 1. Current Job
      if (state.jobId || state.title) {
        hasItems = true;
        const jobDiv = document.createElement('div');
        jobDiv.className = 'flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 hover:border-yellow-500/20 transition';
        jobDiv.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="text-base">💼</span>
            <div>
              <div class="font-bold text-slate-200">الوظيفة الحالية</div>
              <div class="text-[10px] text-slate-400 font-sans">${state.title || 'عامل مبتدئ'}</div>
            </div>
          </div>
          <select class="admin-inline-job-select bg-slate-950 border border-slate-700 text-slate-300 p-1.5 rounded-md text-[10px] focus:outline-none focus:border-yellow-500">
            ${Object.keys(GameEngine.JOBS).map(jk => '<option value="' + jk + '" ' + (state.jobId === jk ? 'selected' : '') + '>' + GameEngine.JOBS[jk].name + '</option>').join('')}
          </select>
        `;
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
          bizDiv.className = 'flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 hover:border-yellow-500/20 transition gap-2 mt-2';
          bizDiv.innerHTML = `
            <div class="flex items-center gap-2 flex-1 text-right">
              <span class="text-base">🏢</span>
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
            </div>
          `;

          bizDiv.querySelector('.btn-inline-biz-lvl-dec').addEventListener('click', async () => {
            biz.level = Math.max(0, biz.level - 1);
            await saveAndSyncPlayerPossessions();
          });
          bizDiv.querySelector('.btn-inline-biz-lvl-inc').addEventListener('click', async () => {
            biz.level += 1;
            await saveAndSyncPlayerPossessions();
          });
          bizDiv.querySelector('.btn-inline-biz-wrk-dec').addEventListener('click', async () => {
            biz.workers = Math.max(0, biz.workers - 1);
            await saveAndSyncPlayerPossessions();
          });
          bizDiv.querySelector('.btn-inline-biz-wrk-inc').addEventListener('click', async () => {
            biz.workers += 1;
            await saveAndSyncPlayerPossessions();
          });
          bizDiv.querySelector('.btn-inline-biz-del').addEventListener('click', async () => {
            if (confirm(`هل أنت متأكد من حذف مشروع "${bizName}" لللاعب؟`)) {
              biz.level = 0;
              biz.workers = 0;
              await saveAndSyncPlayerPossessions();
            }
          });

          container.appendChild(bizDiv);
        });
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
          assetDiv.className = 'flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 hover:border-yellow-500/20 transition mt-2';
          assetDiv.innerHTML = `
            <div class="flex items-center gap-2 text-right">
              <span class="text-base">🏡</span>
              <div>
                <div class="font-bold text-slate-200">${assetName}</div>
                <div class="text-[10px] text-slate-400">العدد المملوك: <strong class="text-emerald-400 font-mono">${qty}</strong></div>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button class="btn-inline-ast-dec px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold">-</button>
              <button class="btn-inline-ast-inc px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold">+</button>
              <button class="btn-inline-ast-del ml-1 p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition" title="حذف الأصل"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          `;

          assetDiv.querySelector('.btn-inline-ast-dec').addEventListener('click', async () => {
            state.assets[ak] = Math.max(0, qty - 1);
            await saveAndSyncPlayerPossessions();
          });
          assetDiv.querySelector('.btn-inline-ast-inc').addEventListener('click', async () => {
            state.assets[ak] = qty + 1;
            await saveAndSyncPlayerPossessions();
          });
          assetDiv.querySelector('.btn-inline-ast-del').addEventListener('click', async () => {
            if (confirm(`هل أنت متأكد من حذف عقارات "${assetName}" بالكامل لللاعب؟`)) {
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
          stockDiv.className = 'flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 hover:border-yellow-500/20 transition gap-2 mt-2';
          stockDiv.innerHTML = `
            <div class="flex items-center gap-2 flex-1 text-right">
              <span class="text-base">📈</span>
              <div>
                <div class="font-bold text-slate-200">${sk} (${stockName})</div>
                <div class="text-[10px] text-slate-400">الأسهم: <span class="text-yellow-400 font-bold font-mono">${stockData.shares}</span> | متوسط الشراء: <span class="text-sky-400 font-bold font-mono">${stockData.avgPrice} EGP</span></div>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button class="btn-inline-stk-edit px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold">تعديل</button>
              <button class="btn-inline-stk-del p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition" title="حذف الأسهم"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          `;

          stockDiv.querySelector('.btn-inline-stk-edit').addEventListener('click', async () => {
            const newShares = prompt(`أدخل عدد الأسهم الجديد لسهم (${sk}):`, stockData.shares);
            if (newShares === null) return;
            const newPrice = prompt(`أدخل متوسط سعر الشراء الجديد للسهم:`, stockData.avgPrice);
            if (newPrice === null) return;

            const sharesVal = parseInt(newShares) || 0;
            const priceVal = parseFloat(newPrice) || 0;

            if (sharesVal < 0 || priceVal < 0) {
              showToast('خطأ إدخال', 'يرجى إدخال قيم صحيحة للأسهم والأسعار.', 'error');
              return;
            }

            stockData.shares = sharesVal;
            stockData.avgPrice = priceVal;
            await saveAndSyncPlayerPossessions();
          });

          stockDiv.querySelector('.btn-inline-stk-del').addEventListener('click', async () => {
            if (confirm(`هل أنت متأكد من حذف أسهم "${sk}" لللاعب؟`)) {
              stockData.shares = 0;
              await saveAndSyncPlayerPossessions();
            }
          });

          container.appendChild(stockDiv);
        });
      }

      if (!hasItems) {
        container.innerHTML = `<p class="text-slate-500 text-[10px] text-center py-2">لا يوجد أملاك أو وظائف لعرضها حالياً لهذا اللاعب.</p>`;
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
          GameEngine.state.jobId = selectedPlayerState.jobId || 'worker';
          GameEngine.state.title = selectedPlayerState.title || 'عامل مبتدئ';
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
          if (typeof GameEngine.getDetailedCashflowBreakdown === 'function') {
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
        if (grossFlowEl) grossFlowEl.textContent = `${grossIncomePerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const taxFlowEl = document.getElementById('admin-p-flow-tax');
        if (taxFlowEl) taxFlowEl.textContent = `${taxPerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        const netFlowEl = document.getElementById('admin-p-flow-net');
        if (netFlowEl) netFlowEl.textContent = `${netIncomePerSecond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;

        // Update Admin UI fields
        document.getElementById('admin-p-worth').textContent = `${worth.toLocaleString()} EGP`;
        document.getElementById('admin-p-title').textContent = selectedPlayerState.title || 'عامل مبتدئ';

        // Re-render
        renderPlayerPossessions(selectedPlayerState);
        loadAdminPlayersDirectory(false);
        showToast('حفظ التعديلات', 'تم تحديث ممتلكات اللاعب بنجاح وحفظها.', 'success');
      } catch (err) {
        showToast('خطأ حفظ ممتلكات', err.message, 'error');
      }
    }

    // Dynamic Select Populate for Grant Tool
    function populateGrantItemSelect() {
      const typeSelect = document.getElementById('admin-grant-type');
      const itemSelect = document.getElementById('admin-grant-item-select');
      if (!typeSelect || !itemSelect) return;

      const type = typeSelect.value;
      itemSelect.innerHTML = '';

      // Toggle fields visibility
      document.getElementById('admin-grant-fields-job').classList.toggle('hidden', type !== 'job');
      document.getElementById('admin-grant-fields-business').classList.toggle('hidden', type !== 'business');
      document.getElementById('admin-grant-fields-asset').classList.toggle('hidden', type !== 'asset');
      document.getElementById('admin-grant-fields-stock').classList.toggle('hidden', type !== 'stock');

      let options = [];
      if (type === 'job') {
        Object.keys(GameEngine.JOBS).forEach(k => {
          options.push({ value: k, text: GameEngine.JOBS[k].name });
        });
      } else if (type === 'business') {
        Object.keys(GameEngine.BUSINESSES).forEach(k => {
          options.push({ value: k, text: GameEngine.BUSINESSES[k].name });
        });
      } else if (type === 'asset') {
        Object.keys(GameEngine.ASSETS).forEach(k => {
          options.push({ value: k, text: GameEngine.ASSETS[k].name });
        });
      } else if (type === 'stock') {
        Object.keys(GameEngine.STOCKS).forEach(k => {
          options.push({ value: k, text: `${k} (${GameEngine.STOCKS[k].name})` });
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
          showToast('إضافة ممتلكات', 'يرجى اختيار لاعب أولاً من القائمة.', 'error');
          return;
        }

        const type = document.getElementById('admin-grant-type').value;
        const itemKey = document.getElementById('admin-grant-item-select').value;
        if (!itemKey) return;

        if (type === 'job') {
          selectedPlayerState.jobId = itemKey;
          selectedPlayerState.title = document.getElementById('admin-grant-job-title').value.trim() || GameEngine.JOBS[itemKey].name;
        } else if (type === 'business') {
          const lvl = parseInt(document.getElementById('admin-grant-biz-level').value) || 0;
          const wrk = parseInt(document.getElementById('admin-grant-biz-workers').value) || 0;
          if (lvl < 0 || wrk < 0) {
            showToast('خطأ إدخال', 'يرجى إدخال أرقام صحيحة لمستوى المشروع وموظفيه.', 'error');
            return;
          }
          if (!selectedPlayerState.businesses) selectedPlayerState.businesses = {};
          const bizConfig = GameEngine.BUSINESSES[itemKey];
          const price = (selectedPlayerState.businesses[itemKey] && selectedPlayerState.businesses[itemKey].price) || (bizConfig ? bizConfig.optimumPrice : 10);
          selectedPlayerState.businesses[itemKey] = { level: lvl, workers: wrk, price: price };
        } else if (type === 'asset') {
          const qty = parseInt(document.getElementById('admin-grant-asset-qty').value) || 0;
          if (qty < 0) {
            showToast('خطأ إدخال', 'العدد يجب أن يكون صفراً أو أكبر.', 'error');
            return;
          }
          if (!selectedPlayerState.assets) selectedPlayerState.assets = {};
          selectedPlayerState.assets[itemKey] = qty;
        } else if (type === 'stock') {
          const shares = parseInt(document.getElementById('admin-grant-stock-shares').value) || 0;
          const price = parseFloat(document.getElementById('admin-grant-stock-price').value) || 0;
          if (shares < 0 || price < 0) {
            showToast('خطأ إدخال', 'الأسهم والأسعار يجب أن تكون أرقاماً موجبة.', 'error');
            return;
          }
          if (!selectedPlayerState.stocks) selectedPlayerState.stocks = {};
          selectedPlayerState.stocks[itemKey] = { shares: shares, avgPrice: price };
        }

        await saveAndSyncPlayerPossessions();
        showToast('إضافة ممتلكات', 'تم منح الممتلك المحدد لللاعب بنجاح.', 'success');
      });
    }

    // Download Backup Action
    const downloadBackupBtn = document.getElementById('btn-admin-download-backup');
    if (downloadBackupBtn) {
      downloadBackupBtn.addEventListener('click', () => {
        if (!selectedPlayer || !selectedPlayerState) {
          showToast('تحميل تقرير الحساب', 'يرجى اختيار لاعب أولاً.', 'error');
          return;
        }
        try {
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedPlayerState, null, 2));
          const downloadAnchor = document.createElement('a');
          downloadAnchor.setAttribute("href", dataStr);
          downloadAnchor.setAttribute("download", `rasalmal_player_${selectedPlayer}_backup.json`);
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          downloadAnchor.remove();
          showToast('تحميل تقرير الحساب', `تم تحميل ملف بيانات حساب اللاعب ${selectedPlayer} بنجاح.`, 'success');
        } catch (err) {
          showToast('خطأ في التحميل', err.message, 'error');
        }
      });
    }

    // Filter Buttons
    const filterBtns = document.querySelectorAll('.admin-player-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('bg-yellow-500', 'text-slate-950');
          b.classList.add('bg-slate-800', 'text-slate-300');
        });
        btn.classList.remove('bg-slate-800', 'text-slate-300');
        btn.classList.add('bg-yellow-500', 'text-slate-950');
        activeFilter = btn.getAttribute('data-filter');
        renderPlayersTable();
      });
    });

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
          showToast('بحث اللاعبين', 'يرجى إدخال اسم المستخدم للبحث.', 'warning');
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

    // Quick Zero Buttons
    const quickZeroBtns = document.querySelectorAll('.btn-quick-set-zero');
    quickZeroBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetType = btn.getAttribute('data-set-zero');
        if (targetType === 'cash') {
          const c = document.getElementById('admin-input-cash');
          if (c) c.value = 0;
        } else if (targetType === 'bank') {
          const b = document.getElementById('admin-input-bank');
          if (b) b.value = 0;
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
          showToast('تعديل الرصيد', 'يرجى اختيار لاعب أولاً من القائمة.', 'error');
          return;
        }
        const newCash = Number(document.getElementById('admin-input-cash').value);
        const newBank = Number(document.getElementById('admin-input-bank').value);

        if (isNaN(newCash) || isNaN(newBank) || newCash < 0 || newBank < 0) {
          showToast('خطأ مدخلات', 'يرجى إدخال مبالغ صحيحة وموجبة.', 'error');
          return;
        }

        try {
          selectedPlayerState.cash = newCash;
          selectedPlayerState.bank = newBank;

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

          // Save to Firestore
          await AppDB.adminSavePlayer(selectedPlayer, selectedPlayerState);

          // CRITICAL: If the edited user is currently logged in, sync GameEngine memory & localStorage immediately!
          if (selectedPlayer === GameEngine.activeUsername) {
            GameEngine.state.cash = newCash;
            GameEngine.state.bank = newBank;
            GameEngine.state.netWorth = worth;
            try {
              localStorage.setItem(`rasalmal_state_${selectedPlayer}`, JSON.stringify(GameEngine.state));
            } catch (e) { }
            renderAll();
          }

          // Update UI Card
          document.getElementById('admin-p-cash').textContent = newCash.toLocaleString();
          document.getElementById('admin-p-bank').textContent = newBank.toLocaleString();
          document.getElementById('admin-p-worth').textContent = `${worth.toLocaleString()} EGP`;

          showToast('تم الحفظ بنجاح', `تم تحديث رصيد اللاعب ${selectedPlayer} بنجاح (كاش: ${newCash.toLocaleString()}، بنك: ${newBank.toLocaleString()}).`, 'success');
          logAdminAction(`تعديل رصيد اللاعب ${selectedPlayer} إلى كاش: ${newCash.toLocaleString()} ج.م، بنك: ${newBank.toLocaleString()} ج.م`);

          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('فشل تعديل الرصيد', err.message, 'error');
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
          showToast('تعديل الأملاك', 'يرجى اختيار لاعب أولاً من القائمة.', 'error');
          return;
        }
        const bizKey = document.getElementById('admin-input-biz-type').value;
        const level = parseInt(document.getElementById('admin-input-biz-level').value) || 0;
        const workers = parseInt(document.getElementById('admin-input-biz-workers').value) || 0;

        if (isNaN(level) || level < 0 || isNaN(workers) || workers < 0) {
          showToast('خطأ مدخلات', 'يرجى إدخال قيم صحيحة للمستوى والموظفين.', 'error');
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
          updateBizBtn.innerHTML = 'جاري الحفظ والتزامن...';

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

          document.getElementById('admin-p-worth').textContent = `${worth.toLocaleString()} EGP`;
          showToast('تحديث الأملاك', `تم تحديث أملاك اللاعب (${bizConfig ? bizConfig.name : bizKey}) بنجاح إلى مستوى ${level} وعدد موظفين ${workers}.`, 'success');
          logAdminAction(`تعديل أملاك اللاعب ${selectedPlayer}: ${bizKey} -> مستوى ${level}، موظفين ${workers}`);
          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('خطأ في الحفظ', err.message, 'error');
        } finally {
          updateBizBtn.disabled = false;
          updateBizBtn.innerHTML = '<i class="fa-solid fa-building-circle-check"></i> <span>حفظ وتطبيق الأملاك فوراً</span>';
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
          showToast('عفو قانوني', `تم الإفراج عن اللاعب ${selectedPlayer} وإلغاء عقوبة السجن.`, 'success');
          logAdminAction(`عفو وإفراج قانوني عن اللاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ إشرافي', err.message, 'error');
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
          showToast('عقوبة السجن', `تم إيداع اللاعب ${selectedPlayer} في السجن لمدة 5 دقائق.`, 'warning');
          logAdminAction(`إيداع اللاعب ${selectedPlayer} في السجن لمدة 300 ثانية`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ إشرافي', err.message, 'error');
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
          showToast('حظر الحساب', `تم حظر حساب اللاعب ${selectedPlayer} نهائياً.`, 'success');
          logAdminAction(`حظر نهائي لحساب اللاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ حظر', err.message, 'error');
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
          showToast('فك الحظر', `تم رفع الحظر عن حساب اللاعب ${selectedPlayer} بنجاح.`, 'success');
          logAdminAction(`رفع الحظر وإعادة تنشيط حساب اللاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ فك الحظر', err.message, 'error');
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
          if (newPin !== null) showToast('تغيير PIN', 'يجب أن يتكون الرقم السري من 3 خانات على الأقل.', 'error');
          return;
        }
        try {
          await AppDB.adminChangePlayerPin(selectedPlayer, newPin.trim());
          showToast('تغيير PIN', `تم تعيين الرقم السري الجديد للاعب ${selectedPlayer} بنجاح.`, 'success');
          logAdminAction(`تغيير الرقم السري لحساب اللاعب: ${selectedPlayer}`);
        } catch (err) {
          showToast('خطأ تغيير PIN', err.message, 'error');
        }
      });
    }

    // Toggle / Transfer Admin Role Action
    const toggleAdminRoleBtn = document.getElementById('btn-admin-toggle-role');
    if (toggleAdminRoleBtn) {
      toggleAdminRoleBtn.addEventListener('click', async () => {
        if (!selectedPlayer || !selectedPlayerState) {
          showToast('إدارة الصلاحيات', 'يرجى اختيار لاعب أولاً من القائمة.', 'error');
          return;
        }

        const isCurrentlyAdmin = Boolean(selectedPlayerState.isAdmin);
        const targetUser = selectedPlayer;

        let confirmMsg = '';
        if (isCurrentlyAdmin) {
          confirmMsg = `⚠️ تحذير: هل أنت متأكد من سحب صلاحيات الإدارة من اللاعب "${targetUser}" وتحويل حسابه إلى حساب لاعب عادي؟`;
        } else {
          confirmMsg = `👑 تأكيد ترقية مسؤول:\nهل أنت متأكد من منح صلاحيات الإدارة الكاملة (Admin) للاعب "${targetUser}"؟\nسيتمكن هذا الحساب من الدخول للوحة التحكم وإدارة كافة مفاصل اللعبة واللاعبين.`;
        }

        if (!confirm(confirmMsg)) return;

        try {
          toggleAdminRoleBtn.disabled = true;
          toggleAdminRoleBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري تحديث الصلاحية...';

          const newAdminStatus = !isCurrentlyAdmin;
          await AppDB.adminSetPlayerAdminStatus(targetUser, newAdminStatus);

          selectedPlayerState.isAdmin = newAdminStatus;
          if (targetUser === GameEngine.activeUsername && GameEngine.state) {
            GameEngine.state.isAdmin = newAdminStatus;
          }

          showToast('صلاحيات الإدارة', newAdminStatus ? `تم تعيين اللاعب ${targetUser} كمسؤول (Admin) بنجاح! 👑` : `تم سحب صلاحيات الإدارة من اللاعب ${targetUser}.`, 'success');
          logAdminAction(`${newAdminStatus ? 'ترقية وتعيين مسؤول جديد (Admin)' : 'سحب صلاحية الإدارة من'}: ${targetUser}`);

          selectPlayerForModeration(targetUser);
          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('خطأ تعديل الصلاحية', err.message, 'error');
        } finally {
          toggleAdminRoleBtn.disabled = false;
          if (selectedPlayerState) {
            if (selectedPlayerState.isAdmin) {
              toggleAdminRoleBtn.innerHTML = '<i class="fa-solid fa-user-shield text-xs"></i> <span>سحب صلاحية الإدارة (إلغاء أدمن) ⚠️</span>';
              toggleAdminRoleBtn.className = 'w-full py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5';
            } else {
              toggleAdminRoleBtn.innerHTML = '<i class="fa-solid fa-crown text-xs"></i> <span>نقل صلاحية الإدارة لهذا الحساب (Make Admin) 👑</span>';
              toggleAdminRoleBtn.className = 'w-full py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20';
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
          showToast('تنبيه', 'يرجى اختيار لاعب أولاً من القائمة.', 'warning');
          return;
        }
        const currentFb = Boolean(selectedPlayerState.facebookVerified || (selectedPlayerState.badges && selectedPlayerState.badges.includes('facebook')));
        const newFb = !currentFb;
        selectedPlayerState.facebookVerified = newFb;
        if (!Array.isArray(selectedPlayerState.badges)) selectedPlayerState.badges = [];
        if (newFb && !selectedPlayerState.badges.includes('facebook')) selectedPlayerState.badges.push('facebook');
        if (!newFb) selectedPlayerState.badges = selectedPlayerState.badges.filter(b => b !== 'facebook');

        try {
          toggleFbBtn.disabled = true;
          await AppDB.savePlayerState(selectedPlayer, selectedPlayerState, true);
          showToast('شارة فيسبوك', newFb ? `تم منح شارة فيسبوك الزرقاء للاعب ${selectedPlayer} بنجاح! 💎` : `تم سحب الشارة من اللاعب ${selectedPlayer}.`, 'success');
          logAdminAction(`${newFb ? 'منح' : 'سحب'} شارة فيسبوك للاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
        } catch (err) {
          showToast('خطأ شارة', err.message, 'error');
        } finally {
          toggleFbBtn.disabled = false;
        }
      });
    }

    // RESET SPECIFIC PLAYER ACCOUNT
    const resetPlayerAccountBtn = document.getElementById('btn-admin-reset-player-account');
    if (resetPlayerAccountBtn) {
      resetPlayerAccountBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        const confirmMsg = `تحذير قاطع: هل أنت متأكد من تصفير حساب اللاعب "${selectedPlayer}" بالكامل من كل شيء؟\nسيتم تصفير الكاش والبنك والأموال المشبوهة، ومسح كافة الأصول والشركات والأسهم والاستثمارات والمخزون ونقاط الخبرة والرتبة والملاحقات (تصفير شامل 0 EGP).`;
        if (!confirm(confirmMsg)) return;

        try {
          const freshData = await AppDB.adminResetPlayer(selectedPlayer);

          // If active user is the reset user, sync immediately
          if (selectedPlayer === GameEngine.activeUsername) {
            applyCompleteZeroStateToGameEngine(selectedPlayer);
            renderAll();
          }

          showToast('تصفير الحساب', `تم تصفير حساب اللاعب "${selectedPlayer}" بالكامل من كل شيء بنجاح (0 EGP).`, 'success');
          logAdminAction(`تصفير شامل ونهائي لكافة أرصدة وممتلكات حساب اللاعب: ${selectedPlayer}`);
          selectPlayerForModeration(selectedPlayer);
          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('خطأ تصفير الحساب', err.message, 'error');
        }
      });
    }

    // DELETE SPECIFIC PLAYER ACCOUNT
    const deletePlayerAccountBtn = document.getElementById('btn-admin-delete-player-account');
    if (deletePlayerAccountBtn) {
      deletePlayerAccountBtn.addEventListener('click', async () => {
        if (!selectedPlayer) return;
        if (!confirm(`⚠️ تحذير نهائي: هل أنت متأكد من حذف وثيقة وحساب اللاعب "${selectedPlayer}" نهائياً من الخوادم؟`)) return;

        try {
          await AppDB.adminDeletePlayer(selectedPlayer);
          showToast('حذف الحساب', `تم حذف حساب اللاعب ${selectedPlayer} نهائياً من قاعدة البيانات.`, 'success');
          logAdminAction(`حذف نهائي لوثيقة حساب اللاعب: ${selectedPlayer}`);

          if (resultCard) resultCard.classList.add('hidden');
          selectedPlayer = null;
          selectedPlayerState = null;
          loadAdminPlayersDirectory(false);
        } catch (err) {
          showToast('خطأ حذف الحساب', err.message, 'error');
        }
      });
    }

    // ─────────────────────────────────────────────
    //  MODULE: LIVE PLAYER ACTIVITY AUDIT LOG
    // ─────────────────────────────────────────────
    const inspectLogsBtn = document.getElementById('btn-admin-inspect-logs');
    const logModal = document.getElementById('admin-player-log-modal');
    const closeLogModalBtn = document.getElementById('btn-admin-close-log-modal');
    const logFeed = document.getElementById('admin-player-log-feed');
    let currentLogFilter = 'all';

    function renderPlayerLogFeed(pState) {
      if (!logFeed) return;
      const logs = (pState && pState.activityLog) || [];
      const filtered = logs.filter(l => currentLogFilter === 'all' || l.category === currentLogFilter);

      if (filtered.length === 0) {
        logFeed.innerHTML = `
          <div class="p-6 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
            <i class="fa-solid fa-clipboard-list text-2xl mb-2 text-slate-600 block"></i>
            <span>لا توجد عمليات مسجلة لهذا اللاعب في هذا التصنيف حتى الآن.</span>
          </div>
        `;
        return;
      }

      logFeed.innerHTML = '';
      filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'p-2.5 bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-between gap-2 transition';

        let icon = '<i class="fa-solid fa-circle-info text-sky-400"></i>';
        let badgeColor = 'bg-sky-500/10 text-sky-400 border-sky-500/20';

        if (item.category === 'business') {
          icon = '<i class="fa-solid fa-briefcase text-emerald-400"></i>';
          badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        } else if (item.category === 'stock') {
          icon = '<i class="fa-solid fa-chart-line text-yellow-400"></i>';
          badgeColor = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        } else if (item.category === 'investment') {
          icon = '<i class="fa-solid fa-vault text-amber-400"></i>';
          badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        } else if (item.category === 'casino') {
          icon = '<i class="fa-solid fa-dice text-purple-400"></i>';
          badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        } else if (item.category === 'blackmarket') {
          icon = '<i class="fa-solid fa-skull-crossbones text-rose-400"></i>';
          badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        } else if (item.category === 'banking') {
          icon = '<i class="fa-solid fa-building-columns text-teal-400"></i>';
          badgeColor = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
        } else if (item.category === 'store') {
          icon = '<i class="fa-solid fa-bag-shopping text-cyan-400"></i>';
          badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
        }

        const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--';

        div.innerHTML = `
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-xs border border-slate-800">
              ${icon}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-white">${item.action}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded border ${badgeColor} font-sans">${item.category}</span>
              </div>
              <div class="text-[11px] text-slate-300 mt-0.5">${item.details}</div>
            </div>
          </div>
          <div class="text-[10px] text-slate-400 font-mono text-left shrink-0">
            ${dateStr}
          </div>
        `;
        logFeed.appendChild(div);
      });
    }

    if (inspectLogsBtn && logModal) {
      inspectLogsBtn.addEventListener('click', async () => {
        const targetUser = (selectedPlayer || document.getElementById('admin-p-username')?.textContent || '').replace(/^@/, '').trim();
        if (!targetUser || targetUser === '...' || targetUser === '') {
          showToast('سجل النشاط', 'يرجى تحديد واختيار لاعب أولاً من قائمة اللاعبين.', 'warning');
          return;
        }
        try {
          const pState = await AppDB.adminGetPlayer(targetUser);
          if (!pState) throw new Error("تعذر جلب بيانات اللاعب.");
          selectedPlayerState = pState;
          document.getElementById('adm-log-modal-username').textContent = `@${targetUser}`;
          document.getElementById('adm-log-stat-worth').textContent = `${(pState.netWorth || 0).toLocaleString()} EGP`;
          document.getElementById('adm-log-stat-cash').textContent = `${((pState.cash || 0) + (pState.bank || 0)).toLocaleString()} EGP`;
          document.getElementById('adm-log-stat-heat').textContent = `${pState.heatLevel || 0} / 5`;
          document.getElementById('adm-log-stat-jail').textContent = (pState.jailTimer > 0) ? `مسجون (${pState.jailTimer}ث)` : 'حر طليق';

          currentLogFilter = 'all';
          renderPlayerLogFeed(pState);
          logModal.classList.remove('hidden');
        } catch (e) {
          showToast('سجل النشاط', e.message, 'error');
        }
      });
    }

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
        const targetUser = (selectedPlayer || document.getElementById('admin-p-username')?.textContent || '').replace(/^@/, '').trim();
        if (!targetUser || targetUser === '...' || targetUser === '') {
          showToast('فحص التدفق', 'يرجى تحديد واختيار لاعب أولاً من قائمة اللاعبين.', 'warning');
          return;
        }

        try {
          const pState = await AppDB.adminGetPlayer(targetUser);
          if (!pState) throw new Error("تعذر جلب بيانات اللاعب.");

          document.getElementById('adm-flow-modal-username').textContent = `@${targetUser}`;

          const originalState = GameEngine.state;
          let grossPerSec = 0;
          let taxPerSec = 0;
          let netPerSec = 0;
          let taxTierName = 'معفى من الضرائب (أقل من 5M EGP)';
          let breakdownItems = [];

          try {
            GameEngine.state = pState;

            let breakdown = null;
            if (typeof GameEngine.getDetailedCashflowBreakdown === 'function') {
              breakdown = GameEngine.getDetailedCashflowBreakdown(pState);
            }

            if (breakdown) {
              grossPerSec = breakdown.totalGrossPerSec || 0;
              taxPerSec = (breakdown.tax && breakdown.tax.taxPerSec) || 0;
              netPerSec = breakdown.totalNetPerSec || 0;

              // 1. Businesses
              if (breakdown.businesses && breakdown.businesses.length > 0) {
                breakdown.businesses.forEach(b => {
                  breakdownItems.push({
                    icon: '🏢',
                    title: `مشروع: ${b.name}`,
                    grossPerSec: b.profitPerSec,
                    detail: `مستوى ${b.level} | ${b.workers || 0} عمال | تسعير: ${(b.price || b.optPrice || 0).toLocaleString()} EGP ${b.isFranchise ? '| 🌟 فرانشايز' : ''}`
                  });
                });
              }

              // 2. Real estate / Assets
              if (breakdown.assets && breakdown.assets.length > 0) {
                breakdown.assets.forEach(a => {
                  breakdownItems.push({
                    icon: '🏛️',
                    title: `عقار: ${a.name} (عدد ${a.count})`,
                    grossPerSec: a.rentPerSec,
                    detail: `عائد إيجار عقاري: +${a.rentPerUnit.toLocaleString()} EGP/ث لكل وحدة`
                  });
                });
              }

              // 3. Cars
              if (breakdown.cars && breakdown.cars.length > 0) {
                breakdown.cars.forEach(c => {
                  breakdownItems.push({
                    icon: '🏎️',
                    title: `تأجير سيارة: ${c.name}`,
                    grossPerSec: c.grossRent,
                    netPerSec: c.netProfitPerSec,
                    detail: `إيجار: +${c.grossRent.toLocaleString()} | صيانة: -${c.maintenance.toLocaleString()} EGP/ث`
                  });
                });
              }

              // 4. Bank Interest
              if (breakdown.bank && breakdown.bank.profitPerSec > 0) {
                breakdownItems.push({
                  icon: '🏦',
                  title: 'عوائد بنكية (فوائد الإيداع)',
                  grossPerSec: breakdown.bank.profitPerSec,
                  detail: `رصيد البنك: ${(breakdown.bank.balance || 0).toLocaleString()} EGP ${breakdown.bank.hasRollsBonus ? '| 🌟 بونص رولز رويس (+5%)' : ''}`
                });
              }

              // 5. Joint Corporation
              if (breakdown.corp && breakdown.corp.active && breakdown.corp.profitPerSec > 0) {
                breakdownItems.push({
                  icon: '🤝',
                  title: `أرباح التحالف: ${breakdown.corp.name}`,
                  grossPerSec: breakdown.corp.profitPerSec,
                  detail: `مستوى الشركة ${breakdown.corp.level} | حصة اللاعب: ${breakdown.corp.sharePct}%`
                });
              }

              // 6. Hired Job
              if (breakdown.hiredJob && breakdown.hiredJob.active && breakdown.hiredJob.salaryPerSec > 0) {
                breakdownItems.push({
                  icon: '💼',
                  title: `عقد عمل خارجي: ${breakdown.hiredJob.name}`,
                  grossPerSec: breakdown.hiredJob.salaryPerSec,
                  detail: `راتب تعاقدي ساري (تم حل اللغز اليومي بنجاح)`
                });
              }

              // Tax Tier / Exemption
              const taxReport = GameEngine.calculateTaxReport ? GameEngine.calculateTaxReport() : null;
              if (breakdown.tax && breakdown.tax.active) {
                taxTierName = (taxReport && taxReport.bracketName) ? taxReport.bracketName : 'شريحة ضريبية مفعلة';
                if (taxReport && taxReport.taxShieldActive) {
                  taxTierName += ' (🛡️ درع ضريبي مفعل)';
                }
              } else {
                taxTierName = (breakdown.tax && breakdown.tax.exemptReason) || 'معفى من الضرائب (أقل من 5M EGP أو محمي بحاجز السيولة)';
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
          document.getElementById('adm-flow-summary-gross').textContent = `${grossPerSec.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;
          document.getElementById('adm-flow-summary-gross-hour').textContent = `${(grossPerSec * 3600).toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP / ساعة`;

          document.getElementById('adm-flow-summary-tax').textContent = `${taxPerSec.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;
          document.getElementById('adm-flow-summary-tax-rate').textContent = taxTierName;

          document.getElementById('adm-flow-summary-net').textContent = `${netPerSec.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} EGP/ث`;
          document.getElementById('adm-flow-summary-net-hour').textContent = `${(netPerSec * 3600).toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP / ساعة`;

          // Populate Breakdown Items List
          const container = document.getElementById('adm-flow-breakdown-container');
          if (container) {
            container.innerHTML = '';
            if (breakdownItems.length === 0) {
              container.innerHTML = `
                <div class="p-6 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                  <i class="fa-solid fa-hourglass-empty text-2xl mb-2 text-slate-600 block"></i>
                  <span>اللاعب لا يمتلك أي مشاريع أو وظائف أو أصول مدرة للدخل حالياً.</span>
                </div>
              `;
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
                    <span class="text-[10px] text-slate-400">${((item.grossPerSec || 0) * 60).toLocaleString(undefined, { maximumFractionDigits: 0 })} / د</span>
                  </div>
                `;
                container.appendChild(row);
              });
            }
          }

          flowModal.classList.remove('hidden');
        } catch (err) {
          showToast('فحص التدفق', err.message, 'error');
        }
      });
    }

    // --- Comprehensive Forensic & Security Audit Engine ---
    let lastAuditResult = null;
    let lastAuditTargetUser = null;
    let activeAuditFilter = 'all';

    async function performAccountAudit(p, username = '') {
      const findings = [];
      let score = 100;
      const targetUser = (username || p.username || '').replace(/^@/, '').trim();

      // Official Game Constants (Exact match with game.js)
      const ASSETS_MAP = {
        apartment: { name: 'شقة سكنية مؤجرة', cost: 250000, rent: 85 },
        office: { name: 'مبنى مكاتب تجارية', cost: 1600000, rent: 520 },
        mansion: { name: 'قصر ريفي فاخر', cost: 7200000, rent: 2400 },
        skyline_tower: { name: 'برج ناطحة سحاب تجاري', cost: 35000000, rent: 11500 },
        luxury_resort: { name: 'منتجع وفندق سياحي 5 نجوم', cost: 160000000, rent: 52000 },
        mega_yacht: { name: 'يخت ملكي فاخر خاص', cost: 650000000, rent: 210000 },
        private_island: { name: 'جزيرة استوائية خاصة', cost: 2400000000, rent: 750000 },
        orbital_station: { name: 'محطة مدارية فضائية خاصة', cost: 9200000000, rent: 3000000 }
      };

      const STOCKS_MAP = {
        COMI: { name: 'البنك التجاري الدولي', basePrice: 38, maxShares: 50000 },
        EAST: { name: 'الشرقية للدخان', basePrice: 85, maxShares: 30000 },
        ETEL: { name: 'المصرية للاتصالات', basePrice: 48, maxShares: 40000 },
        FWRY: { name: 'فوري للمدفوعات الإلكترونية', basePrice: 92, maxShares: 25000 },
        CASH: { name: 'صندوق الاستثمار التقني البديل', basePrice: 125, maxShares: 20000 },
        BITC: { name: 'مؤشر البيتكوين والأصول الرقمية', basePrice: 310, maxShares: 5000 },
        GOLD: { name: 'صندوق سبائك الذهب الخالص', basePrice: 220, maxShares: 10000 },
        AIX: { name: 'صندوق الذكاء الاصطناعي العالمي', basePrice: 380, maxShares: 8000 }
      };

      const CAR_MAP = {
        lambo: { name: 'Lamborghini Aventador 🏎️', cost: 15000000, rentPerSec: 10000 },
        rolls: { name: 'Rolls-Royce Phantom 👑', cost: 40000000, rentPerSec: 38000 },
        shelby: { name: 'Shelby Cobra 1965 🌟', cost: 120000000, rentPerSec: 145000 }
      };

      const JOBS_MAP = {
        worker: { name: 'عامل باليومية', xpNeeded: 0, salary: 6 },
        cashier: { name: 'محاسب صندوق', xpNeeded: 180, salary: 14 },
        accountant: { name: 'محاسب مالي قانوني', xpNeeded: 600, salary: 45 },
        manager: { name: 'مدير فرع وتطوير', xpNeeded: 2200, salary: 130 },
        director: { name: 'مدير تنفيذي للمجموعة', xpNeeded: 6500, salary: 350 },
        ceo: { name: 'رئيس مجلس الإدارة', xpNeeded: 18000, salary: 980 },
        consultant: { name: 'مستشار اقتصادي ووزير سابق', xpNeeded: 45000, salary: 2600 },
        bank_governor: { name: 'محافظ البنك المركزي', xpNeeded: 110000, salary: 6800 },
        sovereign_head: { name: 'رئيس المجلس الاقتصادي الأعلى 👑', xpNeeded: 250000, salary: 18000 },
        minister: { name: 'وزير المالية والاقتصاد السيادي 🏛️', xpNeeded: 500000, salary: 45000 }
      };

      const BIZ_MAP = {
        coffee: { name: 'عربة قهوة مختصة', baseProfitPerSec: 20 },
        supermarket: { name: 'سلسلة سوبرماركت وتجزئة', baseProfitPerSec: 180 },
        tech: { name: 'شركة برمجيات', baseProfitPerSec: 850 },
        logistics: { name: 'مجمع خدمات لوجستية وشحن', baseProfitPerSec: 2800 },
        solar_factory: { name: 'مصنع ألواح الطاقة الشمسية', baseProfitPerSec: 12000 },
        private_hospital: { name: 'مستشفى ومجمع طبي تخصصي', baseProfitPerSec: 52000 },
        media_studio: { name: 'مؤسسة إنتاج إعلامي وسينمائي', baseProfitPerSec: 210000 },
        private_bank: { name: 'بنك استثماري وشركة وساطة', baseProfitPerSec: 850000 },
        oil_refinery: { name: 'مجمع مصافي البترول والطاقة', baseProfitPerSec: 3200000 },
        space_tech: { name: 'مؤسسة استكشاف الفضاء', baseProfitPerSec: 15000000 }
      };

      // 1. LIQUIDITY & RAW BALANCES
      const cash = Number(p.cash || 0);
      const bank = Number(p.bank || 0);
      const dirty = Number(p.dirtyCash || p.dirty_cash || 0);
      const totalLiquid = cash + bank + dirty;
      const recordedWorth = Number(p.netWorth || p.net_worth || 0);
      const xp = Number(p.xp || 0);
      const jobId = p.jobId || p.job_id || 'worker';
      const rep = Number(p.underworldRep || 0);

      // 2. REAL ESTATE ASSETS
      let realEstateVal = 0;
      let totalAssetUnits = 0;
      let realEstateRentPerSec = 0;
      const assets = (typeof p.assets === 'object' && p.assets) ? p.assets : {};
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
      const stocks = (typeof p.stocks === 'object' && p.stocks) ? p.stocks : {};
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
      const bizData = (typeof p.businesses === 'object' && p.businesses) ? p.businesses : {};
      Object.keys(bizData).forEach(bKey => {
        const b = bizData[bKey];
        if (b && typeof b === 'object' && b.level > 0) {
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
          if (c.rentStatus === 'rented') {
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
        if (typeof AppDB !== 'undefined' && AppDB.getPlayerTransfers && targetUser) {
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
      const topSenderSummary = topSenders.length > 0 ? `${topSenders[0][0]} (+${topSenders[0][1].toLocaleString()} EGP)` : 'لا يوجد';

      // ─────────────────────────────────────────────
      //  SECTOR AUDITS & FINDINGS
      // ─────────────────────────────────────────────

      // VECTOR 1: EXACT MATHEMATICAL NET WORTH
      if (variancePct <= 3.0 || varianceAbs <= 15000000) {
        findings.push({
          vector: 'wealth',
          type: 'success',
          badge: 'مطابق تماماً 🟢',
          title: 'مطابقة صافي الثروة دقيقة وسليمة رياضياً 100%',
          metrics: `المسجل: ${recordedWorth.toLocaleString()} EGP | المحسوب: ${calculatedWorth.toLocaleString()} EGP (نسبة التطابق: ${(100 - Math.min(100, variancePct)).toFixed(2)}%)`,
          desc: `تتطابق ثروة اللاعب المسجلة تماماً مع إجمالي السيولة النقدية (${totalLiquid.toLocaleString()} EGP) + الأصول العقارية (${realEstateVal.toLocaleString()} EGP) + الأسهم (${stocksVal.toLocaleString()} EGP) + الاستثمارات (${investmentsVal.toLocaleString()} EGP).`,
          recommendation: 'الحساب سليم بنكياً ومطابق للمعادلة المحاسبية الرسمية للعبة.'
        });
      } else if (variancePct <= 10.0 || varianceAbs <= 100000000) {
        findings.push({
          vector: 'wealth',
          type: 'warning',
          badge: 'تفاوت اعتيادي 🟡',
          title: 'تفاوت طفيف ناتج عن أرباح التدفق اللحظي أو تقلبات البورصة',
          metrics: `المسجل: ${recordedWorth.toLocaleString()} EGP | المحسوب: ${calculatedWorth.toLocaleString()} EGP | الفارق: ${worthVariance > 0 ? '+' : ''}${worthVariance.toLocaleString()} EGP (${variancePct.toFixed(2)}%)`,
          desc: 'فارق طبيعي يحدث عند تراكم الأرباح اللحظية قبل لحظات الحفظ السحابي، أو نتيجة تقلبات أسعار الأسهم اللحظية.',
          recommendation: 'الحساب سليم، ويمكن عمل معايرة دورية إذا رغبت في المزامنة الدقيقة.'
        });
        score -= 5;
      } else {
        findings.push({
          vector: 'wealth',
          type: 'danger',
          badge: 'فارق ثروة غير مدعوم 🔴',
          title: 'فارق شاسع بين صافي الثروة والأصول المسجلة',
          metrics: `المسجل: ${recordedWorth.toLocaleString()} EGP | المحسوب: ${calculatedWorth.toLocaleString()} EGP | الفارق غير المغطى: ${worthVariance > 0 ? '+' : ''}${worthVariance.toLocaleString()} EGP (${variancePct.toFixed(1)}%)`,
          desc: `يوجد فارق ملحوظ بنسبة ${variancePct.toFixed(1)}% بين الثروة المسجلة في الحساب والأصول والسيولة الفعلية التي يمتلكها.`,
          recommendation: 'استخدم زر "إعادة معايرة وضبط صافي الثروة تلقائياً" لمطابقة الثروة مع الموجودات الحقيقية.'
        });
        score -= 25;
      }

      // VECTOR 2: WIRE TRANSFERS & CAPITAL INFLUX
      if (totalReceived > 0 || totalSent > 0) {
        const netTransferFlow = totalReceived - totalSent;
        findings.push({
          vector: 'transfers',
          type: 'success',
          badge: 'موثق بالتحويلات 🟢',
          title: 'حركة الحوالات والتحويلات البنكية المعتمدة',
          metrics: `استلم: +${totalReceived.toLocaleString()} EGP (${incomingTransfers.length} حوالة) | أرسل: -${totalSent.toLocaleString()} EGP (${outgoingTransfers.length} حوالة) | أبرز الممولين: ${topSenderSummary}`,
          desc: `تم تدقيق السجل المصرفي بنجاح. سيولة وثروة اللاعب مدعومة بحوالات بنكية قانونية من لاعبين آخرين مسجلة في قاعدة بيانات البنك المركزي.`,
          recommendation: 'حركة التحويلات المالية نظامية ولا تشوبها شبهات غسيل أموال وهمية.'
        });
      } else {
        findings.push({
          vector: 'transfers',
          type: 'success',
          badge: 'حساب معتمد ذاتياً 🟢',
          title: 'لا توجد حوالات خارجية واردة أو صادرة',
          metrics: 'إجمالي الحوالات: 0 EGP (0 تحويلات مسجلة)',
          desc: 'يعتمد اللاعب بالكامل على نموه الذاتي من أرباح مشاريعه وأصوله ولم يستلم أي تمويل خارجي من لاعبين آخرين.',
          recommendation: 'الحساب مستقل مالياً ونظيف تماماً.'
        });
      }

      // VECTOR 3: BUSINESSES & OPERATIONAL CASHFLOW
      if (activeBizCount > 0) {
        findings.push({
          vector: 'businesses',
          type: 'success',
          badge: 'إنتاج نشط 🟢',
          title: 'إمبراطورية مشاريع تجارية نشطة ذات دخل تشغيلي حقيقي',
          metrics: `${activeBizCount} مشاريع نشطة (${totalBizLevels} ترقية) • ${franchiseCount} علامة تجارية مسجلة | الدخل التشغيلي: +${totalBizIncomePerMin.toLocaleString()} EGP/د (+${totalIncomePerSec.toLocaleString()} EGP/ث)`,
          desc: 'يمتلك الحساب مصانع وشركات مرخصة تضخ سيولة متدفقة مستمرة تبرر نمو ثروته وتراكم أرصدته البنكية.',
          recommendation: 'المشاريع تعمل بانتظام دون أي شذوذ في معدلات الدخل.'
        });
      } else {
        if (totalLiquid > 100000000 && totalReceived < 50000000) {
          findings.push({
            vector: 'businesses',
            type: 'danger',
            badge: 'سيولة غير مبررة 🔴',
            title: 'تضخم السيولة النقدية مع انعدام المشاريع والحوالات الكافية',
            metrics: `السيولة: ${totalLiquid.toLocaleString()} EGP | المشاريع: 0 | الحوالات المستلمة: ${totalReceived.toLocaleString()} EGP`,
            desc: 'يمتلك اللاعب رصيد سيولة ضخم يفوق 100 مليون بدون امتلاك مشاريع إنتاجية ودون تلقي حوالات تغطي هذا الرصيد.',
            recommendation: 'التحقق من سجل نشاط اللاعب وفحص مصدر السيولة.'
          });
          score -= 25;
        } else {
          findings.push({
            vector: 'businesses',
            type: 'warning',
            badge: 'حساب مبتدئ 🟡',
            title: 'حساب بدون مشاريع تجارية خاصة',
            metrics: `عدد المشاريع: 0 | الدخل الذاتي: ${totalIncomePerSec.toLocaleString()} EGP/ث`,
            desc: 'اللاعب لا يمتلك أي شركات تجارية بعد، ويعتمد على الوظيفة أو المساعدات البنكية.',
            recommendation: 'طبيعي للاعبين في المراحل الأولى من اللعبة.'
          });
        }
      }

      // VECTOR 4: LUXURY FLEET & CARS
      if (ownedCars.length > 0) {
        const rentedCount = ownedCars.filter(c => c.rentStatus === 'rented').length;
        findings.push({
          vector: 'cars',
          type: 'success',
          badge: 'أسطول معتمد 🟢',
          title: 'أسطول السيارات الفارهة والاستثمار التأجيري',
          metrics: `${ownedCars.length} سيارات فارهة مسجلة بقيمة ${totalCarsVal.toLocaleString()} EGP (${rentedCount} سيارة قيد التأجير) | صافي دخل التأجير: +${carsRentPerSec.toLocaleString()} EGP/ث`,
          desc: 'سيارات فاخرة ونادرة مسجلة بملفات الحساب وتساهم في رفع الدخل والأرباح الدورية.',
          recommendation: 'حالة أسطول السيارات سليمة تماماً.'
        });
      } else {
        findings.push({
          vector: 'cars',
          type: 'success',
          badge: 'سليم 🟢',
          title: 'لا يمتلك أسطول سيارات فارهة حالياً',
          metrics: 'عدد السيارات المملوكة: 0',
          desc: 'اللاعب لم يقم بشراء سيارات فارهة من المعرض حتى الآن.',
          recommendation: 'سليم 100%.'
        });
      }

      // VECTOR 5: STOCK MARKET TRADING & PORTFOLIO
      if (stockLimitViolations.length > 0) {
        findings.push({
          vector: 'stocks',
          type: 'danger',
          badge: 'تجاوز حدود الأسهم 🔴',
          title: 'تجاوز الحد الأقصى القانوني المسموح به لأسهم البورصة',
          metrics: stockLimitViolations.join(' • '),
          desc: 'يمتلك اللاعب كميات أسهم تتجاوز السقف المحدد لكل شركة في نظام التداول.',
          recommendation: 'استخدم إعادة ضبط الأسهم لإعادة الكمية للحد القانوني.'
        });
        score -= 25;
      } else if (totalStocksCount > 0) {
        findings.push({
          vector: 'stocks',
          type: 'success',
          badge: 'محفظة متزنة 🟢',
          title: 'محفظة تداول الأسهم متوافقة مع ضوابط البورصة',
          metrics: `إجمالي الأسهم: ${totalStocksCount.toLocaleString()} سهم بقيمة ${stocksVal.toLocaleString()} EGP عبر ${Object.keys(stocks).filter(k => stocks[k].shares > 0).length} شركات`,
          desc: 'كافة صفقات الأسهم المحتفظ بها ضمن الأسقف المسموحة وبأسعار البورصة المعتمدة.',
          recommendation: 'سجل تداول الأسهم نظامي وخالٍ من التلاعب.'
        });
      } else {
        findings.push({
          vector: 'stocks',
          type: 'success',
          badge: 'سليم 🟢',
          title: 'لا توجد تداولات أسهم مسجلة حالياً',
          metrics: 'محفظة الأسهم فارغة',
          desc: 'اللاعب لم يقم بشراء أسهم في سوق البورصة.',
          recommendation: 'سليم.'
        });
      }

      // VECTOR 6: CAREER PROGRESSION & XP INTEGRITY
      const jobInfo = JOBS_MAP[jobId] || { name: p.title || 'عامل مبتدئ', xpNeeded: 0 };
      if (xp < (jobInfo.xpNeeded * 0.5) && jobInfo.xpNeeded > 1000) {
        findings.push({
          vector: 'career',
          type: 'danger',
          badge: 'رتبة غير شرعية 🔴',
          title: 'ترقية وظيفية لا تتناسب مع ساعات ونقاط الخبرة',
          metrics: `الوظيفة الحالية: ${jobInfo.name} | نقاط الخبرة: ${xp.toLocaleString()} XP (المطلوب نظامياً: ${jobInfo.xpNeeded.toLocaleString()} XP)`,
          desc: 'تم ترقية الرتبة الوظيفية دون جمع نقاط الخبرة الكافية المطلوبة لهذا المنصب الرفيع.',
          recommendation: 'تعديل المسمى والوظيفة بما يتطابق مع نقاط الـ XP المتاحة.'
        });
        score -= 20;
      } else {
        findings.push({
          vector: 'career',
          type: 'success',
          badge: 'سليم ومطابق 🟢',
          title: 'المسار المهني ونقاط الخبرة متطابقة نظامياً',
          metrics: `المسمى: ${p.title || jobInfo.name} | نقاط الخبرة: ${xp.toLocaleString()} XP (الحد الأدنى المطلوب: ${jobInfo.xpNeeded.toLocaleString()} XP)`,
          desc: 'الرتبة الوظيفية وساعات العمل المنجزة تتوافق تماماً مع نظام الترقيات المعتمد.',
          recommendation: 'المسار المهني سليم 100%.'
        });
      }

      // VECTOR 7: UNDERWORLD, SMUGGLING & DIRTY CASH
      const fleet = (typeof p.smugglingFleet === 'object' && p.smugglingFleet) ? p.smugglingFleet : {};
      const totalFleet = Number(fleet.ship || 0) + Number(fleet.plane || 0) + Number(fleet.speedboat || 0);
      if (dirty > 50000000 && totalFleet === 0 && rep < 5) {
        findings.push({
          vector: 'underworld',
          type: 'danger',
          badge: 'كاش قذر مجهول 🔴',
          title: 'تضخم كاش قذر ضخم بدون امتلاك أسطول تهريب',
          metrics: `كاش قذر: ${dirty.toLocaleString()} EGP | أسطول التهريب: 0 مركبات | السمعة: ${rep} Rep`,
          desc: 'أموال سوداء غير مبررة تفوق 50 مليون دون امتلاك أدوات تهريب تدعم هذه المبالغ.',
          recommendation: 'استخدم زر "تصفير الكاش القذر والـ Heat" لحذف الأموال المشبوهة.'
        });
        score -= 20;
      } else if (dirty > 0 || (p.heatLevel || 0) > 0) {
        findings.push({
          vector: 'underworld',
          type: 'warning',
          badge: 'نشاط تهريب 🟡',
          title: 'نشاط في السوق السوداء ومستوى ملاحقة أمني',
          metrics: `كاش قذر: ${dirty.toLocaleString()} EGP | أسطول التهريب: ${fleet.ship || 0} سفن، ${fleet.plane || 0} طائرات، ${fleet.speedboat || 0} لنشات | Heat: ${p.heatLevel || 0}/5 | حالة السجن: ${p.jailTimer > 0 ? 'مسجون' : 'حر طليق'}`,
          desc: 'يمارس اللاعب أنشطة تهريب قانونية وفق ميكانيكا اللعبة، وعليه رصيد كاش قذر يتطلب غسيل أموال.',
          recommendation: 'متابعة عمليات غسيل الأموال في الكازينو ومكاتب الصرافة.'
        });
        score -= 5;
      } else {
        findings.push({
          vector: 'underworld',
          type: 'success',
          badge: 'نظيف تماماً 🟢',
          title: 'السجل الجنائي والأموال نظيفة بالكامل 100%',
          metrics: `كاش قذر: 0 EGP | أسطول التهريب: ${totalFleet} مركبات | مستوى Heat: 0/5`,
          desc: 'لا توجد أي أموال قذرة معلقة أو سجل ملاحقة شرطية نشط.',
          recommendation: 'الحساب نظيف تماماً وخالٍ من المخالفات.'
        });
      }

      // VECTOR 8: BANKING LOANS & CREDIT RISK
      const loanAmt = (typeof p.activeLoan === 'object' && p.activeLoan)
        ? Number(p.activeLoan.amount || p.activeLoan.principal || 0)
        : Number(p.activeLoan || p.bankLoan || 0);
      const debtRatio = calculatedWorth > 0 ? ((loanAmt / calculatedWorth) * 100) : 0;

      if (loanAmt === 0) {
        findings.push({
          vector: 'loans',
          type: 'success',
          badge: 'خالٍ من الديون 🟢',
          title: 'الجدارة الائتمانية ممتازة والذمة المالية بريئة تماماً',
          metrics: 'لا توجد قروض بنكية معلقة أو التزامات سداد قائمة',
          desc: 'الحساب لا يعاني من أي مديونيات بنكية أو مخاطر تعثر مالي.',
          recommendation: 'الحالة الائتمانية ممتازة.'
        });
      } else if (debtRatio > 70 && loanAmt > 10000000) {
        findings.push({
          vector: 'loans',
          type: 'warning',
          badge: 'مخاطر ائتمانية 🟡',
          title: 'ارتفاع نسبة المديونية والقروض البنكية المعلقة',
          metrics: `قرض بنكي مستحق: ${loanAmt.toLocaleString()} EGP | نسبة الدين إلى الثروة: ${debtRatio.toFixed(1)}%`,
          desc: 'الديون تستهلك نسبة كبيرة من رأس مال اللاعب، مما يعرضه لمخاطر التعثر أو مصادرة الأصول.',
          recommendation: 'مطالبة اللاعب بجدولة وسداد القرض البنكي.'
        });
        score -= 10;
      } else {
        findings.push({
          vector: 'loans',
          type: 'success',
          badge: 'قرض منتظم 🟢',
          title: 'تسهيلات ائتمانية بنكية منتظمة وقابلة للسداد',
          metrics: `قيمة القرض: ${loanAmt.toLocaleString()} EGP | نسبة التغطية: ${(100 - debtRatio).toFixed(1)}% أصول حرة`,
          desc: 'القرض البنكي مغطى بأصول وسيولة ممتازة ولا يشكل أي خطورة ائتمانية.',
          recommendation: 'سليم.'
        });
      }

      // VECTOR 9: CASINO & BETTING AUDIT
      const casinoStats = (typeof p.casinoStats === 'object' && p.casinoStats) ? p.casinoStats : {};
      const casinoWins = Number(casinoStats.totalWon || 0);
      const casinoBets = Number(casinoStats.totalBets || 0);
      if (casinoWins > 500000000 && casinoBets < 5) {
        findings.push({
          vector: 'casino',
          type: 'danger',
          badge: 'شبهة تلاعب 🔴',
          title: 'شبهة استغلال ثغرة في الكازينو (Win Streaks Exploit)',
          metrics: `أرباح الكازينو: ${casinoWins.toLocaleString()} EGP عبر ${casinoBets} مراهنة فقط`,
          desc: 'معدل أرباح كازينو مستحيل إحصائياً يشير إلى تلاعب بالنتائج المحلية أو ثغرة برمجية.',
          recommendation: 'خصم أرباح الكازينو غير المبررة.'
        });
        score -= 20;
      } else {
        findings.push({
          vector: 'casino',
          type: 'success',
          badge: 'سليم 🟢',
          title: 'إحصائيات الكازينو والمراهنات طبيعية',
          metrics: `إجمالي الرهانات: ${casinoBets} | إجمالي الأرباح: ${casinoWins.toLocaleString()} EGP`,
          desc: 'لا توجد أنماط فوز شاذة أو استخدام أدوات تكرار غير مصرح بها.',
          recommendation: 'نشاط الكازينو ضمن المعدلات الإحصائية المعتادة.'
        });
      }

      // FINAL SCORE & VERDICT
      score = Math.max(0, Math.min(100, score));
      let status = 'آمن وموثوق تماماً 🟢';
      let badgeClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';

      if (score < 40) {
        status = 'حساب مخترق / متلاعب به بشدة 🔴';
        badgeClass = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      } else if (score < 70) {
        status = 'شبهة اختلال مالي وشذوذ رقمي 🟠';
        badgeClass = 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      } else if (score < 90) {
        status = 'تحت الملاحظة وتدقيق دوري 🟡';
        badgeClass = 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
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

    function renderAuditReportCards(findings, filter = 'all') {
      const reportBody = document.getElementById('audit-report-body');
      if (!reportBody) return;

      const filtered = filter === 'all' ? findings : findings.filter(f => f.vector === filter);

      if (filtered.length === 0) {
        reportBody.innerHTML = '<div class="p-6 text-center text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800">لا توجد ملاحظات في هذا القسم.</div>';
        return;
      }

      reportBody.innerHTML = filtered.map(f => {
        let borderClass = 'border-emerald-500/30 bg-emerald-950/15';
        let titleColor = 'text-emerald-300';
        let badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

        if (f.type === 'warning') {
          borderClass = 'border-yellow-500/30 bg-yellow-950/15';
          titleColor = 'text-yellow-300';
          badgeStyle = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
        } else if (f.type === 'danger') {
          borderClass = 'border-rose-500/40 bg-rose-950/25';
          titleColor = 'text-rose-300';
          badgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
        }

        return `
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
          </div>
        `;
      }).join('');
    }

    const fraudCheckBtn = document.getElementById('btn-admin-fraud-check');
    const auditModal = document.getElementById('admin-audit-modal');
    const closeAuditBtn = document.getElementById('btn-close-admin-audit');
    const closeAuditFooterBtn = document.getElementById('btn-close-admin-audit-footer');

    if (fraudCheckBtn && auditModal) {
      fraudCheckBtn.addEventListener('click', async () => {
        const targetUser = (selectedPlayer || document.getElementById('admin-p-username')?.textContent || '').replace(/^@/, '').trim();
        if (!targetUser || targetUser === '...' || targetUser === '') {
          showToast('فحص الأمان', 'يرجى تحديد واختيار لاعب أولاً من قائمة اللاعبين.', 'warning');
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
            safetyBadge.className = `px-2.5 py-1 rounded-lg font-bold text-xs ${report.badgeClass}`;
          }

          // KPI 1: Score
          const scoreEl = document.getElementById('audit-kpi-score');
          const scoreBar = document.getElementById('audit-kpi-score-bar');
          if (scoreEl) scoreEl.textContent = `${report.score}%`;
          if (scoreBar) {
            scoreBar.style.width = `${report.score}%`;
            scoreBar.className = `h-full transition-all duration-500 ${report.score >= 80 ? 'bg-emerald-500' : report.score >= 50 ? 'bg-yellow-500' : 'bg-rose-500'}`;
          }

          // KPI 2: Worth diff
          const worthDiffEl = document.getElementById('audit-kpi-worth-diff');
          const worthSubEl = document.getElementById('audit-kpi-worth-sub');
          const variancePct = report.calculatedWorth > 0 ? ((Math.abs(report.worthVariance) / report.calculatedWorth) * 100) : 0;
          if (worthDiffEl) {
            if (variancePct <= 3.0 || Math.abs(report.worthVariance) < 15000000) {
              worthDiffEl.textContent = `مطابق تماماً ⚖️ (${(100 - Math.min(100, variancePct)).toFixed(1)}%)`;
              worthDiffEl.className = 'numbers-font font-black text-emerald-400 text-xs';
            } else {
              worthDiffEl.textContent = `${report.worthVariance > 0 ? '+' : ''}${report.worthVariance.toLocaleString()} EGP (${variancePct.toFixed(1)}%)`;
              worthDiffEl.className = `numbers-font font-black ${variancePct > 10 ? 'text-rose-400' : 'text-yellow-400'} text-xs`;
            }
          }
          if (worthSubEl) {
            worthSubEl.textContent = `مسجل: ${report.recordedWorth.toLocaleString()} | فعلي: ${report.calculatedWorth.toLocaleString()}`;
          }

          // KPI 3: Cashflow
          const incomeEl = document.getElementById('audit-kpi-income');
          const bizCountEl = document.getElementById('audit-kpi-biz-count');
          if (incomeEl) incomeEl.textContent = `+${report.totalBizIncomePerMin.toLocaleString()} EGP / د`;
          if (bizCountEl) bizCountEl.textContent = `${report.activeBizCount} مشاريع نشطة`;

          // KPI 4: Underworld
          const dirtyEl = document.getElementById('audit-kpi-dirty');
          const heatEl = document.getElementById('audit-kpi-heat');
          if (dirtyEl) dirtyEl.textContent = `${report.dirty.toLocaleString()} EGP`;
          if (heatEl) heatEl.textContent = `Heat: ${report.heat}/5`;

          // Render findings cards
          activeAuditFilter = 'all';
          renderAuditReportCards(report.findings, 'all');

          auditModal.classList.remove('hidden');
          showToast('فحص الأمان الشامل', `تم تدقيق حساب ${targetUser} بنجاح — مؤشر النزاهة: ${report.score}%`, 'info');

        } catch (e) {
          showToast('خطأ فحص الأمان', e.message, 'error');
        } finally {
          fraudCheckBtn.disabled = false;
        }
      });
    }

    // Filter Tabs Click Handlers
    document.querySelectorAll('.audit-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.audit-filter-btn').forEach(b => {
          b.classList.remove('bg-rose-500/20', 'text-rose-300', 'border', 'border-rose-500/40');
          b.classList.add('bg-slate-900', 'text-slate-400');
        });
        btn.classList.add('bg-rose-500/20', 'text-rose-300', 'border', 'border-rose-500/40');
        btn.classList.remove('bg-slate-900', 'text-slate-400');

        activeAuditFilter = btn.dataset.filter || 'all';
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
        if (!confirm(`هل تريد إعادة ضبط ومعايرة صافي الثروة للاعب "${lastAuditTargetUser}" إلى القيمة المحسوبة الفعلية (${newWorth.toLocaleString()} EGP)؟`)) return;

        try {
          btnRecalibrateWorth.disabled = true;
          await AppDB.adminSetPlayerState(lastAuditTargetUser, { netWorth: newWorth });
          showToast('معايرة الثروة ⚖️', `تم تصحيح وضبط صافي ثروة ${lastAuditTargetUser} إلى ${newWorth.toLocaleString()} EGP بنجاح.`, 'success');
          logAdminAction(`إعادة معايرة وتصحيح صافي ثروة ${lastAuditTargetUser} إلى ${newWorth}`);
          
          // Re-trigger audit to reflect update
          fraudCheckBtn?.click();
        } catch (e) {
          showToast('فشل المعايرة', e.message, 'error');
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
        if (!confirm(`هل تريد تصفير الكاش القذر ومستوى الملاحقة Heat للاعب "${lastAuditTargetUser}" بالكامل؟`)) return;

        try {
          btnClearDirty.disabled = true;
          await AppDB.adminSetPlayerState(lastAuditTargetUser, { dirtyCash: 0, heatLevel: 0, jailTimer: 0 });
          showToast('تطهير الحساب 🧼', `تم تصفير الكاش القذر والـ Heat للاعب ${lastAuditTargetUser} بنجاح.`, 'success');
          logAdminAction(`تصفير الكاش القذر والـ Heat للاعب ${lastAuditTargetUser}`);

          // Re-trigger audit to reflect update
          fraudCheckBtn?.click();
        } catch (e) {
          showToast('فشل التطهير', e.message, 'error');
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
          b.className = 'btn-log-filter px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg font-bold transition';
        });
        btn.className = 'btn-log-filter px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg font-bold transition';
        currentLogFilter = btn.getAttribute('data-log-filter') || 'all';
        if (selectedPlayerState) renderPlayerLogFeed(selectedPlayerState);
      });
    });

    // ─────────────────────────────────────────────
    //  MODULE: MARKET CONTROL & DIRECT PRICING
    // ─────────────────────────────────────────────
    function renderAdminStockPrices() {
      const symbols = ['COMI', 'EAST', 'ETEL', 'FWRY', 'CASH', 'BITC', 'GOLD', 'AIX'];
      symbols.forEach(sym => {
        const priceEl = document.getElementById(`adm-stock-price-${sym}`);
        if (priceEl && GameEngine.stockPrices[sym]) {
          const p = GameEngine.stockPrices[sym][GameEngine.stockPrices[sym].length - 1];
          priceEl.textContent = `${p.toLocaleString()} EGP`;
        }
      });
    }

    // Custom Stock Market Event Broadcast & Impact Controller
    const broadcastCustomEventBtn = document.getElementById('btn-admin-broadcast-custom-event');
    if (broadcastCustomEventBtn) {
      broadcastCustomEventBtn.addEventListener('click', () => {
        const titleInput = document.getElementById('adm-custom-news-title');
        const symbolSelect = document.getElementById('adm-custom-stock-select');
        const directionSelect = document.getElementById('adm-custom-stock-direction');
        const pctInput = document.getElementById('adm-custom-stock-pct');

        let rawTitle = (titleInput ? titleInput.value.trim() : '');
        const targetSymbol = symbolSelect ? symbolSelect.value : 'ALL';
        const direction = directionSelect ? directionSelect.value : 'up';
        const pctVal = pctInput ? Math.max(1, Math.min(500, parseFloat(pctInput.value) || 25)) : 25;
        const multiplier = direction === 'up' ? (1 + pctVal / 100) : Math.max(0.05, 1 - pctVal / 100);
        const isUp = direction === 'up';

        // Auto-generate title if empty
        if (!rawTitle) {
          if (targetSymbol === 'ALL') {
            rawTitle = isUp
              ? `انتعاش عام وموجة صعود قياسية لكافة الأسهم (+${pctVal}%)`
              : `تصحيح هبوطي وموجة بيع وضغط على كافة الأسهم (-${pctVal}%)`;
          } else {
            const stockName = GameEngine.STOCKS[targetSymbol]?.name || targetSymbol;
            rawTitle = isUp
              ? `أرباح قياسية وإقبال استثماري يرفع سهم ${stockName} (+${pctVal}%)`
              : `ضغوط بيعية وتراجع في أداء سهم ${stockName} (-${pctVal}%)`;
          }
        }
        const icon = isUp ? '📈' : '📉';
        const formattedTicker = `${icon} عاجل من البورصة: ${rawTitle}`;

        const targets = {};
        if (targetSymbol === 'ALL') {
          Object.keys(GameEngine.STOCKS).forEach(s => targets[s] = multiplier);
        } else {
          targets[targetSymbol] = multiplier;
        }

        if (AppDB.isFirebaseReady) {
          try {
            firebase.firestore().collection('globals').doc('market_event').set({
              title: formattedTicker,
              desc: rawTitle,
              targets: targets,
              timestamp: Date.now()
            }).then(() => {
              logAdminAction(`إطلاق خبر بورصة مخصص: "${rawTitle}" [${targetSymbol} | ${isUp ? '+' : '-'}${pctVal}%]`);
            }).catch(() => { });
          } catch (e) { }
        } else {
          showToast('إطلاق الخبر', 'يجب الاتصال بقاعدة البيانات لنشر أحداث البورصة.', 'error');
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
            title: 'صناديق استثمارية سيادية تبدأ الشراء المباشر للبيتكوين!',
            symbol: 'BITC',
            dir: 'up',
            pct: 50
          },
          gold_rally: {
            title: 'إقبال استثماري عالمي للتحوط بسبائك الذهب عيار 24!',
            symbol: 'GOLD',
            dir: 'up',
            pct: 35
          },
          tech_boom: {
            title: 'إطلاق نموذج ذكاء اصطناعي خارق يحقق أرباحاً قياسية لشركات التقنية!',
            symbol: 'AIX',
            dir: 'up',
            pct: 35
          },
          cbe_rate_hike: {
            title: 'البنك المركزي يرفع الفائدة 200 نقطة لدعم القطاع المصرفي!',
            symbol: 'COMI',
            dir: 'up',
            pct: 30
          },
          telecom_expansion: {
            title: 'المصرية للاتصالات تفوز بعقد حصري لتمرير كابلات البيانات البحرية ورخصة 5G!',
            symbol: 'ETEL',
            dir: 'up',
            pct: 35
          },
          tobacco_monopoly: {
            title: 'توقيع عقد تصدير احتكاري ضخم لمنتجات الشرقية للدخان بالشرق الأوسط!',
            symbol: 'EAST',
            dir: 'up',
            pct: 40
          },
          rate_cut_rally: {
            title: 'البنك المركزي يخفض الفائدة لدعم حركة التجارة وصعود كافة الأسهم!',
            symbol: 'ALL',
            dir: 'up',
            pct: 25
          },
          crypto_crash: {
            title: 'حظر تداول العملات المشفرة في بعض البنوك المركزية يضغط على البيتكوين!',
            symbol: 'BITC',
            dir: 'down',
            pct: 35
          },
          tech_hack_scandal: {
            title: 'تسريب وتوقف خدمات الدفع الإلكتروني يتسبب بموجة بيع على سهم فوري!',
            symbol: 'FWRY',
            dir: 'down',
            pct: 30
          },
          oil_scandal: {
            title: 'تأخر شحنات المواد الخام يؤدي لضغوط بيعية على سهم الشرقية للدخان!',
            symbol: 'EAST',
            dir: 'down',
            pct: 25
          },
          market_crash: {
            title: 'موجة بيع جني أرباح مكثفة تهبط بأسهم البورصة وتصحيح هبوطي عام!',
            symbol: 'ALL',
            dir: 'down',
            pct: 20
          }
        };

        const tpl = presetTemplates[val];
        if (tpl) {
          if (titleInput) titleInput.value = tpl.title;
          if (symbolSelect) symbolSelect.value = tpl.symbol;
          if (directionSelect) directionSelect.value = tpl.dir;
          if (pctInput) pctInput.value = tpl.pct;
          showToast('نموذج جاهز', `تم اختيار نموذج "${tpl.title.substring(0, 28)}..." وتعبئة الحقول.`, 'info');
        }
      });
    }

    // Apply Direct Stock Price Buttons
    const applyStockPriceBtns = document.querySelectorAll('.btn-admin-apply-stock-price');
    applyStockPriceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const sym = btn.getAttribute('data-symbol');
        const inp = document.getElementById(`adm-input-stock-${sym}`);
        if (!sym || !inp) return;
        const newPrice = Number(inp.value);
        if (isNaN(newPrice) || newPrice <= 0) {
          showToast('تعديل السهم', 'يرجى إدخال سعر صحيح أكبر من صفر.', 'error');
          return;
        }

        if (AppDB.isFirebaseReady) {
          firebase.firestore().collection('globals').doc('market_event').set({
            title: `تدخل إداري مباشر: تم تعديل سعر سهم (${sym}) إلى ${newPrice.toLocaleString()} ج.م`,
            desc: `تم تعديل سعر سهم (${sym}) إلى ${newPrice.toLocaleString()} ج.م`,
            targetSymbol: sym,
            directPrice: newPrice,
            timestamp: Date.now()
          }).then(() => {
            inp.value = '';
            logAdminAction(`تعديل مباشر لسعر سهم ${sym} -> ${newPrice.toLocaleString()} EGP`);
          }).catch(err => showToast('خطأ في الاتصال', err.message, 'error'));
        } else {
          showToast('تعديل السعر', 'يجب الاتصال بقاعدة البيانات لتعديل أسعار الأسهم.', 'error');
        }
      });
    });

    // Reset Market to Baseline
    const resetMarketBaselineBtn = document.getElementById('btn-admin-reset-market-baseline');
    if (resetMarketBaselineBtn) {
      resetMarketBaselineBtn.addEventListener('click', () => {
        if (AppDB.isFirebaseReady) {
          firebase.firestore().collection('globals').doc('market_event').set({
            title: 'إعادة ضبط البورصة',
            desc: 'تم إعادة أسعار جميع الأسهم إلى القيمة الأساسية.',
            resetBaseline: true,
            timestamp: Date.now()
          }).then(() => {
            logAdminAction('إعادة ضبط أسعار كافة الأسهم في البورصة للقيمة الأساسية');
          }).catch(err => showToast('خطأ في الاتصال', err.message, 'error'));
        } else {
          showToast('إعادة ضبط البورصة', 'يجب الاتصال بقاعدة البيانات لإعادة ضبط البورصة.', 'error');
        }
      });
    }

    // Market Sudden Event Triggers
    const eventBtns = document.querySelectorAll('.btn-admin-trigger-event');
    eventBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const evType = btn.getAttribute('data-event');
        const eventsMap = {
          tech_boom: {
            title: '🚀 طفرة تقنية وانتعاش الذكاء الاصطناعي',
            desc: 'ارتفعت أرباح قطاع التكنولوجيا وأسهم AIX و FWRY و CASH نتيجة استثمارات قياسية!',
            targetStocks: ['AIX', 'FWRY', 'CASH'],
            multiplier: 1.35,
            toastType: 'success'
          },
          crypto_frenzy: {
            title: '🚀 صعود تاريخي وانفجار سعر البيتكوين',
            desc: 'صناديق استثمارية سيادية عملاقة تبدأ في الشراء المباشر للبيتكوين (+50%)!',
            targetStocks: ['BITC'],
            multiplier: 1.50,
            toastType: 'success'
          },
          gold_rally: {
            title: '🥇 إقبال قياسي وطفرة في أسعار الذهب',
            desc: 'توترات اقتصادية عالمية تدفع المستثمرين للتحوط بسبائك الذهب 24k (+35%)!',
            targetStocks: ['GOLD'],
            multiplier: 1.35,
            toastType: 'success'
          },
          cbe_rate_hike: {
            title: '🏛️ قرار المركزي: رفع الفائدة 200 نقطة',
            desc: 'البنك المركزي يرفع الفائدة! ارتفاع قوي لسهم CIB وانتكاسة خفيفة باقي الأسهم.',
            targetStocks: ['COMI'],
            multiplier: 1.30,
            negativeTargets: ['EAST', 'FWRY'],
            negativeMultiplier: 0.88,
            toastType: 'warning'
          },
          telecom_expansion: {
            title: '📶 رخصة 5G للمصرية للاتصالات',
            desc: 'حصول المصرية للاتصالات على رخصة الجيل الخامس وتوسعة الكابلات البحرية (+35%)!',
            targetStocks: ['ETEL'],
            multiplier: 1.35,
            toastType: 'success'
          },
          tobacco_monopoly: {
            title: '🚬 اتفاقية احتكار وتصدير للشرقية للدخان',
            desc: 'توقع عقد احتكاري ضخم لتصدير المنتجات للشرق الأوسط يطير بالسهم فوق 40%!',
            targetStocks: ['EAST'],
            multiplier: 1.40,
            toastType: 'success'
          },
          crypto_crash: {
            title: '📉 ضغوط تنظيمية وهبوط حاد للبيتكوين',
            desc: 'حظر تداول العملات المشفرة في بعض البنوك المركزية يضغط على البيتكوين (-35%)!',
            targetStocks: ['BITC'],
            multiplier: 0.65,
            toastType: 'error'
          },
          tech_hack_scandal: {
            title: '⚠️ ثغرة وأزمة حماية لشركة فوري',
            desc: 'تسريب وتوقف خدمات الدفع الإلكتروني يتسبب بموجة بيع مكثفة ومخاوف استثمارية!',
            targetStocks: ['FWRY'],
            multiplier: 0.70,
            toastType: 'error'
          },
          rate_cut_rally: {
            title: '📈 خفض الفائدة وانتعاش حركة الاستثمار',
            desc: 'البنك المركزي يخفض الفائدة لدعم حركة التجارة والإنتاج! صعود متزامن لكل الأسهم (+25%).',
            targetStocks: ['COMI', 'FWRY', 'CASH', 'EAST', 'ETEL', 'BITC', 'GOLD', 'AIX'],
            multiplier: 1.25,
            toastType: 'success'
          },
          oil_scandal: {
            title: '🚢 أزمة سلاسل الإمداد والشحن',
            desc: 'تأخر شحنات التبغ والمواد الخام يؤدي لربكة ومبيعات مكثفة على سهم الشرقية للدخان!',
            targetStocks: ['EAST'],
            multiplier: 0.75,
            toastType: 'error'
          },
          market_crash: {
            title: '💥 ذعر اقتصادي وتصحيح هابط للبورصة',
            desc: 'موجة بيع جني أرباح مكثفة تهبط بجميع أسهم البورصة وتصحيح هبوطي عام (-20%)!',
            targetStocks: ['COMI', 'FWRY', 'CASH', 'EAST', 'ETEL', 'BITC', 'GOLD', 'AIX'],
            multiplier: 0.80,
            toastType: 'error'
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

        if (AppDB.isFirebaseReady) {
          firebase.firestore().collection('globals').doc('market_event').set({
            title: ev.title,
            desc: ev.desc,
            targets: targets,
            timestamp: Date.now()
          }).then(() => {
            logAdminAction(`افتعال حدث اقتصادي: ${ev.title}`);
          }).catch(err => showToast('خطأ في الاتصال', err.message, 'error'));
        } else {
          showToast('افتعال الحدث', 'يجب الاتصال بقاعدة البيانات لفرض الأحداث.', 'error');
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
          showToast('بث الإدارة', 'يرجى كتابة نص الرسالة أولاً.', 'error');
          return;
        }
        try {
          await AppDB.sendBroadcast(msg);
          showToast('نجاح البث', 'تم إرسال البث لجميع المشتركين بنجاح.', 'success');
          document.getElementById('admin-broadcast-msg').value = '';
          logAdminAction(`إرسال إشعار عام: "${msg}"`);
        } catch (err) {
          showToast('فشل البث', err.message, 'error');
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
        const target = (document.getElementById('admin-airdrop-target')?.value || 'ALL').trim();

        if (isNaN(amount) || amount <= 0) {
          showToast('مكافأة الإدارة', 'يرجى إدخال مبلغ صحيح أكبر من صفر.', 'error');
          return;
        }
        try {
          await AppDB.sendAirdrop(amount, target);
          showToast('نجاح التوزيع', `تم توزيع المكافأة (+${amount.toLocaleString()} EGP) للمستهدفين (${target}) بنجاح.`, 'success');
          document.getElementById('admin-airdrop-amount').value = '';
          logAdminAction(`توزيع مكافأة مالية: +${amount.toLocaleString()} EGP -> ${target}`);
        } catch (err) {
          showToast('فشل التوزيع', err.message, 'error');
        }
      });
    }

    // ==================== MANDATORY FORCE PAGE RELOAD FOR ALL PLAYERS ====================
    const forceReloadBtn = document.getElementById('btn-admin-force-reload');
    if (forceReloadBtn) {
      forceReloadBtn.addEventListener('click', async () => {
        const customMsg = (document.getElementById('admin-force-reload-msg')?.value || '').trim();
        const defaultMsg = 'تم إطلاق تحديث وتحسينات هامة للعبة. يجب إعادة تحميل الصفحة الآن لتطبيق التغييرات وضمان استقرار حسابك.';
        const finalMsg = customMsg || defaultMsg;

        const confirmed = confirm(
          "⚠️ تنبيه إداري هام:\n\nهل أنت متأكد من إجبار جميع اللاعبين المتصلين حالياً على إعادة تحميل الصفحة فوراً؟\n\nستظهر شاشة منبثقة إجبارية بملء الشاشة تمنع اللعب ولا تختفي إلا بعد أن يقوم اللاعب بإعادة تحميل الصفحة."
        );
        if (!confirmed) return;

        try {
          forceReloadBtn.disabled = true;
          forceReloadBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> <span>جاري إرسال الأمر لكافة المتصلين...</span>';

          await AppDB.sendForceReload(finalMsg);

          showToast('إعادة التحميل الإجبارية', 'تم إرسال شاشة إعادة التحميل الإجبارية لجميع اللاعبين المتصلين بنجاح! 🔄', 'success');
          logAdminAction(`إرسال أمر إعادة تحميل إجباري لجميع اللاعبين: "${finalMsg}"`);
          if (document.getElementById('admin-force-reload-msg')) {
            document.getElementById('admin-force-reload-msg').value = '';
          }
        } catch (err) {
          showToast('خطأ', 'فشل إرسال أمر إعادة التحميل: ' + err.message, 'error');
        } finally {
          forceReloadBtn.disabled = false;
          forceReloadBtn.innerHTML = '<i class="fa-solid fa-rotate-right text-sm"></i><span>إرسال شاشة إعادة التحميل الإجبارية لجميع اللاعبين المتصلين الآن 🔄</span>';
        }
      });
    }

    function updateMaintenanceUIState(isMaint) {
      const badge = document.getElementById('admin-maintenance-badge');
      const toggleBtn = document.getElementById('btn-admin-toggle-maintenance');
      const btnText = document.getElementById('admin-maintenance-btn-text');
      if (badge) {
        if (isMaint) {
          badge.textContent = 'وضع الصيانة نشط 🚨';
          badge.className = 'text-[10px] px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded border border-rose-500/30 font-bold animate-pulse';
        } else {
          badge.textContent = 'النظام يعمل بشكل طبيعي';
          badge.className = 'text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 font-bold';
        }
      }
      if (toggleBtn) {
        const text = isMaint
          ? '✅ إنهاء وضع الصيانة والعودة للتشغيل الطبيعي للجميع'
          : '🚨 إغلاق اللعبة وتفعيل وضع الصيانة الشامل للجميع';
        if (btnText) {
          btnText.textContent = text;
        } else {
          toggleBtn.textContent = text;
        }
        if (isMaint) {
          toggleBtn.className = 'w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg text-xs transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2';
        } else {
          toggleBtn.className = 'w-full py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-lg text-xs transition shadow-lg shadow-amber-600/10 flex items-center justify-center gap-2';
        }
      }
    }

    function applyCompleteZeroStateToGameEngine(username) {
      if (!GameEngine.state) return;
      GameEngine.state.cash = 1500;
      GameEngine.state.bank = 500;
      GameEngine.state.netWorth = 2000;
      GameEngine.state.dirtyCash = 0;
      GameEngine.state.xp = 0;
      GameEngine.state.underworldRep = 0;
      GameEngine.state.heatLevel = 0;
      GameEngine.state.businesses = {};
      GameEngine.state.assets = {};
      GameEngine.state.stocks = {};
      GameEngine.state.inventory = {};
      GameEngine.state.investments = [];
      GameEngine.state.customItems = [];
    }

    // ─────────────────────────────────────────────
    //  MODULE: SYSTEM & DANGER ZONE
    // ─────────────────────────────────────────────


    // RESET ALL PLAYERS' ECONOMY
    const resetAllEconomyBtn = document.getElementById('btn-admin-reset-all-economy');
    if (resetAllEconomyBtn) {
      resetAllEconomyBtn.addEventListener('click', async () => {
        const confirmMsg = "⚠️ تحذير خطير: هل أنت متأكد من تصفير أرصدة وممتلكات المنظومة لكافة اللاعبين المسجلين؟\nسيتم تصفير كاش وبنك وأصول وأسهم وشركات ومخزون كافة الحسابات بالكامل مع الإبقاء على الحسابات وأرقامها السرية.";
        if (!confirm(confirmMsg)) return;

        try {
          const count = await AppDB.adminResetAllPlayers();

          if (GameEngine.activeUsername) {
            applyCompleteZeroStateToGameEngine(GameEngine.activeUsername);
            renderAll();
          }

          showToast('تصفير أرصدة المنظومة', `تم تصفير حسابات وأرصدة ${count} لاعب في المنظومة بالكامل بنجاح.`, 'success');
          logAdminAction(`تصفير شامل لأرصدة المنظومة — تم تصفير ${count} حساب لاعب بالكامل`);
          loadAdminPlayersDirectory(false);
          renderAdminAnalyticsDashboard();
        } catch (err) {
          showToast('خطأ تصفير المنظومة', err.message, 'error');
        }
      });
    }

    // WIPE ALL PLAYERS DATA (FULL DATABASE WIPE)
    const wipeLeaderboardBtn = document.getElementById('btn-admin-wipe-leaderboard');
    if (wipeLeaderboardBtn) {
      wipeLeaderboardBtn.addEventListener('click', async () => {
        const confirmMsg = "⚠️ تحذير نهائي وقاطع: هل أنت متأكد من حذف كافة حسابات اللاعبين نهائياً من قاعدة البيانات عدا حساب الأدمن الرئيسي؟\nهذا الإجراء لا يمكن التراجع عنه!";
        if (!confirm(confirmMsg)) return;

        try {
          const count = await AppDB.adminWipeLeaderboard();
          showToast('مسح الحسابات', `تم حذف ${count} حساب لاعب نهائياً ومسح قائمة المتصدرين.`, 'success');
          logAdminAction(`مسح وتطهير شامل لقاعدة البيانات — تم حذف ${count} حساب`);
          loadAdminPlayersDirectory(false);
          renderAll();
        } catch (err) {
          showToast('خطأ مسح الحسابات', err.message, 'error');
        }
      });
    }

    // REBUILD CENTRALIZED LEADERBOARD (UNIFY TOP 25 WORLDWIDE)
    const rebuildLeaderboardBtn = document.getElementById('btn-admin-rebuild-leaderboard');
    if (rebuildLeaderboardBtn) {
      rebuildLeaderboardBtn.addEventListener('click', async () => {
        try {
          rebuildLeaderboardBtn.disabled = true;
          rebuildLeaderboardBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الفرز والمزامنة...';
          const topList = await AppDB.adminRebuildLeaderboard();
          showToast('توحيد المتصدرين', `تم فرز وتوحيد ليدربورد الأثرياء بنجاح (${topList.length} لاعب في القمة). سيظهر نفس الترتيب لجميع اللاعبين فوراً!`, 'success');
          logAdminAction(`إعادة فرز وتوحيد ليدربورد المتصدرين سحابياً (${topList.length} لاعب)`);
        } catch (err) {
          showToast('خطأ المزامنة', err.message, 'error');
        } finally {
          rebuildLeaderboardBtn.disabled = false;
          rebuildLeaderboardBtn.innerHTML = '<i class="fa-solid fa-crown"></i> <span>فرز وتوحيد عرش الأثرياء الآن</span>';
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
          autoFillS1Btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري السحب...';

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
            if (topPlayers[0]) document.getElementById('adm-s1-top1-input').value = topPlayers[0].username || '';
            if (topPlayers[1]) document.getElementById('adm-s1-top2-input').value = topPlayers[1].username || '';
            if (topPlayers[2]) document.getElementById('adm-s1-top3-input').value = topPlayers[2].username || '';
            showToast('سحب المتصدرين', `تم سحب أسماء المتصدرين بنجاح (${topPlayers.map(p => p.username).join(' • ')})`, 'success');
          } else {
            showToast('لا توجد بيانات', 'لم يتم العثور على لاعبين في قاعدة البيانات. يمكنك إدخال الأسماء يدوياً.', 'info');
          }
        } catch (err) {
          showToast('خطأ في السحب', err.message, 'error');
        } finally {
          autoFillS1Btn.disabled = false;
          autoFillS1Btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> <span>سحب التوب 3 الحاليين تلقائياً</span>';
        }
      });
    }

    if (submitS1Btn) {
      submitS1Btn.addEventListener('click', async () => {
        const u1 = document.getElementById('adm-s1-top1-input').value.trim();
        const u2 = document.getElementById('adm-s1-top2-input').value.trim();
        const u3 = document.getElementById('adm-s1-top3-input').value.trim();

        if (!u1) {
          showToast('بيانات ناقصة', 'يرجى إدخال اسم لاعب المركز الأول (Top 1) على الأقل.', 'error');
          return;
        }

        try {
          submitS1Btn.disabled = true;
          submitS1Btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الاعتماد والنشر...';

          const awardPromise = AppDB.adminAwardSeasonHonors(u1, u2, u3);
          const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ ok: true }), 3000));
          await Promise.race([awardPromise, timeoutPromise]);

          showToast('تم التكريم', 'تم اعتماد وتكريم أبطال الموسم الأول بنجاح! تم منح الأوسمة والألقاب ونشرها.', 'success');
          logAdminAction(`اعتماد وتكريم أبطال الموسم الأول S1: الأول (${u1}) | الثاني (${u2 || 'لا يوجد'}) | الثالث (${u3 || 'لا يوجد'})`);
          s1Modal.classList.add('hidden');
        } catch (err) {
          showToast('خطأ التكريم', err.message, 'error');
        } finally {
          submitS1Btn.disabled = false;
          submitS1Btn.innerHTML = '<i class="fa-solid fa-check"></i> <span>اعتماد التكريم ونشره</span>';
        }
      });
    }

    // AWARD TOP 25 VETERAN INVESTORS HANDLER
    const awardTop25Btn = document.getElementById('btn-admin-award-top25-veterans');
    if (awardTop25Btn) {
      awardTop25Btn.addEventListener('click', async () => {
        if (!confirm("هل أنت متأكد من رغبتك في منح وسام ولقب [🎖️ مستثمر مخضرم S1] لأفضل 25 لاعباً في السيرفر؟")) return;

        try {
          awardTop25Btn.disabled = true;
          awardTop25Btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري المنح والتكريم...';

          const awardPromise = AppDB.adminAwardTop25Veterans(cachedPlayers);
          const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ count: 25, players: [] }), 4000));
          const res = await Promise.race([awardPromise, timeoutPromise]);

          showToast('وسام المخضرمين', `تم منح وسام [مستثمر مخضرم S1] بنجاح لـ ${res.count || 25} لاعباً من متصدري السيرفر! 🎖️`, 'success');
          logAdminAction(`منح وسام ولقب [مستثمر مخضرم S1] للتوب 25 (${res.count || 25} لاعب)`);
          
          // Refresh directory
          loadAdminPlayersDirectory(false, true);
        } catch (err) {
          showToast('خطأ في المنح', err.message, 'error');
        } finally {
          awardTop25Btn.disabled = false;
          awardTop25Btn.innerHTML = '<i class="fa-solid fa-award"></i> <span>منح وسام مستثمر مخضرم S1 لأول 25 لاعب</span>';
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
          showToast('تفريغ السجل', `تم مسح ${count} حركة تحويل مالي من السجل.`, 'success');
          logAdminAction(`تفريغ وتنظيف سجل التحويلات المالية (${count} عملية)`);
          renderAdminTransfersMonitor();
        } catch (err) {
          showToast('خطأ تفريغ السجل', err.message, 'error');
        }
      });
    }

    // Refresh Transfers Audit Button
    const refreshTransfersBtn = document.getElementById('btn-admin-refresh-transfers');
    if (refreshTransfersBtn) {
      refreshTransfersBtn.addEventListener('click', () => {
        renderAdminTransfersMonitor();
        showToast('تحديث التحويلات', 'تم جلب أحدث سجلات التحويلات المالية.', 'success');
      });
    }

    // Refresh Stats Button
    const refreshStatsBtn = document.getElementById('btn-admin-refresh-stats');
    if (refreshStatsBtn) {
      refreshStatsBtn.addEventListener('click', () => {
        renderAdminAnalyticsDashboard();
        showToast('تحديث الإحصائيات', 'تم تحديث لوحة الإحصائيات الحية بنجاح.', 'success');
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
      ['adm-tax-multiplier', 'adm-tax-multiplier-mkt'].forEach(id => {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = cfg.rateMultiplier;
      });
      ['adm-tax-silver', 'adm-tax-silver-mkt'].forEach(id => {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = cfg.silverRate;
      });
      ['adm-tax-major', 'adm-tax-major-mkt'].forEach(id => {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = cfg.majorRate;
      });
      ['adm-tax-whale', 'adm-tax-whale-mkt'].forEach(id => {
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
        showToast('خطأ إدخال', 'يرجى التأكد من إدخال قيم صحيحة للضرائب وموجبة.', 'error');
        return;
      }

      try {
        if (btnEl) {
          btnEl.disabled = true;
          btnEl.textContent = 'جاري الحفظ والتعميم...';
        }

        const cfg = { rateMultiplier, silverRate, majorRate, whaleRate };
        await AppDB.adminSaveTaxConfig(cfg);
        syncTaxInputs(cfg);

        showToast('تم الحفظ', 'تم تحديث ونشر السياسة الضريبية الجديدة لجميع اللاعبين بنجاح.', 'success');
        logAdminAction(`تعديل الضرائب: مضاعف ${rateMultiplier}x | فضية ${silverRate} | كبار ${majorRate} | حيتان ${whaleRate}`);
      } catch (err) {
        showToast('فشل حفظ الضرائب', err.message, 'error');
      } finally {
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> <span>تحديث السياسة الضريبية فوراً</span>';
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
          showToast('خطأ إعدادات', 'يرجى إدخال قيم صحيحة وموجبة للسعر والمدة.', 'error');
          return;
        }

        try {
          saveItemConfigBtn.disabled = true;
          saveItemConfigBtn.textContent = 'جاري حفظ التعديلات...';

          await AppDB.adminSaveItemConfig(itemId, cost, durationSec);

          await GameEngine.syncItemsConfig();

          showToast('تحديث الإعدادات', `تم حفظ وتعميم إعدادات الأداة بنجاح! السعر: ${cost.toLocaleString()} ج.م، المدة: ${durationSec} ثانية.`, 'success');
          logAdminAction(`تحديث إعدادات الأداة (${itemId}): سعر ${cost.toLocaleString()} ج.م، مدة ${durationSec}ث`);
          renderAll();
        } catch (err) {
          showToast('فشل حفظ الإعدادات', err.message, 'error');
        } finally {
          saveItemConfigBtn.disabled = false;
          saveItemConfigBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> <span>حفظ وتعميم إعدادات الأداة فوراً</span>';
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
          showToast('خطأ إعدادات', 'يرجى إدخال قيم صحيحة وموجبة للاسم، السعر، والكمية.', 'error');
          return;
        }

        try {
          btnCreateAuction.disabled = true;
          btnCreateAuction.textContent = 'جاري نشر المزاد...';

          await AppDB.adminCreateAuctionItem(name, desc, price, qty);

          showToast('تم النشر', `تم طرح الغرض "${name}" بنجاح في صفحة المزادات.`, 'success');
          logAdminAction(`طرح غرض في المزاد: ${name} (سعر ${price.toLocaleString()} ج.م، كمية ${qty})`);

          // Clear inputs
          document.getElementById('admin-auction-name').value = '';
          document.getElementById('admin-auction-desc').value = '';
          document.getElementById('admin-auction-price').value = '';
          document.getElementById('admin-auction-qty').value = '';

          // Re-render
          fetchAndRenderAdminAuctions();
        } catch (err) {
          showToast('فشل إنشاء المزاد', err.message, 'error');
        } finally {
          btnCreateAuction.disabled = false;
          btnCreateAuction.innerHTML = '<i class="fa-solid fa-plus"></i> <span>طرح الغرض للبيع فوراً في المزادات</span>';
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
        const basePrice = parseInt(priceInput.value || '0');
        const condType = condTypeSelect.value;
        const condVal = parseInt(condValInput.value || '0');

        if (!name || basePrice <= 0 || condVal <= 0) {
          showToast('خطأ إدخال', 'يرجى ملء جميع تفاصيل المزاد الحي الجديد بقيم صحيحة.', 'error');
          return;
        }

        try {
          btnCreateLiveAuction.disabled = true;
          let startVal = condVal;
          if (condType === 'time') {
            startVal = Date.now() + (condVal * 60 * 1000);
          }

          await AppDB.adminCreateLiveAuction(type, 'live_' + Math.random().toString(36).substr(2, 9), name, basePrice, condType, startVal);
          showToast('تم إطلاق المزاد الحي', `تم إدراج المزاد الحي (${name}) بنجاح وهو بانتظار المسجلين.`, 'success');
          logAdminAction(`إطلاق مزاد حي: ${name} (سعر ابتدائي ${basePrice.toLocaleString()} ج.م، شرط ${condType}: ${condVal})`);

          nameInput.value = '';
          priceInput.value = '';
          condValInput.value = '';

          fetchAndRenderAdminLiveAuctions();
        } catch (err) {
          showToast('فشل المزاد', err.message, 'error');
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
        document.getElementById('admin-gift-box-cash').classList.toggle('hidden', type !== 'cash');
        document.getElementById('admin-gift-box-business').classList.toggle('hidden', type !== 'business');
        document.getElementById('admin-gift-box-item').classList.toggle('hidden', type !== 'item');
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
          showToast('خطأ إدخال', 'يرجى إدخال رمز كود الهدية.', 'error');
          return;
        }

        const details = {};
        if (type === 'cash') {
          const amt = Number(document.getElementById('admin-gift-cash-amount').value);
          if (isNaN(amt) || amt <= 0) {
            showToast('خطأ إدخال', 'يرجى إدخال مبلغ مالي صحيح وموجب.', 'error');
            return;
          }
          details.amount = amt;
        } else if (type === 'business') {
          const bId = document.getElementById('admin-gift-business-id').value;
          const lvl = Number(document.getElementById('admin-gift-business-lvl').value);
          const workers = Number(document.getElementById('admin-gift-business-workers').value);
          if (isNaN(lvl) || lvl <= 0 || isNaN(workers) || workers < 0) {
            showToast('خطأ إدخال', 'يرجى إدخال مستوى وعدد عمال صحيحين.', 'error');
            return;
          }
          details.businessId = bId;
          details.level = lvl;
          details.workers = workers;
        } else if (type === 'item') {
          const itemId = document.getElementById('admin-gift-item-id').value;
          details.itemId = itemId;
        }

        try {
          btnCreateGiftCode.disabled = true;
          btnCreateGiftCode.textContent = 'جاري توليد الكود...';

          await AppDB.adminCreateGiftCode(code, type, details, maxUses);

          showToast('تم إنشاء الكود', `تم نشر كود الهدية "${code.toUpperCase()}" بنجاح في المنظومة.`, 'success');
          logAdminAction(`إنشاء كود الهدية: ${code.toUpperCase()} (النوع: ${type})`);

          // Clear inputs
          document.getElementById('admin-gift-code').value = '';
          document.getElementById('admin-gift-max-uses').value = '0';
          document.getElementById('admin-gift-cash-amount').value = '';

          fetchAndRenderAdminGiftCodes();
        } catch (err) {
          showToast('فشل الإنشاء', err.message, 'error');
        } finally {
          btnCreateGiftCode.disabled = false;
          btnCreateGiftCode.innerHTML = '<i class="fa-solid fa-plus"></i> <span>توليد ونشر كود الهدية فوراً</span>';
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
      showToast('تم السجن', `تم سجن اللاعب ${username} لمدة 15 دقيقة بنجاح.`, 'success');
      if (window._adminReloadPlayers) window._adminReloadPlayers(false);
      renderAdminAnalyticsDashboard();
    } catch (e) {
      showToast('خطأ', e.message, 'error');
    }
  };

  window.UIController.adminQuickBanAction = async function(username) {
    if (!confirm(`هل أنت متأكد من حظر حساب اللاعب ${username} نهائياً؟`)) return;
    try {
      await AppDB.adminBanPlayer(username);
      showToast('تم الحظر', `تم حظر حساب اللاعب ${username} بنجاح.`, 'success');
      if (window._adminReloadPlayers) window._adminReloadPlayers(false);
      renderAdminAnalyticsDashboard();
    } catch (e) {
      showToast('خطأ', e.message, 'error');
    }
  };

  async function renderAdminAnalyticsDashboard() {
    try {
      const stats = await AppDB.getSystemStats();
      window._adminLastTotalPlayers = stats.totalPlayers || 0;
      
      const elP = document.getElementById('adm-stat-players');
      const elC = document.getElementById('adm-stat-cash');
      const elB = document.getElementById('adm-stat-bank');
      const elNW = document.getElementById('adm-stat-networth') || document.getElementById('adm-stat-worth');
      const elJ = document.getElementById('adm-stat-jailed');
      const elBan = document.getElementById('adm-stat-banned');

      if (elP) {
        let badgeHtml = '';
        if (stats.isFromCache || stats.quotaExceeded) {
          badgeHtml = ` <span class="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30" title="تم قراءة بعض البيانات من الكاش المحلي نظراً لبلوغ سقف كوتة Firebase المجانية">كاش 🟡</span>`;
        } else {
          badgeHtml = ` <span class="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" title="بيانات حية مباشرة من السيرفر السحابي">حي 🟢</span>`;
        }
        elP.innerHTML = `${(stats.totalPlayers || 0).toLocaleString()}${badgeHtml}`;
      }
      if (elC) elC.textContent = `${(stats.totalCash || 0).toLocaleString()} EGP`;
      if (elB) elB.textContent = `${(stats.totalBank || 0).toLocaleString()} EGP`;
      if (elNW) elNW.textContent = `${(stats.totalNetWorth || 0).toLocaleString()} EGP`;
      if (elJ) elJ.textContent = (stats.jailedCount || 0).toLocaleString();
      if (elBan) elBan.textContent = (stats.bannedCount || 0).toLocaleString();

      // Show Quota Notice Banner if quota is exceeded
      let quotaBanner = document.getElementById('adm-quota-notice-banner');
      const statsContainer = document.getElementById('admin-subpanel-stats');
      if (stats.quotaExceeded) {
        if (!quotaBanner && statsContainer) {
          quotaBanner = document.createElement('div');
          quotaBanner.id = 'adm-quota-notice-banner';
          quotaBanner.className = 'p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2.5 shadow-lg';
          quotaBanner.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation text-amber-400 text-sm mt-0.5 shrink-0"></i>
            <div>
              <strong class="block font-bold text-amber-300 mb-0.5">تنبيه سقف كوتة القراءات السحابية (Firebase Quota 429)</strong>
              <span class="text-[11px] text-amber-300/80 leading-relaxed">
                مشروع Firebase استنفد الحد الأقصى اليومي للقراءات المجانية (Resource Exhausted). الإحصائيات معروضة استناداً إلى العدادات التراكمية والكاش المحلي، وستعود المزامنة السحابية الكاملة للعمل تلقائياً فور تجدد الكوتة اليومية من Google.
              </span>
            </div>
          `;
          statsContainer.insertBefore(quotaBanner, statsContainer.firstChild);
        }
      } else if (quotaBanner) {
        quotaBanner.remove();
      }

      const refreshBtn = document.getElementById('btn-admin-refresh-stats');
      if (refreshBtn && !refreshBtn._bound) {
        refreshBtn._bound = true;
        refreshBtn.onclick = () => {
          showToast('تحديث', 'جاري إعادة حساب وفحص إحصائيات السيرفر...', 'info');
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

        wealthDistContainer.innerHTML = `
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
          </div>
        `;
      }

      // 2. Render Top 5 Richest comparison
      const topRichestContainer = document.getElementById('adm-top-richest-container');
      if (topRichestContainer && stats.topRichest) {
        const top5 = stats.topRichest;
        const maxWorth = top5.length > 0 ? (top5[0].netWorth || 1) : 1;

        topRichestContainer.innerHTML = '';
        if (top5.length === 0) {
          topRichestContainer.innerHTML = '<div class="text-[11px] text-slate-500 text-center py-4">لا توجد بيانات متاحة حالياً.</div>';
        } else {
          top5.forEach((p, idx) => {
            const widthPct = Math.max(8, Math.min(100, (p.netWorth / maxWorth) * 100));
            const bar = document.createElement('div');
            bar.className = 'space-y-1';
            bar.innerHTML = `
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
              </div>
            `;
            topRichestContainer.appendChild(bar);
          });
        }
      }

      // 3. Render Suspicious Accounts
      const suspiciousTbody = document.getElementById('adm-suspicious-accounts-tbody');
      if (suspiciousTbody) {
        const suspects = stats.suspiciousPlayers || [];
        suspiciousTbody.innerHTML = '';

        if (suspects.length === 0) {
          suspiciousTbody.innerHTML = `
            <tr>
              <td colspan="5" class="py-6 text-center text-slate-500">لا توجد حسابات مشبوهة مرصودة حالياً. السيرفر آمن تماماً!</td>
            </tr>
          `;
        } else {
          suspects.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-900 border-b border-slate-800/40 transition duration-150';
            tr.innerHTML = `
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
              </td>
            `;
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
    tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-slate-400">جاري تحميل سجل التحويلات...</td></tr>';

    try {
      const transfers = await AppDB.adminGetTransfers();
      if (!transfers || transfers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-slate-500">لا يوجد عمليات تحويل مالية مسجلة حالياً.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      transfers.forEach(trf => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-850 transition';
        const dateStr = new Date(trf.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        tr.innerHTML = `
          <td class="p-2.5 font-bold text-white">${trf.sender}</td>
          <td class="p-2.5 font-bold text-yellow-400">${trf.recipient}</td>
          <td class="p-2.5 text-center numbers-font font-bold text-emerald-400">+${(trf.amount || 0).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center numbers-font text-slate-400 text-[11px]">${dateStr}</td>
          <td class="p-2.5 text-left"><span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold text-[10px]">${trf.status || 'مكتملة'}</span></td>
        `;
        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-rose-400">فشل تحميل سجل التحويلات: ${e.message}</td></tr>`;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

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
        container.innerHTML = `
          <div class="text-center text-slate-500 text-xs py-16 flex flex-col items-center gap-2">
            <i class="fa-regular fa-comment-dots text-3xl text-slate-600"></i>
            <span>لا توجد رسائل حالياً في الشات العام.</span>
          </div>
        `;
        return;
      }

      let html = '';
      msgs.forEach(m => {
        const timeStr = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
        const isAdminMsg = m.sender && (m.sender.includes('الإدارة') || m.sender.includes('Admin') || m.senderTitle === 'مدير النظام 👑');

        html += `
          <div class="p-3 rounded-xl border ${isAdminMsg ? 'bg-amber-950/25 border-amber-500/40 text-amber-200' : 'bg-slate-900/60 border-slate-800/80 text-slate-200'} flex items-start justify-between gap-3 text-xs transition hover:bg-slate-850">
            <div class="space-y-1 overflow-hidden">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-black ${isAdminMsg ? 'text-amber-400 font-sans' : 'text-cyan-400 font-sans'}">${escapeHtml(m.sender)}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-md ${isAdminMsg ? 'bg-amber-500/20 text-amber-300 font-bold' : 'bg-slate-800 text-slate-400'}">${escapeHtml(m.senderTitle || 'لاعب')}</span>
                <span class="text-[10px] text-slate-500 numbers-font">${timeStr}</span>
              </div>
              <p class="text-xs break-words font-sans text-slate-200 leading-relaxed">${escapeHtml(m.message)}</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button onclick="window.quickInspectPlayer('${escapeHtml(m.sender)}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] rounded-lg font-bold transition flex items-center gap-1 cursor-pointer" title="فحص وفتح ملف هذا اللاعب">
                <i class="fa-solid fa-user-gear"></i>
                <span>فحص</span>
              </button>
            </div>
          </div>
        `;
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
            if (typeof showToast === 'function') showToast('الشات العام', 'تم تحديث سجل الرسائل بنجاح 🔄', 'info');
          } catch (e) {
            if (typeof showToast === 'function') showToast('خطأ', 'فشل جلب رسائل الشات.', 'error');
          } finally {
            refreshBtn.disabled = false;
          }
        });
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
          if (!confirm('⚠️ تحذير إداري: هل أنت متأكد من مسح جميع رسائل الشات العام نهائياً؟')) return;
          try {
            clearBtn.disabled = true;
            await AppDB.clearChatMessages();
            refreshChatUI([]);
            if (typeof showToast === 'function') showToast('مسح الشات', 'تم مسح سجل الشات العام بالكامل بنجاح 🗑️', 'success');
          } catch (e) {
            if (typeof showToast === 'function') showToast('خطأ', 'فشل مسح الشات.', 'error');
          } finally {
            clearBtn.disabled = false;
          }
        });
      }

      const handleSend = async () => {
        const text = inputEl ? inputEl.value.trim() : '';
        if (!text) return;

        try {
          if (sendBtn) sendBtn.disabled = true;
          await AppDB.sendChatMessage('الإدارة 👑', 'مدير النظام 👑', text);
          if (inputEl) inputEl.value = '';
          const msgs = await AppDB.getChatMessages();
          refreshChatUI(msgs);
          if (typeof showToast === 'function') showToast('تم الإرسال 📢', 'تم بث رسالتك الإدارية في الشات العام بنجاح!', 'success');
        } catch (e) {
          if (typeof showToast === 'function') showToast('خطأ', 'فشل إرسال الرسالة.', 'error');
        } finally {
          if (sendBtn) sendBtn.disabled = false;
        }
      };

      if (sendBtn) sendBtn.addEventListener('click', handleSend);
      if (inputEl) {
        inputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') handleSend();
        });
      }
    }

    // Initial load
    try {
      const initialMsgs = await AppDB.getChatMessages();
      refreshChatUI(initialMsgs);
    } catch (e) {
      container.innerHTML = `<div class="text-center text-rose-400 text-xs py-8">فشل جلب رسائل الشات: ${e.message}</div>`;
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
      if (typeof renderAdminPlayersTable === 'function') {
        renderAdminPlayersTable();
      }
    }
  };

  let adminCorpsUnsubscribe = null;
  let activeInspectedCorp = null;

  const ADMIN_CORP_MEGA_PROJECTS = {
    data_center: { name: 'مركز بيانات استراتيجي', icon: 'fa-server', color: 'text-sky-400', cost: 50000000, desc: 'بنية تحتية سحابية وتأمين بيانات التحالف' },
    ai_supercluster: { name: 'عنقود الذكاء الاصطناعي الفائق', icon: 'fa-brain', color: 'text-purple-400', cost: 150000000, desc: 'خوارزميات تنبؤ بالأسواق وتوليد سيولة' },
    submarine_cables: { name: 'شبكة الألياف البحرية العالمية', icon: 'fa-network-wired', color: 'text-cyan-400', cost: 400000000, desc: 'ربط قاري فائق السرعة وخفض عمولات التداول' },
    medical_city: { name: 'المدينة الطبية العالمية المتكاملة', icon: 'fa-hospital', color: 'text-emerald-400', cost: 900000000, desc: 'أبحاث جينات وصيدلة وتأمين صحي شامل' },
    nuclear_reactor: { name: 'المفاعل النووي القومي لإنتاج الطاقة', icon: 'fa-atom', color: 'text-amber-400', cost: 2500000000, desc: 'توليد طاقة نظيفة وخفض تكاليف التشغيل' },
    mars_colony: { name: 'مستعمرة التعدين المريخية المستقلة', icon: 'fa-shuttle-space', color: 'text-rose-400', cost: 10000000000, desc: 'استخراج معادن فلكية نادرة ومضاعفة الأرباح' }
  };

  function renderAdminCorporationsPanel() {
    const tbody = document.getElementById('admin-corporations-list');
    const totalCountBadge = document.getElementById('admin-corp-total-count-badge');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-slate-500">جاري تحميل الشركات...</td></tr>';

    if (adminCorpsUnsubscribe) {
      adminCorpsUnsubscribe();
      adminCorpsUnsubscribe = null;
    }

    adminCorpsUnsubscribe = AppDB.listenToCorporations(corps => {
      tbody.innerHTML = '';
      if (totalCountBadge) totalCountBadge.textContent = `${(corps || []).length} شركة`;

      if (!corps || corps.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-slate-500">لا توجد شركات مشتركة مسجلة حالياً.</td></tr>';
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
        tr.className = 'hover:bg-slate-850 transition border-b border-slate-800/40';

        const projKeys = Array.isArray(corp.projects) ? corp.projects : Object.keys(corp.projects || {}).filter(k => corp.projects[k] === true);
        const projCount = projKeys.length;

        tr.innerHTML = `
          <td class="p-2.5 font-bold text-white">
            <div class="flex items-center gap-2">
              <span>${corp.name}</span>
              <span class="px-1.5 py-0.2 bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[9px] font-bold rounded">Lvl ${corp.level || 1}</span>
            </div>
            <div class="text-[10px] text-slate-500 font-normal truncate max-w-xs">${corp.desc || 'لا يوجد وصف'}</div>
          </td>
          <td class="p-2.5 font-bold text-yellow-400 font-mono text-xs">${corp.founder}</td>
          <td class="p-2.5 text-center font-mono text-emerald-400 font-bold">${(corp.treasury || 0).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center font-mono text-slate-300 font-bold">${(corp.members || []).length} عضو</td>
          <td class="p-2.5 text-center">
            <span class="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-cyan-400 font-bold text-[10px]">${projCount} / 6 مشاريع</span>
          </td>
          <td class="p-2.5 text-left space-x-1 space-x-reverse">
            <button class="btn-admin-inspect-corp py-1 px-2.5 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 rounded font-bold transition text-[10px]"><i class="fa-solid fa-sliders ml-1"></i>فحص وتحكم</button>
            <button class="btn-admin-edit-corp-treasury py-1 px-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded font-bold transition text-[10px]">خزينة</button>
            <button class="btn-admin-delete-corp py-1 px-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded font-bold transition text-[10px]">تفكيك</button>
          </td>
        `;

        // Inspect Button
        tr.querySelector('.btn-admin-inspect-corp').addEventListener('click', () => {
          openAdminCorpInspectModal(corp);
        });

        // Edit Treasury Button
        tr.querySelector('.btn-admin-edit-corp-treasury').addEventListener('click', async () => {
          const currentTreasury = corp.treasury || 0;
          const val = prompt(`أدخل الرصيد الجديد لخزينة شركة "${corp.name}":`, currentTreasury);
          if (val === null || val.trim() === '') return;
          try {
            await AppDB.adminEditCorporationTreasury(corp.id, val);
            showToast('تعديل الخزينة', `تم تعديل رصيد خزينة شركة ${corp.name} بنجاح.`, 'success');
            logAdminAction(`تعديل خزينة الشركة المشتركة: ${corp.name}`);
          } catch (e) {
            showToast('خطأ تعديل الخزينة', e.message, 'error');
          }
        });

        // Delete Button
        tr.querySelector('.btn-admin-delete-corp').addEventListener('click', async () => {
          if (!confirm(`هل أنت متأكد تماماً من تفكيك وحذف شركة "${corp.name}" نهائياً من قاعدة البيانات؟\nلا يمكن استرجاع هذا الإجراء.`)) return;
          try {
            await AppDB.adminDeleteCorporation(corp.id);
            showToast('تفكيك شركة', `تم تفكيك وحذف شركة ${corp.name} بنجاح.`, 'success');
            logAdminAction(`تفكيك وحذف الشركة المشتركة: ${corp.name}`);
          } catch (e) {
            showToast('خطأ تفكيك شركة', e.message, 'error');
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
    if (lvlEl) lvlEl.textContent = `Lvl ${corp.level || 1}`;
    if (idEl) idEl.textContent = `ID: ${corp.id}`;

    // Basic Inputs
    const nameInput = document.getElementById('adm-corp-edit-name');
    const lvlInput = document.getElementById('adm-corp-edit-level');
    const descInput = document.getElementById('adm-corp-edit-desc');
    if (nameInput) nameInput.value = corp.name || '';
    if (lvlInput) lvlInput.value = corp.level || 1;
    if (descInput) descInput.value = corp.desc || '';

    // Treasury Display & Input
    const treasuryValEl = document.getElementById('adm-corp-modal-treasury-val');
    const treasuryInput = document.getElementById('adm-corp-edit-treasury-input');
    if (treasuryValEl) treasuryValEl.textContent = `${(corp.treasury || 0).toLocaleString()} EGP`;
    if (treasuryInput) treasuryInput.value = corp.treasury || 0;

    // Render Projects Grid
    const projGrid = document.getElementById('adm-corp-projects-grid');
    if (projGrid) {
      projGrid.innerHTML = '';
      Object.keys(ADMIN_CORP_MEGA_PROJECTS).forEach(pKey => {
        const pDef = ADMIN_CORP_MEGA_PROJECTS[pKey];
        const isActive = Array.isArray(corp.projects) ? corp.projects.includes(pKey) : !!(corp.projects && corp.projects[pKey]);
        const card = document.createElement('div');
        card.className = `p-3 rounded-xl border transition flex flex-col justify-between ${isActive ? 'bg-slate-900 border-violet-500/40 shadow-lg shadow-violet-950/20' : 'bg-slate-950/80 border-slate-800/80 opacity-75'}`;
        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-2">
                <i class="fa-solid ${pDef.icon} ${pDef.color}"></i>
                <span class="font-bold text-white text-xs">${pDef.name}</span>
              </div>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}">
                ${isActive ? 'مفعل ⚡' : 'معطل'}
              </span>
            </div>
            <p class="text-[10px] text-slate-400 mb-2">${pDef.desc}</p>
          </div>
          <button class="w-full py-1.5 rounded-lg font-bold text-[10px] transition flex items-center justify-center gap-1 ${isActive ? 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/30' : 'bg-violet-600 hover:bg-violet-500 text-white shadow'}">
            <i class="fa-solid ${isActive ? 'fa-toggle-off' : 'fa-toggle-on'}"></i>
            <span>${isActive ? 'إلغاء التفعيل' : 'تفعيل المشروع مجاناً'}</span>
          </button>
        `;

        card.querySelector('button').addEventListener('click', async () => {
          try {
            await AppDB.adminToggleCorpProject(corp.id, pKey, !isActive);
            showToast('تحديث مشاريع الشركة', `تم ${isActive ? 'إلغاء تفعيل' : 'تفعيل'} مشروع (${pDef.name}) بنجاح.`, 'success');
            logAdminAction(`تغيير حالة مشروع ${pDef.name} لشركة ${corp.name} إلى ${!isActive ? 'مفعل' : 'معطل'}`);
          } catch (e) {
            showToast('خطأ تفعيل المشروع', e.message, 'error');
          }
        });

        projGrid.appendChild(card);
      });
    }

    // Render Members Table
    const membersTbody = document.getElementById('adm-corp-members-table-body');
    if (membersTbody) {
      membersTbody.innerHTML = '';
      const members = corp.members || [];
      const totalContrib = corp.totalContributions || 0;

      if (members.length === 0) {
        membersTbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-slate-500">لا يوجد أعضاء في هذه الشركة.</td></tr>';
      } else {
        members.forEach(member => {
          const role = (corp.roles && corp.roles[member]) || (member === corp.founder ? 'founder' : 'member');
          const isFounder = role === 'founder' || member === corp.founder;
          const isCfo = role === 'cfo';
          const contrib = (corp.contributions && corp.contributions[member]) || 0;
          const sharePct = totalContrib > 0 ? ((contrib / totalContrib) * 100).toFixed(1) : (100 / members.length).toFixed(1);

          let roleBadge = '<span class="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[9px]">مساهم</span>';
          if (isFounder) roleBadge = '<span class="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold rounded text-[9px]"><i class="fa-solid fa-crown ml-1"></i>المؤسس</span>';
          else if (isCfo) roleBadge = '<span class="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold rounded text-[9px]"><i class="fa-solid fa-star ml-1"></i>CFO مدير مالي</span>';

          const tr = document.createElement('tr');
          tr.className = 'hover:bg-slate-850 transition border-b border-slate-800/40';
          tr.innerHTML = `
            <td class="p-2 font-bold text-white font-mono">${member}</td>
            <td class="p-2 text-center">${roleBadge}</td>
            <td class="p-2 text-center font-mono text-emerald-400 font-bold">${contrib.toLocaleString()} EGP</td>
            <td class="p-2 text-center font-mono text-sky-400 font-bold">${sharePct}%</td>
            <td class="p-2 text-left space-x-1 space-x-reverse">
              ${!isFounder ? `
                <button class="btn-adm-member-role py-0.5 px-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/20 rounded text-[9px] font-bold" title="تغيير الرتبة">${isCfo ? 'تنزيل لمساهم' : 'ترقية CFO'}</button>
                <button class="btn-adm-make-founder py-0.5 px-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-[9px] font-bold" title="نقل الملكية">تعيين مؤسس 👑</button>
                <button class="btn-adm-kick-member py-0.5 px-2 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/30 rounded text-[9px] font-bold" title="طرد العضو">طرد ❌</button>
              ` : '<span class="text-[10px] text-slate-500">مالك التحالف</span>'}
            </td>
          `;

          if (!isFounder) {
            // Role change button
            tr.querySelector('.btn-adm-member-role').addEventListener('click', async () => {
              const newRole = isCfo ? 'member' : 'cfo';
              try {
                await AppDB.adminSetCorpMemberRole(corp.id, member, newRole);
                showToast('تغيير الرتبة', `تم تغيير رتبة اللاعب ${member} إلى ${newRole === 'cfo' ? 'مدير مالي CFO' : 'مساهم عادي'}.`, 'success');
                logAdminAction(`تغيير رتبة ${member} في شركة ${corp.name} إلى ${newRole}`);
              } catch (e) {
                showToast('خطأ تغيير الرتبة', e.message, 'error');
              }
            });

            // Make founder button
            tr.querySelector('.btn-adm-make-founder').addEventListener('click', async () => {
              if (!confirm(`هل أنت متأكد من نقل ملكية وتأسيس شركة "${corp.name}" إلى اللاعب ${member}؟`)) return;
              try {
                await AppDB.adminTransferCorpFounder(corp.id, member);
                showToast('نقل الملكية', `تم تعيين اللاعب ${member} كمؤسس ومالك جديد لشركة ${corp.name}.`, 'success');
                logAdminAction(`نقل ملكية وتأسيس شركة ${corp.name} إلى ${member}`);
              } catch (e) {
                showToast('خطأ نقل الملكية', e.message, 'error');
              }
            });

            // Kick member button
            tr.querySelector('.btn-adm-kick-member').addEventListener('click', async () => {
              if (!confirm(`هل أنت متأكد من طرد اللاعب ${member} من شركة "${corp.name}"؟`)) return;
              try {
                await AppDB.adminKickCorpMember(corp.id, member);
                showToast('طرد عضو', `تم طرد اللاعب ${member} من شركة ${corp.name} بنجاح.`, 'success');
                logAdminAction(`طرد اللاعب ${member} من شركة ${corp.name}`);
              } catch (e) {
                showToast('خطأ طرد العضو', e.message, 'error');
              }
            });
          }

          membersTbody.appendChild(tr);
        });
      }
    }
  }

  function switchAdminTab(tabId) {
    const subtabs = ['stats', 'players', 'transfers', 'chat', 'market', 'broadcast', 'auctions', 'giftcodes', 'system', 'corporations'];
    subtabs.forEach(t => {
      const btn = document.getElementById(`tab-admin-${t}`);
      const panel = document.getElementById(`admin-subpanel-${t}`);
      if (!btn || !panel) return;
      if (t === tabId) {
        btn.classList.add('border-yellow-500/40', 'bg-yellow-500/10', 'text-yellow-400', 'active-admin-tab', 'active-admin-sidebar-btn');
        btn.classList.remove('border-transparent', 'text-slate-400', 'hover:bg-slate-900/60');
        panel.classList.remove('hidden');
      } else {
        btn.classList.remove('border-yellow-500/40', 'bg-yellow-500/10', 'text-yellow-400', 'active-admin-tab', 'active-admin-sidebar-btn');
        btn.classList.add('border-transparent', 'text-slate-400');
        panel.classList.add('hidden');
      }
    });

    // Auto-collapse mobile sidebar on tab change
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar && window.innerWidth < 768) {
      sidebar.classList.add('hidden');
    }

    if (tabId === 'stats') {
      renderAdminAnalyticsDashboard();
    } else if (tabId === 'players') {
      if (window._adminReloadPlayers) window._adminReloadPlayers(false);
    } else if (tabId === 'transfers') {
      renderAdminTransfersMonitor();
    } else if (tabId === 'chat') {
      renderAdminChatMonitor();
    } else if (tabId === 'market') {
      if (window._adminRenderStockPrices) window._adminRenderStockPrices();
      const currentCfg = GameEngine.getTaxConfig ? GameEngine.getTaxConfig() : null;
      if (currentCfg && window._adminSyncTaxInputs) window._adminSyncTaxInputs(currentCfg);
    } else if (tabId === 'auctions') {
      fetchAndRenderAdminAuctions();
      fetchAndRenderAdminLiveAuctions();
    } else if (tabId === 'giftcodes') {
      fetchAndRenderAdminGiftCodes();
    } else if (tabId === 'corporations') {
      renderAdminCorporationsPanel();
    } else if (tabId === 'system') {
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
        valText.textContent = `${mult.toFixed(1)}x أرباح وخبرة مضاعفة!`;
      } else {
        banner.classList.add('hidden');
      }
    }
  }

  function toggleAdminSidebarAction() {
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar) {
      if (sidebar.classList.contains('hidden')) {
        sidebar.classList.remove('hidden');
        sidebar.className = 'w-64 border-l border-slate-900 bg-slate-900/90 backdrop-blur-xl flex flex-col justify-between shrink-0 transition-all duration-300 fixed md:relative right-0 top-16 bottom-0 z-[510] md:flex';
      } else {
        sidebar.classList.add('hidden');
      }
    }
  }

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
      
      showToast('مضاعف السيرفر', newBoost > 1.0 ? 'تم تفعيل وضع مضاعف الأرباح والخبرة 2x للجميع! 🔥' : 'تم إيقاف مضاعف السيرفر والعودة للوضع الاعتيادي.', 'success');
      logAdminAction(`تحديث مضاعف السيرفر: تم تعيين المضاعف على ${newBoost.toFixed(1)}x`);
      
      await AppDB.sendBroadcast(
        newBoost > 1.0 ? '🔥 تفعيل مضاعف السيرفر (Server Boost)!' : 'ℹ️ انتهاء مضاعف السيرفر (Server Boost)',
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

  function logAdminAction(msg) {
    const targets = [
      document.getElementById('admin-action-logs'),
      document.getElementById('admin-stats-live-log')
    ];

    const time = new Date().toLocaleTimeString('ar-EG');
    targets.forEach(logBox => {
      if (!logBox) return;
      if (logBox.innerHTML.includes("لا يوجد عمليات مسجلة") || logBox.innerHTML.includes("Dyn live logs")) {
        logBox.innerHTML = '';
      }
      const entry = document.createElement('div');
      entry.className = 'border-b border-slate-900/60 pb-1 mb-1';
      entry.innerHTML = `<span class="text-yellow-500 font-bold ml-1 font-mono">[${time}]</span> ${msg}`;
      logBox.insertBefore(entry, logBox.firstChild);
    });
  }

  // ─────────────────────────────────────────────
  //  TRANSFER REQUESTS — UI Rendering & State
  // ─────────────────────────────────────────────
  let lastRequestsFetchTime = 0;
  let cachedIncomingRequests = [];
  let cachedSentRequests = [];
  let requestsTabActive = 'incoming';

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

    const pendingIncomingCount = cachedIncomingRequests.filter(r => r.status === 'pending' && (now - r.timestamp <= twentyFourHours)).length;
    const pendingSentCount = cachedSentRequests.filter(r => r.status === 'pending' && (now - r.timestamp <= twentyFourHours)).length;

    if (countIncomingEl) countIncomingEl.textContent = pendingIncomingCount;
    if (countSentEl) countSentEl.textContent = pendingSentCount;

    // Render Incoming Requests
    if (cachedIncomingRequests.length === 0) {
      incomingList.innerHTML = `<div class="text-center text-slate-500 text-xs py-8">لا يوجد طلبات واردة حالياً.</div>`;
    } else {
      incomingList.innerHTML = '';
      cachedIncomingRequests.forEach(r => {
        const age = now - r.timestamp;
        const isExpired = r.status === 'pending' && age > twentyFourHours;
        const remainingMs = twentyFourHours - age;

        let statusText = '';
        let statusClass = '';
        let actionButtons = '';

        if (r.status === 'accepted') {
          statusText = 'تم القبول والتحويل ✔️';
          statusClass = 'text-emerald-400 font-bold';
        } else if (r.status === 'rejected') {
          statusText = 'تم الرفض ❌';
          statusClass = 'text-rose-400 font-bold';
        } else if (isExpired) {
          statusText = 'منتهي الصلاحية (24س) ⚠️';
          statusClass = 'text-slate-500 font-bold';
        } else {
          const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
          const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          statusText = `معلق - متبقي ${remainingHours}س و ${remainingMins}د`;
          statusClass = 'text-yellow-400 font-bold';

          actionButtons = `
            <div class="flex gap-1.5 mt-2">
              <button data-id="${r.id}" class="btn-req-accept flex-grow py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded text-[10px] transition">قبول ودفع</button>
              <button data-id="${r.id}" class="btn-req-reject flex-grow py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded text-[10px] transition">رفض</button>
            </div>
          `;
        }

        const div = document.createElement('div');
        div.className = 'glass-panel p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between text-xs mb-2';
        div.innerHTML = `
          <div class="flex justify-between items-center mb-1">
            <span class="font-bold text-white">المرسل: ${r.sender}</span>
            <span class="numbers-font text-yellow-500 font-bold text-sm">${r.amount.toLocaleString()} EGP</span>
          </div>
          <div class="flex justify-between items-center text-[10px] text-slate-400">
            <span>الحالة: <span class="${statusClass}">${statusText}</span></span>
            <span class="numbers-font">${new Date(r.timestamp).toLocaleTimeString('ar-EG')}</span>
          </div>
          ${actionButtons}
        `;

        const acceptBtn = div.querySelector('.btn-req-accept');
        const rejectBtn = div.querySelector('.btn-req-reject');
        if (acceptBtn) {
          acceptBtn.addEventListener('click', async () => {
            try {
              acceptBtn.disabled = true;
              if (rejectBtn) rejectBtn.disabled = true;
              acceptBtn.textContent = 'جاري المعالجة...';

              await AppDB.acceptTransferRequest(r.id, username);
              showToast('موافقة الطلب', `تم قبول طلب التحويل ودفع ${r.amount.toLocaleString()} EGP بنجاح!`, 'success');

              const updatedState = await AppDB.getPlayerState(username);
              if (updatedState) {
                GameEngine.state.cash = updatedState.cash;
                GameEngine.state.bank = updatedState.bank;
                GameEngine.state.netWorth = updatedState.netWorth;
              }
              await fetchAndRenderTransferRequests(true);
              renderAll();
            } catch (err) {
              showToast('خطأ في قبول الطلب', err.message, 'error');
              acceptBtn.disabled = false;
              if (rejectBtn) rejectBtn.disabled = false;
              acceptBtn.textContent = 'قبول ودفع';
            }
          });
        }
        if (rejectBtn) {
          rejectBtn.addEventListener('click', async () => {
            try {
              if (acceptBtn) acceptBtn.disabled = true;
              rejectBtn.disabled = true;
              rejectBtn.textContent = 'جاري الرفض...';

              await AppDB.rejectTransferRequest(r.id, username);
              showToast('رفض الطلب', 'تم رفض طلب التحويل بنجاح.', 'info');

              await fetchAndRenderTransferRequests(true);
            } catch (err) {
              showToast('خطأ في رفض الطلب', err.message, 'error');
              if (acceptBtn) acceptBtn.disabled = false;
              rejectBtn.disabled = false;
              rejectBtn.textContent = 'رفض';
            }
          });
        }

        incomingList.appendChild(div);
      });
    }

    // Render Sent Requests
    if (cachedSentRequests.length === 0) {
      sentList.innerHTML = `<div class="text-center text-slate-500 text-xs py-8">لا يوجد طلبات مرسلة حالياً.</div>`;
    } else {
      sentList.innerHTML = '';
      cachedSentRequests.forEach(r => {
        const age = now - r.timestamp;
        const isExpired = r.status === 'pending' && age > twentyFourHours;
        const remainingMs = twentyFourHours - age;

        let statusText = '';
        let statusClass = '';

        if (r.status === 'accepted') {
          statusText = 'تم القبول والتحويل ✔️';
          statusClass = 'text-emerald-400 font-bold';
        } else if (r.status === 'rejected') {
          statusText = 'تم الرفض ❌';
          statusClass = 'text-rose-400 font-bold';
        } else if (isExpired) {
          statusText = 'منتهي الصلاحية ⚠️';
          statusClass = 'text-slate-500 font-bold';
        } else {
          const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
          const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          statusText = `معلق - متبقي ${remainingHours}س و ${remainingMins}د`;
          statusClass = 'text-yellow-400 font-bold';
        }

        const div = document.createElement('div');
        div.className = 'glass-panel p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between text-xs mb-2';
        div.innerHTML = `
          <div class="flex justify-between items-center mb-1">
            <span class="font-bold text-white">المستلم: ${r.recipient}</span>
            <span class="numbers-font text-yellow-500 font-bold text-sm">${r.amount.toLocaleString()} EGP</span>
          </div>
          <div class="flex justify-between items-center text-[10px] text-slate-400">
            <span>الحالة: <span class="${statusClass}">${statusText}</span></span>
            <span class="numbers-font">${new Date(r.timestamp).toLocaleTimeString('ar-EG')}</span>
          </div>
        `;
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

    shelf.innerHTML = `<div class="col-span-full text-center text-slate-500 text-xs py-12 flex flex-col items-center justify-center gap-2">
      <i class="fa-solid fa-spinner animate-spin text-amber-500 text-lg"></i>
      <span>جاري تحميل الصفقات المعروضة من السيرفر...</span>
    </div>`;

    try {
      const items = await AppDB.getAuctionItems();
      renderAuctionsShelfDOM(items);
    } catch (e) {
      shelf.innerHTML = `<div class="col-span-full text-center text-rose-400 text-xs py-12">فشل تحميل صفقات المزادات: ${e.message}</div>`;
    }

    renderPlayerCollectiblesDOM();
  }

  function renderAuctionsShelfDOM(items) {
    const shelf = document.getElementById('auctions-shelf');
    if (!shelf) return;

    if (!items || items.length === 0) {
      shelf.innerHTML = `<div class="col-span-full text-center text-slate-500 text-xs py-12">لا توجد مزادات أو صفقات نشطة حالياً.</div>`;
      return;
    }

    shelf.innerHTML = '';
    items.forEach(item => {
      const totalQty = Number(item.quantity || 0);
      const sold = Number(item.soldCount || 0);
      const remaining = Math.max(0, totalQty - sold);

      const isSoldOut = remaining <= 0;
      let btnHtml = '';

      if (isSoldOut) {
        btnHtml = `<button disabled class="w-full py-2 bg-slate-800 text-slate-500 font-bold rounded-lg text-xs cursor-not-allowed">نفذت الكمية ❌</button>`;
      } else {
        btnHtml = `<button data-id="${item.id}" class="btn-buy-auction-item w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black rounded-lg text-xs transition duration-200 shadow-md">شراء الآن 💰</button>`;
      }

      const card = document.createElement('div');
      card.className = 'glass-panel p-4.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3 relative overflow-hidden';
      if (isSoldOut) card.classList.add('opacity-60');

      card.innerHTML = `
        <div>
          <div class="flex justify-between items-start gap-2 mb-1.5">
            <h4 class="text-xs font-black text-white">${item.name}</h4>
            <span class="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded font-bold whitespace-nowrap">صفقة نادرة</span>
          </div>
          <p class="text-[10px] text-slate-400 leading-relaxed">${item.description || 'لا يوجد وصف متوفر.'}</p>
        </div>

        <div class="space-y-2 border-t border-slate-800/40 pt-2.5">
          <div class="flex justify-between items-center text-[10px]">
            <span class="text-slate-500">سعر الشراء الفوري</span>
            <span class="numbers-font text-yellow-500 font-black text-sm">${item.price.toLocaleString()} EGP</span>
          </div>
          <div class="flex justify-between items-center text-[10px]">
            <span class="text-slate-500">الكمية المتبقية</span>
            <span class="font-bold text-slate-300">${isSoldOut ? 'انتهى المعروض' : `${remaining} / ${totalQty} قطعة`}</span>
          </div>
        </div>

        ${btnHtml}
      `;

      const buyBtn = card.querySelector('.btn-buy-auction-item');
      if (buyBtn) {
        buyBtn.addEventListener('click', async () => {
          try {
            buyBtn.disabled = true;
            buyBtn.textContent = 'جاري الشراء...';

            const result = await AppDB.purchaseAuctionItem(item.id, GameEngine.activeUsername);

            showToast('تم الشراء بنجاح', `تهانينا! قمت بشراء "${result.name}" بسعر ${result.price.toLocaleString()} ج.م. تم إضافته لمقتنياتك النادرة.`, 'success');
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
            showToast('فشل الشراء', err.message, 'error');
            buyBtn.disabled = false;
            buyBtn.textContent = 'شراء الآن 💰';
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
      container.innerHTML = `<div class="col-span-full text-center text-slate-500 text-xs py-8">لم تقم بشراء أي مقتنيات نادرة من المزادات حتى الآن.</div>`;
      return;
    }

    container.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'glass-panel p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.02] flex flex-col justify-between space-y-2';

      const timeStr = new Date(item.timestamp).toLocaleDateString('ar-EG', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      card.innerHTML = `
        <div>
          <div class="flex justify-between items-center mb-1">
            <span class="font-black text-amber-400 text-xs flex items-center gap-1.5">
              <i class="fa-solid fa-gem text-[10px]"></i>
              <span>${item.name}</span>
            </span>
            <span class="numbers-font text-[10px] text-slate-500 font-bold">${item.price.toLocaleString()} ج.م</span>
          </div>
          <p class="text-[10px] text-slate-400">${item.description || 'لا يوجد وصف متوفر.'}</p>
        </div>
        <div class="text-[9px] text-slate-500 text-left border-t border-slate-800/40 pt-1.5 mt-1 font-mono">
          تملكها منذ: ${timeStr}
        </div>
      `;
      container.appendChild(card);
    });
  }

  function renderAuctionsTab() {
    const aucCashEl = document.getElementById('auction-player-cash');
    if (aucCashEl && GameEngine.state) {
      aucCashEl.textContent = `${GameEngine.state.cash.toLocaleString()} EGP`;
    }
    renderPlayerCollectiblesDOM();
  }

  async function fetchAndRenderAdminAuctions() {
    const tbody = document.getElementById('admin-auctions-list');
    if (!tbody) return;

    try {
      const items = await AppDB.getAuctionItems();
      if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500">لا توجد أغراض معروضة في المزادات حالياً.</td></tr>`;
        return;
      }

      tbody.innerHTML = '';
      items.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-800/60 hover:bg-slate-900/30 text-xs';

        const total = Number(item.quantity || 0);
        const sold = Number(item.soldCount || 0);
        const remaining = Math.max(0, total - sold);

        tr.innerHTML = `
          <td class="py-2.5 font-bold text-white">${item.name}</td>
          <td class="py-2.5 text-slate-400 max-w-[200px] truncate">${item.description || '-'}</td>
          <td class="py-2.5 text-center font-bold text-yellow-500 font-mono">${item.price.toLocaleString()} ج.م</td>
          <td class="py-2.5 text-center font-bold font-mono text-slate-300">${sold} مبيعة / ${remaining} متبقي (${total} إجمالي)</td>
          <td class="py-2.5 text-left">
            <button data-id="${item.id}" class="btn-admin-delete-auction py-1 px-3 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded font-bold transition text-[10px]">حذف المعروض</button>
          </td>
        `;

        const deleteBtn = tr.querySelector('.btn-admin-delete-auction');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            if (!confirm(`هل أنت متأكد من حذف الغرض "${item.name}" من المزادات؟`)) return;
            try {
              deleteBtn.disabled = true;
              deleteBtn.textContent = 'جاري الحذف...';
              await AppDB.adminDeleteAuctionItem(item.id);
              showToast('تم الحذف', 'تم حذف غرض المزاد بنجاح.', 'info');
              logAdminAction(`حذف غرض المزاد: ${item.name}`);
              fetchAndRenderAdminAuctions();
            } catch (err) {
              showToast('فشل الحذف', err.message, 'error');
              deleteBtn.disabled = false;
              deleteBtn.textContent = 'حذف المعروض';
            }
          });
        }

        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-rose-400">فشل تحميل قائمة المزادات الإدارية: ${e.message}</td></tr>`;
    }
  }

  let adminLiveAuctionsUnsubscribe = null;

  function fetchAndRenderAdminLiveAuctions() {
    const tbody = document.getElementById('admin-live-auctions-list');
    if (!tbody) return;

    if (adminLiveAuctionsUnsubscribe) {
      adminLiveAuctionsUnsubscribe();
      adminLiveAuctionsUnsubscribe = null;
    }

    tbody.innerHTML = '<tr><td colspan="7" class="py-4 text-center text-slate-500">جاري تحميل المزادات الحية...</td></tr>';

    adminLiveAuctionsUnsubscribe = AppDB.listenToLiveAuctions(list => {
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-500">لا توجد مزادات حية متزامنة حالياً في السيرفر.</td></tr>`;
        return;
      }

      tbody.innerHTML = '';
      list.forEach(auc => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-800/60 hover:bg-slate-900/30 text-xs';

        const regPlayers = auc.registeredPlayers || [];
        const regCount = regPlayers.length;
        const targetVal = auc.startConditionValue;
        const condTypeStr = auc.startConditionType === 'players' ? `${regCount} / ${targetVal} لاعبين` : `مؤقت زمني (${targetVal} د)`;

        let statusBadge = '<span class="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded font-bold text-[10px]">بانتظار المسجلين ⏳</span>';
        if (auc.status === 'active') {
          statusBadge = '<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold text-[10px] animate-pulse">نشط جاري المزايدة 🔥</span>';
        } else if (auc.status === 'ended') {
          statusBadge = '<span class="px-2 py-0.5 bg-slate-800 text-slate-400 rounded font-bold text-[10px]">منتهي ✅</span>';
        }

        const typeLabels = { item: 'غرض فريد', business: 'شركة تجارية', property: 'عقار استثماري' };

        tr.innerHTML = `
          <td class="py-2.5 font-bold text-white">
            <div>${auc.itemName}</div>
            <div class="text-[10px] text-slate-500 font-mono">${auc.id || '-'}</div>
          </td>
          <td class="py-2.5 text-slate-300">${typeLabels[auc.itemType] || auc.itemType}</td>
          <td class="py-2.5 text-center font-bold text-yellow-500 font-mono">${(auc.currentBid || auc.basePrice || 0).toLocaleString()} ج.م</td>
          <td class="py-2.5 text-center font-bold text-sky-400 font-mono">${condTypeStr}</td>
          <td class="py-2.5 text-center">${statusBadge}</td>
          <td class="py-2.5 text-center font-bold text-emerald-400">${auc.highestBidder || 'لا يوجد'}</td>
          <td class="py-2.5 text-left space-x-1 space-x-reverse">
            ${auc.status === 'pending' ? `<button data-id="${auc.id}" class="btn-admin-start-live-auc py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition text-[10px]">بدء فوري ⚡</button>` : ''}
            <button data-id="${auc.id}" data-name="${auc.itemName}" class="btn-admin-delete-live-auc py-1 px-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded font-bold transition text-[10px]">حذف المزاد</button>
          </td>
        `;

        const startBtn = tr.querySelector('.btn-admin-start-live-auc');
        if (startBtn) {
          startBtn.addEventListener('click', async () => {
            try {
              startBtn.disabled = true;
              await AppDB.adminStartLiveAuction(auc.id);
              showToast('بدء المزاد', `تم بدء المزاد الحي (${auc.itemName}) بنجاح!`, 'success');
              logAdminAction(`بدء المزاد الحي يدوياً: ${auc.itemName}`);
            } catch (err) {
              showToast('خطأ بدء المزاد', err.message, 'error');
              startBtn.disabled = false;
            }
          });
        }

        const deleteBtn = tr.querySelector('.btn-admin-delete-live-auc');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            if (!confirm(`هل أنت متأكد من حذف المزاد الحي "${auc.itemName}" نهائياً من السيرفر؟`)) return;
            try {
              deleteBtn.disabled = true;
              await AppDB.adminDeleteLiveAuction(auc.id);
              showToast('تم الحذف', 'تم حذف المزاد الحي بنجاح.', 'info');
              logAdminAction(`حذف المزاد الحي: ${auc.itemName}`);
            } catch (err) {
              showToast('خطأ حذف المزاد', err.message, 'error');
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
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500">لا توجد أكواد هدايا نشطة حالياً.</td></tr>`;
        return;
      }

      tbody.innerHTML = '';
      codes.forEach(code => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-800/60 hover:bg-slate-900/30 text-xs';

        let rewardDesc = '';
        if (code.rewardType === 'cash') {
          rewardDesc = `${Number(code.rewardDetails.amount || 0).toLocaleString()} ج.م`;
        } else if (code.rewardType === 'business') {
          const businessNames = {
            coffee: 'عربة قهوة مختصة',
            supermarket: 'سوبر ماركت',
            tech: 'شركة برمجيات وتطبيقات',
            logistics: 'شركة شحن ولوجستيات',
            solar_factory: 'محطة طاقة شمسية',
            private_hospital: 'مستشفى خاص',
            media_studio: 'ستوديو إنتاج إعلامي',
            private_bank: 'بنك استثماري خاص',
            oil_refinery: 'مصفاة بترول وتكرير',
            space_tech: 'شركة استكشاف الفضاء'
          };
          const bName = businessNames[code.rewardDetails.businessId] || code.rewardDetails.businessId;
          rewardDesc = `${bName} (مستوى ${code.rewardDetails.level} | عمال ${code.rewardDetails.workers})`;
        } else if (code.rewardType === 'item') {
          const itemNames = {
            gold_pen: 'القلم الذهبي للمدراء',
            premium_lawyer: 'توكيل محامٍ دولي',
            energy_drink: 'مشروب الطاقة والتركيز',
            tax_shield: 'درع الإعفاء الضريبي',
            market_scanner: 'ماسح البورصة والتداول',
            vip_casino_pass: 'بطاقة VIP للكازينو',
            quantum_cpu: 'معالج الحوسبة الكمومية',
            diamond_card: 'عضوية النادي الماسي',
            cronos_gear: 'ساعة الكرونوس'
          };
          const itName = itemNames[code.rewardDetails.itemId] || code.rewardDetails.itemId;
          rewardDesc = itName;
        }

        const maxStr = code.maxUses > 0 ? `${code.maxUses}` : '♾️';
        const usageText = `${code.usedCount || 0} / ${maxStr}`;

        tr.innerHTML = `
          <td class="py-2.5 font-black text-emerald-400 font-mono">${code.id}</td>
          <td class="py-2.5 text-slate-300 font-bold">${code.rewardType === 'cash' ? 'مالي 💰' : code.rewardType === 'business' ? 'أملاك/شركة 🏢' : 'أداة 🎒'}</td>
          <td class="py-2.5 text-center text-slate-400 font-bold">${rewardDesc}</td>
          <td class="py-2.5 text-center font-bold font-mono text-slate-300">${usageText}</td>
          <td class="py-2.5 text-left">
            <button data-id="${code.id}" class="btn-admin-delete-giftcode py-1 px-3 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded font-bold transition text-[10px]">حذف الكود</button>
          </td>
        `;

        const deleteBtn = tr.querySelector('.btn-admin-delete-giftcode');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            if (!confirm(`هل أنت متأكد من حذف كود الهدية "${code.id}"؟`)) return;
            try {
              deleteBtn.disabled = true;
              deleteBtn.textContent = 'جاري الحذف...';
              await AppDB.adminDeleteGiftCode(code.id);
              showToast('تم الحذف', 'تم حذف كود الهدية بنجاح.', 'info');
              logAdminAction(`حذف كود الهدية: ${code.id}`);
              fetchAndRenderAdminGiftCodes();
            } catch (err) {
              showToast('فشل الحذف', err.message, 'error');
              deleteBtn.disabled = false;
              deleteBtn.textContent = 'حذف الكود';
            }
          });
        }

        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-rose-400">فشل تحميل الأكواد: ${e.message}</td></tr>`;
    }
  }

  // ─────────────────────────────────────────────
  //  V2 variables & handlers
  // ─────────────────────────────────────────────
  let lastChatSent = 0;
  let currentActiveDMUser = '';
  let mailboxActiveTab = 'inbox';
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
          unreadDot.textContent = '0';
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
        charCounter.textContent = `${chatInput.value.length} / 200`;
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
          await AppDB.sendChatMessage(GameEngine.state.username, GameEngine.state.title, text);
          chatInput.value = '';
          charCounter.textContent = '0 / 200';
          lastChatSent = Date.now();
        } catch (err) {
          showToast('خطأ إرسال', err.message, 'error');
        } finally {
          chatSendBtn.disabled = false;
        }
      });

      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') chatSendBtn.click();
      });
    }

    const adminSendMsgBtn = document.getElementById('btn-admin-send-monitoring-msg');
    if (adminSendMsgBtn) {
      adminSendMsgBtn.addEventListener('click', async () => {
        try {
          adminSendMsgBtn.disabled = true;
          const msg = "⚠️ تنبيه من الإدارة: الإدارة تراقب الشات حالياً. يرجى الالتزام بالقوانين.";
          await AppDB.sendChatMessage("الإدارة", "رسمي", msg);
          showToast('تم الإرسال', 'تم إرسال تنبيه مراقبة الشات بنجاح.', 'success');
        } catch (err) {
          showToast('خطأ إرسال', err.message, 'error');
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
          await AppDB.sendMail(GameEngine.state.username, currentActiveDMUser, 'dm', { message: text });
          dmInput.value = '';
        } catch (err) {
          showToast('خطأ إرسال خاصة', err.message, 'error');
        }
      });
      dmInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnSendDM.click();
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
          await AppDB.sendMail(GameEngine.state.username, target, 'friend_request', {});
          showToast('طلب صداقة', `تم إرسال طلب صداقة إلى ${target} بنجاح!`, 'success');
        } catch (err) {
          showToast('خطأ طلب صداقة', err.message, 'error');
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
          btnProfileBlock.innerHTML = '<i class="fa-solid fa-ban"></i> <span>حظر اللاعب</span>';
          showToast('إلغاء حظر', `تم إلغاء حظر اللاعب ${target}.`, 'info');
        } else {
          GameEngine.state.blockedUsers.push(target);
          btnProfileBlock.innerHTML = '<i class="fa-solid fa-ban"></i> <span class="text-rose-500">إلغاء الحظر</span>';
          showToast('حظر اللاعب', `تم حظر اللاعب ${target}. لن تظهر رسائله في الشات العام.`, 'warning');
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
        const salary = parseInt(salaryInput.value || '0');

        if (!businessId || !role || salary <= 0) {
          showToast('خطأ إدخال', 'يرجى ملء جميع حقول عقد التوظيف براتب صحيح أكبر من الصفر.', 'error');
          return;
        }

        try {
          const bizName = GameEngine.state.businesses[businessId].name || businessId;
          await AppDB.sendMail(GameEngine.state.username, target, 'job_offer', {
            businessId,
            businessName: bizName,
            role,
            salary
          });
          document.getElementById('job-offer-form-modal').classList.add('hidden');
          showToast('عقد توظيف', `تم إرسال عرض العمل إلى ${target} بنجاح!`, 'success');
        } catch (err) {
          showToast('خطأ عقد التوظيف', err.message, 'error');
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
        const sharePct = parseInt(shareInput.value || '0');

        if (!businessId || sharePct <= 0 || sharePct >= 100) {
          showToast('خطأ إدخال', 'يرجى إدخال نسبة مئوية صحيحة بين 1% و 99%.', 'error');
          return;
        }

        try {
          const bizName = GameEngine.state.businesses[businessId].name || businessId;
          await AppDB.sendMail(GameEngine.state.username, target, 'partnership_invite', {
            businessId,
            businessName: bizName,
            sharePct: sharePct / 100
          });
          document.getElementById('partnership-form-modal').classList.add('hidden');
          showToast('دعوة شراكة', `تم إرسال دعوة الشراكة الاستثمارية إلى ${target} بنجاح!`, 'success');
        } catch (err) {
          showToast('خطأ الشراكة', err.message, 'error');
        }
      });
    }

    const submitRiddleBtn = document.getElementById('btn-submit-riddle');
    if (submitRiddleBtn) {
      submitRiddleBtn.addEventListener('click', () => {
        const answerInput = document.getElementById('riddle-answer-input');
        const typedVal = parseInt(answerInput.value || '');
        if (typedVal === window.activeRiddleAnswer) {
          GameEngine.state.lastPuzzleSolved = Date.now();
          AppDB.savePlayerState(GameEngine.activeUsername, GameEngine.state);
          document.getElementById('riddle-verification-modal').classList.add('hidden');
          showToast('تم التحقق بنجاح! 🎉', 'لقد أثبت وجودك البشري، تم صرف راتبك وتنشيط بونوص الشركة +30% لـ 24 ساعة القادمة.', 'success');
          renderAll();
        } else {
          showToast('إجابة خاطئة ❌', 'المعادلة الرياضية خاطئة، يرجى المحاولة والتركيز ثانية.', 'error');
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
          showToast('خطأ اختيار', 'يرجى اختيار نسخة احتياطية أولاً.', 'error');
          return;
        }
        const bState = await AppDB.getPlayerBackupState(targetUser, selectedDate);
        if (bState) {
          const blob = new Blob([JSON.stringify(bState, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `backup_${targetUser}_${selectedDate}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('تم التنزيل', 'تم تحميل ملف النسخة الاحتياطية بنجاح.', 'success');
        }
      });
    }

    if (adminRestoreSelectedBtn) {
      adminRestoreSelectedBtn.addEventListener('click', async () => {
        const targetUser = document.getElementById('admin-p-username').textContent;
        const selectedDate = adminBackupsSelect.value;
        if (!selectedDate) {
          showToast('خطأ اختيار', 'يرجى اختيار تاريخ للنسخة الاحتياطية.', 'error');
          return;
        }
        if (confirm(`هل أنت متأكد من رغبتك في استعادة حساب اللاعب ${targetUser} إلى نسخة تاريخ ${selectedDate}؟ سيتم محو البيانات الحالية.`)) {
          const bState = await AppDB.getPlayerBackupState(targetUser, selectedDate);
          if (bState) {
            await AppDB.adminRestorePlayerFromState(targetUser, bState);
            showToast('تم الاسترجاع', `تمت استعادة حساب اللاعب ${targetUser} بنجاح من قاعدة البيانات.`, 'success');
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
                showToast('تنبيه عدم مطابقة', `اسم اللاعب في ملف الاحتياطي (${parsed.username}) لا يطابق اللاعب الذي تقوم بفحصه حالياً (${targetUser})!`, 'warning');
              }
              selectedRestoreFileContent = parsed;
              document.getElementById('restore-file-name-label').textContent = file.name;
              uploadRestoreBtn.disabled = false;
            } catch (err) {
              showToast('خطأ قراءة ملف', 'الملف الاحتياطي غير صالح أو معطوب.', 'error');
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
            showToast('استيراد ناجح! 🎉', `تم رفع الملف الخارجي واستعادة الحساب بالكامل لـ ${targetUser}.`, 'success');
            selectedRestoreFileContent = null;
            document.getElementById('restore-file-name-label').textContent = 'اختر ملف JSON الاحتياطي...';
            uploadRestoreBtn.disabled = true;
            fileInput.value = '';

            const updatedState = await AppDB.getPlayerState(targetUser);
            if (updatedState) loadAdminPlayerWorkspace(updatedState);
          } catch (err) {
            showToast('فشل الاستعادة', err.message, 'error');
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
        const basePrice = parseInt(priceInput.value || '0');
        const condType = condTypeSelect.value;
        const condVal = parseInt(condValInput.value || '0');

        if (!name || basePrice <= 0 || condVal <= 0) {
          showToast('خطأ إدخال', 'يرجى ملء جميع تفاصيل المزاد الحي الجديد بقيم صحيحة.', 'error');
          return;
        }

        try {
          adminCreateLiveAuctionBtn.disabled = true;
          let startVal = condVal;
          if (condType === 'time') {
            startVal = Date.now() + (condVal * 60 * 1000);
          }

          await AppDB.adminCreateLiveAuction(type, 'live_' + Math.random().toString(36).substr(2, 9), name, basePrice, condType, startVal);
          showToast('تم إطلاق المزاد الحي', `تم إدراج المزاد الحي (${name}) في السيرفر بنجاح وهو بانتظار المسجلين.`, 'success');

          nameInput.value = '';
          priceInput.value = '';
          condValInput.value = '';
        } catch (err) {
          showToast('فشل المزاد', err.message, 'error');
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

        const name = (nameInput?.value || '').trim();
        const founder = (founderInput?.value || '').trim();
        const treasury = parseFloat(treasuryInput?.value || '0');
        const desc = (descInput?.value || '').trim();

        if (!name || !founder) {
          showToast('بيانات غير مكتملة', 'يرجى إدخال اسم الشركة واسم المؤسس.', 'error');
          return;
        }

        try {
          btnCreateCorp.disabled = true;
          await AppDB.adminCreateCorporation(name, founder, desc, treasury);
          showToast('تأسيس ناجح 🏢', `تم إنشاء وإدراج شركة "${name}" وتعيين ${founder} كمؤسس.`, 'success');
          logAdminAction(`تأسيس شركة جديدة من لوحة الأدمن: ${name} (المؤسس: ${founder})`);

          if (nameInput) nameInput.value = '';
          if (founderInput) founderInput.value = '';
          if (treasuryInput) treasuryInput.value = '0';
          if (descInput) descInput.value = '';
        } catch (e) {
          showToast('فشل إنشاء الشركة', e.message, 'error');
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
        const name = (document.getElementById('adm-corp-edit-name')?.value || '').trim();
        const level = parseInt(document.getElementById('adm-corp-edit-level')?.value || '1');
        const desc = (document.getElementById('adm-corp-edit-desc')?.value || '').trim();

        if (!name) {
          showToast('خطأ إدخال', 'اسم الشركة لا يمكن أن يكون فارغاً.', 'error');
          return;
        }

        try {
          btnSaveBasic.disabled = true;
          await AppDB.adminUpdateCorp(activeInspectedCorp.id, {
            name,
            level: Math.max(1, Math.min(10, level || 1)),
            desc
          });
          showToast('تم الحفظ', `تم تحديث بيانات ومستوى شركة "${name}" بنجاح.`, 'success');
          logAdminAction(`تحديث بيانات شركة ${activeInspectedCorp.id}: اسم=${name}, مستوى=${level}`);
        } catch (e) {
          showToast('فشل حفظ البيانات', e.message, 'error');
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
          showToast('تم تحديث الخزينة', `تم ضبط رصيد خزينة شركة ${activeInspectedCorp.name} إلى ${parseFloat(amount || 0).toLocaleString()} EGP.`, 'success');
          logAdminAction(`تعديل خزينة شركة ${activeInspectedCorp.name} إلى ${amount}`);
        } catch (e) {
          showToast('فشل تعديل الخزينة', e.message, 'error');
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
        const pct = parseFloat(pctInput?.value || '25');

        if (!confirm(`هل أنت متأكد من صرف وتوزيع ${pct}% من خزينة شركة "${activeInspectedCorp.name}" مباشرة على كاش جميع المساهمين؟`)) return;

        try {
          btnDistributeDividends.disabled = true;
          await AppDB.adminDistributeCorpDividends(activeInspectedCorp.id, pct);
          showToast('توزيع الأرباح 🎉', `تم بنجاح توزيع ${pct}% من خزينة الشركة على جميع المساهمين بالتناسب وإيداعها في كاش حساباتهم.`, 'success');
          logAdminAction(`صرف وتوزيع أرباح بنسبة ${pct}% من خزينة شركة ${activeInspectedCorp.name}`);
        } catch (e) {
          showToast('فشل توزيع الأرباح', e.message, 'error');
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