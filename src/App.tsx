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
import { LoginModal } from './components/auth/LoginModal';
import { CatalogView } from './components/catalog/CatalogView';
import { MyRegistrationsView } from './components/reservations/MyRegistrationsView';
import { ReservationModal } from './components/reservations/ReservationModal';
import { AttendanceView } from './components/attendance/AttendanceView';
import { DashboardView } from './components/dashboard/DashboardView';
import { AdminView } from './components/admin/AdminView';
import { TeamLeadView } from './components/supervisor/TeamLeadView';
import { OjtManager } from './components/ojt/OjtManager';
import { Toast } from './components/common/Toast';
import { Footer } from './components/common/Footer';

export function App() {
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [settings, setSettings] = useState<SystemSettings>({
    ojt_plan_90d: { enabled: true, enable_702010: true, enable_calibration: true, target_ttp_days: 30 }
  });
  const [checklists, setChecklists] = useState<OjtChecklist[]>([]);
  const [calibrations, setCalibrations] = useState<CalibrationSession[]>([]);

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
  const [currentTab, setCurrentTab] = useState<TabView>('landing');

  // Parámetros de asistencia QR
  const [attendanceEventId, setAttendanceEventId] = useState<string | null>(null);
  const [attendanceDate, setAttendanceDate] = useState<string | null>(null);
  const [attendanceTime, setAttendanceTime] = useState<string | null>(null);

  // Modales
  const [selectedEventForModal, setSelectedEventForModal] = useState<TrainingEvent | null>(null);
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
      } catch (err) {
        console.error('Error al cargar datos:', err);
      }
    };
    loadData();
  }, []);

  // Detección de parámetros URL (para QR Check-In)
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
    }
  }, []);

  // Handlers de Sesión
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    if (user.role !== 'Super Administrador') {
      setSelectedCompanyId(user.companyId || 'emp_kasino');
    }
    localStorage.setItem('ch_logged_user', JSON.stringify(user));
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

  // Contar inscripciones activas del usuario logueado
  let myRegistrationsCount = 0;
  if (currentUser) {
    events.forEach(e => e.schedule.forEach(s => s.slots.forEach(sl => {
      if (sl.attendees.map(a => a.toLowerCase()).includes(currentUser.email.toLowerCase())) {
        myRegistrationsCount++;
      }
    })));
  }

  // Si no está logueado, mostrar pantalla de inicio de sesión
  if (!currentUser) {
    const targetEvent = attendanceEventId ? events.find(e => e.id === attendanceEventId) : null;
    return (
      <>
        <LoginModal
          users={users}
          onLoginSuccess={handleLoginSuccess}
          attendanceEventTitle={targetEvent?.title}
          attendanceTime={attendanceTime}
        />
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

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col selection:bg-[#DA291C] selection:text-white font-sans">
      
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
          />
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
          />
        )}

      </main>

      {/* Corporate Claro Training Footer */}
      <Footer />

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

    </div>
  );
}

export default App;