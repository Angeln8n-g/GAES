import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  Sparkles, 
  Search, 
  Filter, 
  Clock, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  ChevronRight, 
  UserCheck, 
  Flame, 
  Calendar, 
  ArrowRight,
  TrendingUp,
  Sliders,
  X,
  ExternalLink,
  BookOpen,
  Trash2,
  RefreshCw,
  Eye,
  LayoutGrid,
  List,
  Copy,
  Download,
  Check,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Sun,
  Sunset,
  CalendarDays,
  Clock4,
  Info,
  LogOut,
  Edit3
} from 'lucide-react';
import { apiService } from '../../services/api';
import { CourseSuggestion, UserAccount, Company, CourseWaitlistEntry } from '../../types';
import { CourseSuggestionModal } from './CourseSuggestionModal';
import { exportCourseWaitlistToExcel } from '../../utils/excelUtils';

interface CourseDemandViewProps {
  currentUser: UserAccount | null;
  companies?: Company[];
  selectedCompanyId?: string;
  onOpenCreateEventWithData?: (prefilledData: Partial<any>) => void;
  onShowToast?: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

const CATEGORIES = [
  "Todos", 
  "Curso", 
  "Taller", 
  "Webinar", 
  "Charla", 
  "Certificación Técnica", 
  "Seguridad y Prevención"
];

const SCHEDULE_OPTIONS = [
  { value: 'Cualquiera', label: 'Cualquier Horario', icon: Clock4, desc: 'Flexible según disponibilidad' },
  { value: 'Horario Matutino (Mañana)', label: 'Mañana (AM)', icon: Sun, desc: '8:00 AM - 12:00 PM' },
  { value: 'Horario Vespertino (Tarde)', label: 'Tarde (PM)', icon: Sunset, desc: '1:00 PM - 5:00 PM' },
  { value: 'Fines de Semana (Sábados)', label: 'Sábados', icon: CalendarDays, desc: 'Jornada intensiva fin de semana' }
];

type SortOption = 'quorum_pct' | 'newest' | 'remaining_slots' | 'title';
type ViewMode = 'grid' | 'table';

export const CourseDemandView: React.FC<CourseDemandViewProps> = ({
  currentUser,
  companies = [],
  selectedCompanyId = 'all',
  onOpenCreateEventWithData,
  onShowToast
}) => {
  const [suggestions, setSuggestions] = useState<CourseSuggestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filtros y búsquedas
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [onlyMyWaitlists, setOnlyMyWaitlists] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>('quorum_pct');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Modales
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState<boolean>(false);
  const [inspectingSuggestion, setInspectingSuggestion] = useState<CourseSuggestion | null>(null);
  
  // Modal Unirse / Editar Horario de Lista de Espera
  const [joiningSuggestion, setJoiningSuggestion] = useState<CourseSuggestion | null>(null);
  const [joinSchedule, setJoinSchedule] = useState<string>('Cualquiera');
  const [joinNotes, setJoinNotes] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // Modal Ajuste de Quórum (reemplaza window.prompt)
  const [quorumModalSuggestion, setQuorumModalSuggestion] = useState<CourseSuggestion | null>(null);
  const [newQuorumValue, setNewQuorumValue] = useState<number>(10);
  const [isSavingQuorum, setIsSavingQuorum] = useState<boolean>(false);

  // Modal Confirmar Eliminación (reemplaza window.confirm)
  const [deleteModalSuggestion, setDeleteModalSuggestion] = useState<CourseSuggestion | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Modal Confirmar Salida de Lista de Espera (reemplaza window.confirm)
  const [leaveModalSuggestion, setLeaveModalSuggestion] = useState<CourseSuggestion | null>(null);
  const [isLeaving, setIsLeaving] = useState<boolean>(false);

  // Búsqueda y filtrado dentro del modal de inspección
  const [waitlistSearch, setWaitlistSearch] = useState<string>('');
  const [waitlistScheduleFilter, setWaitlistScheduleFilter] = useState<string>('all');
  const [copiedEmails, setCopiedEmails] = useState<boolean>(false);

  // Tarjetas con descripción expandida
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const isSuperAdmin = currentUser?.role === 'Super Administrador';
  const isAdminOrEvaluator = isSuperAdmin || currentUser?.role === 'Administrador / Editor' || currentUser?.role === 'Evaluador / Tutor';

  // Debounce en búsqueda para no saturar el backend
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 280);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Carga de datos desde la API
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiService.getCourseSuggestions({
        category: selectedCategory === 'Todos' ? undefined : selectedCategory,
        status: statusFilter === 'all' ? undefined : statusFilter,
        companyId: selectedCompanyId,
        search: debouncedSearch.trim() || undefined
      });
      setSuggestions(data);
    } catch (err: any) {
      console.error('Error al cargar sugerencias de cursos:', err);
      if (onShowToast) {
        onShowToast('Error', err.message || 'No se pudieron cargar los cursos a demanda', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, statusFilter, selectedCompanyId, debouncedSearch]);

  // Manejo de tecla Escape global para modales activos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (joiningSuggestion) setJoiningSuggestion(null);
        else if (inspectingSuggestion) setInspectingSuggestion(null);
        else if (quorumModalSuggestion) setQuorumModalSuggestion(null);
        else if (deleteModalSuggestion) setDeleteModalSuggestion(null);
        else if (leaveModalSuggestion) setLeaveModalSuggestion(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [joiningSuggestion, inspectingSuggestion, quorumModalSuggestion, deleteModalSuggestion, leaveModalSuggestion]);

  // Manejar unirse o actualizar preferencia de lista de espera
  const handleConfirmJoin = async () => {
    if (!joiningSuggestion) return;
    setIsJoining(true);
    try {
      const res = await apiService.joinCourseWaitlist(joiningSuggestion.id, {
        preferredSchedule: joinSchedule,
        notes: joinNotes.trim()
      });
      if (onShowToast) {
        onShowToast('¡Inscrito en Lista de Espera!', res.message, 'success');
      }
      setJoiningSuggestion(null);
      setJoinNotes('');
      loadData();
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('Error', err.message || 'Error al inscribirse en lista de espera', 'error');
      }
    } finally {
      setIsJoining(false);
    }
  };

  // Manejar salida de la lista de espera
  const handleConfirmLeave = async () => {
    if (!leaveModalSuggestion) return;
    setIsLeaving(true);
    try {
      const res = await apiService.leaveCourseWaitlist(leaveModalSuggestion.id);
      if (onShowToast) {
        onShowToast('Lista de Espera Actualizada', res.message, 'info');
      }
      setLeaveModalSuggestion(null);
      loadData();
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('Error', err.message || 'Error al salir de la lista de espera', 'error');
      }
    } finally {
      setIsLeaving(false);
    }
  };

  // Manejar cambio de quórum por administrador
  const handleSaveQuorum = async () => {
    if (!quorumModalSuggestion) return;
    if (newQuorumValue < 1) {
      if (onShowToast) onShowToast('Valor inválido', 'El quórum debe ser de al menos 1 participante.', 'error');
      return;
    }
    setIsSavingQuorum(true);
    try {
      await apiService.updateCourseSuggestionQuorum(quorumModalSuggestion.id, newQuorumValue);
      if (onShowToast) {
        onShowToast('Quórum Actualizado', `Nuevo quórum fijado en ${newQuorumValue} participantes para "${quorumModalSuggestion.title}".`, 'success');
      }
      setQuorumModalSuggestion(null);
      loadData();
    } catch (err: any) {
      if (onShowToast) onShowToast('Error', err.message || 'Error al actualizar quórum', 'error');
    } finally {
      setIsSavingQuorum(false);
    }
  };

  // Manejar eliminación de propuesta
  const handleConfirmDelete = async () => {
    if (!deleteModalSuggestion) return;
    setIsDeleting(true);
    try {
      await apiService.deleteCourseSuggestion(deleteModalSuggestion.id);
      if (onShowToast) onShowToast('Propuesta Eliminada', 'El curso sugerido fue eliminado exitosamente.', 'info');
      setDeleteModalSuggestion(null);
      loadData();
    } catch (err: any) {
      if (onShowToast) onShowToast('Error', err.message || 'Error al eliminar propuesta', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Copiar correos de la lista de espera al portapapeles
  const handleCopyWaitlistEmails = (entries: CourseWaitlistEntry[]) => {
    const emails = entries
      .map(e => e.participantEmail)
      .filter(Boolean)
      .join('; ');

    if (!emails) {
      if (onShowToast) onShowToast('Sin correos', 'No hay correos registrados en esta lista de espera.', 'info');
      return;
    }

    navigator.clipboard.writeText(emails).then(() => {
      setCopiedEmails(true);
      if (onShowToast) {
        onShowToast('Correos Copiados', `${entries.length} correos copiados al portapapeles para Outlook/Teams.`, 'success');
      }
      setTimeout(() => setCopiedEmails(false), 3000);
    });
  };

  // Exportar lista de espera a Excel
  const handleExportWaitlistExcel = (suggestion: CourseSuggestion) => {
    const entries = suggestion.waitlist || [];
    if (entries.length === 0) {
      if (onShowToast) onShowToast('Lista Vacía', 'No hay participantes registrados para exportar.', 'info');
      return;
    }
    exportCourseWaitlistToExcel(suggestion, entries);
    if (onShowToast) {
      onShowToast('Excel Generado', `Lista de espera descargada con ${entries.length} participantes.`, 'success');
    }
  };

  // Métricas globales
  const stats = useMemo(() => {
    const total = suggestions.length;
    const reached = suggestions.filter(s => s.status === 'quorum_alcanzado' || (s.currentQuorum >= s.minQuorum)).length;
    const myWaitlists = suggestions.filter(s => s.isUserInWaitlist).length;
    const totalPeople = suggestions.reduce((acc, curr) => acc + (curr.currentQuorum || 0), 0);
    return { total, reached, myWaitlists, totalPeople };
  }, [suggestions]);

  // Conteo dinámico por categoría
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: suggestions.length };
    CATEGORIES.forEach(cat => {
      if (cat !== 'Todos') {
        counts[cat] = suggestions.filter(s => s.category === cat).length;
      }
    });
    return counts;
  }, [suggestions]);

  // Filtrado y ordenación en cliente
  const filteredAndSortedSuggestions = useMemo(() => {
    let result = [...suggestions];

    // Filtro "Mis Listas de Espera"
    if (onlyMyWaitlists) {
      result = result.filter(s => s.isUserInWaitlist);
    }

    // Ordenación
    result.sort((a, b) => {
      if (sortBy === 'quorum_pct') {
        const pctA = ((a.currentQuorum || 0) / (a.minQuorum || 1));
        const pctB = ((b.currentQuorum || 0) / (b.minQuorum || 1));
        return pctB - pctA;
      }
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortBy === 'remaining_slots') {
        const remA = Math.max(0, a.minQuorum - (a.currentQuorum || 0));
        const remB = Math.max(0, b.minQuorum - (b.currentQuorum || 0));
        return remA - remB;
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }, [suggestions, onlyMyWaitlists, sortBy]);

  // Filtro de participantes dentro del modal de inspección
  const filteredInspectWaitlist = useMemo(() => {
    if (!inspectingSuggestion || !inspectingSuggestion.waitlist) return [];
    let list = [...inspectingSuggestion.waitlist];

    if (waitlistSearch.trim()) {
      const q = waitlistSearch.toLowerCase();
      list = list.filter(w => 
        (w.participantName || '').toLowerCase().includes(q) ||
        (w.participantEmail || '').toLowerCase().includes(q) ||
        (w.companyName || '').toLowerCase().includes(q) ||
        (w.participantCard || '').toLowerCase().includes(q)
      );
    }

    if (waitlistScheduleFilter !== 'all') {
      list = list.filter(w => (w.preferredSchedule || 'Cualquiera') === waitlistScheduleFilter);
    }

    return list;
  }, [inspectingSuggestion, waitlistSearch, waitlistScheduleFilter]);

  // Alternar expansión de descripción de tarjeta
  const toggleCardExpansion = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Color de acento para la categoría
  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'Certificación Técnica':
        return 'bg-red-50 dark:bg-red-950/40 text-[#DA291C] border-red-200 dark:border-red-900/50';
      case 'Curso':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50';
      case 'Taller':
        return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50';
      case 'Webinar':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50';
      case 'Seguridad y Prevención':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6 pb-14 animate-in fade-in duration-200">
      
      {/* 1. HERO BANNER INSTITUCIONAL CLARO */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-black tracking-wider uppercase mb-3 shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Capacitaciones a Demanda • Quórum Dinámico</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Cursos Sugeridos & Listas de Espera
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              ¿Hay un tema técnico, norma o certificación que requieras en tu área? <strong>Proponlo o únete a las listas de espera.</strong> Al alcanzar el quórum mínimo requerido, la Dirección de Capacitación de Claro lo agenda con instructor y aula oficial.
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={() => setIsSuggestModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3.5 bg-[#DA291C] hover:bg-red-700 active:bg-red-800 text-white text-xs font-black rounded-2xl shadow-lg shadow-red-500/30 transition-all flex items-center justify-center space-x-2.5 cursor-pointer transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Proponer Nuevo Curso</span>
            </button>
          </div>
        </div>

        {/* Cintas de Métricas Interactivas (Filtrado Rápido) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          
          {/* Métrica 1: Todos */}
          <button
            onClick={() => {
              setStatusFilter('all');
              setOnlyMyWaitlists(false);
            }}
            className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
              statusFilter === 'all' && !onlyMyWaitlists
                ? 'bg-slate-800 border-red-500/60 ring-2 ring-red-500/20 shadow-md'
                : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
            }`}
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cursos a Demanda</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-white">{stats.total}</span>
              <span className="text-[10px] text-slate-400">propuestas</span>
            </div>
          </button>

          {/* Métrica 2: Quórum Alcanzado */}
          <button
            onClick={() => {
              setStatusFilter('quorum_alcanzado');
              setOnlyMyWaitlists(false);
            }}
            className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
              statusFilter === 'quorum_alcanzado'
                ? 'bg-emerald-950/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                : 'bg-emerald-950/30 border-emerald-800/50 hover:bg-emerald-950/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Quórum Listo</span>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-300">{stats.reached}</span>
              <span className="text-[10px] text-emerald-400 font-semibold">listos para abrir</span>
            </div>
          </button>

          {/* Métrica 3: Mis Listas de Espera */}
          <button
            onClick={() => {
              setOnlyMyWaitlists(prev => !prev);
              setStatusFilter('all');
            }}
            className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
              onlyMyWaitlists
                ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Mis Listas</span>
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-amber-400">{stats.myWaitlists}</span>
              <span className="text-[10px] text-slate-300">inscripciones</span>
            </div>
          </button>

          {/* Métrica 4: Total Interesados */}
          <div className="p-3.5 rounded-2xl text-left bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Demanda</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-white">{stats.totalPeople}</span>
              <span className="text-[10px] text-slate-400">solicitudes sumadas</span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. BARRA DE CONTROL, BÚSQUEDA Y FILTRADO */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Buscador con Debounce y Botón de Limpieza */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por tema técnico, descripción o categoría..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#DA291C] focus:outline-hidden text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro Rápido de Estado */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOnlyMyWaitlists(false);
            }}
            className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer focus:ring-2 focus:ring-[#DA291C]"
          >
            <option value="all">Todos los Estados</option>
            <option value="recolectando_quorum">⏳ En Recolección de Quórum</option>
            <option value="quorum_alcanzado">🔥 Quórum Alcanzado (Prioritarios)</option>
            <option value="programado">✓ Programados Oficialmente</option>
          </select>

          {/* Ordenar Por */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent border-none text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-hidden pr-1"
            >
              <option value="quorum_pct">Mayor Avance de Quórum</option>
              <option value="remaining_slots">Faltan Menos Cupos</option>
              <option value="newest">Más Recientes</option>
              <option value="title">Alfabético (A - Z)</option>
            </select>
          </div>

          {/* Alternar Modo de Vista (Cuadrícula vs Tabla) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              title="Vista de Cuadrícula"
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-[#DA291C] shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Vista Compacta / Tabla"
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-[#DA291C] shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Botón Refrescar */}
          <button
            onClick={loadData}
            title="Actualizar listado"
            className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#DA291C]' : ''}`} />
          </button>
        </div>

        {/* Filtros de Categoría con Chips y Conteo */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-[#DA291C] text-white shadow-sm shadow-red-500/25 ring-2 ring-red-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isSelected 
                    ? 'bg-white/20 text-white' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CONTENIDO: CARGANDO / VACÍO / TARJETAS / TABLA */}
      {loading && suggestions.length === 0 ? (
        
        /* Skeleton Shimmer Loading */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>
              <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-14 w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
              <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl" />
              <div className="h-9 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>

      ) : filteredAndSortedSuggestions.length === 0 ? (
        
        /* Estado Vacío Refinado */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 sm:p-16 text-center shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-950/40 text-[#DA291C] flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-900/50 shadow-inner">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            {searchInput || selectedCategory !== 'Todos' || statusFilter !== 'all' || onlyMyWaitlists
              ? 'No se encontraron cursos con estos filtros'
              : 'Aún no hay cursos a demanda registrados'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
            {searchInput || selectedCategory !== 'Todos' || statusFilter !== 'all' || onlyMyWaitlists
              ? 'Prueba modificando tus términos de búsqueda o limpiando los filtros seleccionados.'
              : '¿Tienes una necesidad de aprendizaje técnico? Sé el primero en sugerir un curso y convocar interesados.'}
          </p>

          <div className="flex items-center justify-center gap-3 mt-6">
            {(searchInput || selectedCategory !== 'Todos' || statusFilter !== 'all' || onlyMyWaitlists) && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSelectedCategory('Todos');
                  setStatusFilter('all');
                  setOnlyMyWaitlists(false);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
              >
                Limpiar Filtros
              </button>
            )}

            <button
              onClick={() => setIsSuggestModalOpen(true)}
              className="px-5 py-2.5 bg-[#DA291C] hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md shadow-red-500/20 transition-all inline-flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Proponer Curso Ahora</span>
            </button>
          </div>
        </div>

      ) : viewMode === 'grid' ? (

        /* ==================================================== */
        /* MODO CUADRÍCULA (TARJETAS ENRIQUECIDAS) */
        /* ==================================================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAndSortedSuggestions.map((sug) => {
            const isQuorumReached = sug.status === 'quorum_alcanzado' || (sug.currentQuorum >= sug.minQuorum);
            const isScheduled = sug.status === 'programado';
            const progressPct = Math.min(100, Math.round(((sug.currentQuorum || 0) / (sug.minQuorum || 1)) * 100));
            const remainingSlots = Math.max(0, sug.minQuorum - (sug.currentQuorum || 0));
            const isExpanded = !!expandedCards[sug.id];

            return (
              <div
                key={sug.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border transition-all flex flex-col justify-between group relative overflow-hidden ${
                  isScheduled
                    ? 'border-purple-300 dark:border-purple-800/60 ring-1 ring-purple-400/20'
                    : isQuorumReached
                    ? 'border-emerald-400 dark:border-emerald-700/80 ring-2 ring-emerald-500/15 shadow-emerald-500/5'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
                }`}
              >
                {/* Resplandor decorativo de quórum alcanzado */}
                {isQuorumReached && (
                  <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-emerald-500/20 via-teal-500/10 to-transparent rounded-bl-full pointer-events-none" />
                )}

                <div>
                  {/* Fila de Badges Superiores */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase ${getCategoryBadgeClass(sug.category)}`}>
                        {sug.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {sug.modality}
                      </span>
                    </div>

                    <div>
                      {isScheduled ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 inline-flex items-center gap-1 border border-purple-200 dark:border-purple-800/60">
                          <CheckCircle2 className="w-3 h-3 text-purple-600" /> Programado
                        </span>
                      ) : isQuorumReached ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 inline-flex items-center gap-1 border border-emerald-300 dark:border-emerald-800 animate-pulse">
                          <Flame className="w-3 h-3 text-amber-500" /> Quórum Listo
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80">
                          Faltan {remainingSlots} cupos
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Título de la Propuesta */}
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-[#DA291C] transition-colors leading-snug mb-2">
                    {sug.title}
                  </h3>

                  {/* Justificación con Opción "Ver más" */}
                  {sug.description && (
                    <div className="mb-4">
                      <p className={`text-xs text-slate-600 dark:text-slate-400 leading-relaxed ${
                        isExpanded ? '' : 'line-clamp-2'
                      }`}>
                        {sug.description}
                      </p>
                      {sug.description.length > 110 && (
                        <button
                          type="button"
                          onClick={() => toggleCardExpansion(sug.id)}
                          className="text-[11px] font-bold text-[#DA291C] hover:underline mt-1 inline-flex items-center space-x-0.5"
                        >
                          <span>{isExpanded ? 'Ver menos' : 'Ver más'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* SECCIÓN DE QUÓRUM Y PROGRESO */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#DA291C]" />
                        <span>Progreso de Quórum</span>
                      </span>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {sug.currentQuorum} / {sug.minQuorum} ({progressPct}%)
                      </span>
                    </div>

                    {/* Barra de progreso visual */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isQuorumReached
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm'
                            : 'bg-gradient-to-r from-amber-500 to-red-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    {/* Píldoras de micro-información */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="inline-flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{sug.targetHours || 8}h estimadas</span>
                      </span>

                      <span className="inline-flex items-center space-x-1 truncate max-w-[150px]">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{sug.companyName || 'Claro'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* ACCIONES Y BOTONES INFERIORES */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  
                  {/* Estado de Inscripción del Usuario */}
                  {sug.isUserInWaitlist ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <button
                        onClick={() => {
                          setJoiningSuggestion(sug);
                          setJoinSchedule('Cualquiera');
                        }}
                        title="Editar mi horario preferido"
                        className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-center inline-flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors cursor-pointer truncate"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Inscrito en Lista</span>
                      </button>

                      <button
                        onClick={() => setLeaveModalSuggestion(sug)}
                        title="Salir de la lista de espera"
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setJoiningSuggestion(sug);
                        setJoinSchedule('Cualquiera');
                      }}
                      className="flex-1 py-2.5 px-4 bg-[#DA291C] hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Unirme a Lista de Espera</span>
                    </button>
                  )}

                  {/* Acciones de Gestión para Administrador / Evaluador */}
                  {isAdminOrEvaluator && (
                    <div className="flex items-center gap-1 shrink-0">
                      
                      {/* Ver Lista de Espera Detallada */}
                      <button
                        onClick={() => {
                          setInspectingSuggestion(sug);
                          setWaitlistSearch('');
                          setWaitlistScheduleFilter('all');
                        }}
                        title="Ver participantes registrados"
                        className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {isSuperAdmin && (
                        <>
                          {/* Ajustar Quórum */}
                          <button
                            onClick={() => {
                              setQuorumModalSuggestion(sug);
                              setNewQuorumValue(sug.minQuorum);
                            }}
                            title="Ajustar Quórum Requerido"
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          {/* Eliminar Propuesta */}
                          <button
                            onClick={() => setDeleteModalSuggestion(sug)}
                            title="Eliminar propuesta"
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}

                </div>

              </div>
            );
          })}
        </div>

      ) : (

        /* ==================================================== */
        /* MODO TABLA / LISTA COMPACTA */
        /* ==================================================== */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Curso / Propuesta</th>
                  <th className="py-3.5 px-3">Categoría & Modalidad</th>
                  <th className="py-3.5 px-3">Empresa</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Progreso Quórum</th>
                  <th className="py-3.5 px-3">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAndSortedSuggestions.map((sug) => {
                  const isQuorumReached = sug.status === 'quorum_alcanzado' || (sug.currentQuorum >= sug.minQuorum);
                  const isScheduled = sug.status === 'programado';
                  const progressPct = Math.min(100, Math.round(((sug.currentQuorum || 0) / (sug.minQuorum || 1)) * 100));

                  return (
                    <tr key={sug.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-white leading-tight">
                          {sug.title}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          {sug.description || `Duración: ${sug.targetHours || 8}h estimadas`}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${getCategoryBadgeClass(sug.category)}`}>
                          {sug.category}
                        </span>
                        <span className="block text-[10px] text-slate-500 mt-1">
                          {sug.modality}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                        {sug.companyName || 'Claro'}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {sug.currentQuorum} / {sug.minQuorum}
                          </span>
                          <span className="font-black text-slate-900 dark:text-white">{progressPct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isQuorumReached ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isScheduled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                            Programado
                          </span>
                        ) : isQuorumReached ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Quórum Listo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80">
                            En Recolección
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1.5">
                          {sug.isUserInWaitlist ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 text-[11px] font-bold">
                              ✓ Inscrito
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setJoiningSuggestion(sug);
                                setJoinSchedule('Cualquiera');
                              }}
                              className="px-3 py-1 bg-[#DA291C] hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                            >
                              Unirme
                            </button>
                          )}

                          {isAdminOrEvaluator && (
                            <button
                              onClick={() => {
                                setInspectingSuggestion(sug);
                                setWaitlistSearch('');
                                setWaitlistScheduleFilter('all');
                              }}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
                              title="Ver participantes"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      )}

      {/* ==================================================== */}
      {/* 4. MODAL: UNIRSE A LA LISTA DE ESPERA CON HORARIO */}
      {/* ==================================================== */}
      {joiningSuggestion && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setJoiningSuggestion(null);
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            {/* Header del modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#DA291C] flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {joiningSuggestion.isUserInWaitlist ? 'Actualizar Preferencia de Horario' : 'Unirme a Lista de Espera'}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Suma tu interés para viabilizar la apertura de este curso
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setJoiningSuggestion(null)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                title="Cerrar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ficha rápida del curso */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60">
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                {joiningSuggestion.title}
              </span>
              <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-1">
                <span>Quórum actual: <strong>{joiningSuggestion.currentQuorum} / {joiningSuggestion.minQuorum}</strong></span>
                <span>•</span>
                <span>Modalidad: {joiningSuggestion.modality}</span>
              </div>
            </div>

            {/* Selector Visual de Horario */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                ¿Qué horario te conviene más? *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SCHEDULE_OPTIONS.map((opt) => {
                  const IconComp = opt.icon;
                  const isSelected = joinSchedule === opt.value;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setJoinSchedule(opt.value)}
                      className={`p-2.5 rounded-xl border text-left flex items-start space-x-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#DA291C] bg-red-50/50 dark:bg-red-950/20 text-[#DA291C] ring-1 ring-[#DA291C]'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <IconComp className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate">{opt.label}</span>
                        <span className="text-[10px] text-slate-500 block truncate">{opt.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comentarios u Observaciones */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Comentarios / Justificación Opcional:
              </label>
              <input
                type="text"
                placeholder="Ej. Requiero esta formación para el despliegue del proyecto FTTH..."
                value={joinNotes}
                onChange={(e) => setJoinNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Acciones del Modal */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setJoiningSuggestion(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isJoining}
                onClick={handleConfirmJoin}
                className="px-5 py-2.5 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-black shadow-sm transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center space-x-2"
              >
                {isJoining ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Inscribiendo...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{joiningSuggestion.isUserInWaitlist ? 'Guardar Cambios' : 'Confirmar Inscripción'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. MODAL: INSPECCIÓN DE PARTICIPANTES (ADMIN / EVALUADOR) */}
      {/* ==================================================== */}
      {inspectingSuggestion && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectingSuggestion(null);
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200">
            
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[#DA291C] text-white flex items-center justify-center shrink-0 shadow-md shadow-red-500/20">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                    Participantes en Lista de Espera
                  </h3>
                  <span className="text-xs text-[#DA291C] font-extrabold truncate block">
                    {inspectingSuggestion.title}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setInspectingSuggestion(null)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Cerrar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Progreso y Acciones de Exportación */}
            <div className="py-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              
              <div className="flex items-center space-x-3 text-xs text-slate-600 dark:text-slate-400">
                <span>
                  Registrados: <strong className="text-slate-900 dark:text-white font-black">{inspectingSuggestion.waitlist?.length || inspectingSuggestion.currentQuorum}</strong>
                </span>
                <span>•</span>
                <span>
                  Meta: <strong className="text-[#DA291C] font-black">{inspectingSuggestion.minQuorum}</strong>
                </span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  (inspectingSuggestion.currentQuorum >= inspectingSuggestion.minQuorum)
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}>
                  {inspectingSuggestion.currentQuorum >= inspectingSuggestion.minQuorum ? 'Quórum Listo' : 'Recogiendo'}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {/* Copiar Correos */}
                <button
                  onClick={() => handleCopyWaitlistEmails(inspectingSuggestion.waitlist || [])}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
                  title="Copiar todos los correos para enviar citación por Teams o correo"
                >
                  {copiedEmails ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600">¡Copiados!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Correos</span>
                    </>
                  )}
                </button>

                {/* Exportar Excel */}
                <button
                  onClick={() => handleExportWaitlistExcel(inspectingSuggestion)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  title="Descargar reporte en formato Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Excel</span>
                </button>
              </div>

            </div>

            {/* Filtros Internos del Modal */}
            <div className="py-2.5 flex flex-wrap items-center gap-2.5 shrink-0 border-b border-slate-100 dark:border-slate-800">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por nombre, correo, cédula o empresa..."
                  value={waitlistSearch}
                  onChange={(e) => setWaitlistSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <select
                value={waitlistScheduleFilter}
                onChange={(e) => setWaitlistScheduleFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">Todos los Horarios</option>
                <option value="Cualquiera">Cualquiera</option>
                <option value="Horario Matutino (Mañana)">Mañana (AM)</option>
                <option value="Horario Vespertino (Tarde)">Tarde (PM)</option>
                <option value="Fines de Semana (Sábados)">Sábados</option>
              </select>
            </div>

            {/* Listado con Scroll */}
            <div className="overflow-y-auto py-3 flex-1 space-y-2">
              {!inspectingSuggestion.waitlist || inspectingSuggestion.waitlist.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  No hay colaboradores registrados en esta lista de espera aún.
                </div>
              ) : filteredInspectWaitlist.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Ningún participante coincide con los términos de búsqueda en la lista.
                </div>
              ) : (
                filteredInspectWaitlist.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-700 dark:text-slate-300 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-extrabold text-slate-900 dark:text-white block truncate">
                          {entry.participantName}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {entry.participantEmail} • {entry.companyName || 'Claro'}
                        </span>
                        {entry.notes && (
                          <span className="text-[10px] text-slate-400 italic block mt-0.5 line-clamp-1">
                            "{entry.notes}"
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 block">
                        {entry.preferredSchedule || 'Cualquiera'}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer del Modal */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              {isSuperAdmin && onOpenCreateEventWithData && (
                <button
                  onClick={() => {
                    const data = {
                      title: inspectingSuggestion.title,
                      description: inspectingSuggestion.description,
                      category: inspectingSuggestion.category,
                      modality: inspectingSuggestion.modality,
                      duration: inspectingSuggestion.targetHours
                    };
                    setInspectingSuggestion(null);
                    onOpenCreateEventWithData(data);
                  }}
                  className="px-4 py-2.5 bg-[#DA291C] hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md shadow-red-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Programar Evento Oficial Ahora</span>
                </button>
              )}

              <button
                onClick={() => setInspectingSuggestion(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 ml-auto cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 6. MODAL: AJUSTAR QUÓRUM MÍNIMO (ADMIN) */}
      {/* ==================================================== */}
      {quorumModalSuggestion && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuorumModalSuggestion(null);
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Ajustar Quórum Mínimo
                  </h3>
                  <span className="text-[11px] text-slate-500 line-clamp-1">
                    {quorumModalSuggestion.title}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setQuorumModalSuggestion(null)} 
                className="text-slate-400 hover:text-slate-600"
                title="Cerrar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Define cuántos participantes registrados se requieren para marcar esta capacitación como <strong>Quórum Alcanzado</strong> y habilitar su agendamiento.
              </p>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Nuevo Quórum Requerido:</span>
                  <span className="text-lg font-black text-[#DA291C]">{newQuorumValue}</span>
                </div>

                <input
                  type="range"
                  min="2"
                  max="40"
                  value={newQuorumValue}
                  onChange={(e) => setNewQuorumValue(parseInt(e.target.value) || 2)}
                  className="w-full accent-[#DA291C] cursor-pointer"
                />

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>2 colaboradores</span>
                  <span>40 colaboradores</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setQuorumModalSuggestion(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isSavingQuorum}
                onClick={handleSaveQuorum}
                className="px-5 py-2.5 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-black shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSavingQuorum ? 'Guardando...' : 'Actualizar Quórum'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 7. MODAL: CONFIRMAR ELIMINACIÓN DE PROPUESTA (ADMIN) */}
      {/* ==================================================== */}
      {deleteModalSuggestion && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteModalSuggestion(null);
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-[#DA291C] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                ¿Eliminar Propuesta de Curso?
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                "{deleteModalSuggestion.title}"
              </p>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Esta acción eliminará el curso a demanda y cancelará todos los registros de la lista de espera ({deleteModalSuggestion.currentQuorum} colaboradores). Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalSuggestion(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md shadow-red-600/20 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Curso'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 8. MODAL: CONFIRMAR SALIDA DE LISTA DE ESPERA */}
      {/* ==================================================== */}
      {leaveModalSuggestion && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLeaveModalSuggestion(null);
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
              <LogOut className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                ¿Salir de la Lista de Espera?
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                "{leaveModalSuggestion.title}"
              </p>
              <p className="text-[11px] text-slate-400 mt-2">
                Tu cupo y turno serán liberados y se restará tu interés del quórum total del curso.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setLeaveModalSuggestion(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isLeaving}
                onClick={handleConfirmLeave}
                className="px-4 py-2 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLeaving ? 'Saliendo...' : 'Confirmar Salida'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 9. MODAL: PROPONER NUEVO CURSO */}
      {/* ==================================================== */}
      <CourseSuggestionModal
        isOpen={isSuggestModalOpen}
        onClose={() => setIsSuggestModalOpen(false)}
        currentUser={currentUser}
        companies={companies}
        onSuggestionCreated={() => {
          loadData();
        }}
        onShowToast={onShowToast}
      />

    </div>
  );
};
