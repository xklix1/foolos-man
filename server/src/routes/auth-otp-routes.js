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
  // Format OTP code into spaced luxury digit cards with vibrant gold digits
  const codeDigits = String(otpCode).split('').map(d => `
    <td align="center" style="padding: 0 4px;">
      <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto;">
        <tr>
          <td align="center" width="46" height="54" bgcolor="#0b1329" style="width:46px; height:54px; background-color:#0b1329 !important; background-image:linear-gradient(#0b1329, #0b1329) !important; border:2px solid #f59e0b; border-radius:10px; text-align:center; vertical-align:middle; box-shadow:0 4px 12px rgba(0,0,0,0.8);">
            <span style="font-size:30px; font-weight:900; color:#fbbf24 !important; font-family:'Courier New', Courier, monospace; display:block; line-height:50px;">${d}</span>
          </td>
        </tr>
      </table>
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
    body, table, td, p, div, span, a {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
      -webkit-font-smoothing: antialiased !important;
    }
    .bg-main {
      background-color: #030712 !important;
      background-image: linear-gradient(#030712, #030712) !important;
    }
    .bg-card {
      background-color: #0d1527 !important;
      background-image: linear-gradient(#0d1527, #0d1527) !important;
    }
    .bg-box {
      background-color: #060a14 !important;
      background-image: linear-gradient(#060a14, #060a14) !important;
    }
  </style>
</head>
<body bgcolor="#030712" class="bg-main" style="margin:0; padding:0; background-color:#030712 !important; background-image:linear-gradient(#030712, #030712) !important; color:#ffffff !important; direction:rtl; text-align:right;">
  
  <!-- Outer Table Wrapper -->
  <table role="presentation" width="100%" bgcolor="#030712" border="0" cellspacing="0" cellpadding="0" class="bg-main" style="background-color:#030712 !important; background-image:linear-gradient(#030712, #030712) !important; width:100%; margin:0; padding:30px 10px;">
    <tr>
      <td align="center" style="padding:0;">
        
        <!-- Main Container Card -->
        <table role="presentation" width="100%" bgcolor="#0d1527" border="0" cellspacing="0" cellpadding="0" class="bg-card" style="max-width:520px; background-color:#0d1527 !important; background-image:linear-gradient(#0d1527, #0d1527) !important; border:2px solid #d4af37; border-radius:20px; overflow:hidden; box-shadow:0 25px 60px rgba(0,0,0,0.95);">
          
          <!-- Top Gold Ribbon -->
          <tr>
            <td height="6" bgcolor="#d4af37" style="height:6px; background-color:#d4af37 !important; background-image:linear-gradient(90deg, #996515 0%, #d4af37 50%, #f59e0b 100%) !important;"></td>
          </tr>

          <!-- Header Section with CDN Hosted Logo -->
          <tr>
            <td align="center" bgcolor="#080e1c" style="padding:28px 20px 22px 20px; background-color:#080e1c !important; background-image:linear-gradient(#080e1c, #080e1c) !important; text-align:center; border-bottom:1px solid #1e2c48;">
              
              <!-- Official Emblem Image -->
              <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto 14px auto;">
                <tr>
                  <td align="center" style="border-radius:14px; overflow:hidden; border:2px solid #d4af37; background-color:#030712;">
                    <img src="https://cdn.jsdelivr.net/gh/xklix1/foolos-man@main/assets/official-logo.jpg" width="160" height="90" alt="رأس المال | RA'S AL-MAL" style="display:block; width:160px; height:90px; border:0; outline:none; text-decoration:none;" />
                  </td>
                </tr>
              </table>

              <!-- Brand Titles -->
              <div style="font-size:24px; font-weight:900; color:#ffffff !important; letter-spacing:-0.5px; margin-bottom:5px;">
                <span style="color:#ffffff !important;">رأس المال</span>
              </div>
              <div style="font-size:12px; font-weight:800; color:#fbbf24 !important; text-transform:uppercase; letter-spacing:2.5px;">
                <span style="color:#fbbf24 !important;">RA'S AL-MAL BUSINESS EMPIRE</span>
              </div>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td bgcolor="#0d1527" class="bg-card" style="padding:32px 28px 24px 28px; background-color:#0d1527 !important; background-image:linear-gradient(#0d1527, #0d1527) !important;">
              
              <!-- Greeting -->
              <div style="font-size:19px; font-weight:800; color:#ffffff !important; margin-bottom:14px; line-height:1.4;">
                <span style="color:#ffffff !important;">أهلاً بك${username ? ` يا <span style="color:#fbbf24 !important; font-weight:900;">${username}</span>` : ''}،</span>
              </div>

              <!-- Message Description -->
              <p style="font-size:15px; line-height:1.8; color:#ffffff !important; margin:0 0 24px 0;">
                <span style="color:#f1f5f9 !important;">تم طلب رمز تحقق أمني لتوثيق <strong style="color:#fbbf24 !important;">${typeText}</strong> الخاص بحسابك. يُرجى استخدام رمز الأمان التالي لتأكيد العملية:</span>
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" width="100%" bgcolor="#060a14" border="0" cellspacing="0" cellpadding="0" class="bg-box" style="background-color:#060a14 !important; background-image:linear-gradient(#060a14, #060a14) !important; border:2px solid #233554; border-radius:16px; margin:0 0 24px 0;">
                <tr>
                  <td align="center" style="padding:24px 12px;">
                    
                    <div style="font-size:12px; font-weight:900; color:#fbbf24 !important; text-transform:uppercase; letter-spacing:2px; margin-bottom:16px;">
                      <span style="color:#fbbf24 !important;">رمز التحقق (OTP)</span>
                    </div>

                    <!-- 6 Digit Digits Grid -->
                    <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" style="direction:ltr; margin:0 auto 14px auto;">
                      <tr>
                        ${codeDigits}
                      </tr>
                    </table>

                    <div style="font-size:13px; font-weight:700; color:#e2e8f0 !important;">
                      <span style="color:#cbd5e1 !important;">صلاحية الرمز تنتهي خلال </span>
                      <span style="color:#f59e0b !important; font-weight:900; font-size:14px;">5 دقائق</span>
                    </div>

                  </td>
                </tr>
              </table>

              <!-- Security Notice Banner -->
              <table role="presentation" width="100%" bgcolor="#091020" border="0" cellspacing="0" cellpadding="0" style="background-color:#091020 !important; background-image:linear-gradient(#091020, #091020) !important; border-right:4px solid #f59e0b; border-radius:10px; margin:0 0 22px 0;">
                <tr>
                  <td style="padding:14px 18px; font-size:13px; line-height:1.7; color:#ffffff !important;">
                    <span style="color:#fbbf24 !important; font-weight:900;">تنبيه أمني:</span>
                    <span style="color:#e2e8f0 !important;"> لا تشارك هذا الرمز مع أي شخص. فريق إدارة رأس المال لن يطلب منك هذا الرمز أبداً تحت أي ظرف.</span>
                  </td>
                </tr>
              </table>

              <p style="font-size:13px; color:#94a3b8 !important; margin:0; line-height:1.7;">
                <span style="color:#94a3b8 !important;">إذا لم تكن أنت من أجرى هذا الطلب، يمكنك تجاهل هذه الرسالة بأمان دون أدنى قلق.</span>
              </p>

            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td align="center" bgcolor="#050812" style="padding:22px 25px; background-color:#050812 !important; background-image:linear-gradient(#050812, #050812) !important; border-top:1px solid #172338; text-align:center;">
              <div style="font-size:11px; color:#94a3b8 !important; line-height:1.9;">
                <span style="color:#64748b !important;">تم الإرسال من النطاق الموثق: </span>
                <span style="color:#fbbf24 !important; font-family:monospace; font-weight:bold;">auth.rasalmal.online</span><br>
                <span style="color:#64748b !important;">جميع الحقوق محفوظة &copy; ${new Date().getFullYear()} لعبة رأس المال &bull; RA'S AL-MAL EMPIRE</span>
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
async function sendEmailViaResend(toEmail, subject, htmlContent, textContent = '') {
  const apiKey = (process.env.RESEND_API_KEY || config.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('مفتاح RESEND_API_KEY غير موجود في إعدادات الخادم.');
  }

  // Use verified sender auth@rasalmal.online
  const fromAddress = process.env.RESEND_FROM_EMAIL || config.RESEND_FROM_EMAIL || 'رأس المال <auth@rasalmal.online>';

  const emailPayload = {
    from: fromAddress,
    to: [toEmail],
    subject: subject,
    html: htmlContent,
    reply_to: 'support@rasalmal.online',
    headers: {
      'X-Entity-Ref-ID': crypto.randomUUID(),
      'X-Auto-Response-Suppress': 'OOF, AutoReply'
    }
  };

  if (textContent) {
    emailPayload.text = textContent;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailPayload)
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
    const plainText = `مرحباً ${cleanUsername || 'المستثمر'}،\n\nرمز التحقق الخاص بك هو: ${otpCode}\n\nالغرض: ${typeText}\nصلاحية الرمز: 5 دقائق فقط.\n\nإذا لم تكن قد طلبت هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.\n\nرأس المال - Ras ALmal Tycoon\nhttps://rasalmal.online`;

    try {
      await sendEmailViaResend(cleanEmail, emailSubject, htmlBody, plainText);

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

    const { username } = request.body || {};
    if (username && typeof username === 'string') {
      try {
        const dbService = require('../services/db-service');
        const playerRow = await dbService.getPlayerByUsername(username);
        if (playerRow) {
          const stateObj = (playerRow.state && typeof playerRow.state === 'object') ? playerRow.state : {};
          stateObj.email = cleanEmail;
          await dbService.savePlayerState(username, stateObj);
        }
      } catch (bindErr) {
        request.log.warn({ bindErr }, 'Failed to bind email to player in Supabase');
      }
    }

    return reply.send({
      success: true,
      verified: true,
      email: cleanEmail,
      message: 'تم التحقق من الرمز بنجاح!'
    });
  });
};
