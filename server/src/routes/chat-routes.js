/**
 * Ras ALmal Tycoon — Authoritative Chat Routes
 * Fast, secure, server-mediated global chat powered by Supabase Service Role
 */

const config = require('../config/env');
const { containsProfanity, findBlockedWord } = require('../engine/profanity-filter');

// In-memory anti-spam cooldown tracker (per username)
const _userChatCooldowns = new Map();

async function chatRoutes(fastify, options) {
  const serviceKey = config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY;

  /**
   * POST /api/chat/send
   * Server-authoritative endpoint to safely send global chat messages
   */
  fastify.post('/api/chat/send', async (request, reply) => {
    const body = request.body || {};
    const rawSender = String(body.username || body.sender || '').trim();
    const rawMessage = String(body.message || '').trim();
    const rawTitle = String(body.senderTitle || body.title || 'عامل مبتدئ').trim();
    const extraMeta = (body.extraMeta && typeof body.extraMeta === 'object') ? body.extraMeta : {};

    if (!rawSender) {
      return reply.code(400).send({ error: 'Bad Request', message: 'اسم اللاعب مطلوب لإرسال الرسالة.' });
    }

    if (!rawMessage) {
      return reply.code(400).send({ error: 'Bad Request', message: 'لا يمكن إرسال رسالة فارغة.' });
    }

    const trimmedMsg = rawMessage.slice(0, 200);

    // 1. Anti-spam cooldown (800ms)
    const now = Date.now();
    const lastSent = _userChatCooldowns.get(rawSender) || 0;
    if (now - lastSent < 800 && rawSender !== 'الإدارة') {
      return reply.code(429).send({ error: 'Too Many Requests', message: 'يرجى التمهل قليلاً قبل إرسال رسالة جديدة.' });
    }

    // 2. Anti-profanity verification (except official administration)
    if (rawSender !== 'الإدارة') {
      const blocked = findBlockedWord(trimmedMsg);
      if (blocked || containsProfanity(trimmedMsg)) {
        const reason = blocked ? ` (بسبب كلمة: "${blocked}")` : '';
        return reply.code(400).send({
          error: 'Profanity Detected',
          message: `تم حظر الرسالة لاحتوائها على لفظ محظور ومخالف لقواعد اللعبة${reason}.`
        });
      }
    }

    // 3. Player status verification (Mute, Freeze, Ban)
    let pDoc = null;
    let pState = {};
    if (rawSender !== 'الإدارة') {
      try {
        const pRes = await fetch(`${config.SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(rawSender)}&select=*`, {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
          }
        });
        if (pRes.ok) {
          const rows = await pRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            pDoc = rows[0];
            pState = (pDoc.state && typeof pDoc.state === 'object') ? pDoc.state : {};
          }
        }
      } catch (err) {
        fastify.log.warn(`[Chat] Failed to query player document for ${rawSender}: ${err.message}`);
      }

      if (pDoc) {
        if (pDoc.is_banned) {
          return reply.code(403).send({ error: 'Account Banned', message: 'حسابك محظور من اللعبة والمحادثة العامة.' });
        }
        if (pState.freezeUntil && Number(pState.freezeUntil) > now) {
          const remMins = Math.ceil((Number(pState.freezeUntil) - now) / 60000);
          return reply.code(403).send({ error: 'Account Frozen', message: `حسابك مجمد مؤقتاً للتحقيق والمراجعة (متبقي ${remMins} دقيقة).` });
        }
        if (pState.mutedUntil && Number(pState.mutedUntil) > now) {
          const remMins = Math.ceil((Number(pState.mutedUntil) - now) / 60000);
          return reply.code(403).send({ error: 'Muted in Chat', message: `تم كتمك في الشات العام بواسطة إدارة الرقابة (متبقي ${remMins} دقيقة).` });
        }
      }
    }

    // 4. Resolve authoritative VIP Glow and Badges
    let finalGlow = extraMeta.chatGlow || pState.chatGlow || '';
    if (finalGlow === 'none') finalGlow = '';
    if (!finalGlow && pState) {
      if (pState.activePackage === 'pkg_vip_crimson_flame' || (pState.badgeTitle && String(pState.badgeTitle).includes('لهيب'))) {
        finalGlow = 'crimson_flame';
      } else if (pState.hasChatGlow || pState.activePackage === 'pkg_vip_chat_glow' || (pState.badgeTitle && String(pState.badgeTitle).includes('حوت الشات'))) {
        finalGlow = 'gold_neon';
      } else if (pState.activePackage === 'pkg_vip_royal_ultimate' || (pState.badgeTitle && (String(pState.badgeTitle).includes('الملك الأسطوري') || String(pState.badgeTitle).includes('إمبراطور')))) {
        finalGlow = 'cyber_rainbow';
      } else if (pState.activePackage === 'pkg_vip_svip_blue_flame' || pState.customBadge === 'SVIP') {
        finalGlow = 'blue_flame';
      }
    }

    const isVerified = Boolean(extraMeta.isVerified || pState.isVerified || pState.vipVerified || (pState.badges && pState.badges.includes('vip_verified')));
    const customBadge = extraMeta.customBadge || pState.customBadge || '';
    const seasonBadge = extraMeta.seasonBadge || pState.seasonBadge || pDoc?.seasonBadge || '';
    const avatarUrl = extraMeta.avatarUrl || pState.avatarUrl || '';
    const senderTitle = pDoc?.title || rawTitle || 'عامل مبتدئ';

    const msgObj = {
      id: 'msg_' + now + '_' + Math.random().toString(36).substring(2, 6),
      sender: pDoc ? pDoc.username : rawSender,
      senderTitle: senderTitle,
      message: trimmedMsg,
      facebookVerified: Boolean(extraMeta.facebookVerified || (pState.badges && pState.badges.includes('facebook'))),
      avatarUrl: avatarUrl,
      chatGlow: finalGlow,
      isVerified: isVerified,
      customBadge: customBadge,
      seasonBadge: seasonBadge,
      timestamp: now
    };

    // 5. Fetch, merge, and save authoritative chat_feed in Supabase globals table
    try {
      const gRes = await fetch(`${config.SUPABASE_URL}/rest/v1/globals?id=eq.chat_feed&select=data,updated_at`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        }
      });

      let currentFeed = [];
      if (gRes.ok) {
        const rows = await gRes.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.messages)) {
          currentFeed = rows[0].data.messages;
        }
      }

      // Deduplicate and maintain chronological order
      const seenIds = new Set();
      const mergedFeed = [];
      for (const m of currentFeed) {
        if (m && m.id && !seenIds.has(m.id)) {
          seenIds.add(m.id);
          mergedFeed.push(m);
        }
      }

      if (!seenIds.has(msgObj.id)) {
        mergedFeed.push(msgObj);
      }

      // Keep last 100 messages chronologically
      mergedFeed.sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0));
      const finalFeed = mergedFeed.length > 100 ? mergedFeed.slice(mergedFeed.length - 100) : mergedFeed;

      // Save via Service Role Key (bypasses RLS / permission restrictions securely)
      const saveRes = await fetch(`${config.SUPABASE_URL}/rest/v1/globals`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: 'chat_feed',
          data: { messages: finalFeed },
          updated_at: now
        })
      });

      if (!saveRes.ok) {
        const errTxt = await saveRes.text();
        throw new Error(`Failed to persist chat message to Supabase: ${errTxt}`);
      }

      // Update cooldown
      _userChatCooldowns.set(rawSender, now);

      return reply.code(200).send({
        success: true,
        message: 'تم إرسال الرسالة بنجاح.',
        chatMessage: msgObj,
        messages: finalFeed,
        updated_at: now
      });

    } catch (err) {
      fastify.log.error(err, '[Chat Send Error]');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'حدث خطأ أثناء حفظ رسالة الشات في السيرفر السحابي.'
      });
    }
  });

  /**
   * GET /api/chat/messages
   * Returns current active chat messages feed
   */
  fastify.get('/api/chat/messages', async (request, reply) => {
    try {
      const gRes = await fetch(`${config.SUPABASE_URL}/rest/v1/globals?id=eq.chat_feed&select=data,updated_at`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        }
      });

      if (!gRes.ok) {
        return reply.code(200).send({ success: true, messages: [] });
      }

      const rows = await gRes.json();
      const messages = (Array.isArray(rows) && rows.length > 0 && rows[0].data && Array.isArray(rows[0].data.messages))
        ? rows[0].data.messages
        : [];

      return reply.code(200).send({
        success: true,
        messages: messages,
        updated_at: rows[0]?.updated_at || Date.now()
      });
    } catch (err) {
      fastify.log.error(err, '[Chat Messages Fetch Error]');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'فشل جلب رسائل الشات من السيرفر.'
      });
    }
  });
}

module.exports = chatRoutes;
