"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebPushService = exports.VAPID_SUBJECT = exports.VAPID_PRIVATE_KEY = exports.VAPID_PUBLIC_KEY = void 0;
const web_push_1 = __importDefault(require("web-push"));
const db_js_1 = require("../db.js");
exports.VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BMysBvWUJWPQbuK1RJw4jhPGGRB_Niat1cofI1mq2vk2CtG3YP1PtNp2DfLZ3OetdFn0i0Id2pdDTtVhxC6UbS0";
exports.VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "5plmdRWOveayIpiikYtVAhUbMxjmN16cMA9BNgpVpXI";
exports.VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:soporte.capacitacion@claro.com.do";
try {
    web_push_1.default.setVapidDetails(exports.VAPID_SUBJECT, exports.VAPID_PUBLIC_KEY, exports.VAPID_PRIVATE_KEY);
    console.log('🔔 [WebPush] Configuración VAPID inicializada correctamente.');
}
catch (err) {
    console.error('⚠️ [WebPush] Error al inicializar VAPID:', err);
}
class WebPushService {
    /**
     * Obtiene la clave pública VAPID para que el navegador cree la suscripción Push
     */
    static getPublicKey() {
        return exports.VAPID_PUBLIC_KEY;
    }
    /**
     * Guarda o actualiza la suscripción Push de un usuario
     */
    static async saveSubscription(userEmail, subscription, userAgent) {
        try {
            const email = userEmail.toLowerCase().trim();
            const { endpoint, keys } = subscription;
            if (!endpoint || !keys?.p256dh || !keys?.auth) {
                throw new Error('Datos de suscripción Push incompletos');
            }
            await db_js_1.pool.query(`INSERT INTO push_subscriptions (user_email, endpoint, p256dh, auth, user_agent, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (endpoint)
         DO UPDATE SET
           user_email = EXCLUDED.user_email,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth,
           user_agent = EXCLUDED.user_agent,
           updated_at = CURRENT_TIMESTAMP`, [email, endpoint, keys.p256dh, keys.auth, userAgent || null]);
            return true;
        }
        catch (err) {
            console.error('Error al guardar suscripción push:', err);
            return false;
        }
    }
    /**
     * Elimina una suscripción Push (cuando el usuario la desactiva o el navegador la revoca)
     */
    static async removeSubscription(endpoint) {
        try {
            await db_js_1.pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
            return true;
        }
        catch (err) {
            console.error('Error al eliminar suscripción push:', err);
            return false;
        }
    }
    /**
     * Envía una notificación Web Push a todos los dispositivos registrados de un usuario
     */
    static async sendPushToUser(userEmail, payload) {
        try {
            const email = userEmail.toLowerCase().trim();
            const res = await db_js_1.pool.query(`SELECT endpoint, p256dh, auth
         FROM push_subscriptions
         WHERE LOWER(user_email) = $1`, [email]);
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
            const expiredEndpoints = [];
            await Promise.allSettled(res.rows.map(async (row) => {
                const pushSubscription = {
                    endpoint: row.endpoint,
                    keys: {
                        p256dh: row.p256dh,
                        auth: row.auth
                    }
                };
                try {
                    await web_push_1.default.sendNotification(pushSubscription, formattedPayload, {
                        TTL: 60 * 60 * 2, // 2 horas de vida útil
                        urgency: 'high'
                    });
                    sentCount++;
                }
                catch (err) {
                    // Códigos 404 y 410 indican suscripción expirada o revocada por el cliente
                    if (err?.statusCode === 404 || err?.statusCode === 410) {
                        expiredEndpoints.push(row.endpoint);
                    }
                    else {
                        console.warn(`[WebPush] Fallo de envío a ${row.endpoint.substring(0, 40)}...:`, err?.message || err);
                    }
                }
            }));
            // Limpieza atómica de suscripciones vencidas
            if (expiredEndpoints.length > 0) {
                await db_js_1.pool.query(`DELETE FROM push_subscriptions WHERE endpoint = ANY($1::text[])`, [expiredEndpoints]);
            }
            return sentCount;
        }
        catch (err) {
            console.error(`Error al enviar Push a ${userEmail}:`, err);
            return 0;
        }
    }
    /**
     * Envía notificación Push masiva a una lista de correos
     */
    static async sendPushToMultiple(emails, payload) {
        let totalSent = 0;
        const uniqueEmails = Array.from(new Set(emails.map(e => e.toLowerCase().trim())));
        for (const email of uniqueEmails) {
            const count = await this.sendPushToUser(email, payload);
            totalSent += count;
        }
        return totalSent;
    }
}
exports.WebPushService = WebPushService;
