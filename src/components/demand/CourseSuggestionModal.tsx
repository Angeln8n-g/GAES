import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  BookOpen, 
  Clock, 
  Users, 
  Building2, 
  HelpCircle, 
  Layers,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { apiService } from '../../services/api';
import { Company, UserAccount, CourseSuggestion } from '../../types';

interface CourseSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  companies?: Company[];
  onSuggestionCreated: (suggestion: CourseSuggestion) => void;
  onShowToast?: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

const CATEGORIES = ["Curso", "Taller", "Webinar", "Charla", "Certificación Técnica", "Seguridad y Prevención"];
const MODALITIES = ["Presencial (Taller)", "Virtual / Teams", "Híbrido", "En Terreno / Planta Externa"];
const SCHEDULES = ["Cualquiera", "Horario Matutino (Mañana)", "Horario Vespertino (Tarde)", "Fines de Semana (Sábados)"];

export const CourseSuggestionModal: React.FC<CourseSuggestionModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  companies = [],
  onSuggestionCreated,
  onShowToast
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Curso');
  const [modality, setModality] = useState('Presencial (Taller)');
  const [targetHours, setTargetHours] = useState(8);
  const [minQuorum, setMinQuorum] = useState(10);
  const [preferredSchedule, setPreferredSchedule] = useState('Cualquiera');
  const [selectedCompanyId, setSelectedCompanyId] = useState(currentUser?.companyId || 'all');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      if (onShowToast) onShowToast('Campo requerido', 'Por favor ingresa el título del curso propuesto.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiService.createCourseSuggestion({
        title: title.trim(),
        description: description.trim(),
        category,
        modality,
        targetHours: Number(targetHours) || 8,
        minQuorum: Number(minQuorum) || 10,
        companyId: selectedCompanyId,
        preferredSchedule,
        notes: notes.trim()
      });

      if (onShowToast) {
        onShowToast('¡Propuesta Registrada!', 'Tu solicitud de curso ha sido creada y te hemos inscrito en la lista de espera.', 'success');
      }
      onSuggestionCreated(res.suggestion);
      onClose();
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('Error', err.message || 'No se pudo registrar la propuesta de curso.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-5 bg-linear-to-r from-slate-900 via-slate-850 to-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DA291C] flex items-center justify-center shadow-lg shadow-red-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-white">
                Proponer Nuevo Curso o Capacitación
              </h2>
              <p className="text-xs text-slate-400">
                Apertura a demanda y recolección de quórum de interesados
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">
          
          {/* Mensaje Explicativo */}
          <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start space-x-2.5">
            <HelpCircle className="w-4 h-4 text-[#DA291C] shrink-0 mt-0.5" />
            <span>
              Los cursos no recurrentes requieren una cantidad mínima de participantes interesados (quórum) para ser programados por la Dirección de Capacitación de Claro. <strong>Al enviar esta propuesta, quedarás inscrito automáticamente en la posición #1 de la lista de espera.</strong>
            </span>
          </div>

          {/* Título de la Capacitación */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Título del Curso o Taller Sugerido *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Configuración de Enlaces de Microondas y Radioenlaces Ceragon"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#DA291C] focus:outline-hidden text-slate-900 dark:text-white"
            />
          </div>

          {/* Categoría y Modalidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Categoría Formativa
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Modalidad Sugerida
              </label>
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200"
              >
                {MODALITIES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Horas Estimadas y Quórum Mínimo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Duración Estimada (Horas)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={targetHours}
                onChange={(e) => setTargetHours(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Quórum Mínimo Sugerido
              </label>
              <input
                type="number"
                min="3"
                max="50"
                value={minQuorum}
                onChange={(e) => setMinQuorum(Math.max(3, parseInt(e.target.value) || 3))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Colaboradores requeridos para abrir grupo (normalmente entre 8 y 15).
              </span>
            </div>
          </div>

          {/* Horario Preferido del Proponente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Tu Horario de Preferencia
              </label>
              <select
                value={preferredSchedule}
                onChange={(e) => setPreferredSchedule(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200"
              >
                {SCHEDULES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Empresa o Alcance
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="all">🏢 Todas las Empresas (Abierto)</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>🏢 {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descripción / Justificación */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              ¿Por qué es necesario este curso? (Justificación / Impacto)
            </label>
            <textarea
              rows={3}
              placeholder="Explica qué necesidad técnica o formativa resuelve este curso, qué equipos se usarán o cómo beneficiará las operaciones de campo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#DA291C] focus:outline-hidden text-slate-900 dark:text-white"
            />
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#DA291C] hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold shadow-md shadow-red-500/25 transition-all disabled:opacity-50 inline-flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Registrando...' : 'Proponer Curso & Entrar a Lista de Espera'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
