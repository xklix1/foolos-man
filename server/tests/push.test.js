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

  await t.test('4. checkOfflineSubscribersAndNotify skips player with 4+ hours supplies remaining', async () => {
    const pushService = require('../src/services/push-service');
    // Mock subscription for player 'OfflineTester'
    pushService.saveSubscription('OfflineTester', {
      endpoint: 'https://test-offline-endpoint-4hrs',
      keys: { p256dh: 'dummy', auth: 'dummy' }
    });

    // Mock dbService where OfflineTester has 4 hours (14400s) of supplies, left 10 minutes (600s) ago
    const mockDbService = {
      getPlayerByUsername: async (u) => {
        if (u === 'offlinetester') {
          return {
            username: 'OfflineTester',
            last_seen: Date.now() - 600 * 1000, // 10 minutes ago
            state: {
              lastActiveTimestamp: Date.now() - 600 * 1000,
              businesses: {
                kiosk: { level: 2, suppliesTicks: 14400 } // 4 hours
              }
            }
          };
        }
        return null;
      }
    };

    const mockSessionManager = {
      getSession: () => null
    };

    const result = await pushService.checkOfflineSubscribersAndNotify(mockDbService, mockSessionManager);
    assert.strictEqual(result.alertsSent, 0, 'No alerts sent because 3.8+ hours of supplies still remain');
  });

  await t.test('5. checkOfflineSubscribersAndNotify dispatches alert when supplies are depleted', async () => {
    const pushService = require('../src/services/push-service');
    // Mock subscription for player 'DepletedTester'
    pushService.saveSubscription('DepletedTester', {
      endpoint: 'https://test-depleted-endpoint',
      keys: { p256dh: 'dummy', auth: 'dummy' }
    });

    // Mock dbService where DepletedTester left 5 hours ago with 4 hours of supplies (now 0)
    const mockDbService = {
      getPlayerByUsername: async (u) => {
        if (u === 'depletedtester') {
          return {
            username: 'DepletedTester',
            last_seen: Date.now() - (5 * 3600 * 1000), // 5 hours ago
            state: {
              lastActiveTimestamp: Date.now() - (5 * 3600 * 1000),
              businesses: {
                coffee: { level: 3, suppliesTicks: 14400 } // 4 hours of initial supplies
              }
            }
          };
        }
        return null;
      }
    };

    const mockSessionManager = {
      getSession: () => null
    };

    // Override sendToEndpoint for this test so webpush doesn't make real network call
    const origSend = pushService.sendToEndpoint;
    let pushDispatched = false;
    pushService.sendToEndpoint = async (sub, payload) => {
      pushDispatched = true;
      return { success: true };
    };

    try {
      const result = await pushService.checkOfflineSubscribersAndNotify(mockDbService, mockSessionManager);
      assert.ok(result.alertsSent >= 1, 'Sent alert because 5 hours elapsed > 4 hours supplies');
      assert.strictEqual(pushDispatched, true, 'WebPush send was triggered');
    } finally {
      pushService.sendToEndpoint = origSend;
      pushService.removeSubscription('https://test-depleted-endpoint');
      pushService.removeSubscription('https://test-offline-endpoint-4hrs');
    }
  });
});
