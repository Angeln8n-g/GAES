import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  BookOpen, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Building2,
  Send,
  Layers,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { 
  Convocatoria, 
  TechnicalAcademyCourse, 
  TechnicalAcademyCohort, 
  Company, 
  TrainingEvent,
  ConvocatoriaStatus,
  ConvocatoriaSelectionMode
} from '../../types';
import { apiService } from '../../services/api';
import { AccessibleModal } from '../common/AccessibleModal';

interface ConvocatoriaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  convocatoriaToEdit?: Convocatoria | null;
  courses: TechnicalAcademyCourse[];
  cohorts: TechnicalAcademyCohort[];
  companies: Company[];
  events?: TrainingEvent[];
  onSuccess: () => void;
}

export const ConvocatoriaFormModal: React.FC<ConvocatoriaFormModalProps> = ({
  isOpen,
  onClose,
  convocatoriaToEdit = null,
  courses = [],
  cohorts = [],
  companies = [],
  events = [],
  onSuccess
}) => {
  if (!isOpen) return null;

  const isEdit = Boolean(convocatoriaToEdit);

  // Defaults de fechas
  const getDefaultDates = () => {
    const today = new Date();
    const appStart = today.toISOString().slice(0, 10);
    const appEnd = new Date(today);
    appEnd.setDate(today.getDate() + 14);
    return {
      start: appStart,
      end: appEnd.toISOString().slice(0, 10)
    };
  };

  const defaultDates = getDefaultDates();

  const [code, setCode] = useState<string>(
    convocatoriaToEdit?.code || `CONV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [title, setTitle] = useState<string>(convocatoriaToEdit?.title || '');
  const [description, setDescription] = useState<string>(convocatoriaToEdit?.description || '');
  const [trainingType, setTrainingType] = useState<'technical_academy' | 'general_event'>(
    convocatoriaToEdit?.trainingType || 'technical_academy'
  );
  const [courseId, setCourseId] = useState<string>(convocatoriaToEdit?.courseId || (courses[0]?.id || ''));
  const [cohortId, setCohortId] = useState<string>(convocatoriaToEdit?.cohortId || '');
  const [eventId, setEventId] = useState<string>(convocatoriaToEdit?.eventId || '');
  const [status, setStatus] = useState<ConvocatoriaStatus>(convocatoriaToEdit?.status || 'draft');
  const [applicationStartDate, setApplicationStartDate] = useState<string>(
    convocatoriaToEdit?.applicationStartDate || defaultDates.start
  );
  const [applicationEndDate, setApplicationEndDate] = useState<string>(
    convocatoriaToEdit?.applicationEndDate || defaultDates.end
  );
  const [trainingStartDate, setTrainingStartDate] = useState<string>(convocatoriaToEdit?.trainingStartDate || '');
  const [trainingEndDate, setTrainingEndDate] = useState<string>(convocatoriaToEdit?.trainingEndDate || '');
  const [modality, setModality] = useState<string>(convocatoriaToEdit?.modality || 'Presencial (Taller)');
  const [location, setLocation] = useState<string>(convocatoriaToEdit?.location || 'Laboratorio Técnico');
  const [totalQuota, setTotalQuota] = useState<number>(convocatoriaToEdit?.totalQuota || 15);
  const [selectionMode, setSelectionMode] = useState<ConvocatoriaSelectionMode>(
    convocatoriaToEdit?.selectionMode || 'review_required'
  );
  const [targetAudience, setTargetAudience] = useState<string>(convocatoriaToEdit?.targetAudience || '');
  const [prerequisites, setPrerequisites] = useState<string>(convocatoriaToEdit?.prerequisites || '');
  const [allowSelfApplication, setAllowSelfApplication] = useState<boolean>(
    convocatoriaToEdit?.allowSelfApplication !== undefined ? convocatoriaToEdit.allowSelfApplication : true
  );
  const [allowSupervisorNomination, setAllowSupervisorNomination] = useState<boolean>(
    convocatoriaToEdit?.allowSupervisorNomination !== undefined ? convocatoriaToEdit.allowSupervisorNomination : true
  );

  // Cupos por empresa
  const [companyQuotas, setCompanyQuotas] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtrar cohortes del curso seleccionado
  const availableCohorts = cohorts.filter(c => !courseId || c.courseId === courseId);

  useEffect(() => {
    if (convocatoriaToEdit) {
      setCode(convocatoriaToEdit.code);
      setTitle(convocatoriaToEdit.title);
      setDescription(convocatoriaToEdit.description || '');
      setTrainingType(convocatoriaToEdit.trainingType);
      setCourseId(convocatoriaToEdit.courseId || '');
      setCohortId(convocatoriaToEdit.cohortId || '');
      setEventId(convocatoriaToEdit.eventId || '');
      setStatus(convocatoriaToEdit.status);
      setApplicationStartDate(convocatoriaToEdit.applicationStartDate);
      setApplicationEndDate(convocatoriaToEdit.applicationEndDate);
      setTrainingStartDate(convocatoriaToEdit.trainingStartDate || '');
      setTrainingEndDate(convocatoriaToEdit.trainingEndDate || '');
      setModality(convocatoriaToEdit.modality || 'Presencial (Taller)');
      setLocation(convocatoriaToEdit.location || '');
      setTotalQuota(convocatoriaToEdit.totalQuota);
      setSelectionMode(convocatoriaToEdit.selectionMode);
      setTargetAudience(convocatoriaToEdit.targetAudience || '');
      setPrerequisites(convocatoriaToEdit.prerequisites || '');
      setAllowSelfApplication(convocatoriaToEdit.allowSelfApplication);
      setAllowSupervisorNomination(convocatoriaToEdit.allowSupervisorNomination);

      const qMap: Record<string, number> = {};
      (convocatoriaToEdit.companyQuotas || []).forEach(q => {
        qMap[q.companyId] = q.allocatedQuota;
      });
      setCompanyQuotas(qMap);
    } else {
      const qMap: Record<string, number> = {};
      companies.forEach(c => {
        qMap[c.id] = 0;
      });
      setCompanyQuotas(qMap);
    }
  }, [convocatoriaToEdit, companies]);

  // Al cambiar cohorte, sincronizar fechas y cupos si están vacíos
  const handleCohortChange = (selectedCohortId: string) => {
    setCohortId(selectedCohortId);
    const coh = cohorts.find(c => c.id === selectedCohortId);
    if (coh) {
      if (coh.startDate) setTrainingStartDate(coh.startDate);
      if (coh.endDate) setTrainingEndDate(coh.endDate);
      if (coh.location) setLocation(coh.location);
      if (coh.capacity) setTotalQuota(coh.capacity);
      if (coh.companyQuotas && coh.companyQuotas.length > 0) {
        const qMap: Record<string, number> = {};
        coh.companyQuotas.forEach(q => {
          qMap[q.companyId] = q.allocatedQuota;
        });
        setCompanyQuotas(qMap);
      }
    }
  };

  const totalAllocatedQuotas = Object.values(companyQuotas).reduce((acc, v) => acc + (Number(v) || 0), 0);

  const handleDistributeEqually = () => {
    if (companies.length === 0 || totalQuota <= 0) return;
    const share = Math.floor(totalQuota / companies.length);
    const remainder = totalQuota % companies.length;
    const newQuotas: Record<string, number> = {};
    companies.forEach((c, idx) => {
      newQuotas[c.id] = share + (idx === 0 ? remainder : 0);
    });
    setCompanyQuotas(newQuotas);
  };

  const handleQuotaChange = (cId: string, val: number) => {
    setCompanyQuotas(prev => ({
      ...prev,
      [cId]: Math.max(0, val)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || !code.trim()) {
      setErrorMsg('El título y código de la convocatoria son obligatorios.');
      return;
    }

    if (!applicationStartDate || !applicationEndDate) {
      setErrorMsg('Debe definir el período de apertura y cierre de postulaciones.');
      return;
    }

    if (totalQuota <= 0) {
      setErrorMsg('El cupo total ofertado debe ser mayor a 0.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedQuotas = Object.entries(companyQuotas)
        .filter(([_, q]) => Number(q) > 0)
        .map(([comp, q]) => ({
          companyId: comp,
          allocatedQuota: Number(q)
        }));

      const payload = {
        code: code.trim(),
        title: title.trim(),
        description: description.trim(),
        trainingType,
        courseId: trainingType === 'technical_academy' ? (courseId || null) : null,
        cohortId: trainingType === 'technical_academy' ? (cohortId || null) : null,
        eventId: trainingType === 'general_event' ? (eventId || null) : null,
        status,
        applicationStartDate,
        applicationEndDate,
        trainingStartDate: trainingStartDate || null,
        trainingEndDate: trainingEndDate || null,
        modality,
        location: location.trim(),
        totalQuota: Number(totalQuota),
        selectionMode,
        targetAudience: targetAudience.trim(),
        prerequisites: prerequisites.trim(),
        allowSelfApplication,
        allowSupervisorNomination,
        companyIds: formattedQuotas.map(q => q.companyId),
        companyQuotas: formattedQuotas
      };

      if (isEdit && convocatoriaToEdit) {
        await apiService.updateConvocatoria(convocatoriaToEdit.id, payload);
      } else {
        await apiService.createConvocatoria(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error al guardar convocatoria:', err);
      setErrorMsg(err.message || 'Error al procesar la convocatoria.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={isEdit ? 'Editar Convocatoria' : 'Nueva Convocatoria de Capacitación'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col"
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
                {isEdit ? 'Modificar Registro' : 'Lanzamiento de Formación'}
              </span>
              <h2 className="text-base font-bold text-white mt-0.5">
                {isEdit ? 'Editar Convocatoria Oficial' : 'Crear Nueva Convocatoria de Capacitación'}
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Fila 1: Código, Estado y Modo de Selección */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Código Oficial *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CONV-2026-001"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Estado *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ConvocatoriaStatus)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
              >
                <option value="draft">Borrador (Oculta)</option>
                <option value="open">Abierta (Recibiendo Postulaciones)</option>
                <option value="closed">Cerrada (En Selección)</option>
                <option value="in_progress">En Ejecución (Entrenamiento en curso)</option>
                <option value="completed">Finalizada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Modo de Selección *
              </label>
              <select
                value={selectionMode}
                onChange={(e) => setSelectionMode(e.target.value as ConvocatoriaSelectionMode)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
              >
                <option value="review_required">Revisión Administrativa (Aprobación)</option>
                <option value="direct">Aprobación Directa por Cupo</option>
              </select>
            </div>
          </div>

          {/* Fila 2: Título de la Convocatoria */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Título de la Convocatoria *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Convocatoria Certificación en Fibra Óptica GPON & Fusión"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
              required
            />
          </div>

          {/* Fila 3: Tipo de Entrenamiento y Curso / Cohorte vinculada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-red-500" />
                Curso Técnico Vinculado *
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
              >
                <option value="">-- Seleccionar Curso Técnico --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.code || c.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-500" />
                Cohorte / Semana Asociada
              </label>
              <select
                value={cohortId}
                onChange={(e) => handleCohortChange(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
              >
                <option value="">-- Sin Cohorte Directa (Crear o asignar luego) --</option>
                {availableCohorts.map(coh => (
                  <option key={coh.id} value={coh.id}>
                    Semana {coh.weekNumber || ''} ({coh.startDate} al {coh.endDate}) - {coh.location}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fila 4: Período de Postulación & Fechas de Entrenamiento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fechas de Postulación */}
            <div className="p-3.5 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 space-y-2">
              <span className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider block">
                Período de Postulaciones (Abierta)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Fecha Inicio *</label>
                  <input
                    type="date"
                    value={applicationStartDate}
                    onChange={(e) => setApplicationStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Fecha Límite *</label>
                  <input
                    type="date"
                    value={applicationEndDate}
                    onChange={(e) => setApplicationEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Fechas de Impartición del Entrenamiento */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Fechas del Curso (Impartición)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Inicio Curso</label>
                  <input
                    type="date"
                    value={trainingStartDate}
                    onChange={(e) => setTrainingStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Fin Curso</label>
                  <input
                    type="date"
                    value={trainingEndDate}
                    onChange={(e) => setTrainingEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fila 5: Modalidad, Ubicación y Cupo Total */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Modalidad
              </label>
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
              >
                <option value="Presencial (Taller)">Presencial (Taller / Lab)</option>
                <option value="Presencial (Campo)">Presencial (Campo)</option>
                <option value="Virtual (Teams)">Virtual (Microsoft Teams)</option>
                <option value="Híbrido">Híbrido</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Ubicación / Sede
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej. Taller Central Planta Externa"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Cupos Totales Ofertados *
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={totalQuota}
                onChange={(e) => setTotalQuota(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                required
              />
            </div>
          </div>

          {/* Fila 6: Matriz de Cupos por Empresa */}
          {companies.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                      Distribución de Cupos por Empresa
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Asigne el número de plazas garantizadas para cada contratista o filial.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    totalAllocatedQuotas === totalQuota
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : totalAllocatedQuotas > totalQuota
                      ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  }`}>
                    {totalAllocatedQuotas} / {totalQuota} cupos distribuidos
                  </span>
                  <button
                    type="button"
                    onClick={handleDistributeEqually}
                    className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:text-red-700 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900/50 transition-colors cursor-pointer"
                  >
                    Reparto Equitativo
                  </button>
                </div>
              </div>

              {totalAllocatedQuotas > totalQuota && (
                <div className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 p-2 rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>La suma de cupos ({totalAllocatedQuotas}) supera los cupos totales ({totalQuota}).</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                {companies.map(comp => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      {comp.logoUrl ? (
                        <img src={comp.logoUrl} alt={comp.name} className="w-5 h-5 rounded-md object-contain shrink-0" />
                      ) : (
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={comp.name}>
                        {comp.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-400">Cupo:</span>
                      <input
                        type="number"
                        min={0}
                        max={totalQuota}
                        value={companyQuotas[comp.id] ?? 0}
                        onChange={(e) => handleQuotaChange(comp.id, Number(e.target.value))}
                        className="w-16 px-2 py-1 text-xs font-bold text-center rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fila 7: Permisos de Postulación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allowSelfApplication}
                onChange={(e) => setAllowSelfApplication(e.target.checked)}
                className="mt-0.5 rounded text-red-600 focus:ring-red-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 dark:text-white block">
                  Permitir Auto-postulación
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                  Los colaboradores podrán postularse de forma independiente desde su portal.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allowSupervisorNomination}
                onChange={(e) => setAllowSupervisorNomination(e.target.checked)}
                className="mt-0.5 rounded text-red-600 focus:ring-red-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 dark:text-white block">
                  Permitir Nominación por Supervisores
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                  Los líderes de área podrán postular directamente a miembros de su cuadrilla.
                </span>
              </div>
            </label>
          </div>

          {/* Fila 8: Público Objetivo & Prerrequisitos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Público Objetivo / Perfil
              </label>
              <textarea
                rows={2}
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Ej. Técnicos de campo, instaladores GPON..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Prerrequisitos / Requisitos
              </label>
              <textarea
                rows={2}
                value={prerequisites}
                onChange={(e) => setPrerequisites(e.target.value)}
                placeholder="Ej. Experiencia mínima de 6 meses, curso de seguridad básico..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Descripción Detallada */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Descripción e Instrucciones de la Convocatoria
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique los objetivos del entrenamiento, lineamientos y consideraciones..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#DA291C] hover:bg-red-700 rounded-xl shadow-md shadow-red-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Guardando...' : (isEdit ? 'Actualizar Convocatoria' : 'Publicar Convocatoria')}</span>
          </button>
        </div>
      </div>
    </AccessibleModal>
  );
};
