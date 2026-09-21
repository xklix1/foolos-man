const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates'
};

async function restoreTable(tableName, rows) {
  if (!rows || rows.length === 0) return;
  console.log(`[Restore] Restoring ${rows.length} records into '${tableName}'...`);

  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const res = await fetch(`${supabaseUrl}/rest/v1/${tableName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk)
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`❌ Failed to restore chunk ${i}-${i + chunk.length} of ${tableName}:`, err);
    } else {
      console.log(`  -> Restored chunk ${i + 1} to ${Math.min(i + chunkSize, rows.length)} of ${tableName}`);
    }
  }
  console.log(`✅ Table '${tableName}' restored successfully!`);
}

async function runRestore(backupDirName) {
  const targetDir = backupDirName
    ? path.join(__dirname, '../backups', backupDirName)
    : path.join(__dirname, '../backups/season1_latest_backup');

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Backup directory not found: ${targetDir}`);
    process.exit(1);
  }

  console.log('====================================================');
  console.log(`🔄 RESTORING DATA FROM: ${targetDir}`);
  console.log('====================================================');

  const tables = ['players', 'transfers', 'mailbox', 'globals'];
  for (const table of tables) {
    const filePath = path.join(targetDir, `${table}.json`);
    if (fs.existsSync(filePath)) {
      const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      await restoreTable(table, rows);
    }
  }

  console.log('\n🎉 ALL TABLES RESTORED SUCCESSFULLY!');
}

const dirArg = process.argv[2];
runRestore(dirArg).catch(err => {
  console.error('Fatal restore error:', err);
  process.exit(1);
});
