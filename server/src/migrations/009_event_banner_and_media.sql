-- ==========================================
-- Migración 009: Publicación en Banner Principal y Medios de Eventos
-- ==========================================

-- Agregar columnas para destacar eventos en el banner y URL de medios específica
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_banner_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_image_url TEXT DEFAULT NULL;

-- Índice para acelerar la consulta de eventos destacados en banner
CREATE INDEX IF NOT EXISTS idx_events_banner_featured ON events(is_banner_featured) WHERE is_banner_featured = TRUE;
