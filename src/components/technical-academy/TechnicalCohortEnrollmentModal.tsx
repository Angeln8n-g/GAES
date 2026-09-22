import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  UploadCloud,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  FileText,
  UserMinus,
  Check,
  Building2,
  Calendar,
  Clock,
  MapPin,
  HelpCircle,
  Filter,
  Award
} from 'lucide-react';
import {
  TechnicalAcademyCohort,
  TechnicalCohortEnrolledParticipant,
  Participant
} from '../../types';
import { apiService } from '../../services/api';
import {
  exportCohortParticipantsToExcel,
  downloadCohortParticipantsTemplateExcel,
  parseCohortParticipantsExcel
} from '../../utils/excelUtils';
import { formatCedula, formatDateShort } from '../../utils/formatters';
import { AccessibleModal } from '../common/AccessibleModal';

interface TechnicalCohortEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cohort: TechnicalAcademyCohort | null;
  allParticipants: Participant[];
  isAdminOrSuper?: boolean;
  canGrade?: boolean;
  onSuccess: () => void;
}

type TabType = 'enrolled' | 'upload_excel' | 'paste_list' | 'browse_catalog';

export const TechnicalCohortEnrollmentModal: React.FC<TechnicalCohortEnrollmentModalProps> = ({
  isOpen,
  onClose,
  cohort,
  allParticipants,
  isAdminOrSuper = false,
  canGrade = false,
  onSuccess
}) => {
  if (!isOpen || !cohort) return null;

  const hasGradingPermission = isAdminOrSuper || canGrade;

  const [activeTab, setActiveTab] = useState<TabType>('enrolled');
  const [loading, setLoading] = useState<boolean>(true);
  const [enrolledParticipants, setEnrolledParticipants] = useState<TechnicalCohortEnrolledParticipant[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Calificación rápida individual (Tab 1)
  const [gradingParticipant, setGradingParticipant] = useState<TechnicalCohortEnrolledParticipant | null>(null);
  const [gradingScore, setGradingScore] = useState<string>('');
  const [gradingStatus, setGradingStatus] = useState<'passed' | 'failed' | 'pending'>('pending');
  const [gradingFeedback, setGradingFeedback] = useState<string>('');
  const [isSubmittingGrade, setIsSubmittingGrade] = useState<boolean>(false);

  // Tab 1: Lista de Matriculados
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [conditionFilter, setConditionFilter] = useState<'ALL' | 'APROBADO' | 'EN RIESGO' | 'REPROBADO'>('ALL');
  const [quickAddCard, setQuickAddCard] = useState<string>('');
  const [isEnrollingSingle, setIsEnrollingSingle] = useState<boolean>(false);
  const [isRemovingCard, setIsRemovingCard] = useState<string | null>(null);

  // Tab 2: Carga Masiva Excel
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState<boolean>(false);
  const [excelPreview, setExcelPreview] = useState<{
    matched: Array<{ card: string; name: string; email: string; cedula?: string; department?: string; score?: number; matchedBy: 'card' | 'cedula' | 'email' }>;
    unmatched: Array<{ rawValue: string; reason: string; rowNumber: number }>;
    duplicatesInFile: number;
  } | null>(null);
  const [isSubmittingExcel, setIsSubmittingExcel] = useState<boolean>(false);

  // Tab 3: Pegar Lista
  const [pastedText, setPastedText] = useState<string>('');
  const [parsedPastedPreview, setParsedPastedPreview] = useState<{
    matched: Participant[];
    unmatched: string[];
  } | null>(null);
  const [isSubmittingPaste, setIsSubmittingPaste] = useState<boolean>(false);

  // Tab 4: Seleccionar del Padrón
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [selectedCatalogCards, setSelectedCatalogCards] = useState<Set<string>>(new Set());
  const [isSubmittingCatalog, setIsSubmittingCatalog] = useState<boolean>(false);

  // Cargar lista de matriculados
  const fetchEnrolledList = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiService.getCohortParticipants(cohort.id);
      setEnrolledParticipants(data.participants || []);
    } catch (err: any) {
      console.error('Error al cargar participantes matriculados:', err);
      setErrorMsg(err.message || 'Error al cargar la lista de participantes');
    } finally {
      setLoading(false);
    }
  };

  const openGradingModal = (p: TechnicalCohortEnrolledParticipant) => {
    setGradingParticipant(p);
    setGradingScore(p.score !== undefined && p.score !== null ? String(p.score) : '');
    setGradingStatus(
      p.academicStatus ||
      (p.score !== undefined && p.score !== null ? (p.score >= 70 ? 'passed' : 'failed') : 'pending')
    );
    setGradingFeedback(p.feedback || '');
  };

  const handleSaveSingleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingParticipant || gradingScore === '') return;

    setIsSubmittingGrade(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const numScore = parseFloat(gradingScore);
      await apiService.saveCohortGrades(cohort.id, {
        grades: [
          {
            participantCard: gradingParticipant.card,
            score: isNaN(numScore) ? null : numScore,
            academicStatus: gradingStatus,
            feedback: gradingFeedback.trim() || undefined
          }
        ]
      });

      setSuccessMsg(`Calificación guardada exitosamente para ${gradingParticipant.name}.`);
      setGradingParticipant(null);
      await fetchEnrolledList();
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar la calificación.');
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  useEffect(() => {
    if (cohort) {
      fetchEnrolledList();
      // Reset state
      setActiveTab('enrolled');
      setSearchQuery('');
      setConditionFilter('ALL');
      setExcelPreview(null);
      setSelectedFileName(null);
      setPastedText('');
      setParsedPastedPreview(null);
      setSelectedCatalogCards(new Set());
      setSuccessMsg(null);
    }
  }, [cohort?.id]);

  // Set de carnets ya matriculados
  const enrolledCardSet = useMemo(() => {
    return new Set(enrolledParticipants.map(p => p.card.trim().toLowerCase()));
  }, [enrolledParticipants]);

  // Departamentos únicos para filtro
  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    allParticipants.forEach(p => {
      if (p.department && p.department.trim()) {
        depts.add(p.department.trim());
      }
    });
    return Array.from(depts).sort();
  }, [allParticipants]);

  // Filtrado de matriculados (Tab 1)
  const filteredEnrolled = useMemo(() => {
    return enrolledParticipants.filter(p => {
      const matchesSearch =
        searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.card.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.cedula && p.cedula.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCondition =
        conditionFilter === 'ALL' || p.academicCondition === conditionFilter;

      return matchesSearch && matchesCondition;
    });
  }, [enrolledParticipants, searchQuery, conditionFilter]);

  // Matricular participante individual rápido (Tab 1)
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddCard.trim() || !isAdminOrSuper) return;

    setIsEnrollingSingle(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiService.enrollCohortParticipants(cohort.id, {
        identifiers: [quickAddCard.trim()]
      });

      if (res.newlyEnrolled > 0) {
        setSuccessMsg(`Colaborador enrolado correctamente.`);
        setQuickAddCard('');
        await fetchEnrolledList();
        onSuccess();
      } else {
        setErrorMsg('El participante ya se encuentra matriculado en esta cohorte.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo matricular al participante.');
    } finally {
      setIsEnrollingSingle(false);
    }
  };

  // Desmatricular participante (Tab 1)
  const handleRemoveParticipant = async (p: TechnicalCohortEnrolledParticipant) => {
    if (!isAdminOrSuper) return;
    const confirm = window.confirm(
      `¿Está seguro de desmatricular a "${p.name}" (Carnet ${p.card}) de esta cohorte técnica?\n\nEsta acción removerá también cualquier registro de asistencia asentado en este ciclo.`
    );
    if (!confirm) return;

    setIsRemovingCard(p.card);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await apiService.unenrollCohortParticipant(cohort.id, p.card);
      setSuccessMsg(`"${p.name}" desmatriculado exitosamente.`);
      await fetchEnrolledList();
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al desmatricular al participante.');
    } finally {
      setIsRemovingCard(null);
    }
  };

  // Procesar archivo Excel (Tab 2)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setIsParsingExcel(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const parsed = await parseCohortParticipantsExcel(file, allParticipants);
      setExcelPreview(parsed);
    } catch (err: any) {
      console.error('Error al parsear archivo Excel:', err);
      setErrorMsg(err.message || 'Error al procesar el archivo Excel. Verifique el formato.');
      setExcelPreview(null);
    } finally {
      setIsParsingExcel(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirmar carga masiva Excel (Tab 2)
  const handleConfirmExcelEnrollment = async () => {
    if (!excelPreview || !isAdminOrSuper) return;

    // Filtrar los que no están ya matriculados
    const newCardsToEnroll = excelPreview.matched
      .filter(m => !enrolledCardSet.has(m.card.trim().toLowerCase()))
      .map(m => m.card);

    if (newCardsToEnroll.length === 0) {
      setErrorMsg('Todos los participantes detectados ya están matriculados en esta cohorte.');
      return;
    }

    setIsSubmittingExcel(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiService.enrollCohortParticipants(cohort.id, {
        participantCards: newCardsToEnroll
      });

      // Si el archivo contenía calificaciones, guardarlas
      const gradesToSave = excelPreview.matched
        .filter(m => m.score !== undefined && m.score !== null)
        .map(m => ({
          participantCard: m.card,
          score: m.score,
          academicStatus: (m.score! >= 70 ? 'passed' : 'failed') as 'passed' | 'failed'
        }));

      if (gradesToSave.length > 0) {
        try {
          await apiService.saveCohortGrades(cohort.id, { grades: gradesToSave });
        } catch (gradeErr) {
          console.error('Error guardando notas desde excel:', gradeErr);
        }
      }

      setSuccessMsg(
        `¡Éxito! Se han matriculado ${res.newlyEnrolled} participantes a la cohorte.${
          gradesToSave.length > 0 ? ` Se registraron ${gradesToSave.length} calificaciones.` : ''
        }`
      );
      setExcelPreview(null);
      setSelectedFileName(null);
      await fetchEnrolledList();
      setActiveTab('enrolled');
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la matrícula masiva.');
    } finally {
      setIsSubmittingExcel(false);
    }
  };

  // Validar texto pegado (Tab 3)
  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;

    const rawTokens = pastedText
      .split(/[\n,;\t]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const byCard = new Map<string, Participant>();
    const byCedula = new Map<string, Participant>();
    const byEmail = new Map<string, Participant>();

    allParticipants.forEach(p => {
      if (p.card) byCard.set(p.card.trim().toLowerCase(), p);
      if (p.cedula) {
        const clean = p.cedula.replace(/[^0-9kK]/g, '').toLowerCase();
        if (clean) byCedula.set(clean, p);
      }
      if (p.email) byEmail.set(p.email.trim().toLowerCase(), p);
    });

    const matched: Participant[] = [];
    const unmatched: string[] = [];
    const seen = new Set<string>();

    rawTokens.forEach(token => {
      const lower = token.toLowerCase();
      const cleanCedula = token.replace(/[^0-9kK]/g, '').toLowerCase();

      let found: Participant | undefined;
      if (byCard.has(lower)) {
        found = byCard.get(lower);
      } else if (cleanCedula && byCedula.has(cleanCedula)) {
        found = byCedula.get(cleanCedula);
      } else if (byEmail.has(lower)) {
        found = byEmail.get(lower);
      }

      if (found) {
        if (!seen.has(found.card)) {
          seen.add(found.card);
          matched.push(found);
        }
      } else {
        if (!unmatched.includes(token)) {
          unmatched.push(token);
        }
      }
    });

    setParsedPastedPreview({ matched, unmatched });
  };

  // Confirmar matrícula de lista pegada (Tab 3)
  const handleConfirmPasteEnrollment = async () => {
    if (!parsedPastedPreview || !isAdminOrSuper) return;

    const cardsToEnroll = parsedPastedPreview.matched
      .filter(m => !enrolledCardSet.has(m.card.trim().toLowerCase()))
      .map(m => m.card);

    if (cardsToEnroll.length === 0) {
      setErrorMsg('Todos los participantes válidos ya se encuentran matriculados.');
      return;
    }

    setIsSubmittingPaste(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiService.enrollCohortParticipants(cohort.id, {
        participantCards: cardsToEnroll
      });

      setSuccessMsg(`¡Éxito! Se han matriculado ${res.newlyEnrolled} participantes.`);
      setPastedText('');
      setParsedPastedPreview(null);
      await fetchEnrolledList();
      setActiveTab('enrolled');
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enrolar participantes pegados.');
    } finally {
      setIsSubmittingPaste(false);
    }
  };

  // Filtrado de Padrón para selección manual (Tab 4)
  const filteredCatalog = useMemo(() => {
    return allParticipants.filter(p => {
      const matchesSearch =
        catalogSearch === '' ||
        p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        p.card.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        p.email.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (p.cedula && p.cedula.toLowerCase().includes(catalogSearch.toLowerCase()));

      const matchesDept =
        departmentFilter === 'ALL' || (p.department && p.department === departmentFilter);

      return matchesSearch && matchesDept;
    });
  }, [allParticipants, catalogSearch, departmentFilter]);

  const toggleCatalogSelection = (card: string) => {
    const next = new Set(selectedCatalogCards);
    if (next.has(card)) {
      next.delete(card);
    } else {
      next.add(card);
    }
    setSelectedCatalogCards(next);
  };

  const handleSelectAllVisibleCatalog = () => {
    const next = new Set(selectedCatalogCards);
    filteredCatalog.forEach(p => {
      if (!enrolledCardSet.has(p.card.trim().toLowerCase())) {
        next.add(p.card);
      }
    });
    setSelectedCatalogCards(next);
  };

  const handleDeselectAllCatalog = () => {
    setSelectedCatalogCards(new Set());
  };

  const handleConfirmCatalogEnrollment = async () => {
    if (selectedCatalogCards.size === 0 || !isAdminOrSuper) return;

    setIsSubmittingCatalog(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const cards = Array.from(selectedCatalogCards);
      const res = await apiService.enrollCohortParticipants(cohort.id, {
        participantCards: cards
      });

      setSuccessMsg(`¡Éxito! ${res.newlyEnrolled} colaborador(es) matriculado(s) desde el padrón.`);
      setSelectedCatalogCards(new Set());
      await fetchEnrolledList();
      setActiveTab('enrolled');
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enrolar desde el padrón.');
    } finally {
      setIsSubmittingCatalog(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={`Gestión de Participantes: ${cohort.courseTitle}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera del Modal */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-50 dark:bg-red-950/40 text-[#DA291C] dark:text-red-400 border border-red-100 dark:border-red-900/50">
                  Academia Técnica
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {cohort.groupName || 'Sin Grupo Asignado'}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {cohort.startDate} al {cohort.endDate}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                Gestión de Participantes: {cohort.courseTitle}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-1">
                <span>
                  <strong>Facilitador:</strong> {cohort.facilitatorName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {cohort.dailyTime || '08:00 AM - 12:00 PM'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {cohort.location || 'Laboratorio Técnico'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Badge de Cupo / Capacidad */}
              <div className="hidden sm:flex flex-col items-end px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Matriculados / Cupo
                </span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                  <span className={enrolledParticipants.length > cohort.capacity ? 'text-[#DA291C]' : 'text-emerald-700 dark:text-emerald-400'}>
                    {enrolledParticipants.length}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-normal"> / {cohort.capacity}</span>
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Barra de Pestañas */}
          <div className="flex items-center gap-2 mt-5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('enrolled')}
              className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'enrolled'
                  ? 'border-[#DA291C] text-[#DA291C]'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Lista de Matriculados
              <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'enrolled' ? 'bg-red-100 dark:bg-red-950/60 text-[#DA291C] dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {enrolledParticipants.length}
              </span>
            </button>

            {isAdminOrSuper && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload_excel')}
                  className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'upload_excel'
                      ? 'border-[#DA291C] text-[#DA291C]'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Carga Masiva (Excel / CSV)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('paste_list')}
                  className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'paste_list'
                      ? 'border-[#DA291C] text-[#DA291C]'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Pegar Lista Rápida
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('browse_catalog')}
                  className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'browse_catalog'
                      ? 'border-[#DA291C] text-[#DA291C]'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  Padrón de Colaboradores
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mensajes de Alerta / Estado */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center gap-3 text-rose-800 dark:text-rose-300 text-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span className="flex-1 font-medium">{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-bold text-xs"
            >
              Cerrar
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span className="flex-1 font-medium">{successMsg}</span>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-500 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold text-xs"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Cuerpo del Modal con scroll */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950/40">
          {/* ======================================================== */}
          {/* PESTAÑA 1: LISTA DE MATRICULADOS */}
          {/* ======================================================== */}
          {activeTab === 'enrolled' && (
            <div className="space-y-4">
              {/* Barra de Acciones y Filtros */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, carnet, cédula o correo..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DA291C] focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <select
                    value={conditionFilter}
                    onChange={e => setConditionFilter(e.target.value as any)}
                    className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DA291C] text-slate-700 dark:text-slate-200 font-medium"
                  >
                    <option value="ALL">Todas las condiciones</option>
                    <option value="APROBADO">Aprobados (&gt;= 80%)</option>
                    <option value="EN RIESGO">En Riesgo (50% - 79%)</option>
                    <option value="REPROBADO">Reprobados (&lt; 50%)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => exportCohortParticipantsToExcel(cohort, enrolledParticipants)}
                    disabled={enrolledParticipants.length === 0}
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Exportar listado a Excel"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Exportar Excel (.xlsx)
                  </button>

                  <button
                    type="button"
                    onClick={fetchEnrolledList}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    title="Recargar lista"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Matricular participante individual rápido (Solo Admin) */}
              {isAdminOrSuper && (
                <form
                  onSubmit={handleQuickAdd}
                  className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <UserPlus className="w-4 h-4 text-[#DA291C]" />
                    Matrícula Rápida:
                  </div>
                  <input
                    type="text"
                    placeholder="Ingresar Carnet, Cédula o Correo del colaborador..."
                    value={quickAddCard}
                    onChange={e => setQuickAddCard(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DA291C] focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={!quickAddCard.trim() || isEnrollingSingle}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[#DA291C] rounded-xl hover:bg-[#b82216] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {isEnrollingSingle ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    Matricular
                  </button>
                </form>
              )}

              {/* Tabla de Participantes */}
              {loading ? (
                <div className="py-16 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-[#DA291C]" />
                  <p className="text-sm font-medium">Cargando participantes matriculados...</p>
                </div>
              ) : filteredEnrolled.length === 0 ? (
                <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
                  <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">
                    {searchQuery || conditionFilter !== 'ALL'
                      ? 'No hay participantes que coincidan con la búsqueda'
                      : 'No hay participantes matriculados en esta cohorte'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                    {searchQuery || conditionFilter !== 'ALL'
                      ? 'Intenta ajustar los términos de búsqueda o restablecer los filtros.'
                      : 'Puedes matricular colaboradores cargando una lista de Excel, pegando una lista de carnets o seleccionando directamente del padrón.'}
                  </p>
                  {isAdminOrSuper && !searchQuery && conditionFilter === 'ALL' && (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('upload_excel')}
                        className="px-3.5 py-2 text-xs font-bold text-white bg-[#DA291C] rounded-xl hover:bg-[#b82216] transition-colors flex items-center gap-1.5"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Cargar Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('browse_catalog')}
                        className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Seleccionar del Padrón
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 uppercase font-black tracking-wider text-[11px]">
                          <th className="py-3 px-4">#</th>
                          <th className="py-3 px-4">Colaborador / Técnico</th>
                          <th className="py-3 px-4">Carnet</th>
                          <th className="py-3 px-4">Cédula</th>
                          <th className="py-3 px-4">Departamento</th>
                          <th className="py-3 px-4 text-center">Asistencia Diaria</th>
                          <th className="py-3 px-4 text-center">Calificación</th>
                          <th className="py-3 px-4 text-center">Condición</th>
                          {(isAdminOrSuper || hasGradingPermission) && <th className="py-3 px-4 text-right">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {filteredEnrolled.map((p, idx) => (
                          <tr key={p.card} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">{p.email}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[11px]">
                                {p.card}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                              {p.cedula ? formatCedula(p.cedula) : '—'}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                              {p.department || '—'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                  {p.attendedDays} / {p.totalDays} días ({p.attendancePercentage}%)
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                  {p.totalHoursEarned} hrs acreditadas
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {p.score !== undefined && p.score !== null ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="font-black text-slate-900 dark:text-white text-xs">
                                    {p.score} / 100
                                  </span>
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${
                                      p.academicStatus === 'passed' || (!p.academicStatus && p.score >= 70)
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                                        : p.academicStatus === 'failed' || (!p.academicStatus && p.score < 70)
                                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
                                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
                                    }`}
                                  >
                                    {p.academicStatus === 'passed' || (!p.academicStatus && p.score >= 70)
                                      ? 'Aprobado'
                                      : p.academicStatus === 'failed' || (!p.academicStatus && p.score < 70)
                                      ? 'Reprobado'
                                      : 'Pendiente'}
                                  </span>
                                  {p.feedback && (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[130px] mt-0.5" title={p.feedback}>
                                      💬 {p.feedback}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-500 dark:text-slate-400 italic text-[11px]">Sin calificar</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border ${
                                  p.academicCondition === 'APROBADO'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                                    : p.academicCondition === 'EN RIESGO'
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
                                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
                                }`}
                              >
                                {p.academicCondition}
                              </span>
                            </td>
                            {(isAdminOrSuper || hasGradingPermission) && (
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {hasGradingPermission && (
                                    <button
                                      type="button"
                                      onClick={() => openGradingModal(p)}
                                      className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                                      title={`Calificar o editar notas de ${p.name}`}
                                    >
                                      <Award className="w-4 h-4" />
                                      <span className="hidden xl:inline">Calificar</span>
                                    </button>
                                  )}
                                  {isAdminOrSuper && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveParticipant(p)}
                                      disabled={isRemovingCard === p.card}
                                      className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                                      title={`Desmatricular a ${p.name}`}
                                    >
                                      {isRemovingCard === p.card ? (
                                        <RefreshCw className="w-4 h-4 animate-spin text-rose-600 dark:text-rose-400" />
                                      ) : (
                                        <Trash2 className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* PESTAÑA 2: CARGA MASIVA EXCEL */}
          {/* ======================================================== */}
          {activeTab === 'upload_excel' && isAdminOrSuper && (
            <div className="space-y-5">
              {/* Tarjeta de Instrucciones y Plantilla */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                    <FileSpreadsheet className="w-4 h-4 text-[#DA291C]" />
                    Carga Masiva de Participantes desde Archivo
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Sube un archivo de Excel (.xlsx, .xls) o CSV con las tarjetas, cédulas o correos de los técnicos.
                    El sistema identificará a los colaboradores automáticamente en el padrón.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadCohortParticipantsTemplateExcel}
                  className="px-4 py-2 text-xs font-bold text-[#DA291C] dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors flex items-center gap-2 shrink-0 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  Descargar Plantilla Oficial (.xlsx)
                </button>
              </div>

              {/* Zona de Arrastre de Archivo */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#DA291C] dark:hover:border-[#DA291C] bg-white dark:bg-slate-900 rounded-3xl p-8 text-center cursor-pointer transition-all hover:bg-red-50/10 dark:hover:bg-red-950/10 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <UploadCloud className="w-12 h-12 mx-auto mb-3 text-slate-400 group-hover:text-[#DA291C] group-hover:scale-110 transition-all" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                  {selectedFileName ? selectedFileName : 'Haz clic para seleccionar o arrastra el archivo aquí'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Formatos compatibles: .xlsx, .xls, .csv (Máximo 5MB)
                </p>
              </div>

              {/* Vista Previa del Archivo */}
              {isParsingExcel && (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-[#DA291C]" />
                  <p className="text-xs font-medium">Validando identificadores contra el padrón...</p>
                </div>
              )}

              {excelPreview && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-fade-in shadow-sm">
                  {/* Resumen de Métrica */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
                      <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Listos p/ Matricular</div>
                      <div className="text-xl font-black text-emerald-800 dark:text-emerald-300">
                        {excelPreview.matched.filter(m => !enrolledCardSet.has(m.card.trim().toLowerCase())).length}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
                      <div className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400">Ya Matriculados</div>
                      <div className="text-xl font-black text-blue-800 dark:text-blue-300">
                        {excelPreview.matched.filter(m => enrolledCardSet.has(m.card.trim().toLowerCase())).length}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
                      <div className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400">No Encontrados</div>
                      <div className="text-xl font-black text-rose-800 dark:text-rose-300">
                        {excelPreview.unmatched.length}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300">Duplicados en Archivo</div>
                      <div className="text-xl font-black text-slate-800 dark:text-white">
                        {excelPreview.duplicatesInFile}
                      </div>
                    </div>
                  </div>

                  {/* Tabla de Coincidencias */}
                  <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 uppercase font-black text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Estado</th>
                          <th className="py-2.5 px-3">Colaborador</th>
                          <th className="py-2.5 px-3">Carnet</th>
                          <th className="py-2.5 px-3">Departamento</th>
                          <th className="py-2.5 px-3">Identificado Por</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {excelPreview.matched.map(m => {
                          const isAlready = enrolledCardSet.has(m.card.trim().toLowerCase());
                          return (
                            <tr key={m.card} className={isAlready ? 'bg-slate-50/50 dark:bg-slate-800/40' : ''}>
                              <td className="py-2 px-3">
                                {isAlready ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                                    Ya Matriculado
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                                    Listo
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{m.name}</td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">{m.card}</td>
                              <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{m.department || '—'}</td>
                              <td className="py-2 px-3 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold">
                                {m.matchedBy}
                              </td>
                            </tr>
                          );
                        })}

                        {excelPreview.unmatched.map((u, i) => (
                          <tr key={`unmatched-${i}`} className="bg-rose-50/40 dark:bg-rose-950/20">
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                                No Encontrado
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-rose-800 dark:text-rose-300 font-bold" colSpan={2}>
                              {u.rawValue}
                            </td>
                            <td className="py-2 px-3 text-rose-600 dark:text-rose-400 text-[11px]" colSpan={2}>
                              Fila {u.rowNumber}: {u.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Acciones de Confirmación */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setExcelPreview(null);
                        setSelectedFileName(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmExcelEnrollment}
                      disabled={
                        isSubmittingExcel ||
                        excelPreview.matched.filter(m => !enrolledCardSet.has(m.card.trim().toLowerCase())).length === 0
                      }
                      className="px-5 py-2.5 text-xs font-bold text-white bg-[#DA291C] hover:bg-[#b82216] rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmittingExcel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Confirmar Matrícula (
                      {excelPreview.matched.filter(m => !enrolledCardSet.has(m.card.trim().toLowerCase())).length} Técnicos
                      )
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* PESTAÑA 3: PEGAR LISTA RÁPIDA */}
          {/* ======================================================== */}
          {activeTab === 'paste_list' && isAdminOrSuper && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#DA291C]" />
                  Pegar Lista de Carnets, Cédulas o Correos
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                  Pega un listado de identificadores separados por saltos de línea, comas o espacios.
                  El sistema buscará los registros coincidentes en el padrón general.
                </p>

                <textarea
                  rows={6}
                  placeholder={`Ejemplo:\n2010\n2012\n001-0876543-2\nluis.almazan@empresa.com`}
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  className="w-full p-3 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DA291C] focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-y"
                />

                <div className="flex items-center justify-between gap-3 mt-3">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Puedes pegar desde una columna de Excel directamente.
                  </span>
                  <button
                    type="button"
                    onClick={handleParsePastedText}
                    disabled={!pastedText.trim()}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#DA291C] rounded-xl hover:bg-[#b82216] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Validar Identificadores
                  </button>
                </div>
              </div>

              {/* Vista Previa de la Lista Pegada */}
              {parsedPastedPreview && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                      Resultados de la Validación:
                    </h4>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/50">
                      {parsedPastedPreview.matched.filter(m => !enrolledCardSet.has(m.card.trim().toLowerCase())).length} Válidos Nuevos
                    </span>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-black text-slate-700 dark:text-slate-300">
                        <tr>
                          <th className="py-2 px-3">Estado</th>
                          <th className="py-2 px-3">Nombre</th>
                          <th className="py-2 px-3">Carnet</th>
                          <th className="py-2 px-3">Correo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {parsedPastedPreview.matched.map(p => {
                          const isAlready = enrolledCardSet.has(p.card.trim().toLowerCase());
                          return (
                            <tr key={p.card} className={isAlready ? 'bg-slate-50/50 dark:bg-slate-800/40' : ''}>
                              <td className="py-2 px-3">
                                {isAlready ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                                    Ya Matriculado
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                                    Listo
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{p.name}</td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">{p.card}</td>
                              <td className="py-2 px-3 text-slate-500 dark:text-slate-400">{p.email}</td>
                            </tr>
                          );
                        })}

                        {parsedPastedPreview.unmatched.map((raw, i) => (
                          <tr key={`unmatched-paste-${i}`} className="bg-rose-50/40 dark:bg-rose-950/20">
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                                No Identificado
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-rose-800 dark:text-rose-300 font-bold" colSpan={3}>
                              {raw}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setParsedPastedPreview(null)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Descartar
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmPasteEnrollment}
                      disabled={
                        isSubmittingPaste ||
                        parsedPastedPreview.matched.filter(m => !enrolledCardSet.has(m.card.trim().toLowerCase())).length === 0
                      }
                      className="px-5 py-2 text-xs font-bold text-white bg-[#DA291C] hover:bg-[#b82216] rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSubmittingPaste ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Matricular Seleccionados (
                      {parsedPastedPreview.matched.filter(m => !enrolledCardSet.has(m.card.trim().toLowerCase())).length}
                      )
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* PESTAÑA 4: PADRÓN DE COLABORADORES */}
          {/* ======================================================== */}
          {activeTab === 'browse_catalog' && isAdminOrSuper && (
            <div className="space-y-4">
              {/* Barra de Filtros y Selección */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, carnet, cédula..."
                      value={catalogSearch}
                      onChange={e => setCatalogSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DA291C] focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <select
                    value={departmentFilter}
                    onChange={e => setDepartmentFilter(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DA291C] text-slate-700 dark:text-slate-200 font-medium"
                  >
                    <option value="ALL">Todos los Departamentos</option>
                    {uniqueDepartments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSelectAllVisibleCatalog}
                    className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    Seleccionar Visibles
                  </button>

                  {selectedCatalogCards.size > 0 && (
                    <button
                      type="button"
                      onClick={handleDeselectAllCatalog}
                      className="px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors"
                    >
                      Deseleccionar
                    </button>
                  )}
                </div>
              </div>

              {/* Botón Flotante / Barra de Confirmación */}
              {selectedCatalogCards.size > 0 && (
                <div className="bg-[#DA291C] text-white px-5 py-3 rounded-2xl flex items-center justify-between shadow-lg animate-fade-in">
                  <div className="text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {selectedCatalogCards.size} técnico(s) seleccionado(s) para matricular
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmCatalogEnrollment}
                    disabled={isSubmittingCatalog}
                    className="px-4 py-1.5 text-xs font-black text-[#DA291C] bg-white hover:bg-slate-50 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmittingCatalog ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    Matricular Ahora
                  </button>
                </div>
              )}

              {/* Lista del Padrón */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-black text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="py-2.5 px-4 w-12 text-center">Sel.</th>
                        <th className="py-2.5 px-4">Colaborador</th>
                        <th className="py-2.5 px-4">Carnet</th>
                        <th className="py-2.5 px-4">Cédula</th>
                        <th className="py-2.5 px-4">Departamento</th>
                        <th className="py-2.5 px-4 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredCatalog.slice(0, 100).map(p => {
                        const isEnrolled = enrolledCardSet.has(p.card.trim().toLowerCase());
                        const isSelected = selectedCatalogCards.has(p.card);

                        return (
                          <tr
                            key={p.card}
                            onClick={() => !isEnrolled && toggleCatalogSelection(p.card)}
                            className={`transition-colors ${
                              isEnrolled
                                ? 'bg-slate-50/70 dark:bg-slate-800/40 opacity-60 cursor-not-allowed'
                                : isSelected
                                ? 'bg-red-50/50 dark:bg-red-950/30 cursor-pointer'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer'
                            }`}
                          >
                            <td className="py-2.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isEnrolled}
                                onChange={() => toggleCatalogSelection(p.card)}
                                className="w-4 h-4 text-[#DA291C] rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-[#DA291C] cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">{p.email}</div>
                            </td>
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                              {p.card}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                              {p.cedula ? formatCedula(p.cedula) : '—'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                              {p.department || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {isEnrolled ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                                  Ya Matriculado
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  Disponible
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredCatalog.length > 100 && (
                  <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800">
                    Mostrando los primeros 100 resultados de {filteredCatalog.length}. Usa el buscador para filtrar más específicamente.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-400" />
            Total Matriculados: <strong className="text-slate-800 dark:text-white">{enrolledParticipants.length}</strong> colaboradores
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>

        {/* Sub-modal: Calificación Rápida Individual */}
        <AccessibleModal
          isOpen={Boolean(gradingParticipant)}
          onClose={() => setGradingParticipant(null)}
          ariaLabel={`Calificar a ${gradingParticipant?.name || 'Participante'}`}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
        >
          {gradingParticipant && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 animate-scale-up" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#DA291C] dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 rounded-full border border-red-100 dark:border-red-900/50">
                    Academia Técnica • Calificación
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {gradingParticipant.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Carnet: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{gradingParticipant.card}</span> • {gradingParticipant.department || 'Sin Depto'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGradingParticipant(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSingleGrade} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Calificación / Nota (0 a 100 pts)
                    </label>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Aprobación: &gt;= 70 pts
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    required
                    value={gradingScore}
                    onChange={e => {
                      const val = e.target.value;
                      setGradingScore(val);
                      if (val !== '') {
                        const num = parseFloat(val);
                        if (!isNaN(num)) {
                          setGradingStatus(num >= 70 ? 'passed' : 'failed');
                        }
                      }
                    }}
                    placeholder="Ej: 90"
                    className="w-full px-3.5 py-2.5 text-base font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DA291C] focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estado Académico
                  </label>
                  <select
                    value={gradingStatus}
                    onChange={e => setGradingStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DA291C] text-slate-800 dark:text-slate-200"
                  >
                    <option value="passed">Aprobado (Cumple competencias)</option>
                    <option value="failed">Reprobado (No alcanza nota mínima)</option>
                    <option value="pending">Pendiente de evaluación</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Retroalimentación / Observaciones Técnicas (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={gradingFeedback}
                    onChange={e => setGradingFeedback(e.target.value)}
                    placeholder="Observaciones sobre desempeño práctico, destrezas técnicas, etc..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DA291C] focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setGradingParticipant(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingGrade || gradingScore === ''}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#DA291C] hover:bg-[#b82216] rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmittingGrade ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Guardar Calificación
                  </button>
                </div>
              </form>
            </div>
          )}
        </AccessibleModal>
      </div>
    </AccessibleModal>
  );
};
