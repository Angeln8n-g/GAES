import React, { useState } from 'react';
import { 
  BookOpen, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertTriangle, 
  QrCode, 
  Sparkles,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { UserAccount } from '../../types';

interface LoginModalProps {
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  showDemoAccounts?: boolean;
  attendanceEventTitle?: string | null;
  attendanceTime?: string | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  users,
  onLoginSuccess,
  showDemoAccounts = true,
  attendanceEventTitle,
  attendanceTime
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor ingresa tu correo corporativo y contraseña.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const user = users.find(
        u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
      );

      if (user) {
        onLoginSuccess(user);
      } else {
        setError('Credenciales incorrectas. Verifica tu correo o contraseña.');
        setIsLoading(false);
      }
    }, 400);
  };

  const handleQuickLogin = (demoUser: UserAccount) => {
    setEmail(demoUser.email);
    setPassword(demoUser.password || '123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-2xl shadow-indigo-500/30 mb-4 animate-in zoom-in-90 duration-500">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            Capacita<span className="text-indigo-400">Hub</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            Portal Corporativo de Reservas y Capacitaciones
          </p>
        </div>

        {/* QR Context Alert Banner if user clicked a QR code */}
        {attendanceEventTitle && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 backdrop-blur-md shadow-xl animate-in slide-in-from-top-3 duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Confirmación de Asistencia QR</p>
                <p className="text-sm font-semibold text-white mt-0.5 leading-snug">{attendanceEventTitle}</p>
                {attendanceTime && <p className="text-xs text-indigo-200/80 mt-0.5">Horario: {attendanceTime}</p>}
                <p className="text-xs text-indigo-300/90 mt-2">
                  Inicia sesión con tu cuenta para registrar tu asistencia de forma automática.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Login Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-100">Iniciar Sesión</h2>
            <p className="text-xs text-slate-400 mt-0.5">Ingresa tus credenciales corporativas para continuar</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Correo Electrónico Corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. nombre.apellido@empresa.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <span>Iniciando sesión...</span>
              ) : (
                <>
                  <span>Ingresar a la Plataforma</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

        </div>

        {/* Demo Accounts Helper Card (Toggleable) */}
        {showDemoAccounts && users.length > 0 && (
          <div className="mt-6 bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cuentas de demostración rápida (Haz clic para autocompletar):</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {users.slice(0, 4).map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleQuickLogin(user)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/50 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/40 text-left transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-white">{user.name}</p>
                      <p className="text-[10px] text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    user.role === 'Super Administrador'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : user.role === 'Administrador / Editor'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {user.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
