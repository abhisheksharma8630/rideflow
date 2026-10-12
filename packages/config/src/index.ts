/**
 * Shared, non-secret configuration for RideFlow.
 * Branding, currency, service area and fare defaults live here so they
 * can be changed in one place. These are DEMONSTRATION values.
 */

export const BRAND = {
  name: 'RideFlow',
  tagline: 'Your city, one tap away',
  colors: {
    primary: '#FFC107', // warm yellow (actions)
    primaryDark: '#F0A500',
    charcoal: '#1A1A1A', // important text / nav
    ink: '#2B2B2B',
    surface: '#FFFFFF',
    surfaceMuted: '#F4F5F7',
    border: '#E4E6EB',
    success: '#1DB954',
    danger: '#E53935',
    muted: '#8A8F98',
  },
} as const;

export const CURRENCY = {
  code: 'INR',
  symbol: '₹',
  locale: 'en-IN',
} as const;

/** Default demo service area. Not hardcoded elsewhere - read from here. */
export const SERVICE_AREA = {
  city: 'Chandigarh',
  country: 'India',
  center: { latitude: 30.7333, longitude: 76.7794 },
  // bounding box used by the deterministic location picker fallback
  bounds: {
    minLat: 30.68,
    maxLat: 30.78,
    minLng: 76.72,
    maxLng: 76.84,
  },
} as const;

export const VEHICLE_CATEGORIES = ['BIKE', 'AUTO', 'CAB'] as const;
export type VehicleCategoryKey = (typeof VEHICLE_CATEGORIES)[number];

export const VEHICLE_META: Record<
  VehicleCategoryKey,
  { label: string; description: string; capacity: number; emoji: string }
> = {
  BIKE: { label: 'Bike', description: 'Fastest & cheapest, 1 rider', capacity: 1, emoji: '🏍️' },
  AUTO: { label: 'Auto', description: 'Breezy auto rides, up to 3', capacity: 3, emoji: '🛺' },
  CAB: { label: 'Cab', description: 'AC comfort, up to 4', capacity: 4, emoji: '🚗' },
};

/** Default fare rules seeded into the DB. The DB is authoritative at runtime. */
export const DEFAULT_FARE_RULES: Record<
  VehicleCategoryKey,
  { baseFare: number; perKmRate: number; perMinuteRate: number; minimumFare: number }
> = {
  BIKE: { baseFare: 20, perKmRate: 8, perMinuteRate: 1, minimumFare: 30 },
  AUTO: { baseFare: 30, perKmRate: 12, perMinuteRate: 1, minimumFare: 40 },
  CAB: { baseFare: 50, perKmRate: 15, perMinuteRate: 2, minimumFare: 70 },
};

/** Average speeds (km/h) used to estimate duration from distance in the fallback. */
export const AVG_SPEED_KMH: Record<VehicleCategoryKey, number> = {
  BIKE: 28,
  AUTO: 22,
  CAB: 26,
};

export const DISPATCH = {
  offerTimeoutSeconds: 20,
  simTickMs: 2000,
  maxCandidates: 5,
} as const;

export function formatCurrency(amount: number): string {
  return `${CURRENCY.symbol}${Math.round(amount)}`;
}
