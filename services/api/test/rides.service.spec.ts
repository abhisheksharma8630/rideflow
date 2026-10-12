import { ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { RidesService } from '../src/rides/rides.service';

/**
 * Unit tests for RidesService business rules using a lightweight mocked Prisma.
 * Covers: ownership, duplicate-booking prevention, concurrency-safe accept,
 * driver authorization, duplicate completion idempotency, cancellation rules.
 */

function makeService(prisma: any) {
  const fares = {
    getRule: jest.fn().mockResolvedValue({
      baseFare: 20,
      perKmRate: 8,
      perMinuteRate: 1,
      minimumFare: 30,
      enabled: true,
    }),
  };
  const dispatch = { startDispatch: jest.fn(), clearTimer: jest.fn(), handleRejection: jest.fn() };
  const simulation = { start: jest.fn(), stop: jest.fn() };
  const realtime = {
    emitToRide: jest.fn(),
    emitToUser: jest.fn(),
    emitToDriver: jest.fn(),
    emitToAdmins: jest.fn(),
  };
  const service = new RidesService(
    prisma as any,
    fares as any,
    dispatch as any,
    simulation as any,
    realtime as any,
  );
  return { service, dispatch, simulation, realtime };
}

const includedRide = {
  id: 'ride1',
  customerId: 'cust1',
  driverId: null,
  vehicleCategory: 'BIKE',
  pickupAddress: 'A',
  pickupLat: 30.7,
  pickupLng: 76.7,
  destinationAddress: 'B',
  destinationLat: 30.75,
  destinationLng: 76.78,
  estimatedDistanceKm: 5,
  estimatedDurationMinutes: 12,
  estimatedFare: 72,
  finalFare: null,
  snapshotBaseFare: 20,
  snapshotPerKmRate: 8,
  snapshotPerMinuteRate: 1,
  snapshotMinimumFare: 30,
  estimatedWithoutRouting: true,
  status: 'SEARCHING',
  cancellationReason: null,
  requestedAt: new Date(),
  acceptedAt: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  customer: { id: 'cust1', name: 'Cust', phone: '9810000001' },
  driver: null,
  payment: null,
};

describe('RidesService ownership & reads', () => {
  it('forbids a customer from viewing another customer ride', async () => {
    const prisma = {
      ride: { findUnique: jest.fn().mockResolvedValue({ ...includedRide }) },
    };
    const { service } = makeService(prisma);
    await expect(
      service.getOne({ userId: 'otherCustomer', role: 'CUSTOMER' } as any, 'ride1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows the owning customer to view their ride', async () => {
    const prisma = {
      ride: { findUnique: jest.fn().mockResolvedValue({ ...includedRide }) },
    };
    const { service } = makeService(prisma);
    const dto = await service.getOne({ userId: 'cust1', role: 'CUSTOMER' } as any, 'ride1');
    expect(dto.id).toBe('ride1');
  });

  it('allows an admin to view any ride', async () => {
    const prisma = {
      ride: { findUnique: jest.fn().mockResolvedValue({ ...includedRide }) },
    };
    const { service } = makeService(prisma);
    const dto = await service.getOne({ userId: 'adminX', role: 'ADMIN' } as any, 'ride1');
    expect(dto.id).toBe('ride1');
  });
});

describe('RidesService.create duplicate prevention', () => {
  it('rejects creating a ride when the customer already has an active one', async () => {
    const prisma = {
      ride: { findFirst: jest.fn().mockResolvedValue({ id: 'active' }) },
    };
    const { service } = makeService(prisma);
    await expect(
      service.create('cust1', {
        vehicleCategory: 'BIKE',
        pickupAddress: 'A',
        pickup: { latitude: 30.7, longitude: 76.7 },
        destinationAddress: 'B',
        destination: { latitude: 30.75, longitude: 76.78 },
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('RidesService.accept concurrency', () => {
  it('throws Conflict when the ride is already claimed (claim count 0)', async () => {
    const tx = {
      ride: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      driver: { updateMany: jest.fn() },
      rideOffer: { updateMany: jest.fn() },
    };
    const prisma = {
      driver: { findUnique: jest.fn().mockResolvedValue({ id: 'drv1', approvalStatus: 'APPROVED' }) },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    const { service } = makeService(prisma);
    await expect(service.accept('drv1', 'ride1')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.driver.updateMany).not.toHaveBeenCalled();
  });

  it('throws Conflict when the driver is not available (driver claim count 0)', async () => {
    const tx = {
      ride: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      driver: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      rideOffer: { updateMany: jest.fn() },
    };
    const prisma = {
      driver: { findUnique: jest.fn().mockResolvedValue({ id: 'drv1', approvalStatus: 'APPROVED' }) },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    const { service } = makeService(prisma);
    await expect(service.accept('drv1', 'ride1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects acceptance by an unapproved driver', async () => {
    const prisma = {
      driver: { findUnique: jest.fn().mockResolvedValue({ id: 'drv1', approvalStatus: 'PENDING' }) },
    };
    const { service } = makeService(prisma);
    await expect(service.accept('drv1', 'ride1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('succeeds and broadcasts when both conditional claims win', async () => {
    const accepted = { ...includedRide, status: 'ACCEPTED', driverId: 'drv1' };
    const tx = {
      ride: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue(accepted),
      },
      driver: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      rideOffer: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      driver: { findUnique: jest.fn().mockResolvedValue({ id: 'drv1', approvalStatus: 'APPROVED' }) },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    const { service, dispatch } = makeService(prisma);
    const dto = await service.accept('drv1', 'ride1');
    expect(dto.status).toBe('ACCEPTED');
    expect(dispatch.clearTimer).toHaveBeenCalledWith('ride1');
  });
});

describe('RidesService driver authorization & completion', () => {
  it('forbids a non-assigned driver from arriving', async () => {
    const prisma = {
      ride: { findUnique: jest.fn().mockResolvedValue({ ...includedRide, driverId: 'someoneElse', status: 'ACCEPTED' }) },
    };
    const { service } = makeService(prisma);
    await expect(service.arrive('drv1', 'ride1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('is idempotent when completing an already-completed ride', async () => {
    const completed = { ...includedRide, driverId: 'drv1', status: 'COMPLETED', finalFare: 72 };
    const prisma = {
      ride: { findUnique: jest.fn().mockResolvedValue(completed) },
    };
    const { service } = makeService(prisma);
    const dto = await service.complete('drv1', 'ride1');
    expect(dto.status).toBe('COMPLETED');
  });
});

describe('RidesService cancellation rules', () => {
  it('rejects cancelling an IN_PROGRESS ride', async () => {
    const prisma = {
      ride: { findUnique: jest.fn().mockResolvedValue({ ...includedRide, status: 'IN_PROGRESS', customerId: 'cust1' }) },
    };
    const { service } = makeService(prisma);
    await expect(
      service.cancel({ userId: 'cust1', role: 'CUSTOMER' } as any, 'ride1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forbids a stranger from cancelling', async () => {
    const prisma = {
      ride: { findUnique: jest.fn().mockResolvedValue({ ...includedRide, status: 'SEARCHING', customerId: 'cust1' }) },
    };
    const { service } = makeService(prisma);
    await expect(
      service.cancel({ userId: 'stranger', role: 'CUSTOMER' } as any, 'ride1', {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
