import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

export const usersRouter = Router();

// GET /api/users
usersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, email, name, role, password, cedula FROM users_simulated ORDER BY id ASC');
    res.json(result.rows);
  } catch (err: any) {
    if (err.message && (err.message.includes('cedula') || err.message.includes('does not exist'))) {
      try {
        await pool.query('ALTER TABLE users_simulated ADD COLUMN IF NOT EXISTS cedula VARCHAR(20)');
        const retryResult = await pool.query('SELECT id, email, name, role, password, cedula FROM users_simulated ORDER BY id ASC');
        return res.json(retryResult.rows);
      } catch (inner) {
        console.error('Error al auto-migrar columna cedula en users_simulated:', inner);
      }
    }
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ error: 'Error al consultar usuarios', details: err.message });
  }
});

// POST /api/users/bulk
usersRouter.post('/bulk', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { users } = req.body;
    if (!Array.isArray(users)) {
      return res.status(400).json({ error: 'Formato inválido. Se espera una lista de usuarios.' });
    }

    await client.query('BEGIN');

    for (const u of users) {
      if (!u.email || !u.name) continue;
      const userId = u.id || `usr_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const cleanEmail = u.email.trim().toLowerCase();
      const cleanName = u.name.trim();
      const role = u.role || 'Colaborador (User)';
      const password = u.password || '123';
      const cedula = u.cedula ? u.cedula.trim() : null;

      // Actualizar por email si ya existe, o insertar
      const existing = await client.query('SELECT id FROM users_simulated WHERE LOWER(email) = $1', [cleanEmail]);
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE users_simulated 
           SET name = $1, role = $2, password = COALESCE(NULLIF($3, ''), password), cedula = COALESCE($4, cedula)
           WHERE LOWER(email) = $5`,
          [cleanName, role, password, cedula, cleanEmail]
        );
      } else {
        await client.query(
          `INSERT INTO users_simulated (id, email, name, role, password, cedula)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             email = EXCLUDED.email,
             name = EXCLUDED.name,
             role = EXCLUDED.role,
             password = EXCLUDED.password,
             cedula = EXCLUDED.cedula`,
          [userId, cleanEmail, cleanName, role, password, cedula]
        );
      }
    }

    await client.query('COMMIT');
    const result = await client.query('SELECT id, email, name, role, password, cedula FROM users_simulated ORDER BY id ASC');
    res.json(result.rows);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar usuarios:', err);
    res.status(500).json({ error: 'Error al actualizar usuarios', details: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/users/:id/password
usersRouter.put('/:id/password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'La nueva contraseña es requerida.' });
    }

    await pool.query('UPDATE users_simulated SET password = $1 WHERE id = $2', [newPassword.trim(), id]);
    const result = await pool.query('SELECT id, email, name, role, password, cedula FROM users_simulated ORDER BY id ASC');
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error al cambiar contraseña:', err);
    res.status(500).json({ error: 'Error al cambiar contraseña', details: err.message });
  }
});
