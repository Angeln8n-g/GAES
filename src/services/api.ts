// ==========================================
// CAPA DE SERVICIOS DE API (HÍBRIDO: LOCAL / POSTGRES)
// PROYECTO: GESTIÓN DE RESERVAS DE CAPACITACIONES
// ==========================================
// INITIAL_EVENTS, INITIAL_PARTICIPANTS, INITIAL_USERS are defined as fallback copies here to avoid circular imports.

const MOCK_EVENTS = [
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
          { time: "09:00 AM", capacity: 20, registered: 2, attendees: ["liliana.sosa@empresa.com", "luis.almazan@empresa.com"] },
          { time: "02:00 PM", capacity: 20, registered: 1, attendees: ["jesus.pech@empresa.com"] }
        ]
      },
      {
        date: "2026-07-16",
        slots: [
          { time: "10:00 AM", capacity: 15, registered: 0, attendees: [] }
        ]
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
          { time: "04:30 PM", capacity: 40, registered: 0, attendees: [] }
        ]
      }
    ]
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
          { time: "11:00 AM", capacity: 100, registered: 0, attendees: [] }
        ]
      }
    ]
  }
]

const MOCK_PARTICIPANTS = [
  { card: "2010", name: "LUIS ALBERTO ALMAZAN POOT", email: "luis.almazan@empresa.com" },
  { card: "2012", name: "LILIANA ESTHER SOSA PECH", email: "liliana.sosa@empresa.com" },
  { card: "1998", name: "FERMIN GABRIEL CHI PERERA", email: "fermin.chi@empresa.com" },
  { card: "2015", name: "JESUS RAFAEL PECH CHULIM", email: "jesus.pech@empresa.com" }
];

const MOCK_USERS = [
  { id: "usr_super", email: "superadmin@empresa.com", name: "Superusuario Principal", role: "Super Administrador", password: "admin" },
  { id: "usr_1", email: "sofia.ceo@empresa.com", name: "Sofía Martínez", role: "Super Administrador", password: "123" },
  { id: "usr_2", email: "admin.capacitacion@empresa.com", name: "Carlos Pérez", role: "Administrador / Editor", password: "123" },
  { id: "usr_3", email: "juan.diez@empresa.com", name: "Juan Díez", role: "Colaborador (User)", password: "123" },
  { id: "usr_4", email: "marta.perez@empresa.com", name: "Marta Pérez", role: "Colaborador (User)", password: "123" }
];

// URLs del Backend (Configurables)
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const isApiMode = import.meta.env.VITE_API_MODE === 'true';

// Inicializar almacenamiento local si no existe para el modo de prueba
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
  if (!localStorage.getItem('ch_participants')) {
    localStorage.setItem('ch_participants', JSON.stringify(MOCK_PARTICIPANTS));
  }
  
  const existingUsers = localStorage.getItem('ch_users');
  if (!existingUsers) {
    localStorage.setItem('ch_users', JSON.stringify(MOCK_USERS));
  } else {
    // Migración: Si algún usuario no tiene contraseña, o falta el superusuario, sobrescribimos
    try {
      const parsed = JSON.parse(existingUsers);
      const needsMigration = parsed.some((u: any) => !u.password) || !parsed.some((u: any) => u.email === 'superadmin@empresa.com');
      if (needsMigration) {
        localStorage.setItem('ch_users', JSON.stringify(MOCK_USERS));
      }
    } catch (e) {
      localStorage.setItem('ch_users', JSON.stringify(MOCK_USERS));
    }
  }
};

if (!isApiMode) {
  initLocalStorage();
}

export const apiService = {
  // --- MÉTODOS DE EVENTOS ---
  async getEvents(): Promise<any[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/events`);
      if (!res.ok) throw new Error('Error al obtener eventos de Postgres');
      return res.json();
    } else {
      return JSON.parse(localStorage.getItem('ch_events') || '[]');
    }
  },

  async saveEvents(events: any[]): Promise<void> {
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

  async saveEvent(event: any): Promise<any[]> {
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

  async deleteEvent(eventId: string): Promise<any[]> {
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
  async getParticipants(): Promise<any[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/participants`);
      if (!res.ok) throw new Error('Error al obtener participantes de Postgres');
      return res.json();
    } else {
      return JSON.parse(localStorage.getItem('ch_participants') || '[]');
    }
  },

  async saveParticipants(participants: any[]): Promise<void> {
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
  async registerToEvent(eventId: string, date: string, time: string, participantEmail: string): Promise<any[]> {
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
      const events = JSON.parse(localStorage.getItem('ch_events') || '[]');
      const updated = events.map((evt: any) => {
        if (evt.id === eventId) {
          const updatedSchedule = evt.schedule.map((sch: any) => {
            if (sch.date === date) {
              const updatedSlots = sch.slots.map((sl: any) => {
                if (sl.time === time) {
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

  // --- MÉTODOS DE USUARIOS DE LA PLATAFORMA ---
  async getUsers(): Promise<any[]> {
    if (isApiMode) {
      const res = await fetch(`${API_BASE_URL}/users`);
      if (!res.ok) throw new Error('Error al obtener usuarios de la base de datos');
      return res.json();
    } else {
      return JSON.parse(localStorage.getItem('ch_users') || '[]');
    }
  },

  async saveUsers(users: any[]): Promise<void> {
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

  // --- MÉTODOS DE ASISTENCIA PRESENCIAL (QR CHECK-IN) ---
  async confirmAttendance(eventId: string, date: string, time: string, participantEmail: string): Promise<any[]> {
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
      const events = JSON.parse(localStorage.getItem('ch_events') || '[]');
      const updated = events.map((evt: any) => {
        if (evt.id === eventId) {
          const updatedSchedule = evt.schedule.map((sch: any) => {
            if (sch.date === date) {
              const updatedSlots = sch.slots.map((sl: any) => {
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
  }
};
