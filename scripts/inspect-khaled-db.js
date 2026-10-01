const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function inspectKhaled() {
  const pRes = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.خالد`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const pData = await pRes.json();
  console.log('--- PLAYER "خالد" IN SUPABASE ---');
  console.log(JSON.stringify(pData, null, 2));

  const pResEng = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.Khaled`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const pDataEng = await pResEng.json();
  console.log('--- PLAYER "Khaled" IN SUPABASE ---');
  console.log(JSON.stringify(pDataEng, null, 2));

  const mRes = await fetch(`${supabaseUrl}/rest/v1/mailbox?recipient=ilike.خالد&order=id.desc&limit=5`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const mData = await mRes.json();
  console.log('--- MAILBOX FOR "خالد" ---');
  console.log(JSON.stringify(mData, null, 2));
}

inspectKhaled();
