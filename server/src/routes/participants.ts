import { Router, Request, Response } from "express";
import { pool } from "../db.js";

export const participantsRouter = Router();

// GET /api/participants
participantsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { companyId } = req.query;
    let query = `
      SELECT 
        card, 
        name, 
        email, 
        cedula, 
        department, 
        supervisor_id as "supervisorId", 
        supervisor_name as "supervisorName",
        COALESCE(employment_status, 'contratado') as "employmentStatus",
        COALESCE(is_active, true) as "isActive",
        COALESCE(company_id, 'emp_kasino') as "companyId"
      FROM participants 
    `;
    const params: any[] = [];
    if (companyId && typeof companyId === "string" && companyId !== "all") {
      query += " WHERE company_id = $1";
      params.push(companyId);
    }
    query += " ORDER BY name ASC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error("Error al obtener participantes:", err);
    res.status(500).json({ error: "Error al consultar participantes en PostgreSQL", details: err.message });
  }
});

// POST /api/participants/bulk
participantsRouter.post("/bulk", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { participants } = req.body;
    if (!Array.isArray(participants)) {
      return res.status(400).json({ error: "Formato inválido. Se espera una lista de participantes." });
    }

    await client.query("BEGIN");

    for (const p of participants) {
      if (!p.card || !p.name || !p.email) continue;
      const card = p.card.trim();
      const name = p.name.trim().toUpperCase();
      const email = p.email.trim().toLowerCase();
      const cedula = p.cedula ? p.cedula.trim() : null;
      const department = p.department ? p.department.trim() : null;
      const supervisorId = p.supervisorId ? p.supervisorId.trim() : null;
      const supervisorName = p.supervisorName ? p.supervisorName.trim() : null;
      const employmentStatus = p.employmentStatus || 'contratado';
      const isActive = p.isActive !== undefined ? Boolean(p.isActive) : true;
      const companyId = p.companyId ? p.companyId.trim() : 'emp_kasino';

      // 1. Guardar en participants
      await client.query(
        `INSERT INTO participants (card, name, email, cedula, department, supervisor_id, supervisor_name, employment_status, is_active, company_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (card) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           cedula = COALESCE(EXCLUDED.cedula, participants.cedula),
           department = EXCLUDED.department,
           supervisor_id = EXCLUDED.supervisor_id,
           supervisor_name = EXCLUDED.supervisor_name,
           employment_status = EXCLUDED.employment_status,
           is_active = EXCLUDED.is_active,
           company_id = EXCLUDED.company_id`,
        [card, name, email, cedula, department, supervisorId, supervisorName, employmentStatus, isActive, companyId]
      );

      // 2. Auto-aprovisionar o sincronizar en users_simulated
      const userExists = await client.query("SELECT id FROM users_simulated WHERE LOWER(email) = $1", [email]);
      if (userExists.rows.length === 0) {
        const newUserId = `usr_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        await client.query(
          `INSERT INTO users_simulated (id, email, name, role, password, cedula, department, employment_status, is_active, company_id)
           VALUES ($1, $2, $3, 'Colaborador (User)', '123', $4, $5, $6, $7, $8)
           ON CONFLICT (email) DO NOTHING`,
          [newUserId, email, name, cedula, department, employmentStatus, isActive, companyId]
        );
      } else {
        await client.query(
          `UPDATE users_simulated 
           SET name = $1, 
               cedula = COALESCE($2, cedula), 
               department = COALESCE($3, department),
               employment_status = $4,
               is_active = $5,
               company_id = $6
           WHERE LOWER(email) = $7`,
          [name, cedula, department, employmentStatus, isActive, companyId, email]
        );
      }
    }

    await client.query("COMMIT");
    const result = await client.query(`
      SELECT 
        card, 
        name, 
        email, 
        cedula, 
        department, 
        supervisor_id as "supervisorId", 
        supervisor_name as "supervisorName",
        COALESCE(employment_status, 'contratado') as "employmentStatus",
        COALESCE(is_active, true) as "isActive",
        COALESCE(company_id, 'emp_kasino') as "companyId"
      FROM participants 
      ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error en carga masiva de participantes:", err);
    res.status(500).json({ error: "Error al guardar participantes", details: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/participants/:card
participantsRouter.put("/:card", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { card } = req.params;
    const { name, email, cedula, department, supervisorId, supervisorName, employmentStatus, isActive, companyId } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Nombre y correo son obligatorios." });
    }

    const cleanCard = card.trim();
    const cleanName = name.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCedula = cedula ? cedula.trim() : null;
    const cleanDept = department ? department.trim() : null;
    const cleanSuperId = supervisorId ? supervisorId.trim() : null;
    const cleanSuperName = supervisorName ? supervisorName.trim() : null;
    const cleanEmpStatus = employmentStatus || 'contratado';
    const cleanIsActive = isActive !== undefined ? Boolean(isActive) : true;
    const cleanCompanyId = companyId ? companyId.trim() : 'emp_kasino';

    await client.query("BEGIN");

    await client.query(
      `UPDATE participants 
       SET name = $1, 
           email = $2, 
           cedula = $3, 
           department = $4, 
           supervisor_id = $5, 
           supervisor_name = $6,
           employment_status = $7,
           is_active = $8,
           company_id = $9
       WHERE card = $10`,
      [cleanName, cleanEmail, cleanCedula, cleanDept, cleanSuperId, cleanSuperName, cleanEmpStatus, cleanIsActive, cleanCompanyId, cleanCard]
    );

    // Sync corresponding user in users_simulated
    await client.query(
      `UPDATE users_simulated 
       SET name = $1, 
           cedula = COALESCE($2, cedula), 
           department = COALESCE($3, department),
           employment_status = $4,
           is_active = $5,
           company_id = $6
       WHERE LOWER(email) = $7`,
      [cleanName, cleanCedula, cleanDept, cleanEmpStatus, cleanIsActive, cleanCompanyId, cleanEmail]
    );

    await client.query("COMMIT");

    const result = await client.query(`
      SELECT 
        card, 
        name, 
        email, 
        cedula, 
        department, 
        supervisor_id as "supervisorId", 
        supervisor_name as "supervisorName",
        COALESCE(employment_status, 'contratado') as "employmentStatus",
        COALESCE(is_active, true) as "isActive",
        COALESCE(company_id, 'emp_kasino') as "companyId"
      FROM participants 
      ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error al actualizar participante:", err);
    res.status(500).json({ error: "Error al actualizar participante", details: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/participants/:card
participantsRouter.delete("/:card", async (req: Request, res: Response) => {
  try {
    const { card } = req.params;
    await pool.query("DELETE FROM participants WHERE card = $1", [card.trim()]);
    const result = await pool.query(`
      SELECT 
        card, 
        name, 
        email, 
        cedula, 
        department, 
        supervisor_id as "supervisorId", 
        supervisor_name as "supervisorName",
        COALESCE(employment_status, 'contratado') as "employmentStatus",
        COALESCE(is_active, true) as "isActive",
        COALESCE(company_id, 'emp_kasino') as "companyId"
      FROM participants 
      ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (err: any) {
    console.error("Error al eliminar participante:", err);
    res.status(500).json({ error: "Error al eliminar participante", details: err.message });
  }
});
