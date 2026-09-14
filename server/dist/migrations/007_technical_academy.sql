-- ==========================================
-- Migración 007: Módulo de Academia Técnica
-- ==========================================

CREATE TABLE IF NOT EXISTS technical_academy_courses (
    id VARCHAR(100) PRIMARY KEY,
    event_id VARCHAR(100) REFERENCES events(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_tac_courses_event ON technical_academy_courses(event_id);

CREATE TABLE IF NOT EXISTS technical_academy_cohorts (
    id VARCHAR(100) PRIMARY KEY,
    event_id VARCHAR(100) REFERENCES events(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_tac_cohorts_event ON technical_academy_cohorts(event_id);

CREATE TABLE IF NOT EXISTS technical_academy_enrollments (
    id SERIAL PRIMARY KEY,
    cohort_id VARCHAR(100) NOT NULL REFERENCES technical_academy_cohorts(id) ON DELETE CASCADE,
    participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'dropped')),
    attendance_percentage NUMERIC(5, 2) DEFAULT 0,
    score NUMERIC(5, 2) DEFAULT NULL,
    academic_status VARCHAR(50) DEFAULT 'pending',
    feedback TEXT DEFAULT NULL,
    graded_by VARCHAR(150) DEFAULT NULL,
    graded_at TIMESTAMP DEFAULT NULL,
    UNIQUE (cohort_id, participant_card)
);

ALTER TABLE IF EXISTS technical_academy_enrollments ADD COLUMN IF NOT EXISTS score NUMERIC(5, 2) DEFAULT NULL;
ALTER TABLE IF EXISTS technical_academy_enrollments ADD COLUMN IF NOT EXISTS academic_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE IF EXISTS technical_academy_enrollments ADD COLUMN IF NOT EXISTS feedback TEXT DEFAULT NULL;
ALTER TABLE IF EXISTS technical_academy_enrollments ADD COLUMN IF NOT EXISTS graded_by VARCHAR(150) DEFAULT NULL;
ALTER TABLE IF EXISTS technical_academy_enrollments ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_tac_enrollments_cohort ON technical_academy_enrollments(cohort_id);
CREATE INDEX IF NOT EXISTS idx_tac_enrollments_card ON technical_academy_enrollments(participant_card);

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
