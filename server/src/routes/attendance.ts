import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { fetchFullEvents } from './events.js';
import { broadcastAttendanceEvent } from '../websocket.js';

export const attendanceRouter = Router();

// POST /api/attendance (Check-in o Check-out presencial con QR o PIN diario)
attendanceRouter.post('/', async (req: Request, res: Response) => {
  const { eventId, date, time, email, type = 'checkin', code } = req.body;

  if (!eventId || !date || !time || !email) {
    return res.status(400).json({ message: 'Todos los campos son requeridos para procesar la asistencia.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener slot ID y códigos del día
    const slotQuery = `
      SELECT sl.id, sl.capacity, sl.checkin_code, sl.checkout_code, e.title as event_title
      FROM event_slots sl
      JOIN event_schedules sch ON sl.schedule_id = sch.id
      JOIN events e ON sch.event_id = e.id
      WHERE sch.event_id = $1 AND sch.date = $2 AND sl.time = $3
    `;
    const slotRes = await client.query(slotQuery, [eventId, date, time]);

    if (slotRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Horario o evento no encontrado.' });
    }

    const slot = slotRes.rows[0];
    const slotId = slot.id;

    // 2. Si se suministró un código PIN, validarlo
    if (code && typeof code === 'string' && code.trim()) {
      const cleanCode = code.trim();
      if (type === 'checkout') {
        if (slot.checkout_code && slot.checkout_code !== cleanCode) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'El código diario de salida es incorrecto.' });
        }
      } else {
        if (slot.checkin_code && slot.checkin_code !== cleanCode) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'El código diario de entrada es incorrecto.' });
        }
      }
    }

    // 3. Obtener o crear participante en el padrón
    const cleanEmail = email.trim().toLowerCase();
    let partRes = await client.query('SELECT card, name FROM participants WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
    let participantCard = '';
    let participantName = '';

    if (partRes.rows.length === 0) {
      participantCard = `${Math.floor(1000 + Math.random() * 9000)}`;
      participantName = cleanEmail.split('@')[0].replace(/\./g, ' ').toUpperCase();
      await client.query(
        'INSERT INTO participants (card, name, email) VALUES ($1, $2, $3)',
        [participantCard, participantName, cleanEmail]
      );
    } else {
      participantCard = partRes.rows[0].card;
      participantName = partRes.rows[0].name;
    }

    // 4. Asegurar que esté inscrito en el slot
    await client.query(
      `INSERT INTO registrations (slot_id, participant_card)
       VALUES ($1, $2)
       ON CONFLICT (slot_id, participant_card) DO NOTHING`,
      [slotId, participantCard]
    );

    // 5. Registrar o Actualizar en attendance_logs según el tipo (Entrada o Salida)
    const checkExistingQuery = `
      SELECT id, check_in_at, check_out_at, is_completed
      FROM attendance_logs
      WHERE slot_id = $1 AND participant_card = $2
    `;
    const existingLogRes = await client.query(checkExistingQuery, [slotId, participantCard]);
    const existingLog = existingLogRes.rows[0];

    let checkInAtTime: string = new Date().toISOString();
    let checkOutAtTime: string | null = null;
    let isCompletedStatus: boolean = false;

    if (type === 'checkout') {
      if (existingLog) {
        // Ya tenía entrada, marcar salida
        const updateRes = await client.query(
          `UPDATE attendance_logs
           SET check_out_at = CURRENT_TIMESTAMP,
               is_completed = TRUE
           WHERE slot_id = $1 AND participant_card = $2
           RETURNING to_char(check_in_at, 'YYYY-MM-DD HH12:MI AM') as "inTime",
                     to_char(check_out_at, 'YYYY-MM-DD HH12:MI AM') as "outTime"`,
          [slotId, participantCard]
        );
        checkInAtTime = updateRes.rows[0]?.inTime || new Date().toISOString();
        checkOutAtTime = updateRes.rows[0]?.outTime || new Date().toISOString();
        isCompletedStatus = true;
      } else {
        // No tenía entrada previa: registrar entrada y salida simultáneas para completar
        const insertRes = await client.query(
          `INSERT INTO attendance_logs (slot_id, participant_card, confirmed_at, check_in_at, check_out_at, is_completed)
           VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE)
           RETURNING to_char(check_in_at, 'YYYY-MM-DD HH12:MI AM') as "inTime",
                     to_char(check_out_at, 'YYYY-MM-DD HH12:MI AM') as "outTime"`,
          [slotId, participantCard]
        );
        checkInAtTime = insertRes.rows[0]?.inTime || new Date().toISOString();
        checkOutAtTime = insertRes.rows[0]?.outTime || new Date().toISOString();
        isCompletedStatus = true;
      }
    } else {
      // Registro de Entrada (Check-In)
      if (existingLog) {
        // Ya existía registro
        checkInAtTime = existingLog.check_in_at || new Date().toISOString();
        checkOutAtTime = existingLog.check_out_at || null;
        isCompletedStatus = Boolean(existingLog.is_completed);
      } else {
        const insertRes = await client.query(
          `INSERT INTO attendance_logs (slot_id, participant_card, confirmed_at, check_in_at, is_completed)
           VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, FALSE)
           RETURNING to_char(check_in_at, 'YYYY-MM-DD HH12:MI AM') as "inTime"`,
          [slotId, participantCard]
        );
        checkInAtTime = insertRes.rows[0]?.inTime || new Date().toISOString();
        isCompletedStatus = false;
      }
    }

    await client.query('COMMIT');

    // 6. Broadcast en tiempo real vía WebSocket
    broadcastAttendanceEvent({
      type: type === 'checkout' ? 'ATTENDANCE_CHECK_OUT' : 'ATTENDANCE_CHECK_IN',
      eventId,
      date,
      time,
      email: cleanEmail,
      participantCard,
      participantName,
      timestamp: new Date().toISOString(),
      checkInAt: checkInAtTime,
      checkOutAt: checkOutAtTime || undefined,
      isCompleted: isCompletedStatus,
      message: type === 'checkout'
        ? `✓ ${participantName} ha registrado Salida (${slot.event_title})`
        : `🟢 ${participantName} ha registrado Entrada (${slot.event_title})`
    });

    const fullEvents = await fetchFullEvents();
    res.json({
      events: fullEvents,
      status: type === 'checkout' ? 'checkout_success' : 'checkin_success',
      checkInAt: checkInAtTime,
      checkOutAt: checkOutAtTime,
      isCompleted: isCompletedStatus,
      participantName
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error al registrar asistencia:', err);
    res.status(500).json({ message: 'Error interno al confirmar asistencia', error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/attendance/revert (Revertir o desmarcar asistencia)
attendanceRouter.post('/revert', async (req: Request, res: Response) => {
  const { eventId, date, time, email, revertType = 'all' } = req.body;

  if (!eventId || !date || !time || !email) {
    return res.status(400).json({ message: 'Todos los campos son requeridos para revertir asistencia.' });
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
      return res.status(404).json({ message: 'Horario o evento no encontrado.' });
    }

    const slotId = slotRes.rows[0].id;
    const cleanEmail = email.trim().toLowerCase();

    // 2. Obtener tarjeta de participante
    const partRes = await client.query('SELECT card, name FROM participants WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
    if (partRes.rows.length > 0) {
      const participantCard = partRes.rows[0].card;
      const participantName = partRes.rows[0].name;

      if (revertType === 'checkout') {
        // Solo revertir la salida
        await client.query(
          `UPDATE attendance_logs 
           SET check_out_at = NULL, is_completed = FALSE 
           WHERE slot_id = $1 AND participant_card = $2`,
          [slotId, participantCard]
        );
      } else {
        // Revertir asistencia completa
        await client.query(
          'DELETE FROM attendance_logs WHERE slot_id = $1 AND participant_card = $2',
          [slotId, participantCard]
        );
      }

      broadcastAttendanceEvent({
        type: 'ATTENDANCE_REVERT',
        eventId,
        date,
        time,
        email: cleanEmail,
        participantCard,
        participantName,
        timestamp: new Date().toISOString(),
        isCompleted: false,
        message: `↩ Asistencia revertida para ${participantName}`
      });
    }

    await client.query('COMMIT');
    const fullEvents = await fetchFullEvents();
    res.json(fullEvents);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error al revertir asistencia:', err);
    res.status(500).json({ message: 'Error interno al revertir asistencia', error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/attendance/verify-code (Verificar código PIN del día)
attendanceRouter.post('/verify-code', async (req: Request, res: Response) => {
  const { eventId, date, time, code } = req.body;

  if (!eventId || !date || !time || !code) {
    return res.status(400).json({ valid: false, message: 'Parámetros incompletos' });
  }

  try {
    const query = `
      SELECT sl.checkin_code, sl.checkout_code
      FROM event_slots sl
      JOIN event_schedules sch ON sl.schedule_id = sch.id
      WHERE sch.event_id = $1 AND sch.date = $2 AND sl.time = $3
    `;
    const result = await pool.query(query, [eventId, date, time]);

    if (result.rows.length === 0) {
      return res.status(404).json({ valid: false, message: 'Horario no encontrado' });
    }

    const { checkin_code, checkout_code } = result.rows[0];
    const cleanCode = code.trim();

    if (cleanCode === checkin_code) {
      return res.json({ valid: true, type: 'checkin', message: 'Código de entrada válido' });
    } else if (cleanCode === checkout_code) {
      return res.json({ valid: true, type: 'checkout', message: 'Código de salida válido' });
    } else {
      return res.json({ valid: false, message: 'El código no coincide con la entrada o salida de este turno' });
    }
  } catch (err: any) {
    res.status(500).json({ valid: false, error: err.message });
  }
});
