"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminBackupsRouter = void 0;
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const backupService_js_1 = require("../services/backupService.js");
const migrator_js_1 = require("../migrator.js");
const auth_js_1 = require("../middlewares/auth.js");
exports.adminBackupsRouter = (0, express_1.Router)();
// Exigir autenticación con rol de Super Administrador para todas las operaciones de respaldo y migraciones
exports.adminBackupsRouter.use(auth_js_1.requireSuperAdmin);
/**
 * GET /api/admin/backups
 * Lista todos los respaldos disponibles y sus metadatos
 */
exports.adminBackupsRouter.get('/backups', async (_req, res) => {
    try {
        const backups = await (0, backupService_js_1.getBackupsList)();
        res.json({
            success: true,
            backups
        });
    }
    catch (err) {
        console.error('Error al listar respaldos:', err);
        res.status(500).json({ error: 'Error al listar los respaldos de la base de datos.', details: err.message });
    }
});
/**
 * POST /api/admin/backups
 * Genera un nuevo respaldo manual inmediato
 */
exports.adminBackupsRouter.post('/backups', async (req, res) => {
    try {
        const triggeredBy = req.user?.email || req.user?.name || 'Super Administrador';
        const metadata = await (0, backupService_js_1.createDatabaseBackup)('manual_admin', triggeredBy);
        res.status(201).json({
            success: true,
            message: 'Respaldo de base de datos generado exitosamente.',
            backup: metadata
        });
    }
    catch (err) {
        console.error('Error al crear respaldo:', err);
        res.status(500).json({ error: 'Error al generar el respaldo de base de datos.', details: err.message });
    }
});
/**
 * GET /api/admin/backups/stats
 * Obtiene estadísticas de almacenamiento de PostgreSQL y de los respaldos
 */
exports.adminBackupsRouter.get('/backups/stats', async (_req, res) => {
    try {
        const stats = await (0, backupService_js_1.getDatabaseStorageStats)();
        res.json({
            success: true,
            stats
        });
    }
    catch (err) {
        console.error('Error al consultar estadísticas de almacenamiento:', err);
        res.status(500).json({ error: 'Error al obtener estadísticas de la base de datos.', details: err.message });
    }
});
/**
 * GET /api/admin/backups/:filename/download
 * Descarga de manera segura un archivo de respaldo .sql.gz
 */
exports.adminBackupsRouter.get('/backups/:filename/download', (req, res) => {
    try {
        const rawFilename = req.params.filename;
        const filename = path_1.default.basename(rawFilename);
        if (!filename.endsWith('.sql.gz')) {
            return res.status(400).json({ error: 'Nombre de archivo no válido.' });
        }
        const backupsDir = (0, backupService_js_1.resolveBackupsDir)();
        const filePath = path_1.default.join(backupsDir, filename);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: `El archivo ${filename} no existe en el servidor.` });
        }
        res.download(filePath, filename, (err) => {
            if (err) {
                console.error('Error al enviar descarga de respaldo:', err);
            }
        });
    }
    catch (err) {
        console.error('Error en descarga de respaldo:', err);
        res.status(500).json({ error: 'Error al descargar el respaldo.', details: err.message });
    }
});
/**
 * DELETE /api/admin/backups/:filename
 * Elimina un archivo de respaldo específico y su metadata
 */
exports.adminBackupsRouter.delete('/backups/:filename', async (req, res) => {
    try {
        const rawFilename = req.params.filename;
        const filename = path_1.default.basename(rawFilename);
        const triggeredBy = req.user?.email || req.user?.name || 'Super Administrador';
        await (0, backupService_js_1.deleteBackupFile)(filename, triggeredBy);
        res.json({
            success: true,
            message: `Respaldo ${filename} eliminado con éxito.`
        });
    }
    catch (err) {
        console.error('Error al eliminar respaldo:', err);
        res.status(500).json({ error: 'Error al eliminar el respaldo.', details: err.message });
    }
});
/**
 * POST /api/admin/backups/:filename/restore
 * Restaura la base de datos desde un respaldo específico con comprobación SHA-256
 */
exports.adminBackupsRouter.post('/backups/:filename/restore', async (req, res) => {
    try {
        const rawFilename = req.params.filename;
        const filename = path_1.default.basename(rawFilename);
        const { confirm } = req.body;
        if (confirm !== true) {
            return res.status(400).json({
                error: 'Debe confirmar explícitamente la restauración enviando { confirm: true }.'
            });
        }
        const triggeredBy = req.user?.email || req.user?.name || 'Super Administrador';
        const result = await (0, backupService_js_1.restoreDatabaseBackup)(filename, triggeredBy);
        res.json({
            success: true,
            message: result.message,
            safetyBackup: result.safetyBackup
        });
    }
    catch (err) {
        console.error('Error al restaurar base de datos:', err);
        res.status(500).json({ error: 'Error al restaurar la base de datos.', details: err.message });
    }
});
/**
 * GET /api/admin/migrations/status
 * Consulta el estado detallado de las migraciones versionadas
 */
exports.adminBackupsRouter.get('/migrations/status', async (_req, res) => {
    try {
        const migrations = await (0, migrator_js_1.getMigrationStatus)();
        res.json({
            success: true,
            migrations
        });
    }
    catch (err) {
        console.error('Error al obtener estado de migraciones:', err);
        res.status(500).json({ error: 'Error al consultar migraciones.', details: err.message });
    }
});
/**
 * POST /api/admin/migrations/run
 * Ejecuta manualmente migraciones pendientes
 */
exports.adminBackupsRouter.post('/migrations/run', async (_req, res) => {
    try {
        const result = await (0, migrator_js_1.runMigrations)();
        res.json({
            success: true,
            appliedCount: result.appliedCount,
            results: result.results
        });
    }
    catch (err) {
        console.error('Error al aplicar migraciones:', err);
        res.status(500).json({ error: 'Error al ejecutar migraciones.', details: err.message });
    }
});
