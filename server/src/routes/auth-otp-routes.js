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
      <div style="width:44px; height:52px; line-height:52px; background-color:#0b1120 !important; background-image:linear-gradient(#0b1120, #0b1120) !important; color:#ffffff !important; font-size:28px; font-weight:900; font-family:'Courier New', Courier, monospace; border:2px solid #d4af37; border-radius:10px; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,0.8);">
        ${d}
      </div>
    </td>
  `).join('');

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="rtl" lang="ar" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark only" />
  <meta name="supported-color-schemes" content="dark only" />
  <title>رمز التحقق الآمن - رأس المال</title>
  <style type="text/css">
    :root {
      color-scheme: dark only !important;
      supported-color-schemes: dark only !important;
    }
    body, table, td, p, div {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
      -webkit-font-smoothing: antialiased !important;
    }
    .gmail-dark-fix {
      background-color: #060913 !important;
      background-image: linear-gradient(#060913, #060913) !important;
    }
    .card-dark-fix {
      background-color: #0f172a !important;
      background-image: linear-gradient(#0f172a, #0f172a) !important;
    }
  </style>
</head>
<body bgcolor="#060913" class="gmail-dark-fix" style="margin:0; padding:0; background-color:#060913 !important; background-image:linear-gradient(#060913, #060913) !important; color:#f8fafc !important; direction:rtl; text-align:right;">
  
  <!-- Outer Wrapper with linear-gradient (Immune to Gmail Inversion) -->
  <table role="presentation" width="100%" bgcolor="#060913" border="0" cellspacing="0" cellpadding="0" class="gmail-dark-fix" style="background-color:#060913 !important; background-image:linear-gradient(#060913, #060913) !important; width:100%; margin:0; padding:30px 10px;">
    <tr>
      <td align="center" style="padding:5px;">
        
        <!-- Main Card Container -->
        <table role="presentation" width="100%" bgcolor="#0f172a" border="0" cellspacing="0" cellpadding="0" class="card-dark-fix" style="max-width:500px; background-color:#0f172a !important; background-image:linear-gradient(#0f172a, #0f172a) !important; border:2px solid #23324d; border-radius:20px; overflow:hidden; box-shadow:0 30px 60px rgba(0,0,0,0.9);">
          
          <!-- Top Gold Accent Ribbon -->
          <tr>
            <td height="5" bgcolor="#d4af37" style="background:linear-gradient(90deg, #996515 0%, #d4af37 50%, #f59e0b 100%);"></td>
          </tr>

          <!-- Header with Official Logo -->
          <tr>
            <td align="center" bgcolor="#090e1a" style="padding:28px 20px 20px 20px; background-color:#090e1a !important; background-image:linear-gradient(#090e1a, #090e1a) !important; text-align:center; border-bottom:1px solid #1e2c45;">
              <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto 12px auto;">
                <tr>
                  <td align="center" style="border-radius:14px; overflow:hidden; border:1px solid rgba(212,175,55,0.4);">
                    <img src="https://rasalmal.online/assets/official-logo.jpg?v=3" width="140" height="78" alt="رأس المال | RA'S AL-MAL" style="display:block; width:140px; height:78px; border:0; outline:none; text-decoration:none;" />
                  </td>
                </tr>
              </table>
              <div style="font-size:22px; font-weight:900; color:#ffffff !important; letter-spacing:-0.3px; margin-bottom:4px;">رأس المال</div>
              <div style="font-size:11px; font-weight:700; color:#d4af37 !important; text-transform:uppercase; letter-spacing:2px;">RA'S AL-MAL BUSINESS EMPIRE</div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td bgcolor="#0f172a" class="card-dark-fix" style="padding:28px 25px 20px 25px; background-color:#0f172a !important; background-image:linear-gradient(#0f172a, #0f172a) !important;">
              
              <div style="font-size:17px; font-weight:800; color:#ffffff !important; margin-bottom:12px;">
                أهلاً بك${username ? ` يا <strong style="color:#f59e0b !important;">${username}</strong>` : ''}،
              </div>

              <p style="font-size:14px; line-height:1.75; color:#cbd5e1 !important; margin:0 0 22px 0;">
                تم طلب رمز تحقق أمني لتوثيق <strong style="color:#ffffff !important;">${typeText}</strong> الخاص بحسابك. يُرجى استخدام رمز الأمان المكون من 6 أرقام التالي لتأكيد العملية:
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" width="100%" bgcolor="#060913" border="0" cellspacing="0" cellpadding="0" class="gmail-dark-fix" style="background-color:#060913 !important; background-image:linear-gradient(#060913, #060913) !important; border:1px solid #2a3d5e; border-radius:14px; margin:0 0 22px 0;">
                <tr>
                  <td align="center" style="padding:22px 10px;">
                    <div style="font-size:11px; font-weight:800; color:#d4af37 !important; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:12px;">رمز التحقق (OTP)</div>
                    <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" style="direction:ltr; margin:0 auto 10px auto;">
                      <tr>
                        ${codeDigits}
                      </tr>
                    </table>
                    <div style="font-size:12px; color:#94a3b8 !important;">صلاحية الرمز تنتهي خلال <span style="color:#f59e0b !important; font-weight:800;">5 دقائق</span></div>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table role="presentation" width="100%" bgcolor="#131c2e" border="0" cellspacing="0" cellpadding="0" style="background-color:#131c2e !important; background-image:linear-gradient(#131c2e, #131c2e) !important; border-right:4px solid #d4af37; border-radius:8px; margin:0 0 20px 0;">
                <tr>
                  <td style="padding:12px 15px; font-size:12px; line-height:1.6; color:#cbd5e1 !important;">
                    <strong style="color:#ffffff !important;">تنبيه أمني:</strong> لا تشارك هذا الرمز مع أي شخص. فريق إدارة رأس المال لن يطلب منك هذا الرمز أبداً.
                  </td>
                </tr>
              </table>

              <p style="font-size:12px; color:#64748b !important; margin:0; line-height:1.6;">
                إذا لم تكن أنت من أجرى هذا الطلب، يمكنك تجاهل هذه الرسالة بأمان دون أي قلق.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" bgcolor="#080c16" style="padding:20px 25px; background-color:#080c16 !important; background-image:linear-gradient(#080c16, #080c16) !important; border-top:1px solid #1a253a; text-align:center;">
              <div style="font-size:11px; color:#64748b !important; line-height:1.8;">
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
