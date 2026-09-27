const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const versionJsonPath = path.join(rootDir, 'version.json');

if (!fs.existsSync(versionJsonPath)) {
  console.error('version.json not found!');
  process.exit(1);
}

const versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
const currentVersion = versionData.version;
console.log(`=== Syncing all codebase versions to: ${currentVersion} ===`);

// 1. Update index.html
const indexHtmlPath = path.join(rootDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  indexHtml = indexHtml.replace(/window\._CLIENT_VERSION\s*=\s*'[^']+';/g, `window._CLIENT_VERSION = '${currentVersion}';`);
  indexHtml = indexHtml.replace(/const CURRENT_APP_BUILD\s*=\s*'[^']+';/g, `const CURRENT_APP_BUILD = '${currentVersion}';`);
  fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
  console.log(`Updated index.html to ${currentVersion}`);
}

// 2. Update sw.js
const swPath = path.join(rootDir, 'sw.js');
if (fs.existsSync(swPath)) {
  let swContent = fs.readFileSync(swPath, 'utf8');
  swContent = swContent.replace(/const CACHE_NAME = 'rasalmal-[^']+';/, `const CACHE_NAME = 'rasalmal-${currentVersion}';`);
  fs.writeFileSync(swPath, swContent, 'utf8');
  console.log(`Updated sw.js CACHE_NAME to rasalmal-${currentVersion}`);
}

// 3. Update ui.js fallback version
const uiPath = path.join(rootDir, 'ui.js');
if (fs.existsSync(uiPath)) {
  let uiContent = fs.readFileSync(uiPath, 'utf8');
  uiContent = uiContent.replace(/const curVer = \(window\._CLIENT_VERSION \|\| '[^']+'\);/g, `const curVer = (window._CLIENT_VERSION || '${currentVersion}');`);
  fs.writeFileSync(uiPath, uiContent, 'utf8');
  console.log(`Updated ui.js fallback version to ${currentVersion}`);
}

// 4. Update db.js fallback version
const dbPath = path.join(rootDir, 'db.js');
if (fs.existsSync(dbPath)) {
  let dbContent = fs.readFileSync(dbPath, 'utf8');
  dbContent = dbContent.replace(/const client = \(typeof window !== 'undefined' && window\._CLIENT_VERSION\) \|\| '[^']+';/g, `const client = (typeof window !== 'undefined' && window._CLIENT_VERSION) || '${currentVersion}';`);
  dbContent = dbContent.replace(/return { upToDate: true, clientVersion: '[^']+', remoteVersion: '[^']+' };/g, `return { upToDate: true, clientVersion: '${currentVersion}', remoteVersion: '${currentVersion}' };`);
  fs.writeFileSync(dbPath, dbContent, 'utf8');
  console.log(`Updated db.js fallback version to ${currentVersion}`);
}

console.log('=== All versions synchronized successfully ===');
