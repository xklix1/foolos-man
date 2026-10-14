const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const config = require('../src/config/env');

test('Resend Auth OTP — Configuration and Key Resolution', (t) => {
  assert.ok(config.RESEND_API_KEY, 'RESEND_API_KEY must not be empty');
  assert.ok(config.RESEND_API_KEY.startsWith('re_'), 'RESEND_API_KEY should start with re_');
  assert.ok(config.RESEND_API_KEY.length > 20, 'RESEND_API_KEY length should be sufficient');
  assert.strictEqual(config.RESEND_FROM_EMAIL, 'Ras ALmal Tycoon <auth@rasalmal.online>');
});

test('Resend Auth OTP — Fastify Route Registration', async (t) => {
  const Fastify = require('fastify');
  const app = Fastify();
  app.register(require('../src/routes/auth-otp-routes'));
  
  await app.ready();
  
  // Test invalid email validation without hitting external API
  const invalidRes = await app.inject({
    method: 'POST',
    url: '/api/auth/send-otp',
    payload: {
      email: 'not-an-email',
      username: 'Tester'
    }
  });
  
  assert.strictEqual(invalidRes.statusCode, 400);
  const data = JSON.parse(invalidRes.payload);
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.error, 'يرجى إدخال بريد إلكتروني صحيح.');
  
  // Test reset-pin route input validation
  const resetValRes = await app.inject({
    method: 'POST',
    url: '/api/auth/reset-pin',
    payload: {
      email: 'test@example.com',
      code: '123456',
      newPin: '12' // Too short
    }
  });
  assert.strictEqual(resetValRes.statusCode, 400);
  const resetValData = JSON.parse(resetValRes.payload);
  assert.strictEqual(resetValData.success, false);
  assert.strictEqual(resetValData.error, 'كلمة السر الجديدة يجب ألا تقل عن 4 خانات.');

  await app.close();
});
