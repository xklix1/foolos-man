const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const username = 'Lola-Khaled';
  const res1 = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.${encodeURIComponent(username)}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const [lola] = await res1.json();
  const s = lola.state || {};
  console.log('--- LOLA ACTIVITY LOGS ---');
  (s.activityLog || []).slice(-15).reverse().forEach(log => {
    console.log(`[${new Date(log.timestamp).toISOString()}] (${log.category}) ${log.action}: ${log.details}`);
  });

  const res2 = await fetch(`${supabaseUrl}/rest/v1/mailbox?recipient=eq.${encodeURIComponent(username)}&order=created_at.desc&limit=10`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const mails = await res2.json();
  console.log('\n--- LOLA MAILS ---');
  mails.forEach(m => console.log(`[${new Date(m.created_at).toISOString()}] From: ${m.sender} Type: ${m.type} Status: ${m.status} Payload:`, m.payload));
}

run().catch(console.error);
