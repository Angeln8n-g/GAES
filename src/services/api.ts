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
  ComplianceStatus
} from '../types';

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
  { id: "usr_lead", email: "laura.lider@empresa.com", name: "Ing. Laura Gómez (Líder TI)", role: "Líder de Área / Supervisor", password: "123", cedula: "001-3847261-8", department: "Tecnología", assignedGroupIds: ["grp_ti"], assignedMemberCards: ["2010", "2012"] },
  { id: "usr_3", email: "juan.diez@empresa.com", name: "Juan Díez", role: "Colaborador (User)", password: "123", cedula: "031-1827364-0" },
  { id: "usr_4", email: "marta.perez@empresa.com", name: "Marta Pérez", role: "Colaborador (User)", password: "123", cedula: "223-8765432-1" }
];

// URLs del Backend (Configurables)
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const isApiMode = import.meta.env.VITE_API_MODE === 'true';

// Inicializar almacenamiento local si no existe para el modo local
const initLocalStorage = () => {
  const existingEvents = localStorage.getItem('ch_events');
  if (!existingEvents) {
    localStorage.setItem('ch_events', JSON.stringify(MOCK_EVENTS));
  } else {
    try {
      const parsed = JSON.parse(existingEvents);
      const needsMigration = parsed.some((e: any) => e.id === 'evt_1' && e.surveyUrl === undefined && e.survey_url === undefined);
      if (needsMigration) {
        localStorage.setItem('ch_events', JSON.stringify(MOCK_EVENTS));
      }
    } catch (e) {
      localStorage.setItem('ch_events', JSON.stringify(MOCK_EVENTS));
    }
  }

  const existingParticipants = localStorage.getItem('ch_participants');
  if (!existingParticipants) {
    localStorage.setItem('ch_participants', JSON.stringify(MOCK_PARTICIPANTS));
  } else {
    try {
      const parsed = JSON.parse(existingParticipants);
      if (!parsed.some((p: any) => p.cedula)) {
        localStorage.setItem('ch_participants', JSON.stringify(MOCK_PARTICIPANTS));
      }
    } catch (e) {
      localStorage.setItem('ch_participants', JSON.stringify(MOCK_PARTICIPANTS));
    }
  }
  
  const existingUsers = localStorage.getItem('ch_users');
  if (!existingUsers) {
    localStorage.setItem('ch_users', JSON.stringify(MOCK_USERS));
  } else {
    try {
      const parsed = JSON.parse(existingUsers);
      const needsMigration = parsed.some((u: any) => !u.password) || !parsed.some((u: any) => u.email === 'superadmin@empresa.com') || !parsed.some((u: any) => u.cedula);
      if (needsMigration) {
        localStorage.setItem('ch_users', JSON.stringify(MOCK_USERS));
      }
    } catch (e) {
      localStorage.setItem('ch_users', JSON.stringify(MOCK_USERS));
    }
  }

  const existingGroups = localStorage.getItem('ch_groups');
  if (!existingGroups) {
    localStorage.setItem('ch_groups', JSON.stringify(MOCK_GROUPS));
  }

  const existingPrograms = localStorage.getItem('ch_programs');
  if (!existingPrograms) {
    localStorage.setItem('ch_programs', JSON.stringify(MOCK_PROGRAMS));
  }
};

if (!isApiMode) {
  initLocalStorage();
}

export const apiService = {
  // --- MÉTODOS DE EVENTOS ---
  async getEvents(): Promise<TrainingEvent[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/events`);
      if (!res.ok) throw new Error('Error al obtener eventos de Postgres');
      return res.json();
    } else {
      return JSON.parse(localStorage.getItem('ch_events') || '[]');
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
      const events = JSON.parse(localStorage.getItem('ch_events') || '[]');
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
      const events = JSON.parse(localStorage.getItem('ch_events') || '[]');
      const filtered = events.filter((e: any) => e.id !== eventId);
      localStorage.setItem('ch_events', JSON.stringify(filtered));
      return filtered;
    }
  },

  // --- MÉTODOS DE PARTICIPANTES ---
  async getParticipants(): Promise<Participant[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/participants`);
      if (!res.ok) throw new Error('Error al obtener participantes de Postgres');
      return res.json();
    } else {
      return JSON.parse(localStorage.getItem('ch_participants') || '[]');
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
      const events: TrainingEvent[] = JSON.parse(localStorage.getItem('ch_events') || '[]');
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
      const events: TrainingEvent[] = JSON.parse(localStorage.getItem('ch_events') || '[]');
      const participants: Participant[] = JSON.parse(localStorage.getItem('ch_participants') || '[]');
      const users: UserAccount[] = JSON.parse(localStorage.getItem('ch_users') || '[]');
      
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

  // --- MÉTODOS DE CANCELACIÓN DE RESERVA ---
  async cancelRegistration(eventId: string, date: string, time: string, participantEmail: string): Promise<TrainingEvent[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/registrations`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, date, time, email: participantEmail })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al cancelar inscripción');
      }
      return this.getEvents();
    } else {
      const events: TrainingEvent[] = JSON.parse(localStorage.getItem('ch_events') || '[]');
      const updated = events.map(evt => {
        if (evt.id === eventId) {
          const updatedSchedule = evt.schedule.map(sch => {
            if (sch.date === date) {
              const updatedSlots = sch.slots.map(sl => {
                if (sl.time === time) {
                  const filteredAttendees = (sl.attendees || []).filter(e => e.toLowerCase() !== participantEmail.toLowerCase());
                  const filteredAttended = (sl.attendedList || []).filter(e => e.toLowerCase() !== participantEmail.toLowerCase());
                  return {
                    ...sl,
                    registered: Math.max(0, filteredAttendees.length),
                    attendees: filteredAttendees,
                    attendedList: filteredAttended
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

  // --- MÉTODOS DE ASISTENCIA PRESENCIAL (QR CHECK-IN) ---
  async confirmAttendance(eventId: string, date: string, time: string, participantEmail: string): Promise<TrainingEvent[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, date, time, email: participantEmail })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al registrar asistencia en Postgres');
      }
      return this.getEvents();
    } else {
      const events: TrainingEvent[] = JSON.parse(localStorage.getItem('ch_events') || '[]');
      const updated = events.map(evt => {
        if (evt.id === eventId) {
          const updatedSchedule = evt.schedule.map(sch => {
            if (sch.date === date) {
              const updatedSlots = sch.slots.map(sl => {
                if (sl.time === time) {
                  const attendedList = sl.attendedList || [];
                  if (!attendedList.includes(participantEmail)) {
                    return {
                      ...sl,
                      attendedList: [...attendedList, participantEmail]
                    };
                  }
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

  // --- MÉTODOS DE FEEDBACK / CALIFICACIÓN ---
  async submitFeedback(feedback: EventFeedback): Promise<TrainingEvent[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback)
      });
      if (!res.ok) throw new Error('Error al enviar retroalimentación');
      return this.getEvents();
    } else {
      const events: TrainingEvent[] = JSON.parse(localStorage.getItem('ch_events') || '[]');
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
  async getUsers(): Promise<UserAccount[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/users`);
      if (!res.ok) throw new Error('Error al obtener usuarios de la base de datos');
      return res.json();
    } else {
      return JSON.parse(localStorage.getItem('ch_users') || '[]');
    }
  },

  async saveUsers(users: UserAccount[]): Promise<void> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/users/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      if (!res.ok) throw new Error('Error al cambiar la contraseña en la base de datos');
      return this.getUsers();
    } else {
      const users: UserAccount[] = JSON.parse(localStorage.getItem('ch_users') || '[]');
      const updated = users.map(u => u.id === userId ? { ...u, password: newPassword } : u);
      localStorage.setItem('ch_users', JSON.stringify(updated));
      return updated;
    }
  },

  // --- MÉTODOS DE GRUPOS DE PARTICIPANTES ---
  async getGroups(): Promise<ParticipantGroup[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/groups`);
      if (!res.ok) throw new Error('Error al obtener grupos de Postgres');
      return res.json();
    } else {
      return JSON.parse(localStorage.getItem('ch_groups') || '[]');
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
      return res.json();
    } else {
      const groups: ParticipantGroup[] = JSON.parse(localStorage.getItem('ch_groups') || '[]');
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
      return res.json();
    } else {
      const groups: ParticipantGroup[] = JSON.parse(localStorage.getItem('ch_groups') || '[]');
      const updated = groups.filter(g => g.id !== groupId);
      localStorage.setItem('ch_groups', JSON.stringify(updated));
      return updated;
    }
  },

  // --- MÉTODOS DE PROGRAMAS / CRONOGRAMAS FORMATIVOS ---
  async getPrograms(): Promise<TrainingProgram[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/programs`);
      if (!res.ok) throw new Error('Error al obtener programas formativos de Postgres');
      return res.json();
    } else {
      return JSON.parse(localStorage.getItem('ch_programs') || '[]');
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
      const programs: TrainingProgram[] = JSON.parse(localStorage.getItem('ch_programs') || '[]');
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
      const programs: TrainingProgram[] = JSON.parse(localStorage.getItem('ch_programs') || '[]');
      const updated = programs.filter(p => p.id !== programId);
      localStorage.setItem('ch_programs', JSON.stringify(updated));
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
  }
};
