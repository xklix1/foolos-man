const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  // 1. Find Ehap / ElpopEG
  const res1 = await fetch(`${supabaseUrl}/rest/v1/players?or=(username.ilike.*ehap*,username.ilike.*elpop*)`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const ehaps = await res1.json();
  console.log('=== EHAP / ELPOPEG ===');
  ehaps.forEach(p => {
    console.log('Username:', p.username, 'NetWorth:', p.net_worth, 'Cash:', p.cash, 'Bank:', p.bank);
    const s = p.state || {};
    console.log('Title:', s.title, 'Job:', s.jobId, 'Farm:', JSON.stringify(s.farm));
    console.log('Recent 10 logs:');
    (s.activityLog || []).slice(-10).reverse().forEach(log => {
      console.log(`  [${new Date(log.timestamp).toISOString()}] (${log.category}) ${log.action}: ${log.details}`);
    });
  });

  // 2. Find Ahmed Ouda
  const res2 = await fetch(`${supabaseUrl}/rest/v1/players?or=(username.ilike.*ouda*,username.ilike.*ahmed_ouda*)`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const oudas = await res2.json();
  console.log('\n=== AHMED OUDA ===');
  oudas.forEach(p => {
    console.log('Username:', p.username, 'NetWorth:', p.net_worth, 'Cash:', p.cash, 'Bank:', p.bank);
    const s = p.state || {};
    console.log('Title:', s.title, 'Job:', s.jobId, 'Businesses:', JSON.stringify(s.businesses));
    console.log('Recent 10 logs:');
    (s.activityLog || []).slice(-10).reverse().forEach(log => {
      console.log(`  [${new Date(log.timestamp).toISOString()}] (${log.category}) ${log.action}: ${log.details}`);
    });
  });
}

run().catch(console.error);
