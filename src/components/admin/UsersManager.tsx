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
  Sparkles,
  Search,
  Download,
  Upload,
  Users as UsersIcon,
  FileSpreadsheet
} from 'lucide-react';
import { UserAccount, UserRole, Participant } from '../../types';
import { exportUsersToExcel, downloadUsersTemplateExcel } from '../../utils/excelUtils';
import { formatCedula, isValidCedula } from '../../utils/formatters';
import { BulkUsersModal } from './BulkUsersModal';
import { SupervisorAssignmentModal } from './SupervisorAssignmentModal';

interface UsersManagerProps {
  users: UserAccount[];
  participants: Participant[];
  currentUser: UserAccount | null;
  onSaveUsers: (users: UserAccount[]) => Promise<void>;
  onSaveParticipants?: (participants: Participant[]) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const UsersManager: React.FC<UsersManagerProps> = ({
  users,
  participants,
  currentUser,
  onSaveUsers,
  onSaveParticipants,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCedula, setNewCedula] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newPassword, setNewPassword] = useState('123');
  const [newRole, setNewRole] = useState<UserRole>('Colaborador (User)');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isBulkUsersModalOpen, setIsBulkUsersModalOpen] = useState(false);

  // Supervisor Team Assignment Modal
  const [selectedSupervisorForAssignment, setSelectedSupervisorForAssignment] = useState<UserAccount | null>(null);

  // Change Password state
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.cedula && u.cedula.includes(q)) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;

    if (users.some(u => u.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      onShowToast('Usuario duplicado', 'Ya existe un usuario registrado con este correo.', 'error');
      return;
    }

    if (newCedula.trim()) {
      const formatted = formatCedula(newCedula.trim());
      if (!isValidCedula(formatted)) {
        onShowToast(
          'Cédula inválida', 
          'La cédula debe tener 11 dígitos en formato 000-0000000-0 (ej. 402-2196163-1).', 
          'error'
        );
        return;
      }
    }

    const newUser: UserAccount = {
      id: `usr_${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      password: newPassword.trim(),
      cedula: newCedula.trim() ? formatCedula(newCedula.trim()) : undefined,
      department: newDepartment.trim() || undefined
    };

    const updated = [...users, newUser];
    try {
      await onSaveUsers(updated);
      onShowToast('Usuario creado', `Se ha registrado a ${newName} con rol ${newRole}.`, 'success');
      setNewName('');
      setNewEmail('');
      setNewCedula('');
      setNewDepartment('');
      setNewPassword('123');
      setIsAddingUser(false);
    } catch (err: any) {
      onShowToast('Error', err.message || 'No se pudo crear el usuario.', 'error');
    }
  };

  const handleSaveSupervisorAssignment = async (supervisorId: string, assignedCards: string[]) => {
    const supervisorUser = users.find(u => u.id === supervisorId);
    if (!supervisorUser) return;

    // 1. Actualizar usuario
    const updatedUsers = users.map(u => 
      u.id === supervisorId ? { ...u, assignedMemberCards: assignedCards } : u
    );
    await onSaveUsers(updatedUsers);

    // 2. Actualizar participantes bidireccionalmente
    if (onSaveParticipants) {
      const assignedCardsSet = new Set(assignedCards);
      const updatedParticipants = participants.map(p => {
        if (assignedCardsSet.has(p.card)) {
          return {
            ...p,
            supervisorId: supervisorUser.id,
            supervisorName: supervisorUser.name,
            department: p.department || supervisorUser.department
          };
        } else if (p.supervisorId === supervisorId) {
          // Desasignar
          return {
            ...p,
            supervisorId: undefined,
            supervisorName: undefined
          };
        }
        return p;
      });

      await onSaveParticipants(updatedParticipants);
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
      
      {/* Top Header */}
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

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadUsersTemplateExcel}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-850 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 transition-colors"
            title="Descargar plantilla de Excel para importar usuarios"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Plantilla Excel</span>
          </button>

          <button
            type="button"
            onClick={() => exportUsersToExcel(users)}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-850 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
            <span>Exportar Usuarios</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBulkUsersModalOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/10"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Carga Masiva</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddingUser(!isAddingUser)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Usuario</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute inset-y-0 left-3.5 my-auto" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre, correo, cédula o rol..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Add User Collapsible Form */}
      {isAddingUser && (
        <form onSubmit={handleAddUser} className="bg-slate-950/60 border border-slate-800 rounded-3xl p-5 space-y-4 animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Registrar Nueva Cuenta de Usuario</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
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
              <label className="block text-[11px] text-slate-400 mb-1">Cédula (11 dígitos)</label>
              <input
                type="text"
                value={newCedula}
                onChange={(e) => setNewCedula(formatCedula(e.target.value))}
                placeholder="ej. 402-2196163-1"
                maxLength={13}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Departamento / Área</label>
              <input
                type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="ej. Tecnología"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
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
                <option value="Líder de Área / Supervisor">Líder de Área / Supervisor</option>
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
                <th className="p-4 font-semibold">Cédula</th>
                <th className="p-4 font-semibold">Departamento</th>
                <th className="p-4 font-semibold">Correo</th>
                <th className="p-4 font-semibold">Rol Asignado</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                        {u.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-white">{u.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {u.cedula ? (
                      <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                        {u.cedula}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">No asignada</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-300">
                    {u.department ? (
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800 text-[11px]">
                        {u.department}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">—</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-400 font-mono text-[11px]">{u.email}</td>
                  <td className="p-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.id, e.target.value as UserRole)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-800 ${
                        u.role === 'Super Administrador'
                          ? 'text-amber-400 border-amber-500/30'
                          : u.role === 'Administrador / Editor'
                          ? 'text-indigo-400 border-indigo-500/30'
                          : u.role === 'Líder de Área / Supervisor'
                          ? 'text-emerald-400 border-emerald-500/30'
                          : 'text-slate-300'
                      }`}
                    >
                      <option value="Super Administrador">Super Administrador</option>
                      <option value="Administrador / Editor">Administrador / Editor</option>
                      <option value="Líder de Área / Supervisor">Líder de Área / Supervisor</option>
                      <option value="Colaborador (User)">Colaborador (User)</option>
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {(u.role === 'Líder de Área / Supervisor' || u.role === 'Super Administrador') && (
                        <button
                          onClick={() => setSelectedSupervisorForAssignment(u)}
                          className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                          title="Asignar y gestionar colaboradores a este supervisor"
                        >
                          <UsersIcon className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Equipo ({u.assignedMemberCards?.length || participants.filter(p => p.supervisorId === u.id).length})</span>
                        </button>
                      )}

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

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
          <span>Mostrando {filteredUsers.length} de {users.length} usuarios registrados</span>
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

      {/* Bulk Users Modal */}
      {isBulkUsersModalOpen && (
        <BulkUsersModal
          existingUsers={users}
          participants={participants}
          onClose={() => setIsBulkUsersModalOpen(false)}
          onSaveUsers={onSaveUsers}
          onShowToast={onShowToast}
        />
      )}

      {/* Supervisor Team Assignment Modal */}
      {selectedSupervisorForAssignment && (
        <SupervisorAssignmentModal
          supervisor={selectedSupervisorForAssignment}
          participants={participants}
          onClose={() => setSelectedSupervisorForAssignment(null)}
          onSaveAssignment={handleSaveSupervisorAssignment}
          onShowToast={onShowToast}
        />
      )}

    </div>
  );
};

