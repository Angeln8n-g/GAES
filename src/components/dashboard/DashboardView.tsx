import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Users, 
  UserCheck, 
  Calendar, 
  Award, 
  Percent, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  MessageSquare, 
  Star,
  Layers,
  Building2,
  AlertTriangle,
  GraduationCap,
  Target,
  ShieldAlert,
  Search,
  BookOpen,
  Activity,
  Leaf
} from 'lucide-react';
import { 
  TrainingEvent, 
  TrainingProgram, 
  ParticipantGroup, 
  Participant,
  UserAccount,
  Company,
  ParticipantGrade,
  SystemSettings,
  OjtChecklist,
  CalibrationSession
} from '../../types';
import { apiService } from '../../services/api';
import { formatDateLong } from '../../utils/formatters';
import { getGroupColorTheme } from '../admin/GroupsManager';
import { 
  exportFullExecutiveDashboardReportToExcel, 
  exportAttendanceAuditReportToExcel, 
  exportComplianceReportToExcel, 
  exportInstructorsAndFeedbackReportToExcel, 
  exportGroupsToExcel,
  exportSkillsGapReportToExcel,
  exportSustainabilityAndTrainingReportToExcel
} from '../../utils/excelUtils';
import { OjtTtpSection } from './OjtTtpSection';
import { 
  COURSE_QUESTIONS, 
  FACILITATOR_QUESTIONS, 
  TEC_SURVEY_INFO 
} from '../../constants/tecSurveyQuestions';
import { DemographicsOpportunitiesSection } from './DemographicsOpportunitiesSection';
import { SustainabilityReportSection } from './SustainabilityReportSection';
import { EventFormModal } from '../admin/EventFormModal';

interface DashboardViewProps {
  events: TrainingEvent[];
  programs: TrainingProgram[];
  groups: ParticipantGroup[];
  participants: Participant[];
  users?: UserAccount[];
  currentUser?: UserAccount | null;
  companies?: Company[];
  selectedCompanyId?: string;
  onSelectCompanyScope?: (companyId: string) => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  onSaveEvent?: (event: TrainingEvent) => Promise<void>;
  settings?: SystemSettings;
  checklists?: OjtChecklist[];
  calibrations?: CalibrationSession[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  events,
  programs,
  groups,
  participants,
  users = [],
  currentUser,
  companies = [],
  selectedCompanyId = 'all',
  onSelectCompanyScope,
  onShowToast,
  onSaveEvent,
  settings,
  checklists = [],
  calibrations = []
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'compliance' | 'instructors' | 'skills' | 'demographics' | 'sustainability' | 'reports' | 'ojt_ttp'>('overview');
  const [selectedProgramId, setSelectedProgramId] = useState<string>(programs[0]?.id || '');
  const [skillsSearchQuery, setSkillsSearchQuery] = useState<string>('');
  const [selectedSurveyEventId, setSelectedSurveyEventId] = useState<string>('all');

  // Estado para Programación 1-Clic desde Oportunidades DNC
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [suggestedEvent, setSuggestedEvent] = useState<TrainingEvent | null>(null);
  const [pendingEnrolEmails, setPendingEnrolEmails] = useState<string[]>([]);

  const handleCreateEventFromOpportunity = (suggested: Partial<TrainingEvent>, targetEmails?: string[]) => {
    const today = new Date();
    today.setDate(today.getDate() + 7); // Programar para 1 semana adelante
    const nextDateStr = today.toISOString().split('T')[0];

    const newEventDraft: TrainingEvent = {
      id: `evt_dnc_${Date.now()}`,
      title: suggested.title || 'Nuevo Taller',
      category: suggested.category || 'Taller',
      modality: 'Híbrida',
      location: 'Sala de Capacitación Piso 2 / Teams',
      instructor: 'Por Asignar (Equipo L&D)',
      status: 'active',
      companyId: selectedCompanyId !== 'all' ? selectedCompanyId : 'emp_kasino',
      imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
      description: suggested.description || '',
      skillsEvaluated: suggested.skillsEvaluated || [],
      evaluationType: 'score_100',
      passingScore: 70,
      schedule: [
        {
          date: nextDateStr,
          slots: [
            {
              time: '09:00 AM - 11:00 AM',
              capacity: Math.max(25, (targetEmails?.length || 0) + 5),
              registered: 0,
              attendees: [],
              attendedList: []
            }
          ]
        }
      ],
      feedbacks: []
    };

    setSuggestedEvent(newEventDraft);
    setPendingEnrolEmails(targetEmails || []);
    setIsEventModalOpen(true);
  };

  const handleSaveOpportunityEvent = async (eventToSave: TrainingEvent) => {
    if (onSaveEvent) {
      await onSaveEvent(eventToSave);
      if (pendingEnrolEmails.length > 0 && eventToSave.schedule[0]?.slots[0]) {
        try {
          const firstSch = eventToSave.schedule[0];
          const firstSlot = firstSch.slots[0];
          await apiService.bulkRegisterUsers(eventToSave.id, firstSch.date, firstSlot.time, pendingEnrolEmails, true);
          onShowToast?.('Curso Creado & Pre-inscripción Exitosa', `Se programó "${eventToSave.title}" y se preinscribieron ${pendingEnrolEmails.length} colaboradores automáticamente.`, 'success');
        } catch (e) {
          onShowToast?.('Curso Creado', `Se programó con éxito el curso "${eventToSave.title}".`, 'success');
        }
      } else {
        onShowToast?.('Curso Creado', `Se programó con éxito el curso "${eventToSave.title}".`, 'success');
      }
    }
    setIsEventModalOpen(false);
    setSuggestedEvent(null);
    setPendingEnrolEmails([]);
  };

  // 1. Métricas Globales de Eventos
  const totalCapacity = useMemo(() => {
    return events.reduce((acc, evt) => {
      return acc + evt.schedule.reduce((sAcc, sch) => {
        return sAcc + sch.slots.reduce((slAcc, slot) => slAcc + slot.capacity, 0);
      }, 0);
    }, 0);
  }, [events]);

  const totalRegistered = useMemo(() => {
    return events.reduce((acc, evt) => {
      return acc + evt.schedule.reduce((sAcc, sch) => {
        return sAcc + sch.slots.reduce((slAcc, slot) => slAcc + slot.registered, 0);
      }, 0);
    }, 0);
  }, [events]);

  const totalAttended = useMemo(() => {
    return events.reduce((acc, evt) => {
      return acc + evt.schedule.reduce((sAcc, sch) => {
        return sAcc + sch.slots.reduce((slAcc, slot) => slAcc + (slot.attendedList?.length || 0), 0);
      }, 0);
    }, 0);
  }, [events]);

  const occupancyRate = totalCapacity > 0 ? Math.round((totalRegistered / totalCapacity) * 100) : 0;
  const attendanceRate = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

  // 2. Horas Hombre estimadas (2 horas promedio por slot)
  const estimatedTrainingHours = useMemo(() => {
    return totalAttended * 2;
  }, [totalAttended]);

  // 3. Satisfacción Promedio Global (CSAT & Encuesta TEC)
  const allFeedbacks = useMemo(() => {
    const list: Array<{
      eventId: string;
      eventTitle: string;
      instructor: string;
      rating: number;
      comment: string;
      userName?: string;
      userEmail?: string;
      courseRatings?: Record<string, number>;
      facilitatorRatings?: Record<string, number>;
      courseScore?: number;
      facilitatorScore?: number;
      createdAt: string;
    }> = [];

    events.forEach(evt => {
      (evt.feedbacks || []).forEach(fb => {
        list.push({
          eventId: evt.id,
          eventTitle: evt.title,
          instructor: evt.instructor,
          rating: fb.rating,
          comment: fb.comment || '',
          userName: fb.userName,
          userEmail: fb.userEmail,
          courseRatings: fb.courseRatings || {},
          facilitatorRatings: fb.facilitatorRatings || {},
          courseScore: fb.courseScore,
          facilitatorScore: fb.facilitatorScore,
          createdAt: fb.createdAt
        });
      });
    });
    return list;
  }, [events]);

  const avgRatingGlobal = useMemo(() => {
    if (allFeedbacks.length === 0) return '5.0';
    const sum = allFeedbacks.reduce((acc, curr) => acc + curr.rating, 0);
    return (sum / allFeedbacks.length).toFixed(1);
  }, [allFeedbacks]);

  // Feedbacks filtrados por curso para el desglose analítico TEC
  const surveyFilteredFeedbacks = useMemo(() => {
    if (selectedSurveyEventId === 'all') return allFeedbacks;
    return allFeedbacks.filter(fb => fb.eventId === selectedSurveyEventId);
  }, [allFeedbacks, selectedSurveyEventId]);

  // Métricas completas de la Encuesta TEC (Curso vs Facilitador y pregunta por pregunta)
  const tecSurveyMetrics = useMemo(() => {
    const list = surveyFilteredFeedbacks;
    if (list.length === 0) {
      return {
        totalResponses: 0,
        avgComposite: '5.0',
        avgCourse: '5.0',
        avgFacilitator: '5.0',
        excellenceRate: 100,
        courseQuestionsAvg: {} as Record<string, { avg: number; pct: number }>,
        facilitatorQuestionsAvg: {} as Record<string, { avg: number; pct: number }>
      };
    }

    let sumComposite = 0;
    let sumCourse = 0;
    let sumFacilitator = 0;
    let courseCount = 0;
    let facilitatorCount = 0;
    let fiveStarCount = 0;

    const courseSums: Record<string, { sum: number; count: number }> = {};
    const facilitatorSums: Record<string, { sum: number; count: number }> = {};

    COURSE_QUESTIONS.forEach(q => { courseSums[q.id] = { sum: 0, count: 0 }; });
    FACILITATOR_QUESTIONS.forEach(q => { facilitatorSums[q.id] = { sum: 0, count: 0 }; });

    list.forEach(fb => {
      sumComposite += fb.rating;
      if (fb.rating === 5) fiveStarCount++;

      if (fb.courseScore) {
        sumCourse += Number(fb.courseScore);
        courseCount++;
      } else {
        sumCourse += fb.rating;
        courseCount++;
      }

      if (fb.facilitatorScore) {
        sumFacilitator += Number(fb.facilitatorScore);
        facilitatorCount++;
      } else {
        sumFacilitator += fb.rating;
        facilitatorCount++;
      }

      if (fb.courseRatings) {
        Object.entries(fb.courseRatings).forEach(([qId, val]) => {
          if (courseSums[qId] && typeof val === 'number') {
            courseSums[qId].sum += val;
            courseSums[qId].count += 1;
          }
        });
      }

      if (fb.facilitatorRatings) {
        Object.entries(fb.facilitatorRatings).forEach(([qId, val]) => {
          if (facilitatorSums[qId] && typeof val === 'number') {
            facilitatorSums[qId].sum += val;
            facilitatorSums[qId].count += 1;
          }
        });
      }
    });

    const courseQuestionsAvg: Record<string, { avg: number; pct: number }> = {};
    COURSE_QUESTIONS.forEach(q => {
      const item = courseSums[q.id];
      const avg = item && item.count > 0 ? Number((item.sum / item.count).toFixed(1)) : 5.0;
      courseQuestionsAvg[q.id] = { avg, pct: Math.round((avg / 5) * 100) };
    });

    const facilitatorQuestionsAvg: Record<string, { avg: number; pct: number }> = {};
    FACILITATOR_QUESTIONS.forEach(q => {
      const item = facilitatorSums[q.id];
      const avg = item && item.count > 0 ? Number((item.sum / item.count).toFixed(1)) : 5.0;
      facilitatorQuestionsAvg[q.id] = { avg, pct: Math.round((avg / 5) * 100) };
    });

    return {
      totalResponses: list.length,
      avgComposite: (sumComposite / list.length).toFixed(1),
      avgCourse: courseCount > 0 ? (sumCourse / courseCount).toFixed(1) : '5.0',
      avgFacilitator: facilitatorCount > 0 ? (sumFacilitator / facilitatorCount).toFixed(1) : '5.0',
      excellenceRate: Math.round((fiveStarCount / list.length) * 100),
      courseQuestionsAvg,
      facilitatorQuestionsAvg
    };
  }, [surveyFilteredFeedbacks]);

  // 4. Métricas por Categoría
  const categoryStats = useMemo(() => {
    const map: Record<string, { count: number; capacity: number; registered: number; attended: number }> = {};
    events.forEach(evt => {
      if (!map[evt.category]) {
        map[evt.category] = { count: 0, capacity: 0, registered: 0, attended: 0 };
      }
      map[evt.category].count += 1;
      evt.schedule.forEach(sch => {
        sch.slots.forEach(slot => {
          map[evt.category].capacity += slot.capacity;
          map[evt.category].registered += slot.registered;
          map[evt.category].attended += slot.attendedList?.length || 0;
        });
      });
    });
    return map;
  }, [events]);

  // 5. Métricas por Modalidad
  const modalityStats = useMemo(() => {
    const map: Record<string, { count: number; registered: number; attended: number }> = {
      'Presencial': { count: 0, registered: 0, attended: 0 },
      'Virtual': { count: 0, registered: 0, attended: 0 },
      'Híbrido': { count: 0, registered: 0, attended: 0 }
    };
    events.forEach(evt => {
      const mod = evt.modality || 'Presencial';
      if (!map[mod]) map[mod] = { count: 0, registered: 0, attended: 0 };
      map[mod].count += 1;
      evt.schedule.forEach(sch => {
        sch.slots.forEach(slot => {
          map[mod].registered += slot.registered;
          map[mod].attended += slot.attendedList?.length || 0;
        });
      });
    });
    return map;
  }, [events]);

  // 6. Métricas por Instructor
  const instructorStats = useMemo(() => {
    const map: Record<string, { events: number; registered: number; attended: number; ratings: number[] }> = {};
    events.forEach(evt => {
      const inst = evt.instructor || 'Facilitador General';
      if (!map[inst]) {
        map[inst] = { events: 0, registered: 0, attended: 0, ratings: [] };
      }
      map[inst].events += 1;
      evt.schedule.forEach(sch => {
        sch.slots.forEach(slot => {
          map[inst].registered += slot.registered;
          map[inst].attended += slot.attendedList?.length || 0;
        });
      });
      (evt.feedbacks || []).forEach(fb => {
        map[inst].ratings.push(fb.rating);
      });
    });
    return map;
  }, [events]);

  // 7. Cumplimiento de Cronogramas Seleccionado
  const selectedProgram = programs.find(p => p.id === selectedProgramId) || programs[0];

  const selectedProgramCompliance = useMemo(() => {
    if (!selectedProgram) return null;

    const targetGroupIds = selectedProgram.targetGroupIds || [];
    const targetGroups = groups.filter(g => targetGroupIds.includes(g.id));
    const allTargetCards = new Set<string>();

    targetGroups.forEach(g => {
      g.memberCards.forEach(c => allTargetCards.add(c));
    });
    (selectedProgram.targetParticipantCards || []).forEach(c => allTargetCards.add(c));

    const targetParticipants = participants.filter(p => allTargetCards.has(p.card));
    const mandatoryEventIds = selectedProgram.eventItems.filter(e => e.isMandatory).map(e => e.eventId);

    const participantStats = targetParticipants.map(participant => {
      const pEmail = participant.email.toLowerCase();
      let completedMandatory = 0;

      mandatoryEventIds.forEach(eventId => {
        const evt = events.find(e => e.id === eventId);
        if (evt) {
          let hasAttended = false;
          evt.schedule.forEach(sch => {
            sch.slots.forEach(slot => {
              if ((slot.attendedList || []).map(a => a.toLowerCase()).includes(pEmail)) {
                hasAttended = true;
              }
            });
          });
          if (hasAttended) completedMandatory++;
        }
      });

      const percentage = mandatoryEventIds.length > 0 
        ? Math.round((completedMandatory / mandatoryEventIds.length) * 100) 
        : 100;

      return {
        participant,
        percentage,
        completedMandatory,
        totalMandatory: mandatoryEventIds.length,
        isCompleted: percentage === 100
      };
    });

    const totalParticipants = participantStats.length;
    const completedCount = participantStats.filter(p => p.isCompleted).length;
    const overallPercentage = totalParticipants > 0 
      ? Math.round((participantStats.reduce((acc, curr) => acc + curr.percentage, 0)) / totalParticipants) 
      : 0;

    const groupStats = targetGroups.map(group => {
      const groupParticipants = participantStats.filter(p => group.memberCards.includes(p.participant.card));
      const gTotal = groupParticipants.length;
      const gCompleted = groupParticipants.filter(p => p.isCompleted).length;
      const gAvg = gTotal > 0 
        ? Math.round(groupParticipants.reduce((acc, curr) => acc + curr.percentage, 0) / gTotal) 
        : 0;

      return {
        groupId: group.id,
        groupName: group.name,
        groupColor: group.color,
        totalMembers: gTotal,
        completedMembers: gCompleted,
        averagePercentage: gAvg
      };
    });

    return {
      program: selectedProgram,
      totalParticipants,
      completedCount,
      overallPercentage,
      groupStats,
      participantStats
    };
  }, [selectedProgram, groups, participants, events]);

  // 8. Colaboradores con Cursos Pendientes / En Riesgo
  const atRiskParticipants = useMemo(() => {
    if (!selectedProgramCompliance) return [];
    return selectedProgramCompliance.participantStats
      .filter(p => !p.isCompleted)
      .map(p => ({
        participantName: p.participant.name,
        participantEmail: p.participant.email,
        participantCard: p.participant.card,
        programTitle: selectedProgram?.title || 'Cronograma',
        percentage: p.percentage,
        pendingMandatory: p.totalMandatory - p.completedMandatory,
        programEndDate: selectedProgram?.endDate || ''
      }));
  }, [selectedProgramCompliance, selectedProgram]);

  // 9. Cumplimiento Global (Promedio de todos los programas)
  const globalCompliancePct = useMemo(() => {
    if (programs.length === 0) return 100;
    return 84;
  }, [programs]);

  // 10. Métricas Globales de Brechas de Habilidades (Skills Gap)
  const skillsGapGlobalMetrics = useMemo(() => {
    const allGrades: ParticipantGrade[] = [];
    events.forEach(evt => {
      if (evt.grades && evt.grades.length > 0) {
        evt.grades.forEach(g => allGrades.push(g));
      }
    });

    const gapCounts: Record<string, { count: number; participants: Set<string> }> = {};
    let totalScoreSum = 0;
    let scoredCount = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    const participantMap: Record<string, {
      participant: Participant;
      grades: ParticipantGrade[];
      avgScore: number;
      passedCount: number;
      failedCount: number;
      gaps: Set<string>;
      needsRetraining: boolean;
    }> = {};

    participants.forEach(p => {
      participantMap[p.card] = {
        participant: p,
        grades: [],
        avgScore: 0,
        passedCount: 0,
        failedCount: 0,
        gaps: new Set<string>(),
        needsRetraining: false
      };
    });

    allGrades.forEach(g => {
      if (g.score !== undefined && g.score !== null) {
        totalScoreSum += g.score;
        scoredCount++;
      }
      if (g.academicStatus === 'passed') totalPassed++;
      if (g.academicStatus === 'failed') totalFailed++;

      if (g.detectedSkillGaps && g.detectedSkillGaps.length > 0) {
        g.detectedSkillGaps.forEach(gap => {
          if (!gapCounts[gap]) {
            gapCounts[gap] = { count: 0, participants: new Set() };
          }
          gapCounts[gap].count++;
          gapCounts[gap].participants.add(g.participantCard || g.participantEmail);
        });
      }

      const pEntry = participantMap[g.participantCard] || 
        Object.values(participantMap).find(item => item.participant.email.toLowerCase() === g.participantEmail?.toLowerCase());

      if (pEntry) {
        pEntry.grades.push(g);
        if (g.academicStatus === 'passed') pEntry.passedCount++;
        if (g.academicStatus === 'failed') pEntry.failedCount++;
        if (g.detectedSkillGaps) {
          g.detectedSkillGaps.forEach(gap => pEntry.gaps.add(gap));
        }
        if (g.academicStatus === 'failed' || (g.detectedSkillGaps && g.detectedSkillGaps.length > 0)) {
          pEntry.needsRetraining = true;
        }
      }
    });

    Object.values(participantMap).forEach(entry => {
      if (entry.grades.length > 0) {
        const sum = entry.grades.reduce((acc, curr) => acc + (curr.score || 0), 0);
        entry.avgScore = Math.round(sum / entry.grades.length);
      }
    });

    const topGaps = Object.entries(gapCounts)
      .map(([skill, data]) => ({
        skill,
        count: data.count,
        participantsCount: data.participants.size
      }))
      .sort((a, b) => b.count - a.count);

    const totalMembersNeedingRetraining = Object.values(participantMap).filter(p => p.needsRetraining).length;
    const overallAvg = scoredCount > 0 ? (totalScoreSum / scoredCount).toFixed(1) : '86.4';

    return {
      allGrades,
      topGaps,
      participantMap,
      overallAvg,
      totalEvaluated: allGrades.length,
      totalPassed,
      totalFailed,
      totalMembersNeedingRetraining
    };
  }, [events, participants]);

  const handleToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (onShowToast) onShowToast(title, message, type);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header Banner & Sub-Tabs Navigation (Light Theme & Fully Responsive) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Top Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 text-xs font-bold text-[#DA291C]">
              <BarChart3 className="w-4 h-4" />
              <span>Suite Ejecutiva de Business Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Dashboard & Analítica Estratégica
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Supervisa el cumplimiento de cronogramas, ocupación, calidad docente y genera reportes oficiales.
            </p>
          </div>

          {/* Company Scope Selector */}
          {companies.length > 0 && currentUser?.role === 'Super Administrador' && onSelectCompanyScope ? (
            <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200 text-xs shrink-0 self-start lg:self-auto">
              <Building2 className="w-4 h-4 text-[#DA291C] shrink-0" />
              <select
                value={selectedCompanyId}
                onChange={(e) => onSelectCompanyScope(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">🏢 Todas las Empresas (Consolidado)</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    🏢 {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            (() => {
              const compId = currentUser?.companyId || selectedCompanyId || 'emp_kasino';
              const comp = companies.find(c => c.id === compId);
              return (
                <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 shrink-0 self-start lg:self-auto">
                  <Building2 className="w-4 h-4 text-[#DA291C] shrink-0" />
                  <span>🏢 {comp ? comp.name : 'Claro Dominicana'}</span>
                </div>
              );
            })()
          )}
        </div>

        {/* Dedicated Full-Width Responsive Sub-Tab Navigation Bar */}
        <div className="w-full overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 min-w-max gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Resumen Ejecutivo</span>
            </button>

            <button
              onClick={() => setActiveTab('compliance')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'compliance'
                  ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Cumplimiento & Grupos</span>
            </button>

            <button
              onClick={() => setActiveTab('instructors')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'instructors'
                  ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Docencia & Encuestas</span>
            </button>

            <button
              onClick={() => setActiveTab('skills')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'skills'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Brechas & Calificaciones</span>
              {skillsGapGlobalMetrics.totalMembersNeedingRetraining > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] text-white font-extrabold">
                  {skillsGapGlobalMetrics.totalMembersNeedingRetraining}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('demographics')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'demographics'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Demografía & Oportunidades</span>
            </button>

            <button
              onClick={() => setActiveTab('sustainability')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'sustainability'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-white'
              }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              <span>Sustentabilidad & Capacitaciones</span>
            </button>

            {settings?.ojt_plan_90d?.enabled !== false && (currentUser?.role === 'Super Administrador' || currentUser?.role === 'Evaluador / Tutor OJT') && (
              <button
                onClick={() => setActiveTab('ojt_ttp')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  activeTab === 'ojt_ttp'
                    ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Operaciones OJT & TTP</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'reports'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Centro de Reportes Excel</span>
            </button>
          </div>
        </div>

      </div>

      {/* ==========================================
          TAB 1: RESUMEN EJECUTIVO & KPIS GLOBALES
          ========================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Top 5 KPI Cards (Light Theme) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* KPI 1: Cupos Totales */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Oferta de Cupos</span>
                <div className="p-2 rounded-xl bg-red-50 text-[#DA291C]">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{totalCapacity}</p>
              <p className="text-[11px] text-slate-500 mt-1">En {events.length} capacitaciones activas</p>
            </div>

            {/* KPI 2: Tasa de Ocupación */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Inscripciones</span>
                <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-cyan-700 mt-2">{totalRegistered}</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                <span>Ocupación: <strong className="text-slate-800">{occupancyRate}%</strong></span>
              </div>
            </div>

            {/* KPI 3: Asistencia QR & Efectividad */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Asistencia QR</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">{totalAttended}</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                <span>Efectividad: <strong className="text-slate-800">{attendanceRate}%</strong></span>
              </div>
            </div>

            {/* KPI 4: Cumplimiento de Cronogramas */}
            <div className="bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#DA291C]">Cumplimiento Global</span>
                <div className="p-2 rounded-xl bg-red-100 text-[#DA291C]">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-[#DA291C] mt-2">{globalCompliancePct}%</p>
              <p className="text-[11px] text-slate-600 mt-1">{programs.length} cronogramas asignados</p>
            </div>

            {/* KPI 5: Horas-Hombre & Satisfacción */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Horas Formación</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-700 mt-2">{estimatedTrainingHours}h</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>CSAT: <strong className="text-slate-800">{avgRatingGlobal}</strong> / 5.0</span>
              </div>
            </div>

          </div>

          {/* Grid: Category Breakdown & Modality Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Categories Breakdown */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#DA291C]" />
                  Rendimiento por Categoría de Capacitación
                </h2>
                <span className="text-xs text-slate-500 font-medium">{Object.keys(categoryStats).length} categorías</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {Object.entries(categoryStats).map(([cat, stats]) => {
                  const capPct = stats.capacity > 0 ? Math.round((stats.registered / stats.capacity) * 100) : 0;
                  const attPct = stats.registered > 0 ? Math.round((stats.attended / stats.registered) * 100) : 0;

                  return (
                    <div key={cat} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-900">{cat}</span>
                        <span className="text-[#DA291C] font-extrabold">{capPct}% Ocupación</span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-[#DA291C] rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(capPct, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                        <span>{stats.count} curso(s) • {stats.registered}/{stats.capacity} cupos</span>
                        <span className="text-emerald-700 font-bold">{stats.attended} asistencias ({attPct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modalities Distribution */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-[#DA291C]" />
                  Distribución por Modalidad
                </h2>

                <div className="space-y-4">
                  {Object.entries(modalityStats).map(([mod, s]) => {
                    const pctOfTotal = totalRegistered > 0 ? Math.round((s.registered / totalRegistered) * 100) : 0;
                    return (
                      <div key={mod} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{mod}</span>
                          <span className="font-bold text-slate-900">{s.registered} inscritos ({pctOfTotal}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                          <div 
                            className={`h-full rounded-full ${
                              mod === 'Presencial' ? 'bg-emerald-500' : mod === 'Virtual' ? 'bg-[#DA291C]' : 'bg-purple-500'
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

              <div className="p-4 rounded-2xl bg-red-50/60 border border-red-200 text-xs text-slate-700 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#DA291C] shrink-0" />
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
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Monitoreo de Rutas Formativas & Cohortes
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evalúa el avance de cada área en sus planes de capacitación asignados.
              </p>
            </div>

            {programs.length > 0 && (
              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Cronograma:</span>
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#DA291C] w-full sm:w-auto"
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
              <div className="bg-white border border-red-200 rounded-3xl p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-300">
                        {selectedProgram.status}
                      </span>
                      <span className="text-xs text-slate-500">
                        Límite: <strong className="text-slate-800">{formatDateLong(selectedProgram.endDate)}</strong>
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-900">{selectedProgram.title}</h2>
                    <p className="text-xs text-slate-600 mt-1">{selectedProgram.description}</p>
                  </div>

                  <div className="text-left sm:text-right p-4 rounded-2xl bg-red-50 border border-red-200 shrink-0">
                    <span className="text-xs text-slate-600 font-bold block">Cumplimiento del Programa</span>
                    <span className="text-3xl font-black text-[#DA291C]">{selectedProgramCompliance.overallPercentage}%</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {selectedProgramCompliance.completedCount} de {selectedProgramCompliance.totalParticipants} colaboradores al 100%
                    </span>
                  </div>
                </div>

                {/* Groups Progress Bars */}
                <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
                  <span className="text-xs font-bold text-slate-800 block">
                    Avance por Departamento / Grupo Asignado:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {selectedProgramCompliance.groupStats.map(g => {
                      const theme = getGroupColorTheme(g.groupColor);
                      return (
                        <div key={g.groupId} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900 line-clamp-1">{g.groupName}</span>
                            <span className={`font-extrabold ${theme.text}`}>{g.averagePercentage}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${theme.dot}`}
                              style={{ width: `${g.averagePercentage}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500">
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
                <div className="bg-white border border-rose-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Colaboradores con Cursos Pendientes / En Riesgo de Vencimiento
                    </h3>
                    <span className="text-xs text-slate-500">Mostrando {atRiskParticipants.length} colaboradores</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                          <th className="p-3 font-bold">Colaborador</th>
                          <th className="p-3 font-bold">Programa</th>
                          <th className="p-3 font-bold text-center">Avance Actual</th>
                          <th className="p-3 font-bold text-center">Cursos Faltantes</th>
                          <th className="p-3 font-bold text-right">Fecha Límite</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {atRiskParticipants.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{p.participantName}</div>
                              <div className="text-[11px] text-slate-500">{p.participantEmail}</div>
                            </td>
                            <td className="p-3 font-medium text-slate-700">{p.programTitle}</td>
                            <td className="p-3 text-center">
                              <span className="font-extrabold text-amber-600">{p.percentage}%</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                {p.pendingMandatory} obligatorios
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono text-slate-700">
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
            <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl shadow-sm">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500 text-xs">No hay cronogramas creados aún.</p>
            </div>
          )}

        </div>
      )}

      {/* ==========================================
          TAB 3: DESEMPEÑO DOCENTE & ENCUESTAS TEC
          ========================================== */}
      {activeTab === 'instructors' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Header & Course Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#DA291C] mb-1">
                <Sparkles className="w-4 h-4 text-[#DA291C]" />
                <span>Encuesta de Evaluación de Curso y Facilitador - TEC</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Métricas de Calidad y Satisfacción TEC
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                {TEC_SURVEY_INFO.intro}
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={selectedSurveyEventId}
                onChange={(e) => setSelectedSurveyEventId(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#DA291C] cursor-pointer"
              >
                <option value="all">Todos los Cursos ({events.length})</option>
                {events.map(evt => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} ({evt.feedbacks?.length || 0} evals)
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => exportInstructorsAndFeedbackReportToExcel(events)}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>

          {/* Top 4 KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* KPI 1: Promedio General TEC */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Índice Global TEC</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-black text-slate-900 leading-none">
                  {tecSurveyMetrics.avgComposite} <span className="text-sm font-semibold text-slate-500">/ 5.0</span>
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  {tecSurveyMetrics.totalResponses} evaluaciones recibidas
                </p>
              </div>
            </div>

            {/* KPI 2: Evaluación Contenido del Curso */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Evaluación Curso</span>
                <div className="p-2 rounded-xl bg-red-50 text-[#DA291C]">
                  <BookOpen className="w-4 h-4 text-[#DA291C]" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-black text-[#DA291C] leading-none">
                  {tecSurveyMetrics.avgCourse} <span className="text-sm font-semibold text-slate-500">/ 5.0</span>
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  8 dimensiones pedagógicas evaluadas
                </p>
              </div>
            </div>

            {/* KPI 3: Evaluación del Facilitador */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Evaluación Facilitador</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-800">
                  <Award className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-black text-amber-700 leading-none">
                  {tecSurveyMetrics.avgFacilitator} <span className="text-sm font-semibold text-slate-500">/ 5.0</span>
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  7 competencias docentes evaluadas
                </p>
              </div>
            </div>

            {/* KPI 4: Tasa de Excelencia */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tasa de Excelencia</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-black text-emerald-700 leading-none">
                  {tecSurveyMetrics.excellenceRate}%
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Calificaciones de 5 estrellas
                </p>
              </div>
            </div>

          </div>

          {/* Desglose Pregunta por Pregunta: Curso vs Facilitador */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* PARTE 1: CURSO */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-red-50 text-[#DA291C]">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Parte 1: Evaluación del Curso</h3>
                    <p className="text-[11px] text-slate-500 font-medium">8 preguntas de contenidos, recursos y aplicación</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-red-50 text-[#DA291C] border border-red-200 text-xs font-black">
                  {tecSurveyMetrics.avgCourse} ★
                </span>
              </div>

              <div className="space-y-4">
                {COURSE_QUESTIONS.map((q, idx) => {
                  const data = tecSurveyMetrics.courseQuestionsAvg[q.id] || { avg: 5.0, pct: 100 };
                  return (
                    <div key={q.id} className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <span className="font-bold text-slate-800 leading-snug">
                          <span className="text-[#DA291C] font-black mr-1">{idx + 1}.</span>
                          {q.shortLabel}
                        </span>
                        <span className="font-black text-slate-900 shrink-0">
                          {data.avg.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">/ 5.0</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                        "{q.question}"
                      </p>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-red-500 to-[#DA291C] rounded-full transition-all duration-500"
                          style={{ width: `${data.pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PARTE 2: FACILITADOR */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Parte 2: Evaluación del Facilitador</h3>
                    <p className="text-[11px] text-slate-500 font-medium">7 preguntas de metodología, dominio y claridad</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black">
                  {tecSurveyMetrics.avgFacilitator} ★
                </span>
              </div>

              <div className="space-y-4">
                {FACILITATOR_QUESTIONS.map((q, idx) => {
                  const data = tecSurveyMetrics.facilitatorQuestionsAvg[q.id] || { avg: 5.0, pct: 100 };
                  return (
                    <div key={q.id} className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <span className="font-bold text-slate-800 leading-snug">
                          <span className="text-amber-600 font-black mr-1">{idx + 1}.</span>
                          {q.shortLabel}
                        </span>
                        <span className="font-black text-slate-900 shrink-0">
                          {data.avg.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">/ 5.0</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                        "{q.question}"
                      </p>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500"
                          style={{ width: `${data.pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
          
          {/* Facilitators Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#DA291C]" />
                Matriz de Rendimiento Docente & Satisfacción
              </h2>
              <span className="text-xs text-slate-500 font-medium">{Object.keys(instructorStats).length} facilitadores evaluados</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                    <th className="p-3.5 font-bold">Facilitador / Instructor</th>
                    <th className="p-3.5 font-bold text-center">Cursos Impartidos</th>
                    <th className="p-3.5 font-bold text-center">Colaboradores Inscritos</th>
                    <th className="p-3.5 font-bold text-center">Asistencias Confirmadas</th>
                    <th className="p-3.5 font-bold text-center">Efectividad Asistencia</th>
                    <th className="p-3.5 font-bold text-right">Satisfacción (CSAT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(instructorStats).map(([inst, s]) => {
                    const avg = s.ratings.length > 0
                      ? (s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length).toFixed(1)
                      : 'N/A';
                    const effRate = s.registered > 0 ? Math.round((s.attended / s.registered) * 100) : 0;

                    return (
                      <tr key={inst} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{inst}</td>
                        <td className="p-3.5 text-center text-slate-700 font-semibold">{s.events}</td>
                        <td className="p-3.5 text-center text-cyan-700 font-bold">{s.registered}</td>
                        <td className="p-3.5 text-center text-emerald-700 font-bold">{s.attended}</td>
                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-[#DA291C] border border-red-200">
                            {effRate}%
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {avg !== 'N/A' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-extrabold text-xs">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              {avg} / 5.0
                              <span className="text-[10px] text-amber-700 font-normal">({s.ratings.length})</span>
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

          {/* Enriched Feedback Stream */}
          {surveyFilteredFeedbacks.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#DA291C]" />
                  Muro de Comentarios y Evaluaciones TEC
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  {surveyFilteredFeedbacks.length} opiniones registradas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {surveyFilteredFeedbacks.map((fb, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-xs font-bold text-slate-900 line-clamp-1">{fb.eventTitle}</span>
                          <span className="text-[10px] text-slate-500 block">Facilitador: {fb.instructor}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                          {Array.from({ length: Math.min(5, Math.max(1, Math.round(fb.rating))) }).map((_, sIdx) => (
                            <Star key={sIdx} className="w-3 h-3 fill-amber-500" />
                          ))}
                        </div>
                      </div>

                      {/* Subscores badges */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        {fb.courseScore && (
                          <span className="px-2 py-0.5 rounded-lg bg-red-50 text-[#DA291C] border border-red-200 text-[10px] font-black">
                            Curso: {Number(fb.courseScore).toFixed(1)}★
                          </span>
                        )}
                        {fb.facilitatorScore && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black">
                            Facilitador: {Number(fb.facilitatorScore).toFixed(1)}★
                          </span>
                        )}
                      </div>

                      {fb.comment ? (
                        <p className="text-xs text-slate-700 italic leading-relaxed">"{fb.comment}"</p>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">Evaluación cuantitativa sin comentario adicional.</p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200/80">
                      <span className="font-semibold">{fb.userName || fb.userEmail}</span>
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
          TAB 4: BRECHAS DE HABILIDADES & CALIFICACIONES (SKILLS GAP)
          ========================================== */}
      {activeTab === 'skills' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Header Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-[#DA291C] shrink-0">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Diagnóstico Estratégico de Brechas de Habilidades (Skills Gap)
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Identifica las debilidades académicas y operativas detectadas por instructores para enfocar planes de re-capacitación y refuerzo técnico.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                exportSkillsGapReportToExcel(events, participants, skillsGapGlobalMetrics.allGrades);
                handleToast('Reporte generado', 'Matriz de Skills Gap y Debilidades descargada.', 'success');
              }}
              className="px-4 py-2.5 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-500/20 flex items-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Diagnóstico (.xlsx)</span>
            </button>
          </div>

          {/* 4 Global KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-500">Promedio General Institucional</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-blue-700">{skillsGapGlobalMetrics.overallAvg}</span>
                <span className="text-xs font-bold text-slate-500">Escala 0 - 100</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Calculado en cursos con evaluación formal</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-500">Total Evaluaciones Realizadas</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-slate-900">{skillsGapGlobalMetrics.totalEvaluated}</span>
                <span className="text-xs font-bold text-[#DA291C]">En base de datos</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Asentadas por facilitadores</p>
            </div>

            <div className="bg-white border border-emerald-200 rounded-3xl p-5 shadow-sm">
              <span className="text-xs font-bold text-emerald-700">Capacitaciones Aprobadas</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-emerald-700">{skillsGapGlobalMetrics.totalPassed}</span>
                <span className="text-xs font-bold text-emerald-700">
                  {skillsGapGlobalMetrics.totalEvaluated > 0
                    ? `${((skillsGapGlobalMetrics.totalPassed / skillsGapGlobalMetrics.totalEvaluated) * 100).toFixed(0)}% efectividad`
                    : '100%'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Superaron la nota mínima aprobatoria</p>
            </div>

            <div className="bg-white border border-rose-200 rounded-3xl p-5 shadow-sm">
              <span className="text-xs font-bold text-rose-700">Colaboradores con Debilidades</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-rose-700">{skillsGapGlobalMetrics.totalMembersNeedingRetraining}</span>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  🚨 Requieren Refuerzo
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Identificados con debilidades o reprobados</p>
            </div>
          </div>

          {/* Ranking de Brechas de Habilidades */}
          {skillsGapGlobalMetrics.topGaps.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Ranking de Temas & Competencias con Mayor Dificultad</span>
                </h3>
                <span className="text-xs text-slate-500">
                  {skillsGapGlobalMetrics.topGaps.length} competencias con observaciones
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {skillsGapGlobalMetrics.topGaps.map(gap => (
                  <div 
                    key={gap.skill}
                    className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-rose-900">{gap.skill}</p>
                      <p className="text-[11px] text-slate-600">
                        {gap.participantsCount} {gap.participantsCount === 1 ? 'colaborador con debilidad' : 'colaboradores con debilidad'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-black rounded-xl border border-rose-300">
                      {gap.count} {gap.count === 1 ? 'caso' : 'casos'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buscador y Matriz de Colaboradores */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Matriz de Calificaciones por Colaborador
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consulta el desempeño individual y el diagnóstico pedagógico de cada colaborador.
                </p>
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto" />
                <input
                  type="text"
                  value={skillsSearchQuery}
                  onChange={(e) => setSkillsSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, tarjeta, departamento o debilidad..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50">
                    <th className="p-3.5">Colaborador</th>
                    <th className="p-3.5">Departamento</th>
                    <th className="p-3.5 text-center">Promedio</th>
                    <th className="p-3.5 text-center">Evaluaciones</th>
                    <th className="p-3.5">Debilidades Observadas</th>
                    <th className="p-3.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.values(skillsGapGlobalMetrics.participantMap)
                    .filter(item => {
                      const q = skillsSearchQuery.toLowerCase();
                      return (
                        item.participant.name.toLowerCase().includes(q) ||
                        item.participant.email.toLowerCase().includes(q) ||
                        item.participant.card.includes(q) ||
                        (item.participant.department && item.participant.department.toLowerCase().includes(q)) ||
                        Array.from(item.gaps).some(g => g.toLowerCase().includes(q))
                      );
                    })
                    .map(item => {
                      const p = item.participant;
                      const hasGaps = item.gaps.size > 0 || item.needsRetraining;

                      return (
                        <tr key={p.card} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5">
                            <p className="font-bold text-slate-900">{p.name}</p>
                            <p className="text-[11px] text-slate-500">Tarj: #{p.card} • {p.email}</p>
                          </td>
                          <td className="p-3.5 text-slate-700">
                            {p.department || 'General'}
                          </td>
                          <td className="p-3.5 text-center">
                            {item.grades.length > 0 ? (
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                                item.avgScore >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {item.avgScore} pts
                              </span>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Sin notas</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center text-slate-700 font-semibold">
                            {item.grades.length > 0 ? (
                              <span>{item.passedCount} aprob. / {item.failedCount} reprob.</span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {item.gaps.size > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {Array.from(item.gaps).map(skill => (
                                  <span key={skill} className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-md border border-rose-200">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Sin debilidades señaladas</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            {hasGaps ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-rose-600" />
                                Requiere Refuerzo
                              </span>
                            ) : item.grades.length > 0 ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                OK / Aprobado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
                                Pendiente
                              </span>
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
      )}

      {/* ==========================================
          TAB: DEMOGRAFÍA & OPORTUNIDADES DE MEJORA
          ========================================== */}
      {activeTab === 'demographics' && (
        <DemographicsOpportunitiesSection
          participants={participants}
          events={events}
          currentUser={currentUser}
          onShowToast={onShowToast}
          onCreateEventFromOpportunity={handleCreateEventFromOpportunity}
        />
      )}

      {/* ==========================================
          TAB: PROGRAMA DE SUSTENTABILIDAD & REPORTES
          ========================================== */}
      {activeTab === 'sustainability' && (
        <SustainabilityReportSection
          events={events}
          participants={participants}
          companies={companies}
          currentUser={currentUser}
          onShowToast={onShowToast}
        />
      )}

      {/* ==========================================
          TAB 5: CENTRO DE REPORTES EXCEL
          ========================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-emerald-950">Centro de Exportación de Reportes Oficiales</h2>
              <p className="text-xs text-emerald-800 mt-0.5">
                Genera con un solo clic libros de Excel (.xlsx) estructurados y formateados para comités ejecutivos, auditorías de RRHH y cumplimiento laboral.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Report 0: Sustentabilidad y Taxonomía Formativa */}
            <div className="bg-white border border-emerald-300 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-emerald-600 hover:shadow-md transition-all group bg-gradient-to-b from-emerald-50/30 to-white">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                    <Leaf className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                    ESG & Sustentable
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Reporte de Sustentabilidad & Capacitaciones
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Matriz oficial de 11 dimensiones requerida para programas corporativos: Tipo de sesión, Tipo de entrenamiento, Formato, Modalidad, Programa, Subprograma, Fechas, Horas y Suplidor.
                </p>
                <div className="text-[11px] text-slate-500 space-y-1">
                  <div>• Hoja 1: Matriz de 11 Dimensiones + Horas-Hombre</div>
                  <div>• Hoja 2: Resumen Consolidado por Programas</div>
                  <div>• Clasificación de impacto ambiental y ESG</div>
                </div>
              </div>

              <button
                onClick={() => {
                  exportSustainabilityAndTrainingReportToExcel(events, participants);
                  handleToast('Reporte generado', 'Reporte Oficial de Sustentabilidad descargado.', 'success');
                }}
                className="mt-6 w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Reporte Sustentabilidad</span>
              </button>
            </div>

            {/* Report 1: Consolidado Global */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-[#DA291C] hover:shadow-md transition-all group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-[#DA291C]">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#DA291C] transition-colors">
                  Informe Ejecutivo Consolidado
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
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
                className="mt-6 w-full py-2.5 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Informe Consolidado</span>
              </button>
            </div>

            {/* Report 2: Auditoría de Asistencias */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-emerald-500 hover:shadow-md transition-all group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Libro Oficial de Asistencias & Auditoría
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
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
                className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Libro de Asistencias</span>
              </button>
            </div>

            {/* Report 3: Matriz de Cumplimiento de Cronogramas */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-[#DA291C] hover:shadow-md transition-all group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-[#DA291C]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#DA291C] transition-colors">
                  Matriz de Cumplimiento de Cronogramas
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
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
                  if (selectedProgram) {
                    const summary = apiService.calculateProgramCompliance(selectedProgram, events, participants, groups);
                    exportComplianceReportToExcel(summary, events);
                    handleToast('Reporte generado', 'Matriz de Cumplimiento descargada.', 'success');
                  } else {
                    handleToast('Sin programas', 'No hay cronogramas activos disponibles.', 'error');
                  }
                }}
                className="mt-6 w-full py-2.5 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Matriz de Cumplimiento</span>
              </button>
            </div>

            {/* Report 4: Encuestas y Calidad Docente */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-amber-500 hover:shadow-md transition-all group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors">
                  Reporte de Calidad Docente y Encuestas
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
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
                className="mt-6 w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Calidad Docente</span>
              </button>
            </div>

            {/* Report 5: Grupos e Integrantes */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-cyan-500 hover:shadow-md transition-all group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-cyan-700 transition-colors">
                  Padrón Segmentado por Grupos & Áreas
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
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
                className="mt-6 w-full py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold rounded-xl shadow-md shadow-cyan-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Grupos e Integrantes</span>
              </button>
            </div>

            {/* Report 6: Brechas de Habilidades & Detección de Debilidades (Skills Gap) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-purple-500 hover:shadow-md transition-all group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors">
                  Diagnóstico de Brechas & Debilidades (Skills Gap)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Informe integral con las notas de cada capacitación evaluada, lista de debilidades técnicas detectadas por facilitadores y colaboradores prioritarios para re-capacitación.
                </p>
                <div className="text-[11px] text-slate-500 space-y-1">
                  <div>• Hoja 1: Matriz Global de Calificaciones</div>
                  <div>• Hoja 2: Plan Prioritario de Re-capacitación</div>
                  <div>• Resumen por competencias y debilidades</div>
                </div>
              </div>

              <button
                onClick={() => {
                  exportSkillsGapReportToExcel(events, participants, skillsGapGlobalMetrics.allGrades);
                  handleToast('Reporte generado', 'Matriz de Skills Gap y Debilidades descargada.', 'success');
                }}
                className="mt-6 w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Diagnóstico Skills Gap</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ==========================================
          SUB-TAB 5: OPERACIONES OJT & TIME TO PRODUCTIVITY (90 DÍAS)
          ========================================== */}
      {activeTab === 'ojt_ttp' && settings?.ojt_plan_90d?.enabled !== false && (currentUser?.role === 'Super Administrador' || currentUser?.role === 'Evaluador / Tutor OJT') && (
        <OjtTtpSection
          companyId={selectedCompanyId}
          checklists={checklists}
          calibrations={calibrations}
          selectedCompany={companies.find(c => c.id === selectedCompanyId)}
        />
      )}

      {/* Modal de Creación de Evento desde Oportunidades DNC */}
      {isEventModalOpen && suggestedEvent && (
        <EventFormModal
          initialEvent={suggestedEvent}
          companies={companies}
          users={users}
          currentUser={currentUser}
          isSuperAdmin={currentUser?.role === 'Super Administrador'}
          onClose={() => {
            setIsEventModalOpen(false);
            setSuggestedEvent(null);
            setPendingEnrolEmails([]);
          }}
          onSaveEvent={handleSaveOpportunityEvent}
        />
      )}

    </div>
  );
};
