import React, { useState, useMemo } from 'react';
import { 
  Sliders, 
  BookOpen, 
  Users, 
  ShieldCheck, 
  Sparkles,
  UserPlus,
  Calendar,
  Layers,
  Building2,
  Activity,
  Settings
} from 'lucide-react';
import { TrainingEvent, Participant, UserAccount, ParticipantGroup, TrainingProgram, Company, SystemSettings, OjtChecklist, CalibrationSession } from '../../types';
import { EventsManager } from './EventsManager';
import { ParticipantsManager } from './ParticipantsManager';
import { UsersManager } from './UsersManager';
import { GroupsManager } from './GroupsManager';
import { ProgramsManager } from './ProgramsManager';
import { CompaniesManager } from './CompaniesManager';
import { SettingsManager } from './SettingsManager';
import { OjtManager } from '../ojt/OjtManager';
import { EventFormModal } from './EventFormModal';
import { AttendeesModal } from './AttendeesModal';
import { NotificationModal } from './NotificationModal';
import { QrModal } from './QrModal';
import { BulkEnrollmentModal } from './BulkEnrollmentModal';

interface AdminViewProps {
  events: TrainingEvent[];
  participants: Participant[];
  users: UserAccount[];
  groups: ParticipantGroup[];
  programs: TrainingProgram[];
  companies?: Company[];
  settings?: SystemSettings;
  checklists?: OjtChecklist[];
  calibrations?: CalibrationSession[];
  selectedCompanyId?: string;
  currentUser: UserAccount | null;
  onSelectCompanyScope?: (companyId: string) => void;
  onSaveCompany?: (company: Company) => Promise<void>;
  onDeleteCompany?: (companyId: string) => Promise<void>;
  onUpdateSettings?: (settings: SystemSettings) => void;
  onSaveChecklist?: (checklist: Partial<OjtChecklist>) => Promise<void>;
  onDeleteChecklist?: (id: string) => Promise<void>;
  onSaveCalibration?: (session: Partial<CalibrationSession>) => Promise<void>;
  onSaveEvent: (event: TrainingEvent) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
  onSaveParticipants: (participants: Participant[]) => Promise<void>;
  onSaveUsers: (users: UserAccount[]) => Promise<void>;
  onSaveGroup: (group: ParticipantGroup) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onSaveProgram: (program: TrainingProgram) => Promise<void>;
  onDeleteProgram: (programId: string) => Promise<void>;
  onConfirmAttendance: (eventId: string, date: string, time: string, email: string) => Promise<void>;
  onSendNotification: (eventId: string, channel: 'Email' | 'Teams', message: string, recipients: number) => Promise<void>;
  onBulkRegisterUsers: (
    eventId: string, 
    date: string, 
    time: string, 
    emails: string[], 
    autoExpandCapacity?: boolean
  ) => Promise<{ events: TrainingEvent[]; enrolledCount: number; skippedAlreadyEnrolled: string[] }>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  events,
  participants,
  users,
  groups,
  programs,
  companies = [],
  settings = { ojt_plan_90d: { enabled: true, enable_702010: true, enable_calibration: true, target_ttp_days: 30 } },
  checklists = [],
  calibrations = [],
  selectedCompanyId = 'all',
  currentUser,
  onSelectCompanyScope,
  onSaveCompany,
  onDeleteCompany,
  onUpdateSettings,
  onSaveChecklist,
  onDeleteChecklist,
  onSaveCalibration,
  onSaveEvent,
  onDeleteEvent,
  onSaveParticipants,
  onSaveUsers,
  onSaveGroup,
  onDeleteGroup,
  onSaveProgram,
  onDeleteProgram,
  onConfirmAttendance,
  onSendNotification,
  onBulkRegisterUsers,
  onShowToast
}) => {
  const [adminTab, setAdminTab] = useState<'events' | 'programs' | 'groups' | 'participants' | 'users' | 'companies' | 'ojt' | 'settings'>('events');

  // Modals state
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TrainingEvent | null>(null);
  const [attendeesEvent, setAttendeesEvent] = useState<TrainingEvent | null>(null);
  const [notificationEvent, setNotificationEvent] = useState<TrainingEvent | null>(null);
  const [qrEvent, setQrEvent] = useState<TrainingEvent | null>(null);

  // Bulk Enrollment Modal state (Super Admin only)
  const [isBulkEnrollmentOpen, setIsBulkEnrollmentOpen] = useState(false);
  const [bulkEventId, setBulkEventId] = useState<string | null>(null);
  const [bulkDate, setBulkDate] = useState<string | null>(null);
  const [bulkTime, setBulkTime] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role === 'Super Administrador';
  const effectiveCompanyId = isSuperAdmin ? selectedCompanyId : (currentUser?.companyId || 'emp_kasino');

  // Filtrado de entidades por empresa activa / asignada
  const scopedEvents = useMemo(() => {
    if (isSuperAdmin && effectiveCompanyId === 'all') return events;
    return events.filter(e => (e.companyId || 'emp_kasino') === effectiveCompanyId);
  }, [events, isSuperAdmin, effectiveCompanyId]);

  const scopedPrograms = useMemo(() => {
    if (isSuperAdmin && effectiveCompanyId === 'all') return programs;
    return programs.filter(p => (p.companyId || 'emp_kasino') === effectiveCompanyId);
  }, [programs, isSuperAdmin, effectiveCompanyId]);

  const scopedGroups = useMemo(() => {
    if (isSuperAdmin && effectiveCompanyId === 'all') return groups;
    return groups.filter(g => (g.companyId || 'emp_kasino') === effectiveCompanyId);
  }, [groups, isSuperAdmin, effectiveCompanyId]);

  const scopedParticipants = useMemo(() => {
    if (isSuperAdmin && effectiveCompanyId === 'all') return participants;
    return participants.filter(p => (p.companyId || 'emp_kasino') === effectiveCompanyId);
  }, [participants, isSuperAdmin, effectiveCompanyId]);

  const scopedUsers = useMemo(() => {
    if (isSuperAdmin && effectiveCompanyId === 'all') return users;
    return users.filter(u => (u.companyId || 'emp_kasino') === effectiveCompanyId);
  }, [users, isSuperAdmin, effectiveCompanyId]);

  const scopedChecklists = useMemo(() => {
    if (isSuperAdmin && effectiveCompanyId === 'all') return checklists;
    return checklists.filter(c => (c.companyId || 'emp_kasino') === effectiveCompanyId);
  }, [checklists, isSuperAdmin, effectiveCompanyId]);

  const scopedCalibrations = useMemo(() => {
    if (isSuperAdmin && effectiveCompanyId === 'all') return calibrations;
    return calibrations.filter(c => (c.companyId || 'emp_kasino') === effectiveCompanyId);
  }, [calibrations, isSuperAdmin, effectiveCompanyId]);

  const handleOpenBulkEnrollment = (eventId?: string, date?: string, time?: string) => {
    setBulkEventId(eventId || null);
    setBulkDate(date || null);
    setBulkTime(time || null);
    setIsBulkEnrollmentOpen(true);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header Banner (Light Theme & Fully Responsive) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Top Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 text-xs font-bold text-[#DA291C]">
              <Sliders className="w-4 h-4" />
              <span>Panel de Control Administrativo</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Administración del Sistema
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Crea cursos, cronogramas grupales, gestiona cupos, importa padrones y audita el cumplimiento.
            </p>
          </div>

          {/* Company Scope Selector */}
          {companies.length > 0 && isSuperAdmin && onSelectCompanyScope && (
            <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200 text-xs shrink-0 self-start lg:self-auto">
              <Building2 className="w-4 h-4 text-[#DA291C] shrink-0" />
              <select
                value={selectedCompanyId}
                onChange={(e) => onSelectCompanyScope(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">🏢 Todas las Empresas</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    🏢 {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Sub-tabs Selector with Dedicated Responsive Scroll Bar */}
        <div className="w-full overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 min-w-max gap-1">
            <button
              onClick={() => setAdminTab('events')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                adminTab === 'events'
                  ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Capacitaciones ({scopedEvents.length})</span>
            </button>

            <button
              onClick={() => setAdminTab('programs')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                adminTab === 'programs'
                  ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Cronogramas ({scopedPrograms.length})</span>
            </button>

            <button
              onClick={() => setAdminTab('groups')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                adminTab === 'groups'
                  ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Grupos & Áreas ({scopedGroups.length})</span>
            </button>

            <button
              onClick={() => setAdminTab('participants')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                adminTab === 'participants'
                  ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Padrón ({scopedParticipants.length})</span>
            </button>

            {(isSuperAdmin || currentUser?.role === 'Administrador / Editor') && (
              <button
                onClick={() => setAdminTab('users')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  adminTab === 'users'
                    ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Usuarios ({scopedUsers.length})</span>
              </button>
            )}

            {settings?.ojt_plan_90d?.enabled !== false && (isSuperAdmin || currentUser?.role === 'Evaluador / Tutor OJT') && (
              <button
                onClick={() => setAdminTab('ojt')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  adminTab === 'ojt'
                    ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>OJT & Campo ({scopedChecklists.length})</span>
              </button>
            )}

            {isSuperAdmin && (
              <button
                onClick={() => setAdminTab('companies')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  adminTab === 'companies'
                    ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Empresas ({companies.length})</span>
              </button>
            )}

            {isSuperAdmin && (
              <button
                onClick={() => setAdminTab('settings')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  adminTab === 'settings'
                    ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Sliders className="w-4 h-4 text-amber-600" />
                <span>Configuración</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-tab Content */}
      {adminTab === 'events' && (
        <EventsManager
          events={scopedEvents}
          companies={companies}
          participants={scopedParticipants}
          isSuperAdmin={isSuperAdmin}
          onOpenCreateModal={() => {
            setEditingEvent(null);
            setIsEventFormOpen(true);
          }}
          onOpenEditModal={(evt) => {
            setEditingEvent(evt);
            setIsEventFormOpen(true);
          }}
          onOpenAttendeesModal={(evt) => setAttendeesEvent(evt)}
          onOpenNotificationModal={(evt) => setNotificationEvent(evt)}
          onOpenQrModal={(evt) => setQrEvent(evt)}
          onOpenBulkEnrollment={(evtId) => handleOpenBulkEnrollment(evtId)}
          onDeleteEvent={async (id) => {
            await onDeleteEvent(id);
            onShowToast('Capacitación eliminada', 'El evento ha sido removido del sistema.', 'info');
          }}
        />
      )}

      {adminTab === 'programs' && (
        <ProgramsManager
          programs={scopedPrograms}
          events={scopedEvents}
          participants={scopedParticipants}
          groups={scopedGroups}
          companies={companies}
          currentUser={currentUser}
          isSuperAdmin={isSuperAdmin}
          onSaveProgram={onSaveProgram}
          onDeleteProgram={onDeleteProgram}
          onSendNotification={onSendNotification}
          onShowToast={onShowToast}
        />
      )}

      {adminTab === 'groups' && (
        <GroupsManager
          groups={scopedGroups}
          participants={scopedParticipants}
          companies={companies}
          currentUser={currentUser}
          isSuperAdmin={isSuperAdmin}
          onSaveGroup={onSaveGroup}
          onDeleteGroup={onDeleteGroup}
          onShowToast={onShowToast}
        />
      )}

      {adminTab === 'participants' && (
        <ParticipantsManager
          participants={scopedParticipants}
          users={scopedUsers}
          events={scopedEvents}
          programs={scopedPrograms}
          companies={companies}
          currentUser={currentUser}
          isSuperAdmin={isSuperAdmin}
          onSaveParticipants={onSaveParticipants}
          onSaveUsers={onSaveUsers}
          onShowToast={onShowToast}
        />
      )}

      {adminTab === 'users' && (isSuperAdmin || currentUser?.role === 'Administrador / Editor') && (
        <UsersManager
          users={scopedUsers}
          participants={scopedParticipants}
          events={scopedEvents}
          programs={scopedPrograms}
          companies={companies}
          currentUser={currentUser}
          onSaveUsers={onSaveUsers}
          onSaveParticipants={onSaveParticipants}
          onShowToast={onShowToast}
        />
      )}

      {adminTab === 'companies' && isSuperAdmin && onSaveCompany && onDeleteCompany && (
        <CompaniesManager
          companies={companies}
          participants={participants}
          users={users}
          events={events}
          selectedCompanyId={selectedCompanyId}
          onSelectCompanyScope={onSelectCompanyScope || (() => {})}
          onSaveCompany={onSaveCompany}
          onDeleteCompany={onDeleteCompany}
          onShowToast={onShowToast}
        />
      )}

      {adminTab === 'ojt' && settings?.ojt_plan_90d?.enabled !== false && (isSuperAdmin || currentUser?.role === 'Evaluador / Tutor OJT') && (
        <OjtManager
          checklists={scopedChecklists}
          calibrations={scopedCalibrations}
          participants={scopedParticipants}
          currentUser={currentUser}
          companies={companies}
          isSuperAdmin={isSuperAdmin}
          onSaveChecklist={onSaveChecklist || (async () => {})}
          onDeleteChecklist={onDeleteChecklist || (async () => {})}
          onSaveCalibration={onSaveCalibration || (async () => {})}
          onShowToast={onShowToast}
        />
      )}

      {adminTab === 'settings' && isSuperAdmin && onUpdateSettings && (
        <SettingsManager
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onShowToast={onShowToast}
        />
      )}

      {/* Modals */}
      {isEventFormOpen && (
        <EventFormModal
          initialEvent={editingEvent}
          companies={companies}
          users={scopedUsers}
          currentUser={currentUser}
          isSuperAdmin={isSuperAdmin}
          onClose={() => {
            setIsEventFormOpen(false);
            setEditingEvent(null);
          }}
          onSaveEvent={async (evt) => {
            await onSaveEvent(evt);
            onShowToast(
              editingEvent ? 'Capacitación actualizada' : 'Capacitación creada',
              `"${evt.title}" ha sido guardada correctamente.`,
              'success'
            );
          }}
        />
      )}

      {attendeesEvent && (
        <AttendeesModal
          event={attendeesEvent}
          participants={participants}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setAttendeesEvent(null)}
          onConfirmAttendance={async (evtId, date, time, email) => {
            await onConfirmAttendance(evtId, date, time, email);
            onShowToast('Asistencia confirmada', `Se confirmó la asistencia para ${email}.`, 'success');
          }}
          onOpenBulkEnrollment={(evtId, date, time) => handleOpenBulkEnrollment(evtId, date, time)}
          onSaveGradesSuccess={(updatedEvt) => {
            setAttendeesEvent(updatedEvt);
            onShowToast('Calificaciones guardadas', `Se han registrado las calificaciones y debilidades para "${updatedEvt.title}".`, 'success');
          }}
        />
      )}

      {notificationEvent && (
        <NotificationModal
          event={notificationEvent}
          onClose={() => setNotificationEvent(null)}
          onSendNotification={async (evtId, channel, msg, recipients) => {
            await onSendNotification(evtId, channel, msg, recipients);
            onShowToast('Difusión enviada', `Recordatorio enviado a ${recipients} colaboradores por ${channel}.`, 'success');
          }}
        />
      )}

      {qrEvent && (
        <QrModal
          event={qrEvent}
          onClose={() => setQrEvent(null)}
        />
      )}

      {/* Bulk Enrollment Modal (Super Admin Exclusive) */}
      {isBulkEnrollmentOpen && isSuperAdmin && (
        <BulkEnrollmentModal
          events={events}
          participants={participants}
          users={users}
          initialEventId={bulkEventId}
          initialDate={bulkDate}
          initialTime={bulkTime}
          onClose={() => setIsBulkEnrollmentOpen(false)}
          onBulkRegister={onBulkRegisterUsers}
          onShowToast={onShowToast}
        />
      )}

    </div>
  );
};

