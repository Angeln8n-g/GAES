import React, { useState } from 'react';
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
  Layers
} from 'lucide-react';
import { TrainingEvent, Participant, UserAccount } from '../../types';
import { formatDateLong } from '../../utils/formatters';
import * as XLSX from 'xlsx';

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
    const map = new Map<string, { email: string; name: string; card?: string; cedula?: string; role?: string }>();
    
    // Add users
    users.forEach(u => {
      map.set(u.email.toLowerCase(), {
        email: u.email.toLowerCase(),
        name: u.name,
        cedula: u.cedula,
        role: u.role
      });
    });

    // Add participants
    participants.forEach(p => {
      const email = p.email.toLowerCase();
      const existing = map.get(email);
      if (existing) {
        existing.card = p.card;
        if (!existing.cedula && p.cedula) existing.cedula = p.cedula;
      } else {
        map.set(email, {
          email,
          name: p.name,
          card: p.card,
          cedula: p.cedula,
          role: 'Colaborador (User)'
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

    const matchesRole = roleFilter === 'all' || item.role === roleFilter;

    return matchesSearch && matchesRole;
  });

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Super Administrador
              </span>
              <span className="text-xs text-slate-400 font-medium">Matriculación Masiva Oficial</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              <span>Matricular Usuarios de Forma Masiva</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Inscribe a grupos de colaboradores en cualquier capacitación y horario del sistema con 1 solo clic.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Select Event, Date & Slot */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/40 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            {/* Event Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
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
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-medium focus:border-indigo-500"
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
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
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
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-medium focus:border-indigo-500"
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
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Horario y Cupo</span>
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-medium focus:border-indigo-500"
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
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-indigo-300 font-bold">Estado del Turno Seleccionado:</span>
                <span className="text-white">
                  <strong>{currentSlot.registered}</strong> de <strong>{currentSlot.capacity}</strong> cupos ocupados
                </span>
                <span className="text-slate-400">({currentSlot.capacity - currentSlot.registered} disponibles)</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoExpand"
                  checked={autoExpandCapacity}
                  onChange={(e) => setAutoExpandCapacity(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="autoExpand" className="text-xs text-indigo-200 cursor-pointer">
                  Auto-ampliar capacidad si la matrícula supera el cupo máximo
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Mode Selector */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-800 bg-slate-950/20 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('select')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'select'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
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
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'text'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            <span>2. Pegar Correos / Cédulas</span>
          </button>

          <button
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'file'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
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
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute inset-y-0 left-3 my-auto" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre, correo o cédula..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="all">Todos los Roles</option>
                    <option value="Colaborador (User)">Colaborador (User)</option>
                    <option value="Administrador / Editor">Administrador / Editor</option>
                    <option value="Super Administrador">Super Administrador</option>
                  </select>

                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-indigo-300 whitespace-nowrap"
                  >
                    {selectedEmails.size === filteredDirectory.filter(i => !alreadyEnrolledSet.has(i.email)).length && selectedEmails.size > 0
                      ? 'Deseleccionar'
                      : 'Seleccionar Disponibles'}
                  </button>
                </div>
              </div>

              {/* Directory list */}
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60 rounded-2xl border border-slate-800 bg-slate-900/60">
                {filteredDirectory.map(item => {
                  const isAlready = alreadyEnrolledSet.has(item.email);
                  const isChecked = selectedEmails.has(item.email);

                  return (
                    <div
                      key={item.email}
                      onClick={() => !isAlready && toggleEmail(item.email)}
                      className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                        isAlready 
                          ? 'opacity-60 bg-slate-950/40 cursor-not-allowed' 
                          : isChecked 
                          ? 'bg-indigo-600/15 cursor-pointer' 
                          : 'hover:bg-slate-800/30 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked || isAlready}
                          disabled={isAlready}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-white">{item.name}</p>
                            {item.cedula && (
                              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                                {item.cedula}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">{item.email} • {item.role || 'Colaborador'}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        {isAlready ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Ya Matriculado
                          </span>
                        ) : (
                          <span className={`text-[10px] font-semibold ${isChecked ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
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
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Clipboard className="w-4 h-4 text-indigo-400" />
                  <span>Pega una lista de correos o números de cédula</span>
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Ejemplo:\nana.morales@empresa.com\n402-2196163-1\ncarlos.gomez@empresa.com\n001-0876543-2`}
                  rows={6}
                  className="w-full p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400">
                  Detecta automáticamente correos corporativos o cédulas vinculadas al directorio de colaboradores.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: FILE INPUT */}
          {activeTab === 'file' && (
            <div className="space-y-3">
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
                <Upload className="w-8 h-8 text-indigo-400 mx-auto" />
                <div>
                  <h4 className="text-xs font-bold text-white">Subir archivo Excel o CSV con asistentes</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    El sistema extraerá automáticamente todas las columnas con correos electrónicos para matricularlos.
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SUMMARY REVIEW */}
          {targetEmails.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Resumen de Matriculación:</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    +{validNewToEnroll.length} Nuevas Matrículas
                  </span>
                  {alreadyEnrolledCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {alreadyEnrolledCount} Omitidos (Ya inscritos)
                    </span>
                  )}
                </div>
              </div>

              {willExceedCapacity && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
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
        <div className="p-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {validNewToEnroll.length > 0 ? (
              <span>Listos para matricular: <strong>{validNewToEnroll.length} usuarios</strong> en <em>{currentEvent?.title}</em></span>
            ) : (
              <span>Selecciona los usuarios a matricular</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmBulkEnrollment}
              disabled={validNewToEnroll.length === 0 || isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
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
    </div>
  );
};
