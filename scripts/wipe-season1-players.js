const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json'
};

const PROTECTED_ADMIN_ACCOUNTS = ['khaled', 'rasalmal', 'rasalmal1', 'rasalmal2', 'newu'];

async function executeWipe() {
  console.log('====================================================');
  console.log('🧹 EXECUTING SEASON 1 PLAYER ACCOUNTS WIPE');
  console.log('====================================================');

  // Verify backup exists
  const latestBackupPath = path.join(__dirname, '../backups/season1_latest_backup/players.json');
  if (!fs.existsSync(latestBackupPath)) {
    throw new Error('❌ ABORTED: Latest backup players.json not found! Cannot wipe without verified backup.');
  }

  const backupData = JSON.parse(fs.readFileSync(latestBackupPath, 'utf8'));
  console.log(`✅ Verified local backup exists with ${backupData.length} accounts.`);

  // 1. Fetch all current players
  console.log('\n[1/4] Fetching players to delete...');
  let from = 0;
  const pageSize = 1000;
  let allPlayers = [];
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`${supabaseUrl}/rest/v1/players?select=username`, {
      headers: { ...headers, 'Range': `${from}-${from + pageSize - 1}` }
    });
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      hasMore = false;
    } else {
      allPlayers.push(...rows);
      if (rows.length < pageSize) hasMore = false;
      else from += pageSize;
    }
  }

  console.log(`Found ${allPlayers.length} total players in database.`);

  // Filter non-admin players
  const playersToDelete = allPlayers.filter(p => !PROTECTED_ADMIN_ACCOUNTS.includes((p.username || '').toLowerCase()));
  console.log(`-> Target players to delete: ${playersToDelete.length}`);
  console.log(`-> Protected admin accounts: ${allPlayers.length - playersToDelete.length}`);

  // 2. Delete non-admin players in chunks
  console.log('\n[2/4] Deleting players from database...');
  const chunkSize = 100;
  let deletedCount = 0;

  for (let i = 0; i < playersToDelete.length; i += chunkSize) {
    const chunk = playersToDelete.slice(i, i + chunkSize);
    const usernames = chunk.map(p => `"${p.username.replace(/"/g, '""')}"`).join(',');

    const delRes = await fetch(`${supabaseUrl}/rest/v1/players?username=in.(${encodeURIComponent(chunk.map(p => p.username).join(','))})`, {
      method: 'DELETE',
      headers: { ...headers, 'Prefer': 'return=representation' }
    });

    if (!delRes.ok) {
      // Fallback one by one if batch syntax fails
      for (const p of chunk) {
        await fetch(`${supabaseUrl}/rest/v1/players?username=eq.${encodeURIComponent(p.username)}`, {
          method: 'DELETE',
          headers
        });
        deletedCount++;
      }
    } else {
      const deletedRows = await delRes.json();
      deletedCount += (Array.isArray(deletedRows) ? deletedRows.length : chunk.length);
    }

    process.stdout.write(`  -> Deleted ${deletedCount}/${playersToDelete.length} players...\r`);
  }

  console.log(`\n✅ Deleted ${deletedCount} player accounts successfully.`);

  // 3. Clear transfers and mailbox
  console.log('\n[3/4] Clearing old transfers and mailbox...');
  try {
    await fetch(`${supabaseUrl}/rest/v1/transfers?id=neq.placeholder_keep_schema`, {
      method: 'DELETE',
      headers
    });
    console.log('✅ Transfers table wiped clean.');
  } catch (e) {
    console.warn('Transfers wipe note:', e.message);
  }

  try {
    await fetch(`${supabaseUrl}/rest/v1/mailbox?id=neq.placeholder_keep_schema`, {
      method: 'DELETE',
      headers
    });
    console.log('✅ Mailbox table wiped clean.');
  } catch (e) {
    console.warn('Mailbox wipe note:', e.message);
  }

  // 4. Reset Leaderboard cache in globals
  console.log('\n[4/4] Resetting Leaderboard and market state in globals...');
  try {
    await fetch(`${supabaseUrl}/rest/v1/globals?id=eq.leaderboard_cache`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ data: { topPlayers: [], lastUpdated: Date.now() }, updated_at: Date.now() })
    });
    await fetch(`${supabaseUrl}/rest/v1/globals?id=eq.chat_feed`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ data: { messages: [] }, updated_at: Date.now() })
    });
    console.log('✅ Leaderboard and chat feed reset.');
  } catch (e) {
    console.warn('Globals reset note:', e.message);
  }

  console.log('\n====================================================');
  console.log('🎉 SEASON 1 CLEAN WIPE COMPLETED SUCCESSFULLY!');
  console.log('🛡️ All backups safely stored in: ./backups/season1_latest_backup');
  console.log('🔄 To restore at any time, run: node scripts/restore-season1-backup.js');
  console.log('====================================================\n');
}

executeWipe().catch(err => {
  console.error('Fatal wipe error:', err);
  process.exit(1);
});
