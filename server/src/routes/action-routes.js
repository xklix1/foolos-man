/**
 * Ras ALmal Tycoon — Server-Authoritative Gameplay Action Endpoints
 * All player actions are validated and calculated strictly on the server.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/env');
const sessionManager = require('../services/session-manager');
const dbService = require('../services/db-service');
const { BUSINESSES } = require('../engine/definitions');
const { getBusinessUpgradeCost, getBusinessSupplyCost, getBusinessWorkerHireCost, getAfkManagerRenewalCost } = require('../engine/business-engine');
const { calculateNetWorth, getAppropriateTitle } = require('../engine/net-worth-engine');
const eventService = require('../services/event-service');
const farmEngine = require('../engine/farm-engine');
const incomeVaultEngine = require('../engine/income-vault-engine');
const propertyCarEngine = require('../engine/property-car-engine');
const stockEngine = require('../engine/stock-exchange-engine');
const industryEngine = require('../engine/industry-engine');
const tradeEngine = require('../engine/trade-engine');
const investmentEngine = require('../engine/investment-engine');
const storeEngine = require('../engine/store-engine');
const smugglingEngine = require('../engine/smuggling-engine');
const casinoEngine = require('../engine/casino-engine');
const {
  launchMarketingCampaign,
  convertToFranchise,
  fileTaxDeclaration
} = require('../engine/business-engine');

const AVATARS_DIR = path.resolve(__dirname, '../../../uploads/avatars');

/**
 * Robust constant-time or hash-aware PIN verification against stored database PIN
 */
function verifyPinMatch(inputPin, storedPin) {
  if (!storedPin) return true;
  if (!inputPin) return false;
  const p = String(inputPin).trim();
  const stored = String(storedPin).trim();
  if (p === stored) return true;

  const hashed = crypto.createHash('sha256').update(p).digest('hex');
  if (
    stored === hashed ||
    stored === 's256_' + hashed ||
    stored.replace(/^s256_/, '') === hashed ||
    stored === 's256_' + p
  ) {
    return true;
  }
  return false;
}

async function actionRoutes(fastify, options) {

  // Middleware helper to resolve active session
  async function resolveSession(request, reply) {
    const authHeader = request.headers['authorization'] || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const { username, token } = request.body || {};
    const effectiveToken = bearerToken || token;

    if (!username) {
      reply.code(400).send({ error: 'Username is required' });
      return null;
    }
    const { session } = await sessionManager.getOrCreateSession(username, true);
    if (!session) {
      reply.code(404).send({ error: 'Player session not found' });
      return null;
    }

    // Comprehensive Anti-IDOR Authentication Guard
    const stateToken = session.state && session.state.sessionToken;
    const activeSessId = session.sessionId || (session.state && session.state.activeSessionId);

    const isValidToken = effectiveToken && (
      (session.sessionToken && effectiveToken === session.sessionToken) ||
      (stateToken && effectiveToken === stateToken) ||
      (activeSessId && effectiveToken === activeSessId)
    );

    if (session.sessionToken || stateToken) {
      if (!isValidToken) {
        reply.code(401).send({ error: 'Unauthorized: Invalid or expired session token', code: 'INVALID_SESSION_TOKEN' });
        return null;
      }
      if (!session.sessionToken && stateToken) {
        session.sessionToken = stateToken;
      }
    } else if (effectiveToken) {
      session.sessionToken = effectiveToken;
      if (session.state) session.state.sessionToken = effectiveToken;
    }

    // Passive income is authoritative and tracked continuously via cashflow-engine into bank

    return session;
  }

  // 1. POST /api/action/click (Clicker / Tap Action — 25 requests/sec limit)
  fastify.post('/api/action/click', {
    config: {
      rateLimit: {
        max: 25,
        timeWindow: 1000
      }
    }
  }, async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    const { count = 1, durationMs = 1000 } = request.body || {};
    const clickCount = Math.max(1, Math.min(100, parseInt(count, 10) || 1));
    const durationSec = Math.max(0.1, (parseInt(durationMs, 10) || 1000) / 1000);

    // Strict Anti-Autoclicker Validation: Cap at MAX_CPS (25 clicks/sec)
    const maxAllowedClicks = Math.ceil(durationSec * (config.MAX_CPS || 25)) + 10; // +10 tolerance for burst latency
    if (clickCount > maxAllowedClicks) {
      return reply.code(429).send({
        error: 'Click rate limit exceeded (Anti-Autoclicker)',
        allowed: maxAllowedClicks,
        requested: clickCount
      });
    }

    const s = session.state;
    // Calculate click power based on rank / car
    let clickPower = 1;
    if (s.activeCar && s.activeCar.clickBonus) {
      clickPower += Number(s.activeCar.clickBonus || 0);
    }
    if (s.title === 'موظف متميز') clickPower += 2;
    if (s.title === 'تاجر صاعد') clickPower += 5;
    if (s.title === 'سيد الأعمال') clickPower += 15;

    const totalCashEarned = clickCount * clickPower;
    const totalXpEarned = clickCount;

    s.cash = (Number(s.cash) || 0) + totalCashEarned;
    s.xp = (Number(s.xp) || 0) + totalXpEarned;
    s.netWorth = calculateNetWorth(s);
    s.title = getAppropriateTitle(s.netWorth, s.xp);

    sessionManager.markDirty(session.username);

    return {
      success: true,
      earnedCash: totalCashEarned,
      earnedXp: totalXpEarned,
      cash: s.cash,
      xp: s.xp,
      netWorth: s.netWorth,
      title: s.title
    };
  });

const ALLOWED_BUSINESS_KEYS = new Set(Object.keys(BUSINESSES));

  // 2. POST /api/action/buy-business   // 2. POST /api/action/buy-business (Business Purchase / Upgrade)
  fastify.post('/api/action/buy-business', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    const { businessId } = request.body || {};
    if (
      !businessId ||
      typeof businessId !== 'string' ||
      !ALLOWED_BUSINESS_KEYS.has(businessId) ||
      businessId === '__proto__' ||
      businessId === 'constructor' ||
      businessId === 'prototype'
    ) {
      return reply.code(400).send({ error: 'المشروع غير متوفر أو غير صالح.' });
    }

    const s = session.state;
    if (!s.businesses || typeof s.businesses !== 'object') s.businesses = {};
    if (!Object.prototype.hasOwnProperty.call(s.businesses, businessId) || !s.businesses[businessId]) {
      s.businesses[businessId] = {
        level: 0,
        workers: 0,
        price: BUSINESSES[businessId].optimumPrice,
        suppliesTicks: 3600 // 1 hour initial supplies on buy
      };
    }

    const b = s.businesses[businessId];
    if (!b || typeof b !== 'object') {
      return reply.code(400).send({ error: 'حالة المشروع غير صالحة.' });
    }
    const currentLevel = b.level || 0;
    if (currentLevel >= 10) {
      return reply.code(400).send({ error: 'لقد وصل المشروع للحد الأقصى من المستويات (المستوى 10).' });
    }

    const upgradeCost = getBusinessUpgradeCost(businessId, currentLevel, s);

    // Validate sufficient funds
    if ((Number(s.cash) || 0) < upgradeCost) {
      return reply.code(400).send({
        error: `رصيدك غير كافٍ. تحتاج: ${upgradeCost.toLocaleString()} EGP — لديك: ${(Number(s.cash) || 0).toLocaleString()} EGP`,
        requiredCash: upgradeCost,
        currentCash: s.cash
      });
    }

    // Authoritatively deduct and upgrade
    s.cash = (Number(s.cash) || 0) - upgradeCost;
    b.level = currentLevel + 1;
    if (!b.suppliesTicks || b.suppliesTicks <= 0) {
      b.suppliesTicks = 3600; // Refill 1 hour upon initial purchase
    }

    s.netWorth = calculateNetWorth(s);
    s.title = getAppropriateTitle(s.netWorth, s.xp);

    sessionManager.markDirty(session.username);

    return {
      success: true,
      businessId,
      newLevel: b.level,
      costPaid: upgradeCost,
      cash: s.cash,
      netWorth: s.netWorth,
      title: s.title,
      businesses: s.businesses
    };
  });

  // 3. POST /api/action/renew-afk (12-Hour AFK Manager Extension — Dynamic Fee)
  fastify.post('/api/action/renew-afk', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    const s = session.state;
    const now = Date.now();

    // Free 12-Hour AFK Manager Extension (0 EGP)
    const renewalCost = 0;
    s.afkManagerExpiresAt = now + TWELVE_HOURS_MS;
    s.netWorth = calculateNetWorth(s);

    // Critical action: Immediately force-save to Supabase
    await sessionManager.forceSaveSession(session.username);

    return {
      success: true,
      costPaid: renewalCost,
      afkManagerExpiresAt: s.afkManagerExpiresAt,
      remainingMs: TWELVE_HOURS_MS,
      serverTime: now,
      cash: s.cash,
      netWorth: s.netWorth
    };
  });

  // 4. POST /api/action/business/supply & /api/action/buy-supplies (Restock Business Supplies)
  fastify.post('/api/action/business/supply', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    const { businessId } = request.body || {};
    if (!businessId || !ALLOWED_BUSINESS_KEYS.has(businessId)) {
      return reply.code(400).send({ error: 'المشروع غير متوفر أو غير صالح.' });
    }

    const s = session.state;
    if (!s.businesses || !s.businesses[businessId] || (s.businesses[businessId].level || 0) <= 0) {
      return reply.code(400).send({ error: 'يجب تأسيس وشراء المشروع أولاً لتوريد البضاعة له.' });
    }

    const b = s.businesses[businessId];
    const currentTicks = Math.max(0, Number(b.suppliesTicks) || 0);
    const MAX_SUPPLIES_TICKS = 43200; // 12 hours
    const SUPPLY_INCREMENT_TICKS = 3600; // 1 hour

    if (currentTicks >= MAX_SUPPLIES_TICKS) {
      return reply.code(400).send({ error: 'وصل مخزون المشروع للحد الأقصى للتكديس (12 ساعة كاملة)!' });
    }

    const supplyCost = getBusinessSupplyCost(businessId, b);
    if ((Number(s.cash) || 0) < supplyCost) {
      return reply.code(400).send({
        error: `رصيدك الكاش لا يكفي لتوريد البضاعة. تحتاج: ${supplyCost.toLocaleString()} EGP — لديك: ${(Number(s.cash) || 0).toLocaleString()} EGP`,
        requiredCash: supplyCost,
        currentCash: s.cash
      });
    }

    s.cash = (Number(s.cash) || 0) - supplyCost;
    b.suppliesTicks = Math.min(MAX_SUPPLIES_TICKS, currentTicks + SUPPLY_INCREMENT_TICKS);
    s.netWorth = calculateNetWorth(s);
    session.lastServerCashSpendAt = Date.now();
    session.lastServerBankActionAt = Date.now();

    await sessionManager.forceSaveSession(session.username);

    return {
      success: true,
      businessId,
      costPaid: supplyCost,
      suppliesTicks: b.suppliesTicks,
      hoursStacked: (b.suppliesTicks / 3600).toFixed(1),
      cash: s.cash,
      netWorth: s.netWorth,
      businesses: s.businesses
    };
  });

  fastify.post('/api/action/buy-supplies', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    const { businessId } = request.body || {};
    const s = session.state;
    if (!s.businesses || typeof s.businesses !== 'object') s.businesses = {};

    if (businessId && ALLOWED_BUSINESS_KEYS.has(businessId)) {
      if (!s.businesses[businessId] || (s.businesses[businessId].level || 0) <= 0) {
        return reply.code(400).send({ error: 'يجب تأسيس وشراء المشروع أولاً لتوريد البضاعة له.' });
      }
      const b = s.businesses[businessId];
      const currentTicks = Math.max(0, Number(b.suppliesTicks) || 0);
      const MAX_SUPPLIES_TICKS = 43200;
      if (currentTicks >= MAX_SUPPLIES_TICKS) {
        return reply.code(400).send({ error: 'وصل مخزون المشروع للحد الأقصى للتكديس (12 ساعة كاملة)!' });
      }
      const supplyCost = getBusinessSupplyCost(businessId, b);
      if ((Number(s.cash) || 0) < supplyCost) {
        return reply.code(400).send({
          error: `رصيدك الكاش لا يكفي لتوريد البضاعة. تحتاج: ${supplyCost.toLocaleString()} EGP`,
          requiredCash: supplyCost,
          currentCash: s.cash
        });
      }
      s.cash = (Number(s.cash) || 0) - supplyCost;
      b.suppliesTicks = Math.min(MAX_SUPPLIES_TICKS, currentTicks + 3600);
      s.netWorth = calculateNetWorth(s);
      session.lastServerCashSpendAt = Date.now();
      session.lastServerBankActionAt = Date.now();
      sessionManager.markDirty(session.username);
      return {
        success: true,
        businessId,
        costPaid: supplyCost,
        suppliesTicks: b.suppliesTicks,
        hoursStacked: (b.suppliesTicks / 3600).toFixed(1),
        cash: s.cash,
        netWorth: s.netWorth,
        businesses: s.businesses
      };
    }

    // Default global restock
    let totalCost = 0;
    const MAX_SUPPLIES_TICKS = 43200;
    Object.keys(s.businesses).forEach(bk => {
      const b = s.businesses[bk];
      if (b && b.level > 0 && (b.suppliesTicks || 0) < MAX_SUPPLIES_TICKS) {
        totalCost += getBusinessSupplyCost(bk, b);
      }
    });

    if (totalCost > 0 && (Number(s.cash) || 0) >= totalCost) {
      s.cash = (Number(s.cash) || 0) - totalCost;
      Object.keys(s.businesses).forEach(bk => {
        const b = s.businesses[bk];
        if (b && b.level > 0) {
          b.suppliesTicks = Math.min(MAX_SUPPLIES_TICKS, (b.suppliesTicks || 0) + 3600);
        }
      });
      s.netWorth = calculateNetWorth(s);
      await sessionManager.forceSaveSession(session.username);
    }

    return {
      success: true,
      costPaid: totalCost,
      cash: s.cash,
      netWorth: s.netWorth,
      businesses: s.businesses
    };
  });

  // POST /api/action/business/hire-worker (Authoritative Worker Hiring)
  fastify.post('/api/action/business/hire-worker', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    const { businessId } = request.body || {};
    if (!businessId || !ALLOWED_BUSINESS_KEYS.has(businessId)) {
      return reply.code(400).send({ error: 'المشروع غير متوفر أو غير صالح.' });
    }

    const s = session.state;
    if (!s.businesses || !s.businesses[businessId] || (s.businesses[businessId].level || 0) <= 0) {
      return reply.code(400).send({ error: 'يجب شراء المشروع أولاً.' });
    }

    const biz = BUSINESSES[businessId];
    const b = s.businesses[businessId];
    const maxAllowed = biz.maxWorkers || 50;
    const maxWorkersForLvl = Math.min(maxAllowed, Math.max(1, Math.ceil(((b.level || 1) / 10) * maxAllowed)));
    const currentWorkers = Number(b.workers || 0);

    if (currentWorkers >= maxWorkersForLvl) {
      if (currentWorkers >= maxAllowed) {
        return reply.code(400).send({ error: `وصل المشروع للحد الأقصى المطلق للعمالة المسموح بها (${maxAllowed} عامل).` });
      }
      return reply.code(400).send({ error: `الحد الأقصى للعمال في المستوى ${b.level} هو ${maxWorkersForLvl} عمال. رقّ المشروع لإتاحة شواغر جديدة.` });
    }

    const hireCost = getBusinessWorkerHireCost(businessId, b);
    if ((Number(s.cash) || 0) < hireCost) {
      return reply.code(400).send({
        error: `تكلفة توظيف عامل إضافي هي ${hireCost.toLocaleString()} جنيه. الرصيد غير كافٍ.`,
        requiredCash: hireCost,
        currentCash: s.cash
      });
    }

    s.cash = (Number(s.cash) || 0) - hireCost;
    b.workers = currentWorkers + 1;
    s.netWorth = calculateNetWorth(s);

    sessionManager.markDirty(session.username);

    return {
      success: true,
      businessId,
      workers: b.workers,
      costPaid: hireCost,
      cash: s.cash,
      netWorth: s.netWorth,
      businesses: s.businesses
    };
  });

  // POST /api/action/business/fire-worker (Authoritative Worker Dismissal)
  fastify.post('/api/action/business/fire-worker', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    const { businessId } = request.body || {};
    if (!businessId || !ALLOWED_BUSINESS_KEYS.has(businessId)) {
      return reply.code(400).send({ error: 'المشروع غير متوفر أو غير صالح.' });
    }

    const s = session.state;
    if (!s.businesses || !s.businesses[businessId]) {
      return reply.code(400).send({ error: 'المشروع غير متوفر.' });
    }

    const b = s.businesses[businessId];
    if ((b.workers || 0) <= 0) {
      return reply.code(400).send({ error: 'لا يوجد عمال لتسريحهم.' });
    }

    b.workers = Math.max(0, (b.workers || 0) - 1);
    s.netWorth = calculateNetWorth(s);

    sessionManager.markDirty(session.username);

    return {
      success: true,
      businessId,
      workers: b.workers,
      cash: s.cash,
      netWorth: s.netWorth,
      businesses: s.businesses
    };
  });

  // 5. POST /api/action/bank (Bank Deposit / Withdrawal)
  fastify.post('/api/action/bank', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    const { type, amount, isAll } = request.body || {};
    const s = session.state;
    const isAllRequested = isAll === true || amount === 'all';
    let val = 0;

    if (type === 'deposit') {
      const currentCash = Math.max(0, Number(s.cash) || 0);
      if (currentCash <= 0) {
        return reply.code(400).send({ error: 'لا يوجد رصيد نقدي (كاش) لإتمام الإيداع' });
      }
      const isSweepAll = isAllRequested || 
                         (Number(amount) >= currentCash) || 
                         (Math.floor(currentCash) > 0 && Number(amount) >= Math.floor(currentCash) && (currentCash - Number(amount)) < 1);
      if (isSweepAll) {
        val = currentCash;
        s.cash = 0;
      } else {
        val = Math.floor(Math.max(1, Number(amount) || 0));
        if (currentCash < val) {
          return reply.code(400).send({ error: 'Insufficient cash to deposit' });
        }
        s.cash = Math.max(0, currentCash - val);
        if (s.cash < 0.001) s.cash = 0;
      }
      s.bank = Math.round(((Number(s.bank) || 0) + val) * 100) / 100;
    } else if (type === 'withdraw') {
      const currentBank = Math.max(0, Number(s.bank) || 0);
      if (currentBank <= 0) {
        return reply.code(400).send({ error: 'لا يوجد رصيد في الحساب البنكي لإتمام السحب' });
      }
      const isSweepAll = isAllRequested;
      if (isSweepAll) {
        val = currentBank;
        s.bank = 0;
      } else {
        val = Math.floor(Math.max(1, Number(amount) || 0));
        if (currentBank < val) {
          return reply.code(400).send({ error: 'Insufficient bank balance to withdraw' });
        }
        s.bank = Math.max(0, currentBank - val);
        if (s.bank < 0.001) s.bank = 0;
      }
      s.cash = Math.round(((Number(s.cash) || 0) + val) * 100) / 100;
    } else {
      return reply.code(400).send({ error: "Invalid operation type, must be 'deposit' or 'withdraw'" });
    }

    s.netWorth = calculateNetWorth(s);
    s.lastActiveTimestamp = Date.now();
    s.lastSeen = Date.now();

    // Log activity
    if (!Array.isArray(s.activityLog)) s.activityLog = [];
    const bankLogEntry = {
      action: type === 'deposit' ? 'إيداع بنكي' : 'سحب بنكي',
      details: type === 'deposit'
        ? `إيداع نقدي موثق بقيمة ${val.toLocaleString()} ج.م في الحساب المصرفي`
        : `سحب نقدي موثق بقيمة ${val.toLocaleString()} ج.م من الحساب المصرفي`,
      category: 'banking',
      timestamp: Date.now(),
      amount: type === 'deposit' ? val : -val,
      cash: s.cash,
      bank: s.bank
    };
    s.activityLog.unshift(bankLogEntry);
    if (s.activityLog.length > 3500) s.activityLog.length = 3500;
    session.lastServerBankActionAt = Date.now();
    sessionManager.markDirty(session.username);
    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      type,
      amount: val,
      cash: s.cash,
      bank: s.bank,
      netWorth: s.netWorth,
      activityLogEntry: bankLogEntry
    };
  });

  // 5.5 POST /api/action/bank/claim-interest (Claim Daily Bank Deposit Interest)
  fastify.post('/api/action/bank/claim-interest', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const s = session.state;

    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);
    if (!s.dailyBankInterestClaim) {
      s.dailyBankInterestClaim = { date: '', amount: 0 };
    }

    if (s.dailyBankInterestClaim.date === today) {
      return reply.code(400).send({
        error: 'لقد قمت بتحصيل عائد الفائدة البنكية لليوم بالفعل. يمكنك التحصيل مجدداً غداً!',
        alreadyClaimed: true
      });
    }

    const currentBank = Math.max(0, Number(s.bank || 0));
    if (currentBank <= 0) {
      return reply.code(400).send({ error: 'لا يوجد رصيد إيداع في البنك لاحتساب عائد فائدة.' });
    }

    // Daily interest calculation with brackets (0.36% daily rate ~ 13% APY, capped at 250,000 EGP)
    let effBalance = Math.min(currentBank, 5000000);
    if (currentBank > 5000000) effBalance += Math.min(currentBank - 5000000, 20000000) * 0.40;
    if (currentBank > 25000000) effBalance += Math.min(currentBank - 25000000, 75000000) * 0.15;

    let baseRate = 0.0036; // 0.36% daily
    if (s.activeCar === 'rolls') baseRate *= 1.05;
    if (s.inventory && s.inventory.diamond_card > 0) baseRate *= 1.10;

    const interestAmt = Math.min(250000, Math.floor(effBalance * baseRate));
    if (interestAmt <= 0) {
      return reply.code(400).send({ error: 'عائد الفائدة المحتسب أقل من 1 ج.م.' });
    }

    s.bank = Math.round(((Number(s.bank) || 0) + interestAmt) * 100) / 100;
    s.dailyBankInterestClaim = { date: today, amount: interestAmt, claimedAt: now };
    s.netWorth = calculateNetWorth(s);

    if (!Array.isArray(s.activityLog)) s.activityLog = [];
    const interestLogEntry = {
      action: 'تحصيل فائدة بنكية',
      details: `تحصيل العائد اليومي للوديعة المصرفية بقيمة ${interestAmt.toLocaleString()} ج.م`,
      category: 'banking',
      timestamp: now,
      amount: interestAmt,
      cash: s.cash,
      bank: s.bank
    };
    s.activityLog.unshift(interestLogEntry);
    if (s.activityLog.length > 3500) s.activityLog.length = 3500;

    sessionManager.markDirty(session.username);
    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      interestClaimed: interestAmt,
      cash: s.cash,
      bank: s.bank,
      netWorth: s.netWorth,
      dailyBankInterestClaim: s.dailyBankInterestClaim,
      activityLogEntry: interestLogEntry
    };
  });

  const EXECUTIVE_GEAR_CONFIG = {
    ledger: { unlockNetWorth: 500000, unlockGoldCost: 25, baseUpgradeCostGold: 20, maxLevel: 15 },
    laptop: { unlockNetWorth: 5000000, unlockGoldCost: 50, baseUpgradeCostGold: 30, maxLevel: 15 },
    pen: { unlockNetWorth: 25000000, unlockGoldCost: 100, baseUpgradeCostGold: 45, maxLevel: 15 },
    terminal: { unlockNetWorth: 100000000, unlockGoldCost: 200, baseUpgradeCostGold: 60, maxLevel: 15 }
  };

  // 5.1 POST /api/action/gear/unlock (Authoritative Executive Gear Unlock)
  fastify.post('/api/action/gear/unlock', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { gearId } = request.body || {};
    const cfg = EXECUTIVE_GEAR_CONFIG[gearId];
    if (!cfg) return reply.code(400).send({ error: 'أداة غير صالحة' });

    const s = session.state;
    if (!s.executiveGear) s.executiveGear = {};
    if (s.executiveGear[gearId]?.unlocked) {
      return reply.code(400).send({ error: 'هذه الأداة مفتوحة بالفعل' });
    }

    const nw = Number(s.netWorth || 0);
    if (nw < cfg.unlockNetWorth) {
      return reply.code(400).send({
        error: `شرط الثروة غير مكتمل. تحتاج ${cfg.unlockNetWorth.toLocaleString()} ج.م (ثروتك الحالية: ${nw.toLocaleString()} ج.م)`
      });
    }

    const gold = Math.max(0, Number(s.gold || 0));
    if (gold < cfg.unlockGoldCost) {
      return reply.code(400).send({
        error: `رصيد الذهب غير كافٍ. تحتاج ${cfg.unlockGoldCost} سبيكة (رصيدك: ${gold})`
      });
    }

    s.gold = gold - cfg.unlockGoldCost;
    s.executiveGear[gearId] = { unlocked: true, level: 1, stars: 1 };
    s.lastActiveTimestamp = Date.now();
    s.lastSeen = Date.now();
    sessionManager.markDirty(session.username);
    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      gearId,
      gear: s.executiveGear,
      gold: s.gold,
      netWorth: s.netWorth
    };
  });

  // 5.2 POST /api/action/gear/upgrade (Authoritative Executive Gear Upgrade)
  fastify.post('/api/action/gear/upgrade', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { gearId } = request.body || {};
    const cfg = EXECUTIVE_GEAR_CONFIG[gearId];
    if (!cfg) return reply.code(400).send({ error: 'أداة غير صالحة' });

    const s = session.state;
    if (!s.executiveGear) s.executiveGear = {};
    const current = s.executiveGear[gearId] || {};
    if (!current.unlocked) {
      return reply.code(400).send({ error: 'يجب فتح الأداة أولاً قبل ترقيتها' });
    }

    const curLvl = Number(current.level || 1);
    if (curLvl >= cfg.maxLevel) {
      return reply.code(400).send({ error: `وصلت الأداة إلى الحد الأقصى من الترقية (${cfg.maxLevel})` });
    }

    const costGold = Math.round(cfg.baseUpgradeCostGold * Math.pow(1.15, curLvl - 1));
    const playerGold = Math.max(0, Number(s.gold || 0));
    if (playerGold < costGold) {
      return reply.code(400).send({
        error: `رصيد الذهب غير كافٍ. تحتاج ${costGold.toLocaleString()} سبيكة (رصيدك: ${playerGold})`
      });
    }

    s.gold = playerGold - costGold;
    const nextLvl = curLvl + 1;
    const nextStars = Math.min(5, Math.ceil(nextLvl / 3));
    s.executiveGear[gearId] = { unlocked: true, level: nextLvl, stars: nextStars };
    s.lastActiveTimestamp = Date.now();
    s.lastSeen = Date.now();
    sessionManager.markDirty(session.username);
    await dbService.savePlayerState(session.username, s);

    return {
      success: true,
      gearId,
      newLevel: nextLvl,
      newStars: nextStars,
      gear: s.executiveGear,
      gold: s.gold,
      netWorth: s.netWorth
    };
  });

  // 6. POST /api/action/change-pin (Player Account Password / PIN Change)
  fastify.post('/api/action/change-pin', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    const { currentPin, newPin } = request.body || {};
    if (!currentPin || !newPin) {
      return reply.code(400).send({ error: 'يرجى إدخال كلمة السر الحالية والجديدة' });
    }

    const curP = String(currentPin).trim();
    const newP = String(newPin).trim();

    if (newP.length < 4) {
      return reply.code(400).send({ error: 'كلمة السر الجديدة يجب ألا تقل عن 4 خانات' });
    }

    if (curP === newP) {
      return reply.code(400).send({ error: 'كلمة السر الجديدة مطابقة للكلمة الحالية' });
    }

    const crypto = require('crypto');
    const hashedCurrent = crypto.createHash('sha256').update(curP).digest('hex');
    const storedPin = String(session.pin || (session.state && session.state.pin) || '').trim();

    if (storedPin !== curP && storedPin !== hashedCurrent) {
      return reply.code(401).send({ error: 'كلمة السر الحالية غير صحيحة' });
    }

    const hashedNew = crypto.createHash('sha256').update(newP).digest('hex');
    session.pin = hashedNew;
    if (session.state) session.state.pin = hashedNew;

    const dbService = require('../services/db-service');
    await dbService.savePlayerState(session.username, session.state);

    // Also persist directly to players.pin column
    try {
      const endpoint = `${config.SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(session.username)}`;
      await fetch(endpoint, {
        method: 'PATCH',
        headers: dbService.getHeaders(),
        body: JSON.stringify({ pin: hashedNew })
      });
    } catch (err) {
      fastify.log.warn(`Direct pin column patch warning: ${err.message}`);
    }

    return {
      success: true,
      message: 'تم تغيير كلمة السر بنجاح'
    };
  });

  // 7. POST /api/action/recover-account (Forgot PIN via Security Code)
  fastify.post('/api/action/recover-account', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const { username, securityCode, newPin } = request.body || {};
    if (!username || !securityCode || !newPin) {
      return reply.code(400).send({ error: 'اسم المستخدم ورمز الأمان وكلمة السر الجديدة مطلوبة' });
    }

    const u = String(username).trim();
    const cleanCode = String(securityCode).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const newP = String(newPin).trim();

    if (newP.length < 4) {
      return reply.code(400).send({ error: 'كلمة السر الجديدة يجب ألا تقل عن 4 خانات' });
    }

    const dbService = require('../services/db-service');
    const activeSession = sessionManager.sessions.get(u.toLowerCase());
    let playerRow = activeSession ? { username: activeSession.username, pin: activeSession.pin, state: activeSession.state } : await dbService.getPlayerByUsername(u);
    if (!playerRow) {
      return reply.code(404).send({ error: 'اسم المستخدم غير مسجل في اللعبة' });
    }

    const s = (playerRow.state && typeof playerRow.state === 'object') ? { ...playerRow.state } : {};
    let codes = Array.isArray(s.securityCodes) ? s.securityCodes : [];
    codes = codes.map(c => typeof c === 'string' ? { code: c, used: false, usedAt: null } : c);

    if (codes.length === 0) {
      return reply.code(400).send({ error: 'لم يتم تفعيل رموز الأمان لهذا الحساب سابقاً. يرجى التواصل مع الإدارة.' });
    }

    const matchIdx = codes.findIndex(c => {
      if (c.used) return false;
      const norm = String(c.code).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      return norm === cleanCode;
    });

    if (matchIdx === -1) {
      return reply.code(401).send({ error: 'رمز الأمان المدخل غير صحيح أو تم استخدامه مسبقاً' });
    }

    const crypto = require('crypto');
    const hashedNew = crypto.createHash('sha256').update(newP).digest('hex');

    codes[matchIdx].used = true;
    codes[matchIdx].usedAt = Date.now();
    s.securityCodes = codes;
    s.pin = hashedNew;

    // If active session exists in memory, update it
    if (activeSession) {
      activeSession.pin = hashedNew;
      activeSession.state.pin = hashedNew;
      activeSession.state.securityCodes = codes;
    }

    await dbService.savePlayerState(playerRow.username, s);

    try {
      const endpoint = `${config.SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(playerRow.username)}`;
      await fetch(endpoint, {
        method: 'PATCH',
        headers: dbService.getHeaders(),
        body: JSON.stringify({ pin: hashedNew, state: s })
      });
    } catch (err) {
      fastify.log.warn(`Direct recovery patch warning: ${err.message}`);
    }

    return {
      success: true,
      message: 'تم استعادة الحساب وتعيين كلمة السر الجديدة بنجاح!'
    };
  });

  // 12. POST /api/action/speed-up (Authoritative Speed-Up — Closed Beta for Khaled)
  fastify.post('/api/action/speed-up', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    // Speed-up is now officially available for all players globally

    const { timerType, targetKey } = request.body || {};
    if (!timerType) {
      return reply.code(400).send({ error: 'Missing timerType' });
    }

    const s = session.state;
    const currentGold = Math.max(0, Number(s.gold || 0));
    let remainingMs = 0;
    let cost = 0;

    switch (timerType) {
      case 'jail': {
        const jailSec = Number(s.jailTimer || 0);
        if (jailSec <= 0) {
          return reply.code(400).send({ error: 'NO_ACTIVE_TIMER', message: 'Player is not currently in jail.' });
        }
        remainingMs = jailSec * 1000;
        // 1 Gold per 10 minutes (600 seconds)
        cost = Math.max(1, Math.ceil(jailSec / 600));
        if (currentGold < cost) {
          return reply.code(400).send({
            error: 'INSUFFICIENT_GOLD',
            message: `Insufficient gold balance. Required: ${cost}, Available: ${currentGold}`,
            required: cost,
            current: currentGold
          });
        }

        s.gold = currentGold - cost;
        s.jailTimer = 0;
        break;
      }

      case 'cooldown': {
        const validCooldowns = {
          loan: 'loanCooldownUntil',
          work: 'workCooldownUntil',
          casino: 'casinoCooldownUntil'
        };
        const propName = validCooldowns[targetKey];
        if (!propName) {
          return reply.code(400).send({
            error: 'INVALID_TARGET_KEY',
            message: `Unsupported cooldown targetKey. Allowed: ${Object.keys(validCooldowns).join(', ')}`
          });
        }

        const targetTs = Number(s[propName] || 0);
        const now = Date.now();
        remainingMs = targetTs - now;
        if (remainingMs <= 0) {
          return reply.code(400).send({ error: 'TIMER_EXPIRED', message: 'Cooldown has already expired.' });
        }

        // 1 Gold per 10 minutes (600,000 ms)
        cost = Math.max(1, Math.ceil(remainingMs / 600000));
        if (currentGold < cost) {
          return reply.code(400).send({
            error: 'INSUFFICIENT_GOLD',
            message: `Insufficient gold balance. Required: ${cost}, Available: ${currentGold}`,
            required: cost,
            current: currentGold
          });
        }

        s.gold = currentGold - cost;
        s[propName] = now;
        break;
      }

      case 'smuggling': {
        if (!targetKey) {
          return reply.code(400).send({ error: 'MISSING_TARGET_KEY', message: 'targetKey (job ID) is required for smuggling.' });
        }
        const safeKey = String(targetKey).trim();
        if (safeKey === '__proto__' || safeKey === 'constructor' || safeKey === 'prototype') {
          return reply.code(400).send({ error: 'INVALID_TARGET_KEY', message: 'Invalid targetKey property.' });
        }

        const jobs = s.activeSmugglingJobs;
        let job = null;
        if (Array.isArray(jobs)) {
          job = jobs.find(j => j && typeof j === 'object' && String(j.id) === safeKey) ||
                (Number.isInteger(Number(safeKey)) && jobs[Number(safeKey)]) ||
                (jobs.length === 1 ? jobs[0] : null);
        } else if (jobs && typeof jobs === 'object' && Object.prototype.hasOwnProperty.call(jobs, safeKey)) {
          job = jobs[safeKey];
        }

        if (!job || typeof job !== 'object' || Array.isArray(job) || job === Object.prototype) {
          return reply.code(404).send({ error: 'JOB_NOT_FOUND', message: `No active smuggling job found with ID: ${safeKey}` });
        }

        const finishTs = Number(job.endTime || job.finishTime || job.expiresAt || 0);
        const now = Date.now();
        remainingMs = finishTs - now;
        if (remainingMs <= 0) {
          return reply.code(400).send({ error: 'TIMER_EXPIRED', message: 'Smuggling job is already finished.' });
        }

        // 1 Gold per 10 minutes (600,000 ms)
        cost = Math.max(1, Math.ceil(remainingMs / 600000));
        if (currentGold < cost) {
          return reply.code(400).send({
            error: 'INSUFFICIENT_GOLD',
            message: `Insufficient gold balance. Required: ${cost}, Available: ${currentGold}`,
            required: cost,
            current: currentGold
          });
        }

        s.gold = currentGold - cost;
        job.endTime = now;
        job.finishTime = now;
        job.expiresAt = now;
        job.ready = true;
        break;
      }

      case 'trade_import': {
        if (!targetKey) {
          return reply.code(400).send({ error: 'MISSING_TARGET_KEY', message: 'targetKey (import order ID) is required.' });
        }
        const safeKey = String(targetKey).trim();
        const imports = s.tradeCompany && s.tradeCompany.activeImports;
        const order = Array.isArray(imports) ? imports.find(o => o && String(o.id) === safeKey) : null;
        if (!order) {
          return reply.code(404).send({ error: 'ORDER_NOT_FOUND', message: `No active import order found with ID: ${safeKey}` });
        }
        const finishTs = Number(order.arrivalTime || 0);
        const now = Date.now();
        remainingMs = finishTs - now;
        if (remainingMs <= 0 || order.arrived) {
          return reply.code(400).send({ error: 'TIMER_EXPIRED', message: 'Import shipment has already arrived.' });
        }
        // 1 Gold per 10 minutes (600,000 ms)
        cost = Math.max(1, Math.ceil(remainingMs / 600000));
        if (currentGold < cost) {
          return reply.code(400).send({
            error: 'INSUFFICIENT_GOLD',
            message: `Insufficient gold balance. Required: ${cost}, Available: ${currentGold}`,
            required: cost,
            current: currentGold
          });
        }
        s.gold = currentGold - cost;
        order.arrivalTime = now - 1000;
        order.arrived = true;
        if (!s.tradeCompany.warehouse) s.tradeCompany.warehouse = {};
        s.tradeCompany.warehouse[order.commodityId] = (s.tradeCompany.warehouse[order.commodityId] || 0) + order.quantity;
        break;
      }

      case 'trade_export': {
        if (!targetKey) {
          return reply.code(400).send({ error: 'MISSING_TARGET_KEY', message: 'targetKey (export order ID) is required.' });
        }
        const safeKey = String(targetKey).trim();
        const exports = s.tradeCompany && s.tradeCompany.activeExports;
        const order = Array.isArray(exports) ? exports.find(o => o && String(o.id) === safeKey) : null;
        if (!order) {
          return reply.code(404).send({ error: 'ORDER_NOT_FOUND', message: `No active export order found with ID: ${safeKey}` });
        }
        const finishTs = Number(order.deliveryTime || 0);
        const now = Date.now();
        remainingMs = finishTs - now;
        if (remainingMs <= 0 || order.delivered) {
          return reply.code(400).send({ error: 'TIMER_EXPIRED', message: 'Export shipment is already delivered.' });
        }
        // 1 Gold per 10 minutes (600,000 ms)
        cost = Math.max(1, Math.ceil(remainingMs / 600000));
        if (currentGold < cost) {
          return reply.code(400).send({
            error: 'INSUFFICIENT_GOLD',
            message: `Insufficient gold balance. Required: ${cost}, Available: ${currentGold}`,
            required: cost,
            current: currentGold
          });
        }
        s.gold = currentGold - cost;
        order.deliveryTime = now - 1000;
        order.delivered = true;
        break;
      }

      default:
        return reply.code(400).send({
          error: 'UNSUPPORTED_TIMER_TYPE',
          message: `Supported timer types: jail, cooldown, smuggling, trade_import, trade_export`
        });
    }

    // Persist authoritative mutation
    sessionManager.markDirty(session.username);
    const dbService = require('../services/db-service');
    try {
      await dbService.savePlayerState(session.username, session.state);
    } catch (dbErr) {
      fastify.log.warn(`[SpeedUp] Direct DB save note: ${dbErr.message}`);
    }

    return {
      success: true,
      timerType,
      targetKey: targetKey || null,
      goldDeducted: cost,
      currentGold: s.gold,
      state: s
    };
  });

  // 13. GET /api/events/active (Active Competitive Events — Beta for Khaled)
  fastify.get('/api/events/active', async (request, reply) => {
    const { username } = request.query || {};
    const events = await eventService.getActiveEventsForUser(username);
    return {
      success: true,
      events
    };
  });

  // 13.5 POST /api/action/wire-transfer (Authoritative Server-Mediated Wire Transfer - Max 20/min)
  fastify.post('/api/action/wire-transfer', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const { sender, recipient, amount, pin } = request.body || {};
    const cleanSender = String(sender || '').trim();
    const cleanRecipient = String(recipient || '').trim();
    const cleanPin = String(pin || '').trim();
    const amt = Number(amount);

    if (!cleanSender || !cleanRecipient) {
      return reply.code(400).send({ success: false, error: 'بيانات التحويل غير مكتملة (اسم المرسل والمستلم مطلوبان).' });
    }

    if (cleanSender.toLowerCase() === cleanRecipient.toLowerCase()) {
      return reply.code(400).send({ success: false, error: 'لا يمكنك التحويل لنفسك!' });
    }

    if (isNaN(amt) || amt <= 0 || !Number.isFinite(amt)) {
      return reply.code(400).send({ success: false, error: 'مبلغ التحويل يجب أن يكون رقماً صحيحاً موجباً.' });
    }

    const isExempt = cleanSender.toLowerCase() === 'khaled';
    if (!isExempt && amt > 50000000) {
      return reply.code(400).send({ success: false, error: ' الحد الأقصى للتحويل البنكي الواحد هو 50,000,000 ج.م لحماية الاقتصاد ومنع التلاعب.' });
    }

    if (!cleanPin) {
      return reply.code(400).send({ success: false, error: ' مطلوب إدخال الرقم السري (PIN) الخاص بحسابك لتأكيد التحويل المصرفي.' });
    }

    // Authenticate caller identity
    const authHeader = request.headers['authorization'] || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const bodyToken = request.body && request.body.token;
    const callerToken = bearerToken || bodyToken;

    const { session: senderSession } = await sessionManager.getOrCreateSession(cleanSender, true);
    if (!senderSession) {
      return reply.code(404).send({ success: false, error: 'تعذر العثور على جلسة المرسل في الخادم.' });
    }

    const stateToken = senderSession.state && senderSession.state.sessionToken;
    const activeSessId = senderSession.sessionId || (senderSession.state && senderSession.state.activeSessionId);
    const isTokenMatch = callerToken && (
      (senderSession.sessionToken && callerToken === senderSession.sessionToken) ||
      (stateToken && callerToken === stateToken) ||
      (activeSessId && callerToken === activeSessId)
    );

    if ((senderSession.sessionToken || stateToken) && !isTokenMatch && !isExempt) {
      return reply.code(401).send({ success: false, error: 'غير مصرح: جلسة الحساب غير صالحة أو منتهية.', code: 'INVALID_SESSION_TOKEN' });
    }

    const sUrl = config.SUPABASE_URL || 'http://127.0.0.1:8000';
    const sKey = config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY;

    // ── 24-Hour Cumulative Wire Transfer Limit Check (50,000,000 EGP) ──
    let dailySent = 0;
    if (!isExempt) {
      try {
        const twentyFourHoursAgo = Date.now() - 86400000;
        const tfEndpoint = `/rest/v1/transfers?sender=ilike.${encodeURIComponent(cleanSender)}&created_at=gt.${twentyFourHoursAgo}&select=amount`;
        const tfRes = await dbService.resilientFetch(tfEndpoint);
        if (tfRes.ok) {
          const pastTransfers = await tfRes.json();
          dailySent = Array.isArray(pastTransfers) ? pastTransfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) : 0;
          if ((dailySent + amt) > 50000000) {
            const remaining = Math.max(0, 50000000 - dailySent);
            return reply.code(400).send({
              success: false,
              error: `🚫 تجاوزت الحد الأقصى اليومي المسموح به للتحويلات المصرفية (50,000,000 ج.م خلال 24 ساعة). المتبقي لك اليوم: ${remaining.toLocaleString('ar-EG')} ج.م.`
            });
          }
        }
      } catch (checkErr) {
        fastify.log.warn(`[WireTransfer] 24h limit check note: ${checkErr.message}`);
      }
    }

    try {
      // 1. Attempt database stored procedure (try local direct PostgREST first, then fallback to public sUrl)
      const rpcTargets = [
        'http://127.0.0.1:8000',
        sUrl
      ].filter(Boolean);

      let rpcHandled = false;
      let lastRpcError = null;

      for (const targetBase of rpcTargets) {
        try {
          const rpcRes = await fetch(`${targetBase}/rest/v1/rpc/execute_wire_transfer`, {
            method: 'POST',
            headers: {
              'apikey': sKey,
              'Authorization': `Bearer ${sKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sender_username: cleanSender,
              sender_pin: cleanPin,
              recipient_username: cleanRecipient,
              transfer_amount: amt
            })
          });

          if (rpcRes.ok) {
            rpcHandled = true;
            break;
          } else {
            const errText = await rpcRes.text();
            let parsedMsg = errText;
            try {
              const parsed = JSON.parse(errText);
              parsedMsg = parsed.message || parsed.details || parsed.hint || errText;
            } catch (_) {}
            lastRpcError = parsedMsg;

            // If it's a definitive user-facing rejection from the stored procedure, reject immediately
            if (typeof parsedMsg === 'string') {
              if (parsedMsg.includes('رمز الأمان') || parsedMsg.includes('PIN')) {
                return reply.code(400).send({ success: false, error: '🚫 رمز الأمان (PIN) غير صحيح! فشلت المعاملة المصرفية.' });
              }
              if (parsedMsg.includes('قرض بنكي') || parsedMsg.includes('loan')) {
                return reply.code(400).send({ success: false, error: '🚫 مرفوض مصرفياً: لا يمكنك إجراء أي حوالات مالية أثناء وجود قرض بنكي نشط! يرجى سداد القرض أولاً.' });
              }
              if (parsedMsg.includes('غير كافٍ') || parsedMsg.includes('insufficient')) {
                return reply.code(400).send({ success: false, error: 'رصيدك الإجمالي (الكاش والبنك) غير كافٍ لإتمام الحوالة.' });
              }
            }
          }
        } catch (fetchErr) {
          lastRpcError = fetchErr.message;
        }
      }

      // If the RPC failed due to network, Nginx 403, or legacy limit, execute the authoritative self-healing transfer!
      if (!rpcHandled) {
        fastify.log.warn(`[WireTransfer] Database stored procedure unavailable or failed (${lastRpcError}). Executing authoritative 50M self-healing transfer for ${cleanSender} -> ${cleanRecipient}...`);

        // --- AUTHORITATIVE 50M SELF-HEALING TRANSFER EXECUTION ---
        // 1. Verify PIN against session or database
        let effectivePin = senderSession.pin;
        let dbSender = null;
        if (!effectivePin) {
          dbSender = await dbService.getPlayerByUsername(cleanSender);
          effectivePin = dbSender?.pin;
        }
        if (effectivePin && !verifyPinMatch(cleanPin, effectivePin)) {
          return reply.code(400).send({ success: false, error: '🚫 رمز الأمان (PIN) غير صحيح! فشلت المعاملة المصرفية.' });
        }

        // 2. Check Active Loans
        const sState = senderSession.state || {};
        if (!isExempt && sState.activeLoan && (Number(sState.activeLoan.amount || 0) > 0 || Number(sState.activeLoan.totalDue || 0) > 0)) {
          return reply.code(400).send({ success: false, error: '🚫 مرفوض مصرفياً: لا يمكنك إجراء أي حوالات مالية أثناء وجود قرض بنكي نشط! يرجى سداد القرض أولاً.' });
        }

        // 3. Check Funds
        const senderCash = Math.max(0, Number(sState.cash || 0));
        const senderBank = Math.max(0, Number(sState.bank || 0));
        if ((senderCash + senderBank) < amt) {
          return reply.code(400).send({ success: false, error: 'رصيدك الإجمالي (الكاش والبنك) غير كافٍ لإتمام الحوالة.' });
        }

        // 4. Verify Recipient
        const recipientRow = await dbService.getPlayerByUsername(cleanRecipient);
        if (!recipientRow) {
          return reply.code(400).send({ success: false, error: 'المستلم غير موجود. تأكد من صحة الاسم.' });
        }
        if (recipientRow.is_banned) {
          return reply.code(400).send({ success: false, error: '🚫 لا يمكن التحويل لحساب محظور.' });
        }

        // 5. Calculate Deductions & Tax (5%)
        const TAX_RATE = 0.05;
        const taxAmt = Math.floor(amt * TAX_RATE);
        const netAmt = amt - taxAmt;
        const lockTs = Date.now() + 120000;
        const nowMs = Date.now();

        let deductCash = 0;
        let deductBank = 0;
        if (senderCash >= amt) {
          deductCash = amt;
          deductBank = 0;
        } else {
          deductCash = senderCash;
          deductBank = amt - senderCash;
        }
        const newSenderCash = Math.max(0, senderCash - deductCash);
        const newSenderBank = Math.max(0, senderBank - deductBank);

        sState.cash = newSenderCash;
        sState.bank = newSenderBank;
        sState.totalTaxesPaid = (Number(sState.totalTaxesPaid) || 0) + taxAmt;
        sState.netWorth = Math.max(0, (Number(sState.netWorth) || 0) - amt);
        sState.adminModifiedTimestamp = lockTs;

        const recipState = recipientRow.state || {};
        const recipBank = Number(recipientRow.bank !== undefined ? recipientRow.bank : (recipState.bank || 0));
        const newRecipBank = recipBank + netAmt;
        recipState.bank = newRecipBank;
        recipState.netWorth = Math.max(0, Number(recipientRow.net_worth !== undefined ? recipientRow.net_worth : (recipState.netWorth || 0)) + netAmt);
        recipState.adminModifiedTimestamp = lockTs;

        // Persist DB updates and logs
        await Promise.all([
          dbService.savePlayerState(cleanSender, sState),
          dbService.savePlayerState(cleanRecipient, recipState),
          dbService.resilientFetch('/rest/v1/transfers', {
            method: 'POST',
            body: JSON.stringify({ sender: cleanSender, recipient: cleanRecipient, amount: amt, created_at: nowMs })
          }).catch(e => fastify.log.warn(`[WireTransfer] transfers log notice: ${e.message}`)),
          dbService.resilientFetch('/rest/v1/mailbox', {
            method: 'POST',
            body: JSON.stringify({
              sender: cleanSender,
              recipient: cleanRecipient,
              type: 'transfer_received',
              payload: {
                title: 'حوالة بنكية واردة 💸',
                amount: netAmt,
                gross_amount: amt,
                tax_amount: taxAmt,
                tax_percent: 5,
                message: `تم استلام حوالة مالية بقيمة ${netAmt.toLocaleString('ar-EG')} EGP (بعد خصم ضريبة التحويل المصرفي 5%: ${taxAmt.toLocaleString('ar-EG')} EGP) من اللاعب "${cleanSender}".`
              },
              status: 'unread',
              created_at: nowMs
            })
          }).catch(e => fastify.log.warn(`[WireTransfer] mailbox notice: ${e.message}`))
        ]);

        sessionManager.deductSenderWireTransfer(cleanSender, amt, lockTs);
        sessionManager.creditRecipientWireTransfer(cleanRecipient, netAmt, lockTs);
        sessionManager.forceSaveSession(cleanSender).catch(() => {});
        sessionManager.forceSaveSession(cleanRecipient).catch(() => {});

        return {
          success: true,
          sender: cleanSender,
          recipient: cleanRecipient,
          grossAmount: amt,
          taxAmount: taxAmt,
          amount: netAmt,
          newCash: newSenderCash,
          newBank: newSenderBank,
          newNetWorth: sState.netWorth
        };
      }

      // Synchronize in-memory RAM sessions
      const TAX_RATE = 0.05;
      const taxAmt = Math.floor(amt * TAX_RATE);
      const netAmt = amt - taxAmt;
      const lockTs = Date.now() + 120000;

      sessionManager.deductSenderWireTransfer(cleanSender, amt, lockTs);
      sessionManager.creditRecipientWireTransfer(cleanRecipient, netAmt, lockTs);

      // Force save state for both participants
      sessionManager.forceSaveSession(cleanSender).catch(() => {});
      sessionManager.forceSaveSession(cleanRecipient).catch(() => {});

      // Retrieve fresh sender state for client response
      const updatedSenderState = senderSession.state || {};

      return {
        success: true,
        sender: cleanSender,
        recipient: cleanRecipient,
        grossAmount: amt,
        taxAmount: taxAmt,
        amount: netAmt,
        newCash: updatedSenderState.cash !== undefined ? updatedSenderState.cash : null,
        newBank: updatedSenderState.bank !== undefined ? updatedSenderState.bank : null,
        newNetWorth: updatedSenderState.netWorth !== undefined ? updatedSenderState.netWorth : null
      };
    } catch (err) {
      console.error('[Action wire-transfer Error]', err);
      return reply.code(500).send({ success: false, error: 'حدث خطأ غير متوقع أثناء إتمام التحويل: ' + err.message });
    }
  });

  // 14. POST /api/action/transfer-notify (Wire Transfer Notification to in-memory active session - Max 15/min)
  fastify.post('/api/action/transfer-notify', {
    config: {
      rateLimit: {
        max: 15,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const { sender, recipient, amount, netAmount } = request.body || {};
    if (!recipient || !amount) {
      return reply.code(400).send({ error: 'recipient and amount are required' });
    }

    const amt = Number(amount);
    if (amt <= 0) {
      return reply.code(400).send({ error: 'amount must be positive' });
    }

    // Tax is 5% — recipient gets 95% (matches execute_wire_transfer SQL)
    const TAX_RATE = 0.05;
    const taxAmt = Math.floor(amt * TAX_RATE);
    // Use explicit netAmount if provided by caller, otherwise compute from tax rate
    const finalNet = (netAmount !== undefined && !isNaN(Number(netAmount)))
      ? Number(netAmount)
      : (amt - taxAmt);

    const now = Date.now();
    // SQL sets sender and recipient lock 120 seconds into the future to block stale flushes from overwriting;
    // mirror that here so both server sessions' adminModifiedTimestamp matches the DB value
    // and our lte filter allows subsequent flushes to succeed.
    const senderLockTs = now + 120000;

    let senderDeducted = false;
    if (sender) {
      senderDeducted = sessionManager.deductSenderWireTransfer(sender, amt, senderLockTs);
    }

    const credited = sessionManager.creditRecipientWireTransfer(recipient, finalNet, senderLockTs);

    // Immediately persist recipient's updated balance to DB so a concurrent stale flush
    // cannot overwrite the incoming transfer before the next background write-behind cycle.
    if (credited) {
      sessionManager.forceSaveSession(recipient).catch(err => {
        console.warn('[transfer-notify] forceSave for recipient failed:', err.message);
      });
    }

    return {
      success: true,
      sender: sender || null,
      senderDeducted,
      recipient,
      grossAmount: amt,
      taxAmount: taxAmt,
      amount: finalNet,
      inMemorySessionCredited: credited
    };
  });

  // 15. POST /api/action/transfer-request (Authoritative proxy for peer-to-peer transfer requests - Max 15/min)
  fastify.post('/api/action/transfer-request', {
    config: {
      rateLimit: {
        max: 15,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const { sender, recipient, amount } = request.body || {};
    if (!sender || !recipient || !amount) {
      return reply.code(400).send({ error: 'sender, recipient and amount are required' });
    }

    const amt = Number(amount);
    if (amt <= 0) {
      return reply.code(400).send({ error: 'amount must be positive' });
    }

    const sKey = config.SUPABASE_SERVICE_ROLE_KEY;
    const sUrl = config.SUPABASE_URL;

    try {
      const now = Date.now();
      const insertRes = await dbService.resilientFetch('/rest/v1/transfer_requests', {
        method: 'POST',
        headers: {
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          sender: String(sender).trim(),
          recipient: String(recipient).trim(),
          amount: amt,
          status: 'pending',
          created_at: now
        })
      });

      if (!insertRes.ok) {
        throw new Error(`Failed to create transfer request: ${await insertRes.text()}`);
      }

      const rows = await insertRes.json();
      const createdReq = rows && rows[0];

      // Send interactive mail notification to recipient
      await dbService.resilientFetch('/rest/v1/mailbox', {
        method: 'POST',
        body: JSON.stringify({
          sender: String(sender).trim(),
          recipient: String(recipient).trim(),
          type: 'transfer_request',
          payload: {
            requestId: createdReq ? createdReq.id : null,
            amount: amt,
            title: 'طلب تحويل أموال',
            message: `يطلب منك اللاعب "${String(sender).trim()}" تحويل مبلغ ${amt.toLocaleString()} EGP.`
          },
          status: 'unread',
          created_at: now
        })
      }).catch(() => {});

      return {
        success: true,
        request: createdReq
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to create transfer request: ' + err.message });
    }
  });

  // 15.5 POST /api/action/transfer-request/respond (Authoritative response to peer transfer request - Max 20/min)
  fastify.post('/api/action/transfer-request/respond', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const { requestId, recipient, action } = request.body || {};
    if (!requestId || !recipient || !action) {
      return reply.code(400).send({ success: false, error: 'requestId, recipient and action are required' });
    }

    const cleanReqId = String(requestId).trim();
    const cleanRecipient = String(recipient).trim();
    const cleanAction = String(action).trim().toLowerCase(); // 'accepted' or 'rejected'

    if (cleanAction !== 'accepted' && cleanAction !== 'rejected') {
      return reply.code(400).send({ success: false, error: 'action must be accepted or rejected' });
    }

    try {
      // 1. Fetch the request authoritatively
      const getRes = await dbService.resilientFetch(`/rest/v1/transfer_requests?id=eq.${encodeURIComponent(cleanReqId)}`);
      if (!getRes.ok) {
        return reply.code(400).send({ success: false, error: 'تعذر العثور على طلب التحويل.' });
      }
      const rows = await getRes.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'طلب التحويل غير موجود أو تم حذفه.' });
      }
      const req = rows[0];

      if (req.recipient.toLowerCase() !== cleanRecipient.toLowerCase()) {
        return reply.code(403).send({ success: false, error: 'غير مصرح لك بالرد على هذا الطلب.' });
      }

      if (req.status !== 'pending') {
        return reply.code(400).send({ success: false, error: 'هذا الطلب تم الرد عليه مسبقاً.' });
      }

      // 2. Update transfer_requests record status
      await dbService.resilientFetch(`/rest/v1/transfer_requests?id=eq.${encodeURIComponent(cleanReqId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: cleanAction })
      }).catch(e => fastify.log.warn(`[TransferRequestRespond] update notice: ${e.message}`));

      // 3. Update matching notification in mailbox
      await dbService.resilientFetch(`/rest/v1/mailbox?recipient=eq.${encodeURIComponent(cleanRecipient)}&type=eq.transfer_request`, {
        method: 'PATCH',
        body: JSON.stringify({ status: cleanAction })
      }).catch(() => {});

      return {
        success: true,
        action: cleanAction,
        requestId: cleanReqId
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ success: false, error: 'فشل معالجة طلب التحويل: ' + err.message });
    }
  });

  // 12. POST /api/action/submit-topup (Authoritative Topup Submission)
  fastify.post('/api/action/submit-topup', async (request, reply) => {
    const { username, packageId, packageName, price, rewards, senderPhoneOrName, receiptNumber } = request.body || {};
    if (!username || !packageId || price === undefined) {
      return reply.code(400).send({ error: 'Missing required topup parameters' });
    }

    const sKey = config.SUPABASE_SERVICE_ROLE_KEY;
    const sUrl = config.SUPABASE_URL;
    const ts = Date.now();

    const newRequest = {
      id: 'req_' + ts + '_' + Math.random().toString(36).substring(2, 7),
      username: String(username).trim(),
      packageId: String(packageId).trim(),
      packageName: String(packageName || '').trim(),
      price: Number(price) || 0,
      rewards: rewards || {},
      senderPhoneOrName: String(senderPhoneOrName || '').trim(),
      receiptNumber: String(receiptNumber || '').trim(),
      status: 'pending',
      createdAt: ts,
      reviewedAt: null,
      reviewerNote: ''
    };

    try {
      // 1. Fetch current topup requests via service_role
      const getRes = await dbService.resilientFetch('/rest/v1/globals?id=eq.topup_requests');
      let currentRequests = [];
      if (getRes.ok) {
        const rows = await getRes.json();
        if (rows && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.requests)) {
          currentRequests = rows[0].data.requests;
        }
      }

      currentRequests.unshift(newRequest);
      if (currentRequests.length > 300) {
        currentRequests = currentRequests.slice(0, 300);
      }

      const saveRes = await dbService.resilientFetch('/rest/v1/globals', {
        method: 'POST',
        headers: {
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: 'topup_requests',
          data: { requests: currentRequests, updatedAt: ts },
          updated_at: ts
        })
      });

      if (!saveRes.ok) {
        throw new Error(`Failed to save topup request: ${await saveRes.text()}`);
      }

      return { success: true, request: newRequest };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to submit topup request: ' + err.message });
    }
  });

  // 17. POST /api/action/upload-avatar (Secure Profile Picture Upload with Magic Bytes Validation)
  const avatarUploadHandler = async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    const { imageBase64 } = request.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return reply.code(400).send({ error: 'لم يتم إرسال أي صورة (Base64 image is required).' });
    }

    // Guard against oversized raw string payloads (Max ~2.5MB base64)
    if (imageBase64.length > 2500000) {
      return reply.code(413).send({ error: 'حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 1.5 ميجابايت.' });
    }

    // Strip Data URL prefix if present (e.g. data:image/png;base64,...)
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '').trim();
    let imageBuffer;
    try {
      imageBuffer = Buffer.from(cleanBase64, 'base64');
    } catch (e) {
      return reply.code(400).send({ error: 'تنسيق ترميز الصورة غير صالح (Invalid Base64).' });
    }

    // Enforce size bounds (min 50 bytes, max 1.5MB binary)
    if (imageBuffer.length < 50 || imageBuffer.length > 1.5 * 1024 * 1024) {
      return reply.code(400).send({ error: 'حجم ملف الصورة غير صالح (يجب أن يكون بين 50 بايت و 1.5 ميجابايت).' });
    }

    // STRICT MAGIC BYTES / FILE SIGNATURE VALIDATION (Raster Images ONLY - Strictly NO SVG, HTML, or Executables)
    let ext = '';
    let mimeType = '';

    // Check PNG: 89 50 4E 47 0D 0A 1A 0A
    if (imageBuffer.length >= 8 &&
        imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47 &&
        imageBuffer[4] === 0x0D && imageBuffer[5] === 0x0A && imageBuffer[6] === 0x1A && imageBuffer[7] === 0x0A) {
      ext = '.png';
      mimeType = 'image/png';
    }
    // Check JPEG: FF D8 FF
    else if (imageBuffer.length >= 3 &&
             imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8 && imageBuffer[2] === 0xFF) {
      ext = '.jpg';
      mimeType = 'image/jpeg';
    }
    // Check WebP: RIFF .... WEBP
    else if (imageBuffer.length >= 12 &&
             imageBuffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
             imageBuffer.subarray(8, 12).toString('ascii') === 'WEBP') {
      ext = '.webp';
      mimeType = 'image/webp';
    }

    if (!ext || !mimeType) {
      return reply.code(400).send({
        error: 'صيغة الملف غير مدعومة لأسباب أمنية. يُسمح فقط بصور (WebP, PNG, JPEG) الحقيقية والمشفرة رقمياً.'
      });
    }

    // Secondary defense-in-depth inspection against embedded script injections
    const rawAsciiSample = imageBuffer.subarray(0, Math.min(imageBuffer.length, 4096)).toString('ascii').toLowerCase();
    if (rawAsciiSample.includes('<script') || rawAsciiSample.includes('<?php') || rawAsciiSample.includes('<svg') || rawAsciiSample.includes('javascript:')) {
      return reply.code(403).send({ error: 'تم رفض الملف لاحتوائه على وسوم برمجية غير آمنة.' });
    }

    // Safe File Storage
    if (!fs.existsSync(AVATARS_DIR)) {
      fs.mkdirSync(AVATARS_DIR, { recursive: true });
    }

    // Clean up any old avatar files for this user to avoid disk waste
    try {
      const sanitizedPrefix = 'avatar_' + encodeURIComponent(session.username).replace(/[^a-zA-Z0-9_-]/g, '_') + '_';
      const existingFiles = fs.readdirSync(AVATARS_DIR);
      existingFiles.forEach(f => {
        if (f.startsWith(sanitizedPrefix)) {
          try { fs.unlinkSync(path.join(AVATARS_DIR, f)); } catch (_) {}
        }
      });
    } catch (_) {}

    // Cryptographic unguessable filename
    const safeHash = crypto.createHash('sha256')
      .update(session.username + '_' + Date.now() + '_' + crypto.randomBytes(8).toString('hex'))
      .digest('hex')
      .substring(0, 16);
    const safeUsername = encodeURIComponent(session.username).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `avatar_${safeUsername}_${safeHash}${ext}`;
    const targetPath = path.join(AVATARS_DIR, filename);

    fs.writeFileSync(targetPath, imageBuffer);

    // Relative public URL
    const avatarUrl = `/api/avatars/${filename}`;

    // Update In-Memory Session & Dirty Queue
    session.state.avatarUrl = avatarUrl;
    sessionManager.markDirty(session.username);

    // Also persist immediately to Supabase
    try {
      const sUrl = config.SUPABASE_URL;
      const sKey = config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY;
      if (sUrl && sKey) {
        await fetch(`${sUrl}/rest/v1/players?username=eq.${encodeURIComponent(session.username)}`, {
          method: 'PATCH',
          headers: {
            'apikey': sKey,
            'Authorization': `Bearer ${sKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            state: session.state
          })
        });
      }
    } catch (e) {
      fastify.log.warn('[UploadAvatar] Supabase sync non-fatal warning: ' + e.message);
    }

    return {
      success: true,
      avatarUrl: avatarUrl,
      message: 'تم تحديث صورتك الشخصية بنجاح! '
    };
  };

  fastify.post('/api/action/upload-avatar', {
    config: {
      rateLimit: { max: 10, timeWindow: 60 * 1000 }
    }
  }, avatarUploadHandler);

  fastify.post('/api/upload-avatar', {
    config: {
      rateLimit: { max: 10, timeWindow: 60 * 1000 }
    }
  }, avatarUploadHandler);

  // 18. POST /api/action/remove-avatar (Remove custom avatar & reset to default)
  fastify.post('/api/action/remove-avatar', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    try {
      const sanitizedPrefix = 'avatar_' + encodeURIComponent(session.username).replace(/[^a-zA-Z0-9_-]/g, '_') + '_';
      if (fs.existsSync(AVATARS_DIR)) {
        const existingFiles = fs.readdirSync(AVATARS_DIR);
        existingFiles.forEach(f => {
          if (f.startsWith(sanitizedPrefix)) {
            try { fs.unlinkSync(path.join(AVATARS_DIR, f)); } catch (_) {}
          }
        });
      }
    } catch (_) {}

    session.state.avatarUrl = '';
    sessionManager.markDirty(session.username);

    try {
      const sUrl = config.SUPABASE_URL;
      const sKey = config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY;
      if (sUrl && sKey) {
        await fetch(`${sUrl}/rest/v1/players?username=eq.${encodeURIComponent(session.username)}`, {
          method: 'PATCH',
          headers: {
            'apikey': sKey,
            'Authorization': `Bearer ${sKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            state: session.state
          })
        });
      }
    } catch (e) {}

    return {
      success: true,
      message: 'تمت إزالة الصورة الشخصية والعودة للنمط الافتراضي.'
    };
  });

  const DEFAULT_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="avatarBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0b1329"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="20" fill="url(#avatarBgGrad)"/>
    <circle cx="50" cy="40" r="18" fill="#38bdf8" opacity="0.85"/>
    <path d="M 22 84 C 22 64, 36 60, 50 60 C 64 60, 78 64, 78 84 Z" fill="#38bdf8" opacity="0.85"/>
  </svg>`;

  // 19. GET /api/avatars/* (Ultra-secure static avatar stream with graceful 200 SVG fallback)
  const avatarServeHandler = async (request, reply) => {
    const rawParam = request.params.filename || request.params['*'] || '';
    const filename = path.basename(String(rawParam).trim());

    if (!filename || !/^avatar_[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp|svg)$/i.test(filename)) {
      reply.header('Content-Type', 'image/svg+xml');
      reply.header('Cache-Control', 'public, max-age=86400');
      return reply.code(200).send(DEFAULT_AVATAR_SVG);
    }

    const filePath = path.join(AVATARS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      reply.header('Content-Type', 'image/svg+xml');
      reply.header('Cache-Control', 'public, max-age=86400');
      return reply.code(200).send(DEFAULT_AVATAR_SVG);
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    const mimeType = mimeMap[ext] || 'application/octet-stream';

    reply.header('Content-Type', mimeType);
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Content-Security-Policy', "default-src 'none'; sandbox");
    reply.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    const stream = fs.createReadStream(filePath);
    return reply.send(stream);
  };

  fastify.get('/api/avatars/*', avatarServeHandler);
  fastify.get('/api/avatars/:filename', avatarServeHandler);
  fastify.get('/uploads/avatars/*', avatarServeHandler);
  fastify.get('/uploads/avatars/:filename', avatarServeHandler);

  // In-memory set to prevent duplicate telegram claims across memory cycles
  const claimedTelegramUsers = new Set();

  // 20. POST /api/action/claim-telegram (Claim Official Telegram Channel Reward - 50,000$ - Strictly ONCE per account)
  fastify.post('/api/action/claim-telegram', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;

    const uKey = String(session.username || '').trim().toLowerCase();
    const s = session.state;

    // Concurrency Mutex: Prevent parallel race-condition claims
    if (session._telegramClaimLock) {
      return reply.send({
        success: false,
        alreadyClaimed: true,
        message: 'طلب استلام المكافأة قيد المعالجة بالفعل...',
        cash: s.cash,
        netWorth: s.netWorth
      });
    }

    session._telegramClaimLock = true;

    try {
      // Guard Layer 1: In-Memory Global Set
      if (claimedTelegramUsers.has(uKey)) {
        s.telegramClaimed = true;
        s.telegramRewardClaimed = true;
        return reply.send({
          success: false,
          alreadyClaimed: true,
          message: 'تم استلام مكافأة التليجرام (50,000$) مسبقاً لهذا الحساب!',
          cash: s.cash,
          netWorth: s.netWorth
        });
      }

      // Guard Layer 2: In-Memory Session State & Badges
      const hasClaimedInSession = Boolean(
        s.telegramClaimed || 
        s.telegramRewardClaimed || 
        (Array.isArray(s.badges) && s.badges.includes('telegram'))
      );
      if (hasClaimedInSession) {
        claimedTelegramUsers.add(uKey);
        s.telegramClaimed = true;
        s.telegramRewardClaimed = true;
        return reply.send({
          success: false,
          alreadyClaimed: true,
          message: 'تم استلام مكافأة التليجرام (50,000$) مسبقاً لهذا الحساب!',
          cash: s.cash,
          netWorth: s.netWorth
        });
      }

      // Guard Layer 3: Authoritative Database Verification (Supabase)
      const dbService = require('../services/db-service');
      try {
        const dbRow = await dbService.getPlayerByUsername(session.username);
        if (dbRow) {
          const rawState = (typeof dbRow.state === 'object' && dbRow.state) ? dbRow.state : {};
          const hasClaimedInDb = Boolean(
            rawState.telegramClaimed || 
            rawState.telegramRewardClaimed || 
            (Array.isArray(rawState.badges) && rawState.badges.includes('telegram'))
          );
          if (hasClaimedInDb) {
            claimedTelegramUsers.add(uKey);
            s.telegramClaimed = true;
            s.telegramRewardClaimed = true;
            return reply.send({
              success: false,
              alreadyClaimed: true,
              message: 'تم استلام مكافأة التليجرام (50,000$) مسبقاً لهذا الحساب!',
              cash: s.cash,
              netWorth: s.netWorth
            });
          }
        }
      } catch (dbErr) {
        fastify.log.warn('[ActionRoutes] Supabase check warning: ' + dbErr.message);
      }

      // ── Award Reward Strictly ONCE ──
      const reward = 50000;
      s.cash = (Number(s.cash) || 0) + reward;
      s.telegramClaimed = true;
      s.telegramRewardClaimed = true;
      s.telegramClaimedAt = Date.now();
      s.telegramVerified = true;
      if (!Array.isArray(s.badges)) s.badges = [];
      if (!s.badges.includes('telegram')) s.badges.push('telegram');
      claimedTelegramUsers.add(uKey);

      s.netWorth = calculateNetWorth(s);
      s.title = getAppropriateTitle(s.netWorth, s.xp || 0);

      sessionManager.markDirty(session.username);

      // Authoritative immediate persistence to Supabase
      try {
        await dbService.savePlayerState(session.username, s);
      } catch (err) {
        fastify.log.warn('[ActionRoutes] Save telegram reward error: ' + err.message);
      }

      return reply.send({
        success: true,
        reward,
        cash: s.cash,
        netWorth: s.netWorth,
        title: s.title,
        message: ' تهانينا! استلمت مكافأة 50,000$ كاش لانضمامك لقناة التليجرام الرسمية!'
      });
    } finally {
      session._telegramClaimLock = false;
    }
  });

  // ── Authoritative Farm System Routes ──
  function finalizeFarmAction(session) {
    const s = session.state;
    s.netWorth = calculateNetWorth(s);
    s.title = getAppropriateTitle(s.netWorth, s.xp || 0);
    sessionManager.markDirty(session.username);
  }

  fastify.post('/api/action/farm/unlock', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    if (session.state.jailTimer > 0) return reply.code(400).send({ error: 'أنت في السجن! لا يمكنك استصلاح مزرعة الآن.' });
    try {
      const result = farmEngine.unlockFarm(session.state);
      finalizeFarmAction(session);
      return reply.send({ success: true, result, farm: session.state.farm, cash: session.state.cash, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/farm/upgrade-land', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    if (session.state.jailTimer > 0) return reply.code(400).send({ error: 'أنت في السجن!' });
    try {
      const result = farmEngine.upgradeFarmLand(session.state);
      finalizeFarmAction(session);
      return reply.send({ success: true, result, farm: session.state.farm, cash: session.state.cash, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/farm/upgrade-irrigation', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    if (session.state.jailTimer > 0) return reply.code(400).send({ error: 'أنت في السجن!' });
    try {
      const result = farmEngine.upgradeFarmIrrigation(session.state);
      finalizeFarmAction(session);
      return reply.send({ success: true, result, farm: session.state.farm, cash: session.state.cash, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/farm/upgrade-fertilizer', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    if (session.state.jailTimer > 0) return reply.code(400).send({ error: 'أنت في السجن!' });
    try {
      const result = farmEngine.upgradeFarmFertilizer(session.state);
      finalizeFarmAction(session);
      return reply.send({ success: true, result, farm: session.state.farm, cash: session.state.cash, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/farm/upgrade-silo', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    if (session.state.jailTimer > 0) return reply.code(400).send({ error: 'أنت في السجن!' });
    try {
      const result = farmEngine.upgradeFarmSilo(session.state);
      finalizeFarmAction(session);
      return reply.send({ success: true, result, farm: session.state.farm, cash: session.state.cash, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/farm/hire-worker', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    if (session.state.jailTimer > 0) return reply.code(400).send({ error: 'أنت في السجن!' });
    try {
      const result = farmEngine.hireFarmWorker(session.state);
      finalizeFarmAction(session);
      return reply.send({ success: true, result, farm: session.state.farm, cash: session.state.cash, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/farm/plant', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    if (session.state.jailTimer > 0) return reply.code(400).send({ error: 'أنت في السجن! لا يمكنك الزراعة الآن.' });
    const { plotIndex, cropId } = request.body || {};
    try {
      const result = farmEngine.plantFarmCrop(session.state, parseInt(plotIndex, 10), cropId, Date.now());
      finalizeFarmAction(session);
      return reply.send({ success: true, result, farm: session.state.farm, cash: session.state.cash, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/farm/plant-all', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    if (session.state.jailTimer > 0) return reply.code(400).send({ error: 'أنت في السجن! لا يمكنك الزراعة الآن.' });
    const { cropId } = request.body || {};
    try {
      const result = farmEngine.plantAllFarmPlots(session.state, cropId, Date.now());
      finalizeFarmAction(session);
      return reply.send({ success: true, result, farm: session.state.farm, cash: session.state.cash, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/farm/harvest', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { plotIndex } = request.body || {};
    try {
      const result = farmEngine.harvestFarmCrop(session.state, parseInt(plotIndex, 10), Date.now());
      finalizeFarmAction(session);
      return reply.send({ success: true, result, farm: session.state.farm, cash: session.state.cash, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/farm/harvest-all', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    try {
      const result = farmEngine.harvestAllFarmPlots(session.state, Date.now());
      finalizeFarmAction(session);
      return reply.send({ success: true, result, farm: session.state.farm, cash: session.state.cash, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/farm/sell', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { cropId, qty, clientInventory } = request.body || {};
    try {
      const result = farmEngine.sellFarmCrop(session.state, cropId, qty ? parseInt(qty, 10) : undefined, Date.now(), clientInventory);
      finalizeFarmAction(session);
      return reply.send({ success: true, result, farm: session.state.farm, cash: session.state.cash, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/farm/sell-all', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { clientInventory } = request.body || {};
    try {
      const result = farmEngine.sellAllFarmCrops(session.state, Date.now(), clientInventory);
      finalizeFarmAction(session);
      return reply.send({ success: true, result, farm: session.state.farm, cash: session.state.cash, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/farm/sell-processed', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { recipeId, qty, clientStorage } = request.body || {};
    try {
      const result = farmEngine.sellProcessedGood(session.state, recipeId, qty ? parseInt(qty, 10) : undefined, Date.now(), clientStorage);
      finalizeFarmAction(session);
      return reply.send({ success: true, result, farm: session.state.farm, cash: session.state.cash, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/farm/sell-livestock', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { produceKey, qty, clientProduce } = request.body || {};
    try {
      const result = farmEngine.sellLivestockProduce(session.state, produceKey, qty ? parseInt(qty, 10) : undefined, Date.now(), clientProduce);
      finalizeFarmAction(session);
      return reply.send({ success: true, result, farm: session.state.farm, cash: session.state.cash, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/farm/sell-all-processed', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { clientStorage } = request.body || {};
    try {
      const result = farmEngine.sellAllProcessedGoods(session.state, Date.now(), clientStorage);
      finalizeFarmAction(session);
      return reply.send({ success: true, result, farm: session.state.farm, cash: session.state.cash, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/farm/sell-all-livestock', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { clientProduce } = request.body || {};
    try {
      const result = farmEngine.sellAllLivestockProduce(session.state, Date.now(), clientProduce);
      finalizeFarmAction(session);
      return reply.send({ success: true, result, farm: session.state.farm, cash: session.state.cash, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/farm/fulfill-contract', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { contractId, contractData } = request.body || {};
    if (!contractId) {
      return reply.code(400).send({ error: 'مُعرف العقد مطلوب.' });
    }
    try {
      const result = farmEngine.fulfillFarmContract(session.state, contractId, contractData);
      finalizeFarmAction(session);
      return reply.send({
        success: true,
        result,
        farm: session.state.farm,
        cash: session.state.cash,
        bank: session.state.bank,
        netWorth: session.state.netWorth
      });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // ── Authoritative Income Vault & Real Estate / Vehicles (Phase 1) ──

  fastify.post('/api/action/claim-income', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    try {
      const res = incomeVaultEngine.processIncomeVault(session.state, Date.now(), true);
      sessionManager.markDirty(session.username);
      return reply.send({
        success: true,
        claimed: res.claimed,
        vault: res.vault,
        cash: session.state.cash,
        bank: session.state.bank,
        netWorth: session.state.netWorth,
        isManagerActive: res.isManagerActive
      });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/property/buy', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    if (session.state.jailTimer > 0) return reply.code(400).send({ error: 'أنت في السجن! لا يمكنك شراء عقارات.' });
    const { assetId } = request.body || {};
    try {
      const res = propertyCarEngine.buyProperty(session.state, assetId);
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, result: res, assets: session.state.assets, cash: session.state.cash, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/property/sell', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    if (session.state.jailTimer > 0) return reply.code(400).send({ error: 'أنت في السجن!' });
    const { assetId } = request.body || {};
    try {
      const res = propertyCarEngine.sellProperty(session.state, assetId);
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, result: res, assets: session.state.assets, cash: session.state.cash, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/car/buy', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    if (session.state.jailTimer > 0) return reply.code(400).send({ error: 'أنت في السجن!' });
    const { carId } = request.body || {};
    try {
      const res = propertyCarEngine.buyCar(session.state, carId);
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, result: res, ownedCars: session.state.ownedCars, cash: session.state.cash, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/car/sell', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    if (session.state.jailTimer > 0) return reply.code(400).send({ error: 'أنت في السجن!' });
    const { carId, carIndex } = request.body || {};
    try {
      const res = propertyCarEngine.sellCar(session.state, carId, carIndex !== undefined ? parseInt(carIndex, 10) : -1);
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, result: res, ownedCars: session.state.ownedCars, bank: session.state.bank, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/car/assign', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { carId } = request.body || {};
    try {
      const res = propertyCarEngine.setActiveCar(session.state, carId || null);
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, result: res, activeCar: session.state.activeCar, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/action/car/rent', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { carId, rentStatus, carIndex } = request.body || {};
    try {
      const res = propertyCarEngine.rentCar(session.state, carId, rentStatus, carIndex !== undefined ? parseInt(carIndex, 10) : -1);
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, result: res, rentStatus: res.rentStatus, ownedCars: session.state.ownedCars, netWorth: session.state.netWorth });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // ─── PHASE 2: STOCK EXCHANGE ENDPOINTS ───

  // GET /api/market/stocks (Synchronized market overview for all players)
  fastify.get('/api/market/stocks', async (request, reply) => {
    try {
      const overview = stockEngine.getMarketOverview(Date.now());
      return reply.send({ success: true, ...overview });
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // POST /api/action/stock/buy (Max 60 trades/min per user)
  fastify.post('/api/action/stock/buy', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    if (session.state.jailTimer > 0) return reply.code(400).send({ error: 'أنت في السجن!' });
    const { symbol, shares, price } = request.body || {};
    try {
      const res = stockEngine.buyStock(session.state, symbol, parseInt(shares, 10), Date.now(), price);
      session.lastServerBankActionAt = Date.now();
      session.lastServerCashSpendAt = Date.now();
      sessionManager.markDirty(session.username);
      return reply.send({
        success: true,
        result: res,
        stocks: session.state.stocks,
        cash: session.state.cash,
        netWorth: session.state.netWorth,
        dailyStockProfit: session.state.dailyStockProfit
      });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/stock/sell (Max 60 trades/min per user)
  fastify.post('/api/action/stock/sell', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    if (session.state.jailTimer > 0) return reply.code(400).send({ error: 'أنت في السجن!' });
    const { symbol, shares, price } = request.body || {};
    try {
      const res = stockEngine.sellStock(session.state, symbol, parseInt(shares, 10), Date.now(), price);
      session.lastServerBankActionAt = Date.now();
      sessionManager.markDirty(session.username);
      return reply.send({
        success: true,
        result: res,
        stocks: session.state.stocks,
        cash: session.state.cash,
        netWorth: session.state.netWorth,
        dailyStockProfit: session.state.dailyStockProfit
      });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/industry/unlock
  fastify.post('/api/action/industry/unlock', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { sectorId } = request.body || {};
    try {
      const res = industryEngine.unlockIndustrySector(session.state, sectorId);
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, ...res });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/industry/upgrade
  fastify.post('/api/action/industry/upgrade', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { sectorId, stageKey, multiplier = 1 } = request.body || {};
    try {
      const res = industryEngine.upgradeIndustryStage(session.state, sectorId, stageKey, multiplier);
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, ...res });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/trade/buy-cargo
  fastify.post('/api/action/trade/buy-cargo', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { commodityId, quantity = 1 } = request.body || {};
    try {
      const res = tradeEngine.buyImportCargo(session.state, commodityId, quantity, Date.now());
      await sessionManager.forceSaveSession(session.username);
      return reply.send({ success: true, ...res });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/trade/dismiss-import
  fastify.post('/api/action/trade/dismiss-import', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { orderId } = request.body || {};
    if (!orderId) {
      return reply.code(400).send({ error: 'orderId is required' });
    }
    const tc = session.state.tradeCompany;
    if (tc && Array.isArray(tc.activeImports)) {
      const idx = tc.activeImports.findIndex(imp => String(imp.id) === String(orderId));
      if (idx !== -1) {
        tc.activeImports.splice(idx, 1);
        sessionManager.markDirty(session.username);
        await sessionManager.forceSaveSession(session.username).catch(() => {});
        return reply.send({ success: true, orderId, remainingCount: tc.activeImports.length });
      }
    }
    return reply.send({ success: true, orderId, remainingCount: (tc && tc.activeImports) ? tc.activeImports.length : 0 });
  });

  // POST /api/action/trade/dismiss-all-arrived
  fastify.post('/api/action/trade/dismiss-all-arrived', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const tc = session.state.tradeCompany;
    if (tc && Array.isArray(tc.activeImports)) {
      const now = Date.now();
      tc.activeImports = tc.activeImports.filter(imp => !imp.arrived && now < Number(imp.arrivalTime || 0));
      sessionManager.markDirty(session.username);
      await sessionManager.forceSaveSession(session.username).catch(() => {});
      return reply.send({ success: true, remainingCount: tc.activeImports.length, activeImports: tc.activeImports });
    }
    return reply.send({ success: true, remainingCount: 0, activeImports: [] });
  });

  // POST /api/action/trade/upgrade-warehouse
  fastify.post('/api/action/trade/upgrade-warehouse', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    try {
      const res = tradeEngine.upgradeWarehouse(session.state);
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, ...res });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/trade/claim-export
  fastify.post('/api/action/trade/claim-export', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { exportId } = request.body || {};
    if (!exportId) {
      return reply.code(400).send({ error: 'exportId is required' });
    }
    try {
      const res = tradeEngine.claimExportProfit(session.state, exportId, Date.now());
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, ...res });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/investment/start
  fastify.post('/api/action/investment/start', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { planId, amount } = request.body || {};
    try {
      const res = investmentEngine.startInvestment(session.state, planId, amount, Date.now());
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, ...res });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/farm/buy-livestock
  fastify.post('/api/action/farm/buy-livestock', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { type, count = 1 } = request.body || {};
    try {
      const res = farmEngine.buyFarmLivestock(session.state, type, count);
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, ...res });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/store/buy-item
  fastify.post('/api/action/store/buy-item', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { itemId } = request.body || {};
    try {
      const res = storeEngine.buyStoreItem(session.state, itemId, Date.now());
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, ...res });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/black-market/buy-gear
  fastify.post('/api/action/black-market/buy-gear', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { gearId } = request.body || {};
    try {
      const res = storeEngine.buyBlackMarketGear(session.state, gearId, Date.now());
      await sessionManager.forceSaveSession(session.username);
      return reply.send({ success: true, ...res });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/black-market/deal
  fastify.post('/api/action/black-market/deal', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { dealId } = request.body || {};
    if (!dealId) {
      return reply.code(400).send({ error: 'dealId is required' });
    }
    try {
      const res = storeEngine.runBlackMarketDeal(session.state, dealId, Date.now());
      await sessionManager.forceSaveSession(session.username);
      return reply.send({ success: true, ...res });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/black-market/bribe
  fastify.post('/api/action/black-market/bribe', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    try {
      const res = storeEngine.bribePolice(session.state);
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, ...res });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/smuggling/buy-vehicle
  fastify.post('/api/action/smuggling/buy-vehicle', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { vehicleId } = request.body || {};
    try {
      const res = smugglingEngine.buySmugglingVehicle(session.state, vehicleId);
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, ...res });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/business/marketing
  fastify.post('/api/action/business/marketing', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { businessId } = request.body || {};
    try {
      const res = launchMarketingCampaign(session.state, businessId, Date.now());
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, ...res });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/business/franchise
  fastify.post('/api/action/business/franchise', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { businessId } = request.body || {};
    try {
      const res = convertToFranchise(session.state, businessId);
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, ...res });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/tax/file-declaration
  fastify.post('/api/action/tax/file-declaration', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    try {
      const res = fileTaxDeclaration(session.state);
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, ...res });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/casino/bet
  fastify.post('/api/action/casino/bet', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { betAmount, gameName } = request.body || {};
    try {
      const res = casinoEngine.deductCasinoBet(session.state, betAmount, gameName, Date.now());
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, ...res });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/action/casino/settle
  fastify.post('/api/action/casino/settle', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { betAmount, grossPayout, gameName } = request.body || {};
    try {
      const res = casinoEngine.settleCasinoPayout(session.state, betAmount, grossPayout, gameName, Date.now());
      sessionManager.markDirty(session.username);
      return reply.send({ success: true, ...res });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });
}

module.exports = actionRoutes;
