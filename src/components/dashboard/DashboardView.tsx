import React, { useState } from 'react';
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
  ArrowUpRight
} from 'lucide-react';
import { TrainingEvent, Participant } from '../../types';
import { exportDashboardReportToExcel } from '../../utils/excelUtils';

interface DashboardViewProps {
  events: TrainingEvent[];
  participants: Participant[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  events,
  participants
}) => {
  const [filterCategory, setFilterCategory] = useState('Todos');

  // Cálculos de métricas globales
  let totalCapacity = 0;
  let totalRegistered = 0;
  let totalAttended = 0;
  const categoryStats: Record<string, { count: number; capacity: number; registered: number; attended: number }> = {};
  const instructorStats: Record<string, { events: number; registered: number; attended: number; ratings: number[] }> = {};
  const allFeedbacks: { eventTitle: string; userName?: string; userEmail: string; rating: number; comment?: string; createdAt: string }[] = [];

  events.forEach(evt => {
    // Categorías
    if (!categoryStats[evt.category]) {
      categoryStats[evt.category] = { count: 0, capacity: 0, registered: 0, attended: 0 };
    }
    categoryStats[evt.category].count += 1;

    // Instructores
    if (!instructorStats[evt.instructor]) {
      instructorStats[evt.instructor] = { events: 0, registered: 0, attended: 0, ratings: [] };
    }
    instructorStats[evt.instructor].events += 1;

    // Feedbacks
    (evt.feedbacks || []).forEach(fb => {
      allFeedbacks.push({
        eventTitle: evt.title,
        userName: fb.userName,
        userEmail: fb.userEmail,
        rating: fb.rating,
        comment: fb.comment,
        createdAt: fb.createdAt
      });
      instructorStats[evt.instructor].ratings.push(fb.rating);
    });

    evt.schedule.forEach(sch => {
      sch.slots.forEach(slot => {
        totalCapacity += slot.capacity;
        totalRegistered += slot.registered;
        const attCount = (slot.attendedList || []).length;
        totalAttended += attCount;

        categoryStats[evt.category].capacity += slot.capacity;
        categoryStats[evt.category].registered += slot.registered;
        categoryStats[evt.category].attended += attCount;

        instructorStats[evt.instructor].registered += slot.registered;
        instructorStats[evt.instructor].attended += attCount;
      });
    });
  });

  const occupancyRate = totalCapacity > 0 ? Math.round((totalRegistered / totalCapacity) * 100) : 0;
  const attendanceRate = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header & Export CTA */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-indigo-400">
            <BarChart3 className="w-4 h-4" />
            <span>Panel Ejecutivo de Métricas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Dashboard & Analítica de Capacitaciones</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Supervisa la tasa de ocupación, asistencia presencial, desempeño de facilitadores y encuestas en tiempo real.
          </p>
        </div>

        <button
          onClick={() => exportDashboardReportToExcel(events, participants)}
          className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 hover:scale-105 transition-all shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Informe Excel</span>
        </button>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1: Cupos Ofertados */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Oferta Total de Cupos</span>
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-3">{totalCapacity}</p>
          <p className="text-xs text-slate-400 mt-1">En {events.length} capacitaciones activas</p>
        </div>

        {/* KPI 2: Total Inscripciones */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Inscripciones Realizadas</span>
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-cyan-300 mt-3">{totalRegistered}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
            <Percent className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tasa de Ocupación: <strong className="text-white">{occupancyRate}%</strong></span>
          </div>
        </div>

        {/* KPI 3: Asistencia Real (QR) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Asistencia Confirmada (QR)</span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-300 mt-3">{totalAttended}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Efectividad: <strong className="text-white">{attendanceRate}%</strong></span>
          </div>
        </div>

        {/* KPI 4: Padrón Corporativo */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Padrón de Colaboradores</span>
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-purple-300 mt-3">{participants.length}</p>
          <p className="text-xs text-slate-400 mt-1">Colaboradores registrados</p>
        </div>

      </div>

      {/* Grid: Category Breakdown & Instructor KPI Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Category Breakdown */}
        <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Distribución por Tipo de Evento
          </h3>

          <div className="space-y-3">
            {Object.entries(categoryStats).map(([cat, stats]) => {
              const capPct = stats.capacity > 0 ? Math.round((stats.registered / stats.capacity) * 100) : 0;
              return (
                <div key={cat} className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-white">{cat}</span>
                    <span className="text-indigo-400">{stats.registered} / {stats.capacity} cupos</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(capPct, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{stats.count} curso(s)</span>
                    <span>{capPct}% ocupación</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Facilitators Table */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-400" />
            Rendimiento por Facilitador / Instructor
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-semibold">Instructor</th>
                  <th className="pb-3 font-semibold text-center">Sesiones</th>
                  <th className="pb-3 font-semibold text-center">Inscritos</th>
                  <th className="pb-3 font-semibold text-center">Asistieron</th>
                  <th className="pb-3 font-semibold text-right">Satisfacción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {Object.entries(instructorStats).map(([inst, s]) => {
                  const avg = s.ratings.length > 0
                    ? (s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length).toFixed(1)
                    : 'N/A';

                  return (
                    <tr key={inst} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-semibold text-slate-200">{inst}</td>
                      <td className="py-3 text-center text-slate-400">{s.events}</td>
                      <td className="py-3 text-center text-cyan-300 font-bold">{s.registered}</td>
                      <td className="py-3 text-center text-emerald-300 font-bold">{s.attended}</td>
                      <td className="py-3 text-right">
                        {avg !== 'N/A' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold text-[11px]">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {avg}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Feedbacks Stream Card */}
      {allFeedbacks.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Retroalimentación & Opiniones de Colaboradores
            </h3>
            <span className="text-xs text-slate-400">{allFeedbacks.length} evaluaciones recibidas</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allFeedbacks.map((fb, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white line-clamp-1">{fb.eventTitle}</span>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: fb.rating }).map((_, sIdx) => (
                      <Star key={sIdx} className="w-3 h-3 fill-amber-400" />
                    ))}
                  </div>
                </div>
                {fb.comment && (
                  <p className="text-xs text-slate-300 italic">"{fb.comment}"</p>
                )}
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                  <span>{fb.userName || fb.userEmail}</span>
                  <span>{fb.createdAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
