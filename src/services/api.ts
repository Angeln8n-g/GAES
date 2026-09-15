// ==========================================
// CAPA DE SERVICIOS DE API (HÍBRIDO: LOCAL / POSTGRES)
// PROYECTO: GESTIÓN DE RESERVAS DE CAPACITACIONES
// ==========================================

import { 
  TrainingEvent, 
  Participant, 
  UserAccount, 
  EventFeedback, 
  ParticipantGroup, 
  TrainingProgram, 
  ProgramComplianceSummary,
  ParticipantComplianceDetail,
  ParticipantEventStatus,
  ComplianceStatus,
  TeamAssignmentPayload,
  Company,
  ParticipantGrade,
  SystemSettings,
  OjtChecklist,
  CalibrationSession,
  OjtMetrics,
  OjtPlanSettings,
  ExternalTraining,
  CreateExternalTrainingPayload,
  TechnicalAcademyCourse,
  TechnicalAcademyCohort,
  TechnicalDailyAttendance,
  TechnicalCohortAttendanceMatrix,
  TechnicalCohortParticipant,
  TechnicalAcademyHistoryRecord,
  TechnicalCohortEnrolledParticipant,
  TechnicalCohortParticipantsResponse,
  DatabaseBackupRecord,
  DatabaseStats,
  MigrationStatusRecord
} from '../types';

export const MOCK_COMPANIES: Company[] = [
  {
    id: "emp_kasino",
    name: "Kasino 21 Corporativo",
    slug: "kasino-21",
    logoUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=200&q=80",
    rncTaxId: "101-928374-1",
    industry: "Entretenimiento & Hospitalidad",
    contactEmail: "contacto@kasino21.com",
    contactPhone: "+1 (809) 555-0120",
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "emp_resort",
    name: "Gran Resort & Hospitality Club",
    slug: "gran-resort",
    logoUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=200&q=80",
    rncTaxId: "101-445566-2",
    industry: "Turismo & Hotelería",
    contactEmail: "info@granresort.com",
    contactPhone: "+1 (809) 555-0340",
    isActive: true,
    createdAt: "2026-02-01T00:00:00Z"
  },
  {
    id: "emp_tech",
    name: "Tech Innovations Labs",
    slug: "tech-innovations",
    logoUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80",
    rncTaxId: "101-778899-3",
    industry: "Tecnología & Software",
    contactEmail: "rrhh@techlabs.io",
    contactPhone: "+1 (809) 555-0560",
    isActive: true,
    createdAt: "2026-03-01T00:00:00Z"
  }
];

export const MOCK_GROUPS: ParticipantGroup[] = [
  {
    id: "grp_ti",
    name: "Departamento de TI & Sistemas",
    description: "Equipo de desarrollo, infraestructura y soporte tecnológico.",
    color: "indigo",
    department: "Tecnología",
    memberCards: ["2010", "2012"],
    createdAt: "2026-06-01"
  },
  {
    id: "grp_ventas",
    name: "Equipo Comercial & Ventas",
    description: "Ejecutivos de cuentas, asesores comerciales y servicio al cliente.",
    color: "emerald",
    department: "Comercial",
    memberCards: ["1998", "2015"],
    createdAt: "2026-06-05"
  },
  {
    id: "grp_lideres",
    name: "Liderazgo & Mandos Medios",
    description: "Supervisores, gerentes de área y líderes de proyecto.",
    color: "amber",
    department: "Dirección",
    memberCards: ["2012"],
    createdAt: "2026-06-10"
  },
  {
    id: "grp_onboarding",
    name: "Nuevos Ingresos 2026",
    description: "Colaboradores incorporados recientemente al plan de inducción.",
    color: "sky",
    department: "Recursos Humanos",
    memberCards: ["2010", "2015"],
    createdAt: "2026-06-15"
  }
];

export const MOCK_PROGRAMS: TrainingProgram[] = [
  {
    id: "prog_1",
    title: "Plan de Innovación y Habilidades Digitales 2026",
    description: "Ruta formativa estratégica orientada al dominio de herramientas modernas de desarrollo, UX e inteligencia artificial para potenciar la productividad y el trabajo en equipo.",
    startDate: "2026-07-01",
    endDate: "2026-08-31",
    status: "active",
    eventItems: [
      { eventId: "evt_1", isMandatory: true, orderIndex: 1 },
      { eventId: "evt_3", isMandatory: true, orderIndex: 2 },
      { eventId: "evt_2", isMandatory: false, orderIndex: 3 }
    ],
    targetGroupIds: ["grp_ti", "grp_lideres"],
    targetParticipantCards: [],
    createdAt: "2026-06-25"
  },
  {
    id: "prog_2",
    title: "Programa de Inducción y Cultura Organizacional",
    description: "Capacitaciones esenciales sobre dinámicas de trabajo, seguridad digital y bienestar para nuevos ingresos.",
    startDate: "2026-08-01",
    endDate: "2026-09-30",
    status: "active",
    eventItems: [
      { eventId: "evt_2", isMandatory: true, orderIndex: 1 },
      { eventId: "evt_3", isMandatory: true, orderIndex: 2 }
    ],
    targetGroupIds: ["grp_onboarding"],
    targetParticipantCards: [],
    createdAt: "2026-07-01"
  }
];

export const MOCK_EVENTS: TrainingEvent[] = [
  {
    id: "evt_1",
    title: "Taller Avanzado de React y UX",
    description: "Domina el diseño de interfaces memorables y fluidas aplicando principios avanzados de usabilidad, animaciones y gestión de estado con React.",
    category: "Taller",
    instructor: "Ing. Sofía Martínez",
    imageUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80",
    status: "active",
    modality: "Presencial",
    location: "Sala de Juntas B (Piso 3)",
    surveyUrl: "https://forms.office.com/r/react-ux-evaluation",
    ojtEvaluatorId: "usr_ojt",
    ojtEvaluatorName: "Lic. Carlos Mendoza (Tutor OJT)",
    ojtEvaluatorEmail: "tutor.ojt@empresa.com",
    modules: [
      { id: "mod_1", title: "Módulo 1: Fundamentos y Arquitectura UI", description: "Hooks avanzados, ciclo de vida y patrones de renderizado.", passingScore: 70, maxScore: 100, orderIndex: 1 },
      { id: "mod_2", title: "Módulo 2: Optimización de Rendimiento y UX", description: "Profiling, bundle splitting y estándares de experiencia.", passingScore: 75, maxScore: 100, orderIndex: 2 },
      { id: "mod_3", title: "Módulo 3: Práctica de Campo y Evaluación Operativa", description: "Implementación práctica en puesto de trabajo y simulación real.", passingScore: 80, maxScore: 100, orderIndex: 3 }
    ],
    notificationSettings: {
      sendEmail: true,
      sendTeams: true,
      customMessage: "Estimado colaborador, te recordamos que mañana inicia el taller '[EVENT_TITLE]' facilitado por [INSTRUCTOR]. ¡Te esperamos!"
    },
    notificationHistory: [
      { date: "2026-06-20 10:00 AM", channel: "Email", status: "Enviado", recipients: 12 },
      { date: "2026-06-20 10:01 AM", channel: "Teams", status: "Enviado", recipients: 12 }
    ],
    schedule: [
      {
        date: "2026-07-15",
        slots: [
          { time: "09:00 AM", capacity: 20, registered: 2, attendees: ["liliana.sosa@empresa.com", "luis.almazan@empresa.com"], attendedList: ["liliana.sosa@empresa.com"] },
          { time: "02:00 PM", capacity: 20, registered: 1, attendees: ["jesus.pech@empresa.com"], attendedList: [] }
        ]
      },
      {
        date: "2026-07-16",
        slots: [
          { time: "10:00 AM", capacity: 15, registered: 0, attendees: [], attendedList: [] }
        ]
      },
      {
        date: "2026-08-25",
        slots: [
          { time: "11:00 AM", capacity: 25, registered: 0, attendees: [], attendedList: [] }
        ]
      },
      {
        date: "2026-09-18",
        slots: [
          { time: "09:00 AM", capacity: 20, registered: 0, attendees: [], attendedList: [] },
          { time: "03:00 PM", capacity: 20, registered: 0, attendees: [], attendedList: [] }
        ]
      },
      {
        date: "2026-10-08",
        slots: [
          { time: "10:00 AM", capacity: 25, registered: 0, attendees: [], attendedList: [] }
        ]
      }
    ],
    feedbacks: [
      {
        id: "fb_1",
        eventId: "evt_1",
        userEmail: "liliana.sosa@empresa.com",
        userName: "LILIANA ESTHER SOSA PECH",
        rating: 5,
        comment: "Excelente taller, muy práctico y aplicable a proyectos reales.",
        createdAt: "2026-07-15 11:30 AM"
      }
    ]
  },
  {
    id: "evt_2",
    title: "Cine Forum: El Dilema de las Redes Sociales",
    description: "Análisis colectivo y debate abierto sobre el impacto de los algoritmos de recomendación en la salud mental y la cohesión social de nuestro entorno.",
    category: "Cine Forum",
    instructor: "Dra. Carolina Herrera",
    imageUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80",
    status: "active",
    modality: "Presencial",
    location: "Auditorio Principal",
    surveyUrl: "",
    notificationSettings: {
      sendEmail: true,
      sendTeams: false,
      customMessage: "¡Hola! Te esperamos mañana en nuestro Cine Forum '[EVENT_TITLE]' para debatir ideas juntos."
    },
    notificationHistory: [],
    schedule: [
      {
        date: "2026-07-18",
        slots: [
          { time: "04:30 PM", capacity: 40, registered: 0, attendees: [], attendedList: [] }
        ]
      },
      {
        date: "2026-08-28",
        slots: [
          { time: "05:00 PM", capacity: 50, registered: 0, attendees: [], attendedList: [] }
        ]
      }
    ],
    feedbacks: []
  },
  {
    id: "evt_3",
    title: "Webinar: El Futuro de la IA en la Productividad Diaria",
    description: "Descubre cómo integrar herramientas de Inteligencia Artificial generativa en tus flujos de trabajo cotidianos para ahorrar hasta un 30% de tiempo en tareas repetitivas.",
    category: "Webinar",
    instructor: "Lic. Roberto Gómez",
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80",
    status: "active",
    modality: "Virtual",
    location: "Enlace de Microsoft Teams",
    surveyUrl: "",
    notificationSettings: {
      sendEmail: true,
      sendTeams: true,
      customMessage: "Recordatorio: Tu sesión de Webinar '[EVENT_TITLE]' está agendada para mañana."
    },
    notificationHistory: [],
    schedule: [
      {
        date: "2026-07-22",
        slots: [
          { time: "11:00 AM", capacity: 100, registered: 0, attendees: [], attendedList: [] }
        ]
      },
      {
        date: "2026-09-10",
        slots: [
          { time: "10:00 AM", capacity: 100, registered: 0, attendees: [], attendedList: [] }
        ]
      },
      {
        date: "2026-09-22",
        slots: [
          { time: "11:00 AM", capacity: 100, registered: 0, attendees: [], attendedList: [] }
        ]
      }
    ],
    feedbacks: []
  }
];

export const MOCK_PARTICIPANTS: Participant[] = [
  { card: "2010", name: "LUIS ALBERTO ALMAZAN POOT", email: "luis.almazan@empresa.com", cedula: "402-2196163-1", department: "Tecnología", supervisorId: "usr_lead", supervisorName: "Ing. Laura Gómez (Líder TI)" },
  { card: "2012", name: "LILIANA ESTHER SOSA PECH", email: "liliana.sosa@empresa.com", cedula: "001-0876543-2", department: "Tecnología", supervisorId: "usr_lead", supervisorName: "Ing. Laura Gómez (Líder TI)" },
  { card: "1998", name: "FERMIN GABRIEL CHI PERERA", email: "fermin.chi@empresa.com", cedula: "031-0456789-4", department: "Operaciones" },
  { card: "2015", name: "JESUS RAFAEL PECH CHULIM", email: "jesus.pech@empresa.com", cedula: "223-0098765-8", department: "Ventas" }
];

export const MOCK_USERS: UserAccount[] = [
  { id: "usr_super", email: "superadmin@empresa.com", name: "Superusuario Principal", role: "Super Administrador", password: "admin", cedula: "402-2196163-1" },
  { id: "usr_1", email: "sofia.ceo@empresa.com", name: "Sofía Martínez", role: "Super Administrador", password: "123", cedula: "001-1928374-5" },
  { id: "usr_2", email: "admin.capacitacion@empresa.com", name: "Carlos Pérez", role: "Administrador / Editor", password: "123", cedula: "001-2837465-9" },
  { id: "usr_ojt", email: "tutor.ojt@empresa.com", name: "Lic. Carlos Mendoza (Tutor OJT)", role: "Evaluador / Tutor OJT", password: "123", cedula: "001-9876543-1", department: "Operaciones" },
  { id: "usr_lead", email: "laura.lider@empresa.com", name: "Ing. Laura Gómez (Líder TI)", role: "Líder de Área / Supervisor", password: "123", cedula: "001-3847261-8", department: "Tecnología", assignedGroupIds: ["grp_ti"], assignedMemberCards: ["2010", "2012"] },
  { id: "usr_3", email: "juan.diez@empresa.com", name: "Juan Díez", role: "Colaborador (User)", password: "123", cedula: "031-1827364-0" },
  { id: "usr_4", email: "marta.perez@empresa.com", name: "Marta Pérez", role: "Colaborador (User)", password: "123", cedula: "223-8765432-1" }
];

// Helper seguro para parsear JSON de localStorage o fuentes externas sin lanzar SyntaxError
export function safeJsonParse<T>(rawOrKey: string | null, fallback: T): T {
  if (!rawOrKey || rawOrKey === 'undefined' || rawOrKey === 'null' || rawOrKey.trim() === '') return fallback;
  
  // Si parece una clave de localStorage (ej. 'ch_events', 'ch_users', etc.)
  if (typeof localStorage !== 'undefined' && (rawOrKey.startsWith('ch_') || rawOrKey.startsWith('user_'))) {
    try {
      const stored = localStorage.getItem(rawOrKey);
      if (!stored || stored === 'undefined' || stored === 'null' || stored.trim() === '') return fallback;
      return JSON.parse(stored) as T;
    } catch (e) {
      return fallback;
    }
  }

  // Parseo directo de cadena JSON
  try {
    return JSON.parse(rawOrKey) as T;
  } catch (e) {
    return fallback;
  }
}

export function safeGetLocalStorage<T>(key: string, fallback: T): T {
  return safeJsonParse(key, fallback);
}

// URLs del Backend (Configurables y autodetectadas)
const getApiBaseUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  // En producción detrás de Nginx en un dominio real (ej. gaes.kasino21.com)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api';
  }
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();
const isApiMode = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_MODE === 'true') ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');

/**
 * Helper centralizado para adjuntar token JWT y headers de rol/usuario a las peticiones
 */
export function getAuthHeaders(contentTypeJson: boolean = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentTypeJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (typeof localStorage !== 'undefined') {
    try {
      const token = localStorage.getItem('ch_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const rawUser = localStorage.getItem('ch_logged_user') || localStorage.getItem('capacitahub_user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed?.role) headers['X-User-Role'] = parsed.role;
        if (parsed?.email) headers['X-User-Email'] = parsed.email;
        if (parsed?.name) headers['X-User-Name'] = parsed.name;
      }
    } catch (_) {}
  }
  return headers;
}

// Inicializar almacenamiento local si no existe para el modo local
const initLocalStorage = () => {
  if (typeof localStorage === 'undefined') return;
  const existingEvents = localStorage.getItem('ch_events');
  if (!existingEvents || existingEvents === 'undefined' || existingEvents === 'null') {
    localStorage.setItem('ch_events', JSON.stringify(MOCK_EVENTS));
  } else {
    try {
      const parsed = JSON.parse(existingEvents);
      if (Array.isArray(parsed)) {
        const needsMigration = parsed.some((e: any) => e.id === 'evt_1' && e.surveyUrl === undefined && e.survey_url === undefined);
        if (needsMigration) {
          localStorage.setItem('ch_events', JSON.stringify(MOCK_EVENTS));
        }
      } else {
        localStorage.setItem('ch_events', JSON.stringify(MOCK_EVENTS));
      }
    } catch (e) {
      localStorage.setItem('ch_events', JSON.stringify(MOCK_EVENTS));
    }
  }

  const existingParticipants = localStorage.getItem('ch_participants');
  if (!existingParticipants || existingParticipants === 'undefined' || existingParticipants === 'null') {
    localStorage.setItem('ch_participants', JSON.stringify(MOCK_PARTICIPANTS));
  } else {
    try {
      const parsed = JSON.parse(existingParticipants);
      if (Array.isArray(parsed)) {
        if (!parsed.some((p: any) => p.cedula)) {
          localStorage.setItem('ch_participants', JSON.stringify(MOCK_PARTICIPANTS));
        }
      } else {
        localStorage.setItem('ch_participants', JSON.stringify(MOCK_PARTICIPANTS));
      }
    } catch (e) {
      localStorage.setItem('ch_participants', JSON.stringify(MOCK_PARTICIPANTS));
    }
  }
  
  const existingUsers = localStorage.getItem('ch_users');
  if (!existingUsers || existingUsers === 'undefined' || existingUsers === 'null') {
    localStorage.setItem('ch_users', JSON.stringify(MOCK_USERS));
  } else {
    try {
      const parsed = JSON.parse(existingUsers);
      if (Array.isArray(parsed)) {
        const needsMigration = parsed.some((u: any) => !u.password) || !parsed.some((u: any) => u.email === 'superadmin@empresa.com') || !parsed.some((u: any) => u.cedula);
        if (needsMigration) {
          localStorage.setItem('ch_users', JSON.stringify(MOCK_USERS));
        }
      } else {
        localStorage.setItem('ch_users', JSON.stringify(MOCK_USERS));
      }
    } catch (e) {
      localStorage.setItem('ch_users', JSON.stringify(MOCK_USERS));
    }
  }

  const existingGroups = localStorage.getItem('ch_groups');
  if (!existingGroups || existingGroups === 'undefined' || existingGroups === 'null') {
    localStorage.setItem('ch_groups', JSON.stringify(MOCK_GROUPS));
  }

  const existingPrograms = localStorage.getItem('ch_programs');
  if (!existingPrograms || existingPrograms === 'undefined' || existingPrograms === 'null') {
    localStorage.setItem('ch_programs', JSON.stringify(MOCK_PROGRAMS));
  }
};

if (!isApiMode) {
  initLocalStorage();
}

export const apiService = {
  // --- MÉTODOS DE EVENTOS ---
  async getEvents(companyId?: string): Promise<TrainingEvent[]> {
    if (isApiMode) {
      const query = companyId && companyId !== 'all' ? `?companyId=${encodeURIComponent(companyId)}` : '';
      const res = await fetch(`${API_BASE_URL}/events${query}`);
      if (!res.ok) throw new Error('Error al obtener eventos de Postgres');
      return res.json();
    } else {
      const list: TrainingEvent[] = safeJsonParse('ch_events', []);
      if (companyId && companyId !== 'all') {
        return list.filter(e => (e.companyId || 'emp_kasino') === companyId);
      }
      return list;
    }
  },

  async saveEvents(events: TrainingEvent[]): Promise<void> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/events/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
      });
      if (!res.ok) throw new Error('Error al importar eventos masivamente en Postgres');
    } else {
      localStorage.setItem('ch_events', JSON.stringify(events));
    }
  },

  async saveEvent(event: TrainingEvent): Promise<TrainingEvent[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
      if (!res.ok) throw new Error('Error al guardar evento en Postgres');
      return this.getEvents();
    } else {
      const events = safeJsonParse('ch_events', []);
      const index = events.findIndex((e: any) => e.id === event.id);
      if (index > -1) {
        events[index] = event;
      } else {
        events.unshift(event);
      }
      localStorage.setItem('ch_events', JSON.stringify(events));
      return events;
    }
  },

  async deleteEvent(eventId: string): Promise<TrainingEvent[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar evento de Postgres');
      return this.getEvents();
    } else {
      const events = safeJsonParse('ch_events', []);
      const filtered = events.filter((e: any) => e.id !== eventId);
      localStorage.setItem('ch_events', JSON.stringify(filtered));
      return filtered;
    }
  },

  // --- MÉTODOS DE CALIFICACIONES Y DESEMPEÑO ---
  async getGrades(params?: { eventId?: string; participantCard?: string; companyId?: string; needsRetraining?: boolean }): Promise<ParticipantGrade[]> {
    if (isApiMode) {
      const query = new URLSearchParams();
      if (params?.eventId) query.append('eventId', params.eventId);
      if (params?.participantCard) query.append('participantCard', params.participantCard);
      if (params?.companyId && params.companyId !== 'all') query.append('companyId', params.companyId);
      if (params?.needsRetraining) query.append('needsRetraining', 'true');
      
      const res = await fetch(`${API_BASE_URL}/grades?${query.toString()}`);
      if (!res.ok) throw new Error('Error al obtener calificaciones');
      return res.json();
    } else {
      const grades: ParticipantGrade[] = safeJsonParse('ch_grades', []);
      return grades.filter(g => {
        if (params?.eventId && g.eventId !== params.eventId) return false;
        if (params?.participantCard && g.participantCard !== params.participantCard) return false;
        if (params?.needsRetraining && !g.needsRetraining) return false;
        return true;
      });
    }
  },

  async saveGrade(grade: Partial<ParticipantGrade>): Promise<ParticipantGrade> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(grade)
      });
      if (!res.ok) throw new Error('Error al guardar calificación');
      return res.json();
    } else {
      const grades: ParticipantGrade[] = safeJsonParse('ch_grades', []);
      const idx = grades.findIndex(g => g.eventId === grade.eventId && g.participantCard === grade.participantCard);
      const updated = {
        id: grade.id || `grd_${Date.now()}`,
        eventId: grade.eventId!,
        participantCard: grade.participantCard!,
        slotId: grade.slotId || null,
        score: grade.score ?? null,
        academicStatus: grade.academicStatus || (grade.score !== null && grade.score !== undefined ? (grade.score >= (grade.passingScore || 70) ? 'passed' : 'failed') : 'pending'),
        detectedSkillGaps: grade.detectedSkillGaps || [],
        weaknessesNotes: grade.weaknessesNotes || null,
        strengthsNotes: grade.strengthsNotes || null,
        needsRetraining: grade.needsRetraining ?? (grade.academicStatus === 'failed'),
        feedback: grade.feedback || null,
        gradedBy: grade.gradedBy || 'Instructor / Evaluador',
        gradedAt: new Date().toISOString()
      } as ParticipantGrade;

      if (idx > -1) {
        grades[idx] = { ...grades[idx], ...updated };
      } else {
        grades.push(updated);
      }
      localStorage.setItem('ch_grades', JSON.stringify(grades));
      return updated;
    }
  },

  async saveBulkGrades(grades: Partial<ParticipantGrade>[]): Promise<{ message: string; grades: ParticipantGrade[] }> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/grades/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades })
      });
      if (!res.ok) throw new Error('Error al guardar calificaciones masivamente');
      return res.json();
    } else {
      for (const g of grades) {
        await this.saveGrade(g);
      }
      const allGrades = safeJsonParse('ch_grades', []);
      return { message: 'Calificaciones actualizadas', grades: allGrades };
    }
  },

  async deleteGrade(id: string): Promise<void> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/grades/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar calificación');
    } else {
      const grades: ParticipantGrade[] = safeJsonParse('ch_grades', []);
      const filtered = grades.filter(g => g.id !== id);
      localStorage.setItem('ch_grades', JSON.stringify(filtered));
    }
  },

  // --- MÉTODOS DE PARTICIPANTES ---
  async getParticipants(companyId?: string): Promise<Participant[]> {
    if (isApiMode) {
      const query = companyId && companyId !== 'all' ? `?companyId=${encodeURIComponent(companyId)}` : '';
      const res = await fetch(`${API_BASE_URL}/participants${query}`);
      if (!res.ok) throw new Error('Error al obtener participantes de Postgres');
      return res.json();
    } else {
      const list: Participant[] = safeJsonParse('ch_participants', []);
      if (companyId && companyId !== 'all') {
        return list.filter(p => (p.companyId || 'emp_kasino') === companyId);
      }
      return list;
    }
  },

  async saveParticipants(participants: Participant[]): Promise<void> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/participants/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants })
      });
      if (!res.ok) throw new Error('Error al importar colaboradores masivamente en Postgres');
    } else {
      localStorage.setItem('ch_participants', JSON.stringify(participants));
    }
  },

  // --- MÉTODOS DE REGISTRO / INSCRIPCIÓN ---
  async registerToEvent(eventId: string, date: string, time: string, participantEmail: string): Promise<TrainingEvent[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, date, time, email: participantEmail })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al registrarse en Postgres');
      }
      return this.getEvents();
    } else {
      const events: TrainingEvent[] = safeJsonParse('ch_events', []);
      const updated = events.map(evt => {
        if (evt.id === eventId) {
          const updatedSchedule = evt.schedule.map(sch => {
            if (sch.date === date) {
              const updatedSlots = sch.slots.map(sl => {
                if (sl.time === time) {
                  if (sl.attendees.includes(participantEmail)) {
                    return sl; // Ya inscrito
                  }
                  return {
                    ...sl,
                    registered: sl.registered + 1,
                    attendees: [...(sl.attendees || []), participantEmail]
                  };
                }
                return sl;
              });
              return { ...sch, slots: updatedSlots };
            }
            return sch;
          });
          return { ...evt, schedule: updatedSchedule };
        }
        return evt;
      });
      localStorage.setItem('ch_events', JSON.stringify(updated));
      return updated;
    }
  },

  async bulkRegisterUsers(
    eventId: string,
    date: string,
    time: string,
    emails: string[],
    autoExpandCapacity: boolean = true
  ): Promise<{ events: TrainingEvent[]; enrolledCount: number; skippedAlreadyEnrolled: string[] }> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/registrations/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, date, time, emails, autoExpandCapacity })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al matricular usuarios masivamente');
      }
      const data = await res.json();
      return {
        events: data.events || (await this.getEvents()),
        enrolledCount: data.enrolledCount ?? emails.length,
        skippedAlreadyEnrolled: data.skippedAlreadyEnrolled || []
      };
    } else {
      const events: TrainingEvent[] = safeJsonParse('ch_events', []);
      const participants: Participant[] = safeJsonParse('ch_participants', []);
      const users: UserAccount[] = safeJsonParse('ch_users', []);
      
      let enrolledCount = 0;
      const skippedAlreadyEnrolled: string[] = [];

      const updated = events.map(evt => {
        if (evt.id === eventId) {
          const updatedSchedule = evt.schedule.map(sch => {
            if (sch.date === date) {
              const updatedSlots = sch.slots.map(sl => {
                if (sl.time === time) {
                  const existingAttendees = new Set((sl.attendees || []).map(a => a.toLowerCase()));
                  const toAdd: string[] = [];

                  for (const rawEmail of emails) {
                    const cleanEmail = rawEmail.trim().toLowerCase();
                    if (!cleanEmail) continue;

                    if (existingAttendees.has(cleanEmail)) {
                      skippedAlreadyEnrolled.push(cleanEmail);
                    } else {
                      existingAttendees.add(cleanEmail);
                      toAdd.push(cleanEmail);
                      enrolledCount++;

                      // Crear participante en padrón local si no existe
                      if (!participants.some(p => p.email.toLowerCase() === cleanEmail)) {
                        const matchedUser = users.find(u => u.email.toLowerCase() === cleanEmail);
                        participants.push({
                          card: `${Math.floor(1000 + Math.random() * 9000)}`,
                          name: matchedUser ? matchedUser.name : cleanEmail.split('@')[0].replace(/\./g, ' ').toUpperCase(),
                          email: cleanEmail,
                          cedula: matchedUser?.cedula
                        });
                      }
                    }
                  }

                  const newAttendees = [...(sl.attendees || []), ...toAdd];
                  const newRegistered = newAttendees.length;
                  const newCapacity = (autoExpandCapacity && newRegistered > sl.capacity) ? newRegistered : sl.capacity;

                  return {
                    ...sl,
                    capacity: newCapacity,
                    registered: newRegistered,
                    attendees: newAttendees
                  };
                }
                return sl;
              });
              return { ...sch, slots: updatedSlots };
            }
            return sch;
          });
          return { ...evt, schedule: updatedSchedule };
        }
        return evt;
      });

      localStorage.setItem('ch_events', JSON.stringify(updated));
      localStorage.setItem('ch_participants', JSON.stringify(participants));
      return { events: updated, enrolledCount, skippedAlreadyEnrolled };
    }
  },

  // --- ASIGNACIÓN DE EVENTOS POR PARTE DE SUPERVISORES ---
  async assignTeamMembersToEvent(
    payload: TeamAssignmentPayload
  ): Promise<{ events: TrainingEvent[]; assignedCount: number; skippedAlreadyEnrolled: string[] }> {
    const { eventId, date, time, emails, isMandatory, assignedBy, assignmentType, notes } = payload;
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/registrations/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          date,
          time,
          emails,
          isMandatory,
          assignedBy,
          assignmentType: assignmentType || (isMandatory ? 'mandatory' : 'voluntary'),
          notes
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al asignar participantes');
      }
      const data = await res.json();
      return {
        events: data.events || (await this.getEvents()),
        assignedCount: data.assignedCount ?? emails.length,
        skippedAlreadyEnrolled: data.skippedAlreadyEnrolled || []
      };
    } else {
      const events: TrainingEvent[] = safeJsonParse('ch_events', []);
      const participants: Participant[] = safeJsonParse('ch_participants', []);
      const users: UserAccount[] = safeJsonParse('ch_users', []);

      let assignedCount = 0;
      const skippedAlreadyEnrolled: string[] = [];

      const updated = events.map(evt => {
        if (evt.id === eventId) {
          const updatedSchedule = evt.schedule.map(sch => {
            if (sch.date === date) {
              const updatedSlots = sch.slots.map(sl => {
                if (sl.time === time) {
                  const existingAttendees = new Set((sl.attendees || []).map(a => a.toLowerCase()));
                  const attendeesDetails = [...(sl.attendeesDetails || [])];
                  const toAdd: string[] = [];

                  for (const rawEmail of emails) {
                    const cleanEmail = rawEmail.trim().toLowerCase();
                    if (!cleanEmail) continue;

                    if (existingAttendees.has(cleanEmail)) {
                      skippedAlreadyEnrolled.push(cleanEmail);
                      // Si ya existía, actualizar detalle si es necesario
                      const existingDetailIndex = attendeesDetails.findIndex(d => d.email.toLowerCase() === cleanEmail);
                      if (existingDetailIndex >= 0 && isMandatory) {
                        attendeesDetails[existingDetailIndex] = {
                          ...attendeesDetails[existingDetailIndex],
                          isMandatory: true,
                          assignedBy,
                          assignmentType: assignmentType || 'mandatory',
                          assignmentNotes: notes
                        };
                      }
                    } else {
                      existingAttendees.add(cleanEmail);
                      toAdd.push(cleanEmail);
                      attendeesDetails.push({
                        email: cleanEmail,
                        isMandatory,
                        assignedBy,
                        assignmentType: assignmentType || (isMandatory ? 'mandatory' : 'voluntary'),
                        assignmentNotes: notes,
                        assignedAt: new Date().toISOString()
                      });
                      assignedCount++;

                      if (!participants.some(p => p.email.toLowerCase() === cleanEmail)) {
                        const matchedUser = users.find(u => u.email.toLowerCase() === cleanEmail);
                        participants.push({
                          card: `${Math.floor(1000 + Math.random() * 9000)}`,
                          name: matchedUser ? matchedUser.name : cleanEmail.split('@')[0].replace(/\./g, ' ').toUpperCase(),
                          email: cleanEmail,
                          cedula: matchedUser?.cedula
                        });
                      }
                    }
                  }

                  const newAttendees = [...(sl.attendees || []), ...toAdd];
                  const newRegistered = newAttendees.length;
                  const newCapacity = newRegistered > sl.capacity ? newRegistered : sl.capacity;

                  return {
                    ...sl,
                    capacity: newCapacity,
                    registered: newRegistered,
                    attendees: newAttendees,
                    attendeesDetails
                  };
                }
                return sl;
              });
              return { ...sch, slots: updatedSlots };
            }
            return sch;
          });
          return { ...evt, schedule: updatedSchedule };
        }
        return evt;
      });

      localStorage.setItem('ch_events', JSON.stringify(updated));
      localStorage.setItem('ch_participants', JSON.stringify(participants));
      return { events: updated, assignedCount, skippedAlreadyEnrolled };
    }
  },

  // --- MÉTODOS DE CANCELACIÓN DE RESERVA ---
  async cancelRegistration(
    eventId: string, 
    date: string, 
    time: string, 
    participantEmail: string,
    isSupervisorOrAdmin: boolean = false,
    force: boolean = false
  ): Promise<TrainingEvent[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/registrations`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventId, 
          date, 
          time, 
          email: participantEmail,
          isSupervisorOrAdmin,
          force 
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al cancelar inscripción');
      }
      return this.getEvents();
    } else {
      const events: TrainingEvent[] = safeJsonParse('ch_events', []);
      const updated = events.map(evt => {
        if (evt.id === eventId) {
          const updatedSchedule = evt.schedule.map(sch => {
            if (sch.date === date) {
              const updatedSlots = sch.slots.map(sl => {
                if (sl.time === time) {
                  // Verificar si es obligatorio en mock local
                  const detail = (sl.attendeesDetails || []).find(d => d.email.toLowerCase() === participantEmail.toLowerCase());
                  if (detail && detail.isMandatory && !isSupervisorOrAdmin && !force) {
                    throw new Error('Esta inscripción es obligatoria y fue asignada por tu supervisor. No puede ser cancelada.');
                  }

                  const filteredAttendees = (sl.attendees || []).filter(e => e.toLowerCase() !== participantEmail.toLowerCase());
                  const filteredAttended = (sl.attendedList || []).filter(e => e.toLowerCase() !== participantEmail.toLowerCase());
                  const filteredDetails = (sl.attendeesDetails || []).filter(d => d.email.toLowerCase() !== participantEmail.toLowerCase());
                  return {
                    ...sl,
                    registered: Math.max(0, filteredAttendees.length),
                    attendees: filteredAttendees,
                    attendedList: filteredAttended,
                    attendeesDetails: filteredDetails
                  };
                }
                return sl;
              });
              return { ...sch, slots: updatedSlots };
            }
            return sch;
          });
          return { ...evt, schedule: updatedSchedule };
        }
        return evt;
      });
      localStorage.setItem('ch_events', JSON.stringify(updated));
      return updated;
    }
  },

  // --- MÉTODOS DE ASISTENCIA PRESENCIAL (QR CHECK-IN Y CHECK-OUT) ---
  async confirmAttendance(
    eventId: string, 
    date: string, 
    time: string, 
    participantEmail: string,
    type: 'checkin' | 'checkout' = 'checkin',
    code?: string
  ): Promise<TrainingEvent[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, date, time, email: participantEmail, type, code })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al registrar asistencia');
      }
      return this.getEvents();
    } else {
      const events: TrainingEvent[] = safeJsonParse('ch_events', []);
      const cleanEmail = participantEmail.toLowerCase();
      const updated = events.map(evt => {
        if (evt.id === eventId) {
          const updatedSchedule = evt.schedule.map(sch => {
            if (sch.date === date) {
              const updatedSlots = sch.slots.map(sl => {
                if (sl.time === time) {
                  const attendedList = sl.attendedList || [];
                  const checkInList = sl.checkInList || attendedList;
                  const checkOutList = sl.checkOutList || [];
                  const completedAttendanceList = sl.completedAttendanceList || [];

                  let newCheckInList = [...checkInList];
                  let newCheckOutList = [...checkOutList];
                  let newCompletedList = [...completedAttendanceList];

                  if (type === 'checkout') {
                    if (!newCheckOutList.includes(cleanEmail)) {
                      newCheckOutList.push(cleanEmail);
                    }
                    if (!newCheckInList.includes(cleanEmail)) {
                      newCheckInList.push(cleanEmail);
                    }
                    if (!newCompletedList.includes(cleanEmail)) {
                      newCompletedList.push(cleanEmail);
                    }
                  } else {
                    if (!newCheckInList.includes(cleanEmail)) {
                      newCheckInList.push(cleanEmail);
                    }
                  }

                  return {
                    ...sl,
                    attendedList: newCheckInList,
                    checkInList: newCheckInList,
                    checkOutList: newCheckOutList,
                    completedAttendanceList: newCompletedList
                  };
                }
                return sl;
              });
              return { ...sch, slots: updatedSlots };
            }
            return sch;
          });
          return { ...evt, schedule: updatedSchedule };
        }
        return evt;
      });
      localStorage.setItem('ch_events', JSON.stringify(updated));
      return updated;
    }
  },

  async revertAttendance(
    eventId: string, 
    date: string, 
    time: string, 
    participantEmail: string,
    revertType: 'checkout' | 'all' = 'all'
  ): Promise<TrainingEvent[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/attendance/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, date, time, email: participantEmail, revertType })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al revertir asistencia');
      }
      return this.getEvents();
    } else {
      const events: TrainingEvent[] = safeJsonParse('ch_events', []);
      const cleanEmail = participantEmail.toLowerCase();
      const updated = events.map(evt => {
        if (evt.id === eventId) {
          const updatedSchedule = evt.schedule.map(sch => {
            if (sch.date === date) {
              const updatedSlots = sch.slots.map(sl => {
                if (sl.time === time) {
                  let checkInList = sl.checkInList || sl.attendedList || [];
                  let checkOutList = sl.checkOutList || [];
                  let completedList = sl.completedAttendanceList || [];

                  if (revertType === 'checkout') {
                    checkOutList = checkOutList.filter(e => e.toLowerCase() !== cleanEmail);
                    completedList = completedList.filter(e => e.toLowerCase() !== cleanEmail);
                  } else {
                    checkInList = checkInList.filter(e => e.toLowerCase() !== cleanEmail);
                    checkOutList = checkOutList.filter(e => e.toLowerCase() !== cleanEmail);
                    completedList = completedList.filter(e => e.toLowerCase() !== cleanEmail);
                  }

                  return {
                    ...sl,
                    attendedList: checkInList,
                    checkInList,
                    checkOutList,
                    completedAttendanceList: completedList
                  };
                }
                return sl;
              });
              return { ...sch, slots: updatedSlots };
            }
            return sch;
          });
          return { ...evt, schedule: updatedSchedule };
        }
        return evt;
      });
      localStorage.setItem('ch_events', JSON.stringify(updated));
      return updated;
    }
  },

  async verifyDailyCode(eventId: string, date: string, time: string, code: string): Promise<{ valid: boolean; type?: 'checkin' | 'checkout'; message?: string }> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/attendance/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, date, time, code })
      });
      return res.json();
    } else {
      const events: TrainingEvent[] = safeJsonParse('ch_events', []);
      const evt = events.find(e => e.id === eventId);
      const sch = evt?.schedule.find(s => s.date === date);
      const slot = sch?.slots.find(s => s.time === time);
      if (!slot) return { valid: false, message: 'Horario no encontrado' };

      const cleanCode = code.trim();
      if (slot.checkinCode && slot.checkinCode === cleanCode) {
        return { valid: true, type: 'checkin', message: 'Código de entrada válido' };
      } else if (slot.checkoutCode && slot.checkoutCode === cleanCode) {
        return { valid: true, type: 'checkout', message: 'Código de salida válido' };
      }
      return { valid: false, message: 'El código no coincide con este turno' };
    }
  },

  // --- MÉTODOS DE FEEDBACK / CALIFICACIÓN ---
  async submitFeedback(feedback: EventFeedback): Promise<TrainingEvent[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al enviar retroalimentación');
      }
      return this.getEvents();
    } else {
      const events: TrainingEvent[] = safeJsonParse('ch_events', []);
      const targetEvt = events.find(e => e.id === feedback.eventId);
      if (targetEvt) {
        const existingFeedbacks = targetEvt.feedbacks || [];
        const alreadySubmitted = existingFeedbacks.some(f => f.userEmail.toLowerCase() === feedback.userEmail.toLowerCase());
        if (alreadySubmitted) {
          throw new Error('Ya has completado la encuesta de satisfacción para esta capacitación. Solo se permite 1 respuesta por colaborador.');
        }
      }

      const updated = events.map(evt => {
        if (evt.id === feedback.eventId) {
          const existingFeedbacks = evt.feedbacks || [];
          return {
            ...evt,
            feedbacks: [...existingFeedbacks, { ...feedback, id: `fb_${Date.now()}` }]
          };
        }
        return evt;
      });
      localStorage.setItem('ch_events', JSON.stringify(updated));
      return updated;
    }
  },

  // --- MÉTODOS DE USUARIOS DE LA PLATAFORMA ---
  async login(identifier: string, password: string): Promise<{ user: UserAccount; token: string }> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Credenciales inválidas.');
      }
      const data = await res.json();
      if (data.token && typeof localStorage !== 'undefined') {
        localStorage.setItem('ch_token', data.token);
      }
      return data;
    } else {
      const cleanInput = identifier.trim().toLowerCase();
      const unformattedInput = cleanInput.replace(/[^a-z0-9]/g, '');
      const users: UserAccount[] = safeJsonParse('ch_users', []);
      const user = users.find(u => {
        const uEmail = u.email?.toLowerCase() || '';
        const uCedula = u.cedula ? u.cedula.toLowerCase() : '';
        const uCedulaClean = uCedula.replace(/[^a-z0-9]/g, '');
        const matchesIdentifier = 
          uEmail === cleanInput || 
          (uCedula && uCedula === cleanInput) || 
          (uCedulaClean && uCedulaClean === unformattedInput);
        return matchesIdentifier && u.password === password;
      });
      if (!user) {
        throw new Error('Credenciales incorrectas. Verifica tu correo corporativo / cédula o contraseña.');
      }
      if (user.isActive === false || user.employmentStatus === 'inactivo') {
        throw new Error('Tu cuenta se encuentra inactiva o desvinculada. Contacta al departamento de Recursos Humanos.');
      }
      const token = 'mock_jwt_token_' + Date.now();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ch_token', token);
      }
      return { user, token };
    }
  },

  async getUsers(companyId?: string): Promise<UserAccount[]> {
    if (isApiMode) {
      const query = companyId && companyId !== 'all' ? `?companyId=${encodeURIComponent(companyId)}` : '';
      const res = await fetch(`${API_BASE_URL}/users${query}`, {
        headers: getAuthHeaders(false)
      });
      if (!res.ok) throw new Error('Error al obtener usuarios de la base de datos');
      return res.json();
    } else {
      const list: UserAccount[] = safeJsonParse('ch_users', []);
      if (companyId && companyId !== 'all') {
        return list.filter(u => (u.companyId || 'emp_kasino') === companyId);
      }
      return list;
    }
  },

  async saveUsers(users: UserAccount[]): Promise<void> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/users/bulk`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ users })
      });
      if (!res.ok) throw new Error('Error al actualizar usuarios en Postgres');
    } else {
      localStorage.setItem('ch_users', JSON.stringify(users));
    }
  },

  async changePassword(userId: string, newPassword: string): Promise<UserAccount[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/password`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ newPassword })
      });
      if (!res.ok) throw new Error('Error al cambiar la contraseña en la base de datos');
      return this.getUsers();
    } else {
      const users: UserAccount[] = safeJsonParse('ch_users', []);
      const updated = users.map(u => u.id === userId ? { ...u, password: newPassword } : u);
      localStorage.setItem('ch_users', JSON.stringify(updated));
      return updated;
    }
  },

  async updateUserProfile(userId: string, profileData: Partial<UserAccount>): Promise<{ user: UserAccount; participants: Participant[]; users: UserAccount[] }> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify(profileData)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al actualizar el perfil en la base de datos');
      }
      const data = await res.json();
      const updatedUsers = await this.getUsers();
      const updatedParticipants = await this.getParticipants();
      const resolvedUser: UserAccount = data.user || updatedUsers.find(u => u.id === userId) || {
        id: userId,
        email: '',
        name: 'Colaborador',
        role: 'Colaborador (User)',
        password: '',
        ...profileData,
        profileCompleted: true
      };
      return { user: resolvedUser, users: updatedUsers, participants: updatedParticipants };
    } else {
      const users: UserAccount[] = safeJsonParse('ch_users', []);
      const participants: Participant[] = safeJsonParse('ch_participants', []);
      let updatedUser = users.find(u => u.id === userId);
      if (updatedUser) {
        updatedUser = { ...updatedUser, ...profileData, profileCompleted: true };
      } else {
        let savedSession: any = null;
        try {
          const s = localStorage.getItem('ch_logged_user');
          if (s && s !== 'undefined' && s !== 'null') savedSession = JSON.parse(s);
        } catch {}
        updatedUser = {
          id: userId,
          email: savedSession?.email || '',
          name: savedSession?.name || 'Colaborador',
          role: savedSession?.role || 'Colaborador (User)',
          password: '',
          ...profileData,
          profileCompleted: true
        };
        users.push(updatedUser);
      }
      const newUsers = users.map(u => u.id === userId ? updatedUser! : u);
      const newParticipants = participants.map(p => {
        if (updatedUser && updatedUser.email && p.email.toLowerCase() === updatedUser.email.toLowerCase()) {
          return { ...p, ...profileData, profileCompleted: true };
        }
        return p;
      });
      localStorage.setItem('ch_users', JSON.stringify(newUsers));
      localStorage.setItem('ch_participants', JSON.stringify(newParticipants));
      return { user: updatedUser, users: newUsers, participants: newParticipants };
    }
  },

  // --- MÉTODOS DE GRUPOS DE PARTICIPANTES ---
  async getGroups(companyId?: string): Promise<ParticipantGroup[]> {
    if (isApiMode) {
      const query = companyId && companyId !== 'all' ? `?companyId=${encodeURIComponent(companyId)}` : '';
      const res = await fetch(`${API_BASE_URL}/groups${query}`);
      if (!res.ok) throw new Error('Error al obtener grupos de Postgres');
      return res.json();
    } else {
      const list: ParticipantGroup[] = safeJsonParse('ch_groups', []);
      if (companyId && companyId !== 'all') {
        return list.filter(g => (g.companyId || 'emp_kasino') === companyId);
      }
      return list;
    }
  },

  async saveGroup(group: ParticipantGroup): Promise<ParticipantGroup[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(group)
      });
      if (!res.ok) throw new Error('Error al guardar grupo en Postgres');
      return this.getGroups();
    } else {
      const groups: ParticipantGroup[] = safeJsonParse('ch_groups', []);
      const idx = groups.findIndex(g => g.id === group.id);
      if (idx > -1) {
        groups[idx] = group;
      } else {
        groups.unshift(group);
      }
      localStorage.setItem('ch_groups', JSON.stringify(groups));
      return groups;
    }
  },

  async saveGroups(groups: ParticipantGroup[]): Promise<void> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/groups/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups })
      });
      if (!res.ok) throw new Error('Error al importar grupos en Postgres');
    } else {
      localStorage.setItem('ch_groups', JSON.stringify(groups));
    }
  },

  async deleteGroup(groupId: string): Promise<ParticipantGroup[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar grupo en Postgres');
      return this.getGroups();
    } else {
      const groups: ParticipantGroup[] = safeJsonParse('ch_groups', []);
      const updated = groups.filter(g => g.id !== groupId);
      localStorage.setItem('ch_groups', JSON.stringify(updated));
      return updated;
    }
  },

  // --- MÉTODOS DE PROGRAMAS / CRONOGRAMAS FORMATIVOS ---
  async getPrograms(companyId?: string): Promise<TrainingProgram[]> {
    if (isApiMode) {
      const query = companyId && companyId !== 'all' ? `?companyId=${encodeURIComponent(companyId)}` : '';
      const res = await fetch(`${API_BASE_URL}/programs${query}`);
      if (!res.ok) throw new Error('Error al obtener programas formativos de Postgres');
      return res.json();
    } else {
      const list: TrainingProgram[] = safeJsonParse('ch_programs', []);
      if (companyId && companyId !== 'all') {
        return list.filter(p => (p.companyId || 'emp_kasino') === companyId);
      }
      return list;
    }
  },

  async saveProgram(program: TrainingProgram): Promise<TrainingProgram[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/programs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(program)
      });
      if (!res.ok) throw new Error('Error al guardar programa formativo en Postgres');
      return res.json();
    } else {
      const programs: TrainingProgram[] = safeJsonParse('ch_programs', []);
      const idx = programs.findIndex(p => p.id === program.id);
      if (idx > -1) {
        programs[idx] = program;
      } else {
        programs.unshift(program);
      }
      localStorage.setItem('ch_programs', JSON.stringify(programs));
      return programs;
    }
  },

  async deleteProgram(programId: string): Promise<TrainingProgram[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/programs/${programId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar programa formativo en Postgres');
      return res.json();
    } else {
      const programs: TrainingProgram[] = safeJsonParse('ch_programs', []);
      const updated = programs.filter(p => p.id !== programId);
      localStorage.setItem('ch_programs', JSON.stringify(updated));
      return updated;
    }
  },

  // --- MÉTODOS DE EMPRESAS (MULTI-TENANT) ---
  async getCompanies(): Promise<Company[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/companies`);
      if (!res.ok) throw new Error('Error al obtener empresas de Postgres');
      return res.json();
    } else {
      return safeJsonParse('ch_companies', MOCK_COMPANIES);
    }
  },

  async saveCompany(company: Company): Promise<Company[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      });
      if (!res.ok) throw new Error('Error al guardar empresa en Postgres');
      return this.getCompanies();
    } else {
      const companies: Company[] = safeJsonParse('ch_companies', MOCK_COMPANIES);
      const idx = companies.findIndex(c => c.id === company.id);
      if (idx > -1) {
        companies[idx] = company;
      } else {
        companies.push(company);
      }
      localStorage.setItem('ch_companies', JSON.stringify(companies));
      return companies;
    }
  },

  async deleteCompany(companyId: string): Promise<Company[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/companies/${companyId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar empresa en Postgres');
      return this.getCompanies();
    } else {
      const companies: Company[] = safeJsonParse('ch_companies', MOCK_COMPANIES);
      const updated = companies.filter(c => c.id !== companyId);
      localStorage.setItem('ch_companies', JSON.stringify(updated));
      return updated;
    }
  },

  // --- CÁLCULO INTELIGENTE DE CUMPLIMIENTO (CLIENT-SIDE & CROSS-PLATFORM) ---
  calculateProgramCompliance(
    program: TrainingProgram,
    events: TrainingEvent[],
    participants: Participant[],
    groups: ParticipantGroup[],
    includeAllParticipants: boolean = false
  ): ProgramComplianceSummary {
    const participantsMap = new Map(participants.map(p => [p.card, p]));
    const targetGroups = groups.filter(g => program.targetGroupIds.includes(g.id));

    // 1. Identificar todas las tarjetas de participantes objetivo
    const assignedCardsSet = new Set<string>();
    if (includeAllParticipants) {
      participants.forEach(p => assignedCardsSet.add(p.card));
    } else {
      targetGroups.forEach(g => {
        g.memberCards.forEach(c => assignedCardsSet.add(c));
      });
      (program.targetParticipantCards || []).forEach(c => assignedCardsSet.add(c));
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const isPastDeadline = program.endDate < todayStr;

    const participantsDetails: ParticipantComplianceDetail[] = [];

    assignedCardsSet.forEach(card => {
      const participant = participantsMap.get(card);
      if (!participant) return;

      const pEmail = participant.email.toLowerCase();

      // Buscar grupos a los que pertenece el participante dentro del programa
      const pGroups = targetGroups
        .filter(g => g.memberCards.includes(card))
        .map(g => g.name);

      let completedCount = 0;
      let mandatoryCompleted = 0;
      const mandatoryTotal = program.eventItems.filter(e => e.isMandatory).length;
      let hasAnyRegistration = false;

      const eventsDetail: ParticipantEventStatus[] = program.eventItems.map(item => {
        const evt = events.find(e => e.id === item.eventId);
        let attended = false;
        let registered = false;
        let attendedDate: string | undefined;
        let registeredDate: string | undefined;
        let registeredTime: string | undefined;

        if (evt) {
          evt.schedule.forEach(sch => {
            sch.slots.forEach(slot => {
              const inAttendees = slot.attendees.map(a => a.toLowerCase()).includes(pEmail);
              const inAttended = (slot.attendedList || []).map(a => a.toLowerCase()).includes(pEmail);

              if (inAttended) {
                attended = true;
                attendedDate = sch.date;
              }
              if (inAttendees) {
                registered = true;
                registeredDate = sch.date;
                registeredTime = slot.time;
              }
            });
          });
        }

        if (attended) {
          completedCount++;
          if (item.isMandatory) mandatoryCompleted++;
        }
        if (registered) {
          hasAnyRegistration = true;
        }

        return {
          eventId: item.eventId,
          isMandatory: item.isMandatory,
          attended,
          registered,
          status: attended ? 'attended' : registered ? 'registered' : 'pending',
          attendedDate,
          registeredDate,
          registeredTime
        };
      });

      // Cálculo del porcentaje (priorizando obligatorios si existen)
      let percentage = 0;
      if (mandatoryTotal > 0) {
        percentage = Math.round((mandatoryCompleted / mandatoryTotal) * 100);
      } else if (program.eventItems.length > 0) {
        percentage = Math.round((completedCount / program.eventItems.length) * 100);
      }

      // Determinar estatus de cumplimiento
      let status: ComplianceStatus = 'not_started';
      if (percentage === 100) {
        status = 'completed';
      } else if (isPastDeadline) {
        status = 'overdue';
      } else if (completedCount > 0 || hasAnyRegistration) {
        status = 'in_progress';
      } else {
        status = 'not_started';
      }

      participantsDetails.push({
        participantCard: participant.card,
        participantName: participant.name,
        participantEmail: participant.email,
        participantCedula: participant.cedula,
        groupNames: pGroups,
        totalAssignedEvents: program.eventItems.length,
        mandatoryEventsCount: mandatoryTotal,
        completedEventsCount: completedCount,
        mandatoryCompletedCount: mandatoryCompleted,
        percentage,
        status,
        eventsDetail
      });
    });

    // Ordenar participantes por estatus y porcentaje ascendente
    participantsDetails.sort((a, b) => {
      if (a.percentage !== b.percentage) return a.percentage - b.percentage;
      return a.participantName.localeCompare(b.participantName);
    });

    // Estadísticas por Grupo
    const groupStats = targetGroups.map(g => {
      const groupParticipants = participantsDetails.filter(p => g.memberCards.includes(p.participantCard));
      const totalMembers = groupParticipants.length;
      const completedMembers = groupParticipants.filter(p => p.status === 'completed').length;
      const averagePercentage = totalMembers > 0 
        ? Math.round(groupParticipants.reduce((acc, curr) => acc + curr.percentage, 0) / totalMembers) 
        : 0;

      return {
        groupId: g.id,
        groupName: g.name,
        groupColor: g.color || 'indigo',
        totalMembers,
        averagePercentage,
        completedMembers
      };
    });

    // Estadísticas Globales
    const totalParticipants = participantsDetails.length;
    const completedCount = participantsDetails.filter(p => p.status === 'completed').length;
    const inProgressCount = participantsDetails.filter(p => p.status === 'in_progress').length;
    const overdueCount = participantsDetails.filter(p => p.status === 'overdue').length;
    const notStartedCount = participantsDetails.filter(p => p.status === 'not_started').length;
    const overallPercentage = totalParticipants > 0
      ? Math.round(participantsDetails.reduce((acc, curr) => acc + curr.percentage, 0) / totalParticipants)
      : 0;

    return {
      programId: program.id,
      programTitle: program.title,
      totalParticipants,
      completedCount,
      inProgressCount,
      overdueCount,
      notStartedCount,
      overallPercentage,
      groupStats,
      participants: participantsDetails
    };
  },

  // ==========================================
  // CONFIGURACIÓN GLOBAL & FEATURE FLAGS
  // ==========================================
  getSettings: async (): Promise<SystemSettings> => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`);
      if (response.ok) {
        const data = await response.json();
        return data.settings || { ojt_plan_90d: { enabled: true, enable_702010: true, enable_calibration: true, target_ttp_days: 30 } };
      }
    } catch (e) {
      console.warn('Fallo al obtener settings de API, usando valores por defecto:', e);
    }
    return {
      ojt_plan_90d: { enabled: true, enable_702010: true, enable_calibration: true, target_ttp_days: 30 }
    };
  },

  updateOjtSettings: async (payload: Partial<OjtPlanSettings> & { updated_by?: string }): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/ojt`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Fallo al actualizar settings de OJT en API:', e);
    }
    return { success: true, ojt_plan_90d: payload };
  },

  // ==========================================
  // BITÁCORAS & CHECKLISTS OJT
  // ==========================================
  getOjtChecklists: async (companyId?: string): Promise<OjtChecklist[]> => {
    try {
      const url = companyId && companyId !== 'all' 
        ? `${API_BASE_URL}/ojt/checklists?companyId=${encodeURIComponent(companyId)}`
        : `${API_BASE_URL}/ojt/checklists`;
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Fallo al obtener checklists OJT de API:', e);
    }
    return [];
  },

  saveOjtChecklist: async (checklist: Partial<OjtChecklist>): Promise<OjtChecklist> => {
    const response = await fetch(`${API_BASE_URL}/ojt/checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checklist)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al guardar bitácora OJT');
    }
    return await response.json();
  },

  deleteOjtChecklist: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/ojt/checklists/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al eliminar bitácora OJT');
    }
  },

  // ==========================================
  // SESIONES DE CALIBRACIÓN OPS-CAPACITACIÓN
  // ==========================================
  getCalibrationSessions: async (companyId?: string): Promise<CalibrationSession[]> => {
    try {
      const url = companyId && companyId !== 'all'
        ? `${API_BASE_URL}/ojt/calibrations?companyId=${encodeURIComponent(companyId)}`
        : `${API_BASE_URL}/ojt/calibrations`;
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Fallo al obtener calibraciones de API:', e);
    }
    return [];
  },

  saveCalibrationSession: async (session: Partial<CalibrationSession>): Promise<CalibrationSession> => {
    const response = await fetch(`${API_BASE_URL}/ojt/calibrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al guardar sesión de calibración');
    }
    return await response.json();
  },

  getOjtMetrics: async (companyId?: string): Promise<OjtMetrics> => {
    try {
      const url = companyId && companyId !== 'all'
        ? `${API_BASE_URL}/ojt/metrics?companyId=${encodeURIComponent(companyId)}`
        : `${API_BASE_URL}/ojt/metrics`;
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Fallo al obtener métricas OJT de API:', e);
    }
    return {
      totalChecklists: 0,
      avgOperationalScore: 0,
      complianceRate: 0,
      firstTimeFixRate: 0,
      safetyPassRate: 0,
      estimatedTtpDays: 30,
      targetTtpDays: 30,
      theoryVsFieldGap: 0,
      avgTheoryScore: 0,
      avgFieldScore: 0,
      topFieldWeaknesses: []
    };
  },

  // ==========================================
  // CAPACITACIONES EXTERNAS (SUSTENTABILIDAD)
  // ==========================================
  getExternalTrainings: async (companyId?: string, participantCard?: string, search?: string): Promise<ExternalTraining[]> => {
    try {
      const params = new URLSearchParams();
      if (companyId && companyId !== 'all') params.append('companyId', companyId);
      if (participantCard) params.append('participantCard', participantCard);
      if (search) params.append('search', search);

      const qs = params.toString();
      const url = qs ? `${API_BASE_URL}/external-trainings?${qs}` : `${API_BASE_URL}/external-trainings`;
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Fallo al obtener capacitaciones externas de API:', e);
    }
    return [];
  },

  createExternalTraining: async (payload: CreateExternalTrainingPayload): Promise<ExternalTraining[]> => {
    const response = await fetch(`${API_BASE_URL}/external-trainings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al registrar capacitación externa');
    }
    const data = await response.json();
    return data.records || [];
  },

  updateExternalTraining: async (id: string, payload: Partial<ExternalTraining>): Promise<ExternalTraining> => {
    const response = await fetch(`${API_BASE_URL}/external-trainings/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al actualizar capacitación externa');
    }
    return await response.json();
  },

  deleteExternalTraining: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/external-trainings/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al eliminar capacitación externa');
    }
  },

  bulkCreateExternalTrainings: async (
    trainings: CreateExternalTrainingPayload[],
    defaultCompanyId = 'emp_kasino',
    registeredBy = 'Super Administrador'
  ): Promise<{ count: number; skippedCount: number; records: ExternalTraining[]; skipped: Array<{ row: number; item: any; reason: string }> }> => {
    const response = await fetch(`${API_BASE_URL}/external-trainings/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainings, defaultCompanyId, registeredBy })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al procesar la carga masiva de capacitaciones externas');
    }
    return await response.json();
  },

  // ==========================================
  // ACADEMIA TÉCNICA (CAPACITACIONES RECURRENTES)
  // ==========================================

  getTechnicalCourses: async (companyId?: string): Promise<TechnicalAcademyCourse[]> => {
    const qs = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
    const res = await fetch(`${API_BASE_URL}/technical-academy/courses${qs}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener cursos técnicos');
    }
    return await res.json();
  },

  saveTechnicalCourse: async (course: Partial<TechnicalAcademyCourse>): Promise<{ message: string; courseId: string }> => {
    const res = await fetch(`${API_BASE_URL}/technical-academy/courses`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(course)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al guardar curso técnico');
    }
    return await res.json();
  },

  deleteTechnicalCourse: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/technical-academy/courses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(false)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al eliminar curso técnico');
    }
  },

  getTechnicalCohorts: async (companyId?: string): Promise<TechnicalAcademyCohort[]> => {
    const qs = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
    const res = await fetch(`${API_BASE_URL}/technical-academy/cohorts${qs}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener cohortes técnicas');
    }
    return await res.json();
  },

  saveTechnicalCohort: async (cohort: Partial<TechnicalAcademyCohort> & { autoEnrollGroupMembers?: boolean }): Promise<{ message: string; cohortId: string }> => {
    const res = await fetch(`${API_BASE_URL}/technical-academy/cohorts`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(cohort)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al guardar cohorte técnica');
    }
    return await res.json();
  },

  reassignTechnicalCohort: async (
    id: string,
    payload: {
      facilitatorId?: string | null;
      facilitatorName?: string;
      facilitatorEmail?: string;
      groupId?: string | null;
      groupName?: string;
      rotateGroupMembers?: boolean;
      notes?: string;
    }
  ): Promise<{ message: string; enrolledCount?: number }> => {
    const res = await fetch(`${API_BASE_URL}/technical-academy/cohorts/${encodeURIComponent(id)}/reassign`, {
      method: 'PATCH',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al reasignar cohorte');
    }
    return await res.json();
  },

  updateTechnicalCohortStatus: async (id: string, status: string): Promise<{ message: string; status: string }> => {
    const res = await fetch(`${API_BASE_URL}/technical-academy/cohorts/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar estado');
    }
    return await res.json();
  },

  deleteTechnicalCohort: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/technical-academy/cohorts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(false)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al eliminar cohorte técnica');
    }
  },

  duplicateTechnicalCohort: async (
    id: string,
    payload?: {
      newGroupId?: string | null;
      newGroupName?: string;
      newFacilitatorId?: string | null;
      newFacilitatorName?: string;
      newFacilitatorEmail?: string;
    }
  ): Promise<{ message: string; newCohortId: string; startDate: string; endDate: string }> => {
    const res = await fetch(`${API_BASE_URL}/technical-academy/cohorts/${encodeURIComponent(id)}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload || {})
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al duplicar cohorte técnica');
    }
    return await res.json();
  },

  getCohortDailyAttendance: async (cohortId: string): Promise<TechnicalCohortAttendanceMatrix> => {
    const res = await fetch(`${API_BASE_URL}/technical-academy/cohorts/${encodeURIComponent(cohortId)}/attendance`, {
      headers: getAuthHeaders(false)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al consultar asistencia de la cohorte');
    }
    return await res.json();
  },

  markCohortDailyAttendance: async (
    cohortId: string,
    payload: {
      sessionDate: string;
      records: Array<{
        participantCard: string;
        status: 'present' | 'late' | 'absent' | 'excused';
        method?: string;
        notes?: string;
      }>;
      markedBy?: string;
    }
  ): Promise<{ message: string; updatedCount: number }> => {
    const res = await fetch(`${API_BASE_URL}/technical-academy/cohorts/${encodeURIComponent(cohortId)}/attendance`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al guardar asistencia de la cohorte');
    }
    return await res.json();
  },

  checkInTechnicalQr: async (
    cohortId: string,
    payload: { identifier: string; pin?: string; sessionDate?: string }
  ): Promise<{
    success: boolean;
    message: string;
    participant: { card: string; name: string; email: string };
    sessionDate: string;
  }> => {
    const res = await fetch(`${API_BASE_URL}/technical-academy/cohorts/${encodeURIComponent(cohortId)}/qr-checkin`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al procesar asistencia por QR o PIN');
    }
    return await res.json();
  },

  getCohortParticipants: async (cohortId: string): Promise<TechnicalCohortParticipantsResponse> => {
    const res = await fetch(`${API_BASE_URL}/technical-academy/cohorts/${encodeURIComponent(cohortId)}/participants`, {
      headers: getAuthHeaders(false)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al consultar participantes de la cohorte');
    }
    return await res.json();
  },

  enrollCohortParticipants: async (
    cohortId: string,
    payload: { participantCards?: string[]; identifiers?: string[] }
  ): Promise<{ message: string; cohortId: string; newlyEnrolled: number; totalRequested: number }> => {
    const res = await fetch(`${API_BASE_URL}/technical-academy/cohorts/${encodeURIComponent(cohortId)}/participants`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al enrolar participantes en la cohorte');
    }
    return await res.json();
  },

  unenrollCohortParticipant: async (
    cohortId: string,
    participantCard: string,
    mode: 'archive' | 'hard_delete' = 'hard_delete'
  ): Promise<{ message: string; cohortId: string; participantCard: string; status?: string }> => {
    const res = await fetch(
      `${API_BASE_URL}/technical-academy/cohorts/${encodeURIComponent(cohortId)}/participants/${encodeURIComponent(participantCard)}?mode=${mode}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(false)
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al desmatricular participante de la cohorte');
    }
    return await res.json();
  },

  reassignTechnicalCourse: async (payload: {
    participantCard: string;
    prevCohortId?: string;
    newCohortId: string;
    archivePrevious?: boolean;
  }): Promise<{ message: string; participantCard: string; prevCohortId?: string; newCohortId: string }> => {
    const res = await fetch(`${API_BASE_URL}/technical-academy/assignments/reassign`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al reasignar curso técnico');
    }
    return await res.json();
  },

  saveCohortGrades: async (
    cohortId: string,
    payload: {
      grades: Array<{
        participantCard: string;
        score?: number | null;
        academicStatus?: 'passed' | 'failed' | 'pending';
        feedback?: string | null;
      }>;
      gradedBy?: string;
    }
  ): Promise<{ message: string; cohortId: string; updatedCount: number }> => {
    const res = await fetch(`${API_BASE_URL}/technical-academy/cohorts/${encodeURIComponent(cohortId)}/grades`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al guardar calificaciones de la cohorte');
    }
    return await res.json();
  },

  getTechnicalAcademyHistory: async (participantCard?: string, email?: string, companyId?: string): Promise<TechnicalAcademyHistoryRecord[]> => {
    const params = new URLSearchParams();
    if (participantCard) params.append('participantCard', participantCard);
    if (email) params.append('email', email);
    if (companyId && companyId !== 'all') params.append('companyId', companyId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/technical-academy/history${qs}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al consultar historial de academia técnica');
    }
    return await res.json();
  },

  // ==========================================
  // RESPALDOS Y MIGRACIONES DE BASE DE DATOS
  // ==========================================

  getDatabaseBackups: async (): Promise<DatabaseBackupRecord[]> => {
    const res = await fetch(`${API_BASE_URL}/admin/backups`, {
      headers: getAuthHeaders(false)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al consultar lista de respaldos');
    }
    const data = await res.json();
    return data.backups || [];
  },

  createDatabaseBackup: async (triggeredBy?: string): Promise<DatabaseBackupRecord> => {
    const res = await fetch(`${API_BASE_URL}/admin/backups`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ triggeredBy })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al generar respaldo de la base de datos');
    }
    const data = await res.json();
    return data.backup;
  },

  deleteDatabaseBackup: async (filename: string, triggeredBy?: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/admin/backups/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ triggeredBy })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al eliminar respaldo de la base de datos');
    }
    return await res.json();
  },

  restoreDatabaseBackup: async (
    filename: string,
    triggeredBy?: string
  ): Promise<{ success: boolean; message: string; safetyBackup: string }> => {
    const res = await fetch(`${API_BASE_URL}/admin/backups/${encodeURIComponent(filename)}/restore`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ confirm: true, triggeredBy })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al restaurar respaldo de la base de datos');
    }
    return await res.json();
  },

  getDatabaseStats: async (): Promise<DatabaseStats> => {
    const res = await fetch(`${API_BASE_URL}/admin/backups/stats`, {
      headers: getAuthHeaders(false)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al consultar estadísticas de la base de datos');
    }
    const data = await res.json();
    return data.stats;
  },

  getMigrationStatus: async (): Promise<MigrationStatusRecord[]> => {
    const res = await fetch(`${API_BASE_URL}/admin/migrations/status`, {
      headers: getAuthHeaders(false)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al consultar estado de migraciones');
    }
    const data = await res.json();
    return data.migrations || [];
  },

  runPendingMigrations: async (): Promise<{ success: boolean; appliedCount: number; results: MigrationStatusRecord[] }> => {
    const res = await fetch(`${API_BASE_URL}/admin/migrations/run`, {
      method: 'POST',
      headers: getAuthHeaders(true)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al ejecutar migraciones pendientes');
    }
    return await res.json();
  },

  getBackupDownloadUrl: (filename: string): string => {
    return `${API_BASE_URL}/admin/backups/${encodeURIComponent(filename)}/download`;
  }
};


