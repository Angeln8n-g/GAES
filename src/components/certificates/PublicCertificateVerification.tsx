import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Award, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Building2, 
  UserCheck, 
  FileText,
  Share2,
  Check,
  ArrowLeft,
  Printer
} from 'lucide-react';
import { apiService } from '../../services/api';
import { CertificateVerificationResponse, CertificateVerificationPublicData } from '../../types';
import { CertificateViewModal } from './CertificateViewModal';
import { formatCertificateDate } from '../../utils/certificatePdfGenerator';

interface PublicCertificateVerificationProps {
  credentialId: string;
  onClose?: () => void;
}

export const PublicCertificateVerification: React.FC<PublicCertificateVerificationProps> = ({
  credentialId,
  onClose
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<CertificateVerificationResponse | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showFullDiploma, setShowFullDiploma] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function verify() {
      setLoading(true);
      try {
        const res = await apiService.verifyCertificate(credentialId);
        if (isMounted) setData(res);
      } catch (err: any) {
        if (isMounted) {
          setData({
            isValid: false,
            error: 'No se pudo contactar al servidor de validación de Claro Dominicana.'
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (credentialId) {
      verify();
    }
    return () => {
      isMounted = false;
    };
  }, [credentialId]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      alert(`Enlace: ${window.location.href}`);
    }
  };

  const cert = data?.certificate;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      
      {/* Contenedor Central */}
      <div className="max-w-3xl w-full mx-auto my-auto animate-in fade-in duration-300">
        
        {/* Encabezado Institucional Claro */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center space-x-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-[#DA291C] flex items-center justify-center shadow-lg">
              <span className="text-white font-extrabold text-2xl tracking-tighter">Claro</span>
            </div>
            <div className="text-left">
              <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider leading-none">
                Claro Dominicana
              </h1>
              <p className="text-xs font-bold text-[#DA291C] uppercase tracking-widest mt-1">
                Portal Público de Validación de Certificados
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sistema de Verificación Criptográfica y Acreditación de Capacitación GAES
          </p>
        </div>

        {/* ESTADO: CARGANDO */}
        {loading && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
            <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-800 border-t-[#DA291C] rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Validando credencial en registros oficiales...
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
              ID: {credentialId}
            </p>
          </div>
        )}

        {/* ESTADO: CERTIFICADO VÁLIDO */}
        {!loading && data?.isValid && cert && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-emerald-500/30 overflow-hidden">
            
            {/* Banner Verde de Autenticidad */}
            <div className="bg-emerald-600 text-white p-5 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-wide uppercase">
                    Credencial Oficial Válida y Auténtica
                  </h2>
                  <p className="text-xs text-emerald-100 font-mono">
                    Código de Registro: {cert.credentialId}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wider uppercase">
                  ✓ Registro Activo
                </span>
              </div>
            </div>

            {/* Contenido Informativo */}
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Información del Titular */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest block mb-1">
                  Titular Acreditado
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {cert.recipientName}
                </h3>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <span className="inline-flex items-center space-x-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#DA291C]" />
                    <span>Cédula: <strong>{cert.recipientCedulaMasked}</strong></span>
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Empresa: <strong>{cert.recipientCompany}</strong></span>
                  </span>
                </div>
              </div>

              {/* Información del Programa Formativo */}
              <div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest block mb-1">
                  Programa o Curso Completado
                </span>
                <h4 className="text-xl font-extrabold text-[#DA291C] uppercase leading-snug">
                  {cert.courseName}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {cert.title}
                </p>
              </div>

              {/* Matriz de Atributos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">Duración</span>
                  </div>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {cert.durationHours} Horas
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400 mb-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">Modalidad</span>
                  </div>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {cert.modality}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400 mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">Expedición</span>
                  </div>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {formatCertificateDate(cert.issueDate)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400 mb-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[10px] font-bold uppercase">Calificación</span>
                  </div>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {cert.score !== null && cert.score !== undefined ? `${cert.score} / 100` : 'Completado'}
                  </span>
                </div>
              </div>

              {/* Emisor y Autoridad */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-3">
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">
                    Facilitador / Evaluador: {cert.instructorName}
                  </span>
                  <span className="text-[11px]">{cert.instructorTitle}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">
                    {cert.directorName}
                  </span>
                  <span className="text-[11px]">Claro Dominicana</span>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowFullDiploma(true)}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#DA291C] hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-colors text-xs"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Ver y Descargar Diploma Oficial PDF</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="inline-flex items-center space-x-1.5 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors text-xs border border-slate-200 dark:border-slate-700"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copiado' : 'Compartir'}</span>
                  </button>
                </div>

                {onClose && (
                  <button
                    onClick={onClose}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver a GAES</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ESTADO: CERTIFICADO REVOCADO O NO ENCONTRADO */}
        {!loading && (!data?.isValid || data?.isRevoked) && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-red-500/30 overflow-hidden text-center p-8 sm:p-10">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
              {data?.isRevoked ? <AlertTriangle className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
            </div>

            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wide mb-2">
              {data?.isRevoked ? 'Credencial Revocada Oficialmente' : 'Certificado No Válido o Inexistente'}
            </h2>

            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-4">
              {data?.revocationReason || data?.error || 'El identificador ingresado no corresponde a ninguna acreditación activa emitida por Claro Dominicana.'}
            </p>

            <div className="inline-block p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400 mb-6">
              Código Consultado: {credentialId}
            </div>

            <div>
              {onClose ? (
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
                >
                  Regresar al Inicio
                </button>
              ) : (
                <a
                  href="/"
                  className="inline-block px-6 py-2.5 bg-[#DA291C] hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Ir al Portal Principal
                </a>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Pie institucional */}
      <footer className="text-center text-[11px] text-slate-600 dark:text-slate-400 mt-8">
        © {new Date().getFullYear()} Claro Dominicana — Dirección de Capacitación y Gestión del Talento Humano.
      </footer>

      {/* Modal para visualizar e imprimir el diploma */}
      {showFullDiploma && cert && (
        <CertificateViewModal
          certificate={cert}
          isOpen={showFullDiploma}
          onClose={() => setShowFullDiploma(false)}
        />
      )}

    </div>
  );
};
