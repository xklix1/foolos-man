const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.*youssef*`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const data = await res.json();
  console.log('Total Youssef matches:', data.length);
  data.forEach(p => {
    console.log('Username:', p.username, 'NetWorth:', p.net_worth, 'Cash:', p.cash, 'Bank:', p.bank, 'LastSeen:', new Date(p.last_seen).toISOString());
  });

  // Also check if there's any player named "Sami" or "Youssef Sami"
  const res2 = await fetch(`${supabaseUrl}/rest/v1/players?or=(username.ilike.*sami*,username.ilike.*sammy*)`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const data2 = await res2.json();
  console.log('\nTotal Sami matches:', data2.length);
  data2.forEach(p => {
    console.log('Username:', p.username, 'NetWorth:', p.net_worth, 'Cash:', p.cash, 'Bank:', p.bank, 'LastSeen:', new Date(p.last_seen).toISOString());
  });
}

run().catch(console.error);
