import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { QRCodeSVG } from 'qrcode.react';
import { apiService } from './services/api';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Users, 
  Shield, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Grid, 
  Sliders, 
  Lock, 
  UserCheck, 
  ArrowRight,
  Filter,
  Info,
  Download,
  Bell,
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  Upload,
  QrCode,
  ScanLine,
  Printer,
  PartyPopper,
  PhoneCall,
  FileSpreadsheet,
  Eye,
  EyeOff,
  MapPin,
  BarChart3,
  TrendingUp,
  Activity,
  Award,
  Percent
} from 'lucide-react';

// --- DATOS DE PRUEBA INICIALES (MOCK DATA) ---
const INITIAL_EVENTS = [
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
          { time: "09:00 AM", capacity: 20, registered: 15, attendees: ["marta.perez@empresa.com", "juan.diez@empresa.com", "sofia.ceo@empresa.com", "carlos.perez@empresa.com"] },
          { time: "02:00 PM", capacity: 20, registered: 20, attendees: ["admin.capacitacion@empresa.com", "diego.sanchez@empresa.com"] }
        ]
      },
      {
        date: "2026-07-16",
        slots: [
          { time: "10:00 AM", capacity: 15, registered: 5, attendees: ["carlos.gonzalez@empresa.com"] }
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
          { time: "04:30 PM", capacity: 40, registered: 28, attendees: ["marta.perez@empresa.com", "juan.diez@empresa.com"] }
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
          { time: "11:00 AM", capacity: 100, registered: 85, attendees: [] }
        ]
      }
    ]
  }
];

// --- GENERADOR DE CORREOS PARA PARTICIPANTES ---
const generateEmailFromName = (fullName: string): string => {
  const clean = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .toLowerCase()
    .trim();
  const parts = clean.split(/\s+/).filter(p => p.length > 1 && p !== "del" && p !== "de" && p !== "la");
  if (parts.length >= 3) {
    return `${parts[0]}.${parts[2]}@empresa.com`;
  } else if (parts.length === 2) {
    return `${parts[0]}.${parts[1]}@empresa.com`;
  } else if (parts.length === 1) {
    return `${parts[0]}@empresa.com`;
  }
  return "colaborador@empresa.com";
};

const INITIAL_PARTICIPANTS = [
  { card: "2010", name: "LUIS ALBERTO ALMAZAN POOT", email: "luis.almazan@empresa.com" },
  { card: "2012", name: "LILIANA ESTHER SOSA PECH", email: "liliana.sosa@empresa.com" },
  { card: "1998", name: "FERMIN GABRIEL CHI PERERA", email: "fermin.chi@empresa.com" },
  { card: "2015", name: "JESUS RAFAEL PECH CHULIM", email: "jesus.pech@empresa.com" }
];

const INITIAL_USERS = [
  { id: "usr_super", email: "superadmin@empresa.com", name: "Superusuario Principal", role: "Super Administrador", password: "admin" },
  { id: "usr_1", email: "sofia.ceo@empresa.com", name: "Sofía Martínez", role: "Super Administrador", password: "123" },
  { id: "usr_2", email: "admin.capacitacion@empresa.com", name: "Carlos Pérez", role: "Administrador / Editor", password: "123" },
  { id: "usr_3", email: "juan.diez@empresa.com", name: "Juan Díez", role: "Colaborador (User)", password: "123" },
  { id: "usr_4", email: "marta.perez@empresa.com", name: "Marta Pérez", role: "Colaborador (User)", password: "123" }
];

const CATEGORIES = ["Todos", "Taller", "Curso", "Webinar", "Charla", "Cine Forum", "Evento"];
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80";

// --- LOGICA DE CALENDARIO DE JULIO DE 2026 ---
const getDaysInMonthForJuly2026 = () => {
  const startOffset = 3; // Julio 2026 comienza en Miércoles
  const totalDays = 31;
  const days = [];

  for (let i = 0; i < startOffset; i++) {
    days.push({ day: null, dateString: "" });
  }

  for (let d = 1; d <= totalDays; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    days.push({
      day: d,
      dateString: `2026-07-${dayStr}`
    });
  }

  return days;
};

export default function App() {
  const [events, setEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    const saved = localStorage.getItem('ch_logged_user');
    return saved ? JSON.parse(saved) : null;
  }); 
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [currentTab, setCurrentTab] = useState("landing"); 
  const [searchQuery, setSearchQuery] = useState("");

  // Estados de Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Controladores de Modales Públicos
  const [selectedEventForModal, setSelectedEventForModal] = useState(null);
  const [selectedDateInModal, setSelectedDateInModal] = useState(null);
  const [selectedSlotInModal, setSelectedSlotInModal] = useState(null);
  const [userEmailInput, setUserEmailInput] = useState("");
  const [showToast, setShowToast] = useState(null);

  // Controladores de Modales Administrativos
  const [attendeesModalEvent, setAttendeesModalEvent] = useState(null);
  const [notificationModalEvent, setNotificationModalEvent] = useState(null);
  const [deleteConfirmationEvent, setDeleteConfirmationEvent] = useState(null);

  // Estado de Envío de Notificaciones Simulado
  const [sendingNotificationState, setSendingNotificationState] = useState(false);

  // Estados del Formulario de Administración (Nuevo Evento)
  const [isEditing, setIsEditing] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("Taller");
  const [formInstructor, setFormInstructor] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formModality, setFormModality] = useState("Presencial");
  const [formLocation, setFormLocation] = useState("");
  const [formSurveyUrl, setFormSurveyUrl] = useState("");
  const [formSchedule, setFormSchedule] = useState([]); 
  
  // Temporal para agregar fecha/hora en el creador
  const [tempDate, setTempDate] = useState("2026-07-15");
  const [tempTime, setTempTime] = useState("10:00 AM");
  const [tempCapacity, setTempCapacity] = useState(25);

  // Nuevos Estados para la Gestión de Usuarios
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Colaborador (User)");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [showAddUserForm, setShowAddUserForm] = useState(false);

  // Nuevos Estados para la Carga de Excel
  const [excelDataPreview, setExcelDataPreview] = useState<any[] | null>(null);
  const [showExcelPreviewModal, setShowExcelPreviewModal] = useState(false);

  // Estados para el padrón de participantes
  const [participants, setParticipants] = useState(INITIAL_PARTICIPANTS);
  const [excelParticipantsPreview, setExcelParticipantsPreview] = useState<any[] | null>(null);
  const [showExcelParticipantsModal, setShowExcelParticipantsModal] = useState(false);
  const [userCardInput, setUserCardInput] = useState("");
  const [verifiedParticipant, setVerifiedParticipant] = useState<any | null>(null);

  // Estados para el Sistema de Asistencia por QR
  const [qrModalEvent, setQrModalEvent] = useState<any | null>(null);
  const [qrSelectedDate, setQrSelectedDate] = useState<string | null>(null);
  const [qrSelectedSlot, setQrSelectedSlot] = useState<string | null>(null);

  // Estados para la Vista de Check-in (Asistencia)
  const [attendanceEventId, setAttendanceEventId] = useState<string | null>(null);
  const [attendanceDate, setAttendanceDate] = useState<string | null>(null);
  const [attendanceTime, setAttendanceTime] = useState<string | null>(null);
  const [attendanceCardInput, setAttendanceCardInput] = useState("");
  const [attendanceVerified, setAttendanceVerified] = useState<any | null>(null);
  const [attendanceResult, setAttendanceResult] = useState<string | null>(null); // 'confirmed' | 'registered_and_confirmed' | 'no_space' | 'invalid_card' | null
  const [attendanceProcessing, setAttendanceProcessing] = useState(false);
  const confettiRef = useRef<HTMLCanvasElement>(null);

  const julyDays = getDaysInMonthForJuly2026();

  // Autorelleno de Email en el modal cuando cambia de usuario o evento
  useEffect(() => {
    if (currentUser) {
      setUserEmailInput(currentUser.email);
    }
  }, [currentUser, selectedEventForModal]);

  // Búsqueda en tiempo real por número de tarjeta
  useEffect(() => {
    const cardTrimmed = userCardInput.trim();
    if (cardTrimmed.length >= 4 && cardTrimmed.length <= 6 && /^\d+$/.test(cardTrimmed)) {
      const match = participants.find(p => p.card.toString().trim() === cardTrimmed);
      if (match) {
        setVerifiedParticipant(match);
      } else {
        setVerifiedParticipant(null);
      }
    } else {
      setVerifiedParticipant(null);
    }
  }, [userCardInput, participants]);

  // Carga asíncrona de datos desde el servicio de API (Mock o Postgres)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const loadedEvents = await apiService.getEvents();
        const loadedUsers = await apiService.getUsers();
        const loadedParticipants = await apiService.getParticipants();
        
        setEvents(loadedEvents);
        setUsers(loadedUsers);
        setParticipants(loadedParticipants);
        
        // Mantener sincronizado el usuario logueado
        const savedUserStr = localStorage.getItem('ch_logged_user');
        if (savedUserStr) {
          try {
            const saved = JSON.parse(savedUserStr);
            const fresh = loadedUsers.find(u => u.id === saved.id);
            if (fresh) {
              setCurrentUser(fresh);
              localStorage.setItem('ch_logged_user', JSON.stringify(fresh));
            } else {
              setCurrentUser(null);
              localStorage.removeItem('ch_logged_user');
            }
          } catch (e) {
            setCurrentUser(null);
            localStorage.removeItem('ch_logged_user');
          }
        }
      } catch (err) {
        console.error("Error cargando datos:", err);
        triggerToast("Error al inicializar la base de datos.", "error");
      }
    };
    loadInitialData();
  }, []);

  // Detección de ruta hash para asistencia por QR
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/^#\/asistencia\/([^/]+)\/([^/]+)\/(.+)$/);
      if (match) {
        const [, eventId, date, encodedTime] = match;
        const time = decodeURIComponent(encodedTime);
        setAttendanceEventId(eventId);
        setAttendanceDate(date);
        setAttendanceTime(time);
        setCurrentTab("attendance");
        setAttendanceResult(null);
        setAttendanceCardInput("");
        setAttendanceVerified(null);
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Auto-registro de asistencia para el usuario logueado al escanear QR
  useEffect(() => {
    if (currentUser && currentTab === "attendance" && attendanceEventId && attendanceDate && attendanceTime) {
      if (attendanceResult || attendanceProcessing) return;

      // Esperar a que se carguen los eventos y participantes
      if (events.length === 0 || participants.length === 0) return;

      const processAutoCheckIn = async () => {
        setAttendanceProcessing(true);
        try {
          let participant = participants.find(p => p.email.toLowerCase() === currentUser.email.toLowerCase());
          
          if (!participant) {
            // Crear participante de forma automática si no existe en el padrón
            let uniqueCard = (1000 + Math.floor(Math.random() * 9000)).toString();
            while (participants.some(p => p.card === uniqueCard)) {
              uniqueCard = (1000 + Math.floor(Math.random() * 9000)).toString();
            }
            participant = {
              card: uniqueCard,
              name: currentUser.name,
              email: currentUser.email
            };
            const updatedParticipants = [...participants, participant];
            await apiService.saveParticipants(updatedParticipants);
            setParticipants(updatedParticipants);
          }

          setAttendanceVerified(participant);

          const event = events.find(e => e.id === attendanceEventId);
          if (!event) {
            setAttendanceResult('invalid_card');
            setAttendanceProcessing(false);
            return;
          }

          const schedule = event.schedule.find(s => s.date === attendanceDate);
          const slot = schedule?.slots.find(sl => sl.time === attendanceTime);
          if (!slot) {
            setAttendanceResult('invalid_card');
            setAttendanceProcessing(false);
            return;
          }

          const isRegistered = slot.attendees && slot.attendees.includes(participant.email);
          const hasSpace = slot.registered < slot.capacity;
          const alreadyAttended = slot.attendedList && slot.attendedList.includes(participant.email);

          if (alreadyAttended) {
            setAttendanceResult('already_confirmed');
            setAttendanceProcessing(false);
            return;
          }

          if (isRegistered) {
            const updatedEvents = await apiService.confirmAttendance(attendanceEventId, attendanceDate, attendanceTime, participant.email);
            setEvents(updatedEvents);
            setAttendanceResult('confirmed');
            setTimeout(() => launchConfetti(), 300);
          } else if (hasSpace) {
            const afterRegister = await apiService.registerToEvent(attendanceEventId, attendanceDate, attendanceTime, participant.email);
            setEvents(afterRegister);
            const afterAttendance = await apiService.confirmAttendance(attendanceEventId, attendanceDate, attendanceTime, participant.email);
            setEvents(afterAttendance);
            setAttendanceResult('registered_and_confirmed');
            setTimeout(() => launchConfetti(), 300);
          } else {
            setAttendanceResult('no_space');
          }
        } catch (err) {
          console.error("Auto check-in error:", err);
          triggerToast("Error al registrar asistencia automáticamente.", "error");
        }
        setAttendanceProcessing(false);
      };
      processAutoCheckIn();
    }
  }, [currentUser, currentTab, attendanceEventId, attendanceDate, attendanceTime, events, participants, attendanceResult, attendanceProcessing]);

  // Búsqueda en tiempo real por tarjeta en vista de asistencia
  useEffect(() => {
    const cardTrimmed = attendanceCardInput.trim();
    if (cardTrimmed.length >= 4 && cardTrimmed.length <= 6 && /^\d+$/.test(cardTrimmed)) {
      const match = participants.find(p => p.card.toString().trim() === cardTrimmed);
      setAttendanceVerified(match || null);
    } else {
      setAttendanceVerified(null);
    }
  }, [attendanceCardInput, participants]);

  // --- UTILERÍA DE TOASTS ---
  const triggerToast = (message, type = "success") => {
    setShowToast({ message, type });
    setTimeout(() => {
      setShowToast(null);
    }, 4000);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ch_logged_user');
    triggerToast("Sesión cerrada correctamente", "info");
    setCurrentTab("landing");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const emailTrimmed = loginEmail.trim().toLowerCase();
    const passwordTrimmed = loginPassword.trim();

    if (!emailTrimmed || !passwordTrimmed) {
      setLoginError("Por favor completa todos los campos.");
      return;
    }

    const match = users.find(u => u.email.toLowerCase() === emailTrimmed);
    if (!match) {
      setLoginError("Usuario no encontrado.");
      return;
    }

    if (match.password !== passwordTrimmed) {
      setLoginError("Contraseña incorrecta.");
      return;
    }

    setCurrentUser(match);
    localStorage.setItem('ch_logged_user', JSON.stringify(match));
    triggerToast(`¡Bienvenido de nuevo, ${match.name}!`, "success");
    setLoginEmail("");
    setLoginPassword("");
  };

  const handleDownloadAttendeesCSV = (event) => {
    if (!event) return;

    // BOM de Excel UTF-8 para garantizar lectura de caracteres especiales
    let csvContent = "\ufeff"; 
    csvContent += "Evento;Facilitador;Categoría;Fecha;Horario;Nombre del Colaborador;Tarjeta;Correo del Inscrito;Estado de Asistencia\n";
    
    let hasAttendees = false;
    event.schedule.forEach(sch => {
      sch.slots.forEach(slot => {
        if (slot.attendees && slot.attendees.length > 0) {
          slot.attendees.forEach(email => {
            hasAttendees = true;
            const participant = participants.find(p => p.email === email);
            const name = participant ? participant.name : "No registrado";
            const card = participant ? participant.card : "N/A";
            const hasAttended = slot.attendedList && slot.attendedList.includes(email) ? "Asistió" : "Pendiente";
            
            csvContent += `"${event.title.replace(/"/g, '""')}";"${event.instructor.replace(/"/g, '""')}";"${event.category}";"${sch.date}";"${slot.time}";"${name.replace(/"/g, '""')}";"${card.replace(/"/g, '""')}";"${email.replace(/"/g, '""')}";"${hasAttended}"\n`;
          });
        }
      });
    });

    if (!hasAttendees) {
      triggerToast("No hay personas inscritas registradas en este evento todavía.", "info");
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = event.title.toLowerCase().replace(/[^a-z0-9]/g, "_");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `inscritos_${safeTitle}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    triggerToast("Descarga completada: Listado de inscritos guardado en formato CSV.", "success");
  };

  const handleDownloadAttendanceCSV = (event) => {
    if (!event) return;

    // BOM de Excel UTF-8 para garantizar lectura de caracteres especiales
    let csvContent = "\ufeff"; 
    csvContent += "Evento;Facilitador;Categoría;Fecha;Horario;Nombre del Colaborador;Tarjeta;Correo del Asistente\n";
    
    let hasAttendance = false;
    event.schedule.forEach(sch => {
      sch.slots.forEach(slot => {
        if (slot.attendedList && slot.attendedList.length > 0) {
          slot.attendedList.forEach(email => {
            hasAttendance = true;
            const participant = participants.find(p => p.email === email);
            const name = participant ? participant.name : "No registrado";
            const card = participant ? participant.card : "N/A";
            
            csvContent += `"${event.title.replace(/"/g, '""')}";"${event.instructor.replace(/"/g, '""')}";"${event.category}";"${sch.date}";"${slot.time}";"${name.replace(/"/g, '""')}";"${card.replace(/"/g, '""')}";"${email.replace(/"/g, '""')}"\n`;
          });
        }
      });
    });

    if (!hasAttendance) {
      triggerToast("No se ha registrado ninguna asistencia para este evento todavía.", "info");
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = event.title.toLowerCase().replace(/[^a-z0-9]/g, "_");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `asistencias_${safeTitle}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    triggerToast("Descarga completada: Listado de asistencia guardado en formato CSV.", "success");
  };

  const handleSendMockNotification = (event, channel) => {
    setSendingNotificationState(true);
    
    setTimeout(() => {
      setSendingNotificationState(false);
      
      let totalRecipients = 0;
      event.schedule.forEach(sch => {
        sch.slots.forEach(slot => {
          if (slot.attendees) {
            totalRecipients += slot.attendees.length;
          }
        });
      });

      if (totalRecipients === 0) {
        triggerToast("No hay destinatarios inscritos en este evento para recibir notificaciones.", "error");
        return;
      }

      const now = new Date();
      const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
      
      const history = event.notificationHistory || [];
      const updatedEvent = {
        ...event,
        notificationHistory: [
          { date: dateFormatted, channel: channel, status: "Enviado", recipients: totalRecipients },
          ...history
        ]
      };

      apiService.saveEvent(updatedEvent).then(updatedList => {
        setEvents(updatedList);
        const refreshedEvent = updatedList.find(e => e.id === event.id);
        setNotificationModalEvent(refreshedEvent);
        triggerToast(`Notificación enviada con éxito por ${channel} a ${totalRecipients} personas.`, "success");
      }).catch(err => {
        console.error(err);
        triggerToast("Error al registrar notificación en la base de datos.", "error");
      });
    }, 1200);
  };

  const handleSendSurveyNotification = (event, channel) => {
    setSendingNotificationState(true);
    
    setTimeout(() => {
      setSendingNotificationState(false);
      
      let totalRecipients = 0;
      event.schedule.forEach(sch => {
        sch.slots.forEach(slot => {
          const list = (slot.attendedList && slot.attendedList.length > 0) 
            ? slot.attendedList 
            : (slot.attendees || []);
          totalRecipients += list.length;
        });
      });

      if (totalRecipients === 0) {
        triggerToast("No hay destinatarios (asistentes o inscritos) en este evento para recibir la encuesta.", "error");
        return;
      }

      const now = new Date();
      const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
      
      const history = event.notificationHistory || [];
      const updatedEvent = {
        ...event,
        notificationHistory: [
          { date: dateFormatted, channel: `${channel} (Encuesta)`, status: "Enviado", recipients: totalRecipients },
          ...history
        ]
      };

      apiService.saveEvent(updatedEvent).then(updatedList => {
        setEvents(updatedList);
        const refreshedEvent = updatedList.find(e => e.id === event.id);
        setNotificationModalEvent(refreshedEvent);
        triggerToast(`Enlace de encuesta enviado por ${channel} a ${totalRecipients} asistentes.`, "success");
      }).catch(err => {
        console.error(err);
        triggerToast("Error al registrar el envío de la encuesta.", "error");
      });
    }, 1200);
  };

  const handleUpdateNotificationSettings = (eventId, settings) => {
    const targetEvent = events.find(e => e.id === eventId);
    if (!targetEvent) return;

    const updatedEvent = {
      ...targetEvent,
      notificationSettings: {
        ...targetEvent.notificationSettings,
        ...settings
      }
    };

    apiService.saveEvent(updatedEvent).then(updatedList => {
      setEvents(updatedList);
      const refreshedEvent = updatedList.find(e => e.id === eventId);
      setNotificationModalEvent(refreshedEvent);
      triggerToast("Preferencias de notificación guardadas.", "success");
    }).catch(err => {
      console.error(err);
      triggerToast("Error al guardar preferencias en la base de datos.", "error");
    });
  };

  // --- MANEJO DE REGISTRO DE USUARIOS ---
  const handleRegisterToEvent = (e) => {
    e.preventDefault();
    
    if (!verifiedParticipant) {
      triggerToast("Por favor ingresa un número de tarjeta válido y verificado.", "error");
      return;
    }

    if (!selectedSlotInModal) {
      triggerToast("Por favor selecciona un horario disponible", "error");
      return;
    }

    const finalizedEmail = verifiedParticipant.email;

    if (selectedSlotInModal.attendees && selectedSlotInModal.attendees.includes(finalizedEmail)) {
      triggerToast(`El colaborador ya se encuentra registrado con la tarjeta ${verifiedParticipant.card}.`, "info");
      return;
    }

    apiService.registerToEvent(selectedEventForModal.id, selectedDateInModal, selectedSlotInModal.time, finalizedEmail)
      .then(updatedList => {
        setEvents(updatedList);
        
        const freshEvent = updatedList.find(e => e.id === selectedEventForModal.id);
        setSelectedEventForModal(freshEvent);
        
        const freshSchedule = freshEvent.schedule.find(s => s.date === selectedDateInModal);
        const freshSlot = freshSchedule.slots.find(sl => sl.time === selectedSlotInModal.time);
        setSelectedSlotInModal(freshSlot);

        triggerToast(`¡Inscripción exitosa para ${verifiedParticipant.name}!`, "success");
        
        setUserCardInput("");
        setVerifiedParticipant(null);
      })
      .catch(err => {
        console.error(err);
        triggerToast("Error al registrar inscripción en la base de datos.", "error");
      });
  };

  const addScheduleItemToForm = () => {
    if (!tempDate || !tempTime) {
      triggerToast("Por favor selecciona una fecha y una hora válidas", "error");
      return;
    }

    const existingDateIndex = formSchedule.findIndex(item => item.date === tempDate);

    if (existingDateIndex > -1) {
      const timeExists = formSchedule[existingDateIndex].slots.some(s => s.time === tempTime);
      if (timeExists) {
        triggerToast("Ese horario ya está añadido para este día", "error");
        return;
      }

      // Evitamos mutación directa actualizando inmutablemente
      const updatedSchedule = formSchedule.map((item, idx) => {
        if (idx === existingDateIndex) {
          return {
            ...item,
            slots: [
              ...item.slots,
              {
                time: tempTime,
                capacity: tempCapacity || 10,
                registered: 0,
                attendees: []
              }
            ]
          };
        }
        return item;
      });
      setFormSchedule(updatedSchedule);
    } else {
      setFormSchedule([
        ...formSchedule,
        {
          date: tempDate,
          slots: [{
            time: tempTime,
            capacity: tempCapacity || 10,
            registered: 0,
            attendees: []
          }]
        }
      ]);
    }
    triggerToast("Horario agregado al listado temporal");
  };

  const removeScheduleItemFromForm = (dateIndex, slotIndex) => {
    const updatedSchedule = formSchedule.map((item, dIdx) => {
      if (dIdx === dateIndex) {
        return {
          ...item,
          slots: item.slots.filter((_, sIdx) => sIdx !== slotIndex)
        };
      }
      return item;
    }).filter(item => item.slots.length > 0);
    
    setFormSchedule(updatedSchedule);
  };

  const handleSaveEvent = (e) => {
    e.preventDefault();
    
    if (!formTitle.trim()) {
      triggerToast("Por favor llena el título del evento.", "error");
      return;
    }
    if (formSchedule.length === 0) {
      triggerToast("Debes añadir al menos una fecha y hora de evento", "error");
      return;
    }

    const finalInstructor = formInstructor.trim() || "Staff de Capacitación";
    const finalDescription = formDescription.trim() || "Actividad corporativa programada por el departamento de desarrollo. Regístrate para reservar tu lugar.";
    const finalLocation = formLocation.trim() || (formModality === "Virtual" ? "Enlace Virtual" : "Instalaciones de la Empresa");

    const eventPayload: any = {
      id: isEditing ? editingEventId : `evt_${Date.now()}`,
      title: formTitle,
      description: finalDescription,
      category: formCategory,
      instructor: finalInstructor,
      imageUrl: formImageUrl.trim() || FALLBACK_IMAGE,
      status: "active",
      modality: formModality,
      location: finalLocation,
      surveyUrl: formSurveyUrl.trim(),
      notificationSettings: isEditing 
        ? events.find(e => e.id === editingEventId)?.notificationSettings 
        : { sendEmail: true, sendTeams: true, customMessage: `Estimado colaborador, te recordamos que mañana inicia el taller '[EVENT_TITLE]'. ¡Te esperamos!` },
      notificationHistory: isEditing 
        ? events.find(e => e.id === editingEventId)?.notificationHistory 
        : [],
      schedule: formSchedule
    };

    apiService.saveEvent(eventPayload).then(updatedList => {
      setEvents(updatedList);
      triggerToast(isEditing ? "¡Evento actualizado exitosamente!" : "¡Nuevo evento publicado exitosamente!");
      resetAdminForm();
    }).catch(err => {
      console.error(err);
      triggerToast("Error al guardar el evento en la base de datos.", "error");
    });
  };

  const startEditEvent = (evt) => {
    setIsEditing(true);
    setEditingEventId(evt.id);
    setFormTitle(evt.title);
    setFormDescription(evt.description);
    setFormCategory(evt.category);
    setFormInstructor(evt.instructor);
    setFormImageUrl(evt.imageUrl);
    setFormModality(evt.modality || "Presencial");
    setFormLocation(evt.location || "");
    setFormSurveyUrl(evt.surveyUrl || evt.survey_url || "");
    setFormSchedule(JSON.parse(JSON.stringify(evt.schedule))); 
  };

  const resetAdminForm = () => {
    setIsEditing(false);
    setEditingEventId(null);
    setFormTitle("");
    setFormDescription("");
    setFormCategory("Taller");
    setFormInstructor("");
    setFormImageUrl("");
    setFormModality("Presencial");
    setFormLocation("");
    setFormSurveyUrl("");
    setFormSchedule([]);
  };

  const executeDeleteEvent = (eventId) => {
    apiService.deleteEvent(eventId).then(updatedList => {
      setEvents(updatedList);
      triggerToast("Evento eliminado permanentemente", "info");
      if (editingEventId === eventId) {
        resetAdminForm();
      }
      setDeleteConfirmationEvent(null);
    }).catch(err => {
      console.error(err);
      triggerToast("Error al eliminar el evento de la base de datos.", "error");
    });
  };

  // --- GESTIÓN DE USUARIOS (SUPER ADMINISTRADOR) ---
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      triggerToast("Por favor completa el nombre y correo del usuario.", "error");
      return;
    }

    const emailExists = users.some(u => u.email.toLowerCase() === newUserEmail.trim().toLowerCase());
    if (emailExists) {
      triggerToast("El correo ya está registrado por otro usuario.", "error");
      return;
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim().toLowerCase(),
      role: newUserRole,
      password: newUserPassword.trim() || "123456" // Contraseña por defecto si se deja vacía
    };

    const updatedUsers = [...users, newUser];

    apiService.saveUsers(updatedUsers).then(() => {
      setUsers(updatedUsers);
      triggerToast(`Usuario ${newUser.name} agregado correctamente.`);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("Colaborador (User)");
      setNewUserPassword("");
      setShowAddUserForm(false);
    }).catch(err => {
      console.error(err);
      triggerToast("Error al registrar usuario en la base de datos.", "error");
    });
  };

  const handleRemoveUser = (userId: string) => {
    if (userId === currentUser.id) {
      triggerToast("No puedes eliminar tu propio usuario activo.", "error");
      return;
    }

    const userToRemove = users.find(u => u.id === userId);
    if (!userToRemove) return;

    const filtered = users.filter(u => u.id !== userId);

    apiService.saveUsers(filtered).then(() => {
      setUsers(filtered);
      triggerToast(`Usuario ${userToRemove.name} eliminado de la plataforma.`);
    }).catch(err => {
      console.error(err);
      triggerToast("Error al eliminar usuario de la base de datos.", "error");
    });
  };

  // --- CARGA DE EXCEL COMO DATASOURCE ---
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const rawRows = XLSX.utils.sheet_to_json<any>(ws);
        
        if (rawRows.length === 0) {
          triggerToast("El archivo Excel está vacío o no tiene un formato válido.", "error");
          return;
        }

        const firstRow = rawRows[0];
        const hasRequiredCols = ["Título", "Fecha", "Hora", "Capacidad"].every(col => 
          Object.keys(firstRow).some(k => k.toLowerCase().trim() === col.toLowerCase().trim())
        );

        if (!hasRequiredCols) {
          triggerToast("El Excel debe contener columnas: 'Título', 'Fecha', 'Hora', 'Capacidad'.", "error");
          return;
        }

        setExcelDataPreview(rawRows);
        setShowExcelPreviewModal(true);
        e.target.value = "";
      } catch (err) {
        console.error(err);
        triggerToast("Error al leer el archivo Excel. Asegúrate de que sea un archivo válido.", "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportExcelData = () => {
    if (!excelDataPreview) return;

    try {
      const groupedEvents: { [title: string]: any } = {};

      excelDataPreview.forEach((row: any) => {
        const findVal = (names: string[], defaultVal: any = "") => {
          const key = Object.keys(row).find(k => names.includes(k.toLowerCase().trim()));
          return key ? row[key] : defaultVal;
        };

        const title = findVal(["título", "titulo", "title"]).toString().trim();
        const description = findVal(["descripción", "descripcion", "description", "desc"]).toString().trim() || "Sin descripción disponible.";
        const category = findVal(["categoría", "categoria", "category"], "Taller").toString().trim();
        const instructor = findVal(["facilitador", "instructor", "ponente"], "Staff de Capacitación").toString().trim();
        const imageUrl = findVal(["imagenurl", "imageurl", "imagen", "image"]).toString().trim() || FALLBACK_IMAGE;
        const modality = findVal(["modalidad", "modality"], "Presencial").toString().trim();
        const location = findVal(["lugar", "location", "lugar_evento", "ubicacion", "ubicación"], "").toString().trim() || (modality === "Virtual" ? "Enlace Virtual" : "Instalaciones de la Empresa");
        
        const dateRaw = findVal(["fecha", "date"]);
        let date = "2026-07-15";
        if (dateRaw) {
          if (typeof dateRaw === "number") {
            const dateObj = new Date((dateRaw - 25569) * 86400 * 1000);
            const y = dateObj.getFullYear();
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            date = `${y}-${m}-${d}`;
          } else {
            const parsedDate = new Date(dateRaw);
            if (!isNaN(parsedDate.getTime())) {
              const y = parsedDate.getFullYear() || 2026;
              const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
              const d = String(parsedDate.getDate()).padStart(2, '0');
              date = `${y}-${m}-${d}`;
            } else {
              date = dateRaw.toString().trim();
            }
          }
        }

        const time = findVal(["hora", "horario", "time"], "10:00 AM").toString().trim();
        const capacity = parseInt(findVal(["capacidad", "cupos", "capacity"], 20)) || 20;

        if (!title) return;

        if (!groupedEvents[title]) {
          groupedEvents[title] = {
            id: `evt_xl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            title,
            description,
            category,
            instructor,
            imageUrl,
            status: "active",
            modality,
            location,
            notificationSettings: {
              sendEmail: true,
              sendTeams: true,
              customMessage: `Estimado colaborador, te recordamos que mañana inicia el taller '[EVENT_TITLE]' facilitado por [INSTRUCTOR]. ¡Te esperamos!`
            },
            notificationHistory: [],
            schedule: []
          };
        }

        const event = groupedEvents[title];
        
        let scheduleDay = event.schedule.find((s: any) => s.date === date);
        if (!scheduleDay) {
          scheduleDay = { date, slots: [] };
          event.schedule.push(scheduleDay);
        }

        let slot = scheduleDay.slots.find((sl: any) => sl.time === time);
        if (!slot) {
          slot = { time, capacity, registered: 0, attendees: [] };
          scheduleDay.slots.push(slot);
        } else {
          slot.capacity = capacity;
        }
      });

      const newEventsList = Object.values(groupedEvents);

      if (newEventsList.length === 0) {
        triggerToast("No se pudieron procesar eventos válidos del archivo.", "error");
        return;
      }

      const mergedEvents = [...newEventsList, ...events];
      apiService.saveEvents(mergedEvents).then(() => {
        setEvents(mergedEvents);
        triggerToast(`¡Éxito! Se importaron ${newEventsList.length} eventos nuevos desde Excel.`);
        setShowExcelPreviewModal(false);
        setExcelDataPreview(null);
      }).catch(err => {
        console.error(err);
        triggerToast("Error al guardar eventos importados en la base de datos.", "error");
      });
    } catch (err) {
      console.error(err);
      triggerToast("Error al importar los datos del Excel. Verifica los tipos de datos.", "error");
    }
  };

  // --- CARGA DE PARTICIPANTES COMO DATASOURCE ---
  const handleParticipantsExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const rawRows = XLSX.utils.sheet_to_json<any>(ws);
        
        if (rawRows.length === 0) {
          triggerToast("El archivo Excel está vacío o no tiene un formato válido.", "error");
          return;
        }

        const firstRow = rawRows[0];
        const hasCardCol = Object.keys(firstRow).some(k => 
          ["tarjeta emp", "tarjeta", "card", "tarjetaemp"].includes(k.toLowerCase().trim())
        );
        const hasNameCol = Object.keys(firstRow).some(k => 
          ["nombre empleado", "nombre", "name", "empleado"].includes(k.toLowerCase().trim())
        );

        if (!hasCardCol || !hasNameCol) {
          triggerToast("El Excel de participantes debe contener al menos las columnas: 'Tarjeta Emp' y 'Nombre Empleado'.", "error");
          return;
        }

        setExcelParticipantsPreview(rawRows);
        setShowExcelParticipantsModal(true);
        e.target.value = "";
      } catch (err) {
        console.error(err);
        triggerToast("Error al leer el archivo Excel. Asegúrate de que sea un archivo válido.", "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportParticipantsData = () => {
    if (!excelParticipantsPreview) return;

    try {
      const parsedParticipants = excelParticipantsPreview.map((row: any) => {
        const findVal = (names: string[], defaultVal: any = "") => {
          const key = Object.keys(row).find(k => names.includes(k.toLowerCase().trim()));
          return key ? row[key] : defaultVal;
        };

        const cardRaw = findVal(["tarjeta emp", "tarjeta", "card", "tarjetaemp"]);
        const name = findVal(["nombre empleado", "nombre", "name", "empleado"]).toString().trim();
        const card = cardRaw.toString().trim();
        
        let email = findVal(["correo", "email", "mail"]).toString().trim();
        if (!email && name) {
          email = generateEmailFromName(name);
        }

        return { card, name, email };
      }).filter(p => p.card && p.name);

      if (parsedParticipants.length === 0) {
        triggerToast("No se encontraron registros válidos de participantes en el Excel.", "error");
        return;
      }

      apiService.saveParticipants(parsedParticipants).then(() => {
        setParticipants(parsedParticipants);
        triggerToast(`¡Éxito! Se importó un padrón de ${parsedParticipants.length} participantes desde Excel.`);
        setShowExcelParticipantsModal(false);
        setExcelParticipantsPreview(null);
      }).catch(err => {
        console.error(err);
        triggerToast("Error al guardar participantes importados en la base de datos.", "error");
      });
    } catch (err) {
      console.error(err);
      triggerToast("Error al importar el padrón de participantes. Verifica los datos.", "error");
    }
  };

  const handleRoleChange = (userId, newRole) => {
    if (userId === currentUser.id && newRole !== "Super Administrador" && newRole !== "Administrador / Editor") {
      triggerToast("No puedes quitarte los permisos de administrador a ti mismo.", "error");
      return;
    }

    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, role: newRole };
      }
      return u;
    });
    setUsers(updatedUsers);
    apiService.saveUsers(updatedUsers).catch(err => console.error("Error al actualizar rol en la base de datos:", err));

    const freshCurrentUser = updatedUsers.find(u => u.id === currentUser.id);
    if (freshCurrentUser) {
      setCurrentUser(freshCurrentUser);
      localStorage.setItem('ch_logged_user', JSON.stringify(freshCurrentUser));
    }

    triggerToast("Rol de usuario actualizado");
  };
  // --- FUNCIONES DE ASISTENCIA POR QR ---
  const getAttendanceUrl = (eventId: string, date: string, time: string) => {
    const base = window.location.origin + window.location.pathname;
    return `${base}#/asistencia/${eventId}/${date}/${encodeURIComponent(time)}`;
  };

  const launchConfetti = () => {
    const canvas = confettiRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';

    const particles: any[] = [];
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#3b82f6'];
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: Math.random() * -18 - 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.35,
        opacity: 1
      });
    }

    let frame = 0;
    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.vy += p.gravity;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, p.opacity - 0.008);
        if (p.opacity > 0 && p.y < canvas.height + 50) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });
      if (alive && frame < 200) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
      }
    };
    requestAnimationFrame(animate);
  };

  const handleAttendanceCheckIn = async () => {
    if (!attendanceVerified || !attendanceEventId || !attendanceDate || !attendanceTime) return;
    
    setAttendanceProcessing(true);
    
    const event = events.find(e => e.id === attendanceEventId);
    if (!event) {
      setAttendanceResult('invalid_card');
      setAttendanceProcessing(false);
      return;
    }

    const schedule = event.schedule.find(s => s.date === attendanceDate);
    const slot = schedule?.slots.find(sl => sl.time === attendanceTime);
    if (!slot) {
      setAttendanceResult('invalid_card');
      setAttendanceProcessing(false);
      return;
    }

    const isRegistered = slot.attendees && slot.attendees.includes(attendanceVerified.email);
    const hasSpace = slot.registered < slot.capacity;
    const alreadyAttended = slot.attendedList && slot.attendedList.includes(attendanceVerified.email);

    if (alreadyAttended) {
      setAttendanceResult('already_confirmed');
      setAttendanceProcessing(false);
      return;
    }

    if (isRegistered) {
      // Está inscrito → confirmar asistencia
      try {
        const updatedEvents = await apiService.confirmAttendance(attendanceEventId, attendanceDate, attendanceTime, attendanceVerified.email);
        setEvents(updatedEvents);
        setAttendanceResult('confirmed');
        setTimeout(() => launchConfetti(), 300);
      } catch (err) {
        console.error(err);
        triggerToast("Error al registrar asistencia.", "error");
      }
    } else if (hasSpace) {
      // No inscrito pero hay cupo → registrar + confirmar
      try {
        const afterRegister = await apiService.registerToEvent(attendanceEventId, attendanceDate, attendanceTime, attendanceVerified.email);
        setEvents(afterRegister);
        const afterAttendance = await apiService.confirmAttendance(attendanceEventId, attendanceDate, attendanceTime, attendanceVerified.email);
        setEvents(afterAttendance);
        setAttendanceResult('registered_and_confirmed');
        setTimeout(() => launchConfetti(), 300);
      } catch (err) {
        console.error(err);
        triggerToast("Error al procesar la inscripción y asistencia.", "error");
      }
    } else {
      // No inscrito y sin cupo
      setAttendanceResult('no_space');
    }
    setAttendanceProcessing(false);
  };

  const handlePrintQR = () => {
    window.print();
  };

  const handleExitAttendance = () => {
    window.location.hash = '';
    setCurrentTab("landing");
    setAttendanceEventId(null);
    setAttendanceDate(null);
    setAttendanceTime(null);
    setAttendanceResult(null);
    setAttendanceCardInput("");
    setAttendanceVerified(null);
  };

  const filteredEvents = events.filter(evt => {
    const matchesCategory = selectedCategory === "Todos" || evt.category === selectedCategory;
    const matchesSearch = evt.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          evt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          evt.instructor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans select-none">
        {/* Glow ambient effects */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl -z-10 animate-pulse duration-[6000ms]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -z-10 animate-pulse duration-[8000ms]"></div>

        {/* Outer Card */}
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800/80 p-8 rounded-3xl w-full max-w-md shadow-2xl space-y-6 relative z-10 animate-fadeIn">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/10">
              <BookOpen size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Capacita<span className="text-indigo-400">Hub</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-1">Desarrollo y Formación de Talento</p>
            </div>
          </div>

          <div className="h-[1px] bg-slate-800"></div>

          {/* Contexto de Asistencia QR */}
          {currentTab === "attendance" && attendanceEventId && (() => {
            const pendingEvent = events.find(e => e.id === attendanceEventId);
            if (pendingEvent) {
              return (
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl text-indigo-300 text-xs text-center space-y-1.5 animate-fadeIn">
                  <span className="font-bold uppercase tracking-wider text-[9px] text-indigo-400 block">Acceso de Asistencia</span>
                  <p>Inicia sesión para registrar automáticamente tu asistencia al evento:</p>
                  <p className="font-bold text-white text-sm mt-1">“{pendingEvent.title}”</p>
                </div>
              );
            }
            return null;
          })()}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs rounded-xl flex items-center gap-2.5 animate-shake">
                <AlertTriangle size={16} className="text-rose-400 flex-shrink-0" />
                <span className="font-semibold">{loginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block">Correo Corporativo</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    if (loginError) setLoginError("");
                  }}
                  placeholder="ejemplo@empresa.com"
                  className="w-full bg-slate-800/40 hover:bg-slate-800/60 focus:bg-slate-800 border border-slate-700/80 focus:border-indigo-500 text-slate-100 text-sm pl-10 pr-4 py-3 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block">Contraseña</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (loginError) setLoginError("");
                  }}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/40 hover:bg-slate-800/60 focus:bg-slate-800 border border-slate-700/80 focus:border-indigo-500 text-slate-100 text-sm pl-10 pr-10 py-3 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/15 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Acceder al Sistema</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Demo Accs */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <Info size={13} className="text-indigo-400" />
              Cuentas de prueba (Clic para rellenar)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              {users.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setLoginEmail(u.email);
                    setLoginPassword(u.password);
                    setLoginError("");
                  }}
                  className="text-left bg-slate-800/30 hover:bg-indigo-600/10 border border-slate-800 hover:border-indigo-500/30 p-2 rounded-xl transition-all text-[10px] cursor-pointer group"
                >
                  <div className="font-semibold text-slate-200 group-hover:text-indigo-300 leading-tight truncate">{u.name}</div>
                  <div className="text-slate-400 text-[9px] truncate">{u.role}</div>
                  <div className="text-slate-500 text-[8px] mt-0.5 font-mono">Pass: {u.password}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 mt-6 text-center">
          © {new Date().getFullYear()} CapacitaHub — Todos los derechos reservados.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* --- TOAST DE NOTIFICACIONES --- */}
      {showToast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl transition-all transform translate-y-0 animate-bounce duration-300 ${
          showToast.type === "error" ? "bg-rose-600 text-white" : 
          showToast.type === "info" ? "bg-amber-500 text-slate-950" : 
          "bg-emerald-600 text-white"
        }`}>
          {showToast.type === "error" ? <X size={20} /> : <Check size={20} />}
          <span className="font-medium text-sm">{showToast.message}</span>
        </div>
      )}


      {/* --- CABECERA PRINCIPAL (NAVBAR) --- */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-2">
          
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-shrink-0" onClick={() => setCurrentTab("landing")}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 flex-shrink-0">
              <BookOpen size={20} className="stroke-2 sm:w-[22px] sm:h-[22px]" />
            </div>
            <div>
              <h1 className="text-sm sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-1">
                Capacita<span className="text-indigo-600">Hub</span>
              </h1>
              <p className="text-[9px] sm:text-xs text-slate-500 font-medium">Desarrollo y Formación</p>
            </div>
          </div>

          {currentTab === "landing" && (
            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Buscar talleres, webinars, facilitadores..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-sm text-slate-800 pl-10 pr-4 py-2 rounded-full border-0 focus:ring-2 focus:ring-indigo-600 transition-all placeholder:text-slate-400"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </span>
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-3">
            <button 
              onClick={() => setCurrentTab("landing")}
              className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                currentTab === "landing" 
                  ? "text-indigo-600 bg-indigo-50" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <BookOpen size={14} className="sm:hidden" />
              <span className="hidden sm:inline">Catálogo de Eventos</span>
              <span className="sm:hidden">Catálogo</span>
            </button>

            {currentUser.role === "Super Administrador" && (
              <button 
                onClick={() => setCurrentTab("dashboard")}
                className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  currentTab === "dashboard" 
                    ? "text-purple-700 bg-purple-50 border border-purple-200" 
                    : "text-slate-600 hover:text-purple-700 hover:bg-purple-50/50"
                }`}
              >
                <BarChart3 size={14} />
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Métricas</span>
              </button>
            )}

            {(currentUser.role === "Super Administrador" || currentUser.role === "Administrador / Editor") && (
              <button 
                onClick={() => setCurrentTab("admin")}
                className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  currentTab === "admin" 
                    ? "text-slate-950 bg-slate-100 border border-slate-300" 
                    : "text-white bg-slate-900 hover:bg-slate-800 shadow-md shadow-slate-900/10"
                }`}
              >
                <Sliders size={14} />
                <span className="hidden sm:inline">Panel de Control</span>
                <span className="sm:hidden">Panel</span>
              </button>
            )}

            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3 flex-shrink-0">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-800 leading-tight">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 font-medium">{currentUser.role}</span>
              </div>
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
                currentUser.role === "Super Administrador" ? "bg-purple-600" :
                currentUser.role === "Administrador / Editor" ? "bg-amber-600" :
                "bg-slate-600"
              }`} title={`${currentUser.name} (${currentUser.role})`}>
                {currentUser.role === "Super Administrador" ? <Shield size={14} className="sm:w-[16px] sm:h-[16px]" /> : 
                 currentUser.role === "Administrador / Editor" ? <UserCheck size={14} className="sm:w-[16px] sm:h-[16px]" /> : 
                 <User size={14} className="sm:w-[16px] sm:h-[16px]" />}
              </div>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-100 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Cerrar sesión"
              >
                <Lock size={12} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- SECCIÓN PRINCIPAL DE CONTENIDO --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ========================================================= */}
        {/* VISTA 1: LANDING PAGE PÚBLICA (CATÁLOGO DE EVENTOS)        */}
        {/* ========================================================= */}
        {currentTab === "landing" && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Banner de Bienvenida */}
            <div className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-8 sm:p-12 overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-slate-950/40 to-transparent"></div>
              
              <div className="relative z-10 max-w-2xl space-y-4">
                <span className="inline-block bg-indigo-500/30 text-indigo-200 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-400/30 tracking-widest uppercase">
                  Desarrollo de Talento 2026
                </span>
                <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-none text-white">
                  Potencia tus habilidades profesionales
                </h2>
                <p className="text-slate-300 text-base sm:text-lg font-light leading-relaxed">
                  Inscríbete a nuestros talleres técnicos, charlas de bienestar, webinars de innovación y eventos de integración grupal diseñados para ti.
                </p>
                <div className="pt-2 flex flex-wrap gap-4 text-xs font-medium text-slate-300">
                  <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                    <Check size={14} className="text-indigo-400" />
                    <span>Inscripciones en un clic</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                    <Check size={14} className="text-indigo-400" />
                    <span>Control de cupos en vivo</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                    <Check size={14} className="text-indigo-400" />
                    <span>Notificaciones automáticas</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Buscador móvil */}
            <div className="md:hidden">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Buscar talleres, webinars..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white text-sm text-slate-800 pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 transition-all placeholder:text-slate-400 shadow-xs"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </span>
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold">
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Filtros por Categoría */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                  <Filter size={14} />
                  Filtrar por categoría:
                </span>
                {selectedCategory !== "Todos" && (
                  <button 
                    onClick={() => setSelectedCategory("Todos")} 
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Ver todas
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 scale-102"
                        : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grilla Dinámica de Eventos */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Grid size={18} className="text-indigo-600" />
                  Actividades Programadas ({filteredEvents.length})
                </h3>
                <p className="text-xs text-slate-500">Mostrando fechas correspondientes a Julio de 2026</p>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-xl mx-auto space-y-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <Info size={28} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">No se encontraron eventos</h4>
                  <p className="text-slate-500 text-sm">
                    No poseemos eventos bajo el criterio de búsqueda seleccionado. ¡Intenta cambiar los filtros o mantente atento!
                  </p>
                  <button 
                    onClick={() => { setSelectedCategory("Todos"); setSearchQuery(""); }} 
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    Restaurar Filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredEvents.map(evt => {
                    let totalCapacity = 0;
                    let totalRegistered = 0;
                    evt.schedule.forEach(sch => {
                      sch.slots.forEach(slot => {
                        totalCapacity += slot.capacity;
                        totalRegistered += slot.registered;
                      });
                    });
                    const remainingSlots = totalCapacity - totalRegistered;
                    const percentFilled = totalCapacity > 0 ? (totalRegistered / totalCapacity) * 100 : 0;

                    return (
                      <div 
                        key={evt.id}
                        onClick={() => {
                          setSelectedEventForModal(evt);
                          if (evt.schedule && evt.schedule.length > 0) {
                            setSelectedDateInModal(evt.schedule[0].date);
                            setSelectedSlotInModal(null);
                          }
                        }}
                        className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer flex flex-col h-full transform hover:-translate-y-1.5"
                      >
                        <div className="relative h-48 overflow-hidden bg-slate-100">
                          <img 
                            src={evt.imageUrl} 
                            alt={evt.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              if (e.currentTarget.src !== FALLBACK_IMAGE) {
                                e.currentTarget.src = FALLBACK_IMAGE;
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent"></div>
                          
                          <div className="absolute top-4 left-4 flex gap-2">
                            <span className="bg-white/95 text-slate-800 text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                              {evt.category}
                            </span>
                            <span className={`text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs ${
                              evt.modality === "Virtual" ? "bg-cyan-600/90" :
                              evt.modality === "Híbrido" ? "bg-amber-600/90" : "bg-emerald-600/90"
                            }`}>
                              {evt.modality || "Presencial"}
                            </span>
                          </div>

                          <div className="absolute bottom-4 left-4 right-4 text-white">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
                              <CalendarIcon size={12} className="text-indigo-400" />
                              <span>{evt.schedule.length} {evt.schedule.length > 1 ? 'Fechas' : 'Fecha'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                              {evt.title}
                            </h4>
                            <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                              {evt.description}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-100 space-y-2.5">
                            <div className="flex items-center gap-2 text-xs text-slate-650">
                              <User size={13} className="text-slate-400" />
                              <span className="font-semibold text-slate-700">{evt.instructor}</span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                              <span className="truncate">{evt.location || "Instalaciones"}</span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold">
                                <span className={remainingSlots === 0 ? "text-rose-500" : "text-slate-500"}>
                                  {remainingSlots === 0 ? "¡Lleno total!" : `${remainingSlots} cupos disponibles`}
                                </span>
                                <span className="text-slate-400">{totalRegistered}/{totalCapacity} inscritos</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    remainingSlots === 0 ? "bg-rose-500" :
                                    percentFilled > 80 ? "bg-amber-500" : "bg-indigo-600"
                                  }`}
                                  style={{ width: `${percentFilled}%` }}
                                ></div>
                              </div>
                            </div>

                            <div className="flex items-center justify-end text-xs font-bold text-indigo-600 pt-1 group-hover:translate-x-1 transition-transform">
                              <span>Reservar Lugar</span>
                              <ArrowRight size={14} className="ml-1" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VISTA: DASHBOARD DEL SUPER ADMINISTRADOR                  */}
        {/* ========================================================= */}
        {currentTab === "dashboard" && currentUser.role === "Super Administrador" && (() => {
          const totalEvents = events.length;
          let totalRegistered = 0;
          let totalCapacity = 0;
          let totalAttended = 0;
          const categoryCounts: { [key: string]: number } = {};
          const modalityCounts: { [key: string]: number } = { Presencial: 0, Virtual: 0, Híbrido: 0 };
          const recentLogs: Array<{ name: string; email: string; eventTitle: string; date: string; time: string }> = [];

          events.forEach(evt => {
            const mod = evt.modality || "Presencial";
            modalityCounts[mod] = (modalityCounts[mod] || 0) + 1;
            categoryCounts[evt.category] = (categoryCounts[evt.category] || 0) + 1;

            evt.schedule.forEach(sch => {
              sch.slots.forEach(slot => {
                totalRegistered += slot.registered || 0;
                totalCapacity += slot.capacity || 0;
                const attended = slot.attendedList ? slot.attendedList.length : 0;
                totalAttended += attended;

                if (slot.attendedList) {
                  slot.attendedList.forEach((email: string) => {
                    const match = participants.find(p => p.email.toLowerCase() === email.toLowerCase());
                    recentLogs.push({
                      name: match ? match.name : email.split("@")[0].toUpperCase(),
                      email,
                      eventTitle: evt.title,
                      date: sch.date,
                      time: slot.time
                    });
                  });
                }
              });
            });
          });

          const displayLogs = [...recentLogs].reverse().slice(0, 5);
          const attendanceRate = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;
          const occupancyRate = totalCapacity > 0 ? Math.round((totalRegistered / totalCapacity) * 100) : 0;

          return (
            <div className="space-y-8 animate-fadeIn">
              {/* Encabezado */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10 animate-pulse duration-[8000ms]"></div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Consola de Inteligencia de Datos
                    </span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">Dashboard de Capacitaciones</h3>
                  <p className="text-xs text-slate-350 mt-1 font-medium">Monitorea en tiempo real el comportamiento, asistencia e inscripciones de la plataforma corporativa.</p>
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <span className="bg-purple-600/35 border border-purple-500/30 text-purple-200 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm">
                    <Shield size={14} className="stroke-[2.5]" />
                    Modo: Super Administrador
                  </span>
                </div>
              </div>

              {/* Grid de KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* KPI 1: Eventos */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-slate-300 hover:shadow-md transition-all">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Eventos</span>
                    <h4 className="text-3xl font-black text-slate-900">{totalEvents}</h4>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <TrendingUp size={12} className="text-indigo-650" />
                      Programas activos
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-650 flex items-center justify-center">
                    <BookOpen size={22} />
                  </div>
                </div>

                {/* KPI 2: Inscritos */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-slate-300 hover:shadow-md transition-all">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Reservas / Inscritos</span>
                    <h4 className="text-3xl font-black text-slate-900">{totalRegistered}</h4>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Percent size={12} className="text-blue-650" />
                      {occupancyRate}% de ocupación
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users size={22} />
                  </div>
                </div>

                {/* KPI 3: Asistencias */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-slate-300 hover:shadow-md transition-all">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Asistencias Confirmadas</span>
                    <h4 className="text-3xl font-black text-slate-900">{totalAttended}</h4>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-650" />
                      Check-in por código QR
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-650 flex items-center justify-center">
                    <Check size={22} />
                  </div>
                </div>

                {/* KPI 4: Tasa de asistencia */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-slate-300 hover:shadow-md transition-all">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tasa de Asistencia</span>
                    <h4 className="text-3xl font-black text-slate-900">{attendanceRate}%</h4>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Activity size={12} className="text-purple-650" />
                      Efectividad de asistencia
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-650 flex items-center justify-center">
                    <Award size={22} />
                  </div>
                </div>

              </div>

              {/* Grid central (Gráficos y Logs) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Columna Izquierda: Ocupación y Análisis por Evento (7 Cols) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Card de Ocupación por Evento */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
                    <div>
                      <h4 className="text-md font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp size={16} className="text-indigo-650" />
                        Ocupación de Eventos (Inscritos vs Capacidad)
                      </h4>
                      <p className="text-xs text-slate-550 mt-1">Porcentaje de vacantes reservadas por cada capacitación publicada.</p>
                    </div>

                    <div className="space-y-4">
                      {events.map(evt => {
                        let regCount = 0;
                        let capCount = 0;
                        evt.schedule.forEach(s => s.slots.forEach(sl => {
                          regCount += sl.registered || 0;
                          capCount += sl.capacity || 0;
                        }));

                        const percentage = capCount > 0 ? Math.round((regCount / capCount) * 100) : 0;

                        return (
                          <div key={evt.id} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-800 truncate max-w-[280px]" title={evt.title}>
                                {evt.title}
                              </span>
                              <span className="text-slate-500 font-semibold flex-shrink-0">
                                {regCount}/{capCount} vacantes ({percentage}% ocupado)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  percentage >= 100 ? "bg-rose-500" :
                                  percentage > 75 ? "bg-amber-500" : "bg-indigo-600"
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card de Conversión Asistentes / Inscritos */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
                    <div>
                      <h4 className="text-md font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-650" />
                        Efectividad de Asistencia Real por Evento
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">Comparación de cuántos colaboradores inscritos confirmaron asistencia mediante QR.</p>
                    </div>

                    <div className="space-y-4">
                      {events.map(evt => {
                        let regCount = 0;
                        let attCount = 0;
                        evt.schedule.forEach(s => s.slots.forEach(sl => {
                          regCount += sl.registered || 0;
                          attCount += sl.attendedList ? sl.attendedList.length : 0;
                        }));

                        const attRate = regCount > 0 ? Math.round((attCount / regCount) * 100) : 0;

                        return (
                          <div key={evt.id} className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-800 truncate max-w-[280px]" title={evt.title}>
                                {evt.title}
                              </span>
                              <span className="text-slate-500 font-semibold flex-shrink-0">
                                {attCount} asistencias de {regCount} inscritos ({attRate}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-150 h-3.5 rounded-xl flex overflow-hidden p-0.5 border border-slate-200">
                              <div 
                                className="h-full bg-emerald-500 transition-all duration-500 rounded-l-lg"
                                style={{ width: `${regCount > 0 ? (attCount / regCount) * 100 : 0}%` }}
                              ></div>
                              <div 
                                className="h-full bg-slate-100 transition-all duration-500 rounded-r-lg"
                                style={{ width: `${regCount > 0 ? ((regCount - attCount) / regCount) * 100 : 100}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Columna Derecha: Participación, Categorías y Logs en vivo (5 Cols) */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Card de Modalidades */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 block">Distribución de Modalidades de Eventos</h4>
                    </div>

                    <div className="space-y-3.5 pt-1">
                      {Object.keys(modalityCounts).map(key => {
                        const count = modalityCounts[key];
                        const total = totalEvents;
                        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                        const colorClass = 
                          key === "Virtual" ? "bg-cyan-500" :
                          key === "Híbrido" ? "bg-amber-500" : "bg-emerald-500";
                        const textColor = 
                          key === "Virtual" ? "text-cyan-700 bg-cyan-50" :
                          key === "Híbrido" ? "text-amber-700 bg-amber-50" : "text-emerald-700 bg-emerald-50";

                        return (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${colorClass}`}></span>
                              <span className="font-semibold text-slate-700">{key}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${textColor}`}>
                                {count} {count === 1 ? 'evento' : 'eventos'}
                              </span>
                              <span className="font-bold text-slate-650 w-8 text-right">{percentage}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card de Log de Check-ins en Vivo */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-slate-900">Asistencias Recientes (QR Check-in)</h4>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" title="En tiempo real"></span>
                    </div>

                    {displayLogs.length > 0 ? (
                      <div className="space-y-3 divide-y divide-slate-100">
                        {displayLogs.map((log, idx) => (
                          <div key={idx} className="pt-3 first:pt-0 flex items-start justify-between gap-3 text-xs animate-fadeIn">
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-800 leading-tight">{log.name}</p>
                              <p className="text-[10px] text-slate-400 truncate max-w-[170px]" title={log.email}>{log.email}</p>
                              <p className="text-[10px] text-indigo-650 font-semibold truncate max-w-[170px]" title={log.eventTitle}>
                                {log.eventTitle}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full block text-center">
                                Confirmado
                              </span>
                              <span className="text-[9px] text-slate-400 block mt-1">{log.date} {log.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-2 text-center">No se han registrado asistencias por QR todavía.</p>
                    )}
                  </div>

                  {/* Card de Atajos Rápidos */}
                  <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <Sliders size={16} className="text-indigo-400" />
                      Atajos Administrativos
                    </h4>
                    <p className="text-[11px] text-slate-400">Accede rápidamente a las secciones de gestión y actualización de datos.</p>
                    
                    <div className="space-y-2 pt-1 text-xs font-semibold">
                      <button 
                        onClick={() => setCurrentTab("admin")} 
                        className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl transition-all flex items-center justify-between cursor-pointer"
                      >
                        <span>Crear y Administrar Eventos</span>
                        <ArrowRight size={14} className="text-indigo-400" />
                      </button>
                      <button 
                        onClick={() => { setCurrentTab("admin"); setShowAddUserForm(true); }} 
                        className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl transition-all flex items-center justify-between cursor-pointer"
                      >
                        <span>Agregar / Controlar Usuarios</span>
                        <ArrowRight size={14} className="text-indigo-400" />
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* VISTA 2: PANEL DE ADMINISTRACIÓN COMPLETO                 */}
        {/* ========================================================= */}
        {currentTab === "admin" && (
          <div className="space-y-8 animate-fadeIn">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Consola de Control de Eventos</h3>
                <p className="text-sm text-slate-500 mt-1">Crea nuevos talleres, gestiona alertas de Teams/correo y descarga listas oficiales.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <Shield size={14} />
                  Rol: {currentUser.role}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Formulario de Alta y Modificación (5 Columnas) */}
              <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Plus size={18} className="text-indigo-600" />
                    {isEditing ? "Modificar Evento" : "Crear Nuevo Evento"}
                  </h4>
                  {isEditing && (
                    <button 
                      onClick={resetAdminForm} 
                      className="text-xs text-rose-600 font-semibold hover:underline"
                    >
                      Cancelar Edición
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveEvent} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Título del Evento *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej. Taller Práctico de Figma para Desarrolladores"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-sm text-slate-800 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700 block">Facilitador</label>
                        <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Staff de Capacitación"
                        value={formInstructor}
                        onChange={(e) => setFormInstructor(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-sm text-slate-800 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">Categoría *</label>
                      <select 
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-800 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 focus:outline-none transition-all cursor-pointer"
                      >
                        {CATEGORIES.filter(c => c !== "Todos").map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">Modalidad *</label>
                      <select 
                        value={formModality}
                        onChange={(e) => setFormModality(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-800 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 focus:outline-none transition-all cursor-pointer"
                      >
                        <option value="Presencial">Presencial</option>
                        <option value="Virtual">Virtual</option>
                        <option value="Híbrido">Híbrido</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700 block">Lugar / Enlace</label>
                        <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
                      </div>
                      <input 
                        type="text" 
                        placeholder={
                          formModality === "Virtual" ? "Ej. Enlace de Teams / Zoom" :
                          formModality === "Híbrido" ? "Ej. Sala 102 y Enlace de Teams" :
                          "Ej. Sala de Juntas B (Piso 3)"
                        }
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-sm text-slate-800 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 block">Descripción Detallada</label>
                      <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
                    </div>
                    <textarea 
                      rows={3}
                      placeholder="Objetivos, temario y prerrequisitos del evento corporativo..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-sm text-slate-800 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 focus:outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 block">URL de la Imagen Ilustrativa</label>
                      <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
                    </div>
                    <input 
                      type="url" 
                      placeholder="Dejar vacío para imagen de stock corporativa automática"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-sm text-slate-800 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 block">Enlace de la Encuesta / Evaluación del Evento</label>
                      <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
                    </div>
                    <input 
                      type="url" 
                      placeholder="Ej. https://forms.office.com/r/codigoencuesta"
                      value={formSurveyUrl}
                      onChange={(e) => setFormSurveyUrl(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-sm text-slate-800 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Planificador de Fechas y Cupos</h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">Día</label>
                        <input 
                          type="date"
                          value={tempDate}
                          onChange={(e) => setTempDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-1.5 rounded focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">Hora</label>
                        <select
                          value={tempTime}
                          onChange={(e) => setTempTime(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-1.5 rounded focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="08:00 AM">08:00 AM</option>
                          <option value="09:00 AM">09:00 AM</option>
                          <option value="10:00 AM">10:00 AM</option>
                          <option value="11:00 AM">11:00 AM</option>
                          <option value="12:00 PM">12:00 PM</option>
                          <option value="02:00 PM">02:00 PM</option>
                          <option value="03:00 PM">03:00 PM</option>
                          <option value="04:00 PM">04:00 PM</option>
                          <option value="05:30 PM">05:30 PM</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">Cupos Max</label>
                        <input 
                          type="number"
                          min="1"
                          max="100"
                          value={tempCapacity}
                          onChange={(e) => setTempCapacity(parseInt(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-1.5 rounded focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={addScheduleItemToForm}
                      className="w-full text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold py-1.5 rounded-lg border border-indigo-200 transition-all cursor-pointer"
                    >
                      + Añadir esta fecha al evento
                    </button>

                    {formSchedule.length > 0 ? (
                      <div className="space-y-2 pt-2 border-t border-slate-200 max-h-40 overflow-y-auto">
                        <span className="text-[10px] font-extrabold text-slate-500 block uppercase">Horarios Asociados:</span>
                        {formSchedule.map((sch, dIdx) => (
                          <div key={sch.date} className="text-xs space-y-1">
                            <div className="font-bold text-slate-700">{sch.date}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {sch.slots.map((slot, sIdx) => (
                                <span 
                                  key={sIdx} 
                                  className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[10px]"
                                >
                                  {slot.time} (Max {slot.capacity})
                                  <button 
                                    type="button" 
                                    onClick={() => removeScheduleItemFromForm(dIdx, sIdx)}
                                    className="text-rose-600 hover:text-rose-800 font-bold ml-1"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic block">No se han definido horarios para este evento todavía.</span>
                    )}
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={resetAdminForm}
                      className="flex-1 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-all"
                    >
                      Limpiar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-100 transition-all"
                    >
                      {isEditing ? "Guardar Cambios" : "Publicar Evento"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Listado y Gestión (7 Columnas) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Tabla de Eventos Activos */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Clock size={18} className="text-indigo-600" />
                    Eventos Activos en el Catálogo ({events.length})
                  </h4>

                  {/* Vista Mobile (Tarjetas) */}
                  <div className="block md:hidden space-y-4">
                    {events.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-4">No hay eventos activos en el catálogo.</p>
                    ) : (
                      events.map(evt => {
                        let totalCapacity = 0;
                        let totalRegistered = 0;
                        evt.schedule.forEach(sch => {
                          sch.slots.forEach(slot => {
                            totalCapacity += slot.capacity;
                            totalRegistered += slot.registered;
                          });
                        });

                        return (
                          <div 
                            key={evt.id} 
                            className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 hover:border-indigo-300 transition-all duration-200 animate-fadeIn"
                          >
                            <div className="space-y-1">
                              <span className="inline-block bg-indigo-100 text-indigo-800 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                {evt.category}
                              </span>
                              <h5 className="text-sm font-bold text-slate-900 leading-snug">{evt.title}</h5>
                              <p className="text-xs text-slate-500">Facilitador: <span className="font-semibold text-slate-700">{evt.instructor}</span></p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Modalidad: <span className="font-semibold text-slate-650">{evt.modality || "Presencial"}</span> • Lugar: <span className="text-slate-650 truncate inline-block max-w-[160px] align-bottom">{evt.location || "Instalaciones"}</span>
                              </p>
                            </div>

                            <div className="flex items-center justify-between text-xs border-t border-b border-slate-150 py-2.5">
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Matrícula</span>
                                <span className="font-semibold text-slate-800">{totalRegistered} / {totalCapacity} inscritos</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Fechas</span>
                                <span className="font-semibold text-slate-800">{evt.schedule.length} {evt.schedule.length === 1 ? 'Día' : 'Días'}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                              <button
                                onClick={() => setAttendeesModalEvent(evt)}
                                className="flex-1 min-w-[70px] flex items-center justify-center gap-1 py-2 px-2.5 bg-white hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-xs font-bold text-slate-700 transition-all border border-slate-200 hover:border-indigo-150 cursor-pointer"
                              >
                                <Users size={13} />
                                <span>Inscritos</span>
                              </button>

                              <button
                                onClick={() => setNotificationModalEvent(evt)}
                                className="flex-1 min-w-[70px] flex items-center justify-center gap-1 py-2 px-2.5 bg-white hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-xs font-bold text-slate-700 transition-all border border-slate-200 hover:border-indigo-150 cursor-pointer"
                              >
                                <Bell size={13} />
                                <span>Alertas</span>
                              </button>

                              <button
                                onClick={() => {
                                  setQrModalEvent(evt);
                                  setQrSelectedDate(evt.schedule[0]?.date || null);
                                  setQrSelectedSlot(evt.schedule[0]?.slots[0]?.time || null);
                                }}
                                className="flex-1 min-w-[70px] flex items-center justify-center gap-1 py-2 px-2.5 bg-white hover:bg-emerald-50 hover:text-emerald-600 rounded-xl text-xs font-bold text-slate-700 transition-all border border-slate-200 hover:border-emerald-150 cursor-pointer"
                              >
                                <QrCode size={13} />
                                <span>QR</span>
                              </button>

                              <button
                                onClick={() => startEditEvent(evt)}
                                className="p-2 bg-white hover:bg-amber-50 hover:text-amber-600 rounded-xl text-slate-700 transition-all border border-slate-200 hover:border-amber-150 flex items-center justify-center cursor-pointer"
                                title="Editar"
                              >
                                <Edit3 size={13} />
                              </button>

                              <button
                                onClick={() => setDeleteConfirmationEvent(evt)}
                                className="p-2 bg-white hover:bg-rose-50 hover:text-rose-600 rounded-xl text-slate-700 transition-all border border-slate-200 hover:border-rose-150 flex items-center justify-center cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Vista Desktop (Tabla) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 uppercase text-slate-400 font-bold border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-3 rounded-l-lg">Evento</th>
                          <th className="px-4 py-3">Inscritos</th>
                          <th className="px-4 py-3 rounded-r-lg text-right">Controles</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {events.map(evt => {
                          let totalCapacity = 0;
                          let totalRegistered = 0;
                          evt.schedule.forEach(sch => {
                            sch.slots.forEach(slot => {
                              totalCapacity += slot.capacity;
                              totalRegistered += slot.registered;
                            });
                          });

                          return (
                            <tr key={evt.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="px-4 py-3 max-w-xs">
                                <div className="font-bold text-slate-900 line-clamp-1">{evt.title}</div>
                                <div className="text-slate-400 mt-0.5">
                                  {evt.instructor} • <span className="italic">{evt.category}</span> • <span className="font-medium text-slate-500">{evt.modality || "Presencial"}</span> <span className="text-slate-350">({evt.location || "Instalaciones"})</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-700">{totalRegistered} / {totalCapacity}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{evt.schedule.length} días programados</div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-1.5 flex-wrap">
                                  
                                  {/* Botón Ver Inscritos & Descargar CSV */}
                                  <button
                                    onClick={() => setAttendeesModalEvent(evt)}
                                    title="Descargas e Inscritos"
                                    className="p-1.5 text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <Users size={14} />
                                    <span className="text-[10px] font-bold hidden sm:inline">Inscritos</span>
                                  </button>

                                  {/* Botón Notificaciones */}
                                  <button
                                    onClick={() => setNotificationModalEvent(evt)}
                                    title="Configurar Recordatorios Teams/Correo"
                                    className="p-1.5 text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <Bell size={14} />
                                    <span className="text-[10px] font-bold hidden sm:inline">Alertas</span>
                                  </button>

                                  {/* Botón QR Asistencia */}
                                  <button
                                    onClick={() => {
                                      setQrModalEvent(evt);
                                      setQrSelectedDate(evt.schedule[0]?.date || null);
                                      setQrSelectedSlot(evt.schedule[0]?.slots[0]?.time || null);
                                    }}
                                    title="Generar QR de Asistencia"
                                    className="p-1.5 text-slate-600 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <QrCode size={14} />
                                    <span className="text-[10px] font-bold hidden sm:inline">QR</span>
                                  </button>

                                  {/* Botón Editar */}
                                  <button
                                    onClick={() => startEditEvent(evt)}
                                    title="Editar"
                                    className="p-1.5 text-slate-500 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 rounded-lg transition-all cursor-pointer"
                                  >
                                    <Edit3 size={14} />
                                  </button>

                                  {/* Botón Eliminar con Modal Seguro */}
                                  <button
                                    onClick={() => setDeleteConfirmationEvent(evt)}
                                    title="Eliminar permanentemente"
                                    className="p-1.5 text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                  >
                                    <Trash2 size={14} />
                                  </button>

                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sección de Origen de Datos (Datasource Excel) */}
                {currentUser.role === "Super Administrador" ? (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FileSpreadsheet size={18} className="text-emerald-600" />
                        Orígenes de Datos (Datasources Excel)
                      </h4>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        Datasource Manager
                      </span>
                    </div>

                    {/* Origen 1: Catálogo de Eventos */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">1. Origen de Eventos</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{events.length} Eventos Cargados</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Sube un Excel para cargar dinámicamente el catálogo de eventos y programar fechas y slots.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all">
                          <Upload size={12} />
                          Cargar Excel de Eventos
                          <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleExcelUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => {
                            const csvContent = "\ufeff" + "Título;Descripción;Categoría;Facilitador;ImagenUrl;Fecha;Hora;Capacidad\n" +
                              "Taller de Git Avanzado;Aprende rebase y cherry-pick;Taller;Ing. Luis Ramos;https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80;2026-07-28;09:00 AM;30\n" +
                              "Taller de Git Avanzado;Aprende rebase y cherry-pick;Taller;Ing. Luis Ramos;https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80;2026-07-28;03:00 PM;30\n" +
                              "Charla de Ergonomía;Postura y salud laboral;Charla;Dra. Carmen Soto;;2026-07-29;11:00 AM;50\n";
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.setAttribute("href", url);
                            link.setAttribute("download", "plantilla_eventos.csv");
                            link.style.visibility = 'hidden';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            triggerToast("Descarga de plantilla iniciada");
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-all"
                        >
                          <Download size={12} />
                          Plantilla Eventos
                        </button>
                      </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Origen 2: Padrón de Participantes */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">2. Origen de Participantes</span>
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">{participants.length} Colaboradores</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Sube el padrón de colaboradores con sus números de tarjeta y nombres para validar las inscripciones.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all">
                          <Upload size={12} />
                          Cargar Excel de Participantes
                          <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleParticipantsExcelUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => {
                            const csvContent = "\ufeff" + "Tarjeta Emp;Nombre Empleado;No. Identificador;Puesto;Departamento\n" +
                              "2010;LUIS ALBERTO ALMAZAN POOT;ID-3401;Coordinador;Finanzas\n" +
                              "2012;LILIANA ESTHER SOSA PECH;ID-3402;Analista;Sistemas\n" +
                              "1998;FERMIN GABRIEL CHI PERERA;ID-3403;Soporte;Operaciones\n" +
                              "2015;JESUS RAFAEL PECH CHULIM;ID-3404;Gerente;Recursos Humanos\n";
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.setAttribute("href", url);
                            link.setAttribute("download", "plantilla_participantes.csv");
                            link.style.visibility = 'hidden';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            triggerToast("Descarga de plantilla iniciada");
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-all"
                        >
                          <Download size={12} />
                          Plantilla Participantes
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex gap-3 shadow-xs">
                    <Lock className="text-emerald-600 flex-shrink-0" size={18} />
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-emerald-900">Módulo de Origen de Datos Protegido</h5>
                      <p className="text-[11px] text-emerald-700 leading-relaxed">
                        Solo los usuarios con el rol de <strong>Super Administrador</strong> pueden cargar o modificar los orígenes de datos Excel de la plataforma.
                      </p>
                    </div>
                  </div>
                )}

                {/* Sección de Gestión de Roles */}
                {currentUser.role === "Super Administrador" ? (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Users size={18} className="text-purple-600" />
                        Control de Roles y Usuarios
                      </h4>
                      <button
                        onClick={() => setShowAddUserForm(!showAddUserForm)}
                        className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-extrabold rounded-lg border border-purple-200 transition-all cursor-pointer flex items-center gap-1"
                      >
                        {showAddUserForm ? "Cerrar Formulario" : "+ Añadir Usuario"}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">Como Super Administrador, puedes designar roles, añadir nuevos colaboradores y coordinar los accesos del sistema.</p>

                    {showAddUserForm && (
                      <form onSubmit={handleAddUser} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 block">Nombre Completo</label>
                            <input
                              type="text"
                              required
                              value={newUserName}
                              onChange={(e) => setNewUserName(e.target.value)}
                              placeholder="Ej. Ana Gómez"
                              className="w-full bg-white border border-slate-200 text-xs px-2.5 py-1.5 rounded focus:ring-1 focus:ring-purple-500 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 block">Correo Corporativo</label>
                            <input
                              type="email"
                              required
                              value={newUserEmail}
                              onChange={(e) => setNewUserEmail(e.target.value)}
                              placeholder="Ej. ana.gomez@empresa.com"
                              className="w-full bg-white border border-slate-200 text-xs px-2.5 py-1.5 rounded focus:ring-1 focus:ring-purple-500 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 block">Contraseña</label>
                            <input
                              type="text"
                              value={newUserPassword}
                              onChange={(e) => setNewUserPassword(e.target.value)}
                              placeholder="123456 (Defecto)"
                              className="w-full bg-white border border-slate-200 text-xs px-2.5 py-1.5 rounded focus:ring-1 focus:ring-purple-500 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 block">Rol inicial</label>
                            <select
                              value={newUserRole}
                              onChange={(e) => setNewUserRole(e.target.value)}
                              className="w-full bg-white border border-slate-200 text-xs px-2 py-1.5 rounded focus:ring-1 focus:ring-purple-500 focus:outline-none cursor-pointer"
                            >
                              <option value="Super Administrador">Super Administrador</option>
                              <option value="Administrador / Editor">Administrador / Editor</option>
                              <option value="Colaborador (User)">Colaborador (User)</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setShowAddUserForm(false)}
                            className="px-3 py-1.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 font-semibold"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                          >
                            Guardar Usuario
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="space-y-3">
                      {users.map(u => (
                        <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                              {u.name.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 text-xs">{u.name}</div>
                              <div className="text-[10px] text-slate-400">{u.email}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Rol:</label>
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="bg-white border border-slate-200 text-xs text-slate-800 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                            >
                              <option value="Super Administrador">Super Administrador</option>
                              <option value="Administrador / Editor">Administrador / Editor</option>
                              <option value="Colaborador (User)">Colaborador (User)</option>
                            </select>

                            {u.id !== currentUser.id && (
                              <button
                                onClick={() => handleRemoveUser(u.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-lg transition-all cursor-pointer"
                                title="Eliminar usuario"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 shadow-xs">
                    <Lock className="text-amber-600 flex-shrink-0" size={18} />
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-amber-900">Módulo de Roles Protegido</h5>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        Solo los usuarios con el rol de <strong>Super Administrador</strong> pueden cambiar los niveles de privilegios.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VISTA 3: CHECK-IN DE ASISTENCIA (QR ESCANEADO)             */}
        {/* ========================================================= */}
        {currentTab === "attendance" && attendanceEventId && (() => {
          const attEvent = events.find(e => e.id === attendanceEventId);
          const attSchedule = attEvent?.schedule.find(s => s.date === attendanceDate);
          const attSlot = attSchedule?.slots.find(sl => sl.time === attendanceTime);
          
          if (!attEvent) {
            return (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fadeIn">
                <div className="w-24 h-24 rounded-full bg-rose-100 flex items-center justify-center">
                  <X size={48} className="text-rose-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900">Evento no encontrado</h2>
                <p className="text-slate-500 max-w-md">El código QR que escaneaste apunta a un evento que ya no existe o ha sido eliminado del sistema.</p>
                <button onClick={handleExitAttendance} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-200">
                  Ir al Catálogo de Eventos
                </button>
              </div>
            );
          }

          return (
            <div className="max-w-lg mx-auto space-y-6 animate-fadeIn">
              
              {/* Cabecera del Evento */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src={attEvent.imageUrl} 
                  alt={attEvent.title}
                  className="w-full h-48 object-cover"
                  onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <span className="inline-block bg-indigo-500/80 text-xs font-bold px-3 py-1 rounded-full mb-2">{attEvent.category}</span>
                  <h2 className="text-2xl font-black tracking-tight leading-tight">{attEvent.title}</h2>
                  <p className="text-white/70 text-sm mt-1 flex items-center gap-2">
                    <User size={14} /> {attEvent.instructor}
                  </p>
                </div>
              </div>

              {/* Info del horario */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <CalendarIcon size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{attendanceDate}</p>
                      <p className="text-xs text-slate-500">{attendanceTime}</p>
                    </div>
                  </div>
                  {attSlot && (
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-700">{attSlot.registered} / {attSlot.capacity}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Inscritos</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Panel de Check-in */}
              {!attendanceResult ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                      <ScanLine size={32} className="text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900">Registro de Asistencia</h3>
                    <p className="text-sm text-slate-500 mt-1">Ingresa tu número de tarjeta de colaborador para confirmar tu presencia.</p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-700 block">Tarjeta de Colaborador (4-6 dígitos)</label>
                    <input
                      type="text"
                      maxLength={6}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Ej. 2010"
                      value={attendanceCardInput}
                      onChange={(e) => setAttendanceCardInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center text-3xl font-black tracking-[0.3em] bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800 px-4 py-4 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all"
                      autoFocus
                    />

                    {/* Verificación en tiempo real */}
                    {attendanceCardInput.trim().length >= 4 && (
                      attendanceVerified ? (
                        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 size={20} className="text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-emerald-900">{attendanceVerified.name}</p>
                            <p className="text-xs text-emerald-600">{attendanceVerified.email}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4">
                          <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0">
                            <X size={20} className="text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-rose-900">Tarjeta no reconocida</p>
                            <p className="text-xs text-rose-600">Este número no está registrado en el padrón corporativo.</p>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <button
                    onClick={handleAttendanceCheckIn}
                    disabled={!attendanceVerified || attendanceProcessing}
                    className={`w-full py-4 rounded-xl text-white text-sm font-bold transition-all shadow-lg ${
                      !attendanceVerified || attendanceProcessing
                        ? 'bg-slate-300 cursor-not-allowed shadow-none'
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 cursor-pointer'
                    }`}
                  >
                    {attendanceProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Procesando...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle2 size={18} />
                        Confirmar Asistencia
                      </span>
                    )}
                  </button>
                </div>
              ) : attendanceResult === 'confirmed' || attendanceResult === 'registered_and_confirmed' ? (
                <div className="bg-white rounded-2xl border-2 border-emerald-200 p-8 shadow-xl text-center space-y-4 animate-fadeIn">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-200 animate-bounce">
                      <Check size={48} className="text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-emerald-900">
                    {attendanceResult === 'confirmed' ? '¡Asistencia Confirmada!' : '¡Inscripción y Asistencia Confirmadas!'}
                  </h3>
                  <p className="text-sm text-slate-600 max-w-sm mx-auto">
                    {attendanceResult === 'confirmed' 
                      ? `${attendanceVerified?.name}, tu presencia ha sido registrada exitosamente. ¡Bienvenido al evento!`
                      : `${attendanceVerified?.name}, te hemos inscrito y registrado tu asistencia automáticamente. ¡Disfruta el evento!`
                    }
                  </p>
                  <div className="bg-emerald-50 rounded-xl p-4 inline-block">
                    <p className="text-xs font-bold text-emerald-800">
                      <span className="block text-emerald-500 text-[10px] uppercase tracking-widest mb-1">Colaborador</span>
                      {attendanceVerified?.name}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">Tarjeta: {attendanceVerified?.card} • {attendanceVerified?.email}</p>
                  </div>

                  {(() => {
                    const surveyUrl = attEvent?.surveyUrl || attEvent?.survey_url;
                    if (surveyUrl) {
                      return (
                        <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-4 mt-2 text-left animate-fadeIn space-y-2.5 mx-auto max-w-sm">
                          <div className="flex items-center gap-2">
                            <span className="p-1 bg-indigo-100 text-indigo-700 rounded-md">
                              <FileSpreadsheet size={14} />
                            </span>
                            <p className="text-xs text-indigo-950 font-bold leading-tight">
                              ¿Tienes 1 minuto? Evalúa el evento
                            </p>
                          </div>
                          <p className="text-[11px] text-indigo-750 leading-normal">
                            Tu opinión es de gran valor para ayudarnos a mejorar continuamente nuestras capacitaciones.
                          </p>
                          <a
                            href={surveyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/10 cursor-pointer"
                          >
                            Completar Encuesta / Evaluación
                            <ArrowRight size={12} className="stroke-[2.5]" />
                          </a>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <button
                    onClick={() => {
                      setAttendanceResult(null);
                      setAttendanceCardInput("");
                      setAttendanceVerified(null);
                    }}
                    className="mt-4 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all shadow-lg cursor-pointer"
                  >
                    Registrar otro colaborador
                  </button>
                </div>
              ) : attendanceResult === 'already_confirmed' ? (
                <div className="bg-white rounded-2xl border-2 border-amber-200 p-8 shadow-xl text-center space-y-4 animate-fadeIn">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto shadow-lg shadow-amber-200">
                    <Info size={48} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-amber-900">Asistencia ya registrada</h3>
                  <p className="text-sm text-slate-600 max-w-sm mx-auto">
                    {attendanceVerified?.name}, tu asistencia ya fue confirmada previamente para este horario.
                  </p>

                  {(() => {
                    const surveyUrl = attEvent?.surveyUrl || attEvent?.survey_url;
                    if (surveyUrl) {
                      return (
                        <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-4 mt-2 text-left animate-fadeIn space-y-2.5 mx-auto max-w-sm">
                          <div className="flex items-center gap-2">
                            <span className="p-1 bg-indigo-100 text-indigo-700 rounded-md">
                              <FileSpreadsheet size={14} />
                            </span>
                            <p className="text-xs text-indigo-950 font-bold leading-tight">
                              ¿Tienes 1 minuto? Evalúa el evento
                            </p>
                          </div>
                          <p className="text-[11px] text-indigo-750 leading-normal">
                            Tu opinión es de gran valor para ayudarnos a mejorar continuamente nuestras capacitaciones.
                          </p>
                          <a
                            href={surveyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/10 cursor-pointer"
                          >
                            Completar Encuesta / Evaluación
                            <ArrowRight size={12} className="stroke-[2.5]" />
                          </a>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <button
                    onClick={() => {
                      setAttendanceResult(null);
                      setAttendanceCardInput("");
                      setAttendanceVerified(null);
                    }}
                    className="mt-4 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all shadow-lg cursor-pointer"
                  >
                    Registrar otro colaborador
                  </button>
                </div>
              ) : attendanceResult === 'no_space' ? (
                <div className="bg-white rounded-2xl border-2 border-rose-200 p-8 shadow-xl text-center space-y-4 animate-fadeIn">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center mx-auto shadow-lg shadow-rose-200">
                    <AlertTriangle size={48} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-rose-900">Cupo Agotado</h3>
                  <p className="text-sm text-slate-600 max-w-sm mx-auto">
                    Lo sentimos, {attendanceVerified?.name}. No estás inscrito(a) en este horario y ya no hay cupo disponible.
                  </p>
                  <div className="bg-rose-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-rose-800 flex items-center justify-center gap-2">
                      <PhoneCall size={14} />
                      Contacta al organizador
                    </p>
                    <p className="text-xs text-rose-600 mt-1">{attEvent.instructor} • admin.capacitacion@empresa.com</p>
                  </div>
                  <button
                    onClick={() => {
                      setAttendanceResult(null);
                      setAttendanceCardInput("");
                      setAttendanceVerified(null);
                    }}
                    className="mt-4 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all shadow-lg"
                  >
                    Intentar con otra tarjeta
                  </button>
                </div>
              ) : null}

              {/* Botón para volver */}
              <div className="text-center">
                <button
                  onClick={handleExitAttendance}
                  className="text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                >
                  ← Volver al Catálogo de Eventos
                </button>
              </div>
            </div>
          );
        })()}

      </main>

      <footer className="bg-slate-950 text-slate-400 text-xs py-8 mt-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <span className="font-black text-white text-sm">CapacitaHub</span>
            <p className="mt-1 text-slate-500">Diseñado para la formación continua de los colaboradores. Copyright 2026. Todos los derechos reservados.</p>
          </div>
          <div className="flex gap-4">
            <span className="hover:text-white cursor-pointer transition-colors">Manual de Usuario</span>
            <span className="hover:text-white cursor-pointer transition-colors">Políticas de Privacidad</span>
            <span className="hover:text-white cursor-pointer transition-colors">Soporte Técnico</span>
          </div>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* SECCIÓN DEL INTERACTIVE MODAL (CON CALENDARIO Y SLOTS)     */}
      {/* ========================================================= */}
      {selectedEventForModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="flex min-h-full items-start justify-center p-4 text-center md:items-center">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 flex flex-col md:flex-row transform scale-100 transition-all duration-300 my-auto text-left">
              
              <div className="md:w-5/12 bg-slate-950 text-white relative min-h-[250px] md:min-h-0 flex flex-col justify-between p-6">
                <div className="absolute inset-0 z-0">
                  <img 
                    src={selectedEventForModal.imageUrl} 
                    alt={selectedEventForModal.title}
                    className="w-full h-full object-cover opacity-35"
                    onError={(e) => {
                      if (e.currentTarget.src !== FALLBACK_IMAGE) {
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40"></div>
                </div>

                <div className="relative z-10 space-y-3">
                  <span className="bg-indigo-600/90 text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full">
                    {selectedEventForModal.category}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight">{selectedEventForModal.title}</h3>
                </div>

                <div className="relative z-10 space-y-4 pt-6">
                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    {selectedEventForModal.description}
                  </p>

                  <div className="pt-4 border-t border-white/10 space-y-2">
                    <div className="flex items-center gap-2.5 text-xs text-slate-200">
                      <User size={14} className="text-indigo-400 flex-shrink-0" />
                      <span>Facilitador: <strong>{selectedEventForModal.instructor}</strong></span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-200">
                      <Sliders size={14} className="text-indigo-400 flex-shrink-0" />
                      <span>Modalidad: <strong>{selectedEventForModal.modality || "Presencial"}</strong></span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-200">
                      <MapPin size={14} className="text-indigo-400 flex-shrink-0" />
                      <span>Lugar: <strong>{selectedEventForModal.location || (selectedEventForModal.modality === "Virtual" ? "Enlace Virtual" : "Instalaciones")}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:w-7/12 p-6 sm:p-8 space-y-6 flex flex-col justify-between">
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-slate-900">Agenda tus Fechas y Horas</h4>
                      <p className="text-[11px] text-slate-400">Selecciona uno de los días marcados en azul para ver los cupos</p>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedEventForModal(null);
                        setSelectedDateInModal(null);
                        setSelectedSlotInModal(null);
                      }}
                      className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-950 cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Julio 2026</span>
                      <div className="flex gap-1">
                        <button className="p-1 rounded hover:bg-slate-200 text-slate-400 cursor-not-allowed" disabled>
                          <ChevronLeft size={14} />
                        </button>
                        <button className="p-1 rounded hover:bg-slate-200 text-slate-400 cursor-not-allowed" disabled>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
                      <span>DOM</span>
                      <span>LUN</span>
                      <span>MAR</span>
                      <span>MIÉ</span>
                      <span>JUE</span>
                      <span>VIE</span>
                      <span>SÁB</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {julyDays.map((dayObj, idx) => {
                        if (!dayObj.day) {
                          return <div key={`empty-${idx}`} className="h-8"></div>;
                        }

                        const scheduleForDay = selectedEventForModal.schedule.find(s => s.date === dayObj.dateString);
                        const isEventActiveThisDay = !!scheduleForDay;
                        const isSelected = selectedDateInModal === dayObj.dateString;

                        return (
                          <button
                            key={`day-${dayObj.day}`}
                            disabled={!isEventActiveThisDay}
                            onClick={() => {
                              setSelectedDateInModal(dayObj.dateString);
                              setSelectedSlotInModal(null); 
                            }}
                            className={`h-8 w-full text-xs font-bold rounded-lg transition-all flex items-center justify-center relative cursor-pointer ${
                              !isEventActiveThisDay 
                                ? "text-slate-300 hover:bg-transparent cursor-not-allowed" 
                                : isSelected 
                                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                                  : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                            }`}
                          >
                            {dayObj.day}
                            {isEventActiveThisDay && !isSelected && (
                              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-600"></span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedDateInModal ? (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                        Horarios para el {selectedDateInModal}:
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedEventForModal.schedule.find(s => s.date === selectedDateInModal)?.slots.map((slot, sIdx) => {
                          const isSlotSelected = selectedSlotInModal && selectedSlotInModal.time === slot.time;
                          const isFull = slot.registered >= slot.capacity;

                          return (
                            <button
                              key={sIdx}
                              disabled={isFull}
                              onClick={() => setSelectedSlotInModal(slot)}
                              className={`p-3 rounded-xl border text-xs text-left transition-all flex justify-between items-center cursor-pointer ${
                                isFull 
                                  ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" 
                                  : isSlotSelected 
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/15" 
                                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
                              }`}
                            >
                              <div className="space-y-0.5">
                                <span className="font-bold flex items-center gap-1">
                                  <Clock size={12} />
                                  {slot.time}
                                </span>
                                <span className={isSlotSelected ? "text-indigo-100 text-[10px]" : "text-slate-400 text-[10px]"}>
                                  {isFull ? "Cupo lleno" : `${slot.capacity - slot.registered} de ${slot.capacity} libres`}
                                </span>
                              </div>
                              {isSlotSelected && <Check size={14} />}
                            </button>
                          );
                        }) || <p className="text-xs text-rose-500 font-bold">No hay horarios programados para esta fecha</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-xs text-slate-400 italic">
                      Selecciona una de las fechas resaltadas del calendario para ver la lista de horas
                    </div>
                  )}

                </div>

                {selectedSlotInModal ? (
                  <form onSubmit={handleRegisterToEvent} className="border-t border-slate-100 pt-5 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700 block">Número de Tarjeta de Colaborador (4 a 6 dígitos)</label>
                        <span className="text-[10px] text-slate-400 font-medium">Validación en padrón</span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input 
                          type="text"
                          maxLength={6}
                          placeholder="Ej. 2010 o 2012"
                          value={userCardInput}
                          onChange={(e) => setUserCardInput(e.target.value.replace(/\D/g, ''))}
                          className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white text-xs px-3.5 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all"
                        />
                        <button
                          type="submit"
                          disabled={!verifiedParticipant}
                          className={`text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            verifiedParticipant 
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200" 
                              : "bg-slate-200 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          Inscribirme <ArrowRight size={14} />
                        </button>
                      </div>

                      {/* Mostrar feedback del usuario verificado */}
                      {userCardInput.trim().length >= 4 && (
                        verifiedParticipant ? (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between animate-fadeIn">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Colaborador Encontrado</span>
                              <div className="text-xs font-bold text-slate-900">{verifiedParticipant.name}</div>
                              <div className="text-[10px] text-slate-500">{verifiedParticipant.email}</div>
                            </div>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                              <Check size={10} /> Válido
                            </span>
                          </div>
                        ) : (
                          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between animate-fadeIn">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">No Registrado</span>
                              <div className="text-xs font-semibold text-rose-700">Tarjeta no encontrada en el padrón corporativo.</div>
                            </div>
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                              <X size={10} /> Inválido
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="border-t border-slate-100 pt-5 text-center text-xs text-slate-400 italic">
                    Selecciona una fecha y una hora para habilitar la reserva de cupos
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL ADM: LISTADO DE INSCRITOS Y DESCARGA CSV            */}
      {/* ========================================================= */}
      {attendeesModalEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="flex min-h-full items-start justify-center p-4 text-center md:items-center">
            <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col transform scale-100 transition-all duration-300 my-auto text-left">
              
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="space-y-1">
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider flex-shrink-0">
                    Auditoría de Matrícula
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{attendeesModalEvent.title}</h3>
                  <p className="text-xs text-slate-500">Visualiza la lista y descarga el reporte consolidado para sistemas de nómina.</p>
                </div>
                <button 
                  onClick={() => setAttendeesModalEvent(null)}
                  className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-950 transition-colors cursor-pointer flex-shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-0.5">
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                      Reportes del Evento
                    </span>
                    <p className="text-[11px] text-slate-500">Descarga los consolidados en formato Excel/CSV.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleDownloadAttendeesCSV(attendeesModalEvent)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer animate-fadeIn"
                    >
                      <Download size={13} />
                      Descargar Inscritos
                    </button>
                    <button
                      onClick={() => handleDownloadAttendanceCSV(attendeesModalEvent)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer animate-fadeIn"
                    >
                      <Download size={13} />
                      Descargar Asistencia
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {attendeesModalEvent.schedule.map((sch, schIdx) => {
                    return (
                      <div key={schIdx} className="space-y-2 border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
                          <CalendarIcon size={14} className="text-indigo-600" />
                          <span>{sch.date}</span>
                        </div>

                        <div className="space-y-3 pl-0 sm:pl-4">
                          {sch.slots.map((slot, slotIdx) => {
                            const hasUsers = slot.attendees && slot.attendees.length > 0;
                            
                            return (
                              <div key={slotIdx} className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-semibold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded">
                                    {slot.time}
                                  </span>
                                  <span className="text-slate-400 font-medium">
                                    {slot.registered} registrados de {slot.capacity} max.
                                  </span>
                                </div>

                                {hasUsers ? (
                                  <ul className="divide-y divide-slate-100 bg-white border border-slate-100 rounded-xl overflow-hidden shadow-xs">
                                    {slot.attendees.map((email, emailIdx) => {
                                      const participant = participants.find(p => p.email === email);
                                      const name = participant ? participant.name : "Usuario no registrado";
                                      const card = participant ? participant.card : "N/A";
                                      const hasAttended = slot.attendedList && slot.attendedList.includes(email);
                                      
                                      return (
                                        <li key={emailIdx} className="px-3.5 py-2.5 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50">
                                          <div className="flex flex-col gap-0.5">
                                            <span className="font-semibold text-slate-900">{name}</span>
                                            <span className="text-slate-500 text-[10px]">
                                              Tarjeta: <span className="font-medium text-slate-700">{card}</span> • {email}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="bg-blue-50 text-blue-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0">
                                              Reservado
                                            </span>
                                            {hasAttended ? (
                                              <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                                                <Check size={10} /> Presente (QR)
                                              </span>
                                            ) : (
                                              <span className="bg-slate-100 text-slate-500 text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                                                Ausente / Pendiente
                                              </span>
                                            )}
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <p className="text-[11px] text-slate-400 italic pl-2">No hay colaboradores inscritos en este horario.</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setAttendeesModalEvent(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cerrar Ventana
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL ADM: GESTIÓN DE NOTIFICACIONES CORREO & TEAMS       */}
      {/* ========================================================= */}
      {notificationModalEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="flex min-h-full items-start justify-center p-4 text-center md:items-center">
            <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col transform scale-100 transition-all duration-300 my-auto text-left">
            
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="space-y-1">
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Centro de Notificaciones & Recordatorios
                </span>
                <h3 className="text-lg font-bold text-slate-900">Configuración para: {notificationModalEvent.title}</h3>
                <p className="text-xs text-slate-500">Configura la automatización de envíos y recordatorios para asegurar la asistencia.</p>
              </div>
              <button 
                onClick={() => setNotificationModalEvent(null)}
                className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-950 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Mail size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Correo Corporativo</h4>
                        <p className="text-[10px] text-slate-400">Envío masivo por e-mail</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={notificationModalEvent.notificationSettings?.sendEmail ?? true}
                        onChange={(e) => handleUpdateNotificationSettings(notificationModalEvent.id, { sendEmail: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500">Recordatorio automatizado enviado desde la cuenta de Formación al correo oficial de cada inscrito.</p>
                </div>

                <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Send size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Microsoft Teams</h4>
                        <p className="text-[10px] text-slate-400">Webhook y chat bot de Teams</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={notificationModalEvent.notificationSettings?.sendTeams ?? false}
                        onChange={(e) => handleUpdateNotificationSettings(notificationModalEvent.id, { sendTeams: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500">Alerta instantánea directa al chat corporativo individual a través de Teams.</p>
                </div>

              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 block">Mensaje Personalizado del Recordatorio</label>
                  <span className="text-[10px] text-slate-400">Variables: [EVENT_TITLE], [INSTRUCTOR], [SURVEY_LINK]</span>
                </div>
                <textarea
                  rows={3}
                  value={notificationModalEvent.notificationSettings?.customMessage || ""}
                  onChange={(e) => handleUpdateNotificationSettings(notificationModalEvent.id, { customMessage: e.target.value })}
                  placeholder="Escribe el mensaje que recibirán los participantes..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-xs p-3 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all resize-none"
                />
              </div>
 
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Info size={14} className="text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700">Acciones manuales inmediatas</span>
                </div>
                <p className="text-[11px] text-slate-500">Prueba el recordatorio de asistencia en este instante enviándolo de prueba a los inscritos:</p>
                
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => handleSendMockNotification(notificationModalEvent, "Email")}
                    disabled={sendingNotificationState}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Mail size={12} />
                    {sendingNotificationState ? "Enviando..." : "Enviar Recordatorio por Email"}
                  </button>
                  <button
                    onClick={() => handleSendMockNotification(notificationModalEvent, "Teams")}
                    disabled={sendingNotificationState}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Send size={12} />
                    {sendingNotificationState ? "Enviando..." : "Enviar Recordatorio por Teams"}
                  </button>
                </div>
              </div>

              {/* Sección de Encuesta / Evaluación */}
              <div className="border border-indigo-150 rounded-2xl p-4 bg-indigo-50/40 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-indigo-950">
                  <FileSpreadsheet size={16} className="text-indigo-650 flex-shrink-0" />
                  <span className="text-xs font-bold text-slate-700">Encuesta y Evaluación del Evento</span>
                </div>
                
                {(() => {
                  const eventSurvey = notificationModalEvent.surveyUrl || notificationModalEvent.survey_url;
                  if (eventSurvey) {
                    return (
                      <div className="space-y-2">
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Envía el enlace de evaluación a los asistentes confirmados para recopilar feedback sobre el evento.
                        </p>
                        <div className="bg-white border border-slate-200 p-2.5 rounded-xl text-[10px] font-mono truncate text-slate-600">
                          Enlace: <a href={eventSurvey} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{eventSurvey}</a>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            onClick={() => handleSendSurveyNotification(notificationModalEvent, "Email")}
                            disabled={sendingNotificationState}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          >
                            <Mail size={12} />
                            Enviar Encuesta por Email
                          </button>
                          <button
                            onClick={() => handleSendSurveyNotification(notificationModalEvent, "Teams")}
                            disabled={sendingNotificationState}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          >
                            <Send size={12} />
                            Enviar Encuesta por Teams
                          </button>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <p className="text-[11px] text-slate-500 italic">
                        No se ha configurado un enlace de encuesta para este evento. Edita el evento en el panel de control para añadirlo.
                      </p>
                    );
                  }
                })()}
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  Historial de Notificaciones Enviadas
                </span>

                {(notificationModalEvent.notificationHistory && notificationModalEvent.notificationHistory.length > 0) ? (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-50 text-xs">
                    {notificationModalEvent.notificationHistory.map((log, logIdx) => (
                      <div key={logIdx} className="p-3 bg-white flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          <div>
                            <div className="font-semibold text-slate-800">
                              Alerta enviada vía {log.channel}
                            </div>
                            <div className="text-[10px] text-slate-400">{log.date}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {log.status}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">{log.recipients} destinatarios</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No se han registrado envíos previos para esta actividad.</p>
                )}
              </div>

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setNotificationModalEvent(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cerrar Configuración
              </button>
            </div>

          </div>
        </div>
      </div>
      )}

      {/* ========================================================= */}
      {/* MODAL ADM: CONFIRMACIÓN SEGUNDA ELIMINACIÓN EVENTOS        */}
      {/* ========================================================= */}
      {deleteConfirmationEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="flex min-h-full items-start justify-center p-4 text-center md:items-center">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 flex flex-col p-6 space-y-4 transform scale-100 transition-all duration-300 my-auto text-left">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">¿Estás completamente seguro?</h3>
                <p className="text-xs text-slate-500">
                  Estás a punto de eliminar permanentemente la actividad <strong>"{deleteConfirmationEvent.title}"</strong>. Esta acción no se puede deshacer y borrará también las inscripciones vinculadas.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmationEvent(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                >
                  No, mantener evento
                </button>
                <button
                  onClick={() => executeDeleteEvent(deleteConfirmationEvent.id)}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/15 transition-all cursor-pointer"
                >
                  Sí, eliminar permanentemente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL ADM: PREVISUALIZACIÓN DE EVENTOS DE EXCEL            */}
      {/* ========================================================= */}
      {showExcelPreviewModal && excelDataPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="flex min-h-full items-start justify-center p-4 text-center md:items-center">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 flex flex-col transform scale-100 transition-all duration-300 my-auto text-left">
            
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="space-y-1">
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Previsualización de Datos Excel
                </span>
                <h3 className="text-lg font-bold text-slate-900">Validación de Eventos para Importación</h3>
                <p className="text-xs text-slate-500">Revisa la lista de eventos y horarios detectados en tu archivo antes de incorporarlos al catálogo.</p>
              </div>
              <button 
                onClick={() => {
                  setShowExcelPreviewModal(false);
                  setExcelDataPreview(null);
                }}
                className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-950 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 uppercase text-slate-400 font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2">Título</th>
                      <th className="px-4 py-2">Categoría</th>
                      <th className="px-4 py-2">Facilitador</th>
                      <th className="px-4 py-2">Fecha</th>
                      <th className="px-4 py-2">Hora</th>
                      <th className="px-4 py-2 text-right">Cupos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {excelDataPreview.map((row, idx) => {
                      const findVal = (names: string[], defaultVal: any = "") => {
                        const key = Object.keys(row).find(k => names.includes(k.toLowerCase().trim()));
                        return key ? row[key] : defaultVal;
                      };
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-semibold text-slate-900">{findVal(["título", "titulo", "title"])}</td>
                          <td className="px-4 py-2">{findVal(["categoría", "categoria", "category"], "Taller")}</td>
                          <td className="px-4 py-2">{findVal(["facilitador", "instructor", "ponente"], "Staff")}</td>
                          <td className="px-4 py-2">{findVal(["fecha", "date"])}</td>
                          <td className="px-4 py-2">{findVal(["hora", "horario", "time"])}</td>
                          <td className="px-4 py-2 text-right font-bold">{findVal(["capacidad", "cupos", "capacity"], 20)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowExcelPreviewModal(false);
                  setExcelDataPreview(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportExcelData}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/10 transition-all cursor-pointer"
              >
                Confirmar e Importar ({excelDataPreview.length} filas)
              </button>
            </div>

          </div>
        </div>
      </div>
      )}

      {/* ========================================================= */}
      {/* MODAL ADM: PREVISUALIZACIÓN DE PARTICIPANTES DE EXCEL      */}
      {/* ========================================================= */}
      {showExcelParticipantsModal && excelParticipantsPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="flex min-h-full items-start justify-center p-4 text-center md:items-center">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 flex flex-col transform scale-100 transition-all duration-300 my-auto text-left">
            
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="space-y-1">
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Previsualización de Participantes Excel
                </span>
                <h3 className="text-lg font-bold text-slate-900">Validación de Padrón para Importación</h3>
                <p className="text-xs text-slate-500">Revisa la lista de colaboradores y las tarjetas detectadas antes de actualizar el padrón de reservas.</p>
              </div>
              <button 
                onClick={() => {
                  setShowExcelParticipantsModal(false);
                  setExcelParticipantsPreview(null);
                }}
                className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-950 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 uppercase text-slate-400 font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2">Tarjeta Emp</th>
                      <th className="px-4 py-2">Nombre Empleado</th>
                      <th className="px-4 py-2">Correo Autogenerado/Excel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {excelParticipantsPreview.map((row, idx) => {
                      const findVal = (names: string[], defaultVal: any = "") => {
                        const key = Object.keys(row).find(k => names.includes(k.toLowerCase().trim()));
                        return key ? row[key] : defaultVal;
                      };
                      const card = findVal(["tarjeta emp", "tarjeta", "card", "tarjetaemp"]);
                      const name = findVal(["nombre empleado", "nombre", "name", "empleado"]);
                      const emailExcel = findVal(["correo", "email", "mail"]);
                      const emailGenerated = emailExcel || (name ? generateEmailFromName(name.toString()) : "colaborador@empresa.com");

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-bold text-slate-900">{card}</td>
                          <td className="px-4 py-2 font-semibold">{name}</td>
                          <td className="px-4 py-2 text-slate-500">{emailGenerated}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowExcelParticipantsModal(false);
                  setExcelParticipantsPreview(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportParticipantsData}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/10 transition-all cursor-pointer"
              >
                Confirmar e Importar ({excelParticipantsPreview.length} filas)
              </button>
            </div>

          </div>
        </div>
      </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE GENERACIÓN DE QR DE ASISTENCIA                   */}
      {/* ========================================================= */}
      {qrModalEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="flex min-h-full items-start justify-center p-4 text-center md:items-center">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 my-auto text-left">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <QrCode size={22} className="text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">QR de Asistencia</h3>
                    <p className="text-xs text-indigo-200 mt-0.5 line-clamp-1">{qrModalEvent.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setQrModalEvent(null); setQrSelectedDate(null); setQrSelectedSlot(null); }}
                  className="text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              
              {/* Selector de Fecha */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Seleccionar Fecha</label>
                <div className="flex flex-wrap gap-2">
                  {qrModalEvent.schedule.map((sch: any) => (
                    <button
                      key={sch.date}
                      onClick={() => {
                        setQrSelectedDate(sch.date);
                        setQrSelectedSlot(sch.slots[0]?.time || null);
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        qrSelectedDate === sch.date
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <CalendarIcon size={12} className="inline mr-1.5" />
                      {sch.date}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Horario */}
              {qrSelectedDate && (() => {
                const dateSchedule = qrModalEvent.schedule.find((s: any) => s.date === qrSelectedDate);
                if (!dateSchedule) return null;
                return (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">Seleccionar Horario</label>
                    <div className="flex flex-wrap gap-2">
                      {dateSchedule.slots.map((sl: any) => (
                        <button
                          key={sl.time}
                          onClick={() => setQrSelectedSlot(sl.time)}
                          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            qrSelectedSlot === sl.time
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <Clock size={12} className="inline mr-1.5" />
                          {sl.time} ({sl.registered}/{sl.capacity})
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* QR Code Display */}
              {qrSelectedDate && qrSelectedSlot && (
                <div className="print-area space-y-4">
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center space-y-4">
                    <QRCodeSVG
                      value={getAttendanceUrl(qrModalEvent.id, qrSelectedDate, qrSelectedSlot)}
                      size={220}
                      level="H"
                      includeMargin={true}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                    />
                    <div className="text-center">
                      <p className="text-sm font-black text-slate-900">{qrModalEvent.title}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {qrSelectedDate} • {qrSelectedSlot} • {qrModalEvent.instructor}
                      </p>
                    </div>
                  </div>
                  
                  {/* URL del QR (copiable) */}
                  <div className="bg-slate-50 rounded-xl p-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">URL del Check-in</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getAttendanceUrl(qrModalEvent.id, qrSelectedDate, qrSelectedSlot)}
                        className="flex-1 bg-white border border-slate-200 text-[10px] text-slate-600 px-3 py-2 rounded-lg font-mono"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(getAttendanceUrl(qrModalEvent.id, qrSelectedDate, qrSelectedSlot));
                          triggerToast('URL copiada al portapapeles', 'success');
                        }}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between gap-3">
              <button
                onClick={() => { setQrModalEvent(null); setQrSelectedDate(null); setQrSelectedSlot(null); }}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cerrar
              </button>
              {qrSelectedDate && qrSelectedSlot && (
                <button
                  onClick={handlePrintQR}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md"
                >
                  <Printer size={14} />
                  Imprimir QR
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
      )}

      {/* Canvas para animación de confetti */}
      <canvas
        ref={confettiRef}
        className="fixed inset-0 z-[100] pointer-events-none"
        style={{ display: 'none' }}
      />

    </div>
  );
}