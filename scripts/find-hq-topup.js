const fs = require('fs');
const path = require('path');
const hq = fs.readFileSync(path.join(__dirname, '../hq-vault-982-x3k8m7q.html'), 'utf8');
const lines = hq.split('\n');
lines.forEach((l, i) => {
  if (l.includes('<script')) {
    console.log(`Line ${i + 1}: ${l.trim()}`);
  }
});
