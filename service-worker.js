const CACHE_NAME = "batttrack-v1-4-4";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./version.json",
  "./css/tokens.css",
  "./css/style.css",
  "./css/chart.css",
  "./css/header-contrast.css",
  "./css/measurement-flags.css",
  "./js/app.js",
  "./js/battery.js",
  "./js/cache-refresh.js",
  "./js/calculation.js",
  "./js/constants.js",
  "./js/db.js",
  "./js/import-export.js",
  "./js/measurement.js",
  "./js/measurement-flags.js",
  "./js/settings.js",
  "./js/ui.js",
  "./assets/favicon.png",
  "./assets/apple-touch-icon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-192-maskable.png",
  "./assets/icon-512-maskable.png",
  "./assets/logo.png",
  "./assets/icons/status/ok.svg",
  "./assets/icons/status/warning.svg",
  "./assets/icons/status/critical.svg",
  "./assets/icons/status/unknown.svg",
  "./assets/icons/navigation/home.svg",
  "./assets/icons/navigation/settings.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.filter((cacheName) => cacheName !== CACHE_NAME).map((cacheName) => caches.delete(cacheName))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      });
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
