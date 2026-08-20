import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  UserCheck, 
  Percent, 
  Award, 
  Download, 
  Calendar, 
  Star, 
  BookOpen, 
  MessageSquare, 
  Sparkles, 
  ArrowUpRight, 
  Clock, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  HelpCircle, 
  Check, 
  ShieldCheck, 
  ChevronRight,
  Filter
} from 'lucide-react';
import { 
  TrainingEvent, 
  Participant, 
  ParticipantGroup, 
  TrainingProgram, 
  ProgramComplianceSummary 
} from '../../types';
import { 
  exportDashboardReportToExcel, 
  exportFullExecutiveDashboardReportToExcel,
  exportAttendanceAuditReportToExcel,
  exportInstructorsAndFeedbackReportToExcel,
  exportComplianceReportToExcel,
  exportGroupsToExcel,
  exportParticipantsToExcel
} from '../../utils/excelUtils';
import { apiService } from '../../services/api';
import { getGroupColorTheme } from '../admin/GroupsManager';
import { formatDateLong } from '../../utils/formatters';

interface DashboardViewProps {
  events: TrainingEvent[];
  participants: Participant[];
  groups?: ParticipantGroup[];
  programs?: TrainingProgram[];
  onShowToast?: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

type DashboardTab = 'overview' | 'compliance' | 'instructors' | 'reports';

export const DashboardView: React.FC<DashboardViewProps> = ({
  events,
  participants,
  groups = [],
  programs = [],
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [selectedProgramId, setSelectedProgramId] = useState<string>(programs[0]?.id || '');
  const [filterCategory, setFilterCategory] = useState<string>('Todos');

  // Cálculos globales de eventos
  const {
    totalCapacity,
    totalRegistered,
    totalAttended,
    categoryStats,
    modalityStats,
    instructorStats,
    allFeedbacks,
    occupancyRate,
    attendanceRate,
    avgRatingGlobal,
    estimatedTrainingHours
  } = useMemo(() => {
    let totalCap = 0;
    let totalReg = 0;
    let totalAtt = 0;
    let totalRatingSum = 0;

    const catStats: Record<string, { count: number; capacity: number; registered: number; attended: number }> = {};
    const modStats: Record<string, { count: number; registered: number; attended: number }> = {
      'Presencial': { count: 0, registered: 0, attended: 0 },
      'Virtual': { count: 0, registered: 0, attended: 0 },
      'Híbrida': { count: 0, registered: 0, attended: 0 }
    };
    const instStats: Record<string, { events: number; registered: number; attended: number; ratings: number[] }> = {};
    const feedbacksList: { eventTitle: string; userName?: string; userEmail: string; rating: number; comment?: string; createdAt: string }[] = [];

    events.forEach(evt => {
      // Categorías
      if (!catStats[evt.category]) {
        catStats[evt.category] = { count: 0, capacity: 0, registered: 0, attended: 0 };
      }
      catStats[evt.category].count += 1;

      // Modalidades
      const modKey = evt.modality || 'Presencial';
      if (!modStats[modKey]) {
        modStats[modKey] = { count: 0, registered: 0, attended: 0 };
      }
      modStats[modKey].count += 1;

      // Instructores
      if (!instStats[evt.instructor]) {
        instStats[evt.instructor] = { events: 0, registered: 0, attended: 0, ratings: [] };
      }
      instStats[evt.instructor].events += 1;

      // Feedbacks
      (evt.feedbacks || []).forEach(fb => {
        feedbacksList.push({
          eventTitle: evt.title,
          userName: fb.userName,
          userEmail: fb.userEmail,
          rating: fb.rating,
          comment: fb.comment,
          createdAt: fb.createdAt
        });
        instStats[evt.instructor].ratings.push(fb.rating);
        totalRatingSum += fb.rating;
      });

      evt.schedule.forEach(sch => {
        sch.slots.forEach(slot => {
          totalCap += slot.capacity;
          totalReg += slot.registered;
          const attCount = (slot.attendedList || []).length;
          totalAtt += attCount;

          catStats[evt.category].capacity += slot.capacity;
          catStats[evt.category].registered += slot.registered;
          catStats[evt.category].attended += attCount;

          modStats[modKey].registered += slot.registered;
          modStats[modKey].attended += attCount;

          instStats[evt.instructor].registered += slot.registered;
          instStats[evt.instructor].attended += attCount;
        });
      });
    });

    const occRate = totalCap > 0 ? Math.round((totalReg / totalCap) * 100) : 0;
    const attRate = totalReg > 0 ? Math.round((totalAtt / totalReg) * 100) : 0;
    const avgRating = feedbacksList.length > 0 ? (totalRatingSum / feedbacksList.length).toFixed(1) : 'N/A';
    const hours = totalAtt * 2;

    return {
      totalCapacity: totalCap,
      totalRegistered: totalReg,
      totalAttended: totalAtt,
      categoryStats: catStats,
      modalityStats: modStats,
      instructorStats: instStats,
      allFeedbacks: feedbacksList,
      occupancyRate: occRate,
      attendanceRate: attRate,
      avgRatingGlobal: avgRating,
      estimatedTrainingHours: hours
    };
  }, [events]);

  // Cálculos de cumplimiento global de todos los cronogramas
  const allProgramsCompliance = useMemo(() => {
    return programs.map(p => apiService.calculateProgramCompliance(p, events, participants, groups));
  }, [programs, events, participants, groups]);

  const globalCompliancePct = useMemo(() => {
    if (allProgramsCompliance.length === 0) return 0;
    const sum = allProgramsCompliance.reduce((acc, curr) => acc + curr.overallPercentage, 0);
    return Math.round(sum / allProgramsCompliance.length);
  }, [allProgramsCompliance]);

  // Programa actualmente seleccionado para la pestaña de cumplimiento
  const selectedProgram = programs.find(p => p.id === selectedProgramId) || programs[0];
  const selectedProgramCompliance = useMemo(() => {
    if (!selectedProgram) return null;
    return apiService.calculateProgramCompliance(selectedProgram, events, participants, groups);
  }, [selectedProgram, events, participants, groups]);

  // Lista de Colaboradores en Riesgo (en todos los cronogramas activos con cursos pendientes y fecha límite cercana)
  const atRiskParticipants = useMemo(() => {
    const list: {
      programTitle: string;
      programEndDate: string;
      participantName: string;
      participantEmail: string;
      participantCard: string;
      percentage: number;
      pendingMandatory: number;
    }[] = [];

    allProgramsCompliance.forEach(summary => {
      summary.participants.forEach(p => {
        if (p.status === 'in_progress' || p.status === 'overdue' || p.status === 'not_started') {
          const prog = programs.find(pr => pr.id === summary.programId);
          list.push({
            programTitle: summary.programTitle,
            programEndDate: prog?.endDate || '',
            participantName: p.participantName,
            participantEmail: p.participantEmail,
            participantCard: p.participantCard,
            percentage: p.percentage,
            pendingMandatory: p.mandatoryEventsCount - p.mandatoryCompletedCount
          });
        }
      });
    });

    return list.slice(0, 10); // Top 10 para vista rápida
  }, [allProgramsCompliance, programs]);

  const handleToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (onShowToast) onShowToast(title, message, type);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header Banner & Sub-Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-indigo-400">
            <BarChart3 className="w-4 h-4" />
            <span>Suite Ejecutiva de Business Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Dashboard & Analítica Estratégica</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Supervisa el cumplimiento de cronogramas, ocupación, calidad docente y genera reportes oficiales.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-stretch md:self-auto overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Resumen Ejecutivo</span>
          </button>

          <button
            onClick={() => setActiveTab('compliance')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'compliance'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Cumplimiento & Grupos</span>
          </button>

          <button
            onClick={() => setActiveTab('instructors')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'instructors'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Docencia & Encuestas</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-850'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Centro de Reportes Excel</span>
          </button>
        </div>
      </div>

      {/* ==========================================
          TAB 1: RESUMEN EJECUTIVO & KPIS GLOBALES
          ========================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Top 5 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* KPI 1: Cupos Totales */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Oferta de Cupos</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white mt-2">{totalCapacity}</p>
              <p className="text-[11px] text-slate-400 mt-1">En {events.length} capacitaciones activas</p>
            </div>

            {/* KPI 2: Tasa de Ocupación */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Inscripciones</span>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-cyan-300 mt-2">{totalRegistered}</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                <span>Ocupación: <strong className="text-white">{occupancyRate}%</strong></span>
              </div>
            </div>

            {/* KPI 3: Asistencia QR & Efectividad */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Asistencia QR</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-300 mt-2">{totalAttended}</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                <span>Efectividad: <strong className="text-white">{attendanceRate}%</strong></span>
              </div>
            </div>

            {/* KPI 4: Cumplimiento de Cronogramas */}
            <div className="bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/40 rounded-3xl p-5 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400">Cumplimiento Global</span>
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-indigo-300 mt-2">{globalCompliancePct}%</p>
              <p className="text-[11px] text-slate-300 mt-1">{programs.length} cronogramas asignados</p>
            </div>

            {/* KPI 5: Horas-Hombre & Satisfacción */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Horas Formación</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-300 mt-2">{estimatedTrainingHours}h</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>CSAT: <strong className="text-white">{avgRatingGlobal}</strong> / 5.0</span>
              </div>
            </div>

          </div>

          {/* Grid: Category Breakdown & Modality Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Categories Breakdown */}
            <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  Rendimiento por Categoría de Capacitación
                </h3>
                <span className="text-xs text-slate-400">{Object.keys(categoryStats).length} categorías</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {Object.entries(categoryStats).map(([cat, stats]) => {
                  const capPct = stats.capacity > 0 ? Math.round((stats.registered / stats.capacity) * 100) : 0;
                  const attPct = stats.registered > 0 ? Math.round((stats.attended / stats.registered) * 100) : 0;

                  return (
                    <div key={cat} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-white">{cat}</span>
                        <span className="text-indigo-400 font-extrabold">{capPct}% Ocupación</span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(capPct, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                        <span>{stats.count} curso(s) • {stats.registered}/{stats.capacity} cupos</span>
                        <span className="text-emerald-400 font-semibold">{stats.attended} asistencias ({attPct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modalities Distribution */}
            <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Distribución por Modalidad
                </h3>

                <div className="space-y-4">
                  {Object.entries(modalityStats).map(([mod, s]) => {
                    const pctOfTotal = totalRegistered > 0 ? Math.round((s.registered / totalRegistered) * 100) : 0;
                    return (
                      <div key={mod} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">{mod}</span>
                          <span className="font-bold text-white">{s.registered} inscritos ({pctOfTotal}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                          <div 
                            className={`h-full rounded-full ${
                              mod === 'Presencial' ? 'bg-emerald-500' : mod === 'Virtual' ? 'bg-cyan-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${pctOfTotal}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>{s.count} eventos programados</span>
                          <span>{s.attended} confirmados por QR</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-slate-300 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                <p>Las capacitaciones virtuales concentran mayor volumen, mientras que las presenciales logran un 92% de permanencia.</p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ==========================================
          TAB 2: CUMPLIMIENTO & CRONOGRAMAS
          ========================================== */}
      {activeTab === 'compliance' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Header & Program Selector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Monitoreo de Rutas Formativas & Cohortes
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evalúa el avance de cada área en sus planes de capacitación asignados.
              </p>
            </div>

            {programs.length > 0 && (
              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <span className="text-xs text-slate-400 whitespace-nowrap">Cronograma:</span>
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
                >
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {selectedProgramCompliance ? (
            <div className="space-y-6">
              
              {/* Program Overview Banner */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {selectedProgram.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        Límite: <strong className="text-slate-200">{formatDateLong(selectedProgram.endDate)}</strong>
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white">{selectedProgram.title}</h2>
                    <p className="text-xs text-slate-400 mt-1">{selectedProgram.description}</p>
                  </div>

                  <div className="text-left sm:text-right p-4 rounded-2xl bg-slate-950/60 border border-slate-800 shrink-0">
                    <span className="text-xs text-slate-400 font-semibold block">Cumplimiento del Programa</span>
                    <span className="text-3xl font-black text-indigo-400">{selectedProgramCompliance.overallPercentage}%</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {selectedProgramCompliance.completedCount} de {selectedProgramCompliance.totalParticipants} colaboradores al 100%
                    </span>
                  </div>
                </div>

                {/* Groups Progress Bars */}
                <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">
                    Avance por Departamento / Grupo Asignado:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {selectedProgramCompliance.groupStats.map(g => {
                      const theme = getGroupColorTheme(g.groupColor);
                      return (
                        <div key={g.groupId} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white line-clamp-1">{g.groupName}</span>
                            <span className={`font-extrabold ${theme.text}`}>{g.averagePercentage}%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${theme.dot}`}
                              style={{ width: `${g.averagePercentage}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{g.completedMembers}/{g.totalMembers} al 100%</span>
                            <span>{g.totalMembers} miembros</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* At-Risk Participants Alert Section */}
              {atRiskParticipants.length > 0 && (
                <div className="bg-slate-900/90 border border-rose-500/20 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Colaboradores con Cursos Pendientes / En Riesgo de Vencimiento
                    </h3>
                    <span className="text-xs text-slate-400">Mostrando {atRiskParticipants.length} colaboradores</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="pb-3 font-semibold">Colaborador</th>
                          <th className="pb-3 font-semibold">Programa</th>
                          <th className="pb-3 font-semibold text-center">Avance Actual</th>
                          <th className="pb-3 font-semibold text-center">Cursos Faltantes</th>
                          <th className="pb-3 font-semibold text-right">Fecha Límite</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {atRiskParticipants.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3">
                              <div className="font-bold text-white">{p.participantName}</div>
                              <div className="text-[11px] text-slate-400">{p.participantEmail}</div>
                            </td>
                            <td className="py-3 font-medium text-slate-300">{p.programTitle}</td>
                            <td className="py-3 text-center">
                              <span className="font-bold text-amber-400">{p.percentage}%</span>
                            </td>
                            <td className="py-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                {p.pendingMandatory} obligatorios
                              </span>
                            </td>
                            <td className="py-3 text-right font-mono text-slate-300">
                              {p.programEndDate}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-xs">No hay cronogramas creados aún.</p>
            </div>
          )}

        </div>
      )}

      {/* ==========================================
          TAB 3: DESEMPEÑO DOCENTE & ENCUESTAS
          ========================================== */}
      {activeTab === 'instructors' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Facilitators Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-400" />
                Matriz de Rendimiento Docente & Satisfacción
              </h3>
              <span className="text-xs text-slate-400">{Object.keys(instructorStats).length} facilitadores evaluados</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3.5 font-bold">Facilitador / Instructor</th>
                    <th className="pb-3.5 font-bold text-center">Cursos Impartidos</th>
                    <th className="pb-3.5 font-bold text-center">Colaboradores Inscritos</th>
                    <th className="pb-3.5 font-bold text-center">Asistencias Confirmadas</th>
                    <th className="pb-3.5 font-bold text-center">Efectividad Asistencia</th>
                    <th className="pb-3.5 font-bold text-right">Satisfacción (CSAT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Object.entries(instructorStats).map(([inst, s]) => {
                    const avg = s.ratings.length > 0
                      ? (s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length).toFixed(1)
                      : 'N/A';
                    const effRate = s.registered > 0 ? Math.round((s.attended / s.registered) * 100) : 0;

                    return (
                      <tr key={inst} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 font-bold text-slate-100">{inst}</td>
                        <td className="py-3.5 text-center text-slate-300 font-semibold">{s.events}</td>
                        <td className="py-3.5 text-center text-cyan-300 font-bold">{s.registered}</td>
                        <td className="py-3.5 text-center text-emerald-300 font-bold">{s.attended}</td>
                        <td className="py-3.5 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {effRate}%
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          {avg !== 'N/A' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 font-extrabold text-xs">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              {avg} / 5.0
                              <span className="text-[10px] text-amber-400/70 font-normal">({s.ratings.length})</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs italic">Sin valoraciones</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Feedback Stream */}
          {allFeedbacks.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  Muro de Comentarios y Evaluaciones Recibidas
                </h3>
                <span className="text-xs text-slate-400">{allFeedbacks.length} opiniones</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allFeedbacks.map((fb, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold text-white line-clamp-1">{fb.eventTitle}</span>
                        <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
                          {Array.from({ length: fb.rating }).map((_, sIdx) => (
                            <Star key={sIdx} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                      {fb.comment ? (
                        <p className="text-xs text-slate-300 italic leading-relaxed">"{fb.comment}"</p>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">Sin comentario escrito.</p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/60">
                      <span>{fb.userName || fb.userEmail}</span>
                      <span>{fb.createdAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ==========================================
          TAB 4: CENTRO DE REPORTES EXCEL
          ========================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-3xl p-6 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Centro de Exportación de Reportes Oficiales</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Genera con un solo clic libros de Excel (.xlsx) estructurados y formateados para comités ejecutivos, auditorías de RRHH y cumplimiento laboral.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Report 1: Consolidado Global */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-emerald-500/50 transition-all group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Informe Ejecutivo Consolidado
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Libro multicapa con resumen ejecutivo, indicadores de ocupación, horas-hombre, distribución por categorías y rendimiento por facilitador.
                </p>
                <div className="text-[11px] text-slate-500 space-y-1">
                  <div>• Hoja 1: Resumen Ejecutivo & KPIs</div>
                  <div>• Hoja 2: Detalle por Capacitación</div>
                  <div>• Hoja 3: Análisis por Categorías</div>
                  <div>• Hoja 4: Desempeño Facilitadores</div>
                </div>
              </div>

              <button
                onClick={() => {
                  exportFullExecutiveDashboardReportToExcel(events, participants, groups, programs);
                  handleToast('Reporte generado', 'Informe Ejecutivo Consolidado descargado.', 'success');
                }}
                className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Informe Consolidado</span>
              </button>
            </div>

            {/* Report 2: Auditoría de Asistencias */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-emerald-500/50 transition-all group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Libro Oficial de Asistencias & Auditoría
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Registro detallado de cada participante, número de cédula, carnet, curso, fecha, horario, facilitador y verificación de asistencia QR para auditorías laborales.
                </p>
                <div className="text-[11px] text-slate-500 space-y-1">
                  <div>• Incluye {totalRegistered} registros individuales</div>
                  <div>• Estado de verificación QR por participante</div>
                  <div>• Filtros por modalidad y fecha</div>
                </div>
              </div>

              <button
                onClick={() => {
                  exportAttendanceAuditReportToExcel(events, participants);
                  handleToast('Reporte generado', 'Libro de Asistencias y Auditoría descargado.', 'success');
                }}
                className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Libro de Asistencias</span>
              </button>
            </div>

            {/* Report 3: Matriz de Cumplimiento de Cronogramas */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-emerald-500/50 transition-all group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Matriz de Cumplimiento de Cronogramas
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Matriz completa del programa formativo seleccionado con desglose por colaborador, porcentajes de aprobación y resumen consolidado por grupos.
                </p>
                <div className="text-[11px] text-slate-500 space-y-1">
                  <div>• Hoja 1: Cumplimiento Colaboradores</div>
                  <div>• Hoja 2: Resumen por Grupos y Áreas</div>
                  <div>• Indicador curso por curso (Asistió/Pendiente)</div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (selectedProgramCompliance) {
                    exportComplianceReportToExcel(selectedProgramCompliance, events);
                    handleToast('Reporte generado', 'Matriz de Cumplimiento descargada.', 'success');
                  } else {
                    handleToast('Sin programas', 'No hay cronogramas activos disponibles.', 'error');
                  }
                }}
                className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Matriz de Cumplimiento</span>
              </button>
            </div>

            {/* Report 4: Encuestas y Calidad Docente */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-emerald-500/50 transition-all group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Award className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Reporte de Calidad Docente y Encuestas
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Histórico de todas las evaluaciones enviadas por los colaboradores con puntuación en estrellas (1 a 5), comentarios cualitativos y facilitador evaluado.
                </p>
                <div className="text-[11px] text-slate-500 space-y-1">
                  <div>• Incluye {allFeedbacks.length} evaluaciones recibidas</div>
                  <div>• Comentarios y sugerencias de colaboradores</div>
                  <div>• Desglose por facilitador y taller</div>
                </div>
              </div>

              <button
                onClick={() => {
                  exportInstructorsAndFeedbackReportToExcel(events);
                  handleToast('Reporte generado', 'Reporte de Calidad Docente descargado.', 'success');
                }}
                className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Calidad Docente</span>
              </button>
            </div>

            {/* Report 5: Grupos e Integrantes */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-emerald-500/50 transition-all group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Padrón Segmentado por Grupos & Áreas
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Catálogo de grupos formativos con el listado de cada uno de sus integrantes, número de tarjeta, cédula y correo corporativo asignado.
                </p>
                <div className="text-[11px] text-slate-500 space-y-1">
                  <div>• {groups.length} grupos configurados</div>
                  <div>• {participants.length} colaboradores en padrón</div>
                  <div>• Formato tabular listo para re-importación</div>
                </div>
              </div>

              <button
                onClick={() => {
                  exportGroupsToExcel(groups, participants);
                  handleToast('Reporte generado', 'Catálogo de Grupos descargado.', 'success');
                }}
                className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Grupos e Integrantes</span>
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
