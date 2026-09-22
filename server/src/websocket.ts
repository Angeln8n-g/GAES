import { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, AuthenticatedUser } from './middlewares/auth';

export interface AttendanceWsMessage {
  type: 
    | 'ATTENDANCE_CHECK_IN' 
    | 'ATTENDANCE_CHECK_OUT' 
    | 'ATTENDANCE_REVERT' 
    | 'EVENTS_UPDATED'
    | 'TECHNICAL_ATTENDANCE_MARKED'
    | 'TECHNICAL_QR_CHECKIN'
    | 'TECHNICAL_GRADES_UPDATED';
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
  cohortId?: string;
  sessionDate?: string;
  status?: string;
  method?: 'manual' | 'qr_scan' | 'pin';
  score?: number | null;
  academicStatus?: string;
  feedback?: string;
}

interface ExtWebSocket extends WebSocket {
  isAlive: boolean;
  user?: AuthenticatedUser;
}

let wss: WebSocketServer | null = null;

/**
 * Inicializa el servidor WebSocket adjunto al servidor HTTP
 */
export function initWebSocketServer(server: HttpServer) {
  wss = new WebSocketServer({ 
    server, 
    path: '/ws',
    verifyClient: (info, callback) => {
      try {
        const req = info.req;
        const host = req.headers.host || 'localhost';
        const url = new URL(req.url || '', `http://${host}`);
        
        let token: string | null | undefined = url.searchParams.get('token');

        if (!token && req.headers['authorization']) {
          const authHeader = req.headers['authorization'];
          if (typeof authHeader === 'string') {
            if (authHeader.startsWith('Bearer ')) {
              token = authHeader.slice(7).trim();
            } else {
              token = authHeader.trim();
            }
          }
        }

        if (!token && req.headers['sec-websocket-protocol']) {
          const rawProtocols = req.headers['sec-websocket-protocol'];
          if (typeof rawProtocols === 'string') {
            const protocols = rawProtocols.split(',').map(p => p.trim());
            token = protocols.find(p => p !== 'Bearer' && p.length > 20);
          }
        }

        if (!token) {
          return callback(false, 401, 'Unauthorized: Missing authentication token');
        }

        const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
        (req as any).user = decoded;
        return callback(true);
      } catch (err) {
        return callback(false, 401, 'Unauthorized: Invalid or expired token');
      }
    }
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const extWs = ws as ExtWebSocket;
    extWs.isAlive = true;
    extWs.user = (req as any).user;

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
