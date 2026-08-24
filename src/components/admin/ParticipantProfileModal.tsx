import React, { useMemo } from "react";
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
  AlertTriangle
} from "lucide-react";
import { Participant, UserAccount, TrainingEvent, TrainingProgram, Company, ParticipantGrade } from "../../types";

interface ParticipantProfileModalProps {
  participant: Participant | null;
  users: UserAccount[];
  events: TrainingEvent[];
  programs?: TrainingProgram[];
  companies?: Company[];
  isOpen: boolean;
  onClose: () => void;
  onOpenEdit?: (participant: Participant) => void;
}

export const ParticipantProfileModal: React.FC<ParticipantProfileModalProps> = ({
  participant,
  users,
  events,
  programs = [],
  companies = [],
  isOpen,
  onClose,
  onOpenEdit
}) => {
  if (!isOpen || !participant) return null;

  const emailLower = participant.email.toLowerCase();
  const cardStr = participant.card;
  const linkedUser = users.find(u => u.email.toLowerCase() === emailLower);

  // Recopilar historial de capacitaciones y calificaciones del colaborador
  const { 
    attendedEvents, 
    registeredEvents, 
    totalHours,
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
      totalHours: attended.length * 2,
      academicGrades: gradesList,
      avgScore: avg,
      passedCount: passed,
      failedCount: failed,
      allSkillGaps: Array.from(gapsSet),
      hasRetrainingAlert: retraining || gapsSet.size > 0
    };
  }, [events, emailLower, cardStr]);

  const empStatus = participant.employmentStatus || "contratado";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Profile Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-[#DA291C] p-0.5 shadow-md shadow-red-500/20 shrink-0">
              <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center text-xl font-black text-[#DA291C]">
                {participant.name.charAt(0)}
              </div>
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 truncate">{participant.name}</h2>
                
                {/* Badge de Estado Laboral */}
                {empStatus === "contratado" && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Contratado
                  </span>
                )}
                {empStatus === "en_proceso" && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    En Proceso de Contratación
                  </span>
                )}
                {empStatus === "inactivo" && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <UserX className="w-3 h-3" />
                    Inactivo / Baja
                  </span>
                )}

                {/* Badge de Rol */}
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-50 text-[#DA291C] border border-red-200">
                  {linkedUser?.role || "Colaborador (User)"}
                </span>

                {/* Badge de Empresa */}
                {(() => {
                  const comp = companies.find(c => c.id === (participant.companyId || 'emp_kasino'));
                  return (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                      🏢 {comp ? comp.name : 'Kasino 21 Corporativo'}
                    </span>
                  );
                })()}
              </div>

              <p className="text-xs text-slate-500 font-mono">{participant.email}</p>
              
              <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 flex-wrap font-medium">
                <span className="flex items-center gap-1 font-mono text-[#DA291C] font-bold">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  Tarj: #{participant.card}
                </span>
                {participant.cedula && (
                  <span className="flex items-center gap-1 font-mono text-slate-700 font-bold">
                    Cédula: {participant.cedula}
                  </span>
                )}
                {participant.department && (
                  <span className="flex items-center gap-1 text-slate-700">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    {participant.department}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50/50 text-center divide-x divide-slate-200">
          <div className="p-3">
            <p className="text-lg font-black text-emerald-600">{attendedEvents.length}</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Asistencias</p>
          </div>
          <div className="p-3">
            <p className="text-lg font-black text-purple-700">{avgScore} <span className="text-[10px] text-slate-400 font-normal">pts</span></p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Promedio Notas</p>
          </div>
          <div className="p-3">
            <p className="text-lg font-black text-slate-900">
              <span className="text-emerald-600">{passedCount}</span> / <span className="text-rose-600">{failedCount}</span>
            </p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Aprobados / Reprobados</p>
          </div>
          <div className="p-3">
            <p className="text-lg font-black text-[#DA291C]">~{totalHours}h</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Horas Formativas</p>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          
          {/* Alerta de Re-capacitación / Debilidades */}
          {hasRetrainingAlert && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                <h4 className="text-xs font-black text-rose-900">
                  Plan de Refuerzo / Re-capacitación Recomendado
                </h4>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                Este colaborador presenta brechas en competencias evaluadas o calificaciones pendientes de refuerzo.
              </p>
              {allSkillGaps.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {allSkillGaps.map(skill => (
                    <span 
                      key={skill}
                      className="px-2.5 py-1 rounded-lg bg-white text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1 shadow-xs"
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
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
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                <span>Libro de Calificaciones & Debilidades ({academicGrades.length})</span>
              </h3>
              {academicGrades.length > 0 && (
                <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
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
                          ? 'bg-rose-50/50 border-rose-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-[#DA291C] font-black">{item.event.category}</span>
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{item.event.title}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Instructor: {item.event.instructor}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {g.score !== null && (
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                              isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {g.score} pts
                            </span>
                          )}
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase ${
                            isPassed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isFailed
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {isPassed ? 'Aprobado' : isFailed ? 'Requiere Refuerzo' : 'Pendiente'}
                          </span>
                        </div>
                      </div>

                      {/* Debilidades detectadas en este curso */}
                      {hasGaps && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-1">
                          <span className="text-[10px] text-rose-700 font-black uppercase block">
                            Brechas Técnicas Observadas:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {(g.detectedSkillGaps || []).map(skill => (
                              <span 
                                key={skill}
                                className="px-2 py-0.5 rounded-md bg-white text-rose-700 text-[10px] font-bold border border-rose-200 flex items-center gap-1 shadow-xs"
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
                        <div className="mt-2 p-2.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 italic shadow-xs">
                          "{g.weaknessesNotes}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                Aún no registra evaluaciones con calificación en el sistema.
              </p>
            )}
          </div>
          
          {/* Supervisor Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold text-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500">Supervisor Asignado</p>
                <p className="text-sm font-black text-slate-900">
                  {participant.supervisorName || "Sin supervisor asignado"}
                </p>
              </div>
            </div>

            {participant.supervisorName && (
              <span className="text-xs px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold shadow-xs">
                Líder de Área
              </span>
            )}
          </div>

          {/* Cursos Completados (Asistencia QR) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Historial de Asistencias Confirmadas ({attendedEvents.length})</span>
              </h3>
            </div>

            {attendedEvents.length > 0 ? (
              <div className="space-y-2">
                {attendedEvents.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.event.title}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                        <span>📅 {item.date} • {item.time}</span>
                        <span>• {item.event.modality}</span>
                        <span>• Instructor: {item.event.instructor}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                        <QrCode className="w-3 h-3" />
                        Asistió QR
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                Aún no registra asistencias confirmadas por código QR.
              </p>
            )}
          </div>

          {/* Cursos Agendados / Pendientes */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#DA291C]" />
              <span>Capacitaciones Agendadas & Asignadas ({registeredEvents.length})</span>
            </h3>

            {registeredEvents.length > 0 ? (
              <div className="space-y-2">
                {registeredEvents.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.event.title}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                        <span>📅 {item.date} • {item.time}</span>
                        <span>• {item.event.modality}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.isMandatory ? (
                        <span className="px-2 py-0.5 rounded-md bg-red-50 text-[#DA291C] border border-red-200 text-[10px] font-bold">
                          🔒 Obligatorio
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                          Inscrito
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                No tiene capacitaciones agendadas actualmente.
              </p>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <a
              href={`mailto:${participant.email}?subject=Aprendizaje%20y%20Desarrollo%20-%20Informaci%C3%B3n%20Formativa`}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-300 transition-colors shadow-xs"
            >
              <Mail className="w-3.5 h-3.5 text-[#DA291C]" />
              <span>Enviar Correo</span>
            </a>

            <a
              href={`https://wa.me/?text=${encodeURIComponent("Hola " + participant.name + ", te contactamos desde Aprendizaje y Desarrollo para dar seguimiento a tus capacitaciones institucionales.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-emerald-200 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
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
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
