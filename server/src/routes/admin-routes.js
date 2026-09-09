/**
 * Ras ALmal Tycoon — Authoritative Admin API Routes
 * Secures administrative mutations against RLS while preventing frontend credential exposure.
 */

const crypto = require('crypto');
const config = require('../config/env');

const ALLOWED_TABLES = new Set([
  'players',
  'globals',
  'gift_codes',
  'corporations',
  'live_auctions',
  'transfers',
  'transfer_requests',
  'mailbox'
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

    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
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

      // If an active player was modified or banned, sync/evict in sessionManager
      if (table === 'players' && sessionManager) {
        try {
          const matchUser = (query || '').match(/username=eq\.([^&]+)/);
          if (matchUser && matchUser[1]) {
            const targetUsername = decodeURIComponent(matchUser[1]);
            const session = sessionManager.getSession(targetUsername);
            if (session) {
              if (cleanBody && cleanBody.is_banned === true) {
                sessionManager.unloadSession(targetUsername);
              } else if (cleanBody) {
                if (cleanBody.cash !== undefined) session.state.cash = Number(cleanBody.cash);
                if (cleanBody.bank !== undefined) session.state.bank = Number(cleanBody.bank);
                if (cleanBody.net_worth !== undefined) session.state.netWorth = Number(cleanBody.net_worth);
                if (cleanBody.xp !== undefined) session.state.xp = Number(cleanBody.xp);
                if (cleanBody.state) Object.assign(session.state, cleanBody.state);
                session.dirty = false;
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
}

module.exports = adminRoutes;
