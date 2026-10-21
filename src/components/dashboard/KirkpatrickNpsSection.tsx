import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Award, 
  Star, 
  TrendingUp, 
  HeartHandshake, 
  MessageSquare, 
  ThumbsUp, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  BookOpen, 
  Briefcase, 
  UserCheck, 
  Smile, 
  Meh, 
  Frown,
  Filter,
  Search,
  Quote,
  ShieldCheck
} from 'lucide-react';
import { apiService } from '../../services/api';
import { KirkpatrickAnalytics } from '../../types';
import { formatDateShort } from '../../utils/formatters';

interface KirkpatrickNpsSectionProps {
  onShowToast?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

export const KirkpatrickNpsSection: React.FC<KirkpatrickNpsSectionProps> = ({
  onShowToast
}) => {
  const [data, setData] = useState<KirkpatrickAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'promoters' | 'passives' | 'detractors'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await apiService.getFeedbackStats();
      setData(stats);
    } catch (err: any) {
      console.error('Error cargando analítica Kirkpatrick:', err);
      setError(err.message || 'No se pudo cargar la analítica de evaluación.');
      if (onShowToast) {
        onShowToast('Error', 'No se pudo sincronizar la analítica Kirkpatrick.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredFeedbacks = (data?.recentFeedback || []).filter(item => {
    const matchesSearch = 
      (item.trainingTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.comment || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.strengths || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.improvements || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'promoters') return (item.nps ?? 10) >= 9;
    if (filterType === 'passives') return (item.nps ?? 7) >= 7 && (item.nps ?? 7) <= 8;
    if (filterType === 'detractors') return item.nps !== undefined && item.nps <= 6;
    return true;
  });

  const getNpsBadgeColor = (nps: number) => {
    if (nps >= 50) return 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800';
    if (nps >= 20) return 'text-blue-700 bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800';
    if (nps >= 0) return 'text-amber-700 bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800';
    return 'text-rose-700 bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Encabezado Principal */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#DA291C] dark:text-red-400 mb-1">
            <Sparkles className="w-4 h-4 text-[#DA291C] dark:text-red-400" />
            <span>Modelo Kirkpatrick Nivel 1 & Net Promoter Score (NPS)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Calidad Percibida, Transferencia al Puesto y Lealtad
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Monitoreo en tiempo real de satisfacción inmediata con candado de acreditación oficial.
            Mide contenido, facilitadores, aplicabilidad laboral y el índice neto de recomendación formativa.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar Métricas</span>
        </button>
      </div>

      {loading && !data ? (
        <div className="py-20 text-center text-xs text-slate-500">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-[#DA291C] rounded-full animate-spin mx-auto mb-2" />
          Calculando analítica Kirkpatrick y Net Promoter Score...
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-3xl p-6 text-center text-rose-700 dark:text-rose-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm font-bold">{error}</p>
          <button
            onClick={loadData}
            className="mt-3 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {/* 4 Tarjetas de Métricas KPI Clave */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* KPI 1: NPS Index */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-emerald-500/10 via-transparent to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Promoter Score</span>
                <div className={`p-2 rounded-xl border ${getNpsBadgeColor(data?.npsIndex || 0)}`}>
                  <HeartHandshake className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                    {(data?.npsIndex || 0) > 0 ? `+${data?.npsIndex}` : data?.npsIndex || 0}
                  </p>
                  <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${getNpsBadgeColor(data?.npsIndex || 0)}`}>
                    NPS Global
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1.5">
                  Escala -100 a +100 ({data?.totalNpsResponses || 0} respuestas)
                </p>
              </div>
            </div>

            {/* KPI 2: Calidad de Contenidos */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contenidos del Curso</span>
                <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#DA291C] dark:text-red-400">
                  <BookOpen className="w-4 h-4 text-[#DA291C] dark:text-red-400" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-black text-[#DA291C] dark:text-red-400 leading-none">
                  {Number(data?.averageCourseScore || 5).toFixed(1)} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">/ 5.0</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Estructura, relevancia y materiales
                </p>
              </div>
            </div>

            {/* KPI 3: Desempeño del Facilitador */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Facilitadores & Docencia</span>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400">
                  <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-black text-amber-600 dark:text-amber-400 leading-none">
                  {Number(data?.averageFacilitatorScore || 5).toFixed(1)} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">/ 5.0</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Dominio técnico y pedagogía interactiva
                </p>
              </div>
            </div>

            {/* KPI 4: Aplicabilidad al Puesto de Trabajo */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aplicabilidad al Puesto</span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                  <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                  {Number(data?.averageApplicabilityScore || 5).toFixed(1)} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">/ 5.0</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Transferencia inmediata a labores diarias
                </p>
              </div>
            </div>

          </div>

          {/* Sección de Desglose NPS y Comparativo Dimensional */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Tarjeta de Segmentación NPS */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <HeartHandshake className="w-5 h-5 text-emerald-500" />
                    Desglose de Lealtad Formativa (Net Promoter Score)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Clasificación de colaboradores según la probabilidad de recomendar las capacitaciones a sus pares.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {data?.totalNpsResponses || 0}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Muestras</span>
                </div>
              </div>

              {/* Barra de Distribución Segmentada */}
              <div className="space-y-2">
                <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                  <div 
                    style={{ width: `${data?.promotersPercentage || 0}%` }}
                    className="h-full bg-emerald-500 transition-all duration-700"
                    title={`Promotores: ${data?.promotersPercentage || 0}%`}
                  />
                  <div 
                    style={{ width: `${data?.passivesPercentage || 0}%` }}
                    className="h-full bg-amber-400 transition-all duration-700"
                    title={`Pasivos: ${data?.passivesPercentage || 0}%`}
                  />
                  <div 
                    style={{ width: `${data?.detractorsPercentage || 0}%` }}
                    className="h-full bg-rose-500 transition-all duration-700"
                    title={`Detractores: ${data?.detractorsPercentage || 0}%`}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold px-1">
                  <span>0 (Detractor)</span>
                  <span>7-8 (Neutro)</span>
                  <span>9-10 (Promotor)</span>
                </div>
              </div>

              {/* 3 Cajas de Segmentos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                
                {/* Promotores */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Smile className="w-4 h-4 text-emerald-600" />
                      Promotores (9-10)
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {data?.promotersPercentage || 0}%
                    </span>
                  </div>
                  <p className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-2">
                    {data?.promotersCount || 0}
                  </p>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-1 font-medium">
                    Entusiastas leales que amplifican el aprendizaje en sus áreas.
                  </p>
                </div>

                {/* Pasivos / Neutros */}
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Meh className="w-4 h-4 text-amber-600" />
                      Pasivos (7-8)
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                      {data?.passivesPercentage || 0}%
                    </span>
                  </div>
                  <p className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-2">
                    {data?.passivesCount || 0}
                  </p>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-1 font-medium">
                    Satisfechos pero neutrales; vulnerables a falta de compromiso.
                  </p>
                </div>

                {/* Detractores */}
                <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                      <Frown className="w-4 h-4 text-rose-600" />
                      Detractores (0-6)
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-400">
                      {data?.detractorsPercentage || 0}%
                    </span>
                  </div>
                  <p className="text-2xl font-black text-rose-900 dark:text-rose-200 mt-2">
                    {data?.detractorsCount || 0}
                  </p>
                  <p className="text-[10px] text-rose-700/80 dark:text-rose-400/80 mt-1 font-medium">
                    Insatisfechos; requieren análisis de contenidos o metodología.
                  </p>
                </div>

              </div>
            </div>

            {/* Ranking de Mejores Facilitadores */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Top Facilitadores
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Líderes de instrucción con mejores puntuaciones de evaluación.
                </p>

                <div className="mt-4 space-y-3">
                  {(data?.topFacilitators || []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6">
                      Aún no hay facilitadores con suficientes evaluaciones.
                    </p>
                  ) : (
                    data?.topFacilitators.map((fac, idx) => (
                      <div 
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                            idx === 0 ? 'bg-amber-500 text-white shadow-xs' :
                            idx === 1 ? 'bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-white' :
                            'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {fac.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {fac.averageScore.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({fac.count})
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Auditoría transparente de satisfacción docente</span>
              </div>
            </div>

          </div>

          {/* Muro Cualitativo de Evaluaciones y Feedback */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#DA291C] dark:text-red-400" />
                  Muro de Testimonios y Retroalimentación Cualitativa
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Fortalezas observadas, comentarios y oportunidades de mejora reportadas por los participantes.
                </p>
              </div>

              {/* Controles de Filtro */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar en opiniones..."
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      filterType === 'all'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterType('promoters')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      filterType === 'promoters'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Promotores (9-10)
                  </button>
                  <button
                    onClick={() => setFilterType('passives')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      filterType === 'passives'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Pasivos (7-8)
                  </button>
                  <button
                    onClick={() => setFilterType('detractors')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      filterType === 'detractors'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Detractores
                  </button>
                </div>
              </div>
            </div>

            {filteredFeedbacks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic">
                No se encontraron evaluaciones con los filtros actuales.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFeedbacks.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-xs"
                  >
                    <div className="space-y-3">
                      
                      {/* Top card header: Course & NPS Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white line-clamp-1">
                            {fb.trainingTitle}
                          </h4>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {fb.userName} • {formatDateShort(fb.createdAt)}
                          </span>
                        </div>

                        {fb.nps !== undefined && fb.nps !== null && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 border ${
                            fb.nps >= 9 ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' :
                            fb.nps >= 7 ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800' :
                            'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                          }`}>
                            NPS: {fb.nps}
                          </span>
                        )}
                      </div>

                      {/* Estrellas y rating */}
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star 
                            key={idx} 
                            className={`w-3.5 h-3.5 ${
                              idx < Math.round(fb.rating) 
                                ? 'fill-amber-400 text-amber-400' 
                                : 'text-slate-300 dark:text-slate-600'
                            }`} 
                          />
                        ))}
                        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 ml-1">
                          {Number(fb.rating).toFixed(1)}
                        </span>
                      </div>

                      {/* Comentario Principal */}
                      {fb.comment && (
                        <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                          "{fb.comment}"
                        </p>
                      )}

                      {/* Fortalezas Destacadas */}
                      {fb.strengths && (
                        <div className="text-[11px] space-y-0.5 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                          <span className="font-black text-emerald-800 dark:text-emerald-300 block flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3 text-emerald-600" />
                            Fortaleza Destacada:
                          </span>
                          <p className="text-slate-700 dark:text-slate-300">{fb.strengths}</p>
                        </div>
                      )}

                      {/* Oportunidad de Mejora */}
                      {fb.improvements && (
                        <div className="text-[11px] space-y-0.5 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                          <span className="font-black text-amber-800 dark:text-amber-300 block flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Oportunidad de Mejora:
                          </span>
                          <p className="text-slate-700 dark:text-slate-300">{fb.improvements}</p>
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
};
