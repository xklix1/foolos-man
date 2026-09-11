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

  // 5. POST /api/push/test-delayed (Test receiving a push notification after closing the app)
  fastify.post('/api/push/test-delayed', async (request, reply) => {
    const { username, delaySeconds } = request.body || {};
    if (!username) {
      reply.code(400);
      return { error: 'Username is required' };
    }

    const waitSec = Math.min(30, Math.max(3, Number(delaySeconds) || 6));
    const u = String(username).trim();

    setTimeout(async () => {
      try {
        const payload = {
          title: '👑 تجربة إشعار بالخلفية (Offline Push)',
          body: `مرحباً بك يا ${u}! وصلك هذا الإشعار بنجاح وتطبيق اللعبة مغلق تماماً عبر خادم الـ Web Push.`,
          url: '/'
        };
        await pushService.sendToUser(u, payload);
      } catch (err) {
        console.warn(`[PushRoutes] Delayed test push failed for ${u}:`, err.message);
      }
    }, waitSec * 1000);

    return {
      success: true,
      message: `Delayed push scheduled for ${u} in ${waitSec} seconds. Close the app or lock screen now!`,
      delaySeconds: waitSec
    };
  });

  // 6. POST /api/push/notify-player (Push alert to specific player on wire/dm/admin events)
  fastify.post('/api/push/notify-player', async (request, reply) => {
    const { recipient, title, body, url } = request.body || {};
    if (!recipient || !title || !body) {
      reply.code(400);
      return { error: 'Recipient, title, and body are required' };
    }

    try {
      const payload = {
        title: String(title).slice(0, 100),
        body: String(body).slice(0, 250),
        url: url || '/'
      };
      const result = await pushService.sendToUser(recipient, payload);
      return {
        success: true,
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
