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
  CalibrationSession
} from './types';
import { Navbar } from './components/layout/Navbar';
import { SuperAdminSidebar } from './components/layout/SuperAdminSidebar';
import { LoginModal } from './components/auth/LoginModal';
import { CatalogView } from './components/catalog/CatalogView';
import { MyRegistrationsView } from './components/reservations/MyRegistrationsView';
import { ReservationModal } from './components/reservations/ReservationModal';
import { AttendanceView } from './components/attendance/AttendanceView';
import { DashboardView } from './components/dashboard/DashboardView';
import { AdminView } from './components/admin/AdminView';
import { TeamLeadView } from './components/supervisor/TeamLeadView';
import { OjtManager } from './components/ojt/OjtManager';
import { EvaluatorCoursesView } from './components/evaluator/EvaluatorCoursesView';
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
import { ReceptionLobbySection } from './components/lobby/ReceptionLobbySection';

export function App() {
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [settings, setSettings] = useState<SystemSettings>({
    ojt_plan_90d: { enabled: true, enable_702010: true, enable_calibration: true, target_ttp_days: 30 }
  });
  const [checklists, setChecklists] = useState<OjtChecklist[]>([]);
  const [calibrations, setCalibrations] = useState<CalibrationSession[]>([]);

  // Estado del panel lateral (exclusivo para SuperAdmin)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Modal de cambio de contraseña para usuario autenticado
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);

  // Sesión del usuario autenticado
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('ch_logged_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    const saved = localStorage.getItem('ch_logged_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u && u.role !== 'Super Administrador') {
          return u.companyId || 'emp_kasino';
        }
      } catch (e) {}
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
    const saved = localStorage.getItem('ch_logged_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u && u.role === 'Evaluador / Tutor OJT') {
          return 'evaluator-courses';
        }
      } catch (e) {}
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
          loadedCalibrations
        ] = await Promise.all([
          apiService.getCompanies(),
          apiService.getEvents(),
          apiService.getParticipants(),
          apiService.getUsers(),
          apiService.getGroups(),
          apiService.getPrograms(),
          apiService.getSettings(),
          apiService.getOjtChecklists(),
          apiService.getCalibrationSessions()
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

        // Auto-consulta si la URL contiene ?cedula=
        const urlParams = new URLSearchParams(window.location.search);
        const cedulaFromUrl = urlParams.get('cedula');
        if (cedulaFromUrl) {
          const res = findAttendeeByCedula(cedulaFromUrl, loadedParticipants, loadedUsers, loadedEvents);
          setAttendeeLookupResult(res);
          setIsAttendeeScheduleModalOpen(true);
          setLastSearchedCedula(cedulaFromUrl);
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

  const handleConfirmAttendance = async (eventId: string, date: string, time: string, email: string) => {
    const updated = await apiService.confirmAttendance(eventId, date, time, email);
    setEvents(updated);
  };

  const handleRevertAttendance = async (eventId: string, date: string, time: string, email: string) => {
    const updated = await apiService.revertAttendance(eventId, date, time, email);
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

  const handleConfirmAttendanceLobby = async (eventId: string, date: string, time: string, email: string) => {
    const updated = await apiService.confirmAttendance(eventId, date, time, email);
    setEvents(updated);
    if (lastSearchedCedula) {
      const refreshed = findAttendeeByCedula(lastSearchedCedula, participants, users, updated);
      setAttendeeLookupResult(refreshed);
    }
    showToast('Asistencia Confirmada', 'Tu asistencia presencial ha sido validada exitosamente.', 'success');
  };

  const handleSubmitFeedback = async (feedback: EventFeedback) => {
    const updated = await apiService.submitFeedback(feedback);
    setEvents(updated);
    showToast('¡Gracias por tu opinión!', 'Tu evaluación ha sido registrada.', 'success');
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

  // Si no está logueado y no está en modo Kiosco, mostrar pantalla de inicio de sesión
  if (!currentUser && currentTab !== 'kiosk') {
    const targetEvent = attendanceEventId ? events.find(e => e.id === attendanceEventId) : null;
    return (
      <>
        <LoginModal
          users={users}
          onLoginSuccess={handleLoginSuccess}
          onUsersUpdated={(newUsers) => setUsers(newUsers)}
          attendanceEventTitle={targetEvent?.title}
          attendanceTime={attendanceTime}
          onOpenKiosk={() => setCurrentTab('kiosk')}
          onOpenCedulaScanner={() => setIsCedulaScannerOpen(true)}
        />

        {/* Cedula Scanner Modal */}
        {isCedulaScannerOpen && (
          <CedulaScannerModal
            isOpen={isCedulaScannerOpen}
            onClose={() => setIsCedulaScannerOpen(false)}
            onCedulaDetected={handleCedulaDetected}
          />
        )}

        {/* Attendee Schedule Modal */}
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

  // Si no está logueado pero está en Kiosco interactivo de Lobby
  if (!currentUser && currentTab === 'kiosk') {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-between p-4 sm:p-8">
        <div className="max-w-5xl w-full mx-auto my-auto py-8">
          <ReceptionLobbySection
            onLookupCedula={handleLookupCedula}
            onOpenCedulaScanner={() => setIsCedulaScannerOpen(true)}
            isSearching={isSearchingCedula}
            isKioskMode={true}
            onExitKiosk={() => setCurrentTab('landing')}
          />
        </div>
        <Footer />

        {/* Cedula Scanner Modal */}
        {isCedulaScannerOpen && (
          <CedulaScannerModal
            isOpen={isCedulaScannerOpen}
            onClose={() => setIsCedulaScannerOpen(false)}
            onCedulaDetected={handleCedulaDetected}
          />
        )}

        {/* Attendee Schedule Modal */}
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
      </div>
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
          onOpenCedulaScanner={() => setIsCedulaScannerOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          
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
            onOpenCedulaScanner={() => setIsCedulaScannerOpen(true)}
            onLookupCedula={handleLookupCedula}
            isSearchingCedula={isSearchingCedula}
          />
        )}

        {/* Tab Kiosk: Kiosco Interactivo de Recepción / Lobby */}
        {currentTab === 'kiosk' && (
          <div className="py-4">
            <ReceptionLobbySection
              onLookupCedula={handleLookupCedula}
              onOpenCedulaScanner={() => setIsCedulaScannerOpen(true)}
              isSearching={isSearchingCedula}
              isKioskMode={true}
              onExitKiosk={() => setCurrentTab('landing')}
            />
          </div>
        )}

        {/* Tab 2: Mis Inscripciones & Rutas Formativas */}
        {currentTab === 'my-registrations' && (
          <MyRegistrationsView
            events={events}
            currentUser={currentUser}
            programs={programs}
            groups={groups}
            participants={participants}
            onCancelRegistration={handleCancelRegistration}
            onExploreCatalog={() => setCurrentTab('landing')}
            onOpenReservationModal={(event) => setSelectedEventForModal(event)}
            onOpenQrScanner={() => setIsQrScannerOpen(true)}
            onOpenTecEvaluation={(event) => setSelectedEventForTecModal(event)}
          />
        )}

        {/* Tab 3: Métricas & KPIs */}
        {currentTab === 'dashboard' && (currentUser.role === 'Super Administrador' || currentUser.role === 'Administrador / Editor') && (
          <DashboardView
            events={events}
            participants={participants}
            groups={groups}
            programs={programs}
            companies={companies}
            settings={settings}
            checklists={checklists}
            calibrations={calibrations}
            selectedCompanyId={currentUser.role === 'Super Administrador' ? selectedCompanyId : (currentUser.companyId || 'emp_kasino')}
            currentUser={currentUser}
            onSelectCompanyScope={currentUser.role === 'Super Administrador' ? ((cId) => setSelectedCompanyId(cId)) : undefined}
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
            selectedCompanyId={selectedCompanyId}
            onSelectCompanyScope={(cId) => setSelectedCompanyId(cId)}
            onSaveCompany={handleSaveCompany}
            onDeleteCompany={handleDeleteCompany}
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

      {/* Cedula Scanner Modal (Camera / Optical Reader) */}
      {isCedulaScannerOpen && (
        <CedulaScannerModal
          isOpen={isCedulaScannerOpen}
          onClose={() => setIsCedulaScannerOpen(false)}
          onCedulaDetected={handleCedulaDetected}
        />
      )}

      {/* Attendee Schedule & Course Grid Modal */}
      {isAttendeeScheduleModalOpen && attendeeLookupResult && (
        <AttendeeScheduleModal
          isOpen={isAttendeeScheduleModalOpen}
          onClose={() => setIsAttendeeScheduleModalOpen(false)}
          lookupResult={attendeeLookupResult}
          onConfirmAttendance={handleConfirmAttendanceLobby}
          onOpenTecEvaluation={(event) => setSelectedEventForTecModal(event)}
          onExploreCatalog={() => {
            setIsAttendeeScheduleModalOpen(false);
            setCurrentTab('landing');
          }}
          onShowToast={showToast}
        />
      )}

    </div>
  );
}

export default App;