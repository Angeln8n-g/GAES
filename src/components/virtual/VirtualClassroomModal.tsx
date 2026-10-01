import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Video, 
  ExternalLink, 
  Copy, 
  Check, 
  Clock, 
  Calendar as CalendarIcon, 
  User, 
  Maximize2, 
  Minimize2, 
  CheckCircle2, 
  FileText, 
  Headphones, 
  Sparkles, 
  AlertCircle,
  Radio,
  Layers,
  HelpCircle,
  Key,
  Hash,
  Laptop
} from 'lucide-react';
import { TrainingEvent, Schedule, Slot, UserAccount, Participant } from '../../types';
import { formatDateLong } from '../../utils/formatters';
import { apiService } from '../../services/api';
import { AccessibleModal } from '../common/AccessibleModal';

interface VirtualClassroomModalProps {
  event: TrainingEvent;
  schedule?: Schedule;
  slot?: Slot;
  currentUser: UserAccount | null;
  participant?: Participant | null;
  onClose: () => void;
  onAttendanceSuccess?: () => void;
}

export const VirtualClassroomModal: React.FC<VirtualClassroomModalProps> = ({
  event,
  schedule,
  slot,
  currentUser,
  participant,
  onClose,
  onAttendanceSuccess
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [zoomEmbedMode, setZoomEmbedMode] = useState(false);

  // Estados de registro de asistencia en vivo
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [localAttendanceStatus, setLocalAttendanceStatus] = useState<'pending' | 'checked_in' | 'completed'>(() => {
    const userEmail = (currentUser?.email || participant?.email || '').toLowerCase();
    if (!slot || !userEmail) return 'pending';
    if (slot.completedAttendanceList?.map(e => e.toLowerCase()).includes(userEmail)) return 'completed';
    if (slot.checkInList?.map(e => e.toLowerCase()).includes(userEmail)) return 'checked_in';
    return 'pending';
  });

  const activeSchedule = schedule || event.schedule?.[0];
  const activeSlot = slot || activeSchedule?.slots?.[0];

  // Fecha y hora local
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const isToday = activeSchedule ? activeSchedule.date === todayStr : false;
  const isPast = activeSchedule ? activeSchedule.date < todayStr : false;

  const meetingPlatform = event.meetingPlatform || (event.meetingUrl?.includes('zoom.us') ? 'zoom' : 'teams');
  const meetingUrl = event.meetingUrl || event.location;

  // Extraer o usar ID y Clave de Zoom / Teams
  const effectiveMeetingId = event.meetingId || (() => {
    if (!meetingUrl) return null;
    const match = meetingUrl.match(/\/j\/(\d+)/);
    return match ? match[1] : null;
  })();

  const effectiveMeetingPassword = event.meetingPassword || (() => {
    if (!meetingUrl) return null;
    const match = meetingUrl.match(/[?&]pwd=([^&]+)/);
    return match ? match[1] : null;
  })();

  const handleCopy = (text: string, type: 'link' | 'id' | 'password') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else if (type === 'password') {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const handleToggleFullscreen = () => {
    const elem = document.getElementById('virtual-classroom-stage');
    if (!elem) return;

    if (!document.fullscreenElement) {
      elem.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleRegisterOnlineAttendance = async (action: 'checkin' | 'checkout') => {
    if (!activeSchedule || !activeSlot) return;

    const userEmail = currentUser?.email || participant?.email;
    const userCard = participant?.card || (currentUser as any)?.card;

    if (!userEmail && !userCard) {
      setAttendanceMessage({
        text: 'No se pudo identificar tu cuenta de usuario o cédula.',
        type: 'error'
      });
      return;
    }

    try {
      setIsMarkingAttendance(true);
      setAttendanceMessage(null);

      await apiService.confirmAttendance(
        event.id,
        activeSchedule.date,
        activeSlot.time,
        userEmail || '',
        action === 'checkout' ? 'checkout' : 'checkin'
      );

      if (action === 'checkout') {
        setLocalAttendanceStatus('completed');
        setAttendanceMessage({
          text: '¡Salida registrada con éxito! Tu participación ha sido completada.',
          type: 'success'
        });
      } else {
        setLocalAttendanceStatus('checked_in');
        setAttendanceMessage({
          text: '¡Asistencia registrada con éxito! Disfruta la capacitación.',
          type: 'success'
        });
      }

      onAttendanceSuccess?.();
    } catch (err: any) {
      console.error('Error registrando asistencia en aula virtual:', err);
      setAttendanceMessage({
        text: err.message || 'No fue posible registrar la asistencia. Intenta nuevamente.',
        type: 'error'
      });
    } finally {
      setIsMarkingAttendance(false);
    }
  };

  return (
    <AccessibleModal
      onClose={onClose}
      ariaLabel={`Aula Virtual: ${event.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Superior del Aula Virtual */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-md shrink-0 ${
              meetingPlatform === 'zoom' 
                ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white' 
                : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'
            }`}>
              <Video className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  meetingPlatform === 'zoom'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                }`}>
                  {meetingPlatform === 'zoom' ? 'Zoom Meetings' : 'Microsoft Teams'}
                </span>

                {isToday ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 animate-pulse">
                    <Radio className="w-3 h-3 text-rose-400" />
                    <span>EN VIVO HOY</span>
                  </span>
                ) : isPast ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    Sesión Concluida
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Programado
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-black text-white truncate leading-tight">
                {event.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleFullscreen}
              title="Pantalla Completa"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Salir' : 'Pantalla Completa'}</span>
            </button>

            <button
              onClick={onClose}
              aria-label="Cerrar Aula Virtual"
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-400 transition-colors border border-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo Principal del Aula: Escenario de Proyección + Barra Lateral */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-0">
          
          {/* Escenario de Proyección Principal (2 Columnas) */}
          <div 
            id="virtual-classroom-stage"
            className="lg:col-span-2 p-4 sm:p-6 flex flex-col justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800 relative min-h-[380px] sm:min-h-[460px]"
          >
            {/* Si es Zoom y el usuario activa el modo Web Player integrado */}
            {zoomEmbedMode && effectiveMeetingId ? (
              <div className="w-full h-full flex flex-col rounded-2xl overflow-hidden border border-slate-700 bg-black min-h-[360px]">
                <div className="p-2 bg-slate-800 text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-sky-400" />
                    Visor Web Zoom (ID: {effectiveMeetingId})
                  </span>
                  <button
                    onClick={() => setZoomEmbedMode(false)}
                    className="text-xs text-sky-400 hover:underline cursor-pointer"
                  >
                    Volver a Lanzador Principal
                  </button>
                </div>
                <iframe
                  src={`https://zoom.us/wc/${effectiveMeetingId}/join`}
                  sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-modals"
                  allow="camera; microphone; fullscreen; display-capture"
                  className="w-full flex-1 border-0"
                  title="Zoom Web Player"
                />
              </div>
            ) : (
              /* Escenario Cinemático de Proyección */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 rounded-3xl border border-slate-800/80 bg-radial from-slate-800/40 via-slate-900/60 to-slate-950 shadow-inner relative overflow-hidden group">
                
                {/* Fondo sutil con imagen del evento */}
                {event.imageUrl && (
                  <div className="absolute inset-0 opacity-15 pointer-events-none">
                    <img 
                      src={event.imageUrl} 
                      alt="" 
                      className="w-full h-full object-cover blur-sm"
                    />
                    <div className="absolute inset-0 bg-slate-950/80" />
                  </div>
                )}

                {/* Insignia Central de la Plataforma */}
                <div className="relative z-10 space-y-4 max-w-lg">
                  <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-slate-800/80 border border-slate-700 shadow-2xl backdrop-blur-xl group-hover:scale-105 transition-transform duration-300">
                    {meetingPlatform === 'zoom' ? (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/30">
                          <Video className="w-7 h-7" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black text-sky-400 uppercase tracking-widest">Sala de Videollamada</p>
                          <h3 className="text-xl font-black text-white">Zoom Meetings</h3>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
                          <Video className="w-7 h-7" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black text-blue-400 uppercase tracking-widest">Sala Oficial Claro</p>
                          <h3 className="text-xl font-black text-white">Microsoft Teams</h3>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                      Sesión Virtual en Vivo
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                      Haz clic a continuación para unirte a la reunión con el facilitador <strong className="text-slate-200">{event.instructor}</strong> y los demás participantes.
                    </p>
                  </div>

                  {/* Botón Primario de Lanzamiento a la Reunión */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    {meetingUrl ? (
                      <a
                        href={meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`w-full sm:w-auto px-7 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer ring-2 ${
                          meetingPlatform === 'zoom'
                            ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-sky-600/30 ring-sky-400/40'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-blue-600/30 ring-blue-400/40'
                        }`}
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Unirse a {meetingPlatform === 'zoom' ? 'Zoom' : 'Microsoft Teams'}</span>
                      </a>
                    ) : (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>El enlace de la reunión aún no ha sido asignado por el administrador.</span>
                      </div>
                    )}

                    {meetingPlatform === 'zoom' && effectiveMeetingId && (
                      <button
                        onClick={() => setZoomEmbedMode(true)}
                        className="w-full sm:w-auto px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Laptop className="w-4 h-4 text-sky-400" />
                        <span>Modo Visor Web</span>
                      </button>
                    )}
                  </div>

                  {/* Acciones Rápidas: Copiar Enlace y Datos */}
                  {meetingUrl && (
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleCopy(meetingUrl, 'link')}
                        className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
                      </button>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* Fila Inferior con Credenciales de Acceso */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">ID de Reunión</span>
                    <strong className="text-xs font-mono text-white">
                      {effectiveMeetingId || 'Integrado en el enlace'}
                    </strong>
                  </div>
                </div>
                {effectiveMeetingId && (
                  <button
                    onClick={() => handleCopy(effectiveMeetingId, 'id')}
                    title="Copiar ID de reunión"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Código de Acceso</span>
                    <strong className="text-xs font-mono text-white">
                      {effectiveMeetingPassword || 'No requiere clave'}
                    </strong>
                  </div>
                </div>
                {effectiveMeetingPassword && (
                  <button
                    onClick={() => handleCopy(effectiveMeetingPassword, 'password')}
                    title="Copiar contraseña de reunión"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Barra Lateral de Herramientas y Asistencia en Línea (1 Columna) */}
          <div className="p-4 sm:p-6 bg-slate-900 space-y-5 overflow-y-auto">
            
            {/* SECCIÓN 1: REGISTRO DE ASISTENCIA EN VIVO */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-800 to-slate-900 border-2 border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Asistencia en Línea
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-bold border border-emerald-500/40">
                  Virtual
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                Confirma tu presencia en esta sesión virtual con un solo clic para acreditar tus horas de formación.
              </p>

              {attendanceMessage && (
                <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  attendanceMessage.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  {attendanceMessage.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{attendanceMessage.text}</span>
                </div>
              )}

              {/* Botón de Entrada / Salida según estado */}
              {localAttendanceStatus === 'completed' ? (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center">
                  <p className="text-xs font-black text-emerald-300 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Asistencia Completa Registrada
                  </p>
                  <p className="text-[10px] text-emerald-400/80 mt-0.5">Tus horas han sido acreditadas en el sistema.</p>
                </div>
              ) : localAttendanceStatus === 'checked_in' ? (
                <div className="space-y-2">
                  <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Entrada confirmada. Recuerda registrar tu salida al concluir la clase.</span>
                  </div>

                  <button
                    onClick={() => handleRegisterOnlineAttendance('checkout')}
                    disabled={isMarkingAttendance}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isMarkingAttendance ? 'Registrando...' : 'Registrar Salida de la Clase'}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleRegisterOnlineAttendance('checkin')}
                  disabled={isMarkingAttendance}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-lg shadow-emerald-700/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>{isMarkingAttendance ? 'Registrando...' : '✓ Registrar Mi Asistencia (Check-In)'}</span>
                </button>
              )}
            </div>

            {/* SECCIÓN 2: EVALUACIÓN Y ENCUESTA FORMS */}
            {event.surveyUrl && (
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#DA291C]" />
                    Evaluación de la Sesión
                  </span>
                  <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md font-bold">
                    Forms
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Al finalizar la sesión, ingresa para diligenciar tu evaluación y encuesta de satisfacción.
                </p>
                <a
                  href={event.surveyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir Evaluación / Encuesta</span>
                </a>
              </div>
            )}

            {/* SECCIÓN 3: DETALLES DE LA CAPACITACIÓN */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                Detalles del Curso
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <User className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>Facilitador: <strong className="text-white">{event.instructor}</strong></span>
                </div>

                {activeSchedule && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <CalendarIcon className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>Fecha: <strong className="text-white">{formatDateLong(activeSchedule.date)}</strong></span>
                  </div>
                )}

                {activeSlot && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>Horario: <strong className="text-white">{activeSlot.time}{activeSlot.endTime ? ` - ${activeSlot.endTime}` : ''}</strong></span>
                  </div>
                )}

                {event.totalHours && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Duración: <strong className="text-amber-300">{event.totalHours} horas certificadas</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN 4: CONSEJOS PARA LA REUNIÓN */}
            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-[11px] text-slate-400 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-300">
                <Headphones className="w-3.5 h-3.5 text-sky-400" />
                <span>Recomendaciones Técnicas</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-1 text-[10px]">
                <li>Usa auriculares para evitar eco durante la sesión.</li>
                <li>Mantén tu micrófono silenciado al ingresar al aula.</li>
                <li>Puedes activar tu cámara para interactuar con el docente.</li>
              </ul>
            </div>

          </div>

        </div>

      </div>
    </AccessibleModal>
  );
};
