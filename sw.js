/* FORJA offline shell: prefer current network assets; use cache only when offline. */
const CACHE = 'forja-shell-v52-20261122-catalog05-catalog';
const APP_FILES = [
  './', './index.html', './styles.css?v=20261122-catalog05', './body-measures.js?v=20261122-catalog05', './activity.js?v=20261122-catalog05', './health-import.js?v=20261122-catalog05', './nutrition-goals.js?v=20261122-catalog05', './goal-planner.js?v=20261122-catalog05', './reminders.js?v=20261122-catalog05', './daily-routine.js?v=20261122-catalog05', './nutrition.js?v=20261122-catalog05', './nutrition-catalog.js?v=20261122-catalog05', './nutrition-prescription.json?v=20261122-catalog05', './nutrition-prescription-data.js?v=20261122-catalog05', './nutrition-presets.js?v=20261122-catalog05', './nutrition-balance.js?v=20261122-catalog05', './nutrition-ui.js?v=20261122-catalog05', './evolution-dashboard.js?v=20261122-catalog05', './performance-trends.js?v=20261122-catalog05', './app.js?v=20261122-catalog05', './data.js?v=20261122-catalog05',
  './engine.js?v=20261122-catalog05', './muay.js?v=20261122-catalog05', './calendar.js?v=20261122-catalog05', './flex.js?v=20261122-catalog05', './dose.js?v=20261122-catalog05', './focus.js?v=20261122-catalog05', './catalog-advice.js?v=20261122-catalog05', './manifest.webmanifest',
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
