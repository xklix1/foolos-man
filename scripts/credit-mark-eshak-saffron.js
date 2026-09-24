const db = require('../db.js');
const { calculateNetWorth } = require('../server/src/engine/net-worth-engine.js');

async function applyMarkSaffronCredit() {
  const token = db._getAnonKey();

  // 1. Fetch MarkEshak's profile
  const res = await fetch('https://rasalmal.online/rest/v1/players?username=ilike.MarkEshak&select=*', {
    headers: { 'apikey': token, 'Authorization': 'Bearer ' + token }
  });

  if (!res.ok) {
    console.error('Failed to fetch MarkEshak:', res.status);
    return;
  }

  const pl = await res.json();
  if (pl.length === 0) {
    console.error('MarkEshak not found');
    return;
  }

  const p = pl[0];
  const rawState = p.state || {};

  const fairCash = 9500000;
  const fairBank = 1000000;

  const cleanState = {
    ...rawState,
    username: 'MarkEshak',
    cash: fairCash,
    bank: fairBank,
    adminModifiedTimestamp: Date.now()
  };

  const finalNW = calculateNetWorth(cleanState);
  cleanState.netWorth = finalNW;

  let newTitle = 'عامل مبتدئ';
  if (finalNW >= 1000000000) newTitle = 'إمبراطور رأس المال';
  else if (finalNW >= 500000000) newTitle = 'قطب الأعمال العالمي';
  else if (finalNW >= 100000000) newTitle = 'حوت المال الدولي';
  else if (finalNW >= 50000000) newTitle = 'ملياردير عصامي';
  else if (finalNW >= 10000000) newTitle = 'مليونير فخم';
  else if (finalNW >= 1000000) newTitle = 'مستثمر طموح';
  else if (finalNW >= 100000) newTitle = 'رائد أعمال';

  cleanState.title = newTitle;

  // 2. Patch player row in database
  await fetch(`https://rasalmal.online/rest/v1/players?username=ilike.MarkEshak`, {
    method: 'PATCH',
    headers: {
      'apikey': token,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      cash: fairCash,
      bank: fairBank,
      net_worth: finalNW,
      title: newTitle,
      state: cleanState,
      admin_modified_timestamp: Date.now()
    })
  });

  console.log(`[Success] Updated MarkEshak: Cash = ${fairCash.toLocaleString()}, Bank = ${fairBank.toLocaleString()}, NetWorth = ${finalNW.toLocaleString()}`);

  // 3. Update leaderboard
  const lbRes = await fetch('https://rasalmal.online/rest/v1/players?select=*&is_banned=eq.false', {
    headers: { 'apikey': token, 'Authorization': 'Bearer ' + token }
  });
  if (lbRes.ok) {
    const allPlayers = await lbRes.json();
    const entries = allPlayers.map(pl => {
      const st = pl.state || {};
      const isMasterAdmin = ['khaled', 'خالد'].includes((pl.username || '').toLowerCase()) || pl.is_admin;
      return {
        username: pl.username,
        netWorth: calculateNetWorth(st),
        cash: Math.round(Number(pl.cash || st.cash || 0)),
        bank: Math.round(Number(pl.bank || st.bank || 0)),
        xp: pl.xp || st.xp || 0,
        title: pl.title || st.title || 'مستثمر صاعد',
        isAdmin: isMasterAdmin,
        lastSeen: pl.last_seen || Date.now()
      };
    });

    entries.sort((a, b) => b.netWorth - a.netWorth);
    const top100 = entries.slice(0, 100);

    await fetch('https://rasalmal.online/rest/v1/globals', {
      method: 'POST',
      headers: {
        'apikey': token,
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: 'leaderboard',
        data: top100,
        updated_at: Date.now()
      })
    });
    console.log('[Leaderboard] Successfully updated live Leaderboard with MarkEshak recredit.');
  }
}

applyMarkSaffronCredit();
