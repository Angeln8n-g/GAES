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
const companies_js_1 = require("./routes/companies.js");
const grades_js_1 = require("./routes/grades.js");
const settings_js_1 = __importDefault(require("./routes/settings.js"));
const ojt_js_1 = __importDefault(require("./routes/ojt.js"));
const externalTrainings_js_1 = require("./routes/externalTrainings.js");
const technicalAcademy_js_1 = require("./routes/technicalAcademy.js");
const backups_js_1 = require("./routes/backups.js");
const backupService_js_1 = require("./services/backupService.js");
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
app.use('/api/companies', companies_js_1.companiesRouter);
app.use('/api/settings', settings_js_1.default);
app.use('/api/ojt', ojt_js_1.default);
app.use('/api/events', events_js_1.eventsRouter);
app.use('/api/grades', grades_js_1.gradesRouter);
app.use('/api/participants', participants_js_1.participantsRouter);
app.use('/api/registrations', registrations_js_1.registrationsRouter);
app.use('/api/attendance', attendance_js_1.attendanceRouter);
app.use('/api/users', users_js_1.usersRouter);
app.use('/api/auth', users_js_1.usersRouter);
app.use('/api/feedback', feedback_js_1.feedbackRouter);
app.use('/api/notifications', notifications_js_1.notificationsRouter);
app.use('/api/groups', groups_js_1.groupsRouter);
app.use('/api/programs', programs_js_1.programsRouter);
app.use('/api/external-trainings', externalTrainings_js_1.externalTrainingsRouter);
app.use('/api/technical-academy', technicalAcademy_js_1.technicalAcademyRouter);
app.use('/api/admin', backups_js_1.adminBackupsRouter);
const http_1 = __importDefault(require("http"));
const websocket_js_1 = require("./websocket.js");
// Iniciar Servidor HTTP + WebSocket
const server = http_1.default.createServer(app);
(0, websocket_js_1.initWebSocketServer)(server);
server.listen(PORT, async () => {
    console.log(`=========================================`);
    console.log(`🚀 Servidor CapacitaHub API & WebSockets en ejecución`);
    console.log(`📡 Puerto HTTP: http://localhost:${PORT}`);
    console.log(`⚡ WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`=========================================`);
    await (0, db_js_1.initDbMigrations)();
    (0, backupService_js_1.initBackupScheduler)();
});
