import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Sparkles, 
  MapPin, 
  Video, 
  CalendarCheck,
  AlertCircle,
  ChevronRight
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

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

  // Filtrado compuesto
  const filteredEvents = events.filter(evt => {
    if (evt.status !== 'active') return false;

    // Filtro por empresa
    if (effectiveCompany !== 'all' && evt.companyId && evt.companyId !== effectiveCompany) {
      return false;
    }

    // Filtro por categoría
    if (selectedCategory !== "Todos" && evt.category !== selectedCategory) {
      return false;
    }

    // Filtro por modalidad
    if (selectedModality !== "Todos" && evt.modality !== selectedModality) {
      return false;
    }

    // Filtro por fecha del calendario
    if (selectedCalendarDate) {
      const hasDate = evt.schedule.some(s => s.date === selectedCalendarDate);
      if (!hasDate) return false;
    }

    // Filtro solo con cupos disponibles
    if (onlyAvailable) {
      let totalCap = 0;
      let totalReg = 0;
      evt.schedule.forEach(s => s.slots.forEach(sl => {
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

  // Cursos sugeridos / destacados (Top 4 eventos)
  const suggestedCourses = events
    .filter(e => e.status === 'active' && (effectiveCompany === 'all' || !e.companyId || e.companyId === effectiveCompany))
    .slice(0, 4);

  return (
    <div id="maincontent" className="space-y-8 pb-16">
      
      {/* 1. Hero Carousel Institucional Claro */}
      <HeroCarousel onExplore={() => {
        const el = document.getElementById('catalog-search-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }} />

      {/* 2. Sección Cursos Sugeridos (Light Theme) */}
      {suggestedCourses.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DA291C] animate-pulse" />
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Cursos <span className="text-[#DA291C]">Sugeridos</span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Esta sección sugiere cursos en función de los que tienen mayor visualización e impacto dentro de la plataforma.
              </p>
            </div>
            <span className="text-xs font-bold text-[#DA291C] bg-red-50 border border-red-200 px-3 py-1 rounded-xl self-start sm:self-auto">
              ★ Más demandados
            </span>
          </div>

          {/* Grid de Cursos Sugeridos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {suggestedCourses.map(course => {
              return (
                <div 
                  key={course.id}
                  onClick={() => onOpenReservationModal(course)}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-[#DA291C] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="relative h-32 w-full overflow-hidden bg-slate-100">
                    <img 
                      src={course.imageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80"}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#DA291C] text-white shadow-sm">
                      {course.category}
                    </span>
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-slate-800 border border-slate-200 backdrop-blur-md">
                      {course.modality}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#DA291C] transition-colors line-clamp-2 mb-1 leading-snug">
                        {course.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        Instructor: <strong className="text-slate-800">{course.instructor.split(' ')[0]}</strong>
                      </span>
                      <span className="text-[#DA291C] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Ver cupos <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Barra de Búsqueda & Explorador (Light Theme) */}
      <div id="catalog-search-section" className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-red-50/70 via-white to-slate-50 border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-[#DA291C] text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Impulsa tu crecimiento y desarrollo profesional</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-2">
            Catálogo General de <span className="text-[#DA291C]">Capacitaciones</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed mb-5">
            Inscríbete a talleres prácticos, conferencias interactivas, certificaciones técnicas y clínicas de servicio al cliente.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5 text-[#DA291C]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por tema, código, instructor, palabra clave o lugar..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C] focus:ring-2 focus:ring-red-100 shadow-sm transition-all"
            />
          </div>
        </div>
      </div>

      {/* 4. Grid Principal: Filtros y Eventos + Calendario Perpetuo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Columna Izquierda: Filtros & Grid de Cursos */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                    : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Secondary Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Filter className="w-4 h-4 text-[#DA291C]" />
              <span className="font-bold">Filtros rápidos:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Modality Filter */}
              <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button
                  onClick={() => setSelectedModality("Todos")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    selectedModality === "Todos" ? 'bg-[#DA291C] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setSelectedModality("Presencial")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                    selectedModality === "Presencial" ? 'bg-[#DA291C] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MapPin className="w-3 h-3" /> Presencial
                </button>
                <button
                  onClick={() => setSelectedModality("Virtual")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                    selectedModality === "Virtual" ? 'bg-[#DA291C] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Video className="w-3 h-3" /> Virtual
                </button>
              </div>

              {/* Only Available Toggle */}
              <button
                onClick={() => setOnlyAvailable(!onlyAvailable)}
                className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-colors ${
                  onlyAvailable
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Solo con cupo</span>
              </button>
            </div>
          </div>

          {/* Events Count Indicator */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Mostrando <strong className="text-slate-900">{filteredEvents.length}</strong> capacitaciones activas
            </span>
            {selectedCalendarDate && (
              <span className="text-[#DA291C] font-bold">
                Filtrado por fecha: {selectedCalendarDate}
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
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No se encontraron capacitaciones</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Intenta ajustar los términos de búsqueda, la categoría o la fecha seleccionada en el calendario.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory("Todos");
                  setSelectedModality("Todos");
                  setOnlyAvailable(false);
                  setSearchQuery("");
                  setSelectedCalendarDate(null);
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm"
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
