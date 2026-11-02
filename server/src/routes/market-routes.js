/**
 * Ras ALmal Tycoon — P2P Marketplace API Routes
 * Authenticated endpoints for browsing, listing, purchasing, cancelling, and claiming market assets.
 */

const { marketService, MARKET_ITEM_CATALOG } = require('../services/market-service');
const sessionManager = require('../services/session-manager');

async function marketRoutes(fastify, options) {

  // Helper to authenticate session
  async function resolveSession(request, reply) {
    const authHeader = request.headers['authorization'] || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const body = request.body || {};
    const query = request.query || {};
    const username = body.username || query.username;
    const token = body.token || query.token || bearerToken;

    if (!username) {
      reply.code(400).send({ error: 'Username is required' });
      return null;
    }

    const uKey = String(username).trim().toLowerCase();
    let session = sessionManager.sessions.get(uKey);
    if (!session) {
      const res = await sessionManager.getSession(username);
      session = res.session;
    }

    if (!session) {
      reply.code(404).send({ error: 'Session not found. Please log in.' });
      return null;
    }

    // Token verification if provided
    if (token && session.sessionToken && session.sessionToken !== token) {
      reply.code(401).send({ error: 'INVALID_SESSION_TOKEN', message: 'الجلسة غير صالحة، يرجى تسجيل الدخول مجدداً.' });
      return null;
    }

    return session;
  }

  // GET /api/market/browse (Public / Authenticated browsing)
  fastify.get('/api/market/browse', async (request, reply) => {
    try {
      const { category, search, sort, page, limit } = request.query || {};
      const res = marketService.getBrowseListings({ category, search, sort, page, limit });
      return reply.send(res);
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // GET /api/market/my-listings
  fastify.get('/api/market/my-listings', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    try {
      const res = marketService.getMyListings(session.username);
      return reply.send(res);
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // GET /api/market/vault
  fastify.get('/api/market/vault', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    try {
      const res = await marketService.getMarketVault(session.username);
      return reply.send(res);
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/market/create
  fastify.post('/api/market/create', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { category, itemId, quantity, unitPrice, durationHours } = request.body || {};
    try {
      const res = await marketService.createListing(session.username, {
        category,
        itemId,
        quantity,
        unitPrice,
        durationHours
      });
      return reply.send(res);
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/market/buy
  fastify.post('/api/market/buy', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { listingId, buyQuantity = 1 } = request.body || {};
    if (!listingId) {
      return reply.code(400).send({ error: 'listingId is required' });
    }
    try {
      const res = await marketService.buyListing(session.username, listingId, buyQuantity);
      return reply.send(res);
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/market/cancel
  fastify.post('/api/market/cancel', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { listingId } = request.body || {};
    if (!listingId) {
      return reply.code(400).send({ error: 'listingId is required' });
    }
    try {
      const res = await marketService.cancelListing(session.username, listingId);
      return reply.send(res);
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/market/claim-all-earnings
  fastify.post('/api/market/claim-all-earnings', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    try {
      const res = await marketService.claimAllVaultEarnings(session.username);
      return reply.send(res);
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/market/claim-vault-item
  fastify.post('/api/market/claim-vault-item', async (request, reply) => {
    const session = await resolveSession(request, reply);
    if (!session) return;
    const { vaultEntryId } = request.body || {};
    if (!vaultEntryId) {
      return reply.code(400).send({ error: 'vaultEntryId is required' });
    }
    try {
      const res = await marketService.claimVaultItem(session.username, vaultEntryId);
      return reply.send(res);
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

}

module.exports = marketRoutes;
