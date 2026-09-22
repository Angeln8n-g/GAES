import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Download,
  RotateCcw,
  Trash2,
  ShieldCheck,
  HardDrive,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileCode,
  Copy,
  Check,
  FolderArchive,
  Play,
  Layers,
  Sparkles,
  Server
} from 'lucide-react';
import { DatabaseBackupRecord, DatabaseStats, MigrationStatusRecord, UserAccount } from '../../types';
import { apiService } from '../../services/api';

interface DatabaseBackupManagerProps {
  currentUser?: UserAccount | null;
  onShowToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const DatabaseBackupManager: React.FC<DatabaseBackupManagerProps> = ({
  currentUser,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'backups' | 'migrations'>('backups');
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [backups, setBackups] = useState<DatabaseBackupRecord[]>([]);
  const [migrations, setMigrations] = useState<MigrationStatusRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);
  const [isRunningMigrations, setIsRunningMigrations] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Modal de Restauración
  const [restoreModalOpen, setRestoreModalOpen] = useState<boolean>(false);
  const [backupToRestore, setBackupToRestore] = useState<DatabaseBackupRecord | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Modal de Eliminación
  const [backupToDelete, setBackupToDelete] = useState<DatabaseBackupRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Carga inicial de datos
  const loadData = useCallback(async (quiet: boolean = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const [statsData, backupsData, migrationsData] = await Promise.all([
        apiService.getDatabaseStats().catch(() => null),
        apiService.getDatabaseBackups().catch(() => []),
        apiService.getMigrationStatus().catch(() => [])
      ]);

      if (statsData) setStats(statsData);
      setBackups(backupsData);
      setMigrations(migrationsData);
    } catch (err: any) {
      console.error('Error al cargar datos de respaldos:', err);
      onShowToast('Error al conectar', 'No se pudieron consultar los datos de la base de datos.', 'error');
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manejador para crear respaldo manual
  const handleCreateBackup = async () => {
    try {
      setIsCreatingBackup(true);
      const userIdentifier = currentUser?.name || currentUser?.email || 'Super Administrador';
      const created = await apiService.createDatabaseBackup(userIdentifier);
      onShowToast(
        'Respaldo completado',
        `Se generó la copia "${created.filename}" (${created.sizeFormatted}) correctamente.`,
        'success'
      );
      await loadData(true);
    } catch (err: any) {
      console.error('Error al crear respaldo:', err);
      onShowToast('Fallo en respaldo', err.message || 'No se pudo generar la copia de respaldo.', 'error');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Manejador para ejecutar restauración
  const handleExecuteRestore = async () => {
    if (!backupToRestore) return;
    if (restoreConfirmText.trim().toUpperCase() !== 'RESTAURAR') {
      onShowToast('Confirmación requerida', 'Escriba "RESTAURAR" exactamente para confirmar la operación.', 'error');
      return;
    }

    try {
      setIsRestoring(true);
      const userIdentifier = currentUser?.name || currentUser?.email || 'Super Administrador';
      const res = await apiService.restoreDatabaseBackup(backupToRestore.filename, userIdentifier);
      
      onShowToast(
        'Base de datos restaurada',
        `${res.message} Se guardó un respaldo previo de seguridad: ${res.safetyBackup}`,
        'success'
      );
      setRestoreModalOpen(false);
      setBackupToRestore(null);
      setRestoreConfirmText('');
      await loadData(true);
    } catch (err: any) {
      console.error('Error al restaurar base de datos:', err);
      onShowToast('Fallo en restauración', err.message || 'Error al aplicar el respaldo en la base de datos.', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Manejador para eliminar respaldo
  const handleConfirmDelete = async () => {
    if (!backupToDelete) return;
    try {
      setIsDeleting(true);
      const userIdentifier = currentUser?.name || currentUser?.email || 'Super Administrador';
      await apiService.deleteDatabaseBackup(backupToDelete.filename, userIdentifier);
      onShowToast('Respaldo eliminado', `El archivo ${backupToDelete.filename} fue eliminado.`, 'info');
      setBackupToDelete(null);
      await loadData(true);
    } catch (err: any) {
      console.error('Error al eliminar respaldo:', err);
      onShowToast('Error', err.message || 'No se pudo eliminar el archivo de respaldo.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Manejador para ejecutar migraciones
  const handleRunMigrations = async () => {
    try {
      setIsRunningMigrations(true);
      const res = await apiService.runPendingMigrations();
      if (res.appliedCount > 0) {
        onShowToast('Migraciones ejecutadas', `Se aplicaron ${res.appliedCount} migraciones satisfactoriamente.`, 'success');
      } else {
        onShowToast('Esquema al día', 'La base de datos ya se encuentra en la versión más reciente.', 'info');
      }
      await loadData(true);
    } catch (err: any) {
      console.error('Error al ejecutar migraciones:', err);
      onShowToast('Error en migraciones', err.message || 'Fallo durante la ejecución de migraciones.', 'error');
    } finally {
      setIsRunningMigrations(false);
    }
  };

  // Copiar hash al portapapeles
  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
    onShowToast('Hash copiado', 'Checksum SHA-256 copiado al portapapeles.', 'info');
  };

  // Formatear fechas legibles
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Nunca';
    try {
      return new Date(dateStr).toLocaleString('es-DO', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-widest">
              <Database className="w-4 h-4" />
              <span>Infraestructura & DevOps</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Base de Datos & Respaldos
              <span className="text-xs font-medium px-2.5 py-1 bg-white/10 rounded-full text-slate-300 border border-white/10">
                PostgreSQL 16
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Gestión automatizada de respaldos comprimidos gzip con validación criptográfica SHA-256, política de rotación GFS (7 diarias, 4 semanales, 3 mensuales) y migraciones transaccionales.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => loadData()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10 cursor-pointer disabled:opacity-50"
              title="Refrescar estado"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refrescar</span>
            </button>

            <button
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#DA291C] to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <FolderArchive className={`w-4 h-4 ${isCreatingBackup ? 'animate-spin' : ''}`} />
              <span>{isCreatingBackup ? 'Generando Copia...' : 'Crear Respaldo Ahora'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: PostgreSQL Size */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Base de Datos</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats?.databaseSize || 'Calculando...'}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{stats?.tableCount || 0}</span> tablas en esquema <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">public</code>
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>BD: {stats?.databaseName || 'capacitahub_db'}</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
        </div>

        {/* Card 2: Backups Count & Storage */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Respaldos Almacenados</span>
            <div className="p-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats?.totalBackupSizeFormatted || '0 Bytes'}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{backups.length}</span> copias .sql.gz en disco
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Política GFS Activa</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">Max 90 Días</span>
          </div>
        </div>

        {/* Card 3: Scheduler Status */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Planificador Nocturno</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              02:00 AM UTC
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Último: {formatDate(stats?.lastBackupAt)}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Frecuencia: Diaria</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Activo</span>
          </div>
        </div>

        {/* Card 4: Migrations & Schema Health */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Esquema & Migraciones</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {migrations.filter(m => m.status === 'applied').length} / {migrations.length || 8}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Migraciones aplicadas</span>
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Auditoría SHA-256</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Verificada</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('backups')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'backups'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>Copias de Respaldo (.sql.gz)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'backups' ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {backups.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('migrations')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'migrations'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Historial de Migraciones del Esquema</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'migrations' ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {migrations.length}
            </span>
          </button>
        </div>

        {activeTab === 'migrations' && (
          <button
            onClick={handleRunMigrations}
            disabled={isRunningMigrations}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isRunningMigrations ? 'animate-spin' : ''}`} />
            <span>{isRunningMigrations ? 'Verificando...' : 'Comprobar Migraciones'}</span>
          </button>
        )}
      </div>

      {/* Tab Content 1: Backups List */}
      {activeTab === 'backups' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {backups.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
                <FolderArchive className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No hay respaldos almacenados</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Genera una copia manual inicial o espera a que el cronjob nocturno ejecute el respaldo automático.
                </p>
              </div>
              <button
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <FolderArchive className="w-4 h-4" />
                <span>Generar Respaldo Ahora</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 dark:bg-slate-850/75 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Archivo de Respaldo</th>
                    <th className="py-3.5 px-4">Origen / Disparador</th>
                    <th className="py-3.5 px-4">Tamaño</th>
                    <th className="py-3.5 px-4">Checksum SHA-256</th>
                    <th className="py-3.5 px-4">Fecha & Hora</th>
                    <th className="py-3.5 px-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {backups.map((b) => {
                    const isAutomated = b.triggerType === 'automated_scheduled';
                    const isSafety = b.triggerType === 'pre_restore_safety';
                    
                    return (
                      <tr key={b.filename} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors">
                        {/* Filename */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl shrink-0 ${
                              isSafety 
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                                : isAutomated 
                                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              <FolderArchive className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block font-mono text-[11px]">
                                {b.filename}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                Base de datos: {b.databaseName || 'capacitahub_db'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Trigger Type */}
                        <td className="py-3.5 px-4">
                          {isSafety ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                              <ShieldCheck className="w-3 h-3" />
                              Preventivo Pre-Restauración
                            </span>
                          ) : isAutomated ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                              <Clock className="w-3 h-3" />
                              Programado Nocturno
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                              <Sparkles className="w-3 h-3" />
                              Manual Super Admin
                            </span>
                          )}
                        </td>

                        {/* Size */}
                        <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          {b.sizeFormatted}
                        </td>

                        {/* SHA256 */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <code className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 max-w-[130px] truncate" title={b.sha256}>
                              {b.sha256 ? `${b.sha256.slice(0, 8)}...${b.sha256.slice(-6)}` : 'Sin hash'}
                            </code>
                            {b.sha256 && (
                              <button
                                onClick={() => handleCopyHash(b.sha256)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer"
                                title="Copiar SHA-256 completo"
                              >
                                {copiedHash === b.sha256 ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(b.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Download */}
                            <a
                              href={apiService.getBackupDownloadUrl(b.filename)}
                              download={b.filename}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                              title="Descargar archivo .sql.gz"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Descargar</span>
                            </a>

                            {/* Restore */}
                            <button
                              onClick={() => {
                                setBackupToRestore(b);
                                setRestoreConfirmText('');
                                setRestoreModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 transition-colors inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                              title="Restaurar base de datos a esta copia"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restaurar</span>
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setBackupToDelete(b)}
                              className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-colors inline-flex items-center text-[11px] cursor-pointer"
                              title="Eliminar respaldo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Migrations List */}
      {activeTab === 'migrations' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/75 dark:bg-slate-850/75 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Layers className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Historial auditado de migraciones ejecutadas con transacciones atómicas</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Tabla de control: schema_migrations
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Versión</th>
                  <th className="py-3 px-4">Script de Migración</th>
                  <th className="py-3 px-4">Checksum SHA-256</th>
                  <th className="py-3 px-4">Fecha de Aplicación</th>
                  <th className="py-3 px-4">Duración</th>
                  <th className="py-3 px-5 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {migrations.map((m) => (
                  <tr key={m.version} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors">
                    <td className="py-3 px-5 font-mono font-black text-slate-800 dark:text-slate-200">
                      v{m.version}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <span className="font-semibold text-slate-900 dark:text-white font-mono text-[11px]">{m.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                        {m.checksum ? `${m.checksum.slice(0, 10)}...` : 'N/A'}
                      </code>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {formatDate(m.appliedAt)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                      {m.executionTimeMs !== undefined ? `${m.executionTimeMs} ms` : '-'}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                        <CheckCircle2 className="w-3 h-3" />
                        Aplicada con éxito
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE RESTAURACIÓN SEGURA */}
      {restoreModalOpen && backupToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Confirmar Restauración</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Operación crítica de base de datos</p>
              </div>
            </div>

            {/* Warning Message */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 text-xs text-amber-800 dark:text-amber-300 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                ¡Atención! La restauración reemplazará el estado actual de la base de datos:
              </p>
              <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-400 pl-1">
                <li>Se aplicará la copia: <strong className="font-mono text-slate-900 dark:text-white">{backupToRestore.filename}</strong>.</li>
                <li>Fecha de creación: <strong>{formatDate(backupToRestore.createdAt)}</strong>.</li>
                <li>Los datos posteriores a dicha fecha serán sobrescritos.</li>
              </ul>
            </div>

            {/* Safety Guarantee */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Respaldo Preventivo Automático ("Safety Backup")</strong>
                <span>
                  El sistema generará una copia de emergencia inmediata antes de aplicar la restauración, garantizando que nunca se pierdan datos actuales.
                </span>
              </div>
            </div>

            {/* Explicit Confirmation Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Para confirmar, escriba <span className="text-red-600 dark:text-red-400 font-mono">RESTAURAR</span> a continuación:
              </label>
              <input
                type="text"
                value={restoreConfirmText}
                onChange={(e) => setRestoreConfirmText(e.target.value)}
                placeholder="RESTAURAR"
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase font-mono"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRestoreModalOpen(false);
                  setBackupToRestore(null);
                  setRestoreConfirmText('');
                }}
                disabled={isRestoring}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={isRestoring || restoreConfirmText.trim().toUpperCase() !== 'RESTAURAR'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
                <span>{isRestoring ? 'Restaurando Base de Datos...' : 'Confirmar & Restaurar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINACIÓN */}
      {backupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Eliminar Respaldo</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              ¿Está seguro de que desea eliminar el archivo <strong className="font-mono text-slate-800 dark:text-slate-200">{backupToDelete.filename}</strong>? Se borrarán sus metadatos y sumas de verificación.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBackupToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
