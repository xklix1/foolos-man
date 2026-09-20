const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  // 1. Check ElpopEG
  const res1 = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.ElpopEG`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const [pop] = await res1.json();
  console.log('=== ELPOPEG ACCOUNT ===');
  console.log('Username:', pop?.username, 'NetWorth:', pop?.net_worth, 'Cash:', pop?.cash, 'Bank:', pop?.bank);
  console.log('Title:', pop?.title, 'Job:', pop?.job_id);
  console.log('Farm:', JSON.stringify(pop?.state?.farm, null, 2));
  console.log('Recent 15 logs:');
  (pop?.state?.activityLog || []).slice(-15).reverse().forEach(log => {
    console.log(`  [${new Date(log.timestamp).toISOString()}] (${log.category}) ${log.action}: ${log.details}`);
  });

  // 2. Search for Ahmed Ouda
  const res2 = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.*ahmed*ouda*`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const oudas = await res2.json();
  console.log('\n=== AHMED OUDA (ilike *ahmed*ouda*) ===', oudas.length);
  oudas.forEach(p => console.log(p.username, 'NetWorth:', p.net_worth, 'Cash:', p.cash, 'Bank:', p.bank, 'Job:', p.job_id));

  // If not found, search all players created today or recently seen
  const res3 = await fetch(`${supabaseUrl}/rest/v1/players?or=(username.ilike.*ahmed*,username.ilike.*ouda*)&order=last_seen.desc&limit=15`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const ahmeds = await res3.json();
  console.log('\n=== RECENT AHMED PLAYERS ===');
  ahmeds.forEach(p => console.log(p.username, 'NetWorth:', p.net_worth, 'Cash:', p.cash, 'Bank:', p.bank, 'Title:', p.title, 'Job:', p.job_id, 'LastSeen:', new Date(p.last_seen).toISOString()));
}

run().catch(console.error);
