-- ==========================================
-- Migración 006: Capacitaciones Externas
-- ==========================================

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
