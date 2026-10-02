const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const anonKey = envFile.match(/SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
const serviceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function testPatch() {
  console.log('Testing with ANON KEY:');
  const res = await fetch(`${supabaseUrl}/rest/v1/mailbox?id=eq.ff1133a5-900f-4221-b043-e61f9a5fc60d`, {
    method: 'PATCH',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ status: 'read' })
  });
  console.log('ANON PATCH Status:', res.status, 'Body:', await res.text());
}
testPatch();
