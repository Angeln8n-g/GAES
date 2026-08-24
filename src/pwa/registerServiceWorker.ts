/**
 * Service Worker Registration Handler for GAES / CapacitaHub PWA
 */

export function registerServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.MODE !== 'test') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registrado exitosamente con scope:', registration.scope);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;

            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[PWA] Nueva versión disponible. Recarga para actualizar.');
                } else {
                  console.log('[PWA] Contenido listo para uso sin conexión (Offline-Ready).');
                }
              }
            };
          };
        })
        .catch((error) => {
          console.error('[PWA] Error al registrar Service Worker:', error);
        });
    });
  }
}
