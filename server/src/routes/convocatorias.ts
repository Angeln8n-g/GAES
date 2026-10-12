import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middlewares/auth.js';
import { NotificationService } from '../services/notificationService.js';

export const convocatoriasRouter = Router();

// Helper de permisos para administradores
function checkAdminPermission(req: Request, res: Response): boolean {
  if (!req.user || (req.user.role !== 'Super Administrador' && req.user.role !== 'Administrador / Editor')) {
    res.status(403).json({
      error: 'Acceso denegado: se requieren permisos de Administrador para realizar esta acción.'
    });
    return false;
  }
  return true;
}

// Helper para encontrar datos del participante a partir del usuario autenticado
async function getParticipantInfo(user: any): Promise<{ card: string; name: string; email: string; cedula: string; companyId: string } | null> {
  if (!user) return null;

  // 1. Buscar en tabla participants por email
  const pRes = await pool.query(
    'SELECT card, name, email, cedula, company_id FROM participants WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [user.email]
  );
  if (pRes.rows.length > 0) {
    const row = pRes.rows[0];
    return {
      card: row.card,
      name: row.name,
      email: row.email,
      cedula: row.cedula || '',
      companyId: row.company_id || 'emp_kasino'
    };
  }

  // 2. Si no existe como participante pero existe en users_simulated
  const uRes = await pool.query(
    'SELECT id, name, email, cedula, company_id FROM users_simulated WHERE id = $1 OR LOWER(email) = LOWER($2) LIMIT 1',
    [user.id, user.email]
  );
  if (uRes.rows.length > 0) {
    const row = uRes.rows[0];
    return {
      card: row.id,
      name: row.name,
      email: row.email,
      cedula: row.cedula || '',
      companyId: row.company_id || 'emp_kasino'
    };
  }

  return {
    card: String(user.id || user.email),
    name: user.name || user.email,
    email: user.email,
    cedula: '',
    companyId: user.companyId || 'emp_kasino'
  };
}

/**
 * Sincroniza una convocatoria con la tabla `events` para que aparezca publicada en el Catálogo de Cursos.
 * Si status === 'open', crea o actualiza el evento y asegura sus horarios/cupos.
 * Si status !== 'open', marca el evento como 'inactive' para retirarlo del catálogo público.
 */
export async function syncConvocatoriaEvent(dbClient: any, convId: string): Promise<string | null> {
  try {
    const convRes = await dbClient.query(`
      SELECT 
        c.*,
        cr.title as course_title,
        cr.code as course_code,
        cr.category as course_category,
        cr.daily_hours as course_daily_hours,
        cr.duration_days as course_duration_days,
        co.start_date as cohort_start_date,
        co.end_date as cohort_end_date,
        co.daily_time as cohort_daily_time,
        co.location as cohort_location,
        co.capacity as cohort_capacity,
        co.facilitator_name as cohort_facilitator_name
      FROM convocatorias c
      LEFT JOIN technical_academy_courses cr ON c.course_id = cr.id
      LEFT JOIN technical_academy_cohorts co ON c.cohort_id = co.id
      WHERE c.id = $1
    `, [convId]);

    if (convRes.rows.length === 0) return null;
    const c = convRes.rows[0];

    const eventId = c.event_id || `evt_conv_${c.id.replace('conv_', '')}`;

    if (c.status === 'open') {
      const title = c.title || c.course_title || 'Convocatoria Oficial de Formación';
      const description = [
        c.description || '',
        c.target_audience ? `\n\n**Público Objetivo:** ${c.target_audience}` : '',
        c.prerequisites ? `\n\n**Requisitos:** ${c.prerequisites}` : '',
        c.selection_mode === 'direct' ? `\n\n*Modalidad: Selección Directa por orden de llegada hasta agotar cupos.*` : `\n\n*Modalidad: Selección Sujeta a Revisión del Comité Académico.*`,
        `\n\n📅 **Período de Postulación:** Del ${c.application_start_date ? new Date(c.application_start_date).toISOString().slice(0, 10) : ''} al ${c.application_end_date ? new Date(c.application_end_date).toISOString().slice(0, 10) : ''}.`
      ].filter(Boolean).join('');

      const instructor = c.cohort_facilitator_name || 'Academia Técnica Claro';
      const imageUrl = c.banner_url || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80';
      const modality = c.modality || 'Presencial';
      const location = c.location || c.cohort_location || 'Laboratorio Técnico Claro';
      const totalHours = (c.course_daily_hours && c.course_duration_days) 
        ? Number(c.course_daily_hours) * Number(c.duration_days) 
        : 40;

      const companyIds = Array.isArray(c.company_ids) && c.company_ids.length > 0 ? c.company_ids : ['all'];
      const companyId = companyIds.length === 1 ? companyIds[0] : 'all';

      const startDate = c.training_start_date ? new Date(c.training_start_date).toISOString().slice(0, 10) : (c.cohort_start_date ? new Date(c.cohort_start_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
      const endDate = c.training_end_date ? new Date(c.training_end_date).toISOString().slice(0, 10) : (c.cohort_end_date ? new Date(c.cohort_end_date).toISOString().slice(0, 10) : startDate);
      const dailyTime = c.cohort_daily_time || '08:00 AM - 12:00 PM';
      const totalQuota = Number(c.total_quota) || 20;

      // 1. Upsert en tabla events
      await dbClient.query(`
        INSERT INTO events (
          id, title, description, category, instructor, image_url, status,
          modality, location, company_id, company_ids, total_hours,
          session_type, training_type, training_format, program_category, subprogram, supplier,
          is_banner_featured, start_date, end_date, start_time
        ) VALUES (
          $1, $2, $3, 'Convocatoria', $4, $5, 'active',
          $6, $7, $8, $9, $10,
          'Sincrónica', 'Técnico', 'Convocatoria', 'Academia Técnica', 'Capacitación Especializada', 'Claro',
          true, $11, $12, $13
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          category = 'Convocatoria',
          instructor = EXCLUDED.instructor,
          image_url = EXCLUDED.image_url,
          status = 'active',
          modality = EXCLUDED.modality,
          location = EXCLUDED.location,
          company_id = EXCLUDED.company_id,
          company_ids = EXCLUDED.company_ids,
          total_hours = EXCLUDED.total_hours,
          training_format = 'Convocatoria',
          training_type = 'Técnico',
          is_banner_featured = true,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          start_time = EXCLUDED.start_time
      `, [
        eventId,
        title,
        description,
        instructor,
        imageUrl,
        modality,
        location,
        companyId,
        companyIds,
        totalHours,
        startDate,
        endDate,
        dailyTime
      ]);

      // 2. Asociar event_id a la convocatoria
      await dbClient.query(`
        UPDATE convocatorias SET event_id = $1 WHERE id = $2
      `, [eventId, convId]);

      // 3. Upsert en event_schedules
      const schRes = await dbClient.query(`
        INSERT INTO event_schedules (event_id, date, end_date)
        VALUES ($1, $2, $3)
        ON CONFLICT (event_id, date) DO UPDATE SET
          end_date = EXCLUDED.end_date
        RETURNING id
      `, [eventId, startDate, endDate]);

      const scheduleId = schRes.rows[0].id;

      // 4. Upsert en event_slots
      await dbClient.query(`
        INSERT INTO event_slots (schedule_id, time, capacity)
        VALUES ($1, $2, $3)
        ON CONFLICT (schedule_id, time) DO UPDATE SET
          capacity = EXCLUDED.capacity
      `, [scheduleId, dailyTime, totalQuota]);

      return eventId;
    } else {
      // Si la convocatoria está cerrada, cancelada o en borrador, desactivar el evento en el catálogo
      if (c.event_id) {
        await dbClient.query(`
          UPDATE events SET status = 'inactive' WHERE id = $1
        `, [c.event_id]);
      }
      return c.event_id || null;
    }
  } catch (err: any) {
    console.error('Error al sincronizar evento de convocatoria:', err);
    return null;
  }
}

// Sincronizar automáticamente convocatorias abiertas existentes al inicio del servidor
(async () => {
  try {
    const openConvs = await pool.query("SELECT id FROM convocatorias WHERE status = 'open'");
    for (const row of openConvs.rows) {
      await syncConvocatoriaEvent(pool, row.id);
    }
  } catch (err) {
    console.warn('Advertencia en sincronización inicial de eventos de convocatorias:', err);
  }
})();

// ==========================================
// 1. LISTADO DE CONVOCATORIAS
// GET /api/convocatorias
// ==========================================
convocatoriasRouter.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, companyId, trainingType, search } = req.query;

    let query = `
      SELECT 
        c.*,
        cr.title as course_title,
        cr.code as course_code,
        cr.category as course_category,
        cr.daily_hours as course_daily_hours,
        cr.duration_days as course_duration_days,
        co.start_date as cohort_start_date,
        co.end_date as cohort_end_date,
        co.daily_time as cohort_daily_time,
        co.location as cohort_location,
        co.capacity as cohort_capacity,
        ev.title as event_title,
        (SELECT COUNT(*)::int FROM convocatoria_applications a WHERE a.convocatoria_id = c.id) as total_applications,
        (SELECT COUNT(*)::int FROM convocatoria_applications a WHERE a.convocatoria_id = c.id AND a.status = 'approved') as approved_applications,
        (SELECT COUNT(*)::int FROM convocatoria_applications a WHERE a.convocatoria_id = c.id AND a.status = 'pending') as pending_applications,
        (SELECT COUNT(*)::int FROM convocatoria_applications a WHERE a.convocatoria_id = c.id AND a.status = 'waitlist') as waitlist_applications
      FROM convocatorias c
      LEFT JOIN technical_academy_courses cr ON c.course_id = cr.id
      LEFT JOIN technical_academy_cohorts co ON c.cohort_id = co.id
      LEFT JOIN events ev ON c.event_id = ev.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let idx = 1;

    if (status && typeof status === 'string' && status !== 'all') {
      query += ` AND c.status = $${idx++}`;
      params.push(status);
    }

    if (trainingType && typeof trainingType === 'string' && trainingType !== 'all') {
      query += ` AND c.training_type = $${idx++}`;
      params.push(trainingType);
    }

    if (companyId && typeof companyId === 'string' && companyId !== 'all') {
      query += ` AND ($${idx} = ANY(c.company_ids) OR c.company_ids = '{}' OR EXISTS (
        SELECT 1 FROM convocatoria_company_quotas cq WHERE cq.convocatoria_id = c.id AND cq.company_id = $${idx}
      ))`;
      params.push(companyId);
      idx++;
    }

    if (search && typeof search === 'string') {
      query += ` AND (c.title ILIKE $${idx} OR c.code ILIKE $${idx} OR c.description ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ' ORDER BY (c.status = \'open\') DESC, c.application_start_date DESC, c.created_at DESC';

    const result = await pool.query(query, params);
    const convIds = result.rows.map(r => r.id);

    // Obtener cupos por empresa para las convocatorias
    let quotasMap: Record<string, any[]> = {};
    if (convIds.length > 0) {
      const qRes = await pool.query(`
        SELECT 
          cq.convocatoria_id,
          cq.company_id,
          cq.allocated_quota,
          comp.name as company_name,
          COALESCE(app_cnt.total_apps, 0)::int as total_applications,
          COALESCE(app_cnt.approved_apps, 0)::int as approved_applications,
          COALESCE(app_cnt.pending_apps, 0)::int as pending_applications
        FROM convocatoria_company_quotas cq
        JOIN companies comp ON cq.company_id = comp.id
        LEFT JOIN (
          SELECT 
            convocatoria_id, 
            company_id, 
            COUNT(*)::int as total_apps,
            COUNT(*) FILTER (WHERE status = 'approved')::int as approved_apps,
            COUNT(*) FILTER (WHERE status = 'pending')::int as pending_apps
          FROM convocatoria_applications
          WHERE convocatoria_id = ANY($1)
          GROUP BY convocatoria_id, company_id
        ) app_cnt ON app_cnt.convocatoria_id = cq.convocatoria_id AND app_cnt.company_id = cq.company_id
        WHERE cq.convocatoria_id = ANY($1)
        ORDER BY comp.name ASC
      `, [convIds]);

      for (const row of qRes.rows) {
        if (!quotasMap[row.convocatoria_id]) quotasMap[row.convocatoria_id] = [];
        quotasMap[row.convocatoria_id].push({
          companyId: row.company_id,
          companyName: row.company_name,
          allocatedQuota: row.allocated_quota,
          totalApplications: row.total_applications,
          approvedApplications: row.approved_applications,
          pendingApplications: row.pending_applications,
          availableQuota: Math.max(0, row.allocated_quota - row.approved_applications)
        });
      }
    }

    // Información del usuario logueado para saber si ya aplicó
    const partInfo = await getParticipantInfo(req.user);
    const userCard = partInfo?.card;

    let userAppsMap: Record<string, any> = {};
    if (userCard && convIds.length > 0) {
      const uaRes = await pool.query(`
        SELECT convocatoria_id, id, status, applicant_type, created_at
        FROM convocatoria_applications
        WHERE participant_card = $1 AND convocatoria_id = ANY($2)
      `, [userCard, convIds]);

      for (const row of uaRes.rows) {
        userAppsMap[row.convocatoria_id] = {
          applicationId: row.id,
          status: row.status,
          applicantType: row.applicant_type,
          appliedAt: row.created_at
        };
      }
    }

    const convocatorias = result.rows.map(r => ({
      id: r.id,
      code: r.code,
      title: r.title,
      description: r.description || '',
      trainingType: r.training_type || 'technical_academy',
      courseId: r.course_id || null,
      courseTitle: r.course_title || null,
      courseCode: r.course_code || null,
      courseCategory: r.course_category || null,
      cohortId: r.cohort_id || null,
      cohortStartDate: r.cohort_start_date ? new Date(r.cohort_start_date).toISOString().slice(0, 10) : null,
      cohortEndDate: r.cohort_end_date ? new Date(r.cohort_end_date).toISOString().slice(0, 10) : null,
      cohortDailyTime: r.cohort_daily_time || null,
      cohortLocation: r.cohort_location || null,
      cohortCapacity: r.cohort_capacity || null,
      eventId: r.event_id || null,
      eventTitle: r.event_title || null,
      bannerUrl: r.banner_url || null,
      status: r.status,
      applicationStartDate: r.application_start_date ? new Date(r.application_start_date).toISOString().slice(0, 10) : '',
      applicationEndDate: r.application_end_date ? new Date(r.application_end_date).toISOString().slice(0, 10) : '',
      trainingStartDate: r.training_start_date ? new Date(r.training_start_date).toISOString().slice(0, 10) : null,
      trainingEndDate: r.training_end_date ? new Date(r.training_end_date).toISOString().slice(0, 10) : null,
      modality: r.modality || 'Presencial (Taller)',
      location: r.location || '',
      totalQuota: r.total_quota,
      selectionMode: r.selection_mode || 'review_required',
      targetAudience: r.target_audience || '',
      prerequisites: r.prerequisites || '',
      allowSelfApplication: Boolean(r.allow_self_application),
      allowSupervisorNomination: Boolean(r.allow_supervisor_nomination),
      companyIds: r.company_ids || [],
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      companyQuotas: quotasMap[r.id] || [],
      stats: {
        totalApplications: r.total_applications,
        approvedApplications: r.approved_applications,
        pendingApplications: r.pending_applications,
        waitlistApplications: r.waitlist_applications,
        occupancyPercentage: r.total_quota > 0 ? Math.round((r.approved_applications / r.total_quota) * 100) : 0
      },
      userApplication: userAppsMap[r.id] || null
    }));

    res.json(convocatorias);
  } catch (err: any) {
    console.error('Error al consultar convocatorias:', err);
    res.status(500).json({ error: 'Error al consultar convocatorias', details: err.message });
  }
});

// ==========================================
// 2. DETALLE DE CONVOCATORIA
// GET /api/convocatorias/:id
// ==========================================
convocatoriasRouter.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        c.*,
        cr.title as course_title,
        cr.code as course_code,
        cr.category as course_category,
        cr.daily_hours as course_daily_hours,
        cr.duration_days as course_duration_days,
        co.start_date as cohort_start_date,
        co.end_date as cohort_end_date,
        co.daily_time as cohort_daily_time,
        co.location as cohort_location,
        co.capacity as cohort_capacity,
        ev.title as event_title
      FROM convocatorias c
      LEFT JOIN technical_academy_courses cr ON c.course_id = cr.id
      LEFT JOIN technical_academy_cohorts co ON c.cohort_id = co.id
      LEFT JOIN events ev ON c.event_id = ev.id
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Convocatoria no encontrada' });
    }

    const r = result.rows[0];

    // Cupos por empresa
    const qRes = await pool.query(`
      SELECT 
        cq.company_id,
        cq.allocated_quota,
        comp.name as company_name,
        COALESCE(app_cnt.total_apps, 0)::int as total_applications,
        COALESCE(app_cnt.approved_apps, 0)::int as approved_applications,
        COALESCE(app_cnt.pending_apps, 0)::int as pending_applications
      FROM convocatoria_company_quotas cq
      JOIN companies comp ON cq.company_id = comp.id
      LEFT JOIN (
        SELECT 
          company_id, 
          COUNT(*)::int as total_apps,
          COUNT(*) FILTER (WHERE status = 'approved')::int as approved_apps,
          COUNT(*) FILTER (WHERE status = 'pending')::int as pending_apps
        FROM convocatoria_applications
        WHERE convocatoria_id = $1
        GROUP BY company_id
      ) app_cnt ON app_cnt.company_id = cq.company_id
      WHERE cq.convocatoria_id = $1
      ORDER BY comp.name ASC
    `, [id]);

    const companyQuotas = qRes.rows.map(q => ({
      companyId: q.company_id,
      companyName: q.company_name,
      allocatedQuota: q.allocated_quota,
      totalApplications: q.total_applications,
      approvedApplications: q.approved_applications,
      pendingApplications: q.pending_applications,
      availableQuota: Math.max(0, q.allocated_quota - q.approved_applications)
    }));

    // Postulaciones (si es SuperAdmin, Admin o Líder)
    const isElevated = req.user && ['Super Administrador', 'Administrador / Editor', 'Líder de Área / Supervisor'].includes(req.user.role);
    let applications: any[] = [];

    if (isElevated) {
      let appQuery = `
        SELECT 
          a.*,
          p.name as participant_name,
          p.email as participant_email,
          p.cedula as participant_cedula,
          p.department as participant_department,
          comp.name as company_name
        FROM convocatoria_applications a
        JOIN participants p ON a.participant_card = p.card
        JOIN companies comp ON a.company_id = comp.id
        WHERE a.convocatoria_id = $1
      `;
      const appParams: any[] = [id];

      // Si es líder de área, filtrar solo por su empresa
      if (req.user && req.user.role === 'Líder de Área / Supervisor' && req.user.companyId) {
        appQuery += ' AND a.company_id = $2';
        appParams.push(req.user.companyId);
      }

      appQuery += ' ORDER BY a.created_at ASC';
      const aRes = await pool.query(appQuery, appParams);
      applications = aRes.rows.map(a => ({
        id: a.id,
        convocatoriaId: a.convocatoria_id,
        participantCard: a.participant_card,
        participantName: a.participant_name,
        participantEmail: a.participant_email,
        participantCedula: a.participant_cedula || '',
        participantDepartment: a.participant_department || '',
        companyId: a.company_id,
        companyName: a.company_name,
        applicantType: a.applicant_type,
        nominatedById: a.nominated_by_id,
        nominatedByName: a.nominated_by_name,
        motivation: a.motivation,
        status: a.status,
        reviewNotes: a.review_notes,
        reviewedBy: a.reviewed_by,
        reviewedAt: a.reviewed_at,
        enrolledInCohort: a.enrolled_in_cohort,
        createdAt: a.created_at
      }));
    }

    // Datos del usuario logueado
    const partInfo = await getParticipantInfo(req.user);
    const userCard = partInfo?.card;
    let userApplication = null;
    if (userCard) {
      const uaRes = await pool.query(
        'SELECT id, status, applicant_type, created_at FROM convocatoria_applications WHERE participant_card = $1 AND convocatoria_id = $2',
        [userCard, id]
      );
      if (uaRes.rows.length > 0) {
        userApplication = {
          applicationId: uaRes.rows[0].id,
          status: uaRes.rows[0].status,
          applicantType: uaRes.rows[0].applicant_type,
          appliedAt: uaRes.rows[0].created_at
        };
      }
    }

    res.json({
      convocatoria: {
        id: r.id,
        code: r.code,
        title: r.title,
        description: r.description || '',
        trainingType: r.training_type || 'technical_academy',
        courseId: r.course_id || null,
        courseTitle: r.course_title || null,
        courseCode: r.course_code || null,
        courseCategory: r.course_category || null,
        cohortId: r.cohort_id || null,
        cohortStartDate: r.cohort_start_date ? new Date(r.cohort_start_date).toISOString().slice(0, 10) : null,
        cohortEndDate: r.cohort_end_date ? new Date(r.cohort_end_date).toISOString().slice(0, 10) : null,
        cohortDailyTime: r.cohort_daily_time || null,
        cohortLocation: r.cohort_location || null,
        cohortCapacity: r.cohort_capacity || null,
        eventId: r.event_id || null,
        eventTitle: r.event_title || null,
        bannerUrl: r.banner_url || null,
        status: r.status,
        applicationStartDate: r.application_start_date ? new Date(r.application_start_date).toISOString().slice(0, 10) : '',
        applicationEndDate: r.application_end_date ? new Date(r.application_end_date).toISOString().slice(0, 10) : '',
        trainingStartDate: r.training_start_date ? new Date(r.training_start_date).toISOString().slice(0, 10) : null,
        trainingEndDate: r.training_end_date ? new Date(r.training_end_date).toISOString().slice(0, 10) : null,
        modality: r.modality || 'Presencial (Taller)',
        location: r.location || '',
        totalQuota: r.total_quota,
        selectionMode: r.selection_mode || 'review_required',
        targetAudience: r.target_audience || '',
        prerequisites: r.prerequisites || '',
        allowSelfApplication: Boolean(r.allow_self_application),
        allowSupervisorNomination: Boolean(r.allow_supervisor_nomination),
        companyIds: r.company_ids || [],
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        companyQuotas
      },
      applications,
      userApplication
    });
  } catch (err: any) {
    console.error('Error al consultar detalle de convocatoria:', err);
    res.status(500).json({ error: 'Error al consultar convocatoria', details: err.message });
  }
});

// ==========================================
// 3. CREAR CONVOCATORIA
// POST /api/convocatorias
// ==========================================
convocatoriasRouter.post('/', authenticateToken, async (req: Request, res: Response) => {
  if (!checkAdminPermission(req, res)) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      id,
      code,
      title,
      description,
      trainingType = 'technical_academy',
      courseId,
      cohortId,
      eventId,
      bannerUrl,
      status = 'draft',
      applicationStartDate,
      applicationEndDate,
      trainingStartDate,
      trainingEndDate,
      modality = 'Presencial (Taller)',
      location,
      totalQuota = 20,
      selectionMode = 'review_required',
      targetAudience,
      prerequisites,
      allowSelfApplication = true,
      allowSupervisorNomination = true,
      companyIds = [],
      companyQuotas = []
    } = req.body;

    if (!title || !title.trim()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El título de la convocatoria es obligatorio.' });
    }

    if (!applicationStartDate || !applicationEndDate) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Las fechas de apertura y cierre de postulaciones son obligatorias.' });
    }

    const convId = id || `conv_${Date.now()}`;
    const cleanCode = code ? code.trim() : `CONV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    await client.query(`
      INSERT INTO convocatorias (
        id, code, title, description, training_type, course_id, cohort_id, event_id, banner_url,
        status, application_start_date, application_end_date, training_start_date, training_end_date,
        modality, location, total_quota, selection_mode, target_audience, prerequisites,
        allow_self_application, allow_supervisor_nomination, company_ids, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      ON CONFLICT (id) DO UPDATE SET
        code = EXCLUDED.code,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        training_type = EXCLUDED.training_type,
        course_id = EXCLUDED.course_id,
        cohort_id = EXCLUDED.cohort_id,
        event_id = EXCLUDED.event_id,
        banner_url = EXCLUDED.banner_url,
        status = EXCLUDED.status,
        application_start_date = EXCLUDED.application_start_date,
        application_end_date = EXCLUDED.application_end_date,
        training_start_date = EXCLUDED.training_start_date,
        training_end_date = EXCLUDED.training_end_date,
        modality = EXCLUDED.modality,
        location = EXCLUDED.location,
        total_quota = EXCLUDED.total_quota,
        selection_mode = EXCLUDED.selection_mode,
        target_audience = EXCLUDED.target_audience,
        prerequisites = EXCLUDED.prerequisites,
        allow_self_application = EXCLUDED.allow_self_application,
        allow_supervisor_nomination = EXCLUDED.allow_supervisor_nomination,
        company_ids = EXCLUDED.company_ids,
        updated_at = CURRENT_TIMESTAMP
    `, [
      convId,
      cleanCode,
      title.trim(),
      description || '',
      trainingType,
      courseId || null,
      cohortId || null,
      eventId || null,
      bannerUrl || null,
      status,
      applicationStartDate,
      applicationEndDate,
      trainingStartDate || null,
      trainingEndDate || null,
      modality,
      location || '',
      Number(totalQuota) || 20,
      selectionMode,
      targetAudience || '',
      prerequisites || '',
      Boolean(allowSelfApplication),
      Boolean(allowSupervisorNomination),
      companyIds,
      req.user?.id || 'usr_admin'
    ]);

    // Asignar cupos por empresa
    if (Array.isArray(companyQuotas) && companyQuotas.length > 0) {
      for (const cq of companyQuotas) {
        if (cq.companyId && typeof cq.allocatedQuota === 'number') {
          await client.query(`
            INSERT INTO convocatoria_company_quotas (convocatoria_id, company_id, allocated_quota)
            VALUES ($1, $2, $3)
            ON CONFLICT (convocatoria_id, company_id) DO UPDATE SET
              allocated_quota = EXCLUDED.allocated_quota
          `, [convId, cq.companyId, Math.max(0, cq.allocatedQuota)]);
        }
      }
    }

    // Si tiene cohorte asociada, sincronizar también los cupos en la cohorte técnica
    if (cohortId && Array.isArray(companyQuotas) && companyQuotas.length > 0) {
      for (const cq of companyQuotas) {
        if (cq.companyId && typeof cq.allocatedQuota === 'number') {
          await client.query(`
            INSERT INTO technical_academy_cohort_quotas (cohort_id, company_id, allocated_quota)
            VALUES ($1, $2, $3)
            ON CONFLICT (cohort_id, company_id) DO UPDATE SET
              allocated_quota = EXCLUDED.allocated_quota,
              updated_at = CURRENT_TIMESTAMP
          `, [cohortId, cq.companyId, Math.max(0, cq.allocatedQuota)]);
        }
      }
    }

    // Sincronizar evento en el catálogo si corresponde
    await syncConvocatoriaEvent(client, convId);

    await client.query('COMMIT');

    if (status === 'open') {
      NotificationService.onConvocatoriaPublished({
        id: convId,
        code: cleanCode,
        title,
        applicationEndDate
      }).catch(err => console.error('Error notificando convocatoria abierta:', err));
    }

    res.status(201).json({
      message: 'Convocatoria creada exitosamente',
      id: convId,
      code: cleanCode
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error al crear convocatoria:', err);
    res.status(500).json({ error: 'Error al registrar convocatoria', details: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// 4. ACTUALIZAR CONVOCATORIA
// PUT /api/convocatorias/:id
// ==========================================
convocatoriasRouter.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  if (!checkAdminPermission(req, res)) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const {
      code,
      title,
      description,
      trainingType = 'technical_academy',
      courseId,
      cohortId,
      eventId,
      bannerUrl,
      status,
      applicationStartDate,
      applicationEndDate,
      trainingStartDate,
      trainingEndDate,
      modality,
      location,
      totalQuota,
      selectionMode,
      targetAudience,
      prerequisites,
      allowSelfApplication,
      allowSupervisorNomination,
      companyIds,
      companyQuotas
    } = req.body;

    const currentRes = await client.query('SELECT * FROM convocatorias WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Convocatoria no encontrada' });
    }

    await client.query(`
      UPDATE convocatorias SET
        code = COALESCE($1, code),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        training_type = COALESCE($4, training_type),
        course_id = $5,
        cohort_id = $6,
        event_id = $7,
        banner_url = $8,
        status = COALESCE($9, status),
        application_start_date = COALESCE($10, application_start_date),
        application_end_date = COALESCE($11, application_end_date),
        training_start_date = $12,
        training_end_date = $13,
        modality = COALESCE($14, modality),
        location = COALESCE($15, location),
        total_quota = COALESCE($16, total_quota),
        selection_mode = COALESCE($17, selection_mode),
        target_audience = COALESCE($18, target_audience),
        prerequisites = COALESCE($19, prerequisites),
        allow_self_application = COALESCE($20, allow_self_application),
        allow_supervisor_nomination = COALESCE($21, allow_supervisor_nomination),
        company_ids = COALESCE($22, company_ids),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $23
    `, [
      code ? code.trim() : null,
      title ? title.trim() : null,
      description !== undefined ? description : null,
      trainingType,
      courseId !== undefined ? courseId : null,
      cohortId !== undefined ? cohortId : null,
      eventId !== undefined ? eventId : null,
      bannerUrl !== undefined ? bannerUrl : null,
      status || null,
      applicationStartDate || null,
      applicationEndDate || null,
      trainingStartDate !== undefined ? trainingStartDate : null,
      trainingEndDate !== undefined ? trainingEndDate : null,
      modality || null,
      location !== undefined ? location : null,
      totalQuota !== undefined ? Number(totalQuota) : null,
      selectionMode || null,
      targetAudience !== undefined ? targetAudience : null,
      prerequisites !== undefined ? prerequisites : null,
      allowSelfApplication !== undefined ? Boolean(allowSelfApplication) : null,
      allowSupervisorNomination !== undefined ? Boolean(allowSupervisorNomination) : null,
      Array.isArray(companyIds) ? companyIds : null,
      id
    ]);

    // Actualizar cupos por empresa
    if (Array.isArray(companyQuotas)) {
      for (const cq of companyQuotas) {
        if (cq.companyId && typeof cq.allocatedQuota === 'number') {
          await client.query(`
            INSERT INTO convocatoria_company_quotas (convocatoria_id, company_id, allocated_quota)
            VALUES ($1, $2, $3)
            ON CONFLICT (convocatoria_id, company_id) DO UPDATE SET
              allocated_quota = EXCLUDED.allocated_quota
          `, [id, cq.companyId, Math.max(0, cq.allocatedQuota)]);
        }
      }

      // Si hay cohorte asociada, sincronizar cupos en la cohorte
      const targetCohort = cohortId || currentRes.rows[0].cohort_id;
      if (targetCohort) {
        for (const cq of companyQuotas) {
          if (cq.companyId && typeof cq.allocatedQuota === 'number') {
            await client.query(`
              INSERT INTO technical_academy_cohort_quotas (cohort_id, company_id, allocated_quota)
              VALUES ($1, $2, $3)
              ON CONFLICT (cohort_id, company_id) DO UPDATE SET
                allocated_quota = EXCLUDED.allocated_quota,
                updated_at = CURRENT_TIMESTAMP
            `, [targetCohort, cq.companyId, Math.max(0, cq.allocatedQuota)]);
          }
        }
      }
    }

    // Sincronizar evento en el catálogo si corresponde
    await syncConvocatoriaEvent(client, id);

    await client.query('COMMIT');
    res.json({ message: 'Convocatoria actualizada exitosamente', id });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar convocatoria:', err);
    res.status(500).json({ error: 'Error al actualizar convocatoria', details: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// 5. CAMBIAR ESTADO DE CONVOCATORIA
// PATCH /api/convocatorias/:id/status
// ==========================================
convocatoriasRouter.patch('/:id/status', authenticateToken, async (req: Request, res: Response) => {
  if (!checkAdminPermission(req, res)) return;
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'open', 'closed', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Estado no válido. Opciones: ${validStatuses.join(', ')}` });
    }

    const upd = await pool.query(
      'UPDATE convocatorias SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, code, title, application_end_date, status',
      [status, id]
    );

    if (upd.rows.length === 0) {
      return res.status(404).json({ error: 'Convocatoria no encontrada' });
    }

    const row = upd.rows[0];

    // Sincronizar evento en el catálogo
    await syncConvocatoriaEvent(pool, id);

    if (status === 'open') {
      NotificationService.onConvocatoriaPublished({
        id: row.id,
        code: row.code,
        title: row.title,
        applicationEndDate: row.application_end_date
      }).catch(err => console.error('Error notificando convocatoria abierta:', err));
    }

    res.json({ message: `Estado actualizado a '${status}' exitosamente.`, status });
  } catch (err: any) {
    console.error('Error al actualizar estado de convocatoria:', err);
    res.status(500).json({ error: 'Error al actualizar estado', details: err.message });
  }
});

// ==========================================
// 6. ELIMINAR CONVOCATORIA
// DELETE /api/convocatorias/:id
// ==========================================
convocatoriasRouter.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  if (!checkAdminPermission(req, res)) return;
  try {
    const { id } = req.params;
    const convInfo = await pool.query('SELECT event_id FROM convocatorias WHERE id = $1', [id]);
    const eventId = convInfo.rows[0]?.event_id;

    const del = await pool.query('DELETE FROM convocatorias WHERE id = $1 RETURNING id', [id]);
    if (del.rows.length === 0) {
      return res.status(404).json({ error: 'Convocatoria no encontrada' });
    }

    if (eventId) {
      await pool.query("UPDATE events SET status = 'inactive' WHERE id = $1", [eventId]);
    }

    res.json({ message: 'Convocatoria eliminada correctamente.' });
  } catch (err: any) {
    console.error('Error al eliminar convocatoria:', err);
    res.status(500).json({ error: 'Error al eliminar convocatoria', details: err.message });
  }
});

// ==========================================
// 7. POSTULARSE A UNA CONVOCATORIA
// POST /api/convocatorias/:id/apply
// ==========================================
convocatoriasRouter.post('/:id/apply', authenticateToken, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { participantCard, motivation } = req.body;

    // Obtener convocatoria
    const convRes = await client.query('SELECT * FROM convocatorias WHERE id = $1', [id]);
    if (convRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Convocatoria no encontrada' });
    }
    const conv = convRes.rows[0];

    // Verificar si la convocatoria está abierta
    if (conv.status !== 'open') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `La convocatoria se encuentra actualmente en estado '${conv.status}' y no está recibiendo postulaciones.` });
    }

    // Resolver participante y empresa
    let targetCard = participantCard;
    let nominatorId: string | null = null;
    let nominatorName: string | null = null;
    let applicantType: 'self' | 'supervisor' = 'self';

    if (targetCard && targetCard !== req.user?.id) {
      // Nominación por supervisor / admin
      applicantType = 'supervisor';
      nominatorId = req.user?.id ? String(req.user.id) : null;
      nominatorName = req.user?.name || null;
    } else {
      // Auto-postulación
      const partInfo = await getParticipantInfo(req.user);
      targetCard = partInfo?.card;
      if (!conv.allow_self_application) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Esta convocatoria no admite auto-postulación directa. Requiere ser nominado por su supervisor.' });
      }
    }

    if (!targetCard) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No se pudo identificar la tarjeta del participante.' });
    }

    // Obtener datos del participante en BD
    const pRes = await client.query('SELECT card, name, email, company_id FROM participants WHERE card = $1', [targetCard]);
    if (pRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `El participante con tarjeta ${targetCard} no fue encontrado en el padrón.` });
    }
    const participant = pRes.rows[0];
    const companyId = participant.company_id || 'emp_kasino';

    // Verificar si la empresa está invitada
    if (conv.company_ids && conv.company_ids.length > 0 && !conv.company_ids.includes(companyId)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Tu empresa no está incluida entre las organizaciones destinatarias de esta convocatoria.' });
    }

    // Verificar si ya tiene postulación previa
    const existApp = await client.query('SELECT id, status FROM convocatoria_applications WHERE convocatoria_id = $1 AND participant_card = $2', [id, targetCard]);
    if (existApp.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `El participante ya cuenta con una postulación registrada en esta convocatoria (Estado: ${existApp.rows[0].status}).` });
    }

    // Verificar cupos disponibles para la empresa
    const quotaRes = await client.query(
      'SELECT allocated_quota FROM convocatoria_company_quotas WHERE convocatoria_id = $1 AND company_id = $2',
      [id, companyId]
    );

    let initialStatus: 'pending' | 'approved' | 'waitlist' = 'pending';
    let willAutoEnroll = false;

    if (quotaRes.rows.length > 0) {
      const allocated = quotaRes.rows[0].allocated_quota;
      const countRes = await client.query(
        "SELECT COUNT(*)::int as approved_cnt FROM convocatoria_applications WHERE convocatoria_id = $1 AND company_id = $2 AND status = 'approved'",
        [id, companyId]
      );
      const approvedCount = countRes.rows[0].approved_cnt;

      if (approvedCount >= allocated) {
        // Cupo lleno para su empresa -> Lista de espera
        initialStatus = 'waitlist';
      } else if (conv.selection_mode === 'direct') {
        // Aprobación directa automática si hay cupo
        initialStatus = 'approved';
        willAutoEnroll = Boolean(conv.cohort_id);
      }
    } else if (conv.selection_mode === 'direct') {
      // Sin cuota específica por empresa, verificación contra cupo total
      const totalApprovedRes = await client.query(
        "SELECT COUNT(*)::int as total_app FROM convocatoria_applications WHERE convocatoria_id = $1 AND status = 'approved'",
        [id]
      );
      if (totalApprovedRes.rows[0].total_app < conv.total_quota) {
        initialStatus = 'approved';
        willAutoEnroll = Boolean(conv.cohort_id);
      } else {
        initialStatus = 'waitlist';
      }
    }

    // Insertar postulación
    const insApp = await client.query(`
      INSERT INTO convocatoria_applications (
        convocatoria_id, participant_card, company_id, applicant_type, nominated_by_id, nominated_by_name,
        motivation, status, enrolled_in_cohort
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, status
    `, [
      id,
      targetCard,
      companyId,
      applicantType,
      nominatorId,
      nominatorName,
      motivation || '',
      initialStatus,
      willAutoEnroll
    ]);

    // Si auto-enrola a la cohorte
    if (willAutoEnroll && conv.cohort_id) {
      await client.query(`
        INSERT INTO technical_academy_enrollments (cohort_id, participant_card, status)
        VALUES ($1, $2, 'enrolled')
        ON CONFLICT (cohort_id, participant_card) DO NOTHING
      `, [conv.cohort_id, targetCard]);
    }

    await client.query('COMMIT');

    NotificationService.onConvocatoriaApplicationSubmitted(
      {
        id: insApp.rows[0].id,
        participantName: participant.name,
        participantEmail: participant.email,
        status: initialStatus
      },
      conv
    ).catch(err => console.error('Error notificando postulación recibida:', err));

    let responseMsg = 'Postulación enviada exitosamente.';
    if (initialStatus === 'approved') {
      responseMsg = '¡Postulación aprobada automáticamente! Has quedado inscrito en el curso.';
    } else if (initialStatus === 'waitlist') {
      responseMsg = 'El cupo regular para tu empresa está completo. Has sido ingresado a la Lista de Espera.';
    }

    res.status(201).json({
      message: responseMsg,
      applicationId: insApp.rows[0].id,
      status: initialStatus
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error al procesar postulación a convocatoria:', err);
    res.status(500).json({ error: 'Error al enviar postulación', details: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// 8. NOMINACIÓN MASIVA DE COLABORADORES (SUPERVISOR / ADMIN)
// POST /api/convocatorias/:id/bulk-nominate
// ==========================================
convocatoriasRouter.post('/:id/bulk-nominate', authenticateToken, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { participantCards, motivation } = req.body;

    if (!Array.isArray(participantCards) || participantCards.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Debe especificar al menos una tarjeta de participante para nominar.' });
    }

    const convRes = await client.query('SELECT * FROM convocatorias WHERE id = $1', [id]);
    if (convRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Convocatoria no encontrada' });
    }
    const conv = convRes.rows[0];

    if (conv.status !== 'open') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `La convocatoria está en estado '${conv.status}' y no admite nominaciones.` });
    }

    let nominatedCount = 0;
    const results: any[] = [];

    for (const card of participantCards) {
      const cleanCard = String(card).trim();
      const pRes = await client.query('SELECT card, company_id FROM participants WHERE card = $1', [cleanCard]);
      if (pRes.rows.length === 0) continue;

      const companyId = pRes.rows[0].company_id || 'emp_kasino';

      const exist = await client.query('SELECT id FROM convocatoria_applications WHERE convocatoria_id = $1 AND participant_card = $2', [id, cleanCard]);
      if (exist.rows.length > 0) continue;

      const ins = await client.query(`
        INSERT INTO convocatoria_applications (
          convocatoria_id, participant_card, company_id, applicant_type, nominated_by_id, nominated_by_name,
          motivation, status
        ) VALUES ($1, $2, $3, 'supervisor', $4, $5, $6, 'pending')
        RETURNING id
      `, [id, cleanCard, companyId, req.user?.id || null, req.user?.name || null, motivation || '']);

      if (ins.rows.length > 0) {
        nominatedCount++;
        results.push({ card: cleanCard, status: 'pending' });
      }
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: `${nominatedCount} colaborador(es) nominado(s) exitosamente.`,
      nominatedCount,
      results
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error en nominación masiva:', err);
    res.status(500).json({ error: 'Error al nominar colaboradores', details: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// 9. REVISAR / APROBAR / RECHAZAR POSTULACIÓN
// PATCH /api/convocatorias/:id/applications/:appId
// ==========================================
convocatoriasRouter.patch('/:id/applications/:appId', authenticateToken, async (req: Request, res: Response) => {
  if (!checkAdminPermission(req, res)) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id, appId } = req.params;
    const { status, reviewNotes, bypassQuota = false } = req.body;

    const validStatuses = ['approved', 'rejected', 'waitlist', 'pending', 'cancelled'];
    if (!validStatuses.includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Estado no válido. Opciones: ${validStatuses.join(', ')}` });
    }

    // Obtener convocatoria y postulación
    const convRes = await client.query('SELECT * FROM convocatorias WHERE id = $1', [id]);
    if (convRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Convocatoria no encontrada' });
    }
    const conv = convRes.rows[0];

    const appRes = await client.query('SELECT * FROM convocatoria_applications WHERE id = $1 AND convocatoria_id = $2', [appId, id]);
    if (appRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Postulación no encontrada' });
    }
    const app = appRes.rows[0];

    let willEnroll = false;

    // Si se aprueba, verificar cupo de la empresa (a menos que el SuperAdmin use bypassQuota)
    if (status === 'approved') {
      if (!bypassQuota) {
        const qRes = await client.query(
          'SELECT allocated_quota FROM convocatoria_company_quotas WHERE convocatoria_id = $1 AND company_id = $2',
          [id, app.company_id]
        );

        if (qRes.rows.length > 0) {
          const allocated = qRes.rows[0].allocated_quota;
          const countRes = await client.query(
            "SELECT COUNT(*)::int as approved_cnt FROM convocatoria_applications WHERE convocatoria_id = $1 AND company_id = $2 AND status = 'approved' AND id != $3",
            [id, app.company_id, appId]
          );
          const currentApproved = countRes.rows[0].approved_cnt;

          if (currentApproved >= allocated) {
            await client.query('ROLLBACK');
            return res.status(400).json({
              error: `El cupo asignado para esta empresa (${allocated}) ya está completo (${currentApproved}/${allocated}). Puede ampliar la cuota de la empresa o forzar la aprobación con sobrecupo.`
            });
          }
        }
      }

      // Si hay cohorte asociada y aún no estaba matriculado
      if (conv.cohort_id) {
        await client.query(`
          INSERT INTO technical_academy_enrollments (cohort_id, participant_card, status)
          VALUES ($1, $2, 'enrolled')
          ON CONFLICT (cohort_id, participant_card) DO NOTHING
        `, [conv.cohort_id, app.participant_card]);
        willEnroll = true;
      }
    } else if (status === 'rejected' || status === 'cancelled') {
      // Si se rechaza o cancela y estaba en cohorte, desmatricular
      if (conv.cohort_id && app.enrolled_in_cohort) {
        await client.query('DELETE FROM technical_academy_enrollments WHERE cohort_id = $1 AND participant_card = $2', [conv.cohort_id, app.participant_card]);
        willEnroll = false;
      }
    }

    await client.query(`
      UPDATE convocatoria_applications SET
        status = $1,
        review_notes = COALESCE($2, review_notes),
        reviewed_by = $3,
        reviewed_at = CURRENT_TIMESTAMP,
        enrolled_in_cohort = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [status, reviewNotes || null, req.user?.id || 'usr_admin', willEnroll, appId]);

    await client.query('COMMIT');

    // Notificar al colaborador sobre el dictamen de su postulación
    try {
      const pEmailRes = await pool.query('SELECT name, email FROM participants WHERE card = $1', [app.participant_card]);
      const pData = pEmailRes.rows[0];
      if (pData?.email) {
        NotificationService.onConvocatoriaApplicationReviewed(
          { ...app, participantEmail: pData.email, participantName: pData.name },
          conv,
          status,
          reviewNotes
        ).catch(err => console.error('Error notificando dictamen de postulación:', err));
      }
    } catch (notifErr) {
      console.warn('Aviso notificando revisión de postulación:', notifErr);
    }

    res.json({
      message: `Postulación actualizada a '${status}' exitosamente.`,
      status,
      enrolledInCohort: willEnroll
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error al revisar postulación:', err);
    res.status(500).json({ error: 'Error al procesar revisión', details: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// 10. MIS POSTULACIONES (COLABORADOR / SUPERVISOR)
// GET /api/convocatorias/user/my-applications
// ==========================================
convocatoriasRouter.get('/user/my-applications', authenticateToken, async (req: Request, res: Response) => {
  try {
    const partInfo = await getParticipantInfo(req.user);
    const userCard = partInfo?.card;

    if (!userCard) {
      return res.json([]);
    }

    const result = await pool.query(`
      SELECT 
        a.*,
        c.code as convocatoria_code,
        c.title as convocatoria_title,
        c.status as convocatoria_status,
        c.modality as convocatoria_modality,
        c.location as convocatoria_location,
        c.application_start_date,
        c.application_end_date,
        c.training_start_date,
        c.training_end_date,
        cr.title as course_title,
        cr.category as course_category,
        comp.name as company_name
      FROM convocatoria_applications a
      JOIN convocatorias c ON a.convocatoria_id = c.id
      JOIN companies comp ON a.company_id = comp.id
      LEFT JOIN technical_academy_courses cr ON c.course_id = cr.id
      WHERE a.participant_card = $1 OR a.nominated_by_id = $1
      ORDER BY a.created_at DESC
    `, [userCard]);

    const apps = result.rows.map(r => ({
      id: r.id,
      convocatoriaId: r.convocatoria_id,
      convocatoriaCode: r.convocatoria_code,
      convocatoriaTitle: r.convocatoria_title,
      convocatoriaStatus: r.convocatoria_status,
      convocatoriaModality: r.convocatoria_modality,
      convocatoriaLocation: r.convocatoria_location,
      applicationStartDate: r.application_start_date ? new Date(r.application_start_date).toISOString().slice(0, 10) : '',
      applicationEndDate: r.application_end_date ? new Date(r.application_end_date).toISOString().slice(0, 10) : '',
      trainingStartDate: r.training_start_date ? new Date(r.training_start_date).toISOString().slice(0, 10) : null,
      trainingEndDate: r.training_end_date ? new Date(r.training_end_date).toISOString().slice(0, 10) : null,
      courseTitle: r.course_title || null,
      courseCategory: r.course_category || null,
      companyId: r.company_id,
      companyName: r.company_name,
      applicantType: r.applicant_type,
      nominatedByName: r.nominated_by_name,
      motivation: r.motivation,
      status: r.status,
      reviewNotes: r.review_notes,
      enrolledInCohort: r.enrolled_in_cohort,
      createdAt: r.created_at
    }));

    res.json(apps);
  } catch (err: any) {
    console.error('Error al consultar mis postulaciones:', err);
    res.status(500).json({ error: 'Error al consultar postulaciones', details: err.message });
  }
});
