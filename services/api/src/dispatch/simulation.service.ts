import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SOCKET_EVENTS } from '@rideflow/shared-types';
import { PrismaService } from '../common/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { bearing, interpolate } from '../common/geo';

/**
 * Server-controlled SIMULATED driver movement (NOT production GPS).
 * One interval per active ride. Interpolates between pickup and destination,
 * broadcasting location each tick but writing to the DB only occasionally
 * (every few ticks) to avoid excessive writes. Deterministic step count so
 * the demo is repeatable.
 */
@Injectable()
export class SimulationService implements OnModuleDestroy {
  private readonly logger = new Logger('Simulation');
  private readonly jobs = new Map<string, NodeJS.Timeout>();
  private static readonly TOTAL_STEPS = 20; // deterministic trip length

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly config: ConfigService,
  ) {}

  onModuleDestroy(): void {
    this.stopAll();
  }

  private get tickMs(): number {
    return Number(this.config.get('SIM_TICK_MS')) || 2000;
  }

  isRunning(rideId: string): boolean {
    return this.jobs.has(rideId);
  }

  /**
   * Start simulating movement along pickup->destination for an IN_PROGRESS ride.
   * Guard: never create a duplicate job for the same ride.
   */
  start(params: {
    rideId: string;
    driverId: string;
    customerId: string;
    pickup: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number };
    onArrived: () => void | Promise<void>;
  }): void {
    if (this.jobs.has(params.rideId)) return; // no duplicate simulation

    let step = 0;
    const { pickup, destination } = params;

    const tick = async (): Promise<void> => {
      step += 1;
      const t = step / SimulationService.TOTAL_STEPS;
      const pos = interpolate(pickup, destination, t);
      const hdg = bearing(pickup, destination);

      // Broadcast every tick (cheap, in-memory).
      const payload = {
        rideId: params.rideId,
        driverId: params.driverId,
        location: pos,
        bearing: hdg,
      };
      this.realtime.emitToRide(params.rideId, SOCKET_EVENTS.DRIVER_LOCATION, payload);
      this.realtime.emitToUser(params.customerId, SOCKET_EVENTS.DRIVER_LOCATION, payload);

      // Throttled DB write: only every 4th step and on the final step.
      if (step % 4 === 0 || step >= SimulationService.TOTAL_STEPS) {
        await this.prisma.driver
          .update({
            where: { id: params.driverId },
            data: { currentLat: pos.latitude, currentLng: pos.longitude, lastLocationAt: new Date() },
          })
          .catch(() => undefined);
      }

      if (step >= SimulationService.TOTAL_STEPS) {
        this.stop(params.rideId);
        await params.onArrived();
      }
    };

    const timer = setInterval(() => {
      void tick();
    }, this.tickMs);
    this.jobs.set(params.rideId, timer);
    this.logger.log(`Simulation started for ride ${params.rideId}`);
  }

  stop(rideId: string): void {
    const timer = this.jobs.get(rideId);
    if (timer) {
      clearInterval(timer);
      this.jobs.delete(rideId);
      this.logger.log(`Simulation stopped for ride ${rideId}`);
    }
  }

  stopAll(): void {
    for (const t of this.jobs.values()) clearInterval(t);
    this.jobs.clear();
  }
}
