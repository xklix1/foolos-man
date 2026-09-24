const db = require('../db.js');

const BIZ_NAMES = {
  kiosk: 'كشك حلوى وجرائد',
  coffee: 'كافيه راقي',
  tech: 'شركة برمجيات',
  logistics: 'شركة شحن ونقل',
  supermarket: 'سوبر ماركت',
  solar_factory: 'مصنع طاقة شمسية',
  private_hospital: 'مستشفى خاص',
  real_estate_corp: 'تطوير عقاري',
  commercial_bank: 'بنك تجاري',
  oil_refinery: 'مصفاة بترول',
  aviation_airline: 'شركة طيران',
  ev_factory: 'مصنع سيارات'
};

async function getTopBusinessOwners() {
  const token = db._getAnonKey();
  const res = await fetch('https://rasalmal.online/rest/v1/players?select=username,is_admin,is_banned,cash,bank,net_worth,state', {
    headers: { 'apikey': token, 'Authorization': 'Bearer ' + token }
  });

  const players = await res.json();

  const businessStats = players.map(p => {
    const st = p.state || {};
    const businesses = st.businesses || {};
    
    let ownedCount = 0;
    let totalLevels = 0;
    let totalWorkers = 0;
    const bizList = [];

    Object.keys(businesses).forEach(bizId => {
      const b = businesses[bizId];
      if (!b) return;
      const level = Number(b.level || 0);
      const workers = Number(b.workers || 0);
      const isFranchise = Boolean(b.isFranchise);
      if (level > 0 || workers > 0) {
        ownedCount++;
        totalLevels += level;
        totalWorkers += workers;
        bizList.push({
          id: bizId,
          name: BIZ_NAMES[bizId] || bizId,
          level,
          workers,
          isFranchise
        });
      }
    });

    return {
      username: p.username,
      isAdmin: p.is_admin || ['khaled', 'خالد'].includes((p.username || '').toLowerCase()),
      isBanned: p.is_banned,
      netWorth: p.net_worth,
      cash: p.cash,
      bank: p.bank,
      ownedCount,
      totalLevels,
      totalWorkers,
      businesses: bizList
    };
  });

  const legit = businessStats.filter(p => !p.isAdmin && !p.isBanned);

  // Sort by totalLevels descending, then ownedCount, then totalWorkers
  legit.sort((a, b) => {
    if (b.totalLevels !== a.totalLevels) return b.totalLevels - a.totalLevels;
    if (b.ownedCount !== a.ownedCount) return b.ownedCount - a.ownedCount;
    return b.totalWorkers - a.totalWorkers;
  });

  console.log(JSON.stringify(legit.slice(0, 10)));
}

getTopBusinessOwners();
