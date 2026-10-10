const fs = require('fs');
const path = require('path');

// Update db.js
const dbPath = path.join(__dirname, '../db.js');
let db = fs.readFileSync(dbPath, 'utf8');

// Remove the /api/admin/process-topup block and make processTopupRequest clean and robust
const oldProcessTopupFunc = ` async function processTopupRequest(requestId, action, reviewerNote ='') {
    const ts = Date.now();
    const adminToken = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('rasalmal_admin_auth_token')) ||
                       (typeof localStorage !== 'undefined' && localStorage.getItem('rasalmal_admin_auth_token'));

    // Try authoritative server endpoint first
    if (adminToken) {
      try {
        const res = await fetch('/api/admin/process-topup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken
          },
          body: JSON.stringify({ requestId, action, reviewerNote })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.request) {
            console.log('[DB] Authoritative topup process succeeded via /api/admin/process-topup');
            return data.request;
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || \`Server process topup failed: HTTP \${res.status}\`);
        }
      } catch (srvErr) {
        if (!srvErr.message.includes('404') && !srvErr.message.includes('Failed to fetch')) {
          throw srvErr;
        }
        console.warn('[DB] Fallback from /api/admin/process-topup:', srvErr.message);
      }
    }
    const rows = await _api(\`globals?id=eq.topup_requests\`);`;

const newProcessTopupFunc = ` async function processTopupRequest(requestId, action, reviewerNote ='') {
    const ts = Date.now();
    const rows = await _api(\`globals?id=eq.topup_requests\`);`;

if (db.includes(oldProcessTopupFunc)) {
  db = db.replace(oldProcessTopupFunc, newProcessTopupFunc);
  console.log(' Cleaned up processTopupRequest in db.js to use Authoritative _api / mutate bridge');
}

fs.writeFileSync(dbPath, db, 'utf8');
