const test = require('node:test');
const assert = require('node:assert/strict');
const Fastify = require('fastify');
const authOtpRoutes = require('../src/routes/auth-otp-routes');
const dbService = require('../src/services/db-service');

test('Resend Auth OTP — Registration Verification Flow with Valid OTP', async (t) => {
  const app = Fastify();
  app.register(authOtpRoutes);
  await app.ready();

  const testEmail = 'khaldllrbh_test@gmail.com';
  const testOtp = '926386';

  // Seed OTP into store
  authOtpRoutes._otpStore.set(testEmail, {
    code: testOtp,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0
  });

  const originalCreatePlayer = dbService.createPlayer;
  const originalGetByUsername = dbService.getPlayerByUsername;
  const originalGetByEmail = dbService.getPlayerByEmail;

  let createdRow = null;
  dbService.getPlayerByUsername = async () => null;
  dbService.getPlayerByEmail = async () => null;
  dbService.createPlayer = async (row) => {
    createdRow = row;
    return row;
  };

  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: {
        email: testEmail,
        code: testOtp,
        username: 'KhalidTestUser',
        pin: '1234',
        type: 'register'
      }
    });

    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.payload);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.verified, true);
    assert.strictEqual(data.registered, true);
    assert.strictEqual(data.username, 'KhalidTestUser');
    assert.ok(data.sessionToken, 'Session token should be present');

    assert.ok(createdRow, 'createPlayer should have been called');
    assert.strictEqual(createdRow.username, 'KhalidTestUser');
    assert.strictEqual(createdRow.cash, 500000);
    assert.strictEqual(createdRow.bank, 500000);
    assert.strictEqual(createdRow.net_worth, 1000000);
  } finally {
    dbService.createPlayer = originalCreatePlayer;
    dbService.getPlayerByUsername = originalGetByUsername;
    dbService.getPlayerByEmail = originalGetByEmail;
    await app.close();
  }
});

test('Resend Auth OTP — Registration with Referral Code Bonus', async (t) => {
  const app = Fastify();
  app.register(authOtpRoutes);
  await app.ready();

  const testEmail = 'referred_user@gmail.com';
  const testOtp = '112233';

  authOtpRoutes._otpStore.set(testEmail, {
    code: testOtp,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0
  });

  const originalCreatePlayer = dbService.createPlayer;
  const originalGetByUsername = dbService.getPlayerByUsername;
  const originalGetByEmail = dbService.getPlayerByEmail;
  const originalResilientFetch = dbService.resilientFetch;

  let createdRow = null;
  dbService.getPlayerByUsername = async () => null;
  dbService.getPlayerByEmail = async () => null;
  dbService.createPlayer = async (row) => {
    createdRow = row;
    return row;
  };

  // Mock referrer lookup in resilientFetch
  dbService.resilientFetch = async (url, opts) => {
    if (url.includes('state->>referralCode=eq.REF-VIP123')) {
      return {
        ok: true,
        json: async () => [{
          username: 'VIPReferrer',
          bank: 2000000,
          net_worth: 5000000,
          state: { bank: 2000000, netWorth: 5000000 }
        }]
      };
    }
    return { ok: true, json: async () => ({}) };
  };

  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: {
        email: testEmail,
        code: testOtp,
        username: 'ReferredFriend',
        pin: '5678',
        referralCode: 'REF-VIP123',
        type: 'register'
      }
    });

    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.payload);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.registered, true);

    // New referred player gets 500,000 + 1,000,000 bonus = 1,500,000 cash!
    assert.strictEqual(createdRow.cash, 1500000);
    assert.strictEqual(createdRow.net_worth, 2000000);
    assert.strictEqual(createdRow.state.referredBy, 'VIPReferrer');
    assert.strictEqual(createdRow.state.referredByCode, 'REF-VIP123');
  } finally {
    dbService.createPlayer = originalCreatePlayer;
    dbService.getPlayerByUsername = originalGetByUsername;
    dbService.getPlayerByEmail = originalGetByEmail;
    dbService.resilientFetch = originalResilientFetch;
    await app.close();
  }
});
