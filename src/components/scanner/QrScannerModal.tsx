import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  RotateCw, 
  Calendar, 
  Clock, 
  User, 
  Star,
  ExternalLink
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { TrainingEvent, UserAccount } from '../../types';
import { formatDateLong } from '../../utils/formatters';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  events: TrainingEvent[];
  onConfirmAttendance: (eventId: string, date: string, time: string, email: string) => Promise<void>;
  onOpenTecEvaluation: (event: TrainingEvent) => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

interface ParsedQrResult {
  eventId: string;
  date: string;
  time: string;
  event?: TrainingEvent;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  events,
  onConfirmAttendance,
  onOpenTecEvaluation,
  onShowToast
}) => {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingAttendance, setIsProcessingAttendance] = useState(false);
  const [detectedSession, setDetectedSession] = useState<ParsedQrResult | null>(null);
  const [attendanceConfirmed, setAttendanceConfirmed] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isStoppingRef = useRef(false);

  // Parsear texto del código QR
  const parseQrText = (text: string): ParsedQrResult | null => {
    try {
      // 1. Caso JSON
      if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
        const parsed = JSON.parse(text);
        if (parsed.eventId || parsed.event) {
          const eId = parsed.eventId || parsed.event;
          const found = events.find(e => e.id === eId);
          return {
            eventId: eId,
            date: parsed.date || '',
            time: parsed.time || '',
            event: found
          };
        }
      }

      // 2. Caso URL o Query String
      let url: URL | null = null;
      try {
        url = new URL(text);
      } catch {
        try {
          url = new URL(`http://dummy.com${text.startsWith('?') ? text : '?' + text}`);
        } catch {}
      }

      if (url) {
        const params = url.searchParams;
        const eventId = params.get('event') || params.get('eventId');
        const date = params.get('date') || '';
        const time = params.get('time') || '';

        if (eventId) {
          const found = events.find(e => e.id === eventId);
          return {
            eventId,
            date,
            time,
            event: found
          };
        }
      }

      // 3. Si el texto es solo el id del evento (ej: evt_1)
      const directEvent = events.find(e => e.id === text.trim());
      if (directEvent) {
        const firstSchedule = directEvent.schedule[0];
        const firstSlot = firstSchedule?.slots[0];
        return {
          eventId: directEvent.id,
          date: firstSchedule?.date || '',
          time: firstSlot?.time || '',
          event: directEvent
        };
      }

      return null;
    } catch {
      return null;
    }
  };

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
      console.warn('Advertencia al detener escáner:', err);
    } finally {
      setIsScanning(false);
      isStoppingRef.current = false;
    }
  };

  // Procesar código QR detectado
  const handleQrDetected = async (decodedText: string) => {
    const result = parseQrText(decodedText);
    if (!result || !result.eventId) {
      setScannerError(`Código QR detectado, pero no corresponde a un evento de capacitación válido.`);
      return;
    }

    // Detener la cámara una vez detectado
    await stopScannerSafe();
    setDetectedSession(result);

    // Auto-confirmar asistencia
    try {
      setIsProcessingAttendance(true);
      const matchedDate = result.date || result.event?.schedule[0]?.date || '';
      const matchedTime = result.time || result.event?.schedule[0]?.slots[0]?.time || '';

      await onConfirmAttendance(result.eventId, matchedDate, matchedTime, currentUser.email);
      setAttendanceConfirmed(true);
      if (onShowToast) {
        onShowToast('¡Asistencia confirmada!', 'Tu presencia en la sesión ha sido validada.', 'success');
      }
    } catch (err: any) {
      setScannerError(err.message || 'Error al validar la asistencia en el servidor.');
    } finally {
      setIsProcessingAttendance(false);
    }
  };

  // Inicializar escáner de cámara
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const startScanner = async () => {
      try {
        setScannerError(null);
        setDetectedSession(null);
        setAttendanceConfirmed(false);

        // Esperar a que el elemento DOM exista
        await new Promise(resolve => setTimeout(resolve, 150));
        if (!isMounted) return;

        const scannerElement = document.getElementById('qr-scanner-viewport');
        if (!scannerElement) return;

        const qrInstance = new Html5Qrcode('qr-scanner-viewport');
        html5QrCodeRef.current = qrInstance;

        // Obtener cámaras disponibles
        try {
          const devices = await Html5Qrcode.getCameras();
          if (isMounted && devices && devices.length > 0) {
            setCameras(devices);
            if (!selectedCameraId) {
              // Preferir cámara trasera si existe
              const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('trasera'));
              setSelectedCameraId(backCam ? backCam.id : devices[devices.length - 1].id);
            }
          }
        } catch {
          // Si falla enumerar, usar facingMode genérico
        }

        const cameraConfig = selectedCameraId 
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: 'environment' };

        await qrInstance.start(
          cameraConfig,
          {
            fps: 12,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            if (isMounted) {
              handleQrDetected(decodedText);
            }
          },
          () => {
            // Ignorar errores cuadro por cuadro
          }
        );

        if (isMounted) {
          setIsScanning(true);
        }
      } catch (err: any) {
        console.error('Error al iniciar cámara:', err);
        if (isMounted) {
          setScannerError(
            'No se pudo acceder a la cámara. Verifica los permisos de tu navegador o sube una fotografía del código QR.'
          );
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScannerSafe();
    };
  }, [isOpen, selectedCameraId]);

  // Manejador para escanear desde imagen / captura
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScannerError(null);
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('qr-scanner-viewport');
        html5QrCodeRef.current = scanner;
      }

      // Detener cámara si estaba corriendo
      if (scanner.isScanning) {
        await scanner.stop();
      }

      const decodedText = await scanner.scanFile(file, true);
      handleQrDetected(decodedText);
    } catch (err: any) {
      setScannerError('No se detectó un código QR nítido en la imagen seleccionada. Intenta con otra foto.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    await stopScannerSafe();
    setSelectedCameraId(cameras[nextIndex].id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#DA291C] via-red-600 to-red-700 text-white p-5 shrink-0 relative">
          <button
            onClick={() => {
              stopScannerSafe();
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            aria-label="Cerrar escáner"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md">
              Check-In Presencial
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950">
              Cámara Activa
            </span>
          </div>

          <h2 className="text-lg font-black leading-tight">
            Escanear QR de Asistencia
          </h2>
          <p className="text-xs text-red-100 mt-1 font-medium">
            Apunta la cámara al código QR proyectado en la sala de capacitación.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">

          {/* ESTADO: ASISTENCIA DETECTADA Y CONFIRMADA */}
          {detectedSession ? (
            <div className="space-y-4 py-2 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="text-center space-y-1">
                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300">
                  {attendanceConfirmed ? '✓ Asistencia Confirmada' : 'Validando...'}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-2">
                  {detectedSession.event?.title || 'Capacitación Claro'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {currentUser.name} ({currentUser.email})
                </p>
              </div>

              {/* Event Details snippet */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                {detectedSession.event?.instructor && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Facilitador:</span>
                    <strong className="text-slate-900">{detectedSession.event.instructor}</strong>
                  </div>
                )}
                {detectedSession.date && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Fecha de Sesión:</span>
                    <strong className="text-slate-900">{formatDateLong(detectedSession.date)}</strong>
                  </div>
                )}
                {detectedSession.time && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Horario:</span>
                    <strong className="text-[#DA291C]">{detectedSession.time}</strong>
                  </div>
                )}
              </div>

              {/* ACTION: Lanzar Encuesta TEC directamente */}
              {detectedSession.event && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#DA291C]">
                    <Sparkles className="w-4 h-4 text-[#DA291C]" />
                    <span>Evaluación de Calidad TEC</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    Ya confirmaste tu asistencia. Ahora por favor califica al curso y al facilitador para asegurar los estándares de excelencia.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const evt = detectedSession.event;
                      stopScannerSafe();
                      onClose();
                      if (evt) onOpenTecEvaluation(evt);
                    }}
                    className="w-full py-3 bg-[#DA291C] hover:bg-red-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 shadow-md shadow-red-500/25 transition-all cursor-pointer"
                  >
                    <Star className="w-4 h-4 fill-white" />
                    <span>Evaluar Curso y Facilitador Ahora</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  stopScannerSafe();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar Ventana
              </button>
            </div>
          ) : (
            /* ESTADO DE ESCANEO ACTIVO */
            <>
              {/* Viewport de la cámara */}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border-2 border-slate-800 shadow-inner">
                <div id="qr-scanner-viewport" className="w-full h-full" />
                
                {/* Overlay Guía de Enfoque */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-56 border-2 border-dashed border-red-500/80 rounded-2xl animate-pulse flex items-center justify-center">
                    <span className="text-[10px] text-white/70 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs font-semibold">
                      Centra el código QR aquí
                    </span>
                  </div>
                </div>
              </div>

              {/* Mensaje de error si la cámara falla */}
              {scannerError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="font-medium leading-relaxed">{scannerError}</p>
                </div>
              )}

              {/* Controles de cámara y subida de archivo */}
              <div className="flex items-center gap-2 pt-1">
                {cameras.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-slate-600" />
                    <span>Cambiar Cámara</span>
                  </button>
                )}

                {/* Botón Subir Imagen Fallback */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileScan}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-[#DA291C] border border-red-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#DA291C]" />
                  <span>Subir Foto de QR</span>
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-[11px] text-slate-400 font-medium">
                  También puedes escanear con la cámara nativa de tu teléfono si estás desde el móvil.
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
