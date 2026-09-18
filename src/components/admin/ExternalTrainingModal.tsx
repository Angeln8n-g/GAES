import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  GraduationCap, 
  Building2, 
  Calendar, 
  Clock, 
  Award, 
  Link as LinkIcon, 
  FileText, 
  User, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  Search, 
  ShieldCheck, 
  ExternalLink,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { 
  Participant, 
  Company, 
  ExternalTraining, 
  CreateExternalTrainingPayload,
  UserAccount 
} from '../../types';
import { 
  SUSTAINABILITY_PROGRAMS, 
  SESSION_TYPES, 
  TRAINING_TYPES, 
  TRAINING_FORMATS, 
  EVENT_MODALITIES, 
  DEFAULT_SUPPLIER_OPTIONS, 
  getSubprogramsForProgram,
  getProgramLabel,
  getProgramShortName,
  SessionType,
  TrainingType,
  TrainingFormat
} from '../../constants/sustainabilityPrograms';
import { formatDateShort } from '../../utils/formatters';
import { AccessibleModal } from '../common/AccessibleModal';

interface ExternalTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateExternalTrainingPayload, isEdit?: boolean, editId?: string) => Promise<void>;
  editingTraining?: ExternalTraining | null;
  participants: Participant[];
  companies?: Company[];
  currentUser: UserAccount | null;
  defaultParticipantCard?: string;
}

export const ExternalTrainingModal: React.FC<ExternalTrainingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTraining = null,
  participants,
  companies = [],
  currentUser,
  defaultParticipantCard
}) => {
  if (!isOpen) return null;

  const isEdit = Boolean(editingTraining);

  // Participantes seleccionados
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState('');

  // Dimensiones de la capacitación
  const [title, setTitle] = useState('');
  const [sessionType, setSessionType] = useState<SessionType>('Asincrónica');
  const [trainingType, setTrainingType] = useState<TrainingType>('Técnico');
  const [trainingFormat, setTrainingFormat] = useState<TrainingFormat>('Curso');
  const [modality, setModality] = useState<'Virtual' | 'Presencial' | 'Mixta'>('Virtual');
  const [programCategory, setProgramCategory] = useState<string>('Capacitacion_tecnologica_digital');
  const [subprogram, setSubprogram] = useState<string>('Desarrollo de software');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalHours, setTotalHours] = useState<number>(40);
  const [supplier, setSupplier] = useState('INFOTEP');
  const [description, setDescription] = useState('');

  // Acreditación y certificado
  const [credentialUrl, setCredentialUrl] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [score, setScore] = useState<string>('');
  const [academicStatus, setAcademicStatus] = useState<string>('passed');
  const [companyId, setCompanyId] = useState<string>('emp_kasino');

  // Estado UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Cargar datos iniciales o de edición
  useEffect(() => {
    if (editingTraining) {
      setSelectedCards([editingTraining.participantCard]);
      setTitle(editingTraining.title || '');
      setSessionType((editingTraining.sessionType as SessionType) || 'Asincrónica');
      setTrainingType((editingTraining.trainingType as TrainingType) || 'Técnico');
      setTrainingFormat((editingTraining.trainingFormat as TrainingFormat) || 'Curso');
      setModality((editingTraining.modality as any) || 'Virtual');
      setProgramCategory(editingTraining.programCategory || 'Capacitacion_tecnologica_digital');
      setSubprogram(editingTraining.subprogram || 'Desarrollo de software');
      setStartDate(editingTraining.startDate || '');
      setEndDate(editingTraining.endDate || '');
      setTotalHours(editingTraining.totalHours || 40);
      setSupplier(editingTraining.supplier || 'INFOTEP');
      setDescription(editingTraining.description || '');
      setCredentialUrl(editingTraining.credentialUrl || '');
      setCertificateNumber(editingTraining.certificateNumber || '');
      setScore(editingTraining.score !== null && editingTraining.score !== undefined ? String(editingTraining.score) : '');
      setAcademicStatus(editingTraining.academicStatus || 'passed');
      setCompanyId(editingTraining.companyId || 'emp_kasino');
    } else {
      // Nuevo registro
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
      if (defaultParticipantCard) {
        setSelectedCards([defaultParticipantCard]);
      } else {
        setSelectedCards([]);
      }
      setTitle('');
      setSessionType('Asincrónica');
      setTrainingType('Técnico');
      setTrainingFormat('Curso');
      setModality('Virtual');
      setProgramCategory('Capacitacion_tecnologica_digital');
      setSubprogram('Desarrollo de software');
      setTotalHours(40);
      setSupplier('INFOTEP');
      setDescription('');
      setCredentialUrl('');
      setCertificateNumber('');
      setScore('');
      setAcademicStatus('passed');
      setCompanyId(currentUser?.companyId || 'emp_kasino');
    }
    setErrorMessage('');
  }, [editingTraining, defaultParticipantCard, currentUser]);

  // Lista reactiva de subprogramas
  const availableSubprograms = useMemo(() => {
    return getSubprogramsForProgram(programCategory);
  }, [programCategory]);

  // Mapa de participantes para lookup eficiente
  const participantsMap = useMemo(() => {
    const map = new Map<string, Participant>();
    participants.forEach(p => map.set(p.card, p));
    return map;
  }, [participants]);

  // Lista de colaboradores seleccionados
  const selectedParticipantsList = useMemo(() => {
    return selectedCards.map(c => participantsMap.get(c)).filter(Boolean) as Participant[];
  }, [selectedCards, participantsMap]);

  // Sincronizar fecha de culminación automáticamente
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (!endDate || new Date(val) > new Date(endDate)) {
      setEndDate(val);
    }
  };

  // Actualizar subprograma por defecto al cambiar el programa
  const handleProgramCategoryChange = (newCat: string) => {
    setProgramCategory(newCat);
    const subList = getSubprogramsForProgram(newCat);
    if (subList.length > 0) {
      setSubprogram(subList[0]);
    } else {
      setSubprogram('');
    }
  };

  // Filtrar participantes para el selector
  const filteredParticipants = useMemo(() => {
    if (!participantSearch.trim()) return participants.slice(0, 30);
    const q = participantSearch.toLowerCase();
    return participants.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.card.includes(q) || 
      (p.cedula && p.cedula.includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.department && p.department.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [participants, participantSearch]);

  const toggleParticipantCard = (card: string) => {
    if (isEdit) {
      // En modo edición solo es un participante
      setSelectedCards([card]);
      return;
    }
    if (selectedCards.includes(card)) {
      setSelectedCards(selectedCards.filter(c => c !== card));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };

  const handleSelectAllFiltered = () => {
    const newCards = new Set([...selectedCards, ...filteredParticipants.map(p => p.card)]);
    setSelectedCards(Array.from(newCards));
  };

  const handleClearSelected = () => {
    setSelectedCards([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (selectedCards.length === 0) {
      setErrorMessage('Debes seleccionar al menos un colaborador para asociarle la capacitación.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Por favor especifica el título de la capacitación externa.');
      return;
    }
    if (!supplier.trim()) {
      setErrorMessage('Por favor especifica el suplidor o entidad educativa emisora.');
      return;
    }
    if (!startDate || !endDate) {
      setErrorMessage('Por favor define la fecha de inicio y de culminación.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setErrorMessage('La fecha de inicio no puede ser posterior a la fecha de finalización.');
      return;
    }
    if (Number(totalHours) <= 0) {
      setErrorMessage('La duración en horas debe ser un número mayor a cero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateExternalTrainingPayload = {
        participantCards: selectedCards,
        participantCard: selectedCards[0],
        title: title.trim(),
        sessionType,
        trainingType,
        trainingFormat,
        modality,
        programCategory,
        subprogram,
        startDate,
        endDate,
        totalHours: Number(totalHours),
        supplier: supplier.trim(),
        description: description.trim(),
        credentialUrl: credentialUrl.trim() || null,
        certificateNumber: certificateNumber.trim() || null,
        score: score.trim() !== '' ? Number(score) : null,
        academicStatus,
        companyId,
        registeredBy: currentUser?.name || 'Administrador'
      };

      await onSave(payload, isEdit, editingTraining?.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar la capacitación externa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={isEdit ? 'Editar Capacitación Externa' : 'Registrar Capacitación Externa'}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* Header con gradiente institucional */}
        <div className="bg-gradient-to-r from-[#DA291C] via-red-600 to-[#0F172A] p-5 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            aria-label="Cerrar modal de capacitación externa"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer min-w-[44px] min-h-[44px] touch-target-44 inline-flex items-center justify-center"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
              <GraduationCap className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  {isEdit ? 'Editar Capacitación Externa' : 'Registrar Capacitación Externa'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white uppercase tracking-wider shadow-sm">
                  Externa
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                  🌿 Sustentabilidad
                </span>
              </div>
              <p className="text-xs text-red-100/90 mt-0.5 font-medium">
                Registra cursos, certificaciones y talleres realizados fuera de la plataforma con las 11 dimensiones del programa corporativo.
              </p>
            </div>
          </div>
        </div>

        {/* Formulario Scrolleable */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {errorMessage && (
            <div role="alert" aria-live="assertive" className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SECCIÓN 1: SELECCIÓN DE COLABORADOR(ES) */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#DA291C]" />
                1. Colaborador(es) que completaron la capacitación
                <span className="text-red-500">*</span>
              </h3>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="font-bold text-slate-700">
                  Seleccionados: <strong className="text-[#DA291C]">{selectedCards.length}</strong>
                </span>
                {!isEdit && (
                  <>
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline"
                    >
                      Elegir visibles ({filteredParticipants.length})
                    </button>
                    {selectedCards.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearSelected}
                        className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Limpiar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Buscador de colaboradores */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="ext-participant-search"
                type="text"
                aria-label="Buscar colaborador por nombre, tarjeta, cédula o departamento"
                placeholder="Buscar por nombre, tarjeta, cédula o departamento..."
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800 bg-white"
              />
            </div>

            {/* Listado de colaboradores seleccionables */}
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100">
              {filteredParticipants.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  No se encontraron colaboradores coincidentes.
                </div>
              ) : (
                filteredParticipants.map(p => {
                  const isChecked = selectedCards.includes(p.card);
                  return (
                    <label 
                      key={p.card} 
                      htmlFor={`ext-user-${p.card}`}
                      className={`flex items-center justify-between p-2.5 hover:bg-slate-50 cursor-pointer transition-colors text-xs ${
                        isChecked ? 'bg-red-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          id={`ext-user-${p.card}`}
                          type={isEdit ? 'radio' : 'checkbox'}
                          name="participant_select"
                          checked={isChecked}
                          onChange={() => toggleParticipantCard(p.card)}
                          className="w-3.5 h-3.5 rounded text-[#DA291C] focus:ring-[#DA291C]"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{p.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span>Tarj: #{p.card}</span>
                            {p.cedula && <span>• Céd: {p.cedula}</span>}
                            {p.department && <span>• {p.department}</span>}
                          </div>
                        </div>
                      </div>
                      {isChecked && (
                        <CheckCircle2 className="w-4 h-4 text-[#DA291C] shrink-0" />
                      )}
                    </label>
                  );
                })
              )}
            </div>

            {/* Chips de colaboradores seleccionados */}
            {selectedParticipantsList.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-medium">
                    Asignando a <strong className="text-slate-800 font-bold">{selectedParticipantsList.length}</strong> colaborador(es):
                  </span>
                  {!isEdit && selectedParticipantsList.length > 1 && (
                    <button
                      type="button"
                      onClick={handleClearSelected}
                      className="text-[10px] text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                    >
                      Deseleccionar todos
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
                  {selectedParticipantsList.map(p => (
                    <span
                      key={p.card}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200/80 shadow-2xs"
                    >
                      <span className="w-4 h-4 rounded-full bg-slate-700 text-white text-[9px] flex items-center justify-center font-bold">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="max-w-[130px] truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">#{p.card}</span>
                      {!isEdit && (
                        <button
                          type="button"
                          onClick={() => toggleParticipantCard(p.card)}
                          aria-label={`Quitar a ${p.name} de la selección`}
                          className="hover:text-red-600 ml-0.5 cursor-pointer text-slate-400"
                          title={`Quitar ${p.name}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: DATOS GENERALES DE LA CAPACITACIÓN */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <FileText className="w-3.5 h-3.5 text-[#DA291C]" />
              2. Datos Principales de la Capacitación Externa
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Título de la capacitación */}
              <div className="sm:col-span-2">
                <label htmlFor="ext-title" className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre o Título de la Capacitación Externa <span className="text-red-500">*</span>
                </label>
                <input
                  id="ext-title"
                  type="text"
                  required
                  placeholder="Ej. Certificación Internacional en AWS Solutions Architect / Taller de Ciberseguridad"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800 font-semibold"
                />
              </div>

              {/* Suplidor / Entidad Emisora */}
              <div>
                <label htmlFor="ext-supplier" className="block text-xs font-bold text-slate-700 mb-1">
                  Suplidor / Entidad Emisora <span className="text-red-500">*</span>
                </label>
                <input
                  id="ext-supplier"
                  type="text"
                  required
                  placeholder="Ej. INFOTEP, Platzi, Coursera, INTEC, Microsoft..."
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800 font-medium"
                />
                {/* Sugerencias rápidas de suplidores */}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  {['INFOTEP', 'Platzi', 'Coursera', 'Udemy', 'INTEC', 'Microsoft', 'AWS', 'Claro'].map(sup => (
                    <button
                      key={sup}
                      type="button"
                      onClick={() => setSupplier(sup)}
                      className={`px-2 py-0.5 text-[10px] rounded-md transition-colors cursor-pointer ${
                        supplier === sup 
                          ? 'bg-[#DA291C] text-white font-bold' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                      }`}
                    >
                      {sup}
                    </button>
                  ))}
                </div>
              </div>

              {/* Empresa asignada */}
              {companies.length > 0 && (
                <div>
                  <label htmlFor="ext-company-id" className="block text-xs font-bold text-slate-700 mb-1">
                    Empresa / Entidad Vinculada
                  </label>
                  <select
                    id="ext-company-id"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800 font-medium bg-white"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Descripción */}
              <div className="sm:col-span-2">
                <label htmlFor="ext-description" className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción o Alcance de la Capacitación
                </label>
                <textarea
                  id="ext-description"
                  rows={2}
                  placeholder="Describe los temas abordados, competencias adquiridas u objetivos del curso..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: PROGRAMA DE SUSTENTABILIDAD (11 DIMENSIONES) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
              <h3 className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                3. Dimensiones Oficiales del Programa de Sustentabilidad
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Taxonomía Claro
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100">
              {/* Programa Oficial */}
              <div className="sm:col-span-2 md:col-span-2">
                <label htmlFor="ext-program-category" className="block text-xs font-bold text-slate-800 mb-1">
                  Programa Corporativo <span className="text-red-500">*</span>
                </label>
                <select
                  id="ext-program-category"
                  value={programCategory}
                  onChange={(e) => handleProgramCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 font-semibold bg-white"
                >
                  {SUSTAINABILITY_PROGRAMS.map(prog => (
                    <option key={prog.id} value={prog.id}>
                      {prog.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subprograma (Dependiente) */}
              <div>
                <label htmlFor="ext-subprogram" className="block text-xs font-bold text-slate-800 mb-1">
                  Subprograma <span className="text-red-500">*</span>
                </label>
                <select
                  id="ext-subprogram"
                  value={subprogram}
                  onChange={(e) => setSubprogram(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 font-semibold bg-white"
                >
                  {availableSubprograms.map(sub => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Sesión */}
              <div>
                <label htmlFor="ext-session-type" className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Sesión <span className="text-red-500">*</span>
                </label>
                <select
                  id="ext-session-type"
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value as SessionType)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 font-medium bg-white"
                >
                  {SESSION_TYPES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Tipo de Entrenamiento */}
              <div>
                <label htmlFor="ext-training-type" className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Entrenamiento <span className="text-red-500">*</span>
                </label>
                <select
                  id="ext-training-type"
                  value={trainingType}
                  onChange={(e) => setTrainingType(e.target.value as TrainingType)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 font-medium bg-white"
                >
                  {TRAINING_TYPES.map(tt => (
                    <option key={tt} value={tt}>{tt}</option>
                  ))}
                </select>
              </div>

              {/* Formato de Capacitación */}
              <div>
                <label htmlFor="ext-training-format" className="block text-xs font-bold text-slate-700 mb-1">
                  Formato de Capacitación <span className="text-red-500">*</span>
                </label>
                <select
                  id="ext-training-format"
                  value={trainingFormat}
                  onChange={(e) => setTrainingFormat(e.target.value as TrainingFormat)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 font-medium bg-white"
                >
                  {TRAINING_FORMATS.map(tf => (
                    <option key={tf} value={tf}>{tf}</option>
                  ))}
                </select>
              </div>

              {/* Modalidad */}
              <div>
                <label htmlFor="ext-modality" className="block text-xs font-bold text-slate-700 mb-1">
                  Modalidad <span className="text-red-500">*</span>
                </label>
                <select
                  id="ext-modality"
                  value={modality}
                  onChange={(e) => setModality(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 font-medium bg-white"
                >
                  {EVENT_MODALITIES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Fecha Desde */}
              <div>
                <label htmlFor="ext-start-date" className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha Desde <span className="text-red-500">*</span>
                </label>
                <input
                  id="ext-start-date"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 font-medium bg-white"
                />
              </div>

              {/* Fecha Hasta */}
              <div>
                <label htmlFor="ext-end-date" className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha Hasta <span className="text-red-500">*</span>
                </label>
                <input
                  id="ext-end-date"
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 font-medium bg-white"
                />
              </div>

              {/* Duración en Horas */}
              <div>
                <label htmlFor="ext-total-hours" className="block text-xs font-bold text-slate-700 mb-1">
                  Duración Total (Horas) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="ext-total-hours"
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                    value={totalHours}
                    onChange={(e) => setTotalHours(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 font-bold bg-white"
                  />
                </div>
                {/* Atajos de horas comunes */}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  {[8, 16, 24, 40, 60, 120].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setTotalHours(h)}
                      className={`px-1.5 py-0.5 text-[10px] rounded-md transition-colors cursor-pointer ${
                        totalHours === h
                          ? 'bg-emerald-700 text-white font-bold'
                          : 'bg-emerald-100/70 text-emerald-900 hover:bg-emerald-200 font-medium'
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: CERTIFICADO & COMPROBANTE DE ACREDITACIÓN */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              4. Acreditación & Comprobante Digital (Opcional)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Folio / Número de Certificado */}
              <div>
                <label htmlFor="ext-certificate-number" className="block text-xs font-bold text-slate-700 mb-1">
                  Folio o Código de Certificado
                </label>
                <input
                  id="ext-certificate-number"
                  type="text"
                  placeholder="Ej. CERT-2026-98741"
                  value={certificateNumber}
                  onChange={(e) => setCertificateNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800 font-mono"
                />
              </div>

              {/* Calificación obtenida */}
              <div>
                <label htmlFor="ext-score" className="block text-xs font-bold text-slate-700 mb-1">
                  Calificación / Nota Obtenida (0-100)
                </label>
                <input
                  id="ext-score"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="Ej. 95.0"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800 font-semibold"
                />
              </div>

              {/* Estado Académico */}
              <div>
                <label htmlFor="ext-academic-status" className="block text-xs font-bold text-slate-700 mb-1">
                  Estado de Culminación
                </label>
                <select
                  id="ext-academic-status"
                  value={academicStatus}
                  onChange={(e) => setAcademicStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800 font-medium bg-white"
                >
                  <option value="passed">Aprobado / Certificado</option>
                  <option value="completed">Completado / Asistencia</option>
                  <option value="in_progress">En Curso</option>
                  <option value="failed">No Aprobado</option>
                </select>
              </div>

              {/* URL de Credencial o Enlace de Verificación */}
              <div className="sm:col-span-3">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="ext-credential-url" className="block text-xs font-bold text-slate-700">
                    Enlace de Validación / URL de Credencial Digital
                  </label>
                  {credentialUrl.trim().startsWith('http') && (
                    <a
                      href={credentialUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                    >
                      <span>Abrir y verificar enlace</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="relative">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="ext-credential-url"
                    type="url"
                    placeholder="https://coursera.org/verify/... o link de Google Drive / PDF"
                    value={credentialUrl}
                    onChange={(e) => setCredentialUrl(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#DA291C] to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl shadow-md shadow-red-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>Guardando...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {isEdit ? 'Actualizar Capacitación' : `Registrar para ${selectedCards.length} Colaborador(es)`}
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </AccessibleModal>
  );
};
