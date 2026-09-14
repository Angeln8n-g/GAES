-- ==========================================
-- Migración 004: Calificaciones Modulares y Competencias
-- ==========================================

ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS evaluation_type VARCHAR(50) DEFAULT 'attendance_only';
ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS passing_score NUMERIC(5, 2) DEFAULT 70.00;
ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS skills_evaluated TEXT[] DEFAULT '{}';
ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS ojt_evaluator_id VARCHAR(100);
ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS ojt_evaluator_name VARCHAR(255);
ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS ojt_evaluator_email VARCHAR(255);
ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS modules JSONB DEFAULT '[]';

CREATE TABLE IF NOT EXISTS participant_grades (
    id VARCHAR(100) PRIMARY KEY,
    event_id VARCHAR(100) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
    slot_id INTEGER REFERENCES event_slots(id) ON DELETE SET NULL,
    score NUMERIC(5, 2),
    academic_status VARCHAR(50) DEFAULT 'pending' CHECK (academic_status IN ('passed', 'failed', 'pending')),
    detected_skill_gaps TEXT[] DEFAULT '{}',
    weaknesses_notes TEXT,
    strengths_notes TEXT,
    needs_retraining BOOLEAN DEFAULT FALSE,
    feedback TEXT,
    graded_by VARCHAR(255),
    graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    module_grades JSONB DEFAULT '[]',
    UNIQUE(event_id, participant_card)
);

ALTER TABLE IF EXISTS participant_grades ADD COLUMN IF NOT EXISTS module_grades JSONB DEFAULT '[]';

ALTER TABLE IF EXISTS event_feedbacks ADD COLUMN IF NOT EXISTS course_ratings JSONB DEFAULT '{}';
ALTER TABLE IF EXISTS event_feedbacks ADD COLUMN IF NOT EXISTS facilitator_ratings JSONB DEFAULT '{}';
ALTER TABLE IF EXISTS event_feedbacks ADD COLUMN IF NOT EXISTS course_score NUMERIC(5, 2);
ALTER TABLE IF EXISTS event_feedbacks ADD COLUMN IF NOT EXISTS facilitator_score NUMERIC(5, 2);

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_feedbacks_unique_user_event 
ON event_feedbacks(event_id, LOWER(user_email));
