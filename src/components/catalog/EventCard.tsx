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
  Video,
  Lock,
  ShieldCheck,
  Building2,
  UserCheck
} from 'lucide-react';
import { TrainingEvent, UserAccount, Company } from '../../types';
import { formatDateShort } from '../../utils/formatters';

interface EventCardProps {
  event: TrainingEvent;
  currentUser: UserAccount | null;
  companies?: Company[];
  isRequiredInProgram?: boolean;
  onOpenReservationModal: (event: TrainingEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  currentUser,
  companies = [],
  isRequiredInProgram = false,
  onOpenReservationModal
}) => {
  // Calcular total de cupos y registros
  let totalCapacity = 0;
  let totalRegistered = 0;
  let isUserEnrolled = false;
  let isMandatoryAssignment = false;
  let isVoluntaryAssignment = false;
  let assignmentSupervisor: string | null = null;

  event.schedule.forEach(sch => {
    sch.slots.forEach(slot => {
      totalCapacity += slot.capacity;
      totalRegistered += slot.registered;
      if (currentUser?.email) {
        const cleanEmail = currentUser.email.toLowerCase();
        if (slot.attendees.map(a => a.toLowerCase()).includes(cleanEmail)) {
          isUserEnrolled = true;
          const detail = (slot.attendeesDetails || []).find(d => d.email.toLowerCase() === cleanEmail);
          if (detail) {
            if (detail.isMandatory) isMandatoryAssignment = true;
            if (detail.assignedBy) {
              assignmentSupervisor = detail.assignedBy;
              if (!detail.isMandatory) isVoluntaryAssignment = true;
            }
          }
        }
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
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:border-[#DA291C] hover:shadow-xl transition-all flex flex-col justify-between group">
      
      {/* Event Image & Header Badges */}
      <div>
        <div className="relative h-48 w-full overflow-hidden bg-slate-100">
          <img
            src={event.imageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#DA291C] text-white shadow-md">
                {event.category}
              </span>
              {(() => {
                const comp = companies.find(c => c.id === (event.companyId || 'emp_kasino'));
                return comp ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-slate-800 backdrop-blur-md border border-slate-200 flex items-center gap-1 shadow-sm">
                    <Building2 className="w-3 h-3 text-[#DA291C]" />
                    {comp.name}
                  </span>
                ) : null;
              })()}
              {isMandatoryAssignment ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-700 text-white backdrop-blur-md shadow-md flex items-center gap-1">
                  <Lock className="w-3 h-3 text-red-200" />
                  ★ Obligatorio
                </span>
              ) : isVoluntaryAssignment ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-600 text-white backdrop-blur-md shadow-md flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-cyan-200" />
                  Sugerido
                </span>
              ) : isRequiredInProgram ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#DA291C] text-white backdrop-blur-md shadow-md animate-pulse">
                  ★ En tu Cronograma
                </span>
              ) : null}
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md flex items-center gap-1 shadow-sm ${
              event.modality === 'Virtual'
                ? 'bg-white/90 text-cyan-700 border border-cyan-200'
                : 'bg-white/90 text-emerald-700 border border-emerald-200'
            }`}>
              {event.modality === 'Virtual' ? <Video className="w-3 h-3 text-cyan-600" /> : <MapPin className="w-3 h-3 text-emerald-600" />}
              {event.modality}
            </span>
          </div>

          {/* Bottom Image Overlay: Instructor & Rating */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-1.5 font-semibold bg-black/60 px-2.5 py-1 rounded-xl backdrop-blur-md border border-white/10">
              <User className="w-3.5 h-3.5 text-red-400" />
              <span className="line-clamp-1">{event.instructor}</span>
            </div>

            {avgRating && (
              <div className="flex items-center gap-1 bg-black/60 border border-amber-400/40 text-amber-300 px-2 py-0.5 rounded-xl text-[11px] font-bold backdrop-blur-md">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{avgRating}</span>
                <span className="text-[9px] opacity-80">({feedbacks.length})</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          <h3 className="text-base font-bold text-slate-900 group-hover:text-[#DA291C] transition-colors line-clamp-2 mb-2 leading-snug">
            {event.title}
          </h3>
          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
            {event.description}
          </p>

          {event.ojtEvaluatorName && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200 mb-3" title="Tutor / Evaluador OJT Responsable">
              <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>Tutor OJT: {event.ojtEvaluatorName}</span>
            </div>
          )}

          {/* Schedule Highlights */}
          <div className="space-y-1.5 mb-2">
            {event.schedule.slice(0, 2).map((sch, sIdx) => (
              <div key={sIdx} className="flex items-center justify-between text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#DA291C] shrink-0" />
                  <span className="font-medium">{formatDateShort(sch.date)}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                  <Clock className="w-3 h-3" />
                  <span>{sch.slots.map(s => s.time).join(', ')}</span>
                </div>
              </div>
            ))}
            {event.schedule.length > 2 && (
              <p className="text-[10px] text-[#DA291C] text-right font-bold">
                +{event.schedule.length - 2} fechas adicionales
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer: Capacity & Reservation CTA */}
      <div className="p-6 pt-0">
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <div className="text-xs">
              <span className={`font-bold ${isSoldOut ? 'text-rose-600' : 'text-slate-800'}`}>
                {totalRegistered} / {totalCapacity}
              </span>
              <span className="text-[11px] text-slate-500 ml-1">cupos</span>
            </div>
          </div>

          <button
            onClick={() => onOpenReservationModal(event)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              isUserEnrolled
                ? isMandatoryAssignment
                  ? 'bg-rose-50 border border-rose-300 text-rose-700'
                  : 'bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                : isSoldOut
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-[#DA291C] hover:bg-red-700 text-white shadow-md shadow-red-500/25 hover:scale-105 active:scale-95'
            }`}
          >
            {isUserEnrolled ? (
              isMandatoryAssignment ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Obligatorio</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Inscrito</span>
                </>
              )
            ) : isSoldOut ? (
              <span>Agotado</span>
            ) : (
              <>
                <span>Reservar Cupo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};
