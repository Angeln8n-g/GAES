-- ==============================================================================
-- Migración 017: Sistema de Encuestas Kirkpatrick Nivel 1 & NPS con Candado de Certificados
-- Fecha: Octubre 2026
-- Base de datos: capacitahub_db / PostgreSQL
-- ==============================================================================

-- 1. Modificar tabla event_feedbacks para admitir cohortes y métricas de Kirkpatrick N1 & NPS
ALTER TABLE event_feedbacks ALTER COLUMN event_id DROP NOT NULL;

-- 2. Agregar columnas adicionales si no existen
ALTER TABLE event_feedbacks 
  ADD COLUMN IF NOT EXISTS cohort_id VARCHAR(100) REFERENCES technical_academy_cohorts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS training_type VARCHAR(50) DEFAULT 'event',
  ADD COLUMN IF NOT EXISTS nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  ADD COLUMN IF NOT EXISTS applicability_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS strengths_comment TEXT,
  ADD COLUMN IF NOT EXISTS improvements_comment TEXT;

-- 3. Índices para optimizar búsquedas y reportes
CREATE INDEX IF NOT EXISTS idx_feedback_event ON event_feedbacks(event_id);
CREATE INDEX IF NOT EXISTS idx_feedback_cohort ON event_feedbacks(cohort_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_email ON event_feedbacks(LOWER(user_email));
CREATE INDEX IF NOT EXISTS idx_feedback_nps ON event_feedbacks(nps_score);

-- 4. Índices únicos condicionales para garantizar 1 sola respuesta por colaborador por curso/cohorte
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_unique_event_user 
  ON event_feedbacks(event_id, LOWER(user_email)) WHERE event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_unique_cohort_user 
  ON event_feedbacks(cohort_id, LOWER(user_email)) WHERE cohort_id IS NOT NULL;

-- 5. Registrar migración en schema_migrations
INSERT INTO schema_migrations (version, name, checksum, execution_time_ms)
VALUES ('017', 'kirkpatrick_feedback_and_cert_gating', 'sha256_migration_017_kirkpatrick', 15)
ON CONFLICT (version) DO NOTHING;
