import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Video, 
  Link as LinkIcon, 
  Sparkles, 
  Save, 
  AlertTriangle,
  Bell,
  Mail,
  Users,
  Award,
  CheckCircle2,
  Target,
  ShieldAlert,
  GraduationCap,
  UserCheck
} from 'lucide-react';
import { TrainingEvent, Schedule, Slot, EventModality, EventStatus, Company, EvaluationType, UserAccount } from '../../types';
import { formatDateLong } from '../../utils/formatters';

interface EventFormModalProps {
  initialEvent?: TrainingEvent | null;
  companies?: Company[];
  users?: UserAccount[];
  currentUser?: UserAccount | null;
  isSuperAdmin?: boolean;
  onClose: () => void;
  onSaveEvent: (event: TrainingEvent) => Promise<void>;
}

const CATEGORIES = ["Taller", "Curso", "Webinar", "Charla", "Cine Forum", "Evento"];

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80"
];

export const EventFormModal: React.FC<EventFormModalProps> = ({
  initialEvent,
  companies = [],
  users = [],
  currentUser,
  isSuperAdmin = true,
  onClose,
  onSaveEvent
}) => {
  const isEditing = !!initialEvent;

  const defaultCompanyId = initialEvent?.companyId || (!isSuperAdmin && currentUser?.companyId ? currentUser.companyId : (companies[0]?.id || 'emp_kasino'));

  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [category, setCategory] = useState(initialEvent?.category || 'Taller');
  const [companyId, setCompanyId] = useState(defaultCompanyId);
  const [instructor, setInstructor] = useState(initialEvent?.instructor || '');
  const [ojtEvaluatorId, setOjtEvaluatorId] = useState<string>(initialEvent?.ojtEvaluatorId || '');
  const [modality, setModality] = useState<EventModality>(initialEvent?.modality || 'Presencial');
  const [location, setLocation] = useState(initialEvent?.location || 'Sala de Juntas B');
  const [imageUrl, setImageUrl] = useState(initialEvent?.imageUrl || SAMPLE_IMAGES[0]);
  const [surveyUrl, setSurveyUrl] = useState(initialEvent?.surveyUrl || '');
  const [status, setStatus] = useState<EventStatus>(initialEvent?.status || 'active');

  // Esquema de Evaluación & Detección de Debilidades
  const [evaluationType, setEvaluationType] = useState<EvaluationType>(
    initialEvent?.evaluationType || (category === 'Taller' || category === 'Curso' ? 'score_100' : 'attendance_only')
  );
  const [passingScore, setPassingScore] = useState<number>(
    initialEvent?.passingScore !== undefined ? initialEvent.passingScore : 70
  );
  const [skillsEvaluated, setSkillsEvaluated] = useState<string[]>(
    initialEvent?.skillsEvaluated || []
  );
  const [newSkillInput, setNewSkillInput] = useState('');

  // Notificaciones
  const [sendEmail, setSendEmail] = useState(initialEvent?.notificationSettings?.sendEmail ?? true);
  const [sendTeams, setSendTeams] = useState(initialEvent?.notificationSettings?.sendTeams ?? true);
  const [customMessage, setCustomMessage] = useState(
    initialEvent?.notificationSettings?.customMessage ||
    "Estimado colaborador, te recordamos tu participación en el evento '[EVENT_TITLE]' con [INSTRUCTOR]. ¡Te esperamos!"
  );

  // Horarios
  const [schedule, setSchedule] = useState<Schedule[]>(
    initialEvent?.schedule || [
      {
        date: '2026-07-15',
        slots: [{ time: '10:00 AM', capacity: 25, registered: 0, attendees: [], attendedList: [] }]
      }
    ]
  );

  // Horario temporal para añadir
  const [tempDate, setTempDate] = useState('2026-07-20');
  const [tempTime, setTempTime] = useState('10:00 AM');
  const [tempCapacity, setTempCapacity] = useState(25);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSlot = () => {
    if (!tempDate || !tempTime || tempCapacity <= 0) return;

    setSchedule(prev => {
      const existingDateIdx = prev.findIndex(s => s.date === tempDate);
      if (existingDateIdx > -1) {
        const updated = [...prev];
        const dateObj = updated[existingDateIdx];
        if (!dateObj.slots.some(sl => sl.time === tempTime)) {
          dateObj.slots.push({
            time: tempTime,
            capacity: tempCapacity,
            registered: 0,
            attendees: [],
            attendedList: []
          });
        }
        return updated;
      } else {
        return [
          ...prev,
          {
            date: tempDate,
            slots: [
              {
                time: tempTime,
                capacity: tempCapacity,
                registered: 0,
                attendees: [],
                attendedList: []
              }
            ]
          }
        ];
      }
    });
  };

  const handleRemoveSlot = (dateStr: string, timeStr: string) => {
    setSchedule(prev => {
      return prev
        .map(sch => {
          if (sch.date === dateStr) {
            return {
              ...sch,
              slots: sch.slots.filter(sl => sl.time !== timeStr)
            };
          }
          return sch;
        })
        .filter(sch => sch.slots.length > 0);
    });
  };

  const handleAddSkill = (skillToAdd?: string) => {
    const s = (skillToAdd || newSkillInput).trim();
    if (!s) return;
    if (!skillsEvaluated.includes(s)) {
      setSkillsEvaluated(prev => [...prev, s]);
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkillsEvaluated(prev => prev.filter(s => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !instructor.trim()) {
      setError('El título y el instructor son campos obligatorios.');
      return;
    }

    if (schedule.length === 0 || schedule.every(s => s.slots.length === 0)) {
      setError('Debes configurar al menos una fecha y horario para el evento.');
      return;
    }

    const selectedOjtUser = users.find(u => u.id === ojtEvaluatorId);

    const eventPayload: TrainingEvent = {
      id: initialEvent?.id || `evt_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category,
      companyId: companyId || 'emp_kasino',
      instructor: instructor.trim(),
      ojtEvaluatorId: ojtEvaluatorId || undefined,
      ojtEvaluatorName: selectedOjtUser?.name || initialEvent?.ojtEvaluatorName || undefined,
      ojtEvaluatorEmail: selectedOjtUser?.email || initialEvent?.ojtEvaluatorEmail || undefined,
      modality,
      location: location.trim(),
      imageUrl: imageUrl.trim() || SAMPLE_IMAGES[0],
      surveyUrl: surveyUrl.trim() || undefined,
      status,
      evaluationType,
      passingScore: evaluationType === 'attendance_only' ? undefined : Number(passingScore),
      skillsEvaluated,
      notificationSettings: {
        sendEmail,
        sendTeams,
        customMessage
      },
      notificationHistory: initialEvent?.notificationHistory || [],
      schedule,
      feedbacks: initialEvent?.feedbacks || [],
      grades: initialEvent?.grades || []
    };

    try {
      setIsSubmitting(true);
      await onSaveEvent(eventPayload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el evento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {isEditing ? 'Editar Capacitación' : 'Crear Nueva Capacitación'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configura los detalles del curso, modalidad, enlaces de evaluación y horarios.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. General Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-[#DA291C] uppercase tracking-wider">
              1. Información General del Evento
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Título de la Capacitación *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ej. Taller de Liderazgo y Trabajo en Equipo"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Descripción y Objetivos</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalla los temas a cubrir, requisitos previos y lo que aprenderán los colaboradores..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {companies.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Empresa</label>
                  {isSuperAdmin ? (
                    <select
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-[#DA291C]"
                    >
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold truncate">
                      🏢 {companies.find(c => c.id === companyId)?.name || 'Empresa asignada'}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Modalidad</label>
                <select
                  value={modality}
                  onChange={(e) => setModality(e.target.value as EventModality)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Híbrida">Híbrida</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Instructor / Facilitador *</label>
                <input
                  type="text"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  placeholder="ej. Ing. Juan Pérez"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                  required
                />
              </div>
            </div>

            {/* Asignación de Tutor / Evaluador OJT */}
            <div className="bg-purple-50/50 border border-purple-200/80 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-purple-700" />
                  <span>Tutor / Evaluador OJT Responsable (Acompañamiento en Campo)</span>
                </label>
                <span className="text-[10px] text-purple-700 bg-purple-100/70 font-bold px-2 py-0.5 rounded-full border border-purple-300">
                  Bitácoras & Calibración
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Selecciona al evaluador de campo encargado de auditar el puesto de trabajo, First-Time Fix y mesas de calibración para esta capacitación.
              </p>
              <select
                value={ojtEvaluatorId}
                onChange={(e) => setOjtEvaluatorId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#DA291C]"
              >
                <option value="">— Sin tutor OJT asignado (Formación general o solo docente de aula) —</option>
                {users.filter(u => u.role === 'Evaluador / Tutor OJT').length > 0 && (
                  <optgroup label="⭐ Evaluadores & Tutores OJT Calificados">
                    {users.filter(u => u.role === 'Evaluador / Tutor OJT').map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.department || 'Operaciones'} • {u.email})
                      </option>
                    ))}
                  </optgroup>
                )}
                {users.filter(u => u.role !== 'Evaluador / Tutor OJT' && u.role !== 'Colaborador (User)').length > 0 && (
                  <optgroup label="👥 Otros Supervisores / Evaluadores Disponibles">
                    {users.filter(u => u.role !== 'Evaluador / Tutor OJT' && u.role !== 'Colaborador (User)').map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role} • {u.email})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ubicación o Enlace</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={modality === 'Virtual' ? 'Enlace de Microsoft Teams' : 'Sala de Juntas B (Piso 3)'}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enlace de Encuesta / Evaluación (Forms)
                </label>
                <input
                  type="url"
                  value={surveyUrl}
                  onChange={(e) => setSurveyUrl(e.target.value)}
                  placeholder="https://forms.office.com/r/ejemplo-evaluacion"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">URL de Imagen de Portada</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C] mb-2"
              />
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">Presets:</span>
                {SAMPLE_IMAGES.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Preset ${i}`}
                    onClick={() => setImageUrl(img)}
                    className={`w-10 h-8 rounded-lg object-cover cursor-pointer border-2 transition-all ${
                      imageUrl === img ? 'border-[#DA291C] scale-105 shadow-sm' : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 2. Evaluation & Skills Gap Scheme */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#DA291C] uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-[#DA291C]" />
                2. Esquema de Evaluación & Detección de Debilidades
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                Determina si los participantes recibirán calificación formal
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Calificación / Evaluación *
                </label>
                <select
                  value={evaluationType}
                  onChange={(e) => setEvaluationType(e.target.value as EvaluationType)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C] font-bold"
                >
                  <option value="attendance_only">📝 Solo Asistencia (Sin nota ni examen)</option>
                  <option value="score_100">🎯 Calificación Numérica (Escala 0 - 100 Puntos)</option>
                  <option value="scale_1_5">⭐ Escala de Desempeño (1 a 5 Estrellas)</option>
                  <option value="pass_fail">✅ Aprobado / Reprobado (Cualitativo)</option>
                </select>
              </div>

              {evaluationType !== 'attendance_only' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {evaluationType === 'scale_1_5' ? 'Puntaje Mínimo de Aprobación (1-5)' : 'Nota Mínima Aprobatoria (0-100) *'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={evaluationType === 'scale_1_5' ? 1 : 0}
                      max={evaluationType === 'scale_1_5' ? 5 : 100}
                      step={evaluationType === 'scale_1_5' ? 0.5 : 1}
                      value={passingScore}
                      onChange={(e) => setPassingScore(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-[#DA291C]"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[#DA291C] font-bold">
                      {evaluationType === 'scale_1_5' ? 'pts' : 'pts mín.'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Skills & Competencies Evaluated */}
            {evaluationType !== 'attendance_only' && (
              <div className="p-4 rounded-2xl bg-red-50/50 border border-red-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-[#DA291C]" />
                      Competencias y Temas Clave Evaluados
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Al calificar a cada participante, el evaluador podrá señalar si mostró debilidad en estas áreas.
                    </p>
                  </div>
                  <span className="text-[10px] bg-red-100 text-[#DA291C] px-2 py-0.5 rounded-full font-bold">
                    {skillsEvaluated.length} {skillsEvaluated.length === 1 ? 'competencia' : 'competencias'}
                  </span>
                </div>

                {/* Tags List */}
                <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                  {skillsEvaluated.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-xs group"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {skillsEvaluated.length === 0 && (
                    <span className="text-[11px] text-slate-400 italic py-1">
                      No hay competencias añadidas aún. Agrega temas o habilidades específicas.
                    </span>
                  )}
                </div>

                {/* Add new skill input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="ej. Procedimientos de Seguridad, Manejo de Objeciones, Cálculos..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill()}
                    className="px-3 py-2 bg-[#DA291C] hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir</span>
                  </button>
                </div>

                {/* Suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-400 font-bold">Sugerencias rápidas:</span>
                  {[
                    "Seguridad Operacional",
                    "Atención al Cliente",
                    "Herramientas Digitales",
                    "Cumplimiento y Normas",
                    "Manejo de Contingencias",
                    "Trabajo en Equipo"
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      disabled={skillsEvaluated.includes(sug)}
                      onClick={() => handleAddSkill(sug)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                        skillsEvaluated.includes(sug)
                          ? 'opacity-40 border-transparent bg-slate-100 text-slate-400'
                          : 'border-slate-200 bg-white text-slate-600 hover:text-[#DA291C] hover:border-red-300'
                      }`}
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Schedule & Slot Builder */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-black text-[#DA291C] uppercase tracking-wider">
              3. Fechas y Horarios (Slots)
            </h3>

            {/* Existing Slots */}
            <div className="space-y-2">
              {schedule.map(sch => (
                <div key={sch.date} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#DA291C]" />
                    <span>{formatDateLong(sch.date)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sch.slots.map(sl => (
                      <div
                        key={sl.time}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center gap-2 text-slate-700 shadow-xs"
                      >
                        <Clock className="w-3 h-3 text-[#DA291C]" />
                        <span className="font-bold text-slate-900">{sl.time}</span>
                        <span className="text-[11px] text-slate-400">Capacidad: {sl.capacity}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(sch.date, sl.time)}
                          className="text-slate-400 hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Slot Sub-form */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700">Añadir Fecha y Horario:</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={tempDate}
                    onChange={(e) => setTempDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Horario</label>
                  <input
                    type="text"
                    value={tempTime}
                    onChange={(e) => setTempTime(e.target.value)}
                    placeholder="ej. 10:00 AM"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Cupo Máximo</label>
                  <input
                    type="number"
                    min="1"
                    value={tempCapacity}
                    onChange={(e) => setTempCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="py-2 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-[#DA291C] border border-red-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir Horario</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. Notification Settings */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-black text-[#DA291C] uppercase tracking-wider">
              4. Configuración de Recordatorios Automáticos
            </h3>
            
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded border-slate-300 text-[#DA291C] focus:ring-0 cursor-pointer"
                />
                <Mail className="w-3.5 h-3.5 text-[#DA291C]" />
                <span>Enviar por Correo (Email)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendTeams}
                  onChange={(e) => setSendTeams(e.target.checked)}
                  className="rounded border-slate-300 text-[#DA291C] focus:ring-0 cursor-pointer"
                />
                <Bell className="w-3.5 h-3.5 text-cyan-600" />
                <span>Enviar por Microsoft Teams</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Plantilla del Mensaje de Recordatorio
              </label>
              <textarea
                rows={2}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Variables disponibles: <code>[EVENT_TITLE]</code>, <code>[INSTRUCTOR]</code>, <code>[SURVEY_LINK]</code>
              </p>
            </div>
          </div>

          {/* Submit Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-extrabold shadow-md shadow-red-500/25 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Capacitación'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
