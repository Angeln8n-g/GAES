"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMigrationStatus = getMigrationStatus;
exports.runMigrations = runMigrations;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const db_js_1 = require("./db.js");
/**
 * Resuelve el directorio de migraciones buscando en dist o src según el entorno
 */
function resolveMigrationsDir() {
    const candidates = [
        path_1.default.resolve(__dirname, 'migrations'),
        path_1.default.resolve(__dirname, '../src/migrations'),
        path_1.default.resolve(process.cwd(), 'server/src/migrations'),
        path_1.default.resolve(process.cwd(), 'src/migrations'),
        path_1.default.resolve(process.cwd(), 'dist/migrations'),
        '/app/dist/migrations'
    ];
    for (const dir of candidates) {
        if (fs_1.default.existsSync(dir) && fs_1.default.statSync(dir).isDirectory()) {
            return dir;
        }
    }
    throw new Error(`No se encontró el directorio de migraciones en ninguna de las rutas esperadas.`);
}
/**
 * Calcula el hash SHA-256 del contenido de un archivo
 */
function computeChecksum(content) {
    return crypto_1.default.createHash('sha256').update(content, 'utf8').digest('hex');
}
/**
 * Asegura la existencia de la tabla de auditoría de migraciones
 */
async function ensureMigrationsTable() {
    await db_js_1.pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      execution_time_ms INTEGER NOT NULL,
      success BOOLEAN NOT NULL DEFAULT TRUE
    );
    CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);
  `);
}
/**
 * Consulta el estado de todas las migraciones (aplicadas vs pendientes)
 */
async function getMigrationStatus() {
    await ensureMigrationsTable();
    const migrationsDir = resolveMigrationsDir();
    const files = fs_1.default.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    const dbRes = await db_js_1.pool.query(`
    SELECT version, name, checksum, applied_at, execution_time_ms, success 
    FROM schema_migrations 
    ORDER BY version ASC
  `);
    const appliedMap = new Map();
    dbRes.rows.forEach(r => appliedMap.set(r.version, r));
    const results = [];
    for (const file of files) {
        const version = file.split('_')[0];
        const fullPath = path_1.default.join(migrationsDir, file);
        const content = fs_1.default.readFileSync(fullPath, 'utf8');
        const checksum = computeChecksum(content);
        const applied = appliedMap.get(version);
        if (applied) {
            results.push({
                id: applied.id,
                version,
                name: file,
                checksum,
                appliedAt: applied.applied_at,
                executionTimeMs: applied.execution_time_ms,
                success: applied.success,
                status: applied.success ? 'applied' : 'failed'
            });
        }
        else {
            results.push({
                version,
                name: file,
                checksum,
                status: 'pending'
            });
        }
    }
    return results;
}
/**
 * Ejecuta de forma secuencial y transaccional todas las migraciones pendientes
 */
async function runMigrations() {
    console.log('🔄 Iniciando verificación de migraciones PostgreSQL...');
    await ensureMigrationsTable();
    const migrationsDir = resolveMigrationsDir();
    const files = fs_1.default.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    const appliedRes = await db_js_1.pool.query('SELECT version FROM schema_migrations WHERE success = true');
    const appliedVersions = new Set(appliedRes.rows.map(r => r.version));
    let appliedCount = 0;
    const executionResults = [];
    for (const file of files) {
        const version = file.split('_')[0];
        const fullPath = path_1.default.join(migrationsDir, file);
        const sqlContent = fs_1.default.readFileSync(fullPath, 'utf8');
        const checksum = computeChecksum(sqlContent);
        if (appliedVersions.has(version)) {
            continue;
        }
        console.log(`⏳ Aplicando migración [${version}]: ${file}...`);
        const startTime = Date.now();
        const client = await db_js_1.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(sqlContent);
            const executionTime = Date.now() - startTime;
            await client.query(`
        INSERT INTO schema_migrations (version, name, checksum, execution_time_ms, success)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (version) DO UPDATE SET
          checksum = EXCLUDED.checksum,
          execution_time_ms = EXCLUDED.execution_time_ms,
          applied_at = CURRENT_TIMESTAMP,
          success = true
      `, [version, file, checksum, executionTime]);
            await client.query('COMMIT');
            appliedCount++;
            console.log(`✅ Migración [${version}] aplicada exitosamente en ${executionTime}ms.`);
            executionResults.push({
                version,
                name: file,
                checksum,
                executionTimeMs: executionTime,
                status: 'applied',
                success: true
            });
        }
        catch (err) {
            await client.query('ROLLBACK');
            console.error(`❌ Error al aplicar migración [${version}] (${file}):`, err.message);
            await db_js_1.pool.query(`
        INSERT INTO schema_migrations (version, name, checksum, execution_time_ms, success)
        VALUES ($1, $2, $3, $4, false)
        ON CONFLICT (version) DO UPDATE SET
          execution_time_ms = EXCLUDED.execution_time_ms,
          applied_at = CURRENT_TIMESTAMP,
          success = false
      `, [version, file, checksum, Date.now() - startTime]).catch(() => { });
            throw new Error(`Fallo en migración ${file}: ${err.message}`);
        }
        finally {
            client.release();
        }
    }
    if (appliedCount === 0) {
        console.log('✨ Base de datos al día. No hay migraciones pendientes.');
    }
    else {
        console.log(`🎉 Se aplicaron ${appliedCount} migración(es) satisfactoriamente.`);
    }
    return { appliedCount, results: executionResults };
}
// Soporte para ejecución por consola CLI
const isDirectCli = process.argv[1] && (process.argv[1].endsWith('migrator.ts') ||
    process.argv[1].endsWith('migrator.js'));
if (isDirectCli) {
    const command = process.argv[2] || 'run';
    if (command === 'status') {
        getMigrationStatus()
            .then((status) => {
            console.table(status);
            process.exit(0);
        })
            .catch((err) => {
            console.error('Error al consultar estado de migraciones:', err);
            process.exit(1);
        });
    }
    else {
        runMigrations()
            .then(() => process.exit(0))
            .catch((err) => {
            console.error('Error durante la ejecución de migraciones:', err);
            process.exit(1);
        });
    }
}
