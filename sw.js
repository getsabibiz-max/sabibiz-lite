// SabiBiz Lite — Service Worker (file-based, combined with OneSignal)
// This file replaces the old Blob-based service worker.
// It merges: (1) OneSignal's push SDK, (2) offline caching, (3) scheduled
// local notifications used for milestone celebrations & daily reminders.

// ─── OneSignal SDK (handles real background push delivery) ─────────────────
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// ─── Offline Cache ───────────────────────────────────────────────────────────
const CACHE_NAME = 'sabibiz-lite-v1';
const ASSETS = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return res;
    }).catch(() => cached))
  );
});

// ─── Notification click routing ──────────────────────────────────────────────
// OneSignal's SDK already attaches its own notificationclick handler for
// push delivery. We add our own listener for clicks that originate from our
// own scheduled (non-OneSignal) local notifications, used for milestone pop-ups.
self.addEventListener('notificationclick', e => {
  const data = e.notification.data || {};
  if (!data.sabibizLocal) return; // let OneSignal's own handler manage its notifications

  e.notification.close();
  const action = e.action;
  let url = '/';
  if (action === 'log' || data.action === 'log') url = '/?action=add-sale';
  if (action === 'reflect' || data.action === 'reflect') url = '/?tab=insights';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url });
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ─── Background Sync (for offline entries) ─────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'sync-entries') {
    e.waitUntil(syncPendingEntries());
  }
});

async function syncPendingEntries() {
  console.log('[SW] Background sync triggered');
}

// ─── Scheduled local notifications (milestones, in-session reminders) ───────
// These are short-delay notifications triggered while the app is open
// (e.g. a milestone celebration right after saving an entry). For real
// background daily reminders (morning/afternoon/evening) OneSignal handles
// delivery server-side instead — see notifications.js in the HTML file.
const ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAEHklEQVR4nO3cwXHbSBCGUXhrT7puDM7DiWx0TsR5OIa96mqfWCXTkpcAgZnu+d87WyIx0x+HIlHeNgAAAAAAAAAAAAAAAAAAAAAAoIpPs59AFS+fv/yY/RxGe/3+LX7/IxcgcdgflRZFxMUa+ONWD2LpizP451k1hOUuytBfb6UYlrkQgz/eCiG0vwCDP1/nEP6a/QSeYfhr6LwPLcvtvOCr63YatDsBDH9t3fanVQDdFjdVp31qcVx1WlB+Vf0tUfkTwPD3Vn3/SgdQffF4TOV9LBtA5UVjv6r7WTKAqovFcyrua7kAKi4S56m2v6UCqLY4XKPSPpcKAEYrE0ClVwWuV2W/SwRQZTEYq8K+Tw+gwiIwz+z9nx4AzDQ1gNn1U8PMOZgWgOHnrVnz4C0Q0aYE4NWf98yYCycA0YYH4NWfPxk9H04AogmAaEMD8PaHR4ycEycA0YYF4NWfPUbNixOAaAIgmgCINiQA7/85YsTcOAGIJgCiCYBoAiDa5QH4A5hnXD0/TgCiCYBoAiCaAIgmAKIJgGgCIJoAiPb37CdAba9f/9n171/+/e+iZ3INJwAf2jv8R39mJgHwrmcGuVMEAuA3ZwxwlwgEwC/OHNwOEQiAaAIgmgCIJgCiCYBoAiCaAIgmAKK5Ge5Jq98stjonwBMSbhZbnQAOSrlZbHUCOCDpZrHVCWCntJvFVicAogmAaAIgmgCIJgCiCYBoAiCaAIjmZrhm3Hx3LidAI26+O58AmnDz3TUE0ICb764jgOLcfHctARBNAEQTANEEQLTlvgjzRRF7LHUC+KKIvZYJwBdFHLFEAL4o4qj2AfiiiGe0DwCeIQCiCYBoAiCaAIgmAKIJgGgCIJoAiCYAogmAaAIg2uUBvH7/9unqx2BdV8+PE4BoAiCaAIgmAKINCcAfwhwxYm6cAEQTANEEQLRhAfg7gD1GzYsTgGhDA3AK8IiRc+IEIJoAiDY8gLOPtzP/e/NHfpfHO/fx7o1+m7zECXDGpu35HR5vzO8YYUoAV1T+zIIf+VmPd/7PzviQZIkT4KbDRnu8WqZ+LPny+cuPmY9PHbM+Ip96AvhegG2bOwdLvQWCvaYH4BTINnv/pwewbfMXgTkq7HuJALatxmIwTpX9LhMAzFAqgCqvClyr0j6XCmDbai0O56u2v+UC2LZ6i8Q5Ku5ryQC2reZicVzV/SwbwLbVXTT2qbyPpQPYttqLx/+rvn+ln9w9N8/1UX3wb8qfAG91WdR0nfapVQDb1mtxE3Xbn1ZP9p63RHV0G/ybdifAW10XfTWd96HtE7/nNBiv8+DftL+Ae0K43gqDf7PMhbxHDOdZaejfWvKi7gnhuFUH/2bpi/uIID62+sDfi7rYP0mMIm3YAQAAAAAAAAAAAAAAAAAAAAAa+AltvlAE0GVpsQAAAABJRU5ErkJggg==';
const BADGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAABc0lEQVR4nO2bsW3DQAxFlcCV28yQPbKIp8si2SMzpHUbVwcYgZx/R/Is8vBeaRmHzweSsgFp2wAAAAAAdniZefj5/eN35vn3XL+/ptQSfugzpTwiUlbYQRnE/CVC1GtEkIxyti0ml1tQVjkNbz6XoOxyGp6cZkFV5DSseU2CqslpWHIPC6oqpzGaf0hQdTmNkTpCbvMr0y1ole5p9NZDBwkQJOgStNp4NXrqooMECBIgSIAgAYIEp6MDRHD9fNv9/Hz5cZ9dvoMeyVHXeikvaDYIEhyyg2bujGie3kGzd0Y0jJgAQQIECVL/UMywzNN2UJZlnlZQFhAkCN1BGXZGNGEdlGVnRMOICRAkQJAAQQIECRAk6BI06yHto+mpiw4SIEjQLWi1MeutJ6yD/vu/dX/tqO9ZGe6KFZ4VGpmG4Q6qPmqj+U0jVlWSJbd5B1WTZM3rWtJVJHlyuu9i2SV584Xc5rNKisjFO6sC3noGAAAAgF1uFet/TQAA/OgAAAAASUVORK5CYII=';

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATION') {
    const { delay, title, body, tag, notifData } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: ICON,
        badge: BADGE,
        tag,
        vibrate: [200, 100, 200],
        data: { ...(notifData || {}), sabibizLocal: true },
        actions: notifData?.actions || []
      });
    }, delay);
  }
});
