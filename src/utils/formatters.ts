// ==========================================
// UTILIDADES DE FORMATEO Y TEXTO
// ==========================================

export const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const DAY_NAMES_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Genera un correo corporativo sugerido a partir de un nombre completo.
 * Ejemplo: "LUIS ALBERTO ALMAZAN POOT" -> "luis.almazan@empresa.com"
 */
export const generateEmailFromName = (fullName: string, domain = 'empresa.com'): string => {
  const clean = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  
  const parts = clean.split(/\s+/).filter(p => p.length > 1 && !['del', 'de', 'la', 'los', 'las', 'y'].includes(p));
  if (parts.length === 0) return `usuario@${domain}`;
  if (parts.length === 1) return `${parts[0]}@${domain}`;
  
  // Primer nombre + primer apellido
  const firstName = parts[0];
  const lastName = parts[parts.length >= 3 ? parts.length - 2 : parts.length - 1];
  return `${firstName}.${lastName}@${domain}`;
};

/**
 * Formatea una fecha YYYY-MM-DD en texto legible en español.
 * Ejemplo: "2026-07-15" -> "Miércoles, 15 de Julio de 2026"
 */
export const formatDateLong = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][date.getDay()];
  const monthName = MONTH_NAMES_ES[month - 1];
  
  return `${dayName}, ${day} de ${monthName} de ${year}`;
};

/**
 * Formatea una fecha YYYY-MM-DD a formato corto legible "15 Jul 2026"
 */
export const formatDateShort = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const monthName = MONTH_NAMES_ES[month - 1]?.slice(0, 3);
  return `${day} ${monthName} ${year}`;
};

/**
 * Genera un número de tarjeta/carnet aleatorio único (para auto-registro)
 */
export const generateRandomCard = (): string => {
  return `${Math.floor(1000 + Math.random() * 9000)}`;
};

/**
 * Valida si una cédula cumple con el formato estricto de 11 dígitos (000-0000000-0)
 * Ejemplo válido: 402-2196163-1
 */
export const isValidCedula = (cedula?: string): boolean => {
  if (!cedula) return false;
  return /^\d{3}-\d{7}-\d{1}$/.test(cedula.trim());
};

/**
 * Aplica máscara y auto-formateo a una cédula conforme el usuario escribe (máx 11 dígitos: 000-0000000-0)
 * Ejemplo: "40221961631" -> "402-2196163-1"
 */
export const formatCedula = (val: string): string => {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10, 11)}`;
};

/**
 * Parsea una hora en formato "09:00 AM", "11:30 PM", "9:00", etc. a minutos desde medianoche (0..1439).
 */
export const parseTimeToMinutes = (timeStr?: string): number | null => {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3] ? match[3].toUpperCase() : null;

  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

/**
 * Convierte minutos desde medianoche a formato estándar "HH:MM AM/PM"
 */
export const minutesToTimeString = (totalMinutes: number): string => {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  let hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${String(hours12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
};

/**
 * Suma horas (ej: 2, 1.5, 4) a una hora de inicio y retorna la hora de finalización calculada
 */
export const addHoursToTime = (startTimeStr: string, hoursToAdd: number): string => {
  const startMins = parseTimeToMinutes(startTimeStr);
  if (startMins === null) return startTimeStr;
  const durationMins = Math.round(hoursToAdd * 60);
  return minutesToTimeString(startMins + durationMins);
};

/**
 * Calcula la diferencia en horas (numérico con decimales, ej: 2, 1.5) entre hora inicio y hora fin
 */
export const calculateTimeDurationHours = (start?: string, end?: string): number => {
  if (!start || !end) return 0;
  const m1 = parseTimeToMinutes(start);
  const m2 = parseTimeToMinutes(end);
  if (m1 === null || m2 === null) return 0;
  let diff = m2 - m1;
  if (diff < 0) diff += 1440; // Cruce de medianoche
  return Math.round((diff / 60) * 10) / 10;
};

/**
 * Formatea duración legible en horas y minutos (ej: "2 hrs", "1.5 hrs", "45 mins")
 */
export const formatDurationHuman = (hours: number): string => {
  if (hours <= 0) return '0 hrs';
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins} mins`;
  }
  const fullHours = Math.floor(hours);
  const remMins = Math.round((hours - fullHours) * 60);
  if (remMins === 0) return `${fullHours} hr${fullHours > 1 ? 's' : ''}`;
  return `${fullHours}h ${remMins}m`;
};

/**
 * Obtiene métricas totales de duración y días de un evento
 */
export const getEventDurationMetrics = (event?: {
  totalHours?: number;
  schedule?: Array<{ date: string; slots: Array<{ time: string; endTime?: string }> }>;
}): { totalHours: number; totalDays: number; durationText: string; isEstimated: boolean } => {
  if (!event) {
    return { totalHours: 0, totalDays: 0, durationText: '0 hrs', isEstimated: false };
  }

  const totalDays = event.schedule ? event.schedule.length : 0;

  // Si tiene totalHours explícito > 0, lo usamos prioritariamente
  if (event.totalHours && event.totalHours > 0) {
    return {
      totalHours: event.totalHours,
      totalDays,
      durationText: `${event.totalHours} hrs en ${totalDays} ${totalDays === 1 ? 'día' : 'días'}`,
      isEstimated: false
    };
  }

  // Si no, calculamos sumando las duraciones de los slots configurados
  let calculatedHours = 0;
  if (event.schedule && event.schedule.length > 0) {
    for (const sch of event.schedule) {
      for (const slot of sch.slots) {
        if (slot.time && slot.endTime) {
          calculatedHours += calculateTimeDurationHours(slot.time, slot.endTime);
        } else {
          calculatedHours += 2;
        }
      }
    }
  }

  calculatedHours = Math.round(calculatedHours * 10) / 10;
  const hours = calculatedHours > 0 ? calculatedHours : (totalDays > 0 ? totalDays * 2 : 2);

  return {
    totalHours: hours,
    totalDays: totalDays || 1,
    durationText: `${hours} hrs en ${totalDays || 1} ${(totalDays || 1) === 1 ? 'día' : 'días'}`,
    isEstimated: true
  };
};

