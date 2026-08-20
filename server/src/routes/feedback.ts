import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { fetchFullEvents } from './events.js';

export const feedbackRouter = Router();

// POST /api/feedback
feedbackRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { eventId, userEmail, userName, rating, comment } = req.body;

    if (!eventId || !userEmail || !rating) {
      return res.status(400).json({ error: 'eventId, userEmail y rating son requeridos.' });
    }

    await pool.query(
      `INSERT INTO event_feedbacks (event_id, user_email, user_name, rating, comment)
       VALUES ($1, $2, $3, $4, $5)`,
      [eventId, userEmail.trim().toLowerCase(), userName || null, rating, comment || null]
    );

    const fullEvents = await fetchFullEvents();
    res.json(fullEvents);
  } catch (err: any) {
    console.error('Error al guardar feedback:', err);
    res.status(500).json({ error: 'Error al registrar evaluación', details: err.message });
  }
});
