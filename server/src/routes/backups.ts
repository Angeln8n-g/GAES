import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import {
  createDatabaseBackup,
  getBackupsList,
  deleteBackupFile,
  restoreDatabaseBackup,
  getDatabaseStorageStats,
  resolveBackupsDir
} from '../services/backupService.js';
import { getMigrationStatus, runMigrations } from '../migrator.js';
import { requireSuperAdmin } from '../middlewares/auth.js';

export const adminBackupsRouter = Router();

// Exigir autenticación con rol de Super Administrador para todas las operaciones de respaldo y migraciones
adminBackupsRouter.use(requireSuperAdmin);

/**
 * GET /api/admin/backups
 * Lista todos los respaldos disponibles y sus metadatos
 */
adminBackupsRouter.get('/backups', async (_req: Request, res: Response) => {
  try {
    const backups = await getBackupsList();
    res.json({
      success: true,
      backups
    });
  } catch (err: any) {
    console.error('Error al listar respaldos:', err);
    res.status(500).json({ error: 'Error al listar los respaldos de la base de datos.', details: err.message });
  }
});

/**
 * POST /api/admin/backups
 * Genera un nuevo respaldo manual inmediato
 */
adminBackupsRouter.post('/backups', async (req: Request, res: Response) => {
  try {
    const triggeredBy = req.user?.email || req.user?.name || 'Super Administrador';
    const metadata = await createDatabaseBackup('manual_admin', triggeredBy);
    res.status(201).json({
      success: true,
      message: 'Respaldo de base de datos generado exitosamente.',
      backup: metadata
    });
  } catch (err: any) {
    console.error('Error al crear respaldo:', err);
    res.status(500).json({ error: 'Error al generar el respaldo de base de datos.', details: err.message });
  }
});

/**
 * GET /api/admin/backups/stats
 * Obtiene estadísticas de almacenamiento de PostgreSQL y de los respaldos
 */
adminBackupsRouter.get('/backups/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getDatabaseStorageStats();
    res.json({
      success: true,
      stats
    });
  } catch (err: any) {
    console.error('Error al consultar estadísticas de almacenamiento:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas de la base de datos.', details: err.message });
  }
});

/**
 * GET /api/admin/backups/:filename/download
 * Descarga de manera segura un archivo de respaldo .sql.gz
 */
adminBackupsRouter.get('/backups/:filename/download', (req: Request, res: Response) => {
  try {
    const rawFilename = req.params.filename;
    const filename = path.basename(rawFilename);

    if (!filename.endsWith('.sql.gz')) {
      return res.status(400).json({ error: 'Nombre de archivo no válido.' });
    }

    const backupsDir = resolveBackupsDir();
    const filePath = path.join(backupsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `El archivo ${filename} no existe en el servidor.` });
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Error al enviar descarga de respaldo:', err);
      }
    });
  } catch (err: any) {
    console.error('Error en descarga de respaldo:', err);
    res.status(500).json({ error: 'Error al descargar el respaldo.', details: err.message });
  }
});

/**
 * DELETE /api/admin/backups/:filename
 * Elimina un archivo de respaldo específico y su metadata
 */
adminBackupsRouter.delete('/backups/:filename', async (req: Request, res: Response) => {
  try {
    const rawFilename = req.params.filename;
    const filename = path.basename(rawFilename);
    const triggeredBy = req.user?.email || req.user?.name || 'Super Administrador';

    await deleteBackupFile(filename, triggeredBy);
    res.json({
      success: true,
      message: `Respaldo ${filename} eliminado con éxito.`
    });
  } catch (err: any) {
    console.error('Error al eliminar respaldo:', err);
    res.status(500).json({ error: 'Error al eliminar el respaldo.', details: err.message });
  }
});

/**
 * POST /api/admin/backups/:filename/restore
 * Restaura la base de datos desde un respaldo específico con comprobación SHA-256
 */
adminBackupsRouter.post('/backups/:filename/restore', async (req: Request, res: Response) => {
  try {
    const rawFilename = req.params.filename;
    const filename = path.basename(rawFilename);
    const { confirm } = req.body;

    if (confirm !== true) {
      return res.status(400).json({
        error: 'Debe confirmar explícitamente la restauración enviando { confirm: true }.'
      });
    }

    const triggeredBy = req.user?.email || req.user?.name || 'Super Administrador';
    const result = await restoreDatabaseBackup(filename, triggeredBy);
    res.json({
      success: true,
      message: result.message,
      safetyBackup: result.safetyBackup
    });
  } catch (err: any) {
    console.error('Error al restaurar base de datos:', err);
    res.status(500).json({ error: 'Error al restaurar la base de datos.', details: err.message });
  }
});

/**
 * GET /api/admin/migrations/status
 * Consulta el estado detallado de las migraciones versionadas
 */
adminBackupsRouter.get('/migrations/status', async (_req: Request, res: Response) => {
  try {
    const migrations = await getMigrationStatus();
    res.json({
      success: true,
      migrations
    });
  } catch (err: any) {
    console.error('Error al obtener estado de migraciones:', err);
    res.status(500).json({ error: 'Error al consultar migraciones.', details: err.message });
  }
});

/**
 * POST /api/admin/migrations/run
 * Ejecuta manualmente migraciones pendientes
 */
adminBackupsRouter.post('/migrations/run', async (_req: Request, res: Response) => {
  try {
    const result = await runMigrations();
    res.json({
      success: true,
      appliedCount: result.appliedCount,
      results: result.results
    });
  } catch (err: any) {
    console.error('Error al aplicar migraciones:', err);
    res.status(500).json({ error: 'Error al ejecutar migraciones.', details: err.message });
  }
});
