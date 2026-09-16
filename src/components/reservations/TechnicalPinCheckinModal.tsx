import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  KeyRound, 
  QrCode,
  Camera,
  Upload,
  RotateCw,
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Sparkles,
  User,
  RefreshCw
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { TechnicalAcademyHistoryRecord, UserAccount, Participant } from '../../types';
import { apiService } from '../../services/api';
import { formatDateShort } from '../../utils/formatters';

interface TechnicalPinCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  training: TechnicalAcademyHistoryRecord | null;
  currentUser: UserAccount | null;
  currentParticipant?: Participant | null;
  onSuccess: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const TechnicalPinCheckinModal: React.FC<TechnicalPinCheckinModalProps> = ({
  isOpen,
  onClose,
  training,
  currentUser,
  currentParticipant,
  onSuccess,
  onShowToast
}) => {
  if (!isOpen || !training) return null;

  const [activeTab, setActiveTab] = useState<'qr' | 'pin'>('qr');
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isStoppingRef = useRef(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const participantCard = currentParticipant?.card || currentUser?.cedula || '';
  const participantIdentifier = participantCard || currentUser?.email || '';

  // Detener escáner con seguridad
  const stopScannerSafe = async () => {
    if (!html5QrCodeRef.current || isStoppingRef.current) return;
    try {
      isStoppingRef.current = true;
      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
      await html5QrCodeRef.current.clear();
    } catch (err) {
      console.warn('Advertencia al detener escáner QR:', err);
    } finally {
      setIsScanning(false);
      isStoppingRef.current = false;
    }
  };

  const handleClose = async () => {
    await stopScannerSafe();
    onClose();
  };

  // Listener accesible de teclado (Escape)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const switchTab = async (tab: 'qr' | 'pin') => {
    if (tab === activeTab) return;
    setErrorMessage(null);
    setScannerError(null);
    if (activeTab === 'qr') {
      await stopScannerSafe();
    }
    setActiveTab(tab);
  };

  // Procesar Check-in en el backend
  const executeCheckIn = async (pinValue: string, dateValue: string = todayStr) => {
    if (!pinValue.trim()) {
      setErrorMessage('Por favor ingresa o escanea el código PIN proyectado.');
      return;
    }

    if (!participantIdentifier) {
      setErrorMessage('No se encontró carnet ni cédula del colaborador.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setScannerError(null);

    try {
      const res = await apiService.checkInTechnicalQr(training.cohortId, {
        identifier: participantIdentifier,
        pin: pinValue.trim(),
        sessionDate: dateValue
      });

      setSuccessMessage(res.message || '¡Asistencia confirmada para hoy!');
      onShowToast('¡Asistencia Confirmada!', `Has registrado tu asistencia para ${training.title}`, 'success');
      onSuccess();

      // Cerrar modal automáticamente tras 1.4 segundos para feedback visual
      setTimeout(async () => {
        await stopScannerSafe();
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('Error al registrar asistencia por PIN/QR:', err);
      const msg = err.message || 'Error al validar el código. Verifica el número proyectado en sala.';
      setErrorMessage(msg);
      onShowToast('Código Inválido', msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Procesar resultado escaneado de QR
  const handleQrDetected = async (decodedText: string) => {
    if (isSubmitting || Boolean(successMessage)) return;

    try {
      let extractedPin = '';
      let extractedCohortId = '';
      let extractedDate = todayStr;

      const cleanText = decodedText.trim();

      // 1. Caso JSON (formato emitido por TechnicalQrModal)
      if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
        try {
          const parsed = JSON.parse(cleanText);
          if (parsed.cohortId) extractedCohortId = parsed.cohortId;
          if (parsed.pin) extractedPin = String(parsed.pin);
          if (parsed.date) extractedDate = parsed.date;
        } catch (e) {
          console.warn('Error parseando JSON de QR:', e);
        }
      } 
      // 2. Caso URL o Query params
      else if (cleanText.includes('?') || cleanText.startsWith('http')) {
        try {
          const url = new URL(cleanText.startsWith('http') ? cleanText : `https://dummy.com${cleanText}`);
          extractedCohortId = url.searchParams.get('cohortId') || url.searchParams.get('cohort') || '';
          extractedPin = url.searchParams.get('pin') || '';
          extractedDate = url.searchParams.get('date') || todayStr;
        } catch {}
      } 
      // 3. Caso texto simple o PIN numérico
      else if (/^\d{4,8}$/.test(cleanText)) {
        extractedPin = cleanText;
      }

      // Validar si el código QR pertenece a otra cohorte
      if (extractedCohortId && extractedCohortId !== training.cohortId) {
        setScannerError(`El código QR proyectado pertenece a otra cohorte o entrenamiento.`);
        return;
      }

      if (!extractedPin) {
        setScannerError('No se encontró un PIN válido en el código QR. Intenta ingresarlo manualmente.');
        return;
      }

      // Detener cámara inmediatamente
      await stopScannerSafe();
      setPin(extractedPin);

      // Ejecutar check-in automático
      await executeCheckIn(extractedPin, extractedDate);
    } catch (err: any) {
      setScannerError(err.message || 'Error al procesar el código QR escaneado.');
    }
  };

  // Inicializar escáner de cámara cuando la pestaña sea 'qr'
  useEffect(() => {
    if (!isOpen || activeTab !== 'qr' || Boolean(successMessage)) return;

    let isMounted = true;

    const startScanner = async () => {
      try {
        setScannerError(null);
        await new Promise(resolve => setTimeout(resolve, 150));
        if (!isMounted) return;

        const scannerElement = document.getElementById('technical-qr-scanner-viewport');
        if (!scannerElement) return;

        if (html5QrCodeRef.current) {
          try {
            if (html5QrCodeRef.current.isScanning) {
              await html5QrCodeRef.current.stop();
            }
            await html5QrCodeRef.current.clear();
          } catch {}
          html5QrCodeRef.current = null;
        }

        const qrInstance = new Html5Qrcode('technical-qr-scanner-viewport');
        html5QrCodeRef.current = qrInstance;

        try {
          const devices = await Html5Qrcode.getCameras();
          if (isMounted && devices && devices.length > 0) {
            setCameras(devices);
            if (!selectedCameraId) {
              const backCam = devices.find(d => 
                d.label.toLowerCase().includes('back') || 
                d.label.toLowerCase().includes('trasera') || 
                d.label.toLowerCase().includes('environment')
              );
              setSelectedCameraId(backCam ? backCam.id : devices[devices.length - 1].id);
            }
          }
        } catch {}

        const cameraConfig = selectedCameraId 
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: 'environment' };

        await qrInstance.start(
          cameraConfig,
          {
            fps: 12,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            if (isMounted) {
              handleQrDetected(decodedText);
            }
          },
          () => {}
        );

        if (isMounted) {
          setIsScanning(true);
        }
      } catch (err: any) {
        console.error('Error al iniciar cámara QR:', err);
        if (isMounted) {
          setScannerError('No se pudo acceder a la cámara. Verifica los permisos del navegador o cambia al modo PIN manual.');
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScannerSafe();
    };
  }, [isOpen, activeTab, selectedCameraId, successMessage]);

  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    await stopScannerSafe();
    setSelectedCameraId(cameras[nextIndex].id);
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScannerError(null);
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('technical-qr-scanner-viewport');
        html5QrCodeRef.current = scanner;
      }

      if (scanner.isScanning) {
        await scanner.stop();
      }

      const decodedText = await scanner.scanFile(file, true);
      await handleQrDetected(decodedText);
    } catch (err: any) {
      setScannerError('No se detectó un código QR nítido en la imagen seleccionada. Intenta con otra foto o usa el PIN.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeCheckIn(pin, todayStr);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tech-checkin-modal-title"
    >
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Cabecera del Modal */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              {activeTab === 'qr' ? <Camera className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400">
                <Sparkles className="w-3 h-3" />
                <span>Academia Técnica</span>
                <span className="text-white/40">•</span>
                <span className="text-emerald-400">Check-In Presencial</span>
              </div>
              <h3 id="tech-checkin-modal-title" className="text-base font-black tracking-tight text-white">
                Registro de Asistencia Diaria
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Cerrar modal de asistencia"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Pestañas: QR vs PIN (Áreas de toque mín. 44px) */}
        <div className="p-3 pb-0 bg-slate-50 border-b border-slate-200/80 shrink-0">
          <div className="flex bg-slate-200/70 p-1 rounded-2xl gap-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'qr'}
              onClick={() => switchTab('qr')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'qr'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-4 h-4 text-claro" />
              <span>Escanear QR</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'pin'}
              onClick={() => switchTab('pin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pin'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span>Ingresar PIN</span>
            </button>
          </div>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Tarjeta de Información del Entrenamiento */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-900 line-clamp-1">
                {training.title}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                {training.groupName || 'Cohorte General'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-claro" />
                Hoy: {formatDateShort(todayStr)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                {training.time}
              </span>
              {training.facilitatorName && (
                <>
                  <span>•</span>
                  <span>Facilitador: <strong className="text-slate-800">{training.facilitatorName}</strong></span>
                </>
              )}
            </div>
          </div>

          {/* Tarjeta de Identificación del Participante */}
          <div className="p-3 bg-red-50/60 border border-red-100 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-claro text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              <User className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-900">
                {currentParticipant?.name || currentUser?.name}
              </p>
              <p className="text-[11px] text-slate-600 font-medium">
                Carnet / Identificador: <strong className="font-mono text-slate-800">{participantCard || 'Sin carnet'}</strong>
              </p>
            </div>
          </div>

          {/* ESTADO: ASISTENCIA EXITOSA */}
          {successMessage ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">¡Asistencia Verificada!</p>
                <p className="text-sm font-black text-slate-900 mt-1">{successMessage}</p>
              </div>
              <p className="text-xs text-slate-600 font-medium">Cerrando ventana de confirmación...</p>
            </div>
          ) : (
            <>
              {/* PESTAÑA 1: ESCANEAR CÓDIGO QR */}
              {activeTab === 'qr' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-h-64 sm:max-h-72 w-full flex items-center justify-center border-2 border-slate-800 shadow-inner">
                    <div id="technical-qr-scanner-viewport" className="w-full h-full" />
                    
                    {/* Guía visual de enfoque */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-44 h-44 sm:w-48 sm:h-48 border-2 border-dashed border-red-500/80 rounded-2xl animate-pulse flex items-center justify-center">
                        <span className="text-[10px] text-white/90 bg-black/70 px-2.5 py-0.5 rounded-full backdrop-blur-xs font-semibold">
                          Centra el código QR aquí
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Feedback de error de escáner */}
                  {scannerError && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2 animate-in fade-in">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span className="font-medium leading-relaxed">{scannerError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => switchTab('pin')}
                        className="w-full py-2.5 px-3 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center"
                      >
                        Cambiar a Ingreso de PIN Manual
                      </button>
                    </div>
                  )}

                  {/* Controles de Cámara y Subida de Archivo (Áreas de toque mín. 44px) */}
                  <div className="flex items-center gap-2 pt-1">
                    {cameras.length > 1 && (
                      <button
                        type="button"
                        onClick={handleSwitchCamera}
                        className="flex-1 py-2.5 px-3 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCw className="w-4 h-4 text-slate-600" />
                        <span>Cambiar Cámara</span>
                      </button>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileScan}
                      className="hidden"
                      id="technical-qr-file-upload"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2.5 px-3 min-h-[44px] rounded-xl bg-red-50 hover:bg-red-100 text-claro border border-red-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-claro" />
                      <span>Subir Foto de QR</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-center text-slate-600 font-medium pt-1">
                    Apunta la cámara al código QR proyectado por el facilitador en sala.
                  </p>
                </div>
              )}

              {/* PESTAÑA 2: INGRESO MANUAL DE PIN */}
              {activeTab === 'pin' && (
                <form onSubmit={handleSubmitManual} className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-2 text-center">
                    <label htmlFor="technical-pin-input" className="block text-xs font-black text-slate-700 uppercase tracking-wide">
                      Código / PIN Proyectado en Pantalla
                    </label>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Ingresa el número de 4 dígitos que tu facilitador tiene proyectado en la sala.
                    </p>

                    <div className="pt-1">
                      <input
                        id="technical-pin-input"
                        type="text"
                        autoFocus
                        maxLength={8}
                        value={pin}
                        onChange={(e) => {
                          setPin(e.target.value.toUpperCase());
                          setErrorMessage(null);
                        }}
                        placeholder="••••"
                        className="w-full text-center font-mono text-3xl font-black tracking-widest py-3 px-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-claro focus:ring-4 focus:ring-claro/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* Mensajes de Feedback de PIN */}
                  {errorMessage && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Botones de Acción (min 44px de altura táctil) */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || !pin.trim()}
                      className="px-6 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-claro to-claro-600 hover:from-claro-600 hover:to-claro-700 text-white text-xs font-bold transition-all shadow-md shadow-red-500/25 cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Validando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirmar Asistencia</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  );
};
