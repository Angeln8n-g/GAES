import React from 'react';
import { Phone, Mail, MapPin, ShieldCheck, BookOpen, Smartphone, HelpCircle, Sparkles, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-b from-[#0F172A] via-[#0F172A] to-[#020617] border-t border-slate-800 text-slate-300 text-xs mt-20">
      
      {/* Top Footer Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          
          {/* Column 1: Información Institucional */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#DA291C] via-[#EA382D] to-orange-500 flex items-center justify-center text-white shadow-lg shadow-red-500/25">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-wide">
                  Centro de Aprendizaje & Desarrollo
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Claro Dominicana</p>
              </div>
            </div>
            
            <p className="text-slate-400 text-xs leading-relaxed text-justify font-normal">
              En Claro fomentamos el aprendizaje de habilidades técnicas en sistemas de gestión, productos y servicios para nuestro personal fijo y asociados, asegurando una gestión integral de nuestros procesos, para brindar una mejor experiencia de servicio a nuestros clientes.
            </p>

            <div className="pt-2 flex items-center gap-2 text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-500/20 p-2.5 rounded-2xl">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Plataforma Oficial de Formación & Acompañamiento</span>
            </div>
          </div>

          {/* Column 2: Contacto */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-slate-800 pb-2.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#DA291C]" />
              <span>Contacto Directo & Asistencia</span>
            </h4>
            
            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-xl bg-slate-800/80 text-[#DA291C] border border-slate-700 shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-slate-400">Av. 27 de Febrero #249, Santo Domingo, Rep. Dominicana</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-xl bg-slate-800/80 text-[#DA291C] border border-slate-700 shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <span>Central: <strong className="text-white font-bold">809-220-3473</strong> (Ext. Formación)</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-xl bg-slate-800/80 text-[#DA291C] border border-slate-700 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <span>Mesa de Ayuda: <a href="mailto:Capacitacion_Virtual@claro.com.do" className="text-red-400 hover:text-red-300 font-bold transition-colors">Capacitacion_Virtual@claro.com.do</a></span>
              </div>
            </div>
          </div>

          {/* Column 3: Enlaces Rápidos & App Móvil */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-slate-800 pb-2.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#DA291C]" />
              <span>Recursos & Herramientas</span>
            </h4>

            <ul className="space-y-2.5 text-xs text-slate-300">
              <li>
                <a href="#maincontent" className="hover:text-red-400 transition-colors flex items-center gap-2 group">
                  <span className="text-[#DA291C] font-bold group-hover:translate-x-1 transition-transform">→</span>
                  <span>Catálogo General de Cursos & Talleres</span>
                </a>
              </li>
              <li>
                <a href="mailto:Capacitacion_Virtual@claro.com.do" className="hover:text-red-400 transition-colors flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span>Contactar con el soporte del portal</span>
                </a>
              </li>
              <li className="pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-red-500/20 text-[#DA291C]">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-white">App Móvil & PWA</p>
                      <p className="text-[10px] text-slate-400">Acceso QR & Check-in en Vivo</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-black flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    PWA Activa
                  </span>
                </div>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Bar: Copyright */}
      <div className="border-t border-slate-800/90 bg-[#060B12] py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© 2026 Centro de Aprendizaje y Desarrollo | Portal GAES Claro</p>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Términos del Portal</span>
            <span>•</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Política de Privacidad</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 font-bold border border-red-500/20">
              GAES v2.6 PRO
            </span>
          </div>
        </div>
      </div>

    </footer>
  );
};

