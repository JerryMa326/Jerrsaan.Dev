const CACHE_VERSION = 'chemclub-v1'
const OPENCV_URL = 'https://docs.opencv.org/4.x/opencv.js'

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.png',
  '/favicon-removebg-preview.png',
  '/manifest.json',
]

// Install: precache app shell + attempt to cache OpenCV from CDN
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      const localCaching = cache.addAll(PRECACHE_URLS)
      // Cache OpenCV separately — don't fail install if CDN is down
      const opencvCaching = fetch(OPENCV_URL, { mode: 'cors' })
        .then((response) => {
          if (response.ok) return cache.put(OPENCV_URL, response)
        })
        .catch(() => console.warn('SW: Could not precache OpenCV.js'))
      return Promise.all([localCaching, opencvCaching])
    })
  )
  self.skipWaiting()
})

// Activate: delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  // Navigation (HTML page): stale-while-revalidate
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_VERSION).then((cache) => {
                cache.put('/index.html', clone)
              })
              // Notify clients that a new version is available
              self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                  client.postMessage({ type: 'SW_UPDATED' })
                })
              })
            }
            return response
          })
          .catch(() => cached)
        return cached || fetchPromise
      })
    )
    return
  }

  // OpenCV CDN: cache-first
  if (request.url === OPENCV_URL || request.url.startsWith('https://docs.opencv.org/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone))
            }
            return response
          })
        )
      })
    )
    return
  }

  // Same-origin static assets: cache-first
  if (new URL(request.url).origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    )
    return
  }
})

// Listen for skip-waiting message from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
