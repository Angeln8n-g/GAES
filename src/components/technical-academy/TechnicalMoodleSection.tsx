import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, 
  ExternalLink, 
  Link2, 
  Unlink, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  BookOpen, 
  Clock, 
  MapPin, 
  Plus, 
  ArrowRight, 
  HelpCircle, 
  Zap, 
  FileText, 
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { TechnicalAcademyCourse, TechnicalAcademyCohort } from '../../types';
import { 
  CLARO_MOODLE_PRESETS, 
  CLARO_MOODLE_BASE_URL, 
  CLARO_MOODLE_TECHNICAL_CAT_URL,
  ClaroMoodleCoursePreset 
} from '../../data/claroMoodleCatalog';
import { apiService } from '../../services/api';
import { AccessibleModal } from '../common/AccessibleModal';

interface TechnicalMoodleSectionProps {
  courses: TechnicalAcademyCourse[];
  cohorts: TechnicalAcademyCohort[];
  isAdminOrSuper: boolean;
  onRefreshData: () => Promise<void>;
  onShowToast?: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const TechnicalMoodleSection: React.FC<TechnicalMoodleSectionProps> = ({
  courses,
  cohorts,
  isAdminOrSuper,
  onRefreshData,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLinked, setFilterLinked] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [selectedCourseForLink, setSelectedCourseForLink] = useState<TechnicalAcademyCourse | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isProcessingLink, setIsProcessingLink] = useState(false);

  // Estados del modal de vinculación
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [customCourseId, setCustomCourseId] = useState<string>('');
  const [customCourseUrl, setCustomCourseUrl] = useState<string>('');
  const [customSectionName, setCustomSectionName] = useState<string>('');
  const [customExamUrl, setCustomExamUrl] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('Entrenamientos Técnicos');

  // Estadísticas de integración
  const stats = useMemo(() => {
    const total = courses.length;
    const linked = courses.filter(c => Boolean(c.isMoodleLinked || c.moodleCourseUrl || c.moodleCourseId)).length;
    const unlinked = total - linked;
    const percentage = total > 0 ? Math.round((linked / total) * 100) : 0;
    
    // Cohortes respaldadas con Moodle
    const cohortsWithMoodle = cohorts.filter(coh => {
      const parentCourse = courses.find(c => c.id === coh.courseId);
      return Boolean(coh.moodleCourseUrl || parentCourse?.moodleCourseUrl || parentCourse?.isMoodleLinked);
    }).length;

    return { total, linked, unlinked, percentage, cohortsWithMoodle };
  }, [courses, cohorts]);

  // Cursos filtrados
  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const isLinked = Boolean(c.isMoodleLinked || c.moodleCourseUrl || c.moodleCourseId);
      if (filterLinked === 'linked' && !isLinked) return false;
      if (filterLinked === 'unlinked' && isLinked) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        c.title.toLowerCase().includes(q) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q)) ||
        (c.moodleCourseId && c.moodleCourseId.toLowerCase().includes(q)) ||
        (c.moodleSectionName && c.moodleSectionName.toLowerCase().includes(q))
      );
    });
  }, [courses, filterLinked, searchQuery]);

  // Abrir modal de vinculación rápida para un curso específico
  const handleOpenLinkModal = (course: TechnicalAcademyCourse) => {
    setSelectedCourseForLink(course);
    // Si ya tiene un preset coincidente por ID
    const matchingPreset = CLARO_MOODLE_PRESETS.find(p => p.courseId === course.moodleCourseId);
    if (matchingPreset) {
      setSelectedPresetId(matchingPreset.id);
    } else {
      setSelectedPresetId('');
    }

    setCustomCourseId(course.moodleCourseId || '');
    setCustomCourseUrl(course.moodleCourseUrl || (course.moodleCourseId ? `${CLARO_MOODLE_BASE_URL}/course/view.php?id=${course.moodleCourseId}` : ''));
    setCustomSectionName(course.moodleSectionName || '');
    setCustomExamUrl(course.moodleExamUrl || '');
    setCustomCategory(course.moodleCategory || 'Entrenamientos Técnicos');
    setIsLinkModalOpen(true);
  };

  // Cuando el usuario elige un preset del catálogo
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (!presetId) return;

    const preset = CLARO_MOODLE_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setCustomCourseId(preset.courseId);
      setCustomCourseUrl(preset.url);
      setCustomCategory(preset.category);
      if (!customSectionName) {
        setCustomSectionName(`Módulo Virtual: ${preset.title}`);
      }
    }
  };

  // Guardar vinculación
  const handleSaveMoodleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForLink) return;

    try {
      setIsProcessingLink(true);
      const courseIdToSave = customCourseId.trim();
      let courseUrlToSave = customCourseUrl.trim();

      // Si ingresó ID pero no URL, autogenerar la URL canónica de Moodle Claro
      if (courseIdToSave && !courseUrlToSave) {
        courseUrlToSave = `${CLARO_MOODLE_BASE_URL}/course/view.php?id=${courseIdToSave}`;
      }

      await apiService.linkTechnicalCourseMoodle(selectedCourseForLink.id, {
        moodleCourseId: courseIdToSave || null,
        moodleCourseUrl: courseUrlToSave || null,
        moodleSectionName: customSectionName.trim() || null,
        moodleExamUrl: customExamUrl.trim() || null,
        moodleCategory: customCategory || 'Entrenamientos Técnicos',
        isMoodleLinked: Boolean(courseUrlToSave || courseIdToSave)
      });

      if (onShowToast) {
        onShowToast(
          'Entrelazado Exitoso',
          `El curso "${selectedCourseForLink.title}" fue conectado con Moodle Claro.`,
          'success'
        );
      }

      setIsLinkModalOpen(false);
      await onRefreshData();
    } catch (err: any) {
      console.error('Error al guardar vínculo con Moodle:', err);
      if (onShowToast) {
        onShowToast('Error', err.message || 'No se pudo guardar la vinculación con Moodle', 'error');
      }
    } finally {
      setIsProcessingLink(false);
    }
  };

  // Desvincular curso de Moodle
  const handleUnlink = async (course: TechnicalAcademyCourse) => {
    const confirm = window.confirm(`¿Estás seguro de desvincular el curso "${course.title}" de la plataforma Moodle Claro?`);
    if (!confirm) return;

    try {
      await apiService.linkTechnicalCourseMoodle(course.id, {
        moodleCourseId: null,
        moodleCourseUrl: null,
        moodleSectionName: null,
        moodleExamUrl: null,
        isMoodleLinked: false
      });

      if (onShowToast) {
        onShowToast('Desvinculado', `Se retiró el enlace de Moodle para "${course.title}".`, 'info');
      }
      await onRefreshData();
    } catch (err: any) {
      console.error('Error al desvincular curso:', err);
      if (onShowToast) {
        onShowToast('Error', 'No se pudo desvincular el curso', 'error');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Banner Institucional Moodle Claro */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-700/60">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-gradient-to-br from-amber-500/20 to-red-600/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 uppercase tracking-wider">
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                E-Learning Corporativo
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-600/30 text-red-200 border border-red-500/30">
                Claro Dominicana
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Campus Virtual Moodle & Academia Técnica
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              Espacio integral para entrelazar las capacitaciones técnicas presenciales y de taller con los módulos de e-learning oficiales en{' '}
              <a 
                href={CLARO_MOODLE_BASE_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 font-bold underline inline-flex items-center gap-1"
              >
                entrenamiento.claro.com.do <ExternalLink className="w-3 h-3" />
              </a>. Permite sincronizar material teórico, exámenes de certificación y rutas formativas híbridas (Blended Learning).
            </p>
          </div>

          {/* Quick Launch Buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <a
              href={CLARO_MOODLE_BASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95"
            >
              <GraduationCap className="w-4 h-4 text-white" />
              <span>Abrir Moodle Claro (Portal Principal)</span>
              <ExternalLink className="w-3.5 h-3.5 text-white/80" />
            </a>

            <a
              href={CLARO_MOODLE_TECHNICAL_CAT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all"
            >
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>Explorar Categoría Técnica Moodle</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Resumen Estadístico */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-700/60">
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cursos Técnicos GAES</div>
            <div className="text-2xl font-black text-white mt-1">{stats.total}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Catálogo activo</div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-4 border border-emerald-500/30">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Cursos Entrelazados
            </div>
            <div className="text-2xl font-black text-emerald-300 mt-1">{stats.linked}</div>
            <div className="text-[10px] text-emerald-400/80 mt-0.5">{stats.percentage}% con Moodle</div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-4 border border-amber-500/30">
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              Pendientes de Vínculo
            </div>
            <div className="text-2xl font-black text-amber-300 mt-1">{stats.unlinked}</div>
            <div className="text-[10px] text-amber-400/80 mt-0.5">Solo presencial</div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-4 border border-indigo-500/30">
            <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-400" />
              Cohortes con E-Learning
            </div>
            <div className="text-2xl font-black text-indigo-300 mt-1">{stats.cohortsWithMoodle}</div>
            <div className="text-[10px] text-indigo-400/80 mt-0.5">Semanas activas</div>
          </div>
        </div>
      </div>

      {/* 2. Filtros y Búsqueda */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por curso, código o ID de Moodle..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <button
            type="button"
            onClick={() => setFilterLinked('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterLinked === 'all'
                ? 'bg-slate-900 dark:bg-slate-700 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Todos ({courses.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterLinked('linked')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              filterLinked === 'linked'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Entrelazados ({stats.linked})
          </button>

          <button
            type="button"
            onClick={() => setFilterLinked('unlinked')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              filterLinked === 'unlinked'
                ? 'bg-amber-600 text-white'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Sin Vincular ({stats.unlinked})
          </button>
        </div>
      </div>

      {/* 3. Matriz de Cursos Técnicos Entrelazados */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Cursos Técnicos Entrelazados (Taller Presencial ⟷ Moodle E-Learning)
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {filteredCourses.length} cursos
            </span>
          </div>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <GraduationCap className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No se encontraron cursos con el criterio actual</p>
            <p className="text-xs text-slate-400 mt-1">Ajusta el filtro o busca con otros términos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredCourses.map(course => {
              const isLinked = Boolean(course.isMoodleLinked || course.moodleCourseUrl || course.moodleCourseId);
              const courseCohorts = cohorts.filter(c => c.courseId === course.id);
              const activeCohortsCount = courseCohorts.filter(c => c.status === 'in_progress' || c.status === 'scheduled').length;

              return (
                <div
                  key={course.id}
                  className={`bg-white dark:bg-slate-900 rounded-3xl border p-5 shadow-sm transition-all hover:shadow-md ${
                    isLinked 
                      ? 'border-emerald-200 dark:border-emerald-950/80 hover:border-emerald-300 dark:hover:border-emerald-800' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-amber-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Lado Izquierdo: Curso Técnico Presencial (GAES) */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {course.code && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                            {course.code}
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/40 text-[#DA291C] dark:text-red-400 border border-red-200 dark:border-red-900/50">
                          {course.category}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {course.durationDays} días ({course.dailyHours}h/día)
                        </span>
                        {activeCohortsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                            {activeCohortsCount} cohorte(s) activa(s)
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                        {course.title}
                      </h4>

                      {course.location && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{course.location}</span>
                        </p>
                      )}
                    </div>

                    {/* Centro: Indicador de Vínculo */}
                    <div className="flex items-center lg:flex-col justify-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 shrink-0">
                      {isLinked ? (
                        <>
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Link2 className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">
                            Entrelazado
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <Unlink className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">
                            Sin Moodle
                          </span>
                        </>
                      )}
                    </div>

                    {/* Lado Derecho: Módulo E-Learning Moodle */}
                    <div className="flex-1 space-y-2 lg:border-l lg:border-slate-100 lg:dark:border-slate-800 lg:pl-6">
                      {isLinked ? (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 flex items-center gap-1">
                              <GraduationCap className="w-3 h-3 text-amber-600" />
                              Moodle ID #{course.moodleCourseId || 'Web'}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {course.moodleCategory || 'Entrenamientos Técnicos'}
                            </span>
                          </div>

                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {course.moodleSectionName || 'Curso General de E-Learning'}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            {course.moodleCourseUrl && (
                              <a
                                href={course.moodleCourseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Abrir en Moodle</span>
                              </a>
                            )}

                            {course.moodleExamUrl && (
                              <a
                                href={course.moodleExamUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-bold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5"
                              >
                                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Examen Moodle</span>
                              </a>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1.5 text-slate-400">
                          <p className="text-xs italic">
                            Este curso técnico no tiene módulo de e-learning vinculado.
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Asocia un curso oficial de Moodle para habilitar el material teórico y exámenes online.
                          </p>
                        </div>
                      )}

                      {/* Botones de Administración de Vínculo */}
                      {isAdminOrSuper && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => handleOpenLinkModal(course)}
                            className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Link2 className="w-3 h-3 text-amber-500" />
                            <span>{isLinked ? 'Modificar Vínculo' : 'Vincular a Moodle'}</span>
                          </button>

                          {isLinked && (
                            <button
                              type="button"
                              onClick={() => handleUnlink(course)}
                              className="px-2.5 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Desvincular de Moodle"
                            >
                              <Unlink className="w-3 h-3" />
                              <span>Desvincular</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Explorador del Catálogo Oficial de Claro Moodle */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500 text-white">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Catálogo Oficial de Cursos Técnicos Moodle Claro
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Cursos vigentes precargados directamente desde la categoría técnica oficial en{' '}
              <span className="font-bold text-slate-700 dark:text-slate-300">entrenamiento.claro.com.do</span>.
            </p>
          </div>

          <a
            href={CLARO_MOODLE_TECHNICAL_CAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Ver en Moodle Claro</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {CLARO_MOODLE_PRESETS.map(preset => {
            // Verificar si algún curso ya está enlazado a este preset
            const linkedCourse = courses.find(c => c.moodleCourseId === preset.courseId);

            return (
              <div
                key={preset.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3 hover:border-amber-400 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-mono">
                      ID #{preset.courseId}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {preset.category}
                    </span>
                  </div>

                  <h5 className="text-xs font-black text-slate-900 dark:text-white line-clamp-2">
                    {preset.title}
                  </h5>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                    {preset.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {linkedCourse ? (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate" title={`Vinculado a: ${linkedCourse.title}`}>
                        {linkedCourse.title}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Disponible para vincular</span>
                  )}

                  <a
                    href={preset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title="Visitar curso en Moodle Claro"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Modal de Vinculación Rápida */}
      <AccessibleModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        ariaLabel="Vincular Curso Técnico con Moodle Claro"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
      >
        <div 
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Campus Moodle Claro
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Vincular Curso a Moodle Claro
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsLinkModalOpen(false)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Modal Form */}
          <form onSubmit={handleSaveMoodleLink} className="p-6 space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-xs text-amber-800 dark:text-amber-200 space-y-1">
              <div className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span>Curso GAES: {selectedCourseForLink?.title}</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Elige un curso oficial de Moodle Claro de la lista o introduce un ID/URL personalizado.
              </p>
            </div>

            {/* Selector de Presets Oficiales */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Elegir Curso Técnico Oficial de Moodle Claro (Preset):
              </label>
              <select
                value={selectedPresetId}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Ingresar curso personalizado o manual --</option>
                {CLARO_MOODLE_PRESETS.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    [ID #{preset.courseId}] {preset.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* ID de Curso Moodle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ID de Curso Moodle:
                </label>
                <input
                  type="text"
                  value={customCourseId}
                  onChange={(e) => {
                    setCustomCourseId(e.target.value);
                    if (e.target.value.trim() && !customCourseUrl) {
                      setCustomCourseUrl(`${CLARO_MOODLE_BASE_URL}/course/view.php?id=${e.target.value.trim()}`);
                    }
                  }}
                  placeholder="Ej: 140, 190, 185"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              {/* Categoría Moodle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Categoría Moodle:
                </label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Entrenamientos Técnicos"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* URL Completa de Curso en Moodle */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Enlace Oficial del Curso en Moodle (URL):
                </label>
                {customCourseUrl && (
                  <a
                    href={customCourseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>Probar Enlace</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <input
                type="url"
                value={customCourseUrl}
                onChange={(e) => setCustomCourseUrl(e.target.value)}
                placeholder="https://entrenamiento.claro.com.do/course/view.php?id=..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-[11px]"
              />
            </div>

            {/* Nombre de Sección o Módulo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nombre de Sección / Módulo E-Learning:
              </label>
              <input
                type="text"
                value={customSectionName}
                onChange={(e) => setCustomSectionName(e.target.value)}
                placeholder="Ej: Módulo 1: Fundamentos de Fusión y Mediciones"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Enlace Directo a Evaluación o Cuestionario Moodle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Enlace a Examen / Cuestionario en Moodle (Opcional):
              </label>
              <input
                type="url"
                value={customExamUrl}
                onChange={(e) => setCustomExamUrl(e.target.value)}
                placeholder="https://entrenamiento.claro.com.do/mod/quiz/view.php?id=..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-[11px]"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isProcessingLink}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Link2 className="w-4 h-4" />
                <span>{isProcessingLink ? 'Guardando Vínculo...' : 'Guardar y Entrelazar'}</span>
              </button>
            </div>
          </form>
        </div>
      </AccessibleModal>
    </div>
  );
};
