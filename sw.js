/* FORJA offline shell: prefer current network assets; use cache only when offline. */
const CACHE = 'forja-shell-v11-ui-cache';
const APP_FILES = [
  './', './index.html',
  './styles.css?v=20261108-ui-cache-11', './app.js?v=20261108-ui-cache-11', './data.js?v=20261108-ui-cache-11',
  './engine.js?v=20261108-ui-cache-11', './muay.js?v=20261108-ui-cache-11', './calendar.js?v=20261108-ui-cache-11',
  './flex.js?v=20261108-ui-cache-11', './dose.js?v=20261108-ui-cache-11', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('forja-shell-') && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  event.respondWith(
    // Revalidate against the origin instead of trusting the browser HTTP cache.
    // The Cache Storage shell remains available when the network is offline.
    fetch(event.request, {cache: 'no-cache'})
      .then(async response => {
        if (!response.ok) {
          return (await caches.match(event.request)) || response;
        }
        if (response.type === 'basic') {
          const cache = await caches.open(CACHE);
          await cache.put(event.request, response.clone());
        }
        return response;
      })
      .catch(async () => (await caches.match(event.request)) || Response.error())
  );
});
