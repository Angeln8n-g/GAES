// ==========================================
// TIPOS E INTERFACES TYPESCRIPT CENTRALIZADOS
// ==========================================

export type UserRole = 'Super Administrador' | 'Administrador / Editor' | 'Líder de Área / Supervisor' | 'Colaborador (User)';

export type EventStatus = 'active' | 'inactive';
export type EventModality = 'Presencial' | 'Virtual' | 'Híbrida';

export interface Slot {
  time: string;
  capacity: number;
  registered: number;
  attendees: string[]; // Emails de colaboradores inscritos
  attendedList?: string[]; // Emails con asistencia confirmada (QR)
  waitlist?: string[]; // Emails en lista de espera
}

export interface Schedule {
  date: string; // Formato YYYY-MM-DD
  slots: Slot[];
}

export interface NotificationSettings {
  sendEmail: boolean;
  sendTeams: boolean;
  customMessage: string;
}

export interface NotificationHistoryItem {
  date: string;
  channel: 'Email' | 'Teams' | 'WhatsApp';
  status: 'Enviado' | 'Fallido' | 'Pendiente';
  recipients: number;
}

export interface EventFeedback {
  id?: string;
  eventId: string;
  userEmail: string;
  userName?: string;
  rating: number; // 1 to 5
  comment?: string;
  createdAt: string;
}

export interface TrainingEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  instructor: string;
  imageUrl: string;
  status: EventStatus;
  modality: EventModality;
  location: string;
  surveyUrl?: string;
  notificationSettings?: NotificationSettings;
  notificationHistory?: NotificationHistoryItem[];
  schedule: Schedule[];
  feedbacks?: EventFeedback[];
}

export interface Participant {
  card: string;
  name: string;
  email: string;
  cedula?: string;
  department?: string;
  supervisorId?: string; // ID del usuario supervisor asignado
  supervisorName?: string; // Nombre del supervisor
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  cedula?: string;
  department?: string;
  assignedGroupIds?: string[];
  assignedMemberCards?: string[]; // Tarjetas de colaboradores supervisados directamente
}

export interface ToastNotification {
  id?: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export type TabView = 'landing' | 'my-registrations' | 'dashboard' | 'admin' | 'attendance' | 'team';

// ==========================================
// MÓDULO DE GRUPOS, CRONOGRAMAS Y CUMPLIMIENTO
// ==========================================

export interface ParticipantGroup {
  id: string;
  name: string;
  description?: string;
  color: string; // 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'purple' | 'cyan' | 'slate'
  department?: string;
  memberCards: string[]; // Lista de tarjetas de colaboradores
  createdAt: string;
}

export interface ProgramEventItem {
  eventId: string;
  isMandatory: boolean;
  orderIndex?: number;
}

export type ProgramStatus = 'active' | 'draft' | 'archived' | 'completed';

export interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: ProgramStatus;
  eventItems: ProgramEventItem[];
  targetGroupIds: string[];
  targetParticipantCards?: string[];
  createdAt: string;
}

export type ComplianceStatus = 'completed' | 'in_progress' | 'overdue' | 'not_started';

export interface ParticipantEventStatus {
  eventId: string;
  isMandatory: boolean;
  attended: boolean;
  registered: boolean;
  status: 'attended' | 'registered' | 'pending';
  attendedDate?: string;
  registeredDate?: string;
  registeredTime?: string;
}

export interface ParticipantComplianceDetail {
  participantCard: string;
  participantName: string;
  participantEmail: string;
  participantCedula?: string;
  groupNames: string[];
  totalAssignedEvents: number;
  mandatoryEventsCount: number;
  completedEventsCount: number;
  mandatoryCompletedCount: number;
  percentage: number; // 0 to 100
  status: ComplianceStatus;
  eventsDetail: ParticipantEventStatus[];
}

export interface ProgramComplianceSummary {
  programId: string;
  programTitle: string;
  totalParticipants: number;
  completedCount: number;
  inProgressCount: number;
  overdueCount: number;
  notStartedCount: number;
  overallPercentage: number;
  groupStats: {
    groupId: string;
    groupName: string;
    groupColor: string;
    totalMembers: number;
    averagePercentage: number;
    completedMembers: number;
  }[];
  participants: ParticipantComplianceDetail[];
}
