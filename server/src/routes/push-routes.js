/**
 * Ras ALmal Tycoon — Push Notification Routes
 * Endpoints for public VAPID key retrieval, player subscriptions, and broadcast triggers.
 */

const crypto = require('crypto');
const config = require('../config/env');
const pushService = require('../services/push-service');

async function pushRoutes(fastify, options) {
  // 1. GET /api/push/public-key
  fastify.get('/api/push/public-key', async (request, reply) => {
    return {
      publicKey: pushService.getPublicKey()
    };
  });

  // 2. POST /api/push/subscribe (Register client subscription)
  fastify.post('/api/push/subscribe', async (request, reply) => {
    const { username, subscription } = request.body || {};
    if (!subscription || !subscription.endpoint) {
      reply.code(400);
      return { error: 'Missing or invalid subscription object' };
    }

    try {
      const record = pushService.saveSubscription(username, subscription);
      return {
        success: true,
        message: 'Push subscription registered successfully',
        username: record.username,
        stats: pushService.getStats()
      };
    } catch (err) {
      reply.code(500);
      return { error: err.message };
    }
  });

  // 3. GET /api/push/stats
  fastify.get('/api/push/stats', async (request, reply) => {
    return {
      success: true,
      stats: pushService.getStats()
    };
  });

  // 4. POST /api/push/broadcast (Admin Broadcast Push to all player devices)
  fastify.post('/api/push/broadcast', async (request, reply) => {
    const { title, body, url } = request.body || {};

    // Validate Admin Token or Admin Key
    const token = request.headers['x-admin-token'] || '';
    const adminKey = (request.body && request.body.adminKey) || '';

    let isAuthed = false;
    if (token && token === config.ADMIN_KEY_SHA256) {
      isAuthed = true;
    } else if (adminKey) {
      const hashed = crypto.createHash('sha256').update(String(adminKey)).digest('hex');
      if (hashed === config.ADMIN_KEY_SHA256 || adminKey === config.ADMIN_KEY_SHA256) {
        isAuthed = true;
      }
    }

    if (!isAuthed) {
      reply.code(403);
      return { error: 'Unauthorized: Invalid admin credentials' };
    }

    if (!title || !body) {
      reply.code(400);
      return { error: 'Title and body are required for push notifications' };
    }

    try {
      const payload = {
        title: String(title).slice(0, 100),
        body: String(body).slice(0, 250),
        url: url || '/'
      };

      const result = await pushService.broadcast(payload);
      return {
        success: true,
        message: `Broadcast sent to ${result.sent}/${result.total} devices`,
        sent: result.sent,
        total: result.total
      };
    } catch (err) {
      reply.code(500);
      return { error: err.message };
    }
  });
}

module.exports = pushRoutes;
