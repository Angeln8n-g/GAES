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
        // AbortError ocurre normalmente si el usuario recarga la página, cambia de pestaña
        // o navega rápidamente antes de que el navegador complete la inicialización del worker.
        if (error?.name === 'AbortError') {
          if (retryCount < maxRetries && !document.hidden) {
            retryCount++;
            setTimeout(performRegistration, 1500);
          } else {
            console.warn('[PWA] Registro de Service Worker cancelado por ciclo de vida de la página (AbortError).');
          }
          return;
        }

        // SecurityError en contextos con almacenamiento de terceros bloqueado o modo privado estricto
        if (error?.name === 'SecurityError') {
          console.warn('[PWA] Service Worker deshabilitado por directivas de privacidad del navegador.');
          return;
        }

        console.warn('[PWA] Aviso al inicializar Service Worker:', error?.message || error);
      });
  };

  // Registrar según el estado de carga del documento
  if (document.readyState === 'complete') {
    performRegistration();
  } else {
    window.addEventListener('load', performRegistration, { once: true });
  }
}

