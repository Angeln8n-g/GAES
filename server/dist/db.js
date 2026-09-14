"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDbMigrations = exports.pool = void 0;
const pg_1 = __importDefault(require("pg"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const { Pool } = pg_1.default;
const connectionString = process.env.DATABASE_URL;
const shouldEnableSSL = () => {
    if (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1') {
        return { rejectUnauthorized: false };
    }
    if (process.env.DB_SSL === 'false' || process.env.DB_SSL === '0') {
        return false;
    }
    if (connectionString) {
        if (connectionString.includes('localhost') ||
            connectionString.includes('127.0.0.1') ||
            connectionString.includes('@postgres:') ||
            connectionString.includes('sslmode=disable')) {
            return false;
        }
        if (connectionString.includes('sslmode=require') || connectionString.includes('ssl=true')) {
            return { rejectUnauthorized: false };
        }
    }
    return false;
};
exports.pool = new Pool(connectionString
    ? {
        connectionString,
        ssl: shouldEnableSSL()
    }
    : {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'capacitahub_db',
        ssl: shouldEnableSSL()
    });
exports.pool.on('error', (err) => {
    console.error('Error inesperado en el pool de PostgreSQL:', err);
});
/**
 * Ejecuta migraciones automáticas idempotentes al conectar la base de datos
 */
const initDbMigrations = async () => {
    try {
        await exports.pool.query(`
      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS cedula VARCHAR(20);
      ALTER TABLE IF EXISTS users_simulated ADD COLUMN IF NOT EXISTS cedula VARCHAR(20);
      ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS modality VARCHAR(100) DEFAULT 'Presencial';
      ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT 'Instalaciones';
      ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS survey_url VARCHAR(500) DEFAULT NULL;

      CREATE TABLE IF NOT EXISTS participant_groups (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(50) DEFAULT 'indigo',
        department VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS group_members (
        group_id VARCHAR(100) NOT NULL REFERENCES participant_groups(id) ON DELETE CASCADE,
        participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (group_id, participant_card)
      );

      CREATE TABLE IF NOT EXISTS training_programs (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived', 'completed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS program_events (
        program_id VARCHAR(100) NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
        event_id VARCHAR(100) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        is_mandatory BOOLEAN DEFAULT TRUE,
        order_index INTEGER DEFAULT 0,
        PRIMARY KEY (program_id, event_id)
      );

      CREATE TABLE IF NOT EXISTS program_target_groups (
        program_id VARCHAR(100) NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
        group_id VARCHAR(100) NOT NULL REFERENCES participant_groups(id) ON DELETE CASCADE,
        PRIMARY KEY (program_id, group_id)
      );

      CREATE TABLE IF NOT EXISTS program_target_participants (
        program_id VARCHAR(100) NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
        participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
        PRIMARY KEY (program_id, participant_card)
      );

      CREATE TABLE IF NOT EXISTS companies (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        logo_url TEXT,
        rnc_tax_id VARCHAR(50),
        industry VARCHAR(100),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO companies (id, name, slug, logo_url, rnc_tax_id, industry, contact_email, contact_phone, is_active)
      VALUES 
        ('emp_kasino', 'Kasino 21 Corporativo', 'kasino-21', 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=200&q=80', '101-928374-1', 'Entretenimiento & Hospitalidad', 'contacto@kasino21.com', '+1 (809) 555-0120', true),
        ('emp_resort', 'Gran Resort & Hospitality Club', 'gran-resort', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=200&q=80', '101-445566-2', 'Turismo & Hotelería', 'info@granresort.com', '+1 (809) 555-0340', true),
        ('emp_tech', 'Tech Innovations Labs', 'tech-innovations', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80', '101-778899-3', 'Tecnología & Software', 'rrhh@techlabs.io', '+1 (809) 555-0560', true)
      ON CONFLICT (id) DO NOTHING;

      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS supervisor_id VARCHAR(100);
      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS supervisor_name VARCHAR(255);
      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS department VARCHAR(150);
      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50) DEFAULT 'contratado';
      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS company_id VARCHAR(100) DEFAULT 'emp_kasino';
      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS birth_date DATE;
      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS education_level VARCHAR(100);
      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS is_currently_studying BOOLEAN DEFAULT FALSE;
      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS current_study_field VARCHAR(255);
      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS institution_name VARCHAR(255);
      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS profession_title VARCHAR(255);
      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS current_address TEXT;
      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS gender VARCHAR(50);
      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS training_interest_areas TEXT[] DEFAULT '{}';
      ALTER TABLE IF EXISTS participants ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

      ALTER TABLE IF EXISTS users_simulated ADD COLUMN IF NOT EXISTS assigned_member_cards TEXT[];
      ALTER TABLE IF EXISTS users_simulated ADD COLUMN IF NOT EXISTS department VARCHAR(150);
      ALTER TABLE IF EXISTS users_simulated ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50) DEFAULT 'contratado';
      ALTER TABLE IF EXISTS users_simulated ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE IF EXISTS users_simulated ADD COLUMN IF NOT EXISTS company_id VARCHAR(100) DEFAULT 'emp_kasino';
      ALTER TABLE IF EXISTS users_simulated ADD COLUMN IF NOT EXISTS birth_date DATE;
      ALTER TABLE IF EXISTS users_simulated ADD COLUMN IF NOT EXISTS education_level VARCHAR(100);
      ALTER TABLE IF EXISTS users_simulated ADD COLUMN IF NOT EXISTS is_currently_studying BOOLEAN DEFAULT FALSE;
      ALTER TABLE IF EXISTS users_simulated ADD COLUMN IF NOT EXISTS current_study_field VARCHAR(255);
      ALTER TABLE IF EXISTS users_simulated ADD COLUMN IF NOT EXISTS institution_name VARCHAR(255);
      ALTER TABLE IF EXISTS users_simulated ADD COLUMN IF NOT EXISTS profession_title VARCHAR(255);
      ALTER TABLE IF EXISTS users_simulated ADD COLUMN IF NOT EXISTS current_address TEXT;
      ALTER TABLE IF EXISTS users_simulated ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE IF EXISTS users_simulated ADD COLUMN IF NOT EXISTS gender VARCHAR(50);
      ALTER TABLE IF EXISTS users_simulated ADD COLUMN IF NOT EXISTS training_interest_areas TEXT[] DEFAULT '{}';
      ALTER TABLE IF EXISTS users_simulated ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

      -- Semilla de datos sociodemográficos para pruebas analíticas
      UPDATE participants 
      SET education_level = 'Profesional / Grado', 
          profession_title = 'Ingeniero de Software', 
          birth_date = '1992-05-14', 
          is_currently_studying = false, 
          current_address = 'Av. 27 de Febrero #102, Santo Domingo', 
          phone = '809-555-1020', 
          gender = 'Masculino', 
          training_interest_areas = ARRAY['Tecnología y Herramientas Digitales / IA', 'Liderazgo y Gestión de Equipos'],
          profile_completed = true
      WHERE card = '2010' AND education_level IS NULL;

      UPDATE participants 
      SET education_level = 'Técnico / Tecnólogo', 
          profession_title = 'Técnica en Redes y Telecomunicaciones', 
          birth_date = '1998-11-20', 
          is_currently_studying = true, 
          current_study_field = 'Licenciatura en Ciberseguridad', 
          institution_name = 'Instituto Tecnológico de Santo Domingo (INTEC)',
          current_address = 'Calle del Sol #45, Santiago de los Caballeros', 
          phone = '809-555-4030', 
          gender = 'Femenino', 
          training_interest_areas = ARRAY['Excel y Análisis de Datos', 'Tecnología y Herramientas Digitales / IA'],
          profile_completed = true
      WHERE card = '2012' AND education_level IS NULL;

      UPDATE participants 
      SET education_level = 'Secundaria / Bachiller', 
          profession_title = 'Bachiller Técnico', 
          birth_date = '2001-03-08', 
          is_currently_studying = true, 
          current_study_field = 'Técnico Superior en Electricidad', 
          institution_name = 'INFOTEP',
          current_address = 'Av. Independencia #512, Santo Domingo', 
          phone = '809-555-8812', 
          gender = 'Masculino', 
          training_interest_areas = ARRAY['Seguridad Industrial y Procesos', 'Atención al Cliente y Comunicación Asertiva'],
          profile_completed = true
      WHERE card = '1998' AND education_level IS NULL;

      -- Sincronizar hacia usuarios_simulados existentes
      UPDATE users_simulated u
      SET education_level = p.education_level,
          profession_title = p.profession_title,
          birth_date = p.birth_date,
          is_currently_studying = p.is_currently_studying,
          current_study_field = p.current_study_field,
          institution_name = p.institution_name,
          current_address = p.current_address,
          phone = p.phone,
          gender = p.gender,
          training_interest_areas = p.training_interest_areas,
          profile_completed = p.profile_completed
      FROM participants p
      WHERE LOWER(u.email) = LOWER(p.email) AND u.education_level IS NULL;

      ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS company_id VARCHAR(100) DEFAULT 'emp_kasino';
      ALTER TABLE IF EXISTS participant_groups ADD COLUMN IF NOT EXISTS company_id VARCHAR(100) DEFAULT 'emp_kasino';
      ALTER TABLE IF EXISTS training_programs ADD COLUMN IF NOT EXISTS company_id VARCHAR(100) DEFAULT 'emp_kasino';

      ALTER TABLE IF EXISTS registrations ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT FALSE;
      ALTER TABLE IF EXISTS registrations ADD COLUMN IF NOT EXISTS assigned_by VARCHAR(255) DEFAULT NULL;
      ALTER TABLE IF EXISTS registrations ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(50) DEFAULT 'self';
      ALTER TABLE IF EXISTS registrations ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE IF EXISTS registrations ADD COLUMN IF NOT EXISTS assignment_notes TEXT DEFAULT NULL;

      -- Campos de Evaluación Académica y Calificaciones
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

      -- Columnas para Encuesta de Evaluación TEC (Curso y Facilitador)
      ALTER TABLE IF EXISTS event_feedbacks ADD COLUMN IF NOT EXISTS course_ratings JSONB DEFAULT '{}';
      ALTER TABLE IF EXISTS event_feedbacks ADD COLUMN IF NOT EXISTS facilitator_ratings JSONB DEFAULT '{}';
      ALTER TABLE IF EXISTS event_feedbacks ADD COLUMN IF NOT EXISTS course_score NUMERIC(5, 2);
      ALTER TABLE IF EXISTS event_feedbacks ADD COLUMN IF NOT EXISTS facilitator_score NUMERIC(5, 2);

      -- Restricción estricta: 1 sola respuesta de encuesta por colaborador y por evento
      CREATE UNIQUE INDEX IF NOT EXISTS idx_event_feedbacks_unique_user_event 
      ON event_feedbacks(event_id, LOWER(user_email));

      -- Fechas y Horas de Finalización en Eventos, Horarios y Códigos Diarios
      ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS start_date DATE;
      ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS end_date DATE;
      ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS start_time VARCHAR(50);
      ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS end_time VARCHAR(50);
      ALTER TABLE IF EXISTS event_schedules ADD COLUMN IF NOT EXISTS end_date DATE;
      ALTER TABLE IF EXISTS event_slots ADD COLUMN IF NOT EXISTS end_time VARCHAR(50);
      ALTER TABLE IF EXISTS event_slots ADD COLUMN IF NOT EXISTS checkin_code VARCHAR(50);
      ALTER TABLE IF EXISTS event_slots ADD COLUMN IF NOT EXISTS checkout_code VARCHAR(50);
      ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS company_ids TEXT[] DEFAULT '{}';
      ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS total_hours NUMERIC(5,1) DEFAULT 0;
      ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS session_type VARCHAR(100) DEFAULT 'Sincrónica';
      ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS training_type VARCHAR(100) DEFAULT 'Técnico';
      ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS training_format VARCHAR(100) DEFAULT 'Taller';
      ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS program_category VARCHAR(150) DEFAULT 'Capacitacion_seguridad_salud_en_el_trabajo_y_sustentabilidad';
      ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS subprogram VARCHAR(150) DEFAULT 'Sustentabilidad';
      ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS supplier VARCHAR(255) DEFAULT 'Claro';

      -- Control de Asistencia Entrada y Salida
      ALTER TABLE IF EXISTS attendance_logs ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE IF EXISTS attendance_logs ADD COLUMN IF NOT EXISTS check_out_at TIMESTAMP DEFAULT NULL;
      ALTER TABLE IF EXISTS attendance_logs ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

      -- Backfill de códigos diarios para slots existentes que no tengan código
      UPDATE event_slots 
      SET checkin_code = LPAD(FLOOR(RANDOM() * 9000 + 1000)::text, 4, '0')
      WHERE checkin_code IS NULL;

      UPDATE event_slots 
      SET checkout_code = LPAD(FLOOR(RANDOM() * 9000 + 1000)::text, 4, '0')
      WHERE checkout_code IS NULL;

      -- Actualizar eventos existentes para tener competencias y tipos de evaluación demostrativos
      UPDATE events 
      SET evaluation_type = 'score_100', 
          passing_score = 75.00, 
          skills_evaluated = ARRAY['Arquitectura y Hooks React', 'Optimización de Rendimiento Frontend', 'Diseño de Interfaces UI/UX'],
          ojt_evaluator_id = 'usr_ojt',
          ojt_evaluator_name = 'Lic. Carlos Mendoza (Tutor OJT)',
          ojt_evaluator_email = 'tutor.ojt@empresa.com',
          modules = '[
            {"id": "mod_1", "title": "Módulo 1: Fundamentos y Arquitectura UI", "description": "Hooks avanzados, ciclo de vida y patrones de renderizado.", "passingScore": 70, "maxScore": 100, "orderIndex": 1},
            {"id": "mod_2", "title": "Módulo 2: Optimización de Rendimiento y UX", "description": "Profiling, bundle splitting y estándares de experiencia.", "passingScore": 75, "maxScore": 100, "orderIndex": 2},
            {"id": "mod_3", "title": "Módulo 3: Práctica de Campo y Evaluación Operativa", "description": "Implementación práctica en puesto de trabajo y simulación real.", "passingScore": 80, "maxScore": 100, "orderIndex": 3}
          ]'::jsonb
      WHERE id = 'evt_1';

      UPDATE events 
      SET evaluation_type = 'pass_fail', 
          passing_score = 70.00, 
          skills_evaluated = ARRAY['Pensamiento Crítico', 'Ética en Redes Digitales', 'Privacidad de Datos']
      WHERE id = 'evt_2' AND (evaluation_type IS NULL OR evaluation_type = 'attendance_only');

      UPDATE events 
      SET evaluation_type = 'attendance_only', 
          skills_evaluated = ARRAY['Productividad con IA', 'Ingeniería de Prompts', 'Automatización de Tareas']
      WHERE id = 'evt_3' AND (evaluation_type IS NULL OR evaluation_type = 'attendance_only');

      -- Insertar calificaciones de ejemplo para demostrar detección de debilidades
      INSERT INTO participant_grades (id, event_id, participant_card, score, academic_status, detected_skill_gaps, weaknesses_notes, strengths_notes, needs_retraining, feedback, graded_by)
      VALUES 
        ('grd_demo_1', 'evt_1', '2010', 92.00, 'passed', '{}', 'Ninguna debilidad observada. Excelente dominio técnico.', 'Excelente velocidad de implementación y patrones limpios.', false, '¡Aprobado con honores! Puede actuar como mentor técnico.', 'Ing. Roberto Gómez'),
        ('grd_demo_2', 'evt_1', '2012', 62.00, 'failed', ARRAY['Optimización de Rendimiento Frontend'], 'Dificultad con useMemo, re-renders innecesarios y bundle splitting.', 'Buena maquetación y diseño visual.', true, 'Requiere re-capacitación práctica en profiling y optimización de componentes.', 'Ing. Roberto Gómez'),
        ('grd_demo_3', 'evt_2', '2010', 100.00, 'passed', '{}', 'Ninguna debilidad.', 'Excelente participación en debate de ciberseguridad.', false, 'Aprobado satisfactoriamente.', 'Lic. María Santos')
      ON CONFLICT (event_id, participant_card) DO NOTHING;

      -- =========================================================
      -- TABLA DE CONFIGURACIONES GLOBALES (FEATURE FLAGS & SETTINGS)
      -- =========================================================
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

      -- =========================================================
      -- EXTENSIÓN MODELO 70-20-10 EN CRONOGRAMAS
      -- =========================================================
      ALTER TABLE IF EXISTS training_programs ADD COLUMN IF NOT EXISTS learning_framework VARCHAR(50) DEFAULT 'standard';
      ALTER TABLE IF EXISTS program_events ADD COLUMN IF NOT EXISTS stage_category VARCHAR(50) DEFAULT 'formal_course_10';

      -- =========================================================
      -- TABLA DE BITÁCORAS & CHECKLISTS OJT EN CAMPO
      -- =========================================================
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

      -- =========================================================
      -- TABLA DE SESIONES DE CALIBRACIÓN OPS-CAPACITACIÓN
      -- =========================================================
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

      -- Insertar datos demo OJT y Calibración
      INSERT INTO ojt_checklists (
        id, company_id, participant_card, evaluator_user_id, evaluator_name, date, observation_type, overall_score, operational_status, safety_protocol_pass, first_time_fix_pass, rubric_evaluation, weaknesses_identified, immediate_action_plan, notes
      ) VALUES 
        (
          'ojt_demo_1', 
          'emp_kasino', 
          '2010', 
          'usr_1', 
          'Lic. Carlos Mendoza (Líder OJT)', 
          CURRENT_DATE - INTERVAL '3 days', 
          'daily_observation', 
          95.00, 
          'compliant', 
          true, 
          true, 
          '[{"category":"Seguridad y EPP","score":100,"notes":"Uso impecable de equipo"},{"category":"Procedimiento Técnico","score":95,"notes":"Secuencia correcta"},{"category":"First-Time Fix","score":100,"notes":"Sin retrabajo"},{"category":"Tiempo Operativo","score":85,"notes":"Dentro de estándar"}]'::jsonb, 
          '{}', 
          'Mantener autonomía actual y asignar como acompañante de nuevos ingresos.', 
          'Desempeño sobresaliente en atención al cliente y resolución técnica.'
        ),
        (
          'ojt_demo_2', 
          'emp_kasino', 
          '2012', 
          'usr_1', 
          'Lic. Carlos Mendoza (Líder OJT)', 
          CURRENT_DATE - INTERVAL '1 day', 
          'weekly_evaluation', 
          68.00, 
          'needs_coaching', 
          true, 
          false, 
          '[{"category":"Seguridad y EPP","score":90,"notes":"Cumple protocolos"},{"category":"Procedimiento Técnico","score":60,"notes":"Dudas en secuencia de arranque"},{"category":"First-Time Fix","score":50,"notes":"Requirió apoyo secundario"},{"category":"Tiempo Operativo","score":70,"notes":"Tiempo elevado"}]'::jsonb, 
          ARRAY['Procedimiento Técnico', 'First-Time Fix'], 
          'Shadowing guiado de 3 días con técnico senior y repaso de checklist de puesta a punto.', 
          'Presenta nerviosismo al operar bajo presión de tiempo. Buena actitud de aprendizaje.'
        )
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO calibration_sessions (
        id, company_id, title, date, conducted_by, participants_reviewed, average_theory_score, average_field_score, variance_gap_pct, status, key_findings, action_agreements
      ) VALUES 
        (
          'calib_demo_1', 
          'emp_kasino', 
          'Mesa de Calibración Mensual: Operaciones vs Formación Q3', 
          CURRENT_DATE - INTERVAL '7 days', 
          'Mesa Conjunta (Ing. Roberto Gómez & Lic. Carlos Mendoza)', 
          12, 
          88.50, 
          72.30, 
          16.20, 
          'completed',
          'Se detecta que los colaboradores aprueban la teoría con 90% pero al ejecutar el procedimiento en campo omiten 2 pasos clave del checklist.', 
          '1. Actualizar videos y simulaciones del taller. 2. Aumentar el shadowing en campo de 3 a 5 días antes de otorgar certificación de autonomía.'
        )
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO users_simulated (id, email, name, role, password, cedula, department, company_id)
      VALUES 
        ('usr_ojt', 'tutor.ojt@empresa.com', 'Lic. Carlos Mendoza (Tutor OJT)', 'Evaluador / Tutor OJT', '123', '001-9876543-1', 'Operaciones', 'emp_kasino')
      ON CONFLICT (id) DO UPDATE SET role = 'Evaluador / Tutor OJT';

      -- =========================================================
      -- TABLA DE CAPACITACIONES EXTERNAS (PROGRAMA DE SUSTENTABILIDAD)
      -- =========================================================
      CREATE TABLE IF NOT EXISTS external_trainings (
        id VARCHAR(100) PRIMARY KEY,
        participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        session_type VARCHAR(50) NOT NULL DEFAULT 'Asincrónica',
        training_type VARCHAR(50) NOT NULL DEFAULT 'Técnico',
        training_format VARCHAR(100) NOT NULL DEFAULT 'Curso',
        modality VARCHAR(50) NOT NULL DEFAULT 'Virtual',
        program_category VARCHAR(150) NOT NULL DEFAULT 'Capacitacion_tecnologica_digital',
        subprogram VARCHAR(150) NOT NULL DEFAULT 'Desarrollo de software',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_hours NUMERIC(6, 2) NOT NULL DEFAULT 1,
        supplier VARCHAR(255) NOT NULL DEFAULT 'Externo',
        description TEXT,
        credential_url TEXT,
        certificate_number VARCHAR(100),
        score NUMERIC(5, 2),
        academic_status VARCHAR(50) DEFAULT 'passed',
        company_id VARCHAR(100) DEFAULT 'emp_kasino',
        registered_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_ext_trainings_card ON external_trainings(participant_card);
      CREATE INDEX IF NOT EXISTS idx_ext_trainings_company ON external_trainings(company_id);

      -- =========================================================
      -- TABLAS DE ACADEMIA TÉCNICA (CAPACITACIONES RECURRENTES & ROTACIÓN)
      -- =========================================================
      CREATE TABLE IF NOT EXISTS technical_academy_courses (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        code VARCHAR(50),
        description TEXT,
        category VARCHAR(100) NOT NULL DEFAULT 'Planta Externa',
        daily_hours NUMERIC(4, 2) NOT NULL DEFAULT 4.00,
        duration_days INTEGER NOT NULL DEFAULT 5,
        modality VARCHAR(50) NOT NULL DEFAULT 'Presencial (Taller)',
        location VARCHAR(255) DEFAULT 'Laboratorio Central de Planta Externa',
        company_id VARCHAR(100) DEFAULT 'emp_kasino',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_tac_courses_company ON technical_academy_courses(company_id);

      CREATE TABLE IF NOT EXISTS technical_academy_cohorts (
        id VARCHAR(100) PRIMARY KEY,
        course_id VARCHAR(100) NOT NULL REFERENCES technical_academy_courses(id) ON DELETE CASCADE,
        group_id VARCHAR(100) REFERENCES participant_groups(id) ON DELETE SET NULL,
        group_name VARCHAR(255),
        facilitator_id VARCHAR(50) REFERENCES users_simulated(id) ON DELETE SET NULL,
        facilitator_name VARCHAR(255),
        facilitator_email VARCHAR(255),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        week_number INTEGER,
        year INTEGER,
        daily_time VARCHAR(50) DEFAULT '08:00 AM - 12:00 PM',
        location VARCHAR(255),
        capacity INTEGER DEFAULT 20,
        status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
        notes TEXT,
        daily_pin VARCHAR(10) DEFAULT '2026',
        company_id VARCHAR(100) DEFAULT 'emp_kasino',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_tac_cohorts_course ON technical_academy_cohorts(course_id);
      CREATE INDEX IF NOT EXISTS idx_tac_cohorts_group ON technical_academy_cohorts(group_id);
      CREATE INDEX IF NOT EXISTS idx_tac_cohorts_dates ON technical_academy_cohorts(start_date, end_date);

      CREATE TABLE IF NOT EXISTS technical_academy_enrollments (
        id SERIAL PRIMARY KEY,
        cohort_id VARCHAR(100) NOT NULL REFERENCES technical_academy_cohorts(id) ON DELETE CASCADE,
        participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'dropped')),
        attendance_percentage NUMERIC(5, 2) DEFAULT 0,
        UNIQUE (cohort_id, participant_card)
      );
      CREATE INDEX IF NOT EXISTS idx_tac_enrollments_cohort ON technical_academy_enrollments(cohort_id);
      CREATE INDEX IF NOT EXISTS idx_tac_enrollments_card ON technical_academy_enrollments(participant_card);

      CREATE TABLE IF NOT EXISTS technical_academy_attendance (
        id SERIAL PRIMARY KEY,
        cohort_id VARCHAR(100) NOT NULL REFERENCES technical_academy_cohorts(id) ON DELETE CASCADE,
        participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
        session_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('present', 'late', 'absent', 'excused')),
        method VARCHAR(20) DEFAULT 'manual' CHECK (method IN ('manual', 'qr_scan', 'pin')),
        marked_by VARCHAR(255),
        marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        UNIQUE (cohort_id, participant_card, session_date)
      );
      CREATE INDEX IF NOT EXISTS idx_tac_attendance_cohort_date ON technical_academy_attendance(cohort_id, session_date);

      -- Semillas de Cursos Técnicos y Cohortes
      INSERT INTO technical_academy_courses (id, title, code, description, category, daily_hours, duration_days, modality, location, company_id) VALUES
        ('tac_fo_101', 'Instalación y Fusión de Fibra Óptica GPON', 'TEC-FO-01', 'Taller práctico diario de conectorización, empalmes por fusión, reflectometría OTDR y resolución de averías en planta externa.', 'Planta Externa', 4.00, 5, 'Presencial (Laboratorio)', 'Taller Central de Planta Externa - Piso 1', 'emp_kasino'),
        ('tac_hfc_201', 'Operación y Mantenimiento de Nodos HFC', 'TEC-HFC-02', 'Capacitación técnica diaria para balanceo de amplificadores, fuentes de poder y calibración de señal coaxial de banda ancha.', 'Redes HFC', 4.00, 5, 'Presencial (Laboratorio)', 'Laboratorio de Redes & Banda Ancha', 'emp_kasino'),
        ('tac_seg_301', 'Seguridad y Trabajos en Altura & Espacios Confinados', 'TEC-SEG-03', 'Normativa de seguridad técnica, inspección de arneses, líneas de vida y protocolos de rescate en postes y torres.', 'Seguridad Industrial', 3.50, 4, 'Presencial (Campo)', 'Patios de Entrenamiento Operativo', 'emp_kasino')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO technical_academy_cohorts (id, course_id, group_id, group_name, facilitator_id, facilitator_name, facilitator_email, start_date, end_date, week_number, year, daily_time, location, capacity, status, daily_pin, company_id) VALUES
        ('coh_2026_w38_fo', 'tac_fo_101', 'grp_ti', 'Departamento de TI & Sistemas', 'usr_2', 'Carlos Pérez', 'admin.capacitacion@empresa.com', '2026-09-14', '2026-09-18', 38, 2026, '08:00 AM - 12:00 PM', 'Taller Central de Planta Externa - Piso 1', 15, 'in_progress', '4589', 'emp_kasino'),
        ('coh_2026_w39_fo', 'tac_fo_101', 'grp_ventas', 'Equipo Comercial & Ventas', 'usr_1', 'Sofía Martínez', 'sofia.ceo@empresa.com', '2026-09-21', '2026-09-25', 39, 2026, '08:00 AM - 12:00 PM', 'Taller Central de Planta Externa - Piso 1', 15, 'scheduled', '7812', 'emp_kasino')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO technical_academy_enrollments (cohort_id, participant_card, status) VALUES
        ('coh_2026_w38_fo', '2010', 'enrolled'),
        ('coh_2026_w38_fo', '2012', 'enrolled')
      ON CONFLICT (cohort_id, participant_card) DO NOTHING;
    `);
        console.log('✅ Esquema PostgreSQL sincronizado y verificado correctamente.');
    }
    catch (err) {
        console.warn('⚠️ Nota sobre verificación de esquema PostgreSQL:', err.message);
    }
};
exports.initDbMigrations = initDbMigrations;
