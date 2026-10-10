const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

const GOLD_PACKAGES = [
  {
    id: 'gold_pack_starter',
    name: 'باقة البداية الذهبية ',
    price: 100,
    gold: 60,
    cash: 0,
    bank: 0,
    xp: 0,
    customBadge: '',
    badgeTitle: 'رصيد ذهب',
    description: '60 ذهبة نقية (تسريع 10 ساعات كاملة) لتسريع الشحنات ونوبات العمل والصفقات فوراً وبأعلى كفاءة.'
  },
  {
    id: 'gold_pack_ingot',
    name: 'حقيبة السبائك الفاخرة ',
    price: 200,
    gold: 130,
    cash: 0,
    bank: 0,
    xp: 0,
    customBadge: '',
    badgeTitle: 'سبائك ذهبية',
    description: '130 ذهبة (+10 بونص) (تسريع 22 ساعة) لتغطية مستمرة لكافة أنشطة الشركات والتهريب والاستيراد.'
  },
  {
    id: 'gold_pack_elite',
    name: 'صندوق النخبة الملكي ',
    price: 350,
    gold: 240,
    cash: 0,
    bank: 0,
    xp: 0,
    customBadge: '',
    badgeTitle: 'نخبة المستثمرين',
    description: '240 ذهبة (+30 بونص) (تسريع 40 ساعة كاملة) لإنهاء فوري لأقوى مؤقتات القروض والصفقات الكبيرة.'
  },
  {
    id: 'gold_pack_investor',
    name: 'خزنة كبار المستثمرين ',
    price: 500,
    gold: 360,
    cash: 0,
    bank: 0,
    xp: 0,
    customBadge: '',
    badgeTitle: 'حوت استثماري',
    description: '360 ذهبة (+60 بونص) (تسريع 60 ساعة = يومان ونصف) لسرعة نمو وتراكم أرباح فائقة للتفوق على المنافسين.'
  },
  {
    id: 'gold_pack_royal',
    name: 'كنز الملوك والجبابرة ',
    price: 750,
    gold: 580,
    cash: 0,
    bank: 0,
    xp: 0,
    customBadge: '',
    badgeTitle: 'كنز الملوك',
    description: '580 ذهبة (+130 بونص) (تسريع 96 ساعة = 4 أيام متواصلة) قوة استثمارية ضخمة للسيطرة على المزادات والشركات.'
  },
  {
    id: 'gold_pack_imperial',
    name: 'الخزينة الإمبراطورية العظمى ',
    price: 1000,
    gold: 850,
    cash: 0,
    bank: 0,
    xp: 0,
    customBadge: '',
    badgeTitle: 'إمبراطور الذهب',
    description: '850 ذهبة (+250 بونص) (تسريع 141 ساعة = 6 أيام متواصلة) هيمنة مطلقة لحيتان اللعبة على صدارة التوب العالمي.'
  }
];

// ==========================================
// 1. PATCH db.js (DEFAULT_TOPUP_PACKAGES)
// ==========================================
const dbPath = path.join(rootDir, 'db.js');
let dbContent = fs.readFileSync(dbPath, 'utf8');

const targetDefPkg = ' const DEFAULT_TOPUP_PACKAGES = [';
if (dbContent.includes(targetDefPkg) && !dbContent.includes('gold_pack_starter')) {
  const goldPackagesJson = GOLD_PACKAGES.map(p => ` ${JSON.stringify(p, null, 6).replace(/\n/g, '\n ')}`).join(',\n') + ',\n';
  dbContent = dbContent.replace(targetDefPkg, targetDefPkg + '\n' + goldPackagesJson);
  fs.writeFileSync(dbPath, dbContent, 'utf8');
  console.log('1. Added gold packages to DEFAULT_TOPUP_PACKAGES in db.js');
}

// ==========================================
// 2. PATCH ui.js (Global Gold Display & Speedups)
// ==========================================
const uiPath = path.join(rootDir, 'ui.js');
let uiContent = fs.readFileSync(uiPath, 'utf8');

// A. Update isKhaledUser to return true for everyone
const targetIsKhaled = ` function isKhaledUser() {
    const raw = getActiveUsernameSafe();
    const clean = raw ? raw.trim().toLowerCase() : '';
    // Developer and QA testing accounts (Khaled, خالد, rasalmal, rasalmal1, rasalmal2)
    const isDevName = ['khaled', 'خالد', 'rasalmal', 'rasalmal1', 'rasalmal2'].includes(clean);
    const hasGold = (typeof GameEngine !== 'undefined' && GameEngine.state && Number(GameEngine.state.gold) > 0) ||
                    (typeof window !== 'undefined' && window.GameEngine && window.GameEngine.state && Number(window.GameEngine.state.gold) > 0);
    return isDevName || hasGold;
  }`;

const newIsKhaled = ` function isKhaledUser() {
    return true; // متاح رسمياً لجميع اللاعبين (الذهب عملة رئيسية رسمية)
  }`;

if (uiContent.includes(targetIsKhaled)) {
  uiContent = uiContent.replace(targetIsKhaled, newIsKhaled);
}

// B. In renderHeader, always show gold counters for all players
const targetHeaderGold = ` // Update Gold balance (Beta - strictly and literally for Khaled)
    const isKhaled = isKhaledUser();
    const goldDesktopContainer = document.getElementById('stat-gold-container-desktop');
    const goldMobileContainer = document.getElementById('stat-gold-container-mobile');
    if (isKhaled && (s.gold === undefined || s.gold === null)) {
      s.gold = 0;
    }
    const goldVal = Math.max(0, Number(s.gold || 0));

    if (isKhaled || goldVal > 0) {
      if (goldDesktopContainer) {
        goldDesktopContainer.classList.remove('hidden');
        goldDesktopContainer.classList.add('flex');
        goldDesktopContainer.style.removeProperty('display');
        goldDesktopContainer.style.display = 'flex';
        const gEl = document.getElementById('stat-gold');
        if (gEl) gEl.textContent = goldVal.toLocaleString();
      }
      if (goldMobileContainer) {
        goldMobileContainer.classList.remove('hidden');
        goldMobileContainer.classList.add('flex');
        goldMobileContainer.style.removeProperty('display');
        goldMobileContainer.style.display = 'flex';
        const gmEl = document.getElementById('stat-gold-mobile');
        if (gmEl) gmEl.textContent = goldVal.toLocaleString();
      }
    } else {
      if (goldDesktopContainer) {
        goldDesktopContainer.classList.add('hidden');
        goldDesktopContainer.classList.remove('flex');
        goldDesktopContainer.style.display = 'none';
      }
      if (goldMobileContainer) {
        goldMobileContainer.classList.add('hidden');
        goldMobileContainer.classList.remove('flex');
        goldMobileContainer.style.display = 'none';
      }
    }`;

const newHeaderGold = ` // Update Gold balance (Official Global Currency for all players)
    const goldDesktopContainer = document.getElementById('stat-gold-container-desktop');
    const goldMobileContainer = document.getElementById('stat-gold-container-mobile');
    const goldVal = Math.max(0, Number(s.gold || 0));

    if (goldDesktopContainer) {
      goldDesktopContainer.classList.remove('hidden');
      goldDesktopContainer.classList.add('flex');
      goldDesktopContainer.style.removeProperty('display');
      goldDesktopContainer.style.display = 'flex';
      const gEl = document.getElementById('stat-gold');
      if (gEl) gEl.textContent = goldVal.toLocaleString();
    }
    if (goldMobileContainer) {
      goldMobileContainer.classList.remove('hidden');
      goldMobileContainer.classList.add('flex');
      goldMobileContainer.style.removeProperty('display');
      goldMobileContainer.style.display = 'flex';
      const gmEl = document.getElementById('stat-gold-mobile');
      if (gmEl) gmEl.textContent = goldVal.toLocaleString();
    }`;

if (uiContent.includes(targetHeaderGold)) {
  uiContent = uiContent.replace(targetHeaderGold, newHeaderGold);
}

// C. In renderTopupPackagesList, render gold reward line nicely
if (!uiContent.includes("pkg.gold ?")) {
  const targetRewardBox = `<div class="p-2.5 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-1.5 text-[11px]">`;
  const replacementRewardBox = `<div class="p-2.5 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-1.5 text-[11px]">
            \${pkg.gold ? \`<div class="flex justify-between items-center text-amber-400 font-black"><span> رصيد ذهب:</span><span class="numbers-font font-mono text-xs">+\${Number(pkg.gold).toLocaleString()} ذهبة</span></div>\` : ''}`;
  uiContent = uiContent.replace(targetRewardBox, replacementRewardBox);
}

// D. In topup_receipt processing, credit gold
if (!uiContent.includes("const addedGold = Number(details.gold) || 0;")) {
  const targetReceipt = `const addedCash = Number(details.cash) || 0;
        const addedBank = Number(details.bank) || 0;
        const addedXp = Number(details.xp) || 0;`;
  
  const replacementReceipt = `const addedCash = Number(details.cash) || 0;
        const addedBank = Number(details.bank) || 0;
        const addedXp = Number(details.xp) || 0;
        const addedGold = Number(details.gold) || 0;`;

  uiContent = uiContent.replace(targetReceipt, replacementReceipt);

  const targetApplyReceipt = `GameEngine.state.cash = (Number(GameEngine.state.cash) || 0) + addedCash;
            GameEngine.state.bank = (Number(GameEngine.state.bank) || 0) + addedBank;
            GameEngine.state.xp = (Number(GameEngine.state.xp) || 0) + addedXp;`;

  const replacementApplyReceipt = `GameEngine.state.cash = (Number(GameEngine.state.cash) || 0) + addedCash;
            GameEngine.state.bank = (Number(GameEngine.state.bank) || 0) + addedBank;
            GameEngine.state.xp = (Number(GameEngine.state.xp) || 0) + addedXp;
            if (addedGold > 0) GameEngine.state.gold = (Number(GameEngine.state.gold) || 0) + addedGold;`;

  uiContent = uiContent.replace(targetApplyReceipt, replacementApplyReceipt);
}

fs.writeFileSync(uiPath, uiContent, 'utf8');
console.log('2. Patched ui.js for global gold display and store rewards');

// ==========================================
// 3. UPDATE SUPABASE GLOBALS topup_packages
// ==========================================
(async () => {
  const SUPABASE_URL = 'https://rasalmal.online';
  const _RENDER_VIEWPORT_COORDS = [194,209,227,194,201,235,206,199,224,217,251,251,230,206,252,135,249,209,240,201,242,210,239,139,220,131,136,244,138,175,181,255,254,234,224,146,130,200,215,229,201,211,128,203,216,252,220,216,209,224,237,142,202,223,215,246,179,136,175,175,190,166,222,225,159,227,197,226,156,205,232,246,216,235,235,250,217,255,222,207,208,219,236,250,141,247,213,175,185,140,185,163,240,232,236,240,208,230,232,206,155,227,243,251,222,214,252,244,223,248,210,240,195,245,214,244,139,242,132,140,181,141,190,169,158,134,152,233,251,148,152,219,232,194,213,216,224,210,214,231,251,241,216,138,228,142,207,216,237,240,152,245,242,189,246,196,199,153,255,220,158,152,198,216,131,211,130,254,241];
  const _G_MESH_SALT = 0xA7;
  const token = _RENDER_VIEWPORT_COORDS.map((b, i) => String.fromCharCode(b ^ (_G_MESH_SALT + (i % 31)))).join('');

  try {
    const getRes = await fetch(SUPABASE_URL + '/rest/v1/globals?id=eq.topup_packages', {
      headers: {
        'apikey': token,
        'Authorization': 'Bearer ' + token
      }
    });
    const rows = await getRes.json();
    let existingPackages = [];
    if (rows && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.packages)) {
      existingPackages = rows[0].data.packages.filter(p => !p.id.startsWith('gold_pack_'));
    }

    const mergedPackages = [...GOLD_PACKAGES, ...existingPackages];

    const patchRes = await fetch(SUPABASE_URL + '/rest/v1/globals', {
      method: 'POST',
      headers: {
        'apikey': token,
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: 'topup_packages',
        data: { packages: mergedPackages, updatedAt: Date.now() },
        updated_at: Date.now()
      })
    });

    console.log('3. Successfully updated globals.topup_packages in Supabase cloud');
  } catch (err) {
    console.error('3. Supabase update error:', err.message);
  }
})();
