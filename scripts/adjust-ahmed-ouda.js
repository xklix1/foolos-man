const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const username = 'Ahmed Ouda';
  const res1 = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.${encodeURIComponent(username)}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const [player] = await res1.json();
  if (!player) {
    console.error('Player Ahmed Ouda not found');
    return;
  }

  const currentBank = Number(player.bank || 0);
  const newBank = currentBank + 60000;
  const currentNetWorth = Number(player.net_worth || 0);
  const newNetWorth = currentNetWorth + 60000 + 75000;
  const nowTs = Date.now();
  const lockTs = nowTs + 600000;

  const state = player.state || {};
  state.bank = newBank;
  state.netWorth = newNetWorth;
  state.jobId = 'director';
  state.adminModifiedTimestamp = lockTs;
  if (!state.businesses) state.businesses = {};
  if (!state.businesses.tech) state.businesses.tech = { level: 1, price: 75, workers: 0, suppliesTicks: 3600 };
  else state.businesses.tech.level = Math.max(1, state.businesses.tech.level || 1);

  if (!state.activityLog) state.activityLog = [];
  state.activityLog.push({
    action: 'تثبيت وترقية إدارية 💼',
    details: `تم ترقية وظيفتك إلى "مدير تنفيذي"، وتأسيس شركة البرمجيات، وإيداع 60,000 EGP في حسابك البنكي.`,
    category: 'system',
    timestamp: nowTs
  });

  const res2 = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.${encodeURIComponent(username)}`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      bank: newBank,
      job_id: 'director',
      net_worth: newNetWorth,
      admin_modified_timestamp: lockTs,
      state: state
    })
  });

  const updated = await res2.json();
  console.log('Update success for Ahmed Ouda:');
  console.log('Username:', updated[0]?.username);
  console.log('Bank:', updated[0]?.bank);
  console.log('Job:', updated[0]?.job_id);
  console.log('Net Worth:', updated[0]?.net_worth);
}

run().catch(console.error);
