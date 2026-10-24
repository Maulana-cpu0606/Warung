const CACHE_NAME = 'kasir-pro-v1';

// Daftar file dan library yang perlu disimpan ke memori HP/Browser (Cache)
const urlsToCache = [
    './',
    './index.html',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// EVENT INSTALL: Menyimpan file utama ke dalam Cache saat pertama kali web dibuka
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[ServiceWorker] Menyimpan cache...');
                return cache.addAll(urlsToCache);
            })
    );
    // Memaksa Service Worker baru untuk langsung aktif tanpa menunggu
    self.skipWaiting(); 
});

// EVENT ACTIVATE: Membersihkan cache versi lama jika ada pembaruan (misal ganti dari v1 ke v2)
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('[ServiceWorker] Menghapus cache lama:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Langsung mengambil alih kontrol halaman
});

// EVENT FETCH: Menangani request saat online maupun offline
self.addEventListener('fetch', event => {
    // 1. Abaikan request selain GET (seperti POST/PATCH ke API)
    if (event.request.method !== 'GET') return;
    
    // 2. JANGAN CACHE API GITHUB (Agar data database selalu real-time / tidak nyangkut data lama)
    if (event.request.url.includes('api.github.com')) return;

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Jika file ditemukan di Cache (misal sedang offline), langsung tampilkan
                if (response) {
                    // Update cache di background secara diam-diam jika sedang online (Stale-While-Revalidate)
                    fetch(event.request).then(networkResponse => {
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, networkResponse.clone());
                            });
                        }
                    }).catch(err => {
                        // Gagal update background (Sedang Offline murni), biarkan pakai cache.
                    });
                    return response;
                }
                
                // Jika tidak ada di Cache, ambil dari Internet (Network)
                return fetch(event.request).then(networkResponse => {
                    // Jika respon tidak valid, kembalikan saja apa adanya
                    if(!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
                        return networkResponse;
                    }
                    
                    // Simpan file baru tersebut ke Cache agar ke depannya bisa offline
                    let responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    
                    return networkResponse;
                }).catch(error => {
                    console.error('[ServiceWorker] Fetch gagal (offline sepenuhnya):', error);
                });
            })
    );
});
                      
