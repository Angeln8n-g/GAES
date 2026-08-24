import React from 'react';
import { Phone, Mail, MapPin, ShieldCheck, BookOpen, Smartphone, HelpCircle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#1E242B] border-t border-slate-700 text-slate-300 text-xs mt-16">
      
      {/* Top Footer Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Column 1: Información Institucional */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#DA291C] flex items-center justify-center text-white shadow-md shadow-red-600/30">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Centro de Aprendizaje y Desarrollo
              </h3>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed text-justify">
              En Claro fomentamos el aprendizaje de habilidades técnicas en sistemas de gestión, productos y servicios para nuestro personal fijo y asociados, asegurando una gestión integral de nuestros procesos, para brindar una mejor experiencia de servicio a nuestros clientes.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-400 font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#DA291C]" />
              <span>Plataforma Oficial de Aprendizaje & Acompañamiento OJT</span>
            </div>
          </div>

          {/* Column 2: Contacta */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-700 pb-2">
              Contacto
            </h4>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#DA291C] shrink-0 mt-0.5" />
                <span>Av. 27 de Febrero #249, Santo Domingo, Rep. Dominicana</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#DA291C] shrink-0" />
                <span>Teléfono : <strong className="text-white">809-220-3473</strong> / Ext. Capacitación</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#DA291C] shrink-0" />
                <span>Correo electrónico : <a href="mailto:Capacitacion_Virtual@claro.com.do" className="text-red-400 hover:text-red-300 font-medium">Capacitacion_Virtual@claro.com.do</a></span>
              </div>
            </div>
          </div>

          {/* Column 3: Enlaces Rápidos & App Móvil */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-700 pb-2">
              Recursos & Enlaces
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#maincontent" className="hover:text-red-400 transition-colors flex items-center gap-1.5">
                  <span>• Catálogo de Cursos & Talleres</span>
                </a>
              </li>
              <li>
                <a href="mailto:Capacitacion_Virtual@claro.com.do" className="hover:text-red-400 transition-colors flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span>Contactar con el soporte del sitio</span>
                </a>
              </li>
              <li className="pt-2">
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#DA291C]" />
                    <div>
                      <p className="text-[11px] font-bold text-white">App para Móviles</p>
                      <p className="text-[10px] text-slate-400">Acceso QR & Check-in</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg font-bold">
                    PWA Activa
                  </span>
                </div>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Bar: Copyright */}
      <div className="border-t border-slate-800 bg-[#161B21] py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <p>Copyright © 2026 - Aprendizaje y Desarrollo | Portal de Formación Inteligente</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-200 cursor-pointer">Términos de Uso</span>
            <span>•</span>
            <span className="hover:text-slate-200 cursor-pointer">Política de Privacidad</span>
            <span>•</span>
            <span className="text-[#DA291C] font-semibold">GAES v2.5</span>
          </div>
        </div>
      </div>

    </footer>
  );
};
