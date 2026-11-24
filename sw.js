/* FORJA offline shell: prefer current network assets; use cache only when offline. */
const CACHE = 'forja-shell-v70-20261123-muayfree1';
const APP_FILES = [
  './', './index.html', './styles.css?v=20261123-muayfree1', './body-measures.js?v=20261123-muayfree1', './activity.js?v=20261123-muayfree1', './health-import.js?v=20261123-muayfree1', './nutrition-goals.js?v=20261123-muayfree1', './goal-planner.js?v=20261123-muayfree1', './reminders.js?v=20261123-muayfree1', './daily-routine.js?v=20261123-muayfree1', './nutrition.js?v=20261123-muayfree1', './nutrition-catalog.js?v=20261123-muayfree1', './nutrition-prescription.json?v=20261123-muayfree1', './nutrition-prescription-data.js?v=20261123-muayfree1', './nutrition-presets.js?v=20261123-muayfree1', './nutrition-balance.js?v=20261123-muayfree1', './nutrition-ui.js?v=20261123-muayfree1', './evolution-dashboard.js?v=20261123-muayfree1', './performance-trends.js?v=20261123-muayfree1', './exercise-anatomy.js?v=20261123-muayfree1', './muscle-history.js?v=20261123-muayfree1', './muscle-body.js?v=20261123-muayfree1', './muscle-map.js?v=20261123-muayfree1', './training-balance.js?v=20261123-muayfree1', './catalog-recommendations.js?v=20261123-muayfree1', './share-summary.js?v=20261123-muayfree1', './share-sticker.js?v=20261123-muayfree1',  './app.js?v=20261123-muayfree1', './data.js?v=20261123-muayfree1',
  './cardio.js?v=20261123-muayfree1', './training-sets.js?v=20261123-muayfree1', './engine.js?v=20261123-muayfree1', './muay.js?v=20261123-muayfree1', './calendar.js?v=20261123-muayfree1', './flex.js?v=20261123-muayfree1', './free-workout.js?v=20261123-muayfree1', './catalog-session.js?v=20261123-muayfree1', './dose.js?v=20261123-muayfree1', './focus.js?v=20261123-muayfree1', './catalog-advice.js?v=20261123-muayfree1', './manifest.webmanifest',
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
