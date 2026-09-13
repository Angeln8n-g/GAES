"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.participantsRouter = void 0;
const express_1 = require("express");
const db_js_1 = require("../db.js");
exports.participantsRouter = (0, express_1.Router)();
// GET /api/participants
exports.participantsRouter.get("/", async (req, res) => {
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
        COALESCE(company_id, 'emp_kasino') as "companyId",
        TO_CHAR(birth_date, 'YYYY-MM-DD') as "birthDate",
        education_level as "educationLevel",
        COALESCE(is_currently_studying, false) as "isCurrentlyStudying",
        current_study_field as "currentStudyField",
        institution_name as "institutionName",
        profession_title as "professionTitle",
        current_address as "currentAddress",
        phone,
        gender,
        COALESCE(training_interest_areas, '{}') as "trainingInterestAreas",
        COALESCE(profile_completed, false) as "profileCompleted"
      FROM participants 
    `;
        const params = [];
        if (companyId && typeof companyId === "string" && companyId !== "all") {
            query += " WHERE company_id = $1";
            params.push(companyId);
        }
        query += " ORDER BY name ASC";
        const result = await db_js_1.pool.query(query, params);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Error al obtener participantes:", err);
        res.status(500).json({ error: "Error al consultar participantes en PostgreSQL", details: err.message });
    }
});
// POST /api/participants/bulk
exports.participantsRouter.post("/bulk", async (req, res) => {
    const client = await db_js_1.pool.connect();
    try {
        const { participants } = req.body;
        if (!Array.isArray(participants)) {
            return res.status(400).json({ error: "Formato inválido. Se espera una lista de participantes." });
        }
        await client.query("BEGIN");
        for (const p of participants) {
            if (!p.card || !p.name || !p.email)
                continue;
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
            const birthDate = p.birthDate ? p.birthDate.trim() : null;
            const educationLevel = p.educationLevel ? p.educationLevel.trim() : null;
            const isCurrentlyStudying = Boolean(p.isCurrentlyStudying);
            const currentStudyField = p.currentStudyField ? p.currentStudyField.trim() : null;
            const institutionName = p.institutionName ? p.institutionName.trim() : null;
            const professionTitle = p.professionTitle ? p.professionTitle.trim() : null;
            const currentAddress = p.currentAddress ? p.currentAddress.trim() : null;
            const phone = p.phone ? p.phone.trim() : null;
            const gender = p.gender ? p.gender.trim() : null;
            const trainingInterestAreas = Array.isArray(p.trainingInterestAreas) ? p.trainingInterestAreas : [];
            const profileCompleted = p.profileCompleted !== undefined ? Boolean(p.profileCompleted) : (Boolean(educationLevel && birthDate));
            // 1. Guardar en participants
            await client.query(`INSERT INTO participants (
          card, name, email, cedula, department, supervisor_id, supervisor_name, 
          employment_status, is_active, company_id, birth_date, education_level, 
          is_currently_studying, current_study_field, institution_name, profession_title, 
          current_address, phone, gender, training_interest_areas, profile_completed
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
         ON CONFLICT (card) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           cedula = COALESCE(EXCLUDED.cedula, participants.cedula),
           department = EXCLUDED.department,
           supervisor_id = EXCLUDED.supervisor_id,
           supervisor_name = EXCLUDED.supervisor_name,
           employment_status = EXCLUDED.employment_status,
           is_active = EXCLUDED.is_active,
           company_id = EXCLUDED.company_id,
           birth_date = COALESCE(EXCLUDED.birth_date, participants.birth_date),
           education_level = COALESCE(EXCLUDED.education_level, participants.education_level),
           is_currently_studying = EXCLUDED.is_currently_studying,
           current_study_field = COALESCE(EXCLUDED.current_study_field, participants.current_study_field),
           institution_name = COALESCE(EXCLUDED.institution_name, participants.institution_name),
           profession_title = COALESCE(EXCLUDED.profession_title, participants.profession_title),
           current_address = COALESCE(EXCLUDED.current_address, participants.current_address),
           phone = COALESCE(EXCLUDED.phone, participants.phone),
           gender = COALESCE(EXCLUDED.gender, participants.gender),
           training_interest_areas = EXCLUDED.training_interest_areas,
           profile_completed = EXCLUDED.profile_completed`, [
                card, name, email, cedula, department, supervisorId, supervisorName,
                employmentStatus, isActive, companyId, birthDate, educationLevel,
                isCurrentlyStudying, currentStudyField, institutionName, professionTitle,
                currentAddress, phone, gender, trainingInterestAreas, profileCompleted
            ]);
            // 2. Auto-aprovisionar o sincronizar en users_simulated
            const userExists = await client.query("SELECT id FROM users_simulated WHERE LOWER(email) = $1", [email]);
            if (userExists.rows.length === 0) {
                const newUserId = `usr_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
                await client.query(`INSERT INTO users_simulated (
            id, email, name, role, password, cedula, department, employment_status, 
            is_active, company_id, birth_date, education_level, is_currently_studying, 
            current_study_field, institution_name, profession_title, current_address, 
            phone, gender, training_interest_areas, profile_completed
          )
           VALUES ($1, $2, $3, 'Colaborador (User)', '123', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
           ON CONFLICT (email) DO NOTHING`, [
                    newUserId, email, name, cedula, department, employmentStatus,
                    isActive, companyId, birthDate, educationLevel, isCurrentlyStudying,
                    currentStudyField, institutionName, professionTitle, currentAddress,
                    phone, gender, trainingInterestAreas, profileCompleted
                ]);
            }
            else {
                await client.query(`UPDATE users_simulated 
           SET name = $1, 
               cedula = COALESCE($2, cedula), 
               department = COALESCE($3, department),
               employment_status = $4,
               is_active = $5,
               company_id = $6,
               birth_date = COALESCE($7, birth_date),
               education_level = COALESCE($8, education_level),
               is_currently_studying = $9,
               current_study_field = COALESCE($10, current_study_field),
               institution_name = COALESCE($11, institution_name),
               profession_title = COALESCE($12, profession_title),
               current_address = COALESCE($13, current_address),
               phone = COALESCE($14, phone),
               gender = COALESCE($15, gender),
               training_interest_areas = $16,
               profile_completed = $17
           WHERE LOWER(email) = $18`, [
                    name, cedula, department, employmentStatus, isActive, companyId,
                    birthDate, educationLevel, isCurrentlyStudying, currentStudyField,
                    institutionName, professionTitle, currentAddress, phone, gender,
                    trainingInterestAreas, profileCompleted, email
                ]);
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
        COALESCE(company_id, 'emp_kasino') as "companyId",
        TO_CHAR(birth_date, 'YYYY-MM-DD') as "birthDate",
        education_level as "educationLevel",
        COALESCE(is_currently_studying, false) as "isCurrentlyStudying",
        current_study_field as "currentStudyField",
        institution_name as "institutionName",
        profession_title as "professionTitle",
        current_address as "currentAddress",
        phone,
        gender,
        COALESCE(training_interest_areas, '{}') as "trainingInterestAreas",
        COALESCE(profile_completed, false) as "profileCompleted"
      FROM participants 
      ORDER BY name ASC
    `);
        res.json(result.rows);
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error("Error en carga masiva de participantes:", err);
        res.status(500).json({ error: "Error al guardar participantes", details: err.message });
    }
    finally {
        client.release();
    }
});
// PUT /api/participants/:card
exports.participantsRouter.put("/:card", async (req, res) => {
    const client = await db_js_1.pool.connect();
    try {
        const { card } = req.params;
        const { name, email, cedula, department, supervisorId, supervisorName, employmentStatus, isActive, companyId, birthDate, educationLevel, isCurrentlyStudying, currentStudyField, institutionName, professionTitle, currentAddress, phone, gender, trainingInterestAreas, profileCompleted } = req.body;
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
        const cleanBirthDate = birthDate ? birthDate.trim() : null;
        const cleanEduLevel = educationLevel ? educationLevel.trim() : null;
        const cleanStudying = Boolean(isCurrentlyStudying);
        const cleanStudyField = currentStudyField ? currentStudyField.trim() : null;
        const cleanInstName = institutionName ? institutionName.trim() : null;
        const cleanProfTitle = professionTitle ? professionTitle.trim() : null;
        const cleanAddress = currentAddress ? currentAddress.trim() : null;
        const cleanPhone = phone ? phone.trim() : null;
        const cleanGender = gender ? gender.trim() : null;
        const cleanInterests = Array.isArray(trainingInterestAreas) ? trainingInterestAreas : [];
        const cleanCompleted = profileCompleted !== undefined ? Boolean(profileCompleted) : (Boolean(cleanEduLevel && cleanBirthDate));
        await client.query("BEGIN");
        await client.query(`UPDATE participants 
       SET name = $1, 
           email = $2, 
           cedula = $3, 
           department = $4, 
           supervisor_id = $5, 
           supervisor_name = $6,
           employment_status = $7,
           is_active = $8,
           company_id = $9,
           birth_date = $10,
           education_level = $11,
           is_currently_studying = $12,
           current_study_field = $13,
           institution_name = $14,
           profession_title = $15,
           current_address = $16,
           phone = $17,
           gender = $18,
           training_interest_areas = $19,
           profile_completed = $20
       WHERE card = $21`, [
            cleanName, cleanEmail, cleanCedula, cleanDept, cleanSuperId, cleanSuperName,
            cleanEmpStatus, cleanIsActive, cleanCompanyId, cleanBirthDate, cleanEduLevel,
            cleanStudying, cleanStudyField, cleanInstName, cleanProfTitle, cleanAddress,
            cleanPhone, cleanGender, cleanInterests, cleanCompleted, cleanCard
        ]);
        // Sync corresponding user in users_simulated
        await client.query(`UPDATE users_simulated 
       SET name = $1, 
           cedula = COALESCE($2, cedula), 
           department = COALESCE($3, department),
           employment_status = $4,
           is_active = $5,
           company_id = $6,
           birth_date = COALESCE($7, birth_date),
           education_level = COALESCE($8, education_level),
           is_currently_studying = $9,
           current_study_field = COALESCE($10, current_study_field),
           institution_name = COALESCE($11, institution_name),
           profession_title = COALESCE($12, profession_title),
           current_address = COALESCE($13, current_address),
           phone = COALESCE($14, phone),
           gender = COALESCE($15, gender),
           training_interest_areas = $16,
           profile_completed = $17
       WHERE LOWER(email) = $18`, [
            cleanName, cleanCedula, cleanDept, cleanEmpStatus, cleanIsActive, cleanCompanyId,
            cleanBirthDate, cleanEduLevel, cleanStudying, cleanStudyField, cleanInstName,
            cleanProfTitle, cleanAddress, cleanPhone, cleanGender, cleanInterests, cleanCompleted, cleanEmail
        ]);
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
        COALESCE(company_id, 'emp_kasino') as "companyId",
        TO_CHAR(birth_date, 'YYYY-MM-DD') as "birthDate",
        education_level as "educationLevel",
        COALESCE(is_currently_studying, false) as "isCurrentlyStudying",
        current_study_field as "currentStudyField",
        institution_name as "institutionName",
        profession_title as "professionTitle",
        current_address as "currentAddress",
        phone,
        gender,
        COALESCE(training_interest_areas, '{}') as "trainingInterestAreas",
        COALESCE(profile_completed, false) as "profileCompleted"
      FROM participants 
      ORDER BY name ASC
    `);
        res.json(result.rows);
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error("Error al actualizar participante:", err);
        res.status(500).json({ error: "Error al actualizar participante", details: err.message });
    }
    finally {
        client.release();
    }
});
// DELETE /api/participants/:card
exports.participantsRouter.delete("/:card", async (req, res) => {
    try {
        const { card } = req.params;
        await db_js_1.pool.query("DELETE FROM participants WHERE card = $1", [card.trim()]);
        const result = await db_js_1.pool.query(`
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
    }
    catch (err) {
        console.error("Error al eliminar participante:", err);
        res.status(500).json({ error: "Error al eliminar participante", details: err.message });
    }
});
