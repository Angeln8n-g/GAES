"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gradesRouter = void 0;
const express_1 = require("express");
const db_js_1 = require("../db.js");
exports.gradesRouter = (0, express_1.Router)();
// GET /api/grades
exports.gradesRouter.get('/', async (req, res) => {
    try {
        const { eventId, participantCard, companyId, needsRetraining } = req.query;
        let query = `
      SELECT 
        g.id,
        g.event_id as "eventId",
        g.participant_card as "participantCard",
        p.name as "participantName",
        p.email as "participantEmail",
        p.department as "participantDepartment",
        COALESCE(p.company_id, 'emp_kasino') as "companyId",
        g.slot_id as "slotId",
        g.score,
        g.academic_status as "academicStatus",
        COALESCE(g.detected_skill_gaps, '{}') as "detectedSkillGaps",
        g.weaknesses_notes as "weaknessesNotes",
        g.strengths_notes as "strengthsNotes",
        COALESCE(g.needs_retraining, false) as "needsRetraining",
        g.feedback,
        g.graded_by as "gradedBy",
        to_char(g.graded_at, 'YYYY-MM-DD HH12:MI AM') as "gradedAt",
        COALESCE(g.module_grades, '[]'::jsonb) as "moduleGrades",
        e.title as "eventTitle",
        e.category as "eventCategory",
        COALESCE(e.evaluation_type, 'attendance_only') as "evaluationType",
        COALESCE(e.passing_score, 70.00) as "passingScore",
        COALESCE(e.skills_evaluated, '{}') as "skillsEvaluated"
      FROM participant_grades g
      JOIN participants p ON g.participant_card = p.card
      JOIN events e ON g.event_id = e.id
      WHERE 1=1
    `;
        const params = [];
        if (eventId && typeof eventId === 'string') {
            params.push(eventId);
            query += ` AND g.event_id = $${params.length}`;
        }
        if (participantCard && typeof participantCard === 'string') {
            params.push(participantCard);
            query += ` AND g.participant_card = $${params.length}`;
        }
        if (companyId && typeof companyId === 'string' && companyId !== 'all') {
            params.push(companyId);
            query += ` AND p.company_id = $${params.length}`;
        }
        if (needsRetraining === 'true') {
            query += ` AND g.needs_retraining = true`;
        }
        query += ` ORDER BY g.graded_at DESC, p.name ASC`;
        const result = await db_js_1.pool.query(query, params);
        res.json(result.rows);
    }
    catch (err) {
        console.error('Error al obtener calificaciones:', err);
        res.status(500).json({ error: 'Error al consultar calificaciones en PostgreSQL', details: err.message });
    }
});
// POST /api/grades (Guardar o actualizar calificación individual)
exports.gradesRouter.post('/', async (req, res) => {
    const reqUser = req.user;
    const allowedRoles = ['Super Administrador', 'Administrador / Editor', 'Instructor / Evaluador', 'Líder de Área / Supervisor'];
    if (!reqUser || !allowedRoles.includes(reqUser.role)) {
        return res.status(403).json({ error: 'Acceso denegado: No tienes permisos para calificar participantes.' });
    }
    const client = await db_js_1.pool.connect();
    try {
        const { id, eventId, participantCard, slotId, score, academicStatus, detectedSkillGaps, weaknessesNotes, strengthsNotes, needsRetraining, feedback, gradedBy, moduleGrades } = req.body;
        if (!eventId || !participantCard) {
            return res.status(400).json({ error: 'eventId y participantCard son obligatorios.' });
        }
        const gradeId = id || `grd_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const skillGaps = Array.isArray(detectedSkillGaps) ? detectedSkillGaps : [];
        // Obtener evento para calcular estado si no fue provisto
        const eventRes = await client.query('SELECT evaluation_type, passing_score, modules FROM events WHERE id = $1', [eventId]);
        const event = eventRes.rows[0];
        const passingScore = event ? Number(event.passing_score || 70) : 70;
        let computedScore = score !== null && score !== undefined && score !== '' ? Number(score) : null;
        const validMods = Array.isArray(moduleGrades) ? moduleGrades.filter((m) => m.score !== null && m.score !== undefined && m.score !== '') : [];
        // Si tiene calificaciones de módulos y no se proveyó una nota global, calcular el promedio simple
        if (validMods.length > 0 && computedScore === null) {
            const sum = validMods.reduce((acc, curr) => acc + Number(curr.score), 0);
            computedScore = Math.round((sum / validMods.length) * 100) / 100;
        }
        let computedStatus = academicStatus;
        let computedRetraining = needsRetraining;
        if (!computedStatus && computedScore !== null) {
            const anyModFailed = validMods.some((m) => m.academicStatus === 'failed');
            if (anyModFailed || computedScore < passingScore) {
                computedStatus = 'failed';
                if (computedRetraining === undefined)
                    computedRetraining = true;
            }
            else {
                computedStatus = 'passed';
                if (computedRetraining === undefined)
                    computedRetraining = false;
            }
        }
        else if (!computedStatus) {
            computedStatus = 'pending';
        }
        if (computedStatus === 'failed' && computedRetraining === undefined) {
            computedRetraining = true;
        }
        await client.query(`
      INSERT INTO participant_grades (
        id, event_id, participant_card, slot_id, score, academic_status, 
        detected_skill_gaps, weaknesses_notes, strengths_notes, needs_retraining, feedback, graded_by, graded_at, module_grades
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, $13)
      ON CONFLICT (event_id, participant_card) DO UPDATE SET
        slot_id = COALESCE(EXCLUDED.slot_id, participant_grades.slot_id),
        score = EXCLUDED.score,
        academic_status = EXCLUDED.academic_status,
        detected_skill_gaps = EXCLUDED.detected_skill_gaps,
        weaknesses_notes = EXCLUDED.weaknesses_notes,
        strengths_notes = EXCLUDED.strengths_notes,
        needs_retraining = EXCLUDED.needs_retraining,
        feedback = EXCLUDED.feedback,
        graded_by = EXCLUDED.graded_by,
        module_grades = EXCLUDED.module_grades,
        graded_at = CURRENT_TIMESTAMP
    `, [
            gradeId,
            eventId,
            participantCard,
            slotId || null,
            computedScore,
            computedStatus,
            skillGaps,
            weaknessesNotes || null,
            strengthsNotes || null,
            Boolean(computedRetraining),
            feedback || null,
            gradedBy || 'Instructor / Evaluador',
            JSON.stringify(Array.isArray(moduleGrades) ? moduleGrades : [])
        ]);
        const result = await client.query(`
      SELECT 
        g.id,
        g.event_id as "eventId",
        g.participant_card as "participantCard",
        p.name as "participantName",
        p.email as "participantEmail",
        p.department as "participantDepartment",
        COALESCE(p.company_id, 'emp_kasino') as "companyId",
        g.slot_id as "slotId",
        g.score,
        g.academic_status as "academicStatus",
        COALESCE(g.detected_skill_gaps, '{}') as "detectedSkillGaps",
        g.weaknesses_notes as "weaknessesNotes",
        g.strengths_notes as "strengthsNotes",
        COALESCE(g.needs_retraining, false) as "needsRetraining",
        g.feedback,
        g.graded_by as "gradedBy",
        to_char(g.graded_at, 'YYYY-MM-DD HH12:MI AM') as "gradedAt",
        COALESCE(g.module_grades, '[]'::jsonb) as "moduleGrades"
      FROM participant_grades g
      JOIN participants p ON g.participant_card = p.card
      WHERE g.event_id = $1 AND g.participant_card = $2
    `, [eventId, participantCard]);
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error('Error al guardar calificación:', err);
        res.status(500).json({ error: 'Error al guardar calificación', details: err.message });
    }
    finally {
        client.release();
    }
});
// POST /api/grades/bulk (Guardar lote de calificaciones para un evento)
exports.gradesRouter.post('/bulk', async (req, res) => {
    const reqUser = req.user;
    const allowedRoles = ['Super Administrador', 'Administrador / Editor', 'Instructor / Evaluador', 'Líder de Área / Supervisor'];
    if (!reqUser || !allowedRoles.includes(reqUser.role)) {
        return res.status(403).json({ error: 'Acceso denegado: No tienes permisos para registrar calificaciones masivas.' });
    }
    const client = await db_js_1.pool.connect();
    try {
        const { grades } = req.body;
        if (!Array.isArray(grades) || grades.length === 0) {
            return res.status(400).json({ error: 'Se espera un array de calificaciones no vacío.' });
        }
        await client.query('BEGIN');
        for (const g of grades) {
            if (!g.eventId || !g.participantCard)
                continue;
            const gradeId = g.id || `grd_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
            const skillGaps = Array.isArray(g.detectedSkillGaps) ? g.detectedSkillGaps : [];
            let scoreVal = g.score !== null && g.score !== undefined && g.score !== '' ? Number(g.score) : null;
            const modGrades = Array.isArray(g.moduleGrades) ? g.moduleGrades : [];
            const validMods = modGrades.filter((m) => m.score !== null && m.score !== undefined && m.score !== '');
            if (validMods.length > 0 && scoreVal === null) {
                const sum = validMods.reduce((acc, curr) => acc + Number(curr.score), 0);
                scoreVal = Math.round((sum / validMods.length) * 100) / 100;
            }
            const passingScore = g.passingScore !== undefined ? Number(g.passingScore) : 70;
            let statusVal = g.academicStatus;
            if (!statusVal) {
                if (scoreVal !== null) {
                    const anyFailed = validMods.some((m) => m.academicStatus === 'failed');
                    statusVal = (!anyFailed && scoreVal >= passingScore) ? 'passed' : 'failed';
                }
                else {
                    statusVal = 'pending';
                }
            }
            const retrainingVal = g.needsRetraining !== undefined ? Boolean(g.needsRetraining) : (statusVal === 'failed');
            await client.query(`
        INSERT INTO participant_grades (
          id, event_id, participant_card, slot_id, score, academic_status, 
          detected_skill_gaps, weaknesses_notes, strengths_notes, needs_retraining, feedback, graded_by, graded_at, module_grades
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, $13)
        ON CONFLICT (event_id, participant_card) DO UPDATE SET
          slot_id = COALESCE(EXCLUDED.slot_id, participant_grades.slot_id),
          score = EXCLUDED.score,
          academic_status = EXCLUDED.academic_status,
          detected_skill_gaps = EXCLUDED.detected_skill_gaps,
          weaknesses_notes = EXCLUDED.weaknesses_notes,
          strengths_notes = EXCLUDED.strengths_notes,
          needs_retraining = EXCLUDED.needs_retraining,
          feedback = EXCLUDED.feedback,
          graded_by = EXCLUDED.graded_by,
          module_grades = EXCLUDED.module_grades,
          graded_at = CURRENT_TIMESTAMP
      `, [
                gradeId,
                g.eventId,
                g.participantCard,
                g.slotId || null,
                scoreVal,
                statusVal,
                skillGaps,
                g.weaknessesNotes || null,
                g.strengthsNotes || null,
                retrainingVal,
                g.feedback || null,
                g.gradedBy || 'Instructor / Evaluador',
                JSON.stringify(modGrades)
            ]);
        }
        await client.query('COMMIT');
        const result = await client.query(`
      SELECT 
        g.id,
        g.event_id as "eventId",
        g.participant_card as "participantCard",
        p.name as "participantName",
        p.email as "participantEmail",
        p.department as "participantDepartment",
        COALESCE(p.company_id, 'emp_kasino') as "companyId",
        g.slot_id as "slotId",
        g.score,
        g.academic_status as "academicStatus",
        COALESCE(g.detected_skill_gaps, '{}') as "detectedSkillGaps",
        g.weaknesses_notes as "weaknessesNotes",
        g.strengths_notes as "strengthsNotes",
        COALESCE(g.needs_retraining, false) as "needsRetraining",
        g.feedback,
        g.graded_by as "gradedBy",
        to_char(g.graded_at, 'YYYY-MM-DD HH12:MI AM') as "gradedAt",
        COALESCE(g.module_grades, '[]'::jsonb) as "moduleGrades"
      FROM participant_grades g
      JOIN participants p ON g.participant_card = p.card
      ORDER BY g.graded_at DESC, p.name ASC
    `);
        res.json({ message: 'Calificaciones actualizadas exitosamente', grades: result.rows });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al guardar calificaciones en lote:', err);
        res.status(500).json({ error: 'Error al procesar calificaciones masivas', details: err.message });
    }
    finally {
        client.release();
    }
});
// DELETE /api/grades/:id
exports.gradesRouter.delete('/:id', async (req, res) => {
    const reqUser = req.user;
    if (!reqUser || !['Super Administrador', 'Administrador / Editor'].includes(reqUser.role)) {
        return res.status(403).json({ error: 'Acceso denegado: Se requieren permisos administrativos para eliminar calificaciones.' });
    }
    try {
        const { id } = req.params;
        await db_js_1.pool.query('DELETE FROM participant_grades WHERE id = $1', [id]);
        res.json({ success: true, message: 'Calificación eliminada correctamente' });
    }
    catch (err) {
        console.error('Error al eliminar calificación:', err);
        res.status(500).json({ error: 'Error al eliminar calificación', details: err.message });
    }
});
