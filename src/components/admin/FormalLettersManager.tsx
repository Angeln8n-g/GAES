import React, { useState, useMemo } from 'react';
import {
  Award,
  Search,
  Building2,
  User,
  CreditCard,
  Mail,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  Printer,
  ChevronRight,
  ShieldCheck,
  BarChart3,
  Calendar
} from 'lucide-react';
import { Participant, UserAccount, TrainingEvent, TrainingProgram, Company, ParticipantGrade, ExternalTraining, TechnicalAcademyHistoryRecord } from '../../types';
import { FormalLetterModal, TrainingHistoryRecord } from '../history/FormalLetterModal';
import { formatDateShort, formatCedula } from '../../utils/formatters';

interface FormalLettersManagerProps {
  participants: Participant[];
  users: UserAccount[];
  events: TrainingEvent[];
  programs?: TrainingProgram[];
  companies?: Company[];
  externalTrainings?: ExternalTraining[];
  technicalHistory?: TechnicalAcademyHistoryRecord[];
  currentUser: UserAccount | null;
  onShowToast?: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const FormalLettersManager: React.FC<FormalLettersManagerProps> = ({
  participants,
  users,
  events,
  programs = [],
  companies = [],
  externalTrainings = [],
  technicalHistory = [],
  currentUser,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'with-attendance' | 'no-attendance'>('all');
  const [selectedParticipantCard, setSelectedParticipantCard] = useState<string | null>(
    participants.length > 0 ? participants[0].card : null
  );

  // Estados para el Modal de Carta Formal
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [recordsForLetter, setRecordsForLetter] = useState<TrainingHistoryRecord[]>([]);

  // Checkboxes de cursos seleccionados para el colaborador actual
  const [selectedRecordIds, setSelectedRecordIds] = useState<Record<string, boolean>>({});

  // Mapa de empresas para búsqueda rápida
  const companiesMap = useMemo(() => {
    const map = new Map<string, string>();
    companies.forEach(c => map.set(c.id, c.name));
    return map;
  }, [companies]);

  // Mapa de historial por participante: card / email -> { attended, registered, grades, totalHours }
  const participantsStats = useMemo(() => {
    const map = new Map<string, {
      attendedCount: number;
      registeredCount: number;
      totalHours: number;
      records: TrainingHistoryRecord[];
      avgScore: string;
    }>();

    participants.forEach(p => {
      const emailLower = p.email.toLowerCase();
      const cardStr = p.card;

      const attended: TrainingHistoryRecord[] = [];
      const registered: TrainingHistoryRecord[] = [];
      const gradesList: ParticipantGrade[] = [];

      events.forEach(evt => {
        evt.schedule.forEach(sch => {
          sch.slots.forEach(slot => {
            const isAttended = (slot.attendedList || []).some(e => e.toLowerCase() === emailLower);
            const isReg = (slot.attendees || []).some(e => e.toLowerCase() === emailLower);

            if (isAttended) {
              attended.push({
                id: `att-${evt.id}-${sch.date}-${slot.time}`,
                title: evt.title,
                category: evt.category,
                modality: evt.modality,
                instructor: evt.instructor,
                date: sch.date,
                time: slot.time,
                hasAttended: true,
                hours: 2
              });
            } else if (isReg) {
              registered.push({
                id: `reg-${evt.id}-${sch.date}-${slot.time}`,
                title: evt.title,
                category: evt.category,
                modality: evt.modality,
                instructor: evt.instructor,
                date: sch.date,
                time: slot.time,
                hasAttended: false,
                hours: 2
              });
            }
          });
        });

        (evt.grades || []).forEach(g => {
          if (g.participantCard === cardStr || (g.participantEmail && g.participantEmail.toLowerCase() === emailLower)) {
            gradesList.push(g);
          }
        });
      });

      const validScores = gradesList.filter(g => g.score !== null && g.score !== undefined);
      const sum = validScores.reduce((acc, curr) => acc + Number(curr.score), 0);
      const avg = validScores.length > 0 ? (sum / validScores.length).toFixed(1) : '0.0';

      const extList: TrainingHistoryRecord[] = (externalTrainings || [])
        .filter(t => t.participantCard === cardStr || (t.participantEmail && t.participantEmail.toLowerCase() === emailLower))
        .map((ext, idx) => ({
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
        }));

      const recurrentList: TrainingHistoryRecord[] = (technicalHistory || [])
        .filter(t => (t.participantCard && t.participantCard === cardStr) || (t.participantEmail && t.participantEmail.toLowerCase() === emailLower))
        .map((rec, idx) => ({
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
        }));

      const allRecords = [...attended, ...registered, ...extList, ...recurrentList];
      const extHours = extList.reduce((acc, e) => acc + (e.hours || 0), 0);
      const recurrentHours = recurrentList.reduce((acc, r) => acc + (r.hours || 0), 0);
      const totalHours = attended.reduce((acc, a) => acc + (a.hours || 2), 0) + extHours + recurrentHours;

      map.set(p.card, {
        attendedCount: attended.length + extList.length + recurrentList.filter(r => r.hasAttended).length,
        registeredCount: registered.length,
        totalHours,
        records: allRecords,
        avgScore: avg
      });
    });

    return map;
  }, [participants, events, externalTrainings, technicalHistory]);

  // Filtrado de participantes según búsqueda, empresa y asistencia
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      // 1. Filtro de Empresa
      if (selectedCompanyFilter !== 'all') {
        const pCompany = p.companyId || 'emp_kasino';
        if (pCompany !== selectedCompanyFilter) return false;
      }

      // 2. Filtro de Asistencia
      const stats = participantsStats.get(p.card);
      const hasAttendance = stats && stats.attendedCount > 0;
      if (attendanceFilter === 'with-attendance' && !hasAttendance) return false;
      if (attendanceFilter === 'no-attendance' && hasAttendance) return false;

      // 3. Búsqueda por texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchEmail = p.email.toLowerCase().includes(q);
        const matchCedula = (p.cedula || '').toLowerCase().includes(q);
        const matchCard = (p.card || '').toLowerCase().includes(q);
        const matchDept = (p.department || '').toLowerCase().includes(q);
        const companyName = (companiesMap.get(p.companyId || 'emp_kasino') || '').toLowerCase();
        const matchComp = companyName.includes(q);

        return matchName || matchEmail || matchCedula || matchCard || matchDept || matchComp;
      }

      return true;
    });
  }, [participants, selectedCompanyFilter, attendanceFilter, searchQuery, participantsStats, companiesMap]);

  // Participante actualmente seleccionado
  const activeParticipant = useMemo(() => {
    if (!selectedParticipantCard) return null;
    return participants.find(p => p.card === selectedParticipantCard) || null;
  }, [selectedParticipantCard, participants]);

  // Historial del participante activo
  const activeStats = useMemo(() => {
    if (!activeParticipant) return null;
    return participantsStats.get(activeParticipant.card) || null;
  }, [activeParticipant, participantsStats]);

  // Inicializar selección de cursos cuando cambia el participante activo
  React.useEffect(() => {
    if (activeStats) {
      const initialMap: Record<string, boolean> = {};
      activeStats.records.forEach(r => {
        // Por defecto, seleccionar los que tienen asistencia confirmada
        initialMap[r.id] = r.hasAttended;
      });
      setSelectedRecordIds(initialMap);
    } else {
      setSelectedRecordIds({});
    }
  }, [selectedParticipantCard, activeStats]);

  // Colaborador vinculado en tabla de usuarios
  const linkedUserAccount = useMemo(() => {
    if (!activeParticipant) return null;
    const emailLower = activeParticipant.email.toLowerCase();
    return users.find(u => u.email.toLowerCase() === emailLower) || null;
  }, [activeParticipant, users]);

  // Métricas globales del módulo
  const totalStats = useMemo(() => {
    let withAtt = 0;
    let totalHrs = 0;
    participantsStats.forEach(stat => {
      if (stat.attendedCount > 0) withAtt++;
      totalHrs += stat.totalHours;
    });
    return {
      totalParticipants: participants.length,
      withAttendance: withAtt,
      totalCertifiedHours: totalHrs
    };
  }, [participantsStats, participants]);

  // Alternar selección individual de un curso
  const toggleRecordSelection = (recordId: string) => {
    setSelectedRecordIds(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  // Seleccionar todos / deseleccionar todos
  const handleSelectAll = (selectAll: boolean) => {
    if (!activeStats) return;
    const updated: Record<string, boolean> = {};
    activeStats.records.forEach(r => {
      updated[r.id] = selectAll;
    });
    setSelectedRecordIds(updated);
  };

  // Cursos seleccionados para la carta
  const selectedRecordsForLetter = useMemo(() => {
    if (!activeStats) return [];
    return activeStats.records.filter(r => selectedRecordIds[r.id]);
  }, [activeStats, selectedRecordIds]);

  const selectedHoursTotal = useMemo(() => {
    return selectedRecordsForLetter.reduce((sum, r) => sum + (r.hours || 2), 0);
  }, [selectedRecordsForLetter]);

  // Abrir modal con los cursos seleccionados
  const handleGenerateLetterSelected = () => {
    if (selectedRecordsForLetter.length === 0) {
      if (onShowToast) {
        onShowToast('Selección Requerida', 'Por favor selecciona al menos una capacitación para incluir en la carta.', 'error');
      }
      return;
    }
    setRecordsForLetter(selectedRecordsForLetter);
    setIsLetterModalOpen(true);
  };

  // Abrir modal con todo el historial de asistencias
  const handleGenerateLetterAllAttended = () => {
    if (!activeStats || activeStats.attendedCount === 0) {
      if (onShowToast) {
        onShowToast('Sin Asistencias', 'Este colaborador no cuenta con capacitaciones asistidas para certificar.', 'info');
      }
      return;
    }
    const attendedOnly = activeStats.records.filter(r => r.hasAttended);
    setRecordsForLetter(attendedOnly);
    setIsLetterModalOpen(true);
  };

  // Abrir modal para una capacitación específica
  const handleGenerateSingleCourse = (rec: TrainingHistoryRecord) => {
    setRecordsForLetter([rec]);
    setIsLetterModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Módulo Exclusivo Super Administrador
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider bg-red-500/20 text-red-300 border border-red-500/30 uppercase">
                Claro Formación
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Award className="w-7 h-7 text-amber-400" />
              <span>Gestión & Emisión de Cartas Formales</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium leading-relaxed">
              Expide constancias institucionales, certificaciones de histórico de participación y cartas de cumplimiento formativo con membrete oficial de Claro Colombia, cálculo en tiempo real de horas académicas, sello digital y código QR de validación.
            </p>
          </div>

          {/* KPI Mini-Ribbon */}
          <div className="grid grid-cols-3 gap-2.5 bg-slate-800/80 border border-slate-700/60 p-3 rounded-2xl backdrop-blur-sm shrink-0">
            <div className="text-center px-2 py-1">
              <p className="text-xl font-black text-white">{totalStats.totalParticipants}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Colaboradores</p>
            </div>
            <div className="text-center px-2 py-1 border-x border-slate-700">
              <p className="text-xl font-black text-emerald-400">{totalStats.withAttendance}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Con Cursos</p>
            </div>
            <div className="text-center px-2 py-1">
              <p className="text-xl font-black text-amber-400">{totalStats.totalCertifiedHours}h</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Horas Totales</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Split-Panel: Directory on Left, Working Space on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COLUMNA IZQUIERDA: Directorio y Buscador de Colaboradores (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-[#DA291C]" />
                <span>Directorio de Colaboradores</span>
              </h2>
              <span className="text-xs font-bold text-slate-500">
                {filteredParticipants.length} de {participants.length}
              </span>
            </div>

            {/* Buscador de Colaborador */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <label htmlFor="formal-letters-search" className="sr-only">Buscar colaborador por nombre, cédula o cargo</label>
              <input
                id="formal-letters-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, cédula, cargo..."
                className="w-full pl-9.5 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#DA291C] font-medium transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpiar búsqueda de colaboradores"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filtros rápidos: Empresa y Asistencias */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="flex-1 relative">
                <label htmlFor="formal-letters-company-filter" className="sr-only">Filtrar por empresa</label>
                <select
                  id="formal-letters-company-filter"
                  value={selectedCompanyFilter}
                  onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-[#DA291C] cursor-pointer"
                >
                  <option value="all">🏢 Todas las Empresas</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      🏢 {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setAttendanceFilter('all')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    attendanceFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Mostrar todos los colaboradores"
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceFilter('with-attendance')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    attendanceFilter === 'with-attendance'
                      ? 'bg-emerald-600 text-white shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Mostrar únicamente quienes tengan capacitaciones asistidas"
                >
                  Con Cursos
                </button>
              </div>
            </div>

            {/* Lista Scrollable de Colaboradores */}
            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto pr-1">
              {filteredParticipants.length > 0 ? (
                filteredParticipants.map(p => {
                  const isSelected = p.card === selectedParticipantCard;
                  const stats = participantsStats.get(p.card);
                  const companyName = companiesMap.get(p.companyId || 'emp_kasino') || 'Contratista Claro';

                  return (
                    <div
                      key={p.card}
                      onClick={() => setSelectedParticipantCard(p.card)}
                      className={`p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 my-1 ${
                        isSelected
                          ? 'bg-red-50/80 border border-red-200 shadow-xs'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isSelected
                            ? 'bg-[#DA291C] text-white shadow-sm shadow-red-500/30'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 truncate">
                            {p.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                            {p.cedula && (
                              <span className="font-mono font-bold text-slate-700">
                                {p.cedula}
                              </span>
                            )}
                            <span>•</span>
                            <span className="truncate max-w-[120px]" title={companyName}>
                              {companyName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                            stats && stats.attendedCount > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {stats ? stats.attendedCount : 0} cursos ({stats ? stats.totalHours : 0}h)
                          </span>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${
                          isSelected ? 'text-[#DA291C] translate-x-0.5' : 'text-slate-300'
                        }`} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">No se encontraron colaboradores</p>
                  <p className="text-[11px] text-slate-500 mt-1">Prueba ajustando los criterios de búsqueda o filtros.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Espacio de Trabajo del Colaborador & Emisión de Cartas (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {activeParticipant && activeStats ? (
            <div className="space-y-4">
              {/* Tarjeta de Identificación del Colaborador Seleccionado */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center font-black text-lg shadow-md">
                      {activeParticipant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-slate-900">
                          {activeParticipant.name}
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                          {linkedUserAccount?.role || 'Colaborador (User)'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-mono font-bold text-slate-700">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          Cédula: {activeParticipant.cedula || 'No registrada'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {companiesMap.get(activeParticipant.companyId || 'emp_kasino') || 'Contratista Claro'}
                        </span>
                        {activeParticipant.department && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 font-medium">
                              {activeParticipant.department}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones Principales de Emisión */}
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleGenerateLetterAllAttended}
                      disabled={activeStats.attendedCount === 0}
                      className="flex-1 sm:flex-initial px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-95"
                      title="Generar carta con todas las capacitaciones a las que asistió"
                    >
                      <FileText className="w-4 h-4 text-slate-700" />
                      <span>Todo Asistido ({activeStats.attendedCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateLetterSelected}
                      disabled={selectedRecordsForLetter.length === 0}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#DA291C] to-red-600 hover:from-red-700 hover:to-red-800 text-white text-xs font-black shadow-md shadow-red-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                      title="Generar carta formal oficial con los cursos marcados"
                    >
                      <Award className="w-4 h-4 text-amber-300" />
                      <span>Expedir Carta Formal ({selectedRecordsForLetter.length})</span>
                    </button>
                  </div>
                </div>

                {/* Métricas Rápidas del Colaborador */}
                <div className="grid grid-cols-4 gap-2 pt-4 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <p className="text-lg font-black text-emerald-600">{activeStats.attendedCount}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Asistidos</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <p className="text-lg font-black text-[#DA291C]">{activeStats.totalHours} hrs</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Horas Formativas</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <p className="text-lg font-black text-indigo-600">{activeStats.avgScore} <span className="text-[10px] font-medium text-slate-500">pts</span></p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Promedio Notas</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <p className="text-lg font-black text-blue-600">{activeStats.records.length}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Total Registros</p>
                  </div>
                </div>
              </div>

              {/* Selector y Tabla de Cursos a Certificar */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Capacitaciones Disponibles para Certificación</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Marca o desmarca los cursos que deseas que aparezcan desglosados en el cuerpo de la carta.
                    </p>
                  </div>

                  {/* Controles de Selección Masiva */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(true)}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      Marcar Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(false)}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      Desmarcar
                    </button>
                    <span className="text-xs font-black text-slate-900 pl-1">
                      {selectedRecordsForLetter.length} sel. ({selectedHoursTotal}h)
                    </span>
                  </div>
                </div>

                {/* Lista de Cursos del Colaborador */}
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {activeStats.records.length > 0 ? (
                    activeStats.records.map(rec => {
                      const isChecked = Boolean(selectedRecordIds[rec.id]);
                      return (
                        <div
                          key={rec.id}
                          onClick={() => toggleRecordSelection(rec.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isChecked
                              ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                              : 'bg-white border-slate-200/80 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRecordSelection(rec.id);
                              }}
                              aria-label={isChecked ? `Deseleccionar curso ${rec.title}` : `Seleccionar curso ${rec.title}`}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-5 h-5 text-[#DA291C]" aria-hidden="true" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-300" aria-hidden="true" />
                              )}
                            </button>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                {rec.isExternal && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
                                    Externa
                                  </span>
                                )}
                                {rec.isRecurrent && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">
                                    Academia
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-50 text-[#DA291C] border border-red-200">
                                  {rec.category}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500">
                                  {rec.modality}
                                </span>
                                {rec.supplier && (
                                  <span className="text-[10px] font-bold text-slate-600">
                                    • {rec.supplier}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-black text-slate-900 truncate">
                                {rec.title}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {formatDateShort(rec.date)} {rec.time}
                                </span>
                                <span>•</span>
                                <span>Facilitador: {rec.instructor}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-xs font-black text-slate-900 block">
                                {rec.hours} hrs
                              </span>
                              {rec.isRecurrent ? (
                                rec.academicStatus === 'passed' ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" /> Acreditado ({rec.attendancePercentage || 0}%)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                                    <Clock className="w-3 h-3" /> {rec.attendancePercentage || 0}% Asist.
                                  </span>
                                )
                              ) : rec.hasAttended ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Asistió
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                  <Clock className="w-3 h-3" /> Agendado
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateSingleCourse(rec);
                              }}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold transition-colors cursor-pointer"
                              title="Emitir constancia solo para este curso"
                              aria-label={`Emitir constancia para ${rec.title}`}
                            >
                              <Printer className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                      <p className="text-xs font-bold text-slate-700">Sin capacitaciones registradas</p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                        Este colaborador aún no ha sido inscrito en capacitaciones de la plataforma.
                      </p>
                    </div>
                  )}
                </div>

                {/* Resumen de Emisión Inferior */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 font-medium">
                    Capacitaciones seleccionadas para la constancia: <strong className="text-slate-900 font-black">{selectedRecordsForLetter.length}</strong> ({selectedHoursTotal} horas académicas calculadas)
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateLetterSelected}
                    disabled={selectedRecordsForLetter.length === 0}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Configurar y Emitir Carta Formal</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h2 className="text-base font-black text-slate-800">Selecciona un Colaborador</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Elige un colaborador del directorio de la izquierda para visualizar su historial de capacitaciones, horas acumuladas y emitir cartas formales personalizadas.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* 3. Modal de Elaboración de Carta Formal */}
      <FormalLetterModal
        isOpen={isLetterModalOpen}
        onClose={() => {
          setIsLetterModalOpen(false);
          setRecordsForLetter([]);
        }}
        participant={activeParticipant}
        currentUser={linkedUserAccount || null}
        companies={companies}
        trainingRecords={recordsForLetter}
      />
    </div>
  );
};
