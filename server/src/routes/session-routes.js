/**
 * Ras ALmal Tycoon — Session & Lifecycle Endpoints
 */

const sessionManager = require('../services/session-manager');

async function sessionRoutes(fastify, options) {

  // POST /api/session/start (Brute-Force Shield: 20 attempts/min)
  fastify.post('/api/session/start', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const { username, pin } = request.body || {};
    if (!username) {
      return reply.code(400).send({ error: 'Username is required' });
    }

    try {
      const { session, offlineReport } = await sessionManager.getOrCreateSession(username, true);
      if (!session) {
        return reply.code(404).send({ error: 'Player account not found' });
      }

      // If pin is provided, verify it matches
      if (pin && session.pin && String(pin).trim() !== String(session.pin).trim()) {
        return reply.code(401).send({ error: 'Invalid PIN credentials' });
      }

      return {
        success: true,
        username: session.username,
        state: session.state,
        offlineReport: offlineReport,
        serverTime: Date.now()
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to start session: ' + err.message });
    }
  });

  // POST /api/session/heartbeat
  fastify.post('/api/session/heartbeat', async (request, reply) => {
    const { username } = request.body || {};
    if (!username) return reply.code(400).send({ error: 'Username is required' });

    const uKey = username.trim().toLowerCase();
    const session = sessionManager.sessions.get(uKey);
    if (session) {
      session.lastActivity = Date.now();
      session.state.lastSeen = Date.now();
    }

    return {
      success: true,
      serverTime: Date.now()
    };
  });

  // POST /api/session/exit
  fastify.post('/api/session/exit', async (request, reply) => {
    const { username } = request.body || {};
    if (!username) return reply.code(400).send({ error: 'Username is required' });

    const saved = await sessionManager.forceSaveSession(username);
    return {
      success: true,
      saved: saved,
      serverTime: Date.now()
    };
  });
}

module.exports = sessionRoutes;
