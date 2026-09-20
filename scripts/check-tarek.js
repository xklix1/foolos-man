const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/mailbox?sender=eq.Tarek&order=created_at.desc&limit=20`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const mails = await res.json();
  console.log('Mails sent by Tarek:', JSON.stringify(mails, null, 2));

  // Also check transfers table for Tarek
  const res2 = await fetch(`${supabaseUrl}/rest/v1/transfers?sender=eq.Tarek&order=created_at.desc&limit=10`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const tr = await res2.json();
  console.log('Transfers from Tarek:', JSON.stringify(tr, null, 2));
}

run().catch(console.error);
