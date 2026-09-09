/**
 * Ras ALmal Tycoon — Admin Routes Unit & Integration Tests
 */

const assert = require('assert');
const test = require('node:test');

const app = require('../src/server');
const config = require('../src/config/env');

test('Admin API — Rejection without or with invalid token', async () => {
  // 1. Missing token
  const noTokenRes = await app.inject({
    method: 'POST',
    url: '/api/admin/verify'
  });
  assert.strictEqual(noTokenRes.statusCode, 401);

  // 2. Invalid token
  const badTokenRes = await app.inject({
    method: 'POST',
    url: '/api/admin/verify',
    headers: {
      'x-admin-token': 'wrong_token_1234567890'
    }
  });
  assert.strictEqual(badTokenRes.statusCode, 401);
});

test('Admin API — Valid token verification', async () => {
  const verifyRes = await app.inject({
    method: 'POST',
    url: '/api/admin/verify',
    headers: {
      'x-admin-token': config.ADMIN_KEY_SHA256
    }
  });
  assert.strictEqual(verifyRes.statusCode, 200);
  const data = JSON.parse(verifyRes.payload);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.role, 'admin_root');
});

test('Admin API — Mutate validation (table whitelist & method check)', async () => {
  // 1. Disallowed table
  const badTableRes = await app.inject({
    method: 'POST',
    url: '/api/admin/mutate',
    headers: {
      'x-admin-token': config.ADMIN_KEY_SHA256
    },
    payload: {
      table: 'pg_shadow', // sensitive system table
      method: 'PATCH',
      body: {}
    }
  });
  assert.strictEqual(badTableRes.statusCode, 400);

  // 2. Disallowed method
  const badMethodRes = await app.inject({
    method: 'POST',
    url: '/api/admin/mutate',
    headers: {
      'x-admin-token': config.ADMIN_KEY_SHA256
    },
    payload: {
      table: 'players',
      method: 'DROP',
      body: {}
    }
  });
  assert.strictEqual(badMethodRes.statusCode, 400);
});
