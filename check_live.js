const fs = require('fs');
const env = fs.readFileSync('server/.env', 'utf8');
const urlMatch = env.match(/SUPABASE_URL=([^\r\n]+)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/) || env.match(/SUPABASE_KEY=([^\r\n]+)/);
const url = urlMatch[1].trim();
const key = keyMatch[1].trim();

async function check() {
  const res = await fetch(url + '/rest/v1/globals?id=eq.maintenance', {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  const data = await res.json();
  console.log('Supabase Maintenance Data:', JSON.stringify(data, null, 2));

  try {
    const liveVerRes = await fetch('https://rasalmal.online/version.json?_t=' + Date.now());
    const liveVer = await liveVerRes.text();
    console.log('Live server version.json:', liveVer);
  } catch (e) {
    console.log('Error fetching live version.json:', e.message);
  }

  try {
    const liveHtmlRes = await fetch('https://rasalmal.online/?_t=' + Date.now());
    const liveHtml = await liveHtmlRes.text();
    const verMatch = liveHtml.match(/_CLIENT_VERSION\s*=\s*'([^']+)'/);
    console.log('Live server HTML _CLIENT_VERSION:', verMatch ? verMatch[1] : 'not found');
    const scriptMatch = liveHtml.match(/<script src="db\.js[^"]*"/);
    console.log('Live server db.js script tag:', scriptMatch ? scriptMatch[0] : 'not found');
  } catch (e) {
    console.log('Error fetching live HTML:', e.message);
  }
}
check();
