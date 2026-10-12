import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Bell, 
  Smartphone, 
  Mail, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Send,
  Loader2,
  Calendar,
  Award,
  GraduationCap
} from 'lucide-react';
import { UserNotificationPreferences } from '../../types';
import { apiService } from '../../services/api';
import { PushNotificationService } from '../../services/pushNotificationService';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreferencesUpdated?: () => void;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  onPreferencesUpdated
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [preferences, setPreferences] = useState<UserNotificationPreferences>({
    inAppEnabled: true,
    pushEnabled: true,
    emailEnabled: true,
    trainingStartAlerts: true,
    trainingAdvanceNoticeMinutes: 15,
    categories: {
      evento: true,
      convocatoria: true,
      cohorte: true,
      certificado: true,
      cumplimiento: true,
      sistema: true
    }
  });

  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
      setPushPermission(PushNotificationService.getPermissionState());
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const data = await apiService.getNotificationPreferences();
      if (data) {
        setPreferences({
          inAppEnabled: data.inAppEnabled ?? true,
          pushEnabled: data.pushEnabled ?? true,
          emailEnabled: data.emailEnabled ?? true,
          trainingStartAlerts: data.trainingStartAlerts ?? true,
          trainingAdvanceNoticeMinutes: data.trainingAdvanceNoticeMinutes ?? 15,
          categories: {
            evento: true,
            convocatoria: true,
            cohorte: true,
            certificado: true,
            cumplimiento: true,
            sistema: true,
            ...(data.categories || {})
          }
        });
      }
    } catch (err) {
      console.error('Error cargando preferencias de notificación:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setStatusMessage(null);
      await apiService.saveNotificationPreferences(preferences);
      setStatusMessage({ text: 'Preferencias guardadas exitosamente.', type: 'success' });
      if (onPreferencesUpdated) onPreferencesUpdated();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error al guardar preferencias:', err);
      setStatusMessage({ text: err.message || 'Error al guardar preferencias', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePushPermission = async () => {
    try {
      setSaving(true);
      setStatusMessage(null);
      const res = await PushNotificationService.subscribeUserToPush();
      setPushPermission(PushNotificationService.getPermissionState());
      if (res.success) {
        setPreferences(prev => ({ ...prev, pushEnabled: true }));
        setStatusMessage({ text: res.message, type: 'success' });
      } else {
        setStatusMessage({ text: res.message, type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Error solicitando permisos', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestPush = async () => {
    try {
      setTestingPush(true);
      setStatusMessage(null);
      const res = await PushNotificationService.sendTestPush();
      if (res.success) {
        setStatusMessage({ text: res.message || '¡Alerta de prueba enviada a tu dispositivo!', type: 'success' });
      } else {
        setStatusMessage({ text: res.message || 'Fallo al emitir prueba Push.', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Error en prueba Push', type: 'error' });
    } finally {
      setTestingPush(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setPreferences(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [cat]: !prev.categories[cat]
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Encabezado */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Preferencias de Notificaciones
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configura cómo y cuándo deseas recibir alertas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p>Cargando preferencias...</p>
            </div>
          ) : (
            <>
              {statusMessage && (
                <div
                  className={`p-3 rounded-xl flex items-center gap-2 text-xs font-medium ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* Sección Canales de Envío */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                  Canales de Entrega
                </h3>
                <div className="space-y-3">
                  {/* Push Notifications */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg mt-0.5">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          Notificaciones Push en Dispositivo
                          {pushPermission === 'granted' ? (
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                              Permitido
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold">
                              Requiere Permiso
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Alertas emergentes del sistema operativo cuando inicien tus clases o convocatorias, aun con la pestaña en segundo plano.
                        </p>
                        {pushPermission !== 'granted' && (
                          <button
                            type="button"
                            onClick={handleTogglePushPermission}
                            className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                          >
                            <span>Habilitar permisos en el navegador →</span>
                          </button>
                        )}
                        {pushPermission === 'granted' && (
                          <button
                            type="button"
                            onClick={handleSendTestPush}
                            disabled={testingPush}
                            className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 inline-flex items-center gap-1.5 transition-colors"
                          >
                            {testingPush ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 text-indigo-500" />}
                            <span>Enviar Alerta de Prueba</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={preferences.pushEnabled}
                        onChange={e => setPreferences(prev => ({ ...prev, pushEnabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* In-App Bell */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg mt-0.5">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          Bandeja In-App (Campana)
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Mostrar alertas y registro de actividad en la barra de navegación superior.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={preferences.inAppEnabled}
                        onChange={e => setPreferences(prev => ({ ...prev, inAppEnabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Email */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg mt-0.5">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          Resúmenes por Correo Electrónico
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Recibir confirmaciones de inscripción y diplomas oficiales en tu buzón.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={preferences.emailEnabled}
                        onChange={e => setPreferences(prev => ({ ...prev, emailEnabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Alertas de Horarios de Entrenamiento */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                  Alertas de Horarios de Entrenamiento (Push)
                </h3>
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      <span>Alerta al iniciar la clase (T-0m)</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.trainingStartAlerts}
                        onChange={e => setPreferences(prev => ({ ...prev, trainingStartAlerts: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="pt-2 border-t border-indigo-100/80 dark:border-indigo-900/40 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-800 dark:text-slate-200 block">
                        Aviso previo de preparación
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Recibe una alerta antes de que inicie la sesión
                      </span>
                    </div>
                    <select
                      value={preferences.trainingAdvanceNoticeMinutes}
                      onChange={e => setPreferences(prev => ({ ...prev, trainingAdvanceNoticeMinutes: parseInt(e.target.value, 10) }))}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 font-medium"
                    >
                      <option value="5">5 minutos antes</option>
                      <option value="10">10 minutos antes</option>
                      <option value="15">15 minutos antes</option>
                      <option value="30">30 minutos antes</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Categorías Permitidas */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                  Categorías Habilitadas
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'convocatoria', label: 'Convocatorias', icon: Send },
                    { key: 'cohorte', label: 'Academia Técnica', icon: GraduationCap },
                    { key: 'evento', label: 'Eventos Generales', icon: Calendar },
                    { key: 'certificado', label: 'Certificados y Diplomas', icon: Award }
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleCategory(key)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                        preferences.categories[key]
                          ? 'border-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 opacity-60'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${preferences.categories[key] ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-600/20 disabled:opacity-50 inline-flex items-center gap-2 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Guardar Preferencias</span>
          </button>
        </div>
      </div>
    </div>
  );
};
