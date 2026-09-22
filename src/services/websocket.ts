import { AttendanceWsEvent } from '../types';

type AttendanceEventHandler = (event: AttendanceWsEvent) => void;

class AttendanceWebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Set<AttendanceEventHandler> = new Set();
  private reconnectTimeout: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private isExplicitlyClosed = false;

  constructor() {
    // Auto-conectar al instanciarse en entornos de navegador solo si ya existe sesión autenticada
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('ch_token');
      if (token) {
        this.connect(token);
      }
    }
  }

  public connect(tokenOverride?: string): void {
    if (typeof window === 'undefined') return;

    const token = tokenOverride || (typeof localStorage !== 'undefined' ? localStorage.getItem('ch_token') : null);
    if (!token) {
      return;
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type && data.type !== 'PONG' && data.type !== 'CONNECTION_ESTABLISHED') {
            this.notifyListeners(data as AttendanceWsEvent);
          }
        } catch (err) {
          // Ignorar mensajes no JSON
        }
      };

      this.socket.onclose = () => {
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = () => {
        // En caso de error, el evento onclose subsiguiente gestionará la reconexión
      };
    } catch (err) {
      console.warn('No fue posible abrir la conexión WebSocket inicial:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.isExplicitlyClosed) return;
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('ch_token') : null;
    if (!token) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Límite de reconexiones WebSocket alcanzado. Se reintentará en 60 segundos.');
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts = 0;
        this.connect();
      }, 60000);
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s... max 15s
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public onAttendanceEvent(handler: AttendanceEventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  private notifyListeners(event: AttendanceWsEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error al notificar listener WebSocket:', err);
      }
    });
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const attendanceWs = new AttendanceWebSocketService();
