const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function resetAlkanzi() {
  const getRes = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.Alkanzi&select=username,state`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const data = await getRes.json();
  const player = data[0];
  if (!player) {
    console.log('Player not found');
    return;
  }

  const newState = { ...player.state };
  newState.dailyWork = {
    date: '2026-09-21',
    shifts: 0,
    overtimeShifts: 0
  };
  newState.cooldowns = newState.cooldowns || {};
  delete newState.cooldowns.work;
  delete newState.cooldowns.overtime;
  newState.adminModifiedTimestamp = Date.now() + 600000;

  const patchRes = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.Alkanzi`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      state: newState,
      admin_modified_timestamp: newState.adminModifiedTimestamp
    })
  });

  const resData = await patchRes.json();
  console.log('Alkanzi Reset Success:', {
    username: resData[0].username,
    dailyWork: resData[0].state.dailyWork,
    admin_modified_timestamp: resData[0].admin_modified_timestamp
  });
}

resetAlkanzi();
