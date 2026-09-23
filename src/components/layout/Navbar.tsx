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
  Activity, 
  Sparkles,
  KeyRound,
  GraduationCap,
  Camera,
  Wrench,
  Sun,
  Moon,
  Monitor,
  Check
} from 'lucide-react';
import { UserAccount, TabView, Company } from '../../types';
import { ThemePreference, getStoredThemePreference, setThemePreference } from '../../utils/theme';

interface NavbarProps {
  currentUser: UserAccount | null;
  currentTab: TabView;
  companies?: Company[];
  selectedCompanyId?: string;
  onSelectCompanyScope?: (companyId: string) => void;
  setCurrentTab: (tab: TabView) => void;
  onLogout: () => void;
  myRegistrationsCount?: number;
  evaluatorCoursesCount?: number;
  isFacilitator?: boolean;
  onOpenMobileSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onOpenChangePassword?: () => void;
  onOpenQrScanner?: () => void;
  onOpenUserProfile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentTab,
  companies = [],
  selectedCompanyId = 'all',
  onSelectCompanyScope,
  setCurrentTab,
  onLogout,
  myRegistrationsCount = 0,
  evaluatorCoursesCount = 0,
  isFacilitator = false,
  onOpenMobileSidebar,
  isSidebarCollapsed = false,
  onOpenChangePassword,
  onOpenQrScanner,
  onOpenUserProfile
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [themePreference, setThemePrefState] = useState<ThemePreference>(() => getStoredThemePreference());
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleThemeChangeExternal = (e: any) => {
      if (e.detail?.preference) {
        setThemePrefState(e.detail.preference);
      }
    };
    window.addEventListener('ch_theme_changed', handleThemeChangeExternal);
    return () => window.removeEventListener('ch_theme_changed', handleThemeChangeExternal);
  }, []);

  React.useEffect(() => {
    if (!isThemeMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isThemeMenuOpen]);

  const handleThemeChange = (pref: ThemePreference) => {
    setThemePreference(pref);
    setThemePrefState(pref);
  };

  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'Super Administrador';
  const isOjtUser = currentUser.role === 'Evaluador / Tutor' || currentUser.role === 'Evaluador / Tutor OJT';
  const isAdminOrSuper = isSuperAdmin || currentUser.role === 'Administrador / Editor';
  const isLeaderOrAdmin = isAdminOrSuper || currentUser.role === 'Líder de Área / Supervisor';
  const canAccessOjt = isSuperAdmin || isOjtUser;
  const canAccessEvaluatorCourses = isSuperAdmin || isOjtUser || Boolean(isFacilitator);
  const canAccessTechnicalAcademy = isSuperAdmin;

  const handleNavClick = (tab: TabView) => {
    setCurrentTab(tab);
    setIsMobileMenuOpen(false);
  };

  const getRoleBadge = () => {
    if (isSuperAdmin) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 flex items-center gap-1 shadow-2xs">
          <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Super Admin
        </span>
      );
    }
    if (isOjtUser) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 flex items-center gap-1 shadow-2xs">
          <Activity className="w-3 h-3 text-purple-600 dark:text-purple-400" /> Tutor / Evaluador
        </span>
      );
    }
    if (currentUser.role === 'Líder de Área / Supervisor') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 flex items-center gap-1 shadow-2xs">
          <UserCheck className="w-3 h-3 text-sky-600 dark:text-sky-400" /> Líder
        </span>
      );
    }
    if (currentUser.role === 'Administrador / Editor') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 flex items-center gap-1 shadow-2xs">
          <Sliders className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Admin
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1 shadow-2xs">
        <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Colaborador
      </span>
    );
  };

  const getSectionTitle = () => {
    switch (currentTab) {
      case 'landing': return 'Catálogo de Capacitaciones';
      case 'my-registrations': return 'Mis Cursos & Rutas';
      case 'team': return 'Mi Equipo de Trabajo';
      case 'ojt': return 'Bitácoras & Mesas de Calibración';
      case 'evaluator-courses': return 'Cursos Asignados';
      case 'technical-academy': return 'Academia Técnica (Capacitaciones Recurrentes)';
      case 'dashboard': return 'Dashboard & Métricas';
      case 'admin': return 'Panel de Administración';
      default: return 'Portal de Formación';
    }
  };

  return (
    <header className="w-full sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_25px_-5px_rgba(0,0,0,0.35)] transition-colors duration-200">
      
      {/* Top Contact & Utility Bar (Executive Dark-Slate Bar) */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] border-b border-slate-800/80 py-1.5 px-4 sm:px-6 lg:px-8 text-[11px] text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          
          {/* Left contact info */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <a href="tel:8092203473" className="flex items-center gap-1.5 text-slate-300 hover:text-red-400 transition-colors group">
              <span className="p-1 rounded-md bg-red-500/20 text-red-400 group-hover:bg-red-500/30 transition-colors">
                <Phone className="w-3 h-3" />
              </span>
              <span>Central: <strong className="text-white font-semibold">809-220-3473</strong></span>
            </a>
            <span className="hidden sm:inline text-slate-700">|</span>
            <a href="mailto:Capacitacion_Virtual@claro.com.do" className="hidden sm:flex items-center gap-1.5 text-slate-300 hover:text-red-400 transition-colors group">
              <span className="p-1 rounded-md bg-red-500/20 text-red-400 group-hover:bg-red-500/30 transition-colors">
                <Mail className="w-3 h-3" />
              </span>
              <span>Mesa de Ayuda: <strong className="text-red-400 font-semibold">Capacitacion_Virtual@claro.com.do</strong></span>
            </a>
          </div>

          {/* Right Live Status Badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sistema en Línea</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Left section: Hamburger for SuperAdmin / Brand for standard */}
          <div className="flex items-center gap-3">
            {isSuperAdmin && onOpenMobileSidebar && (
              <button
                type="button"
                onClick={onOpenMobileSidebar}
                className="lg:hidden p-2.5 min-w-[44px] min-h-[44px] rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer shadow-xs active:scale-95 focus-visible:ring-2 focus-visible:ring-claro"
                title="Abrir Panel Lateral"
                aria-label="Abrir panel lateral de navegación"
              >
                <Menu className="w-5 h-5 text-claro" />
              </button>
            )}

            {/* Logo & Brand Identity */}
            <div 
              onClick={() => handleNavClick('landing')}
              className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
            >
              <div className="relative shrink-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#DA291C] via-[#EA382D] to-orange-500 p-0.5 shadow-lg shadow-red-500/25 group-hover:scale-105 group-hover:shadow-red-500/40 transition-all flex items-center justify-center text-white ring-2 ring-red-100 dark:ring-red-950/60">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                  <Sparkles className="w-2 h-2 text-white" />
                </div>
              </div>
              <div className="shrink-0">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-sm sm:text-base lg:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Aprendizaje y <span className="text-[#DA291C] dark:text-[#FF6659]">Desarrollo</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-gradient-to-r from-[#DA291C] to-red-600 text-white shadow-xs tracking-wider shrink-0">
                    HUB
                  </span>
                </div>
                <p className="hidden sm:block text-[10px] xl:text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-tight whitespace-nowrap">
                  Portal de Formación Inteligente
                </p>
              </div>
            </div>
          </div>

          {/* Breadcrumb section for SuperAdmin */}
          {isSuperAdmin ? (
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#DA291C] dark:text-red-400 border border-red-200/80 dark:border-red-900/60 font-black flex items-center gap-1.5 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#DA291C] dark:text-red-400" />
                <span>Panel Lateral SuperAdmin</span>
              </span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-slate-700 dark:text-slate-300 font-bold">
                {getSectionTitle()}
              </span>
            </div>
          ) : (
            /* Desktop Navigation Links (Segmented Pill Style for non-SuperAdmin users) */
            <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/80 shadow-inner shrink-0">
              <button
                onClick={() => handleNavClick('landing')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap shrink-0 ${
                  currentTab === 'landing'
                    ? 'bg-gradient-to-r from-[#DA291C] to-[#E02418] text-white shadow-md shadow-red-500/25 font-bold scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 font-semibold'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span>Catálogo</span>
              </button>

              <button
                onClick={() => handleNavClick('my-registrations')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all relative whitespace-nowrap shrink-0 ${
                  currentTab === 'my-registrations'
                    ? 'bg-gradient-to-r from-[#DA291C] to-[#E02418] text-white shadow-md shadow-red-500/25 font-bold scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 font-semibold'
                }`}
              >
                <CalendarCheck2 className="w-4 h-4" />
                <span>Mis Cursos</span>
                {myRegistrationsCount > 0 && (
                  <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    currentTab === 'my-registrations'
                      ? 'bg-white text-[#DA291C]'
                      : 'bg-[#DA291C] text-white'
                  }`}>
                    {myRegistrationsCount}
                  </span>
                )}
              </button>

              {isLeaderOrAdmin && (
                <button
                  onClick={() => handleNavClick('team')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap shrink-0 ${
                    currentTab === 'team'
                      ? 'bg-gradient-to-r from-[#DA291C] to-[#E02418] text-white shadow-md shadow-red-500/25 font-bold scale-[1.02]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 font-semibold'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Mi Equipo</span>
                </button>
              )}

              {canAccessOjt && (
                <button
                  onClick={() => handleNavClick('ojt')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap shrink-0 ${
                    currentTab === 'ojt'
                      ? 'bg-gradient-to-r from-[#DA291C] to-[#E02418] text-white shadow-md shadow-red-500/25 font-bold scale-[1.02]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 font-semibold'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>Bitácoras de Campo</span>
                </button>
              )}

              {canAccessEvaluatorCourses && (
                <button
                  onClick={() => handleNavClick('evaluator-courses')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all relative whitespace-nowrap shrink-0 ${
                    currentTab === 'evaluator-courses'
                      ? 'bg-gradient-to-r from-[#DA291C] to-[#E02418] text-white shadow-md shadow-red-500/25 font-bold scale-[1.02]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 font-semibold'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Cursos Asignados</span>
                  {evaluatorCoursesCount > 0 && (
                    <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      currentTab === 'evaluator-courses'
                        ? 'bg-white text-[#DA291C]'
                        : 'bg-[#DA291C] text-white'
                    }`}>
                      {evaluatorCoursesCount}
                    </span>
                  )}
                </button>
              )}

              {canAccessTechnicalAcademy && (
                <button
                  onClick={() => handleNavClick('technical-academy')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap shrink-0 ${
                    currentTab === 'technical-academy'
                      ? 'bg-gradient-to-r from-[#DA291C] to-[#E02418] text-white shadow-md shadow-red-500/25 font-bold scale-[1.02]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 font-semibold'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  <span>Academia Técnica</span>
                </button>
              )}

              {isAdminOrSuper && (
                <button
                  onClick={() => handleNavClick('dashboard')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap shrink-0 ${
                    currentTab === 'dashboard'
                      ? 'bg-gradient-to-r from-[#DA291C] to-[#E02418] text-white shadow-md shadow-red-500/25 font-bold scale-[1.02]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 font-semibold'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Métricas</span>
                </button>
              )}

              {isAdminOrSuper && (
                <button
                  onClick={() => handleNavClick('admin')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap shrink-0 ${
                    currentTab === 'admin'
                      ? 'bg-gradient-to-r from-[#DA291C] to-[#E02418] text-white shadow-md shadow-red-500/25 font-bold scale-[1.02]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 font-semibold'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>Administración</span>
                </button>
              )}
            </nav>
          )}

          {/* User Profile & Action Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            
            {/* Company Switcher for SuperAdmin */}
            {isSuperAdmin && onSelectCompanyScope ? (
              <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 px-2.5 xl:px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs transition-colors shrink-0">
                <Building2 className="w-4 h-4 text-[#DA291C] shrink-0" />
                <select
                  value={selectedCompanyId}
                  onChange={(e) => onSelectCompanyScope(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[130px] xl:max-w-[170px] truncate"
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
                  <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 xl:px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-[#DA291C] shrink-0" />
                    <span className="truncate max-w-[120px] xl:max-w-[160px]">{userComp ? userComp.name : 'Claro Dominicana'}</span>
                  </div>
                );
              })()
            )}

            {/* User Avatar Card Pill (Clickable to open profile) */}
            <button
              onClick={onOpenUserProfile}
              type="button"
              title="Ver y actualizar mi ficha de perfil"
              className="hidden sm:flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 shadow-xs hover:border-[#DA291C] hover:bg-red-50/40 dark:hover:bg-slate-700/60 transition-all shrink-0 cursor-pointer text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#DA291C] via-red-500 to-amber-500 flex items-center justify-center text-white font-black text-xs shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left shrink-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[140px] xl:max-w-[200px] group-hover:text-[#DA291C] dark:group-hover:text-red-400 transition-colors">{currentUser.name}</p>
                <div className="flex items-center mt-0.5 whitespace-nowrap">
                  {getRoleBadge()}
                </div>
              </div>
            </button>

            {/* Quick QR Scanner Button (Desktop) */}
            {onOpenQrScanner && (
              <button
                type="button"
                onClick={onOpenQrScanner}
                title="Escanear QR de Asistencia"
                aria-label="Escanear QR de Asistencia"
                className="hidden sm:flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-2xl bg-red-50 dark:bg-red-950/40 hover:bg-claro dark:hover:bg-claro text-claro dark:text-red-400 hover:text-white dark:hover:text-white border border-red-200 dark:border-red-900/60 hover:border-claro text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-claro"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden 2xl:inline">Escanear QR</span>
              </button>
            )}

            {/* Change Password Button (Desktop) */}
            {onOpenChangePassword && (
              <button
                type="button"
                onClick={onOpenChangePassword}
                title="Cambiar Mi Contraseña"
                aria-label="Cambiar Mi Contraseña"
                className="hidden sm:flex p-2.5 min-w-[44px] min-h-[44px] items-center justify-center rounded-2xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-claro"
              >
                <KeyRound className="w-4 h-4" />
              </button>
            )}

            {/* Selector de Tema Accesible con Dropdown (Desktop) */}
            <div className="relative hidden sm:block shrink-0" ref={themeMenuRef}>
              <button
                type="button"
                onClick={() => setIsThemeMenuOpen(prev => !prev)}
                title={`Tema actual: ${themePreference === 'light' ? 'Modo Claro' : themePreference === 'dark' ? 'Modo Oscuro' : 'Tema del Sistema'} (Clic para cambiar)`}
                aria-label="Cambiar tema visual"
                aria-haspopup="true"
                aria-expanded={isThemeMenuOpen}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs active:scale-95 focus-visible:ring-2 focus-visible:ring-claro"
              >
                {themePreference === 'light' && <Sun className="w-4 h-4 text-amber-500 transition-transform duration-200" />}
                {themePreference === 'dark' && <Moon className="w-4 h-4 text-indigo-400 transition-transform duration-200" />}
                {themePreference === 'system' && <Monitor className="w-4 h-4 text-[#DA291C] dark:text-red-400 transition-transform duration-200" />}
              </button>

              {isThemeMenuOpen && (
                <div 
                  className="absolute right-0 top-full mt-2 w-52 p-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 animate-in fade-in-50 zoom-in-95 duration-150 space-y-1"
                  role="menu"
                  aria-label="Opciones de tema visual"
                >
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 mb-1">
                    Tema de Interfaz
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      handleThemeChange('light');
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all cursor-pointer ${
                      themePreference === 'light'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 font-semibold'
                    }`}
                  >
                    <div className="p-1 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300">
                      <Sun className="w-3.5 h-3.5" />
                    </div>
                    <span>Modo Claro</span>
                    {themePreference === 'light' && <Check className="w-4 h-4 ml-auto text-amber-600 dark:text-amber-400" />}
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      handleThemeChange('system');
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all cursor-pointer ${
                      themePreference === 'system'
                        ? 'bg-red-50 dark:bg-red-950/40 text-[#DA291C] dark:text-red-400 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 font-semibold'
                    }`}
                  >
                    <div className="p-1 rounded-lg bg-red-100 dark:bg-red-950/50 text-[#DA291C] dark:text-red-400">
                      <Monitor className="w-3.5 h-3.5" />
                    </div>
                    <span>Tema del Sistema</span>
                    {themePreference === 'system' && <Check className="w-4 h-4 ml-auto text-[#DA291C] dark:text-red-400" />}
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      handleThemeChange('dark');
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all cursor-pointer ${
                      themePreference === 'dark'
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 font-semibold'
                    }`}
                  >
                    <div className="p-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                      <Moon className="w-3.5 h-3.5" />
                    </div>
                    <span>Modo Oscuro</span>
                    {themePreference === 'dark' && <Check className="w-4 h-4 ml-auto text-indigo-600 dark:text-indigo-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Logout Button (Desktop) */}
            <button
              type="button"
              onClick={onLogout}
              title="Cerrar Sesión"
              aria-label="Cerrar Sesión"
              className="hidden sm:flex p-2.5 min-w-[44px] min-h-[44px] items-center justify-center rounded-2xl text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-claro"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Hamburger Button for Mobile / Tablet (< lg) (when not superadmin) */}
            {!isSuperAdmin && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Abrir menú de navegación móvil"
                className="lg:hidden p-2.5 min-w-[44px] min-h-[44px] rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-claro"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6 text-claro" /> : <Menu className="w-6 h-6" />}
              </button>
            )}

          </div>

        </div>
      </div>

      {/* Mobile Drawer / Overlay Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-b border-slate-200 dark:border-slate-800 shadow-2xl px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-3 duration-200">
          
          {/* User Profile Header in Mobile Drawer */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#DA291C] to-red-500 text-white flex items-center justify-center font-black text-sm shadow-md">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{currentUser.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{currentUser.email}</p>
                  <div className="mt-1">
                    {getRoleBadge()}
                  </div>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/50 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            </div>

            {onOpenChangePassword && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenChangePassword();
                }}
                className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between hover:border-red-200 dark:hover:border-red-900/50"
              >
                <span className="flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-[#DA291C] dark:text-red-400" />
                  <span>Cambiar Contraseña</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>

          {/* Company Scope Selector in Mobile Drawer */}
          {isSuperAdmin && onSelectCompanyScope && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Building2 className="w-4 h-4 text-[#DA291C]" />
                <span>Empresa Activa:</span>
              </div>
              <select
                value={selectedCompanyId}
                onChange={(e) => onSelectCompanyScope(e.target.value)}
                className="bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none max-w-[160px]"
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
          <div className="space-y-2">
            {onOpenUserProfile && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenUserProfile();
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all bg-slate-900 dark:bg-slate-800 text-white hover:bg-black dark:hover:bg-slate-700 shadow-sm border border-transparent dark:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-amber-400" />
                  <span className="font-extrabold">Mi Perfil & Ficha Académica</span>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </button>
            )}

            {onOpenQrScanner && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenQrScanner();
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all bg-red-50 dark:bg-red-950/40 text-[#DA291C] dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/50"
              >
                <div className="flex items-center gap-3">
                  <Camera className="w-4 h-4 text-[#DA291C] dark:text-red-400" />
                  <span className="font-extrabold">Escanear QR de Asistencia</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#DA291C] dark:text-red-400" />
              </button>
            )}

            <button
              onClick={() => handleNavClick('landing')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                currentTab === 'landing'
                  ? 'bg-gradient-to-r from-[#DA291C] to-red-600 text-white shadow-md shadow-red-500/25'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Grid className="w-4 h-4" />
                <span>Catálogo de Capacitaciones</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </button>

            <button
              onClick={() => handleNavClick('my-registrations')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                currentTab === 'my-registrations'
                  ? 'bg-gradient-to-r from-[#DA291C] to-red-600 text-white shadow-md shadow-red-500/25'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <CalendarCheck2 className="w-4 h-4" />
                <span>Mis Inscripciones & Cursos</span>
              </div>
              {myRegistrationsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white dark:bg-slate-900 text-[#DA291C] dark:text-red-400 shadow-xs">
                  {myRegistrationsCount}
                </span>
              )}
            </button>

            {isLeaderOrAdmin && (
              <button
                onClick={() => handleNavClick('team')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  currentTab === 'team'
                    ? 'bg-gradient-to-r from-[#DA291C] to-red-600 text-white shadow-md shadow-red-500/25'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="w-4 h-4" />
                  <span>Mi Equipo de Trabajo</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>
            )}

            {canAccessOjt && (
              <button
                onClick={() => handleNavClick('ojt')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  currentTab === 'ojt'
                    ? 'bg-gradient-to-r from-[#DA291C] to-red-600 text-white shadow-md shadow-red-500/25'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4" />
                  <span>Bitácoras de Campo & Mesas de Calibración</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>
            )}

            {canAccessEvaluatorCourses && (
              <button
                onClick={() => handleNavClick('evaluator-courses')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  currentTab === 'evaluator-courses'
                    ? 'bg-gradient-to-r from-[#DA291C] to-red-600 text-white shadow-md shadow-red-500/25'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4" />
                  <span>Cursos Asignados</span>
                </div>
                <div className="flex items-center gap-2">
                  {evaluatorCoursesCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white dark:bg-slate-900 text-[#DA291C] dark:text-red-400 shadow-xs">
                      {evaluatorCoursesCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 opacity-70" />
                </div>
              </button>
            )}

            {canAccessTechnicalAcademy && (
              <button
                onClick={() => handleNavClick('technical-academy')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  currentTab === 'technical-academy'
                    ? 'bg-gradient-to-r from-[#DA291C] to-red-600 text-white shadow-md shadow-red-500/25'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wrench className="w-4 h-4" />
                  <span>Academia Técnica (Talleres Diarios)</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>
            )}

            {isAdminOrSuper && (
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  currentTab === 'dashboard'
                    ? 'bg-gradient-to-r from-[#DA291C] to-red-600 text-white shadow-md shadow-red-500/25'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-4 h-4" />
                  <span>Métricas & Analítica TTP</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>
            )}

            {isAdminOrSuper && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  currentTab === 'admin'
                    ? 'bg-gradient-to-r from-[#DA291C] to-red-600 text-white shadow-md shadow-red-500/25'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sliders className="w-4 h-4" />
                  <span>Panel de Administración</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>
            )}
          </div>

          {/* Selector de Tema Accesible (Mobile) */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tema Visual:</span>
            <div 
              className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700"
              role="radiogroup"
              aria-label="Selector de tema móvil"
            >
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer ${
                  themePreference === 'light'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                aria-checked={themePreference === 'light'}
                role="radio"
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Claro</span>
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('system')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer ${
                  themePreference === 'system'
                    ? 'bg-white dark:bg-slate-700 text-[#DA291C] dark:text-red-400 shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                aria-checked={themePreference === 'system'}
                role="radio"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Auto</span>
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer ${
                  themePreference === 'dark'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                aria-checked={themePreference === 'dark'}
                role="radio"
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Oscuro</span>
              </button>
            </div>
          </div>

          {/* Contact Support in Mobile Menu */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#DA291C]" />
              <span>Soporte: <strong>809-220-3473</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#DA291C]" />
              <a href="mailto:Capacitacion_Virtual@claro.com.do" className="text-[#DA291C] dark:text-red-400 font-semibold">
                Capacitacion_Virtual@claro.com.do
              </a>
            </div>
          </div>

        </div>
      )}

    </header>
  );
};


