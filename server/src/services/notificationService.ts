import { pool } from '../db.js';
import { 
  sendNotificationToUser, 
  sendNotificationToRole, 
  sendNotificationToCompany, 
  broadcastNotification 
} from '../websocket.js';
import { WebPushService } from './webPushService.js';

export interface CreateNotificationInput {
  recipientEmail?: string | null;
  recipientUserId?: string | null;
  recipientCompanyId?: string | null;
  recipientRole?: string | null;
  title: string;
  message: string;
  category: 'evento' | 'convocatoria' | 'cohorte' | 'certificado' | 'cumplimiento' | 'sistema';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  sendPush?: boolean;
  meetingUrl?: string;
}

export class NotificationService {
  /**
   * Crea una notificación, la persiste en PostgreSQL y la emite por WebSockets y Web Push
   */
  public static async createNotification(input: CreateNotificationInput) {
    try {
      const email = input.recipientEmail ? input.recipientEmail.toLowerCase().trim() : null;
      const priority = input.priority || 'normal';

      // 1. Verificar preferencias del usuario si es notificación individual
      if (email) {
        const prefRes = await pool.query(
          `SELECT in_app_enabled, push_enabled, categories FROM user_notification_preferences WHERE LOWER(user_email) = $1`,
          [email]
        );
        if (prefRes.rows.length > 0) {
          const pref = prefRes.rows[0];
          if (pref.in_app_enabled === false) {
            // Usuario desactivó notificaciones in-app
            return null;
          }
          if (pref.categories && pref.categories[input.category] === false) {
            return null;
          }
        }
      }

      // 2. Insertar en la tabla notifications
      const insertRes = await pool.query(
        `INSERT INTO notifications (
          recipient_email, recipient_user_id, recipient_company_id, recipient_role,
          title, message, category, priority, action_url, action_label, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          email,
          input.recipientUserId || null,
          input.recipientCompanyId || null,
          input.recipientRole || null,
          input.title,
          input.message,
          input.category,
          priority,
          input.actionUrl || null,
          input.actionLabel || null,
          JSON.stringify(input.metadata || {})
        ]
      );

      const created = insertRes.rows[0];

      // 3. Emisión en tiempo real vía WebSocket
      if (email) {
        sendNotificationToUser(email, created);
      } else if (input.recipientRole) {
        sendNotificationToRole(input.recipientRole, created);
      } else if (input.recipientCompanyId) {
        sendNotificationToCompany(input.recipientCompanyId, created);
      } else {
        broadcastNotification(created);
      }

      // 4. Emisión Web Push al dispositivo si aplica
      const shouldSendPush = input.sendPush !== false;
      if (shouldSendPush && email) {
        await WebPushService.sendPushToUser(email, {
          title: input.title,
          body: input.message,
          url: input.actionUrl || '/my-registrations',
          meetingUrl: input.meetingUrl || input.metadata?.meetingUrl,
          eventId: input.metadata?.eventId,
          category: input.category
        });
      }

      return created;
    } catch (err) {
      console.error('Error al crear notificación en NotificationService:', err);
      return null;
    }
  }

  /**
   * Notifica a un usuario individual
   */
  public static async notifyUser(email: string, data: Omit<CreateNotificationInput, 'recipientEmail'>) {
    return this.createNotification({ ...data, recipientEmail: email });
  }

  /**
   * Notifica a una lista de usuarios
   */
  public static async notifyUsers(emails: string[], data: Omit<CreateNotificationInput, 'recipientEmail'>) {
    const uniqueEmails = Array.from(new Set(emails.map(e => e.toLowerCase().trim())));
    const results = [];
    for (const email of uniqueEmails) {
      const res = await this.notifyUser(email, data);
      if (res) results.push(res);
    }
    return results;
  }

  /**
   * Notifica a todos los usuarios con un rol específico
   */
  public static async notifyRole(role: string, data: Omit<CreateNotificationInput, 'recipientRole'>) {
    // También obtener correos de usuarios con ese rol para Web Push
    try {
      const usersRes = await pool.query(
        `SELECT LOWER(email) as email FROM users_simulated WHERE role = $1 AND is_active = true`,
        [role]
      );
      const emails = usersRes.rows.map(r => r.email);
      for (const email of emails) {
        await this.createNotification({ ...data, recipientEmail: email, recipientRole: role });
      }
    } catch (err) {
      console.error(`Error al notificar al rol ${role}:`, err);
    }
  }

  /**
   * Notifica a todos los usuarios de una empresa
   */
  public static async notifyCompany(companyId: string, data: Omit<CreateNotificationInput, 'recipientCompanyId'>) {
    try {
      const res = await pool.query(
        `SELECT DISTINCT LOWER(email) as email FROM (
          SELECT email FROM users_simulated WHERE company_id = $1 AND is_active = true
          UNION
          SELECT email FROM participants WHERE company_id = $1 AND is_active = true
        ) as sub`,
        [companyId]
      );
      const emails = res.rows.map(r => r.email);
      for (const email of emails) {
        await this.createNotification({ ...data, recipientEmail: email, recipientCompanyId: companyId });
      }
    } catch (err) {
      console.error(`Error al notificar a empresa ${companyId}:`, err);
    }
  }

  /**
   * Emite un comunicado a toda la plataforma
   */
  public static async broadcast(data: Omit<CreateNotificationInput, 'recipientEmail' | 'recipientRole' | 'recipientCompanyId'>) {
    return this.createNotification(data);
  }

  // ==========================================
  // TRIGGERS ESPECÍFICOS DE NEGOCIO EN GAES
  // ==========================================

  /**
   * Trigger: Convocatoria Publicada / Abierta
   */
  public static async onConvocatoriaPublished(convocatoria: any) {
    try {
      const quotasRes = await pool.query(
        `SELECT company_id, allocated_quota FROM convocatoria_company_quotas WHERE convocatoria_id = $1`,
        [convocatoria.id]
      );

      for (const q of quotasRes.rows) {
        await this.notifyCompany(q.company_id, {
          title: `Nueva Convocatoria Disponible: ${convocatoria.code}`,
          message: `Se ha abierto la convocatoria "${convocatoria.title}" con ${q.allocated_quota} cupos asignados a tu empresa. Plazo de postulación hasta el ${convocatoria.applicationEndDate || 'cierre'}.`,
          category: 'convocatoria',
          priority: 'high',
          actionUrl: 'convocatorias',
          actionLabel: 'Ver Convocatoria',
          metadata: { convocatoriaId: convocatoria.id, code: convocatoria.code }
        });
      }
    } catch (err) {
      console.error('Error en onConvocatoriaPublished:', err);
    }
  }

  /**
   * Trigger: Nueva Postulación Recibida
   */
  public static async onConvocatoriaApplicationSubmitted(application: any, convocatoria: any) {
    try {
      // 1. Notificar a Super Administradores
      await this.notifyRole('Super Administrador', {
        title: `Nueva Postulación: ${convocatoria.code}`,
        message: `${application.participantName || 'Un colaborador'} se ha postulado para "${convocatoria.title}". Requiere evaluación técnica.`,
        category: 'convocatoria',
        priority: 'normal',
        actionUrl: 'convocatorias',
        actionLabel: 'Evaluar Postulación',
        metadata: { convocatoriaId: convocatoria.id, applicationId: application.id }
      });

      // 2. Notificar al postulante con acuse de recibo
      if (application.participantEmail) {
        await this.notifyUser(application.participantEmail, {
          title: `Postulación Registrada con Éxito`,
          message: `Tu postulación para "${convocatoria.title}" (${convocatoria.code}) fue recibida y se encuentra en proceso de revisión.`,
          category: 'convocatoria',
          priority: 'normal',
          actionUrl: 'convocatorias',
          actionLabel: 'Ver Mi Postulación',
          metadata: { convocatoriaId: convocatoria.id, applicationId: application.id }
        });
      }
    } catch (err) {
      console.error('Error en onConvocatoriaApplicationSubmitted:', err);
    }
  }

  /**
   * Trigger: Dictamen de Postulación (Aprobada, Lista de Espera, Rechazada)
   */
  public static async onConvocatoriaApplicationReviewed(application: any, convocatoria: any, newStatus: string, reviewNotes?: string) {
    if (!application.participantEmail) return;

    let title = '';
    let message = '';
    let priority: 'normal' | 'high' = 'normal';

    if (newStatus === 'approved') {
      title = `🎉 ¡Postulación Aprobada!`;
      message = `¡Felicidades! Has sido admitido en la convocatoria "${convocatoria.title}". Tu cupo está confirmado y has sido matriculado en la cohorte técnica correspondiente.`;
      priority = 'high';
    } else if (newStatus === 'waitlist') {
      title = `📋 Postulación en Lista de Espera`;
      message = `Tu postulación para "${convocatoria.title}" ha sido calificada favorablemente y está en Lista de Espera priorizada por cupos de tu empresa.`;
    } else if (newStatus === 'rejected') {
      title = `Actualización de Postulación`;
      message = `Tu postulación para "${convocatoria.title}" no fue seleccionada en esta edición.${reviewNotes ? ` Motivo: ${reviewNotes}` : ''}`;
    }

    if (title) {
      await this.notifyUser(application.participantEmail, {
        title,
        message,
        category: 'convocatoria',
        priority,
        actionUrl: 'convocatorias',
        actionLabel: 'Ver Detalles',
        metadata: { convocatoriaId: convocatoria.id, status: newStatus }
      });
    }
  }

  /**
   * Trigger: Inscripción Confirmada en Evento / Taller
   */
  public static async onTrainingEnrolled(participantEmail: string, eventTitle: string, slotDate: string, slotTime: string, modality?: string, meetingUrl?: string) {
    await this.notifyUser(participantEmail, {
      title: `Inscripción Confirmada: ${eventTitle}`,
      message: `Has sido inscrito para el ${slotDate} en horario ${slotTime} (${modality || 'Presencial'}).`,
      category: 'evento',
      priority: 'normal',
      actionUrl: 'my-registrations',
      actionLabel: 'Ver Mis Cursos',
      meetingUrl,
      metadata: { eventTitle, slotDate, slotTime }
    });
  }

  /**
   * Trigger: Certificado Oficial Emitido
   */
  public static async onCertificateIssued(certificate: any) {
    if (!certificate.recipient_email) return;

    await this.notifyUser(certificate.recipient_email, {
      title: `🎓 ¡Diploma Oficial Disponible!`,
      message: `Se ha emitido tu certificado de acreditación para "${certificate.course_name}". Ya puedes descargarlo y consultar su validación digital.`,
      category: 'certificado',
      priority: 'high',
      actionUrl: 'my-registrations',
      actionLabel: 'Ver Mi Certificado',
      metadata: { certificateId: certificate.id, credentialId: certificate.credential_id }
    });
  }
}
