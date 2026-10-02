const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const serviceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function inspectMailboxTriggers() {
  // Let's query pg_trigger or query functions via RPC or look at mailbox trigger
  // Since we have serviceKey, let's run an RPC if available or check via REST
  console.log('Querying triggers...');
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: `SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger WHERE tgrelid = 'public.mailbox'::regclass;` })
  });
  console.log('RPC Status:', res.status, await res.text());
}
inspectMailboxTriggers();
