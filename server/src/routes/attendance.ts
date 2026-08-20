import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { fetchFullEvents } from './events.js';

export const attendanceRouter = Router();

// POST /api/attendance (Check-in presencial con QR)
attendanceRouter.post('/', async (req: Request, res: Response) => {
  const { eventId, date, time, email } = req.body;

  if (!eventId || !date || !time || !email) {
    return res.status(400).json({ message: 'Todos los campos son requeridos para el check-in.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener slot ID
    const slotQuery = `
      SELECT sl.id, sl.capacity 
      FROM event_slots sl
      JOIN event_schedules sch ON sl.schedule_id = sch.id
      WHERE sch.event_id = $1 AND sch.date = $2 AND sl.time = $3
    `;
    const slotRes = await client.query(slotQuery, [eventId, date, time]);

    if (slotRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Horario o evento no encontrado.' });
    }

    const slotId = slotRes.rows[0].id;
    const capacity = slotRes.rows[0].capacity;

    // 2. Obtener o crear participante
    let partRes = await client.query('SELECT card FROM participants WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    let participantCard = '';

    if (partRes.rows.length === 0) {
      participantCard = `${Math.floor(1000 + Math.random() * 9000)}`;
      const cleanName = email.split('@')[0].replace(/\./g, ' ').toUpperCase();
      await client.query(
        'INSERT INTO participants (card, name, email) VALUES ($1, $2, $3)',
        [participantCard, cleanName, email.trim().toLowerCase()]
      );
    } else {
      participantCard = partRes.rows[0].card;
    }

    // 3. Asegurar que esté inscrito
    await client.query(
      `INSERT INTO registrations (slot_id, participant_card)
       VALUES ($1, $2)
       ON CONFLICT (slot_id, participant_card) DO NOTHING`,
      [slotId, participantCard]
    );

    // 4. Registrar en attendance_logs
    await client.query(
      `INSERT INTO attendance_logs (slot_id, participant_card)
       VALUES ($1, $2)
       ON CONFLICT (slot_id, participant_card) DO NOTHING`,
      [slotId, participantCard]
    );

    await client.query('COMMIT');
    const fullEvents = await fetchFullEvents();
    res.json(fullEvents);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error al registrar asistencia:', err);
    res.status(500).json({ message: 'Error interno al confirmar asistencia', error: err.message });
  } finally {
    client.release();
  }
});
