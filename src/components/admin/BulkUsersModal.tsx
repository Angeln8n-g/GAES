import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Clipboard, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  RefreshCw, 
  UserCheck
} from 'lucide-react';
import { UserAccount, Participant, UserRole } from '../../types';
import { 
  parseUsersExcelFile, 
  parseUsersFromText, 
  downloadUsersTemplateExcel 
} from '../../utils/excelUtils';
import { isValidCedula, formatCedula } from '../../utils/formatters';
import { AccessibleModal } from '../common/AccessibleModal';

interface BulkUsersModalProps {
  existingUsers: UserAccount[];
  participants: Participant[];
  currentUser?: UserAccount | null;
  isSuperAdmin?: boolean;
  onClose: () => void;
  onSaveUsers: (users: UserAccount[]) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

type TabType = 'excel' | 'text' | 'padron';

export const BulkUsersModal: React.FC<BulkUsersModalProps> = ({
  existingUsers,
  participants,
  currentUser,
  isSuperAdmin = true,
  onClose,
  onSaveUsers,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('excel');
  
  // Excel Tab State
  const [excelUsers, setExcelUsers] = useState<UserAccount[]>([]);
  const [excelErrors, setExcelErrors] = useState<Array<{ row: number; reason: string }>>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Text Tab State
  const [rawText, setRawText] = useState('');
  const [textUsers, setTextUsers] = useState<UserAccount[]>([]);
  const [textErrors, setTextErrors] = useState<Array<{ line: number; reason: string }>>([]);

  // Padrón Tab State
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [defaultPadronRole, setDefaultPadronRole] = useState<UserRole>('Colaborador (User)');
  const [padronSearch, setPadronSearch] = useState('');

  // Options
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Participants without user account
  const existingUserEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
  const unregisteredParticipants = participants.filter(p => {
    if (!isSuperAdmin) {
      const pComp = p.companyId || 'emp_kasino';
      if (pComp !== (currentUser?.companyId || 'emp_kasino')) return false;
    }
    return !existingUserEmails.has(p.email.toLowerCase());
  });
  
  const filteredPadron = unregisteredParticipants.filter(p => {
    const q = padronSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || (p.cedula && p.cedula.includes(q)) || p.card.includes(q);
  });

  // Handle Excel File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingFile(true);
      const { validUsers, invalidRows } = await parseUsersExcelFile(file);
      setExcelUsers(validUsers);
      setExcelErrors(invalidRows.map(r => ({ row: r.row, reason: r.reason })));
      
      if (validUsers.length === 0 && invalidRows.length > 0) {
        onShowToast('Sin registros válidos', invalidRows[0].reason, 'error');
      } else {
        onShowToast('Archivo analizado', `Se detectaron ${validUsers.length} usuarios válidos y ${invalidRows.length} advertencias.`, 'info');
      }
    } catch (err: any) {
      onShowToast('Error al leer archivo', err.message || 'El formato del archivo no es compatible.', 'error');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Text Live Change
  const handleTextChange = (val: string) => {
    setRawText(val);
    if (!val.trim()) {
      setTextUsers([]);
      setTextErrors([]);
      return;
    }
    const { validUsers, invalidRows } = parseUsersFromText(val);
    setTextUsers(validUsers);
    setTextErrors(invalidRows.map(r => ({ line: r.line, reason: r.reason })));
  };

  // Handle Toggle Select Participant
  const toggleParticipant = (card: string) => {
    const next = new Set(selectedParticipants);
    if (next.has(card)) {
      next.delete(card);
    } else {
      next.add(card);
    }
    setSelectedParticipants(next);
  };

  const selectAllFilteredPadron = () => {
    if (selectedParticipants.size === filteredPadron.length) {
      setSelectedParticipants(new Set());
    } else {
      setSelectedParticipants(new Set(filteredPadron.map(p => p.card)));
    }
  };

  // Compute final users to import based on active tab
  const getUsersToImport = (): UserAccount[] => {
    const userCompany = !isSuperAdmin ? (currentUser?.companyId || 'emp_kasino') : 'emp_kasino';

    if (activeTab === 'excel') {
      return excelUsers.map(u => ({
        ...u,
        companyId: !isSuperAdmin ? userCompany : (u.companyId || 'emp_kasino'),
        role: (!isSuperAdmin && u.role === 'Super Administrador') ? 'Administrador / Editor' : u.role
      }));
    }
    if (activeTab === 'text') {
      return textUsers.map(u => ({
        ...u,
        companyId: !isSuperAdmin ? userCompany : (u.companyId || 'emp_kasino'),
        role: (!isSuperAdmin && u.role === 'Super Administrador') ? 'Administrador / Editor' : u.role
      }));
    }
    if (activeTab === 'padron') {
      const selected = participants.filter(p => selectedParticipants.has(p.card));
      return selected.map((p, idx) => ({
        id: `usr_${Date.now()}_${idx}`,
        name: p.name,
        email: p.email.toLowerCase(),
        role: defaultPadronRole,
        password: '123',
        cedula: p.cedula ? formatCedula(p.cedula) : undefined,
        department: p.department,
        companyId: p.companyId || userCompany,
        employmentStatus: p.employmentStatus || 'contratado',
        isActive: p.isActive !== undefined ? p.isActive : true
      }));
    }
    return [];
  };

  const usersToImport = getUsersToImport();

  // Metrics for Preview
  const newCount = usersToImport.filter(u => !existingUserEmails.has(u.email.toLowerCase())).length;
  const duplicateCount = usersToImport.filter(u => existingUserEmails.has(u.email.toLowerCase())).length;
  const invalidCedulas = usersToImport.filter(u => u.cedula && !isValidCedula(u.cedula)).length;

  const handleConfirmImport = async () => {
    if (usersToImport.length === 0) {
      onShowToast('Sin datos', 'No hay usuarios válidos para importar.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      let finalUsers = [...existingUsers];

      usersToImport.forEach(imported => {
        const existingIdx = finalUsers.findIndex(u => u.email.toLowerCase() === imported.email.toLowerCase());
        if (existingIdx > -1) {
          if (overwriteExisting) {
            finalUsers[existingIdx] = {
              ...finalUsers[existingIdx],
              name: imported.name,
              role: imported.role,
              password: imported.password || finalUsers[existingIdx].password || '123',
              cedula: imported.cedula || finalUsers[existingIdx].cedula,
              companyId: imported.companyId || finalUsers[existingIdx].companyId || 'emp_kasino',
              department: imported.department || finalUsers[existingIdx].department,
              employmentStatus: imported.employmentStatus || finalUsers[existingIdx].employmentStatus || 'contratado',
              isActive: imported.isActive !== undefined ? imported.isActive : finalUsers[existingIdx].isActive
            };
          }
        } else {
          finalUsers.push(imported);
        }
      });

      await onSaveUsers(finalUsers);
      onShowToast('Carga Masiva Exitosa', `Se procesaron ${usersToImport.length} usuarios correctamente.`, 'success');
      onClose();
    } catch (err: any) {
      onShowToast('Error al importar', err.message || 'Ocurrió un error al guardar los usuarios.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      onClose={onClose}
      ariaLabel="Creación Masiva de Usuarios"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-[#DA291C] border border-red-200">
                Creación Masiva
              </span>
              <span className="text-xs text-slate-500 font-bold">Gestión de Cuentas</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#DA291C]" />
              <span>Importar y Crear Usuarios Masivamente</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Registra múltiples usuarios mediante hojas de cálculo, pegado rápido o sincronización desde el padrón.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-200 bg-slate-50/50 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('excel')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'excel'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>1. Archivo Excel / CSV</span>
            {excelUsers.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{excelUsers.length}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'text'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            <span>2. Pegar Texto / Portapapeles</span>
            {textUsers.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{textUsers.length}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('padron')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'padron'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>3. Desde Padrón ({unregisteredParticipants.length} pendientes)</span>
            {selectedParticipants.size > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{selectedParticipants.size}</span>
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {/* TAB 1: EXCEL / CSV */}
          {activeTab === 'excel' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Carga mediante Plantilla Excel (.xlsx, .xls, .csv)</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Plantilla oficial con todos los campos: <strong>Cédula *</strong> (11 dígitos ej. <span className="text-[#DA291C] font-bold">402-2196163-1</span>), <strong>Nombre Completo *</strong>, <strong>Correo Corporativo *</strong>, <strong>Empresa</strong>, <strong>Departamento</strong>, <strong>Rol</strong>, <strong>Estado Laboral</strong> y <strong>Contraseña</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadUsersTemplateExcel}
                    className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Descargar Plantilla (.xlsx)</span>
                  </button>

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
                    disabled={isProcessingFile}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isProcessingFile ? 'Analizando...' : 'Seleccionar Archivo'}</span>
                  </button>
                </div>
              </div>

              {/* Error alerts from Excel */}
              {excelErrors.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>{excelErrors.length} advertencia(s) en el archivo:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-900 max-h-24 overflow-y-auto">
                    {excelErrors.map((err, i) => (
                      <li key={i}>Fila {err.row}: {err.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEXT PASTE */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Clipboard className="w-4 h-4 text-[#DA291C]" />
                    <span>Pega filas copiadas de Excel o texto delimitado por comas / tabulaciones</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-semibold">Formato: Cédula, Nombre, Correo, Rol, Contraseña</span>
                </div>

                <textarea
                  value={rawText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`Ejemplo:\n402-2196163-1\tAna Morales\tana.morales@empresa.com\tColaborador (User)\t123\n001-0876543-2\tCarlos Gómez\tcarlos.gomez@empresa.com\tAdministrador / Editor\tpass2026`}
                  rows={6}
                  className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Nota: La cédula debe contener 11 dígitos (formato 000-0000000-0).</span>
                  {rawText && (
                    <button
                      type="button"
                      onClick={() => handleTextChange('')}
                      className="text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                    >
                      Limpiar texto
                    </button>
                  )}
                </div>
              </div>

              {textErrors.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>{textErrors.length} línea(s) con formato no reconocido:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-900 max-h-24 overflow-y-auto">
                    {textErrors.map((err, i) => (
                      <li key={i}>Línea {err.line}: {err.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DESDE PADRÓN */}
          {activeTab === 'padron' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex-1 max-w-sm">
                  <input
                    type="text"
                    value={padronSearch}
                    onChange={(e) => setPadronSearch(e.target.value)}
                    placeholder="Filtrar colaboradores del padrón..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-600 font-bold">Rol a asignar:</span>
                    <select
                      value={defaultPadronRole}
                      onChange={(e) => setDefaultPadronRole(e.target.value as UserRole)}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
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

                  <button
                    type="button"
                    onClick={selectAllFilteredPadron}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    {selectedParticipants.size === filteredPadron.length && filteredPadron.length > 0 ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                  </button>
                </div>
              </div>

              {filteredPadron.length > 0 ? (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-xs">
                  {filteredPadron.map(p => {
                    const isSelected = selectedParticipants.has(p.card);
                    return (
                      <div
                        key={p.card}
                        onClick={() => toggleParticipant(p.card)}
                        className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-red-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded border-slate-300 text-[#DA291C] focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-900">{p.name}</p>
                            <p className="text-[11px] text-slate-500">{p.email} • Tarjeta: #{p.card}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          {p.cedula ? (
                            <span className="text-[10px] font-mono font-bold text-[#DA291C] bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                              {p.cedula}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Sin cédula</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  {unregisteredParticipants.length === 0 
                    ? '¡Todos los colaboradores del padrón ya cuentan con un usuario registrado!'
                    : 'No se encontraron colaboradores que coincidan con el filtro.'}
                </div>
              )}
            </div>
          )}

          {/* PREVIEW TABLE OF USERS TO IMPORT */}
          {usersToImport.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-200 pt-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#DA291C]" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Previsualización ({usersToImport.length} usuarios a procesar)
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    +{newCount} Nuevos
                  </span>
                  {duplicateCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {duplicateCount} Existentes
                    </span>
                  )}
                  {invalidCedulas > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      {invalidCedulas} Cédula(s) Inválidas
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-[11px] font-bold">
                      <th className="p-3">Estado</th>
                      <th className="p-3">Cédula</th>
                      <th className="p-3">Nombre</th>
                      <th className="p-3">Correo</th>
                      <th className="p-3">Departamento</th>
                      <th className="p-3">Rol</th>
                      <th className="p-3">Condición</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersToImport.map((u, i) => {
                      const isExisting = existingUserEmails.has(u.email.toLowerCase());
                      const hasValidCedula = !u.cedula || isValidCedula(u.cedula);

                      return (
                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 whitespace-nowrap">
                            {isExisting ? (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Existente
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Nuevo
                              </span>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {u.cedula ? (
                              <span className={`font-mono text-[11px] font-bold ${
                                hasValidCedula ? 'text-[#DA291C]' : 'text-rose-600 underline'
                              }`}>
                                {u.cedula}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Opcional</span>
                            )}
                          </td>
                          <td className="p-3 font-bold text-slate-900">{u.name}</td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">{u.email}</td>
                          <td className="p-3 text-slate-600 text-[11px]">{u.department || '—'}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              u.employmentStatus === 'inactivo'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : u.employmentStatus === 'en_proceso'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {u.employmentStatus === 'inactivo' ? 'Inactivo' : u.employmentStatus === 'en_proceso' ? 'En Proceso' : 'Contratado'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Duplicate Strategy Option */}
              {duplicateCount > 0 && (
                <div className="flex items-center gap-2 pt-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    id="overwriteToggle"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#DA291C] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="overwriteToggle" className="cursor-pointer">
                    Actualizar información de los <strong>{duplicateCount} usuarios existentes</strong> si coinciden por correo electrónico.
                  </label>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium">
            {usersToImport.length > 0 ? (
              <span>Listos para procesar: <strong className="text-slate-900">{usersToImport.length} usuarios</strong></span>
            ) : (
              <span>Selecciona o ingresa usuarios para continuar</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={usersToImport.length === 0 || isSubmitting}
              className="px-5 py-2.5 bg-[#DA291C] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-2xl shadow-md shadow-red-500/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Importar {usersToImport.length} Usuarios</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </AccessibleModal>
  );
};
