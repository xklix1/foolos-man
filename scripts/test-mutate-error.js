const adminToken = 'f7bd3e9d5f13264c2dcc635b0f0e7edd3cc732d23d86b1d642e20ce9bd43dd99';
const serverUrl = 'https://rasalmal.online';

async function testMutateError() {
  const targetUser = 'خالد';
  const ts = Date.now();
  
  const payload = {
    table: 'players',
    method: 'PATCH',
    query: `username=ilike.${encodeURIComponent(targetUser)}`,
    body: {
      cash: 1000000,
      bank: 1000000,
      gold: 5344,
      xp: 10000,
      state: { test: 1 },
      admin_modified_timestamp: ts
    }
  };

  const res = await fetch(`${serverUrl}/api/admin/mutate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken
    },
    body: JSON.stringify(payload)
  });

  console.log('Status:', res.status);
  console.log('JSON:', await res.json());
}

testMutateError();
