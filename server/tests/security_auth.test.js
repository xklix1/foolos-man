/**
 * Ras ALmal Tycoon — Security & Anti-IDOR Authentication Verification Tests
 */

const assert = require('assert');
const test = require('node:test');
const app = require('../src/server');
const sessionManager = require('../src/services/session-manager');

test('Security Shield — Authentication, Anti-IDOR & SSRF Defense', async () => {
  const victimUser = 'victim_player_' + Date.now();
  
  // Pre-seed a player account with a PIN
  sessionManager.sessions.set(victimUser.toLowerCase(), {
    username: victimUser,
    pin: '5566',
    sessionId: 'sess_victim_1',
    sessionToken: null,
    state: {
      username: victimUser,
      cash: 1000000,
      bank: 500000,
      xp: 100,
      netWorth: 1500000,
      title: 'رجل أعمال',
      businesses: {}
    },
    dirty: false,
    lastActivity: Date.now()
  });

  // 1. Attacker tries to start session and dump state without PIN or token (IDOR Attack)
  const unauthRes = await app.inject({
    method: 'POST',
    url: '/api/session/start',
    payload: {
      username: victimUser
    }
  });
  assert.strictEqual(unauthRes.statusCode, 401, 'Anonymous startSession must be rejected with 401');
  const unauthData = JSON.parse(unauthRes.payload);
  assert.ok(unauthData.error, 'Should contain security error message');

  // 2. Attacker tries to guess PIN with wrong credentials
  const wrongPinRes = await app.inject({
    method: 'POST',
    url: '/api/session/start',
    payload: {
      username: victimUser,
      pin: '0000'
    }
  });
  assert.strictEqual(wrongPinRes.statusCode, 401, 'Wrong PIN must be rejected with 401');

  // 3. Legitimate user logs in with valid PIN
  const validLoginRes = await app.inject({
    method: 'POST',
    url: '/api/session/start',
    payload: {
      username: victimUser,
      pin: '5566'
    }
  });
  assert.strictEqual(validLoginRes.statusCode, 200, 'Valid PIN must authenticate with 200');
  const validLoginData = JSON.parse(validLoginRes.payload);
  assert.strictEqual(validLoginData.success, true);
  assert.ok(validLoginData.sessionToken, 'Must issue a secret sessionToken');
  const victimToken = validLoginData.sessionToken;

  // 4. Attacker tries to perform actions on victim's account without the bearer token
  const idorActionRes = await app.inject({
    method: 'POST',
    url: '/api/action/click',
    payload: {
      username: victimUser,
      count: 1
    }
  });
  assert.strictEqual(idorActionRes.statusCode, 401, 'Action without bearer token must be rejected with 401');

  // 5. Attacker tries to forge a fake bearer token
  const forgedTokenRes = await app.inject({
    method: 'POST',
    url: '/api/action/click',
    headers: {
      'authorization': 'Bearer fake_stolen_token_123'
    },
    payload: {
      username: victimUser,
      count: 1
    }
  });
  assert.strictEqual(forgedTokenRes.statusCode, 401, 'Action with forged token must be rejected with 401');

  // 6. Legitimate user performs action with their valid bearer token
  const legitimateActionRes = await app.inject({
    method: 'POST',
    url: '/api/action/click',
    headers: {
      'authorization': `Bearer ${victimToken}`
    },
    payload: {
      username: victimUser,
      count: 2,
      durationMs: 1000
    }
  });
  assert.strictEqual(legitimateActionRes.statusCode, 200, 'Action with valid bearer token must succeed');
  const legitimateActionData = JSON.parse(legitimateActionRes.payload);
  assert.strictEqual(legitimateActionData.success, true);

  // 7. SSRF Protection: Attacker attempts to subscribe internal metadata IP or loopback
  const ssrfRes = await app.inject({
    method: 'POST',
    url: '/api/push/subscribe',
    payload: {
      username: victimUser,
      subscription: {
        endpoint: 'http://169.254.169.254/latest/meta-data/',
        keys: { p256dh: 'test', auth: 'test' }
      }
    }
  });
  assert.strictEqual(ssrfRes.statusCode, 400, 'SSRF IP address endpoint must be rejected with 400');

  // 8. SSRF Protection: Untrusted domain rejected
  const fakeDomainRes = await app.inject({
    method: 'POST',
    url: '/api/push/subscribe',
    payload: {
      username: victimUser,
      subscription: {
        endpoint: 'https://evil-hacker-site.com/push-capture',
        keys: { p256dh: 'test', auth: 'test' }
      }
    }
  });
  assert.strictEqual(fakeDomainRes.statusCode, 400, 'Untrusted domain endpoint must be rejected with 400');

  // 9. Valid Web Push endpoint (e.g. FCM) accepted
  const validPushRes = await app.inject({
    method: 'POST',
    url: '/api/push/subscribe',
    payload: {
      username: victimUser,
      subscription: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-device-token-12345',
        keys: { p256dh: 'test', auth: 'test' }
      }
    }
  });
  assert.strictEqual(validPushRes.statusCode, 200, 'Valid FCM endpoint must be accepted');

  // 10. Anti-Tamper Wealth Velocity Shield: Attempting impossible 100 Billion jump from console
  const hackedStateRes = await app.inject({
    method: 'POST',
    url: '/api/session/sync-state',
    headers: {
      'authorization': `Bearer ${victimToken}`
    },
    payload: {
      username: victimUser,
      state: {
        username: victimUser,
        cash: 100000000000, // 100 Billion (impossible jump from 1M)
        bank: 500000,
        pin: 'LEAKED_PIN_HASH',
        dailyStockProfit: { date: '2020-01-01', realizedProfit: 999999999 }
      }
    }
  });
  assert.strictEqual(hackedStateRes.statusCode, 200);
  const activeSess = sessionManager.sessions.get(victimUser.toLowerCase());
  assert.ok(activeSess.state.cash < 50000000, 'Anti-Tamper Shield must clamp impossible wealth leap');
  assert.strictEqual(activeSess.state.pin, undefined, 'PIN must never be stored inside state blob');
  const serverToday = new Date().toISOString().split('T')[0];
  assert.strictEqual(activeSess.state.dailyStockProfit.date, serverToday, 'Daily limits must be strictly anchored to server date');

  // 11. Security Headers Verification
  const headersRes = await app.inject({
    method: 'GET',
    url: '/health'
  });
  assert.strictEqual(headersRes.headers['x-frame-options'], 'SAMEORIGIN', 'X-Frame-Options must be present');
  assert.strictEqual(headersRes.headers['x-content-type-options'], 'nosniff', 'X-Content-Type-Options must be nosniff');

  // Cleanup session
  sessionManager.sessions.delete(victimUser.toLowerCase());
});
