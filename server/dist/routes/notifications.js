"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRouter = void 0;
const express_1 = require("express");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middlewares/auth.js");
const webPushService_js_1 = require("../services/webPushService.js");
const notificationService_js_1 = require("../services/notificationService.js");
const trainingReminderScheduler_js_1 = require("../services/trainingReminderScheduler.js");
exports.notificationsRouter = (0, express_1.Router)();
// ==========================================
// 1. ENDPOINTS DE CONSULTA Y GESTIÓN DE NOTIFICACIONES
// ==========================================
/**
 * GET /api/notifications
 * Lista las notificaciones dirigidas al usuario autenticado (o a su rol/empresa)
 */
exports.notificationsRouter.get('/', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'No autorizado' });
        }
        const email = user.email ? user.email.toLowerCase().trim() : '';
        const role = user.role || '';
        const companyId = user.companyId || '';
        const unreadOnly = req.query.unreadOnly === 'true';
        const category = req.query.category ? String(req.query.category) : null;
        const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 100);
        const offset = parseInt(String(req.query.offset || '0'), 10);
        const query = `
      SELECT id, recipient_email, recipient_role, recipient_company_id,
             title, message, category, priority, action_url, action_label,
             metadata, is_read, read_at, created_at
      FROM notifications
      WHERE (
        (recipient_email IS NOT NULL AND LOWER(recipient_email) = $1)
        OR (recipient_role IS NOT NULL AND recipient_role = $2)
        OR (recipient_company_id IS NOT NULL AND recipient_company_id = $3)
        OR (recipient_email IS NULL AND recipient_role IS NULL AND recipient_company_id IS NULL)
      )
      AND ($4::boolean = false OR is_read = false)
      AND ($5::text IS NULL OR category = $5)
      ORDER BY created_at DESC
      LIMIT $6 OFFSET $7
    `;
        const result = await db_js_1.pool.query(query, [
            email,
            role,
            companyId,
            unreadOnly,
            category,
            limit,
            offset
        ]);
        // Conteo total de no leídas para conveniencia del frontend
        const unreadCountRes = await db_js_1.pool.query(`
      SELECT COUNT(*)::int as unread_count
      FROM notifications
      WHERE (
        (recipient_email IS NOT NULL AND LOWER(recipient_email) = $1)
        OR (recipient_role IS NOT NULL AND recipient_role = $2)
        OR (recipient_company_id IS NOT NULL AND recipient_company_id = $3)
        OR (recipient_email IS NULL AND recipient_role IS NULL AND recipient_company_id IS NULL)
      )
      AND is_read = false
    `, [email, role, companyId]);
        res.json({
            notifications: result.rows,
            unreadCount: unreadCountRes.rows[0]?.unread_count || 0
        });
    }
    catch (err) {
        console.error('Error al listar notificaciones:', err);
        res.status(500).json({ error: 'Error al obtener notificaciones', details: err.message });
    }
});
/**
 * GET /api/notifications/unread-count
 * Retorna rápidamente solo el número de notificaciones no leídas para polling / badge
 */
exports.notificationsRouter.get('/unread-count', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'No autorizado' });
        const email = user.email ? user.email.toLowerCase().trim() : '';
        const role = user.role || '';
        const companyId = user.companyId || '';
        const countRes = await db_js_1.pool.query(`
      SELECT COUNT(*)::int as count
      FROM notifications
      WHERE (
        (recipient_email IS NOT NULL AND LOWER(recipient_email) = $1)
        OR (recipient_role IS NOT NULL AND recipient_role = $2)
        OR (recipient_company_id IS NOT NULL AND recipient_company_id = $3)
        OR (recipient_email IS NULL AND recipient_role IS NULL AND recipient_company_id IS NULL)
      )
      AND is_read = false
    `, [email, role, companyId]);
        res.json({ unreadCount: countRes.rows[0]?.count || 0 });
    }
    catch (err) {
        console.error('Error al obtener conteo de no leídas:', err);
        res.status(500).json({ error: 'Error al obtener conteo', details: err.message });
    }
});
/**
 * PATCH /api/notifications/:id/read
 * Marca una notificación como leída
 */
exports.notificationsRouter.patch('/:id/read', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updateRes = await db_js_1.pool.query(`
      UPDATE notifications
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);
        if (updateRes.rows.length === 0) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }
        res.json({ success: true, notification: updateRes.rows[0] });
    }
    catch (err) {
        console.error('Error al marcar notificación como leída:', err);
        res.status(500).json({ error: 'Error al actualizar notificación', details: err.message });
    }
});
/**
 * PATCH /api/notifications/read-all
 * Marca todas las notificaciones pendientes del usuario como leídas
 */
exports.notificationsRouter.patch('/read-all', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'No autorizado' });
        const email = user.email ? user.email.toLowerCase().trim() : '';
        const role = user.role || '';
        const companyId = user.companyId || '';
        const updateRes = await db_js_1.pool.query(`
      UPDATE notifications
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE (
        (recipient_email IS NOT NULL AND LOWER(recipient_email) = $1)
        OR (recipient_role IS NOT NULL AND recipient_role = $2)
        OR (recipient_company_id IS NOT NULL AND recipient_company_id = $3)
        OR (recipient_email IS NULL AND recipient_role IS NULL AND recipient_company_id IS NULL)
      )
      AND is_read = false
      RETURNING id
    `, [email, role, companyId]);
        res.json({ success: true, updatedCount: updateRes.rows.length });
    }
    catch (err) {
        console.error('Error al marcar todas las notificaciones como leídas:', err);
        res.status(500).json({ error: 'Error al marcar todas leídas', details: err.message });
    }
});
/**
 * DELETE /api/notifications/:id
 * Elimina una notificación individual
 */
exports.notificationsRouter.delete('/:id', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await db_js_1.pool.query('DELETE FROM notifications WHERE id = $1', [id]);
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error al eliminar notificación:', err);
        res.status(500).json({ error: 'Error al eliminar', details: err.message });
    }
});
// ==========================================
// 2. ENDPOINTS DE NOTIFICACIONES PUSH (WEB PUSH API / VAPID)
// ==========================================
/**
 * GET /api/notifications/push/vapid-public-key
 * Entrega la clave pública VAPID para suscribir el navegador a notificaciones Push
 */
exports.notificationsRouter.get('/push/vapid-public-key', (req, res) => {
    res.json({ publicKey: webPushService_js_1.WebPushService.getPublicKey() });
});
/**
 * POST /api/notifications/push/subscribe
 * Registra la suscripción Web Push del usuario
 */
exports.notificationsRouter.post('/push/subscribe', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'No autorizado' });
        const { subscription } = req.body;
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Faltan datos de suscripción Push.' });
        }
        const userAgent = req.headers['user-agent'] || '';
        const success = await webPushService_js_1.WebPushService.saveSubscription(user.email, subscription, userAgent);
        if (success) {
            res.json({ success: true, message: 'Suscripción Push registrada exitosamente.' });
        }
        else {
            res.status(500).json({ error: 'No fue posible registrar la suscripción Push.' });
        }
    }
    catch (err) {
        console.error('Error al suscribir Web Push:', err);
        res.status(500).json({ error: 'Error en suscripción Push', details: err.message });
    }
});
/**
 * POST /api/notifications/push/unsubscribe
 * Elimina la suscripción Push del navegador
 */
exports.notificationsRouter.post('/push/unsubscribe', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (endpoint) {
            await webPushService_js_1.WebPushService.removeSubscription(endpoint);
        }
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error al desuscribir Push:', err);
        res.status(500).json({ error: 'Error al desuscribir', details: err.message });
    }
});
/**
 * POST /api/notifications/push/test
 * Envía una notificación Push de prueba al usuario actual para verificar que su dispositivo responde
 */
exports.notificationsRouter.post('/push/test', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'No autorizado' });
        const sentCount = await webPushService_js_1.WebPushService.sendPushToUser(user.email, {
            title: '🔔 Alerta de Prueba - Claro GAES',
            body: '¡Tus notificaciones Push están activas! Recibirás avisos cuando comiencen tus entrenamientos.',
            url: '/my-registrations',
            category: 'sistema'
        });
        // También crearla in-app
        await notificationService_js_1.NotificationService.notifyUser(user.email, {
            title: 'Notificaciones Push Verificadas',
            message: 'El canal de avisos nativos del dispositivo ha sido verificado con éxito.',
            category: 'sistema',
            priority: 'normal',
            sendPush: false
        });
        res.json({
            success: true,
            sentDevices: sentCount,
            message: sentCount > 0
                ? `Notificación enviada a ${sentCount} dispositivo(s).`
                : 'Suscripción registrada. Si no ves la alerta emergente, comprueba los permisos de notificaciones de tu navegador.'
        });
    }
    catch (err) {
        console.error('Error al enviar Push de prueba:', err);
        res.status(500).json({ error: 'Error al enviar prueba Push', details: err.message });
    }
});
/**
 * POST /api/notifications/push/trigger-training-alert
 * Disparo manual inmediato de alerta de inicio de clase para facilitadores y administradores
 */
exports.notificationsRouter.post('/push/trigger-training-alert', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'No autorizado' });
        const { sessionId, sessionTitle, sessionTime, locationOrModality, meetingUrl, recipientEmails } = req.body;
        if (!sessionId || !sessionTitle || !Array.isArray(recipientEmails)) {
            return res.status(400).json({ error: 'Parámetros requeridos faltantes para alerta de inicio de clase.' });
        }
        const notifiedCount = await trainingReminderScheduler_js_1.TrainingReminderScheduler.triggerManualClassCall({
            sessionId,
            sessionTitle,
            sessionTime,
            locationOrModality,
            meetingUrl,
            recipientEmails,
            senderName: user.name || 'El Facilitador'
        });
        res.json({
            success: true,
            notifiedCount,
            message: `Alerta de inicio emitida exitosamente a ${notifiedCount} participante(s).`
        });
    }
    catch (err) {
        console.error('Error al emitir alerta manual de clase:', err);
        res.status(500).json({ error: 'Error al emitir alerta de clase', details: err.message });
    }
});
// ==========================================
// 3. PREFERENCIAS DE NOTIFICACIÓN & BROADCAST MASIVO
// ==========================================
/**
 * GET /api/notifications/preferences
 * Obtiene las preferencias de notificación del usuario
 */
exports.notificationsRouter.get('/preferences', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'No autorizado' });
        const resDb = await db_js_1.pool.query(`SELECT * FROM user_notification_preferences WHERE LOWER(user_email) = $1`, [user.email.toLowerCase().trim()]);
        if (resDb.rows.length === 0) {
            return res.json({
                inAppEnabled: true,
                pushEnabled: true,
                emailEnabled: true,
                trainingStartAlerts: true,
                trainingAdvanceNoticeMinutes: 15,
                categories: {
                    evento: true,
                    convocatoria: true,
                    cohorte: true,
                    certificado: true,
                    cumplimiento: true,
                    sistema: true
                }
            });
        }
        const r = resDb.rows[0];
        res.json({
            inAppEnabled: r.in_app_enabled,
            pushEnabled: r.push_enabled,
            emailEnabled: r.email_enabled,
            trainingStartAlerts: r.training_start_alerts,
            trainingAdvanceNoticeMinutes: r.training_advance_notice_minutes,
            categories: r.categories || {}
        });
    }
    catch (err) {
        console.error('Error al consultar preferencias de notificación:', err);
        res.status(500).json({ error: 'Error al consultar preferencias', details: err.message });
    }
});
/**
 * PUT /api/notifications/preferences
 * Guarda las preferencias de notificación del usuario
 */
exports.notificationsRouter.put('/preferences', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'No autorizado' });
        const { inAppEnabled = true, pushEnabled = true, emailEnabled = true, trainingStartAlerts = true, trainingAdvanceNoticeMinutes = 15, categories = {} } = req.body;
        await db_js_1.pool.query(`INSERT INTO user_notification_preferences (
        user_email, in_app_enabled, push_enabled, email_enabled,
        training_start_alerts, training_advance_notice_minutes, categories, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (user_email)
      DO UPDATE SET
        in_app_enabled = EXCLUDED.in_app_enabled,
        push_enabled = EXCLUDED.push_enabled,
        email_enabled = EXCLUDED.email_enabled,
        training_start_alerts = EXCLUDED.training_start_alerts,
        training_advance_notice_minutes = EXCLUDED.training_advance_notice_minutes,
        categories = EXCLUDED.categories,
        updated_at = CURRENT_TIMESTAMP`, [
            user.email.toLowerCase().trim(),
            inAppEnabled,
            pushEnabled,
            emailEnabled,
            trainingStartAlerts,
            trainingAdvanceNoticeMinutes,
            JSON.stringify(categories)
        ]);
        res.json({ success: true, message: 'Preferencias actualizadas con éxito.' });
    }
    catch (err) {
        console.error('Error al guardar preferencias de notificación:', err);
        res.status(500).json({ error: 'Error al guardar preferencias', details: err.message });
    }
});
/**
 * POST /api/notifications/broadcast
 * Emisión masiva de comunicados (Solo Super Administrador)
 */
exports.notificationsRouter.post('/broadcast', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if (user?.role !== 'Super Administrador') {
            return res.status(403).json({ error: 'Solo el Super Administrador puede emitir comunicados masivos.' });
        }
        const { title, message, category = 'sistema', priority = 'normal', targetRole, targetCompanyId, actionUrl, actionLabel } = req.body;
        if (!title || !message) {
            return res.status(400).json({ error: 'Título y mensaje son obligatorios.' });
        }
        if (targetRole) {
            await notificationService_js_1.NotificationService.notifyRole(targetRole, {
                title,
                message,
                category,
                priority,
                actionUrl,
                actionLabel
            });
        }
        else if (targetCompanyId) {
            await notificationService_js_1.NotificationService.notifyCompany(targetCompanyId, {
                title,
                message,
                category,
                priority,
                actionUrl,
                actionLabel
            });
        }
        else {
            await notificationService_js_1.NotificationService.broadcast({
                title,
                message,
                category,
                priority,
                actionUrl,
                actionLabel
            });
        }
        res.json({ success: true, message: 'Comunicado masivo emitido con éxito.' });
    }
    catch (err) {
        console.error('Error al emitir broadcast:', err);
        res.status(500).json({ error: 'Error al emitir comunicado', details: err.message });
    }
});
// ==========================================
// 4. LOG HISTÓRICO DE AUDITORÍA (Compatibilidad)
// ==========================================
exports.notificationsRouter.post('/log', async (req, res) => {
    try {
        const { eventId, channel, status, recipients } = req.body;
        if (!eventId || !channel || recipients === undefined) {
            return res.status(400).json({ error: 'Faltan parámetros requeridos para el log de notificación.' });
        }
        await db_js_1.pool.query(`INSERT INTO notification_logs (event_id, channel, status, recipients)
       VALUES ($1, $2, $3, $4)`, [eventId, channel, status || 'Enviado', recipients]);
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error al registrar log de notificación:', err);
        res.status(500).json({ error: 'Error al registrar log', details: err.message });
    }
});
