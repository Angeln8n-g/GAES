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
  ChevronRight,
  Lock,
  ShieldAlert,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { TrainingEvent, UserAccount, Slot, Schedule, TrainingProgram, ParticipantGroup, Participant } from '../../types';
import { formatDateLong } from '../../utils/formatters';
import { downloadIcsFile, getGoogleCalendarUrl } from '../../utils/icsUtils';

interface UserRegistrationItem {
  event: TrainingEvent;
  schedule: Schedule;
  slot: Slot;
  hasAttended: boolean;
  isMandatory?: boolean;
  assignedBy?: string | null;
  assignmentType?: 'mandatory' | 'voluntary' | 'self';
  assignmentNotes?: string | null;
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
          const detail = (slot.attendeesDetails || []).find(d => d.email.toLowerCase() === currentUser.email.toLowerCase());
          userRegistrations.push({
            event: evt,
            schedule: sch,
            slot: slot,
            hasAttended,
            isMandatory: detail ? Boolean(detail.isMandatory) : false,
            assignedBy: detail?.assignedBy || null,
            assignmentType: detail?.assignmentType || (detail?.isMandatory ? 'mandatory' : 'self'),
            assignmentNotes: detail?.assignmentNotes || null
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
    if (!userCard) return false;
    const isTargetGroup = groups.some(g => prog.targetGroupIds.includes(g.id) && g.memberCards.includes(userCard));
    const isTargetDirect = (prog.targetParticipantCards || []).includes(userCard);
    return isTargetGroup || isTargetDirect;
  });

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header Banner (Light Theme) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs font-bold text-[#DA291C]">
            <CalendarCheck2 className="w-4 h-4" />
            <span>Panel del Colaborador</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Mis Capacitaciones & Rutas</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Consulta tus horarios agendados, monitorea el cumplimiento de tus cronogramas y genera tus pases de acceso QR.
          </p>
        </div>

        <div className="px-5 py-3 rounded-2xl bg-red-50 border border-red-200 text-center sm:text-right">
          <p className="text-2xl font-black text-[#DA291C]">{userRegistrations.length}</p>
          <p className="text-[11px] text-slate-600 font-bold">Inscripciones Activas</p>
        </div>
      </div>

      {/* SECCIÓN: RUTAS Y CRONOGRAMAS ASIGNADOS */}
      {assignedPrograms.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#DA291C] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Tus Rutas Formativas & Cronogramas Obligatorios</span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {assignedPrograms.map(prog => {
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
                  className="bg-white border border-red-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : isOverdue
                            ? 'bg-rose-50 text-rose-700 border-rose-300'
                            : 'bg-red-50 text-[#DA291C] border-red-200'
                        }`}>
                          {isCompleted ? '✓ Cronograma Completado' : isOverdue ? 'Atrasado / Por Vencer' : 'Ruta Activa'}
                        </span>
                        <span className="text-xs text-slate-500">
                          Fecha Límite: <strong className="text-slate-800">{formatDateLong(prog.endDate)}</strong>
                        </span>
                      </div>

                      <h2 className="text-xl font-extrabold text-slate-900">{prog.title}</h2>
                      <p className="text-xs text-slate-600 mt-1 max-w-2xl">{prog.description}</p>
                    </div>

                    {/* Progress Percentage Badge */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-3 sm:p-0 rounded-2xl bg-slate-50 sm:bg-transparent border sm:border-0 border-slate-200">
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-500 font-bold block">Tu Cumplimiento</span>
                        <span className="text-2xl font-black text-[#DA291C]">{percentage}%</span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        {completedMandatory} de {mandatoryItems.length} obligatorios
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-[#DA291C]'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Courses Checklist */}
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-slate-800 block">
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
                                ? 'bg-emerald-50/60 border-emerald-200' 
                                : isRegistered 
                                ? 'bg-red-50/40 border-red-200' 
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isMandatory 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                    : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {isMandatory ? '★ Obligatorio' : 'Opcional'}
                                </span>

                                {hasAttended ? (
                                  <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Completado
                                  </span>
                                ) : isRegistered ? (
                                  <span className="text-[11px] font-bold text-[#DA291C] flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" /> Agendado
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-semibold text-slate-400">
                                    Pendiente
                                  </span>
                                )}
                              </div>

                              <h4 className="text-xs font-bold text-slate-900 line-clamp-2 mb-1">
                                {event.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 line-clamp-1 mb-2">
                                Facilitador: {event.instructor}
                              </p>
                            </div>

                            {/* Action / Schedule Info */}
                            <div className="pt-2 border-t border-slate-200/80 mt-2 text-xs">
                              {isRegistered ? (
                                <div className="text-[11px] text-slate-600 space-y-0.5">
                                  <p>📅 {registeredDate}</p>
                                  <p>⏰ {registeredTime}</p>
                                </div>
                              ) : onOpenReservationModal ? (
                                <button
                                  onClick={() => onOpenReservationModal(event)}
                                  className="w-full py-1.5 px-3 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                                >
                                  <span>Inscribirme</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              ) : null}
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

      {/* SECCIÓN: MIS INSCRIPCIONES INDIVIDUALES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
            Sesiones Agendadas ({userRegistrations.length})
          </h2>
        </div>

        {userRegistrations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userRegistrations.map((item, idx) => {
              const { event, schedule, slot, hasAttended } = item;

              return (
                <div 
                  key={`${event.id}-${schedule.date}-${slot.time}-${idx}`}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    
                    {/* Status Badges Header */}
                    <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-[#DA291C] border border-red-200">
                          {event.category}
                        </span>

                        {item.isMandatory ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-red-600" />
                            ★ Obligatorio
                          </span>
                        ) : item.assignedBy ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-300 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-cyan-600" />
                            Sugerido
                          </span>
                        ) : null}
                      </div>

                      {hasAttended ? (
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmado
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Activo
                        </span>
                      )}
                    </div>

                    {/* Title & Instructor */}
                    <h3 className="text-base font-extrabold text-slate-900 mb-2 line-clamp-2">{event.title}</h3>
                    
                    {/* Supervisor assignment details note */}
                    {item.assignedBy && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1 mb-4 text-amber-900">
                        <div className="flex items-center gap-1.5 font-bold">
                          <User className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Asignado por: {item.assignedBy}</span>
                        </div>
                        {item.assignmentNotes && (
                          <p className="text-[11px] italic pl-5">"{item.assignmentNotes}"</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-1.5 mb-5 text-xs text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-[#DA291C] shrink-0" />
                        <span>Facilitador: <strong className="text-slate-800">{event.instructor}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-[#DA291C] shrink-0" />
                        <span>{formatDateLong(schedule.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#DA291C] shrink-0" />
                        <span>Horario: <strong className="text-slate-800">{slot.time}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.modality === 'Virtual' ? (
                          <Video className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                        <span>Lugar: {event.location || (event.modality === 'Virtual' ? 'Microsoft Teams' : 'Instalaciones Claro')}</span>
                      </div>
                    </div>

                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    
                    {/* Calendar Quick Sync */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadIcsFile(event, schedule.date, slot.time)}
                        title="Descargar archivo de calendario .ics"
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-[#DA291C]" />
                        Descargar .ICS
                      </button>
                      <a
                        href={getGoogleCalendarUrl(event, schedule.date, slot.time)}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir en Google Calendar"
                        className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-[#DA291C] text-xs font-bold flex items-center justify-center gap-1.5 border border-red-200 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Google
                      </a>
                    </div>

                    {/* Pass QR & Cancel Action */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <button
                        onClick={() => setSelectedPassItem(item)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        Pase QR
                      </button>

                      {item.isMandatory ? (
                        <div 
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-red-200 text-red-700 text-xs font-bold select-none cursor-help"
                          title="Esta capacitación fue asignada obligatoriamente por tu supervisor y no puede ser cancelada."
                        >
                          <Lock className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>Obligatorio</span>
                        </div>
                      ) : !hasAttended ? (
                        <button
                          onClick={() => setCancelingItem(item)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Cancelar inscripción y liberar cupo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : null}
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <CalendarCheck2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No tienes capacitaciones agendadas</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6 leading-relaxed">
              Aún no te has inscrito a ningún taller o webinar. Explora nuestro catálogo y asegura tu lugar en las sesiones disponibles.
            </p>
            <button
              onClick={onExploreCatalog}
              className="px-6 py-3 rounded-2xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/25 inline-flex items-center gap-2 transition-all"
            >
              <span>Ver Catálogo de Cursos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-extrabold text-slate-900">¿Cancelar tu inscripción?</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Al cancelar, liberarás tu cupo en <strong>{cancelingItem.event.title}</strong> ({cancelingItem.schedule.date} a las {cancelingItem.slot.time}) para que otro colaborador pueda registrarse.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelingItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={isProcessingCancel}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 transition-all"
              >
                {isProcessingCancel ? 'Cancelando...' : 'Sí, Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Pass Modal */}
      {selectedPassItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-extrabold text-[#DA291C] uppercase tracking-wider">Pase Digital de Asistencia</span>
              <button onClick={() => setSelectedPassItem(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl inline-block shadow-inner">
              <QRCodeSVG
                value={`GAES-PASS:${selectedPassItem.event.id}:${selectedPassItem.schedule.date}:${selectedPassItem.slot.time}:${currentUser.email}`}
                size={180}
                level="H"
                fgColor="#1E293B"
              />
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{selectedPassItem.event.title}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{selectedPassItem.schedule.date} • {selectedPassItem.slot.time}</p>
              <p className="text-[11px] font-bold text-slate-800 mt-1">{currentUser.name} ({currentUser.email})</p>
            </div>

            <p className="text-[10px] text-slate-400">
              Presenta este código QR al instructor en la entrada para registrar tu asistencia.
            </p>

            <button
              onClick={() => setSelectedPassItem(null)}
              className="w-full py-2.5 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              Cerrar Pase
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
