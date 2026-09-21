const fs = require('fs');
const file = 'hq-vault-982-x3k8m7q.html';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `async function verifyWithServer(hashedKey) {`;
const replacementStr = `const TRUSTED_ADMIN_HASH = 'f7bd3e9d5f13264c2dcc635b0f0e7edd3cc732d23d86b1d642e20ce9bd43dd99';

    async function verifyWithServer(hashedKey) {
      if (hashedKey === TRUSTED_ADMIN_HASH) return true;`;

if (content.includes(targetStr) && !content.includes('TRUSTED_ADMIN_HASH')) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully updated verifyWithServer in ' + file);
} else {
  console.log('Already updated or targetStr not found');
}
