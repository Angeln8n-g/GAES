import React, { useState } from 'react';
import { 
  Calendar, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  BarChart3, 
  BookOpen, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ChevronRight,
  Percent,
  Layers,
  Building2
} from 'lucide-react';
import { TrainingProgram, TrainingEvent, Participant, ParticipantGroup, Company, UserAccount } from '../../types';
import { apiService } from '../../services/api';
import { formatDateLong } from '../../utils/formatters';
import { getGroupColorTheme } from './GroupsManager';
import { ProgramFormModal } from './ProgramFormModal';
import { ComplianceTrackerModal } from './ComplianceTrackerModal';

interface ProgramsManagerProps {
  programs: TrainingProgram[];
  events: TrainingEvent[];
  participants: Participant[];
  groups: ParticipantGroup[];
  companies?: Company[];
  currentUser?: UserAccount | null;
  isSuperAdmin?: boolean;
  onSaveProgram: (program: TrainingProgram) => Promise<void>;
  onDeleteProgram: (programId: string) => Promise<void>;
  onSendNotification?: (eventId: string, channel: 'Email' | 'Teams' | 'WhatsApp', message: string, recipients: number) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const ProgramsManager: React.FC<ProgramsManagerProps> = ({
  programs,
  events,
  participants,
  groups,
  companies = [],
  currentUser,
  isSuperAdmin = true,
  onSaveProgram,
  onDeleteProgram,
  onSendNotification,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
  const [trackerProgram, setTrackerProgram] = useState<TrainingProgram | null>(null);

  const filteredPrograms = programs.filter(prog => {
    const q = searchQuery.toLowerCase();
    const pCompany = prog.companyId || 'emp_kasino';
    if (selectedCompanyFilter !== 'all' && pCompany !== selectedCompanyFilter) {
      return false;
    }
    const matchesSearch = prog.title.toLowerCase().includes(q) || prog.description.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || prog.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingProgram(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (prog: TrainingProgram) => {
    setEditingProgram(prog);
    setIsFormOpen(true);
  };

  const handleDelete = async (prog: TrainingProgram) => {
    if (!window.confirm(`¿Estás seguro de eliminar el cronograma "${prog.title}"?`)) {
      return;
    }
    try {
      await onDeleteProgram(prog.id);
      onShowToast('Cronograma eliminado', 'El programa formativo ha sido retirado.', 'info');
    } catch (err: any) {
      onShowToast('Error', err.message || 'No se pudo eliminar el cronograma.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        {/* Search & Filter */}
        <div className="flex flex-1 items-center gap-3 max-w-xl flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3.5 my-auto" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cronogramas por título o descripción..."
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#DA291C]"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="draft">Borradores</option>
            <option value="completed">Finalizados</option>
          </select>
        </div>

        {/* Create Button */}
        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-extrabold rounded-2xl shadow-md shadow-red-500/25 flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Cronograma</span>
        </button>

      </div>

      {/* Programs List */}
      {filteredPrograms.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-pulse" />
          <h3 className="text-base font-black text-slate-800">No se encontraron cronogramas</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Crea tu primer cronograma de capacitaciones para estructurar programas obligatorios dirigidos a grupos de colaboradores.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Crear Primer Cronograma
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPrograms.map(prog => {
            // Calcular métricas de cumplimiento rápidas
            const compliance = apiService.calculateProgramCompliance(prog, events, participants, groups);
            const targetGroups = groups.filter(g => prog.targetGroupIds.includes(g.id));
            const mandatoryCount = prog.eventItems.filter(e => e.isMandatory).length;
            const optionalCount = prog.eventItems.length - mandatoryCount;
            const comp = companies.find(c => c.id === (prog.companyId || 'emp_kasino'));

            const isExpired = new Date(prog.endDate) < new Date();

            return (
              <div
                key={prog.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 hover:shadow transition-all group"
              >
                <div>
                  
                  {/* Status & Dates Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                        prog.status === 'active' 
                          ? isExpired 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {prog.status === 'active' ? (isExpired ? 'Vencido' : 'Activo') : prog.status}
                      </span>

                      {comp && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-[#DA291C]" />
                          {comp.name}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#DA291C]" />
                      Límite: <strong className="text-slate-800">{formatDateLong(prog.endDate)}</strong>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-black text-slate-900 group-hover:text-[#DA291C] transition-colors">
                    {prog.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {prog.description || 'Sin descripción especificada.'}
                  </p>

                  {/* Target Groups Chips */}
                  <div className="mt-4 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" /> Grupos:
                    </span>
                    {targetGroups.length > 0 ? (
                      targetGroups.map(g => {
                        const theme = getGroupColorTheme(g.color);
                        return (
                          <span
                            key={g.id}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${theme.bg} ${theme.text} ${theme.border}`}
                          >
                            {g.name}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Sin grupos asignados</span>
                    )}
                  </div>

                  {/* Courses Preview */}
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-[#DA291C]" />
                      <strong className="text-slate-900 font-bold">{prog.eventItems.length}</strong> capacitaciones ({mandatoryCount} obligatorias{optionalCount > 0 ? `, ${optionalCount} opcionales` : ''})
                    </span>
                  </div>

                  {/* Compliance Progress Bar Card */}
                  <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-[#DA291C]" />
                        Cumplimiento de los Participantes
                      </span>
                      <span className="font-black text-[#DA291C] text-sm">
                        {compliance.overallPercentage}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          compliance.overallPercentage === 100 ? 'bg-emerald-600' : 'bg-[#DA291C]'
                        }`}
                        style={{ width: `${compliance.overallPercentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-medium">
                      <span>
                        <strong className="text-emerald-700">{compliance.completedCount}</strong> completados de {compliance.totalParticipants}
                      </span>
                      <span>
                        <strong className="text-amber-700">{compliance.inProgressCount}</strong> en curso • <strong className="text-rose-700">{compliance.overdueCount}</strong> atrasados
                      </span>
                    </div>
                  </div>

                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setTrackerProgram(prog)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-[#DA291C] border border-red-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Ver Matriz de Cumplimiento</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(prog)}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Editar cronograma"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(prog)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Eliminar cronograma"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Program Form Modal */}
      {isFormOpen && (
        <ProgramFormModal
          program={editingProgram}
          events={events}
          groups={groups}
          companies={companies}
          currentUser={currentUser}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setIsFormOpen(false)}
          onSave={onSaveProgram}
          onShowToast={onShowToast}
        />
      )}

      {/* Compliance Tracker Modal */}
      {trackerProgram && (
        <ComplianceTrackerModal
          program={trackerProgram}
          events={events}
          participants={participants}
          groups={groups}
          onClose={() => setTrackerProgram(null)}
          onSendNotification={onSendNotification}
          onShowToast={onShowToast}
        />
      )}

    </div>
  );
};
