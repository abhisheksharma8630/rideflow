export type UserRole = 'CUSTOMER' | 'DRIVER' | 'ADMIN';
export type VehicleCategory = 'BIKE' | 'AUTO' | 'CAB';
export type RideStatus =
  | 'REQUESTED'
  | 'SEARCHING'
  | 'ACCEPTED'
  | 'ARRIVED_AT_PICKUP'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_DRIVERS';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface FareBreakdown {
  vehicleCategory: VehicleCategory;
  baseFare: number;
  distanceKm: number;
  distanceCharge: number;
  durationMinutes: number;
  timeCharge: number;
  subtotal: number;
  minimumFare: number;
  total: number;
  currency: string;
  estimatedWithoutRouting: boolean;
}

export interface RideDTO {
  id: string;
  customerId: string;
  driverId: string | null;
  vehicleCategory: VehicleCategory;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number;
  estimatedFare: number;
  finalFare: number | null;
  status: RideStatus;
  cancellationReason: string | null;
  requestedAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; phone: string } | null;
  driver?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    vehicle?: {
      category: VehicleCategory;
      registrationNumber: string;
      model: string;
      color: string;
    } | null;
  } | null;
  payment?: { method: string; status: string; amount: number } | null;
}

export interface RideOfferDTO {
  id: string;
  rideId: string;
  driverId: string;
  status: string;
  expiresAt: string;
  distanceToPickupKm: number;
  estimatedEarnings: number;
  ride: {
    id: string;
    vehicleCategory: VehicleCategory;
    pickupAddress: string;
    destinationAddress: string;
    pickupLat: number;
    pickupLng: number;
    destinationLat: number;
    destinationLng: number;
    estimatedDistanceKm: number;
    estimatedDurationMinutes: number;
    estimatedFare: number;
  };
}

export interface DriverProfile {
  id: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  availabilityStatus: 'OFFLINE' | 'ONLINE' | 'ON_TRIP';
  rating: number;
  totalTrips: number;
  currentLat: number | null;
  currentLng: number | null;
  user: { name: string; phone: string; email: string | null };
  vehicle: {
    category: VehicleCategory;
    registrationNumber: string;
    model: string;
    color: string;
  } | null;
}

export const SOCKET_EVENTS = {
  RIDE_OFFER: 'ride:offer',
  RIDE_UPDATE: 'ride:update',
  DRIVER_LOCATION: 'driver:location',
  RIDE_COMPLETED: 'ride:completed',
  RIDE_CANCELLED: 'ride:cancelled',
  OFFER_EXPIRED: 'offer:expired',
  SUBSCRIBE_RIDE: 'ride:subscribe',
} as const;

export interface DriverLocationEvent {
  rideId: string;
  driverId: string;
  location: GeoPoint;
  bearing?: number;
}
