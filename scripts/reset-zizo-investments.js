const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const username = 'Zizo91';
  const res1 = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.${encodeURIComponent(username)}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const [player] = await res1.json();
  if (!player) {
    console.error('Player Zizo91 not found');
    return;
  }

  const nowTs = Date.now();
  const lockTs = nowTs + 1800000; // 30 min lock

  const state = player.state || {};
  state.dailyInvestments = {
    date: '2026-09-20',
    count: 0 // Reset to 0 so he has full 5 investments available!
  };
  state.adminModifiedTimestamp = lockTs;

  if (!state.activityLog) state.activityLog = [];
  state.activityLog.push({
    action: 'تصفير عداد الصناديق الاستثمارية 🔄',
    details: 'تم تصفير عداد الصناديق الاستثمارية لليوم (متاح 5/5 استثمارات بالكامل).',
    category: 'investment',
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
      admin_modified_timestamp: lockTs,
      state: state
    })
  });

  const updated = await res2.json();
  console.log('=== ZIZO91 UPDATE SUCCESS ===');
  console.log('Username:', updated[0]?.username);
  console.log('dailyInvestments:', updated[0]?.state?.dailyInvestments);
  console.log('admin_modified_timestamp:', updated[0]?.admin_modified_timestamp);
}

run().catch(console.error);
