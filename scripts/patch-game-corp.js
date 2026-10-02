const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../game.js');
let content = fs.readFileSync(filePath, 'utf8');

const target = `            if (!snapshot.empty) {
              const corp = snapshot.docs[0].data();`;

const replacement = `            if (!snapshot.empty && snapshot.docs && snapshot.docs[0] && typeof snapshot.docs[0].data === 'function') {
              const corp = snapshot.docs[0].data();`;

const normalized = content.replace(/\r\n/g, '\n');
if (normalized.includes(target)) {
  const updated = normalized.replace(target, replacement);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully patched game.js corp null check!');
} else {
  console.error('Target not found in game.js');
}
