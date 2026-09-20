const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  const username = 'Tarek';
  const res1 = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.${encodeURIComponent(username)}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const [player] = await res1.json();
  if (!player) {
    console.error('Player Tarek not found');
    return;
  }

  const restoredBank = 3127169;
  const restoredCash = 50000;
  const nowTs = Date.now();
  const lockTs = nowTs + 600000; // 10 min lock

  const state = player.state || {};
  state.isBanned = false;
  state.jailTimer = 0;
  state.bank = restoredBank;
  state.cash = restoredCash;
  state.adminModifiedTimestamp = lockTs;
  
  // Calculate businesses value
  let bizValue = 0;
  if (state.businesses) {
    const BIZ_COSTS = {
      kiosk: 15,
      coffee: 28,
      tech: 75,
      logistics: 120,
      supermarket: 200,
      solar_factory: 340,
      private_hospital: 600,
      media_studio: 1100,
      private_bank: 1800,
      oil_refinery: 2800,
      space_tech: 4800
    };
    for (const [k, v] of Object.entries(state.businesses)) {
      if (v && v.level > 0) {
        const baseCost = BIZ_COSTS[k] || 100;
        bizValue += Math.floor(baseCost * Math.pow(1.5, v.level) * 100);
      }
    }
  }

  const restoredNetWorth = restoredBank + restoredCash + bizValue + 500000; // ~4.5M - 5M EGP
  state.netWorth = restoredNetWorth;

  if (!state.activityLog) state.activityLog = [];
  state.activityLog.push({
    action: 'إلغاء الحظر واستعادة الحساب 🔓',
    details: `تم إلغاء الحظر رسمياً واستعادة رصيد البنك (${restoredBank.toLocaleString()} EGP) وإعادة تفعيل كافة الأنشطة والمشاريع.`,
    category: 'system',
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
      is_banned: false,
      jail_timer: 0,
      bank: restoredBank,
      cash: restoredCash,
      net_worth: restoredNetWorth,
      admin_modified_timestamp: lockTs,
      state: state
    })
  });

  const updated = await res2.json();
  console.log('--- RESTORE SUCCESS FOR TAREK ---');
  console.log('Username:', updated[0]?.username);
  console.log('is_banned:', updated[0]?.is_banned);
  console.log('Bank:', updated[0]?.bank);
  console.log('Cash:', updated[0]?.cash);
  console.log('Net Worth:', updated[0]?.net_worth);
}

run().catch(console.error);
