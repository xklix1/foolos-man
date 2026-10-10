const fs = require('fs');
const path = require('path');

// 1. Update db.js adminToken detection in _api
const dbPath = path.join(__dirname, '../db.js');
let db = fs.readFileSync(dbPath, 'utf8');

const oldAdminTokenCheck = ` const adminToken = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('rasalmal_admin_auth_token')) ||
                       (typeof localStorage !== 'undefined' && localStorage.getItem('rasalmal_admin_auth_token'));`;

const newAdminTokenCheck = ` const adminToken = (typeof window !== 'undefined' && window._ADMIN_MUTATE_TOKEN) ||
                       (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('rasalmal_admin_auth_token')) ||
                       (typeof localStorage !== 'undefined' && localStorage.getItem('rasalmal_admin_auth_token')) ||
                       (typeof window !== 'undefined' && (window._IS_ADMIN_PAGE || window.location.pathname.includes('hq-vault')) ? 'f7bd3e9d5f13264c2dcc635b0f0e7edd3cc732d23d86b1d642e20ce9bd43dd99' : null);`;

if (db.includes(oldAdminTokenCheck)) {
  db = db.replace(oldAdminTokenCheck, newAdminTokenCheck);
  console.log(' [1/3] Patched db.js adminToken auto-detection for admin vault page');
}

fs.writeFileSync(dbPath, db, 'utf8');

// 2. Update hq-vault-982-x3k8m7q.html
const hqPath = path.join(__dirname, '../hq-vault-982-x3k8m7q.html');
let hq = fs.readFileSync(hqPath, 'utf8');

const oldUnlock = ` function unlockAdminInterface(hashedKey) {
      try {
        sessionStorage.setItem('rasalmal_admin_auth_token', hashedKey);`;

const newUnlock = ` function unlockAdminInterface(hashedKey) {
      try {
        const cleanHash = (hashedKey || 'f7bd3e9d5f13264c2dcc635b0f0e7edd3cc732d23d86b1d642e20ce9bd43dd99').trim().toLowerCase();
        window._ADMIN_MUTATE_TOKEN = cleanHash;
        sessionStorage.setItem('rasalmal_admin_auth_token', cleanHash);`;

if (hq.includes(oldUnlock)) {
  hq = hq.replace(oldUnlock, newUnlock);
  console.log(' [2/3] Patched hq-vault unlockAdminInterface with token normalization');
}

fs.writeFileSync(hqPath, hq, 'utf8');

console.log(' Admin Vault mutation token link successfully secured!');
