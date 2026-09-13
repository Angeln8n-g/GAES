"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsRouter = void 0;
exports.fetchFullEvents = fetchFullEvents;
const express_1 = require("express");
const db_js_1 = require("../db.js");
const websocket_js_1 = require("../websocket.js");
exports.eventsRouter = (0, express_1.Router)();
/**
 * Helper para formatear un evento completo desde PostgreSQL con sus relaciones
 */
async function fetchFullEvents(companyId) {
    let query = 'SELECT * FROM events';
    const params = [];
    if (companyId && typeof companyId === 'string' && companyId !== 'all') {
        query += ` WHERE (company_id = $1 OR company_id = 'all' OR company_id IS NULL OR $1 = ANY(company_ids))`;
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
                // 4. Obtener asistentes confirmados (QR Entrada y Salida)
                const attendedResult = await db_js_1.pool.query(`SELECT 
             p.email, 
             to_char(COALESCE(a.check_in_at, a.confirmed_at), 'YYYY-MM-DD HH12:MI AM') as "checkInAt",
             to_char(a.check_out_at, 'YYYY-MM-DD HH12:MI AM') as "checkOutAt",
             COALESCE(a.is_completed, (a.check_out_at IS NOT NULL)) as "isCompleted"
           FROM attendance_logs a 
           JOIN participants p ON a.participant_card = p.card 
           WHERE a.slot_id = $1`, [sl.id]);
                const attendees = attendeesResult.rows.map(r => r.email);
                const attendedList = attendedResult.rows.map(r => r.email);
                const checkInList = attendedResult.rows.map(r => r.email);
                const checkOutList = attendedResult.rows.filter(r => r.checkOutAt).map(r => r.email);
                const completedAttendanceList = attendedResult.rows.filter(r => r.isCompleted).map(r => r.email);
                const attendanceDetails = attendedResult.rows.map(r => ({
                    email: r.email,
                    checkInAt: r.checkInAt,
                    checkOutAt: r.checkOutAt || null,
                    isCompleted: Boolean(r.isCompleted)
                }));
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
                    endTime: sl.end_time || null,
                    checkinCode: sl.checkin_code || null,
                    checkoutCode: sl.checkout_code || null,
                    capacity: sl.capacity,
                    registered: attendees.length,
                    attendees,
                    attendedList,
                    checkInList,
                    checkOutList,
                    completedAttendanceList,
                    attendanceDetails
                });
            }
            schedule.push({
                date: typeof sch.date === 'string' ? sch.date : sch.date.toISOString().split('T')[0],
                endDate: sch.end_date ? (typeof sch.end_date === 'string' ? sch.end_date : sch.end_date.toISOString().split('T')[0]) : undefined,
                slots
            });
        }
        // 5. Notificaciones, Feedbacks y Calificaciones
        const notifsResult = await db_js_1.pool.query(`SELECT channel, status, recipients, date 
       FROM notification_logs 
       WHERE event_id = $1 
       ORDER BY date DESC`, [evt.id]);
        const feedbacksResult = await db_js_1.pool.query(`SELECT 
         id,
         event_id AS "eventId", 
         user_email AS "userEmail", 
         user_name AS "userName", 
         rating, 
         comment, 
         course_ratings AS "courseRatings",
         facilitator_ratings AS "facilitatorRatings",
         course_score AS "courseScore",
         facilitator_score AS "facilitatorScore",
         created_at AS "createdAt"
       FROM event_feedbacks 
       WHERE event_id = $1 
       ORDER BY created_at DESC`, [evt.id]);
        const gradesResult = await db_js_1.pool.query(`SELECT 
         pg.id,
         pg.event_id AS "eventId",
         pg.slot_id AS "slotId",
         pg.participant_card AS "participantCard",
         p.name AS "participantName",
         p.email AS "participantEmail",
         p.department AS "participantDepartment",
         COALESCE(p.company_id, 'emp_kasino') AS "companyId",
         pg.score,
         pg.academic_status AS "academicStatus",
         pg.detected_skill_gaps AS "detectedSkillGaps",
         pg.weaknesses_notes AS "weaknessesNotes",
         pg.strengths_notes AS "strengthsNotes",
         pg.needs_retraining AS "needsRetraining",
         pg.feedback,
         pg.graded_by AS "gradedBy",
         pg.graded_at AS "gradedAt",
         pg.module_grades AS "moduleGrades"
       FROM participant_grades pg
       LEFT JOIN participants p ON p.card = pg.participant_card
       WHERE pg.event_id = $1
       ORDER BY p.name ASC`, [evt.id]);
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
            companyId: evt.company_id || 'all',
            companyIds: Array.isArray(evt.company_ids) ? evt.company_ids : [],
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
            notificationHistory: notifsResult.rows.map(r => ({
                date: r.date ? (typeof r.date === 'string' ? r.date : r.date.toISOString()) : '',
                channel: r.channel,
                status: r.status || 'sent',
                recipients: r.recipients
            })),
            schedule,
            startDate: evt.start_date ? (typeof evt.start_date === 'string' ? evt.start_date : evt.start_date.toISOString().split('T')[0]) : undefined,
            endDate: evt.end_date ? (typeof evt.end_date === 'string' ? evt.end_date : evt.end_date.toISOString().split('T')[0]) : undefined,
            startTime: evt.start_time || undefined,
            endTime: evt.end_time || undefined,
            totalHours: Number(evt.total_hours) || 0,
            sessionType: evt.session_type || 'Sincrónica',
            trainingType: evt.training_type || 'Técnico',
            trainingFormat: evt.training_format || evt.category || 'Taller',
            programCategory: evt.program_category || 'Capacitacion_seguridad_salud_en_el_trabajo_y_sustentabilidad',
            subprogram: evt.subprogram || 'Sustentabilidad',
            supplier: evt.supplier || 'Claro',
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
        const effectiveCompanyId = event.companyId || 'all';
        const effectiveCompanyIds = Array.isArray(event.companyIds) && event.companyIds.length > 0
            ? event.companyIds
            : (effectiveCompanyId !== 'all' ? [effectiveCompanyId] : []);
        // 1. Upsert evento principal
        await client.query(`INSERT INTO events (
        id, title, description, category, instructor, image_url, status, 
        send_email, send_teams, custom_message, modality, location, survey_url, 
        company_id, evaluation_type, passing_score, skills_evaluated,
        ojt_evaluator_id, ojt_evaluator_name, ojt_evaluator_email, modules,
        start_date, end_date, start_time, end_time, company_ids, total_hours,
        session_type, training_type, training_format, program_category, subprogram, supplier
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
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
        modules = EXCLUDED.modules,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        company_ids = EXCLUDED.company_ids,
        total_hours = EXCLUDED.total_hours,
        session_type = EXCLUDED.session_type,
        training_type = EXCLUDED.training_type,
        training_format = EXCLUDED.training_format,
        program_category = EXCLUDED.program_category,
        subprogram = EXCLUDED.subprogram,
        supplier = EXCLUDED.supplier`, [
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
            effectiveCompanyId,
            event.evaluationType || 'attendance_only',
            event.passingScore !== undefined && event.passingScore !== null ? Number(event.passingScore) : 70,
            Array.isArray(event.skillsEvaluated) ? event.skillsEvaluated : [],
            event.ojtEvaluatorId || null,
            event.ojtEvaluatorName || null,
            event.ojtEvaluatorEmail || null,
            JSON.stringify(Array.isArray(event.modules) ? event.modules : []),
            event.startDate || (event.schedule?.[0]?.date || null),
            event.endDate || (event.schedule?.[event.schedule.length - 1]?.date || null),
            event.startTime || (event.schedule?.[0]?.slots?.[0]?.time || null),
            event.endTime || (event.schedule?.[0]?.slots?.[0]?.endTime || null),
            effectiveCompanyIds,
            Number(event.totalHours) || 0,
            event.sessionType || 'Sincrónica',
            event.trainingType || 'Técnico',
            event.trainingFormat || event.category || 'Taller',
            event.programCategory || 'Capacitacion_seguridad_salud_en_el_trabajo_y_sustentabilidad',
            event.subprogram || 'Sustentabilidad',
            event.supplier || 'Claro'
        ]);
        // 2. Insertar Schedules y Slots
        for (const sch of event.schedule || []) {
            const schRes = await client.query(`INSERT INTO event_schedules (event_id, date, end_date)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id, date) DO UPDATE SET 
           date = EXCLUDED.date,
           end_date = COALESCE(EXCLUDED.end_date, event_schedules.end_date)
         RETURNING id`, [event.id, sch.date, sch.endDate || sch.date]);
            const scheduleId = schRes.rows[0].id;
            for (const sl of sch.slots || []) {
                const checkinCode = sl.checkinCode || `${Math.floor(1000 + Math.random() * 9000)}`;
                const checkoutCode = sl.checkoutCode || `${Math.floor(1000 + Math.random() * 9000)}`;
                await client.query(`INSERT INTO event_slots (schedule_id, time, end_time, capacity, checkin_code, checkout_code)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (schedule_id, time) DO UPDATE SET 
             end_time = COALESCE(EXCLUDED.end_time, event_slots.end_time),
             capacity = EXCLUDED.capacity,
             checkin_code = COALESCE(event_slots.checkin_code, EXCLUDED.checkin_code),
             checkout_code = COALESCE(event_slots.checkout_code, EXCLUDED.checkout_code)`, [scheduleId, sl.time, sl.endTime || null, sl.capacity, checkinCode, checkoutCode]);
            }
        }
        await client.query('COMMIT');
        const fullEvents = await fetchFullEvents();
        (0, websocket_js_1.broadcastAttendanceEvent)({
            type: 'EVENTS_UPDATED',
            eventId: event.id,
            timestamp: new Date().toISOString()
        });
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
        (0, websocket_js_1.broadcastAttendanceEvent)({
            type: 'EVENTS_UPDATED',
            eventId: id,
            timestamp: new Date().toISOString()
        });
        res.json(fullEvents);
    }
    catch (err) {
        console.error('Error al eliminar evento:', err);
        res.status(500).json({ error: 'Error al eliminar el evento', details: err.message });
    }
});
