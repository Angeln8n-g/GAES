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
  User
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
  onConfirmAttendance: (eventId: string, date: string, time: string, email: string) => Promise<void>;
  onSubmitFeedback: (feedback: EventFeedback) => Promise<void>;
  onSaveParticipants: (participants: Participant[]) => Promise<void>;
  onNavigateHome: () => void;
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
  onNavigateHome
}) => {
  const [manualCardInput, setManualCardInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  // In-App Rating State
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState<boolean>(false);

  const event = events.find(e => e.id === eventId);
  const schedule = event?.schedule.find(s => s.date === dateStr);
  const slot = schedule?.slots.find(s => s.time === timeStr);

  // Auto Check-in al cargar si el usuario está autenticado
  useEffect(() => {
    if (!currentUser || !event || !slot || isConfirmed) return;

    const autoCheckIn = async () => {
      try {
        setIsProcessing(true);
        const userEmail = currentUser.email.toLowerCase();

        // 1. Asegurar que existe en el padrón de participantes
        let participant = participants.find(p => p.email.toLowerCase() === userEmail);
        if (!participant) {
          participant = {
            card: generateRandomCard(),
            name: currentUser.name,
            email: currentUser.email
          };
          await onSaveParticipants([...participants, participant]);
        }

        // 2. Registrar asistencia
        await onConfirmAttendance(eventId, dateStr, timeStr, currentUser.email);
        setIsConfirmed(true);
        setStatusMessage({
          type: 'success',
          text: `¡Hola ${currentUser.name}! Tu asistencia ha sido registrada exitosamente.`
        });
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err.message || 'No fue posible registrar tu asistencia automáticamente.'
        });
      } finally {
        setIsProcessing(false);
      }
    };

    autoCheckIn();
  }, [currentUser, event, slot]);

  // Manejador para registro manual de otro colaborador
  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCardInput.trim()) return;

    try {
      setIsProcessing(true);
      setStatusMessage(null);

      // Buscar colaborador por tarjeta o correo
      const query = manualCardInput.trim().toLowerCase();
      const p = participants.find(part => part.card.toLowerCase() === query || part.email.toLowerCase() === query);

      if (!p) {
        setStatusMessage({
          type: 'error',
          text: `No se encontró ningún colaborador con la tarjeta o correo "${manualCardInput}".`
        });
        return;
      }

      await onConfirmAttendance(eventId, dateStr, timeStr, p.email);
      setIsConfirmed(true);
      setStatusMessage({
        type: 'success',
        text: `Asistencia confirmada para ${p.name} (${p.card}).`
      });
      setManualCardInput('');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error al procesar asistencia manual.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Manejador para enviar feedback rápido
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
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingFeedback(false);
    }
  };

  if (!event || !slot) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Sesión no encontrada</h2>
        <p className="text-xs text-slate-400">El evento o el horario especificado en el código QR no existe o fue reprogramado.</p>
        <button
          onClick={onNavigateHome}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4">
      <div className="max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-300">
        
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 p-6 text-white text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner">
            <PartyPopper className="w-8 h-8 text-yellow-300" />
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-md">
            Check-In Presencial
          </span>
          <h1 className="text-xl font-bold mt-2 leading-snug">{event.title}</h1>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-xs text-indigo-100 font-medium">
            <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> {formatDateLong(dateStr)}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {timeStr}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Status Alert Banner */}
          {statusMessage && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed animate-in fade-in duration-300 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/30 text-rose-200'
            }`}>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{statusMessage.type === 'success' ? '¡Asistencia Registrada!' : 'Atención'}</p>
                <p className="mt-0.5">{statusMessage.text}</p>
              </div>
            </div>
          )}

          {/* Quick Details Card */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Facilitador / Instructor:</span>
              <span className="font-semibold text-slate-200">{event.instructor}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Ubicación:</span>
              <span className="font-semibold text-indigo-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {event.location || 'Sala de Capacitación'}
              </span>
            </div>
          </div>

          {/* External Survey CTA (If event has survey_url) */}
          {event.surveyUrl && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-950 border border-indigo-500/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Encuesta de Satisfacción Oficial</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tu opinión es clave para seguir mejorando. Por favor completa la breve evaluación de este evento:
              </p>
              <a
                href={event.surveyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
              >
                <span>Completar Encuesta del Evento</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* In-App Quick Feedback Rating Widget */}
          {currentUser && (
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">¿Qué te pareció la sesión?</span>
                <span className="text-[10px] text-slate-500">Calificación rápida</span>
              </div>

              {feedbackSent ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs text-center">
                  ¡Muchas gracias por tu calificación!
                </div>
              ) : (
                <form onSubmit={handleSendFeedback} className="space-y-3">
                  {/* Star Rating Selector */}
                  <div className="flex items-center justify-center gap-2 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            (hoverRating || rating) >= star
                              ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                              : 'text-slate-700'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {rating > 0 && (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      <input
                        type="text"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Comentario u opinión opcional..."
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={isSendingFeedback}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isSendingFeedback ? 'Enviando...' : 'Enviar Calificación'}</span>
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}

          {/* Manual Attendee Check-In Option */}
          <div className="pt-2">
            {!showManualForm ? (
              <button
                type="button"
                onClick={() => setShowManualForm(true)}
                className="w-full py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950/40 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                ¿Registrar a otro colaborador manualmente?
              </button>
            ) : (
              <form onSubmit={handleManualCheckIn} className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Registro Manual</span>
                  <button
                    type="button"
                    onClick={() => setShowManualForm(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-300"
                  >
                    Cancelar
                  </button>
                </div>
                <input
                  type="text"
                  value={manualCardInput}
                  onChange={(e) => setManualCardInput(e.target.value)}
                  placeholder="Número de Tarjeta o Correo..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !manualCardInput.trim()}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Validando...' : 'Confirmar Asistencia Manual'}
                </button>
              </form>
            )}
          </div>

          {/* Footer Back Button */}
          <button
            onClick={onNavigateHome}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Plataforma Principal</span>
          </button>

        </div>

      </div>
    </div>
  );
};
