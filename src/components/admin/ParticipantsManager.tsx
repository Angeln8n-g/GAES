import React, { useState, useRef, useMemo } from "react";
import { 
  Users, 
  Search, 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  UserCheck, 
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2, 
  Clock,
  UserX,
  Sparkles, 
  Building, 
  ShieldCheck,
  Edit3,
  Eye,
  Filter,
  Building2,
  ArrowRightLeft
} from "lucide-react";
import { Participant, UserAccount, UserRole, EmploymentStatus, TrainingEvent, TrainingProgram, Company } from "../../types";
import { exportParticipantsToExcel, parseParticipantsExcelFile } from "../../utils/excelUtils";
import { generateEmailFromName, formatCedula, isValidCedula } from "../../utils/formatters";
import { EditParticipantModal } from "./EditParticipantModal";
import { ParticipantProfileModal } from "./ParticipantProfileModal";
import { ExternalTraining, TechnicalAcademyHistoryRecord } from "../../types";

interface ParticipantsManagerProps {
  participants: Participant[];
  users?: UserAccount[];
  events?: TrainingEvent[];
  programs?: TrainingProgram[];
  companies?: Company[];
  externalTrainings?: ExternalTraining[];
  technicalHistory?: TechnicalAcademyHistoryRecord[];
  currentUser?: UserAccount | null;
  isSuperAdmin?: boolean;
  onSaveParticipants: (participants: Participant[]) => Promise<void>;
  onSaveUsers?: (users: UserAccount[]) => Promise<void>;
  onShowToast: (title: string, message: string, type: "success" | "error" | "info") => void;
}

export const ParticipantsManager: React.FC<ParticipantsManagerProps> = ({
  participants,
  users = [],
  events = [],
  programs = [],
  companies = [],
  externalTrainings = [],
  technicalHistory = [],
  currentUser,
  isSuperAdmin = true,
  onSaveParticipants,
  onSaveUsers,
  onShowToast
}) => {
  const defaultCompanyId = !isSuperAdmin && currentUser?.companyId ? currentUser.companyId : (companies[0]?.id || "emp_kasino");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("Todos");
  const [selectedSuperFilter, setSelectedSuperFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("all");
  const [selectedEducationFilter, setSelectedEducationFilter] = useState<string>("all");
  const [selectedStudyingFilter, setSelectedStudyingFilter] = useState<string>("all");
  
  // Modals state
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [viewingProfileParticipant, setViewingProfileParticipant] = useState<Participant | null>(null);

  // Formulario nuevo participante
  const [newCard, setNewCard] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCedula, setNewCedula] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newSupervisorId, setNewSupervisorId] = useState("");
  const [newCompanyId, setNewCompanyId] = useState(defaultCompanyId);
  const [newEmploymentStatus, setNewEmploymentStatus] = useState<EmploymentStatus>("contratado");
  
  // Selección múltiple y acciones en lote
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [bulkSupervisorId, setBulkSupervisorId] = useState("");
  const [bulkDepartment, setBulkDepartment] = useState("");
  const [bulkCompanyId, setBulkCompanyId] = useState("");
  const [bulkStatus, setBulkStatus] = useState<EmploymentStatus | "">("");

  const [isAddingManual, setIsAddingManual] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Lista de supervisores disponibles (filtrados por empresa si no es Super Admin)
  const supervisors = useMemo(() => {
    return users.filter(u => {
      const isSupervisorOrAdmin = (
        u.role === "Líder de Área / Supervisor" || 
        u.role === "Super Administrador" || 
        u.role === "Administrador / Editor"
      );
      if (!isSupervisorOrAdmin) return false;
      if (!isSuperAdmin) {
        return (u.companyId || "emp_kasino") === (currentUser?.companyId || "emp_kasino");
      }
      return true;
    });
  }, [users, isSuperAdmin, currentUser]);

  // Lista de departamentos únicos
  const departments = useMemo(() => {
    const set = new Set<string>();
    participants.forEach(p => {
      if (p.department) set.add(p.department);
    });
    return ["Todos", ...Array.from(set)];
  }, [participants]);

  // Mapa rápido de empresas
  const companiesMap = useMemo(() => {
    return new Map(companies.map(c => [c.id, c]));
  }, [companies]);

  // Estadísticas rápidas de calidad de datos
  const stats = useMemo(() => {
    let contratados = 0;
    let enProceso = 0;
    let inactivos = 0;
    let sinSupervisor = 0;

    participants.forEach(p => {
      const st = p.employmentStatus || "contratado";
      if (st === "contratado") contratados++;
      else if (st === "en_proceso") enProceso++;
      else if (st === "inactivo") inactivos++;

      if (!p.supervisorId) sinSupervisor++;
    });

    return {
      total: participants.length,
      contratados,
      enProceso,
      inactivos,
      sinSupervisor
    };
  }, [participants]);

  const filtered = useMemo(() => {
    return participants.filter(p => {
      const pStatus = p.employmentStatus || "contratado";
      const pCompany = p.companyId || "emp_kasino";

      // Filtro empresa
      if (selectedCompanyFilter !== "all" && pCompany !== selectedCompanyFilter) {
        return false;
      }

      // Filtro estado
      if (selectedStatusFilter !== "all" && pStatus !== selectedStatusFilter) {
        return false;
      }

      // Filtro departamento
      if (selectedDeptFilter !== "Todos" && p.department !== selectedDeptFilter) {
        return false;
      }

      // Filtro supervisor
      if (selectedSuperFilter !== "all") {
        if (selectedSuperFilter === "unassigned" && p.supervisorId) return false;
        if (selectedSuperFilter !== "unassigned" && p.supervisorId !== selectedSuperFilter) return false;
      }

      // Filtro nivel educativo
      if (selectedEducationFilter !== "all" && (p.educationLevel || "Secundaria / Bachiller") !== selectedEducationFilter) {
        return false;
      }

      // Filtro si estudia actualmente
      if (selectedStudyingFilter === "studying" && !p.isCurrentlyStudying) {
        return false;
      }
      if (selectedStudyingFilter === "not_studying" && p.isCurrentlyStudying) {
        return false;
      }

      // Filtro de búsqueda
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const compName = companiesMap.get(pCompany)?.name || "";

      return (
        p.name.toLowerCase().includes(q) || 
        p.email.toLowerCase().includes(q) || 
        p.card.includes(q) ||
        (p.cedula && p.cedula.includes(q)) ||
        (p.department && p.department.toLowerCase().includes(q)) ||
        (p.supervisorName && p.supervisorName.toLowerCase().includes(q)) ||
        compName.toLowerCase().includes(q)
      );
    });
  }, [participants, selectedCompanyFilter, selectedStatusFilter, selectedDeptFilter, selectedSuperFilter, selectedEducationFilter, selectedStudyingFilter, searchQuery, companiesMap]);

  const handleToggleCard = (card: string) => {
    setSelectedCards(prev => {
      const next = new Set(prev);
      if (next.has(card)) next.delete(card);
      else next.add(card);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const visibleCards = filtered.map(p => p.card);
    const allSelected = visibleCards.length > 0 && visibleCards.every(c => selectedCards.has(c));
    if (allSelected) {
      setSelectedCards(prev => {
        const next = new Set(prev);
        visibleCards.forEach(c => next.delete(c));
        return next;
      });
    } else {
      setSelectedCards(prev => {
        const next = new Set(prev);
        visibleCards.forEach(c => next.add(c));
        return next;
      });
    }
  };

  // Guardar colaborador desde EditModal
  const handleSaveParticipantFromModal = async (updatedParticipant: Participant, newRole?: UserRole) => {
    const updated = participants.map(p => 
      p.card === updatedParticipant.card ? updatedParticipant : p
    );
    await onSaveParticipants(updated);

    // Actualizar rol de usuario si cambió
    if (newRole && onSaveUsers) {
      const userToUpdate = users.find(u => u.email.toLowerCase() === updatedParticipant.email.toLowerCase());
      if (userToUpdate && userToUpdate.role !== newRole) {
        const updatedUsers = users.map(u => 
          u.id === userToUpdate.id ? { ...u, role: newRole, companyId: updatedParticipant.companyId } : u
        );
        await onSaveUsers(updatedUsers);
      }
    }
  };

  // Acciones en Lote: Empresa
  const handleApplyBulkCompany = async () => {
    if (selectedCards.size === 0 || !bulkCompanyId) return;
    const targetComp = companies.find(c => c.id === bulkCompanyId);

    const updated = participants.map(p => {
      if (selectedCards.has(p.card)) {
        return {
          ...p,
          companyId: bulkCompanyId
        };
      }
      return p;
    });

    try {
      await onSaveParticipants(updated);
      onShowToast(
        "Empresa asignada en lote",
        `Se reubicaron ${selectedCards.size} colaboradores en "${targetComp?.name || bulkCompanyId}".`,
        "success"
      );
      setSelectedCards(new Set());
      setBulkCompanyId("");
    } catch (err: any) {
      onShowToast("Error", err.message || "No se pudo aplicar la reubicación de empresa.", "error");
    }
  };

  // Acciones en Lote: Supervisor
  const handleApplyBulkSupervisor = async () => {
    if (selectedCards.size === 0) return;
    const selectedSuper = supervisors.find(s => s.id === bulkSupervisorId);
    
    const updated = participants.map(p => {
      if (selectedCards.has(p.card)) {
        return {
          ...p,
          supervisorId: selectedSuper ? selectedSuper.id : undefined,
          supervisorName: selectedSuper ? selectedSuper.name : undefined,
          department: selectedSuper?.department ? (p.department || selectedSuper.department) : p.department
        };
      }
      return p;
    });

    try {
      await onSaveParticipants(updated);
      onShowToast(
        "Supervisores asignados en lote",
        selectedSuper 
          ? `Se asignó a ${selectedSuper.name} para ${selectedCards.size} colaboradores.`
          : `Se desasignó supervisor a ${selectedCards.size} colaboradores.`,
        "success"
      );
      setSelectedCards(new Set());
      setBulkSupervisorId("");
    } catch (err: any) {
      onShowToast("Error", err.message || "No se pudo aplicar la asignación masiva.", "error");
    }
  };

  // Acciones en Lote: Departamento
  const handleApplyBulkDepartment = async () => {
    if (selectedCards.size === 0 || !bulkDepartment.trim()) return;
    const cleanDept = bulkDepartment.trim();

    const updated = participants.map(p => {
      if (selectedCards.has(p.card)) {
        return {
          ...p,
          department: cleanDept
        };
      }
      return p;
    });

    try {
      await onSaveParticipants(updated);
      onShowToast("Departamento asignado", `Se asignó "${cleanDept}" a ${selectedCards.size} colaboradores.`, "success");
      setSelectedCards(new Set());
      setBulkDepartment("");
    } catch (err: any) {
      onShowToast("Error", err.message || "No se pudo actualizar el departamento.", "error");
    }
  };

  // Acciones en Lote: Estado Laboral
  const handleApplyBulkStatus = async () => {
    if (selectedCards.size === 0 || !bulkStatus) return;

    const updated = participants.map(p => {
      if (selectedCards.has(p.card)) {
        return {
          ...p,
          employmentStatus: bulkStatus,
          isActive: bulkStatus !== "inactivo"
        };
      }
      return p;
    });

    try {
      await onSaveParticipants(updated);
      const statusLabels = {
        contratado: "Contratado (Activo)",
        en_proceso: "En Proceso de Contratación",
        inactivo: "Inactivo / Baja"
      };
      onShowToast(
        "Estado laboral actualizado", 
        `Se cambió a "${statusLabels[bulkStatus]}" para ${selectedCards.size} colaboradores.`, 
        "success"
      );
      setSelectedCards(new Set());
      setBulkStatus("");
    } catch (err: any) {
      onShowToast("Error", err.message || "No se pudo actualizar el estado laboral.", "error");
    }
  };

  const handleNameChange = (val: string) => {
    setNewName(val);
    if (!newEmail || newEmail.includes("@empresa.com")) {
      setNewEmail(generateEmailFromName(val));
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.trim() || !newName.trim() || !newEmail.trim()) return;

    if (participants.some(p => p.card === newCard.trim())) {
      onShowToast("Tarjeta duplicada", "Ya existe un colaborador con este número de tarjeta.", "error");
      return;
    }

    if (newCedula.trim()) {
      const formatted = formatCedula(newCedula.trim());
      if (!isValidCedula(formatted)) {
        onShowToast("Cédula inválida", "La cédula debe tener 11 dígitos en formato 000-0000000-0.", "error");
        return;
      }
    }

    const selectedSuper = supervisors.find(s => s.id === newSupervisorId);

    const newParticipant: Participant = {
      card: newCard.trim(),
      name: newName.trim().toUpperCase(),
      email: newEmail.trim().toLowerCase(),
      cedula: newCedula.trim() ? formatCedula(newCedula.trim()) : undefined,
      department: newDepartment.trim() || undefined,
      supervisorId: selectedSuper ? selectedSuper.id : undefined,
      supervisorName: selectedSuper ? selectedSuper.name : undefined,
      employmentStatus: newEmploymentStatus,
      isActive: newEmploymentStatus !== "inactivo",
      companyId: newCompanyId || "emp_kasino"
    };

    const updated = [...participants, newParticipant];

    try {
      await onSaveParticipants(updated);
      onShowToast("Colaborador agregado", `Se ha registrado a ${newParticipant.name} en el padrón.`, "success");
      setNewCard("");
      setNewName("");
      setNewEmail("");
      setNewCedula("");
      setNewDepartment("");
      setNewSupervisorId("");
      setNewEmploymentStatus("contratado");
      setIsAddingManual(false);
    } catch (err: any) {
      onShowToast("Error", err.message || "No se pudo agregar al colaborador.", "error");
    }
  };

  const handleInlineSupervisorChange = async (card: string, supervisorId: string) => {
    const selectedSuper = supervisors.find(s => s.id === supervisorId);
    const updated = participants.map(p => {
      if (p.card === card) {
        return {
          ...p,
          supervisorId: selectedSuper ? selectedSuper.id : undefined,
          supervisorName: selectedSuper ? selectedSuper.name : undefined
        };
      }
      return p;
    });

    try {
      await onSaveParticipants(updated);
      onShowToast(
        "Supervisor asignado", 
        selectedSuper ? `Se asignó a ${selectedSuper.name}.` : "Se desasignó el supervisor.", 
        "success"
      );
    } catch (err: any) {
      onShowToast("Error", err.message || "No se pudo actualizar el supervisor.", "error");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const parsed = await parseParticipantsExcelFile(file);
      
      const existingCards = new Set(participants.map(p => p.card));
      const newItems = parsed.filter(p => !existingCards.has(p.card)).map(p => ({
        ...p,
        employmentStatus: p.employmentStatus || "contratado",
        isActive: p.isActive !== undefined ? p.isActive : true,
        companyId: !isSuperAdmin 
          ? (currentUser?.companyId || "emp_kasino") 
          : (p.companyId || (selectedCompanyFilter !== "all" ? selectedCompanyFilter : "emp_kasino"))
      }));

      const updated = [...participants, ...newItems];
      await onSaveParticipants(updated);
      onShowToast("Importación exitosa", `Se importaron y aprovisionaron ${newItems.length} colaboradores desde Excel.`, "success");
    } catch (err: any) {
      onShowToast("Error de importación", err.message || "Error al procesar el archivo Excel.", "error");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (card: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar a "${name}" del padrón general?`)) {
      const updated = participants.filter(p => p.card !== card);
      await onSaveParticipants(updated);
      onShowToast("Colaborador eliminado", "Se ha retirado del padrón.", "success");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* KPI Diagnostic Cards (Light Theme) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div 
          onClick={() => setSelectedStatusFilter("all")}
          className={`p-4 rounded-3xl border cursor-pointer transition-all ${
            selectedStatusFilter === "all"
              ? "bg-red-50/80 border-[#DA291C] shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>Total Padrón</span>
            <Users className="w-4 h-4 text-[#DA291C]" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1.5">{stats.total}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Colaboradores registrados</p>
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
          <p className="text-[10px] text-emerald-600 mt-0.5">Activos formalmente</p>
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
          <p className="text-[10px] text-amber-600 mt-0.5">Inducción / Contratación</p>
        </div>

        <div 
          onClick={() => setSelectedSuperFilter("unassigned")}
          className={`p-4 rounded-3xl border cursor-pointer transition-all ${
            selectedSuperFilter === "unassigned"
              ? "bg-amber-50 border-amber-500 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-800 font-bold">
            <span>Sin Supervisor</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 mt-1.5">{stats.sinSupervisor}</p>
          <p className="text-[10px] text-amber-700 mt-0.5">Pendientes de vincular</p>
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
            <span>Inactivos / Bajas</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700 mt-1.5">{stats.inactivos}</p>
          <p className="text-[10px] text-rose-600 mt-0.5">Desvinculados</p>
        </div>
      </div>

      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search & Filters */}
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3.5 my-auto" aria-hidden="true" />
            <label htmlFor="participants-search" className="sr-only">Buscar colaborador por nombre, tarjeta, cédula, empresa o supervisor</label>
            <input
              id="participants-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, tarjeta, cédula, empresa o supervisor..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C] shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro Empresa */}
            {companies.length > 0 && isSuperAdmin && (
              <select
                id="participants-company-filter"
                aria-label="Filtrar colaboradores por empresa"
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
              id="participants-status-filter"
              aria-label="Filtrar colaboradores por estado laboral"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#DA291C]"
            >
              <option value="all">📋 Todos los Estados</option>
              <option value="contratado">🟢 Contratados (Activos)</option>
              <option value="en_proceso">🟡 En Proceso de Contratación</option>
              <option value="inactivo">🔴 Inactivos / Bajas</option>
            </select>

            {/* Filtro Depto */}
            <select
              id="participants-dept-filter"
              aria-label="Filtrar colaboradores por departamento"
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#DA291C]"
            >
              {departments.map(d => (
                <option key={d} value={d}>{d === "Todos" ? "🏢 Todos los Deptos" : `🏢 ${d}`}</option>
              ))}
            </select>

            {/* Filtro Supervisor */}
            <select
              id="participants-super-filter"
              aria-label="Filtrar colaboradores por supervisor"
              value={selectedSuperFilter}
              onChange={(e) => setSelectedSuperFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#DA291C]"
            >
              <option value="all">👤 Todos los Supervisores</option>
              <option value="unassigned">⚠️ Sin Supervisor Asignado</option>
              {supervisors.map(s => (
                <option key={s.id} value={s.id}>👤 Sup: {s.name}</option>
              ))}
            </select>

            {/* Filtro Nivel Educativo */}
            <select
              id="participants-edu-filter"
              aria-label="Filtrar colaboradores por nivel educativo"
              value={selectedEducationFilter}
              onChange={(e) => setSelectedEducationFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#DA291C]"
            >
              <option value="all">🎓 Todo Nivel Educativo</option>
              <option value="Secundaria / Bachiller">Secundaria / Bachiller</option>
              <option value="Técnico / Tecnólogo">Técnico / Tecnólogo</option>
              <option value="Universitario en Curso">Universitario en Curso</option>
              <option value="Profesional / Grado">Profesional / Grado</option>
              <option value="Postgrado / Maestría">Postgrado / Maestría</option>
            </select>

            {/* Filtro Estudia Actualmente */}
            <select
              id="participants-studying-filter"
              aria-label="Filtrar colaboradores por situación académica"
              value={selectedStudyingFilter}
              onChange={(e) => setSelectedStudyingFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#DA291C]"
            >
              <option value="all">📚 Situación Académica</option>
              <option value="studying">🎓 Estudiando Actualmente</option>
              <option value="not_studying">No Estudia Actualmente</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-300 shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#DA291C]" />
            <span>{isImporting ? "Importando..." : "Importar Excel"}</span>
          </button>

          <button
            type="button"
            onClick={() => exportParticipantsToExcel(participants)}
            className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-300 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar Padrón</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddingManual(!isAddingManual)}
            className="px-4 py-2.5 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-extrabold rounded-2xl shadow-md shadow-red-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Colaborador</span>
          </button>
        </div>

      </div>

      {/* Manual Add Collapsible Form */}
      {isAddingManual && (
        <form onSubmit={handleAddParticipant} className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4 animate-in slide-in-from-top-3 duration-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-black text-slate-900">
            <Sparkles className="w-3.5 h-3.5 text-[#DA291C]" />
            <span>Registrar Nuevo Colaborador en Padrón</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-8 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">No. Tarjeta *</label>
              <input
                type="text"
                value={newCard}
                onChange={(e) => setNewCard(e.target.value)}
                placeholder="ej. 2045"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-[#DA291C]"
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

            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre Completo *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="ej. MARÍA GONZÁLEZ LÓPEZ"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 uppercase focus:outline-none focus:border-[#DA291C]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Correo Corporativo *</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="ej. maria.gonzalez@empresa.com"
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
                  🏢 {companies.find(c => c.id === newCompanyId)?.name || 'Empresa asignada'}
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

          <div className="flex items-center justify-between pt-2">
            <div className="w-full max-w-xs">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Supervisor Asignado</label>
              <select
                value={newSupervisorId}
                onChange={(e) => setNewSupervisorId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
              >
                <option value="">(Sin Supervisor)</option>
                {supervisors.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.department || s.role})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddingManual(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Guardar en Padrón
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedCards.size > 0 && (
        <div className="bg-white text-slate-900 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl animate-in slide-in-from-top-2 border border-red-200">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[#DA291C] text-white font-black text-xs shadow-xs">
              {selectedCards.size}
            </span>
            <span className="text-xs text-slate-700 font-bold">colaboradores seleccionados</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Reubicar Empresa Masivo (Solo Super Administrador) */}
            {companies.length > 0 && isSuperAdmin && (
              <div className="flex items-center gap-1.5">
                <select
                  value={bulkCompanyId}
                  onChange={(e) => setBulkCompanyId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#DA291C]"
                >
                  <option value="">Reubicar Empresa...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>🏢 {c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleApplyBulkCompany}
                  disabled={!bulkCompanyId}
                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Mover Empresa
                </button>
              </div>
            )}

            {/* Asignar Estado Laboral Masivo */}
            <div className="flex items-center gap-1.5">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as EmploymentStatus)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#DA291C]"
              >
                <option value="">Cambiar Estado...</option>
                <option value="contratado">🟢 Contratado (Activo)</option>
                <option value="en_proceso">🟡 En Proceso de Contratación</option>
                <option value="inactivo">🔴 Inactivo / Baja</option>
              </select>
              <button
                type="button"
                onClick={handleApplyBulkStatus}
                disabled={!bulkStatus}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Aplicar Estado
              </button>
            </div>

            {/* Asignar Supervisor Masivo */}
            <div className="flex items-center gap-1.5">
              <select
                value={bulkSupervisorId}
                onChange={(e) => setBulkSupervisorId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#DA291C]"
              >
                <option value="">Seleccionar Supervisor...</option>
                {supervisors.map(s => (
                  <option key={s.id} value={s.id}>👤 {s.name} ({s.department || s.role})</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplyBulkSupervisor}
                disabled={!bulkSupervisorId}
                className="px-3.5 py-1.5 bg-[#DA291C] hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Asignar Supervisor
              </button>
            </div>

            {/* Asignar Depto Masivo */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Nuevo Depto..."
                value={bulkDepartment}
                onChange={(e) => setBulkDepartment(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 w-32 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
              />
              <button
                type="button"
                onClick={handleApplyBulkDepartment}
                disabled={!bulkDepartment.trim()}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-300 cursor-pointer shadow-xs"
              >
                Asignar Depto
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCards(new Set())}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1 transition-colors cursor-pointer"
            >
              Desmarcar Todo
            </button>
          </div>
        </div>
      )}

      {/* Participants Table (Light Theme) */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="table-scroll-hint">
          <span className="flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#DA291C]" />
            Desliza horizontalmente para ver todas las columnas
          </span>
          <span className="font-mono text-slate-400">9 columnas</span>
        </div>
        <div className="table-responsive-container">
          <table className="w-full text-left text-xs min-w-[920px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every(p => selectedCards.has(p.card))}
                    onChange={handleSelectAllVisible}
                    className="rounded border-slate-300 text-[#DA291C] focus:ring-[#DA291C] cursor-pointer"
                  />
                </th>
                <th className="p-4 font-bold">Tarjeta / ID</th>
                <th className="p-4 font-bold">Cédula</th>
                <th className="p-4 font-bold">Colaborador</th>
                <th className="p-4 font-bold">Empresa</th>
                <th className="p-4 font-bold">Departamento</th>
                <th className="p-4 font-bold">Estado Laboral</th>
                <th className="p-4 font-bold">Supervisor Asignado</th>
                <th className="p-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map(p => {
                  const isSelected = selectedCards.has(p.card);
                  const pStatus = p.employmentStatus || "contratado";
                  const pCompany = companiesMap.get(p.companyId || "emp_kasino");

                  return (
                    <tr 
                      key={p.card} 
                      className={`transition-colors ${isSelected ? "bg-red-50/50" : "hover:bg-slate-50/80"}`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          aria-label={`Seleccionar a ${p.name}`}
                          onChange={() => handleToggleCard(p.card)}
                          className="rounded border-slate-300 text-[#DA291C] focus:ring-[#DA291C] cursor-pointer"
                        />
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-800">#{p.card}</td>
                      
                      <td className="p-4">
                        {p.cedula ? (
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            {p.cedula}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">—</span>
                        )}
                      </td>

                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => setViewingProfileParticipant(p)}
                          className="text-left group cursor-pointer"
                        >
                          <p className="font-bold text-slate-900 group-hover:text-[#DA291C] transition-colors flex items-center gap-1.5">
                            <span>{p.name}</span>
                            <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </p>
                          <p className="text-slate-500 font-mono text-[11px]">{p.email}</p>
                          {(p.educationLevel || p.isCurrentlyStudying) && (
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {p.educationLevel && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  {p.educationLevel}
                                </span>
                              )}
                              {p.isCurrentlyStudying && (
                                <span 
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200" 
                                  title={p.currentStudyField ? `Estudia: ${p.currentStudyField}` : "Estudiando actualmente"}
                                >
                                  🎓 Estudia{p.currentStudyField ? `: ${p.currentStudyField}` : ""}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      </td>

                      {/* Empresa */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold flex items-center gap-1 w-fit">
                          <Building2 className="w-3 h-3 text-[#DA291C]" />
                          <span>{pCompany ? pCompany.name : "Kasino 21 Corporativo"}</span>
                        </span>
                      </td>

                      <td className="p-4 text-slate-700">
                        {p.department ? (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                            {p.department}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Estado Laboral Badge */}
                      <td className="p-4">
                        {pStatus === "contratado" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit shadow-xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Contratado
                          </span>
                        )}
                        {pStatus === "en_proceso" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit shadow-xs">
                            <Clock className="w-3 h-3 text-amber-600" />
                            En Proceso
                          </span>
                        )}
                        {pStatus === "inactivo" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit shadow-xs">
                            <UserX className="w-3 h-3 text-rose-600" />
                            Inactivo
                          </span>
                        )}
                      </td>

                      {/* Inline Supervisor Dropdown */}
                      <td className="p-4">
                        <select
                          value={p.supervisorId || ""}
                          aria-label={`Supervisor asignado para ${p.name}`}
                          onChange={(e) => handleInlineSupervisorChange(p.card, e.target.value)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white border ${
                            p.supervisorId
                              ? "text-emerald-700 border-emerald-300"
                              : "text-slate-500 border-slate-300"
                          }`}
                        >
                          <option value="">(Sin Supervisor)</option>
                          {supervisors.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Acciones */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingProfileParticipant(p)}
                            className="p-2 sm:p-1.5 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 touch-target-44 text-slate-600 hover:text-red-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Ver Ficha 360°"
                            aria-label={`Ver ficha 360° de ${p.name}`}
                          >
                            <Eye className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                          </button>

                          <button
                            onClick={() => setEditingParticipant(p)}
                            className="p-2 sm:p-1.5 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 touch-target-44 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Editar"
                            aria-label={`Editar participante: ${p.name}`}
                          >
                            <Edit3 className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                          </button>

                          <button
                            onClick={() => handleDelete(p.card, p.name)}
                            className="p-2 sm:p-1.5 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 touch-target-44 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Eliminar"
                            aria-label={`Eliminar participante: ${p.name}`}
                          >
                            <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    <p className="text-sm font-bold text-slate-800">No se encontraron colaboradores</p>
                    <p className="text-xs text-slate-500 mt-1">Prueba ajustando los filtros de búsqueda o empresa.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 flex justify-between bg-slate-50">
          <span>Mostrando {filtered.length} de {participants.length} colaboradores</span>
          <span>{stats.contratados} contratados • {stats.enProceso} en proceso • {stats.sinSupervisor} sin supervisor</span>
        </div>
      </div>

      {/* Modal de Edición */}
      {editingParticipant && (
        <EditParticipantModal
          participant={editingParticipant}
          users={users}
          companies={companies}
          isOpen={Boolean(editingParticipant)}
          onClose={() => setEditingParticipant(null)}
          onSave={handleSaveParticipantFromModal}
          onShowToast={onShowToast}
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
          externalTrainings={externalTrainings}
          technicalHistory={technicalHistory}
          currentUser={currentUser}
          isOpen={Boolean(viewingProfileParticipant)}
          onClose={() => setViewingProfileParticipant(null)}
          onOpenEdit={(p) => {
            setViewingProfileParticipant(null);
            setEditingParticipant(p);
          }}
        />
      )}

    </div>
  );
};
