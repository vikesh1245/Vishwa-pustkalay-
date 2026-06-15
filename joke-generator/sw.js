/**
 * Service Worker for Joke Generator
 * Enables offline functionality and caching
 */

const CACHE_NAME = 'joke-generator-v1';
const urlsToCache = [
    '/joke-generator/',
    '/joke-generator/index.html',
    '/joke-generator/css/style.css',
    '/joke-generator/js/storage.js',
    '/joke-generator/js/api.js',
    '/joke-generator/js/app.js',
    '/joke-generator/manifest.json'
];

// Install event - cache essential files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Joke Generator: Opened cache');
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
                        console.log('Joke Generator: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - network first for API, cache first for local files
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Handle JokeAPI requests - network first with fallback to cache
    if (event.request.url.includes('v2.jokeapi.dev')) {
        event.respondWith(
            fetch(event.request, { timeout: 5000 })
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
                    return caches.match(event.request)
                        .then(response => {
                            if (response) {
                                return response;
                            }
                            // Return offline response
                            return new Response(
                                JSON.stringify({
                                    error: true,
                                    message: 'Offline - Using cached joke'
                                }),
                                {
                                    status: 200,
                                    headers: { 'Content-Type': 'application/json' }
                                }
                            );
                        });
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
                        // Return offline page if available
                        return caches.match('/joke-generator/index.html')
                            .then(response => {
                                if (response) {
                                    return response;
                                }
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

// Handle push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data?.text() || 'नया चुटकुला उपलब्ध है!',
        icon: '/joke-generator/assets/icon-192.png',
        badge: '/joke-generator/assets/badge-72.png',
        tag: 'joke-notification',
        requireInteraction: false
    };

    event.waitUntil(
        self.registration.showNotification('😂 हँसी की पुस्तकालय', options)
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
                    if (client.url.includes('/joke-generator/') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window if not already open
                if (clients.openWindow) {
                    return clients.openWindow('/joke-generator/');
                }
            })
    );
});

console.log('Service Worker registered for Joke Generator');
