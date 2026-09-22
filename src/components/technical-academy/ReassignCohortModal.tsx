import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserCheck, 
  Users, 
  ArrowRightLeft, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  User,
  RotateCw
} from 'lucide-react';
import { TechnicalAcademyCohort, ParticipantGroup, UserAccount } from '../../types';
import { apiService } from '../../services/api';
import { AccessibleModal } from '../common/AccessibleModal';

interface ReassignCohortModalProps {
  isOpen: boolean;
  onClose: () => void;
  cohort: TechnicalAcademyCohort | null;
  groups: ParticipantGroup[];
  users: UserAccount[];
  isAdminOrSuper?: boolean;
  onSuccess: () => void;
}

export const ReassignCohortModal: React.FC<ReassignCohortModalProps> = ({
  isOpen,
  onClose,
  cohort,
  groups,
  users,
  isAdminOrSuper = false,
  onSuccess
}) => {
  if (!isOpen || !cohort || !isAdminOrSuper) return null;

  const [selectedGroupId, setSelectedGroupId] = useState<string>(cohort.groupId || '');
  const [selectedFacilitatorId, setSelectedFacilitatorId] = useState<string>(cohort.facilitatorId || '');
  const [customFacilitatorName, setCustomFacilitatorName] = useState<string>('');
  const [customFacilitatorEmail, setCustomFacilitatorEmail] = useState<string>('');
  const [rotateGroupMembers, setRotateGroupMembers] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>(cohort.notes || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setSelectedGroupId(cohort.groupId || '');
    setSelectedFacilitatorId(cohort.facilitatorId || '');
    setCustomFacilitatorName(cohort.facilitatorName || '');
    setCustomFacilitatorEmail(cohort.facilitatorEmail || '');
    setNotes(cohort.notes || '');
    setErrorMsg(null);
  }, [cohort]);

  // Lista de facilitadores / instructores elegibles
  const eligibleFacilitators = users.filter(u => 
    u.role === 'Super Administrador' || 
    u.role === 'Administrador / Editor' || 
    u.role === 'Líder de Área / Supervisor' || 
    u.role === 'Evaluador / Tutor' ||
    u.role === 'Evaluador / Tutor OJT'
  );

  const handleFacilitatorSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedFacilitatorId(val);
    if (val === 'custom') {
      setCustomFacilitatorName('');
      setCustomFacilitatorEmail('');
    } else if (val) {
      const u = users.find(user => user.id === val);
      if (u) {
        setCustomFacilitatorName(u.name);
        setCustomFacilitatorEmail(u.email);
      }
    } else {
      setCustomFacilitatorName('');
      setCustomFacilitatorEmail('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const groupObj = groups.find(g => g.id === selectedGroupId);
      const groupName = groupObj ? groupObj.name : (selectedGroupId ? cohort.groupName : '');

      let facName = customFacilitatorName;
      let facEmail = customFacilitatorEmail;

      if (selectedFacilitatorId && selectedFacilitatorId !== 'custom') {
        const u = users.find(user => user.id === selectedFacilitatorId);
        if (u) {
          facName = u.name;
          facEmail = u.email;
        }
      }

      await apiService.reassignTechnicalCohort(cohort.id, {
        facilitatorId: selectedFacilitatorId === 'custom' ? null : (selectedFacilitatorId || null),
        facilitatorName: facName || cohort.facilitatorName,
        facilitatorEmail: facEmail || cohort.facilitatorEmail,
        groupId: selectedGroupId || null,
        groupName: groupName || undefined,
        rotateGroupMembers,
        notes
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al reasignar la cohorte');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Reasignar Cohorte Técnica"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-md shadow-red-600/20">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30">
                Rotación Semanal
              </span>
              <h2 className="text-base font-bold text-white truncate max-w-sm mt-0.5">
                Reasignar Cohorte Técnica
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current cohort snapshot */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-3 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="font-bold text-slate-800 dark:text-white">{cohort.courseTitle}</div>
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mt-1 text-[11px]">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {cohort.startDate} al {cohort.endDate}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {cohort.dailyTime}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Facilitador */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-red-600" />
              Facilitador / Instructor
            </label>
            <select
              value={selectedFacilitatorId}
              onChange={handleFacilitatorSelect}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800 dark:text-white bg-white dark:bg-slate-800"
            >
              <option value="">-- Sin Facilitador Asignado --</option>
              {eligibleFacilitators.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.email})
                </option>
              ))}
              <option value="custom">Otro facilitador (Ingresar manualmente)...</option>
            </select>

            {selectedFacilitatorId === 'custom' && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Nombre del facilitador"
                  value={customFacilitatorName}
                  onChange={(e) => setCustomFacilitatorName(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white bg-white dark:bg-slate-800"
                  required
                />
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={customFacilitatorEmail}
                  onChange={(e) => setCustomFacilitatorEmail(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white bg-white dark:bg-slate-800"
                />
              </div>
            )}
          </div>

          {/* 2. Grupo Técnico */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-red-600" />
              Grupo Técnico Semanal
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800 dark:text-white bg-white dark:bg-slate-800"
            >
              <option value="">-- Sin Grupo Específico (Inscripción Abierta) --</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.memberCards?.length || 0} integrantes)
                </option>
              ))}
            </select>
          </div>

          {/* 3. Rotación de miembros */}
          {selectedGroupId && (
            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 cursor-pointer">
              <input
                type="checkbox"
                checked={rotateGroupMembers}
                onChange={(e) => setRotateGroupMembers(e.target.checked)}
                className="mt-0.5 rounded text-red-600 focus:ring-red-500"
              />
              <div className="text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-300 block flex items-center gap-1">
                  <RotateCw className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  Auto-enrolar técnicos del nuevo grupo
                </span>
                <span className="text-amber-700 dark:text-amber-400 text-[11px] block mt-0.5">
                  Reemplaza el listado de técnicos matriculados en esta cohorte por los miembros vigentes del grupo seleccionado.
                </span>
              </div>
            </label>
          )}

          {/* 4. Notas / Justificación */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Observaciones / Justificación de Cambio
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Rotación de turno técnico por disponibilidad de cuadrilla..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm shadow-red-600/20 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aplicar Reasignación
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AccessibleModal>
  );
};
