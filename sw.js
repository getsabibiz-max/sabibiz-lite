// SabiBiz Lite Service Worker

importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = "sabibiz-lite-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(response => {
      return (
        response ||
        fetch(event.request).then(networkResponse => {
          if (networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, copy);
            });
          }
          return networkResponse;
        })
      );
    })
  );
});

// Required: message handler registered immediately
self.addEventListener("message", event => {
  // Intentionally empty
});

self.addEventListener("sync", event => {
  if (event.tag === "sync-entries") {
    event.waitUntil(Promise.resolve());
  }
});
