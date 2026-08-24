import React, { useState } from 'react';
import { 
  Activity, 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Scale, 
  Calendar, 
  UserCheck, 
  Clock, 
  Download, 
  Sparkles, 
  ChevronRight, 
  Wrench, 
  ShieldCheck, 
  Filter,
  Layers,
  Award,
  FileSpreadsheet,
  BarChart3
} from 'lucide-react';
import { OjtChecklist, CalibrationSession, Participant, UserAccount, Company } from '../../types';
import { OjtChecklistModal } from './OjtChecklistModal';
import { CalibrationModal } from './CalibrationModal';
import { OjtTtpSection } from '../dashboard/OjtTtpSection';
import { exportOjtChecklistsToExcel, exportCalibrationsToExcel } from '../../utils/excelUtils';

interface OjtManagerProps {
  checklists: OjtChecklist[];
  calibrations: CalibrationSession[];
  participants: Participant[];
  currentUser: UserAccount | null;
  companies?: Company[];
  isSuperAdmin?: boolean;
  onSaveChecklist: (checklist: Partial<OjtChecklist>) => Promise<void>;
  onDeleteChecklist: (id: string) => Promise<void>;
  onSaveCalibration: (session: Partial<CalibrationSession>) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const OjtManager: React.FC<OjtManagerProps> = ({
  checklists,
  calibrations,
  participants,
  currentUser,
  companies = [],
  isSuperAdmin = false,
  onSaveChecklist,
  onDeleteChecklist,
  onSaveCalibration,
  onShowToast
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'checklists' | 'calibrations' | 'reports'>('checklists');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<OjtChecklist | null>(null);
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState(false);

  // Handlers for Export
  const handleExportChecklists = () => {
    if (checklists.length === 0) {
      onShowToast('Sin datos para exportar', 'No hay bitácoras OJT registradas actualmente.', 'info');
      return;
    }
    exportOjtChecklistsToExcel(checklists, participants, companies);
    onShowToast('Reporte generado', 'Se ha descargado el reporte completo de bitácoras OJT en Excel.', 'success');
  };

  const handleExportCalibrations = () => {
    if (calibrations.length === 0) {
      onShowToast('Sin datos para exportar', 'No hay sesiones de calibración registradas actualmente.', 'info');
      return;
    }
    exportCalibrationsToExcel(calibrations, companies);
    onShowToast('Reporte generado', 'Se ha descargado el reporte de mesas de calibración en Excel.', 'success');
  };

  // Filtered List
  const filteredChecklists = checklists.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const pName = (c.participantName || '').toLowerCase();
    const pCard = c.participantCard.toLowerCase();
    const evalName = (c.evaluatorName || '').toLowerCase();
    const dept = (c.department || '').toLowerCase();

    if (statusFilter !== 'all' && c.operationalStatus !== statusFilter) return false;
    if (typeFilter !== 'all' && c.observationType !== typeFilter) return false;

    if (!q) return true;
    return pName.includes(q) || pCard.includes(q) || evalName.includes(q) || dept.includes(q);
  });

  // KPI Metrics Summary
  const total = checklists.length;
  const compliantCount = checklists.filter(c => c.operationalStatus === 'compliant').length;
  const coachingCount = checklists.filter(c => c.operationalStatus === 'needs_coaching').length;
  const criticalCount = checklists.filter(c => c.operationalStatus === 'critical_gap').length;
  const ftfCount = checklists.filter(c => c.firstTimeFixPass).length;

  const avgScore = total > 0 
    ? Math.round(checklists.reduce((acc, curr) => acc + Number(curr.overallScore), 0) / total) 
    : 0;
  const ftfRate = total > 0 ? Math.round((ftfCount / total) * 100) : 0;
  const complianceRate = total > 0 ? Math.round((compliantCount / total) * 100) : 0;

  return (
    <div className="space-y-6">
      
      {/* Top Stat Cards (Light Theme) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 p-4 rounded-3xl space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-[#DA291C]">
            <span className="text-[11px] font-black uppercase tracking-wider">Bitácoras Totales</span>
            <Activity className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-slate-900">{total}</p>
          <p className="text-[10px] text-slate-400">Acompañamientos registrados</p>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-3xl space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-black uppercase tracking-wider">Promedio en Campo</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{avgScore}<span className="text-xs text-slate-400">/100</span></p>
          <p className="text-[10px] text-emerald-600">{complianceRate}% conforme a estándar</p>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-3xl space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-cyan-700">
            <span className="text-[11px] font-black uppercase tracking-wider">First-Time Fix</span>
            <Wrench className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-2xl font-black text-cyan-700">{ftfRate}%</p>
          <p className="text-[10px] text-cyan-600">Sin retrabajos en 1er intento</p>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-3xl space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-black uppercase tracking-wider">Mesas Calibración</span>
            <Scale className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700">{calibrations.length}</p>
          <p className="text-[10px] text-amber-600">Alineaciones Ops-Capacitación</p>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 min-w-max gap-1">
          <button
            onClick={() => setActiveSubTab('checklists')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'checklists'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Bitácoras de Campo ({checklists.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('calibrations')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'calibrations'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Mesas de Calibración ({calibrations.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('reports')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'reports'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Reportes & Analítica TTP</span>
          </button>
        </div>

        {/* Global Action Export & Creation Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {activeSubTab === 'checklists' && (
            <>
              <button
                type="button"
                onClick={handleExportChecklists}
                className="px-3.5 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 border border-emerald-200 transition-all shadow-xs cursor-pointer"
                title="Descargar todas las bitácoras en Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Exportar Bitácoras (Excel)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingChecklist(null);
                  setIsChecklistModalOpen(true);
                }}
                className="px-4 py-2 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-extrabold rounded-2xl shadow-md shadow-red-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Bitácora OJT</span>
              </button>
            </>
          )}

          {activeSubTab === 'calibrations' && (
            <>
              <button
                type="button"
                onClick={handleExportCalibrations}
                className="px-3.5 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 border border-emerald-200 transition-all shadow-xs cursor-pointer"
                title="Descargar mesas de calibración en Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Exportar Calibraciones (Excel)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCalibrationModalOpen(true)}
                className="px-4 py-2 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-extrabold rounded-2xl shadow-md shadow-red-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Sesión de Calibración</span>
              </button>
            </>
          )}

          {activeSubTab === 'reports' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportChecklists}
                className="px-3 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 border border-emerald-200 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel Bitácoras</span>
              </button>
              <button
                type="button"
                onClick={handleExportCalibrations}
                className="px-3 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1.5 border border-amber-200 transition-all cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5 text-amber-600" />
                <span>Excel Calibración</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SUBTAB 1: CHECKLISTS DE CAMPO */}
      {activeSubTab === 'checklists' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3.5 my-auto" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por colaborador, tarjeta, supervisor o departamento..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C] shadow-xs"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#DA291C]"
            >
              <option value="all">Todos los diagnósticos</option>
              <option value="compliant">🟢 Conforme ({compliantCount})</option>
              <option value="needs_coaching">🟡 Requiere Coaching ({coachingCount})</option>
              <option value="critical_gap">🔴 Brecha Crítica ({criticalCount})</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#DA291C]"
            >
              <option value="all">Todos los tipos de observación</option>
              <option value="daily_observation">Acompañamiento Diario</option>
              <option value="weekly_evaluation">Evaluación Semanal</option>
              <option value="cross_audit">Auditoría Cruzada</option>
              <option value="first_60d_check">Check 60 Días</option>
            </select>
          </div>

          {/* Checklists Table */}
          {filteredChecklists.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-sm">
              <Activity className="w-12 h-12 text-slate-400 mx-auto animate-pulse" />
              <h3 className="text-base font-black text-slate-800">No hay bitácoras registradas</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Registra acompañamientos diarios o auditorías cruzadas para medir el desempeño real en campo y acelerar la curva de aprendizaje.
              </p>
              <button
                onClick={() => {
                  setEditingChecklist(null);
                  setIsChecklistModalOpen(true);
                }}
                className="px-4 py-2 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Primera Bitácora</span>
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-50">
                      <th className="p-4">Colaborador</th>
                      <th className="p-4">Fecha & Tipo</th>
                      <th className="p-4">Evaluador OJT</th>
                      <th className="p-4">Seguridad & FTF</th>
                      <th className="p-4">Puntaje</th>
                      <th className="p-4">Diagnóstico</th>
                      <th className="p-4">Plan de Acción</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredChecklists.map(c => {
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* Colaborador */}
                          <td className="p-4">
                            <div>
                              <p className="font-bold text-slate-900 text-xs">{c.participantName || c.participantCard}</p>
                              <p className="text-[11px] text-slate-500 font-mono">
                                ID: #{c.participantCard} • {c.department || 'Sin Depto'}
                              </p>
                            </div>
                          </td>

                          {/* Fecha & Tipo */}
                          <td className="p-4">
                            <p className="font-bold text-slate-700">{c.date}</p>
                            <span className="text-[10px] font-bold text-[#DA291C] bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                              {c.observationType === 'daily_observation' ? 'Diario' :
                               c.observationType === 'weekly_evaluation' ? 'Semanal' :
                               c.observationType === 'cross_audit' ? 'Auditoría Cruzada' : 'Check 60D'}
                            </span>
                          </td>

                          {/* Evaluador */}
                          <td className="p-4 text-slate-700">
                            <div className="flex items-center gap-1.5 font-semibold">
                              <UserCheck className="w-3.5 h-3.5 text-[#DA291C] shrink-0" />
                              <span>{c.evaluatorName}</span>
                            </div>
                          </td>

                          {/* Seguridad & First-Time Fix */}
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                c.safetyProtocolPass ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`} title="Protocolo de Seguridad EPP">
                                EPP: {c.safetyProtocolPass ? '✓' : '✗'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                c.firstTimeFixPass ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`} title="Calidad en Primer Intento">
                                FTF: {c.firstTimeFixPass ? '✓' : '✗'}
                              </span>
                            </div>
                          </td>

                          {/* Puntaje */}
                          <td className="p-4">
                            <span className={`font-mono font-black text-sm ${
                              c.overallScore >= 85 ? 'text-emerald-700' :
                              c.overallScore >= 70 ? 'text-amber-700' : 'text-rose-700'
                            }`}>
                              {c.overallScore}
                            </span>
                            <span className="text-slate-400 text-[10px]"> /100</span>
                          </td>

                          {/* Diagnóstico */}
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                              c.operationalStatus === 'compliant' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              c.operationalStatus === 'needs_coaching' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {c.operationalStatus === 'compliant' ? '🟢 Conforme' :
                               c.operationalStatus === 'needs_coaching' ? '🟡 Requiere Coaching' :
                               '🔴 Brecha Crítica'}
                            </span>
                          </td>

                          {/* Plan de Acción */}
                          <td className="p-4 max-w-xs truncate text-slate-500">
                            {c.immediateActionPlan || c.notes || '—'}
                          </td>

                          {/* Acciones */}
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingChecklist(c);
                                  setIsChecklistModalOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Editar bitácora"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm('¿Deseas eliminar esta bitácora OJT?')) {
                                    await onDeleteChecklist(c.id);
                                    onShowToast('Bitácora eliminada', 'El registro ha sido removido.', 'info');
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-slate-200 text-xs text-slate-500 flex justify-between bg-slate-50">
                <span>Mostrando {filteredChecklists.length} de {checklists.length} bitácoras</span>
                <span>{compliantCount} conformes • {coachingCount} en coaching • {criticalCount} brechas críticas</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: MESAS DE CALIBRACIÓN */}
      {activeSubTab === 'calibrations' && (
        <div className="space-y-4">
          {calibrations.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-sm">
              <Scale className="w-12 h-12 text-amber-500 mx-auto animate-pulse" />
              <h3 className="text-base font-black text-slate-800">No hay mesas de calibración registradas</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Las mesas de calibración permiten alinear el criterio entre Capacitación (aula) y Operaciones (campo) para evitar dispersión y falsos aprobados.
              </p>
              <button
                onClick={() => setIsCalibrationModalOpen(true)}
                className="px-4 py-2 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Programar Primera Mesa</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {calibrations.map((cal) => (
                <div key={cal.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3 hover:border-amber-400/80 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-700 mb-0.5">
                        <Scale className="w-3.5 h-3.5" />
                        <span>{cal.date} • {cal.conductedBy}</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900">{cal.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {cal.participantsReviewed} colaboradores auditados
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                      Gap: {cal.varianceGapPct}%
                    </span>
                  </div>

                  {/* Comparativa Aula vs Campo */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Nota Aula (Teoría)</span>
                      <p className="text-base font-black text-slate-800">{cal.averageTheoryScore} <span className="text-[10px] text-slate-400">/100</span></p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Nota Campo (Práctica)</span>
                      <p className="text-base font-black text-[#DA291C]">{cal.averageFieldScore} <span className="text-[10px] text-slate-400">/100</span></p>
                    </div>
                  </div>

                  {cal.keyFindings && (
                    <div className="text-xs text-slate-600">
                      <strong className="text-slate-800">Hallazgos: </strong>
                      <span>{cal.keyFindings}</span>
                    </div>
                  )}

                  {cal.actionAgreements && (
                    <div className="text-xs text-emerald-700 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
                      <strong className="text-emerald-900">Acuerdos: </strong>
                      <span>{cal.actionAgreements}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: REPORTES & ANALÍTICA 90 DÍAS */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          <OjtTtpSection
            checklists={checklists}
            calibrations={calibrations}
          />
        </div>
      )}

      {/* Modals */}
      {isChecklistModalOpen && (
        <OjtChecklistModal
          initialChecklist={editingChecklist}
          participants={participants}
          currentUser={currentUser}
          companies={companies}
          onClose={() => {
            setIsChecklistModalOpen(false);
            setEditingChecklist(null);
          }}
          onSave={onSaveChecklist}
          onShowToast={onShowToast}
        />
      )}

      {isCalibrationModalOpen && (
        <CalibrationModal
          calibrations={calibrations}
          currentUser={currentUser}
          companies={companies}
          onClose={() => setIsCalibrationModalOpen(false)}
          onSaveCalibration={onSaveCalibration}
          onShowToast={onShowToast}
        />
      )}

    </div>
  );
};
