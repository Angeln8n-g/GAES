-- ==========================================
-- ESTRUCTURA DE LA BASE DE DATOS POSTGRESQL
-- PROYECTO: GESTIÓN DE RESERVAS DE CAPACITACIONES
-- ==========================================

-- Eliminar tablas si existen (en orden inverso de dependencia)
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS event_slots CASCADE;
DROP TABLE IF EXISTS event_schedules CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS users_simulated CASCADE;

-- 1. Tabla de Colaboradores / Participantes
CREATE TABLE participants (
    card VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL
);

-- 2. Tabla de Usuarios del Sistema (Para autenticación y roles)
CREATE TABLE users_simulated (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- 3. Tabla de Eventos / Capacitaciones
CREATE TABLE events (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    instructor VARCHAR(255) NOT NULL,
    image_url TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    send_email BOOLEAN DEFAULT TRUE,
    send_teams BOOLEAN DEFAULT FALSE,
    custom_message TEXT,
    modality VARCHAR(100) DEFAULT 'Presencial',
    location VARCHAR(255) DEFAULT 'Instalaciones',
    survey_url VARCHAR(500) DEFAULT NULL
);

-- 4. Tabla de Fechas del Evento (Schedules)
CREATE TABLE event_schedules (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    UNIQUE (event_id, date)
);

-- 5. Tabla de Horarios de Eventos (Slots)
CREATE TABLE event_slots (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER NOT NULL REFERENCES event_schedules(id) ON DELETE CASCADE,
    time VARCHAR(50) NOT NULL,
    capacity INTEGER NOT NULL,
    UNIQUE (schedule_id, time)
);

-- 6. Tabla Puente de Inscripciones (Registrations)
CREATE TABLE registrations (
    id SERIAL PRIMARY KEY,
    slot_id INTEGER NOT NULL REFERENCES event_slots(id) ON DELETE CASCADE,
    participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (slot_id, participant_card)
);

-- 7. Historial de Notificaciones (Auditoría)
CREATE TABLE notification_logs (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    recipients INTEGER NOT NULL
);

-- 8. Registro de Asistencia Presencial (Check-in por QR)
CREATE TABLE attendance_logs (
    id SERIAL PRIMARY KEY,
    slot_id INTEGER NOT NULL REFERENCES event_slots(id) ON DELETE CASCADE,
    participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
    confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (slot_id, participant_card)
);

-- ==========================================
-- CARGA DE DATOS DE PRUEBA INICIALES (SEEDS)
-- ==========================================

-- Insertar Participantes
INSERT INTO participants (card, name, email) VALUES
('2010', 'LUIS ALBERTO ALMAZAN POOT', 'luis.almazan@empresa.com'),
('2012', 'LILIANA ESTHER SOSA PECH', 'liliana.sosa@empresa.com'),
('1998', 'FERMIN GABRIEL CHI PERERA', 'fermin.chi@empresa.com'),
('2015', 'JESUS RAFAEL PECH CHULIM', 'jesus.pech@empresa.com');

-- Insertar Usuarios de la Plataforma (Autenticación y Roles)
INSERT INTO users_simulated (id, email, name, role, password) VALUES
('usr_super', 'superadmin@empresa.com', 'Superusuario Principal', 'Super Administrador', 'admin'),
('usr_1', 'sofia.ceo@empresa.com', 'Sofía Martínez', 'Super Administrador', '123'),
('usr_2', 'admin.capacitacion@empresa.com', 'Carlos Pérez', 'Administrador / Editor', '123'),
('usr_3', 'juan.diez@empresa.com', 'Juan Díez', 'Colaborador (User)', '123'),
('usr_4', 'marta.perez@empresa.com', 'Marta Pérez', 'Colaborador (User)', '123');

-- Insertar Eventos
INSERT INTO events (id, title, description, category, instructor, image_url, status, send_email, send_teams, custom_message, modality, location, survey_url) VALUES
('evt_1', 'Taller Avanzado de React y UX', 'Domina el diseño de interfaces memorables y fluidas aplicando principios avanzados de usabilidad, animaciones y gestión de estado con React.', 'Taller', 'Ing. Sofía Martínez', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80', 'active', TRUE, TRUE, 'Estimado colaborador, te recordamos que mañana inicia el taller ''[EVENT_TITLE]'' facilitado por [INSTRUCTOR]. ¡Te esperamos!', 'Presencial', 'Sala de Juntas B (Piso 3)', 'https://forms.office.com/r/react-ux-evaluation'),
('evt_2', 'Cine Forum: El Dilema de las Redes Sociales', 'Análisis colectivo y debate abierto sobre el impacto de los algoritmos de recomendación en la salud mental y la cohesión social de nuestro entorno.', 'Cine Forum', 'Dra. Carolina Herrera', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80', 'active', TRUE, FALSE, '¡Hola! Te esperamos mañana en nuestro Cine Forum ''[EVENT_TITLE]'' para debatir ideas juntos.', 'Presencial', 'Auditorio Principal', NULL),
('evt_3', 'Webinar: El Futuro de la IA en la Productividad Diaria', 'Descubre cómo integrar herramientas de Inteligencia Artificial generativa en tus flujos de trabajo cotidianos para ahorrar hasta un 30% de tiempo en tareas repetitivas.', 'Webinar', 'Lic. Roberto Gómez', 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80', 'active', TRUE, TRUE, 'Recordatorio: Tu sesión de Webinar ''[EVENT_TITLE]'' está agendada para mañana.', 'Virtual', 'Enlace de Microsoft Teams', NULL);

-- Insertar Fechas para Taller React (evt_1)
INSERT INTO event_schedules (id, event_id, date) VALUES
(1, 'evt_1', '2026-07-15'),
(2, 'evt_1', '2026-07-16');

-- Insertar Horarios para Taller React (evt_1)
INSERT INTO event_slots (id, schedule_id, time, capacity) VALUES
(1, 1, '09:00 AM', 20),
(2, 1, '02:00 PM', 20),
(3, 2, '10:00 AM', 15);

-- Insertar Fechas para Cine Forum (evt_2)
INSERT INTO event_schedules (id, event_id, date) VALUES
(3, 'evt_2', '2026-07-18');

-- Insertar Horarios para Cine Forum (evt_2)
INSERT INTO event_slots (id, schedule_id, time, capacity) VALUES
(4, 3, '04:30 PM', 40);

-- Insertar Fechas para Webinar (evt_3)
INSERT INTO event_schedules (id, event_id, date) VALUES
(4, 'evt_3', '2026-07-22');

-- Insertar Horarios para Webinar (evt_3)
INSERT INTO event_slots (id, schedule_id, time, capacity) VALUES
(5, 4, '11:00 AM', 100);

-- Insertar Inscripciones de Prueba
-- LUIS ALBERTO ALMAZAN POOT (2010 -> luis.almazan@empresa.com) y LILIANA ESTHER SOSA PECH (2012 -> liliana.sosa@empresa.com)
-- registrados en Taller React slot 1 (09:00 AM)
INSERT INTO registrations (slot_id, participant_card) VALUES
(1, '2012'),
(1, '2010');

-- Carlos Pérez (admin.capacitacion@empresa.com) registrado en slot 2 (02:00 PM) (simulado como participante libre)
INSERT INTO registrations (slot_id, participant_card) VALUES
(2, '2015');

-- Insertar Logs de Notificaciones previas
INSERT INTO notification_logs (event_id, date, channel, status, recipients) VALUES
('evt_1', '2026-06-20 10:00:00', 'Email', 'Enviado', 12),
('evt_1', '2026-06-20 10:01:00', 'Teams', 'Enviado', 12);
