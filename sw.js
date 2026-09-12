/**
 * Ras ALmal Tycoon — Official Service Worker
 * Cache Strategy: Strict Network-Only for APIs & Backend, Strict Network-First for Static Game Assets.
 */

const CACHE_NAME = 'rasalmal-v1.2.5';

// Essential static shell assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/app.css',
  '/manifest.webmanifest',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/logo-transparent.png'
];

// 1. Install Event: Pre-cache static shell & skip waiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static app shell...');
      // Use cache.addAll with individual catch to avoid install failure on optional assets
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) => cache.add(url))
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Wipe old cache versions immediately & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Invalidation: Deleting obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Strict Network-Only for APIs / Backend, Strict Network-First for Static Assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // RULE 1: STRICT NETWORK-ONLY
  // Non-GET requests (POST, PUT, DELETE, etc.) must NEVER be cached
  if (req.method !== 'GET') {
    return; // Browser default direct fetch
  }

  // Authoritative server API endpoints, auth routes, and database connections
  const hostname = url.hostname.toLowerCase();
  const isExternalApiHost = 
    hostname === 'supabase.co' || hostname.endsWith('.supabase.co') ||
    hostname === 'googleapis.com' || hostname.endsWith('.googleapis.com') ||
    hostname === 'firebaseio.com' || hostname.endsWith('.firebaseio.com');

  const isApi = url.pathname.startsWith('/api/') || 
                url.pathname.startsWith('/auth/') ||
                url.port === '3999' ||
                url.port === '3001' ||
                isExternalApiHost;

  if (isApi) {
    // Network-Only: Direct fetch, zero caching intervention
    event.respondWith(fetch(req));
    return;
  }

  // RULE 2: STRICT NETWORK-FIRST (For HTML, JS, CSS, fonts, audio, images)
  // Guarantees players always receive fresh code and prevents client-server version mismatch
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // If response is valid, update the cache with the newest version in background
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache ONLY when offline or network drops
        return caches.match(req).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If HTML navigation request fails and isn't in cache, fallback to index.html
          if (req.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Network unavailable and resource not cached.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});

// 4. Notifications & Background Push
self.addEventListener('push', (event) => {
  let data = { title: 'رأس المال | Ras ALmal', body: 'لديك أحداث جديدة في إمبراطوريتك المالية!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 5. Notification Click Event: Focus or open the game window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
