-- 014_relax_course_suggestion_fk.sql
-- Flexibilizar llaves foráneas para permitir que tanto participantes como usuarios administrativos de users_simulated puedan sugerir cursos y unirse a listas de espera

ALTER TABLE course_waitlist_entries DROP CONSTRAINT IF EXISTS course_waitlist_entries_participant_card_fkey;
ALTER TABLE course_suggestions DROP CONSTRAINT IF EXISTS course_suggestions_suggested_by_card_fkey;

ALTER TABLE course_waitlist_entries ALTER COLUMN participant_card TYPE VARCHAR(100);
ALTER TABLE course_suggestions ALTER COLUMN suggested_by_card TYPE VARCHAR(100);
