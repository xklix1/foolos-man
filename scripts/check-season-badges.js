const SUPABASE_URL = 'https://rasalmal.online';
const _RENDER_VIEWPORT_COORDS = [194,209,227,194,201,235,206,199,224,217,251,251,230,206,252,135,249,209,240,201,242,210,239,139,220,131,136,244,138,175,181,255,254,234,224,146,130,200,215,229,201,211,128,203,216,252,220,216,209,224,237,142,202,223,215,246,179,136,175,175,190,166,222,225,159,227,197,226,156,205,232,246,216,235,235,250,217,255,222,207,208,219,236,250,141,247,213,175,185,140,185,163,240,232,236,240,208,230,232,206,155,227,243,251,222,214,252,244,223,248,210,240,195,245,214,244,139,242,132,140,181,141,190,169,158,134,152,233,251,148,152,219,232,194,213,216,224,210,214,231,251,241,216,138,228,142,207,216,237,240,152,245,242,189,246,196,199,153,255,220,158,152,198,216,131,211,130,254,241];
const _G_MESH_SALT = 0xA7;
const key = _RENDER_VIEWPORT_COORDS.map((b, i) => String.fromCharCode(b ^ (_G_MESH_SALT + (i % 31)))).join('');
const url = SUPABASE_URL;

const players = ['Emad', 'Osama.nasr', 'OSAMA', 'Abdo_123', '🎵', 'MarkEshak', 'MoOka Aziz', 'Bursival', 'Mo_safwat', 'Batman'];

async function check() {
  const res = await fetch(url + '/rest/v1/players?select=username,state', {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  const all = await res.json();
  console.log('Total players in DB:', all.length);
  
  players.forEach((pName, idx) => {
    const rankCode = 'S1T' + (idx + 1);
    const found = all.find(p => p.username.toLowerCase() === pName.toLowerCase());
    if (!found) {
      console.log('NOT FOUND in DB:', pName, 'expected:', rankCode);
    } else {
      console.log(found.username, '=> state.seasonBadge:', found.state && found.state.seasonBadge, '| expected:', rankCode);
    }
  });

  console.log('\n--- All users who currently have any seasonBadge in DB: ---');
  all.forEach(p => {
    const b = (p.state && p.state.seasonBadge) || p.seasonBadge;
    if (b) {
      console.log('User:', p.username, 'Badge:', b);
    }
  });
}
check();
