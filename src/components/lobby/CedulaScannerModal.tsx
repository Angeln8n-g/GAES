import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  RotateCw, 
  AlertTriangle, 
  CheckCircle2, 
  CreditCard, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { formatCedula } from '../../utils/formatters';

interface CedulaScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCedulaDetected: (cedula: string) => void;
}

export const CedulaScannerModal: React.FC<CedulaScannerModalProps> = ({
  isOpen,
  onClose,
  onCedulaDetected
}) => {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [detectedCedula, setDetectedCedula] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isStoppingRef = useRef(false);

  // Extraer cédula dominicana de texto escaneado
  const extractCedula = (decodedText: string): string | null => {
    if (!decodedText) return null;

    // 1. Buscar patrón con guiones: 000-0000000-0
    const hyphenMatch = decodedText.match(/\b\d{3}-\d{7}-\d{1}\b/);
    if (hyphenMatch) {
      return hyphenMatch[0];
    }

    // 2. Buscar secuencia continua de 11 dígitos
    const digitsMatch = decodedText.match(/\b\d{11}\b/);
    if (digitsMatch) {
      return formatCedula(digitsMatch[0]);
    }

    // 3. Si el texto tiene caracteres combinados pero contiene al menos 11 dígitos
    const allDigits = decodedText.replace(/\D/g, '');
    if (allDigits.length === 11) {
      return formatCedula(allDigits);
    }
    if (allDigits.length > 11) {
      // Tomar los primeros 11 dígitos
      return formatCedula(allDigits.slice(0, 11));
    }

    // 4. Si es un número de carnet o texto corto
    if (decodedText.trim().length >= 3) {
      return decodedText.trim();
    }

    return null;
  };

  const stopScannerSafe = async () => {
    if (!html5QrCodeRef.current || isStoppingRef.current) return;
    try {
      isStoppingRef.current = true;
      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
      await html5QrCodeRef.current.clear();
    } catch (err) {
      console.warn('Nota al detener escáner de cédula:', err);
    } finally {
      setIsScanning(false);
      isStoppingRef.current = false;
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    const cedula = extractCedula(decodedText);
    if (!cedula) {
      setScannerError('Código detectado, pero no contiene una cédula o identificación válida.');
      return;
    }

    await stopScannerSafe();
    setDetectedCedula(cedula);

    // Notificar al componente padre
    setTimeout(() => {
      onCedulaDetected(cedula);
      onClose();
    }, 600);
  };

  // Inicializar escáner de cámara
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const startScanner = async () => {
      try {
        setScannerError(null);
        setDetectedCedula(null);

        await new Promise(resolve => setTimeout(resolve, 150));
        if (!isMounted) return;

        const scannerElement = document.getElementById('cedula-scanner-viewport');
        if (!scannerElement) return;

        const qrInstance = new Html5Qrcode('cedula-scanner-viewport');
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
            qrbox: { width: 280, height: 180 }, // Formato rectangular tipo tarjeta ID
            aspectRatio: 1.33
          },
          (decodedText) => {
            if (isMounted) {
              handleScanSuccess(decodedText);
            }
          },
          () => {}
        );

        if (isMounted) {
          setIsScanning(true);
        }
      } catch (err: any) {
        console.error('Error al inicializar cámara de cédula:', err);
        if (isMounted) {
          setScannerError(
            'No se pudo acceder a la cámara. Por favor autoriza el permiso en tu navegador o sube una fotografía de tu documento.'
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

  // Manejo de subida de archivo
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScannerError(null);
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('cedula-scanner-viewport');
        html5QrCodeRef.current = scanner;
      }

      if (scanner.isScanning) {
        await scanner.stop();
      }

      const decodedText = await scanner.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch (err: any) {
      setScannerError('No se pudo leer el código de la imagen. Asegúrate de que el código de barras o QR de la cédula esté nítido.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
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
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              Lobby de Recepción
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950">
              Lector Activo
            </span>
          </div>

          <h2 className="text-lg font-black leading-tight">
            Escanear Cédula de Identidad
          </h2>
          <p className="text-xs text-red-100 mt-1 font-medium">
            Apunta la cámara al código de barras o código 2D del reverso de tu cédula física.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          
          {detectedCedula ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Cédula Detectada</p>
                <p className="text-xl font-black text-slate-900 mt-1">{detectedCedula}</p>
              </div>
              <p className="text-xs text-slate-500 font-medium">Cargando tus cursos agendados...</p>
            </div>
          ) : (
            <>
              {/* Viewport de la cámara */}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border-2 border-slate-800 shadow-inner">
                <div id="cedula-scanner-viewport" className="w-full h-full" />
                
                {/* Overlay Guía de Enfoque Rectangular (Cédula ID) */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-36 border-2 border-dashed border-red-500 rounded-2xl animate-pulse flex items-center justify-center">
                    <span className="text-[10px] text-white/80 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs font-semibold">
                      Ubica el código de barras aquí
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

              {/* Controles: Cambiar cámara & Subir foto */}
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
                  <span>Subir Foto Cédula</span>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#DA291C]" />
                  <span>Tip de Recepción:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Si estás en un Kiosco o estación con <strong>pistola lectora de código de barras USB</strong>, puedes escanear directamente con la pistola en el campo de texto de la pantalla principal.
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
