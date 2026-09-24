const db = require('../db.js');
const { calculateNetWorth } = require('../server/src/engine/net-worth-engine.js');

const BIZ_CONFIG = {
  kiosk: { name: 'كشك حلوى وجرائد', baseProfit: 15, payrollPerWorker: 12 },
  coffee: { name: 'كافيه ومقهى راقي', baseProfit: 85, payrollPerWorker: 30 },
  tech: { name: 'شركة برمجيات وتطبيقات', baseProfit: 450, payrollPerWorker: 110 },
  logistics: { name: 'شركة شحن ونقل لوجستي', baseProfit: 1800, payrollPerWorker: 320 },
  supermarket: { name: 'سوبر ماركت وهايبر تجاري', baseProfit: 6500, payrollPerWorker: 850 },
  media_studio: { name: 'استوديو إنتاج وإعلام', baseProfit: 16000, payrollPerWorker: 1800 },
  solar_factory: { name: 'مصنع ألواح طاقة شمسية', baseProfit: 45000, payrollPerWorker: 4500 },
  private_hospital: { name: 'مستشفى استثماري خاص', baseProfit: 120000, payrollPerWorker: 11000 },
  real_estate_corp: 'شركة تطوير عقاري كبرى',
  commercial_bank: 'بنك تجاري خاص',
  oil_refinery: 'مصفاة وتكرير بترول',
  aviation_airline: 'شركة خطوط طيران دولية',
  ev_factory: 'مصنع سيارات كهربائية'
};

async function getDetailedReport() {
  const token = db._getAnonKey();
  const res = await fetch('https://rasalmal.online/rest/v1/players?select=username,is_admin,is_banned,cash,bank,net_worth,state,last_seen', {
    headers: { 'apikey': token, 'Authorization': 'Bearer ' + token }
  });

  const players = await res.json();

  const businessStats = players.map(p => {
    const st = p.state || {};
    const businesses = st.businesses || {};
    
    let ownedCount = 0;
    let totalLevels = 0;
    let totalWorkers = 0;
    let totalEstimatedHourlyProfit = 0;
    const bizDetails = [];

    Object.keys(businesses).forEach(bizId => {
      const b = businesses[bizId];
      if (!b) return;
      const level = Number(b.level || 0);
      const workers = Number(b.workers || 0);
      const isFranchise = Boolean(b.isFranchise);
      const suppliesHours = Number(b.suppliesHours || b.supplies || 0);

      if (level > 0 || workers > 0) {
        ownedCount++;
        totalLevels += level;
        totalWorkers += workers;

        const cfg = BIZ_CONFIG[bizId] || { name: bizId, baseProfit: 50, payrollPerWorker: 20 };
        const bName = typeof cfg === 'string' ? cfg : cfg.name;
        const bProfit = (typeof cfg === 'object' && cfg.baseProfit) ? cfg.baseProfit : 50;
        const pWorker = (typeof cfg === 'object' && cfg.payrollPerWorker) ? cfg.payrollPerWorker : 20;

        // Approx profit calculation per tick (every 3 sec = 1200 ticks/hour)
        const franMulti = isFranchise ? 1.5 : 1.0;
        const tickGross = (bProfit * level + (workers * (bProfit * 0.75))) * franMulti;
        const tickPayroll = workers * (pWorker * 0.1);
        const tickNet = Math.max(0, tickGross - tickPayroll);
        const hourlyNet = Math.round(tickNet * 1200);

        totalEstimatedHourlyProfit += hourlyNet;

        bizDetails.push({
          id: bizId,
          name: bName,
          level,
          workers,
          isFranchise,
          suppliesHours: Math.round(suppliesHours * 10) / 10,
          hourlyEstNet: hourlyNet
        });
      }
    });

    return {
      username: p.username,
      isAdmin: p.is_admin || ['khaled', 'خالد'].includes((p.username || '').toLowerCase()),
      isBanned: p.is_banned,
      netWorth: p.net_worth || calculateNetWorth(st),
      cash: Math.round(Number(p.cash || st.cash || 0)),
      bank: Math.round(Number(p.bank || st.bank || 0)),
      afkManagerExpiresAt: st.afkManagerExpiresAt || 0,
      ownedCount,
      totalLevels,
      totalWorkers,
      totalEstimatedHourlyProfit,
      farmUnlocked: Boolean(st.farm && st.farm.unlocked),
      farmPlots: (st.farm && st.farm.maxPlots) || 0,
      farmLandLvl: (st.farm && st.farm.landLevel) || 1,
      carsCount: Array.isArray(st.cars) ? st.cars.length : (st.cars ? Object.keys(st.cars).length : 0),
      assetsCount: Array.isArray(st.assets) ? st.assets.length : (st.assets ? Object.keys(st.assets).length : 0),
      lastSeen: p.last_seen || 0,
      businesses: bizDetails
    };
  });

  const legit = businessStats.filter(p => !p.isAdmin && !p.isBanned);

  legit.sort((a, b) => {
    if (b.totalLevels !== a.totalLevels) return b.totalLevels - a.totalLevels;
    if (b.ownedCount !== a.ownedCount) return b.ownedCount - a.ownedCount;
    return b.totalWorkers - a.totalWorkers;
  });

  console.log(JSON.stringify(legit.slice(0, 10)));
}

getDetailedReport();
