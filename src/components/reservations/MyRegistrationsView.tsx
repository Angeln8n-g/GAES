import React, { useState } from 'react';
import { 
  CalendarCheck2, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Video, 
  User, 
  Download, 
  ExternalLink, 
  Trash2, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles, 
  X,
  Award,
  Layers,
  BookOpen,
  Check,
  ChevronRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { TrainingEvent, UserAccount, Slot, Schedule, TrainingProgram, ParticipantGroup, Participant } from '../../types';
import { formatDateLong } from '../../utils/formatters';
import { downloadIcsFile, getGoogleCalendarUrl, getOutlookCalendarUrl } from '../../utils/icsUtils';

interface UserRegistrationItem {
  event: TrainingEvent;
  schedule: Schedule;
  slot: Slot;
  hasAttended: boolean;
}

interface MyRegistrationsViewProps {
  events: TrainingEvent[];
  currentUser: UserAccount | null;
  programs?: TrainingProgram[];
  groups?: ParticipantGroup[];
  participants?: Participant[];
  onCancelRegistration: (eventId: string, date: string, time: string, email: string) => Promise<void>;
  onExploreCatalog: () => void;
  onOpenReservationModal?: (event: TrainingEvent) => void;
}

export const MyRegistrationsView: React.FC<MyRegistrationsViewProps> = ({
  events,
  currentUser,
  programs = [],
  groups = [],
  participants = [],
  onCancelRegistration,
  onExploreCatalog,
  onOpenReservationModal
}) => {
  const [cancelingItem, setCancelingItem] = useState<UserRegistrationItem | null>(null);
  const [selectedPassItem, setSelectedPassItem] = useState<UserRegistrationItem | null>(null);
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);

  if (!currentUser) return null;

  // Extraer todas las inscripciones del usuario actual
  const userRegistrations: UserRegistrationItem[] = [];

  events.forEach(evt => {
    evt.schedule.forEach(sch => {
      sch.slots.forEach(slot => {
        const isEnrolled = slot.attendees.map(a => a.toLowerCase()).includes(currentUser.email.toLowerCase());
        if (isEnrolled) {
          const hasAttended = (slot.attendedList || []).map(a => a.toLowerCase()).includes(currentUser.email.toLowerCase());
          userRegistrations.push({
            event: evt,
            schedule: sch,
            slot: slot,
            hasAttended
          });
        }
      });
    });
  });

  const handleConfirmCancel = async () => {
    if (!cancelingItem) return;
    try {
      setIsProcessingCancel(true);
      await onCancelRegistration(
        cancelingItem.event.id,
        cancelingItem.schedule.date,
        cancelingItem.slot.time,
        currentUser.email
      );
      setCancelingItem(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingCancel(false);
    }
  };

  // Identificar tarjeta y datos de participante del usuario actual
  const userEmail = currentUser.email.toLowerCase();
  const currentParticipant = participants.find(p => p.email.toLowerCase() === userEmail);
  const userCard = currentParticipant?.card;

  // Programas activos asignados al usuario
  const assignedPrograms = programs.filter(prog => {
    if (prog.status !== 'active') return false;
    const isTargetByGroup = groups.some(g => 
      prog.targetGroupIds.includes(g.id) && userCard && g.memberCards.includes(userCard)
    );
    const isTargetDirect = Boolean(userCard && (prog.targetParticipantCards || []).includes(userCard));
    return isTargetByGroup || isTargetDirect;
  });

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-indigo-400">
            <CalendarCheck2 className="w-4 h-4" />
            <span>Panel del Colaborador</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Mis Capacitaciones & Rutas</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Consulta tus horarios agendados, monitorea el cumplimiento de tus cronogramas y genera pases QR.
          </p>
        </div>

        <div className="px-5 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center sm:text-right">
          <p className="text-2xl font-black text-indigo-400">{userRegistrations.length}</p>
          <p className="text-[11px] text-slate-400 font-medium">Inscripciones Activas</p>
        </div>
      </div>

      {/* SECCIÓN: RUTAS Y CRONOGRAMAS ASIGNADOS */}
      {assignedPrograms.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Tus Rutas Formativas & Cronogramas Obligatorios</span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {assignedPrograms.map(prog => {
              // Calcular avance personal para este programa
              const mandatoryItems = prog.eventItems.filter(e => e.isMandatory);
              
              let completedMandatory = 0;
              let totalCompleted = 0;

              const coursesProgress = prog.eventItems.map(item => {
                const targetEvent = events.find(e => e.id === item.eventId);
                let hasAttended = false;
                let isRegistered = false;
                let registeredDate = '';
                let registeredTime = '';

                if (targetEvent) {
                  targetEvent.schedule.forEach(sch => {
                    sch.slots.forEach(slot => {
                      if (slot.attendees.map(a => a.toLowerCase()).includes(userEmail)) {
                        isRegistered = true;
                        registeredDate = sch.date;
                        registeredTime = slot.time;
                      }
                      if ((slot.attendedList || []).map(a => a.toLowerCase()).includes(userEmail)) {
                        hasAttended = true;
                      }
                    });
                  });
                }

                if (hasAttended) {
                  totalCompleted++;
                  if (item.isMandatory) completedMandatory++;
                }

                return {
                  event: targetEvent,
                  isMandatory: item.isMandatory,
                  hasAttended,
                  isRegistered,
                  registeredDate,
                  registeredTime
                };
              });

              const percentage = mandatoryItems.length > 0 
                ? Math.round((completedMandatory / mandatoryItems.length) * 100)
                : Math.round((totalCompleted / prog.eventItems.length) * 100);

              const isCompleted = percentage === 100;
              const isOverdue = new Date(prog.endDate) < new Date() && !isCompleted;

              return (
                <div 
                  key={prog.id}
                  className="bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : isOverdue
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                        }`}>
                          {isCompleted ? '✓ Cronograma Completado' : isOverdue ? 'Atrasado / Por Vencer' : 'Ruta Activa'}
                        </span>
                        <span className="text-xs text-slate-400">
                          Fecha Límite: <strong className="text-slate-200">{formatDateLong(prog.endDate)}</strong>
                        </span>
                      </div>

                      <h2 className="text-xl font-black text-white">{prog.title}</h2>
                      <p className="text-xs text-slate-400 mt-1 max-w-2xl">{prog.description}</p>
                    </div>

                    {/* Progress Percentage Badge */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-3 sm:p-0 rounded-2xl bg-slate-950/60 sm:bg-transparent border sm:border-0 border-slate-800">
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-400 font-semibold block">Tu Cumplimiento</span>
                        <span className="text-2xl font-black text-indigo-400">{percentage}%</span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        {completedMandatory} de {mandatoryItems.length} obligatorios
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800/80">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Courses Checklist */}
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-slate-300 block">
                      Capacitaciones requeridas en este programa:
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {coursesProgress.map((cp, idx) => {
                        const { event, isMandatory, hasAttended, isRegistered, registeredDate, registeredTime } = cp;
                        if (!event) return null;

                        return (
                          <div 
                            key={event.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                              hasAttended 
                                ? 'bg-emerald-950/20 border-emerald-500/30' 
                                : isRegistered 
                                ? 'bg-indigo-950/20 border-indigo-500/30' 
                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isMandatory 
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {isMandatory ? '★ Obligatorio' : 'Opcional'}
                                </span>

                                {hasAttended ? (
                                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Completado
                                  </span>
                                ) : isRegistered ? (
                                  <span className="text-[11px] font-bold text-indigo-400 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" /> Agendado
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-semibold text-slate-500">
                                    Pendiente
                                  </span>
                                )}
                              </div>

                              <h4 className="text-xs font-bold text-white line-clamp-2">{event.title}</h4>
                              <p className="text-[11px] text-slate-400 mt-1">Instructor: {event.instructor}</p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                              {hasAttended ? (
                                <span className="text-[11px] text-emerald-400 font-semibold">
                                  Asistencia registrada ✓
                                </span>
                              ) : isRegistered ? (
                                <span className="text-[11px] text-slate-300 font-medium">
                                  📅 {registeredDate} ({registeredTime})
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onOpenReservationModal && onOpenReservationModal(event)}
                                  className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <span>Agendar Ahora</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Registrations List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Tus Inscripciones y Pases de Acceso ({userRegistrations.length})
          </h3>
        </div>

        {userRegistrations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userRegistrations.map((item, idx) => {
            const { event, schedule, slot, hasAttended } = item;
            
            return (
              <div 
                key={`${event.id}-${schedule.date}-${slot.time}-${idx}`}
                className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  
                  {/* Status Badges Header */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      {event.category}
                    </span>

                    {hasAttended ? (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Asistencia Confirmada
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Inscripción Activa
                      </span>
                    )}
                  </div>

                  {/* Title & Instructor */}
                  <h3 className="text-base font-bold text-white mb-2 line-clamp-2">{event.title}</h3>
                  
                  <div className="space-y-1.5 mb-5 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Facilitador: <strong>{event.instructor}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{formatDateLong(schedule.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Horario: <strong className="text-white">{slot.time}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.modality === 'Virtual' ? (
                        <Video className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <span>Lugar: {event.location || (event.modality === 'Virtual' ? 'Microsoft Teams' : 'Instalaciones')}</span>
                    </div>
                  </div>

                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 border-t border-slate-800/80 space-y-3">
                  
                  {/* Calendar Quick Sync */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadIcsFile(event, schedule.date, slot.time)}
                      title="Descargar archivo de calendario .ics"
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-800 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar .ICS
                    </button>
                    <a
                      href={getGoogleCalendarUrl(event, schedule.date, slot.time)}
                      target="_blank"
                      rel="noreferrer"
                      title="Abrir en Google Calendar"
                      className="py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-800 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Google
                    </a>
                  </div>

                  {/* Pass QR & Cancel Action */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedPassItem(item)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Pase de Asistencia QR
                    </button>

                    {!hasAttended && (
                      <button
                        onClick={() => setCancelingItem(item)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Cancelar inscripción y liberar cupo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800/60 text-slate-500 flex items-center justify-center mx-auto mb-4">
            <CalendarCheck2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-200">No tienes capacitaciones agendadas</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-6 leading-relaxed">
            Aún no te has inscrito a ningún taller o webinar. Explora nuestro catálogo y asegura tu lugar en las sesiones disponibles.
          </p>
          <button
            onClick={onExploreCatalog}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 inline-flex items-center gap-2 hover:scale-105 transition-all"
          >
            <span>Ver Catálogo de Cursos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">¿Cancelar tu inscripción?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Al cancelar, liberarás tu cupo en <strong>{cancelingItem.event.title}</strong> ({cancelingItem.schedule.date} a las {cancelingItem.slot.time}) para que otro colaborador pueda registrarse.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelingItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Mantener mi cupo
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isProcessingCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/30"
              >
                {isProcessingCancel ? 'Cancelando...' : 'Sí, Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Pass Modal */}
      {selectedPassItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 relative">
            <button
              onClick={() => setSelectedPassItem(null)}
              className="absolute top-4 right-4 p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pt-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400">
                Pase de Acceso
              </span>
              <h3 className="text-base font-bold text-white mt-1 line-clamp-1">
                {selectedPassItem.event.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedPassItem.schedule.date} • {selectedPassItem.slot.time}
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl shadow-inner inline-block mx-auto">
              <QRCodeSVG
                value={`${window.location.origin}${window.location.pathname}?tab=attendance&event=${selectedPassItem.event.id}&date=${selectedPassItem.schedule.date}&time=${encodeURIComponent(selectedPassItem.slot.time)}`}
                size={180}
                level="H"
              />
            </div>

            <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <p className="font-semibold">{currentUser.name}</p>
              <p className="text-[11px] text-slate-500">{currentUser.email}</p>
            </div>

            <p className="text-[11px] text-slate-400">
              Presenta este código al ingresar al aula o sesión presencial para registrar tu asistencia automáticamente.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
