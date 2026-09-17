import React, { useState, useMemo } from 'react';
import { 
  X, 
  Award, 
  BarChart3, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  Download, 
  Layers, 
  BookOpen, 
  Percent, 
  ChevronRight, 
  Calendar,
  Sparkles,
  HelpCircle,
  Filter
} from 'lucide-react';
import { 
  TrainingProgram, 
  TrainingEvent, 
  Participant, 
  ParticipantGroup, 
  ProgramComplianceSummary, 
  ComplianceStatus 
} from '../../types';
import { apiService } from '../../services/api';
import { exportComplianceReportToExcel } from '../../utils/excelUtils';
import { getGroupColorTheme } from './GroupsManager';
import { formatDateLong } from '../../utils/formatters';
import { ComplianceReminderModal } from './ComplianceReminderModal';
import { Send } from 'lucide-react';
import { AccessibleModal } from '../common/AccessibleModal';

interface ComplianceTrackerModalProps {
  program: TrainingProgram;
  events: TrainingEvent[];
  participants: Participant[];
  groups: ParticipantGroup[];
  onClose: () => void;
  onSendNotification?: (eventId: string, channel: 'Email' | 'Teams' | 'WhatsApp', message: string, recipients: number) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const ComplianceTrackerModal: React.FC<ComplianceTrackerModalProps> = ({
  program,
  events,
  participants,
  groups,
  onClose,
  onSendNotification,
  onShowToast
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

  // Calcular la matriz de cumplimiento dinámicamente
  const complianceSummary: ProgramComplianceSummary = useMemo(() => {
    return apiService.calculateProgramCompliance(program, events, participants, groups);
  }, [program, events, participants, groups]);

  // Mapa de eventos para acceder rápido a los títulos
  const eventsMap = useMemo(() => {
    return new Map(events.map(e => [e.id, e]));
  }, [events]);

  // Filtrar participantes según grupo, estado y búsqueda
  const filteredParticipants = useMemo(() => {
    return complianceSummary.participants.filter(p => {
      // 1. Filtro por grupo
      if (selectedGroupId !== 'all') {
        const group = groups.find(g => g.id === selectedGroupId);
        if (!group || !group.memberCards.includes(p.participantCard)) {
          return false;
        }
      }

      // 2. Filtro por estatus
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }

      // 3. Filtro por búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.participantName.toLowerCase().includes(q);
        const matchesCard = p.participantCard.includes(q);
        const matchesEmail = p.participantEmail.toLowerCase().includes(q);
        const matchesCedula = p.participantCedula && p.participantCedula.includes(q);
        if (!matchesName && !matchesCard && !matchesEmail && !matchesCedula) {
          return false;
        }
      }

      return true;
    });
  }, [complianceSummary, selectedGroupId, statusFilter, searchQuery, groups]);

  const handleExportExcel = () => {
    try {
      exportComplianceReportToExcel(complianceSummary, events);
      onShowToast('Reporte exportado', 'El reporte de cumplimiento se ha descargado en Excel.', 'success');
    } catch (err: any) {
      onShowToast('Error al exportar', err.message || 'No se pudo generar el archivo Excel.', 'error');
    }
  };

  const getStatusBadge = (status: ComplianceStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> CUMPLIDO
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3" /> EN PROGRESO
          </span>
        );
      case 'overdue':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> ATRASADO
          </span>
        );
      case 'not_started':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
            <HelpCircle className="w-3 h-3" /> NO INICIADO
          </span>
        );
    }
  };

  return (
    <AccessibleModal
      onClose={onClose}
      ariaLabel="Monitor de Cumplimiento de Programa"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 p-0.5 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-[#DA291C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 line-clamp-1">{program.title}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  program.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  {program.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Periodo: <span className="text-slate-800 font-bold">{formatDateLong(program.startDate)}</span> al <span className="text-slate-800 font-bold">{formatDateLong(program.endDate)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setIsReminderModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar Recordatorios</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-2 border border-slate-300 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Excel</span>
            </button>
            
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            
            {/* Global Percentage */}
            <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#DA291C]">Avance General</span>
                <Percent className="w-4 h-4 text-[#DA291C]" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {complianceSummary.overallPercentage}%
              </p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                <div 
                  className="bg-[#DA291C] h-full rounded-full transition-all duration-500"
                  style={{ width: `${complianceSummary.overallPercentage}%` }}
                />
              </div>
            </div>

            {/* Total Assigned */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Total Asignados</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {complianceSummary.totalParticipants}
              </p>
              <span className="text-[10px] text-slate-500 font-semibold">Colaboradores</span>
            </div>

            {/* Completed */}
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-700">Cumplidos</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {complianceSummary.completedCount}
              </p>
              <span className="text-[10px] text-emerald-600 font-bold">100% Cursos Aprobados</span>
            </div>

            {/* In Progress */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-700">En Progreso</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-700 mt-1">
                {complianceSummary.inProgressCount}
              </p>
              <span className="text-[10px] text-amber-600 font-bold">Cursos pendientes</span>
            </div>

            {/* Overdue */}
            <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-700">Atrasados / Riesgo</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-black text-rose-700 mt-1">
                {complianceSummary.overdueCount}
              </p>
              <span className="text-[10px] text-rose-600 font-bold">Plazo vencido</span>
            </div>

          </div>

          {/* Group Progress Pills */}
          {complianceSummary.groupStats.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <span className="text-xs font-black text-slate-800 mb-3 block">
                Cumplimiento Promedio por Grupo / Área:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {complianceSummary.groupStats.map(g => {
                  const theme = getGroupColorTheme(g.groupColor);
                  return (
                    <div 
                      key={g.groupId}
                      onClick={() => setSelectedGroupId(selectedGroupId === g.groupId ? 'all' : g.groupId)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedGroupId === g.groupId
                          ? 'bg-red-50 border-[#DA291C] ring-2 ring-red-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-black text-slate-900 line-clamp-1">{g.groupName}</span>
                        <span className="font-black text-[#DA291C]">{g.averagePercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all bg-[#DA291C]"
                          style={{ width: `${g.averagePercentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mt-1.5">
                        <span>{g.completedMembers} de {g.totalMembers} completaron</span>
                        <span className="font-bold">{selectedGroupId === g.groupId ? 'Filtrado' : 'Clic para filtrar'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute inset-y-0 left-3 my-auto" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por colaborador, tarjeta, cédula o correo..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
              />
            </div>

            {/* Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              
              {/* Group filter */}
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#DA291C]"
              >
                <option value="all">Todos los Grupos ({complianceSummary.groupStats.length})</option>
                {complianceSummary.groupStats.map(g => (
                  <option key={g.groupId} value={g.groupId}>
                    {g.groupName} ({g.totalMembers})
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#DA291C]"
              >
                <option value="all">Todos los Estados</option>
                <option value="completed">Cumplidos (100%)</option>
                <option value="in_progress">En Progreso</option>
                <option value="overdue">Atrasados</option>
                <option value="not_started">No Iniciados</option>
              </select>

            </div>

          </div>

          {/* Interactive Compliance Matrix Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                    <th className="p-3.5">Colaborador / ID</th>
                    <th className="p-3.5">Grupos</th>
                    <th className="p-3.5 text-center">% Cumplimiento</th>
                    <th className="p-3.5 text-center">Estatus</th>
                    {/* Column for each course in the program */}
                    {program.eventItems.map((item, idx) => {
                      const evt = eventsMap.get(item.eventId);
                      return (
                        <th key={item.eventId} className="p-3.5 font-bold min-w-[160px]">
                          <div className="flex flex-col">
                            <span className="text-slate-900 line-clamp-1">{evt?.title || `Curso ${idx + 1}`}</span>
                            <span className="text-[10px] text-[#DA291C] font-bold">
                              {item.isMandatory ? '★ Obligatorio' : 'Opcional'}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={4 + program.eventItems.length} className="p-8 text-center text-slate-500">
                        No se encontraron colaboradores con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map(participant => (
                      <tr key={participant.participantCard} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Participant Info */}
                        <td className="p-3.5">
                          <div className="font-black text-slate-900">{participant.participantName}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="text-[#DA291C] font-mono font-bold">ID: {participant.participantCard}</span>
                            {participant.participantCedula && (
                              <span>• Cédula: {participant.participantCedula}</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{participant.participantEmail}</div>
                        </td>

                        {/* Groups */}
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1">
                            {participant.groupNames.length > 0 ? (
                              participant.groupNames.map((gName, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {gName}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">Asignación directa</span>
                            )}
                          </div>
                        </td>

                        {/* Progress Bar & Percentage */}
                        <td className="p-3.5 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-black text-slate-900 text-xs">{participant.percentage}%</span>
                            <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                              <div 
                                className={`h-full rounded-full ${
                                  participant.percentage === 100 ? 'bg-emerald-600' : participant.percentage > 0 ? 'bg-[#DA291C]' : 'bg-slate-400'
                                }`}
                                style={{ width: `${participant.percentage}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              {participant.mandatoryCompletedCount}/{participant.mandatoryEventsCount} obligatorios
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="p-3.5 text-center">
                          <div className="flex justify-center">
                            {getStatusBadge(participant.status)}
                          </div>
                        </td>

                        {/* Course by Course Breakdown */}
                        {participant.eventsDetail.map((detail, idx) => (
                          <td key={idx} className="p-3.5">
                            {detail.status === 'attended' ? (
                              <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                                <div className="text-[11px] leading-tight">
                                  <div className="font-bold">Asistió</div>
                                  {detail.attendedDate && (
                                    <div className="text-[9px] text-emerald-600 font-medium">{detail.attendedDate}</div>
                                  )}
                                </div>
                              </div>
                            ) : detail.status === 'registered' ? (
                              <div className="flex items-center gap-1.5 text-[#DA291C] bg-red-50 px-2.5 py-1.5 rounded-xl border border-red-200">
                                <Calendar className="w-4 h-4 shrink-0" />
                                <div className="text-[11px] leading-tight">
                                  <div className="font-bold">Agendado</div>
                                  <div className="text-[9px] text-[#DA291C] font-semibold">
                                    {detail.registeredDate} {detail.registeredTime}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                                <Clock className="w-4 h-4 shrink-0" />
                                <div className="text-[11px] font-semibold leading-tight">
                                  <span>Pendiente</span>
                                </div>
                              </div>
                            )}
                          </td>
                        ))}

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 border-t border-slate-200 text-xs text-slate-500 font-medium flex justify-between bg-slate-50">
              <span>Mostrando {filteredParticipants.length} de {complianceSummary.totalParticipants} participantes</span>
              <span>Cronograma: <strong className="text-slate-800">{program.title}</strong></span>
            </div>
          </div>

        </div>

      </div>

      {/* Reminder Modal */}
      {isReminderModalOpen && (
        <ComplianceReminderModal
          program={program}
          complianceSummary={complianceSummary}
          events={events}
          isOpen={isReminderModalOpen}
          onClose={() => setIsReminderModalOpen(false)}
          onSendNotification={onSendNotification}
          onShowToast={onShowToast}
        />
      )}
    </AccessibleModal>
  );
};
