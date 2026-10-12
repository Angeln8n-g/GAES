import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  MapPin, 
  BookOpen, 
  Send, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Building2, 
  Search, 
  RotateCw, 
  UserCheck, 
  Inbox, 
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { 
  Convocatoria, 
  ConvocatoriaApplication, 
  Participant, 
  UserAccount, 
  Company 
} from '../../types';
import { apiService } from '../../services/api';
import { ConvocatoriaApplyModal } from './ConvocatoriaApplyModal';

interface ConvocatoriasPortalViewProps {
  currentUser: UserAccount | null;
  participants: Participant[];
  companies: Company[];
  onNavigateToCourse?: (courseId: string) => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const ConvocatoriasPortalView: React.FC<ConvocatoriasPortalViewProps> = ({
  currentUser,
  participants = [],
  companies = [],
  onNavigateToCourse,
  onShowToast
}) => {
  const isSupervisor = currentUser?.role === 'Líder de Área / Supervisor';
  const isSuperAdmin = currentUser?.role === 'Super Administrador';
  const canNominate = isSupervisor || isSuperAdmin;

  const [activeTab, setActiveTab] = useState<'available' | 'my_applications'>('available');
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [myApplications, setMyApplications] = useState<ConvocatoriaApplication[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal de postulación
  const [selectedConvocatoriaForApply, setSelectedConvocatoriaForApply] = useState<Convocatoria | null>(null);
  const [nominateTargetCard, setNominateTargetCard] = useState<string | undefined>(undefined);

  // Participante correspondiente al usuario autenticado
  const currentParticipant = useMemo(() => {
    if (!currentUser) return null;
    return (
      participants.find(p => p.email.toLowerCase() === (currentUser.email || '').toLowerCase()) ||
      participants.find(p => p.card === currentUser.id) ||
      null
    );
  }, [currentUser, participants]);

  // Equipo del supervisor si aplica
  const teamMembers = useMemo(() => {
    if (!canNominate || !currentUser) return [];
    return participants.filter(p => 
      p.supervisorId === currentUser.id || 
      (p.supervisorName && p.supervisorName.toLowerCase() === (currentUser.name || '').toLowerCase()) ||
      (currentUser.companyId && p.companyId === currentUser.companyId)
    );
  }, [canNominate, currentUser, participants]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [convList, myApps] = await Promise.all([
        apiService.getConvocatorias({ status: 'open' }),
        apiService.getMyConvocatoriaApplications().catch(() => [])
      ]);
      setConvocatorias(convList);
      setMyApplications(myApps);
    } catch (err: any) {
      console.error('Error al cargar portal de convocatorias:', err);
      if (onShowToast) onShowToast('Error', err.message || 'No se pudieron cargar las convocatorias', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Filtrado de convocatorias disponibles
  const filteredConvocatorias = useMemo(() => {
    return convocatorias.filter(c => {
      const q = searchQuery.toLowerCase();
      return (
        searchQuery === '' ||
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.courseTitle && c.courseTitle.toLowerCase().includes(q))
      );
    });
  }, [convocatorias, searchQuery]);

  const handleApplyClick = (c: Convocatoria, targetCard?: string) => {
    setSelectedConvocatoriaForApply(c);
    setNominateTargetCard(targetCard);
  };

  const getAppStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ¡Aprobada / Inscrito!
          </span>
        );
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center gap-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            En Revisión
          </span>
        );
      case 'waitlist':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 flex items-center gap-1.5 shadow-2xs">
            <Inbox className="w-3.5 h-3.5 text-purple-600" />
            Lista de Espera
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 flex items-center gap-1.5 shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            No Admitido
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Banner Principal de Convocatorias */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-gradient-to-tr from-red-600/20 to-orange-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-red-400" />
            <span>Oportunidades de Formación</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Convocatorias Abiertas de Capacitación
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Explora las convocatorias vigentes para certificaciones de la Academia Técnica y programas de formación.
            Consulta cupos reservados para tu empresa y postúlate directamente.
          </p>
        </div>
      </div>

      {/* Selector de Pestañas & Buscador */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('available')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'available'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-600/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Convocatorias Disponibles</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-black bg-white/20 text-white">
              {convocatorias.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_applications')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'my_applications'
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-600/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mis Postulaciones</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-black bg-white/20 text-white">
              {myApplications.length}
            </span>
          </button>
        </div>

        {activeTab === 'available' && (
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar convocatoria..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Vista 1: Convocatorias Disponibles */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-red-500" />
              <span className="text-xs font-bold">Consultando convocatorias abiertas...</span>
            </div>
          ) : filteredConvocatorias.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
              <Inbox className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No hay convocatorias abiertas en este momento.
              </p>
              <p className="text-xs text-slate-400">
                Las nuevas convocatorias de capacitación aparecerán aquí en cuanto sean publicadas por el equipo de formación.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredConvocatorias.map(c => {
                const userCompanyId = currentParticipant?.companyId || currentUser?.companyId || 'emp_kasino';
                const userCompanyQuota = c.companyQuotas?.find(q => q.companyId === userCompanyId);
                const hasApplied = Boolean(c.userApplication);
                const availableSlots = userCompanyQuota
                  ? (userCompanyQuota.availableQuota ?? (userCompanyQuota.allocatedQuota - (userCompanyQuota.approvedApplications || 0)))
                  : null;

                return (
                  <div
                    key={c.id}
                    className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900/40 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {c.code}
                        </span>
                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          {c.modality}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white line-clamp-2">
                          {c.title}
                        </h3>
                        {c.courseTitle && (
                          <p className="text-xs font-bold text-[#DA291C] dark:text-red-400 mt-0.5 truncate flex items-center gap-1">
                            <BookOpen className="w-3 h-3 shrink-0" />
                            {c.courseTitle}
                          </p>
                        )}
                      </div>

                      {c.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                          {c.description}
                        </p>
                      )}

                      {/* Detalles: Fechas y Sede */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Cierre de Postulación: <strong>{c.applicationEndDate}</strong></span>
                        </div>
                        {c.trainingStartDate && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Entrenamiento: <strong>{c.trainingStartDate} al {c.trainingEndDate}</strong></span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{c.location || 'Sede Central'}</span>
                        </div>
                      </div>

                      {/* Estado de Cupos para la Empresa */}
                      {userCompanyQuota && (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            <Building2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span className="truncate font-semibold text-slate-700 dark:text-slate-300">
                              Cupos {userCompanyQuota.companyName || 'Empresa'}:
                            </span>
                          </div>
                          <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                            (availableSlots || 0) > 0
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          }`}>
                            {(availableSlots || 0) > 0 ? `${availableSlots} disp.` : 'Lista de Espera'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Botones de Postulación */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      {hasApplied ? (
                        <div className="flex items-center gap-1.5">
                          {getAppStatusBadge(c.userApplication?.status || 'pending')}
                        </div>
                      ) : (
                        c.allowSelfApplication && (
                          <button
                            type="button"
                            onClick={() => handleApplyClick(c)}
                            className="flex-1 px-4 py-2 text-xs font-bold text-white bg-[#DA291C] hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Postularme</span>
                          </button>
                        )
                      )}

                      {/* Nominación por Supervisor */}
                      {canNominate && c.allowSupervisorNomination && (
                        <button
                          type="button"
                          onClick={() => handleApplyClick(c, 'select_team')}
                          className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Nominar colaborador de tu equipo"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                          <span>Nominar Equipo</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Vista 2: Mis Postulaciones */}
      {activeTab === 'my_applications' && (
        <div className="space-y-4">
          {myApplications.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Aún no tienes postulaciones registradas.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('available')}
                className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
              >
                Ver convocatorias disponibles y postularte
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myApplications.map(app => (
                <div
                  key={app.id}
                  className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {app.convocatoriaCode || 'CONV'}
                      </span>
                      {getAppStatusBadge(app.status)}
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {app.convocatoriaTitle}
                    </h3>
                    {app.courseTitle && (
                      <p className="text-xs font-bold text-red-600 dark:text-red-400">
                        {app.courseTitle}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <span>Postulado: {new Date(app.createdAt).toLocaleDateString()}</span>
                      {app.trainingStartDate && (
                        <span>• Inicio Curso: {app.trainingStartDate}</span>
                      )}
                      <span>• Modalidad: {app.convocatoriaModality || 'Presencial'}</span>
                    </div>

                    {app.motivation && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic pt-1">
                        Motivación: "{app.motivation}"
                      </p>
                    )}

                    {app.reviewNotes && (
                      <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl mt-1">
                        <strong>Comentarios del revisor:</strong> {app.reviewNotes}
                      </div>
                    )}
                  </div>

                  {app.status === 'approved' && app.enrolledInCohort && onNavigateToCourse && (
                    <button
                      type="button"
                      onClick={() => onNavigateToCourse('technical-academy')}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Ver en Mis Cursos</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Postulación / Nominación */}
      {selectedConvocatoriaForApply && (
        <ConvocatoriaApplyModal
          isOpen={Boolean(selectedConvocatoriaForApply)}
          onClose={() => {
            setSelectedConvocatoriaForApply(null);
            setNominateTargetCard(undefined);
          }}
          convocatoria={selectedConvocatoriaForApply}
          currentUser={currentUser}
          participant={currentParticipant}
          participants={participants}
          nominateCard={nominateTargetCard !== 'select_team' ? nominateTargetCard : undefined}
          onSuccess={() => {
            loadData();
            if (onShowToast) onShowToast('¡Postulación Enviada!', 'Tu solicitud ha sido registrada satisfactoriamente.', 'success');
          }}
        />
      )}
    </div>
  );
};
