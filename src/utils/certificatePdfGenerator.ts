import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Certificate, CertificateVerificationPublicData } from '../types';

/**
 * Genera y descarga un Diploma / Certificado oficial en PDF en formato A4 Horizontal
 * a partir de un elemento DOM renderizado con fidelidad de 300 DPI (Retina).
 */
export async function downloadCertificatePdf(
  elementId: string,
  cert: Certificate | CertificateVerificationPublicData
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Elemento con ID #${elementId} no encontrado para generar PDF.`);
  }

  // Guardar estilos originales si fuera necesario
  const canvas = await html2canvas(element, {
    scale: 2.5, // Alta resolución para nitidez de impresión
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#FAF9F6' // Tono marfil formal de diploma
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);

  // A4 Landscape: 297mm x 210mm
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');

  // Nombre de archivo limpio
  const cleanName = (cert.recipientName || 'participante')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 30);
  const cleanCourse = (cert.courseName || 'capacitacion')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 30);
  const filename = `Diploma_Claro_${cleanCourse}_${cleanName}_${cert.credentialId}.pdf`;

  pdf.save(filename);
}

/**
 * Formatea fechas a formato legible dominicano (ej. 15 de Octubre de 2026)
 */
export function formatCertificateDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' });
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    return d.toLocaleDateString('es-DO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}
