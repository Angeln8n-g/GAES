import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Camera, 
  Sparkles, 
  CheckCircle2, 
  MapPin, 
  QrCode, 
  Clock, 
  ArrowRight, 
  X, 
  ShieldCheck, 
  HelpCircle,
  Laptop
} from 'lucide-react';
import { formatCedula } from '../../utils/formatters';

interface ReceptionLobbySectionProps {
  onLookupCedula: (cedulaQuery: string) => void;
  onOpenCedulaScanner: () => void;
  isSearching?: boolean;
  isKioskMode?: boolean;
  onExitKiosk?: () => void;
}

// Cédulas de demostración rápida para pruebas en recepción
const DEMO_CEDULAS = [
  { cedula: '402-2196163-1', name: 'Luis Almazan', note: '2 Sesiones' },
  { cedula: '001-0876543-2', name: 'Liliana Sosa', note: '1 Sesión' },
  { cedula: '031-0456789-4', name: 'Fermin Chi', note: 'En Padrón' }
];

export const ReceptionLobbySection: React.FC<ReceptionLobbySectionProps> = ({
  onLookupCedula,
  onOpenCedulaScanner,
  isSearching = false,
  isKioskMode = false,
  onExitKiosk
}) => {
  const [cedulaInput, setCedulaInput] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatCedula(raw);
    setCedulaInput(formatted);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cedulaInput.trim()) {
      onLookupCedula(cedulaInput.trim());
    }
  };

  const handleQuickPick = (cedula: string) => {
    setCedulaInput(cedula);
    onLookupCedula(cedula);
  };

  const handleClear = () => {
    setCedulaInput('');
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl border transition-all ${
      isKioskMode 
        ? 'bg-gradient-to-b from-slate-900 via-slate-950 to-black border-red-900/40 text-white p-8 sm:p-12 shadow-2xl min-h-[75vh] flex flex-col justify-between'
        : 'bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 border-red-800/30 text-white p-6 sm:p-8 shadow-xl'
    }`}>
      {/* Background Decorative Accents */}
      <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 rounded-full bg-[#DA291C]/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-80 h-80 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none" />

      {/* Top Banner / Kiosk Exit */}
      {isKioskMode && onExitKiosk && (
        <div className="relative z-10 flex items-center justify-between pb-6 mb-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Terminal Kiosco de Recepción Activa</span>
          </div>
          <button
            onClick={onExitKiosk}
            className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Volver al Catálogo Web</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative z-10 max-w-4xl mx-auto w-full">
        {/* Badges & Titles */}
        <div className="text-center sm:text-left mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/25 border border-red-500/40 text-red-300 text-xs font-bold mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#DA291C]" />
            <span>Lobby & Recepción de Capacitaciones</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
            Consulta de Asistencia & <span className="text-red-400">Cursos por Cédula</span>
          </h2>

          <p className="mt-2 text-xs sm:text-sm text-slate-300 font-medium max-w-2xl leading-relaxed">
            ¿Llegaste a tu entrenamiento presencial? Ingresa tu documento de identidad o escanéalo para ubicar tu aula, ver tus horarios asignados y obtener tu pase QR de acceso.
          </p>
        </div>

        {/* Input Bar & Actions Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Cédula Input Field */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <CreditCard className="w-5 h-5 text-red-400" />
              </div>
              <input
                type="text"
                value={cedulaInput}
                onChange={handleInputChange}
                placeholder="000-0000000-0 (o carnet / cédula física)"
                maxLength={13}
                autoComplete="off"
                className="w-full pl-12 pr-10 py-4 bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-slate-900 placeholder:text-slate-400 focus:placeholder:text-slate-400 rounded-2xl sm:rounded-3xl border border-white/20 focus:border-[#DA291C] focus:ring-4 focus:ring-red-500/20 text-base sm:text-lg font-bold tracking-wide transition-all outline-none backdrop-blur-md"
              />
              {cedulaInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Consultar Button */}
            <button
              type="submit"
              disabled={!cedulaInput.trim() || isSearching}
              className="px-6 py-4 rounded-2xl sm:rounded-3xl bg-[#DA291C] hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Consultar Cédula</span>
                  <ArrowRight className="w-4 h-4 hidden sm:inline" />
                </>
              )}
            </button>

            {/* Escanear Cédula Button (Camera / Barcode) */}
            <button
              type="button"
              onClick={onOpenCedulaScanner}
              className="px-5 py-4 rounded-2xl sm:rounded-3xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 backdrop-blur-md active:scale-95 transition-all cursor-pointer shrink-0 shadow-sm"
              title="Abrir escáner de cámara o lector óptico"
            >
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-red-300" />
              <span>Escanear Cédula</span>
            </button>
          </div>

          {/* Quick Demo Pickers & Hint */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Pruebas Rápidas:
            </span>
            {DEMO_CEDULAS.map(item => (
              <button
                key={item.cedula}
                type="button"
                onClick={() => handleQuickPick(item.cedula)}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/25 border border-white/10 text-slate-200 hover:text-white transition-all font-mono font-bold flex items-center gap-1.5 cursor-pointer text-[11px]"
              >
                <span>{item.cedula}</span>
                <span className="text-[10px] text-red-300">({item.name})</span>
              </button>
            ))}
            <span className="ml-auto text-[11px] text-slate-400 italic hidden md:inline">
              * Compatible con pistolas lectoras USB/Bluetooth (Enter automático)
            </span>
          </div>
        </form>

        {/* 3 Pillars / Lobby Features Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Consulta Inmediata</div>
              <p className="text-[11px] text-slate-400">Sin necesidad de crear usuario o recordar contraseñas</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Ubicación de Salón</div>
              <p className="text-[11px] text-slate-400">Detalles de aula física, sede y facilitador a cargo</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Pase QR de Acceso</div>
              <p className="text-[11px] text-slate-400">Obtén tu código QR para presentar al facilitador en puerta</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
