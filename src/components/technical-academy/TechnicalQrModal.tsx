import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Calendar, 
  Clock, 
  UserCheck, 
  Users, 
  Maximize2,
  Minimize2,
  Sparkles
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { TechnicalAcademyCohort } from '../../types';
import { apiService } from '../../services/api';
import { attendanceWs } from '../../services/websocket';

interface TechnicalQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  cohort: TechnicalAcademyCohort | null;
  onCheckInSuccess?: () => void;
}

export const TechnicalQrModal: React.FC<TechnicalQrModalProps> = ({
  isOpen,
  onClose,
  cohort,
  onCheckInSuccess
}) => {
  if (!isOpen || !cohort) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const [sessionDate, setSessionDate] = useState<string>(todayStr);
  const [identifier, setIdentifier] = useState('');
  const [pinInput, setPinInput] = useState(cohort.dailyPin || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [liveCheckIns, setLiveCheckIns] = useState<Array<{
    card: string;
    name: string;
    method: string;
    timestamp: string;
  }>>([]);

  // Payload for QR scan
  const qrPayload = JSON.stringify({
    type: 'technical_academy_attendance',
    cohortId: cohort.id,
    date: sessionDate,
    pin: cohort.dailyPin
  });

  const handleCopyPin = () => {
    if (!cohort.dailyPin) return;
    navigator.clipboard.writeText(cohort.dailyPin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  // Sincronización en vivo vía WebSockets para escaneos y marcados
  useEffect(() => {
    if (!isOpen || !cohort) return;

    const unsubscribe = attendanceWs.onAttendanceEvent((evt) => {
      if (!evt || evt.cohortId !== cohort.id) return;

      if (evt.type === 'TECHNICAL_QR_CHECKIN' || evt.type === 'TECHNICAL_ATTENDANCE_MARKED') {
        if (evt.participantName || evt.participantCard) {
          const newEntry = {
            card: evt.participantCard || '',
            name: evt.participantName || 'Colaborador',
            method: evt.method === 'pin' ? 'PIN Diario' : (evt.method === 'qr_scan' ? 'Código QR' : 'Manual'),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };
          setLiveCheckIns(prev => [newEntry, ...prev.filter(p => p.card !== newEntry.card)].slice(0, 15));
        }
        if (onCheckInSuccess) {
          onCheckInSuccess();
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, cohort?.id, onCheckInSuccess]);

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await apiService.checkInTechnicalQr(cohort.id, {
        identifier: identifier.trim(),
        pin: pinInput.trim() || cohort.dailyPin,
        sessionDate
      });

      setFeedback({
        success: true,
        message: res.message || `¡Asistencia confirmada para ${res.participant?.name}!`
      });

      if (res.participant) {
        const manualEntry = {
          card: res.participant.card || identifier.trim(),
          name: res.participant.name || 'Colaborador',
          method: 'Carnet / Cédula',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        setLiveCheckIns(prev => [manualEntry, ...prev.filter(p => p.card !== manualEntry.card)].slice(0, 15));
      }

      setIdentifier('');
      if (onCheckInSuccess) {
        onCheckInSuccess();
      }
    } catch (err: any) {
      setFeedback({
        success: false,
        message: err.message || 'Error al validar colaborador o PIN diario'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 ${
          isFullscreen 
            ? 'w-full h-full max-w-none rounded-none' 
            : 'w-full max-w-3xl max-h-[92vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/90 text-white shadow-md shadow-red-600/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30">
                  Auto-Registro Diario
                </span>
                <span className="text-xs text-slate-400">Semana {cohort.weekNumber || 'N/A'} • {cohort.year}</span>
              </div>
              <h2 className="text-base font-bold text-white truncate max-w-md">
                {cohort.courseTitle || 'Taller Técnico Recurrente'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Modo proyector (Pantalla completa)'}
              aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Modo proyector'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Metadata bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Facilitador</span>
              <span className="font-semibold text-slate-800 truncate block">{cohort.facilitatorName || 'Sin asignar'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Grupo Técnico</span>
              <span className="font-semibold text-slate-800 truncate block">{cohort.groupName || 'Abierto'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Horario Diario</span>
              <span className="font-semibold text-slate-800 truncate block">{cohort.dailyTime}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Fecha de Sesión</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="font-semibold text-slate-800 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left: QR Display */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200/90 mb-3">
                <QRCodeSVG
                  value={qrPayload}
                  size={isFullscreen ? 260 : 190}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs font-semibold text-slate-700 mt-1">
                Escanear con lector o cámara móvil
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Registra la asistencia automáticamente asociando carnet y fecha actual.
              </p>
            </div>

            {/* Right: PIN & Rapid Check-in */}
            <div className="space-y-5">
              {/* Daily PIN card */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50/50 border border-red-200/80 rounded-2xl p-5 text-center relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-red-700 font-bold uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-red-600" />
                    PIN de Sesión Diaria
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPin}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-white/80 border border-red-200 text-red-700 hover:bg-white transition-colors"
                  >
                    {copiedPin ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPin ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <div className="font-mono text-4xl font-extrabold tracking-widest text-slate-900 my-1">
                  {cohort.dailyPin || '----'}
                </div>
                <p className="text-[11px] text-slate-600">
                  El facilitador puede dictar este PIN o proyectarlo en pantalla.
                </p>
              </div>

              {/* Instant Check-in Form */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-2">
                  <UserCheck className="w-4 h-4 text-red-600" />
                  Marcado Rápido por Carnet / Cédula
                </h4>
                <form onSubmit={handleManualCheckIn} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Carnet (ej. 2010) o Cédula..."
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-900 bg-white"
                      disabled={isSubmitting}
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || !identifier.trim()}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      {isSubmitting ? 'Marcando...' : 'Marcar'}
                    </button>
                  </div>
                </form>

                {/* Feedback message */}
                {feedback && (
                  <div
                    className={`mt-3 p-3 rounded-xl text-xs flex items-start gap-2 border animate-in fade-in duration-200 ${
                      feedback.success
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-red-50 text-red-800 border-red-200'
                    }`}
                  >
                    {feedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <span className="font-medium">{feedback.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Transmisión en Vivo de Asistencias (WebSockets) */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Asistencia en Vivo (WebSockets)
                </h4>
                {liveCheckIns.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                    {liveCheckIns.length} registrado{liveCheckIns.length !== 1 ? 's' : ''} en esta sesión
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Sincronización instantánea en pantalla
              </span>
            </div>

            {liveCheckIns.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400 italic bg-white/60 rounded-xl border border-dashed border-slate-200">
                Esperando escaneos de código QR o ingresos con PIN diario...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {liveCheckIns.map((item, idx) => (
                  <div
                    key={`${item.card}-${idx}`}
                    className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400">Carnet: {item.card}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600">
                        {item.method}
                      </span>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">{item.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-red-600" />
            <span>Los marcados por QR/PIN impactan en tiempo real la matriz de asistencia.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
