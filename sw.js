// SabiBiz Lite Service Worker
// OneSignal + Offline Cache

importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = "sabibiz-lite-v1";
const ASSETS = [
  "/",
  "/index.html"
];

const ICON = "/icon-192.png";
const BADGE = "/icon-192.png";


// Message handler
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SCHEDULE_NOTIFICATION") {

    const {
      delay,
      title,
      body,
      tag,
      notifData
    } = event.data;

    setTimeout(() => {

      self.registration.showNotification(title, {
        body: body,
        icon: ICON,
        badge: BADGE,
        tag: tag,
        vibrate: [200,100,200],
        data: {
          ...(notifData || {}),
          sabibizLocal: true
        },
        actions: notifData?.actions || []
      });

    }, delay);
  }
});


// Install
self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );

});


// Activate
self.addEventListener("activate", event => {

  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );

});


// Fetch
self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {

        return response || fetch(event.request)
          .then(networkResponse => {

            if (networkResponse.ok) {

              const clone = networkResponse.clone();

              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, clone);
                });

            }

            return networkResponse;

          });

      })
  );

});


// Notification click
self.addEventListener("notificationclick", event => {

  event.notification.close();

  event.waitUntil(
    clients.openWindow("/")
  );

});


// Background sync
self.addEventListener("sync", event => {

  if (event.tag === "sync-entries") {
    event.waitUntil(
      console.log("Background sync triggered")
    );
  }

});
