const fs = require('fs');

console.log('=== Syncing client build version to v8.1.7 ===');

const swPath = 'sw.js';
if (fs.existsSync(swPath)) {
  let swContent = fs.readFileSync(swPath, 'utf8');
  swContent = swContent.replace(/const CACHE_NAME = 'rasalmal-[^']+';/, "const CACHE_NAME = 'rasalmal-v8.1.7';");
  fs.writeFileSync(swPath, swContent, 'utf8');
  console.log('Updated sw.js CACHE_NAME to rasalmal-v8.1.7');
}

console.log('=== Version sync complete ===');
