import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS, UserRole } from '@rideflow/shared-types';
import { PrismaService } from '../common/prisma.service';

interface SocketUser {
  userId: string;
  role: UserRole;
  driverId?: string | null;
}

/**
 * Authenticated Socket.IO gateway.
 * - Token supplied via handshake auth.token or ?token= query.
 * - Server controls room membership. Clients may subscribe to a ride room
 *   ONLY if they are the ride's customer or assigned driver, or an admin.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger('Realtime');

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);
      if (!token) {
        client.disconnect(true);
        return;
      }
      const payload = await this.jwt.verifyAsync<SocketUser & { sub?: string }>(token);
      const user: SocketUser = {
        userId: payload.userId ?? (payload.sub as string),
        role: payload.role,
        driverId: payload.driverId ?? null,
      };
      client.data.user = user;

      // Server-controlled rooms
      client.join(`user:${user.userId}`);
      if (user.role === 'DRIVER' && user.driverId) {
        client.join(`driver:${user.driverId}`);
      }
      if (user.role === 'ADMIN') {
        client.join('admin');
      }
      this.logger.log(`Socket connected: ${user.role} ${user.userId}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const user = client.data.user as SocketUser | undefined;
    if (user) this.logger.log(`Socket disconnected: ${user.userId}`);
  }

  /** Client requests to follow a ride. Access is verified server-side. */
  @SubscribeMessage(SOCKET_EVENTS.SUBSCRIBE_RIDE)
  async subscribeRide(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { rideId: string },
  ): Promise<{ ok: boolean; error?: string }> {
    const user = client.data.user as SocketUser | undefined;
    if (!user || !body?.rideId) return { ok: false, error: 'unauthorized' };

    const ride = await this.prisma.ride.findUnique({
      where: { id: body.rideId },
      select: { customerId: true, driverId: true },
    });
    if (!ride) return { ok: false, error: 'ride_not_found' };

    const allowed =
      user.role === 'ADMIN' ||
      ride.customerId === user.userId ||
      (user.driverId != null && ride.driverId === user.driverId);

    if (!allowed) return { ok: false, error: 'forbidden' };
    client.join(`ride:${body.rideId}`);
    return { ok: true };
  }

  // --- Emit helpers used by services (persist-then-broadcast) ---

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  emitToDriver(driverId: string, event: string, payload: unknown): void {
    this.server?.to(`driver:${driverId}`).emit(event, payload);
  }

  emitToRide(rideId: string, event: string, payload: unknown): void {
    this.server?.to(`ride:${rideId}`).emit(event, payload);
  }

  emitToAdmins(event: string, payload: unknown): void {
    this.server?.to('admin').emit(event, payload);
  }
}
