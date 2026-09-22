import React, { useState, useMemo } from "react";
import { 
  Building2, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Users, 
  BookOpen, 
  ShieldCheck, 
  ExternalLink, 
  Mail, 
  Phone, 
  FileText, 
  Sparkles,
  X,
  Globe,
  Layers
} from "lucide-react";
import { Company, Participant, UserAccount, TrainingEvent } from "../../types";

interface CompaniesManagerProps {
  companies: Company[];
  participants: Participant[];
  users: UserAccount[];
  events: TrainingEvent[];
  selectedCompanyId: string;
  onSelectCompanyScope: (companyId: string) => void;
  onSaveCompany: (company: Company) => Promise<void>;
  onDeleteCompany: (companyId: string) => Promise<void>;
  onShowToast: (title: string, message: string, type: "success" | "error" | "info") => void;
}

export const CompaniesManager: React.FC<CompaniesManagerProps> = ({
  companies,
  participants,
  users,
  events,
  selectedCompanyId,
  onSelectCompanyScope,
  onSaveCompany,
  onDeleteCompany,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [rncTaxId, setRncTaxId] = useState("");
  const [industry, setIndustry] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Mapear estadísticas por empresa en tiempo real
  const companyMetrics = useMemo(() => {
    const metrics: Record<string, { participants: number; users: number; supervisors: number; events: number }> = {};

    companies.forEach(c => {
      metrics[c.id] = { participants: 0, users: 0, supervisors: 0, events: 0 };
    });

    participants.forEach(p => {
      const cId = p.companyId || "emp_kasino";
      if (metrics[cId]) metrics[cId].participants++;
    });

    users.forEach(u => {
      const cId = u.companyId || "emp_kasino";
      if (metrics[cId]) {
        metrics[cId].users++;
        if (u.role === "Líder de Área / Supervisor" || u.role === "Super Administrador") {
          metrics[cId].supervisors++;
        }
      }
    });

    events.forEach(e => {
      const cId = e.companyId || "emp_kasino";
      if (metrics[cId]) metrics[cId].events++;
    });

    return metrics;
  }, [companies, participants, users, events]);

  const filteredCompanies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return companies;
    return companies.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.industry && c.industry.toLowerCase().includes(q)) ||
      (c.rncTaxId && c.rncTaxId.toLowerCase().includes(q)) ||
      (c.contactEmail && c.contactEmail.toLowerCase().includes(q))
    );
  }, [companies, searchQuery]);

  const handleOpenCreateModal = () => {
    setEditingCompany(null);
    setName("");
    setSlug("");
    setLogoUrl("");
    setRncTaxId("");
    setIndustry("");
    setContactEmail("");
    setContactPhone("");
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (comp: Company) => {
    setEditingCompany(comp);
    setName(comp.name);
    setSlug(comp.slug);
    setLogoUrl(comp.logoUrl || "");
    setRncTaxId(comp.rncTaxId || "");
    setIndustry(comp.industry || "");
    setContactEmail(comp.contactEmail || "");
    setContactPhone(comp.contactPhone || "");
    setIsActive(comp.isActive !== false);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCompany) {
      const generatedSlug = val.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      setSlug(generatedSlug);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onShowToast("Campo requerido", "El nombre de la empresa es obligatorio.", "error");
      return;
    }

    const companyData: Company = {
      id: editingCompany ? editingCompany.id : `emp_${Date.now()}`,
      name: name.trim(),
      slug: slug.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]/g, "-"),
      logoUrl: logoUrl.trim() || undefined,
      rncTaxId: rncTaxId.trim() || undefined,
      industry: industry.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      isActive: isActive
    };

    try {
      await onSaveCompany(companyData);
      onShowToast(
        editingCompany ? "Empresa actualizada" : "Empresa registrada",
        `Se ha guardado la empresa "${companyData.name}" correctamente.`,
        "success"
      );
      setIsModalOpen(false);
    } catch (err: any) {
      onShowToast("Error", err.message || "No se pudo guardar la empresa.", "error");
    }
  };

  const handleDelete = async (comp: Company) => {
    if (comp.id === "emp_kasino") {
      onShowToast("Operación restringida", "La empresa corporativa principal no puede ser eliminada.", "error");
      return;
    }

    if (window.confirm(`¿Estás seguro de eliminar la empresa "${comp.name}"? Los colaboradores asignados deberán ser reubicados.`)) {
      try {
        await onDeleteCompany(comp.id);
        onShowToast("Empresa eliminada", `Se eliminó "${comp.name}" de la plataforma.`, "success");
      } catch (err: any) {
        onShowToast("Error", err.message || "No se pudo eliminar la empresa.", "error");
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3.5 my-auto" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, sector, RNC o contacto..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#DA291C] shadow-xs"
          />
        </div>

        {/* Create Button */}
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-extrabold rounded-2xl shadow-md shadow-red-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nueva Empresa</span>
        </button>
      </div>

      {/* Grid of Companies */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCompanies.map(comp => {
          const stats = companyMetrics[comp.id] || { participants: 0, users: 0, supervisors: 0, events: 0 };
          const isSelected = selectedCompanyId === comp.id;

          return (
            <div 
              key={comp.id}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-all relative overflow-hidden ${
                isSelected 
                  ? "border-[#DA291C] dark:border-red-500 shadow-md ring-2 ring-red-500/20" 
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              {/* Active / Inactive Badge */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                    {comp.logoUrl ? (
                      <img
                        src={comp.logoUrl}
                        alt={comp.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <Building2 className="w-7 h-7 text-[#DA291C] dark:text-red-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 dark:text-white text-sm truncate">{comp.name}</h3>
                    </div>
                    <span className="inline-block px-2.5 py-0.5 mt-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                      {comp.industry || "Corporativo"}
                    </span>
                  </div>
                </div>

                {comp.isActive !== false ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Activa
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold flex items-center gap-1 shrink-0">
                    <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                    Inactiva
                  </span>
                )}
              </div>

              {/* Tax & Contact details */}
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 border-t border-b border-slate-100 dark:border-slate-800 py-3 mb-4">
                {comp.rncTaxId && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">RNC / Tax ID:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{comp.rncTaxId}</span>
                  </div>
                )}
                {comp.contactEmail && (
                  <div className="flex items-center justify-between text-[11px] truncate">
                    <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      Email:
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[170px]">{comp.contactEmail}</span>
                  </div>
                )}
                {comp.contactPhone && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      Tel:
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">{comp.contactPhone}</span>
                  </div>
                )}
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-center mb-4">
                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white">{stats.participants}</p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold">Padrón</p>
                </div>
                <div>
                  <p className="text-xs font-black text-amber-600 dark:text-amber-400">{stats.supervisors}</p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold">Líderes</p>
                </div>
                <div>
                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">{stats.users}</p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold">Usuarios</p>
                </div>
                <div>
                  <p className="text-xs font-black text-[#DA291C] dark:text-red-400">{stats.events}</p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold">Cursos</p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSelectCompanyScope(comp.id)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-[#DA291C] text-white shadow-md shadow-red-500/25"
                      : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{isSelected ? "Empresa Activa ✓" : "Filtrar por esta Empresa"}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(comp)}
                    className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    title="Editar Empresa"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {comp.id !== "emp_kasino" && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comp)}
                      className="p-2 text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Eliminar Empresa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Crear / Editar Empresa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Building2 className="w-5 h-5 text-[#DA291C] dark:text-red-400" />
                <h2 className="font-black text-base">
                  {editingCompany ? "Editar Empresa" : "Registrar Nueva Empresa"}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nombre de la Empresa *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="ej. Gran Resort & Hospitality Club"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#DA291C]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Slug / Identificador</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="ej. gran-resort"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Sector / Industria</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="ej. Turismo & Hotelería"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">RNC / Tax ID</label>
                  <input
                    type="text"
                    value={rncTaxId}
                    onChange={(e) => setRncTaxId(e.target.value)}
                    placeholder="ej. 101-445566-2"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">URL del Logo</label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email de Contacto</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="rrhh@empresa.com"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Teléfono</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+1 (809) 555-0000"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-[#DA291C] focus:ring-[#DA291C] cursor-pointer"
                />
                <label htmlFor="activeCheck" className="text-xs text-slate-700 dark:text-slate-300 font-bold cursor-pointer">
                  Empresa Activa (Permitir inscripciones y acceso a colaboradores)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#DA291C] hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/25 transition-all cursor-pointer"
                >
                  Guardar Empresa
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
