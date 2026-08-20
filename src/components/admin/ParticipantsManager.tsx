import React, { useState, useRef } from 'react';
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
  Sparkles
} from 'lucide-react';
import { Participant } from '../../types';
import { exportParticipantsToExcel, parseParticipantsExcelFile } from '../../utils/excelUtils';
import { generateEmailFromName } from '../../utils/formatters';

interface ParticipantsManagerProps {
  participants: Participant[];
  onSaveParticipants: (participants: Participant[]) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error') => void;
}

export const ParticipantsManager: React.FC<ParticipantsManagerProps> = ({
  participants,
  onSaveParticipants,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newCard, setNewCard] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filtered = participants.filter(p => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.card.includes(q);
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

    const updated = [
      ...participants,
      { card: newCard.trim(), name: newName.trim().toUpperCase(), email: newEmail.trim().toLowerCase() }
    ];

    try {
      await onSaveParticipants(updated);
      onShowToast('Colaborador agregado', `${newName} ha sido añadido al padrón.`, 'success');
      setNewCard('');
      setNewName('');
      setNewEmail('');
      setIsAddingManual(false);
    } catch (err: any) {
      onShowToast('Error', err.message || 'No se pudo agregar al colaborador.', 'error');
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute inset-y-0 left-3.5 my-auto" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, tarjeta o correo corporativo..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">No. Tarjeta / Carnet *</label>
              <input
                type="text"
                value={newCard}
                onChange={(e) => setNewCard(e.target.value)}
                placeholder="ej. 2045"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                required
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
                <th className="p-4 font-semibold">Nombre del Colaborador</th>
                <th className="p-4 font-semibold">Correo Corporativo</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(p => (
                <tr key={p.card} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-4 font-bold text-indigo-400">{p.card}</td>
                  <td className="p-4 font-semibold text-white">{p.name}</td>
                  <td className="p-4 text-slate-400">{p.email}</td>
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

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
          <span>Mostrando {filtered.length} de {participants.length} colaboradores</span>
        </div>
      </div>

    </div>
  );
};
