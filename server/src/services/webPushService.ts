import webpush from 'web-push';
import { pool } from '../db.js';

export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BMysBvWUJWPQbuK1RJw4jhPGGRB_Niat1cofI1mq2vk2CtG3YP1PtNp2DfLZ3OetdFn0i0Id2pdDTtVhxC6UbS0";
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "5plmdRWOveayIpiikYtVAhUbMxjmN16cMA9BNgpVpXI";
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:soporte.capacitacion@claro.com.do";

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('🔔 [WebPush] Configuración VAPID inicializada correctamente.');
} catch (err) {
  console.error('⚠️ [WebPush] Error al inicializar VAPID:', err);
}

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  meetingUrl?: string;
  eventId?: string;
  category?: string;
  actions?: Array<{ action: string; title: string }>;
}

export class WebPushService {
  /**
   * Obtiene la clave pública VAPID para que el navegador cree la suscripción Push
   */
  public static getPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  /**
   * Guarda o actualiza la suscripción Push de un usuario
   */
  public static async saveSubscription(
    userEmail: string,
    subscription: {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    },
    userAgent?: string
  ): Promise<boolean> {
    try {
      const email = userEmail.toLowerCase().trim();
      const { endpoint, keys } = subscription;

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        throw new Error('Datos de suscripción Push incompletos');
      }

      await pool.query(
        `INSERT INTO push_subscriptions (user_email, endpoint, p256dh, auth, user_agent, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (endpoint)
         DO UPDATE SET
           user_email = EXCLUDED.user_email,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth,
           user_agent = EXCLUDED.user_agent,
           updated_at = CURRENT_TIMESTAMP`,
        [email, endpoint, keys.p256dh, keys.auth, userAgent || null]
      );

      return true;
    } catch (err) {
      console.error('Error al guardar suscripción push:', err);
      return false;
    }
  }

  /**
   * Elimina una suscripción Push (cuando el usuario la desactiva o el navegador la revoca)
   */
  public static async removeSubscription(endpoint: string): Promise<boolean> {
    try {
      await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
      return true;
    } catch (err) {
      console.error('Error al eliminar suscripción push:', err);
      return false;
    }
  }

  /**
   * Envía una notificación Web Push a todos los dispositivos registrados de un usuario
   */
  public static async sendPushToUser(userEmail: string, payload: WebPushPayload): Promise<number> {
    try {
      const email = userEmail.toLowerCase().trim();
      const res = await pool.query(
        `SELECT endpoint, p256dh, auth
         FROM push_subscriptions
         WHERE LOWER(user_email) = $1`,
        [email]
      );

      if (res.rows.length === 0) {
        return 0;
      }

      const formattedPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/icon-192x192.png',
        url: payload.url || '/my-registrations',
        meetingUrl: payload.meetingUrl || null,
        eventId: payload.eventId || null,
        category: payload.category || 'evento',
        actions: payload.actions || [
          ...(payload.meetingUrl ? [{ action: 'open_meeting', title: 'Entrar a Sala Virtual' }] : []),
          { action: 'open_app', title: 'Ver en GAES' }
        ]
      });

      let sentCount = 0;
      const expiredEndpoints: string[] = [];

      await Promise.allSettled(
        res.rows.map(async (row) => {
          const pushSubscription = {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth
            }
          };

          try {
            await webpush.sendNotification(pushSubscription, formattedPayload, {
              TTL: 60 * 60 * 2, // 2 horas de vida útil
              urgency: 'high'
            });
            sentCount++;
          } catch (err: any) {
            // Códigos 404 y 410 indican suscripción expirada o revocada por el cliente
            if (err?.statusCode === 404 || err?.statusCode === 410) {
              expiredEndpoints.push(row.endpoint);
            } else {
              console.warn(`[WebPush] Fallo de envío a ${row.endpoint.substring(0, 40)}...:`, err?.message || err);
            }
          }
        })
      );

      // Limpieza atómica de suscripciones vencidas
      if (expiredEndpoints.length > 0) {
        await pool.query(
          `DELETE FROM push_subscriptions WHERE endpoint = ANY($1::text[])`,
          [expiredEndpoints]
        );
      }

      return sentCount;
    } catch (err) {
      console.error(`Error al enviar Push a ${userEmail}:`, err);
      return 0;
    }
  }

  /**
   * Envía notificación Push masiva a una lista de correos
   */
  public static async sendPushToMultiple(emails: string[], payload: WebPushPayload): Promise<number> {
    let totalSent = 0;
    const uniqueEmails = Array.from(new Set(emails.map(e => e.toLowerCase().trim())));

    for (const email of uniqueEmails) {
      const count = await this.sendPushToUser(email, payload);
      totalSent += count;
    }

    return totalSent;
  }
}
