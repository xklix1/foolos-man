const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function checkReq() {
  const gRes = await fetch(`${supabaseUrl}/rest/v1/globals?id=eq.topup_requests`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const gData = await gRes.json();
  const reqs = gData[0]?.data?.requests || [];
  const targetReq = reqs.find(r => r.id === 'req_1790894553472_58ytp');
  console.log('--- TARGET TOPUP REQUEST DETAILS ---');
  console.log(JSON.stringify(targetReq, null, 2));
}

checkReq();
