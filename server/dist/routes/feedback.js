"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackRouter = void 0;
const express_1 = require("express");
const db_js_1 = require("../db.js");
const events_js_1 = require("./events.js");
exports.feedbackRouter = (0, express_1.Router)();
// POST /api/feedback
exports.feedbackRouter.post('/', async (req, res) => {
    try {
        const { eventId, userEmail, userName, rating, comment } = req.body;
        if (!eventId || !userEmail || !rating) {
            return res.status(400).json({ error: 'eventId, userEmail y rating son requeridos.' });
        }
        await db_js_1.pool.query(`INSERT INTO event_feedbacks (event_id, user_email, user_name, rating, comment)
       VALUES ($1, $2, $3, $4, $5)`, [eventId, userEmail.trim().toLowerCase(), userName || null, rating, comment || null]);
        const fullEvents = await (0, events_js_1.fetchFullEvents)();
        res.json(fullEvents);
    }
    catch (err) {
        console.error('Error al guardar feedback:', err);
        res.status(500).json({ error: 'Error al registrar evaluación', details: err.message });
    }
});
