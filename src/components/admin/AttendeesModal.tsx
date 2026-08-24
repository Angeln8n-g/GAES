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
  FileSpreadsheet
} from 'lucide-react';
import { TrainingEvent, Participant, ParticipantGrade, AcademicStatus } from '../../types';
import { exportAttendeesToExcel, exportEventGradesToExcel, exportSessionGradesForOjtAndCalibration } from '../../utils/excelUtils';
import { formatDateLong } from '../../utils/formatters';
import { apiService } from '../../services/api';

interface AttendeesModalProps {
  event: TrainingEvent | null;
  participants: Participant[];
  isSuperAdmin?: boolean;
  onClose: () => void;
  onConfirmAttendance: (eventId: string, date: string, time: string, email: string) => Promise<void>;
  onOpenBulkEnrollment?: (eventId: string, date: string, time: string) => void;
  onSaveGradesSuccess?: (updatedEvent: TrainingEvent) => void;
}

export const AttendeesModal: React.FC<AttendeesModalProps> = ({
  event,
  participants,
  isSuperAdmin = false,
  onClose,
  onConfirmAttendance,
  onOpenBulkEnrollment,
  onSaveGradesSuccess
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
  const [gradesMap, setGradesMap] = useState<Record<string, {
    score: number | string;
    academicStatus: AcademicStatus;
    detectedSkillGaps: string[];
    weaknessesNotes: string;
    strengthsNotes: string;
    needsRetraining: boolean;
    feedback: string;
    gradedBy: string;
  }>>({});

  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Inicializar estado de calificaciones desde event.grades
  useEffect(() => {
    const initialMap: Record<string, any> = {};
    (event.grades || []).forEach(g => {
      initialMap[g.participantCard] = {
        score: g.score !== null && g.score !== undefined ? g.score : '',
        academicStatus: g.academicStatus || 'pending',
        detectedSkillGaps: g.detectedSkillGaps || [],
        weaknessesNotes: g.weaknessesNotes || '',
        strengthsNotes: g.strengthsNotes || '',
        needsRetraining: g.needsRetraining || false,
        feedback: g.feedback || '',
        gradedBy: g.gradedBy || 'Instructor / Evaluador'
      };
    });
    setGradesMap(initialMap);
  }, [event]);

  const currentSchedule = event.schedule.find(s => s.date === selectedDate);
  const currentSlot = currentSchedule?.slots.find(s => s.time === selectedTime);

  const attendeesList = currentSlot?.attendees || [];
  const attendedList = currentSlot?.attendedList || [];

  // Lista de todos los inscritos en el horario actual con datos de participante
  const currentSlotParticipants = useMemo(() => {
    return attendeesList.map(email => {
      const p = participants.find(part => part.email.toLowerCase() === email.toLowerCase());
      return {
        email,
        participant: p,
        card: p?.card || '',
        name: p?.name || email.split('@')[0],
        department: p?.department || 'General',
        isAttended: attendedList.map(a => a.toLowerCase()).includes(email.toLowerCase())
      };
    });
  }, [attendeesList, attendedList, participants]);

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

  // Manejar cambio de puntaje por participante
  const handleScoreChange = (card: string, val: string) => {
    const num = val === '' ? '' : Number(val);
    const current = gradesMap[card] || {
      score: '',
      academicStatus: 'pending',
      detectedSkillGaps: [],
      weaknessesNotes: '',
      strengthsNotes: '',
      needsRetraining: false,
      feedback: '',
      gradedBy: 'Instructor / Evaluador'
    };

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
    const current = gradesMap[card] || {
      score: status === 'passed' ? 100 : status === 'failed' ? 50 : '',
      academicStatus: status,
      detectedSkillGaps: [],
      weaknessesNotes: '',
      strengthsNotes: '',
      needsRetraining: status === 'failed',
      feedback: '',
      gradedBy: 'Instructor / Evaluador'
    };

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
    const current = gradesMap[card] || {
      score: '',
      academicStatus: 'pending',
      detectedSkillGaps: [],
      weaknessesNotes: '',
      strengthsNotes: '',
      needsRetraining: false,
      feedback: '',
      gradedBy: 'Instructor / Evaluador'
    };

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
    const current = gradesMap[card] || {
      score: '',
      academicStatus: 'pending',
      detectedSkillGaps: [],
      weaknessesNotes: '',
      strengthsNotes: '',
      needsRetraining: false,
      feedback: '',
      gradedBy: 'Instructor / Evaluador'
    };

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
    const current = gradesMap[card] || {
      score: '',
      academicStatus: 'pending',
      detectedSkillGaps: [],
      weaknessesNotes: '',
      strengthsNotes: '',
      needsRetraining: false,
      feedback: '',
      gradedBy: 'Instructor / Evaluador'
    };

    setGradesMap(prev => ({
      ...prev,
      [card]: {
        ...current,
        needsRetraining: !current.needsRetraining
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
        gradedBy: data.gradedBy || 'Instructor / Evaluador'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header & Tabs */}
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-[#DA291C] border border-red-200">
                Gestión de Asistencia & Calificaciones
              </span>
              <span className="text-xs text-slate-500 font-bold">{event.category}</span>
              {hasGrading && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />
                  {event.evaluationType === 'score_100' ? 'Nota 0-100' : event.evaluationType === 'scale_1_5' ? 'Escala 1-5' : 'Aprobado/Reprobado'}
                </span>
              )}
              {event.ojtEvaluatorName && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1" title="Tutor / Evaluador OJT Responsable">
                  <UserCheck className="w-3 h-3 text-purple-600" />
                  <span>Tutor OJT: {event.ojtEvaluatorName}</span>
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
                  <span>Asistencia ({attendedList.length}/{attendeesList.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('grades')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'grades'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Calificaciones & Debilidades</span>
                  {gradeStats.totalGraded > 0 && (
                    <span className="px-1.5 py-0.2 bg-purple-200 text-purple-800 text-[10px] rounded-full font-extrabold">
                      {gradeStats.totalGraded}
                    </span>
                  )}
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
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
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, tarjeta, cédula o depto..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
              />
            </div>

            {/* Excel Export Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {activeTab === 'attendance' ? (
                <button
                  onClick={() => exportAttendeesToExcel(event, selectedDate, selectedTime, attendeesList, attendedList, participants)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Asistentes (.xlsx)</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportSessionGradesForOjtAndCalibration(event, participants)}
                    title="Descargar libro con 4 hojas: Insumo Bitácoras OJT, Mesas de Calibración, Estadísticas y Calificaciones"
                    className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Insumo OJT & Calibración (.xlsx)</span>
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
            <div className="flex items-center gap-2 pt-1 overflow-x-auto">
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
                  {s.time} ({s.registered}/{s.capacity})
                </button>
              ))}
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
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        item.isAttended ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.email} {item.card && `• Tarjeta: #${item.card}`} • <span className="text-slate-700 font-semibold">{item.department}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 ${
                        item.isAttended
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.isAttended ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Confirmado</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Pendiente</span>
                          </>
                        )}
                      </span>

                      {!item.isAttended && (
                        <button
                          onClick={() => onConfirmAttendance(event.id, selectedDate, selectedTime, item.email)}
                          className="px-2.5 py-1 rounded-xl bg-red-50 hover:bg-red-100 text-[#DA291C] border border-red-200 text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          Marcar Asistencia
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
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
                <p className="text-xl font-black text-[#DA291C] mt-0.5">{gradeStats.avgScore} <span className="text-xs text-slate-400">pts</span></p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-center shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Evaluados</span>
                <p className="text-xl font-black text-slate-900 mt-0.5">{gradeStats.totalGraded} <span className="text-xs text-slate-400">/ {currentSlotParticipants.length}</span></p>
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
            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                <p className="text-xs text-purple-900">
                  <span className="font-bold">Detección de Brechas:</span> Asienta la nota y haz clic en las competencias evaluadas para marcar si el colaborador mostró debilidad en ese tema.
                </p>
              </div>
              <span className="text-[10px] text-purple-800 font-bold whitespace-nowrap bg-purple-100 px-2 py-0.5 rounded-lg border border-purple-200">
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

            {/* Grading Table / Cards */}
            {filteredParticipants.length > 0 ? (
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

                          {/* Academic Status Badge */}
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                            isPassed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isFailed
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isPassed ? 'Aprobado' : isFailed ? 'Requiere Refuerzo' : 'Pendiente'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Row: Skill Gaps and Weakness Notes */}
                      <div className="pt-3 space-y-2">
                        {skillsList.length > 0 && (
                          <div>
                            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block mb-1">
                              Debilidades en Competencias (Haz clic para señalar brechas observadas):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {skillsList.map((skill) => {
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
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                No hay participantes inscritos para evaluar en este horario.
              </div>
            )}

            {/* Save All Grades Button */}
            {filteredParticipants.length > 0 && (
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Las calificaciones y debilidades registradas se sincronizarán inmediatamente con el perfil del participante y el panel de su supervisor.
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
    </div>
  );
};
