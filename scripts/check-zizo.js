const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.Zizo91`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const [p] = await res.json();
  console.log('=== ZIZO91 STATE ===');
  console.log('dailyInvestments:', p?.state?.dailyInvestments);
  console.log('investments active:', p?.state?.investments);
  console.log('admin_modified_timestamp:', p?.admin_modified_timestamp);
  console.log('state.adminModifiedTimestamp:', p?.state?.adminModifiedTimestamp);
  console.log('last_seen:', new Date(p?.last_seen).toISOString());
}

run().catch(console.error);
