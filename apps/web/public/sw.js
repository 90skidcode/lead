const CACHE_NAME = 'lead-pwa-v1';
const RUNTIME_CACHE = 'lead-runtime-v1';
const API_CACHE = 'lead-api-v1';

const OFFLINE_URLS = [
  '/',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
];

const STATIC_ASSETS = [
  /\.(js|css|woff2)$/,
  /_next\/static\//,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        OFFLINE_URLS.map((url) => cache.add(url).catch(() => console.log(`Failed to cache ${url}`)))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE && name !== API_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return event.respondWith(fetch(request));
  }

  if (url.pathname.startsWith('/api/')) {
    return event.respondWith(networkFirstApi(request));
  }

  if (isStaticAsset(url.pathname)) {
    return event.respondWith(cacheFirstStatic(request));
  }

  return event.respondWith(networkFirstHtml(request));
});

async function networkFirstApi(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Asset not found', { status: 404 });
  }
}

async function networkFirstHtml(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const offlineResponse = await caches.match('/offline.html');
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

function isStaticAsset(pathname) {
  return STATIC_ASSETS.some((pattern) => pattern.test(pathname));
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'GET_CACHE_STATUS') {
    caches.match('/').then((cached) => {
      event.ports[0].postMessage({
        type: 'CACHE_STATUS',
        hasCached: !!cached,
      });
    });
  }
});
