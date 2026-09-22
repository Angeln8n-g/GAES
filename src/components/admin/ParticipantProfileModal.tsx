import React, { useState, useMemo } from "react";
import { 
  X, 
  User, 
  Mail, 
  CreditCard, 
  Building, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  UserX, 
  Calendar, 
  Award, 
  QrCode, 
  MessageSquare, 
  Send, 
  Edit3, 
  Sparkles, 
  Layers, 
  BookOpen, 
  GraduationCap, 
  Target, 
  TrendingUp, 
  AlertTriangle,
  FileText,
  MapPin,
  Phone
} from "lucide-react";
import { Participant, UserAccount, TrainingEvent, TrainingProgram, Company, ParticipantGrade, ExternalTraining, TechnicalAcademyHistoryRecord } from "../../types";
import { FormalLetterModal, TrainingHistoryRecord } from "../history/FormalLetterModal";
import { getProgramShortName } from "../../constants/sustainabilityPrograms";
import { AccessibleModal } from "../common/AccessibleModal";
import { isSafeHttpUrl } from "../../utils/formatters";

interface ParticipantProfileModalProps {
  participant: Participant | null;
  users: UserAccount[];
  events: TrainingEvent[];
  programs?: TrainingProgram[];
  companies?: Company[];
  externalTrainings?: ExternalTraining[];
  technicalHistory?: TechnicalAcademyHistoryRecord[];
  isOpen: boolean;
  onClose: () => void;
  onOpenEdit?: (participant: Participant) => void;
  currentUser?: UserAccount | null;
}

export const ParticipantProfileModal: React.FC<ParticipantProfileModalProps> = ({
  participant,
  users,
  events,
  programs = [],
  companies = [],
  externalTrainings = [],
  technicalHistory = [],
  isOpen,
  onClose,
  onOpenEdit,
  currentUser
}) => {
  if (!isOpen || !participant) return null;

  const isSuperAdmin = currentUser?.role === 'Super Administrador';

  const emailLower = participant.email.toLowerCase();
  const cardStr = participant.card;
  const linkedUser = users.find(u => u.email.toLowerCase() === emailLower);

  // Recopilar historial de capacitaciones y calificaciones del colaborador
  const { 
    attendedEvents, 
    registeredEvents, 
    internalHours,
    academicGrades,
    avgScore,
    passedCount,
    failedCount,
    allSkillGaps,
    hasRetrainingAlert
  } = useMemo(() => {
    const attended: Array<{ event: TrainingEvent; date: string; time: string; feedback?: any }> = [];
    const registered: Array<{ event: TrainingEvent; date: string; time: string; isMandatory?: boolean }> = [];
    const gradesList: Array<{ event: TrainingEvent; grade: ParticipantGrade }> = [];
    const gapsSet = new Set<string>();
    let retraining = false;

    events.forEach(evt => {
      // 1. Asistencias y Registros
      evt.schedule.forEach(sch => {
        sch.slots.forEach(slot => {
          const isAttended = (slot.attendedList || []).some(e => e.toLowerCase() === emailLower);
          const isReg = (slot.attendees || []).some(e => e.toLowerCase() === emailLower);
          const detail = (slot.attendeesDetails || []).find(d => d.email.toLowerCase() === emailLower);

          if (isAttended) {
            const fb = (evt.feedbacks || []).find(f => f.userEmail.toLowerCase() === emailLower);
            attended.push({
              event: evt,
              date: sch.date,
              time: slot.time,
              feedback: fb
            });
          } else if (isReg) {
            registered.push({
              event: evt,
              date: sch.date,
              time: slot.time,
              isMandatory: detail?.isMandatory
            });
          }
        });
      });

      // 2. Calificaciones registradas para este participante
      (evt.grades || []).forEach(g => {
        if (g.participantCard === cardStr || (g.participantEmail && g.participantEmail.toLowerCase() === emailLower)) {
          gradesList.push({
            event: evt,
            grade: g
          });
          if (g.needsRetraining || g.academicStatus === 'failed') retraining = true;
          (g.detectedSkillGaps || []).forEach(skill => gapsSet.add(skill));
        }
      });
    });

    const validScores = gradesList.filter(item => item.grade.score !== null && item.grade.score !== undefined);
    const sum = validScores.reduce((acc, curr) => acc + Number(curr.grade.score), 0);
    const avg = validScores.length > 0 ? (sum / validScores.length).toFixed(1) : '0.0';
    const passed = gradesList.filter(item => item.grade.academicStatus === 'passed').length;
    const failed = gradesList.filter(item => item.grade.academicStatus === 'failed').length;

    return {
      attendedEvents: attended,
      registeredEvents: registered,
      internalHours: attended.reduce((acc, a) => acc + (a.event.totalHours || 2), 0),
      academicGrades: gradesList,
      avgScore: avg,
      passedCount: passed,
      failedCount: failed,
      allSkillGaps: Array.from(gapsSet),
      hasRetrainingAlert: retraining || gapsSet.size > 0
    };
  }, [events, emailLower, cardStr]);

  // Filtrar capacitaciones externas de este participante
  const participantExternalTrainings = useMemo(() => {
    return (externalTrainings || []).filter(t => 
      t.participantCard === cardStr || 
      (t.participantEmail && t.participantEmail.toLowerCase() === emailLower)
    );
  }, [externalTrainings, cardStr, emailLower]);

  const externalHoursTotal = useMemo(() => {
    return participantExternalTrainings.reduce((acc, t) => acc + (Number(t.totalHours) || 0), 0);
  }, [participantExternalTrainings]);

  // Filtrar capacitaciones recurrentes (Academia Técnica) de este participante
  const participantTechnicalHistory = useMemo(() => {
    return (technicalHistory || []).filter(t => 
      (t.participantCard && t.participantCard === cardStr) || 
      (t.participantEmail && t.participantEmail.toLowerCase() === emailLower)
    );
  }, [technicalHistory, cardStr, emailLower]);

  const recurrentHoursTotal = useMemo(() => {
    return participantTechnicalHistory.reduce((acc, t) => acc + (Number(t.hoursEarned || t.totalHours) || 0), 0);
  }, [participantTechnicalHistory]);

  const totalCalculatedHours = internalHours + externalHoursTotal + recurrentHoursTotal;

  const [isFormalLetterOpen, setIsFormalLetterOpen] = useState(false);

  const participantHistoryRecords: TrainingHistoryRecord[] = useMemo(() => {
    const list: TrainingHistoryRecord[] = [];
    attendedEvents.forEach((att, idx) => {
      list.push({
        id: `att-${att.event.id}-${att.date}-${idx}`,
        title: att.event.title,
        category: att.event.category,
        modality: att.event.modality,
        instructor: att.event.instructor,
        date: att.date,
        time: att.time,
        hasAttended: true,
        hours: att.event.totalHours || 2,
        isExternal: false
      });
    });
    registeredEvents.forEach((reg, idx) => {
      list.push({
        id: `reg-${reg.event.id}-${reg.date}-${idx}`,
        title: reg.event.title,
        category: reg.event.category,
        modality: reg.event.modality,
        instructor: reg.event.instructor,
        date: reg.date,
        time: reg.time,
        hasAttended: false,
        hours: reg.event.totalHours || 2,
        isExternal: false
      });
    });

    // Añadir capacitaciones externas
    participantExternalTrainings.forEach((ext, idx) => {
      list.push({
        id: `ext-${ext.id}-${idx}`,
        title: ext.title,
        category: ext.programCategory,
        modality: ext.modality,
        instructor: ext.supplier,
        date: ext.endDate || ext.startDate,
        time: 'Acreditado',
        hasAttended: true,
        hours: Number(ext.totalHours) || 1,
        gradeScore: ext.score,
        academicStatus: ext.academicStatus || 'passed',
        isExternal: true,
        supplier: ext.supplier,
        credentialUrl: ext.credentialUrl
      });
    });

    // Añadir capacitaciones recurrentes de Academia Técnica
    participantTechnicalHistory.forEach((rec, idx) => {
      list.push({
        id: `rec-${rec.cohortId}-${rec.courseId}-${idx}`,
        title: rec.title,
        category: rec.category || 'Academia Técnica',
        modality: rec.modality || 'Presencial / Práctico',
        instructor: rec.facilitatorName || 'Facilitador Técnico',
        date: rec.endDate || rec.startDate,
        time: `${rec.attendedDays || 0}/${rec.durationDays || 0} sesiones`,
        hasAttended: (rec.attendedDays || 0) > 0,
        hours: Number(rec.hoursEarned || rec.totalHours || 0),
        gradeScore: null,
        academicStatus: rec.academicStatus,
        isRecurrent: true,
        cohortId: rec.cohortId,
        attendancePercentage: rec.attendancePercentage,
        facilitatorName: rec.facilitatorName,
        groupName: rec.groupName
      });
    });

    return list;
  }, [attendedEvents, registeredEvents, participantExternalTrainings, participantTechnicalHistory]);

  const empStatus = participant.employmentStatus || "contratado";

  return (
    <AccessibleModal
      onClose={onClose}
      ariaLabel={`Perfil de ${participant.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* Profile Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-[#DA291C] p-0.5 shadow-md shadow-red-500/20 shrink-0">
              <div className="w-full h-full bg-white dark:bg-slate-800 rounded-[22px] flex items-center justify-center text-xl font-black text-[#DA291C] dark:text-red-400">
                {participant.name.charAt(0)}
              </div>
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 dark:text-white truncate">{participant.name}</h2>
                
                {/* Badge de Estado Laboral */}
                {empStatus === "contratado" && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Contratado
                  </span>
                )}
                {empStatus === "en_proceso" && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    En Proceso de Contratación
                  </span>
                )}
                {empStatus === "inactivo" && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                    <UserX className="w-3 h-3" />
                    Inactivo / Baja
                  </span>
                )}

                {/* Badge de Rol */}
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-50 dark:bg-red-950/60 text-[#DA291C] dark:text-red-400 border border-red-200 dark:border-red-800">
                  {linkedUser?.role || "Colaborador (User)"}
                </span>

                {/* Badge de Empresa */}
                {(() => {
                  const comp = companies.find(c => c.id === (participant.companyId || 'emp_kasino'));
                  return (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                      🏢 {comp ? comp.name : 'Kasino 21 Corporativo'}
                    </span>
                  );
                })()}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{participant.email}</p>
              
              <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1 flex-wrap font-medium">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1 font-mono text-[#DA291C] dark:text-red-400 font-bold">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    Tarj: #{participant.card}
                  </span>
                  {participant.cedula && (
                    <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300 font-bold">
                      Cédula: {participant.cedula}
                    </span>
                  )}
                  {participant.department && (
                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {participant.department}
                    </span>
                  )}
                </div>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsFormalLetterOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-black dark:hover:bg-slate-750 text-white text-[11px] font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                    title="Expedir carta formal de constancia para este colaborador (Exclusivo Super Administrador)"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Expedir Carta Formal</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 text-center divide-x divide-slate-200 dark:divide-slate-800">
          <div className="p-3">
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{attendedEvents.length}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Asistencias</p>
          </div>
          <div className="p-3">
            <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{avgScore} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">pts</span></p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Promedio Notas</p>
          </div>
          <div className="p-3">
            <p className="text-lg font-black text-slate-900 dark:text-white">
              <span className="text-emerald-600 dark:text-emerald-400">{passedCount}</span> / <span className="text-rose-600 dark:text-rose-400">{failedCount}</span>
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Aprobados / Reprobados</p>
          </div>
          <div className="p-3">
            <p className="text-lg font-black text-[#DA291C] dark:text-red-400">~{totalCalculatedHours}h</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Horas Formativas</p>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          
          {/* Ficha Académica & Sociodemográfica 360° */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-amber-50/20 dark:from-slate-850 dark:to-amber-950/10 border border-slate-200/90 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#DA291C] dark:text-red-400" />
                <span>Perfil Académico & Sociodemográfico</span>
              </h3>
              {participant.profileCompleted ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Ficha Completa
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Ficha Incompleta
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase">Nivel de Estudio</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{participant.educationLevel || 'No especificado'}</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase">Profesión / Título</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{participant.professionTitle || 'No especificado'}</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase">Fecha Nacimiento</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {participant.birthDate || 'No especificada'}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase">Teléfono</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{participant.phone || 'No especificado'}</span>
              </div>
            </div>

            {participant.isCurrentlyStudying && (
              <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold text-amber-950 dark:text-amber-200 block">Estudia Actualmente: {participant.currentStudyField || 'En curso'}</span>
                  {participant.institutionName && (
                    <span className="text-[11px] text-amber-800 dark:text-amber-300">Centro / Universidad: {participant.institutionName}</span>
                  )}
                </div>
              </div>
            )}

            {participant.currentAddress && (
              <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 pt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Dirección: <strong className="text-slate-800 dark:text-slate-200">{participant.currentAddress}</strong></span>
              </div>
            )}

            {participant.trainingInterestAreas && participant.trainingInterestAreas.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">Intereses Formativos & Oportunidades de Desarrollo:</span>
                <div className="flex flex-wrap gap-1.5">
                  {participant.trainingInterestAreas.map(interest => (
                    <span key={interest} className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Alerta de Re-capacitación / Debilidades */}
          {hasRetrainingAlert && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <h3 className="text-xs font-black text-rose-900 dark:text-rose-200">
                  Plan de Refuerzo / Re-capacitación Recomendado
                </h3>
              </div>
              <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                Este colaborador presenta brechas en competencias evaluadas o calificaciones pendientes de refuerzo.
              </p>
              {allSkillGaps.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {allSkillGaps.map(skill => (
                    <span 
                      key={skill}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold flex items-center gap-1 shadow-xs"
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                      <span>{skill}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Calificaciones y Rendimiento Académico */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Libro de Calificaciones & Debilidades ({academicGrades.length})</span>
              </h3>
              {academicGrades.length > 0 && (
                <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  Promedio: {avgScore} pts
                </span>
              )}
            </div>

            {academicGrades.length > 0 ? (
              <div className="space-y-2.5">
                {academicGrades.map((item, idx) => {
                  const g = item.grade;
                  const isPassed = g.academicStatus === 'passed';
                  const isFailed = g.academicStatus === 'failed';
                  const hasGaps = (g.detectedSkillGaps || []).length > 0;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        isFailed || g.needsRetraining
                          ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
                          : 'bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-[#DA291C] dark:text-red-400 font-black">{item.event.category}</span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{item.event.title}</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Instructor: {item.event.instructor}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {g.score !== null && (
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                              isPassed ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                            }`}>
                              {g.score} pts
                            </span>
                          )}
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase ${
                            isPassed
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : isFailed
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            {isPassed ? 'Aprobado' : isFailed ? 'Requiere Refuerzo' : 'Pendiente'}
                          </span>
                        </div>
                      </div>

                      {/* Debilidades detectadas en este curso */}
                      {hasGaps && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-1">
                          <span className="text-[10px] text-rose-700 dark:text-rose-400 font-black uppercase block">
                            Brechas Técnicas Observadas:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {(g.detectedSkillGaps || []).map(skill => (
                              <span 
                                key={skill}
                                className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 text-[10px] font-bold border border-rose-200 dark:border-rose-800 flex items-center gap-1 shadow-xs"
                              >
                                <ShieldAlert className="w-2.5 h-2.5" />
                                <span>{skill}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Observaciones del evaluador */}
                      {g.weaknessesNotes && (
                        <div className="mt-2 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 italic shadow-xs">
                          "{g.weaknessesNotes}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                Aún no registra evaluaciones con calificación en el sistema.
              </p>
            )}
          </div>
          
          {/* Supervisor Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Supervisor Asignado</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {participant.supervisorName || "Sin supervisor asignado"}
                </p>
              </div>
            </div>

            {participant.supervisorName && (
              <span className="text-xs px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold shadow-xs">
                Líder de Área
              </span>
            )}
          </div>

          {/* Cursos Completados (Asistencia QR) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Historial de Asistencias Confirmadas ({attendedEvents.length})</span>
              </h3>
            </div>

            {attendedEvents.length > 0 ? (
              <div className="space-y-2">
                {attendedEvents.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.event.title}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <span>📅 {item.date} • {item.time}</span>
                        <span>• {item.event.modality}</span>
                        <span>• Instructor: {item.event.instructor}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1">
                        <QrCode className="w-3 h-3" />
                        Asistió QR
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                Aún no registra asistencias confirmadas por código QR.
              </p>
            )}
          </div>

          {/* Capacitaciones Externas Homologadas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Capacitaciones Externas Homologadas ({participantExternalTrainings.length})</span>
              </h3>
              {externalHoursTotal > 0 && (
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  +{externalHoursTotal} hrs acreditadas
                </span>
              )}
            </div>

            {participantExternalTrainings.length > 0 ? (
              <div className="space-y-2">
                {participantExternalTrainings.map((ext, idx) => (
                  <div 
                    key={idx} 
                    className="p-3.5 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
                          Externa
                        </span>
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{ext.title}</p>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 font-medium flex-wrap">
                        <span>🏢 {ext.supplier}</span>
                        <span>• 📅 {ext.startDate} → {ext.endDate}</span>
                        <span>• 🌿 {getProgramShortName(ext.programCategory)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-black shadow-2xs">
                        {ext.totalHours} hrs
                      </span>
                      {isSafeHttpUrl(ext.credentialUrl) && (
                        <a
                          href={ext.credentialUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1"
                          title="Ver certificado externo"
                        >
                          <FileText className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                No tiene capacitaciones externas registradas aún.
              </p>
            )}
          </div>

          {/* Capacitaciones Recurrentes (Academia Técnica) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Capacitaciones Recurrentes • Academia Técnica ({participantTechnicalHistory.length})</span>
              </h3>
              {recurrentHoursTotal > 0 && (
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                  +{recurrentHoursTotal} hrs acreditadas
                </span>
              )}
            </div>

            {participantTechnicalHistory.length > 0 ? (
              <div className="space-y-2">
                {participantTechnicalHistory.map((rec, idx) => {
                  const isPassed = rec.academicStatus === 'passed';
                  const isInProgress = rec.academicStatus === 'in_progress';
                  return (
                    <div 
                      key={idx} 
                      className="p-3.5 rounded-2xl bg-purple-50/30 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-900/40 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase tracking-wider">
                            Recurrente • Taller
                          </span>
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{rec.title}</p>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 font-medium flex-wrap">
                          {rec.groupName && <span>👥 {rec.groupName}</span>}
                          <span>• 👨‍🏫 Facilitador: {rec.facilitatorName || 'Facilitador Técnico'}</span>
                          <span>• 📅 {rec.startDate} → {rec.endDate}</span>
                          <span>• Asistencia: {rec.attendedDays || 0}/{rec.durationDays || 0} sesiones ({rec.attendancePercentage || 0}%)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-black shadow-2xs">
                          {rec.hoursEarned || rec.totalHours || 0} hrs
                        </span>
                        {isPassed ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Acreditado
                          </span>
                        ) : isInProgress ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> En Curso
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> No Acreditado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                No está enrolado en talleres recurrentes de academia técnica.
              </p>
            )}
          </div>

          {/* Cursos Agendados / Pendientes */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#DA291C] dark:text-red-400" />
              <span>Capacitaciones Agendadas & Asignadas ({registeredEvents.length})</span>
            </h3>

            {registeredEvents.length > 0 ? (
              <div className="space-y-2">
                {registeredEvents.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.event.title}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <span>📅 {item.date} • {item.time}</span>
                        <span>• {item.event.modality}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.isMandatory ? (
                        <span className="px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/60 text-[#DA291C] dark:text-red-400 border border-red-200 dark:border-red-800 text-[10px] font-bold">
                          🔒 Obligatorio
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                          Inscrito
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                No tiene capacitaciones agendadas actualmente.
              </p>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <a
              href={`mailto:${participant.email}?subject=Aprendizaje%20y%20Desarrollo%20-%20Informaci%C3%B3n%20Formativa`}
              className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 transition-colors shadow-xs"
            >
              <Mail className="w-3.5 h-3.5 text-[#DA291C] dark:text-red-400" />
              <span>Enviar Correo</span>
            </a>

            <a
              href={`https://wa.me/?text=${encodeURIComponent("Hola " + participant.name + ", te contactamos desde Aprendizaje y Desarrollo para dar seguimiento a tus capacitaciones institucionales.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>WhatsApp</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            {onOpenEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEdit(participant);
                }}
                className="px-4 py-2 bg-[#DA291C] hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Datos</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>

      {/* Módulo de Elaboración de Carta Formal (Exclusivo Super Administrador) */}
      {isSuperAdmin && (
        <FormalLetterModal
          isOpen={isFormalLetterOpen}
          onClose={() => setIsFormalLetterOpen(false)}
          currentUser={linkedUser || null}
          participant={participant}
          companies={companies}
          trainingRecords={participantHistoryRecords}
        />
      )}

    </AccessibleModal>
  );
};
