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
  BookOpen
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { TrainingEvent } from '../../types';
import { formatDateLong } from '../../utils/formatters';

interface QrModalProps {
  event: TrainingEvent | null;
  onClose: () => void;
}

export const QrModal: React.FC<QrModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  const [selectedDate, setSelectedDate] = useState<string>(event.schedule[0]?.date || '');
  const [selectedTime, setSelectedTime] = useState<string>(event.schedule[0]?.slots[0]?.time || '');
  const [copied, setCopied] = useState(false);

  const currentSchedule = event.schedule.find(s => s.date === selectedDate);

  const attendanceUrl = `${window.location.origin}${window.location.pathname}?tab=attendance&event=${event.id}&date=${selectedDate}&time=${encodeURIComponent(selectedTime)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(attendanceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Código QR de Asistencia</h2>
              <p className="text-xs text-slate-400">Para carteles en sala o escaneo móvil</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Date & Time Selectors */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Selecciona Fecha y Horario a Imprimir:
            </label>
            <div className="flex flex-wrap gap-2">
              {event.schedule.map(sch => (
                <button
                  key={sch.date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(sch.date);
                    setSelectedTime(sch.slots[0]?.time || '');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedDate === sch.date
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
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
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                      selectedTime === sl.time
                        ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold'
                        : 'bg-slate-950 border border-slate-800 text-slate-400'
                    }`}
                  >
                    {sl.time}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Printable Badge Card */}
          <div id="printable-qr-badge" className="p-6 rounded-3xl bg-white text-slate-900 shadow-2xl text-center space-y-4 border border-slate-200">
            <div className="border-b border-slate-200 pb-3">
              <span className="text-[10px] font-black tracking-widest text-indigo-600 uppercase">
                CapacitaHub • Control de Asistencia
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-1 leading-snug">
                {event.title}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">Facilitador: {event.instructor}</p>
            </div>

            <div className="p-3 bg-white inline-block rounded-2xl">
              <QRCodeSVG
                value={attendanceUrl}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900">{formatDateLong(selectedDate)}</p>
              <p className="text-indigo-600 font-bold text-sm">{selectedTime}</p>
              <p className="text-[11px] text-slate-500">{event.location}</p>
            </div>

            <p className="text-[10px] text-slate-500 font-medium">
              Abre la cámara de tu smartphone y escanea este código para confirmar tu asistencia al instante.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-800 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Cartel</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
