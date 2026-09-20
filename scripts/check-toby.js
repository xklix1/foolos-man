const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.toby`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  console.log('Players found:', data.length);
  if (data.length > 0) {
    for (const p of data) {
      console.log('Player keys:', Object.keys(p));
      console.log('p.state exists?:', !!p.state, 'p.game_state exists?:', !!p.game_state, 'p.data exists?:', !!p.data);
      const state = p.state || p.game_state || p.data || p;
      console.log('Cash:', state.cash, 'Bank:', state.bank);
      console.log('TradeCompany:', JSON.stringify(state.tradeCompany, null, 2));
      console.log('Recent 20 Activity Logs:');
      (state.activityLog || []).slice(-20).reverse().forEach(log => {
        const d = new Date(log.timestamp);
        console.log(`[${d.toISOString()}] (${log.category}) ${log.action}: ${log.details}`);
      });
    }
  }

  // Also check if there's any other player with toby or makarios in name
  const res2 = await fetch(`${supabaseUrl}/rest/v1/players?or=(username.ilike.*toby*,username.ilike.*maged*,username.ilike.*makar*)`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const data2 = await res2.json();
  console.log('\n--- Similar Usernames ---');
  data2.forEach(u => console.log('Player:', u.username, 'NetWorth:', u.net_worth, 'LastSeen:', new Date(u.last_seen).toISOString()));

}

run().catch(console.error);
