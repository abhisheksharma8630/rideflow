import Constants from 'expo-constants';
import { getToken } from './storage';
import type {
  AuthUser,
  DriverProfile,
  FareBreakdown,
  GeoPoint,
  RideDTO,
  UserRole,
  VehicleCategory,
} from '../types';

/** Resolve the API base URL from env or expo config. */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  return (fromEnv || fromExtra || 'http://localhost:4000').replace(/\/$/, '');
}

export interface ApiError extends Error {
  statusCode?: number;
  payload?: unknown;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    const err: ApiError = new Error(
      'Could not reach the server. Check EXPO_PUBLIC_API_URL and your network.',
    );
    err.statusCode = 0;
    throw err;
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'message' in data
        ? Array.isArray((data as any).message)
          ? (data as any).message.join(', ')
          : (data as any).message
        : null) || `Request failed (${res.status})`;
    const err: ApiError = new Error(message);
    err.statusCode = res.status;
    err.payload = data;
    throw err;
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const api = {
  // --- auth ---
  demoLogin(phone: string, role: UserRole, name?: string) {
    return request<{ accessToken: string; user: AuthUser }>(
      'POST',
      '/auth/demo-login',
      { phone, role, name },
      false,
    );
  },
  me() {
    return request<AuthUser>('GET', '/auth/me');
  },
  logout() {
    return request<{ ok: boolean }>('POST', '/auth/logout');
  },

  // --- customer ---
  updateProfile(input: { name?: string; email?: string }) {
    return request<AuthUser>('PATCH', '/users/me', input);
  },
  myRides(page = 1, pageSize = 20) {
    return request<Paginated<RideDTO>>('GET', `/users/me/rides?page=${page}&pageSize=${pageSize}`);
  },

  // --- fares ---
  fareRules() {
    return request<
      {
        id: string;
        vehicleCategory: VehicleCategory;
        baseFare: number;
        perKmRate: number;
        perMinuteRate: number;
        minimumFare: number;
        enabled: boolean;
      }[]
    >('GET', '/fares', undefined, false);
  },
  estimate(vehicleCategory: VehicleCategory, pickup: GeoPoint, destination: GeoPoint) {
    return request<FareBreakdown & { enabled: boolean }>('POST', '/fares/estimate', {
      vehicleCategory,
      pickup,
      destination,
    });
  },

  // --- rides ---
  createRide(input: {
    vehicleCategory: VehicleCategory;
    pickupAddress: string;
    pickup: GeoPoint;
    destinationAddress: string;
    destination: GeoPoint;
    paymentMethod?: 'CASH' | 'ONLINE_DEMO';
  }) {
    return request<RideDTO>('POST', '/rides', input);
  },
  getRide(id: string) {
    return request<RideDTO>('GET', `/rides/${id}`);
  },
  cancelRide(id: string, reason?: string) {
    return request<RideDTO>('POST', `/rides/${id}/cancel`, { reason });
  },
  rateRide(id: string, score: number, comment?: string) {
    return request<{ ok: true }>('POST', `/rides/${id}/rate`, { score, comment });
  },

  // --- driver ---
  driverMe() {
    return request<DriverProfile>('GET', '/drivers/me');
  },
  setAvailability(availabilityStatus: 'ONLINE' | 'OFFLINE') {
    return request<DriverProfile>('PATCH', '/drivers/me/availability', { availabilityStatus });
  },
  driverRides(page = 1, pageSize = 20) {
    return request<Paginated<RideDTO>>('GET', `/drivers/me/rides?page=${page}&pageSize=${pageSize}`);
  },
  driverEarnings() {
    return request<{
      totalTrips: number;
      todayTrips: number;
      grossEarnings: number;
      todayGrossEarnings: number;
      estimatedNetEarnings: number;
      commissionRate: number;
      note: string;
    }>('GET', '/drivers/me/earnings');
  },

  // --- driver lifecycle intents ---
  accept(id: string) {
    return request<RideDTO>('POST', `/rides/${id}/accept`);
  },
  reject(id: string) {
    return request<{ ok: true }>('POST', `/rides/${id}/reject`);
  },
  arrive(id: string) {
    return request<RideDTO>('POST', `/rides/${id}/arrive`);
  },
  start(id: string) {
    return request<RideDTO>('POST', `/rides/${id}/start`);
  },
  complete(id: string) {
    return request<RideDTO>('POST', `/rides/${id}/complete`);
  },
};
