const fs = require('fs');

const envFile = fs.readFileSync('server/.env', 'utf8');
const urlMatch = envFile.match(/SUPABASE_URL=(.+)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/) || envFile.match(/SUPABASE_KEY=(.+)/);

const SUPABASE_URL = (urlMatch ? urlMatch[1].trim() : 'https://jczhndgchgfnagjflzrg.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = keyMatch ? keyMatch[1].trim() : '';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function run() {
  console.log('1. Clearing banned_devices table...');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/banned_devices?device_id=neq.___keep_empty___`, {
      method: 'DELETE',
      headers
    });
    console.log('banned_devices delete status:', res.status);
  } catch (e) {
    console.error('Error clearing banned_devices:', e.message);
  }

  console.log('2. Unbanning all players...');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/players?select=username,state,is_banned`, {
      headers
    });
    const players = await res.json();
    let unbanned = 0;
    for (const p of players) {
      if (p.is_banned || (p.state && p.state.isBanned)) {
        const stateObj = (typeof p.state === 'object' && p.state) ? p.state : {};
        stateObj.isBanned = false;
        stateObj.adminModifiedTimestamp = Date.now();
        await fetch(`${SUPABASE_URL}/rest/v1/players?username=eq.${encodeURIComponent(p.username)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ is_banned: false, state: stateObj, admin_modified_timestamp: Date.now() })
        });
        console.log(`Unbanned: ${p.username}`);
        unbanned++;
      }
    }
    console.log(`Unbanned ${unbanned} players successfully.`);
  } catch (e) {
    console.error('Error unbanning players:', e.message);
  }
}

run();
