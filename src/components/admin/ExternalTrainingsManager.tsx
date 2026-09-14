import React, { useState, useMemo, useEffect } from 'react';
import { 
  GraduationCap, 
  Search, 
  Plus, 
  Clock, 
  Users, 
  Building2, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Award, 
  Filter, 
  Sparkles, 
  Calendar, 
  FileCheck, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  BookOpen,
  Upload,
  Download,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  XCircle
} from 'lucide-react';
import { 
  ExternalTraining, 
  Participant, 
  Company, 
  UserAccount, 
  CreateExternalTrainingPayload 
} from '../../types';
import { ExternalTrainingModal } from './ExternalTrainingModal';
import { BulkExternalTrainingsModal } from './BulkExternalTrainingsModal';
import { 
  SUSTAINABILITY_PROGRAMS, 
  TRAINING_FORMATS,
  getProgramLabel, 
  getProgramShortName 
} from '../../constants/sustainabilityPrograms';
import { formatDateShort, formatCedula } from '../../utils/formatters';
import { 
  downloadExternalTrainingsTemplateExcel, 
  exportExternalTrainingsToExcel 
} from '../../utils/excelUtils';
import { apiService } from '../../services/api';

interface ExternalTrainingsManagerProps {
  trainings: ExternalTraining[];
  participants: Participant[];
  companies?: Company[];
  currentUser: UserAccount | null;
  onSaveTraining: (payload: CreateExternalTrainingPayload, isEdit?: boolean, editId?: string) => Promise<void>;
  onBulkSaveTrainings?: (trainings: CreateExternalTrainingPayload[]) => Promise<{ count: number; skippedCount: number; records: ExternalTraining[]; skipped: Array<{ row: number; item: any; reason: string }> }>;
  onDeleteTraining: (id: string) => Promise<void>;
  onShowToast?: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const ExternalTrainingsManager: React.FC<ExternalTrainingsManagerProps> = ({
  trainings,
  participants,
  companies = [],
  currentUser,
  onSaveTraining,
  onBulkSaveTrainings,
  onDeleteTraining,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgramFilter, setSelectedProgramFilter] = useState('all');
  const [selectedFormatFilter, setSelectedFormatFilter] = useState('all');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<ExternalTraining | null>(null);

  // Modal de confirmación de eliminación
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Participantes mapa por tarjeta para join rápido
  const participantsMap = useMemo(() => {
    const map = new Map<string, Participant>();
    participants.forEach(p => map.set(p.card, p));
    return map;
  }, [participants]);

  // Filtrado de capacitaciones
  // Filtrado de capacitaciones
  const filteredTrainings = useMemo(() => {
    return trainings.filter(t => {
      if (selectedProgramFilter !== 'all' && t.programCategory !== selectedProgramFilter) {
        return false;
      }
      if (selectedFormatFilter !== 'all' && t.trainingFormat !== selectedFormatFilter) {
        return false;
      }
      if (selectedCompanyFilter !== 'all' && t.companyId !== selectedCompanyFilter) {
        return false;
      }
      if (selectedStatusFilter !== 'all' && (t.academicStatus || 'passed') !== selectedStatusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const p = participantsMap.get(t.participantCard);
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchSupplier = (t.supplier || '').toLowerCase().includes(q);
        const matchCard = (t.participantCard || '').includes(q);
        const matchName = (p?.name || t.participantName || '').toLowerCase().includes(q);
        const matchCedula = (p?.cedula || t.participantCedula || '').includes(q);
        const matchSub = (t.subprogram || '').toLowerCase().includes(q);
        return matchTitle || matchSupplier || matchCard || matchName || matchCedula || matchSub;
      }
      return true;
    });
  }, [trainings, selectedProgramFilter, selectedFormatFilter, selectedCompanyFilter, selectedStatusFilter, searchQuery, participantsMap]);

  // Paginación y control de filtros
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedProgramFilter, selectedFormatFilter, selectedCompanyFilter, selectedStatusFilter]);

  const totalPages = Math.ceil(filteredTrainings.length / itemsPerPage) || 1;
  const paginatedTrainings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTrainings.slice(start, start + itemsPerPage);
  }, [filteredTrainings, currentPage, itemsPerPage]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedProgramFilter !== 'all' || selectedFormatFilter !== 'all' || selectedCompanyFilter !== 'all' || selectedStatusFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedProgramFilter('all');
    setSelectedFormatFilter('all');
    setSelectedCompanyFilter('all');
    setSelectedStatusFilter('all');
  };

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'passed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Aprobado</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Completado</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">En Curso</span>;
      case 'failed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">No Aprobado</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{status || 'Acreditado'}</span>;
    }
  };

  // KPIs
  const metrics = useMemo(() => {
    const totalCount = trainings.length;
    const totalHours = trainings.reduce((acc, t) => acc + (Number(t.totalHours) || 0), 0);
    const uniqueParticipants = new Set(trainings.map(t => t.participantCard)).size;
    const uniqueSuppliers = new Set(trainings.map(t => t.supplier.trim().toLowerCase())).size;

    return {
      totalCount,
      totalHours,
      uniqueParticipants,
      uniqueSuppliers
    };
  }, [trainings]);

  const handleOpenCreate = () => {
    setEditingTraining(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (training: ExternalTraining) => {
    setEditingTraining(training);
    setIsModalOpen(true);
  };

  const handleDownloadTemplate = () => {
    try {
      downloadExternalTrainingsTemplateExcel(participants);
      if (onShowToast) {
        onShowToast('Plantilla Descargada', 'Se descargó la plantilla oficial con el directorio de colaboradores.', 'success');
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('Error', 'No se pudo generar la plantilla: ' + err.message, 'error');
      }
    }
  };

  const handleExportExcel = () => {
    try {
      if (filteredTrainings.length === 0) {
        if (onShowToast) {
          onShowToast('Sin datos', 'No hay registros con los filtros actuales para exportar.', 'info');
        }
        return;
      }
      exportExternalTrainingsToExcel(filteredTrainings, participants);
      if (onShowToast) {
        onShowToast('Exportación Exitosa', `Se exportaron ${filteredTrainings.length} registros a Excel.`, 'success');
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('Error al exportar', err.message || 'Fallo al exportar a Excel.', 'error');
      }
    }
  };

  const handleBulkImport = async (trainingsToImport: CreateExternalTrainingPayload[]) => {
    if (onBulkSaveTrainings) {
      return await onBulkSaveTrainings(trainingsToImport);
    }
    const res = await apiService.bulkCreateExternalTrainings(
      trainingsToImport,
      currentUser?.companyId || 'emp_kasino',
      currentUser?.name || 'Super Administrador'
    );
    return res;
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await onDeleteTraining(deletingId);
      if (onShowToast) {
        onShowToast('Capacitación Eliminada', 'El registro externo se eliminó con éxito.', 'info');
      }
      setDeletingId(null);
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('Error', err.message || 'No se pudo eliminar.', 'error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Informativo & Acción Principal */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0F172A] to-slate-900 border border-slate-800 rounded-3xl p-6 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#DA291C] flex items-center justify-center text-white shadow-lg shadow-red-500/25 shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black tracking-tight text-white">
                Módulo de Capacitaciones Externas
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white uppercase tracking-wider">
                Externa
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                🌿 Sustentabilidad
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Registra y audita cursos, diplomados y certificaciones tomadas por los colaboradores con suplidores externos, integrando la taxonomía de sustentabilidad corporativa Claro.
            </p>
          </div>
        </div>

        {/* Acciones principales en Banner */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
            title="Descargar plantilla Excel para carga masiva"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Plantilla</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
            title="Exportar capacitaciones a Excel"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
            title="Importar historial de capacitaciones masivamente"
          >
            <Upload className="w-4 h-4" />
            <span>Carga Masiva</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-2xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-500/30 hover:shadow-red-500/40 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Capacitación</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Capacitaciones Externas</p>
            <p className="text-xl font-black text-slate-900">{metrics.totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Horas Acreditadas</p>
            <p className="text-xl font-black text-slate-900">{metrics.totalHours.toLocaleString()} hrs</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Colaboradores Beneficiados</p>
            <p className="text-xl font-black text-slate-900">{metrics.uniqueParticipants}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Suplidores Educativos</p>
            <p className="text-xl font-black text-slate-900">{metrics.uniqueSuppliers}</p>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Buscador */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por colaborador, cédula, tarjeta, capacitación o suplidor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800"
            />
          </div>

          {/* Filtro por Programa de Sustentabilidad */}
          <div className="w-full sm:w-56">
            <select
              value={selectedProgramFilter}
              onChange={(e) => setSelectedProgramFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-700 bg-white"
            >
              <option value="all">🌿 Todos los Programas ({trainings.length})</option>
              {SUSTAINABILITY_PROGRAMS.map(prog => (
                <option key={prog.id} value={prog.id}>
                  {prog.shortName}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Formato de Capacitación */}
          <div className="w-full sm:w-40">
            <select
              value={selectedFormatFilter}
              onChange={(e) => setSelectedFormatFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-700 bg-white"
            >
              <option value="all">📑 Todos los Formatos</option>
              {TRAINING_FORMATS.map(fmt => (
                <option key={fmt} value={fmt}>
                  {fmt}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Estatus Académico */}
          <div className="w-full sm:w-40">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-700 bg-white"
            >
              <option value="all">🎓 Todos los Estados</option>
              <option value="passed">Aprobado / Certificado</option>
              <option value="completed">Completado / Asistencia</option>
              <option value="in_progress">En Curso</option>
              <option value="failed">No Aprobado</option>
            </select>
          </div>

          {/* Filtro por Empresa */}
          {companies.length > 0 && (
            <div className="w-full sm:w-40">
              <select
                value={selectedCompanyFilter}
                onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-700 bg-white"
              >
                <option value="all">🏢 Todas las Empresas</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Botón Reset de Filtros */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Restablecer todos los filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Capacitaciones Externas */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-900">
              Registros de Formación Externa
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {filteredTrainings.length} encontrados
            </span>
          </div>
        </div>

        {filteredTrainings.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <GraduationCap className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No hay capacitaciones externas registradas</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedProgramFilter !== 'all'
                ? 'No se encontraron resultados con los filtros actuales.'
                : 'Comienza haciendo clic en "Registrar Capacitación Externa" para acreditar cursos y certificaciones tomadas fuera del sistema.'}
            </p>
            {(!searchQuery && selectedProgramFilter === 'all') && (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 text-xs font-bold text-white bg-[#DA291C] hover:bg-red-700 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Registrar Primera Capacitación
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
              <thead className="bg-slate-50 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Colaborador</th>
                  <th className="py-3.5 px-4">Capacitación Externa</th>
                  <th className="py-3.5 px-4">Sustentabilidad</th>
                  <th className="py-3.5 px-4">Duración & Fechas</th>
                  <th className="py-3.5 px-4">Acreditación</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedTrainings.map(item => {
                  const part = participantsMap.get(item.participantCard);
                  const pName = part?.name || item.participantName || 'Colaborador';
                  const pCedula = part?.cedula || item.participantCedula;
                  const pDept = part?.department || item.participantDepartment || 'General';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Colaborador */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {pName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{pName}</p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              Tarj: #{item.participantCard} {pCedula && `• ${formatCedula(pCedula)}`}
                            </p>
                            <span className="text-[10px] text-slate-400 block">{pDept}</span>
                          </div>
                        </div>
                      </td>

                      {/* Capacitación */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 max-w-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                              Externa
                            </span>
                            <span className="font-bold text-slate-900 leading-tight">
                              {item.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {item.supplier}
                            </span>
                            <span>• {item.trainingFormat}</span>
                            <span>• {item.modality}</span>
                          </div>
                        </div>
                      </td>

                      {/* Sustentabilidad */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 max-w-[200px]">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {getProgramShortName(item.programCategory)}
                          </span>
                          <p className="text-[11px] text-slate-600 truncate" title={item.subprogram}>
                            {item.subprogram}
                          </p>
                          <span className="text-[10px] text-slate-400 block">
                            {item.sessionType} • {item.trainingType}
                          </span>
                        </div>
                      </td>

                      {/* Duración & Fechas */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-slate-900 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#DA291C]" />
                            {item.totalHours} hrs
                          </span>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {formatDateShort(item.startDate)} → {formatDateShort(item.endDate)}
                          </p>
                        </div>
                      </td>

                      {/* Acreditación */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {renderStatusBadge(item.academicStatus)}
                            {item.score !== null && item.score !== undefined && (
                              <span className="text-[11px] font-bold text-slate-700 font-mono">
                                ({item.score} pts)
                              </span>
                            )}
                          </div>
                          {item.certificateNumber && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              Folio: {item.certificateNumber}
                            </p>
                          )}
                          {item.credentialUrl && (
                            <a
                              href={item.credentialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold cursor-pointer"
                              title="Ver credencial oficial"
                            >
                              <ExternalLink className="w-3 h-3" /> Ver Certificado
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.credentialUrl && (
                            <a
                              href={item.credentialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Abrir credencial externa"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Editar capacitación"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingId(item.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Eliminar capacitación"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {filteredTrainings.length > itemsPerPage && (
            <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs text-slate-500 font-medium">
                Mostrando <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> a{' '}
                <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredTrainings.length)}</strong> de{' '}
                <strong className="text-slate-800">{filteredTrainings.length}</strong> capacitaciones
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pNum => {
                    if (
                      pNum === 1 || 
                      pNum === totalPages || 
                      (pNum >= currentPage - 1 && pNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pNum}
                          type="button"
                          onClick={() => setCurrentPage(pNum)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentPage === pNum
                              ? 'bg-[#DA291C] text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    } else if (pNum === currentPage - 2 || pNum === currentPage + 2) {
                      return <span key={pNum} className="text-slate-400 text-xs px-0.5">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>

      {/* Modal de Registro / Edición */}
      {isModalOpen && (
        <ExternalTrainingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={onSaveTraining}
          editingTraining={editingTraining}
          participants={participants}
          companies={companies}
          currentUser={currentUser}
        />
      )}

      {/* Modal de Carga Masiva de Histórico */}
      {isBulkModalOpen && (
        <BulkExternalTrainingsModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          participants={participants}
          companies={companies}
          currentUser={currentUser}
          onBulkImport={handleBulkImport}
          onShowToast={onShowToast || (() => {})}
        />
      )}

      {/* Modal de Confirmación de Eliminación */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">¿Eliminar Capacitación Externa?</h3>
              <p className="text-xs text-slate-500">
                Esta acción removerá el registro externo y las horas acreditadas del colaborador. No se puede deshacer.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
