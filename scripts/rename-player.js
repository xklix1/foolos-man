const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const oldName = 'mooka14';
  const newName = 'MoOka Aziz';

  // 1. Fetch old player data
  const res = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.${encodeURIComponent(oldName)}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const [player] = await res.json();
  if (!player) {
    console.error('Player mooka14 not found!');
    return;
  }

  const nowTs = Date.now();
  const lockTs = nowTs + 600000;
  const state = player.state || {};
  state.username = newName;
  state.adminModifiedTimestamp = lockTs;
  if (!state.activityLog) state.activityLog = [];
  state.activityLog.push({
    action: 'تغيير الاسم الرسمي 📝',
    details: `تم تغيير الاسم الإداري للحساب رسمياً من "${oldName}" إلى "${newName}".`,
    category: 'system',
    timestamp: nowTs
  });

  // 2. Try direct PATCH of username on players table
  const patchRes = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.${encodeURIComponent(oldName)}`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      username: newName,
      state: state,
      admin_modified_timestamp: lockTs
    })
  });

  const patchData = await patchRes.json();
  console.log('PATCH result:', JSON.stringify(patchData, null, 2));

  if (!patchRes.ok || (Array.isArray(patchData) && patchData.length === 0)) {
    console.log('Direct PATCH failed or restricted. Attempting insert + delete migration...');
    const newRow = { ...player, username: newName, state: state, admin_modified_timestamp: lockTs };
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/players`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(newRow)
    });
    console.log('Insert new row result:', await insertRes.json());

    const delRes = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.${encodeURIComponent(oldName)}`, {
      method: 'DELETE',
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    console.log('Delete old row status:', delRes.status);
  }

  // 3. Update mailbox records
  await fetch(`${supabaseUrl}/rest/v1/mailbox?sender=eq.${encodeURIComponent(oldName)}`, {
    method: 'PATCH',
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: newName })
  });
  await fetch(`${supabaseUrl}/rest/v1/mailbox?recipient=eq.${encodeURIComponent(oldName)}`, {
    method: 'PATCH',
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: newName })
  });

  // 4. Update transfers records
  await fetch(`${supabaseUrl}/rest/v1/transfers?sender=eq.${encodeURIComponent(oldName)}`, {
    method: 'PATCH',
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: newName })
  });
  await fetch(`${supabaseUrl}/rest/v1/transfers?recipient=eq.${encodeURIComponent(oldName)}`, {
    method: 'PATCH',
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: newName })
  });

  // 5. Verify the new player account exists
  const verifyRes = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.${encodeURIComponent(newName)}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const [verifyPlayer] = await verifyRes.json();
  console.log('--- VERIFICATION ---');
  console.log('New Username in DB:', verifyPlayer?.username);
  console.log('PIN (unchanged):', verifyPlayer?.pin);
  console.log('Net Worth:', verifyPlayer?.net_worth);
  console.log('Cash:', verifyPlayer?.cash, 'Bank:', verifyPlayer?.bank);
}

run().catch(console.error);
