import React, { useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  Calendar,
  Clock,
  UserCheck,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  Sparkles,
  MapPin,
  Check
} from 'lucide-react';
import {
  TechnicalAcademyCourse,
  TechnicalAcademyCohort,
  Participant
} from '../../types';
import { apiService } from '../../services/api';

interface CrmAssignCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetParticipants: Participant[];
  courses: TechnicalAcademyCourse[];
  cohorts: TechnicalAcademyCohort[];
  prevCohortId?: string | null;
  prevCourseTitle?: string | null;
  onSuccess: () => void;
  onShowToast?: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const CrmAssignCourseModal: React.FC<CrmAssignCourseModalProps> = ({
  isOpen,
  onClose,
  targetParticipants,
  courses,
  cohorts,
  prevCohortId = null,
  prevCourseTitle = null,
  onSuccess,
  onShowToast
}) => {
  if (!isOpen || targetParticipants.length === 0) return null;

  const isReassignment = Boolean(prevCohortId);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => {
    return courses.length > 0 ? courses[0].id : '';
  });
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [archivePrevious, setArchivePrevious] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cohortes filtradas para el curso seleccionado
  const availableCohorts = useMemo(() => {
    if (!selectedCourseId) return [];
    return cohorts
      .filter(c => c.courseId === selectedCourseId)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [cohorts, selectedCourseId]);

  // Si cambia el curso seleccionado, pre-seleccionar la primera cohorte activa o disponible
  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const cohs = cohorts.filter(c => c.courseId === courseId);
    if (cohs.length > 0) {
      const activeOrScheduled = cohs.find(c => c.status === 'scheduled' || c.status === 'in_progress') || cohs[0];
      setSelectedCohortId(activeOrScheduled.id);
    } else {
      setSelectedCohortId('');
    }
  };

  // Inicialización de cohorte al abrir
  React.useEffect(() => {
    if (availableCohorts.length > 0 && !selectedCohortId) {
      const activeOrScheduled = availableCohorts.find(c => c.status === 'scheduled' || c.status === 'in_progress') || availableCohorts[0];
      setSelectedCohortId(activeOrScheduled.id);
    }
  }, [availableCohorts, selectedCohortId]);

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const selectedCohort = cohorts.find(c => c.id === selectedCohortId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCohortId) {
      setErrorMsg('Debes seleccionar una cohorte disponible para realizar la asignación.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const cards = targetParticipants.map(p => p.card);

      if (isReassignment && targetParticipants.length === 1 && prevCohortId) {
        // Reasignación atómica
        await apiService.reassignTechnicalCourse({
          participantCard: targetParticipants[0].card,
          prevCohortId,
          newCohortId: selectedCohortId,
          archivePrevious
        });
      } else {
        // Asignación individual o masiva
        await apiService.enrollCohortParticipants(selectedCohortId, {
          participantCards: cards
        });
      }

      if (onShowToast) {
        const msg = targetParticipants.length === 1
          ? `Se asignó el curso a ${targetParticipants[0].name} exitosamente.`
          : `Se asignaron ${targetParticipants.length} colaboradores a la cohorte exitosamente.`;
        onShowToast('Asignación Completada', msg, 'success');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error al asignar curso:', err);
      setErrorMsg(err.message || 'Error al procesar la asignación del curso técnico.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${
              isReassignment 
                ? 'bg-amber-50 text-amber-600'
                : 'bg-red-50 text-[#DA291C]'
            }`}>
              {isReassignment ? (
                <ArrowRightLeft className="w-6 h-6" />
              ) : (
                <BookOpen className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900">
                  {isReassignment ? 'Reasignar Curso Técnico' : 'Asignar Curso Técnico'}
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-[#DA291C]">
                  Super Admin CRM
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isReassignment 
                  ? 'Transfiere al colaborador a un nuevo ciclo o nivel de la Academia Técnica'
                  : 'Enrola colaboradores en un curso técnico y cohorte programada'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Previous Assignment Context Alert */}
        {isReassignment && prevCourseTitle && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Curso Anterior / Concluido:</span>
              <span className="font-black text-slate-900">{prevCourseTitle}</span>
            </div>
            <label className="flex items-center gap-2 mt-2 pt-2 border-t border-amber-200/60 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={archivePrevious}
                onChange={(e) => setArchivePrevious(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300"
              />
              <span className="text-slate-800 font-semibold">
                Archivar récord previo en el historial de constancias de RRHH (Recomendado)
              </span>
            </label>
          </div>
        )}

        {/* Selected Participants Chips */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            {targetParticipants.length === 1 
              ? 'Colaborador Objetivo' 
              : `Colaboradores Seleccionados (${targetParticipants.length})`}
          </label>
          <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
            {targetParticipants.map(p => (
              <div 
                key={p.card}
                className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-xs"
              >
                <div className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">
                  {p.name.charAt(0)}
                </div>
                <div className="leading-tight">
                  <span className="font-bold text-slate-800 block text-[11px]">{p.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">Ficha #{p.card}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Step 1: Select Course */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              1. Seleccionar Curso de la Academia Técnica
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#DA291C] cursor-pointer"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  📚 {c.title} ({c.durationDays || 5} días / {c.dailyHours || 4} hrs diarias) - {c.category || 'Técnico'}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Cohort */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                2. Seleccionar Cohorte / Horario Programado
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {availableCohorts.length} cohorte(s) para este curso
              </span>
            </div>

            {availableCohorts.length === 0 ? (
              <div className="p-5 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">No hay cohortes creadas para este curso.</p>
                <p>Crea primero una cohorte en la pestaña "Planificador & Rotación" para poder asignar participantes.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {availableCohorts.map(coh => {
                  const isSelected = selectedCohortId === coh.id;
                  const isScheduled = coh.status === 'scheduled';
                  const isInProgress = coh.status === 'in_progress';
                  const isCompleted = coh.status === 'completed';

                  return (
                    <div
                      key={coh.id}
                      onClick={() => setSelectedCohortId(coh.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-[#DA291C] bg-red-50/40 shadow-sm ring-1 ring-[#DA291C]'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-[#DA291C] bg-[#DA291C] text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">
                              {coh.groupName || 'Cohorte General'}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isInProgress 
                                ? 'bg-amber-100 text-amber-800'
                                : isScheduled 
                                  ? 'bg-blue-100 text-blue-800'
                                  : isCompleted 
                                    ? 'bg-slate-100 text-slate-600'
                                    : 'bg-red-100 text-red-800'
                            }`}>
                              {isInProgress ? 'En Curso' : isScheduled ? 'Programada' : isCompleted ? 'Concluida' : coh.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {coh.startDate} al {coh.endDate}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {coh.dailyTime || '08:00 AM - 12:00 PM'}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {coh.location || 'Laboratorio'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 text-[11px]">
                        <span className="font-bold text-slate-700 block">
                          Facilitador:
                        </span>
                        <span className="text-slate-500 truncate max-w-[120px] block">
                          {coh.facilitatorName || 'Por asignar'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedCohortId}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md shadow-red-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>
                {isSubmitting 
                  ? 'Guardando Asignación...' 
                  : isReassignment 
                    ? 'Confirmar Reasignación' 
                    : 'Confirmar Asignación'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
