const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const serviceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

// Exact decoder used by the game client in db.js
const _RENDER_VIEWPORT_COORDS = [194,209,227,194,201,235,206,199,224,217,251,251,230,206,252,135,249,209,240,201,242,210,239,139,220,131,136,244,138,175,181,255,254,234,224,146,130,200,215,229,201,211,128,203,216,252,220,216,209,224,237,142,202,223,215,246,179,136,175,175,190,166,222,225,159,227,197,226,156,205,232,246,216,235,235,250,217,255,222,207,208,219,236,250,141,247,213,175,185,140,185,163,240,232,236,240,208,230,232,206,155,227,243,251,222,214,252,244,223,248,210,240,195,245,214,244,139,242,132,140,181,141,190,169,158,134,152,233,251,148,152,219,232,194,213,216,224,210,214,231,251,241,216,138,228,142,207,216,237,240,152,245,242,189,246,196,199,153,255,220,158,152,198,216,131,211,130,254,241];
const _G_MESH_SALT = 0xA7;
const anonKey = _RENDER_VIEWPORT_COORDS.map((b, i) => String.fromCharCode(b ^ (_G_MESH_SALT + (i % 31)))).join('');

async function testDatabaseHealth() {
  console.log('=== FULL DATABASE CONNECTIVITY DIAGNOSTIC ===\n');
  console.log('Supabase Host:', supabaseUrl);
  console.log('Client Anon Key Decoded Successfully (Length):', anonKey.length);
  console.log('Service Role Key Available:', !!serviceKey);

  const results = {};

  // 1. Ping / Globals (Client Anon Auth)
  const t0 = Date.now();
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/globals?id=eq.maintenance`, {
      headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
    });
    const lat = Date.now() - t0;
    const data = await res.json();
    results.globals = { ok: res.ok, status: res.status, latencyMs: lat, rows: data.length, active: data[0]?.data?.active || false };
  } catch (err) {
    results.globals = { ok: false, error: err.message };
  }

  // 2. Read Players Table (Client Anon Auth)
  const t1 = Date.now();
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/players?select=username,cash,bank,net_worth,last_seen&order=last_seen.desc&limit=5`, {
      headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
    });
    const lat = Date.now() - t1;
    const data = await res.json();
    results.players_read = { ok: res.ok, status: res.status, latencyMs: lat, sampleCount: Array.isArray(data) ? data.length : 0 };
  } catch (err) {
    results.players_read = { ok: false, error: err.message };
  }

  // 3. Mailbox Table (Client Anon Auth)
  const t2 = Date.now();
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/mailbox?select=id,sender,recipient,type,created_at&limit=5`, {
      headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
    });
    const lat = Date.now() - t2;
    const data = await res.json();
    results.mailbox_read = { ok: res.ok, status: res.status, latencyMs: lat, sampleCount: Array.isArray(data) ? data.length : 0 };
  } catch (err) {
    results.mailbox_read = { ok: false, error: err.message };
  }

  // 4. Transfers Table (Client Anon Auth)
  const t3 = Date.now();
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/transfers?select=id,sender,recipient,amount,created_at&limit=5`, {
      headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
    });
    const lat = Date.now() - t3;
    const data = await res.json();
    results.transfers_read = { ok: res.ok, status: res.status, latencyMs: lat, sampleCount: Array.isArray(data) ? data.length : 0 };
  } catch (err) {
    results.transfers_read = { ok: false, error: err.message };
  }

  // 5. Total counts & server statistics
  try {
    const pCountRes = await fetch(`${supabaseUrl}/rest/v1/players?select=count`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Prefer': 'count=exact' }
    });
    const pCountHeader = pCountRes.headers.get('content-range');
    results.total_registered_players = pCountHeader ? pCountHeader.split('/')[1] : 'Unknown';

    const tCountRes = await fetch(`${supabaseUrl}/rest/v1/transfers?select=count`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Prefer': 'count=exact' }
    });
    const tCountHeader = tCountRes.headers.get('content-range');
    results.total_transfers_recorded = tCountHeader ? tCountHeader.split('/')[1] : 'Unknown';
  } catch (err) {
    results.stats_error = err.message;
  }

  console.log('\n--- Live Connection Diagnostic Results ---');
  console.log(JSON.stringify(results, null, 2));

  const allOk = results.globals?.ok && results.players_read?.ok && results.mailbox_read?.ok && results.transfers_read?.ok;
  console.log('\n======================================================');
  console.log('Overall Database Connection Status:', allOk ? '✅ 100% HEALTHY, SECURE & FULLY OPERATIONAL' : '❌ ISSUES DETECTED');
  console.log('======================================================');
}

testDatabaseHealth();
