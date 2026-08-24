import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

export const groupsRouter = Router();

/**
 * Helper para obtener todos los grupos con sus integrantes
 */
export async function fetchFullGroups(companyId?: string) {
  let query = `
    SELECT 
      g.id,
      g.name,
      g.description,
      g.color,
      g.department,
      COALESCE(g.company_id, 'emp_kasino') as "companyId",
      g.created_at,
      COALESCE(
        ARRAY_AGG(gm.participant_card) FILTER (WHERE gm.participant_card IS NOT NULL), 
        '{}'
      ) as member_cards
    FROM participant_groups g
    LEFT JOIN group_members gm ON g.id = gm.group_id
  `;
  const params: any[] = [];

  if (companyId && typeof companyId === 'string' && companyId !== 'all') {
    query += ' WHERE g.company_id = $1';
    params.push(companyId);
  }

  query += ' GROUP BY g.id ORDER BY g.name ASC';

  const result = await pool.query(query, params);

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    color: row.color || 'indigo',
    department: row.department || '',
    companyId: row.companyId || 'emp_kasino',
    memberCards: row.member_cards || [],
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  }));
}

// GET /api/groups
groupsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.query;
    const groups = await fetchFullGroups(typeof companyId === 'string' ? companyId : undefined);
    res.json(groups);
  } catch (err: any) {
    console.error('Error al obtener grupos:', err);
    res.status(500).json({ error: 'Error al consultar grupos en PostgreSQL', details: err.message });
  }
});

// POST /api/groups
groupsRouter.post('/', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id, name, description, color, department, memberCards, companyId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre del grupo es obligatorio.' });
    }

    const groupId = id || `grp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const cleanCompanyId = companyId ? companyId.trim() : 'emp_kasino';

    await client.query('BEGIN');

    // 1. Insertar o actualizar grupo
    await client.query(`
      INSERT INTO participant_groups (id, name, description, color, department, company_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        color = EXCLUDED.color,
        department = EXCLUDED.department,
        company_id = EXCLUDED.company_id
    `, [groupId, name.trim(), description || null, color || 'indigo', department || null, cleanCompanyId]);

    // 2. Sincronizar miembros
    await client.query('DELETE FROM group_members WHERE group_id = $1', [groupId]);

    if (Array.isArray(memberCards) && memberCards.length > 0) {
      for (const card of memberCards) {
        if (!card) continue;
        await client.query(`
          INSERT INTO group_members (group_id, participant_card)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [groupId, card.trim()]);
      }
    }

    await client.query('COMMIT');
    const updatedGroups = await fetchFullGroups();
    res.json(updatedGroups);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error al guardar grupo:', err);
    res.status(500).json({ error: 'Error al guardar grupo en PostgreSQL', details: err.message });
  } finally {
    client.release();
  }
});

// POST /api/groups/bulk
groupsRouter.post('/bulk', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { groups } = req.body;
    if (!Array.isArray(groups)) {
      return res.status(400).json({ error: 'Se esperaba un array de grupos.' });
    }

    await client.query('BEGIN');

    for (const g of groups) {
      if (!g.name) continue;
      const groupId = g.id || `grp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      await client.query(`
        INSERT INTO participant_groups (id, name, description, color, department)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          color = EXCLUDED.color,
          department = EXCLUDED.department
      `, [groupId, g.name.trim(), g.description || '', g.color || 'indigo', g.department || '']);

      await client.query('DELETE FROM group_members WHERE group_id = $1', [groupId]);

      if (Array.isArray(g.memberCards)) {
        for (const card of g.memberCards) {
          if (!card) continue;
          await client.query(`
            INSERT INTO group_members (group_id, participant_card)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `, [groupId, card.trim()]);
        }
      }
    }

    await client.query('COMMIT');
    const updatedGroups = await fetchFullGroups();
    res.json(updatedGroups);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error en importación masiva de grupos:', err);
    res.status(500).json({ error: 'Error al importar grupos', details: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/groups/:id
groupsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM participant_groups WHERE id = $1', [id]);
    const updatedGroups = await fetchFullGroups();
    res.json(updatedGroups);
  } catch (err: any) {
    console.error('Error al eliminar grupo:', err);
    res.status(500).json({ error: 'Error al eliminar grupo', details: err.message });
  }
});
