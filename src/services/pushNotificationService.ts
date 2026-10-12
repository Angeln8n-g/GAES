import { apiService } from './api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export class PushNotificationService {
  /**
   * Comprueba si el navegador actual soporta Web Push y Service Workers
   */
  public static isPushSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /**
   * Obtiene el estado actual de los permisos del navegador ('granted' | 'denied' | 'default')
   */
  public static getPermissionState(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Obtiene la suscripción Push existente si existe
   */
  public static async getExistingSubscription(): Promise<PushSubscription | null> {
    if (!this.isPushSupported()) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    } catch (err) {
      console.warn('Error al obtener suscripción Push existente:', err);
      return null;
    }
  }

  /**
   * Solicita permisos de notificación al usuario y suscribe el dispositivo al servidor VAPID
   */
  public static async subscribeUserToPush(): Promise<{ success: boolean; message: string }> {
    if (!this.isPushSupported()) {
      return { 
        success: false, 
        message: 'Tu navegador no soporta notificaciones Push del sistema.' 
      };
    }

    try {
      // 1. Solicitar permisos de notificación
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { 
          success: false, 
          message: 'Permiso de notificaciones denegado en el navegador.' 
        };
      }

      // 2. Obtener clave pública VAPID del backend
      const vapidRes = await apiService.getVapidPublicKey();
      if (!vapidRes?.publicKey) {
        throw new Error('No se pudo obtener la clave VAPID pública del servidor.');
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidRes.publicKey);

      // 3. Obtener Service Worker activo
      const registration = await navigator.serviceWorker.ready;

      // 4. Suscribir a través del PushManager del navegador
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as unknown as BufferSource
        });
      }

      // 5. Enviar la suscripción al servidor GAES
      const subJson = subscription.toJSON();
      await apiService.subscribePush({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh || '',
          auth: subJson.keys?.auth || ''
        }
      });

      return { 
        success: true, 
        message: '¡Notificaciones Push activadas! Recibirás avisos en tu dispositivo cuando comiencen tus entrenamientos.' 
      };
    } catch (err: any) {
      console.error('Error al suscribir usuario a notificaciones Push:', err);
      return { 
        success: false, 
        message: `Fallo al activar notificaciones Push: ${err.message || 'Error desconocido'}` 
      };
    }
  }

  /**
   * Desactiva y elimina la suscripción Push
   */
  public static async unsubscribeUserFromPush(): Promise<boolean> {
    if (!this.isPushSupported()) return true;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await apiService.unsubscribePush(subscription.endpoint);
        await subscription.unsubscribe();
      }

      return true;
    } catch (err) {
      console.error('Error al desuscribir notificaciones Push:', err);
      return false;
    }
  }

  /**
   * Envía una notificación Push de prueba al usuario actual
   */
  public static async sendTestPush(): Promise<{ success: boolean; message: string }> {
    try {
      return await apiService.sendTestPush();
    } catch (err: any) {
      return { 
        success: false, 
        message: err.message || 'Error al emitir prueba Push' 
      };
    }
  }
}
