const fs = require('fs');
const path = require('path');

// 1. Patch db.js
const dbPath = path.join(__dirname, '../db.js');
let db = fs.readFileSync(dbPath, 'utf8');

db = db.replace(/String\(row\.username \|\| u \|\| ''\)\.trim\(\)\.toLowerCase\(\) === 'khaled'/g, 
  "['khaled', 'خالد'].includes(String(row.username || u || '').trim().toLowerCase()) || Boolean(row.is_admin)");

db = db.replace(/if \(uLower === 'khaled'\)/g, "if (['khaled', 'خالد'].includes(uLower) || state.isAdmin)");
db = db.replace(/if \(cleanUser\.toLowerCase\(\) === 'khaled'\)/g, "if (['khaled', 'خالد'].includes(cleanUser.toLowerCase()))");
db = db.replace(/String\(u\)\.trim\(\)\.toLowerCase\(\) === 'khaled'/g, "['khaled', 'خالد'].includes(String(u).trim().toLowerCase())");

db = db.replace(/v7\.8\.0/g, 'v7.8.1');
fs.writeFileSync(dbPath, db, 'utf8');
console.log('db.js updated with Arabic Khaled immunity and v7.8.1');

// 2. Patch ui.js
const uiPath = path.join(__dirname, '../ui.js');
let ui = fs.readFileSync(uiPath, 'utf8');

ui = ui.replace(/\['khaled', 'rasalmal', 'rasalmal1', 'rasalmal2'\]/g, "['khaled', 'خالد', 'rasalmal', 'rasalmal1', 'rasalmal2']");
ui = ui.replace(/String\(GameEngine\.state\.username \|\| ''\)\.trim\(\)\.toLowerCase\(\) === 'khaled'/g,
  "['khaled', 'خالد'].includes(String(GameEngine.state.username || '').trim().toLowerCase()) || Boolean(GameEngine.state.isAdmin)");
ui = ui.replace(/const isOwnerKhaled = String\(myUsername\)\.trim\(\)\.toLowerCase\(\) === 'khaled';/g,
  "const isOwnerKhaled = ['khaled', 'خالد'].includes(String(myUsername).trim().toLowerCase()) || Boolean(GameEngine.state && GameEngine.state.isAdmin);");

ui = ui.replace(/CURRENT_BUILD = 'v[0-9\.]+'/g, "CURRENT_BUILD = 'v7.8.1'");
ui = ui.replace(/CURRENT_BUILD = "v[0-9\.]+"/g, 'CURRENT_BUILD = "v7.8.1"');
fs.writeFileSync(uiPath, ui, 'utf8');
console.log('ui.js updated with Arabic Khaled immunity and v7.8.1');

// 3. Patch index.html
const indexPath = path.join(__dirname, '../index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');
indexHtml = indexHtml.replace(/window\._CLIENT_VERSION = 'v[0-9\.]+';/g, "window._CLIENT_VERSION = 'v7.8.1';");
indexHtml = indexHtml.replace(/const CURRENT_APP_BUILD = 'v[0-9\.]+';/g, "const CURRENT_APP_BUILD = 'v7.8.1';");
indexHtml = indexHtml.replace(/href="app\.css\?v=[^"]+"/g, 'href="app.css?v=7.8.1"');
indexHtml = indexHtml.replace(/src="db\.js\?v=[^"]+"/g, 'src="db.js?v=7.8.1"');
indexHtml = indexHtml.replace(/src="server-client-bridge\.js\?v=[^"]+"/g, 'src="server-client-bridge.js?v=7.8.1"');
indexHtml = indexHtml.replace(/src="game\.js\?v=[^"]+"/g, 'src="game.js?v=7.8.1"');
indexHtml = indexHtml.replace(/src="ui\.js\?v=[^"]+"/g, 'src="ui.js?v=7.8.1"');
indexHtml = indexHtml.replace(/src="pwa-manager\.js\?v=[^"]+"/g, 'src="pwa-manager.js?v=7.8.1"');
fs.writeFileSync(indexPath, indexHtml, 'utf8');
console.log('index.html updated to v7.8.1');

// 4. Patch version.json
const verPath = path.join(__dirname, '../version.json');
const verObj = {
  version: "v7.8.1",
  build: new Date().toISOString(),
  minRequiredVersion: "v7.8.1",
  notes: "Arabic Khaled Admin Immunity & Velocity Protection Fix",
  forcePurgeCache: true
};
fs.writeFileSync(verPath, JSON.stringify(verObj, null, 2) + '\n', 'utf8');
console.log('version.json updated to v7.8.1');

// 5. Patch admin-panel.js
const adminPath = path.join(__dirname, '../admin-panel.js');
let adminJs = fs.readFileSync(adminPath, 'utf8');
adminJs = adminJs.replace(/cleanUser\.toLowerCase\(\) === 'khaled'/g, "['khaled', 'خالد'].includes(cleanUser.toLowerCase())");
fs.writeFileSync(adminPath, adminJs, 'utf8');
console.log('admin-panel.js updated with Arabic Khaled immunity');
