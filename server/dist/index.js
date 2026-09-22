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
const auth_js_1 = require("./middlewares/auth.js");
const db_js_1 = require("./db.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const configuredOrigins = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
const defaultOrigins = [
    'https://gaes.kasino21.com',
    'http://gaes.kasino21.com',
    'http://localhost:3020',
    'http://127.0.0.1:3020',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];
const allowedOrigins = configuredOrigins.length > 0 ? [...configuredOrigins, ...defaultOrigins] : defaultOrigins;
// Middlewares
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        if (/^https?:\/\/(localhost|127\.0\.0\.1|gaes\.kasino21\.com)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS bloqueado: origen ${origin} no autorizado.`));
    },
    credentials: true
}));
app.use(express_1.default.json());
// Health Check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'online',
        service: 'CapacitaHub API Backend',
        timestamp: new Date().toISOString()
    });
});
// Rutas de la API (Protección centralizada por token JWT)
app.use('/api/companies', companies_js_1.companiesRouter);
app.use('/api/settings', settings_js_1.default);
app.use('/api/ojt', ojt_js_1.default);
app.use('/api/events', auth_js_1.authenticateToken, events_js_1.eventsRouter);
app.use('/api/grades', auth_js_1.authenticateToken, grades_js_1.gradesRouter);
app.use('/api/participants', participants_js_1.participantsRouter);
app.use('/api/registrations', registrations_js_1.registrationsRouter);
app.use('/api/attendance', attendance_js_1.attendanceRouter);
app.use('/api/users', auth_js_1.authenticateToken, users_js_1.usersRouter);
app.use('/api/auth', auth_js_1.authenticateToken, users_js_1.usersRouter);
app.use('/api/feedback', feedback_js_1.feedbackRouter);
app.use('/api/notifications', notifications_js_1.notificationsRouter);
app.use('/api/groups', groups_js_1.groupsRouter);
app.use('/api/programs', programs_js_1.programsRouter);
app.use('/api/external-trainings', externalTrainings_js_1.externalTrainingsRouter);
app.use('/api/technical-academy', auth_js_1.authenticateToken, technicalAcademy_js_1.technicalAcademyRouter);
app.use('/api/admin', auth_js_1.authenticateToken, backups_js_1.adminBackupsRouter);
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
