const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const serviceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

// Simulate AppDB.processTopupRequest exactly as in db.js with service_role / mutate
async function approveRemainingRequests() {
  const gRes = await fetch(`${supabaseUrl}/rest/v1/globals?id=eq.topup_requests`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
  });
  const gData = await gRes.json();
  const reqs = gData[0]?.data?.requests || [];
  
  const pendingKhaled = reqs.filter(r => r.username === 'خالد' && r.status === 'pending');
  console.log(`Found ${pendingKhaled.length} pending requests for "خالد" to approve:`);

  for (const req of pendingKhaled) {
    console.log(`\nProcessing: ${req.id} - ${req.packageName}...`);
    const ts = Date.now();
    const targetUser = req.username;

    // 1. Get player
    const pRes = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.خالد`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
    });
    const playerRows = await pRes.json();
    const playerDoc = playerRows[0];
    const pState = playerDoc.state || {};
    const rewards = req.rewards || {};

    const addedCash = Number(rewards.cash) || 0;
    const addedBank = Number(rewards.bank) || 0;
    const addedXP = Number(rewards.xp) || 0;
    const addedGold = Number(rewards.gold) || 0;
    const customBadge = rewards.customBadge || '';
    const badgeTitle = rewards.badgeTitle || req.packageName;

    const updatedCash = (Number(playerDoc.cash) || 0) + addedCash;
    const updatedBank = (Number(playerDoc.bank) || 0) + addedBank;
    const updatedXP = (Number(playerDoc.xp) || 0) + addedXP;
    const updatedGold = (Number(playerDoc.gold) || 0) + addedGold;
    const updatedNetworth = updatedCash + updatedBank;

    pState.cash = updatedCash;
    pState.bank = updatedBank;
    pState.xp = updatedXP;
    pState.gold = updatedGold;
    pState.netWorth = updatedNetworth;
    if (customBadge) {
      pState.customBadge = customBadge;
      pState.badgeTitle = badgeTitle;
    }
    pState.hasPurchasedTopup = true;
    pState.adminModifiedTimestamp = ts;

    // 2. Update player
    await fetch(`${supabaseUrl}/rest/v1/players?username=eq.خالد`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        cash: updatedCash,
        bank: updatedBank,
        gold: updatedGold,
        xp: updatedXP,
        net_worth: updatedNetworth,
        state: pState,
        admin_modified_timestamp: ts
      })
    });

    // 3. Send topup receipt mail
    await fetch(`${supabaseUrl}/rest/v1/mailbox`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        sender: 'إدارة اللعبة (Financial Team)',
        recipient: targetUser,
        type: 'topup_receipt',
        payload: {
          packageId: req.packageId,
          packageName: req.packageName,
          price: req.price,
          cash: addedCash,
          bank: addedBank,
          gold: addedGold,
          xp: addedXP,
          newCash: updatedCash,
          newBank: updatedBank,
          newGold: updatedGold,
          newXp: updatedXP,
          newWorth: updatedNetworth,
          isPreApplied: true,
          customBadge: customBadge,
          badgeTitle: badgeTitle,
          status: 'approved',
          date: ts,
          receiptNumber: req.receiptNumber || '',
          senderPhoneOrName: req.senderPhoneOrName || '',
          reviewerNote: 'تم الاعتماد والشحن بنجاح بواسطة الإدارة'
        },
        status: 'unread',
        created_at: ts
      })
    });

    req.status = 'approved';
    req.reviewedAt = ts;
    req.reviewerNote = 'تم الاعتماد والشحن بنجاح بواسطة الإدارة';

    console.log(` Approved ${req.packageName}: +${addedCash} Cash, +${addedBank} Bank, +${addedGold} Gold!`);
  }

  // Save updated requests to globals
  await fetch(`${supabaseUrl}/rest/v1/globals?id=eq.topup_requests`, {
    method: 'PATCH',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      data: { requests: reqs, updatedAt: Date.now() },
      updated_at: Date.now()
    })
  });

  console.log(' All pending topup requests approved and credited!');
}

approveRemainingRequests();
