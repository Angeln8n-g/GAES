"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companiesRouter = void 0;
const express_1 = require("express");
const db_js_1 = require("../db.js");
exports.companiesRouter = (0, express_1.Router)();
// GET /api/companies
exports.companiesRouter.get("/", async (_req, res) => {
    try {
        const result = await db_js_1.pool.query(`
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.logo_url as "logoUrl",
        c.rnc_tax_id as "rncTaxId",
        c.industry,
        c.contact_email as "contactEmail",
        c.contact_phone as "contactPhone",
        c.is_active as "isActive",
        c.created_at as "createdAt",
        COALESCE(p_count.cnt, 0)::integer as "participantsCount",
        COALESCE(u_count.cnt, 0)::integer as "usersCount",
        COALESCE(e_count.cnt, 0)::integer as "eventsCount",
        COALESCE(s_count.cnt, 0)::integer as "supervisorsCount"
      FROM companies c
      LEFT JOIN (
        SELECT company_id, COUNT(*) as cnt 
        FROM participants 
        GROUP BY company_id
      ) p_count ON p_count.company_id = c.id
      LEFT JOIN (
        SELECT company_id, COUNT(*) as cnt 
        FROM users_simulated 
        GROUP BY company_id
      ) u_count ON u_count.company_id = c.id
      LEFT JOIN (
        SELECT company_id, COUNT(*) as cnt 
        FROM events 
        GROUP BY company_id
      ) e_count ON e_count.company_id = c.id
      LEFT JOIN (
        SELECT company_id, COUNT(*) as cnt 
        FROM users_simulated 
        WHERE role = 'Líder de Área / Supervisor' OR role = 'Super Administrador'
        GROUP BY company_id
      ) s_count ON s_count.company_id = c.id
      ORDER BY c.created_at ASC
    `);
        // Transform row stats
        const companies = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            slug: row.slug,
            logoUrl: row.logoUrl,
            rncTaxId: row.rncTaxId,
            industry: row.industry,
            contactEmail: row.contactEmail,
            contactPhone: row.contactPhone,
            isActive: row.isActive,
            createdAt: row.createdAt,
            stats: {
                participantsCount: row.participantsCount,
                usersCount: row.usersCount,
                eventsCount: row.eventsCount,
                supervisorsCount: row.supervisorsCount
            }
        }));
        res.json(companies);
    }
    catch (err) {
        console.error("Error al obtener empresas:", err);
        res.status(500).json({ error: "Error al consultar empresas en PostgreSQL", details: err.message });
    }
});
// POST /api/companies
exports.companiesRouter.post("/", async (req, res) => {
    try {
        const { id, name, slug, logoUrl, rncTaxId, industry, contactEmail, contactPhone, isActive } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "El nombre de la empresa es obligatorio." });
        }
        const companyId = id ? id.trim() : `emp_${Date.now()}`;
        const cleanName = name.trim();
        const cleanSlug = slug ? slug.trim().toLowerCase() : cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
        const cleanLogo = logoUrl ? logoUrl.trim() : null;
        const cleanRnc = rncTaxId ? rncTaxId.trim() : null;
        const cleanIndustry = industry ? industry.trim() : "General";
        const cleanEmail = contactEmail ? contactEmail.trim().toLowerCase() : null;
        const cleanPhone = contactPhone ? contactPhone.trim() : null;
        const active = isActive !== undefined ? Boolean(isActive) : true;
        await db_js_1.pool.query(`INSERT INTO companies (id, name, slug, logo_url, rnc_tax_id, industry, contact_email, contact_phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         logo_url = EXCLUDED.logo_url,
         rnc_tax_id = EXCLUDED.rnc_tax_id,
         industry = EXCLUDED.industry,
         contact_email = EXCLUDED.contact_email,
         contact_phone = EXCLUDED.contact_phone,
         is_active = EXCLUDED.is_active`, [companyId, cleanName, cleanSlug, cleanLogo, cleanRnc, cleanIndustry, cleanEmail, cleanPhone, active]);
        res.status(201).json({ success: true, id: companyId });
    }
    catch (err) {
        console.error("Error al crear empresa:", err);
        res.status(500).json({ error: "Error al guardar empresa en PostgreSQL", details: err.message });
    }
});
// PUT /api/companies/:id
exports.companiesRouter.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, logoUrl, rncTaxId, industry, contactEmail, contactPhone, isActive } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "El nombre de la empresa es obligatorio." });
        }
        const cleanName = name.trim();
        const cleanSlug = slug ? slug.trim().toLowerCase() : cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
        const cleanLogo = logoUrl ? logoUrl.trim() : null;
        const cleanRnc = rncTaxId ? rncTaxId.trim() : null;
        const cleanIndustry = industry ? industry.trim() : "General";
        const cleanEmail = contactEmail ? contactEmail.trim().toLowerCase() : null;
        const cleanPhone = contactPhone ? contactPhone.trim() : null;
        const active = isActive !== undefined ? Boolean(isActive) : true;
        await db_js_1.pool.query(`UPDATE companies 
       SET name = $1, 
           slug = $2, 
           logo_url = $3, 
           rnc_tax_id = $4, 
           industry = $5, 
           contact_email = $6, 
           contact_phone = $7, 
           is_active = $8
       WHERE id = $9`, [cleanName, cleanSlug, cleanLogo, cleanRnc, cleanIndustry, cleanEmail, cleanPhone, active, id]);
        res.json({ success: true, id });
    }
    catch (err) {
        console.error("Error al actualizar empresa:", err);
        res.status(500).json({ error: "Error al actualizar empresa en PostgreSQL", details: err.message });
    }
});
// DELETE /api/companies/:id
exports.companiesRouter.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (id === "emp_kasino") {
            return res.status(400).json({ error: "La empresa principal del sistema no puede ser eliminada." });
        }
        await db_js_1.pool.query("DELETE FROM companies WHERE id = $1", [id]);
        res.json({ success: true, message: "Empresa eliminada correctamente." });
    }
    catch (err) {
        console.error("Error al eliminar empresa:", err);
        res.status(500).json({ error: "Error al eliminar empresa de PostgreSQL", details: err.message });
    }
});
