/**
 * investment-engine.js
 * Authoritative Server Logic for Term Investments & Deposit Certificates
 */

const { INVESTMENTS } = require('./definitions');
const { calculateNetWorth } = require('./net-worth-engine');

function getCairoTodayStr(serverNow = Date.now()) {
  const d = new Date(serverNow + (3 * 3600 * 1000));
  return d.toISOString().split('T')[0];
}

function startInvestment(state, planId, amount, serverNow = Date.now()) {
  const plan = INVESTMENTS[planId];
  if (!plan) throw new Error("خطة الاستثمار غير موجودة.");

  if (!Array.isArray(state.investments)) state.investments = [];

  // 1. Limit check: maximum 2 concurrent active investments
  if (state.investments.length >= 2) {
    throw new Error("لا يمكنك فتح أكثر من استثمارين مقفلين في نفس الوقت. انتظر حتى يكتمل أحدهما.");
  }

  // 2. Daily limit check: maximum 5 investments per day
  const today = getCairoTodayStr(serverNow);
  if (!state.dailyInvestments || state.dailyInvestments.date !== today) {
    state.dailyInvestments = { date: today, count: 0 };
  }
  if (state.dailyInvestments.count >= 5) {
    throw new Error("وصلت إلى الحد الأقصى اليومي للاستثمارات (5 استثمارات اليوم). تتجدد الحصة غداً.");
  }

  // 3. Prevent duplicate active fund
  const alreadyActive = state.investments.find(inv => inv.id === plan.id);
  if (alreadyActive) {
    throw new Error(`أنت تستثمر بالفعل في "${plan.name}". لا يمكنك تكرار نفس الصندوق حتى تصفية عوائده.`);
  }

  const amt = Math.floor(Number(amount) || 0);
  if (amt < plan.minAmount) {
    throw new Error(`الحد الأدنى للاستثمار في "${plan.name}" هو ${plan.minAmount.toLocaleString()} جنيه.`);
  }
  if (plan.maxAmount && amt > plan.maxAmount) {
    throw new Error(`الحد الأقصى للإيداع في "${plan.name}" هو ${plan.maxAmount.toLocaleString()} جنيه.`);
  }

  const cash = Number(state.cash) || 0;
  if (cash < amt) {
    throw new Error(`رصيدك النقدي ${cash.toLocaleString()} EGP لا يكفي لاستثمار ${amt.toLocaleString()} EGP.`);
  }

  state.cash -= amt;

  const investmentEntry = {
    id: plan.id,
    name: plan.name,
    investedAmount: amt,
    ticksRemaining: plan.durationTicks,
    totalDuration: plan.durationTicks,
    createdAt: serverNow,
    maturesAt: serverNow + (plan.durationTicks * 1000),
    rate: plan.rate
  };

  state.investments.push(investmentEntry);
  state.dailyInvestments.count++;
  state.netWorth = calculateNetWorth(state);

  return {
    success: true,
    investment: investmentEntry,
    investedAmount: amt,
    cash: state.cash,
    netWorth: state.netWorth,
    investments: state.investments
  };
}

module.exports = {
  startInvestment
};
