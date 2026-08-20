import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

export const usersRouter = Router();

// GET /api/users
usersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, email, name, role, password FROM users_simulated ORDER BY id ASC');
    res.json(result.rows);
  } catch (err: any) {
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
      if (!u.id || !u.email || !u.name) continue;
      await client.query(
        `INSERT INTO users_simulated (id, email, name, role, password)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           password = EXCLUDED.password`,
        [u.id, u.email.trim().toLowerCase(), u.name.trim(), u.role, u.password || '123']
      );
    }

    await client.query('COMMIT');
    const result = await client.query('SELECT id, email, name, role, password FROM users_simulated ORDER BY id ASC');
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
    const result = await pool.query('SELECT id, email, name, role, password FROM users_simulated ORDER BY id ASC');
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error al cambiar contraseña:', err);
    res.status(500).json({ error: 'Error al cambiar contraseña', details: err.message });
  }
});
