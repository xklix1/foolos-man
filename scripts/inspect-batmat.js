const fs = require('fs');

const envFile = fs.readFileSync('server/.env', 'utf8');
const urlMatch = envFile.match(/SUPABASE_URL=(.+)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/) || envFile.match(/SUPABASE_KEY=(.+)/);

const SUPABASE_URL = (urlMatch ? urlMatch[1].trim() : 'https://jczhndgchgfnagjflzrg.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = keyMatch ? keyMatch[1].trim() : '';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

async function inspect() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/players?username=ilike.batmat&select=*`, { headers });
  const rows = await res.json();
  console.log('Batmat rows:', JSON.stringify(rows, null, 2));

  const bannedDevsRes = await fetch(`${SUPABASE_URL}/rest/v1/banned_devices?select=*`, { headers });
  const bannedDevs = await bannedDevsRes.json();
  console.log('Banned devices in Supabase:', JSON.stringify(bannedDevs, null, 2));
}

inspect();
