const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const r1 = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.mooka14`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const d1 = await r1.json();
  console.log('Old account "mooka14" exists?:', d1.length > 0);

  const r2 = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.MoOka%20Aziz`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const d2 = await r2.json();
  console.log('New account "MoOka Aziz" exists?:', d2.length > 0);
  if (d2.length > 0) {
    console.log('Username:', d2[0].username);
    console.log('Net Worth:', d2[0].net_worth);
    console.log('Cash:', d2[0].cash, 'Bank:', d2[0].bank);
  }
}

run().catch(console.error);
