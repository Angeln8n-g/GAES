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
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(7);

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

  const calendarDays: CalendarDay[] = getCalendarGrid(currentYear, currentMonth, events);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-red-50 text-[#DA291C] border border-red-200">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>{MONTH_NAMES_ES[currentMonth - 1]}</span>
              <span className="text-[#DA291C]">{currentYear}</span>
            </h3>
            <p className="text-xs text-slate-500">Filtrar por fecha específica</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {selectedDate && (
            <button
              onClick={() => onSelectDate(null)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1"
              title="Limpiar filtro de fecha"
            >
              <RotateCcw className="w-3 h-3 text-[#DA291C]" />
              <span>Ver todos</span>
            </button>
          )}

          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-2xl p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
              title="Mes Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
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
            className={`text-[11px] font-bold py-1 ${i === 0 || i === 6 ? 'text-red-500' : 'text-slate-500'}`}
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
                  onSelectDate(null);
                } else {
                  onSelectDate(day.dateStr);
                }
              }}
              disabled={!day.isCurrentMonth}
              className={`
                relative h-12 rounded-2xl flex flex-col items-center justify-center transition-all text-xs font-bold
                ${!day.isCurrentMonth ? 'opacity-25 cursor-default' : 'hover:scale-105 active:scale-95'}
                ${isSelected 
                  ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/30 ring-2 ring-red-300 font-bold' 
                  : hasEvents
                  ? 'bg-red-50 border border-red-200 text-[#DA291C] hover:bg-red-100'
                  : 'bg-slate-50 border border-slate-100 text-slate-700 hover:bg-slate-100 hover:text-slate-900'}
                ${day.isToday && !isSelected ? 'ring-2 ring-[#DA291C]' : ''}
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
                        isSelected ? 'bg-white' : 'bg-[#DA291C]'
                      }`}
                    />
                  ))}
                  {day.eventCount > 3 && (
                    <span className="text-[8px] font-extrabold leading-none text-[#DA291C]">+</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#DA291C]" />
          <span className="font-semibold text-slate-700">Días con capacitaciones</span>
        </div>
        {selectedDate && (
          <div className="text-[#DA291C] font-bold">
            Filtro: {selectedDate}
          </div>
        )}
      </div>

    </div>
  );
};
