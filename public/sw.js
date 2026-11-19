/* BiddWorld offline app shell. Never cache Supabase/auth or other API traffic. */
const CACHE_PREFIX = 'biddworld-shell-';
const CACHE_NAME = CACHE_PREFIX + 'v4';
const APP_ROOT = new URL('./', self.registration.scope);
const SHELL_URLS = [
  APP_ROOT.href,
  new URL('manifest.webmanifest', APP_ROOT).href,
  new URL('biddworld-icon.svg', APP_ROOT).href,
  new URL('icons/biddworld-192.png', APP_ROOT).href,
  new URL('icons/biddworld-512.png', APP_ROOT).href,
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(APP_ROOT.href)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) || (await cache.match(APP_ROOT.href)) || Response.error();
      }
    })());
    return;
  }

  // Network-first keeps deployed assets fresh while retaining an offline fallback.
  // Only same-origin static assets inside this app deployment scope are cached.
  if (request.destination && ['script', 'style', 'image', 'font'].includes(request.destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(request)) || Response.error();
      }
    })());
  }
});
