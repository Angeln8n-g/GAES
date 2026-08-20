import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Users, 
  Bell, 
  QrCode, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Video, 
  AlertTriangle,
  ExternalLink,
  UserPlus
} from 'lucide-react';
import { TrainingEvent } from '../../types';
import { formatDateShort } from '../../utils/formatters';

interface EventsManagerProps {
  events: TrainingEvent[];
  isSuperAdmin?: boolean;
  onOpenCreateModal: () => void;
  onOpenEditModal: (event: TrainingEvent) => void;
  onOpenAttendeesModal: (event: TrainingEvent) => void;
  onOpenNotificationModal: (event: TrainingEvent) => void;
  onOpenQrModal: (event: TrainingEvent) => void;
  onOpenBulkEnrollment?: (eventId?: string) => void;
  onDeleteEvent: (eventId: string) => Promise<void>;
}

export const EventsManager: React.FC<EventsManagerProps> = ({
  events,
  isSuperAdmin = false,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenAttendeesModal,
  onOpenNotificationModal,
  onOpenQrModal,
  onOpenBulkEnrollment,
  onDeleteEvent
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredEvents = events.filter(evt => {
    const q = searchQuery.toLowerCase();
    return (
      evt.title.toLowerCase().includes(q) ||
      evt.instructor.toLowerCase().includes(q) ||
      evt.category.toLowerCase().includes(q)
    );
  });

  const handleDelete = async (id: string) => {
    try {
      await onDeleteEvent(id);
      setDeletingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Bar: Search & Create Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute inset-y-0 left-3.5 my-auto" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, instructor o categoría..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSuperAdmin && onOpenBulkEnrollment && (
            <button
              onClick={() => onOpenBulkEnrollment()}
              className="px-3.5 py-2.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-200 text-xs font-bold rounded-2xl flex items-center gap-1.5 shadow-md shadow-indigo-600/10 transition-all"
            >
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <span>Matriculación Masiva</span>
            </button>
          )}

          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nueva Capacitación</span>
          </button>
        </div>
      </div>

      {/* Events Table / Cards */}
      <div className="space-y-4">
        {filteredEvents.map(event => {
          let totalCap = 0;
          let totalReg = 0;
          let totalAtt = 0;

          event.schedule.forEach(sch => {
            sch.slots.forEach(slot => {
              totalCap += slot.capacity;
              totalReg += slot.registered;
              totalAtt += (slot.attendedList || []).length;
            });
          });

          return (
            <div
              key={event.id}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              
              {/* Event Info */}
              <div className="flex items-start gap-4">
                <img
                  src={event.imageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"}
                  alt={event.title}
                  className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-slate-800 hidden sm:block"
                />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400">
                      {event.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                      event.modality === 'Virtual' ? 'bg-cyan-500/10 text-cyan-300' : 'bg-emerald-500/10 text-emerald-300'
                    }`}>
                      {event.modality === 'Virtual' ? <Video className="w-2.5 h-2.5" /> : <MapPin className="w-2.5 h-2.5" />}
                      {event.modality}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white leading-snug">{event.title}</h3>
                  <p className="text-xs text-slate-400">Facilitador: <strong className="text-slate-300">{event.instructor}</strong></p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3 text-indigo-400" />
                      {event.schedule.length} fecha(s)
                    </span>
                    <span>•</span>
                    <span className="text-cyan-300 font-semibold">{totalReg} / {totalCap} inscritos</span>
                    <span>•</span>
                    <span className="text-emerald-300 font-semibold">{totalAtt} confirmados</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center gap-2 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-800">
                <button
                  onClick={() => onOpenAttendeesModal(event)}
                  title="Ver Asistentes"
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Asistentes ({totalReg})</span>
                </button>

                <button
                  onClick={() => onOpenNotificationModal(event)}
                  title="Enviar Recordatorio"
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-slate-800 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onOpenQrModal(event)}
                  title="Generar e Imprimir QR"
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-purple-400 hover:text-purple-300 border border-slate-800 transition-colors"
                >
                  <QrCode className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onOpenEditModal(event)}
                  title="Editar Capacitación"
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-800 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setDeletingId(event.id)}
                  title="Eliminar Capacitación"
                  className="p-2 rounded-xl bg-slate-950 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-slate-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">¿Eliminar esta capacitación?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Esta acción eliminará el evento, sus horarios y todas las inscripciones asociadas. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/30"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
