import type {
  AdminOverview,
  AuthUser,
  CustomerRow,
  DriverRow,
  FareRule,
  Paginated,
  RideDTO,
} from './types';

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
}

const TOKEN_KEY = 'rideflow_admin_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string): void {
  window.localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${getApiBaseUrl()}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(', ')
      : data?.message || `Request failed (${res.status})`;
    const err = new Error(message) as Error & { statusCode?: number };
    err.statusCode = res.status;
    throw err;
  }
  return data as T;
}

export interface RideFilters {
  page?: number;
  pageSize?: number;
  rideId?: string;
  status?: string;
  vehicleCategory?: string;
  dateFrom?: string;
  dateTo?: string;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  demoLogin(phone: string) {
    return request<{ accessToken: string; user: AuthUser }>('POST', '/auth/demo-login', {
      phone,
      role: 'ADMIN',
    });
  },
  me() {
    return request<AuthUser>('GET', '/auth/me');
  },
  overview() {
    return request<AdminOverview>('GET', '/admin/overview');
  },
  rides(f: RideFilters = {}) {
    return request<Paginated<RideDTO>>('GET', `/admin/rides${qs({ ...f })}`);
  },
  ride(id: string) {
    return request<RideDTO>('GET', `/rides/${id}`);
  },
  drivers(search = '', page = 1) {
    return request<Paginated<DriverRow>>('GET', `/admin/drivers${qs({ search, page, pageSize: 50 })}`);
  },
  customers(search = '', page = 1) {
    return request<Paginated<CustomerRow>>('GET', `/admin/customers${qs({ search, page, pageSize: 50 })}`);
  },
  setApproval(id: string, approvalStatus: 'APPROVED' | 'SUSPENDED' | 'PENDING') {
    return request<DriverRow>('PATCH', `/admin/drivers/${id}/approval`, { approvalStatus });
  },
  setDriverStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    return request<DriverRow>('PATCH', `/admin/drivers/${id}/status`, { status });
  },
  fares() {
    return request<FareRule[]>('GET', '/admin/fares');
  },
  updateFare(id: string, data: Partial<Omit<FareRule, 'id' | 'vehicleCategory'>>) {
    return request<FareRule>('PATCH', `/admin/fares/${id}`, data);
  },
};
