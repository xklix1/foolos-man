/**
 * Ras ALmal Tycoon — Live Auction API Routes
 * Endpoints for Live Auction Telemetry, Player Registration, Bidding, and Admin Hammer Controls
 */

const auctionService = require('../services/auction-service');
const config = require('../config/env');

async function auctionRoutes(fastify, options) {

  /**
   * Helper to verify admin key from authorization header or query
   */
  function verifyAdminKey(req, reply) {
    const authHeader = req.headers['authorization'] || '';
    const key = authHeader.replace(/^Bearer\s+/i, '').trim() || req.headers['x-admin-key'] || req.query.adminKey || req.body?.adminKey;
    const validMasterKey = config.ADMIN_MASTER_KEY || 'sk_live_rasalmal_secret_admin_master_key_2026';

    if (!key || key !== validMasterKey) {
      reply.code(403).send({ error: 'مفتاح الإدارة غير صالح أو غير مصرح لك بتنفيذ هذا الإجراء.' });
      return false;
    }
    return true;
  }

  /**
   * GET /api/auction/state
   * Public telemetry for players and spectators
   */
  fastify.get('/api/auction/state', async (req, reply) => {
    const username = req.query.username || '';
    const state = auctionService.getPublicState(username);
    return state;
  });

  /**
   * POST /api/auction/register
   * Player registers for upcoming auction
   */
  fastify.post('/api/auction/register', async (req, reply) => {
    const { username } = req.body || {};
    if (!username) {
      return reply.code(400).send({ error: 'اسم المستخدم مطلوب.' });
    }

    try {
      const result = await auctionService.registerPlayer(username);
      return result;
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  /**
   * POST /api/auction/bid
   * Player places a live bid in the auction hall
   */
  fastify.post('/api/auction/bid', async (req, reply) => {
    const { username, amount } = req.body || {};
    if (!username || !amount) {
      return reply.code(400).send({ error: 'اسم المستخدم ومبلغ المزايدة مطلوبان.' });
    }

    try {
      const result = await auctionService.placeBid(username, amount);
      return result;
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  /**
   * POST /api/auction/admin/create
   * Admin schedules or creates an auction
   */
  fastify.post('/api/auction/admin/create', async (req, reply) => {
    if (!verifyAdminKey(req, reply)) return;

    try {
      const result = auctionService.createAuction(req.body || {});
      return result;
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  /**
   * POST /api/auction/admin/start
   * Admin forces immediate start of the scheduled auction
   */
  fastify.post('/api/auction/admin/start', async (req, reply) => {
    if (!verifyAdminKey(req, reply)) return;

    try {
      const result = auctionService.startAuctionNow('ADMIN');
      if (!result.success) {
        return reply.code(400).send({ error: result.error });
      }
      return result;
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  /**
   * POST /api/auction/admin/hammer
   * Admin executes hammer strikes (strike_1, strike_2, strike_final, extend_time, cancel)
   */
  fastify.post('/api/auction/admin/hammer', async (req, reply) => {
    if (!verifyAdminKey(req, reply)) return;

    const { action } = req.body || {};
    if (!action) {
      return reply.code(400).send({ error: 'إجراء المطرقة مطلوب.' });
    }

    try {
      const result = await auctionService.handleHammerAction(action);
      return result;
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });
}

module.exports = auctionRoutes;
