import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Sparkles, 
  MapPin, 
  Video, 
  CalendarCheck,
  AlertCircle,
  ChevronRight,
  GraduationCap,
  Users,
  Building2,
  Calendar,
  X,
  Flame,
  Star,
  History
} from 'lucide-react';
import { TrainingEvent, UserAccount, TrainingProgram, ParticipantGroup, Participant, Company } from '../../types';
import { EventCard } from './EventCard';
import { PerpetualCalendar } from './PerpetualCalendar';
import { HeroCarousel } from '../common/HeroCarousel';

const CATEGORIES = ["Todos", "Taller", "Curso", "Webinar", "Charla", "Cine Forum", "Evento"];

interface CatalogViewProps {
  events: TrainingEvent[];
  currentUser: UserAccount | null;
  companies?: Company[];
  selectedCompanyId?: string;
  programs?: TrainingProgram[];
  groups?: ParticipantGroup[];
  participants?: Participant[];
  onOpenReservationModal: (event: TrainingEvent) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  events,
  currentUser,
  companies = [],
  selectedCompanyId = 'all',
  programs = [],
  groups = [],
  participants = [],
  onOpenReservationModal
}) => {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedModality, setSelectedModality] = useState<string>("Todos");
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [includePastEvents, setIncludePastEvents] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Fecha actual local en formato YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Eventos requeridos en los programas del usuario logueado
  const userEmail = currentUser?.email?.toLowerCase();
  const currentParticipant = participants.find(p => p.email.toLowerCase() === userEmail);
  const userCard = currentParticipant?.card;

  const requiredEventIds = new Set<string>();
  if (userCard) {
    programs.forEach(prog => {
      if (prog.status !== 'active') return;
      const isTarget = groups.some(g => prog.targetGroupIds.includes(g.id) && g.memberCards.includes(userCard)) ||
                       (prog.targetParticipantCards || []).includes(userCard);
      if (isTarget) {
        prog.eventItems.forEach(item => {
          requiredEventIds.add(item.eventId);
        });
      }
    });
  }

  const isSuperAdmin = currentUser?.role === 'Super Administrador';
  const effectiveCompany = isSuperAdmin 
    ? selectedCompanyId 
    : (currentUser?.companyId || 'emp_kasino');

  // Helper de visibilidad multiempresa (soporta eventos globales 'all' y arrays companyIds)
  const isEventVisibleForCompany = (e: TrainingEvent, targetCompanyId: string) => {
    if (targetCompanyId === 'all') return true;
    if (!e.companyId || e.companyId === 'all') return true;
    if (e.companyId === targetCompanyId) return true;
    if (Array.isArray(e.companyIds) && (e.companyIds.includes('all') || e.companyIds.includes(targetCompanyId))) return true;
    return false;
  };

  // Cálculos de KPIs en Vivo (Alineados a eventos vigentes por defecto)
  const stats = useMemo(() => {
    const activeEvents = events.filter(e => {
      if (e.status !== 'active') return false;
      if (!isEventVisibleForCompany(e, effectiveCompany)) return false;
      if (!includePastEvents && !selectedCalendarDate) {
        return e.schedule.some(s => s.date >= todayStr);
      }
      return true;
    });

    let totalCap = 0;
    let totalReg = 0;
    let totalSchedulesCount = 0;

    activeEvents.forEach(evt => {
      const relevantSchedules = (!includePastEvents && !selectedCalendarDate)
        ? evt.schedule.filter(s => s.date >= todayStr)
        : evt.schedule;

      totalSchedulesCount += relevantSchedules.length;
      relevantSchedules.forEach(s => s.slots.forEach(sl => {
        totalCap += sl.capacity;
        totalReg += sl.registered;
      }));
    });

    const activeCompaniesCount = effectiveCompany === 'all' 
      ? (companies.length > 0 ? companies.length : 3) 
      : 1;

    return {
      activeEventsCount: activeEvents.length,
      totalCapacity: totalCap,
      totalRegistered: totalReg,
      availableSlots: Math.max(0, totalCap - totalReg),
      companiesCount: activeCompaniesCount,
      sessionsCount: totalSchedulesCount
    };
  }, [events, effectiveCompany, companies, includePastEvents, selectedCalendarDate, todayStr]);

  // Contadores dinámicos por categoría (alineados a eventos vigentes)
  const categoryCounts = useMemo(() => {
    const baseEvents = events.filter(e => {
      if (e.status !== 'active') return false;
      if (!isEventVisibleForCompany(e, effectiveCompany)) return false;
      if (!includePastEvents && !selectedCalendarDate) {
        return e.schedule.some(s => s.date >= todayStr);
      }
      if (selectedCalendarDate) {
        return e.schedule.some(s => s.date === selectedCalendarDate);
      }
      return true;
    });

    const counts: Record<string, number> = {
      "Todos": baseEvents.length
    };
    CATEGORIES.forEach(cat => {
      if (cat !== "Todos") {
        counts[cat] = baseEvents.filter(e => e.category === cat).length;
      }
    });
    return counts;
  }, [events, effectiveCompany, includePastEvents, selectedCalendarDate, todayStr]);

  // Filtrado compuesto con discriminación de fechas actuales y futuras
  const filteredEvents = events.filter(evt => {
    if (evt.status !== 'active') return false;

    // Filtro por empresa
    if (!isEventVisibleForCompany(evt, effectiveCompany)) {
      return false;
    }

    // Filtro de fechas actuales y futuras por defecto
    if (!includePastEvents && !selectedCalendarDate) {
      const hasUpcomingSchedule = evt.schedule.some(s => s.date >= todayStr);
      if (!hasUpcomingSchedule) return false;
    }

    // Filtro por fecha específica seleccionada en el calendario
    if (selectedCalendarDate) {
      const hasDate = evt.schedule.some(s => s.date === selectedCalendarDate);
      if (!hasDate) return false;
    }

    // Filtro por categoría
    if (selectedCategory !== "Todos" && evt.category !== selectedCategory) {
      return false;
    }

    // Filtro por modalidad
    if (selectedModality !== "Todos" && evt.modality !== selectedModality) {
      return false;
    }

    // Filtro solo con cupos disponibles
    if (onlyAvailable) {
      let totalCap = 0;
      let totalReg = 0;
      const relevantSchedules = (!includePastEvents && !selectedCalendarDate)
        ? evt.schedule.filter(s => s.date >= todayStr)
        : evt.schedule;

      relevantSchedules.forEach(s => s.slots.forEach(sl => {
        totalCap += sl.capacity;
        totalReg += sl.registered;
      }));
      if (totalCap > 0 && totalReg >= totalCap) return false;
    }

    // Filtro por búsqueda de texto (título, descripción, instructor, lugar)
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchTitle = evt.title.toLowerCase().includes(q);
      const matchDesc = (evt.description || "").toLowerCase().includes(q);
      const matchInst = evt.instructor.toLowerCase().includes(q);
      const matchLoc = (evt.location || "").toLowerCase().includes(q);
      return matchTitle || matchDesc || matchInst || matchLoc;
    }

    return true;
  });

  // Cursos sugeridos / destacados (solo eventos con fechas actuales o futuras)
  const suggestedCourses = useMemo(() => {
    return events
      .filter(e => {
        if (e.status !== 'active') return false;
        if (!isEventVisibleForCompany(e, effectiveCompany)) return false;
        return e.schedule.some(s => s.date >= todayStr);
      })
      .slice(0, 4);
  }, [events, effectiveCompany, todayStr]);

  return (
    <div id="maincontent" className="space-y-8 pb-20">
      
      {/* 1. Hero Carousel Institucional Claro */}
      <HeroCarousel onExplore={() => {
        const el = document.getElementById('catalog-search-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }} />

      {/* 2. Live KPI Stats Ribbon (Modern Executive Strip) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-md hover:border-red-200 transition-all flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#DA291C] border border-red-100 flex items-center justify-center group-hover:scale-105 group-hover:bg-[#DA291C] group-hover:text-white transition-all shadow-sm">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{stats.activeEventsCount}</div>
            <p className="text-xs font-semibold text-slate-500">Cursos & Talleres Activos</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-md hover:border-cyan-200 transition-all flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-100 flex items-center justify-center group-hover:scale-105 group-hover:bg-cyan-600 group-hover:text-white transition-all shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalRegistered}</div>
            <p className="text-xs font-semibold text-slate-500">Inscripciones Registradas</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{stats.availableSlots}</div>
            <p className="text-xs font-semibold text-slate-500">Cupos Disponibles</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-md hover:border-purple-200 transition-all flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{stats.companiesCount}</div>
            <p className="text-xs font-semibold text-slate-500">Empresas & Sedes</p>
          </div>
        </div>
      </div>

      {/* 3. Sección Cursos Sugeridos & Tendencias */}
      {suggestedCourses.length > 0 && (
        <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#DA291C] animate-pulse" />
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Cursos <span className="text-[#DA291C]">Recomendados & Tendencias</span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Formaciones de alto impacto sugeridas según tu plan de desarrollo y demanda operativa.
              </p>
            </div>
            <span className="text-xs font-black text-[#DA291C] bg-red-50 border border-red-200/80 px-3.5 py-1.5 rounded-2xl shadow-xs self-start sm:self-auto flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-[#DA291C]" />
              <span>Alta Prioridad</span>
            </span>
          </div>

          {/* Grid de Cursos Sugeridos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {suggestedCourses.map(course => {
              return (
                <div 
                  key={course.id}
                  onClick={() => onOpenReservationModal(course)}
                  className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:border-[#DA291C] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                  <div className="relative h-36 w-full overflow-hidden bg-slate-100">
                    <img 
                      src={course.imageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80"}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#DA291C] text-white shadow-md">
                      {course.category}
                    </span>
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-slate-900 backdrop-blur-md shadow-xs">
                      {course.modality}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-[#DA291C] transition-colors line-clamp-2 mb-1.5 leading-snug">
                        {course.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-slate-500 font-medium truncate max-w-[150px]">
                        Facilitador: <strong className="text-slate-800 font-bold">{course.instructor}</strong>
                      </span>
                      <span className="text-[#DA291C] font-black flex items-center gap-1 group-hover:translate-x-1 transition-transform shrink-0">
                        Inscribirme <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Barra de Búsqueda Command-Bar */}
      <div id="catalog-search-section" className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-red-50/80 via-white to-slate-50 border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-[#DA291C] text-xs font-black mb-2.5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#DA291C]" />
            <span>Impulsa tu crecimiento, certificaciones y desarrollo continuo</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-2">
            Catálogo General de <span className="text-[#DA291C]">Capacitaciones</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mb-6">
            Inscríbete a talleres prácticos, conferencias interactivas, certificaciones técnicas y clínicas operativas.
          </p>

          {/* Command-Bar Search Input */}
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-[#DA291C]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por tema, instructor, palabra clave, código o lugar..."
              className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-300/90 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C] focus:ring-4 focus:ring-red-500/10 shadow-md shadow-slate-200/50 transition-all font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Grid Principal: Filtros y Eventos + Calendario Perpetuo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Columna Izquierda: Filtros & Grid de Cursos */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Category Filter Pills with Live Counters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {CATEGORIES.map(cat => {
              const count = categoryCounts[cat] || 0;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#DA291C] to-red-600 text-white shadow-md shadow-red-500/25 scale-[1.02]'
                      : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                    isSelected ? 'bg-white text-[#DA291C]' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Secondary Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Filter className="w-4 h-4 text-[#DA291C]" />
              <span className="font-bold">Filtros rápidos:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Modality Filter */}
              <div className="flex items-center bg-slate-100/90 rounded-2xl p-1 border border-slate-200">
                <button
                  onClick={() => setSelectedModality("Todos")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-xs ${
                    selectedModality === "Todos" ? 'bg-[#DA291C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setSelectedModality("Presencial")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
                    selectedModality === "Presencial" ? 'bg-[#DA291C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" /> Presencial
                </button>
                <button
                  onClick={() => setSelectedModality("Virtual")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
                    selectedModality === "Virtual" ? 'bg-[#DA291C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" /> Virtual
                </button>
              </div>

              {/* Only Available Toggle */}
              <button
                onClick={() => setOnlyAvailable(!onlyAvailable)}
                className={`px-3.5 py-1.5 rounded-2xl border font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  onlyAvailable
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Solo con cupo</span>
              </button>

              {/* Include Past Events Toggle */}
              <button
                onClick={() => setIncludePastEvents(!includePastEvents)}
                className={`px-3.5 py-1.5 rounded-2xl border font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  includePastEvents
                    ? 'bg-slate-800 text-white border-slate-900 shadow-md shadow-slate-900/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                title={includePastEvents ? "Ocultar eventos pasados" : "Mostrar también eventos pasados ya finalizados"}
              >
                <History className={`w-3.5 h-3.5 ${includePastEvents ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{includePastEvents ? "Historial incluido" : "Incluir pasados"}</span>
              </button>
            </div>
          </div>

          {/* Events Count Indicator */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span>
                Mostrando <strong className="text-slate-900 font-black">{filteredEvents.length}</strong> {includePastEvents ? 'capacitaciones (incluyendo historial)' : 'capacitaciones vigentes'}
              </span>
              {!includePastEvents && !selectedCalendarDate && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                  ● Fechas actuales y futuras
                </span>
              )}
            </div>
            {selectedCalendarDate && (
              <span className="text-[#DA291C] font-bold bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                📅 Filtrado por fecha: {selectedCalendarDate}
              </span>
            )}
          </div>

          {/* Events Grid */}
          {filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  currentUser={currentUser}
                  companies={companies}
                  isRequiredInProgram={requiredEventIds.has(event.id)}
                  onOpenReservationModal={onOpenReservationModal}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-red-50 text-[#DA291C] border border-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No se encontraron capacitaciones</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Intenta ajustar los términos de búsqueda, la categoría o la fecha seleccionada en el calendario.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory("Todos");
                  setSelectedModality("Todos");
                  setOnlyAvailable(false);
                  setIncludePastEvents(false);
                  setSearchQuery("");
                  setSelectedCalendarDate(null);
                }}
                className="mt-5 px-5 py-2.5 rounded-2xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md shadow-red-500/20 cursor-pointer"
              >
                Restablecer todos los filtros
              </button>
            </div>
          )}

        </div>

        {/* Columna Derecha: Calendario Perpetuo */}
        <div className="lg:col-span-1 sticky top-28">
          <PerpetualCalendar
            events={events}
            selectedDate={selectedCalendarDate}
            onSelectDate={setSelectedCalendarDate}
          />
        </div>

      </div>

    </div>
  );
};

