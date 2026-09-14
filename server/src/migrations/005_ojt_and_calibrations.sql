-- ==========================================
-- Migración 005: Operaciones OJT y Mesas de Calibración
-- ==========================================

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255) DEFAULT 'Super Administrador'
);

INSERT INTO system_settings (key, value, description)
VALUES 
    ('ojt_plan_90d', '{"enabled": true, "enable_702010": true, "enable_calibration": true, "target_ttp_days": 30}', 'Control general del módulo de operaciones OJT, modelo 70-20-10 y plan a 90 días')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS ojt_checklists (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
    evaluator_user_id VARCHAR(100) NOT NULL,
    evaluator_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    observation_type VARCHAR(50) DEFAULT 'daily_observation',
    overall_score NUMERIC(5, 2) NOT NULL,
    operational_status VARCHAR(50) DEFAULT 'compliant',
    safety_protocol_pass BOOLEAN DEFAULT TRUE,
    first_time_fix_pass BOOLEAN DEFAULT TRUE,
    rubric_evaluation JSONB DEFAULT '[]',
    weaknesses_identified TEXT[] DEFAULT '{}',
    immediate_action_plan TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calibration_sessions (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    conducted_by VARCHAR(255) NOT NULL,
    participants_reviewed INTEGER DEFAULT 0,
    average_theory_score NUMERIC(5, 2) DEFAULT 0,
    average_field_score NUMERIC(5, 2) DEFAULT 0,
    variance_gap_pct NUMERIC(5, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'completed',
    key_findings TEXT,
    action_agreements TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
