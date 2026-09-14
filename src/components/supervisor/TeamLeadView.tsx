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
  ShieldAlert,
  Filter,
  Check,
  UserCheck,
  Layers,
  BookOpen,
  Trash2,
  Lock,
  UserPlus,
  GraduationCap,
  Target,
  RefreshCw
} from 'lucide-react';
import { 
  UserAccount, 
  TrainingEvent, 
  Participant, 
  ParticipantGroup, 
  TrainingProgram, 
  ParticipantComplianceDetail,
  ComplianceStatus,
  Schedule,
  Slot,
  ParticipantGrade,
  Company,
  TechnicalAcademyHistoryRecord
} from '../../types';
import { apiService } from '../../services/api';
import { exportComplianceReportToExcel, exportSkillsGapReportToExcel } from '../../utils/excelUtils';
import { ComplianceReminderModal } from '../admin/ComplianceReminderModal';
import { TeamAssignmentModal } from './TeamAssignmentModal';
import { ParticipantProfileModal } from '../admin/ParticipantProfileModal';

interface TeamLeadViewProps {
  currentUser: UserAccount;
  users?: UserAccount[];
  events: TrainingEvent[];
  participants: Participant[];
  groups: ParticipantGroup[];
  programs: TrainingProgram[];
  companies?: Company[];
  technicalHistory?: TechnicalAcademyHistoryRecord[];
  onAssignTeamMembers?: (payload: any) => Promise<any>;
  onCancelRegistration?: (eventId: string, date: string, time: string, email: string, isSupervisorOrAdmin?: boolean, force?: boolean) => Promise<void>;
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
  companies = [],
  technicalHistory = [],
  onAssignTeamMembers,
  onCancelRegistration,
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

  // --- RESOLUCIÓN JERÁRQUICA ESTRICTA DE COLABORADORES CON AISLAMIENTO DE EMPRESA ---
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
    const supervisorCompany = effectiveSupervisor.companyId || 'emp_kasino';

    // 1. Asignaciones directas en el padrón de participantes
    participants.forEach(p => {
      const pCompany = p.companyId || 'emp_kasino';
      // Aislamiento estricto de empresa si no es Super Admin
      if (!isFullAdmin && pCompany !== supervisorCompany) {
        return;
      }

      const pSuperId = p.supervisorId?.trim().toLowerCase();
      const pSuperName = p.supervisorName?.trim().toLowerCase();

      if (
        (p.supervisorId && p.supervisorId === effectiveSupervisor.id) ||
        (targetSupervisorEmail && pSuperId && pSuperId === targetSupervisorEmail) ||
        (targetSupervisorName && pSuperName && pSuperName === targetSupervisorName)
      ) {
        direct.add(p.card);
      }

      // 2. Coincidencia por Departamento (únicamente si el supervisor tiene depto asignado y no está vacío)
      if (targetSupervisorDept && p.department && p.department.trim().toLowerCase() === targetSupervisorDept) {
        dept.add(p.card);
      }
    });

    // 3. Coincidencia por Grupos asignados explícitamente o por departamento
    let matchedGroups: ParticipantGroup[] = [];
    if (effectiveSupervisor.assignedGroupIds && effectiveSupervisor.assignedGroupIds.length > 0) {
      matchedGroups = groups.filter(g => effectiveSupervisor.assignedGroupIds!.includes(g.id));
    } else if (targetSupervisorDept) {
      matchedGroups = groups.filter(g => 
        (g.department && g.department.trim().toLowerCase() === targetSupervisorDept) ||
        g.name.toLowerCase().includes(targetSupervisorDept)
      );
    }

    matchedGroups.forEach(g => {
      g.memberCards.forEach(c => grpCards.add(c));
    });

    // Unión total estricta
    const total = new Set<string>();
    direct.forEach(c => total.add(c));
    dept.forEach(c => total.add(c));
    grpCards.forEach(c => total.add(c));

    // Si es Super Admin o Administrador viendo explícitamente todo el padrón general
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
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [viewingProfileParticipant, setViewingProfileParticipant] = useState<Participant | null>(null);
  const [viewMode, setViewMode] = useState<'program' | 'global' | 'assignments' | 'skills'>('program');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentFilterType, setAssignmentFilterType] = useState<'all' | 'mandatory' | 'voluntary'>('all');
  const [skillsFilterStatus, setSkillsFilterStatus] = useState<'all' | 'needs_retraining' | 'failed' | 'passed'>('all');

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

  // Análisis de Calificaciones y Detección de Debilidades del Equipo
  const teamGradesAnalysis = useMemo(() => {
    const allGrades: Array<ParticipantGrade & { eventTitle: string; category: string; passingScore: number }> = [];
    const skillGapsCountMap: Record<string, { count: number; affectedParticipants: Set<string> }> = {};
    const participantMap: Record<string, {
      participant: Participant;
      grades: Array<ParticipantGrade & { eventTitle: string; category: string }>;
      avgScore: number;
      passedCount: number;
      failedCount: number;
      allGaps: Set<string>;
      needsRetraining: boolean;
    }> = {};

    // Inicializar mapa de participantes del equipo
    participants.forEach(p => {
      if (activeScopeCards.has(p.card)) {
        participantMap[p.card] = {
          participant: p,
          grades: [],
          avgScore: 0,
          passedCount: 0,
          failedCount: 0,
          allGaps: new Set<string>(),
          needsRetraining: false
        };
      }
    });

    events.forEach(evt => {
      (evt.grades || []).forEach(g => {
        if (activeScopeCards.has(g.participantCard)) {
          const enriched = {
            ...g,
            eventTitle: evt.title,
            category: evt.category,
            passingScore: evt.passingScore || 70
          };
          allGrades.push(enriched);

          // Contabilizar brechas por habilidad
          (g.detectedSkillGaps || []).forEach(skill => {
            if (!skillGapsCountMap[skill]) {
              skillGapsCountMap[skill] = { count: 0, affectedParticipants: new Set() };
            }
            skillGapsCountMap[skill].count += 1;
            skillGapsCountMap[skill].affectedParticipants.add(g.participantCard);
          });

          // Agregar al mapa individual
          if (participantMap[g.participantCard]) {
            participantMap[g.participantCard].grades.push(enriched);
            if (g.academicStatus === 'passed') participantMap[g.participantCard].passedCount += 1;
            if (g.academicStatus === 'failed') participantMap[g.participantCard].failedCount += 1;
            if (g.needsRetraining) participantMap[g.participantCard].needsRetraining = true;
            (g.detectedSkillGaps || []).forEach(skill => participantMap[g.participantCard].allGaps.add(skill));
          }
        }
      });
    });

    // Calcular promedios por participante
    Object.values(participantMap).forEach(item => {
      const validScores = item.grades.filter(g => g.score !== null && g.score !== undefined);
      if (validScores.length > 0) {
        const sum = validScores.reduce((acc, curr) => acc + Number(curr.score), 0);
        item.avgScore = Number((sum / validScores.length).toFixed(1));
      }
    });

    // Top de brechas ordenadas
    const topGaps = Object.entries(skillGapsCountMap)
      .map(([skill, data]) => ({ skill, count: data.count, participantsCount: data.affectedParticipants.size }))
      .sort((a, b) => b.count - a.count);

    const gradedParticipants = Object.values(participantMap).filter(p => p.grades.length > 0);
    const totalGradesCount = allGrades.length;
    const totalPassed = allGrades.filter(g => g.academicStatus === 'passed').length;
    const totalFailed = allGrades.filter(g => g.academicStatus === 'failed').length;
    const totalMembersWithGaps = Object.values(participantMap).filter(p => p.allGaps.size > 0 || p.needsRetraining).length;
    
    const validAllScores = allGrades.filter(g => g.score !== null && g.score !== undefined);
    const overallTeamAvg = validAllScores.length > 0
      ? (validAllScores.reduce((acc, curr) => acc + Number(curr.score), 0) / validAllScores.length).toFixed(1)
      : '0.0';

    return {
      allGrades,
      topGaps,
      participantMap,
      gradedParticipants,
      totalGradesCount,
      totalPassed,
      totalFailed,
      totalMembersWithGaps,
      overallTeamAvg
    };
  }, [events, participants, activeScopeCards]);

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

      // Sumar capacitaciones recurrentes de la Academia Técnica
      const recurrents = (technicalHistory || []).filter(th => 
        (th.participantCard && th.participantCard === p.card) ||
        (th.participantEmail && th.participantEmail.toLowerCase() === pEmail)
      );

      recurrents.forEach(th => {
        const hrs = Number(th.hoursEarned || th.totalHours) || 0;
        if ((th.attendedDays || 0) > 0) {
          attendedCount++;
          totalHours += hrs;
          attendedEventsList.push({
            title: `${th.title} (${th.groupName || 'Taller Práctico'})`,
            date: th.endDate || th.startDate,
            hours: hrs
          });
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
        educationLevel: p.educationLevel,
        isCurrentlyStudying: p.isCurrentlyStudying,
        currentStudyField: p.currentStudyField,
        institutionName: p.institutionName,
        attendedCount,
        registeredFutureCount,
        totalHours,
        attendedEventsList
      };
    }).filter(Boolean);
  }, [activeScopeCards, participants, events, directlyAssignedCards, deptAssignedCards, effectiveSupervisor, technicalHistory]);

  // Lista efectiva de participantes en el alcance activo
  const effectiveTeamParticipants = useMemo(() => {
    return participants.filter(p => activeScopeCards.has(p.card));
  }, [participants, activeScopeCards]);

  // Lista de todas las asignaciones e inscripciones activas de los colaboradores del equipo
  const teamAssignmentsList = useMemo(() => {
    const list: {
      event: TrainingEvent;
      schedule: Schedule;
      slot: Slot;
      participant: Participant;
      isMandatory: boolean;
      assignedBy: string | null;
      assignmentType: string;
      assignmentNotes: string | null;
      assignedAt: string | null;
      hasAttended: boolean;
    }[] = [];

    const teamEmailsMap = new Map(effectiveTeamParticipants.map(p => [p.email.toLowerCase(), p]));

    events.forEach(evt => {
      evt.schedule.forEach(sch => {
        sch.slots.forEach(slot => {
          const detailsMap = new Map((slot.attendeesDetails || []).map(d => [d.email.toLowerCase(), d]));
          const attendedSet = new Set((slot.attendedList || []).map(a => a.toLowerCase()));

          slot.attendees.forEach(email => {
            const cleanEmail = email.toLowerCase();
            const participant = teamEmailsMap.get(cleanEmail);
            if (participant) {
              const detail = detailsMap.get(cleanEmail);
              list.push({
                event: evt,
                schedule: sch,
                slot: slot,
                participant,
                isMandatory: detail ? Boolean(detail.isMandatory) : false,
                assignedBy: detail?.assignedBy || null,
                assignmentType: detail?.assignmentType || (detail?.isMandatory ? 'mandatory' : 'self'),
                assignmentNotes: detail?.assignmentNotes || null,
                assignedAt: detail?.assignedAt || null,
                hasAttended: attendedSet.has(cleanEmail)
              });
            }
          });
        });
      });
    });

    return list;
  }, [events, effectiveTeamParticipants]);

  const filteredTeamAssignments = useMemo(() => {
    return teamAssignmentsList.filter(item => {
      const q = assignmentSearch.toLowerCase().trim();
      const matchSearch = !q || 
        item.participant.name.toLowerCase().includes(q) ||
        item.participant.email.toLowerCase().includes(q) ||
        item.participant.card.includes(q) ||
        item.event.title.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (assignmentFilterType === 'mandatory' && !item.isMandatory) return false;
      if (assignmentFilterType === 'voluntary' && item.isMandatory) return false;

      return true;
    });
  }, [teamAssignmentsList, assignmentSearch, assignmentFilterType]);

  const handleConfirmAssignmentFromModal = async (payload: any) => {
    if (onAssignTeamMembers) {
      await onAssignTeamMembers(payload);
    } else {
      await apiService.assignTeamMembersToEvent(payload);
    }
  };

  const handleRevokeAssignment = async (eventId: string, date: string, time: string, email: string, participantName: string) => {
    if (window.confirm(`¿Deseas desasignar a "${participantName}" de esta capacitación?`)) {
      try {
        if (onCancelRegistration) {
          await onCancelRegistration(eventId, date, time, email, true, true);
        } else {
          await apiService.cancelRegistration(eventId, date, time, email, true, true);
        }
        onShowToast('Asignación cancelada', `${participantName} ha sido desasignado del horario.`, 'info');
      } catch (err: any) {
        onShowToast('Error', err.message || 'No se pudo desasignar.', 'error');
      }
    }
  };

  const handleExportTeamExcel = () => {
    if (!activeProgram || !complianceSummary) return;
    exportComplianceReportToExcel(complianceSummary, events);
    onShowToast('Reporte exportado', `Se descargó el reporte de cumplimiento de ${activeProgram.title}.`, 'success');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Banner Header (Light Theme & Fully Responsive) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-[#DA291C] flex items-center justify-center shrink-0 shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Portal de Mi Equipo & Cumplimiento</h2>
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                Líder de Área
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Supervisando como: <strong className="text-slate-800">{effectiveSupervisor.name}</strong> 
              {effectiveSupervisor.department && <span> • Área: <strong className="text-[#DA291C]">{effectiveSupervisor.department}</strong></span>}
            </p>
          </div>
        </div>

        {/* Action Controls & Selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          {/* Selector de Supervisor para Administradores */}
          {isFullAdmin && availableSupervisors.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Supervisor:</span>
              <select
                value={selectedSupervisorId}
                onChange={(e) => setSelectedSupervisorId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 text-slate-900 rounded-xl text-xs font-bold focus:outline-none focus:border-[#DA291C]"
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
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Alcance:</span>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#DA291C]"
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
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Cronograma:</span>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#DA291C]"
              >
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          )}

        </div>
      </div>

      {/* Mode Switcher Tabs & Quick Actions */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode('program')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              viewMode === 'program'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cumplimiento por Cronograma ({activeProgram?.title || 'General'})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('assignments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              viewMode === 'assignments'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Asignaciones de Capacitación ({teamAssignmentsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('global')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              viewMode === 'global'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Historial Global ({allTeamCards.size} Colaboradores)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('skills')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              viewMode === 'skills'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Diagnóstico de Debilidades & Notas</span>
            {teamGradesAnalysis.totalMembersWithGaps > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-[10px] text-white rounded-full font-bold">
                {teamGradesAnalysis.totalMembersWithGaps}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAssignmentModalOpen(true)}
            className="px-4 py-2 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-md shadow-red-500/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>⚡ Asignar Curso al Equipo</span>
          </button>

          {viewMode === 'program' && (
            <button
              type="button"
              onClick={handleExportTeamExcel}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel</span>
            </button>
          )}

          {viewMode === 'skills' && (
            <button
              type="button"
              onClick={() => exportSkillsGapReportToExcel(events, participants, teamGradesAnalysis.allGrades)}
              className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1.5 border border-purple-200 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-purple-600" />
              <span>Exportar Diagnóstico (.xlsx)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsReminderModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/25 flex items-center gap-2 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar Recordatorio</span>
          </button>
        </div>
      </div>

      {/* Team KPI Cards (Light Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI 1: Total Colaboradores */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total en mi Equipo</span>
            <div className="p-2 rounded-xl bg-red-50 text-[#DA291C]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{totalTeamMembers}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            ⭐ {directlyAssignedCards.size} asignados directamente
          </p>
        </div>

        {/* KPI 2: % Cumplimiento Promedio */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-slate-50 border border-emerald-300 rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Avance Promedio</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-black text-emerald-700">{avgTeamPercentage}%</p>
            <span className="text-[10px] text-emerald-600 font-bold">cumplimiento</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden border border-emerald-200">
            <div 
              className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${avgTeamPercentage}%` }} 
            />
          </div>
        </div>

        {/* KPI 3: Al Día (100%) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Al Día (100%)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600 mt-2">{completedTeamMembers}</p>
          <p className="text-[11px] text-slate-500 mt-1">Completaron todos los cursos</p>
        </div>

        {/* KPI 4: En Progreso */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">En Progreso</span>
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-cyan-600 mt-2">{inProgressTeamMembers}</p>
          <p className="text-[11px] text-slate-500 mt-1">Cursos en curso o agendados</p>
        </div>

        {/* KPI 5: Atrasados / En Riesgo */}
        <div className="bg-gradient-to-br from-rose-50 via-white to-slate-50 border border-rose-300 rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Atrasados / Riesgo</span>
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-700 mt-2">{overdueTeamMembers}</p>
          <p className="text-[11px] text-rose-600 font-bold mt-1">Requieren atención</p>
        </div>

      </div>

      {/* VIEW MODE A: CUMPLIMIENTO POR CRONOGRAMA */}
      {viewMode === 'program' && (
        <div className="space-y-6">
          
          {/* Action and Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3.5 my-auto" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, tarjeta, cédula o correo..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    statusFilter === f.id
                      ? 'bg-[#DA291C] text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{f.label}</span>
                  {f.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      statusFilter === f.id ? 'bg-red-800 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

          </div>

          {/* Main Matrix Table (Light Theme) */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="p-4 font-bold">Colaborador</th>
                    <th className="p-4 font-bold">Tarjeta / Cédula</th>
                    <th className="p-4 font-bold">Departamento</th>
                    <th className="p-4 font-bold">Avance (% y Cursos)</th>
                    <th className="p-4 font-bold">Estatus</th>
                    <th className="p-4 font-bold">Desglose de Cursos</th>
                    <th className="p-4 font-bold text-right">Contacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teamParticipantsCompliance.length > 0 ? (
                    teamParticipantsCompliance.map((p) => {
                      const isDirect = directlyAssignedCards.has(p.participantCard);
                      const participantObj = participants.find(part => part.card === p.participantCard);
                      const empStatus = participantObj?.employmentStatus || 'contratado';

                      return (
                        <tr key={p.participantCard} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* Colaborador */}
                          <td className="p-4">
                            <button
                              type="button"
                              onClick={() => participantObj && setViewingProfileParticipant(participantObj)}
                              className="flex items-center gap-3 text-left group"
                            >
                              <div className="w-8 h-8 rounded-xl bg-red-50 text-[#DA291C] border border-red-200 flex items-center justify-center font-bold text-xs shrink-0">
                                {p.participantName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 group-hover:text-[#DA291C] transition-colors truncate">{p.participantName}</span>
                                  {isDirect && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                      ⭐ Asignado
                                    </span>
                                  )}
                                  {empStatus === 'en_proceso' && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                      🟡 En Proceso
                                    </span>
                                  )}
                                  {empStatus === 'inactivo' && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                                      🔴 Inactivo
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 truncate">{p.participantEmail}</p>
                                {(participantObj?.isCurrentlyStudying || participantObj?.educationLevel) && (
                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    {participantObj.educationLevel && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                        {participantObj.educationLevel}
                                      </span>
                                    )}
                                    {participantObj.isCurrentlyStudying && (
                                      <span 
                                        className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200" 
                                        title={`Estudia: ${participantObj.currentStudyField || ''} en ${participantObj.institutionName || ''}`}
                                      >
                                        🎓 Estudia: {participantObj.currentStudyField || 'En curso'}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </button>
                          </td>

                          {/* Tarjeta y Cédula */}
                          <td className="p-4 font-mono text-[11px]">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800">#{p.participantCard}</span>
                              {p.participantCedula && (
                                <p className="text-[10px] text-slate-500">{p.participantCedula}</p>
                              )}
                            </div>
                          </td>

                          {/* Departamento */}
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                              {effectiveSupervisor.department || 'General'}
                            </span>
                          </td>

                          {/* Avance */}
                          <td className="p-4">
                            <div className="space-y-1.5 w-36">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-extrabold text-slate-900">{p.percentage}%</span>
                                <span className="text-slate-500 text-[10px] font-medium">{p.completedEventsCount}/{p.totalAssignedEvents}</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                                <div
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    p.percentage === 100
                                      ? 'bg-emerald-600'
                                      : p.percentage >= 50
                                      ? 'bg-[#DA291C]'
                                      : p.percentage > 0
                                      ? 'bg-amber-500'
                                      : 'bg-slate-300'
                                  }`}
                                  style={{ width: `${p.percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Estatus */}
                          <td className="p-4">
                            {p.status === 'completed' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit shadow-sm">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Al Día (100%)
                              </span>
                            )}
                            {p.status === 'in_progress' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center gap-1 w-fit shadow-sm">
                                <Clock className="w-3 h-3 text-cyan-600" />
                                En Progreso
                              </span>
                            )}
                            {p.status === 'overdue' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit shadow-sm">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                Atrasado
                              </span>
                            )}
                            {p.status === 'not_started' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 w-fit">
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
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : ed.status === 'registered'
                                        ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
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
                                className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Enviar correo individual"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </a>

                              <a
                                href={`https://wa.me/?text=${encodeURIComponent(`Hola ${p.participantName}, te escribo para recordarte que tienes capacitaciones pendientes en el cronograma "${activeProgram?.title || 'CapacitaHub'}". Por favor revisa tu avance en la plataforma.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Enviar WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-12 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
                            <Users className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-slate-800">No hay colaboradores en este equipo</p>
                          <p className="text-xs text-slate-500">
                            {allTeamCards.size === 0
                              ? "Tu cuenta de supervisor aún no tiene colaboradores asignados directamente ni por departamento. Un administrador puede vincular a tu equipo desde el Padrón o Gestión de Usuarios."
                              : "No se encontraron colaboradores que coincidan con la búsqueda o filtros aplicados."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 text-xs text-slate-500 flex justify-between bg-slate-50">
              <span>Mostrando {teamParticipantsCompliance.length} de {activeScopeCards.size} colaboradores supervisados</span>
              <span>Cronograma: <strong className="text-slate-800">{activeProgram?.title || 'N/A'}</strong></span>
            </div>
          </div>

        </div>
      )}

      {/* VIEW MODE B: HISTORIAL GLOBAL DE PARTICIPACIONES (Light Theme) */}
      {viewMode === 'global' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Historial Consolidado de Asistencias & Horas del Equipo</h3>
                <p className="text-xs text-slate-500 mt-0.5">Todas las capacitaciones acumuladas en la empresa</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-[#DA291C] border border-red-200">
                {globalTeamStats.length} Colaboradores
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="p-4 font-bold">Colaborador</th>
                    <th className="p-4 font-bold">Tarjeta / Cédula</th>
                    <th className="p-4 font-bold">Departamento</th>
                    <th className="p-4 font-bold">Asistencias QR</th>
                    <th className="p-4 font-bold">Horas Acumuladas</th>
                    <th className="p-4 font-bold">Próximos Cursos</th>
                    <th className="p-4 font-bold text-right">Contacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {globalTeamStats.map((item: any) => (
                    <tr key={item.card} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-red-50 text-[#DA291C] border border-red-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {item.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{item.name}</span>
                              {item.isDirect && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ⭐ Asignado
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">{item.email}</p>
                            {(item.isCurrentlyStudying || item.educationLevel) && (
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                {item.educationLevel && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    {item.educationLevel}
                                  </span>
                                )}
                                {item.isCurrentlyStudying && (
                                  <span 
                                    className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200" 
                                    title={`Estudia: ${item.currentStudyField || ''} en ${item.institutionName || ''}`}
                                  >
                                    🎓 Estudia: {item.currentStudyField || 'En curso'}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-mono text-[11px]">
                        <span className="font-bold text-slate-800">#{item.card}</span>
                        {item.cedula && <p className="text-[10px] text-slate-500">{item.cedula}</p>}
                      </td>

                      <td className="p-4 text-slate-700">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                          {item.department}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.attendedCount} cursos completados
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="font-extrabold text-slate-900 text-xs">{item.totalHours} hrs</span>
                      </td>

                      <td className="p-4 text-slate-600">
                        {item.registeredFutureCount > 0 ? (
                          <span className="text-cyan-700 font-bold">{item.registeredFutureCount} agendados</span>
                        ) : (
                          <span className="text-slate-400 italic">Ninguno agendado</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`mailto:${item.email}?subject=Capacitaciones%20Corporativas`}
                            className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(`Hola ${item.name}, te contacto desde la supervisión de capacitaciones de tu área.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
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

      {/* VIEW MODE C: ASIGNACIONES ACTIVAS DE CAPACITACIÓN (Light Theme) */}
      {viewMode === 'assignments' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top KPI Cards for Assignments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-500">Total Asignaciones / Registros</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-slate-900">{teamAssignmentsList.length}</span>
                <span className="text-xs text-slate-500">en el equipo</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-50 via-white to-slate-50 border border-rose-200 rounded-3xl p-5 shadow-sm">
              <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Asignaciones Obligatorias
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-rose-700">
                  {teamAssignmentsList.filter(a => a.isMandatory).length}
                </span>
                <span className="text-xs text-slate-500 font-medium">fijadas por líder</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 via-white to-slate-50 border border-cyan-200 rounded-3xl p-5 shadow-sm">
              <span className="text-xs font-bold text-cyan-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Asignaciones Voluntarias
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-cyan-700">
                  {teamAssignmentsList.filter(a => !a.isMandatory && a.assignedBy).length}
                </span>
                <span className="text-xs text-slate-500 font-medium">sugeridas</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 via-white to-slate-50 border border-emerald-200 rounded-3xl p-5 shadow-sm">
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Asistencias Confirmadas
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-emerald-700">
                  {teamAssignmentsList.filter(a => a.hasAttended).length}
                </span>
                <span className="text-xs text-slate-500 font-medium">con check-in QR</span>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            
            {/* Header & Controls */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>Asignaciones de Capacitaciones a Miembros del Equipo</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gestiona las matrículas, verifica el carácter obligatorio y desasigna si es necesario.
                </p>
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por colaborador o curso..."
                    value={assignmentSearch}
                    onChange={(e) => setAssignmentSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setAssignmentFilterType('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      assignmentFilterType === 'all' ? 'bg-[#DA291C] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos ({teamAssignmentsList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentFilterType('mandatory')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      assignmentFilterType === 'mandatory' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-rose-600'
                    }`}
                  >
                    Obligatorios ({teamAssignmentsList.filter(a => a.isMandatory).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentFilterType('voluntary')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      assignmentFilterType === 'voluntary' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-600 hover:text-cyan-600'
                    }`}
                  >
                    Voluntarios ({teamAssignmentsList.filter(a => !a.isMandatory).length})
                  </button>
                </div>
              </div>
            </div>

            {/* Assignments Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="p-4 font-bold">Colaborador</th>
                    <th className="p-4 font-bold">Capacitación / Evento</th>
                    <th className="p-4 font-bold">Fecha y Horario</th>
                    <th className="p-4 font-bold">Carácter</th>
                    <th className="p-4 font-bold">Asignado Por</th>
                    <th className="p-4 font-bold">Estado Asistencia</th>
                    <th className="p-4 font-bold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeamAssignments.length > 0 ? (
                    filteredTeamAssignments.map((item, idx) => (
                      <tr 
                        key={`${item.event.id}-${item.schedule.date}-${item.slot.time}-${item.participant.card}-${idx}`}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Colaborador */}
                        <td className="p-4">
                          <p className="font-bold text-slate-900 text-xs">{item.participant.name}</p>
                          <p className="text-[11px] text-slate-500">{item.participant.email}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-medium">
                            <span>ID: #{item.participant.card}</span>
                            {item.participant.cedula && <span>• Céd: {item.participant.cedula}</span>}
                          </div>
                          {(item.participant.isCurrentlyStudying || item.participant.educationLevel) && (
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {item.participant.educationLevel && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  {item.participant.educationLevel}
                                </span>
                              )}
                              {item.participant.isCurrentlyStudying && (
                                <span 
                                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200" 
                                  title={`Estudia: ${item.participant.currentStudyField || ''} en ${item.participant.institutionName || ''}`}
                                >
                                  🎓 Estudia: {item.participant.currentStudyField || 'En curso'}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Evento */}
                        <td className="p-4">
                          <p className="font-bold text-slate-900 text-xs">{item.event.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-700 border border-slate-200">
                              {item.event.category}
                            </span>
                            <span>{item.event.instructor}</span>
                          </div>
                        </td>

                        {/* Fecha y Horario */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                            <Calendar className="w-3.5 h-3.5 text-[#DA291C]" />
                            <span>{item.schedule.date}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.slot.time}</span>
                          </div>
                        </td>

                        {/* Carácter */}
                        <td className="p-4 whitespace-nowrap">
                          {item.isMandatory ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5 w-max">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              ★ Obligatorio
                            </span>
                          ) : item.assignedBy ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center gap-1.5 w-max">
                              <ShieldCheck className="w-3 h-3 text-cyan-600" />
                              Voluntario
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 w-max">
                              Auto-inscrito
                            </span>
                          )}
                        </td>

                        {/* Asignado por */}
                        <td className="p-4 text-[11px] text-slate-600">
                          {item.assignedBy ? (
                            <div>
                              <p className="font-bold text-slate-800">{item.assignedBy}</p>
                              {item.assignmentNotes && (
                                <p className="text-[10px] text-amber-700 italic mt-0.5">"{item.assignmentNotes}"</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Inscripción Directa</span>
                          )}
                        </td>

                        {/* Estado Asistencia */}
                        <td className="p-4 whitespace-nowrap">
                          {item.hasAttended ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Asistencia OK
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center gap-1 w-max">
                              <Clock className="w-3 h-3 text-cyan-600" /> Agendado
                            </span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRevokeAssignment(
                              item.event.id,
                              item.schedule.date,
                              item.slot.time,
                              item.participant.email,
                              item.participant.name
                            )}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Desasignar a este colaborador"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-12 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
                            <BookOpen className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-slate-800">No hay asignaciones en esta vista</p>
                          <p className="text-xs text-slate-500">
                            Puedes asignar cursos directamente a tus colaboradores usando el botón "⚡ Asignar Curso al Equipo".
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsAssignmentModalOpen(true)}
                            className="px-4 py-2 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-500/25 transition-colors inline-flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Crear Primera Asignación</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 text-xs text-slate-500 flex justify-between bg-slate-50">
              <span>Mostrando {filteredTeamAssignments.length} de {teamAssignmentsList.length} asignaciones totales</span>
            </div>
          </div>

        </div>
      )}

      {/* VIEW MODE D: DIAGNÓSTICO DE DEBILIDADES & CALIFICACIONES (Light Theme) */}
      {viewMode === 'skills' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top KPI Cards for Skills & Grades */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-500">Promedio General del Equipo</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-blue-700">{teamGradesAnalysis.overallTeamAvg}</span>
                <span className="text-xs font-bold text-slate-400">Escala 0 - 100</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Calculado sobre cursos con evaluación formal</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-500">Total Evaluaciones Realizadas</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-slate-900">{teamGradesAnalysis.totalGradesCount}</span>
                <span className="text-xs font-bold text-[#DA291C]">{teamGradesAnalysis.gradedParticipants.length} miembros</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Calificaciones asentadas en PostgreSQL</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 via-white to-slate-50 border border-emerald-200 rounded-3xl p-5 shadow-sm">
              <span className="text-xs font-bold text-emerald-700">Capacitaciones Aprobadas</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-emerald-700">{teamGradesAnalysis.totalPassed}</span>
                <span className="text-xs font-bold text-emerald-600">
                  {teamGradesAnalysis.totalGradesCount > 0 
                    ? `${((teamGradesAnalysis.totalPassed / teamGradesAnalysis.totalGradesCount) * 100).toFixed(0)}% éxito`
                    : '100%'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Superaron la nota mínima aprobatoria</p>
            </div>

            <div className="bg-gradient-to-br from-rose-50 via-white to-slate-50 border border-rose-200 rounded-3xl p-5 shadow-sm">
              <span className="text-xs font-bold text-rose-700">Colaboradores con Debilidades / Refuerzo</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-rose-700">{teamGradesAnalysis.totalMembersWithGaps}</span>
                <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                  🚨 Requieren Atención
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Identificados con brechas técnicas o reprobados</p>
            </div>
          </div>

          {/* Radar / Diagnostic Panel of Weaknesses */}
          {teamGradesAnalysis.topGaps.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#DA291C]" />
                  <h3 className="text-sm font-black text-slate-900">
                    Matriz de Detección de Debilidades en el Equipo (Skills Gap Analysis)
                  </h3>
                </div>
                <span className="text-[11px] text-blue-800 font-bold bg-blue-50 px-3 py-1 rounded-xl border border-blue-200 shadow-xs">
                  {teamGradesAnalysis.topGaps.length} áreas identificadas
                </span>
              </div>
              <p className="text-xs text-slate-600">
                A continuación se listan las competencias y temas donde los miembros de tu equipo han mostrado mayor índice de dificultad en sus evaluaciones:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                {teamGradesAnalysis.topGaps.map(gap => (
                  <div 
                    key={gap.skill}
                    className="p-3 rounded-2xl bg-white border border-rose-200 shadow-xs flex items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-[#DA291C] shrink-0" />
                        <span>{gap.skill}</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {gap.participantsCount} {gap.participantsCount === 1 ? 'colaborador afectado' : 'colaboradores afectados'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-xs font-extrabold rounded-lg border border-rose-200">
                      {gap.count} {gap.count === 1 ? 'caso' : 'casos'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por colaborador, tarjeta, cédula o debilidad..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={skillsFilterStatus}
                onChange={(e) => setSkillsFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#DA291C]"
              >
                <option value="all">🔍 Todos los Colaboradores</option>
                <option value="needs_retraining">🚨 Con Debilidades / Re-capacitación Requerida</option>
                <option value="failed">❌ Con Evaluaciones Reprobadas</option>
                <option value="passed">✅ Con Evaluaciones Aprobadas</option>
              </select>
            </div>
          </div>

          {/* Team Members Detailed Evaluation Grid */}
          <div className="space-y-4">
            {Object.values(teamGradesAnalysis.participantMap)
              .filter(item => {
                // Filtro de búsqueda
                const q = searchQuery.toLowerCase();
                const matchQ = 
                  item.participant.name.toLowerCase().includes(q) ||
                  item.participant.email.toLowerCase().includes(q) ||
                  item.participant.card.includes(q) ||
                  (item.participant.department && item.participant.department.toLowerCase().includes(q)) ||
                  Array.from(item.allGaps).some(g => g.toLowerCase().includes(q));
                if (!matchQ) return false;

                // Filtro de estado
                if (skillsFilterStatus === 'needs_retraining' && !item.needsRetraining && item.allGaps.size === 0) return false;
                if (skillsFilterStatus === 'failed' && item.failedCount === 0) return false;
                if (skillsFilterStatus === 'passed' && item.passedCount === 0) return false;

                return true;
              })
              .map(item => {
                const p = item.participant;
                const hasGaps = item.allGaps.size > 0 || item.needsRetraining;

                return (
                  <div
                    key={p.card}
                    className={`p-5 rounded-3xl border transition-all ${
                      hasGaps
                        ? 'bg-white border-rose-300 shadow-sm hover:border-rose-400'
                        : item.grades.length > 0
                        ? 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                        : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    {/* Header: Participant Info + Avg Score + Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ${
                          hasGaps ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-red-50 text-[#DA291C] border border-red-200'
                        }`}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-lg">
                              Tarjeta: #{p.card}
                            </span>
                            {hasGaps && (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold rounded-lg flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-rose-600" />
                                🚨 Requiere Refuerzo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {p.email} • <span className="text-slate-700 font-semibold">{p.department || 'General'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Score Summary & Actions */}
                      <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                        {item.grades.length > 0 ? (
                          <div className="px-3.5 py-1.5 bg-slate-50 rounded-2xl border border-slate-200 text-right">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Promedio</span>
                            <span className={`text-base font-extrabold ${item.avgScore >= 70 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {item.avgScore} <span className="text-xs text-slate-400 font-normal">pts</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                            Sin evaluaciones registradas
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setViewingProfileParticipant(p);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Ver Expediente
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsAssignmentModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                          <span>⚡ Re-capacitar</span>
                        </button>
                      </div>
                    </div>

                    {/* Evaluated Courses Breakdown */}
                    {item.grades.length > 0 ? (
                      <div className="pt-3.5 space-y-2.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Historial de Capacitaciones Evaluadas:
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {item.grades.map((grd, idx) => {
                            const isPassed = grd.academicStatus === 'passed';
                            const isFailed = grd.academicStatus === 'failed';
                            const hasLocalGaps = (grd.detectedSkillGaps || []).length > 0;

                            return (
                              <div
                                key={idx}
                                className={`p-3.5 rounded-2xl border ${
                                  isFailed || grd.needsRetraining
                                    ? 'bg-rose-50/40 border-rose-200'
                                    : 'bg-slate-50/70 border-slate-200'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="text-[10px] text-[#DA291C] font-bold">{grd.category}</span>
                                    <h5 className="text-xs font-bold text-slate-900 line-clamp-1">{grd.eventTitle}</h5>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {grd.score !== null && (
                                      <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                                        isPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                      }`}>
                                        {grd.score} pts
                                      </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                                      isPassed
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : isFailed
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}>
                                      {isPassed ? 'Aprobado' : isFailed ? 'Reprobado' : 'Pendiente'}
                                    </span>
                                  </div>
                                </div>

                                {/* Debilidades detectadas en este curso */}
                                {hasLocalGaps && (
                                  <div className="mt-2.5 pt-2 border-t border-rose-200/60 space-y-1">
                                    <span className="text-[10px] text-rose-700 font-bold uppercase block">
                                      Debilidades señaladas:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {(grd.detectedSkillGaps || []).map(skill => (
                                        <span 
                                          key={skill}
                                          className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-semibold border border-rose-200 flex items-center gap-1"
                                        >
                                          <ShieldAlert className="w-2.5 h-2.5 text-rose-600" />
                                          <span>{skill}</span>
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Notas del docente / Evaluador */}
                                {grd.weaknessesNotes && (
                                  <p className="text-[11px] text-slate-600 italic mt-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                                    "{grd.weaknessesNotes}"
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 text-xs text-slate-400 italic">
                        Este colaborador aún no ha completado capacitaciones con calificación formal.
                      </div>
                    )}

                  </div>
                );
              })}
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

      {/* Team Assignment Modal */}
      {isAssignmentModalOpen && (
        <TeamAssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => setIsAssignmentModalOpen(false)}
          events={events}
          teamParticipants={effectiveTeamParticipants}
          currentUser={currentUser}
          groups={groups}
          onConfirmAssignment={handleConfirmAssignmentFromModal}
          onShowToast={onShowToast}
        />
      )}

      {/* Modal de Ficha 360° */}
      {viewingProfileParticipant && (
        <ParticipantProfileModal
          participant={viewingProfileParticipant}
          users={users}
          events={events}
          programs={programs}
          companies={companies}
          technicalHistory={technicalHistory}
          currentUser={currentUser}
          isOpen={Boolean(viewingProfileParticipant)}
          onClose={() => setViewingProfileParticipant(null)}
        />
      )}

    </div>
  );
};
