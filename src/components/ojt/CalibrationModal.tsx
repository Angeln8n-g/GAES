import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Scale, 
  Calendar, 
  Users, 
  CheckCircle2, 
  TrendingDown, 
  AlertCircle, 
  Sparkles, 
  Plus, 
  Check, 
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import { CalibrationSession, Company, UserAccount } from '../../types';
import { AccessibleModal } from '../common/AccessibleModal';

interface CalibrationModalProps {
  calibrations: CalibrationSession[];
  currentUser: UserAccount | null;
  companies?: Company[];
  onClose: () => void;
  onSaveCalibration: (session: Partial<CalibrationSession>) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  calibrations,
  currentUser,
  companies = [],
  onClose,
  onSaveCalibration,
  onShowToast
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [conductedBy, setConductedBy] = useState(currentUser?.name || 'Mesa Conjunta Ops & Capacitación');
  const [participantsReviewed, setParticipantsReviewed] = useState<number>(10);
  const [averageTheoryScore, setAverageTheoryScore] = useState<number>(88);
  const [averageFieldScore, setAverageFieldScore] = useState<number>(74);
  const [keyFindings, setKeyFindings] = useState('');
  const [actionAgreements, setActionAgreements] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const varianceGap = Math.abs(averageTheoryScore - averageFieldScore);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      onShowToast('Título requerido', 'Indica el nombre o motivo de la sesión de calibración.', 'error');
      return;
    }

    const payload: Partial<CalibrationSession> = {
      companyId: currentUser?.companyId || 'emp_kasino',
      title: title.trim(),
      date,
      conductedBy: conductedBy.trim(),
      participantsReviewed,
      averageTheoryScore,
      averageFieldScore,
      keyFindings: keyFindings.trim() || undefined,
      actionAgreements: actionAgreements.trim() || undefined
    };

    try {
      setIsSubmitting(true);
      await onSaveCalibration(payload);
      onShowToast('Sesión de Calibración registrada', 'Los acuerdos y la discrepancia han sido guardados.', 'success');
      setIsCreating(false);
      setTitle('');
      setKeyFindings('');
      setActionAgreements('');
    } catch (err: any) {
      console.error(err);
      onShowToast('Error', err.message || 'No se pudo registrar la sesión.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      onClose={onClose}
      ariaLabel="Mesas de Calibración y Auditorías Cruzadas"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#DA291C] dark:text-red-400 mb-0.5">
              <Scale className="w-3.5 h-3.5" />
              <span>Alineación Operaciones vs Capacitación</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Mesas de Calibración & Auditorías Cruzadas
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Create Button Banner */}
          {!isCreating && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">¿Deseas registrar una nueva sesión de calibración?</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                  Compara notas de exámenes teóricos vs evaluaciones prácticas en campo para cerrar la brecha de evaluación.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="px-3.5 py-2 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-500/25 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Sesión</span>
              </button>
            </div>
          )}

          {/* Form Create */}
          {isCreating && (
            <form onSubmit={handleCreate} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <span className="text-xs font-black text-slate-900 dark:text-white">Registrar Nueva Mesa de Calibración</span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Título de la Sesión *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="ej. Calibración Mensual Técnicos Nivel 1 - Q3"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#DA291C]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-[#DA291C]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Colaboradores Auditados</label>
                  <input
                    type="number"
                    min="1"
                    value={participantsReviewed}
                    onChange={(e) => setParticipantsReviewed(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-[#DA291C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Promedio Teórico (Aula)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={averageTheoryScore}
                    onChange={(e) => setAverageTheoryScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-[#DA291C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Promedio Real (Campo)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={averageFieldScore}
                    onChange={(e) => setAverageFieldScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-[#DA291C]"
                  />
                </div>
              </div>

              {/* Variance Indicator */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs shadow-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Discrepancia Calculada (Gap Teoría vs Campo):</span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                  varianceGap <= 10 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                  'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}>
                  {varianceGap.toFixed(1)}% de variación
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Hallazgos Principales</label>
                <textarea
                  rows={2}
                  value={keyFindings}
                  onChange={(e) => setKeyFindings(e.target.value)}
                  placeholder="Detalla qué pasos teóricos no se están aplicando en el terreno de juego..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#DA291C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Acuerdos & Plan de Acción Conjunto</label>
                <textarea
                  rows={2}
                  value={actionAgreements}
                  onChange={(e) => setActionAgreements(e.target.value)}
                  placeholder="ej. Modificar simulador práctico, agregar 2 días de shadowing y recalibrar rúbrica..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#DA291C]"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Guardando...' : 'Guardar Calibración'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Historical List */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Historial de Mesas de Calibración ({calibrations.length})
            </h3>

            {calibrations.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 text-xs">
                No hay sesiones de calibración registradas aún.
              </div>
            ) : (
              calibrations.map(c => (
                <div key={c.id} className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{c.title}</span>
                        <span className="text-[10px] text-[#DA291C] dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/60 px-2 py-0.2 rounded-md border border-red-200 dark:border-red-800">
                          {c.participantsReviewed} colaboradores analizados
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        📅 {c.date} • Facilitado por: {c.conductedBy}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="text-right text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">Teoría: </span>
                        <span className="font-mono font-bold text-[#DA291C] dark:text-red-400">{c.averageTheoryScore}%</span>
                        <span className="text-slate-300 dark:text-slate-600 mx-1">|</span>
                        <span className="text-slate-500 dark:text-slate-400">Campo: </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{c.averageFieldScore}%</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
                        c.varianceGapPct <= 10 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}>
                        Gap: {c.varianceGapPct}%
                      </span>
                    </div>
                  </div>

                  {c.keyFindings && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1">
                      <span className="font-bold text-slate-800 dark:text-slate-200">🔍 Hallazgos Principales:</span>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{c.keyFindings}</p>
                    </div>
                  )}

                  {c.actionAgreements && (
                    <div className="p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-[11px] space-y-1">
                      <span className="font-bold text-[#DA291C] dark:text-red-400">⚡ Acuerdos Ops-Capacitación:</span>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{c.actionAgreements}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </AccessibleModal>
  );
};
