/**
 * Service Worker Registration Handler for GAES / CapacitaHub PWA
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Omitir en entorno de pruebas unitarias
  if (import.meta.env.MODE === 'test') {
    return;
  }

  // Comprobar contexto seguro (HTTPS o localhost)
  const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
  );

  if (window.location.protocol !== 'https:' && !isLocalhost) {
    return;
  }

  let retryCount = 0;
  const maxRetries = 1;

  const performRegistration = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Escuchar actualizaciones disponibles
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker == null) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.info('[PWA] Nueva versión disponible en segundo plano. Se aplicará en la próxima visita.');
              } else {
                console.info('[PWA] Contenido listo para uso sin conexión (Offline-Ready).');
              }
            }
          };
        };
      })
      .catch((error: any) => {
        // AbortError y SecurityError son cancelaciones normales del ciclo de vida del navegador
        // (ej. recarga de pestaña, modo incógnito estricto o intervención de optimización de imágenes de Edge).
        // Se descartan silenciosamente para mantener la consola limpia.
        if (error?.name === 'AbortError' || error?.name === 'SecurityError') {
          return;
        }

        if (import.meta.env.DEV) {
          console.debug('[PWA] Aviso al inicializar Service Worker:', error?.message || error);
        }
      });
  };

  // Desacoplado de eventos de carga pesados; se ejecuta cuando el hilo principal esté ocioso
  const win = window as any;
  if (typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(performRegistration);
  } else if (document.readyState === 'complete') {
    setTimeout(performRegistration, 800);
  } else {
    win.addEventListener('DOMContentLoaded', () => setTimeout(performRegistration, 500), { once: true });
  }
}

