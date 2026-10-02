/**
 * Ras ALmal Tycoon — Auth & Email OTP Routes
 * Powered by Resend API (Sending domain: auth@rasalmal.online)
 * Luxury Enterprise / Dark-Gold Fintech Email Design (No Emojis, Pure Vector Icons)
 */

const crypto = require('crypto');
const config = require('../config/env');

// In-memory OTP storage with TTL and attempt limits
const otpStore = new Map();

// Periodic cleanup of expired OTPs every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of otpStore.entries()) {
    if (entry.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 2 * 60 * 1000);

/**
 * Generates an Enterprise Ultra-Luxury Dark/Gold HTML email (Pure SVG Icons, Zero Emojis)
 */
function buildOtpEmailHtml(otpCode, username, typeText) {
  // Format OTP code into spaced digit cards
  const codeDigits = String(otpCode).split('').map(d => `
    <td align="center" style="padding:0 3px;">
      <div style="width:44px; height:52px; line-height:52px; background:#0c1322 !important; color:#ffffff !important; font-size:28px; font-weight:900; font-family:'Courier New', Courier, monospace; border:2px solid #d4af37; border-radius:10px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.5);">
        ${d}
      </div>
    </td>
  `).join('');

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark only">
  <meta name="supported-color-schemes" content="dark only">
  <title>رمز التحقق - رأس المال</title>
  <style>
    :root {
      color-scheme: dark only;
      supported-color-schemes: dark;
    }
    body, table, td, p, a, div {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }
    @media (prefers-color-scheme: dark) {
      .bg-card { background-color: #0d1424 !important; }
      .text-white { color: #ffffff !important; }
    }
  </style>
</head>
<body bgcolor="#060911" style="margin:0; padding:0; background-color:#060911 !important; color:#e2e8f0 !important; direction:rtl; text-align:right;">
  
  <!-- Outer Wrapper with Visual Identity Background -->
  <table role="presentation" width="100%" bgcolor="#060911" border="0" cellspacing="0" cellpadding="0" style="background-color:#060911 !important; background-image:url('https://rasalmal.online/assets/email-bg.jpg'); background-size:cover; background-position:center top; width:100%; margin:0; padding:35px 10px;">
    <tr>
      <td align="center" style="padding:10px;">
        
        <!-- Main Card Container -->
        <table role="presentation" width="100%" bgcolor="#0d1424" border="0" cellspacing="0" cellpadding="0" class="bg-card" style="max-width:520px; background-color:#0d1424 !important; border:2px solid #2a3b5c; border-radius:22px; overflow:hidden; box-shadow:0 25px 60px rgba(0,0,0,0.85);">
          
          <!-- Top Gold Ribbon -->
          <tr>
            <td height="5" bgcolor="#d4af37" style="background:linear-gradient(90deg, #996515 0%, #d4af37 50%, #f59e0b 100%);"></td>
          </tr>

          <!-- Brand Header with Official Identity Emblem -->
          <tr>
            <td align="center" bgcolor="#080d18" style="padding:32px 20px 24px 20px; background-color:#080d18 !important; text-align:center; border-bottom:1px solid #1e2c45;">
              <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto 14px auto;">
                <tr>
                  <td align="center">
                    <img src="https://rasalmal.online/assets/official-logo.jpg" width="160" height="90" alt="رأس المال | RA'S AL-MAL" style="display:block; border-radius:14px; border:1px solid rgba(212,175,55,0.4); object-fit:cover;" />
                  </td>
                </tr>
              </table>
              <div style="font-size:22px; font-weight:900; color:#ffffff !important; letter-spacing:-0.3px; margin-bottom:4px;">رأس المال</div>
              <div style="font-size:11px; font-weight:700; color:#d4af37 !important; text-transform:uppercase; letter-spacing:2px;">RA'S AL-MAL BUSINESS EMPIRE</div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td bgcolor="#0d1424" class="bg-card" style="padding:32px 28px 24px 28px; background-color:#0d1424 !important;">
              
              <div style="font-size:17px; font-weight:800; color:#ffffff !important; margin-bottom:12px;">
                أهلاً بك${username ? ` يا <strong>${username}</strong>` : ''}،
              </div>

              <p style="font-size:14px; line-height:1.75; color:#94a3b8 !important; margin:0 0 24px 0;">
                تم طلب رمز تحقق أمني لتوثيق <strong style="color:#ffffff !important;">${typeText}</strong> الخاص بحسابك. يُرجى إدخال الرمز السري التالي لإتمام العملية بأمان:
              </p>

              <!-- OTP Digits Container with High Contrast -->
              <table role="presentation" width="100%" bgcolor="#060911" border="0" cellspacing="0" cellpadding="0" style="background-color:#060911 !important; border:1px solid #2a3b5c; border-radius:14px; margin:0 0 24px 0;">
                <tr>
                  <td align="center" style="padding:24px 10px;">
                    <div style="font-size:11px; font-weight:800; color:#d4af37 !important; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:14px;">رمز التحقق لمرة واحدة (OTP)</div>
                    <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" style="direction:ltr; margin:0 auto 12px auto;">
                      <tr>
                        ${codeDigits}
                      </tr>
                    </table>
                    <div style="font-size:12px; color:#64748b !important;">ينتهي الرمز خلال <span style="color:#f59e0b !important; font-weight:800;">5 دقائق</span></div>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table role="presentation" width="100%" bgcolor="#111a2e" border="0" cellspacing="0" cellpadding="0" style="background-color:#111a2e !important; border-right:4px solid #d4af37; border-radius:8px; margin:0 0 22px 0;">
                <tr>
                  <td style="padding:14px 16px; font-size:12px; line-height:1.6; color:#94a3b8 !important;">
                    <span style="color:#ffffff !important; font-weight:800;">تنبيه أمني:</span> لا تشارك هذا الرمز مع أي شخص. فريق إدارة رأس المال لن يطلب منك هذا الرمز أبداً.
                  </td>
                </tr>
              </table>

              <p style="font-size:12px; color:#475569 !important; margin:0; line-height:1.6;">
                إذا لم تكن أنت من أجرى هذا الطلب، يمكنك تجاهل هذه الرسالة بأمان دون أي قلق.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" bgcolor="#070b14" style="padding:22px 28px; background-color:#070b14 !important; border-top:1px solid #1a253a; text-align:center;">
              <div style="font-size:11px; color:#475569 !important; line-height:1.8;">
                تم الإرسال من النطاق الموثق: <span style="color:#94a3b8 !important; font-family:monospace;">auth.rasalmal.online</span><br>
                جميع الحقوق محفوظة &copy; ${new Date().getFullYear()} لعبة رأس المال &bull; RA'S AL-MAL EMPIRE
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}

/**
 * Send email via Resend REST API
 */
async function sendEmailViaResend(toEmail, subject, htmlContent) {
  const apiKey = (process.env.RESEND_API_KEY || config.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('مفتاح RESEND_API_KEY غير موجود في إعدادات الخادم.');
  }

  // Use verified sender auth@rasalmal.online
  const fromAddress = process.env.RESEND_FROM_EMAIL || config.RESEND_FROM_EMAIL || 'رأس المال <auth@rasalmal.online>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [toEmail],
      subject: subject,
      html: htmlContent
    })
  });

  const resData = await response.json();
  if (!response.ok) {
    console.error('[Resend API Error]', resData);
    throw new Error(resData.message || 'فشل إرسال البريد الإلكتروني عبر Resend.');
  }

  return resData;
}

module.exports = async function authOtpRoutes(fastify, opts) {
  /**
   * POST /api/auth/send-otp
   * Generates and emails a 6-digit OTP
   */
  fastify.post('/api/auth/send-otp', async (request, reply) => {
    const { email, username, type = 'register' } = request.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return reply.status(400).send({
        success: false,
        error: 'يرجى إدخال بريد إلكتروني صحيح.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = String(username || '').trim();

    // Rate Limiting: Max 1 email per 60 seconds
    const existing = otpStore.get(cleanEmail);
    const now = Date.now();
    if (existing && (now - existing.lastSentAt) < 60000) {
      const waitSeconds = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000);
      return reply.status(429).send({
        success: false,
        error: `يرجى الانتظار ${waitSeconds} ثانية قبل إعادة طلب رمز جديد.`
      });
    }

    // Generate cryptographically secure 6-digit numeric OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();

    let typeText = 'تسجيل حساب جديد';
    if (type === 'reset_pin') typeText = 'استعادة الرقم السري (PIN)';
    if (type === 'login') typeText = 'تسجيل الدخول الآمن';
    if (type === 'verify') typeText = 'توثيق البريد الإلكتروني';

    const emailSubject = `رمز التحقق الآمن: ${otpCode} - رأس المال`;
    const htmlBody = buildOtpEmailHtml(otpCode, cleanUsername, typeText);

    try {
      await sendEmailViaResend(cleanEmail, emailSubject, htmlBody);

      // Store in memory (5 minutes TTL)
      otpStore.set(cleanEmail, {
        code: otpCode,
        username: cleanUsername,
        type: type,
        expiresAt: now + 5 * 60 * 1000,
        attempts: 0,
        lastSentAt: now
      });

      return reply.send({
        success: true,
        message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح.',
        expiresInSeconds: 300
      });
    } catch (err) {
      request.log.error({ err }, 'Failed to dispatch OTP email');
      return reply.status(500).send({
        success: false,
        error: err.message || 'حدث خطأ أثناء إرسال البريد الإلكتروني.'
      });
    }
  });

  /**
   * POST /api/auth/verify-otp
   * Validates the 6-digit OTP
   */
  fastify.post('/api/auth/verify-otp', async (request, reply) => {
    const { email, code } = request.body || {};

    if (!email || !code) {
      return reply.status(400).send({
        success: false,
        error: 'يرجى إدخال البريد الإلكتروني ورمز التحقق.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();

    const record = otpStore.get(cleanEmail);
    if (!record) {
      return reply.status(400).send({
        success: false,
        error: 'رمز التحقق غير موجود أو منتهي الصلاحية. يرجى طلب رمز جديد.'
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanEmail);
      return reply.status(400).send({
        success: false,
        error: 'انتهت صلاحية رمز التحقق (أكثر من 5 دقائق). يرجى طلب رمز جديد.'
      });
    }

    // Protect against brute-force (Max 5 attempts)
    record.attempts += 1;
    if (record.attempts > 5) {
      otpStore.delete(cleanEmail);
      return reply.status(429).send({
        success: false,
        error: 'تجاوزت الحد الأقصى للمحاولات الخاطئة. تم إلغاء الرمز، يرجى طلب رمز جديد.'
      });
    }

    if (record.code !== cleanCode) {
      const remaining = 5 - record.attempts;
      return reply.status(400).send({
        success: false,
        error: `رمز التحقق غير صحيح. متبقي لك ${remaining} محاولات.`
      });
    }

    // Success! Consume and remove OTP
    otpStore.delete(cleanEmail);

    return reply.send({
      success: true,
      verified: true,
      email: cleanEmail,
      message: 'تم التحقق من الرمز بنجاح!'
    });
  });
};
