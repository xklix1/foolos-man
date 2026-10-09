/**
 * Ras ALmal Tycoon — Authoritative Admin API Routes
 * Secures administrative mutations against RLS while preventing frontend credential exposure.
 */

const crypto = require('crypto');
const config = require('../config/env');
const eventService = require('../services/event-service');

const ALLOWED_TABLES = new Set([
  'players',
  'globals',
  'gift_codes',
  'corporations',
  'live_auctions',
  'transfers',
  'transfer_requests',
  'mailbox',
  'events',
  'banned_devices'
]);

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function sanitizePayload(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);
  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    clean[key] = (val && typeof val === 'object') ? sanitizePayload(val) : val;
  }
  return clean;
}

async function adminRoutes(fastify, options) {
  const sessionManager = options.sessionManager;

  // Rate limiting for admin endpoint: 120 req/min
  const adminRateLimit = {
    max: 120,
    timeWindow: 60000
  };

  /**
   * Middleware/Hook to verify admin token
   */
  const requireAdminAuth = async (request, reply) => {
    const token = request.headers['x-admin-token'] || '';
    if (!token || !safeCompare(token, config.ADMIN_KEY_SHA256)) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'مفتاح الإدارة غير صالح أو منتهي الصلاحية.'
      });
      return;
    }
  };

  /**
   * POST /api/admin/mutate
   * Authoritatively performs mutations on database tables using SERVICE_ROLE_KEY
   */
  fastify.post('/mutate', {
    config: { rateLimit: adminRateLimit },
    preHandler: [requireAdminAuth]
  }, async (request, reply) => {
    const { table, method = 'PATCH', query = '', body = null } = request.body || {};

    if (!table || !ALLOWED_TABLES.has(table)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: `الجدول المحدد غير مسموح به إدارياً: ${table}`
      });
    }

    const cleanMethod = String(method).toUpperCase();
    if (!['POST', 'PATCH', 'DELETE'].includes(cleanMethod)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'طريقة الطلب غير مدعومة (يسمح فقط بـ POST, PATCH, DELETE).'
      });
    }

    const cleanBody = sanitizePayload(body);

    // Absolute Admin Immunity for Master Admin (Khaled)
    if (table === 'players') {
      const qLower = String(query || '').toLowerCase();
      const bUserLower = (cleanBody && cleanBody.username ? String(cleanBody.username) : '').toLowerCase();
      const isTargetingKhaled = qLower.includes('khaled') || bUserLower === 'khaled';

      if (isTargetingKhaled) {
        if (cleanMethod === 'DELETE') {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'حساب المشرف العام محمي تماماً من الحذف.'
          });
        }
        if (cleanBody && (cleanBody.is_banned === true || (cleanBody.state && cleanBody.state.isBanned === true) || (cleanBody.jail_timer && Number(cleanBody.jail_timer) > 0))) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'حساب المشرف العام محمي تماماً من الحظر والسجن.'
          });
        }
      }
    }

    const serviceKey = config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY;
    const url = `${config.SUPABASE_URL}/rest/v1/${table}${query ? '?' + query.replace(/^\?/, '') : ''}`;

    const preferHeader = cleanMethod === 'POST'
      ? 'resolution=merge-duplicates, return=representation'
      : 'return=representation';

    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': preferHeader
    };

    try {
      const fetchOpts = {
        method: cleanMethod,
        headers
      };
      if (cleanBody && cleanMethod !== 'DELETE') {
        fetchOpts.body = JSON.stringify(cleanBody);
      }

      const res = await fetch(url, fetchOpts);
      const resText = await res.text();
      let resData = null;
      try { resData = JSON.parse(resText); } catch (e) { resData = resText; }

      if (!res.ok) {
        request.log.error({ status: res.status, body: resText }, '[Admin Mutate] Supabase Error');
        return reply.status(res.status).send({
          error: 'Supabase Error',
          details: resData
        });
      }

      // If an active player was modified, reset, banned, or deleted, sync/evict in sessionManager
      if (table === 'players' && sessionManager) {
        try {
          const matchUser = (query || '').match(/username=(?:eq|ilike)\.([^&]+)/i);
          if (matchUser && matchUser[1]) {
            const targetUsername = decodeURIComponent(matchUser[1]).replace(/^@/, '').trim();
            if (cleanMethod === 'DELETE') {
              sessionManager.unloadSession(targetUsername);
            } else {
              const session = sessionManager.getSession(targetUsername);
              if (session) {
                if (cleanBody && cleanBody.is_banned === true) {
                  sessionManager.unloadSession(targetUsername);
                } else if (cleanBody) {
                  if (cleanBody.cash !== undefined) session.state.cash = Number(cleanBody.cash);
                  if (cleanBody.bank !== undefined) session.state.bank = Number(cleanBody.bank);
                  if (cleanBody.net_worth !== undefined) session.state.netWorth = Number(cleanBody.net_worth);
                  if (cleanBody.xp !== undefined) session.state.xp = Number(cleanBody.xp);
                  if (cleanBody.state) {
                    if (cleanBody.state.isReset === true) {
                      session.state = JSON.parse(JSON.stringify(cleanBody.state));
                    } else {
                      Object.assign(session.state, cleanBody.state);
                    }
                  }
                  session.dirty = false;
                }
              }
            }
          }
        } catch (syncErr) {
          request.log.warn(syncErr, '[Admin Mutate] Session sync warning');
        }
      }

      return reply.send({
        success: true,
        data: resData
      });
    } catch (err) {
      request.log.error(err, '[Admin Mutate] Internal Exception');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: err.message
      });
    }
  });

  /**
   * POST /api/admin/verify
   * Validates admin token without performing mutation
   */
  /**
   * POST /api/admin/process-topup
   * Authoritatively processes a top-up request on the server using service_role key.
   */
  fastify.post('/process-topup', {
    config: { rateLimit: adminRateLimit },
    preHandler: [requireAdminAuth]
  }, async (request, reply) => {
    const { requestId, action, reviewerNote = '' } = request.body || {};
    if (!requestId || !['approved', 'rejected'].includes(action)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'requestId and valid action (approved/rejected) are required.' });
    }

    const serviceKey = config.SUPABASE_SERVICE_ROLE_KEY;
    const ts = Date.now();

    try {
      // 1. Fetch topup_requests from globals
      const gUrl = `${config.SUPABASE_URL}/rest/v1/globals?id=eq.topup_requests`;
      const gRes = await fetch(gUrl, {
        headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
      });
      const gRows = await gRes.json();
      if (!gRows || !gRows[0] || !gRows[0].data || !Array.isArray(gRows[0].data.requests)) {
        return reply.status(404).send({ error: 'Not Found', message: 'سجل طلبات الشحن غير موجود.' });
      }

      const requests = gRows[0].data.requests;
      const reqIndex = requests.findIndex(r => r.id === requestId);
      if (reqIndex === -1) {
        return reply.status(404).send({ error: 'Not Found', message: 'طلب الشحن غير موجود.' });
      }

      const req = requests[reqIndex];
      if (req.status !== 'pending') {
        return reply.status(400).send({ error: 'Already Processed', message: `تمت معالجة هذا الطلب مسبقاً (${req.status === 'approved' ? 'مقبول' : 'مرفوض'}).` });
      }

      const targetUser = req.username;

      if (action === 'approved') {
        // 2. Fetch player data
        const pUrl = `${config.SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(targetUser)}&limit=1`;
        const pRes = await fetch(pUrl, {
          headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
        });
        const pRows = await pRes.json();
        if (!pRows || pRows.length === 0) {
          return reply.status(404).send({ error: 'Player Not Found', message: `حساب اللاعب "${targetUser}" غير موجود بقاعدة البيانات.` });
        }

        const playerDoc = pRows[0];
        const pState = (typeof playerDoc.state === 'object' && playerDoc.state) ? playerDoc.state : {};
        const rewards = req.rewards || {};
        
        const addedCash = Number(rewards.cash) || 0;
        const addedBank = Number(rewards.bank) || 0;
        const addedXP = Number(rewards.xp) || 0;
        const addedGold = Number(rewards.gold) || 0;
        const customBadge = rewards.customBadge || '';
        const badgeTitle = rewards.badgeTitle || req.packageName;

        const updatedCash = (Number(playerDoc.cash) || 0) + addedCash;
        const updatedBank = (Number(playerDoc.bank) || 0) + addedBank;
        const updatedXP = (Number(playerDoc.xp) || 0) + addedXP;
        const updatedGold = (Number(playerDoc.gold) || 0) + addedGold;
        const updatedNetworth = updatedCash + updatedBank;

        pState.cash = updatedCash;
        pState.bank = updatedBank;
        pState.xp = updatedXP;
        pState.gold = updatedGold;
        pState.netWorth = updatedNetworth;

        if (customBadge) {
          pState.customBadge = customBadge;
          pState.badgeTitle = badgeTitle;
        }

        // Handle VIP glow packages
        if (req.packageId === 'pkg_vip_chat_glow') {
          pState.chatGlow = 'gold_neon';
          pState.hasChatGlow = true;
          pState.activePackage = 'pkg_vip_chat_glow';
        } else if (req.packageId === 'pkg_vip_royal_ultimate') {
          pState.chatGlow = 'cyber_rainbow';
          pState.hasChatGlow = true;
          pState.isVerified = true;
          pState.vipVerified = true;
          pState.activePackage = 'pkg_vip_royal_ultimate';
        } else if (req.packageId === 'pkg_vip_crimson_flame') {
          pState.chatGlow = 'crimson_flame';
          pState.hasChatGlow = true;
          pState.activePackage = 'pkg_vip_crimson_flame';
        } else if (req.packageId === 'pkg_vip_svip_blue_flame') {
          pState.chatGlow = 'blue_flame';
          pState.hasChatGlow = true;
          pState.customBadge = 'SVIP';
          pState.badgeTitle = 'SVIP';
          pState.activePackage = 'pkg_vip_svip_blue_flame';
        } else if (req.packageId === 'pkg_vip_verified') {
          pState.isVerified = true;
          pState.vipVerified = true;
          pState.activePackage = 'pkg_vip_verified';
        }

        pState.hasPurchasedTopup = true;
        pState.purchasedTopups = (pState.purchasedTopups || 0) + 1;
        pState.adminModifiedTimestamp = ts;

        // Update player row in Supabase
        const updatePlayerUrl = `${config.SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(targetUser)}`;
        await fetch(updatePlayerUrl, {
          method: 'PATCH',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            cash: updatedCash,
            bank: updatedBank,
            gold: updatedGold,
            xp: updatedXP,
            net_worth: updatedNetworth,
            state: pState,
            admin_modified_timestamp: ts
          })
        });

        // Update in-memory session if player is active
        if (sessionManager) {
          const session = sessionManager.getSession(targetUser);
          if (session) {
            session.state.cash = updatedCash;
            session.state.bank = updatedBank;
            session.state.gold = updatedGold;
            session.state.xp = updatedXP;
            session.state.netWorth = updatedNetworth;
            session.state.adminModifiedTimestamp = ts;
            if (customBadge) {
              session.state.customBadge = customBadge;
              session.state.badgeTitle = badgeTitle;
            }
            session.dirty = false;
          }
        }

        // Send topup receipt mail
        const topupReceiptData = {
          packageId: req.packageId,
          packageName: req.packageName,
          price: req.price,
          cash: addedCash,
          bank: addedBank,
          gold: addedGold,
          xp: addedXP,
          newCash: updatedCash,
          newBank: updatedBank,
          newGold: updatedGold,
          newXp: updatedXP,
          newWorth: updatedNetworth,
          isPreApplied: true,
          customBadge: customBadge,
          badgeTitle: badgeTitle,
          items: rewards.items || {},
          status: 'approved',
          date: ts,
          receiptNumber: req.receiptNumber || '',
          senderPhoneOrName: req.senderPhoneOrName || '',
          reviewerNote: reviewerNote || 'تم الاعتماد والشحن بنجاح بواسطة الإدارة'
        };

        await fetch(`${config.SUPABASE_URL}/rest/v1/mailbox`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            sender: 'إدارة اللعبة (Financial Team)',
            recipient: targetUser,
            type: 'topup_receipt',
            payload: topupReceiptData,
            status: 'unread',
            created_at: ts
          })
        });

        if (addedCash > 0 || addedBank > 0) {
          await fetch(`${config.SUPABASE_URL}/rest/v1/mailbox`, {
            method: 'POST',
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              sender: 'إدارة اللعبة (Financial Team)',
              recipient: targetUser,
              type: 'admin_balance_grant',
              payload: {
                addedCash,
                addedBank,
                totalAmount: addedCash + addedBank,
                target: targetUser,
                newCash: updatedCash,
                newBank: updatedBank,
                newXp: updatedXP,
                isPreApplied: true,
                timestamp: ts,
                note: `شحن فوري معتمد: [${req.packageName}]`
              },
              status: 'unread',
              created_at: ts
            })
          });
        }

        if (addedGold > 0) {
          await fetch(`${config.SUPABASE_URL}/rest/v1/mailbox`, {
            method: 'POST',
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              sender: 'إدارة اللعبة (Financial Team)',
              recipient: targetUser,
              type: 'admin_gold_grant',
              payload: {
                addedGold,
                newGold: updatedGold,
                isPreApplied: true,
                timestamp: ts,
                note: `شحن سبائك الذهب: [${req.packageName}]`
              },
              status: 'unread',
              created_at: ts
            })
          });
        }

        req.status = 'approved';
        req.reviewedAt = ts;
        req.reviewerNote = reviewerNote || 'تم الاعتماد والشحن بنجاح بواسطة الإدارة';
      } else {
        req.status = 'rejected';
        req.reviewedAt = ts;
        req.reviewerNote = reviewerNote || 'تم رفض الطلب لعدم تطابق بيانات التحويل';

        await fetch(`${config.SUPABASE_URL}/rest/v1/mailbox`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            sender: 'إدارة اللعبة (Financial Team)',
            recipient: targetUser,
            type: 'topup_receipt',
            payload: {
              packageId: req.packageId,
              packageName: req.packageName,
              price: req.price,
              status: 'rejected',
              date: ts,
              receiptNumber: req.receiptNumber || '',
              senderPhoneOrName: req.senderPhoneOrName || '',
              reviewerNote: req.reviewerNote
            },
            status: 'unread',
            created_at: ts
          })
        });
      }

      // Update globals.topup_requests
      await fetch(`${config.SUPABASE_URL}/rest/v1/globals?id=eq.topup_requests`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          data: { requests, updatedAt: ts },
          updated_at: ts
        })
      });

      return reply.send({
        success: true,
        request: req
      });
    } catch (err) {
      request.log.error(err, '[Admin Process Topup Error]');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: err.message
      });
    }
  });

  fastify.post('/verify', {
    config: { rateLimit: adminRateLimit },
    preHandler: [requireAdminAuth]
  }, async (request, reply) => {
    return reply.send({
      success: true,
      role: 'admin_root',
      timestamp: Date.now()
    });
  });

  /**
   * POST /api/admin/grant-gold
   * Grants gold currency to a player (Beta-gated strictly to Khaled)
   */
  fastify.post('/grant-gold', {
    config: { rateLimit: adminRateLimit },
    preHandler: [requireAdminAuth]
  }, async (request, reply) => {
    const { username, amount } = request.body || {};
    if (!username) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Username is required.' });
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Amount must be a positive number.' });
    }

    // Gold currency can now be granted to any valid player

    try {
      const uKey = username.trim().toLowerCase();
      const session = sessionManager ? sessionManager.getSession(uKey) : null;

      if (session) {
        // Online player: update in-memory state and mark dirty
        session.state.gold = Math.max(0, Number(session.state.gold || 0) + numAmount);
        session.dirty = true;
        session.lastActivity = Date.now();

        return reply.send({
          success: true,
          username: session.username,
          goldGranted: numAmount,
          currentGold: session.state.gold,
          isOnline: true
        });
      } else {
        // Offline player: update PostgreSQL directly
        const serviceKey = config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY;
        const fetchUrl = `${config.SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(username.trim())}&select=gold,state`;
        const fetchRes = await fetch(fetchUrl, {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
          }
        });
        const rows = await fetchRes.json();
        if (!Array.isArray(rows) || rows.length === 0) {
          return reply.status(404).send({ error: 'Not Found', message: 'Player account not found.' });
        }

        const existingRow = rows[0];
        const currentGold = Number(existingRow.gold || 0);
        const newGold = currentGold + numAmount;

        const rawState = (typeof existingRow.state === 'object' && existingRow.state) ? existingRow.state : {};
        rawState.gold = newGold;

        const patchUrl = `${config.SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(username.trim())}`;
        const patchRes = await fetch(patchUrl, {
          method: 'PATCH',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            gold: newGold,
            state: rawState
          })
        });

        if (!patchRes.ok) {
          throw new Error(`Failed to update offline gold: ${await patchRes.text()}`);
        }

        return reply.send({
          success: true,
          username: username.trim(),
          goldGranted: numAmount,
          currentGold: newGold,
          isOnline: false
        });
      }
    } catch (err) {
      request.log.error(err, '[Grant Gold] Error');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  /**
   * POST /api/admin/create-event
   * Creates a competitive event in public.events
   */
  fastify.post('/create-event', {
    config: { rateLimit: adminRateLimit },
    preHandler: [requireAdminAuth]
  }, async (request, reply) => {
    const { id, title, type = 'net_worth_growth', durationHours = 24, prize_pool_gold = [500, 250, 100] } = request.body || {};
    if (!title) return reply.status(400).send({ error: 'Event title is required.' });

    const eventId = id || ('ev_' + Date.now());
    const startsAt = Date.now();
    const endsAt = startsAt + (Number(durationHours) * 3600 * 1000);

    const serviceKey = config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY;
    const res = await fetch(`${config.SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: eventId,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        type,
        prize_pool_gold,
        is_active: true
      })
    });

    if (!res.ok) {
      return reply.status(500).send({ error: 'Failed to create event: ' + await res.text() });
    }

    const created = await res.json();
    return reply.send({
      success: true,
      event: (Array.isArray(created) && created.length > 0) ? created[0] : created
    });
  });

  /**
   * POST /api/admin/evaluate-event
   * Evaluates event ranking and authoritatively rewards gold (Beta for Khaled)
   */
  fastify.post('/evaluate-event', {
    config: { rateLimit: adminRateLimit },
    preHandler: [requireAdminAuth]
  }, async (request, reply) => {
    const { eventId, testTargetUser = 'Khaled' } = request.body || {};
    if (!eventId) {
      return reply.status(400).send({ error: 'eventId is required.' });
    }

    try {
      const result = await eventService.evaluateAndRewardEvent(eventId, testTargetUser);
      return reply.send({
        success: true,
        evaluation: result
      });
    } catch (err) {
      request.log.error(err, '[Evaluate Event] Error');
      return reply.status(500).send({ error: 'Failed to evaluate event: ' + err.message });
    }
  });

  /**
   * POST /api/admin/restart
   * Gracefully restarts the Fastify process so PM2 reloads updated codebase
   */
  fastify.post('/restart', {
    config: { rateLimit: adminRateLimit },
    preHandler: [requireAdminAuth]
  }, async (request, reply) => {
    reply.send({ success: true, message: 'Server process restarting via PM2 autorestart...' });
    setTimeout(() => {
      process.exit(0);
    }, 500);
  });

  /**
   * POST /api/admin/git-pull
   * Pulls latest code from git and restarts the server
   */
  fastify.post('/git-pull', {
    config: { rateLimit: adminRateLimit },
    preHandler: [requireAdminAuth]
  }, async (request, reply) => {
    const { execSync } = require('child_process');
    try {
      const p = require('path');
      const fs = require('fs');
      let cwd = p.resolve(__dirname, '../../../');
      if (!fs.existsSync(p.join(cwd, '.git')) && fs.existsSync(p.join(cwd, '..', '.git'))) {
        cwd = p.resolve(cwd, '..');
      }
      try {
        execSync('git checkout -- server/backups/', { cwd, timeout: 10000 });
      } catch (e) {}
      const out = execSync('git pull origin main', { cwd, timeout: 30000 }).toString();
      reply.send({ success: true, output: out, message: 'Code pulled successfully. Server restarting automatically via PM2...' });
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    } catch (err) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/admin/nginx-fix
   * Inspects and enforces strict Cache-Control headers on Nginx for html, json, and sw.js
   */
  fastify.post('/nginx-fix', {
    config: { rateLimit: adminRateLimit },
    preHandler: [requireAdminAuth]
  }, async (request, reply) => {
    const { execSync } = require('child_process');
    const fs = require('fs');
    try {
      const whoami = execSync('whoami').toString().trim();
      let nginxFiles = [];
      try {
        const findOut = execSync('find /etc/nginx -maxdepth 3 -type f \\( -name "*.conf" -o -name "*rasalmal*" \\) 2>/dev/null').toString().trim();
        nginxFiles = findOut.split('\n').filter(Boolean);
      } catch (e) {}

      let modifiedFile = null;
      let diffOrStatus = '';
      let testOutput = '';

      // Look for the site config (e.g. rasalmal.online, default, or site config)
      for (const file of nginxFiles) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          if (content.includes('rasalmal.online') || content.includes('root') && content.includes('server_name')) {
            // Check if it already has strict cache-control
            if (!content.includes('no-store, must-revalidate')) {
              // Inject cache control block before the last closing bracket of server { ... }
              const cacheBlock = `
    # Strict Cache-Busting for HTML, JSON, and ServiceWorker
    location ~* \\.(?:html|json)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }

    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }
`;
              // Insert inside server { block
              const serverIdx = content.lastIndexOf('}');
              if (serverIdx !== -1) {
                const newContent = content.slice(0, serverIdx) + cacheBlock + '\n' + content.slice(serverIdx);
                fs.writeFileSync(file + '.bak', content, 'utf8');
                fs.writeFileSync(file, newContent, 'utf8');
                modifiedFile = file;

                // Validate nginx syntax
                try {
                  testOutput = execSync('nginx -t 2>&1').toString();
                  // Reload nginx
                  execSync('systemctl reload nginx || nginx -s reload');
                  diffOrStatus = 'Nginx successfully configured and reloaded with strict cache-control headers.';
                } catch (tErr) {
                  // Rollback on syntax error
                  fs.writeFileSync(file, content, 'utf8');
                  diffOrStatus = 'Rolled back due to syntax test failure: ' + tErr.message;
                }
              }
            } else {
              diffOrStatus = 'Nginx already contains strict cache-control headers.';
              modifiedFile = file;
            }
            break;
          }
        } catch (readErr) {
          // Continue to next file if permission denied
        }
      }

      return reply.send({
        success: true,
        whoami,
        nginxFiles,
        modifiedFile,
        diffOrStatus,
        testOutput
      });
    } catch (err) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });
}

module.exports = adminRoutes;
