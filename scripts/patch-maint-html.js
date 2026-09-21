const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/\r\n/g, '\n');

const oldBlock = `          } else {
            const overlay = document.getElementById('maintenance-overlay');
            if (overlay) overlay.classList.add('hidden');
          }`;

const newBlock = `          } else {
            const overlay = document.getElementById('maintenance-overlay');
            if (overlay) {
              overlay.classList.add('hidden');
              overlay.style.display = 'none';
              try { overlay.remove(); } catch (e) {}
            }
          }`;

if (html.includes(oldBlock)) {
  html = html.replace(oldBlock, newBlock);
  console.log('Successfully updated maintenance cleanup in index.html');
}

html = html.replace(/\n/g, '\r\n');
fs.writeFileSync(indexPath, html, 'utf8');
