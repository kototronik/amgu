const CACHE_NAME = 'amgu-pwa-v1.1'; 

const ASSETS = [
  '/',
  './',
  './manifest.json',
  './style.css',
  './amgu_192.png',
  './amgu_512.png',
  './screenshots/mobile.png',
  './screenshots/desktop.png',
  './js/main.js',
  './js/init.js',
  './js/api.js',
  './js/events.js',
  './js/loader.js',
  './js/renderer.js',
  './js/state.js',
  './js/ui.js',
  './js/utils.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(err => {
        console.error('Ошибка: какой-то файл из ASSETS не найден!', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('cabinet.amursu.ru')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const cacheCopy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, cacheCopy));
        }
        return res;
      }).catch(() => {});

      return cached || networked;
    })
  );
});