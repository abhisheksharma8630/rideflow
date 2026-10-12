import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Paginated, RideDTO, SOCKET_EVENTS } from '@rideflow/shared-types';
import { PrismaService } from '../common/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { haversineKm } from '../common/geo';
import { paginate } from '../common/pagination';
import { FareService } from '../fares/fare.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { SimulationService } from '../dispatch/simulation.service';
import { JwtUser } from '../common/decorators';
import { RideStateMachine } from './ride-state-machine';
import { rideInclude, toRideDTO } from './ride.mapper';
import { CancelRideDto, CreateRideDto, RateRideDto, RideListQuery } from './dto';

@Injectable()
export class RidesService {
  private readonly logger = new Logger('Rides');

  constructor(
    private readonly prisma: PrismaService,
    private readonly fares: FareService,
    private readonly dispatch: DispatchService,
    private readonly simulation: SimulationService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private async loadDTO(rideId: string): Promise<RideDTO> {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId }, include: rideInclude });
    if (!ride) throw new NotFoundException('Ride not found');
    return toRideDTO(ride);
  }

  private async broadcast(dto: RideDTO): Promise<void> {
    this.realtime.emitToRide(dto.id, SOCKET_EVENTS.RIDE_UPDATE, dto);
    this.realtime.emitToUser(dto.customerId, SOCKET_EVENTS.RIDE_UPDATE, dto);
    if (dto.driverId) this.realtime.emitToDriver(dto.driverId, SOCKET_EVENTS.RIDE_UPDATE, dto);
    this.realtime.emitToAdmins(SOCKET_EVENTS.ADMIN_RIDE_UPDATE, dto);
  }

  // ---------------------------------------------------------------------------
  // Customer: create a ride
  // ---------------------------------------------------------------------------
  async create(customerId: string, dto: CreateRideDto): Promise<RideDTO> {
    // Prevent duplicate active bookings (also guards double-tap).
    const existing = await this.prisma.ride.findFirst({
      where: {
        customerId,
        status: { in: ['REQUESTED', 'SEARCHING', 'ACCEPTED', 'ARRIVED_AT_PICKUP', 'IN_PROGRESS'] },
      },
    });
    if (existing) {
      throw new ConflictException('You already have an active ride in progress');
    }

    const rule = await this.fares.getRule(dto.vehicleCategory);
    if (!rule.enabled) throw new BadRequestException(`${dto.vehicleCategory} is unavailable`);

    const pickup = { latitude: dto.pickup.latitude, longitude: dto.pickup.longitude };
    const destination = {
      latitude: dto.destination.latitude,
      longitude: dto.destination.longitude,
    };
    const distanceKm = haversineKm(pickup, destination);
    if (distanceKm <= 0) throw new BadRequestException('Pickup and destination are identical');

    const durationMinutes = FareService.estimateDurationMinutes(dto.vehicleCategory, distanceKm);
    const fare = FareService.compute(dto.vehicleCategory, distanceKm, durationMinutes, rule, true);

    const ride = await this.prisma.ride.create({
      data: {
        customerId,
        vehicleCategory: dto.vehicleCategory,
        pickupAddress: dto.pickupAddress,
        pickupLat: pickup.latitude,
        pickupLng: pickup.longitude,
        destinationAddress: dto.destinationAddress,
        destinationLat: destination.latitude,
        destinationLng: destination.longitude,
        estimatedDistanceKm: fare.distanceKm,
        estimatedDurationMinutes: fare.durationMinutes,
        estimatedFare: fare.total,
        // fare snapshot
        snapshotBaseFare: rule.baseFare,
        snapshotPerKmRate: rule.perKmRate,
        snapshotPerMinuteRate: rule.perMinuteRate,
        snapshotMinimumFare: rule.minimumFare,
        estimatedWithoutRouting: true,
        status: 'SEARCHING',
        payment: {
          create: {
            amount: fare.total,
            method: dto.paymentMethod ?? 'CASH',
            status: 'PENDING',
          },
        },
      },
      include: rideInclude,
    });

    const dtoOut = toRideDTO(ride);
    this.realtime.emitToUser(customerId, SOCKET_EVENTS.RIDE_UPDATE, dtoOut);
    this.realtime.emitToAdmins(SOCKET_EVENTS.ADMIN_RIDE_UPDATE, dtoOut);

    // Kick off dispatch (async, non-blocking for the HTTP response).
    void this.dispatch.startDispatch(ride.id).catch((e) => this.logger.error(e));
    return dtoOut;
  }

  // ---------------------------------------------------------------------------
  // Ownership-checked read
  // ---------------------------------------------------------------------------
  async getOne(user: JwtUser, rideId: string): Promise<RideDTO> {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId }, include: rideInclude });
    if (!ride) throw new NotFoundException('Ride not found');
    const allowed =
      user.role === 'ADMIN' ||
      ride.customerId === user.userId ||
      (user.driverId != null && ride.driverId === user.driverId);
    if (!allowed) throw new ForbiddenException('You cannot view this ride');
    return toRideDTO(ride);
  }

  async listForUser(user: JwtUser, query: RideListQuery): Promise<Paginated<RideDTO>> {
    const where: Prisma.RideWhereInput = {};
    if (user.role === 'CUSTOMER') where.customerId = user.userId;
    else if (user.role === 'DRIVER') where.driverId = user.driverId ?? '__none__';
    if (query.status) where.status = query.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ride.findMany({
        where,
        include: rideInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.ride.count({ where }),
    ]);
    return paginate(items.map(toRideDTO), total, query.page, query.pageSize);
  }

  // ---------------------------------------------------------------------------
  // Driver: accept (concurrency-safe)
  // ---------------------------------------------------------------------------
  async accept(driverId: string, rideId: string): Promise<RideDTO> {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');
    if (driver.approvalStatus !== 'APPROVED') {
      throw new ForbiddenException('Driver is not approved to accept rides');
    }

    // Transaction with conditional updates guarantees exactly one winner and
    // that the driver is not already on another trip.
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Claim the ride only if still unassigned & searching.
      const claimed = await tx.ride.updateMany({
        where: { id: rideId, status: 'SEARCHING', driverId: null },
        data: { status: 'ACCEPTED', driverId, acceptedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new ConflictException('Ride is no longer available');
      }

      // 2. Mark driver ON_TRIP only if currently ONLINE (not already on a trip).
      const driverClaim = await tx.driver.updateMany({
        where: { id: driverId, availabilityStatus: 'ONLINE' },
        data: { availabilityStatus: 'ON_TRIP' },
      });
      if (driverClaim.count === 0) {
        // Roll back the ride claim by throwing (transaction aborts).
        throw new ConflictException('Driver is not available to accept this ride');
      }

      // 3. Resolve offers.
      await tx.rideOffer.updateMany({
        where: { rideId, driverId, status: 'PENDING' },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });
      await tx.rideOffer.updateMany({
        where: { rideId, status: 'PENDING', NOT: { driverId } },
        data: { status: 'CANCELLED', respondedAt: new Date() },
      });

      return tx.ride.findUnique({ where: { id: rideId }, include: rideInclude });
    });

    this.dispatch.clearTimer(rideId);
    const dto = toRideDTO(result!);
    await this.broadcast(dto);
    return dto;
  }

  async reject(driverId: string, rideId: string): Promise<{ ok: true }> {
    const offer = await this.prisma.rideOffer.findUnique({
      where: { rideId_driverId: { rideId, driverId } },
    });
    if (!offer) throw new NotFoundException('No offer for this ride');
    if (offer.status === 'PENDING') {
      await this.prisma.rideOffer.update({
        where: { id: offer.id },
        data: { status: 'REJECTED', respondedAt: new Date() },
      });
    }
    // Move to next candidate (idempotent-safe).
    void this.dispatch.handleRejection(rideId, driverId).catch((e) => this.logger.error(e));
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // Driver: lifecycle transitions
  // ---------------------------------------------------------------------------
  private async assertAssignedDriver(driverId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.driverId !== driverId) {
      throw new ForbiddenException('You are not assigned to this ride');
    }
    return ride;
  }

  async arrive(driverId: string, rideId: string): Promise<RideDTO> {
    const ride = await this.assertAssignedDriver(driverId, rideId);
    const next = RideStateMachine.nextStatus(ride.status, 'ARRIVE');
    await this.prisma.ride.update({
      where: { id: rideId },
      data: { status: next, arrivedAt: new Date() },
    });
    const dto = await this.loadDTO(rideId);
    await this.broadcast(dto);
    return dto;
  }

  async start(driverId: string, rideId: string): Promise<RideDTO> {
    const ride = await this.assertAssignedDriver(driverId, rideId);
    const next = RideStateMachine.nextStatus(ride.status, 'START');
    await this.prisma.ride.update({
      where: { id: rideId },
      data: { status: next, startedAt: new Date() },
    });
    const dto = await this.loadDTO(rideId);
    await this.broadcast(dto);

    // Begin server-controlled simulated movement; completes the ride when it arrives.
    this.simulation.start({
      rideId,
      driverId,
      customerId: ride.customerId,
      pickup: { latitude: ride.pickupLat, longitude: ride.pickupLng },
      destination: { latitude: ride.destinationLat, longitude: ride.destinationLng },
      onArrived: async () => {
        await this.complete(driverId, rideId).catch((e) => this.logger.error(e));
      },
    });
    return dto;
  }

  async complete(driverId: string, rideId: string): Promise<RideDTO> {
    const ride = await this.assertAssignedDriver(driverId, rideId);
    // Idempotent: if already completed, just return current state.
    if (ride.status === 'COMPLETED') return this.loadDTO(rideId);

    const next = RideStateMachine.nextStatus(ride.status, 'COMPLETE');

    // Final fare computed on the backend from the snapshot (never trust client).
    const finalFareBreakdown = FareService.compute(
      ride.vehicleCategory,
      ride.estimatedDistanceKm,
      ride.estimatedDurationMinutes,
      {
        baseFare: ride.snapshotBaseFare,
        perKmRate: ride.snapshotPerKmRate,
        perMinuteRate: ride.snapshotPerMinuteRate,
        minimumFare: ride.snapshotMinimumFare,
      },
      ride.estimatedWithoutRouting,
    );

    this.simulation.stop(rideId);

    await this.prisma.$transaction(async (tx) => {
      await tx.ride.update({
        where: { id: rideId },
        data: { status: next, completedAt: new Date(), finalFare: finalFareBreakdown.total },
      });
      await tx.payment.updateMany({
        where: { rideId },
        data: { amount: finalFareBreakdown.total, status: 'COLLECTED' },
      });
      await tx.driver.update({
        where: { id: driverId },
        data: { availabilityStatus: 'ONLINE', totalTrips: { increment: 1 } },
      });
    });

    const dto = await this.loadDTO(rideId);
    this.realtime.emitToRide(rideId, SOCKET_EVENTS.RIDE_COMPLETED, dto);
    await this.broadcast(dto);
    return dto;
  }

  // ---------------------------------------------------------------------------
  // Cancellation (customer or assigned driver)
  // ---------------------------------------------------------------------------
  async cancel(user: JwtUser, rideId: string, dto: CancelRideDto): Promise<RideDTO> {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');

    const isCustomer = ride.customerId === user.userId;
    const isDriver = user.driverId != null && ride.driverId === user.driverId;
    if (!isCustomer && !isDriver && user.role !== 'ADMIN') {
      throw new ForbiddenException('You cannot cancel this ride');
    }

    if (!RideStateMachine.canTransition(ride.status, 'CANCEL')) {
      // Idempotent for already-cancelled.
      if (ride.status === 'CANCELLED') return this.loadDTO(rideId);
      throw new BadRequestException(`Ride cannot be cancelled from status ${ride.status}`);
    }

    this.dispatch.clearTimer(rideId);
    this.simulation.stop(rideId);

    await this.prisma.$transaction(async (tx) => {
      await tx.ride.update({
        where: { id: rideId },
        data: {
          status: 'CANCELLED',
          cancellationReason: dto.reason ?? (isDriver ? 'Cancelled by driver' : 'Cancelled by customer'),
          cancelledBy: isDriver ? 'DRIVER' : isCustomer ? 'CUSTOMER' : 'ADMIN',
        },
      });
      await tx.rideOffer.updateMany({
        where: { rideId, status: 'PENDING' },
        data: { status: 'CANCELLED', respondedAt: new Date() },
      });
      await tx.payment.updateMany({ where: { rideId }, data: { status: 'FAILED' } });
      if (ride.driverId) {
        await tx.driver.updateMany({
          where: { id: ride.driverId, availabilityStatus: 'ON_TRIP' },
          data: { availabilityStatus: 'ONLINE' },
        });
      }
    });

    const result = await this.loadDTO(rideId);
    this.realtime.emitToRide(rideId, SOCKET_EVENTS.RIDE_CANCELLED, result);
    await this.broadcast(result);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Rating
  // ---------------------------------------------------------------------------
  async rate(customerId: string, rideId: string, dto: RateRideDto): Promise<{ ok: true }> {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.customerId !== customerId) throw new ForbiddenException('Not your ride');
    if (ride.status !== 'COMPLETED') throw new BadRequestException('Only completed rides can be rated');
    if (!ride.driverId) throw new BadRequestException('Ride has no driver to rate');

    const existing = await this.prisma.rating.findUnique({ where: { rideId } });
    if (existing) throw new ConflictException('Ride already rated');

    await this.prisma.$transaction(async (tx) => {
      await tx.rating.create({
        data: {
          rideId,
          customerId,
          driverId: ride.driverId!,
          score: dto.score,
          comment: dto.comment,
        },
      });
      // Recompute driver average rating.
      const agg = await tx.rating.aggregate({
        where: { driverId: ride.driverId! },
        _avg: { score: true },
      });
      await tx.driver.update({
        where: { id: ride.driverId! },
        data: { rating: Math.round((agg._avg.score ?? 5) * 10) / 10 },
      });
    });
    return { ok: true };
  }
}
