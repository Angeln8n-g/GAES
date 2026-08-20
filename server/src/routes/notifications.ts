import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

export const notificationsRouter = Router();

// POST /api/notifications/log
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
    res.status(500).json({ error: 'Error al registrar log de notificación', details: err.message });
  }
});
