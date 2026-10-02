import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Download, 
  Printer, 
  Share2, 
  Check, 
  X, 
  Award, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Building2,
  ExternalLink
} from 'lucide-react';
import { Certificate, CertificateVerificationPublicData } from '../../types';
import { downloadCertificatePdf, formatCertificateDate } from '../../utils/certificatePdfGenerator';

interface CertificateViewModalProps {
  certificate: Certificate | CertificateVerificationPublicData;
  isOpen: boolean;
  onClose: () => void;
}

export const CertificateViewModal: React.FC<CertificateViewModalProps> = ({
  certificate,
  isOpen,
  onClose
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const isRevoked = (certificate as any).status === 'revoked';
  const elementId = `claro-diploma-sheet-${certificate.credentialId.replace(/[^a-zA-Z0-9]/g, '-')}`;
  
  // URL de verificación pública absoluta
  const verificationUrl = certificate.verificationUrl || 
    (typeof window !== 'undefined' ? `${window.location.origin}/?cert=${certificate.credentialId}` : '');

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      await downloadCertificatePdf(elementId, certificate);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      alert('Hubo un error al generar el PDF. Puedes utilizar la opción de Imprimir para guardarlo como PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(verificationUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      alert(`Enlace de validación: ${verificationUrl}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm overflow-y-auto">
      {/* Estilos específicos para impresión directa de diploma */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #${elementId}, #${elementId} * {
            visibility: visible !important;
          }
          #${elementId} {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            transform: none !important;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      `}</style>

      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Barra superior de herramientas y controles */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-sm font-bold tracking-tight text-white block">
                Diploma Oficial Claro Dominicana
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Credencial: {certificate.credentialId}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyLink}
              title="Copiar enlace público de verificación"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Enlace Copiado' : 'Compartir'}</span>
            </button>

            <button
              onClick={handlePrint}
              title="Imprimir o guardar en PDF del navegador"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              title="Descargar archivo PDF vectorial de alta calidad"
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-[#DA291C] hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Generando PDF...' : 'Descargar PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-2"
              title="Cerrar vista"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Alerta si el certificado se encuentra revocado */}
        {isRevoked && (
          <div className="bg-red-600 text-white text-xs font-bold px-5 py-2 text-center flex items-center justify-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-white" />
            <span>ESTE CERTIFICADO HA SIDO REVOCADO ADMINISTRATIVAMENTE POR CLARO DOMINICANA.</span>
          </div>
        )}

        {/* Contenedor del Diploma físico/visual con scroll horizontal en pantallas pequeñas */}
        <div className="p-4 sm:p-8 bg-slate-100 dark:bg-slate-950 flex justify-center items-center overflow-x-auto">
          
          {/* Hoja de Diploma A4 Horizontal (Relación 1.414 aprox: 960x680 px) */}
          <div
            id={elementId}
            className="relative w-[960px] min-w-[960px] h-[670px] bg-[#FAF9F6] text-slate-800 p-10 rounded-sm shadow-xl border-8 border-double border-slate-300 flex flex-col justify-between overflow-hidden select-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(218,41,28,0.02) 0%, rgba(250,249,246,1) 85%)'
            }}
          >
            {/* Marco decorativo dorado perimetral interno */}
            <div className="absolute inset-3 border-2 border-amber-500/30 rounded pointer-events-none" />
            <div className="absolute inset-5 border border-dashed border-amber-600/25 pointer-events-none" />

            {/* Acentos en las esquinas */}
            <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-[#DA291C] pointer-events-none" />
            <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-[#DA291C] pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-[#DA291C] pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-[#DA291C] pointer-events-none" />

            {/* SECCIÓN 1: ENCABEZADO INSTITUCIONAL */}
            <div className="relative z-10 flex items-center justify-between border-b border-amber-600/20 pb-4">
              {/* Logo Claro Corporativo */}
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-full bg-[#DA291C] flex items-center justify-center shadow-md">
                  <span className="text-white font-extrabold text-2xl tracking-tighter">Claro</span>
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-wider text-slate-900 uppercase">
                    Claro Dominicana
                  </h1>
                  <p className="text-[11px] font-semibold tracking-widest text-[#DA291C] uppercase">
                    Academia Técnica & Gestión del Talento
                  </p>
                </div>
              </div>

              {/* Título de Certificación Oficial */}
              <div className="text-right">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-extrabold tracking-wider rounded uppercase">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>Acreditación Oficial GAES</span>
                </div>
                <p className="text-[10px] text-slate-600 font-mono mt-1">
                  REG-ID: {certificate.credentialId}
                </p>
              </div>
            </div>

            {/* SECCIÓN 2: CUERPO PRINCIPAL DEL DIPLOMA */}
            <div className="relative z-10 text-center my-auto py-2">
              <p className="text-xs font-bold tracking-[0.3em] text-slate-600 uppercase mb-2">
                Otorga la presente certificación a
              </p>

              {/* Nombre del Titular */}
              <h2 className="text-3xl font-serif font-black tracking-tight text-slate-950 uppercase border-b-2 border-amber-500/50 inline-block px-10 pb-1.5 mb-2.5">
                {certificate.recipientName}
              </h2>

              {/* Cédula y Empresa */}
              <div className="flex items-center justify-center space-x-6 text-xs text-slate-600 font-medium mb-5">
                <span>
                  <strong>Documento:</strong> {(certificate as any).recipientCedula || (certificate as any).recipientCedulaMasked || 'Cédula Registrada'}
                </span>
                <span>•</span>
                <span>
                  <strong>Organización:</strong> {certificate.recipientCompany || 'Claro Dominicana'}
                </span>
              </div>

              <p className="text-sm text-slate-700 max-w-2xl mx-auto leading-relaxed mb-3">
                Por haber completado y demostrado las competencias técnicas requeridas en el programa de formación:
              </p>

              {/* Título del Curso */}
              <div className="max-w-2xl mx-auto py-2.5 px-6 bg-red-50/70 border border-red-200/80 rounded-lg mb-4">
                <h3 className="text-xl font-extrabold text-[#DA291C] tracking-wide uppercase">
                  {certificate.courseName}
                </h3>
              </div>

              {/* Barra de Atributos (Horas, Modalidad, Fecha, Calificación) */}
              <div className="flex items-center justify-center flex-wrap gap-4 text-xs font-semibold text-slate-700">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white border border-slate-200 rounded shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                  <span>Duración: {certificate.durationHours} Horas</span>
                </span>

                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white border border-slate-200 rounded shadow-2xs">
                  <Building2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Modalidad: {certificate.modality}</span>
                </span>

                {certificate.score !== null && certificate.score !== undefined && (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded shadow-2xs">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Calificación: {certificate.score} / 100</span>
                  </span>
                )}

                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white border border-slate-200 rounded shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-600" />
                  <span>Emitido: {formatCertificateDate(certificate.issueDate)}</span>
                </span>
              </div>
            </div>

            {/* SECCIÓN 3: PIE CON QR, SELLO METÁLICO Y FIRMAS OFICIALES */}
            <div className="relative z-10 flex items-end justify-between border-t border-amber-600/20 pt-4 mt-2">
              
              {/* 3.1 Código QR antifraude con enlace público */}
              <div className="flex items-center space-x-3">
                <div className="p-1.5 bg-white border-2 border-slate-300 rounded shadow-xs">
                  <QRCodeSVG
                    value={verificationUrl}
                    size={72}
                    level="M"
                    fgColor="#1E293B"
                    bgColor="#FFFFFF"
                  />
                </div>
                <div className="text-left text-[10px] text-slate-600 max-w-[140px] leading-tight">
                  <span className="font-extrabold text-slate-800 block uppercase">
                    Validación Pública
                  </span>
                  Escanea el código QR con cualquier teléfono para verificar la autenticidad en tiempo real.
                </div>
              </div>

              {/* 3.2 Sello Dorado Central */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-linear-to-tr from-amber-600 via-amber-400 to-yellow-200 p-0.5 shadow-md flex items-center justify-center">
                  <div className="w-full h-full rounded-full border border-dashed border-amber-900/30 flex flex-col items-center justify-center text-center p-1 bg-amber-400 text-amber-950 font-black">
                    <Award className="w-5 h-5 text-amber-900 mb-0.5" />
                    <span className="text-[7px] leading-none uppercase tracking-tighter font-extrabold">
                      Claro Dominicana
                    </span>
                    <span className="text-[6px] text-amber-900 leading-none">Certificado</span>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-amber-800 mt-1 uppercase tracking-widest">
                  Validez Oficial
                </span>
              </div>

              {/* 3.3 Firmas Digitales Institucionales */}
              <div className="flex items-center space-x-8">
                {/* Firma 1: Facilitador */}
                <div className="text-center">
                  <div className="w-36 border-b border-slate-700 mb-1 pb-1">
                    <span className="font-serif italic text-sm text-slate-800 font-bold block">
                      {certificate.instructorName}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-800 leading-tight">
                    {certificate.instructorName}
                  </p>
                  <p className="text-[9px] text-slate-600 leading-tight">
                    {certificate.instructorTitle}
                  </p>
                </div>

                {/* Firma 2: Dirección de Capacitación */}
                <div className="text-center">
                  <div className="w-36 border-b border-slate-700 mb-1 pb-1">
                    <span className="font-serif italic text-sm text-slate-800 font-bold block">
                      Dirección Claro
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-800 leading-tight">
                    {certificate.directorName || 'Dirección de Gestión Humana'}
                  </p>
                  <p className="text-[9px] text-slate-600 leading-tight">
                    Claro Dominicana
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Pie de modal con enlace directo */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Credencial verificable públicamente en línea:</span>
            <a 
              href={verificationUrl}
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[#DA291C] hover:underline inline-flex items-center space-x-1 font-semibold"
            >
              <span>{verificationUrl}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
