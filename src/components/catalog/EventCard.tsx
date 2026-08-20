import React from 'react';
import { 
  User, 
  MapPin, 
  Clock, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  ArrowRight, 
  Star, 
  Users,
  Video
} from 'lucide-react';
import { TrainingEvent, UserAccount } from '../../types';
import { formatDateShort } from '../../utils/formatters';

interface EventCardProps {
  event: TrainingEvent;
  currentUser: UserAccount | null;
  onOpenReservationModal: (event: TrainingEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  currentUser,
  onOpenReservationModal
}) => {
  // Calcular total de cupos y registros
  let totalCapacity = 0;
  let totalRegistered = 0;
  let isUserEnrolled = false;

  event.schedule.forEach(sch => {
    sch.slots.forEach(slot => {
      totalCapacity += slot.capacity;
      totalRegistered += slot.registered;
      if (currentUser?.email && slot.attendees.map(a => a.toLowerCase()).includes(currentUser.email.toLowerCase())) {
        isUserEnrolled = true;
      }
    });
  });

  const availableSlots = totalCapacity - totalRegistered;
  const isSoldOut = totalCapacity > 0 && availableSlots <= 0;

  // Calcular promedio de calificación
  const feedbacks = event.feedbacks || [];
  const avgRating = feedbacks.length > 0 
    ? (feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / feedbacks.length).toFixed(1)
    : null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all flex flex-col group">
      
      {/* Event Image & Header Badges */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-950">
        <img
          src={event.imageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-600/90 text-white backdrop-blur-md shadow-md">
            {event.category}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md flex items-center gap-1 ${
            event.modality === 'Virtual'
              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30'
              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
          }`}>
            {event.modality === 'Virtual' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
            {event.modality}
          </span>
        </div>

        {/* Bottom Image Overlay: Instructor & Rating */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-1.5 font-medium bg-slate-950/70 px-2.5 py-1 rounded-xl backdrop-blur-md">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <span className="line-clamp-1">{event.instructor}</span>
          </div>

          {avgRating && (
            <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-xl text-[11px] font-bold backdrop-blur-md">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{avgRating}</span>
              <span className="text-[9px] opacity-80">({feedbacks.length})</span>
            </div>
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2 mb-2 leading-snug">
            {event.title}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
            {event.description}
          </p>

          {/* Schedule Highlights */}
          <div className="space-y-1.5 mb-4">
            {event.schedule.slice(0, 2).map((sch, sIdx) => (
              <div key={sIdx} className="flex items-center justify-between text-xs bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-800/60 text-slate-300">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{formatDateShort(sch.date)}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{sch.slots.map(s => s.time).join(', ')}</span>
                </div>
              </div>
            ))}
            {event.schedule.length > 2 && (
              <p className="text-[10px] text-indigo-400 text-right font-medium">
                +{event.schedule.length - 2} fechas adicionales disponibles
              </p>
            )}
          </div>
        </div>

        {/* Card Footer: Capacity & Reservation CTA */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <div className="text-xs">
              <span className={`font-bold ${isSoldOut ? 'text-rose-400' : 'text-slate-200'}`}>
                {totalRegistered} / {totalCapacity}
              </span>
              <span className="text-[11px] text-slate-400 ml-1">inscritos</span>
            </div>
          </div>

          <button
            onClick={() => onOpenReservationModal(event)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              isUserEnrolled
                ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                : isSoldOut
                ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95'
            }`}
          >
            {isUserEnrolled ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Inscrito</span>
              </>
            ) : isSoldOut ? (
              <span>Ver Horarios</span>
            ) : (
              <>
                <span>Reservar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
};
