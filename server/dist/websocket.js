"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebSocketServer = initWebSocketServer;
exports.broadcastAttendanceEvent = broadcastAttendanceEvent;
exports.getConnectedClientsCount = getConnectedClientsCount;
const ws_1 = require("ws");
let wss = null;
/**
 * Inicializa el servidor WebSocket adjunto al servidor HTTP
 */
function initWebSocketServer(server) {
    wss = new ws_1.WebSocketServer({
        server,
        path: '/ws'
    });
    wss.on('connection', (ws, req) => {
        const extWs = ws;
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
            }
            catch {
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
        if (!wss)
            return;
        wss.clients.forEach((ws) => {
            const extWs = ws;
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
function broadcastAttendanceEvent(message) {
    if (!wss)
        return;
    const payload = JSON.stringify(message);
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            try {
                client.send(payload);
            }
            catch (err) {
                console.error('Error al enviar mensaje WebSocket a cliente:', err);
            }
        }
    });
}
/**
 * Obtiene el conteo de clientes WebSocket activos
 */
function getConnectedClientsCount() {
    return wss ? wss.clients.size : 0;
}
