const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const username = 'Engineer_mo';
  const res1 = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.${encodeURIComponent(username)}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const [player] = await res1.json();
  if (!player) {
    console.error('Player not found');
    return;
  }

  const transferAmount = 2110000;
  const currentBank = Number(player.bank || 0);
  const newBank = currentBank + transferAmount;
  const newNetWorth = Number(player.net_worth || 0) + transferAmount;
  const nowTs = Date.now();
  const lockTs = nowTs + 600000; // 10 min lock

  const state = player.state || {};
  state.bank = newBank;
  state.netWorth = newNetWorth;
  state.adminModifiedTimestamp = lockTs;
  if (!state.activityLog) state.activityLog = [];
  state.activityLog.push({
    action: 'حوالة بنكية مؤكدة (إيداع فوري)',
    details: `تم تأكيد وقيد الحوالة البنكية الواردة من اللاعب "Tarek" بقيمة ${transferAmount.toLocaleString()} EGP في حسابك المصرفي.`,
    category: 'banking',
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
      net_worth: newNetWorth,
      admin_modified_timestamp: lockTs,
      state: state
    })
  });

  const updated = await res2.json();
  console.log('Update success for Engineer_mo:', updated[0]?.username, 'New Bank:', updated[0]?.bank, 'New NetWorth:', updated[0]?.net_worth);
}

run().catch(console.error);
