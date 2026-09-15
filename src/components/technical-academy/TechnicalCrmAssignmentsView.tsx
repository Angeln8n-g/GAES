import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Search,
  Filter,
  ArrowRightLeft,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  Building2,
  ChevronDown,
  CheckSquare,
  Square,
  Award,
  BookOpen,
  Info
} from 'lucide-react';
import {
  Participant,
  TechnicalAcademyCourse,
  TechnicalAcademyCohort,
  TechnicalAcademyHistoryRecord,
  Company
} from '../../types';
import { apiService } from '../../services/api';
import { CrmAssignCourseModal } from './CrmAssignCourseModal';

interface TechnicalCrmAssignmentsViewProps {
  isSuperAdmin: boolean;
  participants: Participant[];
  courses: TechnicalAcademyCourse[];
  cohorts: TechnicalAcademyCohort[];
  companies?: Company[];
  onShowToast?: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onRefreshData?: () => void;
}

export const TechnicalCrmAssignmentsView: React.FC<TechnicalCrmAssignmentsViewProps> = ({
  isSuperAdmin,
  participants = [],
  courses = [],
  cohorts = [],
  companies = [],
  onShowToast,
  onRefreshData
}) => {
  // Historial global de matrículas y asistencias
  const [historyRecords, setHistoryRecords] = useState<TechnicalAcademyHistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'unassigned'>('all');

  // Selección múltiple para asignación masiva
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  // Modal de Asignación / Reasignación
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [assignModalTargets, setAssignModalTargets] = useState<Participant[]>([]);
  const [assignModalPrevCohortId, setAssignModalPrevCohortId] = useState<string | null>(null);
  const [assignModalPrevCourseTitle, setAssignModalPrevCourseTitle] = useState<string | null>(null);

  // Modal de Eliminación / Conclusión de Asignación
  const [isUnenrollModalOpen, setIsUnenrollModalOpen] = useState<boolean>(false);
  const [targetParticipantToUnenroll, setTargetParticipantToUnenroll] = useState<Participant | null>(null);
  const [targetCohortToUnenroll, setTargetCohortToUnenroll] = useState<{
    id: string;
    courseTitle: string;
    groupName: string;
  } | null>(null);
  const [unenrollMode, setUnenrollMode] = useState<'archive' | 'hard_delete'>('archive');
  const [isUnenrolling, setIsUnenrolling] = useState<boolean>(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Cargar historial global
  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const data = await apiService.getTechnicalAcademyHistory();
      setHistoryRecords(data);
    } catch (err: any) {
      console.error('Error al cargar historial técnico:', err);
      if (onShowToast) {
        onShowToast('Error', 'No se pudo cargar el historial de asignaciones técnicas', 'error');
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Lista de departamentos únicos para el filtro
  const departments = useMemo(() => {
    const set = new Set<string>();
    participants.forEach(p => {
      if (p.department && p.department.trim()) {
        set.add(p.department.trim());
      }
    });
    return Array.from(set).sort();
  }, [participants]);

  // Mapa de enrolamientos agrupados por participante (card)
  const participantEnrollmentsMap = useMemo(() => {
    const map: Record<string, {
      activeRecord: TechnicalAcademyHistoryRecord | null;
      completedRecords: TechnicalAcademyHistoryRecord[];
      allRecords: TechnicalAcademyHistoryRecord[];
    }> = {};

    historyRecords.forEach(rec => {
      const card = rec.participantCard;
      if (!map[card]) {
        map[card] = {
          activeRecord: null,
          completedRecords: [],
          allRecords: []
        };
      }
      map[card].allRecords.push(rec);

      // Verificamos si es matrícula activa (status 'enrolled' en la cohorte)
      const isEnrolled = rec.status === 'enrolled' || (rec as any).enrollmentStatus === 'enrolled';
      const isCancelled = rec.status === 'cancelled' || (rec as any).cohortStatus === 'cancelled';

      if (isEnrolled && !isCancelled) {
        if (!map[card].activeRecord) {
          map[card].activeRecord = rec;
        } else {
          // Si ya había una, preferir la más reciente
          if (rec.startDate > map[card].activeRecord!.startDate) {
            map[card].activeRecord = rec;
          }
        }
      } else if (rec.status === 'completed' || (rec as any).enrollmentStatus === 'completed' || (rec as any).cohortStatus === 'completed') {
        map[card].completedRecords.push(rec);
      }
    });

    // Ordenar completedRecords por endDate descendente
    Object.values(map).forEach(val => {
      val.completedRecords.sort((a, b) => b.endDate.localeCompare(a.endDate));
    });

    return map;
  }, [historyRecords]);

  // Enriquecer cada participante con su estatus CRM
  const enrichedParticipants = useMemo(() => {
    return participants.map(p => {
      const recData = participantEnrollmentsMap[p.card] || {
        activeRecord: null,
        completedRecords: [],
        allRecords: []
      };

      const { activeRecord, completedRecords } = recData;

      let crmStatus: 'in_progress' | 'scheduled' | 'enrolled' | 'completed_passed' | 'completed_failed' | 'unassigned' = 'unassigned';
      let crmStatusLabel = 'Sin Asignación';
      let currentCourseTitle: string | null = null;
      let currentCohortName: string | null = null;
      let currentCohortId: string | null = null;
      let currentDates: string | null = null;
      let currentFacilitator: string | null = null;
      let attendancePct = 0;
      let attendedDays = 0;
      let totalDays = 0;
      let score: number | null = null;

      if (activeRecord) {
        currentCohortId = activeRecord.cohortId;
        currentCourseTitle = activeRecord.title;
        currentCohortName = activeRecord.groupName || 'Cohorte General';
        currentDates = `${activeRecord.startDate} al ${activeRecord.endDate}`;
        currentFacilitator = activeRecord.facilitatorName || 'Por Asignar';
        attendancePct = activeRecord.attendancePercentage || 0;
        attendedDays = activeRecord.attendedDays || 0;
        totalDays = activeRecord.durationDays || 5;

        const cStatus = (activeRecord as any).cohortStatus || activeRecord.status;
        if (cStatus === 'in_progress') {
          crmStatus = 'in_progress';
          crmStatusLabel = 'En Curso';
        } else if (cStatus === 'scheduled') {
          crmStatus = 'scheduled';
          crmStatusLabel = 'Programado';
        } else {
          crmStatus = 'enrolled';
          crmStatusLabel = 'Asignado';
        }
      } else if (completedRecords.length > 0) {
        const latest = completedRecords[0];
        currentCourseTitle = latest.title;
        currentCohortName = latest.groupName || 'Cohorte General';
        attendancePct = latest.attendancePercentage || 0;
        attendedDays = latest.attendedDays || 0;
        totalDays = latest.durationDays || 5;
        score = (latest as any).score !== null && (latest as any).score !== undefined ? Number((latest as any).score) : null;

        const isPassed = latest.academicStatus === 'passed' || 
          (latest.academicStatus !== 'failed' && (score !== null ? score >= 70 : attendancePct >= 80));

        if (isPassed) {
          crmStatus = 'completed_passed';
          crmStatusLabel = 'Concluido (Aprobado)';
        } else {
          crmStatus = 'completed_failed';
          crmStatusLabel = 'Concluido (Reprobado)';
        }
      }

      return {
        ...p,
        crmStatus,
        crmStatusLabel,
        activeRecord,
        completedRecords,
        currentCohortId,
        currentCourseTitle,
        currentCohortName,
        currentDates,
        currentFacilitator,
        attendancePct,
        attendedDays,
        totalDays,
        score
      };
    });
  }, [participants, participantEnrollmentsMap]);

  // Contadores globales de métricas
  const metrics = useMemo(() => {
    let active = 0;
    let completed = 0;
    let unassigned = 0;

    enrichedParticipants.forEach(p => {
      if (p.activeRecord) {
        active++;
      } else if (p.completedRecords.length > 0) {
        completed++;
      } else {
        unassigned++;
      }
    });

    return {
      total: enrichedParticipants.length,
      active,
      completed,
      unassigned
    };
  }, [enrichedParticipants]);

  // Filtrado de participantes
  const filteredParticipants = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return enrichedParticipants.filter(p => {
      // Búsqueda por nombre, carnet, cédula
      if (q) {
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchCard = (p.card || '').toLowerCase().includes(q);
        const matchCedula = (p.cedula || '').toLowerCase().includes(q);
        const matchCourse = (p.currentCourseTitle || '').toLowerCase().includes(q);
        if (!matchName && !matchCard && !matchCedula && !matchCourse) return false;
      }

      // Filtro empresa
      if (selectedCompanyId !== 'all') {
        if (p.companyId !== selectedCompanyId) return false;
      }

      // Filtro departamento
      if (selectedDepartment !== 'all') {
        if (p.department !== selectedDepartment) return false;
      }

      // Filtro estatus CRM
      if (statusFilter === 'active') {
        if (!p.activeRecord) return false;
      } else if (statusFilter === 'completed') {
        if (p.activeRecord || p.completedRecords.length === 0) return false;
      } else if (statusFilter === 'unassigned') {
        if (p.activeRecord || p.completedRecords.length > 0) return false;
      }

      return true;
    });
  }, [enrichedParticipants, searchTerm, selectedCompanyId, selectedDepartment, statusFilter]);

  // Paginación de la tabla
  const totalPages = Math.ceil(filteredParticipants.length / pageSize) || 1;
  const paginatedParticipants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredParticipants.slice(start, start + pageSize);
  }, [filteredParticipants, currentPage, pageSize]);

  // Manejo de Selección Múltiple
  const handleToggleSelectAllVisible = () => {
    const newSet = new Set(selectedCards);
    const visibleCards = paginatedParticipants.map(p => p.card);
    const allVisibleSelected = visibleCards.every(c => newSet.has(c));

    if (allVisibleSelected) {
      visibleCards.forEach(c => newSet.delete(c));
    } else {
      visibleCards.forEach(c => newSet.add(c));
    }
    setSelectedCards(newSet);
  };

  const handleToggleCard = (card: string) => {
    const newSet = new Set(selectedCards);
    if (newSet.has(card)) {
      newSet.delete(card);
    } else {
      newSet.add(card);
    }
    setSelectedCards(newSet);
  };

  // Disparar Asignación Individual
  const handleOpenAssignIndividual = (p: typeof enrichedParticipants[0]) => {
    setAssignModalTargets([p]);
    setAssignModalPrevCohortId(null);
    setAssignModalPrevCourseTitle(p.completedRecords.length > 0 ? p.completedRecords[0].title : null);
    setIsAssignModalOpen(true);
  };

  // Disparar Reasignación / Siguiente Curso
  const handleOpenReassign = (p: typeof enrichedParticipants[0]) => {
    setAssignModalTargets([p]);
    setAssignModalPrevCohortId(p.currentCohortId);
    setAssignModalPrevCourseTitle(p.currentCourseTitle);
    setIsAssignModalOpen(true);
  };

  // Disparar Asignación Masiva para los seleccionados
  const handleOpenAssignBulk = () => {
    const targets = participants.filter(p => selectedCards.has(p.card));
    if (targets.length === 0) return;
    setAssignModalTargets(targets);
    setAssignModalPrevCohortId(null);
    setAssignModalPrevCourseTitle(null);
    setIsAssignModalOpen(true);
  };

  // Disparar Modal de Eliminar / Archivar Asignación
  const handleOpenUnenrollModal = (p: typeof enrichedParticipants[0]) => {
    if (!p.activeRecord) return;
    setTargetParticipantToUnenroll(p);
    setTargetCohortToUnenroll({
      id: p.activeRecord.cohortId,
      courseTitle: p.activeRecord.title,
      groupName: p.activeRecord.groupName || 'Cohorte General'
    });
    setUnenrollMode('archive'); // Por defecto sugerir archivar para no perder récord
    setIsUnenrollModalOpen(true);
  };

  // Ejecutar desmatriculación / conclusión
  const handleConfirmUnenroll = async () => {
    if (!targetParticipantToUnenroll || !targetCohortToUnenroll) return;

    try {
      setIsUnenrolling(true);
      await apiService.unenrollCohortParticipant(
        targetCohortToUnenroll.id,
        targetParticipantToUnenroll.card,
        unenrollMode
      );

      if (onShowToast) {
        const msg = unenrollMode === 'archive'
          ? `Se concluyó la asignación de ${targetParticipantToUnenroll.name} y se archivó en su historial para RRHH.`
          : `Se eliminó definitivamente la asignación de ${targetParticipantToUnenroll.name}.`;
        onShowToast('Asignación Actualizada', msg, 'success');
      }

      setIsUnenrollModalOpen(false);
      setTargetParticipantToUnenroll(null);
      setTargetCohortToUnenroll(null);

      // Recargar datos
      await loadHistory();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Error al desmatricular:', err);
      if (onShowToast) {
        onShowToast('Error', err.message || 'No se pudo procesar la desmatriculación', 'error');
      }
    } finally {
      setIsUnenrolling(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Super Admin CRM Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-700/60 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-600 text-white rounded-xl shadow-md shadow-red-600/30">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-white">
                Control de Asignaciones de Cursos (CRM)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-black uppercase tracking-wider">
                Exclusivo Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Monitorea en tiempo real qué colaboradores tienen cursos asignados, quiénes han concluido y están listos para avanzar de nivel, y libera o reasigna matrículas manteniendo la integridad del historial de RRHH.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={async () => {
                await loadHistory();
                if (onRefreshData) onRefreshData();
                if (onShowToast) onShowToast('Datos Actualizados', 'Información del CRM sincronizada', 'info');
              }}
              disabled={isLoadingHistory}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              title="Recargar datos del servidor"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin text-red-400' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>

            {selectedCards.size > 0 && (
              <button
                onClick={handleOpenAssignBulk}
                className="px-4 py-2 rounded-xl bg-[#DA291C] hover:bg-red-700 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer animate-in zoom-in-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>Asignar a ({selectedCards.size}) Colaboradores</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Ribbon / Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold text-slate-600">Total Colaboradores</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.total}</div>
          <div className="text-[11px] text-slate-500 font-medium">Registrados en plantilla</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Con Curso Activo</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">{metrics.active}</div>
          <div className="text-[11px] text-slate-500 font-medium">En curso o programados</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Cursos Concluidos</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{metrics.completed}</div>
          <div className="text-[11px] text-slate-500 font-medium">Listos para nuevo curso</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Sin Asignación</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-700">{metrics.unassigned}</div>
          <div className="text-[11px] text-slate-500 font-medium">Disponibles para enrolar</div>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar colaborador, cédula, ficha o curso..."
              className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#DA291C] focus:bg-white transition-all"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Filter Company */}
            {companies.length > 1 && (
              <select
                value={selectedCompanyId}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#DA291C] cursor-pointer"
              >
                <option value="all">🏢 Todas las Empresas</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}

            {/* Filter Department */}
            {departments.length > 0 && (
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#DA291C] cursor-pointer max-w-[180px] truncate"
              >
                <option value="all">📂 Todos los Deptos.</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}

            {/* Filter CRM Status */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({metrics.total})
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter('active'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'active'
                    ? 'bg-white text-amber-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Activos ({metrics.active})
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter('completed'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'completed'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Concluidos ({metrics.completed})
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter('unassigned'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'unassigned'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sin Asignar ({metrics.unassigned})
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Selection Summary Banner */}
        {selectedCards.size > 0 && (
          <div className="p-3 bg-red-50/70 border border-red-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-red-900 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold">
              <CheckSquare className="w-4 h-4 text-[#DA291C]" />
              <span>{selectedCards.size} colaborador(es) seleccionado(s)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCards(new Set())}
                className="px-3 py-1 text-xs text-red-700 hover:text-red-900 font-bold hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
              >
                Deseleccionar todos
              </button>
              <button
                type="button"
                onClick={handleOpenAssignBulk}
                className="px-4 py-1.5 bg-[#DA291C] hover:bg-red-700 text-white rounded-xl font-bold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Asignar Curso Técnico</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main CRM Collaborators Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAllVisible}
                    className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    title="Seleccionar / Deseleccionar visibles"
                  >
                    {paginatedParticipants.length > 0 && paginatedParticipants.every(p => selectedCards.has(p.card)) ? (
                      <CheckSquare className="w-4 h-4 text-[#DA291C]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4">Colaborador / Ficha</th>
                <th className="py-3.5 px-4">Curso Asignado Actual</th>
                <th className="py-3.5 px-4 text-center">Estado CRM</th>
                <th className="py-3.5 px-4 text-center">Asistencia & Calificación</th>
                <th className="py-3.5 px-4 text-center">Historial</th>
                <th className="py-3.5 px-4 text-right">Acciones Super Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoadingHistory ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#DA291C]" />
                    <p className="text-xs font-bold text-slate-600">Cargando base de datos de asignaciones...</p>
                  </td>
                </tr>
              ) : paginatedParticipants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">No se encontraron colaboradores</p>
                    <p className="text-xs text-slate-400 mt-0.5">Prueba ajustando los términos de búsqueda o filtros.</p>
                  </td>
                </tr>
              ) : (
                paginatedParticipants.map(p => {
                  const isSelected = selectedCards.has(p.card);
                  const hasActive = Boolean(p.activeRecord);
                  const hasCompleted = p.completedRecords.length > 0;

                  return (
                    <tr 
                      key={p.card}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-red-50/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleCard(p.card)}
                          className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#DA291C]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Collaborator info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 flex items-center gap-2">
                              <span>{p.name}</span>
                              {p.cedula && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  • C.I. {p.cedula}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold">
                                #{p.card}
                              </span>
                              {p.department && (
                                <span className="font-sans text-slate-500 font-medium">
                                  {p.department}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Course / Cohort */}
                      <td className="py-3.5 px-4">
                        {p.currentCourseTitle ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-red-600 shrink-0" />
                              <span className="truncate max-w-[220px]">{p.currentCourseTitle}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-700">{p.currentCohortName}</span>
                              {p.currentDates && (
                                <span className="text-slate-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {p.currentDates}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 italic">
                            Sin curso asignado
                          </span>
                        )}
                      </td>

                      {/* Status CRM Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {p.crmStatus === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            En Curso
                          </span>
                        ) : p.crmStatus === 'scheduled' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3 h-3 text-blue-500" />
                            Programado
                          </span>
                        ) : p.crmStatus === 'completed_passed' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Concluido (Aprobado)
                          </span>
                        ) : p.crmStatus === 'completed_failed' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Concluido (Reprobado)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Disponible
                          </span>
                        )}
                      </td>

                      {/* Progress / Attendance */}
                      <td className="py-3.5 px-4 text-center">
                        {hasActive || hasCompleted ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                              <span>{p.attendancePct}%</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({p.attendedDays}/{p.totalDays} d)
                              </span>
                            </div>
                            {/* Attendance Progress Bar */}
                            <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                              <div
                                className={`h-full rounded-full ${
                                  p.attendancePct >= 80
                                    ? 'bg-emerald-500'
                                    : p.attendancePct >= 60
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(p.attendancePct, 100)}%` }}
                              />
                            </div>
                            {p.score !== null && (
                              <span className="text-[10px] font-bold text-slate-600">
                                Nota: {p.score}/100
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono text-xs">-</span>
                        )}
                      </td>

                      {/* History counter */}
                      <td className="py-3.5 px-4 text-center">
                        {p.completedRecords.length > 0 ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-700">
                            <Award className="w-3 h-3 text-amber-500" />
                            <span>{p.completedRecords.length} curso(s)</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[11px] font-medium">0 previo</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasActive ? (
                            <>
                              {/* Reasignar / Cambiar curso */}
                              <button
                                type="button"
                                onClick={() => handleOpenReassign(p)}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Reasignar al siguiente ciclo o cambiar de cohorte"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                <span>Reasignar</span>
                              </button>

                              {/* Eliminar o Concluir Asignación */}
                              <button
                                type="button"
                                onClick={() => handleOpenUnenrollModal(p)}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Eliminar asignación o archivar como concluida"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Eliminar</span>
                              </button>
                            </>
                          ) : (
                            /* Asignar curso (individual) */
                            <button
                              type="button"
                              onClick={() => handleOpenAssignIndividual(p)}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-[#DA291C] text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>{hasCompleted ? 'Siguiente Curso' : 'Asignar Curso'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredParticipants.length > pageSize && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
            <div>
              Mostrando <span className="font-bold text-slate-800">{((currentPage - 1) * pageSize) + 1}</span> a{' '}
              <span className="font-bold text-slate-800">
                {Math.min(currentPage * pageSize, filteredParticipants.length)}
              </span>{' '}
              de <span className="font-bold text-slate-800">{filteredParticipants.length}</span> colaboradores
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="font-bold text-slate-800">
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ASIGNAR / REASIGNAR CURSO (CRM)                                  */}
      {/* ========================================================================= */}
      <CrmAssignCourseModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setAssignModalTargets([]);
          setAssignModalPrevCohortId(null);
          setAssignModalPrevCourseTitle(null);
        }}
        targetParticipants={assignModalTargets}
        courses={courses}
        cohorts={cohorts}
        prevCohortId={assignModalPrevCohortId}
        prevCourseTitle={assignModalPrevCourseTitle}
        onSuccess={async () => {
          setSelectedCards(new Set());
          await loadHistory();
          if (onRefreshData) onRefreshData();
        }}
        onShowToast={onShowToast}
      />

      {/* ========================================================================= */}
      {/* MODAL 2: ELIMINAR / ARCHIVAR ASIGNACIÓN                                   */}
      {/* ========================================================================= */}
      {isUnenrollModalOpen && targetParticipantToUnenroll && targetCohortToUnenroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Gestionar Asignación de Curso
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Elige cómo deseas procesar la desmatriculación del colaborador.
                </p>
              </div>
            </div>

            {/* Target info card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Colaborador:</span>
                <span className="font-black text-slate-900">{targetParticipantToUnenroll.name} (Ficha #{targetParticipantToUnenroll.card})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Curso Actual:</span>
                <span className="font-bold text-slate-800">{targetCohortToUnenroll.courseTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Cohorte:</span>
                <span className="font-bold text-slate-700">{targetCohortToUnenroll.groupName}</span>
              </div>
            </div>

            {/* Mode selection options */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Selecciona la acción a realizar:
              </label>

              {/* Option 1: Archive / Conclude (Recommended) */}
              <div
                onClick={() => setUnenrollMode('archive')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                  unenrollMode === 'archive'
                    ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                    <CheckCircle2 className={`w-4 h-4 ${unenrollMode === 'archive' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>Concluir y Archivar en Historial</span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Recomendado
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6">
                  Marca la matrícula como concluida (completed). El colaborador queda liberado en el CRM para su siguiente curso y se preservan todas sus asistencias y notas para el récord de RRHH.
                </p>
              </div>

              {/* Option 2: Hard Delete */}
              <div
                onClick={() => setUnenrollMode('hard_delete')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                  unenrollMode === 'hard_delete'
                    ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                    <Trash2 className={`w-4 h-4 ${unenrollMode === 'hard_delete' ? 'text-rose-600' : 'text-slate-400'}`} />
                    <span>Eliminar Asignación Definitivamente</span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    Purga Total
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6">
                  Borra permanentemente la inscripción y asistencias de esta cohorte. Úsalo si la asignación fue un error administrativo y no debe quedar registro.
                </p>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsUnenrollModalOpen(false);
                  setTargetParticipantToUnenroll(null);
                  setTargetCohortToUnenroll(null);
                }}
                disabled={isUnenrolling}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmUnenroll}
                disabled={isUnenrolling}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                  unenrollMode === 'archive'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${isUnenrolling ? 'animate-spin' : ''}`} />
                <span>
                  {isUnenrolling
                    ? 'Procesando...'
                    : unenrollMode === 'archive'
                      ? 'Confirmar Conclusión y Archivar'
                      : 'Eliminar Definitivamente'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
