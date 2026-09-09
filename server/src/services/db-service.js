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
      state: state,
      last_seen: Number(state.lastSeen || Date.now())
    };

    const endpoint = `${this.url}/rest/v1/players?username=ilike.${encodeURIComponent(u)}`;
    
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
}

module.exports = new DbService();
