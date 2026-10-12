import { BadRequestException } from '@nestjs/common';
import { RideStatus } from '@rideflow/shared-types';

/**
 * Server-authoritative ride state machine.
 * Clients never set status directly; they call intent endpoints that map to transitions.
 */
export type RideTransition =
  | 'DISPATCH' // REQUESTED -> SEARCHING
  | 'ACCEPT' // SEARCHING -> ACCEPTED
  | 'ARRIVE' // ACCEPTED -> ARRIVED_AT_PICKUP
  | 'START' // ARRIVED_AT_PICKUP -> IN_PROGRESS
  | 'COMPLETE' // IN_PROGRESS -> COMPLETED
  | 'NO_DRIVERS' // SEARCHING -> NO_DRIVERS
  | 'CANCEL'; // many -> CANCELLED

const TRANSITIONS: Record<RideTransition, { from: RideStatus[]; to: RideStatus }> = {
  DISPATCH: { from: ['REQUESTED'], to: 'SEARCHING' },
  ACCEPT: { from: ['SEARCHING'], to: 'ACCEPTED' },
  ARRIVE: { from: ['ACCEPTED'], to: 'ARRIVED_AT_PICKUP' },
  START: { from: ['ARRIVED_AT_PICKUP'], to: 'IN_PROGRESS' },
  COMPLETE: { from: ['IN_PROGRESS'], to: 'COMPLETED' },
  NO_DRIVERS: { from: ['SEARCHING'], to: 'NO_DRIVERS' },
  CANCEL: {
    // A ride can be cancelled until it starts moving.
    from: ['REQUESTED', 'SEARCHING', 'ACCEPTED', 'ARRIVED_AT_PICKUP'],
    to: 'CANCELLED',
  },
};

export const RideStateMachine = {
  canTransition(current: RideStatus, transition: RideTransition): boolean {
    return TRANSITIONS[transition].from.includes(current);
  },

  nextStatus(current: RideStatus, transition: RideTransition): RideStatus {
    if (!this.canTransition(current, transition)) {
      throw new BadRequestException(
        `Illegal transition ${transition} from status ${current}`,
      );
    }
    return TRANSITIONS[transition].to;
  },

  isTerminal(status: RideStatus): boolean {
    return status === 'COMPLETED' || status === 'CANCELLED' || status === 'NO_DRIVERS';
  },

  isCustomerCancellable(status: RideStatus): boolean {
    return TRANSITIONS.CANCEL.from.includes(status);
  },
};
