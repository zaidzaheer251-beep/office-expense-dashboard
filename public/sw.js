const CACHE_NAME = 'approx-expense-v3';
const ASSETS = [
  './index.html',
  './style.css',
  './app.js',
  './html2pdf.js'
];

// Install Event - cache core shell assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).catch(err => console.error("SW cache open failed:", err))
  );
  self.skipWaiting();
});

// Activate Event - clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - network first with cache fallback
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  
  // Skip API/Supabase calls or external URL methods
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, resClone);
          });
        }
        return res;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
