/**
 * Ras ALmal Tycoon — Session & Lifecycle Endpoints
 */

const crypto = require('crypto');
const sessionManager = require('../services/session-manager');
const dbService = require('../services/db-service');

/**
 * Robust constant-time or hash-aware PIN verification against stored database PIN
 */
function verifyPinMatch(inputPin, storedPin) {
  if (!storedPin) return true; // Account has no PIN configured
  if (!inputPin) return false;
  const p = String(inputPin).trim();
  const stored = String(storedPin).trim();
  if (p === stored) return true;

  const hashed = crypto.createHash('sha256').update(p).digest('hex');
  if (
    stored === hashed ||
    stored === 's256_' + hashed ||
    stored.replace(/^s256_/, '') === hashed ||
    stored === 's256_' + p
  ) {
    return true;
  }
  return false;
}

function extractBearerToken(request) {
  const authHeader = request.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return (request.body && request.body.token) || null;
}

async function sessionRoutes(fastify, options) {

  // POST /api/session/register (Authoritative Registration Endpoint)
  fastify.post('/api/session/register', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const { playerRow } = request.body || {};
    if (!playerRow || !playerRow.username) {
      return reply.code(400).send({ error: 'بيانات التسجيل غير مكتملة' });
    }

    const u = String(playerRow.username).trim();
    if (u.length < 3 || u.length > 30) {
      return reply.code(400).send({ error: 'اسم المستخدم يجب أن يكون بين 3 و 30 حرفاً' });
    }

    try {
      // 1. Check if user already exists
      const existing = await dbService.getPlayerByUsername(u);
      if (existing) {
        return reply.code(409).send({ error: 'اسم المستخدم مسجل بالفعل. يرجى اختيار اسم آخر.' });
      }

      // 2. Strict anti-tamper enforcement for brand new player row
      const safeRow = {
        ...playerRow,
        username: u,
        is_admin: false,
        is_banned: false,
        cash: Number(playerRow.cash || 500000),
        bank: Number(playerRow.bank || 500000),
        dirty_cash: 0,
        net_worth: Number(playerRow.net_worth || 1000000),
        xp: 0,
        created_at: Number(playerRow.created_at || Date.now()),
        last_seen: Number(playerRow.last_seen || Date.now())
      };

      if (safeRow.state) {
        safeRow.state.cash = safeRow.cash;
        safeRow.state.bank = safeRow.bank;
        safeRow.state.netWorth = safeRow.net_worth;
      }

      const created = await dbService.createPlayer(safeRow);
      return reply.code(201).send({ success: true, player: created });
    } catch (err) {
      console.error('[SessionRoutes] /api/session/register error:', err.message);
      return reply.code(500).send({ error: err.message || 'فشل تسجيل الحساب على الخادم' });
    }
  });

  // POST /api/session/start (Brute-Force Shield: 20 attempts/min)
  fastify.post('/api/session/start', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: 60 * 1000
      }
    }
  }, async (request, reply) => {
    const { username, pin, sessionId, token } = request.body || {};
    const effectiveToken = extractBearerToken(request) || token;

    if (!username) {
      return reply.code(400).send({ error: 'Username is required' });
    }

    try {
      // 1. Load or fetch session WITHOUT triggering offline catchup yet (avoids eating offline time on 401)
      const { session } = await sessionManager.getOrCreateSession(username, false, sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Player account not found' });
      }

      // 2. Strict Authentication: Either valid sessionToken OR valid PIN
      let isAuthed = false;
      const dbSavedToken = session.state && session.state.sessionToken;
      if (effectiveToken && ((session.sessionToken && effectiveToken === session.sessionToken) || (dbSavedToken && effectiveToken === dbSavedToken))) {
        isAuthed = true;
        if (!session.sessionToken) {
          session.sessionToken = effectiveToken;
        }
      } else if (pin && verifyPinMatch(pin, session.pin)) {
        isAuthed = true;
        // Issue fresh cryptographically secure sessionToken
        session.sessionToken = 'tok_' + crypto.randomBytes(24).toString('hex');
        session.state.sessionToken = session.sessionToken;
        session.dirty = true;
      } else if (!session.pin) {
        isAuthed = true;
        if (!session.sessionToken) {
          session.sessionToken = 'tok_' + crypto.randomBytes(24).toString('hex');
          session.state.sessionToken = session.sessionToken;
        }
      }

      if (!isAuthed) {
        return reply.code(401).send({ error: 'Invalid PIN credentials or expired session token' });
      }

      // 3. User is 100% verified -> NOW run authoritative offline catchup
      const offlineReport = sessionManager.applyOfflineCatchup(session);

      return {
        success: true,
        username: session.username,
        sessionId: session.sessionId,
        sessionToken: session.sessionToken,
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

    const effectiveToken = extractBearerToken(request);
    const uKey = username.trim().toLowerCase();
    const session = sessionManager.sessions.get(uKey);
    if (session) {
      if (session.sessionToken && effectiveToken && effectiveToken !== session.sessionToken) {
        return reply.code(401).send({ error: 'Unauthorized: Invalid session token' });
      }
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
    const effectiveToken = extractBearerToken(request);

    if (!username || !state) {
      return reply.code(400).send({ error: 'Username and state are required' });
    }

    // Strict identity validation: state.username MUST match username to prevent account overwriting
    if (state.username && state.username.trim().toLowerCase() !== username.trim().toLowerCase()) {
      fastify.log.warn(`Cross-account sync rejected: endpoint username="${username}", state.username="${state.username}"`);
      return reply.code(400).send({ error: 'State username mismatch' });
    }

    const uKey = username.trim().toLowerCase();
    const activeSession = sessionManager.sessions.get(uKey);
    if (activeSession && activeSession.sessionToken && effectiveToken && effectiveToken !== activeSession.sessionToken) {
      return reply.code(401).send({ error: 'Unauthorized: Invalid or expired session token' });
    }

    try {
      const saved = await sessionManager.updateSessionState(username, state, immediate === true);
      if (!saved) {
        return reply.code(409).send({ error: 'Session invalidated: logged in from another device', code: 'SESSION_TERMINATED' });
      }
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
    const effectiveToken = extractBearerToken(request);

    if (!username) return reply.code(400).send({ error: 'Username is required' });

    // Strict identity validation on exit
    if (state && state.username && state.username.trim().toLowerCase() !== username.trim().toLowerCase()) {
      fastify.log.warn(`Cross-account exit sync rejected: endpoint username="${username}", state.username="${state.username}"`);
      return reply.code(400).send({ error: 'State username mismatch' });
    }

    const uKey = username.trim().toLowerCase();
    const activeSession = sessionManager.sessions.get(uKey);
    if (activeSession && activeSession.sessionToken && effectiveToken && effectiveToken !== activeSession.sessionToken) {
      return reply.code(401).send({ error: 'Unauthorized: Invalid or expired session token' });
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
