import React, { useState, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  CheckCircle2, 
  Users, 
  AlertCircle, 
  Check, 
  Search, 
  ShieldAlert, 
  ShieldCheck,
  Send,
  Building,
  Info
} from 'lucide-react';
import { TrainingEvent, Participant, UserAccount, Slot, ParticipantGroup } from '../../types';
import { formatDateLong } from '../../utils/formatters';
import { AccessibleModal } from '../common/AccessibleModal';

interface TeamAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: TrainingEvent[];
  teamParticipants: Participant[];
  currentUser: UserAccount;
  groups?: ParticipantGroup[];
  onConfirmAssignment: (payload: {
    eventId: string;
    date: string;
    time: string;
    emails: string[];
    isMandatory: boolean;
    assignedBy: string;
    notes?: string;
  }) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const TeamAssignmentModal: React.FC<TeamAssignmentModalProps> = ({
  isOpen,
  onClose,
  events,
  teamParticipants,
  currentUser,
  groups = [],
  onConfirmAssignment,
  onShowToast
}) => {
  if (!isOpen) return null;

  const activeEvents = useMemo(() => events.filter(e => e.status === 'active'), [events]);

  const [selectedEventId, setSelectedEventId] = useState<string>(activeEvents[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isMandatory, setIsMandatory] = useState<boolean>(true);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Evento actualmente seleccionado
  const selectedEvent = useMemo(() => activeEvents.find(e => e.id === selectedEventId) || activeEvents[0], [activeEvents, selectedEventId]);

  // Fechas disponibles para el evento
  const availableSchedules = selectedEvent?.schedule || [];

  // Inicializar fecha seleccionada si cambia el evento o está vacía
  React.useEffect(() => {
    if (availableSchedules.length > 0) {
      const firstDate = availableSchedules[0].date;
      setSelectedDate(firstDate);
      const firstSlot = availableSchedules[0].slots[0]?.time || '';
      setSelectedTime(firstSlot);
    } else {
      setSelectedDate('');
      setSelectedTime('');
    }
  }, [selectedEventId]);

  // Horarios disponibles para la fecha seleccionada
  const availableSlots = useMemo(() => {
    const currentSch = availableSchedules.find(s => s.date === selectedDate);
    return currentSch?.slots || [];
  }, [availableSchedules, selectedDate]);

  // Manejar cambio de fecha
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    const sch = availableSchedules.find(s => s.date === date);
    setSelectedTime(sch?.slots[0]?.time || '');
  };

  // Slot seleccionado actualmente
  const currentSlot = useMemo(() => {
    return availableSlots.find(s => s.time === selectedTime) || availableSlots[0] || null;
  }, [availableSlots, selectedTime]);

  // Emails ya inscritos en este slot
  const enrolledEmailsInSlot = useMemo(() => {
    if (!currentSlot) return new Set<string>();
    return new Set(currentSlot.attendees.map(a => a.toLowerCase()));
  }, [currentSlot]);

  // Filtrar colaboradores del equipo por búsqueda
  const filteredParticipants = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return teamParticipants;
    return teamParticipants.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.card.includes(q) ||
      (p.cedula && p.cedula.includes(q)) ||
      (p.department && p.department.toLowerCase().includes(q))
    );
  }, [teamParticipants, searchQuery]);

  // Seleccionar / deseleccionar colaborador individual
  const toggleSelectEmail = (email: string) => {
    const clean = email.toLowerCase();
    const next = new Set(selectedEmails);
    if (next.has(clean)) {
      next.delete(clean);
    } else {
      next.add(clean);
    }
    setSelectedEmails(next);
  };

  // Seleccionar todos los visibles
  const handleSelectAllVisible = () => {
    const next = new Set(selectedEmails);
    const allVisibleSelected = filteredParticipants.every(p => next.has(p.email.toLowerCase()));

    if (allVisibleSelected) {
      filteredParticipants.forEach(p => next.delete(p.email.toLowerCase()));
    } else {
      filteredParticipants.forEach(p => next.add(p.email.toLowerCase()));
    }
    setSelectedEmails(next);
  };

  // Enviar formulario de asignación
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEvent || !selectedDate || !selectedTime) {
      onShowToast('Faltan datos', 'Selecciona el curso, fecha y horario para continuar.', 'error');
      return;
    }

    if (selectedEmails.size === 0) {
      onShowToast('Sin destinatarios', 'Selecciona al menos un miembro del equipo para asignar.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmAssignment({
        eventId: selectedEvent.id,
        date: selectedDate,
        time: selectedTime,
        emails: Array.from(selectedEmails),
        isMandatory,
        assignedBy: currentUser.name || currentUser.email,
        notes: notes.trim() || undefined
      });

      onShowToast(
        '¡Asignación Completada!',
        `Se han asignado ${selectedEmails.size} colaboradores al curso de forma ${isMandatory ? 'OBLIGATORIA' : 'VOLUNTARIA'}.`,
        'success'
      );
      onClose();
    } catch (err: any) {
      onShowToast('Error en la asignación', err.message || 'No se pudo completar la asignación.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Asignar Capacitación a Mi Equipo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-850">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/40 text-[#DA291C] dark:text-red-400 border border-red-200 dark:border-red-800/60 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Panel de Supervisión
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Asignar Capacitación a Mi Equipo</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Matricula directamente a tus colaboradores y define si la capacitación es obligatoria o recomendada.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          
          {/* Paso 1: Seleccionar Capacitación / Curso */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              1. Selecciona la Capacitación / Curso
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#DA291C] transition-colors"
            >
              {activeEvents.map(evt => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} — ({evt.category} | {evt.instructor})
                </option>
              ))}
            </select>

            {selectedEvent && (
              <div className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span className="px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/40 text-[#DA291C] dark:text-red-400 font-bold text-[11px] border border-red-200 dark:border-red-800/60">
                  {selectedEvent.modality}
                </span>
                <span>Lugar: <strong className="text-slate-800 dark:text-slate-200">{selectedEvent.location || 'Instalaciones'}</strong></span>
                <span className="ml-auto">Instructor: <strong className="text-slate-800 dark:text-slate-200">{selectedEvent.instructor}</strong></span>
              </div>
            )}
          </div>

          {/* Paso 2: Seleccionar Fecha y Horario */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              2. Selecciona Fecha y Horario
            </label>

            {availableSchedules.length > 0 ? (
              <div className="space-y-3">
                {/* Fechas */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableSchedules.map(sch => (
                    <button
                      key={sch.date}
                      type="button"
                      onClick={() => handleDateChange(sch.date)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        selectedDate === sch.date
                          ? 'bg-red-50 dark:bg-red-950/40 border-[#DA291C] text-red-950 dark:text-red-200 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold mb-0.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-[#DA291C] dark:text-red-400" />
                        <span>{sch.date}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                        {sch.slots.length} horario(s) disponible(s)
                      </span>
                    </button>
                  ))}
                </div>

                {/* Horarios (Slots) */}
                {availableSlots.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {availableSlots.map(slot => {
                      const isSelected = selectedTime === slot.time;
                      const isFull = slot.registered >= slot.capacity;

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => setSelectedTime(slot.time)}
                          className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#DA291C] text-white border-[#DA291C] font-bold shadow-md shadow-red-500/25'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1 text-xs">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{slot.time}</span>
                          </div>
                          <span className={`text-[10px] mt-0.5 block ${isSelected ? 'text-red-100' : isFull ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'}`}>
                            {slot.registered}/{slot.capacity} ocupados
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-900/60">No hay fechas u horarios programados para esta capacitación.</p>
            )}
          </div>

          {/* Paso 3: Tipo de Carácter (Obligatorio vs Voluntario) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              3. Carácter de la Asignación
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opción Obligatoria */}
              <button
                type="button"
                onClick={() => setIsMandatory(true)}
                className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                  isMandatory
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-600 text-rose-950 dark:text-rose-200 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={`w-4 h-4 ${isMandatory ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className="text-sm font-bold text-rose-800 dark:text-rose-300">Obligatorio</span>
                  </div>
                  {isMandatory && <Check className="w-4 h-4 text-rose-600 dark:text-rose-400 stroke-[3]" />}
                </div>
                <p className={`text-[11px] leading-relaxed ${isMandatory ? 'text-rose-900/80 dark:text-rose-200/80' : 'text-slate-500 dark:text-slate-400'}`}>
                  El colaborador no podrá cancelar ni desasignarse desde su panel. Se exigirá asistencia.
                </p>
              </button>

              {/* Opción Voluntaria */}
              <button
                type="button"
                onClick={() => setIsMandatory(false)}
                className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                  !isMandatory
                    ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 dark:border-cyan-600 text-cyan-950 dark:text-cyan-200 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${!isMandatory ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className="text-sm font-bold text-cyan-800 dark:text-cyan-300">Voluntario / Sugerido</span>
                  </div>
                  {!isMandatory && <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 stroke-[3]" />}
                </div>
                <p className={`text-[11px] leading-relaxed ${!isMandatory ? 'text-cyan-900/80 dark:text-cyan-200/80' : 'text-slate-500 dark:text-slate-400'}`}>
                  Aparecerá recomendado por el líder, pero el colaborador podrá cancelar o ajustar su horario.
                </p>
              </button>
            </div>
          </div>

          {/* Paso 4: Selección de Colaboradores */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                4. Seleccionar Colaboradores ({selectedEmails.size} seleccionados)
              </label>
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="text-xs text-[#DA291C] dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold cursor-pointer"
              >
                {filteredParticipants.length > 0 && filteredParticipants.every(p => selectedEmails.has(p.email.toLowerCase()))
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos los visibles'}
              </button>
            </div>

            {/* Buscador de Colaboradores */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, cédula o correo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#DA291C] transition-colors"
              />
            </div>

            {/* Lista de Colaboradores */}
            <div className="max-h-56 overflow-y-auto space-y-2 p-1 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-850/50 custom-scrollbar">
              {filteredParticipants.length > 0 ? (
                filteredParticipants.map(p => {
                  const cleanEmail = p.email.toLowerCase();
                  const isChecked = selectedEmails.has(cleanEmail);
                  const isAlreadyInSlot = enrolledEmailsInSlot.has(cleanEmail);

                  return (
                    <div
                      key={p.card}
                      onClick={() => toggleSelectEmail(p.email)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-red-50/80 dark:bg-red-950/40 border-[#DA291C] text-slate-900 dark:text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-[#DA291C] border-[#DA291C] text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{p.email}</span>
                            {p.department && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-300 font-semibold">
                                {p.department}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isAlreadyInSlot && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 whitespace-nowrap shrink-0">
                          Ya en este horario
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  No se encontraron colaboradores en el equipo con ese filtro.
                </div>
              )}
            </div>
          </div>

          {/* Paso 5: Instrucciones / Nota Opcional */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              5. Nota o Instrucciones (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Requerido para el plan de certificación Q3..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#DA291C] transition-colors"
            />
          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-850">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedEmails.size === 0}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-2xl bg-[#DA291C] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-red-500/25 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <span>Procesando asignación...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Confirmar Asignación ({selectedEmails.size})</span>
              </>
            )}
          </button>
        </div>

      </div>
    </AccessibleModal>
  );
};
