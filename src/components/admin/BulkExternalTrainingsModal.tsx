import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  Clipboard,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Building2,
  Clock,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { Participant, Company, UserAccount, ExternalTraining, CreateExternalTrainingPayload } from '../../types';
import {
  downloadExternalTrainingsTemplateExcel,
  parseExternalTrainingsExcelFile,
  parseExternalTrainingsFromText
} from '../../utils/excelUtils';
import { getProgramShortName } from '../../constants/sustainabilityPrograms';
import { formatDateShort, formatCedula } from '../../utils/formatters';
import { AccessibleModal } from '../common/AccessibleModal';

interface BulkExternalTrainingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  companies?: Company[];
  currentUser?: UserAccount | null;
  isSuperAdmin?: boolean;
  onBulkImport: (
    trainings: CreateExternalTrainingPayload[]
  ) => Promise<{ count: number; skippedCount: number; records: ExternalTraining[]; skipped: Array<{ row: number; item: any; reason: string }> }>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

type TabType = 'excel' | 'text';

export const BulkExternalTrainingsModal: React.FC<BulkExternalTrainingsModalProps> = ({
  isOpen,
  onClose,
  participants,
  companies = [],
  currentUser,
  isSuperAdmin = true,
  onBulkImport,
  onShowToast
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<TabType>('excel');

  // Excel state
  const [excelTrainings, setExcelTrainings] = useState<CreateExternalTrainingPayload[]>([]);
  const [excelErrors, setExcelErrors] = useState<Array<{ row: number; reason: string }>>([]);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [loadedFileSize, setLoadedFileSize] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Text state
  const [rawText, setRawText] = useState('');
  const [textTrainings, setTextTrainings] = useState<CreateExternalTrainingPayload[]>([]);
  const [textErrors, setTextErrors] = useState<Array<{ line: number; reason: string }>>([]);

  // UI state
  const [showErrorsList, setShowErrorsList] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Colaboradores activos
  const activeTrainings = activeTab === 'excel' ? excelTrainings : textTrainings;
  const activeErrors = activeTab === 'excel' ? excelErrors.map(e => ({ line: e.row, reason: e.reason })) : textErrors;

  // Renderizador semántico de estatus
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
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{status || 'Finalizado'}</span>;
    }
  };

  // Manejador de carga de archivo Excel
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingFile(true);
      const { validTrainings, invalidRows } = await parseExternalTrainingsExcelFile(file, participants);
      setExcelTrainings(validTrainings);
      setExcelErrors(invalidRows.map(r => ({ row: r.row, reason: r.reason })));
      setLoadedFileName(file.name);
      const sizeKb = (file.size / 1024).toFixed(1);
      setLoadedFileSize(`${sizeKb} KB`);

      if (validTrainings.length === 0 && invalidRows.length > 0) {
        onShowToast('Sin registros válidos', invalidRows[0].reason, 'error');
      } else {
        onShowToast(
          'Archivo Analizado',
          `Se detectaron ${validTrainings.length} capacitaciones válidas y ${invalidRows.length} filas con advertencias.`,
          'info'
        );
      }
    } catch (err: any) {
      onShowToast('Error al leer archivo', err.message || 'El formato del archivo no es compatible.', 'error');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Limpiar archivo Excel cargado
  const handleClearExcelFile = () => {
    setExcelTrainings([]);
    setExcelErrors([]);
    setLoadedFileName(null);
    setLoadedFileSize(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Manejador de texto pegado
  const handleTextChange = (val: string) => {
    setRawText(val);
    if (!val.trim()) {
      setTextTrainings([]);
      setTextErrors([]);
      return;
    }
    const { validTrainings, invalidRows } = parseExternalTrainingsFromText(val, participants);
    setTextTrainings(validTrainings);
    setTextErrors(invalidRows);
  };

  // Descarga de plantilla
  const handleDownloadTemplate = () => {
    try {
      downloadExternalTrainingsTemplateExcel(participants);
      onShowToast('Plantilla Descargada', 'Se descargó la plantilla oficial con el directorio de colaboradores.', 'success');
    } catch (err: any) {
      onShowToast('Error', 'No se pudo generar la plantilla: ' + err.message, 'error');
    }
  };

  // Confirmar importación
  const handleConfirmImport = async () => {
    if (activeTrainings.length === 0) {
      onShowToast('Sin capacitaciones', 'No hay registros válidos para importar.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onBulkImport(activeTrainings);
      onShowToast(
        'Carga Masiva Exitosa',
        `Se registraron ${result.count} capacitaciones externas.${result.skippedCount > 0 ? ` (${result.skippedCount} omitidas)` : ''}`,
        'success'
      );
      onClose();
    } catch (err: any) {
      onShowToast('Error al importar', err.message || 'Ocurrió un error al guardar los registros.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Importación Masiva de Capacitaciones Externas"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full overflow-hidden flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* Header con gradiente institucional */}
        <div className="bg-gradient-to-r from-slate-900 via-[#0F172A] to-slate-900 p-5 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#DA291C] flex items-center justify-center text-white shadow-lg shadow-red-500/25 shrink-0">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Carga Masiva de Histórico de Capacitaciones Externas
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white uppercase tracking-wider shadow-xs">
                  Masivo
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  🌿 Sustentabilidad
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Importa en lote los históricos de cursos, diplomados y certificaciones tomadas por los colaboradores fuera de la plataforma, asociándolos automáticamente por Cédula, Tarjeta o Correo.
              </p>
            </div>
          </div>

          {/* Selector de pestañas */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-800 flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => setActiveTab('excel')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'excel'
                    ? 'bg-[#DA291C] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Archivo Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'text'
                    ? 'bg-[#DA291C] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Pegar desde Portapapeles</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Descargar Plantilla Oficial Excel</span>
            </button>
          </div>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: ARCHIVO EXCEL */}
          {activeTab === 'excel' && (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls"
                className="hidden"
              />

              {loadedFileName ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-bold text-slate-900 truncate max-w-sm">{loadedFileName}</p>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                          Procesado
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Tamaño: {loadedFileSize} • <strong className="text-emerald-700">{excelTrainings.length}</strong> válidas • <strong className="text-amber-700">{excelErrors.length}</strong> advertencias
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Cambiar Archivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearExcelFile}
                      className="px-3 py-2 text-xs font-bold text-red-700 hover:text-red-900 hover:bg-red-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1 border border-red-200 bg-red-50/50"
                      title="Quitar archivo cargado"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Quitar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-[#DA291C] rounded-2xl p-8 text-center bg-slate-50/60 hover:bg-red-50/20 transition-all cursor-pointer group flex flex-col items-center justify-center space-y-2.5"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center text-[#DA291C] group-hover:scale-110 transition-transform">
                    {isProcessingFile ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-[#DA291C]" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">
                      {isProcessingFile ? 'Analizando archivo Excel...' : 'Haz clic o arrastra tu archivo Excel aquí'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Soporta formatos <strong className="text-slate-700">.xlsx</strong> y <strong className="text-slate-700">.xls</strong> con columnas de identificación, título, fechas y horas.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DA291C] bg-red-50 px-3 py-1 rounded-full border border-red-200">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Seleccionar Archivo
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEXTO PEGADO */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">
                  Pega filas copiadas de Excel o Google Sheets separadas por tabulación:
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Columnas mínimas: Identificación (Cédula/Tarj/Email) y Título de capacitación
                </span>
              </div>
              <textarea
                rows={6}
                value={rawText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="402-2194060-0&#9;Certificación AWS Solutions Architect&#9;Amazon&#9;Tecnología&#9;Desarrollo de software&#9;Certificación&#9;2026-08-01&#9;2026-08-25&#9;48&#9;Aprobado"
                className="w-full p-3.5 text-xs font-mono rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C] text-slate-800 bg-slate-50/50"
              />
            </div>
          )}

          {/* Resumen de análisis (Valid vs Invalid) */}
          {(activeTrainings.length > 0 || activeErrors.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Capacitaciones Válidas</p>
                  <p className="text-xl font-black text-emerald-950">{activeTrainings.length}</p>
                </div>
              </div>

              <div className={`border rounded-2xl p-4 flex items-center justify-between gap-3.5 ${
                activeErrors.length > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-xs ${
                    activeErrors.length > 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${
                      activeErrors.length > 0 ? 'text-amber-800' : 'text-slate-500'
                    }`}>Filas con Advertencias</p>
                    <p className={`text-xl font-black ${
                      activeErrors.length > 0 ? 'text-amber-950' : 'text-slate-700'
                    }`}>{activeErrors.length}</p>
                  </div>
                </div>

                {activeErrors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowErrorsList(!showErrorsList)}
                    className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showErrorsList ? 'Ocultar' : 'Ver Detalle'}</span>
                    {showErrorsList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Desglose de Errores / Advertencias */}
          {activeErrors.length > 0 && showErrorsList && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-2 animate-in fade-in">
              <p className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Filas que no pudieron ser procesadas (se omitirán):
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1.5 text-[11px] text-amber-800 font-mono pr-2">
                {activeErrors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 bg-white/70 p-2 rounded-lg border border-amber-100">
                    <span className="font-bold text-amber-900 shrink-0">Fila {err.line}:</span>
                    <span>{err.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Previsualización de Registros Válidos */}
          {activeTrainings.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#DA291C]" />
                  Previsualización de Capacitaciones a Importar ({activeTrainings.length})
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  Se asociarán automáticamente al padrón oficial
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">Colaborador Asociado</th>
                        <th className="py-2.5 px-3">Capacitación Externa</th>
                        <th className="py-2.5 px-3">Programa Sustentabilidad</th>
                        <th className="py-2.5 px-3">Fechas & Horas</th>
                        <th className="py-2.5 px-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-[11px]">
                      {activeTrainings.slice(0, 50).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-900">{item.participantName || 'Colaborador'}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              Tarj: #{item.participantCard} {item.participantCedula && `• Céd: ${formatCedula(item.participantCedula)}`}
                            </p>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs">
                            <p className="font-bold text-slate-900 line-clamp-1">{item.title}</p>
                            <span className="text-[10px] text-slate-500 block">{item.supplier} • {item.trainingFormat}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {getProgramShortName(item.programCategory)}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate max-w-[150px] font-medium">{item.subprogram}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#DA291C]" /> {item.totalHours} hrs
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {formatDateShort(item.startDate)} → {formatDateShort(item.endDate)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {renderStatusBadge(item.academicStatus)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {activeTrainings.length > 50 && (
                  <div className="p-2.5 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-100 font-medium">
                    Mostrando las primeras 50 de {activeTrainings.length} capacitaciones detectadas.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between flex-wrap gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isSubmitting || activeTrainings.length === 0}
              className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#DA291C] to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl shadow-md shadow-red-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importando registros...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Importar {activeTrainings.length} Capacitaciones</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </AccessibleModal>
  );
};
