import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Bell, 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Users, 
  History,
  Link as LinkIcon
} from 'lucide-react';
import { TrainingEvent } from '../../types';
import { AccessibleModal } from '../common/AccessibleModal';

interface NotificationModalProps {
  event: TrainingEvent | null;
  onClose: () => void;
  onSendNotification: (eventId: string, channel: 'Email' | 'Teams', message: string, recipients: number) => Promise<void>;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  event,
  onClose,
  onSendNotification
}) => {
  if (!event) return null;

  // Contar total de destinatarios
  let totalRecipients = 0;
  const uniqueEmails = new Set<string>();
  event.schedule.forEach(sch => {
    sch.slots.forEach(slot => {
      slot.attendees.forEach(email => uniqueEmails.add(email.toLowerCase()));
    });
  });
  totalRecipients = uniqueEmails.size;

  const [channel, setChannel] = useState<'Email' | 'Teams'>('Email');
  const [message, setMessage] = useState(
    event.notificationSettings?.customMessage ||
    "Estimado colaborador, te recordamos tu participación en el evento '[EVENT_TITLE]' con [INSTRUCTOR]. ¡Te esperamos!"
  );
  const [isSending, setIsSending] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Mensaje procesado con variables
  const processedMessage = message
    .replace(/\[EVENT_TITLE\]/g, event.title)
    .replace(/\[INSTRUCTOR\]/g, event.instructor)
    .replace(/\[SURVEY_LINK\]/g, event.surveyUrl || '[Sin enlace de encuesta]');

  const handleSend = async () => {
    if (!message.trim() || totalRecipients === 0) return;

    try {
      setIsSending(true);
      await onSendNotification(event.id, channel, message, totalRecipients);
      setSuccessToast(true);
      setTimeout(() => {
        setSuccessToast(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AccessibleModal
      onClose={onClose}
      ariaLabel="Despacho de Recordatorio de Capacitación"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-50 text-[#DA291C] border border-red-200">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Centro de Notificaciones & Alertas</h2>
              <p className="text-xs text-slate-500">Emisión de recordatorios a inscritos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar centro de notificaciones"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Target Event Info */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-[#DA291C] uppercase">Capacitación</span>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{event.title}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-semibold">Destinatarios</span>
              <p className="text-xs font-black text-slate-800 flex items-center gap-1 justify-end">
                <Users className="w-3.5 h-3.5 text-[#DA291C]" aria-hidden="true" />
                <span>{totalRecipients} colaboradores</span>
              </p>
            </div>
          </div>

          {/* Channel Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Canal de Envío:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={channel === 'Email'}
                onClick={() => setChannel('Email')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  channel === 'Email'
                    ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25 border-[#DA291C]'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Mail className="w-4 h-4" aria-hidden="true" />
                <span>Correo Corporativo (Email)</span>
              </button>

              <button
                type="button"
                aria-pressed={channel === 'Teams'}
                onClick={() => setChannel('Teams')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  channel === 'Teams'
                    ? 'bg-cyan-700 text-white shadow-md shadow-cyan-700/25 border-cyan-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Bell className="w-4 h-4" aria-hidden="true" />
                <span>Microsoft Teams</span>
              </button>
            </div>
          </div>

          {/* Template Message Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="notification-message" className="block text-xs font-bold text-slate-700">Mensaje Personalizado:</label>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                <span>Variables:</span>
                <button
                  type="button"
                  aria-label="Insertar variable título del evento"
                  onClick={() => setMessage(prev => `${prev} [EVENT_TITLE]`)}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[#DA291C] font-bold cursor-pointer"
                >
                  [EVENT_TITLE]
                </button>
                <button
                  type="button"
                  aria-label="Insertar variable instructor"
                  onClick={() => setMessage(prev => `${prev} [INSTRUCTOR]`)}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[#DA291C] font-bold cursor-pointer"
                >
                  [INSTRUCTOR]
                </button>
                <button
                  type="button"
                  aria-label="Insertar variable enlace de encuesta"
                  onClick={() => setMessage(prev => `${prev} [SURVEY_LINK]`)}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[#DA291C] font-bold cursor-pointer"
                >
                  [SURVEY_LINK]
                </button>
              </div>
            </div>
            <textarea
              id="notification-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
            />
          </div>

          {/* Live Preview */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#DA291C]" />
              Vista Previa en Tiempo Real:
            </span>
            <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 leading-relaxed italic shadow-xs">
              "{processedMessage}"
            </div>
          </div>

          {/* Notification History Log */}
          {(event.notificationHistory || []).length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-slate-500" />
                Historial de Envíos Anteriores:
              </span>
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {event.notificationHistory?.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-[11px] text-slate-600 border border-slate-200">
                    <span>{h.date} • Canal: {h.channel}</span>
                    <span className="text-emerald-700 font-bold">{h.recipients} destinatarios ({h.status})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || totalRecipients === 0}
            className="w-full py-3.5 rounded-2xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-extrabold shadow-md shadow-red-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSending ? (
              <span>Enviando difusión...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Emitir Recordatorio a {totalRecipients} Colaboradores</span>
              </>
            )}
          </button>

        </div>

      </div>
    </AccessibleModal>
  );
};
