import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { TrainingEvent } from '../../types';
import { getCalendarGrid, CalendarDay } from '../../utils/calendarUtils';
import { MONTH_NAMES_ES, DAY_NAMES_SHORT_ES } from '../../utils/formatters';

interface PerpetualCalendarProps {
  events: TrainingEvent[];
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
}

export const PerpetualCalendar: React.FC<PerpetualCalendarProps> = ({
  events,
  selectedDate,
  onSelectDate
}) => {
  // Inicializar en Julio 2026 (o el mes de los eventos semilla), o el mes actual
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(7); // 1 = Ene, 7 = Jul

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    onSelectDate(dateStr);
  };

  const calendarDays: CalendarDay[] = getCalendarGrid(currentYear, currentMonth, events);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md">
      
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>{MONTH_NAMES_ES[currentMonth - 1]}</span>
              <span className="text-indigo-400">{currentYear}</span>
            </h3>
            <p className="text-xs text-slate-400">Selecciona un día para filtrar eventos</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {selectedDate && (
            <button
              onClick={() => onSelectDate(null)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-indigo-300 hover:bg-slate-700 transition-colors flex items-center gap-1"
              title="Limpiar filtro de fecha"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Ver todos</span>
            </button>
          )}

          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-2xl p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Mes Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Mes Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Week Day Header */}
      <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
        {DAY_NAMES_SHORT_ES.map((d, i) => (
          <div 
            key={d} 
            className={`text-[11px] font-bold py-1 ${i === 0 || i === 6 ? 'text-slate-500' : 'text-slate-400'}`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarDays.map((day, idx) => {
          const isSelected = selectedDate === day.dateStr;
          const hasEvents = day.eventCount > 0;

          return (
            <button
              key={`${day.dateStr}-${idx}`}
              onClick={() => {
                if (isSelected) {
                  onSelectDate(null); // Deseleccionar al hacer click de nuevo
                } else {
                  onSelectDate(day.dateStr);
                }
              }}
              disabled={!day.isCurrentMonth}
              className={`
                relative h-12 rounded-2xl flex flex-col items-center justify-center transition-all text-xs font-semibold
                ${!day.isCurrentMonth ? 'opacity-20 cursor-default' : 'hover:scale-105 active:scale-95'}
                ${isSelected 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 ring-2 ring-indigo-400 font-bold' 
                  : hasEvents
                  ? 'bg-indigo-950/50 border border-indigo-500/40 text-indigo-200 hover:bg-indigo-900/60'
                  : 'bg-slate-950/40 border border-slate-800/60 text-slate-300 hover:bg-slate-800/60 hover:text-white'}
                ${day.isToday && !isSelected ? 'ring-1 ring-cyan-400 text-cyan-300' : ''}
              `}
            >
              <span>{day.dayNumber}</span>
              
              {/* Event Dots */}
              {hasEvents && day.isCurrentMonth && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {Array.from({ length: Math.min(day.eventCount, 3) }).map((_, dotIdx) => (
                    <span
                      key={dotIdx}
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]'
                      }`}
                    />
                  ))}
                  {day.eventCount > 3 && (
                    <span className="text-[8px] font-bold leading-none text-cyan-300">+</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Días con capacitaciones</span>
        </div>
        {selectedDate && (
          <div className="text-indigo-400 font-semibold">
            Filtro activo: {selectedDate}
          </div>
        )}
      </div>

    </div>
  );
};
