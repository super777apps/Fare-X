const CACHE_NAME = "farex-cache-v1";

const urlsToCache = [
  "/",
  "/index.html",
  "/dashboardDriver.html",
  "/dashboardPassenger.html",
  "/css/style.css",
  "/js/createPassenger.js",
  "/js/dashboardDriver.js",
  "/js/dashboardPassenger.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});