/**
 * BraChum Service Worker
 * Provides offline caching, fast asset loading, and PWA standalone support
 */

const CACHE_NAME = 'brachum-pwa-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './gemini.js',
  './firebase-config.js',
  './docx.iife.js',
  './minutes-generator.js',
  './editor.js',
  './export.js',
  './speech.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: Cache Shell Assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 BraChum PWA caching static assets...');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Cache addAll warning:', err);
      });
    })
  );
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate for app assets, Network-First for API/Firebase
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip Firebase APIs and Google AI Studio APIs from cache
  if (url.origin.includes('googleapis.com') || 
      url.origin.includes('firebaseio.com') ||
      url.origin.includes('firestore.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch new version in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Fallback for HTML navigation
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
