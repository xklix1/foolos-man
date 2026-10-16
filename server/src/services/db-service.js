/**
 * Ras ALmal Tycoon — Server Database Service
 * Handles authenticated read/write operations with Supabase PostgreSQL
 */

const config = require('../config/env');

class DbService {
  constructor() {
    this.candidateUrls = [
      'http://127.0.0.1:8000',
      'https://rasalmal.online',
      config.SUPABASE_URL
    ].filter(Boolean);

    this.candidateKeys = [
      config.SUPABASE_SERVICE_ROLE_KEY,
      config.SUPABASE_ANON_KEY,
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3OTA5NzU4NzcsImV4cCI6MjI2NDAxNTg3N30.yihpgeW-aXfKQiTYxsZRzP2AvOGvaI4UmF_3tmvNMBU',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkwOTc1ODc3LCJleHAiOjIyNjQwMTU4Nzd9.f21_aqY88akkuTp0OGf0VHnxKNjot1Xg9RTr6MITodg'
    ].filter(Boolean);

    this.url = 'https://rasalmal.online';
    this.key = this.candidateKeys[0];
  }

  getHeaders(customKey) {
    const k = customKey || this.key;
    return {
      'apikey': k,
      'Authorization': `Bearer ${k}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Resilient fetcher that cycles through candidate keys and URLs if 401/403 occurs
   */
  async resilientFetch(pathAndQuery, options = {}) {
    let lastErr = null;
    let lastStatus = null;
    let lastResponseBody = '';

    for (const baseUrl of this.candidateUrls) {
      for (const k of this.candidateKeys) {
        try {
          const endpoint = `${baseUrl}${pathAndQuery}`;
          const headers = {
            'apikey': k,
            'Authorization': `Bearer ${k}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
          };

          const res = await fetch(endpoint, {
            ...options,
            headers
          });

          lastStatus = res.status;
          if (res.ok) {
            // Update active working key and url
            this.url = baseUrl;
            this.key = k;
            return res;
          } else {
            try {
              lastResponseBody = await res.text();
            } catch (_) {}
          }
        } catch (e) {
          lastErr = e;
        }
      }
    }

    throw new Error(`Supabase error (${lastStatus || 'Network'}): ${lastResponseBody || (lastErr ? lastErr.message : 'Unauthorized across all candidate keys')}`);
  }

  /**
   * Fetches a single player by username
   * @param {string} username 
   * @returns {Promise<Object|null>}
   */
  async getPlayerByUsername(username) {
    if (!username) return null;
    const u = username.trim();
    const pathAndQuery = `/rest/v1/players?username=ilike.${encodeURIComponent(u)}&select=*`;
    
    try {
      const res = await this.resilientFetch(pathAndQuery);
      const rows = await res.json();
      return (Array.isArray(rows) && rows.length > 0) ? rows[0] : null;
    } catch (err) {
      console.error('[DbService] getPlayerByUsername error:', err.message);
      throw err;
    }
  }

  /**
   * Fetches a single player by registered email
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async getPlayerByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const pathAndQuery = `/rest/v1/players?state->>email=eq.${encodeURIComponent(cleanEmail)}&select=*`;
    
    try {
      const res = await this.resilientFetch(pathAndQuery);
      const rows = await res.json();
      return (Array.isArray(rows) && rows.length > 0) ? rows[0] : null;
    } catch (err) {
      console.error('[DbService] getPlayerByEmail error:', err.message);
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
      gold: Math.max(0, Number(state.gold || 0)),
      admin_modified_timestamp: Number(state.adminModifiedTimestamp || 0),
      state: safeState,
      last_seen: Number(state.lastSeen || Date.now())
    };

    const adminTs = Number(state.adminModifiedTimestamp || 0);
    const filter = adminTs > 0 ? `&admin_modified_timestamp=lte.${adminTs}` : '';
    const pathAndQuery = `/rest/v1/players?username=ilike.${encodeURIComponent(u)}${filter}`;

    try {
      const res = await this.resilientFetch(pathAndQuery, {
        method: 'PATCH',
        headers: {
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });

      const updatedRows = await res.json();
      if (Array.isArray(updatedRows) && updatedRows.length === 0) {
        if (adminTs > 0) {
          console.warn(`[DbService] Save state skipped for ${u}: DB has newer admin_modified_timestamp than session (${adminTs})`);
        } else {
          console.warn(`[DbService] Save state: No database row found for ${u}`);
        }
        return false;
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
    const pathAndQuery = `/rest/v1/mailbox?recipient=eq.${encodeURIComponent(u)}&status=eq.unread&order=created_at.desc&limit=10`;
    
    try {
      const res = await this.resilientFetch(pathAndQuery);
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
    const pathAndQuery = `/rest/v1/players`;
    
    const res = await this.resilientFetch(pathAndQuery, {
      method: 'POST',
      headers: {
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(playerRow)
    });

    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : playerRow;
  }

  /**
   * Resiliently fetches a global configuration record from Supabase globals table
   * @param {string} id 
   * @returns {Promise<Object|null>}
   */
  async getGlobal(id) {
    if (!id) return null;
    const pathAndQuery = `/rest/v1/globals?id=eq.${encodeURIComponent(id)}&select=*`;
    try {
      const res = await this.resilientFetch(pathAndQuery);
      if (!res.ok) return null;
      const rows = await res.json();
      return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.warn(`[DbService] getGlobal(${id}) note:`, err.message);
      return null;
    }
  }

  /**
   * Resiliently saves or merges a global configuration record into Supabase globals table
   * @param {string} id 
   * @param {Object} data 
   * @returns {Promise<boolean>}
   */
  async setGlobal(id, data) {
    if (!id) return false;
    const pathAndQuery = `/rest/v1/globals`;
    const payload = {
      id,
      data,
      updated_at: Date.now()
    };
    try {
      const res = await this.resilientFetch(pathAndQuery, {
        method: 'POST',
        headers: {
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch (err) {
      console.warn(`[DbService] setGlobal(${id}) note:`, err.message);
      return false;
    }
  }
}

module.exports = new DbService();
