const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.markeshak`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const [mark] = await res.json();
  const s = mark.state || {};
  console.log('--- MARK ESHAK FULL LOGS (Last 40) ---');
  (s.activityLog || []).slice(-40).reverse().forEach(log => {
    console.log(`[${new Date(log.timestamp).toISOString()}] (${log.category}) ${log.action}: ${log.details}`);
  });
}

run().catch(console.error);
