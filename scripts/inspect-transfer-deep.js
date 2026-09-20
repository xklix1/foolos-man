const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const res1 = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.engineer_mo`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const [mo] = await res1.json();
  console.log('--- ENGINEER_MO ---');
  console.log('username:', mo.username);
  console.log('top-level bank column:', mo.bank);
  console.log('top-level cash column:', mo.cash);
  console.log('top-level net_worth:', mo.net_worth);
  console.log('state.bank:', mo.state?.bank);
  console.log('state.cash:', mo.state?.cash);
  console.log('state.netWorth:', mo.state?.netWorth);
  console.log('adminModifiedTimestamp:', mo.admin_modified_timestamp, 'state adminModifiedTimestamp:', mo.state?.adminModifiedTimestamp);

  const res2 = await fetch(`${supabaseUrl}/rest/v1/player_mail?recipient=eq.${encodeURIComponent(mo.username)}&order=created_at.desc`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const mails = await res2.json();
  console.log('Mails for Engineer_mo:', JSON.stringify(mails, null, 2));

  // Also check Tarek
  const res3 = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.Tarek`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const tareks = await res3.json();
  console.log('\n--- TAREK ---');
  if (tareks.length > 0) {
    const t = tareks[0];
    console.log('username:', t.username, 'bank col:', t.bank, 'cash col:', t.cash, 'state bank:', t.state?.bank, 'state cash:', t.state?.cash);
  }
}

run().catch(console.error);
