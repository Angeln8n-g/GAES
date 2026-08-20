import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  FolderPlus, 
  X, 
  UserCheck, 
  Tag, 
  Check
} from 'lucide-react';
import { ParticipantGroup, Participant } from '../../types';
import { exportGroupsToExcel } from '../../utils/excelUtils';

interface GroupsManagerProps {
  groups: ParticipantGroup[];
  participants: Participant[];
  onSaveGroup: (group: ParticipantGroup) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

const COLOR_OPTIONS = [
  { id: 'indigo', label: 'Índigo', bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30', dot: 'bg-indigo-500' },
  { id: 'emerald', label: 'Esmeralda', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  { id: 'amber', label: 'Ámbar', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  { id: 'rose', label: 'Rosa / Rojo', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30', dot: 'bg-rose-500' },
  { id: 'sky', label: 'Cielo', bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/30', dot: 'bg-sky-500' },
  { id: 'purple', label: 'Púrpura', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-500' },
  { id: 'cyan', label: 'Cian', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', dot: 'bg-cyan-500' }
];

export const getGroupColorTheme = (colorKey: string) => {
  return COLOR_OPTIONS.find(c => c.id === colorKey) || COLOR_OPTIONS[0];
};

export const GroupsManager: React.FC<GroupsManagerProps> = ({
  groups,
  participants,
  onSaveGroup,
  onDeleteGroup,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ParticipantGroup | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    id: string;
    name: string;
    description: string;
    color: string;
    department: string;
    memberCards: Set<string>;
  }>({
    id: '',
    name: '',
    description: '',
    color: 'indigo',
    department: '',
    memberCards: new Set()
  });

  const [memberSearch, setMemberSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredGroups = groups.filter(g => {
    const q = searchQuery.toLowerCase();
    return g.name.toLowerCase().includes(q) || 
           (g.department && g.department.toLowerCase().includes(q)) ||
           (g.description && g.description.toLowerCase().includes(q));
  });

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setFormData({
      id: `grp_${Date.now()}`,
      name: '',
      description: '',
      color: 'indigo',
      department: '',
      memberCards: new Set()
    });
    setMemberSearch('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group: ParticipantGroup) => {
    setEditingGroup(group);
    setFormData({
      id: group.id,
      name: group.name,
      description: group.description || '',
      color: group.color || 'indigo',
      department: group.department || '',
      memberCards: new Set(group.memberCards)
    });
    setMemberSearch('');
    setIsModalOpen(true);
  };

  const toggleMember = (card: string) => {
    setFormData(prev => {
      const next = new Set(prev.memberCards);
      if (next.has(card)) {
        next.delete(card);
      } else {
        next.add(card);
      }
      return { ...prev, memberCards: next };
    });
  };

  const toggleSelectAllFiltered = (filteredCards: string[]) => {
    setFormData(prev => {
      const next = new Set(prev.memberCards);
      const allSelected = filteredCards.every(c => next.has(c));
      if (allSelected) {
        filteredCards.forEach(c => next.delete(c));
      } else {
        filteredCards.forEach(c => next.add(c));
      }
      return { ...prev, memberCards: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      onShowToast('Campo requerido', 'El nombre del grupo es obligatorio.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const groupToSave: ParticipantGroup = {
        id: formData.id || `grp_${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        department: formData.department.trim(),
        memberCards: Array.from(formData.memberCards),
        createdAt: editingGroup?.createdAt || new Date().toISOString()
      };

      await onSaveGroup(groupToSave);
      onShowToast('Grupo guardado', `El grupo "${groupToSave.name}" se guardó correctamente.`, 'success');
      setIsModalOpen(false);
    } catch (err: any) {
      onShowToast('Error', err.message || 'No se pudo guardar el grupo.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (group: ParticipantGroup) => {
    if (!window.confirm(`¿Estás seguro de eliminar el grupo "${group.name}"? Los colaboradores no serán eliminados del sistema.`)) {
      return;
    }
    try {
      await onDeleteGroup(group.id);
      onShowToast('Grupo eliminado', `El grupo "${group.name}" fue eliminado.`, 'info');
    } catch (err: any) {
      onShowToast('Error', err.message || 'No se pudo eliminar el grupo.', 'error');
    }
  };

  // Participantes filtrados dentro del modal
  const filteredParticipants = participants.filter(p => {
    const q = memberSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.card.includes(q) || p.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute inset-y-0 left-3.5 my-auto" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por grupo, área o descripción..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportGroupsToExcel(groups, participants)}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Grupos</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Grupo</span>
          </button>
        </div>

      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
          <h3 className="text-base font-bold text-slate-300">No se encontraron grupos</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Crea grupos de colaboradores por departamento o proyecto para asignarles cronogramas de capacitación dirigidos.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Crear Primer Grupo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGroups.map(group => {
            const theme = getGroupColorTheme(group.color);
            return (
              <div 
                key={group.id}
                className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all group"
              >
                <div>
                  {/* Badge & Department */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${theme.bg} ${theme.text} ${theme.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                      {group.department || 'Sin Área Definida'}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 font-semibold">
                      <Users className="w-3.5 h-3.5" />
                      {group.memberCards.length} colaboradores
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {group.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {group.description || 'Sin descripción adicional.'}
                  </p>

                  {/* Member Preview Avatars */}
                  <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex -space-x-2 overflow-hidden">
                      {group.memberCards.slice(0, 5).map(card => {
                        const p = participants.find(part => part.card === card);
                        const initial = p ? p.name.charAt(0) : '?';
                        return (
                          <div
                            key={card}
                            title={p?.name || `Tarjeta ${card}`}
                            className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-300 shadow"
                          >
                            {initial}
                          </div>
                        );
                      })}
                      {group.memberCards.length > 5 && (
                        <div className="w-7 h-7 rounded-full bg-indigo-950 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                          +{group.memberCards.length - 5}
                        </div>
                      )}
                      {group.memberCards.length === 0 && (
                        <span className="text-[11px] text-slate-500 italic">Sin integrantes asignados</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-800/60">
                  <button
                    onClick={() => handleOpenEdit(group)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                    title="Editar grupo e integrantes"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => handleDelete(group)}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Eliminar grupo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Group Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingGroup ? 'Editar Grupo de Participantes' : 'Crear Nuevo Grupo / Cohorte'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Segmenta a los colaboradores para asignar cronogramas formativos personalizados.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre del Grupo *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ej. Departamento de TI & Sistemas"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Departamento / Área
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="ej. Tecnología, Ventas, Operaciones..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descripción o Propósito
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el perfil o propósito formativo de este grupo..."
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Color Distintivo
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map(color => {
                    const isSelected = formData.color === color.id;
                    return (
                      <button
                        type="button"
                        key={color.id}
                        onClick={() => setFormData({ ...formData, color: color.id })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                          isSelected 
                            ? `${color.bg} ${color.text} ${color.border} ring-2 ring-indigo-500/50` 
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                        <span>{color.label}</span>
                        {isSelected && <Check className="w-3 h-3 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Members Selection Section */}
              <div className="pt-3 border-t border-slate-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      Asignar Colaboradores al Grupo ({formData.memberCards.size} seleccionados)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Selecciona los integrantes del padrón que formarán parte de este grupo.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSelectAllFiltered(filteredParticipants.map(p => p.card))}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold transition-colors"
                  >
                    {filteredParticipants.every(p => formData.memberCards.has(p.card)) && filteredParticipants.length > 0
                      ? 'Deseleccionar Visibles'
                      : 'Seleccionar Visibles'}
                  </button>
                </div>

                {/* Search in Modal */}
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute inset-y-0 left-3 my-auto" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Filtrar colaboradores por nombre, carnet o correo..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Participants Scroll List */}
                <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60 divide-y divide-slate-800/60">
                  {filteredParticipants.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No se encontraron colaboradores coincidentes.
                    </div>
                  ) : (
                    filteredParticipants.map(p => {
                      const isChecked = formData.memberCards.has(p.card);
                      return (
                        <div
                          key={p.card}
                          onClick={() => toggleMember(p.card)}
                          className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                            isChecked ? 'bg-indigo-600/10 hover:bg-indigo-600/20' : 'hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isChecked ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-900'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{p.name}</span>
                                <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded">
                                  ID: {p.card}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">{p.email}</p>
                            </div>
                          </div>

                          {p.cedula && (
                            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                              {p.cedula}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Submit Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Guardando...' : editingGroup ? 'Actualizar Grupo' : 'Crear Grupo'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
