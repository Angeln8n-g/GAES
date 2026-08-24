import React, { useState } from 'react';
import { Download, Share, X, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';

export const PwaInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIos, isDismissed, promptInstall, dismissPrompt } = usePwaInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);

  // If already installed or dismissed, do not display
  if (isInstalled || isDismissed) {
    return null;
  }

  // If not installable on Android/desktop and not iOS, do not display
  if (!isInstallable && !isIos) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(!showIosGuide);
    } else {
      await promptInstall();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] sm:w-96 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl shadow-2xl p-4.5 animate-in slide-in-from-bottom-5 duration-300 ring-1 ring-black/5">
      <div className="flex items-start gap-3.5">
        {/* App Icon */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#DA291C] via-[#EA382D] to-orange-500 p-0.5 shadow-lg shadow-red-500/25 flex items-center justify-center text-white shrink-0 ring-2 ring-red-100">
          <Smartphone className="w-6 h-6" />
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-black text-slate-900 tracking-tight">
              Instalar CapacitaHub
            </h4>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-red-50 text-[#DA291C] border border-red-200">
              PWA
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">
            Acceso instantáneo desde tu pantalla de inicio con soporte sin conexión.
          </p>

          {/* Action Buttons */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 px-3.5 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-[#DA291C] via-[#EA382D] to-red-600 hover:from-red-700 hover:to-red-800 shadow-md shadow-red-500/25 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              {isIos ? (
                <>
                  <Share className="w-3.5 h-3.5" />
                  <span>¿Cómo instalar en iOS?</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Instalar Aplicación</span>
                </>
              )}
            </button>
            <button
              onClick={dismissPrompt}
              title="Cerrar"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* iOS Safari Installation Guide Modal/Dropdown */}
          {showIosGuide && (
            <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Sparkles className="w-3.5 h-3.5 text-[#DA291C]" />
                <span>Instalación en iPhone / iPad:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                <li>Toca el botón <strong>Compartir</strong> <Share className="w-3 h-3 inline text-sky-600" /> en Safari.</li>
                <li>Desplázate hacia abajo y selecciona <strong>"Añadir a pantalla de inicio"</strong>.</li>
                <li>Toca <strong>Añadir</strong> en la esquina superior derecha.</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
