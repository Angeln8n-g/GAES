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
  Check,
  Building2
} from 'lucide-react';
import { ParticipantGroup, Participant, Company, UserAccount } from '../../types';
import { exportGroupsToExcel } from '../../utils/excelUtils';

interface GroupsManagerProps {
  groups: ParticipantGroup[];
  participants: Participant[];
  companies?: Company[];
  currentUser?: UserAccount | null;
  isSuperAdmin?: boolean;
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
  companies = [],
  currentUser,
  isSuperAdmin = true,
  onSaveGroup,
  onDeleteGroup,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ParticipantGroup | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    id: string;
    name: string;
    description: string;
    color: string;
    department: string;
    companyId: string;
    memberCards: Set<string>;
  }>({
    id: '',
    name: '',
    description: '',
    color: 'indigo',
    department: '',
    companyId: 'emp_kasino',
    memberCards: new Set()
  });

  const [memberSearch, setMemberSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredGroups = groups.filter(g => {
    const q = searchQuery.toLowerCase();
    const gCompany = g.companyId || 'emp_kasino';
    if (selectedCompanyFilter !== 'all' && gCompany !== selectedCompanyFilter) {
      return false;
    }
    return g.name.toLowerCase().includes(q) || 
           (g.department && g.department.toLowerCase().includes(q)) ||
           (g.description && g.description.toLowerCase().includes(q));
  });

  const handleOpenCreate = () => {
    setEditingGroup(null);
    const defaultCompanyId = !isSuperAdmin && currentUser?.companyId ? currentUser.companyId : (companies[0]?.id || 'emp_kasino');
    setFormData({
      id: `grp_${Date.now()}`,
      name: '',
      description: '',
      color: 'indigo',
      department: '',
      companyId: defaultCompanyId,
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
      companyId: group.companyId || 'emp_kasino',
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
        companyId: formData.companyId || 'emp_kasino',
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

  // Participantes filtrados dentro del modal (aislados por empresa del grupo)
  const filteredParticipants = participants.filter(p => {
    const pCompany = p.companyId || 'emp_kasino';
    if (formData.companyId && pCompany !== formData.companyId) {
      return false;
    }
    const q = memberSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.card.includes(q) || p.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        {/* Search & Company Filter */}
        <div className="flex items-center gap-3 flex-wrap flex-1 max-w-xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3.5 my-auto" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por grupo, área o descripción..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C] shadow-xs"
            />
          </div>

          {companies.length > 0 && isSuperAdmin && (
            <select
              value={selectedCompanyFilter}
              onChange={(e) => setSelectedCompanyFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-800 font-bold focus:outline-none focus:border-[#DA291C]"
            >
              <option value="all">🏢 Todas las Empresas</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>🏢 {c.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportGroupsToExcel(groups, participants)}
            className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-300 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar Grupos</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-extrabold rounded-2xl shadow-md shadow-red-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Grupo</span>
          </button>
        </div>

      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-pulse" />
          <h3 className="text-base font-black text-slate-800">No se encontraron grupos</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Crea grupos de colaboradores por departamento o proyecto para asignarles cronogramas de capacitación dirigidos.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Crear Primer Grupo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGroups.map(group => {
            const theme = getGroupColorTheme(group.color);
            const comp = companies.find(c => c.id === (group.companyId || 'emp_kasino'));

            return (
              <div 
                key={group.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 hover:shadow transition-all group"
              >
                <div>
                  {/* Badge & Department */}
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${theme.bg} ${theme.text} ${theme.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                        {group.department || 'Sin Área Definida'}
                      </span>
                      {comp && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5 text-[#DA291C]" />
                          {comp.name}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 font-semibold">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {group.memberCards.length} colaboradores
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-black text-slate-900 group-hover:text-[#DA291C] transition-colors">
                    {group.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {group.description || 'Sin descripción adicional.'}
                  </p>

                  {/* Member Preview Avatars */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex -space-x-2 overflow-hidden">
                      {group.memberCards.slice(0, 5).map(card => {
                        const p = participants.find(part => part.card === card);
                        const initial = p ? p.name.charAt(0) : '?';
                        return (
                          <div
                            key={card}
                            title={p?.name || `Tarjeta ${card}`}
                            className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-700 shadow-xs"
                          >
                            {initial}
                          </div>
                        );
                      })}
                      {group.memberCards.length > 5 && (
                        <div className="w-7 h-7 rounded-full bg-red-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#DA291C]">
                          +{group.memberCards.length - 5}
                        </div>
                      )}
                      {group.memberCards.length === 0 && (
                        <span className="text-[11px] text-slate-400 italic">Sin integrantes asignados</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEdit(group)}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    title="Editar grupo e integrantes"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => handleDelete(group)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-[#DA291C]">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingGroup ? 'Editar Grupo de Participantes' : 'Crear Nuevo Grupo / Cohorte'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Segmenta a los colaboradores para asignar cronogramas formativos personalizados.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre del Grupo *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ej. Departamento de TI & Sistemas"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Departamento / Área
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="ej. Tecnología, Ventas, Operaciones..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>

                {companies.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Empresa
                    </label>
                    {isSuperAdmin ? (
                      <select
                        value={formData.companyId}
                        onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
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
                        🏢 {companies.find(c => c.id === formData.companyId)?.name || 'Empresa asignada'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción o Propósito
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el perfil o propósito formativo de este grupo..."
                  rows={2}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                />
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected 
                            ? `${color.bg} ${color.text} ${color.border} ring-2 ring-[#DA291C]/50` 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
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
              <div className="pt-3 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#DA291C]" />
                      Asignar Colaboradores al Grupo ({formData.memberCards.size} seleccionados)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Selecciona los integrantes del padrón que formarán parte de este grupo.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSelectAllFiltered(filteredParticipants.map(p => p.card))}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    {filteredParticipants.every(p => formData.memberCards.has(p.card)) && filteredParticipants.length > 0
                      ? 'Deseleccionar Visibles'
                      : 'Seleccionar Visibles'}
                  </button>
                </div>

                {/* Search in Modal */}
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute inset-y-0 left-3 my-auto" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Filtrar colaboradores por nombre, carnet o correo..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>

                {/* Participants Scroll List */}
                <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/50 divide-y divide-slate-100">
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
                            isChecked ? 'bg-red-50/80 hover:bg-red-100/80' : 'hover:bg-slate-100/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isChecked ? 'bg-[#DA291C] border-[#DA291C] text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">{p.name}</span>
                                <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                  ID: #{p.card}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">{p.email}</p>
                            </div>
                          </div>

                          {p.cedula && (
                            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
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
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-extrabold shadow-md shadow-red-500/25 transition-all flex items-center gap-2 cursor-pointer"
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
