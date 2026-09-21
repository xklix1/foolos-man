const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

async function triggerServerWideReload(customMessage) {
  const message = customMessage || 'تم إطلاق تحديث برمجي جديد لتحسين الاستقرار وحماية الحسابات. جاري إعادة تحميل اللعبة...';
  const now = Date.now();

  console.log(`[ForceReload] Broadcasting server-wide hard update signal... (Timestamp: ${now})`);

  const res = await fetch(`${supabaseUrl}/rest/v1/globals?id=eq.force_reload`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      data: {
        timestamp: now,
        message: message
      }
    })
  });

  if (res.ok) {
    console.log('✅ Server-wide force reload broadcasted successfully! All players will automatically update within 3 seconds.');
  } else {
    console.error('❌ Failed to broadcast force reload:', await res.text());
  }
}

const msgArg = process.argv.slice(2).join(' ');
triggerServerWideReload(msgArg);
