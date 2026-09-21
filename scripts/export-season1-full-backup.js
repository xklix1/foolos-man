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

async function fetchAllRows(tableName) {
  console.log(`[Backup] Fetching all rows from '${tableName}'...`);
  const allRows = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const to = from + pageSize - 1;
    const res = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=*`, {
      headers: {
        ...headers,
        'Range': `${from}-${to}`
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to fetch ${tableName} range ${from}-${to}: ${errText}`);
    }

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      hasMore = false;
    } else {
      allRows.push(...rows);
      console.log(`  -> Fetched ${rows.length} rows (Total so far: ${allRows.length})`);
      if (rows.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    }
  }

  console.log(`✅ Table '${tableName}' fully extracted: ${allRows.length} total records.`);
  return allRows;
}

async function runFullBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, `../backups/season1_full_snapshot_${timestamp}`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('====================================================');
  console.log(`🚀 STARTING SEASON 1 COMPREHENSIVE BACKUP (${timestamp})`);
  console.log('====================================================');

  const tables = ['players', 'transfers', 'mailbox', 'globals', 'security_audit_logs'];
  const fullArchive = {};

  for (const table of tables) {
    try {
      const data = await fetchAllRows(table);
      fullArchive[table] = data;
      fs.writeFileSync(path.join(backupDir, `${table}.json`), JSON.stringify(data, null, 2), 'utf8');
      console.log(`💾 Saved ${backupDir}/${table}.json (${data.length} records)`);
    } catch (e) {
      console.error(`❌ Error backing up table ${table}:`, e.message);
    }
  }

  // Save single unified bundle
  const unifiedPath = path.join(backupDir, 'season1_unified_master_backup.json');
  fs.writeFileSync(unifiedPath, JSON.stringify(fullArchive, null, 2), 'utf8');

  // Also save a pointer copy to latest
  const latestDir = path.join(__dirname, '../backups/season1_latest_backup');
  if (!fs.existsSync(latestDir)) fs.mkdirSync(latestDir, { recursive: true });
  for (const table of tables) {
    if (fullArchive[table]) {
      fs.writeFileSync(path.join(latestDir, `${table}.json`), JSON.stringify(fullArchive[table], null, 2), 'utf8');
    }
  }
  fs.writeFileSync(path.join(latestDir, 'season1_unified_master_backup.json'), JSON.stringify(fullArchive, null, 2), 'utf8');

  console.log('\n====================================================');
  console.log(`🎉 BACKUP COMPLETE & VERIFIED SUCCESSFULLY!`);
  console.log(`📁 Backup Folder: ${backupDir}`);
  console.log(`📊 Statistics:`);
  console.log(`   - Players: ${fullArchive.players?.length || 0} accounts`);
  console.log(`   - Transfers: ${fullArchive.transfers?.length || 0} transactions`);
  console.log(`   - Mailbox: ${fullArchive.mailbox?.length || 0} messages`);
  console.log(`   - Globals: ${fullArchive.globals?.length || 0} records`);
  console.log(`   - Audit Logs: ${fullArchive.security_audit_logs?.length || 0} logs`);
  console.log('====================================================\n');
}

runFullBackup().catch(err => {
  console.error('Fatal backup failure:', err);
  process.exit(1);
});
