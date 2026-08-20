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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Centro de Notificaciones & Alertas</h2>
              <p className="text-xs text-slate-400">Emisión de recordatorios a inscritos</p>
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
          
          {/* Target Event Info */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase">Capacitación</span>
              <p className="text-xs font-bold text-white mt-0.5">{event.title}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400">Destinatarios</span>
              <p className="text-xs font-bold text-cyan-300 flex items-center gap-1 justify-end">
                <Users className="w-3.5 h-3.5" />
                <span>{totalRecipients} colaboradores</span>
              </p>
            </div>
          </div>

          {/* Channel Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">Canal de Envío:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setChannel('Email')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  channel === 'Email'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Correo Corporativo (Email)</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('Teams')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  channel === 'Teams'
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 ring-1 ring-cyan-400'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>Microsoft Teams</span>
              </button>
            </div>
          </div>

          {/* Template Message Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">Mensaje Personalizado:</label>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span>Variables:</span>
                <button
                  type="button"
                  onClick={() => setMessage(prev => `${prev} [EVENT_TITLE]`)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300"
                >
                  [EVENT_TITLE]
                </button>
                <button
                  type="button"
                  onClick={() => setMessage(prev => `${prev} [INSTRUCTOR]`)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300"
                >
                  [INSTRUCTOR]
                </button>
                <button
                  type="button"
                  onClick={() => setMessage(prev => `${prev} [SURVEY_LINK]`)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300"
                >
                  [SURVEY_LINK]
                </button>
              </div>
            </div>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Live Preview */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/80 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Vista Previa en Tiempo Real:
            </span>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 leading-relaxed italic">
              "{processedMessage}"
            </div>
          </div>

          {/* Notification History Log */}
          {(event.notificationHistory || []).length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <History className="w-3.5 h-3.5" />
                Historial de Envíos Anteriores:
              </span>
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {event.notificationHistory?.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 text-[11px] text-slate-400">
                    <span>{h.date} • Canal: {h.channel}</span>
                    <span className="text-emerald-400 font-semibold">{h.recipients} destinatarios ({h.status})</span>
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
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
    </div>
  );
};
