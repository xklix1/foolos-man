const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.batmat&select=username,pin,is_banned,cash,bank,net_worth`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const data = await res.json();
  console.log('Batmat player:', JSON.stringify(data, null, 2));

  const res2 = await fetch(`${supabaseUrl}/rest/v1/mailbox?recipient=ilike.batmat&order=created_at.desc&limit=5`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const mails = await res2.json();
  console.log('Batmat mails:', JSON.stringify(mails, null, 2));

  const res3 = await fetch(`${supabaseUrl}/rest/v1/banned_devices`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const bans = await res3.json();
  console.log('Banned devices in DB:', JSON.stringify(bans, null, 2));
}
run().catch(console.error);
