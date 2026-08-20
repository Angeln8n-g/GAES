"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRouter = void 0;
const express_1 = require("express");
const db_js_1 = require("../db.js");
exports.notificationsRouter = (0, express_1.Router)();
// POST /api/notifications/log
exports.notificationsRouter.post('/log', async (req, res) => {
    try {
        const { eventId, channel, status, recipients } = req.body;
        if (!eventId || !channel || recipients === undefined) {
            return res.status(400).json({ error: 'Faltan parámetros requeridos para el log de notificación.' });
        }
        await db_js_1.pool.query(`INSERT INTO notification_logs (event_id, channel, status, recipients)
       VALUES ($1, $2, $3, $4)`, [eventId, channel, status || 'Enviado', recipients]);
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error al registrar log de notificación:', err);
        res.status(500).json({ error: 'Error al registrar log de notificación', details: err.message });
    }
});
