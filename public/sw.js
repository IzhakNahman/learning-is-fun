// Offline support: the app shell is cached on first visit; recorded audio is cached as it is used.
// Audio (and its manifest.json) is fetched fresh when online, so new recordings show up;
// the cached copy is only used offline.
const CACHE_NAME = 'learning-is-fun-v8';
const APP_SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))),
  );
  self.clients.claim();
});

function saveCopy(request, response) {
  // Only full answers can be cached (audio players often ask for a part, which is a 206).
  if (response.status !== 200) return;
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
}

function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      saveCopy(request, response);
      return response;
    })
    .catch(() => caches.match(request).then((cached) => cached || Response.error()));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/audio/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          saveCopy(request, response);
          return response;
        })
        .catch(() => caches.match('index.html'));
    }),
  );
});
