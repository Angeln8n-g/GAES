import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middlewares/auth.js';
import { WebPushService } from '../services/webPushService.js';
import { NotificationService } from '../services/notificationService.js';
import { TrainingReminderScheduler } from '../services/trainingReminderScheduler.js';

export const notificationsRouter = Router();

// ==========================================
// 1. ENDPOINTS DE CONSULTA Y GESTIÓN DE NOTIFICACIONES
// ==========================================

/**
 * GET /api/notifications
 * Lista las notificaciones dirigidas al usuario autenticado (o a su rol/empresa)
 */
notificationsRouter.get('/', authenticateToken, async (req: Request, res: Response) => {
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

    const result = await pool.query(query, [
      email,
      role,
      companyId,
      unreadOnly,
      category,
      limit,
      offset
    ]);

    // Conteo total de no leídas para conveniencia del frontend
    const unreadCountRes = await pool.query(`
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
  } catch (err: any) {
    console.error('Error al listar notificaciones:', err);
    res.status(500).json({ error: 'Error al obtener notificaciones', details: err.message });
  }
});

/**
 * GET /api/notifications/unread-count
 * Retorna rápidamente solo el número de notificaciones no leídas para polling / badge
 */
notificationsRouter.get('/unread-count', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    const email = user.email ? user.email.toLowerCase().trim() : '';
    const role = user.role || '';
    const companyId = user.companyId || '';

    const countRes = await pool.query(`
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
  } catch (err: any) {
    console.error('Error al obtener conteo de no leídas:', err);
    res.status(500).json({ error: 'Error al obtener conteo', details: err.message });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Marca una notificación como leída
 */
notificationsRouter.patch('/:id/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateRes = await pool.query(`
      UPDATE notifications
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    res.json({ success: true, notification: updateRes.rows[0] });
  } catch (err: any) {
    console.error('Error al marcar notificación como leída:', err);
    res.status(500).json({ error: 'Error al actualizar notificación', details: err.message });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Marca todas las notificaciones pendientes del usuario como leídas
 */
notificationsRouter.patch('/read-all', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    const email = user.email ? user.email.toLowerCase().trim() : '';
    const role = user.role || '';
    const companyId = user.companyId || '';

    const updateRes = await pool.query(`
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
  } catch (err: any) {
    console.error('Error al marcar todas las notificaciones como leídas:', err);
    res.status(500).json({ error: 'Error al marcar todas leídas', details: err.message });
  }
});

/**
 * DELETE /api/notifications/:id
 * Elimina una notificación individual
 */
notificationsRouter.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
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
notificationsRouter.get('/push/vapid-public-key', (req: Request, res: Response) => {
  res.json({ publicKey: WebPushService.getPublicKey() });
});

/**
 * POST /api/notifications/push/subscribe
 * Registra la suscripción Web Push del usuario
 */
notificationsRouter.post('/push/subscribe', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Faltan datos de suscripción Push.' });
    }

    const userAgent = req.headers['user-agent'] || '';
    const success = await WebPushService.saveSubscription(user.email, subscription, userAgent);

    if (success) {
      res.json({ success: true, message: 'Suscripción Push registrada exitosamente.' });
    } else {
      res.status(500).json({ error: 'No fue posible registrar la suscripción Push.' });
    }
  } catch (err: any) {
    console.error('Error al suscribir Web Push:', err);
    res.status(500).json({ error: 'Error en suscripción Push', details: err.message });
  }
});

/**
 * POST /api/notifications/push/unsubscribe
 * Elimina la suscripción Push del navegador
 */
notificationsRouter.post('/push/unsubscribe', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await WebPushService.removeSubscription(endpoint);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error al desuscribir Push:', err);
    res.status(500).json({ error: 'Error al desuscribir', details: err.message });
  }
});

/**
 * POST /api/notifications/push/test
 * Envía una notificación Push de prueba al usuario actual para verificar que su dispositivo responde
 */
notificationsRouter.post('/push/test', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    const sentCount = await WebPushService.sendPushToUser(user.email, {
      title: '🔔 Alerta de Prueba - Claro GAES',
      body: '¡Tus notificaciones Push están activas! Recibirás avisos cuando comiencen tus entrenamientos.',
      url: '/my-registrations',
      category: 'sistema'
    });

    // También crearla in-app
    await NotificationService.notifyUser(user.email, {
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
  } catch (err: any) {
    console.error('Error al enviar Push de prueba:', err);
    res.status(500).json({ error: 'Error al enviar prueba Push', details: err.message });
  }
});

/**
 * POST /api/notifications/push/trigger-training-alert
 * Disparo manual inmediato de alerta de inicio de clase para facilitadores y administradores
 */
notificationsRouter.post('/push/trigger-training-alert', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    const { sessionId, sessionTitle, sessionTime, locationOrModality, meetingUrl, recipientEmails } = req.body;

    if (!sessionId || !sessionTitle || !Array.isArray(recipientEmails)) {
      return res.status(400).json({ error: 'Parámetros requeridos faltantes para alerta de inicio de clase.' });
    }

    const notifiedCount = await TrainingReminderScheduler.triggerManualClassCall({
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
  } catch (err: any) {
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
notificationsRouter.get('/preferences', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    const resDb = await pool.query(
      `SELECT * FROM user_notification_preferences WHERE LOWER(user_email) = $1`,
      [user.email.toLowerCase().trim()]
    );

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
  } catch (err: any) {
    console.error('Error al consultar preferencias de notificación:', err);
    res.status(500).json({ error: 'Error al consultar preferencias', details: err.message });
  }
});

/**
 * PUT /api/notifications/preferences
 * Guarda las preferencias de notificación del usuario
 */
notificationsRouter.put('/preferences', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    const {
      inAppEnabled = true,
      pushEnabled = true,
      emailEnabled = true,
      trainingStartAlerts = true,
      trainingAdvanceNoticeMinutes = 15,
      categories = {}
    } = req.body;

    await pool.query(
      `INSERT INTO user_notification_preferences (
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
        updated_at = CURRENT_TIMESTAMP`,
      [
        user.email.toLowerCase().trim(),
        inAppEnabled,
        pushEnabled,
        emailEnabled,
        trainingStartAlerts,
        trainingAdvanceNoticeMinutes,
        JSON.stringify(categories)
      ]
    );

    res.json({ success: true, message: 'Preferencias actualizadas con éxito.' });
  } catch (err: any) {
    console.error('Error al guardar preferencias de notificación:', err);
    res.status(500).json({ error: 'Error al guardar preferencias', details: err.message });
  }
});

/**
 * POST /api/notifications/broadcast
 * Emisión masiva de comunicados (Solo Super Administrador)
 */
notificationsRouter.post('/broadcast', authenticateToken, async (req: Request, res: Response) => {
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
      await NotificationService.notifyRole(targetRole, {
        title,
        message,
        category,
        priority,
        actionUrl,
        actionLabel
      });
    } else if (targetCompanyId) {
      await NotificationService.notifyCompany(targetCompanyId, {
        title,
        message,
        category,
        priority,
        actionUrl,
        actionLabel
      });
    } else {
      await NotificationService.broadcast({
        title,
        message,
        category,
        priority,
        actionUrl,
        actionLabel
      });
    }

    res.json({ success: true, message: 'Comunicado masivo emitido con éxito.' });
  } catch (err: any) {
    console.error('Error al emitir broadcast:', err);
    res.status(500).json({ error: 'Error al emitir comunicado', details: err.message });
  }
});

// ==========================================
// 4. LOG HISTÓRICO DE AUDITORÍA (Compatibilidad)
// ==========================================
notificationsRouter.post('/log', async (req: Request, res: Response) => {
  try {
    const { eventId, channel, status, recipients } = req.body;
    if (!eventId || !channel || recipients === undefined) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos para el log de notificación.' });
    }

    await pool.query(
      `INSERT INTO notification_logs (event_id, channel, status, recipients)
       VALUES ($1, $2, $3, $4)`,
      [eventId, channel, status || 'Enviado', recipients]
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error al registrar log de notificación:', err);
    res.status(500).json({ error: 'Error al registrar log', details: err.message });
  }
});
