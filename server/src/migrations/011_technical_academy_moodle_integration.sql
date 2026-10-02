-- ====================================================================
-- MIGRACIÓN 011: CONEXIÓN Y ENTLAZADO CON MOODLE CLARO (ACADEMIA TÉCNICA)
-- Plataforma: https://entrenamiento.claro.com.do/
-- ====================================================================

-- 1. Campos de Moodle en cursos técnicos
ALTER TABLE technical_academy_courses 
  ADD COLUMN IF NOT EXISTS moodle_course_id VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS moodle_course_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS moodle_section_name VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS moodle_exam_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS moodle_category VARCHAR(100) DEFAULT 'Entrenamientos Técnicos',
  ADD COLUMN IF NOT EXISTS is_moodle_linked BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_tac_courses_moodle ON technical_academy_courses(moodle_course_id);

-- 2. Campos de Moodle en cohortes (override opcional de sección o URL)
ALTER TABLE technical_academy_cohorts 
  ADD COLUMN IF NOT EXISTS moodle_course_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS moodle_section_name VARCHAR(255) DEFAULT NULL;

-- 3. Campos de Moodle en eventos generales
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS moodle_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS moodle_course_id VARCHAR(50) DEFAULT NULL;

-- 4. Asociar inicialmente los cursos existentes con presets de Moodle Claro si coinciden
UPDATE technical_academy_courses
SET 
  moodle_course_id = '190',
  moodle_course_url = 'https://entrenamiento.claro.com.do/course/view.php?id=190',
  moodle_section_name = 'Módulo Virtual: Banda Ancha y FTTx',
  moodle_category = 'Entrenamientos Técnicos',
  is_moodle_linked = TRUE
WHERE id = 'tac_fo_101' AND moodle_course_id IS NULL;

UPDATE technical_academy_courses
SET 
  moodle_course_id = '189',
  moodle_course_url = 'https://entrenamiento.claro.com.do/course/view.php?id=189',
  moodle_section_name = 'Módulo Virtual: Solución Mesh ZTE',
  moodle_category = 'Entrenamientos Técnicos',
  is_moodle_linked = TRUE
WHERE id = 'tac_hfc_201' AND moodle_course_id IS NULL;

UPDATE technical_academy_courses
SET 
  moodle_course_id = '187',
  moodle_course_url = 'https://entrenamiento.claro.com.do/course/view.php?id=187',
  moodle_section_name = 'Módulo Virtual: Prevención y Seguridad',
  moodle_category = 'Entrenamientos Técnicos',
  is_moodle_linked = TRUE
WHERE id = 'tac_seg_301' AND moodle_course_id IS NULL;

UPDATE technical_academy_courses
SET 
  moodle_course_id = '185',
  moodle_course_url = 'https://entrenamiento.claro.com.do/course/view.php?id=185',
  moodle_section_name = 'Módulo Virtual: Claro TV+',
  moodle_category = 'Entrenamientos Técnicos',
  is_moodle_linked = TRUE
WHERE id = 'tac_1789354631195' AND moodle_course_id IS NULL;
