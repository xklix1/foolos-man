const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function main() {
  console.log('Fetching N1 details from DB...');
  const res = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.N1`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const players = await res.json();
  console.log('Found players:', players);

  if (players && players.length > 0) {
    const p = players[0];
    console.log(`Targeting ID: ${p.id}, Username: ${p.username}`);

    // 1. Wipe and Permanently Ban N1
    const banRes = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.${p.username}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        is_admin: false,
        is_banned: true,
        cash: 0,
        bank: 0,
        gold: 0,
        net_worth: 0,
        state: {
          ...(p.state || {}),
          isAdmin: false,
          isBanned: true,
          banReason: 'محاولة اختراق وتوليد أموال غير مشروعة ومنح صلاحيات وهمية (Permanent Hardware & Account Ban)',
          cash: 0,
          bank: 0,
          gold: 0,
          netWorth: 0,
          businesses: {},
          inventory: {}
        },
        admin_modified_timestamp: Date.now()
      })
    });
    console.log('Ban response status:', banRes.status);

    // 2. Ban Device Hardware ID
    const devId = p.device_id || p.state?.initial_device || p.state?.known_devices?.[0];
    if (devId) {
      await fetch(`${supabaseUrl}/rest/v1/banned_devices`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          device_id: devId,
          username: p.username,
          reason: 'Exploit attempt (N1)',
          banned_at: new Date().toISOString()
        })
      });
      console.log(`Hardware Device ${devId} added to banned_devices.`);
    }
  }

  // 3. Re-clean Leaderboard
  console.log('Sanitizing Leaderboard...');
  const topRes = await fetch(`${supabaseUrl}/rest/v1/players?is_banned=neq.true&order=net_worth.desc&limit=50`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const cleanTop = await topRes.json();
  const lbData = cleanTop.filter(x => !x.is_banned && x.username !== 'N1' && x.username !== 'elabiad');

  await fetch(`${supabaseUrl}/rest/v1/globals`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      id: 'leaderboard',
      data: lbData,
      updated_at: Date.now()
    })
  });

  console.log('✅ N1 has been stripped of Admin status, banned, wiped, and removed from leaderboard.');
}

main().catch(console.error);
