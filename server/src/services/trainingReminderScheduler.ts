import { pool } from '../db.js';
import { NotificationService } from './notificationService.js';
import { WebPushService } from './webPushService.js';

export class TrainingReminderScheduler {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Inicia el planificador periódico en segundo plano (cada 60 segundos)
   */
  public static start() {
    if (this.timer) return;

    console.log('⏰ [TrainingReminderScheduler] Planificador de alertas de entrenamiento iniciado (muestreo cada 60s)');
    
    // Ejecutar chequeo inicial
    this.checkUpcomingSessions().catch(err => console.error('Error en chequeo inicial de sesiones:', err));

    // Intervalo recurrente cada 60 segundos
    this.timer = setInterval(() => {
      this.checkUpcomingSessions().catch(err => console.error('Error en ciclo de chequeo de sesiones:', err));
    }, 60 * 1000);
  }

  /**
   * Detiene el planificador si el servidor se apaga
   */
  public static stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Parsea un string de horario (ej. "09:00 - 11:00", "08:30 AM - 12:00 PM", "14:00")
   * y retorna las horas y minutos de inicio en formato 24h.
   */
  public static parseStartTime(timeStr: string): { hours: number; minutes: number } | null {
    if (!timeStr) return null;

    try {
      const clean = timeStr.trim();
      const firstPart = clean.split('-')[0].trim(); // "09:00" o "08:30 AM"

      const isPM = /pm/i.test(firstPart);
      const isAM = /am/i.test(firstPart);

      const numPart = firstPart.replace(/am|pm/gi, '').trim();
      const parts = numPart.split(':');
      if (parts.length === 0) return null;

      let hours = parseInt(parts[0], 10);
      let minutes = parts.length > 1 ? parseInt(parts[1], 10) : 0;

      if (isNaN(hours)) return null;
      if (isNaN(minutes)) minutes = 0;

      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;

      return { hours, minutes };
    } catch {
      return null;
    }
  }

  /**
   * Ciclo principal de inspección de sesiones
   */
  public static async checkUpcomingSessions() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const now = new Date();

      // ==========================================
      // 1. CHEQUEO DE CAPACITACIONES GENERALES (EVENTS)
      // ==========================================
      const eventSlotsRes = await pool.query(`
        SELECT 
          es.date,
          es.event_id,
          e.title as event_title,
          e.modality,
          e.location,
          e.meeting_url,
          e.instructor,
          sl.id as slot_id,
          sl.time as slot_time,
          p.email as participant_email,
          p.name as participant_name
        FROM event_schedules es
        JOIN events e ON e.id = es.event_id AND e.status = 'active'
        JOIN event_slots sl ON sl.schedule_id = es.id
        JOIN registrations r ON r.slot_id = sl.id
        JOIN participants p ON p.card = r.participant_card
        WHERE es.date = CURRENT_DATE
      `);

      for (const row of eventSlotsRes.rows) {
        const timeParsed = this.parseStartTime(row.slot_time);
        if (!timeParsed) continue;

        const sessionStart = new Date(now);
        sessionStart.setHours(timeParsed.hours, timeParsed.minutes, 0, 0);

        const diffMinutes = (sessionStart.getTime() - now.getTime()) / (1000 * 60);

        // Ventana 1: Faltan entre 10 y 16 minutos (Aviso preventivo de 15m)
        if (diffMinutes >= 10 && diffMinutes <= 16) {
          await this.dispatchReminder({
            sessionType: 'event_slot',
            sessionId: `slot_${row.slot_id}`,
            slotId: row.slot_id,
            participantEmail: row.participant_email,
            dispatchWindow: '15m_before',
            title: `⏰ Recordatorio: ${row.event_title} comienza en 15 minutos`,
            body: `Tu sesión con ${row.instructor} inicia en breve (${row.slot_time}). Modalidad: ${row.modality || 'Presencial'}.`,
            meetingUrl: row.meeting_url,
            actionUrl: 'my-registrations',
            eventId: row.event_id
          });
        }

        // Ventana 2: Entre -4 min y +2 min (Comienza en este momento)
        if (diffMinutes >= -4 && diffMinutes <= 2) {
          await this.dispatchReminder({
            sessionType: 'event_slot',
            sessionId: `slot_${row.slot_id}`,
            slotId: row.slot_id,
            participantEmail: row.participant_email,
            dispatchWindow: 'starting_now',
            title: `🚀 ¡Tu capacitación comienza ahora!`,
            body: `La sesión de "${row.event_title}" está iniciando (${row.slot_time}). Haz clic para ingresar.`,
            meetingUrl: row.meeting_url,
            actionUrl: 'my-registrations',
            eventId: row.event_id
          });
        }
      }

      // ==========================================
      // 2. CHEQUEO DE ACADEMIA TÉCNICA (COHORTES)
      // ==========================================
      const cohortsRes = await pool.query(`
        SELECT 
          tac.id as cohort_id,
          tac.daily_time,
          tac.location,
          tac.moodle_course_url,
          tac.facilitator_name,
          c.title as course_name,
          p.email as participant_email,
          p.name as participant_name
        FROM technical_academy_cohorts tac
        JOIN technical_academy_courses c ON c.id = tac.course_id
        JOIN technical_academy_enrollments enr ON enr.cohort_id = tac.id
        JOIN participants p ON p.card = enr.participant_card
        WHERE CURRENT_DATE >= tac.start_date AND CURRENT_DATE <= tac.end_date
          AND tac.status IN ('scheduled', 'in_progress')
      `);

      for (const row of cohortsRes.rows) {
        const timeParsed = this.parseStartTime(row.daily_time || '08:00 AM');
        if (!timeParsed) continue;

        const sessionStart = new Date(now);
        sessionStart.setHours(timeParsed.hours, timeParsed.minutes, 0, 0);

        const diffMinutes = (sessionStart.getTime() - now.getTime()) / (1000 * 60);

        // Ventana 1: 15m antes
        if (diffMinutes >= 10 && diffMinutes <= 16) {
          await this.dispatchReminder({
            sessionType: 'cohort_session',
            sessionId: `cohort_${row.cohort_id}`,
            participantEmail: row.participant_email,
            dispatchWindow: '15m_before',
            title: `⏰ Recordatorio Técnico: ${row.course_name}`,
            body: `Tu entrenamiento técnico en cohorte inicia en 15 minutos (${row.daily_time}). Instructor: ${row.facilitator_name || 'Docente Claro'}.`,
            actionUrl: 'technical-academy',
            meetingUrl: row.moodle_course_url
          });
        }

        // Ventana 2: Iniciando ahora
        if (diffMinutes >= -4 && diffMinutes <= 2) {
          await this.dispatchReminder({
            sessionType: 'cohort_session',
            sessionId: `cohort_${row.cohort_id}`,
            participantEmail: row.participant_email,
            dispatchWindow: 'starting_now',
            title: `🚀 ¡Tu sesión técnica comienza ahora!`,
            body: `Inicia el taller de "${row.course_name}" (${row.daily_time}). Aula: ${row.location || 'Laboratorio Técnico'}.`,
            actionUrl: 'technical-academy',
            meetingUrl: row.moodle_course_url
          });
        }
      }

    } catch (err) {
      console.error('Error en checkUpcomingSessions de TrainingReminderScheduler:', err);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Ejecuta el despacho real de la alerta evitando duplicados
   */
  private static async dispatchReminder(params: {
    sessionType: 'event_slot' | 'cohort_session';
    sessionId: string;
    slotId?: number;
    participantEmail: string;
    dispatchWindow: string;
    title: string;
    body: string;
    meetingUrl?: string;
    actionUrl?: string;
    eventId?: string;
  }) {
    try {
      const email = params.participantEmail.toLowerCase().trim();

      // Comprobar si ya fue despachado para esta sesión, usuario y ventana
      const existing = await pool.query(
        `SELECT id FROM training_reminder_dispatches
         WHERE session_id = $1 AND LOWER(participant_email) = $2 AND dispatch_window = $3`,
        [params.sessionId, email, params.dispatchWindow]
      );

      if (existing.rows.length > 0) {
        return; // Ya notificado
      }

      // Registrar despacho en tabla de control
      await pool.query(
        `INSERT INTO training_reminder_dispatches (session_type, session_id, slot_id, participant_email, dispatch_window)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (session_id, participant_email, dispatch_window) DO NOTHING`,
        [params.sessionType, params.sessionId, params.slotId || null, email, params.dispatchWindow]
      );

      // 1. Notificación In-App + WebSocket
      await NotificationService.notifyUser(email, {
        title: params.title,
        message: params.body,
        category: 'evento',
        priority: params.dispatchWindow === 'starting_now' ? 'urgent' : 'high',
        actionUrl: params.actionUrl || 'my-registrations',
        actionLabel: params.meetingUrl ? 'Entrar a Sala Virtual' : 'Ver Detalles',
        meetingUrl: params.meetingUrl,
        metadata: {
          sessionId: params.sessionId,
          eventId: params.eventId,
          dispatchWindow: params.dispatchWindow
        }
      });

      // 2. Notificación Web Push nativa en el dispositivo
      await WebPushService.sendPushToUser(email, {
        title: params.title,
        body: params.body,
        url: params.actionUrl || '/my-registrations',
        meetingUrl: params.meetingUrl,
        eventId: params.eventId,
        category: 'evento'
      });

      console.log(`🔔 [TrainingReminder] Alerta Push enviada a ${email} [${params.dispatchWindow}] para ${params.sessionId}`);
    } catch (err) {
      console.error(`Error al despachar recordatorio a ${params.participantEmail}:`, err);
    }
  }

  /**
   * Disparo Manual Inmediato de Alerta de Inicio de Clase (Iniciado por Facilitador o Admin)
   */
  public static async triggerManualClassCall(params: {
    sessionId: string;
    sessionTitle: string;
    sessionTime?: string;
    locationOrModality?: string;
    meetingUrl?: string;
    recipientEmails: string[];
    senderName: string;
  }): Promise<number> {
    const title = `🚀 ¡Llamado a Clase: ${params.sessionTitle}!`;
    const body = `${params.senderName} ha iniciado la sesión de entrenamiento. Ingresa ahora (${params.sessionTime || 'En Vivo'}).`;

    let notifiedCount = 0;

    for (const rawEmail of params.recipientEmails) {
      const email = rawEmail.toLowerCase().trim();
      if (!email) continue;

      // Registrar despacho manual
      await pool.query(
        `INSERT INTO training_reminder_dispatches (session_type, session_id, participant_email, dispatch_window)
         VALUES ('manual_alert', $1, $2, 'manual_alert_' || CURRENT_DATE)
         ON CONFLICT (session_id, participant_email, dispatch_window) DO NOTHING`,
        [params.sessionId, email]
      );

      // Notificación In-App y WebSocket
      await NotificationService.notifyUser(email, {
        title,
        message: body,
        category: 'evento',
        priority: 'urgent',
        actionUrl: 'my-registrations',
        actionLabel: params.meetingUrl ? 'Entrar a Sala Virtual' : 'Ver Curso',
        meetingUrl: params.meetingUrl,
        metadata: { sessionId: params.sessionId, manual: true }
      });

      // Notificación Web Push
      await WebPushService.sendPushToUser(email, {
        title,
        body,
        url: '/my-registrations',
        meetingUrl: params.meetingUrl,
        category: 'evento'
      });

      notifiedCount++;
    }

    return notifiedCount;
  }
}
