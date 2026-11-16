/* FORJA offline shell: prefer current network assets; use cache only when offline. */
const CACHE = 'forja-shell-v48-20261116-mealplan01-catalog';
const APP_FILES = [
  './', './index.html', './styles.css?v=20261116-mealplan01', './body-measures.js?v=20261116-mealplan01', './activity.js?v=20261116-mealplan01', './health-import.js?v=20261116-mealplan01', './nutrition-goals.js?v=20261116-mealplan01', './goal-planner.js?v=20261116-mealplan01', './reminders.js?v=20261116-mealplan01', './daily-routine.js?v=20261116-mealplan01', './nutrition.js?v=20261116-mealplan01', './nutrition-catalog.js?v=20261116-mealplan01', './nutrition-presets.js?v=20261116-mealplan01', './nutrition-balance.js?v=20261116-mealplan01', './nutrition-ui.js?v=20261116-mealplan01', './evolution-dashboard.js?v=20261116-mealplan01', './app.js?v=20261116-mealplan01', './data.js?v=20261116-mealplan01',
  './engine.js?v=20261116-mealplan01', './muay.js?v=20261116-mealplan01', './calendar.js?v=20261116-mealplan01', './flex.js?v=20261116-mealplan01', './dose.js?v=20261116-mealplan01', './focus.js?v=20261116-mealplan01', './catalog-advice.js?v=20261116-mealplan01', './manifest.webmanifest',
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
