const CACHE_NAME = "calendario-v2";
const BASE = self.location.pathname.replace(/sw\.js$/, "");
const ASSETS = [BASE, BASE + "logo.svg", BASE + "manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Don't cache WebSocket, HMR, or chrome-extension requests
  const url = event.request.url;
  if (url.includes("ws:") || url.includes("__vite") || url.includes("chrome-extension")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Network failed — return cached version if available
          return cached || new Response("Offline", { status: 503 });
        });
      return cached || fetched;
    })
  );
});
