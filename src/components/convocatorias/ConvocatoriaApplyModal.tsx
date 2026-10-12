import React, { useState, useMemo } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  Calendar, 
  Clock, 
  MapPin, 
  AlertCircle, 
  Building2, 
  User, 
  UserCheck,
  CheckCircle2, 
  Info 
} from 'lucide-react';
import { Convocatoria, Participant, UserAccount } from '../../types';
import { apiService } from '../../services/api';
import { AccessibleModal } from '../common/AccessibleModal';

interface ConvocatoriaApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  convocatoria: Convocatoria | null;
  currentUser: UserAccount | null;
  participant?: Participant | null;
  nominateCard?: string;
  participants?: Participant[];
  onSuccess: () => void;
}

export const ConvocatoriaApplyModal: React.FC<ConvocatoriaApplyModalProps> = ({
  isOpen,
  onClose,
  convocatoria,
  currentUser,
  participant,
  nominateCard,
  participants = [],
  onSuccess
}) => {
  if (!isOpen || !convocatoria) return null;

  const isSuperAdmin = currentUser?.role === 'Super Administrador';
  const isAdminOrSupervisor = currentUser?.role === 'Líder de Área / Supervisor' || 
    currentUser?.role === 'Administrador / Editor' || 
    isSuperAdmin;

  const canNominate = isAdminOrSupervisor && convocatoria.allowSupervisorNomination !== false;
  const canSelfApply = convocatoria.allowSelfApplication !== false && Boolean(participant?.card);

  // Determinar modo inicial
  const initialMode = (): 'self' | 'nominate' => {
    if (nominateCard && nominateCard !== 'select_team') return 'nominate';
    if (nominateCard === 'select_team') return 'nominate';
    if (!canSelfApply && canNominate) return 'nominate';
    return 'self';
  };

  const [applyMode, setApplyMode] = useState<'self' | 'nominate'>(initialMode);
  const [selectedNomineeCard, setSelectedNomineeCard] = useState<string>(() => {
    if (nominateCard && nominateCard !== 'select_team') return nominateCard;
    return '';
  });
  const [motivation, setMotivation] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtrar colaboradores seleccionables para nominación
  const availableCandidates = useMemo(() => {
    if (!participants || participants.length === 0) return [];
    if (isSuperAdmin) return participants;
    const userCompanyId = currentUser?.companyId || 'emp_kasino';
    return participants.filter(p => p.companyId === userCompanyId);
  }, [participants, isSuperAdmin, currentUser]);

  // Participante efectivo según el modo
  const selectedNominee = availableCandidates.find(p => p.card === selectedNomineeCard);
  const effectiveParticipant = applyMode === 'nominate' ? selectedNominee : participant;

  // Determinar empresa y cupo de la convocatoria
  const effectiveCompanyId = effectiveParticipant?.companyId || currentUser?.companyId || 'emp_kasino';
  const companyQuota = convocatoria.companyQuotas?.find(q => q.companyId === effectiveCompanyId);
  const availableSlots = companyQuota 
    ? companyQuota.availableQuota ?? (companyQuota.allocatedQuota - (companyQuota.approvedApplications || 0)) 
    : null;
  const isWaitlistExpected = availableSlots !== null && availableSlots <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const targetCard = applyMode === 'nominate' ? selectedNomineeCard : participant?.card;

    if (!targetCard) {
      setErrorMsg(
        applyMode === 'nominate'
          ? 'Por favor selecciona al colaborador que deseas nominar.'
          : 'No se encontró tu ficha de participante activa.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await apiService.applyToConvocatoria(convocatoria.id, {
        participantCard: targetCard,
        motivation: motivation.trim() || undefined
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error al enviar postulación a convocatoria:', err);
      setErrorMsg(err.message || 'Error al enviar la postulación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Postulación a Convocatoria"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#DA291C] text-white shadow-md shadow-red-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase bg-red-500/20 text-red-300 px-2.5 py-0.5 rounded-full border border-red-500/30">
                {convocatoria.code}
              </span>
              <h2 className="text-base font-bold text-white mt-0.5">
                {applyMode === 'nominate' ? 'Nominación de Colaborador' : 'Postularme al Entrenamiento'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Toggle de Modo (Solo si tiene permisos de supervisión y puede postularse a sí mismo) */}
          {canNominate && canSelfApply && (
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setApplyMode('self')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  applyMode === 'self'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Postularme yo mismo</span>
              </button>
              <button
                type="button"
                onClick={() => setApplyMode('nominate')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  applyMode === 'nominate'
                    ? 'bg-[#DA291C] text-white shadow-sm shadow-red-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Nominar a mi equipo</span>
              </button>
            </div>
          )}

          {/* Selector de Colaborador si el modo es Nominación */}
          {applyMode === 'nominate' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Selecciona al Colaborador a Nominar *
              </label>
              {availableCandidates.length > 0 ? (
                <select
                  value={selectedNomineeCard}
                  onChange={(e) => setSelectedNomineeCard(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="">-- Selecciona un colaborador --</option>
                  {availableCandidates.map(c => (
                    <option key={c.card} value={c.card}>
                      {c.name} ({c.card}) {c.professionTitle || c.department ? `• ${c.professionTitle || c.department}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs rounded-xl">
                  No se encontraron colaboradores registrados en tu empresa para nominar.
                </div>
              )}
            </div>
          )}

          {/* Resumen de la Convocatoria */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              {convocatoria.title}
            </h3>
            {convocatoria.courseTitle && (
              <p className="text-xs text-red-600 dark:text-red-400 font-bold">
                Curso Oficial: {convocatoria.courseTitle}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {convocatoria.location || convocatoria.modality}
              </span>
              {convocatoria.trainingStartDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Inicia: {convocatoria.trainingStartDate}
                </span>
              )}
              {convocatoria.applicationEndDate && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  Cierre: {convocatoria.applicationEndDate}
                </span>
              )}
            </div>
          </div>

          {/* Indicador de Cupos para la Empresa */}
          {companyQuota && (
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              isWaitlistExpected
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
            }`}>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{companyQuota.companyName || 'Tu Empresa'}:</strong>{' '}
                  {isWaitlistExpected ? 'Cupo asignado completo.' : `${availableSlots} cupo(s) disponible(s)`}
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 shadow-2xs">
                {isWaitlistExpected ? 'Lista de Espera' : 'Cupo Disponible'}
              </span>
            </div>
          )}

          {isWaitlistExpected && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Al no haber cupos inmediatos para tu empresa, la solicitud quedará en lista de espera y podrá ser admitida si se liberan plazas.</span>
            </div>
          )}

          {/* Carta de Motivación o Justificación */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {applyMode === 'nominate' ? 'Justificación de la Nominación (Opcional)' : 'Motivación / Expectativas (Opcional)'}
            </label>
            <textarea
              rows={3}
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder={
                applyMode === 'nominate'
                  ? 'Explique por qué este colaborador requiere esta capacitación...'
                  : 'Comente por qué desea participar y cómo aplicará los conocimientos...'
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || (applyMode === 'nominate' && !selectedNomineeCard)}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#DA291C] hover:bg-red-700 rounded-xl shadow-md shadow-red-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Enviando...' : (isWaitlistExpected ? 'Entrar en Lista de Espera' : (applyMode === 'nominate' ? 'Confirmar Nominación' : 'Confirmar Postulación'))}</span>
            </button>
          </div>
        </form>
      </div>
    </AccessibleModal>
  );
};
