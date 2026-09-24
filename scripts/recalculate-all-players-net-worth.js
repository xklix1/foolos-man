const db = require('../db.js');
const { calculateNetWorth } = require('../server/src/engine/net-worth-engine.js');

async function dryRunRecalculateAll() {
  const token = db._getAnonKey();
  const res = await fetch('https://rasalmal.online/rest/v1/players?select=*&order=net_worth.desc', {
    headers: { 'apikey': token, 'Authorization': 'Bearer ' + token }
  });

  if (!res.ok) {
    console.error('Failed to fetch players:', res.status);
    return;
  }

  const players = await res.json();
  console.log(`Scanning and recalculating all ${players.length} players...\n`);

  const topChanges = [];

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

  for (const p of players) {
    const u = (p.username || '').trim();
    const uLower = u.toLowerCase();
    const isMasterAdmin = ['khaled', 'خالد'].includes(uLower) || p.is_admin;
    const rawState = p.state || {};
    const beforeNW = Number(p.net_worth || 0);

    let cash = Number(p.cash || rawState.cash || 0);
    let bank = Number(p.bank || rawState.bank || 0);
    let stocks = rawState.stocks || {};
    let industry = rawState.industry || rawState.factories || {};
    let isBanned = p.is_banned === true;

    // Apply exploiter fix if applicable
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

    if (FAKE_ACCOUNTS_TO_BAN.includes(u)) {
      isBanned = true;
      cash = 0;
      bank = 0;
      stocks = {};
      industry = {};
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

    const newNW = calculateNetWorth(cleanState);

    // Calculate title
    let newTitle = 'عامل مبتدئ';
    if (newNW >= 1000000000) newTitle = 'إمبراطور رأس المال';
    else if (newNW >= 500000000) newTitle = 'قطب الأعمال العالمي';
    else if (newNW >= 100000000) newTitle = 'حوت المال الدولي';
    else if (newNW >= 50000000) newTitle = 'ملياردير عصامي';
    else if (newNW >= 10000000) newTitle = 'مليونير فخم';
    else if (newNW >= 1000000) newTitle = 'مستثمر طموح';
    else if (newNW >= 100000) newTitle = 'رائد أعمال';

    if (Math.abs(beforeNW - newNW) > 1000000 || EXPLOITERS_FIX[u] || FAKE_ACCOUNTS_TO_BAN.includes(u)) {
      topChanges.push({
        player: u,
        'قبل: ثروة': Math.round(beforeNW).toLocaleString(),
        'بعد: ثروة': Math.round(newNW).toLocaleString(),
        'الفرق': (Math.round(newNW - beforeNW)).toLocaleString(),
        'الرتبة الجديدة': newTitle,
        'ملاحظة': EXPLOITERS_FIX[u] ? 'تطهير ثغرة جهازين' : (FAKE_ACCOUNTS_TO_BAN.includes(u) ? 'حساب وهمي محظور' : 'تصحيح ثروة المصانع')
      });
    }
  }

  console.log(`Found ${topChanges.length} players with major corrections:\n`);
  console.table(topChanges.slice(0, 25));
}

dryRunRecalculateAll();
