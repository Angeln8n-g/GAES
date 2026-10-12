-- Migración 016: Sistema Integral de Notificaciones 360° y Notificaciones Push para Entrenamientos

-- 1. Tabla de Notificaciones In-App Persistentes
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    recipient_email VARCHAR(255),
    recipient_user_id VARCHAR(50),
    recipient_company_id VARCHAR(100),
    recipient_role VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'evento', -- 'evento', 'convocatoria', 'cohorte', 'certificado', 'cumplimiento', 'sistema'
    priority VARCHAR(20) NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    action_url VARCHAR(255),
    action_label VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_email ON notifications(LOWER(recipient_email));
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON notifications(recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_company ON notifications(recipient_company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 2. Tabla de Suscripciones Web Push (VAPID / Service Worker)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_sub_user_email ON push_subscriptions(LOWER(user_email));

-- 3. Tabla de Control de Despachos de Recordatorios de Entrenamiento (Previene duplicados)
CREATE TABLE IF NOT EXISTS training_reminder_dispatches (
    id SERIAL PRIMARY KEY,
    session_type VARCHAR(50) NOT NULL, -- 'event_slot', 'cohort_session', 'manual_alert'
    session_id VARCHAR(100) NOT NULL,
    slot_id INTEGER,
    participant_email VARCHAR(255) NOT NULL,
    dispatch_window VARCHAR(50) NOT NULL, -- '15m_before', 'starting_now', 'manual_alert'
    dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_session_participant_window UNIQUE (session_id, participant_email, dispatch_window)
);

CREATE INDEX IF NOT EXISTS idx_trd_lookup ON training_reminder_dispatches(session_id, participant_email);

-- 4. Tabla de Preferencias de Notificación por Usuario
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    user_email VARCHAR(255) PRIMARY KEY,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    training_start_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    training_advance_notice_minutes INTEGER NOT NULL DEFAULT 15,
    categories JSONB NOT NULL DEFAULT '{"evento":true,"convocatoria":true,"cohorte":true,"certificado":true,"cumplimiento":true,"sistema":true}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Semillas de demostración de notificaciones iniciales para el administrador y colaboradores
INSERT INTO notifications (recipient_email, title, message, category, priority, action_url, action_label, metadata, created_at)
VALUES
(
    'admin@claro.com.do',
    'Convocatoria Oficial Publicada',
    'La convocatoria CONV-2026-FO-01 (Técnico en Empalme de Fibra Óptica) está abierta con 15 cupos distribuidos.',
    'convocatoria',
    'high',
    'convocatorias',
    'Ver Convocatoria',
    '{"convocatoriaCode": "CONV-2026-FO-01"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
),
(
    'admin@claro.com.do',
    'Recordatorio de Capacitación en Vivo',
    'El taller "Seguridad en Alturas y Espacios Confinados" está programado para hoy. Revisa el padrón de asistencia.',
    'evento',
    'normal',
    'my-registrations',
    'Ver Asistencias',
    '{"eventId": "evt_001"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '30 minutes'
),
(
    'colaborador@claro.com.do',
    'Postulación Recibida en Revisión',
    'Tu postulación para la convocatoria CONV-2026-FO-01 ha sido registrada exitosamente y se encuentra en evaluación técnica.',
    'convocatoria',
    'normal',
    'convocatorias',
    'Ver Mi Postulación',
    '{"convocatoriaCode": "CONV-2026-FO-01"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
)
ON CONFLICT DO NOTHING;
