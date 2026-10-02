import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { pool } from '../db.js';
import { authenticateToken } from '../middlewares/auth.js';

export const certificatesRouter = Router();

// Helper para generar Credential IDs únicos y legibles: CLARO-CERT-2026-XXXXXX
function generateCredentialId(prefix = 'CLARO-CERT'): string {
  const year = new Date().getFullYear();
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
  return `${prefix}-${year}-${randomHex}`;
}

// Helper para enmascarar la cédula en vistas públicas para cumplir leyes de protección de datos
function maskCedula(cedula: string): string {
  if (!cedula) return '***';
  const clean = cedula.replace(/[^0-9]/g, '');
  if (clean.length >= 11) {
    // Formato dominicano: 001-XXXXXXX-X -> 001-***XX-X
    return `${clean.substring(0, 3)}-***${clean.substring(clean.length - 4, clean.length - 1)}-${clean.substring(clean.length - 1)}`;
  }
  if (cedula.length > 5) {
    return `${cedula.substring(0, 3)}***${cedula.substring(cedula.length - 2)}`;
  }
  return '***-***-***';
}

// ==========================================
// 1. ENDPOINT PÚBLICO DE VERIFICACIÓN (QR SCAN)
// GET /api/certificates/verify/:credentialId
// ==========================================
certificatesRouter.get('/verify/:credentialId', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.credentialId.trim();
    if (!rawId) {
      return res.status(400).json({ isValid: false, error: 'Identificador de credencial no proporcionado.' });
    }

    const query = `
      SELECT 
        id,
        credential_id,
        title,
        certificate_type,
        recipient_name,
        recipient_cedula,
        recipient_company,
        course_id,
        cohort_id,
        course_name,
        course_type,
        modality,
        duration_hours,
        score,
        issue_date,
        expiration_date,
        instructor_name,
        instructor_title,
        director_name,
        verification_url,
        status,
        revocation_reason,
        metadata,
        created_at
      FROM certificates
      WHERE UPPER(credential_id) = UPPER($1)
      LIMIT 1;
    `;

    const result = await pool.query(query, [rawId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        isValid: false,
        error: 'El certificado o credencial no fue encontrado en los registros oficiales de Claro Dominicana.'
      });
    }

    const row = result.rows[0];
    const isRevoked = row.status === 'revoked';

    return res.json({
      isValid: !isRevoked,
      isRevoked,
      status: row.status,
      revocationReason: row.revocation_reason || null,
      certificate: {
        id: row.id,
        credentialId: row.credential_id,
        title: row.title,
        certificateType: row.certificate_type,
        recipientName: row.recipient_name,
        recipientCedulaMasked: maskCedula(row.recipient_cedula),
        recipientCompany: row.recipient_company || 'Claro Dominicana',
        courseId: row.course_id,
        cohortId: row.cohort_id,
        courseName: row.course_name,
        courseType: row.course_type,
        modality: row.modality,
        durationHours: Number(row.duration_hours) || 1,
        score: row.score !== null ? Number(row.score) : null,
        issueDate: row.issue_date,
        expirationDate: row.expiration_date,
        instructorName: row.instructor_name,
        instructorTitle: row.instructor_title,
        directorName: row.director_name,
        verificationUrl: row.verification_url,
        metadata: row.metadata,
        createdAt: row.created_at
      }
    });
  } catch (error: any) {
    console.error('Error al verificar certificado:', error);
    return res.status(500).json({ isValid: false, error: 'Error interno al validar certificado.' });
  }
});

// ==========================================
// 2. ENDPOINTS AUTENTICADOS (PROTEGIDOS POR JWT)
// ==========================================

// GET /api/certificates/my
// Obtiene los certificados del usuario autenticado
certificatesRouter.get('/my', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // Buscamos si existe información de cédula para este usuario
    let cedula = (user as any).cedula || '';
    if (!cedula) {
      const uRes = await pool.query('SELECT cedula FROM users_simulated WHERE id = $1 OR email = $2', [user.id, user.email]);
      if (uRes.rows.length > 0 && uRes.rows[0].cedula) {
        cedula = uRes.rows[0].cedula;
      } else {
        const pRes = await pool.query('SELECT cedula FROM participants WHERE email = $1', [user.email]);
        if (pRes.rows.length > 0 && pRes.rows[0].cedula) {
          cedula = pRes.rows[0].cedula;
        }
      }
    }

    let query = `
      SELECT * FROM certificates 
      WHERE (LOWER(recipient_email) = LOWER($1) ${cedula ? 'OR recipient_cedula = $2' : ''})
      ORDER BY issue_date DESC, created_at DESC;
    `;
    const params = [user.email];
    if (cedula) params.push(cedula);

    const result = await pool.query(query, params);

    const certs = result.rows.map(r => ({
      id: r.id,
      credentialId: r.credential_id,
      title: r.title,
      certificateType: r.certificate_type,
      recipientName: r.recipient_name,
      recipientCedula: r.recipient_cedula,
      recipientEmail: r.recipient_email,
      recipientCompany: r.recipient_company,
      courseId: r.course_id,
      cohortId: r.cohort_id,
      courseName: r.course_name,
      courseType: r.course_type,
      modality: r.modality,
      durationHours: Number(r.duration_hours) || 1,
      score: r.score !== null ? Number(r.score) : null,
      issueDate: r.issue_date,
      expirationDate: r.expiration_date,
      instructorName: r.instructor_name,
      instructorTitle: r.instructor_title,
      directorName: r.director_name,
      verificationUrl: r.verification_url,
      status: r.status,
      revocationReason: r.revocation_reason,
      metadata: r.metadata,
      issuedBy: r.issued_by,
      createdAt: r.created_at
    }));

    return res.json(certs);
  } catch (error: any) {
    console.error('Error al obtener certificados del usuario:', error);
    return res.status(500).json({ error: 'Error interno al consultar certificados.' });
  }
});

// GET /api/certificates
// Listado general de certificados con filtros para administradores y evaluadores
certificatesRouter.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { search, courseId, cohortId, status, companyId, cedula } = req.query;

    let query = 'SELECT * FROM certificates WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (courseId && typeof courseId === 'string') {
      query += ` AND course_id = $${idx++}`;
      params.push(courseId);
    }

    if (cohortId && typeof cohortId === 'string') {
      query += ` AND cohort_id = $${idx++}`;
      params.push(cohortId);
    }

    if (status && typeof status === 'string') {
      query += ` AND status = $${idx++}`;
      params.push(status);
    }

    if (companyId && typeof companyId === 'string' && companyId !== 'all') {
      query += ` AND recipient_company = $${idx++}`;
      params.push(companyId);
    }

    if (cedula && typeof cedula === 'string') {
      query += ` AND recipient_cedula = $${idx++}`;
      params.push(cedula);
    }

    if (search && typeof search === 'string') {
      query += ` AND (
        recipient_name ILIKE $${idx} OR 
        recipient_cedula ILIKE $${idx} OR 
        course_name ILIKE $${idx} OR 
        credential_id ILIKE $${idx}
      )`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ' ORDER BY issue_date DESC, created_at DESC';

    const result = await pool.query(query, params);

    const certificates = result.rows.map(r => ({
      id: r.id,
      credentialId: r.credential_id,
      title: r.title,
      certificateType: r.certificate_type,
      recipientName: r.recipient_name,
      recipientCedula: r.recipient_cedula,
      recipientEmail: r.recipient_email,
      recipientCompany: r.recipient_company,
      courseId: r.course_id,
      cohortId: r.cohort_id,
      courseName: r.course_name,
      courseType: r.course_type,
      modality: r.modality,
      durationHours: Number(r.duration_hours) || 1,
      score: r.score !== null ? Number(r.score) : null,
      issueDate: r.issue_date,
      expirationDate: r.expiration_date,
      instructorName: r.instructor_name,
      instructorTitle: r.instructor_title,
      directorName: r.director_name,
      verificationUrl: r.verification_url,
      status: r.status,
      revocationReason: r.revocation_reason,
      metadata: r.metadata,
      issuedBy: r.issued_by,
      createdAt: r.created_at
    }));

    return res.json(certificates);
  } catch (error: any) {
    console.error('Error al listar certificados:', error);
    return res.status(500).json({ error: 'Error interno al consultar certificados.' });
  }
});

// POST /api/certificates/generate
// Generación masiva o individual de certificados
certificatesRouter.post('/generate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const {
      mode, // 'event' | 'cohort' | 'single'
      eventId,
      cohortId,
      singleCertificate,
      targetCards, // Array opcional de participant cards para filtrar emisión
      certificateTitle,
      instructorName,
      instructorTitle
    } = req.body;

    const host = req.get('host') || 'gaes.kasino21.com';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseOrigin = `${protocol}://${host}`;

    const issuedCertificates: any[] = [];

    // MODO 1: EVENTO REGULAR (Capacitaciones presenciales/virtuales con asistencia o registro)
    if (mode === 'event' && eventId) {
      // 1. Obtener detalles del evento
      const evRes = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
      if (evRes.rows.length === 0) {
        return res.status(404).json({ error: 'Evento no encontrado.' });
      }
      const event = evRes.rows[0];

      // 2. Obtener participantes inscritos o con asistencia confirmada
      let partQuery = `
        SELECT DISTINCT 
          p.card, 
          p.name, 
          p.email, 
          p.cedula, 
          p.company_id,
          COALESCE(c.name, p.company_id, 'Claro Dominicana') as company_name,
          al.is_completed,
          al.confirmed_at
        FROM registrations r
        JOIN event_slots s ON r.slot_id = s.id
        JOIN event_schedules es ON s.schedule_id = es.id
        JOIN participants p ON r.participant_card = p.card
        LEFT JOIN companies c ON p.company_id = c.id
        LEFT JOIN attendance_logs al ON (al.slot_id = s.id AND al.participant_card = p.card)
        WHERE es.event_id = $1
      `;
      const partParams: any[] = [eventId];

      if (Array.isArray(targetCards) && targetCards.length > 0) {
        partQuery += ` AND p.card = ANY($2)`;
        partParams.push(targetCards);
      }

      const attendeesRes = await pool.query(partQuery, partParams);

      for (const att of attendeesRes.rows) {
        // Verificar si ya se le emitió un certificado para este evento
        const existCheck = await pool.query(
          'SELECT id FROM certificates WHERE course_id = $1 AND recipient_cedula = $2 AND status = \'active\'',
          [eventId, att.cedula || att.card]
        );

        if (existCheck.rows.length > 0) {
          continue; // Ya tiene certificado activo para este evento
        }

        const credId = generateCredentialId('CLARO-CERT');
        const verUrl = `${baseOrigin}/?cert=${credId}`;
        const finalTitle = certificateTitle || `Certificado de Participación: ${event.title}`;
        const finalInstructor = instructorName || event.instructor || 'Instructor Certificado Claro';
        const finalInstructorTitle = instructorTitle || 'Facilitador del Programa';

        const insertRes = await pool.query(`
          INSERT INTO certificates (
            credential_id,
            title,
            certificate_type,
            recipient_name,
            recipient_cedula,
            recipient_email,
            recipient_company,
            course_id,
            course_name,
            course_type,
            modality,
            duration_hours,
            instructor_name,
            instructor_title,
            director_name,
            verification_url,
            status,
            issued_by,
            metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'active', $17, $18)
          RETURNING *;
        `, [
          credId,
          finalTitle,
          'completion',
          att.name,
          att.cedula || att.card,
          att.email,
          att.company_name,
          eventId,
          event.title,
          'event',
          event.modality || (event.is_virtual ? 'Virtual' : 'Presencial'),
          Number(event.duration) || 8,
          finalInstructor,
          finalInstructorTitle,
          'Dirección de Gestión Humana y Desarrollo Claro',
          verUrl,
          user.name || user.email,
          JSON.stringify({ eventCategory: event.category, eventId, participantCard: att.card })
        ]);

        issuedCertificates.push(insertRes.rows[0]);
      }
    }

    // MODO 2: COHORTE DE ACADEMIA TÉCNICA
    else if (mode === 'cohort' && cohortId) {
      const cohRes = await pool.query(`
        SELECT 
          c.*, 
          tc.title as course_title, 
          tc.category as course_category,
          tc.modality as course_modality,
          tc.daily_hours,
          tc.duration_days,
          tc.moodle_course_id,
          tc.moodle_course_url
        FROM technical_academy_cohorts c
        JOIN technical_academy_courses tc ON c.course_id = tc.id
        WHERE c.id = $1
      `, [cohortId]);

      if (cohRes.rows.length === 0) {
        return res.status(404).json({ error: 'Cohorte técnica no encontrada.' });
      }
      const cohort = cohRes.rows[0];
      const totalHours = (Number(cohort.daily_hours) || 4) * (Number(cohort.duration_days) || 5);

      let enrollQuery = `
        SELECT 
          e.*, 
          p.name, 
          p.email, 
          p.cedula, 
          COALESCE(comp.name, p.company_id, 'Claro Dominicana') as company_name
        FROM technical_academy_enrollments e
        JOIN participants p ON e.participant_card = p.card
        LEFT JOIN companies comp ON p.company_id = comp.id
        WHERE e.cohort_id = $1
      `;
      const enrollParams: any[] = [cohortId];

      if (Array.isArray(targetCards) && targetCards.length > 0) {
        enrollQuery += ` AND e.participant_card = ANY($2)`;
        enrollParams.push(targetCards);
      }

      const enrollmentsRes = await pool.query(enrollQuery, enrollParams);

      for (const enr of enrollmentsRes.rows) {
        // Verificar si ya tiene certificado
        const existCheck = await pool.query(
          'SELECT id FROM certificates WHERE cohort_id = $1 AND recipient_cedula = $2 AND status = \'active\'',
          [cohortId, enr.cedula || enr.participant_card]
        );

        if (existCheck.rows.length > 0) {
          continue;
        }

        const credId = generateCredentialId('CLARO-TEC');
        const verUrl = `${baseOrigin}/?cert=${credId}`;
        const finalTitle = certificateTitle || `Diploma de Acreditación Técnica: ${cohort.course_title}`;
        const finalInstructor = instructorName || cohort.facilitator_name || 'Instructor Técnico Claro';
        const finalInstructorTitle = instructorTitle || 'Especialista en Formación Técnica de Campo';

        const insertRes = await pool.query(`
          INSERT INTO certificates (
            credential_id,
            title,
            certificate_type,
            recipient_name,
            recipient_cedula,
            recipient_email,
            recipient_company,
            course_id,
            cohort_id,
            course_name,
            course_type,
            modality,
            duration_hours,
            score,
            instructor_name,
            instructor_title,
            director_name,
            verification_url,
            status,
            issued_by,
            metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'active', $19, $20)
          RETURNING *;
        `, [
          credId,
          finalTitle,
          'technical_accreditation',
          enr.name,
          enr.cedula || enr.participant_card,
          enr.email,
          enr.company_name,
          cohort.course_id,
          cohortId,
          cohort.course_title,
          'technical_academy',
          cohort.course_modality || 'Presencial (Taller Técnico)',
          totalHours,
          enr.score !== null ? Number(enr.score) : 100,
          finalInstructor,
          finalInstructorTitle,
          'Dirección de Operaciones y Redes Claro Dominicana',
          verUrl,
          user.name || user.email,
          JSON.stringify({ 
            cohortCode: cohort.code, 
            cohortId, 
            moodleCourseId: cohort.moodle_course_id,
            attendancePercentage: enr.attendance_percentage 
          })
        ]);

        issuedCertificates.push(insertRes.rows[0]);
      }
    }

    // MODO 3: EMISIÓN INDIVIDUAL DIRECTA
    else if (mode === 'single' && singleCertificate) {
      const s = singleCertificate;
      if (!s.recipientName || !s.courseName) {
        return res.status(400).json({ error: 'El nombre del participante y del curso son obligatorios.' });
      }

      const credId = generateCredentialId(s.prefix || 'CLARO-CERT');
      const verUrl = `${baseOrigin}/?cert=${credId}`;

      const insertRes = await pool.query(`
        INSERT INTO certificates (
          credential_id,
          title,
          certificate_type,
          recipient_name,
          recipient_cedula,
          recipient_email,
          recipient_company,
          course_id,
          cohort_id,
          course_name,
          course_type,
          modality,
          duration_hours,
          score,
          instructor_name,
          instructor_title,
          director_name,
          verification_url,
          status,
          issued_by,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'active', $19, $20)
        RETURNING *;
      `, [
        credId,
        s.title || 'Certificado Oficial de Acreditación',
        s.certificateType || 'completion',
        s.recipientName,
        s.recipientCedula || '001-0000000-0',
        s.recipientEmail || '',
        s.recipientCompany || 'Claro Dominicana',
        s.courseId || null,
        s.cohortId || null,
        s.courseName,
        s.courseType || 'event',
        s.modality || 'Presencial',
        Number(s.durationHours) || 8,
        s.score !== undefined && s.score !== null ? Number(s.score) : null,
        s.instructorName || 'Instructor Certificado Claro',
        s.instructorTitle || 'Facilitador del Programa',
        s.directorName || 'Dirección de Gestión Humana y Desarrollo Claro',
        verUrl,
        user.name || user.email,
        JSON.stringify(s.metadata || {})
      ]);

      issuedCertificates.push(insertRes.rows[0]);
    } else {
      return res.status(400).json({ error: 'Modo de generación inválido o parámetros incompletos.' });
    }

    return res.status(201).json({
      success: true,
      message: `Se emitieron ${issuedCertificates.length} certificado(s) exitosamente.`,
      certificates: issuedCertificates
    });
  } catch (error: any) {
    console.error('Error al generar certificados:', error);
    return res.status(500).json({ error: 'Error interno al generar certificados.', details: error.message });
  }
});

// PATCH /api/certificates/:id/revoke
// Revocar un certificado por irregularidades o anulación
certificatesRouter.patch('/:id/revoke', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'Super Administrador') {
      return res.status(403).json({ error: 'Solo el Super Administrador puede revocar certificados.' });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE certificates 
       SET status = 'revoked', revocation_reason = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 OR credential_id = $2
       RETURNING *;`,
      [reason || 'Certificado revocado administrativamente.', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificado no encontrado.' });
    }

    return res.json({ success: true, message: 'Certificado revocado exitosamente.', certificate: result.rows[0] });
  } catch (error: any) {
    console.error('Error al revocar certificado:', error);
    return res.status(500).json({ error: 'Error interno al revocar certificado.' });
  }
});

// DELETE /api/certificates/:id
// Eliminación de registro de certificado
certificatesRouter.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'Super Administrador') {
      return res.status(403).json({ error: 'Solo el Super Administrador puede eliminar certificados.' });
    }

    const { id } = req.params;
    await pool.query('DELETE FROM certificates WHERE id = $1 OR credential_id = $1', [id]);
    return res.json({ success: true, message: 'Certificado eliminado correctamente.' });
  } catch (error: any) {
    console.error('Error al eliminar certificado:', error);
    return res.status(500).json({ error: 'Error interno al eliminar certificado.' });
  }
});
