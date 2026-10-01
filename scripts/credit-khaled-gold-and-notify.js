const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function creditKhaled() {
  const ts = Date.now();
  console.log('Fetching player "خالد"...');
  
  const pRes = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.خالد`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const rows = await pRes.json();
  if (!rows || rows.length === 0) {
    console.error('Player not found');
    return;
  }

  const p = rows[0];
  const curGold = Number(p.gold) || 0;
  const addedGold = 850;
  const newGold = curGold + addedGold;
  const pState = p.state || {};
  pState.gold = newGold;
  pState.adminModifiedTimestamp = ts;
  pState.customBadge = '⚡';
  pState.badgeTitle = 'إمبراطور الذهب';
  pState.hasPurchasedTopup = true;

  console.log(`Updating player "خالد" gold: ${curGold} -> ${newGold}...`);
  const updateRes = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.خالد`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      gold: newGold,
      state: pState,
      admin_modified_timestamp: ts
    })
  });
  console.log('Update status:', updateRes.status, updateRes.statusText);

  // Send topup receipt mail
  console.log('Sending topup_receipt mail...');
  await fetch(`${supabaseUrl}/rest/v1/mailbox`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      sender: 'إدارة اللعبة (Financial Team)',
      recipient: 'خالد',
      type: 'topup_receipt',
      payload: {
        packageId: 'gold_pack_imperial',
        packageName: 'الخزينة الإمبراطورية العظمى 🏛️',
        price: 1000,
        gold: addedGold,
        newGold: newGold,
        cash: 0,
        bank: 0,
        xp: 0,
        customBadge: '⚡',
        badgeTitle: 'إمبراطور الذهب',
        isPreApplied: true,
        date: ts,
        status: 'approved'
      },
      status: 'unread',
      created_at: ts
    })
  });

  // Send admin_gold_grant mail
  console.log('Sending admin_gold_grant mail...');
  await fetch(`${supabaseUrl}/rest/v1/mailbox`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      sender: 'إدارة اللعبة (Financial Team)',
      recipient: 'خالد',
      type: 'admin_gold_grant',
      payload: {
        addedGold: addedGold,
        newGold: newGold,
        isPreApplied: true,
        timestamp: ts,
        note: 'شحن معتمد: الخزينة الإمبراطورية العظمى 🏛️'
      },
      status: 'unread',
      created_at: ts
    })
  });

  console.log('✅ 850 Gold successfully credited to "خالد" and receipts dispatched to mailbox!');
}

creditKhaled();
