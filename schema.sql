-- ==========================================
-- ESTRUCTURA DE LA BASE DE DATOS POSTGRESQL
-- PROYECTO: GESTIÓN DE RESERVAS DE CAPACITACIONES
-- ==========================================

-- Eliminar tablas si existen (en orden inverso de dependencia)
DROP TABLE IF EXISTS event_feedbacks CASCADE;
DROP TABLE IF EXISTS attendance_logs CASCADE;
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
    email VARCHAR(255) UNIQUE NOT NULL,
    cedula VARCHAR(20),
    department VARCHAR(150),
    supervisor_id VARCHAR(100),
    supervisor_name VARCHAR(255),
    employment_status VARCHAR(50) DEFAULT 'contratado',
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Tabla de Usuarios del Sistema (Para autenticación y roles)
CREATE TABLE users_simulated (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    cedula VARCHAR(20),
    department VARCHAR(150),
    assigned_member_cards TEXT[],
    employment_status VARCHAR(50) DEFAULT 'contratado',
    is_active BOOLEAN DEFAULT TRUE
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
    survey_url VARCHAR(500) DEFAULT NULL,
    company_id VARCHAR(100) DEFAULT 'emp_kasino',
    evaluation_type VARCHAR(50) DEFAULT 'attendance_only',
    passing_score NUMERIC(5, 2) DEFAULT 70.00,
    skills_evaluated TEXT[] DEFAULT '{}',
    ojt_evaluator_id VARCHAR(100),
    ojt_evaluator_name VARCHAR(255),
    ojt_evaluator_email VARCHAR(255),
    modules JSONB DEFAULT '[]'
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
    is_mandatory BOOLEAN DEFAULT FALSE,
    assigned_by VARCHAR(255) DEFAULT NULL,
    assignment_type VARCHAR(50) DEFAULT 'self',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assignment_notes TEXT DEFAULT NULL,
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

-- 9. Evaluaciones y Feedback Rápido
CREATE TABLE event_feedbacks (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    course_ratings JSONB DEFAULT '{}',
    facilitator_ratings JSONB DEFAULT '{}',
    course_score NUMERIC(5,2),
    facilitator_score NUMERIC(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Grupos de Participantes / Cohortes
CREATE TABLE participant_groups (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(50) DEFAULT 'indigo',
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Miembros de Grupos
CREATE TABLE group_members (
    group_id VARCHAR(100) NOT NULL REFERENCES participant_groups(id) ON DELETE CASCADE,
    participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, participant_card)
);

-- 12. Programas / Cronogramas de Capacitación
CREATE TABLE training_programs (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Eventos incluidos en el Programa
CREATE TABLE program_events (
    program_id VARCHAR(100) NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    event_id VARCHAR(100) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0,
    PRIMARY KEY (program_id, event_id)
);

-- 14. Grupos objetivo asignados al Programa
CREATE TABLE program_target_groups (
    program_id VARCHAR(100) NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    group_id VARCHAR(100) NOT NULL REFERENCES participant_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (program_id, group_id)
);

-- 15. Participantes específicos asignados al Programa
CREATE TABLE program_target_participants (
    program_id VARCHAR(100) NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
    PRIMARY KEY (program_id, participant_card)
);

-- 16. Capacitaciones Externas (Programa de Sustentabilidad Claro)
CREATE TABLE IF NOT EXISTS external_trainings (
    id VARCHAR(100) PRIMARY KEY,
    participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    session_type VARCHAR(50) NOT NULL DEFAULT 'Asincrónica',
    training_type VARCHAR(50) NOT NULL DEFAULT 'Técnico',
    training_format VARCHAR(100) NOT NULL DEFAULT 'Curso',
    modality VARCHAR(50) NOT NULL DEFAULT 'Virtual',
    program_category VARCHAR(150) NOT NULL DEFAULT 'Capacitacion_tecnologica_digital',
    subprogram VARCHAR(150) NOT NULL DEFAULT 'Desarrollo de software',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_hours NUMERIC(6, 2) NOT NULL DEFAULT 1,
    supplier VARCHAR(255) NOT NULL DEFAULT 'Externo',
    description TEXT,
    credential_url TEXT,
    certificate_number VARCHAR(100),
    score NUMERIC(5, 2),
    academic_status VARCHAR(50) DEFAULT 'passed',
    company_id VARCHAR(100) DEFAULT 'emp_kasino',
    registered_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ext_trainings_card ON external_trainings(participant_card);
CREATE INDEX IF NOT EXISTS idx_ext_trainings_company ON external_trainings(company_id);

-- 17. Academia Técnica: Cursos Técnicos Recurrentes
CREATE TABLE IF NOT EXISTS technical_academy_courses (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'Planta Externa',
    daily_hours NUMERIC(4, 2) NOT NULL DEFAULT 4.00,
    duration_days INTEGER NOT NULL DEFAULT 5,
    modality VARCHAR(50) NOT NULL DEFAULT 'Presencial (Taller)',
    location VARCHAR(255) DEFAULT 'Laboratorio Central de Planta Externa',
    company_id VARCHAR(100) DEFAULT 'emp_kasino',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tac_courses_company ON technical_academy_courses(company_id);

-- 18. Academia Técnica: Cohortes / Semanas de Capacitación
CREATE TABLE IF NOT EXISTS technical_academy_cohorts (
    id VARCHAR(100) PRIMARY KEY,
    course_id VARCHAR(100) NOT NULL REFERENCES technical_academy_courses(id) ON DELETE CASCADE,
    group_id VARCHAR(100) REFERENCES participant_groups(id) ON DELETE SET NULL,
    group_name VARCHAR(255),
    facilitator_id VARCHAR(50) REFERENCES users_simulated(id) ON DELETE SET NULL,
    facilitator_name VARCHAR(255),
    facilitator_email VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    week_number INTEGER,
    year INTEGER,
    daily_time VARCHAR(50) DEFAULT '08:00 AM - 12:00 PM',
    location VARCHAR(255),
    capacity INTEGER DEFAULT 20,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    daily_pin VARCHAR(10) DEFAULT '2026',
    company_id VARCHAR(100) DEFAULT 'emp_kasino',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tac_cohorts_course ON technical_academy_cohorts(course_id);
CREATE INDEX IF NOT EXISTS idx_tac_cohorts_group ON technical_academy_cohorts(group_id);
CREATE INDEX IF NOT EXISTS idx_tac_cohorts_dates ON technical_academy_cohorts(start_date, end_date);

-- 19. Academia Técnica: Participantes Enrolados por Cohorte
CREATE TABLE IF NOT EXISTS technical_academy_enrollments (
    id SERIAL PRIMARY KEY,
    cohort_id VARCHAR(100) NOT NULL REFERENCES technical_academy_cohorts(id) ON DELETE CASCADE,
    participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'dropped')),
    attendance_percentage NUMERIC(5, 2) DEFAULT 0,
    UNIQUE (cohort_id, participant_card)
);
CREATE INDEX IF NOT EXISTS idx_tac_enrollments_cohort ON technical_academy_enrollments(cohort_id);
CREATE INDEX IF NOT EXISTS idx_tac_enrollments_card ON technical_academy_enrollments(participant_card);

-- 20. Academia Técnica: Marcado Diario de Asistencia
CREATE TABLE IF NOT EXISTS technical_academy_attendance (
    id SERIAL PRIMARY KEY,
    cohort_id VARCHAR(100) NOT NULL REFERENCES technical_academy_cohorts(id) ON DELETE CASCADE,
    participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('present', 'late', 'absent', 'excused')),
    method VARCHAR(20) DEFAULT 'manual' CHECK (method IN ('manual', 'qr_scan', 'pin')),
    marked_by VARCHAR(255),
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE (cohort_id, participant_card, session_date)
);
CREATE INDEX IF NOT EXISTS idx_tac_attendance_cohort_date ON technical_academy_attendance(cohort_id, session_date);

-- ==========================================
-- CARGA DE DATOS DE PRUEBA INICIALES (SEEDS)
-- ==========================================

-- Insertar Participantes
INSERT INTO participants (card, name, email, cedula) VALUES
('2010', 'LUIS ALBERTO ALMAZAN POOT', 'luis.almazan@empresa.com', '402-2196163-1'),
('2012', 'LILIANA ESTHER SOSA PECH', 'liliana.sosa@empresa.com', '001-0876543-2'),
('1998', 'FERMIN GABRIEL CHI PERERA', 'fermin.chi@empresa.com', '031-0456789-4'),
('2015', 'JESUS RAFAEL PECH CHULIM', 'jesus.pech@empresa.com', '223-0098765-8');

-- Insertar Usuarios de la Plataforma (Autenticación y Roles)
INSERT INTO users_simulated (id, email, name, role, password, cedula) VALUES
('usr_super', 'superadmin@empresa.com', 'Superusuario Principal', 'Super Administrador', 'admin', '402-2196163-1'),
('usr_1', 'sofia.ceo@empresa.com', 'Sofía Martínez', 'Super Administrador', '123', '001-1928374-5'),
('usr_2', 'admin.capacitacion@empresa.com', 'Carlos Pérez', 'Administrador / Editor', '123', '001-2837465-9'),
('usr_3', 'juan.diez@empresa.com', 'Juan Díez', 'Colaborador (User)', '123', '031-1827364-0'),
('usr_4', 'marta.perez@empresa.com', 'Marta Pérez', 'Colaborador (User)', '123', '223-8765432-1');

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
INSERT INTO registrations (slot_id, participant_card) VALUES
(1, '2012'),
(1, '2010'),
(2, '2015');

-- Insertar Asistencia previa de prueba
INSERT INTO attendance_logs (slot_id, participant_card) VALUES
(1, '2012');

-- Insertar Logs de Notificaciones previas
INSERT INTO notification_logs (event_id, date, channel, status, recipients) VALUES
('evt_1', '2026-06-20 10:00:00', 'Email', 'Enviado', 12),
('evt_1', '2026-06-20 10:01:00', 'Teams', 'Enviado', 12);

-- Insertar Feedback inicial de prueba
INSERT INTO event_feedbacks (event_id, user_email, user_name, rating, comment) VALUES
('evt_1', 'liliana.sosa@empresa.com', 'LILIANA ESTHER SOSA PECH', 5, 'Excelente taller, muy práctico y aplicable a proyectos reales.');

-- Insertar Grupos de Prueba
INSERT INTO participant_groups (id, name, description, color, department) VALUES
('grp_ti', 'Departamento de TI & Sistemas', 'Equipo de desarrollo, infraestructura y soporte tecnológico.', 'indigo', 'Tecnología'),
('grp_ventas', 'Equipo Comercial & Ventas', 'Ejecutivos de cuentas y asesores de atención al cliente.', 'emerald', 'Comercial'),
('grp_lideres', 'Liderazgo & Mandos Medios', 'Supervisores, gerentes y líderes de proyecto.', 'amber', 'Dirección');

-- Insertar Miembros de Grupos
INSERT INTO group_members (group_id, participant_card) VALUES
('grp_ti', '2010'),
('grp_ti', '2012'),
('grp_ventas', '1998'),
('grp_ventas', '2015'),
('grp_lideres', '2012');

-- Insertar Programa / Cronograma de Prueba
INSERT INTO training_programs (id, title, description, start_date, end_date, status) VALUES
('prog_1', 'Plan de Innovación y Habilidades Digitales 2026', 'Ruta formativa obligatoria para potenciar el dominio de tecnologías modernas e inteligencia artificial en flujos de trabajo.', '2026-07-01', '2026-08-31', 'active');

-- Insertar Eventos en el Programa
INSERT INTO program_events (program_id, event_id, is_mandatory, order_index) VALUES
('prog_1', 'evt_1', TRUE, 1),
('prog_1', 'evt_3', TRUE, 2),
('prog_1', 'evt_2', FALSE, 3);

-- Asignar Grupo al Programa
INSERT INTO program_target_groups (program_id, group_id) VALUES
('prog_1', 'grp_ti'),
('prog_1', 'grp_lideres');

-- ==========================================
-- SEMILLAS ACADEMIA TÉCNICA
-- ==========================================
INSERT INTO technical_academy_courses (id, title, code, description, category, daily_hours, duration_days, modality, location, company_id) VALUES
('tac_fo_101', 'Instalación y Fusión de Fibra Óptica GPON', 'TEC-FO-01', 'Taller práctico diario de conectorización, empalmes por fusión, reflectometría OTDR y resolución de averías en planta externa.', 'Planta Externa', 4.00, 5, 'Presencial (Laboratorio)', 'Taller Central de Planta Externa - Piso 1', 'emp_kasino'),
('tac_hfc_201', 'Operación y Mantenimiento de Nodos HFC', 'TEC-HFC-02', 'Capacitación técnica diaria para balanceo de amplificadores, fuentes de poder y calibración de señal coaxial de banda ancha.', 'Redes HFC', 4.00, 5, 'Presencial (Laboratorio)', 'Laboratorio de Redes & Banda Ancha', 'emp_kasino'),
('tac_seg_301', 'Seguridad y Trabajos en Altura & Espacios Confinados', 'TEC-SEG-03', 'Normativa de seguridad técnica, inspección de arneses, líneas de vida y protocolos de rescate en postes y torres.', 'Seguridad Industrial', 3.50, 4, 'Presencial (Campo)', 'Patios de Entrenamiento Operativo', 'emp_kasino')
ON CONFLICT (id) DO NOTHING;

INSERT INTO technical_academy_cohorts (id, course_id, group_id, group_name, facilitator_id, facilitator_name, facilitator_email, start_date, end_date, week_number, year, daily_time, location, capacity, status, daily_pin, company_id) VALUES
('coh_2026_w38_fo', 'tac_fo_101', 'grp_ti', 'Departamento de TI & Sistemas', 'usr_2', 'Carlos Pérez', 'admin.capacitacion@empresa.com', '2026-09-14', '2026-09-18', 38, 2026, '08:00 AM - 12:00 PM', 'Taller Central de Planta Externa - Piso 1', 15, 'in_progress', '4589', 'emp_kasino'),
('coh_2026_w39_fo', 'tac_fo_101', 'grp_ventas', 'Equipo Comercial & Ventas', 'usr_1', 'Sofía Martínez', 'sofia.ceo@empresa.com', '2026-09-21', '2026-09-25', 39, 2026, '08:00 AM - 12:00 PM', 'Taller Central de Planta Externa - Piso 1', 15, 'scheduled', '7812', 'emp_kasino')
ON CONFLICT (id) DO NOTHING;

INSERT INTO technical_academy_enrollments (cohort_id, participant_card, status) VALUES
('coh_2026_w38_fo', '2010', 'enrolled'),
('coh_2026_w38_fo', '2012', 'enrolled')
ON CONFLICT (cohort_id, participant_card) DO NOTHING;

-- ==========================================
-- SINCRONIZACIÓN DE SECUENCIAS AUTOINCREMENTALES
-- ==========================================
SELECT setval(pg_get_serial_sequence('event_schedules', 'id'), COALESCE((SELECT MAX(id) FROM event_schedules), 1));
SELECT setval(pg_get_serial_sequence('event_slots', 'id'), COALESCE((SELECT MAX(id) FROM event_slots), 1));
SELECT setval(pg_get_serial_sequence('registrations', 'id'), COALESCE((SELECT MAX(id) FROM registrations), 1));
SELECT setval(pg_get_serial_sequence('notification_logs', 'id'), COALESCE((SELECT MAX(id) FROM notification_logs), 1));
SELECT setval(pg_get_serial_sequence('attendance_logs', 'id'), COALESCE((SELECT MAX(id) FROM attendance_logs), 1));
SELECT setval(pg_get_serial_sequence('event_feedbacks', 'id'), COALESCE((SELECT MAX(id) FROM event_feedbacks), 1));
SELECT setval(pg_get_serial_sequence('technical_academy_enrollments', 'id'), COALESCE((SELECT MAX(id) FROM technical_academy_enrollments), 1));
SELECT setval(pg_get_serial_sequence('technical_academy_attendance', 'id'), COALESCE((SELECT MAX(id) FROM technical_academy_attendance), 1));

