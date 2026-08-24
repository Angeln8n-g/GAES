import React from 'react';
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
  Activity,
  ChevronLeft,
  ChevronRight,
  X,
  KeyRound
} from 'lucide-react';
import { UserAccount, TabView, Company } from '../../types';

interface SuperAdminSidebarProps {
  currentUser: UserAccount;
  currentTab: TabView;
  companies?: Company[];
  selectedCompanyId?: string;
  onSelectCompanyScope?: (companyId: string) => void;
  setCurrentTab: (tab: TabView) => void;
  onLogout: () => void;
  myRegistrationsCount?: number;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onOpenChangePassword?: () => void;
}

export const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({
  currentUser,
  currentTab,
  companies = [],
  selectedCompanyId = 'all',
  onSelectCompanyScope,
  setCurrentTab,
  onLogout,
  myRegistrationsCount = 0,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  onOpenChangePassword
}) => {
  const handleNavClick = (tab: TabView) => {
    setCurrentTab(tab);
    setIsMobileOpen(false);
  };

  const navItems = [
    {
      group: "Operaciones & Aprendizaje",
      items: [
        { id: 'landing' as TabView, label: "Catálogo de Cursos", icon: Grid, badge: null },
        { id: 'my-registrations' as TabView, label: "Mis Cursos & Rutas", icon: CalendarCheck2, badge: myRegistrationsCount > 0 ? myRegistrationsCount : null },
        { id: 'team' as TabView, label: "Mi Equipo de Trabajo", icon: UserCheck, badge: null }
      ]
    },
    {
      group: "Acompañamiento & Calibración",
      items: [
        { id: 'ojt' as TabView, label: "Bitácoras & OJT", icon: Activity, badge: null }
      ]
    },
    {
      group: "Estrategia & Control",
      items: [
        { id: 'dashboard' as TabView, label: "Métricas & Dashboard", icon: BarChart3, badge: null },
        { id: 'admin' as TabView, label: "Panel de Administración", icon: Sliders, badge: null }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between transition-all duration-300 ease-in-out shadow-2xl ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Branding Section */}
        <div>
          <div className="h-20 flex items-center justify-between px-4 border-b border-slate-800/80 bg-slate-950/50">
            <div 
              onClick={() => handleNavClick('landing')}
              className="flex items-center gap-3 cursor-pointer group select-none overflow-hidden"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#DA291C] via-[#EA382D] to-orange-500 p-0.5 shadow-lg shadow-red-500/30 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform ring-2 ring-red-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-white tracking-tight">
                      GAES <span className="text-[#DA291C]">Portal</span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ADMIN
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium truncate">
                    Panel Super Administrador
                  </p>
                </div>
              )}
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Company Scope Selector (Only visible if expanded) */}
          {onSelectCompanyScope && !isCollapsed && (
            <div className="p-4 border-b border-slate-800/60 bg-slate-950/30">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#DA291C]" />
                <span>Alcance de Empresa:</span>
              </div>
              <select
                value={selectedCompanyId}
                onChange={(e) => onSelectCompanyScope(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 hover:border-slate-600 text-xs font-bold text-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/30 cursor-pointer transition-colors"
              >
                <option value="all">🏢 Todas las Empresas</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    🏢 {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Navigation Links List */}
          <div className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-none">
            {navItems.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {!isCollapsed && (
                  <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    {group.group}
                  </p>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
                        isActive
                          ? 'bg-gradient-to-r from-[#DA291C] to-red-600 text-white shadow-lg shadow-red-600/30 scale-[1.02]'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                      } ${isCollapsed ? 'justify-center' : ''}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110 text-slate-400 group-hover:text-white'}`} />
                      {!isCollapsed && (
                        <div className="flex-1 flex items-center justify-between truncate">
                          <span className="truncate">{item.label}</span>
                          {item.badge !== null && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                              isActive ? 'bg-white text-[#DA291C]' : 'bg-[#DA291C] text-white'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom User & Action Section */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
          {/* User Profile Card */}
          <div className={`flex items-center gap-2.5 p-2 rounded-2xl bg-slate-800/60 border border-slate-700/60 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#DA291C] via-red-500 to-amber-500 flex items-center justify-center text-white font-black text-xs shadow-sm shrink-0">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-400">
                  <ShieldCheck className="w-2.5 h-2.5" /> Super Admin
                </span>
              </div>
            )}
            {!isCollapsed && (
              <div className="flex items-center gap-1">
                {onOpenChangePassword && (
                  <button
                    onClick={onOpenChangePassword}
                    title="Cambiar Mi Contraseña"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onLogout}
                  title="Cerrar Sesión"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Desktop Collapse / Expand Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex w-full items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[11px]">Contraer panel</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
