'use strict';

const CACHE_VERSION = 'good-grief-accessible-api-v15';
const APP_SHELL = [
  './',
  './advice.html',
  './books.html',
  './characters.html',
  './index.html',
  './quiz.html',
  './references.html',
  './script.js',
  './styles.css',
  './villains.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith('good-grief-') && key !== CACHE_VERSION,
            )
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // API responses stay network-only; the UI manages request caching and errors.
  if (url.origin !== self.location.origin) return;

  // App resources use cache-first with a network refresh fallback.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const copy = response.clone();
            caches
              .open(CACHE_VERSION)
              .then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
