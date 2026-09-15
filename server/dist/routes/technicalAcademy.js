"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.technicalAcademyRouter = void 0;
exports.fetchTechnicalCohorts = fetchTechnicalCohorts;
const express_1 = require("express");
const db_js_1 = require("../db.js");
const websocket_js_1 = require("../websocket.js");
exports.technicalAcademyRouter = (0, express_1.Router)();
// Validador de permisos: sólo el Super Administrador puede crear, modificar o eliminar cursos y cohortes
function checkAdminPermission(req, res) {
    const role = (req.headers['x-user-role'] || req.body?.userRole);
    if (role && role !== 'Super Administrador') {
        res.status(403).json({
            error: 'Acceso denegado: sólo el Super Administrador tiene permiso para gestionar la Academia Técnica.'
        });
        return false;
    }
    return true;
}
// ==========================================
// 1. CURSOS TÉCNICOS DE LA ACADEMIA
// ==========================================
// GET /api/technical-academy/courses
exports.technicalAcademyRouter.get('/courses', async (req, res) => {
    try {
        const { companyId } = req.query;
        let query = 'SELECT * FROM technical_academy_courses WHERE is_active = true';
        const params = [];
        if (companyId && typeof companyId === 'string' && companyId !== 'all') {
            query += ' AND (company_id = $1 OR company_id = \'all\')';
            params.push(companyId);
        }
        query += ' ORDER BY created_at DESC';
        const result = await db_js_1.pool.query(query, params);
        const courses = result.rows.map(r => ({
            id: r.id,
            eventId: r.event_id || null,
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
    }
    catch (err) {
        console.error('Error al obtener cursos de Academia Técnica:', err);
        res.status(500).json({ error: 'Error al consultar cursos técnicos', details: err.message });
    }
});
// POST /api/technical-academy/courses
exports.technicalAcademyRouter.post('/courses', async (req, res) => {
    if (!checkAdminPermission(req, res))
        return;
    try {
        const { id, eventId, title, code, description, category, dailyHours, durationDays, modality, location, companyId } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'El título del curso técnico es obligatorio.' });
        }
        const courseId = id || `tac_${Date.now()}`;
        const targetCompanyId = companyId || 'emp_kasino';
        const numDailyHours = Number(dailyHours) || 4;
        const numDurationDays = Number(durationDays) || 5;
        await db_js_1.pool.query(`
      INSERT INTO technical_academy_courses (
        id, event_id, title, code, description, category, daily_hours, duration_days, modality, location, company_id, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
      ON CONFLICT (id) DO UPDATE SET
        event_id = COALESCE(EXCLUDED.event_id, technical_academy_courses.event_id),
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
            eventId || null,
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
    }
    catch (err) {
        console.error('Error al guardar curso técnico:', err);
        res.status(500).json({ error: 'Error al guardar curso técnico', details: err.message });
    }
});
// DELETE /api/technical-academy/courses/:id
exports.technicalAcademyRouter.delete('/courses/:id', async (req, res) => {
    if (!checkAdminPermission(req, res))
        return;
    try {
        const { id } = req.params;
        await db_js_1.pool.query('DELETE FROM technical_academy_courses WHERE id = $1', [id]);
        res.json({ message: 'Curso técnico eliminado con éxito.' });
    }
    catch (err) {
        console.error('Error al eliminar curso técnico:', err);
        res.status(500).json({ error: 'Error al eliminar curso técnico', details: err.message });
    }
});
// ==========================================
// 2. COHORTES / SEMANAS DE CAPACITACIÓN RECURRENTE
// ==========================================
// Helper para obtener cohortes completas con métricas de asistencia y participantes
async function fetchTechnicalCohorts(companyId) {
    let query = `
    SELECT 
      c.*,
      c.event_id as cohort_event_id,
      cr.event_id as course_event_id,
      cr.title as course_title,
      cr.category as course_category,
      cr.daily_hours as course_daily_hours,
      cr.duration_days as course_duration_days,
      COUNT(DISTINCT e.participant_card) as enrolled_count
    FROM technical_academy_cohorts c
    JOIN technical_academy_courses cr ON c.course_id = cr.id
    LEFT JOIN technical_academy_enrollments e ON c.id = e.cohort_id
  `;
    const params = [];
    if (companyId && typeof companyId === 'string' && companyId !== 'all') {
        query += ' WHERE (c.company_id = $1 OR c.company_id = \'all\')';
        params.push(companyId);
    }
    query += `
    GROUP BY c.id, c.event_id, cr.event_id, cr.title, cr.category, cr.daily_hours, cr.duration_days
    ORDER BY c.start_date DESC
  `;
    const result = await db_js_1.pool.query(query, params);
    return result.rows.map(r => ({
        id: r.id,
        eventId: r.cohort_event_id || r.course_event_id || null,
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
exports.technicalAcademyRouter.get('/cohorts', async (req, res) => {
    try {
        const { companyId } = req.query;
        const cohorts = await fetchTechnicalCohorts(typeof companyId === 'string' ? companyId : undefined);
        res.json(cohorts);
    }
    catch (err) {
        console.error('Error al consultar cohortes técnicas:', err);
        res.status(500).json({ error: 'Error al consultar cohortes técnicas', details: err.message });
    }
});
// POST /api/technical-academy/cohorts
exports.technicalAcademyRouter.post('/cohorts', async (req, res) => {
    if (!checkAdminPermission(req, res))
        return;
    const client = await db_js_1.pool.connect();
    try {
        await client.query('BEGIN');
        const { id, eventId, courseId, groupId, groupName, facilitatorId, facilitatorName, facilitatorEmail, startDate, endDate, weekNumber, year, dailyTime, location, capacity, notes, dailyPin, companyId, autoEnrollGroupMembers = true, participantCards } = req.body;
        if (!courseId || !startDate || !endDate) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Curso, fecha de inicio y fecha de fin son obligatorios.' });
        }
        const cohortId = id || `coh_${Date.now()}`;
        const targetCompanyId = companyId || 'emp_kasino';
        const pin = dailyPin || Math.floor(1000 + Math.random() * 9000).toString();
        // Obtener info del curso para defaults si faltan
        const courseRes = await client.query('SELECT location, duration_days, event_id FROM technical_academy_courses WHERE id = $1', [courseId]);
        const courseInfo = courseRes.rows[0];
        const finalLocation = location || (courseInfo ? courseInfo.location : 'Laboratorio Técnico');
        const finalEventId = eventId || (courseInfo ? courseInfo.event_id : null);
        await client.query(`
      INSERT INTO technical_academy_cohorts (
        id, event_id, course_id, group_id, group_name, facilitator_id, facilitator_name, facilitator_email,
        start_date, end_date, week_number, year, daily_time, location, capacity, status, notes, daily_pin, company_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (id) DO UPDATE SET
        event_id = COALESCE(EXCLUDED.event_id, technical_academy_cohorts.event_id),
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
            finalEventId || null,
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
        // Auto-enrolamiento si se especificaron tarjetas individuales directamente
        if (Array.isArray(participantCards) && participantCards.length > 0) {
            for (const card of participantCards) {
                const cleanCard = String(card).trim();
                if (cleanCard) {
                    const insRes = await client.query(`
            INSERT INTO technical_academy_enrollments (cohort_id, participant_card, status)
            VALUES ($1, $2, 'enrolled')
            ON CONFLICT (cohort_id, participant_card) DO NOTHING
            RETURNING participant_card
          `, [cohortId, cleanCard]);
                    if (insRes.rows.length > 0) {
                        enrolledCount++;
                    }
                }
            }
        }
        await client.query('COMMIT');
        res.status(201).json({
            message: 'Cohorte semanal programada exitosamente',
            cohortId,
            enrolledCount
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al crear cohorte técnica:', err);
        res.status(500).json({ error: 'Error al programar cohorte técnica', details: err.message });
    }
    finally {
        client.release();
    }
});
// PUT & PATCH /api/technical-academy/cohorts/:id/reassign
// Permite reasignar facilitador, grupo (con opción de re-enrolar), horario o ubicación
const handleReassign = async (req, res) => {
    if (!checkAdminPermission(req, res))
        return;
    const client = await db_js_1.pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { facilitatorId, facilitatorName, facilitatorEmail, groupId, groupName, autoEnrollNewGroup = true, notes } = req.body;
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
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al reasignar cohorte técnica:', err);
        res.status(500).json({ error: 'Error al reasignar cohorte', details: err.message });
    }
    finally {
        client.release();
    }
};
exports.technicalAcademyRouter.put('/cohorts/:id/reassign', handleReassign);
exports.technicalAcademyRouter.patch('/cohorts/:id/reassign', handleReassign);
// PUT & PATCH /api/technical-academy/cohorts/:id/status
const handleStatusUpdate = async (req, res) => {
    if (!checkAdminPermission(req, res))
        return;
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Estado de cohorte no válido.' });
        }
        await db_js_1.pool.query('UPDATE technical_academy_cohorts SET status = $1 WHERE id = $2', [status, id]);
        res.json({ message: 'Estado actualizado correctamente.', status });
    }
    catch (err) {
        console.error('Error al actualizar estado:', err);
        res.status(500).json({ error: 'Error al actualizar estado', details: err.message });
    }
};
exports.technicalAcademyRouter.put('/cohorts/:id/status', handleStatusUpdate);
exports.technicalAcademyRouter.patch('/cohorts/:id/status', handleStatusUpdate);
// DELETE /api/technical-academy/cohorts/:id
exports.technicalAcademyRouter.delete('/cohorts/:id', async (req, res) => {
    if (!checkAdminPermission(req, res))
        return;
    try {
        const { id } = req.params;
        await db_js_1.pool.query('DELETE FROM technical_academy_cohorts WHERE id = $1', [id]);
        res.json({ message: 'Cohorte técnica eliminada con éxito.' });
    }
    catch (err) {
        console.error('Error al eliminar cohorte:', err);
        res.status(500).json({ error: 'Error al eliminar cohorte', details: err.message });
    }
});
// POST /api/technical-academy/cohorts/:id/duplicate
// Duplica una cohorte para la siguiente semana (desplaza fechas +7 días)
exports.technicalAcademyRouter.post('/cohorts/:id/duplicate', async (req, res) => {
    if (!checkAdminPermission(req, res))
        return;
    const client = await db_js_1.pool.connect();
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
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al duplicar cohorte técnica:', err);
        res.status(500).json({ error: 'Error al duplicar cohorte', details: err.message });
    }
    finally {
        client.release();
    }
});
// ==========================================
// 2.1 GESTIÓN DE PARTICIPANTES POR COHORTE
// ==========================================
// GET /api/technical-academy/cohorts/:id/participants
// Retorna la lista de participantes enrolados en la cohorte con métricas detalladas
exports.technicalAcademyRouter.get('/cohorts/:id/participants', async (req, res) => {
    try {
        const { id } = req.params;
        const cohortRes = await db_js_1.pool.query(`
      SELECT c.*, cr.daily_hours, cr.duration_days, cr.title as course_title, cr.category as course_category
      FROM technical_academy_cohorts c
      JOIN technical_academy_courses cr ON c.course_id = cr.id
      WHERE c.id = $1
    `, [id]);
        if (cohortRes.rows.length === 0) {
            return res.status(404).json({ error: 'Cohorte no encontrada' });
        }
        const cohort = cohortRes.rows[0];
        // Fechas hábiles de sesión (lunes a viernes)
        const dates = [];
        const curr = new Date(cohort.start_date);
        const end = new Date(cohort.end_date);
        while (curr <= end) {
            const dayOfWeek = curr.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                dates.push(curr.toISOString().slice(0, 10));
            }
            curr.setDate(curr.getDate() + 1);
        }
        const totalDays = dates.length || 1;
        const dailyHours = parseFloat(cohort.daily_hours) || 4;
        // Participantes enrolados
        const enrollmentsRes = await db_js_1.pool.query(`
      SELECT 
        e.participant_card,
        e.enrolled_at,
        e.status as enrollment_status,
        e.attendance_percentage,
        e.score,
        e.academic_status,
        e.feedback,
        e.graded_by,
        e.graded_at,
        p.name as participant_name,
        p.email as participant_email,
        p.cedula as participant_cedula,
        p.department as participant_department,
        p.company_id as participant_company_id
      FROM technical_academy_enrollments e
      JOIN participants p ON e.participant_card = p.card
      WHERE e.cohort_id = $1
      ORDER BY p.name ASC
    `, [id]);
        // Resumen de asistencias
        const attendanceRes = await db_js_1.pool.query(`
      SELECT participant_card, COUNT(*) as attended_days
      FROM technical_academy_attendance
      WHERE cohort_id = $1 AND status IN ('present', 'late')
      GROUP BY participant_card
    `, [id]);
        const attendanceMap = new Map();
        attendanceRes.rows.forEach(r => {
            attendanceMap.set(r.participant_card, parseInt(r.attended_days, 10));
        });
        const participants = enrollmentsRes.rows.map(e => {
            const attendedDays = attendanceMap.get(e.participant_card) || 0;
            const attendancePercentage = Math.round((attendedDays / totalDays) * 100);
            const totalHoursEarned = attendedDays * dailyHours;
            // Determinación de condición académica (prioriza nota si existe, o asistencia si no)
            let academicCondition = 'REPROBADO';
            if (e.score !== null && e.score !== undefined) {
                academicCondition = parseFloat(e.score) >= 70 ? 'APROBADO' : 'REPROBADO';
            }
            else {
                academicCondition = attendancePercentage >= 80 ? 'APROBADO' : (attendancePercentage >= 50 ? 'EN RIESGO' : 'REPROBADO');
            }
            return {
                card: e.participant_card,
                name: e.participant_name,
                email: e.participant_email,
                cedula: e.participant_cedula || '',
                department: e.participant_department || '',
                companyId: e.participant_company_id || '',
                enrolledAt: e.enrolled_at,
                enrollmentStatus: e.enrollment_status,
                attendedDays,
                totalDays,
                attendancePercentage,
                totalHoursEarned,
                academicCondition,
                score: e.score !== null && e.score !== undefined ? parseFloat(e.score) : null,
                academicStatus: e.academic_status || (e.score !== null && e.score !== undefined ? (parseFloat(e.score) >= 70 ? 'passed' : 'failed') : 'pending'),
                feedback: e.feedback || null,
                gradedBy: e.graded_by || null,
                gradedAt: e.graded_at || null
            };
        });
        res.json({
            cohort: {
                id: cohort.id,
                courseId: cohort.course_id,
                courseTitle: cohort.course_title,
                courseCategory: cohort.course_category,
                groupId: cohort.group_id,
                groupName: cohort.group_name,
                facilitatorName: cohort.facilitator_name,
                startDate: new Date(cohort.start_date).toISOString().slice(0, 10),
                endDate: new Date(cohort.end_date).toISOString().slice(0, 10),
                dailyTime: cohort.daily_time,
                dailyHours,
                totalDays,
                location: cohort.location,
                capacity: cohort.capacity,
                enrolledCount: participants.length
            },
            participants
        });
    }
    catch (err) {
        console.error('Error al consultar participantes de cohorte técnica:', err);
        res.status(500).json({ error: 'Error al consultar participantes', details: err.message });
    }
});
// POST /api/technical-academy/cohorts/:id/participants
// Enrola uno o múltiples participantes a la cohorte (por lista de tarjetas o identificadores)
exports.technicalAcademyRouter.post('/cohorts/:id/participants', async (req, res) => {
    if (!checkAdminPermission(req, res))
        return;
    const client = await db_js_1.pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { participantCards, identifiers } = req.body;
        const cohortRes = await client.query('SELECT * FROM technical_academy_cohorts WHERE id = $1', [id]);
        if (cohortRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Cohorte no encontrada' });
        }
        let cardsToEnroll = [];
        if (Array.isArray(participantCards) && participantCards.length > 0) {
            cardsToEnroll = participantCards.map((c) => String(c).trim()).filter(Boolean);
        }
        else if (Array.isArray(identifiers) && identifiers.length > 0) {
            const cleanIdentifiers = identifiers.map((i) => String(i).trim()).filter(Boolean);
            if (cleanIdentifiers.length > 0) {
                const found = await client.query(`
          SELECT card FROM participants
          WHERE card = ANY($1) OR cedula = ANY($1) OR LOWER(email) = ANY(SELECT LOWER(unnest($1::text[])))
        `, [cleanIdentifiers]);
                cardsToEnroll = found.rows.map(r => r.card);
            }
        }
        if (cardsToEnroll.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No se proporcionaron participantes válidos para enrolar.' });
        }
        let newlyEnrolled = 0;
        const enrolledCards = [];
        for (const card of cardsToEnroll) {
            const insRes = await client.query(`
        INSERT INTO technical_academy_enrollments (cohort_id, participant_card, status)
        VALUES ($1, $2, 'enrolled')
        ON CONFLICT (cohort_id, participant_card) DO NOTHING
        RETURNING participant_card
      `, [id, card]);
            if (insRes.rows.length > 0) {
                newlyEnrolled++;
                enrolledCards.push(card);
            }
        }
        await client.query('COMMIT');
        res.status(201).json({
            message: `${newlyEnrolled} participante(s) enrolado(s) exitosamente.`,
            cohortId: id,
            newlyEnrolled,
            totalRequested: cardsToEnroll.length,
            enrolledCards
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al enrolar participantes en cohorte:', err);
        res.status(500).json({ error: 'Error al enrolar participantes', details: err.message });
    }
    finally {
        client.release();
    }
});
// DELETE /api/technical-academy/cohorts/:id/participants/:card
// Desmatricula a un participante de la cohorte y remueve sus registros de asistencia en la misma
exports.technicalAcademyRouter.delete('/cohorts/:id/participants/:card', async (req, res) => {
    if (!checkAdminPermission(req, res))
        return;
    const client = await db_js_1.pool.connect();
    try {
        await client.query('BEGIN');
        const { id, card } = req.params;
        const mode = req.query.mode || req.body?.mode || 'hard_delete';
        if (mode === 'archive' || mode === 'conclude') {
            // Modo Concluir / Archivar: preserva el historial de asistencias y notas pero marca la matrícula como concluida
            const updRes = await client.query(`
        UPDATE technical_academy_enrollments
        SET status = 'completed'
        WHERE cohort_id = $1 AND participant_card = $2
        RETURNING participant_card
      `, [id, card]);
            if (updRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'El participante no estaba enrolado en esta cohorte.' });
            }
            await client.query('COMMIT');
            return res.json({
                message: 'Asignación concluida y archivada en el historial exitosamente.',
                cohortId: id,
                participantCard: card,
                status: 'completed'
            });
        }
        // Modo Eliminación Total (Hard Delete)
        // 1. Eliminar asistencias asociadas a esta cohorte y participante
        await client.query(`
      DELETE FROM technical_academy_attendance
      WHERE cohort_id = $1 AND participant_card = $2
    `, [id, card]);
        // 2. Eliminar enrolamiento
        const delRes = await client.query(`
      DELETE FROM technical_academy_enrollments
      WHERE cohort_id = $1 AND participant_card = $2
      RETURNING participant_card
    `, [id, card]);
        if (delRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'El participante no estaba enrolado en esta cohorte.' });
        }
        await client.query('COMMIT');
        res.json({
            message: 'Participante desmatriculado correctamente.',
            cohortId: id,
            participantCard: card
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al desmatricular participante:', err);
        res.status(500).json({ error: 'Error al desmatricular participante', details: err.message });
    }
    finally {
        client.release();
    }
});
// POST /api/technical-academy/assignments/reassign
// Permite desasignar o concluir una cohorte previa y enrolar en una nueva cohorte en una sola transacción
exports.technicalAcademyRouter.post('/assignments/reassign', async (req, res) => {
    if (!checkAdminPermission(req, res))
        return;
    const client = await db_js_1.pool.connect();
    try {
        await client.query('BEGIN');
        const { participantCard, prevCohortId, newCohortId, archivePrevious = true } = req.body;
        if (!participantCard || !newCohortId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Faltan parámetros obligatorios (participantCard, newCohortId).' });
        }
        // 1. Manejar cohorte previa si existe y es distinta de la nueva
        if (prevCohortId && prevCohortId !== newCohortId) {
            if (archivePrevious) {
                await client.query(`
          UPDATE technical_academy_enrollments
          SET status = 'completed'
          WHERE cohort_id = $1 AND participant_card = $2
        `, [prevCohortId, participantCard]);
            }
            else {
                await client.query(`
          DELETE FROM technical_academy_attendance
          WHERE cohort_id = $1 AND participant_card = $2
        `, [prevCohortId, participantCard]);
                await client.query(`
          DELETE FROM technical_academy_enrollments
          WHERE cohort_id = $1 AND participant_card = $2
        `, [prevCohortId, participantCard]);
            }
        }
        // 2. Enrolar en nueva cohorte
        await client.query(`
      INSERT INTO technical_academy_enrollments (cohort_id, participant_card, status)
      VALUES ($1, $2, 'enrolled')
      ON CONFLICT (cohort_id, participant_card) DO UPDATE SET status = 'enrolled'
    `, [newCohortId, participantCard]);
        await client.query('COMMIT');
        res.json({
            message: 'Curso reasignado exitosamente.',
            participantCard,
            prevCohortId,
            newCohortId
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al reasignar curso técnico:', err);
        res.status(500).json({ error: 'Error al reasignar curso técnico', details: err.message });
    }
    finally {
        client.release();
    }
});
// ==========================================
// 3. MARCADO DE ASISTENCIA DIARIA & QR
// ==========================================
// GET /api/technical-academy/cohorts/:id/attendance
// Retorna la lista de participantes enrolados con sus asistencias diarias para todas las fechas de la cohorte
exports.technicalAcademyRouter.get('/cohorts/:id/attendance', async (req, res) => {
    try {
        const { id } = req.params;
        // 1. Obtener la cohorte y curso
        const cohortRes = await db_js_1.pool.query(`
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
        const enrollmentsRes = await db_js_1.pool.query(`
      SELECT 
        e.participant_card,
        e.enrolled_at,
        e.status as enrollment_status,
        e.attendance_percentage,
        e.score,
        e.academic_status,
        e.feedback,
        e.graded_by,
        e.graded_at,
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
        const attendanceRes = await db_js_1.pool.query(`
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
        const attendanceMap = {};
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
        const dates = [];
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
                totalHoursEarned,
                score: e.score !== null && e.score !== undefined ? parseFloat(e.score) : null,
                academicStatus: e.academic_status || (e.score !== null && e.score !== undefined ? (parseFloat(e.score) >= 70 ? 'passed' : 'failed') : (attendancePercent >= 80 ? 'passed' : 'pending')),
                feedback: e.feedback || null,
                gradedBy: e.graded_by || null,
                gradedAt: e.graded_at || null
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
    }
    catch (err) {
        console.error('Error al obtener asistencia de cohorte técnica:', err);
        res.status(500).json({ error: 'Error al consultar asistencia', details: err.message });
    }
});
// POST /api/technical-academy/cohorts/:id/attendance
// Asienta o actualiza asistencia para una fecha específica (individual o por lote)
exports.technicalAcademyRouter.post('/cohorts/:id/attendance', async (req, res) => {
    const client = await db_js_1.pool.connect();
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
            if (!participantCard || !status)
                continue;
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
        (0, websocket_js_1.broadcastAttendanceEvent)({
            type: 'TECHNICAL_ATTENDANCE_MARKED',
            cohortId: id,
            sessionDate,
            message: `Asistencia actualizada para ${records.length} participante(s).`,
            timestamp: new Date().toISOString()
        });
        res.json({ message: 'Asistencia registrada correctamente.', updatedCount: records.length });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al registrar asistencia técnica:', err);
        res.status(500).json({ error: 'Error al asentar asistencia', details: err.message });
    }
    finally {
        client.release();
    }
});
// POST /api/technical-academy/cohorts/:id/qr-checkin
// Procesa auto-registro de entrada diaria por QR o PIN de 4 dígitos
exports.technicalAcademyRouter.post('/cohorts/:id/qr-checkin', async (req, res) => {
    try {
        const { id } = req.params;
        const { identifier, pin, sessionDate } = req.body;
        if (!identifier) {
            return res.status(400).json({ error: 'Cédula o carnet es requerido.' });
        }
        // 1. Validar la cohorte y el PIN si se envió
        const cohortRes = await db_js_1.pool.query('SELECT * FROM technical_academy_cohorts WHERE id = $1', [id]);
        if (cohortRes.rows.length === 0) {
            return res.status(404).json({ error: 'Cohorte no encontrada.' });
        }
        const cohort = cohortRes.rows[0];
        if (cohort.daily_pin && (!pin || pin.trim() !== cohort.daily_pin.trim())) {
            return res.status(400).json({ error: 'El código o PIN diario proyectado es incorrecto o está vacío.' });
        }
        // 2. Buscar al participante por carnet o cédula
        const cleanId = identifier.trim().replace(/-/g, '');
        const partRes = await db_js_1.pool.query(`
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
        const enrRes = await db_js_1.pool.query(`
      SELECT * FROM technical_academy_enrollments WHERE cohort_id = $1 AND participant_card = $2
    `, [id, participant.card]);
        if (enrRes.rows.length === 0) {
            // Auto-enrolar si no lo estaba
            await db_js_1.pool.query(`
        INSERT INTO technical_academy_enrollments (cohort_id, participant_card, status)
        VALUES ($1, $2, 'enrolled')
      `, [id, participant.card]);
        }
        const date = sessionDate || new Date().toISOString().slice(0, 10);
        // 4. Asentar asistencia como 'present' vía 'qr_scan' o 'pin'
        const method = pin ? 'pin' : 'qr_scan';
        await db_js_1.pool.query(`
      INSERT INTO technical_academy_attendance (
        cohort_id, participant_card, session_date, status, method, marked_by, marked_at
      ) VALUES ($1, $2, $3, 'present', $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (cohort_id, participant_card, session_date) DO UPDATE SET
        status = 'present',
        method = EXCLUDED.method,
        marked_at = CURRENT_TIMESTAMP
    `, [id, participant.card, date, method, participant.name]);
        (0, websocket_js_1.broadcastAttendanceEvent)({
            type: 'TECHNICAL_QR_CHECKIN',
            cohortId: id,
            sessionDate: date,
            participantCard: participant.card,
            participantName: participant.name,
            method: method,
            status: 'present',
            message: `¡Asistencia confirmada para ${participant.name}!`,
            timestamp: new Date().toISOString()
        });
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
    }
    catch (err) {
        console.error('Error en check-in QR de Academia Técnica:', err);
        res.status(500).json({ error: 'Error al registrar asistencia por QR', details: err.message });
    }
});
// ==========================================
// 4. CALIFICACIONES Y EVALUACIÓN DE COMPETENCIAS
// ==========================================
// PUT & POST /api/technical-academy/cohorts/:id/grades
// Asienta o actualiza calificaciones y retroalimentación de los técnicos en la cohorte
const handleSaveGrades = async (req, res) => {
    const client = await db_js_1.pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { grades, gradedBy } = req.body;
        if (!Array.isArray(grades) || grades.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'grades (array) es obligatorio y debe contener al menos un registro.' });
        }
        // Verificar existencia de la cohorte
        const cohortRes = await client.query('SELECT * FROM technical_academy_cohorts WHERE id = $1', [id]);
        if (cohortRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Cohorte no encontrada' });
        }
        const cohort = cohortRes.rows[0];
        const role = (req.headers['x-user-role'] || req.body?.userRole);
        const userId = ((req.headers['x-user-id'] || req.body?.userId) || '').trim();
        const userEmail = ((req.headers['x-user-email'] || req.body?.userEmail) || '').toLowerCase().trim();
        const userName = ((req.headers['x-user-name'] || req.body?.userName) || '').toLowerCase().trim();
        // Permisos: Super Administrador O facilitador asignado a la cohorte
        const isSuperAdmin = role === 'Super Administrador' || !role;
        const isCohortFacilitator = (cohort.facilitator_id && cohort.facilitator_id === userId) ||
            (cohort.facilitator_email && cohort.facilitator_email.toLowerCase().trim() === userEmail) ||
            (cohort.facilitator_name && cohort.facilitator_name.toLowerCase().trim() === userName);
        if (!isSuperAdmin && !isCohortFacilitator) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Acceso denegado: solo el facilitador asignado o el Super Administrador pueden asentar calificaciones.' });
        }
        const evaluator = gradedBy || req.headers['x-user-name'] || cohort.facilitator_name || 'Facilitador Técnico';
        let updatedCount = 0;
        for (const g of grades) {
            const { participantCard, score, academicStatus, feedback } = g;
            if (!participantCard)
                continue;
            let finalScore = null;
            if (score !== null && score !== undefined && score !== '') {
                const num = parseFloat(score);
                if (!isNaN(num)) {
                    finalScore = Math.max(0, Math.min(100, num));
                }
            }
            let finalAcademicStatus = academicStatus || 'pending';
            if (finalScore !== null) {
                if (!academicStatus || academicStatus === 'pending') {
                    finalAcademicStatus = finalScore >= 70 ? 'passed' : 'failed';
                }
            }
            await client.query(`
        UPDATE technical_academy_enrollments SET
          score = $1,
          academic_status = $2::varchar,
          feedback = COALESCE($3, feedback),
          graded_by = $4,
          graded_at = CURRENT_TIMESTAMP,
          status = CASE WHEN $2::varchar = 'passed' THEN 'completed' ELSE status END
        WHERE cohort_id = $5 AND participant_card = $6
      `, [
                finalScore,
                finalAcademicStatus,
                feedback !== undefined ? feedback : null,
                evaluator,
                id,
                participantCard
            ]);
            updatedCount++;
        }
        await client.query('COMMIT');
        (0, websocket_js_1.broadcastAttendanceEvent)({
            type: 'TECHNICAL_GRADES_UPDATED',
            cohortId: id,
            message: `${updatedCount} calificación(es) registrada(s) exitosamente.`,
            timestamp: new Date().toISOString()
        });
        res.json({
            message: `${updatedCount} calificación(es) registrada(s) exitosamente.`,
            cohortId: id,
            updatedCount
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al guardar calificaciones de cohorte técnica:', err);
        res.status(500).json({ error: 'Error al registrar calificaciones', details: err.message });
    }
    finally {
        client.release();
    }
};
exports.technicalAcademyRouter.put('/cohorts/:id/grades', handleSaveGrades);
exports.technicalAcademyRouter.post('/cohorts/:id/grades', handleSaveGrades);
// ==========================================
// 6. HISTORIAL CONSOLIDADO DE CAPACITACIONES RECURRENTES
// ==========================================
// GET /api/technical-academy/history
exports.technicalAcademyRouter.get('/history', async (req, res) => {
    try {
        const { participantCard, email, companyId } = req.query;
        let query = `
      SELECT 
        e.participant_card as "participantCard",
        p.name as "participantName",
        p.email as "participantEmail",
        c.id as "cohortId",
        c.course_id as "courseId",
        COALESCE(c.event_id, tc.event_id) as "eventId",
        tc.title as "courseTitle",
        tc.code as "courseCode",
        tc.category as "courseCategory",
        tc.daily_hours as "dailyHours",
        tc.duration_days as "durationDays",
        tc.modality as "modality",
        c.location as "location",
        c.facilitator_id as "facilitatorId",
        c.facilitator_name as "facilitatorName",
        c.facilitator_email as "facilitatorEmail",
        c.group_name as "groupName",
        to_char(c.start_date, 'YYYY-MM-DD') as "startDate",
        to_char(c.end_date, 'YYYY-MM-DD') as "endDate",
        c.daily_time as "dailyTime",
        c.status as "cohortStatus",
        e.status as "enrollmentStatus",
        e.score as "score",
        e.academic_status as "enrollmentAcademicStatus",
        e.feedback as "feedback",
        e.graded_by as "gradedBy",
        e.graded_at as "gradedAt",
        COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) as "attendedDays",
        COUNT(CASE WHEN a.session_date = CURRENT_DATE AND a.status IN ('present', 'late') THEN 1 END) as "attendedToday",
        COUNT(DISTINCT a.session_date) as "markedDays",
        COALESCE(
          ROUND(
            (COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END)::numeric / NULLIF(tc.duration_days, 0)::numeric) * 100, 
            1
          ), 
          0
        ) as "attendancePercentage",
        ROUND(
          COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END)::numeric * tc.daily_hours::numeric, 
          1
        ) as "hoursEarned",
        ROUND(tc.duration_days::numeric * tc.daily_hours::numeric, 1) as "totalHours"
      FROM technical_academy_enrollments e
      JOIN technical_academy_cohorts c ON e.cohort_id = c.id
      JOIN technical_academy_courses tc ON c.course_id = tc.id
      JOIN participants p ON e.participant_card = p.card
      LEFT JOIN technical_academy_attendance a ON a.cohort_id = c.id AND a.participant_card = e.participant_card
    `;
        const conditions = [];
        const params = [];
        if (participantCard && typeof participantCard === 'string') {
            params.push(participantCard.trim());
            conditions.push(`e.participant_card = $${params.length}`);
        }
        if (email && typeof email === 'string') {
            params.push(email.trim().toLowerCase());
            conditions.push(`LOWER(p.email) = $${params.length}`);
        }
        if (companyId && typeof companyId === 'string' && companyId !== 'all') {
            params.push(companyId);
            conditions.push(`(c.company_id = $${params.length} OR c.company_id = 'all')`);
        }
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += `
      GROUP BY e.participant_card, p.name, p.email, c.id, c.course_id, c.event_id, tc.event_id, 
               tc.title, tc.code, tc.category, tc.daily_hours, tc.duration_days, tc.modality, 
               c.location, c.facilitator_id, c.facilitator_name, c.facilitator_email, c.group_name, 
               c.start_date, c.end_date, c.daily_time, c.status, e.status, e.score, e.academic_status,
               e.feedback, e.graded_by, e.graded_at
      ORDER BY c.end_date DESC, c.start_date DESC
    `;
        const result = await db_js_1.pool.query(query, params);
        const history = result.rows.map(r => {
            const attendedDays = parseInt(r.attendedDays, 10) || 0;
            const totalDays = parseInt(r.durationDays, 10) || 5;
            const attendancePercentage = parseFloat(r.attendancePercentage) || 0;
            const hoursEarned = parseFloat(r.hoursEarned) || 0;
            const totalHours = parseFloat(r.totalHours) || 20;
            const score = r.score !== null && r.score !== undefined ? parseFloat(r.score) : null;
            const isPassed = r.enrollmentAcademicStatus === 'passed' || (r.enrollmentAcademicStatus !== 'failed' && (score !== null ? score >= 70 : attendancePercentage >= 80));
            return {
                id: `tac_hist_${r.cohortId}_${r.participantCard}`,
                cohortId: r.cohortId,
                courseId: r.courseId,
                eventId: r.eventId || null,
                participantCard: r.participantCard,
                participantName: r.participantName,
                participantEmail: r.participantEmail,
                title: r.courseTitle,
                code: r.courseCode || '',
                category: r.courseCategory,
                modality: r.modality,
                location: r.location,
                instructor: r.facilitatorName,
                facilitatorName: r.facilitatorName,
                facilitatorEmail: r.facilitatorEmail || '',
                groupName: r.groupName || '',
                startDate: r.startDate,
                endDate: r.endDate,
                date: r.startDate,
                time: r.dailyTime || '08:00 AM - 12:00 PM',
                dailyHours: parseFloat(r.dailyHours) || 4,
                durationDays: totalDays,
                attendedDays,
                attendedToday: (parseInt(r.attendedToday, 10) || 0) > 0,
                markedDays: parseInt(r.markedDays, 10) || 0,
                totalHours,
                hoursEarned,
                hours: hoursEarned,
                attendancePercentage,
                hasAttended: attendedDays > 0,
                academicStatus: isPassed ? 'passed' : (attendancePercentage > 0 ? 'in_progress' : 'failed'),
                score,
                feedback: r.feedback || null,
                gradedBy: r.gradedBy || null,
                gradedAt: r.gradedAt ? new Date(r.gradedAt).toISOString() : null,
                isRecurrent: true,
                cohortStatus: r.cohortStatus || 'scheduled',
                enrollmentStatus: r.enrollmentStatus || 'enrolled',
                status: r.cohortStatus || 'scheduled'
            };
        });
        res.json(history);
    }
    catch (err) {
        console.error('Error al consultar historial de Academia Técnica:', err);
        res.status(500).json({ error: 'Error al consultar historial técnico', details: err.message });
    }
});
