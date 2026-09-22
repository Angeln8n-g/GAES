import React, { useState, useMemo } from 'react';
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
  UserCheck,
  Layers,
  ListOrdered,
  Globe,
  Building2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Check,
  RotateCcw,
  Info,
  Hourglass,
  Leaf
} from 'lucide-react';
import { TrainingEvent, Schedule, Slot, EventModality, EventStatus, Company, EvaluationType, UserAccount, EventModule } from '../../types';
import { 
  formatDateLong, 
  MONTH_NAMES_ES,
  addHoursToTime,
  calculateTimeDurationHours,
  formatDurationHuman
} from '../../utils/formatters';
import { AccessibleModal } from '../common/AccessibleModal';
import { 
  SUSTAINABILITY_PROGRAMS, 
  SESSION_TYPES, 
  TRAINING_TYPES, 
  TRAINING_FORMATS,
  EVENT_MODALITIES,
  DEFAULT_SUPPLIER_OPTIONS,
  getSubprogramsForProgram,
  getProgramLabel,
  isSustainabilityProgram
} from '../../constants/sustainabilityPrograms';

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

const TIME_PRESETS = [
  { label: '🌅 Mañana', start: '09:00 AM', end: '11:00 AM' },
  { label: '☀️ Mediodía', start: '11:00 AM', end: '01:00 PM' },
  { label: '🌤️ Tarde 1', start: '02:00 PM', end: '04:00 PM' },
  { label: '🌆 Tarde 2', start: '04:00 PM', end: '06:00 PM' },
  { label: '🏢 Jornada', start: '09:00 AM', end: '05:00 PM' },
];

const SUGGESTED_HOURS = [
  '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM',
  '07:00 PM'
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

  // Determinar alcance y empresa por defecto
  const isGlobalInitially = !initialEvent || initialEvent.companyId === 'all' || !initialEvent.companyId;
  const [companyScope, setCompanyScope] = useState<'all' | 'specific'>(
    !isSuperAdmin ? 'specific' : (isGlobalInitially ? 'all' : 'specific')
  );
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>(() => {
    if (initialEvent?.companyIds && initialEvent.companyIds.length > 0) {
      return initialEvent.companyIds;
    }
    if (initialEvent?.companyId && initialEvent.companyId !== 'all') {
      return [initialEvent.companyId];
    }
    if (!isSuperAdmin && currentUser?.companyId) {
      return [currentUser.companyId];
    }
    return companies.map(c => c.id);
  });

  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [category, setCategory] = useState(initialEvent?.category || 'Taller');
  const [instructor, setInstructor] = useState(initialEvent?.instructor || '');
  const [ojtEvaluatorId, setOjtEvaluatorId] = useState<string>(initialEvent?.ojtEvaluatorId || '');
  const [modality, setModality] = useState<EventModality>(initialEvent?.modality || 'Presencial');
  const [location, setLocation] = useState(initialEvent?.location || 'Sala de Juntas B');
  const [imageUrl, setImageUrl] = useState(initialEvent?.imageUrl || SAMPLE_IMAGES[0]);
  const [surveyUrl, setSurveyUrl] = useState(initialEvent?.surveyUrl || '');
  const [status, setStatus] = useState<EventStatus>(initialEvent?.status || 'active');

  // Clasificación Estratégica & Programa de Sustentabilidad
  const [sessionType, setSessionType] = useState<string>(initialEvent?.sessionType || 'Sincrónica');
  const [trainingType, setTrainingType] = useState<string>(initialEvent?.trainingType || 'Técnico');
  const [trainingFormat, setTrainingFormat] = useState<string>(initialEvent?.trainingFormat || initialEvent?.category || 'Taller');
  const [programCategory, setProgramCategory] = useState<string>(
    initialEvent?.programCategory || 'Capacitacion_seguridad_salud_en_el_trabajo_y_sustentabilidad'
  );
  const [subprogram, setSubprogram] = useState<string>(
    initialEvent?.subprogram || 'Sustentabilidad'
  );
  const [supplier, setSupplier] = useState<string>(initialEvent?.supplier || 'Claro');
  const [startDate, setStartDate] = useState<string>(
    initialEvent?.startDate || (initialEvent?.schedule?.[0]?.date || '')
  );
  const [endDate, setEndDate] = useState<string>(
    initialEvent?.endDate || (initialEvent?.schedule?.[initialEvent.schedule.length - 1]?.date || '')
  );

  const handleProgramCategoryChange = (newProgId: string) => {
    setProgramCategory(newProgId);
    const validSubs = getSubprogramsForProgram(newProgId);
    if (validSubs.length > 0 && !validSubs.includes(subprogram)) {
      setSubprogram(validSubs[0]);
    }
  };

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

  // Estructura de Módulos de la Capacitación
  const [enableModules, setEnableModules] = useState<boolean>(
    Boolean(initialEvent?.modules && initialEvent.modules.length > 0)
  );
  const [modules, setModules] = useState<EventModule[]>(
    initialEvent?.modules || []
  );

  // Notificaciones
  const [sendEmail, setSendEmail] = useState(initialEvent?.notificationSettings?.sendEmail ?? true);
  const [sendTeams, setSendTeams] = useState(initialEvent?.notificationSettings?.sendTeams ?? true);
  const [customMessage, setCustomMessage] = useState(
    initialEvent?.notificationSettings?.customMessage ||
    "Estimado colaborador, te recordamos tu participación en el evento '[EVENT_TITLE]' con [INSTRUCTOR]. ¡Te esperamos!"
  );

  // Horarios
  const [schedule, setSchedule] = useState<Schedule[]>(() => {
    if (initialEvent?.schedule && initialEvent.schedule.length > 0) {
      return initialEvent.schedule;
    }
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return [
      {
        date: `${y}-${m}-${d}`,
        slots: [
          {
            time: '09:00 AM',
            endTime: '11:00 AM',
            checkinCode: `${Math.floor(1000 + Math.random() * 9000)}`,
            checkoutCode: `${Math.floor(1000 + Math.random() * 9000)}`,
            capacity: 25,
            registered: 0,
            attendees: [],
            attendedList: []
          }
        ]
      }
    ];
  });

  // Fecha visible en el widget de calendario (mes mostrado)
  const [currentCalMonth, setCurrentCalMonth] = useState<Date>(() => {
    if (initialEvent?.schedule && initialEvent.schedule.length > 0 && initialEvent.schedule[0].date) {
      const parts = initialEvent.schedule[0].date.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return new Date(parts[0], parts[1] - 1, 1);
      }
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Fechas seleccionadas activamente para aplicar horarios
  const [selectedDates, setSelectedDates] = useState<string[]>(() => {
    if (initialEvent?.schedule && initialEvent.schedule.length > 0) {
      return [initialEvent.schedule[0].date];
    }
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return [`${y}-${m}-${d}`];
  });

  // Duración total oficial de la capacitación en horas
  const [totalHours, setTotalHours] = useState<number>(initialEvent?.totalHours || 0);

  // Modo de selección: false = Fecha única, true = Selección múltiple (lotes)
  const [batchMode, setBatchMode] = useState(false);

  // Parámetros de horario temporal para añadir
  const [tempEndDate, setTempEndDate] = useState('');
  const [sessionDuration, setSessionDuration] = useState<number>(2); // Horas por turno
  const [tempTime, setTempTime] = useState('09:00 AM');
  const [tempEndTime, setTempEndTime] = useState('11:00 AM');
  const [tempCapacity, setTempCapacity] = useState(25);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Horas totales acumuladas en base a los turnos programados en el calendario
  const scheduledTotalHours = useMemo(() => {
    return schedule.reduce((sum, sch) => {
      return sum + sch.slots.reduce((slSum, sl) => {
        return slSum + (calculateTimeDurationHours(sl.time, sl.endTime) || 2);
      }, 0);
    }, 0);
  }, [schedule]);

  // Manejadores dinámicos de tiempo
  const handleStartTimeChange = (newStartTime: string) => {
    setTempTime(newStartTime);
    if (sessionDuration > 0) {
      setTempEndTime(addHoursToTime(newStartTime, sessionDuration));
    }
  };

  const handleSessionDurationChange = (hours: number) => {
    setSessionDuration(hours);
    if (tempTime) {
      setTempEndTime(addHoursToTime(tempTime, hours));
    }
  };

  const handleEndTimeChange = (newEndTime: string) => {
    setTempEndTime(newEndTime);
    const diff = calculateTimeDurationHours(tempTime, newEndTime);
    if (diff > 0) {
      setSessionDuration(diff);
    }
  };

  // Navegación de calendario
  const calYear = currentCalMonth.getFullYear();
  const calMonth = currentCalMonth.getMonth();
  const monthName = MONTH_NAMES_ES[calMonth] || currentCalMonth.toLocaleString('es-ES', { month: 'long' });

  // Primer día de la semana (Lunes=0, ..., Domingo=6)
  const firstDayOfWeek = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

  const prevMonth = () => {
    setCurrentCalMonth(new Date(calYear, calMonth - 1, 1));
  };
  const nextMonth = () => {
    setCurrentCalMonth(new Date(calYear, calMonth + 1, 1));
  };
  const goToToday = () => {
    const today = new Date();
    setCurrentCalMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setSelectedDates([todayStr]);
  };

  const toggleDate = (dateStr: string) => {
    if (batchMode) {
      setSelectedDates(prev =>
        prev.includes(dateStr)
          ? prev.filter(d => d !== dateStr)
          : [...prev, dateStr]
      );
    } else {
      setSelectedDates([dateStr]);
    }
  };

  const selectAllWeekdays = () => {
    const dates: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(calYear, calMonth, day);
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        dates.push(`${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      }
    }
    setSelectedDates(dates);
    setBatchMode(true);
  };

  const calculateSlotDuration = (start?: string, end?: string): string | null => {
    if (!start || !end) return null;
    const parseTime = (t: string) => {
      const match = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const p = match[3].toUpperCase();
      if (p === 'PM' && h < 12) h += 12;
      if (p === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };
    const m1 = parseTime(start);
    const m2 = parseTime(end);
    if (m1 === null || m2 === null || m2 <= m1) return null;
    const diff = m2 - m1;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h`;
    return `${mins}m`;
  };

  const handleAddSlot = () => {
    if (selectedDates.length === 0) {
      setError('Por favor selecciona al menos un día en el calendario para programar el horario.');
      return;
    }
    if (!tempTime.trim() || tempCapacity <= 0) {
      setError('Ingresa una hora de inicio y un cupo válido.');
      return;
    }

    setSchedule(prev => {
      let updated = [...prev];

      for (const dStr of selectedDates) {
        const checkinCode = `${Math.floor(1000 + Math.random() * 9000)}`;
        const checkoutCode = `${Math.floor(1000 + Math.random() * 9000)}`;

        const existingDateIdx = updated.findIndex(s => s.date === dStr);
        if (existingDateIdx > -1) {
          const dateObj = { ...updated[existingDateIdx] };
          if (tempEndDate) dateObj.endDate = tempEndDate;
          if (!dateObj.slots.some(sl => sl.time === tempTime)) {
            dateObj.slots = [
              ...dateObj.slots,
              {
                time: tempTime.trim(),
                endTime: tempEndTime.trim() || undefined,
                checkinCode,
                checkoutCode,
                capacity: tempCapacity,
                registered: 0,
                attendees: [],
                attendedList: [],
                checkInList: [],
                checkOutList: [],
                completedAttendanceList: []
              }
            ];
            updated[existingDateIdx] = dateObj;
          }
        } else {
          updated.push({
            date: dStr,
            endDate: tempEndDate.trim() || undefined,
            slots: [
              {
                time: tempTime.trim(),
                endTime: tempEndTime.trim() || undefined,
                checkinCode,
                checkoutCode,
                capacity: tempCapacity,
                registered: 0,
                attendees: [],
                attendedList: [],
                checkInList: [],
                checkOutList: [],
                completedAttendanceList: []
              }
            ]
          });
        }
      }

      return updated.sort((a, b) => a.date.localeCompare(b.date));
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

  const handleRemoveDate = (dateStr: string) => {
    setSchedule(prev => prev.filter(s => s.date !== dateStr));
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

  const handleAddModule = (customTitle?: string) => {
    const nextIdx = modules.length + 1;
    const newMod: EventModule = {
      id: `mod_${Date.now()}_${nextIdx}`,
      title: customTitle || `Módulo ${nextIdx}: `,
      description: '',
      passingScore: passingScore || 70,
      maxScore: 100,
      orderIndex: nextIdx
    };
    setModules(prev => [...prev, newMod]);
    setEnableModules(true);
  };

  const handleApplyModulePreset = (count: number) => {
    const newMods: EventModule[] = [];
    for (let i = 1; i <= count; i++) {
      newMods.push({
        id: `mod_${Date.now()}_${i}`,
        title: `Módulo ${i}: `,
        description: '',
        passingScore: passingScore || 70,
        maxScore: 100,
        orderIndex: i
      });
    }
    setModules(newMods);
    setEnableModules(true);
  };

  const handleUpdateModule = (id: string, field: keyof EventModule, val: any) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));
  };

  const handleRemoveModule = (id: string) => {
    setModules(prev => {
      const filtered = prev.filter(m => m.id !== id);
      return filtered.map((m, idx) => ({ ...m, orderIndex: idx + 1 }));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !instructor.trim()) {
      setError('El título y el instructor son campos obligatorios.');
      return;
    }

    if (companyScope === 'specific' && selectedCompanyIds.length === 0) {
      setError('Debes seleccionar al menos una empresa específica o elegir "Todas las Empresas".');
      return;
    }

    if (schedule.length === 0 || schedule.every(s => s.slots.length === 0)) {
      setError('Debes configurar al menos una fecha y horario para el evento.');
      return;
    }

    const selectedOjtUser = users.find(u => u.id === ojtEvaluatorId);

    const finalCompanyId = companyScope === 'all' ? 'all' : (selectedCompanyIds[0] || 'all');
    const finalCompanyIds = companyScope === 'all' ? companies.map(c => c.id) : selectedCompanyIds;

    const eventPayload: TrainingEvent = {
      id: initialEvent?.id || `evt_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category,
      companyId: finalCompanyId,
      companyIds: finalCompanyIds,
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
      modules: enableModules ? modules.filter(m => m.title.trim().length > 0) : [],
      notificationSettings: {
        sendEmail,
        sendTeams,
        customMessage
      },
      notificationHistory: initialEvent?.notificationHistory || [],
      schedule,
      startDate: startDate || schedule[0]?.date || undefined,
      endDate: endDate || schedule[schedule.length - 1]?.endDate || schedule[schedule.length - 1]?.date || undefined,
      startTime: schedule[0]?.slots[0]?.time || undefined,
      endTime: schedule[0]?.slots[0]?.endTime || undefined,
      totalHours: totalHours > 0 ? totalHours : Math.round(scheduledTotalHours * 10) / 10,
      sessionType,
      trainingType,
      trainingFormat,
      programCategory,
      subprogram,
      supplier: supplier.trim() || 'Claro',
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
    <AccessibleModal
      onClose={onClose}
      ariaLabel={isEditing ? 'Editar Capacitación' : 'Crear Nueva Capacitación'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        
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
            aria-label="Cerrar modal de evento"
            className="p-2 sm:p-1.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-target-44 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer inline-flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {error && (
            <div role="alert" aria-live="assertive" className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
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
              <label htmlFor="event-form-title" className="block text-xs font-bold text-slate-700 mb-1">Título de la Capacitación *</label>
              <input
                id="event-form-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ej. Taller de Liderazgo y Trabajo en Equipo"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                required
              />
            </div>

            <div>
              <label htmlFor="event-form-description" className="block text-xs font-bold text-slate-700 mb-1">Descripción y Objetivos</label>
              <textarea
                id="event-form-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalla los temas a cubrir, requisitos previos y lo que aprenderán los colaboradores..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
              />
            </div>

            {/* Empresa / Alcance de la Capacitación */}
            {companies.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Alcance y Visibilidad por Empresa
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Determina si la capacitación estará abierta para toda la organización o solo empresas específicas.
                    </p>
                  </div>
                  {companyScope === 'all' ? (
                    <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-xs">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" />
                      Visible para Todas las Empresas
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-xs">
                      <Building2 className="w-3.5 h-3.5 text-amber-600" />
                      {selectedCompanyIds.length} {selectedCompanyIds.length === 1 ? 'empresa seleccionada' : 'empresas seleccionadas'}
                    </span>
                  )}
                </div>

                {isSuperAdmin ? (
                  <div className="space-y-3">
                    {/* Selector Segmentado */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-200/80 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setCompanyScope('all')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          companyScope === 'all'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Globe className={`w-4 h-4 ${companyScope === 'all' ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>Todas las Empresas (Global)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompanyScope('specific')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          companyScope === 'specific'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Building2 className={`w-4 h-4 ${companyScope === 'specific' ? 'text-[#DA291C]' : 'text-slate-400'}`} />
                        <span>Empresas Específicas</span>
                      </button>
                    </div>

                    {/* Desglose de selección de empresas */}
                    {companyScope === 'specific' && (
                      <div className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                          <span>Marca las empresas autorizadas para ver e inscribirse:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedCompanyIds(companies.map(c => c.id))}
                              className="text-[#DA291C] hover:underline font-bold cursor-pointer"
                            >
                              Seleccionar todas
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => setSelectedCompanyIds([])}
                              className="text-slate-500 hover:underline cursor-pointer"
                            >
                              Desmarcar todas
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {companies.map(comp => {
                            const isChecked = selectedCompanyIds.includes(comp.id);
                            return (
                              <label
                                key={comp.id}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                                  isChecked
                                    ? 'bg-red-50/80 border-red-300 text-slate-900 font-bold shadow-xs'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedCompanyIds(prev => [...prev, comp.id]);
                                    } else {
                                      setSelectedCompanyIds(prev => prev.filter(id => id !== comp.id));
                                    }
                                  }}
                                  className="rounded border-slate-300 text-[#DA291C] focus:ring-0 cursor-pointer"
                                />
                                <Building2 className={`w-3.5 h-3.5 shrink-0 ${isChecked ? 'text-[#DA291C]' : 'text-slate-400'}`} />
                                <span className="truncate">{comp.name}</span>
                              </label>
                            );
                          })}
                        </div>
                        {selectedCompanyIds.length === 0 && (
                          <p className="text-[11px] text-rose-600 font-semibold mt-1">
                            ⚠️ Debes seleccionar al menos una empresa específica para continuar.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200">
                    <Building2 className="w-4 h-4 text-[#DA291C]" />
                    <span>{companies.find(c => c.id === currentUser?.companyId)?.name || 'Tu Empresa asignada'}</span>
                  </div>
                )}
              </div>
            )}

            {/* Alineación al Programa de Sustentabilidad & Clasificación Formativa */}
            <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">
                      Programa de Sustentabilidad & Clasificación Formativa
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Alineación con los estándares ESG, taxonomía corporativa y catálogo de programas.
                    </p>
                  </div>
                </div>

                {isSustainabilityProgram(programCategory, subprogram) && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                    <Leaf className="w-3 h-3 text-emerald-600" />
                    <span>Alineado a Sustentabilidad</span>
                  </span>
                )}
              </div>

              {/* Selectores Jerárquicos: Programa y Subprograma */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label htmlFor="event-form-program-category" className="block text-xs font-bold text-slate-700 mb-1">
                    Programa Corporativo *
                  </label>
                  <select
                    id="event-form-program-category"
                    value={programCategory}
                    onChange={(e) => handleProgramCategoryChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-600"
                    required
                  >
                    {SUSTAINABILITY_PROGRAMS.map(prog => (
                      <option key={prog.id} value={prog.id}>
                        {prog.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="event-form-subprogram" className="block text-xs font-bold text-slate-700 mb-1">
                    Subprograma (Dependiente) *
                  </label>
                  <select
                    id="event-form-subprogram"
                    value={subprogram}
                    onChange={(e) => setSubprogram(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-600"
                    required
                  >
                    {getSubprogramsForProgram(programCategory).map(sub => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fila 2: Tipo de Sesión, Tipo de Entrenamiento, Formato de Capacitación */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label htmlFor="event-form-session-type" className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Sesión *
                  </label>
                  <select
                    id="event-form-session-type"
                    value={sessionType}
                    onChange={(e) => setSessionType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    {SESSION_TYPES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="event-form-training-type" className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Entrenamiento *
                  </label>
                  <select
                    id="event-form-training-type"
                    value={trainingType}
                    onChange={(e) => setTrainingType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    {TRAINING_TYPES.map(tt => (
                      <option key={tt} value={tt}>{tt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="event-form-training-format" className="block text-xs font-bold text-slate-700 mb-1">
                    Formato de Capacitación *
                  </label>
                  <select
                    id="event-form-training-format"
                    value={trainingFormat}
                    onChange={(e) => {
                      setTrainingFormat(e.target.value);
                      setCategory(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    {TRAINING_FORMATS.map(tf => (
                      <option key={tf} value={tf}>{tf}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fila 3: Modalidad, Suplidor, Fechas Desde / Hasta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label htmlFor="event-form-modality" className="block text-xs font-bold text-slate-700 mb-1">Modalidad *</label>
                  <select
                    id="event-form-modality"
                    value={modality === 'Híbrida' ? 'Mixta' : modality}
                    onChange={(e) => setModality(e.target.value as EventModality)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Virtual">Virtual</option>
                    <option value="Presencial">Presencial</option>
                    <option value="Mixta">Mixta</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="event-form-supplier" className="block text-xs font-bold text-slate-700 mb-1">Suplidor / Proveedor *</label>
                  <input
                    id="event-form-supplier"
                    type="text"
                    list="supplier-options-list"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="ej. Claro"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                    required
                  />
                  <datalist id="supplier-options-list">
                    {DEFAULT_SUPPLIER_OPTIONS.map(sup => (
                      <option key={sup} value={sup} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label htmlFor="event-form-start-date" className="block text-xs font-bold text-slate-700 mb-1">Fecha Desde</label>
                  <input
                    id="event-form-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="event-form-end-date" className="block text-xs font-bold text-slate-700 mb-1">Fecha Hasta</label>
                  <input
                    id="event-form-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Instructor / Facilitador */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="event-form-instructor" className="block text-xs font-bold text-slate-700 mb-1">Instructor / Facilitador Principal *</label>
                <input
                  id="event-form-instructor"
                  type="text"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  placeholder="ej. Ing. Juan Pérez / Especialista Institucional"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                  required
                />
              </div>
            </div>

            {/* Asignación de Tutor / Evaluador */}
            <div className="bg-indigo-50/50 border border-indigo-200/80 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="event-form-ojt-evaluator" className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-700" />
                  <span>Tutor / Evaluador Responsable (Acompañamiento en Campo)</span>
                </label>
                <span className="text-[10px] text-indigo-700 bg-indigo-100/70 font-bold px-2 py-0.5 rounded-full border border-indigo-300">
                  Bitácoras & Calibración
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Selecciona al evaluador de campo encargado de auditar el puesto de trabajo, First-Time Fix y mesas de calibración para esta capacitación.
              </p>
              <select
                id="event-form-ojt-evaluator"
                value={ojtEvaluatorId}
                onChange={(e) => setOjtEvaluatorId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#DA291C]"
              >
                <option value="">— Sin tutor asignado (Formación general o solo docente de aula) —</option>
                {users.filter(u => u.role === 'Evaluador / Tutor' || u.role === 'Evaluador / Tutor OJT').length > 0 && (
                  <optgroup label="⭐ Evaluadores & Tutores Calificados">
                    {users.filter(u => u.role === 'Evaluador / Tutor' || u.role === 'Evaluador / Tutor OJT').map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.department || 'Operaciones'} • {u.email})
                      </option>
                    ))}
                  </optgroup>
                )}
                {users.filter(u => u.role !== 'Evaluador / Tutor' && u.role !== 'Evaluador / Tutor OJT' && u.role !== 'Colaborador (User)').length > 0 && (
                  <optgroup label="👥 Otros Supervisores / Evaluadores Disponibles">
                    {users.filter(u => u.role !== 'Evaluador / Tutor' && u.role !== 'Evaluador / Tutor OJT' && u.role !== 'Colaborador (User)').map(u => (
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
                <label htmlFor="event-form-location" className="block text-xs font-bold text-slate-700 mb-1">Ubicación o Enlace</label>
                <input
                  id="event-form-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={modality === 'Virtual' ? 'Enlace de Microsoft Teams' : 'Sala de Juntas B (Piso 3)'}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                />
              </div>

              <div>
                <label htmlFor="event-form-survey-url" className="block text-xs font-bold text-slate-700 mb-1">
                  Enlace de Encuesta / Evaluación (Forms)
                </label>
                <input
                  id="event-form-survey-url"
                  type="url"
                  value={surveyUrl}
                  onChange={(e) => setSurveyUrl(e.target.value)}
                  placeholder="https://forms.office.com/r/ejemplo-evaluacion"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="event-form-image-url" className="block text-xs font-bold text-slate-700 mb-1">URL de Imagen de Portada</label>
              <input
                id="event-form-image-url"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C] mb-2"
              />
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] text-slate-500 font-semibold whitespace-nowrap">Presets:</span>
                {SAMPLE_IMAGES.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Preset ${i}`}
                    loading="lazy"
                    decoding="async"
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
              <span className="text-[11px] text-slate-500 font-medium">
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
                    <span className="text-[11px] text-slate-500 italic py-1 font-medium">
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
                  <span className="text-[10px] text-slate-500 font-bold">Sugerencias rápidas:</span>
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

          {/* 3. Módulos de la Capacitación (Evaluación Continua) */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-[#DA291C] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#DA291C]" />
                  3. Estructura de Módulos & Calificación Continua
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Divide el evento en etapas o módulos para que el tutor asiente calificaciones progresivas.
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={enableModules}
                  onChange={(e) => {
                    setEnableModules(e.target.checked);
                    if (e.target.checked && modules.length === 0) {
                      handleApplyModulePreset(2);
                    }
                  }}
                  className="rounded border-slate-300 text-[#DA291C] focus:ring-0 cursor-pointer"
                />
                <span>Habilitar Módulos</span>
              </label>
            </div>

            {enableModules && (
              <div className="space-y-3.5 bg-slate-50/70 border border-slate-200 p-4 rounded-2xl">
                {/* Information Callout */}
                <div className="p-3 bg-red-50/60 rounded-xl border border-red-200/80 text-[11px] text-slate-700 flex items-start gap-2">
                  <Target className="w-4 h-4 text-[#DA291C] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#DA291C]">Evaluación Modular: </span>
                    El evaluador podrá asentar notas módulo a módulo según avancen los colaboradores. Cada módulo tiene peso equitativo y la nota final del curso será el promedio de los módulos completados.
                  </div>
                </div>

                {/* Preset Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-bold">Plantillas rápidas:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyModulePreset(2)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-red-300 text-slate-700 hover:text-[#DA291C] text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      2 Módulos
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyModulePreset(3)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-red-300 text-slate-700 hover:text-[#DA291C] text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      3 Módulos
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyModulePreset(4)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-red-300 text-slate-700 hover:text-[#DA291C] text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      4 Módulos
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddModule()}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 text-[#DA291C] border border-red-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Módulo</span>
                  </button>
                </div>

                {/* Modules Cards List */}
                {modules.length > 0 ? (
                  <div className="space-y-3">
                    {modules.map((mod, idx) => (
                      <div
                        key={mod.id}
                        className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs space-y-3 relative hover:border-slate-300 transition-colors"
                      >
                        {/* Module Header Bar */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-lg bg-[#DA291C] text-white text-[10px] font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              Módulo {idx + 1}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveModule(mod.id)}
                            aria-label={`Eliminar módulo ${idx + 1}`}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer rounded-lg hover:bg-slate-50"
                            title="Eliminar módulo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Title and Scoring Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          <div className="sm:col-span-6">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Nombre del Módulo *
                            </label>
                            <input
                              type="text"
                              value={mod.title}
                              onChange={(e) => handleUpdateModule(mod.id, 'title', e.target.value)}
                              placeholder={`ej. Módulo ${idx + 1}: Fundamentos y Procedimientos`}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-[#DA291C]"
                              required
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Nota Mínima (pts) *
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={mod.maxScore || 100}
                              value={mod.passingScore ?? 70}
                              onChange={(e) => handleUpdateModule(mod.id, 'passingScore', Number(e.target.value))}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold text-center focus:outline-none focus:border-[#DA291C]"
                              required
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Puntaje Máximo *
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={1000}
                              value={mod.maxScore ?? 100}
                              onChange={(e) => handleUpdateModule(mod.id, 'maxScore', Number(e.target.value))}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold text-center focus:outline-none focus:border-[#DA291C]"
                              required
                            />
                          </div>
                        </div>

                        {/* Optional Description */}
                        <div>
                          <input
                            type="text"
                            value={mod.description || ''}
                            onChange={(e) => handleUpdateModule(mod.id, 'description', e.target.value)}
                            placeholder="Descripción u objetivos del módulo (opcional)..."
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs bg-white rounded-2xl border border-dashed border-slate-300 font-medium">
                    No has agregado módulos aún. Haz clic en "Agregar Módulo" o selecciona una plantilla rápida.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Calendario y Programación Dinámica de Horarios (Slots) */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-black text-[#DA291C] uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-[#DA291C]" />
                  <span>4. Calendario y Horarios Dinámicos (Slots)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Selecciona días en el calendario interactivo, define horarios con presets rápidos y administra los turnos de asistencia.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                  {schedule.reduce((acc, s) => acc + s.slots.length, 0)} turnos en {schedule.length} {schedule.length === 1 ? 'fecha' : 'fechas'}
                </span>
              </div>
            </div>

            {/* Duración Oficial del Programa y Métricas de Coherencia */}
            <div className="bg-gradient-to-r from-red-50/70 via-slate-50 to-white border border-red-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#DA291C] text-white flex items-center justify-center shadow-xs">
                    <Hourglass className="w-4 h-4" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-900">
                      Duración Oficial del Programa
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Horas lectivas totales de la capacitación. Se mostrará a los colaboradores al inscribirse y en el terminal Kiosco.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTotalHours(Math.round(scheduledTotalHours * 10) / 10)}
                  className="text-[11px] font-bold text-[#DA291C] hover:underline flex items-center gap-1 cursor-pointer bg-red-50 px-2.5 py-1 rounded-lg border border-red-200"
                  title="Calcular duración sumando los turnos agendados en el calendario"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Autocalcular de turnos ({Math.round(scheduledTotalHours * 10) / 10} hrs)</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={totalHours || ''}
                    onChange={(e) => setTotalHours(Math.max(0, Number(e.target.value)))}
                    placeholder={`${Math.round(scheduledTotalHours * 10) / 10 || 8}`}
                    className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-[#DA291C] text-center shadow-2xs"
                  />
                  <span className="text-xs font-bold text-slate-700">Horas Lectivas</span>
                </div>

                {/* Presets rápidos de duración total */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-slate-500 font-bold mr-1">Presets comunes:</span>
                  {[4, 8, 16, 20, 40].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setTotalHours(h)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        totalHours === h
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {h} hrs
                    </button>
                  ))}
                </div>
              </div>

              {/* Barra de coherencia entre horas oficiales y turnos programados */}
              <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
                <div className="flex items-center gap-3">
                  <span>📅 <strong>{schedule.length}</strong> {schedule.length === 1 ? 'día programado' : 'días programados'}</span>
                  <span>•</span>
                  <span>⏱️ <strong>{Math.round(scheduledTotalHours * 10) / 10} hrs</strong> acumuladas en turnos</span>
                </div>

                {totalHours > 0 ? (
                  scheduledTotalHours >= totalHours ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Turnos cubren las {totalHours} hrs del programa
                    </span>
                  ) : (
                    <span className="text-amber-700 font-bold flex items-center gap-1 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Faltan {Math.round((totalHours - scheduledTotalHours) * 10) / 10} hrs por agendar en el calendario
                    </span>
                  )
                ) : (
                  <span className="text-slate-500 italic">
                    (Se tomará la suma de horarios: {Math.round(scheduledTotalHours * 10) / 10} hrs)
                  </span>
                )}
              </div>
            </div>

            {/* Widget de Calendario Mensual Interactivo */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              
              {/* Calendario Header */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={prevMonth}
                    aria-label="Mes Anterior"
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                    title="Mes Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-black text-slate-900 capitalize min-w-[140px] text-center">
                    {monthName} {calYear}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    aria-label="Mes Siguiente"
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                    title="Mes Siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={goToToday}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                  >
                    Hoy
                  </button>
                </div>

                {/* Controles de Modo del Calendario */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBatchMode(false);
                      if (selectedDates.length > 1) {
                        setSelectedDates([selectedDates[0]]);
                      }
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      !batchMode 
                        ? 'bg-[#DA291C] text-white shadow-xs' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Fecha Única
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchMode(true)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      batchMode 
                        ? 'bg-[#DA291C] text-white shadow-xs' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Selección Múltiple ({selectedDates.length})
                  </button>
                  {batchMode && (
                    <button
                      type="button"
                      onClick={selectAllWeekdays}
                      className="px-2 py-1 text-[10px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer"
                      title="Seleccionar de Lunes a Viernes de este mes"
                    >
                      + Lun a Vie
                    </button>
                  )}
                  {selectedDates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedDates([])}
                      className="px-2 py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Días de la semana */}
              <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 text-center py-2 text-[11px] font-bold text-slate-500">
                <span>Lun</span>
                <span>Mar</span>
                <span>Mié</span>
                <span>Jue</span>
                <span>Vie</span>
                <span className="text-amber-600">Sáb</span>
                <span className="text-rose-600">Dom</span>
              </div>

              {/* Celdas del mes */}
              <div className="grid grid-cols-7 gap-1 p-2 bg-slate-50/30">
                {/* Días de mes anterior */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => {
                  const dayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
                  return (
                    <div
                      key={`prev-${i}`}
                      className="h-12 sm:h-14 p-1 rounded-xl bg-slate-100/50 text-slate-300 text-xs flex flex-col items-center justify-start select-none opacity-40"
                    >
                      <span>{dayNum}</span>
                    </div>
                  );
                })}

                {/* Días del mes actual */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isSelected = selectedDates.includes(dateStr);
                  
                  const today = new Date();
                  const isToday = 
                    today.getFullYear() === calYear && 
                    today.getMonth() === calMonth && 
                    today.getDate() === dayNum;

                  const daySchedule = schedule.find(s => s.date === dateStr);
                  const slotCount = daySchedule ? daySchedule.slots.length : 0;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => toggleDate(dateStr)}
                      className={`h-12 sm:h-14 p-1 rounded-xl text-xs transition-all flex flex-col items-center justify-between relative cursor-pointer border ${
                        isSelected
                          ? 'bg-[#DA291C] text-white border-[#DA291C] font-bold shadow-xs'
                          : isToday
                          ? 'bg-amber-50/80 border-amber-300 text-slate-900 font-bold hover:border-amber-400'
                          : slotCount > 0
                          ? 'bg-white border-red-200 text-slate-900 font-semibold hover:border-red-400'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full px-1">
                        <span className={`text-[11px] ${isSelected ? 'text-white' : ''}`}>
                          {dayNum}
                        </span>
                        {isToday && !isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-amber-200" title="Hoy" />
                        )}
                      </div>

                      {/* Badge con cantidad de turnos en esa fecha */}
                      {slotCount > 0 && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold tracking-tight truncate max-w-full ${
                            isSelected
                              ? 'bg-white text-[#DA291C]'
                              : 'bg-red-50 text-[#DA291C] border border-red-200'
                          }`}
                        >
                          {slotCount} {slotCount === 1 ? 'turno' : 'turnos'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Pie informativo del calendario */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 px-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#DA291C]" />
                    <span>Seleccionado</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>Hoy</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-md bg-red-100 border border-red-300" />
                    <span>Con turnos agendados</span>
                  </div>
                </div>
                <div>
                  {selectedDates.length === 0 ? (
                    <span className="text-rose-600 font-semibold">⚠️ Haz clic en un día del calendario para seleccionarlo</span>
                  ) : (
                    <span className="font-semibold text-slate-700">
                      📅 {selectedDates.length === 1 ? formatDateLong(selectedDates[0]) : `${selectedDates.length} fechas marcadas`}
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Sub-formulario Dinámico de Horario */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#DA291C]" />
                  <span>Programar Turno en {selectedDates.length === 0 ? 'fecha seleccionada' : selectedDates.length === 1 ? selectedDates[0] : `${selectedDates.length} Fechas`}</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  Generación automática de códigos PIN de 4 dígitos para Check-in y Check-out
                </span>
              </div>

              {/* Presets Rápidos de Horarios */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  ⚡ Presets Rápidos de Horario (Haz clic para autocompletar):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TIME_PRESETS.map(preset => {
                    const isActive = tempTime === preset.start && tempEndTime === preset.end;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setTempTime(preset.start);
                          setTempEndTime(preset.end);
                          const diff = calculateTimeDurationHours(preset.start, preset.end);
                          if (diff > 0) setSessionDuration(diff);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#DA291C] text-white border-[#DA291C] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span>{preset.label}</span>
                        <span className="text-[10px] opacity-75 font-normal ml-1">({preset.start} - {preset.end})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector Dinámico de Duración de Sesión */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Hourglass className="w-3.5 h-3.5 text-[#DA291C]" />
                    <span>Duración de la Sesión (Calcula automáticamente la Hora Fin):</span>
                  </label>
                  <span className="text-[11px] font-black text-[#DA291C] bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                    {sessionDuration} hr{sessionDuration > 1 ? 's' : ''} / sesión
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[1, 1.5, 2, 2.5, 3, 4, 8].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleSessionDurationChange(d)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        sessionDuration === d
                          ? 'bg-[#DA291C] text-white border-[#DA291C] shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {d} {d === 1 ? 'hora' : 'horas'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selectores de Hora y Cupo */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600">Hora Inicio *</label>
                    <span className="text-[10px] text-slate-500 font-medium">ej. 09:00 AM</span>
                  </div>
                  <input
                    type="text"
                    list="hours-list"
                    value={tempTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    placeholder="ej. 09:00 AM"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#DA291C]"
                  />
                  <datalist id="hours-list">
                    {SUGGESTED_HOURS.map(h => (
                      <option key={h} value={h} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600">Hora Fin (Calculada) *</label>
                    <span className="text-[10px] text-emerald-600 font-semibold">+{sessionDuration}h</span>
                  </div>
                  <input
                    type="text"
                    list="hours-list-end"
                    value={tempEndTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    placeholder="ej. 11:00 AM"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#DA291C]"
                  />
                  <datalist id="hours-list-end">
                    {SUGGESTED_HOURS.map(h => (
                      <option key={`end-${h}`} value={h} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600">Cupo Máximo</label>
                    <div className="flex gap-1">
                      {[15, 25, 40, 60].map(cap => (
                        <button
                          key={cap}
                          type="button"
                          onClick={() => setTempCapacity(cap)}
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold transition-colors cursor-pointer ${
                            tempCapacity === cap
                              ? 'bg-slate-800 text-white'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {cap}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={tempCapacity}
                    onChange={(e) => setTempCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-[#DA291C]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddSlot}
                  disabled={selectedDates.length === 0}
                  className="py-2.5 px-4 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {selectedDates.length <= 1 
                      ? 'Programar Horario' 
                      : `Programar en ${selectedDates.length} Días`}
                  </span>
                </button>
              </div>
            </div>

            {/* Lista de Turnos Agendados */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Turnos y Fechas Programadas ({schedule.length} fechas / {schedule.reduce((acc, s) => acc + s.slots.length, 0)} turnos)</span>
                </span>
                {schedule.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSchedule([])}
                    className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                  >
                    Vaciar todos los horarios
                  </button>
                )}
              </div>

              {schedule.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  No hay fechas u horarios programados. Selecciona días en el calendario superior y añade turnos.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {schedule.map(sch => {
                    const isDateActive = selectedDates.includes(sch.date);
                    return (
                      <div
                        key={sch.date}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isDateActive
                            ? 'bg-red-50/50 border-red-200 ring-1 ring-red-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <CalendarIcon className="w-3.5 h-3.5 text-[#DA291C]" />
                            <span>{formatDateLong(sch.date)}</span>
                            {sch.endDate && sch.endDate !== sch.date && (
                              <span className="text-[10px] text-slate-500 font-normal">
                                (hasta {formatDateLong(sch.endDate)})
                              </span>
                            )}
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                              {sch.slots.length} {sch.slots.length === 1 ? 'turno' : 'turnos'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setBatchMode(false);
                                setSelectedDates([sch.date]);
                              }}
                              className="text-[11px] text-[#DA291C] hover:underline font-semibold cursor-pointer"
                            >
                              Seleccionar día
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDate(sch.date)}
                              aria-label={`Eliminar fecha completa ${sch.date}`}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                              title="Eliminar esta fecha completa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {sch.slots.map(sl => {
                            const duration = calculateSlotDuration(sl.time, sl.endTime);
                            return (
                              <div
                                key={sl.time}
                                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between gap-2 text-slate-700 shadow-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                    <Clock className="w-3.5 h-3.5 text-[#DA291C]" />
                                    <span>{sl.time}{sl.endTime ? ` - ${sl.endTime}` : ''}</span>
                                    {duration && (
                                      <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                        {duration}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                    <span className="font-semibold text-slate-700">Cap: {sl.capacity}</span>
                                    {(sl.checkinCode || sl.checkoutCode) && (
                                      <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                                        In: {sl.checkinCode} • Out: {sl.checkoutCode}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveSlot(sch.date, sl.time)}
                                  aria-label={`Eliminar turno ${sl.time} del ${sch.date}`}
                                  className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer rounded-lg hover:bg-slate-100"
                                  title="Eliminar este turno"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 5. Notification Settings */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-black text-[#DA291C] uppercase tracking-wider">
              5. Configuración de Recordatorios Automáticos
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
              <p className="text-[10px] text-slate-500 mt-1">
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
    </AccessibleModal>
  );
};
