const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function banTarget(username, reason) {
  console.log(`Processing ban for ${username}...`);
  const res = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.${username}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const players = await res.json();
  if (players && players.length > 0) {
    const p = players[0];
    const devId = p.device_id || p.state?.initial_device || p.state?.known_devices?.[0];

    // Wipe and Ban
    await fetch(`${supabaseUrl}/rest/v1/players?username=eq.${username}`, {
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
          banReason: reason,
          cash: 0,
          bank: 0,
          gold: 0,
          netWorth: 0
        },
        admin_modified_timestamp: Date.now()
      })
    });
    console.log(` Player ${username} banned & wiped.`);

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
          reason: reason,
          banned_at: new Date().toISOString()
        })
      });
      console.log(` Device ${devId} permanently banned.`);
    }
  }
}

async function main() {
  await banTarget('elabiadd', 'حساب فرعي تابع للمخترق elabiad (نفس الجهاز وبصمة الـ PIN)');
  await banTarget('Z2', 'حساب فرعي تابع للمخترق elabiad (نفس بصمة الـ PIN المشفر)');
  await banTarget('Goldanmax', 'حساب فرعي مشبوه مرتبط بنفس النشاط والتوقيت');

  // Update Leaderboard
  const topRes = await fetch(`${supabaseUrl}/rest/v1/players?is_banned=neq.true&order=net_worth.desc&limit=50`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const cleanTop = await topRes.json();
  const lbData = cleanTop.filter(x => !x.is_banned && !['elabiad', 'elabiadd', 'N1', 'Z2', 'Goldanmax'].includes(x.username));

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
  console.log(' Leaderboard re-sanitized successfully.');
}

main().catch(console.error);
