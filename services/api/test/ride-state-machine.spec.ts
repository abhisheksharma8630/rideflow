import { RideStateMachine } from '../src/rides/ride-state-machine';

describe('RideStateMachine', () => {
  it('allows the happy-path lifecycle', () => {
    expect(RideStateMachine.nextStatus('REQUESTED', 'DISPATCH')).toBe('SEARCHING');
    expect(RideStateMachine.nextStatus('SEARCHING', 'ACCEPT')).toBe('ACCEPTED');
    expect(RideStateMachine.nextStatus('ACCEPTED', 'ARRIVE')).toBe('ARRIVED_AT_PICKUP');
    expect(RideStateMachine.nextStatus('ARRIVED_AT_PICKUP', 'START')).toBe('IN_PROGRESS');
    expect(RideStateMachine.nextStatus('IN_PROGRESS', 'COMPLETE')).toBe('COMPLETED');
  });

  it('rejects illegal transitions', () => {
    // Cannot complete a ride that has not started.
    expect(() => RideStateMachine.nextStatus('ACCEPTED', 'COMPLETE')).toThrow();
    // Cannot accept an already in-progress ride.
    expect(() => RideStateMachine.nextStatus('IN_PROGRESS', 'ACCEPT')).toThrow();
    // Cannot start before arriving.
    expect(() => RideStateMachine.nextStatus('ACCEPTED', 'START')).toThrow();
  });

  it('permits cancellation only before the trip starts', () => {
    expect(RideStateMachine.isCustomerCancellable('SEARCHING')).toBe(true);
    expect(RideStateMachine.isCustomerCancellable('ACCEPTED')).toBe(true);
    expect(RideStateMachine.isCustomerCancellable('ARRIVED_AT_PICKUP')).toBe(true);
    expect(RideStateMachine.isCustomerCancellable('IN_PROGRESS')).toBe(false);
    expect(RideStateMachine.isCustomerCancellable('COMPLETED')).toBe(false);
  });

  it('identifies terminal states', () => {
    expect(RideStateMachine.isTerminal('COMPLETED')).toBe(true);
    expect(RideStateMachine.isTerminal('CANCELLED')).toBe(true);
    expect(RideStateMachine.isTerminal('NO_DRIVERS')).toBe(true);
    expect(RideStateMachine.isTerminal('IN_PROGRESS')).toBe(false);
  });

  it('allows marking SEARCHING as NO_DRIVERS but not from other states', () => {
    expect(RideStateMachine.nextStatus('SEARCHING', 'NO_DRIVERS')).toBe('NO_DRIVERS');
    expect(() => RideStateMachine.nextStatus('ACCEPTED', 'NO_DRIVERS')).toThrow();
  });
});
