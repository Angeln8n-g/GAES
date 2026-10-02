-- 013_course_suggestions_and_waitlist.sql
-- Migración para el espacio de Sugerencias de Cursos No Recurrentes y Listas de Espera con Quórum Dinámico

CREATE TABLE IF NOT EXISTS course_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'Curso',
    modality VARCHAR(50) DEFAULT 'Presencial',
    target_hours NUMERIC(5, 2) DEFAULT 8,
    min_quorum INTEGER DEFAULT 10,
    current_quorum INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'recolectando_quorum', -- recolectando_quorum, quorum_alcanzado, programado, en_evaluacion, rechazado
    suggested_by_card VARCHAR(20) REFERENCES participants(card) ON DELETE SET NULL,
    suggested_by_name VARCHAR(255),
    suggested_by_email VARCHAR(255),
    company_id VARCHAR(100) DEFAULT 'all',
    linked_event_id VARCHAR(100) REFERENCES events(id) ON DELETE SET NULL,
    admin_notes TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suggestions_status ON course_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_company ON course_suggestions(company_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_created ON course_suggestions(created_at DESC);

CREATE TABLE IF NOT EXISTS course_waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_id UUID NOT NULL REFERENCES course_suggestions(id) ON DELETE CASCADE,
    participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
    participant_name VARCHAR(255) NOT NULL,
    participant_email VARCHAR(255) NOT NULL,
    participant_cedula VARCHAR(50),
    company_id VARCHAR(100) DEFAULT 'emp_kasino',
    preferred_schedule VARCHAR(100) DEFAULT 'Cualquiera',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(suggestion_id, participant_card)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_suggestion ON course_waitlist_entries(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_card ON course_waitlist_entries(participant_card);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON course_waitlist_entries(created_at ASC);
