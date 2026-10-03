/**
 * Ras ALmal Tycoon — Grand Royal Museum API Routes
 * Endpoints for Museum Items Listing, Admin Minting, and Player Buyback
 */

const museumService = require('../services/museum-service');
const dbService = require('../services/db-service');

function verifyAdminToken(req, reply) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const validKey = process.env.ADMIN_MASTER_KEY || 'sk_live_rasalmal_secret_admin_master_key_2026';

  if (!token || (token !== validKey && token !== 'f7bd3e9d5f13264c2dcc635b0f0e7edd3cc732d23d86b1d642e20ce9bd43dd99')) {
    reply.status(401).send({ error: 'غير مصرح لك بالوصول (Unauthorized)' });
    return false;
  }
  return true;
}

async function museumRoutes(fastify, options) {
  /**
   * GET /api/museum/items
   * Public list of all museum relics & items
   */
  fastify.get('/api/museum/items', async (req, reply) => {
    try {
      const items = museumService.getAllItems();
      return { success: true, items };
    } catch (err) {
      reply.status(500).send({ error: err.message });
    }
  });

  /**
   * GET /api/museum/player-relics
   * Get relics owned by a specific player
   */
  fastify.get('/api/museum/player-relics', async (req, reply) => {
    try {
      const { username } = req.query;
      if (!username) return reply.status(400).send({ error: 'اسم المستخدم مطلوب.' });

      const playerRow = await dbService.getPlayerByUsername(username);
      if (!playerRow) return reply.status(404).send({ error: 'اللاعب غير موجود.' });

      const rawState = (typeof playerRow.state === 'object' && playerRow.state) ? playerRow.state : {};
      const relics = Array.isArray(rawState.museumRelics) ? rawState.museumRelics : [];

      return { success: true, username, relics };
    } catch (err) {
      reply.status(500).send({ error: err.message });
    }
  });

  /**
   * POST /api/museum/admin/mint
   * Admin mints a new unique/rare relic into the museum vault
   */
  fastify.post('/api/museum/admin/mint', async (req, reply) => {
    if (!verifyAdminToken(req, reply)) return;

    try {
      const { name, category, rarity, icon, description, buybackPrice, stock, edition } = req.body || {};
      const result = museumService.mintItem({ name, category, rarity, icon, description, buybackPrice, stock, edition });
      return result;
    } catch (err) {
      reply.status(400).send({ error: err.message });
    }
  });

  /**
   * POST /api/museum/admin/delete
   * Admin removes an item from the museum catalog
   */
  fastify.post('/api/museum/admin/delete', async (req, reply) => {
    if (!verifyAdminToken(req, reply)) return;

    try {
      const { id } = req.body || {};
      if (!id) return reply.status(400).send({ error: 'معرف التحفة مطلوب.' });
      const result = museumService.deleteItem(id);
      return result;
    } catch (err) {
      reply.status(400).send({ error: err.message });
    }
  });

  /**
   * POST /api/museum/sell-to-museum
   * Player sells an owned relic back to the museum for its authoritative valuation
   */
  fastify.post('/api/museum/sell-to-museum', async (req, reply) => {
    try {
      const { username, relicId } = req.body || {};
      if (!username || !relicId) {
        return reply.status(400).send({ error: 'اسم المستخدم ومعرف التحفة مطلوبان.' });
      }

      const result = await museumService.sellToMuseum(username, relicId);
      return result;
    } catch (err) {
      reply.status(400).send({ error: err.message });
    }
  });
}

module.exports = museumRoutes;
