import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

export const participantsRouter = Router();

// GET /api/participants
participantsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT card, name, email FROM participants ORDER BY name ASC');
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error al obtener participantes:', err);
    res.status(500).json({ error: 'Error al consultar participantes en PostgreSQL', details: err.message });
  }
});

// POST /api/participants/bulk
participantsRouter.post('/bulk', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { participants } = req.body;
    if (!Array.isArray(participants)) {
      return res.status(400).json({ error: 'Formato inválido. Se espera una lista de participantes.' });
    }

    await client.query('BEGIN');

    for (const p of participants) {
      if (!p.card || !p.name || !p.email) continue;
      await client.query(
        `INSERT INTO participants (card, name, email)
         VALUES ($1, $2, $3)
         ON CONFLICT (card) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email`,
        [p.card.trim(), p.name.trim().toUpperCase(), p.email.trim().toLowerCase()]
      );
    }

    await client.query('COMMIT');
    const result = await client.query('SELECT card, name, email FROM participants ORDER BY name ASC');
    res.json(result.rows);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error en carga masiva de participantes:', err);
    res.status(500).json({ error: 'Error al guardar participantes', details: err.message });
  } finally {
    client.release();
  }
});
