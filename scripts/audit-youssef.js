const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/players?or=(username.ilike.*youssef*,username.ilike.*yosef*,username.ilike.*sami*,username.ilike.*joe*)`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const data = await res.json();
  console.log('=== YOUSSEF / SAMI PLAYERS FOUND ===', data.length);
  data.forEach(p => {
    console.log('----------------------------------------------------');
    console.log('Username:', p.username, 'NetWorth:', p.net_worth, 'Cash:', p.cash, 'Bank:', p.bank, 'LastSeen:', new Date(p.last_seen).toISOString());
    const s = p.state || {};
    console.log('TradeCompany:', JSON.stringify(s.tradeCompany));
    console.log('Farm:', JSON.stringify(s.farm ? { landLevel: s.farm.landLevel, inventory: s.farm.inventory, processing: s.farm.processing?.storage } : {}));
    console.log('Investments:', JSON.stringify(s.investments));
    console.log('Recent 5 logs:');
    (s.activityLog || []).slice(-5).reverse().forEach(log => {
      console.log(`  [${new Date(log.timestamp).toISOString()}] (${log.category}) ${log.action}: ${log.details}`);
    });
  });
}

run().catch(console.error);
