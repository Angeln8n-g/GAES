import React, { useState } from 'react';
import { 
  Sliders, 
  Sparkles, 
  CheckCircle2, 
  Activity, 
  Target, 
  Layers, 
  ShieldCheck, 
  Save, 
  Clock, 
  AlertCircle,
  HelpCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { SystemSettings, OjtPlanSettings } from '../../types';
import { apiService } from '../../services/api';

interface SettingsManagerProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  settings,
  onUpdateSettings,
  onShowToast
}) => {
  const ojtConfig: OjtPlanSettings = settings.ojt_plan_90d || {
    enabled: true,
    enable_702010: true,
    enable_calibration: true,
    target_ttp_days: 30
  };

  const [enabled, setEnabled] = useState<boolean>(ojtConfig.enabled);
  const [enable702010, setEnable702010] = useState<boolean>(ojtConfig.enable_702010 ?? true);
  const [enableCalibration, setEnableCalibration] = useState<boolean>(ojtConfig.enable_calibration ?? true);
  const [targetTtpDays, setTargetTtpDays] = useState<number>(ojtConfig.target_ttp_days ?? 30);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const payload: OjtPlanSettings = {
        enabled,
        enable_702010: enable702010,
        enable_calibration: enableCalibration,
        target_ttp_days: targetTtpDays
      };

      await apiService.updateOjtSettings(payload);
      const updatedFullSettings: SystemSettings = {
        ...settings,
        ojt_plan_90d: payload
      };
      onUpdateSettings(updatedFullSettings);

      onShowToast(
        'Configuración guardada',
        enabled 
          ? 'Módulo de Operaciones de Campo & Plan a 90 Días activado correctamente.'
          : 'Módulo de Operaciones de Campo desactivado. La plataforma operará en modo estándar.',
        'success'
      );
    } catch (err: any) {
      console.error(err);
      onShowToast('Error', 'No se pudo actualizar la configuración del sistema.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#DA291C] mb-1">
            <Sliders className="w-4 h-4" />
            <span>Panel de Gobernanza del Super Administrador</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Configuración del Sistema & Feature Flags</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Activa o desactiva módulos avanzados para adaptar la plataforma al nivel de madurez operativa de la organización.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 bg-[#DA291C] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-2xl shadow-md shadow-red-500/25 flex items-center gap-2 transition-all shrink-0 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
        </button>
      </div>

      {/* Main Feature Flag Card: Field Ops & 90-Day Plan */}
      <div className={`p-6 rounded-3xl border transition-all ${
        enabled 
          ? 'bg-white dark:bg-slate-900 border-[#DA291C]/40 dark:border-[#DA291C]/50 shadow-sm' 
          : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 opacity-90'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              enabled ? 'bg-red-50 dark:bg-red-950/40 text-[#DA291C] dark:text-red-400 border border-red-200 dark:border-red-900/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
            }`}>
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-black text-slate-900 dark:text-white">Módulo de Operaciones de Campo & Plan a 90 Días</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                  enabled 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}>
                  {enabled ? 'Activo en Plataforma' : 'Inactivo'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Habilita el seguimiento en campo mediante <strong className="text-slate-800 dark:text-slate-200">Checklists Digitales de Campo</strong>, cronogramas bajo el <strong className="text-slate-800 dark:text-slate-200">Modelo 70-20-10</strong>, <strong className="text-slate-800 dark:text-slate-200">Mesas de Calibración Ops-Capacitación</strong> y métricas de aceleración del <strong className="text-slate-800 dark:text-slate-200">Time to Productivity (TTP)</strong>.
              </p>
            </div>
          </div>

          {/* Master Toggle */}
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              enabled 
                ? 'bg-[#DA291C] text-white shadow-md shadow-red-500/25' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {enabled ? <ToggleRight className="w-5 h-5 text-white" /> : <ToggleLeft className="w-5 h-5" />}
            <span>{enabled ? 'Activado' : 'Desactivado'}</span>
          </button>
        </div>

        {/* Sub-features Settings (Active only when enabled) */}
        {enabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5 animate-in fade-in duration-200">
            
            {/* Sub-feature 1: 70-20-10 */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">Framework 70-20-10</span>
                </div>
                <input
                  type="checkbox"
                  checked={enable702010}
                  onChange={(e) => setEnable702010(e.target.checked)}
                  className="w-4 h-4 rounded text-[#DA291C] focus:ring-[#DA291C] border-slate-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Permite clasificar los cronogramas en 70% Práctica de Campo, 20% Shadowing y 10% Aula Formal.
              </p>
            </div>

            {/* Sub-feature 2: Mesas de Calibración */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">Mesas de Calibración</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableCalibration}
                  onChange={(e) => setEnableCalibration(e.target.checked)}
                  className="w-4 h-4 rounded text-[#DA291C] focus:ring-[#DA291C] border-slate-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Habilita la auditoría cruzada y sesiones conjuntas entre Líderes de Campo y Capacitación para alinear notas.
              </p>
            </div>

            {/* Sub-feature 3: Meta de TTP */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">Meta TTP (Días)</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded-md">
                  {targetTtpDays} días
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="90"
                step="5"
                value={targetTtpDays}
                onChange={(e) => setTargetTtpDays(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#DA291C]"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Objetivo esperado para que un colaborador alcance el 100% de autonomía operativa.
              </p>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};
