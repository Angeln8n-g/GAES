// GAES / CapacitaHub - Service Worker
const CACHE_NAME = 'gaes-pwa-v1.0.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/icon.svg'
];

// Install Event: Pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting outdated cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET and cross-origin external API requests
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Bypass Service Worker for API and WebSocket requests
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/ws')) return;

  // Strategy 1: For Navigation (HTML documents) -> Network first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Strategy 2: For static assets (JS, CSS, images, icons, fonts) -> Stale While Revalidate
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default fallback
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// Listen for message from app to skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ==========================================
// GESTIÓN DE NOTIFICACIONES PUSH EN SEGUNDO PLANO
// ==========================================

// 1. Evento PUSH: Recibe la alerta de capacitación o sistema
self.addEventListener('push', (event) => {
  let data = {
    title: '🔔 Alerta de Capacitación - GAES',
    body: 'Tienes una sesión de entrenamiento programada.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    url: '/my-registrations'
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const actions = [];
  if (data.meetingUrl) {
    actions.push({ action: 'open_meeting', title: '🚀 Entrar a Sala Virtual' });
  }
  actions.push({ action: 'open_app', title: '📖 Ver en GAES' });

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-192x192.png',
    vibrate: [250, 100, 250, 100, 250],
    tag: data.eventId ? `training_${data.eventId}` : 'gaes_training_alert',
    renotify: true,
    requireInteraction: true, // Mantener visible hasta que el usuario interactúe
    data: {
      url: data.url || '/my-registrations',
      meetingUrl: data.meetingUrl || null,
      eventId: data.eventId || null
    },
    actions
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 2. Evento NOTIFICATIONCLICK: Navegación directa al hacer clic en la alerta
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notifData = event.notification.data || {};

  let targetUrl = notifData.url || '/';

  // Si hizo clic en el botón de entrar a sala virtual
  if (action === 'open_meeting' && notifData.meetingUrl) {
    targetUrl = notifData.meetingUrl;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si la URL es externa (ej. enlace de Teams o Meet)
      if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
        if (!targetUrl.includes(self.location.origin)) {
          if (clients.openWindow) {
            return clients.openWindow(targetUrl);
          }
        }
      }

      // Si es una ventana interna de GAES abierta, enfocarla
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl.startsWith('/')) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }

      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

