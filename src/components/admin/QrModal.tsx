import React, { useState } from 'react';
import { 
  X, 
  QrCode, 
  Printer, 
  Copy, 
  Check, 
  ExternalLink,
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  BookOpen,
  LogIn,
  LogOut,
  Sparkles,
  KeyRound
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { TrainingEvent } from '../../types';
import { formatDateLong } from '../../utils/formatters';
import { AccessibleModal } from '../common/AccessibleModal';

interface QrModalProps {
  event: TrainingEvent | null;
  onClose: () => void;
}

export const QrModal: React.FC<QrModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  const [activeMode, setActiveMode] = useState<'checkin' | 'checkout'>('checkin');
  const [selectedDate, setSelectedDate] = useState<string>(event.schedule[0]?.date || '');
  const [selectedTime, setSelectedTime] = useState<string>(event.schedule[0]?.slots[0]?.time || '');
  const [copied, setCopied] = useState(false);

  const currentSchedule = event.schedule.find(s => s.date === selectedDate);
  const currentSlot = currentSchedule?.slots.find(s => s.time === selectedTime) || currentSchedule?.slots[0];

  const currentDailyCode = activeMode === 'checkin' 
    ? (currentSlot?.checkinCode || '8421') 
    : (currentSlot?.checkoutCode || '9153');

  const attendanceUrl = `${window.location.origin}${window.location.pathname}?tab=attendance&event=${event.id}&date=${selectedDate}&time=${encodeURIComponent(selectedTime)}&type=${activeMode}&code=${currentDailyCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(attendanceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AccessibleModal
      onClose={onClose}
      ariaLabel="Código QR de Asistencia"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              activeMode === 'checkin' 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                : 'bg-red-50 text-[#DA291C] border-red-200'
            }`}>
              {activeMode === 'checkin' ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Control Diario de Asistencia
              </h2>
              <p className="text-xs text-slate-500">
                Códigos QR y PINs de aula para inicio y cierre de sesión
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Entrada vs Salida) */}
        <div className="p-3 bg-slate-100/80 border-b border-slate-200 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveMode('checkin')}
            className={`py-2.5 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMode === 'checkin'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-emerald-800 border border-slate-200'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>1. Código de ENTRADA (Inicio)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('checkout')}
            className={`py-2.5 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMode === 'checkout'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-red-800 border border-slate-200'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>2. Código de SALIDA (Cierre)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Date & Time Selectors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Selecciona Fecha y Horario de la Sesión:
              </label>
              {currentSlot?.endTime && (
                <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#DA291C]" />
                  <span>Duración: {currentSlot.time} - {currentSlot.endTime}</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {event.schedule.map(sch => (
                <button
                  key={sch.date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(sch.date);
                    setSelectedTime(sch.slots[0]?.time || '');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedDate === sch.date
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {formatDateLong(sch.date)}
                </button>
              ))}
            </div>

            {currentSchedule && (
              <div className="flex flex-wrap gap-2 pt-1">
                {currentSchedule.slots.map(sl => (
                  <button
                    key={sl.time}
                    type="button"
                    onClick={() => setSelectedTime(sl.time)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedTime === sl.time
                        ? activeMode === 'checkin'
                          ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                          : 'bg-red-50 border border-red-300 text-[#DA291C]'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{sl.time}{sl.endTime ? ` - ${sl.endTime}` : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Printable Badge Card */}
          <div 
            id="printable-qr-badge" 
            className={`p-6 rounded-3xl bg-white text-slate-900 shadow-xl text-center space-y-4 border-2 transition-all ${
              activeMode === 'checkin' ? 'border-emerald-500/80' : 'border-[#DA291C]/80'
            }`}
          >
            {/* Badge Mode Header */}
            <div className={`py-2 px-4 rounded-2xl flex items-center justify-between text-xs font-black ${
              activeMode === 'checkin' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-950'
            }`}>
              <div className="flex items-center gap-1.5 uppercase tracking-wider">
                {activeMode === 'checkin' ? <LogIn className="w-4 h-4 text-emerald-700" /> : <LogOut className="w-4 h-4 text-[#DA291C]" />}
                <span>{activeMode === 'checkin' ? 'Registro de ENTRADA (Inicio)' : 'Registro de SALIDA (Cierre)'}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white font-mono shadow-xs">
                OFICIAL
              </span>
            </div>

            <div className="border-b border-slate-200 pb-3">
              <span className="text-[10px] font-black tracking-widest text-[#DA291C] uppercase">
                CapacitaHub • Control Presencial
              </span>
              <h3 className="text-base font-black text-slate-900 mt-1 leading-snug">
                {event.title}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">Facilitador: {event.instructor}</p>
            </div>

            {/* QR Code Container */}
            <div className="p-3 bg-white inline-block rounded-2xl border border-slate-200 shadow-xs">
              <QRCodeSVG
                value={attendanceUrl}
                size={190}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* PIN Code Box for Classroom Projection */}
            <div className={`p-4 rounded-2xl border space-y-1.5 ${
              activeMode === 'checkin' 
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                : 'bg-red-50/70 border-red-200 text-red-950'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1">
                <KeyRound className="w-3 h-3 text-slate-600" />
                Código PIN Diario ({activeMode === 'checkin' ? 'Entrada' : 'Salida'}):
              </span>
              <div className="text-3xl font-mono font-black tracking-widest text-slate-900 bg-white py-1.5 px-4 rounded-xl border border-slate-200 inline-block shadow-xs">
                {currentDailyCode}
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Si no puedes escanear con tu cámara, digita este código de 4 dígitos en tu pantalla de asistencia.
              </p>
            </div>

            {/* Session Info */}
            <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900">{formatDateLong(selectedDate)}</p>
              <p className="text-[#DA291C] font-black text-sm">
                {selectedTime}{currentSlot?.endTime ? ` - ${currentSlot.endTime}` : ''}
              </p>
              <p className="text-[11px] text-slate-500 font-semibold">{event.location}</p>
            </div>

            {activeMode === 'checkin' ? (
              <p className="text-[10px] text-emerald-800 font-bold">
                ⚠️ Recuerda que al finalizar la sesión deberás registrar tu salida para completar tu asistencia y acceder a la evaluación del facilitador.
              </p>
            ) : (
              <p className="text-[10px] text-red-800 font-bold">
                ⭐ Al registrar tu salida se habilitará automáticamente la Encuesta de Satisfacción TEC.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 border border-slate-300 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '¡Enlace Copiado!' : `Copiar Enlace (${activeMode === 'checkin' ? 'Entrada' : 'Salida'})`}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className={`flex-1 py-2.5 px-4 rounded-2xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                activeMode === 'checkin'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                  : 'bg-[#DA291C] hover:bg-red-700 shadow-red-500/25'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Cartel ({activeMode === 'checkin' ? 'Entrada' : 'Salida'})</span>
            </button>
          </div>

        </div>

      </div>
    </AccessibleModal>
  );
};
