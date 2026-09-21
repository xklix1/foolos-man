const fs = require('fs');

// 1. Update index.html
let index = fs.readFileSync('index.html', 'utf8');

// In head, ensure rasalmal_banned_device is cleared
index = index.replace(
  "localStorage.setItem('rasalmal_season_epoch', SEASON_TAG);",
  "localStorage.setItem('rasalmal_season_epoch', SEASON_TAG);\n        localStorage.removeItem('rasalmal_banned_device');"
);

// Remove device ban gate in boot sequence
index = index.replace(
  /\/\/\s*1\.5\.\s*HARD SECURITY GATE: Check if this device is permanently banned[\s\S]*?\/\/\s*2\.\s*Version check/,
  '// 2. Version check'
);

// Bump versions
index = index.replace("CURRENT_APP_BUILD = 'v7.6.0'", "CURRENT_APP_BUILD = 'v7.7.0'");
index = index.replace(/ui\.js\?v=[\w\.]+/g, 'ui.js?v=7.7.0');
index = index.replace(/db\.js\?v=[\w\.]+/g, 'db.js?v=50.0');
index = index.replace(/game\.js\?v=[\w\.]+/g, 'game.js?v=69.0');

fs.writeFileSync('index.html', index, 'utf8');
console.log('index.html updated successfully');

// 2. Update ui.js
let ui = fs.readFileSync('ui.js', 'utf8');
ui = ui.replace(
  /\/\/\s*0\.\s*Enforce device ban check[\s\S]*?\/\/\s*Check maintenance mode on session launch/,
  '// Check maintenance mode on session launch'
);
fs.writeFileSync('ui.js', ui, 'utf8');
console.log('ui.js updated successfully');

// 3. Update hq-vault-982-x3k8m7q.html
let hq = fs.readFileSync('hq-vault-982-x3k8m7q.html', 'utf8');
hq = hq.replace(/db\.js\?v=[\w\.]+/g, 'db.js?v=50.0');
hq = hq.replace(/game\.js\?v=[\w\.]+/g, 'game.js?v=69.0');
hq = hq.replace(/admin-panel\.js\?v=[\w\.]+/g, 'admin-panel.js?v=50.0');
fs.writeFileSync('hq-vault-982-x3k8m7q.html', hq, 'utf8');
console.log('hq-vault-982-x3k8m7q.html updated successfully');
