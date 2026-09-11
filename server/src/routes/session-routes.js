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

  // POST /api/session/sync-state (Synchronizes complete client state to authoritative session & DB)
  fastify.post('/api/session/sync-state', async (request, reply) => {
    const { username, state, immediate = false } = request.body || {};
    if (!username || !state) {
      return reply.code(400).send({ error: 'Username and state are required' });
    }

    // Strict identity validation: state.username MUST match username to prevent account overwriting
    if (state.username && state.username.trim().toLowerCase() !== username.trim().toLowerCase()) {
      fastify.log.warn(`Cross-account sync rejected: endpoint username="${username}", state.username="${state.username}"`);
      return reply.code(400).send({ error: 'State username mismatch' });
    }

    try {
      const saved = await sessionManager.updateSessionState(username, state, immediate === true);
      return {
        success: true,
        saved,
        serverTime: Date.now()
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to sync state: ' + err.message });
    }
  });

  // POST /api/session/exit
  fastify.post('/api/session/exit', async (request, reply) => {
    const { username, state } = request.body || {};
    if (!username) return reply.code(400).send({ error: 'Username is required' });

    // Strict identity validation on exit
    if (state && state.username && state.username.trim().toLowerCase() !== username.trim().toLowerCase()) {
      fastify.log.warn(`Cross-account exit sync rejected: endpoint username="${username}", state.username="${state.username}"`);
      return reply.code(400).send({ error: 'State username mismatch' });
    }

    let saved = false;
    if (state && typeof state === 'object') {
      saved = await sessionManager.updateSessionState(username, state, true);
    } else {
      saved = await sessionManager.forceSaveSession(username);
    }

    // Explicit exit: remove session from memory so next login triggers clean offline catchup
    await sessionManager.unloadSession(username);

    return {
      success: true,
      saved: saved,
      serverTime: Date.now()
    };
  });
}

module.exports = sessionRoutes;
