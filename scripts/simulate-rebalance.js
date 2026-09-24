const db = require('../db.js');
const { calculateNetWorth } = require('../server/src/engine/net-worth-engine.js');

async function simulateFix() {
  const token = db._getAnonKey();
  const users = ['♫', 'ABDO_1', 'Emad', 'MarkEshak', 'MoOka Aziz', 'OSAMA', 'Osama.nasr'];
  const comparison = [];

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

    // Realistic legitimate liquid balance: ~4 hours cash on hand + 12 hours bank savings
    const fairCash = Math.min(beforeCash, Math.max(30000, Math.round(hourlyIncome * 3)));
    const fairBank = Math.min(beforeBank, Math.max(50000, Math.round(hourlyIncome * 8)));

    const cleanState = {
      ...rawState,
      cash: fairCash,
      bank: fairBank,
      adminModifiedTimestamp: Date.now()
    };

    const afterNetWorth = calculateNetWorth(cleanState);

    comparison.push({
      'اللاعب': p.username,
      'قبل: كاش': Math.round(beforeCash).toLocaleString(),
      'قبل: بنك': Math.round(beforeBank).toLocaleString(),
      'قبل: ثروة': Math.round(beforeNetWorth).toLocaleString(),
      'بعد: كاش': Math.round(fairCash).toLocaleString(),
      'بعد: بنك': Math.round(fairBank).toLocaleString(),
      'بعد: ثروة': Math.round(afterNetWorth).toLocaleString(),
      'مستوى المشاريع': Object.values(biz).reduce((acc, b) => acc + (b.level || 0), 0)
    });
  }

  console.table(comparison);
}

simulateFix();
