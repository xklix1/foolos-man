const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function run() {
  // 1. Check all recent transfers in transfers table
  const res1 = await fetch(`${supabaseUrl}/rest/v1/transfers?order=created_at.desc&limit=25`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const transfers = await res1.json();
  console.log('--- RECENT 25 TRANSFERS ---');
  transfers.forEach(t => {
    console.log(`[${new Date(t.created_at).toISOString()}] Sender: ${t.sender} -> Recipient: ${t.recipient} | Amount: ${t.amount}`);
  });

  // 2. Check all recent mailbox messages to MarkEshak
  const res2 = await fetch(`${supabaseUrl}/rest/v1/mailbox?recipient=ilike.*mark*&order=created_at.desc&limit=10`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const mails = await res2.json();
  console.log('\n--- RECENT MAILS TO MARK ---');
  console.log(JSON.stringify(mails, null, 2));

  // 3. Check MarkEshak player row
  const res3 = await fetch(`${supabaseUrl}/rest/v1/players?username=ilike.markeshak`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const [mark] = await res3.json();
  console.log('\n--- MARK CURRENT ROW ---');
  console.log('Username:', mark?.username);
  console.log('Bank col:', mark?.bank, 'Cash col:', mark?.cash, 'NetWorth col:', mark?.net_worth);
  console.log('admin_modified_timestamp:', mark?.admin_modified_timestamp);
  console.log('state.adminModifiedTimestamp:', mark?.state?.adminModifiedTimestamp);
  console.log('state.bank:', mark?.state?.bank, 'state.cash:', mark?.state?.cash);
  console.log('last_seen:', new Date(mark?.last_seen).toISOString());
}

run().catch(console.error);
