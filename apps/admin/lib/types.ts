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

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
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

export interface RideDTO {
  id: string;
  customerId: string;
  driverId: string | null;
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
  finalFare: number | null;
  status: RideStatus;
  cancellationReason: string | null;
  createdAt: string;
  customer?: { id: string; name: string; phone: string } | null;
  driver?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    vehicle?: { category: VehicleCategory; registrationNumber: string; model: string; color: string } | null;
  } | null;
  payment?: { method: string; status: string; amount: number } | null;
}

export interface DriverRow {
  id: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  availabilityStatus: 'OFFLINE' | 'ONLINE' | 'ON_TRIP';
  rating: number;
  totalTrips: number;
  user: { name: string; phone: string; email: string | null; status: 'ACTIVE' | 'SUSPENDED' };
  vehicle: { category: VehicleCategory; registrationNumber: string; model: string; color: string } | null;
}

export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  isDemo: boolean;
  createdAt: string;
  rideCount: number;
}

export interface FareRule {
  id: string;
  vehicleCategory: VehicleCategory;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
  enabled: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const SOCKET_EVENTS = {
  ADMIN_RIDE_UPDATE: 'admin:ride_update',
} as const;
