/* FORJA offline shell: prefer current network assets; use cache only when offline. */
const CACHE = 'forja-shell-v56-20261122-unified09-catalog';
const APP_FILES = [
  './', './index.html', './styles.css?v=20261122-unified09', './body-measures.js?v=20261122-unified09', './activity.js?v=20261122-unified09', './health-import.js?v=20261122-unified09', './nutrition-goals.js?v=20261122-unified09', './goal-planner.js?v=20261122-unified09', './reminders.js?v=20261122-unified09', './daily-routine.js?v=20261122-unified09', './nutrition.js?v=20261122-unified09', './nutrition-catalog.js?v=20261122-unified09', './nutrition-prescription.json?v=20261122-unified09', './nutrition-prescription-data.js?v=20261122-unified09', './nutrition-presets.js?v=20261122-unified09', './nutrition-balance.js?v=20261122-unified09', './nutrition-ui.js?v=20261122-unified09', './evolution-dashboard.js?v=20261122-unified09', './performance-trends.js?v=20261122-unified09', './exercise-anatomy.js?v=20261122-unified09', './app.js?v=20261122-unified09', './data.js?v=20261122-unified09',
  './engine.js?v=20261122-unified09', './muay.js?v=20261122-unified09', './calendar.js?v=20261122-unified09', './flex.js?v=20261122-unified09', './catalog-session.js?v=20261122-unified09', './dose.js?v=20261122-unified09', './focus.js?v=20261122-unified09', './catalog-advice.js?v=20261122-unified09', './manifest.webmanifest',
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
