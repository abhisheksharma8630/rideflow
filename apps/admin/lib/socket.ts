import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl, getToken } from './api';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket && socket.connected) return socket;
  socket = io(getApiBaseUrl(), {
    transports: ['websocket'],
    auth: { token: getToken() },
    reconnection: true,
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}
