import React, { useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  CreditCard, 
  Building, 
  ShieldCheck, 
  Save, 
  CheckCircle2, 
  Clock, 
  UserX, 
  AlertTriangle,
  Sparkles,
  KeyRound
} from 'lucide-react';
import { Participant, UserAccount, UserRole, EmploymentStatus, Company } from '../../types';
import { formatCedula, isValidCedula } from '../../utils/formatters';
import { AccessibleModal } from '../common/AccessibleModal';

interface EditParticipantModalProps {
  participant: Participant;
  users: UserAccount[];
  companies?: Company[];
  currentUser?: UserAccount | null;
  isSuperAdmin?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedParticipant: Participant, newRole?: UserRole) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error') => void;
}

export const EditParticipantModal: React.FC<EditParticipantModalProps> = ({
  participant,
  users,
  companies = [],
  currentUser,
  isSuperAdmin = true,
  isOpen,
  onClose,
  onSave,
  onShowToast
}) => {
  const defaultCompanyId = participant.companyId || (!isSuperAdmin && currentUser?.companyId ? currentUser.companyId : (companies[0]?.id || 'emp_kasino'));

  const [name, setName] = useState(participant.name);
  const [email, setEmail] = useState(participant.email);
  const [cedula, setCedula] = useState(participant.cedula || '');
  const [department, setDepartment] = useState(participant.department || '');
  const [supervisorId, setSupervisorId] = useState(participant.supervisorId || '');
  const [companyId, setCompanyId] = useState(defaultCompanyId);
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>(participant.employmentStatus || 'contratado');
  const [isActive, setIsActive] = useState<boolean>(participant.isActive !== undefined ? participant.isActive : true);

  // Campos Sociodemográficos y Académicos
  const [birthDate, setBirthDate] = useState(participant.birthDate || '');
  const [educationLevel, setEducationLevel] = useState<any>(participant.educationLevel || 'Secundaria / Bachiller');
  const [isCurrentlyStudying, setIsCurrentlyStudying] = useState<boolean>(Boolean(participant.isCurrentlyStudying));
  const [currentStudyField, setCurrentStudyField] = useState(participant.currentStudyField || '');
  const [institutionName, setInstitutionName] = useState(participant.institutionName || '');
  const [professionTitle, setProfessionTitle] = useState(participant.professionTitle || '');
  const [currentAddress, setCurrentAddress] = useState(participant.currentAddress || '');
  const [phone, setPhone] = useState(participant.phone || '');
  const [gender, setGender] = useState<any>(participant.gender || 'Prefiero no decir');

  // Rol del usuario vinculado
  const linkedUser = users.find(u => u.email.toLowerCase() === participant.email.toLowerCase());
  const [userRole, setUserRole] = useState<UserRole>(linkedUser?.role || 'Colaborador (User)');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const supervisors = users.filter(u => {
    const isSup = (
      u.role === 'Líder de Área / Supervisor' || 
      u.role === 'Super Administrador' || 
      u.role === 'Administrador / Editor'
    );
    if (!isSup) return false;
    if (!isSuperAdmin) {
      return (u.companyId || 'emp_kasino') === (currentUser?.companyId || 'emp_kasino');
    }
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      onShowToast('Campos requeridos', 'El nombre y el correo son obligatorios.', 'error');
      return;
    }

    if (cedula.trim()) {
      const formatted = formatCedula(cedula.trim());
      if (!isValidCedula(formatted)) {
        onShowToast('Cédula inválida', 'La cédula debe tener 11 dígitos en formato 000-0000000-0.', 'error');
        return;
      }
    }

    const selectedSuper = supervisors.find(s => s.id === supervisorId);

    const updated: Participant = {
      ...participant,
      name: name.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      cedula: cedula.trim() ? formatCedula(cedula.trim()) : undefined,
      department: department.trim() || undefined,
      companyId: companyId || 'emp_kasino',
      supervisorId: selectedSuper ? selectedSuper.id : undefined,
      supervisorName: selectedSuper ? selectedSuper.name : undefined,
      employmentStatus,
      isActive: employmentStatus === 'inactivo' ? false : isActive,
      birthDate: birthDate.trim() || undefined,
      educationLevel: educationLevel || undefined,
      isCurrentlyStudying,
      currentStudyField: isCurrentlyStudying ? currentStudyField.trim() : undefined,
      institutionName: isCurrentlyStudying ? institutionName.trim() : undefined,
      professionTitle: professionTitle.trim() || undefined,
      currentAddress: currentAddress.trim() || undefined,
      phone: phone.trim() || undefined,
      gender: gender || undefined,
      profileCompleted: Boolean(birthDate && educationLevel)
    };

    try {
      setIsSaving(true);
      await onSave(updated, userRole);
      onShowToast('Colaborador actualizado', 'Los datos y estado laboral fueron guardados correctamente.', 'success');
      onClose();
    } catch (err: any) {
      onShowToast('Error al guardar', err.message || 'No se pudieron guardar los cambios.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Editar Colaborador"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-[#DA291C] font-black">
              {participant.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Editar Colaborador</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-red-50 text-[#DA291C] border border-red-200">
                  #{participant.card}
                </span>
              </h3>
              <p className="text-xs text-slate-500">Actualizar información laboral, jerarquía y estado de contratación</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          
          {/* Estado Laboral / Contratación */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Estado Laboral & Proceso de Contratación *
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Opción 1: Contratado */}
              <button
                type="button"
                onClick={() => { setEmploymentStatus('contratado'); setIsActive(true); }}
                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  employmentStatus === 'contratado'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className={`p-1.5 rounded-xl mt-0.5 ${employmentStatus === 'contratado' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-900">Contratado</p>
                  <p className={`text-[10px] mt-0.5 leading-tight ${employmentStatus === 'contratado' ? 'text-emerald-800/80' : 'text-slate-500'}`}>Colaborador formal y activo</p>
                </div>
              </button>

              {/* Opción 2: En Proceso de Contratación */}
              <button
                type="button"
                onClick={() => { setEmploymentStatus('en_proceso'); setIsActive(true); }}
                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  employmentStatus === 'en_proceso'
                    ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className={`p-1.5 rounded-xl mt-0.5 ${employmentStatus === 'en_proceso' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">En Proceso</p>
                  <p className={`text-[10px] mt-0.5 leading-tight ${employmentStatus === 'en_proceso' ? 'text-amber-800/80' : 'text-slate-500'}`}>En inducción o contratación</p>
                </div>
              </button>

              {/* Opción 3: Inactivo / Baja */}
              <button
                type="button"
                onClick={() => { setEmploymentStatus('inactivo'); setIsActive(false); }}
                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  employmentStatus === 'inactivo'
                    ? 'bg-rose-50 border-rose-500 text-rose-950 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className={`p-1.5 rounded-xl mt-0.5 ${employmentStatus === 'inactivo' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <UserX className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-rose-900">Inactivo / Baja</p>
                  <p className={`text-[10px] mt-0.5 leading-tight ${employmentStatus === 'inactivo' ? 'text-rose-800/80' : 'text-slate-500'}`}>Desvinculado o pausado</p>
                </div>
              </button>
            </div>
          </div>

          {/* Datos Personales y de Identidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. MARÍA GONZÁLEZ"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold uppercase focus:outline-none focus:border-[#DA291C]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Cédula (11 dígitos)
              </label>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(formatCedula(e.target.value))}
                placeholder="ej. 402-2196163-1"
                maxLength={13}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-[#DA291C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Correo Electrónico Corporativo *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ej. maria.gonzalez@empresa.com"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Departamento / Área
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="ej. Tecnología"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#DA291C]"
              />
            </div>
          </div>

          {/* Empresa Asignada */}
          {companies.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Empresa / Entidad Corporativa *
              </label>
              {isSuperAdmin ? (
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#DA291C]"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      🏢 {c.name} ({c.industry || 'Corporativo'})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold truncate">
                  🏢 {companies.find(c => c.id === companyId)?.name || 'Empresa asignada'}
                </div>
              )}
            </div>
          )}

          {/* Supervisor Asignado */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Supervisor / Líder de Área Asignado
            </label>
            <select
              value={supervisorId}
              onChange={(e) => setSupervisorId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#DA291C]"
            >
              <option value="">(Sin Supervisor Asignado)</option>
              {supervisors.map(s => (
                <option key={s.id} value={s.id}>
                  👤 {s.name} ({s.department || 'Sin Depto'} • {s.role})
                </option>
              ))}
            </select>
          </div>

          {/* Ficha Académica & Sociodemográfica */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              🎓 Ficha Académica & Sociodemográfica
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nivel de Estudio
                </label>
                <select
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-[#DA291C]"
                >
                  <option value="Secundaria / Bachiller">Secundaria / Bachiller</option>
                  <option value="Técnico / Tecnólogo">Técnico / Tecnólogo</option>
                  <option value="Universitario en Curso">Universitario en Curso</option>
                  <option value="Profesional / Grado">Profesional / Grado</option>
                  <option value="Postgrado / Maestría">Postgrado / Maestría</option>
                  <option value="Doctorado">Doctorado</option>
                  <option value="Primaria">Primaria</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Título / Profesión
                </label>
                <input
                  type="text"
                  value={professionTitle}
                  onChange={(e) => setProfessionTitle(e.target.value)}
                  placeholder="ej. Lic. en Contabilidad"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-[#DA291C]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-[#DA291C]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ej. (809) 555-1234"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-[#DA291C]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Dirección / Sector
                </label>
                <input
                  type="text"
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  placeholder="ej. Ensanche Naco, Santo Domingo"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-[#DA291C]"
                />
              </div>

              {/* ¿Estudia actualmente? */}
              <div className="sm:col-span-2 pt-1 border-t border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">¿Estudia actualmente?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCurrentlyStudying(false)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${!isCurrentlyStudying ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCurrentlyStudying(true)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${isCurrentlyStudying ? 'bg-[#DA291C] text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      Sí
                    </button>
                  </div>
                </div>

                {isCurrentlyStudying && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/60">
                    <input
                      type="text"
                      value={currentStudyField}
                      onChange={(e) => setCurrentStudyField(e.target.value)}
                      placeholder="Carrera / Curso que estudia"
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                    />
                    <input
                      type="text"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      placeholder="Universidad / Instituto"
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rol del Usuario Vinculado */}
          <div className="p-4 rounded-2xl bg-red-50/50 border border-red-200 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#DA291C]" />
              <label className="block text-xs font-bold text-slate-900">
                Rol de Acceso al Sistema
              </label>
            </div>
            <p className="text-[11px] text-slate-600">
              Define los privilegios de inicio de sesión y módulos accesibles para este colaborador.
            </p>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as UserRole)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-[#DA291C]"
            >
              <option value="Colaborador (User)">Colaborador (User) - Reservar y consultar cursos</option>
              <option value="Evaluador / Tutor OJT">Evaluador / Tutor OJT - Bitácoras de campo y calibración</option>
              <option value="Líder de Área / Supervisor">Líder de Área / Supervisor - Asignar y supervisar equipo</option>
              <option value="Administrador / Editor">Administrador / Editor - Gestionar catálogo y reportes</option>
              {isSuperAdmin && (
                <option value="Super Administrador">Super Administrador - Control total y usuarios</option>
              )}
            </select>
          </div>

        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2 bg-[#DA291C] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md shadow-red-500/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>

      </div>
    </AccessibleModal>
  );
};
