/**
 * Ras ALmal Tycoon — Competitive Events Service
 * Manages limited-time competitive events and reward distribution.
 * 
 * Beta Testing Constraint:
 * Events and rewards are strictly visible/accessible to developer account 'Khaled'.
 */

const config = require('../config/env');
const dbService = require('./db-service');
const sessionManager = require('./session-manager');

class EventService {
  constructor() {
    this.cachedEvents = [];
    this.lastCacheTime = 0;
    this.CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache
  }

  /**
   * Fetches active events from Supabase with caching
   * @returns {Promise<Array>}
   */
  async getActiveEvents() {
    const now = Date.now();
    if (this.cachedEvents.length > 0 && (now - this.lastCacheTime < this.CACHE_TTL_MS)) {
      return this.cachedEvents;
    }

    try {
      const endpoint = `${config.SUPABASE_URL}/rest/v1/events?is_active=eq.true&ends_at=gt.${now}&order=starts_at.asc`;
      const res = await fetch(endpoint, {
        headers: dbService.getHeaders()
      });
      if (res.ok) {
        this.cachedEvents = await res.json();
        this.lastCacheTime = now;
      }
    } catch (err) {
      console.warn('[EventService] Failed to load active events:', err.message);
    }

    return this.cachedEvents;
  }

  /**
   * Returns active events filtered by beta access
   * Only 'Khaled' can view or participate in events during beta
   * @param {string} username 
   * @returns {Promise<Array>}
   */
  async getActiveEventsForUser(username) {
    if (!username || username.trim().toLowerCase() !== 'khaled') {
      return [];
    }
    return await this.getActiveEvents();
  }

  /**
   * Evaluates an event, determines leaderboard ranking, and authoritatively credits gold prizes
   * @param {string} eventId 
   * @param {string} testTargetUser - User to credit test reward to (defaults to Khaled)
   * @returns {Promise<Object>}
   */
  async evaluateAndRewardEvent(eventId, testTargetUser = 'Khaled') {
    if (!eventId) throw new Error('eventId is required');

    // 1. Fetch event definition
    const endpoint = `${config.SUPABASE_URL}/rest/v1/events?id=eq.${encodeURIComponent(eventId)}&select=*`;
    const res = await fetch(endpoint, { headers: dbService.getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch event: ${await res.text()}`);
    const rows = await res.json();
    if (!rows || rows.length === 0) throw new Error('Event not found');

    const event = rows[0];
    const prizePool = Array.isArray(event.prize_pool_gold) ? event.prize_pool_gold : [500, 250, 100];
    const targetUsername = testTargetUser.trim();

    // 2. Query leaderboard based on event type
    let orderCol = 'net_worth';
    if (event.type === 'top_cash') orderCol = 'cash';
    else if (event.type === 'net_worth_growth' || event.type === 'top_wealth') orderCol = 'net_worth';

    const lbEndpoint = `${config.SUPABASE_URL}/rest/v1/players?select=username,${orderCol},gold&order=${orderCol}.desc&limit=10`;
    const lbRes = await fetch(lbEndpoint, { headers: dbService.getHeaders() });
    const leaderboard = lbRes.ok ? await lbRes.json() : [];

    // Find rank for target user
    let userRank = leaderboard.findIndex(p => p.username && p.username.toLowerCase() === targetUsername.toLowerCase()) + 1;
    if (userRank === 0) userRank = 1; // Default to rank 1 for developer simulation

    // Determine prize (rank 1 = prizePool[0], rank 2 = prizePool[1], etc.)
    const goldWon = prizePool[userRank - 1] || prizePool[0] || 100;

    // 3. Authoritatively credit Gold to target user
    let credited = false;
    let newGoldBalance = 0;
    const session = sessionManager.getSession(targetUsername);

    if (session) {
      session.state.gold = Math.max(0, Number(session.state.gold || 0) + goldWon);
      session.dirty = true;
      session.lastActivity = Date.now();
      newGoldBalance = session.state.gold;
      credited = true;
    } else {
      // Offline credit
      const userEndpoint = `${config.SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(targetUsername)}&select=gold,state`;
      const userRes = await fetch(userEndpoint, { headers: dbService.getHeaders() });
      const userRows = await userRes.json();
      if (userRows && userRows.length > 0) {
        const row = userRows[0];
        const prevGold = Number(row.gold || 0);
        newGoldBalance = prevGold + goldWon;
        const rawState = (typeof row.state === 'object' && row.state) ? row.state : {};
        rawState.gold = newGoldBalance;

        await fetch(`${config.SUPABASE_URL}/rest/v1/players?username=ilike.${encodeURIComponent(targetUsername)}`, {
          method: 'PATCH',
          headers: dbService.getHeaders(),
          body: JSON.stringify({ gold: newGoldBalance, state: rawState })
        });
        credited = true;
      }
    }

    return {
      eventId: event.id,
      title: event.title,
      type: event.type,
      evaluatedAt: Date.now(),
      targetUser: targetUsername,
      rank: userRank,
      goldAwarded: goldWon,
      currentGold: newGoldBalance,
      credited,
      leaderboardPreview: leaderboard.slice(0, 5).map((p, idx) => ({
        rank: idx + 1,
        username: p.username,
        score: p[orderCol]
      }))
    };
  }
}

module.exports = new EventService();
