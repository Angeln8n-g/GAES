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

      ALTER TABLE participants ADD COLUMN IF NOT EXISTS supervisor_id VARCHAR(100);
      ALTER TABLE participants ADD COLUMN IF NOT EXISTS supervisor_name VARCHAR(255);
      ALTER TABLE participants ADD COLUMN IF NOT EXISTS department VARCHAR(150);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_member_cards TEXT[];
      ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(150);
    `);
        console.log('✅ Esquema PostgreSQL sincronizado y verificado correctamente.');
    }
    catch (err) {
        console.warn('⚠️ Nota sobre verificación de esquema PostgreSQL:', err.message);
    }
};
exports.initDbMigrations = initDbMigrations;
