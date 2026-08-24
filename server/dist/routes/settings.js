"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// GET /api/settings - Obtiene todas las configuraciones del sistema
router.get('/', async (req, res) => {
    try {
        const result = await db_1.pool.query('SELECT key, value, description, updated_at, updated_by FROM system_settings');
        const settingsMap = {};
        result.rows.forEach(r => {
            settingsMap[r.key] = r.value;
        });
        res.json({
            success: true,
            settings: settingsMap,
            raw: result.rows
        });
    }
    catch (err) {
        console.error('Error al obtener configuraciones del sistema:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});
// PATCH /api/settings/ojt - Actualiza la configuración del Módulo OJT / Plan 90 Días
router.patch('/ojt', async (req, res) => {
    try {
        const { enabled, enable_702010, enable_calibration, target_ttp_days, updated_by } = req.body;
        const currentResult = await db_1.pool.query("SELECT value FROM system_settings WHERE key = 'ojt_plan_90d'");
        const currentValue = currentResult.rows[0]?.value || {
            enabled: true,
            enable_702010: true,
            enable_calibration: true,
            target_ttp_days: 30
        };
        const newValue = {
            ...currentValue,
            ...(enabled !== undefined && { enabled: Boolean(enabled) }),
            ...(enable_702010 !== undefined && { enable_702010: Boolean(enable_702010) }),
            ...(enable_calibration !== undefined && { enable_calibration: Boolean(enable_calibration) }),
            ...(target_ttp_days !== undefined && { target_ttp_days: Number(target_ttp_days) })
        };
        await db_1.pool.query(`INSERT INTO system_settings (key, value, description, updated_at, updated_by)
       VALUES ('ojt_plan_90d', $1, 'Control general del módulo de operaciones OJT y plan a 90 días', CURRENT_TIMESTAMP, $2)
       ON CONFLICT (key) DO UPDATE 
       SET value = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2`, [JSON.stringify(newValue), updated_by || 'Super Administrador']);
        res.json({
            success: true,
            message: 'Configuración de módulo OJT actualizada correctamente.',
            ojt_plan_90d: newValue
        });
    }
    catch (err) {
        console.error('Error al actualizar configuración OJT:', err);
        res.status(500).json({ error: 'Error al actualizar configuración.' });
    }
});
exports.default = router;
