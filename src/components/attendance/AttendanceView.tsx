import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  PartyPopper, 
  ExternalLink, 
  UserCheck, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  ArrowLeft, 
  Star, 
  Send, 
  Sparkles,
  AlertTriangle,
  User,
  LogIn,
  LogOut,
  Lock,
  KeyRound
} from 'lucide-react';
import { TrainingEvent, UserAccount, Participant, EventFeedback } from '../../types';
import { formatDateLong, generateRandomCard } from '../../utils/formatters';

interface AttendanceViewProps {
  events: TrainingEvent[];
  participants: Participant[];
  currentUser: UserAccount | null;
  eventId: string;
  dateStr: string;
  timeStr: string;
  onConfirmAttendance: (eventId: string, date: string, time: string, email: string, type?: 'checkin' | 'checkout', code?: string) => Promise<any>;
  onSubmitFeedback: (feedback: EventFeedback) => Promise<void>;
  onSaveParticipants: (participants: Participant[]) => Promise<void>;
  onNavigateHome: () => void;
  onOpenTecEvaluation?: (event: TrainingEvent) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  events,
  participants,
  currentUser,
  eventId,
  dateStr,
  timeStr,
  onConfirmAttendance,
  onSubmitFeedback,
  onSaveParticipants,
  onNavigateHome,
  onOpenTecEvaluation
}) => {
  const urlParams = new URLSearchParams(window.location.search);
  const targetType = (urlParams.get('type') === 'checkout' ? 'checkout' : 'checkin') as 'checkin' | 'checkout';
  const urlCode = urlParams.get('code') || '';

  const [selectedActionType, setSelectedActionType] = useState<'checkin' | 'checkout'>(targetType);
  const [dailyPinInput, setDailyPinInput] = useState(urlCode);
  const [manualCardInput, setManualCardInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showPinForm, setShowPinForm] = useState(false);

  // In-App Rating State
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState<boolean>(false);

  const event = events.find(e => e.id === eventId);
  const schedule = event?.schedule.find(s => s.date === dateStr);
  const slot = schedule?.slots.find(s => s.time === timeStr);

  const userEmailLower = currentUser?.email?.toLowerCase() || '';
  const isCheckedIn = Boolean(
    (slot?.checkInList || slot?.attendedList || []).some(e => e.toLowerCase() === userEmailLower)
  );
  const isCheckedOut = Boolean(
    (slot?.checkOutList || []).some(e => e.toLowerCase() === userEmailLower)
  );
  const isAttendanceCompleted = Boolean(
    (slot?.completedAttendanceList || []).some(e => e.toLowerCase() === userEmailLower) ||
    (isCheckedIn && isCheckedOut)
  );

  const existingFeedback = currentUser && event
    ? (event.feedbacks || []).find(f => f.userEmail?.toLowerCase() === currentUser.email?.toLowerCase())
    : null;

  // Auto Check-in o Check-out al cargar si el usuario está autenticado y viene de un código QR
  useEffect(() => {
    if (!currentUser || !event || !slot) return;

    if (targetType === 'checkout') {
      if (isCheckedOut) return;
      const autoCheckOut = async () => {
        try {
          setIsProcessing(true);
          await onConfirmAttendance(eventId, dateStr, timeStr, currentUser.email, 'checkout', urlCode || undefined);
          setIsConfirmed(true);
          setStatusMessage({
            type: 'success',
            text: `¡Hola ${currentUser.name}! Tu salida ha sido registrada con éxito. Ya puedes responder la evaluación del evento.`
          });
        } catch (err: any) {
          setStatusMessage({
            type: 'error',
            text: err.message || 'No fue posible registrar tu salida automáticamente.'
          });
        } finally {
          setIsProcessing(false);
        }
      };
      autoCheckOut();
    } else {
      if (isCheckedIn) return;
      const autoCheckIn = async () => {
        try {
          setIsProcessing(true);
          const userEmail = currentUser.email.toLowerCase();

          // 1. Asegurar en padrón
          let participant = participants.find(p => p.email.toLowerCase() === userEmail);
          if (!participant) {
            participant = {
              card: generateRandomCard(),
              name: currentUser.name,
              email: currentUser.email
            };
            await onSaveParticipants([...participants, participant]);
          }

          // 2. Registrar entrada
          await onConfirmAttendance(eventId, dateStr, timeStr, currentUser.email, 'checkin', urlCode || undefined);
          setIsConfirmed(true);
          setStatusMessage({
            type: 'success',
            text: `¡Hola ${currentUser.name}! Tu entrada ha sido registrada con éxito. Recuerda registrar tu salida al culminar la capacitación.`
          });
        } catch (err: any) {
          setStatusMessage({
            type: 'error',
            text: err.message || 'No fue posible registrar tu entrada automáticamente.'
          });
        } finally {
          setIsProcessing(false);
        }
      };
      autoCheckIn();
    }
  }, [currentUser, event, slot, targetType, urlCode]);

  // Manejador para registrar salida directa con 1 clic
  const handlePerformCheckOut = async () => {
    if (!currentUser) return;
    try {
      setIsProcessing(true);
      await onConfirmAttendance(eventId, dateStr, timeStr, currentUser.email, 'checkout');
      setIsConfirmed(true);
      setStatusMessage({
        type: 'success',
        text: `¡Salida confirmada! Tu asistencia al curso está completa. Ya puedes calificar al facilitador.`
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error al confirmar salida.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Manejador para validar PIN diario de aula
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyPinInput.trim() || !currentUser) return;
    try {
      setIsProcessing(true);
      setStatusMessage(null);
      await onConfirmAttendance(
        eventId,
        dateStr,
        timeStr,
        currentUser.email,
        selectedActionType,
        dailyPinInput.trim()
      );
      setIsConfirmed(true);
      setStatusMessage({
        type: 'success',
        text: `¡Código PIN validado! Registro de ${selectedActionType === 'checkout' ? 'Salida' : 'Entrada'} completado exitosamente.`
      });
      setDailyPinInput('');
      setShowPinForm(false);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Código PIN diario incorrecto.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Manejador para registro manual de otro colaborador por cédula o tarjeta
  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCardInput.trim()) return;

    try {
      setIsProcessing(true);
      setStatusMessage(null);

      const query = manualCardInput.trim().toLowerCase();
      const p = participants.find(part => part.card.toLowerCase() === query || part.email.toLowerCase() === query);

      if (!p) {
        setStatusMessage({
          type: 'error',
          text: `No se encontró ningún colaborador con la tarjeta o correo "${manualCardInput}".`
        });
        return;
      }

      await onConfirmAttendance(eventId, dateStr, timeStr, p.email, selectedActionType);
      setIsConfirmed(true);
      setStatusMessage({
        type: 'success',
        text: `${selectedActionType === 'checkout' ? 'Salida' : 'Entrada'} confirmada para ${p.name} (${p.card}).`
      });
      setManualCardInput('');
      setShowManualForm(false);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error al procesar asistencia manual.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Envío de feedback rápido opcional
  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !currentUser) return;

    try {
      setIsSendingFeedback(true);
      await onSubmitFeedback({
        eventId,
        userEmail: currentUser.email,
        userName: currentUser.name,
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString()
      });
      setFeedbackSent(true);
    } catch (err: any) {
      console.error('Error al enviar feedback:', err);
    } finally {
      setIsSendingFeedback(false);
    }
  };

  if (!event || !slot) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-base font-black text-slate-900">Sesión no encontrada</h1>
          <p className="text-xs text-slate-500">
            El enlace de asistencia no corresponde a ningún evento u horario activo.
          </p>
          <button
            onClick={onNavigateHome}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] py-8 px-4 flex items-center justify-center">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Banner Superior */}
        <div className="relative h-32 bg-slate-900 overflow-hidden">
          <img
            src={event.imageUrl}
            alt={event.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="absolute top-4 left-4">
            <button
              onClick={onNavigateHome}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver</span>
            </button>
          </div>
          <div className="absolute bottom-3 left-6 right-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#DA291C] bg-white px-2 py-0.5 rounded-md">
              {event.category}
            </span>
            <h1 className="text-base font-black text-white line-clamp-1 mt-1">
              {event.title}
            </h1>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="p-6 space-y-6">

          {/* Tarjeta de Información del Evento y Horario */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <CalendarIcon className="w-4 h-4 text-[#DA291C] shrink-0" />
              <span className="font-bold">{formatDateLong(dateStr)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <Clock className="w-4 h-4 text-[#DA291C] shrink-0" />
              <span className="font-bold">
                {timeStr}{slot.endTime ? ` - ${slot.endTime}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <MapPin className="w-4 h-4 text-[#DA291C] shrink-0" />
              <span className="font-medium text-slate-600">{event.location}</span>
            </div>
          </div>

          {/* ESTADOS DE ASISTENCIA (Entrada vs Salida) */}
          {isAttendanceCompleted ? (
            /* CASO 1: ASISTENCIA COMPLETA (Entrada + Salida Verificadas) */
            <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-sm font-black text-emerald-950">
                  ¡Asistencia Completa Verificada!
                </h2>
                <p className="text-xs text-emerald-700 font-medium mt-0.5">
                  Has cumplido con el registro de Entrada y Salida para esta capacitación.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-200/80 text-emerald-900 flex items-center gap-1">
                  <LogIn className="w-3 h-3" />
                  <span>Entrada Registrada</span>
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-200/80 text-emerald-900 flex items-center gap-1">
                  <LogOut className="w-3 h-3" />
                  <span>Salida Registrada</span>
                </span>
              </div>
            </div>
          ) : isCheckedIn && !isCheckedOut ? (
            /* CASO 2: ASISTENCIA EN CURSO (Solo Entrada) */
            <div className="p-5 rounded-2xl bg-amber-50/80 border-2 border-amber-300 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-amber-900">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>Asistencia en Curso (Entrada Registrada)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  Pendiente Salida
                </span>
              </div>
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                Tu ingreso a la sesión está verificado. Para completar tu participación y desbloquear la <strong>Evaluación del Curso y Facilitador</strong>, debes registrar tu Salida.
              </p>
              <button
                type="button"
                onClick={handlePerformCheckOut}
                disabled={isProcessing}
                className="w-full py-3 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 shadow-md shadow-red-500/25 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{isProcessing ? 'Registrando salida...' : 'Registrar Mi Salida Ahora'}</span>
              </button>
            </div>
          ) : (
            /* CASO 3: SIN ASISTENCIA AÚN */
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-slate-800">
                  Registra tu presencia en este evento:
                </p>
                <p className="text-[11px] text-slate-500">
                  Selecciona si estás ingresando (Entrada) o retirándote (Salida)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={async () => {
                    if (!currentUser) return;
                    setIsProcessing(true);
                    await onConfirmAttendance(eventId, dateStr, timeStr, currentUser.email, 'checkin');
                    setIsProcessing(false);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Marcar Entrada</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={async () => {
                    if (!currentUser) return;
                    setIsProcessing(true);
                    await onConfirmAttendance(eventId, dateStr, timeStr, currentUser.email, 'checkout');
                    setIsProcessing(false);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Marcar Salida</span>
                </button>
              </div>
            </div>
          )}

          {/* Mensaje de Estado / Notificación */}
          {statusMessage && (
            <div className={`p-4 rounded-2xl text-xs font-medium border flex items-start gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-cyan-50 border-cyan-200 text-cyan-900'
            }`}>
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">
                {statusMessage.text}
              </div>
            </div>
          )}

          {/* Botón para abrir formulario de PIN diario de aula */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowPinForm(!showPinForm)}
              className="text-xs text-[#DA291C] hover:underline font-bold flex items-center gap-1 mx-auto cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{showPinForm ? 'Ocultar código PIN' : '¿Tienes un código PIN de aula? Ingrésalo aquí'}</span>
            </button>

            {showPinForm && (
              <form onSubmit={handlePinSubmit} className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Validar con PIN Diario</span>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="pinAction"
                        checked={selectedActionType === 'checkin'}
                        onChange={() => setSelectedActionType('checkin')}
                        className="text-[#DA291C]"
                      />
                      <span>Entrada</span>
                    </label>
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="pinAction"
                        checked={selectedActionType === 'checkout'}
                        onChange={() => setSelectedActionType('checkout')}
                        className="text-[#DA291C]"
                      />
                      <span>Salida</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={dailyPinInput}
                    onChange={(e) => setDailyPinInput(e.target.value)}
                    placeholder="PIN de 4 dígitos (ej: 8421)"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-center tracking-wider text-slate-900 focus:outline-none focus:border-[#DA291C]"
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !dailyPinInput.trim()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Validar
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Encuesta Oficial TEC (Curso & Facilitador) */}
          {currentUser && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-red-50 via-amber-50/40 to-red-50 border border-red-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#DA291C] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#DA291C]" />
                  Evaluación de Curso y Facilitador - TEC
                </span>
                <span className="text-[10px] text-amber-800 font-black px-2 py-0.5 rounded-md bg-amber-200/80">
                  Estándar TEC
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Esta evaluación nos permite conocer la calidad pedagógica del curso y la excelencia del facilitador.
              </p>

              {existingFeedback ? (
                /* Encuesta ya completada: Modo solo consulta */
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-900">
                        ✓ Ya has completado la encuesta de satisfacción ({existingFeedback.rating}★).
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        Tu retroalimentación ya fue registrada y no admite modificaciones adicionales.
                      </p>
                    </div>
                  </div>
                  {onOpenTecEvaluation && event && (
                    <button
                      type="button"
                      onClick={() => onOpenTecEvaluation(event)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shrink-0 transition-colors shadow-sm cursor-pointer"
                    >
                      Ver Respuestas
                    </button>
                  )}
                </div>
              ) : isAttendanceCompleted ? (
                /* Asistencia completa: Desbloqueada para responder */
                onOpenTecEvaluation && event && (
                  <button
                    type="button"
                    onClick={() => onOpenTecEvaluation(event)}
                    className="w-full py-3 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 shadow-md shadow-red-500/25 transition-all cursor-pointer"
                  >
                    <Star className="w-4 h-4 fill-white" />
                    <span>Completar Evaluación de Curso y Facilitador</span>
                  </button>
                )
              ) : (
                /* Asistencia incompleta: Bloqueada */
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled
                    className="w-full py-3 bg-slate-200 text-slate-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed border border-slate-300/50"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Evaluación Bloqueada (Requiere Registro de Salida)</span>
                  </button>
                  <p className="text-[10px] text-center text-slate-500 font-medium">
                    Solo los participantes con asistencia completa (entrada y salida) pueden responder la encuesta.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Formulario de Asistencia Manual para Supervisores o Delegados */}
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowManualForm(!showManualForm)}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 mx-auto cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>{showManualForm ? 'Ocultar registro de otro colaborador' : 'Registrar a otro colaborador'}</span>
            </button>

            {showManualForm && (
              <form onSubmit={handleManualCheckIn} className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Registro para otro colaborador</span>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="manualAction"
                        checked={selectedActionType === 'checkin'}
                        onChange={() => setSelectedActionType('checkin')}
                        className="text-[#DA291C]"
                      />
                      <span>Entrada</span>
                    </label>
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="manualAction"
                        checked={selectedActionType === 'checkout'}
                        onChange={() => setSelectedActionType('checkout')}
                        className="text-[#DA291C]"
                      />
                      <span>Salida</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCardInput}
                    onChange={(e) => setManualCardInput(e.target.value)}
                    placeholder="Tarjeta o correo del colaborador..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !manualCardInput.trim()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
