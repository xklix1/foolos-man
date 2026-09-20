const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  // Search for Deeb / الديب
  const res = await fetch(`${supabaseUrl}/rest/v1/players?or=(username.ilike.*deeb*,username.ilike.*dib*,username.ilike.*ديب*)`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const deebs = await res.json();
  console.log('--- DEEB PLAYERS FOUND ---', deebs.length);
  deebs.forEach(p => {
    console.log('Username:', p.username, 'NetWorth:', p.net_worth, 'Cash:', p.cash, 'Bank:', p.bank, 'LastSeen:', new Date(p.last_seen).toISOString());
    const s = p.state || {};
    console.log('Investments count:', s.investments?.length);
    console.log('Recent 10 logs:');
    (s.activityLog || []).slice(-10).reverse().forEach(log => {
      console.log(`  [${new Date(log.timestamp).toISOString()}] (${log.category}) ${log.action}: ${log.details}`);
    });
  });

  // Also check MarkEshak
  const resMark = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.markeshak*`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const marks = await resMark.json();
  console.log('\n--- MARK ESHAK ---', marks.length);
  marks.forEach(p => {
    console.log('Username:', p.username, 'NetWorth:', p.net_worth, 'Cash:', p.cash, 'Bank:', p.bank, 'LastSeen:', new Date(p.last_seen).toISOString());
    const s = p.state || {};
    console.log('Investments count:', s.investments?.length, 'Investments:', JSON.stringify(s.investments));
    console.log('Recent 10 logs:');
    (s.activityLog || []).slice(-10).reverse().forEach(log => {
      console.log(`  [${new Date(log.timestamp).toISOString()}] (${log.category}) ${log.action}: ${log.details}`);
    });
  });
}

run().catch(console.error);
