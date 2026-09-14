import React, { useState, useEffect } from 'react';
import { apiService, MOCK_USERS, MOCK_GROUPS, MOCK_PROGRAMS, MOCK_COMPANIES } from './services/api';
import { 
  TrainingEvent, 
  Participant, 
  UserAccount, 
  ToastNotification, 
  TabView, 
  EventFeedback,
  ParticipantGroup,
  TrainingProgram,
  Company,
  SystemSettings,
  OjtChecklist,
  CalibrationSession,
  ExternalTraining,
  CreateExternalTrainingPayload
} from './types';
import { Navbar } from './components/layout/Navbar';
import { SuperAdminSidebar } from './components/layout/SuperAdminSidebar';
import { LoginModal } from './components/auth/LoginModal';
import { ReservationModal } from './components/reservations/ReservationModal';

// Code-splitting y carga diferida de módulos pesados (Vite bundle optimization)
const CatalogView = React.lazy(() => import('./components/catalog/CatalogView').then(m => ({ default: m.CatalogView })));
const MyRegistrationsView = React.lazy(() => import('./components/reservations/MyRegistrationsView').then(m => ({ default: m.MyRegistrationsView })));
const AttendanceView = React.lazy(() => import('./components/attendance/AttendanceView').then(m => ({ default: m.AttendanceView })));
const DashboardView = React.lazy(() => import('./components/dashboard/DashboardView').then(m => ({ default: m.DashboardView })));
const AdminView = React.lazy(() => import('./components/admin/AdminView').then(m => ({ default: m.AdminView })));
const TeamLeadView = React.lazy(() => import('./components/supervisor/TeamLeadView').then(m => ({ default: m.TeamLeadView })));
const OjtManager = React.lazy(() => import('./components/ojt/OjtManager').then(m => ({ default: m.OjtManager })));
const EvaluatorCoursesView = React.lazy(() => import('./components/evaluator/EvaluatorCoursesView').then(m => ({ default: m.EvaluatorCoursesView })));
import { Toast } from './components/common/Toast';
import { Footer } from './components/common/Footer';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';
import { OfflineBanner } from './components/common/OfflineBanner';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { TecEvaluationModal } from './components/feedback/TecEvaluationModal';
import { QrScannerModal } from './components/scanner/QrScannerModal';
import { findAttendeeByCedula, AttendeeLookupResult } from './utils/attendeeLookup';
import { CedulaScannerModal } from './components/lobby/CedulaScannerModal';
import { AttendeeScheduleModal } from './components/lobby/AttendeeScheduleModal';
import { UserProfileModal } from './components/profile/UserProfileModal';
import { attendanceWs } from './services/websocket';

// Helper seguro para obtener el usuario autenticado desde localStorage
const getSafeStoredUser = (): UserAccount | null => {
  if (typeof localStorage === 'undefined') return null;
  const saved = localStorage.getItem('ch_logged_user');
  if (!saved || saved === 'undefined' || saved === 'null' || saved.trim() === '') {
    try { localStorage.removeItem('ch_logged_user'); } catch {}
    return null;
  }
  try {
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') {
      localStorage.removeItem('ch_logged_user');
      return null;
    }
    return parsed;
  } catch (e) {
    console.warn('Usuario inválido en localStorage, reseteando sesión:', e);
    try { localStorage.removeItem('ch_logged_user'); } catch {}
    return null;
  }
};

// Componente visual de carga para vistas con code-splitting
const ViewLoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-28 space-y-3.5 animate-in fade-in duration-200">
    <div className="w-9 h-9 border-3 border-slate-200 border-t-[#DA291C] rounded-full animate-spin shadow-xs"></div>
    <p className="text-xs font-bold text-slate-600">Cargando módulo...</p>
  </div>
);

export function App() {
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [settings, setSettings] = useState<SystemSettings>({
    ojt_plan_90d: { enabled: true, enable_702010: true, enable_calibration: true, target_ttp_days: 30 }
  });
  const [checklists, setChecklists] = useState<OjtChecklist[]>([]);
  const [calibrations, setCalibrations] = useState<CalibrationSession[]>([]);
  const [externalTrainings, setExternalTrainings] = useState<ExternalTraining[]>([]);

  // Estado del panel lateral (exclusivo para SuperAdmin)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Modal de cambio de contraseña para usuario autenticado
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);

  // Sesión del usuario autenticado
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getSafeStoredUser());

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    const u = getSafeStoredUser();
    if (u && u.role !== 'Super Administrador') {
      return u.companyId || 'emp_kasino';
    }
    return 'all';
  });

  const [events, setEvents] = useState<TrainingEvent[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [users, setUsers] = useState<UserAccount[]>(MOCK_USERS);
  const [groups, setGroups] = useState<ParticipantGroup[]>(MOCK_GROUPS);
  const [programs, setPrograms] = useState<TrainingProgram[]>(MOCK_PROGRAMS);

  // Vista actual / Navegación
  const [currentTab, setCurrentTab] = useState<TabView>(() => {
    const u = getSafeStoredUser();
    if (u && u.role === 'Evaluador / Tutor OJT') {
      return 'evaluator-courses';
    }
    return 'landing';
  });

  // Parámetros de asistencia QR
  const [attendanceEventId, setAttendanceEventId] = useState<string | null>(null);
  const [attendanceDate, setAttendanceDate] = useState<string | null>(null);
  const [attendanceTime, setAttendanceTime] = useState<string | null>(null);

  const [selectedEventForModal, setSelectedEventForModal] = useState<TrainingEvent | null>(null);
  const [selectedEventForTecModal, setSelectedEventForTecModal] = useState<TrainingEvent | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);

  // Estados para Lobby de Recepción y Kiosco por Cédula
  const [isCedulaScannerOpen, setIsCedulaScannerOpen] = useState<boolean>(false);
  const [isAttendeeScheduleModalOpen, setIsAttendeeScheduleModalOpen] = useState<boolean>(false);
  const [attendeeLookupResult, setAttendeeLookupResult] = useState<AttendeeLookupResult | null>(null);
  const [lastSearchedCedula, setLastSearchedCedula] = useState<string>('');
  const [isSearchingCedula, setIsSearchingCedula] = useState<boolean>(false);

  // Estados para Ficha y Perfil Sociodemográfico / Académico (Obligatorio en primer ingreso)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isProfileMandatory, setIsProfileMandatory] = useState<boolean>(false);

  // Helper para validar si el perfil del colaborador está completo
  const isUserProfileComplete = (user: UserAccount | null, participantList: Participant[]) => {
    if (!user) return true;
    const linkedParticipant = participantList.find(p => p.email.toLowerCase() === user.email.toLowerCase());
    if (user.profileCompleted || linkedParticipant?.profileCompleted) return true;
    const hasBirth = Boolean(user.birthDate || linkedParticipant?.birthDate);
    const hasEdu = Boolean(user.educationLevel || linkedParticipant?.educationLevel);
    const hasPhone = Boolean(user.phone || linkedParticipant?.phone);
    const hasAddress = Boolean(user.currentAddress || linkedParticipant?.currentAddress);
    return Boolean(hasBirth && hasEdu && hasPhone && hasAddress);
  };

  const [toast, setToast] = useState<ToastNotification | null>(null);

  const showToast = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ title, message, type });
  };

  // Carga inicial de datos
  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          loadedCompanies, 
          loadedEvents, 
          loadedParticipants, 
          loadedUsers, 
          loadedGroups, 
          loadedPrograms,
          loadedSettings,
          loadedChecklists,
          loadedCalibrations,
          loadedExternalTrainings
        ] = await Promise.all([
          apiService.getCompanies(),
          apiService.getEvents(),
          apiService.getParticipants(),
          apiService.getUsers(),
          apiService.getGroups(),
          apiService.getPrograms(),
          apiService.getSettings(),
          apiService.getOjtChecklists(),
          apiService.getCalibrationSessions(),
          apiService.getExternalTrainings()
        ]);
        setCompanies(loadedCompanies);
        setEvents(loadedEvents);
        setParticipants(loadedParticipants);
        setUsers(loadedUsers);
        setGroups(loadedGroups);
        setPrograms(loadedPrograms);
        if (loadedSettings) setSettings(loadedSettings);
        if (loadedChecklists) setChecklists(loadedChecklists);
        if (loadedCalibrations) setCalibrations(loadedCalibrations);
        if (loadedExternalTrainings) setExternalTrainings(loadedExternalTrainings);

        // Auto-consulta si la URL contiene ?cedula=
        const urlParams = new URLSearchParams(window.location.search);
        const cedulaFromUrl = urlParams.get('cedula');
        if (cedulaFromUrl) {
          const res = findAttendeeByCedula(cedulaFromUrl, loadedParticipants, loadedUsers, loadedEvents);
          setAttendeeLookupResult(res);
          setIsAttendeeScheduleModalOpen(true);
          setLastSearchedCedula(cedulaFromUrl);
        }

        // Verificar si el usuario autenticado tiene perfil incompleto
        const savedUser = getSafeStoredUser();
        if (savedUser) {
          const freshUser = loadedUsers.find(u => u.id === savedUser.id) || savedUser;
          setCurrentUser(freshUser);
          if (!isUserProfileComplete(freshUser, loadedParticipants)) {
            setIsProfileMandatory(true);
            setIsProfileModalOpen(true);
          }
        }
      } catch (err) {
        console.error('Error al cargar datos:', err);
      }
    };
    loadData();
  }, []);

  // Detección de parámetros URL (para QR Check-In y Kiosco Lobby)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const evtParam = params.get('event');
    const dateParam = params.get('date');
    const timeParam = params.get('time');

    if (tabParam === 'attendance' && evtParam) {
      setCurrentTab('attendance');
      setAttendanceEventId(evtParam);
      setAttendanceDate(dateParam);
      setAttendanceTime(timeParam);
    } else if (tabParam === 'kiosk' || tabParam === 'lobby') {
      setCurrentTab('kiosk');
    }
  }, []);

  // Suscripción reactiva a eventos en tiempo real de asistencia vía WebSocket
  useEffect(() => {
    attendanceWs.connect();

    const unsubscribe = attendanceWs.onAttendanceEvent((eventData) => {
      console.log('App received WebSocket attendance event:', eventData);

      // Refrescar automáticamente la lista de eventos desde el servidor
      apiService.getEvents().then(freshEvents => {
        setEvents(freshEvents);
      }).catch(err => {
        console.error('Error al sincronizar eventos en tiempo real:', err);
      });

      // Si el usuario actual es Super Administrador o Administrador, mostrar un toast discreto
      if (currentUser && (currentUser.role === 'Super Administrador' || currentUser.role === 'Administrador / Editor')) {
        const action = eventData.type === 'ATTENDANCE_CHECK_IN'
          ? 'Entrada registrada'
          : eventData.type === 'ATTENDANCE_CHECK_OUT'
            ? 'Salida registrada'
            : 'Asistencia actualizada';
        const label = eventData.participantName || eventData.email || 'Colaborador';
        showToast(`⚡ En vivo: ${action}`, `${label} ha marcado asistencia en tiempo real.`, 'info');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Handlers de Sesión
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    if (user.role !== 'Super Administrador') {
      setSelectedCompanyId(user.companyId || 'emp_kasino');
    }
    localStorage.setItem('ch_logged_user', JSON.stringify(user));
    if (user.role === 'Evaluador / Tutor OJT') {
      setCurrentTab('evaluator-courses');
    }
    showToast('¡Bienvenido!', `Has iniciado sesión como ${user.name}.`, 'success');

    // Validación de Onboarding Obligatorio
    if (!isUserProfileComplete(user, participants)) {
      setIsProfileMandatory(true);
      setIsProfileModalOpen(true);
    }
  };

  const handleSaveProfile = async (profileData: any) => {
    if (!currentUser) return;
    try {
      const { user: updatedUser, users: updatedUsers, participants: updatedParticipants } = 
        await apiService.updateUserProfile(currentUser.id, profileData);

      const finalUser: UserAccount = updatedUser || {
        ...currentUser,
        ...profileData,
        profileCompleted: true
      };

      setCurrentUser(finalUser);
      if (updatedUsers && updatedUsers.length > 0) setUsers(updatedUsers);
      if (updatedParticipants && updatedParticipants.length > 0) setParticipants(updatedParticipants);
      localStorage.setItem('ch_logged_user', JSON.stringify(finalUser));
      setIsProfileMandatory(false);
      setIsProfileModalOpen(false);
    } catch (err: any) {
      console.error('Error al guardar perfil:', err);
      // Respaldo resiliente: actualizar estado local para que el usuario no quede bloqueado
      const fallbackUser: UserAccount = {
        ...currentUser,
        ...profileData,
        profileCompleted: true
      };
      setCurrentUser(fallbackUser);
      localStorage.setItem('ch_logged_user', JSON.stringify(fallbackUser));
      setIsProfileMandatory(false);
      setIsProfileModalOpen(false);
      showToast('Aviso', 'Tu información de perfil se ha actualizado.', 'info');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedCompanyId('all');
    localStorage.removeItem('ch_logged_user');
    setCurrentTab('landing');
    showToast('Sesión cerrada', 'Has salido de tu cuenta correctamente.', 'info');
  };

  // Handlers de Operaciones
  const handleConfirmReservation = async (eventId: string, date: string, time: string, email: string) => {
    const updated = await apiService.registerToEvent(eventId, date, time, email);
    setEvents(updated);
    showToast('Reserva exitosa', 'Tu lugar ha sido reservado con éxito.', 'success');
  };

  const handleCancelRegistration = async (
    eventId: string, 
    date: string, 
    time: string, 
    email: string,
    isSupervisorOrAdmin: boolean = false,
    force: boolean = false
  ) => {
    const updated = await apiService.cancelRegistration(eventId, date, time, email, isSupervisorOrAdmin, force);
    setEvents(updated);
    showToast('Inscripción cancelada', 'El cupo ha sido liberado correctamente.', 'info');
  };

  const handleAssignTeamMembers = async (payload: any) => {
    const res = await apiService.assignTeamMembersToEvent(payload);
    setEvents(res.events);
    const updatedParticipants = await apiService.getParticipants();
    setParticipants(updatedParticipants);
    return res;
  };

  const handleConfirmAttendance = async (
    eventId: string, 
    date: string, 
    time: string, 
    email: string, 
    type: 'checkin' | 'checkout' = 'checkin',
    code?: string
  ) => {
    const updated = await apiService.confirmAttendance(eventId, date, time, email, type, code);
    setEvents(updated);
  };

  const handleRevertAttendance = async (
    eventId: string, 
    date: string, 
    time: string, 
    email: string, 
    type: 'checkout' | 'all' = 'all'
  ) => {
    const updated = await apiService.revertAttendance(eventId, date, time, email, type);
    setEvents(updated);
  };

  // Handlers para Lobby y Kiosco por Cédula
  const handleLookupCedula = (query: string) => {
    if (!query || !query.trim()) return;
    setIsSearchingCedula(true);
    setLastSearchedCedula(query.trim());
    try {
      const result = findAttendeeByCedula(query, participants, users, events);
      setAttendeeLookupResult(result);
      setIsAttendeeScheduleModalOpen(true);
      if (!result.found) {
        showToast('Documento No Registrado', `No se encontró ningún colaborador con el documento "${query}".`, 'warning');
      } else if (result.sessions.length === 0) {
        showToast('Sin Cursos Agendados', `${result.displayName} está registrado en el padrón pero no tiene capacitaciones activas programadas.`, 'info');
      } else {
        showToast('Colaborador Encontrado', `${result.displayName} tiene ${result.sessions.length} capacitación(es) en agenda.`, 'success');
      }
    } catch (err) {
      console.error('Error al consultar cédula:', err);
      showToast('Error', 'Ocurrió un error al procesar la consulta.', 'error');
    } finally {
      setIsSearchingCedula(false);
    }
  };

  const handleCedulaDetected = (detectedCedula: string) => {
    setIsCedulaScannerOpen(false);
    handleLookupCedula(detectedCedula);
  };

  const handleConfirmAttendanceLobby = async (
    eventId: string, 
    date: string, 
    time: string, 
    email: string, 
    type: 'checkin' | 'checkout' = 'checkin'
  ) => {
    const updated = await apiService.confirmAttendance(eventId, date, time, email, type);
    setEvents(updated);
    if (lastSearchedCedula) {
      const refreshed = findAttendeeByCedula(lastSearchedCedula, participants, users, updated);
      setAttendeeLookupResult(refreshed);
    }
    showToast('Asistencia Confirmada', `Tu ${type === 'checkout' ? 'salida' : 'entrada'} presencial ha sido validada exitosamente.`, 'success');
  };

  const handleSubmitFeedback = async (feedback: EventFeedback) => {
    try {
      const updated = await apiService.submitFeedback(feedback);
      setEvents(updated);
      showToast('¡Gracias por tu opinión!', 'Tu evaluación ha sido registrada exitosamente.', 'success');
    } catch (err: any) {
      showToast('Encuesta ya respondida', err.message || 'Solo se permite una respuesta por colaborador.', 'error');
      throw err;
    }
  };

  const handleSaveEvent = async (event: TrainingEvent) => {
    const updated = await apiService.saveEvent(event);
    setEvents(updated);
  };

  const handleDeleteEvent = async (eventId: string) => {
    const updated = await apiService.deleteEvent(eventId);
    setEvents(updated);
  };

  const handleSaveParticipants = async (newParticipants: Participant[]) => {
    await apiService.saveParticipants(newParticipants);
    setParticipants(newParticipants);
  };

  const handleSaveUsers = async (newUsers: UserAccount[]) => {
    await apiService.saveUsers(newUsers);
    setUsers(newUsers);
  };

  const handleSaveGroup = async (group: ParticipantGroup) => {
    const updated = await apiService.saveGroup(group);
    setGroups(updated);
  };

  const handleDeleteGroup = async (groupId: string) => {
    const updated = await apiService.deleteGroup(groupId);
    setGroups(updated);
  };

  const handleSaveProgram = async (program: TrainingProgram) => {
    const updated = await apiService.saveProgram(program);
    setPrograms(updated);
  };

  const handleDeleteProgram = async (programId: string) => {
    const updated = await apiService.deleteProgram(programId);
    setPrograms(updated);
  };

  const handleSaveCompany = async (company: Company) => {
    const updated = await apiService.saveCompany(company);
    setCompanies(updated);
  };

  const handleDeleteCompany = async (companyId: string) => {
    const updated = await apiService.deleteCompany(companyId);
    setCompanies(updated);
  };

  const handleSaveExternalTraining = async (payload: CreateExternalTrainingPayload, isEdit?: boolean, editId?: string) => {
    if (isEdit && editId) {
      await apiService.updateExternalTraining(editId, payload);
      showToast('Capacitación Actualizada', 'La capacitación externa ha sido actualizada correctamente.', 'success');
    } else {
      await apiService.createExternalTraining(payload);
      showToast('Capacitación Registrada', 'La capacitación externa ha sido registrada con éxito.', 'success');
    }
    const freshTrainings = await apiService.getExternalTrainings();
    setExternalTrainings(freshTrainings);
  };

  const handleDeleteExternalTraining = async (id: string) => {
    await apiService.deleteExternalTraining(id);
    const freshTrainings = await apiService.getExternalTrainings();
    setExternalTrainings(freshTrainings);
    showToast('Capacitación Eliminada', 'El registro externo fue eliminado con éxito.', 'info');
  };

  const handleBulkSaveExternalTrainings = async (trainingsToImport: CreateExternalTrainingPayload[]) => {
    const res = await apiService.bulkCreateExternalTrainings(
      trainingsToImport,
      currentUser?.companyId || 'emp_kasino',
      currentUser?.name || 'Super Administrador'
    );
    const freshTrainings = await apiService.getExternalTrainings();
    setExternalTrainings(freshTrainings);
    return res;
  };

  const handleBulkRegisterUsers = async (
    eventId: string,
    date: string,
    time: string,
    emails: string[],
    autoExpandCapacity?: boolean
  ) => {
    const res = await apiService.bulkRegisterUsers(eventId, date, time, emails, autoExpandCapacity);
    setEvents(res.events);
    // Reload participants as well since new ones might have been created
    const updatedParticipants = await apiService.getParticipants();
    setParticipants(updatedParticipants);
    return res;
  };

  const handleSendNotification = async (eventId: string, channel: 'Email' | 'Teams' | 'WhatsApp', message: string, recipients: number) => {
    const updatedEvents = events.map(evt => {
      if (evt.id === eventId) {
        const history = evt.notificationHistory || [];
        const now = new Date();
        const dateStr = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        return {
          ...evt,
          notificationHistory: [
            { date: dateStr, channel, status: 'Enviado' as const, recipients },
            ...history
          ]
        };
      }
      return evt;
    });

    await apiService.saveEvents(updatedEvents);
    setEvents(updatedEvents);
  };

  const handleUpdateSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
  };

  const handleSaveOjtChecklist = async (checklist: Partial<OjtChecklist>) => {
    await apiService.saveOjtChecklist(checklist);
    const updated = await apiService.getOjtChecklists();
    setChecklists(updated);
  };

  const handleDeleteOjtChecklist = async (id: string) => {
    await apiService.deleteOjtChecklist(id);
    setChecklists(prev => prev.filter(c => c.id !== id));
  };

  const handleSaveCalibration = async (session: Partial<CalibrationSession>) => {
    await apiService.saveCalibrationSession(session);
    const updated = await apiService.getCalibrationSessions();
    setCalibrations(updated);
  };

  // Contar inscripciones activas y cursos asignados del usuario logueado
  let myRegistrationsCount = 0;
  let evaluatorCoursesCount = 0;
  if (currentUser) {
    const userEmail = (currentUser.email || '').toLowerCase();
    const userName = (currentUser.name || '').toLowerCase();
    const userId = currentUser.id;

    events.forEach(e => {
      e.schedule.forEach(s => s.slots.forEach(sl => {
        if (sl.attendees.map(a => a.toLowerCase()).includes(userEmail)) {
          myRegistrationsCount++;
        }
      }));

      const isOjtAssigned = 
        (e.ojtEvaluatorId && e.ojtEvaluatorId === userId) ||
        (e.ojtEvaluatorEmail && e.ojtEvaluatorEmail.toLowerCase() === userEmail) ||
        (e.ojtEvaluatorName && e.ojtEvaluatorName.toLowerCase() === userName) ||
        (e.instructor && e.instructor.toLowerCase() === userName);

      if (isOjtAssigned) {
        evaluatorCoursesCount++;
      }
    });
  }

  // Si no está logueado, mostrar pantalla de inicio de sesión y recepción
  if (!currentUser) {
    const targetEvent = attendanceEventId ? events.find(e => e.id === attendanceEventId) : null;
    return (
      <>
        <LoginModal
          users={users}
          onLoginSuccess={handleLoginSuccess}
          onUsersUpdated={(newUsers) => setUsers(newUsers)}
          attendanceEventTitle={targetEvent?.title}
          attendanceTime={attendanceTime}
          onLookupCedula={handleLookupCedula}
          onOpenCedulaScanner={() => setIsCedulaScannerOpen(true)}
          isSearchingCedula={isSearchingCedula}
        />

        {/* Cedula Scanner Modal (Solo disponible en Login / Recepción) */}
        {isCedulaScannerOpen && (
          <CedulaScannerModal
            isOpen={isCedulaScannerOpen}
            onClose={() => setIsCedulaScannerOpen(false)}
            onCedulaDetected={handleCedulaDetected}
          />
        )}

        {/* Attendee Schedule Modal (Solo disponible en Login / Recepción) */}
        {isAttendeeScheduleModalOpen && attendeeLookupResult && (
          <AttendeeScheduleModal
            isOpen={isAttendeeScheduleModalOpen}
            onClose={() => setIsAttendeeScheduleModalOpen(false)}
            lookupResult={attendeeLookupResult}
            onConfirmAttendance={handleConfirmAttendanceLobby}
            onOpenTecEvaluation={(event) => setSelectedEventForTecModal(event)}
            onExploreCatalog={() => setIsAttendeeScheduleModalOpen(false)}
            onShowToast={showToast}
          />
        )}

        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  const isSuperAdmin = currentUser.role === 'Super Administrador';
  const effectiveCompanyId = isSuperAdmin ? selectedCompanyId : (currentUser.companyId || 'emp_kasino');

  const scopedParticipants = participants.filter(p => {
    if (isSuperAdmin && effectiveCompanyId === 'all') return true;
    return (p.companyId || 'emp_kasino') === effectiveCompanyId;
  });

  const scopedChecklists = checklists.filter(c => {
    if (isSuperAdmin && effectiveCompanyId === 'all') return true;
    return (c.companyId || 'emp_kasino') === effectiveCompanyId;
  });

  const scopedCalibrations = calibrations.filter(c => {
    if (isSuperAdmin && effectiveCompanyId === 'all') return true;
    return (c.companyId || 'emp_kasino') === effectiveCompanyId;
  });

  const isSuperAdminUser = currentUser?.role === 'Super Administrador';

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col selection:bg-[#DA291C] selection:text-white font-sans">
      
      {/* PWA Offline Network Banner */}
      <OfflineBanner />

      {/* SuperAdmin Sidebar (Only rendered if Super Admin) */}
      {isSuperAdminUser && currentUser && (
        <SuperAdminSidebar
          currentUser={currentUser}
          currentTab={currentTab}
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onSelectCompanyScope={(cId) => setSelectedCompanyId(cId)}
          setCurrentTab={setCurrentTab}
          onLogout={handleLogout}
          myRegistrationsCount={myRegistrationsCount}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
          onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
        />
      )}

      {/* Main Layout Container (Offset when SuperAdmin sidebar is active) */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        isSuperAdminUser 
          ? (isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64') 
          : ''
      }`}>

        {/* Top Navbar */}
        <Navbar
          currentUser={currentUser}
          currentTab={currentTab}
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onSelectCompanyScope={(cId) => setSelectedCompanyId(cId)}
          setCurrentTab={setCurrentTab}
          onLogout={handleLogout}
          myRegistrationsCount={myRegistrationsCount}
          evaluatorCoursesCount={evaluatorCoursesCount}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
          onOpenQrScanner={() => setIsQrScannerOpen(true)}
          onOpenUserProfile={() => {
            setIsProfileMandatory(false);
            setIsProfileModalOpen(true);
          }}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <React.Suspense fallback={<ViewLoadingFallback />}>
          
          {/* Tab 1: Catálogo Principal */}
          {currentTab === 'landing' && (
          <CatalogView
            events={events}
            currentUser={currentUser}
            companies={companies}
            selectedCompanyId={selectedCompanyId}
            programs={programs}
            groups={groups}
            participants={participants}
            onOpenReservationModal={(event) => setSelectedEventForModal(event)}
          />
        )}

        {/* Tab 2: Mis Inscripciones & Rutas Formativas */}
        {currentTab === 'my-registrations' && (
          <MyRegistrationsView
            events={events}
            currentUser={currentUser}
            companies={companies}
            programs={programs}
            groups={groups}
            participants={participants}
            externalTrainings={externalTrainings}
            onCancelRegistration={handleCancelRegistration}
            onExploreCatalog={() => setCurrentTab('landing')}
            onOpenReservationModal={(event) => setSelectedEventForModal(event)}
            onOpenQrScanner={() => setIsQrScannerOpen(true)}
            onOpenTecEvaluation={(event) => setSelectedEventForTecModal(event)}
            onOpenUserProfile={() => {
              setIsProfileMandatory(false);
              setIsProfileModalOpen(true);
            }}
          />
        )}

        {/* Tab 3: Métricas & KPIs */}
        {currentTab === 'dashboard' && (currentUser.role === 'Super Administrador' || currentUser.role === 'Administrador / Editor') && (
          <DashboardView
            events={events}
            participants={participants}
            users={users}
            groups={groups}
            programs={programs}
            companies={companies}
            settings={settings}
            checklists={checklists}
            calibrations={calibrations}
            selectedCompanyId={currentUser.role === 'Super Administrador' ? selectedCompanyId : (currentUser.companyId || 'emp_kasino')}
            currentUser={currentUser}
            onSelectCompanyScope={currentUser.role === 'Super Administrador' ? ((cId) => setSelectedCompanyId(cId)) : undefined}
            onSaveEvent={handleSaveEvent}
            onShowToast={showToast}
          />
        )}

        {/* Tab 4: Administración (Super Admin o Administrador / Editor) */}
        {currentTab === 'admin' && (currentUser.role === 'Super Administrador' || currentUser.role === 'Administrador / Editor') && (
          <AdminView
            events={events}
            participants={participants}
            users={users}
            groups={groups}
            programs={programs}
            companies={companies}
            settings={settings}
            checklists={checklists}
            calibrations={calibrations}
            externalTrainings={externalTrainings}
            selectedCompanyId={selectedCompanyId}
            onSelectCompanyScope={(cId) => setSelectedCompanyId(cId)}
            onSaveCompany={handleSaveCompany}
            onDeleteCompany={handleDeleteCompany}
            onSaveExternalTraining={handleSaveExternalTraining}
            onBulkSaveExternalTrainings={handleBulkSaveExternalTrainings}
            onDeleteExternalTraining={handleDeleteExternalTraining}
            onUpdateSettings={handleUpdateSettings}
            onSaveChecklist={handleSaveOjtChecklist}
            onDeleteChecklist={handleDeleteOjtChecklist}
            onSaveCalibration={handleSaveCalibration}
            currentUser={currentUser}
            onSaveEvent={handleSaveEvent}
            onDeleteEvent={handleDeleteEvent}
            onSaveParticipants={handleSaveParticipants}
            onSaveUsers={handleSaveUsers}
            onSaveGroup={handleSaveGroup}
            onDeleteGroup={handleDeleteGroup}
            onSaveProgram={handleSaveProgram}
            onDeleteProgram={handleDeleteProgram}
            onConfirmAttendance={handleConfirmAttendance}
            onRevertAttendance={handleRevertAttendance}
            onSendNotification={handleSendNotification}
            onBulkRegisterUsers={handleBulkRegisterUsers}
            onShowToast={showToast}
          />
        )}

        {/* Tab 5: Mi Equipo (Supervisores y Líderes de Área) */}
        {currentTab === 'team' && (
          <TeamLeadView
            currentUser={currentUser}
            users={users}
            events={events}
            participants={participants}
            groups={groups}
            programs={programs}
            companies={companies}
            onAssignTeamMembers={handleAssignTeamMembers}
            onCancelRegistration={handleCancelRegistration}
            onSendNotification={handleSendNotification}
            onShowToast={showToast}
          />
        )}

        {/* Tab OJT: Bitácoras de Campo, Mesas de Calibración & Analítica TTP (Exclusivo SuperAdmin y OJT) */}
        {currentTab === 'ojt' && (currentUser.role === 'Super Administrador' || currentUser.role === 'Evaluador / Tutor OJT') && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#DA291C] mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#DA291C] animate-pulse"></span>
                  <span>Módulo Especializado de Formación en Campo (OJT)</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Bitácoras & Mesas de Calibración
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                  Acompañamiento en el puesto de trabajo, diagnóstico de brechas operativas, aseguramiento First-Time Fix y reportes ejecutivos.
                </p>
              </div>
            </div>

            <OjtManager
              checklists={scopedChecklists}
              calibrations={scopedCalibrations}
              participants={scopedParticipants}
              currentUser={currentUser}
              companies={companies}
              isSuperAdmin={currentUser.role === 'Super Administrador'}
              onSaveChecklist={handleSaveOjtChecklist}
              onDeleteChecklist={handleDeleteOjtChecklist}
              onSaveCalibration={handleSaveCalibration}
              onShowToast={showToast}
            />
          </div>
        )}

        {/* Tab Evaluator: Cursos Asignados & Calificación Modular (SuperAdmin y Evaluador OJT) */}
        {currentTab === 'evaluator-courses' && (currentUser.role === 'Super Administrador' || currentUser.role === 'Evaluador / Tutor OJT') && (
          <EvaluatorCoursesView
            events={events}
            participants={participants}
            currentUser={currentUser}
            isSuperAdmin={currentUser.role === 'Super Administrador'}
            onConfirmAttendance={handleConfirmAttendance}
            onRevertAttendance={handleRevertAttendance}
            onSaveEvent={handleSaveEvent}
            onShowToast={showToast}
          />
        )}

        {/* Tab 6: Check-in de Asistencia Presencial por QR */}
        {currentTab === 'attendance' && attendanceEventId && attendanceDate && attendanceTime && (
          <AttendanceView
            events={events}
            participants={participants}
            currentUser={currentUser}
            eventId={attendanceEventId}
            dateStr={attendanceDate}
            timeStr={attendanceTime}
            onConfirmAttendance={handleConfirmAttendance}
            onSubmitFeedback={handleSubmitFeedback}
            onSaveParticipants={handleSaveParticipants}
            onNavigateHome={() => setCurrentTab('landing')}
            onOpenTecEvaluation={(event) => setSelectedEventForTecModal(event)}
          />
        )}

          </React.Suspense>
        </main>

      {/* Corporate Claro Training Footer */}
      <Footer />

      </div>

      {/* Reservation Modal */}
      {selectedEventForModal && (
        <ReservationModal
          event={selectedEventForModal}
          currentUser={currentUser}
          onClose={() => setSelectedEventForModal(null)}
          onConfirmReservation={handleConfirmReservation}
        />
      )}

      {/* Global Toast Alert */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* PWA Installation Prompt */}
      <PwaInstallPrompt />

      {/* Change Password Modal */}
      {isChangePasswordModalOpen && currentUser && (
        <ChangePasswordModal
          currentUser={currentUser}
          onClose={() => setIsChangePasswordModalOpen(false)}
          onSuccess={(updatedUser, message) => {
            setCurrentUser(updatedUser);
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
            showToast('Seguridad', message, 'success');
          }}
        />
      )}

      {/* TEC Evaluation Modal */}
      {selectedEventForTecModal && currentUser && (
        <TecEvaluationModal
          event={selectedEventForTecModal}
          currentUser={currentUser}
          existingFeedback={(selectedEventForTecModal.feedbacks || []).find(
            fb => fb.userEmail.toLowerCase() === currentUser.email.toLowerCase()
          )}
          isOpen={Boolean(selectedEventForTecModal)}
          onClose={() => setSelectedEventForTecModal(null)}
          onSubmitFeedback={handleSubmitFeedback}
          onShowToast={showToast}
        />
      )}

      {/* QR Attendance Scanner Modal */}
      {isQrScannerOpen && currentUser && (
        <QrScannerModal
          isOpen={isQrScannerOpen}
          onClose={() => setIsQrScannerOpen(false)}
          currentUser={currentUser}
          events={events}
          onConfirmAttendance={handleConfirmAttendance}
          onOpenTecEvaluation={(event) => setSelectedEventForTecModal(event)}
          onShowToast={showToast}
        />
      )}

      {/* Modal de Ficha y Perfil Sociodemográfico / Académico (Obligatorio en primer ingreso / Edición libre) */}
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => {
            if (!isProfileMandatory) setIsProfileModalOpen(false);
          }}
          currentUser={currentUser}
          participant={participants.find(p => p.email.toLowerCase() === currentUser.email.toLowerCase()) || null}
          externalTrainings={externalTrainings}
          isMandatory={isProfileMandatory}
          onSaveProfile={handleSaveProfile}
          onShowToast={showToast}
        />
      )}

    </div>
  );
}

export default App;