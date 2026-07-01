// ─── Offline Cache ───────────────────────────────────────────────────────────
const CACHE_NAME = 'sabibiz-lite-v1';
const ASSETS = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ✅ UPDATED FETCH HANDLER
self.addEventListener('fetch', event => {
  const request = event.request;

  // Only cache normal HTTP/HTTPS GET requests
  if (
    request.method !== 'GET' ||
    !request.url.startsWith('http') ||
    request.url.startsWith('chrome-extension://')
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then(response => {
          if (
            response &&
            response.status === 200 &&
            response.type === 'basic'
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, clone);
            });
          }

          return response;
        })
        .catch(() => {
          return caches.match(request);
        });
    })
  );
});
