const SUPABASE_URL = 'https://rasalmal.online';
const _RENDER_VIEWPORT_COORDS = [194,209,227,194,201,235,206,199,224,217,251,251,230,206,252,135,249,209,240,201,242,210,239,139,220,131,136,244,138,175,181,255,254,234,224,146,130,200,215,229,201,211,128,203,216,252,220,216,209,224,237,142,202,223,215,246,179,136,175,175,190,166,222,225,159,227,197,226,156,205,232,246,216,235,235,250,217,255,222,207,208,219,236,250,141,247,213,175,185,140,185,163,240,232,236,240,208,230,232,206,155,227,243,251,222,214,252,244,223,248,210,240,195,245,214,244,139,242,132,140,181,141,190,169,158,134,152,233,251,148,152,219,232,194,213,216,224,210,214,231,251,241,216,138,228,142,207,216,237,240,152,245,242,189,246,196,199,153,255,220,158,152,198,216,131,211,130,254,241];
const _G_MESH_SALT = 0xA7;
const key = _RENDER_VIEWPORT_COORDS.map((b, i) => String.fromCharCode(b ^ (_G_MESH_SALT + (i % 31)))).join('');
const url = SUPABASE_URL;

const targets = [
  { rank: 1, code: 'S1T1', user: 'Emad' },
  { rank: 2, code: 'S1T2', user: 'Osama.nasr' },
  { rank: 3, code: 'S1T3', user: 'OSAMA' },
  { rank: 4, code: 'S1T4', user: 'Abdo_123' },
  { rank: 5, code: 'S1T5', user: '♫' }, // note symbol in DB is ♫
  { rank: 6, code: 'S1T6', user: 'MarkEshak' },
  { rank: 7, code: 'S1T7', user: 'MoOka Aziz' },
  { rank: 8, code: 'S1T8', user: 'Bursival' },
  { rank: 9, code: 'S1T9', user: 'Mo_safwat' },
  { rank: 10, code: 'S1T10', user: 'Batman' }
];

async function assignAll() {
  for (const t of targets) {
    // 1. Get player
    const getRes = await fetch(`${url}/rest/v1/players?username=ilike.${encodeURIComponent(t.user)}&order=last_seen.desc&select=*`, {
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });
    const rows = await getRes.json();
    if (!rows || rows.length === 0) {
      console.error(`Player NOT found: ${t.user}`);
      continue;
    }
    const r = rows[0];
    let state = r.state || {};
    if (typeof state === 'string') {
      try { state = JSON.parse(state); } catch(e) {}
    }
    state.seasonBadge = t.code;
    state.adminModifiedTimestamp = Date.now();

    const patchRes = await fetch(`${url}/rest/v1/players?username=ilike.${encodeURIComponent(r.username)}`, {
      method: 'PATCH',
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        state: state,
        admin_modified_timestamp: state.adminModifiedTimestamp
      })
    });
    const updated = await patchRes.json();
    console.log(`Assigned [${t.code}] to ${r.username} => result:`, Array.isArray(updated) && updated.length > 0 ? 'SUCCESS' : updated);
  }
}
assignAll();
