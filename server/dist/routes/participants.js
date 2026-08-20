"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.participantsRouter = void 0;
const express_1 = require("express");
const db_js_1 = require("../db.js");
exports.participantsRouter = (0, express_1.Router)();
// GET /api/participants
exports.participantsRouter.get('/', async (_req, res) => {
    try {
        const result = await db_js_1.pool.query('SELECT card, name, email, cedula FROM participants ORDER BY name ASC');
        res.json(result.rows);
    }
    catch (err) {
        if (err.message && (err.message.includes('cedula') || err.message.includes('does not exist'))) {
            try {
                await db_js_1.pool.query('ALTER TABLE participants ADD COLUMN IF NOT EXISTS cedula VARCHAR(20)');
                const retryResult = await db_js_1.pool.query('SELECT card, name, email, cedula FROM participants ORDER BY name ASC');
                return res.json(retryResult.rows);
            }
            catch (inner) {
                console.error('Error al auto-migrar columna cedula en participants:', inner);
            }
        }
        console.error('Error al obtener participantes:', err);
        res.status(500).json({ error: 'Error al consultar participantes en PostgreSQL', details: err.message });
    }
});
// POST /api/participants/bulk
exports.participantsRouter.post('/bulk', async (req, res) => {
    const client = await db_js_1.pool.connect();
    try {
        const { participants } = req.body;
        if (!Array.isArray(participants)) {
            return res.status(400).json({ error: 'Formato inválido. Se espera una lista de participantes.' });
        }
        await client.query('BEGIN');
        for (const p of participants) {
            if (!p.card || !p.name || !p.email)
                continue;
            await client.query(`INSERT INTO participants (card, name, email, cedula)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (card) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           cedula = COALESCE(EXCLUDED.cedula, participants.cedula)`, [p.card.trim(), p.name.trim().toUpperCase(), p.email.trim().toLowerCase(), p.cedula ? p.cedula.trim() : null]);
        }
        await client.query('COMMIT');
        const result = await client.query('SELECT card, name, email, cedula FROM participants ORDER BY name ASC');
        res.json(result.rows);
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Error en carga masiva de participantes:', err);
        res.status(500).json({ error: 'Error al guardar participantes', details: err.message });
    }
    finally {
        client.release();
    }
});
