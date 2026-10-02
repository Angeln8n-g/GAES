import React, { useState, useEffect, useMemo } from 'react';
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
  Eye
} from 'lucide-react';
import { apiService } from '../../services/api';
import { CourseSuggestion, UserAccount, Company, CourseWaitlistEntry } from '../../types';
import { CourseSuggestionModal } from './CourseSuggestionModal';

interface CourseDemandViewProps {
  currentUser: UserAccount | null;
  companies?: Company[];
  selectedCompanyId?: string;
  onOpenCreateEventWithData?: (prefilledData: Partial<any>) => void;
  onShowToast?: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

const CATEGORIES = ["Todos", "Curso", "Taller", "Webinar", "Charla", "Certificación Técnica", "Seguridad y Prevención"];

export const CourseDemandView: React.FC<CourseDemandViewProps> = ({
  currentUser,
  companies = [],
  selectedCompanyId = 'all',
  onOpenCreateEventWithData,
  onShowToast
}) => {
  const [suggestions, setSuggestions] = useState<CourseSuggestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState<boolean>(false);
  const [inspectingSuggestion, setInspectingSuggestion] = useState<CourseSuggestion | null>(null);

  // Modal para unirse con horario preferido
  const [joiningSuggestion, setJoiningSuggestion] = useState<CourseSuggestion | null>(null);
  const [joinSchedule, setJoinSchedule] = useState<string>('Cualquiera');
  const [joinNotes, setJoinNotes] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);

  const isSuperAdmin = currentUser?.role === 'Super Administrador';
  const isAdminOrEvaluator = isSuperAdmin || currentUser?.role === 'Administrador / Editor' || currentUser?.role === 'Evaluador / Tutor';

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiService.getCourseSuggestions({
        category: selectedCategory === 'Todos' ? undefined : selectedCategory,
        status: statusFilter === 'all' ? undefined : statusFilter,
        companyId: selectedCompanyId,
        search: searchQuery
      });
      setSuggestions(data);
    } catch (err: any) {
      console.error('Error al cargar sugerencias de cursos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, statusFilter, selectedCompanyId, searchQuery]);

  // Manejar unirse a la lista de espera
  const handleConfirmJoin = async () => {
    if (!joiningSuggestion) return;
    setIsJoining(true);
    try {
      const res = await apiService.joinCourseWaitlist(joiningSuggestion.id, {
        preferredSchedule: joinSchedule,
        notes: joinNotes
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
  const handleLeaveWaitlist = async (suggestion: CourseSuggestion) => {
    if (!confirm(`¿Deseas salir de la lista de espera de "${suggestion.title}"?`)) return;
    try {
      const res = await apiService.leaveCourseWaitlist(suggestion.id);
      if (onShowToast) {
        onShowToast('Lista de Espera Actualizada', res.message, 'info');
      }
      loadData();
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('Error', err.message || 'Error al salir de la lista de espera', 'error');
      }
    }
  };

  // Métricas
  const stats = useMemo(() => {
    const total = suggestions.length;
    const reached = suggestions.filter(s => s.status === 'quorum_alcanzado').length;
    const myWaitlists = suggestions.filter(s => s.isUserInWaitlist).length;
    const totalPeople = suggestions.reduce((acc, curr) => acc + (curr.currentQuorum || 0), 0);
    return { total, reached, myWaitlists, totalPeople };
  }, [suggestions]);

  // Manejar cambio de quórum por administrador
  const handleEditQuorum = async (suggestion: CourseSuggestion) => {
    const newQ = prompt(`Ingresa el nuevo quórum mínimo para "${suggestion.title}":`, String(suggestion.minQuorum));
    if (!newQ) return;
    const parsed = parseInt(newQ, 10);
    if (isNaN(parsed) || parsed < 1) {
      alert('Por favor ingresa un número entero válido mayor a cero.');
      return;
    }
    try {
      await apiService.updateCourseSuggestionQuorum(suggestion.id, parsed);
      if (onShowToast) onShowToast('Quórum Actualizado', `Nuevo quórum fijado en ${parsed} participantes.`, 'success');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar quórum');
    }
  };

  // Manejar eliminación
  const handleDeleteSuggestion = async (suggestion: CourseSuggestion) => {
    if (!confirm(`¿Eliminar la propuesta "${suggestion.title}"? Esta acción no se puede deshacer.`)) return;
    try {
      await apiService.deleteCourseSuggestion(suggestion.id);
      if (onShowToast) onShowToast('Propuesta Eliminada', 'El curso sugerido fue eliminado.', 'info');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* 1. BANNER INSTITUCIONAL & LLAMADO A LA ACCIÓN */}
      <div className="relative bg-linear-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-black tracking-wider uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Capacitaciones a Demanda • Quórum Dinámico</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Cursos Sugeridos & Listas de Espera
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              ¿Hay un tema técnico o certificación que no se imparte con frecuencia? <strong>Proponlo aquí o únete a las listas de espera activas.</strong> Cuando un curso alcanza el quórum mínimo requerido, se agenda oficialmente con instructor y aula.
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={() => setIsSuggestModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 bg-[#DA291C] hover:bg-red-700 active:bg-red-800 text-white text-xs font-black rounded-2xl shadow-lg shadow-red-500/30 transition-all flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Proponer Nuevo Curso</span>
            </button>
          </div>
        </div>

        {/* Cintas de Métricas en Vivo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cursos a Demanda</span>
            <span className="text-xl font-black text-white mt-0.5 block">{stats.total}</span>
          </div>

          <div className="bg-emerald-950/40 rounded-2xl p-3 border border-emerald-800/50">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Quórum Alcanzado</span>
            <span className="text-xl font-black text-emerald-300 mt-0.5 block">{stats.reached} listos</span>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mis Listas de Espera</span>
            <span className="text-xl font-black text-amber-400 mt-0.5 block">{stats.myWaitlists} inscritos</span>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Interesados</span>
            <span className="text-xl font-black text-white mt-0.5 block">{stats.totalPeople} solicitudes</span>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE BÚSQUEDA Y FILTRADO */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Buscador */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por tema técnico, descripción o categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#DA291C] focus:outline-hidden"
            />
          </div>

          {/* Filtro de Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="all">Todos los Estados</option>
            <option value="recolectando_quorum">En Recolección de Quórum</option>
            <option value="quorum_alcanzado">✓ Quórum Alcanzado (Prioritarios)</option>
            <option value="programado">Programados Oficialmente</option>
          </select>

          {/* Botón Refrescar */}
          <button
            onClick={loadData}
            title="Actualizar listado"
            className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-xl text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filtros de Categoría con Chips Horizontales */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#DA291C] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. LISTADO DE TARJETAS DE CURSOS A DEMANDA */}
      {loading ? (
        <div className="py-24 text-center text-xs text-slate-500">
          <div className="w-9 h-9 border-3 border-slate-200 border-t-[#DA291C] rounded-full animate-spin mx-auto mb-2" />
          Consultando capacitaciones a demanda y listas de espera...
        </div>
      ) : suggestions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-16 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto mb-3 border border-amber-200 dark:border-amber-900/50">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            No se encontraron cursos a demanda
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            ¿No encuentras el curso que buscas? Sé el primero en sugerirlo haciendo clic en el botón a continuación.
          </p>
          <button
            onClick={() => setIsSuggestModalOpen(true)}
            className="mt-5 px-5 py-2.5 bg-[#DA291C] hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 transition-all inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Proponer Primer Curso</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {suggestions.map((sug) => {
            const isQuorumReached = sug.status === 'quorum_alcanzado' || (sug.currentQuorum >= sug.minQuorum);
            const isScheduled = sug.status === 'programado';
            const progressPct = Math.min(100, Math.round(((sug.currentQuorum || 0) / sug.minQuorum) * 100));

            return (
              <div
                key={sug.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border transition-all flex flex-col justify-between group relative overflow-hidden ${
                  isScheduled
                    ? 'border-purple-300 dark:border-purple-800/60'
                    : isQuorumReached
                    ? 'border-emerald-400/80 dark:border-emerald-700/80 ring-2 ring-emerald-500/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {/* Resplandor decorativo de quórum alcanzado */}
                {isQuorumReached && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-emerald-500/15 via-teal-500/5 to-transparent rounded-bl-full pointer-events-none" />
                )}

                <div>
                  {/* Encabezado de Tarjeta (Categoría, Modalidad, Estado) */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-50 dark:bg-red-950/40 text-[#DA291C] border border-red-200 dark:border-red-900/50 uppercase">
                        {sug.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {sug.modality}
                      </span>
                    </div>

                    <div>
                      {isScheduled ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Programado
                        </span>
                      ) : isQuorumReached ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 inline-flex items-center gap-1 animate-pulse">
                          <Flame className="w-3 h-3 text-amber-500" /> Quórum Listo
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80">
                          Recogiendo Quórum
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Título del Curso */}
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-[#DA291C] transition-colors leading-snug mb-2">
                    {sug.title}
                  </h3>

                  {/* Justificación / Descripción */}
                  {sug.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 mb-4">
                      {sug.description}
                    </p>
                  )}

                  {/* BARRA DE PROGRESO DE QUÓRUM */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#DA291C]" />
                        <span>Progreso de Quórum</span>
                      </span>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {sug.currentQuorum} / {sug.minQuorum} interesados ({progressPct}%)
                      </span>
                    </div>

                    {/* Barra visual */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isQuorumReached
                            ? 'bg-linear-to-r from-emerald-500 to-teal-400 shadow-sm'
                            : 'bg-linear-to-r from-amber-500 to-red-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                      <span>Duración: {sug.targetHours}h estimadas</span>
                      <span>Sugerido por: {sug.suggestedByName || 'Colaborador'}</span>
                    </div>
                  </div>
                </div>

                {/* ACCIONES Y BOTONES */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  
                  {/* Botón Principal del Participante */}
                  {sug.isUserInWaitlist ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-center inline-flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>En Lista de Espera</span>
                      </span>

                      <button
                        onClick={() => handleLeaveWaitlist(sug)}
                        title="Cancelar mi inscripción en la lista de espera"
                        className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setJoiningSuggestion(sug);
                        setJoinSchedule('Cualquiera');
                      }}
                      className="flex-1 py-2.5 px-4 bg-[#DA291C] hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Unirme a Lista de Espera</span>
                    </button>
                  )}

                  {/* Acciones para Administradores y Evaluadores */}
                  {isAdminOrEvaluator && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setInspectingSuggestion(sug)}
                        title="Ver participantes en lista de espera"
                        className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {isSuperAdmin && (
                        <>
                          <button
                            onClick={() => handleEditQuorum(sug)}
                            title="Ajustar Quórum Requerido"
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteSuggestion(sug)}
                            title="Eliminar propuesta"
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
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
      )}

      {/* 4. MODAL PARA UNIRSE A LA LISTA DE ESPERA CON HORARIO PREFERIDO */}
      {joiningSuggestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#DA291C] flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Unirme a Lista de Espera
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Suma tu interés para abrir este curso
                  </span>
                </div>
              </div>
              <button onClick={() => setJoiningSuggestion(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <span className="text-xs font-extrabold text-[#DA291C] block line-clamp-2">
                {joiningSuggestion.title}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Quórum actual: {joiningSuggestion.currentQuorum} / {joiningSuggestion.minQuorum} interesados.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ¿Qué horario te conviene más?
              </label>
              <select
                value={joinSchedule}
                onChange={(e) => setJoinSchedule(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
              >
                <option value="Cualquiera">Cualquier horario disponible</option>
                <option value="Horario Matutino (Mañana)">Horario Matutino (Mañana)</option>
                <option value="Horario Vespertino (Tarde)">Horario Vespertino (Tarde)</option>
                <option value="Fines de Semana (Sábados)">Fines de Semana (Sábados)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Comentarios / Observaciones (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ej. Requiero esta capacitación para el proyecto FTTH..."
                value={joinNotes}
                onChange={(e) => setJoinNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setJoiningSuggestion(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isJoining}
                onClick={handleConfirmJoin}
                className="px-5 py-2 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
              >
                {isJoining ? 'Inscribiendo...' : 'Confirmar Inscripción'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL DE INSPECCIÓN DE LISTA DE ESPERA (ADMIN / EVALUADOR) */}
      {inspectingSuggestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#DA291C] text-white flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Participantes en Lista de Espera
                  </h3>
                  <span className="text-[11px] text-[#DA291C] font-extrabold line-clamp-1">
                    {inspectingSuggestion.title}
                  </span>
                </div>
              </div>
              <button onClick={() => setInspectingSuggestion(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <span>
                Total registrados: <strong>{inspectingSuggestion.waitlist?.length || inspectingSuggestion.currentQuorum}</strong> colaboradores
              </span>
              <span>
                Quórum objetivo: <strong>{inspectingSuggestion.minQuorum}</strong>
              </span>
            </div>

            <div className="overflow-y-auto py-3 flex-1">
              {!inspectingSuggestion.waitlist || inspectingSuggestion.waitlist.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  No hay detalles de participantes disponibles o la lista está vacía.
                </div>
              ) : (
                <div className="space-y-2">
                  {inspectingSuggestion.waitlist.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-700 dark:text-slate-300">
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-extrabold text-slate-900 dark:text-white block">
                            {entry.participantName}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {entry.participantEmail} • {entry.companyName || 'Claro'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 block">
                          {entry.preferredSchedule || 'Cualquiera'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
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
                  className="px-4 py-2 bg-[#DA291C] hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Programar Evento Oficial Ahora</span>
                </button>
              )}

              <button
                onClick={() => setInspectingSuggestion(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 ml-auto"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL PARA PROPONER NUEVO CURSO */}
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
