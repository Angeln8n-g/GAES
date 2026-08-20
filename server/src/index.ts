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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    service: 'CapacitaHub API Backend',
    timestamp: new Date().toISOString()
  });
});

// Rutas de la API
app.use('/api/events', eventsRouter);
app.use('/api/participants', participantsRouter);
app.use('/api/registrations', registrationsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/users', usersRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/notifications', notificationsRouter);

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Servidor CapacitaHub API en ejecución`);
  console.log(`📡 Puerto: http://localhost:${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);
});
