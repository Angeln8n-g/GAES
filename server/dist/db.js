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
const migrator_js_1 = require("./migrator.js");
/**
 * Ejecuta migraciones automáticas versionadas y transaccionales
 */
const initDbMigrations = async () => {
    try {
        await (0, migrator_js_1.runMigrations)();
    }
    catch (err) {
        console.error('⚠️ Error al inicializar migraciones de base de datos:', err.message);
    }
};
exports.initDbMigrations = initDbMigrations;
