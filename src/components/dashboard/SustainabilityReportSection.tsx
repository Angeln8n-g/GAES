import React, { useState, useMemo } from 'react';
import { 
  Leaf, 
  FileSpreadsheet, 
  Download, 
  Search, 
  Filter, 
  RotateCcw, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  Building2, 
  ShieldCheck, 
  Tag, 
  Sparkles,
  BarChart3,
  Layers,
  ChevronRight,
  Video,
  MapPin,
  Laptop
} from 'lucide-react';
import { TrainingEvent, Participant, Company, UserAccount } from '../../types';
import { 
  SUSTAINABILITY_PROGRAMS, 
  SESSION_TYPES, 
  TRAINING_TYPES, 
  TRAINING_FORMATS, 
  EVENT_MODALITIES,
  getProgramLabel,
  getProgramShortName,
  getSubprogramsForProgram,
  isSustainabilityProgram
} from '../../constants/sustainabilityPrograms';
import { exportSustainabilityAndTrainingReportToExcel } from '../../utils/excelUtils';
import { formatDateShort, getEventDurationMetrics } from '../../utils/formatters';

interface SustainabilityReportSectionProps {
  events: TrainingEvent[];
  participants: Participant[];
  companies?: Company[];
  currentUser?: UserAccount | null;
  onShowToast?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SustainabilityReportSection: React.FC<SustainabilityReportSectionProps> = ({
  events,
  participants,
  companies = [],
  currentUser,
  onShowToast
}) => {
  // Filtros interactivos
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [selectedSubprogram, setSelectedSubprogram] = useState<string>('all');
  const [selectedSessionType, setSelectedSessionType] = useState<string>('all');
  const [selectedTrainingType, setSelectedTrainingType] = useState<string>('all');
  const [selectedModality, setSelectedModality] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [onlySustainability, setOnlySustainability] = useState<boolean>(false);

  // Lista de suplidores únicos
  const availableSuppliers = useMemo(() => {
    const set = new Set<string>();
    events.forEach(e => {
      if (e.supplier?.trim()) set.add(e.supplier.trim());
    });
    return Array.from(set).sort();
  }, [events]);

  // Lista de subprogramas disponibles según el programa seleccionado
  const availableSubprograms = useMemo(() => {
    if (selectedProgram === 'all') {
      const allSubs = new Set<string>();
      SUSTAINABILITY_PROGRAMS.forEach(p => p.subprograms.forEach(s => allSubs.add(s)));
      return Array.from(allSubs).sort();
    }
    return getSubprogramsForProgram(selectedProgram);
  }, [selectedProgram]);

  // Manejo de cambio de programa
  const handleProgramChange = (progId: string) => {
    setSelectedProgram(progId);
    setSelectedSubprogram('all');
  };

  // Limpiar todos los filtros
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedProgram('all');
    setSelectedSubprogram('all');
    setSelectedSessionType('all');
    setSelectedTrainingType('all');
    setSelectedModality('all');
    setSelectedFormat('all');
    setSelectedSupplier('all');
    setOnlySustainability(false);
  };

  // Filtrado reactivo de capacitaciones
  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      // Búsqueda por texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchText = (
          evt.title?.toLowerCase().includes(query) ||
          evt.description?.toLowerCase().includes(query) ||
          evt.instructor?.toLowerCase().includes(query) ||
          evt.supplier?.toLowerCase().includes(query) ||
          evt.subprogram?.toLowerCase().includes(query)
        );
        if (!matchText) return false;
      }

      // Solo Sustentabilidad
      if (onlySustainability && !isSustainabilityProgram(evt.programCategory, evt.subprogram)) {
        return false;
      }

      // Filtro Programa
      if (selectedProgram !== 'all') {
        if (evt.programCategory !== selectedProgram) return false;
      }

      // Filtro Subprograma
      if (selectedSubprogram !== 'all') {
        if (evt.subprogram !== selectedSubprogram) return false;
      }

      // Filtro Tipo de Sesión
      if (selectedSessionType !== 'all') {
        if ((evt.sessionType || 'Sincrónica') !== selectedSessionType) return false;
      }

      // Filtro Tipo de Entrenamiento
      if (selectedTrainingType !== 'all') {
        if ((evt.trainingType || 'Técnico') !== selectedTrainingType) return false;
      }

      // Filtro Modalidad
      if (selectedModality !== 'all') {
        const mod = evt.modality === 'Híbrida' ? 'Mixta' : evt.modality;
        if (mod !== selectedModality) return false;
      }

      // Filtro Formato
      if (selectedFormat !== 'all') {
        const fmt = evt.trainingFormat || evt.category || 'Taller';
        if (fmt !== selectedFormat) return false;
      }

      // Filtro Suplidor
      if (selectedSupplier !== 'all') {
        if ((evt.supplier || 'Claro') !== selectedSupplier) return false;
      }

      return true;
    });
  }, [
    events,
    searchQuery,
    selectedProgram,
    selectedSubprogram,
    selectedSessionType,
    selectedTrainingType,
    selectedModality,
    selectedFormat,
    selectedSupplier,
    onlySustainability
  ]);

  // Métricas agregadas sobre las capacitaciones filtradas
  const metrics = useMemo(() => {
    let totalHoursAll = 0;
    let totalSustainabilityHours = 0;
    let sustainabilityCoursesCount = 0;
    let totalRegisteredAll = 0;
    let totalAttendedAll = 0;
    let totalManHoursAll = 0;

    // Conteo por programa
    const programStats: Record<string, { count: number; hours: number }> = {};
    SUSTAINABILITY_PROGRAMS.forEach(p => {
      programStats[p.id] = { count: 0, hours: 0 };
    });

    // Conteo por tipo de sesión
    const sessionTypeStats: Record<string, number> = {
      'Asincrónica': 0,
      'Sincrónica': 0,
      'Híbrido': 0
    };

    // Conteo por tipo de entrenamiento
    const trainingTypeStats: Record<string, number> = {
      'Conductual': 0,
      'Técnico': 0
    };

    filteredEvents.forEach(evt => {
      const dur = getEventDurationMetrics(evt);
      const hours = dur.totalHours || 0;
      totalHoursAll += hours;

      const isSust = isSustainabilityProgram(evt.programCategory, evt.subprogram);
      if (isSust) {
        totalSustainabilityHours += hours;
        sustainabilityCoursesCount++;
      }

      // Asistencias e inscritos
      let registeredEvt = 0;
      let attendedEvt = 0;
      evt.schedule.forEach(sch => {
        sch.slots.forEach(slot => {
          registeredEvt += slot.registered;
          attendedEvt += (slot.completedAttendanceList || slot.attendedList || []).length;
        });
      });

      totalRegisteredAll += registeredEvt;
      totalAttendedAll += attendedEvt;
      totalManHoursAll += (hours * (attendedEvt > 0 ? attendedEvt : registeredEvt));

      // Program stats
      const pId = evt.programCategory || 'Capacitacion_seguridad_salud_en_el_trabajo_y_sustentabilidad';
      if (programStats[pId]) {
        programStats[pId].count++;
        programStats[pId].hours += hours;
      }

      // Session type stats
      const sType = evt.sessionType || 'Sincrónica';
      if (sessionTypeStats[sType] !== undefined) {
        sessionTypeStats[sType]++;
      }

      // Training type stats
      const tType = evt.trainingType || 'Técnico';
      if (trainingTypeStats[tType] !== undefined) {
        trainingTypeStats[tType]++;
      }
    });

    return {
      totalHoursAll,
      totalSustainabilityHours,
      sustainabilityCoursesCount,
      totalRegisteredAll,
      totalAttendedAll,
      totalManHoursAll,
      programStats,
      sessionTypeStats,
      trainingTypeStats
    };
  }, [filteredEvents]);

  // Handler para exportar a Excel
  const handleExportExcel = () => {
    try {
      exportSustainabilityAndTrainingReportToExcel(filteredEvents, participants);
      if (onShowToast) {
        onShowToast(
          'Reporte Descargado',
          `Se exportaron ${filteredEvents.length} registros del Programa de Sustentabilidad y Capacitación.`,
          'success'
        );
      }
    } catch (err: any) {
      console.error(err);
      if (onShowToast) {
        onShowToast('Error', 'No se pudo generar el libro Excel de sustentabilidad.', 'error');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Header Banner Sustentabilidad Claro */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border border-emerald-900/60 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5 backdrop-blur-md">
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                Programa de Sustentabilidad & Taxonomía ESG
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-slate-300 border border-white/10">
                Auditoría & Cumplimiento Corporativo
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Reporte Oficial de Capacitaciones & Sustentabilidad
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              Consolidación de las 11 dimensiones formativas: Tipo de sesión, Tipo de entrenamiento, Formato, Modalidad, Programa, Subprograma, Fechas, Horas lectivas, Suplidor y Descripción para la medición de impacto y auditorías institucionales.
            </p>
          </div>

          {/* Botón de Descarga Excel */}
          <button
            onClick={handleExportExcel}
            className="self-start md:self-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black flex items-center gap-2.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Reporte Excel Oficial</span>
          </button>
        </div>
      </div>

      {/* 2. Top 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI 1: Horas en Sustentabilidad */}
        <div className="bg-white border border-emerald-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Horas Sustentabilidad</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-emerald-700 mt-2">
              {metrics.totalSustainabilityHours} <span className="text-base font-bold text-emerald-600">hrs</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              En {metrics.sustainabilityCoursesCount} cursos de Sustentabilidad/SST
            </p>
          </div>
        </div>

        {/* KPI 2: Total Horas Capacitaciones */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Horas Oferta</span>
            <div className="p-2 rounded-xl bg-red-50 text-[#DA291C]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 mt-2">
              {metrics.totalHoursAll} <span className="text-base font-bold text-slate-600">hrs</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              En {filteredEvents.length} cursos listados
            </p>
          </div>
        </div>

        {/* KPI 3: Total Colaboradores Asistentes */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Asistencias Confirmadas</span>
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-cyan-700 mt-2">
              {metrics.totalAttendedAll}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              De {metrics.totalRegisteredAll} colaboradores inscritos
            </p>
          </div>
        </div>

        {/* KPI 4: Horas-Hombre Acumuladas */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Horas-Hombre</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-amber-700 mt-2">
              {metrics.totalManHoursAll.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Horas de formación impartidas
            </p>
          </div>
        </div>

        {/* KPI 5: Sesiones Sincrónicas vs Asincrónicas */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tipo de Sesión</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Sincrónica:</span>
              <strong className="text-slate-900">{metrics.sessionTypeStats['Sincrónica']}</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Asincrónica:</span>
              <strong className="text-slate-900">{metrics.sessionTypeStats['Asincrónica']}</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Híbrido:</span>
              <strong className="text-slate-900">{metrics.sessionTypeStats['Híbrido']}</strong>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Desglose Rápido por Programa */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#DA291C]" />
              <span>Distribución por Programas Corporativos</span>
            </h3>
            <p className="text-xs text-slate-500">
              Total de horas y cursos distribuidos en las 6 categorías macro.
            </p>
          </div>

          <button
            onClick={() => setOnlySustainability(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              onlySustainability 
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <Leaf className="w-3.5 h-3.5" />
            <span>{onlySustainability ? '✓ Mostrando solo Sustentabilidad' : 'Filtrar solo Sustentabilidad'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {SUSTAINABILITY_PROGRAMS.map(prog => {
            const stat = metrics.programStats[prog.id] || { count: 0, hours: 0 };
            const isSelected = selectedProgram === prog.id;
            const isSust = prog.id === 'Capacitacion_seguridad_salud_en_el_trabajo_y_sustentabilidad';

            return (
              <button
                key={prog.id}
                onClick={() => handleProgramChange(isSelected ? 'all' : prog.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : isSust
                    ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-black text-slate-900 line-clamp-1">
                      {prog.shortName}
                    </span>
                    {isSust && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-100 text-emerald-800 uppercase">
                        Sustentable
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {prog.subprograms.length} subprogramas
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">{stat.count} cursos</span>
                  <span className="font-black text-emerald-700">{stat.hours} hrs</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Barra de Filtros Interactivos */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#DA291C]" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Filtros Avanzados de Capacitación
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          <button
            onClick={handleResetFilters}
            className="text-xs font-bold text-slate-500 hover:text-[#DA291C] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Filtros</span>
          </button>
        </div>

        {/* Buscador de texto */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, suplidor, instructor o descripción de la capacitación..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
          />
        </div>

        {/* Selectores de filtros en cuadrícula */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* 1. Programa */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Programa</label>
            <select
              value={selectedProgram}
              onChange={(e) => handleProgramChange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#DA291C]"
            >
              <option value="all">Todos los Programas</option>
              {SUSTAINABILITY_PROGRAMS.map(p => (
                <option key={p.id} value={p.id}>{p.shortName}</option>
              ))}
            </select>
          </div>

          {/* 2. Subprograma */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Subprograma</label>
            <select
              value={selectedSubprogram}
              onChange={(e) => setSelectedSubprogram(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#DA291C]"
            >
              <option value="all">Todos los Subprogramas</option>
              {availableSubprograms.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          {/* 3. Tipo de Sesión */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo de Sesión</label>
            <select
              value={selectedSessionType}
              onChange={(e) => setSelectedSessionType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#DA291C]"
            >
              <option value="all">Todas las Sesiones</option>
              {SESSION_TYPES.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* 4. Tipo de Entrenamiento */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo Entrenamiento</label>
            <select
              value={selectedTrainingType}
              onChange={(e) => setSelectedTrainingType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#DA291C]"
            >
              <option value="all">Todos los Tipos</option>
              {TRAINING_TYPES.map(tt => (
                <option key={tt} value={tt}>{tt}</option>
              ))}
            </select>
          </div>

          {/* 5. Modalidad */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Modalidad</label>
            <select
              value={selectedModality}
              onChange={(e) => setSelectedModality(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#DA291C]"
            >
              <option value="all">Todas las Modalidades</option>
              <option value="Presencial">Presencial</option>
              <option value="Virtual">Virtual</option>
              <option value="Mixta">Mixta</option>
            </select>
          </div>

          {/* 6. Suplidor */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Suplidor</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#DA291C]"
            >
              <option value="all">Todos los Suplidores</option>
              <option value="Claro">Claro</option>
              {availableSuppliers.filter(s => s !== 'Claro').map(sup => (
                <option key={sup} value={sup}>{sup}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* 5. Tabla Oficial de 11 Columnas de Sustentabilidad */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Matriz Tabular de Capacitaciones ({filteredEvents.length})
            </h3>
            <p className="text-xs text-slate-500">
              Columnas oficiales normalizadas para el programa de sustentabilidad corporativa.
            </p>
          </div>

          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Formato Excel Oficial</span>
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No se encontraron capacitaciones</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No hay eventos que coincidan con los filtros seleccionados. Intenta restablecer los filtros para ver todos los cursos.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold text-[11px] whitespace-nowrap">
                  <th className="p-3.5 pl-5">#</th>
                  <th className="p-3.5">Título & Programa</th>
                  <th className="p-3.5">Tipo Sesión</th>
                  <th className="p-3.5">Tipo Entrenamiento</th>
                  <th className="p-3.5">Formato</th>
                  <th className="p-3.5">Modalidad</th>
                  <th className="p-3.5">Subprograma</th>
                  <th className="p-3.5">Fecha Desde</th>
                  <th className="p-3.5">Fecha Hasta</th>
                  <th className="p-3.5 text-center">Duración Horas</th>
                  <th className="p-3.5">Suplidor</th>
                  <th className="p-3.5 min-w-[220px]">Descripción</th>
                  <th className="p-3.5 pr-5 text-right">Inscritos / Asist.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((evt, idx) => {
                  const isSust = isSustainabilityProgram(evt.programCategory, evt.subprogram);
                  const dur = getEventDurationMetrics(evt);

                  // Calcular inscritos y asistencias
                  let regCount = 0;
                  let attCount = 0;
                  evt.schedule.forEach(s => {
                    s.slots.forEach(sl => {
                      regCount += sl.registered;
                      attCount += (sl.completedAttendanceList || sl.attendedList || []).length;
                    });
                  });

                  // Fechas formateadas
                  const fDesde = evt.startDate ? formatDateShort(evt.startDate) : (evt.schedule[0] ? formatDateShort(evt.schedule[0].date) : '-');
                  const lastSch = evt.schedule[evt.schedule.length - 1];
                  const fHasta = evt.endDate ? formatDateShort(evt.endDate) : (lastSch ? formatDateShort(lastSch.endDate || lastSch.date) : '-');

                  return (
                    <tr 
                      key={evt.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSust ? 'bg-emerald-50/15' : ''
                      }`}
                    >
                      {/* No. */}
                      <td className="p-3.5 pl-5 font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Título & Programa */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 leading-tight max-w-xs">
                          {evt.title}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          {isSust && <Leaf className="w-3 h-3 text-emerald-600 shrink-0" />}
                          <span className="truncate">{getProgramShortName(evt.programCategory)}</span>
                        </div>
                      </td>

                      {/* 1. Tipo de sesión */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          evt.sessionType === 'Asincrónica'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : evt.sessionType === 'Híbrido'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {evt.sessionType || 'Sincrónica'}
                        </span>
                      </td>

                      {/* 2. Tipo de entrenamiento */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          evt.trainingType === 'Conductual'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                        }`}>
                          {evt.trainingType || 'Técnico'}
                        </span>
                      </td>

                      {/* 3. Formato capacitación */}
                      <td className="p-3.5 whitespace-nowrap font-semibold text-slate-800">
                        {evt.trainingFormat || evt.category || 'Taller'}
                      </td>

                      {/* 4. Modalidad */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          {evt.modality === 'Virtual' ? (
                            <Video className="w-3.5 h-3.5 text-cyan-600" />
                          ) : evt.modality === 'Presencial' ? (
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Laptop className="w-3.5 h-3.5 text-purple-600" />
                          )}
                          <span>{evt.modality === 'Híbrida' ? 'Mixta' : evt.modality}</span>
                        </span>
                      </td>

                      {/* 5. Subprograma */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isSust
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {evt.subprogram || 'Sustentabilidad'}
                        </span>
                      </td>

                      {/* 6. Fecha desde */}
                      <td className="p-3.5 whitespace-nowrap text-slate-600 font-medium">
                        {fDesde}
                      </td>

                      {/* 7. Fecha hasta */}
                      <td className="p-3.5 whitespace-nowrap text-slate-600 font-medium">
                        {fHasta}
                      </td>

                      {/* 8. Duración horas */}
                      <td className="p-3.5 text-center whitespace-nowrap font-black text-slate-900">
                        <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-lg">
                          {dur.totalHours} hrs
                        </span>
                      </td>

                      {/* 9. Suplidor */}
                      <td className="p-3.5 whitespace-nowrap font-bold text-slate-800">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-[#DA291C]" />
                          <span>{evt.supplier || 'Claro'}</span>
                        </span>
                      </td>

                      {/* 10. Descripción */}
                      <td className="p-3.5 text-slate-600 font-normal leading-relaxed">
                        <p className="line-clamp-2" title={evt.description}>
                          {evt.description || 'Sin descripción detallada registrada.'}
                        </p>
                      </td>

                      {/* Métrica: Inscritos / Asistentes */}
                      <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {attCount} <span className="text-slate-400 font-normal">/ {regCount}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {regCount > 0 ? `${Math.round((attCount / regCount) * 100)}% asist.` : '0%'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
