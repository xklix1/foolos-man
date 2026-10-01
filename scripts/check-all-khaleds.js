const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function checkBoth() {
  const p1 = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.خالد`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  }).then(r => r.json());
  
  const p2 = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.khaled`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  }).then(r => r.json());

  console.log('Result for "خالد":', JSON.stringify(p1, null, 2));
  console.log('Result for "khaled":', JSON.stringify(p2, null, 2));
}

checkBoth();
