/* Service Worker der App: empfängt Push-Nachrichten und öffnet beim Tippen die richtige Seite.
   Dazu ein kleiner Speicher, damit die App auch ohne Netz startet (Netz zuerst, Speicher nur als Ersatz).
   Daten aus Supabase werden nie gespeichert, nur die Dateien der App selbst. */
const CACHE = 'tw-app-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

// Nur eigene Dateien (gleiche Adresse), nur GET; Supabase und andere Dienste laufen direkt übers Netz
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') (await caches.open(CACHE)).put(req, res.clone());
      return res;
    } catch (e) {
      const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      if (req.mode === 'navigate') { const start = await caches.match('/', { ignoreSearch: true }); if (start) return start; }
      throw e;
    }
  })());
});

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (_) { d = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(d.title || 'Tanja Wissel', {
    body: d.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: d.tag || 'tw',
    data: { url: d.url || '/#/heute' },
    lang: 'de',
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const ziel = new URL(event.notification.data && event.notification.data.url || '/#/heute', self.location.origin);
  if (ziel.origin !== self.location.origin) return;
  event.waitUntil((async () => {
    const offen = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of offen) {
      if (new URL(c.url).origin === ziel.origin && 'focus' in c) {
        // Offene App: nur die Seite wechseln (app.js hört auf diese Nachricht)
        c.postMessage({ typ: 'gehe', hash: ziel.hash || '#/heute' });
        return c.focus();
      }
    }
    return self.clients.openWindow(ziel.href);
  })());
});
