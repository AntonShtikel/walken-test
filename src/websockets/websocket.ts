import WebSocket from 'ws';
import { wsPort } from '../config';

const wss = new WebSocket.Server({ port: wsPort });

export function setupWebSocketServer() {
  wss.on('connection', (ws) => {
    console.log('New connection');

    ws.on('message', (message) => {
      console.log('Received:', message);
    });

    ws.on('close', () => {
      console.log('Connection closed');
    });
  });
}

export function pushToWSocket(data: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}
