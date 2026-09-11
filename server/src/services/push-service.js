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
    this.alertTracker = new Map(); // username -> { lastSuppliesAlertTime, lastAfkAlertTime }
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

  async checkOfflineSubscribersAndNotify(dbService, sessionManager) {
    if (this.subscriptions.size === 0) return { checked: 0, alertsSent: 0 };

    const userSubsMap = new Map();
    for (const record of this.subscriptions.values()) {
      const u = (record.username || '').trim().toLowerCase();
      if (!u || u === 'guest') continue;
      if (!userSubsMap.has(u)) {
        userSubsMap.set(u, []);
      }
      userSubsMap.get(u).push(record);
    }

    if (userSubsMap.size === 0) return { checked: 0, alertsSent: 0 };

    const now = Date.now();
    let alertsSent = 0;

    for (const [username, userSubs] of userSubsMap.entries()) {
      try {
        let state = null;
        let isCurrentlyOnline = false;

        if (sessionManager && typeof sessionManager.getSession === 'function') {
          const session = sessionManager.getSession(username);
          if (session && session.state) {
            state = session.state;
            if (now - (session.lastActivity || 0) < 120_000) {
              isCurrentlyOnline = true;
            }
          }
        }

        if (!state && dbService && typeof dbService.getPlayerByUsername === 'function') {
          const dbRow = await dbService.getPlayerByUsername(username);
          if (dbRow) {
            state = (typeof dbRow.state === 'object' && dbRow.state) ? dbRow.state : null;
          }
        }

        if (!state || isCurrentlyOnline) continue;

        const bizList = state.businesses ? Object.values(state.businesses) : [];
        const ownedBusinesses = bizList.filter(b => b && (Number(b.level) > 0 || Number(b.count) > 0));

        if (ownedBusinesses.length === 0) continue;

        const lastActive = Number(state.lastActiveTimestamp || state.lastSeen || now);
        const elapsedSeconds = Math.max(0, Math.floor((now - lastActive) / 1000));

        // Don't alert if the player was active less than 3 minutes ago
        if (elapsedSeconds < 180) continue;

        const maxInitialTicks = Math.max(...ownedBusinesses.map(b => Number(b.suppliesTicks) || 0));
        const remainingTicks = Math.max(0, maxInitialTicks - elapsedSeconds);

        const tracker = this.alertTracker.get(username) || {
          lastSuppliesAlertTime: 0,
          lastAfkAlertTime: 0
        };

        // Reset supplies alert tracker if the player restocked (has > 30 minutes of supplies)
        if (remainingTicks > 1800 && tracker.lastSuppliesAlertTime > 0) {
          tracker.lastSuppliesAlertTime = 0;
        }

        // 1. SUPPLIES DEPLETED:
        // Only alert if remaining supplies have reached 0 AND 6 hours elapsed since last alert
        const SIX_HOURS = 6 * 3600 * 1000;
        if (remainingTicks <= 0) {
          if (now - tracker.lastSuppliesAlertTime > SIX_HOURS) {
            tracker.lastSuppliesAlertTime = now;
            this.alertTracker.set(username, tracker);

            const payload = {
              title: '⚠️ تنبيه الإمدادات: توقفت أرباح مشاريعك!',
              body: 'نفدت بضائع الشركات والمشاريع بالكامل أثناء غيابك. ادخل لتوريد شحنة جديدة واستئناف ضخ الأرباح!',
              url: '/'
            };

            await Promise.allSettled(userSubs.map(s => this.sendToEndpoint(s.subscription, payload)));
            alertsSent++;
          }
        }

        // 2. AFK MANAGER EXPIRING (< 20 minutes remaining):
        const afkExpires = Number(state.afkManagerExpiresAt || 0);
        const FOUR_HOURS = 4 * 3600 * 1000;
        if (afkExpires > now && (afkExpires - now) < (20 * 60 * 1000)) {
          if (now - tracker.lastAfkAlertTime > FOUR_HOURS) {
            tracker.lastAfkAlertTime = now;
            this.alertTracker.set(username, tracker);

            const remMinutes = Math.max(1, Math.ceil((afkExpires - now) / 60000));
            const payload = {
              title: '⏳ ترخيص الإدارة الذاتية (AFK) شارف على الانتهاء!',
              body: `يتبقى ${remMinutes} دقيقة فقط على انتهاء ترخيص الإدارة الذاتية 12-Hour. جدده الآن لضمان استمرار الأرباح!`,
              url: '/'
            };

            await Promise.allSettled(userSubs.map(s => this.sendToEndpoint(s.subscription, payload)));
            alertsSent++;
          }
        } else if (afkExpires > now + (2 * 3600 * 1000)) {
          tracker.lastAfkAlertTime = 0;
        }

        // 3. UNREAD MAILBOX MESSAGES (Transfers, Admin Alerts, DMs while offline):
        if (dbService && typeof dbService.getUnreadMailboxForUser === 'function') {
          try {
            const unreadMails = await dbService.getUnreadMailboxForUser(username);
            if (!tracker.pushedMailIds) tracker.pushedMailIds = new Set();

            for (const mail of unreadMails) {
              if (tracker.pushedMailIds.has(mail.id)) continue;
              tracker.pushedMailIds.add(mail.id);

              let notifTitle = '📬 إشعار جديد في حسابك';
              let notifBody = 'لديك رسالة أو تنبيه جديد في صندوق الرسائل.';

              if (mail.type === 'transfer_received') {
                const amt = Number((mail.payload && mail.payload.amount) || 0);
                notifTitle = '💸 حوالة بنكية واردة!';
                notifBody = `قام اللاعب "${mail.sender || 'مجهول'}" بتحويل ${amt > 0 ? amt.toLocaleString() + ' EGP' : 'مبلغ مالي'} إلى حسابك البنكي!`;
              } else if (mail.type === 'admin_popup' || mail.type === 'urgent_alert') {
                notifTitle = (mail.payload && mail.payload.title) || '📢 تنبيه إداري مباشر';
                notifBody = (mail.payload && mail.payload.message) || 'وصلك تنبيه إداري جديد من إدارة اللعبة.';
              } else if (mail.type === 'admin_balance_grant') {
                notifTitle = '💰 منحة مالية إدارية!';
                notifBody = 'أودعت إدارة اللعبة منحة مالية جديدة في رصيدك مباشرة.';
              } else if (mail.type === 'dm') {
                notifTitle = `💬 رسالة خاصة من ${mail.sender || 'لاعب'}`;
                notifBody = (mail.payload && mail.payload.message) || mail.message || 'أرسل لك رسالة خاصة جديدة.';
              }

              const payload = {
                title: notifTitle,
                body: notifBody,
                url: '/'
              };

              await Promise.allSettled(userSubs.map(s => this.sendToEndpoint(s.subscription, payload)));
              alertsSent++;
            }
          } catch (mErr) {
            console.warn(`[PushService] Mail check err for ${username}:`, mErr.message);
          }
        }

        this.alertTracker.set(username, tracker);
      } catch (err) {
        console.warn(`[PushService] Error in offline check for ${username}:`, err.message);
      }
    }

    return { checked: userSubsMap.size, alertsSent };
  }

  getStats() {
    return {
      activeDevices: this.subscriptions.size,
      subscribers: new Set(Array.from(this.subscriptions.values()).map(s => s.username)).size
    };
  }
}

module.exports = new PushService();
