import React, { useState, useMemo } from 'react';
import { 
  X, 
  UserPlus, 
  Calendar, 
  Clock, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  Clipboard, 
  Users, 
  Sparkles, 
  RefreshCw,
  BookOpen,
  Layers,
  GraduationCap
} from 'lucide-react';
import { TrainingEvent, Participant, UserAccount } from '../../types';
import { formatDateLong } from '../../utils/formatters';
import * as XLSX from 'xlsx';
import { AccessibleModal } from '../common/AccessibleModal';

interface BulkEnrollmentModalProps {
  events: TrainingEvent[];
  participants: Participant[];
  users: UserAccount[];
  initialEventId?: string | null;
  initialDate?: string | null;
  initialTime?: string | null;
  onClose: () => void;
  onBulkRegister: (
    eventId: string, 
    date: string, 
    time: string, 
    emails: string[], 
    autoExpandCapacity?: boolean
  ) => Promise<{ events: TrainingEvent[]; enrolledCount: number; skippedAlreadyEnrolled: string[] }>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

type MethodTab = 'select' | 'text' | 'file';

export const BulkEnrollmentModal: React.FC<BulkEnrollmentModalProps> = ({
  events,
  participants,
  users,
  initialEventId,
  initialDate,
  initialTime,
  onClose,
  onBulkRegister,
  onShowToast
}) => {
  // Target Event Selection
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEventId || (events[0]?.id || '')
  );
  
  const currentEvent = events.find(e => e.id === selectedEventId) || events[0];

  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || (currentEvent?.schedule[0]?.date || '')
  );

  const currentSchedule = currentEvent?.schedule.find(s => s.date === selectedDate) || currentEvent?.schedule[0];

  const [selectedTime, setSelectedTime] = useState<string>(
    initialTime || (currentSchedule?.slots[0]?.time || '')
  );

  const currentSlot = currentSchedule?.slots.find(s => s.time === selectedTime) || currentSchedule?.slots[0];
  const alreadyEnrolledSet = new Set((currentSlot?.attendees || []).map(e => e.toLowerCase()));

  // Method Tab State
  const [activeTab, setActiveTab] = useState<MethodTab>('select');

  // Tab 1: Selection State
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [educationFilter, setEducationFilter] = useState<string>('all');
  const [studyingFilter, setStudyingFilter] = useState<string>('all');

  // Tab 2: Text State
  const [rawText, setRawText] = useState('');

  // Tab 3: File State
  const [fileEmails, setFileEmails] = useState<string[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Options
  const [autoExpandCapacity, setAutoExpandCapacity] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combine users and participants into unified directory
  const unifiedDirectory = React.useMemo(() => {
    const map = new Map<string, {
      email: string;
      name: string;
      card?: string;
      cedula?: string;
      role?: string;
      educationLevel?: string;
      isCurrentlyStudying?: boolean;
      currentStudyField?: string;
      trainingInterestAreas?: string[];
    }>();
    
    // Add users
    users.forEach(u => {
      map.set(u.email.toLowerCase(), {
        email: u.email.toLowerCase(),
        name: u.name,
        cedula: u.cedula,
        role: u.role,
        educationLevel: u.educationLevel,
        isCurrentlyStudying: u.isCurrentlyStudying,
        currentStudyField: u.currentStudyField,
        trainingInterestAreas: u.trainingInterestAreas || []
      });
    });

    // Add participants
    participants.forEach(p => {
      const email = p.email.toLowerCase();
      const existing = map.get(email);
      if (existing) {
        existing.card = p.card;
        if (!existing.cedula && p.cedula) existing.cedula = p.cedula;
        if (!existing.educationLevel && p.educationLevel) existing.educationLevel = p.educationLevel;
        if (existing.isCurrentlyStudying === undefined && p.isCurrentlyStudying !== undefined) existing.isCurrentlyStudying = p.isCurrentlyStudying;
        if (!existing.currentStudyField && p.currentStudyField) existing.currentStudyField = p.currentStudyField;
        if ((!existing.trainingInterestAreas || existing.trainingInterestAreas.length === 0) && p.trainingInterestAreas?.length) {
          existing.trainingInterestAreas = p.trainingInterestAreas;
        }
      } else {
        map.set(email, {
          email,
          name: p.name,
          card: p.card,
          cedula: p.cedula,
          role: 'Colaborador (User)',
          educationLevel: p.educationLevel,
          isCurrentlyStudying: p.isCurrentlyStudying,
          currentStudyField: p.currentStudyField,
          trainingInterestAreas: p.trainingInterestAreas || []
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [users, participants]);

  // Filter directory
  const filteredDirectory = unifiedDirectory.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      item.name.toLowerCase().includes(q) || 
      item.email.toLowerCase().includes(q) || 
      (item.cedula && item.cedula.includes(q)) || 
      (item.card && item.card.includes(q));

    const matchesRole = roleFilter === 'all' || 
      (roleFilter === 'Evaluador / Tutor' 
        ? (item.role === 'Evaluador / Tutor' || item.role === 'Evaluador / Tutor OJT')
        : item.role === roleFilter);
    const matchesEdu = educationFilter === 'all' || (item.educationLevel || 'Secundaria / Bachiller') === educationFilter;
    const matchesStudying = studyingFilter === 'all' || 
      (studyingFilter === 'studying' ? Boolean(item.isCurrentlyStudying) : !item.isCurrentlyStudying);

    return matchesSearch && matchesRole && matchesEdu && matchesStudying;
  });

  // Colaboradores con interés coincidente con el evento actual
  const matchingInterestEmails = useMemo(() => {
    if (!currentEvent) return [];
    const title = currentEvent.title.toLowerCase();
    const cat = currentEvent.category.toLowerCase();
    const skills = (currentEvent.skillsEvaluated || []).map(s => s.toLowerCase());

    return filteredDirectory
      .filter(item => !alreadyEnrolledSet.has(item.email))
      .filter(item => {
        const interests = (item.trainingInterestAreas || []).map(i => i.toLowerCase());
        return interests.some(interest => {
          const words = interest.split(' ').filter(w => w.length > 3);
          return words.some(w => title.includes(w) || cat.includes(w) || skills.some(s => s.includes(w)));
        });
      })
      .map(item => item.email);
  }, [currentEvent, filteredDirectory, alreadyEnrolledSet]);

  const selectMatchingInterestEmails = () => {
    if (matchingInterestEmails.length === 0) {
      onShowToast('Aviso', 'No se encontraron colaboradores disponibles con interés explícito en este tema.', 'info');
      return;
    }
    const next = new Set(selectedEmails);
    matchingInterestEmails.forEach(e => next.add(e));
    setSelectedEmails(next);
    onShowToast('Selección Inteligente', `Se seleccionaron ${matchingInterestEmails.length} colaboradores interesados en este tema.`, 'success');
  };

  // Handle Selection
  const toggleEmail = (email: string) => {
    const next = new Set(selectedEmails);
    if (next.has(email)) {
      next.delete(email);
    } else {
      next.add(email);
    }
    setSelectedEmails(next);
  };

  const selectAllFiltered = () => {
    const availableFiltered = filteredDirectory
      .filter(item => !alreadyEnrolledSet.has(item.email))
      .map(item => item.email);

    if (selectedEmails.size === availableFiltered.length && availableFiltered.length > 0) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(availableFiltered));
    }
  };

  // Handle Text parse
  const parseEmailsFromText = (text: string): string[] => {
    const tokens = text.split(/[\r\n,;\t]+/).map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    const result: string[] = [];
    const seen = new Set<string>();

    tokens.forEach(token => {
      if (token.includes('@')) {
        if (!seen.has(token)) {
          seen.add(token);
          result.push(token);
        }
      } else {
        // Try matching with cedula or card in directory
        const matched = unifiedDirectory.find(
          item => item.card === token || (item.cedula && item.cedula.replace(/\D/g, '') === token.replace(/\D/g, ''))
        );
        if (matched && !seen.has(matched.email)) {
          seen.add(matched.email);
          result.push(matched.email);
        }
      }
    });

    return result;
  };

  // Handle File Upload for Enrollment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingFile(true);
      const data = new Uint8Array(await file.arrayBuffer());
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const extracted: string[] = [];
      const seen = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        for (const cell of row) {
          const val = String(cell || '').trim().toLowerCase();
          if (val.includes('@') && !seen.has(val)) {
            seen.add(val);
            extracted.push(val);
          }
        }
      }

      setFileEmails(extracted);
      onShowToast('Archivo leído', `Se detectaron ${extracted.length} correos electrónicos en el archivo.`, 'info');
    } catch (err: any) {
      onShowToast('Error al leer archivo', err.message || 'No se pudo procesar el archivo Excel/CSV.', 'error');
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Compute final emails to enroll
  const getEmailsToEnroll = (): string[] => {
    if (activeTab === 'select') return Array.from(selectedEmails);
    if (activeTab === 'text') return parseEmailsFromText(rawText);
    if (activeTab === 'file') return fileEmails;
    return [];
  };

  const targetEmails = getEmailsToEnroll();
  const validNewToEnroll = targetEmails.filter(e => !alreadyEnrolledSet.has(e));
  const alreadyEnrolledCount = targetEmails.filter(e => alreadyEnrolledSet.has(e)).length;

  const currentCapacity = currentSlot?.capacity || 0;
  const currentRegistered = currentSlot?.registered || 0;
  const projectedTotal = currentRegistered + validNewToEnroll.length;
  const willExceedCapacity = projectedTotal > currentCapacity;

  // Submit Handler
  const handleConfirmBulkEnrollment = async () => {
    if (!currentEvent || !selectedDate || !selectedTime) {
      onShowToast('Faltan parámetros', 'Selecciona una capacitación, fecha y horario válidos.', 'error');
      return;
    }

    if (validNewToEnroll.length === 0) {
      onShowToast('Sin usuarios nuevos', 'Todos los usuarios seleccionados ya se encuentran matriculados en este horario.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await onBulkRegister(
        currentEvent.id,
        selectedDate,
        selectedTime,
        validNewToEnroll,
        autoExpandCapacity
      );

      onShowToast(
        'Matriculación Exitosa', 
        `Se han matriculado ${res.enrolledCount} colaboradores en "${currentEvent.title}".`, 
        'success'
      );
      onClose();
    } catch (err: any) {
      onShowToast('Error en matriculación', err.message || 'No se pudo completar la matriculación masiva.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      onClose={onClose}
      ariaLabel="Matricular Usuarios de Forma Masiva"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Super Administrador
              </span>
              <span className="text-xs text-slate-500 font-bold">Matriculación Masiva Oficial</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#DA291C]" />
              <span>Matricular Usuarios de Forma Masiva</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Inscribe a grupos de colaboradores en cualquier capacitación y horario del sistema con 1 solo clic.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Select Event, Date & Slot */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            {/* Event Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#DA291C]" />
                <span>Capacitación / Evento</span>
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  const newEvtId = e.target.value;
                  setSelectedEventId(newEvtId);
                  const ev = events.find(ev => ev.id === newEvtId);
                  if (ev && ev.schedule.length > 0) {
                    setSelectedDate(ev.schedule[0].date);
                    setSelectedTime(ev.schedule[0].slots[0]?.time || '');
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-[#DA291C]"
              >
                {events.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({e.modality})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#DA291C]" />
                <span>Fecha del Evento</span>
              </label>
              <select
                value={selectedDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setSelectedDate(newDate);
                  const sch = currentEvent?.schedule.find(s => s.date === newDate);
                  if (sch && sch.slots.length > 0) {
                    setSelectedTime(sch.slots[0].time);
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-[#DA291C]"
              >
                {currentEvent?.schedule.map(sch => (
                  <option key={sch.date} value={sch.date}>
                    {formatDateLong(sch.date)}
                  </option>
                ))}
              </select>
            </div>

            {/* Slot Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#DA291C]" />
                <span>Horario y Cupo</span>
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-[#DA291C]"
              >
                {currentSchedule?.slots.map(sl => (
                  <option key={sl.time} value={sl.time}>
                    {sl.time} — ({sl.registered} / {sl.capacity} inscritos)
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Current Slot Quick Status Badge */}
          {currentSlot && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-red-50/60 border border-red-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#DA291C] font-bold">Estado del Turno Seleccionado:</span>
                <span className="text-slate-900">
                  <strong>{currentSlot.registered}</strong> de <strong>{currentSlot.capacity}</strong> cupos ocupados
                </span>
                <span className="text-slate-500">({currentSlot.capacity - currentSlot.registered} disponibles)</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoExpand"
                  checked={autoExpandCapacity}
                  onChange={(e) => setAutoExpandCapacity(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#DA291C] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="autoExpand" className="text-xs text-slate-700 font-semibold cursor-pointer">
                  Auto-ampliar capacidad si la matrícula supera el cupo máximo
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Mode Selector */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-200 bg-slate-50/50 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('select')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'select'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. Directorio Visual ({unifiedDirectory.length})</span>
            {selectedEmails.size > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{selectedEmails.size}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'text'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            <span>2. Pegar Correos / Cédulas</span>
          </button>

          <button
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'file'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>3. Subir Lista Excel/CSV</span>
            {fileEmails.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{fileEmails.length}</span>
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          
          {/* TAB 1: VISUAL DIRECTORY */}
          {activeTab === 'select' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute inset-y-0 left-3 my-auto" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nombre, correo o cédula..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    >
                      <option value="all">Todos los Roles</option>
                      <option value="Colaborador (User)">Colaborador (User)</option>
                      <option value="Evaluador / Tutor">Evaluador / Tutor</option>
                      <option value="Líder de Área / Supervisor">Líder / Supervisor</option>
                      <option value="Administrador / Editor">Admin / Editor</option>
                    </select>

                    <select
                      value={educationFilter}
                      onChange={(e) => setEducationFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    >
                      <option value="all">Todo Grado de Estudio</option>
                      <option value="Secundaria / Bachiller">Secundaria / Bachiller</option>
                      <option value="Técnico / Tecnólogo">Técnico / Tecnólogo</option>
                      <option value="Universitario en Curso">Universitario en Curso</option>
                      <option value="Profesional / Grado">Profesional / Grado</option>
                      <option value="Postgrado / Maestría">Postgrado / Maestría</option>
                    </select>

                    <select
                      value={studyingFilter}
                      onChange={(e) => setStudyingFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    >
                      <option value="all">Estudios (Todos)</option>
                      <option value="studying">🎓 Estudiando Actualmente</option>
                      <option value="not_studying">No estudia</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectMatchingInterestEmails}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-xs font-black text-indigo-700 whitespace-nowrap cursor-pointer flex items-center gap-1.5 transition-colors active:scale-95 shadow-2xs"
                      title="Seleccionar colaboradores cuya ficha formativa coincide con este curso"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>⚡ Interesados en este Tema ({matchingInterestEmails.length})</span>
                    </button>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Mostrando {filteredDirectory.length} de {unifiedDirectory.length} colaboradores
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 whitespace-nowrap cursor-pointer"
                  >
                    {selectedEmails.size === filteredDirectory.filter(i => !alreadyEnrolledSet.has(i.email)).length && selectedEmails.size > 0
                      ? 'Deseleccionar Todos'
                      : 'Seleccionar Filtrados'}
                  </button>
                </div>
              </div>

              {/* Directory list */}
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-xs">
                {filteredDirectory.map(item => {
                  const isAlready = alreadyEnrolledSet.has(item.email);
                  const isChecked = selectedEmails.has(item.email);

                  return (
                    <div
                      key={item.email}
                      onClick={() => !isAlready && toggleEmail(item.email)}
                      className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                        isAlready 
                          ? 'opacity-60 bg-slate-50 cursor-not-allowed' 
                          : isChecked 
                          ? 'bg-red-50/60 cursor-pointer' 
                          : 'hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked || isAlready}
                          disabled={isAlready}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-slate-300 text-[#DA291C] focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-900">{item.name}</p>
                            {item.cedula && (
                              <span className="text-[10px] font-mono text-[#DA291C] bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                                {item.cedula}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">{item.email} • {item.role || 'Colaborador'}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {item.educationLevel && (
                              <span className="px-2 py-0.2 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
                                {item.educationLevel}
                              </span>
                            )}
                            {item.isCurrentlyStudying && (
                              <span className="px-2 py-0.2 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                🎓 {item.currentStudyField || 'Estudiando'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {isAlready ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Ya Matriculado
                          </span>
                        ) : (
                          <span className={`text-[10px] font-bold ${isChecked ? 'text-[#DA291C]' : 'text-slate-400'}`}>
                            {isChecked ? 'Seleccionado' : 'Disponible'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: TEXT INPUT */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Clipboard className="w-4 h-4 text-[#DA291C]" />
                  <span>Pega una lista de correos o números de cédula</span>
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Ejemplo:\nana.morales@empresa.com\n402-2196163-1\ncarlos.gomez@empresa.com\n001-0876543-2`}
                  rows={6}
                  className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                />
                <p className="text-[11px] text-slate-500">
                  Detecta automáticamente correos corporativos o cédulas vinculadas al directorio de colaboradores.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: FILE INPUT */}
          {activeTab === 'file' && (
            <div className="space-y-3">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <Upload className="w-8 h-8 text-[#DA291C] mx-auto" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Subir archivo Excel o CSV con asistentes</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    El sistema extraerá automáticamente todas las columnas con correos electrónicos para matricularlos.
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="text-xs text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#DA291C] file:text-white hover:file:opacity-90 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SUMMARY REVIEW */}
          {targetEmails.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Resumen de Matriculación:</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    +{validNewToEnroll.length} Nuevas Matrículas
                  </span>
                  {alreadyEnrolledCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {alreadyEnrolledCount} Omitidos (Ya inscritos)
                    </span>
                  )}
                </div>
              </div>

              {willExceedCapacity && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    El grupo a matricular ({validNewToEnroll.length}) superará el cupo original ({currentCapacity}). 
                    {autoExpandCapacity ? ' La capacidad del turno se ampliará automáticamente a ' + projectedTotal + '.' : ' Ajusta el cupo antes de proceder.'}
                  </span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium">
            {validNewToEnroll.length > 0 ? (
              <span>Listos para matricular: <strong className="text-slate-900">{validNewToEnroll.length} usuarios</strong> en <em className="text-slate-800 font-semibold">{currentEvent?.title}</em></span>
            ) : (
              <span>Selecciona los usuarios a matricular</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmBulkEnrollment}
              disabled={validNewToEnroll.length === 0 || isSubmitting}
              className="px-5 py-2.5 bg-[#DA291C] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-2xl shadow-md shadow-red-500/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Matriculando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirmar Matrícula ({validNewToEnroll.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </AccessibleModal>
  );
};
