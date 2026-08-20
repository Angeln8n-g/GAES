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
  Sparkles
} from 'lucide-react';
import { UserAccount, TabView } from '../../types';

interface NavbarProps {
  currentUser: UserAccount | null;
  currentTab: TabView;
  setCurrentTab: (tab: TabView) => void;
  onLogout: () => void;
  myRegistrationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentTab,
  setCurrentTab,
  onLogout,
  myRegistrationsCount = 0
}) => {
  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'Super Administrador';
  const isAdminOrSuper = isSuperAdmin || currentUser.role === 'Administrador / Editor';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => setCurrentTab('landing')}
            className="flex items-center gap-3.5 cursor-pointer group select-none"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Capacita<span className="text-indigo-400">Hub</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Gestión Inteligente de Reservas</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/80">
            <button
              onClick={() => setCurrentTab('landing')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'landing'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Grid className="w-4 h-4" />
              Explorar Catálogo
            </button>

            <button
              onClick={() => setCurrentTab('my-registrations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all relative ${
                currentTab === 'my-registrations'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <CalendarCheck2 className="w-4 h-4" />
              Mis Inscripciones
              {myRegistrationsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-cyan-400 text-slate-950">
                  {myRegistrationsCount}
                </span>
              )}
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => setCurrentTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  currentTab === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Métricas & KPIs
              </button>
            )}

            {isAdminOrSuper && (
              <button
                onClick={() => setCurrentTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  currentTab === 'admin'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Sliders className="w-4 h-4" />
                Administración
              </button>
            )}
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 pl-3 pr-4 py-1.5 rounded-2xl bg-slate-800/40 border border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-slate-200 line-clamp-1">{currentUser.name}</p>
                <div className="flex items-center gap-1">
                  {isSuperAdmin ? (
                    <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Super Admin
                    </span>
                  ) : isAdminOrSuper ? (
                    <span className="text-[10px] font-semibold text-indigo-400">Administrador</span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400">Colaborador</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Cerrar Sesión"
              className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center justify-around py-2.5 border-t border-slate-800/60 overflow-x-auto">
          <button
            onClick={() => setCurrentTab('landing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
              currentTab === 'landing' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <Grid className="w-3.5 h-3.5" /> Catálogo
          </button>
          <button
            onClick={() => setCurrentTab('my-registrations')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
              currentTab === 'my-registrations' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <CalendarCheck2 className="w-3.5 h-3.5" /> Mis Cursos ({myRegistrationsCount})
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                currentTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> KPIs
            </button>
          )}
          {isAdminOrSuper && (
            <button
              onClick={() => setCurrentTab('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                currentTab === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Admin
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
