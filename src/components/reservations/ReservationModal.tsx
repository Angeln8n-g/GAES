import React, { useState, useMemo } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Video, 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  AlertTriangle,
  Lock
} from 'lucide-react';
import { TrainingEvent, UserAccount, Slot } from '../../types';
import { formatDateLong, getEventDurationMetrics, calculateTimeDurationHours } from '../../utils/formatters';
import { downloadIcsFile, getGoogleCalendarUrl } from '../../utils/icsUtils';
import { AccessibleModal } from '../common/AccessibleModal';

interface ReservationModalProps {
  event: TrainingEvent | null;
  currentUser: UserAccount | null;
  onClose: () => void;
  onConfirmReservation: (eventId: string, date: string, time: string, email: string) => Promise<void>;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  event,
  currentUser,
  onClose,
  onConfirmReservation
}) => {
  if (!event) return null;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const initialSchedule = event.schedule.find(s => s.date >= todayStr) || event.schedule[0];

  const [selectedDate, setSelectedDate] = useState<string>(initialSchedule?.date || '');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(initialSchedule?.slots[0] || null);
  const [emailInput, setEmailInput] = useState<string>(currentUser?.email || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const durationMetrics = getEventDurationMetrics(event);

  // Verificar si el usuario actual tiene una asignación obligatoria en algún horario de este evento
  const mandatoryAssignment = useMemo(() => {
    if (!currentUser?.email) return null;
    const cleanEmail = currentUser.email.toLowerCase();
    for (const sch of event.schedule) {
      for (const sl of sch.slots) {
        if (sl.attendees.map(a => a.toLowerCase()).includes(cleanEmail)) {
          const detail = (sl.attendeesDetails || []).find(d => d.email.toLowerCase() === cleanEmail);
          if (detail && detail.isMandatory) {
            return {
              date: sch.date,
              time: sl.time,
              assignedBy: detail.assignedBy,
              notes: detail.assignmentNotes
            };
          }
        }
      }
    }
    return null;
  }, [event, currentUser]);

  const currentSchedule = event.schedule.find(s => s.date === selectedDate);

  const handleDateChange = (dateStr: string) => {
    setSelectedDate(dateStr);
    const sch = event.schedule.find(s => s.date === dateStr);
    setSelectedSlot(sch?.slots[0] || null);
    setErrorMessage('');
  };

  const handleSlotSelect = (slot: Slot) => {
    setSelectedSlot(slot);
    setErrorMessage('');
  };

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedDate || !selectedSlot) {
      setErrorMessage('Por favor selecciona una fecha y horario.');
      return;
    }

    if (!emailInput.trim()) {
      setErrorMessage('Por favor ingresa tu correo electrónico corporativo.');
      return;
    }

    // Verificar si ya está inscrito
    if (selectedSlot.attendees.map(a => a.toLowerCase()).includes(emailInput.trim().toLowerCase())) {
      setErrorMessage('Ya te encuentras inscrito en este horario.');
      return;
    }

    // Verificar cupo disponible
    if (selectedSlot.registered >= selectedSlot.capacity) {
      setErrorMessage('El cupo para este horario ya se encuentra agotado.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onConfirmReservation(event.id, selectedDate, selectedSlot.time, emailInput.trim());
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar la reserva. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      onClose={onClose}
      ariaLabel={`Reservar Curso - ${event.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-[#DA291C] border border-red-200 uppercase tracking-wider">
              {event.category}
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 mt-1 line-clamp-1">
              {event.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {isSuccess ? (
            /* Success Confirmation Screen */
            <div className="text-center py-6 space-y-5 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-slate-900">¡Inscripción Confirmada!</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto mt-1 leading-relaxed">
                  Hemos confirmado tu lugar para <strong>{event.title}</strong> ({durationMetrics.totalHours} hrs lectivas en {durationMetrics.totalDays} {durationMetrics.totalDays === 1 ? 'día' : 'días'}) el día <strong>{formatDateLong(selectedDate)}</strong> a las <strong>{selectedSlot?.time}{selectedSlot?.endTime ? ` - ${selectedSlot.endTime}` : ''}</strong>.
                </p>
              </div>

              {/* Add to Calendar Actions */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-[#DA291C]" />
                  Agendar en tu Calendario Laboral:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => selectedSlot && downloadIcsFile(event, selectedDate, selectedSlot.time)}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-colors border border-slate-200 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar .ICS
                  </button>
                  <a
                    href={selectedSlot ? getGoogleCalendarUrl(event, selectedDate, selectedSlot.time) : '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-[#DA291C] text-xs font-bold transition-colors border border-red-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Google Calendar
                  </a>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-red-500/25 transition-all"
              >
                Finalizar y Cerrar
              </button>
            </div>
          ) : (
            /* Reservation Form Screen */
            <form onSubmit={handleReserve} className="space-y-5">
              
              {/* Mandatory assignment notice */}
              {mandatoryAssignment && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-800">
                  <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Asignación Obligatoria Activa</p>
                    <p className="text-slate-700 mt-0.5">
                      Tu supervisor ({mandatoryAssignment.assignedBy || 'Líder'}) te asignó obligatoriamente el <strong>{formatDateLong(mandatoryAssignment.date)} ({mandatoryAssignment.time})</strong>.
                    </p>
                    {mandatoryAssignment.notes && (
                      <p className="text-amber-800 italic mt-1 text-[11px]">Nota: "{mandatoryAssignment.notes}"</p>
                    )}
                  </div>
                </div>
              )}

              {/* Event Details Quick Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Duración del Programa:</span>
                  <span className="font-extrabold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    {durationMetrics.totalHours} hrs lectivas ({durationMetrics.totalDays} {durationMetrics.totalDays === 1 ? 'día' : 'días'})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Instructor:</span>
                  <span className="font-bold text-slate-900">{event.instructor}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Modalidad:</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    {event.modality === 'Virtual' ? <Video className="w-3.5 h-3.5 text-cyan-600" /> : <MapPin className="w-3.5 h-3.5 text-emerald-600" />}
                    {event.modality}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Ubicación / Sala:</span>
                  <span className="font-bold text-slate-900 line-clamp-1">{event.location}</span>
                </div>
              </div>

              {/* 1. Date Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#DA291C]" />
                  1. Selecciona la Fecha Disponible:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {event.schedule.map(sch => {
                    const isSelected = selectedDate === sch.date;
                    const isPast = sch.date < todayStr;
                    const totalSlots = sch.slots.length;
                    return (
                      <button
                        key={sch.date}
                        type="button"
                        onClick={() => handleDateChange(sch.date)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-red-50 border-[#DA291C] text-[#DA291C] font-bold ring-1 ring-[#DA291C]'
                            : isPast
                            ? 'bg-slate-100/70 border-slate-200 text-slate-400 hover:bg-slate-100'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold">{formatDateLong(sch.date)}</p>
                          {sch.date === todayStr && (
                            <span className="px-1.5 py-0.2 rounded-md bg-red-100 text-[#DA291C] text-[9px] font-black uppercase">
                              Hoy
                            </span>
                          )}
                          {isPast && (
                            <span className="px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-600 text-[9px] font-bold">
                              Pasada
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{totalSlots} horario(s) disponible(s)</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Slot / Time Selector */}
              {currentSchedule && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#DA291C]" />
                    2. Selecciona el Horario:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentSchedule.slots.map((slot, idx) => {
                      const isSelected = selectedSlot?.time === slot.time;
                      const isFull = slot.registered >= slot.capacity;
                      const remaining = slot.capacity - slot.registered;

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isFull}
                          onClick={() => handleSlotSelect(slot)}
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            isFull
                              ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400'
                              : isSelected
                              ? 'bg-[#DA291C] text-white font-bold shadow-md shadow-red-500/25 ring-1 ring-red-400'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">
                              {slot.time}{slot.endTime ? ` - ${slot.endTime}` : ''}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                              isFull
                                ? 'bg-rose-100 text-rose-700'
                                : isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {isFull ? 'Agotado' : `${remaining} libres`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] mt-1">
                            <span className={isSelected ? 'text-white/80' : 'text-slate-500'}>
                              Capacidad: {slot.registered} / {slot.capacity}
                            </span>
                            {slot.endTime && (
                              <span className={`font-semibold ${isSelected ? 'text-white/90' : 'text-amber-700'}`}>
                                {calculateTimeDurationHours(slot.time, slot.endTime)} hrs
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Collaborator Email Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  3. Correo Electrónico del Colaborador:
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="nombre.apellido@claro.com.do"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C] font-medium"
                  required
                />
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting || !selectedSlot || (selectedSlot && selectedSlot.registered >= selectedSlot.capacity)}
                className="w-full py-3.5 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-red-500/25 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? 'Confirmando reserva...' : 'Confirmar Mi Lugar'}
              </button>

            </form>
          )}

        </div>

      </div>
    </AccessibleModal>
  );
};
