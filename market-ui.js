/**
 * Ras ALmal Tycoon — P2P Marketplace Client UI & Controller
 * Implements Browse, Filter, Search, Create Listing Wizard, My Listings, and Market Vault
 */

(function() {
  'use strict';

  // Local state for market UI
  let _activeSubtab = 'browse'; // 'browse' | 'my_listings' | 'create' | 'vault'
  let _selectedCategory = 'all';
  let _searchQuery = '';
  let _sortOrder = 'newest';
  let _browseListings = [];
  let _myListings = [];
  let _vaultData = { earnings: 0, salesHistory: [], returnedItems: [] };
  let _catalog = {};
  let _isLoading = false;
  let _marketCountdownTimer = null;

  // Selected item for new listing wizard
  let _newListingForm = {
    category: '',
    itemId: '',
    ownedQty: 0,
    quantity: 1,
    unitPrice: 0,
    minPrice: 0,
    maxPrice: 0,
    durationHours: 24
  };

  /**
   * Initializes the P2P Market UI Controller
   */
  function initMarketUI() {
    window.MarketUI = {
      renderMarketTab,
      switchSubtab,
      setCategoryFilter,
      setSortOrder,
      handleSearch,
      openBuyModal,
      executePurchase,
      cancelListing,
      selectAssetToSell,
      updateListingCalculations,
      submitNewListing,
      claimAllEarnings,
      claimReturnedItem
    };
  }

  function getActiveUsername() {
    if (typeof ServerBridge !== 'undefined' && ServerBridge.getActiveUsername) {
      const u = ServerBridge.getActiveUsername();
      if (u) return u;
    }
    if (typeof GameEngine !== 'undefined' && GameEngine.state && GameEngine.state.username) {
      return GameEngine.state.username;
    }
    return '';
  }

  /**
   * Main render function called when user navigates to the 'market' tab
   */
  async function renderMarketTab() {
    const container = document.getElementById('tab-market') || document.getElementById('panel-market');
    if (!container) return;

    // Render skeleton if empty
    if (!container.innerHTML.trim() || !document.getElementById('market-subtab-content')) {
      container.innerHTML = `
        <div class="space-y-6 max-w-7xl mx-auto pb-12">
          
          <!-- Market Header Banner -->
          <div class="glass-panel p-6 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-slate-950 relative overflow-hidden shadow-2xl">
            <div class="absolute -top-24 -left-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="absolute -bottom-24 -right-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div class="space-y-2">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black">
                  <i class="fa-solid fa-handshake text-amber-400"></i>
                  <span>سوق التجارة الحرة بين اللاعبين (P2P Exchange)</span>
                </div>
                <h2 class="text-2xl sm:text-3xl font-black text-white font-changa tracking-wide">
                  بورصة وسوق اللاعبين المباشر 🤝
                </h2>
                <p class="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  بِع واشترِ المحاصيل الزراعية، حاويات الاستيراد والتصدير، طائرات الأساطيل، صواريخ الفضاء، والمعادن الكونية مباشرة من وإلى اللاعبين الآخرين بالأسعار التي تحددونها!
                </p>
              </div>

              <!-- Vault Quick Badge -->
              <div id="market-vault-quick-card" onclick="MarketUI.switchSubtab('vault')" class="glass-gold p-4 rounded-2xl border-2 border-amber-500/40 hover:border-amber-400 transition cursor-pointer flex items-center gap-4 shadow-lg shrink-0">
                <div class="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-xl shadow-md">
                  <i class="fa-solid fa-vault"></i>
                </div>
                <div>
                  <span class="text-[10px] text-slate-400 font-bold block">صندوق أمانات وأرباح السوق</span>
                  <span id="market-vault-quick-balance" class="text-base font-black text-amber-300 numbers-font">0 EGP</span>
                </div>
              </div>
            </div>

            <!-- Subtab Navigation Bar -->
            <div class="flex items-center gap-2 pt-6 mt-6 border-t border-slate-800/80 overflow-x-auto scrollbar-none">
              <button id="subtab-btn-browse" onclick="MarketUI.switchSubtab('browse')" class="px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer bg-amber-500 text-slate-950 shadow-md">
                <i class="fa-solid fa-store"></i>
                <span>تصفح السوق</span>
              </button>
              <button id="subtab-btn-my_listings" onclick="MarketUI.switchSubtab('my_listings')" class="px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800">
                <i class="fa-solid fa-list-check"></i>
                <span>عروضي المعروضة</span>
                <span id="market-my-count-badge" class="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300">0</span>
              </button>
              <button id="subtab-btn-create" onclick="MarketUI.switchSubtab('create')" class="px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800">
                <i class="fa-solid fa-plus-circle text-emerald-400"></i>
                <span>عرض سلعة للبيع</span>
              </button>
              <button id="subtab-btn-vault" onclick="MarketUI.switchSubtab('vault')" class="px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800">
                <i class="fa-solid fa-box-archive text-amber-400"></i>
                <span>صندوق الاستلام والأرباح</span>
                <span id="market-vault-count-badge" class="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-[10px] text-amber-300 hidden">0</span>
              </button>
            </div>
          </div>

          <!-- Subtab Dynamic Content Container -->
          <div id="market-subtab-content" class="min-h-[400px]">
            <!-- Rendered dynamically -->
          </div>

        </div>
      `;
    }

    // Refresh subtab content
    await switchSubtab(_activeSubtab);
  }

  /**
   * Switches between market subtabs ('browse', 'my_listings', 'create', 'vault')
   */
  async function switchSubtab(subtab) {
    _activeSubtab = subtab;

    // Update tab button styles
    ['browse', 'my_listings', 'create', 'vault'].forEach(st => {
      const btn = document.getElementById(`subtab-btn-${st}`);
      if (btn) {
        if (st === subtab) {
          btn.className = 'px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer bg-amber-500 text-slate-950 shadow-md';
        } else {
          btn.className = 'px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800';
        }
      }
    });

    const content = document.getElementById('market-subtab-content');
    if (!content) return;

    if (subtab === 'browse') {
      await renderBrowseSubtab(content);
    } else if (subtab === 'my_listings') {
      await renderMyListingsSubtab(content);
    } else if (subtab === 'create') {
      renderCreateListingSubtab(content);
    } else if (subtab === 'vault') {
      await renderVaultSubtab(content);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SUBTAB 1: BROWSE MARKETPLACE
  // ─────────────────────────────────────────────────────────────
  async function renderBrowseSubtab(container) {
    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Controls: Category Filters, Search, Sort -->
        <div class="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <!-- Category Pills -->
          <div class="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
            <button onclick="MarketUI.setCategoryFilter('all')" class="category-btn px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${_selectedCategory === 'all' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}">
              الكل
            </button>
            <button onclick="MarketUI.setCategoryFilter('trade_containers')" class="category-btn px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${_selectedCategory === 'trade_containers' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}">
              <i class="fa-solid fa-boxes-packing text-amber-400 mr-1"></i> حاويات التجارة
            </button>
            <button onclick="MarketUI.setCategoryFilter('space_minerals')" class="category-btn px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${_selectedCategory === 'space_minerals' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}">
              <i class="fa-solid fa-gem text-cyan-400 mr-1"></i> خامات الفضاء
            </button>
            <button onclick="MarketUI.setCategoryFilter('farm_crops')" class="category-btn px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${_selectedCategory === 'farm_crops' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}">
              <i class="fa-solid fa-wheat-awn text-emerald-400 mr-1"></i> محاصيل المزرعة
            </button>
            <button onclick="MarketUI.setCategoryFilter('airport_aircraft')" class="category-btn px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${_selectedCategory === 'airport_aircraft' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}">
              <i class="fa-solid fa-plane text-sky-400 mr-1"></i> أسطول الطائرات
            </button>
            <button onclick="MarketUI.setCategoryFilter('space_rockets')" class="category-btn px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${_selectedCategory === 'space_rockets' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}">
              <i class="fa-solid fa-rocket text-purple-400 mr-1"></i> صواريخ الفضاء
            </button>
          </div>

          <!-- Search & Sort -->
          <div class="flex items-center gap-3 w-full md:w-auto">
            <div class="relative flex-1 md:w-64">
              <i class="fa-solid fa-magnifying-glass absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
              <input type="text" id="market-search-input" value="${_searchQuery}" oninput="MarketUI.handleSearch(this.value)" placeholder="ابحث باسم السلعة أو اللاعب..." class="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500/50 transition">
            </div>

            <select id="market-sort-select" onchange="MarketUI.setSortOrder(this.value)" class="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-bold focus:outline-none focus:border-amber-500/50 cursor-pointer">
              <option value="newest" ${_sortOrder === 'newest' ? 'selected' : ''}>الأحدث إضافة</option>
              <option value="cheapest" ${_sortOrder === 'cheapest' ? 'selected' : ''}>الأرخص للوحدة</option>
              <option value="highest_qty" ${_sortOrder === 'highest_qty' ? 'selected' : ''}>الأعلى كمية</option>
              <option value="expiring_soon" ${_sortOrder === 'expiring_soon' ? 'selected' : ''}>ينتهي قريباً</option>
            </select>
          </div>

        </div>

        <!-- Listings Grid Container -->
        <div id="market-listings-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div class="col-span-full text-center py-12 text-slate-400">
            <i class="fa-solid fa-spinner fa-spin text-2xl text-amber-400 mb-2"></i>
            <p class="text-xs">جاري تحميل عروض السوق الحية...</p>
          </div>
        </div>

      </div>
    `;

    await fetchAndRenderBrowseListings();
  }

  async function fetchAndRenderBrowseListings() {
    const grid = document.getElementById('market-listings-grid');
    if (!grid) return;

    try {
      if (typeof ServerBridge !== 'undefined' && ServerBridge.browseMarket) {
        const res = await ServerBridge.browseMarket({
          category: _selectedCategory,
          search: _searchQuery,
          sort: _sortOrder,
          limit: 36
        });

        if (res && res.success) {
          _browseListings = res.listings || [];
          _catalog = res.catalog || {};
        }
      }
    } catch (err) {
      console.error('[MarketUI] Error fetching browse listings:', err);
    }

    if (_browseListings.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full glass-panel p-10 rounded-3xl border border-dashed border-slate-800 text-center space-y-3">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-3xl">
            <i class="fa-solid fa-store-slash"></i>
          </div>
          <h4 class="font-black text-white text-base">لا توجد عروض بيع متاحة حالياً في هذا القسم</h4>
          <p class="text-xs text-slate-400 max-w-md mx-auto">كن أول من يعرض سلعه للبيع في السوق واكسب كاش سائل من اللاعبين الآخرين!</p>
          <button onclick="MarketUI.switchSubtab('create')" class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer inline-flex items-center gap-2 shadow-lg shadow-amber-500/20">
            <i class="fa-solid fa-plus-circle"></i>
            <span>إضافة عرض بيع جديد</span>
          </button>
        </div>
      `;
      return;
    }

    const currentUsername = getActiveUsername().toLowerCase();
    const now = Date.now();

    grid.innerHTML = _browseListings.map(l => {
      const isOwner = (l.sellerUsername || '').toLowerCase() === currentUsername;
      const remMs = Math.max(0, Number(l.expiresAt || 0) - now);
      const remHours = Math.floor(remMs / 3600000);
      const remMinutes = Math.floor((remMs % 3600000) / 60000);

      const catBadge = getCategoryBadge(l.category);

      // Free Market Deal & Bargain Badges
      const base = Number(l.basePrice) || 0;
      const unit = Number(l.unitPrice) || 0;
      let dealBadge = '';
      if (base > 0) {
        const ratio = unit / base;
        if (ratio <= 0.8) {
          const discount = Math.round((1 - ratio) * 100);
          dealBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shadow-sm"><i class="fa-solid fa-tag text-[9px]"></i> لقطة (-${discount}%)</span>`;
        } else if (ratio >= 2.0) {
          dealBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1 shadow-sm"><i class="fa-solid fa-fire-flame-curved text-[9px]"></i> مضاربة (${ratio.toFixed(1)}x)</span>`;
        } else {
          dealBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">سعر معتاد</span>`;
        }
      }

      return `
        <div class="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3 shadow-lg relative group">
          
          <div class="space-y-2.5">
            <!-- Top Badges -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${catBadge.bg} ${catBadge.text} border ${catBadge.border}">
                  ${catBadge.label}
                </span>
                ${dealBadge}
              </div>
              <span class="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <i class="fa-regular fa-clock text-amber-400"></i>
                <span>${remHours}س ${remMinutes}د</span>
              </span>
            </div>

            <!-- Item Icon & Name -->
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                <i class="fa-solid ${l.itemIcon || 'fa-box'}"></i>
              </div>
              <div class="overflow-hidden">
                <h4 class="font-black text-white text-sm truncate" title="${l.itemName}">${l.itemName}</h4>
                <div class="flex items-center gap-1 text-[11px] text-slate-400">
                  <i class="fa-solid fa-user-circle text-amber-500 text-xs"></i>
                  <span class="font-bold text-slate-300 truncate">${l.sellerUsername}</span>
                  ${isOwner ? '<span class="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black mr-1">عرضك</span>' : ''}
                </div>
              </div>
            </div>

            <!-- Price & Quantity Specs Box -->
            <div class="bg-slate-950/70 rounded-xl p-2.5 border border-slate-800/80 space-y-1 text-xs">
              <div class="flex justify-between items-center text-slate-400">
                <span>سعر الوحدة:</span>
                <span class="font-black text-amber-400 numbers-font text-sm">${Number(l.unitPrice).toLocaleString()} EGP</span>
              </div>
              ${base > 0 ? `
                <div class="flex justify-between items-center text-slate-500 text-[10px]">
                  <span>القيمة التقديرية:</span>
                  <span class="numbers-font">${base.toLocaleString()} EGP</span>
                </div>
              ` : ''}
              <div class="flex justify-between items-center text-slate-400 border-t border-slate-800/60 pt-1">
                <span>الكمية المتاحة:</span>
                <span class="font-black text-white numbers-font">${Number(l.quantityRemaining).toLocaleString()} ${l.stackable ? 'وحدة' : ''}</span>
              </div>
            </div>
          </div>

          <!-- Action Button -->
          ${isOwner ? `
            <button onclick="MarketUI.cancelListing('${l.id}')" class="w-full py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-ban text-xs"></i>
              <span>إلغاء واسترجاع السلعة</span>
            </button>
          ` : `
            <button onclick="MarketUI.openBuyModal('${l.id}')" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95">
              <i class="fa-solid fa-cart-shopping text-xs"></i>
              <span>شراء الآن</span>
            </button>
          `}

        </div>
      `;
    }).join('');
  }

  function setCategoryFilter(cat) {
    _selectedCategory = cat;
    renderBrowseSubtab(document.getElementById('market-subtab-content'));
  }

  function setSortOrder(sort) {
    _sortOrder = sort;
    fetchAndRenderBrowseListings();
  }

  let _searchDebounce = null;
  function handleSearch(val) {
    _searchQuery = val;
    clearTimeout(_searchDebounce);
    _searchDebounce = setTimeout(() => {
      fetchAndRenderBrowseListings();
    }, 300);
  }

  // ─────────────────────────────────────────────────────────────
  // SUBTAB 2: MY ACTIVE LISTINGS
  // ─────────────────────────────────────────────────────────────
  async function renderMyListingsSubtab(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 class="text-lg font-black text-white font-changa">إدارة عروضي في السوق</h3>
            <p class="text-xs text-slate-400">يمكنك نشر حتى 10 عروض نشطة في نفس الوقت وإلغاء أي عرض واسترجاعه لصندوق أماناتك.</p>
          </div>
          <button onclick="MarketUI.switchSubtab('create')" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer">
            <i class="fa-solid fa-plus-circle"></i>
            <span>إضافة عرض جديد</span>
          </button>
        </div>

        <div id="my-listings-list" class="space-y-3">
          <div class="text-center py-8 text-slate-400 text-xs">
            <i class="fa-solid fa-spinner fa-spin text-amber-400 text-lg mb-2"></i>
            <p>جاري تحميل عروضك...</p>
          </div>
        </div>
      </div>
    `;

    try {
      if (typeof ServerBridge !== 'undefined' && ServerBridge.getMyMarketListings) {
        const res = await ServerBridge.getMyMarketListings();
        if (res && res.success) {
          _myListings = res.listings || [];
          const countBadge = document.getElementById('market-my-count-badge');
          if (countBadge) countBadge.textContent = res.activeCount || 0;
        }
      }
    } catch (err) {
      console.error(err);
    }

    const listEl = document.getElementById('my-listings-list');
    if (!listEl) return;

    if (_myListings.length === 0) {
      listEl.innerHTML = `
        <div class="glass-panel p-8 rounded-2xl border border-dashed border-slate-800 text-center space-y-2 text-slate-400">
          <i class="fa-solid fa-box-open text-3xl text-slate-600 mb-1"></i>
          <p class="text-xs font-bold text-slate-300">لم تقم بنشر أي عروض بيع حتى الآن.</p>
        </div>
      `;
      return;
    }

    const now = Date.now();
    listEl.innerHTML = _myListings.map(l => {
      const isExpired = l.status === 'EXPIRED' || (l.status === 'ACTIVE' && now >= Number(l.expiresAt || 0));
      const isSold = l.status === 'SOLD' || l.quantityRemaining === 0;
      const isCancelled = l.status === 'CANCELLED';
      const isActive = l.status === 'ACTIVE' && !isExpired;

      let statusBadge = `<span class="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold text-xs">نشط في السوق</span>`;
      if (isSold) {
        statusBadge = `<span class="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold text-xs">تم البيع بالكامل </span>`;
      } else if (isCancelled) {
        statusBadge = `<span class="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold text-xs">تم الإلغاء</span>`;
      } else if (isExpired) {
        statusBadge = `<span class="px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600 font-bold text-xs">منتهي الصلاحية</span>`;
      }

      return `
        <div class="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shrink-0">
              <i class="fa-solid ${l.itemIcon || 'fa-box'}"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-black text-white text-sm">${l.itemName}</h4>
                ${statusBadge}
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                سعر الوحدة: <span class="text-amber-400 font-bold numbers-font">${Number(l.unitPrice).toLocaleString()} EGP</span> • 
                المتبقي: <span class="text-white font-bold numbers-font">${l.quantityRemaining}/${l.initialQuantity}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3 w-full md:w-auto justify-end">
            ${isActive ? `
              <button onclick="MarketUI.cancelListing('${l.id}')" class="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                <i class="fa-solid fa-xmark"></i>
                <span>إلغاء العرض واسترداد المتبقي</span>
              </button>
            ` : `
              <span class="text-xs text-slate-500 font-medium">${new Date(l.createdAt).toLocaleDateString('ar-EG')}</span>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  // ─────────────────────────────────────────────────────────────
  // SUBTAB 3: CREATE NEW LISTING WIZARD
  // ─────────────────────────────────────────────────────────────
  function renderCreateListingSubtab(container) {
    const ownedAssets = getPlayerOwnedMarketAssets();

    container.innerHTML = `
      <div class="max-w-3xl mx-auto glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 space-y-6 shadow-2xl">
        
        <div class="border-b border-slate-800 pb-4">
          <h3 class="text-xl font-black text-white font-changa flex items-center gap-2">
            <i class="fa-solid fa-plus-circle text-amber-400"></i>
            <span>إنشاء عرض بيع جديد في سوق التجارة</span>
          </h3>
          <p class="text-xs text-slate-400 mt-1">
            اختر السلعة من ممتلكاتك الفعلية، وحدد الكمية وسعر البيع. سيتم حجز السلعة بأمان في السوق لحين بيعها أو انتهاء وقتها.
          </p>
        </div>

        <!-- Step 1: Select Asset from Owned Assets -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-300 block">1. اختر السلعة المعروضة للبيع (من ممتلكاتك الفعلية):</label>
          <select id="create-listing-asset-select" onchange="MarketUI.selectAssetToSell(this.value)" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-bold focus:outline-none focus:border-amber-500/50 cursor-pointer">
            <option value="">-- اضغط لاختيار سلعة من مستودعك أو مزرعتك أو أسطولك --</option>
            ${ownedAssets.map(a => `
              <option value="${a.category}:::${a.id}:::${a.ownedQty}:::${a.basePrice}">${a.categoryLabel}: ${a.name} (متوفر لديك: ${a.ownedQty} ${a.stackable ? 'وحدة' : ''})</option>
            `).join('')}
          </select>
          ${ownedAssets.length === 0 ? `
            <p class="text-xs text-rose-400 font-bold mt-1">
              <i class="fa-solid fa-triangle-exclamation"></i> ليس لديك حالياً سلع قابلة للبيع (محاصيل، حاويات، خامات فضاء، أو طائرات/صواريخ جاهزة).
            </p>
          ` : ''}
        </div>

        <!-- Step 2: Quantity & Price (Hidden until asset is selected) -->
        <div id="create-listing-details-box" class="space-y-5 hidden pt-2">
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <!-- Quantity Input -->
            <div class="space-y-1.5">
              <div class="flex justify-between items-center text-xs">
                <label class="font-bold text-slate-300">2. الكمية المراد بيعها:</label>
                <span id="label-owned-qty" class="text-slate-400 font-bold text-[11px]">المتوفر: 0</span>
              </div>
              <input type="number" id="input-listing-qty" min="1" value="1" oninput="MarketUI.updateListingCalculations()" class="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-black text-white numbers-font focus:outline-none focus:border-amber-500/50">
            </div>

            <!-- Unit Price Input with Clamping Note -->
            <div class="space-y-1.5">
              <div class="flex justify-between items-center text-xs">
                <label class="font-bold text-slate-300">3. سعر الوحدة الواحدة (EGP):</label>
                <span id="label-price-bounds" class="text-amber-400 font-bold text-[11px] numbers-font">النطاق: 0 - 0</span>
              </div>
              <input type="number" id="input-listing-price" min="1" value="0" oninput="MarketUI.updateListingCalculations()" class="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-black text-amber-400 numbers-font focus:outline-none focus:border-amber-500/50">
            </div>

          </div>

          <!-- Duration Buttons -->
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-300 block">4. مدة بقاء العرض في السوق:</label>
            <div class="grid grid-cols-4 gap-2">
              <button type="button" onclick="setListingDuration(6)" id="dur-btn-6" class="dur-btn py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer">6 ساعات</button>
              <button type="button" onclick="setListingDuration(12)" id="dur-btn-12" class="dur-btn py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer">12 ساعة</button>
              <button type="button" onclick="setListingDuration(24)" id="dur-btn-24" class="dur-btn py-2.5 rounded-xl border border-amber-500/50 bg-amber-500/15 text-xs font-black text-amber-300 shadow cursor-pointer">24 ساعة</button>
              <button type="button" onclick="setListingDuration(48)" id="dur-btn-48" class="dur-btn py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer">48 ساعة</button>
            </div>
          </div>

          <!-- Economics Summary Card -->
          <div class="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2 text-xs">
            <div class="flex justify-between text-slate-400">
              <span>إجمالي قيمة العرض:</span>
              <span id="sum-total-value" class="font-bold text-white numbers-font">0 EGP</span>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>عمولة وساطة السوق (3% عند البيع):</span>
              <span id="sum-commission" class="font-bold text-rose-400 numbers-font">-0 EGP</span>
            </div>
            <div class="flex justify-between text-slate-200 border-t border-slate-800 pt-2 text-sm font-bold">
              <span>صافي أرباحك المتوقعة:</span>
              <span id="sum-net-payout" class="font-black text-emerald-400 numbers-font text-base">+0 EGP</span>
            </div>
          </div>

          <!-- Submit Button -->
          <button id="btn-submit-listing" onclick="MarketUI.submitNewListing()" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm transition shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95">
            <i class="fa-solid fa-check"></i>
            <span>تأكيد الحجز ونشر العرض في السوق</span>
          </button>

        </div>

      </div>
    `;
  }

  window.setListingDuration = function(h) {
    _newListingForm.durationHours = h;
    [6, 12, 24, 48].forEach(d => {
      const b = document.getElementById(`dur-btn-${d}`);
      if (b) {
        if (d === h) {
          b.className = 'dur-btn py-2.5 rounded-xl border border-amber-500/50 bg-amber-500/15 text-xs font-black text-amber-300 shadow cursor-pointer';
        } else {
          b.className = 'dur-btn py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer';
        }
      }
    });
  };

  function selectAssetToSell(val) {
    const box = document.getElementById('create-listing-details-box');
    if (!val) {
      if (box) box.classList.add('hidden');
      return;
    }

    const [category, itemId, ownedQty, basePrice] = val.split(':::');
    _newListingForm.category = category;
    _newListingForm.itemId = itemId;
    _newListingForm.ownedQty = parseInt(ownedQty, 10) || 1;

    const base = parseInt(basePrice, 10) || 1000;
    _newListingForm.basePrice = base;
    _newListingForm.minPrice = 1;
    _newListingForm.maxPrice = 1000000000000;
    _newListingForm.unitPrice = base; // Default to base price

    if (box) box.classList.remove('hidden');

    const labelOwned = document.getElementById('label-owned-qty');
    if (labelOwned) labelOwned.textContent = `المتوفر لديك: ${_newListingForm.ownedQty}`;

    const labelBounds = document.getElementById('label-price-bounds');
    if (labelBounds) labelBounds.innerHTML = `<span class="text-emerald-400 font-bold">سوق حر مفتوح</span> <span class="text-slate-400 font-medium">(الرسمي: ${base.toLocaleString()} EGP)</span>`;

    const inputQty = document.getElementById('input-listing-qty');
    if (inputQty) {
      inputQty.max = _newListingForm.ownedQty;
      inputQty.value = 1;
      const isStackable = !['airport_aircraft', 'space_rockets'].includes(category);
      inputQty.disabled = !isStackable;
    }

    const inputPrice = document.getElementById('input-listing-price');
    if (inputPrice) {
      inputPrice.min = 1;
      inputPrice.max = 1000000000000;
      inputPrice.value = _newListingForm.unitPrice;
    }

    updateListingCalculations();
  }

  function updateListingCalculations() {
    const inputQty = document.getElementById('input-listing-qty');
    const inputPrice = document.getElementById('input-listing-price');
    if (!inputQty || !inputPrice) return;

    let qty = parseInt(inputQty.value, 10) || 1;
    qty = Math.max(1, Math.min(_newListingForm.ownedQty, qty));
    _newListingForm.quantity = qty;

    let price = parseInt(inputPrice.value, 10) || 0;
    _newListingForm.unitPrice = price;

    const total = qty * price;
    const fee = Math.floor(total * 0.03);
    const net = total - fee;

    const elTotal = document.getElementById('sum-total-value');
    if (elTotal) elTotal.textContent = `${total.toLocaleString()} EGP`;

    const elFee = document.getElementById('sum-commission');
    if (elFee) elFee.textContent = `-${fee.toLocaleString()} EGP`;

    const elNet = document.getElementById('sum-net-payout');
    if (elNet) elNet.textContent = `+${net.toLocaleString()} EGP`;
  }

  async function submitNewListing() {
    // Fat-Finger & Extreme Pricing Protection for Seller
    const base = Number(_newListingForm.basePrice) || 1000;
    const price = Number(_newListingForm.unitPrice) || 0;
    if (base > 0 && (price < base * 0.1 || price > base * 10)) {
      const isSuperCheap = price < base * 0.1;
      const warningPrompt = isSuperCheap
        ? `⚠️ تنبيه حماية: أنت تعرض السلعة بسعر (${price.toLocaleString()} ج.م للوحدة) وهو أقل بكثير من القيمة التقديرية (${base.toLocaleString()} ج.م)!\n\nهل أنت متأكد من رغبتك في البيع بهذا السعر الرخيص؟`
        : `⚠️ تنبيه حماية: أنت تعرض السلعة بسعر مرتفع جداً (${price.toLocaleString()} ج.م للوحدة) وهو أكثر من 10 أضعاف القيمة التقديرية (${base.toLocaleString()} ج.م)!\n\nهل أنت متأكد من نشر هذا السعر في السوق؟`;
      if (!confirm(warningPrompt)) {
        return;
      }
    }

    const btn = document.getElementById('btn-submit-listing');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-sm"></i> <span>جاري حجز ونشر العرض...</span>`;
    }

    try {
      if (typeof ServerBridge === 'undefined' || !ServerBridge.createMarketListing) {
        throw new Error("جسر السيرفر غير متصل.");
      }

      const res = await ServerBridge.createMarketListing(
        _newListingForm.category,
        _newListingForm.itemId,
        _newListingForm.quantity,
        _newListingForm.unitPrice,
        _newListingForm.durationHours
      );

      if (res && res.success) {
        if (typeof showToast === 'function') {
          showToast('نجاح العرض', res.message || 'تم نشر عرضك في السوق بنجاح!', 'success');
        }
        await switchSubtab('my_listings');
      }
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast('خطأ في العرض', err.message, 'error');
      } else {
        alert(err.message);
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-check"></i> <span>تأكيد الحجز ونشر العرض في السوق</span>`;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SUBTAB 4: MARKET VAULT & EARNINGS
  // ─────────────────────────────────────────────────────────────
  async function renderVaultSubtab(container) {
    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Unclaimed Earnings Hero Card -->
        <div class="glass-gold p-6 rounded-3xl border-2 border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div class="flex items-center gap-4 text-center sm:text-right">
            <div class="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-amber-500/10">
              <i class="fa-solid fa-sack-dollar"></i>
            </div>
            <div>
              <span class="text-xs text-slate-400 font-bold block mb-1">أرباح مبيعاتك المستحقة في أمانات السوق</span>
              <h3 id="vault-total-earnings" class="text-2xl sm:text-3xl font-black text-amber-300 numbers-font">0 EGP</h3>
              <p class="text-[11px] text-slate-300 mt-1">تُحول مباشرة لحسابك البنكي دون أي خصومات إضافية.</p>
            </div>
          </div>

          <button id="btn-claim-all-earnings" onclick="MarketUI.claimAllEarnings()" class="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0">
            <i class="fa-solid fa-download"></i>
            <span>تحصيل الأرباح للبنك فوراً</span>
          </button>
        </div>

        <!-- Returned Items (Unsold / Cancelled) -->
        <div class="space-y-3">
          <h4 class="text-base font-black text-white font-changa flex items-center gap-2">
            <i class="fa-solid fa-box-open text-amber-400"></i>
            <span>البضائع المرتجعة بانتظار الاستلام (Returned Items)</span>
          </h4>
          <div id="vault-returned-list" class="space-y-2.5">
            <div class="text-center py-6 text-slate-400 text-xs">جاري فحص الأمانات...</div>
          </div>
        </div>

        <!-- Sales History Log -->
        <div class="space-y-3 pt-4 border-t border-slate-800">
          <h4 class="text-base font-black text-white font-changa flex items-center gap-2">
            <i class="fa-solid fa-clock-rotate-left text-cyan-400"></i>
            <span>سجل عمليات البيع الأخيرة (Sales History)</span>
          </h4>
          <div id="vault-history-list" class="space-y-2">
            <!-- Rendered below -->
          </div>
        </div>

      </div>
    `;

    try {
      if (typeof ServerBridge !== 'undefined' && ServerBridge.getMarketVault) {
        const res = await ServerBridge.getMarketVault();
        if (res && res.success) {
          _vaultData = res;
        }
      }
    } catch (err) {
      console.error(err);
    }

    const earningsEl = document.getElementById('vault-total-earnings');
    if (earningsEl) earningsEl.textContent = `${(_vaultData.earnings || 0).toLocaleString()} EGP`;

    const quickEl = document.getElementById('market-vault-quick-balance');
    if (quickEl) quickEl.textContent = `${(_vaultData.earnings || 0).toLocaleString()} EGP`;

    // Render Returned Items
    const retList = document.getElementById('vault-returned-list');
    if (retList) {
      const items = _vaultData.returnedItems || [];
      if (items.length === 0) {
        retList.innerHTML = `
          <div class="glass-panel p-6 rounded-2xl border border-dashed border-slate-800 text-center text-slate-400 text-xs">
            لا توجد بضائع مرتجعة في صندوق الأمانات حالياً. جميع سلعك في مستودعاتك النشطة.
          </div>
        `;
      } else {
        retList.innerHTML = items.map(item => `
          <div class="glass-panel p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 shadow-md">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xl shrink-0">
                <i class="fa-solid ${item.icon || 'fa-box'}"></i>
              </div>
              <div>
                <h5 class="font-black text-white text-xs">${item.name} (${item.quantity} وحدة)</h5>
                <span class="text-[10px] text-slate-400">${item.reason || 'بضاعة مرتجعة'}</span>
              </div>
            </div>

            <button onclick="MarketUI.claimReturnedItem('${item.id}')" class="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
              <i class="fa-solid fa-arrow-down"></i>
              <span>استلام للمستودع</span>
            </button>
          </div>
        `).join('');
      }
    }

    // Render Sales History
    const histList = document.getElementById('vault-history-list');
    if (histList) {
      const history = _vaultData.salesHistory || [];
      if (history.length === 0) {
        histList.innerHTML = `
          <div class="text-center py-6 text-slate-500 text-xs">لا توجد عمليات بيع مسجلة بعد.</div>
        `;
      } else {
        histList.innerHTML = history.slice(0, 15).map(h => `
          <div class="glass-panel p-3 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span class="text-slate-300 font-bold">تم بيع ${h.quantity} من "${h.itemName}" للاعب <strong class="text-amber-400">@${h.buyerUsername}</strong></span>
            </div>
            <div class="text-left">
              <span class="font-black text-emerald-400 numbers-font">+${(h.sellerNet || 0).toLocaleString()} EGP</span>
              <span class="text-[10px] text-slate-500 block">عمولة 3%: ${(h.commission || 0).toLocaleString()} EGP</span>
            </div>
          </div>
        `).join('');
      }
    }
  }

  async function claimAllEarnings() {
    try {
      if (typeof ServerBridge === 'undefined' || !ServerBridge.claimAllMarketVaultEarnings) return;
      const res = await ServerBridge.claimAllMarketVaultEarnings();
      if (res && res.success) {
        if (typeof showToast === 'function') {
          showToast('تحصيل الأرباح', res.message, 'success');
        }
        await switchSubtab('vault');
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast('خطأ', err.message, 'error');
      else alert(err.message);
    }
  }

  async function claimReturnedItem(entryId) {
    try {
      if (typeof ServerBridge === 'undefined' || !ServerBridge.claimMarketVaultItem) return;
      const res = await ServerBridge.claimMarketVaultItem(entryId);
      if (res && res.success) {
        if (typeof showToast === 'function') {
          showToast('استلام السلعة', res.message, 'success');
        }
        await switchSubtab('vault');
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast('خطأ', err.message, 'error');
      else alert(err.message);
    }
  }

  async function cancelListing(listingId) {
    if (!confirm('هل أنت متأكد من رغبتك في إلغاء هذا العرض واسترجاع البضاعة لصندوق أماناتك؟')) return;
    try {
      if (typeof ServerBridge === 'undefined' || !ServerBridge.cancelMarketListing) return;
      const res = await ServerBridge.cancelMarketListing(listingId);
      if (res && res.success) {
        if (typeof showToast === 'function') {
          showToast('تم الإلغاء', res.message, 'success');
        }
        await switchSubtab(_activeSubtab);
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast('خطأ', err.message, 'error');
      else alert(err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // BUY MODAL
  // ─────────────────────────────────────────────────────────────
  function openBuyModal(listingId) {
    const listing = _browseListings.find(l => l.id === listingId);
    if (!listing) return;

    // Remove existing modal if any
    const existing = document.getElementById('market-buy-modal');
    if (existing) existing.remove();

    const maxQty = listing.quantityRemaining;
    const isStackable = listing.stackable;

    const modal = document.createElement('div');
    modal.id = 'market-buy-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none animate-fade-in';
    modal.innerHTML = `
      <div class="w-full max-w-md glass-panel p-6 rounded-3xl border-2 border-amber-500/40 space-y-5 shadow-2xl relative">
        
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xl">
              <i class="fa-solid ${listing.itemIcon || 'fa-box'}"></i>
            </div>
            <div>
              <h4 class="font-black text-white text-sm">${listing.itemName}</h4>
              <span class="text-xs text-slate-400">البائع: @${listing.sellerUsername}</span>
            </div>
          </div>
          <button onclick="document.getElementById('market-buy-modal').remove()" class="w-8 h-8 rounded-full bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="space-y-4">
          
          <!-- Quantity Selector -->
          <div class="space-y-1.5">
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-300 font-bold">الكمية المراد شراؤها:</span>
              <span class="text-slate-400 font-bold">المتاح: ${maxQty} وحدة</span>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="adjustBuyModalQty(-1, ${maxQty}, ${listing.unitPrice})" class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-base hover:bg-slate-800 transition cursor-pointer">-</button>
              <input type="number" id="modal-buy-qty" min="1" max="${maxQty}" value="1" oninput="calculateBuyModalTotal(${maxQty}, ${listing.unitPrice})" class="flex-1 py-2 rounded-xl bg-slate-950 border border-slate-800 text-center font-black text-white numbers-font text-base" ${!isStackable ? 'disabled' : ''}>
              <button type="button" onclick="adjustBuyModalQty(1, ${maxQty}, ${listing.unitPrice})" class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-base hover:bg-slate-800 transition cursor-pointer">+</button>
            </div>
          </div>

          <!-- Price Breakdown -->
          <div class="bg-slate-950/80 rounded-2xl p-3.5 border border-slate-800 space-y-2 text-xs">
            <div class="flex justify-between text-slate-400">
              <span>سعر الوحدة:</span>
              <span class="font-bold text-white numbers-font">${listing.unitPrice.toLocaleString()} EGP</span>
            </div>
            <div class="flex justify-between text-slate-300 border-t border-slate-800 pt-2 text-sm font-black">
              <span>إجمالي المبلغ المطلوب:</span>
              <span id="modal-buy-total-cost" class="text-amber-400 numbers-font">${listing.unitPrice.toLocaleString()} EGP</span>
            </div>
          </div>

        </div>

        <button id="btn-modal-confirm-buy" onclick="MarketUI.executePurchase('${listing.id}')" class="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm transition shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95">
          <i class="fa-solid fa-check"></i>
          <span>تأكيد الشراء ودفع القيمة</span>
        </button>

      </div>
    `;

    document.body.appendChild(modal);
  }

  window.adjustBuyModalQty = function(delta, maxQty, unitPrice) {
    const input = document.getElementById('modal-buy-qty');
    if (!input) return;
    let val = parseInt(input.value, 10) || 1;
    val = Math.max(1, Math.min(maxQty, val + delta));
    input.value = val;
    calculateBuyModalTotal(maxQty, unitPrice);
  };

  window.calculateBuyModalTotal = function(maxQty, unitPrice) {
    const input = document.getElementById('modal-buy-qty');
    const costEl = document.getElementById('modal-buy-total-cost');
    if (!input || !costEl) return;
    let qty = parseInt(input.value, 10) || 1;
    qty = Math.max(1, Math.min(maxQty, qty));
    costEl.textContent = `${(qty * unitPrice).toLocaleString()} EGP`;
  };

  async function executePurchase(listingId) {
    const listing = _browseListings.find(l => l.id === listingId);
    const input = document.getElementById('modal-buy-qty');
    const btn = document.getElementById('btn-modal-confirm-buy');
    const qty = parseInt(input ? input.value : 1, 10) || 1;

    // Buyer Overpriced Confirmation Defense (> 500% base price)
    if (listing && Number(listing.basePrice) > 0) {
      const base = Number(listing.basePrice);
      const unit = Number(listing.unitPrice);
      if (unit > base * 5) {
        const total = qty * unit;
        const warning = `⚠️ تنبيه حماية المشتري:\nهذا العنصر معروض بسعر مرتفع جداً (${unit.toLocaleString()} ج.م للوحدة) وهو أكثر من 5 أضعاف القيمة التقديرية (${base.toLocaleString()} ج.م)!\n\nإجمالي المبلغ المطلوب: ${total.toLocaleString()} ج.م.\n\nهل أنت متأكد من الشراء والمتابعة؟`;
        if (!confirm(warning)) {
          return;
        }
      }
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-sm"></i> <span>جاري إتمام الصفقة...</span>`;
    }

    try {
      if (typeof ServerBridge === 'undefined' || !ServerBridge.buyMarketListing) {
        throw new Error("جسر السيرفر غير متصل.");
      }

      const res = await ServerBridge.buyMarketListing(listingId, qty);
      if (res && res.success) {
        const modal = document.getElementById('market-buy-modal');
        if (modal) modal.remove();

        if (typeof showToast === 'function') {
          showToast('تمت الصفقة بنجاح', res.message, 'success');
        }
        await switchSubtab('browse');
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast('فشل الشراء', err.message, 'error');
      else alert(err.message);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-check"></i> <span>تأكيد الشراء ودفع القيمة</span>`;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────
  function getCategoryBadge(cat) {
    switch(cat) {
      case 'trade_containers':
        return { label: 'حاوية تجارية', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' };
      case 'space_minerals':
        return { label: 'معدن فضائي', bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' };
      case 'farm_crops':
        return { label: 'محصول زراعي', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' };
      case 'airport_aircraft':
        return { label: 'طائرة أسطول', bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30' };
      case 'space_rockets':
        return { label: 'صاروخ فضاء', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' };
      default:
        return { label: 'سلعة عامة', bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };
    }
  }

  /**
   * Scans player's actual in-memory game state and compiles tradeable assets
   */
  function getPlayerOwnedMarketAssets() {
    const list = [];
    if (typeof GameEngine === 'undefined') return list;
    const s = GameEngine.getState ? GameEngine.getState() : (GameEngine.state || {});

    // 1. Trade Containers
    if (s.tradeCompany && s.tradeCompany.warehouse && typeof s.tradeCompany.warehouse === 'object') {
      const catGroup = _catalog.trade_containers || {};
      Object.keys(s.tradeCompany.warehouse).forEach(cId => {
        const qty = Number(s.tradeCompany.warehouse[cId] || 0);
        if (qty > 0) {
          const itemMeta = catGroup[cId] || { name: cId, basePrice: 100000 };
          list.push({
            category: 'trade_containers',
            categoryLabel: 'حاويات التجارة',
            id: cId,
            name: itemMeta.name || cId,
            ownedQty: qty,
            basePrice: itemMeta.basePrice || 100000,
            stackable: true
          });
        }
      });
    }

    // 2. Space Minerals
    if (s.space && s.space.warehouse && typeof s.space.warehouse === 'object') {
      const catGroup = _catalog.space_minerals || {};
      Object.keys(s.space.warehouse).forEach(oreId => {
        const qty = Number(s.space.warehouse[oreId] || 0);
        if (qty > 0) {
          const itemMeta = catGroup[oreId] || { name: oreId, basePrice: 10000 };
          list.push({
            category: 'space_minerals',
            categoryLabel: 'خامات الفضاء',
            id: oreId,
            name: itemMeta.name || oreId,
            ownedQty: qty,
            basePrice: itemMeta.basePrice || 10000,
            stackable: true
          });
        }
      });
    }

    // 3. Farm Crops & Livestock
    if (s.farm) {
      const catGroup = _catalog.farm_crops || {};
      if (s.farm.storage && typeof s.farm.storage === 'object') {
        Object.keys(s.farm.storage).forEach(cropId => {
          const qty = Number(s.farm.storage[cropId] || 0);
          if (qty > 0) {
            const itemMeta = catGroup[cropId] || { name: cropId, basePrice: 50 };
            list.push({
              category: 'farm_crops',
              categoryLabel: 'محاصيل المزرعة',
              id: cropId,
              name: itemMeta.name || cropId,
              ownedQty: qty,
              basePrice: itemMeta.basePrice || 50,
              stackable: true
            });
          }
        });
      }
      if (s.farm.livestock && typeof s.farm.livestock === 'object') {
        ['milk', 'eggs', 'compost'].forEach(liveId => {
          const qty = Number(s.farm.livestock[liveId] || 0);
          if (qty > 0) {
            const itemMeta = catGroup[liveId] || { name: liveId, basePrice: 30 };
            list.push({
              category: 'farm_crops',
              categoryLabel: 'منتجات الثروة الحيوانية',
              id: liveId,
              name: itemMeta.name || liveId,
              ownedQty: qty,
              basePrice: itemMeta.basePrice || 30,
              stackable: true
            });
          }
        });
      }
    }

    // 4. Idle Aircraft
    if (s.airport && Array.isArray(s.airport.fleet)) {
      const catGroup = _catalog.airport_aircraft || {};
      s.airport.fleet.forEach(c => {
        const isFree = !c.inFlight && c.status !== 'in_flight';
        const mId = c && (c.modelId || c.id);
        if (isFree && mId) {
          const itemMeta = catGroup[mId] || { name: mId, basePrice: 5000000 };
          list.push({
            category: 'airport_aircraft',
            categoryLabel: 'طائرات المطار (جاهزة)',
            id: mId,
            name: itemMeta.name || mId,
            ownedQty: 1,
            basePrice: itemMeta.basePrice || 5000000,
            stackable: false
          });
        }
      });
    }

    // 5. Idle Rockets
    if (s.space && Array.isArray(s.space.activeRockets)) {
      const catGroup = _catalog.space_rockets || {};
      s.space.activeRockets.forEach(r => {
        const isFree = !r.launched && r.status !== 'flying';
        const mId = r && (r.modelId || r.id);
        if (isFree && mId) {
          const itemMeta = catGroup[mId] || { name: mId, basePrice: 100000000 };
          list.push({
            category: 'space_rockets',
            categoryLabel: 'صواريخ الفضاء (جاهزة)',
            id: mId,
            name: itemMeta.name || mId,
            ownedQty: 1,
            basePrice: itemMeta.basePrice || 100000000,
            stackable: false
          });
        }
      });
    }

    return list;
  }

  // Initialize
  initMarketUI();

})();
