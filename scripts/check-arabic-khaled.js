const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function checkArabicKhaled() {
  const p1 = await fetch(`${supabaseUrl}/rest/v1/players?username=eq.خالد`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  }).then(r => r.json());
  
  if (p1 && p1[0]) {
    const p = p1[0];
    console.log('--- ARABIC KHLED ("خالد") ---');
    console.log(`id: ${p.id}, username: "${p.username}", cash: ${p.cash}, bank: ${p.bank}, gold: ${p.gold}, admin_modified_timestamp: ${p.admin_modified_timestamp}`);
    console.log(`state.cash: ${p.state?.cash}, state.bank: ${p.state?.bank}, state.adminModifiedTimestamp: ${p.state?.adminModifiedTimestamp}`);
    console.log(`state.activePackage: ${p.state?.activePackage}, state.chatGlow: ${p.state?.chatGlow}`);
  }
}

checkArabicKhaled();
