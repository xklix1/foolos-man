const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const serviceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function testMailboxInsert() {
  const mailObj = {
    sender: 'إدارة اللعبة (Financial Team)',
    recipient: 'خالد',
    type: 'topup_receipt',
    payload: {
      packageName: 'باقة الاختبار',
      price: 100,
      cash: 500000,
      bank: 500000,
      isPreApplied: true,
      date: Date.now()
    },
    status: 'unread',
    created_at: Date.now()
  };

  console.log('1. Testing POST to mailbox with Prefer: resolution=merge-duplicates...');
  const res1 = await fetch(`${supabaseUrl}/rest/v1/mailbox`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates, return=representation'
    },
    body: JSON.stringify(mailObj)
  });
  console.log('Status 1:', res1.status, res1.statusText);
  console.log('Response 1:', await res1.text());

  console.log('\n2. Testing POST to mailbox with Prefer: return=representation...');
  const res2 = await fetch(`${supabaseUrl}/rest/v1/mailbox`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(mailObj)
  });
  console.log('Status 2:', res2.status, res2.statusText);
  console.log('Response 2:', await res2.text());
}

testMailboxInsert();
