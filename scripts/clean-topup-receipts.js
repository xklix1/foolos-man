const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const serviceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function cleanPendingMails() {
  const recipients = ['خالد', 'Khaled', 'Asd', '7ablas', 'Osos', 'tito2761'];
  for (const r of recipients) {
    const res = await fetch(`${supabaseUrl}/rest/v1/mailbox?recipient=ilike.${encodeURIComponent(r)}&type=in.(topup_receipt,admin_balance_grant)&status=eq.unread`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ status: 'read' })
    });
    console.log(`Cleaned unread receipts for "${r}":`, res.status);
  }
}
cleanPendingMails();
