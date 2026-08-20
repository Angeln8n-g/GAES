import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Sparkles, 
  Layers, 
  MapPin, 
  Video, 
  CalendarCheck,
  AlertCircle
} from 'lucide-react';
import { TrainingEvent, UserAccount } from '../../types';
import { EventCard } from './EventCard';
import { PerpetualCalendar } from './PerpetualCalendar';

const CATEGORIES = ["Todos", "Taller", "Curso", "Webinar", "Charla", "Cine Forum", "Evento"];

interface CatalogViewProps {
  events: TrainingEvent[];
  currentUser: UserAccount | null;
  onOpenReservationModal: (event: TrainingEvent) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  events,
  currentUser,
  onOpenReservationModal
}) => {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedModality, setSelectedModality] = useState<string>("Todos");
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Filtrado compuesto
  const filteredEvents = events.filter(evt => {
    if (evt.status !== 'active') return false;

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

  return (
    <div className="space-y-8 pb-16">
      
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-950 border border-slate-800 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Impulsa tu crecimiento profesional</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
            Descubre y Reserva tus <span className="bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent">Capacitaciones</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed mb-6">
            Inscríbete a talleres prácticos, conferencias interactivas y webinars dirigidos por especialistas corporativos para llevar tus habilidades al siguiente nivel.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por tema, instructor, palabra clave o lugar..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 backdrop-blur-md shadow-inner transition-all"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Filters & Events on Left/Center, Perpetual Calendar on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left 2 Columns: Filters & Events Grid */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Secondary Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Filter className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold">Filtros rápidos:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Modality Filter */}
              <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800">
                <button
                  onClick={() => setSelectedModality("Todos")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    selectedModality === "Todos" ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setSelectedModality("Presencial")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                    selectedModality === "Presencial" ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MapPin className="w-3 h-3" /> Presencial
                </button>
                <button
                  onClick={() => setSelectedModality("Virtual")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                    selectedModality === "Virtual" ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Video className="w-3 h-3" /> Virtual
                </button>
              </div>

              {/* Only Available Toggle */}
              <button
                onClick={() => setOnlyAvailable(!onlyAvailable)}
                className={`px-3 py-1.5 rounded-xl border font-medium flex items-center gap-1.5 transition-colors ${
                  onlyAvailable
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Solo con cupo</span>
              </button>
            </div>
          </div>

          {/* Events Count Indicator */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Mostrando <strong className="text-white">{filteredEvents.length}</strong> capacitaciones
            </span>
            {selectedCalendarDate && (
              <span className="text-indigo-400 font-semibold">
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
                  onOpenReservationModal={onOpenReservationModal}
                />
              ))}
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-300">No se encontraron capacitaciones</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
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
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
              >
                Restablecer todos los filtros
              </button>
            </div>
          )}

        </div>

        {/* Right Column: Perpetual Calendar Widget */}
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
