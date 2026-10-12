/**
 * Ras ALmal Tycoon — Authoritative Server Profanity & Abuse Filter
 */

const SEVERE_PATTERNS = [
  /شرمو+ط/i,
  /منيو+[كق]/i,
  /قحب[هة]/i,
  /متنا+[كق]/i,
  /تنا+[كق]/i,
  /معر+ص/i,
  /ديو+[ثس]/i,
  /عاهر[هة]/i,
  /بظر/i,
  /طيز/i,
  /كسم/i,
  /كسخت/i,
  /لبو+[هة]/i,
  /لوطي/i,
  /لواط/i,
  /سحاق/i,
  /مبضو+[نت]/i,
  /تبضي+[نت]/i,
  /ات?بض[نت]/i
];

const BOUNDARY_PATTERNS = [
  /(?:^|[^\p{L}\p{N}])(خول|الخول|ياخول|يا خول|خوله|خولة|خولات|مخول)(?:[^\p{L}\p{N}]|$)/u,
  /(?:^|[^\p{L}\p{N}])(نيك|النيك|بنيك|بنيكو|بينيك|ينيك|تنيك|انيك|منيك)(?:[^\p{L}\p{N}]|$)/u,
  /(?:^|[^\p{L}\p{N}])(سكس|السكس|بورن|البورن|شاذ|الشاذ)(?:[^\p{L}\p{N}]|$)/u,
  /(?:^|[^\p{L}\p{N}])(بضان|البضان|يابضان|يا بضان|بضاني|بضانه|بضانك|بضانكم|بضانهم|مبضون|مبضونة|مبضونين|بيتبضن|بيتبضنو|بتبضن|اتبضنت|تبضين)(?:[^\p{L}\p{N}]|$)/u,
  /(?:^|[^\p{L}\p{N}])(كس|الكس|كسك|كسها|كسهم|كسكم|كسم|كسمك|كسختك|كسختكم)(?:[^\p{L}\p{N}]|$)/u,
  /(?:^|[^\p{L}\p{N}])(زب|الزب|زبي|زبك|زبها|زبهم)(?:[^\p{L}\p{N}]|$)/u,
  /(?:^|[^\p{L}\p{N}])(عرص|العرص|ياعرص|يا معرص|عرصة|عرصه)(?:[^\p{L}\p{N}]|$)/u,
  /(?:^|[^\p{L}\p{N}])(ديوث|الديوث|ياديوث|يا ديوث)(?:[^\p{L}\p{N}]|$)/u,
  /(?:^|[^\p{L}\p{N}])(واطي|الواطي|ياواطي|يا واطي)(?:[^\p{L}\p{N}]|$)/u,
  /(?:^|[^\p{L}\p{N}])(كلب|الكلب|ياكلب|يا كلب|ابن الكلب|ابن كلب|ولاد الكلب)(?:[^\p{L}\p{N}]|$)/u,
  /(?:^|[^\p{L}\p{N}])(حيوان|الحيوان|ياحيوان|يا حيوان|حمار|الحمار|ياحمار|يا حمار)(?:[^\p{L}\p{N}]|$)/u,
  /(?:^|[^\p{L}\p{N}])(وسخ|الوسخ|ياوسخ|يا وسخ|قذر|القذر|ياقذر|يا قذر|حقير|الحقير|ياحقير)(?:[^\p{L}\p{N}]|$)/u,
  /(?:^|[^\p{L}\p{N}])(تفو|تفه|يلعن|يلعنك|يلعنكم|ملعون|اللعنة|تبا لك)(?:[^\p{L}\p{N}]|$)/u,
  /(?:^|[^\p{L}\p{N}])(fuck|fucking|fucker|fuk|fck|shit|bitch|asshole|pussy|cunt|dick|cock|bastard|slut|whore|motherfucker|nigger|nigga|porn|blowjob)(?:[^\p{L}\p{N}]|$)/iu
];

const FRANCO_PATTERNS = [
  /\b(?:kh+w+l+[a-z]*|k+h+o+l+[a-z]*|5+w+l+[a-z]*|5+a+w+a+l+[a-z]*|k+h+a+w+a+l+[a-z]*|5+o+l+[a-z]*)\b/i,
  /\b(?:3+a*r+s+[a-z]*|3+a*r+a+s+[a-z]*|3+r+s+[a-z]*)\b/i,
  /\b(?:k+o*s+o*m+[a-z]*|k+s+m+[a-z]*|5+o*s+o*m+[a-z]*)\b/i,
  /\b(?:s+h+a*r+m+o*u*t+[a-z]*|c+h+e*r+m+o*u*t+[a-z]*)\b/i,
  /\b(?:m+[a-z]*n+y+o*u*k+[a-z]*|m+[a-z]*n+y+a+k+[a-z]*)\b/i,
  /\b(?:m+[eia]*t+n+a+[kq]+[a-z]*|y+t+n+a+[kq]+[a-z]*)\b/i,
  /\b(?:t+e*i*z+[a-z]*|t+e*z+[a-z]*)\b/i,
  /\b(?:z+o*b+[a-z]*|z+b+[a-z]*)\b/i,
  /\b(?:b+e*d+a*n+[a-z]*|m+b+d+o*u*n+[a-z]*)\b/i,
  /\b(?:d+[a-z]*y+o*u*[st]+)\b/i,
  /\b(?:[29qk]+a*7*h+b+[a-z]*)\b/i,
  /\b(?:[ayb]*n+e+e*k+[a-z]*|n+a+y+e+k+[a-z]*|n+y+e+k+[a-z]*)\b/i
];

function normalizeArabic(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');
}

function containsProfanity(rawText) {
  if (!rawText || typeof rawText !== 'string') return false;
  const norm = normalizeArabic(rawText);
  const collapsed = norm.replace(/(.)\1+/g, '$1');
  const stripped = norm.replace(/[^\p{L}\p{N}]/gu, '');
  const strippedCollapsed = stripped.replace(/(.)\1+/g, '$1');

  for (const p of SEVERE_PATTERNS) {
    if (p.test(norm) || p.test(collapsed) || p.test(stripped) || p.test(strippedCollapsed)) return true;
  }
  for (const p of BOUNDARY_PATTERNS) {
    if (p.test(norm) || p.test(collapsed)) return true;
  }
  for (const p of FRANCO_PATTERNS) {
    if (p.test(rawText) || p.test(collapsed)) return true;
  }
  if (/(fuck|shit|bitch|asshole|pussy|dick|cunt|slut|whore|nigger|nigga)/i.test(stripped)) return true;

  return false;
}

function findBlockedWord(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const rawWords = rawText.match(/[\p{L}\p{N}]+/gu) || [];
  for (const word of rawWords) {
    if (containsProfanity(word)) return word;
  }
  return null;
}

module.exports = {
  containsProfanity,
  findBlockedWord,
  normalizeArabic
};
