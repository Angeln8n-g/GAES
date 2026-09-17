import type { Html5Qrcode } from 'html5-qrcode';

let cachedHtml5Qrcode: typeof Html5Qrcode | null = null;

/**
 * Carga dinámica y perezosa del módulo html5-qrcode.
 * Evita bloquear el bundle inicial y aísla fallos de red o de inicialización.
 */
export const loadHtml5Qrcode = async (): Promise<typeof Html5Qrcode> => {
  if (cachedHtml5Qrcode) {
    return cachedHtml5Qrcode;
  }

  try {
    const module = await import('html5-qrcode');
    if (!module || !module.Html5Qrcode) {
      throw new Error('El módulo html5-qrcode no expone la clase Html5Qrcode requerida.');
    }
    cachedHtml5Qrcode = module.Html5Qrcode;
    return cachedHtml5Qrcode;
  } catch (error: any) {
    console.error('Error al importar dinámicamente html5-qrcode:', error);
    throw new Error(
      'No se pudo cargar el motor del escáner. Por favor verifica tu conexión o utiliza el ingreso manual de PIN / datos.'
    );
  }
};

export interface CameraSupportStatus {
  supported: boolean;
  reason?: string;
  isSecureContext: boolean;
  hasMediaDevices: boolean;
}

/**
 * Evalúa si el entorno actual soporta acceso a la cámara web.
 * Valida Secure Context (HTTPS o localhost) y presencia de navigator.mediaDevices.
 */
export const checkCameraSupport = (): CameraSupportStatus => {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      reason: 'Entorno no disponible en el servidor.',
      isSecureContext: false,
      hasMediaDevices: false
    };
  }

  const isSecure = Boolean(window.isSecureContext);
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const hasMediaDevices = Boolean(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );

  if (!isSecure && !isLocal) {
    return {
      supported: false,
      reason: 'El acceso a la cámara requiere una conexión segura HTTPS. Por favor utiliza el ingreso manual de PIN o abre el sitio vía HTTPS.',
      isSecureContext: false,
      hasMediaDevices
    };
  }

  if (!hasMediaDevices) {
    return {
      supported: false,
      reason: 'Tu navegador o dispositivo no cuenta con interfaz de captura de video / cámara web.',
      isSecureContext: isSecure,
      hasMediaDevices: false
    };
  }

  return {
    supported: true,
    isSecureContext: isSecure,
    hasMediaDevices: true
  };
};

/**
 * Traduce y clasifica excepciones de la cámara y del escáner
 * a explicaciones amigables y accionables para el usuario.
 */
export const formatCameraError = (error: any): string => {
  if (!error) return 'Error desconocido al acceder a la cámara.';

  const errString = String(error?.message || error?.name || error || '').toLowerCase();
  const errorName = String(error?.name || '');

  // 1. Permisos denegados
  if (
    errorName === 'NotAllowedError' ||
    errorName === 'PermissionDeniedError' ||
    errorName === 'SecurityError' ||
    errString.includes('permission denied') ||
    errString.includes('notallowederror') ||
    errString.includes('denied')
  ) {
    return 'Permiso de cámara denegado. Permite el acceso a la cámara en los ajustes del navegador o ingresa el código manualmente.';
  }

  // 2. Dispositivo no encontrado
  if (
    errorName === 'NotFoundError' ||
    errorName === 'DevicesNotFoundError' ||
    errString.includes('notfounderror') ||
    errString.includes('devicesnotfounderror') ||
    errString.includes('no camera') ||
    errString.includes('no device')
  ) {
    return 'No se detectó ninguna cámara disponible en tu dispositivo. Puedes subir una foto o ingresar el PIN manualmente.';
  }

  // 3. Cámara en uso por otra app o problema de hardware
  if (
    errorName === 'NotReadableError' ||
    errorName === 'TrackStartError' ||
    errString.includes('notreadableerror') ||
    errString.includes('trackstarterror') ||
    errString.includes('already in use') ||
    errString.includes('in use')
  ) {
    return 'La cámara está siendo utilizada por otra aplicación (ej: Zoom, Meet, Teams) o está bloqueada por el sistema operativo.';
  }

  // 4. Restricciones no soportadas
  if (
    errorName === 'OverconstrainedError' ||
    errorName === 'ConstraintNotSatisfiedError' ||
    errString.includes('overconstrained')
  ) {
    return 'La resolución o cámara solicitada no es compatible con tu dispositivo.';
  }

  // 5. Abortado / cancelación
  if (
    errorName === 'AbortError' ||
    errString.includes('aborterror')
  ) {
    return 'El inicio de la cámara fue cancelado o interrumpido.';
  }

  // 6. Contexto no seguro
  if (
    errString.includes('secure context') ||
    errString.includes('https')
  ) {
    return 'El acceso a la cámara requiere una conexión HTTPS segura. Por favor utiliza el ingreso manual de PIN.';
  }

  // 7. Error al descargar bundle / script
  if (
    errString.includes('failed to fetch') ||
    errString.includes('dynamically imported') ||
    errString.includes('html5-qrcode')
  ) {
    return 'No se pudo cargar el módulo del escáner. Verifica tu conexión o ingresa el PIN manualmente.';
  }

  // 8. Mensaje personalizado legible
  if (typeof error?.message === 'string' && error.message.length > 0 && error.message.length < 150) {
    return `No se pudo iniciar la cámara: ${error.message}`;
  }

  return 'No se pudo acceder a la cámara. Revisa los permisos de tu navegador o ingresa el código manualmente.';
};
