const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/mailbox?recipient=ilike.engineer_mo&order=created_at.desc`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const mails = await res.json();
  console.log('Engineer_mo mailbox messages:', JSON.stringify(mails, null, 2));
}

run().catch(console.error);
