import React, { useState, useEffect } from 'react';
import { 
  Award, 
  X, 
  Search, 
  PlusCircle, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  Building2, 
  Clock, 
  Share2, 
  Trash2, 
  Ban, 
  Check, 
  Users, 
  BookOpen, 
  RefreshCw 
} from 'lucide-react';
import { apiService } from '../../services/api';
import { 
  Certificate, 
  TrainingEvent, 
  TechnicalAcademyCohort, 
  GenerateCertificatesPayload,
  UserAccount 
} from '../../types';
import { CertificateViewModal } from './CertificateViewModal';

interface CertificatesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  events: TrainingEvent[];
  technicalCohorts: TechnicalAcademyCohort[];
  onCertificatesUpdated?: () => void;
}

export const CertificatesManagementModal: React.FC<CertificatesManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  events,
  technicalCohorts,
  onCertificatesUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'generate'>('list');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Estado para la emisión
  const [genMode, setGenMode] = useState<'event' | 'cohort' | 'single'>('event');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [instructorOverride, setInstructorOverride] = useState<string>('');
  
  // Emisión individual
  const [singleForm, setSingleForm] = useState({
    recipientName: '',
    recipientCedula: '',
    recipientEmail: '',
    recipientCompany: 'Claro Dominicana',
    courseName: '',
    modality: 'Presencial',
    durationHours: 8,
    score: 100,
    instructorName: '',
    instructorTitle: 'Facilitador del Programa'
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal para ver certificado seleccionado
  const [viewingCertificate, setViewingCertificate] = useState<Certificate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role === 'Super Administrador';

  // Cargar lista de certificados
  const loadCertificates = async () => {
    setLoading(true);
    try {
      const data = await apiService.getCertificates({
        search: searchTerm,
        status: statusFilter === 'all' ? undefined : statusFilter
      });
      setCertificates(data);
    } catch (err: any) {
      console.error('Error al cargar certificados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCertificates();
    }
  }, [isOpen, searchTerm, statusFilter]);

  if (!isOpen) return null;

  // Manejar generación
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const payload: GenerateCertificatesPayload = {
        mode: genMode,
        certificateTitle: customTitle || undefined,
        instructorName: instructorOverride || undefined
      };

      if (genMode === 'event') {
        if (!selectedEventId) {
          setMessage({ type: 'error', text: 'Por favor selecciona un evento formativo.' });
          setIsSubmitting(false);
          return;
        }
        payload.eventId = selectedEventId;
      } else if (genMode === 'cohort') {
        if (!selectedCohortId) {
          setMessage({ type: 'error', text: 'Por favor selecciona una cohorte de la Academia Técnica.' });
          setIsSubmitting(false);
          return;
        }
        payload.cohortId = selectedCohortId;
      } else if (genMode === 'single') {
        if (!singleForm.recipientName || !singleForm.courseName) {
          setMessage({ type: 'error', text: 'Nombre del participante y del curso son obligatorios.' });
          setIsSubmitting(false);
          return;
        }
        payload.singleCertificate = {
          recipientName: singleForm.recipientName,
          recipientCedula: singleForm.recipientCedula,
          recipientEmail: singleForm.recipientEmail,
          recipientCompany: singleForm.recipientCompany,
          courseName: singleForm.courseName,
          modality: singleForm.modality,
          durationHours: Number(singleForm.durationHours) || 8,
          score: singleForm.score ? Number(singleForm.score) : null,
          instructorName: singleForm.instructorName || 'Instructor Certificado Claro',
          instructorTitle: singleForm.instructorTitle || 'Facilitador del Programa'
        };
      }

      const res = await apiService.generateCertificates(payload);
      setMessage({ type: 'success', text: res.message || 'Certificados emitidos con éxito.' });
      loadCertificates();
      if (onCertificatesUpdated) onCertificatesUpdated();

      // Reset
      if (genMode === 'single') {
        setSingleForm({
          recipientName: '',
          recipientCedula: '',
          recipientEmail: '',
          recipientCompany: 'Claro Dominicana',
          courseName: '',
          modality: 'Presencial',
          durationHours: 8,
          score: 100,
          instructorName: '',
          instructorTitle: 'Facilitador del Programa'
        });
      }
      setTimeout(() => setActiveTab('list'), 1500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al emitir certificados.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (cert: Certificate) => {
    const reason = prompt('Indica el motivo de la revocación del certificado:');
    if (!reason) return;

    try {
      await apiService.revokeCertificate(cert.id, reason);
      loadCertificates();
      if (onCertificatesUpdated) onCertificatesUpdated();
    } catch (err: any) {
      alert(err.message || 'Error al revocar certificado');
    }
  };

  const handleDelete = async (cert: Certificate) => {
    if (!confirm(`¿Estás seguro de eliminar el certificado ${cert.credentialId}? Esta acción no se puede deshacer.`)) return;

    try {
      await apiService.deleteCertificate(cert.id);
      loadCertificates();
      if (onCertificatesUpdated) onCertificatesUpdated();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar certificado');
    }
  };

  const handleCopyLink = async (cert: Certificate) => {
    const url = cert.verificationUrl || `${window.location.origin}/?cert=${cert.credentialId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(cert.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert(`URL: ${url}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] my-auto">
        
        {/* Cabecera del Panel */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#DA291C] flex items-center justify-center shadow-md">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-white">
                Gestión de Certificados y Diplomas Oficiales
              </h2>
              <p className="text-xs text-slate-400">
                Emisión automatizada con código QR antifraude y validación pública
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('list')}
              className={`py-3.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === 'list'
                  ? 'border-[#DA291C] text-[#DA291C]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Certificados Emitidos ({certificates.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('generate')}
              className={`py-3.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === 'generate'
                  ? 'border-[#DA291C] text-[#DA291C]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Emitir Nuevos Certificados</span>
            </button>
          </div>

          {activeTab === 'list' && (
            <button
              onClick={loadCertificates}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 inline-flex items-center space-x-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          )}
        </div>

        {/* MENSAJES DE ESTADO */}
        {message && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center space-x-2">
              {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* TAB 1: LISTADO DE CERTIFICADOS */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              
              {/* Barra de Búsqueda y Filtros */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por titular, cédula, curso o credencial..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-[#DA291C]"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="active">Activos / Válidos</option>
                  <option value="revoked">Revocados</option>
                </select>
              </div>

              {/* Tabla de Certificados */}
              {loading ? (
                <div className="py-16 text-center text-xs text-slate-500">
                  <div className="w-8 h-8 border-3 border-slate-200 border-t-[#DA291C] rounded-full animate-spin mx-auto mb-2" />
                  Cargando certificados emitidos...
                </div>
              ) : certificates.length === 0 ? (
                <div className="py-16 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                  <Award className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No hay certificados emitidos
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Cambia a la pestaña "Emitir Nuevos Certificados" para generar diplomas de eventos o de la Academia Técnica.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/75 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                        <th className="py-3 px-4">Credencial</th>
                        <th className="py-3 px-4">Titular & Cédula</th>
                        <th className="py-3 px-4">Curso / Capacitación</th>
                        <th className="py-3 px-4">Horas</th>
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {certificates.map((cert) => {
                        const isRevoked = cert.status === 'revoked';
                        return (
                          <tr key={cert.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                              {cert.credentialId}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                                {cert.recipientName}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {cert.recipientCedula} • {cert.recipientCompany || 'Claro'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-[#DA291C] block line-clamp-1">
                                {cert.courseName}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {cert.modality}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                              {cert.durationHours}h
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {cert.issueDate}
                            </td>
                            <td className="py-3 px-4">
                              {isRevoked ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
                                  Revocado
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  Válido
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => setViewingCertificate(cert)}
                                title="Ver e Imprimir Diploma"
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-bold transition-colors"
                              >
                                Ver Diploma
                              </button>

                              <button
                                onClick={() => handleCopyLink(cert)}
                                title="Copiar enlace público de verificación"
                                className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded transition-colors inline-block"
                              >
                                {copiedId === cert.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                              </button>

                              {isSuperAdmin && !isRevoked && (
                                <button
                                  onClick={() => handleRevoke(cert)}
                                  title="Revocar certificado"
                                  className="p-1 text-amber-600 hover:text-amber-800 rounded transition-colors inline-block"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isSuperAdmin && (
                                <button
                                  onClick={() => handleDelete(cert)}
                                  title="Eliminar registro"
                                  className="p-1 text-red-500 hover:text-red-700 rounded transition-colors inline-block"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: EMISIÓN DE NUEVOS CERTIFICADOS */}
          {activeTab === 'generate' && (
            <form onSubmit={handleGenerate} className="space-y-6 max-w-2xl mx-auto">
              
              {/* Selector de Modo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Selecciona el Origen de la Capacitación
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setGenMode('event')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      genMode === 'event'
                        ? 'border-[#DA291C] bg-red-50/50 dark:bg-red-950/20 text-[#DA291C] font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <Calendar className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs block">Por Evento Realizado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenMode('cohort')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      genMode === 'cohort'
                        ? 'border-[#DA291C] bg-red-50/50 dark:bg-red-950/20 text-[#DA291C] font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <BookOpen className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs block">Academia Técnica</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenMode('single')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      genMode === 'single'
                        ? 'border-[#DA291C] bg-red-50/50 dark:bg-red-950/20 text-[#DA291C] font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <Users className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs block">Emisión Individual</span>
                  </button>
                </div>
              </div>

              {/* MODO: EVENTO */}
              {genMode === 'event' && (
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Selecciona la Capacitación / Evento:
                    </label>
                    <select
                      value={selectedEventId}
                      onChange={(e) => setSelectedEventId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      required
                    >
                      <option value="">-- Elige un evento --</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title} ({ev.instructor || 'Instructor Claro'})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Se emitirá automáticamente un certificado oficial para cada participante inscrito con registro o asistencia confirmada.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Título personalizado (Opcional):
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Certificado de Aprobación"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Nombre del Facilitador (Opcional):
                      </label>
                      <input
                        type="text"
                        placeholder="Dejar vacío para usar el del evento"
                        value={instructorOverride}
                        onChange={(e) => setInstructorOverride(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MODO: COHORTE TÉCNICA */}
              {genMode === 'cohort' && (
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Selecciona la Cohorte de la Academia Técnica:
                    </label>
                    <select
                      value={selectedCohortId}
                      onChange={(e) => setSelectedCohortId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      required
                    >
                      <option value="">-- Elige una cohorte técnica --</option>
                      {technicalCohorts.map((coh) => (
                        <option key={coh.id} value={coh.id}>
                          {coh.courseTitle || coh.id} ({coh.facilitatorName || 'Instructor'}) — {coh.startDate}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Se generará el Diploma de Acreditación Técnica con código QR para los alumnos matriculados en esta cohorte.
                    </p>
                  </div>
                </div>
              )}

              {/* MODO: INDIVIDUAL */}
              {genMode === 'single' && (
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nombre Completo del Participante *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Juan Pérez Rosario"
                        value={singleForm.recipientName}
                        onChange={(e) => setSingleForm({ ...singleForm, recipientName: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Cédula de Identidad *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="001-XXXXXXX-X"
                        value={singleForm.recipientCedula}
                        onChange={(e) => setSingleForm({ ...singleForm, recipientCedula: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        placeholder="juan.perez@claro.com.do"
                        value={singleForm.recipientEmail}
                        onChange={(e) => setSingleForm({ ...singleForm, recipientEmail: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Empresa / Contratista
                      </label>
                      <input
                        type="text"
                        placeholder="Claro Dominicana"
                        value={singleForm.recipientCompany}
                        onChange={(e) => setSingleForm({ ...singleForm, recipientCompany: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nombre del Curso / Capacitación *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Curso Técnico de Fusión y Empalmes de Fibra Óptica"
                      value={singleForm.courseName}
                      onChange={(e) => setSingleForm({ ...singleForm, courseName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Modalidad
                      </label>
                      <select
                        value={singleForm.modality}
                        onChange={(e) => setSingleForm({ ...singleForm, modality: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      >
                        <option value="Presencial">Presencial</option>
                        <option value="Virtual">Virtual</option>
                        <option value="Híbrido">Híbrido</option>
                        <option value="Taller de Campo">Taller de Campo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Horas Totales
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={singleForm.durationHours}
                        onChange={(e) => setSingleForm({ ...singleForm, durationHours: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Calificación (0 - 100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={singleForm.score}
                        onChange={(e) => setSingleForm({ ...singleForm, score: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Nombre del Instructor
                      </label>
                      <input
                        type="text"
                        placeholder="Instructor Certificado Claro"
                        value={singleForm.instructorName}
                        onChange={(e) => setSingleForm({ ...singleForm, instructorName: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Cargo del Instructor
                      </label>
                      <input
                        type="text"
                        placeholder="Facilitador del Programa"
                        value={singleForm.instructorTitle}
                        onChange={(e) => setSingleForm({ ...singleForm, instructorTitle: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Botón de Envío */}
              <div className="text-right">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#DA291C] hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl shadow-md transition-colors text-xs disabled:opacity-50 inline-flex items-center space-x-2"
                >
                  <Award className="w-4 h-4" />
                  <span>{isSubmitting ? 'Generando Certificados...' : 'Emitir Certificados Oficiales'}</span>
                </button>
              </div>

            </form>
          )}

        </div>

      </div>

      {/* Modal para previsualizar diploma */}
      {viewingCertificate && (
        <CertificateViewModal
          certificate={viewingCertificate}
          isOpen={!!viewingCertificate}
          onClose={() => setViewingCertificate(null)}
        />
      )}
    </div>
  );
};
