import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { fetchFullEvents } from './events.js';

export const feedbackRouter = Router();

// POST /api/feedback
feedbackRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      eventId, 
      userEmail, 
      userName, 
      rating, 
      comment,
      courseRatings,
      facilitatorRatings,
      courseScore,
      facilitatorScore
    } = req.body;

    if (!eventId || !userEmail) {
      return res.status(400).json({ error: 'eventId y userEmail son requeridos.' });
    }

    // Calcular el rating entero (1-5) para compatibilidad con la restricción CHECK de rating
    let intRating = rating ? Math.round(Number(rating)) : null;
    if (!intRating || intRating < 1 || intRating > 5) {
      if (courseScore && facilitatorScore) {
        intRating = Math.round((Number(courseScore) + Number(facilitatorScore)) / 2);
      } else if (courseScore) {
        intRating = Math.round(Number(courseScore));
      } else if (facilitatorScore) {
        intRating = Math.round(Number(facilitatorScore));
      } else {
        intRating = 5;
      }
    }
    intRating = Math.max(1, Math.min(5, intRating));

    const normalizedEmail = userEmail.trim().toLowerCase();

    // Comprobar si ya existe evaluación de este usuario para este evento
    const existing = await pool.query(
      `SELECT id FROM event_feedbacks WHERE event_id = $1 AND LOWER(user_email) = $2 LIMIT 1`,
      [eventId, normalizedEmail]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE event_feedbacks 
         SET user_name = COALESCE($1, user_name),
             rating = $2,
             comment = $3,
             course_ratings = $4,
             facilitator_ratings = $5,
             course_score = $6,
             facilitator_score = $7,
             created_at = CURRENT_TIMESTAMP
         WHERE id = $8`,
        [
          userName || null,
          intRating,
          comment || null,
          JSON.stringify(courseRatings || {}),
          JSON.stringify(facilitatorRatings || {}),
          courseScore !== undefined && courseScore !== null ? Number(courseScore) : null,
          facilitatorScore !== undefined && facilitatorScore !== null ? Number(facilitatorScore) : null,
          existing.rows[0].id
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO event_feedbacks (event_id, user_email, user_name, rating, comment, course_ratings, facilitator_ratings, course_score, facilitator_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          eventId, 
          normalizedEmail, 
          userName || null, 
          intRating, 
          comment || null,
          JSON.stringify(courseRatings || {}),
          JSON.stringify(facilitatorRatings || {}),
          courseScore !== undefined && courseScore !== null ? Number(courseScore) : null,
          facilitatorScore !== undefined && facilitatorScore !== null ? Number(facilitatorScore) : null
        ]
      );
    }

    const fullEvents = await fetchFullEvents();
    res.json(fullEvents);
  } catch (err: any) {
    console.error('Error al guardar feedback:', err);
    res.status(500).json({ error: 'Error al registrar evaluación', details: err.message });
  }
});
