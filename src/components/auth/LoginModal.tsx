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
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { UserAccount } from '../../types';
import { apiService } from '../../services/api';

interface LoginModalProps {
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  onUsersUpdated?: (users: UserAccount[]) => void;
  attendanceEventTitle?: string | null;
  attendanceTime?: string | null;
}

type AuthViewMode = 'login' | 'recover-request' | 'recover-verify';

export const LoginModal: React.FC<LoginModalProps> = ({
  users,
  onLoginSuccess,
  onUsersUpdated,
  attendanceEventTitle,
  attendanceTime
}) => {
  // Login form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Recovery flow states
  const [viewMode, setViewMode] = useState<AuthViewMode>('login');
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [targetUser, setTargetUser] = useState<UserAccount | null>(null);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Helper for masking email
  const maskEmail = (str: string) => {
    if (!str || !str.includes('@')) return str;
    const [name, domain] = str.split('@');
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.charAt(0)}***${name.charAt(name.length - 1)}@${domain}`;
  };

  // Password strength score
  const getStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    return score;
  };
  const recoveryStrength = getStrength(newPassword);

  // 1. Submit Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

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
        setError('Credenciales incorrectas. Verifica tu correo corporativo / cédula o contraseña.');
        setIsLoading(false);
      }
    }, 350);
  };

  // 2. Request Recovery OTP
  const handleRequestRecoveryOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!recoveryIdentifier) {
      setError('Ingresa tu correo corporativo o número de cédula registrado.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const cleanInput = recoveryIdentifier.trim().toLowerCase();
      const unformattedInput = cleanInput.replace(/[^a-z0-9]/g, '');

      const user = users.find(u => {
        const uEmail = u.email.toLowerCase();
        const uCedula = u.cedula ? u.cedula.toLowerCase() : '';
        const uCedulaClean = uCedula.replace(/[^a-z0-9]/g, '');

        return (
          uEmail === cleanInput || 
          (uCedula && uCedula === cleanInput) || 
          (uCedulaClean && uCedulaClean === unformattedInput)
        );
      });

      if (!user) {
        setError('No encontramos ninguna cuenta asociada a este correo o cédula.');
        setIsLoading(false);
        return;
      }

      if (user.isActive === false || user.employmentStatus === 'inactivo') {
        setError('Esta cuenta se encuentra inactiva. Contacta al administrador del sistema.');
        setIsLoading(false);
        return;
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setTargetUser(user);
      setGeneratedOtp(otp);
      setEnteredOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      setIsLoading(false);
      setViewMode('recover-verify');
    }, 400);
  };

  // 3. Verify OTP and Set New Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!targetUser) return;

    if (enteredOtp.trim() !== generatedOtp) {
      setError('El código de verificación de 6 dígitos es incorrecto.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe contener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);

    try {
      const updatedUsers = await apiService.changePassword(targetUser.id, newPassword);
      if (onUsersUpdated) {
        onUsersUpdated(updatedUsers);
      }
      setEmail(targetUser.email);
      setPassword('');
      setViewMode('login');
      setSuccessMessage('¡Tu contraseña ha sido restablecida exitosamente! Ya puedes iniciar sesión.');
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      
      {/* Background Soft Red Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-slate-200/50 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#DA291C] via-[#EA382D] to-orange-500 shadow-xl shadow-red-500/25 mb-4 text-white ring-4 ring-white animate-in zoom-in-90 duration-500">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Aprendizaje y <span className="text-[#DA291C]">Desarrollo</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-semibold">
            Portal de Formación Inteligente
          </p>
        </div>

        {/* QR Context Alert Banner if user clicked a QR code */}
        {attendanceEventTitle && viewMode === 'login' && (
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
                  Inicia sesión con tus credenciales corporativas para registrar tu asistencia de forma automática.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-xs font-medium animate-in fade-in duration-300 shadow-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-xs font-medium animate-in shake duration-300 shadow-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================== */}
        {/* VIEW 1: STANDARD LOGIN FORM (No Demo Accounts)            */}
        {/* ========================================================== */}
        {viewMode === 'login' && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl">
            
            <div className="mb-6">
              <h2 className="text-lg font-black text-slate-900">Iniciar Sesión</h2>
              <p className="text-xs text-slate-500 mt-0.5">Ingresa tus credenciales corporativas para acceder</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setSuccessMessage('');
                      setRecoveryIdentifier(email);
                      setViewMode('recover-request');
                    }}
                    className="text-xs font-bold text-[#DA291C] hover:text-red-700 transition-colors cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
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
                className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-[#DA291C] via-[#EA382D] to-red-600 hover:from-red-700 hover:to-red-800 text-white text-sm font-bold rounded-2xl shadow-md shadow-red-500/25 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Verificando credenciales...</span>
                ) : (
                  <>
                    <span>Ingresar a la Plataforma</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

            </form>

          </div>
        )}

        {/* ========================================================== */}
        {/* VIEW 2: RECOVER PASSWORD - STEP 1 (Identifier Entry)      */}
        {/* ========================================================== */}
        {viewMode === 'recover-request' && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl animate-in slide-in-from-right-4 duration-200">
            
            <div className="flex items-center gap-3 mb-5">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setViewMode('login');
                }}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                title="Volver"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-black text-slate-900">Recuperar Contraseña</h2>
                <p className="text-xs text-slate-500">Paso 1 de 2: Identificación de cuenta</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Ingresa tu correo institucional o número de cédula para recibir un código de seguridad temporal y restablecer tu clave de acceso.
            </p>

            <form onSubmit={handleRequestRecoveryOtp} className="space-y-4">
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
                    value={recoveryIdentifier}
                    onChange={(e) => setRecoveryIdentifier(e.target.value)}
                    placeholder="ej. nombre@claro.com.do o 402-2196163-1"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C] focus:ring-2 focus:ring-red-100 transition-all font-medium"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-[#DA291C] hover:bg-red-700 text-white text-sm font-bold rounded-2xl shadow-md shadow-red-500/25 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Buscando usuario...</span>
                ) : (
                  <>
                    <span>Enviar Código de Seguridad</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('');
                  setViewMode('login');
                }}
                className="w-full py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Volver al inicio de sesión
              </button>
            </form>

          </div>
        )}

        {/* ========================================================== */}
        {/* VIEW 3: RECOVER PASSWORD - STEP 2 (Verify OTP & Reset)    */}
        {/* ========================================================== */}
        {viewMode === 'recover-verify' && targetUser && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl animate-in slide-in-from-right-4 duration-200">
            
            <div className="flex items-center gap-3 mb-5">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setViewMode('recover-request');
                }}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                title="Volver"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-black text-slate-900">Validar Código & Nueva Clave</h2>
                <p className="text-xs text-slate-500">Paso 2 de 2: Establecer nueva contraseña</p>
              </div>
            </div>

            {/* OTP Notification Card */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 mb-5 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Código de Recuperación Generado:</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Se envió a <strong className="font-bold">{maskEmail(targetUser.email)}</strong>.
              </p>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white border border-amber-300 rounded-xl font-mono text-sm font-black text-[#DA291C] shadow-xs">
                <span>Código OTP: {generatedOtp}</span>
              </div>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              
              {/* OTP Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Código de Seguridad (6 dígitos)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej. 123456"
                  className="w-full text-center tracking-widest font-mono text-lg font-black py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 focus:outline-none focus:border-[#DA291C] focus:ring-2 focus:ring-red-100 transition-all"
                  required
                  autoFocus
                />
              </div>

              {/* New Password Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C] focus:ring-2 focus:ring-red-100 transition-all font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength Meter */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${recoveryStrength >= 1 ? (recoveryStrength <= 2 ? 'w-1/3 bg-amber-500' : recoveryStrength <= 4 ? 'w-2/3 bg-blue-500' : 'w-full bg-emerald-500') : 'w-0'}`} />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C] focus:ring-2 focus:ring-red-100 transition-all font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmNewPassword && newPassword && (
                  <p className={`text-[11px] mt-1 flex items-center gap-1 font-semibold ${newPassword === confirmNewPassword ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {newPassword === confirmNewPassword ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Las contraseñas coinciden
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3" /> Las contraseñas no coinciden
                      </>
                    )}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 px-4 bg-[#DA291C] hover:bg-red-700 text-white text-sm font-bold rounded-2xl shadow-md shadow-red-500/25 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Actualizando contraseña...</span>
                ) : (
                  <>
                    <span>Guardar Nueva Contraseña</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>

            </form>

          </div>
        )}

      </div>
    </div>
  );
};
