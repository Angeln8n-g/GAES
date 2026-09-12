"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsRouter = void 0;
exports.fetchFullEvents = fetchFullEvents;
const express_1 = require("express");
const db_js_1 = require("../db.js");
exports.eventsRouter = (0, express_1.Router)();
/**
 * Helper para formatear un evento completo desde PostgreSQL con sus relaciones
 */
async function fetchFullEvents(companyId) {
    let query = 'SELECT * FROM events';
    const params = [];
    if (companyId && typeof companyId === 'string' && companyId !== 'all') {
        query += ' WHERE company_id = $1';
        params.push(companyId);
    }
    query += ' ORDER BY id ASC';
    const eventsResult = await db_js_1.pool.query(query, params);
    const events = [];
    for (const evt of eventsResult.rows) {
        // 1. Obtener Fechas (schedules)
        const schedulesResult = await db_js_1.pool.query(`SELECT * FROM event_schedules WHERE event_id = $1 ORDER BY date ASC`, [evt.id]);
        const schedule = [];
        for (const sch of schedulesResult.rows) {
            // 2. Obtener Horarios (slots)
            const slotsResult = await db_js_1.pool.query(`SELECT * FROM event_slots WHERE schedule_id = $1 ORDER BY id ASC`, [sch.id]);
            const slots = [];
            for (const sl of slotsResult.rows) {
                // 3. Obtener asistentes inscritos con detalles de asignación
                const attendeesResult = await db_js_1.pool.query(`SELECT 
             p.email, 
             COALESCE(r.is_mandatory, FALSE) as "isMandatory", 
             r.assigned_by as "assignedBy", 
             COALESCE(r.assignment_type, 'self') as "assignmentType",
             r.assignment_notes as "assignmentNotes",
             to_char(r.assigned_at, 'YYYY-MM-DD HH12:MI AM') as "assignedAt"
           FROM registrations r 
           JOIN participants p ON r.participant_card = p.card 
           WHERE r.slot_id = $1`, [sl.id]);
                // 4. Obtener asistentes confirmados (QR)
                const attendedResult = await db_js_1.pool.query(`SELECT p.email 
           FROM attendance_logs a 
           JOIN participants p ON a.participant_card = p.card 
           WHERE a.slot_id = $1`, [sl.id]);
                const attendees = attendeesResult.rows.map(r => r.email);
                const attendedList = attendedResult.rows.map(r => r.email);
                const attendeesDetails = attendeesResult.rows.map(r => ({
                    email: r.email,
                    isMandatory: Boolean(r.isMandatory),
                    assignedBy: r.assignedBy || null,
                    assignmentType: r.assignmentType || (r.isMandatory ? 'mandatory' : 'self'),
                    assignmentNotes: r.assignmentNotes || null,
                    assignedAt: r.assignedAt || null
                }));
                slots.push({
                    time: sl.time,
                    capacity: sl.capacity,
                    registered: attendees.length,
                    attendees,
                    attendedList,
                    attendeesDetails
                });
            }
            // Formato YYYY-MM-DD
            const dateStr = typeof sch.date === 'string' ? sch.date : sch.date.toISOString().split('T')[0];
            schedule.push({
                date: dateStr,
                slots
            });
        }
        // 5. Historial de Notificaciones
        const notifsResult = await db_js_1.pool.query(`SELECT to_char(date, 'YYYY-MM-DD HH12:MI AM') as date, channel, status, recipients 
       FROM notification_logs WHERE event_id = $1 ORDER BY date DESC`, [evt.id]);
        // 6. Feedbacks / Evaluaciones de satisfacción (Encuesta TEC)
        const feedbacksResult = await db_js_1.pool.query(`SELECT id, event_id as "eventId", user_email as "userEmail", user_name as "userName", 
              rating, comment, 
              COALESCE(course_ratings, '{}') as "courseRatings",
              COALESCE(facilitator_ratings, '{}') as "facilitatorRatings",
              course_score as "courseScore",
              facilitator_score as "facilitatorScore",
              to_char(created_at, 'YYYY-MM-DD HH12:MI AM') as "createdAt"
       FROM event_feedbacks WHERE event_id = $1 ORDER BY created_at DESC`, [evt.id]);
        // 7. Calificaciones y Desempeño Académico
        const gradesResult = await db_js_1.pool.query(`SELECT 
         g.id,
         g.event_id as "eventId",
         g.participant_card as "participantCard",
         p.name as "participantName",
         p.email as "participantEmail",
         p.department as "participantDepartment",
         g.slot_id as "slotId",
         g.score,
         g.academic_status as "academicStatus",
         COALESCE(g.detected_skill_gaps, '{}') as "detectedSkillGaps",
         g.weaknesses_notes as "weaknessesNotes",
         g.strengths_notes as "strengthsNotes",
         COALESCE(g.needs_retraining, false) as "needsRetraining",
         g.feedback,
         g.graded_by as "gradedBy",
         to_char(g.graded_at, 'YYYY-MM-DD HH12:MI AM') as "gradedAt"
       FROM participant_grades g
       JOIN participants p ON g.participant_card = p.card
       WHERE g.event_id = $1
       ORDER BY g.graded_at DESC, p.name ASC`, [evt.id]);
        events.push({
            id: evt.id,
            title: evt.title,
            description: evt.description,
            category: evt.category,
            instructor: evt.instructor,
            imageUrl: evt.image_url,
            status: evt.status,
            modality: evt.modality,
            location: evt.location,
            surveyUrl: evt.survey_url,
            companyId: evt.company_id || 'emp_kasino',
            evaluationType: evt.evaluation_type || 'attendance_only',
            passingScore: evt.passing_score !== null && evt.passing_score !== undefined ? Number(evt.passing_score) : 70,
            skillsEvaluated: evt.skills_evaluated || [],
            ojtEvaluatorId: evt.ojt_evaluator_id || null,
            ojtEvaluatorName: evt.ojt_evaluator_name || null,
            ojtEvaluatorEmail: evt.ojt_evaluator_email || null,
            modules: Array.isArray(evt.modules) ? evt.modules : [],
            notificationSettings: {
                sendEmail: evt.send_email,
                sendTeams: evt.send_teams,
                customMessage: evt.custom_message
            },
            notificationHistory: notifsResult.rows,
            schedule,
            feedbacks: feedbacksResult.rows,
            grades: gradesResult.rows
        });
    }
    return events;
}
// GET /api/events
exports.eventsRouter.get('/', async (req, res) => {
    try {
        const { companyId } = req.query;
        const events = await fetchFullEvents(typeof companyId === 'string' ? companyId : undefined);
        res.json(events);
    }
    catch (err) {
        console.error('Error al obtener eventos:', err);
        res.status(500).json({ error: 'Error al consultar eventos en PostgreSQL', details: err.message });
    }
});
// POST /api/events (Crear o Actualizar)
exports.eventsRouter.post('/', async (req, res) => {
    const client = await db_js_1.pool.connect();
    try {
        const event = req.body;
        await client.query('BEGIN');
        // 1. Upsert evento principal
        await client.query(`INSERT INTO events (
        id, title, description, category, instructor, image_url, status, 
        send_email, send_teams, custom_message, modality, location, survey_url, 
        company_id, evaluation_type, passing_score, skills_evaluated,
        ojt_evaluator_id, ojt_evaluator_name, ojt_evaluator_email, modules
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        instructor = EXCLUDED.instructor,
        image_url = EXCLUDED.image_url,
        status = EXCLUDED.status,
        send_email = EXCLUDED.send_email,
        send_teams = EXCLUDED.send_teams,
        custom_message = EXCLUDED.custom_message,
        modality = EXCLUDED.modality,
        location = EXCLUDED.location,
        survey_url = EXCLUDED.survey_url,
        company_id = EXCLUDED.company_id,
        evaluation_type = EXCLUDED.evaluation_type,
        passing_score = EXCLUDED.passing_score,
        skills_evaluated = EXCLUDED.skills_evaluated,
        ojt_evaluator_id = EXCLUDED.ojt_evaluator_id,
        ojt_evaluator_name = EXCLUDED.ojt_evaluator_name,
        ojt_evaluator_email = EXCLUDED.ojt_evaluator_email,
        modules = EXCLUDED.modules`, [
            event.id,
            event.title,
            event.description,
            event.category,
            event.instructor,
            event.imageUrl,
            event.status || 'active',
            event.notificationSettings?.sendEmail ?? true,
            event.notificationSettings?.sendTeams ?? false,
            event.notificationSettings?.customMessage || '',
            event.modality || 'Presencial',
            event.location || 'Instalaciones',
            event.surveyUrl || null,
            event.companyId || 'emp_kasino',
            event.evaluationType || 'attendance_only',
            event.passingScore !== undefined && event.passingScore !== null ? Number(event.passingScore) : 70,
            Array.isArray(event.skillsEvaluated) ? event.skillsEvaluated : [],
            event.ojtEvaluatorId || null,
            event.ojtEvaluatorName || null,
            event.ojtEvaluatorEmail || null,
            JSON.stringify(Array.isArray(event.modules) ? event.modules : [])
        ]);
        // 2. Insertar Schedules y Slots
        for (const sch of event.schedule || []) {
            const schRes = await client.query(`INSERT INTO event_schedules (event_id, date)
         VALUES ($1, $2)
         ON CONFLICT (event_id, date) DO UPDATE SET date = EXCLUDED.date
         RETURNING id`, [event.id, sch.date]);
            const scheduleId = schRes.rows[0].id;
            for (const sl of sch.slots || []) {
                await client.query(`INSERT INTO event_slots (schedule_id, time, capacity)
           VALUES ($1, $2, $3)
           ON CONFLICT (schedule_id, time) DO UPDATE SET capacity = EXCLUDED.capacity`, [scheduleId, sl.time, sl.capacity]);
            }
        }
        await client.query('COMMIT');
        const fullEvents = await fetchFullEvents();
        res.json(fullEvents);
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al guardar evento:', err);
        res.status(500).json({ error: 'Error al persistir el evento en la base de datos', details: err.message });
    }
    finally {
        client.release();
    }
});
// DELETE /api/events/:id
exports.eventsRouter.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db_js_1.pool.query(`DELETE FROM events WHERE id = $1`, [id]);
        const fullEvents = await fetchFullEvents();
        res.json(fullEvents);
    }
    catch (err) {
        console.error('Error al eliminar evento:', err);
        res.status(500).json({ error: 'Error al eliminar el evento', details: err.message });
    }
});
