import React, { useState, useEffect } from 'react';
import { 
  Award, 
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
  RefreshCw,
  ExternalLink
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

interface CertificatesManagerProps {
  currentUser: UserAccount | null;
  events: TrainingEvent[];
  technicalCohorts?: TechnicalAcademyCohort[];
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const CertificatesManager: React.FC<CertificatesManagerProps> = ({
  currentUser,
  events,
  technicalCohorts = [],
  onShowToast
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
    loadCertificates();
  }, [searchTerm, statusFilter]);

  // Manejar generación
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: GenerateCertificatesPayload = {
        mode: genMode,
        certificateTitle: customTitle || undefined,
        instructorName: instructorOverride || undefined
      };

      if (genMode === 'event') {
        if (!selectedEventId) {
          onShowToast('Atención', 'Por favor selecciona un evento formativo.', 'error');
          setIsSubmitting(false);
          return;
        }
        payload.eventId = selectedEventId;
      } else if (genMode === 'cohort') {
        if (!selectedCohortId) {
          onShowToast('Atención', 'Por favor selecciona una cohorte de la Academia Técnica.', 'error');
          setIsSubmitting(false);
          return;
        }
        payload.cohortId = selectedCohortId;
      } else if (genMode === 'single') {
        if (!singleForm.recipientName || !singleForm.courseName) {
          onShowToast('Atención', 'Nombre del participante y del curso son obligatorios.', 'error');
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
      onShowToast('Certificados Emitidos', res.message || 'Se emitieron los certificados exitosamente.', 'success');
      loadCertificates();

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
      setTimeout(() => setActiveTab('list'), 1000);
    } catch (err: any) {
      onShowToast('Error al Emitir', err.message || 'Ocurrió un error al procesar la emisión.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (cert: Certificate) => {
    const reason = prompt('Indica el motivo de la revocación del certificado:');
    if (!reason) return;

    try {
      await apiService.revokeCertificate(cert.id, reason);
      onShowToast('Certificado Revocado', `El certificado ${cert.credentialId} ha sido invalidado.`, 'info');
      loadCertificates();
    } catch (err: any) {
      onShowToast('Error', err.message || 'Error al revocar certificado', 'error');
    }
  };

  const handleDelete = async (cert: Certificate) => {
    if (!confirm(`¿Estás seguro de eliminar el registro ${cert.credentialId}?`)) return;

    try {
      await apiService.deleteCertificate(cert.id);
      onShowToast('Certificado Eliminado', `El certificado ${cert.credentialId} fue borrado.`, 'success');
      loadCertificates();
    } catch (err: any) {
      onShowToast('Error', err.message || 'Error al eliminar certificado', 'error');
    }
  };

  const handleCopyLink = async (cert: Certificate) => {
    const url = cert.verificationUrl || `${window.location.origin}/?cert=${cert.credentialId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(cert.id);
      onShowToast('Enlace Copiado', 'El enlace público para verificar este certificado fue copiado.', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert(`URL: ${url}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner Superior de Sección */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#DA291C] flex items-center justify-center shadow-lg shadow-red-500/20">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-[#DA291C] uppercase tracking-wider">
                  Módulo de Acreditación Oficial
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  Antifraude QR
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Certificados y Diplomas Claro Dominicana
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Genera credenciales digitales oficiales con código QR y portal de validación pública accesible sin inicio de sesión.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'list'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 inline mr-1.5" />
              <span>Ver Registros ({certificates.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('generate')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'generate'
                  ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 inline mr-1.5" />
              <span>Emitir Certificados</span>
            </button>
          </div>
        </div>
      </div>

      {/* PESTAÑA 1: LISTADO Y REGISTRO */}
      {activeTab === 'list' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          
          {/* Controles de Búsqueda y Filtrado */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, cédula, curso o credencial (CLARO-CERT-...)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#DA291C] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <option value="all">Todos los Estados</option>
                <option value="active">✓ Activos y Válidos</option>
                <option value="revoked">✕ Revocados</option>
              </select>

              <button
                onClick={loadCertificates}
                title="Actualizar listado"
                className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-xl text-slate-600 dark:text-slate-300 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tabla de Resultados */}
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-500">
              <div className="w-9 h-9 border-3 border-slate-200 border-t-[#DA291C] rounded-full animate-spin mx-auto mb-2" />
              Consultando base de datos de certificaciones...
            </div>
          ) : certificates.length === 0 ? (
            <div className="py-20 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No se encontraron certificados
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                No hay diplomas registrados con los filtros actuales. Haz clic en "Emitir Certificados" para generar los primeros.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-4">Credencial Oficial</th>
                    <th className="py-3 px-4">Titular Acreditado</th>
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
                      <tr key={cert.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                            {cert.credentialId}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">
                            {cert.recipientName}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Cédula: {cert.recipientCedula} • {cert.recipientCompany || 'Claro'}
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
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
                              Revocado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              ✓ Válido
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setViewingCertificate(cert)}
                            title="Ver e Imprimir Diploma"
                            className="px-3 py-1.5 bg-[#DA291C] hover:bg-red-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors"
                          >
                            Ver Diploma
                          </button>

                          <button
                            onClick={() => handleCopyLink(cert)}
                            title="Copiar enlace público de verificación"
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-block"
                          >
                            {copiedId === cert.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                          </button>

                          {isSuperAdmin && !isRevoked && (
                            <button
                              onClick={() => handleRevoke(cert)}
                              title="Revocar certificado"
                              className="p-1.5 text-amber-600 hover:text-amber-800 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors inline-block"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDelete(cert)}
                              title="Eliminar registro"
                              className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors inline-block"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* PESTAÑA 2: EMISIÓN DE CERTIFICADOS */}
      {activeTab === 'generate' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleGenerate} className="space-y-6 max-w-2xl mx-auto">
            
            {/* Selector de Modo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                1. Selecciona el Tipo de Emisión
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setGenMode('event')}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    genMode === 'event'
                      ? 'border-[#DA291C] bg-red-50/50 dark:bg-red-950/30 text-[#DA291C] font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <Calendar className="w-6 h-6 mx-auto mb-1.5" />
                  <span className="text-xs font-extrabold block">Por Evento Realizado</span>
                  <span className="text-[10px] text-slate-500 block">Capacitaciones generales</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGenMode('cohort')}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    genMode === 'cohort'
                      ? 'border-[#DA291C] bg-red-50/50 dark:bg-red-950/30 text-[#DA291C] font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <BookOpen className="w-6 h-6 mx-auto mb-1.5" />
                  <span className="text-xs font-extrabold block">Academia Técnica</span>
                  <span className="text-[10px] text-slate-500 block">Cohortes aprobadas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGenMode('single')}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    genMode === 'single'
                      ? 'border-[#DA291C] bg-red-50/50 dark:bg-red-950/30 text-[#DA291C] font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <Users className="w-6 h-6 mx-auto mb-1.5" />
                  <span className="text-xs font-extrabold block">Emisión Individual</span>
                  <span className="text-[10px] text-slate-500 block">Diploma personalizado</span>
                </button>
              </div>
            </div>

            {/* MODO: EVENTO */}
            {genMode === 'event' && (
              <div className="space-y-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Selecciona el Evento Formativo:
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
                    required
                  >
                    <option value="">-- Elige un evento --</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.instructor || 'Instructor Claro'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    Se generará automáticamente un certificado oficial antifraude con QR para cada participante con registro o asistencia confirmada en el evento.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Título en el Diploma (Opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Certificado de Aprobación"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Instructor / Facilitador:
                    </label>
                    <input
                      type="text"
                      placeholder="Dejar vacío para usar el del evento"
                      value={instructorOverride}
                      onChange={(e) => setInstructorOverride(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MODO: COHORTE TÉCNICA */}
            {genMode === 'cohort' && (
              <div className="space-y-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Selecciona la Cohorte de la Academia Técnica:
                  </label>
                  <select
                    value={selectedCohortId}
                    onChange={(e) => setSelectedCohortId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
                    required
                  >
                    <option value="">-- Elige una cohorte técnica --</option>
                    {technicalCohorts.map((coh) => (
                      <option key={coh.id} value={coh.id}>
                        {coh.courseTitle || coh.id} ({coh.facilitatorName || 'Instructor'}) — {coh.startDate}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    Se generará el Diploma de Acreditación Técnica con código QR para los alumnos matriculados en esta cohorte.
                  </p>
                </div>
              </div>
            )}

            {/* MODO: INDIVIDUAL */}
            {genMode === 'single' && (
              <div className="space-y-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
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
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      placeholder="juan.perez@claro.com.do"
                      value={singleForm.recipientEmail}
                      onChange={(e) => setSingleForm({ ...singleForm, recipientEmail: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Empresa / Organización
                    </label>
                    <input
                      type="text"
                      placeholder="Claro Dominicana"
                      value={singleForm.recipientCompany}
                      onChange={(e) => setSingleForm({ ...singleForm, recipientCompany: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
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
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
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
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
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
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Calificación (0-100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={singleForm.score}
                      onChange={(e) => setSingleForm({ ...singleForm, score: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nombre del Instructor
                    </label>
                    <input
                      type="text"
                      placeholder="Instructor Certificado Claro"
                      value={singleForm.instructorName}
                      onChange={(e) => setSingleForm({ ...singleForm, instructorName: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
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
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Botón de Emisión */}
            <div className="text-right">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-[#DA291C] hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl shadow-md shadow-red-500/25 transition-all text-xs disabled:opacity-50 inline-flex items-center space-x-2"
              >
                <Award className="w-4 h-4" />
                <span>{isSubmitting ? 'Procesando Emisión...' : 'Emitir Certificados Oficiales'}</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Previsualización del Diploma */}
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
