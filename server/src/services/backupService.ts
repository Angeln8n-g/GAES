import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { pool } from '../db.js';

const execAsync = promisify(exec);

export interface BackupMetadata {
  filename: string;
  filepath: string;
  sizeBytes: number;
  sizeFormatted: string;
  sha256: string;
  createdAt: string;
  triggerType: 'automated_scheduled' | 'manual_admin' | 'pre_restore_safety';
  tableCount?: number;
  databaseName: string;
}

export interface DatabaseStats {
  databaseName: string;
  databaseSize: string;
  databaseSizeBytes: number;
  tableCount: number;
  backupCount: number;
  totalBackupSizeBytes: number;
  totalBackupSizeFormatted: string;
  lastBackupAt: string | null;
  serverTime: string;
}

/**
 * Resuelve el directorio de respaldos persistente
 */
export function resolveBackupsDir(): string {
  const candidates = [
    '/app/backups',
    path.resolve(process.cwd(), 'backups'),
    path.resolve(process.cwd(), '../backups'),
    '/opt/apps/gaes/backups'
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  const defaultDir = path.resolve(process.cwd(), 'backups');
  fs.mkdirSync(defaultDir, { recursive: true });
  return defaultDir;
}

/**
 * Formatea bytes en cadena legible (KB, MB, GB)
 */
function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Calcula el hash SHA-256 de un archivo
 */
async function computeFileSha256(filepath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filepath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', err => reject(err));
  });
}

/**
 * Obtiene parámetros de conexión para herramientas CLI de PostgreSQL
 */
function getDbConnectionParams() {
  const connString = process.env.DATABASE_URL;
  if (connString) {
    try {
      const parsed = new URL(connString);
      return {
        host: parsed.hostname || 'localhost',
        port: parsed.port || '5432',
        user: parsed.username || 'postgres',
        password: parsed.password || 'postgrespassword',
        database: parsed.pathname ? parsed.pathname.replace('/', '') : 'capacitahub_db'
      };
    } catch (_) {}
  }

  return {
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || '5432',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgrespassword',
    database: process.env.PGDATABASE || 'capacitahub_db'
  };
}

/**
 * Genera un respaldo completo de la base de datos comprimido con gzip
 */
export async function createDatabaseBackup(
  triggerType: 'automated_scheduled' | 'manual_admin' | 'pre_restore_safety' = 'manual_admin',
  triggeredBy: string = 'Super Administrador'
): Promise<BackupMetadata> {
  const backupsDir = resolveBackupsDir();
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseName = `backup_capacitahub_${timestamp}.sql.gz`;
  const targetFile = path.join(backupsDir, baseName);
  const metadataFile = path.join(backupsDir, `${baseName}.json`);
  const sha256File = path.join(backupsDir, `${baseName}.sha256`);

  const dbParams = getDbConnectionParams();

  console.log(`📦 [BackupService] Iniciando respaldo de PostgreSQL: ${baseName} (${triggerType})...`);

  // Ejecutar pg_dump piped a gzip
  // En Docker, nos conectamos vía host 'postgres' (o 'localhost' si corre en el host)
  const env = {
    ...process.env,
    PGPASSWORD: dbParams.password
  };

  // Intentar ejecutar pg_dump nativo o fallback a docker exec gaes_postgres
  let dumpCommand = `pg_dump -h ${dbParams.host} -p ${dbParams.port} -U ${dbParams.user} -d ${dbParams.database} --clean --if-exists --no-owner --no-privileges | gzip -9 > "${targetFile}"`;

  try {
    await execAsync(dumpCommand, { env });
  } catch (err: any) {
    console.warn('⚠️ Falló pg_dump nativo, probando docker exec gaes_postgres...', err.message);
    // Fallback para entornos donde el script se ejecuta en el host
    dumpCommand = `docker exec gaes_postgres pg_dump -U postgres -d capacitahub_db --clean --if-exists --no-owner --no-privileges | gzip -9 > "${targetFile}"`;
    await execAsync(dumpCommand);
  }

  if (!fs.existsSync(targetFile) || fs.statSync(targetFile).size === 0) {
    throw new Error('El archivo de respaldo no fue generado o se encuentra vacío.');
  }

  const stat = fs.statSync(targetFile);
  const sha256 = await computeFileSha256(targetFile);

  // Escribir archivo de suma de verificación .sha256
  fs.writeFileSync(sha256File, `${sha256}  ${baseName}\n`, 'utf8');

  // Obtener conteo de tablas
  let tableCount = 0;
  try {
    const tRes = await pool.query(`
      SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public'
    `);
    tableCount = tRes.rows[0]?.count || 0;
  } catch (_) {}

  const metadata: BackupMetadata = {
    filename: baseName,
    filepath: targetFile,
    sizeBytes: stat.size,
    sizeFormatted: formatBytes(stat.size),
    sha256,
    createdAt: now.toISOString(),
    triggerType,
    tableCount,
    databaseName: dbParams.database
  };

  // Guardar descriptor JSON
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf8');

  // Registrar auditoría en PostgreSQL
  try {
    await pool.query(`
      INSERT INTO backup_audit_logs (filename, action, status, size_bytes, sha256_hash, triggered_by, performed_at, notes)
      VALUES ($1, 'backup_created', 'success', $2, $3, $4, CURRENT_TIMESTAMP, $5)
    `, [baseName, stat.size, sha256, triggeredBy, `Tipo: ${triggerType}`]);
  } catch (_) {}

  console.log(`✅ [BackupService] Respaldo generado con éxito: ${baseName} (${metadata.sizeFormatted}) [SHA256: ${sha256.slice(0, 12)}...]`);

  // Aplicar rotación de retención GFS
  await pruneOldBackups();

  return metadata;
}

/**
 * Consulta la lista de respaldos existentes con sus metadatos
 */
export async function getBackupsList(): Promise<BackupMetadata[]> {
  const backupsDir = resolveBackupsDir();
  if (!fs.existsSync(backupsDir)) return [];

  const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.sql.gz')).sort().reverse();
  const list: BackupMetadata[] = [];

  for (const filename of files) {
    const fullPath = path.join(backupsDir, filename);
    const metaPath = path.join(backupsDir, `${filename}.json`);

    try {
      if (fs.existsSync(metaPath)) {
        const raw = fs.readFileSync(metaPath, 'utf8');
        const meta = JSON.parse(raw);
        list.push(meta);
      } else {
        const stat = fs.statSync(fullPath);
        const sha256 = await computeFileSha256(fullPath);
        const autoMeta: BackupMetadata = {
          filename,
          filepath: fullPath,
          sizeBytes: stat.size,
          sizeFormatted: formatBytes(stat.size),
          sha256,
          createdAt: stat.mtime.toISOString(),
          triggerType: 'automated_scheduled',
          databaseName: 'capacitahub_db'
        };
        fs.writeFileSync(metaPath, JSON.stringify(autoMeta, null, 2));
        list.push(autoMeta);
      }
    } catch (_) {}
  }

  return list;
}

/**
 * Elimina un respaldo específico y sus archivos asociados (.sha256, .json)
 */
export async function deleteBackupFile(filename: string, triggeredBy: string = 'Super Administrador'): Promise<boolean> {
  const cleanFilename = path.basename(filename);
  if (!cleanFilename.endsWith('.sql.gz')) {
    throw new Error('Formato de archivo de respaldo no válido.');
  }

  const backupsDir = resolveBackupsDir();
  const targetFile = path.join(backupsDir, cleanFilename);
  const metaFile = path.join(backupsDir, `${cleanFilename}.json`);
  const shaFile = path.join(backupsDir, `${cleanFilename}.sha256`);

  if (!fs.existsSync(targetFile)) {
    throw new Error(`El archivo ${cleanFilename} no existe.`);
  }

  let size = 0;
  try {
    size = fs.statSync(targetFile).size;
  } catch (_) {}

  fs.unlinkSync(targetFile);
  if (fs.existsSync(metaFile)) fs.unlinkSync(metaFile);
  if (fs.existsSync(shaFile)) fs.unlinkSync(shaFile);

  try {
    await pool.query(`
      INSERT INTO backup_audit_logs (filename, action, status, size_bytes, triggered_by, performed_at, notes)
      VALUES ($1, 'backup_deleted', 'success', $2, $3, CURRENT_TIMESTAMP, 'Eliminación manual por usuario')
    `, [cleanFilename, size, triggeredBy]);
  } catch (_) {}

  console.log(`🗑️ [BackupService] Respaldo eliminado: ${cleanFilename}`);
  return true;
}

/**
 * Aplica la política de retención y depuración automática GFS (Grandfather-Father-Son)
 * - Conserva todos los respaldos diarios de los últimos 7 días.
 * - Conserva respaldos semanales (domingos) hasta 4 semanas.
 * - Conserva respaldos mensuales (día 1) hasta 90 días.
 * - Elimina copias que superen estos criterios.
 */
export async function pruneOldBackups(): Promise<string[]> {
  const backups = await getBackupsList();
  if (backups.length <= 7) return [];

  const now = new Date();
  const MS_DAY = 24 * 60 * 60 * 1000;
  const deleted: string[] = [];

  for (const b of backups) {
    const bDate = new Date(b.createdAt);
    const ageDays = Math.floor((now.getTime() - bDate.getTime()) / MS_DAY);

    // 1. Conservar todos los de los últimos 7 días
    if (ageDays <= 7) continue;

    // 2. Si tiene entre 8 y 28 días: conservar si es domingo (0 = Domingo)
    if (ageDays <= 28) {
      if (bDate.getDay() === 0) continue;
    }

    // 3. Si tiene entre 29 y 90 días: conservar si es el 1er día del mes
    if (ageDays <= 90) {
      if (bDate.getDate() === 1) continue;
    }

    // De lo contrario, proceder a depuración
    try {
      await deleteBackupFile(b.filename, 'Retention-Policy-Pruner');
      deleted.push(b.filename);
    } catch (_) {}
  }

  if (deleted.length > 0) {
    console.log(`🧹 [BackupService] Política de retención: se depuraron ${deleted.length} respaldos antiguos.`);
  }

  return deleted;
}

/**
 * Restaura la base de datos a partir de un archivo de respaldo específico previa verificación de hash
 */
export async function restoreDatabaseBackup(
  filename: string,
  triggeredBy: string = 'Super Administrador'
): Promise<{ success: boolean; message: string; safetyBackup: string }> {
  const cleanFilename = path.basename(filename);
  const backupsDir = resolveBackupsDir();
  const targetFile = path.join(backupsDir, cleanFilename);
  const shaFile = path.join(backupsDir, `${cleanFilename}.sha256`);

  if (!fs.existsSync(targetFile)) {
    throw new Error(`El archivo de respaldo ${cleanFilename} no existe.`);
  }

  // 1. Verificar integridad SHA-256
  const currentHash = await computeFileSha256(targetFile);
  if (fs.existsSync(shaFile)) {
    const recordedHash = fs.readFileSync(shaFile, 'utf8').trim().split(/\s+/)[0];
    if (currentHash.toLowerCase() !== recordedHash.toLowerCase()) {
      throw new Error(`Fallo de integridad SHA-256 en ${cleanFilename}. El archivo puede estar corrupto.`);
    }
  }

  // 2. Crear respaldo preventivo de seguridad inmediato antes de tocar la base de datos
  console.log('🛡️ [BackupService] Creando respaldo de seguridad previo a la restauración...');
  const safetyBackup = await createDatabaseBackup('pre_restore_safety', `Auto-Safety for restore of ${cleanFilename}`);

  // 3. Proceder a la restauración
  const dbParams = getDbConnectionParams();
  const env = {
    ...process.env,
    PGPASSWORD: dbParams.password
  };

  console.log(`🔄 [BackupService] Ejecutando restauración desde ${cleanFilename}...`);

  let restoreCmd = `gunzip -c "${targetFile}" | psql -h ${dbParams.host} -p ${dbParams.port} -U ${dbParams.user} -d ${dbParams.database}`;

  try {
    await execAsync(restoreCmd, { env });
  } catch (err: any) {
    console.warn('⚠️ Falló psql directo, probando docker exec gaes_postgres...', err.message);
    restoreCmd = `gunzip -c "${targetFile}" | docker exec -i gaes_postgres psql -U postgres -d capacitahub_db`;
    await execAsync(restoreCmd);
  }

  // 4. Registrar auditoría de restauración
  try {
    await pool.query(`
      INSERT INTO backup_audit_logs (filename, action, status, sha256_hash, triggered_by, performed_at, notes)
      VALUES ($1, 'backup_restored', 'success', $2, $3, CURRENT_TIMESTAMP, $4)
    `, [cleanFilename, currentHash, triggeredBy, `Safety backup creado: ${safetyBackup.filename}`]);
  } catch (_) {}

  console.log(`✅ [BackupService] Restauración completada exitosamente desde ${cleanFilename}.`);

  return {
    success: true,
    message: `Base de datos restaurada satisfactoriamente a partir de ${cleanFilename}.`,
    safetyBackup: safetyBackup.filename
  };
}

/**
 * Consulta métricas y estadísticas del almacenamiento de PostgreSQL
 */
export async function getDatabaseStorageStats(): Promise<DatabaseStats> {
  const dbParams = getDbConnectionParams();

  const [dbSizeRes, tableCountRes] = await Promise.all([
    pool.query(`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as size,
        pg_database_size(current_database())::bigint as size_bytes;
    `),
    pool.query(`
      SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public';
    `)
  ]);

  const backups = await getBackupsList();
  const totalBackupSizeBytes = backups.reduce((acc, b) => acc + (b.sizeBytes || 0), 0);
  const lastBackupAt = backups.length > 0 ? backups[0].createdAt : null;

  return {
    databaseName: dbParams.database,
    databaseSize: dbSizeRes.rows[0]?.size || '0 Bytes',
    databaseSizeBytes: Number(dbSizeRes.rows[0]?.size_bytes) || 0,
    tableCount: tableCountRes.rows[0]?.count || 0,
    backupCount: backups.length,
    totalBackupSizeBytes,
    totalBackupSizeFormatted: formatBytes(totalBackupSizeBytes),
    lastBackupAt,
    serverTime: new Date().toISOString()
  };
}

/**
 * Planificador en segundo plano para respaldos automáticos periódicos (Diario a las 02:00 AM)
 */
let schedulerInterval: any = null;

export function initBackupScheduler() {
  if (schedulerInterval) return;

  console.log('⏰ [BackupScheduler] Inicializando scheduler de respaldos automáticos de PostgreSQL...');

  // Verificar cada 1 hora si corresponde generar el respaldo diario
  schedulerInterval = setInterval(async () => {
    try {
      const now = new Date();
      // Ventana de ejecución nocturna: entre las 02:00 AM y las 03:00 AM UTC/AST
      if (now.getHours() === 2) {
        const backups = await getBackupsList();
        const todayPrefix = now.toISOString().slice(0, 10);
        const alreadyBackedUpToday = backups.some(b => b.createdAt.startsWith(todayPrefix));

        if (!alreadyBackedUpToday) {
          console.log(`⏰ [BackupScheduler] Ejecutando respaldo automático programado para ${todayPrefix}...`);
          await createDatabaseBackup('automated_scheduled', 'System-Cron-Scheduler');
        }
      }
    } catch (err: any) {
      console.error('❌ [BackupScheduler] Error al ejecutar respaldo programado:', err.message);
    }
  }, 60 * 60 * 1000); // Cada 1 hora
}
