/**
 * Service Worker for Weather Dashboard
 * Enables offline functionality and caching
 */

const CACHE_NAME = 'weather-dashboard-v1';
const urlsToCache = [
    '/weather-dashboard/',
    '/weather-dashboard/index.html',
    '/weather-dashboard/css/style.css',
    '/weather-dashboard/js/weather-api.js',
    '/weather-dashboard/js/storage.js',
    '/weather-dashboard/js/app.js',
    '/weather-dashboard/manifest.json'
];

// Install event - cache essential files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Handle API requests (OpenWeatherMap)
    if (event.request.url.includes('api.openweathermap.org')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cache successful API responses
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Return cached response if network fails
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Handle local requests - cache first strategy
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached response if available
                if (response) {
                    return response;
                }

                // Otherwise, try to fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type === 'error') {
                            return response;
                        }

                        // Clone the response
                        const responseClone = response.clone();

                        // Cache successful responses
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseClone);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Return offline page or cached resource if available
                        return caches.match(event.request)
                            .then(response => {
                                if (response) {
                                    return response;
                                }
                                // You could serve an offline page here
                                return new Response('Offline - please check your connection', {
                                    status: 503,
                                    statusText: 'Service Unavailable',
                                    headers: new Headers({
                                        'Content-Type': 'text/plain'
                                    })
                                });
                            });
                    });
            })
    );
});

// Handle background sync for weather updates
self.addEventListener('sync', event => {
    if (event.tag === 'sync-weather') {
        event.waitUntil(
            // Perform background sync tasks here
            Promise.resolve()
        );
    }
});

// Handle push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data?.text() || 'Weather notification',
        icon: '/weather-dashboard/assets/icon-192.png',
        badge: '/weather-dashboard/assets/badge-72.png',
        tag: 'weather-notification',
        requireInteraction: false
    };

    event.waitUntil(
        self.registration.showNotification('Weather Dashboard', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then(clientList => {
                // Check if app is already open
                for (let client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window if not already open
                if (clients.openWindow) {
                    return clients.openWindow('/weather-dashboard/');
                }
            })
    );
});

// Log service worker status
console.log('Service Worker registered for Weather Dashboard');
