-- ==========================================
-- Migración 001: Esquema Base y Núcleo
-- ==========================================

CREATE TABLE IF NOT EXISTS participants (
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

CREATE TABLE IF NOT EXISTS users_simulated (
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

CREATE TABLE IF NOT EXISTS events (
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
    company_id VARCHAR(100) DEFAULT 'emp_kasino'
);

CREATE TABLE IF NOT EXISTS event_schedules (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    UNIQUE (event_id, date)
);

CREATE TABLE IF NOT EXISTS event_slots (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER NOT NULL REFERENCES event_schedules(id) ON DELETE CASCADE,
    time VARCHAR(50) NOT NULL,
    capacity INTEGER NOT NULL,
    UNIQUE (schedule_id, time)
);

CREATE TABLE IF NOT EXISTS registrations (
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

CREATE TABLE IF NOT EXISTS attendance_logs (
    id SERIAL PRIMARY KEY,
    slot_id INTEGER NOT NULL REFERENCES event_slots(id) ON DELETE CASCADE,
    participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
    confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_out_at TIMESTAMP DEFAULT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    UNIQUE (slot_id, participant_card)
);

CREATE TABLE IF NOT EXISTS event_feedbacks (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) REFERENCES events(id) ON DELETE SET NULL,
    channel VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    recipients_count INTEGER NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_company ON events(company_id);
CREATE INDEX IF NOT EXISTS idx_registrations_slot ON registrations(slot_id);
CREATE INDEX IF NOT EXISTS idx_registrations_participant ON registrations(participant_card);
CREATE INDEX IF NOT EXISTS idx_attendance_slot ON attendance_logs(slot_id);
CREATE INDEX IF NOT EXISTS idx_attendance_card ON attendance_logs(participant_card);
