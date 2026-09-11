const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/server');

test('Push Notifications API — Full Verification', async (t) => {
  await app.ready();

  await t.test('1. GET /api/push/public-key returns VAPID key', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/push/public-key'
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.publicKey, 'Contains public key');
    assert.ok(body.publicKey.length > 30, 'Valid length VAPID public key');
  });

  await t.test('2. POST /api/push/subscribe registers subscription', async () => {
    const dummySub = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-123',
      expirationTime: null,
      keys: {
        p256dh: 'test-key-p256dh',
        auth: 'test-auth-secret'
      }
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/push/subscribe',
      payload: {
        username: 'BillionaireTest',
        subscription: dummySub
      }
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.username, 'BillionaireTest');
    assert.ok(body.stats.activeDevices >= 1);
  });

  await t.test('3. POST /api/push/broadcast validates admin authorization', async () => {
    // Unauthorized attempt
    const resUnauth = await app.inject({
      method: 'POST',
      url: '/api/push/broadcast',
      payload: {
        adminKey: 'wrong_key',
        title: 'Fake Notification',
        body: 'Testing fake broadcast'
      }
    });
    assert.strictEqual(resUnauth.statusCode, 403);

    // Authorized attempt
    const config = require('../src/config/env');
    const resAuth = await app.inject({
      method: 'POST',
      url: '/api/push/broadcast',
      headers: {
        'x-admin-token': config.ADMIN_KEY_SHA256
      },
      payload: {
        title: 'إشعار رسمي من الإدارة',
        body: 'مرحباً بجميع أثرياء رأس المال!'
      }
    });
    assert.strictEqual(resAuth.statusCode, 200);
    const body = JSON.parse(resAuth.body);
    assert.strictEqual(body.success, true);
    assert.ok(typeof body.sent === 'number');
  });
});
