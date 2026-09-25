const fs = require('fs');

console.log('=== Syncing client build version to v8.1.4 ===');

const filesToUpdate = ['index.html', 'sw.js', 'ui.js', 'db.js'];

filesToUpdate.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('v8.1.3')) {
      content = content.replaceAll('v8.1.3', 'v8.1.4');
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${file} to v8.1.4`);
    } else {
      console.log(`${file} does not contain v8.1.3`);
    }
  }
});

console.log('=== Version sync complete ===');
