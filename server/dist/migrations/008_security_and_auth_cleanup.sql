-- ==========================================
-- Migración 008: Seguridad, Índices y Auditoría de Respaldos
-- ==========================================

-- Tabla para auditar operaciones de respaldo y restauración
CREATE TABLE IF NOT EXISTS backup_audit_logs (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('backup_created', 'backup_deleted', 'backup_restored', 'backup_pruned')),
    status VARCHAR(50) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
    size_bytes BIGINT,
    sha256_hash VARCHAR(64),
    triggered_by VARCHAR(255) DEFAULT 'system',
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_backup_audit_time ON backup_audit_logs(performed_at DESC);

-- Índices optimizados para autenticación por correo o cédula
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users_simulated(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_participants_email_lower ON participants(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_participants_card ON participants(card);
