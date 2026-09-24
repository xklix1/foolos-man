const https = require('https');
const fs = require('fs');

const envText = fs.readFileSync('server/.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';
envText.split('\n').forEach(line => {
  if (line.startsWith('SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=') || line.startsWith('SUPABASE_ANON_KEY=')) {
    if (!supabaseKey) supabaseKey = line.split('=')[1].trim();
  }
});

function get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(supabaseUrl + '/rest/v1/' + path);
    https.get(url, { headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const rows = await get('players?username=ilike.Osama.nasr');
  const p = rows[0];
  const s = p.state || {};

  console.log('=== OSAMA.NASR ACCOUNT META ===');
  console.log('Account Created:', new Date(p.created_at).toISOString());
  console.log('Last Seen:', new Date(p.last_seen).toISOString());
  console.log('Cash:', p.cash);
  console.log('Bank:', p.bank);
  console.log('Net Worth:', p.net_worth);
  console.log('Device ID:', s.initial_device);

  const allPlayers = await get('players?select=username,cash,bank,net_worth,state');
  const sameDev = allPlayers.filter(x => {
    const dev = x.state && x.state.initial_device;
    return dev === s.initial_device || ['osyy', 'osama.nasr', 'al.za3em', 'mooka15'].includes((x.username || '').toLowerCase());
  });

  console.log('\n=== SAME DEVICE / INTERACTED PLAYERS ===');
  sameDev.forEach(x => {
    console.log(`User: ${x.username.padEnd(16)} | Cash: ${String(x.cash).padEnd(10)} | Bank: ${String(Math.floor(x.bank)).padEnd(10)} | NetWorth: ${String(x.net_worth).padEnd(10)} | Device: ${x.state && x.state.initial_device}`);
  });

  console.log('\n=== FARM INFRASTRUCTURE VALUE ===');
  if (s.farm) {
    console.log('Unlocked:', s.farm.unlocked);
    console.log('Plots Count:', s.farm.plots ? s.farm.plots.length : 0);
    console.log('Silo Capacity:', s.farm.siloCapacity);
    console.log('Irrigation Tier:', s.farm.irrigationTier);
    console.log('Processing Lab:', s.farm.processingLabLevel);
    console.log('Inventory:', s.farm.inventory);
    console.log('Manufactured:', s.farm.manufacturedInventory);
  }

  console.log('\n=== CHRONOLOGICAL ACTIVITY LOG (OLDEST TO NEWEST) ===');
  const logs = (s.activityLog || []).slice().reverse();
  logs.forEach((l, i) => {
    const timeStr = new Date(l.timestamp).toISOString();
    console.log(`${String(i + 1).padStart(2, '0')}. [${timeStr}] (${l.category}) ${l.action} -> ${l.details}`);
  });
}

main().catch(console.error);
