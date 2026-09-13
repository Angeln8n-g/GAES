import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export interface AttendanceWsMessage {
  type: 'ATTENDANCE_CHECK_IN' | 'ATTENDANCE_CHECK_OUT' | 'ATTENDANCE_REVERT' | 'EVENTS_UPDATED';
  eventId?: string;
  date?: string;
  time?: string;
  email?: string;
  participantCard?: string;
  participantName?: string;
  timestamp: string;
  checkInAt?: string;
  checkOutAt?: string;
  isCompleted?: boolean;
  message?: string;
  events?: any[];
}

interface ExtWebSocket extends WebSocket {
  isAlive: boolean;
}

let wss: WebSocketServer | null = null;

/**
 * Inicializa el servidor WebSocket adjunto al servidor HTTP
 */
export function initWebSocketServer(server: HttpServer) {
  wss = new WebSocketServer({ 
    server, 
    path: '/ws' 
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const extWs = ws as ExtWebSocket;
    extWs.isAlive = true;

    // Enviar mensaje de bienvenida
    extWs.send(JSON.stringify({
      type: 'CONNECTION_ESTABLISHED',
      message: 'Conectado al servicio de sincronización en tiempo real de CapacitaHub',
      timestamp: new Date().toISOString()
    }));

    extWs.on('pong', () => {
      extWs.isAlive = true;
    });

    extWs.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === 'PING') {
          extWs.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
        }
      } catch {
        // Mensaje no JSON, ignorar
      }
    });

    extWs.on('close', () => {
      // Cliente desconectado
    });

    extWs.on('error', (err) => {
      console.error('Error en WebSocket client:', err);
    });
  });

  // Heartbeat ping-pong cada 30 segundos
  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtWebSocket;
      if (extWs.isAlive === false) {
        return extWs.terminate();
      }
      extWs.isAlive = false;
      extWs.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  console.log('⚡ Servidor WebSocket inicializado en /ws');
}

/**
 * Emite un evento en tiempo real a todos los clientes WebSocket conectados
 */
export function broadcastAttendanceEvent(message: AttendanceWsMessage) {
  if (!wss) return;

  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err) {
        console.error('Error al enviar mensaje WebSocket a cliente:', err);
      }
    }
  });
}

/**
 * Obtiene el conteo de clientes WebSocket activos
 */
export function getConnectedClientsCount(): number {
  return wss ? wss.clients.size : 0;
}
