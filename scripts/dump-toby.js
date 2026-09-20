const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.Toby`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const [p] = await res.json();
  const s = p.state;
  console.log('--- TOBY FULL STATE ---');
  console.log('Net Worth in row:', p.net_worth);
  console.log('Cash:', s.cash);
  console.log('Bank:', s.bank);
  console.log('Businesses:', JSON.stringify(s.businesses));
  console.log('Real Estate:', JSON.stringify(s.realEstate || s.properties));
  console.log('Cars:', JSON.stringify(s.cars));
  console.log('Stocks:', JSON.stringify(s.stocks || s.portfolio));
  console.log('Farm:', JSON.stringify(s.farm));
  console.log('TradeCompany:', JSON.stringify(s.tradeCompany));
  console.log('Investments:', JSON.stringify(s.investments));
  console.log('Level:', s.level, 'XP:', s.xp, 'Title:', s.title);
}

run().catch(console.error);
