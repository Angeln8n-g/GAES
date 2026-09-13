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
            const birthDate = u.birthDate ? u.birthDate.trim() : null;
            const educationLevel = u.educationLevel ? u.educationLevel.trim() : null;
            const isCurrentlyStudying = Boolean(u.isCurrentlyStudying);
            const currentStudyField = u.currentStudyField ? u.currentStudyField.trim() : null;
            const institutionName = u.institutionName ? u.institutionName.trim() : null;
            const professionTitle = u.professionTitle ? u.professionTitle.trim() : null;
            const currentAddress = u.currentAddress ? u.currentAddress.trim() : null;
            const phone = u.phone ? u.phone.trim() : null;
            const gender = u.gender ? u.gender.trim() : null;
            const trainingInterestAreas = Array.isArray(u.trainingInterestAreas) ? u.trainingInterestAreas : [];
            const profileCompleted = u.profileCompleted !== undefined ? Boolean(u.profileCompleted) : (Boolean(educationLevel && birthDate));
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
               company_id = $9,
               birth_date = COALESCE($10, birth_date),
               education_level = COALESCE($11, education_level),
               is_currently_studying = $12,
               current_study_field = COALESCE($13, current_study_field),
               institution_name = COALESCE($14, institution_name),
               profession_title = COALESCE($15, profession_title),
               current_address = COALESCE($16, current_address),
               phone = COALESCE($17, phone),
               gender = COALESCE($18, gender),
               training_interest_areas = $19,
               profile_completed = $20
           WHERE LOWER(email) = $21`, [
                    cleanName, role, password, cedula, department, assignedMemberCards,
                    employmentStatus, isActive, companyId, birthDate, educationLevel,
                    isCurrentlyStudying, currentStudyField, institutionName, professionTitle,
                    currentAddress, phone, gender, trainingInterestAreas, profileCompleted, cleanEmail
                ]);
            }
            else {
                await client.query(`INSERT INTO users_simulated (
            id, email, name, role, password, cedula, department, assigned_member_cards, 
            employment_status, is_active, company_id, birth_date, education_level, 
            is_currently_studying, current_study_field, institution_name, profession_title, 
            current_address, phone, gender, training_interest_areas, profile_completed
          )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
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
             company_id = EXCLUDED.company_id,
             birth_date = EXCLUDED.birth_date,
             education_level = EXCLUDED.education_level,
             is_currently_studying = EXCLUDED.is_currently_studying,
             current_study_field = EXCLUDED.current_study_field,
             institution_name = EXCLUDED.institution_name,
             profession_title = EXCLUDED.profession_title,
             current_address = EXCLUDED.current_address,
             phone = EXCLUDED.phone,
             gender = EXCLUDED.gender,
             training_interest_areas = EXCLUDED.training_interest_areas,
             profile_completed = EXCLUDED.profile_completed`, [
                    userId, cleanEmail, cleanName, role, password, cedula, department,
                    assignedMemberCards, employmentStatus, isActive, companyId, birthDate,
                    educationLevel, isCurrentlyStudying, currentStudyField, institutionName,
                    professionTitle, currentAddress, phone, gender, trainingInterestAreas, profileCompleted
                ]);
            }
            // Sincronizar en participants si existe el correo
            await client.query(`UPDATE participants
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
                cleanName, cedula, department, employmentStatus, isActive, companyId,
                birthDate, educationLevel, isCurrentlyStudying, currentStudyField,
                institutionName, professionTitle, currentAddress, phone, gender,
                trainingInterestAreas, profileCompleted, cleanEmail
            ]);
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
        const { name, email, role, password, cedula, department, assignedMemberCards, employmentStatus, isActive, companyId, birthDate, educationLevel, isCurrentlyStudying, currentStudyField, institutionName, professionTitle, currentAddress, phone, gender, trainingInterestAreas, profileCompleted } = req.body;
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
           company_id = $10,
           birth_date = $11,
           education_level = $12,
           is_currently_studying = $13,
           current_study_field = $14,
           institution_name = $15,
           profession_title = $16,
           current_address = $17,
           phone = $18,
           gender = $19,
           training_interest_areas = $20,
           profile_completed = $21
       WHERE id = $22`, [
            cleanName, cleanEmail, cleanRole, password ? password.trim() : '', cleanCedula,
            cleanDept, cleanCards, cleanEmpStatus, cleanIsActive, cleanCompanyId,
            cleanBirthDate, cleanEduLevel, cleanStudying, cleanStudyField, cleanInstName,
            cleanProfTitle, cleanAddress, cleanPhone, cleanGender, cleanInterests, cleanCompleted, id
        ]);
        // Sincronizar en participants
        await client.query(`UPDATE participants 
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
// PUT /api/users/:id/profile (Actualización directa de perfil de usuario)
exports.usersRouter.put("/:id/profile", async (req, res) => {
    const client = await db_js_1.pool.connect();
    try {
        const { id } = req.params;
        const { birthDate, educationLevel, isCurrentlyStudying, currentStudyField, institutionName, professionTitle, currentAddress, phone, gender, trainingInterestAreas } = req.body;
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
        const isComplete = Boolean(cleanBirthDate && cleanEduLevel);
        await client.query("BEGIN");
        const updatedUserRes = await client.query(`UPDATE users_simulated 
       SET birth_date = $1,
           education_level = $2,
           is_currently_studying = $3,
           current_study_field = $4,
           institution_name = $5,
           profession_title = $6,
           current_address = $7,
           phone = $8,
           gender = $9,
           training_interest_areas = $10,
           profile_completed = $11
       WHERE id = $12
       RETURNING 
         id, email, name, role, password, cedula, department, 
         assigned_member_cards as "assignedMemberCards",
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
         phone, gender,
         COALESCE(training_interest_areas, '{}') as "trainingInterestAreas",
         COALESCE(profile_completed, false) as "profileCompleted"`, [
            cleanBirthDate, cleanEduLevel, cleanStudying, cleanStudyField, cleanInstName,
            cleanProfTitle, cleanAddress, cleanPhone, cleanGender, cleanInterests, isComplete, id
        ]);
        if (updatedUserRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        const updatedUser = updatedUserRes.rows[0];
        // Sincronizar en participants
        await client.query(`UPDATE participants 
       SET birth_date = $1,
           education_level = $2,
           is_currently_studying = $3,
           current_study_field = $4,
           institution_name = $5,
           profession_title = $6,
           current_address = $7,
           phone = $8,
           gender = $9,
           training_interest_areas = $10,
           profile_completed = $11
       WHERE LOWER(email) = $12`, [
            cleanBirthDate, cleanEduLevel, cleanStudying, cleanStudyField, cleanInstName,
            cleanProfTitle, cleanAddress, cleanPhone, cleanGender, cleanInterests, isComplete, updatedUser.email.toLowerCase()
        ]);
        await client.query("COMMIT");
        res.json({ success: true, user: updatedUser });
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error("Error al guardar perfil de usuario:", err);
        res.status(500).json({ error: "Error al actualizar perfil de usuario", details: err.message });
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
