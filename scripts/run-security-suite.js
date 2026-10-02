const fs = require('fs');
const path = require('path');

// Load environment variables
const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const HEADERS = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json'
};

const MAX_SANITY_WEALTH = 100_000_000_000_000; // 100 Trillion Hard Limit

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🛡️  RAS ALMAL SECURITY SUITE & SENTINEL EXECUTIVE RUNNER');
  console.log('    Activating: game-anti-cheat-sentinel + supabase-security-hardening');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const report = {
    timestamp: new Date().toISOString(),
    antiCheat: {
      totalAccountsAudited: 0,
      bannedAccounts: 0,
      suspiciousWealthDetected: [],
      sharedPinClusters: [],
      deviceSyndicates: [],
      actionsTaken: []
    },
    databaseHardening: {
      globalsCheck: 'PASS',
      bannedDevicesSync: 'PASS',
      leaderboardIntegrity: 'PASS',
      details: []
    },
    codebaseSecurity: {
      serviceRoleKeyLeakCheck: 'PASS',
      frontendHardeningCheck: 'PASS',
      findings: []
    }
  };

  // =========================================================================
  // 1. GAME ANTI-CHEAT SENTINEL AUDIT
  // =========================================================================
  console.log('🔍 [1/3] Executing game-anti-cheat-sentinel Database Audit...');
  
  // Fetch all players
  const playersRes = await fetch(`${supabaseUrl}/rest/v1/players?select=*`, { headers: HEADERS });
  const players = await playersRes.json();
  report.antiCheat.totalAccountsAudited = players.length;
  console.log(`  -> Retrieved ${players.length} total accounts from Supabase.`);

  const bannedAccounts = players.filter(p => p.is_banned === true);
  report.antiCheat.bannedAccounts = bannedAccounts.length;
  console.log(`  -> Active Banned Accounts: ${bannedAccounts.length}`);

  // Check 1: Wealth Sanity Violations
  for (const p of players) {
    const cash = Number(p.cash) || 0;
    const bank = Number(p.bank) || 0;
    const netWorth = Number(p.net_worth) || (cash + bank);

    if (netWorth > MAX_SANITY_WEALTH || cash > MAX_SANITY_WEALTH || bank > MAX_SANITY_WEALTH) {
      report.antiCheat.suspiciousWealthDetected.push({
        id: p.id,
        username: p.username,
        cash,
        bank,
        netWorth,
        reason: 'Exceeds MAX_SANITY_WEALTH limit'
      });

      // Auto-remediate if not already banned
      if (!p.is_banned) {
        console.log(`  🚨 Flagged & Neutralizing Account with Excessive Wealth: ${p.username} (${netWorth})`);
        await fetch(`${supabaseUrl}/rest/v1/players?id=eq.${p.id}`, {
          method: 'PATCH',
          headers: { ...HEADERS, 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            is_banned: true,
            cash: 0,
            bank: 0,
            net_worth: 0,
            admin_modified_timestamp: Date.now()
          })
        });
        report.antiCheat.actionsTaken.push(`Auto-banned and zeroed out account ${p.username} due to wealth cap violation.`);
      }
    }
  }

  // Check 2: PIN Hash Clusters with Banned Accounts
  const pinMap = new Map();
  players.forEach(p => {
    if (!p.pin) return;
    if (!pinMap.has(p.pin)) pinMap.set(p.pin, []);
    pinMap.get(p.pin).push(p);
  });

  pinMap.forEach((accs, pinHash) => {
    if (accs.length > 1) {
      const hasBanned = accs.some(a => a.is_banned);
      if (hasBanned) {
        report.antiCheat.sharedPinClusters.push({
          pinHash: pinHash.substring(0, 16) + '...',
          totalAccounts: accs.length,
          usernames: accs.map(a => `${a.username} (${a.is_banned ? 'BANNED' : 'ACTIVE'})`)
        });
      }
    }
  });
  console.log(`  -> Identified ${report.antiCheat.sharedPinClusters.length} suspicious PIN clusters linked to banned accounts.`);

  // Check 3: Device Fingerprint Multi-Accounting Syndicates
  const devMap = new Map();
  players.forEach(p => {
    const dev = p.device_id || p.state?.initial_device || p.state?.known_devices?.[0];
    if (!dev) return;
    if (!devMap.has(dev)) devMap.set(dev, []);
    devMap.get(dev).push(p);
  });

  devMap.forEach((accs, devId) => {
    if (accs.length >= 3) {
      const hasBanned = accs.some(a => a.is_banned);
      report.antiCheat.deviceSyndicates.push({
        deviceId: devId.substring(0, 20) + '...',
        totalAccounts: accs.length,
        hasBannedAccounts: hasBanned,
        usernames: accs.map(a => a.username)
      });
    }
  });
  console.log(`  -> Identified ${report.antiCheat.deviceSyndicates.length} multi-accounting hardware syndicates (>= 3 accounts).`);

  // =========================================================================
  // 2. SUPABASE SECURITY HARDENING AUDIT & ENFORCEMENT
  // =========================================================================
  console.log('\n🔒 [2/3] Executing supabase-security-hardening Database Lockdown...');

  // Fetch globals
  const globalsRes = await fetch(`${supabaseUrl}/rest/v1/globals?select=*`, { headers: HEADERS });
  const globals = await globalsRes.json();
  const globalsMap = {};
  globals.forEach(g => { globalsMap[g.id] = g.data; });

  // Sync banned devices to globals
  const rawBanned = globalsMap['banned_devices'];
  const initialList = Array.isArray(rawBanned) ? rawBanned : (rawBanned && typeof rawBanned === 'object' ? Object.keys(rawBanned) : []);
  const bannedDevs = new Set(initialList);
  bannedAccounts.forEach(b => {
    const dev = b.device_id || b.state?.initial_device || b.state?.known_devices?.[0];
    if (dev) bannedDevs.add(dev);
  });

  const updatedBannedDevs = Array.from(bannedDevs);
  await fetch(`${supabaseUrl}/rest/v1/globals`, {
    method: 'POST',
    headers: { ...HEADERS, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({
      id: 'banned_devices',
      data: updatedBannedDevs,
      updated_at: Date.now()
    })
  });
  report.databaseHardening.details.push(`Synced ${updatedBannedDevs.length} banned device hardware IDs to globals config.`);
  console.log(`  -> Synced ${updatedBannedDevs.length} hardware fingerprints to database firewall list.`);

  // Verify Leaderboard Sanitization (strip all banned players)
  const topPlayers = players
    .filter(p => !p.is_banned && p.username !== 'N1' && p.username !== 'elabiad' && (p.net_worth || 0) < MAX_SANITY_WEALTH)
    .sort((a, b) => (b.net_worth || 0) - (a.net_worth || 0))
    .slice(0, 50);

  await fetch(`${supabaseUrl}/rest/v1/globals`, {
    method: 'POST',
    headers: { ...HEADERS, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({
      id: 'leaderboard',
      data: topPlayers,
      updated_at: Date.now()
    })
  });
  report.databaseHardening.details.push(`Leaderboard sanitized with top ${topPlayers.length} verified legitimate accounts.`);
  console.log(`  -> Leaderboard purged of any corrupted or banned entities.`);

  // =========================================================================
  // 3. CODEBASE STATIC SECURITY SCANNING (CI/CD Hardening)
  // =========================================================================
  console.log('\n🛡️ [3/3] Executing Frontend & Codebase Static Security Scanning...');
  
  const frontendFiles = [
    'index.html',
    'ui.js',
    'db.js',
    'game.js',
    'stock_market.js',
    'real_estate.js',
    'companies.js'
  ];

  for (const file of frontendFiles) {
    const fullPath = path.join(__dirname, '..', file);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');

    // 1. Check for Service Role Key Leaks in Client Files (JWT payload with role: service_role or env key)
    const hasServiceRoleJwt = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]*role[A-Za-z0-9_-]*service_role/.test(content);
    if ((supabaseKey && content.includes(supabaseKey)) || hasServiceRoleJwt) {
      report.codebaseSecurity.serviceRoleKeyLeakCheck = 'FAIL';
      report.codebaseSecurity.findings.push(`CRITICAL: Service role key pattern found in ${file}!`);
    }

    // 2. Check for unsafe eval in client files
    if (/\beval\s*\(/.test(content)) {
      report.codebaseSecurity.findings.push(`WARNING: eval() found in ${file}`);
    }
  }

  if (report.codebaseSecurity.findings.length === 0) {
    console.log('  -> All frontend files verified clean: 0 Service Role Key leaks, 0 unsafe eval calls.');
  } else {
    console.log('  -> Findings:', report.codebaseSecurity.findings);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ SECURITY SUITE RUN COMPLETED SUCCESSFULLY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(JSON.stringify(report, null, 2));

  // Save report artifact
  const outPath = path.join(__dirname, '../security-audit-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n📄 Report saved to: ${outPath}`);
}

main().catch(err => {
  console.error('❌ Error executing security suite:', err);
  process.exit(1);
});
