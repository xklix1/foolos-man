const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const r1 = await fetch(`${supabaseUrl}/rest/v1/transfers?sender=eq.Tarek&recipient=eq.Lola-Khaled`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  console.log('Transfers from Tarek to Lola:', await r1.json());

  const r2 = await fetch(`${supabaseUrl}/rest/v1/mailbox?sender=eq.Tarek&recipient=eq.Lola-Khaled&type=eq.transfer_received`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  console.log('Mailbox transfer_received from Tarek to Lola:', await r2.json());
}

run().catch(console.error);
