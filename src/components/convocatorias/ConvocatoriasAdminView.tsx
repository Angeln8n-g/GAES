import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  UserCheck, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Building2, 
  ArrowRight, 
  Check, 
  X, 
  RotateCw, 
  FileSpreadsheet, 
  ChevronRight, 
  Eye, 
  ShieldCheck, 
  Award,
  Layers,
  Inbox
} from 'lucide-react';
import { 
  Convocatoria, 
  ConvocatoriaApplication, 
  TechnicalAcademyCourse, 
  TechnicalAcademyCohort, 
  Company, 
  TrainingEvent,
  UserAccount,
  ConvocatoriaStatus
} from '../../types';
import { apiService } from '../../services/api';
import { ConvocatoriaFormModal } from './ConvocatoriaFormModal';

interface ConvocatoriasAdminViewProps {
  currentUser: UserAccount | null;
  courses: TechnicalAcademyCourse[];
  cohorts: TechnicalAcademyCohort[];
  companies: Company[];
  events?: TrainingEvent[];
  onShowToast?: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onRefreshTechnicalData?: () => void;
  onNavigateToCatalog?: () => void;
}

export const ConvocatoriasAdminView: React.FC<ConvocatoriasAdminViewProps> = ({
  currentUser,
  courses = [],
  cohorts = [],
  companies = [],
  events = [],
  onShowToast,
  onRefreshTechnicalData,
  onNavigateToCatalog
}) => {
  const isSuperAdmin = currentUser?.role === 'Super Administrador';
  const isAdminOrSuper = isSuperAdmin || currentUser?.role === 'Administrador / Editor';

  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  // Modales
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [convocatoriaToEdit, setConvocatoriaToEdit] = useState<Convocatoria | null>(null);

  // Panel de gestión de postulaciones
  const [selectedConvocatoria, setSelectedConvocatoria] = useState<Convocatoria | null>(null);
  const [applications, setApplications] = useState<ConvocatoriaApplication[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState<boolean>(false);
  const [appStatusFilter, setAppStatusFilter] = useState<string>('all');
  const [appSearch, setAppSearch] = useState<string>('');
  const [reviewingApp, setReviewingApp] = useState<ConvocatoriaApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [bypassQuotaOnReview, setBypassQuotaOnReview] = useState<boolean>(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Cursos y cohortes internos (soporte standalone y embebido)
  const [internalCourses, setInternalCourses] = useState<TechnicalAcademyCourse[]>(courses);
  const [internalCohorts, setInternalCohorts] = useState<TechnicalAcademyCohort[]>(cohorts);

  useEffect(() => {
    if (courses.length > 0) setInternalCourses(courses);
  }, [courses]);

  useEffect(() => {
    if (cohorts.length > 0) setInternalCohorts(cohorts);
  }, [cohorts]);

  useEffect(() => {
    const loadTechnicalMetadata = async () => {
      try {
        if (internalCourses.length === 0) {
          const c = await apiService.getTechnicalCourses();
          if (c && c.length > 0) setInternalCourses(c);
        }
        if (internalCohorts.length === 0) {
          const coh = await apiService.getTechnicalCohorts();
          if (coh && coh.length > 0) setInternalCohorts(coh);
        }
      } catch (err) {
        console.warn('Error al cargar cursos o cohortes técnicas auxiliares:', err);
      }
    };
    loadTechnicalMetadata();
  }, []);

  // Cargar lista de convocatorias
  const fetchConvocatorias = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getConvocatorias({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        companyId: companyFilter !== 'all' ? companyFilter : undefined,
        search: searchQuery.trim() || undefined
      });
      setConvocatorias(data);

      // Si hay una seleccionada, refrescar sus datos
      if (selectedConvocatoria) {
        const updated = data.find(c => c.id === selectedConvocatoria.id);
        if (updated) setSelectedConvocatoria(updated);
      }
    } catch (err: any) {
      console.error('Error al cargar convocatorias:', err);
      if (onShowToast) onShowToast('Error', err.message || 'No se pudieron cargar las convocatorias', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConvocatorias();
  }, [statusFilter, companyFilter]);

  // Cargar postulaciones de la convocatoria seleccionada
  const fetchApplications = async (convId: string) => {
    setIsLoadingApps(true);
    try {
      const detail = await apiService.getConvocatoriaById(convId);
      setApplications(detail.applications || []);
    } catch (err: any) {
      console.error('Error al cargar postulaciones:', err);
      if (onShowToast) onShowToast('Error', err.message || 'No se pudieron cargar las postulaciones', 'error');
    } finally {
      setIsLoadingApps(false);
    }
  };

  const handleSelectConvocatoriaForApps = (c: Convocatoria) => {
    setSelectedConvocatoria(c);
    fetchApplications(c.id);
  };

  // Métricas agregadas
  const stats = useMemo(() => {
    const total = convocatorias.length;
    const open = convocatorias.filter(c => c.status === 'open').length;
    const pendingApps = convocatorias.reduce((acc, c) => acc + (c.stats?.pendingApplications || 0), 0);
    const approvedApps = convocatorias.reduce((acc, c) => acc + (c.stats?.approvedApplications || 0), 0);
    return { total, open, pendingApps, approvedApps };
  }, [convocatorias]);

  // Convocatorias filtradas localmente
  const filteredConvocatorias = useMemo(() => {
    return convocatorias.filter(c => {
      const matchSearch =
        searchQuery === '' ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.courseTitle && c.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });
  }, [convocatorias, searchQuery]);

  // Postulaciones filtradas
  const filteredApplications = useMemo(() => {
    return applications.filter(a => {
      const matchStatus = appStatusFilter === 'all' || a.status === appStatusFilter;
      const matchSearch =
        appSearch === '' ||
        (a.participantName && a.participantName.toLowerCase().includes(appSearch.toLowerCase())) ||
        a.participantCard.toLowerCase().includes(appSearch.toLowerCase()) ||
        (a.companyName && a.companyName.toLowerCase().includes(appSearch.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [applications, appStatusFilter, appSearch]);

  // Acciones de estado rápido
  const handleQuickStatusChange = async (convId: string, newStatus: ConvocatoriaStatus) => {
    try {
      await apiService.updateConvocatoriaStatus(convId, newStatus);
      if (onShowToast) onShowToast('Éxito', `Estado actualizado a '${newStatus}'`, 'success');
      fetchConvocatorias();
    } catch (err: any) {
      if (onShowToast) onShowToast('Error', err.message || 'No se pudo cambiar el estado', 'error');
    }
  };

  // Eliminar convocatoria
  const handleDeleteConvocatoria = async (convId: string, title: string) => {
    if (!window.confirm(`¿Está seguro de eliminar la convocatoria "${title}"? Se removerán todas las postulaciones asociadas.`)) {
      return;
    }

    try {
      await apiService.deleteConvocatoria(convId);
      if (onShowToast) onShowToast('Eliminado', 'Convocatoria eliminada con éxito', 'info');
      if (selectedConvocatoria?.id === convId) setSelectedConvocatoria(null);
      fetchConvocatorias();
    } catch (err: any) {
      if (onShowToast) onShowToast('Error', err.message || 'Error al eliminar convocatoria', 'error');
    }
  };

  // Revisar postulación
  const handleReviewApplication = async (status: 'approved' | 'rejected' | 'waitlist') => {
    if (!selectedConvocatoria || !reviewingApp) return;

    setIsSubmittingReview(true);
    try {
      const res = await apiService.reviewConvocatoriaApplication(selectedConvocatoria.id, reviewingApp.id, {
        status,
        reviewNotes: reviewNotes.trim() || undefined,
        bypassQuota: bypassQuotaOnReview
      });

      if (onShowToast) {
        onShowToast(
          status === 'approved' ? '¡Postulación Aprobada!' : 'Postulación Actualizada',
          res.enrolledInCohort ? 'Participante matriculado en la cohorte técnica.' : res.message,
          'success'
        );
      }

      setReviewingApp(null);
      setReviewNotes('');
      setBypassQuotaOnReview(false);
      await fetchApplications(selectedConvocatoria.id);
      await fetchConvocatorias();
      if (onRefreshTechnicalData) onRefreshTechnicalData();
    } catch (err: any) {
      console.error('Error al revisar postulación:', err);
      if (onShowToast) onShowToast('Error', err.message || 'No se pudo revisar la postulación', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getStatusBadge = (st: ConvocatoriaStatus) => {
    switch (st) {
      case 'open':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Abierta
          </span>
        );
      case 'draft':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
            Borrador
          </span>
        );
      case 'closed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            Cerrada
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
            En Curso
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            Finalizada
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            Cancelada
          </span>
        );
      default:
        return null;
    }
  };

  const getAppStatusBadge = (st: string) => {
    switch (st) {
      case 'approved':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aprobada
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" /> Pendiente
          </span>
        );
      case 'waitlist':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 flex items-center gap-1">
            <Inbox className="w-3 h-3 text-purple-600" /> Lista de Espera
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" /> Rechazada
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Tarjetas de Métricas Ejecutivas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Convocatorias
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats.total}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Convocatorias Abiertas
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.open}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Postulaciones Pendientes
            </span>
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
            {stats.pendingApps}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Aprobados / Cupos Ocupados
            </span>
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-[#DA291C] dark:text-red-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-[#DA291C] dark:text-red-400">
            {stats.approvedApps}
          </div>
        </div>
      </div>

      {/* 2. Barra de Control, Búsqueda y Botón Nueva Convocatoria */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código, título o curso técnico..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="all">Todos los Estados</option>
            <option value="open">Abiertas</option>
            <option value="draft">Borradores</option>
            <option value="closed">Cerradas</option>
            <option value="in_progress">En Curso</option>
            <option value="completed">Finalizadas</option>
          </select>

          {companies.length > 0 && (
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="all">Todas las Empresas</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        {isAdminOrSuper && (
          <button
            type="button"
            onClick={() => {
              setConvocatoriaToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-[#DA291C] hover:bg-red-700 rounded-xl shadow-md shadow-red-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Convocatoria</span>
          </button>
        )}
      </div>

      {/* 3. Contenedor Principal: Lista de Convocatorias y Panel Lateral de Postulaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista de Convocatorias (Col 7 u 8) */}
        <div className={selectedConvocatoria ? 'lg:col-span-7 space-y-4' : 'lg:col-span-12 space-y-4'}>
          {isLoading ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400">
              <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-red-500" />
              <span className="text-xs font-bold">Cargando convocatorias oficiales...</span>
            </div>
          ) : filteredConvocatorias.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No hay convocatorias registradas con los filtros actuales.
              </p>
              {isAdminOrSuper && (
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(true)}
                  className="text-xs font-bold text-red-600 hover:underline inline-block pt-1 cursor-pointer"
                >
                  + Crear primera convocatoria
                </button>
              )}
            </div>
          ) : (
            filteredConvocatorias.map(c => {
              const isSelected = selectedConvocatoria?.id === c.id;
              const occupancy = c.stats?.occupancyPercentage || 0;

              return (
                <div
                  key={c.id}
                  className={`p-5 bg-white dark:bg-slate-900 rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-[#DA291C] ring-2 ring-red-500/10 shadow-lg'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {c.code}
                        </span>
                        {getStatusBadge(c.status)}
                        {c.status === 'open' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-red-500/10 to-amber-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 flex items-center gap-1 shadow-2xs">
                            <Sparkles className="w-3 h-3 text-red-500" />
                            <span>Publicada en Catálogo</span>
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-400">
                          {c.modality}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        {c.title}
                      </h3>
                      {c.courseTitle && (
                        <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {c.courseTitle}
                        </p>
                      )}
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onNavigateToCatalog && c.status === 'open' && (
                        <button
                          type="button"
                          onClick={onNavigateToCatalog}
                          className="px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                          title="Ver convocatoria en el Catálogo de Cursos"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span className="hidden sm:inline">Ver Catálogo</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSelectConvocatoriaForApps(c)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-[#DA291C] text-white shadow-md shadow-red-600/20'
                            : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50 hover:bg-red-100'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Postulaciones ({c.stats?.totalApplications || 0})</span>
                      </button>

                      {isAdminOrSuper && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setConvocatoriaToEdit(c);
                              setIsFormModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Editar convocatoria"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteConvocatoria(c.id, c.title)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar convocatoria"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Fechas e Información de Sede */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Postulación: <strong>{c.applicationStartDate} al {c.applicationEndDate}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Curso: <strong>{c.trainingStartDate || 'Por definir'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Cupo: <strong>{c.stats?.approvedApplications || 0} / {c.totalQuota}</strong> ({occupancy}%)</span>
                    </div>
                  </div>

                  {/* Desglose de Cupos por Empresa */}
                  {c.companyQuotas && c.companyQuotas.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-red-500" />
                        <span>Cupos Asignados por Empresa:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {c.companyQuotas.map(q => {
                          const isFull = (q.approvedApplications || 0) >= q.allocatedQuota;
                          return (
                            <div
                              key={q.companyId}
                              className={`px-2 py-1 rounded-lg text-xs border flex items-center gap-1.5 ${
                                isFull
                                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="font-semibold text-[11px]">{q.companyName || q.companyId}:</span>
                              <span className="font-bold">{q.approvedApplications || 0}/{q.allocatedQuota}</span>
                              <span className={`text-[9px] px-1 rounded font-black ${
                                isFull ? 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              }`}>
                                {isFull ? 'Lleno' : `${q.availableQuota ?? (q.allocatedQuota - (q.approvedApplications || 0))} disp.`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Toggle rápido de estado */}
                  {isAdminOrSuper && (
                    <div className="flex items-center justify-between mt-3 pt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Acción Rápida de Estado:</span>
                      <div className="flex items-center gap-1.5">
                        {c.status !== 'open' && (
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(c.id, 'open')}
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                          >
                            Abrir Postulación
                          </button>
                        )}
                        {c.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(c.id, 'closed')}
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 cursor-pointer"
                          >
                            Cerrar Plazo
                          </button>
                        )}
                        {c.status !== 'completed' && c.status !== 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(c.id, 'completed')}
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-purple-700 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 cursor-pointer"
                          >
                            Finalizar
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Panel Lateral de Postulaciones (Col 5) */}
        {selectedConvocatoria && (
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-lg space-y-4 h-fit sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-mono font-black text-red-600 dark:text-red-400">
                  {selectedConvocatoria.code}
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white truncate max-w-xs" title={selectedConvocatoria.title}>
                  Postulaciones: {selectedConvocatoria.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConvocatoria(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filtros de postulaciones */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                placeholder="Buscar candidato..."
                className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
              <select
                value={appStatusFilter}
                onChange={(e) => setAppStatusFilter(e.target.value)}
                className="px-2 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">Todas ({applications.length})</option>
                <option value="pending">Pendientes</option>
                <option value="approved">Aprobadas</option>
                <option value="waitlist">Lista de Espera</option>
                <option value="rejected">Rechazadas</option>
              </select>
            </div>

            {/* Lista de candidatos */}
            <div className="max-h-[550px] overflow-y-auto space-y-2.5 pr-1">
              {isLoadingApps ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <RotateCw className="w-5 h-5 animate-spin mx-auto mb-1 text-red-500" />
                  <span>Cargando postulaciones...</span>
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <span>No hay postulaciones registradas en esta vista.</span>
                </div>
              ) : (
                filteredApplications.map(app => (
                  <div
                    key={app.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {app.participantName || `Tarjeta ${app.participantCard}`}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {app.companyName || 'Empresa'} • Tarjeta: {app.participantCard}
                        </div>
                      </div>
                      {getAppStatusBadge(app.status)}
                    </div>

                    {app.applicantType === 'supervisor' && app.nominatedByName && (
                      <div className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded">
                        Nominado por supervisor: {app.nominatedByName}
                      </div>
                    )}

                    {app.motivation && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                        "{app.motivation}"
                      </p>
                    )}

                    {app.reviewNotes && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        <strong>Nota de revisión:</strong> {app.reviewNotes}
                      </p>
                    )}

                    {/* Botones de acción para administradores */}
                    {isAdminOrSuper && (
                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        {app.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => {
                              setReviewingApp(app);
                              setReviewNotes('');
                              setBypassQuotaOnReview(false);
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Aprobar
                          </button>
                        )}

                        {app.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => {
                              setReviewingApp(app);
                              setReviewNotes('');
                              setBypassQuotaOnReview(false);
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            Rechazar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Revisión / Aprobación con opciones */}
      {reviewingApp && selectedConvocatoria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Revisar Postulación: {reviewingApp.participantName || reviewingApp.participantCard}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Empresa: <strong>{reviewingApp.companyName}</strong>
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Notas / Motivo de la Decisión
              </label>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Observaciones para el participante..."
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {isSuperAdmin && (
              <label className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bypassQuotaOnReview}
                  onChange={(e) => setBypassQuotaOnReview(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span>Forzar Aprobación con Sobrecupo (Ignorar límite de empresa)</span>
              </label>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewingApp(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleReviewApplication('rejected')}
                disabled={isSubmittingReview}
                className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-xl cursor-pointer"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => handleReviewApplication('waitlist')}
                disabled={isSubmittingReview}
                className="px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-xl cursor-pointer"
              >
                Lista de Espera
              </button>
              <button
                type="button"
                onClick={() => handleReviewApplication('approved')}
                disabled={isSubmittingReview}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
              >
                Aprobar e Inscribir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Convocatoria */}
      <ConvocatoriaFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        convocatoriaToEdit={convocatoriaToEdit}
        courses={internalCourses}
        cohorts={internalCohorts}
        companies={companies}
        events={events}
        onSuccess={() => {
          fetchConvocatorias();
          if (onRefreshTechnicalData) onRefreshTechnicalData();
          if (onShowToast) onShowToast('Éxito', 'Convocatoria guardada correctamente', 'success');
        }}
      />
    </div>
  );
};
