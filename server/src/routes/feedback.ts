import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middlewares/auth.js';

export const feedbackRouter = Router();

// ==========================================
// 1. REGISTRAR EVALUACIÓN KIRKPATRICK N1 & NPS
// POST /api/feedback
// ==========================================
feedbackRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      eventId, 
      cohortId,
      trainingType = 'event',
      userEmail, 
      userName, 
      rating, 
      npsScore,
      applicabilityScore,
      strengthsComment,
      improvementsComment,
      comment,
      courseRatings,
      facilitatorRatings,
      courseScore,
      facilitatorScore
    } = req.body;

    if ((!eventId && !cohortId) || !userEmail) {
      return res.status(400).json({ error: 'Se requiere eventId o cohortId, y el correo del usuario.' });
    }

    const normalizedEmail = userEmail.trim().toLowerCase();

    // Calcular rating general (1-5)
    let intRating = rating ? Math.round(Number(rating)) : null;
    if (!intRating || intRating < 1 || intRating > 5) {
      if (courseScore && facilitatorScore) {
        intRating = Math.round((Number(courseScore) + Number(facilitatorScore)) / 2);
      } else if (courseScore) {
        intRating = Math.round(Number(courseScore));
      } else if (facilitatorScore) {
        intRating = Math.round(Number(facilitatorScore));
      } else {
        intRating = 5;
      }
    }
    intRating = Math.max(1, Math.min(5, intRating));

    // Validar NPS Score (0-10) si viene definido
    let safeNpsScore: number | null = null;
    if (npsScore !== undefined && npsScore !== null && !isNaN(Number(npsScore))) {
      safeNpsScore = Math.max(0, Math.min(10, Math.round(Number(npsScore))));
    }

    // 1. Comprobar si ya existe evaluación previa (1 sola respuesta por colaborador)
    if (eventId) {
      const existing = await pool.query(
        `SELECT id FROM event_feedbacks WHERE event_id = $1 AND LOWER(user_email) = $2 LIMIT 1`,
        [eventId, normalizedEmail]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          error: 'Ya has completado la encuesta de satisfacción para esta capacitación. Solo se permite 1 respuesta por colaborador.',
          alreadySubmitted: true
        });
      }
    } else if (cohortId) {
      const existing = await pool.query(
        `SELECT id FROM event_feedbacks WHERE cohort_id = $1 AND LOWER(user_email) = $2 LIMIT 1`,
        [cohortId, normalizedEmail]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          error: 'Ya has completado la encuesta de satisfacción para este taller de academia técnica.',
          alreadySubmitted: true
        });
      }
    }

    // 2. Comprobar asistencia o matriculación
    if (eventId) {
      const attendanceCheck = await pool.query(
        `SELECT a.id, a.check_in_at, a.check_out_at, a.is_completed
         FROM attendance_logs a
         JOIN event_slots sl ON a.slot_id = sl.id
         JOIN event_schedules sch ON sl.schedule_id = sch.id
         JOIN participants p ON a.participant_card = p.card
         WHERE sch.event_id = $1 AND LOWER(p.email) = $2
         LIMIT 1`,
        [eventId, normalizedEmail]
      );

      // Si no hay logs de asistencia, comprobar si está registrado directamente
      if (attendanceCheck.rows.length === 0) {
        const regCheck = await pool.query(
          `SELECT id FROM registrations WHERE event_id = $1 AND LOWER(participant_email) = $2 LIMIT 1`,
          [eventId, normalizedEmail]
        );
        if (regCheck.rows.length === 0) {
          return res.status(403).json({
            error: 'Solo los participantes matriculados en esta capacitación pueden responder la encuesta.',
            requiresAttendance: true
          });
        }
      }
    } else if (cohortId) {
      const cohortEnrollCheck = await pool.query(
        `SELECT id FROM technical_academy_enrollments 
         WHERE cohort_id = $1 AND LOWER(participant_email) = $2 LIMIT 1`,
        [cohortId, normalizedEmail]
      );
      if (cohortEnrollCheck.rows.length === 0) {
        return res.status(403).json({
          error: 'Solo los alumnos matriculados en este taller técnico pueden completar la evaluación.',
          requiresAttendance: true
        });
      }
    }

    // 3. Insertar feedback con todas las métricas Kirkpatrick
    const insertRes = await pool.query(
      `INSERT INTO event_feedbacks (
        event_id, 
        cohort_id, 
        training_type, 
        user_email, 
        user_name, 
        rating, 
        nps_score, 
        applicability_score, 
        strengths_comment, 
        improvements_comment, 
        comment, 
        course_ratings, 
        facilitator_ratings, 
        course_score, 
        facilitator_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, created_at`,
      [
        eventId || null,
        cohortId || null,
        trainingType,
        normalizedEmail,
        userName || null,
        intRating,
        safeNpsScore,
        applicabilityScore !== undefined && applicabilityScore !== null ? Number(applicabilityScore) : null,
        strengthsComment || null,
        improvementsComment || null,
        comment || null,
        JSON.stringify(courseRatings || {}),
        JSON.stringify(facilitatorRatings || {}),
        courseScore !== undefined && courseScore !== null ? Number(courseScore) : null,
        facilitatorScore !== undefined && facilitatorScore !== null ? Number(facilitatorScore) : null
      ]
    );

    res.json({
      success: true,
      unlocked: true,
      message: '¡Encuesta de satisfacción Kirkpatrick N1 registrada exitosamente! Tu diploma oficial ha sido desbloqueado.',
      feedbackId: insertRes.rows[0].id
    });
  } catch (err: any) {
    console.error('Error al guardar feedback Kirkpatrick:', err);
    res.status(500).json({ error: 'Error al registrar evaluación', details: err.message });
  }
});

// ==========================================
// 2. CONSULTAR ESTADO DE EVALUACIÓN DE UN CURSO/COHORTE
// GET /api/feedback/status
// ==========================================
feedbackRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const { eventId, cohortId, email } = req.query;

    if ((!eventId && !cohortId) || !email) {
      return res.status(400).json({ error: 'Se requiere eventId o cohortId, y el correo del usuario.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    let query = '';
    let params: any[] = [];

    if (eventId) {
      query = `SELECT * FROM event_feedbacks WHERE event_id = $1 AND LOWER(user_email) = $2 LIMIT 1`;
      params = [String(eventId), normalizedEmail];
    } else {
      query = `SELECT * FROM event_feedbacks WHERE cohort_id = $1 AND LOWER(user_email) = $2 LIMIT 1`;
      params = [String(cohortId), normalizedEmail];
    }

    const result = await pool.query(query, params);

    if (result.rows.length > 0) {
      res.json({
        hasSubmitted: true,
        feedback: result.rows[0]
      });
    } else {
      res.json({
        hasSubmitted: false,
        feedback: null
      });
    }
  } catch (err: any) {
    console.error('Error al consultar estado de feedback:', err);
    res.status(500).json({ error: 'Error al verificar evaluación', details: err.message });
  }
});

// ==========================================
// 3. ANALÍTICA EJECUTIVA DE KIRKPATRICK & NPS (DASHBOARD)
// GET /api/feedback/stats
// ==========================================
feedbackRouter.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    // 1. Resumen general de métricas Kirkpatrick
    const summaryQuery = `
      SELECT 
        COUNT(*)::int as total_evaluations,
        COUNT(CASE WHEN nps_score >= 9 THEN 1 END)::int as promoters_count,
        COUNT(CASE WHEN nps_score >= 7 AND nps_score <= 8 THEN 1 END)::int as passives_count,
        COUNT(CASE WHEN nps_score IS NOT NULL AND nps_score <= 6 THEN 1 END)::int as detractors_count,
        COUNT(CASE WHEN nps_score IS NOT NULL THEN 1 END)::int as total_nps_responses,
        ROUND(AVG(COALESCE(course_score, rating)), 2) as avg_course_score,
        ROUND(AVG(COALESCE(facilitator_score, rating)), 2) as avg_facilitator_score,
        ROUND(AVG(applicability_score), 2) as avg_applicability_score,
        ROUND(AVG(rating), 2) as avg_global_rating
      FROM event_feedbacks;
    `;

    const summaryRes = await pool.query(summaryQuery);
    const summary = summaryRes.rows[0] || {};

    const totalNps = summary.total_nps_responses || 0;
    const promoters = summary.promoters_count || 0;
    const passives = summary.passives_count || 0;
    const detractors = summary.detractors_count || 0;

    let npsIndex = 0;
    let promotersPercentage = 0;
    let passivesPercentage = 0;
    let detractorsPercentage = 0;

    if (totalNps > 0) {
      promotersPercentage = Math.round((promoters / totalNps) * 100);
      passivesPercentage = Math.round((passives / totalNps) * 100);
      detractorsPercentage = Math.round((detractors / totalNps) * 100);
      npsIndex = Math.round(((promoters - detractors) / totalNps) * 100);
    }

    // 2. Ranking de facilitadores mejor valorados
    const facilitatorsQuery = `
      SELECT 
        COALESCE(e.instructor, c.facilitator_name, 'Instructor GAES') as facilitator_name,
        ROUND(AVG(COALESCE(ef.facilitator_score, ef.rating)), 2) as average_score,
        COUNT(ef.id)::int as evaluation_count
      FROM event_feedbacks ef
      LEFT JOIN events e ON ef.event_id = e.id
      LEFT JOIN technical_academy_cohorts c ON ef.cohort_id = c.id
      GROUP BY COALESCE(e.instructor, c.facilitator_name, 'Instructor GAES')
      HAVING COUNT(ef.id) >= 1
      ORDER BY average_score DESC, evaluation_count DESC
      LIMIT 8;
    `;
    const facilitatorsRes = await pool.query(facilitatorsQuery);

    // 3. Comentarios cualitativos recientes
    const recentFeedbackQuery = `
      SELECT 
        ef.id,
        ef.user_name,
        ef.user_email,
        ef.nps_score,
        ef.rating,
        ef.strengths_comment,
        ef.improvements_comment,
        ef.comment,
        ef.created_at,
        COALESCE(e.title, tc.title, 'Capacitación GAES') as training_title
      FROM event_feedbacks ef
      LEFT JOIN events e ON ef.event_id = e.id
      LEFT JOIN technical_academy_cohorts c ON ef.cohort_id = c.id
      LEFT JOIN technical_academy_courses tc ON c.course_id = tc.id
      WHERE (ef.comment IS NOT NULL AND ef.comment != '')
         OR (ef.strengths_comment IS NOT NULL AND ef.strengths_comment != '')
         OR (ef.improvements_comment IS NOT NULL AND ef.improvements_comment != '')
      ORDER BY ef.created_at DESC
      LIMIT 12;
    `;
    const recentFeedbackRes = await pool.query(recentFeedbackQuery);

    res.json({
      totalEvaluations: summary.total_evaluations || 0,
      totalNpsResponses: totalNps,
      npsIndex,
      promotersCount: promoters,
      passivesCount: passives,
      detractorsCount: detractors,
      promotersPercentage,
      passivesPercentage,
      detractorsPercentage,
      averageCourseScore: Number(summary.avg_course_score) || 5.0,
      averageFacilitatorScore: Number(summary.avg_facilitator_score) || 5.0,
      averageApplicabilityScore: Number(summary.avg_applicability_score) || 5.0,
      averageGlobalRating: Number(summary.avg_global_rating) || 5.0,
      topFacilitators: facilitatorsRes.rows.map(r => ({
        name: r.facilitator_name,
        averageScore: Number(r.average_score) || 5.0,
        count: r.evaluation_count
      })),
      recentFeedback: recentFeedbackRes.rows.map(r => ({
        id: r.id,
        userName: r.user_name || 'Colaborador Anónimo',
        userEmail: r.user_email,
        trainingTitle: r.training_title,
        nps: r.nps_score,
        rating: r.rating,
        strengths: r.strengths_comment,
        improvements: r.improvements_comment,
        comment: r.comment,
        createdAt: r.created_at
      }))
    });
  } catch (err: any) {
    console.error('Error al generar analítica Kirkpatrick:', err);
    res.status(500).json({ error: 'Error al obtener analítica Kirkpatrick', details: err.message });
  }
});
