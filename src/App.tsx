import React, { useState, useEffect } from 'react';
import { apiService, MOCK_USERS } from './services/api';
import { 
  TrainingEvent, 
  Participant, 
  UserAccount, 
  ToastNotification, 
  TabView, 
  EventFeedback 
} from './types';
import { Navbar } from './components/layout/Navbar';
import { LoginModal } from './components/auth/LoginModal';
import { CatalogView } from './components/catalog/CatalogView';
import { MyRegistrationsView } from './components/reservations/MyRegistrationsView';
import { ReservationModal } from './components/reservations/ReservationModal';
import { AttendanceView } from './components/attendance/AttendanceView';
import { DashboardView } from './components/dashboard/DashboardView';
import { AdminView } from './components/admin/AdminView';
import { Toast } from './components/common/Toast';

export function App() {
  const [events, setEvents] = useState<TrainingEvent[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [users, setUsers] = useState<UserAccount[]>(MOCK_USERS);

  // Sesión del usuario autenticado
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('ch_logged_user');
    return saved ? JSON.parse(saved) : null;
  });

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
        const [loadedEvents, loadedParticipants, loadedUsers] = await Promise.all([
          apiService.getEvents(),
          apiService.getParticipants(),
          apiService.getUsers()
        ]);
        setEvents(loadedEvents);
        setParticipants(loadedParticipants);
        setUsers(loadedUsers);
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
    localStorage.setItem('ch_logged_user', JSON.stringify(user));
    showToast('¡Bienvenido!', `Has iniciado sesión como ${user.name}.`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
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

  const handleCancelRegistration = async (eventId: string, date: string, time: string, email: string) => {
    const updated = await apiService.cancelRegistration(eventId, date, time, email);
    setEvents(updated);
    showToast('Inscripción cancelada', 'Tu cupo ha sido liberado para otros colaboradores.', 'info');
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

  const handleSendNotification = async (eventId: string, channel: 'Email' | 'Teams', message: string, recipients: number) => {
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        currentTab={currentTab}
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
            onOpenReservationModal={(event) => setSelectedEventForModal(event)}
          />
        )}

        {/* Tab 2: Mis Inscripciones */}
        {currentTab === 'my-registrations' && (
          <MyRegistrationsView
            events={events}
            currentUser={currentUser}
            onCancelRegistration={handleCancelRegistration}
            onExploreCatalog={() => setCurrentTab('landing')}
          />
        )}

        {/* Tab 3: Métricas & KPIs (Solo Super Administrador) */}
        {currentTab === 'dashboard' && currentUser.role === 'Super Administrador' && (
          <DashboardView
            events={events}
            participants={participants}
          />
        )}

        {/* Tab 4: Administración (Super Admin o Administrador / Editor) */}
        {currentTab === 'admin' && (currentUser.role === 'Super Administrador' || currentUser.role === 'Administrador / Editor') && (
          <AdminView
            events={events}
            participants={participants}
            users={users}
            currentUser={currentUser}
            onSaveEvent={handleSaveEvent}
            onDeleteEvent={handleDeleteEvent}
            onSaveParticipants={handleSaveParticipants}
            onSaveUsers={handleSaveUsers}
            onConfirmAttendance={handleConfirmAttendance}
            onSendNotification={handleSendNotification}
            onShowToast={showToast}
          />
        )}

        {/* Tab 5: Check-in de Asistencia Presencial por QR */}
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