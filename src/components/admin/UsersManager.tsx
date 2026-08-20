import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Plus, 
  Trash2, 
  Edit3, 
  KeyRound, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { UserAccount, UserRole } from '../../types';

interface UsersManagerProps {
  users: UserAccount[];
  currentUser: UserAccount | null;
  onSaveUsers: (users: UserAccount[]) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error') => void;
}

export const UsersManager: React.FC<UsersManagerProps> = ({
  users,
  currentUser,
  onSaveUsers,
  onShowToast
}) => {
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('123');
  const [newRole, setNewRole] = useState<UserRole>('Colaborador (User)');
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Change Password state
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;

    if (users.some(u => u.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      onShowToast('Usuario duplicado', 'Ya existe un usuario registrado con este correo.', 'error');
      return;
    }

    const newUser: UserAccount = {
      id: `usr_${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      password: newPassword.trim()
    };

    const updated = [...users, newUser];
    try {
      await onSaveUsers(updated);
      onShowToast('Usuario creado', `Se ha registrado a ${newName} con rol ${newRole}.`, 'success');
      setNewName('');
      setNewEmail('');
      setNewPassword('123');
      setIsAddingUser(false);
    } catch (err: any) {
      onShowToast('Error', err.message || 'No se pudo crear el usuario.', 'error');
    }
  };

  const handleChangeRole = async (userId: string, role: UserRole) => {
    const updated = users.map(u => u.id === userId ? { ...u, role } : u);
    await onSaveUsers(updated);
    onShowToast('Rol actualizado', 'El rol de usuario fue modificado exitosamente.', 'success');
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword || !newPasswordInput.trim()) return;

    const updated = users.map(u => 
      u.id === selectedUserForPassword.id ? { ...u, password: newPasswordInput.trim() } : u
    );

    try {
      await onSaveUsers(updated);
      onShowToast('Contraseña actualizada', `Nueva contraseña establecida para ${selectedUserForPassword.name}.`, 'success');
      setSelectedUserForPassword(null);
      setNewPasswordInput('');
    } catch (err: any) {
      onShowToast('Error', err.message || 'Error al actualizar contraseña.', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      onShowToast('Acción no permitida', 'No puedes eliminar tu propia cuenta de usuario activa.', 'error');
      return;
    }
    const updated = users.filter(u => u.id !== userId);
    await onSaveUsers(updated);
    onShowToast('Usuario eliminado', 'Se ha retirado la cuenta del sistema.', 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Create Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span>Usuarios de la Plataforma y Permisos</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestiona los accesos administrativos, facilitadores y cuentas de colaboradores.
          </p>
        </div>

        <button
          onClick={() => setIsAddingUser(!isAddingUser)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Usuario</span>
        </button>
      </div>

      {/* Add User Collapsible Form */}
      {isAddingUser && (
        <form onSubmit={handleAddUser} className="bg-slate-950/60 border border-slate-800 rounded-3xl p-5 space-y-4 animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Registrar Nueva Cuenta de Usuario</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Nombre Completo *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ej. Carlos Pérez"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Correo Electrónico *</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="ej. carlos.perez@empresa.com"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Contraseña Inicial *</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="123"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Rol / Permisos</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="Colaborador (User)">Colaborador (User)</option>
                <option value="Administrador / Editor">Administrador / Editor</option>
                <option value="Super Administrador">Super Administrador</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingUser(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
            >
              Crear Usuario
            </button>
          </div>
        </form>
      )}

      {/* Users Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                <th className="p-4 font-semibold">Usuario</th>
                <th className="p-4 font-semibold">Correo</th>
                <th className="p-4 font-semibold">Rol Asignado</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                        {u.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-white">{u.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-400">{u.email}</td>
                  <td className="p-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.id, e.target.value as UserRole)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-800 ${
                        u.role === 'Super Administrador'
                          ? 'text-amber-400 border-amber-500/30'
                          : u.role === 'Administrador / Editor'
                          ? 'text-indigo-400 border-indigo-500/30'
                          : 'text-slate-300'
                      }`}
                    >
                      <option value="Super Administrador">Super Administrador</option>
                      <option value="Administrador / Editor">Administrador / Editor</option>
                      <option value="Colaborador (User)">Colaborador (User)</option>
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedUserForPassword(u);
                          setNewPasswordInput('');
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                        title="Cambiar contraseña"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>

                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change Password Modal */}
      {selectedUserForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400">
              <KeyRound className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Cambiar Contraseña</h3>
            </div>
            <p className="text-xs text-slate-400">
              Ingresa la nueva contraseña para <strong>{selectedUserForPassword.name}</strong> ({selectedUserForPassword.email}).
            </p>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <input
                type="text"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Nueva contraseña..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                required
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPassword(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
