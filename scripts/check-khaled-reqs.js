const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function checkPending() {
  const gRes = await fetch(`${supabaseUrl}/rest/v1/globals?id=eq.topup_requests`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const gData = await gRes.json();
  const reqs = gData[0]?.data?.requests || [];
  console.log('--- ALL REQUESTS FOR "خالد" ---');
  const khaledReqs = reqs.filter(r => r.username === 'خالد');
  console.log(JSON.stringify(khaledReqs, null, 2));
}

checkPending();
