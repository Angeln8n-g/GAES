import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { eventsRouter } from './routes/events.js';
import { participantsRouter } from './routes/participants.js';
import { registrationsRouter } from './routes/registrations.js';
import { attendanceRouter } from './routes/attendance.js';
import { usersRouter } from './routes/users.js';
import { feedbackRouter } from './routes/feedback.js';
import { notificationsRouter } from './routes/notifications.js';
import { groupsRouter } from './routes/groups.js';
import { programsRouter } from './routes/programs.js';
import { companiesRouter } from './routes/companies.js';
import { gradesRouter } from './routes/grades.js';
import settingsRouter from './routes/settings.js';
import ojtRouter from './routes/ojt.js';
import { externalTrainingsRouter } from './routes/externalTrainings.js';
import { technicalAcademyRouter } from './routes/technicalAcademy.js';
import { adminBackupsRouter } from './routes/backups.js';
import { initBackupScheduler } from './services/backupService.js';
import { authenticateToken } from './middlewares/auth.js';

import { pool, initDbMigrations } from './db.js';

dotenv.config();

const app = express();
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
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
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
app.use(express.json());

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    service: 'CapacitaHub API Backend',
    timestamp: new Date().toISOString()
  });
});

// Rutas de la API (Protección centralizada por token JWT)
app.use('/api/companies', companiesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/ojt', ojtRouter);
app.use('/api/events', authenticateToken, eventsRouter);
app.use('/api/grades', authenticateToken, gradesRouter);
app.use('/api/participants', participantsRouter);
app.use('/api/registrations', registrationsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/users', authenticateToken, usersRouter);
app.use('/api/auth', authenticateToken, usersRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/programs', programsRouter);
app.use('/api/external-trainings', externalTrainingsRouter);
app.use('/api/technical-academy', authenticateToken, technicalAcademyRouter);
app.use('/api/admin', authenticateToken, adminBackupsRouter);

import http from 'http';
import { initWebSocketServer } from './websocket.js';

// Iniciar Servidor HTTP + WebSocket
const server = http.createServer(app);
initWebSocketServer(server);

server.listen(PORT, async () => {
  console.log(`=========================================`);
  console.log(`🚀 Servidor CapacitaHub API & WebSockets en ejecución`);
  console.log(`📡 Puerto HTTP: http://localhost:${PORT}`);
  console.log(`⚡ WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);
  await initDbMigrations();
  initBackupScheduler();
});

