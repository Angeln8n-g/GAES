// ==========================================
// TIPOS E INTERFACES TYPESCRIPT CENTRALIZADOS
// ==========================================

export type UserRole = 'Super Administrador' | 'Administrador / Editor' | 'Colaborador (User)';

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
  channel: 'Email' | 'Teams';
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
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
}

export interface ToastNotification {
  id?: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export type TabView = 'landing' | 'my-registrations' | 'dashboard' | 'admin' | 'attendance';
