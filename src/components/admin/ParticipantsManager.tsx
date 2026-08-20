import React, { useState, useRef, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  UserCheck, 
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Building,
  ShieldCheck
} from 'lucide-react';
import { Participant, UserAccount } from '../../types';
import { exportParticipantsToExcel, parseParticipantsExcelFile } from '../../utils/excelUtils';
import { generateEmailFromName, formatCedula, isValidCedula } from '../../utils/formatters';

interface ParticipantsManagerProps {
  participants: Participant[];
  users?: UserAccount[];
  onSaveParticipants: (participants: Participant[]) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error') => void;
}

export const ParticipantsManager: React.FC<ParticipantsManagerProps> = ({
  participants,
  users = [],
  onSaveParticipants,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('Todos');
  const [selectedSuperFilter, setSelectedSuperFilter] = useState('all');
  
  // Formulario nuevo participante
  const [newCard, setNewCard] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCedula, setNewCedula] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newSupervisorId, setNewSupervisorId] = useState('');
  
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Lista de supervisores disponibles
  const supervisors = useMemo(() => {
    return users.filter(u => 
      u.role === 'Líder de Área / Supervisor' || 
      u.role === 'Super Administrador' || 
      u.role === 'Administrador / Editor'
    );
  }, [users]);

  // Lista de departamentos únicos
  const departments = useMemo(() => {
    const set = new Set<string>();
    participants.forEach(p => {
      if (p.department) set.add(p.department);
    });
    return ['Todos', ...Array.from(set)];
  }, [participants]);

  const filtered = participants.filter(p => {
    // Filtro departamento
    if (selectedDeptFilter !== 'Todos' && p.department !== selectedDeptFilter) {
      return false;
    }

    // Filtro supervisor
    if (selectedSuperFilter !== 'all') {
      if (selectedSuperFilter === 'unassigned' && p.supervisorId) return false;
      if (selectedSuperFilter !== 'unassigned' && p.supervisorId !== selectedSuperFilter) return false;
    }

    // Filtro de búsqueda
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) || 
      p.email.toLowerCase().includes(q) || 
      p.card.includes(q) ||
      (p.cedula && p.cedula.includes(q)) ||
      (p.department && p.department.toLowerCase().includes(q)) ||
      (p.supervisorName && p.supervisorName.toLowerCase().includes(q))
    );
  });

  const handleNameChange = (val: string) => {
    setNewName(val);
    if (!newEmail || newEmail.includes('@empresa.com')) {
      setNewEmail(generateEmailFromName(val));
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.trim() || !newName.trim() || !newEmail.trim()) return;

    if (participants.some(p => p.card === newCard.trim())) {
      onShowToast('Tarjeta duplicada', 'Ya existe un colaborador con este número de tarjeta.', 'error');
      return;
    }

    if (newCedula.trim()) {
      const formatted = formatCedula(newCedula.trim());
      if (!isValidCedula(formatted)) {
        onShowToast('Cédula inválida', 'La cédula debe tener 11 dígitos en formato 000-0000000-0.', 'error');
        return;
      }
    }

    const selectedSuper = supervisors.find(s => s.id === newSupervisorId);

    const newParticipant: Participant = {
      card: newCard.trim(),
      name: newName.trim().toUpperCase(),
      email: newEmail.trim().toLowerCase(),
      cedula: newCedula.trim() ? formatCedula(newCedula.trim()) : undefined,
      department: newDepartment.trim() || undefined,
      supervisorId: selectedSuper ? selectedSuper.id : undefined,
      supervisorName: selectedSuper ? selectedSuper.name : undefined
    };

    const updated = [...participants, newParticipant];

    try {
      await onSaveParticipants(updated);
      onShowToast('Colaborador agregado', `${newName} ha sido añadido al padrón.`, 'success');
      setNewCard('');
      setNewName('');
      setNewEmail('');
      setNewCedula('');
      setNewDepartment('');
      setNewSupervisorId('');
      setIsAddingManual(false);
    } catch (err: any) {
      onShowToast('Error', err.message || 'No se pudo agregar al colaborador.', 'error');
    }
  };

  const handleInlineSupervisorChange = async (card: string, supervisorId: string) => {
    const selectedSuper = supervisors.find(s => s.id === supervisorId);
    const updated = participants.map(p => {
      if (p.card === card) {
        return {
          ...p,
          supervisorId: selectedSuper ? selectedSuper.id : undefined,
          supervisorName: selectedSuper ? selectedSuper.name : undefined
        };
      }
      return p;
    });

    try {
      await onSaveParticipants(updated);
      onShowToast(
        'Supervisor asignado', 
        selectedSuper ? `Se asignó a ${selectedSuper.name}.` : 'Se desasignó el supervisor.', 
        'success'
      );
    } catch (err: any) {
      onShowToast('Error', err.message || 'No se pudo actualizar el supervisor.', 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const parsed = await parseParticipantsExcelFile(file);
      
      // Combinar con existentes evitando duplicados por card
      const existingCards = new Set(participants.map(p => p.card));
      const newItems = parsed.filter(p => !existingCards.has(p.card));

      const updated = [...participants, ...newItems];
      await onSaveParticipants(updated);
      onShowToast('Importación exitosa', `Se importaron ${newItems.length} colaboradores desde Excel.`, 'success');
    } catch (err: any) {
      onShowToast('Error de importación', err.message || 'Error al procesar el archivo Excel.', 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (card: string) => {
    const updated = participants.filter(p => p.card !== card);
    await onSaveParticipants(updated);
    onShowToast('Colaborador eliminado', 'Se ha retirado del padrón.', 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search & Filters */}
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute inset-y-0 left-3.5 my-auto" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, tarjeta, cédula o supervisor..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {departments.map(d => (
                <option key={d} value={d}>{d === 'Todos' ? 'Todos los Deptos' : d}</option>
              ))}
            </select>

            <select
              value={selectedSuperFilter}
              onChange={(e) => setSelectedSuperFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Todos los Supervisores</option>
              <option value="unassigned">Sin Supervisor Asignado</option>
              {supervisors.map(s => (
                <option key={s.id} value={s.id}>Sup: {s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isImporting ? 'Importando...' : 'Importar Excel'}</span>
          </button>

          <button
            type="button"
            onClick={() => exportParticipantsToExcel(participants)}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Padrón</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddingManual(!isAddingManual)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Colaborador</span>
          </button>
        </div>

      </div>

      {/* Manual Add Collapsible Form */}
      {isAddingManual && (
        <form onSubmit={handleAddParticipant} className="bg-slate-950/60 border border-slate-800 rounded-3xl p-5 space-y-4 animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Registrar Nuevo Colaborador en Padrón</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">No. Tarjeta / Carnet *</label>
              <input
                type="text"
                value={newCard}
                onChange={(e) => setNewCard(e.target.value)}
                placeholder="ej. 2045"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Cédula (11 dígitos)</label>
              <input
                type="text"
                value={newCedula}
                onChange={(e) => setNewCedula(formatCedula(e.target.value))}
                placeholder="ej. 402-2196163-1"
                maxLength={13}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Nombre Completo *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="ej. MARÍA GONZÁLEZ LÓPEZ"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Correo Corporativo *</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="ej. maria.gonzalez@empresa.com"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Departamento / Área</label>
              <input
                type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="ej. Tecnología"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Supervisor Asignado</label>
              <select
                value={newSupervisorId}
                onChange={(e) => setNewSupervisorId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="">Sin Asignar</option>
                {supervisors.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingManual(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
            >
              Guardar en Padrón
            </button>
          </div>
        </form>
      )}

      {/* Participants Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                <th className="p-4 font-semibold">Tarjeta / ID</th>
                <th className="p-4 font-semibold">Cédula</th>
                <th className="p-4 font-semibold">Nombre del Colaborador</th>
                <th className="p-4 font-semibold">Correo Corporativo</th>
                <th className="p-4 font-semibold">Departamento</th>
                <th className="p-4 font-semibold">Supervisor Asignado</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(p => (
                <tr key={p.card} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-4 font-mono font-bold text-indigo-400">{p.card}</td>
                  
                  <td className="p-4">
                    {p.cedula ? (
                      <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                        {p.cedula}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">—</span>
                    )}
                  </td>

                  <td className="p-4 font-semibold text-white">{p.name}</td>
                  <td className="p-4 text-slate-400 font-mono text-[11px]">{p.email}</td>

                  <td className="p-4 text-slate-300">
                    {p.department ? (
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800 text-[11px]">
                        {p.department}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">—</span>
                    )}
                  </td>

                  {/* Inline Supervisor Dropdown */}
                  <td className="p-4">
                    <select
                      value={p.supervisorId || ''}
                      onChange={(e) => handleInlineSupervisorChange(p.card, e.target.value)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-950 border ${
                        p.supervisorId
                          ? 'text-emerald-400 border-emerald-500/40'
                          : 'text-slate-400 border-slate-800'
                      }`}
                    >
                      <option value="">(Sin Supervisor)</option>
                      {supervisors.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </td>

                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(p.card)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Eliminar del padrón"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex justify-between bg-slate-950/40">
          <span>Mostrando {filtered.length} de {participants.length} colaboradores</span>
          <span>{participants.filter(p => p.supervisorId).length} colaboradores con supervisor asignado</span>
        </div>
      </div>

    </div>
  );
};
