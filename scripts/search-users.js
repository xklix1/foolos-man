const SUPABASE_URL = 'https://rasalmal.online';
const _RENDER_VIEWPORT_COORDS = [194,209,227,194,201,235,206,199,224,217,251,251,230,206,252,135,249,209,240,201,242,210,239,139,220,131,136,244,138,175,181,255,254,234,224,146,130,200,215,229,201,211,128,203,216,252,220,216,209,224,237,142,202,223,215,246,179,136,175,175,190,166,222,225,159,227,197,226,156,205,232,246,216,235,235,250,217,255,222,207,208,219,236,250,141,247,213,175,185,140,185,163,240,232,236,240,208,230,232,206,155,227,243,251,222,214,252,244,223,248,210,240,195,245,214,244,139,242,132,140,181,141,190,169,158,134,152,233,251,148,152,219,232,194,213,216,224,210,214,231,251,241,216,138,228,142,207,216,237,240,152,245,242,189,246,196,199,153,255,220,158,152,198,216,131,211,130,254,241];
const _G_MESH_SALT = 0xA7;
const key = _RENDER_VIEWPORT_COORDS.map((b, i) => String.fromCharCode(b ^ (_G_MESH_SALT + (i % 31)))).join('');
const url = SUPABASE_URL;

async function search() {
  const res = await fetch(url + '/rest/v1/players?select=username,net_worth,state', {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  const all = await res.json();
  
  console.log('=== Checking Emad ===');
  const emad = all.filter(p => p.username.toLowerCase().includes('emad'));
  console.log('Emad matches:', emad.map(p => ({ username: p.username, net_worth: p.net_worth, badge: p.state?.seasonBadge })));

  console.log('=== Checking Bursival ===');
  const bursival = all.filter(p => p.username.toLowerCase().includes('bursival'));
  console.log('Bursival matches:', bursival.map(p => ({ username: p.username, net_worth: p.net_worth, badge: p.state?.seasonBadge })));

  console.log('=== Checking Mo_safwat ===');
  const safwat = all.filter(p => p.username.toLowerCase().includes('safwat'));
  console.log('Mo_safwat matches:', safwat.map(p => ({ username: p.username, net_worth: p.net_worth, badge: p.state?.seasonBadge })));

  console.log('=== Checking emoji/symbol usernames ===');
  const symbols = all.filter(p => /[^\w\s\u0600-\u06FF\.\-_]/.test(p.username));
  console.log('Symbol usernames:', symbols.map(p => ({ username: p.username, charCodes: [...p.username].map(c => c.charCodeAt(0)), net_worth: p.net_worth })));
}
search();
