const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// ==========================================
// 1. PATCH hq-vault-982-x3k8m7q.html
// ==========================================
const hqPath = path.join(rootDir, 'hq-vault-982-x3k8m7q.html');
let hqHtml = fs.readFileSync(hqPath, 'utf8');

if (!hqHtml.includes('id="adm-send-pkg-gold"')) {
  const targetFinancialGrid = `<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div>
          <label class="block text-xs text-emerald-400 mb-1 font-bold">كاش مالي (Cash):</label>`;
  
  const replacementFinancialGrid = `<div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
        <div>
          <label class="block text-xs text-amber-400 mb-1 font-bold">رصيد ذهب (Gold ):</label>
          <input type="number" id="adm-send-pkg-gold" value="0" placeholder="0"
            class="w-full p-2.5 text-xs text-center bg-slate-900 border border-slate-800 text-amber-400 font-mono font-bold rounded-xl outline-none focus:border-amber-500">
        </div>
        <div>
          <label class="block text-xs text-emerald-400 mb-1 font-bold">كاش مالي (Cash):</label>`;

  hqHtml = hqHtml.replace(targetFinancialGrid, replacementFinancialGrid);
  fs.writeFileSync(hqPath, hqHtml, 'utf8');
  console.log('1. Added adm-send-pkg-gold input to hq-vault-982-x3k8m7q.html');
}

// ==========================================
// 2. PATCH admin-panel.js
// ==========================================
const adminJsPath = path.join(rootDir, 'admin-panel.js');
let adminJs = fs.readFileSync(adminJsPath, 'utf8');

// A. Populate adm-send-pkg-gold on template change
if (!adminJs.includes("const pkgGoldInp = document.getElementById('adm-send-pkg-gold');")) {
  const targetInputs = `const pkgXpInp = document.getElementById('adm-send-pkg-xp');`;
  const replacementInputs = `const pkgXpInp = document.getElementById('adm-send-pkg-xp');
              const pkgGoldInp = document.getElementById('adm-send-pkg-gold');
              if (pkgGoldInp) pkgGoldInp.value = Number(found.gold !== undefined ? found.gold : (rewards.gold || 0));`;

  adminJs = adminJs.replace(targetInputs, replacementInputs);
}

// B. Read addGold and credit to freshPlayer
if (!adminJs.includes("const addGold = Number(goldInp ? goldInp.value : 0);")) {
  const targetRead = `const addXp = Number(xpInp ? xpInp.value : 0);`;
  const replacementRead = `const addXp = Number(xpInp ? xpInp.value : 0);
      const goldInp = document.getElementById('adm-send-pkg-gold');
      const addGold = Number(goldInp ? goldInp.value : 0);`;

  adminJs = adminJs.replace(targetRead, replacementRead);

  const targetValidation = `if (addCash <= 0 && addBank <= 0 && addXp <= 0 && !customBadge && Object.keys(items).length === 0) {`;
  const replacementValidation = `if (addCash <= 0 && addBank <= 0 && addXp <= 0 && addGold <= 0 && !customBadge && Object.keys(items).length === 0) {`;
  adminJs = adminJs.replace(targetValidation, replacementValidation);

  const targetConfirmMsg = `const confirmMsg = \` تأكيد إرسال الحزمة الفورية:\n\nهل أنت متأكد من إرسال [\${pkgName}] للاعب "\${targetUser}"؟\n\` +`;
  const replacementConfirmMsg = `const confirmMsg = \` تأكيد إرسال الحزمة الفورية:\n\nهل أنت متأكد من إرسال [\${pkgName}] للاعب "\${targetUser}"؟\n\` +
        (addGold > 0 ? \`• رصيد ذهب: +\${addGold.toLocaleString()} \n\` : '') +`;
  adminJs = adminJs.replace(targetConfirmMsg, replacementConfirmMsg);

  const targetCredit = `freshPlayer.cash = newCash;
        freshPlayer.bank = newBank;
        freshPlayer.xp = newXp;`;
  
  const replacementCredit = `freshPlayer.cash = newCash;
        freshPlayer.bank = newBank;
        freshPlayer.xp = newXp;
        if (addGold > 0) {
          freshPlayer.gold = Math.max(0, Number(freshPlayer.gold || 0) + addGold);
          if (freshPlayer.state && typeof freshPlayer.state === 'object') {
            freshPlayer.state.gold = freshPlayer.gold;
          }
        }`;
  adminJs = adminJs.replace(targetCredit, replacementCredit);

  const targetPayload = `const grantPayload = {
          packageName: pkgName,
          cash: addCash,
          bank: addBank,
          xp: addXp,`;
  
  const replacementPayload = `const grantPayload = {
          packageName: pkgName,
          cash: addCash,
          bank: addBank,
          xp: addXp,
          gold: addGold,
          newGold: freshPlayer.gold,`;
  adminJs = adminJs.replace(targetPayload, replacementPayload);
}

fs.writeFileSync(adminJsPath, adminJs, 'utf8');
console.log('2. Patched admin-panel.js for send package gold support');
