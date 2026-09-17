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
  UserPlus,
  Building2,
  FileSpreadsheet,
  UserCheck,
  BookOpen,
  RotateCw
} from 'lucide-react';
import { TrainingEvent, Company, Participant } from '../../types';
import { formatDateShort } from '../../utils/formatters';
import { exportSessionGradesForOjtAndCalibration } from '../../utils/excelUtils';

interface EventsManagerProps {
  events: TrainingEvent[];
  companies?: Company[];
  participants?: Participant[];
  isSuperAdmin?: boolean;
  onOpenCreateModal: () => void;
  onOpenEditModal: (event: TrainingEvent) => void;
  onOpenAttendeesModal: (event: TrainingEvent) => void;
  onOpenNotificationModal: (event: TrainingEvent) => void;
  onOpenQrModal: (event: TrainingEvent) => void;
  onOpenBulkEnrollment?: (eventId?: string) => void;
  onMakeRecurrent?: (event: TrainingEvent) => void;
  onDeleteEvent: (eventId: string) => Promise<void>;
}

export const EventsManager: React.FC<EventsManagerProps> = ({
  events,
  companies = [],
  participants = [],
  isSuperAdmin = false,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenAttendeesModal,
  onOpenNotificationModal,
  onOpenQrModal,
  onOpenBulkEnrollment,
  onMakeRecurrent,
  onDeleteEvent
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredEvents = events.filter(evt => {
    const q = searchQuery.toLowerCase();
    const isGlobal = !evt.companyId || evt.companyId === 'all' || (Array.isArray(evt.companyIds) && evt.companyIds.includes('all'));
    const matchesCompany = isGlobal || 
      evt.companyId === selectedCompanyFilter || 
      (Array.isArray(evt.companyIds) && evt.companyIds.includes(selectedCompanyFilter));

    if (selectedCompanyFilter !== 'all' && !matchesCompany) {
      return false;
    }

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
        <div className="flex items-center gap-3 flex-wrap flex-1 max-w-xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3.5 my-auto" />
            <input
              id="events-manager-search"
              type="text"
              aria-label="Buscar por título, instructor o categoría"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, instructor o categoría..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C] shadow-xs"
            />
          </div>

          {companies.length > 0 && isSuperAdmin && (
            <select
              id="events-manager-filter-company"
              aria-label="Filtrar por Empresa"
              value={selectedCompanyFilter}
              onChange={(e) => setSelectedCompanyFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-800 font-bold focus:outline-none focus:border-[#DA291C]"
            >
              <option value="all">🏢 Todas las Empresas</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>🏢 {c.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSuperAdmin && onOpenBulkEnrollment && (
            <button
              onClick={() => onOpenBulkEnrollment()}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold rounded-2xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-[#DA291C]" />
              <span>Matriculación Masiva</span>
            </button>
          )}

          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2.5 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-extrabold rounded-2xl shadow-md shadow-red-500/25 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nueva Capacitación</span>
          </button>
        </div>
      </div>

      {/* Events Table / Cards */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-[#DA291C] mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-slate-900">
            {searchQuery ? 'No se encontraron capacitaciones' : 'No hay capacitaciones creadas'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {searchQuery 
              ? `No hay resultados para "${searchQuery}". Intenta ajustar el término de búsqueda o el filtro de empresa.` 
              : 'Comienza creando la primera capacitación institucional con sus fechas, horarios y cupos disponibles.'}
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Limpiar Búsqueda
              </button>
            )}
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="px-4 py-2 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-md shadow-red-500/25"
            >
              <Plus className="w-4 h-4" /> Crear Nueva Capacitación
            </button>
          </div>
        </div>
      ) : (
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

            const comp = companies.find(c => c.id === (event.companyId || 'emp_kasino'));

            return (
              <div
                key={event.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:border-slate-300 hover:shadow transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                
                {/* Event Info */}
                <div className="flex items-start gap-4">
                  <img
                    src={event.imageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"}
                    alt={event.title}
                    className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-slate-200 hidden sm:block shadow-xs"
                  />
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-[#DA291C] border border-red-200">
                        {event.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        event.modality === 'Virtual' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {event.modality === 'Virtual' ? <Video className="w-2.5 h-2.5" /> : <MapPin className="w-2.5 h-2.5" />}
                        {event.modality}
                      </span>
                      {event.companyId === 'all' || !event.companyId ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-indigo-600" />
                          Todas las Empresas
                        </span>
                      ) : comp ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-[#DA291C]" />
                          {comp.name}
                        </span>
                      ) : null}
                      {event.ojtEvaluatorName && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1" title="Tutor / Evaluador OJT Asignado">
                          <UserCheck className="w-3 h-3 text-indigo-600" />
                          <span>Tutor OJT: {event.ojtEvaluatorName}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{event.title}</h3>
                    <p className="text-xs text-slate-500">Facilitador: <strong className="text-slate-700">{event.instructor}</strong></p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1 font-medium">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5 text-[#DA291C]" />
                        {event.schedule.length} fecha(s)
                      </span>
                      <span>•</span>
                      <span className="text-cyan-700 font-bold">{totalReg} / {totalCap} inscritos</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-bold">{totalAtt} confirmados</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Toolbar */}
                <div className="flex flex-wrap items-center gap-2 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                  <button
                    onClick={() => exportSessionGradesForOjtAndCalibration(event, participants, companies)}
                    title="Exportar calificaciones e insumos para Bitácoras OJT, Mesas de Calibración y Estadísticas en Excel"
                    className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden sm:inline">Exportar OJT & Calibración</span>
                  </button>

                  <button
                    onClick={() => onOpenAttendeesModal(event)}
                    title="Ver Asistentes"
                    className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-[#DA291C]" />
                    <span>Asistentes ({totalReg})</span>
                  </button>

                  {onMakeRecurrent && isSuperAdmin && (
                    <button
                      onClick={() => onMakeRecurrent(event)}
                      title="Volver Recurrente / Programar en Academia Técnica"
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Volver Recurrente</span>
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() => onOpenNotificationModal(event)}
                  aria-label={`Enviar recordatorio para ${event.title}`}
                  title="Enviar Recordatorio"
                  className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-cyan-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenQrModal(event)}
                  aria-label={`Generar e imprimir QR para ${event.title}`}
                  title="Generar e Imprimir QR"
                  className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-blue-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenEditModal(event)}
                  aria-label={`Editar capacitación: ${event.title}`}
                  title="Editar Capacitación"
                  className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-amber-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setDeletingId(event.id)}
                  aria-label={`Eliminar capacitación: ${event.title}`}
                  title="Eliminar Capacitación"
                  className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-rose-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          );
        })}
      </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <div 
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-event-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 id="delete-event-dialog-title" className="text-base font-black text-slate-900">¿Eliminar esta capacitación?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Esta acción eliminará el evento, sus horarios y todas las inscripciones asociadas. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-all shadow-md shadow-rose-600/30 cursor-pointer"
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
