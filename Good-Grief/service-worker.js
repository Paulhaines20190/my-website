/* FILE service-worker.js — Offline resource support in the worker context (no DOM). The page registers this on HTTPS or localhost. API JSON caching belongs to script.js, not this worker. */
'use strict';
const CACHE_VERSION = 'good-grief-shell-v20';
const MEDIA_CACHE = 'good-grief-media-v20';
const APP_SHELL = ['./', './index.html', './advice.html', './books.html', './characters.html', './quiz.html', './references.html', './villains.html', './script.js', './styles.css', './image-unavailable.svg'];
/* Install: precache the local application shell. waitUntil keeps installation alive until all shell resources are cached. */
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
/* Activate: remove obsolete Good Grief caches, retain the active shell/media caches and take control of clients. */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('good-grief-') && ![CACHE_VERSION, MEDIA_CACHE].includes(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
/* Store a response and evict oldest cache keys above the supplied entry limit. Quota errors are intentionally nonfatal. */
async function saveResponse(cacheName, request, response, limit) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
    const keys = await cache.keys();
    while (keys.length > limit) await cache.delete(keys.shift());
  } catch { /* Quota failures must not prevent a successful response. */ }
}
/* Prefer fresh network data; abort after 30 seconds for images or 8 seconds otherwise. Fall back to a cached response; signal image failure so page-level cover recovery can run. */
async function networkFirst(request, cacheName, limit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), request.destination === 'image' ? 30000 : 8000);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (!response.ok && response.type !== 'opaque') throw new Error('Unavailable resource');
    await saveResponse(cacheName, request, response.clone(), limit);
    return response;
  } catch {
    const cache = await caches.open(cacheName);
    const saved = await cache.match(request);
    if (saved) return saved;
    // Let the page try an alternative cover before displaying its placeholder.
    if (request.destination === 'image') return Response.error();
    return new Response('Unavailable offline. Reconnect and try again.', {status: 503, headers: {'Content-Type': 'text/plain'}});
  } finally { clearTimeout(timer); }
}
/* Intercept GET only. Same-origin resources use the bounded shell cache; external image/style/script/font requests use the media cache. Other external requests continue normally. */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, CACHE_VERSION, 60));
  } else if (['image', 'style', 'script', 'font'].includes(request.destination)) {
    // Cache only resources actually requested by this site, bounded to 100 entries.
    event.respondWith(networkFirst(request, MEDIA_CACHE, 100));
  }
  // API JSON is persisted with timestamps and bounded storage by fetchJSON.
});
