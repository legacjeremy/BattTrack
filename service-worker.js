const CACHE_NAME = "battery-reminder-v0-7";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/tokens.css",
  "./css/style.css",
  "./js/app.js",
  "./js/battery.js",
  "./js/calculation.js",
  "./js/constants.js",
  "./js/db.js",
  "./js/import-export.js",
  "./js/measurement.js",
  "./js/settings.js",
  "./js/ui.js",
  "./assets/favicon.png",
  "./assets/apple-touch-icon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
  "./assets/logo.svg",
  "./assets/icons/navigation/home.svg",
  "./assets/icons/navigation/batteries.svg",
  "./assets/icons/navigation/settings.svg",
  "./assets/icons/status/ok.svg",
  "./assets/icons/status/warning.svg",
  "./assets/icons/status/critical.svg",
  "./assets/icons/status/unknown.svg",
  "./assets/icons/actions/add.svg",
  "./assets/icons/actions/recharge.svg",
  "./assets/icons/actions/edit.svg",
  "./assets/icons/actions/archive.svg",
  "./assets/icons/actions/restore.svg",
  "./assets/icons/actions/delete.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      });
    })
  );
});
