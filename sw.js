/**
 * Ras ALmal Tycoon — Official Service Worker
 * Cache Strategy: Strict Network-Only for APIs & Backend, Strict Network-First for Static Game Assets.
 */

const CACHE_NAME = 'rasalmal-v9.9.5';

// Essential static shell assets to pre-cache on install (NEVER precache HTML or version.json)
const PRECACHE_ASSETS = [
  '/app.css',
  '/manifest.webmanifest',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/logo-transparent.png'
];

// Message Event: Allow client to force immediate skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

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

// 3. Fetch Event: Strict Network-Only for APIs, Admin, version.json, and HTML Navigation
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // RULE 1: STRICT NETWORK-ONLY
  // Non-GET requests (POST, PUT, DELETE, etc.) must NEVER be cached
  if (req.method !== 'GET') {
    return; // Browser default direct fetch
  }

  // Admin vault pages must NEVER be intercepted or redirected to the game shell
  const isVaultOrAdmin = url.pathname.includes('vault') || 
                         url.pathname.includes('admin') || 
                         url.pathname.startsWith('/m-vault') ||
                         url.pathname.startsWith('/hq-vault');

  // Authoritative server API endpoints, auth routes, and database connections
  const hostname = url.hostname.toLowerCase();
  const isExternalApiHost = 
    hostname === 'supabase.co' || hostname.endsWith('.supabase.co') ||
    hostname === 'googleapis.com' || hostname.endsWith('.googleapis.com') ||
    hostname === 'firebaseio.com' || hostname.endsWith('.firebaseio.com');

  const isApi = url.pathname.startsWith('/api/') || 
                url.pathname.startsWith('/auth/') ||
                url.pathname.startsWith('/rest/') ||
                url.pathname.startsWith('/storage/') ||
                url.pathname.startsWith('/graphql/') ||
                url.pathname.startsWith('/realtime/') ||
                url.port === '3999' ||
                url.port === '3001' ||
                url.port === '8000' ||
                isExternalApiHost;

  const isBusterOrVersion = url.pathname.endsWith('version.json') || 
                            url.pathname.endsWith('sw.js') || 
                            url.searchParams.has('_t') ||
                            url.searchParams.has('_hard_reload');

  if (isApi || isVaultOrAdmin || isBusterOrVersion) {
    // Network-Only: Direct fetch, zero caching intervention, never fallback to /index.html
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }

  // HTML Page Navigation: ALWAYS load live from network to guarantee fresh build
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-cache' }).catch(() => {
        // Fallback to cache ONLY when truly offline
        return caches.match('/index.html').then(res => res || new Response('Offline', { status: 503 }));
      })
    );
    return;
  }

  // RULE 2: SMART STALE-WHILE-REVALIDATE (For static assets like CSS, JS bundles, images, fonts)
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
            const contentType = networkResponse.headers.get('content-type') || '';
            if (!contentType.includes('text/html')) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(req, responseClone);
              });
            }
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      // Return cached response immediately for blazing fast 0-latency load and low data usage
      return cachedResponse || fetchPromise;
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

// 5. Notification Click Event: Focus or open the game window safely
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let safeTargetUrl = '/';
  try {
    const rawUrl = (event.notification.data && event.notification.data.url) || '/';
    const parsed = new URL(rawUrl, self.location.origin);
    // Enforce same-origin navigation to prevent open redirect vulnerabilities
    if (parsed.origin === self.location.origin) {
      safeTargetUrl = parsed.pathname + parsed.search + parsed.hash;
    }
  } catch (e) {
    safeTargetUrl = '/';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(safeTargetUrl);
      }
    })
  );
});
