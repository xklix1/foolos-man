const fs = require('fs');

const html = fs.readFileSync('hq-vault-982-x3k8m7q.html', 'utf8');
const js = fs.readFileSync('admin-panel.js', 'utf8');
const db = fs.readFileSync('db.js', 'utf8');

// Extract all button and element IDs in HTML
const htmlIds = [...html.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
console.log(`Found ${htmlIds.length} unique/total IDs in HTML.`);

// Extract all getElementById in admin-panel.js
const jsGetElementById = [...js.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map(m => m[1]);
console.log(`Found ${jsGetElementById.length} getElementById calls in admin-panel.js.`);

// Find IDs in HTML related to player moderation ('admin-p-', 'btn-admin-', 'admin-input-', 'admin-grant-', 'admin-player-')
const playerHtmlIds = htmlIds.filter(id => 
  id.startsWith('admin-p-') || 
  id.startsWith('btn-admin-') || 
  id.startsWith('admin-input-') || 
  id.startsWith('admin-grant-') || 
  id.startsWith('admin-player-') ||
  id.startsWith('btn-player-') ||
  id.startsWith('player-subtab-')
);

console.log('\n--- Player Moderation HTML IDs & JS Handling ---');
const missingInJs = [];
playerHtmlIds.forEach(id => {
  const inJs = js.includes(id);
  if (!inJs) {
    missingInJs.push(id);
  }
});
console.log('HTML IDs not referenced in admin-panel.js:', missingInJs);

// Find getElementById in admin-panel.js that are missing from HTML
console.log('\n--- JS getElementById missing in HTML ---');
const missingInHtml = [];
jsGetElementById.forEach(id => {
  if (!htmlIds.includes(id)) {
    missingInHtml.push(id);
  }
});
console.log('JS getElementById missing in HTML:', [...new Set(missingInHtml)]);
