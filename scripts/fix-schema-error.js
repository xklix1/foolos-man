const fs = require('fs');

let dbJs = fs.readFileSync('db.js', 'utf8');

// 1. Fix adminSetPlayerSuspicion payload: remove under_suspicion root column
const badPayload = `      body: JSON.stringify({
        state: curState,
        under_suspicion: Boolean(underSuspicion),
        admin_modified_timestamp: now
      })`;

const cleanPayload = `      body: JSON.stringify({
        state: curState,
        admin_modified_timestamp: now
      })`;

if (dbJs.includes(badPayload)) {
  dbJs = dbJs.replace(badPayload, cleanPayload);
  console.log('1. Cleaned badPayload from adminSetPlayerSuspicion');
}

// 2. Clean getPlayerState: ensure it reads underSuspicion from state
dbJs = dbJs.replaceAll('r.under_suspicion ||', '');
dbJs = dbJs.replaceAll('row.under_suspicion ||', '');

fs.writeFileSync('db.js', dbJs, 'utf8');
console.log('2. Updated db.js successfully');
