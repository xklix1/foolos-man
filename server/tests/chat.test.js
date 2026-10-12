const assert = require('assert');
const test = require('node:test');
const { containsProfanity, findBlockedWord } = require('../src/engine/profanity-filter');

test('Chat Engine: Profanity filter accurately detects blocked words and protects safe words', () => {
  // Profane phrases should be detected
  assert.ok(containsProfanity('يا شرموط'), 'Should detect severe offensive word');
  assert.ok(containsProfanity('kosom'), 'Should detect franco offensive word');
  assert.ok(containsProfanity('5awalat'), 'Should detect franco variant');
  assert.strictEqual(typeof findBlockedWord('انت خول كبير'), 'string');

  // Safe words and common game terms should NOT be blocked
  assert.strictEqual(containsProfanity('مرحبا بكم في اللعبة'), false, 'Standard greeting should pass');
  assert.strictEqual(containsProfanity('مبروك الفوز في المزاد'), false, 'Game congratulation should pass');
  assert.strictEqual(containsProfanity('اشتريت مصنع حديد'), false, 'Factory purchase should pass');
  assert.strictEqual(containsProfanity('كسبت في البورصة'), false, 'Stock profit should pass');
  assert.strictEqual(containsProfanity('مكسرات'), false, 'Safe food word should pass');
});
