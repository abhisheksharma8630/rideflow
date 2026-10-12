/** Shared domain enums, DTOs and socket event contracts for RideFlow. */

export type UserRole = 'CUSTOMER' | 'DRIVER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type DriverApprovalStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED';
export type DriverAvailabilityStatus = 'OFFLINE' | 'ONLINE' | 'ON_TRIP';
export type VehicleCategory = 'BIKE' | 'AUTO' | 'CAB';
export type VehicleStatus = 'ACTIVE' | 'INACTIVE';

export type RideStatus =
  | 'REQUESTED'
  | 'SEARCHING'
  | 'ACCEPTED'
  | 'ARRIVED_AT_PICKUP'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_DRIVERS';

export type RideOfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'ONLINE_DEMO';
export type PaymentStatus = 'PENDING' | 'COLLECTED' | 'FAILED';

export interface GeoPoint {
  latitude: number;
  longitude: number;
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
  /** true when distance was derived from straight-line haversine (no routing provider). */
  estimatedWithoutRouting: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: UserRole;
  status: UserStatus;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
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
  // Enriched (optional)
  customer?: { id: string; name: string; phone: string } | null;
  driver?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    vehicle?: { category: VehicleCategory; registrationNumber: string; model: string; color: string } | null;
  } | null;
  payment?: { method: PaymentMethod; status: PaymentStatus; amount: number } | null;
}

export interface RideOfferDTO {
  id: string;
  rideId: string;
  driverId: string;
  status: RideOfferStatus;
  expiresAt: string;
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
  /** approx distance (km) from driver to pickup, for the offer card */
  distanceToPickupKm: number;
  estimatedEarnings: number;
}

/** Socket.IO event names - single source of truth for clients & server. */
export const SOCKET_EVENTS = {
  // server -> client
  RIDE_OFFER: 'ride:offer',
  RIDE_UPDATE: 'ride:update',
  DRIVER_LOCATION: 'driver:location',
  RIDE_COMPLETED: 'ride:completed',
  RIDE_CANCELLED: 'ride:cancelled',
  OFFER_EXPIRED: 'offer:expired',
  ADMIN_RIDE_UPDATE: 'admin:ride_update',
  // client -> server
  SUBSCRIBE_RIDE: 'ride:subscribe',
} as const;

export interface DriverLocationEvent {
  rideId: string;
  driverId: string;
  location: GeoPoint;
  bearing?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminOverview {
  totalCustomers: number;
  totalDrivers: number;
  approvedDrivers: number;
  onlineDrivers: number;
  activeRides: number;
  completedRides: number;
  cancelledRides: number;
  grossBookingValue: number;
  isDemoData: boolean;
}
