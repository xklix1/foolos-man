const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/globals?id=eq.maintenance`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const data = await res.json();
  console.log('Current maintenance record in DB:', JSON.stringify(data, null, 2));

  // Turn maintenance OFF immediately!
  const patchRes = await fetch(`${supabaseUrl}/rest/v1/globals?id=eq.maintenance`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      data: {
        active: false,
        enabled: false,
        message: '',
        updated_at: Date.now()
      }
    })
  });
  const patchData = await patchRes.json();
  console.log('Disabled maintenance result:', JSON.stringify(patchData, null, 2));
}

run().catch(console.error);
