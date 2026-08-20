"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.programsRouter = void 0;
exports.fetchFullPrograms = fetchFullPrograms;
const express_1 = require("express");
const db_js_1 = require("../db.js");
exports.programsRouter = (0, express_1.Router)();
/**
 * Helper para obtener todos los programas con eventos y grupos asignados
 */
async function fetchFullPrograms() {
    const result = await db_js_1.pool.query(`
    SELECT * FROM training_programs ORDER BY created_at DESC
  `);
    const programs = [];
    for (const prog of result.rows) {
        // 1. Obtener eventos asignados
        const eventsRes = await db_js_1.pool.query(`
      SELECT event_id, is_mandatory, order_index
      FROM program_events
      WHERE program_id = $1
      ORDER BY order_index ASC, event_id ASC
    `, [prog.id]);
        // 2. Obtener grupos asignados
        const groupsRes = await db_js_1.pool.query(`
      SELECT group_id
      FROM program_target_groups
      WHERE program_id = $1
    `, [prog.id]);
        // 3. Obtener participantes específicos asignados
        const participantsRes = await db_js_1.pool.query(`
      SELECT participant_card
      FROM program_target_participants
      WHERE program_id = $1
    `, [prog.id]);
        programs.push({
            id: prog.id,
            title: prog.title,
            description: prog.description || '',
            startDate: prog.start_date ? new Date(prog.start_date).toISOString().slice(0, 10) : '',
            endDate: prog.end_date ? new Date(prog.end_date).toISOString().slice(0, 10) : '',
            status: prog.status || 'active',
            eventItems: eventsRes.rows.map(r => ({
                eventId: r.event_id,
                isMandatory: r.is_mandatory,
                orderIndex: r.order_index
            })),
            targetGroupIds: groupsRes.rows.map(r => r.group_id),
            targetParticipantCards: participantsRes.rows.map(r => r.participant_card),
            createdAt: prog.created_at ? new Date(prog.created_at).toISOString() : new Date().toISOString()
        });
    }
    return programs;
}
// GET /api/programs
exports.programsRouter.get('/', async (_req, res) => {
    try {
        const programs = await fetchFullPrograms();
        res.json(programs);
    }
    catch (err) {
        console.error('Error al obtener programas formativos:', err);
        res.status(500).json({ error: 'Error al consultar programas en PostgreSQL', details: err.message });
    }
});
// POST /api/programs
exports.programsRouter.post('/', async (req, res) => {
    const client = await db_js_1.pool.connect();
    try {
        const { id, title, description, startDate, endDate, status, eventItems, targetGroupIds, targetParticipantCards } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'El título del programa es obligatorio.' });
        }
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Las fechas de inicio y fin son obligatorias.' });
        }
        const programId = id || `prog_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        await client.query('BEGIN');
        // 1. Insertar / Actualizar programa
        await client.query(`
      INSERT INTO training_programs (id, title, description, start_date, end_date, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status
    `, [
            programId,
            title.trim(),
            description || '',
            startDate,
            endDate,
            status || 'active'
        ]);
        // 2. Sincronizar eventos
        await client.query('DELETE FROM program_events WHERE program_id = $1', [programId]);
        if (Array.isArray(eventItems) && eventItems.length > 0) {
            for (let i = 0; i < eventItems.length; i++) {
                const item = eventItems[i];
                if (!item.eventId)
                    continue;
                await client.query(`
          INSERT INTO program_events (program_id, event_id, is_mandatory, order_index)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `, [programId, item.eventId, item.isMandatory !== false, item.orderIndex ?? (i + 1)]);
            }
        }
        // 3. Sincronizar grupos
        await client.query('DELETE FROM program_target_groups WHERE program_id = $1', [programId]);
        if (Array.isArray(targetGroupIds) && targetGroupIds.length > 0) {
            for (const grpId of targetGroupIds) {
                if (!grpId)
                    continue;
                await client.query(`
          INSERT INTO program_target_groups (program_id, group_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [programId, grpId]);
            }
        }
        // 4. Sincronizar participantes directos
        await client.query('DELETE FROM program_target_participants WHERE program_id = $1', [programId]);
        if (Array.isArray(targetParticipantCards) && targetParticipantCards.length > 0) {
            for (const card of targetParticipantCards) {
                if (!card)
                    continue;
                await client.query(`
          INSERT INTO program_target_participants (program_id, participant_card)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [programId, card.trim()]);
            }
        }
        await client.query('COMMIT');
        const updatedPrograms = await fetchFullPrograms();
        res.json(updatedPrograms);
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al guardar programa formativo:', err);
        res.status(500).json({ error: 'Error al guardar programa en PostgreSQL', details: err.message });
    }
    finally {
        client.release();
    }
});
// DELETE /api/programs/:id
exports.programsRouter.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db_js_1.pool.query('DELETE FROM training_programs WHERE id = $1', [id]);
        const updatedPrograms = await fetchFullPrograms();
        res.json(updatedPrograms);
    }
    catch (err) {
        console.error('Error al eliminar programa:', err);
        res.status(500).json({ error: 'Error al eliminar programa', details: err.message });
    }
});
