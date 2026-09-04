const OLD_URL = 'https://rhuiaxrodnbjohowdlpo.supabase.co';
const OLD_KEY = 'sb_publishable_O2L34RTDz6k2UQvrkrNA_Q_t5Nty9t7';

const NEW_URL = 'http://77.37.122.34:8000';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg4NTU5NzUzLCJleHAiOjIxMDM5MTk3NTN9.2465KGfimfRI4L3fZ6L6kXSOjPt6AC-0eHtchpt7F08';

async function fetchFromOld(endpoint) {
  const res = await fetch(`${OLD_URL}/rest/v1/${endpoint}`, {
    headers: {
      'apikey': OLD_KEY,
      'Authorization': `Bearer ${OLD_KEY}`
    }
  });
  if (!res.ok) throw new Error(`Fetch failed ${endpoint}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function insertToNew(table, rows) {
  if (!rows || rows.length === 0) return;
  const res = await fetch(`${NEW_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': NEW_KEY,
      'Authorization': `Bearer ${NEW_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(rows)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Insert failed to ${table}: ${res.status} ${txt}`);
  }
  return res;
}

async function runMigration() {
  console.log('🚀 Starting Data Migration to Hostinger VPS Supabase...\n');

  // 1. Players
  console.log('1. Fetching players from old database...');
  const players = await fetchFromOld('players?select=*');
  console.log(`Found ${players.length} players. Inserting into new database...`);
  // Insert in batches of 50
  for (let i = 0; i < players.length; i += 50) {
    const chunk = players.slice(i, i + 50);
    await insertToNew('players', chunk);
    console.log(`   Inserted players ${i + 1} to ${Math.min(i + 50, players.length)}`);
  }
  console.log('✅ Players migration completed!');

  // 2. Globals
  console.log('\n2. Fetching globals...');
  const globals = await fetchFromOld('globals?select=*');
  console.log(`Found ${globals.length} global records. Inserting...`);
  await insertToNew('globals', globals);
  console.log('✅ Globals migration completed!');

  // 3. Gift Codes
  console.log('\n3. Fetching gift codes...');
  const giftCodes = await fetchFromOld('gift_codes?select=*');
  console.log(`Found ${giftCodes.length} gift codes. Inserting...`);
  await insertToNew('gift_codes', giftCodes);
  console.log('✅ Gift codes migration completed!');

  // 4. Mailbox (latest 200)
  console.log('\n4. Fetching latest 200 mailbox messages...');
  const mailbox = await fetchFromOld('mailbox?select=*&order=created_at.desc&limit=200');
  console.log(`Found ${mailbox.length} mailbox items. Inserting...`);
  if (mailbox.length > 0) {
    for (let i = 0; i < mailbox.length; i += 50) {
      const chunk = mailbox.slice(i, i + 50);
      await insertToNew('mailbox', chunk);
    }
  }
  console.log('✅ Mailbox migration completed!');

  console.log('\n🎉 ALL DATA MIGRATED TO VPS SUPABASE SUCCESSFULLY!');
}

runMigration().catch(err => {
  console.error('❌ Migration error:', err);
});
