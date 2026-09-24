const db = require('../db.js');

async function traceLehTransfers() {
  const token = db._getAnonKey();

  // 1. Fetch all transfers where sender or recipient is 'ليه' or 'ليه 1'
  const allRes = await fetch('https://rasalmal.online/rest/v1/transfers?order=created_at.desc&limit=500', {
    headers: { 'apikey': token, 'Authorization': 'Bearer ' + token }
  });

  if (!allRes.ok) {
    console.error('Failed to fetch transfers:', allRes.status);
    return;
  }

  const all = await allRes.json();

  const involvingLeh = all.filter(t => ['ليه', 'ليه 1'].includes(t.sender) || ['ليه', 'ليه 1'].includes(t.recipient));
  console.log(`=== ALL TRANSFERS INVOLVING [ليه] OR [ليه 1] (${involvingLeh.length} records) ===`);
  console.table(involvingLeh.map(t => ({
    sender: t.sender,
    recipient: t.recipient,
    amount: Number(t.amount || 0).toLocaleString() + ' ج.م',
    date: new Date(t.created_at).toLocaleString()
  })));

  const involvingAbdo = all.filter(t => (t.sender || '').toLowerCase() === 'abdo_1' || (t.recipient || '').toLowerCase() === 'abdo_1');
  console.log(`\n=== ALL TRANSFERS INVOLVING [ABDO_1] (${involvingAbdo.length} records) ===`);
  console.table(involvingAbdo.map(t => ({
    sender: t.sender,
    recipient: t.recipient,
    amount: Number(t.amount || 0).toLocaleString() + ' ج.م',
    date: new Date(t.created_at).toLocaleString()
  })));

  // Check details of accounts 'ليه' and 'ليه 1'
  const pRes = await fetch('https://rasalmal.online/rest/v1/players?select=username,created_at,last_seen,state&username=in.("ليه","ليه 1")', {
    headers: { 'apikey': token, 'Authorization': 'Bearer ' + token }
  });
  if (pRes.ok) {
    const pl = await pRes.json();
    console.log('\n=== CREATION DETAILS FOR ليه & ليه 1 ===');
    for (const p of pl) {
      console.log(`Username: ${p.username} | Created: ${new Date(p.created_at).toLocaleString()} | Last Seen: ${new Date(p.last_seen).toLocaleString()}`);
    }
  }
}

traceLehTransfers();
