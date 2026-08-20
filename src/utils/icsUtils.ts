// ==========================================
// GENERADOR DE CALENDARIOS (.ICS / GOOGLE / OUTLOOK)
// ==========================================

import { TrainingEvent } from '../types';

/**
 * Convierte fecha YYYY-MM-DD y hora "09:00 AM" en un objeto Date
 */
export const parseDateTime = (dateStr: string, timeStr: string): { start: Date; end: Date } => {
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Parsear formato 12h "09:00 AM" o "02:30 PM"
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  let hours = 9;
  let minutes = 0;
  
  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    const meridiem = match[3]?.toUpperCase();
    
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  }
  
  const start = new Date(year, month - 1, day, hours, minutes, 0);
  // Asumir duración por defecto de 1 hora y 30 minutos si no se especifica
  const end = new Date(start.getTime() + 90 * 60 * 1000);
  
  return { start, end };
};

/**
 * Convierte Date a formato ISO básico iCal: YYYYMMDDTHHmmssZ
 */
const toICalString = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

/**
 * Genera y descarga un archivo .ics para el evento y horario
 */
export const downloadIcsFile = (event: TrainingEvent, dateStr: string, timeStr: string): void => {
  const { start, end } = parseDateTime(dateStr, timeStr);
  const now = new Date();
  
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CapacitaHub//Gestion de Reservas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:capacitahub-${event.id}-${dateStr}-${start.getTime()}@capacitahub.empresa.com`,
    `DTSTAMP:${toICalString(now)}`,
    `DTSTART:${toICalString(start)}`,
    `DTEND:${toICalString(end)}`,
    `SUMMARY:${event.title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}\\n\\nInstructor: ${event.instructor}\\nModalidad: ${event.modality}`,
    `LOCATION:${event.modality === 'Virtual' ? 'Enlace Virtual / Microsoft Teams' : event.location || 'Instalaciones Corporativas'}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Recordatorio: ${event.title}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  
  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Capacitacion_${event.title.slice(0, 25).replace(/\s+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Genera el enlace directo para añadir a Google Calendar
 */
export const getGoogleCalendarUrl = (event: TrainingEvent, dateStr: string, timeStr: string): string => {
  const { start, end } = parseDateTime(dateStr, timeStr);
  const startStr = toICalString(start);
  const endStr = toICalString(end);
  
  const details = `${event.description || ''}\n\nInstructor: ${event.instructor}\nModalidad: ${event.modality}`;
  const location = event.modality === 'Virtual' ? 'Microsoft Teams' : event.location || 'Instalaciones Corporativas';
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startStr}/${endStr}`,
    details: details,
    location: location
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Genera el enlace directo para añadir a Outlook Web Calendar
 */
export const getOutlookCalendarUrl = (event: TrainingEvent, dateStr: string, timeStr: string): string => {
  const { start, end } = parseDateTime(dateStr, timeStr);
  const details = `${event.description || ''}\n\nInstructor: ${event.instructor}\nModalidad: ${event.modality}`;
  const location = event.modality === 'Virtual' ? 'Microsoft Teams' : event.location || 'Instalaciones Corporativas';
  
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: details,
    location: location
  });
  
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
};
