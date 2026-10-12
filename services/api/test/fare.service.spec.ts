import { FareService } from '../src/fares/fare.service';
import { DEFAULT_FARE_RULES } from '@rideflow/config';

describe('FareService.compute', () => {
  const bike = DEFAULT_FARE_RULES.BIKE;
  const cab = DEFAULT_FARE_RULES.CAB;

  it('computes fare from base + distance + time', () => {
    // BIKE: base 20, perKm 8, perMin 1. 5km, 12min => 20 + 40 + 12 = 72
    const f = FareService.compute('BIKE', 5, 12, bike, true);
    expect(f.distanceCharge).toBe(40);
    expect(f.timeCharge).toBe(12);
    expect(f.subtotal).toBe(72);
    expect(f.total).toBe(72);
    expect(f.currency).toBe('INR');
  });

  it('applies the minimum fare when subtotal is lower', () => {
    // BIKE min 30. 0.1km, 1min => 20 + 0.8 + 1 = 21.8 -> below min -> 30
    const f = FareService.compute('BIKE', 0.1, 1, bike, true);
    expect(f.total).toBe(bike.minimumFare);
    expect(f.total).toBe(30);
  });

  it('rounds the total to the nearest rupee', () => {
    // CAB: base 50, perKm 15, perMin 2. 3.33km, 7min => 50 + 49.95 + 14 = 113.95 -> 114
    const f = FareService.compute('CAB', 3.33, 7, cab, true);
    expect(f.total).toBe(114);
  });

  it('flags estimates made without routing', () => {
    const f = FareService.compute('AUTO', 4, 10, DEFAULT_FARE_RULES.AUTO, true);
    expect(f.estimatedWithoutRouting).toBe(true);
  });

  it('estimates duration from distance using category speed', () => {
    const mins = FareService.estimateDurationMinutes('CAB', 13); // 13km @ 26km/h = 30min
    expect(mins).toBe(30);
  });

  it('never returns a duration below 1 minute', () => {
    expect(FareService.estimateDurationMinutes('BIKE', 0.01)).toBeGreaterThanOrEqual(1);
  });
});
