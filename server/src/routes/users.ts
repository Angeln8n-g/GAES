import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { JWT_SECRET } from "../middlewares/auth.js";

export const usersRouter = Router();

// POST /api/users/login (o /api/auth/login)
usersRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { identifier, email, password } = req.body;
    const loginId = (identifier || email || "").trim();

    if (!loginId || !password) {
      return res.status(400).json({ error: "Debe ingresar su correo o cédula y su contraseña." });
    }

    const cleanInput = loginId.toLowerCase();
    const unformattedCedula = cleanInput.replace(/[^a-z0-9]/g, "");

    const query = `
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
      WHERE LOWER(email) = $1 
         OR (cedula IS NOT NULL AND (LOWER(cedula) = $1 OR REPLACE(REPLACE(LOWER(cedula), '-', ''), ' ', '') = $2))
      LIMIT 1
    `;

    const result = await pool.query(query, [cleanInput, unformattedCedula]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciales incorrectas. Verifique su correo/cédula o contraseña." });
    }

    const user = result.rows[0];

    // Verificar si la cuenta está inactiva o desvinculada
    if (user.isActive === false || user.employmentStatus === "inactivo") {
      return res.status(403).json({
        error: "Tu cuenta se encuentra inactiva o desvinculada. Contacta al departamento de Recursos Humanos."
      });
    }

    // Comprobación de contraseña con soporte para migración transparente
    const dbPassword = user.password || "";
    const isBcrypt = dbPassword.startsWith("$2a$") || dbPassword.startsWith("$2b$");
    let passwordValid = false;

    if (isBcrypt) {
      passwordValid = bcrypt.compareSync(password, dbPassword);
    } else {
      // Contraseña legada en texto plano
      passwordValid = (dbPassword === password);
      if (passwordValid) {
        // Auto-upgrade automático e inmediato a hash Bcrypt en la base de datos
        try {
          const newHash = bcrypt.hashSync(password, 10);
          await pool.query("UPDATE users_simulated SET password = $1 WHERE id = $2", [newHash, user.id]);
          console.log(`[AUTH] Contraseña de usuario ${user.email} migrada exitosamente a Bcrypt.`);
        } catch (migErr) {
          console.error("[AUTH] Error migrando hash de contraseña:", migErr);
        }
      }
    }

    if (!passwordValid) {
      return res.status(401).json({ error: "Credenciales incorrectas. Verifique su correo/cédula o contraseña." });
    }

    // Excluir la contraseña del objeto de usuario retornado
    const { password: _, ...sanitizedUser } = user;

    // Generar JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Autenticación exitosa",
      token,
      user: sanitizedUser
    });
  } catch (err: any) {
    console.error("Error en login:", err);
    res.status(500).json({ error: "Error en el servidor durante la autenticación", details: err.message });
  }
});

// GET /api/users (PROTEGIDO: nunca expone hashes ni contraseñas)
usersRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { companyId } = req.query;
    let query = `
      SELECT 
        id, 
        email, 
        name, 
        role, 
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
    const params: any[] = [];
    if (companyId && typeof companyId === "string" && companyId !== "all") {
      query += " WHERE company_id = $1";
      params.push(companyId);
    }
    query += " ORDER BY id ASC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error("Error al obtener usuarios:", err);
    res.status(500).json({ error: "Error al consultar usuarios", details: err.message });
  }
});

// POST /api/users/bulk
usersRouter.post("/bulk", async (req: Request, res: Response) => {
  const reqUser = req.user;
  const isSuperAdmin = reqUser?.role === "Super Administrador";
  const isAdminEditor = reqUser?.role === "Administrador / Editor";

  if (!isSuperAdmin && !isAdminEditor) {
    return res.status(403).json({
      error: "Acceso denegado: Se requieren permisos administrativos para importación o modificación masiva de usuarios."
    });
  }

  const client = await pool.connect();
  try {
    const { users } = req.body;
    if (!Array.isArray(users)) {
      return res.status(400).json({ error: "Formato inválido. Se espera una lista de usuarios." });
    }

    if (!isSuperAdmin && users.some(u => u && u.role === "Super Administrador")) {
      return res.status(403).json({
        error: "Acceso denegado: Sólo un Super Administrador puede asignar o importar usuarios con dicho rol."
      });
    }

    await client.query("BEGIN");

    for (const u of users) {
      if (!u.email || !u.name) continue;
      const userId = u.id || `usr_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const cleanEmail = u.email.trim().toLowerCase();
      const cleanName = u.name.trim();
      const role = u.role || "Colaborador (User)";
      const rawPassword = u.password || "123";
      const isAlreadyBcrypt = rawPassword.startsWith("$2a$") || rawPassword.startsWith("$2b$");
      const password = isAlreadyBcrypt ? rawPassword : bcrypt.hashSync(rawPassword, 10);
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
        await client.query(
          `UPDATE users_simulated 
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
           WHERE LOWER(email) = $21`,
          [
            cleanName, role, password, cedula, department, assignedMemberCards, 
            employmentStatus, isActive, companyId, birthDate, educationLevel, 
            isCurrentlyStudying, currentStudyField, institutionName, professionTitle, 
            currentAddress, phone, gender, trainingInterestAreas, profileCompleted, cleanEmail
          ]
        );
      } else {
        await client.query(
          `INSERT INTO users_simulated (
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
             profile_completed = EXCLUDED.profile_completed`,
          [
            userId, cleanEmail, cleanName, role, password, cedula, department, 
            assignedMemberCards, employmentStatus, isActive, companyId, birthDate, 
            educationLevel, isCurrentlyStudying, currentStudyField, institutionName, 
            professionTitle, currentAddress, phone, gender, trainingInterestAreas, profileCompleted
          ]
        );
      }

      // Sincronizar en participants si existe el correo
      await client.query(
        `UPDATE participants
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
         WHERE LOWER(email) = $18`,
        [
          cleanName, cedula, department, employmentStatus, isActive, companyId, 
          birthDate, educationLevel, isCurrentlyStudying, currentStudyField, 
          institutionName, professionTitle, currentAddress, phone, gender, 
          trainingInterestAreas, profileCompleted, cleanEmail
        ]
      );
    }

    await client.query("COMMIT");
    const result = await client.query(`
      SELECT 
        id, 
        email, 
        name, 
        role, 
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
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error al actualizar usuarios:", err);
    res.status(500).json({ error: "Error al actualizar usuarios", details: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/users/:id
usersRouter.put("/:id", async (req: Request, res: Response) => {
  const reqUser = req.user;
  const isSuperAdmin = reqUser?.role === "Super Administrador";
  const isAdminEditor = reqUser?.role === "Administrador / Editor";
  const isOwner = String(reqUser?.id) === String(req.params.id);

  if (!isSuperAdmin && !isAdminEditor && !isOwner) {
    return res.status(403).json({
      error: "Acceso denegado: No tienes permiso para modificar este usuario."
    });
  }

  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { 
      name, email, role, password, cedula, department, assignedMemberCards, 
      employmentStatus, isActive, companyId, birthDate, educationLevel, 
      isCurrentlyStudying, currentStudyField, institutionName, professionTitle, 
      currentAddress, phone, gender, trainingInterestAreas, profileCompleted 
    } = req.body;

    if (!name || !email) {
      client.release();
      return res.status(400).json({ error: "Nombre y correo son obligatorios." });
    }

    // Consultar estado previo del usuario para capturar datos anteriores y validar permisos
    const previousUserRes = await client.query(
      "SELECT id, email, role, cedula, employment_status, is_active, company_id FROM users_simulated WHERE id = $1",
      [id]
    );

    if (previousUserRes.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const previousUser = previousUserRes.rows[0];

    // Reglas de protección contra escalada de privilegios y edición no autorizada:
    if (!isSuperAdmin) {
      // Un no-SuperAdmin no puede modificar a un Super Administrador
      if (previousUser.role === "Super Administrador") {
        client.release();
        return res.status(403).json({ error: "Acceso denegado: No tienes permiso para modificar a un Super Administrador." });
      }
      // Un no-SuperAdmin no puede asignar el rol de Super Administrador
      if (role === "Super Administrador") {
        client.release();
        return res.status(403).json({ error: "Acceso denegado: Sólo un Super Administrador puede asignar dicho rol." });
      }
      // Un usuario común (no admin) no puede modificar su propio rol
      if (!isAdminEditor && role && role !== previousUser.role) {
        client.release();
        return res.status(403).json({ error: "Acceso denegado: No tienes permiso para modificar tu rol." });
      }
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanRole = (isSuperAdmin || isAdminEditor) ? (role || previousUser.role) : previousUser.role;
    const cleanCedula = cedula ? cedula.trim() : null;
    const cleanDept = department ? department.trim() : null;
    const cleanCards = (isSuperAdmin || isAdminEditor) ? (Array.isArray(assignedMemberCards) ? assignedMemberCards : null) : null;
    const cleanEmpStatus = (isSuperAdmin || isAdminEditor) ? (employmentStatus || previousUser.employment_status || 'contratado') : (previousUser.employment_status || 'contratado');
    const cleanIsActive = (isSuperAdmin || isAdminEditor) ? (isActive !== undefined ? Boolean(isActive) : true) : Boolean(previousUser.is_active);
    const cleanCompanyId = (isSuperAdmin || isAdminEditor) ? (companyId ? companyId.trim() : 'emp_kasino') : (previousUser.company_id || 'emp_kasino');
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
    const oldEmail = previousUser.email ? previousUser.email.trim().toLowerCase() : null;

    // Sólo Super Administrador puede sobrescribir contraseñas arbitrariamente en PUT /:id
    const allowDirectPasswordChange = isSuperAdmin && password && password.trim();
    let finalParams: any[] = [];
    let updateQuery = "";

    if (allowDirectPasswordChange) {
      const trimmed = password.trim();
      const isAlreadyBcrypt = trimmed.startsWith("$2a$") || trimmed.startsWith("$2b$");
      const hashedPwd = isAlreadyBcrypt ? trimmed : bcrypt.hashSync(trimmed, 10);
      updateQuery = `UPDATE users_simulated 
         SET name = $1, 
             email = $2, 
             role = $3, 
             cedula = $4, 
             department = $5, 
             assigned_member_cards = $6, 
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
             profile_completed = $20,
             password = $21
         WHERE id = $22`;
      finalParams = [
        cleanName, cleanEmail, cleanRole, cleanCedula, 
        cleanDept, cleanCards, cleanEmpStatus, cleanIsActive, cleanCompanyId, 
        cleanBirthDate, cleanEduLevel, cleanStudying, cleanStudyField, cleanInstName, 
        cleanProfTitle, cleanAddress, cleanPhone, cleanGender, cleanInterests, cleanCompleted,
        hashedPwd, id
      ];
    } else {
      updateQuery = `UPDATE users_simulated 
         SET name = $1, 
             email = $2, 
             role = $3, 
             cedula = $4, 
             department = $5, 
             assigned_member_cards = $6, 
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
         WHERE id = $21`;
      finalParams = [
        cleanName, cleanEmail, cleanRole, cleanCedula, 
        cleanDept, cleanCards, cleanEmpStatus, cleanIsActive, cleanCompanyId, 
        cleanBirthDate, cleanEduLevel, cleanStudying, cleanStudyField, cleanInstName, 
        cleanProfTitle, cleanAddress, cleanPhone, cleanGender, cleanInterests, cleanCompleted,
        id
      ];
    }

    await client.query(updateQuery, finalParams);

    // Sincronizar en cascada en participants (por nuevo email, email previo, o cédula)
    const unformattedCedula = cleanCedula ? cleanCedula.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : null;
    await client.query(
      `UPDATE participants 
       SET name = $1, 
           email = $2,
           cedula = COALESCE($3, cedula), 
           department = COALESCE($4, department),
           employment_status = $5,
           is_active = $6,
           company_id = $7,
           birth_date = COALESCE($8, birth_date),
           education_level = COALESCE($9, education_level),
           is_currently_studying = $10,
           current_study_field = COALESCE($11, current_study_field),
           institution_name = COALESCE($12, institution_name),
           profession_title = COALESCE($13, profession_title),
           current_address = COALESCE($14, current_address),
           phone = COALESCE($15, phone),
           gender = COALESCE($16, gender),
           training_interest_areas = $17,
           profile_completed = $18
       WHERE LOWER(email) = LOWER($2)
          OR (CAST($19 AS VARCHAR) IS NOT NULL AND LOWER(email) = LOWER($19))
          OR (CAST($3 AS VARCHAR) IS NOT NULL AND (cedula = $3 OR REPLACE(REPLACE(LOWER(cedula), '-', ''), ' ', '') = $20))`,
      [
        cleanName, cleanEmail, cleanCedula, cleanDept, cleanEmpStatus, cleanIsActive, cleanCompanyId, 
        cleanBirthDate, cleanEduLevel, cleanStudying, cleanStudyField, cleanInstName, 
        cleanProfTitle, cleanAddress, cleanPhone, cleanGender, cleanInterests, cleanCompleted,
        oldEmail, unformattedCedula
      ]
    );

    await client.query("COMMIT");

    const result = await client.query(`
      SELECT 
        id, 
        email, 
        name, 
        role, 
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
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error al actualizar usuario:", err);
    res.status(500).json({ error: "Error al actualizar usuario", details: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/users/:id/profile (Actualización directa de perfil de usuario)
usersRouter.put("/:id/profile", async (req: Request, res: Response) => {
  const reqUser = req.user;
  const isSuperAdmin = reqUser?.role === "Super Administrador";
  const isAdminEditor = reqUser?.role === "Administrador / Editor";
  const isOwner = String(reqUser?.id) === String(req.params.id);

  if (!isSuperAdmin && !isAdminEditor && !isOwner) {
    return res.status(403).json({
      error: "Acceso denegado: No tienes permiso para modificar el perfil de este usuario."
    });
  }

  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { 
      birthDate, 
      educationLevel, 
      isCurrentlyStudying, 
      currentStudyField, 
      institutionName, 
      professionTitle, 
      currentAddress, 
      phone, 
      gender, 
      trainingInterestAreas 
    } = req.body;

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

    const updatedUserRes = await client.query(
      `UPDATE users_simulated 
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
         id, email, name, role, cedula, department, 
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
         COALESCE(profile_completed, false) as "profileCompleted"`,
      [
        cleanBirthDate, cleanEduLevel, cleanStudying, cleanStudyField, cleanInstName, 
        cleanProfTitle, cleanAddress, cleanPhone, cleanGender, cleanInterests, isComplete, id
      ]
    );

    if (updatedUserRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const updatedUser = updatedUserRes.rows[0];

    // Sincronizar en participants (por email o cédula)
    const profileCedula = updatedUser.cedula ? updatedUser.cedula.trim() : null;
    const profileCedulaClean = profileCedula ? profileCedula.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : null;
    await client.query(
      `UPDATE participants 
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
       WHERE LOWER(email) = $12
          OR (CAST($13 AS VARCHAR) IS NOT NULL AND (cedula = $13 OR REPLACE(REPLACE(LOWER(cedula), '-', ''), ' ', '') = $14))`,
      [
        cleanBirthDate, cleanEduLevel, cleanStudying, cleanStudyField, cleanInstName, 
        cleanProfTitle, cleanAddress, cleanPhone, cleanGender, cleanInterests, isComplete, 
        updatedUser.email.toLowerCase(), profileCedula, profileCedulaClean
      ]
    );

    await client.query("COMMIT");

    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error al guardar perfil de usuario:", err);
    res.status(500).json({ error: "Error al actualizar perfil de usuario", details: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/users/:id/password
usersRouter.put("/:id/password", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    const reqUser = req.user;

    if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 6) {
      return res.status(400).json({ error: "La nueva contraseña debe contener al menos 6 caracteres." });
    }

    const isSuperAdmin = reqUser?.role === "Super Administrador";
    const isOwner = String(reqUser?.id) === String(id);

    // Si no es el dueño de la cuenta ni un Super Administrador, denegar
    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({ error: "Acceso denegado: No tienes permiso para modificar la contraseña de otro usuario." });
    }

    const userCheck = await pool.query("SELECT id, email, password FROM users_simulated WHERE id = $1", [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const targetUser = userCheck.rows[0];

    // Para el dueño de la cuenta (o no-SuperAdmin), exigir obligatoriamente currentPassword
    if (isOwner || !isSuperAdmin) {
      if (!currentPassword || typeof currentPassword !== "string" || !currentPassword.trim()) {
        return res.status(400).json({ error: "Debe ingresar su contraseña actual." });
      }

      const dbPwd = targetUser.password || "";
      const isBcrypt = dbPwd.startsWith("$2a$") || dbPwd.startsWith("$2b$");
      const isMatch = isBcrypt ? bcrypt.compareSync(currentPassword, dbPwd) : (dbPwd === currentPassword);
      if (!isMatch) {
        return res.status(401).json({ error: "La contraseña actual es incorrecta." });
      }
    }

    const hashed = bcrypt.hashSync(newPassword.trim(), 10);
    await pool.query("UPDATE users_simulated SET password = $1 WHERE id = $2", [hashed, id]);
    const result = await pool.query(`
      SELECT 
        id, 
        email, 
        name, 
        role, 
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
  } catch (err: any) {
    console.error("Error al cambiar contraseña:", err);
    res.status(500).json({ error: "Error al cambiar contraseña", details: err.message });
  }
});

// DELETE /api/users/:id
usersRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reqUser = req.user;

    if (reqUser?.role !== "Super Administrador") {
      return res.status(403).json({ error: "Acceso denegado: Sólo los Super Administradores pueden eliminar usuarios." });
    }

    if (String(reqUser.id) === String(id)) {
      return res.status(400).json({ error: "No puedes eliminar tu propia cuenta de Super Administrador." });
    }

    const checkUser = await pool.query("SELECT id FROM users_simulated WHERE id = $1", [id]);
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    await pool.query("DELETE FROM users_simulated WHERE id = $1", [id]);
    const result = await pool.query(`
      SELECT 
        id, 
        email, 
        name, 
        role, 
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
  } catch (err: any) {
    console.error("Error al eliminar usuario:", err);
    res.status(500).json({ error: "Error al eliminar usuario", details: err.message });
  }
});
