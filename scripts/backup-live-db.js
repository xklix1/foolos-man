/**
 * Full Database Automated Backup Script
 * Target: Ras ALmal Tycoon (Supabase Backend)
 * 
 * Fetches all records from each table with pagination and saves complete JSON snapshots
 * to backups/snapshot_<timestamp>/ and backups/snapshot_latest/
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SUPABASE_URL = 'https://rasalmal.online';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg4NTU5NzUzLCJleHAiOjIxMDM5MTk3NTN9.2465KGfimfRI4L3fZ6L6kXSOjPt6AC-0eHtchpt7F08';

const TABLES = [
  'players',
  'globals',
  'transfers',
  'transfer_requests',
  'mailbox',
  'gift_codes',
  'gangs'
];

async function fetchTableCount(table) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
      method: 'HEAD',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact'
      }
    });
    const cr = res.headers.get('content-range');
    if (!cr) return 0;
    const parts = cr.split('/');
    return parseInt(parts[1] || '0', 10);
  } catch (e) {
    console.warn(`[Backup] Warning: Could not get exact count for ${table}:`, e.message);
    return 0;
  }
}

async function fetchAllRows(table) {
  const count = await fetchTableCount(table);
  console.log(`[Backup] Fetching table '${table}' (Estimated rows: ${count})...`);

  const PAGE_SIZE = 200;
  let allRows = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=${PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (res.status === 404 || errText.includes('does not exist')) {
        console.log(`[Backup] Table '${table}' does not exist on remote, skipping.`);
        return null;
      }
      throw new Error(`Failed to fetch ${table} (offset ${offset}): HTTP ${res.status} - ${errText}`);
    }

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      hasMore = false;
    } else {
      allRows = allRows.concat(rows);
      offset += rows.length;
      if (rows.length < PAGE_SIZE) {
        hasMore = false;
      }
    }
  }

  console.log(`[Backup] ✓ Fetched ${allRows.length} rows for table '${table}'`);
  return allRows;
}

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rootDir = path.resolve(__dirname, '..');
  const backupDir = path.join(rootDir, 'backups', `snapshot_${timestamp}`);
  const latestDir = path.join(rootDir, 'backups', 'snapshot_latest');

  fs.mkdirSync(backupDir, { recursive: true });
  fs.mkdirSync(latestDir, { recursive: true });

  console.log(`====================================================`);
  console.log(`  Ras ALmal Tycoon — Full Database Snapshot Engine  `);
  console.log(`  Destination: ${backupDir}                         `);
  console.log(`====================================================\n`);

  const manifest = {
    timestamp: new Date().toISOString(),
    sourceUrl: SUPABASE_URL,
    tables: {},
    fileHashes: {}
  };

  for (const table of TABLES) {
    try {
      const rows = await fetchAllRows(table);
      if (rows !== null) {
        const jsonContent = JSON.stringify(rows, null, 2);
        const hash = crypto.createHash('sha256').update(jsonContent).digest('hex');

        // Write to timestamped snapshot
        const filePath = path.join(backupDir, `${table}.json`);
        fs.writeFileSync(filePath, jsonContent, 'utf-8');

        // Write to latest snapshot mirror
        const latestPath = path.join(latestDir, `${table}.json`);
        fs.writeFileSync(latestPath, jsonContent, 'utf-8');

        manifest.tables[table] = rows.length;
        manifest.fileHashes[`${table}.json`] = hash;
      }
    } catch (err) {
      console.error(`[Backup] ❌ Error backing up table ${table}:`, err.message);
      manifest.tables[table] = { error: err.message };
    }
  }

  // Save manifest
  const manifestJson = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(path.join(backupDir, 'manifest.json'), manifestJson, 'utf-8');
  fs.writeFileSync(path.join(latestDir, 'manifest.json'), manifestJson, 'utf-8');

  console.log('\n====================================================');
  console.log('✅ BACKUP COMPLETED SUCCESSFULLY');
  console.log('Summary of backed-up tables:');
  console.table(manifest.tables);
  console.log('====================================================');
}

runBackup().catch(err => {
  console.error('[Backup] Fatal Error during backup execution:', err);
  process.exit(1);
});
