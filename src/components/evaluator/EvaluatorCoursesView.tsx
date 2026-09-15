import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, 
  Search, 
  QrCode, 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  Layers, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Maximize2, 
  Sparkles,
  Award,
  Video,
  BookOpen,
  Filter,
  Trash2,
  UserMinus
} from 'lucide-react';
import { TrainingEvent, Participant, UserAccount, TechnicalAcademyCohort } from '../../types';
import { AttendeesModal } from '../admin/AttendeesModal';
import { exportEventGradesToExcel } from '../../utils/excelUtils';
import { TechnicalCohortManagerModal } from './TechnicalCohortManagerModal';
import { TechnicalQrModal } from '../technical-academy/TechnicalQrModal';

interface EvaluatorCoursesViewProps {
  events: TrainingEvent[];
  participants: Participant[];
  currentUser: UserAccount | null;
  isSuperAdmin?: boolean;
  technicalCohorts?: TechnicalAcademyCohort[];
  onRefreshTechnicalCohorts?: () => Promise<void>;
  onConfirmAttendance: (eventId: string, date: string, time: string, email: string, type?: 'checkin' | 'checkout') => Promise<void>;
  onRevertAttendance?: (eventId: string, date: string, time: string, email: string, type?: 'checkout' | 'all') => Promise<void>;
  onSaveEvent?: (event: TrainingEvent) => Promise<void>;
  onDeleteEvent?: (eventId: string) => Promise<void>;
  onCancelRegistration?: (eventId: string, date: string, time: string, email: string, isSupervisorOrAdmin?: boolean, force?: boolean) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const EvaluatorCoursesView: React.FC<EvaluatorCoursesViewProps> = ({
  events,
  participants,
  currentUser,
  isSuperAdmin = false,
  technicalCohorts = [],
  onRefreshTechnicalCohorts,
  onConfirmAttendance,
  onRevertAttendance,
  onSaveEvent,
  onDeleteEvent,
  onCancelRegistration,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'modular' | 'standard' | 'technical'>('all');
  const [selectedModalEvent, setSelectedModalEvent] = useState<TrainingEvent | null>(null);
  const [isDirectProjector, setIsDirectProjector] = useState(false);
  const [selectedTechnicalCohort, setSelectedTechnicalCohort] = useState<TechnicalAcademyCohort | null>(null);
  const [isDirectProjectorCohort, setIsDirectProjectorCohort] = useState<TechnicalAcademyCohort | null>(null);
  const [courseToDeleteAssignment, setCourseToDeleteAssignment] = useState<TrainingEvent | null>(null);
  const [deleteAssignmentMode, setDeleteAssignmentMode] = useState<'unassign_evaluator' | 'delete_event'>('unassign_evaluator');
  const [isProcessingDeleteAssignment, setIsProcessingDeleteAssignment] = useState<boolean>(false);

  // Filtrar eventos asignados al evaluador actual (o todos si es SuperAdmin)
  const assignedEvents = useMemo(() => {
    if (!currentUser) return [];

    return events.filter(event => {
      if (isSuperAdmin) return true;

      const userEmail = (currentUser.email || '').toLowerCase();
      const userName = (currentUser.name || '').toLowerCase();
      const userId = currentUser.id;

      const isOjtAssigned = 
        (event.ojtEvaluatorId && event.ojtEvaluatorId === userId) ||
        (event.ojtEvaluatorEmail && event.ojtEvaluatorEmail.toLowerCase() === userEmail) ||
        (event.ojtEvaluatorName && event.ojtEvaluatorName.toLowerCase() === userName);

      const isInstructor = (event.instructor || '').toLowerCase() === userName;

      return isOjtAssigned || isInstructor;
    });
  }, [events, currentUser, isSuperAdmin]);

  // Filtrar cohortes de Academia Técnica asignadas al facilitador actual (o todas si es SuperAdmin)
  const assignedTechnicalCohorts = useMemo(() => {
    if (!currentUser || !technicalCohorts) return [];

    return technicalCohorts.filter(cohort => {
      if (isSuperAdmin) return true;

      const userEmail = (currentUser.email || '').toLowerCase().trim();
      const userName = (currentUser.name || '').toLowerCase().trim();
      const userId = currentUser.id;

      const isFacilitator =
        (cohort.facilitatorId && cohort.facilitatorId === userId) ||
        (cohort.facilitatorEmail && cohort.facilitatorEmail.toLowerCase().trim() === userEmail) ||
        (cohort.facilitatorName && cohort.facilitatorName.toLowerCase().trim() === userName);

      return isFacilitator;
    });
  }, [technicalCohorts, currentUser, isSuperAdmin]);

  // Aplicar búsqueda y filtros a eventos
  const filteredEvents = useMemo(() => {
    if (filterType === 'technical') return [];

    return assignedEvents.filter(event => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = 
        !q ||
        event.title.toLowerCase().includes(q) ||
        event.category.toLowerCase().includes(q) ||
        (event.description || '').toLowerCase().includes(q) ||
        (event.instructor || '').toLowerCase().includes(q);

      const hasModules = Boolean(event.modules && event.modules.length > 0);
      const matchesType = 
        filterType === 'all' ||
        (filterType === 'modular' && hasModules) ||
        (filterType === 'standard' && !hasModules);

      return matchesQuery && matchesType;
    });
  }, [assignedEvents, searchQuery, filterType]);

  // Aplicar búsqueda y filtros a cohortes técnicas
  const filteredTechnicalCohorts = useMemo(() => {
    if (filterType === 'modular' || filterType === 'standard') return [];

    return assignedTechnicalCohorts.filter(cohort => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = 
        !q ||
        cohort.courseTitle.toLowerCase().includes(q) ||
        cohort.courseCategory.toLowerCase().includes(q) ||
        (cohort.groupName || '').toLowerCase().includes(q) ||
        (cohort.location || '').toLowerCase().includes(q) ||
        (cohort.facilitatorName || '').toLowerCase().includes(q);

      const matchesType = filterType === 'all' || filterType === 'technical';
      return matchesQuery && matchesType;
    });
  }, [assignedTechnicalCohorts, searchQuery, filterType]);

  // Métricas rápidas
  const metrics = useMemo(() => {
    let totalEnrolled = 0;
    let totalAttended = 0;
    let totalModular = 0;

    assignedEvents.forEach(evt => {
      if (evt.modules && evt.modules.length > 0) totalModular++;
      (evt.schedule || []).forEach(sch => {
        (sch.slots || []).forEach(slot => {
          totalEnrolled += (slot.attendees || []).length;
          totalAttended += (slot.attendedList || []).length;
        });
      });
    });

    let technicalEnrolled = 0;
    assignedTechnicalCohorts.forEach(coh => {
      technicalEnrolled += (coh.enrolledCount || 0);
    });

    const totalCourses = assignedEvents.length + assignedTechnicalCohorts.length;
    const allEnrolled = totalEnrolled + technicalEnrolled;
    const attendanceRate = totalEnrolled > 0 ? Math.round((totalAttended / totalEnrolled) * 100) : 0;

    return {
      totalCourses,
      totalModular,
      totalEnrolled: allEnrolled,
      totalAttended,
      attendanceRate,
      technicalCount: assignedTechnicalCohorts.length
    };
  }, [assignedEvents, assignedTechnicalCohorts]);

  // Handler para abrir modal de gestión
  const handleOpenManager = (event: TrainingEvent, projectorMode = false) => {
    setSelectedModalEvent(event);
    setIsDirectProjector(projectorMode);
  };

  // Handler para exportar libro de calificaciones
  const handleExportGrades = (event: TrainingEvent) => {
    try {
      exportEventGradesToExcel(event, participants);
      onShowToast('Libro descargado', `Se exportaron las calificaciones de "${event.title}" a Excel.`, 'success');
    } catch (err) {
      onShowToast('Error', 'No se pudo exportar el libro de calificaciones.', 'error');
    }
  };

  // Evento sincronizado actualmente abierto en modal
  const activeModalEvent = useMemo(() => {
    if (!selectedModalEvent) return null;
    return events.find(e => e.id === selectedModalEvent.id) || selectedModalEvent;
  }, [events, selectedModalEvent]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      
      {/* Encabezado Principal */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-red-500/10 via-rose-500/5 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#DA291C] mb-2">
              <span className="p-1 rounded-md bg-red-100/70 text-[#DA291C]">
                <GraduationCap className="w-4 h-4" />
              </span>
              <span>Portal de Facilitación & Tutoría OJT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Cursos Asignados & Calificación Modular
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Gestiona el pase de lista presencial mediante proyección QR en pantalla de sala, registra asistencia manual y califica el progreso modular continuo de los participantes.
            </p>
          </div>

          {currentUser && (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 px-4 py-3 rounded-2xl shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#DA291C] to-red-600 flex items-center justify-center text-white font-black shadow-sm text-sm">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'E'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500 font-medium">{currentUser.email}</p>
                <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full text-[9px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                  {currentUser.role}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tarjetas de Métricas de Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cursos Asignados</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-slate-900">{metrics.totalCourses}</span>
              <span className="text-xs font-semibold text-slate-400">capacitaciones</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Con Estructura Modular</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-[#DA291C]">{metrics.totalModular}</span>
              <span className="text-xs font-semibold text-slate-400">con submódulos</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Participantes Inscritos</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-slate-900">{metrics.totalEnrolled}</span>
              <span className="text-xs font-semibold text-slate-400">colaboradores</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tasa de Asistencia</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-emerald-600">{metrics.attendanceRate}%</span>
              <span className="text-xs font-semibold text-slate-400">({metrics.totalAttended} presentes)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por curso, temática, categoría o modalidad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 shrink-0 overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterType === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({metrics.totalCourses})
          </button>
          {assignedTechnicalCohorts.length > 0 && (
            <button
              onClick={() => setFilterType('technical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                filterType === 'technical'
                  ? 'bg-white text-[#DA291C] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Academia Técnica ({assignedTechnicalCohorts.length})</span>
            </button>
          )}
          <button
            onClick={() => setFilterType('modular')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              filterType === 'modular'
                ? 'bg-white text-[#DA291C] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3 h-3 text-[#DA291C]" />
            <span>Modulares ({metrics.totalModular})</span>
          </button>
          <button
            onClick={() => setFilterType('standard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterType === 'standard'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Estándar ({assignedEvents.length - metrics.totalModular})
          </button>
        </div>
      </div>

      {/* Listado de Cursos Asignados (Academia Técnica + Eventos OJT) */}
      {filteredEvents.length > 0 || filteredTechnicalCohorts.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Tarjetas de Cohortes de Academia Técnica Asignadas al Facilitador */}
          {filteredTechnicalCohorts.map(cohort => {
            const todayStr = new Date().toISOString().slice(0, 10);
            const isFuture = cohort.startDate > todayStr;
            const isToday = cohort.startDate <= todayStr && cohort.endDate >= todayStr;

            return (
              <div 
                key={`tech-${cohort.id}`}
                className="bg-white rounded-3xl border border-amber-200/90 shadow-xs hover:shadow-md transition-all p-5 sm:p-6 flex flex-col justify-between group"
              >
                <div>
                  {/* Badges superiores */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        Academia Técnica
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {cohort.location || 'Taller Principal'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 border ${
                        isToday
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : isFuture
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <Calendar className="w-3 h-3" />
                        <span>{isToday ? 'En Curso Hoy' : isFuture ? 'Próxima Cohorte' : 'Concluida'}</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        {cohort.groupName || 'Grupo General'}
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      PIN: {cohort.dailyPin || '2026'}
                    </span>
                  </div>

                  {/* Título y Categoría */}
                  <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-[#DA291C] transition-colors line-clamp-1">
                    {cohort.courseTitle}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    Especialidad: <strong>{cohort.courseCategory}</strong> • Horario: <strong>{cohort.dailyTime}</strong> ({cohort.dailyHours}h/día, {cohort.durationDays} días)
                  </p>

                  {/* Detalles de fechas y participantes */}
                  <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Fechas de Cohorte:</span>
                      </span>
                      <span className="font-bold text-slate-900">
                        {cohort.startDate} al {cohort.endDate}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Técnicos Matriculados:</span>
                      </span>
                      <span className="font-bold text-slate-900">
                        {cohort.enrolledCount || 0} de {cohort.capacity || 20} cupos
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones principales de la tarjeta */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">
                      Facilitador: <strong>{cohort.facilitatorName}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Botón Proyectar QR/PIN */}
                    <button
                      onClick={() => setIsDirectProjectorCohort(cohort)}
                      title="Proyectar código QR y PIN en sala para que los técnicos marquen"
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:shadow"
                    >
                      <QrCode className="w-4 h-4 text-amber-400" />
                      <span>Proyectar PIN</span>
                    </button>

                    {/* Botón Gestionar Asistencia & Calificaciones */}
                    <button
                      onClick={() => setSelectedTechnicalCohort(cohort)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#DA291C] to-red-600 hover:from-[#c22418] hover:to-red-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-500/20 active:scale-98"
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Gestionar Asistencia & Notas</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}

          {/* Tarjetas de Eventos Regulares / Modulares */}
          {filteredEvents.map(event => {
            const hasModules = Boolean(event.modules && event.modules.length > 0);
            const modulesCount = event.modules?.length || 0;
            
            // Total inscritos y asistentes en este curso
            let courseEnrolled = 0;
            let courseAttended = 0;
            (event.schedule || []).forEach(sch => {
              (sch.slots || []).forEach(slot => {
                courseEnrolled += (slot.attendees || []).length;
                courseAttended += (slot.attendedList || []).length;
              });
            });

            const attendancePercent = courseEnrolled > 0 ? Math.round((courseAttended / courseEnrolled) * 100) : 0;
            const gradesCount = (event.grades || []).length;

            const todayStr = new Date().toISOString().slice(0, 10);
            const eventDate = event.schedule?.[0]?.date || event.startDate || '';
            const isFuture = Boolean(eventDate && eventDate > todayStr);
            const isToday = Boolean(eventDate && eventDate === todayStr);
            const isPast = Boolean(eventDate && eventDate < todayStr);

            return (
              <div 
                key={event.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 sm:p-6 flex flex-col justify-between group"
              >
                <div>
                  {/* Badges superiores */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-[#DA291C] border border-red-200">
                        {event.category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                        {event.modality === 'Presencial' ? <MapPin className="w-3 h-3 text-slate-500" /> : <Video className="w-3 h-3 text-slate-500" />}
                        {event.modality}
                      </span>
                      {eventDate && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 border ${
                          isFuture
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : isToday
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          <Calendar className="w-3 h-3" />
                          <span>{isFuture ? 'Por Impartir' : isToday ? 'En Curso Hoy' : 'Fecha Pasada'}</span>
                        </span>
                      )}
                      {hasModules ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-purple-600" />
                          <span>{modulesCount} Módulos Definidos</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-50 text-slate-500 border border-slate-200">
                          Evaluación General
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-bold text-slate-400">
                      ID: {event.id}
                    </span>
                  </div>

                  {/* Título y Descripción */}
                  <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-[#DA291C] transition-colors line-clamp-1">
                    {event.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {event.description}
                  </p>

                  {/* Detalle de Módulos (si aplica) */}
                  {hasModules && (
                    <div className="mt-3.5 p-3 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-purple-600" />
                          <span>Módulos de Calificación Continua (Promedio Equitativo)</span>
                        </span>
                        <span className="text-[10px] text-purple-600 font-semibold">{modulesCount} módulos</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {event.modules?.map((m, mIdx) => (
                          <div key={m.id || mIdx} className="px-2.5 py-1.5 rounded-xl bg-white/80 border border-purple-100 text-[11px] flex items-center justify-between">
                            <span className="font-semibold text-slate-700 truncate max-w-[160px]">
                              {mIdx + 1}. {m.title}
                            </span>
                            <span className="text-[10px] font-bold text-purple-700 shrink-0">
                              Mín {m.passingScore}/{m.maxScore} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fechas y Horarios */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium truncate">
                        {event.schedule?.[0]?.date || 'Por programar'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium truncate">
                        {event.schedule?.[0]?.slots?.[0]?.time || 'Horario flexible'}
                      </span>
                    </div>
                  </div>

                  {/* Métricas de Asistencia y Evaluaciones */}
                  <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>Asistencia Confirmada:</span>
                      </span>
                      <span className="font-black text-slate-900">
                        {courseAttended} de {courseEnrolled} ({attendancePercent}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-red-500 to-[#DA291C] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${attendancePercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>{gradesCount} registros en libro de notas</span>
                      {event.instructor && (
                        <span className="truncate max-w-[170px]">Instructor: <strong>{event.instructor}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones principales de la tarjeta */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportGrades(event)}
                      title="Exportar calificaciones a Excel"
                      className="p-2.5 rounded-xl text-slate-600 hover:text-emerald-800 hover:bg-slate-100 border border-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span className="hidden sm:inline">Excel</span>
                    </button>

                    {/* Botón Eliminar Asignación (Super Admin) */}
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setCourseToDeleteAssignment(event);
                          setDeleteAssignmentMode('unassign_evaluator');
                        }}
                        title="Eliminar asignación de curso (Super Admin - Antes o después de la fecha)"
                        className="p-2.5 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        <span className="hidden sm:inline">Eliminar Asignación</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Botón Proyectar QR en Sala */}
                    <button
                      onClick={() => handleOpenManager(event, true)}
                      title="Proyectar código QR para escaneo de participantes en el salón"
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:shadow"
                    >
                      <QrCode className="w-4 h-4 text-red-400" />
                      <span>Proyectar QR</span>
                    </button>

                    {/* Botón Gestionar Asistencia & Módulos */}
                    <button
                      onClick={() => handleOpenManager(event, false)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#DA291C] to-red-600 hover:from-[#c22418] hover:to-red-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-500/20 active:scale-98"
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Gestionar Asistencia & Módulos</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* Estado vacío */
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-[#DA291C] mx-auto flex items-center justify-center">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-black text-slate-900">
              No se encontraron cursos asignados
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              {searchQuery 
                ? `No hay cursos asignados que coincidan con "${searchQuery}". Intenta ajustar el término de búsqueda.`
                : 'Actualmente no tienes cursos o talleres asignados bajo tu usuario como Evaluador OJT o facilitador.'}
            </p>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Asistencia y Calificaciones Modulares */}
      {activeModalEvent && (
        <AttendeesModal
          event={activeModalEvent}
          participants={participants}
          isSuperAdmin={Boolean(isSuperAdmin)}
          initialProjectorMode={isDirectProjector}
          onClose={() => {
            setSelectedModalEvent(null);
            setIsDirectProjector(false);
          }}
          onConfirmAttendance={async (evtId, date, time, email, type = 'checkin') => {
            await onConfirmAttendance(evtId, date, time, email, type);
            onShowToast('Asistencia registrada', `Se registró ${type === 'checkout' ? 'la salida' : 'la entrada'} para ${email}.`, 'success');
          }}
          onRevertAttendance={onRevertAttendance ? async (evtId, date, time, email, type = 'all') => {
            await onRevertAttendance(evtId, date, time, email, type);
            onShowToast('Asistencia revertida', `Se actualizó la asistencia para ${email}.`, 'info');
          } : undefined}
          onSaveGradesSuccess={(updatedEvt) => {
            setSelectedModalEvent(updatedEvt);
            if (onSaveEvent) {
              onSaveEvent(updatedEvt);
            }
            onShowToast('Calificaciones guardadas', `Se actualizaron las notas para "${updatedEvt.title}".`, 'success');
          }}
          onCancelRegistration={onCancelRegistration ? async (evtId, date, time, email, isSupervisorOrAdmin, force) => {
            await onCancelRegistration(evtId, date, time, email, isSupervisorOrAdmin, force);
            onShowToast('Asignación eliminada', `Se ha retirado la asignación de ${email} para este horario.`, 'info');
          } : undefined}
        />
      )}

      {/* Modal de Eliminación de Asignación de Curso para Super Admin */}
      {courseToDeleteAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900">
                    Eliminar Asignación de Curso
                  </h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    Super Admin
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Control exclusivo para gestionar o retirar este curso asignado antes o después de la fecha en que se debe impartir.
                </p>
              </div>
            </div>

            {/* Ficha Resumen del Evento */}
            {(() => {
              const todayStr = new Date().toISOString().slice(0, 10);
              const eventDate = courseToDeleteAssignment.schedule?.[0]?.date || courseToDeleteAssignment.startDate || '';
              const isFuture = Boolean(eventDate && eventDate > todayStr);
              const isToday = Boolean(eventDate && eventDate === todayStr);
              const isPast = Boolean(eventDate && eventDate < todayStr);

              let totalEnrolled = 0;
              (courseToDeleteAssignment.schedule || []).forEach(sch => {
                (sch.slots || []).forEach(slot => {
                  totalEnrolled += (slot.attendees || []).length;
                });
              });

              return (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Curso:</span>
                    <span className="font-black text-slate-900 truncate max-w-[240px]">
                      {courseToDeleteAssignment.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Tutor OJT / Facilitador:</span>
                    <span className="font-bold text-slate-800">
                      {courseToDeleteAssignment.ojtEvaluatorName || courseToDeleteAssignment.instructor || 'Por Asignar'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Fecha Programada:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-700 font-bold">{eventDate || 'Sin fecha fija'}</span>
                      {eventDate && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isFuture
                            ? 'bg-blue-100 text-blue-800'
                            : isToday
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isFuture ? '📅 Por Impartir' : isToday ? '🟢 Hoy' : '⏱️ Fecha Pasada'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Colaboradores Inscritos:</span>
                    <span className="font-bold text-slate-900">{totalEnrolled} participantes</span>
                  </div>
                </div>
              );
            })()}

            {/* Opciones de Acción */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Selecciona cómo deseas proceder con la eliminación:
              </label>

              {/* Opción 1: Desasignar Tutor OJT */}
              <div
                onClick={() => setDeleteAssignmentMode('unassign_evaluator')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                  deleteAssignmentMode === 'unassign_evaluator'
                    ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                    <CheckCircle2 className={`w-4 h-4 ${deleteAssignmentMode === 'unassign_evaluator' ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span>Desasignar Tutor / Evaluador OJT</span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Recomendado
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6">
                  Quita la asignación de tutoría de este curso. El evento permanece en el catálogo general y no se borran inscripciones ni asistencias, pero deja de figurar como curso asignado a este tutor OJT.
                </p>
              </div>

              {/* Opción 2: Eliminar Curso Completo */}
              <div
                onClick={() => setDeleteAssignmentMode('delete_event')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                  deleteAssignmentMode === 'delete_event'
                    ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                    <Trash2 className={`w-4 h-4 ${deleteAssignmentMode === 'delete_event' ? 'text-rose-600' : 'text-slate-400'}`} />
                    <span>Eliminar Curso / Evento Definitivamente</span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    Purga Total
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6">
                  Elimina permanentemente el evento, sus horarios, inscripciones y calificaciones de la base de datos.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCourseToDeleteAssignment(null)}
                disabled={isProcessingDeleteAssignment}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!courseToDeleteAssignment) return;
                  try {
                    setIsProcessingDeleteAssignment(true);
                    if (deleteAssignmentMode === 'unassign_evaluator') {
                      const updatedEvent: TrainingEvent = {
                        ...courseToDeleteAssignment,
                        ojtEvaluatorId: undefined,
                        ojtEvaluatorName: undefined,
                        ojtEvaluatorEmail: undefined
                      };
                      if (onSaveEvent) {
                        await onSaveEvent(updatedEvent);
                      }
                      onShowToast(
                        'Asignación Eliminada',
                        `Se ha retirado la tutoría OJT del curso "${courseToDeleteAssignment.title}".`,
                        'success'
                      );
                    } else {
                      if (onDeleteEvent) {
                        await onDeleteEvent(courseToDeleteAssignment.id);
                      }
                      onShowToast(
                        'Curso Eliminado',
                        `El curso "${courseToDeleteAssignment.title}" ha sido eliminado definitivamente.`,
                        'success'
                      );
                    }
                    setCourseToDeleteAssignment(null);
                  } catch (err: any) {
                    console.error('Error al procesar eliminación:', err);
                    onShowToast(
                      'Error',
                      err.message || 'No se pudo procesar la eliminación de la asignación.',
                      'error'
                    );
                  } finally {
                    setIsProcessingDeleteAssignment(false);
                  }
                }}
                disabled={isProcessingDeleteAssignment}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                  deleteAssignmentMode === 'unassign_evaluator'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20'
                }`}
              >
                <Trash2 className={`w-3.5 h-3.5 ${isProcessingDeleteAssignment ? 'animate-spin' : ''}`} />
                <span>
                  {isProcessingDeleteAssignment
                    ? 'Procesando...'
                    : deleteAssignmentMode === 'unassign_evaluator'
                      ? 'Confirmar Desasignación'
                      : 'Eliminar Definitivamente'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Cohorte Técnica para Facilitador */}
      {selectedTechnicalCohort && (
        <TechnicalCohortManagerModal
          isOpen={Boolean(selectedTechnicalCohort)}
          onClose={() => setSelectedTechnicalCohort(null)}
          cohort={selectedTechnicalCohort}
          currentUser={currentUser}
          onShowToast={onShowToast}
          onRefresh={onRefreshTechnicalCohorts}
        />
      )}

      {/* Modal de Proyección Directa de QR / PIN para Cohorte Técnica */}
      {isDirectProjectorCohort && (
        <TechnicalQrModal
          isOpen={Boolean(isDirectProjectorCohort)}
          onClose={() => setIsDirectProjectorCohort(null)}
          cohort={isDirectProjectorCohort}
        />
      )}

    </div>
  );
};
