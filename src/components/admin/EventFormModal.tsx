import React, { useState, useEffect } from 'react';
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
  Users
} from 'lucide-react';
import { TrainingEvent, Schedule, Slot, EventModality, EventStatus } from '../../types';
import { formatDateLong } from '../../utils/formatters';

interface EventFormModalProps {
  initialEvent?: TrainingEvent | null;
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
  onClose,
  onSaveEvent
}) => {
  const isEditing = !!initialEvent;

  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [category, setCategory] = useState(initialEvent?.category || 'Taller');
  const [instructor, setInstructor] = useState(initialEvent?.instructor || '');
  const [modality, setModality] = useState<EventModality>(initialEvent?.modality || 'Presencial');
  const [location, setLocation] = useState(initialEvent?.location || 'Sala de Juntas B');
  const [imageUrl, setImageUrl] = useState(initialEvent?.imageUrl || SAMPLE_IMAGES[0]);
  const [surveyUrl, setSurveyUrl] = useState(initialEvent?.surveyUrl || '');
  const [status, setStatus] = useState<EventStatus>(initialEvent?.status || 'active');

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

    const eventPayload: TrainingEvent = {
      id: initialEvent?.id || `evt_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category,
      instructor: instructor.trim(),
      modality,
      location: location.trim(),
      imageUrl: imageUrl.trim() || SAMPLE_IMAGES[0],
      surveyUrl: surveyUrl.trim() || undefined,
      status,
      notificationSettings: {
        sendEmail,
        sendTeams,
        customMessage
      },
      notificationHistory: initialEvent?.notificationHistory || [],
      schedule,
      feedbacks: initialEvent?.feedbacks || []
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              {isEditing ? 'Editar Capacitación' : 'Crear Nueva Capacitación'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configura los detalles del curso, modalidad, enlaces de evaluación y horarios.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. General Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              1. Información General del Evento
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Título de la Capacitación *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ej. Taller de Liderazgo y Trabajo en Equipo"
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción y Objetivos</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalla los temas a cubrir, requisitos previos y lo que aprenderán los colaboradores..."
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Modalidad</label>
                <select
                  value={modality}
                  onChange={(e) => setModality(e.target.value as EventModality)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Híbrida">Híbrida</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Instructor / Facilitador *</label>
                <input
                  type="text"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  placeholder="ej. Ing. Juan Pérez"
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ubicación o Enlace</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={modality === 'Virtual' ? 'Enlace de Microsoft Teams' : 'Sala de Juntas B (Piso 3)'}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Enlace de Encuesta / Evaluación (Forms)
                </label>
                <input
                  type="url"
                  value={surveyUrl}
                  onChange={(e) => setSurveyUrl(e.target.value)}
                  placeholder="https://forms.office.com/r/ejemplo-evaluacion"
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">URL de Imagen de Portada</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 mb-2"
              />
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] text-slate-500 whitespace-nowrap">Presets:</span>
                {SAMPLE_IMAGES.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Preset ${i}`}
                    onClick={() => setImageUrl(img)}
                    className={`w-10 h-8 rounded-lg object-cover cursor-pointer border-2 transition-all ${
                      imageUrl === img ? 'border-indigo-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 2. Schedule & Slot Builder */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              2. Fechas y Horarios (Slots)
            </h3>

            {/* Existing Slots */}
            <div className="space-y-2">
              {schedule.map(sch => (
                <div key={sch.date} className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{formatDateLong(sch.date)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sch.slots.map(sl => (
                      <div
                        key={sl.time}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-2 text-slate-300"
                      >
                        <Clock className="w-3 h-3 text-indigo-400" />
                        <span className="font-semibold text-white">{sl.time}</span>
                        <span className="text-[11px] text-slate-500">Capacidad: {sl.capacity}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(sch.date, sl.time)}
                          className="text-slate-500 hover:text-rose-400 transition-colors ml-1"
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
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-3">
              <span className="text-xs font-semibold text-slate-300">Añadir Fecha y Horario:</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={tempDate}
                    onChange={(e) => setTempDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Horario</label>
                  <input
                    type="text"
                    value={tempTime}
                    onChange={(e) => setTempTime(e.target.value)}
                    placeholder="ej. 10:00 AM"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Cupo Máximo</label>
                  <input
                    type="number"
                    min="1"
                    value={tempCapacity}
                    onChange={(e) => setTempCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="py-2 px-4 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir Horario</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Notification Settings */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              3. Configuración de Recordatorios Automáticos
            </h3>
            
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                />
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>Enviar por Correo (Email)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendTeams}
                  onChange={(e) => setSendTeams(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                />
                <Bell className="w-3.5 h-3.5 text-cyan-400" />
                <span>Enviar por Microsoft Teams</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Plantilla del Mensaje de Recordatorio
              </label>
              <textarea
                rows={2}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Variables disponibles: <code>[EVENT_TITLE]</code>, <code>[INSTRUCTOR]</code>, <code>[SURVEY_LINK]</code>
              </p>
            </div>
          </div>

          {/* Submit Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
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
