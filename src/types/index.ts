// ==========================================
// TIPOS E INTERFACES TYPESCRIPT CENTRALIZADOS
// ==========================================

export type UserRole = 'Super Administrador' | 'Administrador / Editor' | 'Líder de Área / Supervisor' | 'Evaluador / Tutor OJT' | 'Colaborador (User)';

export type EventStatus = 'active' | 'inactive';
export type EventModality = 'Presencial' | 'Virtual' | 'Híbrida';

export interface RegistrationAttendeeDetail {
  email: string;
  isMandatory?: boolean;
  assignedBy?: string | null;
  assignmentType?: 'mandatory' | 'voluntary' | 'self';
  assignmentNotes?: string | null;
  assignedAt?: string | null;
}

export interface TeamAssignmentPayload {
  eventId: string;
  date: string;
  time: string;
  emails: string[];
  isMandatory: boolean;
  assignedBy: string;
  assignmentType?: 'mandatory' | 'voluntary';
  notes?: string;
}

export interface SlotAttendanceDetail {
  email: string;
  checkInAt: string;
  checkOutAt?: string | null;
  isCompleted: boolean;
}

export interface AttendanceWsEvent {
  type: 'ATTENDANCE_CHECK_IN' | 'ATTENDANCE_CHECK_OUT' | 'ATTENDANCE_REVERT' | 'EVENTS_UPDATED';
  eventId?: string;
  date?: string;
  time?: string;
  email?: string;
  participantCard?: string;
  participantName?: string;
  timestamp: string;
  checkInAt?: string;
  checkOutAt?: string;
  isCompleted?: boolean;
  message?: string;
}

export interface Slot {
  time: string;
  endTime?: string;
  capacity: number;
  registered: number;
  attendees: string[]; // Emails de colaboradores inscritos
  attendedList?: string[]; // Emails con asistencia confirmada (QR) (retrocompatibilidad)
  checkInList?: string[]; // Emails con entrada registrada
  checkOutList?: string[]; // Emails con salida registrada
  completedAttendanceList?: string[]; // Emails con entrada y salida
  attendanceDetails?: SlotAttendanceDetail[]; // Detalles con timestamps
  checkinCode?: string; // Código PIN diario de Entrada (4 dígitos)
  checkoutCode?: string; // Código PIN diario de Salida (4 dígitos)
  attendeesDetails?: RegistrationAttendeeDetail[]; // Metadatos de asignación
  waitlist?: string[]; // Emails en lista de espera
}

export interface Schedule {
  date: string; // Formato YYYY-MM-DD
  endDate?: string; // Formato YYYY-MM-DD
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
  rating: number; // 1 to 5 (promedio general redondeado o ponderado)
  comment?: string;
  courseRatings?: Record<string, number>;
  facilitatorRatings?: Record<string, number>;
  courseScore?: number;
  facilitatorScore?: number;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  rncTaxId?: string;
  industry?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt?: string;
  stats?: {
    participantsCount: number;
    usersCount: number;
    eventsCount: number;
    supervisorsCount: number;
  };
}

export type EvaluationType = 'attendance_only' | 'score_100' | 'scale_1_5' | 'pass_fail';
export type AcademicStatus = 'passed' | 'failed' | 'pending';

export interface EventModule {
  id: string;
  title: string;
  description?: string;
  passingScore?: number; // Nota mínima para aprobar este módulo (ej: 70)
  maxScore?: number;     // Puntaje máximo (ej: 100)
  orderIndex: number;
}

export interface ParticipantModuleGrade {
  moduleId: string;
  moduleName: string;
  score: number | null;
  academicStatus: AcademicStatus;
  feedback?: string;
  gradedAt?: string;
  gradedBy?: string;
}

export interface ParticipantGrade {
  id: string;
  eventId: string;
  slotId?: number | null;
  participantCard: string;
  participantName?: string;
  participantEmail?: string;
  participantDepartment?: string;
  companyId?: string;
  score: number | null;
  academicStatus: AcademicStatus;
  detectedSkillGaps: string[];
  weaknessesNotes?: string | null;
  strengthsNotes?: string | null;
  needsRetraining: boolean;
  feedback?: string | null;
  gradedBy?: string;
  gradedAt?: string;
  eventTitle?: string;
  eventCategory?: string;
  evaluationType?: EvaluationType;
  passingScore?: number;
  skillsEvaluated?: string[];
  moduleGrades?: ParticipantModuleGrade[];
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
  companyId?: string;
  companyIds?: string[];
  evaluationType?: EvaluationType;
  passingScore?: number;
  skillsEvaluated?: string[];
  modules?: EventModule[];
  notificationSettings?: NotificationSettings;
  notificationHistory?: NotificationHistoryItem[];
  schedule: Schedule[];
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  feedbacks?: EventFeedback[];
  grades?: ParticipantGrade[];
  ojtEvaluatorId?: string;
  ojtEvaluatorName?: string;
  ojtEvaluatorEmail?: string;
  totalHours?: number;
  sessionType?: 'Asincrónica' | 'Sincrónica' | 'Híbrido' | string;
  trainingType?: 'Conductual' | 'Técnico' | string;
  trainingFormat?: 'Taller' | 'Webinar' | 'Curso' | 'Cinefórum' | 'Charla' | 'Workshop' | 'Diplomado' | 'Certificación' | 'Seminario' | string;
  programCategory?: string;
  subprogram?: string;
  supplier?: string;
}

export type EmploymentStatus = 'contratado' | 'en_proceso' | 'inactivo';

export type EducationLevel = 
  | 'Primaria'
  | 'Secundaria / Bachiller'
  | 'Técnico / Tecnólogo'
  | 'Universitario en Curso'
  | 'Profesional / Grado'
  | 'Postgrado / Maestría'
  | 'Doctorado'
  | 'Otro';

export type Gender = 'Masculino' | 'Femenino' | 'Otro' | 'Prefiero no decir';

export interface Participant {
  card: string;
  name: string;
  email: string;
  cedula?: string;
  department?: string;
  supervisorId?: string; // ID del usuario supervisor asignado
  supervisorName?: string; // Nombre del supervisor
  employmentStatus?: EmploymentStatus;
  isActive?: boolean;
  companyId?: string;
  birthDate?: string;
  educationLevel?: EducationLevel;
  isCurrentlyStudying?: boolean;
  currentStudyField?: string;
  institutionName?: string;
  professionTitle?: string;
  currentAddress?: string;
  phone?: string;
  gender?: Gender;
  trainingInterestAreas?: string[];
  profileCompleted?: boolean;
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
  employmentStatus?: EmploymentStatus;
  isActive?: boolean;
  companyId?: string;
  birthDate?: string;
  educationLevel?: EducationLevel;
  isCurrentlyStudying?: boolean;
  currentStudyField?: string;
  institutionName?: string;
  professionTitle?: string;
  currentAddress?: string;
  phone?: string;
  gender?: Gender;
  trainingInterestAreas?: string[];
  profileCompleted?: boolean;
}

export interface ToastNotification {
  id?: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export type TabView = 'landing' | 'my-registrations' | 'dashboard' | 'admin' | 'attendance' | 'team' | 'ojt' | 'evaluator-courses' | 'kiosk';

// ==========================================
// MÓDULO DE GRUPOS, CRONOGRAMAS Y CUMPLIMIENTO
// ==========================================

export interface ParticipantGroup {
  id: string;
  name: string;
  description?: string;
  color: string; // 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'purple' | 'cyan' | 'slate'
  department?: string;
  companyId?: string;
  memberCards: string[]; // Lista de tarjetas de colaboradores
  createdAt: string;
}

export type StageCategory = 'field_practice_70' | 'shadowing_coaching_20' | 'formal_course_10';
export type LearningFramework = 'standard' | '70_20_10';

export interface ProgramEventItem {
  eventId: string;
  isMandatory: boolean;
  orderIndex?: number;
  stageCategory?: StageCategory;
}

export type ProgramStatus = 'active' | 'draft' | 'archived' | 'completed';

export interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: ProgramStatus;
  companyId?: string;
  learningFramework?: LearningFramework;
  eventItems: ProgramEventItem[];
  targetGroupIds: string[];
  targetParticipantCards?: string[];
  createdAt: string;
}

// ==========================================
// MÓDULO OJT & PLAN DE ACCIÓN 90 DÍAS
// ==========================================

export interface OjtPlanSettings {
  enabled: boolean;
  enable_702010?: boolean;
  enable_calibration?: boolean;
  target_ttp_days?: number;
}

export interface SystemSettings {
  ojt_plan_90d?: OjtPlanSettings;
  [key: string]: any;
}

export type OjtObservationType = 'daily_observation' | 'weekly_evaluation' | 'cross_audit' | 'first_60d_check';
export type OjtOperationalStatus = 'compliant' | 'needs_coaching' | 'critical_gap';

export interface OjtRubricItem {
  category: string;
  score: number; // 0 to 100
  notes?: string;
}

export interface OjtChecklist {
  id: string;
  companyId: string;
  participantCard: string;
  participantName?: string;
  department?: string;
  evaluatorUserId: string;
  evaluatorName: string;
  date: string; // YYYY-MM-DD
  observationType: OjtObservationType;
  overallScore: number;
  operationalStatus: OjtOperationalStatus;
  safetyProtocolPass: boolean;
  firstTimeFixPass: boolean;
  rubricEvaluation: OjtRubricItem[];
  weaknessesIdentified: string[];
  immediateActionPlan?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface CalibrationSession {
  id: string;
  companyId: string;
  title: string;
  date: string;
  conductedBy: string;
  participantsReviewed: number;
  averageTheoryScore: number;
  averageFieldScore: number;
  varianceGapPct: number;
  status: 'completed' | 'scheduled' | 'in_progress';
  keyFindings?: string | null;
  actionAgreements?: string | null;
  createdAt?: string;
}

export interface OjtMetrics {
  totalChecklists: number;
  avgOperationalScore: number;
  complianceRate: number;
  firstTimeFixRate: number;
  safetyPassRate: number;
  estimatedTtpDays: number;
  targetTtpDays: number;
  theoryVsFieldGap: number;
  avgTheoryScore: number;
  avgFieldScore: number;
  topFieldWeaknesses: Array<{ weakness: string; count: string | number }>;
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
