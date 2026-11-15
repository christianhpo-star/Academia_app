/* FORJA offline shell: prefer current network assets; use cache only when offline. */
const CACHE = 'forja-shell-v30-20261115-motion1';
const APP_FILES = [
  './', './index.html', './styles.css?v=20261115-motion1', './body-measures.js?v=20261115-ux14', './activity.js?v=20261115-ux14', './health-import.js?v=20261115-ux14', './nutrition-goals.js?v=20261115-ux14', './nutrition.js?v=20261115-ux14', './nutrition-catalog.js?v=20261115-ux14', './nutrition-ui.js?v=20261115-ux14', './app.js?v=20261115-motion1', './exercise-motion.js?v=20261115-motion1', './data.js?v=20261115-ux14',
  './engine.js?v=20261115-ux14', './muay.js?v=20261115-ux14', './calendar.js?v=20261115-ux14', './flex.js?v=20261115-ux14', './dose.js?v=20261115-ux14', './focus.js?v=20261115-ux14', './catalog-advice.js?v=20261115-ux14', './manifest.webmanifest',
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
  // Never serve an old application shell after a URL-versioned update.
  // The network remains authoritative; cache is a fallback for offline use.

  event.respondWith(
    fetch(event.request)
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
