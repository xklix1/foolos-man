const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function inspectAll() {
  const gRes = await fetch(`${supabaseUrl}/rest/v1/globals?id=eq.topup_requests`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const gData = await gRes.json();
  const reqs = gData[0]?.data?.requests || [];
  console.log('Total reqs count:', reqs.length);
  
  // Sort by createdAt descending
  const sorted = [...reqs].sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  console.log('Newest 5 requests overall:');
  sorted.slice(0, 5).forEach(r => {
    console.log(`- [${new Date(r.createdAt).toISOString()}] ID: ${r.id}, User: "${r.username}", Pkg: ${r.packageName}, Status: ${r.status}, ReviewedAt: ${r.reviewedAt}`);
  });

  const pending = reqs.filter(r => r.status === 'pending');
  console.log('\nPending requests:', pending.length);
  pending.forEach(r => {
    console.log(`- ID: ${r.id}, User: "${r.username}", Pkg: ${r.packageName}`);
  });
}

inspectAll();
