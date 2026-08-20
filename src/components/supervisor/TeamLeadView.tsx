import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Download, 
  Bell, 
  Send, 
  ExternalLink, 
  Mail, 
  MessageSquare, 
  Building, 
  Sparkles,
  TrendingUp,
  Award,
  ChevronRight,
  ShieldCheck,
  Filter,
  Check,
  UserCheck,
  Layers,
  BookOpen
} from 'lucide-react';
import { 
  UserAccount, 
  TrainingEvent, 
  Participant, 
  ParticipantGroup, 
  TrainingProgram, 
  ParticipantComplianceDetail,
  ComplianceStatus 
} from '../../types';
import { apiService } from '../../services/api';
import { exportComplianceReportToExcel } from '../../utils/excelUtils';
import { ComplianceReminderModal } from '../admin/ComplianceReminderModal';

interface TeamLeadViewProps {
  currentUser: UserAccount;
  users?: UserAccount[];
  events: TrainingEvent[];
  participants: Participant[];
  groups: ParticipantGroup[];
  programs: TrainingProgram[];
  onSendNotification: (eventId: string, channel: 'Email' | 'Teams' | 'WhatsApp', message: string, recipients: number) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const TeamLeadView: React.FC<TeamLeadViewProps> = ({
  currentUser,
  users = [],
  events,
  participants,
  groups,
  programs,
  onSendNotification,
  onShowToast
}) => {
  const isFullAdmin = currentUser.role === 'Super Administrador' || currentUser.role === 'Administrador / Editor';

  // Lista de supervisores disponibles en el sistema
  const availableSupervisors = useMemo(() => {
    return users.filter(u => 
      u.role === 'Líder de Área / Supervisor' || 
      u.role === 'Super Administrador' || 
      u.role === 'Administrador / Editor'
    );
  }, [users]);

  // Si es Super Administrador, permitir seleccionar el supervisor a auditar (o ver general)
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>(() => {
    if (!isFullAdmin) return currentUser.id;
    // Si es admin, por defecto seleccionar el primer supervisor que tenga el rol específico o currentUser
    const firstLead = availableSupervisors.find(u => u.role === 'Líder de Área / Supervisor');
    return firstLead ? firstLead.id : currentUser.id;
  });

  // Supervisor efectivo bajo el cual se evalúa el equipo
  const effectiveSupervisor: UserAccount = useMemo(() => {
    if (!isFullAdmin) return currentUser;
    if (selectedSupervisorId === 'all') return currentUser;
    return availableSupervisors.find(u => u.id === selectedSupervisorId) || currentUser;
  }, [isFullAdmin, selectedSupervisorId, availableSupervisors, currentUser]);

  // --- RESOLUCIÓN JERÁRQUICA DE COLABORADORES ---
  const {
    directlyAssignedCards,
    deptAssignedCards,
    groupAssignedCards,
    allTeamCards,
    supervisedGroups
  } = useMemo(() => {
    const direct = new Set<string>(effectiveSupervisor.assignedMemberCards || []);
    const dept = new Set<string>();
    const grpCards = new Set<string>();

    const targetSupervisorName = effectiveSupervisor.name?.trim().toLowerCase();
    const targetSupervisorEmail = effectiveSupervisor.email?.trim().toLowerCase();
    const targetSupervisorDept = effectiveSupervisor.department?.trim().toLowerCase();

    // 1. Direct assignments in participants
    participants.forEach(p => {
      const pSuperId = p.supervisorId?.trim().toLowerCase();
      const pSuperName = p.supervisorName?.trim().toLowerCase();

      if (
        p.supervisorId === effectiveSupervisor.id ||
        (targetSupervisorEmail && pSuperId === targetSupervisorEmail) ||
        (targetSupervisorName && pSuperName === targetSupervisorName)
      ) {
        direct.add(p.card);
      }

      // 2. Department match
      if (targetSupervisorDept && p.department && p.department.trim().toLowerCase() === targetSupervisorDept) {
        dept.add(p.card);
      }
    });

    // 3. Groups match
    let matchedGroups: ParticipantGroup[] = [];
    if (effectiveSupervisor.assignedGroupIds && effectiveSupervisor.assignedGroupIds.length > 0) {
      matchedGroups = groups.filter(g => effectiveSupervisor.assignedGroupIds!.includes(g.id));
    } else if (targetSupervisorDept) {
      matchedGroups = groups.filter(g => 
        (g.department && g.department.trim().toLowerCase() === targetSupervisorDept) ||
        g.name.toLowerCase().includes(targetSupervisorDept)
      );
    }
    if (matchedGroups.length === 0 && groups.length > 0) {
      matchedGroups = groups.slice(0, 1);
    }

    matchedGroups.forEach(g => {
      g.memberCards.forEach(c => grpCards.add(c));
    });

    // Unión total
    const total = new Set<string>();
    direct.forEach(c => total.add(c));
    dept.forEach(c => total.add(c));
    grpCards.forEach(c => total.add(c));

    // Si es Super Admin viendo todo el padrón general
    if (isFullAdmin && selectedSupervisorId === 'all') {
      participants.forEach(p => total.add(p.card));
    }

    return {
      directlyAssignedCards: direct,
      deptAssignedCards: dept,
      groupAssignedCards: grpCards,
      allTeamCards: total,
      supervisedGroups: matchedGroups
    };
  }, [effectiveSupervisor, participants, groups, isFullAdmin, selectedSupervisorId]);

  // Sub-filtro de alcance del equipo
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [selectedProgramId, setSelectedProgramId] = useState<string>(programs[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'overdue' | 'not_started'>('all');
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'program' | 'global'>('program');

  // Tarjetas activas según el sub-filtro de alcance seleccionado
  const activeScopeCards = useMemo(() => {
    if (selectedScope === 'direct') return directlyAssignedCards;
    if (selectedScope === 'dept') return deptAssignedCards;
    if (selectedScope.startsWith('grp_')) {
      const grpId = selectedScope.replace('grp_', '');
      const grp = groups.find(g => g.id === grpId);
      return new Set(grp ? grp.memberCards : []);
    }
    return allTeamCards;
  }, [selectedScope, directlyAssignedCards, deptAssignedCards, allTeamCards, groups]);

  // Determinar programa activo
  const activeProgram = programs.find(p => p.id === selectedProgramId) || programs[0];

  // Calcular cumplimiento del programa seleccionado (incluyendo a todo el equipo)
  const complianceSummary = useMemo(() => {
    if (!activeProgram) return null;
    return apiService.calculateProgramCompliance(activeProgram, events, participants, groups, true);
  }, [activeProgram, events, participants, groups]);

  // Mapa de eventos para consulta rápida
  const eventsMap = useMemo(() => new Map(events.map(e => [e.id, e])), [events]);

  // Participantes del equipo filtrados
  const teamParticipantsCompliance = useMemo(() => {
    if (!complianceSummary) return [];
    return complianceSummary.participants.filter(p => {
      // Pertenece al alcance del equipo
      if (!activeScopeCards.has(p.participantCard)) return false;

      // Filtro de búsqueda
      const q = searchQuery.toLowerCase();
      const matchQuery = 
        p.participantName.toLowerCase().includes(q) ||
        p.participantEmail.toLowerCase().includes(q) ||
        p.participantCard.toLowerCase().includes(q) ||
        (p.participantCedula && p.participantCedula.includes(q));
      if (!matchQuery) return false;

      // Filtro de estado
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      return true;
    });
  }, [complianceSummary, activeScopeCards, searchQuery, statusFilter]);

  // Métricas del equipo para este programa
  const {
    totalTeamMembers,
    completedTeamMembers,
    inProgressTeamMembers,
    overdueTeamMembers,
    notStartedTeamMembers,
    avgTeamPercentage
  } = useMemo(() => {
    if (!complianceSummary) {
      return { totalTeamMembers: 0, completedTeamMembers: 0, inProgressTeamMembers: 0, overdueTeamMembers: 0, notStartedTeamMembers: 0, avgTeamPercentage: 0 };
    }

    const allInTeam = complianceSummary.participants.filter(p => activeScopeCards.has(p.participantCard));
    const total = allInTeam.length;
    if (total === 0) {
      return { totalTeamMembers: 0, completedTeamMembers: 0, inProgressTeamMembers: 0, overdueTeamMembers: 0, notStartedTeamMembers: 0, avgTeamPercentage: 0 };
    }

    const completed = allInTeam.filter(p => p.status === 'completed').length;
    const inProgress = allInTeam.filter(p => p.status === 'in_progress').length;
    const overdue = allInTeam.filter(p => p.status === 'overdue').length;
    const notStarted = allInTeam.filter(p => p.status === 'not_started').length;
    const avg = Math.round(allInTeam.reduce((acc, curr) => acc + curr.percentage, 0) / total);

    return {
      totalTeamMembers: total,
      completedTeamMembers: completed,
      inProgressTeamMembers: inProgress,
      overdueTeamMembers: overdue,
      notStartedTeamMembers: notStarted,
      avgTeamPercentage: avg
    };
  }, [complianceSummary, activeScopeCards]);

  // Lista de participantes en riesgo (atrasados o con menos de 50%)
  const atRiskTeamMembers = useMemo(() => {
    return teamParticipantsCompliance.filter(p => p.status === 'overdue' || (p.status === 'in_progress' && p.percentage < 50));
  }, [teamParticipantsCompliance]);

  // --- HISTORIAL GLOBAL DE PARTICIPACIONES DEL EQUIPO ---
  const globalTeamStats = useMemo(() => {
    return Array.from(activeScopeCards).map(card => {
      const p = participants.find(part => part.card === card);
      if (!p) return null;

      const pEmail = p.email.toLowerCase();
      let attendedCount = 0;
      let registeredFutureCount = 0;
      let totalHours = 0;
      const attendedEventsList: { title: string; date: string; hours: number }[] = [];

      events.forEach(evt => {
        let wasAttended = false;
        let wasRegistered = false;

        evt.schedule.forEach(sch => {
          sch.slots.forEach(slot => {
            const inAttended = (slot.attendedList || []).map(a => a.toLowerCase()).includes(pEmail);
            const inAttendees = slot.attendees.map(a => a.toLowerCase()).includes(pEmail);

            if (inAttended) {
              wasAttended = true;
              attendedEventsList.push({
                title: evt.title,
                date: sch.date,
                hours: 2
              });
            } else if (inAttendees) {
              wasRegistered = true;
            }
          });
        });

        if (wasAttended) {
          attendedCount++;
          totalHours += 2;
        } else if (wasRegistered) {
          registeredFutureCount++;
        }
      });

      // Determinar badge de tipo de vinculación con el supervisor
      const isDirect = directlyAssignedCards.has(card);
      const isDept = deptAssignedCards.has(card);

      return {
        card: p.card,
        name: p.name,
        email: p.email,
        cedula: p.cedula,
        department: p.department || effectiveSupervisor.department || 'General',
        supervisorName: p.supervisorName || effectiveSupervisor.name,
        isDirect,
        isDept,
        attendedCount,
        registeredFutureCount,
        totalHours,
        attendedEventsList
      };
    }).filter(Boolean);
  }, [activeScopeCards, participants, events, directlyAssignedCards, deptAssignedCards, effectiveSupervisor]);

  const handleExportTeamExcel = () => {
    if (!activeProgram || !complianceSummary) return;
    exportComplianceReportToExcel(complianceSummary, events);
    onShowToast('Reporte exportado', `Se descargó el reporte de cumplimiento de ${activeProgram.title}.`, 'success');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 p-0.5 shadow-lg shadow-emerald-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Users className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-black text-white tracking-tight">Portal de Mi Equipo & Cumplimiento</h2>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                Líder de Área
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Supervisando como: <strong className="text-white">{effectiveSupervisor.name}</strong> 
              {effectiveSupervisor.department && <span> • Área: <strong className="text-indigo-300">{effectiveSupervisor.department}</strong></span>}
            </p>
          </div>
        </div>

        {/* Action Controls & Selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          {/* Selector de Supervisor para Administradores */}
          {isFullAdmin && availableSupervisors.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 whitespace-nowrap">Supervisor:</span>
              <select
                value={selectedSupervisorId}
                onChange={(e) => setSelectedSupervisorId(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-400"
              >
                <option value="all">🏢 Todo el Padrón General ({participants.length})</option>
                {availableSupervisors.map(s => (
                  <option key={s.id} value={s.id}>
                    👤 {s.name} ({s.department || 'Sin Depto'} • {s.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sub-filtro de Alcance */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">Alcance:</span>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">👥 Todo el Equipo ({allTeamCards.size})</option>
              {directlyAssignedCards.size > 0 && (
                <option value="direct">⭐ Asignados Directamente ({directlyAssignedCards.size})</option>
              )}
              {deptAssignedCards.size > 0 && (
                <option value="dept">🏢 Depto: {effectiveSupervisor.department} ({deptAssignedCards.size})</option>
              )}
              {supervisedGroups.map(g => (
                <option key={g.id} value={`grp_${g.id}`}>📁 Grupo: {g.name} ({g.memberCards.length})</option>
              ))}
            </select>
          </div>

          {/* Selector de Cronograma Formativo */}
          {programs.length > 0 && viewMode === 'program' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 whitespace-nowrap">Cronograma:</span>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          )}

        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('program')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              viewMode === 'program'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cumplimiento por Cronograma ({activeProgram?.title || 'General'})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('global')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              viewMode === 'global'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Historial Global de Participaciones ({allTeamCards.size} Colaboradores)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'program' && (
            <button
              type="button"
              onClick={handleExportTeamExcel}
              className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsReminderModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar Recordatorio al Equipo</span>
          </button>
        </div>
      </div>

      {/* Team KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI 1: Total Colaboradores */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total en mi Equipo</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-2">{totalTeamMembers}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            ⭐ {directlyAssignedCards.size} asignados directamente
          </p>
        </div>

        {/* KPI 2: % Cumplimiento Promedio */}
        <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400">Avance Promedio</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-black text-emerald-300">{avgTeamPercentage}%</p>
            <span className="text-[10px] text-emerald-400 font-semibold">cumplimiento</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 overflow-hidden border border-emerald-500/20">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${avgTeamPercentage}%` }} 
            />
          </div>
        </div>

        {/* KPI 3: Al Día (100%) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Al Día (100%)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-2">{completedTeamMembers}</p>
          <p className="text-[11px] text-slate-400 mt-1">Completaron todos los cursos</p>
        </div>

        {/* KPI 4: En Progreso */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">En Progreso</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-cyan-400 mt-2">{inProgressTeamMembers}</p>
          <p className="text-[11px] text-slate-400 mt-1">Cursos en curso o agendados</p>
        </div>

        {/* KPI 5: Atrasados / En Riesgo */}
        <div className="bg-gradient-to-br from-rose-950/40 to-slate-900 border border-rose-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400">Atrasados / Riesgo</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-400 mt-2">{overdueTeamMembers}</p>
          <p className="text-[11px] text-rose-300 mt-1">Requieren atención</p>
        </div>

      </div>

      {/* VIEW MODE A: CUMPLIMIENTO POR CRONOGRAMA */}
      {viewMode === 'program' && (
        <div className="space-y-6">
          
          {/* Action and Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute inset-y-0 left-3.5 my-auto" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, tarjeta, cédula o correo..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'completed', label: 'Al Día', count: completedTeamMembers },
                { id: 'in_progress', label: 'En Progreso', count: inProgressTeamMembers },
                { id: 'overdue', label: 'Atrasados', count: overdueTeamMembers },
                { id: 'not_started', label: 'Sin Iniciar', count: notStartedTeamMembers }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    statusFilter === f.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{f.label}</span>
                  {f.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      statusFilter === f.id ? 'bg-indigo-700 text-white' : 'bg-slate-900 text-slate-400'
                    }`}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

          </div>

          {/* Main Matrix Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                    <th className="p-4 font-semibold">Colaborador</th>
                    <th className="p-4 font-semibold">Tarjeta / Cédula</th>
                    <th className="p-4 font-semibold">Departamento</th>
                    <th className="p-4 font-semibold">Avance (% y Cursos)</th>
                    <th className="p-4 font-semibold">Estatus</th>
                    <th className="p-4 font-semibold">Desglose de Cursos</th>
                    <th className="p-4 font-semibold text-right">Contacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {teamParticipantsCompliance.map((p) => {
                    const isDirect = directlyAssignedCards.has(p.participantCard);

                    return (
                      <tr key={p.participantCard} className="hover:bg-slate-800/20 transition-colors">
                        
                        {/* Colaborador */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                              {p.participantName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white truncate">{p.participantName}</span>
                                {isDirect && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                    ⭐ Asignado
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">{p.participantEmail}</p>
                            </div>
                          </div>
                        </td>

                        {/* Tarjeta y Cédula */}
                        <td className="p-4 font-mono text-[11px]">
                          <div className="space-y-0.5">
                            <span className="font-bold text-indigo-400">#{p.participantCard}</span>
                            {p.participantCedula && (
                              <p className="text-[10px] text-slate-500">{p.participantCedula}</p>
                            )}
                          </div>
                        </td>

                        {/* Departamento */}
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800 text-[11px]">
                            {effectiveSupervisor.department || 'General'}
                          </span>
                        </td>

                        {/* Avance */}
                        <td className="p-4">
                          <div className="space-y-1.5 w-36">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-white">{p.percentage}%</span>
                              <span className="text-slate-400 text-[10px]">{p.completedEventsCount}/{p.totalAssignedEvents}</span>
                            </div>
                            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  p.percentage === 100
                                    ? 'bg-emerald-500'
                                    : p.percentage >= 50
                                    ? 'bg-cyan-500'
                                    : p.percentage > 0
                                    ? 'bg-amber-500'
                                    : 'bg-slate-700'
                                }`}
                                style={{ width: `${p.percentage}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Estatus */}
                        <td className="p-4">
                          {p.status === 'completed' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" />
                              Al Día (100%)
                            </span>
                          )}
                          {p.status === 'in_progress' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3" />
                              En Progreso
                            </span>
                          )}
                          {p.status === 'overdue' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-fit animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              Atrasado
                            </span>
                          )}
                          {p.status === 'not_started' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 w-fit">
                              Sin Iniciar
                            </span>
                          )}
                        </td>

                        {/* Desglose de Cursos */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                            {p.eventsDetail.map((ed) => {
                              const evtObj = eventsMap.get(ed.eventId);
                              const evtTitle = evtObj ? evtObj.title : 'Capacitación';

                              return (
                                <span
                                  key={ed.eventId}
                                  title={`${evtTitle}: ${ed.status === 'attended' ? 'Asistió' : ed.status === 'registered' ? 'Inscrito' : 'Pendiente'}`}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                                    ed.status === 'attended'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : ed.status === 'registered'
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                                  }`}
                                >
                                  {ed.status === 'attended' ? '✓' : ed.status === 'registered' ? '📅' : '○'}
                                  <span className="line-clamp-1 max-w-[90px]">{evtTitle}</span>
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Contacto Directo */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`mailto:${p.participantEmail}?subject=Recordatorio%20de%20Capacitaci%C3%B3n%20-%20${encodeURIComponent(activeProgram?.title || 'CapacitaHub')}&body=Hola%20${encodeURIComponent(p.participantName)},%20te%20recordamos%20que%20tienes%20capacitaciones%20pendientes%20en%20el%20cronograma%20institucional.`}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                              title="Enviar correo individual"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>

                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(`Hola ${p.participantName}, te escribo para recordarte que tienes capacitaciones pendientes en el cronograma "${activeProgram?.title || 'CapacitaHub'}". Por favor revisa tu avance en la plataforma.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title="Enviar WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex justify-between bg-slate-950/40">
              <span>Mostrando {teamParticipantsCompliance.length} de {activeScopeCards.size} colaboradores supervisados</span>
              <span>Cronograma: {activeProgram?.title || 'N/A'}</span>
            </div>
          </div>

        </div>
      )}

      {/* VIEW MODE B: HISTORIAL GLOBAL DE PARTICIPACIONES */}
      {viewMode === 'global' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Historial Consolidado de Asistencias & Horas del Equipo</h3>
                <p className="text-xs text-slate-400 mt-0.5">Todas las capacitaciones acumuladas en la empresa</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {globalTeamStats.length} Colaboradores
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                    <th className="p-4 font-semibold">Colaborador</th>
                    <th className="p-4 font-semibold">Tarjeta / Cédula</th>
                    <th className="p-4 font-semibold">Departamento</th>
                    <th className="p-4 font-semibold">Asistencias QR</th>
                    <th className="p-4 font-semibold">Horas Acumuladas</th>
                    <th className="p-4 font-semibold">Próximos Cursos</th>
                    <th className="p-4 font-semibold text-right">Contacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {globalTeamStats.map((item: any) => (
                    <tr key={item.card} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {item.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{item.name}</span>
                              {item.isDirect && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  ⭐ Asignado
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">{item.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-mono text-[11px]">
                        <span className="font-bold text-indigo-400">#{item.card}</span>
                        {item.cedula && <p className="text-[10px] text-slate-500">{item.cedula}</p>}
                      </td>

                      <td className="p-4 text-slate-300">
                        <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800 text-[11px]">
                          {item.department}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {item.attendedCount} cursos completados
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="font-bold text-white text-xs">{item.totalHours} hrs</span>
                      </td>

                      <td className="p-4 text-slate-400">
                        {item.registeredFutureCount > 0 ? (
                          <span className="text-cyan-400 font-semibold">{item.registeredFutureCount} agendados</span>
                        ) : (
                          <span className="text-slate-500 italic">Ninguno agendado</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`mailto:${item.email}?subject=Capacitaciones%20Corporativas`}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(`Hola ${item.name}, te contacto desde la supervisión de capacitaciones de tu área.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Compliance Reminder Modal */}
      {isReminderModalOpen && activeProgram && complianceSummary && (
        <ComplianceReminderModal
          program={activeProgram}
          complianceSummary={complianceSummary}
          events={events}
          isOpen={isReminderModalOpen}
          onClose={() => setIsReminderModalOpen(false)}
          onSendNotification={onSendNotification}
          onShowToast={onShowToast}
        />
      )}

    </div>
  );
};
