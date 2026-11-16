/* FORJA offline shell: prefer current network assets; use cache only when offline. */
const CACHE = 'forja-shell-v42-20261116-balance27-catalog';
const APP_FILES = [
  './', './index.html', './styles.css?v=20261116-balance27', './body-measures.js?v=20261116-balance27', './activity.js?v=20261116-balance27', './health-import.js?v=20261116-balance27', './nutrition-goals.js?v=20261116-balance27', './goal-planner.js?v=20261116-balance27', './reminders.js?v=20261116-balance27', './daily-routine.js?v=20261116-balance27', './nutrition.js?v=20261116-balance27', './nutrition-catalog.js?v=20261116-balance27', './nutrition-balance.js?v=20261116-balance27', './nutrition-ui.js?v=20261116-balance27', './app.js?v=20261116-balance27', './data.js?v=20261116-balance27',
  './engine.js?v=20261116-balance27', './muay.js?v=20261116-balance27', './calendar.js?v=20261116-balance27', './flex.js?v=20261116-balance27', './dose.js?v=20261116-balance27', './focus.js?v=20261116-balance27', './catalog-advice.js?v=20261116-balance27', './manifest.webmanifest',
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
