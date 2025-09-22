/* eslint-env serviceworker */
const CACHE_NAME = 'ndk-tracker-cache-v2';
const OFFLINE_URLS = [
  `${self.registration.scope}`,
  `${self.registration.scope}index.html`,
  `${self.registration.scope}manifest.json`,
  `${self.registration.scope}favicon.ico`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  event.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).catch(() => caches.match(`${self.registration.scope}index.html`))
    )
  );
});