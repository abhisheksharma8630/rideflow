/**
 * RideFlow mobile design tokens. Mirrors @rideflow/config BRAND so the mobile
 * bundle stays independent of the Node build output. Keep values in sync.
 */
export const colors = {
  primary: '#FFC107',
  primaryDark: '#F0A500',
  charcoal: '#1A1A1A',
  ink: '#2B2B2B',
  surface: '#FFFFFF',
  surfaceMuted: '#F4F5F7',
  border: '#E4E6EB',
  success: '#1DB954',
  danger: '#E53935',
  muted: '#8A8F98',
  overlay: 'rgba(0,0,0,0.45)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '800' as const, color: colors.charcoal },
  h2: { fontSize: 22, fontWeight: '700' as const, color: colors.charcoal },
  h3: { fontSize: 18, fontWeight: '700' as const, color: colors.charcoal },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.ink },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const, color: colors.ink },
  caption: { fontSize: 13, fontWeight: '400' as const, color: colors.muted },
  label: { fontSize: 12, fontWeight: '600' as const, color: colors.muted },
};

export const elevation = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sheet: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
};

export const CURRENCY_SYMBOL = '₹';
export function formatCurrency(n: number | null | undefined): string {
  if (n == null) return `${CURRENCY_SYMBOL}0`;
  return `${CURRENCY_SYMBOL}${Math.round(n)}`;
}

export const VEHICLE_META: Record<
  'BIKE' | 'AUTO' | 'CAB',
  { label: string; description: string; capacity: number; emoji: string }
> = {
  BIKE: { label: 'Bike', description: 'Fastest & cheapest, 1 rider', capacity: 1, emoji: '🏍️' },
  AUTO: { label: 'Auto', description: 'Breezy auto rides, up to 3', capacity: 3, emoji: '🛺' },
  CAB: { label: 'Cab', description: 'AC comfort, up to 4', capacity: 4, emoji: '🚗' },
};

export const SERVICE_AREA = {
  city: 'Chandigarh',
  center: { latitude: 30.7333, longitude: 76.7794 },
  bounds: { minLat: 30.68, maxLat: 30.78, minLng: 76.72, maxLng: 76.84 },
};
