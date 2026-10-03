/**
 * Ras ALmal Tycoon — Royal Live Auction System (Client Engine & UI)
 * Handles Real-time Auction Telemetry, Hammer Sync, Registration, Bidding, and Spectator Hall
 */

(function() {
  'use strict';

  class AuctionClient {
    constructor() {
      this.state = null;
      this.pollInterval = null;
      this.timerRaf = null;
      this.isOpen = false;
      this.audioCtx = null;
      this.lastHammerStrike = 0;
      this.lastHighestBid = 0;
      this.init();
    }

    init() {
      this.injectStyles();
      this.injectBannerDOM();
      this.injectModalDOM();
      this.bindEvents();
      this.startPolling();
    }

    getApiBase() {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return '';
      }
      return 'https://rasalmal.online';
    }

    getCurrentUser() {
      if (window.GameEngine && window.GameEngine.state && window.GameEngine.state.username) {
        return window.GameEngine.state.username;
      }
      return localStorage.getItem('rasalmal_username') || '';
    }

    async fetchState() {
      const username = this.getCurrentUser();
      try {
        const res = await fetch(`${this.getApiBase()}/api/auction/state?username=${encodeURIComponent(username)}`, {
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (res.ok) {
          const data = await res.json();
          this.handleStateUpdate(data);
        }
      } catch (err) {
        // Silent network retry
      }
    }

    startPolling() {
      if (this.pollInterval) clearInterval(this.pollInterval);
      this.fetchState();
      // Poll every 2.5 seconds (ultra light)
      this.pollInterval = setInterval(() => this.fetchState(), 2500);
    }

    handleStateUpdate(newState) {
      const prevStrike = this.state?.live?.hammerStrike || 0;
      const prevBid = this.state?.live?.currentBid || 0;
      this.state = newState;

      // Play SFX on hammer strikes or new bids if modal open
      if (this.isOpen) {
        if (newState.live?.hammerStrike > 0 && newState.live.hammerStrike !== prevStrike) {
          this.playHammerSound(newState.live.hammerStrike);
        } else if (newState.live?.currentBid > prevBid && prevBid > 0) {
          this.playBidSound();
        }
      }

      this.updateBanner();
      if (this.isOpen) {
        this.renderModalContent();
      }
    }

    // ==========================================
    // DOM INJECTION & STYLING
    // ==========================================
    injectStyles() {
      if (document.getElementById('royal-auction-styles')) return;
      const style = document.createElement('style');
      style.id = 'royal-auction-styles';
      style.textContent = `
        /* Royal Auction Banner */
        #royal-auction-top-banner {
          display: none;
          background: linear-gradient(135deg, rgba(20, 14, 4, 0.96) 0%, rgba(38, 26, 6, 0.94) 50%, rgba(15, 10, 3, 0.96) 100%);
          border: 1px solid rgba(245, 158, 11, 0.45);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 15px rgba(245, 158, 11, 0.2);
          border-radius: 1rem;
          margin: 0.5rem auto;
          max-width: 72rem;
          padding: 0.65rem 1rem;
          color: #fff;
          z-index: 40;
          position: relative;
          transition: all 0.3s ease;
        }
        #royal-auction-top-banner.banner-live {
          border-color: rgba(239, 68, 68, 0.6);
          box-shadow: 0 0 25px rgba(239, 68, 68, 0.3);
          background: linear-gradient(135deg, rgba(30, 8, 8, 0.96) 0%, rgba(20, 14, 4, 0.96) 100%);
        }

        /* Modal Overlay */
        #royal-auction-modal {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: none;
          align-items: center;
          justify-content: center;
          background: rgba(2, 4, 10, 0.88);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          padding: 1rem;
          overflow-y: auto;
          animation: aucFadeIn 0.25s ease-out;
        }

        @keyframes aucFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }

        /* Card Gold Glow */
        .auction-gold-glow {
          box-shadow: 0 0 35px rgba(245, 158, 11, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        /* Hammer Strike Shake Animation */
        .hammer-shake {
          animation: hammerShakeAnim 0.5s ease-in-out;
        }
        @keyframes hammerShakeAnim {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-15deg) scale(1.1); }
          40% { transform: rotate(10deg) scale(1.15); }
          60% { transform: rotate(-5deg); }
          80% { transform: rotate(3deg); }
        }

        /* Pulse Live Dot */
        .live-dot-pulse {
          animation: livePulseAnim 1.2s infinite;
        }
        @keyframes livePulseAnim {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }

        /* Chat Frames styling */
        .frame-fire-dragon {
          border: 2px solid #f97316 !important;
          box-shadow: 0 0 12px rgba(249, 115, 22, 0.7), inset 0 0 6px rgba(234, 88, 12, 0.5) !important;
          background: linear-gradient(135deg, rgba(234, 88, 12, 0.15), transparent) !important;
        }
        .frame-diamond-whale {
          border: 2px solid #06b6d4 !important;
          box-shadow: 0 0 14px rgba(6, 182, 212, 0.8), inset 0 0 8px rgba(14, 165, 233, 0.6) !important;
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), transparent) !important;
        }
        .frame-gold-crown {
          border: 2px solid #f59e0b !important;
          box-shadow: 0 0 14px rgba(245, 158, 11, 0.8), inset 0 0 8px rgba(217, 119, 6, 0.6) !important;
        }
      `;
      document.head.appendChild(style);
    }

    injectBannerDOM() {
      if (document.getElementById('royal-auction-top-banner')) return;
      const banner = document.createElement('div');
      banner.id = 'royal-auction-top-banner';
      banner.innerHTML = `
        <div class="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div class="flex items-center gap-3">
            <div id="auc-banner-icon-box" class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-lg shrink-0">
              <i class="fa-solid fa-gavel"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span id="auc-banner-badge" class="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  مزاد ملكي
                </span>
                <h4 id="auc-banner-title" class="text-xs sm:text-sm font-black text-white">جاري تحميل بيانات المزاد...</h4>
              </div>
              <p id="auc-banner-subtitle" class="text-[11px] text-slate-300 mt-0.5">تبدأ المزايدة التنافسية الحية بعد قليل</p>
            </div>
          </div>
          <div class="flex items-center gap-2 mr-auto">
            <div id="auc-banner-countdown" class="px-3 py-1 bg-black/50 border border-amber-500/30 rounded-xl font-mono text-xs font-bold text-amber-300">
              --:--
            </div>
            <button id="btn-open-royal-auction" class="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black rounded-xl transition shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer flex items-center gap-1.5">
              <span>دخول الصالة</span>
              <i class="fa-solid fa-arrow-left text-[10px]"></i>
            </button>
          </div>
        </div>
      `;

      // Insert at the top of main container if available
      const container = document.querySelector('main') || document.body;
      container.insertBefore(banner, container.firstChild);
    }

    injectModalDOM() {
      if (document.getElementById('royal-auction-modal')) return;
      const modal = document.createElement('div');
      modal.id = 'royal-auction-modal';
      modal.className = 'fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 select-none';
      modal.style.display = 'none';
      modal.innerHTML = `
        <div class="relative w-full max-w-4xl bg-slate-950/95 border border-amber-500/40 rounded-3xl p-4 sm:p-6 text-right text-slate-100 auction-gold-glow max-h-[92vh] flex flex-col justify-between overflow-hidden shadow-2xl">
          
          <!-- Modal Header -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-800/80 shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
                <i class="fa-solid fa-gavel text-lg"></i>
              </div>
              <div>
                <h3 class="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>قاعة المزادات الملكية الحية</span>
                  <span id="auc-modal-live-badge" class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    ROYAL AUCTION
                  </span>
                </h3>
                <p class="text-[11px] text-slate-400">مزادات مباشرة تحت إشراف وإدارة المنظومة المركزية</p>
              </div>
            </div>
            <button id="btn-close-royal-auction" class="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer">
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          <!-- Modal Dynamic Body -->
          <div id="auc-modal-body" class="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar">
            <!-- Dynamically populated -->
          </div>

        </div>
      `;
      document.body.appendChild(modal);
    }

    bindEvents() {
      document.addEventListener('click', (e) => {
        if (e.target.closest('#btn-open-royal-auction') || e.target.closest('#btn-open-auction-hall') || e.target.closest('#nav-btn-auctions') || e.target.closest('#nav-btn-auctions-mobile')) {
          this.openModal();
        }
        if (e.target.closest('#btn-close-royal-auction') || e.target.id === 'royal-auction-modal') {
          this.closeModal();
        }
      });
    }

    openModal() {
      this.isOpen = true;
      let modal = document.getElementById('royal-auction-modal');
      if (!modal) {
        this.injectModalDOM();
        modal = document.getElementById('royal-auction-modal');
      }
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
      }
      this.fetchState();
      this.renderModalContent();
    }

    closeModal() {
      this.isOpen = false;
      const modal = document.getElementById('royal-auction-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
      }
    }

    // ==========================================
    // RENDER LOGIC
    // ==========================================
    updateBanner() {
      const banner = document.getElementById('royal-auction-top-banner');
      if (!banner) return;

      if (!this.state || this.state.status === 'IDLE' || this.state.status === 'CANCELLED') {
        banner.style.display = 'none';
        return;
      }

      banner.style.display = 'block';
      const isLive = this.state.status === 'LIVE';
      banner.className = isLive ? 'banner-live' : '';

      const badge = document.getElementById('auc-banner-badge');
      const title = document.getElementById('auc-banner-title');
      const subtitle = document.getElementById('auc-banner-subtitle');
      const countdown = document.getElementById('auc-banner-countdown');

      if (isLive) {
        if (badge) {
          badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1.5';
          badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-500 live-dot-pulse"></span> مباشر الآن';
        }
        if (title) title.textContent = `المزاد الحي: ${this.state.item?.name || 'غرض ملكي'}`;
        if (subtitle) {
          const highest = this.state.live?.highestBidder;
          subtitle.textContent = highest 
            ? `أعلى مزايدة: ${this.state.live.currentBid.toLocaleString()} ج.م (${highest.username})`
            : `السعر الابتدائي: ${this.state.config.startingBid.toLocaleString()} ج.م`;
        }
        if (countdown) countdown.textContent = this.formatTimeRemaining(this.state.live?.hammerExpiryTime);
      } else if (this.state.status === 'SCHEDULED') {
        if (badge) {
          badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30';
          badge.textContent = 'مزاد مرتقب';
        }
        if (title) title.textContent = `قريباً: ${this.state.item?.name || 'غرض ملكي'}`;
        if (subtitle) subtitle.textContent = `المسجلين حتى الآن: ${this.state.registrantsCount || 0} لاعب (شرط الثروة: ${Number(this.state.config?.minNetWorth || 0).toLocaleString()} ج.م)`;
        if (countdown) countdown.textContent = this.formatTimeRemaining(this.state.config?.scheduledStartTime);
      } else if (this.state.status === 'ENDED') {
        if (badge) badge.textContent = 'انتهى المزاد';
        if (title) title.textContent = `مبروك للفائز: [${this.state.winner?.username || 'المشتري'}]`;
        if (subtitle) subtitle.textContent = `بمبلغ: ${Number(this.state.winner?.winningBid || 0).toLocaleString()} ج.م`;
        if (countdown) countdown.textContent = 'تم البيع';
      }
    }

    renderModalContent() {
      const body = document.getElementById('auc-modal-body');
      if (!body || !this.state) return;

      const item = this.state.item || {};
      const config = this.state.config || {};
      const live = this.state.live || {};
      const isLive = this.state.status === 'LIVE';
      const isScheduled = this.state.status === 'SCHEDULED';
      const isEnded = this.state.status === 'ENDED';
      const currentUser = this.getCurrentUser();
      const isRegistered = this.state.isRegistered;
      const myNetWorth = window.GameEngine?.state?.netWorth || 0;
      const isEligible = myNetWorth >= (config.minNetWorth || 0);

      let html = '';

      // --- 1. Prize Showcase Card ---
      html += `
        <div class="glass-panel p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-slate-900/60 to-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl sm:text-4xl shadow-lg shadow-amber-500/10 shrink-0 ${live.hammerStrike > 0 ? 'hammer-shake' : ''}">
              ${item.icon || '🏆'}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ${item.badge || 'معروض حصري'}
                </span>
                <span class="text-[10px] text-slate-400 font-mono">ID: ${item.id}</span>
              </div>
              <h2 class="text-base sm:text-xl font-black text-white mt-1">${item.name}</h2>
              <p class="text-xs text-slate-300 mt-1 leading-relaxed">${item.description}</p>
            </div>
          </div>
          <div class="text-left sm:text-right w-full sm:w-auto p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 shrink-0">
            <span class="text-[10px] text-slate-400 block font-bold">السعر الافتتاحي</span>
            <span class="text-sm sm:text-base font-black text-amber-400 font-mono">${Number(config.startingBid || 0).toLocaleString()} EGP</span>
            <span class="text-[10px] text-slate-400 block mt-1 font-bold">الحد الأدنى لصافي الثروة</span>
            <span class="text-xs font-bold text-slate-200 font-mono">${Number(config.minNetWorth || 0).toLocaleString()} EGP</span>
          </div>
        </div>
      `;

      // --- 2. Live Status / Hammer Station ---
      if (isLive) {
        const hammerStrike = live.hammerStrike || 0;
        let hammerColor = 'border-amber-500/30 bg-amber-950/10 text-amber-300';
        if (hammerStrike === 1) hammerColor = 'border-yellow-500 bg-yellow-950/30 text-yellow-300 hammer-shake';
        if (hammerStrike === 2) hammerColor = 'border-orange-500 bg-orange-950/40 text-orange-300 hammer-shake';
        if (hammerStrike === 3) hammerColor = 'border-emerald-500 bg-emerald-950/50 text-emerald-300';

        html += `
          <div class="p-4 rounded-2xl border ${hammerColor} transition-all">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-gavel text-lg ${hammerStrike > 0 ? 'text-amber-400 animate-bounce' : 'text-slate-400'}"></i>
                <span class="text-sm font-black">${live.hammerStrikeMessage || 'المزاد مفتوح للمزايدات الحية!'}</span>
              </div>
              <div class="flex items-center gap-2 font-mono text-xs">
                <span class="text-slate-400 font-bold">مؤقت المطرقة:</span>
                <span class="px-3 py-1 bg-black/60 rounded-xl font-black text-amber-400 border border-amber-500/30">
                  ${this.formatTimeRemaining(live.hammerExpiryTime)}
                </span>
              </div>
            </div>
          </div>
        `;

        // Current Highest Bid Banner
        html += `
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span class="text-[10px] text-slate-400 block font-bold">أعلى مزايدة حالية</span>
                <span class="text-xl sm:text-2xl font-black text-emerald-400 font-mono">${Number(live.currentBid || 0).toLocaleString()} EGP</span>
              </div>
              <div class="text-left">
                <span class="text-[10px] text-slate-400 block font-bold">صاحب المزايدة</span>
                <span class="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                  <i class="fa-solid fa-crown text-amber-400 text-xs"></i>
                  <span>${live.highestBidder ? live.highestBidder.username : 'لا يوجد مزايد حتى الآن'}</span>
                </span>
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span class="text-[10px] text-slate-400 block font-bold">الحد الأدنى للزيادة</span>
                <span class="text-base font-black text-yellow-400 font-mono">+${Number(config.minBidStep || 0).toLocaleString()} EGP</span>
              </div>
              <div class="text-left">
                <span class="text-[10px] text-slate-400 block font-bold">حالتك في الصالة</span>
                ${isRegistered 
                  ? '<span class="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-black">مزايد نشط 🟢</span>'
                  : '<span class="px-2.5 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl text-xs font-black">مشاهد فقط 👀</span>'
                }
              </div>
            </div>
          </div>
        `;

        // Bidding Actions Section (STRICT: ONLY for registered bidders)
        if (isRegistered) {
          const nextMinBid = (live.highestBidder ? live.currentBid : (config.startingBid - (config.minBidStep || 1000000))) + (config.minBidStep || 1000000);
          html += `
            <div class="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-slate-900/40 space-y-3">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-white flex items-center gap-1.5">
                  <i class="fa-solid fa-gavel text-emerald-400"></i>
                  <span>لوحة المزايدة الحية</span>
                </span>
                <span class="text-slate-400">أقل مزايدة مسموحة: <strong class="text-emerald-400 font-mono">${nextMinBid.toLocaleString()} EGP</strong></span>
              </div>

              <!-- Quick Bid Buttons -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button onclick="window.RoyalAuction.placeBidAction(${live.currentBid + (config.minBidStep || 1000000)})" class="py-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-black transition cursor-pointer active:scale-95">
                  +${Number(config.minBidStep || 1000000).toLocaleString()} ج.م
                </button>
                <button onclick="window.RoyalAuction.placeBidAction(${live.currentBid + 5000000})" class="py-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-black transition cursor-pointer active:scale-95">
                  +5,000,000 ج.م
                </button>
                <button onclick="window.RoyalAuction.placeBidAction(${live.currentBid + 10000000})" class="py-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-black transition cursor-pointer active:scale-95">
                  +10,000,000 ج.م
                </button>
                <button onclick="window.RoyalAuction.placeBidAction(${live.currentBid + 25000000})" class="py-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-black transition cursor-pointer active:scale-95">
                  +25,000,000 ج.م
                </button>
              </div>

              <!-- Custom Bid Input -->
              <div class="flex gap-2">
                <input type="number" id="auc-custom-bid-input" placeholder="أدخل مبلغ مزايدة مخصص (EGP)" min="${nextMinBid}"
                  class="glass-input flex-1 p-2.5 text-xs text-center font-bold font-mono text-emerald-400 bg-slate-950 border border-slate-700 rounded-xl" />
                <button onclick="window.RoyalAuction.submitCustomBid()" class="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl transition shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer">
                  مزايدة
                </button>
              </div>
            </div>
          `;
        } else {
          // Spectator View (No bidding inputs)
          html += `
            <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-900/90 border border-slate-700/80 text-center space-y-2.5 shadow-xl">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold">
                <i class="fa-solid fa-eye"></i>
                <span>أنت متواجد بصفة مشاهد فقط (Spectator)</span>
              </div>
              <h4 class="text-xs sm:text-sm font-black text-white">تتابع البث الحي للمزاد مباشرة 📺</h4>
              <p class="text-[11px] sm:text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                المزايدة التنافسية مقتصرة على المشتركين الذين سجلوا في فترة التسجيل المسبقة. يمكنك الاستمتاع بمشاهدة صراع المزايدات وتغير الأسعار وضربات المطرقة الملكية لحظة بلحظة!
              </p>
            </div>
          `;
        }

      } else if (isScheduled) {
        // Scheduled Countdown & Registration Mode
        html += `
          <div class="p-5 rounded-2xl bg-gradient-to-b from-amber-950/30 to-slate-900/70 border border-amber-500/40 text-center space-y-4">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
              <i class="fa-regular fa-clock"></i>
              <span>مرحلة التسجيل والعد التنازلي</span>
            </div>

            <div>
              <span class="text-[11px] text-slate-400 block font-bold">يبدأ المزاد الحي بعد:</span>
              <div class="text-2xl sm:text-4xl font-black text-amber-400 font-mono tracking-wider mt-1">
                ${this.formatTimeRemaining(config.scheduledStartTime)}
              </div>
            </div>

            <div class="max-w-md mx-auto p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-1">
              <div class="flex justify-between">
                <span class="text-slate-400">صافي ثروتك الحالي:</span>
                <strong class="text-white font-mono">${Number(myNetWorth).toLocaleString()} EGP</strong>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">الشرط المطلوب للتسجيل:</span>
                <strong class="text-amber-400 font-mono">${Number(config.minNetWorth || 0).toLocaleString()} EGP</strong>
              </div>
              <div class="flex justify-between pt-1 border-t border-slate-800">
                <span class="text-slate-400">المسجلين حالياً:</span>
                <strong class="text-emerald-400">${this.state.registrantsCount || 0} لاعب</strong>
              </div>
            </div>

            <!-- Free Registration Guarantee Note -->
            <p class="text-[10px] text-amber-300/90 font-bold max-w-md mx-auto bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
              💡 <strong>تنبيه هام:</strong> التسجيل مجاني تماماً ولا يخصم أي قرش من حسابك. شرط الثروة هو إثبات قدرة مالية فقط، والخصم يتم فقط من الفائز الأخير بالضربة النهائية!
            </p>

            <div>
              ${isRegistered 
                ? '<div class="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-black flex items-center justify-center gap-2"><i class="fa-solid fa-circle-check"></i><span>تم تسجيلك بنجاح! انتظر إشارة بدء المزاد لتدخل المزايدة.</span></div>'
                : `<button onclick="window.RoyalAuction.registerAction()" ${!isEligible ? 'disabled' : ''} class="w-full max-w-md py-3.5 ${isEligible ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-xl shadow-amber-500/25 active:scale-98 cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed'} font-black rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2">
                    <i class="fa-solid fa-signature"></i>
                    <span>${isEligible ? 'تسجيل الحضور والمزايدة في المزاد الملكي' : 'غير مؤهل (صافي الثروة أقل من المطلوب)'}</span>
                  </button>`
              }
            </div>
          </div>
        `;
      } else if (isEnded) {
        // Auction Ended / Winner Celebration
        const winner = this.state.winner || {};
        html += `
          <div class="p-6 rounded-2xl bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/50 text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-3xl mx-auto shadow-xl">
              👑
            </div>
            <div>
              <span class="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black">
                تم البيع رسميـاً — SOLD!
              </span>
              <h2 class="text-xl font-black text-white mt-2">مبروك للفائز [${winner.username || 'المشتري'}]!</h2>
              <p class="text-xs text-slate-300 mt-1">
                رسا المزاد بمبلغ <strong class="text-emerald-400 font-mono font-bold">${Number(winner.winningBid || 0).toLocaleString()} EGP</strong> 
                وتم تسليم الجائزة (${item.name}) لحسابه بنجاح.
              </p>
            </div>
          </div>
        `;
      }

      // --- 3. Recent Bids Log ---
      if (live.recentBids && live.recentBids.length > 0) {
        html += `
          <div class="space-y-2 pt-2">
            <h4 class="text-xs font-bold text-slate-400 flex items-center gap-2">
              <i class="fa-solid fa-list-ol text-amber-400"></i>
              <span>سجل المزايدات الحية بالصالة</span>
            </h4>
            <div class="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar">
              ${live.recentBids.map((b, idx) => `
                <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-mono">${idx + 1}</span>
                    <span class="font-bold text-white">${b.username}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <strong class="text-emerald-400 font-mono">${Number(b.amount).toLocaleString()} EGP</strong>
                    <span class="text-[10px] text-slate-500 font-mono">${new Date(b.time).toLocaleTimeString('ar-EG')}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      // --- 4. Registered Players Showcase List (During SCHEDULED & LIVE) ---
      const registrants = this.state.registrants || [];
      if (this.state.isScheduled || this.state.isLive) {
        html += `
          <div class="space-y-2 pt-2 border-t border-slate-800/80">
            <div class="flex items-center justify-between text-xs pb-1">
              <h4 class="font-bold text-slate-300 flex items-center gap-2">
                <i class="fa-solid fa-users text-amber-400"></i>
                <span>قائمة اللاعبين المسجلين في المزاد</span>
              </h4>
              <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30 font-mono">
                ${registrants.length} لاعب مسجل
              </span>
            </div>

            ${registrants.length === 0 ? `
              <div class="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
                <i class="fa-regular fa-id-badge text-slate-500 text-base mb-1 block"></i>
                لم يسجل أي لاعب بعد في هذا المزاد.
              </div>
            ` : `
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                ${registrants.map((r, idx) => `
                  <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs hover:border-amber-500/40 transition">
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-[10px] shrink-0 font-mono">
                        ${idx + 1}
                      </div>
                      <div class="truncate">
                        <span class="font-bold text-white block truncate text-[11px]">${r.username}</span>
                        <span class="text-[9px] text-slate-400 block font-mono">صافي الثروة: ${Number(r.netWorth || 0).toLocaleString()} ج.م</span>
                      </div>
                    </div>
                    <span class="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold shrink-0">
                      جاهز 🟢
                    </span>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        `;
      }

      body.innerHTML = html;
    }

    formatTimeRemaining(targetTimestamp) {
      if (!targetTimestamp) return '--:--';
      const diff = Math.max(0, targetTimestamp - Date.now());
      const totalSec = Math.floor(diff / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    // ==========================================
    // USER ACTIONS
    // ==========================================
    async registerAction() {
      const username = this.getCurrentUser();
      if (!username) {
        alert('يرجى تسجيل الدخول أولاً.');
        return;
      }

      try {
        const res = await fetch(`${this.getApiBase()}/api/auction/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'فشل التسجيل.');

        if (window.showToast) window.showToast('تم التسجيل بنجاح', data.message, 'success');
        else alert(data.message);

        this.fetchState();
      } catch (err) {
        if (window.showToast) window.showToast('تعذر التسجيل', err.message, 'error');
        else alert(err.message);
      }
    }

    async placeBidAction(amount) {
      if (!this.state.isRegistered) {
        if (window.showToast) window.showToast('مشاهد فقط', 'المزايدة مقتصرة فقط على المشتركين المسجلين في المزاد.', 'warning');
        else alert('المزايدة مقتصرة فقط على المشتركين المسجلين في المزاد.');
        return;
      }

      const username = this.getCurrentUser();
      if (!username) {
        alert('يرجى تسجيل الدخول أولاً.');
        return;
      }

      try {
        const res = await fetch(`${this.getApiBase()}/api/auction/bid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, amount })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'فشل وضع المزايدة.');

        if (window.showToast) window.showToast('تمت المزايدة!', data.message, 'success');
        this.fetchState();
      } catch (err) {
        if (window.showToast) window.showToast('فشل المزايدة', err.message, 'error');
        else alert(err.message);
      }
    }

    submitCustomBid() {
      const input = document.getElementById('auc-custom-bid-input');
      if (!input || !input.value) return;
      const amount = Number(input.value);
      this.placeBidAction(amount);
      input.value = '';
    }

    // ==========================================
    // AUDIO SYNTHESIS SFX (NO EXTERNAL ASSETS NEEDED)
    // ==========================================
    initAudio() {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioCtx = new AudioCtx();
      }
    }

    playHammerSound(strikeNumber) {
      try {
        this.initAudio();
        if (!this.audioCtx) return;
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(strikeNumber === 3 ? 120 : 180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      } catch (e) {}
    }

    playBidSound() {
      try {
        this.initAudio();
        if (!this.audioCtx) return;
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(780, now + 0.08);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
      } catch (e) {}
    }
  }

  window.RoyalAuction = new AuctionClient();
})();
