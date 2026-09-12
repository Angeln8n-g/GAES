import React, { useState } from 'react';
import { 
  X, 
  Star, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  ExternalLink, 
  Send, 
  Award, 
  BookOpen, 
  UserCheck, 
  MessageSquareQuote
} from 'lucide-react';
import { TrainingEvent, UserAccount, EventFeedback } from '../../types';
import { 
  COURSE_QUESTIONS, 
  FACILITATOR_QUESTIONS, 
  TEC_RATING_SCALE, 
  TEC_SURVEY_INFO,
  calculateTecScores 
} from '../../constants/tecSurveyQuestions';

interface TecEvaluationModalProps {
  event: TrainingEvent;
  currentUser: UserAccount;
  existingFeedback?: EventFeedback;
  isOpen: boolean;
  onClose: () => void;
  onSubmitFeedback: (feedback: EventFeedback) => Promise<void>;
  onShowToast?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

export const TecEvaluationModal: React.FC<TecEvaluationModalProps> = ({
  event,
  currentUser,
  existingFeedback,
  isOpen,
  onClose,
  onSubmitFeedback,
  onShowToast
}) => {
  const [step, setStep] = useState<'course' | 'facilitator' | 'comments' | 'success'>('course');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar respuestas con las existentes o con valor por defecto 5
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

  const [comment, setComment] = useState<string>(existingFeedback?.comment || '');

  if (!isOpen) return null;

  const { courseScore, facilitatorScore, compositeRating } = calculateTecScores(
    courseRatings, 
    facilitatorRatings
  );

  const handleCourseRatingChange = (qId: string, val: number) => {
    setCourseRatings(prev => ({ ...prev, [qId]: val }));
  };

  const handleFacilitatorRatingChange = (qId: string, val: number) => {
    setFacilitatorRatings(prev => ({ ...prev, [qId]: val }));
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      const feedbackPayload: EventFeedback = {
        id: existingFeedback?.id,
        eventId: event.id,
        userEmail: currentUser.email,
        userName: currentUser.name,
        rating: Math.round(compositeRating),
        courseScore,
        facilitatorScore,
        courseRatings,
        facilitatorRatings,
        comment: comment.trim(),
        createdAt: new Date().toISOString()
      };

      await onSubmitFeedback(feedbackPayload);
      setStep('success');
      if (onShowToast) {
        onShowToast('Evaluación enviada', 'Tus calificaciones han sido registradas exitosamente.', 'success');
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('Error', err.message || 'No fue posible guardar tu evaluación.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon Claro */}
        <div className="bg-gradient-to-r from-[#DA291C] via-red-600 to-red-700 text-white p-5 sm:p-6 shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md">
              Encuesta de Satisfacción Oficial
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
              TEC - Calidad Educativa
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black leading-tight">
            {TEC_SURVEY_INFO.title}
          </h2>
          
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-red-100 font-medium">
            <span><strong>Curso:</strong> {event.title}</span>
            <span>•</span>
            <span><strong>Facilitador:</strong> {event.instructor}</span>
          </div>

          {/* Stepper Progress Tabs */}
          {step !== 'success' && (
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/20 text-xs">
              <button
                type="button"
                onClick={() => setStep('course')}
                className={`py-1.5 px-2 rounded-xl text-center font-bold flex items-center justify-center gap-1.5 transition-all ${
                  step === 'course' 
                    ? 'bg-white text-[#DA291C] shadow-md' 
                    : 'bg-white/10 hover:bg-white/20 text-white/90'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">1. Curso</span>
                <span className="text-[10px] sm:text-xs">({courseScore.toFixed(1)}★)</span>
              </button>

              <button
                type="button"
                onClick={() => setStep('facilitator')}
                className={`py-1.5 px-2 rounded-xl text-center font-bold flex items-center justify-center gap-1.5 transition-all ${
                  step === 'facilitator' 
                    ? 'bg-white text-[#DA291C] shadow-md' 
                    : 'bg-white/10 hover:bg-white/20 text-white/90'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">2. Facilitador</span>
                <span className="text-[10px] sm:text-xs">({facilitatorScore.toFixed(1)}★)</span>
              </button>

              <button
                type="button"
                onClick={() => setStep('comments')}
                className={`py-1.5 px-2 rounded-xl text-center font-bold flex items-center justify-center gap-1.5 transition-all ${
                  step === 'comments' 
                    ? 'bg-white text-[#DA291C] shadow-md' 
                    : 'bg-white/10 hover:bg-white/20 text-white/90'
                }`}
              >
                <MessageSquareQuote className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">3. Resumen</span>
                <span className="text-[10px] sm:text-xs">({compositeRating.toFixed(1)}★)</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* ===================== PASO 1: CURSO ===================== */}
          {step === 'course' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-red-50/50 border border-red-200 text-xs space-y-1">
                <p className="font-bold text-[#DA291C] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#DA291C]" />
                  Parte 1: Evaluación del Entrenamiento (Curso)
                </p>
                <p className="text-slate-600 font-medium">
                  Evalúa cada aspecto de acuerdo con la escala: <strong>1 = No aceptable</strong> hasta <strong>5 = Excelente</strong>.
                </p>
              </div>

              <div className="space-y-4">
                {COURSE_QUESTIONS.map((q, idx) => {
                  const currentVal = courseRatings[q.id] || 5;
                  return (
                    <div 
                      key={q.id}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/60 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-bold text-slate-800 leading-snug">
                          <span className="text-[#DA291C] font-black mr-1.5">{idx + 1}.</span>
                          {q.question}
                        </span>
                        <span className="shrink-0 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-black text-[#DA291C]">
                          {currentVal} / 5
                        </span>
                      </div>

                      {/* Scale Selector */}
                      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-1">
                        {TEC_RATING_SCALE.map(scale => {
                          const isSelected = currentVal === scale.value;
                          return (
                            <button
                              key={scale.value}
                              type="button"
                              onClick={() => handleCourseRatingChange(q.id, scale.value)}
                              className={`py-2 px-1 rounded-xl text-center border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                isSelected
                                  ? 'bg-[#DA291C] text-white border-[#DA291C] shadow-md shadow-red-500/25 scale-[1.02]'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              <span className="text-sm sm:text-base font-black leading-none">{scale.value}★</span>
                              <span className={`text-[9px] sm:text-[10px] leading-tight text-center line-clamp-1 font-semibold ${
                                isSelected ? 'text-red-100' : 'text-slate-500'
                              }`}>
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

          {/* ===================== PASO 2: FACILITADOR ===================== */}
          {step === 'facilitator' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs space-y-1">
                <p className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-700" />
                  Parte 2: Evaluación del Facilitador / Instructor
                </p>
                <p className="text-slate-600 font-medium">
                  Evalúa el dominio, claridad pedagógica y acompañamiento brindado por: <strong>{event.instructor}</strong>.
                </p>
              </div>

              <div className="space-y-4">
                {FACILITATOR_QUESTIONS.map((q, idx) => {
                  const currentVal = facilitatorRatings[q.id] || 5;
                  return (
                    <div 
                      key={q.id}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/60 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-bold text-slate-800 leading-snug">
                          <span className="text-amber-600 font-black mr-1.5">{idx + 1}.</span>
                          {q.question}
                        </span>
                        <span className="shrink-0 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-black text-amber-600">
                          {currentVal} / 5
                        </span>
                      </div>

                      {/* Scale Selector */}
                      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-1">
                        {TEC_RATING_SCALE.map(scale => {
                          const isSelected = currentVal === scale.value;
                          return (
                            <button
                              key={scale.value}
                              type="button"
                              onClick={() => handleFacilitatorRatingChange(q.id, scale.value)}
                              className={`py-2 px-1 rounded-xl text-center border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/25 scale-[1.02]'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              <span className="text-sm sm:text-base font-black leading-none">{scale.value}★</span>
                              <span className={`text-[9px] sm:text-[10px] leading-tight text-center line-clamp-1 font-semibold ${
                                isSelected ? 'text-slate-900' : 'text-slate-500'
                              }`}>
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

          {/* ===================== PASO 3: RESUMEN Y COMENTARIOS ===================== */}
          {step === 'comments' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Score Summary Box */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-center">
                  <span className="text-[11px] font-bold text-[#DA291C] uppercase block mb-1">Evaluación Curso</span>
                  <span className="text-2xl font-black text-slate-900">{courseScore.toFixed(2)}</span>
                  <span className="text-xs text-slate-500 block">de 5.0 ★</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                  <span className="text-[11px] font-bold text-amber-700 uppercase block mb-1">Evaluación Facilitador</span>
                  <span className="text-2xl font-black text-slate-900">{facilitatorScore.toFixed(2)}</span>
                  <span className="text-xs text-slate-500 block">de 5.0 ★</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase block mb-1">Puntaje Global TEC</span>
                  <span className="text-2xl font-black text-emerald-800">{compositeRating.toFixed(2)}</span>
                  <span className="text-xs text-emerald-600 block">de 5.0 ★</span>
                </div>
              </div>

              {/* Open Feedback Textarea */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                  Comentarios, sugerencias y oportunidades de mejora (Opcional):
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="¿Qué te pareció el contenido, la dinámica o qué sugerencias tienes para próximas sesiones? Tu opinión nos ayuda a mejorar continuamente..."
                  className="w-full p-4 rounded-2xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C] focus:ring-2 focus:ring-red-100 resize-none"
                />
              </div>

              {/* Forms Link Note */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-800">Formulario Oficial Microsoft Forms</p>
                  <p className="text-slate-500 text-[11px]">Si prefieres responderlo externamente en la nube de Microsoft 365:</p>
                </div>
                <a
                  href={TEC_SURVEY_INFO.formUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <span>Abrir Forms</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

            </div>
          )}

          {/* ===================== ESTADO DE ÉXITO ===================== */}
          {step === 'success' && (
            <div className="py-10 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <h3 className="text-xl font-black text-slate-900">
                ¡Evaluación Registrada con Éxito!
              </h3>

              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed font-medium">
                Agradecemos sinceramente tu tiempo. Tus valoraciones han sido integradas al reporte de calidad y métricas de desempeño de Claro Aprendizaje & Desarrollo.
              </p>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-w-sm mx-auto text-xs space-y-1">
                <p className="font-bold text-slate-800">Puntaje TEC Asignado: <strong>{compositeRating.toFixed(1)} / 5.0 ★</strong></p>
                <p className="text-slate-500 text-[11px]">Curso: {courseScore.toFixed(1)} ★ | Facilitador: {facilitatorScore.toFixed(1)} ★</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-6 py-2.5 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/25 transition-all cursor-pointer"
              >
                Cerrar Ventana
              </button>
            </div>
          )}

        </div>

        {/* Modal Footer Navigation */}
        {step !== 'success' && (
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            {step === 'course' ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step === 'comments' ? 'facilitator' : 'course')}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            )}

            {step !== 'comments' ? (
              <button
                type="button"
                onClick={() => setStep(step === 'course' ? 'facilitator' : 'comments')}
                className="px-5 py-2.5 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-500/25 transition-all cursor-pointer"
              >
                <span>{step === 'course' ? 'Siguiente: Evaluar Facilitador' : 'Siguiente: Resumen & Comentarios'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSave}
                className="px-6 py-2.5 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-red-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Guardando...' : 'Enviar Evaluación TEC'}</span>
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
