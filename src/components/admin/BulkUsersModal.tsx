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

interface BulkUsersModalProps {
  existingUsers: UserAccount[];
  participants: Participant[];
  onClose: () => void;
  onSaveUsers: (users: UserAccount[]) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

type TabType = 'excel' | 'text' | 'padron';

export const BulkUsersModal: React.FC<BulkUsersModalProps> = ({
  existingUsers,
  participants,
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
  const unregisteredParticipants = participants.filter(p => !existingUserEmails.has(p.email.toLowerCase()));
  
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
    if (activeTab === 'excel') return excelUsers;
    if (activeTab === 'text') return textUsers;
    if (activeTab === 'padron') {
      const selected = participants.filter(p => selectedParticipants.has(p.card));
      return selected.map((p, idx) => ({
        id: `usr_${Date.now()}_${idx}`,
        name: p.name,
        email: p.email.toLowerCase(),
        role: defaultPadronRole,
        password: '123',
        cedula: p.cedula ? formatCedula(p.cedula) : undefined
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
              cedula: imported.cedula || finalUsers[existingIdx].cedula
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400">
                Creación Masiva
              </span>
              <span className="text-xs text-slate-400 font-medium">Gestión de Cuentas</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>Importar y Crear Usuarios Masivamente</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Registra múltiples usuarios mediante hojas de cálculo, pegado rápido o sincronización desde el padrón.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-800 bg-slate-950/40 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('excel')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'excel'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'text'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'padron'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
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
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Carga mediante Plantilla Excel (.xlsx, .xls, .csv)</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Asegúrate de incluir las columnas: <strong>Cédula</strong> (11 dígitos ej. <span className="text-amber-400">402-2196163-1</span>), <strong>Nombre</strong>, <strong>Correo</strong>, <strong>Rol</strong> y <strong>Contraseña</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadUsersTemplateExcel}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
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
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isProcessingFile ? 'Analizando...' : 'Seleccionar Archivo'}</span>
                  </button>
                </div>
              </div>

              {/* Error alerts from Excel */}
              {excelErrors.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>{excelErrors.length} advertencia(s) en el archivo:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-200/90 max-h-24 overflow-y-auto">
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
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Clipboard className="w-4 h-4 text-indigo-400" />
                    <span>Pega filas copiadas de Excel o texto delimitado por comas / tabulaciones</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Formato: Cédula, Nombre, Correo, Rol, Contraseña</span>
                </div>

                <textarea
                  value={rawText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`Ejemplo:\n402-2196163-1\tAna Morales\tana.morales@empresa.com\tColaborador (User)\t123\n001-0876543-2\tCarlos Gómez\tcarlos.gomez@empresa.com\tAdministrador / Editor\tpass2026`}
                  rows={6}
                  className="w-full p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Nota: La cédula debe contener 11 dígitos (formato 000-0000000-0).</span>
                  {rawText && (
                    <button
                      type="button"
                      onClick={() => handleTextChange('')}
                      className="text-rose-400 hover:text-rose-300 font-semibold"
                    >
                      Limpiar texto
                    </button>
                  )}
                </div>
              </div>

              {textErrors.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>{textErrors.length} línea(s) con formato no reconocido:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-200/90 max-h-24 overflow-y-auto">
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
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="flex-1 max-w-sm">
                  <input
                    type="text"
                    value={padronSearch}
                    onChange={(e) => setPadronSearch(e.target.value)}
                    placeholder="Filtrar colaboradores del padrón..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Rol a asignar:</span>
                    <select
                      value={defaultPadronRole}
                      onChange={(e) => setDefaultPadronRole(e.target.value as UserRole)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                    >
                      <option value="Colaborador (User)">Colaborador (User)</option>
                      <option value="Administrador / Editor">Administrador / Editor</option>
                      <option value="Super Administrador">Super Administrador</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={selectAllFilteredPadron}
                    className="px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-indigo-300"
                  >
                    {selectedParticipants.size === filteredPadron.length && filteredPadron.length > 0 ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                  </button>
                </div>
              </div>

              {filteredPadron.length > 0 ? (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60 rounded-2xl border border-slate-800 bg-slate-900/60">
                  {filteredPadron.map(p => {
                    const isSelected = selectedParticipants.has(p.card);
                    return (
                      <div
                        key={p.card}
                        onClick={() => toggleParticipant(p.card)}
                        className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-600/15' : 'hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <p className="text-xs font-semibold text-white">{p.name}</p>
                            <p className="text-[11px] text-slate-400">{p.email} • Tarjeta: {p.card}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          {p.cedula ? (
                            <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                              {p.cedula}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Sin cédula</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Previsualización ({usersToImport.length} usuarios a procesar)
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    +{newCount} Nuevos
                  </span>
                  {duplicateCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {duplicateCount} Existentes
                    </span>
                  )}
                  {invalidCedulas > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {invalidCedulas} Cédula(s) Inválidas
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 text-[11px]">
                      <th className="p-3">Estado</th>
                      <th className="p-3">Cédula (11 dígitos)</th>
                      <th className="p-3">Nombre</th>
                      <th className="p-3">Correo</th>
                      <th className="p-3">Rol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {usersToImport.map((u, i) => {
                      const isExisting = existingUserEmails.has(u.email.toLowerCase());
                      const hasValidCedula = !u.cedula || isValidCedula(u.cedula);

                      return (
                        <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                          <td className="p-3 whitespace-nowrap">
                            {isExisting ? (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                Existente
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                Nuevo
                              </span>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {u.cedula ? (
                              <span className={`font-mono text-[11px] font-bold ${
                                hasValidCedula ? 'text-indigo-400' : 'text-rose-400 underline'
                              }`}>
                                {u.cedula}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Opcional</span>
                            )}
                          </td>
                          <td className="p-3 font-semibold text-white">{u.name}</td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">{u.email}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900 text-slate-300 border border-slate-800">
                              {u.role}
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
                <div className="flex items-center gap-2 pt-2 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    id="overwriteToggle"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
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
        <div className="p-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {usersToImport.length > 0 ? (
              <span>Listos para procesar: <strong>{usersToImport.length} usuarios</strong></span>
            ) : (
              <span>Selecciona o ingresa usuarios para continuar</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={usersToImport.length === 0 || isSubmitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
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
    </div>
  );
};
