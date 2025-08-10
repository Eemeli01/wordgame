// sw.js — tiny offline cache for GitHub Pages
const CACHE = "sv-fi-game-v1";
const ASSETS = ["./", "./index.html", "./data.csv"];

// Install: precache essentials
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - HTML navigations: cache-first fallback (offline works)
// - data.csv: cache-first, then update cache in background when online
// - others: network-first fallback to cache
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Handle navigation to keep app shell available
  if (req.mode === "navigate") {
    e.respondWith(
      caches.match("./index.html").then((r) => r || fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put("./index.html", copy));
        return resp;
      }))
    );
    return;
  }

  // Cache-first for data.csv
  if (url.pathname.endsWith("/data.csv") || url.pathname.endsWith("data.csv")) {
    e.respondWith(
      caches.match("./data.csv").then((cached) => {
        const fetchAndUpdate = fetch(req).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put("./data.csv", copy));
          return resp;
        }).catch(() => cached);
        return cached || fetchAndUpdate;
      })
    );
    return;
  }

  // Default: network-first with cache fallback
  e.respondWith(
    fetch(req).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return resp;
    }).catch(() => caches.match(req))
  );
});