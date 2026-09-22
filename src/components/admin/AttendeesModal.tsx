import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Users, 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  Calendar as CalendarIcon, 
  UserCheck,
  UserX,
  UserPlus,
  GraduationCap,
  Award,
  Target,
  AlertTriangle,
  Save,
  Check,
  Sparkles,
  RefreshCw,
  TrendingUp,
  ShieldAlert,
  FileSpreadsheet,
  Tv,
  RotateCcw,
  Layers,
  QrCode,
  LogIn,
  LogOut,
  Trash2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { TrainingEvent, Participant, ParticipantGrade, AcademicStatus, EventModule, ParticipantModuleGrade } from '../../types';
import { exportAttendeesToExcel, exportEventGradesToExcel, exportSessionGradesForOjtAndCalibration } from '../../utils/excelUtils';
import { formatDateLong } from '../../utils/formatters';
import { apiService } from '../../services/api';
import { attendanceWs } from '../../services/websocket';
import { AccessibleModal } from '../common/AccessibleModal';

interface AttendeesModalProps {
  event: TrainingEvent | null;
  participants: Participant[];
  isSuperAdmin?: boolean;
  initialProjectorMode?: boolean;
  onClose: () => void;
  onConfirmAttendance: (eventId: string, date: string, time: string, email: string, type?: 'checkin' | 'checkout') => Promise<void>;
  onRevertAttendance?: (eventId: string, date: string, time: string, email: string, type?: 'checkout' | 'all') => Promise<void>;
  onOpenBulkEnrollment?: (eventId: string, date: string, time: string) => void;
  onSaveGradesSuccess?: (updatedEvent: TrainingEvent) => void;
  onCancelRegistration?: (eventId: string, date: string, time: string, email: string, isSupervisorOrAdmin?: boolean, force?: boolean) => Promise<void>;
}

export const AttendeesModal: React.FC<AttendeesModalProps> = ({
  event,
  participants,
  isSuperAdmin = false,
  initialProjectorMode = false,
  onClose,
  onConfirmAttendance,
  onRevertAttendance,
  onOpenBulkEnrollment,
  onSaveGradesSuccess,
  onCancelRegistration
}) => {
  if (!event) return null;

  const hasGrading = event.evaluationType && event.evaluationType !== 'attendance_only';
  const passingScore = event.passingScore !== undefined ? event.passingScore : 70;
  const skillsList = event.skillsEvaluated || [];

  const [activeTab, setActiveTab] = useState<'attendance' | 'grades'>('attendance');
  const [selectedDate, setSelectedDate] = useState<string>(event.schedule[0]?.date || '');
  const [selectedTime, setSelectedTime] = useState<string>(event.schedule[0]?.slots[0]?.time || '');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Estado local para calificaciones editables
  const hasModules = Boolean(event.modules && event.modules.length > 0);
  const eventModules = useMemo(() => event.modules || [], [event.modules]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('summary');
  const [isProjectorOpen, setIsProjectorOpen] = useState<boolean>(initialProjectorMode);
  const [projectorMode, setProjectorMode] = useState<'checkin' | 'checkout'>('checkin');
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const [participantToUnassign, setParticipantToUnassign] = useState<any | null>(null);
  const [isUnassigning, setIsUnassigning] = useState<boolean>(false);

  // Escuchar eventos en vivo de WebSocket para asistencia
  useEffect(() => {
    const unsub = attendanceWs.onAttendanceEvent((wsEvt) => {
      if (wsEvt.eventId === event.id && wsEvt.date === selectedDate && wsEvt.time === selectedTime) {
        const action = wsEvt.type === 'ATTENDANCE_CHECK_IN' 
          ? 'Entrada registrada' 
          : wsEvt.type === 'ATTENDANCE_CHECK_OUT' 
            ? 'Salida registrada' 
            : 'Asistencia revertida';
        setLiveToast(`⚡ En tiempo real: ${wsEvt.participantName || wsEvt.email || 'Colaborador'} (${action})`);
        const timer = setTimeout(() => setLiveToast(null), 4000);
        return () => clearTimeout(timer);
      }
    });
    return () => unsub();
  }, [event.id, selectedDate, selectedTime]);

  const [gradesMap, setGradesMap] = useState<Record<string, {
    score: number | string;
    academicStatus: AcademicStatus;
    detectedSkillGaps: string[];
    weaknessesNotes: string;
    strengthsNotes: string;
    needsRetraining: boolean;
    feedback: string;
    gradedBy: string;
    moduleGrades: ParticipantModuleGrade[];
  }>>({});

  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Inicializar estado de calificaciones desde event.grades
  useEffect(() => {
    const initialMap: Record<string, any> = {};
    (event.grades || []).forEach(g => {
      let pModuleGrades: ParticipantModuleGrade[] = [];
      if (eventModules.length > 0) {
        pModuleGrades = eventModules.map(m => {
          const existing = (g.moduleGrades || []).find(mg => mg.moduleId === m.id);
          return existing || {
            moduleId: m.id,
            moduleName: m.title,
            score: null,
            academicStatus: 'pending',
            feedback: '',
            gradedBy: g.gradedBy || 'Instructor / Evaluador'
          };
        });
      }

      initialMap[g.participantCard] = {
        score: g.score !== null && g.score !== undefined ? g.score : '',
        academicStatus: g.academicStatus || 'pending',
        detectedSkillGaps: g.detectedSkillGaps || [],
        weaknessesNotes: g.weaknessesNotes || '',
        strengthsNotes: g.strengthsNotes || '',
        needsRetraining: g.needsRetraining || false,
        feedback: g.feedback || '',
        gradedBy: g.gradedBy || 'Instructor / Evaluador',
        moduleGrades: pModuleGrades
      };
    });
    setGradesMap(initialMap);
  }, [event, eventModules]);

  const currentSchedule = event.schedule.find(s => s.date === selectedDate);
  const currentSlot = currentSchedule?.slots.find(s => s.time === selectedTime);

  const attendeesList = currentSlot?.attendees || [];
  const attendedList = currentSlot?.attendedList || [];
  const checkInList = currentSlot?.checkInList || attendedList;
  const checkOutList = currentSlot?.checkOutList || [];
  const completedAttendanceList = currentSlot?.completedAttendanceList || [];
  const attendanceDetails = currentSlot?.attendanceDetails || [];

  // Lista de todos los inscritos en el horario actual con datos de participante y asistencia detallada
  const currentSlotParticipants = useMemo(() => {
    return attendeesList.map(email => {
      const p = participants.find(part => part.email.toLowerCase() === email.toLowerCase());
      const cleanEmail = email.toLowerCase();
      const isCheckedIn = checkInList.map(a => a.toLowerCase()).includes(cleanEmail);
      const isCheckedOut = checkOutList.map(a => a.toLowerCase()).includes(cleanEmail);
      const isCompleted = completedAttendanceList.map(a => a.toLowerCase()).includes(cleanEmail) || (isCheckedIn && isCheckedOut);
      const detail = attendanceDetails.find(d => d.email.toLowerCase() === cleanEmail);

      return {
        email,
        participant: p,
        card: p?.card || '',
        name: p?.name || email.split('@')[0],
        department: p?.department || 'General',
        isCheckedIn,
        isCheckedOut,
        isCompleted,
        isAttended: isCompleted,
        checkInAt: detail?.checkInAt || null,
        checkOutAt: detail?.checkOutAt || null
      };
    });
  }, [attendeesList, checkInList, checkOutList, completedAttendanceList, attendanceDetails, participants]);

  // Filtrado por búsqueda
  const filteredParticipants = currentSlotParticipants.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.email.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.card.includes(q) ||
      item.department.toLowerCase().includes(q)
    );
  });

  // Métricas de calificaciones en tiempo real
  const gradeStats = useMemo(() => {
    const currentGrades = Object.values(gradesMap).filter(g => g.score !== '' && g.score !== null);
    if (currentGrades.length === 0) {
      return { totalGraded: 0, passedCount: 0, failedCount: 0, avgScore: '0.0', withGapsCount: 0 };
    }
    const totalGraded = currentGrades.length;
    const passedCount = currentGrades.filter(g => g.academicStatus === 'passed').length;
    const failedCount = currentGrades.filter(g => g.academicStatus === 'failed').length;
    const withGapsCount = currentGrades.filter(g => (g.detectedSkillGaps || []).length > 0 || g.needsRetraining).length;
    const sumScore = currentGrades.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
    const avgScore = totalGraded > 0 ? (sumScore / totalGraded).toFixed(1) : '0.0';

    return { totalGraded, passedCount, failedCount, avgScore, withGapsCount };
  }, [gradesMap]);

  const getParticipantGrade = (card: string) => {
    if (gradesMap[card]) return gradesMap[card];
    return {
      score: '',
      academicStatus: 'pending' as AcademicStatus,
      detectedSkillGaps: [],
      weaknessesNotes: '',
      strengthsNotes: '',
      needsRetraining: false,
      feedback: '',
      gradedBy: 'Instructor / Evaluador',
      moduleGrades: eventModules.map(m => ({
        moduleId: m.id,
        moduleName: m.title,
        score: null,
        academicStatus: 'pending' as AcademicStatus,
        feedback: '',
        gradedBy: 'Instructor / Evaluador'
      }))
    };
  };

  // Manejar cambio de puntaje por participante
  const handleScoreChange = (card: string, val: string) => {
    const num = val === '' ? '' : Number(val);
    const current = getParticipantGrade(card);

    let computedStatus: AcademicStatus = current.academicStatus;
    let computedRetraining = current.needsRetraining;

    if (num !== '') {
      if (num >= passingScore) {
        computedStatus = 'passed';
        computedRetraining = false;
      } else {
        computedStatus = 'failed';
        computedRetraining = true;
      }
    } else {
      computedStatus = 'pending';
    }

    setGradesMap(prev => ({
      ...prev,
      [card]: {
        ...current,
        score: val,
        academicStatus: computedStatus,
        needsRetraining: computedRetraining
      }
    }));
  };

  // Manejar cambio manual de estado cualitativo
  const handleStatusChange = (card: string, status: AcademicStatus) => {
    const current = getParticipantGrade(card);

    setGradesMap(prev => ({
      ...prev,
      [card]: {
        ...current,
        academicStatus: status,
        needsRetraining: status === 'failed'
      }
    }));
  };

  // Toggle de debilidad en una competencia específica
  const handleToggleSkillGap = (card: string, skill: string) => {
    const current = getParticipantGrade(card);

    const gaps = current.detectedSkillGaps || [];
    const newGaps = gaps.includes(skill)
      ? gaps.filter(s => s !== skill)
      : [...gaps, skill];

    setGradesMap(prev => ({
      ...prev,
      [card]: {
        ...current,
        detectedSkillGaps: newGaps,
        needsRetraining: newGaps.length > 0 || current.academicStatus === 'failed'
      }
    }));
  };

  // Manejar notas de debilidad
  const handleWeaknessNotesChange = (card: string, notes: string) => {
    const current = getParticipantGrade(card);

    setGradesMap(prev => ({
      ...prev,
      [card]: {
        ...current,
        weaknessesNotes: notes
      }
    }));
  };

  // Toggle de re-capacitación
  const handleToggleRetraining = (card: string) => {
    const current = getParticipantGrade(card);

    setGradesMap(prev => ({
      ...prev,
      [card]: {
        ...current,
        needsRetraining: !current.needsRetraining
      }
    }));
  };

  const handleModuleScoreChange = (card: string, moduleId: string, val: string) => {
    const num = val === '' ? null : Number(val);
    const curr = getParticipantGrade(card);
    const targetModule = eventModules.find(m => m.id === moduleId);
    const modPassingScore = targetModule?.passingScore !== undefined ? targetModule.passingScore : passingScore;

    let modStatus: AcademicStatus = 'pending';
    if (num !== null) {
      modStatus = num >= modPassingScore ? 'passed' : 'failed';
    }

    const updatedModuleGrades = curr.moduleGrades.map((mg: ParticipantModuleGrade) => {
      if (mg.moduleId === moduleId) {
        return {
          ...mg,
          score: num,
          academicStatus: modStatus
        };
      }
      return mg;
    });

    const validScores = updatedModuleGrades
      .filter((m: ParticipantModuleGrade) => m.score !== null && m.score !== undefined)
      .map((m: ParticipantModuleGrade) => Number(m.score));

    let newAvgScore: number | string = '';
    let newOverallStatus: AcademicStatus = curr.academicStatus;
    let newRetraining = curr.needsRetraining;

    if (validScores.length > 0) {
      const sum = validScores.reduce((acc: number, v: number) => acc + v, 0);
      newAvgScore = Math.round((sum / validScores.length) * 10) / 10;
      
      const anyFailed = updatedModuleGrades.some((m: ParticipantModuleGrade) => m.academicStatus === 'failed');
      if (anyFailed || Number(newAvgScore) < passingScore) {
        newOverallStatus = 'failed';
        newRetraining = true;
      } else if (validScores.length === eventModules.length) {
        newOverallStatus = 'passed';
        newRetraining = false;
      } else {
        newOverallStatus = 'pending';
      }
    }

    setGradesMap(prev => ({
      ...prev,
      [card]: {
        ...curr,
        score: newAvgScore,
        academicStatus: newOverallStatus,
        needsRetraining: newRetraining,
        moduleGrades: updatedModuleGrades
      }
    }));
  };

  const handleModuleFeedbackChange = (card: string, moduleId: string, feedback: string) => {
    const curr = getParticipantGrade(card);
    const updatedModuleGrades = curr.moduleGrades.map((mg: ParticipantModuleGrade) => {
      if (mg.moduleId === moduleId) {
        return { ...mg, feedback };
      }
      return mg;
    });
    setGradesMap(prev => ({
      ...prev,
      [card]: {
        ...curr,
        moduleGrades: updatedModuleGrades
      }
    }));
  };

  // Guardar calificaciones masivas en base de datos
  const handleSaveAllGrades = async () => {
    try {
      setIsSavingGrades(true);
      setSaveSuccessMsg('');

      const gradesPayload = Object.entries(gradesMap).map(([card, data]) => ({
        eventId: event.id,
        participantCard: card,
        score: data.score !== '' && data.score !== null ? Number(data.score) : null,
        academicStatus: data.academicStatus,
        detectedSkillGaps: data.detectedSkillGaps,
        weaknessesNotes: data.weaknessesNotes,
        strengthsNotes: data.strengthsNotes,
        needsRetraining: data.needsRetraining,
        feedback: data.feedback,
        gradedBy: data.gradedBy || 'Instructor / Evaluador',
        moduleGrades: data.moduleGrades || []
      }));

      const res = await apiService.saveBulkGrades(gradesPayload);
      
      const updatedEvent: TrainingEvent = {
        ...event,
        grades: res.grades.filter(g => g.eventId === event.id)
      };

      if (onSaveGradesSuccess) {
        onSaveGradesSuccess(updatedEvent);
      }

      setSaveSuccessMsg('¡Calificaciones y diagnóstico de debilidades guardados con éxito!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err: any) {
      alert('Error al guardar calificaciones: ' + err.message);
    } finally {
      setIsSavingGrades(false);
    }
  };

  return (
    <AccessibleModal
      onClose={onClose}
      ariaLabel={`Gestión de Asistencia - ${event?.title || ''}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Real-time WebSocket Live Alert Toast */}
        {liveToast && (
          <div role="status" aria-live="polite" className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 text-center animate-in slide-in-from-top duration-200 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>{liveToast}</span>
          </div>
        )}

        {/* Header & Tabs */}
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-[#DA291C] border border-red-200">
                Gestión de Asistencia & Calificaciones
              </span>
              <span className="text-xs text-slate-500 font-bold">{event.category}</span>
              {hasGrading && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3 text-indigo-600" />
                  {event.evaluationType === 'score_100' ? 'Nota 0-100' : event.evaluationType === 'scale_1_5' ? 'Escala 1-5' : 'Aprobado/Reprobado'}
                </span>
              )}
              {event.ojtEvaluatorName && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1" title="Tutor / Evaluador Responsable">
                  <UserCheck className="w-3 h-3 text-indigo-600" />
                  <span>Tutor: {event.ojtEvaluatorName}</span>
                </span>
              )}
            </div>
            <h2 className="text-lg font-black text-slate-900 line-clamp-1">{event.title}</h2>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Tab Switcher if Event Has Grading */}
            {hasGrading && (
              <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'attendance'
                      ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Asistencia ({completedAttendanceList.length}/{attendeesList.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('grades')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'grades'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Calificaciones & Debilidades</span>
                  {gradeStats.totalGraded > 0 && (
                    <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[10px] rounded-full font-extrabold">
                      {gradeStats.totalGraded}
                    </span>
                  )}
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              aria-label="Cerrar modal de gestión de asistencia"
              className="p-2 sm:p-1.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-target-44 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer inline-flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters and Date Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-200 space-y-3 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3.5 my-auto" />
              <input
                id="attendees-modal-search"
                type="text"
                aria-label="Buscar colaborador por nombre, tarjeta, cédula o depto"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, tarjeta, cédula o depto..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {activeTab === 'attendance' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsProjectorOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-500/25 transition-all cursor-pointer"
                    title="Proyectar código QR de asistencia en pantalla para que los alumnos lo escaneen"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>Proyectar QR en Sala</span>
                  </button>

                  <button
                    onClick={() => exportAttendeesToExcel(event, selectedDate, selectedTime, attendeesList, attendedList, participants, checkInList, checkOutList, completedAttendanceList)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Asistentes (.xlsx)</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportSessionGradesForOjtAndCalibration(event, participants)}
                    title="Descargar libro con 4 hojas: Insumo Bitácoras de Campo, Mesas de Calibración, Estadísticas y Calificaciones"
                    className="px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Insumo Bitácoras & Calibración (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => exportEventGradesToExcel(event, participants)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Calificaciones (.xlsx)</span>
                  </button>
                </div>
              )}

              {isSuperAdmin && onOpenBulkEnrollment && activeTab === 'attendance' && (
                <button
                  onClick={() => onOpenBulkEnrollment(event.id, selectedDate, selectedTime)}
                  className="px-3 py-1.5 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Matricular</span>
                </button>
              )}
            </div>
          </div>

          {currentSchedule && (
            <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] font-bold text-slate-500">Horarios:</span>
                {currentSchedule.slots.map(s => (
                  <button
                    key={s.time}
                    onClick={() => setSelectedTime(s.time)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedTime === s.time
                        ? 'bg-red-50 border border-red-200 text-[#DA291C]'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {s.time}{s.endTime ? ` - ${s.endTime}` : ''} ({s.registered}/{s.capacity})
                  </button>
                ))}
              </div>

              {currentSlot && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold text-[11px] flex items-center gap-1.5" title="Código PIN diario para registrar Entrada">
                    <span className="text-emerald-600 uppercase font-sans text-[10px]">PIN Entrada:</span>
                    <strong className="tracking-widest">{currentSlot.checkinCode || '----'}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 font-mono font-bold text-[11px] flex items-center gap-1.5" title="Código PIN diario para registrar Salida">
                    <span className="text-blue-600 uppercase font-sans text-[10px]">PIN Salida:</span>
                    <strong className="tracking-widest">{currentSlot.checkoutCode || '----'}</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ==========================================
            TAB 1: ASISTENCIA Y CHECK-IN
            ========================================== */}
        {activeTab === 'attendance' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            
            {/* Search bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar asistente por nombre, correo o número de tarjeta..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
              />
            </div>

            {filteredParticipants.length > 0 ? (
              <div className="space-y-2">
                {filteredParticipants.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        item.isCompleted 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : item.isCheckedIn 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-slate-900">{item.name}</p>
                          {item.isCompleted ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Completa
                            </span>
                          ) : item.isCheckedIn ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
                              <Clock className="w-3 h-3 text-amber-600" />
                              En Curso (Entrada OK)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Pendiente
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {item.email} {item.card && `• Tarjeta: #${item.card}`} • <span className="text-slate-700 font-semibold">{item.department}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                      {/* Check-In Action / Status */}
                      <div className="flex items-center gap-1.5">
                        {item.isCheckedIn ? (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1" title={item.checkInAt ? `Entrada: ${new Date(item.checkInAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Entrada registrada'}>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Entrada: {item.checkInAt ? new Date(item.checkInAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'OK'}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onConfirmAttendance(event.id, selectedDate, selectedTime, item.email, 'checkin')}
                            className="px-3 py-1.5 min-h-[36px] sm:min-h-0 touch-target-44 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                          >
                            <LogIn className="w-3 h-3" />
                            <span>+ Entrada</span>
                          </button>
                        )}
                      </div>

                      {/* Check-Out Action / Status */}
                      <div className="flex items-center gap-1.5">
                        {item.isCheckedOut ? (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1" title={item.checkOutAt ? `Salida: ${new Date(item.checkOutAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Salida registrada'}>
                            <Check className="w-3 h-3 text-blue-600" />
                            <span>Salida: {item.checkOutAt ? new Date(item.checkOutAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'OK'}</span>
                          </span>
                        ) : item.isCheckedIn ? (
                          <button
                            type="button"
                            onClick={() => onConfirmAttendance(event.id, selectedDate, selectedTime, item.email, 'checkout')}
                            className="px-3 py-1.5 min-h-[36px] sm:min-h-0 touch-target-44 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-[10px] font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>+ Salida</span>
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
                            Salida Pendiente
                          </span>
                        )}
                      </div>

                      {/* Revert Action */}
                      {onRevertAttendance && (item.isCheckedIn || item.isCheckedOut) && (
                        <button
                          type="button"
                          onClick={() => onRevertAttendance(event.id, selectedDate, selectedTime, item.email, item.isCheckedOut ? 'checkout' : 'all')}
                          className="px-2.5 py-1.5 min-h-[36px] sm:min-h-0 touch-target-44 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          title={item.isCheckedOut ? 'Revertir solo la salida (mantener entrada)' : 'Revertir asistencia'}
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Revertir {item.isCheckedOut ? 'Salida' : ''}</span>
                        </button>
                      )}

                      {/* Super Admin Action: Eliminar Asignación del Participante */}
                      {isSuperAdmin && onCancelRegistration && (
                        <button
                          type="button"
                          onClick={() => setParticipantToUnassign(item)}
                          className="px-2.5 py-1.5 min-h-[36px] sm:min-h-0 touch-target-44 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                          title="Eliminar asignación del participante (Super Admin - Antes o después de impartirse)"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>Desasignar</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                No hay colaboradores inscritos que coincidan con la búsqueda en este horario.
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB 2: LIBRO DE CALIFICACIONES Y DEBILIDADES
            ========================================== */}
        {activeTab === 'grades' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            
            {/* KPI Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-center shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Promedio General</span>
                <p className="text-xl font-black text-[#DA291C] mt-0.5">{gradeStats.avgScore} <span className="text-xs text-slate-500">pts</span></p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-center shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Evaluados</span>
                <p className="text-xl font-black text-slate-900 mt-0.5">{gradeStats.totalGraded} <span className="text-xs text-slate-500">/ {currentSlotParticipants.length}</span></p>
              </div>

              <div className="bg-white border border-emerald-200 rounded-2xl p-3.5 text-center shadow-xs">
                <span className="text-[10px] text-emerald-700 uppercase font-black tracking-wider">Aprobados</span>
                <p className="text-xl font-black text-emerald-700 mt-0.5">{gradeStats.passedCount}</p>
              </div>

              <div className="bg-white border border-rose-200 rounded-2xl p-3.5 text-center shadow-xs">
                <span className="text-[10px] text-rose-700 uppercase font-black tracking-wider">Con Debilidades / Reprobados</span>
                <p className="text-xl font-black text-rose-700 mt-0.5">{gradeStats.withGapsCount}</p>
              </div>
            </div>

            {/* Instruction Banner */}
            <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-900">
                  <span className="font-bold">Detección de Brechas:</span> Asienta la nota y haz clic en las competencias evaluadas para marcar si el colaborador mostró debilidad en ese tema.
                </p>
              </div>
              <span className="text-[10px] text-indigo-800 font-bold whitespace-nowrap bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200">
                Mínimo para aprobar: {passingScore} pts
              </span>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por colaborador, tarjeta o departamento..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
              />
            </div>

            {/* Success alert message */}
            {saveSuccessMsg && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Module Selector Bar (If Event Has Modules) */}
            {hasModules && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedModuleId('summary')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    selectedModuleId === 'summary'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Resumen Consolidado</span>
                </button>

                {eventModules.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedModuleId(m.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                      selectedModuleId === m.id
                        ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{m.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      selectedModuleId === m.id ? 'bg-white/20 text-white font-black' : 'bg-slate-100 text-slate-600 font-bold'
                    }`}>
                      Mín: {m.passingScore ?? 70} pts
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* CASE 1: Event has Modules & Selected Tab is Consolidated Summary */}
            {hasModules && selectedModuleId === 'summary' ? (
              filteredParticipants.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="table-responsive-container">
                      <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                            <th className="p-3">Colaborador</th>
                            <th className="p-3">Tarjeta</th>
                            <th className="p-3">Departamento</th>
                            {eventModules.map(m => (
                              <th key={m.id} className="p-3 text-center whitespace-nowrap">
                                <div>{m.title}</div>
                                <div className="text-[10px] text-slate-500 font-normal">Mín: {m.passingScore ?? 70} pts</div>
                              </th>
                            ))}
                            <th className="p-3 text-center">Promedio Final</th>
                            <th className="p-3 text-center">Estado Académico</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredParticipants.map(item => {
                            const g = getParticipantGrade(item.card);
                            return (
                              <tr key={item.card || item.email} className="hover:bg-slate-50/50">
                                <td className="p-3">
                                  <p className="font-bold text-slate-900">{item.name}</p>
                                  <p className="text-[10px] text-slate-500">{item.email}</p>
                                </td>
                                <td className="p-3 text-slate-600 font-mono">#{item.card || 'N/A'}</td>
                                <td className="p-3 text-slate-600">{item.department}</td>
                                {eventModules.map(m => {
                                  const mg = (g.moduleGrades || []).find((x: ParticipantModuleGrade) => x.moduleId === m.id);
                                  const scoreVal = mg?.score;
                                  const isPassed = mg?.academicStatus === 'passed';
                                  const isFailed = mg?.academicStatus === 'failed';
                                  return (
                                    <td key={m.id} className="p-3 text-center">
                                      {scoreVal !== null && scoreVal !== undefined ? (
                                        <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black ${
                                          isPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : isFailed ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700'
                                        }`}>
                                          {scoreVal} pts
                                        </span>
                                      ) : (
                                        <span className="text-slate-300 text-xs">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="p-3 text-center">
                                  <span className="font-black text-slate-900 text-xs">
                                    {g.score !== null && g.score !== '' ? `${g.score} pts` : '—'}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${
                                    g.academicStatus === 'passed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : g.academicStatus === 'failed' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {g.academicStatus === 'passed' ? '✓ Aprobado' : g.academicStatus === 'failed' ? '✕ Reprobado' : '⏳ Pendiente'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No hay participantes inscritos para evaluar en este horario.
                </div>
              )
            ) : hasModules && selectedModuleId !== 'summary' ? (
              /* CASE 2: Event has Modules & Specific Module is Selected */
              (() => {
                const currentMod = eventModules.find(m => m.id === selectedModuleId);
                if (!currentMod) return null;
                const modPass = currentMod.passingScore ?? 70;

                return (
                  <div className="space-y-4">
                    {/* Module Title Banner */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-[#DA291C] text-white text-[10px] font-black uppercase tracking-wider">
                            Calificación de Módulo
                          </span>
                          <span className="text-xs font-black text-slate-900">{currentMod.title}</span>
                        </div>
                        {currentMod.description && (
                          <p className="text-xs text-slate-600">{currentMod.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700">
                          Nota Mínima: <strong className="text-[#DA291C]">{modPass} pts</strong>
                        </span>
                      </div>
                    </div>

                    {/* Participants list for this module */}
                    {filteredParticipants.length > 0 ? (
                      <div className="space-y-3">
                        {filteredParticipants.map(item => {
                          const card = item.card;
                          const g = getParticipantGrade(card);
                          const mg = (g.moduleGrades || []).find((x: ParticipantModuleGrade) => x.moduleId === currentMod.id) || {
                            moduleId: currentMod.id,
                            moduleName: currentMod.title,
                            score: null,
                            academicStatus: 'pending' as AcademicStatus,
                            feedback: ''
                          };
                          const modScore = mg.score !== null && mg.score !== undefined ? mg.score : '';
                          const isPassed = mg.academicStatus === 'passed';
                          const isFailed = mg.academicStatus === 'failed';

                          return (
                            <div
                              key={card || item.email}
                              className={`p-4 rounded-2xl border transition-all ${
                                isFailed
                                  ? 'bg-rose-50/40 border-rose-200'
                                  : isPassed
                                  ? 'bg-white border-emerald-200 shadow-xs'
                                  : 'bg-white border-slate-200 shadow-xs'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                                    isPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : isFailed ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-bold text-slate-900">{item.name}</p>
                                      {item.isAttended && (
                                        <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-md border border-emerald-200">
                                          Asistió
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                      Tarjeta: <span className="text-slate-800 font-bold">#{card || 'N/A'}</span> • {item.department}
                                    </p>
                                  </div>
                                </div>

                                {/* Score input for this module */}
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-slate-700">Nota (0-{currentMod.maxScore || 100}):</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={currentMod.maxScore || 100}
                                      value={modScore}
                                      onChange={(e) => handleModuleScoreChange(card, currentMod.id, e.target.value)}
                                      placeholder="0 - 100"
                                      className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold text-center focus:outline-none focus:border-[#DA291C]"
                                    />
                                  </div>

                                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${
                                    isPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : isFailed ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {isPassed ? '✓ Aprobado' : isFailed ? '✕ Reprobado' : 'Pendiente'}
                                  </span>
                                </div>
                              </div>

                              {/* Module Feedback input */}
                              <div className="pt-2">
                                <input
                                  type="text"
                                  value={mg.feedback || ''}
                                  onChange={(e) => handleModuleFeedbackChange(card, currentMod.id, e.target.value)}
                                  placeholder="Observaciones pedagógicas específicas de este módulo (opcional)..."
                                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500 text-xs">
                        No hay participantes inscritos para evaluar en este horario.
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              /* CASE 3: Standard Non-Modular Event Evaluation Cards */
              filteredParticipants.length > 0 ? (
                <div className="space-y-3">
                  {filteredParticipants.map((item) => {
                    const card = item.card;
                    const grade = gradesMap[card] || {
                      score: '',
                      academicStatus: 'pending',
                      detectedSkillGaps: [],
                      weaknessesNotes: '',
                      strengthsNotes: '',
                      needsRetraining: false,
                      feedback: '',
                      gradedBy: 'Instructor / Evaluador'
                    };

                    const isPassed = grade.academicStatus === 'passed';
                    const isFailed = grade.academicStatus === 'failed';
                    const hasGaps = (grade.detectedSkillGaps || []).length > 0;

                    return (
                      <div
                        key={card || item.email}
                        className={`p-4 rounded-2xl border transition-all ${
                          isFailed || grade.needsRetraining
                            ? 'bg-rose-50/50 border-rose-200'
                            : isPassed
                            ? 'bg-white border-emerald-200 shadow-xs'
                            : 'bg-white border-slate-200 shadow-xs'
                        }`}
                      >
                        {/* Top row: Participant Info & Grade input */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : isFailed ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-slate-900">{item.name}</p>
                                {item.isAttended && (
                                  <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-md border border-emerald-200">
                                    Asistió
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Tarjeta: <span className="text-slate-800 font-bold">#{card || 'N/A'}</span> • {item.department}
                              </p>
                            </div>
                          </div>

                          {/* Grade Input & Status */}
                          <div className="flex items-center gap-3">
                            {event.evaluationType === 'score_100' && (
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-600">Nota (0-100):</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={grade.score}
                                  onChange={(e) => handleScoreChange(card, e.target.value)}
                                  placeholder="0 - 100"
                                  className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold text-center focus:outline-none focus:border-[#DA291C]"
                                />
                              </div>
                            )}

                            {event.evaluationType === 'scale_1_5' && (
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-600">Escala (1-5):</label>
                                <select
                                  value={grade.score}
                                  onChange={(e) => handleScoreChange(card, e.target.value)}
                                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-[#DA291C]"
                                >
                                  <option value="">Sin calificar</option>
                                  <option value="5">5 ★ Excelente</option>
                                  <option value="4">4 ★ Bueno</option>
                                  <option value="3">3 ★ Aceptable</option>
                                  <option value="2">2 ★ Regular</option>
                                  <option value="1">1 ★ Deficiente</option>
                                </select>
                              </div>
                            )}

                            {event.evaluationType === 'pass_fail' && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(card, 'passed')}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    isPassed
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  ✓ Aprobado
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(card, 'failed')}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    isFailed
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  ✕ Reprobado
                                </button>
                              </div>
                            )}

                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${
                              isPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : isFailed ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {isPassed ? '✓ Aprobado' : isFailed ? '✕ Reprobado' : 'Pendiente'}
                            </span>
                          </div>
                        </div>

                        {/* Competencies / Skills Gap Checkers */}
                        {skillsList.length > 0 && (
                          <div className="py-2.5 border-b border-slate-100 space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                              Competencias Evaluadas (Marcar si mostró debilidad):
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {skillsList.map(skill => {
                                const isGap = (grade.detectedSkillGaps || []).includes(skill);
                                return (
                                  <button
                                    key={skill}
                                    type="button"
                                    onClick={() => handleToggleSkillGap(card, skill)}
                                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                      isGap
                                        ? 'bg-rose-50 border border-rose-300 text-rose-700 shadow-xs'
                                        : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                  >
                                    {isGap ? (
                                      <ShieldAlert className="w-3 h-3 text-rose-600" />
                                    ) : (
                                      <Target className="w-3 h-3 text-slate-400" />
                                    )}
                                    <span>{skill}</span>
                                    {isGap && <span className="text-[10px] text-rose-700 font-bold">⚠️ Debilidad</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Weakness Details input & Retraining Checkbox */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 items-center">
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              value={grade.weaknessesNotes}
                              onChange={(e) => handleWeaknessNotesChange(card, e.target.value)}
                              placeholder="Observaciones pedagógicas específicas sobre debilidades o errores..."
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                            />
                          </div>

                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300">
                            <input
                              type="checkbox"
                              checked={grade.needsRetraining}
                              onChange={() => handleToggleRetraining(card)}
                              className="rounded border-slate-300 text-rose-600 focus:ring-0 cursor-pointer"
                            />
                            <span className={grade.needsRetraining ? 'text-rose-700 font-bold' : 'text-slate-600'}>
                              {grade.needsRetraining ? '🚨 Re-capacitación Urgente' : 'Re-capacitación requerida'}
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No hay participantes inscritos para evaluar en este horario.
                </div>
              )
            )}

            {/* Save All Grades Button */}
            {filteredParticipants.length > 0 && (
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Las calificaciones registradas se sincronizarán inmediatamente en PostgreSQL con el perfil del participante y su supervisor.
                </p>

                <button
                  type="button"
                  onClick={handleSaveAllGrades}
                  disabled={isSavingGrades}
                  className="px-5 py-2.5 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/25 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {isSavingGrades ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando en PostgreSQL...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Calificaciones del Evento</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Projector Mode Modal for In-Person Training Room Check-In */}
      <AccessibleModal
        isOpen={isProjectorOpen}
        onClose={() => setIsProjectorOpen(false)}
        ariaLabel="Modo Proyección en Sala"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
      >
        <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 flex flex-col items-center text-center relative animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsProjectorOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Cerrar Proyector"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-[#DA291C] text-xs font-bold mb-3">
            <span className="w-2 h-2 rounded-full bg-[#DA291C] animate-pulse" />
            <span>MODO PROYECCIÓN EN SALA</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight max-w-xl">
            {event.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-4">
            Facilitador: <strong className="text-slate-700">{event.instructor}</strong> • {formatDateLong(selectedDate)} ({selectedTime}{currentSlot?.endTime ? ` - ${currentSlot.endTime}` : ''})
          </p>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl mb-4 border border-slate-200">
            <button
              type="button"
              onClick={() => setProjectorMode('checkin')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                projectorMode === 'checkin'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Modo Entrada (Check-In)</span>
            </button>
            <button
              type="button"
              onClick={() => setProjectorMode('checkout')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                projectorMode === 'checkout'
                  ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Modo Salida (Check-Out)</span>
            </button>
          </div>

          {/* Large QR */}
          <div className="my-2 p-5 bg-white rounded-3xl border-2 border-slate-200 shadow-xl inline-block">
            <QRCodeSVG
              value={`${window.location.origin}${window.location.pathname}?tab=attendance&event=${event.id}&date=${selectedDate}&time=${encodeURIComponent(selectedTime)}&type=${projectorMode}`}
              size={240}
              level="H"
              includeMargin={false}
            />
          </div>

          {/* PIN Prominently Displayed */}
          <div className="mt-3 mb-4 inline-flex items-center gap-3 px-5 py-2 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500">
              O ingresa el PIN de {projectorMode === 'checkin' ? 'Entrada' : 'Salida'}:
            </span>
            <span className={`text-2xl font-black font-mono tracking-widest ${
              projectorMode === 'checkin' ? 'text-emerald-700' : 'text-[#DA291C]'
            }`}>
              {projectorMode === 'checkin' ? (currentSlot?.checkinCode || '----') : (currentSlot?.checkoutCode || '----')}
            </span>
          </div>

          {/* Live Counters */}
          <div className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-4 grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <span className="text-slate-500 font-bold block text-[10px] uppercase">Inscritos</span>
              <span className="text-lg font-black text-slate-800">{attendeesList.length}</span>
            </div>
            <div className="border-l border-slate-200">
              <span className="text-emerald-600 font-bold block text-[10px] uppercase">Entradas</span>
              <span className="text-lg font-black text-emerald-700">{checkInList.length}</span>
            </div>
            <div className="border-l border-slate-200">
              <span className="text-blue-600 font-bold block text-[10px] uppercase">Salidas</span>
              <span className="text-lg font-black text-blue-700">{checkOutList.length}</span>
            </div>
            <div className="border-l border-slate-200">
              <span className="text-indigo-600 font-bold block text-[10px] uppercase">Completas</span>
              <span className="text-lg font-black text-indigo-700">{completedAttendanceList.length}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 max-w-md">
            Abre la cámara de tu smartphone y enfoca el código QR o digita el PIN de 4 dígitos para registrar tu {projectorMode === 'checkin' ? 'entrada' : 'salida'}.
          </p>
        </div>
      </AccessibleModal>

      {/* Modal de Confirmación para Desasignar Participante */}
      <AccessibleModal
        isOpen={!!participantToUnassign}
        onClose={() => setParticipantToUnassign(null)}
        role="alertdialog"
        ariaLabel="Eliminar Asignación de Curso"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      >
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Eliminar Asignación de Curso</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                Super Admin
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            ¿Estás seguro de que deseas eliminar la asignación de <strong className="text-slate-900">{participantToUnassign?.name}</strong> para el curso <strong className="text-slate-900">{event.title}</strong> en fecha <strong className="text-slate-900">{selectedDate} ({selectedTime})</strong>?
          </p>
          <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
            Esta acción liberará el cupo y cancelará el registro del participante en este horario, independientemente de si el curso ya se impartió o está por impartirse.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setParticipantToUnassign(null)}
              disabled={isUnassigning}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  setIsUnassigning(true);
                  if (onCancelRegistration && participantToUnassign) {
                    await onCancelRegistration(event.id, selectedDate, selectedTime, participantToUnassign.email, true, true);
                  }
                  setParticipantToUnassign(null);
                } catch (err: any) {
                  console.error('Error al desasignar participante:', err);
                } finally {
                  setIsUnassigning(false);
                }
              }}
              disabled={isUnassigning}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className={`w-3.5 h-3.5 ${isUnassigning ? 'animate-spin' : ''}`} />
              <span>{isUnassigning ? 'Eliminando...' : 'Eliminar Asignación'}</span>
            </button>
          </div>
        </div>
      </AccessibleModal>
    </AccessibleModal>
  );
};
