// ==========================================
// MOTOR DE CALENDARIO DINÁMICO PERPETUO
// ==========================================

import { TrainingEvent } from '../types';

export interface CalendarDay {
  dateStr: string; // "YYYY-MM-DD"
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  eventCount: number;
  events: TrainingEvent[];
}

/**
 * Retorna los días de la cuadrícula (matriz 7 columnas) para cualquier año y mes.
 * @param year Año (ej. 2026)
 * @param month Mes (1 = Enero, 12 = Diciembre)
 * @param allEvents Lista de eventos para calcular ocurrencias
 */
export const getCalendarGrid = (
  year: number,
  month: number,
  allEvents: TrainingEvent[] = []
): CalendarDay[] => {
  const days: CalendarDay[] = [];
  
  // Primer día del mes
  const firstDay = new Date(year, month - 1, 1);
  // Total de días en el mes actual
  const totalDays = new Date(year, month, 0).getDate();
  
  // Día de la semana en que inicia (0: Dom, 1: Lun, ..., 6: Sáb)
  const startDayOfWeek = firstDay.getDay(); 
  
  // Días del mes anterior para rellenar
  const prevMonthTotalDays = new Date(year, month - 1, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    
    days.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: isSameDay(new Date(prevYear, prevMonth - 1, dayNum), new Date()),
      eventCount: 0,
      events: []
    });
  }
  
  // Días del mes actual
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    // Filtrar eventos que tienen horarios en esta fecha
    const dayEvents = allEvents.filter(evt =>
      evt.status === 'active' && evt.schedule.some(s => s.date === dateStr)
    );
    
    days.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: isSameDay(new Date(year, month - 1, d), new Date()),
      eventCount: dayEvents.length,
      events: dayEvents
    });
  }
  
  // Días del mes siguiente para completar la cuadrícula (múltiplos de 7)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    days.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: isSameDay(new Date(nextYear, nextMonth - 1, d), new Date()),
      eventCount: 0,
      events: []
    });
  }
  
  return days;
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};
