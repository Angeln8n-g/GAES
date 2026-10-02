-- 012_certificates_and_verification.sql
-- Migración para el Sistema de Certificados, Diplomas, Códigos QR y Verificación Pública

CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Certificado de Acreditación',
    certificate_type VARCHAR(50) NOT NULL DEFAULT 'completion',
    recipient_name VARCHAR(255) NOT NULL,
    recipient_cedula VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255),
    recipient_company VARCHAR(255) DEFAULT 'Claro Dominicana',
    course_id VARCHAR(100),
    cohort_id VARCHAR(100),
    course_name VARCHAR(255) NOT NULL,
    course_type VARCHAR(50) NOT NULL DEFAULT 'event',
    modality VARCHAR(50) NOT NULL DEFAULT 'Presencial',
    duration_hours NUMERIC(6, 2) NOT NULL DEFAULT 1,
    score NUMERIC(5, 2),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE,
    instructor_name VARCHAR(255) DEFAULT 'Instructor Certificado Claro',
    instructor_title VARCHAR(255) DEFAULT 'Especialista en Capacitación Técnica',
    director_name VARCHAR(255) DEFAULT 'Dirección de Gestión Humana y Desarrollo Claro',
    verification_url TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    revocation_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    issued_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_certificates_credential_id ON certificates(credential_id);
CREATE INDEX IF NOT EXISTS idx_certificates_cedula ON certificates(recipient_cedula);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_cohort_id ON certificates(cohort_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_certificates_company ON certificates(recipient_company);
