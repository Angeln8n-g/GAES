import React, { useState } from 'react';
import { 
  X, 
  KeyRound, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  User,
  GraduationCap,
  RefreshCw
} from 'lucide-react';
import { TechnicalAcademyHistoryRecord, UserAccount, Participant } from '../../types';
import { apiService } from '../../services/api';
import { formatDateShort } from '../../utils/formatters';

interface TechnicalPinCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  training: TechnicalAcademyHistoryRecord | null;
  currentUser: UserAccount | null;
  currentParticipant?: Participant | null;
  onSuccess: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const TechnicalPinCheckinModal: React.FC<TechnicalPinCheckinModalProps> = ({
  isOpen,
  onClose,
  training,
  currentUser,
  currentParticipant,
  onSuccess,
  onShowToast
}) => {
  if (!isOpen || !training) return null;

  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const participantCard = currentParticipant?.card || currentUser?.cedula || '';
  const participantIdentifier = participantCard || currentUser?.email || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMessage('Por favor ingresa el código o PIN proyectado.');
      return;
    }

    if (!participantIdentifier) {
      setErrorMessage('No se encontró carnet ni cédula del colaborador.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await apiService.checkInTechnicalQr(training.cohortId, {
        identifier: participantIdentifier,
        pin: pin.trim(),
        sessionDate: todayStr
      });

      setSuccessMessage(res.message || '¡Asistencia confirmada para hoy!');
      onShowToast('¡Asistencia Confirmada!', `Has registrado tu asistencia para ${training.title}`, 'success');
      onSuccess();

      // Cerrar modal automáticamente tras 1.2 segundos para feedback visual
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Error al registrar asistencia por PIN:', err);
      const msg = err.message || 'Error al validar el código. Verifica el número proyectado en sala.';
      setErrorMessage(msg);
      onShowToast('Código Inválido', msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Cabecera del Modal */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400">
                <Sparkles className="w-3 h-3" />
                <span>Academia Técnica</span>
              </div>
              <h3 className="text-base font-black tracking-tight text-white">
                Registro de Asistencia Diaria
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Tarjeta de Información del Entrenamiento */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-900 line-clamp-1">
                {training.title}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                {training.groupName || 'Cohorte General'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-red-500" />
                Hoy: {formatDateShort(todayStr)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                {training.time}
              </span>
              {training.facilitatorName && (
                <>
                  <span>•</span>
                  <span>Facilitador: <strong>{training.facilitatorName}</strong></span>
                </>
              )}
            </div>
          </div>

          {/* Tarjeta de Identificación del Participante */}
          <div className="p-3 bg-red-50/50 border border-red-100 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#DA291C] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              <User className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-900">
                {currentParticipant?.name || currentUser?.name}
              </p>
              <p className="text-[11px] text-slate-500">
                Carnet: <strong className="font-mono text-slate-700">{participantCard || 'Sin carnet'}</strong>
              </p>
            </div>
          </div>

          {/* Campo de Ingreso de PIN */}
          <div className="space-y-2 text-center">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
              Código / PIN Proyectado en Pantalla
            </label>
            <p className="text-[11px] text-slate-500">
              Ingresa el número de 4 dígitos que tu facilitador tiene proyectado en la sala.
            </p>

            <div className="pt-1">
              <input
                type="text"
                autoFocus
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.toUpperCase());
                  setErrorMessage(null);
                }}
                placeholder="••••"
                className="w-full text-center font-mono text-3xl font-black tracking-widest py-3 px-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:border-[#DA291C] focus:ring-4 focus:ring-red-500/10 transition-all"
              />
            </div>
          </div>

          {/* Mensajes de Feedback */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-bold">{successMessage}</span>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || Boolean(successMessage)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#DA291C] to-red-600 hover:from-[#c22418] hover:to-red-700 text-white text-xs font-bold transition-all shadow-md shadow-red-500/25 cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Asistencia</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
