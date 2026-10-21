import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Monitor,
  Wrench,
  Compass,
  Sun,
  Sunset,
  CalendarDays,
  Clock4
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

const CATEGORIES = [
  "Curso", 
  "Taller", 
  "Webinar", 
  "Charla", 
  "Certificación Técnica", 
  "Seguridad y Prevención"
];

const MODALITY_OPTIONS = [
  { value: 'Presencial (Taller)', label: 'Presencial (Taller)', icon: Building2, desc: 'En aulas o laboratorios Claro' },
  { value: 'Virtual / Teams', label: 'Virtual (Teams)', icon: Monitor, desc: 'Sesiones online sincrónicas' },
  { value: 'Híbrido', label: 'Híbrido', icon: Compass, desc: 'Teoría remota + práctica física' },
  { value: 'En Terreno / Planta Externa', label: 'En Terreno', icon: Wrench, desc: 'Postes, armarios o centrales' }
];

const SCHEDULE_OPTIONS = [
  { value: 'Cualquiera', label: 'Cualquier Horario', icon: Clock4, desc: 'Flexible según disponibilidad' },
  { value: 'Horario Matutino (Mañana)', label: 'Mañana (AM)', icon: Sun, desc: '8:00 AM - 12:00 PM' },
  { value: 'Horario Vespertino (Tarde)', label: 'Tarde (PM)', icon: Sunset, desc: '1:00 PM - 5:00 PM' },
  { value: 'Fines de Semana (Sábados)', label: 'Sábados', icon: CalendarDays, desc: 'Jornada intensiva fin de semana' }
];

const QUORUM_PRESETS = [5, 8, 10, 12, 15, 20];
const DURATION_PRESETS = [4, 8, 16, 24, 40];

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

  // Escuchar tecla Escape para cerrar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
        onShowToast('¡Propuesta Registrada!', 'Tu solicitud de curso ha sido creada y te hemos inscrito en la posición #1 de la lista de espera.', 'success');
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col">
        
        {/* Cabecera Branded Claro */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#DA291C] flex items-center justify-center shadow-lg shadow-red-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold tracking-tight text-white truncate">
                Proponer Nuevo Curso o Capacitación
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Apertura a demanda y recolección colaborativa de quórum
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Cerrar (Esc)"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario Scrolleable */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5 overflow-y-auto">
          
          {/* Mensaje Explicativo Claro */}
          <div className="p-3.5 bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start space-x-2.5">
            <HelpCircle className="w-4 h-4 text-[#DA291C] shrink-0 mt-0.5" />
            <span>
              Los cursos a demanda se habilitan cuando alcanzan el <strong>quórum mínimo</strong> de colaboradores interesados. <strong>Al proponer este curso, quedarás inscrito automáticamente en la posición #1 de la lista de espera.</strong>
            </span>
          </div>

          {/* Título de la Capacitación */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Título del Curso o Taller Propuesto *
              </label>
              <span className="text-[10px] text-slate-400">
                {title.length}/120 caracteres
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={120}
              placeholder="Ej. Configuración de Enlaces de Microondas y Radioenlaces Ceragon"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#DA291C] focus:outline-hidden text-slate-900 dark:text-white placeholder:text-slate-400 font-medium transition-all"
            />
          </div>

          {/* Categoría Formativa */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              Categoría Formativa
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    category === cat
                      ? 'bg-[#DA291C] text-white shadow-sm shadow-red-500/30 ring-2 ring-red-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Modalidad Sugerida (Tarjetas Visuales) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              Modalidad Sugerida
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MODALITY_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = modality === opt.value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setModality(opt.value)}
                    className={`p-3 rounded-2xl border text-left flex items-start space-x-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#DA291C] bg-red-50/50 dark:bg-red-950/20 ring-1 ring-[#DA291C]'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${
                      isSelected 
                        ? 'bg-[#DA291C] text-white' 
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className={`text-xs font-bold block ${
                        isSelected ? 'text-[#DA291C] dark:text-red-400' : 'text-slate-800 dark:text-white'
                      }`}>
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        {opt.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duración y Quórum Mínimo con Presets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Duración Estimada */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 inline mr-1 text-[#DA291C]" />
                Duración Estimada (Horas)
              </label>
              
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={targetHours}
                  onChange={(e) => setTargetHours(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white text-center"
                />
                <span className="text-xs text-slate-500 font-medium">horas académicas</span>
              </div>

              {/* Presets rápidos */}
              <div className="flex flex-wrap gap-1.5">
                {DURATION_PRESETS.map((hrs) => (
                  <button
                    type="button"
                    key={hrs}
                    onClick={() => setTargetHours(hrs)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      targetHours === hrs
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {hrs}h
                  </button>
                ))}
              </div>
            </div>

            {/* Quórum Mínimo Requerido */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 inline mr-1 text-[#DA291C]" />
                Quórum Mínimo para Abrir
              </label>
              
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="number"
                  min="3"
                  max="50"
                  value={minQuorum}
                  onChange={(e) => setMinQuorum(Math.max(3, parseInt(e.target.value) || 3))}
                  className="w-24 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white text-center"
                />
                <span className="text-xs text-slate-500 font-medium">colaboradores</span>
              </div>

              {/* Presets rápidos */}
              <div className="flex flex-wrap gap-1.5">
                {QUORUM_PRESETS.map((q) => (
                  <button
                    type="button"
                    key={q}
                    onClick={() => setMinQuorum(q)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      minQuorum === q
                        ? 'bg-[#DA291C] text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {q} pers.
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Horario Preferido del Proponente (Pills Visuales) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              Tu Horario de Preferencia para Cursarlo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SCHEDULE_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = preferredSchedule === opt.value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setPreferredSchedule(opt.value)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? 'border-[#DA291C] bg-red-50/70 dark:bg-red-950/30 text-[#DA291C] ring-1 ring-[#DA291C]'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 mb-1" />
                    <span className="text-[11px] font-bold leading-tight">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Empresa o Alcance */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
              Empresa / Alcance de la Convocatoria
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="all">🏢 Todas las Empresas (Abierto a Claro y Contratistas)</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>🏢 {c.name}</option>
              ))}
            </select>
          </div>

          {/* Descripción / Justificación */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                ¿Por qué es necesario este curso? (Justificación / Impacto)
              </label>
              <span className="text-[10px] text-slate-400">
                {description.length}/500
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={500}
              placeholder="Explica qué necesidad técnica o formativa resuelve este curso, qué equipos se usarán o cómo beneficiará las operaciones de campo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#DA291C] focus:outline-hidden text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-6 py-2.5 rounded-xl bg-[#DA291C] hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold shadow-md shadow-red-500/25 transition-all disabled:opacity-50 inline-flex items-center space-x-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Registrando Propuesta...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Proponer Curso & Entrar a Lista de Espera</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
