const db = require('../db.js');
const { calculateNetWorth } = require('../server/src/engine/net-worth-engine.js');

async function getTop10AfterFix() {
  const token = db._getAnonKey();
  const res = await fetch('https://rasalmal.online/rest/v1/players?select=*', {
    headers: { 'apikey': token, 'Authorization': 'Bearer ' + token }
  });

  if (!res.ok) {
    console.error('Failed to fetch:', res.status);
    return;
  }

  const players = await res.json();

  const EXPLOITERS_FIX = {
    '♫': { cash: 5947500, bank: 15860000, clearStocks: true, clearIndustry: true },
    'ABDO_1': { cash: 296034, bank: 3327200, clearStocks: true, clearIndustry: true },
    'Emad': { cash: 1305300, bank: 454193, clearStocks: true, clearIndustry: true },
    'MarkEshak': { cash: 1213500, bank: 244815, clearStocks: true, clearIndustry: true },
    'Osama.nasr': { cash: 0, bank: 4036000, clearStocks: true, clearIndustry: true },
    'OSAMA': { cash: 333046, bank: 1457300, clearStocks: true, clearIndustry: true },
    'MoOka Aziz': { cash: 181149, bank: 467715, clearStocks: true, clearIndustry: true }
  };

  const FAKE_ACCOUNTS_TO_BAN = ['ليه', 'ليه 1', 'mooka15', 'mooka16', 'temo', 'tem'];

  const leaderboardList = [];

  for (const p of players) {
    const u = (p.username || '').trim();
    const uLower = u.toLowerCase();
    const isMasterAdmin = ['khaled', 'خالد'].includes(uLower) || p.is_admin === true;

    // Filter out banned accounts and fake throwaways
    if (FAKE_ACCOUNTS_TO_BAN.includes(u) || p.is_banned === true) {
      continue;
    }

    const rawState = p.state || {};
    let cash = Number(p.cash || rawState.cash || 0);
    let bank = Number(p.bank || rawState.bank || 0);
    let stocks = rawState.stocks || {};
    let industry = rawState.industry || rawState.factories || {};

    if (EXPLOITERS_FIX[u]) {
      const fix = EXPLOITERS_FIX[u];
      cash = fix.cash;
      bank = fix.bank;
      if (fix.clearStocks) {
        stocks = {
          COMI: { shares: 0, avgPrice: 0 }, EAST: { shares: 0, avgPrice: 0 },
          ETEL: { shares: 0, avgPrice: 0 }, FWRY: { shares: 0, avgPrice: 0 },
          CASH: { shares: 0, avgPrice: 0 }, BITC: { shares: 0, avgPrice: 0 },
          GOLD: { shares: 0, avgPrice: 0 }, AIX: { shares: 0, avgPrice: 0 }
        };
      }
      if (fix.clearIndustry) {
        industry = {};
      }
    }

    const cleanState = {
      ...rawState,
      username: u,
      cash,
      bank,
      stocks,
      industry,
      factories: industry,
      isAdmin: isMasterAdmin
    };

    const finalNW = calculateNetWorth(cleanState);

    let newTitle = 'عامل مبتدئ';
    if (finalNW >= 1000000000) newTitle = 'إمبراطور رأس المال 👑';
    else if (finalNW >= 500000000) newTitle = 'قطب الأعمال العالمي 🌍';
    else if (finalNW >= 100000000) newTitle = 'حوت المال الدولي 🐋';
    else if (finalNW >= 50000000) newTitle = 'ملياردير عصامي 💎';
    else if (finalNW >= 10000000) newTitle = 'مليونير فخم 🎩';
    else if (finalNW >= 1000000) newTitle = 'مستثمر طموح 🚀';
    else if (finalNW >= 100000) newTitle = 'رائد أعمال 💼';

    leaderboardList.push({
      username: u,
      netWorth: finalNW,
      cash: Math.round(cash),
      bank: Math.round(bank),
      xp: p.xp || rawState.xp || 0,
      title: newTitle,
      isAdmin: isMasterAdmin
    });
  }

  // Sort descending by net worth
  leaderboardList.sort((a, b) => b.netWorth - a.netWorth);

  console.log('========================================================================');
  console.log('👑 الترتيب النهائي الجديد لعرش الأثرياء (TOP 10 LEADERBOARD) 👑');
  console.log('========================================================================\n');

  const top10 = leaderboardList.slice(0, 10).map((p, idx) => ({
    'المركز': `#${idx + 1}`,
    'اسم اللاعب': p.username + (p.isAdmin ? ' 🛡️' : ''),
    'صافي الثروة': Math.round(p.netWorth).toLocaleString() + ' ج.م',
    'الرتبة': p.title,
    'نقاط الخبرة XP': p.xp.toLocaleString()
  }));

  console.table(top10);
}

getTop10AfterFix();
