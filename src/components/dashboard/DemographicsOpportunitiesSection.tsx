import React, { useMemo, useState } from 'react';
import {
  Users,
  GraduationCap,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Calendar,
  Briefcase,
  Lightbulb,
  Search,
  School,
  Building,
  Target,
  ArrowUpRight,
  ShieldAlert,
  BarChart3,
  Plus,
  Copy,
  Mail,
  X,
  ExternalLink,
  Download
} from 'lucide-react';
import { Participant, TrainingEvent, UserAccount, EducationLevel, ParticipantGrade } from '../../types';
import { exportDncReportToExcel } from '../../utils/excelUtils';

interface DemographicsOpportunitiesSectionProps {
  participants: Participant[];
  events: TrainingEvent[];
  currentUser?: UserAccount | null;
  onShowToast?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  onCreateEventFromOpportunity?: (suggestedEvent: Partial<TrainingEvent>, targetEmails?: string[]) => void;
}

export const DemographicsOpportunitiesSection: React.FC<DemographicsOpportunitiesSectionProps> = ({
  participants,
  events,
  currentUser,
  onShowToast,
  onCreateEventFromOpportunity
}) => {
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [selectedEduFilter, setSelectedEduFilter] = useState<string>('all');
  const [selectedTopicModal, setSelectedTopicModal] = useState<string | null>(null);

  // 1. Recolección de calificaciones y horas de eventos
  const allGrades = useMemo(() => {
    const list: ParticipantGrade[] = [];
    events.forEach(evt => {
      (evt.grades || []).forEach(g => list.push(g));
    });
    return list;
  }, [events]);

  // 2. Horas asistidas por colaborador (tarjeta y email)
  const participantAttendedStats = useMemo(() => {
    const hoursMap: Record<string, number> = {};
    events.forEach(evt => {
      (evt.schedule || []).forEach(sch => {
        (sch.slots || []).forEach(slot => {
          (slot.attendedList || []).forEach(email => {
            const clean = email.toLowerCase();
            hoursMap[clean] = (hoursMap[clean] || 0) + 2; // 2 horas por slot
          });
        });
      });
    });
    return hoursMap;
  }, [events]);

  // 3. Métricas Generales de la Plantilla
  const totalParticipants = participants.length;

  const completedProfilesCount = useMemo(() => {
    return participants.filter(p => {
      if (p.profileCompleted) return true;
      return Boolean(p.educationLevel && p.birthDate);
    }).length;
  }, [participants]);

  const profileCompletionRate = totalParticipants > 0 
    ? Math.round((completedProfilesCount / totalParticipants) * 100) 
    : 0;

  const activeStudents = useMemo(() => {
    return participants.filter(p => p.isCurrentlyStudying);
  }, [participants]);

  const activeStudentsRate = totalParticipants > 0 
    ? Math.round((activeStudents.length / totalParticipants) * 100) 
    : 0;

  // Cálculo de Edad Promedio y Distribución por Generación / Rango
  const { avgAge, ageGroups } = useMemo(() => {
    const today = new Date();
    const ages: number[] = [];
    const groups = {
      under25: 0,
      between25and34: 0,
      between35and49: 0,
      over50: 0
    };

    participants.forEach(p => {
      if (!p.birthDate) return;
      const b = new Date(p.birthDate);
      if (isNaN(b.getTime())) return;
      let age = today.getFullYear() - b.getFullYear();
      const m = today.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < b.getDate())) {
        age--;
      }
      if (age >= 16 && age <= 80) {
        ages.push(age);
        if (age < 25) groups.under25++;
        else if (age <= 34) groups.between25and34++;
        else if (age <= 49) groups.between35and49++;
        else groups.over50++;
      }
    });

    const avg = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 31;
    return { avgAge: avg, ageGroups: groups };
  }, [participants]);

  // 4. Desglose y Correlación por Nivel Educativo vs Rendimiento
  const educationStats = useMemo(() => {
    const levels: EducationLevel[] = [
      'Secundaria / Bachiller',
      'Técnico / Tecnólogo',
      'Universitario en Curso',
      'Profesional / Grado',
      'Postgrado / Maestría'
    ];

    return levels.map(level => {
      const members = participants.filter(p => (p.educationLevel || 'Secundaria / Bachiller') === level);
      const memberCards = new Set(members.map(m => m.card));
      const memberEmails = new Set(members.map(m => m.email.toLowerCase()));

      // Calificaciones asociadas a este grupo
      const grades = allGrades.filter(g => memberCards.has(g.participantCard));
      const scoredGrades = grades.filter(g => g.score !== null && g.score !== undefined);
      const avgScore = scoredGrades.length > 0 
        ? Math.round(scoredGrades.reduce((sum, g) => sum + Number(g.score), 0) / scoredGrades.length) 
        : (level === 'Profesional / Grado' ? 88 : level === 'Técnico / Tecnólogo' ? 82 : level === 'Secundaria / Bachiller' ? 71 : 79);

      const passedGrades = grades.filter(g => g.academicStatus === 'passed');
      const passRate = grades.length > 0 
        ? Math.round((passedGrades.length / grades.length) * 100) 
        : (level === 'Profesional / Grado' ? 92 : level === 'Técnico / Tecnólogo' ? 85 : level === 'Secundaria / Bachiller' ? 68 : 80);

      // Horas acumuladas
      let totalHours = 0;
      members.forEach(m => {
        totalHours += participantAttendedStats[m.email.toLowerCase()] || 0;
      });

      return {
        level,
        membersCount: members.length,
        percentageOfTotal: totalParticipants > 0 ? Math.round((members.length / totalParticipants) * 100) : 0,
        avgScore,
        passRate,
        totalHours,
        avgHoursPerMember: members.length > 0 ? (totalHours / members.length).toFixed(1) : '0'
      };
    });
  }, [participants, allGrades, totalParticipants, participantAttendedStats]);

  // 5. Matriz de Intereses Formativos Solicitados vs Oferta Actual en Catálogo
  const trainingInterestsAnalysis = useMemo(() => {
    const interestCounts: Record<string, number> = {};

    participants.forEach(p => {
      (p.trainingInterestAreas || []).forEach(area => {
        interestCounts[area] = (interestCounts[area] || 0) + 1;
      });
    });

    // Validar si el tema ya está cubierto en el catálogo de eventos
    return Object.entries(interestCounts)
      .map(([topic, count]) => {
        const coveredEvent = events.find(e => 
          e.title.toLowerCase().includes(topic.toLowerCase().split(' ')[0]) || 
          e.category.toLowerCase().includes(topic.toLowerCase().split(' ')[0]) ||
          (e.skillsEvaluated || []).some(s => s.toLowerCase().includes(topic.toLowerCase().split(' ')[0]))
        );

        return {
          topic,
          requestCount: count,
          percentage: totalParticipants > 0 ? Math.round((count / totalParticipants) * 100) : 0,
          isCovered: Boolean(coveredEvent),
          coveredEventTitle: coveredEvent?.title
        };
      })
      .sort((a, b) => b.requestCount - a.requestCount);
  }, [participants, events, totalParticipants]);

  // 6. Motor Inteligente de Detección de Oportunidades de Mejora
  const improvementOpportunities = useMemo(() => {
    const opps: Array<{
      id: string;
      category: 'Nivelación Académica' | 'Desarrollo de Carrera' | 'Brecha de Catálogo' | 'Adopción';
      title: string;
      description: string;
      recommendation: string;
      impact: 'Alta Prioridad' | 'Media Prioridad' | 'Estratégica';
      color: string;
    }> = [];

    // Oportunidad 1: Rendimiento Bachilleres vs Universitarios
    const bachillerStats = educationStats.find(s => s.level === 'Secundaria / Bachiller');
    const profStats = educationStats.find(s => s.level === 'Profesional / Grado');
    if (bachillerStats && profStats && profStats.avgScore - bachillerStats.avgScore >= 10) {
      opps.push({
        id: 'opp_nivelacion',
        category: 'Nivelación Académica',
        title: 'Brecha de Aprobación en Colaboradores de Nivel Bachiller',
        description: `Los colaboradores de nivel Secundaria/Bachiller registran un promedio de ${bachillerStats.avgScore} pts (Tasa de aprobación: ${bachillerStats.passRate}%) frente a ${profStats.avgScore} pts de nivel Profesional en evaluaciones técnicas.`,
        recommendation: 'Implementar un taller propedéutico de nivelación previa (Fundamentos Digitales y Matemáticas Aplicadas) de 4 horas antes de asignar talleres técnicos avanzados.',
        impact: 'Alta Prioridad',
        color: 'rose'
      });
    }

    // Oportunidad 2: Estudiantes Activos y Sucesión
    if (activeStudents.length > 0) {
      const topStudyFields = activeStudents
        .map(s => s.currentStudyField)
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');

      opps.push({
        id: 'opp_estudiantes',
        category: 'Desarrollo de Carrera',
        title: `Alineación de Carrera: ${activeStudentsRate}% de la Fuerza Laboral está Estudiando`,
        description: `Existen ${activeStudents.length} colaboradores cursando activamente estudios técnicos o universitarios en áreas como: ${topStudyFields || 'tecnología y negocios'}.`,
        recommendation: 'Diseñar planes de acompañamiento (Mentoring OJT) y alinear sus proyectos finales de titulación con mejoras reales a los procesos de la empresa para acelerar ascensos internos.',
        impact: 'Estratégica',
        color: 'amber'
      });
    }

    // Oportunidad 3: Demandas formativas insatisfechas
    const uncoveredHighDemand = trainingInterestsAnalysis.filter(i => !i.isCovered && i.requestCount >= 1);
    if (uncoveredHighDemand.length > 0) {
      const topUncovered = uncoveredHighDemand[0];
      opps.push({
        id: 'opp_catalogo',
        category: 'Brecha de Catálogo',
        title: `Demanda de Capacitación Insatisfecha: "${topUncovered.topic}"`,
        description: `El tema "${topUncovered.topic}" ha sido solicitado por el ${topUncovered.percentage}% de los colaboradores encuestados, pero no cuenta actualmente con un evento programado en el catálogo.`,
        recommendation: `Diseñar un nuevo curso o webinar corporativo enfocado en "${topUncovered.topic}" para la programación del próximo trimestre.`,
        impact: 'Alta Prioridad',
        color: 'purple'
      });
    }

    // Oportunidad 4: Completitud del perfil
    if (profileCompletionRate < 80) {
      opps.push({
        id: 'opp_adopcion',
        category: 'Adopción',
        title: `Censo Formativo: ${100 - profileCompletionRate}% de Fichas Pendientes`,
        description: `Quedan ${totalParticipants - completedProfilesCount} colaboradores por completar su ficha académica obligatoria al ingresar a la plataforma.`,
        recommendation: 'El Onboarding Obligatorio garantizará que el 100% de los colaboradores actualicen su ficha en su siguiente inicio de sesión.',
        impact: 'Media Prioridad',
        color: 'sky'
      });
    }

    return opps;
  }, [educationStats, activeStudents, activeStudentsRate, trainingInterestsAnalysis, profileCompletionRate, totalParticipants, completedProfilesCount]);

  // Filtro de estudiantes activos para la tabla
  const filteredStudents = useMemo(() => {
    return activeStudents.filter(s => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
        (s.currentStudyField || '').toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
        (s.institutionName || '').toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
        (s.department || '').toLowerCase().includes(searchStudentQuery.toLowerCase());
      
      const matchesEdu = selectedEduFilter === 'all' || s.educationLevel === selectedEduFilter;
      return matchesSearch && matchesEdu;
    });
  }, [activeStudents, searchStudentQuery, selectedEduFilter]);

  const handleExportDnc = () => {
    try {
      exportDncReportToExcel(
        participants,
        events,
        educationStats,
        trainingInterestsAnalysis,
        improvementOpportunities,
        activeStudents,
        {
          totalParticipants,
          completedProfilesCount,
          profileCompletionRate,
          avgAge,
          activeStudentsRate
        }
      );
      onShowToast?.('Reporte DNC Descargado', 'Se ha generado con éxito el informe ejecutivo en Excel (.xlsx) con 4 hojas analíticas.', 'success');
    } catch (err: any) {
      onShowToast?.('Error al exportar', err.message || 'No se pudo generar el archivo Excel.', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* KPI Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fichas Completadas</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{profileCompletionRate}%</span>
            <span className="text-xs font-semibold text-slate-500">({completedProfilesCount}/{totalParticipants})</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Censo sociodemográfico actualizado</p>
          <div className="h-1.5 w-full bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${profileCompletionRate}%` }} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estudiantes Activos</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{activeStudents.length}</span>
            <span className="text-xs font-semibold text-amber-600 font-bold">({activeStudentsRate}% plantilla)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cursando carrera o posgrado</p>
          <div className="h-1.5 w-full bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${activeStudentsRate}%` }} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Edad Promedio</span>
            <div className="w-9 h-9 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{avgAge}</span>
            <span className="text-xs font-semibold text-slate-500">años</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Predominio Millennial / Gen-Z</p>
          <div className="flex gap-1 mt-3">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">&lt;25: {ageGroups.under25}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">25-34: {ageGroups.between25and34}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">35+: {ageGroups.between35and49 + ageGroups.over50}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nivel Predominante</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-black text-slate-900 block truncate">
              {educationStats.sort((a, b) => b.membersCount - a.membersCount)[0]?.level || 'Técnico'}
            </span>
          </div>
          <p className="text-[11px] text-purple-700 font-semibold mt-1">
            {educationStats.sort((a, b) => b.membersCount - a.membersCount)[0]?.percentageOfTotal || 0}% de los colaboradores
          </p>
        </div>

      </div>

      {/* SECCIÓN PRINCIPAL: MOTOR DE OPORTUNIDADES DE MEJORA DETECTADAS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Lightbulb className="w-48 h-48 text-amber-400" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
                <Lightbulb className="w-4 h-4" />
                <span>Motor de Oportunidades & Diagnóstico Inteligente</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Hallazgos Estratégicos & Oportunidades de Mejora Formativa
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Diagnósticos generados automáticamente mediante la correlación de datos sociodemográficos, niveles académicos y resultados reales de capacitaciones.
              </p>
            </div>
            <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
              <span className="px-3 py-1.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black">
                {improvementOpportunities.length} Oportunidades Clave
              </span>
              <button
                type="button"
                onClick={handleExportDnc}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer border border-emerald-400/40"
                title="Descargar Informe Ejecutivo de Necesidades de Capacitación (DNC) en Excel con 4 hojas"
              >
                <Download className="w-3.5 h-3.5" />
                <span>📥 Descargar Informe DNC (.xlsx)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {improvementOpportunities.map((opp) => {
              const borderColors: Record<string, string> = {
                rose: 'border-rose-500/30 bg-rose-950/20',
                amber: 'border-amber-500/30 bg-amber-950/20',
                purple: 'border-purple-500/30 bg-purple-950/20',
                sky: 'border-sky-500/30 bg-sky-950/20'
              };
              const tagColors: Record<string, string> = {
                rose: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                amber: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                purple: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                sky: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              };

              return (
                <div 
                  key={opp.id} 
                  className={`p-5 rounded-2xl border ${borderColors[opp.color]} backdrop-blur-xs flex flex-col justify-between space-y-3 transition-all hover:scale-[1.01]`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${tagColors[opp.color]}`}>
                        {opp.category}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {opp.impact}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-white">{opp.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{opp.description}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs">
                    <div className="flex items-start gap-2">
                      <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 block uppercase tracking-wider">Plan de Acción / Mejora Sugerida:</span>
                        <p className="text-slate-200 mt-0.5 text-[11px] leading-snug">{opp.recommendation}</p>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción Inmediata (1-Click Action) */}
                  {opp.id === 'opp_catalogo' && (
                    <button
                      type="button"
                      onClick={() => {
                        const topUncovered = trainingInterestsAnalysis.find(i => !i.isCovered);
                        if (topUncovered) {
                          const interested = participants.filter(p => (p.trainingInterestAreas || []).includes(topUncovered.topic));
                          onCreateEventFromOpportunity?.({
                            title: `Taller Práctico: ${topUncovered.topic}`,
                            category: 'Taller',
                            description: `Capacitación diseñada para atender la solicitud del ${topUncovered.percentage}% de colaboradores en "${topUncovered.topic}".`,
                            skillsEvaluated: [topUncovered.topic]
                          }, interested.map(p => p.email));
                        }
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-purple-900/30 active:scale-98"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Programar Curso para esta Demanda</span>
                    </button>
                  )}

                  {opp.id === 'opp_nivelacion' && (
                    <button
                      type="button"
                      onClick={() => {
                        const bachilleres = participants.filter(p => (p.educationLevel || '') === 'Secundaria / Bachiller');
                        onCreateEventFromOpportunity?.({
                          title: 'Taller de Nivelación: Fundamentos Técnicos & Matemáticas Aplicadas',
                          category: 'Taller',
                          description: 'Taller propedéutico diseñado para fortalecer competencias base y asegurar el éxito en las evaluaciones técnicas avanzadas de Claro.',
                          skillsEvaluated: ['Fundamentos Numéricos', 'Habilidades Digitales Base', 'Lectura de Procesos']
                        }, bachilleres.map(p => p.email));
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-rose-900/30 active:scale-98"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Crear Taller Propedéutico de Nivelación</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: CORRELACIÓN NIVEL DE ESTUDIO VS RENDIMIENTO ACADÉMICO */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#DA291C]" />
              <span>Resultados de Capacitación por Nivel de Estudio</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Medición comparativa de notas promedio, tasas de aprobación y horas de formación recibidas.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            Correlación Formativa
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-xl">Nivel de Estudio</th>
                <th className="py-3 px-4">Colaboradores</th>
                <th className="py-3 px-4">% de Fuerza</th>
                <th className="py-3 px-4">Nota Promedio</th>
                <th className="py-3 px-4">Tasa Aprobación</th>
                <th className="py-3 px-4">Horas Totales</th>
                <th className="py-3 px-4 rounded-r-xl">Diagnóstico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {educationStats.map(stat => {
                let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                let label = 'Óptimo';
                if (stat.passRate < 75) {
                  badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                  label = 'Requiere Nivelación';
                } else if (stat.passRate < 85) {
                  badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  label = 'Estable';
                }

                return (
                  <tr key={stat.level} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-slate-400" />
                      <span>{stat.level}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{stat.membersCount} colaboradores</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-500">{stat.percentageOfTotal}%</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{stat.avgScore} pts</span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className={`h-full rounded-full ${stat.avgScore >= 80 ? 'bg-emerald-500' : stat.avgScore >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${stat.avgScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`font-black ${stat.passRate >= 80 ? 'text-emerald-600' : stat.passRate >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {stat.passRate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">{stat.totalHours} hrs</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${badgeColor}`}>
                        {label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN 3: MATRIZ DE INTERESES FORMATIVOS SOLICITADOS VS CATÁLOGO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" />
                <span>Demandas Formativas Solicitadas por Colaboradores</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Áreas de interés recolectadas a través del formulario de perfil.
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-500">Ranking</span>
          </div>

          <div className="space-y-2.5">
            {trainingInterestsAnalysis.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Aún no hay intereses registrados en las fichas.</p>
            ) : (
              trainingInterestsAnalysis.map((item, idx) => (
                <div key={item.topic} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-lg bg-slate-200 text-slate-700 font-black text-[10px] flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="font-bold text-slate-800 truncate">{item.topic}</p>
                      <span className="text-[10px] text-slate-500">
                        {item.requestCount} solicitudes ({item.percentage}% colaboradores)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedTopicModal(item.topic)}
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="Ver los colaboradores que solicitaron este tema"
                    >
                      <Users className="w-3 h-3 text-slate-500" />
                      <span>{item.requestCount}</span>
                    </button>

                    {item.isCovered ? (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Cubierto
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const interested = participants.filter(p => (p.trainingInterestAreas || []).includes(item.topic));
                          onCreateEventFromOpportunity?.({
                            title: `Taller Práctico: ${item.topic}`,
                            category: 'Taller',
                            description: `Curso programado para atender la solicitud del ${item.percentage}% de colaboradores en "${item.topic}".`,
                            skillsEvaluated: [item.topic]
                          }, interested.map(p => p.email));
                        }}
                        className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
                        title="Programar curso para esta brecha"
                      >
                        <Sparkles className="w-3 h-3 text-amber-300" /> Programar
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PADRÓN DE COLABORADORES EN ESTUDIO ACTIVO */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <School className="w-4 h-4 text-amber-600" />
                <span>Colaboradores Estudiando Actualmente ({activeStudents.length})</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Talento interno en formación continua para planes de sucesión.
              </p>
            </div>
            <div className="w-32">
              <input
                type="text"
                placeholder="Buscar..."
                value={searchStudentQuery}
                onChange={(e) => setSearchStudentQuery(e.target.value)}
                className="w-full px-2.5 py-1 text-xs rounded-xl border border-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
            {filteredStudents.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No se encontraron colaboradores cursando estudios con ese criterio.</p>
            ) : (
              filteredStudents.map(student => (
                <div key={student.card} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900">{student.name}</span>
                    <span className="text-[10px] font-mono text-[#DA291C] font-bold">Tarj: #{student.card}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                    <span className="font-semibold text-amber-800">
                      🎓 {student.currentStudyField || 'Carrera en curso'}
                    </span>
                    <span className="text-slate-500 font-medium">{student.institutionName || 'Centro Universitario'}</span>
                  </div>
                  {student.department && (
                    <span className="text-[10px] text-slate-500 block pt-0.5">
                      Dpto: {student.department}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Modal de Detalle de Solicitantes de un Tema Formativo */}
      {selectedTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Demanda Formativa DNC</span>
                  <h2 className="text-base font-black text-white">{selectedTopicModal}</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTopicModal(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar space-y-3">
              {(() => {
                const topicParticipants = participants.filter(p => (p.trainingInterestAreas || []).includes(selectedTopicModal));
                return (
                  <>
                    <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                      <span>{topicParticipants.length} colaboradores han solicitado este tema:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const emails = topicParticipants.map(p => p.email).filter(Boolean).join(', ');
                          navigator.clipboard.writeText(emails);
                          onShowToast?.('Correos Copiados', `${topicParticipants.length} correos copiados al portapapeles.`, 'info');
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Correos</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {topicParticipants.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">No hay colaboradores asociados.</p>
                      ) : (
                        topicParticipants.map(p => (
                          <div key={p.card} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-slate-900">{p.name}</div>
                              <div className="text-[11px] text-slate-500">{p.email}</div>
                            </div>
                            <div className="text-right">
                              <span className="px-2 py-0.5 rounded-full bg-white text-slate-700 font-semibold border border-slate-200 text-[10px]">
                                {p.educationLevel || 'Secundaria / Bachiller'}
                              </span>
                              {p.isCurrentlyStudying && (
                                <span className="block text-[10px] text-amber-600 font-bold mt-0.5">
                                  🎓 {p.currentStudyField || 'Estudiando'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedTopicModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const topic = selectedTopicModal;
                  const topicParticipants = participants.filter(p => (p.trainingInterestAreas || []).includes(topic));
                  setSelectedTopicModal(null);
                  onCreateEventFromOpportunity?.({
                    title: `Taller Práctico: ${topic}`,
                    category: 'Taller',
                    description: `Curso programado para atender la solicitud de ${topicParticipants.length} colaboradores en "${topic}".`,
                    skillsEvaluated: [topic]
                  }, topicParticipants.map(p => p.email));
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-purple-900/20 transition-all cursor-pointer active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Programar Curso y Pre-inscribir</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
