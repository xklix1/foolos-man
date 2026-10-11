/**
 * casino-engine.js
 * Authoritative Server Logic for Casino Bet Deductions & Winnings Settlements
 */

const { calculateNetWorth } = require('./net-worth-engine');

const MAX_CASINO_DAILY_PROFIT = 5000000;
const CASINO_HOUSE_RAKE = 0.03; // 3%

function getCairoTodayStr(serverNow = Date.now()) {
  const d = new Date(serverNow + (3 * 3600 * 1000));
  return d.toISOString().split('T')[0];
}

function ensureDailyCasinoTracking(state, serverNow = Date.now()) {
  const today = getCairoTodayStr(serverNow);
  if (!state.dailyCasino || typeof state.dailyCasino !== 'object' || state.dailyCasino.date !== today) {
    state.dailyCasino = {
      date: today,
      netProfit: 0,
      totalWagered: 0,
      roundsPlayed: 0
    };
  }
}

function deductCasinoBet(state, betAmount, gameName = 'الكازينو', serverNow = Date.now()) {
  if (state.jailTimer > 0) throw new Error("أنت مسجون! لا يمكنك المراهنة في صالة الكازينو.");

  const bet = Math.floor(Number(betAmount) || 0);
  if (bet <= 0 || isNaN(bet)) throw new Error("مبلغ الرهان غير صالح.");

  ensureDailyCasinoTracking(state, serverNow);

  if (state.dailyCasino.netProfit >= MAX_CASINO_DAILY_PROFIT) {
    throw new Error("وصلت للحد الأقصى لأرباح الكازينو اليومية (5,000,000 EGP). الكازينو مغلق بوجهك حتى الغد!");
  }

  const cash = Number(state.cash) || 0;
  if (cash < bet) {
    throw new Error(`رصيدك النقدي (${cash.toLocaleString()} EGP) لا يكفي لهذا الرهان.`);
  }

  state.cash -= bet;
  state.dailyCasino.totalWagered = (state.dailyCasino.totalWagered || 0) + bet;
  state.dailyCasino.roundsPlayed = (state.dailyCasino.roundsPlayed || 0) + 1;
  state.netWorth = calculateNetWorth(state);

  return {
    success: true,
    betAmount: bet,
    cash: state.cash,
    netWorth: state.netWorth
  };
}

function settleCasinoPayout(state, betAmount, grossPayout, gameName = 'الكازينو', serverNow = Date.now()) {
  const bet = Math.floor(Number(betAmount) || 0);
  const rawPayout = Math.floor(Number(grossPayout) || 0);

  ensureDailyCasinoTracking(state, serverNow);

  let finalPayout = rawPayout;
  let rakeDeducted = 0;

  if (rawPayout > bet) {
    const rawProfit = rawPayout - bet;
    rakeDeducted = Math.floor(rawProfit * CASINO_HOUSE_RAKE);
    finalPayout = rawPayout - rakeDeducted;
    const netProfit = finalPayout - bet;
    state.dailyCasino.netProfit = (state.dailyCasino.netProfit || 0) + netProfit;
  } else if (rawPayout < bet) {
    const loss = bet - rawPayout;
    state.dailyCasino.netProfit = (state.dailyCasino.netProfit || 0) - loss;
  }

  if (finalPayout > 0) {
    state.cash = (Number(state.cash) || 0) + finalPayout;
  }

  state.netWorth = calculateNetWorth(state);

  return {
    success: true,
    payout: finalPayout,
    rake: rakeDeducted,
    cash: state.cash,
    netWorth: state.netWorth,
    dailyProfit: state.dailyCasino.netProfit
  };
}

module.exports = {
  deductCasinoBet,
  settleCasinoPayout
};
