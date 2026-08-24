import React, { useState } from 'react';
import { 
  X, 
  UserCheck, 
  Mail, 
  Building2, 
  Briefcase, 
  ShieldCheck, 
  KeyRound, 
  CheckCircle2, 
  AlertTriangle, 
  Save,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserAccount, UserRole, EmploymentStatus, Company } from '../../types';
import { formatCedula, isValidCedula } from '../../utils/formatters';

interface EditUserModalProps {
  user: UserAccount;
  companies?: Company[];
  isSuperAdmin?: boolean;
  currentUser?: UserAccount | null;
  onClose: () => void;
  onSave: (updatedUser: UserAccount) => Promise<void>;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  companies = [],
  isSuperAdmin = false,
  currentUser,
  onClose,
  onSave
}) => {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [cedula, setCedula] = useState(user.cedula || '');
  const [department, setDepartment] = useState(user.department || '');
  const [companyId, setCompanyId] = useState(user.companyId || 'emp_kasino');
  const [role, setRole] = useState<UserRole>(user.role || 'Colaborador (User)');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>(user.employmentStatus || 'contratado');
  const [isActive, setIsActive] = useState<boolean>(user.isActive !== undefined ? user.isActive : true);
  
  // Optional password update
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('El nombre completo es obligatorio.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Ingresa un correo electrónico corporativo válido.');
      return;
    }

    // Cedula validation
    let formattedCedula: string | undefined = undefined;
    if (cedula.trim()) {
      formattedCedula = formatCedula(cedula.trim());
      if (!isValidCedula(formattedCedula)) {
        setError('La cédula ingresada no es válida. Debe contener 11 dígitos en formato 000-0000000-0.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const updatedUser: UserAccount = {
        ...user,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        cedula: formattedCedula,
        department: department.trim() || undefined,
        companyId: companyId || 'emp_kasino',
        role,
        employmentStatus,
        isActive: employmentStatus === 'inactivo' ? false : isActive,
        password: newPassword.trim() ? newPassword.trim() : user.password
      };

      await onSave(updatedUser);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios del usuario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#DA291C] border border-red-200 flex items-center justify-center font-black text-base shadow-xs shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-[#DA291C] border border-red-200">
                  Edición de Cuenta
                </span>
                <span className="text-xs font-bold text-slate-500 font-mono">ID: {user.id}</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-0.5">
                Editar Usuario: {user.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-5">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs font-medium animate-in shake duration-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Nombre Completo */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Ana María Morales Batista"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#DA291C] focus:bg-white font-medium"
                required
              />
            </div>

            {/* Correo Corporativo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Correo Corporativo *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. ana.morales@empresa.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#DA291C] focus:bg-white font-medium"
                  required
                />
              </div>
            </div>

            {/* Cédula */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cédula de Identidad (11 dígitos)
              </label>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(formatCedula(e.target.value))}
                placeholder="ej. 402-2196163-1"
                maxLength={13}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-mono focus:outline-none focus:border-[#DA291C] focus:bg-white font-bold"
              />
            </div>

            {/* Empresa */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Empresa / Filial
              </label>
              {isSuperAdmin ? (
                <div className="relative">
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#DA291C] focus:bg-white font-bold cursor-pointer"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>🏢 {c.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                  🏢 {companies.find(c => c.id === companyId)?.name || 'Empresa asignada'}
                </div>
              )}
            </div>

            {/* Departamento */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Departamento / Área
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Briefcase className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="ej. Tecnología, Operaciones, Ventas..."
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#DA291C] focus:bg-white font-medium"
                />
              </div>
            </div>

            {/* Rol en Sistema */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Rol en Plataforma *
              </label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#DA291C] focus:bg-white font-bold cursor-pointer"
                >
                  <option value="Colaborador (User)">Colaborador (User)</option>
                  <option value="Evaluador / Tutor OJT">Evaluador / Tutor OJT</option>
                  <option value="Líder de Área / Supervisor">Líder de Área / Supervisor</option>
                  <option value="Administrador / Editor">Administrador / Editor</option>
                  {isSuperAdmin && (
                    <option value="Super Administrador">Super Administrador</option>
                  )}
                </select>
              </div>
            </div>

            {/* Estado Laboral */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Estado Laboral *
              </label>
              <select
                value={employmentStatus}
                onChange={(e) => {
                  const st = e.target.value as EmploymentStatus;
                  setEmploymentStatus(st);
                  if (st === 'inactivo') setIsActive(false);
                  else setIsActive(true);
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:bg-white cursor-pointer ${
                  employmentStatus === 'contratado'
                    ? 'text-emerald-700 border-emerald-300'
                    : employmentStatus === 'en_proceso'
                    ? 'text-amber-700 border-amber-300'
                    : 'text-rose-700 border-rose-300'
                }`}
              >
                <option value="contratado">🟢 Contratado (Activo)</option>
                <option value="en_proceso">🟡 En Proceso de Selección</option>
                <option value="inactivo">🔴 Inactivo / Desvinculado</option>
              </select>
            </div>

            {/* Restablecer Contraseña (Opcional) */}
            <div className="sm:col-span-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Restablecer Contraseña (Dejar en blanco para mantener la actual)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Escribe una nueva contraseña si deseas cambiarla..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C] focus:bg-white font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-red-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
