import React, { useState, useMemo } from 'react';
import {
  User,
  GraduationCap,
  Calendar,
  MapPin,
  Phone,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  BookOpen,
  Briefcase,
  Layers,
  HeartHandshake,
  ShieldCheck,
  ChevronRight,
  School,
  Lock,
  ExternalLink,
  Award,
  Clock,
  Building2
} from 'lucide-react';
import { UserAccount, Participant, EducationLevel, Gender, ExternalTraining } from '../../types';
import { formatDateShort, formatCedula } from '../../utils/formatters';
import { getProgramShortName } from '../../constants/sustainabilityPrograms';
import { AccessibleModal } from '../common/AccessibleModal';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  participant?: Participant | null;
  externalTrainings?: ExternalTraining[];
  isMandatory?: boolean; // Bloqueante si es primer ingreso o perfil incompleto
  onSaveProfile: (profileData: {
    birthDate: string;
    educationLevel: EducationLevel;
    isCurrentlyStudying: boolean;
    currentStudyField?: string;
    institutionName?: string;
    professionTitle?: string;
    currentAddress: string;
    phone: string;
    gender?: Gender;
    trainingInterestAreas: string[];
    profileCompleted: boolean;
  }) => Promise<void>;
  onShowToast?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

const EDUCATION_LEVEL_OPTIONS: { value: EducationLevel; label: string; desc: string }[] = [
  { value: 'Secundaria / Bachiller', label: 'Secundaria / Bachiller', desc: 'Educación media o bachillerato concluido' },
  { value: 'Técnico / Tecnólogo', label: 'Técnico / Tecnólogo', desc: 'Diplomado técnico, formación vocacional o INFOTEP/ITLA' },
  { value: 'Universitario en Curso', label: 'Universitario en Curso', desc: 'Cursando actualmente carrera de grado' },
  { value: 'Profesional / Grado', label: 'Profesional / Grado', desc: 'Licenciatura, Ingeniería o título universitario' },
  { value: 'Postgrado / Maestría', label: 'Postgrado / Maestría', desc: 'Especialidad, Maestría o Postgrado' },
  { value: 'Doctorado', label: 'Doctorado', desc: 'Grado doctoral o PhD' },
  { value: 'Primaria', label: 'Primaria', desc: 'Educación básica' },
  { value: 'Otro', label: 'Otro', desc: 'Otra formación o autodidacta' },
];

const PREDEFINED_INTERESTS: string[] = [
  'Tecnología y Herramientas Digitales / IA',
  'Liderazgo y Gestión de Equipos',
  'Excel Avanzado y Análisis de Datos',
  'Atención al Cliente y Comunicación Asertiva',
  'Seguridad Industrial y Procesos Operativos',
  'Gestión del Tiempo y Productividad',
  'Inglés Corporativo / Idiomas',
  'Resolución de Conflictos y Negociación'
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  participant,
  externalTrainings = [],
  isMandatory = false,
  onSaveProfile,
  onShowToast
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'demographics' | 'trainings'>('demographics');

  // Filtrar capacitaciones externas del colaborador actual
  const userExternalTrainings = useMemo(() => {
    const card = participant?.card;
    const email = currentUser.email.toLowerCase();
    return (externalTrainings || []).filter(t => 
      (card && t.participantCard === card) || 
      (t.participantEmail && t.participantEmail.toLowerCase() === email)
    );
  }, [externalTrainings, participant?.card, currentUser.email]);

  // Initial values prioritized from currentUser or participant
  const initialBirthDate = currentUser.birthDate || participant?.birthDate || '';
  const initialEduLevel = (currentUser.educationLevel || participant?.educationLevel || 'Secundaria / Bachiller') as EducationLevel;
  const initialStudying = currentUser.isCurrentlyStudying !== undefined 
    ? currentUser.isCurrentlyStudying 
    : (participant?.isCurrentlyStudying || false);
  const initialStudyField = currentUser.currentStudyField || participant?.currentStudyField || '';
  const initialInstitution = currentUser.institutionName || participant?.institutionName || '';
  const initialProfession = currentUser.professionTitle || participant?.professionTitle || '';
  const initialAddress = currentUser.currentAddress || participant?.currentAddress || '';
  const initialPhone = currentUser.phone || participant?.phone || '';
  const initialGender = (currentUser.gender || participant?.gender || 'Prefiero no decir') as Gender;
  const initialInterests = currentUser.trainingInterestAreas?.length 
    ? currentUser.trainingInterestAreas 
    : (participant?.trainingInterestAreas?.length ? participant.trainingInterestAreas : []);

  const [birthDate, setBirthDate] = useState<string>(initialBirthDate);
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(initialEduLevel);
  const [isCurrentlyStudying, setIsCurrentlyStudying] = useState<boolean>(initialStudying);
  const [currentStudyField, setCurrentStudyField] = useState<string>(initialStudyField);
  const [institutionName, setInstitutionName] = useState<string>(initialInstitution);
  const [professionTitle, setProfessionTitle] = useState<string>(initialProfession);
  const [currentAddress, setCurrentAddress] = useState<string>(initialAddress);
  const [phone, setPhone] = useState<string>(initialPhone);
  const [gender, setGender] = useState<Gender>(initialGender);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(initialInterests);
  const [customInterest, setCustomInterest] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Calculate age from birthdate
  const calculatedAge = useMemo(() => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 && age <= 100 ? age : null;
  }, [birthDate]);

  // Completion percentage
  const completionPercentage = useMemo(() => {
    let score = 0;
    const totalChecks = 6;
    if (birthDate) score++;
    if (educationLevel) score++;
    if (currentAddress.trim()) score++;
    if (phone.trim()) score++;
    if (!isCurrentlyStudying || (currentStudyField.trim() && institutionName.trim())) score++;
    if (selectedInterests.length > 0) score++;
    return Math.round((score / totalChecks) * 100);
  }, [birthDate, educationLevel, currentAddress, phone, isCurrentlyStudying, currentStudyField, institutionName, selectedInterests]);

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleAddCustomInterest = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!customInterest.trim()) return;
    const val = customInterest.trim();
    if (!selectedInterests.includes(val)) {
      setSelectedInterests([...selectedInterests, val]);
    }
    setCustomInterest('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!birthDate) {
      setErrorMessage('Por favor indica tu fecha de nacimiento.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Por favor indica un teléfono o número de WhatsApp de contacto.');
      return;
    }
    if (!currentAddress.trim()) {
      setErrorMessage('Por favor indica tu sector o dirección actual de residencia.');
      return;
    }
    if (isCurrentlyStudying && !currentStudyField.trim()) {
      setErrorMessage('Si estás estudiando actualmente, especifica la carrera o curso que estás cursando.');
      return;
    }
    if (selectedInterests.length === 0) {
      setErrorMessage('Por favor selecciona al menos un área de interés formativo.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveProfile({
        birthDate,
        educationLevel,
        isCurrentlyStudying,
        currentStudyField: isCurrentlyStudying ? currentStudyField.trim() : '',
        institutionName: isCurrentlyStudying ? institutionName.trim() : '',
        professionTitle: professionTitle.trim() || undefined,
        currentAddress: currentAddress.trim(),
        phone: phone.trim(),
        gender,
        trainingInterestAreas: selectedInterests,
        profileCompleted: true
      });
      if (onShowToast) {
        onShowToast('Perfil Actualizado', 'Tus datos formativos y sociodemográficos se han guardado con éxito.', 'success');
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar los datos. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={isMandatory ? () => {} : onClose}
      closeOnEscape={!isMandatory}
      closeOnBackdropClick={!isMandatory}
      ariaLabel={`Perfil de Formación - ${currentUser.name}`}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* Header con gradiente institucional */}
        <div className="bg-gradient-to-r from-[#DA291C] via-red-600 to-[#0F172A] p-5 sm:p-6 text-white relative">
          {!isMandatory && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
              <GraduationCap className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  {isMandatory ? '¡Bienvenido! Completa tu Ficha de Formación' : 'Mi Perfil & Ficha Académica'}
                </h2>
                {isMandatory && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 uppercase tracking-wider">
                    Requerido
                  </span>
                )}
              </div>
              <p className="text-xs text-red-100/90 mt-0.5 font-medium">
                {isMandatory
                  ? 'Para medir los resultados de los programas e identificar oportunidades de mejora, es necesario completar estos datos.'
                  : 'Mantén actualizada tu información para acceder a capacitaciones personalizadas y oportunidades de crecimiento.'}
              </p>
            </div>
          </div>

          {/* Barra de progreso de completitud */}
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-[11px] font-semibold text-white/90 mb-1">
                <span>Progreso de la ficha</span>
                <span className="font-bold text-amber-300">{completionPercentage}%</span>
              </div>
              <div className="h-2 w-full bg-black/25 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
            {completionPercentage === 100 ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 shrink-0">
                <CheckCircle2 className="w-4 h-4" /> Completo
              </span>
            ) : (
              <span className="text-[11px] text-red-200 shrink-0">
                Faltan campos clave
              </span>
            )}
          </div>
        </div>

        {/* Sub-tab Navigation (Ficha vs Capacitaciones Externas) */}
        {!isMandatory && (
          <div className="flex border-b border-slate-200 bg-slate-50/80 px-5 pt-2 gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('demographics')}
              className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'demographics'
                  ? 'border-[#DA291C] text-[#DA291C]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Ficha Sociodemográfica
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trainings')}
              className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'trainings'
                  ? 'border-[#DA291C] text-[#DA291C]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              <span>Capacitaciones Externas</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-black">
                {userExternalTrainings.length}
              </span>
            </button>
          </div>
        )}

        {/* Form Content - Ficha Sociodemográfica */}
        {activeTab === 'demographics' && (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* Identidad del Colaborador (solo lectura o confirmación) */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#DA291C] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <p className="font-bold text-slate-800">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">{currentUser.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {currentUser.cedula && (
                <span className="text-slate-600 font-mono font-medium">
                  Cédula: <strong>{currentUser.cedula}</strong>
                </span>
              )}
              {participant?.card && (
                <span className="text-[#DA291C] font-mono font-bold">
                  Tarj: #{participant.card}
                </span>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SECCIÓN 1: DATOS PERSONALES & CONTACTO */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <User className="w-3.5 h-3.5 text-[#DA291C]" />
              1. Información Personal & Contacto
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Fecha de Nacimiento */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha de Nacimiento <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800 font-medium"
                  />
                </div>
                {calculatedAge !== null && (
                  <p className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Edad calculada: <strong className="text-slate-700">{calculatedAge} años</strong>
                  </p>
                )}
              </div>

              {/* Teléfono / WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teléfono / WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    placeholder="Ej. (809) 555-0123"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Género */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Género
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800 font-medium bg-white"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                  <option value="Prefiero no decir">Prefiero no decir</option>
                </select>
              </div>

              {/* Dirección actual */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dirección de Residencia Actual <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Sector, calle o municipio (Ej. Bella Vista, Santo Domingo D.N.)"
                    value={currentAddress}
                    onChange={(e) => setCurrentAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: PERFIL ACADÉMICO & PROFESIONAL */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
              2. Perfil Académico & Formación
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Grado / Nivel de Estudio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nivel de Estudio Alcanzado <span className="text-red-500">*</span>
                </label>
                <select
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value as EducationLevel)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800 font-medium bg-white"
                >
                  {EDUCATION_LEVEL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {EDUCATION_LEVEL_OPTIONS.find(o => o.value === educationLevel)?.desc}
                </p>
              </div>

              {/* Título o Profesión */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título / Profesión Obtenida
                </label>
                <div className="relative">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Ej. Bachiller, Ing. Sistemas, Lic. Administración, Técnico..."
                    value={professionTitle}
                    onChange={(e) => setProfessionTitle(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Switch: ¿Estudias actualmente? */}
            <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-3.5 mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4 text-amber-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">¿Estudias actualmente?</span>
                    <span className="text-[11px] text-slate-500">¿Estás cursando alguna carrera, curso técnico o diplomado?</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCurrentlyStudying(false)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      !isCurrentlyStudying 
                        ? 'bg-slate-800 text-white shadow-xs' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCurrentlyStudying(true)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isCurrentlyStudying 
                        ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Sí, estudio
                  </button>
                </div>
              </div>

              {/* Campos condicionales si estudia actualmente */}
              {isCurrentlyStudying && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-3 border-t border-amber-200/60 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ¿Qué estudias actualmente? <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={isCurrentlyStudying}
                      placeholder="Ej. Ing. en Ciberseguridad, Técnico en Redes..."
                      value={currentStudyField}
                      onChange={(e) => setCurrentStudyField(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] bg-white text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Institución / Universidad
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. UASD, INTEC, ITLA, INFOTEP, PUCMM..."
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] bg-white text-slate-800 font-medium"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN 3: OPORTUNIDADES DE MEJORA & INTERESES FORMATIVOS */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                3. Intereses de Desarrollo & Oportunidades de Mejora
              </h3>
              <span className="text-[10px] text-slate-400">Selecciona al menos 1</span>
            </div>

            <p className="text-[11px] text-slate-500">
              ¿En qué competencias te gustaría capacitarte para impulsar tu crecimiento en la empresa?
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {PREDEFINED_INTERESTS.map(item => {
                const isSelected = selectedInterests.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleInterest(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs scale-[1.02]'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{item}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            {/* Custom interests tag input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="¿Otro tema que necesites para tu puesto? Escríbelo aquí..."
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyDown={handleAddCustomInterest}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800 font-medium"
              />
              <button
                type="button"
                onClick={handleAddCustomInterest}
                className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold cursor-pointer transition-colors"
              >
                Agregar
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            {!isMandatory ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Completa la ficha para continuar al portal</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#DA291C] to-red-600 hover:from-red-600 hover:to-red-700 text-white font-black text-xs shadow-md shadow-red-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>Guardar & Continuar</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </form>
        )}

        {/* Tab 2: Capacitaciones Externas */}
        {activeTab === 'trainings' && (
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* Header del resumen externo */}
            <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-2xl flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Certificaciones & Cursos Externos
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    Formación realizada con entidades externas y homologada en el programa de sustentabilidad.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Cursos</span>
                  <span className="text-base font-black text-slate-900">{userExternalTrainings.length}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Horas Totales</span>
                  <span className="text-base font-black text-blue-700">
                    {userExternalTrainings.reduce((acc, t) => acc + (Number(t.totalHours) || 0), 0)} hrs
                  </span>
                </div>
              </div>
            </div>

            {/* Listado de cursos externos */}
            {userExternalTrainings.length === 0 ? (
              <div className="p-10 text-center space-y-2.5 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">Sin capacitaciones externas registradas</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Cuando la administración registre cursos, diplomados o certificaciones externas que hayas completado, aparecerán aquí con la leyenda <span className="font-bold text-blue-700">"Externa"</span> y sus horas acreditadas.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {userExternalTrainings.map(t => (
                  <div key={t.id} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-200 transition-all shadow-xs space-y-2.5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                            Externa
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {getProgramShortName(t.programCategory)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {t.trainingFormat} • {t.modality}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl">
                          <Clock className="w-3.5 h-3.5 text-[#DA291C]" />
                          {t.totalHours} hrs
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Suplidor: <strong className="text-slate-800">{t.supplier}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Fechas: {formatDateShort(t.startDate)} → {formatDateShort(t.endDate)}</span>
                      </div>
                      {t.subprogram && (
                        <div className="sm:col-span-2 text-slate-500">
                          Subprograma: <strong className="text-slate-700">{t.subprogram}</strong>
                        </div>
                      )}
                      {t.description && (
                        <div className="sm:col-span-2 text-slate-500 italic bg-slate-50 p-2 rounded-lg text-[10px]">
                          "{t.description}"
                        </div>
                      )}
                    </div>

                    {(t.credentialUrl || t.certificateNumber) && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                        {t.certificateNumber && (
                          <span className="text-slate-400 font-mono text-[10px]">
                            Folio: {t.certificateNumber}
                          </span>
                        )}
                        {t.credentialUrl && (
                          <a
                            href={t.credentialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 cursor-pointer ml-auto"
                          >
                            <ExternalLink className="w-3 h-3" /> Ver Certificado Oficial
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Botón de cierre en pestaña de capacitaciones */}
            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

      </div>
    </AccessibleModal>
  );
};
