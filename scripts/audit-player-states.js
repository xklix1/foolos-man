/**
 * Schema & State Auditor
 * Inspects all 356 players in backups/snapshot_latest/players.json
 * Identifies:
 * - All unique root keys in player.state
 * - Missing/undefined fields across player accounts
 * - Corrupted or edge-case records
 * - Generates canonical schema model for Server-Authoritative engine
 */

const fs = require('fs');
const path = require('path');

const backupPath = path.resolve(__dirname, '../backups/snapshot_latest/players.json');
if (!fs.existsSync(backupPath)) {
  console.error('Error: backups/snapshot_latest/players.json not found!');
  process.exit(1);
}

const rawData = fs.readFileSync(backupPath, 'utf-8');
const players = JSON.parse(rawData);

console.log(`====================================================`);
console.log(`  Ras ALmal Tycoon — Player State Schema Audit      `);
console.log(`  Total Player Records Analyzed: ${players.length}  `);
console.log(`====================================================\n`);

const stateKeyFrequencies = {};
const typeDistributions = {};
let nullStateCount = 0;
let validStateCount = 0;
let withAfkManager = 0;
let withBusinesses = 0;
let withStocks = 0;
let withCrypto = 0;

players.forEach((p, idx) => {
  const state = p.state;
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    nullStateCount++;
    return;
  }

  validStateCount++;
  if (state.afkManagerExpiresAt && Number(state.afkManagerExpiresAt) > 0) withAfkManager++;
  if (state.businesses && Object.keys(state.businesses).length > 0) withBusinesses++;
  if (state.stocks && Object.keys(state.stocks).length > 0) withStocks++;
  if (state.crypto && Object.keys(state.crypto).length > 0) withCrypto++;

  Object.keys(state).forEach(key => {
    stateKeyFrequencies[key] = (stateKeyFrequencies[key] || 0) + 1;
    const valType = typeof state[key];
    if (!typeDistributions[key]) typeDistributions[key] = new Set();
    typeDistributions[key].add(valType);
  });
});

console.log(`Summary Statistics:`);
console.log(`- Valid States: ${validStateCount} / ${players.length}`);
console.log(`- Null / Empty States: ${nullStateCount}`);
console.log(`- Accounts with Active/Past AFK Manager: ${withAfkManager}`);
console.log(`- Accounts with Businesses: ${withBusinesses}`);
console.log(`- Accounts with Stocks: ${withStocks}`);
console.log(`- Accounts with Crypto: ${withCrypto}\n`);

// Sort keys by presence
const sortedKeys = Object.entries(stateKeyFrequencies).sort((a, b) => b[1] - a[1]);
console.log(`Key Presence Across Player Accounts:`);
const reportRows = sortedKeys.map(([k, count]) => ({
  Key: k,
  Occurrences: `${count} (${Math.round(count / validStateCount * 100)}%)`,
  ObservedTypes: Array.from(typeDistributions[k] || []).join(', ')
}));

console.table(reportRows.slice(0, 30)); // Top 30 keys

// Save detailed audit report
const auditOutput = {
  totalPlayers: players.length,
  validStates: validStateCount,
  nullStates: nullStateCount,
  keyPresence: sortedKeys.map(([k, count]) => ({
    key: k,
    count,
    percentage: Math.round(count / validStateCount * 100),
    types: Array.from(typeDistributions[k] || [])
  }))
};

const reportPath = path.resolve(__dirname, '../backups/snapshot_latest/schema_audit.json');
fs.writeFileSync(reportPath, JSON.stringify(auditOutput, null, 2), 'utf-8');
console.log(`\n✅ Detailed schema audit saved to ${reportPath}`);
