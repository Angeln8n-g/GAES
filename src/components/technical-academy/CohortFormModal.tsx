import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  UserCheck, 
  BookOpen, 
  MapPin, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  RotateCw,
  Sparkles,
  Building2
} from 'lucide-react';
import { 
  TechnicalAcademyCohort, 
  TechnicalAcademyCourse, 
  ParticipantGroup, 
  UserAccount,
  Company,
  TrainingEvent
} from '../../types';
import { apiService } from '../../services/api';
import { AccessibleModal } from '../common/AccessibleModal';

interface CohortFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: TechnicalAcademyCourse[];
  groups: ParticipantGroup[];
  users: UserAccount[];
  companies?: Company[];
  events?: TrainingEvent[];
  cohortToEdit?: TechnicalAcademyCohort | null;
  isAdminOrSuper?: boolean;
  onSuccess: () => void;
}

export const CohortFormModal: React.FC<CohortFormModalProps> = ({
  isOpen,
  onClose,
  courses,
  groups,
  users,
  companies = [],
  events = [],
  cohortToEdit = null,
  isAdminOrSuper = false,
  onSuccess
}) => {
  if (!isOpen || !isAdminOrSuper) return null;

  const isEdit = Boolean(cohortToEdit);

  // Helper para obtener próximo lunes y viernes
  const getDefaultDates = () => {
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = (8 - day) % 7 || 7; // Próximo lunes
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + (day === 1 ? 0 : diffToMonday));
    
    const nextFriday = new Date(nextMonday);
    nextFriday.setDate(nextMonday.getDate() + 4);

    return {
      start: nextMonday.toISOString().slice(0, 10),
      end: nextFriday.toISOString().slice(0, 10)
    };
  };

  const defaultDates = getDefaultDates();

  const [courseId, setCourseId] = useState<string>(cohortToEdit?.courseId || (courses[0]?.id || ''));
  const [groupId, setGroupId] = useState<string>(cohortToEdit?.groupId || '');
  const [facilitatorId, setFacilitatorId] = useState<string>(cohortToEdit?.facilitatorId || '');
  const [customFacilitatorName, setCustomFacilitatorName] = useState<string>(cohortToEdit?.facilitatorName || '');
  const [customFacilitatorEmail, setCustomFacilitatorEmail] = useState<string>(cohortToEdit?.facilitatorEmail || '');
  const [startDate, setStartDate] = useState<string>(cohortToEdit?.startDate || defaultDates.start);
  const [endDate, setEndDate] = useState<string>(cohortToEdit?.endDate || defaultDates.end);
  const [dailyTime, setDailyTime] = useState<string>(cohortToEdit?.dailyTime || '08:00 AM - 12:00 PM');
  const [location, setLocation] = useState<string>(cohortToEdit?.location || 'Laboratorio Técnico');
  const [capacity, setCapacity] = useState<number>(cohortToEdit?.capacity || 20);
  const [dailyPin, setDailyPin] = useState<string>(cohortToEdit?.dailyPin || Math.floor(1000 + Math.random() * 9000).toString());
  const [companyId, setCompanyId] = useState<string>(cohortToEdit?.companyId || 'emp_kasino');
  const [autoEnroll, setAutoEnroll] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>(cohortToEdit?.notes || '');
  const [cohortQuotas, setCohortQuotas] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (cohortToEdit) {
      setCourseId(cohortToEdit.courseId);
      setGroupId(cohortToEdit.groupId || '');
      setFacilitatorId(cohortToEdit.facilitatorId || '');
      setCustomFacilitatorName(cohortToEdit.facilitatorName || '');
      setCustomFacilitatorEmail(cohortToEdit.facilitatorEmail || '');
      setStartDate(cohortToEdit.startDate);
      setEndDate(cohortToEdit.endDate);
      setDailyTime(cohortToEdit.dailyTime);
      setLocation(cohortToEdit.location);
      setCapacity(cohortToEdit.capacity);
      setDailyPin(cohortToEdit.dailyPin);
      setCompanyId(cohortToEdit.companyId);
      setNotes(cohortToEdit.notes || '');

      // Cargar cupos por empresa
      if (cohortToEdit.companyQuotas && cohortToEdit.companyQuotas.length > 0) {
        const qMap: Record<string, number> = {};
        cohortToEdit.companyQuotas.forEach(q => {
          qMap[q.companyId] = q.allocatedQuota;
        });
        setCohortQuotas(qMap);
      } else {
        apiService.getCohortCompanyQuotas(cohortToEdit.id)
          .then(qs => {
            const qMap: Record<string, number> = {};
            qs.forEach(q => {
              qMap[q.companyId] = q.allocatedQuota;
            });
            setCohortQuotas(qMap);
          })
          .catch(() => {});
      }
    } else {
      if (courses.length > 0 && !courseId) {
        setCourseId(courses[0].id);
        if (courses[0].location) setLocation(courses[0].location);
      }
      const qMap: Record<string, number> = {};
      companies.forEach(c => {
        qMap[c.id] = 0;
      });
      setCohortQuotas(qMap);
    }
  }, [cohortToEdit, courses, companies]);

  const totalAllocatedQuotas = Object.values(cohortQuotas).reduce((acc, v) => acc + (Number(v) || 0), 0);

  const handleDistributeEqually = () => {
    if (companies.length === 0 || capacity <= 0) return;
    const share = Math.floor(capacity / companies.length);
    const remainder = capacity % companies.length;
    const newQuotas: Record<string, number> = {};
    companies.forEach((c, idx) => {
      newQuotas[c.id] = share + (idx === 0 ? remainder : 0);
    });
    setCohortQuotas(newQuotas);
  };

  const handleQuotaChange = (cId: string, val: number) => {
    setCohortQuotas(prev => ({
      ...prev,
      [cId]: Math.max(0, val)
    }));
  };

  // Cuando cambia el curso, sugerir su ubicación por defecto
  const handleCourseChange = (id: string) => {
    setCourseId(id);
    const selected = courses.find(c => c.id === id);
    if (selected && selected.location) {
      setLocation(selected.location);
    }
  };

  const eligibleFacilitators = users.filter(u => 
    u.role === 'Super Administrador' || 
    u.role === 'Administrador / Editor' || 
    u.role === 'Líder de Área / Supervisor' || 
    u.role === 'Evaluador / Tutor' ||
    u.role === 'Evaluador / Tutor OJT'
  );

  const handleFacilitatorSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFacilitatorId(val);
    if (val === 'custom') {
      setCustomFacilitatorName('');
      setCustomFacilitatorEmail('');
    } else if (val) {
      const u = users.find(user => user.id === val);
      if (u) {
        setCustomFacilitatorName(u.name);
        setCustomFacilitatorEmail(u.email);
      }
    } else {
      setCustomFacilitatorName('');
      setCustomFacilitatorEmail('');
    }
  };

  // Calcular número de semana ISO
  const getWeekNumber = (dateString: string) => {
    const date = new Date(dateString);
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (!courseId || !startDate || !endDate) {
        throw new Error('Por favor complete los campos requeridos (Curso, Fecha de Inicio y Fin).');
      }

      const selectedGroup = groups.find(g => g.id === groupId);
      const groupName = selectedGroup ? selectedGroup.name : (groupId ? cohortToEdit?.groupName : '');

      let facName = customFacilitatorName;
      let facEmail = customFacilitatorEmail;
      if (facilitatorId && facilitatorId !== 'custom') {
        const u = users.find(user => user.id === facilitatorId);
        if (u) {
          facName = u.name;
          facEmail = u.email;
        }
      }

      const weekNumber = getWeekNumber(startDate);
      const year = new Date(startDate).getFullYear();
      const selectedCourse = courses.find(c => c.id === courseId);

      const formattedQuotas = Object.entries(cohortQuotas)
        .filter(([_, q]) => Number(q) > 0)
        .map(([comp, q]) => ({
          companyId: comp,
          allocatedQuota: Number(q)
        }));

      await apiService.saveTechnicalCohort({
        id: cohortToEdit?.id,
        courseId,
        eventId: cohortToEdit?.eventId || selectedCourse?.eventId || null,
        groupId: groupId || null,
        groupName: groupName || '',
        facilitatorId: facilitatorId === 'custom' ? null : (facilitatorId || null),
        facilitatorName: facName || 'Sin Facilitador Asignado',
        facilitatorEmail: facEmail || '',
        startDate,
        endDate,
        weekNumber,
        year,
        dailyTime,
        location,
        capacity: Number(capacity) || 20,
        dailyPin: dailyPin.trim() || '2026',
        companyId,
        notes,
        autoEnrollGroupMembers: autoEnroll,
        companyQuotas: formattedQuotas
      });

      if (cohortToEdit?.id && formattedQuotas.length > 0) {
        await apiService.updateCohortCompanyQuotas(cohortToEdit.id, formattedQuotas).catch(() => {});
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la cohorte técnica');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={isEdit ? 'Modificar Cohorte de Academia Técnica' : 'Programar Semana de Capacitación Recurrente'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-md shadow-red-600/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30">
                {isEdit ? 'Editar Programación' : 'Nueva Cohorte Semanal'}
              </span>
              <h2 className="text-base font-bold text-white mt-0.5">
                {isEdit ? 'Modificar Cohorte de Academia Técnica' : 'Programar Semana de Capacitación Recurrente'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
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

          {/* 1. Curso Técnico */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-red-600" />
              Curso Técnico del Catálogo *
            </label>
            <select
              value={courseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800 dark:text-white bg-white dark:bg-slate-800"
              required
            >
              {courses.length === 0 ? (
                <option value="">No hay cursos registrados en el catálogo</option>
              ) : (
                courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.category} • {c.dailyHours} hrs/día • {c.durationDays} días)
                  </option>
                ))
              )}
            </select>
            {(() => {
              const selectedCourse = courses.find(c => c.id === courseId);
              const linkedEvent = events?.find(e => e.id === selectedCourse?.eventId || e.id === cohortToEdit?.eventId);
              if (linkedEvent) {
                return (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Vinculado a Capacitación Creada: <strong className="text-slate-900 dark:text-white">{linkedEvent.title}</strong></span>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* 2. Grupo Técnico & Facilitador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-red-600" />
                Grupo Técnico Asignado
              </label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800 dark:text-white bg-white dark:bg-slate-800"
              >
                <option value="">-- Sin Grupo Específico (Abierto) --</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.memberCards?.length || 0} miembros)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-red-600" />
                Facilitador / Instructor
              </label>
              <select
                value={facilitatorId}
                onChange={handleFacilitatorSelect}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800 dark:text-white bg-white dark:bg-slate-800"
              >
                <option value="">-- Sin Facilitador Asignado --</option>
                {eligibleFacilitators.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.email})
                  </option>
                ))}
                <option value="custom">Otro facilitador (Manual)...</option>
              </select>
            </div>
          </div>

          {/* Facilitador Manual */}
          {facilitatorId === 'custom' && (
            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Nombre Facilitador</label>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={customFacilitatorName}
                  onChange={(e) => setCustomFacilitatorName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Correo Facilitador</label>
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={customFacilitatorEmail}
                  onChange={(e) => setCustomFacilitatorEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          )}

          {/* Fechas de inicio y fin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                Fecha de Inicio *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white bg-white dark:bg-slate-800"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                Fecha de Finalización *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white bg-white dark:bg-slate-800"
                required
              />
            </div>
          </div>

          {/* Horario y Lugar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                Horario Diario
              </label>
              <input
                type="text"
                value={dailyTime}
                onChange={(e) => setDailyTime(e.target.value)}
                placeholder="Ej. 08:00 AM - 12:00 PM"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                Ubicación / Taller
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej. Laboratorio Técnico Planta Externa"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Capacidad y PIN diario */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Capacidad Máxima (Técnicos)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-red-600" />
                PIN Diario de Auto-marcado
              </label>
              <input
                type="text"
                maxLength={6}
                value={dailyPin}
                onChange={(e) => setDailyPin(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold tracking-widest rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Distribución de Cupos por Empresa */}
          {companies.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
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
                      Asigne el límite máximo de participantes permitidos para cada contratista / filial.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    totalAllocatedQuotas === capacity
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : totalAllocatedQuotas > capacity
                      ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  }`}>
                    {totalAllocatedQuotas} / {capacity} cupos asignados
                  </span>
                  <button
                    type="button"
                    onClick={handleDistributeEqually}
                    className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:text-red-700 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900/50 transition-colors cursor-pointer"
                  >
                    Equitativo
                  </button>
                </div>
              </div>

              {totalAllocatedQuotas > capacity && (
                <div className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 p-2 rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>La suma de cupos asignados ({totalAllocatedQuotas}) supera la capacidad total de la cohorte ({capacity}).</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
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
                      <span className="text-[10px] text-slate-400 font-medium">Cupo:</span>
                      <input
                        type="number"
                        min={0}
                        max={capacity}
                        value={cohortQuotas[comp.id] ?? 0}
                        onChange={(e) => handleQuotaChange(comp.id, Number(e.target.value))}
                        className="w-16 px-2 py-1 text-xs font-bold text-center rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checkbox auto-enroll */}
          {groupId && !isEdit && (
            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoEnroll}
                onChange={(e) => setAutoEnroll(e.target.checked)}
                className="mt-0.5 rounded text-red-600 focus:ring-red-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 dark:text-white block">
                  Matricular automáticamente los miembros del grupo
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                  Los colaboradores del grupo seleccionado quedarán inmediatamente habilitados en la matriz diaria de asistencia.
                </span>
              </div>
            </label>
          )}

          {/* Notas */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Observaciones / Prerrequisitos de la Semana
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Llevar equipo de protección personal (EPP) y medidor de potencia óptica..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm shadow-red-600/20 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isEdit ? 'Actualizar Cohorte' : 'Programar Cohorte'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AccessibleModal>
  );
};
