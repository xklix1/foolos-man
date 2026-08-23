/**
 * Foolos Man Tycoon (فلوس مان تايكون)
 * Simulation Engine (game.js)
 * Manages game state, ticks, algorithms, and business logic
 */

const GameEngine = (() => {
  // --- Game Configurations & Data Tables ---

  const JOBS = {
    worker:     { id: 'worker',     name: 'عامل باليومية',              salary: 15,   xpReward: 5,  xpNeeded: 0 },
    cashier:    { id: 'cashier',    name: 'محاسب صندوق',                salary: 45,   xpReward: 8,  xpNeeded: 120 },
    accountant: { id: 'accountant', name: 'محاسب مالي قانوني',          salary: 110,  xpReward: 12, xpNeeded: 350 },
    manager:    { id: 'manager',    name: 'مدير فرع',                   salary: 280,  xpReward: 18, xpNeeded: 900 },
    director:   { id: 'director',  name: 'مدير تنفيذي للمجموعة',       salary: 650,  xpReward: 25, xpNeeded: 2500 },
    ceo:        { id: 'ceo',       name: 'رئيس مجلس الإدارة',           salary: 1500, xpReward: 35, xpNeeded: 6000 }
  };

  const BUSINESSES = {
    coffee: {
      id: 'coffee',
      name: 'عربة قهوة مختصة',
      cost: 12000,
      baseDemand: 30,
      optimumPrice: 18,
      costOfGoods: 6,
      upgradeMultiplier: 1.5,
      workerMultiplier: 1.15
    },
    tech: {
      id: 'tech',
      name: 'شركة برمجيات وتطبيقات',
      cost: 95000,
      baseDemand: 10,
      optimumPrice: 140,
      costOfGoods: 35,
      upgradeMultiplier: 1.6,
      workerMultiplier: 1.2
    },
    logistics: {
      id: 'logistics',
      name: 'مجمع خدمات لوجستية وشحن',
      cost: 520000,
      baseDemand: 4,
      optimumPrice: 950,
      costOfGoods: 220,
      upgradeMultiplier: 1.7,
      workerMultiplier: 1.25
    },
    supermarket: {
      id: 'supermarket',
      name: 'سلسلة سوبرماركت وتجزئة',
      cost: 1850000,
      baseDemand: 18,
      optimumPrice: 380,
      costOfGoods: 110,
      upgradeMultiplier: 1.75,
      workerMultiplier: 1.28
    },
    solar_factory: {
      id: 'solar_factory',
      name: 'مصنع ألواح الطاقة الشمسية',
      cost: 6500000,
      baseDemand: 8,
      optimumPrice: 2400,
      costOfGoods: 750,
      upgradeMultiplier: 1.8,
      workerMultiplier: 1.3
    },
    private_hospital: {
      id: 'private_hospital',
      name: 'مستشفى ومجمع طبي تخصصي',
      cost: 22000000,
      baseDemand: 5,
      optimumPrice: 8500,
      costOfGoods: 2100,
      upgradeMultiplier: 1.85,
      workerMultiplier: 1.35
    }
  };

  const ASSETS = {
    apartment: { id: 'apartment', name: 'شقة سكنية مؤجرة', cost: 150000, rent: 180, appreciation: 0.001 },
    office: { id: 'office', name: 'مبنى مكاتب تجارية', cost: 980000, rent: 1350, appreciation: 0.0015 },
    mansion: { id: 'mansion', name: 'قصر ريفي فاخر', cost: 4500000, rent: 7200, appreciation: 0.002 }
  };

  const STOCKS = {
    COMI: { name: 'البنك التجاري الدولي', symbol: 'COMI', basePrice: 32, volatility: 0.03, reversion: 0.01, floor: 15 },
    EAST: { name: 'الشرقية للدخان', symbol: 'EAST', basePrice: 78, volatility: 0.05, reversion: 0.015, floor: 30 },
    ETEL: { name: 'المصرية للاتصالات', symbol: 'ETEL', basePrice: 42, volatility: 0.04, reversion: 0.012, floor: 20 },
    FWRY: { name: 'فوري للمدفوعات الإلكترونية', symbol: 'FWRY', basePrice: 85, volatility: 0.06, reversion: 0.02, floor: 40 },
    CASH: { name: 'صندوق الاستثمار التقني البديل', symbol: 'CASH', basePrice: 110, volatility: 0.08, reversion: 0.025, floor: 25 }
  };

  const INVESTMENTS = {
    short: { id: 'short', name: 'وديعة بنكية ربع سنوية', durationTicks: 20, rate: 0.05, minCost: 10000 },
    realestate: { id: 'realestate', name: 'صندوق استثمار عقاري مغلق', durationTicks: 80, rate: 0.22, minCost: 50000 },
    venture: { id: 'venture', name: 'رأس مال جريء في شركات ناشئة', durationTicks: 240, rate: 0.85, minCost: 200000 }
  };

  const STORE_ITEMS = {
    gold_pen: { 
      id: 'gold_pen', 
      name: 'القلم الذهبي للمدراء', 
      cost: 15000, 
      desc: 'يزيد خبرتك الوظيفية XP بنسبة +50%. ينتهي مفعوله ويدمر ذاته بعد 300 ثانية.',
      effect: 'xp_boost', 
      value: 0.5,
      durationTicks: 100 // 100 ticks = 300 seconds (5 minutes)
    },
    premium_lawyer: { 
      id: 'premium_lawyer', 
      name: 'توكيل محامٍ دولي قدير', 
      cost: 45000, 
      desc: 'يخفض خطورة القبض في التجارة المحظورة بنسبة -35%. ينتهي عقد المحامي وتدمر صلاحيته بعد 450 ثانية.',
      effect: 'legal_protection', 
      value: 0.35,
      durationTicks: 150 // 150 ticks = 450 seconds (7.5 minutes)
    },
    energy_drink: { 
      id: 'energy_drink', 
      name: 'مشروب الطاقة والتركيز الفائق', 
      cost: 8500, 
      desc: 'يضاعف راتبك في نوبات العمل x2. ينتهي مفعوله ويدمر ذاته بعد 180 ثانية.',
      effect: 'salary_multiplier', 
      value: 2.0,
      durationTicks: 60 // 60 ticks = 180 seconds (3 minutes)
    },
    tax_shield: { 
      id: 'tax_shield', 
      name: 'درع الإعفاء والملاذ الضريبي', 
      cost: 80000, 
      desc: 'يمنحك خصماً قدره 25% على تكاليف صيانة وترقية الشركات. ينتهي وتدمر صلاحيته بعد 600 ثانية.',
      effect: 'upgrade_discount', 
      value: 0.25,
      durationTicks: 200 // 200 ticks = 600 seconds (10 minutes)
    },
    market_scanner: { 
      id: 'market_scanner', 
      name: 'ماسح البورصة والتداول الذكي', 
      cost: 120000, 
      desc: 'يحميك من الانهيارات المفاجئة لأسهمك المملوكة ويحدد نقطة الدعم. يدمر ذاته بعد 360 ثانية.',
      effect: 'stock_shield', 
      value: 0.20,
      durationTicks: 120 // 120 ticks = 360 seconds (6 minutes)
    },
    vip_casino_pass: { 
      id: 'vip_casino_pass', 
      name: 'بطاقة VIP لكازينو الحظ', 
      cost: 250000, 
      desc: 'ترفع نسبة الفوز في الكازينو وعجلة الحظ بنسبة +15%. تنتهي وتدمر صلاحيتها بعد 300 ثانية.',
      effect: 'casino_luck_boost', 
      value: 0.15,
      durationTicks: 100 // 100 ticks = 300 seconds (5 minutes)
    }
  };

  const BLACK_MARKET = {
    electronics: { id: 'electronics', name: 'تهريب حاوية إلكترونيات غير مرخصة', cost: 3000, payout: 9500, successChance: 0.85, jailDuration: 20 },
    crypto: { id: 'crypto', name: 'اختراق خوادم وتحويل أصول رقمية مشبوهة', cost: 20000, payout: 82000, successChance: 0.65, jailDuration: 45 },
    artifacts: { id: 'artifacts', name: 'صفقة تهريب آثار ومخطوطات نادرة', cost: 90000, payout: 460000, successChance: 0.45, jailDuration: 90 }
  };

  // --- Initial Default Player State ---
  const INITIAL_STATE = {
    cash: 5000,
    bank: 1000,
    xp: 0,
    jobId: 'worker',
    businesses: {
      coffee: { level: 0, price: 18, workers: 0 },
      tech: { level: 0, price: 140, workers: 0 },
      logistics: { level: 0, price: 950, workers: 0 },
      supermarket: { level: 0, price: 380, workers: 0 },
      solar_factory: { level: 0, price: 2400, workers: 0 },
      private_hospital: { level: 0, price: 8500, workers: 0 }
    },
    investments: [], // Array of { id, investedAmount, ticksRemaining, rate, name }
    assets: {
      apartment: 0,
      office: 0,
      mansion: 0
    },
    stocks: {
      COMI: { shares: 0, avgPrice: 0 },
      EAST: { shares: 0, avgPrice: 0 },
      ETEL: { shares: 0, avgPrice: 0 },
      FWRY: { shares: 0, avgPrice: 0 },
      CASH: { shares: 0, avgPrice: 0 }
    },
    inventory: {
      gold_pen: 0,
      premium_lawyer: 0,
      energy_drink: 0,
      tax_shield: 0,
      market_scanner: 0,
      vip_casino_pass: 0
    },
    itemDurations: {}, // Stores { itemId: ticksRemaining } for self-destruction timer
    jailTimer: 0,
    netWorth: 6000,
    title: 'عامل مبتدئ'
  };

  let state = { ...INITIAL_STATE };
  let stockPrices = {}; // Stores { SYMBOL: [priceHistory...] }
  let activeUsername = "";
  let lastTipEventTimestamp = 0;

  // Initialize Stock Price Histories
  function initStocks() {
    Object.keys(STOCKS).forEach(sym => {
      const stock = STOCKS[sym];
      // Generate 25 points of initial history to make charts look great right away
      const history = [];
      let current = stock.basePrice;
      for (let i = 0; i < 25; i++) {
        const change = (Math.random() - 0.5) * 2 * stock.volatility;
        current = Math.max(stock.floor, Math.floor(current * (1 + change)));
        history.push(current);
      }
      stockPrices[sym] = history;
    });
  }

  // Calculate Net Worth: Cash + Bank + (Real Estate * Cost) + (Stocks * currentPrice) + Locked Investments
  function calculateNetWorth() {
    let worth = state.cash + state.bank;
    
    // Add real estate assets value
    Object.keys(state.assets).forEach(key => {
      worth += state.assets[key] * ASSETS[key].cost;
    });

    // Add stock shares value
    Object.keys(state.stocks).forEach(sym => {
      const shares = state.stocks[sym].shares || 0;
      const history = stockPrices[sym];
      const currentPrice = history ? history[history.length - 1] : STOCKS[sym].basePrice;
      worth += shares * currentPrice;
    });

    // Add locked investments capital
    state.investments.forEach(inv => {
      worth += inv.investedAmount;
    });

    return worth;
  }

  // Update Player Title based on Net Worth and XP
  function getAppropriateTitle(worth, xp) {
    if (worth >= 10000000 && xp >= 5000) return 'إمبراطور المال والفلوس';
    if (worth >= 5000000 && xp >= 2500) return 'ملياردير عصامي';
    if (worth >= 1000000 && xp >= 1000) return 'مليونير فخم';
    if (worth >= 500000 && xp >= 500) return 'سيد الأعمال';
    if (worth >= 200000) return 'مستثمر طموح';
    if (worth >= 50000) return 'تاجر صاعد';
    if (xp >= 300) return 'موظف متميز';
    if (xp >= 100) return 'عامل ماهر';
    return 'عامل مبتدئ';
  }

  // Apply appreciation or depreciation to Assets Cost (Simulated over time)
  function adjustAssetAppreciation() {
    // Modify asset base costs slightly in local config
    Object.keys(ASSETS).forEach(key => {
      const asset = ASSETS[key];
      const appreciationChance = Math.random();
      if (appreciationChance < 0.3) {
        // Appreciate by 0.1% to 0.4%
        const rate = asset.appreciation * (0.5 + Math.random());
        asset.cost = Math.floor(asset.cost * (1 + rate));
      }
    });
  }

  // --- Central Simulation Tick ---
  function processTick() {
    if (!activeUsername) return null;

    let updates = {
      bankInterestGained: 0,
      businessProfitGained: 0,
      rentGained: 0,
      stockMovement: false,
      investmentsMatured: [],
      tipEvent: null,
      healthDecay: 0,
      jailFree: false
    };

    // 1. Jail lockout processing
    if (state.jailTimer > 0) {
      state.jailTimer = Math.max(0, state.jailTimer - 3);
      if (state.jailTimer === 0) {
        updates.jailFree = true;
      }
      // Save state and skip income updates while jailed
      state.netWorth = calculateNetWorth();
      AppDB.savePlayerState(activeUsername, state);
      return updates;
    }

    // 2. Bank compound interest accrual (0.005% per tick = ~6% APY)
    if (state.bank > 0) {
      const rate = 0.00005; // 0.005% per 3s tick
      const interest = Math.floor(state.bank * rate);
      if (interest > 0) {
        state.bank += interest;
        updates.bankInterestGained = interest;
      }
    }

    // 3. Careers Auto Salary (earned automatically every 4 ticks)
    // To represent work contracts, the player receives a baseline salary passively
    const currentJob = JOBS[state.jobId];
    if (currentJob && Math.random() < 0.25) { // 25% chance per tick (= average 1 tick per 12 seconds)
      state.cash += currentJob.salary;
      updates.businessProfitGained += currentJob.salary;
    }

    // 4. Businesses passive income ticking
    Object.keys(state.businesses).forEach(key => {
      const bizState = state.businesses[key];
      const bizConfig = BUSINESSES[key];
      if (!bizState) return;

      if (bizState.level > 0) {
        // Price elasticity calculation: Demand falls if price is higher than optimum
        const price = bizState.price || bizConfig.optimumPrice;
        const opt = bizConfig.optimumPrice;
        let elasticityFactor = 1.0;
        
        if (price > opt) {
          elasticityFactor = Math.max(0, 1 - (price - opt) / opt);
        } else if (price < opt) {
          // Selling cheaper increases demand, up to +30%
          elasticityFactor = 1 + (opt - price) / opt * 0.3;
        }

        // Active Marketing Campaign boost (+40% demand boost if active)
        const marketingBoost = (bizState.marketingTicks && bizState.marketingTicks > 0) ? 1.4 : 1.0;
        if (bizState.marketingTicks && bizState.marketingTicks > 0) {
          bizState.marketingTicks--;
        }

        // Dynamic inflation / raw material cost fluctuation factor (0.9 to 1.15)
        const costFactor = 1.0 + ((Math.sin(Date.now() / 20000) * 0.1) + 0.05);
        const actualCostOfGoods = Math.floor(bizConfig.costOfGoods * costFactor);

        // Scale demand based on upgrades (level) and workers hired
        const upgradeFactor = Math.pow(bizConfig.upgradeMultiplier, bizState.level - 1);
        const workerFactor = 1 + ((bizState.workers || 0) * (bizConfig.workerMultiplier - 1));
        const demand = Math.floor(bizConfig.baseDemand * upgradeFactor * elasticityFactor * workerFactor * marketingBoost);
        
        // Margin per unit = Price - Dynamic Cost of Goods
        const margin = price - actualCostOfGoods;
        
        // Final profit per tick = demand * margin
        const profit = Math.max(0, Math.floor(demand * margin * 0.15));
        
        if (profit > 0) {
          state.cash += profit;
          updates.businessProfitGained += profit;
        }
      }
    });

    // 5. Assets / Real Estate passive rental income ticking
    Object.keys(state.assets).forEach(key => {
      const ownedCount = state.assets[key] || 0;
      if (ownedCount > 0) {
        const asset = ASSETS[key];
        const rent = ownedCount * Math.floor(asset.rent * 0.1); // Rent scaling per tick
        state.cash += rent;
        updates.rentGained += rent;
      }
    });

    // 6. Investments duration counters
    const remainingInvestments = [];
    state.investments.forEach(inv => {
      inv.ticksRemaining--;
      if (inv.ticksRemaining <= 0) {
        // Investment matures!
        const payout = Math.floor(inv.investedAmount * (1 + inv.rate));
        state.cash += payout;
        updates.investmentsMatured.push({
          name: inv.name,
          payout: payout,
          profit: payout - inv.investedAmount
        });
      } else {
        remainingInvestments.push(inv);
      }
    });
    state.investments = remainingInvestments;

    // 7. Store Items Durability & Self-Destruction Timers
    if (!state.itemDurations) state.itemDurations = {};
    updates.expiredItems = [];

    Object.keys(state.itemDurations).forEach(itemId => {
      if (state.itemDurations[itemId] > 0) {
        state.itemDurations[itemId]--;
        if (state.itemDurations[itemId] <= 0) {
          // Self-destruct item!
          if (state.inventory[itemId] > 0) {
            state.inventory[itemId]--;
          }
          delete state.itemDurations[itemId];
          const itemDef = STORE_ITEMS[itemId];
          if (itemDef) {
            updates.expiredItems.push(itemDef.name);
          }
        }
      }
    });

    // 7. Stock Market fluctuations (Gaussian random walk with mean reversion)
    Object.keys(STOCKS).forEach(sym => {
      const stock = STOCKS[sym];
      const history = stockPrices[sym];
      const lastPrice = history[history.length - 1];

      // Mean reversion pull: force price towards basePrice
      const pull = (stock.basePrice - lastPrice) * stock.reversion;

      // Random shock
      const shock = (Math.random() - 0.5) * 2 * stock.volatility * lastPrice;

      let newPrice = Math.floor(lastPrice + pull + shock);
      newPrice = Math.max(stock.floor, newPrice); // Price floor protection

      history.push(newPrice);
      if (history.length > 30) history.shift(); // Cap history length for rendering
      updates.stockMovement = true;
    });

    // 8. Dynamic Market Events (Boom, Crash, Scandals, Tech Breakout)
    if (!updates.tipEvent && Math.random() < 0.08) { // 8% chance per tick (~every 35s)
      const eventTypes = [
        {
          type: 'tech_boom',
          title: 'طفرة تقنية وانتعاش الذكاء الاصطناعي',
          desc: 'ارتفعت أرباح شركة فوري وصندوق CASH نتيجة استثمارات هائلة في الذكاء الاصطناعي!',
          targetStocks: ['FWRY', 'CASH'],
          multiplier: 1.25,
          toastType: 'success'
        },
        {
          type: 'cbe_rate_hike',
          title: 'قرار المركزي: رفع الفائدة 200 نقطة',
          desc: 'البنك المركزي يرفع الفائدة! ارتفاع قوي لسهم CIB وانتكاسة خفيفة باقي الأسهم.',
          targetStocks: ['COMI'],
          multiplier: 1.30,
          negativeTargets: ['EAST', 'FWRY'],
          negativeMultiplier: 0.88,
          toastType: 'warning'
        },
        {
          type: 'oil_scandal',
          title: 'أزمة سلاسل الإمداد والشحن',
          desc: 'تأخر شحنات التبغ والمواد الخام يؤدي لربكة ومبيعات مكثفة على سهم الشرقية للدخان!',
          targetStocks: ['EAST'],
          multiplier: 0.75,
          toastType: 'error'
        },
        {
          type: 'telecom_expansion',
          title: 'رخصة 5G للمصرية للاتصالات',
          desc: 'حصول المصرية للاتصالات على رخصة الجيل الخامس تطلق موجة شراء قياسية!',
          targetStocks: ['ETEL'],
          multiplier: 1.35,
          toastType: 'success'
        },
        {
          type: 'market_crash',
          title: 'ذعر اقتصادي وتصحيح هابط للبورصة',
          desc: 'موجة بيع جني أرباح مكثفة تهبط بأغلب أسهم السوق بنسب متفاوتة!',
          targetStocks: ['COMI', 'FWRY', 'CASH', 'EAST', 'ETEL'],
          multiplier: 0.85,
          toastType: 'error'
        }
      ];

      const selectedEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      // Apply market shock to target stocks
      selectedEvent.targetStocks.forEach(sym => {
        if (stockPrices[sym]) {
          const lastP = stockPrices[sym][stockPrices[sym].length - 1];
          const newP = Math.max(STOCKS[sym].floor, Math.floor(lastP * selectedEvent.multiplier));
          stockPrices[sym][stockPrices[sym].length - 1] = newP;
        }
      });

      if (selectedEvent.negativeTargets) {
        selectedEvent.negativeTargets.forEach(sym => {
          if (stockPrices[sym]) {
            const lastP = stockPrices[sym][stockPrices[sym].length - 1];
            const newP = Math.max(STOCKS[sym].floor, Math.floor(lastP * selectedEvent.negativeMultiplier));
            stockPrices[sym][stockPrices[sym].length - 1] = newP;
          }
        });
      }

      updates.marketEvent = selectedEvent;
    }



    // 9. Random Tip / Gratuities events (spaced every ~5 minutes = 300,000 ms)
    const TIP_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    if (!lastTipEventTimestamp) lastTipEventTimestamp = now;

    if (!updates.tipEvent && (now - lastTipEventTimestamp >= TIP_COOLDOWN_MS) && Math.random() < 0.35) {
      lastTipEventTimestamp = now;
      const eventChance = Math.random();
      let tipTitle = "";
      let tipText = "";
      let amountGained = 0;

      if (eventChance < 0.5) {
        // Customer tip
        amountGained = Math.floor(250 + Math.random() * 500);
        tipTitle = "بقشيش إضافي";
        tipText = `حصلت على بقشيش سخي من أحد العملاء لقاء خدمتك السريعة بقيمة ${amountGained} جنيه.`;
      } else if (eventChance < 0.8) {
        // Passersby / Street cash find
        amountGained = Math.floor(500 + Math.random() * 1500);
        tipTitle = "محفظة مفقودة";
        tipText = `عثرت على مبلغ مالي ملقى على الطريق ولم تجد صاحبه بقيمة ${amountGained} جنيه.`;
      } else {
        // Business bonus
        amountGained = Math.floor(2000 + Math.random() * 5000);
        tipTitle = "علاوة تقديرية";
        tipText = `منحك رئيسك مكافأة تشجيعية مفاجئة لقاء أدائك الاستثنائي بقيمة ${amountGained} جنيه.`;
      }

      state.cash += amountGained;
      updates.tipEvent = {
        title: tipTitle,
        message: tipText,
        gain: amountGained
      };
    }

    // Adjust assets market rates
    adjustAssetAppreciation();

    // Recalculate net worth and title
    state.netWorth = calculateNetWorth();
    state.title = getAppropriateTitle(state.netWorth, state.xp);

    // Save synced data to Database
    AppDB.savePlayerState(activeUsername, state);

    return updates;
  }

  // --- Active Session Setters ---
  async function loadUserSession(username) {
    activeUsername = username;
    const dbState = await AppDB.getPlayerState(username);
    if (dbState) {
      // Deep-merge with defaults so new keys added later are always present
      const mergedBusinesses = {};
      Object.keys(INITIAL_STATE.businesses).forEach(k => {
        mergedBusinesses[k] = {
          ...INITIAL_STATE.businesses[k],
          ...(dbState.businesses && dbState.businesses[k] ? dbState.businesses[k] : {})
        };
      });

      const mergedStocks = {};
      Object.keys(INITIAL_STATE.stocks).forEach(sym => {
        const saved = dbState.stocks && dbState.stocks[sym];
        mergedStocks[sym] = {
          shares: (saved && saved.shares != null) ? saved.shares : 0,
          avgPrice: (saved && saved.avgPrice != null) ? saved.avgPrice : 0
        };
      });

      const mergedAssets = {};
      Object.keys(INITIAL_STATE.assets).forEach(k => {
        mergedAssets[k] = (dbState.assets && dbState.assets[k] != null) ? dbState.assets[k] : 0;
      });

      const mergedInventory = {};
      Object.keys(INITIAL_STATE.inventory).forEach(k => {
        mergedInventory[k] = (dbState.inventory && dbState.inventory[k] != null) ? dbState.inventory[k] : 0;
      });

      state = {
        ...INITIAL_STATE,
        ...dbState,
        businesses: mergedBusinesses,
        assets: mergedAssets,
        stocks: mergedStocks,
        inventory: mergedInventory,
        investments: Array.isArray(dbState.investments) ? dbState.investments : []
      };
    } else {
      // Create new clean state — deep-copy to avoid shared object references
      state = JSON.parse(JSON.stringify(INITIAL_STATE));
      await AppDB.savePlayerState(username, state);
    }
    initStocks();
    return state;
  }

  function logoutUser() {
    activeUsername = "";
    state = { ...INITIAL_STATE };
  }

  // --- Interaction Actions (Strict Financial Logic Validation) ---

  // Shift Work click
  function performJobShift() {
    if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يمكنك العمل.");
    const job = JOBS[state.jobId];
    if (!job) throw new Error("الوظيفة غير صالحة.");

    // Calculate XP boosters & energy drink salary multipliers
    const xpBoost = state.inventory.gold_pen > 0 ? (1 + STORE_ITEMS.gold_pen.value) : 1.0;
    const salaryMultiplier = state.inventory.energy_drink > 0 ? STORE_ITEMS.energy_drink.value : 1.0;

    const finalXpReward = Math.ceil(job.xpReward * xpBoost);
    const finalSalary = Math.floor(job.salary * salaryMultiplier);

    // Add XP and cash
    state.xp += finalXpReward;
    state.cash += finalSalary;

    // Recalculate and Save
    state.netWorth = calculateNetWorth();
    state.title = getAppropriateTitle(state.netWorth, state.xp);
    AppDB.savePlayerState(activeUsername, state);

    return {
      salary: job.salary,
      xp: finalXpReward
    };
  }

  // Unlock Career Promotions
  function promoteJob(jobId) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يمكنك طلب ترقية.");
    const targetJob = JOBS[jobId];
    if (!targetJob) throw new Error("هذه الوظيفة غير موجودة.");

    if (state.xp < targetJob.xpNeeded) {
      throw new Error(`تحتاج إلى خبرة لا تقل عن ${targetJob.xpNeeded} XP لفتح هذه الترقية.`);
    }

    state.jobId = jobId;
    AppDB.savePlayerState(activeUsername, state);
    return targetJob;
  }

  // Buy Startup Business
  function purchaseBusiness(key) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك إدارة الاستثمارات.");
    const biz = BUSINESSES[key];
    if (!biz) throw new Error("المشروع غير متوفر.");

    // Guard: initialize bizState if missing (forward-compatibility with saved states)
    if (!state.businesses[key]) {
      state.businesses[key] = { level: 0, price: biz.optimumPrice, workers: 0 };
    }
    const bizState = state.businesses[key];

    if (bizState.level > 0) {
      throw new Error("تم شراء هذا المشروع بالفعل! يمكنك ترقيته لزيادة الأرباح.");
    }

    if (state.cash < biz.cost) {
      throw new Error(`رصيدك غير كافٍ. تحتاج: ${biz.cost.toLocaleString()} EGP — لديك: ${state.cash.toLocaleString()} EGP`);
    }

    state.cash -= biz.cost;
    bizState.level = 1;

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return biz;
  }

  // Upgrade Business Tier Level
  function upgradeBusiness(key) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك إجراء ترقيات.");
    const biz = BUSINESSES[key];
    const bizState = state.businesses[key];
    if (!bizState || bizState.level === 0) throw new Error("يجب شراء هذا المشروع أولاً قبل ترقيته.");

    // Upgrade cost scales exponentially based on current level
    const upgradeCost = Math.floor(biz.cost * Math.pow(1.6, bizState.level));
    if (state.cash < upgradeCost) {
      throw new Error(`رصيدك غير كافٍ للترقية. تحتاج: ${upgradeCost.toLocaleString()} EGP — لديك: ${state.cash.toLocaleString()} EGP`);
    }

    state.cash -= upgradeCost;
    bizState.level++;

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return {
      level: bizState.level,
      cost: upgradeCost
    };
  }

  // Hire Workers for Business
  function hireWorker(key) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك توظيف عمالة.");
    const biz = BUSINESSES[key];
    const bizState = state.businesses[key];
    if (!bizState || bizState.level === 0) throw new Error("يجب شراء المشروع أولاً.");

    // Worker hiring fee scales with number of existing workers
    const hireCost = Math.floor(biz.cost * 0.15 * (1 + bizState.workers));
    if (state.cash < hireCost) {
      throw new Error(`تكلفة توظيف عامل إضافي هي ${hireCost.toLocaleString()} جنيه. الرصيد غير كافٍ.`);
    }

    state.cash -= hireCost;
    bizState.workers++;

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return {
      workers: bizState.workers,
      cost: hireCost
    };
  }

  // Fire Workers (reduces costs/demand but free)
  function fireWorker(key) {
    const bizState = state.businesses[key];
    if (!bizState || bizState.workers === 0) throw new Error("لا يوجد عمالة لتسريحهم.");

    bizState.workers--;
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return bizState.workers;
  }

  // Set Product Sale Price
  function setBusinessPrice(key, price) {
    const bizState = state.businesses[key];
    if (!bizState || bizState.level === 0) throw new Error("المشروع مغلق حالياً.");
    if (price <= 0) throw new Error("سعر البيع يجب أن يكون أعلى من صفر جنيه.");
    
    // Price capping: Max 10x optimum price to keep numbers sensible
    const maxPrice = BUSINESSES[key].optimumPrice * 10;
    if (price > maxPrice) throw new Error(`الحد الأقصى المسموح به للسعر هو ${maxPrice} جنيه.`);

    bizState.price = price;
    AppDB.savePlayerState(activeUsername, state);
  }

  // Launch Marketing Campaign (+40% demand boost for 30 ticks = 90 seconds)
  function launchMarketingCampaign(key) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك إطلاق حملات تسويقية.");
    const biz = BUSINESSES[key];
    const bizState = state.businesses[key];
    if (!bizState || bizState.level === 0) throw new Error("المشروع مغلق حالياً.");

    const campaignCost = Math.floor(biz.cost * 0.25);
    if (state.cash < campaignCost) {
      throw new Error(`تكلفة إطلاق الحملة الإعلانية المكثفة هي ${campaignCost.toLocaleString()} EGP. رصيدك غير كافٍ.`);
    }

    state.cash -= campaignCost;
    bizState.marketingTicks = (bizState.marketingTicks || 0) + 30; // 30 ticks = 90 seconds

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return {
      cost: campaignCost,
      durationSec: 90
    };
  }

  // Deposit Cash to Bank
  function depositToBank(amount) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! الخدمات البنكية معطلة مؤقتاً.");
    if (amount <= 0) throw new Error("مبلغ الإيداع يجب أن يكون أكبر من صفر.");
    if (state.cash < amount) throw new Error("رصيدك النقدي (الكاش) لا يكفي لإتمام هذا الإيداع.");

    state.cash -= amount;
    state.bank += amount;
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
  }

  // Withdraw Cash from Bank
  function withdrawFromBank(amount) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! الخدمات البنكية معطلة مؤقتاً.");
    if (amount <= 0) throw new Error("مبلغ السحب يجب أن يكون أكبر من صفر.");
    if (state.bank < amount) throw new Error("رصيدك في حساب البنك لا يكفي لإتمام هذا السحب.");

    state.bank -= amount;
    state.cash += amount;
    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
  }

  // Purchase Real Estate/Asset
  function buyAsset(key) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك توقيع عقود عقارية.");
    const asset = ASSETS[key];
    if (!asset) throw new Error("العقار غير متوفر.");

    if (state.cash < asset.cost) {
      throw new Error(`رصيدك غير كافٍ. تحتاج: ${asset.cost.toLocaleString()} EGP — لديك: ${state.cash.toLocaleString()} EGP`);
    }

    state.cash -= asset.cost;
    state.assets[key] = (state.assets[key] || 0) + 1;

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return asset;
  }

  // Sell Real Estate/Asset (Liquidation at 85% of market value)
  function sellAsset(key) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك تسييل العقارات.");
    const count = state.assets[key] || 0;
    if (count <= 0) throw new Error("لا تمتلك أي عقار من هذا النوع للبيع.");

    const asset = ASSETS[key];
    const sellValue = Math.floor(asset.cost * 0.85); // 15% liquidation loss

    state.assets[key]--;
    state.cash += sellValue;

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return sellValue;
  }

  // Buy Stocks
  function buyStock(sym, shares) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! سوق الأسهم معطل لك.");
    const stock = STOCKS[sym];
    if (!stock) throw new Error("رمز الشركة غير صالح.");
    if (shares <= 0 || !Number.isInteger(shares)) throw new Error("عدد الأسهم يجب أن يكون عدداً صحيحاً موجباً.");

    const history = stockPrices[sym];
    if (!history || history.length === 0) throw new Error("بيانات السوق غير متوفرة بعد. حاول مجدداً.");
    const currentPrice = history[history.length - 1];
    const totalCost = currentPrice * shares;

    if (state.cash < totalCost) {
      throw new Error(`رصيدك غير كافٍ. تحتاج: ${totalCost.toLocaleString()} EGP — لديك: ${state.cash.toLocaleString()} EGP`);
    }

    state.cash -= totalCost;

    // Guard: initialize stock slot if missing (forward-compatibility)
    if (!state.stocks[sym]) {
      state.stocks[sym] = { shares: 0, avgPrice: 0 };
    }

    // Calculate new average purchase price
    const currentShares = state.stocks[sym].shares || 0;
    const currentAvg = state.stocks[sym].avgPrice || 0;
    const newShares = currentShares + shares;
    const newAvg = Math.floor(((currentShares * currentAvg) + totalCost) / newShares);

    state.stocks[sym].shares = newShares;
    state.stocks[sym].avgPrice = newAvg;

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return { shares, price: currentPrice, totalCost };
  }

  // Sell Stocks
  function sellStock(sym, shares) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك بيع الأسهم.");
    const stock = STOCKS[sym];
    if (!stock) throw new Error("الشركة غير موجودة.");
    if (shares <= 0 || !Number.isInteger(shares)) throw new Error("عدد الأسهم غير صالح.");

    // Guard: initialize if missing
    if (!state.stocks[sym]) {
      state.stocks[sym] = { shares: 0, avgPrice: 0 };
    }

    const ownedShares = state.stocks[sym].shares || 0;
    if (ownedShares < shares) {
      throw new Error(`لا تمتلك عدد أسهم كافٍ في محفظتك. المتاح: ${ownedShares} سهم.`);
    }

    const history = stockPrices[sym];
    if (!history || history.length === 0) throw new Error("بيانات السوق غير متوفرة.");
    const currentPrice = history[history.length - 1];
    const totalReturn = currentPrice * shares;

    state.stocks[sym].shares -= shares;
    if (state.stocks[sym].shares === 0) {
      state.stocks[sym].avgPrice = 0;
    }
    state.cash += totalReturn;

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return { shares, price: currentPrice, totalReturn };
  }

  // Lock Investment
  function startInvestment(type, amount) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك بدء صناديق استثمارية.");
    const inv = INVESTMENTS[type];
    if (!inv) throw new Error("هذا الخيار الاستثماري غير متاح.");
    if (amount < inv.minCost) {
      throw new Error(`الحد الأدنى للمشاركة في هذا الاستثمار هو ${inv.minCost.toLocaleString()} جنيه.`);
    }
    if (state.cash < amount) {
      throw new Error("رصيدك النقدي (الكاش) لا يكفي لتمويل هذا الاستثمار.");
    }

    state.cash -= amount;
    state.investments.push({
      id: inv.id,
      name: inv.name,
      investedAmount: amount,
      ticksRemaining: inv.durationTicks,
      rate: inv.rate
    });

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
  }

  // Store: Buy Item
  function buyStoreItem(itemId) {
    const item = STORE_ITEMS[itemId];
    if (!item) throw new Error("المنتج المطلوب غير متوفر بالمتجر.");

    if (state.cash < item.cost) {
      throw new Error(`سعر المنتج ${item.cost.toLocaleString()} جنيه. رصيدك لا يكفي.`);
    }

    state.cash -= item.cost;
    state.inventory[itemId] = (state.inventory[itemId] || 0) + 1;

    // Initialize/Reset item self-destruction timer
    if (!state.itemDurations) state.itemDurations = {};
    state.itemDurations[itemId] = item.durationTicks;

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);
    return item;
  }

  // Store: Use Item
  function useStoreItem(itemId) {
    throw new Error("هذا العنصر يعطي مفعولاً تلقائياً مستمراً بمجرد الاحتفاظ به بمحفظتك ولا يمكن استهلاكه يدوياً.");
  }

  // Black Market Trade Deals (Illegal High Risk Deals)
  function runBlackMarketDeal(dealId) {
    if (state.jailTimer > 0) throw new Error("أنت خلف القضبان! لا يمكنك ارتكاب جرائم جديدة.");
    const deal = BLACK_MARKET[dealId];
    if (!deal) throw new Error("الصفقة غير متوفرة.");

    if (state.cash < deal.cost) {
      throw new Error(`تحتاج لرأسمال ${deal.cost.toLocaleString()} جنيه للقيام بهذه الصفقة المشبوهة.`);
    }

    // Deduct raw capital cost immediately
    state.cash -= deal.cost;

    // Calculate legal protection risk reducer
    // Premium lawyer item reduces fail chance
    let protectionFactor = 1.0;
    if (state.inventory.premium_lawyer > 0) {
      protectionFactor = 1 - STORE_ITEMS.premium_lawyer.value; // e.g. -35% risk
    }

    const baseFailChance = 1 - deal.successChance;
    const modifiedFailChance = baseFailChance * protectionFactor;
    const finalSuccessChance = 1 - modifiedFailChance;

    const roll = Math.random();
    if (roll < finalSuccessChance) {
      // SUCCESS: High ROI Payout
      state.cash += deal.payout;
      state.netWorth = calculateNetWorth();
      AppDB.savePlayerState(activeUsername, state);
      return {
        success: true,
        payout: deal.payout,
        profit: deal.payout - deal.cost
      };
    } else {
      // CAUGHT BY POLICE!
      // Fine (20% of remaining cash) and lock in jail
      const confiscation = Math.floor(state.cash * 0.20);
      state.cash -= confiscation;
      state.jailTimer = deal.jailDuration;

      state.netWorth = calculateNetWorth();
      AppDB.savePlayerState(activeUsername, state);
      return {
        success: false,
        confiscation: confiscation,
        jailDuration: deal.jailDuration
      };
    }
  }

  // Casino Flip Game with Streak Bonus
  function playCoinFlip(betAmount, choice, currentStreak = 0) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يسمح لك بالدخول للكازينو.");
    if (betAmount <= 0) throw new Error("مبلغ الرهان يجب أن يكون أكبر من صفر جنيه.");
    if (state.cash < betAmount) throw new Error("رصيدك النقدي لا يكفي لهذا الرهان.");

    state.cash -= betAmount;

    // 49.0% base win probability (+15% if VIP casino pass active)
    let winChance = 0.49;
    if (state.inventory.vip_casino_pass > 0) {
      winChance += STORE_ITEMS.vip_casino_pass.value;
    }
    const roll = Math.random();
    const won = roll < winChance;

    // Determine flipped side
    let outcomeSide = choice;
    if (!won) {
      outcomeSide = choice === 'heads' ? 'tails' : 'heads';
    }

    if (won) {
      // Streak bonus multiplier: 2.0x base, +0.25x per streak level up to 3.5x max
      const streakBonus = Math.min(1.5, currentStreak * 0.25);
      const mult = 2.0 + streakBonus;
      const payout = Math.floor(betAmount * mult);
      state.cash += payout;
      state.netWorth = calculateNetWorth();
      AppDB.savePlayerState(activeUsername, state);
      return { won: true, side: outcomeSide, multiplier: mult, payout: payout, profit: payout - betAmount };
    } else {
      state.netWorth = calculateNetWorth();
      AppDB.savePlayerState(activeUsername, state);
      return { won: false, side: outcomeSide, loss: betAmount };
    }
  }

  // Casino Slots Game with 5 Premium Tier Symbols
  function playSlots(betAmount) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يمكنك اللعب.");
    if (betAmount <= 0) throw new Error("مبلغ الرهان غير صالح.");
    if (state.cash < betAmount) throw new Error("رصيدك الكاش لا يكفي لتشغيل آلة الحظ.");

    state.cash -= betAmount;

    // Reels Symbols (CROWN, DIAMOND, GOLD, SACK, KEY)
    const symbols = ['CROWN', 'DIAMOND', 'GOLD', 'SACK', 'KEY'];
    
    // Weight distribution: VIP pass gives higher chance of high tier symbols
    let hasVip = state.inventory.vip_casino_pass > 0;
    
    function getRandomSymbol() {
      const r = Math.random();
      if (hasVip) {
        if (r < 0.15) return 'CROWN';
        if (r < 0.35) return 'DIAMOND';
        if (r < 0.60) return 'GOLD';
        if (r < 0.82) return 'SACK';
        return 'KEY';
      } else {
        if (r < 0.08) return 'CROWN';
        if (r < 0.24) return 'DIAMOND';
        if (r < 0.50) return 'GOLD';
        if (r < 0.77) return 'SACK';
        return 'KEY';
      }
    }

    const r1 = getRandomSymbol();
    const r2 = getRandomSymbol();
    const r3 = getRandomSymbol();

    let multiplier = 0;
    let winMessage = "حظ أوفر المرة القادمة!";
    let isJackpot = false;

    if (r1 === r2 && r2 === r3) {
      // 3 Matching
      if (r1 === 'CROWN') { multiplier = 25; winMessage = "الجاكبوت الملكي الذهبي الأكبر!"; isJackpot = true; }
      else if (r1 === 'DIAMOND') { multiplier = 18; winMessage = "ألماس ثلاثي أسطوري!"; isJackpot = true; }
      else if (r1 === 'GOLD') { multiplier = 12; winMessage = "ثلاث سبائك ذهبية متطابقة!"; }
      else if (r1 === 'SACK') { multiplier = 8; winMessage = "ثلاث حقائب أموال ضخمة!"; }
      else { multiplier = 5; winMessage = "ثلاثة مفاتيح ذهبية نادرة!"; }
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
      // 2 Matching
      multiplier = 1.5;
      winMessage = "رمزان متطابقان، جائزة ترضية!";
    } else {
      multiplier = 0;
    }

    const payout = Math.floor(betAmount * multiplier);
    state.cash += payout;

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);

    return {
      reels: [r1, r2, r3],
      won: payout > 0,
      isJackpot: isJackpot,
      multiplier: multiplier,
      payout: payout,
      profit: payout - betAmount,
      message: winMessage
    };
  }

  // NEW Casino Game: Lucky Royale Dice (رمي النرد الملكي)
  function playDice(betAmount, choice) {
    if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يمكنك اللعب.");
    if (betAmount <= 0) throw new Error("مبلغ الرهان غير صالح.");
    if (state.cash < betAmount) throw new Error("رصيدك الكاش لا يكفي لرهان النرد.");

    state.cash -= betAmount;

    // Roll 2 dice (1 to 6)
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const sum = d1 + d2;
    const isDouble = (d1 === d2);

    let won = false;
    let multiplier = 0;

    if (choice === 'under' && sum < 7) {
      won = true;
      multiplier = 2.0;
    } else if (choice === 'over' && sum > 7) {
      won = true;
      multiplier = 2.0;
    } else if (choice === 'exact7' && sum === 7) {
      won = true;
      multiplier = 5.8;
    } else if (choice === 'double' && isDouble) {
      won = true;
      multiplier = 3.5;
    }

    const payout = won ? Math.floor(betAmount * multiplier) : 0;
    state.cash += payout;

    state.netWorth = calculateNetWorth();
    AppDB.savePlayerState(activeUsername, state);

    return {
      d1,
      d2,
      sum,
      isDouble,
      won,
      multiplier,
      payout,
      profit: payout - betAmount
    };
  }

  function forceSaveState() {
    state.netWorth = calculateNetWorth();
    state.title = getAppropriateTitle(state.netWorth, state.xp);
    AppDB.savePlayerState(activeUsername, state);
  }

  return {
    get state() { return state; },
    get stockPrices() { return stockPrices; },
    get activeUsername() { return activeUsername; },
    
    JOBS,
    BUSINESSES,
    ASSETS,
    STOCKS,
    INVESTMENTS,
    STORE_ITEMS,
    BLACK_MARKET,

    loadUserSession,
    logoutUser,
    processTick,
    performJobShift,
    promoteJob,
    purchaseBusiness,
    upgradeBusiness,
    hireWorker,
    fireWorker,
    setBusinessPrice,
    launchMarketingCampaign,
    depositToBank,
    withdrawFromBank,
    buyAsset,
    sellAsset,
    buyStock,
    sellStock,
    startInvestment,
    buyStoreItem,
    useStoreItem,
    runBlackMarketDeal,
    playCoinFlip,
    playSlots,
    playDice,
    forceSaveState
  };
})();

// Export globally
window.GameEngine = GameEngine;
