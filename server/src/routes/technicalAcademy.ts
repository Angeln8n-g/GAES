import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

export const technicalAcademyRouter = Router();

// Validador de permisos: sólo administradores pueden crear, modificar o eliminar cursos y cohortes
function checkAdminPermission(req: Request, res: Response): boolean {
  const role = (req.headers['x-user-role'] || req.body?.userRole) as string | undefined;
  if (role && role !== 'Super Administrador' && role !== 'Administrador / Editor') {
    res.status(403).json({
      error: 'Acceso denegado: sólo los administradores tienen permiso para crear, modificar o eliminar cursos y cohortes.'
    });
    return false;
  }
  return true;
}

// ==========================================
// 1. CURSOS TÉCNICOS DE LA ACADEMIA
// ==========================================

// GET /api/technical-academy/courses
technicalAcademyRouter.get('/courses', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.query;
    let query = 'SELECT * FROM technical_academy_courses WHERE is_active = true';
    const params: any[] = [];

    if (companyId && typeof companyId === 'string' && companyId !== 'all') {
      query += ' AND (company_id = $1 OR company_id = \'all\')';
      params.push(companyId);
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);

    const courses = result.rows.map(r => ({
      id: r.id,
      title: r.title,
      code: r.code || '',
      description: r.description || '',
      category: r.category || 'Planta Externa',
      dailyHours: parseFloat(r.daily_hours) || 4,
      durationDays: r.duration_days || 5,
      modality: r.modality || 'Presencial (Taller)',
      location: r.location || '',
      companyId: r.company_id || 'emp_kasino',
      isActive: r.is_active,
      createdAt: r.created_at
    }));

    res.json(courses);
  } catch (err: any) {
    console.error('Error al obtener cursos de Academia Técnica:', err);
    res.status(500).json({ error: 'Error al consultar cursos técnicos', details: err.message });
  }
});

// POST /api/technical-academy/courses
technicalAcademyRouter.post('/courses', async (req: Request, res: Response) => {
  if (!checkAdminPermission(req, res)) return;
  try {
    const {
      id,
      title,
      code,
      description,
      category,
      dailyHours,
      durationDays,
      modality,
      location,
      companyId
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'El título del curso técnico es obligatorio.' });
    }

    const courseId = id || `tac_${Date.now()}`;
    const targetCompanyId = companyId || 'emp_kasino';
    const numDailyHours = Number(dailyHours) || 4;
    const numDurationDays = Number(durationDays) || 5;

    await pool.query(`
      INSERT INTO technical_academy_courses (
        id, title, code, description, category, daily_hours, duration_days, modality, location, company_id, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        code = EXCLUDED.code,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        daily_hours = EXCLUDED.daily_hours,
        duration_days = EXCLUDED.duration_days,
        modality = EXCLUDED.modality,
        location = EXCLUDED.location,
        company_id = EXCLUDED.company_id,
        is_active = true
    `, [
      courseId,
      title.trim(),
      code || '',
      description || '',
      category || 'Planta Externa',
      numDailyHours,
      numDurationDays,
      modality || 'Presencial (Taller)',
      location || '',
      targetCompanyId
    ]);

    res.status(201).json({
      message: 'Curso técnico guardado exitosamente',
      courseId
    });
  } catch (err: any) {
    console.error('Error al guardar curso técnico:', err);
    res.status(500).json({ error: 'Error al guardar curso técnico', details: err.message });
  }
});

// DELETE /api/technical-academy/courses/:id
technicalAcademyRouter.delete('/courses/:id', async (req: Request, res: Response) => {
  if (!checkAdminPermission(req, res)) return;
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM technical_academy_courses WHERE id = $1', [id]);
    res.json({ message: 'Curso técnico eliminado con éxito.' });
  } catch (err: any) {
    console.error('Error al eliminar curso técnico:', err);
    res.status(500).json({ error: 'Error al eliminar curso técnico', details: err.message });
  }
});

// ==========================================
// 2. COHORTES / SEMANAS DE CAPACITACIÓN RECURRENTE
// ==========================================

// Helper para obtener cohortes completas con métricas de asistencia y participantes
export async function fetchTechnicalCohorts(companyId?: string) {
  let query = `
    SELECT 
      c.*,
      cr.title as course_title,
      cr.category as course_category,
      cr.daily_hours as course_daily_hours,
      cr.duration_days as course_duration_days,
      COUNT(DISTINCT e.participant_card) as enrolled_count
    FROM technical_academy_cohorts c
    JOIN technical_academy_courses cr ON c.course_id = cr.id
    LEFT JOIN technical_academy_enrollments e ON c.id = e.cohort_id
  `;

  const params: any[] = [];
  if (companyId && typeof companyId === 'string' && companyId !== 'all') {
    query += ' WHERE (c.company_id = $1 OR c.company_id = \'all\')';
    params.push(companyId);
  }

  query += `
    GROUP BY c.id, cr.title, cr.category, cr.daily_hours, cr.duration_days
    ORDER BY c.start_date DESC
  `;

  const result = await pool.query(query, params);

  return result.rows.map(r => ({
    id: r.id,
    courseId: r.course_id,
    courseTitle: r.course_title,
    courseCategory: r.course_category,
    dailyHours: parseFloat(r.course_daily_hours) || 4,
    durationDays: r.course_duration_days || 5,
    groupId: r.group_id || null,
    groupName: r.group_name || '',
    facilitatorId: r.facilitator_id || null,
    facilitatorName: r.facilitator_name || 'Sin Facilitador Asignado',
    facilitatorEmail: r.facilitator_email || '',
    startDate: r.start_date ? new Date(r.start_date).toISOString().slice(0, 10) : '',
    endDate: r.end_date ? new Date(r.end_date).toISOString().slice(0, 10) : '',
    weekNumber: r.week_number,
    year: r.year,
    dailyTime: r.daily_time || '08:00 AM - 12:00 PM',
    location: r.location || '',
    capacity: r.capacity || 20,
    enrolledCount: parseInt(r.enrolled_count, 10) || 0,
    status: r.status || 'scheduled',
    notes: r.notes || '',
    dailyPin: r.daily_pin || '2026',
    companyId: r.company_id || 'emp_kasino',
    createdAt: r.created_at
  }));
}

// GET /api/technical-academy/cohorts
technicalAcademyRouter.get('/cohorts', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.query;
    const cohorts = await fetchTechnicalCohorts(typeof companyId === 'string' ? companyId : undefined);
    res.json(cohorts);
  } catch (err: any) {
    console.error('Error al consultar cohortes técnicas:', err);
    res.status(500).json({ error: 'Error al consultar cohortes técnicas', details: err.message });
  }
});

// POST /api/technical-academy/cohorts
technicalAcademyRouter.post('/cohorts', async (req: Request, res: Response) => {
  if (!checkAdminPermission(req, res)) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      id,
      courseId,
      groupId,
      groupName,
      facilitatorId,
      facilitatorName,
      facilitatorEmail,
      startDate,
      endDate,
      weekNumber,
      year,
      dailyTime,
      location,
      capacity,
      notes,
      dailyPin,
      companyId,
      autoEnrollGroupMembers = true
    } = req.body;

    if (!courseId || !startDate || !endDate) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Curso, fecha de inicio y fecha de fin son obligatorios.' });
    }

    const cohortId = id || `coh_${Date.now()}`;
    const targetCompanyId = companyId || 'emp_kasino';
    const pin = dailyPin || Math.floor(1000 + Math.random() * 9000).toString();

    // Obtener info del curso para defaults si faltan
    const courseRes = await client.query('SELECT location, duration_days FROM technical_academy_courses WHERE id = $1', [courseId]);
    const courseInfo = courseRes.rows[0];
    const finalLocation = location || (courseInfo ? courseInfo.location : 'Laboratorio Técnico');

    await client.query(`
      INSERT INTO technical_academy_cohorts (
        id, course_id, group_id, group_name, facilitator_id, facilitator_name, facilitator_email,
        start_date, end_date, week_number, year, daily_time, location, capacity, status, notes, daily_pin, company_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        course_id = EXCLUDED.course_id,
        group_id = EXCLUDED.group_id,
        group_name = EXCLUDED.group_name,
        facilitator_id = EXCLUDED.facilitator_id,
        facilitator_name = EXCLUDED.facilitator_name,
        facilitator_email = EXCLUDED.facilitator_email,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        week_number = EXCLUDED.week_number,
        year = EXCLUDED.year,
        daily_time = EXCLUDED.daily_time,
        location = EXCLUDED.location,
        capacity = EXCLUDED.capacity,
        notes = EXCLUDED.notes,
        daily_pin = EXCLUDED.daily_pin,
        company_id = EXCLUDED.company_id
    `, [
      cohortId,
      courseId,
      groupId || null,
      groupName || '',
      facilitatorId || null,
      facilitatorName || '',
      facilitatorEmail || '',
      startDate,
      endDate,
      weekNumber || null,
      year || new Date(startDate).getFullYear(),
      dailyTime || '08:00 AM - 12:00 PM',
      finalLocation,
      Number(capacity) || 20,
      'scheduled',
      notes || '',
      pin,
      targetCompanyId
    ]);

    // Auto-enrolamiento si se especificó un grupo
    let enrolledCount = 0;
    if (groupId && autoEnrollGroupMembers) {
      const membersRes = await client.query(`
        SELECT participant_card FROM group_members WHERE group_id = $1
      `, [groupId]);

      for (const m of membersRes.rows) {
        await client.query(`
          INSERT INTO technical_academy_enrollments (cohort_id, participant_card, status)
          VALUES ($1, $2, 'enrolled')
          ON CONFLICT (cohort_id, participant_card) DO NOTHING
        `, [cohortId, m.participant_card]);
        enrolledCount++;
      }
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Cohorte semanal programada exitosamente',
      cohortId,
      enrolledCount
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error al crear cohorte técnica:', err);
    res.status(500).json({ error: 'Error al programar cohorte técnica', details: err.message });
  } finally {
    client.release();
  }
});

// PUT & PATCH /api/technical-academy/cohorts/:id/reassign
// Permite reasignar facilitador, grupo (con opción de re-enrolar), horario o ubicación
const handleReassign = async (req: Request, res: Response) => {
  if (!checkAdminPermission(req, res)) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const {
      facilitatorId,
      facilitatorName,
      facilitatorEmail,
      groupId,
      groupName,
      autoEnrollNewGroup = true,
      notes
    } = req.body;

    const currentCohort = await client.query('SELECT * FROM technical_academy_cohorts WHERE id = $1', [id]);
    if (currentCohort.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cohorte no encontrada' });
    }

    const prevGroupId = currentCohort.rows[0].group_id;

    // Actualizar campos de asignación
    await client.query(`
      UPDATE technical_academy_cohorts SET
        facilitator_id = COALESCE($1, facilitator_id),
        facilitator_name = COALESCE($2, facilitator_name),
        facilitator_email = COALESCE($3, facilitator_email),
        group_id = CASE WHEN $4::text IS NOT NULL THEN $4::text ELSE group_id END,
        group_name = CASE WHEN $5::text IS NOT NULL THEN $5::text ELSE group_name END,
        notes = COALESCE($6, notes)
      WHERE id = $7
    `, [
      facilitatorId,
      facilitatorName,
      groupId !== undefined ? (groupId || null) : null,
      groupId !== undefined ? (groupId || null) : null,
      groupName !== undefined ? groupName : null,
      notes,
      id
    ]);

    // Si cambió el grupo y se solicita enrolar al nuevo grupo
    let newEnrolledCount = 0;
    if (groupId && groupId !== prevGroupId && autoEnrollNewGroup) {
      // Obtener miembros del nuevo grupo
      const newMembers = await client.query(`
        SELECT participant_card FROM group_members WHERE group_id = $1
      `, [groupId]);

      for (const m of newMembers.rows) {
        await client.query(`
          INSERT INTO technical_academy_enrollments (cohort_id, participant_card, status)
          VALUES ($1, $2, 'enrolled')
          ON CONFLICT (cohort_id, participant_card) DO NOTHING
        `, [id, m.participant_card]);
        newEnrolledCount++;
      }
    }

    await client.query('COMMIT');
    res.json({
      message: 'Reasignación efectuada correctamente',
      cohortId: id,
      newEnrolledCount
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error al reasignar cohorte técnica:', err);
    res.status(500).json({ error: 'Error al reasignar cohorte', details: err.message });
  } finally {
    client.release();
  }
};

technicalAcademyRouter.put('/cohorts/:id/reassign', handleReassign);
technicalAcademyRouter.patch('/cohorts/:id/reassign', handleReassign);

// PUT & PATCH /api/technical-academy/cohorts/:id/status
const handleStatusUpdate = async (req: Request, res: Response) => {
  if (!checkAdminPermission(req, res)) return;
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Estado de cohorte no válido.' });
    }

    await pool.query('UPDATE technical_academy_cohorts SET status = $1 WHERE id = $2', [status, id]);
    res.json({ message: 'Estado actualizado correctamente.', status });
  } catch (err: any) {
    console.error('Error al actualizar estado:', err);
    res.status(500).json({ error: 'Error al actualizar estado', details: err.message });
  }
};

technicalAcademyRouter.put('/cohorts/:id/status', handleStatusUpdate);
technicalAcademyRouter.patch('/cohorts/:id/status', handleStatusUpdate);

// DELETE /api/technical-academy/cohorts/:id
technicalAcademyRouter.delete('/cohorts/:id', async (req: Request, res: Response) => {
  if (!checkAdminPermission(req, res)) return;
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM technical_academy_cohorts WHERE id = $1', [id]);
    res.json({ message: 'Cohorte técnica eliminada con éxito.' });
  } catch (err: any) {
    console.error('Error al eliminar cohorte:', err);
    res.status(500).json({ error: 'Error al eliminar cohorte', details: err.message });
  }
});

// POST /api/technical-academy/cohorts/:id/duplicate
// Duplica una cohorte para la siguiente semana (desplaza fechas +7 días)
technicalAcademyRouter.post('/cohorts/:id/duplicate', async (req: Request, res: Response) => {
  if (!checkAdminPermission(req, res)) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { newGroupId, newGroupName, newFacilitatorId, newFacilitatorName, newFacilitatorEmail } = req.body;

    const sourceRes = await client.query('SELECT * FROM technical_academy_cohorts WHERE id = $1', [id]);
    if (sourceRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cohorte origen no encontrada' });
    }

    const s = sourceRes.rows[0];
    const prevStart = new Date(s.start_date);
    const prevEnd = new Date(s.end_date);

    // Sumar 7 días
    const nextStart = new Date(prevStart);
    nextStart.setDate(prevStart.getDate() + 7);
    const nextEnd = new Date(prevEnd);
    nextEnd.setDate(prevEnd.getDate() + 7);

    const nextWeekNumber = s.week_number ? s.week_number + 1 : undefined;
    const newCohortId = `coh_${Date.now()}`;
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const targetGroupId = newGroupId !== undefined ? (newGroupId || null) : s.group_id;
    const targetGroupName = newGroupName !== undefined ? newGroupName : s.group_name;
    const targetFacId = newFacilitatorId !== undefined ? (newFacilitatorId || null) : s.facilitator_id;
    const targetFacName = newFacilitatorName !== undefined ? newFacilitatorName : s.facilitator_name;
    const targetFacEmail = newFacilitatorEmail !== undefined ? newFacilitatorEmail : s.facilitator_email;

    await client.query(`
      INSERT INTO technical_academy_cohorts (
        id, course_id, group_id, group_name, facilitator_id, facilitator_name, facilitator_email,
        start_date, end_date, week_number, year, daily_time, location, capacity, status, daily_pin, company_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'scheduled', $15, $16)
    `, [
      newCohortId,
      s.course_id,
      targetGroupId,
      targetGroupName,
      targetFacId,
      targetFacName,
      targetFacEmail,
      nextStart.toISOString().slice(0, 10),
      nextEnd.toISOString().slice(0, 10),
      nextWeekNumber,
      nextStart.getFullYear(),
      s.daily_time,
      s.location,
      s.capacity,
      pin,
      s.company_id
    ]);

    // Enrolar miembros del grupo si hay grupo objetivo
    if (targetGroupId) {
      const members = await client.query('SELECT participant_card FROM group_members WHERE group_id = $1', [targetGroupId]);
      for (const m of members.rows) {
        await client.query(`
          INSERT INTO technical_academy_enrollments (cohort_id, participant_card, status)
          VALUES ($1, $2, 'enrolled')
          ON CONFLICT DO NOTHING
        `, [newCohortId, m.participant_card]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Cohorte duplicada exitosamente para la siguiente semana',
      newCohortId,
      startDate: nextStart.toISOString().slice(0, 10),
      endDate: nextEnd.toISOString().slice(0, 10)
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error al duplicar cohorte técnica:', err);
    res.status(500).json({ error: 'Error al duplicar cohorte', details: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// 3. MARCADO DE ASISTENCIA DIARIA & QR
// ==========================================

// GET /api/technical-academy/cohorts/:id/attendance
// Retorna la lista de participantes enrolados con sus asistencias diarias para todas las fechas de la cohorte
technicalAcademyRouter.get('/cohorts/:id/attendance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Obtener la cohorte y curso
    const cohortRes = await pool.query(`
      SELECT c.*, cr.daily_hours, cr.duration_days, cr.title as course_title
      FROM technical_academy_cohorts c
      JOIN technical_academy_courses cr ON c.course_id = cr.id
      WHERE c.id = $1
    `, [id]);

    if (cohortRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cohorte no encontrada' });
    }

    const cohort = cohortRes.rows[0];

    // 2. Obtener los participantes enrolados
    const enrollmentsRes = await pool.query(`
      SELECT 
        e.participant_card,
        e.enrolled_at,
        e.status as enrollment_status,
        e.attendance_percentage,
        p.name as participant_name,
        p.email as participant_email,
        p.cedula as participant_cedula,
        p.department as participant_department
      FROM technical_academy_enrollments e
      JOIN participants p ON e.participant_card = p.card
      WHERE e.cohort_id = $1
      ORDER BY p.name ASC
    `, [id]);

    // 3. Obtener todos los registros diarios de asistencia de la cohorte
    const attendanceRes = await pool.query(`
      SELECT 
        participant_card,
        TO_CHAR(session_date, 'YYYY-MM-DD') as session_date,
        status,
        method,
        marked_by,
        marked_at,
        notes
      FROM technical_academy_attendance
      WHERE cohort_id = $1
      ORDER BY session_date ASC
    `, [id]);

    // Mapear asistencia por tarjeta y por fecha
    const attendanceMap: Record<string, Record<string, any>> = {};
    attendanceRes.rows.forEach(r => {
      if (!attendanceMap[r.participant_card]) {
        attendanceMap[r.participant_card] = {};
      }
      attendanceMap[r.participant_card][r.session_date] = {
        status: r.status,
        method: r.method,
        markedBy: r.marked_by,
        markedAt: r.marked_at,
        notes: r.notes
      };
    });

    // 4. Generar lista de fechas hábiles entre startDate y endDate
    const dates: string[] = [];
    const curr = new Date(cohort.start_date);
    const end = new Date(cohort.end_date);
    while (curr <= end) {
      const dayOfWeek = curr.getDay(); // 0 = Domingo, 6 = Sábado
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        dates.push(curr.toISOString().slice(0, 10));
      }
      curr.setDate(curr.getDate() + 1);
    }

    const participantsData = enrollmentsRes.rows.map(e => {
      const pAttendance = attendanceMap[e.participant_card] || {};
      let attendedDays = 0;
      dates.forEach(d => {
        const att = pAttendance[d];
        if (att && (att.status === 'present' || att.status === 'late')) {
          attendedDays++;
        }
      });
      const attendancePercent = dates.length > 0 ? Math.round((attendedDays / dates.length) * 100) : 0;
      const totalHoursEarned = attendedDays * (parseFloat(cohort.daily_hours) || 4);

      return {
        card: e.participant_card,
        name: e.participant_name,
        email: e.participant_email,
        cedula: e.participant_cedula || '',
        department: e.participant_department || '',
        enrollmentStatus: e.enrollment_status,
        attendanceByDate: pAttendance,
        attendedDays,
        totalDays: dates.length,
        attendancePercentage: attendancePercent,
        totalHoursEarned
      };
    });

    res.json({
      cohortId: cohort.id,
      courseTitle: cohort.course_title,
      groupName: cohort.group_name,
      facilitatorName: cohort.facilitator_name,
      dailyHours: parseFloat(cohort.daily_hours) || 4,
      startDate: new Date(cohort.start_date).toISOString().slice(0, 10),
      endDate: new Date(cohort.end_date).toISOString().slice(0, 10),
      sessionDates: dates,
      dailyPin: cohort.daily_pin || '2026',
      participants: participantsData
    });
  } catch (err: any) {
    console.error('Error al obtener asistencia de cohorte técnica:', err);
    res.status(500).json({ error: 'Error al consultar asistencia', details: err.message });
  }
});

// POST /api/technical-academy/cohorts/:id/attendance
// Asienta o actualiza asistencia para una fecha específica (individual o por lote)
technicalAcademyRouter.post('/cohorts/:id/attendance', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { sessionDate, records, markedBy } = req.body;

    if (!sessionDate || !Array.isArray(records)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'sessionDate y records (array) son obligatorios.' });
    }

    const updater = markedBy || 'Facilitador Técnico';

    for (const r of records) {
      const { participantCard, status, method = 'manual', notes } = r;
      if (!participantCard || !status) continue;

      await client.query(`
        INSERT INTO technical_academy_attendance (
          cohort_id, participant_card, session_date, status, method, marked_by, marked_at, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
        ON CONFLICT (cohort_id, participant_card, session_date) DO UPDATE SET
          status = EXCLUDED.status,
          method = EXCLUDED.method,
          marked_by = EXCLUDED.marked_by,
          marked_at = CURRENT_TIMESTAMP,
          notes = EXCLUDED.notes
      `, [
        id,
        participantCard,
        sessionDate,
        status,
        method,
        updater,
        notes || null
      ]);
    }

    // Actualizar estado de la cohorte a 'in_progress' si aún estaba 'scheduled'
    await client.query(`
      UPDATE technical_academy_cohorts 
      SET status = 'in_progress' 
      WHERE id = $1 AND status = 'scheduled'
    `, [id]);

    await client.query('COMMIT');
    res.json({ message: 'Asistencia registrada correctamente.', updatedCount: records.length });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error al registrar asistencia técnica:', err);
    res.status(500).json({ error: 'Error al asentar asistencia', details: err.message });
  } finally {
    client.release();
  }
});

// POST /api/technical-academy/cohorts/:id/qr-checkin
// Procesa auto-registro de entrada diaria por QR o PIN de 4 dígitos
technicalAcademyRouter.post('/cohorts/:id/qr-checkin', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { identifier, pin, sessionDate } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: 'Cédula o carnet es requerido.' });
    }

    // 1. Validar la cohorte y el PIN si se envió
    const cohortRes = await pool.query('SELECT * FROM technical_academy_cohorts WHERE id = $1', [id]);
    if (cohortRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cohorte no encontrada.' });
    }

    const cohort = cohortRes.rows[0];
    if (pin && cohort.daily_pin && pin.trim() !== cohort.daily_pin.trim()) {
      return res.status(400).json({ error: 'PIN diario incorrecto.' });
    }

    // 2. Buscar al participante por carnet o cédula
    const cleanId = identifier.trim().replace(/-/g, '');
    const partRes = await pool.query(`
      SELECT card, name, email FROM participants
      WHERE card = $1 
         OR REPLACE(cedula, '-', '') = $2
         OR LOWER(email) = LOWER($1)
      LIMIT 1
    `, [identifier.trim(), cleanId]);

    if (partRes.rows.length === 0) {
      return res.status(404).json({ error: 'Colaborador no encontrado en el padrón institucional.' });
    }

    const participant = partRes.rows[0];

    // 3. Verificar si está enrolado en la cohorte
    const enrRes = await pool.query(`
      SELECT * FROM technical_academy_enrollments WHERE cohort_id = $1 AND participant_card = $2
    `, [id, participant.card]);

    if (enrRes.rows.length === 0) {
      // Auto-enrolar si no lo estaba
      await pool.query(`
        INSERT INTO technical_academy_enrollments (cohort_id, participant_card, status)
        VALUES ($1, $2, 'enrolled')
      `, [id, participant.card]);
    }

    const date = sessionDate || new Date().toISOString().slice(0, 10);

    // 4. Asentar asistencia como 'present' vía 'qr_scan' o 'pin'
    const method = pin ? 'pin' : 'qr_scan';
    await pool.query(`
      INSERT INTO technical_academy_attendance (
        cohort_id, participant_card, session_date, status, method, marked_by, marked_at
      ) VALUES ($1, $2, $3, 'present', $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (cohort_id, participant_card, session_date) DO UPDATE SET
        status = 'present',
        method = EXCLUDED.method,
        marked_at = CURRENT_TIMESTAMP
    `, [id, participant.card, date, method, participant.name]);

    res.json({
      success: true,
      message: `¡Asistencia confirmada para ${participant.name}!`,
      participant: {
        card: participant.card,
        name: participant.name,
        email: participant.email
      },
      sessionDate: date
    });
  } catch (err: any) {
    console.error('Error en check-in QR de Academia Técnica:', err);
    res.status(500).json({ error: 'Error al registrar asistencia por QR', details: err.message });
  }
});
