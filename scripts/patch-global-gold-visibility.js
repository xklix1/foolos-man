const fs = require('fs');
const path = require('path');

// 1. Patch ui.js
const uiPath = path.join(__dirname, '..', 'ui.js');
let ui = fs.readFileSync(uiPath, 'utf8');

// A. isKhaledUser
ui = ui.replace(
  /function isKhaledUser\(\) \{[\s\S]*?return isDevName \|\| hasGold;\s*\}/,
  'function isKhaledUser() {\n    return true; // متاح رسمياً لكافة اللاعبين في اللعبة\n  }'
);

// B. Header gold rendering
const headerSearch = `    // Update Gold balance (Beta - strictly and literally for Khaled)
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

const headerReplace = `    // Update Gold balance (Unlocked globally for all players)
    const goldDesktopContainer = document.getElementById('stat-gold-container-desktop');
    const goldMobileContainer = document.getElementById('stat-gold-container-mobile');
    if (s.gold === undefined || s.gold === null) {
      s.gold = 0;
    }
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

const normUi = ui.replace(/\r\n/g, '\n');
const normSearch = headerSearch.replace(/\r\n/g, '\n');
const normReplace = headerReplace.replace(/\r\n/g, '\n');

if (normUi.includes(normSearch)) {
  ui = normUi.replace(normSearch, normReplace);
  console.log('✅ ui.js header gold logic updated');
} else {
  console.warn('⚠️ Header gold search not exact, trying regex...');
  ui = ui.replace(
    /\/\/\s*Update Gold balance[\s\S]*?const gmEl = document\.getElementById\('stat-gold-mobile'\);[\s\S]*?gmEl\.textContent = goldVal\.toLocaleString\(\);\s*\}\s*\}\s*\}\s*else\s*\{[\s\S]*?goldMobileContainer\.style\.display = 'none';\s*\}\s*\}/,
    headerReplace
  );
  console.log('✅ ui.js regex replaced header');
}

ui = ui.replace('تسريع فوري (Beta)', 'تسريع فوري');
fs.writeFileSync(uiPath, ui, 'utf8');

// 2. Patch action-routes.js
const actionRoutesPath = path.join(__dirname, '..', 'server', 'src', 'routes', 'action-routes.js');
let actionRoutes = fs.readFileSync(actionRoutesPath, 'utf8');
actionRoutes = actionRoutes.replace(
  /\/\/ Strict Beta Access Control: Restricted exclusively to developer account 'Khaled' \/ 'خالد'[\s\S]*?if \(!session\.username \|\| !\[.*?\].*?\) \{\s*return reply\.code\(403\)\.send\(\{[\s\S]*?\}\);\s*\}/,
  '// Speed-up is now officially available for all players globally'
);
fs.writeFileSync(actionRoutesPath, actionRoutes, 'utf8');
console.log('✅ action-routes.js updated');

// 3. Patch admin-routes.js
const adminRoutesPath = path.join(__dirname, '..', 'server', 'src', 'routes', 'admin-routes.js');
let adminRoutes = fs.readFileSync(adminRoutesPath, 'utf8');
adminRoutes = adminRoutes.replace(
  /\/\/ Strict beta gating: developer accounts \('Khaled' \/ 'خالد'\) can receive gold[\s\S]*?if \(!\['khaled', 'خالد', 'rasalmal', 'rasalmal1', 'rasalmal2'\]\.includes\(username\.trim\(\)\.toLowerCase\(\)\)\) \{\s*return reply\.status\(403\)\.send\(\{[\s\S]*?\}\);\s*\}/,
  '// Gold currency can now be granted to any valid player'
);
fs.writeFileSync(adminRoutesPath, adminRoutes, 'utf8');
console.log('✅ admin-routes.js updated');

// 4. Patch event-service.js
const eventServicePath = path.join(__dirname, '..', 'server', 'src', 'services', 'event-service.js');
let eventService = fs.readFileSync(eventServicePath, 'utf8');
eventService = eventService.replace(
  /async getActiveEventsForUser\(username\) \{\s*if \(!username \|\| username\.trim\(\)\.toLowerCase\(\) !== 'khaled'\) \{\s*return \[\];\s*\}\s*return await this\.getActiveEvents\(\);\s*\}/,
  'async getActiveEventsForUser(username) {\n    return await this.getActiveEvents();\n  }'
);
fs.writeFileSync(eventServicePath, eventService, 'utf8');
console.log('✅ event-service.js updated');

console.log('🎉 All patches applied successfully!');
