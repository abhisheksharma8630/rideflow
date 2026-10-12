import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SOCKET_EVENTS } from '@rideflow/shared-types';
import { PrismaService } from '../common/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { haversineKm } from '../common/geo';
import { rideInclude, toRideDTO } from '../rides/ride.mapper';

/**
 * Dispatch engine: finds eligible drivers, makes timed offers, and advances to the
 * next candidate on reject/expiry. All assignment happens via concurrency-safe
 * conditional updates in RidesService.accept(); this module only orchestrates offers.
 */
@Injectable()
export class DispatchService implements OnModuleDestroy {
  private readonly logger = new Logger('Dispatch');
  private readonly offerTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly config: ConfigService,
  ) {}

  onModuleDestroy(): void {
    for (const t of this.offerTimers.values()) clearTimeout(t);
    this.offerTimers.clear();
  }

  private get offerTimeoutMs(): number {
    return (Number(this.config.get('OFFER_TIMEOUT_SECONDS')) || 20) * 1000;
  }

  /** Begin dispatch for a ride already in SEARCHING state. */
  async startDispatch(rideId: string): Promise<void> {
    await this.offerNextDriver(rideId, []);
  }

  /**
   * Offer the ride to the nearest eligible driver that hasn't been tried.
   * excludedDriverIds: drivers who already rejected/expired on this ride.
   */
  async offerNextDriver(rideId: string, excludedDriverIds: string[]): Promise<void> {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride || ride.status !== 'SEARCHING') return; // cancelled/assigned elsewhere

    const candidates = await this.prisma.driver.findMany({
      where: {
        approvalStatus: 'APPROVED',
        availabilityStatus: 'ONLINE',
        id: { notIn: excludedDriverIds },
        vehicle: { category: ride.vehicleCategory, status: 'ACTIVE' },
      },
      include: { vehicle: true },
    });

    if (candidates.length === 0) {
      await this.markNoDrivers(rideId);
      return;
    }

    // Rank by distance from pickup (drivers without location go last).
    const pickup = { latitude: ride.pickupLat, longitude: ride.pickupLng };
    const ranked = candidates
      .map((d) => ({
        driver: d,
        distanceKm:
          d.currentLat != null && d.currentLng != null
            ? haversineKm(pickup, { latitude: d.currentLat, longitude: d.currentLng })
            : Number.POSITIVE_INFINITY,
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const chosen = ranked[0];
    const expiresAt = new Date(Date.now() + this.offerTimeoutMs);

    // Persist the offer, then broadcast (persist-then-emit).
    const offer = await this.prisma.rideOffer.upsert({
      where: { rideId_driverId: { rideId, driverId: chosen.driver.id } },
      update: { status: 'PENDING', offeredAt: new Date(), expiresAt, respondedAt: null },
      create: {
        rideId,
        driverId: chosen.driver.id,
        status: 'PENDING',
        expiresAt,
      },
    });

    const distanceToPickupKm =
      chosen.distanceKm === Number.POSITIVE_INFINITY
        ? Math.round(haversineKm(pickup, pickup) * 10) / 10
        : Math.round(chosen.distanceKm * 10) / 10;

    this.realtime.emitToDriver(chosen.driver.id, SOCKET_EVENTS.RIDE_OFFER, {
      id: offer.id,
      rideId: ride.id,
      driverId: chosen.driver.id,
      status: offer.status,
      expiresAt: offer.expiresAt.toISOString(),
      distanceToPickupKm,
      estimatedEarnings: Math.round(ride.estimatedFare * 0.8),
      ride: {
        id: ride.id,
        vehicleCategory: ride.vehicleCategory,
        pickupAddress: ride.pickupAddress,
        destinationAddress: ride.destinationAddress,
        pickupLat: ride.pickupLat,
        pickupLng: ride.pickupLng,
        destinationLat: ride.destinationLat,
        destinationLng: ride.destinationLng,
        estimatedDistanceKm: ride.estimatedDistanceKm,
        estimatedDurationMinutes: ride.estimatedDurationMinutes,
        estimatedFare: ride.estimatedFare,
      },
    });

    this.logger.log(`Offered ride ${rideId} to driver ${chosen.driver.id}`);

    // Schedule expiry -> next candidate.
    this.clearTimer(rideId);
    const timer = setTimeout(() => {
      void this.expireOffer(rideId, offer.id, chosen.driver.id, excludedDriverIds);
    }, this.offerTimeoutMs);
    this.offerTimers.set(rideId, timer);
  }

  private async expireOffer(
    rideId: string,
    offerId: string,
    driverId: string,
    excludedDriverIds: string[],
  ): Promise<void> {
    this.offerTimers.delete(rideId);
    const offer = await this.prisma.rideOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.status !== 'PENDING') return; // already answered

    await this.prisma.rideOffer.update({
      where: { id: offerId },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    });
    this.realtime.emitToDriver(driverId, SOCKET_EVENTS.OFFER_EXPIRED, { rideId, offerId });
    this.logger.log(`Offer ${offerId} expired; trying next driver`);
    await this.offerNextDriver(rideId, [...excludedDriverIds, driverId]);
  }

  /** Called by RidesService when a driver rejects: move on to next candidate. */
  async handleRejection(rideId: string, driverId: string): Promise<void> {
    this.clearTimer(rideId);
    const rejected = await this.prisma.rideOffer.findMany({
      where: { rideId, status: { in: ['REJECTED', 'EXPIRED'] } },
      select: { driverId: true },
    });
    const excluded = Array.from(new Set([...rejected.map((o) => o.driverId), driverId]));
    await this.offerNextDriver(rideId, excluded);
  }

  /** Called by RidesService once a driver has accepted: stop timers. */
  clearTimer(rideId: string): void {
    const t = this.offerTimers.get(rideId);
    if (t) {
      clearTimeout(t);
      this.offerTimers.delete(rideId);
    }
  }

  private async markNoDrivers(rideId: string): Promise<void> {
    this.clearTimer(rideId);
    const ride = await this.prisma.ride.updateMany({
      where: { id: rideId, status: 'SEARCHING' },
      data: { status: 'NO_DRIVERS' },
    });
    if (ride.count > 0) {
      await this.prisma.rideOffer.updateMany({
        where: { rideId, status: 'PENDING' },
        data: { status: 'CANCELLED', respondedAt: new Date() },
      });
      const full = await this.prisma.ride.findUnique({ where: { id: rideId }, include: rideInclude });
      if (full) {
        const dto = toRideDTO(full);
        this.realtime.emitToUser(full.customerId, SOCKET_EVENTS.RIDE_UPDATE, dto);
        this.realtime.emitToRide(rideId, SOCKET_EVENTS.RIDE_UPDATE, dto);
        this.realtime.emitToAdmins(SOCKET_EVENTS.ADMIN_RIDE_UPDATE, dto);
      }
      this.logger.warn(`Ride ${rideId}: no eligible drivers`);
    }
  }
}
