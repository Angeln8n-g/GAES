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
  UserCheck,
  Sparkles,
  Globe,
  Leaf
} from 'lucide-react';
import { TrainingEvent, UserAccount, Company } from '../../types';
import { formatDateShort, getEventDurationMetrics } from '../../utils/formatters';

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

  const availableSlots = Math.max(0, totalCapacity - totalRegistered);
  const isSoldOut = totalCapacity > 0 && availableSlots <= 0;
  const percentageFilled = totalCapacity > 0 
    ? Math.min(100, Math.round((totalRegistered / totalCapacity) * 100)) 
    : 0;

  // Color de barra de progreso
  const progressColor = percentageFilled >= 100 
    ? 'bg-rose-500' 
    : percentageFilled >= 80 
    ? 'bg-amber-500' 
    : 'bg-emerald-500';

  // Calcular promedio de calificación
  const feedbacks = event.feedbacks || [];
  const avgRating = feedbacks.length > 0 
    ? (feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / feedbacks.length).toFixed(1)
    : null;

  const comp = companies.find(c => c.id === (event.companyId || 'emp_kasino'));

  // Obtener fecha actual local YYYY-MM-DD
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Priorizar fechas vigentes y futuras
  const upcomingSchedules = event.schedule.filter(s => s.date >= todayStr);
  const isPastEvent = event.schedule.length > 0 && upcomingSchedules.length === 0;
  const displaySchedules = upcomingSchedules.length > 0 
    ? upcomingSchedules.slice(0, 2) 
    : event.schedule.slice(0, 2);
  const additionalSchedulesCount = Math.max(0, (upcomingSchedules.length > 0 ? upcomingSchedules.length : event.schedule.length) - 2);

  const durationMetrics = getEventDurationMetrics(event);

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs hover:border-[#DA291C] hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group">
      
      {/* Event Image & Header Badges */}
      <div>
        <div className="relative h-48 w-full overflow-hidden bg-slate-100">
          <img
            src={event.imageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-black bg-[#DA291C] text-white shadow-md">
                {event.category}
              </span>

              {isPastEvent && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-slate-200 backdrop-blur-md shadow-xs border border-slate-700">
                  Finalizado
                </span>
              )}
              
              {event.companyId === 'all' || !event.companyId ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-slate-800 backdrop-blur-md border border-slate-200/80 flex items-center gap-1 shadow-xs">
                  <Globe className="w-3 h-3 text-emerald-600" />
                  <span>Todas las Empresas</span>
                </span>
              ) : comp ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-slate-800 backdrop-blur-md border border-slate-200/80 flex items-center gap-1 shadow-xs">
                  <Building2 className="w-3 h-3 text-[#DA291C]" />
                  <span>{comp.name.split(' ')[0]}</span>
                </span>
              ) : null}

              {isMandatoryAssignment ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white backdrop-blur-md shadow-md flex items-center gap-1">
                  <Lock className="w-3 h-3 text-rose-200" />
                  <span>★ Obligatorio</span>
                </span>
              ) : isVoluntaryAssignment ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-600 text-white backdrop-blur-md shadow-md flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-sky-200" />
                  <span>Sugerido</span>
                </span>
              ) : isRequiredInProgram ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#DA291C] text-white backdrop-blur-md shadow-md animate-pulse">
                  <span>★ En tu Cronograma</span>
                </span>
              ) : null}
            </div>

            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md flex items-center gap-1 shadow-xs ${
              event.modality === 'Virtual'
                ? 'bg-white/95 text-cyan-700 border border-cyan-200'
                : 'bg-white/95 text-emerald-700 border border-emerald-200'
            }`}>
              {event.modality === 'Virtual' ? <Video className="w-3 h-3 text-cyan-600" /> : <MapPin className="w-3 h-3 text-emerald-600" />}
              <span>{event.modality}</span>
            </span>
          </div>

          {/* Bottom Image Overlay: Instructor & Rating */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-1.5 font-bold bg-black/60 px-3 py-1 rounded-xl backdrop-blur-md border border-white/10">
              <User className="w-3.5 h-3.5 text-red-400" />
              <span className="line-clamp-1">{event.instructor}</span>
            </div>

            {avgRating && (
              <div className="flex items-center gap-1 bg-black/60 border border-amber-400/40 text-amber-300 px-2.5 py-0.5 rounded-xl text-[11px] font-bold backdrop-blur-md">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{avgRating}</span>
                <span className="text-[9px] opacity-80">({feedbacks.length})</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {/* Duration & Classification Pills */}
          <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>{durationMetrics.totalHours} hrs</span>
              <span className="text-amber-400">•</span>
              <span>{durationMetrics.totalDays} {durationMetrics.totalDays === 1 ? 'día' : 'días'}</span>
            </span>

            {(event.subprogram?.toLowerCase().includes('sustentabilidad') || event.programCategory === 'Capacitacion_seguridad_salud_en_el_trabajo_y_sustentabilidad') && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                <Leaf className="w-3 h-3 text-emerald-600" />
                <span>Sustentabilidad</span>
              </span>
            )}

            {event.sessionType && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {event.sessionType}
              </span>
            )}
          </div>

          <h3 className="text-base font-black text-slate-900 group-hover:text-[#DA291C] transition-colors line-clamp-2 mb-2 leading-snug">
            {event.title}
          </h3>
          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4 font-normal">
            {event.description}
          </p>

          {/* Tutor OJT Badge if Assigned */}
          {event.ojtEvaluatorName && (
            <div className="flex items-center gap-2 text-[11px] font-black text-purple-700 bg-purple-50/90 px-3 py-1.5 rounded-2xl border border-purple-200 mb-3.5 shadow-2xs" title="Tutor / Evaluador OJT Responsable">
              <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>Tutor OJT: <strong className="text-purple-900">{event.ojtEvaluatorName}</strong></span>
            </div>
          )}

          {/* Schedule Highlights */}
          <div className="space-y-1.5 mb-3">
            {displaySchedules.map((sch, sIdx) => {
              const isPast = sch.date < todayStr;
              return (
                <div key={sIdx} className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-2xl border ${
                  isPast ? 'bg-slate-100/70 border-slate-200 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className={`w-3.5 h-3.5 shrink-0 ${isPast ? 'text-slate-400' : 'text-[#DA291C]'}`} />
                    <span className="font-semibold">{formatDateShort(sch.date)}</span>
                    {sch.date === todayStr && (
                      <span className="px-1.5 py-0.2 rounded-md bg-red-100 text-[#DA291C] text-[9px] font-black uppercase">
                        Hoy
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{sch.slots.map(s => s.endTime ? `${s.time} - ${s.endTime}` : s.time).join(', ')}</span>
                  </div>
                </div>
              );
            })}
            {additionalSchedulesCount > 0 && (
              <p className="text-[10px] text-[#DA291C] text-right font-black">
                +{additionalSchedulesCount} fechas adicionales
              </p>
            )}
          </div>

          {/* Capacity Progress Bar */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Ocupación de cupos</span>
              <span className={`font-bold ${isSoldOut ? 'text-rose-600' : 'text-slate-800'}`}>
                {totalRegistered} de {totalCapacity} ({percentageFilled}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${progressColor} transition-all duration-500 rounded-full`}
                style={{ width: `${percentageFilled}%` }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Card Footer: Capacity & Reservation CTA */}
      <div className="p-6 pt-0">
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-800">
              {availableSlots > 0 ? `${availableSlots} disponibles` : 'Sin cupos'}
            </span>
          </div>

          <button
            onClick={() => onOpenReservationModal(event)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
              isUserEnrolled
                ? isMandatoryAssignment
                  ? 'bg-rose-50 border border-rose-300 text-rose-700 shadow-rose-100'
                  : 'bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                : isPastEvent
                ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                : isSoldOut
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-gradient-to-r from-[#DA291C] to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md shadow-red-500/25 hover:scale-105 active:scale-95'
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
            ) : isPastEvent ? (
              <span>Ver detalles</span>
            ) : isSoldOut ? (
              <span>Agotado</span>
            ) : (
              <>
                <span>Inscribirme</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};
