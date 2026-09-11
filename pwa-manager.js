/**
 * Ras ALmal Tycoon — PWA & Notification Manager
 * Handles Service Worker registration, install prompts (Android/Desktop/iOS), and game lifecycle notifications.
 */

var PWAManager = (() => {
  let deferredPrompt = null;
  let isStandalone = false;
  let isIOS = false;

  // Track notified states to prevent duplicate spamming
  const notificationFlags = {
    suppliesWarned: false,
    afkWarned: false,
    dailyWheelWarned: false
  };

  function init() {
    console.log('[PWAManager] Initializing PWA & Notification Manager...');

    // Detect environment
    isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                   window.navigator.standalone === true ||
                   document.referrer.includes('android-app://');

    isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // 1. Register Service Worker (Production & Local)
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('[PWAManager] ServiceWorker registered with scope:', registration.scope);
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWAManager] New game version available.');
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn('[PWAManager] ServiceWorker registration failed:', err);
          });
      });
    }

    // 2. Listen for Install Prompt (Chrome, Edge, Android)
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent immediate mini-infobar
      e.preventDefault();
      deferredPrompt = e;
      console.log('[PWAManager] Captured beforeinstallprompt event.');
      updateInstallUI(true);
    });

    // 3. Listen for App Installed
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      console.log('[PWAManager] Game successfully installed as PWA!');
      updateInstallUI(false);
      try {
        localStorage.setItem('rasalmal_pwa_installed', 'true');
      } catch (e) {}

      if (typeof window.showNotification === 'function') {
        window.showNotification('🎉 مبارك! تم تثبيت رأس المال كتطبيق رسمي على جهازك.', 'success');
      }
    });

    // 4. Update UI initial states
    setTimeout(() => {
      updateInstallUI(!isStandalone && (deferredPrompt !== null || isIOS));
      updateNotificationUI();
      bindUIEvents();
      if ('Notification' in window && Notification.permission === 'granted') {
        subscribeToPushServer();
      }
    }, 1200);

    // 5. Start background game-event notification check loop
    setInterval(checkGameTriggersForNotifications, 45000);
  }

  // Bind click handlers to install buttons
  function bindUIEvents() {
    const startMenuBtn = document.getElementById('btn-menu-pwa-install');
    if (startMenuBtn) {
      startMenuBtn.addEventListener('click', promptInstall);
    }

    const settingsBtn = document.getElementById('btn-settings-pwa-install');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', promptInstall);
    }

    const notifBtn = document.getElementById('btn-settings-request-notifications');
    if (notifBtn) {
      notifBtn.addEventListener('click', requestNotificationPermission);
    }
  }

  // Update visibility of install buttons across UI
  function updateInstallUI(canInstall) {
    const startMenuBtn = document.getElementById('btn-menu-pwa-install');
    const settingsBtn = document.getElementById('btn-settings-pwa-install');
    const settingsInstalledBadge = document.getElementById('settings-pwa-installed-badge');

    if (isStandalone) {
      if (startMenuBtn) startMenuBtn.classList.add('hidden');
      if (settingsBtn) settingsBtn.classList.add('hidden');
      if (settingsInstalledBadge) settingsInstalledBadge.classList.remove('hidden');
      return;
    }

    if (canInstall) {
      if (startMenuBtn) startMenuBtn.classList.remove('hidden');
      if (settingsBtn) settingsBtn.classList.remove('hidden');
      if (settingsInstalledBadge) settingsInstalledBadge.classList.add('hidden');
    } else {
      if (startMenuBtn) startMenuBtn.classList.add('hidden');
    }
  }

  // Update notification status badges and buttons
  function updateNotificationUI() {
    const statusText = document.getElementById('pwa-notification-status');
    const notifBtn = document.getElementById('btn-settings-request-notifications');

    if (!('Notification' in window)) {
      if (statusText) statusText.textContent = 'غير مدعوم في هذا المتصفح';
      if (notifBtn) notifBtn.disabled = true;
      return;
    }

    if (Notification.permission === 'granted') {
      if (statusText) {
        statusText.innerHTML = '<span class="text-emerald-400 font-bold"><i class="fa-solid fa-circle-check ml-1"></i> الإشعارات مفعّلة</span>';
      }
      if (notifBtn) {
        notifBtn.classList.add('hidden');
      }
    } else if (Notification.permission === 'denied') {
      if (statusText) {
        statusText.innerHTML = '<span class="text-rose-400 font-bold"><i class="fa-solid fa-circle-xmark ml-1"></i> محظورة من إعدادات المتصفح</span>';
      }
      if (notifBtn) {
        notifBtn.textContent = 'الإشعارات محظورة';
        notifBtn.disabled = true;
      }
    } else {
      if (statusText) {
        statusText.innerHTML = '<span class="text-slate-400 font-bold">غير مفعلة بعد</span>';
      }
      if (notifBtn) {
        notifBtn.classList.remove('hidden');
      }
    }
  }

  // Trigger Install Prompt
  async function promptInstall() {
    // Handling iOS Safari
    if (isIOS && !isStandalone) {
      showIOSInstallInstructions();
      return;
    }

    if (!deferredPrompt) {
      if (typeof window.showNotification === 'function') {
        window.showNotification('اللعبة مثبتة بالفعل أو يمكنك إضافتها من قائمة المتصفح (Add to Home Screen).', 'info');
      }
      return;
    }

    // Show native browser prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWAManager] User install response:', outcome);

    if (outcome === 'accepted') {
      deferredPrompt = null;
      updateInstallUI(false);
    }
  }

  // Modal for iOS users
  function showIOSInstallInstructions() {
    const modalId = 'ios-install-modal';
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modalId && (modal.id = modalId);
      modal.className = 'fixed inset-0 z-[400] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in';
      modal.innerHTML = `
        <div class="glass-panel w-full max-w-sm rounded-3xl border border-yellow-500/40 p-6 bg-slate-950/95 text-center shadow-2xl">
          <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 text-2xl">
            <i class="fa-brands fa-apple"></i>
          </div>
          <h3 class="text-lg font-black text-white mb-2">تثبيت اللعبة على iPhone / iPad</h3>
          <p class="text-xs text-slate-300 leading-relaxed mb-4 text-right">
            لتشغيل اللعبة في وضع الشاشة الكاملة وبدون شريط المتصفح:
          </p>
          <div class="space-y-2.5 text-right text-xs bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 mb-5">
            <div class="flex items-center gap-2.5 text-white">
              <span class="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center text-[11px]">1</span>
              <span>اضغط على زر المشاركة <i class="fa-solid fa-arrow-up-from-bracket text-sky-400 mx-1"></i> في أسفل سفاري.</span>
            </div>
            <div class="flex items-center gap-2.5 text-white">
              <span class="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center text-[11px]">2</span>
              <span>مرر لأسفل واختر <strong class="text-yellow-400">إضافة إلى الصفحة الرئيسية (Add to Home Screen)</strong>.</span>
            </div>
            <div class="flex items-center gap-2.5 text-white">
              <span class="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center text-[11px]">3</span>
              <span>اضغط <strong class="text-emerald-400">إضافة (Add)</strong> في أعلى الزاوية.</span>
            </div>
          </div>
          <button id="btn-close-ios-install" class="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs transition">
            حسناً، فهمت!
          </button>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('btn-close-ios-install').addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    } else {
      modal.classList.remove('hidden');
    }
  }

  const DEFAULT_VAPID_PUBLIC_KEY = 'BFCoBjyfI8ZbwNPv2jbU4vBF6TVAmT3zRlbBtJyq7jYYzLcXlrFTmTQmcLJahYZLMW9lcZv-el-HQEOUC54Ds80';

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function subscribeToPushServer() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      let pubKey = DEFAULT_VAPID_PUBLIC_KEY;

      try {
        const apiBase = (typeof window !== 'undefined' && window.SERVER_API_URL) 
          ? window.SERVER_API_URL.replace(/\/$/, '') 
          : '';
        const r = await fetch(`${apiBase}/api/push/public-key`);
        if (r.ok) {
          const kJson = await r.json();
          if (kJson && kJson.publicKey) pubKey = kJson.publicKey;
        }
      } catch (e) {}

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(pubKey)
        });
      }

      const username = (window.GameEngine && window.GameEngine.getState && window.GameEngine.getState().username) || 
                       (typeof player !== 'undefined' && player.username) || 
                       localStorage.getItem('saved_username') || 
                       'guest';

      const apiBase = (typeof window !== 'undefined' && window.SERVER_API_URL) 
        ? window.SERVER_API_URL.replace(/\/$/, '') 
        : '';
        
      await fetch(`${apiBase}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, subscription: sub })
      });
      console.log('[PWAManager] Push subscription synchronized with server for:', username);
    } catch (err) {
      console.warn('[PWAManager] Failed to synchronize push subscription:', err.message);
    }
  }

  // Request browser notification permissions
  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      alert('متصفحك لا يدعم خاصية إشعارات الويب.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('[PWAManager] Notification permission result:', permission);
      updateNotificationUI();

      if (permission === 'granted') {
        subscribeToPushServer();

        sendNotification('👑 مرحباً بك في نظام التنبيهات الذكي!', {
          body: 'ستتلقى إشعارات فورية عند نفاد بضائع مشاريعك أو اكتمال مؤقتات الأرباح.',
          icon: '/assets/icon-192.png'
        });

        if (typeof window.showNotification === 'function') {
          window.showNotification('تم تفعيل إشعارات اللعبة بنجاح! 🔔', 'success');
        }
      }
    } catch (err) {
      console.warn('[PWAManager] Error requesting notification permission:', err);
    }
  }

  // Send or display a notification safely
  function sendNotification(title, options = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const defaultOptions = {
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      vibrate: [200, 100, 200],
      ...options
    };

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, defaultOptions);
      }).catch(() => {
        new Notification(title, defaultOptions);
      });
    } else {
      new Notification(title, defaultOptions);
    }
  }

  // Check in-game state for notification opportunities
  function checkGameTriggersForNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    if (typeof window.GameEngine === 'undefined' || !window.GameEngine.getState) {
      return;
    }

    const state = window.GameEngine.getState();
    if (!state) return;

    // Trigger 1: Supplies depletion check
    const bizList = state.businesses ? Object.values(state.businesses) : [];
    const ownedBusinesses = bizList.filter(b => b && (Number(b.level) > 0 || Number(b.count) > 0));

    if (ownedBusinesses.length > 0) {
      // Find the maximum remaining supplies ticks among all owned businesses
      const maxRemainingTicks = Math.max(...ownedBusinesses.map(b => Number(b.suppliesTicks) || 0));

      // Supplies are depleted ONLY if ALL owned businesses have 0 seconds left!
      if (maxRemainingTicks <= 0) {
        if (!notificationFlags.suppliesWarned) {
          notificationFlags.suppliesWarned = true;
          sendNotification('⚠️ تنبيه الإمدادات: توقفت أرباح مشاريعك!', {
            body: 'نفدت بضائع الشركات والمشاريع بالكامل. قم بتوريد شحنة بضائع جديدة لاستئناف الإنتاج وضخ الأرباح!',
            tag: 'supplies_depleted'
          });
        }
      } else if (maxRemainingTicks > 300) {
        // More than 5 minutes of supplies available: reset warned flag
        notificationFlags.suppliesWarned = false;
      }
    }

    // Trigger 2: AFK Manager expiry warning (< 30 minutes remaining)
    const now = Date.now();
    const afkExpires = state.afkManagerExpiresAt || 0;
    if (afkExpires > now && (afkExpires - now) < (30 * 60 * 1000)) {
      if (!notificationFlags.afkWarned) {
        notificationFlags.afkWarned = true;
        const remMin = Math.ceil((afkExpires - now) / 60000);
        sendNotification('⏳ ترخيص الإدارة الذاتية (AFK) شارف على الانتهاء!', {
          body: `يتبقى ${remMin} دقيقة فقط على انتهاء ترخيص الإدارة الذاتية 12-Hour. جدده لضمان استمرار الأرباح أثناء غيابك.`,
          tag: 'afk_expiring'
        });
      }
    } else if (afkExpires > now + (3 * 3600000)) {
      // Reset flag if renewed
      notificationFlags.afkWarned = false;
    }
  }

  return {
    init,
    promptInstall,
    requestNotificationPermission,
    sendNotification,
    isStandaloneApp: () => isStandalone
  };
})();

// Auto-boot on DOM readiness
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', PWAManager.init);
} else {
  PWAManager.init();
}
