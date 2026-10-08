/* ============================================================
 * Life Garden Service Worker
 * ------------------------------------------------------------
 * 離線快取策略：
 *   1) App Shell 預先快取（precache）
 *   2) 靜態資源：Stale-While-Revalidate
 *   3) 照片資源（IndexedDB 來源）：協助緩存
 *   4) 導航請求：Network First，失敗回退至離線頁
 * ============================================================ */

const CACHE_VERSION = 'life-garden-v0.2.0';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const PHOTO_CACHE = `${CACHE_VERSION}-photos`;

const APP_SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './sounds/tap.wav',
  './sounds/success.wav',
];

self.addEventListener('install', (event) => {
  console.log('[SW] install');
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] activate');
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
    return;
  }

  if (url.pathname.startsWith('/photos/')) {
    event.respondWith(cacheFirst(req, PHOTO_CACHE));
    return;
  }

  if (
    ['style', 'script', 'worker', 'font', 'image'].includes(req.destination)
  ) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }
});

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || caches.match('./index.html');
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  const cache = await caches.open(cacheName);
  cache.put(request, fresh.clone());
  return fresh;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((fresh) => {
      cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});