"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const events_js_1 = require("./routes/events.js");
const participants_js_1 = require("./routes/participants.js");
const registrations_js_1 = require("./routes/registrations.js");
const attendance_js_1 = require("./routes/attendance.js");
const users_js_1 = require("./routes/users.js");
const feedback_js_1 = require("./routes/feedback.js");
const notifications_js_1 = require("./routes/notifications.js");
const groups_js_1 = require("./routes/groups.js");
const programs_js_1 = require("./routes/programs.js");
const db_js_1 = require("./db.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health Check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'online',
        service: 'CapacitaHub API Backend',
        timestamp: new Date().toISOString()
    });
});
// Rutas de la API
app.use('/api/events', events_js_1.eventsRouter);
app.use('/api/participants', participants_js_1.participantsRouter);
app.use('/api/registrations', registrations_js_1.registrationsRouter);
app.use('/api/attendance', attendance_js_1.attendanceRouter);
app.use('/api/users', users_js_1.usersRouter);
app.use('/api/feedback', feedback_js_1.feedbackRouter);
app.use('/api/notifications', notifications_js_1.notificationsRouter);
app.use('/api/groups', groups_js_1.groupsRouter);
app.use('/api/programs', programs_js_1.programsRouter);
// Iniciar Servidor
app.listen(PORT, async () => {
    console.log(`=========================================`);
    console.log(`🚀 Servidor CapacitaHub API en ejecución`);
    console.log(`📡 Puerto: http://localhost:${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`=========================================`);
    await (0, db_js_1.initDbMigrations)();
});
