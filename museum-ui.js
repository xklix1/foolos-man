/**
 * Ras ALmal Tycoon — Grand Royal Museum & Antiquities UI Engine
 * Client-side Controller for Museum Gallery, Relic Showcase & Authoritative Buybacks
 */

(() => {
  'use strict';

  class RoyalMuseumManager {
    constructor() {
      this.items = [];
      this.playerRelics = [];
      this.activeTab = 'gallery'; // 'gallery' | 'collection' | 'history'
      this.isLoading = false;
      this.init();
    }

    init() {
      this.injectStyles();
      this.injectModalDOM();
      this.bindEvents();
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

    injectStyles() {
      if (document.getElementById('royal-museum-styles')) return;
      const style = document.createElement('style');
      style.id = 'royal-museum-styles';
      style.textContent = `
        /* Museum Modal Styles */
        #royal-museum-modal {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: none;
          align-items: center;
          justify-content: center;
          background: rgba(2, 4, 12, 0.88);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          padding: 1rem;
          overflow-y: auto;
          animation: musFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes musFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }

        .museum-card-glow {
          box-shadow: 0 0 25px rgba(217, 119, 6, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .museum-card-mythic {
          border: 1px solid rgba(245, 158, 11, 0.6) !important;
          background: radial-gradient(circle at top, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.95) 75%) !important;
        }

        .museum-card-legendary {
          border: 1px solid rgba(168, 85, 247, 0.5) !important;
          background: radial-gradient(circle at top, rgba(168, 85, 247, 0.12) 0%, rgba(15, 23, 42, 0.95) 75%) !important;
        }

        .museum-card-epic {
          border: 1px solid rgba(6, 182, 212, 0.4) !important;
          background: radial-gradient(circle at top, rgba(6, 182, 212, 0.1) 0%, rgba(15, 23, 42, 0.95) 75%) !important;
        }

        .relic-icon-float {
          animation: relicFloat 3s ease-in-out infinite;
        }
        @keyframes relicFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(2deg); }
        }
      `;
      document.head.appendChild(style);
    }

    injectModalDOM() {
      if (document.getElementById('royal-museum-modal')) return;

      const modalHtml = `
        <div id="royal-museum-modal" class="p-2 sm:p-4">
          <div class="glass-panel relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-amber-500/40 bg-slate-950/95 shadow-2xl overflow-hidden museum-card-glow text-right" dir="rtl">
            
            <!-- Header -->
            <div class="relative p-4 sm:p-6 bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-amber-950/60 border-b border-amber-500/30 flex items-center justify-between shrink-0">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-600/30 border border-amber-500/50 flex items-center justify-center text-2xl shadow-lg relic-icon-float">
                  🏛️
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h2 class="text-base sm:text-xl font-black text-white tracking-wide">المتحف الملكي العام والآثار النادرة</h2>
                    <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40">خزينة المقتنيات 👑</span>
                  </div>
                  <p class="text-[11px] text-slate-400 mt-0.5">معرض التحف التاريخية الخالدة، وملاذ الأثرياء لتداول المقتنيات النادرة واسترداد السيولة</p>
                </div>
              </div>

              <button id="btn-close-museum-modal" class="w-9 h-9 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 flex items-center justify-center transition active:scale-95 cursor-pointer">
                <i class="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <!-- Sub-Navigation Tabs -->
            <div class="flex items-center gap-2 p-3 bg-slate-900/70 border-b border-slate-800/80 shrink-0 overflow-x-auto">
              <button id="mus-tab-btn-gallery" onclick="window.RoyalMuseum.switchSubTab('gallery')"
                class="px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow cursor-pointer">
                <i class="fa-solid fa-landmark"></i>
                <span>معرض المتحف العام</span>
                <span id="mus-catalog-count-badge" class="px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-400 text-[10px]">0</span>
              </button>

              <button id="mus-tab-btn-collection" onclick="window.RoyalMuseum.switchSubTab('collection')"
                class="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/80 transition flex items-center gap-2 cursor-pointer">
                <i class="fa-solid fa-gem text-amber-400"></i>
                <span>مقتنياتي الأثرية الخاصة</span>
                <span id="mus-player-relics-badge" class="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">0</span>
              </button>

              <button onclick="window.RoyalAuction?.openModal?.(); window.RoyalMuseum.closeModal();"
                class="mr-auto px-3.5 py-2 rounded-xl text-xs font-bold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer">
                <i class="fa-solid fa-gavel text-amber-400"></i>
                <span>المزاد الملكي المباشر</span>
              </button>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              
              <!-- TAB 1: MUSEUM VAULT GALLERY -->
              <div id="mus-panel-gallery" class="space-y-4">
                <div class="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
                  <div class="flex items-center gap-2.5">
                    <span class="text-xl">📜</span>
                    <span>تُطرح هذه الآثار والتحف حصرياً في <strong>المزادات الملكية الحية</strong>، ويضمن المتحف استردادها وشراءها بالكاش في أي وقت!</span>
                  </div>
                  <div class="text-[11px] text-amber-400 font-bold shrink-0">
                    <i class="fa-solid fa-shield-halved mr-1"></i> سيولة مضمونة 100%
                  </div>
                </div>

                <!-- Grid of Museum Items -->
                <div id="mus-gallery-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="col-span-full text-center py-10 text-slate-500 text-xs">
                    <i class="fa-solid fa-spinner fa-spin text-lg mb-2 block text-amber-400"></i>
                    جاري فحص مقتنيات المتحف الملكي...
                  </div>
                </div>
              </div>

              <!-- TAB 2: MY PRIVATE COLLECTION -->
              <div id="mus-panel-collection" class="space-y-4 hidden">
                <div class="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
                  <div class="flex items-center gap-2.5">
                    <span class="text-xl">👑</span>
                    <span>هذه هي التحف التي فزت بها في المزادات. يمكنك الاحتفاظ بها لرفع ثروتك وهيبتك أو <strong>بيعها للمتحف واسترداد قيمتها فوراً</strong>.</span>
                  </div>
                </div>

                <!-- Grid of Player Owned Relics -->
                <div id="mus-collection-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="col-span-full text-center py-10 text-slate-500 text-xs">
                    لا توجد لديك تحف أثرية حالياً. شارك في المزادات الملكية لامتلاك أول تحفة!
                  </div>
                </div>
              </div>

            </div>

            <!-- Footer Status Bar -->
            <div class="p-3 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 shrink-0">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-building-columns text-amber-400"></i>
                <span>الهيئة الملكية للآثار والمقتنيات النادرة</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-emerald-400 font-bold"><i class="fa-solid fa-circle-check text-[9px] mr-1"></i> التحقق السيادي مفعل</span>
              </div>
            </div>

          </div>
        </div>
      `;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = modalHtml;
      document.body.appendChild(wrapper.firstElementChild);
    }

    bindEvents() {
      const closeBtn = document.getElementById('btn-close-museum-modal');
      const modal = document.getElementById('royal-museum-modal');
      
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeModal());
      }

      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeModal();
        });
      }
    }

    switchSubTab(tab) {
      this.activeTab = tab;
      const galleryBtn = document.getElementById('mus-tab-btn-gallery');
      const collectionBtn = document.getElementById('mus-tab-btn-collection');
      const galleryPanel = document.getElementById('mus-panel-gallery');
      const collectionPanel = document.getElementById('mus-panel-collection');

      if (tab === 'gallery') {
        galleryPanel?.classList.remove('hidden');
        collectionPanel?.classList.add('hidden');
        galleryBtn?.classList.remove('text-slate-300', 'hover:bg-slate-800/80');
        galleryBtn?.classList.add('bg-gradient-to-r', 'from-amber-500', 'to-yellow-500', 'text-slate-950', 'shadow');
        collectionBtn?.classList.remove('bg-gradient-to-r', 'from-amber-500', 'to-yellow-500', 'text-slate-950', 'shadow');
        collectionBtn?.classList.add('text-slate-300');
        this.renderGallery();
      } else {
        collectionPanel?.classList.remove('hidden');
        galleryPanel?.classList.add('hidden');
        collectionBtn?.classList.remove('text-slate-300');
        collectionBtn?.classList.add('bg-gradient-to-r', 'from-amber-500', 'to-yellow-500', 'text-slate-950', 'shadow');
        galleryBtn?.classList.remove('bg-gradient-to-r', 'from-amber-500', 'to-yellow-500', 'text-slate-950', 'shadow');
        galleryBtn?.classList.add('text-slate-300', 'hover:bg-slate-800/80');
        this.renderCollection();
      }
    }

    async openModal() {
      const modal = document.getElementById('royal-museum-modal');
      if (!modal) return;
      modal.style.display = 'flex';
      this.playRelicSound();
      await this.fetchData();
    }

    closeModal() {
      const modal = document.getElementById('royal-museum-modal');
      if (modal) modal.style.display = 'none';
    }

    async fetchData() {
      try {
        const [itemsRes, playerRes] = await Promise.all([
          fetch(`${this.getApiBase()}/api/museum/items`, { headers: { 'Cache-Control': 'no-cache' } }),
          fetch(`${this.getApiBase()}/api/museum/player-relics?username=${encodeURIComponent(this.getCurrentUser())}`, { headers: { 'Cache-Control': 'no-cache' } })
        ]);

        if (itemsRes.ok) {
          const d = await itemsRes.json();
          this.items = d.items || [];
        }

        if (playerRes.ok) {
          const pd = await playerRes.json();
          this.playerRelics = pd.relics || [];
        }

        // Also check GameEngine local state
        if (window.GameEngine?.state?.museumRelics && Array.isArray(window.GameEngine.state.museumRelics)) {
          if (this.playerRelics.length === 0) {
            this.playerRelics = window.GameEngine.state.museumRelics;
          }
        }

        this.updateBadges();
        if (this.activeTab === 'gallery') this.renderGallery();
        else this.renderCollection();

      } catch (err) {
        console.warn('[MuseumUI] fetch error:', err.message);
      }
    }

    updateBadges() {
      const catCountEl = document.getElementById('mus-catalog-count-badge');
      const pCountEl = document.getElementById('mus-player-relics-badge');
      if (catCountEl) catCountEl.textContent = this.items.length;
      if (pCountEl) pCountEl.textContent = this.playerRelics.length;
    }

    renderGallery() {
      const grid = document.getElementById('mus-gallery-grid');
      if (!grid) return;

      if (!this.items || this.items.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-8 text-slate-500 text-xs">لا توجد تحف مسجلة في المتحف حالياً.</div>';
        return;
      }

      grid.innerHTML = this.items.map(item => {
        const cardClass = item.rarity === 'mythic' ? 'museum-card-mythic' : (item.rarity === 'legendary' ? 'museum-card-legendary' : 'museum-card-epic');
        const inStock = Number(item.stock || 0) > 0;

        return `
          <div class="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 ${cardClass} flex flex-col justify-between gap-3 shadow-lg relative overflow-hidden group">
            
            <div class="flex items-start justify-between gap-3">
              <div class="w-14 h-14 rounded-2xl bg-slate-950/80 border border-slate-700/60 flex items-center justify-center text-3xl shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                ${item.icon || '🏺'}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap mb-1">
                  <span class="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">${item.category || 'آثار نادرة'}</span>
                  <span class="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">${item.edition || 'إصدار ملكي'}</span>
                  ${!inStock ? '<span class="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">مملوكة للاعبين 👑</span>' : ''}
                </div>
                <h3 class="text-sm font-black text-white leading-tight truncate">${item.name}</h3>
                <span class="text-[10px] font-bold text-amber-400 block mt-0.5">${item.rarityLabel || item.rarity}</span>
              </div>
            </div>

            <p class="text-xs text-slate-300/90 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 line-clamp-3">
              ${item.description || 'تحفة نادرة ذات قيمة تاريخية واستثمارية استثنائية.'}
            </p>

            <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <span class="text-[10px] text-slate-400 block font-bold">القيمة التقديرية (سعر الاسترداد):</span>
                <span class="numbers-font font-black text-emerald-400 text-sm">${Number(item.buybackPrice || 0).toLocaleString()} ج.م</span>
              </div>
              <div class="text-left">
                <span class="text-[10px] text-slate-400 block font-bold">الكمية المتاحة:</span>
                <span class="font-bold ${inStock ? 'text-amber-400' : 'text-slate-500'}">${item.stock} قطعة</span>
              </div>
            </div>

          </div>
        `;
      }).join('');
    }

    renderCollection() {
      const grid = document.getElementById('mus-collection-grid');
      if (!grid) return;

      if (!this.playerRelics || this.playerRelics.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full text-center py-12 px-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs space-y-3">
            <span class="text-4xl block">🏺</span>
            <strong class="text-white block text-sm">حقيبة مقتنياتك الأثرية فارغة حالياً</strong>
            <p class="max-w-md mx-auto text-slate-400 text-[11px]">شارك في المزادات الملكية القادمة لامتلاك تحف أثرية نادرة وضمها لمعرضك الخاص أو بيعها للمتحف في أي وقت!</p>
            <button onclick="window.RoyalAuction?.openModal?.(); window.RoyalMuseum.closeModal();"
              class="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs shadow-lg transition active:scale-95 cursor-pointer">
              <i class="fa-solid fa-gavel mr-1"></i> الذهاب لقاعة المزادات
            </button>
          </div>
        `;
        return;
      }

      grid.innerHTML = this.playerRelics.map(relic => {
        const relicId = relic.id || relic.relicId;
        const buyback = Number(relic.buybackPrice || 0);

        return `
          <div class="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-amber-500/40 museum-card-mythic flex flex-col justify-between gap-3 shadow-xl relative overflow-hidden">
            
            <div class="flex items-start justify-between gap-3">
              <div class="w-14 h-14 rounded-2xl bg-slate-950 border border-amber-500/40 flex items-center justify-center text-3xl shrink-0 shadow relic-icon-float">
                ${relic.icon || '🏺'}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap mb-1">
                  <span class="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">في حوزتك 👑</span>
                  <span class="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">${relic.edition || 'إصدار ملكي'}</span>
                </div>
                <h3 class="text-sm font-black text-white leading-tight truncate">${relic.name}</h3>
                <span class="text-[10px] font-bold text-amber-400 block mt-0.5">${relic.rarityLabel || relic.rarity || 'تحفة نادرة'}</span>
              </div>
            </div>

            <p class="text-xs text-slate-300/90 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 line-clamp-2">
              ${relic.description || 'قطعة أثرية ملكية مسجلة في ملفك الشخصي تمنحك هيبة وقيمة استثمارية.'}
            </p>

            <div class="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span class="text-[10px] text-slate-400 block font-bold">سعر استرداد المتحف (الكاش المستلم):</span>
                <span class="numbers-font font-black text-emerald-400 text-sm">+${buyback.toLocaleString()} ج.م</span>
              </div>

              <button onclick="window.RoyalMuseum.confirmSellToMuseum('${relicId}', '${(relic.name || '').replace(/'/g, "\\'")}', ${buyback})"
                class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-hand-holding-dollar"></i>
                <span>بيع للمتحف واسترداد السيولة</span>
              </button>
            </div>

          </div>
        `;
      }).join('');
    }

    async confirmSellToMuseum(relicId, relicName, buybackPrice) {
      if (!confirm(`هل أنت متأكد من رغبتك في بيع [${relicName}] للمتحف الملكي؟\n\nسيتم إيداع مبلغ (+${buybackPrice.toLocaleString()} ج.م) فوراً في حسابك البنكي.`)) {
        return;
      }

      try {
        const username = this.getCurrentUser();
        const res = await fetch(`${this.getApiBase()}/api/museum/sell-to-museum`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, relicId })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'فشل إتمام البيع للمتحف.');

        // Update local GameEngine state if active
        if (window.GameEngine && window.GameEngine.state) {
          if (Array.isArray(window.GameEngine.state.museumRelics)) {
            window.GameEngine.state.museumRelics = window.GameEngine.state.museumRelics.filter(r => 
              String(r.id) !== String(relicId) && String(r.relicId) !== String(relicId)
            );
          }
          if (typeof data.newBankBalance === 'number') {
            window.GameEngine.state.bank = data.newBankBalance;
          }
          if (typeof window.UI?.renderAll === 'function') window.UI.renderAll();
          if (typeof window.UIController?.renderAll === 'function') window.UIController.renderAll();
        }

        this.playCashSound();
        if (window.UI?.showToast) {
          window.UI.showToast('المتحف الملكي 🏛️', data.message || 'تم بيع التحفة واستلام الكاش بنجاح!', 'success');
        } else {
          alert(data.message || 'تم بيع التحفة واستلام الكاش بنجاح!');
        }

        await this.fetchData();

      } catch (err) {
        if (window.UI?.showToast) window.UI.showToast('خطأ', err.message, 'error');
        else alert(err.message);
      }
    }

    playRelicSound() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.3); // G5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } catch (e) {}
    }

    playCashSound() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (e) {}
    }
  }

  window.RoyalMuseum = new RoyalMuseumManager();
})();
