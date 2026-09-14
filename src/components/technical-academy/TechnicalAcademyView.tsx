import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, 
  Calendar, 
  Clock, 
  Users, 
  UserCheck, 
  BookOpen, 
  QrCode, 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock3, 
  ShieldAlert, 
  ArrowRightLeft, 
  Copy, 
  Trash2, 
  Edit3, 
  Award, 
  Sparkles, 
  MapPin, 
  ChevronRight, 
  AlertCircle,
  RotateCw,
  Eye,
  CheckCheck
} from 'lucide-react';
import { 
  TechnicalAcademyCourse, 
  TechnicalAcademyCohort, 
  TechnicalCohortAttendanceMatrix, 
  ParticipantGroup, 
  UserAccount, 
  Participant, 
  Company 
} from '../../types';
import { apiService } from '../../services/api';
import { exportTechnicalAcademyAttendanceToExcel } from '../../utils/excelUtils';
import { TechnicalQrModal } from './TechnicalQrModal';
import { CohortFormModal } from './CohortFormModal';
import { ReassignCohortModal } from './ReassignCohortModal';
import { TechnicalCourseModal } from './TechnicalCourseModal';

interface TechnicalAcademyViewProps {
  currentUser: UserAccount | null;
  companies?: Company[];
  groups?: ParticipantGroup[];
  users?: UserAccount[];
  participants?: Participant[];
  onShowToast?: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const TechnicalAcademyView: React.FC<TechnicalAcademyViewProps> = ({
  currentUser,
  companies = [],
  groups = [],
  users = [],
  participants = [],
  onShowToast
}) => {
  // Tabs: attendance (Marcado Diario), cohorts (Planificador), courses (Catálogo), accreditation (Acreditación)
  const [activeTab, setActiveTab] = useState<'attendance' | 'cohorts' | 'courses' | 'accreditation'>('attendance');

  // Estado principal
  const [courses, setCourses] = useState<TechnicalAcademyCourse[]>([]);
  const [cohorts, setCohorts] = useState<TechnicalAcademyCohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [attendanceMatrix, setAttendanceMatrix] = useState<TechnicalCohortAttendanceMatrix | null>(null);
  const [selectedSessionDate, setSelectedSessionDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState<boolean>(false);
  const [isBulkMarking, setIsBulkMarking] = useState<boolean>(false);

  // Filtros y búsquedas
  const [searchParticipant, setSearchParticipant] = useState<string>('');
  const [cohortSearch, setCohortSearch] = useState<string>('');
  const [cohortStatusFilter, setCohortStatusFilter] = useState<string>('all');
  const [courseCategoryFilter, setCourseCategoryFilter] = useState<string>('all');

  // Modales
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isCohortModalOpen, setIsCohortModalOpen] = useState<boolean>(false);
  const [cohortToEdit, setCohortToEdit] = useState<TechnicalAcademyCohort | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState<boolean>(false);
  const [cohortToReassign, setCohortToReassign] = useState<TechnicalAcademyCohort | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState<boolean>(false);
  const [courseToEdit, setCourseToEdit] = useState<TechnicalAcademyCourse | null>(null);

  // 1. Cargar Cursos y Cohortes
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [cList, cohList] = await Promise.all([
        apiService.getTechnicalCourses(),
        apiService.getTechnicalCohorts()
      ]);
      setCourses(cList);
      setCohorts(cohList);

      // Si no hay cohorte seleccionada, seleccionar la primera activa o la primera de la lista
      if (!selectedCohortId && cohList.length > 0) {
        const active = cohList.find(c => c.status === 'in_progress') || cohList[0];
        setSelectedCohortId(active.id);
      }
    } catch (err: any) {
      console.error('Error al cargar datos de Academia Técnica:', err);
      if (onShowToast) onShowToast('Error', 'No se pudieron cargar los datos de la Academia Técnica', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Cargar Matriz de Asistencia cuando cambia la cohorte seleccionada
  const fetchAttendance = async (cohortId: string) => {
    if (!cohortId) {
      setAttendanceMatrix(null);
      return;
    }
    try {
      setIsLoadingAttendance(true);
      const matrix = await apiService.getCohortDailyAttendance(cohortId);
      setAttendanceMatrix(matrix);

      // Si la fecha seleccionada actual no está en los sessionDates de la cohorte, seleccionar la de hoy o la primera
      const todayStr = new Date().toISOString().slice(0, 10);
      if (matrix.sessionDates.includes(todayStr)) {
        setSelectedSessionDate(todayStr);
      } else if (matrix.sessionDates.length > 0) {
        setSelectedSessionDate(matrix.sessionDates[0]);
      }
    } catch (err: any) {
      console.error('Error al cargar asistencia:', err);
      if (onShowToast) onShowToast('Error', 'No se pudo cargar la matriz de asistencia diaria', 'error');
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  useEffect(() => {
    if (selectedCohortId) {
      fetchAttendance(selectedCohortId);
    }
  }, [selectedCohortId]);

  const activeCohort = useMemo(() => {
    return cohorts.find(c => c.id === selectedCohortId) || null;
  }, [cohorts, selectedCohortId]);

  // Marcado individual de asistencia para un colaborador en la fecha activa
  const handleToggleAttendance = async (
    participantCard: string, 
    newStatus: 'present' | 'late' | 'absent' | 'excused'
  ) => {
    if (!selectedCohortId || !selectedSessionDate || !attendanceMatrix) return;

    // Optimistic UI update
    setAttendanceMatrix(prev => {
      if (!prev) return null;
      return {
        ...prev,
        participants: prev.participants.map(p => {
          if (p.card !== participantCard) return p;
          const updatedMap = {
            ...p.attendanceByDate,
            [selectedSessionDate]: {
              status: newStatus,
              method: 'manual' as const,
              markedBy: currentUser?.name || 'Facilitador Técnico',
              markedAt: new Date().toISOString()
            }
          };
          let attendedCount = 0;
          prev.sessionDates.forEach(d => {
            const st = updatedMap[d]?.status;
            if (st === 'present' || st === 'late') attendedCount++;
          });
          const pct = prev.sessionDates.length > 0 ? Math.round((attendedCount / prev.sessionDates.length) * 100) : 0;
          return {
            ...p,
            attendanceByDate: updatedMap,
            attendedDays: attendedCount,
            attendancePercentage: pct,
            totalHoursEarned: attendedCount * (prev.dailyHours || 4)
          };
        })
      };
    });

    try {
      await apiService.markCohortDailyAttendance(selectedCohortId, {
        sessionDate: selectedSessionDate,
        records: [{
          participantCard,
          status: newStatus,
          method: 'manual',
          notes: ''
        }],
        markedBy: currentUser?.name || 'Facilitador Técnico'
      });
    } catch (err: any) {
      if (onShowToast) onShowToast('Error', 'No se pudo registrar la asistencia', 'error');
      // Revertir recargando matriz
      fetchAttendance(selectedCohortId);
    }
  };

  // Marcado masivo: "Marcar Todos Presentes"
  const handleMarkAllPresent = async () => {
    if (!selectedCohortId || !selectedSessionDate || !attendanceMatrix) return;

    if (!window.confirm(`¿Confirmas marcar como "PRESENTE" a todos los técnicos matriculados para la sesión del ${selectedSessionDate}?`)) {
      return;
    }

    try {
      setIsBulkMarking(true);
      const records = attendanceMatrix.participants.map(p => ({
        participantCard: p.card,
        status: 'present' as const,
        method: 'manual',
        notes: 'Marcado masivo'
      }));

      await apiService.markCohortDailyAttendance(selectedCohortId, {
        sessionDate: selectedSessionDate,
        records,
        markedBy: currentUser?.name || 'Facilitador Técnico'
      });

      if (onShowToast) {
        onShowToast('Asistencia Asentada', `Se marcaron ${records.length} técnicos presentes para el ${selectedSessionDate}`, 'success');
      }

      await fetchAttendance(selectedCohortId);
    } catch (err: any) {
      if (onShowToast) onShowToast('Error', err.message || 'Error al asentar asistencia masiva', 'error');
    } finally {
      setIsBulkMarking(false);
    }
  };

  // Duplicar cohorte (+7 días)
  const handleDuplicateCohort = async (cohortId: string) => {
    try {
      const res = await apiService.duplicateTechnicalCohort(cohortId);
      if (onShowToast) {
        onShowToast('Cohorte Duplicada', `Se programó la siguiente semana (${res.startDate} al ${res.endDate}) con éxito`, 'success');
      }
      await fetchData();
    } catch (err: any) {
      if (onShowToast) onShowToast('Error', err.message || 'Error al duplicar cohorte', 'error');
    }
  };

  // Eliminar cohorte
  const handleDeleteCohort = async (cohortId: string, courseTitle?: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la cohorte "${courseTitle || cohortId}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await apiService.deleteTechnicalCohort(cohortId);
      if (onShowToast) onShowToast('Eliminado', 'Cohorte técnica eliminada', 'info');
      await fetchData();
      if (selectedCohortId === cohortId) {
        setSelectedCohortId('');
      }
    } catch (err: any) {
      if (onShowToast) onShowToast('Error', err.message || 'Error al eliminar cohorte', 'error');
    }
  };

  // Eliminar curso técnico
  const handleDeleteCourse = async (courseId: string, title: string) => {
    if (!window.confirm(`¿Deseas retirar "${title}" del catálogo técnico?`)) {
      return;
    }
    try {
      await apiService.deleteTechnicalCourse(courseId);
      if (onShowToast) onShowToast('Eliminado', 'Curso técnico eliminado del catálogo', 'info');
      await fetchData();
    } catch (err: any) {
      if (onShowToast) onShowToast('Error', err.message || 'Error al eliminar curso', 'error');
    }
  };

  // Exportar matriz a Excel
  const handleExportExcel = () => {
    if (!attendanceMatrix) {
      if (onShowToast) onShowToast('Información', 'No hay datos de asistencia para exportar', 'warning');
      return;
    }
    exportTechnicalAcademyAttendanceToExcel(attendanceMatrix);
    if (onShowToast) onShowToast('Exportación Exitosa', 'El archivo Excel de asistencia técnica ha sido descargado', 'success');
  };

  // Participantes filtrados en la matriz de asistencia
  const filteredParticipants = useMemo(() => {
    if (!attendanceMatrix) return [];
    if (!searchParticipant.trim()) return attendanceMatrix.participants;
    const q = searchParticipant.toLowerCase();
    return attendanceMatrix.participants.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.card.toLowerCase().includes(q) ||
      (p.cedula && p.cedula.toLowerCase().includes(q)) ||
      (p.department && p.department.toLowerCase().includes(q))
    );
  }, [attendanceMatrix, searchParticipant]);

  // Cohortes filtradas
  const filteredCohorts = useMemo(() => {
    return cohorts.filter(c => {
      const matchSearch = 
        !cohortSearch.trim() ||
        (c.courseTitle && c.courseTitle.toLowerCase().includes(cohortSearch.toLowerCase())) ||
        (c.groupName && c.groupName.toLowerCase().includes(cohortSearch.toLowerCase())) ||
        (c.facilitatorName && c.facilitatorName.toLowerCase().includes(cohortSearch.toLowerCase()));

      const matchStatus = cohortStatusFilter === 'all' || c.status === cohortStatusFilter;

      return matchSearch && matchStatus;
    });
  }, [cohorts, cohortSearch, cohortStatusFilter]);

  // Cursos filtrados
  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      return courseCategoryFilter === 'all' || c.category === courseCategoryFilter;
    });
  }, [courses, courseCategoryFilter]);

  // Métricas generales
  const metrics = useMemo(() => {
    const activeCohortsCount = cohorts.filter(c => c.status === 'in_progress' || c.status === 'scheduled').length;
    const totalEnrolled = cohorts.reduce((acc, c) => acc + (c.enrolledCount || 0), 0);
    const uniqueFacilitators = new Set(cohorts.map(c => c.facilitatorName).filter(Boolean)).size;

    let totalPercentageSum = 0;
    let participantCount = 0;
    if (attendanceMatrix && attendanceMatrix.participants.length > 0) {
      attendanceMatrix.participants.forEach(p => {
        totalPercentageSum += p.attendancePercentage;
        participantCount++;
      });
    }
    const avgAttendance = participantCount > 0 ? Math.round(totalPercentageSum / participantCount) : 0;

    return {
      activeCohortsCount,
      totalEnrolled,
      uniqueFacilitators,
      avgAttendance
    };
  }, [cohorts, attendanceMatrix]);

  const categories = useMemo(() => {
    return Array.from(new Set(courses.map(c => c.category))).filter(Boolean);
  }, [courses]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                <Wrench className="w-3.5 h-3.5 text-red-600" />
                Academia Técnica Claro
              </span>
              <span className="text-xs font-medium text-slate-500">Capacitaciones Recurrentes & Rotación Semanal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Talleres Prácticos & Control de Asistencia Diaria
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Planifica semanas de entrenamiento técnico, asigna cuadrillas y facilitadores de forma rotativa, y realiza el pase de asistencia híbrido (marcado en 1 clic + QR dinámico).
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setCohortToEdit(null);
                setIsCohortModalOpen(true);
              }}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold transition-all shadow-sm shadow-red-600/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Programar Cohorte</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCourseToEdit(null);
                setIsCourseModalOpen(true);
              }}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-slate-300" />
              <span>Nuevo Curso Técnico</span>
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Cohortes Activas</span>
              <Calendar className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{metrics.activeCohortsCount}</div>
            <span className="text-[11px] text-slate-400">En curso o programadas</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Técnicos Matriculados</span>
              <Users className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{metrics.totalEnrolled}</div>
            <span className="text-[11px] text-slate-400">En todas las semanas</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Facilitadores Activos</span>
              <UserCheck className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{metrics.uniqueFacilitators}</div>
            <span className="text-[11px] text-slate-400">Instructores asignados</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Asistencia Cohorte Activa</span>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{metrics.avgAttendance}%</div>
            <span className="text-[11px] text-emerald-600 font-semibold">Promedio de cumplimiento</span>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto py-2">
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CheckCheck className="w-4 h-4 text-red-500" />
            <span>Marcado Diario de Asistencia</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cohorts')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'cohorts'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Planificador & Rotación ({cohorts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'courses'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4 text-slate-400" />
            <span>Catálogo de Cursos ({courses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accreditation')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'accreditation'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4 text-slate-400" />
            <span>Acreditación & Reportes</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MARCADO DIARIO DE ASISTENCIA */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {/* Cohort Selector Card & Active Details */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="w-full md:w-80">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Seleccionar Cohorte / Semana
                </label>
                <select
                  value={selectedCohortId}
                  onChange={(e) => setSelectedCohortId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800 bg-white"
                >
                  {cohorts.length === 0 ? (
                    <option value="">No hay cohortes programadas</option>
                  ) : (
                    cohorts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.courseTitle} • Sem {c.weekNumber || 'N/A'} ({c.groupName || 'Sin Grupo'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {activeCohort && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCohortToReassign(activeCohort);
                      setIsReassignModalOpen(true);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                    title="Reasignar Facilitador o Grupo para esta cohorte"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600" />
                    <span>Reasignar Facilitador / Grupo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <QrCode className="w-3.5 h-3.5 text-red-400" />
                    <span>Proyectar QR / PIN</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Exportar Excel</span>
                  </button>
                </div>
              )}
            </div>

            {/* Active Cohort Metadata Strip */}
            {activeCohort && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Facilitador Asignado</span>
                  <span className="font-bold text-slate-800 truncate block">{activeCohort.facilitatorName || 'No Asignado'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Grupo / Cuadrilla</span>
                  <span className="font-bold text-slate-800 truncate block">{activeCohort.groupName || 'Sin Grupo'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Período Semanal</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {activeCohort.startDate} al {activeCohort.endDate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">PIN Diario</span>
                  <span className="font-mono font-extrabold text-red-600 tracking-wider text-sm block">
                    {activeCohort.dailyPin || '----'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Session Dates Day Tabs & Fast Marking Bar */}
          {attendanceMatrix && (
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Day selector pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline">
                    Sesión:
                  </span>
                  {attendanceMatrix.sessionDates.map((date, idx) => {
                    const isSelected = selectedSessionDate === date;
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => setSelectedSessionDate(date)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Día {idx + 1} ({date})</span>
                      </button>
                    );
                  })}
                </div>

                {/* 1-Click "Marcar Todos Presentes" Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    disabled={isBulkMarking || !selectedSessionDate}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
                  >
                    {isBulkMarking ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Marcando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Marcar Todos Presentes (1-Click)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Search Technician Filter */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar técnico por nombre, carnet o cédula..."
                    value={searchParticipant}
                    onChange={(e) => setSearchParticipant(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 bg-white"
                  />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Mostrando <strong className="text-slate-800">{filteredParticipants.length}</strong> de {attendanceMatrix.participants.length} técnicos
                </div>
              </div>

              {/* Interactive Attendance Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3 w-12 text-center">No.</th>
                      <th className="py-3 px-3">Carnet</th>
                      <th className="py-3 px-4">Técnico / Colaborador</th>
                      <th className="py-3 px-3">Departamento</th>
                      <th className="py-3 px-4 text-center">
                        Estado Sesión ({selectedSessionDate})
                      </th>
                      <th className="py-3 px-4 text-center">Asistencia Acumulada</th>
                      <th className="py-3 px-3 text-center">Horas</th>
                      <th className="py-3 px-3 text-center">Condición</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingAttendance ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-red-600" />
                          <span>Cargando matriz de asistencia...</span>
                        </td>
                      </tr>
                    ) : filteredParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400">
                          No hay técnicos enrolados en esta cohorte o no coinciden con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredParticipants.map((p, idx) => {
                        const currentDayAtt = p.attendanceByDate[selectedSessionDate];
                        const currentStatus = currentDayAtt?.status;
                        const isApproved = p.attendancePercentage >= 80;
                        const isAtRisk = p.attendancePercentage >= 60 && p.attendancePercentage < 80;

                        return (
                          <tr key={p.card} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-700">
                              #{p.card}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{p.name}</div>
                              <div className="text-[10px] text-slate-400">{p.email}</div>
                            </td>
                            <td className="py-3 px-3 text-slate-600 text-[11px]">
                              {p.department || 'Planta Externa'}
                            </td>

                            {/* 1-Click Status Toggle Buttons for Current Date */}
                            <td className="py-2.5 px-4">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleAttendance(p.card, 'present')}
                                  title="Marcar Presente"
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                                    currentStatus === 'present'
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-emerald-700'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Presente</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleAttendance(p.card, 'late')}
                                  title="Marcar Tardanza"
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                                    currentStatus === 'late'
                                      ? 'bg-amber-500 text-white shadow-sm'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-amber-700'
                                  }`}
                                >
                                  <Clock3 className="w-3 h-3" />
                                  <span>Tardanza</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleAttendance(p.card, 'absent')}
                                  title="Marcar Ausente"
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                                    currentStatus === 'absent'
                                      ? 'bg-red-600 text-white shadow-sm'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-red-700'
                                  }`}
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Ausente</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleAttendance(p.card, 'excused')}
                                  title="Marcar Excusado"
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                                    currentStatus === 'excused'
                                      ? 'bg-sky-600 text-white shadow-sm'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-sky-700'
                                  }`}
                                >
                                  <ShieldAlert className="w-3 h-3" />
                                  <span>Exc.</span>
                                </button>
                              </div>

                              {currentDayAtt?.method && currentDayAtt.method !== 'manual' && (
                                <div className="text-[9px] text-center text-slate-400 mt-1 uppercase font-semibold">
                                  Vía {currentDayAtt.method === 'qr_scan' ? 'QR Móvil' : 'PIN'}
                                </div>
                              )}
                            </td>

                            {/* Attendance Progress % */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-2 rounded-full ${
                                      isApproved ? 'bg-emerald-500' : isAtRisk ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${p.attendancePercentage}%` }}
                                  />
                                </div>
                                <span className="font-bold text-slate-800 font-mono text-[11px]">
                                  {p.attendancePercentage}%
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {p.attendedDays} de {p.totalDays} días
                              </span>
                            </td>

                            {/* Hours Earned */}
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                              {p.totalHoursEarned}h
                            </td>

                            {/* Academic Condition */}
                            <td className="py-3 px-3 text-center">
                              {isApproved ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Aprobado
                                </span>
                              ) : isAtRisk ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  En Riesgo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                  Reprobado
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PLANIFICADOR DE COHORTES & ROTACIÓN SEMANAL */}
      {/* ========================================================================= */}
      {activeTab === 'cohorts' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por curso, grupo o facilitador..."
                value={cohortSearch}
                onChange={(e) => setCohortSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={cohortStatusFilter}
                onChange={(e) => setCohortStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 text-slate-700 bg-white"
              >
                <option value="all">Todos los estados</option>
                <option value="scheduled">Programadas</option>
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completadas</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setCohortToEdit(null);
                  setIsCohortModalOpen(true);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Programar Semana</span>
              </button>
            </div>
          </div>

          {/* Cohorts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCohorts.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No se encontraron cohortes programadas</p>
                <p className="text-xs text-slate-400 mt-1">Crea una nueva cohorte para habilitar la rotación semanal.</p>
              </div>
            ) : (
              filteredCohorts.map(coh => {
                const isSelected = coh.id === selectedCohortId;
                return (
                  <div
                    key={coh.id}
                    className={`bg-white rounded-3xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                      isSelected ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top ribbon */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          Semana {coh.weekNumber || 'N/A'} • {coh.year}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            coh.status === 'in_progress'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : coh.status === 'completed'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {coh.status === 'in_progress' ? 'En Curso' : coh.status === 'completed' ? 'Completado' : 'Programado'}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-slate-900 text-sm leading-snug">
                        {coh.courseTitle || 'Curso Técnico'}
                      </h3>

                      {/* Meta list */}
                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span className="font-semibold text-slate-800">Grupo:</span>
                          <span className="truncate">{coh.groupName || 'Abierto'}</span>
                          <span className="text-[10px] text-slate-400">({coh.enrolledCount || 0} técnicos)</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <UserCheck className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span className="font-semibold text-slate-800">Facilitador:</span>
                          <span className="truncate">{coh.facilitatorName || 'No asignado'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{coh.startDate} al {coh.endDate}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{coh.dailyTime} ({coh.dailyHours} hrs/día)</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{coh.location || 'Laboratorio Técnico'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCohortId(coh.id);
                            setActiveTab('attendance');
                          }}
                          className="flex-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Pasar Asistencia</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCohortToReassign(coh);
                            setIsReassignModalOpen(true);
                          }}
                          title="Reasignar Facilitador o Grupo Semanal"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                          aria-label="Reasignar Facilitador o Grupo"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateCohort(coh.id)}
                          title="Duplicar para siguiente semana (+7 días)"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                          aria-label="Duplicar para siguiente semana"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCohortToEdit(coh);
                            setIsCohortModalOpen(true);
                          }}
                          title="Editar Cohorte"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                          aria-label="Editar Cohorte"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCohort(coh.id, coh.courseTitle)}
                          title="Eliminar Cohorte"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-red-700 rounded-xl transition-colors"
                          aria-label="Eliminar Cohorte"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CATÁLOGO DE CURSOS TÉCNICOS */}
      {/* ========================================================================= */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría:</span>
              <select
                value={courseCategoryFilter}
                onChange={(e) => setCourseCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 text-slate-700 bg-white"
              >
                <option value="all">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setCourseToEdit(null);
                setIsCourseModalOpen(true);
              }}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Curso Técnico</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map(course => (
              <div
                key={course.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                      {course.category}
                    </span>
                    {course.code && (
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        {course.code}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">{course.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{course.description || 'Sin descripción detallada.'}</p>

                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Horas Diarias:</span>
                      <strong className="text-slate-800">{course.dailyHours} hrs</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Duración:</span>
                      <strong className="text-slate-800">{course.durationDays} días ({course.dailyHours * course.durationDays}h tot)</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Modalidad:</span>
                      <span className="truncate block">{course.modality}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Taller:</span>
                      <span className="truncate block">{course.location || 'Laboratorio'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCohortToEdit({
                        id: '',
                        courseId: course.id,
                        courseTitle: course.title,
                        startDate: new Date().toISOString().slice(0, 10),
                        endDate: new Date().toISOString().slice(0, 10),
                        dailyTime: '08:00 AM - 12:00 PM',
                        location: course.location,
                        capacity: 20,
                        dailyPin: Math.floor(1000 + Math.random() * 9000).toString(),
                        status: 'scheduled',
                        companyId: 'emp_kasino'
                      });
                      setIsCohortModalOpen(true);
                    }}
                    className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Programar Cohorte</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCourseToEdit(course);
                      setIsCourseModalOpen(true);
                    }}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                    title="Editar Curso"
                    aria-label="Editar Curso"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCourse(course.id, course.title)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-red-700 rounded-xl transition-colors"
                    title="Eliminar Curso"
                    aria-label="Eliminar Curso"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ACREDITACIÓN & REPORTES */}
      {/* ========================================================================= */}
      {activeTab === 'accreditation' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Acreditación de Competencias Técnicas ({activeCohort?.courseTitle || 'Cohorte Actual'})
              </h2>
              <p className="text-xs text-slate-500">
                Criterio institucional de aprobación técnica: asistencia mínima requerida del 80%.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm self-start sm:self-auto"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Reporte Oficial (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">No.</th>
                  <th className="py-3 px-3">Carnet</th>
                  <th className="py-3 px-4">Técnico / Colaborador</th>
                  <th className="py-3 px-3">Departamento</th>
                  <th className="py-3 px-3 text-center">Días Asistidos</th>
                  <th className="py-3 px-3 text-center">% Cumplimiento</th>
                  <th className="py-3 px-3 text-center">Horas Acreditadas</th>
                  <th className="py-3 px-4 text-center">Dictamen Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!attendanceMatrix || attendanceMatrix.participants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No hay registros de técnicos disponibles en esta cohorte.
                    </td>
                  </tr>
                ) : (
                  attendanceMatrix.participants.map((p, idx) => {
                    const isPassed = p.attendancePercentage >= 80;
                    return (
                      <tr key={p.card} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">#{p.card}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                        <td className="py-3 px-3 text-slate-600">{p.department || 'Planta Externa'}</td>
                        <td className="py-3 px-3 text-center font-mono">
                          {p.attendedDays} / {p.totalDays}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          <span className={isPassed ? 'text-emerald-700' : 'text-red-600'}>
                            {p.attendancePercentage}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                          {p.totalHoursEarned} hrs
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isPassed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ACREDITADO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              NO ACREDITADO
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: QR & PIN PROJECTOR */}
      <TechnicalQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        cohort={activeCohort}
        onCheckInSuccess={() => {
          if (selectedCohortId) fetchAttendance(selectedCohortId);
        }}
      />

      {/* MODAL 2: COHORT FORM (CREATE / EDIT) */}
      <CohortFormModal
        isOpen={isCohortModalOpen}
        onClose={() => setIsCohortModalOpen(false)}
        courses={courses}
        groups={groups}
        users={users}
        companies={companies}
        cohortToEdit={cohortToEdit}
        onSuccess={async () => {
          if (onShowToast) onShowToast('Éxito', 'Cohorte guardada correctamente', 'success');
          await fetchData();
        }}
      />

      {/* MODAL 3: REASSIGN FACILITATOR / GROUP */}
      <ReassignCohortModal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        cohort={cohortToReassign}
        groups={groups}
        users={users}
        onSuccess={async () => {
          if (onShowToast) onShowToast('Reasignación Exitosa', 'La cohorte ha sido reasignada', 'success');
          await fetchData();
          if (selectedCohortId) await fetchAttendance(selectedCohortId);
        }}
      />

      {/* MODAL 4: TECHNICAL COURSE (CREATE / EDIT) */}
      <TechnicalCourseModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        courseToEdit={courseToEdit}
        companies={companies}
        onSuccess={async () => {
          if (onShowToast) onShowToast('Éxito', 'Curso técnico guardado en el catálogo', 'success');
          await fetchData();
        }}
      />
    </div>
  );
};
