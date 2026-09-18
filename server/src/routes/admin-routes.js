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

    // Strict beta gating: only developer account 'Khaled' can receive gold
    if (username.trim().toLowerCase() !== 'khaled') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Gold currency is in closed beta and can only be granted to Khaled.'
      });
    }

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
}

module.exports = adminRoutes;
