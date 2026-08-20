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

  // Filtrar participantes según búsqueda y departamento
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
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
  }, [participants, searchQuery, selectedDepartment]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Asignación de Colaboradores a Supervisor</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Líder de Área
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Supervisor: <strong className="text-slate-200">{supervisor.name}</strong> ({supervisor.email})
                {supervisor.department && <span> • Depto: <strong className="text-indigo-300">{supervisor.department}</strong></span>}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Selection Tools */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/50 space-y-4">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, tarjeta, cédula o correo..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
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
              <span className="text-slate-400">Seleccionados:</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {selectedCards.size} de {participants.length} colaboradores
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Seleccionar Visibles ({filteredParticipants.length})
              </button>
              <button
                type="button"
                onClick={handleDeselectAllVisible}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
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
                      ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-400 text-white'
                        : 'border-slate-700 bg-slate-900'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-xs line-clamp-1">{p.name}</span>
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          #{p.card}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{p.email}</p>
                      
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {p.department && (
                          <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                            🏢 {p.department}
                          </span>
                        )}
                        {isAssignedToOther && !isSelected && (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
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
            <div className="p-12 text-center text-slate-400">
              No se encontraron colaboradores que coincidan con la búsqueda o filtro.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Total asignados: <strong className="text-white">{selectedCards.size} colaboradores</strong>
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all hover:scale-105"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Confirmar Asignación'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
