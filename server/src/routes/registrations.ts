import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { fetchFullEvents } from './events.js';
import { NotificationService } from '../services/notificationService.js';

export const registrationsRouter = Router();

/**
 * Parsea una hora en formato "09:00 AM", "11:30 PM", "14:00", etc. a minutos desde medianoche
 */
function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3] ? match[3].toUpperCase() : null;

  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

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
      SELECT sl.id, sl.capacity, sl.end_time 
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
    const endTime = slotRes.rows[0].end_time;

    // 1.1 Validar que la fecha y horario no hayan finalizado
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    if (date < todayStr) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'No es posible inscribirse en una sesión o evento cuya fecha ya ha pasado.' });
    }

    if (date === todayStr) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      let targetTime = endTime;
      if (!targetTime && time && time.includes('-')) {
        targetTime = time.split('-')[1]?.trim();
      }
      if (!targetTime) {
        targetTime = time;
      }
      const targetMinutes = parseTimeToMinutes(targetTime);
      if (targetMinutes !== null && nowMinutes > targetMinutes) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'El horario seleccionado para el día de hoy ya ha finalizado.' });
      }
    }

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

    // 3. Verificar si el usuario ya está inscrito en cualquier horario o fecha de este entrenamiento
    const existingReg = await client.query(
      `SELECT r.id, sch.date::text as reg_date, sl.time as reg_time 
       FROM registrations r
       JOIN event_slots sl ON r.slot_id = sl.id
       JOIN event_schedules sch ON sl.schedule_id = sch.id
       WHERE sch.event_id = $1 AND r.participant_card = $2`,
      [eventId, participantCard]
    );

    if (existingReg.rows.length > 0) {
      const prior = existingReg.rows[0];
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: `Ya te encuentras registrado en este entrenamiento (Fecha: ${prior.reg_date}, Horario: ${prior.reg_time}). No está permitido registrarse en múltiples horarios para el mismo curso.` 
      });
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

    // Trigger de notificación de inscripción confirmada
    pool.query('SELECT title, modality, meeting_url FROM events WHERE id = $1', [eventId])
      .then(evtRes => {
        if (evtRes.rows.length > 0) {
          const ev = evtRes.rows[0];
          NotificationService.onTrainingEnrolled(email.trim(), ev.title, date, time, ev.modality, ev.meeting_url)
            .catch(e => console.error('Error notificando inscripción:', e));
        }
      })
      .catch(err => console.warn('Aviso buscando evento para notificación:', err));

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

// POST /api/registrations/bulk (Matriculación Masiva en Lote - Solo Super Admin)
registrationsRouter.post('/bulk', async (req: Request, res: Response) => {
  const { eventId, date, time, emails, autoExpandCapacity, allowPastDates } = req.body;

  if (!eventId || !date || !time || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ message: 'Se requiere eventId, date, time y una lista no vacía de correos (emails).' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 0. Validación de fecha no vencida
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (!allowPastDates && date < todayStr) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'No es posible matricular en lote para una fecha que ya ha finalizado.' });
    }

    // 1. Obtener y bloquear el slot
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
    let capacity = slotRes.rows[0].capacity;

    let enrolledCount = 0;
    const skippedAlreadyEnrolled: string[] = [];

    for (const rawEmail of emails) {
      const email = String(rawEmail || '').trim().toLowerCase();
      if (!email) continue;

      // Buscar o crear participante
      let partRes = await client.query('SELECT card FROM participants WHERE LOWER(email) = $1', [email]);
      let participantCard = '';

      if (partRes.rows.length === 0) {
        // Buscar si existe en users_simulated para obtener su nombre y cedula
        const userRes = await client.query('SELECT name, cedula FROM users_simulated WHERE LOWER(email) = $1', [email]);
        const userName = userRes.rows.length > 0 ? userRes.rows[0].name : email.split('@')[0].replace(/\./g, ' ').toUpperCase();
        const userCedula = userRes.rows.length > 0 ? userRes.rows[0].cedula : null;
        
        participantCard = `${Math.floor(1000 + Math.random() * 9000)}`;
        await client.query(
          'INSERT INTO participants (card, name, email, cedula) VALUES ($1, $2, $3, $4)',
          [participantCard, userName, email, userCedula]
        );
      } else {
        participantCard = partRes.rows[0].card;
      }

      // Verificar si ya está inscrito en cualquier horario de este evento
      const existingReg = await client.query(
        `SELECT r.id FROM registrations r
         JOIN event_slots sl ON r.slot_id = sl.id
         JOIN event_schedules sch ON sl.schedule_id = sch.id
         WHERE sch.event_id = $1 AND r.participant_card = $2`,
        [eventId, participantCard]
      );

      if (existingReg.rows.length > 0) {
        skippedAlreadyEnrolled.push(email);
        continue;
      }

      // Inscribir
      await client.query(
        'INSERT INTO registrations (slot_id, participant_card) VALUES ($1, $2)',
        [slotId, participantCard]
      );
      enrolledCount++;
    }

    // Si autoExpandCapacity está habilitado o el total supera la capacidad actual, ajustar la capacidad
    const countRes = await client.query(
      'SELECT COUNT(*)::int as total FROM registrations WHERE slot_id = $1',
      [slotId]
    );
    const totalNow = countRes.rows[0].total;
    if (totalNow > capacity) {
      await client.query('UPDATE event_slots SET capacity = $1 WHERE id = $2', [totalNow, slotId]);
    }

    await client.query('COMMIT');
    const fullEvents = await fetchFullEvents();
    res.json({
      events: fullEvents,
      enrolledCount,
      skippedAlreadyEnrolled
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error en matriculación masiva:', err);
    res.status(500).json({ message: 'Error interno en matriculación masiva', error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/registrations/assign (Asignación Directa por Supervisores y Líderes de Área)
registrationsRouter.post('/assign', async (req: Request, res: Response) => {
  const { eventId, date, time, emails, isMandatory, assignedBy, assignmentType, notes } = req.body;

  if (!eventId || !date || !time || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ message: 'Se requiere eventId, date, time y una lista no vacía de correos (emails).' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener y bloquear el slot
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
    let capacity = slotRes.rows[0].capacity;

    let assignedCount = 0;
    const skippedAlreadyEnrolled: string[] = [];

    const effectiveMandatory = Boolean(isMandatory);
    const effectiveAssignmentType = assignmentType || (effectiveMandatory ? 'mandatory' : 'voluntary');
    const effectiveAssignedBy = assignedBy || 'Supervisor';

    for (const rawEmail of emails) {
      const email = String(rawEmail || '').trim().toLowerCase();
      if (!email) continue;

      // Buscar o crear participante
      let partRes = await client.query('SELECT card FROM participants WHERE LOWER(email) = $1', [email]);
      let participantCard = '';

      if (partRes.rows.length === 0) {
        const userRes = await client.query('SELECT name, cedula FROM users_simulated WHERE LOWER(email) = $1', [email]);
        const userName = userRes.rows.length > 0 ? userRes.rows[0].name : email.split('@')[0].replace(/\./g, ' ').toUpperCase();
        const userCedula = userRes.rows.length > 0 ? userRes.rows[0].cedula : null;
        
        participantCard = `${Math.floor(1000 + Math.random() * 9000)}`;
        await client.query(
          'INSERT INTO participants (card, name, email, cedula) VALUES ($1, $2, $3, $4)',
          [participantCard, userName, email, userCedula]
        );
      } else {
        participantCard = partRes.rows[0].card;
      }

      // Verificar si ya está inscrito en cualquier horario de este evento
      const existingReg = await client.query(
        `SELECT r.id, r.slot_id, r.is_mandatory, sch.date::text as reg_date, sl.time as reg_time
         FROM registrations r
         JOIN event_slots sl ON r.slot_id = sl.id
         JOIN event_schedules sch ON sl.schedule_id = sch.id
         WHERE sch.event_id = $1 AND r.participant_card = $2`,
        [eventId, participantCard]
      );

      if (existingReg.rows.length > 0) {
        const existingRow = existingReg.rows[0];
        // Si está en este mismo slot, actualizar datos de asignación si es necesario
        if (existingRow.slot_id === slotId) {
          if (effectiveMandatory && !existingRow.is_mandatory) {
            await client.query(
              `UPDATE registrations 
               SET is_mandatory = $1, assigned_by = $2, assignment_type = $3, assignment_notes = $4, assigned_at = CURRENT_TIMESTAMP
               WHERE id = $5`,
              [true, effectiveAssignedBy, effectiveAssignmentType, notes || null, existingRow.id]
            );
          }
        }
        skippedAlreadyEnrolled.push(email);
        continue;
      }

      // Inscribir
      await client.query(
        `INSERT INTO registrations (slot_id, participant_card, is_mandatory, assigned_by, assignment_type, assignment_notes, assigned_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [slotId, participantCard, effectiveMandatory, effectiveAssignedBy, effectiveAssignmentType, notes || null]
      );
      assignedCount++;
    }

    // Si autoexpand supera la capacidad
    const countRes = await client.query(
      'SELECT COUNT(*)::int as total FROM registrations WHERE slot_id = $1',
      [slotId]
    );
    const totalNow = countRes.rows[0].total;
    if (totalNow > capacity) {
      await client.query('UPDATE event_slots SET capacity = $1 WHERE id = $2', [totalNow, slotId]);
    }

    await client.query('COMMIT');
    const fullEvents = await fetchFullEvents();
    res.json({
      events: fullEvents,
      assignedCount,
      skippedAlreadyEnrolled
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error en asignación por supervisor:', err);
    res.status(500).json({ message: 'Error interno en la asignación', error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/registrations (Cancelar inscripción)
registrationsRouter.delete('/', async (req: Request, res: Response) => {
  const { eventId, date, time, email, isSupervisorOrAdmin, force } = req.body;

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

    // 3. Verificar si es asignación obligatoria
    const regCheck = await client.query(
      'SELECT is_mandatory, assigned_by FROM registrations WHERE slot_id = $1 AND participant_card = $2',
      [slotId, participantCard]
    );

    if (regCheck.rows.length > 0 && regCheck.rows[0].is_mandatory) {
      if (!isSupervisorOrAdmin && !force) {
        await client.query('ROLLBACK');
        return res.status(403).json({ 
          message: 'Esta inscripción es obligatoria y fue asignada por tu supervisor. No puede ser cancelada directamente.',
          isMandatory: true,
          assignedBy: regCheck.rows[0].assigned_by
        });
      }
    }

    // 4. Eliminar registro y confirmación de asistencia si existía
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
