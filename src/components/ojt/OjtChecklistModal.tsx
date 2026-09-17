import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  User, 
  Calendar, 
  Award, 
  FileText, 
  Sparkles, 
  Check, 
  Layers,
  Wrench,
  Clock,
  ShieldAlert,
  GraduationCap
} from 'lucide-react';
import { OjtChecklist, Participant, UserAccount, Company, OjtRubricItem, OjtObservationType, OjtOperationalStatus } from '../../types';
import { AccessibleModal } from '../common/AccessibleModal';

interface OjtChecklistModalProps {
  initialChecklist?: OjtChecklist | null;
  participants: Participant[];
  currentUser: UserAccount | null;
  companies?: Company[];
  onClose: () => void;
  onSave: (checklist: Partial<OjtChecklist>) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

const DEFAULT_RUBRIC_CATEGORIES = [
  { category: '1. Seguridad y Protocolos EPP', desc: 'Uso correcto de equipo de protección personal y evaluación de riesgos en el entorno.' },
  { category: '2. Procedimiento Técnico Estándar', desc: 'Secuencia de ejecución según el manual de operaciones y sin saltar pasos críticos.' },
  { category: '3. Calidad & First-Time Fix', desc: 'Resolución efectiva a la primera intervención sin requerir retrabajo ni generar fallas.' },
  { category: '4. Diagnóstico & Uso de Herramientas', desc: 'Manejo adecuado de instrumentación, herramientas de software y diagnóstico de causa raíz.' },
  { category: '5. Tiempo de Ejecución & Productividad', desc: 'Realización de la tarea dentro de los tiempos estipulados para el estándar de campo.' }
];

export const OjtChecklistModal: React.FC<OjtChecklistModalProps> = ({
  initialChecklist,
  participants,
  currentUser,
  companies = [],
  onClose,
  onSave,
  onShowToast
}) => {
  const isEditing = !!initialChecklist;

  const [participantCard, setParticipantCard] = useState(initialChecklist?.participantCard || (participants[0]?.card || ''));
  const [date, setDate] = useState(initialChecklist?.date || new Date().toISOString().slice(0, 10));
  const [observationType, setObservationType] = useState<OjtObservationType>(initialChecklist?.observationType || 'daily_observation');
  const [safetyProtocolPass, setSafetyProtocolPass] = useState<boolean>(initialChecklist?.safetyProtocolPass ?? true);
  const [firstTimeFixPass, setFirstTimeFixPass] = useState<boolean>(initialChecklist?.firstTimeFixPass ?? true);
  
  // Rubric state
  const [rubricScores, setRubricScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    DEFAULT_RUBRIC_CATEGORIES.forEach(cat => {
      const existing = initialChecklist?.rubricEvaluation?.find(r => r.category === cat.category);
      initial[cat.category] = existing ? existing.score : 85;
    });
    return initial;
  });

  const [weaknessesText, setWeaknessesText] = useState(
    initialChecklist?.weaknessesIdentified?.join(', ') || ''
  );
  const [immediateActionPlan, setImmediateActionPlan] = useState(initialChecklist?.immediateActionPlan || '');
  const [notes, setNotes] = useState(initialChecklist?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calcular nota general ponderada
  const overallScore = Math.round(
    Object.values(rubricScores).reduce((acc, val) => acc + val, 0) / DEFAULT_RUBRIC_CATEGORIES.length
  );

  // Determinar estado operativo automático
  let computedStatus: OjtOperationalStatus = 'compliant';
  if (!safetyProtocolPass || overallScore < 70) {
    computedStatus = 'critical_gap';
  } else if (!firstTimeFixPass || overallScore < 85) {
    computedStatus = 'needs_coaching';
  }

  const selectedParticipant = participants.find(p => p.card === participantCard);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantCard) {
      onShowToast('Selecciona un colaborador', 'Debes indicar a quién corresponde la evaluación.', 'error');
      return;
    }

    const rubricEvaluation: OjtRubricItem[] = DEFAULT_RUBRIC_CATEGORIES.map(c => ({
      category: c.category,
      score: rubricScores[c.category] || 0
    }));

    const weaknessesIdentified = weaknessesText
      .split(',')
      .map(w => w.trim())
      .filter(w => w.length > 0);

    const payload: Partial<OjtChecklist> = {
      id: initialChecklist?.id,
      companyId: selectedParticipant?.companyId || currentUser?.companyId || 'emp_kasino',
      participantCard,
      evaluatorUserId: currentUser?.id || 'usr_eval',
      evaluatorName: currentUser?.name || 'Supervisor / OJT',
      date,
      observationType,
      overallScore,
      operationalStatus: computedStatus,
      safetyProtocolPass,
      firstTimeFixPass,
      rubricEvaluation,
      weaknessesIdentified,
      immediateActionPlan: immediateActionPlan.trim() || undefined,
      notes: notes.trim() || undefined
    };

    try {
      setIsSubmitting(true);
      await onSave(payload);
      onShowToast(
        isEditing ? 'Bitácora actualizada' : 'Bitácora OJT registrada',
        `Evaluación para ${selectedParticipant?.name || participantCard} guardada con éxito (${overallScore}/100).`,
        'success'
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      onShowToast('Error al guardar', err.message || 'No se pudo registrar la bitácora OJT.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      onClose={onClose}
      ariaLabel={isEditing ? 'Editar Bitácora de Observación' : 'Nueva Bitácora y Checklist OJT'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#DA291C] mb-0.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Acompañamiento en Campo (OJT)</span>
            </div>
            <h2 className="text-lg font-black text-slate-900">
              {isEditing ? 'Editar Bitácora de Observación' : 'Nueva Bitácora & Checklist OJT'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* General Data */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Colaborador Auditado *</label>
              <select
                value={participantCard}
                onChange={(e) => setParticipantCard(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#DA291C]"
                required
              >
                {participants.map(p => (
                  <option key={p.card} value={p.card}>
                    {p.name} ({p.department || 'Sin Depto'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Observación *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#DA291C]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Acompañamiento</label>
              <select
                value={observationType}
                onChange={(e) => setObservationType(e.target.value as OjtObservationType)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#DA291C]"
              >
                <option value="daily_observation">Acompañamiento Diario</option>
                <option value="weekly_evaluation">Evaluación Semanal</option>
                <option value="cross_audit">Auditoría Cruzada</option>
                <option value="first_60d_check">Check Primeros 60 Días</option>
              </select>
            </div>
          </div>

          {/* Ficha Académica del Tutorado (Sinergia OJT) */}
          {selectedParticipant && (selectedParticipant.educationLevel || selectedParticipant.isCurrentlyStudying) && (
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-blue-950">Perfil Formativo del Tutorado:</span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-blue-200 text-blue-800 font-bold text-[10px]">
                      {selectedParticipant.educationLevel || 'Bachiller'}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    {selectedParticipant.isCurrentlyStudying ? (
                      <span>
                        🎓 Cursa: <strong>{selectedParticipant.currentStudyField || 'Carrera'}</strong> en {selectedParticipant.institutionName || 'Institución'}
                      </span>
                    ) : (
                      <span>No reporta estudios activos actualmente</span>
                    )}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-indigo-600 text-white shrink-0 self-start sm:self-center shadow-xs">
                Sinergia 70-20-10
              </span>
            </div>
          )}

          {/* Quick Check Flags: Safety & First-Time Fix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div 
              onClick={() => setSafetyProtocolPass(!safetyProtocolPass)}
              className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                safetyProtocolPass 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className={`w-5 h-5 shrink-0 ${safetyProtocolPass ? 'text-emerald-600' : 'text-rose-600'}`} />
                <div>
                  <p className="text-xs font-bold">Protocolo de Seguridad & EPP</p>
                  <p className="text-[11px] opacity-80 font-medium">{safetyProtocolPass ? 'Cumple al 100%' : 'Incumplimiento detectado'}</p>
                </div>
              </div>
              <input type="checkbox" checked={safetyProtocolPass} onChange={() => {}} className="w-4 h-4 rounded text-emerald-600 cursor-pointer" />
            </div>

            <div 
              onClick={() => setFirstTimeFixPass(!firstTimeFixPass)}
              className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                firstTimeFixPass 
                  ? 'bg-red-50/60 border-red-200 text-[#DA291C]' 
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wrench className={`w-5 h-5 shrink-0 ${firstTimeFixPass ? 'text-[#DA291C]' : 'text-amber-600'}`} />
                <div>
                  <p className="text-xs font-bold">Calidad a la Primera (First-Time Fix)</p>
                  <p className="text-[11px] opacity-80 font-medium">{firstTimeFixPass ? 'Sin retrabajos' : 'Requirió corrección'}</p>
                </div>
              </div>
              <input type="checkbox" checked={firstTimeFixPass} onChange={() => {}} className="w-4 h-4 rounded text-[#DA291C] cursor-pointer" />
            </div>
          </div>

          {/* 5-Criteria Rubric */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#DA291C]" />
              <span>Rúbrica de Desempeño Operativo (5 Dimensiones)</span>
            </h4>

            <div className="space-y-2.5">
              {DEFAULT_RUBRIC_CATEGORIES.map(cat => {
                const currentVal = rubricScores[cat.category] || 0;
                return (
                  <div key={cat.category} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{cat.category}</p>
                        <p className="text-[11px] text-slate-500">{cat.desc}</p>
                      </div>
                      <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg border ${
                        currentVal >= 85 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        currentVal >= 70 ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {currentVal}/100
                      </span>
                    </div>

                    <input
                      type="range"
                      min="40"
                      max="100"
                      step="5"
                      value={currentVal}
                      onChange={(e) => {
                        setRubricScores({
                          ...rubricScores,
                          [cat.category]: Number(e.target.value)
                        });
                      }}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#DA291C]"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Score Summary Banner */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            computedStatus === 'compliant' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
            computedStatus === 'needs_coaching' ? 'bg-amber-50 border-amber-200 text-amber-900' :
            'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div>
              <p className="text-xs font-black">Diagnóstico Operativo Resultante</p>
              <p className="text-[11px] font-medium opacity-90">
                {computedStatus === 'compliant' ? '🟢 Desempeño Conforme y Autónomo' :
                 computedStatus === 'needs_coaching' ? '🟡 Requiere Coaching & Refuerzo OJT' :
                 '🔴 Brecha Crítica (Pausar autonomía temporalmente)'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black">{overallScore}</span>
              <span className="text-xs font-bold opacity-70"> / 100</span>
            </div>
          </div>

          {/* Weaknesses & Action Plan */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Debilidades Específicas Observadas (separadas por coma)
              </label>
              <input
                type="text"
                value={weaknessesText}
                onChange={(e) => setWeaknessesText(e.target.value)}
                placeholder="ej. Secuencia de arranque, Ajuste de presión, Tiempo de diagnóstico"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Plan de Acción Inmediato / Compromiso de Coaching
              </label>
              <textarea
                rows={2}
                value={immediateActionPlan}
                onChange={(e) => setImmediateActionPlan(e.target.value)}
                placeholder="ej. Realizar 2 sesiones de shadowing guiado con técnico senior antes de la siguiente evaluación..."
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Notas Generales / Retroalimentación</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones adicionales sobre actitud, velocidad y comunicación..."
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
              />
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 bg-[#DA291C] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md shadow-red-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Guardando...' : 'Registrar Bitácora'}</span>
          </button>
        </div>

      </div>
    </AccessibleModal>
  );
};
