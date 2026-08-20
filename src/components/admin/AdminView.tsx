import React, { useState } from 'react';
import { 
  Sliders, 
  BookOpen, 
  Users, 
  ShieldCheck, 
  Sparkles,
  UserPlus,
  Calendar,
  Layers
} from 'lucide-react';
import { TrainingEvent, Participant, UserAccount, ParticipantGroup, TrainingProgram } from '../../types';
import { EventsManager } from './EventsManager';
import { ParticipantsManager } from './ParticipantsManager';
import { UsersManager } from './UsersManager';
import { GroupsManager } from './GroupsManager';
import { ProgramsManager } from './ProgramsManager';
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
  currentUser: UserAccount | null;
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
  currentUser,
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
  const [adminTab, setAdminTab] = useState<'events' | 'programs' | 'groups' | 'participants' | 'users'>('events');

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

  const handleOpenBulkEnrollment = (eventId?: string, date?: string, time?: string) => {
    setBulkEventId(eventId || null);
    setBulkDate(date || null);
    setBulkTime(time || null);
    setIsBulkEnrollmentOpen(true);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-indigo-400">
            <Sliders className="w-4 h-4" />
            <span>Panel de Control Administrativo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Administración del Sistema</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Crea cursos, cronogramas grupales, gestiona cupos, importa padrones y audita el cumplimiento.
          </p>
        </div>

        {/* Sub-tabs Selector */}
        <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-stretch sm:self-auto overflow-x-auto gap-1">
          <button
            onClick={() => setAdminTab('events')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              adminTab === 'events'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Capacitaciones ({events.length})</span>
          </button>

          <button
            onClick={() => setAdminTab('programs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              adminTab === 'programs'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Cronogramas ({programs.length})</span>
          </button>

          <button
            onClick={() => setAdminTab('groups')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              adminTab === 'groups'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Grupos & Áreas ({groups.length})</span>
          </button>

          <button
            onClick={() => setAdminTab('participants')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              adminTab === 'participants'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Padrón ({participants.length})</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setAdminTab('users')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                adminTab === 'users'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Usuarios ({users.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab Content */}
      {adminTab === 'events' && (
        <EventsManager
          events={events}
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
          programs={programs}
          events={events}
          participants={participants}
          groups={groups}
          onSaveProgram={onSaveProgram}
          onDeleteProgram={onDeleteProgram}
          onSendNotification={onSendNotification}
          onShowToast={onShowToast}
        />
      )}

      {adminTab === 'groups' && (
        <GroupsManager
          groups={groups}
          participants={participants}
          onSaveGroup={onSaveGroup}
          onDeleteGroup={onDeleteGroup}
          onShowToast={onShowToast}
        />
      )}

      {adminTab === 'participants' && (
        <ParticipantsManager
          participants={participants}
          users={users}
          onSaveParticipants={onSaveParticipants}
          onShowToast={onShowToast}
        />
      )}

      {adminTab === 'users' && isSuperAdmin && (
        <UsersManager
          users={users}
          participants={participants}
          currentUser={currentUser}
          onSaveUsers={onSaveUsers}
          onSaveParticipants={onSaveParticipants}
          onShowToast={onShowToast}
        />
      )}

      {/* Modals */}
      {isEventFormOpen && (
        <EventFormModal
          initialEvent={editingEvent}
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

