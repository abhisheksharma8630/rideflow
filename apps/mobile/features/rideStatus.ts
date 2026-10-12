import type { RideStatus } from '../types';

export function rideStatusLabel(status: RideStatus): string {
  switch (status) {
    case 'REQUESTED':
      return 'Requested';
    case 'SEARCHING':
      return 'Finding your captain…';
    case 'ACCEPTED':
      return 'Captain on the way';
    case 'ARRIVED_AT_PICKUP':
      return 'Captain has arrived';
    case 'IN_PROGRESS':
      return 'On the trip';
    case 'COMPLETED':
      return 'Trip completed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'NO_DRIVERS':
      return 'No captains available';
    default:
      return status;
  }
}

export function rideStatusTone(
  status: RideStatus,
): 'neutral' | 'success' | 'danger' | 'warning' | 'info' {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'CANCELLED':
    case 'NO_DRIVERS':
      return 'danger';
    case 'SEARCHING':
    case 'REQUESTED':
      return 'warning';
    case 'ACCEPTED':
    case 'ARRIVED_AT_PICKUP':
    case 'IN_PROGRESS':
      return 'info';
    default:
      return 'neutral';
  }
}

export const ACTIVE_RIDE_STATUSES: RideStatus[] = [
  'REQUESTED',
  'SEARCHING',
  'ACCEPTED',
  'ARRIVED_AT_PICKUP',
  'IN_PROGRESS',
];
