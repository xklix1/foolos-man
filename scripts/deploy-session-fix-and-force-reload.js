const fs = require('fs');
const path = require('path');
const https = require('https');

const rootDir = path.join(__dirname, '..');
const NEW_VER = 'v8.4.1';

// 1. Update version.json
const verJsonPath = path.join(rootDir, 'version.json');
if (fs.existsSync(verJsonPath)) {
  const vData = JSON.parse(fs.readFileSync(verJsonPath, 'utf8'));
  vData.version = NEW_VER;
  vData.timestamp = Date.now();
  vData.releaseNotes = 'Critical fix: Eliminate false-positive session conflict popup on initial login and action';
  fs.writeFileSync(verJsonPath, JSON.stringify(vData, null, 2), 'utf8');
  console.log(`✅ Updated version.json to ${NEW_VER}`);
}

// 2. Update version occurrences across files
const filesToUpdate = ['index.html', 'hq-vault-982-x3k8m7q.html', 'sw.js', 'ui.js', 'db.js'];
filesToUpdate.forEach(f => {
  const p = path.join(rootDir, f);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/v8\.4\.0/g, NEW_VER);
    fs.writeFileSync(p, content, 'utf8');
    console.log(`✅ Updated version in ${f}`);
  }
});

// 3. Send Force Reload to Supabase globals
const SUPABASE_URL = 'https://rasalmal.online/rest/v1';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhc2FsbWFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.eYpL5rQ7ZpYt8K9wX2mN4vB6c8xZ0qL3jK5hG7fD9sA';

async function sendForceReload() {
  const reloadTs = Date.now();
  console.log(`🚀 Sending Force Reload broadcast to all connected clients (${reloadTs})...`);

  // First fetch current globals
  const url = new URL(`${SUPABASE_URL}/globals?id=eq.system_settings`);
  
  const options = {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };

  const body = JSON.stringify({
    force_reload: reloadTs,
    version: NEW_VER,
    updated_at: new Date().toISOString()
  });

  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`📡 Supabase response [${res.statusCode}]:`, data);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Force reload broadcasted successfully via globals table!');
          resolve(data);
        } else {
          console.warn('⚠️ Non-200 response from globals PATCH:', data);
          resolve(data);
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Failed to send force reload to Supabase:', e.message);
      resolve(null);
    });

    req.write(body);
    req.end();
  });
}

sendForceReload().then(() => {
  console.log('🏁 Deployment & Broadcast complete.');
});
