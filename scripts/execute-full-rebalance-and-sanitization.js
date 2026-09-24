const db = require('../db.js');
const { calculateNetWorth } = require('../server/src/engine/net-worth-engine.js');

async function executeFullRebalance() {
  console.log('🚀 Starting Full Database Rebalance and Sanitization Execution...\n');
  const token = db._getAnonKey();

  // 1. Fetch all players
  const res = await fetch('https://rasalmal.online/rest/v1/players?select=*', {
    headers: { 'apikey': token, 'Authorization': 'Bearer ' + token }
  });

  if (!res.ok) {
    console.error('Failed to fetch players:', res.status);
    return;
  }

  const players = await res.json();
  console.log(`Loaded ${players.length} player records from database.\n`);

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

  const updatedPlayers = [];
  const leaderboardEntries = [];

  for (const p of players) {
    const u = (p.username || '').trim();
    const uLower = u.toLowerCase();
    const isMasterAdmin = ['khaled', 'خالد'].includes(uLower) || p.is_admin === true;
    const rawState = p.state || {};

    let cash = Number(p.cash !== null && p.cash !== undefined ? p.cash : (rawState.cash || 0));
    let bank = Number(p.bank !== null && p.bank !== undefined ? p.bank : (rawState.bank || 0));
    let dirtyCash = Number(p.dirty_cash || rawState.dirtyCash || 0);
    let xp = Number(p.xp || rawState.xp || 0);
    let stocks = rawState.stocks || {};
    let industry = rawState.industry || rawState.factories || {};
    let isBanned = p.is_banned === true;

    // Apply exploiter balance sanitization
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
      console.log(`[Sanitize] Applied exploiter balance reset for: ${u}`);
    }

    // Apply bans for fake burner accounts
    if (FAKE_ACCOUNTS_TO_BAN.includes(u)) {
      isBanned = true;
      cash = 0;
      bank = 0;
      dirtyCash = 0;
      stocks = {};
      industry = {};
      console.log(`[Ban] Banned fake multi-account: ${u}`);
    }

    const cleanState = {
      ...rawState,
      username: u,
      cash,
      bank,
      dirtyCash,
      xp,
      stocks,
      industry,
      factories: industry,
      isAdmin: isMasterAdmin,
      isBanned,
      adminModifiedTimestamp: Date.now()
    };

    const finalNetWorth = isBanned ? 0 : calculateNetWorth(cleanState);
    cleanState.netWorth = finalNetWorth;

    let newTitle = 'عامل مبتدئ';
    if (finalNetWorth >= 1000000000) newTitle = 'إمبراطور رأس المال';
    else if (finalNetWorth >= 500000000) newTitle = 'قطب الأعمال العالمي';
    else if (finalNetWorth >= 100000000) newTitle = 'حوت المال الدولي';
    else if (finalNetWorth >= 50000000) newTitle = 'ملياردير عصامي';
    else if (finalNetWorth >= 10000000) newTitle = 'مليونير فخم';
    else if (finalNetWorth >= 1000000) newTitle = 'مستثمر طموح';
    else if (finalNetWorth >= 100000) newTitle = 'رائد أعمال';

    cleanState.title = newTitle;

    // Save to update list
    updatedPlayers.push({
      username: u,
      cash,
      bank,
      dirty_cash: dirtyCash,
      net_worth: finalNetWorth,
      xp,
      title: newTitle,
      is_banned: isBanned,
      state: cleanState,
      admin_modified_timestamp: Date.now()
    });

    if (!isBanned) {
      leaderboardEntries.push({
        username: u,
        netWorth: finalNetWorth,
        cash: Math.round(cash),
        bank: Math.round(bank),
        xp,
        title: newTitle,
        isAdmin: isMasterAdmin,
        lastSeen: p.last_seen || Date.now()
      });
    }
  }

  // 2. Perform Batch Updates to Supabase players table
  console.log('\nWriting updated player states to database in chunks...');
  const CHUNK_SIZE = 20;
  for (let i = 0; i < updatedPlayers.length; i += CHUNK_SIZE) {
    const chunk = updatedPlayers.slice(i, i + CHUNK_SIZE);
    for (const player of chunk) {
      try {
        await fetch(`https://rasalmal.online/rest/v1/players?username=ilike.${encodeURIComponent(player.username)}`, {
          method: 'PATCH',
          headers: {
            'apikey': token,
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            cash: player.cash,
            bank: player.bank,
            dirty_cash: player.dirty_cash,
            net_worth: player.net_worth,
            title: player.title,
            is_banned: player.is_banned,
            state: player.state,
            admin_modified_timestamp: player.admin_modified_timestamp
          })
        });
      } catch (err) {
        console.warn(`Failed to update ${player.username}:`, err.message);
      }
    }
    console.log(`Saved ${Math.min(i + CHUNK_SIZE, updatedPlayers.length)} / ${updatedPlayers.length} players`);
  }

  // 3. Build & Save Official Leaderboard
  leaderboardEntries.sort((a, b) => b.netWorth - a.netWorth);
  const finalLeaderboard = leaderboardEntries.slice(0, 100);

  console.log('\nSaving official unified Leaderboard to database (globals.leaderboard)...');
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
      data: finalLeaderboard,
      updated_at: Date.now()
    })
  });

  console.log('\n========================================================================');
  console.log('✅ REBALANCE COMPLETE! OFFICIAL TOP 10 LEADERBOARD LIVE:');
  console.log('========================================================================\n');

  console.table(finalLeaderboard.slice(0, 10).map((p, idx) => ({
    'المركز': `#${idx + 1}`,
    'اسم اللاعب': p.username + (p.isAdmin ? ' 🛡️' : ''),
    'صافي الثروة': Math.round(p.netWorth).toLocaleString() + ' ج.م',
    'الرتبة': p.title,
    'نقاط الخبرة XP': p.xp.toLocaleString()
  })));
}

executeFullRebalance();
