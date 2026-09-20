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
  const s = p.state || {};
  console.log('=== ALDEEB FULL AUDIT ===');
  console.log('Net Worth:', p.net_worth);
  console.log('Cash:', p.cash, 'Bank:', p.bank);
  console.log('Investments:', JSON.stringify(s.investments, null, 2));
  console.log('Farm:', JSON.stringify(s.farm, null, 2));
  console.log('Stocks:', JSON.stringify(s.stocks || s.portfolio, null, 2));
  console.log('Businesses:', JSON.stringify(s.businesses, null, 2));
  console.log('Active Loan:', JSON.stringify(s.activeLoan, null, 2));
  console.log('Cars:', JSON.stringify(s.cars, null, 2));
  console.log('Properties:', JSON.stringify(s.properties, null, 2));
  console.log('TradeCompany:', JSON.stringify(s.tradeCompany, null, 2));
}

run().catch(console.error);
