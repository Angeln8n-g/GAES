import React, { useState } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Video, 
  User, 
  CheckCircle2, 
  Download, 
  ExternalLink,
  Users,
  AlertTriangle
} from 'lucide-react';
import { TrainingEvent, UserAccount, Schedule, Slot } from '../../types';
import { formatDateLong } from '../../utils/formatters';
import { downloadIcsFile, getGoogleCalendarUrl, getOutlookCalendarUrl } from '../../utils/icsUtils';

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

  const [selectedDate, setSelectedDate] = useState<string>(event.schedule[0]?.date || '');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(event.schedule[0]?.slots[0] || null);
  const [emailInput, setEmailInput] = useState<string>(currentUser?.email || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

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

    try {
      setIsSubmitting(true);
      await onConfirmReservation(event.id, selectedDate, selectedSlot.time, emailInput.trim());
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar la reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {event.category}
              </span>
              <span className="text-xs text-slate-400 font-medium">Reserva de Cupo</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 line-clamp-1">{event.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {isSuccess ? (
            /* Success Confirmation Screen */
            <div className="text-center py-6 space-y-5 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">¡Inscripción Exitosa!</h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1">
                  Hemos confirmado tu lugar para <strong>{event.title}</strong> el día <strong>{formatDateLong(selectedDate)}</strong> a las <strong>{selectedSlot?.time}</strong>.
                </p>
              </div>

              {/* Add to Calendar Actions */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-left space-y-3">
                <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-indigo-400" />
                  Agendar en tu Calendario Laboral:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => selectedSlot && downloadIcsFile(event, selectedDate, selectedSlot.time)}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar .ICS
                  </button>
                  <a
                    href={selectedSlot ? getGoogleCalendarUrl(event, selectedDate, selectedSlot.time) : '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold transition-colors border border-indigo-500/30"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Google Calendar
                  </a>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl shadow-lg transition-all"
              >
                Finalizar y Cerrar
              </button>
            </div>
          ) : (
            /* Reservation Form */
            <form onSubmit={handleReserve} className="space-y-5">
              
              {/* Event Details Quick Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Instructor:</span>
                  <span className="font-semibold text-white">{event.instructor}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Modalidad:</span>
                  <span className="font-semibold text-white flex items-center gap-1">
                    {event.modality === 'Virtual' ? <Video className="w-3 h-3 text-cyan-400" /> : <MapPin className="w-3 h-3 text-emerald-400" />}
                    {event.modality}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Ubicación / Plataforma:</span>
                  <span className="font-semibold text-indigo-300 line-clamp-1">{event.location}</span>
                </div>
              </div>

              {/* 1. Date Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                  1. Selecciona la Fecha Disponible:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {event.schedule.map(sch => {
                    const isSelected = selectedDate === sch.date;
                    const totalSlots = sch.slots.length;
                    return (
                      <button
                        key={sch.date}
                        type="button"
                        onClick={() => handleDateChange(sch.date)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold ring-1 ring-indigo-500'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <p className="text-xs font-semibold">{formatDateLong(sch.date)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{totalSlots} horario(s) disponible(s)</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Slot / Time Selector */}
              {currentSchedule && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
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
                              ? 'opacity-40 bg-slate-950/20 border-slate-800/40 cursor-not-allowed text-slate-500'
                              : isSelected
                              ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                              : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{slot.time}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                              isFull
                                ? 'bg-rose-500/20 text-rose-400'
                                : isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {isFull ? 'Agotado' : `${remaining} libres`}
                            </span>
                          </div>
                          <p className="text-[10px] opacity-80 mt-1">
                            Capacidad: {slot.registered} / {slot.capacity}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Collaborator Email Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  3. Correo Electrónico del Colaborador:
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="nombre.apellido@empresa.com"
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-rose-300 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting || !selectedSlot || (selectedSlot && selectedSlot.registered >= selectedSlot.capacity)}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? 'Confirmando reserva...' : 'Confirmar Mi Lugar'}
              </button>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
