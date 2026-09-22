import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  Target, 
  Scale, 
  Wrench, 
  TrendingDown, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  Award,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { OjtMetrics, Company, OjtChecklist, CalibrationSession } from '../../types';
import { apiService } from '../../services/api';

interface OjtTtpSectionProps {
  companyId?: string;
  checklists: OjtChecklist[];
  calibrations: CalibrationSession[];
  selectedCompany?: Company;
}

export const OjtTtpSection: React.FC<OjtTtpSectionProps> = ({
  companyId,
  checklists,
  calibrations,
  selectedCompany
}) => {
  const [metrics, setMetrics] = useState<OjtMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        const data = await apiService.getOjtMetrics(companyId);
        setMetrics(data);
      } catch (err) {
        console.error('Error al cargar métricas de campo TTP:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMetrics();
  }, [companyId, checklists.length, calibrations.length]);

  if (loading || !metrics) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl animate-pulse shadow-sm">
        <Activity className="w-8 h-8 text-[#DA291C] mx-auto mb-2 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Calculando indicadores del Plan a 90 Días y Time to Productivity...</p>
      </div>
    );
  }

  const ttpDelta = metrics.targetTtpDays - metrics.estimatedTtpDays;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Banner de Presentación del Plan 90D (Light Theme) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-red-50/80 via-white to-slate-50 border border-red-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#DA291C] mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Diagnóstico Integral & Aceleración Operativa (Plan 90 Días)</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900">
            Tablero de Time to Productivity (TTP), First-Time Fix & Calibración
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Monitoreo en tiempo real de la curva de aprendizaje de los nuevos técnicos, reducción de dispersión inter-equipos y alineación entre evaluación teórica y desempeño en campo.
          </p>
        </div>

        <div className="px-4 py-2.5 rounded-2xl bg-red-50 border border-red-200 text-right shrink-0">
          <p className="text-[10px] uppercase font-extrabold text-slate-500">Meta Corporativa</p>
          <p className="text-sm font-black text-[#DA291C]">{metrics.targetTtpDays} Días a Autonomía</p>
        </div>
      </div>

      {/* 4 Indicadores Core */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Time to Productivity */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-[#DA291C]">
            <span className="text-xs font-bold uppercase tracking-wider">Time to Productivity</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{metrics.estimatedTtpDays}</span>
            <span className="text-xs font-semibold text-slate-500">días promedio</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg w-fit">
            <span>⚡ {ttpDelta >= 0 ? `${ttpDelta} días más rápido que la meta` : `${Math.abs(ttpDelta)} días por encima`}</span>
          </p>
        </div>

        {/* KPI 2: First-Time Fix Rate */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider">First-Time Fix (FTF)</span>
            <Wrench className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{metrics.firstTimeFixRate}%</span>
            <span className="text-xs font-semibold text-slate-500">resolución a la primera</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium">
            Meta: $\ge 90\%$ • Control de retrabajos
          </p>
        </div>

        {/* KPI 3: Brecha Teoría vs Campo */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-xs font-bold uppercase tracking-wider">Brecha Teoría vs Campo</span>
            <Scale className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{metrics.theoryVsFieldGap}</span>
            <span className="text-xs font-semibold text-slate-500">pts de varianza</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium">
            Aula: <strong className="text-slate-800">{metrics.avgTheoryScore}</strong> | Campo: <strong className="text-slate-800">{metrics.avgFieldScore}</strong>
          </p>
        </div>

        {/* KPI 4: Seguridad & EPP */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-cyan-600">
            <span className="text-xs font-bold uppercase tracking-wider">Adherencia EPP & Seguridad</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{metrics.safetyPassRate}%</span>
            <span className="text-xs font-semibold text-slate-500">protocolos al 100%</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg w-fit">
            ✓ Tolerancia Cero Activa
          </p>
        </div>

      </div>

      {/* Diagnóstico de Calibración & Top Debilidades en Campo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panel Izquierdo: Estado de Calibración Ops-Capacitación */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#DA291C]" />
              <h3 className="text-sm font-extrabold text-slate-900">Mesas de Calibración Quincenales</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-[#DA291C] border border-red-200">
              {calibrations.length} Sesiones Auditadas
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Medición sistemática de la correlación entre notas de exámenes de aula y el rendimiento observado por los supervisores en terreno.
          </p>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600 font-bold">Nota Promedio Exámenes Teóricos</span>
                <span className="font-extrabold text-slate-900">{metrics.avgTheoryScore} / 100</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${metrics.avgTheoryScore}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600 font-bold">Desempeño Práctico en Campo</span>
                <span className="font-extrabold text-[#DA291C]">{metrics.avgFieldScore} / 100</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div className="h-full bg-[#DA291C] rounded-full" style={{ width: `${metrics.avgFieldScore}%` }} />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Diagnóstico de Calibración:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Existe una brecha de <strong>{metrics.theoryVsFieldGap} puntos</strong> entre la nota de aula y la ejecución en campo. Se recomienda enfocar los próximos talleres en práctica simulada y shadowing 1:1.
            </p>
          </div>
        </div>

        {/* Panel Derecho: Top Debilidades Detectadas en Campo */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-extrabold text-slate-900">Top Debilidades Observadas en Campo</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Checklists ({checklists.length})
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Frecuencia de desvíos detectados en las bitácoras digitales de acompañamiento en campo:
          </p>

          {metrics.topFieldWeaknesses.length > 0 ? (
            <div className="space-y-2.5">
              {metrics.topFieldWeaknesses.map((w, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-red-100 text-[#DA291C] flex items-center justify-center text-xs font-extrabold">
                      #{idx + 1}
                    </div>
                    <span className="text-xs font-bold text-slate-800">{w.weakness}</span>
                  </div>
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-red-50 text-[#DA291C] border border-red-200">
                    {w.count} observaciones
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
              <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-700">Sin debilidades críticas recurrentes</p>
              <p className="text-[11px] text-slate-500 mt-0.5">El estándar operativo se mantiene en conformidad.</p>
            </div>
          )}

          <div className="pt-2">
            <p className="text-[11px] text-slate-500 italic text-center">
              💡 Fuente: Bitácoras y rúbricas de acompañamiento diario y semanal registradas por la Red de Tutores y Evaluadores de Campo.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
