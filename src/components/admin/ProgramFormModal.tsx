import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  BookOpen, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  Check, 
  Clock, 
  ShieldAlert, 
  Star,
  Plus,
  Building2
} from 'lucide-react';
import { TrainingProgram, TrainingEvent, ParticipantGroup, ProgramEventItem, Company, UserAccount } from '../../types';
import { getGroupColorTheme } from './GroupsManager';
import { AccessibleModal } from '../common/AccessibleModal';

interface ProgramFormModalProps {
  program: TrainingProgram | null;
  events: TrainingEvent[];
  groups: ParticipantGroup[];
  companies?: Company[];
  currentUser?: UserAccount | null;
  isSuperAdmin?: boolean;
  onClose: () => void;
  onSave: (program: TrainingProgram) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const ProgramFormModal: React.FC<ProgramFormModalProps> = ({
  program,
  events,
  groups,
  companies = [],
  currentUser,
  isSuperAdmin = true,
  onClose,
  onSave,
  onShowToast
}) => {
  const defaultCompanyId = program?.companyId || (!isSuperAdmin && currentUser?.companyId ? currentUser.companyId : (companies[0]?.id || 'emp_kasino'));

  const [title, setTitle] = useState(program?.title || '');
  const [description, setDescription] = useState(program?.description || '');
  const [companyId, setCompanyId] = useState(defaultCompanyId);
  const [startDate, setStartDate] = useState(
    program?.startDate || new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    program?.endDate || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<TrainingProgram['status']>(program?.status || 'active');
  const [learningFramework, setLearningFramework] = useState<'standard' | '70_20_10'>(program?.learningFramework || 'standard');

  // Groups selection state
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(
    new Set(program?.targetGroupIds || [])
  );

  // Events items state
  const [selectedEvents, setSelectedEvents] = useState<Map<string, { isMandatory: boolean; orderIndex: number; stageCategory?: 'field_practice_70' | 'shadowing_coaching_20' | 'formal_course_10' }>>(() => {
    const map = new Map<string, { isMandatory: boolean; orderIndex: number; stageCategory?: 'field_practice_70' | 'shadowing_coaching_20' | 'formal_course_10' }>();
    if (program?.eventItems) {
      program.eventItems.forEach(item => {
        map.set(item.eventId, {
          isMandatory: item.isMandatory !== false,
          orderIndex: item.orderIndex || 1,
          stageCategory: item.stageCategory || 'formal_course_10'
        });
      });
    }
    return map;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents(prev => {
      const next = new Map(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.set(eventId, { isMandatory: true, orderIndex: next.size + 1 });
      }
      return next;
    });
  };

  const toggleEventMandatory = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvents(prev => {
      const next = new Map(prev);
      const current = next.get(eventId);
      if (current) {
        next.set(eventId, { ...current, isMandatory: !current.isMandatory });
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      onShowToast('Campo requerido', 'El título del cronograma es obligatorio.', 'error');
      return;
    }
    if (!startDate || !endDate) {
      onShowToast('Fechas requeridas', 'Debes especificar la fecha de inicio y de finalización.', 'error');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      onShowToast('Fechas inválidas', 'La fecha límite no puede ser anterior a la fecha de inicio.', 'error');
      return;
    }
    if (selectedEvents.size === 0) {
      onShowToast('Cursos requeridos', 'Debes incluir al menos una capacitación en el cronograma.', 'error');
      return;
    }
    if (selectedGroupIds.size === 0) {
      onShowToast('Grupos requeridos', 'Debes asignar al menos un grupo objetivo a este cronograma.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const eventItems: ProgramEventItem[] = Array.from(selectedEvents.entries()).map(([eventId, val], idx) => ({
        eventId,
        isMandatory: val.isMandatory,
        orderIndex: idx + 1,
        stageCategory: val.stageCategory || (learningFramework === '70_20_10' ? 'field_practice_70' : 'formal_course_10')
      }));

      const programToSave: TrainingProgram = {
        id: program?.id || `prog_${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        startDate,
        endDate,
        status,
        companyId: companyId || 'emp_kasino',
        learningFramework,
        eventItems,
        targetGroupIds: Array.from(selectedGroupIds),
        targetParticipantCards: program?.targetParticipantCards || [],
        createdAt: program?.createdAt || new Date().toISOString()
      };

      await onSave(programToSave);
      onShowToast(
        'Cronograma guardado', 
        `El programa "${programToSave.title}" se ha configurado exitosamente.`, 
        'success'
      );
      onClose();
    } catch (err: any) {
      onShowToast('Error', err.message || 'No se pudo guardar el cronograma.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      onClose={onClose}
      ariaLabel={program ? 'Editar Cronograma de Capacitación' : 'Crear Nuevo Cronograma de Capacitación'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-[#DA291C]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {program ? 'Editar Cronograma de Capacitación' : 'Crear Nuevo Cronograma de Capacitación'}
              </h2>
              <p className="text-xs text-slate-500">
                Estructura rutas formativas con plazos y cursos obligatorios para tus grupos.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* General Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-[#DA291C] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> 1. Datos Generales del Programa
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Título del Cronograma / Programa Formativo *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ej. Plan de Innovación y Habilidades Digitales 2026"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descripción / Objetivos de Aprendizaje
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explica qué competencias desarrollará el participante y la importancia del programa..."
                rows={2}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
              />
            </div>

            {/* Dates & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {companies.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Empresa
                  </label>
                  {isSuperAdmin ? (
                    <select
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:border-[#DA291C]"
                    >
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>
                          🏢 {c.name}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha de Inicio *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha Límite de Cumplimiento *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estado del Programa
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
                >
                  <option value="active">Activo (Vigente)</option>
                  <option value="draft">Borrador (Oculto)</option>
                  <option value="completed">Finalizado</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Metodología Formativa
                </label>
                <select
                  value={learningFramework}
                  onChange={(e) => setLearningFramework(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#DA291C]"
                >
                  <option value="standard">📚 Estándar (Cursos Regulares)</option>
                  <option value="70_20_10">⚡ Modelo 70-20-10 & Shadowing OJT</option>
                </select>
              </div>
            </div>
          </div>

          {/* Target Groups Assignment */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#DA291C] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> 2. Grupos Asignados ({selectedGroupIds.size} seleccionados)
              </h3>
              <span className="text-[11px] text-slate-500">
                Los colaboradores de estos grupos tendrán asignada esta ruta formativa.
              </span>
            </div>

            {groups.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>No hay grupos creados todavía. Ve a la pestaña "Grupos" para crearlos.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {groups.map(group => {
                  const isChecked = selectedGroupIds.has(group.id);
                  const theme = getGroupColorTheme(group.color);
                  return (
                    <div
                      key={group.id}
                      onClick={() => toggleGroup(group.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isChecked 
                          ? `bg-red-50/70 border-red-200 ring-1 ring-[#DA291C]/30` 
                          : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-[#DA291C] border-[#DA291C] text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{group.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {group.memberCards.length} colaboradores ({group.department || 'Sin área'})
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Courses Selection */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#DA291C] uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> 3. Capacitaciones Incluidas ({selectedEvents.size} seleccionadas)
              </h3>
              <span className="text-[11px] text-slate-500">
                Marca los eventos y define si son obligatorios para aprobar el cronograma.
              </span>
            </div>

            <div className="space-y-2.5">
              {events.map(event => {
                const isSelected = selectedEvents.has(event.id);
                const eventConfig = selectedEvents.get(event.id);
                const isMandatory = eventConfig?.isMandatory !== false;

                return (
                  <div
                    key={event.id}
                    onClick={() => toggleEvent(event.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected 
                        ? 'bg-red-50/50 border-[#DA291C]/30 ring-1 ring-red-500/20' 
                        : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 mt-0.5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-[#DA291C] border-[#DA291C] text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">{event.title}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {event.category}
                          </span>
                          <span className="text-[10px] text-[#DA291C] font-bold">
                            {event.modality}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                          Instructor: {event.instructor} • {event.schedule.length} fechas disponibles
                        </p>
                      </div>
                    </div>

                    {/* Mandatory / Optional & 70-20-10 Stage Switch (if selected) */}
                    {isSelected && (
                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto pt-2 sm:pt-0">
                        {learningFramework === '70_20_10' && (
                          <select
                            value={eventConfig?.stageCategory || 'field_practice_70'}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              const nextMap = new Map(selectedEvents);
                              const cur = nextMap.get(event.id);
                              if (cur) {
                                nextMap.set(event.id, { ...cur, stageCategory: e.target.value as any });
                                setSelectedEvents(nextMap);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-[11px] font-bold text-slate-800 focus:outline-none"
                          >
                            <option value="field_practice_70">🛠️ 70% Práctica en Campo</option>
                            <option value="shadowing_coaching_20">👥 20% Shadowing & OJT</option>
                            <option value="formal_course_10">📖 10% Aula Formal / Taller</option>
                          </select>
                        )}

                        <button
                          type="button"
                          onClick={(e) => toggleEventMandatory(event.id, e)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isMandatory
                              ? 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                              : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isMandatory ? 'fill-amber-500 text-amber-500' : ''}`} />
                          <span>{isMandatory ? 'Obligatorio' : 'Opcional'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-extrabold shadow-md shadow-red-500/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : program ? 'Actualizar Cronograma' : 'Crear Cronograma'}</span>
            </button>
          </div>

        </form>

      </div>
    </AccessibleModal>
  );
};
