-- ========================================================
-- MIGRACIÓN 010: ESPACIOS PARA EVENTOS VIRTUALES (TEAMS & ZOOM)
-- ========================================================

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS meeting_platform VARCHAR(50) DEFAULT 'teams',
ADD COLUMN IF NOT EXISTS meeting_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meeting_id VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meeting_password VARCHAR(100) DEFAULT NULL;

-- Índice para optimizar consultas de capacitaciones con salas virtuales
CREATE INDEX IF NOT EXISTS idx_events_meeting_platform ON events(meeting_platform);
