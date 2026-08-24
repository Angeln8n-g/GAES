import React, { useState } from 'react';
import { 
  BookOpen, 
  Grid, 
  BarChart3, 
  Sliders, 
  UserCheck, 
  CalendarCheck2, 
  LogOut, 
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  Menu,
  X,
  User,
  ChevronRight,
  Activity
} from 'lucide-react';
import { UserAccount, TabView, Company } from '../../types';

interface NavbarProps {
  currentUser: UserAccount | null;
  currentTab: TabView;
  companies?: Company[];
  selectedCompanyId?: string;
  onSelectCompanyScope?: (companyId: string) => void;
  setCurrentTab: (tab: TabView) => void;
  onLogout: () => void;
  myRegistrationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentTab,
  companies = [],
  selectedCompanyId = 'all',
  onSelectCompanyScope,
  setCurrentTab,
  onLogout,
  myRegistrationsCount = 0
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'Super Administrador';
  const isOjtUser = currentUser.role === 'Evaluador / Tutor OJT';
  const isAdminOrSuper = isSuperAdmin || currentUser.role === 'Administrador / Editor';
  const isLeaderOrAdmin = isAdminOrSuper || currentUser.role === 'Líder de Área / Supervisor';
  const canAccessOjt = isSuperAdmin || isOjtUser;

  const handleNavClick = (tab: TabView) => {
    setCurrentTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      
      {/* Top Contact & Utility Bar (Light Theme Claro Style) */}
      <div className="bg-[#F8F9FA] border-b border-slate-200 py-1.5 px-4 sm:px-6 lg:px-8 text-[11px] text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          
          {/* Left contact info */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <a href="tel:8092203473" className="flex items-center gap-1.5 text-slate-700 hover:text-red-600 transition-colors">
              <Phone className="w-3.5 h-3.5 text-[#DA291C]" />
              <span>Tel: <strong className="text-slate-900">809-220-3473</strong></span>
            </a>
            <span className="hidden sm:inline text-slate-300">•</span>
            <a href="mailto:Capacitacion_Virtual@claro.com.do" className="hidden sm:flex items-center gap-1.5 text-slate-700 hover:text-red-600 transition-colors">
              <Mail className="w-3.5 h-3.5 text-[#DA291C]" />
              <span>Correo: <strong className="text-[#DA291C]">Capacitacion_Virtual@claro.com.do</strong></span>
            </a>
          </div>

          {/* Right Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-50 text-[#DA291C] border border-red-200 font-bold">
              Plataforma Oficial
            </span>
            <span className="text-slate-500 hidden md:inline text-[11px]">Centro de Aprendizaje y Desarrollo</span>
          </div>

        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand (Aprendizaje y Desarrollo) */}
          <div 
            onClick={() => handleNavClick('landing')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#DA291C] to-red-500 p-0.5 shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform flex items-center justify-center text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg lg:text-xl font-black text-slate-900 tracking-tight">
                  Aprendizaje y <span className="text-[#DA291C]">Desarrollo</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#DA291C] text-white">
                  HUB
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Portal de Formación Inteligente</p>
            </div>
          </div>

          {/* Desktop Navigation Links (>= md) */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => handleNavClick('landing')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'landing'
                  ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Grid className="w-4 h-4" />
              Explorar Catálogo
            </button>

            <button
              onClick={() => handleNavClick('my-registrations')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all relative ${
                currentTab === 'my-registrations'
                  ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <CalendarCheck2 className="w-4 h-4" />
              Mis Cursos
              {myRegistrationsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-white text-[#DA291C] shadow-sm">
                  {myRegistrationsCount}
                </span>
              )}
            </button>

            {isLeaderOrAdmin && (
              <button
                onClick={() => handleNavClick('team')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  currentTab === 'team'
                    ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Mi Equipo
              </button>
            )}

            {canAccessOjt && (
              <button
                onClick={() => handleNavClick('ojt')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  currentTab === 'ojt'
                    ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Activity className="w-4 h-4" />
                Bitácoras & OJT
              </button>
            )}

            {isAdminOrSuper && (
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  currentTab === 'dashboard'
                    ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Métricas & KPIs
              </button>
            )}

            {isAdminOrSuper && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  currentTab === 'admin'
                    ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Sliders className="w-4 h-4" />
                Administración
              </button>
            )}
          </nav>

          {/* User Profile & Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Company Switcher for SuperAdmin */}
            {isSuperAdmin && onSelectCompanyScope ? (
              <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs">
                <Building2 className="w-4 h-4 text-[#DA291C] shrink-0" />
                <select
                  value={selectedCompanyId}
                  onChange={(e) => onSelectCompanyScope(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[150px] truncate"
                >
                  <option value="all">🏢 Todas las Empresas</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      🏢 {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              (() => {
                const userComp = companies.find(c => c.id === (currentUser.companyId || 'emp_kasino'));
                return (
                  <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700">
                    <Building2 className="w-3.5 h-3.5 text-[#DA291C] shrink-0" />
                    <span className="truncate max-w-[130px]">{userComp ? userComp.name : 'Claro Dominicana'}</span>
                  </div>
                );
              })()
            )}

            {/* User Avatar Card */}
            <div className="hidden sm:flex items-center gap-2.5 pl-2.5 pr-3.5 py-1 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#DA291C] to-red-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 line-clamp-1">{currentUser.name}</p>
                <div className="flex items-center gap-1">
                  {isSuperAdmin ? (
                    <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Super Admin
                    </span>
                  ) : isOjtUser ? (
                    <span className="text-[10px] font-bold text-purple-600 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Tutor OJT
                    </span>
                  ) : currentUser.role === 'Líder de Área / Supervisor' ? (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Líder
                    </span>
                  ) : isAdminOrSuper ? (
                    <span className="text-[10px] font-semibold text-[#DA291C]">Administrador</span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-500">Colaborador</span>
                  )}
                </div>
              </div>
            </div>

            {/* Logout Button (Desktop) */}
            <button
              onClick={onLogout}
              title="Cerrar Sesión"
              className="hidden sm:flex p-2.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Hamburger Button for Mobile / Tablet (< lg) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Abrir menú de navegación"
              className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all flex items-center justify-center"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6 text-[#DA291C]" /> : <Menu className="w-6 h-6" />}
            </button>

          </div>

        </div>
      </div>

      {/* Mobile Drawer / Overlay Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 shadow-2xl px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          
          {/* User Profile Header in Mobile Drawer */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DA291C] text-white flex items-center justify-center font-bold text-sm shadow-md">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{currentUser.name}</p>
                <p className="text-xs text-slate-500">{currentUser.email}</p>
                <span className="inline-block mt-0.5 text-[10px] font-bold text-[#DA291C] bg-red-50 px-2 py-0.2 rounded-full border border-red-200">
                  {currentUser.role}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>

          {/* Company Scope Selector in Mobile Drawer */}
          {isSuperAdmin && onSelectCompanyScope && (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Building2 className="w-4 h-4 text-[#DA291C]" />
                <span>Empresa Activa:</span>
              </div>
              <select
                value={selectedCompanyId}
                onChange={(e) => onSelectCompanyScope(e.target.value)}
                className="bg-white border border-slate-300 text-xs font-bold text-slate-800 rounded-lg px-2 py-1 focus:outline-none max-w-[160px]"
              >
                <option value="all">🏢 Todas</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    🏢 {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Navigation Links in Mobile Drawer */}
          <div className="space-y-1.5">
            <button
              onClick={() => handleNavClick('landing')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'landing'
                  ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/20'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Grid className="w-4 h-4" />
                <span>Explorar Catálogo</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </button>

            <button
              onClick={() => handleNavClick('my-registrations')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'my-registrations'
                  ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/20'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CalendarCheck2 className="w-4 h-4" />
                <span>Mis Inscripciones & Cursos</span>
              </div>
              {myRegistrationsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white text-[#DA291C]">
                  {myRegistrationsCount}
                </span>
              )}
            </button>

            {isLeaderOrAdmin && (
              <button
                onClick={() => handleNavClick('team')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  currentTab === 'team'
                    ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/20'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4" />
                  <span>Mi Equipo de Trabajo</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>
            )}

            {canAccessOjt && (
              <button
                onClick={() => handleNavClick('ojt')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  currentTab === 'ojt'
                    ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/20'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-[#DA291C]" />
                  <span>Bitácoras & Mesas de Calibración</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>
            )}

            {isAdminOrSuper && (
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  currentTab === 'dashboard'
                    ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/20'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4" />
                  <span>Dashboard & Métricas Estratégicas</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>
            )}

            {isAdminOrSuper && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  currentTab === 'admin'
                    ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/20'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4" />
                  <span>Panel de Administración & OJT</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>
            )}
          </div>

          {/* Contact Support Direct in Mobile Menu */}
          <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#DA291C]" />
              <span>Soporte: <strong>809-220-3473</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#DA291C]" />
              <a href="mailto:Capacitacion_Virtual@claro.com.do" className="text-[#DA291C]">Capacitacion_Virtual@claro.com.do</a>
            </div>
          </div>

        </div>
      )}

    </header>
  );
};
