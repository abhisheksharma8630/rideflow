import { Prisma } from '@prisma/client';
import { RideDTO } from '@rideflow/shared-types';

export const rideInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  driver: {
    include: {
      user: { select: { name: true, phone: true } },
      vehicle: true,
    },
  },
  payment: true,
} satisfies Prisma.RideInclude;

type RideWithRelations = Prisma.RideGetPayload<{ include: typeof rideInclude }>;

export function toRideDTO(ride: RideWithRelations): RideDTO {
  return {
    id: ride.id,
    customerId: ride.customerId,
    driverId: ride.driverId,
    vehicleCategory: ride.vehicleCategory,
    pickupAddress: ride.pickupAddress,
    pickupLat: ride.pickupLat,
    pickupLng: ride.pickupLng,
    destinationAddress: ride.destinationAddress,
    destinationLat: ride.destinationLat,
    destinationLng: ride.destinationLng,
    estimatedDistanceKm: ride.estimatedDistanceKm,
    estimatedDurationMinutes: ride.estimatedDurationMinutes,
    estimatedFare: ride.estimatedFare,
    finalFare: ride.finalFare,
    status: ride.status,
    cancellationReason: ride.cancellationReason,
    requestedAt: ride.requestedAt.toISOString(),
    acceptedAt: ride.acceptedAt?.toISOString() ?? null,
    startedAt: ride.startedAt?.toISOString() ?? null,
    completedAt: ride.completedAt?.toISOString() ?? null,
    createdAt: ride.createdAt.toISOString(),
    updatedAt: ride.updatedAt.toISOString(),
    customer: ride.customer
      ? { id: ride.customer.id, name: ride.customer.name, phone: ride.customer.phone }
      : null,
    driver: ride.driver
      ? {
          id: ride.driver.id,
          name: ride.driver.user.name,
          phone: ride.driver.user.phone,
          rating: ride.driver.rating,
          vehicle: ride.driver.vehicle
            ? {
                category: ride.driver.vehicle.category,
                registrationNumber: ride.driver.vehicle.registrationNumber,
                model: ride.driver.vehicle.model,
                color: ride.driver.vehicle.color,
              }
            : null,
        }
      : null,
    payment: ride.payment
      ? {
          method: ride.payment.method,
          status: ride.payment.status,
          amount: ride.payment.amount,
        }
      : null,
  };
}
