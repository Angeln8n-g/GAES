import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  Save, 
  FileSpreadsheet, 
  QrCode, 
  Award, 
  Sparkles, 
  Layers, 
  Search, 
  RefreshCw,
  Clock3,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import { TechnicalAcademyCohort, TechnicalCohortAttendanceMatrix, UserAccount } from '../../types';
import { apiService } from '../../services/api';
import { attendanceWs } from '../../services/websocket';
import { exportTechnicalAcademyAttendanceToExcel } from '../../utils/excelUtils';
import { TechnicalQrModal } from '../technical-academy/TechnicalQrModal';
import { AccessibleModal } from '../common/AccessibleModal';

interface TechnicalCohortManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cohort: TechnicalAcademyCohort | null;
  currentUser: UserAccount | null;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRefresh?: () => void;
}

export const TechnicalCohortManagerModal: React.FC<TechnicalCohortManagerModalProps> = ({
  isOpen,
  onClose,
  cohort,
  currentUser,
  onShowToast,
  onRefresh
}) => {
  if (!isOpen || !cohort) return null;

  const [activeTab, setActiveTab] = useState<'attendance' | 'grades'>('attendance');
  const [matrix, setMatrix] = useState<TechnicalCohortAttendanceMatrix | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSavingAttendance, setIsSavingAttendance] = useState<boolean>(false);
  const [isSavingGrades, setIsSavingGrades] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  // Calificaciones editables
  const [gradesMap, setGradesMap] = useState<Record<string, {
    score: string;
    academicStatus: 'passed' | 'failed' | 'pending';
    feedback: string;
  }>>({});

  // Cargar matriz de asistencia y notas de la cohorte
  const fetchAttendance = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getCohortDailyAttendance(cohort.id);
      setMatrix(data);

      // Inicializar calificaciones
      const initialGrades: Record<string, { score: string; academicStatus: 'passed' | 'failed' | 'pending'; feedback: string }> = {};
      data.participants.forEach(p => {
        initialGrades[p.card] = {
          score: p.score !== null && p.score !== undefined ? String(p.score) : '',
          academicStatus: p.academicStatus || (p.score !== null && p.score !== undefined ? (p.score >= 70 ? 'passed' : 'failed') : (p.attendancePercentage >= 80 ? 'passed' : 'pending')),
          feedback: p.feedback || ''
        };
      });
      setGradesMap(initialGrades);

      // Seleccionar fecha activa inicial (hoy si existe, o la primera de la cohorte)
      const todayStr = new Date().toISOString().slice(0, 10);
      if (data.sessionDates.includes(todayStr)) {
        setSelectedDate(todayStr);
      } else if (data.sessionDates.length > 0 && !selectedDate) {
        setSelectedDate(data.sessionDates[0]);
      }
    } catch (err: any) {
      console.error('Error al cargar datos de cohorte:', err);
      onShowToast('Error', 'No se pudo cargar la asistencia de la cohorte', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && cohort?.id) {
      fetchAttendance();
    }
  }, [isOpen, cohort?.id]);

  // Listener accesible de teclado (Escape para cerrar modal si no está abierto el proyector)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isQrModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isQrModalOpen, onClose]);

  // Suscripción WebSocket para actualizar en vivo cuando los alumnos marcan por PIN/QR
  useEffect(() => {
    if (!isOpen || !cohort?.id) return;

    const unsubscribe = attendanceWs.onAttendanceEvent((evt) => {
      if (!evt || evt.cohortId !== cohort.id) return;

      if (evt.type === 'TECHNICAL_QR_CHECKIN' || evt.type === 'TECHNICAL_ATTENDANCE_MARKED') {
        fetchAttendance();
        if (evt.participantName) {
          onShowToast('Asistencia en Vivo', `¡${evt.participantName} registró asistencia!`, 'success');
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, cohort?.id]);

  // Filtrado de participantes por búsqueda
  const filteredParticipants = useMemo(() => {
    if (!matrix) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matrix.participants;
    return matrix.participants.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.card.toLowerCase().includes(q) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  }, [matrix, searchQuery]);

  // Marcar estado individual de asistencia
  const handleToggleAttendance = async (
    participantCard: string, 
    newStatus: 'present' | 'late' | 'absent' | 'excused'
  ) => {
    if (!cohort || !selectedDate || !matrix) return;

    // Actualización optimista local
    setMatrix(prev => {
      if (!prev) return null;
      return {
        ...prev,
        participants: prev.participants.map(p => {
          if (p.card !== participantCard) return p;
          const updatedMap = {
            ...p.attendanceByDate,
            [selectedDate]: {
              status: newStatus,
              method: 'manual' as const,
              markedBy: currentUser?.name || 'Facilitador',
              markedAt: new Date().toISOString()
            }
          };
          let attendedCount = 0;
          prev.sessionDates.forEach(d => {
            const st = updatedMap[d]?.status;
            if (st === 'present' || st === 'late') attendedCount++;
          });
          const percentage = prev.sessionDates.length > 0 ? Math.round((attendedCount / prev.sessionDates.length) * 100) : 0;
          return {
            ...p,
            attendanceByDate: updatedMap,
            attendedDays: attendedCount,
            attendancePercentage: percentage
          };
        })
      };
    });

    try {
      await apiService.markCohortDailyAttendance(cohort.id, {
        sessionDate: selectedDate,
        records: [{
          participantCard,
          status: newStatus,
          method: 'manual'
        }],
        markedBy: currentUser?.name || cohort.facilitatorName || 'Facilitador'
      });
    } catch (err: any) {
      console.error('Error al asentar asistencia:', err);
      onShowToast('Error', 'No se pudo guardar la asistencia del participante', 'error');
      fetchAttendance();
    }
  };

  // Marcar todos los participantes con un estado específico en la fecha activa
  const handleBulkAttendance = async (bulkStatus: 'present' | 'absent') => {
    if (!cohort || !selectedDate || !matrix || matrix.participants.length === 0) return;

    setIsSavingAttendance(true);
    try {
      const records = matrix.participants.map(p => ({
        participantCard: p.card,
        status: bulkStatus,
        method: 'manual' as const
      }));

      await apiService.markCohortDailyAttendance(cohort.id, {
        sessionDate: selectedDate,
        records,
        markedBy: currentUser?.name || cohort.facilitatorName || 'Facilitador'
      });

      onShowToast('Asistencia Actualizada', `Se asentó ${bulkStatus === 'present' ? 'presente' : 'ausente'} a todos los participantes para ${selectedDate}`, 'success');
      await fetchAttendance();
    } catch (err: any) {
      console.error('Error en marcado masivo:', err);
      onShowToast('Error', 'No se pudo aplicar la asistencia grupal', 'error');
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // Guardar todas las calificaciones
  const handleSaveGrades = async () => {
    if (!cohort || !matrix || matrix.participants.length === 0) return;

    setIsSavingGrades(true);
    try {
      const gradesToSave = matrix.participants.map(p => {
        const entry = gradesMap[p.card] || { score: '', academicStatus: 'pending', feedback: '' };
        const parsedScore = entry.score !== '' ? parseFloat(entry.score) : null;
        return {
          participantCard: p.card,
          score: parsedScore,
          academicStatus: entry.academicStatus,
          feedback: entry.feedback || null
        };
      });

      const res = await apiService.saveCohortGrades(cohort.id, {
        grades: gradesToSave,
        gradedBy: currentUser?.name || cohort.facilitatorName || 'Facilitador Técnico'
      });

      onShowToast('Calificaciones Guardadas', `${res.updatedCount} notas registradas exitosamente`, 'success');
      await fetchAttendance();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error al guardar calificaciones:', err);
      onShowToast('Error', err.message || 'Error al registrar calificaciones', 'error');
    } finally {
      setIsSavingGrades(false);
    }
  };

  // Auto-calificar 100 a técnicos con >= 80% de asistencia
  const handleAutoFillGrades100 = () => {
    if (!matrix) return;

    setGradesMap(prev => {
      const updated = { ...prev };
      matrix.participants.forEach(p => {
        if (p.attendancePercentage >= 80) {
          updated[p.card] = {
            score: '100',
            academicStatus: 'passed',
            feedback: updated[p.card]?.feedback || 'Cumplió satisfactoriamente con la asistencia mínima requerida (≥80%).'
          };
        }
      });
      return updated;
    });

    onShowToast('Notas Autocompletadas', 'Se asignó nota 100 y aprobado a los participantes con ≥80% de asistencia. Recuerda pulsar "Guardar Calificaciones".', 'info');
  };

  // Exportar matriz a Excel
  const handleExportExcel = () => {
    if (!matrix) {
      onShowToast('Sin Datos', 'No hay información disponible para exportar', 'warning');
      return;
    }
    exportTechnicalAcademyAttendanceToExcel(matrix);
    onShowToast('Excel Descargado', 'El reporte oficial de asistencia y notas ha sido exportado', 'success');
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={`Academia Técnica - ${cohort.courseTitle || 'Cohorte'}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Cabecera del Modal */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-claro/20 text-red-300 border border-claro/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-red-400" />
                Academia Técnica • Facilitador
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/90">
                {cohort.groupName || 'Cohorte General'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PIN de Sala: {cohort.dailyPin || '2026'}
              </span>
            </div>

            <h2 id="tech-cohort-manager-title" className="text-xl sm:text-2xl font-black tracking-tight text-white line-clamp-1">
              {cohort.courseTitle}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-2 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-claro shrink-0" />
                Del {cohort.startDate} al {cohort.endDate}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {cohort.dailyTime} ({cohort.dailyHours} hrs/día)
              </span>
              {cohort.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {cohort.location}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Botón Proyectar PIN */}
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="px-4 py-2 min-h-[44px] rounded-xl bg-claro hover:bg-claro-600 text-white text-xs font-bold transition-all shadow-md shadow-claro/25 flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-white"
              title="Proyectar QR y PIN de sala en pantalla gigante"
            >
              <QrCode className="w-4 h-4" />
              <span>Proyectar PIN</span>
            </button>

            {/* Botón Descargar Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-white"
              title="Descargar reporte oficial en Excel"
              aria-label="Descargar reporte oficial en Excel"
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </button>

            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-white"
              title="Cerrar modal"
              aria-label="Cerrar modal de cohorte"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pestañas de Navegación del Modal */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'attendance'}
              onClick={() => setActiveTab('attendance')}
              className={`pb-3 px-3 min-h-[44px] text-xs font-black transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'attendance'
                  ? 'border-claro text-claro'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Matriz de Asistencia Diaria</span>
              {matrix && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {matrix.participants.length}
                </span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'grades'}
              onClick={() => setActiveTab('grades')}
              className={`pb-3 px-3 min-h-[44px] text-xs font-black transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'grades'
                  ? 'border-claro text-claro'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Libro de Calificaciones & Evaluación</span>
            </button>
          </div>

          {/* Buscador Rápido de Participantes */}
          <div className="relative pb-3 hidden sm:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Buscar colaborador o carnet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 w-52"
            />
          </div>
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#DA291C] animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Cargando datos de la cohorte técnica...</p>
            </div>
          ) : !matrix || matrix.participants.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">No hay participantes matriculados en esta cohorte</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                El Super Administrador aún no ha asignado participantes a esta cohorte desde el panel de Academia Técnica.
              </p>
            </div>
          ) : activeTab === 'attendance' ? (
            /* ======================================================== */
            /* PESTAÑA 1: MATRIZ DE ASISTENCIA DIARIA                   */
            /* ======================================================== */
            <div className="space-y-5">
              
              {/* Selector de Fechas de Sesión */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mr-1 shrink-0">Sesión:</span>
                  {matrix.sessionDates.map((dateStr, idx) => {
                    const isSelected = dateStr === selectedDate;
                    const isToday = dateStr === new Date().toISOString().slice(0, 10);
                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
                        }`}
                      >
                        <span>Día {idx + 1} ({dateStr})</span>
                        {isToday && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Acciones Masivas de la Sesión */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleBulkAttendance('present')}
                    disabled={isSavingAttendance}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Todos Presentes</span>
                  </button>

                  <button
                    onClick={() => handleBulkAttendance('absent')}
                    disabled={isSavingAttendance}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Todos Ausentes</span>
                  </button>
                </div>
              </div>

              {/* Listado de Participantes para la Fecha Seleccionada */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                  <span>Colaborador ({filteredParticipants.length})</span>
                  <span>Asistencia para: {selectedDate}</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredParticipants.map(participant => {
                    const dayData = participant.attendanceByDate?.[selectedDate];
                    const currentStatus = dayData?.status;
                    const method = dayData?.method;

                    return (
                      <div 
                        key={participant.card}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {participant.name ? participant.name.charAt(0).toUpperCase() : 'T'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{participant.name}</p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span>Carnet: <strong>{participant.card}</strong></span>
                              <span>•</span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                {participant.attendedDays || 0}/{matrix.sessionDates.length} asistidas ({participant.attendancePercentage || 0}%)
                              </span>
                              {method && (
                                <>
                                  <span>•</span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    Vía {method === 'pin' ? 'PIN Sala' : method === 'qr_scan' ? 'QR' : 'Manual'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botones de Estado: Presente / Tardanza / Ausente / Justificado */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleToggleAttendance(participant.card, 'present')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Presente</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleAttendance(participant.card, 'late')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              currentStatus === 'late'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <Clock3 className="w-3.5 h-3.5" />
                            <span>Tardanza</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleAttendance(participant.card, 'absent')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              currentStatus === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Ausente</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleAttendance(participant.card, 'excused')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              currentStatus === 'excused'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span>Justificado</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            /* ======================================================== */
            /* PESTAÑA 2: LIBRO DE CALIFICACIONES & EVALUACIÓN         */
            /* ======================================================== */
            <div className="space-y-5">
              
              {/* Banner Informativo y Acciones de Calificación */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 dark:text-amber-300">
                    <p className="font-bold">Criterio Institucional de Aprobación</p>
                    <p className="text-amber-800 dark:text-amber-400 mt-0.5">
                      Calificación mínima aprobatoria: <strong>70 pts</strong> y asistencia mínima de <strong>80%</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleAutoFillGrades100}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Auto 100 (≥80% asist.)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveGrades}
                    disabled={isSavingGrades}
                    className="px-4 py-1.5 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {isSavingGrades ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Guardar Calificaciones</span>
                  </button>
                </div>
              </div>

              {/* Tabla de Calificaciones */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="p-3.5">Colaborador / Carnet</th>
                        <th className="p-3.5 text-center">Asistencia</th>
                        <th className="p-3.5 text-center w-28">Nota (0 - 100)</th>
                        <th className="p-3.5 text-center w-36">Estado Académico</th>
                        <th className="p-3.5">Observaciones & Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredParticipants.map(participant => {
                        const currentGrade = gradesMap[participant.card] || { score: '', academicStatus: 'pending', feedback: '' };

                        return (
                          <tr key={participant.card} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-3.5">
                              <p className="font-bold text-slate-900 dark:text-white">{participant.name}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{participant.card}</p>
                            </td>

                            <td className="p-3.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                participant.attendancePercentage >= 80
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              }`}>
                                {participant.attendedDays || 0}/{matrix.sessionDates.length} ({participant.attendancePercentage || 0}%)
                              </span>
                            </td>

                            <td className="p-3.5 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={currentGrade.score}
                                placeholder="--"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGradesMap(prev => ({
                                    ...prev,
                                    [participant.card]: {
                                      ...prev[participant.card],
                                      score: val,
                                      academicStatus: val !== '' ? (parseFloat(val) >= 70 ? 'passed' : 'failed') : prev[participant.card]?.academicStatus || 'pending'
                                    }
                                  }));
                                }}
                                className="w-20 px-2 py-1.5 text-center font-bold text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                              />
                            </td>

                            <td className="p-3.5 text-center">
                              <select
                                value={currentGrade.academicStatus}
                                onChange={(e) => {
                                  const val = e.target.value as 'passed' | 'failed' | 'pending';
                                  setGradesMap(prev => ({
                                    ...prev,
                                    [participant.card]: {
                                      ...prev[participant.card],
                                      academicStatus: val
                                    }
                                  }));
                                }}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none ${
                                  currentGrade.academicStatus === 'passed'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                    : currentGrade.academicStatus === 'failed'
                                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <option value="passed">Aprobado</option>
                                <option value="failed">Reprobado</option>
                                <option value="pending">Pendiente</option>
                              </select>
                            </td>

                            <td className="p-3.5">
                              <input
                                type="text"
                                value={currentGrade.feedback}
                                placeholder="Retroalimentación técnica..."
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGradesMap(prev => ({
                                    ...prev,
                                    [participant.card]: {
                                      ...prev[participant.card],
                                      feedback: val
                                    }
                                  }));
                                }}
                                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                              />
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
        </div>

        {/* Footer del Modal */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Sincronización en tiempo real activa vía WebSockets</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition-all cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>

      {/* Modal de Proyección de QR / PIN */}
      {isQrModalOpen && (
        <TechnicalQrModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          cohort={cohort}
          onCheckInSuccess={() => {
            fetchAttendance();
          }}
        />
      )}
    </AccessibleModal>
  );
};
