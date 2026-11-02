/**
 * Ras ALmal Tycoon — Authoritative Player-to-Player (P2P) Market Service
 * Manages Free Player Trading, Escrow Asset Locking, Price Bounding,
 * Instant Partial/Full Purchases, 3% Market Commission, Expiration & Market Vault.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sessionManager = require('./session-manager');
const dbService = require('./db-service');
const { calculateNetWorth } = require('../engine/net-worth-engine');

const MARKET_STATE_FILE = path.join(__dirname, '..', '..', 'data', 'p2p-market-state.json');

// Master Catalog of Tradeable Commodities, Minerals, Crops, Aircraft & Rockets
const MARKET_ITEM_CATALOG = {
  // 1. Trade Cargo Containers (حاويات الاستيراد والتصدير)
  trade_containers: {
    espresso_coffee: { name: 'قهوة اسبريسو فاخرة', icon: 'fa-mug-hot text-amber-500', basePrice: 80000, stackable: true },
    fashion_brands: { name: 'أزياء وماركات عالمية', icon: 'fa-shirt text-pink-400', basePrice: 220000, stackable: true },
    auto_spare_parts: { name: 'قطع غيار سيارات ومحركات', icon: 'fa-gears text-blue-400', basePrice: 650000, stackable: true },
    solar_panels: { name: 'ألواح وخلايا طاقة شمسية', icon: 'fa-solar-panel text-yellow-400', basePrice: 1800000, stackable: true },
    luxury_cars: { name: 'أساطيل سيارات فارهة', icon: 'fa-car text-emerald-400', basePrice: 4500000, stackable: true },
    industrial_turbines: { name: 'توربينات ومولدات صناعية', icon: 'fa-fan text-cyan-400', basePrice: 9500000, stackable: true },
    ai_quantum_chips: { name: 'معالجات كوانتم وسيرفرات AI', icon: 'fa-microchip text-purple-400', basePrice: 18000000, stackable: true },
    gold_bullion_bars: { name: 'سبائك ذهب بنكية معتمدة', icon: 'fa-coins text-amber-300', basePrice: 35000000, stackable: true }
  },

  // 2. Space Minerals (خامات ومعادن الفضاء بالكيلوغرام)
  space_minerals: {
    regolith: { name: 'ريجوليث قمري', icon: 'fa-cubes text-slate-300', basePrice: 8000, stackable: true },
    iron: { name: 'حديد نيزكي', icon: 'fa-shield-halved text-blue-400', basePrice: 24000, stackable: true },
    platinum: { name: 'بلاتين كويكبي', icon: 'fa-gem text-cyan-300', basePrice: 55000, stackable: true },
    helium3: { name: 'هيليوم-3 كوني', icon: 'fa-atom text-amber-400', basePrice: 150000, stackable: true },
    lithium: { name: 'ليثيوم فضائي', icon: 'fa-bolt text-yellow-300', basePrice: 240000, stackable: true },
    dark_matter: { name: 'بلورات المادة المظلمة', icon: 'fa-wand-magic-sparkles text-fuchsia-400', basePrice: 450000, stackable: true }
  },

  // 3. Farm Crops & Livestock Products (محاصيل المزرعة ومنتجاتها)
  farm_crops: {
    wheat: { name: 'القمح الذهبي', icon: 'fa-wheat-awn text-amber-500', basePrice: 6, stackable: true },
    tomato: { name: 'طماطم وخضار طازجة', icon: 'fa-carrot text-rose-500', basePrice: 24, stackable: true },
    strawberry: { name: 'فراولة عضوية فاخرة', icon: 'fa-apple-whole text-red-500', basePrice: 118, stackable: true },
    coffee: { name: 'حبوب البن العربي', icon: 'fa-mug-hot text-yellow-500', basePrice: 490, stackable: true },
    dates: { name: 'نخيل تمور المجدول', icon: 'fa-tree text-emerald-500', basePrice: 2450, stackable: true },
    saffron: { name: 'الزعفران الإمبراطوري', icon: 'fa-spa text-purple-400', basePrice: 9800, stackable: true },
    milk: { name: 'حليب أبقار طازج', icon: 'fa-glass-water text-slate-100', basePrice: 45, stackable: true },
    eggs: { name: 'بيض دواجن مزارع', icon: 'fa-egg text-amber-200', basePrice: 20, stackable: true },
    compost: { name: 'سماد عضوي عالي الجودة', icon: 'fa-recycle text-emerald-400', basePrice: 15, stackable: true },
    flour_bread: { name: 'سلة مخبوزات ودقيق فاخر', icon: 'fa-bread-slice text-amber-400', basePrice: 35, stackable: true },
    tomato_paste: { name: 'صلصة معلبة وكاتشب تصدير', icon: 'fa-jar text-rose-400', basePrice: 142, stackable: true },
    strawberry_jam: { name: 'مربى فراولة عضوية', icon: 'fa-bowl-food text-red-400', basePrice: 720, stackable: true },
    coffee_roasted: { name: 'بن عربي محمص ومطحون', icon: 'fa-fire-burner text-amber-600', basePrice: 2850, stackable: true },
    luxury_dates_box: { name: 'صندوق تمور مجدول VIP', icon: 'fa-box-open text-emerald-300', basePrice: 14500, stackable: true },
    saffron_extract: { name: 'خلاصة زعفران ملكي مركزة', icon: 'fa-flask text-purple-300', basePrice: 58000, stackable: true }
  },

  // 4. Airport Aircraft (طائرات المطار الدولي)
  airport_aircraft: {
    cessna_sky: { name: 'Cessna Sky Courier', icon: 'fa-plane text-sky-400', basePrice: 3000000, stackable: false },
    airbus_a320: { name: 'Airbus A320neo', icon: 'fa-plane-departure text-blue-400', basePrice: 15000000, stackable: false },
    boeing_777: { name: 'Boeing 777-300ER', icon: 'fa-plane-up text-indigo-400', basePrice: 55000000, stackable: false },
    gulfstream_g650: { name: 'Gulfstream G650 VIP', icon: 'fa-jet-fighter-up text-amber-400', basePrice: 85000000, stackable: false },
    cargo_beluga: { name: 'Beluga XL العملاقة للشحن', icon: 'fa-truck-plane text-teal-400', basePrice: 125000000, stackable: false },
    airbus_a380: { name: 'Airbus A380 سوبر جامبو', icon: 'fa-plane-arrival text-emerald-400', basePrice: 220000000, stackable: false }
  },

  // 5. Space Rockets (صواريخ الفضاء ومركبات الاستكشاف)
  space_rockets: {
    orion_probe: { name: 'مسبار أوريون-1 الاستكشافي', icon: 'fa-shuttle-space text-sky-400', basePrice: 100000000, stackable: false },
    falcon_star: { name: 'صاروخ فالكون ستار التكتيكي', icon: 'fa-rocket text-indigo-400', basePrice: 500000000, stackable: false },
    heavy_starship: { name: 'سفينة التعدين Heavy Starship', icon: 'fa-meteor text-amber-400', basePrice: 2000000000, stackable: false },
    quantum_dreadnought: { name: 'مركبة كوانتم للتعدين الفضائي', icon: 'fa-satellite text-purple-400', basePrice: 10000000000, stackable: false }
  }
};

class MarketService {
  constructor() {
    this.listings = [];
    this._locks = new Set();
    this._loadState();
    this._startTicker();
  }

  _loadState() {
    try {
      if (fs.existsSync(MARKET_STATE_FILE)) {
        const raw = fs.readFileSync(MARKET_STATE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        this.listings = Array.isArray(parsed.listings) ? parsed.listings : [];
      } else {
        this._saveState();
      }
    } catch (err) {
      console.error('[MarketService] Failed to load market state file, initializing clean array:', err.message);
      this.listings = [];
    }
  }

  _saveState() {
    try {
      const data = {
        listings: this.listings,
        savedAt: Date.now()
      };
      const tmpPath = MARKET_STATE_FILE + '.tmp';
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tmpPath, MARKET_STATE_FILE);
    } catch (err) {
      console.error('[MarketService] Failed to save market state:', err.message);
    }
  }

  _startTicker() {
    // Check expired listings every 60 seconds
    setInterval(() => {
      this.checkExpiredListings().catch(err => {
        console.error('[MarketService] Ticker error checking expired listings:', err.message);
      });
    }, 60000);
  }

  /**
   * Helper to ensure player state has an authoritative marketVault object
   */
  _ensureVault(state) {
    if (!state.marketVault || typeof state.marketVault !== 'object') {
      state.marketVault = {
        earnings: 0,
        salesHistory: [],
        returnedItems: []
      };
    }
    if (typeof state.marketVault.earnings !== 'number') state.marketVault.earnings = 0;
    if (!Array.isArray(state.marketVault.salesHistory)) state.marketVault.salesHistory = [];
    if (!Array.isArray(state.marketVault.returnedItems)) state.marketVault.returnedItems = [];
    return state.marketVault;
  }

  /**
   * Helper to resolve or load a player's authoritative session
   */
  async _resolvePlayerSession(username) {
    const uKey = String(username).trim().toLowerCase();
    let session = sessionManager.sessions.get(uKey);
    if (!session) {
      const res = await sessionManager.getSession(username);
      session = res.session;
    }
    return session;
  }

  /**
   * Returns active browse listings with category filters, search and sorting
   */
  getBrowseListings({ category = 'all', search = '', sort = 'newest', page = 1, limit = 24 }) {
    const now = Date.now();
    let filtered = this.listings.filter(l => l.status === 'ACTIVE' && now < Number(l.expiresAt || 0) && l.quantityRemaining > 0);

    if (category && category !== 'all') {
      filtered = filtered.filter(l => l.category === category);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(l => {
        const name = (l.itemName || '').toLowerCase();
        const seller = (l.sellerUsername || '').toLowerCase();
        return name.includes(q) || seller.includes(q);
      });
    }

    // Sort options
    if (sort === 'cheapest') {
      filtered.sort((a, b) => Number(a.unitPrice) - Number(b.unitPrice));
    } else if (sort === 'highest_qty') {
      filtered.sort((a, b) => Number(b.quantityRemaining) - Number(a.quantityRemaining));
    } else if (sort === 'expiring_soon') {
      filtered.sort((a, b) => Number(a.expiresAt) - Number(b.expiresAt));
    } else {
      // Default: newest
      filtered.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    }

    const totalCount = filtered.length;
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 24));
    const offset = (safePage - 1) * safeLimit;
    const paginated = filtered.slice(offset, offset + safeLimit);

    return {
      success: true,
      totalCount,
      page: safePage,
      totalPages: Math.ceil(totalCount / safeLimit) || 1,
      listings: paginated,
      catalog: MARKET_ITEM_CATALOG
    };
  }

  /**
   * Returns all listings created by a specific player (active, sold, cancelled)
   */
  getMyListings(username) {
    if (!username) return { success: true, listings: [] };
    const uClean = String(username).trim().toLowerCase();
    const myListings = this.listings
      .filter(l => (l.sellerUsername || '').toLowerCase() === uClean)
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));

    const activeCount = myListings.filter(l => l.status === 'ACTIVE' && Date.now() < Number(l.expiresAt || 0)).length;

    return {
      success: true,
      activeCount,
      maxAllowedListings: 10,
      listings: myListings
    };
  }

  /**
   * Returns the player's Market Vault (unclaimed earnings, sales history, returned unsold goods)
   */
  async getMarketVault(username) {
    const session = await this._resolvePlayerSession(username);
    if (!session || !session.state) throw new Error("تعذر جلب بيانات الحساب.");
    const vault = this._ensureVault(session.state);
    return {
      success: true,
      earnings: vault.earnings || 0,
      salesHistory: vault.salesHistory || [],
      returnedItems: vault.returnedItems || []
    };
  }

  /**
   * Creates a new P2P Market listing.
   * Immediately escrows (locks and deducts) the asset from the seller's state.
   */
  async createListing(username, { category, itemId, quantity = 1, unitPrice, durationHours = 24 }) {
    if (!username) throw new Error("اسم المستخدم مطلوب.");
    const uClean = String(username).trim();

    // 1. Validate Category and Item Definition
    const catGroup = MARKET_ITEM_CATALOG[category];
    if (!catGroup) throw new Error("تصنيف السلعة غير صالح في سجلات السوق.");
    const itemDef = catGroup[itemId];
    if (!itemDef) throw new Error("السلعة المحددة غير معتمدة في سوق التجارة الحرة.");

    // 2. Validate Duration
    const durNum = parseInt(durationHours, 10);
    if (![6, 12, 24, 48].includes(durNum)) {
      throw new Error("مدة العرض المحددة غير صالحة. المدد المتاحة: 6، 12، 24، أو 48 ساعة.");
    }

    // 3. Validate Quantity
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0 || isNaN(qty)) {
      throw new Error("يرجى تحديد كمية صحيحة موجبة.");
    }
    if (!itemDef.stackable && qty !== 1) {
      throw new Error(`سلعة "${itemDef.name}" أصل فريد ويجب عرضها كوحدة واحدة (كمية: 1) فقط.`);
    }

    // 4. Validate Price Bounding (50% to 300% of Base Price)
    const price = parseInt(unitPrice, 10);
    if (!price || price <= 0 || isNaN(price)) {
      throw new Error("يرجى إدخال سعر بيع صحيح.");
    }
    const minPrice = Math.max(1, Math.floor(itemDef.basePrice * 0.5));
    const maxPrice = Math.max(minPrice, Math.ceil(itemDef.basePrice * 3.0));

    if (price < minPrice || price > maxPrice) {
      throw new Error(`سعر الوحدة (${price.toLocaleString()} ج.م) خارج النطاق السعري المسموح به لـ "${itemDef.name}". النطاق المسموح: من ${minPrice.toLocaleString()} ج.م إلى ${maxPrice.toLocaleString()} ج.م (50% - 300%).`);
    }

    // 5. Check Active Listings Limit (Max 10)
    const now = Date.now();
    const activeListings = this.listings.filter(l => (l.sellerUsername || '').toLowerCase() === uClean.toLowerCase() && l.status === 'ACTIVE' && now < Number(l.expiresAt || 0));
    if (activeListings.length >= 10) {
      throw new Error("لقد وصلت إلى الحد الأقصى للعروض النشطة في السوق (10 عروض)! انتظر بيع أحد العروض أو قم بإلغائه أولاً.");
    }

    // 6. Verify and Escrow (Deduct) Asset from Seller State
    const session = await this._resolvePlayerSession(username);
    if (!session || !session.state) throw new Error("تعذر الوصول لبيانات اللاعب على السيرفر.");
    const s = session.state;

    if (s.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك إدارة عروض سوق التجارة.");

    let customData = null;

    if (category === 'trade_containers') {
      const tc = s.tradeCompany;
      if (!tc || !tc.warehouse || (Number(tc.warehouse[itemId]) || 0) < qty) {
        throw new Error(`ليس لديك رصيد كافٍ من حاويات "${itemDef.name}" في مستودعك الجمركي! المخزن لديك: ${(tc && tc.warehouse && tc.warehouse[itemId]) || 0} حاوية.`);
      }
      tc.warehouse[itemId] -= qty;
      if (tc.warehouse[itemId] <= 0) delete tc.warehouse[itemId];
    } else if (category === 'space_minerals') {
      const sp = s.space;
      if (!sp || !sp.warehouse || (Number(sp.warehouse[itemId]) || 0) < qty) {
        throw new Error(`ليس لديك كمية كافية من معدن "${itemDef.name}" في صومعة الفضاء! المتوفر لديك: ${(sp && sp.warehouse && sp.warehouse[itemId]) || 0} كجم.`);
      }
      sp.warehouse[itemId] -= qty;
      if (sp.warehouse[itemId] <= 0) delete sp.warehouse[itemId];
    } else if (category === 'farm_crops') {
      const farm = s.farm || {};
      const storage = farm.storage || {};
      const livestock = farm.livestock || {};
      const isLivestockProd = ['milk', 'eggs', 'compost'].includes(itemId);

      if (isLivestockProd) {
        const available = Number(livestock[itemId] || 0);
        if (available < qty) {
          throw new Error(`ليس لديك مخزون كافٍ من "${itemDef.name}" في حظائر المزرعة! المتوفر: ${available}.`);
        }
        livestock[itemId] -= qty;
      } else {
        const available = Number(storage[itemId] || 0);
        if (available < qty) {
          throw new Error(`ليس لديك مخزون كافٍ من محصول "${itemDef.name}" في صوامع المزرعة! المتوفر: ${available}.`);
        }
        storage[itemId] -= qty;
      }
    } else if (category === 'airport_aircraft') {
      const airport = s.airport || {};
      const fleet = Array.isArray(airport.fleet) ? airport.fleet : [];
      const craftIdx = fleet.findIndex(c => {
        const mId = c && (c.modelId || c.id);
        const isFree = !c.inFlight && c.status !== 'in_flight';
        return mId === itemId && isFree;
      });
      if (craftIdx === -1) {
        throw new Error(`لا تمتلك طائرة جاهزة من طراز "${itemDef.name}" غير مشغولة في رحلة جوية حالياً.`);
      }
      customData = fleet.splice(craftIdx, 1)[0];
    } else if (category === 'space_rockets') {
      const space = s.space || {};
      const rockets = Array.isArray(space.activeRockets) ? space.activeRockets : [];
      const rktIdx = rockets.findIndex(r => {
        const mId = r && (r.modelId || r.id);
        const isFree = !r.launched && r.status !== 'flying';
        return mId === itemId && isFree;
      });
      if (rktIdx === -1) {
        throw new Error(`لا تمتلك صاروخاً جاهزاً من فئة "${itemDef.name}" غير منطلق في مهمة تعدين فضائية حالياً.`);
      }
      customData = rockets.splice(rktIdx, 1)[0];
    }

    // 7. Update Net Worth & Mark Session Dirty
    s.netWorth = calculateNetWorth(s);
    session.dirty = true;
    await sessionManager.forceSaveSession(username).catch(() => {});

    // 8. Construct Listing Object
    const listingId = 'mkt_' + now + '_' + crypto.randomBytes(4).toString('hex');
    const expiresAt = now + (durNum * 3600 * 1000);

    const listing = {
      id: listingId,
      sellerUsername: uClean,
      category,
      itemId,
      itemName: itemDef.name,
      itemIcon: itemDef.icon,
      stackable: itemDef.stackable,
      initialQuantity: qty,
      quantityRemaining: qty,
      unitPrice: price,
      totalInitialValue: qty * price,
      durationHours: durNum,
      createdAt: now,
      expiresAt,
      status: 'ACTIVE',
      customData
    };

    this.listings.unshift(listing);
    this._saveState();

    return {
      success: true,
      message: `تم حجز وعرض ${qty} من "${itemDef.name}" بسعر ${price.toLocaleString()} ج.م للوحدة في سوق التجارة بنجاح.`,
      listing
    };
  }

  /**
   * Executes a purchase of an active listing (supports partial quantity for stackable goods)
   */
  async buyListing(buyerUsername, listingId, buyQuantity = 1) {
    if (!buyerUsername) throw new Error("اسم المشتري مطلوب.");
    const bClean = String(buyerUsername).trim();

    // Lock listing to prevent race conditions / duplicate purchases
    if (this._locks.has(listingId)) {
      throw new Error("هذا العرض قيد المعالجة من مشترٍ آخر حالياً، يرجى المحاولة بعد لحظات.");
    }
    this._locks.add(listingId);

    try {
      const listing = this.listings.find(l => l.id === listingId);
      if (!listing) throw new Error("عرض البيع المحدد غير موجود في السوق.");

      const now = Date.now();
      if (listing.status !== 'ACTIVE' || now >= Number(listing.expiresAt || 0)) {
        throw new Error("هذا العرض لم يعد متاحاً أو انتهت مدة صلاحيته.");
      }

      if ((listing.sellerUsername || '').toLowerCase() === bClean.toLowerCase()) {
        throw new Error("لا يمكنك شراء السلعة التي قمت بعرضها بنفسك! يمكنك إلغاء عرضك واسترجاعها.");
      }

      const qty = parseInt(buyQuantity, 10);
      if (!qty || qty <= 0 || isNaN(qty)) {
        throw new Error("يرجى تحديد كمية شراء صحيحة.");
      }

      if (!listing.stackable && qty !== 1) {
        throw new Error("هذا الأصل فريد ويجب شراؤه بالكامل (كمية 1).");
      }

      if (qty > listing.quantityRemaining) {
        throw new Error(`الكمية المطلوبة (${qty}) تتجاوز المتبقي المعروض في السوق (${listing.quantityRemaining} وحدة).`);
      }

      const totalCost = qty * listing.unitPrice;
      const commission = Math.floor(totalCost * 0.03); // 3% Market broker fee
      const sellerNet = totalCost - commission;

      // Resolve Buyer Session
      const buyerSession = await this._resolvePlayerSession(bClean);
      if (!buyerSession || !buyerSession.state) throw new Error("تعذر جلب بيانات المشتري.");
      const bs = buyerSession.state;

      if (bs.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك إتمام عمليات الشراء من السوق.");

      const buyerFunds = (Number(bs.cash) || 0) + (Number(bs.bank) || 0);
      if (buyerFunds < totalCost) {
        throw new Error(`رصيدك المالي غير كافٍ لإتمام الشراء. المطلوب: ${totalCost.toLocaleString()} ج.م (رصيدك الإجمالي: ${buyerFunds.toLocaleString()} ج.م).`);
      }

      // Deduct Funds from Buyer
      if ((Number(bs.cash) || 0) >= totalCost) {
        bs.cash -= totalCost;
      } else {
        const rem = totalCost - (Number(bs.cash) || 0);
        bs.cash = 0;
        bs.bank -= rem;
      }

      // Deliver Purchased Assets to Buyer
      if (listing.category === 'trade_containers') {
        bs.tradeCompany = bs.tradeCompany || { warehouse: {} };
        bs.tradeCompany.warehouse = bs.tradeCompany.warehouse || {};
        bs.tradeCompany.warehouse[listing.itemId] = (Number(bs.tradeCompany.warehouse[listing.itemId]) || 0) + qty;
      } else if (listing.category === 'space_minerals') {
        bs.space = bs.space || { warehouse: {} };
        bs.space.warehouse = bs.space.warehouse || {};
        bs.space.warehouse[listing.itemId] = (Number(bs.space.warehouse[listing.itemId]) || 0) + qty;
      } else if (listing.category === 'farm_crops') {
        bs.farm = bs.farm || { storage: {}, livestock: {} };
        const isLivestock = ['milk', 'eggs', 'compost'].includes(listing.itemId);
        if (isLivestock) {
          bs.farm.livestock = bs.farm.livestock || {};
          bs.farm.livestock[listing.itemId] = (Number(bs.farm.livestock[listing.itemId]) || 0) + qty;
        } else {
          bs.farm.storage = bs.farm.storage || {};
          bs.farm.storage[listing.itemId] = (Number(bs.farm.storage[listing.itemId]) || 0) + qty;
        }
      } else if (listing.category === 'airport_aircraft') {
        bs.airport = bs.airport || { fleet: [] };
        if (!Array.isArray(bs.airport.fleet)) bs.airport.fleet = [];
        const craftObj = listing.customData || {
          id: 'craft_' + now + '_' + crypto.randomBytes(3).toString('hex'),
          modelId: listing.itemId,
          status: 'idle',
          inFlight: false,
          purchasedAt: now
        };
        craftObj.inFlight = false;
        craftObj.status = 'idle';
        bs.airport.fleet.push(craftObj);
      } else if (listing.category === 'space_rockets') {
        bs.space = bs.space || { activeRockets: [] };
        if (!Array.isArray(bs.space.activeRockets)) bs.space.activeRockets = [];
        const rocketObj = listing.customData || {
          id: 'rkt_' + now + '_' + crypto.randomBytes(3).toString('hex'),
          modelId: listing.itemId,
          status: 'idle',
          launched: false,
          purchasedAt: now
        };
        rocketObj.launched = false;
        rocketObj.status = 'idle';
        bs.space.activeRockets.push(rocketObj);
      }

      bs.netWorth = calculateNetWorth(bs);
      buyerSession.dirty = true;
      await sessionManager.forceSaveSession(bClean).catch(() => {});

      // Credit Seller via Market Vault
      const sellerSession = await this._resolvePlayerSession(listing.sellerUsername);
      if (sellerSession && sellerSession.state) {
        const ss = sellerSession.state;
        const vault = this._ensureVault(ss);
        vault.earnings = (Number(vault.earnings) || 0) + sellerNet;
        vault.salesHistory.unshift({
          id: 'sale_' + now + '_' + crypto.randomBytes(3).toString('hex'),
          buyerUsername: bClean,
          listingId: listing.id,
          category: listing.category,
          itemId: listing.itemId,
          itemName: listing.itemName,
          itemIcon: listing.itemIcon,
          quantity: qty,
          unitPrice: listing.unitPrice,
          totalCost,
          commission,
          sellerNet,
          timestamp: now
        });
        // Keep max 50 recent sales
        if (vault.salesHistory.length > 50) vault.salesHistory = vault.salesHistory.slice(0, 50);

        sellerSession.dirty = true;
        await sessionManager.forceSaveSession(listing.sellerUsername).catch(() => {});
      }

      // Update Listing Quantities
      listing.quantityRemaining -= qty;
      if (listing.quantityRemaining <= 0) {
        listing.quantityRemaining = 0;
        listing.status = 'SOLD';
        listing.soldAt = now;
      }
      this._saveState();

      return {
        success: true,
        message: `تم شراء ${qty} من "${listing.itemName}" بنجاح بإجمالي ${totalCost.toLocaleString()} ج.م (عمولة السوق 3%: ${commission.toLocaleString()} ج.م).`,
        listingId,
        boughtQuantity: qty,
        unitPrice: listing.unitPrice,
        totalCost,
        commission,
        remainingInListing: listing.quantityRemaining,
        buyerCash: bs.cash,
        buyerBank: bs.bank,
        buyerNetWorth: bs.netWorth
      };

    } finally {
      this._locks.delete(listingId);
    }
  }

  /**
   * Manually cancels an active listing and returns unsold assets to seller's Market Vault.
   */
  async cancelListing(sellerUsername, listingId) {
    if (!sellerUsername) throw new Error("اسم البائع مطلوب.");
    const sClean = String(sellerUsername).trim().toLowerCase();

    if (this._locks.has(listingId)) {
      throw new Error("هذا العرض قيد المعالجة، يرجى المحاولة بعد لحظات.");
    }
    this._locks.add(listingId);

    try {
      const listing = this.listings.find(l => l.id === listingId);
      if (!listing) throw new Error("عرض البيع المحدد غير موجود.");

      if ((listing.sellerUsername || '').toLowerCase() !== sClean) {
        throw new Error("أنت لست صاحب هذا العرض! لا يمكنك إلغاؤه.");
      }

      if (listing.status !== 'ACTIVE') {
        throw new Error("لا يمكن إلغاء هذا العرض لأنه ليس نشطاً (مباع أو منتهٍ بالفعل).");
      }

      const now = Date.now();
      const remQty = listing.quantityRemaining;
      listing.status = 'CANCELLED';
      listing.cancelledAt = now;
      this._saveState();

      // Return items to seller's Market Vault
      if (remQty > 0) {
        const session = await this._resolvePlayerSession(sellerUsername);
        if (session && session.state) {
          const ss = session.state;
          const vault = this._ensureVault(ss);
          vault.returnedItems.unshift({
            id: 'ret_' + now + '_' + crypto.randomBytes(3).toString('hex'),
            listingId: listing.id,
            category: listing.category,
            itemId: listing.itemId,
            name: listing.itemName,
            icon: listing.itemIcon,
            quantity: remQty,
            customData: listing.customData,
            reason: 'إلغاء يدوي للعرض من البائع',
            returnedAt: now
          });
          session.dirty = true;
          await sessionManager.forceSaveSession(sellerUsername).catch(() => {});
        }
      }

      return {
        success: true,
        message: `تم إلغاء العرض بنجاح وإرجاع ${remQty} وحدة من "${listing.itemName}" إلى صندوق أمانات السوق الخاص بك.`,
        listingId,
        returnedQuantity: remQty
      };

    } finally {
      this._locks.delete(listingId);
    }
  }

  /**
   * Transfers unclaimed sales earnings from Market Vault to player's Bank
   */
  async claimAllVaultEarnings(username) {
    if (!username) throw new Error("اسم المستخدم مطلوب.");
    const session = await this._resolvePlayerSession(username);
    if (!session || !session.state) throw new Error("تعذر جلب بيانات الحساب.");

    const ss = session.state;
    const vault = this._ensureVault(ss);
    const earnings = Number(vault.earnings || 0);

    if (earnings <= 0) {
      throw new Error("لا توجد أرباح مبيعات مستحقة للتحصيل في صندوق الأمانات حالياً.");
    }

    ss.bank = (Number(ss.bank) || 0) + earnings;
    vault.earnings = 0;
    ss.netWorth = calculateNetWorth(ss);

    session.dirty = true;
    await sessionManager.forceSaveSession(username).catch(() => {});

    return {
      success: true,
      message: `تم تحصيل أرباح مبيعات السوق بمبلغ +${earnings.toLocaleString()} ج.م وإيداعها مباشرة في حسابك البنكي!`,
      claimedAmount: earnings,
      newBankBalance: ss.bank,
      netWorth: ss.netWorth
    };
  }

  /**
   * Claims a returned item from Market Vault and restores it to player's active storage/fleet
   */
  async claimVaultItem(username, vaultEntryId) {
    if (!username) throw new Error("اسم المستخدم مطلوب.");
    const session = await this._resolvePlayerSession(username);
    if (!session || !session.state) throw new Error("تعذر جلب بيانات الحساب.");

    const ss = session.state;
    const vault = this._ensureVault(ss);

    const idx = vault.returnedItems.findIndex(e => e.id === vaultEntryId);
    if (idx === -1) throw new Error("عنصر الأمانات المحدد غير موجود أو تم استلامه مسبقاً.");

    const item = vault.returnedItems[idx];
    const qty = Number(item.quantity) || 1;

    // Restore to appropriate storage
    if (item.category === 'trade_containers') {
      ss.tradeCompany = ss.tradeCompany || { warehouse: {} };
      ss.tradeCompany.warehouse = ss.tradeCompany.warehouse || {};
      ss.tradeCompany.warehouse[item.itemId] = (Number(ss.tradeCompany.warehouse[item.itemId]) || 0) + qty;
    } else if (item.category === 'space_minerals') {
      ss.space = ss.space || { warehouse: {} };
      ss.space.warehouse = ss.space.warehouse || {};
      ss.space.warehouse[item.itemId] = (Number(ss.space.warehouse[item.itemId]) || 0) + qty;
    } else if (item.category === 'farm_crops') {
      ss.farm = ss.farm || { storage: {}, livestock: {} };
      const isLivestock = ['milk', 'eggs', 'compost'].includes(item.itemId);
      if (isLivestock) {
        ss.farm.livestock = ss.farm.livestock || {};
        ss.farm.livestock[item.itemId] = (Number(ss.farm.livestock[item.itemId]) || 0) + qty;
      } else {
        ss.farm.storage = ss.farm.storage || {};
        ss.farm.storage[item.itemId] = (Number(ss.farm.storage[item.itemId]) || 0) + qty;
      }
    } else if (item.category === 'airport_aircraft') {
      ss.airport = ss.airport || { fleet: [] };
      if (!Array.isArray(ss.airport.fleet)) ss.airport.fleet = [];
      const craftObj = item.customData || { id: 'craft_' + Date.now(), modelId: item.itemId, status: 'idle', inFlight: false };
      craftObj.inFlight = false;
      craftObj.status = 'idle';
      ss.airport.fleet.push(craftObj);
    } else if (item.category === 'space_rockets') {
      ss.space = ss.space || { activeRockets: [] };
      if (!Array.isArray(ss.space.activeRockets)) ss.space.activeRockets = [];
      const rocketObj = item.customData || { id: 'rkt_' + Date.now(), modelId: item.itemId, status: 'idle', launched: false };
      rocketObj.launched = false;
      rocketObj.status = 'idle';
      ss.space.activeRockets.push(rocketObj);
    }

    // Remove from vault
    vault.returnedItems.splice(idx, 1);
    ss.netWorth = calculateNetWorth(ss);

    session.dirty = true;
    await sessionManager.forceSaveSession(username).catch(() => {});

    return {
      success: true,
      message: `تم استلام ${qty} وحدة من "${item.name}" وإعادتها لمستودعك بنجاح!`,
      claimedItem: item,
      remainingVaultItems: vault.returnedItems.length
    };
  }

  /**
   * Ticker task: inspects expired listings and moves unsold assets into seller Market Vaults
   */
  async checkExpiredListings() {
    const now = Date.now();
    let hasChanges = false;

    for (const listing of this.listings) {
      if (listing.status === 'ACTIVE' && now >= Number(listing.expiresAt || 0)) {
        listing.status = 'EXPIRED';
        listing.expiredAt = now;
        hasChanges = true;

        const remQty = Number(listing.quantityRemaining || 0);
        if (remQty > 0) {
          try {
            const session = await this._resolvePlayerSession(listing.sellerUsername);
            if (session && session.state) {
              const ss = session.state;
              const vault = this._ensureVault(ss);
              vault.returnedItems.unshift({
                id: 'ret_' + now + '_' + crypto.randomBytes(3).toString('hex'),
                listingId: listing.id,
                category: listing.category,
                itemId: listing.itemId,
                name: listing.itemName,
                icon: listing.itemIcon,
                quantity: remQty,
                customData: listing.customData,
                reason: 'انتهاء مدة العرض في السوق دون بيع',
                returnedAt: now
              });
              session.dirty = true;
              await sessionManager.forceSaveSession(listing.sellerUsername).catch(() => {});
            }
          } catch (err) {
            console.error(`[MarketService] Failed to return expired items for listing ${listing.id}:`, err.message);
          }
        }
      }
    }

    if (hasChanges) {
      this._saveState();
    }
  }
}

const marketService = new MarketService();
module.exports = {
  marketService,
  MARKET_ITEM_CATALOG
};
