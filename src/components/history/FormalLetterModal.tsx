import React, { useState, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  FileText, 
  Calendar as CalendarIcon, 
  Building2, 
  User, 
  Award, 
  Clock, 
  QrCode, 
  ShieldCheck, 
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { TrainingEvent, UserAccount, Participant, Company } from '../../types';
import { formatDateLong, formatDateShort, formatCedula } from '../../utils/formatters';

export interface TrainingHistoryRecord {
  id: string;
  title: string;
  category: string;
  modality: string;
  instructor: string;
  date: string;
  time: string;
  hasAttended: boolean;
  hours: number;
  gradeScore?: number | null;
  academicStatus?: string | null;
}

interface FormalLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  participant?: Participant | null;
  companies?: Company[];
  trainingRecords: TrainingHistoryRecord[];
}

export const FormalLetterModal: React.FC<FormalLetterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  participant,
  companies = [],
  trainingRecords
}) => {
  if (!isOpen) return null;

  // 1. Datos del Colaborador (Auto-rellenados y editables)
  const initialName = participant?.name || currentUser?.name || 'COLABORADOR CLARO';
  const initialCedula = participant?.cedula || currentUser?.cedula || '001-0000000-0';
  const initialCard = participant?.card || '2026';
  const initialDept = participant?.department || currentUser?.department || 'Operaciones y Tecnología';

  const userCompanyId = participant?.companyId || currentUser?.companyId || 'emp_kasino';
  const companyObj = companies.find(c => c.id === userCompanyId);
  const initialCompany = companyObj?.name || 'Claro Dominicana';

  const [collaboratorName, setCollaboratorName] = useState(initialName);
  const [collaboratorCedula, setCollaboratorCedula] = useState(initialCedula);
  const [collaboratorCard, setCollaboratorCard] = useState(initialCard);
  const [collaboratorDept, setCollaboratorDept] = useState(initialDept);
  const [collaboratorCompany, setCollaboratorCompany] = useState(initialCompany);

  // 2. Parámetros de la Carta
  const [recipientType, setRecipientType] = useState<'a_quien_interese' | 'gestion_humana' | 'universidad' | 'personalizado'>('a_quien_interese');
  const [customRecipient, setCustomRecipient] = useState('');
  
  // Fecha de expedición (por defecto hoy)
  const todayDateObj = new Date();
  const todayIso = `${todayDateObj.getFullYear()}-${String(todayDateObj.getMonth() + 1).padStart(2, '0')}-${String(todayDateObj.getDate()).padStart(2, '0')}`;
  const [issueDate, setIssueDate] = useState(todayIso);
  const [issueCity, setIssueCity] = useState('Santo Domingo, D.N., República Dominicana');

  // 3. Emisor y Firmante
  const [signerName, setSignerName] = useState('Lic. Carmen Rodríguez M.');
  const [signerTitle, setSignerTitle] = useState('Gerente de Capacitación y Desarrollo del Talento');
  const [signerDept, setSignerDept] = useState('Dirección de Gestión Humana - Claro');
  const [includeStamp, setIncludeStamp] = useState(true);
  const [includeQr, setIncludeQr] = useState(true);
  const [customNote, setCustomNote] = useState('');

  // 4. Selección de cursos a incluir y horas por curso
  // Inicializamos con todos los cursos que tienen asistencia confirmada (o todos si no hay ninguno)
  const initialSelectedMap: Record<string, boolean> = {};
  const initialHoursMap: Record<string, number> = {};

  trainingRecords.forEach(rec => {
    const hasAnyAttended = trainingRecords.some(r => r.hasAttended);
    initialSelectedMap[rec.id] = hasAnyAttended ? rec.hasAttended : true;
    initialHoursMap[rec.id] = rec.hours || 2;
  });

  const [selectedCourses, setSelectedCourses] = useState<Record<string, boolean>>(initialSelectedMap);
  const [courseHours, setCourseHours] = useState<Record<string, number>>(initialHoursMap);

  const [isCopied, setIsCopied] = useState(false);

  // Folio o código único de verificación
  const folioCode = useMemo(() => {
    const rawCard = collaboratorCard.replace(/\D/g, '') || '0000';
    const yearStr = todayDateObj.getFullYear();
    const hash = Math.abs(collaboratorName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 9000 + 1000);
    return `CLARO-CONST-${yearStr}-${rawCard}-${hash}`;
  }, [collaboratorCard, collaboratorName]);

  // Filtrar cursos seleccionados para la carta
  const coursesInLetter = useMemo(() => {
    return trainingRecords.filter(rec => selectedCourses[rec.id]);
  }, [trainingRecords, selectedCourses]);

  // Total de horas acumuladas en la carta
  const totalAccumulatedHours = useMemo(() => {
    return coursesInLetter.reduce((acc, curr) => acc + (courseHours[curr.id] || 2), 0);
  }, [coursesInLetter, courseHours]);

  // Texto del Destinatario
  const resolvedRecipient = useMemo(() => {
    switch (recipientType) {
      case 'a_quien_interese':
        return 'A QUIEN PUEDA INTERESAR';
      case 'gestion_humana':
        return 'A LA GERENCIA DE GESTIÓN HUMANA';
      case 'universidad':
        return 'A LA INSTITUCIÓN ACADÉMICA / UNIVERSITARIA';
      case 'personalizado':
        return (customRecipient.trim() || 'A QUIEN PUEDA INTERESAR').toUpperCase();
    }
  }, [recipientType, customRecipient]);

  // Manejador para alternar selección de todos los cursos
  const handleToggleSelectAll = (select: boolean) => {
    const updated: Record<string, boolean> = {};
    trainingRecords.forEach(rec => {
      updated[rec.id] = select;
    });
    setSelectedCourses(updated);
  };

  // Manejador para imprimir
  const handlePrint = () => {
    window.print();
  };

  // Manejador para copiar texto
  const handleCopyText = async () => {
    const lines: string[] = [];
    lines.push('CLARO DOMINICANA - DIRECCIÓN DE GESTIÓN HUMANA');
    lines.push('DIRECCIÓN DE APRENDIZAJE Y DESARROLLO ORGANIZACIONAL');
    lines.push(`Código de Validación: ${folioCode}`);
    lines.push('');
    lines.push(`${issueCity}, ${formatDateLong(issueDate)}`);
    lines.push('');
    lines.push(resolvedRecipient);
    lines.push('');
    lines.push('CONSTANCIA DE HISTORIAL DE CAPACITACIONES Y FORMACIÓN CONTINUA');
    lines.push('');
    lines.push(`Por medio de la presente, la Dirección de Aprendizaje y Desarrollo Organizacional de ${collaboratorCompany} hace constar que el(la) colaborador(a):`);
    lines.push('');
    lines.push(`• Nombre Completo: ${collaboratorName}`);
    lines.push(`• Cédula de Identidad: ${formatCedula(collaboratorCedula)}`);
    lines.push(`• Código / Carnet: ${collaboratorCard}`);
    lines.push(`• Área / Departamento: ${collaboratorDept}`);
    lines.push('');
    lines.push(`Ha participado satisfactoriamente en las siguientes acciones formativas y programas de desarrollo institucional:`);
    lines.push('');

    coursesInLetter.forEach((course, i) => {
      const hrs = courseHours[course.id] || 2;
      lines.push(`${i + 1}. ${course.title} | Modalidad: ${course.modality} | Fecha: ${formatDateShort(course.date)} | Horas: ${hrs} hrs | Estado: ${course.hasAttended ? 'Completado' : 'Asistido'}`);
    });

    lines.push('');
    lines.push(`TOTAL DE CAPACITACIONES ACREDITADAS: ${coursesInLetter.length}`);
    lines.push(`TOTAL DE HORAS ACADÉMICAS ACUMULADAS: ${totalAccumulatedHours} horas lectivas.`);
    lines.push('');
    if (customNote.trim()) {
      lines.push(`Nota: ${customNote.trim()}`);
      lines.push('');
    }
    lines.push('La presente constancia se expide a solicitud de la parte interesada para los fines institucionales y laborales que estime convenientes.');
    lines.push('');
    lines.push('Atentamente,');
    lines.push('');
    lines.push(`${signerName}`);
    lines.push(`${signerTitle}`);
    lines.push(`${signerDept}`);
    lines.push(`${collaboratorCompany}`);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error('Error al copiar texto:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      
      {/* Estilos específicos de impresión: Aislar únicamente la hoja formal */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #formal-letter-printable, #formal-letter-printable * {
            visibility: visible !important;
          }
          #formal-letter-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 18mm 20mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-slate-100 rounded-3xl w-full max-w-7xl shadow-2xl border border-slate-300 flex flex-col max-h-[95vh] overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#DA291C] border border-red-100 flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>Módulo de Elaboración de Carta Formal</span>
                <span className="px-2 py-0.5 rounded-md bg-red-100 text-[#DA291C] text-[10px] font-black tracking-wider uppercase">
                  Histórico Oficial
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Generador de constancias institucionales de capacitación y horas acumuladas de formación continua.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Copiar texto formal al portapapeles"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              <span>{isCopied ? '¡Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#DA291C] hover:bg-red-700 text-white text-xs font-black shadow-md shadow-red-500/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body (Split View: Config vs Live Preview) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto flex-1 p-4 sm:p-6 gap-6">
          
          {/* COLUMNA IZQUIERDA: PANEL DE CONFIGURACIÓN & EDICIÓN (5 cols) */}
          <div className="lg:col-span-5 space-y-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs overflow-y-auto">
            
            <div className="flex items-center gap-2 text-xs font-black text-[#DA291C] uppercase tracking-wider pb-2 border-b border-slate-100">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Personalización de la Carta</span>
            </div>

            {/* 1. Datos del Colaborador */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#DA291C]" />
                Datos del Colaborador:
              </label>
              <div className="space-y-2">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Nombre Completo:</span>
                  <input
                    type="text"
                    value={collaboratorName}
                    onChange={(e) => setCollaboratorName(e.target.value)}
                    className="w-full mt-0.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">Cédula:</span>
                    <input
                      type="text"
                      value={collaboratorCedula}
                      onChange={(e) => setCollaboratorCedula(e.target.value)}
                      className="w-full mt-0.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#DA291C]"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">No. Carnet:</span>
                    <input
                      type="text"
                      value={collaboratorCard}
                      onChange={(e) => setCollaboratorCard(e.target.value)}
                      className="w-full mt-0.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#DA291C]"
                    />
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Departamento / Posición:</span>
                  <input
                    type="text"
                    value={collaboratorDept}
                    onChange={(e) => setCollaboratorDept(e.target.value)}
                    className="w-full mt-0.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>
              </div>
            </div>

            {/* 2. Destinatario */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#DA291C]" />
                Destinatario de la Carta:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRecipientType('a_quien_interese')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    recipientType === 'a_quien_interese'
                      ? 'bg-red-50 border-[#DA291C] text-[#DA291C]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  A Quien Interese
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientType('gestion_humana')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    recipientType === 'gestion_humana'
                      ? 'bg-red-50 border-[#DA291C] text-[#DA291C]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Gestión Humana
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientType('universidad')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    recipientType === 'universidad'
                      ? 'bg-red-50 border-[#DA291C] text-[#DA291C]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Universidad
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientType('personalizado')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    recipientType === 'personalizado'
                      ? 'bg-red-50 border-[#DA291C] text-[#DA291C]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Personalizado...
                </button>
              </div>
              {recipientType === 'personalizado' && (
                <input
                  type="text"
                  value={customRecipient}
                  onChange={(e) => setCustomRecipient(e.target.value)}
                  placeholder="Ej: Lic. Marcos Peña, Banco Central..."
                  className="w-full mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#DA291C]"
                />
              )}
            </div>

            {/* 3. Fecha y Lugar de Emisión */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Fecha de Emisión:</span>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full mt-0.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#DA291C]"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Ciudad:</span>
                <input
                  type="text"
                  value={issueCity}
                  onChange={(e) => setIssueCity(e.target.value)}
                  className="w-full mt-0.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#DA291C]"
                />
              </div>
            </div>

            {/* 4. Selector de Cursos a Certificar */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#DA291C]" />
                  Cursos a Incluir ({coursesInLetter.length} de {trainingRecords.length}):
                </label>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-[#DA291C] hover:underline font-bold cursor-pointer"
                  >
                    Todos
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-slate-500 hover:underline font-medium cursor-pointer"
                  >
                    Ninguno
                  </button>
                </div>
              </div>

              {/* Lista scrollable de cursos */}
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-2xl p-2 bg-slate-50">
                {trainingRecords.length > 0 ? (
                  trainingRecords.map(rec => {
                    const isChecked = Boolean(selectedCourses[rec.id]);
                    const hrs = courseHours[rec.id] || 2;
                    return (
                      <div 
                        key={rec.id}
                        className={`p-2 rounded-xl border transition-all flex items-center justify-between gap-2 text-xs ${
                          isChecked ? 'bg-white border-red-200 shadow-2xs' : 'bg-slate-100/60 border-slate-200 opacity-60'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setSelectedCourses(prev => ({ ...prev, [rec.id]: e.target.checked }));
                            }}
                            className="rounded text-[#DA291C] focus:ring-[#DA291C]"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate text-[11px]">{rec.title}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              <span>📅 {formatDateShort(rec.date)}</span>
                              <span>• {rec.modality}</span>
                              {rec.hasAttended && (
                                <span className="text-emerald-700 font-bold">✓ Asistió</span>
                              )}
                            </div>
                          </div>
                        </label>

                        {/* Selector de Horas */}
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={hrs}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setCourseHours(prev => ({ ...prev, [rec.id]: val }));
                            }}
                            disabled={!isChecked}
                            className="w-12 px-1.5 py-1 text-center bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 disabled:opacity-50"
                            title="Horas acreditadas"
                          />
                          <span className="text-[10px] font-bold text-slate-400">hrs</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No hay capacitaciones registradas.</p>
                )}
              </div>
            </div>

            {/* 5. Datos del Firmante */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#DA291C]" />
                Firma & Autenticidad:
              </label>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Nombre del Firmante:</span>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full mt-0.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Cargo / Rol:</span>
                  <input
                    type="text"
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    className="w-full mt-0.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#DA291C]"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeStamp}
                      onChange={(e) => setIncludeStamp(e.target.checked)}
                      className="rounded text-[#DA291C] focus:ring-[#DA291C]"
                    />
                    <span>Incluir Sello Digital Claro</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeQr}
                      onChange={(e) => setIncludeQr(e.target.checked)}
                      className="rounded text-[#DA291C] focus:ring-[#DA291C]"
                    />
                    <span>Incluir QR de Validación</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 6. Nota o párrafo adicional */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium">Nota o párrafo adicional (Opcional):</span>
              <textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Ej: Se destaca su excelente desempeño y alto compromiso en el cumplimiento de los estándares corporativos..."
                rows={2}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#DA291C]"
              />
            </div>

          </div>

          {/* COLUMNA DERECHA: PREVISUALIZACIÓN DE DOCUMENTO OFICIAL CLARO (7 cols) */}
          <div className="lg:col-span-7 flex justify-center items-start overflow-y-auto">
            
            {/* Hoja de Documento Membretada (Imprimible) */}
            <div 
              id="formal-letter-printable"
              className="bg-white text-slate-900 w-full max-w-[760px] p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200/90 min-h-[900px] flex flex-col justify-between text-xs font-sans leading-relaxed"
            >
              
              {/* Encabezado Membretado Oficial */}
              <div>
                <div className="flex items-start justify-between border-b-2 border-[#DA291C] pb-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      {/* Logo Claro Tipográfico Institucional */}
                      <span className="text-3xl font-black tracking-tighter text-[#DA291C]">
                        Claro<span className="text-slate-900">.</span>
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-2 border-l border-slate-200">
                        República Dominicana
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase tracking-wider">
                      Dirección de Gestión Humana & Desarrollo Organizacional
                    </p>
                    <p className="text-[9px] text-slate-400">
                      Av. John F. Kennedy No. 54, Santo Domingo • RNC: 101-00157-7 • Tel: (809) 220-1111
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Código de Verificación:</span>
                    <span className="text-[11px] font-mono font-black text-[#DA291C] bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 inline-block mt-0.5">
                      {folioCode}
                    </span>
                  </div>
                </div>

                {/* Fecha y Ciudad */}
                <div className="text-right text-xs text-slate-600 mb-6 font-medium">
                  {issueCity}, <strong className="text-slate-900">{formatDateLong(issueDate)}</strong>
                </div>

                {/* Destinatario */}
                <div className="mb-6 space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Señores:</p>
                  <h3 className="text-sm font-black text-slate-900 tracking-wide">
                    {resolvedRecipient}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-600">Ciudad.-</p>
                </div>

                {/* Título Central */}
                <div className="text-center my-6">
                  <h2 className="text-sm sm:text-base font-black uppercase text-slate-900 tracking-wider underline decoration-[#DA291C] decoration-2 underline-offset-4">
                    CONSTANCIA FORMAL DE HISTORIAL DE CAPACITACIONES
                  </h2>
                </div>

                {/* Cuerpo de la Carta */}
                <div className="space-y-4 text-xs text-slate-700 text-justify leading-relaxed">
                  <p>
                    Por medio de la presente, la <strong>Dirección de Aprendizaje y Desarrollo Organizacional</strong> de <strong>{collaboratorCompany}</strong>, certifica y hace constar que el(la) colaborador(a):
                  </p>

                  {/* Ficha del Colaborador */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 gap-3 text-xs not-italic">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Nombre del Colaborador:</span>
                      <strong className="text-slate-900 font-black text-xs">{collaboratorName}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Documento de Identidad / Cédula:</span>
                      <strong className="text-slate-900 font-black text-xs">{formatCedula(collaboratorCedula)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">No. Carnet / Empleado:</span>
                      <strong className="text-slate-900 font-black text-xs">{collaboratorCard}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Área / Departamento:</span>
                      <strong className="text-slate-900 font-black text-xs">{collaboratorDept}</strong>
                    </div>
                  </div>

                  <p>
                    Ha participado y completado de manera satisfactoria en nuestro plan continuo de formación profesional, habiendo registrado asistencia en las siguientes actividades formativas:
                  </p>

                  {/* Tabla de Cursos */}
                  <div className="overflow-hidden border border-slate-200 rounded-2xl my-4">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-200">
                          <th className="py-2.5 px-3 w-8 text-center">#</th>
                          <th className="py-2.5 px-3">Acción Formativa / Curso</th>
                          <th className="py-2.5 px-2 text-center">Modalidad</th>
                          <th className="py-2.5 px-3">Facilitador / Instructor</th>
                          <th className="py-2.5 px-2 text-center">Fecha</th>
                          <th className="py-2.5 px-2 text-right">Horas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {coursesInLetter.length > 0 ? (
                          coursesInLetter.map((course, idx) => {
                            const hrs = courseHours[course.id] || 2;
                            return (
                              <tr key={course.id} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                                <td className="py-2 px-3 font-bold text-slate-900">{course.title}</td>
                                <td className="py-2 px-2 text-center text-slate-600 font-medium">{course.modality}</td>
                                <td className="py-2 px-3 text-slate-600">{course.instructor}</td>
                                <td className="py-2 px-2 text-center text-slate-600">{formatDateShort(course.date)}</td>
                                <td className="py-2 px-2 text-right font-black text-slate-900">{hrs} hrs</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-4 text-center text-slate-400 italic">
                              No se han seleccionado capacitaciones para esta constancia.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-red-50/80 font-black text-slate-900 border-t-2 border-red-200">
                          <td colSpan={2} className="py-2.5 px-3 text-left uppercase text-[10px]">
                            Total Programas: <span className="text-[#DA291C]">{coursesInLetter.length}</span>
                          </td>
                          <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[10px]">
                            Total Horas Académicas Acumuladas: <span className="text-[#DA291C] text-xs font-black">{totalAccumulatedHours} Horas Lectivas</span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Nota Adicional si existe */}
                  {customNote.trim() && (
                    <p className="italic text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px]">
                      "{customNote.trim()}"
                    </p>
                  )}

                  <p>
                    Se expide la presente constancia a petición de la parte interesada, en la ciudad de Santo Domingo, República Dominicana, para los fines que fueren necesarios.
                  </p>
                </div>
              </div>

              {/* Pie de Página: Firma, Sello Digital y Código QR */}
              <div className="pt-10 mt-6 border-t border-slate-200">
                <div className="flex items-end justify-between gap-6">
                  
                  {/* Bloque de Firma */}
                  <div className="space-y-1">
                    <div className="w-56 border-b-2 border-slate-800 pb-1">
                      <p className="font-serif italic text-slate-600 text-sm pl-2">Carmen Rodríguez M.</p>
                    </div>
                    <p className="font-black text-slate-900 text-xs">{signerName}</p>
                    <p className="text-[10px] font-bold text-slate-600">{signerTitle}</p>
                    <p className="text-[9px] text-slate-500">{signerDept}</p>
                    <p className="text-[9px] font-bold text-[#DA291C]">{collaboratorCompany}</p>
                  </div>

                  {/* Sello Digital Claro */}
                  {includeStamp && (
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#DA291C]/50 flex flex-col items-center justify-center text-center p-1 rotate-[-8deg] bg-red-50/20 text-[#DA291C] select-none">
                      <ShieldCheck className="w-6 h-6 stroke-1" />
                      <span className="text-[7.5px] font-black uppercase tracking-tighter mt-0.5">SELLO DIGITAL</span>
                      <span className="text-[6.5px] font-bold uppercase tracking-widest text-slate-600">CAPACITACIÓN</span>
                      <span className="text-[6px] text-slate-400 font-mono">{todayDateObj.getFullYear()}</span>
                    </div>
                  )}

                  {/* Código QR de Validación Oficial */}
                  {includeQr && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="p-1.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                        <QRCodeSVG
                          value={`https://capacitacion.claro.com.do/validar?code=${folioCode}&cedula=${collaboratorCedula}`}
                          size={64}
                          level="M"
                        />
                      </div>
                      <span className="text-[7.5px] font-mono text-slate-400 font-bold uppercase tracking-tighter">
                        Verificar Autenticidad
                      </span>
                    </div>
                  )}

                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
