const db = require('../db.js');
const { calculateNetWorth } = require('../server/src/engine/net-worth-engine.js');

async function simulateFinalState() {
  const token = db._getAnonKey();
  const users = ['♫', 'ABDO_1', 'Emad', 'MarkEshak', 'MoOka Aziz', 'OSAMA', 'Osama.nasr'];

  const results = [];

  for (const u of users) {
    const res = await fetch(`https://rasalmal.online/rest/v1/players?username=ilike.${encodeURIComponent(u)}&select=*`, {
      headers: { 'apikey': token, 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) continue;
    const pl = await res.json();
    if (!pl || pl.length === 0) continue;
    const p = pl[0];
    const rawState = p.state || {};

    const beforeCash = Number(p.cash || 0);
    const beforeBank = Number(p.bank || 0);
    const beforeNetWorth = Number(p.net_worth || 0);

    // 1. Calculate realistic legitimate liquid balance based on their business hourly profit
    const biz = rawState.businesses || {};
    let hourlyIncome = 0;
    const bizHourlyMap = {
      kiosk: 300, coffee: 1200, supermarket: 4500, logistics: 15000,
      tech: 50000, solar_factory: 120000, media_studio: 300000,
      private_hospital: 800000, private_bank: 2000000, oil_refinery: 5000000, space_tech: 15000000
    };

    for (const [k, v] of Object.entries(biz)) {
      const lvl = Number(v.level || 0);
      const base = bizHourlyMap[k] || 1000;
      hourlyIncome += (base * lvl);
    }

    const fairCash = Math.min(beforeCash, Math.max(30000, Math.round(hourlyIncome * 3)));
    const fairBank = Math.min(beforeBank, Math.max(50000, Math.round(hourlyIncome * 8)));

    // 2. Clear illicit stocks
    const cleanStocks = {
      COMI: { shares: 0, avgPrice: 0 },
      EAST: { shares: 0, avgPrice: 0 },
      ETEL: { shares: 0, avgPrice: 0 },
      FWRY: { shares: 0, avgPrice: 0 },
      CASH: { shares: 0, avgPrice: 0 },
      BITC: { shares: 0, avgPrice: 0 },
      GOLD: { shares: 0, avgPrice: 0 },
      AIX: { shares: 0, avgPrice: 0 }
    };

    // 3. Remove illicit high-tier factories (keep base legitimate sectors like food/auto if low level)
    const cleanIndustry = {};

    // 4. Construct final clean state
    const cleanState = {
      ...rawState,
      cash: fairCash,
      bank: fairBank,
      stocks: cleanStocks,
      industry: cleanIndustry,
      factories: cleanIndustry,
      adminModifiedTimestamp: Date.now()
    };

    const finalNetWorth = calculateNetWorth(cleanState);

    // Calculate ranking title based on legitimate net worth
    let newTitle = 'عامل مبتدئ';
    if (finalNetWorth >= 1000000000) newTitle = 'إمبراطور رأس المال';
    else if (finalNetWorth >= 500000000) newTitle = 'قطب الأعمال العالمي';
    else if (finalNetWorth >= 100000000) newTitle = 'حوت المال الدولي';
    else if (finalNetWorth >= 50000000) newTitle = 'ملياردير عصامي';
    else if (finalNetWorth >= 10000000) newTitle = 'مليونير فخم';
    else if (finalNetWorth >= 1000000) newTitle = 'مستثمر طموح';
    else if (finalNetWorth >= 100000) newTitle = 'رائد أعمال';

    results.push({
      'اسم اللاعب': p.username,
      'الكاش النهائي': Math.round(fairCash).toLocaleString() + ' ج.م',
      'البنك النهائي': Math.round(fairBank).toLocaleString() + ' ج.م',
      'الثروة قبل التطهير': Math.round(beforeNetWorth).toLocaleString() + ' ج.م',
      'الثروة النهائية الشرعية': Math.round(finalNetWorth).toLocaleString() + ' ج.م',
      'المشاريع المحفوظة': Object.entries(biz).filter(([_, v]) => (v.level || 0) > 0).map(([k, v]) => `${k}(L${v.level})`).join(', '),
      'الرتبة المستحقة': newTitle
    });
  }

  console.table(results);
}

simulateFinalState();
