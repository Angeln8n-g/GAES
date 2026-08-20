import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { fetchFullEvents } from './events.js';

export const registrationsRouter = Router();

// POST /api/registrations (Inscripción concurrente y atómica)
registrationsRouter.post('/', async (req: Request, res: Response) => {
  const { eventId, date, time, email } = req.body;

  if (!eventId || !date || !time || !email) {
    return res.status(400).json({ message: 'Todos los campos (eventId, date, time, email) son requeridos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener y bloquear el slot para evitar condiciones de carrera (Race Conditions)
    const slotQuery = `
      SELECT sl.id, sl.capacity 
      FROM event_slots sl
      JOIN event_schedules sch ON sl.schedule_id = sch.id
      WHERE sch.event_id = $1 AND sch.date = $2 AND sl.time = $3
      FOR UPDATE OF sl
    `;
    const slotRes = await client.query(slotQuery, [eventId, date, time]);

    if (slotRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'El horario o fecha especificada no existe.' });
    }

    const slotId = slotRes.rows[0].id;
    const capacity = slotRes.rows[0].capacity;

    // 2. Obtener o crear participante en base al correo
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

    // 3. Verificar si el usuario ya está inscrito en este slot
    const existingReg = await client.query(
      'SELECT id FROM registrations WHERE slot_id = $1 AND participant_card = $2',
      [slotId, participantCard]
    );

    if (existingReg.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Ya te encuentras registrado en este horario.' });
    }

    // 4. Verificar cupo disponible
    const countRes = await client.query(
      'SELECT COUNT(*)::int as total FROM registrations WHERE slot_id = $1',
      [slotId]
    );
    const currentRegistered = countRes.rows[0].total;

    if (currentRegistered >= capacity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'El cupo para este horario se ha agotado.' });
    }

    // 5. Insertar registro
    await client.query(
      'INSERT INTO registrations (slot_id, participant_card) VALUES ($1, $2)',
      [slotId, participantCard]
    );

    await client.query('COMMIT');
    const fullEvents = await fetchFullEvents();
    res.json(fullEvents);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error al registrar inscripción:', err);
    res.status(500).json({ message: 'Error interno al procesar la reserva', error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/registrations (Cancelar inscripción)
registrationsRouter.delete('/', async (req: Request, res: Response) => {
  const { eventId, date, time, email } = req.body;

  if (!eventId || !date || !time || !email) {
    return res.status(400).json({ message: 'Faltan parámetros para cancelar la reserva.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener slot ID
    const slotQuery = `
      SELECT sl.id 
      FROM event_slots sl
      JOIN event_schedules sch ON sl.schedule_id = sch.id
      WHERE sch.event_id = $1 AND sch.date = $2 AND sl.time = $3
    `;
    const slotRes = await client.query(slotQuery, [eventId, date, time]);

    if (slotRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Horario no encontrado.' });
    }

    const slotId = slotRes.rows[0].id;

    // 2. Obtener tarjeta de participante
    const partRes = await client.query('SELECT card FROM participants WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (partRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Participante no encontrado.' });
    }

    const participantCard = partRes.rows[0].card;

    // 3. Eliminar registro y confirmación de asistencia si existía
    await client.query(
      'DELETE FROM registrations WHERE slot_id = $1 AND participant_card = $2',
      [slotId, participantCard]
    );
    await client.query(
      'DELETE FROM attendance_logs WHERE slot_id = $1 AND participant_card = $2',
      [slotId, participantCard]
    );

    await client.query('COMMIT');
    const fullEvents = await fetchFullEvents();
    res.json(fullEvents);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error al cancelar inscripción:', err);
    res.status(500).json({ message: 'Error al cancelar la inscripción', error: err.message });
  } finally {
    client.release();
  }
});
