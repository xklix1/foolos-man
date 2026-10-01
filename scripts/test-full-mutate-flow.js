const adminToken = 'f7bd3e9d5f13264c2dcc635b0f0e7edd3cc732d23d86b1d642e20ce9bd43dd99';
const serverUrl = 'https://rasalmal.online';

async function _api(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const [table, query] = endpoint.split('?');
  let bodyData = null;
  if (options.body) {
    try { bodyData = typeof options.body === 'string' ? JSON.parse(options.body) : options.body; } catch (e) { bodyData = options.body; }
  }

  if (method === 'GET') {
    const res = await fetch(`${serverUrl}/rest/v1/${endpoint}`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg5ODYzMDc5LCJleHAiOjIyNjI5MDMwNzl9.1CP85uGrdjSfcQLIa0_2rfR0Y71y3co0Uw25hw3b0ME',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg5ODYzMDc5LCJleHAiOjIyNjI5MDMwNzl9.1CP85uGrdjSfcQLIa0_2rfR0Y71y3co0Uw25hw3b0ME'
      }
    });
    return await res.json();
  }

  // Route mutations through /api/admin/mutate
  const adminRes = await fetch(`${serverUrl}/api/admin/mutate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken
    },
    body: JSON.stringify({
      table,
      method,
      query: query || '',
      body: bodyData
    })
  });

  if (!adminRes.ok) {
    const err = await adminRes.json().catch(() => ({}));
    throw new Error(err.message || `Admin mutate failed: ${adminRes.status}`);
  }
  const json = await adminRes.json();
  return json.data;
}

async function testFullFlow() {
  console.log('1. Fetching pending topup requests...');
  const gRows = await _api('globals?id=eq.topup_requests');
  const reqs = gRows[0]?.data?.requests || [];
  const pending = reqs.filter(r => r.status === 'pending');
  console.log(`Pending requests: ${pending.length}`);

  if (pending.length > 0) {
    const req = pending[0];
    console.log(`Testing approval for: ${req.id} (${req.packageName})...`);
    const ts = Date.now();
    const targetUser = req.username;

    // Get player
    const pRows = await _api(`players?username=ilike.${encodeURIComponent(targetUser)}&limit=1`);
    const playerDoc = pRows[0];
    const pState = playerDoc.state || {};
    const rewards = req.rewards || {};
    const addedCash = Number(rewards.cash) || 0;
    const addedBank = Number(rewards.bank) || 0;
    const addedXP = Number(rewards.xp) || 0;
    const addedGold = Number(rewards.gold) || 0;

    const updatedCash = (Number(playerDoc.cash) || 0) + addedCash;
    const updatedBank = (Number(playerDoc.bank) || 0) + addedBank;
    const updatedXP = (Number(playerDoc.xp) || 0) + addedXP;
    const updatedGold = (Number(playerDoc.gold) || 0) + addedGold;

    pState.cash = updatedCash;
    pState.bank = updatedBank;
    pState.xp = updatedXP;
    pState.gold = updatedGold;
    pState.adminModifiedTimestamp = ts;

    // PATCH player
    console.log('2. Updating player in database via /api/admin/mutate...');
    await _api(`players?username=ilike.${encodeURIComponent(targetUser)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        cash: updatedCash,
        bank: updatedBank,
        gold: updatedGold,
        xp: updatedXP,
        state: pState,
        admin_modified_timestamp: ts
      })
    });
    console.log('Player updated successfully!');

    // Send mail
    console.log('3. Sending topup_receipt in mailbox via /api/admin/mutate...');
    await _api('mailbox', {
      method: 'POST',
      body: JSON.stringify({
        sender: 'إدارة اللعبة (Financial Team)',
        recipient: targetUser,
        type: 'topup_receipt',
        payload: {
          packageName: req.packageName,
          cash: addedCash,
          bank: addedBank,
          gold: addedGold,
          isPreApplied: true,
          status: 'approved',
          date: ts
        },
        status: 'unread',
        created_at: ts
      })
    });
    console.log('Mail sent successfully!');

    // Update globals
    req.status = 'approved';
    req.reviewedAt = ts;
    req.reviewerNote = 'تم الاعتماد والشحن بنجاح بواسطة الإدارة';

    console.log('4. Updating globals.topup_requests via /api/admin/mutate with PATCH...');
    await _api('globals?id=eq.topup_requests', {
      method: 'PATCH',
      body: JSON.stringify({
        data: { requests: reqs, updatedAt: ts },
        updated_at: ts
      })
    });
    console.log('✅ Entire topup approval flow completed with 100% success!');
  } else {
    console.log('No pending requests to approve, flow validated.');
  }
}

testFullFlow();
