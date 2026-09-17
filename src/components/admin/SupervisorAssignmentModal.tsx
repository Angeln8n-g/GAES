import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Users, 
  CheckCircle2, 
  UserCheck, 
  Filter, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  AlertCircle,
  Building
} from 'lucide-react';
import { UserAccount, Participant } from '../../types';
import { AccessibleModal } from '../common/AccessibleModal';

interface SupervisorAssignmentModalProps {
  supervisor: UserAccount;
  participants: Participant[];
  onClose: () => void;
  onSaveAssignment: (supervisorId: string, assignedCards: string[]) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const SupervisorAssignmentModal: React.FC<SupervisorAssignmentModalProps> = ({
  supervisor,
  participants,
  onClose,
  onSaveAssignment,
  onShowToast
}) => {
  // Inicializar conjunto de tarjetas seleccionadas
  const [selectedCards, setSelectedCards] = useState<Set<string>>(() => {
    const initial = new Set<string>(supervisor.assignedMemberCards || []);
    // También incluir los que ya tengan supervisorId igual a este supervisor
    participants.forEach(p => {
      if (p.supervisorId === supervisor.id) {
        initial.add(p.card);
      }
    });
    return initial;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('Todos');
  const [isSaving, setIsSaving] = useState(false);

  // Obtener lista única de departamentos
  const departments = useMemo(() => {
    const set = new Set<string>();
    participants.forEach(p => {
      if (p.department) set.add(p.department);
    });
    return ['Todos', ...Array.from(set)];
  }, [participants]);

  // Filtrar participantes según empresa del supervisor, búsqueda y departamento
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      const supCompany = supervisor.companyId || 'emp_kasino';
      const pCompany = p.companyId || 'emp_kasino';
      if (supCompany && pCompany !== supCompany) {
        return false;
      }

      if (selectedDepartment !== 'Todos' && p.department !== selectedDepartment) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCard = p.card.includes(q);
        const matchesEmail = p.email.toLowerCase().includes(q);
        const matchesCedula = p.cedula && p.cedula.includes(q);
        if (!matchesName && !matchesCard && !matchesEmail && !matchesCedula) {
          return false;
        }
      }

      return true;
    });
  }, [participants, supervisor.companyId, searchQuery, selectedDepartment]);

  const toggleCard = (card: string) => {
    const next = new Set(selectedCards);
    if (next.has(card)) {
      next.delete(card);
    } else {
      next.add(card);
    }
    setSelectedCards(next);
  };

  const handleSelectAllVisible = () => {
    const next = new Set(selectedCards);
    filteredParticipants.forEach(p => next.add(p.card));
    setSelectedCards(next);
  };

  const handleDeselectAllVisible = () => {
    const next = new Set(selectedCards);
    filteredParticipants.forEach(p => next.delete(p.card));
    setSelectedCards(next);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const cardsArray = Array.from(selectedCards);
      await onSaveAssignment(supervisor.id, cardsArray);
      onShowToast(
        'Equipo asignado',
        `Se han asignado ${cardsArray.length} colaboradores a ${supervisor.name}.`,
        'success'
      );
      onClose();
    } catch (err: any) {
      onShowToast('Error al guardar', err.message || 'No se pudo guardar la asignación.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AccessibleModal
      onClose={onClose}
      ariaLabel="Asignación de Supervisión a Colaboradores"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 p-0.5 flex items-center justify-center">
              <Users className="w-6 h-6 text-[#DA291C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">Asignación de Colaboradores a Supervisor</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-[#DA291C] border border-red-200">
                  Líder de Área
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Supervisor: <strong className="text-slate-800 font-bold">{supervisor.name}</strong> ({supervisor.email})
                {supervisor.department && <span> • Depto: <strong className="text-[#DA291C]">{supervisor.department}</strong></span>}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Selection Tools */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 space-y-4">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, tarjeta, cédula o correo..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
              />
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#DA291C]"
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d === 'Todos' ? 'Todos los Departamentos' : d}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Quick Selection Buttons & Counters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold">Seleccionados:</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-50 text-[#DA291C] border border-red-200">
                {selectedCards.size} de {participants.length} colaboradores
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Seleccionar Visibles ({filteredParticipants.length})
              </button>
              <button
                type="button"
                onClick={handleDeselectAllVisible}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Deseleccionar Visibles
              </button>
            </div>
          </div>

        </div>

        {/* Collaborators Selection List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredParticipants.map(p => {
              const isSelected = selectedCards.has(p.card);
              const isAssignedToOther = p.supervisorId && p.supervisorId !== supervisor.id;

              return (
                <div
                  key={p.card}
                  onClick={() => toggleCard(p.card)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-red-50/60 border-[#DA291C] shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#DA291C] border-[#DA291C] text-white'
                        : 'border-slate-300 bg-slate-50'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs line-clamp-1">{p.name}</span>
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-50 text-[#DA291C] border border-red-200">
                          #{p.card}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{p.email}</p>
                      
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {p.department && (
                          <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-semibold">
                            🏢 {p.department}
                          </span>
                        )}
                        {isAssignedToOther && !isSelected && (
                          <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 font-bold">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Sup: {p.supervisorName || 'Otro'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {filteredParticipants.length === 0 && (
            <div className="p-12 text-center text-slate-400 text-xs">
              No se encontraron colaboradores que coincidan con la búsqueda o filtro.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Total asignados: <strong className="text-slate-900">{selectedCards.size} colaboradores</strong>
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-[#DA291C] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-md shadow-red-500/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Confirmar Asignación'}</span>
            </button>
          </div>
        </div>

      </div>
    </AccessibleModal>
  );
};
