const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  // 1. Check Engineer_mo
  const res1 = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.engineer_mo`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const data1 = await res1.json();
  console.log('Engineer_mo found:', data1.length);
  if (data1.length > 0) {
    const p = data1[0];
    const s = p.state || {};
    console.log('Recipient:', p.username, 'NetWorth:', p.net_worth, 'Cash:', s.cash, 'Bank:', s.bank);
    console.log('transfersReceivedTotal:', s.transfersReceivedTotal);
    console.log('Recent 10 Activity Logs (Engineer_mo):');
    (s.activityLog || []).slice(-10).reverse().forEach(log => {
      console.log(`[${new Date(log.timestamp).toISOString()}] (${log.category}) ${log.action}: ${log.details}`);
    });
  }

  // 2. Check Tarek
  const res2 = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.tarek*`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const data2 = await res2.json();
  console.log('\nTarek players found:', data2.length);
  for (const p of data2) {
    const s = p.state || {};
    console.log('Sender:', p.username, 'NetWorth:', p.net_worth, 'Cash:', s.cash, 'Bank:', s.bank);
    console.log('Recent 10 Activity Logs (Sender):');
    (s.activityLog || []).slice(-10).reverse().forEach(log => {
      console.log(`[${new Date(log.timestamp).toISOString()}] (${log.category}) ${log.action}: ${log.details}`);
    });
  }

  // 3. Check transfers table if exists
  try {
    const res3 = await fetch(`${supabaseUrl}/rest/v1/transfers?order=created_at.desc&limit=10`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const data3 = await res3.json();
    console.log('\nTransfers table entries:', JSON.stringify(data3, null, 2));
  } catch (e) {
    console.log('Error checking transfers table:', e.message);
  }
}

run().catch(console.error);
