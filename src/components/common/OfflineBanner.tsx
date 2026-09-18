import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (isOffline) {
    return (
      <div 
        role="alert" 
        aria-live="assertive"
        className="bg-amber-500 text-amber-950 font-black text-xs py-1.5 px-4 flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top duration-300"
      >
        <WifiOff className="w-4 h-4 animate-pulse" aria-hidden="true" />
        <span>Modo sin conexión activo — Visualizando datos en caché local</span>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div 
        role="status" 
        aria-live="polite"
        className="bg-emerald-600 text-white font-bold text-xs py-1.5 px-4 flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top duration-300"
      >
        <Wifi className="w-4 h-4" aria-hidden="true" />
        <span>Conexión restablecida — Sincronizando con el servidor</span>
      </div>
    );
  }

  return null;
};
