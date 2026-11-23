/* FORJA offline shell: prefer current network assets; use cache only when offline. */
const CACHE = 'forja-shell-v68-20261123-shoulders21';
const APP_FILES = [
  './', './index.html', './styles.css?v=20261123-shoulders21', './body-measures.js?v=20261123-shoulders21', './activity.js?v=20261123-shoulders21', './health-import.js?v=20261123-shoulders21', './nutrition-goals.js?v=20261123-shoulders21', './goal-planner.js?v=20261123-shoulders21', './reminders.js?v=20261123-shoulders21', './daily-routine.js?v=20261123-shoulders21', './nutrition.js?v=20261123-shoulders21', './nutrition-catalog.js?v=20261123-shoulders21', './nutrition-prescription.json?v=20261123-shoulders21', './nutrition-prescription-data.js?v=20261123-shoulders21', './nutrition-presets.js?v=20261123-shoulders21', './nutrition-balance.js?v=20261123-shoulders21', './nutrition-ui.js?v=20261123-shoulders21', './evolution-dashboard.js?v=20261123-shoulders21', './performance-trends.js?v=20261123-shoulders21', './exercise-anatomy.js?v=20261123-shoulders21', './muscle-history.js?v=20261123-shoulders21', './muscle-body.js?v=20261123-shoulders21', './muscle-map.js?v=20261123-shoulders21', './training-balance.js?v=20261123-shoulders21', './catalog-recommendations.js?v=20261123-shoulders21', './share-summary.js?v=20261123-shoulders21', './share-sticker.js?v=20261123-shoulders21',  './app.js?v=20261123-shoulders21', './data.js?v=20261123-shoulders21',
  './cardio.js?v=20261123-shoulders21', './training-sets.js?v=20261123-shoulders21', './engine.js?v=20261123-shoulders21', './muay.js?v=20261123-shoulders21', './calendar.js?v=20261123-shoulders21', './flex.js?v=20261123-shoulders21', './catalog-session.js?v=20261123-shoulders21', './dose.js?v=20261123-shoulders21', './focus.js?v=20261123-shoulders21', './catalog-advice.js?v=20261123-shoulders21', './manifest.webmanifest',
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
