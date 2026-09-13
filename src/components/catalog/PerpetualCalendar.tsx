import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw, Sparkles } from 'lucide-react';
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
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;

  const [currentYear, setCurrentYear] = useState<number>(todayYear);
  const [currentMonth, setCurrentMonth] = useState<number>(todayMonth);

  const isCurrentMonthView = currentYear === todayYear && currentMonth === todayMonth;

  const handleResetToCurrentMonth = () => {
    setCurrentYear(todayYear);
    setCurrentMonth(todayMonth);
  };

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
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs hover:shadow-md transition-shadow">
      
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#DA291C] border border-red-100 flex items-center justify-center shadow-2xs">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
              <span>{MONTH_NAMES_ES[currentMonth - 1]}</span>
              <span className="text-[#DA291C]">{currentYear}</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">Explorar por fecha</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {selectedDate && (
            <button
              onClick={() => onSelectDate(null)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              title="Limpiar filtro de fecha"
            >
              <RotateCcw className="w-3 h-3 text-[#DA291C]" />
              <span>Ver todos</span>
            </button>
          )}

          {!isCurrentMonthView && (
            <button
              onClick={handleResetToCurrentMonth}
              className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-[11px] font-bold text-[#DA291C] border border-red-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Volver al mes actual"
            >
              <CalendarIcon className="w-3 h-3" />
              <span>Hoy</span>
            </button>
          )}

          <div className="flex items-center bg-slate-100/90 border border-slate-200 rounded-2xl p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl text-slate-600 hover:text-slate-950 hover:bg-white transition-colors cursor-pointer"
              title="Mes Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl text-slate-600 hover:text-slate-950 hover:bg-white transition-colors cursor-pointer"
              title="Mes Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Week Day Header */}
      <div className="grid grid-cols-7 gap-1.5 mb-2.5 text-center">
        {DAY_NAMES_SHORT_ES.map((d, i) => (
          <div 
            key={d} 
            className={`text-[11px] font-black py-1 tracking-wider ${i === 0 || i === 6 ? 'text-red-500' : 'text-slate-400'}`}
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
                relative h-12 rounded-2xl flex flex-col items-center justify-center transition-all text-xs font-black cursor-pointer
                ${!day.isCurrentMonth ? 'opacity-20 cursor-default pointer-events-none' : 'hover:scale-105 active:scale-95'}
                ${isSelected 
                  ? 'bg-gradient-to-r from-[#DA291C] to-red-600 text-white shadow-md shadow-red-500/35 ring-2 ring-red-300 font-black' 
                  : hasEvents
                  ? 'bg-red-50/90 border border-red-200/80 text-[#DA291C] hover:bg-red-100 hover:border-red-300'
                  : 'bg-slate-50/80 border border-slate-100 text-slate-700 hover:bg-slate-100 hover:text-slate-900'}
                ${day.isToday && !isSelected ? 'ring-2 ring-[#DA291C]' : ''}
              `}
            >
              <span className="leading-tight">{day.dayNumber}</span>
              {day.isToday && !isSelected && (
                <span className="text-[7.5px] font-black text-[#DA291C] leading-none uppercase tracking-tighter">Hoy</span>
              )}
              
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
                    <span className="text-[8px] font-black leading-none text-[#DA291C]">+</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#DA291C]" />
          <span className="font-semibold text-slate-700">Días con capacitaciones</span>
        </div>
        {selectedDate && (
          <div className="text-[#DA291C] font-black bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
            {selectedDate}
          </div>
        )}
      </div>

    </div>
  );
};

