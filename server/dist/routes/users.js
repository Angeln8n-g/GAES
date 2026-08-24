"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const db_js_1 = require("../db.js");
exports.usersRouter = (0, express_1.Router)();
// GET /api/users
exports.usersRouter.get("/", async (req, res) => {
    try {
        const { companyId } = req.query;
        let query = `
      SELECT 
        id, 
        email, 
        name, 
        role, 
        password, 
        cedula, 
        department, 
        assigned_member_cards as "assignedMemberCards",
        COALESCE(employment_status, 'contratado') as "employmentStatus",
        COALESCE(is_active, true) as "isActive",
        COALESCE(company_id, 'emp_kasino') as "companyId"
      FROM users_simulated 
    `;
        const params = [];
        if (companyId && typeof companyId === "string" && companyId !== "all") {
            query += " WHERE company_id = $1";
            params.push(companyId);
        }
        query += " ORDER BY id ASC";
        const result = await db_js_1.pool.query(query, params);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Error al obtener usuarios:", err);
        res.status(500).json({ error: "Error al consultar usuarios", details: err.message });
    }
});
// POST /api/users/bulk
exports.usersRouter.post("/bulk", async (req, res) => {
    const client = await db_js_1.pool.connect();
    try {
        const { users } = req.body;
        if (!Array.isArray(users)) {
            return res.status(400).json({ error: "Formato inválido. Se espera una lista de usuarios." });
        }
        await client.query("BEGIN");
        for (const u of users) {
            if (!u.email || !u.name)
                continue;
            const userId = u.id || `usr_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            const cleanEmail = u.email.trim().toLowerCase();
            const cleanName = u.name.trim();
            const role = u.role || "Colaborador (User)";
            const password = u.password || "123";
            const cedula = u.cedula ? u.cedula.trim() : null;
            const department = u.department ? u.department.trim() : null;
            const assignedMemberCards = Array.isArray(u.assignedMemberCards) ? u.assignedMemberCards : null;
            const employmentStatus = u.employmentStatus || 'contratado';
            const isActive = u.isActive !== undefined ? Boolean(u.isActive) : true;
            const companyId = u.companyId ? u.companyId.trim() : 'emp_kasino';
            // Actualizar por email si ya existe, o insertar
            const existing = await client.query("SELECT id FROM users_simulated WHERE LOWER(email) = $1", [cleanEmail]);
            if (existing.rows.length > 0) {
                await client.query(`UPDATE users_simulated 
           SET name = $1, 
               role = $2, 
               password = COALESCE(NULLIF($3, ''), password), 
               cedula = COALESCE($4, cedula),
               department = COALESCE($5, department),
               assigned_member_cards = COALESCE($6, assigned_member_cards),
               employment_status = $7,
               is_active = $8,
               company_id = $9
           WHERE LOWER(email) = $10`, [cleanName, role, password, cedula, department, assignedMemberCards, employmentStatus, isActive, companyId, cleanEmail]);
            }
            else {
                await client.query(`INSERT INTO users_simulated (id, email, name, role, password, cedula, department, assigned_member_cards, employment_status, is_active, company_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
             email = EXCLUDED.email,
             name = EXCLUDED.name,
             role = EXCLUDED.role,
             password = EXCLUDED.password,
             cedula = EXCLUDED.cedula,
             department = EXCLUDED.department,
             assigned_member_cards = EXCLUDED.assigned_member_cards,
             employment_status = EXCLUDED.employment_status,
             is_active = EXCLUDED.is_active,
             company_id = EXCLUDED.company_id`, [userId, cleanEmail, cleanName, role, password, cedula, department, assignedMemberCards, employmentStatus, isActive, companyId]);
            }
            // Sincronizar en participants si existe el correo
            await client.query(`UPDATE participants
         SET name = $1,
             cedula = COALESCE($2, cedula),
             department = COALESCE($3, department),
             employment_status = $4,
             is_active = $5,
             company_id = $6
         WHERE LOWER(email) = $7`, [cleanName, cedula, department, employmentStatus, isActive, companyId, cleanEmail]);
        }
        await client.query("COMMIT");
        const result = await client.query(`
      SELECT 
        id, 
        email, 
        name, 
        role, 
        password, 
        cedula, 
        department, 
        assigned_member_cards as "assignedMemberCards",
        COALESCE(employment_status, 'contratado') as "employmentStatus",
        COALESCE(is_active, true) as "isActive",
        COALESCE(company_id, 'emp_kasino') as "companyId"
      FROM users_simulated 
      ORDER BY id ASC
    `);
        res.json(result.rows);
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error("Error al actualizar usuarios:", err);
        res.status(500).json({ error: "Error al actualizar usuarios", details: err.message });
    }
    finally {
        client.release();
    }
});
// PUT /api/users/:id
exports.usersRouter.put("/:id", async (req, res) => {
    const client = await db_js_1.pool.connect();
    try {
        const { id } = req.params;
        const { name, email, role, password, cedula, department, assignedMemberCards, employmentStatus, isActive, companyId } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: "Nombre y correo son obligatorios." });
        }
        const cleanEmail = email.trim().toLowerCase();
        const cleanName = name.trim();
        const cleanRole = role || "Colaborador (User)";
        const cleanCedula = cedula ? cedula.trim() : null;
        const cleanDept = department ? department.trim() : null;
        const cleanCards = Array.isArray(assignedMemberCards) ? assignedMemberCards : null;
        const cleanEmpStatus = employmentStatus || 'contratado';
        const cleanIsActive = isActive !== undefined ? Boolean(isActive) : true;
        const cleanCompanyId = companyId ? companyId.trim() : 'emp_kasino';
        await client.query("BEGIN");
        await client.query(`UPDATE users_simulated 
       SET name = $1, 
           email = $2, 
           role = $3, 
           password = COALESCE(NULLIF($4, ''), password),
           cedula = $5, 
           department = $6, 
           assigned_member_cards = $7,
           employment_status = $8,
           is_active = $9,
           company_id = $10
       WHERE id = $11`, [cleanName, cleanEmail, cleanRole, password ? password.trim() : '', cleanCedula, cleanDept, cleanCards, cleanEmpStatus, cleanIsActive, cleanCompanyId, id]);
        // Sincronizar en participants
        await client.query(`UPDATE participants 
       SET name = $1, 
           cedula = COALESCE($2, cedula), 
           department = COALESCE($3, department),
           employment_status = $4,
           is_active = $5,
           company_id = $6
       WHERE LOWER(email) = $7`, [cleanName, cleanCedula, cleanDept, cleanEmpStatus, cleanIsActive, cleanCompanyId, cleanEmail]);
        await client.query("COMMIT");
        const result = await client.query(`
      SELECT 
        id, 
        email, 
        name, 
        role, 
        password, 
        cedula, 
        department, 
        assigned_member_cards as "assignedMemberCards",
        COALESCE(employment_status, 'contratado') as "employmentStatus",
        COALESCE(is_active, true) as "isActive",
        COALESCE(company_id, 'emp_kasino') as "companyId"
      FROM users_simulated 
      ORDER BY id ASC
    `);
        res.json(result.rows);
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error("Error al actualizar usuario:", err);
        res.status(500).json({ error: "Error al actualizar usuario", details: err.message });
    }
    finally {
        client.release();
    }
});
// PUT /api/users/:id/password
exports.usersRouter.put("/:id/password", async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword) {
            return res.status(400).json({ error: "La nueva contraseña es requerida." });
        }
        await db_js_1.pool.query("UPDATE users_simulated SET password = $1 WHERE id = $2", [newPassword.trim(), id]);
        const result = await db_js_1.pool.query(`
      SELECT 
        id, 
        email, 
        name, 
        role, 
        password, 
        cedula, 
        department, 
        assigned_member_cards as "assignedMemberCards",
        COALESCE(employment_status, 'contratado') as "employmentStatus",
        COALESCE(is_active, true) as "isActive",
        COALESCE(company_id, 'emp_kasino') as "companyId"
      FROM users_simulated 
      ORDER BY id ASC
    `);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Error al cambiar contraseña:", err);
        res.status(500).json({ error: "Error al cambiar contraseña", details: err.message });
    }
});
// DELETE /api/users/:id
exports.usersRouter.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await db_js_1.pool.query("DELETE FROM users_simulated WHERE id = $1", [id]);
        const result = await db_js_1.pool.query(`
      SELECT 
        id, 
        email, 
        name, 
        role, 
        password, 
        cedula, 
        department, 
        assigned_member_cards as "assignedMemberCards",
        COALESCE(employment_status, 'contratado') as "employmentStatus",
        COALESCE(is_active, true) as "isActive",
        COALESCE(company_id, 'emp_kasino') as "companyId"
      FROM users_simulated 
      ORDER BY id ASC
    `);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Error al eliminar usuario:", err);
        res.status(500).json({ error: "Error al eliminar usuario", details: err.message });
    }
});
