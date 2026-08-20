import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  FileText,
  Clock,
  Eye
} from 'lucide-react';
import { 
  TrainingProgram, 
  ProgramComplianceSummary, 
  TrainingEvent 
} from '../../types';
import { formatDateLong } from '../../utils/formatters';

interface ComplianceReminderModalProps {
  program: TrainingProgram;
  complianceSummary: ProgramComplianceSummary;
  events: TrainingEvent[];
  isOpen: boolean;
  onClose: () => void;
  onSendNotification?: (eventId: string, channel: 'Email' | 'Teams' | 'WhatsApp', message: string, recipients: number) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

type RecipientFilter = 'overdue' | 'in_progress' | 'all_incomplete';
type NotificationChannel = 'Email' | 'Teams' | 'WhatsApp';

export const ComplianceReminderModal: React.FC<ComplianceReminderModalProps> = ({
  program,
  complianceSummary,
  events,
  isOpen,
  onClose,
  onSendNotification,
  onShowToast
}) => {
  const [channel, setChannel] = useState<NotificationChannel>('Email');
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>('all_incomplete');
  const [customMessage, setCustomMessage] = useState<string>(
    `Hola [NOMBRE_COLABORADOR], te recordamos que tienes capacitaciones pendientes en tu plan formativo institucional '[TITULO_CRONOGRAMA]'.\n\nTe restan [CURSOS_PENDIENTES] curso(s) obligatorios por acreditar antes de la fecha límite: [FECHA_LIMITE].\n\nPor favor ingresa a CapacitaHub para agendar tus cupos en las sesiones disponibles.`
  );
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  // Filtrar destinatarios según el scope seleccionado
  const targetParticipants = complianceSummary.participants.filter(p => {
    if (p.percentage >= 100) return false;
    if (recipientFilter === 'overdue') return p.status === 'overdue';
    if (recipientFilter === 'in_progress') return p.status === 'in_progress';
    return true; // all_incomplete
  });

  // Generar vista previa con el primer destinatario
  const sampleParticipant = targetParticipants[0] || {
    participantName: 'Juan Pérez',
    participantEmail: 'juan.perez@empresa.com',
    mandatoryEventsCount: 3,
    mandatoryCompletedCount: 1
  };

  const pendingCount = sampleParticipant.mandatoryEventsCount - sampleParticipant.mandatoryCompletedCount;
  const deadlineStr = formatDateLong(program.endDate);

  const previewMessage = customMessage
    .replace(/\[NOMBRE_COLABORADOR\]/g, sampleParticipant.participantName)
    .replace(/\[TITULO_CRONOGRAMA\]/g, program.title)
    .replace(/\[CURSOS_PENDIENTES\]/g, `${Math.max(pendingCount, 1)}`)
    .replace(/\[FECHA_LIMITE\]/g, deadlineStr);

  const handleSend = async () => {
    if (targetParticipants.length === 0) {
      onShowToast('Sin destinatarios', 'No hay colaboradores que coincidan con el filtro seleccionado.', 'error');
      return;
    }

    setIsSending(true);
    try {
      if (onSendNotification && program.eventItems.length > 0) {
        // Enviar notificación asociada al primer evento del cronograma o a nivel de sistema
        const targetEventId = program.eventItems[0].eventId;
        await onSendNotification(targetEventId, channel, customMessage, targetParticipants.length);
      }

      onShowToast(
        'Recordatorio enviado',
        `Se han despachado ${targetParticipants.length} alertas vía ${channel} con éxito.`,
        'success'
      );
      onClose();
    } catch (err) {
      onShowToast('Error al enviar', 'No se pudo completar el despacho de notificaciones.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Despacho de Recordatorios de Cumplimiento</h3>
              <p className="text-xs text-slate-400">
                Programa: <strong className="text-slate-200">{program.title}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Scope Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            1. Selecciona el Segmento de Colaboradores:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            
            <button
              type="button"
              onClick={() => setRecipientFilter('all_incomplete')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                recipientFilter === 'all_incomplete'
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Users className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                  {complianceSummary.participants.filter(p => p.percentage < 100).length}
                </span>
              </div>
              <p className="text-xs font-bold">Todos los Incompletos</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Avance menor al 100%</p>
            </button>

            <button
              type="button"
              onClick={() => setRecipientFilter('in_progress')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                recipientFilter === 'in_progress'
                  ? 'bg-amber-600/20 border-amber-500/50 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  {complianceSummary.inProgressCount}
                </span>
              </div>
              <p className="text-xs font-bold">En Progreso</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Con avance parcial</p>
            </button>

            <button
              type="button"
              onClick={() => setRecipientFilter('overdue')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                recipientFilter === 'overdue'
                  ? 'bg-rose-600/20 border-rose-500/50 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                  {complianceSummary.overdueCount}
                </span>
              </div>
              <p className="text-xs font-bold">Atrasados / Vencidos</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Fecha límite excedida</p>
            </button>

          </div>
        </div>

        {/* Channel Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            2. Canal de Comunicación:
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            
            <button
              type="button"
              onClick={() => setChannel('Email')}
              className={`p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                channel === 'Email'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Correo Corporativo</span>
            </button>

            <button
              type="button"
              onClick={() => setChannel('Teams')}
              className={`p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                channel === 'Teams'
                  ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/20'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Microsoft Teams</span>
            </button>

            <button
              type="button"
              onClick={() => setChannel('WhatsApp')}
              className={`p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                channel === 'WhatsApp'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>WhatsApp Directo</span>
            </button>

          </div>
        </div>

        {/* Message Editor & Variables */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">
              3. Mensaje Personalizado & Variables Dinámicas:
            </label>
          </div>

          <textarea
            rows={4}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
            placeholder="Redacta el mensaje del recordatorio..."
          />

          <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400">
            <span>Variables admitidas:</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono">[NOMBRE_COLABORADOR]</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono">[TITULO_CRONOGRAMA]</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono">[CURSOS_PENDIENTES]</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono">[FECHA_LIMITE]</span>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              Vista Previa Dinámica (Ejemplo: {sampleParticipant.participantName})
            </span>
            <span className="text-[11px] text-indigo-400 font-normal">Canal: {channel}</span>
          </div>
          <p className="text-xs text-slate-300 whitespace-pre-line bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed font-sans">
            {previewMessage}
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <span className="text-xs text-slate-400 font-semibold">
            Destinatarios a notificar: <strong className="text-white">{targetParticipants.length} colaboradores</strong>
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={isSending || targetParticipants.length === 0}
              onClick={handleSend}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 hover:scale-105 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'Despachando...' : `Enviar a ${targetParticipants.length} Colaboradores`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
