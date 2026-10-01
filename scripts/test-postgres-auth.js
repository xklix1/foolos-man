const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const serviceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function inspectPostgresAuth() {
  console.log('Testing direct RPC or query to see what PostgreSQL settings are when using service_role key...');
  
  // Let's test PATCH directly with serviceKey to see if it succeeds or throws
  const res = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.خالد`, {
    method: 'PATCH',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      admin_modified_timestamp: Date.now()
    })
  });

  console.log('Direct PATCH with serviceKey status:', res.status, res.statusText);
  console.log('Direct PATCH body:', await res.text());
}

inspectPostgresAuth();
