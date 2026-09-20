/**
 * Ras ALmal Tycoon — Server Database Service
 * Handles authenticated read/write operations with Supabase PostgreSQL
 */

const config = require('../config/env');

class DbService {
  constructor() {
    this.url = config.SUPABASE_URL;
    this.key = config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY;
  }

  getHeaders() {
    return {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Fetches a single player by username
   * @param {string} username 
   * @returns {Promise<Object|null>}
   */
  async getPlayerByUsername(username) {
    if (!username) return null;
    const u = username.trim();
    const endpoint = `${this.url}/rest/v1/players?username=ilike.${encodeURIComponent(u)}&select=*`;
    
    try {
      const res = await fetch(endpoint, {
        headers: this.getHeaders()
      });
      if (!res.ok) {
        throw new Error(`Supabase error (${res.status}): ${await res.text()}`);
      }
      const rows = await res.json();
      return (Array.isArray(rows) && rows.length > 0) ? rows[0] : null;
    } catch (err) {
      console.error('[DbService] getPlayerByUsername error:', err.message);
      throw err;
    }
  }

  /**
   * Authoritatively persists a player's state back to Supabase
   * @param {string} username 
   * @param {Object} state - Full sanitized state object
   * @returns {Promise<boolean>}
   */
  async savePlayerState(username, state) {
    if (!username || !state) return false;
    const u = username.trim();

    const safeState = (typeof state === 'object' && state) ? { ...state } : {};
    delete safeState.pin;
    delete safeState.password;

    const payload = {
      username: u,
      cash: Number(state.cash || 0),
      bank: Number(state.bank || 0),
      dirty_cash: Number(state.dirtyCash || 0),
      net_worth: Number(state.netWorth || 0),
      xp: Number(state.xp || 0),
      title: String(state.title || 'عامل مبتدئ'),
      job_id: String(state.jobId || 'worker'),
      jail_timer: Number(state.jailTimer || 0),
      afk_manager_expires_at: Number(state.afkManagerExpiresAt || 0),
      total_taxes_paid: Number(state.totalTaxesPaid || 0),
      gold: (typeof u === 'string' && u.trim().toLowerCase() === 'khaled' && u.trim().length === 6) ? Number(state.gold || 0) : 0,
      admin_modified_timestamp: Number(state.adminModifiedTimestamp || 0),
      state: safeState,
      last_seen: Number(state.lastSeen || Date.now())
    };

    const adminTs = Number(state.adminModifiedTimestamp || 0);
    // Use lte filter: only overwrite DB if our session's timestamp is >= DB value.
    // This prevents a stale server flush from clobbering a wire-transfer or admin update
    // that set admin_modified_timestamp to a future lock value in the DB.
    const endpoint = adminTs > 0
      ? `${this.url}/rest/v1/players?username=ilike.${encodeURIComponent(u)}&admin_modified_timestamp=lte.${adminTs}`
      : `${this.url}/rest/v1/players?username=ilike.${encodeURIComponent(u)}`;

    
    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          ...this.getHeaders(),
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Save state failed (${res.status}): ${await res.text()}`);
      }
      return true;
    } catch (err) {
      console.error('[DbService] savePlayerState error:', err.message);
      return false;
    }
  }

  /**
   * Fetches unread mailbox messages for an offline player
   * @param {string} username 
   * @returns {Promise<Array>}
   */
  async getUnreadMailboxForUser(username) {
    if (!username) return [];
    const u = username.trim();
    const endpoint = `${this.url}/rest/v1/mailbox?recipient=eq.${encodeURIComponent(u)}&status=eq.unread&order=created_at.desc&limit=10`;
    
    try {
      const res = await fetch(endpoint, {
        headers: this.getHeaders()
      });
      if (!res.ok) return [];
      const rows = await res.json();
      return Array.isArray(rows) ? rows : [];
    } catch (err) {
      console.warn('[DbService] getUnreadMailboxForUser error:', err.message);
      return [];
    }
  }

  /**
   * Authoritatively inserts a new player record into Supabase using service role
   * @param {Object} playerRow 
   * @returns {Promise<Object>}
   */
  async createPlayer(playerRow) {
    if (!playerRow || !playerRow.username) throw new Error('Missing player row or username');
    const endpoint = `${this.url}/rest/v1/players`;
    
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(playerRow)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Create player failed (${res.status}): ${errText}`);
    }

    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : playerRow;
  }
}

module.exports = new DbService();
