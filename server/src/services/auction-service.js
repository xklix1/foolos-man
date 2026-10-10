/**
 * Ras ALmal Tycoon — Authoritative Live Auction Service
 * Handles Admin-Hosted Live Auctions, Hammer Controls, Registration & Instant Reward Settlement
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const dbService = require('./db-service');
const sessionManager = require('./session-manager');

const PERSISTENCE_FILE = path.join(__dirname, '..', '..', 'backups', 'live_auction_state.json');

/**
 * Universal safe number parser for currency and net worth values.
 * Accurately parses: numbers, formatted comma-separated strings (10,000,000),
 * multiplier suffixes (10m, 10M, 100k, 1b, مليون, مليار), and Arabic digits (٠-٩).
 */
function parseSafeMoney(val, fallback = 0) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : Math.max(0, Math.floor(val));
  let s = String(val).trim();
  if (!s) return fallback;
  // Convert Arabic-Indic numerals
  s = s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  // Replace arabic commas
  s = s.replace(/،/g, ',');
  let mult = 1;
  if (/([kK]|الف|ألف)/i.test(s)) {
    mult = 1000;
    s = s.replace(/([kK]|الف|ألف)/gi, '');
  } else if (/([mM]|مليون)/i.test(s)) {
    mult = 1000000;
    s = s.replace(/([mM]|مليون)/gi, '');
  } else if (/([bB]|مليار)/i.test(s)) {
    mult = 1000000000;
    s = s.replace(/([bB]|مليار)/gi, '');
  }
  // Strip non-digit/dot characters
  s = s.replace(/[^\d.-]/g, '');
  const n = parseFloat(s);
  if (isNaN(n)) return fallback;
  return Math.max(0, Math.floor(n * mult));
}

class AuctionService {
  constructor() {
    this.state = this._getInitialState();
    this._loadPersistedState();
    this._startInternalTicker();
  }

  _getInitialState() {
    return {
      id: null,
      status: 'IDLE', // 'IDLE' | 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED'
      item: {
        type: 'gold', // 'gold' | 'chat_frame' | 'aircraft' | 'custom'
        id: 'gold_pack_1000',
        name: 'شحنة الذهب الملكية (1,000 سبيكة)',
        description: '1,000 سبيكة ذهب نقي تمنحك سيولة فورية وقوة استثمارية هائلة.',
        icon: '',
        badge: 'احتياطي ملكي',
        rewardData: { gold: 1000 }
      },
      config: {
        minNetWorth: 50000000, // 50M EGP minimum net worth
        startingBid: 10000000, // 10M EGP start
        minBidStep: 1000000, // 1M EGP step
        scheduledStartTime: 0,
        hammerDurationSeconds: 60
      },
      live: {
        currentBid: 0,
        highestBidder: null, // { username, avatar, bidTime }
        hammerStrike: 0, // 0=none, 1=First Call, 2=Second Call, 3=SOLD
        hammerStrikeMessage: '',
        hammerExpiryTime: 0,
        bidsHistory: []
      },
      registrants: [], // array of { username, registeredAt, netWorth }
      winner: null,
      lastUpdated: Date.now()
    };
  }

  _loadPersistedState() {
    try {
      if (fs.existsSync(PERSISTENCE_FILE)) {
        const raw = fs.readFileSync(PERSISTENCE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.state = { ...this._getInitialState(), ...parsed };
          console.log(`[AuctionService] Loaded persisted auction state: status=${this.state.status}, item=${this.state.item?.name}, startingBid=${this.state.config?.startingBid}, minNetWorth=${this.state.config?.minNetWorth}`);
        }
      }
    } catch (e) {
      console.warn('[AuctionService] Failed to load persisted state, using fresh state:', e.message);
    }
  }

  _savePersistedState() {
    try {
      const dir = path.dirname(PERSISTENCE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (e) {
      console.warn('[AuctionService] Persistence save error:', e.message);
    }
  }

  _startInternalTicker() {
    // 1-second background ticker to handle auto-triggers and timer sync
    setInterval(() => {
      const now = Date.now();
      if (this.state.status === 'SCHEDULED' && this.state.config.scheduledStartTime > 0) {
        if (now >= this.state.config.scheduledStartTime) {
          // Auto start auction if scheduled time arrived
          this.startAuctionNow('SYSTEM_AUTO');
        }
      }
    }, 1000);
  }

  /**
   * Public/Player state query
   */
  getPublicState(username = '') {
    const cleanUser = String(username || '').trim().toLowerCase();
    const isRegistered = this.state.registrants.some(r => r.username.toLowerCase() === cleanUser);
    
    return {
      serverTime: Date.now(),
      status: this.state.status,
      id: this.state.id,
      item: this.state.item,
      config: {
        minNetWorth: this.state.config.minNetWorth,
        startingBid: this.state.config.startingBid,
        minBidStep: this.state.config.minBidStep,
        scheduledStartTime: this.state.config.scheduledStartTime,
        hammerDurationSeconds: this.state.config.hammerDurationSeconds
      },
      live: {
        currentBid: this.state.live.currentBid,
        highestBidder: this.state.live.highestBidder,
        hammerStrike: this.state.live.hammerStrike,
        hammerStrikeMessage: this.state.live.hammerStrikeMessage,
        hammerExpiryTime: this.state.live.hammerExpiryTime,
        bidsCount: this.state.live.bidsHistory.length,
        recentBids: this.state.live.bidsHistory.slice(-10).reverse()
      },
      registrants: this.state.registrants.map(r => ({
        username: r.username,
        registeredAt: r.registeredAt,
        netWorth: r.netWorth
      })),
      registrantsCount: this.state.registrants.length,
      isRegistered: isRegistered,
      isLive: this.state.status === 'LIVE',
      isScheduled: this.state.status === 'SCHEDULED',
      isEnded: this.state.status === 'ENDED',
      winner: this.state.winner
    };
  }

  getAdminState() {
    return {
      ...this.state,
      registrantsCount: this.state.registrants.length
    };
  }

  /**
   * Admin schedules a new auction
   */
  createAuction(params) {
    const now = Date.now();
    const item = params.item || {};
    const configData = params.config || {};

    const auctionId = `auc_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const startDelayMinutes = Math.max(1, parseSafeMoney(params.startDelayMinutes || configData.startDelayMinutes, 10));
    const scheduledStartTime = Number(params.scheduledStartTime || (now + startDelayMinutes * 60 * 1000));

    // Flexible key extraction from nested config or top-level params
    const rawMinNetWorth = configData.minNetWorth !== undefined ? configData.minNetWorth : params.minNetWorth;
    const rawStartingBid = configData.startingBid !== undefined 
      ? configData.startingBid 
      : (configData.startPrice !== undefined ? configData.startPrice : (params.startingBid !== undefined ? params.startingBid : params.startPrice));
    const rawMinStep = configData.minBidStep !== undefined 
      ? configData.minBidStep 
      : (configData.minStep !== undefined ? configData.minStep : (params.minBidStep !== undefined ? params.minBidStep : params.minStep));

    const minNetWorth = parseSafeMoney(rawMinNetWorth, 0);
    const startingBid = parseSafeMoney(rawStartingBid, 10000000);
    const minBidStep = Math.max(1000, parseSafeMoney(rawMinStep, 1000000));
    const hammerDuration = Math.max(20, parseSafeMoney(configData.hammerDurationSeconds || params.hammerDurationSeconds, 60));

    this.state = {
      id: auctionId,
      status: 'SCHEDULED',
      item: {
        type: item.type || 'gold',
        id: item.id || `custom_item_${now}`,
        name: String(item.name || 'غرض مزاد ملكي حصري').trim(),
        description: String(item.description || 'عنصر نادر واستثنائي مقدم من إدارة اللعبة.').trim(),
        icon: String(item.icon || ''),
        badge: String(item.badge || 'مزاد رسمي'),
        rewardData: item.rewardData || {}
      },
      config: {
        minNetWorth: minNetWorth,
        startingBid: startingBid,
        minBidStep: minBidStep,
        scheduledStartTime: scheduledStartTime,
        hammerDurationSeconds: hammerDuration
      },
      live: {
        currentBid: startingBid,
        highestBidder: null,
        hammerStrike: 0,
        hammerStrikeMessage: '',
        hammerExpiryTime: 0,
        bidsHistory: []
      },
      registrants: [],
      winner: null,
      lastUpdated: now
    };

    console.log(`[AuctionService] Created new auction [${this.state.item.name}]: startingBid=${startingBid} EGP, minNetWorth=${minNetWorth} EGP, minBidStep=${minBidStep} EGP, startsIn=${startDelayMinutes}m`);

    this._savePersistedState();
    return { success: true, state: this.getPublicState() };
  }

  /**
   * Admin or System starts the auction
   */
  startAuctionNow(initiator = 'ADMIN') {
    if (this.state.status !== 'SCHEDULED') {
      return { success: false, error: 'المزاد ليس في مرحلة الجدولة والتسجيل.' };
    }

    const now = Date.now();
    this.state.status = 'LIVE';
    this.state.live.hammerStrike = 0;
    this.state.live.hammerStrikeMessage = 'المزاد مفتوح للمزايدات الحية الآن!';
    this.state.live.hammerExpiryTime = now + (this.state.config.hammerDurationSeconds * 1000);
    this.state.lastUpdated = now;

    this._savePersistedState();
    return { success: true, state: this.getPublicState() };
  }

  /**
   * Player registers for upcoming auction
   */
  async registerPlayer(username) {
    if (!username) throw new Error('اسم اللاعب مطلوب.');
    if (this.state.status !== 'SCHEDULED') {
      throw new Error('التسجيل متاح فقط أثناء العد التنازلي قبل بدء المزاد.');
    }

    const cleanUser = String(username).trim();
    const existing = this.state.registrants.find(r => r.username.toLowerCase() === cleanUser.toLowerCase());
    if (existing) {
      return { success: true, message: 'أنت مسجل بالفعل في هذا المزاد.' };
    }

    // Check player's authoritative net worth from DB or Session
    const playerRow = await dbService.getPlayerByUsername(cleanUser);
    if (!playerRow) throw new Error('تعذر العثور على بيانات اللاعب.');

    const activeSession = sessionManager.sessions.get(cleanUser.toLowerCase());
    const sessionState = activeSession?.state || {};

    const netWorth = Math.max(
      0,
      Number(
        playerRow.net_worth ??
        playerRow.state?.netWorth ??
        sessionState.netWorth ??
        ((playerRow.cash || sessionState.cash || 0) + (playerRow.bank || sessionState.bank || 0))
      )
    );
    const minRequired = Number(this.state.config.minNetWorth || 0);

    if (minRequired > 0 && netWorth < minRequired) {
      throw new Error(`عذراً، هذا المزاد يتطلب صافي ثروة لا تقل عن ${minRequired.toLocaleString()} ج.م (ثروتك الحالية: ${netWorth.toLocaleString()} ج.م).`);
    }

    this.state.registrants.push({
      username: cleanUser,
      registeredAt: Date.now(),
      netWorth: netWorth
    });

    this.state.lastUpdated = Date.now();
    this._savePersistedState();

    return { 
      success: true, 
      message: 'تم تسجيلك بنجاح في المزاد الملكي! استعد للمزايدة عند فتح القاعة.',
      registrantsCount: this.state.registrants.length 
    };
  }

  /**
   * Player places a live bid
   */
  async placeBid(username, amount) {
    if (!username) throw new Error('اسم المستخدم مطلوب.');
    if (this.state.status !== 'LIVE') {
      throw new Error('قاعة المزاد ليست مفتوحة للمزايدة حالياً.');
    }

    const cleanUser = String(username).trim();
    const bidAmount = Math.floor(Number(amount));

    if (!bidAmount || isNaN(bidAmount) || bidAmount <= 0) {
      throw new Error('قيمة المزايدة غير صالحة.');
    }

    // Check registration (Strict)
    const isRegistered = this.state.registrants.some(r => r.username.toLowerCase() === cleanUser.toLowerCase());
    if (!isRegistered) {
      throw new Error('عذراً، أنت متواجد كـ (مشاهد فقط) ولم تقم بالتسجيل مسبقاً أثناء فترة العد التنازلي للمزاد.');
    }

    const currentHighest = this.state.live.currentBid;
    const minStep = this.state.config.minBidStep;
    const minRequiredBid = currentHighest + minStep;

    if (this.state.live.highestBidder && bidAmount < minRequiredBid) {
      throw new Error(`أقل مزايدة مقبولة الآن هي ${minRequiredBid.toLocaleString()} ج.م (+${minStep.toLocaleString()} ج.م على السعر الحالي).`);
    } else if (!this.state.live.highestBidder && bidAmount < this.state.config.startingBid) {
      throw new Error(`السعر المبدئي لهذا المزاد هو ${this.state.config.startingBid.toLocaleString()} ج.م.`);
    }

    // Check if player is already the highest bidder
    if (this.state.live.highestBidder && this.state.live.highestBidder.username.toLowerCase() === cleanUser.toLowerCase()) {
      throw new Error('أنت صاحب أعلى مزايدة بالفعل حالياً!');
    }

    // Check player's available funds (Cash + Bank)
    const playerRow = await dbService.getPlayerByUsername(cleanUser);
    if (!playerRow) throw new Error('فشل التحقق من الحساب.');

    const availableFunds = Number(playerRow.cash || 0) + Number(playerRow.bank || 0);
    if (availableFunds < bidAmount) {
      throw new Error(`رصيدك الإجمالي (كاش + بنك) غير كافٍ. المطلوب: ${bidAmount.toLocaleString()} ج.م (المتوفر لديك: ${Math.floor(availableFunds).toLocaleString()} ج.م).`);
    }

    const now = Date.now();
    const avatar = playerRow.avatar || playerRow.state?.avatar || '';

    this.state.live.currentBid = bidAmount;
    this.state.live.highestBidder = {
      username: cleanUser,
      avatar: avatar,
      bidTime: now
    };

    // Reset hammer status on new bid
    this.state.live.hammerStrike = 0;
    this.state.live.hammerStrikeMessage = `مزايدة جديدة بقيمة ${bidAmount.toLocaleString()} ج.م من [${cleanUser}]!`;
    this.state.live.hammerExpiryTime = now + (this.state.config.hammerDurationSeconds * 1000);

    this.state.live.bidsHistory.push({
      username: cleanUser,
      avatar: avatar,
      amount: bidAmount,
      time: now
    });

    this.state.lastUpdated = now;
    this._savePersistedState();

    return {
      success: true,
      currentBid: bidAmount,
      highestBidder: cleanUser,
      message: `تم تسجيل مزايدتك بنجاح بقيمة ${bidAmount.toLocaleString()} ج.م!`
    };
  }

  /**
   * Admin controls the hammer strikes
   */
  async handleHammerAction(action) {
    const now = Date.now();

    if (action === 'cancel') {
      this.state.status = 'CANCELLED';
      this.state.live.hammerStrikeMessage = ' تم إلغاء المزاد بقرار من الإدارة.';
      this.state.lastUpdated = now;
      this._savePersistedState();
      return { success: true, action: 'cancel', message: 'تم إلغاء المزاد بنجاح.' };
    }

    if (this.state.status !== 'LIVE') {
      throw new Error('لا يمكن استخدام المطرقة لأن المزاد ليس في البث الحي.');
    }

    const highest = this.state.live.highestBidder;

    if (action === 'strike_1') {
      this.state.live.hammerStrike = 1;
      this.state.live.hammerStrikeMessage = highest 
        ? ` الضربة الأولى: ${this.state.live.currentBid.toLocaleString()} ج.م لصالح [${highest.username}]... الأولى!`
        : ' النداء الأول على السعر الافتتاحي!';
      this.state.lastUpdated = now;
      this._savePersistedState();
      return { success: true, action, message: this.state.live.hammerStrikeMessage };
    }

    if (action === 'strike_2') {
      this.state.live.hammerStrike = 2;
      this.state.live.hammerStrikeMessage = highest 
        ? ` الضربة الثانية: ${this.state.live.currentBid.toLocaleString()} ج.م لصالح [${highest.username}]... الثانية!`
        : ' النداء الثاني على السعر الافتتاحي!';
      this.state.lastUpdated = now;
      this._savePersistedState();
      return { success: true, action, message: this.state.live.hammerStrikeMessage };
    }

    if (action === 'extend_time') {
      this.state.live.hammerExpiryTime = Math.max(now, this.state.live.hammerExpiryTime) + 30000;
      this.state.live.hammerStrikeMessage = ' تم تمديد وقت المزاد 30 ثانية إضافية بقرار من الإدارة!';
      this.state.lastUpdated = now;
      this._savePersistedState();
      return { success: true, action, message: this.state.live.hammerStrikeMessage };
    }

    if (action === 'strike_final') {
      // Final SOLD strike
      if (!highest) {
        // No bidders -> end without winner
        this.state.status = 'ENDED';
        this.state.live.hammerStrike = 3;
        this.state.live.hammerStrikeMessage = ' انتهى المزاد دون تقديم أي مزايدات.';
        this.state.lastUpdated = now;
        this._savePersistedState();
        return { success: true, action, message: 'تم إنهاء المزاد دون مشترٍ.' };
      }

      // Execute authoritative settlement
      const winningAmount = this.state.live.currentBid;
      const winnerUser = highest.username;
      
      const settlementResult = await this._settleAuctionWinner(winnerUser, winningAmount, this.state.item);
      
      this.state.status = 'ENDED';
      this.state.live.hammerStrike = 3;
      this.state.live.hammerStrikeMessage = ` تم البيع رسميـاً! مبروك للاعب [${winnerUser}] فوزه بالمزاد بمبلغ ${winningAmount.toLocaleString()} ج.م!`;
      this.state.winner = {
        username: winnerUser,
        avatar: highest.avatar,
        winningBid: winningAmount,
        awardedAt: now,
        settlement: settlementResult
      };

      this.state.lastUpdated = now;
      this._savePersistedState();

      return {
        success: true,
        action: 'strike_final',
        winner: winnerUser,
        winningBid: winningAmount,
        message: this.state.live.hammerStrikeMessage
      };
    }

    if (action === 'cancel') {
      this.state.status = 'CANCELLED';
      this.state.live.hammerStrikeMessage = ' تم إلغاء المزاد بقرار من الإدارة.';
      this.state.lastUpdated = now;
      this._savePersistedState();
      return { success: true, action: 'cancel', message: 'تم إلغاء المزاد.' };
    }

    throw new Error('إجراء مطرقة غير معروف.');
  }

  /**
   * Internal Settlement: Deducts funds and grants prize
   */
  async _settleAuctionWinner(username, totalAmount, item) {
    const playerRow = await dbService.getPlayerByUsername(username);
    if (!playerRow) throw new Error(`تعذر العثور على اللاعب ${username} لتسليم الجائزة.`);

    const rawState = (typeof playerRow.state === 'object' && playerRow.state) ? { ...playerRow.state } : {};
    let cash = Number(playerRow.cash || rawState.cash || 0);
    let bank = Number(playerRow.bank || rawState.bank || 0);

    // Deduct totalAmount (first from cash, rest from bank)
    let remainingToDeduct = totalAmount;
    if (cash >= remainingToDeduct) {
      cash -= remainingToDeduct;
      remainingToDeduct = 0;
    } else {
      remainingToDeduct -= cash;
      cash = 0;
      bank = Math.max(0, bank - remainingToDeduct);
    }

    // Award Prize based on item type
    const reward = item.rewardData || {};
    let rewardGrantedDesc = '';

    if (item.type === 'gold' || reward.gold) {
      const goldToAdd = Number(reward.gold || 0);
      rawState.gold = (Number(rawState.gold || playerRow.gold || 0)) + goldToAdd;
      playerRow.gold = rawState.gold;
      rewardGrantedDesc = `+${goldToAdd.toLocaleString()} سبيكة ذهب`;
    }

    if (item.type === 'chat_frame' || reward.frameId) {
      const frameId = reward.frameId || item.id;
      if (!Array.isArray(rawState.unlockedFrames)) rawState.unlockedFrames = [];
      if (!rawState.unlockedFrames.includes(frameId)) rawState.unlockedFrames.push(frameId);
      rawState.activeChatFrame = frameId;
      rawState.chatFrame = frameId;
      rewardGrantedDesc = `إطار شات حصري: ${item.name}`;
    }

    if (item.type === 'aircraft' || reward.aircraftId) {
      const planeId = reward.aircraftId || item.id;
      if (!Array.isArray(rawState.fleet)) rawState.fleet = [];
      rawState.fleet.push({
        id: `plane_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        modelId: planeId,
        customName: item.name,
        purchasedAt: Date.now(),
        isRoyale: true
      });
      rewardGrantedDesc = `طائرة خاصة: ${item.name}`;
    }

    if (item.type === 'museum_item' || reward.relicId || reward.isMuseumRelic) {
      const relicId = reward.relicId || item.id || `relic_${Date.now()}`;
      const quantity = Math.max(1, Number(reward.quantity || item.quantity || 1));
      if (!Array.isArray(rawState.museumRelics)) rawState.museumRelics = [];
      
      for (let q = 0; q < quantity; q++) {
        const newRelic = {
          id: `owned_${Date.now()}_${q}_${Math.random().toString(36).substr(2, 4)}`,
          relicId: relicId,
          name: item.name,
          icon: item.icon || '',
          rarity: reward.rarity || 'legendary',
          rarityLabel: reward.rarityLabel || 'تحفة أثرية ملكية',
          buybackPrice: Number(reward.buybackPrice || Math.floor(totalAmount * 0.9)),
          description: item.description || '',
          edition: reward.edition || (quantity > 1 ? `نسخة (${q + 1} من ${quantity})` : 'إصدار مزاد ملكي'),
          acquiredAt: Date.now(),
          auctionWinningBid: totalAmount
        };
        rawState.museumRelics.push(newRelic);
      }
      rewardGrantedDesc = `${quantity > 1 ? quantity + 'x ' : ''}تحفة أثرية للمتحف: ${item.name}`;

      // Decrement museum stock by specified quantity
      try {
        const museumService = require('./museum-service');
        museumService.decrementStock(relicId, quantity);
      } catch (e) {}
    }

    if (item.type === 'custom') {
      if (!Array.isArray(rawState.specialBadges)) rawState.specialBadges = [];
      rawState.specialBadges.push(item.name);
      rewardGrantedDesc = item.name;
    }

    // Update player state objects
    rawState.cash = cash;
    rawState.bank = bank;
    rawState.adminModifiedTimestamp = Date.now();
    playerRow.cash = cash;
    playerRow.bank = bank;
    playerRow.state = rawState;
    playerRow.admin_modified_timestamp = rawState.adminModifiedTimestamp;

    // Save to DB
    await dbService.savePlayerState(username, rawState);

    // Sync in-memory session if active
    const activeSession = sessionManager.sessions.get(username.toLowerCase());
    if (activeSession) {
      activeSession.state = { ...activeSession.state, ...rawState };
      activeSession.dirty = false;
    }

    return {
      awardedItem: item.name,
      rewardGrantedDesc,
      deductedCash: totalAmount - remainingToDeduct,
      newCash: cash,
      newBank: bank
    };
  }
}

module.exports = new AuctionService();
