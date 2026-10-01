const fs = require('fs');
const path = require('path');

// 1. Patch db.js
const dbPath = path.join(__dirname, '../db.js');
let db = fs.readFileSync(dbPath, 'utf8');

// Update processTopupRequest in db.js to handle gold and package fallback
const oldProcessTopup = `      const pState = playerDoc.state || {};
      const rewards = req.rewards || {};
      const addedCash = Number(rewards.cash) || 0;
      const addedBank = Number(rewards.bank) || 0;
      const addedXP = Number(rewards.xp) || 0;
      const customBadge = rewards.customBadge ||'';

      const updatedCash = (Number(playerDoc.cash) || 0) + addedCash;
      const updatedBank = (Number(playerDoc.bank) || 0) + addedBank;
      const updatedXP = (Number(playerDoc.xp) || 0) + addedXP;
      const updatedNetworth = updatedCash + updatedBank;

      pState.cash = updatedCash;
      pState.bank = updatedBank;
      pState.xp = updatedXP;
      pState.netWorth = updatedNetworth;`;

const newProcessTopup = `      const pState = playerDoc.state || {};
      const rewards = req.rewards || {};
      const pkgDef = (typeof DEFAULT_TOPUP_PACKAGES !== 'undefined' && Array.isArray(DEFAULT_TOPUP_PACKAGES)) 
        ? DEFAULT_TOPUP_PACKAGES.find(p => p.id === req.packageId) 
        : null;

      const addedCash = Number(rewards.cash !== undefined ? rewards.cash : (pkgDef ? pkgDef.cash : 0)) || 0;
      const addedBank = Number(rewards.bank !== undefined ? rewards.bank : (pkgDef ? pkgDef.bank : 0)) || 0;
      const addedXP = Number(rewards.xp !== undefined ? rewards.xp : (pkgDef ? pkgDef.xp : 0)) || 0;
      const addedGold = Number(rewards.gold !== undefined ? rewards.gold : (pkgDef ? pkgDef.gold : 0)) || 0;
      const customBadge = rewards.customBadge || (pkgDef ? pkgDef.customBadge : '') || '';

      const updatedCash = (Number(playerDoc.cash) || 0) + addedCash;
      const updatedBank = (Number(playerDoc.bank) || 0) + addedBank;
      const updatedXP = (Number(playerDoc.xp) || 0) + addedXP;
      const updatedGold = (Number(playerDoc.gold) || 0) + addedGold;
      const updatedNetworth = updatedCash + updatedBank;

      pState.cash = updatedCash;
      pState.bank = updatedBank;
      pState.xp = updatedXP;
      pState.gold = updatedGold;
      pState.netWorth = updatedNetworth;`;

if (db.includes(oldProcessTopup)) {
  db = db.replace(oldProcessTopup, newProcessTopup);
  console.log('✅ [1/4] Patched db.js processTopupRequest reward calculations with gold support');
}

// Include gold in the PATCH payload for players
const oldPatchCall = `      await _api(\`players?username=eq.\${encodeURIComponent(targetUser)}\`, {
        method:'PATCH',
        body: JSON.stringify({
          cash: updatedCash,
          bank: updatedBank,
          xp: updatedXP,
          net_worth: updatedNetworth,
          state: pState,
          admin_modified_timestamp: ts
        })
      });`;

const newPatchCall = `      await _api(\`players?username=ilike.\${encodeURIComponent(targetUser)}\`, {
        method:'PATCH',
        body: JSON.stringify({
          cash: updatedCash,
          bank: updatedBank,
          gold: updatedGold,
          xp: updatedXP,
          net_worth: updatedNetworth,
          state: pState,
          admin_modified_timestamp: ts
        })
      });`;

if (db.includes(oldPatchCall)) {
  db = db.replace(oldPatchCall, newPatchCall);
  console.log('✅ [2/4] Patched db.js processTopupRequest player PATCH with gold and ilike username');
}

// Add gold to topupReceiptData and admin_gold_grant mail
const oldReceiptData = `      const topupReceiptData = {
        packageId: req.packageId,
        packageName: req.packageName,
        price: req.price,
        cash: addedCash,
        bank: addedBank,
        xp: addedXP,
        newCash: updatedCash,
        newBank: updatedBank,
        newXp: updatedXP,
        newWorth: updatedNetworth,`;

const newReceiptData = `      const topupReceiptData = {
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
        newWorth: updatedNetworth,`;

if (db.includes(oldReceiptData)) {
  db = db.replace(oldReceiptData, newReceiptData);
  console.log('✅ [3/4] Patched db.js topupReceiptData with gold fields');
}

// Add admin_gold_grant mail trigger if addedGold > 0
const oldGrantBlock = `      if (addedCash > 0 || addedBank > 0) {
        await sendMail('إدارة اللعبة (Financial Team)', targetUser, 'admin_balance_grant', {
          addedCash: addedCash,
          addedBank: addedBank,
          totalAmount: addedCash + addedBank,
          target: targetUser,
          newCash: updatedCash,
          newBank: updatedBank,
          newXp: updatedXP,
          isPreApplied: true,
          timestamp: ts,
          note: \`شحن فوري معتمد: [\${req.packageName}]\`
        }).catch(() => {});
      }`;

const newGrantBlock = `      if (addedCash > 0 || addedBank > 0) {
        await sendMail('إدارة اللعبة (Financial Team)', targetUser, 'admin_balance_grant', {
          addedCash: addedCash,
          addedBank: addedBank,
          totalAmount: addedCash + addedBank,
          target: targetUser,
          newCash: updatedCash,
          newBank: updatedBank,
          newXp: updatedXP,
          isPreApplied: true,
          timestamp: ts,
          note: \`شحن فوري معتمد: [\${req.packageName}]\`
        }).catch(() => {});
      }

      if (addedGold > 0) {
        await sendMail('إدارة اللعبة (Financial Team)', targetUser, 'admin_gold_grant', {
          addedGold: addedGold,
          newGold: updatedGold,
          isPreApplied: true,
          timestamp: ts,
          note: \`شحن سبائك الذهب: [\${req.packageName}]\`
        }).catch(() => {});
      }`;

if (db.includes(oldGrantBlock)) {
  db = db.replace(oldGrantBlock, newGrantBlock);
  console.log('✅ [4/4] Added automatic admin_gold_grant mail in db.js');
}

fs.writeFileSync(dbPath, db, 'utf8');

// 2. Patch ui.js
const uiPath = path.join(__dirname, '../ui.js');
let ui = fs.readFileSync(uiPath, 'utf8');

// Include gold in requestPayload
const oldReqPayload = `        rewards: {
          cash: _activeSelectedTopupPkg.cash || 0,
          bank: _activeSelectedTopupPkg.bank || 0,
          xp: _activeSelectedTopupPkg.xp || 0,
          customBadge: _activeSelectedTopupPkg.customBadge ||'',
          badgeTitle: _activeSelectedTopupPkg.badgeTitle ||'',
          items: _activeSelectedTopupPkg.items || {}
        },`;

const newReqPayload = `        rewards: {
          cash: _activeSelectedTopupPkg.cash || 0,
          bank: _activeSelectedTopupPkg.bank || 0,
          gold: _activeSelectedTopupPkg.gold || 0,
          xp: _activeSelectedTopupPkg.xp || 0,
          customBadge: _activeSelectedTopupPkg.customBadge ||'',
          badgeTitle: _activeSelectedTopupPkg.badgeTitle ||'',
          items: _activeSelectedTopupPkg.items || {}
        },`;

if (ui.includes(oldReqPayload)) {
  ui = ui.replace(oldReqPayload, newReqPayload);
  console.log('✅ [UI 1/2] Included gold in submitTopupRequest rewards in ui.js');
}

// Handle gold in listenToMailbox topup receipt listener
const oldReceiptListener = `        const addedCash = Number(details.cash) || 0;
        const addedBank = Number(details.bank) || 0;
        const addedXp = Number(details.xp) || 0;`;

const newReceiptListener = `        const addedCash = Number(details.cash) || 0;
        const addedBank = Number(details.bank) || 0;
        const addedGold = Number(details.gold) || 0;
        const addedXp = Number(details.xp) || 0;
        if (addedGold > 0) {
          GameEngine.state.gold = (Number(GameEngine.state.gold) || 0) + addedGold;
        }`;

if (ui.includes(oldReceiptListener)) {
  ui = ui.replace(oldReceiptListener, newReceiptListener);
  console.log('✅ [UI 2/2] Handled gold reward in listenToMailbox in ui.js');
}

fs.writeFileSync(uiPath, ui, 'utf8');
console.log('🎉 Full topup gold support patch successfully applied!');
