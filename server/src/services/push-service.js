/**
 * Ras ALmal Tycoon — Web Push Notification Service
 * Handles VAPID credentials, player subscriptions persistence, and push delivery.
 */

const fs = require('fs');
const path = require('path');
const webpush = require('web-push');
const config = require('../config/env');

// File storage fallback path for subscriptions
const DATA_DIR = path.join(__dirname, '../../data');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'push_subscriptions.json');

class PushService {
  constructor() {
    this.publicKey = config.VAPID_PUBLIC_KEY || 'BFCoBjyfI8ZbwNPv2jbU4vBF6TVAmT3zRlbBtJyq7jYYzLcXlrFTmTQmcLJahYZLMW9lcZv-el-HQEOUC54Ds80';
    this.privateKey = config.VAPID_PRIVATE_KEY || '8XrinW1EHOFPYA1HFjxd-He5mMq3Do8ApqTDgcG1N_0';
    this.subject = config.VAPID_SUBJECT || 'mailto:support@rasalmal.online';

    webpush.setVapidDetails(this.subject, this.publicKey, this.privateKey);

    this.subscriptions = new Map(); // endpoint -> { username, subscription, createdAt }
    this._loadSubscriptionsFromFile();
  }

  _loadSubscriptionsFromFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
        const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach(item => {
            if (item && item.endpoint && item.subscription) {
              this.subscriptions.set(item.endpoint, item);
            }
          });
        }
        console.log(`[PushService] Loaded ${this.subscriptions.size} push subscriptions from storage.`);
      }
    } catch (err) {
      console.warn('[PushService] Failed loading subscriptions file:', err.message);
    }
  }

  _persistSubscriptions() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const list = Array.from(this.subscriptions.values());
      fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
      console.warn('[PushService] Failed persisting subscriptions:', err.message);
    }
  }

  getPublicKey() {
    return this.publicKey;
  }

  saveSubscription(username, subscription) {
    if (!subscription || !subscription.endpoint) {
      throw new Error('Invalid subscription object');
    }

    const endpoint = subscription.endpoint;
    const record = {
      endpoint,
      username: (username || 'guest').trim(),
      subscription,
      updatedAt: Date.now(),
      createdAt: this.subscriptions.has(endpoint) ? this.subscriptions.get(endpoint).createdAt : Date.now()
    };

    this.subscriptions.set(endpoint, record);
    this._persistSubscriptions();
    console.log(`[PushService] Registered push subscription for player: ${record.username} (Total devices: ${this.subscriptions.size})`);
    return record;
  }

  removeSubscription(endpoint) {
    if (this.subscriptions.has(endpoint)) {
      this.subscriptions.delete(endpoint);
      this._persistSubscriptions();
    }
  }

  async sendToEndpoint(subscription, payload) {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    try {
      await webpush.sendNotification(subscription, payloadStr);
      return { success: true };
    } catch (err) {
      // 404 or 410 means subscription expired or uninstalled
      if (err.statusCode === 404 || err.statusCode === 410) {
        console.log('[PushService] Removing expired subscription:', subscription.endpoint);
        this.removeSubscription(subscription.endpoint);
      }
      return { success: false, error: err.message, statusCode: err.statusCode };
    }
  }

  async sendToUser(username, payload) {
    const targetUser = username.trim().toLowerCase();
    const userSubs = Array.from(this.subscriptions.values()).filter(
      item => item.username.toLowerCase() === targetUser
    );

    if (userSubs.length === 0) {
      return { sent: 0, total: 0 };
    }

    const results = await Promise.all(
      userSubs.map(item => this.sendToEndpoint(item.subscription, payload))
    );

    const sent = results.filter(r => r.success).length;
    return { sent, total: userSubs.length };
  }

  async broadcast(payload) {
    const allSubs = Array.from(this.subscriptions.values());
    if (allSubs.length === 0) {
      return { sent: 0, total: 0 };
    }

    const results = await Promise.all(
      allSubs.map(item => this.sendToEndpoint(item.subscription, payload))
    );

    const sent = results.filter(r => r.success).length;
    console.log(`[PushService] Broadcast complete: ${sent}/${allSubs.length} devices reached.`);
    return { sent, total: allSubs.length };
  }

  getStats() {
    return {
      activeDevices: this.subscriptions.size,
      subscribers: new Set(Array.from(this.subscriptions.values()).map(s => s.username)).size
    };
  }
}

module.exports = new PushService();
