const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const username = 'Youssef_moh';
  const res1 = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.${encodeURIComponent(username)}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const [p] = await res1.json();
  console.log('=== YOUSSEF_MOH FULL AUDIT ===');
  console.log('NetWorth:', p.net_worth, 'Cash:', p.cash, 'Bank:', p.bank);
  const s = p.state || {};
  console.log('TradeCompany:', JSON.stringify(s.tradeCompany, null, 2));
  console.log('Farm:', JSON.stringify(s.farm, null, 2));
  console.log('Stocks:', JSON.stringify(s.stocks));
  console.log('Investments:', JSON.stringify(s.investments));
  console.log('Recent 20 logs:');
  (s.activityLog || []).slice(-20).reverse().forEach(log => {
    console.log(`  [${new Date(log.timestamp).toISOString()}] (${log.category}) ${log.action}: ${log.details}`);
  });
}

run().catch(console.error);
