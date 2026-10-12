import type { RideStatus } from './types';

export function formatCurrency(n: number | null | undefined): string {
  if (n == null) return '₹0';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function statusBadgeClass(status: RideStatus | string): string {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-700';
    case 'CANCELLED':
    case 'NO_DRIVERS':
      return 'bg-red-100 text-red-700';
    case 'SEARCHING':
    case 'REQUESTED':
      return 'bg-amber-100 text-amber-700';
    case 'ACCEPTED':
    case 'ARRIVED_AT_PICKUP':
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-700';
    case 'APPROVED':
    case 'ONLINE':
    case 'ACTIVE':
      return 'bg-green-100 text-green-700';
    case 'PENDING':
    case 'OFFLINE':
      return 'bg-slate-100 text-slate-600';
    case 'SUSPENDED':
      return 'bg-red-100 text-red-700';
    case 'ON_TRIP':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export const VEHICLE_EMOJI: Record<string, string> = {
  BIKE: '🏍️',
  AUTO: '🛺',
  CAB: '🚗',
};
