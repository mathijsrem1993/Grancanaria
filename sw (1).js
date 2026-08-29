/* Service worker voor de Gran Canaria-app.
   Eigen bestanden: eerst internet, anders de cache. Zo zie je een nieuwe versie
   meteen zodra je online bent, en werkt de app door zonder bereik.
   De Firebase-bibliotheek: eerst de cache, zodat de app ook offline start. */
const CACHE = 'gran-canaria-v2';
const ASSETS = ['./', './index.html', './manifest.json',
                './icon-192.png', './icon-512.png', './icon-180.png'];
const CDN = 'https://www.gstatic.com/firebasejs/';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // De Firebase-bibliotheek verandert nooit: uit de cache serveren als die er is.
  if (req.url.startsWith(CDN)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }))
    );
    return;
  }

  // Alle andere verzoeken naar andere servers (de database zelf) met rust laten.
  if (new URL(req.url).origin !== location.origin) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
