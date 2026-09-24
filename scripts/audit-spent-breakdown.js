const db = require('../db.js');

async function auditSpentBreakdown() {
  const token = db._getAnonKey();
  const users = ['♫', 'ABDO_1', 'Emad', 'MarkEshak', 'MoOka Aziz', 'OSAMA', 'Osama.nasr'];

  console.log('=== DETAILED ASSET & SPEND BREAKDOWN ===\n');

  for (const u of users) {
    const res = await fetch(`https://rasalmal.online/rest/v1/players?username=ilike.${encodeURIComponent(u)}&select=*`, {
      headers: { 'apikey': token, 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) continue;
    const pl = await res.json();
    if (!pl || pl.length === 0) continue;
    const p = pl[0];
    const s = p.state || {};

    console.log(`=======================================================`);
    console.log(`👤 اللاعب: ${p.username}`);
    console.log(`💰 الأرصدة الحالية: كاش = ${Number(p.cash || 0).toLocaleString()} | بنك = ${Number(p.bank || 0).toLocaleString()} | صافي الثروة = ${Number(p.net_worth || 0).toLocaleString()}`);
    console.log(`⭐ الخبرة: ${p.xp} | الرتبة: ${p.title}`);

    // 1. Stocks
    const stocks = s.stocks || {};
    const stockDetails = [];
    for (const [sym, st] of Object.entries(stocks)) {
      if (st.shares > 0) {
        stockDetails.push(`${sym}: ${st.shares.toLocaleString()} سهم (متوسط السعر: ${Math.round(st.avgPrice || 0).toLocaleString()})`);
      }
    }
    console.log(`📈 محفظة الأسهم: ${stockDetails.length > 0 ? stockDetails.join(' | ') : 'لا توجد أسهم'}`);

    // 2. Real Estate / Assets
    const assets = s.assets || {};
    const assetDetails = [];
    for (const [k, count] of Object.entries(assets)) {
      if (count > 0) {
        assetDetails.push(`${k}: ${count}`);
      }
    }
    console.log(`🏢 العقارات والأصول: ${assetDetails.length > 0 ? assetDetails.join(' | ') : 'لا توجد عقارات'}`);

    // 3. Cars
    const cars = s.cars || {};
    const carDetails = [];
    for (const [k, c] of Object.entries(cars)) {
      const count = typeof c === 'number' ? c : (c.count || (c.level ? 1 : 0));
      if (count > 0) {
        carDetails.push(`${k}: ${count}`);
      }
    }
    console.log(`🚗 أسطول السيارات: ${carDetails.length > 0 ? carDetails.join(' | ') : 'لا توجد سيارات'}`);

    // 4. Industry / Supply Chain Factories
    const industry = s.industry || s.factories || {};
    const indDetails = [];
    for (const [secId, secData] of Object.entries(industry)) {
      if (secData.unlocked || (secData.stages && Object.keys(secData.stages).length > 0)) {
        const stageList = Object.entries(secData.stages || {}).map(([stId, stVal]) => `${stId}:Lv${stVal.level || stVal || 1}`).join(', ');
        indDetails.push(`${secId} (${stageList || 'مرخص'})`);
      }
    }
    console.log(`🏭 سلاسل الإمداد والمصانع: ${indDetails.length > 0 ? indDetails.join(' | ') : 'لا توجد مصانع'}`);

    // 5. Businesses & Workers
    const biz = s.businesses || {};
    const bizList = [];
    for (const [k, v] of Object.entries(biz)) {
      if ((v.level || 0) > 0) {
        bizList.push(`${k}: Lv${v.level} (عمال: ${v.workers || 0})`);
      }
    }
    console.log(`🏬 المشاريع والشركات: ${bizList.length > 0 ? bizList.join(' | ') : 'لا توجد مشاريع'}`);

    // 6. Outgoing Transfers
    const trRes = await fetch(`https://rasalmal.online/rest/v1/transfers?sender=ilike.${encodeURIComponent(u)}&select=recipient,amount,created_at`, {
      headers: { 'apikey': token, 'Authorization': 'Bearer ' + token }
    });
    if (trRes.ok) {
      const trs = await trRes.json();
      if (trs.length > 0) {
        console.log(`💸 الحوالات الصادرة منه (${trs.length} حوالة):`);
        for (const t of trs) {
          console.log(`   - أرسل إلى [${t.recipient}]: ${Number(t.amount).toLocaleString()} ج.م بتاريخ ${new Date(t.created_at).toLocaleString()}`);
        }
      } else {
        console.log(`💸 الحوالات الصادرة منه: لم يقم بإرسال حوالات`);
      }
    }
    console.log('\n');
  }
}

auditSpentBreakdown();
