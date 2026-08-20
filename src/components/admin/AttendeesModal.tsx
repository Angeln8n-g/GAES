import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  Calendar as CalendarIcon, 
  UserCheck,
  UserX
} from 'lucide-react';
import { TrainingEvent, Participant } from '../../types';
import { exportAttendeesToExcel } from '../../utils/excelUtils';
import { formatDateLong } from '../../utils/formatters';

interface AttendeesModalProps {
  event: TrainingEvent | null;
  participants: Participant[];
  onClose: () => void;
  onConfirmAttendance: (eventId: string, date: string, time: string, email: string) => Promise<void>;
}

export const AttendeesModal: React.FC<AttendeesModalProps> = ({
  event,
  participants,
  onClose,
  onConfirmAttendance
}) => {
  if (!event) return null;

  const [selectedDate, setSelectedDate] = useState<string>(event.schedule[0]?.date || '');
  const [selectedTime, setSelectedTime] = useState<string>(event.schedule[0]?.slots[0]?.time || '');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentSchedule = event.schedule.find(s => s.date === selectedDate);
  const currentSlot = currentSchedule?.slots.find(s => s.time === selectedTime);

  const attendeesList = currentSlot?.attendees || [];
  const attendedList = currentSlot?.attendedList || [];

  const filteredAttendees = attendeesList.filter(email => {
    const p = participants.find(part => part.email.toLowerCase() === email.toLowerCase());
    const query = searchQuery.toLowerCase();
    return email.toLowerCase().includes(query) || (p && p.name.toLowerCase().includes(query)) || (p && p.card.includes(query));
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400">
                Lista de Asistencia
              </span>
              <span className="text-xs text-slate-400 font-medium">{event.category}</span>
            </div>
            <h2 className="text-lg font-bold text-white line-clamp-1">{event.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date & Slot Selectors */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/40 space-y-4">
          <div className="flex flex-wrap gap-2">
            {event.schedule.map(sch => (
              <button
                key={sch.date}
                onClick={() => {
                  setSelectedDate(sch.date);
                  setSelectedTime(sch.slots[0]?.time || '');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedDate === sch.date
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {formatDateLong(sch.date)}
              </button>
            ))}
          </div>

          {currentSchedule && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {currentSchedule.slots.map(s => (
                  <button
                    key={s.time}
                    onClick={() => setSelectedTime(s.time)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                      selectedTime === s.time
                        ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s.time} ({s.registered}/{s.capacity})
                  </button>
                ))}
              </div>

              {currentSlot && (
                <button
                  onClick={() => exportAttendeesToExcel(event, selectedDate, selectedTime, attendeesList, attendedList, participants)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Asistentes (.xlsx)</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search & Attendees Table */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute inset-y-0 left-3 my-auto" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar asistente por nombre, correo o número de tarjeta..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {filteredAttendees.length > 0 ? (
            <div className="space-y-2">
              {filteredAttendees.map((email, idx) => {
                const p = participants.find(part => part.email.toLowerCase() === email.toLowerCase());
                const isAttended = attendedList.map(a => a.toLowerCase()).includes(email.toLowerCase());

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isAttended ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {p?.name ? p.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {p?.name || 'Colaborador no registrado en padrón'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {email} {p?.card && `• Tarjeta: ${p.card}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 ${
                        isAttended
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isAttended ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Confirmado</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>Pendiente</span>
                          </>
                        )}
                      </span>

                      {!isAttended && (
                        <button
                          onClick={() => onConfirmAttendance(event.id, selectedDate, selectedTime, email)}
                          className="px-2.5 py-1 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-[10px] font-bold transition-colors"
                        >
                          Marcar Asistencia
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              No hay colaboradores inscritos que coincidan con la búsqueda en este horario.
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
