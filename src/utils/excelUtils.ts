// ==========================================
// UTILIDADES DE IMPORTACIÓN Y EXPORTACIÓN EXCEL (XLSX)
// ==========================================

import * as XLSX from 'xlsx';
import { TrainingEvent, Participant } from '../types';
import { formatDateLong } from './formatters';

/**
 * Exporta la lista de asistentes de un horario/evento a un archivo Excel (.xlsx)
 */
export const exportAttendeesToExcel = (
  event: TrainingEvent,
  dateStr: string,
  timeStr: string,
  attendeeEmails: string[],
  attendedList: string[] = [],
  allParticipants: Participant[] = []
): void => {
  const data = attendeeEmails.map((email, idx) => {
    const participant = allParticipants.find(p => p.email.toLowerCase() === email.toLowerCase());
    const hasAttended = attendedList.includes(email);
    
    return {
      'No.': idx + 1,
      'No. Tarjeta': participant?.card || 'N/A',
      'Nombre del Colaborador': participant?.name || 'Usuario no registrado',
      'Correo Electrónico': email,
      'Evento': event.title,
      'Fecha': dateStr,
      'Horario': timeStr,
      'Modalidad': event.modality,
      'Instructor': event.instructor,
      'Asistencia Confirmada': hasAttended ? 'SÍ (Confirmado)' : 'NO (Pendiente)'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Asistentes');

  // Ajustar anchos de columna
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 15 }, // Tarjeta
    { wch: 30 }, // Nombre
    { wch: 30 }, // Correo
    { wch: 30 }, // Evento
    { wch: 12 }, // Fecha
    { wch: 12 }, // Horario
    { wch: 12 }, // Modalidad
    { wch: 25 }, // Instructor
    { wch: 20 }  // Asistencia
  ];

  const fileName = `Asistencia_${event.title.slice(0, 20).replace(/\s+/g, '_')}_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Exporta el padrón completo de participantes a Excel
 */
export const exportParticipantsToExcel = (participants: Participant[]): void => {
  const data = participants.map((p, idx) => ({
    'No.': idx + 1,
    'No. Tarjeta': p.card,
    'Nombre Completo': p.name,
    'Correo Corporativo': p.email
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores');
  ws['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 35 }, { wch: 35 }];
  XLSX.writeFile(wb, 'Padron_Colaboradores_CapacitaHub.xlsx');
};

/**
 * Exporta el reporte ejecutivo de métricas del Dashboard
 */
export const exportDashboardReportToExcel = (
  events: TrainingEvent[],
  participants: Participant[]
): void => {
  // Hoja 1: Resumen de eventos
  const eventsData = events.map(evt => {
    let totalCap = 0;
    let totalReg = 0;
    let totalAtt = 0;
    
    evt.schedule.forEach(sch => {
      sch.slots.forEach(slot => {
        totalCap += slot.capacity;
        totalReg += slot.registered;
        totalAtt += (slot.attendedList || []).length;
      });
    });

    const occupancyRate = totalCap > 0 ? Math.round((totalReg / totalCap) * 100) : 0;
    const attendanceRate = totalReg > 0 ? Math.round((totalAtt / totalReg) * 100) : 0;

    return {
      'ID': evt.id,
      'Título': evt.title,
      'Categoría': evt.category,
      'Modalidad': evt.modality,
      'Instructor': evt.instructor,
      'Capacidad Total': totalCap,
      'Total Inscritos': totalReg,
      'Total Asistieron': totalAtt,
      'Tasa de Ocupación': `${occupancyRate}%`,
      'Tasa de Asistencia': `${attendanceRate}%`,
      'Estado': evt.status === 'active' ? 'Activo' : 'Inactivo'
    };
  });

  const wb = XLSX.utils.book_new();
  const wsEvents = XLSX.utils.json_to_sheet(eventsData);
  XLSX.utils.book_append_sheet(wb, wsEvents, 'Resumen Capacitaciones');

  XLSX.writeFile(wb, 'Reporte_Metricas_CapacitaHub.xlsx');
};

/**
 * Procesa un archivo Excel/CSV subido por el usuario para extraer participantes
 */
export const parseParticipantsExcelFile = async (file: File): Promise<Participant[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length < 2) {
          throw new Error('El archivo está vacío o no contiene filas de datos.');
        }

        // Detectar columnas
        const header = rows[0].map((h: any) => String(h || '').toLowerCase().trim());
        let cardIdx = header.findIndex((h: string) => h.includes('tarjeta') || h.includes('card') || h.includes('id') || h.includes('codigo') || h.includes('código'));
        let nameIdx = header.findIndex((h: string) => h.includes('nombre') || h.includes('name') || h.includes('colaborador') || h.includes('participante'));
        let emailIdx = header.findIndex((h: string) => h.includes('correo') || h.includes('email') || h.includes('mail'));

        // Fallbacks si no tienen encabezados exactos
        if (cardIdx === -1) cardIdx = 0;
        if (nameIdx === -1) nameIdx = 1;
        if (emailIdx === -1) emailIdx = 2;

        const participants: Participant[] = [];
        const seenCards = new Set<string>();

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const card = String(row[cardIdx] || '').trim();
          const name = String(row[nameIdx] || '').trim();
          const email = String(row[emailIdx] || '').trim();

          if (card && name && !seenCards.has(card)) {
            seenCards.add(card);
            participants.push({ card, name, email });
          }
        }

        resolve(participants);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
