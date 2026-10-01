const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const anonKey = envFile.match(/SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
const serviceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function runSmallAmountsPentest() {
  console.log('--- TESTING SMALL AMOUNT INCREMENTS DIRECTLY VIA ANON ---');
  const target = 'Z2';

  // Get current state
  const getRes = await fetch(supabaseUrl + '/rest/v1/players?username=eq.' + target, {
    headers: { 'apikey': serviceKey, 'Authorization': 'Bearer ' + serviceKey }
  });
  const data = await getRes.json();
  const p = data[0];
  console.log('Current Z2 balance: Cash =', p.cash, 'Bank =', p.bank, 'Gold =', p.gold);

  // Test 1: +1 Gold (Smallest possible gold unit)
  console.log('\n1. Attempting +1 Gold injection via anon...');
  const r1 = await fetch(supabaseUrl + '/rest/v1/players?username=eq.' + target, {
    method: 'PATCH',
    headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ gold: Number(p.gold || 0) + 1 })
  });
  console.log('Result 1 (+1 Gold):', r1.status, (await r1.text()).slice(0, 80));

  // Test 2: +10,000 EGP Cash
  console.log('\n2. Attempting small +10,000 Cash injection via anon...');
  const r2 = await fetch(supabaseUrl + '/rest/v1/players?username=eq.' + target, {
    method: 'PATCH',
    headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ cash: Number(p.cash || 0) + 10000 })
  });
  console.log('Result 2 (+10k cash):', r2.status, r2.statusText);

  // Test 3: +100,000 EGP Bank
  console.log('\n3. Attempting +100,000 Bank injection via anon...');
  const r3 = await fetch(supabaseUrl + '/rest/v1/players?username=eq.' + target, {
    method: 'PATCH',
    headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bank: Number(p.bank || 0) + 100000 })
  });
  console.log('Result 3 (+100k bank):', r3.status, r3.statusText);
}

runSmallAmountsPentest().catch(console.error);
