const CACHE_NAME = 'dengue-app-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  // Thêm các file CSS, fonts hoặc icon khác nếu có
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// Sự kiện install: cache các file cần thiết
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Sự kiện fetch: trả về file từ cache nếu có, nếu không thì fetch từ mạng
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Trả về từ cache nếu tìm thấy
        if (response) {
          return response;
        }
        // Nếu không, fetch từ mạng
        return fetch(event.request);
      }
    )
  );
});