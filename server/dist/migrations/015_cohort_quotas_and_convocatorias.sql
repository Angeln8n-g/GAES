-- ====================================================================
-- Migración 015: Gestión de Cupos por Empresas y Gestión de Convocatorias
-- ====================================================================

-- 1. Cupos asignados por empresa en cohortes de la Academia Técnica
CREATE TABLE IF NOT EXISTS technical_academy_cohort_quotas (
    id SERIAL PRIMARY KEY,
    cohort_id VARCHAR(100) NOT NULL REFERENCES technical_academy_cohorts(id) ON DELETE CASCADE,
    company_id VARCHAR(100) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    allocated_quota INTEGER NOT NULL CHECK (allocated_quota >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cohort_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_tac_cohort_quotas_cohort ON technical_academy_cohort_quotas(cohort_id);
CREATE INDEX IF NOT EXISTS idx_tac_cohort_quotas_company ON technical_academy_cohort_quotas(company_id);

-- 2. Tabla Principal de Convocatorias
CREATE TABLE IF NOT EXISTS convocatorias (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    training_type VARCHAR(50) DEFAULT 'technical_academy',
    course_id VARCHAR(100) REFERENCES technical_academy_courses(id) ON DELETE SET NULL,
    cohort_id VARCHAR(100) REFERENCES technical_academy_cohorts(id) ON DELETE SET NULL,
    event_id VARCHAR(100) REFERENCES events(id) ON DELETE SET NULL,
    banner_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'in_progress', 'completed', 'cancelled')),
    application_start_date DATE NOT NULL,
    application_end_date DATE NOT NULL,
    training_start_date DATE,
    training_end_date DATE,
    modality VARCHAR(50) DEFAULT 'Presencial (Taller)',
    location VARCHAR(255),
    total_quota INTEGER NOT NULL DEFAULT 20 CHECK (total_quota > 0),
    selection_mode VARCHAR(50) DEFAULT 'review_required' CHECK (selection_mode IN ('direct', 'review_required')),
    target_audience TEXT,
    prerequisites TEXT,
    allow_self_application BOOLEAN DEFAULT TRUE,
    allow_supervisor_nomination BOOLEAN DEFAULT TRUE,
    company_ids TEXT[] DEFAULT '{}',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_convocatorias_status ON convocatorias(status);
CREATE INDEX IF NOT EXISTS idx_convocatorias_course ON convocatorias(course_id);
CREATE INDEX IF NOT EXISTS idx_convocatorias_cohort ON convocatorias(cohort_id);
CREATE INDEX IF NOT EXISTS idx_convocatorias_dates ON convocatorias(application_start_date, application_end_date);

-- 3. Cupos asignados por empresa en cada Convocatoria
CREATE TABLE IF NOT EXISTS convocatoria_company_quotas (
    id SERIAL PRIMARY KEY,
    convocatoria_id VARCHAR(100) NOT NULL REFERENCES convocatorias(id) ON DELETE CASCADE,
    company_id VARCHAR(100) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    allocated_quota INTEGER NOT NULL CHECK (allocated_quota >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (convocatoria_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_convocatoria_quotas_conv ON convocatoria_company_quotas(convocatoria_id);
CREATE INDEX IF NOT EXISTS idx_convocatoria_quotas_comp ON convocatoria_company_quotas(company_id);

-- 4. Postulaciones / Aplicaciones a la Convocatoria
CREATE TABLE IF NOT EXISTS convocatoria_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    convocatoria_id VARCHAR(100) NOT NULL REFERENCES convocatorias(id) ON DELETE CASCADE,
    participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
    company_id VARCHAR(100) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    applicant_type VARCHAR(50) DEFAULT 'self' CHECK (applicant_type IN ('self', 'supervisor')),
    nominated_by_id VARCHAR(100),
    nominated_by_name VARCHAR(255),
    motivation TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlist', 'cancelled')),
    review_notes TEXT,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    enrolled_in_cohort BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (convocatoria_id, participant_card)
);

CREATE INDEX IF NOT EXISTS idx_conv_app_convocatoria ON convocatoria_applications(convocatoria_id);
CREATE INDEX IF NOT EXISTS idx_conv_app_card ON convocatoria_applications(participant_card);
CREATE INDEX IF NOT EXISTS idx_conv_app_company ON convocatoria_applications(company_id);
CREATE INDEX IF NOT EXISTS idx_conv_app_status ON convocatoria_applications(status);

-- 5. Semillas de prueba para convocatorias y cupos por empresa
INSERT INTO technical_academy_cohort_quotas (cohort_id, company_id, allocated_quota)
VALUES 
    ('coh_2026_w38_fo', 'emp_kasino', 10),
    ('coh_2026_w38_fo', 'emp_resort', 5)
ON CONFLICT (cohort_id, company_id) DO NOTHING;

INSERT INTO convocatorias (
    id, code, title, description, training_type, course_id, cohort_id, status,
    application_start_date, application_end_date, training_start_date, training_end_date,
    modality, location, total_quota, selection_mode, target_audience, prerequisites,
    allow_self_application, allow_supervisor_nomination, company_ids, created_by
) VALUES (
    'conv_2026_fo_01',
    'CONV-2026-FO-01',
    'Convocatoria Oficial: Certificación en Fibra Óptica GPON & Fusión',
    'Convocatoria abierta para certificar al personal técnico en empalmes de fibra óptica, reflectometría OTDR y conectorización bajo estándares de Planta Externa.',
    'technical_academy',
    'tac_fo_101',
    'coh_2026_w39_fo',
    'open',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE + INTERVAL '10 days',
    '2026-09-21',
    '2026-09-25',
    'Presencial (Laboratorio)',
    'Taller Central de Planta Externa - Piso 1',
    15,
    'review_required',
    'Técnicos de Campo, Instaladores de Telecomunicaciones y Supervisores de Cuadrilla.',
    'Experiencia mínima de 6 meses en instalaciones y conocimiento de seguridad en planta.',
    TRUE,
    TRUE,
    ARRAY['emp_kasino', 'emp_resort', 'emp_tech'],
    'usr_super'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO convocatoria_company_quotas (convocatoria_id, company_id, allocated_quota)
VALUES 
    ('conv_2026_fo_01', 'emp_kasino', 8),
    ('conv_2026_fo_01', 'emp_resort', 4),
    ('conv_2026_fo_01', 'emp_tech', 3)
ON CONFLICT (convocatoria_id, company_id) DO NOTHING;
