"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.externalTrainingsRouter = void 0;
const express_1 = require("express");
const db_js_1 = require("../db.js");
const crypto_1 = __importDefault(require("crypto"));
exports.externalTrainingsRouter = (0, express_1.Router)();
// GET /api/external-trainings - Listar capacitaciones externas con filtros opcionales
exports.externalTrainingsRouter.get('/', async (req, res) => {
    try {
        const { companyId, participantCard, search } = req.query;
        let query = `
      SELECT 
        et.id,
        et.participant_card AS "participantCard",
        p.name AS "participantName",
        p.email AS "participantEmail",
        p.cedula AS "participantCedula",
        p.department AS "participantDepartment",
        et.title,
        et.session_type AS "sessionType",
        et.training_type AS "trainingType",
        et.training_format AS "trainingFormat",
        et.modality,
        et.program_category AS "programCategory",
        et.subprogram,
        TO_CHAR(et.start_date, 'YYYY-MM-DD') AS "startDate",
        TO_CHAR(et.end_date, 'YYYY-MM-DD') AS "endDate",
        et.total_hours::numeric AS "totalHours",
        et.supplier,
        et.description,
        et.credential_url AS "credentialUrl",
        et.certificate_number AS "certificateNumber",
        et.score::numeric AS "score",
        et.academic_status AS "academicStatus",
        et.company_id AS "companyId",
        et.registered_by AS "registeredBy",
        et.created_at AS "createdAt"
      FROM external_trainings et
      LEFT JOIN participants p ON et.participant_card = p.card
      WHERE 1=1
    `;
        const values = [];
        let paramIndex = 1;
        if (companyId && companyId !== 'all') {
            query += ` AND et.company_id = $${paramIndex++}`;
            values.push(companyId);
        }
        if (participantCard) {
            query += ` AND et.participant_card = $${paramIndex++}`;
            values.push(participantCard);
        }
        if (search && typeof search === 'string' && search.trim()) {
            const term = `%${search.trim().toLowerCase()}%`;
            query += ` AND (
        LOWER(et.title) LIKE $${paramIndex} OR 
        LOWER(et.supplier) LIKE $${paramIndex} OR 
        LOWER(COALESCE(p.name, '')) LIKE $${paramIndex} OR 
        LOWER(et.participant_card) LIKE $${paramIndex}
      )`;
            values.push(term);
            paramIndex++;
        }
        query += ` ORDER BY et.end_date DESC, et.created_at DESC`;
        const result = await db_js_1.pool.query(query, values);
        // Normalizar totalHours y score a número
        const formattedRows = result.rows.map(row => ({
            ...row,
            totalHours: row.totalHours ? Number(row.totalHours) : 0,
            score: row.score !== null && row.score !== undefined ? Number(row.score) : null
        }));
        res.json(formattedRows);
    }
    catch (err) {
        console.error('Error al consultar capacitaciones externas:', err);
        res.status(500).json({ error: 'Error al consultar capacitaciones externas.' });
    }
});
// POST /api/external-trainings/bulk - Registro masivo de histórico de capacitaciones externas
exports.externalTrainingsRouter.post('/bulk', async (req, res) => {
    const client = await db_js_1.pool.connect();
    try {
        const { trainings, defaultCompanyId = 'emp_kasino', registeredBy = 'Super Administrador' } = req.body;
        if (!Array.isArray(trainings) || trainings.length === 0) {
            return res.status(400).json({ error: 'Se esperaba un arreglo no vacío de capacitaciones a importar.' });
        }
        // Cargar participantes para resolución rápida en memoria
        const participantsRes = await client.query('SELECT card, cedula, email, name, company_id FROM participants');
        const participantsByCard = new Map();
        const participantsByCedula = new Map();
        const participantsByEmail = new Map();
        participantsRes.rows.forEach(p => {
            if (p.card)
                participantsByCard.set(String(p.card).trim().toLowerCase(), p);
            if (p.cedula) {
                participantsByCedula.set(String(p.cedula).replace(/\D/g, ''), p);
                participantsByCedula.set(String(p.cedula).trim(), p);
            }
            if (p.email)
                participantsByEmail.set(String(p.email).trim().toLowerCase(), p);
        });
        await client.query('BEGIN');
        const insertedRecords = [];
        const skippedRecords = [];
        for (let idx = 0; idx < trainings.length; idx++) {
            const item = trainings[idx];
            const rowNum = idx + 1;
            // Resolver participante
            let matchedParticipant = null;
            // 1. Por Tarjeta
            if (item.participantCard) {
                matchedParticipant = participantsByCard.get(String(item.participantCard).trim().toLowerCase());
            }
            // 2. Por Cédula (si no coincidió por tarjeta)
            if (!matchedParticipant && item.participantCedula) {
                const cleanCed = String(item.participantCedula).replace(/\D/g, '');
                matchedParticipant = participantsByCedula.get(cleanCed) || participantsByCedula.get(String(item.participantCedula).trim());
            }
            // 3. Por Email (si no coincidió aún)
            if (!matchedParticipant && item.participantEmail) {
                matchedParticipant = participantsByEmail.get(String(item.participantEmail).trim().toLowerCase());
            }
            // Si aún no coincide, verificar si participantCard contenía una cédula o email
            if (!matchedParticipant && item.participantCard) {
                const cleanVal = String(item.participantCard).trim();
                if (cleanVal.includes('@')) {
                    matchedParticipant = participantsByEmail.get(cleanVal.toLowerCase());
                }
                else {
                    matchedParticipant = participantsByCedula.get(cleanVal.replace(/\D/g, '')) || participantsByCedula.get(cleanVal);
                }
            }
            if (!matchedParticipant) {
                skippedRecords.push({
                    row: rowNum,
                    item,
                    reason: `No se encontró colaborador registrado para "${item.participantCard || item.participantCedula || item.participantEmail || 'sin identificador'}".`
                });
                continue;
            }
            const title = (item.title || '').trim();
            if (!title) {
                skippedRecords.push({ row: rowNum, item, reason: 'El título de la capacitación es obligatorio.' });
                continue;
            }
            const startDate = item.startDate ? String(item.startDate).trim() : '';
            const endDate = item.endDate ? String(item.endDate).trim() : startDate;
            if (!startDate) {
                skippedRecords.push({ row: rowNum, item, reason: 'La fecha de la capacitación es obligatoria.' });
                continue;
            }
            const totalHours = Number(item.totalHours) > 0 ? Number(item.totalHours) : 1;
            const supplier = (item.supplier || 'Externo').trim();
            const sessionType = item.sessionType || 'Asincrónica';
            const trainingType = item.trainingType || 'Técnico';
            const trainingFormat = item.trainingFormat || 'Curso';
            const modality = item.modality || 'Virtual';
            const programCategory = item.programCategory || 'Capacitacion_tecnologica_digital';
            const subprogram = item.subprogram || 'Desarrollo de software';
            const description = item.description || '';
            const credentialUrl = item.credentialUrl || null;
            const certificateNumber = item.certificateNumber || null;
            const score = item.score !== undefined && item.score !== null && item.score !== '' ? Number(item.score) : null;
            const academicStatus = item.academicStatus || 'passed';
            const companyId = item.companyId || matchedParticipant.company_id || defaultCompanyId;
            const extId = `ext_${Date.now()}_${crypto_1.default.randomBytes(3).toString('hex')}_${idx}`;
            const insertQuery = `
        INSERT INTO external_trainings (
          id, participant_card, title, session_type, training_type,
          training_format, modality, program_category, subprogram,
          start_date, end_date, total_hours, supplier, description,
          credential_url, certificate_number, score, academic_status,
          company_id, registered_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          $15, $16, $17, $18,
          $19, $20
        ) RETURNING *;
      `;
            const resInsert = await client.query(insertQuery, [
                extId,
                matchedParticipant.card,
                title,
                sessionType,
                trainingType,
                trainingFormat,
                modality,
                programCategory,
                subprogram,
                startDate,
                endDate,
                totalHours,
                supplier,
                description,
                credentialUrl,
                certificateNumber,
                score,
                academicStatus,
                companyId,
                registeredBy
            ]);
            insertedRecords.push({
                ...resInsert.rows[0],
                participantCard: matchedParticipant.card,
                participantName: matchedParticipant.name,
                participantEmail: matchedParticipant.email,
                participantCedula: matchedParticipant.cedula,
                totalHours: Number(resInsert.rows[0].total_hours || totalHours),
                score: resInsert.rows[0].score !== null ? Number(resInsert.rows[0].score) : null
            });
        }
        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            message: `Se registraron ${insertedRecords.length} capacitaciones externas con éxito.`,
            count: insertedRecords.length,
            skippedCount: skippedRecords.length,
            records: insertedRecords,
            skipped: skippedRecords
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Error en carga masiva de capacitaciones externas:', err);
        res.status(500).json({ error: 'Error al procesar la carga masiva: ' + err.message });
    }
    finally {
        client.release();
    }
});
// POST /api/external-trainings - Registrar nueva(s) capacitación(es) externa(s)
exports.externalTrainingsRouter.post('/', async (req, res) => {
    try {
        const { participantCards, participantCard, title, sessionType = 'Asincrónica', trainingType = 'Técnico', trainingFormat = 'Curso', modality = 'Virtual', programCategory = 'Capacitacion_tecnologica_digital', subprogram = 'Desarrollo de software', startDate, endDate, totalHours = 1, supplier = 'Externo', description = '', credentialUrl = null, certificateNumber = null, score = null, academicStatus = 'passed', companyId = 'emp_kasino', registeredBy = 'Super Administrador' } = req.body;
        if (!title || !startDate || !endDate) {
            return res.status(400).json({ error: 'El título, fecha de inicio y fecha de fin son obligatorios.' });
        }
        // Unificar lista de participantes a los que aplica
        let cards = [];
        if (Array.isArray(participantCards) && participantCards.length > 0) {
            cards = participantCards;
        }
        else if (participantCard) {
            cards = [participantCard];
        }
        else {
            return res.status(400).json({ error: 'Debe seleccionar al menos un colaborador.' });
        }
        const insertedRecords = [];
        for (const card of cards) {
            const extId = `ext_${Date.now()}_${crypto_1.default.randomBytes(3).toString('hex')}`;
            const insertQuery = `
        INSERT INTO external_trainings (
          id, participant_card, title, session_type, training_type,
          training_format, modality, program_category, subprogram,
          start_date, end_date, total_hours, supplier, description,
          credential_url, certificate_number, score, academic_status,
          company_id, registered_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          $15, $16, $17, $18,
          $19, $20
        ) RETURNING *;
      `;
            const resInsert = await db_js_1.pool.query(insertQuery, [
                extId,
                card,
                title,
                sessionType,
                trainingType,
                trainingFormat,
                modality,
                programCategory,
                subprogram,
                startDate,
                endDate,
                Number(totalHours) || 1,
                supplier || 'Externo',
                description || '',
                credentialUrl || null,
                certificateNumber || null,
                score !== null && score !== undefined && score !== '' ? Number(score) : null,
                academicStatus || 'passed',
                companyId || 'emp_kasino',
                registeredBy || 'Super Administrador'
            ]);
            insertedRecords.push(resInsert.rows[0]);
        }
        res.status(201).json({
            message: `Capacitación externa registrada con éxito para ${insertedRecords.length} colaborador(es).`,
            count: insertedRecords.length,
            records: insertedRecords
        });
    }
    catch (err) {
        console.error('Error al registrar capacitación externa:', err);
        res.status(500).json({ error: 'Error al registrar capacitación externa: ' + err.message });
    }
});
// PUT /api/external-trainings/:id - Actualizar una capacitación externa
exports.externalTrainingsRouter.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, sessionType, trainingType, trainingFormat, modality, programCategory, subprogram, startDate, endDate, totalHours, supplier, description, credentialUrl, certificateNumber, score, academicStatus, companyId } = req.body;
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (title !== undefined) {
            updates.push(`title = $${paramIndex++}`);
            values.push(title);
        }
        if (sessionType !== undefined) {
            updates.push(`session_type = $${paramIndex++}`);
            values.push(sessionType);
        }
        if (trainingType !== undefined) {
            updates.push(`training_type = $${paramIndex++}`);
            values.push(trainingType);
        }
        if (trainingFormat !== undefined) {
            updates.push(`training_format = $${paramIndex++}`);
            values.push(trainingFormat);
        }
        if (modality !== undefined) {
            updates.push(`modality = $${paramIndex++}`);
            values.push(modality);
        }
        if (programCategory !== undefined) {
            updates.push(`program_category = $${paramIndex++}`);
            values.push(programCategory);
        }
        if (subprogram !== undefined) {
            updates.push(`subprogram = $${paramIndex++}`);
            values.push(subprogram);
        }
        if (startDate !== undefined) {
            updates.push(`start_date = $${paramIndex++}`);
            values.push(startDate);
        }
        if (endDate !== undefined) {
            updates.push(`end_date = $${paramIndex++}`);
            values.push(endDate);
        }
        if (totalHours !== undefined) {
            updates.push(`total_hours = $${paramIndex++}`);
            values.push(Number(totalHours) || 0);
        }
        if (supplier !== undefined) {
            updates.push(`supplier = $${paramIndex++}`);
            values.push(supplier);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(description);
        }
        if (credentialUrl !== undefined) {
            updates.push(`credential_url = $${paramIndex++}`);
            values.push(credentialUrl || null);
        }
        if (certificateNumber !== undefined) {
            updates.push(`certificate_number = $${paramIndex++}`);
            values.push(certificateNumber || null);
        }
        if (score !== undefined) {
            updates.push(`score = $${paramIndex++}`);
            values.push(score !== null && score !== '' ? Number(score) : null);
        }
        if (academicStatus !== undefined) {
            updates.push(`academic_status = $${paramIndex++}`);
            values.push(academicStatus);
        }
        if (companyId !== undefined) {
            updates.push(`company_id = $${paramIndex++}`);
            values.push(companyId);
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron campos para actualizar.' });
        }
        values.push(id);
        const updateQuery = `
      UPDATE external_trainings
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;
        const result = await db_js_1.pool.query(updateQuery, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Capacitación externa no encontrada.' });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error('Error al actualizar capacitación externa:', err);
        res.status(500).json({ error: 'Error al actualizar capacitación externa.' });
    }
});
// DELETE /api/external-trainings/:id - Eliminar una capacitación externa
exports.externalTrainingsRouter.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db_js_1.pool.query('DELETE FROM external_trainings WHERE id = $1 RETURNING id;', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Capacitación externa no encontrada.' });
        }
        res.json({ success: true, message: 'Capacitación externa eliminada con éxito.' });
    }
    catch (err) {
        console.error('Error al eliminar capacitación externa:', err);
        res.status(500).json({ error: 'Error al eliminar capacitación externa.' });
    }
});
