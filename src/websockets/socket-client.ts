import { io as Client, Socket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { key, serverUrl } from '../config';
import { handleData } from '../services';

export function connectToSocket() {
  const token = jwt.sign({}, key, { algorithm: 'HS256', expiresIn: '1h' });

  const socket: Socket = Client(serverUrl, {
    transports: ['websocket', 'polling'],
    auth: { token },
  });

  socket.on('connect', () => console.log('Connected to WebSocket server'));
  socket.on('tx', handleData);
  socket.on('disconnect', () =>
    console.log('Disconnected from WebSocket server'),
  );
  socket.on('error', (err) => console.error('Socket error:', err));
  socket.on('connect_error', (err) =>
    console.error('Connection error:', err.message),
  );
}
