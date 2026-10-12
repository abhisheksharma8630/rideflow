import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from './api';
import { getToken } from './storage';
import { SOCKET_EVENTS } from '../types';

/**
 * Singleton Socket.IO connection. Authenticated via the stored JWT.
 * Automatically reconnects; callers should refetch ride state on reconnect.
 */
let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket && socket.connected) return socket;
  const token = await getToken();
  socket = io(getApiBaseUrl(), {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

/** Ask the server to add us to a ride room (server verifies access). */
export function subscribeRide(rideId: string): void {
  socket?.emit(SOCKET_EVENTS.SUBSCRIBE_RIDE, { rideId });
}
