// Service worker: makes the app work offline. It only caches the app's own files;
// loaded reports never pass through it (they are read locally and never fetched).
const VERSION = '__VERSION__';
const FILES = __FILES__;
const CACHE = `argus-${VERSION}`;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('argus-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

// The page asks for this when the user accepts an update.
self.addEventListener('message', e => { if (e.data?.type === 'skip-waiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // navigations always get the app shell (query strings, launches from the OS file handler, …)
    const hit = req.mode === 'navigate' ? await cache.match('./') : await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    return fetch(req);
  })());
});
