import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookOpen, 
  Clock, 
  MapPin, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  RotateCw,
  Sparkles
} from 'lucide-react';
import { TechnicalAcademyCourse, Company, TrainingEvent } from '../../types';
import { apiService } from '../../services/api';
import { AccessibleModal } from '../common/AccessibleModal';

interface TechnicalCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseToEdit?: TechnicalAcademyCourse | null;
  companies?: Company[];
  events?: TrainingEvent[];
  initialEvent?: TrainingEvent | null;
  isAdminOrSuper?: boolean;
  onSuccess: () => void;
}

const TECHNICAL_CATEGORIES = [
  'Planta Externa',
  'Fibra Óptica & FTTx',
  'Radiobases & Microondas (Móvil)',
  'Red HFC & Coaxial',
  'Redes IP, Routing & Switching',
  'Datacenter & Energía',
  'Seguridad Operativa & Altura',
  'Servicio al Cliente & Instalaciones'
];

export const TechnicalCourseModal: React.FC<TechnicalCourseModalProps> = ({
  isOpen,
  onClose,
  courseToEdit = null,
  companies = [],
  events = [],
  initialEvent = null,
  isAdminOrSuper = false,
  onSuccess
}) => {
  if (!isOpen || !isAdminOrSuper) return null;

  const isEdit = Boolean(courseToEdit);

  const [selectedEventId, setSelectedEventId] = useState<string>(courseToEdit?.eventId || initialEvent?.id || '');
  const [title, setTitle] = useState<string>(courseToEdit?.title || initialEvent?.title || '');
  const [code, setCode] = useState<string>(courseToEdit?.code || '');
  const [description, setDescription] = useState<string>(courseToEdit?.description || initialEvent?.description || '');
  const [category, setCategory] = useState<string>(courseToEdit?.category || initialEvent?.category || 'Planta Externa');
  const [dailyHours, setDailyHours] = useState<number>(courseToEdit?.dailyHours || 4);
  const [durationDays, setDurationDays] = useState<number>(courseToEdit?.durationDays || 5);
  const [modality, setModality] = useState<string>(courseToEdit?.modality || initialEvent?.modality || 'Presencial (Taller Técnico)');
  const [location, setLocation] = useState<string>(courseToEdit?.location || initialEvent?.location || 'Laboratorio Técnico Nave 4');
  const [companyId, setCompanyId] = useState<string>(courseToEdit?.companyId || initialEvent?.companyId || 'emp_kasino');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (courseToEdit) {
      setSelectedEventId(courseToEdit.eventId || '');
      setTitle(courseToEdit.title);
      setCode(courseToEdit.code || '');
      setDescription(courseToEdit.description || '');
      setCategory(courseToEdit.category || 'Planta Externa');
      setDailyHours(courseToEdit.dailyHours || 4);
      setDurationDays(courseToEdit.durationDays || 5);
      setModality(courseToEdit.modality || 'Presencial (Taller Técnico)');
      setLocation(courseToEdit.location || '');
      setCompanyId(courseToEdit.companyId || 'emp_kasino');
    } else if (initialEvent) {
      setSelectedEventId(initialEvent.id);
      setTitle(initialEvent.title);
      setDescription(initialEvent.description || '');
      if (initialEvent.category) setCategory(initialEvent.category);
      if (initialEvent.location) setLocation(initialEvent.location);
      if (initialEvent.modality) setModality(initialEvent.modality);
      if (initialEvent.companyId) setCompanyId(initialEvent.companyId);
    }
  }, [courseToEdit, initialEvent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (!title.trim()) {
        throw new Error('El título del curso técnico es obligatorio.');
      }

      await apiService.saveTechnicalCourse({
        id: courseToEdit?.id,
        eventId: selectedEventId || courseToEdit?.eventId || null,
        title: title.trim(),
        code: code.trim(),
        description: description.trim(),
        category,
        dailyHours: Number(dailyHours) || 4,
        durationDays: Number(durationDays) || 5,
        modality,
        location: location.trim(),
        companyId
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el curso técnico');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={isEdit ? 'Editar Curso Técnico' : 'Nuevo Curso Técnico Recurrente'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-md shadow-red-600/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30">
                Catálogo Técnico
              </span>
              <h2 className="text-base font-bold text-white mt-0.5">
                {isEdit ? 'Editar Curso Técnico' : 'Nuevo Curso Técnico Recurrente'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* VINCULACIÓN CON CAPACITACIÓN EXISTENTE */}
          {!isEdit && events && events.length > 0 && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Tomar de Capacitación Creada (Opcional):</span>
                </label>
                {selectedEventId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEventId('');
                      setTitle('');
                      setDescription('');
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Limpiar selección
                  </button>
                )}
              </div>

              <select
                value={selectedEventId}
                onChange={(e) => {
                  const evtId = e.target.value;
                  setSelectedEventId(evtId);
                  const foundEvt = events.find(ev => ev.id === evtId);
                  if (foundEvt) {
                    setTitle(foundEvt.title);
                    setDescription(foundEvt.description || '');
                    if (foundEvt.category) setCategory(foundEvt.category);
                    if (foundEvt.location) setLocation(foundEvt.location);
                    if (foundEvt.modality) setModality(foundEvt.modality);
                    if (foundEvt.companyId) setCompanyId(foundEvt.companyId);
                  }
                }}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              >
                <option value="">-- Seleccionar capacitación del catálogo general --</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.category} • {ev.modality})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">
                Al seleccionar una capacitación existente, se vincularán sus datos para crear el curso recurrente de impartición diaria.
              </p>
            </div>
          )}

          {/* Title & Code */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Título de la Capacitación Técnica *
            </label>
            <input
              type="text"
              placeholder="Ej. Empalme y Medición OTDR de Fibra Óptica"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800 bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Código del Curso
              </label>
              <input
                type="text"
                placeholder="Ej. TEC-FO-101"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Especialidad / Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 bg-white"
              >
                {TECHNICAL_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Hours & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Horas Diarias por Sesión
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="12"
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 bg-white"
              />
              <span className="text-[10px] text-slate-500 font-medium block">Total acumulado: {(dailyHours * durationDays)} hrs</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Duración del Taller (Días Hábiles)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 bg-white"
              />
              <span className="text-[10px] text-slate-500 font-medium block">Típicamente 5 días (Semana técnica)</span>
            </div>
          </div>

          {/* Modality & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Modalidad
              </label>
              <input
                type="text"
                value={modality}
                onChange={(e) => setModality(e.target.value)}
                placeholder="Presencial (Taller Técnico)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Ubicación / Taller por Defecto
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej. Taller Central Fibra Óptica"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 bg-white"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Objetivo / Descripción del Curso
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Competencias técnicas a desarrollar, protocolos de seguridad y herramientas..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm shadow-red-600/20 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isEdit ? 'Actualizar Curso' : 'Guardar en Catálogo'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AccessibleModal>
  );
};
