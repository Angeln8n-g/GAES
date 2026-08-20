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
