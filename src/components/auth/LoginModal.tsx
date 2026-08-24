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
      setError('Por favor ingresa tu correo corporativo o cédula y tu contraseña.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const cleanInput = email.trim().toLowerCase();
      const unformattedInput = cleanInput.replace(/[^a-z0-9]/g, '');

      const user = users.find(u => {
        const uEmail = u.email.toLowerCase();
        const uCedula = u.cedula ? u.cedula.toLowerCase() : '';
        const uCedulaClean = uCedula.replace(/[^a-z0-9]/g, '');

        const matchesIdentifier = 
          uEmail === cleanInput || 
          (uCedula && uCedula === cleanInput) || 
          (uCedulaClean && uCedulaClean === unformattedInput);

        return matchesIdentifier && u.password === password;
      });

      if (user) {
        if (user.isActive === false || user.employmentStatus === 'inactivo') {
          setError('Tu cuenta se encuentra inactiva o desvinculada. Contacta al departamento de Recursos Humanos.');
          setIsLoading(false);
          return;
        }
        onLoginSuccess(user);
      } else {
        setError('Credenciales incorrectas. Verifica tu correo/cédula o contraseña.');
        setIsLoading(false);
      }
    }, 300);
  };

  const handleQuickLogin = (demoUser: UserAccount) => {
    setEmail(demoUser.email);
    setPassword(demoUser.password || '123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      
      {/* Background Soft Red Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-slate-200/50 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[#DA291C] shadow-lg shadow-red-500/25 mb-4 text-white animate-in zoom-in-90 duration-500">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Aprendizaje y <span className="text-[#DA291C]">Desarrollo</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-semibold">
            Portal de Formación Inteligente
          </p>
        </div>

        {/* QR Context Alert Banner if user clicked a QR code */}
        {attendanceEventTitle && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 shadow-sm animate-in slide-in-from-top-3 duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-100 text-[#DA291C] shrink-0 mt-0.5">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#DA291C] uppercase tracking-wider">Confirmación de Asistencia QR</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5 leading-snug">{attendanceEventTitle}</p>
                {attendanceTime && <p className="text-xs text-slate-600 mt-0.5 font-medium">Horario: {attendanceTime}</p>}
                <p className="text-xs text-slate-600 mt-2">
                  Inicia sesión con tu cuenta para registrar tu asistencia de forma automática.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Login Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
          
          <div className="mb-6">
            <h2 className="text-lg font-extrabold text-slate-900">Iniciar Sesión</h2>
            <p className="text-xs text-slate-500 mt-0.5">Ingresa tus credenciales corporativas para continuar</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email or Cedula Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Correo Corporativo o Cédula
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. nombre@claro.com.do o 402-2196163-1"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C] focus:ring-2 focus:ring-red-100 transition-all font-medium"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C] focus:ring-2 focus:ring-red-100 transition-all font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 bg-[#DA291C] hover:bg-red-700 text-white text-sm font-bold rounded-2xl shadow-md shadow-red-500/25 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
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

        {/* Demo Accounts Helper Card */}
        {showDemoAccounts && users.length > 0 && (
          <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2.5 text-xs font-bold text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-[#DA291C]" />
              <span>Cuentas de demostración rápida (Haz clic para autocompletar):</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {users.slice(0, 4).map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleQuickLogin(user)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-left transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-red-100 text-[#DA291C] flex items-center justify-center text-[10px] font-extrabold">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-[#DA291C]">{user.name}</p>
                      <p className="text-[10px] text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    user.role === 'Super Administrador'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : user.role === 'Administrador / Editor'
                      ? 'bg-red-50 text-[#DA291C] border border-red-200'
                      : user.role === 'Evaluador / Tutor OJT'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : user.role === 'Líder de Área / Supervisor'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600'
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
