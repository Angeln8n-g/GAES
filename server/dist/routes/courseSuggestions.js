"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseSuggestionsRouter = void 0;
const express_1 = require("express");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middlewares/auth.js");
exports.courseSuggestionsRouter = (0, express_1.Router)();
// Helper para encontrar datos del participante a partir del usuario autenticado
async function getParticipantInfo(user) {
    if (!user)
        return null;
    // 1. Buscar en tabla participants por email
    const pRes = await db_js_1.pool.query('SELECT card, name, email, cedula, company_id FROM participants WHERE LOWER(email) = LOWER($1) LIMIT 1', [user.email]);
    if (pRes.rows.length > 0) {
        const row = pRes.rows[0];
        return {
            card: row.card,
            name: row.name,
            email: row.email,
            cedula: row.cedula || '',
            companyId: row.company_id || 'emp_kasino'
        };
    }
    // 2. Si no existe como participante pero existe en users_simulated
    const uRes = await db_js_1.pool.query('SELECT id, name, email, cedula, company_id FROM users_simulated WHERE id = $1 OR LOWER(email) = LOWER($2) LIMIT 1', [user.id, user.email]);
    if (uRes.rows.length > 0) {
        const row = uRes.rows[0];
        return {
            card: row.id,
            name: row.name,
            email: row.email,
            cedula: row.cedula || '',
            companyId: row.company_id || 'emp_kasino'
        };
    }
    return {
        card: String(user.id || user.email),
        name: user.name || user.email,
        email: user.email,
        cedula: '',
        companyId: user.companyId || 'emp_kasino'
    };
}
// ==========================================
// 1. LISTAR CURSOS SUGERIDOS & LISTAS DE ESPERA
// GET /api/course-suggestions
// ==========================================
exports.courseSuggestionsRouter.get('/', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const { status, category, companyId, search } = req.query;
        let query = `
      SELECT 
        s.*,
        COALESCE(c.name, s.company_id, 'Claro Dominicana') as company_name,
        (SELECT COUNT(*)::int FROM course_waitlist_entries w WHERE w.suggestion_id = s.id) as real_quorum_count
      FROM course_suggestions s
      LEFT JOIN companies c ON s.company_id = c.id
      WHERE 1=1
    `;
        const params = [];
        let idx = 1;
        if (status && typeof status === 'string' && status !== 'all') {
            query += ` AND s.status = $${idx++}`;
            params.push(status);
        }
        if (category && typeof category === 'string' && category !== 'Todos') {
            query += ` AND s.category = $${idx++}`;
            params.push(category);
        }
        if (companyId && typeof companyId === 'string' && companyId !== 'all') {
            query += ` AND (s.company_id = $${idx++} OR s.company_id = 'all')`;
            params.push(companyId);
        }
        if (search && typeof search === 'string') {
            query += ` AND (s.title ILIKE $${idx} OR s.description ILIKE $${idx} OR s.category ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }
        query += ' ORDER BY (s.status = \'quorum_alcanzado\') DESC, s.created_at DESC';
        const result = await db_js_1.pool.query(query, params);
        // Obtener las inscripciones del usuario actual para marcar isUserInWaitlist
        const partInfo = await getParticipantInfo(user);
        const userCard = partInfo?.card;
        let userWaitlistSet = new Set();
        if (userCard) {
            const uwRes = await db_js_1.pool.query('SELECT suggestion_id FROM course_waitlist_entries WHERE participant_card = $1 OR LOWER(participant_email) = LOWER($2)', [userCard, user?.email || '']);
            userWaitlistSet = new Set(uwRes.rows.map(r => r.suggestion_id));
        }
        // Obtener detalles de lista de espera si es administrador/evaluador
        const isPrivileged = user && (user.role === 'Super Administrador' || user.role === 'Administrador / Editor' || user.role === 'Evaluador / Tutor');
        const suggestions = await Promise.all(result.rows.map(async (row) => {
            let waitlistEntries = [];
            if (isPrivileged) {
                const wRes = await db_js_1.pool.query(`
          SELECT 
            w.id,
            w.participant_card,
            w.participant_name,
            w.participant_email,
            w.participant_cedula,
            COALESCE(c.name, w.company_id, 'Claro') as company_name,
            w.preferred_schedule,
            w.notes,
            w.created_at
          FROM course_waitlist_entries w
          LEFT JOIN companies c ON w.company_id = c.id
          WHERE w.suggestion_id = $1
          ORDER BY w.created_at ASC;
        `, [row.id]);
                waitlistEntries = wRes.rows.map(w => ({
                    id: w.id,
                    participantCard: w.participant_card,
                    participantName: w.participant_name,
                    participantEmail: w.participant_email,
                    participantCedula: w.participant_cedula,
                    companyName: w.company_name,
                    preferredSchedule: w.preferred_schedule,
                    notes: w.notes,
                    createdAt: w.created_at
                }));
            }
            return {
                id: row.id,
                title: row.title,
                description: row.description || '',
                category: row.category || 'Curso',
                modality: row.modality || 'Presencial',
                targetHours: Number(row.target_hours) || 8,
                minQuorum: Number(row.min_quorum) || 10,
                currentQuorum: Number(row.real_quorum_count) || 0,
                status: row.status,
                suggestedByCard: row.suggested_by_card,
                suggestedByName: row.suggested_by_name,
                suggestedByEmail: row.suggested_by_email,
                companyId: row.company_id,
                companyName: row.company_name,
                linkedEventId: row.linked_event_id,
                adminNotes: row.admin_notes,
                tags: row.tags || [],
                isUserInWaitlist: userWaitlistSet.has(row.id),
                waitlist: waitlistEntries,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        }));
        return res.json(suggestions);
    }
    catch (error) {
        console.error('Error al listar sugerencias de cursos:', error);
        return res.status(500).json({ error: 'Error interno al consultar sugerencias de cursos.' });
    }
});
// ==========================================
// 2. CREAR NUEVA SUGERENCIA DE CURSO
// POST /api/course-suggestions
// ==========================================
exports.courseSuggestionsRouter.post('/', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const { title, description, category, modality, targetHours, minQuorum, companyId, tags, preferredSchedule, notes } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'El título del curso propuesto es obligatorio.' });
        }
        const partInfo = await getParticipantInfo(user);
        // Insertar curso sugerido
        const insertRes = await db_js_1.pool.query(`
      INSERT INTO course_suggestions (
        title,
        description,
        category,
        modality,
        target_hours,
        min_quorum,
        current_quorum,
        status,
        suggested_by_card,
        suggested_by_name,
        suggested_by_email,
        company_id,
        tags
      ) VALUES ($1, $2, $3, $4, $5, $6, 1, 'recolectando_quorum', $7, $8, $9, $10, $11)
      RETURNING *;
    `, [
            title.trim(),
            description || '',
            category || 'Curso',
            modality || 'Presencial',
            Number(targetHours) || 8,
            Number(minQuorum) || 10,
            partInfo?.card || null,
            partInfo?.name || user?.name || 'Colaborador',
            partInfo?.email || user?.email || '',
            companyId || partInfo?.companyId || 'all',
            Array.isArray(tags) ? tags : []
        ]);
        const newSuggestion = insertRes.rows[0];
        // Inscribir automáticamente al proponente como el primer integrante de la lista de espera
        if (partInfo?.card) {
            await db_js_1.pool.query(`
        INSERT INTO course_waitlist_entries (
          suggestion_id,
          participant_card,
          participant_name,
          participant_email,
          participant_cedula,
          company_id,
          preferred_schedule,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (suggestion_id, participant_card) DO NOTHING;
      `, [
                newSuggestion.id,
                partInfo.card,
                partInfo.name,
                partInfo.email,
                partInfo.cedula,
                partInfo.companyId,
                preferredSchedule || 'Cualquiera',
                notes || 'Proponente inicial del curso'
            ]);
        }
        return res.status(201).json({
            success: true,
            message: 'Propuesta de curso creada con éxito. Has sido añadido a la lista de espera.',
            suggestion: {
                id: newSuggestion.id,
                title: newSuggestion.title,
                description: newSuggestion.description,
                category: newSuggestion.category,
                modality: newSuggestion.modality,
                targetHours: Number(newSuggestion.target_hours),
                minQuorum: Number(newSuggestion.min_quorum),
                currentQuorum: 1,
                status: newSuggestion.status,
                isUserInWaitlist: true,
                createdAt: newSuggestion.created_at
            }
        });
    }
    catch (error) {
        console.error('Error al proponer curso:', error);
        return res.status(500).json({ error: 'Error interno al registrar la sugerencia de curso.' });
    }
});
// ==========================================
// 3. UNIRSE A LA LISTA DE ESPERA
// POST /api/course-suggestions/:id/join-waitlist
// ==========================================
exports.courseSuggestionsRouter.post('/:id/join-waitlist', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { preferredSchedule, notes } = req.body;
        const partInfo = await getParticipantInfo(user);
        if (!partInfo || !partInfo.card) {
            return res.status(400).json({ error: 'No se identificó el carnet del participante.' });
        }
        // Verificar si el curso propuesto existe
        const sugRes = await db_js_1.pool.query('SELECT * FROM course_suggestions WHERE id = $1', [id]);
        if (sugRes.rows.length === 0) {
            return res.status(404).json({ error: 'Curso sugerido no encontrado.' });
        }
        const suggestion = sugRes.rows[0];
        // Inscribir en la lista de espera
        await db_js_1.pool.query(`
      INSERT INTO course_waitlist_entries (
        suggestion_id,
        participant_card,
        participant_name,
        participant_email,
        participant_cedula,
        company_id,
        preferred_schedule,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (suggestion_id, participant_card) 
      DO UPDATE SET 
        preferred_schedule = EXCLUDED.preferred_schedule, 
        notes = EXCLUDED.notes;
    `, [
            id,
            partInfo.card,
            partInfo.name,
            partInfo.email,
            partInfo.cedula,
            partInfo.companyId,
            preferredSchedule || 'Cualquiera',
            notes || ''
        ]);
        // Recalcular quórum real
        const countRes = await db_js_1.pool.query('SELECT COUNT(*)::int as count FROM course_waitlist_entries WHERE suggestion_id = $1', [id]);
        const newCount = countRes.rows[0].count;
        // Si alcanza o supera el quórum mínimo, actualizar estado a 'quorum_alcanzado'
        let newStatus = suggestion.status;
        if (newCount >= suggestion.min_quorum && suggestion.status === 'recolectando_quorum') {
            newStatus = 'quorum_alcanzado';
        }
        await db_js_1.pool.query('UPDATE course_suggestions SET current_quorum = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [newCount, newStatus, id]);
        return res.json({
            success: true,
            message: `Te has inscrito en la lista de espera. Quórum actual: ${newCount} / ${suggestion.min_quorum}`,
            currentQuorum: newCount,
            minQuorum: suggestion.min_quorum,
            status: newStatus,
            isUserInWaitlist: true
        });
    }
    catch (error) {
        console.error('Error al unirse a lista de espera:', error);
        return res.status(500).json({ error: 'Error interno al unirse a la lista de espera.' });
    }
});
// ==========================================
// 4. SALIR DE LA LISTA DE ESPERA
// DELETE /api/course-suggestions/:id/leave-waitlist
// ==========================================
exports.courseSuggestionsRouter.delete('/:id/leave-waitlist', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const partInfo = await getParticipantInfo(user);
        if (!partInfo || !partInfo.card) {
            return res.status(400).json({ error: 'No se identificó el participante.' });
        }
        await db_js_1.pool.query('DELETE FROM course_waitlist_entries WHERE suggestion_id = $1 AND (participant_card = $2 OR LOWER(participant_email) = LOWER($3))', [id, partInfo.card, user?.email || '']);
        // Recalcular quórum
        const countRes = await db_js_1.pool.query('SELECT COUNT(*)::int as count FROM course_waitlist_entries WHERE suggestion_id = $1', [id]);
        const newCount = countRes.rows[0].count;
        // Obtener quórum mínimo
        const sugRes = await db_js_1.pool.query('SELECT min_quorum, status FROM course_suggestions WHERE id = $1', [id]);
        let newStatus = sugRes.rows[0]?.status;
        if (sugRes.rows.length > 0) {
            const minQuorum = sugRes.rows[0].min_quorum;
            if (newCount < minQuorum && sugRes.rows[0].status === 'quorum_alcanzado') {
                newStatus = 'recolectando_quorum';
            }
        }
        await db_js_1.pool.query('UPDATE course_suggestions SET current_quorum = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [newCount, newStatus, id]);
        return res.json({
            success: true,
            message: 'Has salido de la lista de espera.',
            currentQuorum: newCount,
            status: newStatus,
            isUserInWaitlist: false
        });
    }
    catch (error) {
        console.error('Error al salir de lista de espera:', error);
        return res.status(500).json({ error: 'Error interno al salir de la lista de espera.' });
    }
});
// ==========================================
// 5. MIS LISTAS DE ESPERA (VISTA DEL ALUMNO)
// GET /api/course-suggestions/my-waitlist
// ==========================================
exports.courseSuggestionsRouter.get('/my-waitlist', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const partInfo = await getParticipantInfo(user);
        if (!partInfo || !partInfo.card) {
            return res.json([]);
        }
        const query = `
      SELECT 
        s.*,
        w.id as entry_id,
        w.preferred_schedule,
        w.notes as user_notes,
        w.created_at as joined_at,
        (SELECT COUNT(*)::int FROM course_waitlist_entries cw WHERE cw.suggestion_id = s.id AND cw.created_at <= w.created_at) as user_queue_position,
        (SELECT COUNT(*)::int FROM course_waitlist_entries cw WHERE cw.suggestion_id = s.id) as real_quorum_count
      FROM course_waitlist_entries w
      JOIN course_suggestions s ON w.suggestion_id = s.id
      WHERE w.participant_card = $1 OR LOWER(w.participant_email) = LOWER($2)
      ORDER BY w.created_at DESC;
    `;
        const result = await db_js_1.pool.query(query, [partInfo.card, user?.email || '']);
        const items = result.rows.map(r => ({
            entryId: r.entry_id,
            suggestionId: r.id,
            title: r.title,
            description: r.description,
            category: r.category,
            modality: r.modality,
            targetHours: Number(r.target_hours),
            minQuorum: Number(r.min_quorum),
            currentQuorum: Number(r.real_quorum_count),
            status: r.status,
            linkedEventId: r.linked_event_id,
            userQueuePosition: Number(r.user_queue_position) || 1,
            preferredSchedule: r.preferred_schedule,
            joinedAt: r.joined_at,
            createdAt: r.created_at
        }));
        return res.json(items);
    }
    catch (error) {
        console.error('Error al consultar mis listas de espera:', error);
        return res.status(500).json({ error: 'Error interno al consultar mis listas de espera.' });
    }
});
// ==========================================
// 6. ACTUALIZAR ESTADO (ADMIN)
// PATCH /api/course-suggestions/:id/status
// ==========================================
exports.courseSuggestionsRouter.patch('/:id/status', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if (!user || (user.role !== 'Super Administrador' && user.role !== 'Administrador / Editor')) {
            return res.status(403).json({ error: 'Solo administradores pueden cambiar el estado de solicitudes.' });
        }
        const { id } = req.params;
        const { status, adminNotes } = req.body;
        const validStatuses = ['recolectando_quorum', 'quorum_alcanzado', 'programado', 'en_evaluacion', 'rechazado'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Estado inválido.' });
        }
        const result = await db_js_1.pool.query(`
      UPDATE course_suggestions 
      SET status = $1, admin_notes = COALESCE($2, admin_notes), updated_at = CURRENT_TIMESTAMP 
      WHERE id = $3
      RETURNING *;
    `, [status, adminNotes || null, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sugerencia no encontrada.' });
        }
        return res.json({ success: true, message: 'Estado actualizado.', suggestion: result.rows[0] });
    }
    catch (error) {
        console.error('Error al actualizar estado de sugerencia:', error);
        return res.status(500).json({ error: 'Error interno al actualizar estado.' });
    }
});
// ==========================================
// 7. ACTUALIZAR QUÓRUM OBJETIVO (ADMIN)
// PATCH /api/course-suggestions/:id/quorum
// ==========================================
exports.courseSuggestionsRouter.patch('/:id/quorum', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if (!user || (user.role !== 'Super Administrador' && user.role !== 'Administrador / Editor')) {
            return res.status(403).json({ error: 'Permisos insuficientes.' });
        }
        const { id } = req.params;
        const { minQuorum } = req.body;
        const parsedMin = parseInt(minQuorum, 10);
        if (isNaN(parsedMin) || parsedMin < 1) {
            return res.status(400).json({ error: 'El quórum mínimo debe ser un número entero mayor a 0.' });
        }
        // Actualizar y verificar si cambia estado
        const sugRes = await db_js_1.pool.query('SELECT current_quorum, status FROM course_suggestions WHERE id = $1', [id]);
        if (sugRes.rows.length === 0) {
            return res.status(404).json({ error: 'Sugerencia no encontrada.' });
        }
        const cur = sugRes.rows[0];
        let newStatus = cur.status;
        if (cur.current_quorum >= parsedMin && cur.status === 'recolectando_quorum') {
            newStatus = 'quorum_alcanzado';
        }
        else if (cur.current_quorum < parsedMin && cur.status === 'quorum_alcanzado') {
            newStatus = 'recolectando_quorum';
        }
        const updateRes = await db_js_1.pool.query('UPDATE course_suggestions SET min_quorum = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *', [parsedMin, newStatus, id]);
        return res.json({ success: true, message: 'Quórum ajustado correctamente.', suggestion: updateRes.rows[0] });
    }
    catch (error) {
        console.error('Error al ajustar quórum:', error);
        return res.status(500).json({ error: 'Error interno al ajustar quórum.' });
    }
});
// ==========================================
// 8. ELIMINAR SUGERENCIA
// DELETE /api/course-suggestions/:id
// ==========================================
exports.courseSuggestionsRouter.delete('/:id', auth_js_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if (!user || user.role !== 'Super Administrador') {
            return res.status(403).json({ error: 'Solo el Super Administrador puede eliminar solicitudes.' });
        }
        const { id } = req.params;
        await db_js_1.pool.query('DELETE FROM course_suggestions WHERE id = $1', [id]);
        return res.json({ success: true, message: 'Propuesta de curso eliminada.' });
    }
    catch (error) {
        console.error('Error al eliminar sugerencia:', error);
        return res.status(500).json({ error: 'Error interno al eliminar sugerencia.' });
    }
});
