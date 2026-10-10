const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../db.js');
let db = fs.readFileSync(dbPath, 'utf8');

// 1. In processTopupRequest
const oldGlobalsPost1 = ` await _api('globals', {
      method:'POST',
      headers: {'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify({
        id:'topup_requests',
        data: { requests, updatedAt: ts },
        updated_at: ts
      })
    });`;

const newGlobalsPost1 = ` await _api('globals?id=eq.topup_requests', {
      method:'PATCH',
      body: JSON.stringify({
        data: { requests, updatedAt: ts },
        updated_at: ts
      })
    });`;

if (db.includes(oldGlobalsPost1)) {
  db = db.replace(oldGlobalsPost1, newGlobalsPost1);
  console.log(' [1/2] Replaced globals POST with PATCH in processTopupRequest');
}

// 2. In deleteTopupRequest
const oldGlobalsPost2 = ` await _api('globals', {
      method:'POST',
      headers: {'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify({
        id:'topup_requests',
        data: { requests, updatedAt: ts },
        updated_at: ts
      })
    });`;

const newGlobalsPost2 = ` await _api('globals?id=eq.topup_requests', {
      method:'PATCH',
      body: JSON.stringify({
        data: { requests, updatedAt: ts },
        updated_at: ts
      })
    });`;

if (db.includes(oldGlobalsPost2)) {
  db = db.replace(oldGlobalsPost2, newGlobalsPost2);
  console.log(' [2/2] Replaced globals POST with PATCH in deleteTopupRequest');
}

fs.writeFileSync(dbPath, db, 'utf8');
