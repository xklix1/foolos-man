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

    // Tabs logic - bind all 9 subtabs
    const tabs = ['stats', 'players', 'transfers', 'market', 'broadcast', 'auctions', 'giftcodes', 'system', 'corporations'];
    tabs.forEach(t => {
      const tabEl = document.getElementById(`tab-admin-${t}`);
      if (tabEl) {
        tabEl.addEventListener('click', () => {
          switchAdminTab(t);
        });
      }
    });

    // Setup Simulated Telemetry & real Latency Updates
    setInterval(() => {
      if (!modal.classList.contains('hidden')) {
        // CPU simulation: fluctuates between 0.5% and 2.8%
        const cpuEl = document.getElementById('adm-telemetry-cpu');
        if (cpuEl) {
          cpuEl.textContent = (0.5 + Math.random() * 2.3).toFixed(1) + '%';
        }
        
        // RAM simulation: fluctuates between 40 MB and 52 MB
        const ramEl = document.getElementById('adm-telemetry-ram');
        if (ramEl) {
          ramEl.textContent = Math.floor(40 + Math.random() * 12) + ' MB';
        }
        
        // Latency ping
        const latencyEl = document.getElementById('adm-telemetry-latency');
        if (latencyEl) {
          const t0 = Date.now();
          firebase.firestore().collection('globals').doc('serverConfig').get()
            .then(() => {
              const t1 = Date.now();
              latencyEl.textContent = (t1 - t0) + 'ms';
            })
            .catch(() => {
              latencyEl.textContent = Math.floor(30 + Math.random() * 20) + 'ms';
            });
        }
      }
    }, 3000);

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

    async function loadAdminPlayersDirectory(showToastNotice = false) {
      if (!playersTableBody) return;
      playersTableBody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-slate-400">جاري فحص وتحديث بيانات اللاعبين...</td></tr>';
      try {
        cachedPlayers = await AppDB.adminGetAllPlayers();
        renderPlayersTable();
        updateFilterCounts();
        if (showToastNotice) {
          showToast('قائمة اللاعبين', `تم جلب بيانات ${cachedPlayers.length} لاعب بنجاح.`, 'success');
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
      if (elTotal) elTotal.textContent = `${countAll} لاعب مسجل`;
    }

    function renderPlayersTable() {
      if (!playersTableBody) return;
      const query = (searchInput ? searchInput.value.trim().toLowerCase() : '');

      let filtered = cachedPlayers.filter(p => {
        const matchesQuery = !query || p.username.toLowerCase().includes(query) || (p.title && p.title.toLowerCase().includes(query));
        if (!matchesQuery) return false;

        if (activeFilter === 'jailed') return p.jailTimer > 0;
        if (activeFilter === 'banned') return p.isBanned;
        return true;
      });

      if (filtered.length === 0) {
        playersTableBody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-slate-500">لا يوجد حسابات مطابقة لمعايير البحث الحالية.</td></tr>';
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
          <td class="p-2.5 text-center numbers-font font-bold text-yellow-400">${(p.netWorth || 0).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center numbers-font font-bold text-emerald-400">${(p.cash || 0).toLocaleString()} EGP</td>
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
          const tickIncome = GameEngine.calculatePassiveIncomePerTick(true); // Exclude wealth tax for true gross
          const taxReport = GameEngine.calculateTaxReport();

          grossIncomePerSecond = Math.max(0, tickIncome / 3);
          taxPerSecond = (state.netWorth || 0) > 3000000 ? (taxReport.taxPerSecond / 3) : 0;
          netIncomePerSecond = Math.max(0, grossIncomePerSecond - taxPerSecond);
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
        renderPlayersTable();
        renderPlayerPossessions(state);
        loadAdminPlayerWorkspace(state);
        logAdminAction(`تم فتح ملف الحساب للاعب: ${username}`);
      } catch (err) {
        showToast('خطأ فحص اللاعب', err.message, 'error');
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
            localStorage.setItem(`foolos_state_${selectedPlayer}`, JSON.stringify(GameEngine.state));
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
          const tickIncome = GameEngine.calculatePassiveIncomePerTick(true); // Exclude wealth tax for true gross
          const taxReport = GameEngine.calculateTaxReport();

          grossIncomePerSecond = Math.max(0, tickIncome / 3);
          taxPerSecond = (selectedPlayerState.netWorth || 0) > 3000000 ? (taxReport.taxPerSecond / 3) : 0;
          netIncomePerSecond = Math.max(0, grossIncomePerSecond - taxPerSecond);
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
          downloadAnchor.setAttribute("download", `foolos_player_${selectedPlayer}_backup.json`);
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
        loadAdminPlayersDirectory(true);
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
              localStorage.setItem(`foolos_state_${selectedPlayer}`, JSON.stringify(GameEngine.state));
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
              localStorage.setItem(`foolos_state_${selectedPlayer}`, JSON.stringify(GameEngine.state));
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
        if (!selectedPlayer) return;
        try {
          const pState = await AppDB.adminGetPlayer(selectedPlayer);
          selectedPlayerState = pState;
          document.getElementById('adm-log-modal-username').textContent = `@${selectedPlayer}`;
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

    // --- Account Integrity & Security Audit System ---
    function performAccountAudit(p) {
      const findings = [];
      let score = 100;

      const xp = p.xp || 0;
      const careerLevel = p.careerLevel || 0;
      const cash = p.cash || 0;
      const bank = p.bank || 0;
      const dirty = p.dirtyCash || 0;
      const rep = p.underworldRep || 0;
      const loan = p.bankLoan || 0;
      const worth = p.netWorth || 0;
      
      // 1. Career XP Integrity Check
      if (careerLevel >= 8 && xp < 5000) {
        findings.push({
          type: 'danger',
          title: 'تلاعب بمرتبة المسار المهني',
          desc: `اللاعب وصل لمرتبة عالية جداً (${careerLevel}) برصيد خبرة ضئيل جداً (${xp.toLocaleString()} XP). هذا يدل على تعديل مباشر لقاعدة البيانات أو استخدام ثغرة لترقية الرتبة دون عمل.`
        });
        score -= 40;
      } else if (careerLevel >= 5 && xp < 1000) {
        findings.push({
          type: 'warning',
          title: 'شبهة ترقية بدون خبرة كافية',
          desc: `نقاط خبرة اللاعب (${xp}) منخفضة مقارنة بمرتبته الوظيفية الحالية (${careerLevel}).`
        });
        score -= 20;
      } else {
        findings.push({
          type: 'success',
          title: 'تكامل المسار المهني سليم',
          desc: `نقاط الخبرة (${xp.toLocaleString()} XP) متناسبة بشكل طبيعي مع الرتبة الحالية.`
        });
      }

      // 2. Business Income & Cash Audit
      let totalBizLevels = 0;
      if (p.businesses) {
        Object.keys(p.businesses).forEach(k => {
          if (p.businesses[k]) totalBizLevels += p.businesses[k].level || 0;
        });
      }
      const totalLiquid = cash + bank;
      if (totalLiquid > 100000000 && totalBizLevels === 0 && careerLevel < 4) {
        findings.push({
          type: 'danger',
          title: 'تضخم مالي غير مبرر (أرباح وهمية)',
          desc: `اللاعب يمتلك سيولة نقدية ضخمة (${totalLiquid.toLocaleString()} EGP) بدون امتلاك أي مشاريع تجارية نشطة أو وظيفة ذات دخل مرتفع. شبهة حقن أموال أو ثغرة برمجية.`
        });
        score -= 50;
      } else if (totalLiquid > 20000000 && totalBizLevels === 0) {
        findings.push({
          type: 'warning',
          title: 'سيولة مرتفعة بدون أصول تجارية',
          desc: `السيولة الكلية تتخطى 20 مليون EGP مع انعدام وجود أي مشاريع تجارية نشطة للإنتاج التلقائي.`
        });
        score -= 15;
      } else {
        findings.push({
          type: 'success',
          title: 'العلاقة بين السيولة والأصول سليمة',
          desc: `ثروة اللاعب مدعومة بمسار إنتاجي مالي شرعي أو مشاريع نشطة بمستوى إجمالي ${totalBizLevels}.`
        });
      }

      // 3. Dirty Cash vs Smuggling Rep Audit
      if (dirty > 20000000 && rep < 50) {
        findings.push({
          type: 'danger',
          title: 'حقن كاش قذر مباشر',
          desc: `اللاعب لديه أموال تهريب قذرة تفوق 20 مليون EGP ولكن سمعته بالسوق السوداء (${rep}) منخفضة جداً. هذا يعني أنه تم تعديل الكاش القذر مباشرة دون تنفيذ عمليات تهريب حقيقية.`
        });
        score -= 30;
      } else if (dirty > 5000000 && rep < 10) {
        findings.push({
          type: 'warning',
          title: 'تضخم الكاش القذر مقارنة بالسمعة',
          desc: `لدى اللاعب كاش قذر بقيمة ${dirty.toLocaleString()} EGP مع مستوى سمعة ضعيف (${rep}) بالسوق السوداء.`
        });
        score -= 15;
      } else {
        findings.push({
          type: 'success',
          title: 'أموال السوق السوداء متطابقة',
          desc: `قيمة الكاش القذر متناسبة مع نقاط السمعة الإجرامية والنشاط التهريبي.`
        });
      }

      // 4. Loan Fraud Check
      if (loan > 20000000 && totalLiquid > 100000000) {
        findings.push({
          type: 'warning',
          title: 'تهرب من سداد القروض البنكية',
          desc: `يمتلك اللاعب سيولة تتخطى 100 مليون EGP ولم يقم بسداد قروض بنكية متراكمة تتجاوز ${loan.toLocaleString()} EGP.`
        });
        score -= 10;
      } else {
        findings.push({
          type: 'success',
          title: 'سجل القروض البنكية سليم',
          desc: `لا توجد شبهات تجميد قروض أو تهرب مالي ملحوظ.`
        });
      }

      // 5. Net Worth Consistency
      if (worth <= 0 && totalLiquid > 1000000) {
        findings.push({
          type: 'danger',
          title: 'خلل في حساب صافي الثروة (Net Worth Overflow)',
          desc: `صافي الثروة المسجل (${worth.toLocaleString()} EGP) منهار أو سلبي على الرغم من امتلاك سيولة نقدية حقيقية مرتفعة. يشير إلى تلاعب بالبيانات أو مشكلة تلف بالملف.`
        });
        score -= 25;
      }

      // Calculate final security state
      let status = 'آمن وسليم 🟢';
      let badgeClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      if (score < 40) {
        status = 'مخترق / مشبوه بشدة 🔴';
        badgeClass = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      } else if (score < 80) {
        status = 'مستدعي للشك 🟡';
        badgeClass = 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      }

      return {
        score: Math.max(0, score),
        status,
        badgeClass,
        findings
      };
    }

    const fraudCheckBtn = document.getElementById('btn-admin-fraud-check');
    const auditModal = document.getElementById('admin-audit-modal');
    const closeAuditBtn = document.getElementById('btn-close-admin-audit');
    const closeAuditFooterBtn = document.getElementById('btn-close-admin-audit-footer');

    if (fraudCheckBtn && auditModal) {
      fraudCheckBtn.addEventListener('click', async () => {
        if (!selectedPlayer) {
          showToast('فحص الأمان', 'يرجى تحديد لاعب أولاً.', 'warning');
          return;
        }
        try {
          fraudCheckBtn.disabled = true;
          const pState = await AppDB.adminGetPlayer(selectedPlayer);
          if (!pState) throw new Error("تعذر جلب بيانات اللاعب.");

          const report = performAccountAudit(pState);

          document.getElementById('audit-target-username').textContent = `@${selectedPlayer}`;
          
          const safetyBadge = document.getElementById('audit-safety-badge');
          if (safetyBadge) {
            safetyBadge.textContent = `${report.status} (درجة النزاهة: ${report.score}%)`;
            safetyBadge.className = `px-2.5 py-1 rounded-lg font-bold text-xs ${report.badgeClass}`;
          }

          const reportBody = document.getElementById('audit-report-body');
          if (reportBody) {
            reportBody.innerHTML = report.findings.map(f => {
              let icon = '🟢';
              let color = 'text-emerald-400';
              let bg = 'bg-emerald-950/20 border-emerald-500/20';
              if (f.type === 'warning') {
                icon = '🟡';
                color = 'text-yellow-400';
                bg = 'bg-yellow-950/20 border-yellow-500/20';
              } else if (f.type === 'danger') {
                icon = '🔴';
                color = 'text-rose-400';
                bg = 'bg-rose-950/30 border-rose-500/30';
              }
              return `<div class="p-3 rounded-xl border ${bg} space-y-1">
                <div class="flex items-center gap-1.5 font-bold ${color}">
                  <span>${icon}</span>
                  <span>${f.title}</span>
                </div>
                <p class="text-[11px] text-slate-300 leading-relaxed">${f.desc}</p>
              </div>`;
            }).join('');
          }

          playCasinoSound('win');
          auditModal.classList.remove('hidden');

        } catch (e) {
          showToast('خطأ فحص الأمان', e.message, 'error');
        } finally {
          fraudCheckBtn.disabled = false;
        }
      });
    }

    const hideAuditModal = () => {
      playCasinoSound('click');
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

    // ─────────────────────────────────────────────
    //  MODULE: SYSTEM & DANGER ZONE
    // ─────────────────────────────────────────────
    const maintToggleBtn = document.getElementById('btn-admin-toggle-maintenance');
    if (maintToggleBtn) {
      AppDB.getMaintenanceStatus().then(st => {
        updateMaintenanceUIState(st && st.enabled);
      });

      maintToggleBtn.addEventListener('click', async () => {
        const currentSt = await AppDB.getMaintenanceStatus();
        const nextState = !Boolean(currentSt && currentSt.enabled);

        const confirmMsg = nextState
          ? "هل أنت متأكد من رغبتك في إغلاق اللعبة وتفعيل وضع الصيانة لجميع اللاعبين؟"
          : "هل تريد إنهاء وضع الصيانة وإتاحة اللعبة للجميع مجدداً؟";

        if (!confirm(confirmMsg)) return;

        try {
          await AppDB.setMaintenanceMode(nextState);
          updateMaintenanceUIState(nextState);
          if (nextState) {
            showToast('وضع الصيانة نشط', 'تم إغلاق الخوادم وتفعيل وضع الصيانة.', 'warning');
            logAdminAction('تفعيل وضع الصيانة الشامل وإغلاق الخوادم');
          } else {
            showToast('إنهاء الصيانة', 'تم إنهاء وضع الصيانة وفتح الخوادم للجميع.', 'success');
            logAdminAction('إلغاء وضع الصيانة وإعادة فتح الخوادم');
          }
        } catch (err) {
          showToast('فشل وضع الصيانة', err.message, 'error');
        }
      });
    }

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

    // Tax Policy Settings (Admin)
    const saveTaxPolicyBtn = document.getElementById('btn-admin-save-tax-policy');
    if (saveTaxPolicyBtn) {
      saveTaxPolicyBtn.addEventListener('click', async () => {
        const rateMultiplier = Number(document.getElementById('adm-tax-multiplier').value);
        const silverRate = Number(document.getElementById('adm-tax-silver').value);
        const majorRate = Number(document.getElementById('adm-tax-major').value);
        const whaleRate = Number(document.getElementById('adm-tax-whale').value);

        if (isNaN(rateMultiplier) || rateMultiplier <= 0 || isNaN(silverRate) || silverRate < 0 || isNaN(majorRate) || majorRate < 0 || isNaN(whaleRate) || whaleRate < 0) {
          showToast('خطأ إدخال', 'يرجى التأكد من إدخال قيم صحيحة للضرائب وموجبة.', 'error');
          return;
        }

        try {
          saveTaxPolicyBtn.disabled = true;
          saveTaxPolicyBtn.textContent = 'جاري الحفظ والتعميم...';

          const cfg = { rateMultiplier, silverRate, majorRate, whaleRate };
          await AppDB.adminSaveTaxConfig(cfg);

          showToast('تم الحفظ', 'تم تحديث ونشر السياسة الضريبية الجديدة لجميع اللاعبين بنجاح.', 'success');
          logAdminAction(`تعديل الضرائب: مضاعف ${rateMultiplier}x | فضية ${silverRate} | كبار ${majorRate} | حيتان ${whaleRate}`);
        } catch (err) {
          showToast('فشل حفظ الضرائب', err.message, 'error');
        } finally {
          saveTaxPolicyBtn.disabled = false;
          saveTaxPolicyBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> <span>تحديث السياسة الضريبية فوراً</span>';
        }
      });
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
      const elP = document.getElementById('adm-stat-players');
      const elC = document.getElementById('adm-stat-cash');
      const elB = document.getElementById('adm-stat-bank');
      const elNW = document.getElementById('adm-stat-networth') || document.getElementById('adm-stat-worth');
      const elJ = document.getElementById('adm-stat-jailed');
      const elBan = document.getElementById('adm-stat-banned');

      if (elP) elP.textContent = (stats.totalPlayers || 0).toLocaleString();
      if (elC) elC.textContent = `${(stats.totalCash || 0).toLocaleString()} EGP`;
      if (elB) elB.textContent = `${(stats.totalBank || 0).toLocaleString()} EGP`;
      if (elNW) elNW.textContent = `${(stats.totalNetWorth || 0).toLocaleString()} EGP`;
      if (elJ) elJ.textContent = (stats.jailedCount || 0).toLocaleString();
      if (elBan) elBan.textContent = (stats.bannedCount || 0).toLocaleString();

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

  let adminCorpsUnsubscribe = null;

  function renderAdminCorporationsPanel() {
    const tbody = document.getElementById('admin-corporations-list');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-slate-500">جاري تحميل الشركات...</td></tr>';

    if (adminCorpsUnsubscribe) {
      adminCorpsUnsubscribe();
      adminCorpsUnsubscribe = null;
    }

    adminCorpsUnsubscribe = AppDB.listenToCorporations(corps => {
      tbody.innerHTML = '';
      if (!corps || corps.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-slate-500">لا توجد شركات مشتركة مسجلة حالياً.</td></tr>';
        return;
      }

      corps.forEach(corp => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-850 transition border-b border-slate-800/40';

        const projKeys = Object.keys(corp.projects || {}).filter(k => corp.projects[k] === true);
        const projNames = projKeys.map(k => {
          const p = GameEngine.CORP_PROJECTS[k];
          return p ? p.name : k;
        }).join('، ') || 'لا توجد مشاريع';

        tr.innerHTML = `
          <td class="p-2.5 font-bold text-white">
            <div>${corp.name}</div>
            <div class="text-[10px] text-slate-500 font-normal">${corp.desc || 'لا يوجد وصف'}</div>
          </td>
          <td class="p-2.5 font-bold text-slate-300">${corp.founder}</td>
          <td class="p-2.5 text-center font-mono text-emerald-400 font-bold">${(corp.treasury || 0).toLocaleString()} EGP</td>
          <td class="p-2.5 text-center font-mono text-slate-300 font-bold">${(corp.members || []).length} عضو</td>
          <td class="p-2.5 text-center text-slate-400 max-w-[200px] truncate" title="${projNames}">${projNames}</td>
          <td class="p-2.5 text-left space-x-1 space-x-reverse">
            <button data-id="${corp.id}" data-name="${corp.name}" class="btn-admin-edit-corp-treasury py-1 px-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded font-bold transition text-[10px]">تعديل الخزينة</button>
            <button data-id="${corp.id}" data-name="${corp.name}" class="btn-admin-delete-corp py-1 px-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded font-bold transition text-[10px]">تفكيك</button>
          </td>
        `;

        // Bind Edit Treasury Button
        const btnEdit = tr.querySelector('.btn-admin-edit-corp-treasury');
        btnEdit.addEventListener('click', async () => {
          const corpId = btnEdit.dataset.id;
          const corpName = btnEdit.dataset.name;
          const currentTreasury = corp.treasury || 0;
          const val = prompt(`أدخل الرصيد الجديد لخزينة شركة "${corpName}":`, currentTreasury);
          if (val === null || val.trim() === '') return;
          try {
            await AppDB.adminEditCorporationTreasury(corpId, val);
            showToast('تعديل الخزينة', `تم تعديل رصيد خزينة شركة ${corpName} بنجاح.`, 'success');
            logAdminAction(`تعديل خزينة الشركة المشتركة: ${corpName}`);
          } catch (e) {
            showToast('خطأ تعديل الخزينة', e.message, 'error');
          }
        });

        // Bind Delete Button
        const btnDel = tr.querySelector('.btn-admin-delete-corp');
        btnDel.addEventListener('click', async () => {
          const corpId = btnDel.dataset.id;
          const corpName = btnDel.dataset.name;
          if (!confirm(`هل أنت متأكد تماماً من تفكيك وحذف شركة "${corpName}" نهائياً من قاعدة البيانات؟\nلا يمكن استرجاع هذا الإجراء.`)) return;
          try {
            await AppDB.adminDeleteCorporation(corpId);
            showToast('تفكيك شركة', `تم تفكيك وحذف شركة ${corpName} بنجاح.`, 'success');
            logAdminAction(`تفكيك وحذف الشركة المشتركة: ${corpName}`);
          } catch (e) {
            showToast('خطأ تفكيك شركة', e.message, 'error');
          }
        });

        tbody.appendChild(tr);
      });
    });
  }

  function switchAdminTab(tabId) {
    const subtabs = ['stats', 'players', 'transfers', 'market', 'broadcast', 'auctions', 'giftcodes', 'system', 'corporations'];
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
    } else if (tabId === 'market') {
      if (window._adminRenderStockPrices) window._adminRenderStockPrices();
    } else if (tabId === 'auctions') {
      fetchAndRenderAdminAuctions();
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
  }