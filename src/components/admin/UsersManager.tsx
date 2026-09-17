import React, { useState, useMemo } from "react";
import { 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Plus, 
  Trash2, 
  Edit3, 
  KeyRound, 
  CheckCircle2, 
  Clock,
  UserX,
  AlertTriangle,
  Sparkles,
  Search,
  Download,
  Upload,
  Users as UsersIcon,
  Eye,
  Building2,
  FileSpreadsheet
} from "lucide-react";
import { UserAccount, UserRole, Participant, EmploymentStatus, TrainingEvent, TrainingProgram, Company, TechnicalAcademyHistoryRecord } from "../../types";
import { exportUsersToExcel, downloadUsersTemplateExcel } from "../../utils/excelUtils";
import { formatCedula, isValidCedula } from "../../utils/formatters";
import { BulkUsersModal } from "./BulkUsersModal";
import { SupervisorAssignmentModal } from "./SupervisorAssignmentModal";
import { ParticipantProfileModal } from "./ParticipantProfileModal";
import { EditUserModal } from "./EditUserModal";

interface UsersManagerProps {
  users: UserAccount[];
  participants: Participant[];
  events?: TrainingEvent[];
  programs?: TrainingProgram[];
  companies?: Company[];
  technicalHistory?: TechnicalAcademyHistoryRecord[];
  currentUser: UserAccount | null;
  onSaveUsers: (users: UserAccount[]) => Promise<void>;
  onSaveParticipants?: (participants: Participant[]) => Promise<void>;
  onShowToast: (title: string, message: string, type: "success" | "error" | "info") => void;
}

export const UsersManager: React.FC<UsersManagerProps> = ({
  users,
  participants,
  events = [],
  programs = [],
  companies = [],
  technicalHistory = [],
  currentUser,
  onSaveUsers,
  onSaveParticipants,
  onShowToast
}) => {
  const isSuperAdmin = currentUser?.role === "Super Administrador";
  const defaultCompanyId = !isSuperAdmin && currentUser?.companyId ? currentUser.companyId : (companies[0]?.id || "emp_kasino");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("all");

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCedula, setNewCedula] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newCompanyId, setNewCompanyId] = useState(defaultCompanyId);
  const [newPassword, setNewPassword] = useState("123");
  const [newRole, setNewRole] = useState<UserRole>("Colaborador (User)");
  const [newEmploymentStatus, setNewEmploymentStatus] = useState<EmploymentStatus>("contratado");

  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isBulkUsersModalOpen, setIsBulkUsersModalOpen] = useState(false);

  // Ficha 360° Profile Modal
  const [viewingProfileParticipant, setViewingProfileParticipant] = useState<Participant | null>(null);

  // Supervisor Team Assignment Modal
  const [selectedSupervisorForAssignment, setSelectedSupervisorForAssignment] = useState<UserAccount | null>(null);

  // Edit User Modal state
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserAccount | null>(null);

  // Change Password state
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");

  const companiesMap = useMemo(() => {
    return new Map(companies.map(c => [c.id, c]));
  }, [companies]);

  // Estadísticas rápidas
  const stats = useMemo(() => {
    let contratados = 0;
    let enProceso = 0;
    let inactivos = 0;
    let supervisores = 0;

    users.forEach(u => {
      const st = u.employmentStatus || "contratado";
      if (st === "contratado") contratados++;
      else if (st === "en_proceso") enProceso++;
      else if (st === "inactivo") inactivos++;

      if (u.role === "Líder de Área / Supervisor" || u.role === "Super Administrador") {
        supervisores++;
      }
    });

    return {
      total: users.length,
      contratados,
      enProceso,
      inactivos,
      supervisores
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchQuery.toLowerCase().trim();
      const uStatus = u.employmentStatus || "contratado";
      const uCompany = u.companyId || "emp_kasino";

      // Aislamiento estricto por empresa si no es Super Admin
      if (!isSuperAdmin && uCompany !== (currentUser?.companyId || "emp_kasino")) {
        return false;
      }

      if (isSuperAdmin && selectedCompanyFilter !== "all" && uCompany !== selectedCompanyFilter) return false;
      if (selectedStatusFilter !== "all" && uStatus !== selectedStatusFilter) return false;
      if (selectedRoleFilter !== "all" && u.role !== selectedRoleFilter) return false;

      if (!q) return true;

      const compName = companiesMap.get(uCompany)?.name || "";

      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.cedula && u.cedula.includes(q)) ||
        (u.department && u.department.toLowerCase().includes(q)) ||
        u.role.toLowerCase().includes(q) ||
        compName.toLowerCase().includes(q)
      );
    });
  }, [users, isSuperAdmin, currentUser, selectedCompanyFilter, selectedStatusFilter, selectedRoleFilter, searchQuery, companiesMap]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;

    if (users.some(u => u.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      onShowToast("Usuario duplicado", "Ya existe un usuario registrado con este correo.", "error");
      return;
    }

    if (newCedula.trim()) {
      const formatted = formatCedula(newCedula.trim());
      if (!isValidCedula(formatted)) {
        onShowToast("Cédula inválida", "La cédula debe tener 11 dígitos en formato 000-0000000-0.", "error");
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
      department: newDepartment.trim() || undefined,
      employmentStatus: newEmploymentStatus,
      isActive: newEmploymentStatus !== "inactivo",
      companyId: newCompanyId || "emp_kasino"
    };

    const updated = [...users, newUser];
    try {
      await onSaveUsers(updated);
      onShowToast("Usuario creado", `Se ha registrado a ${newName} con rol ${newRole}.`, "success");
      setNewName("");
      setNewEmail("");
      setNewCedula("");
      setNewDepartment("");
      setNewPassword("123");
      setNewEmploymentStatus("contratado");
      setIsAddingUser(false);
    } catch (err: any) {
      onShowToast("Error", err.message || "No se pudo crear el usuario.", "error");
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
            department: p.department || supervisorUser.department,
            companyId: supervisorUser.companyId || p.companyId
          };
        } else if (p.supervisorId === supervisorId) {
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
    onShowToast("Rol actualizado", "El rol de usuario fue modificado exitosamente.", "success");
  };

  const handleChangeStatus = async (userId: string, status: EmploymentStatus) => {
    const updated = users.map(u => 
      u.id === userId ? { ...u, employmentStatus: status, isActive: status !== "inactivo" } : u
    );
    await onSaveUsers(updated);
    onShowToast("Estado laboral actualizado", "El estado del usuario fue modificado exitosamente.", "success");
  };

  const handleChangeCompany = async (userId: string, companyId: string) => {
    const updated = users.map(u => 
      u.id === userId ? { ...u, companyId } : u
    );
    await onSaveUsers(updated);
    onShowToast("Empresa actualizada", "La empresa del usuario fue reasignada exitosamente.", "success");
  };

  const handleSaveEditedUser = async (updatedUser: UserAccount) => {
    // Validar correo duplicado si cambió
    if (users.some(u => u.id !== updatedUser.id && u.email.toLowerCase() === updatedUser.email.toLowerCase())) {
      onShowToast("Correo duplicado", "Ya existe otro usuario registrado con este correo corporativo.", "error");
      return;
    }

    const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    await onSaveUsers(updatedUsers);

    // Sincronizar en el padrón de participantes si existe
    if (onSaveParticipants && participants) {
      const updatedParticipants = participants.map(p => {
        if (p.email.toLowerCase() === updatedUser.email.toLowerCase()) {
          return {
            ...p,
            name: updatedUser.name,
            cedula: updatedUser.cedula,
            department: updatedUser.department,
            employmentStatus: updatedUser.employmentStatus,
            isActive: updatedUser.isActive,
            companyId: updatedUser.companyId
          };
        }
        return p;
      });
      await onSaveParticipants(updatedParticipants);
    }

    onShowToast("Usuario actualizado", `Se guardaron exitosamente los cambios para ${updatedUser.name}.`, "success");
    setSelectedUserForEdit(null);
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword || !newPasswordInput.trim()) return;

    const updated = users.map(u => 
      u.id === selectedUserForPassword.id ? { ...u, password: newPasswordInput.trim() } : u
    );

    try {
      await onSaveUsers(updated);
      onShowToast("Contraseña actualizada", `Se cambió la contraseña de ${selectedUserForPassword.name}.`, "success");
      setSelectedUserForPassword(null);
      setNewPasswordInput("");
    } catch (err: any) {
      onShowToast("Error", err.message || "No se pudo cambiar la contraseña.", "error");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const u = users.find(x => x.id === userId);
    if (!u) return;

    if (window.confirm(`¿Estás seguro de eliminar al usuario ${u.name}?`)) {
      const updated = users.filter(x => x.id !== userId);
      try {
        await onSaveUsers(updated);
        onShowToast("Usuario eliminado", "El usuario fue retirado del sistema.", "success");
      } catch (err: any) {
        onShowToast("Error", err.message || "No se pudo eliminar el usuario.", "error");
      }
    }
  };

  // Abrir Ficha 360° para un usuario buscando su participante correspondiente
  const handleOpenUserProfile = (user: UserAccount) => {
    let participant = participants.find(p => p.email.toLowerCase() === user.email.toLowerCase());
    if (!participant) {
      participant = {
        card: "N/A",
        name: user.name,
        email: user.email,
        cedula: user.cedula,
        department: user.department,
        employmentStatus: user.employmentStatus || "contratado",
        isActive: user.isActive !== undefined ? user.isActive : true,
        companyId: user.companyId || "emp_kasino"
      };
    }
    setViewingProfileParticipant(participant);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Diagnostic KPI Bar (Light Theme) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div 
          onClick={() => { setSelectedStatusFilter("all"); setSelectedRoleFilter("all"); setSelectedCompanyFilter("all"); }}
          className={`p-4 rounded-3xl border cursor-pointer transition-all ${
            selectedStatusFilter === "all" && selectedRoleFilter === "all"
              ? "bg-red-50/80 border-[#DA291C] shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>Total Cuentas</span>
            <UsersIcon className="w-4 h-4 text-[#DA291C]" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1.5">{stats.total}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Usuarios con acceso</p>
        </div>

        <div 
          onClick={() => setSelectedStatusFilter("contratado")}
          className={`p-4 rounded-3xl border cursor-pointer transition-all ${
            selectedStatusFilter === "contratado"
              ? "bg-emerald-50 border-emerald-500 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-700 font-bold">
            <span>Contratados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1.5">{stats.contratados}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Acceso activo</p>
        </div>

        <div 
          onClick={() => setSelectedStatusFilter("en_proceso")}
          className={`p-4 rounded-3xl border cursor-pointer transition-all ${
            selectedStatusFilter === "en_proceso"
              ? "bg-amber-50 border-amber-500 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-700 font-bold">
            <span>En Proceso</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-1.5">{stats.enProceso}</p>
          <p className="text-[10px] text-amber-600 mt-0.5">Inducción</p>
        </div>

        <div 
          onClick={() => setSelectedRoleFilter("Líder de Área / Supervisor")}
          className={`p-4 rounded-3xl border cursor-pointer transition-all ${
            selectedRoleFilter === "Líder de Área / Supervisor"
              ? "bg-blue-50 border-blue-500 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-700 font-bold">
            <span>Líderes / Sup.</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-1.5">{stats.supervisores}</p>
          <p className="text-[10px] text-blue-600 mt-0.5">Mandos con equipo</p>
        </div>

        <div 
          onClick={() => setSelectedStatusFilter("inactivo")}
          className={`p-4 rounded-3xl border cursor-pointer transition-all ${
            selectedStatusFilter === "inactivo"
              ? "bg-rose-50 border-rose-500 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-700 font-bold">
            <span>Inactivos</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700 mt-1.5">{stats.inactivos}</p>
          <p className="text-[10px] text-rose-600 mt-0.5">Acceso bloqueado</p>
        </div>
      </div>

      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search & Filters */}
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3.5 my-auto" aria-hidden="true" />
            <label htmlFor="users-search" className="sr-only">Buscar por nombre, correo, cédula, empresa o rol</label>
            <input
              id="users-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, correo, cédula, empresa o rol..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C] shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro Empresa */}
            {companies.length > 0 && isSuperAdmin && (
              <select
                id="users-filter-company"
                aria-label="Filtrar usuarios por empresa"
                value={selectedCompanyFilter}
                onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-800 font-bold focus:outline-none focus:border-[#DA291C]"
              >
                <option value="all">🏢 Todas las Empresas</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>🏢 {c.name}</option>
                ))}
              </select>
            )}

            {/* Filtro Estado */}
            <select
              id="users-filter-status"
              aria-label="Filtrar usuarios por estado laboral"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#DA291C]"
            >
              <option value="all">📋 Todos los Estados</option>
              <option value="contratado">🟢 Contratados (Activos)</option>
              <option value="en_proceso">🟡 En Proceso de Contratación</option>
              <option value="inactivo">🔴 Inactivos / Bajas</option>
            </select>

            {/* Filtro Rol */}
            <select
              id="users-filter-role"
              aria-label="Filtrar usuarios por rol"
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#DA291C]"
            >
              <option value="all">🛡️ Todos los Roles</option>
              {isSuperAdmin && (
                <option value="Super Administrador">Super Administrador</option>
              )}
              <option value="Administrador / Editor">Administrador / Editor</option>
              <option value="Evaluador / Tutor OJT">Evaluador / Tutor OJT</option>
              <option value="Líder de Área / Supervisor">Líder de Área / Supervisor</option>
              <option value="Colaborador (User)">Colaborador (User)</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBulkUsersModalOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-300 shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#DA291C]" />
            <span>Carga Masiva</span>
          </button>

          <button
            type="button"
            onClick={() => exportUsersToExcel(users)}
            className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-300 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar Usuarios</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddingUser(!isAddingUser)}
            className="px-4 py-2.5 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-extrabold rounded-2xl shadow-md shadow-red-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Usuario</span>
          </button>
        </div>

      </div>

      {/* Formulario Crear Usuario */}
      {isAddingUser && (
        <form onSubmit={handleAddUser} className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4 animate-in slide-in-from-top-3 duration-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-black text-slate-900">
            <Sparkles className="w-3.5 h-3.5 text-[#DA291C]" />
            <span>Crear Nueva Cuenta de Acceso</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre Completo *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ej. Juan Carlos Pérez"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Cédula</label>
              <input
                type="text"
                value={newCedula}
                onChange={(e) => setNewCedula(formatCedula(e.target.value))}
                placeholder="ej. 402-2196163-1"
                maxLength={13}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-[#DA291C]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Correo Corporativo *</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="ej. juan.perez@empresa.com"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Empresa</label>
              {isSuperAdmin ? (
                <select
                  value={newCompanyId}
                  onChange={(e) => setNewCompanyId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold truncate">
                  🏢 {companiesMap.get(newCompanyId)?.name || 'Empresa asignada'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Departamento</label>
              <input
                type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="ej. Tecnología"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Rol *</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
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

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Estado Laboral</label>
              <select
                value={newEmploymentStatus}
                onChange={(e) => setNewEmploymentStatus(e.target.value as EmploymentStatus)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
              >
                <option value="contratado">🟢 Contratado</option>
                <option value="en_proceso">🟡 En Proceso</option>
                <option value="inactivo">🔴 Inactivo</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingUser(false)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              Guardar Usuario
            </button>
          </div>
        </form>
      )}

      {/* Users Table (Light Theme) */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="p-4 font-bold">Usuario</th>
                <th className="p-4 font-bold">Cédula</th>
                <th className="p-4 font-bold">Empresa</th>
                <th className="p-4 font-bold">Departamento</th>
                <th className="p-4 font-bold">Correo</th>
                <th className="p-4 font-bold">Estado Laboral</th>
                <th className="p-4 font-bold">Rol Asignado</th>
                <th className="p-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(u => {
                  const uStatus = u.employmentStatus || "contratado";
                  const uComp = companiesMap.get(u.companyId || "emp_kasino");

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => handleOpenUserProfile(u)}
                          className="flex items-center gap-2.5 text-left group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-xl bg-red-50 text-[#DA291C] border border-red-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-[#DA291C] transition-colors flex items-center gap-1.5">
                              <span>{u.name}</span>
                              <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                          </div>
                        </button>
                      </td>

                      <td className="p-4">
                        {u.cedula ? (
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            {u.cedula}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">No asignada</span>
                        )}
                      </td>

                      {/* Empresa */}
                      <td className="p-4">
                        {isSuperAdmin ? (
                          <select
                            value={u.companyId || "emp_kasino"}
                            onChange={(e) => handleChangeCompany(u.id, e.target.value)}
                            className="px-2 py-1 rounded-xl text-[11px] font-bold bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-[#DA291C]"
                          >
                            {companies.map(c => (
                              <option key={c.id} value={c.id}>🏢 {c.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            🏢 {uComp?.name || 'Kasino 21 Corporativo'}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-slate-700">
                        {u.department ? (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                            {u.department}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="p-4 text-slate-500 font-mono text-[11px]">{u.email}</td>

                      {/* Estado Laboral */}
                      <td className="p-4">
                        <select
                          value={uStatus}
                          onChange={(e) => handleChangeStatus(u.id, e.target.value as EmploymentStatus)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white border ${
                            uStatus === "contratado"
                              ? "text-emerald-700 border-emerald-300"
                              : uStatus === "en_proceso"
                              ? "text-amber-700 border-amber-300"
                              : "text-rose-700 border-rose-300"
                          }`}
                        >
                          <option value="contratado">🟢 Contratado</option>
                          <option value="en_proceso">🟡 En Proceso</option>
                          <option value="inactivo">🔴 Inactivo</option>
                        </select>
                      </td>

                      {/* Rol */}
                      <td className="p-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u.id, e.target.value as UserRole)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold bg-white border border-slate-300 ${
                            u.role === "Super Administrador"
                              ? "text-amber-700"
                              : u.role === "Administrador / Editor"
                              ? "text-[#DA291C]"
                              : u.role === "Evaluador / Tutor OJT"
                              ? "text-indigo-700"
                              : u.role === "Líder de Área / Supervisor"
                              ? "text-emerald-700"
                              : "text-slate-700"
                          }`}
                        >
                          {isSuperAdmin && (
                            <option value="Super Administrador">Super Administrador</option>
                          )}
                          <option value="Administrador / Editor">Administrador / Editor</option>
                          <option value="Evaluador / Tutor OJT">Evaluador / Tutor OJT</option>
                          <option value="Líder de Área / Supervisor">Líder de Área / Supervisor</option>
                          <option value="Colaborador (User)">Colaborador (User)</option>
                        </select>
                      </td>

                      {/* Acciones */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenUserProfile(u)}
                            className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Ver Ficha 360°"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {(u.role === "Líder de Área / Supervisor" || u.role === "Super Administrador") && (
                            <button
                              onClick={() => setSelectedSupervisorForAssignment(u)}
                              className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Gestionar equipo asignado a este supervisor"
                            >
                              <UsersIcon className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Equipo ({u.assignedMemberCards?.length || participants.filter(p => p.supervisorId === u.id).length})</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedUserForEdit(u)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar usuario"
                            aria-label={`Editar usuario ${u.name}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedUserForPassword(u);
                              setNewPasswordInput("");
                            }}
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Cambiar contraseña"
                            aria-label={`Cambiar contraseña de ${u.name}`}
                          >
                            <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>

                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar usuario"
                              aria-label={`Eliminar usuario ${u.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <p className="text-sm font-bold text-slate-800">No se encontraron usuarios</p>
                    <p className="text-xs text-slate-500 mt-1">Prueba ajustando los filtros de búsqueda o empresa.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 flex justify-between bg-slate-50">
          <span>Mostrando {filteredUsers.length} de {users.length} usuarios registrados</span>
          <span>{stats.contratados} contratados • {stats.enProceso} en proceso • {stats.supervisores} líderes</span>
        </div>
      </div>

      {/* Change Password Modal */}
      {selectedUserForPassword && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-password-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600">
              <KeyRound className="w-5 h-5" aria-hidden="true" />
              <h2 id="change-password-modal-title" className="text-base font-black text-slate-900">Cambiar Contraseña</h2>
            </div>
            <p className="text-xs text-slate-500">
              Ingresa la nueva contraseña para <strong className="text-slate-800">{selectedUserForPassword.name}</strong> ({selectedUserForPassword.email}).
            </p>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="user-new-password-input" className="sr-only">Nueva contraseña</label>
                <input
                  id="user-new-password-input"
                  type="text"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Nueva contraseña..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPassword(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/30 cursor-pointer"
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
          currentUser={currentUser}
          isSuperAdmin={isSuperAdmin}
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

      {/* Modal de Edición de Usuario */}
      {selectedUserForEdit && (
        <EditUserModal
          user={selectedUserForEdit}
          companies={companies}
          isSuperAdmin={isSuperAdmin}
          currentUser={currentUser}
          onClose={() => setSelectedUserForEdit(null)}
          onSave={handleSaveEditedUser}
        />
      )}

      {/* Modal de Ficha 360° */}
      {viewingProfileParticipant && (
        <ParticipantProfileModal
          participant={viewingProfileParticipant}
          users={users}
          events={events}
          programs={programs}
          companies={companies}
          technicalHistory={technicalHistory}
          currentUser={currentUser}
          isOpen={Boolean(viewingProfileParticipant)}
          onClose={() => setViewingProfileParticipant(null)}
        />
      )}

    </div>
  );
};
