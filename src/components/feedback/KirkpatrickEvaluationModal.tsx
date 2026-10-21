import React, { useState } from 'react';
import { 
  X, 
  Star, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Award, 
  BookOpen, 
  UserCheck, 
  TrendingUp,
  MessageSquare,
  Lock,
  Unlock,
  Check,
  Send,
  Loader2,
  ThumbsUp,
  AlertCircle
} from 'lucide-react';
import { UserAccount, EventFeedback } from '../../types';
import { 
  COURSE_QUESTIONS, 
  FACILITATOR_QUESTIONS, 
  APPLICABILITY_QUESTIONS,
  TEC_RATING_SCALE, 
  NPS_SCALE,
  TEC_SURVEY_INFO,
  calculateTecScores 
} from '../../constants/tecSurveyQuestions';
import { apiService } from '../../services/api';

export interface TrainingEvaluationTarget {
  id: string; // eventId o cohortId
  title: string;
  type: 'event' | 'cohort';
  facilitatorName?: string;
  modality?: string;
}

interface KirkpatrickEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainingTarget: TrainingEvaluationTarget;
  currentUser: UserAccount;
  existingFeedback?: EventFeedback;
  onSuccessSubmitted?: () => void;
  onOpenCertificate?: () => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

export const KirkpatrickEvaluationModal: React.FC<KirkpatrickEvaluationModalProps> = ({
  isOpen,
  onClose,
  trainingTarget,
  currentUser,
  existingFeedback,
  onSuccessSubmitted,
  onOpenCertificate,
  onShowToast
}) => {
  const [step, setStep] = useState<'course' | 'facilitator' | 'nps' | 'comments' | 'success'>('course');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isReadOnly = Boolean(existingFeedback);

  // Calificaciones por pregunta
  const [courseRatings, setCourseRatings] = useState<Record<string, number>>(() => {
    if (existingFeedback?.courseRatings && Object.keys(existingFeedback.courseRatings).length > 0) {
      return { ...existingFeedback.courseRatings };
    }
    const initial: Record<string, number> = {};
    COURSE_QUESTIONS.forEach(q => { initial[q.id] = 5; });
    return initial;
  });

  const [facilitatorRatings, setFacilitatorRatings] = useState<Record<string, number>>(() => {
    if (existingFeedback?.facilitatorRatings && Object.keys(existingFeedback.facilitatorRatings).length > 0) {
      return { ...existingFeedback.facilitatorRatings };
    }
    const initial: Record<string, number> = {};
    FACILITATOR_QUESTIONS.forEach(q => { initial[q.id] = 5; });
    return initial;
  });

  const [applicabilityRatings, setApplicabilityRatings] = useState<Record<string, number>>({
    a1: 5,
    a2: 5
  });

  // Net Promoter Score (0-10)
  const [npsScore, setNpsScore] = useState<number>(existingFeedback?.npsScore ?? 10);

  // Comentarios
  const [strengthsComment, setStrengthsComment] = useState<string>(existingFeedback?.strengthsComment || '');
  const [improvementsComment, setImprovementsComment] = useState<string>(existingFeedback?.improvementsComment || '');
  const [generalComment, setGeneralComment] = useState<string>(existingFeedback?.comment || '');

  if (!isOpen) return null;

  const { courseScore, facilitatorScore, applicabilityScore, compositeRating } = calculateTecScores(
    courseRatings,
    facilitatorRatings,
    applicabilityRatings
  );

  const handleRatingChange = (category: 'course' | 'facilitator' | 'applicability', qId: string, val: number) => {
    if (isReadOnly) return;
    if (category === 'course') setCourseRatings(prev => ({ ...prev, [qId]: val }));
    else if (category === 'facilitator') setFacilitatorRatings(prev => ({ ...prev, [qId]: val }));
    else setApplicabilityRatings(prev => ({ ...prev, [qId]: val }));
  };

  const handleSubmit = async () => {
    if (isReadOnly) {
      onClose();
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: EventFeedback = {
        eventId: trainingTarget.type === 'event' ? trainingTarget.id : null,
        cohortId: trainingTarget.type === 'cohort' ? trainingTarget.id : null,
        trainingType: trainingTarget.type === 'event' ? 'event' : 'technical_academy',
        userEmail: currentUser.email,
        userName: currentUser.name,
        rating: Math.round(compositeRating),
        npsScore,
        applicabilityScore,
        strengthsComment: strengthsComment.trim() || undefined,
        improvementsComment: improvementsComment.trim() || undefined,
        comment: generalComment.trim() || strengthsComment.trim() || undefined,
        courseRatings,
        facilitatorRatings,
        courseScore,
        facilitatorScore
      };

      await apiService.submitFeedback(payload);

      if (onShowToast) {
        onShowToast('¡Evaluación Registrada!', 'Tu diploma oficial ha sido desbloqueado con éxito.', 'success');
      }

      if (onSuccessSubmitted) {
        onSuccessSubmitted();
      }

      setStep('success');
    } catch (err: any) {
      console.error('Error al enviar encuesta Kirkpatrick:', err);
      if (onShowToast) {
        onShowToast('Aviso', err.message || 'Error al guardar la evaluación.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNpsCategoryInfo = (score: number) => {
    if (score >= 9) {
      return { label: 'Promotor (Leal y entusiasta)', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300' };
    }
    if (score >= 7) {
      return { label: 'Neutro / Pasivo (Satisfecho pero neutral)', color: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300' };
    }
    return { label: 'Detractor (Oportunidades de mejora)', color: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-300' };
  };

  const npsInfo = getNpsCategoryInfo(npsScore);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Encabezado */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-red-500/5 via-amber-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#DA291C] to-amber-500 flex items-center justify-center text-white shadow-md shadow-red-500/20 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/50 text-[#DA291C] dark:text-red-400">
                  {trainingTarget.type === 'cohort' ? 'Taller Academia Técnica' : 'Evento General'}
                </span>
                <span className="text-xs text-slate-400">• Modelo Kirkpatrick N1</span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white line-clamp-1 mt-0.5">
                {trainingTarget.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Progreso de Pasos */}
        {step !== 'success' && (
          <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                step === 'course' ? 'bg-[#DA291C] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                1
              </span>
              <span className={step === 'course' ? 'text-[#DA291C] font-black' : ''}>Contenido</span>

              <span className="text-slate-300 dark:text-slate-600">/</span>

              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                step === 'facilitator' ? 'bg-[#DA291C] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                2
              </span>
              <span className={step === 'facilitator' ? 'text-[#DA291C] font-black' : ''}>Facilitador</span>

              <span className="text-slate-300 dark:text-slate-600">/</span>

              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                step === 'nps' ? 'bg-[#DA291C] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                3
              </span>
              <span className={step === 'nps' ? 'text-[#DA291C] font-black' : ''}>NPS & Puesto</span>

              <span className="text-slate-300 dark:text-slate-600">/</span>

              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                step === 'comments' ? 'bg-[#DA291C] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                4
              </span>
              <span className={step === 'comments' ? 'text-[#DA291C] font-black' : ''}>Comentarios</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
              <Lock className="w-3.5 h-3.5" />
              <span>Desbloquea tu Diploma QR</span>
            </div>
          </div>
        )}

        {/* Contenido Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* PASO 1: CONTENIDO Y METODOLOGÍA */}
          {step === 'course' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    Dimensión 1: Contenido, Metodología y Material Didáctico
                  </h4>
                  <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                    Evalúa la pertinencia de las temáticas, los ejercicios desarrollados y los recursos didácticos facilitados.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {COURSE_QUESTIONS.map((q, idx) => {
                  const currentVal = courseRatings[q.id] || 5;
                  return (
                    <div 
                      key={q.id}
                      className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 leading-snug">
                          {idx + 1}. {q.question}
                        </span>
                        <span className="text-xs font-black text-amber-500 shrink-0 flex items-center gap-1">
                          {currentVal} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        </span>
                      </div>

                      {/* Escala de 1 a 5 estrellas */}
                      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                        {TEC_RATING_SCALE.map(scale => {
                          const isSelected = currentVal === scale.value;
                          return (
                            <button
                              key={scale.value}
                              type="button"
                              onClick={() => handleRatingChange('course', q.id, scale.value)}
                              className={`py-2 px-1 rounded-xl text-center border text-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                isSelected
                                  ? 'border-[#DA291C] bg-red-50 dark:bg-red-950/40 text-[#DA291C] dark:text-red-400 font-black shadow-xs ring-1 ring-[#DA291C]'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750 font-medium'
                              }`}
                            >
                              <div className="flex items-center">
                                <span className="font-black text-sm">{scale.value}</span>
                                <Star className={`w-3 h-3 ml-0.5 ${isSelected ? 'fill-[#DA291C] text-[#DA291C]' : 'fill-slate-300 text-slate-300 dark:fill-slate-600 dark:text-slate-600'}`} />
                              </div>
                              <span className="text-[10px] leading-tight line-clamp-1 hidden sm:inline">
                                {scale.shortLabel}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASO 2: FACILITADOR / INSTRUCTOR */}
          {step === 'facilitator' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/40 flex items-start gap-3">
                <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    Dimensión 2: Desempeño del Facilitador / Instructor
                    {trainingTarget.facilitatorName && ` (${trainingTarget.facilitatorName})`}
                  </h4>
                  <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                    Califica la claridad en las explicaciones, el dominio técnico y el dinamismo durante la sesión.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {FACILITATOR_QUESTIONS.map((q, idx) => {
                  const currentVal = facilitatorRatings[q.id] || 5;
                  return (
                    <div 
                      key={q.id}
                      className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 leading-snug">
                          {idx + 1}. {q.question}
                        </span>
                        <span className="text-xs font-black text-amber-500 shrink-0 flex items-center gap-1">
                          {currentVal} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                        {TEC_RATING_SCALE.map(scale => {
                          const isSelected = currentVal === scale.value;
                          return (
                            <button
                              key={scale.value}
                              type="button"
                              onClick={() => handleRatingChange('facilitator', q.id, scale.value)}
                              className={`py-2 px-1 rounded-xl text-center border text-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-black shadow-xs ring-1 ring-indigo-500'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750 font-medium'
                              }`}
                            >
                              <div className="flex items-center">
                                <span className="font-black text-sm">{scale.value}</span>
                                <Star className={`w-3 h-3 ml-0.5 ${isSelected ? 'fill-indigo-500 text-indigo-500' : 'fill-slate-300 text-slate-300 dark:fill-slate-600 dark:text-slate-600'}`} />
                              </div>
                              <span className="text-[10px] leading-tight line-clamp-1 hidden sm:inline">
                                {scale.shortLabel}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASO 3: APLICABILIDAD AL PUESTO & NET PROMOTER SCORE (NPS) */}
          {step === 'nps' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Sección Aplicabilidad al Puesto */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Dimensión 3: Aplicabilidad y Transferencia al Puesto de Trabajo
                    </h4>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                      Mide qué tan útil resultará lo aprendido para tus funciones diarias en Claro Dominicana o la empresa contratista.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {APPLICABILITY_QUESTIONS.map((q, idx) => {
                    const currentVal = applicabilityRatings[q.id] || 5;
                    return (
                      <div 
                        key={q.id}
                        className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                            {idx + 1}. {q.question}
                          </span>
                          <span className="text-xs font-black text-emerald-600 shrink-0">
                            {currentVal} / 5
                          </span>
                        </div>

                        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                          {TEC_RATING_SCALE.map(scale => {
                            const isSelected = currentVal === scale.value;
                            return (
                              <button
                                key={scale.value}
                                type="button"
                                onClick={() => handleRatingChange('applicability', q.id, scale.value)}
                                className={`py-2 px-1 rounded-xl text-center border text-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                  isSelected
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-black shadow-xs ring-1 ring-emerald-500'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 font-medium'
                                }`}
                              >
                                <span className="font-black text-sm">{scale.value}★</span>
                                <span className="text-[10px] leading-tight line-clamp-1 hidden sm:inline">
                                  {scale.shortLabel}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sección Net Promoter Score (0-10) */}
              <div className="p-5 rounded-3xl bg-linear-to-br from-amber-500/10 via-red-500/5 to-slate-50 dark:to-slate-800/60 border-2 border-amber-500/30 dark:border-amber-500/20 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                      Métrica Estándar NPS
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                      ¿Qué tan probable es que recomiendes esta capacitación a un colega o compañero de trabajo?
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      En una escala de 0 (Nada probable) a 10 (Totalmente seguro)
                    </p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-xl border text-xs font-bold shrink-0 ${npsInfo.color}`}>
                    Puntaje: {npsScore} / 10
                  </div>
                </div>

                {/* Botones Interactivos del 0 al 10 */}
                <div className="grid grid-cols-11 gap-1">
                  {NPS_SCALE.map(n => {
                    const isSelected = npsScore === n.value;
                    return (
                      <button
                        key={n.value}
                        type="button"
                        onClick={() => !isReadOnly && setNpsScore(n.value)}
                        title={`${n.value} - ${n.label}`}
                        className={`py-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'scale-110 shadow-lg ring-2 ring-white dark:ring-slate-900 ' + n.color
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                        }`}
                      >
                        <span>{n.value}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-medium">
                  <span>0 = Nada probable (Detractor)</span>
                  <span>7-8 = Neutral</span>
                  <span>9-10 = Altamente probable (Promotor)</span>
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: COMENTARIOS CUALITATIVOS */}
          {step === 'comments' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200">
                    Dimensión 4: Retroalimentación y Oportunidades de Mejora
                  </h4>
                  <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80 mt-0.5">
                    Tus comentarios cualitativos son confidenciales y ayudan al equipo de Formación a enriquecer futuros entrenamientos.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Aspectos más valiosos o fortalezas del entrenamiento
                </label>
                <textarea
                  rows={3}
                  disabled={isReadOnly}
                  value={strengthsComment}
                  onChange={e => setStrengthsComment(e.target.value)}
                  placeholder="Ej: La claridad del facilitador, los ejercicios prácticos de empalme, el material de apoyo..."
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-[#DA291C] focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ¿Qué oportunidades de mejora sugieres para futuras ediciones?
                </label>
                <textarea
                  rows={3}
                  disabled={isReadOnly}
                  value={improvementsComment}
                  onChange={e => setImprovementsComment(e.target.value)}
                  placeholder="Ej: Dedicar más tiempo a los casos de estudio, mejorar la conexión virtual, incorporar simuladores..."
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-[#DA291C] focus:outline-none resize-none"
                />
              </div>

              {/* Resumen de Calificación Final */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">
                    Puntaje Global Compuesto
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Promedio ponderado de Contenido, Facilitador y Aplicabilidad
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-black text-base text-amber-500">
                  <span>{compositeRating} / 5.0</span>
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </div>
              </div>
            </div>
          )}

          {/* PASO 5: PANTALLA DE ÉXITO & DESBLOQUEO DE DIPLOMA */}
          {step === 'success' && (
            <div className="py-8 px-4 text-center space-y-6 animate-fadeIn">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-linear-to-tr from-emerald-500 via-teal-400 to-emerald-300 p-0.5 shadow-xl shadow-emerald-500/20 flex items-center justify-center">
                <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[22px] flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                </div>
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-black">
                  <Unlock className="w-3.5 h-3.5" />
                  <span>DIPLOMA OFICIAL DESBLOQUEADO</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  ¡Gracias por tu Retroalimentación!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Tus respuestas han sido procesadas por el sistema de Aseguramiento de Calidad Académica de Claro Dominicana. Tu diploma con validación QR está listo para visualización y descarga oficial en PDF.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                {onOpenCertificate && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCertificate();
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#DA291C] hover:bg-red-700 text-white font-extrabold text-xs shadow-lg shadow-red-500/25 inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Award className="w-4 h-4" />
                    <span>Ver y Descargar mi Diploma Oficial</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Navegación de Pasos */}
        {step !== 'success' && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (step === 'facilitator') setStep('course');
                else if (step === 'nps') setStep('facilitator');
                else if (step === 'comments') setStep('nps');
                else onClose();
              }}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-750 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{step === 'course' ? 'Cancelar' : 'Anterior'}</span>
            </button>

            <div className="flex items-center gap-2">
              {step !== 'comments' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 'course') setStep('facilitator');
                    else if (step === 'facilitator') setStep('nps');
                    else if (step === 'nps') setStep('comments');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>Siguiente Paso</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="px-6 py-2.5 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-black shadow-md shadow-red-500/25 transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'Registrando...' : 'Finalizar y Desbloquear Diploma'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
