/**
 * store-engine.js
 * Authoritative Server Logic for General Store, Black Market Gear & Police Bribes
 */

const { STORE_ITEMS, BLACK_MARKET, BLACK_MARKET_GEAR } = require('./definitions');

const { calculateNetWorth } = require('./net-worth-engine');

function getCairoTodayStr(serverNow = Date.now()) {
  const d = new Date(serverNow + (3 * 3600 * 1000));
  return d.toISOString().split('T')[0];
}

function ensureInventoryState(state, serverNow = Date.now()) {
  if (!state.inventory || typeof state.inventory !== 'object') state.inventory = {};
  if (!state.itemDurations || typeof state.itemDurations !== 'object') state.itemDurations = {};
  if (!state.itemCooldowns || typeof state.itemCooldowns !== 'object') state.itemCooldowns = {};

  const today = getCairoTodayStr(serverNow);
  if (!state.dailyToolUses || typeof state.dailyToolUses !== 'object' || state.dailyToolUses.date !== today) {
    state.dailyToolUses = { date: today, uses: {} };
  }
}

function buyStoreItem(state, itemId, serverNow = Date.now()) {
  const item = STORE_ITEMS[itemId];
  if (!item) throw new Error("الأداة المطلوبة غير متوفرة في المتجر.");

  ensureInventoryState(state, serverNow);

  const usedToday = state.dailyToolUses.uses[itemId] || 0;
  if (item.maxDailyUses && usedToday >= item.maxDailyUses) {
    throw new Error(`وصلت للحد الأقصى لاستخدام "${item.name}" اليوم (${item.maxDailyUses}/${item.maxDailyUses}).`);
  }

  const cooldownExpiry = Number(state.itemCooldowns[itemId]) || 0;
  if (serverNow < cooldownExpiry) {
    const remSec = Math.ceil((cooldownExpiry - serverNow) / 1000);
    throw new Error(`الأداة في فترة التبريد (كول داون). يمكنك شراؤها بعد ${remSec} ثانية.`);
  }

  const cash = Number(state.cash) || 0;
  if (cash < item.cost) {
    throw new Error(`سعر الأداة ${item.cost.toLocaleString()} EGP. رصيدك لا يكفي.`);
  }

  state.cash -= item.cost;
  state.inventory[itemId] = 1;
  state.itemDurations[itemId] = item.durationTicks;
  state.dailyToolUses.uses[itemId] = usedToday + 1;
  if (item.cooldownSec) {
    state.itemCooldowns[itemId] = serverNow + (item.cooldownSec * 1000);
  }

  state.netWorth = calculateNetWorth(state);

  return {
    success: true,
    itemId,
    cost: item.cost,
    inventory: state.inventory,
    itemDurations: state.itemDurations,
    cash: state.cash,
    netWorth: state.netWorth
  };
}

function buyBlackMarketGear(state, gearId, serverNow = Date.now()) {
  if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يمكنك شراء معدات السوق السوداء.");
  const item = BLACK_MARKET_GEAR[gearId];
  if (!item) throw new Error("المعدة غير متوفرة في السوق السوداء.");

  ensureInventoryState(state, serverNow);

  const dirty = Number(state.dirtyCash) || 0;
  const cash = Number(state.cash) || 0;
  const total = dirty + cash;
  if (total < item.cost) {
    throw new Error(`سعر المعدة ${item.cost.toLocaleString()} جنيه. رصيدك لا يكفي.`);
  }

  if (dirty >= item.cost) {
    state.dirtyCash -= item.cost;
  } else {
    const rem = item.cost - dirty;
    state.dirtyCash = 0;
    state.cash -= rem;
  }

  state.inventory[gearId] = (state.inventory[gearId] || 0) + 1;
  state.itemDurations[gearId] = item.durationTicks;

  state.netWorth = calculateNetWorth(state);

  return {
    success: true,
    gearId,
    cost: item.cost,
    inventory: state.inventory,
    dirtyCash: state.dirtyCash,
    cash: state.cash,
    netWorth: state.netWorth
  };
}

function bribePolice(state) {
  const jail = Number(state.jailTimer) || 0;
  const heat = Number(state.heatLevel) || 0;
  if (jail <= 0 && heat <= 0) {
    throw new Error("سجلك نظيف حالياً ولا توجد ملاحقات أمنية أو أحكام سجن عليك!");
  }

  const cash = Number(state.cash) || 0;
  const dirty = Number(state.dirtyCash) || 0;
  const bribeCost = Math.max(15000, Math.floor(cash * 0.15) + (jail * 1000));

  const total = dirty + cash;
  if (total < bribeCost) {
    throw new Error(`تكلفة الرشوة والوساطة ${bribeCost.toLocaleString()} EGP. رصيدك لا يكفي!`);
  }

  if (dirty >= bribeCost) {
    state.dirtyCash -= bribeCost;
  } else {
    const rem = bribeCost - dirty;
    state.dirtyCash = 0;
    state.cash -= rem;
  }

  state.jailTimer = 0;
  state.heatLevel = 0;
  state.raidActive = false;

  state.netWorth = calculateNetWorth(state);

  return {
    success: true,
    bribeCost,
    jailTimer: 0,
    heatLevel: 0,
    dirtyCash: state.dirtyCash,
    cash: state.cash,
    netWorth: state.netWorth
  };
}

function runBlackMarketDeal(state, dealId, serverNow = Date.now()) {
  if (state.jailTimer > 0) throw new Error("أنت مسجون حالياً! لا يمكنك إدارة صفقات السوق السوداء.");
  const deal = BLACK_MARKET[dealId];
  if (!deal) throw new Error("الصفقة المطلوبة غير متوفرة في السوق السوداء.");

  ensureInventoryState(state, serverNow);

  // 0. Check reputation requirement
  const repNeeded = deal.repNeeded || 0;
  if ((Number(state.underworldRep) || 0) < repNeeded) {
    throw new Error(`تحتاج إلى سمعة لا تقل عن ${repNeeded} نقطة في العالم السفلي للقيام بهذه الصفقة.`);
  }

  // 1. Check Cooldown
  if (!state.blackMarketCooldowns || typeof state.blackMarketCooldowns !== 'object') {
    state.blackMarketCooldowns = {};
  }
  const cdExpiry = Number(state.blackMarketCooldowns[dealId]) || 0;
  if (serverNow < cdExpiry) {
    const remainingSec = Math.ceil((cdExpiry - serverNow) / 1000);
    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    const timeStr = mins > 0 ? `${mins} دقيقة و ${secs} ثانية` : `${secs} ثانية`;
    throw new Error(`العملية في فترة تهدئة أمنية (كول داون)! يرجى الانتظار ${timeStr}.`);
  }

  // 2. Check Dirty Cash requirement if requireDirtyCost is true
  if (deal.requireDirtyCost && (Number(state.dirtyCash) || 0) < deal.cost) {
    throw new Error(`تحتاج لـ ${deal.cost.toLocaleString()} EGP من الأموال المشبوهة (الكاش المتسخ) تحديداً لغسيلها.`);
  }

  const totalCashAvailable = (Number(state.cash) || 0) + (Number(state.dirtyCash) || 0);
  if (totalCashAvailable < deal.cost) {
    throw new Error(`تحتاج لرأسمال ${deal.cost.toLocaleString()} جنيه للقيام بهذه الصفقة المشبوهة.`);
  }

  // Deduct cost: first from dirtyCash, then remaining from clean cash
  if ((Number(state.dirtyCash) || 0) >= deal.cost) {
    state.dirtyCash -= deal.cost;
  } else {
    const remainingCost = deal.cost - (Number(state.dirtyCash) || 0);
    state.dirtyCash = 0;
    state.cash -= remainingCost;
  }

  // Count this deal towards today's daily limit
  const today = getCairoTodayStr(serverNow);
  if (!state.dailyBlackMarket || typeof state.dailyBlackMarket !== 'object' || state.dailyBlackMarket.date !== today) {
    state.dailyBlackMarket = { date: today, count: 0 };
  }
  state.dailyBlackMarket.count = (state.dailyBlackMarket.count || 0) + 1;

  // Calculate risk & success modifiers
  let successBonus = 0;
  const hasLawyer = Boolean(state.inventory && state.inventory.premium_lawyer > 0);
  const hasJammer = Boolean(state.inventory && state.inventory.radar_jammer > 0);
  if (hasLawyer) successBonus += 0.04;
  if (hasJammer) successBonus += 0.025;

  const finalSuccessChance = Math.min(0.85, (deal.successChance || 0.5) + successBonus);

  // Prepare Cooldown Timers (Full cooldown for success, Half cooldown for failure)
  const hasCronos = Boolean(state.inventory && state.inventory.cronos_gear > 0);
  const cdMultiplier = hasCronos ? 0.75 : 1.0;
  const fullCdMs = Math.floor((deal.cooldownSec || 120) * cdMultiplier * 1000);
  const halfCdMs = Math.floor(((deal.cooldownSec || 120) / 2) * cdMultiplier * 1000);

  const roll = Math.random();
  if (roll < finalSuccessChance) {
    // SUCCESS
    if (deal.cleanPayout) {
      state.cash = (Number(state.cash) || 0) + deal.payout;
    } else {
      state.dirtyCash = (Number(state.dirtyCash) || 0) + deal.payout;
    }
    state.underworldRep = (Number(state.underworldRep) || 0) + (deal.repGain || 0);
    state.blackMarketCooldowns[dealId] = serverNow + fullCdMs;

    state.netWorth = calculateNetWorth(state);

    return {
      success: true,
      dealId,
      payout: deal.payout,
      profit: deal.payout - deal.cost,
      repGain: deal.repGain || 0,
      lawyerAssisted: hasLawyer,
      cooldownSec: Math.floor((deal.cooldownSec || 120) * cdMultiplier),
      finalChancePct: Math.round(finalSuccessChance * 100),
      cash: state.cash,
      dirtyCash: state.dirtyCash,
      netWorth: state.netWorth,
      underworldRep: state.underworldRep,
      blackMarketCooldowns: state.blackMarketCooldowns,
      dailyCount: state.dailyBlackMarket.count
    };
  } else {
    // FAILURE / CAUGHT BY POLICE: Half cooldown
    state.blackMarketCooldowns[dealId] = serverNow + halfCdMs;

    // 1. Lawyer Acquittal: 25% chance lawyer dismisses charges
    if (hasLawyer && Math.random() < 0.25) {
      state.netWorth = calculateNetWorth(state);
      return {
        success: false,
        dealId,
        escaped: true,
        acquittedByLawyer: true,
        confiscation: 0,
        jailDuration: 0,
        cooldownSec: Math.floor((deal.cooldownSec || 120) / 2 * cdMultiplier),
        cash: state.cash,
        dirtyCash: state.dirtyCash,
        netWorth: state.netWorth,
        underworldRep: state.underworldRep,
        blackMarketCooldowns: state.blackMarketCooldowns,
        dailyCount: state.dailyBlackMarket.count,
        message: 'تدخل المحامي الدولي وأسقط القضية وأثبت براءتك دون سجن أو غرامات!'
      };
    }

    // 2. Fake Passport Escape
    if (state.inventory && state.inventory.fake_passport > 0) {
      state.inventory.fake_passport--;
      if (state.itemDurations) delete state.itemDurations.fake_passport;
      state.netWorth = calculateNetWorth(state);
      return {
        success: false,
        dealId,
        escaped: true,
        confiscation: 0,
        jailDuration: 0,
        cooldownSec: Math.floor((deal.cooldownSec || 120) / 2 * cdMultiplier),
        cash: state.cash,
        dirtyCash: state.dirtyCash,
        netWorth: state.netWorth,
        inventory: state.inventory,
        underworldRep: state.underworldRep,
        blackMarketCooldowns: state.blackMarketCooldowns,
        dailyCount: state.dailyBlackMarket.count,
        message: 'تمكنت من الهروب الفوري باستخدام جواز السفر الدبلوماسي المزور!'
      };
    }

    // 3. Arrest & Confiscation
    const hasDiplomaticBag = Boolean(state.inventory && state.inventory.diplomatic_bag > 0);
    const confiscatedDirty = hasDiplomaticBag ? Math.floor((Number(state.dirtyCash) || 0) * 0.82) : (Number(state.dirtyCash) || 0);

    // Guaranteed minimum fine of at least 20% of deal cost, so exact-cost players never escape with 0 penalty
    const minFine = Math.floor(deal.cost * 0.20);
    const fineAmount = Math.max(Math.floor((Number(state.cash) || 0) * 0.15), minFine);

    let deductedFromCash = 0;
    let deductedFromBank = 0;
    const currentCleanCash = Number(state.cash) || 0;
    if (currentCleanCash >= fineAmount) {
      state.cash = currentCleanCash - fineAmount;
      deductedFromCash = fineAmount;
    } else {
      deductedFromCash = Math.max(0, currentCleanCash);
      const remainder = fineAmount - deductedFromCash;
      state.cash = 0;
      const currentBank = Number(state.bank) || 0;
      if (currentBank > 0) {
        deductedFromBank = Math.min(remainder, currentBank);
        state.bank = Math.max(0, currentBank - deductedFromBank);
      }
    }

    state.dirtyCash = Math.max(0, (Number(state.dirtyCash) || 0) - confiscatedDirty);
    const totalConfiscation = confiscatedDirty + deductedFromCash + deductedFromBank;

    state.jailTimer = deal.jailDuration || 30;
    state.heatLevel = Math.min(5, (Number(state.heatLevel) || 0) + 1);

    const repLoss = deal.repLoss || Math.floor((deal.repGain || 20) * 1.2);
    state.underworldRep = Math.max(0, (Number(state.underworldRep) || 0) - repLoss);

    state.netWorth = calculateNetWorth(state);

    return {
      success: false,
      dealId,
      escaped: false,
      confiscation: totalConfiscation,
      confiscatedDirty,
      confiscatedClean: deductedFromCash,
      deductedFromBank,
      jailDuration: deal.jailDuration,
      repLoss,
      cooldownSec: Math.floor((deal.cooldownSec || 120) / 2 * cdMultiplier),
      cash: state.cash,
      bank: state.bank,
      dirtyCash: state.dirtyCash,
      netWorth: state.netWorth,
      jailTimer: state.jailTimer,
      heatLevel: state.heatLevel,
      underworldRep: state.underworldRep,
      blackMarketCooldowns: state.blackMarketCooldowns,
      dailyCount: state.dailyBlackMarket.count
    };
  }
}

module.exports = {
  buyStoreItem,
  buyBlackMarketGear,
  bribePolice,
  runBlackMarketDeal
};

