import React, { useState, useMemo } from 'react';
import { 
  CalendarCheck2, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Video, 
  User, 
  Download, 
  ExternalLink, 
  Trash2, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles, 
  X,
  Award,
  ChevronRight,
  Lock,
  ShieldAlert,
  ShieldCheck,
  GraduationCap,
  Camera,
  Star,
  FileText,
  Search,
  Filter,
  TrendingUp,
  Layers,
  KeyRound
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { TrainingEvent, UserAccount, Slot, Schedule, TrainingProgram, ParticipantGroup, Participant, Company, ExternalTraining, TechnicalAcademyHistoryRecord } from '../../types';
import { formatDateLong, formatDateShort, formatCedula, getEventDurationMetrics } from '../../utils/formatters';
import { downloadIcsFile, getGoogleCalendarUrl } from '../../utils/icsUtils';
import { FormalLetterModal, TrainingHistoryRecord } from '../history/FormalLetterModal';
import { TechnicalPinCheckinModal } from './TechnicalPinCheckinModal';

interface UserRegistrationItem {
  event: TrainingEvent;
  schedule: Schedule;
  slot: Slot;
  hasAttended: boolean;
  isCheckedIn?: boolean;
  isCheckedOut?: boolean;
  isMandatory?: boolean;
  assignedBy?: string | null;
  assignmentType?: 'mandatory' | 'voluntary' | 'self';
  assignmentNotes?: string | null;
}

interface MyRegistrationsViewProps {
  events: TrainingEvent[];
  currentUser: UserAccount | null;
  companies?: Company[];
  programs?: TrainingProgram[];
  groups?: ParticipantGroup[];
  participants?: Participant[];
  externalTrainings?: ExternalTraining[];
  technicalHistory?: TechnicalAcademyHistoryRecord[];
  onRefreshTechnicalHistory?: () => Promise<void>;
  onCancelRegistration: (eventId: string, date: string, time: string, email: string) => Promise<void>;
  onExploreCatalog: () => void;
  onOpenReservationModal?: (event: TrainingEvent) => void;
  onOpenQrScanner?: () => void;
  onOpenTecEvaluation?: (event: TrainingEvent) => void;
  onOpenUserProfile?: () => void;
  onShowToast?: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const MyRegistrationsView: React.FC<MyRegistrationsViewProps> = ({
  events,
  currentUser,
  companies = [],
  programs = [],
  groups = [],
  participants = [],
  externalTrainings = [],
  technicalHistory = [],
  onRefreshTechnicalHistory,
  onCancelRegistration,
  onExploreCatalog,
  onOpenReservationModal,
  onOpenQrScanner,
  onOpenTecEvaluation,
  onOpenUserProfile,
  onShowToast
}) => {
  const [cancelingItem, setCancelingItem] = useState<UserRegistrationItem | null>(null);
  const [selectedPassItem, setSelectedPassItem] = useState<UserRegistrationItem | null>(null);
  const [selectedPinTraining, setSelectedPinTraining] = useState<TechnicalAcademyHistoryRecord | null>(null);
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);

  // Sub-Pestañas: Sesiones Activas vs Histórico
  const [currentSubTab, setCurrentSubTab] = useState<'active' | 'history'>('active');
  const [isFormalLetterModalOpen, setIsFormalLetterModalOpen] = useState(false);
  const [selectedRecordsForLetter, setSelectedRecordsForLetter] = useState<TrainingHistoryRecord[] | null>(null);

  // Filtros del Histórico
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'attended' | 'upcoming' | 'missed'>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  if (!currentUser) return null;

  const isSuperAdmin = currentUser?.role === 'Super Administrador';

  // Fecha actual local YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Identificar tarjeta y datos de participante del usuario actual (por email o por cédula)
  const userEmail = currentUser.email.toLowerCase();
  const userCedulaClean = currentUser.cedula ? currentUser.cedula.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : null;

  const currentParticipant = useMemo(() => {
    return participants.find(p => {
      if (p.email && p.email.toLowerCase() === userEmail) return true;
      if (userCedulaClean && p.cedula) {
        const pCed = p.cedula.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (pCed === userCedulaClean) return true;
      }
      return false;
    });
  }, [participants, userEmail, userCedulaClean]);

  const userCard = currentParticipant?.card;

  // Conjunto de correos asociados al usuario (login actual + expediente en padrón si difieren)
  const userAssociatedEmails = useMemo(() => {
    const set = new Set<string>();
    set.add(userEmail);
    if (currentParticipant?.email) {
      set.add(currentParticipant.email.toLowerCase());
    }
    return set;
  }, [userEmail, currentParticipant]);

  // Extraer todas las inscripciones del usuario actual
  const userRegistrations: UserRegistrationItem[] = useMemo(() => {
    const list: UserRegistrationItem[] = [];

    events.forEach(evt => {
      evt.schedule.forEach(sch => {
        sch.slots.forEach(slot => {
          const isEnrolled = slot.attendees.some(a => userAssociatedEmails.has(a.toLowerCase()));
          if (isEnrolled) {
            const isCheckedIn = (slot.checkInList || slot.attendedList || []).some(a => userAssociatedEmails.has(a.toLowerCase()));
            const isCheckedOut = (slot.checkOutList || []).some(a => userAssociatedEmails.has(a.toLowerCase()));
            const hasAttended = (slot.completedAttendanceList || []).some(a => userAssociatedEmails.has(a.toLowerCase())) || (isCheckedIn && isCheckedOut);
            const detail = (slot.attendeesDetails || []).find(d => userAssociatedEmails.has(d.email.toLowerCase()));
            list.push({
              event: evt,
              schedule: sch,
              slot: slot,
              hasAttended,
              isCheckedIn,
              isCheckedOut,
              isMandatory: detail ? Boolean(detail.isMandatory) : false,
              assignedBy: detail?.assignedBy || null,
              assignmentType: detail?.assignmentType || (detail?.isMandatory ? 'mandatory' : 'self'),
              assignmentNotes: detail?.assignmentNotes || null
            });
          }
        });
      });
    });

    return list;
  }, [events, userAssociatedEmails]);

  const handleConfirmCancel = async () => {
    if (!cancelingItem) return;
    try {
      setIsProcessingCancel(true);
      await onCancelRegistration(
        cancelingItem.event.id,
        cancelingItem.schedule.date,
        cancelingItem.slot.time,
        currentUser.email
      );
      setCancelingItem(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingCancel(false);
    }
  };

  // Programas activos asignados al usuario
  const assignedPrograms = programs.filter(prog => {
    if (prog.status !== 'active') return false;
    if (!userCard) return false;
    const isTargetGroup = groups.some(g => prog.targetGroupIds.includes(g.id) && g.memberCards.includes(userCard));
    const isTargetDirect = (prog.targetParticipantCards || []).includes(userCard);
    return isTargetGroup || isTargetDirect;
  });

  // Entrenamientos técnicos asignados al colaborador (Academia Técnica)
  const userTechnicalTrainings = useMemo(() => {
    if (!technicalHistory || technicalHistory.length === 0) return [];
    return technicalHistory.filter(t => 
      (userCard && t.participantCard === userCard) || 
      (t.participantEmail && userAssociatedEmails.has(t.participantEmail.toLowerCase()))
    );
  }, [technicalHistory, userCard, userAssociatedEmails]);

  // Cohortes técnicas activas / vigentes del colaborador
  const activeTechnicalTrainings = useMemo(() => {
    return userTechnicalTrainings.filter(t => {
      const isConcluded = t.status === 'completed' || t.academicStatus === 'passed';
      const isDateValid = t.endDate >= todayStr;
      return !isConcluded || isDateValid;
    });
  }, [userTechnicalTrainings, todayStr]);

  // Generar lista de registros históricos (Internos + Externos + Recurrentes)
  const trainingHistoryRecords: TrainingHistoryRecord[] = useMemo(() => {
    const internalRecords: TrainingHistoryRecord[] = userRegistrations.map((item, idx) => {
      const isPast = item.schedule.date < todayStr;
      const gradeObj = (item.event.grades || []).find(g => 
        (userCard && g.participantCard === userCard) || 
        (g.participantEmail && userAssociatedEmails.has(g.participantEmail.toLowerCase()))
      );

      return {
        id: `${item.event.id}-${item.schedule.date}-${item.slot.time}-${idx}`,
        title: item.event.title,
        category: item.event.category,
        modality: item.event.modality,
        instructor: item.event.instructor,
        date: item.schedule.date,
        time: item.slot.time,
        hasAttended: item.hasAttended,
        hours: item.event.totalHours || 2,
        gradeScore: gradeObj ? gradeObj.score : null,
        academicStatus: gradeObj ? gradeObj.academicStatus : (item.hasAttended ? 'passed' : isPast ? 'failed' : 'pending'),
        isExternal: false
      };
    });

    const externalRecords: TrainingHistoryRecord[] = (externalTrainings || [])
      .filter(t => (userCard && t.participantCard === userCard) || (t.participantEmail && userAssociatedEmails.has(t.participantEmail.toLowerCase())))
      .map(t => ({
        id: `ext-${t.id}`,
        title: t.title,
        category: t.programCategory,
        modality: t.modality,
        instructor: t.supplier,
        date: t.endDate || t.startDate,
        time: 'Acreditado',
        hasAttended: true,
        hours: Number(t.totalHours) || 1,
        gradeScore: t.score,
        academicStatus: t.academicStatus || 'passed',
        isExternal: true,
        supplier: t.supplier,
        credentialUrl: t.credentialUrl
      }));

    const recurrentRecords: TrainingHistoryRecord[] = (technicalHistory || [])
      .filter(t => (userCard && t.participantCard === userCard) || (t.participantEmail && userAssociatedEmails.has(t.participantEmail.toLowerCase())))
      .map(t => ({
        id: `rec-${t.cohortId}-${t.courseId}`,
        title: t.title,
        category: t.category || 'Academia Técnica',
        modality: t.modality || 'Presencial / Práctico',
        instructor: t.facilitatorName || 'Facilitador Técnico',
        date: t.endDate || t.startDate,
        time: `${t.attendedDays || 0}/${t.durationDays || 0} sesiones`,
        hasAttended: (t.attendedDays || 0) > 0,
        hours: Number(t.hoursEarned || t.totalHours) || 0,
        gradeScore: null,
        academicStatus: t.academicStatus,
        isRecurrent: true,
        cohortId: t.cohortId,
        attendancePercentage: t.attendancePercentage,
        facilitatorName: t.facilitatorName,
        groupName: t.groupName
      }));

    return [...internalRecords, ...externalRecords, ...recurrentRecords].sort((a, b) => b.date.localeCompare(a.date));
  }, [userRegistrations, todayStr, userCard, userAssociatedEmails, externalTrainings, technicalHistory]);

  // Métricas del Histórico
  const historyMetrics = useMemo(() => {
    const totalCount = trainingHistoryRecords.length;
    const attendedCount = trainingHistoryRecords.filter(r => r.hasAttended).length;
    const upcomingCount = trainingHistoryRecords.filter(r => !r.hasAttended && r.date >= todayStr).length;
    const missedCount = trainingHistoryRecords.filter(r => !r.hasAttended && r.date < todayStr).length;
    const totalHours = trainingHistoryRecords.filter(r => r.hasAttended).reduce((acc, r) => acc + (Number(r.hours) || 2), 0);
    const rate = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0;

    return {
      totalCount,
      attendedCount,
      upcomingCount,
      missedCount,
      totalHours,
      rate
    };
  }, [trainingHistoryRecords, todayStr]);

  // Registros filtrados para la tabla del histórico
  const filteredHistoryRecords = useMemo(() => {
    return trainingHistoryRecords.filter(rec => {
      if (historyStatusFilter === 'attended' && !rec.hasAttended) return false;
      if (historyStatusFilter === 'upcoming' && (rec.hasAttended || rec.date < todayStr)) return false;
      if (historyStatusFilter === 'missed' && (rec.hasAttended || rec.date >= todayStr)) return false;

      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase();
        const matchTitle = rec.title.toLowerCase().includes(q);
        const matchInst = rec.instructor.toLowerCase().includes(q);
        const matchCat = rec.category.toLowerCase().includes(q);
        return matchTitle || matchInst || matchCat;
      }
      return true;
    });
  }, [trainingHistoryRecords, historyStatusFilter, historySearchQuery, todayStr]);

  // Cursos recomendados inteligentemente basados en intereses formativos y carrera
  const recommendedEvents = useMemo(() => {
    const userInterests = (currentUser?.trainingInterestAreas || []).map(i => i.toLowerCase());
    const isStudying = Boolean(currentUser?.isCurrentlyStudying);
    const studyField = (currentUser?.currentStudyField || '').toLowerCase();
    const userEmail = (currentUser?.email || '').toLowerCase();

    // Eventos donde el usuario NO está inscrito actualmente
    const availableEvents = events.filter(evt => {
      const isEnrolled = evt.schedule.some(sch => 
        sch.slots.some(sl => (sl.attendees || []).some(att => att.toLowerCase() === userEmail))
      );
      if (isEnrolled) return false;
      // Que tenga al menos un horario futuro con cupo
      const hasOpenSlot = evt.schedule.some(sch => 
        sch.date >= todayStr && sch.slots.some(sl => sl.registered < sl.capacity)
      );
      return hasOpenSlot;
    });

    const matches: Array<{
      event: TrainingEvent;
      matchReason: string;
      matchType: 'interest' | 'study' | 'foundation';
      score: number;
    }> = [];

    availableEvents.forEach(evt => {
      const titleLower = evt.title.toLowerCase();
      const catLower = evt.category.toLowerCase();
      const skillsLower = (evt.skillsEvaluated || []).map(s => s.toLowerCase());

      // 1. Coincidencia por áreas de interés
      const matchedInterest = userInterests.find(interest => {
        const words = interest.split(' ').filter(w => w.length > 3);
        return words.some(w => titleLower.includes(w) || catLower.includes(w) || skillsLower.some(s => s.includes(w)));
      });

      if (matchedInterest) {
        matches.push({
          event: evt,
          matchReason: `Basado en tu interés por "${matchedInterest}"`,
          matchType: 'interest',
          score: 10
        });
        return;
      }

      // 2. Coincidencia por lo que estudia
      if (isStudying && studyField) {
        const studyWords = studyField.split(' ').filter(w => w.length > 3);
        const matchedStudy = studyWords.some(w => titleLower.includes(w) || skillsLower.some(s => s.includes(w)));
        if (matchedStudy) {
          matches.push({
            event: evt,
            matchReason: `Alineado a tus estudios de "${currentUser?.currentStudyField}"`,
            matchType: 'study',
            score: 8
          });
          return;
        }
      }

      // 3. Recomendación base para Bachilleres
      if (currentUser?.educationLevel === 'Secundaria / Bachiller' && (catLower.includes('taller') || titleLower.includes('fundamento') || titleLower.includes('básico'))) {
        matches.push({
          event: evt,
          matchReason: 'Curso de fundamentación técnica recomendado',
          matchType: 'foundation',
          score: 5
        });
      }
    });

    return matches.sort((a, b) => b.score - a.score).slice(0, 3);
  }, [events, currentUser, todayStr]);

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header Banner (Light Theme) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs font-bold text-[#DA291C]">
            <CalendarCheck2 className="w-4 h-4" />
            <span>Panel del Colaborador</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Mis Capacitaciones & Rutas</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Consulta tus horarios agendados, monitorea el cumplimiento de tus cronogramas y genera tus pases de acceso QR.
          </p>

          {/* Ficha rápida de perfil formativo */}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap text-xs">
            {currentUser.educationLevel && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200 flex items-center gap-1.5 shadow-2xs">
                <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                <span>{currentUser.educationLevel}</span>
              </span>
            )}
            {currentUser.isCurrentlyStudying && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 font-bold border border-amber-200 flex items-center gap-1.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Estudiando: {currentUser.currentStudyField || 'En curso'}</span>
              </span>
            )}
            {currentUser.professionTitle && (
              <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-900 font-bold border border-sky-200 flex items-center gap-1.5 shadow-2xs">
                <span>{currentUser.professionTitle}</span>
              </span>
            )}
            {onOpenUserProfile && (
              <button
                type="button"
                onClick={onOpenUserProfile}
                className="text-[#DA291C] hover:underline font-bold text-xs cursor-pointer ml-1 inline-flex items-center gap-1"
              >
                <span>Editar Mi Ficha</span>
                <span className="text-[10px]">→</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isSuperAdmin && (
            <button
              onClick={() => {
                setSelectedRecordsForLetter(null);
                setIsFormalLetterModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-slate-900/20 transition-all cursor-pointer active:scale-95"
              title="Generar constancia formal con membrete Claro (Exclusivo Super Administrador)"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Elaborar Carta Formal</span>
            </button>
          )}

          {onOpenQrScanner && (
            <button
              onClick={onOpenQrScanner}
              className="px-4 py-2.5 rounded-2xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-red-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Escanear QR Asistencia</span>
            </button>
          )}

          <div className="px-5 py-3 rounded-2xl bg-red-50 border border-red-200 text-center sm:text-right">
            <p className="text-2xl font-black text-[#DA291C]">{userRegistrations.length}</p>
            <p className="text-[11px] text-slate-600 font-bold">Inscripciones Activas</p>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE CURSOS RECOMENDADOS (PLAN DE CRECIMIENTO INTELIGENTE) */}
      {recommendedEvents.length > 0 && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-[#DA291C]/85 rounded-3xl p-6 text-white shadow-xl space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-amber-400 text-amber-950 shadow-inner">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Cursos Sugeridos para Tu Plan de Crecimiento
                </h2>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Recomendaciones personalizadas basadas en tus áreas de interés y grado formativo.
              </p>
            </div>
            <button
              onClick={onExploreCatalog}
              className="text-xs font-bold text-amber-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors self-start sm:self-auto"
            >
              <span>Ver Catálogo Completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {recommendedEvents.map(({ event, matchReason }) => {
              const nextSlot = event.schedule
                .flatMap(s => s.slots.map(sl => ({ date: s.date, ...sl })))
                .find(s => s.date >= todayStr && s.registered < s.capacity);

              return (
                <div 
                  key={event.id}
                  className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:bg-white/15 transition-all shadow-sm"
                >
                  <div className="space-y-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span className="truncate max-w-[200px]">{matchReason}</span>
                    </span>
                    <h3 className="font-bold text-sm text-white line-clamp-2 leading-snug">{event.title}</h3>
                    {nextSlot && (
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <CalendarIcon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>{formatDateShort(nextSlot.date)} • {nextSlot.time}{nextSlot.endTime ? ` - ${nextSlot.endTime}` : ''}</span>
                        <span className="text-amber-300 font-semibold">({getEventDurationMetrics(event).totalHours}h)</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-300 font-medium">
                      {nextSlot ? `${nextSlot.capacity - nextSlot.registered} cupos disp.` : 'Cupos disp.'}
                    </span>
                    <button
                      onClick={() => onOpenReservationModal ? onOpenReservationModal(event) : onExploreCatalog()}
                      className="px-3 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-black transition-colors cursor-pointer active:scale-95 flex items-center gap-1 shadow-sm"
                    >
                      <span>Reservar Cupo</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-Tab Navigation Bar & Action CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-2 sm:p-2.5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setCurrentSubTab('active')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              currentSubTab === 'active'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Sesiones Activas & Rutas ({userRegistrations.filter(r => r.schedule.date >= todayStr).length})</span>
          </button>

          <button
            onClick={() => setCurrentSubTab('history')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              currentSubTab === 'history'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Histórico de Capacitaciones ({trainingHistoryRecords.length})</span>
          </button>
        </div>

        {currentSubTab === 'history' ? (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
            <span className="text-slate-500 font-medium">
              Horas Acumuladas: <strong className="text-slate-900 font-black">{historyMetrics.totalHours} hrs</strong>
            </span>
          </div>
        ) : isSuperAdmin ? (
          <button
            onClick={() => {
              setSelectedRecordsForLetter(null);
              setIsFormalLetterModalOpen(true);
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-red-50 hover:bg-red-100 text-[#DA291C] border border-red-200 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            title="Ver constancia formal (Exclusivo Super Administrador)"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ver Constancia Formal</span>
          </button>
        ) : null}
      </div>

      {/* VISTA 1: SESIONES ACTIVAS & RUTAS FORMATIVAS */}
      {currentSubTab === 'active' && (
        <div className="space-y-8 animate-in fade-in duration-150">

      {/* SECCIÓN: ENTRENAMIENTOS TÉCNICOS ASIGNADOS (ACADEMIA TÉCNICA) */}
      {activeTechnicalTrainings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#DA291C] uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#DA291C]" />
              <span>Mis Entrenamientos Técnicos Asignados (Academia Técnica)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-[#DA291C]">
                {activeTechnicalTrainings.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTechnicalTrainings.map(t => {
              const attendedDays = t.attendedDays || 0;
              const totalDays = t.durationDays || 5;
              const percentage = t.attendancePercentage || 0;
              const attendedToday = Boolean(t.attendedToday);

              return (
                <div 
                  key={`user-tac-${t.id || t.cohortId}`}
                  className="bg-white border border-amber-200/90 rounded-3xl p-6 shadow-sm hover:border-amber-400/80 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        {t.category || 'Academia Técnica'}
                      </span>

                      {attendedToday ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Asististe Hoy
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          En Curso
                        </span>
                      )}
                    </div>

                    {/* Título y Grupo */}
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-[#DA291C] transition-colors line-clamp-2 mb-1">
                      {t.title}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 line-clamp-1 mb-3">
                      Cohorte: <span className="text-slate-800">{t.groupName || 'Cohorte General'}</span>
                    </p>

                    {/* Info de Facilitador, Fechas, Horario y Aula */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs text-slate-600 space-y-2 mb-4">
                      {t.facilitatorName && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Facilitador:</span>
                          <span className="font-bold text-slate-800">{t.facilitatorName}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Fechas:</span>
                        <span className="font-bold text-slate-800">
                          {formatDateShort(t.startDate)} - {formatDateShort(t.endDate)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Horario:</span>
                        <span className="font-bold text-slate-800">{t.time}</span>
                      </div>

                      {t.location && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Ubicación:</span>
                          <span className="font-bold text-slate-800 truncate max-w-[170px]">{t.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Progreso de Asistencia Diaria */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-500">Asistencia Acumulada:</span>
                        <span className="font-bold text-slate-900">
                          {attendedDays} de {totalDays} sesiones ({percentage}%)
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            percentage >= 80 ? 'bg-emerald-500' : percentage > 0 ? 'bg-amber-500' : 'bg-slate-300'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Acción de Registro de Asistencia */}
                  <div className="pt-3 border-t border-slate-100">
                    {attendedToday ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Asistencia asentada para hoy</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPinTraining(t)}
                          className="text-xs text-slate-600 hover:text-slate-900 underline font-semibold cursor-pointer min-h-[36px] flex items-center"
                        >
                          Revalidar (QR / PIN)
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedPinTraining(t)}
                        className="w-full py-2.5 px-4 min-h-[44px] rounded-xl bg-gradient-to-r from-claro to-claro-600 hover:from-claro-600 hover:to-claro-700 text-white text-xs font-bold transition-all shadow-md shadow-claro/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <QrCode className="w-4 h-4 text-white" />
                        <span>Registrar Asistencia (QR o PIN)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECCIÓN: RUTAS Y CRONOGRAMAS ASIGNADOS */}
      {assignedPrograms.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#DA291C] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Tus Rutas Formativas & Cronogramas Obligatorios</span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {assignedPrograms.map(prog => {
              const mandatoryItems = prog.eventItems.filter(e => e.isMandatory);
              
              let completedMandatory = 0;
              let totalCompleted = 0;

              const coursesProgress = prog.eventItems.map(item => {
                const targetEvent = events.find(e => e.id === item.eventId);
                let hasAttended = false;
                let isRegistered = false;
                let registeredDate = '';
                let registeredTime = '';

                if (targetEvent) {
                  targetEvent.schedule.forEach(sch => {
                    sch.slots.forEach(slot => {
                      if (slot.attendees.map(a => a.toLowerCase()).includes(userEmail)) {
                        isRegistered = true;
                        registeredDate = sch.date;
                        registeredTime = slot.time;
                      }
                      if ((slot.attendedList || []).map(a => a.toLowerCase()).includes(userEmail)) {
                        hasAttended = true;
                      }
                    });
                  });
                }

                if (hasAttended) {
                  totalCompleted++;
                  if (item.isMandatory) completedMandatory++;
                }

                return {
                  event: targetEvent,
                  isMandatory: item.isMandatory,
                  hasAttended,
                  isRegistered,
                  registeredDate,
                  registeredTime
                };
              });

              const percentage = mandatoryItems.length > 0 
                ? Math.round((completedMandatory / mandatoryItems.length) * 100)
                : Math.round((totalCompleted / prog.eventItems.length) * 100);

              const isCompleted = percentage === 100;
              const isOverdue = new Date(prog.endDate) < new Date() && !isCompleted;

              return (
                <div 
                  key={prog.id}
                  className="bg-white border border-red-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : isOverdue
                            ? 'bg-rose-50 text-rose-700 border-rose-300'
                            : 'bg-red-50 text-[#DA291C] border-red-200'
                        }`}>
                          {isCompleted ? '✓ Cronograma Completado' : isOverdue ? 'Atrasado / Por Vencer' : 'Ruta Activa'}
                        </span>
                        <span className="text-xs text-slate-500">
                          Fecha Límite: <strong className="text-slate-800">{formatDateLong(prog.endDate)}</strong>
                        </span>
                      </div>

                      <h2 className="text-xl font-extrabold text-slate-900">{prog.title}</h2>
                      <p className="text-xs text-slate-600 mt-1 max-w-2xl">{prog.description}</p>
                    </div>

                    {/* Progress Percentage Badge */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-3 sm:p-0 rounded-2xl bg-slate-50 sm:bg-transparent border sm:border-0 border-slate-200">
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-500 font-bold block">Tu Cumplimiento</span>
                        <span className="text-2xl font-black text-[#DA291C]">{percentage}%</span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        {completedMandatory} de {mandatoryItems.length} obligatorios
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-[#DA291C]'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Courses Checklist */}
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-slate-800 block">
                      Capacitaciones requeridas en este programa:
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {coursesProgress.map((cp, idx) => {
                        const { event, isMandatory, hasAttended, isRegistered, registeredDate, registeredTime } = cp;
                        if (!event) return null;

                        return (
                          <div 
                            key={event.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                              hasAttended 
                                ? 'bg-emerald-50/60 border-emerald-200' 
                                : isRegistered 
                                ? 'bg-red-50/40 border-red-200' 
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isMandatory 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                    : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {isMandatory ? '★ Obligatorio' : 'Opcional'}
                                </span>

                                {hasAttended ? (
                                  <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Completado
                                  </span>
                                ) : isRegistered ? (
                                  <span className="text-[11px] font-bold text-[#DA291C] flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" /> Agendado
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-semibold text-slate-500">
                                    Pendiente
                                  </span>
                                )}
                              </div>

                              <h4 className="text-xs font-bold text-slate-900 line-clamp-2 mb-1">
                                {event.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 line-clamp-1 mb-2">
                                Facilitador: {event.instructor}
                              </p>
                            </div>

                            {/* Action / Schedule Info */}
                            <div className="pt-2 border-t border-slate-200/80 mt-2 text-xs">
                              {isRegistered ? (
                                <div className="text-[11px] text-slate-600 space-y-0.5">
                                  <p>📅 {registeredDate}</p>
                                  <p>⏰ {registeredTime}</p>
                                </div>
                              ) : onOpenReservationModal ? (
                                <button
                                  onClick={() => onOpenReservationModal(event)}
                                  className="w-full py-1.5 px-3 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                                >
                                  <span>Inscribirme</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECCIÓN: MIS INSCRIPCIONES INDIVIDUALES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
            Sesiones Agendadas ({userRegistrations.length})
          </h2>
        </div>

        {userRegistrations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userRegistrations.map((item, idx) => {
              const { event, schedule, slot, hasAttended } = item;

              return (
                <div 
                  key={`${event.id}-${schedule.date}-${slot.time}-${idx}`}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    
                    {/* Status Badges Header */}
                    <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-[#DA291C] border border-red-200">
                          {event.category}
                        </span>

                        {item.isMandatory ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-red-600" />
                            ★ Obligatorio
                          </span>
                        ) : item.assignedBy ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-300 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-cyan-600" />
                            Sugerido
                          </span>
                        ) : null}
                      </div>

                      {hasAttended ? (
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ✓ Asistencia Completa
                        </span>
                      ) : item.isCheckedIn ? (
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-300 flex items-center gap-1.5 animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          🟢 En Curso (Entrada)
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Agendado
                        </span>
                      )}
                    </div>

                    {/* Title & Instructor */}
                    <h3 className="text-base font-extrabold text-slate-900 mb-2 line-clamp-2">{event.title}</h3>
                    
                    {/* Supervisor assignment details note */}
                    {item.assignedBy && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1 mb-4 text-amber-900">
                        <div className="flex items-center gap-1.5 font-bold">
                          <User className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Asignado por: {item.assignedBy}</span>
                        </div>
                        {item.assignmentNotes && (
                          <p className="text-[11px] italic pl-5">"{item.assignmentNotes}"</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-1.5 mb-5 text-xs text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-[#DA291C] shrink-0" />
                        <span>Facilitador: <strong className="text-slate-800">{event.instructor}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-[#DA291C] shrink-0" />
                        <span>{formatDateLong(schedule.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#DA291C] shrink-0" />
                        <span>Horario: <strong className="text-slate-800">{slot.time}{slot.endTime ? ` - ${slot.endTime}` : ''}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Duración: <strong className="text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">{getEventDurationMetrics(event).totalHours} hrs lectivas ({getEventDurationMetrics(event).totalDays} {getEventDurationMetrics(event).totalDays === 1 ? 'día' : 'días'})</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.modality === 'Virtual' ? (
                          <Video className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                        <span>Lugar: {event.location || (event.modality === 'Virtual' ? 'Microsoft Teams' : 'Instalaciones Claro')}</span>
                      </div>
                    </div>

                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    
                    {/* Calendar Quick Sync */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadIcsFile(event, schedule.date, slot.time)}
                        title="Descargar archivo de calendario .ics"
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-[#DA291C]" />
                        Descargar .ICS
                      </button>
                      <a
                        href={getGoogleCalendarUrl(event, schedule.date, slot.time)}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir en Google Calendar"
                        className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-[#DA291C] text-xs font-bold flex items-center justify-center gap-1.5 border border-red-200 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Google
                      </a>
                    </div>

                    {/* Pass QR & Cancel Action */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <button
                        onClick={() => setSelectedPassItem(item)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        Pase QR
                      </button>

                      {item.isMandatory ? (
                        <div 
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-red-200 text-red-700 text-xs font-bold select-none cursor-help"
                          title="Esta capacitación fue asignada obligatoriamente por tu supervisor y no puede ser cancelada."
                        >
                          <Lock className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>Obligatorio</span>
                        </div>
                      ) : !hasAttended && !item.isCheckedIn ? (
                        <button
                          onClick={() => setCancelingItem(item)}
                          className="p-2 rounded-xl text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors"
                          title="Cancelar inscripción y liberar cupo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : null}
                    </div>

                    {/* Botón de Evaluación TEC / Aviso de Salida Pendiente */}
                    {onOpenTecEvaluation && (
                      item.hasAttended ? (
                        (() => {
                          const userFeedback = (event.feedbacks || []).find(
                            fb => fb.userEmail.toLowerCase() === currentUser.email.toLowerCase()
                          );
                          return (
                            <div className="pt-2">
                              {userFeedback ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenTecEvaluation(event)}
                                  className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                  title="Encuesta completada (1 sola respuesta permitida). Haz clic para consultar tus calificaciones."
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>✓ Encuesta Completada ({userFeedback.rating}★) - Ver Respuestas</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onOpenTecEvaluation(event)}
                                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                                >
                                  <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                                  <span>Evaluar Curso & Facilitador (TEC)</span>
                                </button>
                              )}
                            </div>
                          );
                        })()
                      ) : item.isCheckedIn ? (
                        <div className="pt-2">
                          <div className="w-full py-2 px-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>⏳ Entrada registrada. Registra tu salida para habilitar la evaluación TEC.</span>
                          </div>
                        </div>
                      ) : null
                    )}

                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <CalendarCheck2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No tienes capacitaciones agendadas</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6 leading-relaxed">
              Aún no te has inscrito a ningún taller o webinar. Explora nuestro catálogo y asegura tu lugar en las sesiones disponibles.
            </p>
            <button
              onClick={onExploreCatalog}
              className="px-6 py-3 rounded-2xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/25 inline-flex items-center gap-2 transition-all"
            >
              <span>Ver Catálogo de Cursos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

        </div>
      )}

      {/* VISTA 2: HISTÓRICO COMPLETO DE CAPACITACIONES & FORMACIÓN CONTINUA */}
      {currentSubTab === 'history' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* 1. KPIs del Histórico */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#DA291C] border border-red-100 flex items-center justify-center shadow-2xs">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">{historyMetrics.totalCount}</div>
                <p className="text-xs font-semibold text-slate-500">Capacitaciones Totales</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shadow-2xs">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {historyMetrics.totalHours} <span className="text-xs font-bold text-slate-500">hrs</span>
                </div>
                <p className="text-xs font-semibold text-slate-500">Horas Acumuladas</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-2xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">{historyMetrics.attendedCount}</div>
                <p className="text-xs font-semibold text-slate-500">Sesiones Asistidas</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shadow-2xs">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">{historyMetrics.rate}%</div>
                <p className="text-xs font-semibold text-slate-500">Tasa de Asistencia</p>
              </div>
            </div>
          </div>

          {/* 2. Barra de Búsqueda y Filtros Rápidos */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs">
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Buscar por curso, facilitador o categoría..."
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
              />
              {historySearchQuery && (
                <button
                  onClick={() => setHistorySearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-thin">
              <button
                onClick={() => setHistoryStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  historyStatusFilter === 'all'
                    ? 'bg-[#DA291C] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({historyMetrics.totalCount})
              </button>
              <button
                onClick={() => setHistoryStatusFilter('attended')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  historyStatusFilter === 'attended'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Asistidos ({historyMetrics.attendedCount})</span>
              </button>
              <button
                onClick={() => setHistoryStatusFilter('upcoming')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  historyStatusFilter === 'upcoming'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Agendados ({historyMetrics.upcomingCount})</span>
              </button>
              <button
                onClick={() => setHistoryStatusFilter('missed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  historyStatusFilter === 'missed'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>No Asistió ({historyMetrics.missedCount})</span>
              </button>
            </div>
          </div>

          {/* 3. Tabla / Listado de Registros del Histórico */}
          {filteredHistoryRecords.length > 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4">Capacitación</th>
                      <th className="py-3.5 px-4">Modalidad</th>
                      <th className="py-3.5 px-4">Fecha & Hora</th>
                      <th className="py-3.5 px-4">Facilitador</th>
                      <th className="py-3.5 px-3 text-center">Horas</th>
                      <th className="py-3.5 px-4 text-center">Estado</th>
                      {isSuperAdmin && <th className="py-3.5 px-4 text-right">Constancia</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistoryRecords.map((rec) => {
                      const isPast = rec.date < todayStr;
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="py-4 px-4 font-bold text-slate-900 max-w-xs">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {rec.isExternal && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                                  Externa
                                </span>
                              )}
                              {rec.isRecurrent && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wider">
                                  Recurrente • Academia
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-50 text-[#DA291C] border border-red-200">
                                {rec.category}
                              </span>
                              {rec.gradeScore !== null && rec.gradeScore !== undefined && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                  rec.gradeScore >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  Nota: {rec.gradeScore} pts
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <p className="line-clamp-1 text-slate-900 font-extrabold text-xs">{rec.title}</p>
                              {rec.credentialUrl && (
                                <a
                                  href={rec.credentialUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-[10px] font-bold shrink-0 inline-flex items-center gap-0.5"
                                  title="Ver certificado oficial externo"
                                >
                                  <ExternalLink className="w-3 h-3" /> Certificado
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-slate-600">
                            <span className="font-semibold block text-slate-800">{rec.modality}</span>
                          </td>
                          <td className="py-4 px-4 text-slate-600 whitespace-nowrap">
                            <span className="font-bold text-slate-900 block">{formatDateShort(rec.date)}</span>
                            <span className="text-[11px] text-slate-500 font-medium">{rec.time}</span>
                          </td>
                          <td className="py-4 px-4 text-slate-700">
                            <span className="font-medium line-clamp-1">{rec.instructor}</span>
                          </td>
                          <td className="py-4 px-3 text-center font-black text-slate-900">
                            {rec.hours} hrs
                          </td>
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            {rec.isRecurrent ? (
                              rec.academicStatus === 'passed' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Acreditado ({rec.attendancePercentage || 0}%)
                                </span>
                              ) : rec.academicStatus === 'in_progress' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Clock className="w-3.5 h-3.5" /> En Curso ({rec.attendancePercentage || 0}%)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertTriangle className="w-3.5 h-3.5" /> No Acreditado ({rec.attendancePercentage || 0}%)
                                </span>
                              )
                            ) : rec.hasAttended ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Asistió
                              </span>
                            ) : !isPast ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Clock className="w-3.5 h-3.5" /> Agendado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle className="w-3.5 h-3.5" /> No Asistió
                              </span>
                            )}
                          </td>
                          {isSuperAdmin && (
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setSelectedRecordsForLetter([rec]);
                                  setIsFormalLetterModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                                title="Elaborar constancia formal para esta capacitación (Exclusivo Super Administrador)"
                              >
                                <FileText className="w-3.5 h-3.5 text-[#DA291C]" />
                                <span>Emitir Carta</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No se encontraron capacitaciones en el historial</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No hay registros que coincidan con el filtro seleccionado o los términos de búsqueda.
              </p>
              <button
                onClick={() => {
                  setHistoryStatusFilter('all');
                  setHistorySearchQuery('');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Limpiar Filtros
              </button>
            </div>
          )}

        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h2 className="text-base font-extrabold text-slate-900">¿Cancelar tu inscripción?</h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Al cancelar, liberarás tu cupo en <strong>{cancelingItem.event.title}</strong> ({cancelingItem.schedule.date} a las {cancelingItem.slot.time}) para que otro colaborador pueda registrarse.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelingItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={isProcessingCancel}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 transition-all"
              >
                {isProcessingCancel ? 'Cancelando...' : 'Sí, Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Pass Modal */}
      {selectedPassItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-pass-title"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 id="qr-pass-title" className="text-xs font-extrabold text-[#DA291C] uppercase tracking-wider">Pase Digital de Asistencia</h2>
              <button 
                type="button"
                onClick={() => setSelectedPassItem(null)} 
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-claro"
                aria-label="Cerrar pase digital de asistencia"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl inline-block shadow-inner">
              <QRCodeSVG
                value={`GAES-PASS:${selectedPassItem.event.id}:${selectedPassItem.schedule.date}:${selectedPassItem.slot.time}:${currentUser.email}`}
                size={180}
                level="H"
                fgColor="#1E293B"
              />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{selectedPassItem.event.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{selectedPassItem.schedule.date} • {selectedPassItem.slot.time}{selectedPassItem.slot.endTime ? ` - ${selectedPassItem.slot.endTime}` : ''}</p>
              <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>{getEventDurationMetrics(selectedPassItem.event).totalHours} hrs lectivas ({getEventDurationMetrics(selectedPassItem.event).totalDays} {getEventDurationMetrics(selectedPassItem.event).totalDays === 1 ? 'día' : 'días'})</span>
              </div>
              <p className="text-[11px] font-bold text-slate-800 mt-1.5">{currentUser.name} ({currentUser.email})</p>
            </div>

            <p className="text-[10px] text-slate-500">
              Presenta este código QR al instructor en la entrada para registrar tu asistencia.
            </p>

            <button
              onClick={() => setSelectedPassItem(null)}
              className="w-full py-2.5 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              Cerrar Pase
            </button>
          </div>
        </div>
      )}

      {/* Módulo de Elaboración de Carta Formal de Histórico de Participación (Exclusivo Super Administrador) */}
      {isSuperAdmin && (
        <FormalLetterModal
          isOpen={isFormalLetterModalOpen}
          onClose={() => {
            setIsFormalLetterModalOpen(false);
            setSelectedRecordsForLetter(null);
          }}
          currentUser={currentUser}
          participant={currentParticipant}
          companies={companies}
          trainingRecords={selectedRecordsForLetter || trainingHistoryRecords}
        />
      )}

      {/* Modal de Registro de Asistencia Diaria por PIN proyectado (Academia Técnica) */}
      {selectedPinTraining && (
        <TechnicalPinCheckinModal
          isOpen={Boolean(selectedPinTraining)}
          onClose={() => setSelectedPinTraining(null)}
          training={selectedPinTraining}
          currentUser={currentUser}
          currentParticipant={currentParticipant}
          onSuccess={() => {
            if (onRefreshTechnicalHistory) {
              onRefreshTechnicalHistory();
            }
          }}
          onShowToast={onShowToast || (() => {})}
        />
      )}

    </div>
  );
};
