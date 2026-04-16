const CACHE_NAME = 'vivid-wins-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/auctions.html',
  '/how-to-enter.html',
  '/reviews.html',
  '/contact.html',
  '/assets/css/styles.css'
];

self.addEventListener('install', event => {
  // Skip waiting allows the new service worker to take over immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  // Claim clients so the new service worker controls the page immediately
  event.waitUntil(clients.claim());
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Use Network-First strategy (good for live sites & development)
  // We try to fetch from the server first to get the latest content. 
  // If the server is offline, we fall back to the cached version.
  event.respondWith(
    fetch(event.request).then(response => {
      // Dynamic caching: cache the new response for future offline use
      if (response && response.status === 200 && response.type === 'basic') {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
      }
      return response;
    }).catch(() => {
      // Fallback to cache if network fails (offline)
      return caches.match(event.request);
    })
  );
});
