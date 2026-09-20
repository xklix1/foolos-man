const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const username = 'Tarek';
  const res1 = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.${encodeURIComponent(username)}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const [p] = await res1.json();
  console.log('=== TAREK ACCOUNT DETAILS ===');
  console.log('Username:', p.username);
  console.log('is_banned:', p.is_banned);
  console.log('admin_modified_timestamp:', p.admin_modified_timestamp, new Date(p.admin_modified_timestamp).toISOString());
  console.log('last_seen:', p.last_seen, new Date(p.last_seen).toISOString());
  console.log('created_at:', p.created_at, new Date(p.created_at).toISOString());
  console.log('net_worth:', p.net_worth, 'cash:', p.cash, 'bank:', p.bank);
  console.log('state.isReset:', p.state?.isReset, 'state.resetTimestamp:', p.state?.resetTimestamp);
  console.log('state.banReason:', p.state?.banReason);
  console.log('state.isAdmin:', p.state?.isAdmin);
  console.log('state.businesses:', JSON.stringify(p.state?.businesses));
  console.log('state.farm:', JSON.stringify(p.state?.farm));
}

run().catch(console.error);
