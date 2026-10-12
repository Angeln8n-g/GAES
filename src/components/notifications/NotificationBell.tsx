import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  BellRing, 
  Check, 
  CheckCheck, 
  Trash2, 
  Settings, 
  ExternalLink, 
  Calendar, 
  Award, 
  Megaphone, 
  Info, 
  AlertTriangle, 
  Clock, 
  Video, 
  GraduationCap, 
  Sparkles, 
  X, 
  Loader2, 
  Send,
  Smartphone
} from 'lucide-react';
import { AppNotification, NotificationCategory, UserAccount, Company } from '../../types';
import { apiService } from '../../services/api';
import { PushNotificationService } from '../../services/pushNotificationService';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';
import { BroadcastNotificationModal } from './BroadcastNotificationModal';

interface NotificationBellProps {
  user?: UserAccount | null;
  onNavigate?: (view: any, meta?: any) => void;
  companies?: Company[];
}

function formatTimeAgo(isoDate: string): string {
  try {
    const diff = Math.max(0, (Date.now() - new Date(isoDate).getTime()) / 1000);
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    if (diff < 172800) return 'Ayer';
    return new Date(isoDate).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' });
  } catch {
    return isoDate;
  }
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  user,
  onNavigate,
  companies = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'trainings' | 'convocatorias' | 'certificates'>('all');
  
  // Modales
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  // Push Status
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Carga inicial y escucha de eventos
  useEffect(() => {
    if (user?.email) {
      loadUnreadCount();
      setPushPermission(PushNotificationService.getPermissionState());
    }

    const handleNewNotification = () => {
      loadUnreadCount();
      if (isOpen) {
        loadNotifications();
      }
    };

    window.addEventListener('gaes:new_notification', handleNewNotification);
    window.addEventListener('gaes:notification_read_update', handleNewNotification);

    return () => {
      window.removeEventListener('gaes:new_notification', handleNewNotification);
      window.removeEventListener('gaes:notification_read_update', handleNewNotification);
    };
  }, [user?.email, isOpen]);

  // Al abrir el dropdown, cargar la lista
  useEffect(() => {
    if (isOpen && user?.email) {
      loadNotifications();
      setPushPermission(PushNotificationService.getPermissionState());
    }
  }, [isOpen, activeTab]);

  const loadUnreadCount = async () => {
    try {
      const res = await apiService.getUnreadNotificationsCount();
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.warn('Error al cargar conteo de notificaciones:', err);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      let cat: string | undefined;
      let unreadOnly = false;

      if (activeTab === 'unread') unreadOnly = true;
      else if (activeTab === 'trainings') cat = 'cohorte'; // o evento
      else if (activeTab === 'convocatorias') cat = 'convocatoria';
      else if (activeTab === 'certificates') cat = 'certificado';

      const res = await apiService.getNotifications({
        unreadOnly,
        category: cat,
        limit: 30
      });

      // Si seleccionó "trainings", unimos evento y cohorte si fue necesario
      let list = res.notifications || [];
      if (activeTab === 'trainings') {
        const fullRes = await apiService.getNotifications({ limit: 50 });
        list = (fullRes.notifications || []).filter(n => n.category === 'cohorte' || n.category === 'evento');
      }

      setNotifications(list);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error('Error al cargar notificaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await apiService.markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error al marcar notificación como leída:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiService.markAllNotificationsAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error al marcar todas como leídas:', err);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      loadUnreadCount();
    } catch (err) {
      console.error('Error al eliminar notificación:', err);
    }
  };

  const handleActionClick = (notification: AppNotification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    if (!notification.actionUrl) return;

    if (notification.actionUrl.startsWith('http://') || notification.actionUrl.startsWith('https://')) {
      window.open(notification.actionUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Ruta interna
    setIsOpen(false);
    if (!onNavigate) return;

    const url = notification.actionUrl.toLowerCase();
    if (url.includes('convocatoria')) {
      onNavigate('convocatorias');
    } else if (url.includes('certificate') || url.includes('diploma')) {
      onNavigate('my-registrations');
    } else if (url.includes('technical') || url.includes('cohorte')) {
      onNavigate('technical-academy');
    } else if (url.includes('registrations') || url.includes('inscrip')) {
      onNavigate('my-registrations');
    } else if (url.includes('catalog') || url.includes('evento')) {
      onNavigate('landing');
    } else {
      onNavigate('landing');
    }
  };

  const handleSubscribePush = async () => {
    try {
      setIsSubscribingPush(true);
      setPushStatusMsg(null);
      const res = await PushNotificationService.subscribeUserToPush();
      setPushPermission(PushNotificationService.getPermissionState());
      setPushStatusMsg(res.message);
      setTimeout(() => setPushStatusMsg(null), 4000);
    } catch (err: any) {
      setPushStatusMsg(err.message || 'Error al suscribir');
    } finally {
      setIsSubscribingPush(false);
    }
  };

  const handleTestPush = async () => {
    try {
      setPushStatusMsg('Enviando alerta de prueba...');
      const res = await PushNotificationService.sendTestPush();
      setPushStatusMsg(res.message);
      setTimeout(() => setPushStatusMsg(null), 4000);
    } catch (err: any) {
      setPushStatusMsg(err.message || 'Error en prueba');
    }
  };

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'cohorte':
        return <GraduationCap className="w-4 h-4 text-indigo-500" />;
      case 'evento':
        return <Calendar className="w-4 h-4 text-emerald-500" />;
      case 'convocatoria':
        return <Send className="w-4 h-4 text-purple-500" />;
      case 'certificado':
        return <Award className="w-4 h-4 text-amber-500" />;
      case 'cumplimiento':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const isSuperAdmin = user?.role === 'Super Administrador';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de Campana */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Notificaciones y Avisos de Entrenamiento"
        className={`relative p-2 rounded-xl transition-all duration-200 flex items-center justify-center ${
          isOpen
            ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 animate-[wiggle_1s_ease-in-out_infinite]" />
        ) : (
          <Bell className="w-5 h-5" />
        )}

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-rose-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-md shadow-rose-500/30 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 sm:w-[440px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden flex flex-col max-h-[85vh] animate-fadeIn">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Centro de Notificaciones
              </h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                  {unreadCount} sin leer
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  title="Marcar todas como leídas"
                  className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs inline-flex items-center gap-1"
                >
                  <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline text-[11px] font-medium">Leer todas</span>
                </button>
              )}

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsBroadcastOpen(true);
                  }}
                  title="Emitir Comunicado Masivo"
                  className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                >
                  <Megaphone className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsPreferencesOpen(true);
                }}
                title="Configurar Notificaciones"
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Banner de Estado Push */}
          {pushPermission !== 'granted' ? (
            <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-medium">
                <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>¿Activar alertas Push cuando empiece tu clase?</span>
              </div>
              <button
                type="button"
                onClick={handleSubscribePush}
                disabled={isSubscribingPush}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm text-[11px] shrink-0 transition-all inline-flex items-center gap-1"
              >
                {isSubscribingPush ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                <span>Activar</span>
              </button>
            </div>
          ) : (
            <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Notificaciones Push activas en este dispositivo</span>
              </div>
              <button
                type="button"
                onClick={handleTestPush}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 underline font-medium"
              >
                Probar alerta
              </button>
            </div>
          )}

          {pushStatusMsg && (
            <div className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium border-b border-indigo-100 dark:border-indigo-900/40">
              {pushStatusMsg}
            </div>
          )}

          {/* Filtros de Pestañas */}
          <div className="px-3 pt-2 pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                activeTab === 'unread'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              No leídas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trainings')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                activeTab === 'trainings'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Entrenamientos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('convocatorias')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                activeTab === 'convocatorias'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Convocatorias
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('certificates')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                activeTab === 'certificates'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Certificados
            </button>
          </div>

          {/* Lista de Notificaciones */}
          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 flex-1 max-h-[380px]">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                <p className="text-xs">Cargando notificaciones...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  No hay notificaciones en esta sección
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Aquí verás avisos de convocatorias, entrenamientos y certificados emitidos.
                </p>
              </div>
            ) : (
              notifications.map(item => (
                <div
                  key={item.id}
                  onClick={() => !item.isRead && handleMarkAsRead(item.id)}
                  className={`p-3.5 transition-colors relative group hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${
                    !item.isRead
                      ? 'bg-indigo-50/30 dark:bg-indigo-950/20'
                      : 'bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icono de Categoría */}
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                      {getCategoryIcon(item.category)}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-xs leading-snug line-clamp-1 ${
                          !item.isRead
                            ? 'font-bold text-slate-900 dark:text-slate-100'
                            : 'font-semibold text-slate-700 dark:text-slate-300'
                        }`}>
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>

                      {/* Botón de Acción o Enlace */}
                      {item.actionUrl && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleActionClick(item, e)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm ${
                              item.priority === 'urgent'
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                            }`}
                          >
                            {item.actionUrl.includes('meet') || item.actionUrl.includes('teams') || item.actionUrl.includes('zoom') ? (
                              <Video className="w-3 h-3" />
                            ) : (
                              <ExternalLink className="w-3 h-3" />
                            )}
                            <span>{item.actionLabel || 'Ingresar a Sala Virtual'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Acciones flotantes */}
                    <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {!item.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          title="Marcar como leída"
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, e)}
                        title="Eliminar notificación"
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Indicador de no leído */}
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 self-center"></span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>GAES Sistema de Notificaciones 360°</span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsPreferencesOpen(true);
              }}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold inline-flex items-center gap-1"
            >
              <span>Ajustes</span>
            </button>
          </div>
        </div>
      )}

      {/* Modales */}
      <NotificationPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        onPreferencesUpdated={loadNotifications}
      />

      <BroadcastNotificationModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        companies={companies}
        onBroadcastSent={loadNotifications}
      />
    </div>
  );
};
