const CACHE_NAME = 'kasir-pro-offline-v1';
const urlsToCache = [
    './',
    './index.html',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Menginstall Cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});

// Memotong Request dan Menyajikan dari Cache jika tidak ada koneksi Internet
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // Jika ada di cache, gunakan itu
            if (response) {
                return response;
            }
            // Jika tidak, download menggunakan Fetch biasa
            return fetch(event.request).catch(() => {
                // Return cache utama kalau offline
                return caches.match('./index.html');
            });
        })
    );
});
