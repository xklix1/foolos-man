const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.ALDEEB`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const [p] = await res.json();
  console.log('=== ALDEEB INVESTMENTS ===');
  console.log(p.state.investments);
  console.log('=== ALDEEB TRADE EXPORTS (locked money in transit) ===');
  console.log(p.state.tradeCompany?.activeExports);
  console.log('=== ALDEEB TRADE IMPORTS ===');
  console.log(p.state.tradeCompany?.activeImports);
  console.log('=== ALDEEB RECENT 15 ACTIVITY LOGS ===');
  (p.state.activityLog || []).slice(-15).reverse().forEach(log => {
    console.log(`[${new Date(log.timestamp).toISOString()}] (${log.category}) ${log.action}: ${log.details}`);
  });
}

run().catch(console.error);
