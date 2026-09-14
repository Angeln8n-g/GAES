import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  Sparkles, 
  Star, 
  Download, 
  ExternalLink,
  ShieldCheck,
  Building2,
  Lock,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AttendeeLookupResult, ScheduledSessionItem } from '../../utils/attendeeLookup';
import { formatDateLong, getEventDurationMetrics } from '../../utils/formatters';
import { downloadIcsFile, getGoogleCalendarUrl } from '../../utils/icsUtils';
import { TrainingEvent } from '../../types';

interface AttendeeScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  lookupResult: AttendeeLookupResult | null;
  onConfirmAttendance?: (eventId: string, date: string, time: string, email: string) => Promise<void>;
  onOpenTecEvaluation?: (event: TrainingEvent) => void;
  onExploreCatalog?: () => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AttendeeScheduleModal: React.FC<AttendeeScheduleModalProps> = ({
  isOpen,
  onClose,
  lookupResult,
  onConfirmAttendance,
  onOpenTecEvaluation,
  onExploreCatalog,
  onShowToast
}) => {
  const [selectedPassSession, setSelectedPassSession] = useState<ScheduledSessionItem | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'today' | 'upcoming'>('all');

  if (!isOpen || !lookupResult) return null;

  const { found, displayName, displayCedula, displayCard, displayDepartment, displayEmail, sessions } = lookupResult;

  // Filtrar sesiones según selector
  const filteredSessions = sessions.filter(session => {
    if (filterType === 'today') return session.isToday;
    if (filterType === 'upcoming') return !session.isPast;
    return true;
  });

  const todaySessionsCount = sessions.filter(s => s.isToday).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon Claro */}
        <div className="bg-gradient-to-r from-[#DA291C] via-red-600 to-red-700 text-white p-5 sm:p-6 shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md">
              Lobby de Recepción Presencial
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950">
              Consulta de Cédula
            </span>
          </div>

          {found ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-black leading-tight">
                  ¡Hola, {displayName}!
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-red-100 font-medium mt-1">
                  {displayCedula && (
                    <span><strong>Cédula:</strong> {displayCedula}</span>
                  )}
                  {displayCard && (
                    <>
                      <span>•</span>
                      <span><strong>Carnet:</strong> {displayCard}</span>
                    </>
                  )}
                  {displayDepartment && (
                    <>
                      <span>•</span>
                      <span><strong>Área:</strong> {displayDepartment}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Total sessions counter badge */}
              <div className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-center sm:text-right shrink-0">
                <span className="text-xl font-black block leading-none">{sessions.length}</span>
                <span className="text-[10px] text-red-100 font-bold uppercase tracking-wider">
                  {sessions.length === 1 ? 'Curso Agendado' : 'Cursos Agendados'}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-black leading-tight">
                Resultado de Consulta de Cédula
              </h2>
              <p className="text-xs text-red-100 mt-1">
                Verificación en el padrón de colaboradores y participantes de capacitación.
              </p>
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 md:p-8 overflow-y-auto flex-1 space-y-6">

          {/* CASO 1: CÉDULA NO ENCONTRADA */}
          {!found && (
            <div className="py-12 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-sm">
                <AlertCircle className="w-9 h-9" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                Cédula No Encontrada en el Sistema
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                No pudimos encontrar ningún colaborador o participante registrado con la cédula <strong>"{displayCedula}"</strong>.
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 text-left space-y-1.5">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#DA291C]" />
                  ¿Qué puedes hacer?
                </p>
                <p className="text-slate-500 text-[11px]">
                  1. Verifica si ingresaste los 11 dígitos correctamente.
                </p>
                <p className="text-slate-500 text-[11px]">
                  2. Acércate al mostrador de recepción de Aprendizaje & Desarrollo para asistencia presencial inmediata.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-6 py-2.5 bg-[#DA291C] hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/25 transition-all cursor-pointer"
              >
                Volver a Consultar
              </button>
            </div>
          )}

          {/* CASO 2: COLABORADOR ENCONTRADO PERO SIN EVENTOS AGENDADOS */}
          {found && sessions.length === 0 && (
            <div className="py-10 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                Usuario Registrado, sin Cursos Agendados
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Hola <strong>{displayName}</strong>, tu perfil se encuentra activo en el padrón corporativo, pero actualmente <strong>no tienes ninguna sesión agendada</strong> para hoy ni en fechas próximas.
              </p>
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 text-left space-y-1">
                <p className="font-bold">¿Esperabas un curso hoy?</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Por favor consulta con el facilitador de la sala o con tu líder de área para que registre tu inscripción en el sistema.
                </p>
              </div>
              {onExploreCatalog && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onExploreCatalog();
                  }}
                  className="px-6 py-2.5 bg-[#DA291C] hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/25 transition-all flex items-center gap-2 mx-auto cursor-pointer"
                >
                  <span>Explorar Catálogo de Capacitaciones</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* CASO 3: COLABORADOR CON CURSOS AGENDADOS (GRIDVIEW) */}
          {found && sessions.length > 0 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Barra de Filtros y Notificación de Sesiones de Hoy */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Tus Capacitaciones ({filteredSessions.length})
                  </span>
                  {todaySessionsCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-[#DA291C] border border-red-200 animate-pulse">
                      ★ {todaySessionsCount} {todaySessionsCount === 1 ? 'SESIÓN HOY' : 'SESIONES HOY'}
                    </span>
                  )}
                </div>

                {/* Filtros rápidos */}
                <div className="flex items-center gap-1.5 text-xs bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      filterType === 'all' 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos ({sessions.length})
                  </button>
                  {todaySessionsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterType('today')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        filterType === 'today' 
                          ? 'bg-[#DA291C] text-white shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Hoy ({todaySessionsCount})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFilterType('upcoming')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      filterType === 'upcoming' 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Próximos
                  </button>
                </div>
              </div>

              {/* GRIDVIEW RESPONSIVO (1 Col Móvil, 2 Col Tablet, 3 Col Desktop) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSessions.map((session, idx) => {
                  const { event, schedule, slot, hasAttended, isMandatory, isToday, isPast } = session;
                  const sessionKey = `${event.id}-${schedule.date}-${slot.time}`;
                  const metrics = getEventDurationMetrics(event);

                  return (
                    <div 
                      key={`${sessionKey}-${idx}`}
                      className={`bg-white border rounded-3xl p-5 shadow-sm transition-all flex flex-col justify-between hover:shadow-md ${
                        isToday 
                          ? 'border-red-300 ring-2 ring-red-500/20 bg-gradient-to-b from-red-50/20 to-white' 
                          : hasAttended 
                          ? 'border-emerald-200 bg-emerald-50/20' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-3">
                        
                        {/* Status Badges Header */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-[#DA291C] border border-red-200">
                              {event.category}
                            </span>
                            {isMandatory && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5 text-red-600" />
                                Obligatorio
                              </span>
                            )}
                          </div>

                          {/* Attendance Confirmation Badge */}
                          {hasAttended ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Asistió
                            </span>
                          ) : isToday ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 uppercase tracking-wider animate-pulse">
                              ¡Es Hoy!
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Agendado
                            </span>
                          )}
                        </div>

                        {/* Event Title */}
                        <h4 className="text-sm font-black text-slate-900 leading-snug line-clamp-2">
                          {event.title}
                        </h4>

                        {/* Event Details */}
                        <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-[#DA291C] shrink-0" />
                            <span className="line-clamp-1">Facilitador: <strong className="text-slate-800">{event.instructor}</strong></span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-[#DA291C] shrink-0" />
                            <span className={isToday ? 'font-bold text-[#DA291C]' : ''}>
                              {formatDateLong(schedule.date)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-[#DA291C] shrink-0" />
                            <span>Horario: <strong className="text-slate-900">{slot.time}{slot.endTime ? ` - ${slot.endTime}` : ''}</strong></span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Duración: <strong className="text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">{metrics.totalHours} hrs ({metrics.totalDays} {metrics.totalDays === 1 ? 'día' : 'días'})</strong></span>
                          </div>

                          <div className="flex items-center gap-2">
                            {event.modality === 'Virtual' ? (
                              <Video className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                            <span className="line-clamp-1">
                              Sala: <strong className="text-slate-900">{event.location || (event.modality === 'Virtual' ? 'Microsoft Teams' : 'Sala Claro')}</strong>
                            </span>
                          </div>
                        </div>

                      </div>

                      {/* Card Action Footer: Solo Pase QR / Estado Informativo (Sin auto-confirmación) */}
                      <div className="pt-4 border-t border-slate-100 space-y-2 mt-4">
                        {hasAttended ? (
                          <div className="space-y-2">
                            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Asistencia Confirmada por Facilitador</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedPassSession(session)}
                                className="flex-1 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5 text-slate-600" />
                                <span>Ver Pase QR</span>
                              </button>

                              {onOpenTecEvaluation && (() => {
                                const attendeeEmail = (lookupResult.participant?.email || '').toLowerCase();
                                const alreadyEvaluated = (event.feedbacks || []).find(
                                  fb => fb.userEmail.toLowerCase() === attendeeEmail
                                );

                                if (alreadyEvaluated) {
                                  return (
                                    <span 
                                      className="py-2 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1 shrink-0 shadow-2xs"
                                      title="Encuesta de satisfacción completada (1 sola respuesta permitida)"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>✓ Evaluado ({alreadyEvaluated.rating}★)</span>
                                    </span>
                                  );
                                }

                                return (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onOpenTecEvaluation(event);
                                    }}
                                    className="py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                                    title="Completar Encuesta de Evaluación TEC"
                                  >
                                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                    <span>Evaluar</span>
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPassSession(session)}
                              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-slate-900/15 transition-all cursor-pointer active:scale-95"
                              title="Ver código QR de acceso para presentar al instructor en la puerta"
                            >
                              <QrCode className="w-4 h-4 text-amber-400" />
                              <span>Ver Pase QR de Acceso</span>
                            </button>
                            <p className="text-[10px] text-center text-slate-400 font-medium">
                              Presenta este código QR al instructor en la puerta de la sala para registrar tu asistencia.
                            </p>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-[#DA291C]" />
            <span>Sistema de Acompañamiento y Recepción - Claro Dominicana</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar Lobby
          </button>
        </div>

      </div>

      {/* SUB-MODAL: Pase QR Individual para Mostrar en Puerta */}
      {selectedPassSession && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-black text-[#DA291C] uppercase tracking-wider">
                Pase de Entrada Claro
              </span>
              <button 
                onClick={() => setSelectedPassSession(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code Graphic */}
            <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl inline-block shadow-inner">
              <QRCodeSVG
                value={`${window.location.origin}${window.location.pathname}?tab=attendance&event=${selectedPassSession.event.id}&date=${selectedPassSession.schedule.date}&time=${encodeURIComponent(selectedPassSession.slot.time)}`}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            <div>
              <h4 className="text-sm font-black text-slate-900 leading-tight">
                {selectedPassSession.event.title}
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {formatDateLong(selectedPassSession.schedule.date)} • {selectedPassSession.slot.time}{selectedPassSession.slot.endTime ? ` - ${selectedPassSession.slot.endTime}` : ''}
              </p>
              <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>{getEventDurationMetrics(selectedPassSession.event).totalHours} hrs ({getEventDurationMetrics(selectedPassSession.event).totalDays} {getEventDurationMetrics(selectedPassSession.event).totalDays === 1 ? 'día' : 'días'})</span>
              </div>
              <p className="text-[11px] text-[#DA291C] font-bold mt-1.5">
                {displayName} ({displayCedula || displayCard})
              </p>
            </div>

            {/* Calendar links */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => downloadIcsFile(selectedPassSession.event, selectedPassSession.schedule.date, selectedPassSession.slot.time)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#DA291C]" />
                <span>.ICS</span>
              </button>
              <a
                href={getGoogleCalendarUrl(selectedPassSession.event, selectedPassSession.schedule.date, selectedPassSession.slot.time)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-[#DA291C] text-xs font-bold flex items-center justify-center gap-1.5 border border-red-200 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google</span>
              </a>
            </div>

            <button
              onClick={() => setSelectedPassSession(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
