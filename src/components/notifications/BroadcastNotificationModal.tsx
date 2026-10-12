import React, { useState } from 'react';
import { 
  X, 
  Megaphone, 
  Send, 
  Users, 
  Building2, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';
import { 
  NotificationCategory, 
  NotificationPriority, 
  Company, 
  BroadcastNotificationPayload 
} from '../../types';
import { apiService } from '../../services/api';

interface BroadcastNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies?: Company[];
  onBroadcastSent?: () => void;
}

export const BroadcastNotificationModal: React.FC<BroadcastNotificationModalProps> = ({
  isOpen,
  onClose,
  companies = [],
  onBroadcastSent
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<NotificationCategory>('sistema');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [targetType, setTargetType] = useState<'all' | 'role' | 'company'>('all');
  const [targetRole, setTargetRole] = useState('Participante');
  const [targetCompanyId, setTargetCompanyId] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [actionLabel, setActionLabel] = useState('');
  
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setStatusMessage({ text: 'Por favor completa el título y el mensaje.', type: 'error' });
      return;
    }

    try {
      setSending(true);
      setStatusMessage(null);

      const payload: BroadcastNotificationPayload = {
        title: title.trim(),
        message: message.trim(),
        category,
        priority,
        actionUrl: actionUrl.trim() || undefined,
        actionLabel: actionLabel.trim() || undefined
      };

      if (targetType === 'role') {
        payload.targetRole = targetRole;
      } else if (targetType === 'company') {
        payload.targetCompanyId = targetCompanyId || undefined;
      }

      await apiService.broadcastNotification(payload);

      setStatusMessage({ text: '¡Comunicado masivo emitido exitosamente a los destinatarios!', type: 'success' });
      if (onBroadcastSent) onBroadcastSent();

      setTimeout(() => {
        setTitle('');
        setMessage('');
        setActionUrl('');
        setActionLabel('');
        setStatusMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Error al emitir comunicado:', err);
      setStatusMessage({ text: err.message || 'Error al emitir el comunicado.', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Encabezado */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Emitir Comunicado Masivo
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Envía notificaciones simultáneas (In-App, Push y WebSockets)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-sm">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 text-xs font-medium ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Destinatarios */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Destinatarios de la Notificación
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('all')}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all text-center ${
                  targetType === 'all'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Toda la Plataforma
              </button>
              <button
                type="button"
                onClick={() => setTargetType('role')}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all text-center ${
                  targetType === 'role'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Por Rol
              </button>
              <button
                type="button"
                onClick={() => setTargetType('company')}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all text-center ${
                  targetType === 'company'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Por Empresa
              </button>
            </div>

            {targetType === 'role' && (
              <div className="mt-2">
                <select
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="Participante">Participante</option>
                  <option value="Instructor">Instructor</option>
                  <option value="Evaluador">Evaluador</option>
                  <option value="Líder de Equipo / Supervisor">Líder de Equipo / Supervisor</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
            )}

            {targetType === 'company' && (
              <div className="mt-2">
                <select
                  value={targetCompanyId}
                  onChange={e => setTargetCompanyId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="">Selecciona una Empresa...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Categoría y Prioridad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Categoría
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as NotificationCategory)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              >
                <option value="sistema">Sistema / General</option>
                <option value="convocatoria">Convocatoria</option>
                <option value="cohorte">Academia Técnica</option>
                <option value="evento">Evento General</option>
                <option value="certificado">Certificado</option>
                <option value="cumplimiento">Cumplimiento</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nivel de Prioridad
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as NotificationPriority)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="low">Baja</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente (Notificación inmediata)</option>
              </select>
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Título del Comunicado *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Convocatoria abierta para Redes de Fibra Óptica 2026"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Mensaje */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Cuerpo del Mensaje *
            </label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Escribe el mensaje detallado que recibirán los colaboradores..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
            />
          </div>

          {/* Acción Opcional */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-700/60">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                URL o Ruta de Acción (Opcional)
              </label>
              <input
                type="text"
                value={actionUrl}
                onChange={e => setActionUrl(e.target.value)}
                placeholder="/convocatorias o https://..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Texto del Botón (Opcional)
              </label>
              <input
                type="text"
                value={actionLabel}
                onChange={e => setActionLabel(e.target.value)}
                placeholder="Ej: Ver Convocatoria"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={sending}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-600/20 disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-all"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{sending ? 'Emitiendo comunicado...' : 'Transmitir Notificación Masiva'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
