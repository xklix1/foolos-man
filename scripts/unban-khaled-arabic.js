const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const getRes = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.${encodeURIComponent('خالد')}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const rows = await getRes.json();
  if (rows.length === 0) {
    console.log('Player خالد not found');
    return;
  }
  const p = rows[0];
  const s = p.state || {};
  s.isBanned = false;
  s.is_banned = false;
  s.isAdmin = true;
  s.bank = 100000000;
  s.cash = 1000000;
  s.netWorth = 101000000;
  s.banned_devices = [];
  s.adminModifiedTimestamp = Date.now();

  const patchBody = {
    is_banned: false,
    is_admin: true,
    bank: 100000000,
    cash: 1000000,
    net_worth: 101000000,
    state: s,
    admin_modified_timestamp: Date.now()
  };

  const res = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.${encodeURIComponent('خالد')}`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(patchBody)
  });
  const data = await res.json();
  console.log('Unbanned and restored خالد:', data);
}

run().catch(console.error);
